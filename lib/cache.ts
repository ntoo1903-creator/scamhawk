import { Redis } from '@upstash/redis';

// Upstash Redis 客户端（可选）
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  }
  return null;
}

// 内存缓存（开发环境降级）
interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry<unknown>>();
const MEMORY_CACHE_MAX_SIZE = 1000;

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as MemoryCacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function setMemoryCache<T>(key: string, value: T, ttlSeconds: number): void {
  // 防止内存溢出
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    // 删除最早过期的条目
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * 缓存包装器 - 优先使用 Redis，降级到内存缓存
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  // 尝试从缓存读取
  const redis = getRedis();
  
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null) return cached;
    } catch (err) {
      console.error('[cache] Redis read error:', err);
    }
  } else {
    // 内存缓存降级
    const cached = getMemoryCache<T>(key);
    if (cached !== null) return cached;
  }

  // 缓存未命中，执行查询
  const value = await fetcher();

  // 写入缓存
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.error('[cache] Redis write error:', err);
    }
  } else {
    setMemoryCache(key, value, ttlSeconds);
  }

  return value;
}

/**
 * 使缓存失效（精确键名）
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis();
  
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.error('[cache] Redis invalidate error:', err);
    }
  } else {
    memoryCache.delete(key);
  }
}

/**
 * 缓存键生成器
 */
export const cacheKeys = {
  /** Chainabuse 查询结果 */
  check: (value: string, type: string) => `check:${type}:${value}`,
  /** 用户订阅状态 */
  subscription: (clerkId: string) => `sub:${clerkId}`,
  /** 用户监控数量 */
  watchCount: (clerkId: string) => `watch:count:${clerkId}`,
  /** 用户查询次数 */
  checkCount: (clerkId: string, date: string) => `check:count:${clerkId}:${date}`,
} as const;

/**
 * 缓存 TTL 配置（秒）
 */
export const cacheTTL = {
  /** Chainabuse 查询结果：1 小时 */
  check: 3600,
  /** 用户订阅状态：5 分钟 */
  subscription: 300,
  /** 用户监控数量：1 分钟 */
  watchCount: 60,
  /** 用户查询次数：5 分钟 */
  checkCount: 300,
} as const;
