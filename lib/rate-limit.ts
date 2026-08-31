import { prisma } from '@/lib/prisma';
import { cached, cacheKeys, cacheTTL } from './cache';

// 免费版限制配置
export const FREE_TIER_LIMITS = {
  /** 每日风险查询次数 */
  dailyChecks: 10,
  /** 最大监控数量 */
  maxWatchItems: 5,
} as const;

/**
 * 获取用户今日已使用的查询次数。
 * 未登录用户返回 0（不追踪，前端也不展示）。
 * 使用缓存加速（5 分钟 TTL）。
 */
export async function getDailyCheckCount(clerkId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];
  const cacheKey = cacheKeys.checkCount(clerkId, dateStr);

  return cached(cacheKey, async () => {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!user) return 0;

    return prisma.checkRecord.count({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
    });
  }, cacheTTL.checkCount);
}

/**
 * 获取用户当前监控数量。
 * 使用缓存加速（1 分钟 TTL）。
 */
export async function getWatchItemCount(clerkId: string): Promise<number> {
  const cacheKey = cacheKeys.watchCount(clerkId);

  return cached(cacheKey, async () => {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!user) return 0;

    return prisma.watchItem.count({
      where: { userId: user.id },
    });
  }, cacheTTL.watchCount);
}

/**
 * 检查免费版用户是否可以执行查询。
 * 返回 { allowed, remaining, limit }
 */
export async function canCheck(clerkId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}> {
  const used = await getDailyCheckCount(clerkId);
  const limit = FREE_TIER_LIMITS.dailyChecks;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    remaining,
    limit,
    used,
  };
}

/**
 * 检查免费版用户是否可以添加监控。
 * 返回 { allowed, current, limit }
 */
export async function canAddWatch(clerkId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const current = await getWatchItemCount(clerkId);
  const limit = FREE_TIER_LIMITS.maxWatchItems;

  return {
    allowed: current < limit,
    current,
    limit,
  };
}
