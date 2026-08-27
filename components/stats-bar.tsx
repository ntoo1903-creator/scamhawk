import { prisma } from '@/lib/prisma';

function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

export default async function StatsBar() {
  const [checkCount, watchCount, userCount] = await Promise.all([
    prisma.checkRecord.count(),
    prisma.watchItem.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: '累计查询', value: formatCount(checkCount), suffix: '次' },
    { label: '监控中', value: formatCount(watchCount), suffix: '个对象' },
    { label: '注册用户', value: formatCount(userCount), suffix: '人' },
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
