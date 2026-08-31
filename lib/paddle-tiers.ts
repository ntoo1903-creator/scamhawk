/**
 * 定价层级配置。
 * 修改价格或功能列表时只改这里即可。
 *
 * priceId 从 Paddle Dashboard → Catalog → Prices 获取（pri_... 开头）。
 */

export interface Tier {
  name: 'Starter' | 'Pro' | 'Advanced';
  description: string;
  features: string[];
  /** Paddle Price ID，月付和年付各一个 */
  priceId: { month: string; year: string };
  /** 是否高亮显示（推荐方案） */
  highlighted?: boolean;
}

/**
 * 默认价格 ID 占位。
 * 请在 Paddle Dashboard 创建产品和价格后，用真实的 pri_... 替换。
 * 环境变量 PADDLE_PRICE_IDS 可覆盖此配置（JSON 格式）。
 */
const DEFAULT_TIERS: Tier[] = [
  {
    name: 'Starter',
    description: 'For individuals getting started with crypto safety',
    features: [
      '10 risk checks per day',
      'Results with report details',
      'Community data sync',
      'Email support',
    ],
    priceId: {
      month: 'pri_starter_monthly',
      year: 'pri_starter_annual',
    },
  },
  {
    name: 'Pro',
    description: 'For active traders who need unlimited checks and monitoring',
    features: [
      'Unlimited risk checks',
      'Unlimited watched addresses & websites',
      'Automatic re-check every 6 hours',
      'Instant alerts on risk changes',
      'Priority support',
    ],
    priceId: {
      month: 'pri_pro_monthly',
      year: 'pri_pro_annual',
    },
    highlighted: true,
  },
  {
    name: 'Advanced',
    description: 'For teams and professionals who need API access',
    features: [
      'Everything in Pro',
      'REST API access',
      'Team collaboration (up to 10 seats)',
      'Custom monitoring intervals',
      'Dedicated support',
      'Bulk risk analysis',
    ],
    priceId: {
      month: 'pri_advanced_monthly',
      year: 'pri_advanced_annual',
    },
  },
];

/**
 * 获取配置好的定价层级。
 * 如果环境变量 PADDLE_PRICE_IDS 存在，会用它覆盖默认值。
 */
export function getTiers(): Tier[] {
  const envOverride = process.env.PADDLE_PRICE_IDS;
  if (envOverride) {
    try {
      const parsed = JSON.parse(envOverride) as Tier[];
      // 合并默认功能列表（环境变量只覆盖 priceId）
      return parsed.map((tier) => {
        const defaults = DEFAULT_TIERS.find((d) => d.name === tier.name);
        return {
          ...defaults,
          ...tier,
          features: tier.features ?? defaults?.features ?? [],
        };
      });
    } catch {
      console.warn('[paddle-tiers] Failed to parse PADDLE_PRICE_IDS, using defaults');
    }
  }
  return DEFAULT_TIERS;
}

/** 获取单个层级的价格 ID */
export function getTierPriceId(
  tierName: Tier['name'],
  interval: 'month' | 'year',
): string | null {
  const tier = getTiers().find((t) => t.name === tierName);
  return tier?.priceId[interval] ?? null;
}
