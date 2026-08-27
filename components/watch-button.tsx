'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { BellPlusIcon, BellRingIcon, AlertCircleIcon } from 'lucide-react';
import type { EntityType } from '@/lib/types';

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export default function WatchButton({
  value,
  type,
}: {
  value: string;
  type: EntityType;
}) {
  const t = useTranslations('Risk');

  // 未配置 Clerk 时隐藏入口
  if (!clerkConfigured) return null;

  return <WatchButtonInner value={value} type={type} t={t} />;
}

function WatchButtonInner({
  value,
  type,
  t,
}: {
  value: string;
  type: EntityType;
  t: (key: string) => string;
}) {
  const { isSignedIn } = useAuth();
  const [watching, setWatching] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<false | 'generic' | 'limit'>(false);

  if (!isSignedIn) {
    return (
      <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
        <BellPlusIcon className="h-3.5 w-3.5" />
        {t('signInToWatch')}
      </p>
    );
  }

  async function addToWatchlist() {
    setWatching(true);
    setError(false);
    try {
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'WATCH_LIMIT_EXCEEDED') {
          setError('limit');
        } else {
          setError('generic');
        }
        return;
      }
      setDone(true);
    } catch {
      setError('generic');
    } finally {
      setWatching(false);
    }
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={addToWatchlist}
        disabled={watching || done}
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
      >
        {done ? (
          <BellRingIcon className="h-3.5 w-3.5" />
        ) : (
          <BellPlusIcon className="h-3.5 w-3.5" />
        )}
        {done ? t('watching') : t('addToWatch')}
      </button>
      {done && <span className="text-xs text-emerald-600">{t('watchAdded')}</span>}
      {error === 'limit' && (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <AlertCircleIcon className="h-3.5 w-3.5" />
          {t('watchLimitExceeded')}
        </span>
      )}
      {error === 'generic' && <span className="text-xs text-red-600">{t('watchError')}</span>}
    </div>
  );
}
