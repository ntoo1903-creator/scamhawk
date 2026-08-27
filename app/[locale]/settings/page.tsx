import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getClerkUserId, isClerkConfigured } from '@/lib/auth';
import { getActiveSubscription, isPaddleConfigured, isPaddleCheckoutConfigured } from '@/lib/paddle';
import { FREE_TIER_LIMITS } from '@/lib/rate-limit';
import { Link } from '@/i18n/navigation';
import {
  UserIcon,
  CreditCardIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from 'lucide-react';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const t = await getTranslations('Settings');

  // 未配置 Clerk
  if (!isClerkConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {t('notConfigured')}
        </p>
      </main>
    );
  }

  const clerkId = await getClerkUserId();
  if (!clerkId) {
    redirect('/');
  }

  // 查询用户数据
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      subscriptions: { orderBy: { updatedAt: 'desc' }, take: 1 },
      _count: { select: { watchItems: true, checkRecords: true } },
    },
  });

  const subscription = user?.subscriptions[0] ?? null;
  const isPro = subscription?.status === 'active' || subscription?.status === 'trialing';

  const checkCount = user?._count.checkRecords ?? 0;
  const watchCount = user?._count.watchItems ?? 0;

  // 订阅状态颜色
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-gray-100 text-gray-800',
    canceled: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    active: t('statusActive'),
    trialing: t('statusTrialing'),
    past_due: t('statusPastDue'),
    paused: t('statusPaused'),
    canceled: t('statusCanceled'),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>

      <div className="mt-8 space-y-6">
        {/* 账户信息 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">{t('account')}</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('userId')}</span>
              <span className="font-mono text-sm text-gray-900">{clerkId.slice(0, 16)}…</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('createdAt')}</span>
              <span className="text-sm text-gray-900">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : '-'}
              </span>
            </div>
          </div>
        </section>

        {/* 订阅状态 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">{t('subscription')}</h2>
          </div>

          {subscription ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('plan')}</span>
                <span className="font-medium text-gray-900">
                  {isPro ? t('planPro') : t('planFree')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('status')}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusColors[subscription.status] ?? 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {statusLabels[subscription.status] ?? subscription.status}
                </span>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('nextBilling')}</span>
                  <span className="text-sm text-gray-900">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
              {subscription.cancelAtPeriodEnd && (
                <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  {t('cancelAtPeriodEnd')}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">{t('noSubscription')}</p>
              {isPaddleCheckoutConfigured() ? (
                <Link
                  href="/pricing"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  {t('upgradeToPro')}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              ) : (
                <p className="mt-2 text-xs text-gray-400">{t('checkoutNotConfigured')}</p>
              )}
            </div>
          )}
        </section>

        {/* 使用统计 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">{t('usage')}</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{t('totalChecks')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{checkCount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{t('watchItems')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {watchCount}
                {!isPro && (
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    / {FREE_TIER_LIMITS.maxWatchItems}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 免费版限制说明 */}
          {!isPro && (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="text-sm font-medium text-brand-900">{t('freeLimits')}</p>
                  <ul className="mt-1 space-y-1 text-sm text-brand-700">
                    <li>• {t('freeCheckLimit', { limit: FREE_TIER_LIMITS.dailyChecks })}</li>
                    <li>• {t('freeWatchLimit', { limit: FREE_TIER_LIMITS.maxWatchItems })}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
