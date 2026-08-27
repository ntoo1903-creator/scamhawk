import { auth } from '@clerk/nextjs/server';

/** Clerk 是否已配置环境变量（未配置时 auth() 不可用，全站降级为游客模式） */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

/**
 * 获取当前登录用户的 Clerk userId。
 * - 未配置 Clerk 或未登录时返回 null。
 * - 内部捕获异常，保证任何环境下都不会抛错。
 */
export async function getClerkUserId(): Promise<string | null> {
  if (!isClerkConfigured()) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}
