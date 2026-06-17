# ARC-001: Live Seat Map, Attendance, And Voting Architecture

Status: Draft
Date: 2026-06-17

## Current System Shape

Current route/data flow:

```txt
src/lib/layout-*.ts
-> src/lib/seating-week.ts
-> src/app/seats/page.tsx
-> src/components/SeatingArranger.tsx
-> localSeatingWorkspaceRepository
-> CSV and print route
```

The system is currently frontend-heavy and local-first. This is acceptable for the current workspace, but live attendance and voting need clearer domain, application, and visibility boundaries.

## Target Layers

Recommended future structure:

```txt
src/domain/seating/       pure seat map rules and transitions
src/domain/events/        meeting/session/event state rules
src/domain/polls/         poll rules and vote validation
src/application/          DTOs, use cases, repository ports
src/infra/                persistence, export, external adapters
src/app/                  App Router pages, route handlers, server actions
src/components/           shared and feature UI components
```

Do not introduce all folders at once. Add them when a real batch needs them.

## Domain Concepts

### Seat Map

- `MeetingSession`: a weekly meeting or event session.
- `SeatMap`: published or draft layout for one session.
- `Seat`: table/row/column/zone/capacity position.
- `SeatAssignment`: attendee/member assigned to a seat.
- `SeatStatus`: empty, assigned, checked-in, absent, canceled, reserved.
- `WorkspaceDraft`: editable admin state before publish.

### Attendance

- `AttendanceRecord`: check-in or manual presence mark.
- `AttendanceSource`: qr, staff, admin, import.
- `PresenceReadModel`: safe summary powering the seat map.
- Manual attendance changes require a reason.

### Voting

- `LivePoll`: poll bound to a session.
- `LivePollOption`: choice or target.
- `LivePollVote`: member/attendee vote.
- `PollVisibility`: hidden, member-only, public.

## DTO Boundaries

Create explicit DTOs per audience:

- `PublicSeatMapDTO`: anonymous counts and table occupancy only.
- `MemberSeatMapDTO`: viewer assignment and permitted tablemate cards.
- `StaffAttendanceDTO`: check-in workflow data scoped to staff role.
- `AdminSeatMapDTO`: full operational details.

Never pass admin DTOs into public/member Client Components.

## Next.js 16 Rules

Before route or data changes, read the relevant local docs in `node_modules/next/dist/docs/`.

Key current rules from the docs:

- App Router uses filesystem routing under `src/app`.
- Pages and layouts are Server Components by default.
- Client Components are required for state, event handlers, lifecycle logic, and browser APIs.
- Data security should prefer a Data Access Layer or explicit HTTP API/BFF style; whichever path is chosen, keep authorization and DTO minimization centralized.

Current implication:

- `SeatingArranger` remains a Client Component because it uses drag-and-drop, state, and localStorage.
- Future attendance/voting reads should enter Client Components through sanitized DTOs.
- Secrets and privileged data access must stay server-side.

## Persistence Evolution

Current interface:

```ts
interface SeatingWorkspaceRepository {
  load(weekId: string): SeatingWorkspaceState | null;
  save(state: SeatingWorkspaceState): void;
  clear(weekId: string): void;
}
```

Preserve this port-like idea when adding backend persistence. Add server repositories behind application use cases rather than binding UI directly to storage details.

Possible future tables/models:

- `members`
- `meeting_sessions`
- `seat_maps`
- `seats`
- `seat_assignments`
- `attendance_records`
- `live_polls`
- `live_poll_options`
- `live_poll_votes`
- `operation_logs`

Migration or production DB mutation requires explicit user approval.

## Security Rules

- Public seat map cannot include names unless explicitly configured for a post-event public recap.
- Member view cannot reveal another member's private contact data.
- Staff check-in cannot expose admin-only notes or exports.
- Admin operations that change attendance, assignment, poll status, or exports should be logged.
- Confirmation codes must be treated as secrets.
- Screenshots and reports must avoid raw tokens, cookies, and private attendee exports.

## UI Architecture Direction

The future live UI should be split into:

- Seat map canvas/grid.
- Attendance/status sidebar.
- Member "my seat" panel.
- Staff check-in panel.
- Admin cockpit controls.
- Poll panel and result surface.

Keep the current grid useful for weekly BNI meetings; do not replace it with a generic event UI until equivalent seating operations are preserved.
