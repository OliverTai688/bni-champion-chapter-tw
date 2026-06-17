# Multi-Day Seat Map Poll Targeting - 2026-06-17

## Summary

Added admin support for selecting the target event day before creating or managing polls. This removes the hardcoded `/admin` dependency on the current seed week for poll creation.

## Research Result

The existing schema already supports multi-day events:

- `MeetingSession.weekId` is the internal event-day key.
- `MeetingSession.date` stores the date.
- `SeatMap.sessionId` binds seat maps to the day.
- `LivePoll.sessionId` binds polls to the day.

No Prisma schema change was needed for the MVP.

## Changed Files

- `src/server/repositories/admin-event-sessions-repository.ts`
- `src/server/admin/event-session-route-handlers.ts`
- `src/app/admin/api/events/route.ts`
- `src/app/api/admin/events/route.ts`
- `src/components/admin-event-session-manager.tsx`
- `src/app/admin/page.tsx`
- `docs/02_architecture-and-rules/ARC-004_multi-day-seat-map-and-poll-targeting-architecture.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-003_weekly-public-page-and-star-voting-batch-plan.md`

## Behavior

- `/admin` now loads admin event sessions from MongoDB.
- Admin can select the target event day before poll creation.
- Admin can create a new date from the current seating template.
- `AdminPollControls` is keyed by the selected `weekId`, so poll list, create, close, and export all target the selected day.

## API Evidence

```txt
GET /admin/api/events without admin cookie
-> 401 Unauthorized

GET /admin/api/events with admin cookie
-> sessionCount: 1
-> first.weekId: 2026-06-11
-> first.seatCount: 41
-> first.assignmentCount: 39
-> first.pollCount: 1
-> first.openPollCount: 1
```

## Validation

```txt
pnpm run lint
pnpm run build
git diff --check
```

## Manual Required

Use `/admin` to create a future date, confirm it appears in the selector, then create a poll while that date is selected.

## Remaining Work

- Dedicated `/admin/events/[weekId]` route.
- Per-date seating editor instead of template cloning only.
- Batch generator for multiple future weekly meetings.
- Duplicate-date warning or explicit overwrite/version behavior.
