# One-To-Many Seat Page Architecture Research - 2026-06-17

## Summary

Captured the architecture correction that seat planning should become a one-to-many page model instead of adding date creation controls inside the single `/seats` editor.

## Research Output

- `docs/02_architecture-and-rules/ARC-005_one-to-many-seat-template-event-page-architecture.md`

## Key Finding

The current product model should be:

```txt
Seat Template / Source Plan
-> many event date seat maps
-> each event date has public page, poll, results, and exports
```

The UI should therefore split into:

- `/seats` as index/list/create
- `/seats/[weekId]` as one event date editor
- `/admin/events/[weekId]` or event tabs for publish/poll operations

## Implementation Recommendation

Next batch should not add more controls to `SeatingArranger`. It should first move the current editor to a dedicated event route and make `/seats` the one-to-many index.

## Validation

Documentation-only change. No runtime validation needed.
