# MongoDB, Prisma, And R2 Foundation Report

Date: 2026-06-17
Batch / slice: DATA-002, DATA-003, DATA-004 read boundary, and partial DATA-005

## User-Visible Result

No visible UI route changed.

This batch adds server-side persistence/storage foundations only:

- Prisma MongoDB schema.
- Core meeting/seat map/member/revision/operation Prisma models.
- Prisma Client singleton.
- R2 S3-compatible client helper.
- Environment variable template.
- Package scripts for Prisma validation/generation/db push.
- Current layout dry-run import script.
- Approved current layout write import.
- Approved R2 write/head/delete proof.
- Read-only repository and API boundary for persisted seat maps.
- Write boundary for MongoDB draft saves from the seating workspace.
- Google sign-in foundation, login UI, and API protection.

## Files Changed

- `.gitignore`
- `.env.example`
- `package.json`
- `pnpm-lock.yaml`
- `prisma/schema.prisma`
- `src/server/db/prisma.ts`
- `src/server/storage/r2-client.ts`
- `scripts/seed-current-layout.mjs`
- `src/application/seating/dto.ts`
- `src/application/seating/mappers.ts`
- `src/application/seating/save-draft.ts`
- `src/server/repositories/seating-workspace-repository.ts`
- `src/app/api/seats/[weekId]/route.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/auth.ts`
- `src/components/app-providers.tsx`
- `src/components/auth-button.tsx`
- `src/components/SeatingArranger.tsx`
- `src/app/layout.tsx`
- `src/app/seats/page.tsx`
- `docs/05_execution-plans/PLN-002_mongodb-prisma-r2-development-plan.md`

## Implementation Notes

- Prisma and `@prisma/client` are pinned to `6.19.0` because current research notes MongoDB support is not available in Prisma v7 yet.
- `prisma/schema.prisma` uses `provider = "mongodb"`.
- `Asset` metadata model was added so R2 object metadata can be managed through Prisma while file bytes remain in R2.
- DATA-003 core models were added: `MeetingSession`, `Member`, `SeatMap`, `Seat`, `SeatAssignment`, `SeatMapRevision`, and `OperationLog`.
- The dry-run import script maps the current `layout-0611` seed to the new model shape without writing to MongoDB.
- The importer now supports explicit `--write`; it replaces the previous seed seat map for the same session/layout and recreates seats, assignments, revision, and operation log.
- DATA-004 read boundary was added with separate public and admin DTOs.
- Public DTO intentionally excludes seat list, names, member IDs, and assignment details.
- Admin DTO includes seat list, assignments, top roles, roster, heroes, industry chains, and revision metadata.
- DATA-004 write boundary was added through `PATCH /api/seats/[weekId]`.
- The workspace save action now writes to localStorage first, then attempts MongoDB draft save. A failed remote save leaves the local draft intact and shows an error message.
- Google sign-in was added through Auth.js/NextAuth with the Google provider.
- `/api/auth/[...nextauth]` exposes Auth.js route handlers.
- `/seats` now shows a Google login/logout button.
- Local `.env` was checked without printing secrets. `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET` are present; the Google client ID format and Auth secret length look valid.
- `src/components/auth-button.tsx` now shows loading, signed-out, and signed-in states with clear sync/logout actions.
- `src/components/SeatingArranger.tsx` now treats unauthenticated saves as local-only and offers a Google login action for MongoDB sync.
- `GET /api/seats/[weekId]?view=admin` and `PATCH /api/seats/[weekId]` require sign-in.
- `GET /api/seats/[weekId]` remains public and returns anonymous summary only.
- R2 client creation is server-only and lazy: importing the helper does not require credentials, but using `getR2Config()` does.
- `.env.example` is now unignored while real `.env*` files remain ignored.

## Validation

Commands run:

```bash
DATABASE_URL='mongodb://localhost:27017/take-seat?replicaSet=rs0' pnpm run prisma:validate
DATABASE_URL='mongodb://localhost:27017/take-seat?replicaSet=rs0' pnpm run prisma:generate
pnpm run prisma:push
pnpm run seed:current-layout:dry-run
pnpm run seed:current-layout:write
pnpm run lint
pnpm run build
GET http://localhost:3000/api/seats/2026-06-11
GET http://localhost:3000/api/seats/2026-06-11?view=admin
GET http://localhost:3000/api/seats/not-found-week
PATCH http://localhost:3000/api/seats/2026-06-11
GET http://localhost:3000/api/seats/2026-06-11?view=admin without sign-in
PATCH http://localhost:3000/api/seats/2026-06-11 without sign-in
GET http://localhost:3000/api/auth/providers
git diff --check -- package.json pnpm-lock.yaml prisma/schema.prisma src/server/db/prisma.ts src/server/storage/r2-client.ts scripts/seed-current-layout.mjs .env.example .gitignore docs/05_execution-plans/PLN-002_mongodb-prisma-r2-development-plan.md
git diff --check -- src/auth.ts src/app/api/auth/[...nextauth]/route.ts src/app/api/seats/[weekId]/route.ts src/components/app-providers.tsx src/components/auth-button.tsx src/components/SeatingArranger.tsx src/app/layout.tsx src/app/seats/page.tsx package.json pnpm-lock.yaml .env.example
```

Results:

