# REF-001: Current Seating Workspace

Status: Active
Date: 2026-06-17

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing/entry page |
| `/seats` | Main seating workspace |
| `/seats/print` | Print/PDF route using saved workspace state |

## Implemented Capabilities

- Drag-and-drop seats using `@dnd-kit`.
- Weekly seating seed selection through `src/lib/seating-week.ts`.
- Roster/rule editing through `RuleEditor`.
- BNI-specific seat categories: host team, sound, duty, guest, host, member, proxy.
- Industry chain tags and cross-table validation.
- Local draft save/load through `localStorage`.
- CSV export.
- Print route for PDF workflow.

## Core Types

Defined in `src/types/seating.ts`:

- `SeatData`
- `SeatingLayout`
- `MeetingWeek`
- `SeatingWorkspaceState`
- `Roster`
- `IndustryChain`
- `SeatingValidationIssue`

## Validation Rules

Implemented in `src/lib/seating-validation.ts`:

- Host team should have five fixed roles.
- Host team names should not be blank.
- Sound and duty each should appear exactly once.
- Sound and duty preferred positions are checked.
- Guest cannot sit directly behind duty.
- Guest and host should be vertically paired.
- Guests too far back receive warnings.
- Proxy seats outside the final row receive info notices.
- Industry chain group split across tables receives info notice.

## Storage

Local key format:

```txt
bni-long-champion:seating-workspace:{weekId}
```

Repository:

```txt
src/lib/seating-storage.ts
```

## Known Limitations

- No backend persistence.
- No login or role boundary.
- No attendance state.
- No live update channel.
- No member voting.
- No multi-week management screen.
- No automated tests for validation rules.

## Extension Notes

Future work should preserve:

- The weekly BNI workflow.
- CSV/PDF export.
- Manual override space for admin judgment.
- The repository interface idea so storage can evolve behind a stable boundary.
