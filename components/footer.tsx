import { getTranslations } from 'next-intl/server';

export default async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 text-center">
        <p className="font-medium text-gray-700">{t('tagline')}</p>
        <p className="mt-1 text-xs text-gray-400">{t('disclaimer')}</p>
      </div>
    </footer>
  );
}
