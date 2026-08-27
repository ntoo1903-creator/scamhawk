import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ClerkProvider } from '@clerk/nextjs';
import { routing } from '@/i18n/routing';
import { isClerkConfigured } from '@/lib/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import StructuredData from '@/components/structured-data';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // 让 /zh 与 /en 页面可静态预渲染
  setRequestLocale(locale);
  const messages = await getMessages();

  const app = (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );

  return (
    <html lang={locale}>
      <head>
        <StructuredData />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        {/* 未配置 Clerk 环境变量时跳过 Provider，保证本地可直接运行 */}
        {isClerkConfigured() ? <ClerkProvider>{app}</ClerkProvider> : app}
      </body>
    </html>
  );
}
