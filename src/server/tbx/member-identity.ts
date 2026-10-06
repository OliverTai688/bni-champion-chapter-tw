import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';

/** Active chapter members who have not bound a LINE account yet: the choices on first LINE login. */
export async function listUnboundLineMembers() {
  const [members, bound] = await Promise.all([
    prisma.member.findMany({
      where: { isActive: true, category: 'member' },
      select: { id: true, displayName: true, adminGroup: true },
      orderBy: { displayName: 'asc' },
    }),
    prisma.memberIdentity.findMany({ where: { provider: 'line' }, select: { memberId: true } }),
  ]);
  const boundIds = new Set(bound.map((row) => row.memberId));
  return members.filter((member) => !boundIds.has(member.id));
}

/**
 * Binds a LINE account to a member on that account's first login.
 * A member can be claimed once; a leader resets a wrong binding from the member page.
 */
export async function bindLineAccount(input: { subject: string; lineName: string | null; memberId: string }) {
  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    select: { id: true, displayName: true, isActive: true, category: true },
  });
  if (!member || !member.isActive || member.category !== 'member') throw new Error('找不到這位會員，請重新選擇。');

  try {
    await prisma.memberIdentity.create({
      data: { provider: 'line', subject: input.subject, memberId: member.id, displayName: input.lineName },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const mine = await prisma.memberIdentity.findUnique({
        where: { provider_subject: { provider: 'line', subject: input.subject } },
        select: { memberId: true },
      });
      if (mine) throw new Error('這個 LINE 帳號已經綁定過會員了，請重新整理頁面。');
      throw new Error(`「${member.displayName}」已經綁定其他 LINE 帳號。如果那不是你，請聯絡幹部解除綁定。`);
    }
    throw error;
  }
  return member;
}

export async function getLineBinding(memberId: string) {
  return prisma.memberIdentity.findUnique({
    where: { provider_memberId: { provider: 'line', memberId } },
    select: { id: true, displayName: true, createdAt: true },
  });
}

export async function unbindLineAccount(memberId: string) {
  const result = await prisma.memberIdentity.deleteMany({ where: { provider: 'line', memberId } });
  if (result.count === 0) throw new Error('這位會員沒有綁定 LINE。');
}
