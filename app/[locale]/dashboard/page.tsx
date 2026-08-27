import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getClerkUserId, isClerkConfigured } from '@/lib/auth';
import { hasProAccess } from '@/lib/paddle';
import { riskStyles } from '@/components/risk-badge';
import RemoveButton from '@/components/remove-button';

export const dynamic = 'force-dynamic';

function StaleIndicator({ lastCheckedAt }: { lastCheckedAt: Date | null }) {
  if (!lastCheckedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        never
      </span>
    );
  }
  const hoursSince = (Date.now() - lastCheckedAt.getTime()) / 3600_000;
  if (hoursSince > 12) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        stale
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      fresh
    </span>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard');

  // 未配置 Clerk：引导配置
  if (!isClerkConfigured()) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          {t('notConfigured')}
        </p>
      </section>
    );
  }

  // 未登录：引导登录
  const clerkId = await getClerkUserId();
  if (!clerkId) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-gray-600">{t('signInRequired')}</p>
      </section>
    );
  }

  const items = await prisma.watchItem.findMany({
    where: { user: { clerkId } },
    orderBy: { createdAt: 'desc' },
  });

  const hasPro = await hasProAccess(clerkId);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            hasPro
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
          }`}
        >
          {t('planLabel')}：{hasPro ? t('planPro') : t('planFree')}
        </span>
      </div>
      <p className="mt-2 text-gray-600">{t('subtitle')}</p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-600">{t('empty')}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {t('goCheck')}
          </Link>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="mt-6 flex gap-4 text-sm">
            <div className="rounded-lg bg-white px-4 py-2 ring-1 ring-gray-200">
              <span className="text-gray-500">{t('totalWatched')}:</span>{' '}
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-2 ring-1 ring-red-200">
              <span className="text-red-600">{t('highRisk')}:</span>{' '}
              <span className="font-semibold text-red-700">
                {items.filter((i) => i.riskLevel === 'SCAM').length}
              </span>
            </div>
            <div className="rounded-lg bg-amber-50 px-4 py-2 ring-1 ring-amber-200">
              <span className="text-amber-600">{t('suspicious')}:</span>{' '}
              <span className="font-semibold text-amber-700">
                {items.filter((i) => i.riskLevel === 'SUSPICIOUS').length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="px-4 py-3 font-medium">{t('columnValue')}</th>
                  <th className="px-4 py-3 font-medium">{t('columnType')}</th>
                  <th className="px-4 py-3 font-medium">{t('columnRisk')}</th>
                  <th className="px-4 py-3 font-medium">{t('columnReports')}</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    {t('columnCategories')}
                  </th>
                  <th className="px-4 py-3 font-medium">{t('columnLastChecked')}</th>
                  <th className="px-4 py-3 font-medium">{t('columnActions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const style = riskStyles[item.riskLevel as keyof typeof riskStyles];
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs">
                        {item.value}
                      </td>
                      <td className="px-4 py-3">
                        {t(`type${item.type}`)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style?.badge ?? ''}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${style?.dot ?? ''}`} />
                          {t(`Risk.${item.riskLevel}`, { defaultValue: item.riskLevel })}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{item.reportCount}</td>
                      <td className="hidden max-w-[180px] truncate px-4 py-3 text-xs text-gray-500 sm:table-cell">
                        {item.categories.length > 0
                          ? item.categories.join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-600">
                            {item.lastCheckedAt
                              ? new Date(item.lastCheckedAt).toLocaleString(
                                  locale === 'zh' ? 'zh-CN' : 'en-US',
                                )
                              : t('never')}
                          </span>
                          <StaleIndicator lastCheckedAt={item.lastCheckedAt} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RemoveButton
                          value={item.value}
                          label={t('remove')}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
