import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://scamhawk.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ['', '/pricing', '/dashboard'];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'weekly' : 'daily',
        priority: page === '' ? 1 : 0.8,
      });
    }
  }

  return entries;
}
