# Weekly Public Admin Publish Report

Date: 2026-06-17
Batch / slice: WEEKLY-PUBLIC-002 approved db push, partial WEEKLY-PUBLIC-005
Task IDs: Prisma db push, admin event publication API, `/seats` publish controls

## 1. User-Visible Result

- Pages/routes now visible:
  - `/seats` now includes an admin-only public page publication control panel.
  - `/api/admin/events/[weekId]`
- What the user can click/try:
  - After Google sign-in on `/seats`, admin can generate a public slug, publish, hide, and archive the weekly public page.
  - Public page URL appears as `/w/[slug]` after slug generation.
- Screenshots or browser evidence:
  - Manual browser proof is still required after Google sign-in.

## 2. Product Scope

- PRD/plan references:
  - `docs/01_product-requirements/PRD-002_weekly-public-event-page-and-anonymous-star-voting.md`
  - `docs/05_execution-plans/PLN-003_weekly-public-page-and-star-voting-batch-plan.md`
  - `docs/08_acceptance-and-qa/ACC-003_weekly-public-page-and-star-voting-acceptance.md`
- Included:
  - Approved `prisma db push`.
  - Admin publication DTO and action normalization.
  - Admin publication repository.
  - Admin GET/PATCH route.
  - `/seats` publication controls.
- Not included:
  - Real browser Google sign-in proof.
  - Actual public page publish action by Codex.
  - Public page screenshot with a published slug.
  - Live poll setup/voting.

## 3. Frontend Changes

- Files changed:
  - `src/components/event-publication-controls.tsx`
  - `src/app/seats/page.tsx`
- Components/routes added:
  - `EventPublicationControls`
- UI states covered:
  - Auth loading.
  - Signed-out prompt.
  - Signed-in publication status.
  - Generate link, publish, hide, archive actions.
  - Success/error messages.
- Responsive notes:
  - Control panel uses wrapping actions and compact text so it can sit above the seating workspace.

## 4. Backend / API / Server Changes

- Files changed:
  - `src/application/events/publication.ts`
  - `src/server/repositories/event-publication-repository.ts`
  - `src/app/api/admin/events/[weekId]/route.ts`
- DTOs/contracts:
  - `AdminEventPublicationDTO`
  - `PublicEventPublishAction`
- Server actions/route handlers:
  - `GET /api/admin/events/[weekId]`
  - `PATCH /api/admin/events/[weekId]`
- Error states:
  - Unauthenticated admin requests return 401.
  - Missing meeting session returns 404.
  - Unsupported publication action returns 400.

## 5. Data / System Architecture

- Models/state introduced or touched:
  - `MeetingSession.publicSlug`
  - `MeetingSession.publicStatus`
  - `MeetingSession.publicConfig`
  - `OperationLog`
- Repository/application/domain boundaries:
  - Admin route calls repository and returns admin publication DTO.
  - Public DTO/API remains separate from admin publication DTO/API.
- Persistence notes:
  - User explicitly approved `pnpm run prisma:push`.
  - Prisma reported the MongoDB database `take-seat` was already in sync with the schema.
  - Admin publication actions will mutate MongoDB only when a signed-in user clicks controls or calls the admin API.

## 6. Privacy And Security Boundaries

- Public DTO:
  - Unchanged in this slice.
- Member DTO:
  - Not added in this slice.
- Staff/Admin DTO:
  - Publication DTO includes slug/status only, not private attendee data.
- Direct URL/API behavior:
  - Admin GET/PATCH require Google sign-in.
  - Public missing/unpublished slug returns safe 404.
- Sensitive data avoided in evidence:
  - No auth secrets, raw cookies, tokens, or vote codes were written into docs.

## 7. Tests And Evidence

- Tests added or updated:
  - None; no test framework exists yet.
- Validation commands run:

```bash
pnpm run prisma:push
pnpm run lint
pnpm run build
curl -i http://localhost:3200/api/admin/events/2026-06-11
curl -i -X PATCH http://localhost:3200/api/admin/events/2026-06-11 -H 'Content-Type: application/json' --data '{"action":"generate_slug"}'
curl -i http://localhost:3200/api/public/events/not-published-yet
```

- Results:
  - `prisma db push` passed and generated Prisma Client.
  - Lint passed.
  - Build passed.
  - Unauthenticated admin GET returned 401.
  - Unauthenticated admin PATCH returned 401.
  - Public missing/unpublished slug returned 404 JSON.
- Evidence files generated:
  - This report.

## 8. Decisions Needed

- Product questions:
  - Confirm whether `/w/[slug]` is final public route shape.
  - Confirm whether public page can show any names.
  - Confirm whether guests can vote.
  - Confirm default result visibility.
- Design questions:
  - Decide whether admin publish panel belongs permanently in `/seats` or should move to `/admin/events/[weekId]`.
- Architecture questions:
  - Add stronger admin role policy before real public use.
  - Decide whether slug rotation is required before vote work.

## 9. Next Recommended Task

```text
Manually sign in on /seats, generate a public slug, publish the weekly page, then verify /w/[slug]. After that, implement STAR-VOTE-001 poll admin setup for 長冠軍之星.
```
