import { NextRequest, NextResponse } from 'next/server';
import { getTiers } from '@/lib/paddle-tiers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/paddle/prices?interval=month|year&country=US
 *
 * 服务端调用 Paddle Price Preview API，返回格式化后的价格字符串。
 * 客户端绝不直接访问 Paddle API key。
 *
 * country 参数可选：
 *   - 传入时强制使用该国家的价格
 *   - 不传时 Paddle 根据请求 IP 自动定位（服务端用 x-vercel-ip-country 头）
 */

interface PaddlePricePreviewResponse {
  data: {
    price: {
      id: string;
      unitPrice: { amount: string; currencyCode: string };
      formattedUnitPrice: string;
      taxRate: string | null;
    };
    totals: {
      subtotal: string;
      tax: string;
      total: string;
      currencyCode: string;
    };
    formattedTotals: {
      subtotal: string;
      tax: string;
      total: string;
    };
    adjustment?: {
      adjustedTotals: { subtotal: string; tax: string; total: string };
      formattedAdjustedTotals: { subtotal: string; tax: string; total: string };
    };
  };
}

interface PriceResult {
  priceId: string;
  formattedTotal: string;     // 客户端只展示这个，不做任何格式化
  formattedSubtotal: string;
  formattedTax: string;
  currencyCode: string;
}

interface PricesResponse {
  configured: boolean;
  prices: Record<string, PriceResult>;  // key: "tierName-interval"
}

async function previewPrice(
  priceId: string,
  country?: string,
): Promise<PriceResult | null> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return null;

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
    next: { revalidate: 300 }, // 5 分钟缓存
  });

  if (!res.ok) {
    console.error(`[paddle/prices] Price preview failed for ${priceId}: ${res.status}`);
    return null;
  }

  const data: PaddlePricePreviewResponse = await res.json();
  const d = data.data;

  // 优先使用调整后的价格（如果存在国家覆盖）
  const totals = d.adjustment?.adjustedTotals ?? d.totals;
  const formattedTotals = d.adjustment?.formattedAdjustedTotals ?? d.formattedTotals;

  return {
    priceId: d.price.id,
    formattedTotal: formattedTotals.total,
    formattedSubtotal: formattedTotals.subtotal,
    formattedTax: formattedTotals.tax,
    currencyCode: totals.currencyCode,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const interval = searchParams.get('interval') as 'month' | 'year';
  const country = searchParams.get('country') ?? undefined;

  if (!interval || !['month', 'year'].includes(interval)) {
    return NextResponse.json(
      { error: 'Invalid interval. Must be "month" or "year".' },
      { status: 400 },
    );
  }

  if (!process.env.PADDLE_API_KEY) {
    return NextResponse.json({ configured: false, prices: {} });
  }

  const tiers = getTiers();
  const prices: Record<string, PriceResult> = {};

  // 并行获取所有价格
  const entries = tiers.map(async (tier) => {
    const priceId = tier.priceId[interval];
    const result = await previewPrice(priceId, country);
    if (result) {
      prices[`${tier.name}-${interval}`] = result;
    }
  });

  await Promise.all(entries);

  return NextResponse.json({
    configured: true,
    prices,
  } satisfies PricesResponse);
}
