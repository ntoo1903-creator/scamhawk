'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SearchIcon, Loader2Icon } from 'lucide-react';
import type { LookupResult } from '@/lib/types';
import ResultCard from './result-card';

type FormState = 'idle' | 'loading' | 'error';

export default function SearchForm() {
  const t = useTranslations('Home');
  const [value, setValue] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const input = value.trim();
    if (!input) {
      setState('error');
      setErrorMsg(t('emptyInput'));
      return;
    }

    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: input }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setErrorMsg(data.error === 'INVALID_INPUT' ? t('invalidInput') : t('networkError'));
        return;
      }

      setResult(data.result as LookupResult);
      setState('idle');
    } catch {
      setState('error');
      setErrorMsg(t('networkError'));
    }
  }

  return (
    <div className="mt-10">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm shadow-sm outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          aria-label={t('searchPlaceholder')}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'loading' ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
          {state === 'loading' ? t('checking') : t('searchButton')}
        </button>
      </form>

      {state === 'error' && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {result && state !== 'loading' && <ResultCard result={result} />}
    </div>
  );
}
