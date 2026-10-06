import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/db/prisma';

export const API_SCOPES = ['seating:read', 'seating:write'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABEL: Record<ApiScope, string> = {
  'seating:read': '讀取活動、名冊、出席與座位',
  'seating:write': '寫入座位表（每次寫入都會留下版本與操作紀錄）',
};

const TOKEN_PREFIX = 'tsk';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Creates a token and returns the raw value once. Only its SHA-256 is stored. */
export async function createApiToken(input: { name: string; scopes: ApiScope[]; expiresInDays: number | null; createdBy: string | null }) {
  const name = input.name.trim().slice(0, 60);
  if (!name) throw new Error('請填寫金鑰名稱，例如「Claude 排座」。');
  const scopes = input.scopes.filter((scope) => (API_SCOPES as readonly string[]).includes(scope));
  if (scopes.length === 0) throw new Error('請至少勾選一個權限。');

  const secret = randomBytes(24).toString('base64url');
  const prefix = secret.slice(0, 6);
  const token = `${TOKEN_PREFIX}_${prefix}_${secret.slice(6)}`;
  const record = await prisma.apiToken.create({
    data: {
      name,
      prefix: `${TOKEN_PREFIX}_${prefix}`,
      tokenHash: hashToken(token),
      scopes,
      createdBy: input.createdBy,
      expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86_400_000) : null,
      // Written explicitly: on MongoDB a `revokedAt: null` filter does not match a missing field.
      revokedAt: null,
      lastUsedAt: null,
    },
  });
  return { token, record };
}

export async function listApiTokens() {
  const tokens = await prisma.apiToken.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  const now = Date.now();
  return tokens.map((token) => ({ ...token, expired: token.expiresAt ? token.expiresAt.getTime() < now : false }));
}

export async function revokeApiToken(id: string) {
  const result = await prisma.apiToken.updateMany({
    where: { id, OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) throw new Error('這把金鑰已經停用或不存在。');
}

export interface ApiCaller {
  tokenId: string;
  name: string;
  scopes: string[];
}

/** Resolves `Authorization: Bearer tsk_…`. Returns null for missing, unknown, revoked or expired tokens. */
export async function verifyApiToken(authorization: string | null): Promise<ApiCaller | null> {
  const match = authorization?.match(/^Bearer\s+(tsk_[A-Za-z0-9_-]{20,})\s*$/);
  if (!match) return null;
  const record = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(match[1]) } }).catch(() => null);
  if (!record || record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) return null;
  // Best effort; a failed timestamp update never blocks the call.
  void prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { tokenId: record.id, name: record.name, scopes: record.scopes };
}
