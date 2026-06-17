# PRD-001: Live Seat Map, Attendance, And Member Voting

Status: Draft
Date: 2026-06-17

## Goal

Grow `take-seat` from a weekly seating tool into an event operating website for BNI 長冠軍分會.

The seat map should become the main live surface for:

- Before event: seat planning, attendee preparation, member/guest role setup.
- During event: progressive attendance display, staff check-in, member-facing seat guidance.
- During activity segments: member voting, group recommendation, stage/award moments.
- After event: public recap, member history, exportable operating evidence.

The seat map is not decoration. It is the visual read model for event operations.

## Current Baseline

Implemented now:

- `/seats` seating workspace.
- Drag-and-drop seat rearrangement.
- Weekly seed layouts in `src/lib/layout-*.ts`.
- Rule/roster editing.
- Validation summary and score.
- Browser local draft storage.
- CSV export and print/PDF route.

Known limits:

- No auth or member identity.
- No backend persistence.
- No multi-week/event list UI.
- No attendance/presence states.
- No public/member/admin visibility split.
- No live poll/voting model.

## Users

| User | Needs |
| --- | --- |
| Public visitor | See event existence and anonymous live summary only |
| Registered attendee | Find own seat/table and check event state |
| Member | See own seat, allowed tablemate cards, vote in member polls |
| Staff | Scan/check in attendees and view scoped attendance summary |
| Admin | Configure seat maps, assign seats, manage attendance, open polls, export evidence |

## MVP Scope

### Website Completeness

- Replace the landing-only experience with a usable event/seating entry.
- Add an events or meetings surface for current and upcoming sessions.
- Support before/live/after states.
- Keep public live summary anonymous.

### Seat Map

- Model tables, seats, rows/columns, zones, capacity, and assignment status.
- Preserve the current BNI weekly meeting layout as the first supported layout style.
- Support states: empty, assigned, checked-in, absent, canceled, reserved.
- Support CSV export for seat and attendance operations.

### Attendance

- Allow check-in state to update the seat map.
- Support manual admin/staff marking with a required reason.
- Show checked-in-but-unassigned attendees in a separate list.
- Keep attendance transitions auditable.

### Member Voting

- Allow admin to create a live poll tied to a meeting/session.
- Support single choice, multiple choice, limited points, and group recommendation.
- Require login for member-only polls once auth exists.
- Keep poll result visibility configurable: hidden, member-only, public.

## Non-MVP

- Theater-style paid self seat selection.
- Real indoor positioning.
- Realtime multiplayer editing.
- Replacing BNI official systems.
- Automatically converting live poll votes into any formal external ranking.

## Visibility Rules

| View | Allowed data |
| --- | --- |
| Public | Capacity, assigned count, checked-in count, anonymous table occupancy, public stage/poll summary |
| Member | Own assignment, own check-in state, allowed public tablemate profile cards, eligible polls |
| Staff | Check-in status, confirmation lookup, scoped attendee operational details |
| Admin | Full names, roles, assignment details, attendance log, poll audit, exports |

Public DTOs must never include email, raw IDs, confirmation codes, private notes, or full attendee lists.

## Success Criteria

- Admin can complete weekly seating and event-day attendance without raw-ID workflows.
- Members can understand where to sit and whether they can vote.
- Public visitors can see event momentum without private data exposure.
- Staff/admin actions produce evidence and reasoned audit records.
- Desktop and mobile layouts remain readable and operable.
