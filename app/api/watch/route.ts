import { NextRequest, NextResponse } from 'next/server';
import { classifyEntity } from '@/lib/validation';
import { lookupEntity } from '@/lib/chainabuse';
import { prisma } from '@/lib/prisma';
import { getClerkUserId } from '@/lib/auth';

export const runtime = 'nodejs';

/** 添加监控项（登录用户） */
export async function POST(req: NextRequest) {
  const clerkId = await getClerkUserId();
  if (!clerkId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw = typeof body?.value === 'string' ? body.value : '';
  const entity = classifyEntity(raw);

  if (!entity.valid) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  const result = await lookupEntity(entity.value, entity.type);

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId },
  });

  const item = await prisma.watchItem.upsert({
    where: {
      userId_type_value: {
        userId: user.id,
        type: entity.type,
        value: entity.value,
      },
    },
    update: {
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      reportCount: result.reportCount,
      categories: result.categories,
      lastCheckedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
    create: {
      userId: user.id,
      type: entity.type,
      value: entity.value,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      reportCount: result.reportCount,
      categories: result.categories,
      lastCheckedAt: new Date(),
      nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

/** 移除监控项（登录用户） */
export async function DELETE(req: NextRequest) {
  const clerkId = await getClerkUserId();
  if (!clerkId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const value = typeof body?.value === 'string' ? body.value.trim() : '';

  if (!value) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  await prisma.watchItem.deleteMany({
    where: { value, user: { clerkId } },
  });

  return NextResponse.json({ ok: true });
}
