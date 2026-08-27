import { CheckIcon } from 'lucide-react';
import SubscribeButton from './subscribe-button';

export default function PricingCard({
  name,
  price,
  period,
  features,
  highlighted,
  ctaLabel,
  configureNote,
  signInNote,
  openingLabel,
  doneLabel,
  isPro = false,
  alreadySubscribed = false,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted: boolean;
  ctaLabel: string;
  configureNote: string;
  signInNote: string;
  openingLabel: string;
  doneLabel: string;
  isPro?: boolean;
  alreadySubscribed?: boolean;
}) {
  const btnCls = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition ${
    highlighted
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  }`;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-8 shadow-sm ${
        highlighted
          ? 'border-brand-500 ring-2 ring-brand-100'
          : 'border-gray-200'
      }`}
    >
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="mt-4">
        <span className="text-4xl font-bold">{price}</span>
        <span className="ml-1 text-sm text-gray-500">{period}</span>
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            {feature}
          </li>
        ))}
      </ul>

      {isPro ? (
        // 专业版：真实下单按钮（Paddle Checkout Overlay）
        <SubscribeButton
          ctaLabel={ctaLabel}
          configureNote={configureNote}
          signInNote={signInNote}
          openingLabel={openingLabel}
          doneLabel={doneLabel}
          alreadySubscribed={alreadySubscribed}
          className={btnCls}
        />
      ) : (
        // 免费版：静态按钮
        <div className="mt-8">
          <button
            type="button"
            disabled
            className={btnCls + ' w-full cursor-default opacity-70'}
          >
            {alreadySubscribed ? doneLabel : ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}
