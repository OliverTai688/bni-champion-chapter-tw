# Admin Poll Cookie Path Fix - 2026-06-17

## Summary

Fixed the admin poll creation blocker where the `/admin` page could show the admin interface but `建立並開放投票` returned `Admin password is required for poll management.`

## Root Cause

The poll controls called `/api/admin/events/[weekId]/polls`. Existing browser sessions could still have an admin cookie scoped to `/admin`, so the browser did not send that cookie to `/api/admin/...`.

## Changed Files

- `src/server/admin/poll-route-handlers.ts`
- `src/app/api/admin/events/[weekId]/polls/route.ts`
- `src/app/admin/api/events/[weekId]/polls/route.ts`
- `src/components/admin-poll-controls.tsx`

## Behavior

- Shared admin poll GET/POST logic now lives in a server-only handler.
- Existing `/api/admin/events/[weekId]/polls` still works.
- New `/admin/api/events/[weekId]/polls` works with admin-scoped browser cookies.
- Admin poll controls now use `/admin/api/events/[weekId]/polls`.

## Validation

```txt
pnpm run lint
pnpm run build
git diff --check
GET /admin/api/events/2026-06-11/polls without admin cookie -> 401
GET /admin/api/events/2026-06-11/polls with admin cookie -> {"polls":[]}
```

## Manual Check

Refresh `/admin`, then click `建立並開放投票`. If the old browser cookie is still stale, re-enter the admin password once and click again.
