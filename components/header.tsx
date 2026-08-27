import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import LocaleSwitcher from './locale-switcher';
import UserMenu from './user-menu';
import MobileMenu from './mobile-menu';

export default async function Header() {
  const t = await getTranslations('Nav');

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <svg viewBox="0 0 32 32" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#7c3aed" />
            <path d="M16 6l8 5.5-8 14.5-8-14.5L16 6z" fill="#fff" opacity="0.95" />
            <circle cx="16" cy="14" r="3" fill="#7c3aed" />
            <path
              d="M13.5 16.5l-2 4 4.5-1.5 4.5 1.5-2-4"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-bold tracking-tight sm:text-lg">ScamHawk</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/" className="transition hover:text-gray-900">
            {t('check')}
          </Link>
          <Link href="/pricing" className="transition hover:text-gray-900">
            {t('pricing')}
          </Link>
          <Link href="/dashboard" className="transition hover:text-gray-900">
            {t('dashboard')}
          </Link>
          <Link href="/history" className="transition hover:text-gray-900">
            {t('history')}
          </Link>
          <Link href="/settings" className="transition hover:text-gray-900">
            {t('settings')}
          </Link>
        </nav>

        {/* Right side: mobile menu + locale + user */}
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileMenu />
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
