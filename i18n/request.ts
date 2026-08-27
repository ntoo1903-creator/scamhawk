import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale 可能为 undefined（非 [locale] 段页面）或非法值，需回退到默认语言
  const requested = await requestLocale;
  const locale: Locale = routing.locales.includes(
    requested as Locale,
  )
    ? (requested as Locale)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
