# Public Slug Null Unique Create Fix - 2026-06-17

## Problem

Creating a new event seat map failed with:

```txt
Unique constraint failed on the constraint: `MeetingSession_publicSlug_key`
```

MongoDB unique indexes can treat multiple missing or null optional values as conflicting. Draft `MeetingSession` records were being created without a `publicSlug`, so the second draft event could fail even though it was not public.

## Fix

- New draft sessions now receive an internal reserved slug prefix: `__draft__`.
- Admin/event list DTOs hide reserved draft slugs and expose them as `null`.
- Publication controls treat reserved draft slugs as absent, so `generate_slug` and `publish` still create a real public slug.
- Hidden or archived pages are not shown as public page links from the admin/index views.

## Changed Files

- `src/server/repositories/seating-workspace-repository.ts`
- `src/server/repositories/admin-event-sessions-repository.ts`
- `src/server/repositories/event-publication-repository.ts`

## Validation

Passed:

```bash
pnpm run lint
pnpm run prisma:validate
pnpm run build
git diff --check
```

Non-mutating checks:

```bash
curl -I http://localhost:3000/seats
curl -i http://localhost:3000/api/seats
```

- `/seats` returned `HTTP/1.1 200 OK`.
- `/api/seats` without auth/admin returned `HTTP/1.1 401 Unauthorized`.

## Manual Evidence

MANUAL_REQUIRED:

- Retry creating the target event date from `/seats`.
- If the dev server still shows the old error, restart `pnpm run dev` so the server uses the updated module.
