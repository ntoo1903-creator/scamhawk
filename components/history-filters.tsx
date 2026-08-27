'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SearchIcon, XIcon } from 'lucide-react';
import { riskStyles } from './risk-badge';
import type { RiskLevel, EntityType } from '@/lib/types';

interface CheckRecord {
  id: string;
  value: string;
  type: EntityType;
  riskLevel: RiskLevel;
  reportCount: number;
  createdAt: Date;
}

function RiskBadgeInline({ level, label }: { level: RiskLevel; label: string }) {
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

export default function HistoryFilters({
  records,
  locale,
}: {
  records: CheckRecord[];
  locale: string;
}) {
  const t = useTranslations('History');
  const riskT = useTranslations('Risk');

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const filtered = useMemo(() => {
    return records.filter((item) => {
      if (riskFilter !== 'ALL' && item.riskLevel !== riskFilter) return false;
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.value.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, search, riskFilter, typeFilter]);

  const riskOptions: { value: RiskFilter; label: string; count: number }[] = [
    { value: 'ALL', label: t('filterAll'), count: records.length },
    {
      value: 'SCAM',
      label: riskT('SCAM'),
      count: records.filter((i) => i.riskLevel === 'SCAM').length,
    },
    {
      value: 'SUSPICIOUS',
      label: riskT('SUSPICIOUS'),
      count: records.filter((i) => i.riskLevel === 'SUSPICIOUS').length,
    },
    {
      value: 'SAFE',
      label: riskT('SAFE'),
      count: records.filter((i) => i.riskLevel === 'SAFE').length,
    },
    {
      value: 'UNKNOWN',
      label: riskT('UNKNOWN'),
      count: records.filter((i) => i.riskLevel === 'UNKNOWN').length,
    },
  ];

  const typeOptions: { value: TypeFilter; label: string; count: number }[] = [
    { value: 'ALL', label: t('filterAll'), count: records.length },
    {
      value: 'ADDRESS',
      label: t('typeADDRESS'),
      count: records.filter((i) => i.type === 'ADDRESS').length,
    },
    {
      value: 'WEBSITE',
      label: t('typeWEBSITE'),
      count: records.filter((i) => i.type === 'WEBSITE').length,
    },
  ];

  const hasFilters = search || riskFilter !== 'ALL' || typeFilter !== 'ALL';

  function clearFilters() {
    setSearch('');
    setRiskFilter('ALL');
    setTypeFilter('ALL');
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
  }

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
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

      {hasFilters && (
        <p className="mt-2 text-xs text-gray-500">
          {t('filterResultCount', {
            filtered: filtered.length,
            total: records.length,
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
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="max-w-[70%] truncate font-mono text-xs text-gray-900">
                  {item.value}
                </p>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {t(`type${item.type}`)}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <RiskBadgeInline level={item.riskLevel} label={riskT(item.riskLevel)} />
                <span className="text-xs font-semibold text-gray-700">
                  {item.reportCount} {riskT('reports').toLowerCase()}
                </span>
              </div>
              <p className="mt-2.5 text-xs text-gray-500">
                {formatDate(item.createdAt)}
              </p>
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
              <th className="px-4 py-3 font-medium">{t('columnTime')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
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
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(item.createdAt)}
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
