import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_ACCESS_COOKIE = 'take-seat-admin-access';

const TEMPORARY_ADMIN_PASSWORD = 'Bnibni';

function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? TEMPORARY_ADMIN_PASSWORD;
}

function hashValue(value: string) {
  const secret = process.env.AUTH_SECRET ?? 'local-admin-access';
  return createHash('sha256').update(`${value}:${secret}`).digest('hex');
}

export function createAdminAccessToken() {
  return hashValue(adminPassword());
}

export function verifyAdminPassword(password: string) {
  const expected = Buffer.from(hashValue(adminPassword()));
  const actual = Buffer.from(hashValue(password));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyAdminAccessToken(token: string | undefined) {
  if (!token) return false;

  const expected = Buffer.from(createAdminAccessToken());
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
