# ACC-001: Live Seat Map, Attendance, And Voting Acceptance

Status: Draft
Date: 2026-06-17

## Acceptance Policy

Do not mark a case `PASSED` without evidence.

Use:

- `PASSED`
- `FAILED`
- `BLOCKED`
- `MANUAL_REQUIRED`

Evidence should be saved under:

```txt
docs/2_agent-input/generated/agent-loop/reports/
```

## Baseline Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| BASE-001 | Open `/seats` | Current weekly seating workspace renders |
| BASE-002 | Drag a seat | Seat order updates without losing roster metadata |
| BASE-003 | Save draft | Draft persists under the current `weekId` localStorage key |
| BASE-004 | Export CSV | CSV includes week, chapter, roles, seats, and industry chains |
| BASE-005 | Print/PDF | `/seats/print` can render saved workspace state |
| BASE-006 | Rule validation | Error/warning/info counts match visible seating risks |

## Public Visibility Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| PUB-001 | Public event/meeting page | Shows event state and anonymous summary only |
| PUB-002 | Public live seat map | Does not expose names, email, confirmation code, raw ID, private notes |
| PUB-003 | Public after-event recap | Shows only data explicitly marked public |

## Admin Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| ADM-001 | Admin opens seat map cockpit | Can view full operational seat state |
| ADM-002 | Admin assigns seat | Assignment appears in admin view and safe member DTO |
| ADM-003 | Admin manually marks attendance | Requires reason and writes audit evidence |
| ADM-004 | Admin exports seats/attendance | Export is generated and operation is logged |
| ADM-005 | Admin moves/releases seat | High-risk change has reason and traceable state transition |

## Staff Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| STF-001 | Staff checks in attendee | Assigned seat changes to checked-in |
| STF-002 | Staff checks in unassigned attendee | Attendee appears in unassigned checked-in list |
| STF-003 | Staff tries canceled attendee | Normal check-in is rejected or requires explicit exception path |

## Member Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| MEM-001 | Member opens live view | Sees own seat/table if published |
| MEM-002 | Member has no assignment | Clear no-seat state is shown |
| MEM-003 | Member views tablemates | Only allowed public profile fields appear |
| MEM-004 | Member attempts another seat | Other private assignment data is not exposed |

## Poll Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| POLL-001 | Admin opens poll | Eligible members can vote |
| POLL-002 | Poll is closed | New votes are rejected |
| POLL-003 | Result is hidden | Public/member result surfaces hide counts |
| POLL-004 | Result is public | Public surface shows configured aggregate only |
| POLL-005 | Admin exports poll | Admin receives audit-level result, not public DTO |

## Validation Commands

Run when relevant:

```bash
pnpm run lint
pnpm run build
git diff --check
```

Use browser screenshots when UI or privacy boundaries change.
