import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lookupEntity } from '@/lib/chainabuse';
import { isEmailConfigured, sendRiskChangeEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 与 vercel.json 中的 cron 频率一致（每 6 小时）
const RETRY_INTERVAL_MS = 60 * 60 * 1000; // 查询失败后 1 小时重试
const BATCH_SIZE = 50;

/**
 * GET /api/cron/watch（由 Vercel Cron 调用，见 vercel.json）
 * 请求头必须携带：Authorization: Bearer <CRON_SECRET>
 *
 * 复查 nextCheckAt 已到期（或从未检查）的监控项，更新风险信息，
 * 并在风险等级变化时发送邮件通知。
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
    include: { user: { select: { email: true } } },
  });

  let updated = 0;
  let notified = 0;

  for (const item of due) {
    try {
      const result = await lookupEntity(item.value, item.type);
      const riskChanged = result.riskLevel !== item.riskLevel;

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

      // 风险等级变化时发送邮件通知
      if (riskChanged && isEmailConfigured() && item.user.email) {
        const sent = await sendRiskChangeEmail({
          to: item.user.email,
          entityValue: item.value,
          entityType: item.type,
          oldRisk: item.riskLevel,
          newRisk: result.riskLevel,
          reportCount: result.reportCount,
          categories: result.categories,
        });
        if (sent) notified += 1;
      }
    } catch (err) {
      console.error(`[cron] recheck failed for ${item.value}:`, err);
      // 暂时推迟失败项，避免下次 Cron 继续反复扫描同一批失败项目。
      await prisma.watchItem
        .update({
          where: { id: item.id },
          data: { nextCheckAt: new Date(Date.now() + RETRY_INTERVAL_MS) },
        })
        .catch((updateErr) => {
          console.error(`[cron] failed to schedule retry for ${item.value}:`, updateErr);
        });
    }
  }

  return NextResponse.json({ scanned: due.length, updated, notified });
}
