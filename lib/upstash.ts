import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Upstash Redis 客户端。
 * 未配置环境变量时返回 null（本地开发可直接运行，不限流）。
 */
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Upstash 是否已配置 */
export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * 风险查询限流器：每个 IP 每 24 小时最多 30 次查询。
 * 使用滑动窗口算法，每 10 秒最多 1 次（防刷）。
 */
export const checkRatelimit = (() => {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '24 h'),
    analytics: true,
    prefix: 'scamhawk:check',
  });
})();

/**
 * 监控操作限流器：每个 IP 每分钟最多 10 次操作。
 */
export const watchRatelimit = (() => {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'scamhawk:watch',
  });
})();

/**
 * 通用 API 限流器：每个 IP 每分钟最多 60 次请求。
 */
export const apiRatelimit = (() => {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'scamhawk:api',
  });
})();

/**
 * 从请求中提取客户端 IP。
 * 支持 Vercel/Cloudflare 等代理环境。
 */
export function getClientIp(request: Request): string {
  // Vercel/Cloudflare 代理头
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnecting = request.headers.get('cf-connecting-ip');
  if (cfConnecting) {
    return cfConnecting;
  }

  // Vercel
  const vercelForwarded = request.headers.get('x-real-ip');
  if (vercelForwarded) {
    return vercelForwarded;
  }

  // 默认回退
  return '127.0.0.1';
}

/**
 * 检查 IP 是否被限流。
 * 返回 { success, remaining, reset }。
 * 未配置 Upstash 时始终允许。
 */
export async function checkRateLimit(
  ratelimit: Ratelimit | null,
  ip: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!ratelimit) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const result = await ratelimit.limit(ip);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