- Prisma validate passed.
- Prisma generate passed.
- Prisma db push passed against MongoDB database `take-seat`.
- Prisma db push created `Asset` collection and indexes:
  - `Asset_purpose_idx`
  - `Asset_visibility_idx`
  - `Asset_bucket_key_key`
- DATA-003 schema validate passed after adding core data models.
- DATA-003 Prisma generate passed after adding core data models.
- DATA-003 `prisma db push` passed after user approval.
- Current layout dry-run import passed:
  - `meetingSessions`: 1
  - `members`: 39
  - `seatMaps`: 1
  - `seats`: 41
  - `seatAssignments`: 39
  - `seatMapRevisions`: 1
  - `operationLogs`: 1
- Current layout write import passed:
  - `meetingSessions`: 1
  - `members`: 39
  - `seatMaps`: 1
  - `seats`: 41
  - `seatAssignments`: 39
  - `seatMapRevisions`: 1
  - `operationLogs`: 1
- MongoDB post-import counts:
  - `meetingSessions`: 1
  - `members`: 39
  - `seatMaps`: 1
  - `seats`: 41
  - `seatAssignments`: 39
  - `revisions`: 1
  - `operationLogs`: 1
  - `assets`: 0
- Lint passed.
- Build passed.
- API proof passed:
  - public `GET /api/seats/2026-06-11` returned 200 with summary only.
  - public response did not include `seats`.
  - admin `GET /api/seats/2026-06-11?view=admin` returned 200 with 41 seats and 1 revision.
  - missing week returned 404 with `seat_map_not_found`.
- API write proof passed:
  - `PATCH /api/seats/2026-06-11` returned 200.
  - MongoDB draft save returned 41 total seats and 39 assigned seats.
  - Public DTO still did not include `seats` after the write.
- Auth protection proof passed without sign-in:
  - public `GET /api/seats/2026-06-11` returned 200.
  - admin `GET /api/seats/2026-06-11?view=admin` returned 401.
  - `PATCH /api/seats/2026-06-11` returned 401.
- Auth provider proof passed:
  - `GET /api/auth/providers` returned 200.
- Targeted `git diff --check` passed.

R2 read-only proof:

- Loaded local `.env` without printing secrets.
- Created S3-compatible R2 client.
- Ran `ListObjectsV2` with `MaxKeys=1`.
- Result: connected to bucket `bni-yuhsin`, `keyCount=0`, `isTruncated=false`.

R2 write/head/delete proof:

- Created a small `text/plain` proof object under `proof/`.
- Verified it with `HeadObject`.
- Deleted it with `DeleteObject`.
- Confirmed the object no longer exists.
- No `Asset` metadata was created for the temporary proof object.

Environment fix applied:

- Local `.env` `DATABASE_URL` was missing a database name.
- It was updated locally to include `/take-seat` before running `prisma db push`.

Known unrelated issue:

- Full `git diff --check` still reports trailing whitespace in existing `src/app/globals.css` and `src/app/page.tsx` changes. Those were not touched in this batch.

## Remaining Batch Tasks

Next recommended step: manually complete one real Google OAuth sign-in, then add stronger role-based admin authorization or move to DATA-005 presigned upload route.

Remaining from DATA-003:

- Add richer validation summaries to imported `SeatMapRevision` once validation is exposed in an import-safe module.

Remaining from DATA-004:

- Decide when `/seats` should consume MongoDB DTOs instead of only seed/localStorage.
- Add role-based authorization before exposing admin DTO beyond trusted users.
- Optionally persist Auth.js users/accounts in MongoDB with an adapter later.
- Confirm production OAuth callback URLs before deploying.

Remaining from DATA-005:

- Add presigned upload route.
- Add server-side R2 write helper.
- Add object verification/confirmation flow before writing successful `Asset` metadata.

Remaining from DATA-006:

- Add server-side CSV/PDF export persistence.
- Store generated objects in R2.
- Add `ExportJob` metadata and signed download flow.

Remaining from DATA-007:

- Add attendance and live poll models.
- Add privacy DTO contracts.
- Add operation logs for manual attendance and poll admin actions.

## Blockers And Manual Operations

Manual operation required before any real DB write:

- Create or provide a MongoDB connection string.
- Put it in local `.env` as `DATABASE_URL`.
- Confirm whether the target is local, staging, or production.
- Explicitly approve `pnpm run prisma:push` before it is run.

Manual operation required before any real R2 write:

- Create or provide Cloudflare R2 bucket and API token.
- Fill local `.env` with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`.
- Configure bucket CORS before browser presigned uploads.
- Explicitly approve any write/delete proof against a real bucket.

Potential blocker:

- pnpm v10 warned that build scripts for Prisma packages were ignored and suggested `pnpm approve-builds`. Validation and generation still passed in this run, but future fresh installs may need manual approval.
- A real Google OAuth browser login still requires the user account flow. If it fails, first check the Google Cloud authorized redirect URI: `http://localhost:3000/api/auth/callback/google` for local development.
- Admin/write access currently means "signed in with an allowed Google account." If `AUTH_ALLOWED_EMAILS` or `AUTH_ALLOWED_DOMAIN` is not configured, any Google account can sign in.

Potential design decision:

- Decide whether current `/seats` should first persist admin drafts only, or also expose public/member read DTOs in the same milestone.
