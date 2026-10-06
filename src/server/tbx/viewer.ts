import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { findMemberByEmail, findMemberByLine, getGoogleIdentity, getLeaderAccess, getLineIdentity } from '@/server/auth/access';
import { sign as signValue } from '@/server/auth/secrets';
import { prisma } from '@/server/db/prisma';

export const MEMBER_COOKIE = 'tbx-member';
export const MEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function sign(memberId: string) {
  return signValue('member-session', memberId).slice(0, 32);
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
  /** Verified member identity: a bound LINE account, a Google account whose e-mail matches, or a leader-issued login link. */
  member: { id: string; displayName: string; industry: string | null; adminGroup: string | null } | null;
  /** Leadership roles whose term covers today. */
  activeRoles: string[];
}

export async function isLeader() {
  return Boolean(await getLeaderAccess());
}

async function resolveMemberId() {
  const cookieStore = await cookies();
  const fromCookie = readMemberToken(cookieStore.get(MEMBER_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  const line = await getLineIdentity();
  if (line) return (await findMemberByLine(line.subject))?.id ?? null;
  const google = await getGoogleIdentity();
  if (!google) return null;
  return (await findMemberByEmail(google.email))?.id ?? null;
}

export async function getViewer(): Promise<Viewer> {
  const access = await getLeaderAccess();
  const leader = Boolean(access);

  const memberId = await resolveMemberId();
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
        where: { memberId: record.id, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { isSet: false } }, { endsAt: { gte: now } }] },
        select: { role: true },
      });
      activeRoles = terms.map((term) => term.role);
    }
  }

  return {
    leader,
    leaderName: access?.name ?? null,
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
  if (!viewer.member) throw new Error('請先登入會員身份。');
  return viewer as Viewer & { member: NonNullable<Viewer['member']> };
}
