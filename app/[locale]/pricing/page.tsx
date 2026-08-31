import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import PricingClient from '@/components/pricing-client';
import { getClerkUserId } from '@/lib/auth';
import { getActiveSubscription } from '@/lib/paddle';
import { getTiers } from '@/lib/paddle-tiers';

export const dynamic = 'force-dynamic';

/**
 * 服务端调用 Paddle Price Preview API，获取格式化后的本地价格。
 * 客户端绝不直接访问 API key。
 */
async function fetchPrices(
  country?: string,
): Promise<Record<string, { priceId: string; formattedTotal: string; formattedSubtotal: string; formattedTax: string; currencyCode: string }>> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return {};

  const tiers = getTiers();
  const prices: Record<string, { priceId: string; formattedTotal: string; formattedSubtotal: string; formattedTax: string; currencyCode: string }> = {};

  const intervals = ['month', 'year'] as const;

  const tasks = tiers.flatMap((tier) =>
    intervals.map(async (interval) => {
      const priceId = tier.priceId[interval];
      try {
        const body: Record<string, unknown> = {
          items: [{ priceId, quantity: 1 }],
        };
        if (country) {
          body.customerIpCountry = country;
        }

        const res = await fetch('https://api.paddle.com/1.1/price-preview', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          next: { revalidate: 300 },
        });

        if (!res.ok) {
          console.error(`[pricing] Price preview failed for ${priceId}: ${res.status}`);
          return;
        }

        const data = await res.json();
        const d = data.data;
        const totals = d.adjustment?.adjustedTotals ?? d.totals;
        const formattedTotals = d.adjustment?.formattedAdjustedTotals ?? d.formattedTotals;

        prices[`${tier.name}-${interval}`] = {
          priceId: d.price.id,
          formattedTotal: formattedTotals.total,
          formattedSubtotal: formattedTotals.subtotal,
          formattedTax: formattedTotals.tax,
          currencyCode: totals.currencyCode,
        };
      } catch (err) {
        console.error(`[pricing] Error fetching price for ${priceId}:`, err);
      }
    }),
  );

  await Promise.all(tasks);
  return prices;
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Pricing');

  // 服务端检测用户国家
  const hdrs = await headers();
  const country = hdrs.get('x-vercel-ip-country') ?? undefined;

  // 获取价格
  const prices = await fetchPrices(country);

  // 检查用户订阅状态
  const clerkId = await getClerkUserId();
  const activeSubscription = clerkId
    ? await getActiveSubscription(clerkId)
    : null;
  const hasPro = activeSubscription !== null;

  // 获取用户邮箱（用于 checkout 预填）
  let userEmail: string | null = null;
  if (clerkId) {
    try {
      const { prisma } = await import('@/lib/prisma');
      const localUser = await prisma.user.findUnique({
        where: { clerkId },
        select: { email: true },
      });
      userEmail = localUser?.email ?? null;
    } catch {
      // 邮箱获取失败不阻断页面
    }
  }

  const tiers = getTiers();

  // Paddle 配置状态
  const paddleConfigured = Boolean(
    process.env.PADDLE_API_KEY && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );
  const environment = process.env.PADDLE_ENVIRONMENT === 'live' ? 'production' : 'sandbox';
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      <PricingClient
        tiers={tiers}
        prices={prices}
        environment={environment}
        clientToken={clientToken}
        hasPro={hasPro}
        userEmail={userEmail}
      />

      {!paddleConfigured && (
        <div className="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
          <p className="font-medium">Payment system not configured</p>
          <p className="mt-1">
            Set <code className="font-mono text-xs">PADDLE_API_KEY</code> and{' '}
            <code className="font-mono text-xs">NEXT_PUBLIC_PADDLE_CLIENT_TOKEN</code> in{' '}
            <code className="font-mono text-xs">.env.local</code> to enable checkout.
          </p>
        </div>
      )}

      <div className="mt-16 text-center text-sm text-gray-500">
        <p>
          All plans include a 7-day free trial. Cancel anytime.
          <br />
          Prices may vary by country. Powered by{' '}
          <a
            href="https://www.paddle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700"
          >
            Paddle
          </a>
          .
        </p>
      </div>
    </section>
  );
}
