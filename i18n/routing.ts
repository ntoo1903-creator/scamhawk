import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言。默认中文，可通过 /en 前缀切换到英文。
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
});

export type Locale = (typeof routing.locales)[number];
