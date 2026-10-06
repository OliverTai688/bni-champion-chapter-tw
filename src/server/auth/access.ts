import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { LEADERSHIP_ROLES } from '@/lib/tbx/labels';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import { isAllowlistedLeaderEmail, normalizeEmail } from '@/server/auth/allowlist';
import { prisma } from '@/server/db/prisma';

export interface GoogleIdentity {
  email: string;
  name: string | null;
}

export interface LineIdentity {
  subject: string;
  name: string | null;
}

const getSession = cache(async () => auth().catch(() => null));

export const getGoogleIdentity = cache(async (): Promise<GoogleIdentity | null> => {
  const session = await getSession();
  // Sessions issued before the provider was recorded are Google sessions.
  if (session?.provider && session.provider !== 'google') return null;
  const email = normalizeEmail(session?.user?.email);
  if (!email) return null;
  return { email, name: session?.user?.name ?? null };
});

export const getLineIdentity = cache(async (): Promise<LineIdentity | null> => {
  const session = await getSession();
  if (session?.provider !== 'line' || !session.providerAccountId) return null;
  return { subject: session.providerAccountId, name: session.user?.name ?? null };
});

/** The active member a LINE account is bound to, if any. */
export const findMemberByLine = cache(async (subject: string) => {
  const identity = await prisma.memberIdentity
    .findUnique({ where: { provider_subject: { provider: 'line', subject } }, select: { memberId: true } })
    .catch(() => null);
  if (!identity) return null;
  return prisma.member
    .findFirst({ where: { id: identity.memberId, isActive: true }, select: { id: true, displayName: true } })
    .catch(() => null);
});

/** The active member whose e-mail matches the Google account, if any. */
export const findMemberByEmail = cache(async (email: string) => {
  return prisma.member
    .findFirst({
      where: { isActive: true, email: { equals: email, mode: 'insensitive' } },
      select: { id: true, displayName: true },
    })
    .catch(() => null);
});

/** Leadership through a role term that covers today, for members whose Google e-mail is on file. */
async function hasActiveLeadershipTerm(memberId: string) {
  const now = new Date();
  const term = await prisma.roleTerm
    .findFirst({
      where: {
        memberId,
        role: { in: [...LEADERSHIP_ROLES] },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { id: true },
    })
    .catch(() => null);
  return Boolean(term);
}

export const isLeaderEmail = cache(async (email: string) => {
  if (isAllowlistedLeaderEmail(email)) return true;
  const member = await findMemberByEmail(email);
  return member ? hasActiveLeadershipTerm(member.id) : false;
});

export interface LeaderAccess {
  via: 'password' | 'google' | 'line';
  name: string;
  email: string | null;
}

/**
 * The one leadership check for pages, Server Actions and route handlers:
 * the admin password cookie, a Google account that is allowlisted or holds a current leadership term,
 * or a LINE account bound to a member who holds a current leadership term.
 */
export const getLeaderAccess = cache(async (): Promise<LeaderAccess | null> => {
  const google = await getGoogleIdentity();
  if (google && (await isLeaderEmail(google.email))) {
    return { via: 'google', name: google.name ?? google.email, email: google.email };
  }
  const line = await getLineIdentity();
  if (line) {
    const member = await findMemberByLine(line.subject);
    if (member && (await hasActiveLeadershipTerm(member.id))) {
      return { via: 'line', name: member.displayName, email: null };
    }
  }
  const cookieStore = await cookies();
  if (verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value)) {
    return { via: 'password', name: '領導團隊', email: null };
  }
  return null;
});

export async function hasLeaderAccess() {
  return Boolean(await getLeaderAccess());
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'unauthorized', message: '需要領導團隊權限：請用後台密碼、已授權的 Google 帳號或已綁定幹部的 LINE 登入。' },
    { status: 401 },
  );
}
