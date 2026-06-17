# PLN-001: Live Seat Map, Attendance, And Voting Batch Plan

Status: Batch Plan
Date: 2026-06-17

## Goal

Move from the current local weekly seating workspace to a complete website and operating workflow with live seat map, attendance presence, and member voting.

## Batch Order

| Batch | Focus | Goal |
| --- | --- | --- |
| TAKE-DOCS-001 | Docs And Agent Loop | Establish repo-specific docs, AGENTS, batch loop |
| TAKE-AUDIT-001 | Codebase Audit | Confirm reusable components, current gaps, and contracts |
| TAKE-SITE-001 | Website Entry | Make the first screen useful and connect `/seats` clearly |
| TAKE-EVENT-001 | Meeting/Event Model | Add current/upcoming meeting abstraction without DB mutation |
| TAKE-SEAT-001 | Seat Map Contracts | Formalize seat statuses, DTOs, and repository ports |
| TAKE-SEAT-002 | Admin Cockpit | Add admin-facing seat map controls and state panels |
| TAKE-PRESENCE-001 | Attendance States | Add check-in/manual presence workflow and unassigned attendee list |
| TAKE-MEMBER-001 | Member Seat View | Show own seat and allowed tablemate data |
| TAKE-POLL-001 | Live Poll Foundation | Add poll setup, vote states, and result visibility |
| TAKE-QA-001 | Browser And Evidence | Verify public/member/staff/admin privacy boundaries |

## Batch TAKE-DOCS-001 - Docs And Agent Loop

- [x] Create docs folder structure.
- [x] Create root `AGENTS.md`.
- [x] Create product, architecture, feature, plan, and acceptance docs.
- [x] Create agent-loop instructions and report template.
- [ ] Produce first stop report if requested.

Acceptance:

- Docs are take-seat specific.
- References to `2026-nuvaclub` are workflow references only.
- Current source behavior is described accurately.

## Batch TAKE-AUDIT-001 - Codebase Audit

- Inventory current routes/components/lib/types.
- Identify which current UI can become public/member/admin surfaces.
- List missing model fields for attendance and poll states.
- Save report under `docs/2_agent-input/generated/agent-loop/reports/`.

Acceptance:

- No production code changes.
- Report lists reusable files and gaps.

## Batch TAKE-SITE-001 - Website Entry

- Replace landing-only home with a practical entry into current meeting/seating status.
- Keep `/seats` as the primary workspace.
- Add clear empty/loading/error states if data source changes.

Acceptance:

- Desktop and mobile first viewport exposes the product purpose and primary action.
- User can reach the seating workspace without confusion.
- `pnpm run lint` and `pnpm run build` pass or blockers are documented.

## Batch TAKE-EVENT-001 - Meeting/Event Model

- Introduce meeting/session list data shape.
- Keep seed-backed implementation first.
- Support before/live/after state at the data contract level.

Acceptance:

- Current week remains functional.
- Future persistence can replace seed data behind a repository/use-case boundary.

## Batch TAKE-SEAT-001 - Seat Map Contracts

- Add statuses: empty, assigned, checked-in, absent, canceled, reserved.
- Define public/member/staff/admin DTOs.
- Add transition rules for assignment and cancellation.

Acceptance:

- Public DTO cannot include private attendee fields.
- Types make invalid status transitions difficult to express.

## Batch TAKE-SEAT-002 - Admin Cockpit

- Add admin-oriented controls for seat status, assignment, and export.
- Keep reason capture for high-risk actions.
- Preserve drag-and-drop workflow.

Acceptance:

- Admin can operate without raw IDs in the UI.
- Mobile fallback remains usable.

## Batch TAKE-PRESENCE-001 - Attendance States

- Add attendance read model.
- Add checked-in/unassigned list.
- Add manual mark workflow with reason.

Acceptance:

- Checked-in seat visibly changes state.
- Unassigned checked-in attendee appears outside the seat grid.
- Canceled attendee cannot be marked as normal attendance without explicit exception handling.

## Batch TAKE-MEMBER-001 - Member Seat View

- Add member-facing "my seat" state.
- Restrict tablemate cards to public profile fields.
- Show clear states for no seat, not registered, not signed in, and not published.

Acceptance:

- Member cannot see another attendee's private data.
- Mobile 375px is readable and controls do not overlap.

## Batch TAKE-POLL-001 - Live Poll Foundation

- Add poll option and vote contracts.
- Add admin open/close state.
- Add member vote UI.
- Add result visibility control.

Acceptance:

- Closed polls reject new votes.
- Member-only polls require member identity once auth exists.
- Public result DTO differs from admin audit DTO.

## Batch TAKE-QA-001 - Browser And Evidence

- Verify relevant routes on desktop and mobile.
- Save screenshots/API notes under agent-loop reports.
- Run lint/build where applicable.

Acceptance:

- Public/member/staff/admin boundaries are proven or documented as blockers.
- Reports list exact commands and results.
