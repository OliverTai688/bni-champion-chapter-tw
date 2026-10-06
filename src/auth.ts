import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAllowlistedLeaderEmail } from '@/server/auth/allowlist';
import { prisma } from '@/server/db/prisma';
import { recordGoogleLogin } from '@/server/repositories/admin-login-records-repository';

const LOGIN_RECORD_TIMEOUT_MS = 2500;

/**
 * Google sign-in is open to allowlisted leaders and to active members whose
 * e-mail is on file. Everyone else is refused, even when the allowlist is empty.
 */
async function canSignIn(email: string) {
  if (isAllowlistedLeaderEmail(email)) return true;
  const member = await prisma.member
    .findFirst({ where: { isActive: true, email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    .catch(() => null);
  return Boolean(member);
}

async function recordGoogleLoginSafely(user: { name?: string | null; email?: string | null }) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(`[auth] google login record timed out after ${LOGIN_RECORD_TIMEOUT_MS}ms`);
      resolve();
    }, LOGIN_RECORD_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      recordGoogleLogin(user),
      timeout,
    ]);
  } catch (error) {
    console.error('[auth] failed to record google login', error);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  pages: {
    // Refused sign-ins land on the member login page with ?error=AccessDenied.
    error: '/login',
  },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      if (!(await canSignIn(email))) return false;

      await recordGoogleLoginSafely({
        name: typeof profile?.name === 'string' ? profile.name : null,
        email,
      });
      return true;
    },
  },
});
