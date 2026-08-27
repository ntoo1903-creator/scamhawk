import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckIcon } from 'lucide-react';
import PricingCard from '@/components/pricing-card';
import { getClerkUserId } from '@/lib/auth';
import {
  getActiveSubscription,
  isPaddleCheckoutConfigured,
} from '@/lib/paddle';

export const dynamic = 'force-dynamic';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Pricing');

  // 当前用户是否已有有效（active/trialing）专业版订阅
  const clerkId = await getClerkUserId();
  const activeSubscription = clerkId
    ? await getActiveSubscription(clerkId)
    : null;
  const hasPro = activeSubscription !== null;
  const paddleReady = isPaddleCheckoutConfigured();

  const plans = [
    {
      name: t('freeName'),
      price: t('freePrice'),
      period: t('freePeriod'),
      features: [
        t('freeFeatures.0'),
        t('freeFeatures.1'),
        t('freeFeatures.2'),
      ],
      highlighted: false,
      isPro: false,
      alreadySubscribed: !hasPro, // 未订阅时免费版就是当前方案
    },
    {
      name: t('proName'),
      price: t('proPrice'),
      period: t('proPeriod'),
      features: [
        t('proFeatures.0'),
        t('proFeatures.1'),
        t('proFeatures.2'),
        t('proFeatures.3'),
      ],
      highlighted: true,
      isPro: true,
      alreadySubscribed: hasPro,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            name={plan.name}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            highlighted={plan.highlighted}
            ctaLabel={t('cta')}
            configureNote={t('configureNote')}
            signInNote={t('signInNote')}
            openingLabel={t('openingLabel')}
            doneLabel={t('ctaCurrent')}
            isPro={plan.isPro}
            alreadySubscribed={plan.alreadySubscribed}
          />
        ))}
      </div>

      {!paddleReady && (
        <div className="mt-12 flex items-start justify-center gap-2 text-sm text-gray-500">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <p>{t('configureNote')}</p>
        </div>
      )}
    </section>
  );
}
