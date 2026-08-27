import { NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth';
import { isPaddleCheckoutConfigured, paddleEnvironment } from '@/lib/paddle';

export const dynamic = 'force-dynamic';

/**
 * GET /api/paddle/config —— 返回前端下单（Paddle Checkout Overlay）所需配置。
 *
 * - 未配置 Paddle 下单 → 200 { configured: false }（按钮显示禁用态）
 * - 未登录 → 401（订阅必须绑定到用户）
 * - 已登录且已配置 → 200 { configured: true, environment, clientToken, priceId }
 *
 * clientToken 是 Paddle 的客户端 token（pdl_client_ 开头），设计上允许暴露给前端。
 */
export async function GET() {
  if (!isPaddleCheckoutConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const clerkId = await getClerkUserId();
  if (!clerkId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json({
    configured: true,
    environment: paddleEnvironment(),
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    priceId: process.env.PADDLE_PRICE_ID_PRO_MONTHLY!,
  });
}
