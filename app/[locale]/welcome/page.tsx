import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { CheckCircleIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-full bg-emerald-100 p-4">
        <CheckCircleIcon className="h-12 w-12 text-emerald-600" />
      </div>

      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Welcome to ScamHawk Pro!
      </h1>

      <p className="mx-auto mt-4 max-w-md text-gray-600">
        Your subscription is now active. You have access to unlimited risk
        checks, monitoring, and instant alerts.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Go to Dashboard
        </Link>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Check an address
        </Link>
      </div>

      <p className="mt-10 text-xs text-gray-400">
        A confirmation email has been sent to your address. You can manage your
        subscription from your{' '}
        <Link href={`/${locale}/settings`} className="underline hover:text-gray-600">
          account settings
        </Link>
        .
      </p>
    </section>
  );
}
