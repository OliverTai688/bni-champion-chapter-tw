# Google Owner Access Fix - 2026-06-17

## Request

User reported that production Google sign-in redirects to `/api/auth/error?error=AccessDenied` when signing in as `taioliver688@gmail.com`.

## Findings

- Auth.js session endpoint is reachable in production.
- The local auth callback denied access when `AUTH_ALLOWED_DOMAIN` was configured and the Google account did not match that domain.
- Login audit recording also awaited MongoDB directly, so a production database outage could make the OAuth callback fragile.

## Change

- Added a built-in owner bypass for `taioliver688@gmail.com`.
- Changed authorization semantics to:
  - allow owner email always;
  - if no allow-list/domain is configured, allow any Google account;
  - if allow-list/domain is configured, allow matching email OR matching domain.
- Wrapped Google login audit recording with a short non-fatal timeout so database logging cannot block a valid sign-in.

## Evidence To Run

- `pnpm exec tsc --noEmit`
- `pnpm run build`
- Production manual check: sign in with `taioliver688@gmail.com` after deployment finishes.

## Manual Follow-Up

- If keeping a restricted production deployment, set `AUTH_ALLOWED_EMAILS` to include the owner and any operators.
- If using domain restrictions, keep `AUTH_ALLOWED_DOMAIN` for the chapter/company domain; the owner email now bypasses that domain check.
- Database connectivity still needs separate repair for seat data loading and login audit persistence.

