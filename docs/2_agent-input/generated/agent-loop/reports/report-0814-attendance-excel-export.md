# Report 0814 — Attendance Excel Export + Proxy/Absent Lists + Range Summary

## Task

User request (from screenshot of `/admin/events/[weekId]`):

1. `匯出出席 PDF` should also offer an Excel export.
2. Both the PDF and Excel exports should show this event's 代理人 (proxies) and 未出席 (absent) name lists.
3. Somewhere on the site, an admin should be able to pick a date range and export an Excel showing, per person, how many times they served as a proxy and how many times they were absent during that range.

Confirmed with user before implementing:
- Excel format: real `.xlsx` (added `exceljs` dependency), not CSV.
- 未出席 definition: diff the chapter's official member directory (`CHAPTER_MEMBER_DIRECTORY` in `src/lib/chapter-members.ts`) against names actually seated that week. There is no explicit "absent" record in the data model (Prisma's `SeatAssignmentStatus.absent` value is modeled but never written), so absence — including a member whose seat was covered by a proxy — is inferred by the diff.

## Changed / Added Files

- `package.json` / `pnpm-lock.yaml` — added `exceljs` dependency.
- `src/server/attendance/attendance-report.ts` (new) — shared single-event computation: seated entries, proxy entries (`kind === 'proxy'` or `role === '代理'`), and absent members (directory minus seated names).
- `src/server/attendance/attendance-xlsx.ts` (new) — builds a 4-sheet workbook (摘要 / 出席總覽 / 代理人 / 未出席) for one event.
- `src/app/api/admin/events/[weekId]/attendance-export/route.ts` (new) — `GET`, admin-gated (Google session or admin password cookie), streams the `.xlsx` for one event.
- `src/components/admin-event-excel-export-button.tsx` (new) — client button, fetches the route above and triggers a browser download.
- `src/app/admin/events/[weekId]/page.tsx` — added the new Excel button next to the existing `匯出出席 PDF` button.
- `src/app/seats/print/page.tsx` — `AttendanceReport` (the DB-backed, weekId-driven print view used by `匯出出席 PDF`) now renders a `本次代理人` / `本次未出席` two-card section using the same directory-diff logic.
- `src/server/attendance/attendance-range-report.ts` (new) — queries all `MeetingSession`s with `date` in `[from, to]`, takes each session's latest `SeatMap`, reuses `buildEventAttendanceReport` per event, and aggregates per directory member: `totalEvents`, `presentCount`, `proxyCount`, `absentCount` (mutually exclusive per week).
- `src/server/attendance/attendance-range-xlsx.ts` (new) — builds a 3-sheet workbook (摘要 / 出席統計 per person / 活動明細 per event) for the range.
- `src/app/api/admin/attendance/range-export/route.ts` (new) — `GET ?from=YYYY-MM-DD&to=YYYY-MM-DD`, admin-gated, streams the range `.xlsx`.
- `src/components/admin-attendance-range-export-panel.tsx` (new) — client panel with from/to date inputs and a download button.
- `src/app/admin/page.tsx` — mounted the new range-export panel above the Google login records table.

## Contracts

- `GET /api/admin/events/[weekId]/attendance-export` → `.xlsx` (or 404 `seat_map_not_found` / 401 `unauthorized`).
- `GET /api/admin/attendance/range-export?from=&to=` → `.xlsx` (or 400 `missing_range` / `invalid_range` / 401 `unauthorized`).
- Both routes require the same admin access check already used by `/api/seats/[weekId]` (Google session via `auth()` OR the `take-seat-admin-access` cookie).

## Validation

```bash
pnpm run prisma:generate
pnpm run lint     # clean
pnpm run build    # succeeds; both new API routes listed in the route table
git diff --check  # clean
```

## Manual Evidence (not yet performed — needs user's local dev server + logged-in admin session)

- `MANUAL_REQUIRED`: open `/admin/events/[weekId]` for a real event, click `匯出出席 Excel`, confirm the `.xlsx` downloads and opens with the 4 expected sheets and correct 代理人/未出席 names.
- `MANUAL_REQUIRED`: open `/admin`, pick a date range spanning a few real events, click `匯出區間出席 Excel`, confirm per-person proxy/absent counts match manual expectation for at least one known week (e.g. `2026-07-16`, whose seed comment says 代理人：戴宇星).
- `MANUAL_REQUIRED`: reprint `匯出出席 PDF` for one event and confirm the new 本次代理人/本次未出席 cards render correctly in the browser print preview.

## Notes / Follow-ups

- The per-week semantics: if member A's seat was filled by proxy B, B is counted under `proxyCount` (they physically attended in a proxy capacity) and A is counted under `absentCount` (A's name never appears in that week's seats). This matches the user's confirmed definition but depends on `role === '代理'` / seat `kind === 'proxy'` being set correctly at data-entry time in `SeatingArranger`/`RuleEditor` — no new data was added to change how that gets set.
- Range aggregation only considers events that have a persisted `SeatMap` in MongoDB via `MeetingSession`; any historical week that was never saved through the app (i.e., only exists as a static `layout-*.ts` seed file and was never opened/saved through `/seats/[weekId]`) will not appear in the range report.
- This is unrelated to the still-open `SEAT-IA-006 Print route cleanup` task; no changes were made to the print route's weekId-mismatch guard.
