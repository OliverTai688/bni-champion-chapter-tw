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

export const getGoogleIdentity = cache(async (): Promise<GoogleIdentity | null> => {
  const session = await auth().catch(() => null);
  const email = normalizeEmail(session?.user?.email);
  if (!email) return null;
  return { email, name: session?.user?.name ?? null };
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
  via: 'password' | 'google';
  name: string;
  email: string | null;
}

/**
 * The one leadership check for pages, Server Actions and route handlers:
 * the admin password cookie, or a Google account that is allowlisted or holds a current leadership term.
 */
export const getLeaderAccess = cache(async (): Promise<LeaderAccess | null> => {
  const google = await getGoogleIdentity();
  if (google && (await isLeaderEmail(google.email))) {
    return { via: 'google', name: google.name ?? google.email, email: google.email };
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
    { error: 'unauthorized', message: '需要領導團隊權限：請用後台密碼或已授權的 Google 帳號登入。' },
    { status: 401 },
  );
}
