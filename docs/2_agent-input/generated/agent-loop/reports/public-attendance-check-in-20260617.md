# Public Attendance Check-In - 2026-06-17

## Scope

Implemented public-page attendance controls so the published seat map can mark who has arrived and synchronize that state across open public pages through polling.

## Changed Files

- `src/application/events/dto.ts`
- `src/application/events/mappers.ts`
- `src/server/repositories/weekly-public-event-repository.ts`
- `src/app/api/public/events/[slug]/attendance/route.ts`
- `src/app/w/[slug]/page.tsx`
- `src/components/public-seat-map.tsx`
- `src/components/public-attendance-live-panel.tsx`
- `AGENTS.md`

## Behavior

- Public event DTO now includes each seat assignment's attendance status.
- Occupied public seat cards show `未到` or `已抵達`.
- The public page renders a `抵達` button for assigned seats and `取消抵達` for checked-in seats.
- Clicking the button calls `PATCH /api/public/events/[slug]/attendance`.
- The public page polls `GET /api/public/events/[slug]` every 5 seconds so other open public pages update without manual refresh.
- Attendance changes are recorded in `OperationLog`.

## Validation

Passed:

```bash
pnpm run prisma:validate
pnpm run lint
pnpm run build
git diff --check
```

Non-mutating smoke checks:

```bash
curl -I http://localhost:3000/w/2026-06-18-5f9139
curl -i http://localhost:3000/api/public/events/2026-06-18-5f9139
```

- Public page returned `HTTP/1.1 200 OK`.
- Public event API returned `HTTP/1.1 200 OK` and includes `attendanceStatus`.

## Manual Evidence

MANUAL_REQUIRED:

- Open `/w/[slug]` in two tabs.
- Click `抵達` on an occupied seat in one tab.
- Confirm the checked-in count and seat card update in the other tab within about 5 seconds.
