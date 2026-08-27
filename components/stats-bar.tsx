import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';

/** 多语言数字格式化 */
function formatCount(n: number, t: (key: string) => string): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}${t('billion')}`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}${t('tenThousand')}`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

export default async function StatsBar() {
  const t = await getTranslations('Stats');

  const [checkCount, watchCount, userCount] = await Promise.all([
    prisma.checkRecord.count(),
    prisma.watchItem.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: t('checks'), value: formatCount(checkCount, t), suffix: t('checksSuffix') },
    { label: t('watching'), value: formatCount(watchCount, t), suffix: t('watchingSuffix') },
    { label: t('users'), value: formatCount(userCount, t), suffix: t('usersSuffix') },
  ];

  return (
    <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-6 sm:gap-10">
      {stats.map(({ label, value, suffix }) => (
        <div key={label} className="text-center">
          <p className="text-2xl font-bold tabular-nums text-brand-600 sm:text-3xl">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {label}
            <span className="hidden sm:inline">{suffix}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
