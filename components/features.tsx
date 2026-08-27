'use client';

import { useTranslations } from 'next-intl';
import {
  ShieldCheckIcon,
  BellDotIcon,
  ClockIcon,
  GlobeIcon,
} from 'lucide-react';

const icons = [ShieldCheckIcon, BellDotIcon, ClockIcon, GlobeIcon];

export default function Features() {
  const t = useTranslations('Features');

  const items = [0, 1, 2, 3].map((i) => ({
    icon: icons[i],
    title: t(`item${i}.title`),
    desc: t(`item${i}.desc`),
  }));

  return (
    <section className="mx-auto mt-20 w-full max-w-5xl px-4">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">
        {t('sectionTitle')}
      </h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <Icon className="h-8 w-8 text-brand-600" />
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
