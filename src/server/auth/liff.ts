import 'server-only';

const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const VERIFY_TIMEOUT_MS = 5000;

export interface LineIdTokenClaims {
  sub: string;
  name: string | null;
}

/**
 * Verifies a LIFF ID token with LINE. The LIFF app lives under the LINE Login channel,
 * so the token's audience is AUTH_LINE_ID and its `sub` is the same LINE user id that
 * LINE Login gives: a LIFF login and a LINE Login resolve to the same MemberIdentity.
 * Returns null for anything LINE does not accept. The token itself is never stored or logged.
 */
export async function verifyLineIdToken(idToken: unknown): Promise<LineIdTokenClaims | null> {
  const clientId = process.env.AUTH_LINE_ID;
  if (!clientId || typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 4096) return null;

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const claims = (await response.json()) as { sub?: unknown; aud?: unknown; name?: unknown };
    if (typeof claims.sub !== 'string' || !claims.sub) return null;
    if (claims.aud !== clientId) return null;
    return { sub: claims.sub, name: typeof claims.name === 'string' ? claims.name : null };
  } catch (error) {
    console.error('[auth] LIFF id token verification failed', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}
