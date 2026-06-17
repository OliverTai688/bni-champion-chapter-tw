# REF-003: Multi-Date Seating Template Workflow

Status: Implemented MVP
Date: 2026-06-17

## Scenario

Admin is arranging the current meeting in `/seats` and needs to start a new seating template for another date. The date may be next week, a skipped week, or a special event day, so the system must not assume a fixed seven-day cadence.

## Workflow

1. Open `/seats`.
2. Make sure the current screen has the seating arrangement that should be copied.
3. In `新座位表日期`, choose the target event date.
4. Optionally enter a title.
5. Click `建立指定日期模板`.
6. The app creates a new `MeetingSession` and `SeatMap` from the current screen.
7. The browser moves to `/seats?weekId=YYYY-MM-DD`.
8. Continue editing that date and click `保存並同步`.

## Rules

- Date is chosen by the admin, not inferred as next week.
- The new template copies the current screen state:
  - top roles
  - seat grid
  - member roster
  - hero list
  - industry chains
- The new template uses the selected date as `weekId`.
- Local storage remains isolated by `weekId`.
- MongoDB persistence uses the existing `saveSeatingDraft` path.
- Google sign-in is required to create the template.

## Routes

```txt
GET /seats?weekId=YYYY-MM-DD
POST /api/seats/templates
```

## Limitations

- This MVP creates one date at a time.
- It does not yet show a full template library or duplicate-date warning modal.
- It does not yet let admin choose a source from an older saved date without opening that date first.
