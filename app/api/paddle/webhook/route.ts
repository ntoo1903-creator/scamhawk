import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPaddleClient, isPaddleConfigured } from '@/lib/paddle';
import { invalidateCache, cacheKeys } from '@/lib/cache';

export const runtime = 'nodejs';

/**
 * POST /api/paddle/webhook —— Paddle 订阅事件统一入口
 *
 * 全事件处理策略：
 *  - subscription.*（9 种）→ 应用/更新本地订阅，事件与订阅均幂等
 *  - 其余事件（transaction.* / customer.* / payout.* 等）→ 落审计日志后按忽略处理
 * 每个事件都写入 PaddleEvent 审计表（eventId 唯一），重复投递直接幂等返回。
 *
 * 下单时把 Clerk userId 放进 Paddle custom data（user_id 字段），
 * webhook 通过它把订阅绑定到本地用户；兼容旧字段 userId。
 */

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.activated',
  'subscription.updated',
  'subscription.canceled',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.trialing',
  'subscription.imported',
]);

/** SDK 解析后的订阅负载（SubscriptionNotification 实体，camelCase 字段）。
 *  同时兼容原始 JSON（snake_case）以应对 SDK 版本变化。
 */
interface PaddleSubscriptionData {
  // camelCase（SDK 实体）
  id: string;
  status?: string;
  customerId?: string;
  currencyCode?: string;
  startedAt?: string | null;
  firstBilledAt?: string | null;
  nextBilledAt?: string | null;
  pausedAt?: string | null;
  canceledAt?: string | null;
  currentBillingPeriod?: { startsAt?: string; endsAt?: string } | null;
  scheduledChange?: {
    action?: string;
    effectiveAt?: string;
    resumeAt?: string | null;
  } | null;
  items?: Array<{
    price?: { id?: string; productId?: string };
    product?: { id?: string };
    quantity?: number;
  }>;
  customData?: Record<string, unknown> | null;
  // snake_case（原始 JSON 兜底）
  customer_id?: string;
  currency_code?: string;
  started_at?: string | null;
  first_billed_at?: string | null;
  next_billed_at?: string | null;
  paused_at?: string | null;
  canceled_at?: string | null;
  current_billing_period?: { starts_at?: string; ends_at?: string } | null;
  scheduled_change?: {
    action?: string;
    effective_at?: string;
    resume_at?: string | null;
  } | null;
  custom_data?: Record<string, unknown> | null;
}

function toDate(v?: string | null): Date | null {
  return v ? new Date(v) : null;
}

function pick<T, U>(camel: T | undefined, snake: U | undefined): T | U | undefined {
  return camel !== undefined ? camel : snake;
}

interface PeriodLike {
  startsAt?: string;
  starts_at?: string;
  endsAt?: string;
  ends_at?: string;
}
interface ChangeLike {
  action?: string;
  effectiveAt?: string;
  effective_at?: string;
  resumeAt?: string | null;
  resume_at?: string | null;
}

/** 把 Paddle 订阅负载映射为本地 Subscription 字段（优先 SDK 实体 camelCase） */
function mapSubscriptionData(data: PaddleSubscriptionData) {
  const items = data.items ?? [];
  const priceId = items[0]?.price?.id ?? null;
  const planId = items[0]?.product?.id ?? priceId ?? '';
  const period = (pick(data.currentBillingPeriod, data.current_billing_period) ??
    {}) as PeriodLike;
  const change = (pick(data.scheduledChange, data.scheduled_change) ??
    {}) as ChangeLike;

  return {
    paddleCustomerId:
      pick(data.customerId, data.customer_id) ?? null,
    status: data.status ?? 'unknown',
    planId,
    priceId,
    currencyCode: pick(data.currencyCode, data.currency_code) ?? null,
    startedAt: toDate(pick(data.startedAt, data.started_at)),
    firstBilledAt: toDate(pick(data.firstBilledAt, data.first_billed_at)),
    nextBilledAt: toDate(pick(data.nextBilledAt, data.next_billed_at)),
    currentPeriodStart: toDate(period.startsAt ?? period.starts_at),
    currentPeriodEnd: toDate(period.endsAt ?? period.ends_at),
    pausedAt: toDate(pick(data.pausedAt, data.paused_at)),
    canceledAt: toDate(pick(data.canceledAt, data.canceled_at)),
    cancelAtPeriodEnd: change.action === 'cancel',
    scheduledChange: change.action
      ? {
          action: change.action,
          effectiveAt: change.effectiveAt ?? change.effective_at ?? null,
          resumeAt: change.resumeAt ?? change.resume_at ?? null,
        }
      : Prisma.JsonNull,
    items: items.length ? items : Prisma.JsonNull,
  };
}

