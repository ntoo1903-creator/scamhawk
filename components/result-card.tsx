'use client';

import { useTranslations } from 'next-intl';
import { ShieldAlertIcon, AlertTriangleIcon, FileWarningIcon } from 'lucide-react';
import type { LookupResult } from '@/lib/types';
import RiskBadge from './risk-badge';
import WatchButton from './watch-button';

export default function ResultCard({ result }: { result: LookupResult }) {
  const t = useTranslations('Risk');
  const homeT = useTranslations('Home');

  const Icon =
    result.riskLevel === 'SCAM'
      ? ShieldAlertIcon
      : result.riskLevel === 'SUSPICIOUS'
        ? AlertTriangleIcon
        : FileWarningIcon;

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-8 w-8 text-brand-600" />
          <div>
            <div className="flex items-center gap-2">
              <RiskBadge level={result.riskLevel} label={t(result.riskLevel)} />
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {t(`${result.riskLevel}_DESC`)}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-500">
            {t('entity')}:{' '}
            <span className="font-mono text-xs text-gray-800">{result.value}</span>
          </p>
          <p className="mt-0.5 text-gray-500">
            {t('checkedAt')}:{' '}
            <span className="text-gray-700">
              {new Date(result.checkedAt).toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-400">{t('reports')}</p>
          <p className="mt-1 text-xl font-semibold">{result.reportCount}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400">{t('categories')}</p>
          <p className="mt-1 text-sm text-gray-700">
            {result.categories.length > 0
              ? result.categories.join(' · ')
              : '—'}
          </p>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs text-gray-400">ScamHawk</p>
          <p className="mt-1 text-sm text-gray-700">
            {result.isMock ? 'demo' : 'Chainabuse'}
          </p>
        </div>
      </div>

      {result.isMock && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          {homeT('mockNotice')}
        </p>
      )}

      <WatchButton value={result.value} type={result.type} />
    </div>
  );
}
