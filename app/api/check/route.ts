import { NextRequest, NextResponse } from 'next/server';
import { classifyEntity } from '@/lib/validation';
import { lookupEntity } from '@/lib/chainabuse';
import { prisma } from '@/lib/prisma';
import { getClerkUserId } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/check
 * body: { value: string } —— 钱包地址或网址
 *
 * 返回归一化的查询结果；登录用户会额外写入查询历史。
 * 注意：生产环境建议补充 IP 限流（如 Upstash Ratelimit）。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.value === 'string' ? body.value : '';

  const entity = classifyEntity(raw);
  if (!entity.valid) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    const result = await lookupEntity(entity.value, entity.type);

    // 登录用户记录查询历史（失败不影响主流程）
    try {
      const clerkId = await getClerkUserId();
      if (clerkId) {
        const user = await prisma.user.upsert({
          where: { clerkId },
          update: {},
          create: { clerkId },
        });
        await prisma.checkRecord.create({
          data: {
            userId: user.id,
            type: entity.type,
            value: entity.value,
            riskLevel: result.riskLevel,
            riskScore: result.riskScore,
            reportCount: result.reportCount,
            details: result.raw as object | undefined,
          },
        });
      }
    } catch (err) {
      console.error('[check] failed to record history:', err);
    }

    return NextResponse.json(
      { result },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  } catch (err) {
    console.error('[check] lookup failed:', err);
    return NextResponse.json(
      { error: 'LOOKUP_FAILED' },
      { status: 502 },
    );
  }
}
