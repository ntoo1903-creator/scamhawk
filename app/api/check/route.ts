import { NextRequest, NextResponse } from 'next/server';
import { classifyEntity } from '@/lib/validation';
import { lookupEntity } from '@/lib/chainabuse';
import { prisma } from '@/lib/prisma';
import { getClerkUserId } from '@/lib/auth';
import { canCheck, incrementDailyCheckCount } from '@/lib/rate-limit';
import { hasProAccess } from '@/lib/paddle';

export const runtime = 'nodejs';

/**
 * POST /api/check
 * body: { value: string } —— 钱包地址或网址
 *
 * 返回归一化的查询结果；登录用户会额外写入查询历史。
 * 免费版用户每日限制 10 次查询，专业版用户无限制。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.value === 'string' ? body.value : '';

  const entity = classifyEntity(raw);
  if (!entity.valid) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    // 检查登录状态和订阅情况
    const clerkId = await getClerkUserId();
    let isPro = false;
    let checkLimit = null;

    if (clerkId) {
      isPro = await hasProAccess(clerkId);

      // 免费版用户检查每日限制
      if (!isPro) {
        checkLimit = await canCheck(clerkId);
        if (!checkLimit.allowed) {
          return NextResponse.json(
            {
              error: 'DAILY_LIMIT_EXCEEDED',
              limit: checkLimit.limit,
              remaining: 0,
            },
            { status: 429 },
          );
        }
      }
    }

    const result = await lookupEntity(entity.value, entity.type);

    // 登录用户记录查询历史并更新计数
    try {
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

        // 免费版用户更新今日查询计数
        if (!isPro) {
          const newCount = await incrementDailyCheckCount(clerkId);
          const remaining = Math.max(0, (checkLimit?.limit ?? 10) - newCount);
          return NextResponse.json(
            { result, usage: { used: newCount, limit: 10, remaining } },
            { headers: { 'Cache-Control': 'public, max-age=3600' } },
          );
        }
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
