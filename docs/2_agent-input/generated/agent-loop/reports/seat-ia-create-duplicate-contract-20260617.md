# Seat IA Create Duplicate Contract - 2026-06-17

## Batch

SEAT-IA-004 implementation.

## Summary

Implemented a clearer create/duplicate flow for event seat maps from the `/seats` index.

## Changed Files

- `src/app/api/seats/route.ts`
- `src/app/api/seats/templates/route.ts`
- `src/app/seats/page.tsx`
- `src/components/seat-map-create-panel.tsx`
- `src/server/repositories/admin-event-sessions-repository.ts`
- `AGENTS.md`

## Behavior

- `POST /api/seats` is now the create event seat map endpoint.
- Creation requires Google sign-in.
- Source choices:
  - latest event
  - selected event
  - base TypeScript template
- Existing target date returns `409 event_date_exists` unless `confirmOverwrite: true`.
- Successful creation writes a clear `event_seat_map_created` operation log.
- Old `POST /api/seats/templates` route was removed; it now resolves as an unsupported method through the route tree.
- `/seats` now contains the create/duplicate panel.

## Validation

```txt
pnpm run lint
pnpm run build
git diff --check
GET /api/seats without Google sign-in -> 401
POST /api/seats without Google sign-in -> 401
POST /api/seats/templates -> 405
HEAD /seats -> 200
```

## Browser Evidence

MANUAL_REQUIRED: Browser automation was not available because the required in-app browser execution tool was not exposed in this session. Please open `/seats` manually and confirm the create panel layout.

## Not Done

- No test date was created because that would mutate MongoDB.
- Dedicated `/admin/events/[weekId]` operations route remains pending.
- `/seats/[weekId]/print` remains pending.
