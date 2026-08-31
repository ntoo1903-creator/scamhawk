'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2Icon, AlertTriangleIcon } from 'lucide-react';
import type { LookupResult } from '@/lib/types';
import ResultCard from '@/components/result-card';

export default function SharedCheckPage() {
  const params = useParams();
  const t = useTranslations('Home');

  const rawValue = Array.isArray(params.value) ? params.value[0] : params.value;
  let value = '';
  try {
    value = decodeURIComponent(rawValue ?? '');
  } catch {
    value = '';
  }

  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!value) {
      setState('error');
      setErrorMsg(t('invalidInput'));
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState('error');
          setErrorMsg(
            data.error === 'INVALID_INPUT' ? t('invalidInput') : t('networkError'),
          );
          return;
        }

        setResult(data.result as LookupResult);
        setState('done');
      } catch {
        if (!cancelled) {
          setState('error');
          setErrorMsg(t('networkError'));
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [value, t]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('shareTitle')}</h1>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-mono text-gray-700">{value}</span>
        </p>
      </div>

      {state === 'loading' && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Loader2Icon className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-gray-500">{t('checking')}</p>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangleIcon className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {state === 'done' && result && <ResultCard result={result} />}
    </section>
  );
}
