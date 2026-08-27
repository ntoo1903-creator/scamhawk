import { NextRequest, NextResponse } from 'next/server';
import { classifyEntity } from '@/lib/validation';
import { lookupEntity } from '@/lib/chainabuse';
import { prisma } from '@/lib/prisma';
import { getClerkUserId } from '@/lib/auth';
import { canAddWatch } from '@/lib/rate-limit';
import { hasProAccess } from '@/lib/paddle';
import { watchRatelimit, getClientIp, checkRateLimit } from '@/lib/upstash';
import { invalidateCache, cacheKeys } from '@/lib/cache';

export const runtime = 'nodejs';

/** 添加监控项（登录用户） */
export async function POST(req: NextRequest) {
  // IP 级别限流（防刷）
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(watchRatelimit, ip);
  if (!ipLimit.success) {
    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        reset: ipLimit.reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(ipLimit.remaining),
          'X-RateLimit-Reset': String(ipLimit.reset),
        },
      },
    );
  }

  const clerkId = await getClerkUserId();
  if (!clerkId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw = typeof body?.value === 'string' ? body.value : '';
  const entity = classifyEntity(raw);

  if (!entity.valid) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  // 检查免费版用户监控数量限制
  const isPro = await hasProAccess(clerkId);
  if (!isPro) {
    const watchLimit = await canAddWatch(clerkId);
    if (!watchLimit.allowed) {
      return NextResponse.json(
        {
          error: 'WATCH_LIMIT_EXCEEDED',
          limit: watchLimit.limit,
          current: watchLimit.current,
        },
        { status: 429 },
      );
    }
  }

  const result = await lookupEntity(entity.value, entity.type);

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId },
  });

  const item = await prisma.watchItem.upsert({
    where: {
      userId_type_value: {
        userId: user.id,
        type: entity.type,
        value: entity.value,
      },
    },
    update: {
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      reportCount: result.reportCount,
      categories: result.categories,
      lastCheckedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
    create: {
      userId: user.id,
      type: entity.type,
      value: entity.value,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      reportCount: result.reportCount,
      categories: result.categories,
      lastCheckedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });

  // 使监控数量缓存失效
  await invalidateCache(cacheKeys.watchCount(clerkId));

  return NextResponse.json({ item }, { status: 201 });
}

/** 移除监控项（登录用户） */
export async function DELETE(req: NextRequest) {
  // IP 级别限流（防刷）
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(watchRatelimit, ip);
  if (!ipLimit.success) {
    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        reset: ipLimit.reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(ipLimit.remaining),
          'X-RateLimit-Reset': String(ipLimit.reset),
        },
      },
    );
  }

  const clerkId = await getClerkUserId();
  if (!clerkId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const value = typeof body?.value === 'string' ? body.value.trim() : '';

  if (!value) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  await prisma.watchItem.deleteMany({
    where: { value, user: { clerkId } },
  });

  // 使监控数量缓存失效
  await invalidateCache(cacheKeys.watchCount(clerkId));

  return NextResponse.json({ ok: true });
}
