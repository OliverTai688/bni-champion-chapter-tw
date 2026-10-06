import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/db/prisma';

export const LOGIN_LINK_TTL_DAYS = 14;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a one-time login link for a member. Returns the raw token, which is
 * never stored: only its hash is. Older unused links of the member stop working.
 */
export async function issueMemberLoginLink(memberId: string, createdBy: string | null) {
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, isActive: true, category: true, displayName: true } });
  if (!member || !member.isActive || member.category !== 'member') throw new Error('只能替在籍會員產生登入連結。');

  const now = new Date();
  await prisma.memberLoginLink.updateMany({ where: { memberId, usedAt: null }, data: { usedAt: now } });

  const token = randomBytes(24).toString('base64url');
  await prisma.memberLoginLink.create({
    data: {
      memberId,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + LOGIN_LINK_TTL_DAYS * 86_400_000),
      createdBy,
    },
  });
  return { token, displayName: member.displayName };
}

/** Consumes a login link. Returns the member id, or throws a message the member can act on. */
export async function redeemMemberLoginLink(token: string) {
  if (!token || token.length < 20) throw new Error('登入連結不完整，請向幹部重新索取。');
  const link = await prisma.memberLoginLink.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!link) throw new Error('這個登入連結無效，請向幹部重新索取。');
  if (link.usedAt) throw new Error('這個登入連結已經用過了。換手機登入請向幹部重新索取。');
  if (link.expiresAt.getTime() < Date.now()) throw new Error('這個登入連結已過期，請向幹部重新索取。');

  // Mark used first so two taps on the same link cannot both log in.
  const claimed = await prisma.memberLoginLink.updateMany({ where: { id: link.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) throw new Error('這個登入連結已經用過了。');

  const member = await prisma.member.findUnique({ where: { id: link.memberId }, select: { id: true, isActive: true, displayName: true } });
  if (!member?.isActive) throw new Error('這位會員目前停用中，請聯絡幹部。');
  return member;
}
