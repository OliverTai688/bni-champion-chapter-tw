import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { recordGoogleLogin } from '@/server/repositories/admin-login-records-repository';

const BUILT_IN_OWNER_EMAILS = ['taioliver688@gmail.com'];
const LOGIN_RECORD_TIMEOUT_MS = 2500;

function allowedEmails() {
  return (process.env.AUTH_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function allowedDomains() {
  return (process.env.AUTH_ALLOWED_DOMAIN ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

function isAllowedEmail(email: string) {
  if (BUILT_IN_OWNER_EMAILS.includes(email)) return true;

  const emails = allowedEmails();
  const domains = allowedDomains();
  if (domains.length === 0 && emails.length === 0) return true;
  if (emails.includes(email)) return true;

  return domains.some((domain) => email.endsWith(`@${domain}`));
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
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      if (!isAllowedEmail(email)) return false;

      await recordGoogleLoginSafely({
        name: typeof profile?.name === 'string' ? profile.name : null,
        email,
      });
      return true;
    },
  },
});
