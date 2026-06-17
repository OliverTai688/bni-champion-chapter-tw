# PRD-002: Weekly Public Event Page And Anonymous Star Voting

Status: Research Draft
Date: 2026-06-17

## Purpose

Define how `take-seat` should generate one shareable weekly public event page from the admin seating workspace.

The admin page is the generator and editor. The public page is a controlled read/participation surface:

- Some visitors can only view the published weekly seat/event state.
- Some visitors can perform specific actions, such as entering an event code to join anonymous voting.
- Admins can prepare, publish, pause, close, and archive the weekly page.

The first voting use case is the weekly "長冠軍之星" selection.

## Product Thesis

Each weekly event should have two separate surfaces:

| Surface | Primary user | Purpose |
| --- | --- | --- |
| Admin generator | Admin/authorized organizer | Build the seat map, configure public visibility, create vote, publish weekly page |
| Weekly public page | Members, guests, public viewers | View safe event state and complete scoped actions such as anonymous voting |

This separation keeps the current `/seats` editing workflow powerful while preventing the public page from inheriting admin-only data or controls.

## Current Baseline

Implemented today:

- `/seats` is the admin-oriented seating workspace.
- Google sign-in is available.
- MongoDB persistence exists for seat map drafts.
- Public API summary can be read without sign-in.
- Admin API view and draft save require sign-in.

Missing today:

- No weekly public page route.
- No publish workflow.
- No stable public slug/token.
- No vote code model.
- No poll/vote model.
- No public page visibility configuration.
- No anonymous vote anti-duplication rules.

## Personas

| Persona | Needs |
| --- | --- |
| Admin | Generate the weekly event page, preview it, publish it, open/close voting, inspect results |
| Member attendee | Open the weekly page, confirm event status, use a code to vote anonymously |
| Guest/public viewer | View public-safe event information without seeing private member details |
| Staff | Help attendees access voting code or confirm whether voting is open |

## Weekly Lifecycle

```txt
Draft seat map
-> configure public page
-> preview
-> publish
-> event live
-> open anonymous vote
-> close vote
-> show configured result
-> archive weekly page
```

## Routes

Recommended routes:

| Route | Access | Purpose |
| --- | --- | --- |
| `/seats` | Signed-in admin | Current admin generator/editor |
| `/events/[weekId]` | Public or code-gated | Weekly public event page |
| `/events/[weekId]/vote` | Code-gated | Anonymous voting entry and vote form |
| `/admin/events/[weekId]` | Signed-in admin | Publish settings, vote setup, result controls |

Alternative route if shorter URLs are preferred:

- `/w/[publicSlug]` for public sharing.
- Keep `weekId` internal and use a random public slug in links.

Recommendation: use `publicSlug` for shared URLs, while keeping `weekId` for admin/API lookup.

## Public Page Content

The public weekly page should support configurable sections:

- Event title, date, chapter name, meeting state.
- Anonymous seat map summary.
- Seat/table occupancy status.
- Public agenda or current segment.
- Voting call-to-action when voting is open.
- Result panel when admin chooses to reveal results.
- Post-event recap after archive/completion.

Public seat map rules:

- OK: table/seat occupancy, available/reserved/check-in counts, current event phase.
- Maybe OK: public business profile cards if explicitly marked public.
- Not OK: private attendee list, email, phone, raw member IDs, confirmation codes, admin notes, full voting audit.

## Anonymous Voting Use Case: 長冠軍之星

Goal:

- During a weekly event, attendees can vote for one person as the weekly 長冠軍之星.
- Voting should feel lightweight: enter code, pick candidate, submit.
- Public participation can be anonymous, but admin audit must still protect against obvious abuse.

Suggested behavior:

- Admin creates a `LivePoll` tied to the weekly meeting.
- Poll type: `single_choice`.
- Eligibility: `code_required`.
- Voter enters an event code before seeing/submitting the ballot.
- Vote record stores no display name by default.
- Vote record stores a hashed voter token or hashed code/session fingerprint for duplicate prevention.
- Admin can configure result visibility:
  - hidden
  - show after closed
  - show live totals
  - admin-only

