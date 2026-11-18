import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Line from 'next-auth/providers/line';
import { verifyLineIdToken } from '@/server/auth/liff';
import { isAllowlistedLeaderEmail, isGoogleConsoleOpen } from '@/server/auth/allowlist';
import { prisma } from '@/server/db/prisma';
import { recordGoogleLogin } from '@/server/repositories/admin-login-records-repository';

const LOGIN_RECORD_TIMEOUT_MS = 2500;

/**
 * Any Google account may sign in while the console is open (see isGoogleConsoleOpen).
 * Restricted: allowlisted leaders and active members whose e-mail is on file only.
 */
async function canSignIn(email: string) {
  if (isGoogleConsoleOpen()) return true;
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

/** LINE is offered only when its channel is configured (AUTH_LINE_ID / AUTH_LINE_SECRET). */
export const LINE_LOGIN_ENABLED = Boolean(process.env.AUTH_LINE_ID && process.env.AUTH_LINE_SECRET);

/**
 * Inside LINE (LIFF) the page hands over LINE's ID token instead of running the OAuth redirect.
 * The token is verified with LINE on the server; the session that comes out is a LINE session.
 */
const Liff = Credentials({
  id: 'liff',
  name: 'LINE (LIFF)',
  credentials: { idToken: {} },
  async authorize(credentials) {
    const claims = await verifyLineIdToken(credentials?.idToken);
    return claims ? { id: claims.sub, name: claims.name } : null;
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: LINE_LOGIN_ENABLED ? [Google, Line, Liff] : [Google],
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  pages: {
    // Refused sign-ins land on the member login page with ?error=AccessDenied.
    error: '/login',
  },
  callbacks: {
    async signIn({ account, profile }) {
      // Any LINE account may sign in: the member binds it to their name on first login,
      // and an unbound LINE account sees nothing but the binding step.
      if (account?.provider === 'line' || account?.provider === 'liff') return Boolean(account.providerAccountId);

      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      if (!(await canSignIn(email))) return false;

      await recordGoogleLoginSafely({
        name: typeof profile?.name === 'string' ? profile.name : null,
        email,
      });
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        // A LIFF login is a LINE login: same user id, same binding, same leader check.
        token.provider = account.provider === 'liff' ? 'line' : account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        provider: typeof token.provider === 'string' ? token.provider : undefined,
        providerAccountId: typeof token.providerAccountId === 'string' ? token.providerAccountId : undefined,
      };
    },
  },
});
