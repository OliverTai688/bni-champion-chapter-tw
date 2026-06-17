# PLN-002: MongoDB, Prisma, And Cloudflare R2 Development Plan

Status: Draft Plan
Date: 2026-06-17

## Goal

Add durable persistence and file storage to `take-seat`:

- MongoDB stores operational data.
- Prisma manages typed access to MongoDB records.
- Cloudflare R2 stores generated files and future uploaded media.
- Prisma stores R2 object metadata through an `Asset` model.

## Non-Goals

- Do not remove localStorage in the first storage batch.
- Do not add auth and permissions in the same batch as raw persistence.
- Do not upload files directly through the application server unless the file is tiny and explicitly justified.
- Do not use Prisma v7 for MongoDB until official support is available.

## Batch DATA-001 - Storage Research And Inventory

- [x] Read AGENTS and current docs.
- [x] Inventory current routes, components, types, and local storage.
- [x] Verify Prisma MongoDB and R2 docs from official sources.
- [x] Produce architecture and development plan docs.

Acceptance:

- Research document cites official sources.
- Current single feature area is documented.
- Plan explains that Prisma manages MongoDB records and R2 metadata, not R2 file bytes.

## Batch DATA-002 - Prisma MongoDB Foundation

Tasks:

- [x] Add dependencies:
  - `@prisma/client@6.19.0`
  - `prisma@6.19.0`
  - `server-only`
- [x] Add `prisma/schema.prisma` with MongoDB datasource.
- [x] Add `src/server/db/prisma.ts` singleton.
- [x] Add `.env.example` or docs-only environment reference.
- [x] Add npm/pnpm scripts:
  - `prisma:generate`
  - `prisma:push`
  - `prisma:validate`
- [x] Run `prisma:validate` with a temporary local `DATABASE_URL`.
- [x] Run `prisma:generate` with a temporary local `DATABASE_URL`.

Acceptance:

- `pnpm run prisma:validate` passes.
- `pnpm run prisma:generate` passes.
- `pnpm run lint` passes.
- `pnpm run build` passes.
- No real database mutation occurs unless user approves `DATABASE_URL` and `prisma db push`.

## Batch DATA-003 - Core Data Model

Initial models:

- `MeetingSession`
- `Member`
- `SeatMap`
- `Seat`
- `SeatAssignment`
- `SeatMapRevision`
- `OperationLog`

Tasks:

- [x] Model current `MeetingWeek`, `SeatData`, `SeatingWorkspaceState`, and validation summary.
- [x] Preserve `weekId` compatibility for local draft import.
- [x] Add seed/import script that can convert current `src/lib/layout-0611.ts` into a draft `SeatMap`.
- [x] Run seed/import script in dry-run mode.
- [x] Run `prisma db push` for DATA-003 models after explicit approval.
- [x] Run seed/import script in write mode after explicit approval.

Acceptance:

- Schema supports current `/seats` data without losing roles, guests, proxies, heroes, or industry chains.
- Import script supports dry-run mode.
- Import script supports explicit write mode.
- No production write without approval.

## Batch DATA-004 - Repository Boundary

Tasks:

- [x] Add server repository interfaces for seating workspace load/save.
- [x] Keep existing `localSeatingWorkspaceRepository` for browser drafts.
- [x] Add application DTO mapper:
  - `AdminSeatingWorkspaceDTO`
  - `PublicSeatMapSummaryDTO`
- [x] Add route handler for persisted workspace read:
  - `GET /api/seats/[weekId]`
  - `GET /api/seats/[weekId]?view=admin`
- [x] Add persisted workspace write route:
  - `PATCH /api/seats/[weekId]`
- [x] Wire seating workspace save to localStorage + MongoDB draft save.
- [x] Add Google sign-in foundation with Auth.js.
- [x] Protect admin seat DTO and MongoDB draft save route behind sign-in.
- [x] Add `/seats` login/logout UI and local-only save messaging for signed-out users.

Acceptance:

- `/seats` can still run from seed/local mode.
- Persisted mode can be toggled by config or explicit route/API usage.
- Client Components receive DTOs, not raw Prisma records.
- Failed remote save does not remove the localStorage draft.
- Public DTO stays readable without sign-in.
- Admin DTO and write route return 401 without sign-in.
- Signed-out users can still save browser-local drafts and see how to sign in for MongoDB sync.
- Auth environment includes `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`.

## Batch DATA-005 - R2 Asset Foundation

Tasks:

- [x] Add dependencies:
  - `@aws-sdk/client-s3`
  - `@aws-sdk/s3-request-presigner`
- [x] Add `src/server/storage/r2-client.ts`.
- [x] Add `Asset` Prisma model.
- [x] Run approved R2 write/head/delete proof.
- [ ] Add presigned upload route for restricted file purposes.
- [ ] Add server-side R2 write helper for generated exports.

Acceptance:

- R2 credentials stay server-side.
- Presigned URL TTL is short and configurable.
- Upload route validates content type, purpose, and size.
- Asset metadata includes provider, bucket, key, content type, size, visibility, and purpose.

## Batch DATA-006 - Export Persistence

Tasks:

- Keep current browser CSV export.
- Add server CSV export from persisted seat map.
- Store generated CSV in R2.
- Create `ExportJob` and `Asset` metadata.
- Return signed download URL.

Acceptance:

- Admin can produce export from persisted data.
- R2 object exists and metadata points to it.
- Failed R2 write does not create successful export metadata.

## Batch DATA-007 - Attendance And Poll Data Prep

Tasks:

- Add models:
  - `AttendanceRecord`
  - `LivePoll`
  - `LivePollOption`
  - `LivePollVote`
- Add DTO privacy contracts.
- Prepare operation logs for manual attendance and poll admin actions.

Acceptance:

- Public DTO cannot expose private member/attendee data.
- Vote and attendance records can be audited by admin.
- Formal live seat map batches can build on the data layer.

## Suggested File Changes By Batch

| Batch | Likely files |
| --- | --- |
| DATA-002 | `package.json`, `prisma/schema.prisma`, `src/server/db/prisma.ts`, env docs |
| DATA-003 | `prisma/schema.prisma`, `scripts/seed-current-layout.ts`, `src/application/seating/*` |
| DATA-004 | `src/server/repositories/*`, `src/app/api/seats/*`, `src/components/SeatingArranger.tsx` |
| DATA-005 | `src/server/storage/*`, `src/app/api/assets/presign/route.ts`, `prisma/schema.prisma` |
| DATA-006 | `src/server/exports/*`, `src/app/api/exports/*`, `src/lib/seating-export.ts` |
| DATA-007 | `prisma/schema.prisma`, `src/application/attendance/*`, `src/application/polls/*` |

## Validation Commands

Use commands only after corresponding scripts/dependencies exist:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm run lint
pnpm run build
git diff --check
```

For R2 proof, use a dry-run or dedicated non-production bucket first.

## Review Gates

Stop for user review when:

- A real `DATABASE_URL` or R2 credential is required.
- `prisma db push` would mutate a database.
- R2 write/delete operations would touch a remote bucket.
- DTO design affects public/member privacy.
- Current localStorage behavior would be removed or changed.
