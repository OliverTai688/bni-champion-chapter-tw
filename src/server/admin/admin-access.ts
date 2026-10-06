import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import { sign } from '@/server/auth/secrets';

export const ADMIN_ACCESS_COOKIE = 'take-seat-admin-access';
export const ADMIN_ACCESS_TTL_SECONDS = 60 * 60 * 12;

/** The shared leader password. There is no built-in fallback: unset means password login is off. */
function adminPassword() {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : null;
}

export function isAdminPasswordConfigured() {
  return adminPassword() !== null;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Binding the token to the password means changing ADMIN_PASSWORD signs every device out.
function passwordFingerprint(password: string) {
  return sign('admin-password', password).slice(0, 16);
}

export function verifyAdminPassword(password: string) {
  const expected = adminPassword();
  if (!expected || !password) return false;
  return safeEqual(sign('admin-password-check', expected), sign('admin-password-check', password));
}

/** `<issuedAtSeconds>.<signature>`; expires after ADMIN_ACCESS_TTL_SECONDS. */
export function createAdminAccessToken(now = Date.now()) {
  const password = adminPassword();
  if (!password) throw new Error('ADMIN_PASSWORD is not set.');
  const issuedAt = Math.floor(now / 1000).toString();
  return `${issuedAt}.${sign('admin-access', `${issuedAt}:${passwordFingerprint(password)}`)}`;
}

export function verifyAdminAccessToken(token: string | undefined, now = Date.now()) {
  const password = adminPassword();
  if (!token || !password) return false;
  const [issuedAt, signature] = token.split('.');
  if (!issuedAt || !signature || !/^\d+$/.test(issuedAt)) return false;
  const age = Math.floor(now / 1000) - Number(issuedAt);
  if (age < 0 || age > ADMIN_ACCESS_TTL_SECONDS) return false;
  return safeEqual(signature, sign('admin-access', `${issuedAt}:${passwordFingerprint(password)}`));
}
