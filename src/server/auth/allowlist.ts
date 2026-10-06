// Leader e-mail allowlist from the environment. No database access here so
// the Auth.js config can import it without pulling Prisma into every route.

const BUILT_IN_OWNER_EMAILS = ['taioliver688@gmail.com'];

function splitList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

/**
 * True for the owner, `AUTH_ALLOWED_EMAILS` and `AUTH_ALLOWED_DOMAIN`.
 * An empty allowlist allows nobody extra: it never means "everyone".
 */
export function isAllowlistedLeaderEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (BUILT_IN_OWNER_EMAILS.includes(normalized)) return true;
  if (splitList(process.env.AUTH_ALLOWED_EMAILS).includes(normalized)) return true;
  return splitList(process.env.AUTH_ALLOWED_DOMAIN)
    .map((domain) => domain.replace(/^@/, ''))
    .some((domain) => normalized.endsWith(`@${domain}`));
}
