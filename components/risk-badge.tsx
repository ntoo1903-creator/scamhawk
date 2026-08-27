import type { RiskLevel } from '@/lib/types';

export const riskStyles: Record<
  RiskLevel,
  { badge: string; text: string; dot: string }
> = {
  SAFE: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  SUSPICIOUS: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  SCAM: {
    badge: 'bg-red-50 text-red-700 ring-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  UNKNOWN: {
    badge: 'bg-gray-50 text-gray-600 ring-gray-200',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
};

export default function RiskBadge({
  level,
  label,
}: {
  level: RiskLevel;
  label: string;
}) {
  const style = riskStyles[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
