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

function RiskBadgeInline({
  level,
  label,
}: {
  level: RiskLevel;
  label: string;
}) {
  const style = riskStyles[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style?.badge ?? ''}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style?.dot ?? ''}`} />
      {label}
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

  function clearFilters() {
    setSearch('');
    setRiskFilter('ALL');
    setTypeFilter('ALL');
  }

  function formatDate(d: Date | null) {
    if (!d) return t('never');
    return new Date(d).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
  }

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
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

        {/* Dropdowns */}
        <div className="flex gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:flex-none"
          >
            {riskOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:flex-none"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex h-9 items-center gap-1 self-start rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 transition hover:bg-gray-50"
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

      {/* ── Mobile: card layout ── */}
      <div className="mt-3 space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
            {t('filterEmpty')}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              {/* Top row: value + remove */}
              <div className="flex items-start justify-between gap-2">
                <p className="max-w-[70%] truncate font-mono text-xs text-gray-900">
                  {item.value}
                </p>
                <RemoveButton value={item.value} label={t('remove')} />
              </div>

              {/* Badges row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {t(`type${item.type}`)}
                </span>
                <RiskBadgeInline level={item.riskLevel} label={riskT(item.riskLevel)} />
                <span className="text-xs font-semibold text-gray-700">
                  {item.reportCount} {t('columnReports').toLowerCase()}
                </span>
              </div>

              {/* Categories */}
              {item.categories.length > 0 && (
                <p className="mt-2 truncate text-xs text-gray-500">
                  {item.categories.join(' · ')}
                </p>
              )}

              {/* Last checked */}
              <div className="mt-2.5 flex items-center gap-2 border-t border-gray-100 pt-2.5">
                <span className="text-xs text-gray-500">
                  {t('columnLastChecked')}:
                </span>
                <span className="text-xs text-gray-700">
                  {formatDate(item.lastCheckedAt)}
                </span>
                <StaleIndicator lastCheckedAt={item.lastCheckedAt} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: table layout ── */}
      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <th className="px-4 py-3 font-medium">{t('columnValue')}</th>
              <th className="px-4 py-3 font-medium">{t('columnType')}</th>
              <th className="px-4 py-3 font-medium">{t('columnRisk')}</th>
              <th className="px-4 py-3 font-medium">{t('columnReports')}</th>
              <th className="px-4 py-3 font-medium">{t('columnCategories')}</th>
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
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs">
                    {item.value}
                  </td>
                  <td className="px-4 py-3">{t(`type${item.type}`)}</td>
                  <td className="px-4 py-3">
                    <RiskBadgeInline
                      level={item.riskLevel}
                      label={riskT(item.riskLevel)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">{item.reportCount}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-gray-500">
                    {item.categories.length > 0
                      ? item.categories.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-600">
                        {formatDate(item.lastCheckedAt)}
                      </span>
                      <StaleIndicator lastCheckedAt={item.lastCheckedAt} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RemoveButton value={item.value} label={t('remove')} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
