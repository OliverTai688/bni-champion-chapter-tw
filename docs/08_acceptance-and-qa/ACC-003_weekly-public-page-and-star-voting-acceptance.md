# ACC-003: Weekly Public Page And Star Voting Acceptance

Status: Research Acceptance
Date: 2026-06-17

## Purpose

Define acceptance checks for the weekly public event page and anonymous 長冠軍之星 voting.

## Public Page Acceptance

- A published weekly event has a stable shareable URL.
- A hidden/draft weekly event does not expose private data.
- Public page loads without Google sign-in.
- Public page shows:
  - event title
  - date
  - chapter name
  - event status
  - anonymous seat/attendance summary
  - vote call-to-action only when applicable
- Public page does not show:
  - admin controls
  - private attendee notes
  - emails
  - raw IDs
  - vote audit trail
  - unpublished poll configuration

## Admin Generator Acceptance

- Admin can generate or rotate a public slug.
- Admin can preview public page state before publishing.
- Admin can publish, hide, and archive the weekly page.
- Admin publish actions require sign-in and admin authorization.
- Admin publish actions create operation logs.
- Admin can configure which public sections are visible.

## Anonymous Voting Acceptance

- Admin can create a 長冠軍之星 poll for a weekly event.
- Admin can choose candidates from the weekly roster.
- Admin can open and close the poll.
- Visitor can enter a valid vote code and submit one vote.
- Invalid vote code is rejected.
- Closed poll rejects new votes.
- Duplicate token reuse is rejected.
- Anonymous vote record does not require member name or email.
- Public result visibility follows admin setting.

## API Evidence Required

Run or create equivalent checks:

```txt
GET /api/public/events/[slug]
GET /api/public/events/[hiddenSlug]
POST /api/public/events/[slug]/polls/[pollId]/access with invalid code
POST /api/public/events/[slug]/polls/[pollId]/access with valid code
POST /api/public/events/[slug]/polls/[pollId]/votes with token
POST /api/public/events/[slug]/polls/[pollId]/votes reusing token
GET /api/admin/events/[weekId] without auth
PATCH /api/admin/events/[weekId] without auth
```

Expected:

- Public published event returns 200 and safe DTO.
- Hidden/draft event returns 404 or safe unpublished response.
- Invalid code returns 401 or 403.
- Valid code returns a short-lived vote token.
- First valid vote succeeds.
- Duplicate token vote fails.
- Admin routes fail without auth.

## Browser Evidence Required

Capture desktop and mobile checks for:

- `/w/[slug]` public page.
- `/w/[slug]/vote` vote access and ballot.
- Admin publish controls.
- Admin poll setup and result close/reveal flow.

## Manual Checks

- Confirm public route shape with product owner.
- Confirm whether public names may appear.
- Confirm whether guests may vote.
- Confirm default result visibility.
- Confirm whether shared room code is acceptable for MVP.

## Known Risk Acceptance

Shared event vote code is not election-grade security. It is acceptable for lightweight room participation if:

- The UI communicates that the vote is event participation, not formal identity-verified voting.
- Admin can close voting quickly.
- Duplicate-reduction exists.
- Future per-attendee one-time codes remain possible.
