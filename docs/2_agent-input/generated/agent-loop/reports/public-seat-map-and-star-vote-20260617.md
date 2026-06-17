# Public Seat Map And Star Vote Report

Date: 2026-06-17
Batch / slice: WEEKLY-PUBLIC-004, STAR-VOTE-001, STAR-VOTE-002

## 1. User-Visible Result

- `/w/[slug]` now shows the actual published seat map, not only summary cards.
- `/w/[slug]/vote` now exists.
- `/admin` now includes a 長冠軍之星 poll panel.
- Admin can create an open poll in either:
  - code-gated mode with a generated room code
  - public mode where visitors can vote directly
- Public voters select a candidate by clicking the seat map.

## 2. Product Scope

- Included:
  - Public seat map DTO.
  - Public seat map UI.
  - Admin poll creation UI.
  - Room-code and public vote modes.
  - Vote access token API.
  - Vote submission API.
- Not included:
  - Candidate removal UI.
  - Result visibility controls.
  - Poll close/reveal UI.
  - Rate limiting.

## 3. Frontend Changes

- Files changed:
  - `src/app/w/[slug]/page.tsx`
  - `src/app/w/[slug]/vote/page.tsx`
  - `src/app/admin/page.tsx`
  - `src/components/public-seat-map.tsx`
  - `src/components/public-vote-client.tsx`
  - `src/components/admin-poll-controls.tsx`

## 4. Backend / API / Server Changes

- Files changed:
  - `src/application/events/dto.ts`
  - `src/application/events/mappers.ts`
  - `src/server/repositories/weekly-public-event-repository.ts`
  - `src/server/repositories/live-poll-repository.ts`
  - `src/app/api/admin/access/route.ts`
  - `src/app/api/admin/events/[weekId]/polls/route.ts`
  - `src/app/api/public/events/[slug]/polls/[pollId]/access/route.ts`
  - `src/app/api/public/events/[slug]/polls/[pollId]/votes/route.ts`
- API routes added:
  - `GET /api/admin/events/[weekId]/polls`
  - `POST /api/admin/events/[weekId]/polls`
  - `POST /api/public/events/[slug]/polls/[pollId]/access`
  - `POST /api/public/events/[slug]/polls/[pollId]/votes`

## 5. Data / System Architecture

- Uses existing `LivePoll`, `LivePollOption`, and `LivePollVote` models.
- No Prisma schema change was required.
- Room code is stored as a hash only.
- Vote token is short-lived and stored as a hash after submission to prevent token reuse.
- Candidate options are generated from the latest persisted seat map.

## 6. Privacy And Security Boundaries

- Public seat map now exposes occupant names because the requested voting workflow depends on seat-position candidate selection.
- Admin poll APIs require the temporary admin password cookie.
- Room vote code is displayed only when a poll is created.
- This is still lightweight event voting, not election-grade identity verification.

## 7. Tests And Evidence

Commands run:

```bash
pnpm run lint
pnpm run build
git diff --check -- src/application/events/dto.ts src/application/events/mappers.ts src/server/repositories/weekly-public-event-repository.ts src/server/repositories/live-poll-repository.ts src/app/api/admin/access/route.ts src/app/api/admin/events/[weekId]/polls/route.ts src/app/api/public/events/[slug]/polls/[pollId]/access/route.ts src/app/api/public/events/[slug]/polls/[pollId]/votes/route.ts src/components/public-seat-map.tsx src/components/public-vote-client.tsx src/components/admin-poll-controls.tsx src/app/w/[slug]/page.tsx src/app/w/[slug]/vote/page.tsx src/app/admin/page.tsx
GET /api/public/events/2026-06-11-5a3b37
GET /w/2026-06-11-5a3b37
GET /api/admin/events/2026-06-11/polls without admin cookie
GET /api/admin/events/2026-06-11/polls with admin cookie
GET /w/2026-06-11-5a3b37/vote
```

Results:

- Lint passed.
- Build passed.
- Targeted diff check passed.
- Public event API returned 41 seats.
- Public page rendered public seat map.
- Admin poll API returned 401 without admin cookie.
- Admin poll API returned `{"polls":[]}` with admin cookie.
- Vote page rendered empty-poll state before a poll is created.

## 8. Decisions Needed

- Decide whether guests and proxy seats should be eligible candidates. Current implementation excludes guest and empty seats, includes member/role/proxy/top seats.
- Decide whether public seat map names are acceptable long-term or should be configurable.
- Decide whether public voting mode should be disabled after event starts unless admin explicitly opens it.

## 9. Next Recommended Task

```text
Open /admin, enter the temporary admin password, create a 長冠軍之星 poll, copy the room code if code-gated, then test /w/[slug]/vote by selecting a seat candidate.
```
