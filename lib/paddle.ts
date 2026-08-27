import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { prisma } from '@/lib/prisma';
import { cached, cacheKeys, cacheTTL } from './cache';

let paddleClient: Paddle | null = null;

/** Paddle 服务端是否配置完整（webhook 必需） */
export function isPaddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET);
}

/** Paddle 下单是否可用（价格 ID + 客户端 token 均需配置） */
export function isPaddleCheckoutConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_PRICE_ID_PRO_MONTHLY &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );
}

export function paddleEnvironment(): Environment {
  return process.env.PADDLE_ENVIRONMENT === 'live'
    ? Environment.production
    : Environment.sandbox;
}

/** 懒加载单例 Paddle 客户端（webhook 签名校验 / API 调用） */
export function getPaddleClient(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not configured');
  }
  if (!paddleClient) {
    paddleClient = new Paddle(apiKey, { environment: paddleEnvironment() });
  }
  return paddleClient;
}

/** 订阅状态是否为「有效权益」（可正常使用专业版功能） */
export function isActiveSubscriptionStatus(status: string): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * 查询用户当前有效的专业版订阅（active / trialing）。
 * 多个订阅并存时取最近更新的一个。
 * 使用缓存加速（5 分钟 TTL）。
 */
export async function getActiveSubscription(clerkId: string) {
  const cacheKey = cacheKeys.subscription(clerkId);

  return cached(cacheKey, async () => {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        subscriptions: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    return (
      user?.subscriptions.find((s) => isActiveSubscriptionStatus(s.status)) ?? null
    );
  }, cacheTTL.subscription);
}

/** 用户当前是否为专业版（用于价格页「当前方案」展示与后续权益判断） */
export async function hasProAccess(clerkId: string): Promise<boolean> {
  return (await getActiveSubscription(clerkId)) !== null;
}
