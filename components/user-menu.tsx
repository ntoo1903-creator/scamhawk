'use client';

import { SignInButton, UserButton } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
);

export default function UserMenu() {
  const t = useTranslations('Nav');
  const locale = useLocale();

  // 未配置 Clerk 环境变量时整个菜单不渲染
  if (!clerkConfigured) return null;

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {t('signIn')}
        </button>
      </SignInButton>
      <UserButton afterSignOutUrl={`/${locale}`} />
    </div>
  );
}
