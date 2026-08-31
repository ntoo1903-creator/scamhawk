'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import { CheckIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react';
import type { Tier } from '@/lib/paddle-tiers';

// ── Paddle.js 类型声明 ─────────────────────────────────

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: {
        token: string;
        environment: string;
      }) => Promise<void> | void;
      Checkout: {
        open: (opts: Record<string, unknown>) => void;
        on: (event: string, cb: (...args: unknown[]) => void) => void;
      };
    };
  }
}

// ── Paddle.js 加载 ──────────────────────────────────────

const PADDLE_JS_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let paddleJsPromise: Promise<void> | null = null;

function loadPaddleJs(): Promise<void> {
  if (paddleJsPromise) return paddleJsPromise;
  if (typeof window !== 'undefined' && window.Paddle) {
    paddleJsPromise = Promise.resolve();
    return paddleJsPromise;
  }
  paddleJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_JS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      paddleJsPromise = null;
      reject(new Error('Failed to load Paddle.js'));
    };
    document.head.appendChild(script);
  });
  return paddleJsPromise;
}

// ── 价格数据 ────────────────────────────────────────────

interface PriceData {
  priceId: string;
  formattedTotal: string;
  formattedSubtotal: string;
  formattedTax: string;
  currencyCode: string;
}

// ── Props ────────────────────────────────────────────────

interface PricingClientProps {
  tiers: Tier[];
  prices: Record<string, PriceData>;
  environment: string;
  clientToken: string;
  hasPro: boolean;
  userEmail?: string | null;
}

// ── 主组件 ──────────────────────────────────────────────

export default function PricingClient({
  tiers,
  prices,
  environment,
  clientToken,
  hasPro,
  userEmail,
}: PricingClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [paddleReady, setPaddleReady] = useState(false);
  const [openingTier, setOpeningTier] = useState<string | null>(null);
  const listenerRegistered = useRef(false);

  // 初始化 Paddle.js
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadPaddleJs();
        if (cancelled) return;
        const paddle = window.Paddle;
        if (!paddle) return;
        await paddle.Initialize({
          token: clientToken,
          environment,
        });
        if (!cancelled) setPaddleReady(true);
      } catch (err) {
        console.error('[Pricing] Failed to initialize Paddle:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [clientToken, environment]);

  // 注册 checkout.completed 监听
  useEffect(() => {
    if (!paddleReady || listenerRegistered.current) return;
    const paddle = window.Paddle;
    if (!paddle) return;
    paddle.Checkout.on('checkout.completed', () => {
      router.push(`/${locale}/welcome`);
    });
    listenerRegistered.current = true;
  }, [paddleReady, router, locale]);

  const handleCheckout = useCallback(
    (tierName: string, priceId: string) => {
      if (!paddleReady) return;
      const paddle = window.Paddle;
      if (!paddle) return;

      setOpeningTier(tierName);

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: userEmail
          ? { email: userEmail }
          : user?.primaryEmailAddress?.emailAddress
            ? { email: user.primaryEmailAddress.emailAddress }
            : undefined,
        customData: {
          user_id: user?.id ?? '',
          tier: tierName,
        },
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          theme: 'light',
          locale,
          successUrl: `${window.location.origin}/${locale}/welcome`,
        },
      });

      // 重置 opening 状态（overlay 关闭时）
      setTimeout(() => setOpeningTier(null), 3000);
    },
    [paddleReady, locale, user, userEmail],
  );

  return (
    <div className="mt-12">
      {/* 月/年切换 */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setInterval('month')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              interval === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('year')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              interval === 'year'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs text-emerald-600">Save ~17%</span>
          </button>
        </div>
      </div>

      {/* 定价卡片 */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {tiers.map((tier) => {
          const priceKey = `${tier.name}-${interval}`;
          const priceData = prices[priceKey];
          const isHighlighted = tier.highlighted;
          const isCurrentPlan = hasPro && tier.name !== 'Starter';
          const isOpening = openingTier === tier.name;

          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm ${
                isHighlighted
                  ? 'border-brand-500 ring-2 ring-brand-100'
                  : 'border-gray-200'
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{tier.description}</p>

              <div className="mt-6">
                {priceData ? (
                  <>
                    <span className="text-4xl font-bold">{priceData.formattedTotal}</span>
                    <span className="ml-1 text-sm text-gray-500">
                      / {interval === 'month' ? 'mo' : 'yr'}
                    </span>
                  </>
                ) : (
                  <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
                )}
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition ${
                        isHighlighted
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Sign in to subscribe
                    </button>
                  </SignInButton>
                ) : isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-500 opacity-70"
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Current plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!paddleReady || !priceData || isOpening}
                    onClick={() => priceData && handleCheckout(tier.name, priceData.priceId)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isHighlighted
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isOpening ? (
                      <>
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                        Opening checkout…
                      </>
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paddle 未配置提示 */}
      {!paddleReady && (
        <p className="mt-8 text-center text-sm text-gray-400">
          Payment system is loading or not configured.
        </p>
      )}
    </div>
  );
}
