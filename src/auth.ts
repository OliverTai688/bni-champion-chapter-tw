import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

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
      if (emails.length > 0) return emails.includes(email);

      const domain = allowedDomain();
      if (domain) return email.endsWith(`@${domain}`);

      return true;
    },
  },
});
