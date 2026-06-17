import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { recordGoogleLogin } from '@/server/repositories/admin-login-records-repository';

function allowedEmails() {
  return (process.env.AUTH_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function allowedDomain() {
  return process.env.AUTH_ALLOWED_DOMAIN?.trim().toLowerCase();
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

      const emails = allowedEmails();
      if (emails.length > 0 && !emails.includes(email)) return false;

      const domain = allowedDomain();
      if (domain && !email.endsWith(`@${domain}`)) return false;

      await recordGoogleLogin({
        name: typeof profile?.name === 'string' ? profile.name : null,
        email,
      });
      return true;
    },
  },
});
