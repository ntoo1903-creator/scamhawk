import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SearchForm from '@/components/search-form';
import StatsBar from '@/components/stats-bar';
import Features from '@/components/features';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');

  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:py-28">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            {t('heroSubtitle')}
          </p>
        </div>

        <StatsBar />

        <SearchForm />

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('examples')}{' '}
          <span className="font-mono text-gray-700">
            0x8ba1f109551bD432803012645Ac136ddd64DBA72
          </span>
          {' · '}
          <span className="font-mono text-gray-700">example.com</span>
        </p>
      </section>

      <Features />
    </>
  );
}
