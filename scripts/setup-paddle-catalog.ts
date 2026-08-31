/**
 * Paddle 商品目录初始化脚本
 *
 * 用法：npx tsx scripts/setup-paddle-catalog.ts
 *
 * 在 Paddle 账户中创建：
 * - Starter（$10/月, $100/年）
 * - Pro（$40/月, $400/年）
 * - Advanced（$120/月, $1200/年）
 *
 * 所有计划包含 7 天免费试用。
 * 包含 UK(GBP)、Ireland(EUR)、Australia(AUD) 国家价格覆盖。
 */

import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_ENV = process.env.PADDLE_ENVIRONMENT === 'live' ? Environment.production : Environment.sandbox;

if (!PADDLE_API_KEY) {
  console.error('❌ PADDLE_API_KEY 未配置，请先在 .env.local 中设置');
  process.exit(1);
}

const paddle = new Paddle(PADDLE_API_KEY, { environment: PADDLE_ENV });

// ── 产品定义 ──────────────────────────────────────

interface ProductPlan {
  name: string;
  description: string;
  monthlyUSD: string;   // Paddle 最小单位（分），如 "1000" = $10.00
  annualUSD: string;    // 年付总价（分）
  // 国家价格覆盖（当地货币，最小单位）
  overrides: {
    countryCodes: string[];
    monthly: string;
    annual: string;
    currencyCode: string;
  }[];
}

const PLANS: ProductPlan[] = [
  {
    name: 'Starter',
    description: 'ScamHawk Starter plan — basic risk checks with priority support',
    monthlyUSD: '1000',   // $10.00
    annualUSD: '10000',   // $100.00
    overrides: [
      { countryCodes: ['GB'], monthly: '800',  annual: '8000',  currencyCode: 'GBP' },   // ~£8/月, ~£80/年
      { countryCodes: ['IE'], monthly: '950',  annual: '9500',  currencyCode: 'EUR' },   // ~€9.50/月, ~€95/年
      { countryCodes: ['AU'], monthly: '1500', annual: '15000', currencyCode: 'AUD' },   // ~A$15/月, ~A$150/年
    ],
  },
  {
    name: 'Pro',
    description: 'ScamHawk Pro plan — unlimited checks, monitoring, and email alerts',
    monthlyUSD: '4000',   // $40.00
    annualUSD: '40000',   // $400.00
    overrides: [
      { countryCodes: ['GB'], monthly: '3200', annual: '32000', currencyCode: 'GBP' },   // ~£32/月, ~£320/年
      { countryCodes: ['IE'], monthly: '3800', annual: '38000', currencyCode: 'EUR' },   // ~€38/月, ~€380/年
      { countryCodes: ['AU'], monthly: '6000', annual: '60000', currencyCode: 'AUD' },   // ~A$60/月, ~A$600/年
    ],
  },
  {
    name: 'Advanced',
    description: 'ScamHawk Advanced plan — API access, team features, and dedicated support',
    monthlyUSD: '12000',  // $120.00
    annualUSD: '120000',  // $1200.00
    overrides: [
      { countryCodes: ['GB'], monthly: '9600',  annual: '96000',  currencyCode: 'GBP' },   // ~£96/月, ~£960/年
      { countryCodes: ['IE'], monthly: '11400', annual: '114000', currencyCode: 'EUR' },   // ~€114/月, ~€1140/年
      { countryCodes: ['AU'], monthly: '18000', annual: '180000', currencyCode: 'AUD' },   // ~A$180/月, ~A$1800/年
    ],
  },
];

// ── 创建函数 ──────────────────────────────────────

async function createCatalog() {
  console.log(`\n🚀 开始创建 Paddle 商品目录（${PADDLE_ENV === Environment.production ? 'Live' : 'Sandbox'}）\n`);

  const results: Record<string, { productId: string; monthlyPriceId: string; annualPriceId: string }> = {};

  for (const plan of PLANS) {
    console.log(`\n── 创建产品：${plan.name} ──`);

    // 1. 创建产品
    const product = await paddle.products.create({
      name: plan.name,
      description: plan.description,
      taxCategory: 'saas',
    });
    console.log(`  ✅ 产品已创建：${product.id}`);

    // 2. 创建月度价格（含 7 天试用）
    const monthlyPrice = await paddle.prices.create({
      name: `${plan.name} Monthly`,
      description: `${plan.name} monthly subscription`,
      productId: product.id,
      unitPrice: { amount: plan.monthlyUSD, currencyCode: 'USD' },
      billingCycle: { interval: 'month', frequency: 1 },
      trialPeriod: { interval: 'day', frequency: 7 },
      taxMode: 'account_setting',
      unitPriceOverrides: plan.overrides.map((o) => ({
        countryCodes: o.countryCodes,
        unitPrice: { amount: o.monthly, currencyCode: o.currencyCode as any },
      })),
    });
    console.log(`  ✅ 月度价格：${monthlyPrice.id} — $${parseInt(plan.monthlyUSD) / 100}/月 + 7天试用`);

    // 3. 创建年度价格（含 7 天试用）
    const annualPrice = await paddle.prices.create({
      name: `${plan.name} Annual`,
      description: `${plan.name} annual subscription (save ~17%)`,
      productId: product.id,
      unitPrice: { amount: plan.annualUSD, currencyCode: 'USD' },
      billingCycle: { interval: 'year', frequency: 1 },
      trialPeriod: { interval: 'day', frequency: 7 },
      taxMode: 'account_setting',
      unitPriceOverrides: plan.overrides.map((o) => ({
        countryCodes: o.countryCodes,
        unitPrice: { amount: o.annual, currencyCode: o.currencyCode as any },
      })),
    });
    console.log(`  ✅ 年度价格：${annualPrice.id} — $${parseInt(plan.annualUSD) / 100}/年 + 7天试用`);

    results[plan.name] = {
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      annualPriceId: annualPrice.id,
    };
  }

  // ── 输出汇总 ──────────────────────────────────────

  console.log('\n\n═══════════════════════════════════════════════');
  console.log('  Paddle 商品目录创建完成');
  console.log('═══════════════════════════════════════════════\n');

  console.log('产品 ID 映射：');
  console.log('─'.repeat(60));
  for (const [name, ids] of Object.entries(results)) {
    console.log(`\n  ${name}`);
    console.log(`    产品 ID:     ${ids.productId}`);
    console.log(`    月度价格 ID: ${ids.monthlyPriceId}`);
    console.log(`    年度价格 ID: ${ids.annualPriceId}`);
  }

  console.log('\n\n📋 需要写入 .env.local 的变量：');
  console.log('─'.repeat(60));

  // 默认使用 Pro 计划的月度价格作为应用内默认订阅
  const proMonthly = results['Pro'].monthlyPriceId;
  console.log(`\n  PADDLE_PRICE_ID_PRO_MONTHLY="${proMonthly}"`);

  console.log('\n\n💡 提示：');
  console.log('  - 在 Paddle Dashboard → Settings → Checkout 生成 Client Token');
  console.log('  - 将 NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="pdl_client_..." 写入 .env.local');

  return results;
}

createCatalog().catch((err) => {
  console.error('\n❌ 创建失败：', err.message || err);
  if (err.response) {
    console.error('  HTTP 状态码:', err.response.status);
    console.error('  响应内容:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
