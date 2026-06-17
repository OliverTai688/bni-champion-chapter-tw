# PLN-003: Weekly Public Page And Star Voting Batch Plan

Status: Research Plan
Date: 2026-06-17

## Goal

Build a weekly generated public event page from the admin seating workspace, with optional code-gated anonymous voting for the weekly 長冠軍之星.

## Batch Order

| Batch | Focus | Goal |
| --- | --- | --- |
| WEEKLY-PUBLIC-001 | Public Page Research | Define routes, visibility, code-gated actions |
| WEEKLY-PUBLIC-002 | Schema Prep | Add public slug/status/config and poll models |
| WEEKLY-PUBLIC-003 | Public Event DTO/API | Return safe weekly public event data |
| WEEKLY-PUBLIC-004 | Public Page UI | Build shareable weekly page |
| WEEKLY-PUBLIC-005 | Admin Publish UI | Let admin preview/publish/hide weekly page |
| STAR-VOTE-001 | Poll Admin Setup | Create 長冠軍之星 poll and candidates |
| STAR-VOTE-002 | Code-Gated Voting | Let visitor enter code and submit anonymous vote |
| STAR-VOTE-003 | Results And Close Flow | Close poll and reveal results by admin setting |
| MULTI-DAY-001 | Multi-Day Seat Map Targeting | Select or create the event day before poll creation |
| WEEKLY-QA-001 | Privacy And Abuse QA | Verify public/admin boundaries and duplicate handling |

## WEEKLY-PUBLIC-001 - Public Page Research

Tasks:

- [x] Capture user requirement that `/seats` is the admin generator/editor.
- [x] Define public page vs admin generator surfaces.
- [x] Define vote code access concept.
- [x] Produce PRD and architecture docs.

Acceptance:

- Docs explain read-only public view and scoped public actions.
- Docs distinguish `publicSlug`, `voteCode`, and admin auth.

## WEEKLY-PUBLIC-002 - Schema Prep

Tasks:

- [x] Add `publicSlug`, `publicStatus`, and `publicConfig` to `MeetingSession`.
- [x] Add `LivePoll`, `LivePollOption`, and `LivePollVote`.
- [x] Add enum values for poll status, eligibility, result visibility.
- [x] Add unique indexes for slug and duplicate vote token policy.
- [x] Run `prisma:validate` and `prisma:generate`.
- [x] Run `prisma:push` only after explicit user approval.

Acceptance:

- Schema supports one or more polls per weekly event.
- Public publishing config can exist without exposing admin fields.
- No real DB mutation without approval.

## WEEKLY-PUBLIC-003 - Public Event DTO/API

Tasks:

- [x] Add `PublicWeeklyEventDTO`.
- [x] Add mapper from `MeetingSession` and latest published `SeatMap`.
- [x] Add `GET /api/public/events/[slug]`.
- [x] Ensure hidden/draft events do not leak data.
- [x] Add API proof that unpublished public event returns safe 404.
- [ ] Add API proof with a published fixture/record that public DTO excludes private fields.

Acceptance:

- Published weekly page data is readable without sign-in.
- Public response excludes emails, raw IDs, vote audit, and private notes.
- Unpublished page returns 404 or a safe unpublished state.

## WEEKLY-PUBLIC-004 - Public Page UI

Tasks:

- [x] Add `/w/[slug]` page.
- [x] Show event title/date/status.
- [x] Show anonymous seat map summary.
- [x] Show vote call-to-action when poll is open.
- [x] Show public seat map.
- [x] Add mobile-first layout.
- [ ] Capture browser screenshot with a published fixture/record.

Acceptance:

- Public route is useful on desktop and mobile.
- Page does not include admin controls.
- Browser proof is captured.

## WEEKLY-PUBLIC-005 - Admin Publish UI

Tasks:

- [x] Add admin publish controls near the current `/seats` workflow or in `/admin/events/[weekId]`.
- [x] Generate public slug.
- [x] Publish/hide/archive weekly page.
- [x] Write operation logs for publish changes.
- [ ] Rotate existing public slug.
- [ ] Preview public page state before publishing.
- [ ] Capture browser proof after manual Google login.

Acceptance:

- Admin can produce a shareable URL without touching raw IDs.
- Public page state follows admin publish settings.
- Auth and admin policy protect publish mutations.

## STAR-VOTE-001 - Poll Admin Setup

Tasks:

- [x] Add admin UI to create a 長冠軍之星 poll.
- [x] Candidate list defaults from active weekly seat map.
- [x] Admin can choose code-gated or public voting.
- [x] Admin can generate a room vote code.
- [ ] Admin can remove ineligible candidates.
- [ ] Admin can set result visibility.
- [ ] Admin can regenerate room vote code without recreating poll.

Acceptance:

- Poll can be created in draft and opened when ready.
- Raw vote code is not logged.
- Poll open/close state is persisted.

## STAR-VOTE-002 - Code-Gated Voting

Tasks:

- [x] Add `/w/[slug]/vote` page.
- [x] Add vote code form.
- [x] Add public direct-vote mode.
- [x] Add seat-map-based vote selection.
- [x] Add vote access API that returns short-lived anonymous token.
- [x] Add ballot submission API.
- [x] Add duplicate prevention for token reuse.

Acceptance:

- Invalid code is rejected.
- Closed poll rejects access and votes.
- Valid code can submit one anonymous vote.
- Vote record does not require display name or member identity.

## STAR-VOTE-003 - Results And Close Flow

Tasks:

- [x] Add admin close poll action.
- [x] Add admin results view.
- [x] Add admin anonymous CSV export.
- [ ] Add public result DTO based on result visibility.
- [ ] Add optional post-event public recap state.

Acceptance:

- Admin can close voting.
- Public results follow visibility setting.
- Admin can still inspect full aggregate result.

## MULTI-DAY-001 - Multi-Day Seat Map Targeting

Tasks:

- [x] Add admin event session list.
- [x] Add admin event session creation from the current seating template.
- [x] Require poll controls to be scoped to the selected event day.
- [x] Show selected day seat map counts before poll creation.
- [ ] Add dedicated per-day admin route.
- [ ] Add per-date seating editor instead of template cloning only.
- [ ] Add recurring batch generator for future weekly meetings.

Acceptance:

- Admin can choose which day's seat map a poll belongs to.
- New days create `MeetingSession` and latest `SeatMap` records.
- Poll creation uses the selected `weekId`, not a hardcoded current week.

## WEEKLY-QA-001 - Privacy And Abuse QA

Tasks:

- [ ] Test public event API for private field leaks.
- [ ] Test admin APIs return 401/403 without proper auth.
- [ ] Test vote duplicate handling.
- [ ] Test mobile public page.
- [ ] Save evidence under `docs/2_agent-input/generated/agent-loop/reports/`.

Acceptance:

- Public/admin boundary is proven by API evidence.
- Known abuse limitations are documented.
- `pnpm run lint` and `pnpm run build` pass.

## Manual Decisions Needed

- Public route shape: `/w/[slug]` is recommended; approve or choose `/events/[weekId]`.
- Vote code mode: shared room code is recommended for MVP; choose per-attendee codes only if stronger fairness is required.
- Public names: decide whether any member names appear on the public page.
- Voter eligibility: decide whether guests can vote.
- Result reveal: choose hidden, after-closed, live-public, or admin-only default.

## Likely Blockers

- OAuth/admin role policy is currently basic. Strong admin authorization should be added before public publish controls.
- Shared room code cannot fully prevent repeated votes from multiple devices.
- Any DB schema push requires explicit approval.
- Rate limiting is not implemented yet and should be planned before broad public sharing.
