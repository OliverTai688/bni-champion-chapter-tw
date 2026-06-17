# Seat IA Event Operations Placement - 2026-06-17

## Scope

Implemented `SEAT-IA-005` so publish, poll, close, result review, and vote CSV export controls belong to one selected event instead of the global admin login record page.

## Changed Files

- `src/app/admin/events/[weekId]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/seats/page.tsx`
- `src/app/seats/[weekId]/page.tsx`
- `src/components/event-publication-controls.tsx`
- `AGENTS.md`

## Visible Routes

- `/admin` remains the global admin dashboard and Google login record page.
- `/admin/events/[weekId]` is the event operations cockpit.
- `/seats` links each event row to `/admin/events/[weekId]`.
- `/seats/[weekId]` now stays focused on editing and links out to activity operations.

## Behavior

- Admin password gate still protects admin pages.
- Public page publication controls stay Google-session based through the existing `/api/admin/events/[weekId]` contract.
- Publication controls support an embedded layout for event operations pages.
- Poll create, refresh, close, winners, and CSV export stay scoped to the selected `weekId`.
- No database mutation was performed during implementation.

## Validation

Passed:

```bash
pnpm run lint
pnpm run build
git diff --check
```

Non-mutating HTTP smoke checks:

```bash
curl -I http://localhost:3000/admin/events/2026-06-11
curl -I http://localhost:3000/seats
curl -I http://localhost:3000/seats/2026-06-11
```

All returned `HTTP/1.1 200 OK`.

## Manual Evidence

MANUAL_REQUIRED:

- Open `/admin/events/2026-06-11` after admin password login.
- Confirm the page shows the selected event summary.
- Confirm publish controls appear after Google login.
- Confirm poll list/create/close/export actions target the selected event only.