First version candidate source:

- Candidates can come from active members in the week roster.
- Admin can remove ineligible candidates before opening voting.
- Admin can add a short public label such as name plus business category if privacy rules allow it.

## Code And Access Model

There are three different "codes" to avoid mixing concerns:

| Code/token | Audience | Purpose |
| --- | --- | --- |
| `publicSlug` | Anyone with link | Opens weekly public page |
| `voteCode` | Event attendees | Unlocks anonymous vote |
| `admin session` | Admin only | Edit/publish/inspect audit |

Recommended vote code behavior:

- Code is short enough to announce verbally or show on screen.
- Code is stored hashed, not plaintext, if long-lived.
- Code has active time window.
- Code can be rotated by admin.
- Code unlocks participation but does not grant admin access.

Open decision:

- Whether one shared event code is enough for MVP, or whether every attendee should receive a one-time code.

MVP recommendation:

- Start with one shared event code plus duplicate-reduction by browser/session fingerprint.
- Move to per-attendee one-time code only if fairness/audit needs increase.

## Admin Generator Requirements

The admin workflow should include:

- Draft seat map editing.
- Publish settings:
  - public page enabled/disabled
  - public slug
  - visible sections
  - public seat map detail level
  - event state: draft/scheduled/live/completed/archived
- Vote setup:
  - title
  - description
  - candidate list
  - eligibility mode
  - vote code
  - open/close time
  - result visibility
- Preview public page before publishing.
- Publish/close/archive actions with operation logs.

Admin should never need to copy raw database IDs.

## Data Model Implications

Likely models or fields:

- `MeetingSession.publicSlug`
- `MeetingSession.publicStatus`
- `MeetingSession.publicConfig`
- `LivePoll`
- `LivePollOption`
- `LivePollVote`
- `VoteAccessCode` or poll fields for hashed code config
- `OperationLog` entries for publish, unpublish, open poll, close poll, reveal results

Public DTO examples:

- `PublicWeeklyEventDTO`
- `PublicSeatMapSummaryDTO`
- `PublicPollDTO`
- `VoteAccessDTO`
- `VoteResultDTO`

Admin DTO examples:

- `AdminWeeklyEventDTO`
- `AdminPollDTO`
- `AdminVoteAuditDTO`

## Privacy And Abuse Controls

Required controls:

- Public route must use public DTOs only.
- Vote submission must not trust client-side poll state.
- Closed polls reject new votes.
- Vote code attempts should be rate-limited later.
- Raw vote code should not be written into operation logs.
- Vote audit should avoid displaying unnecessary identifiers.

MVP duplicate-reduction options:

- Browser-local voted marker.
- Hashed user agent/IP bucket if legally acceptable and documented.
- Hashed vote code plus random client nonce stored server-side.
- Signed anonymous voting token after code validation.

Recommendation:

- Use a two-step vote flow:
  1. `POST /api/public/events/[slug]/polls/[pollId]/access` with code.
  2. Server returns short-lived signed anonymous vote token.
  3. `POST /api/public/events/[slug]/polls/[pollId]/votes` with token and option.

## MVP Acceptance

- Admin can create or update a weekly public page from the current meeting.
- Public page can be opened without admin auth and exposes no private fields.
- Admin can open a 長冠軍之星 poll.
- Visitor can enter code and submit one anonymous vote.
- Closed poll rejects new votes.
- Admin can close poll and view results.
- Public result visibility follows admin setting.
- Lint/build pass.
- API evidence proves public/admin DTO separation.

## Open Questions

- Should the public weekly page show individual seat names to members only, or remain anonymous for everyone in MVP?
- Is the vote code shared for the whole room, or should every attendee receive a unique code?
- Should guests be eligible to vote for 長冠軍之星?
- Should results be shown live, after close, or only by admin announcement?
- Should `/seats` be renamed or supplemented with `/admin/seats` before public pages launch?
