/**
 * LINE's in-app browser (which also hosts LIFF pages) puts `Line/<version>` in its user agent.
 * Google refuses OAuth inside embedded browsers, so pages hide Google sign-in there.
 */
export function isLineInAppBrowser(userAgent: string | null | undefined) {
  return Boolean(userAgent && /\bLine\/\d/i.test(userAgent));
}

/** Set at build time; empty means LIFF auto-login is off. */
export const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? '';
