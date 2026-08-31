import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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

/**
 * 确保本地用户存在并同步 Clerk 主邮箱。
 * 同步失败不应阻断查询等主流程，调用方可继续使用 clerkId。
 */
export async function ensureLocalUser(clerkId: string) {
  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
  } catch (error) {
    console.error('[auth] failed to load Clerk user:', error);
  }

  return prisma.user.upsert({
    where: { clerkId },
    update: email ? { email } : {},
    create: { clerkId, email },
  });
}
