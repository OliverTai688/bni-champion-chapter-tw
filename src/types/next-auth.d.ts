import 'next-auth';

declare module 'next-auth' {
  interface Session {
    /** Sign-in provider of this session, e.g. `google` or `line`. */
    provider?: string;
    /** The provider's stable user id (LINE `sub`, Google `sub`). */
    providerAccountId?: string;
  }
}
