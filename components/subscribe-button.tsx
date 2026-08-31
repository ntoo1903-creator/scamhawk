'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import { Loader2Icon, ShieldCheckIcon } from 'lucide-react';

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
);
const PADDLE_JS_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; environment?: string }) => Promise<void> | void;
      Checkout: {
        open: (opts: object) => void;
        on: (event: string, cb: (evt: unknown) => void) => void;
      };
    };
  }
}

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
      reject(new Error('failed to load Paddle.js'));
    };
    document.head.appendChild(script);
  });
  return paddleJsPromise;
}

interface CheckoutConfig {
  configured: boolean;
  environment?: 'sandbox' | 'production';
  clientToken?: string;
  priceId?: string;
}

type ButtonState = 'loading' | 'not-configured' | 'signed-out' | 'ready' | 'opening' | 'done';

interface CommonProps {
  ctaLabel: string;
  configureNote: string;
  signInNote: string;
  openingLabel: string;
  doneLabel: string;
  alreadySubscribed: boolean;
  className: string;
}

export default function SubscribeButton({
  ctaLabel,
  configureNote,
  signInNote,
  openingLabel,
  doneLabel,
  alreadySubscribed = false,
  className,
}: Omit<CommonProps, 'alreadySubscribed'> & { alreadySubscribed?: boolean }) {
  const t = useTranslations('Pricing');
  const locale = useLocale();
  const router = useRouter();

  // 重要：不能在此组件中无条件调用 Clerk hooks，因为本地/未配置环境不会挂载 ClerkProvider。
  if (!clerkConfigured) {
    return (
      <div className="mt-8">
        <button
          type="button"
          disabled
          title={configureNote}
          className={`${className} cursor-not-allowed opacity-50`}
        >
          {ctaLabel}
        </button>
        <p className="mt-2 text-xs text-gray-400">{configureNote}</p>
      </div>
    );
  }

  return (
    <ClerkCheckoutButton
      ctaLabel={ctaLabel}
      configureNote={configureNote}
      signInNote={signInNote}
      openingLabel={openingLabel}
      doneLabel={doneLabel}
      alreadySubscribed={alreadySubscribed}
      className={className}
      t={t}
      locale={locale}
      router={router}
    />
  );
}

function ClerkCheckoutButton({
  ctaLabel,
  configureNote,
  signInNote,
  openingLabel,
  doneLabel,
  alreadySubscribed,
  className,
  t,
  locale,
  router,
}: CommonProps & {
  t: (key: string) => string;
  locale: string;
  router: ReturnType<typeof useRouter>;
}) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<ButtonState>(alreadySubscribed ? 'done' : 'loading');
  const [error, setError] = useState(false);
  const configRef = useRef<CheckoutConfig | null>(null);
  const listenerRegistered = useRef(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/paddle/config', { cache: 'no-store' });
      if (res.status === 401) {
        setState('signed-out');
        return;
      }
      const data: CheckoutConfig = await res.json();
      configRef.current = data;
      setState(data.configured ? 'ready' : 'not-configured');
    } catch {
      setState('not-configured');
    }
  }, []);

  useEffect(() => {
    if (alreadySubscribed) return;
    if (isSignedIn === undefined) return;
    if (isSignedIn === false) {
      setState('signed-out');
      return;
    }
    fetchConfig();
  }, [fetchConfig, isSignedIn, alreadySubscribed]);

  async function handleCheckout() {
    const config = configRef.current;
    if (!config?.configured || !config.clientToken || !config.priceId) return;

    setState('opening');
    setError(false);
    try {
      await loadPaddleJs();
      const paddle = window.Paddle;
      if (!paddle) throw new Error('Paddle not loaded');

      await paddle.Initialize({ token: config.clientToken, environment: config.environment });

      if (!listenerRegistered.current) {
        paddle.Checkout.on('checkout.completed', () => {
          setState('done');
          router.refresh();
        });
        listenerRegistered.current = true;
      }

      paddle.Checkout.open({
        items: [{ priceId: config.priceId, quantity: 1 }],
        customData: { user_id: user?.id ?? '' },
        customer: user?.primaryEmailAddress
          ? { email: user.primaryEmailAddress.emailAddress }
          : undefined,
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale,
          successUrl: `${window.location.origin}/${locale}/pricing?checkout=success`,
        },
      });
    } catch {
      setError(true);
      setState('ready');
    }
  }

  const disabled = ['loading', 'not-configured', 'opening', 'done'].includes(state);
  const btnCls = `${className} disabled:cursor-not-allowed disabled:opacity-50`;

  if (state === 'signed-out') {
    return (
      <div className="mt-8">
        <SignInButton mode="modal">
          <button type="button" className={btnCls} title={signInNote}>{ctaLabel}</button>
        </SignInButton>
        <p className="mt-2 text-xs text-gray-400">{signInNote}</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <button type="button" disabled={disabled} title={state === 'not-configured' ? configureNote : undefined} onClick={handleCheckout} className={btnCls}>
        {state === 'loading' || state === 'opening' ? (
          <><Loader2Icon className="h-4 w-4 animate-spin" />{state === 'opening' ? openingLabel : ctaLabel}</>
        ) : state === 'done' ? (
          <><ShieldCheckIcon className="h-4 w-4" />{doneLabel}</>
        ) : ctaLabel}
      </button>
      {state === 'done' && <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600"><ShieldCheckIcon className="h-3.5 w-3.5" />{t('subscriptionActive')}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{t('checkoutError')}</p>}
    </div>
  );
}
