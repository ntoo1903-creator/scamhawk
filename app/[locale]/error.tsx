'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ScamHawk] page error:', error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h2 className="text-lg font-semibold text-red-800">
          出了点问题 / Something went wrong
        </h2>
        <p className="mt-2 max-w-md text-sm text-red-600">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-red-400">
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          重试 / Try again
        </button>
      </div>
    </section>
  );
}
