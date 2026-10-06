import 'server-only';

import { createHmac } from 'node:crypto';

const DEV_SECRET = 'take-seat-local-development-secret';

/**
 * The signing secret for every cookie and token this app issues.
 * Production refuses to run without `AUTH_SECRET`: a built-in fallback would
 * let anyone who reads the source forge leader and member cookies.
 */
export function appSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is not set. Set it in the deployment environment before starting the app.');
  }
  return DEV_SECRET;
}

/** HMAC-SHA256 of `value`, namespaced by `purpose` so tokens of one kind never verify as another. */
export function sign(purpose: string, value: string) {
  return createHmac('sha256', `${purpose}:${appSecret()}`).update(value).digest('hex');
}