/**
 * 处理订阅事件：绑定用户并创建/更新本地订阅。
 * 已有订阅时按 paddleSubscriptionId 匹配更新（不依赖 custom_data）。
 */
async function handleSubscriptionEvent(eventType: string, data: PaddleSubscriptionData) {
  const sub = data as PaddleSubscriptionData;
  if (!sub?.id) {
    return { applied: false, note: 'event data missing subscription id' };
  }

  const existing = await prisma.subscription.findUnique({
    where: { paddleSubscriptionId: sub.id },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: mapSubscriptionData(sub),
    });
    // 使订阅缓存失效
    await invalidateCache(cacheKeys.subscription(existing.userId));
    return { applied: true, note: `updated existing subscription (${eventType})` };
  }

  // 新订阅：必须能绑定到本地用户（custom data 里的 Clerk userId）
  const customData = sub.customData ?? sub.custom_data ?? {};
  const userId =
    typeof customData.user_id === 'string'
      ? customData.user_id
      : typeof customData.userId === 'string'
        ? customData.userId
        : null;

  if (!userId) {
    return {
      applied: false,
      note: `no user_id in custom_data; cannot bind subscription ${sub.id}`,
    };
  }

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId },
  });

  await prisma.subscription.create({
    data: {
      paddleSubscriptionId: sub.id,
      userId: user.id,
      ...mapSubscriptionData(sub),
    },
  });

  // 使订阅缓存失效
  await invalidateCache(cacheKeys.subscription(user.id));

  return { applied: true, note: `created subscription for user ${userId} (${eventType})` };
}

export async function POST(req: NextRequest) {
  if (!isPaddleConfigured()) {
    return NextResponse.json(
      { error: 'PADDLE_NOT_CONFIGURED' },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get('paddle-signature') ?? '';

  let event;
  try {
    event = getPaddleClient().webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature,
    );
  } catch (err) {
    console.error('[paddle] webhook unmarshal failed (bad signature or malformed payload):', err);
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  const eventType = event.eventType;
  const data = event.data as PaddleSubscriptionData;

  // 幂等：事件已处理过（Paddle 会重试投递）直接确认
  const already = await prisma.paddleEvent.findUnique({
    where: { eventId: event.eventId },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json({ received: true, duplicated: true });
  }

  // 先落审计日志，处理后再更新状态
  await prisma.paddleEvent.create({
    data: {
      eventId: event.eventId,
      eventType,
      occurredAt: toDate(event.occurredAt),
      status: 'processing',
      data: data as object,
    },
  });

  let status: 'processed' | 'ignored' | 'error' = 'ignored';
  let note: string | null = null;

  try {
    if (SUBSCRIPTION_EVENTS.has(eventType)) {
      const result = await handleSubscriptionEvent(eventType, data);
      status = result.applied ? 'processed' : 'ignored';
      note = result.note ?? null;
    } else {
      note = `non-subscription event, ignored (${eventType})`;
    }

    await prisma.paddleEvent.update({
      where: { eventId: event.eventId },
      data: { status, note },
    });
  } catch (err) {
    console.error(`[paddle] failed to process event ${eventType} (${event.eventId}):`, err);
    await prisma.paddleEvent
      .update({
        where: { eventId: event.eventId },
        data: { status: 'error', note: String(err) },
      })
      .catch(() => {});
    return NextResponse.json({ error: 'EVENT_PROCESSING_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ received: true, eventType });
}
