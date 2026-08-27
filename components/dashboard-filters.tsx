'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SearchIcon, XIcon } from 'lucide-react';
import { riskStyles } from './risk-badge';
import RemoveButton from './remove-button';
import type { RiskLevel, EntityType } from '@/lib/types';

interface WatchItem {
  id: string;
  value: string;
  type: EntityType;
  riskLevel: RiskLevel;
  reportCount: number;
  categories: string[];
  lastCheckedAt: Date | null;
}

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

type RiskFilter = 'ALL' | RiskLevel;
type TypeFilter = 'ALL' | EntityType;

export default function DashboardFilters({
  items,
  locale,
}: {
  items: WatchItem[];
  locale: string;
}) {
  const t = useTranslations('Dashboard');
  const riskT = useTranslations('Risk');

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (riskFilter !== 'ALL' && item.riskLevel !== riskFilter) return false;
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.value.toLowerCase().includes(q) &&
          !item.categories.some((c) => c.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, search, riskFilter, typeFilter]);

  const riskOptions: { value: RiskFilter; label: string; count: number }[] = [
    { value: 'ALL', label: t('filterAll'), count: items.length },
    {
      value: 'SCAM',
      label: riskT('SCAM'),
      count: items.filter((i) => i.riskLevel === 'SCAM').length,
    },
    {
      value: 'SUSPICIOUS',
      label: riskT('SUSPICIOUS'),
      count: items.filter((i) => i.riskLevel === 'SUSPICIOUS').length,
    },
    {
      value: 'SAFE',
      label: riskT('SAFE'),
      count: items.filter((i) => i.riskLevel === 'SAFE').length,
    },
    {
      value: 'UNKNOWN',
      label: riskT('UNKNOWN'),
      count: items.filter((i) => i.riskLevel === 'UNKNOWN').length,
    },
  ];

  const typeOptions: { value: TypeFilter; label: string; count: number }[] = [
    { value: 'ALL', label: t('filterAll'), count: items.length },
    {
      value: 'ADDRESS',
      label: t('typeADDRESS'),
      count: items.filter((i) => i.type === 'ADDRESS').length,
    },
    {
      value: 'WEBSITE',
      label: t('typeWEBSITE'),
      count: items.filter((i) => i.type === 'WEBSITE').length,
    },
  ];

  const hasFilters = search || riskFilter !== 'ALL' || typeFilter !== 'ALL';

  return (
    <>
      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filterSearch')}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Risk level filter */}
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {riskOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.count})
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.count})
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('');
              setRiskFilter('ALL');
              setTypeFilter('ALL');
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50"
          >
            <XIcon className="h-3 w-3" />
            {t('filterClear')}
          </button>
        )}
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="mt-2 text-xs text-gray-500">
          {t('filterResultCount', {
            filtered: filtered.length,
            total: items.length,
          })}
        </p>
      )}

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {t('filterEmpty')}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const style =
                  riskStyles[item.riskLevel as keyof typeof riskStyles];
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs">
                      {item.value}
                    </td>
                    <td className="px-4 py-3">{t(`type${item.type}`)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style?.badge ?? ''}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${style?.dot ?? ''}`}
                        />
                        {riskT(item.riskLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {item.reportCount}
                    </td>
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
                      <RemoveButton value={item.value} label={t('remove')} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
