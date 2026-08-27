import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getClerkUserId, isClerkConfigured } from '@/lib/auth';
import HistoryFilters from '@/components/history-filters';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('History');

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

  const records = await prisma.checkRecord.findMany({
    where: { user: { clerkId } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <span className="text-sm text-gray-500">
          {t('totalRecords', { count: records.length })}
        </span>
      </div>
      <p className="mt-2 text-gray-600">{t('subtitle')}</p>

      {records.length === 0 ? (
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
        <HistoryFilters records={records} locale={locale} />
      )}
    </section>
  );
}
