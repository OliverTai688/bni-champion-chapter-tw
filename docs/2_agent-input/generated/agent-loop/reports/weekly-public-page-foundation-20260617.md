# Weekly Public Page Foundation Report

Date: 2026-06-17
Batch / slice: WEEKLY-PUBLIC-002, WEEKLY-PUBLIC-003, partial WEEKLY-PUBLIC-004
Task IDs: public event schema, public event DTO/API, public page shell

## 1. User-Visible Result

- Pages/routes now visible:
  - `/w/[slug]`
  - `/api/public/events/[slug]`
- What the user can click/try:
  - Published weekly pages will be viewable at `/w/[slug]` after a public slug/status is written.
  - Unpublished or missing slug currently returns safe 404.
- Screenshots or browser evidence:
  - Not captured in this slice because no published public event record exists yet.

## 2. Product Scope

- PRD/plan references:
  - `docs/01_product-requirements/PRD-002_weekly-public-event-page-and-anonymous-star-voting.md`
  - `docs/02_architecture-and-rules/ARC-003_weekly-public-page-and-vote-access-architecture.md`
  - `docs/05_execution-plans/PLN-003_weekly-public-page-and-star-voting-batch-plan.md`
  - `docs/08_acceptance-and-qa/ACC-003_weekly-public-page-and-star-voting-acceptance.md`
- Included:
  - Public event schema fields.
  - Poll/vote schema models.
  - Public weekly event DTO.
  - Read-only public event API.
  - Public weekly page shell.
- Not included:
  - `prisma db push`.
  - Admin publish UI.
  - Poll setup UI.
  - Vote code validation or ballot submission.

## 3. Frontend Changes

- Files changed:
  - `src/app/w/[slug]/page.tsx`
- Components/routes added:
  - Public weekly page route.
- UI states covered:
  - Published event shell, based on DTO.
  - Safe not-found state for missing/unpublished slug.
- Responsive notes:
  - The page uses a mobile-first single-column layout and expands to a two-column layout on large screens.

## 4. Backend / API / Server Changes

- Files changed:
  - `src/application/events/dto.ts`
  - `src/application/events/mappers.ts`
  - `src/server/repositories/weekly-public-event-repository.ts`
  - `src/app/api/public/events/[slug]/route.ts`
- DTOs/contracts:
  - `PublicWeeklyEventDTO`
  - `PublicPollDTO`
- Server actions/route handlers:
  - `GET /api/public/events/[slug]`
- Error states:
  - Missing or unpublished slug returns `404 public_event_not_found`.

## 5. Data / System Architecture

- Models/state introduced or touched:
  - `MeetingSession.publicSlug`
  - `MeetingSession.publicStatus`
  - `MeetingSession.publicConfig`
  - `LivePoll`
  - `LivePollOption`
  - `LivePollVote`
- Repository/application/domain boundaries:
  - Public route uses repository -> mapper -> DTO.
  - Public DTO does not reuse admin seating workspace DTO.
- Persistence notes:
  - Prisma schema validated and client generated.
  - No `prisma db push` was run in this slice.

## 6. Privacy And Security Boundaries

- Public DTO:
  - Shows event identity, public status, anonymous seat summary, zone occupancy, public poll options, and public results only when visibility permits it.
- Member DTO:
  - Not added in this slice.
- Staff/Admin DTO:
  - Not added in this slice.
- Direct URL/API behavior:
  - Unpublished slug returns safe 404.
- Sensitive data avoided in evidence:
  - No secrets, vote codes, raw user IDs, or private attendee lists were written into the report.

## 7. Tests And Evidence

- Tests added or updated:
  - None; no test framework exists yet.
- Validation commands run:

```bash
pnpm run prisma:validate
pnpm run prisma:generate
pnpm run lint
pnpm run build
git diff --check -- prisma/schema.prisma src/application/events/dto.ts src/application/events/mappers.ts src/server/repositories/weekly-public-event-repository.ts src/app/api/public/events/[slug]/route.ts src/app/w/[slug]/page.tsx
curl -i http://localhost:3000/api/public/events/not-published-yet
curl -i http://localhost:3000/w/not-published-yet
```

- Results:
  - Prisma validate passed.
  - Prisma generate passed.
  - Lint passed.
  - Build passed.
  - Targeted diff check passed.
  - Public API for missing/unpublished slug returned 404 JSON.
  - Public page for missing/unpublished slug returned 404 HTML.
- Evidence files generated:
  - This report.

## 8. Decisions Needed

- Product questions:
  - Confirm `/w/[slug]` as the public URL format.
  - Decide whether public page may show any member names.
  - Decide whether guests can vote.
  - Decide default result visibility for 長冠軍之星.
- Design questions:
  - Decide whether the public page should look like an event board, stage screen, or mobile attendee page first.
- Architecture questions:
  - Approve shared room code for MVP, or require per-attendee one-time codes.
  - Add stronger admin role policy before publish controls.

## 9. Next Recommended Task

```text
Approve prisma db push for WEEKLY-PUBLIC-002, then implement WEEKLY-PUBLIC-005 admin publish controls so an admin can generate publicSlug/publicStatus and produce the first published /w/[slug] page.
```
