# ARC-003: Weekly Public Page And Vote Access Architecture

Status: Research Draft
Date: 2026-06-17

## Scope

This architecture note describes how to add a weekly public page and anonymous code-gated voting while keeping `/seats` as the admin generator/editor.

## Boundary Principle

Use separate routes, DTOs, and mutations for each audience.

```txt
Admin generator (/seats or /admin/events/[weekId])
-> publish config
-> public weekly page (/w/[publicSlug] or /events/[weekId])
-> optional code-gated actions
```

The public page must never consume the admin seat map DTO directly.

## Recommended Route Shape

| Route | Component type | Access |
| --- | --- | --- |
| `/seats` | Admin editor UI | Auth required for MongoDB sync |
| `/admin/events/[weekId]` | Admin publish/poll cockpit | Auth + admin policy |
| `/w/[publicSlug]` | Public weekly page | Public |
| `/w/[publicSlug]/vote` | Vote access and ballot | Public route, code-gated action |

API routes:

| API | Access | Notes |
| --- | --- | --- |
| `GET /api/public/events/[slug]` | Public | Public weekly DTO only |
| `POST /api/public/events/[slug]/polls/[pollId]/access` | Public | Validates vote code, returns short-lived vote token |
| `POST /api/public/events/[slug]/polls/[pollId]/votes` | Vote token | Submits anonymous vote |
| `GET /api/admin/events/[weekId]` | Admin | Full publish/poll config |
| `PATCH /api/admin/events/[weekId]` | Admin | Update publish config |
| `POST /api/admin/events/[weekId]/polls` | Admin | Create/open poll |
| `PATCH /api/admin/polls/[pollId]` | Admin | Close/reveal/archive poll |

## Data Model Additions

Suggested Prisma additions:

```txt
MeetingSession
  publicSlug String? @unique
  publicStatus draft | preview | published | live | completed | archived | hidden
  publicConfig Json?

LivePoll
  sessionId
  title
  description
  type single_choice | multiple_choice
  status draft | open | closed | archived
  eligibility public | code_required | signed_in_member
  resultVisibility hidden | after_closed | live_public | admin_only
  voteCodeHash?
  opensAt?
  closesAt?

LivePollOption
  pollId
  label
  memberId?
  publicDescription?
  position
  isActive

LivePollVote
  pollId
  optionId
  anonymousVoterHash?
  tokenHash?
  submittedAt
  metadata?
```

Notes:

- `publicSlug` should be random enough for sharing and not guessable from database IDs.
- `voteCodeHash` should not store the room code in plaintext if the code survives longer than the event.
- `LivePollVote` should not need member identity for anonymous room-code voting.
- If later a member-only poll is needed, add separate identity-aware vote fields and DTOs.

## DTO Separation

Public weekly event DTO:

```ts
type PublicWeeklyEventDTO = {
  slug: string;
  title: string;
  date: string;
  status: 'scheduled' | 'live' | 'completed';
  seatSummary: {
    totalSeats: number;
    assignedCount: number;
    checkedInCount: number;
    occupancyByZone: Array<{ zone: string; assigned: number; checkedIn: number; capacity: number }>;
  };
  activePolls: PublicPollDTO[];
};
```

Public poll DTO:

```ts
type PublicPollDTO = {
  id: string;
  title: string;
  status: 'open' | 'closed';
  eligibility: 'code_required' | 'public';
  resultVisibility: 'hidden' | 'after_closed' | 'live_public';
  options?: Array<{ id: string; label: string; publicDescription?: string }>;
  results?: Array<{ optionId: string; label: string; count: number }>;
};
```

Admin poll DTO may include:

- vote count
- invalid/duplicate attempts
- internal option/member IDs
- publish settings
- audit logs

It should still avoid exposing raw vote codes.

## Vote Token Flow

Recommended MVP flow:

```txt
Visitor opens /w/[slug]/vote
-> enters room vote code
-> API validates code and poll state
-> API returns short-lived signed anonymous vote token
-> visitor submits option with token
-> API verifies token, duplicate policy, poll state
-> vote is stored
```

Benefits:

- The actual vote code is not sent with the final vote request.
- The public ballot does not need admin auth.
- Poll closing can be enforced server-side.
- Duplicate prevention can improve later without rewriting the public UI.

## Duplicate Policy

MVP duplicate prevention can combine:

- one browser-local "voted" marker for UX
- one server-side `tokenHash` uniqueness check
- short token TTL

Better future options:

- per-attendee one-time vote codes
- signed QR tokens
- member login for member-only votes

Open risk:

- A shared room code cannot perfectly prevent repeated voting across multiple browsers/devices. This is acceptable only if the product goal is lightweight participation, not formal election-grade voting.

## Publishing Rules

Admin actions:

- generate public slug
- preview public DTO
- publish public page
- hide/unpublish public page
- open poll
- close poll
- reveal results
- archive weekly page

Every state-changing admin action should create an `OperationLog`.

State rules:

- Hidden/draft public page returns 404 or unpublished message.
- Published page can show scheduled/live/completed state.
- Closed poll rejects vote access and vote submission.
- Archived page is read-only.

## Security And Privacy Rules

- Public page uses only public DTOs.
- Admin generator uses admin DTOs and signed-in admin policy.
- Never expose:
  - emails
  - raw user IDs
  - raw vote codes
  - private notes
  - full attendee lists
  - vote audit trail
- Never log plaintext vote codes.
- Do not rely on Client Components for authorization.
- Rate limiting should be added before real public launch.

## Integration With Current Codebase

Existing reusable foundation:

- `MeetingSession`, `SeatMap`, `Seat`, `SeatAssignment` can power public summaries.
- `OperationLog` can record publish and poll actions.
- `src/application/seating/mappers.ts` is the right place to extend DTO mapping patterns.
- `src/app/api/seats/[weekId]/route.ts` proves public/admin DTO split.
- `src/auth.ts` can gate admin actions.

Likely new folders:

```txt
src/application/events/
src/application/polls/
src/server/repositories/event-publication-repository.ts
src/server/repositories/poll-repository.ts
src/app/w/[slug]/page.tsx
src/app/w/[slug]/vote/page.tsx
src/app/api/public/events/[slug]/route.ts
src/app/api/public/events/[slug]/polls/[pollId]/access/route.ts
src/app/api/public/events/[slug]/polls/[pollId]/votes/route.ts
src/app/api/admin/events/[weekId]/route.ts
```

## Implementation Sequence

1. Add public event fields to schema and migration/db push after approval.
2. Add public DTO mapper from existing `MeetingSession` + latest published `SeatMap`.
3. Add read-only public route and page.
4. Add admin publish config route.
5. Add poll models and admin poll setup.
6. Add vote code validation and anonymous vote token.
7. Add public ballot UI.
8. Add result visibility and admin close/reveal controls.

## Manual Decisions Before Build

- Public URL shape: `/w/[slug]` or `/events/[weekId]`.
- Shared room code vs one-time attendee codes.
- Whether public seat map can show any names.
- Whether guests can vote.
- Result reveal policy for 長冠軍之星.
