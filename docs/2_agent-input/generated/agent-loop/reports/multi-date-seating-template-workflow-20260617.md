# Multi-Date Seating Template Workflow - 2026-06-17

## Summary

Implemented a `/seats` workflow for creating a new seating template for any admin-selected date. This supports starting next week's seating plan without assuming the event is always exactly seven days later.

## Changed Files

- `src/app/seats/page.tsx`
- `src/components/SeatingArranger.tsx`
- `src/app/api/seats/templates/route.ts`
- `docs/03_feature-reference/REF-003_multi-date-seating-template-workflow.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`

## Behavior

- `/seats` accepts `?weekId=YYYY-MM-DD`.
- If MongoDB has that date's seat map, `/seats` loads it.
- If no matching date exists, `/seats` falls back to the current seed template.
- The seating workspace now has `新座位表日期` and `建立指定日期模板`.
- Template creation copies the current screen state into a new `MeetingSession + SeatMap`.
- After creation, the browser navigates to `/seats?weekId=targetDate`.

## Validation

```txt
pnpm run lint
pnpm run build
git diff --check
POST /api/seats/templates without Google sign-in -> 401
HEAD /seats?weekId=2026-06-11 -> 200
```

## Manual Required

Use `/seats`, select a target date, click `建立指定日期模板`, then confirm the URL changes to `/seats?weekId=YYYY-MM-DD` and the new template can be edited and saved.

## Remaining Work

- Template library view.
- Duplicate-date confirmation modal.
- Choose source date without first opening it.
- Batch-create several future dates.
