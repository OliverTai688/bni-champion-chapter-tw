# REF-002: Current Feature Inventory

Status: Active
Date: 2026-06-17

## Summary

`take-seat` currently has one complete feature area:

```txt
BNI weekly seating workspace
```

It is implemented as a local-first Next.js App Router application with static seed data and browser `localStorage` draft persistence.

## Route Inventory

| Route | File | Type | Current responsibility |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | Server Component page | Marketing-style entry with link to `/seats` |
| `/seats` | `src/app/seats/page.tsx` | Server Component page | Loads current meeting seed data and mounts client workspace |
| `/seats/print` | `src/app/seats/print/page.tsx` | Client print page | Reads saved print state and triggers print/PDF flow |

No API route handlers exist yet.

## Component Inventory

| Component | File | Responsibility |
| --- | --- | --- |
| `SeatingArranger` | `src/components/SeatingArranger.tsx` | Main client workspace, drag-and-drop, metrics, validation display, save/reset/export/print actions |
| `RuleEditor` | `src/components/RuleEditor.tsx` | Roster and rule editing panel |
| `ThemeProvider` | `src/components/theme-provider.tsx` | Theme context wrapper |
| `ThemeToggle` | `src/components/theme-toggle.tsx` | Light/system/dark toggle |
| `Button` | `src/components/ui/button.tsx` | Shared button primitive |

## Data And Logic Inventory

| Area | Files | Current behavior |
| --- | --- | --- |
| Domain-facing types | `src/types/seating.ts` | Seat, layout, week, workspace, roster, industry chain, validation types |
| Weekly seed data | `src/lib/layout-*.ts` | Static historical weekly seating layouts and rosters |
| Current week selector | `src/lib/seating-week.ts` | Selects `2026-06-11` as the current active week |
| Member directory | `src/lib/chapter-members.ts` | Static member names and administrative roles |
| Industry chains | `src/lib/industry-chains.ts` | Static industry chain groups and badge colors |
| Validation | `src/lib/seating-validation.ts` | Rule checks and score generation |
| Local persistence | `src/lib/seating-storage.ts` | Browser `localStorage` repository |
| CSV export | `src/lib/seating-export.ts` | CSV generation and browser download |
| CSV parse helper | `src/lib/parse-csv.ts` | Parses older seating CSV shape into layout |

## Implemented Product Capabilities

- Current weekly seating workspace.
- Drag-and-drop seat movement.
- Host team, sound, duty, guest, host, member, and proxy roles.
- Rule editor for weekly roster details.
- Industry chain visual tags.
- Validation issue list and score.
- Local draft save/load/clear.
- CSV export.
- Print/PDF route.
- Dark/light/system theme toggle.

## Storage Gap

Current storage:

```txt
localStorage key: bni-long-champion:seating-workspace:{weekId}
```

Missing storage capabilities:

- Durable multi-user persistence.
- Version history.
- Admin operation logs.
- Upload/file metadata.
- Attendance records.
- Poll/vote records.
- Public/member/admin DTO separation.

## Recommended Persistence Mapping

| Current concept | MongoDB/Prisma target | R2 target |
| --- | --- | --- |
| `MeetingWeek` | `MeetingSession` model | none |
| `SeatingWorkspaceState` | `SeatMap`, `Seat`, `SeatAssignment`, `SeatMapRevision` models | JSON snapshot export optional |
| CSV export | `ExportJob` / `Asset` metadata | CSV object |
| Print/PDF export | `ExportJob` / `Asset` metadata | PDF object |
| Member directory | `Member` model | avatar/profile media optional |
| Rule validation result | `SeatMapRevision.validationSummary` JSON | report artifact optional |
| Future attendance | `AttendanceRecord` model | evidence attachment optional |
| Future voting | `LivePoll`, `LivePollOption`, `LivePollVote` models | result export optional |

## Migration Principle

Do not remove localStorage immediately.

Recommended path:

1. Add server-side Prisma models and repository ports.
2. Keep seed data as bootstrap/fallback.
3. Add explicit import/sync from seed/local draft into MongoDB.
4. Switch `/seats` to read a safe server DTO once persistence exists.
5. Keep export and print behavior working throughout the migration.
