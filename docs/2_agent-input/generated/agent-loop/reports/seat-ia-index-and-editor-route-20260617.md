# Seat IA Index And Editor Route - 2026-06-17

## Batch

SEAT-IA-002 and SEAT-IA-003 partial implementation.

## Summary

Changed the seat planning surface from a single `/seats` editor into the start of a one-to-many structure:

- `/seats` is now an event seat map index.
- `/seats/[weekId]` is now the focused editor for one event date.
- `/seats?weekId=YYYY-MM-DD` redirects to `/seats/[weekId]`.
- `SeatingArranger` no longer contains inline date/template creation controls.

## Changed Files

- `src/app/seats/page.tsx`
- `src/app/seats/[weekId]/page.tsx`
- `src/server/seating/seating-page-state.ts`
- `src/components/SeatingArranger.tsx`
- `src/app/page.tsx`

## Visible Routes

```txt
/seats
/seats/2026-06-11
/seats?weekId=2026-06-11
```

## Behavior Evidence

```txt
HEAD /seats -> 200
HEAD /seats/2026-06-11 -> 200
HEAD /seats?weekId=2026-06-11 -> 307 Location: /seats/2026-06-11
```

## Validation

```txt
pnpm run lint
pnpm run build
git diff --check
```

## Completed

- `/seats` communicates that there can be many event seat maps.
- `/seats` no longer renders the drag/drop editor.
- Existing event rows link to `/seats/[weekId]`.
- `/seats/[weekId]` edits exactly one event date.
- Local storage remains keyed by `weekId`.
- `SeatingArranger` is focused back on editing/saving/exporting.

## Not Complete

- Functional index-level create/duplicate flow.
- Replacement for `POST /api/seats/templates`.
- Duplicate-date warning.
- Dedicated `/admin/events/[weekId]` operations route.
- `/seats/[weekId]/print`.

## Manual Required

Open `/seats` in the browser and confirm the list layout feels like the right direction before implementing create/duplicate. Then open `/seats/2026-06-11` and confirm the editor still works.
