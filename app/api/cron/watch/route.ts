import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lookupEntity } from '@/lib/chainabuse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 与 vercel.json 中的 cron 频率一致
const BATCH_SIZE = 50;

/**
 * GET /api/cron/watch（由 Vercel Cron 调用，见 vercel.json）
 * 请求头必须携带：Authorization: Bearer <CRON_SECRET>
 *
 * 复查 nextCheckAt 已到期（或从未检查）的监控项，并更新风险信息。
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get('authorization');

  if (!expected || actual !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const due = await prisma.watchItem.findMany({
    where: {
      OR: [{ nextCheckAt: { lte: new Date() } }, { nextCheckAt: null }],
    },
    take: BATCH_SIZE,
    orderBy: { nextCheckAt: 'asc' },
  });

  let updated = 0;
  for (const item of due) {
    try {
      const result = await lookupEntity(item.value, item.type);
      await prisma.watchItem.update({
        where: { id: item.id },
        data: {
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          reportCount: result.reportCount,
          categories: result.categories,
          lastCheckedAt: new Date(),
          nextCheckAt: new Date(Date.now() + CHECK_INTERVAL_MS),
        },
      });
      updated += 1;
    } catch (err) {
      console.error(`[cron] recheck failed for ${item.value}:`, err);
    }
  }

  return NextResponse.json({ scanned: due.length, updated });
}
