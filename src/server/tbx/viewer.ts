import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import { prisma } from '@/server/db/prisma';

export const MEMBER_COOKIE = 'tbx-member';

function memberSecret() {
  return process.env.AUTH_SECRET ?? 'local-tbx-member';
}

function sign(memberId: string) {
  return createHmac('sha256', memberSecret()).update(memberId).digest('hex').slice(0, 32);
}

export function createMemberToken(memberId: string) {
  return `${memberId}.${sign(memberId)}`;
}

function readMemberToken(value: string | undefined) {
  if (!value) return null;
  const [memberId, signature] = value.split('.');
  if (!memberId || !signature) return null;
  const expected = Buffer.from(sign(memberId));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return memberId;
}

export interface Viewer {
  /** Leadership access: Google sign-in or the admin access cookie (same rule as the existing write APIs). */
  leader: boolean;
  leaderName: string | null;
  /** Member identity chosen on /login. Interim: not verified against a real login yet. */
  member: { id: string; displayName: string; industry: string | null; adminGroup: string | null } | null;
  /** Leadership roles whose term covers today. Informational until member login is verified. */
  activeRoles: string[];
}

export async function isLeader() {
  const cookieStore = await cookies();
  if (verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value)) return true;
  const session = await auth();
  return Boolean(session?.user);
}

export async function getViewer(): Promise<Viewer> {
  const cookieStore = await cookies();
  const session = await auth();
  const adminCookie = verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);
  const leader = adminCookie || Boolean(session?.user);

  const memberId = readMemberToken(cookieStore.get(MEMBER_COOKIE)?.value);
  let member: Viewer['member'] = null;
  let activeRoles: string[] = [];

  if (memberId) {
    const record = await prisma.member
      .findUnique({
        where: { id: memberId },
        select: { id: true, displayName: true, industry: true, adminGroup: true, isActive: true },
      })
      .catch(() => null);

    if (record?.isActive) {
      member = {
        id: record.id,
        displayName: record.displayName,
        industry: record.industry,
        adminGroup: record.adminGroup,
      };
      const now = new Date();
      const terms = await prisma.roleTerm.findMany({
        where: { memberId: record.id, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        select: { role: true },
      });
      activeRoles = terms.map((term) => term.role);
    }
  }

  return {
    leader,
    leaderName: session?.user?.name ?? (adminCookie ? '領導團隊' : null),
    member,
    activeRoles,
  };
}

/** Use inside every leadership Server Action and route handler. */
export async function requireLeader() {
  const viewer = await getViewer();
  if (!viewer.leader) throw new Error('需要領導團隊權限，請先登入後台。');
  return viewer;
}

export async function requireMember() {
  const viewer = await getViewer();
  if (!viewer.member) throw new Error('請先選擇你的會員身份。');
  return viewer as Viewer & { member: NonNullable<Viewer['member']> };
}
