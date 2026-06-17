# ARC-005: One-To-Many Seat Template Event Page Architecture

Status: Research
Date: 2026-06-17

## Problem

The current `/seats` experience started as a single weekly seating workspace. After adding multi-day support, the UI began mixing three different jobs in one page:

- edit the current seating arrangement
- create another date from the current screen
- publish and manage event-specific public/vote state

That feels strange because the product model is no longer one page equals one seating plan. The correct mental model is one-to-many:

```txt
Seat Template / Source Plan
-> Event Seat Map for 2026-06-11
-> Event Seat Map for 2026-06-18
-> Event Seat Map for a special event date
-> each event may have public page, polls, exports, and archive state
```

## User Scenario Inference

For BNI 長冠軍分會, the admin usually starts from a known seating pattern:

- fixed host-team area
- recurring member roster
- guest/host pairing rules
- value-day and sound-control positions
- industry-chain distribution rules

Each meeting date is an instance of that pattern. The admin should first choose the event date or existing event record, then enter a focused editor for that date.

Creating a new seating plan should not happen as a small inline form inside the editor. It should happen from a list or dashboard where the admin can see all event dates and choose a source.

## Recommended Information Architecture

### Admin Seating Index

Route:

```txt
/seats
```

Purpose:

- list all event seat maps
- create a new event seat map
- duplicate from a source event or template
- show status summary for each event
- open the editor for one date

Primary UI:

```txt
Header: 座位表管理

Toolbar:
- 建立座位表
- 批次建立未來日期
- 篩選 status/date

Table/List:
- 日期
- 標題
- 座位數 / 已安排
- 公開頁狀態
- 投票數 / 開放中
- 最後更新
- Actions: 編輯, 公開頁, 投票, 匯出, 複製
```

### Event Seat Map Editor

Route:

```txt
/seats/[weekId]
```

Purpose:

- edit exactly one event date
- drag/drop seating
- edit roster/rules for that date
- save local and MongoDB draft
- export CSV/PDF

This route should replace `GET /seats?weekId=...` once the architecture is cleaned up.

### Create Seat Map Flow

Route options:

```txt
/seats/new
/seats?dialog=new
```

Recommended MVP: modal or drawer from `/seats`.

Fields:

- target date
- title
- source type:
  - duplicate latest event
  - duplicate selected event
  - use base template
  - blank/manual skeleton later
- optional meeting label

Confirm screen:

- source event/template
- target date
- seats copied
- roster copied
- rules copied
- warning if target date already exists

### Event Operations

Public page and poll actions are event-specific. They should live either:

```txt
/admin/events/[weekId]
```

or as tabs/actions inside:

```txt
/seats/[weekId]
```

Recommended split:

- `/seats/[weekId]`: seating editor and export
- `/admin/events/[weekId]`: publish, poll, login/audit, close/export voting

## Data Model Interpretation

Existing schema can support this without immediate migration:

```txt
MeetingSession 1 -> many SeatMap
MeetingSession 1 -> many LivePoll
SeatMap 1 -> many Seat
SeatMap 1 -> many SeatAssignment
SeatMap 1 -> many SeatMapRevision
```

But product language needs one more explicit concept:

```txt
SeatTemplate
```

This can be introduced later as either:

1. A real Prisma model.
2. A `SeatMap` with `source = template` and no fixed event date.
3. A static template source kept in TypeScript until templates become user-managed.

Decision update on 2026-06-17: admins need named reusable templates now. The product should include a real `SeatTemplate` model that stores a reusable snapshot copied from an event's latest seat map.

Current template rule:

- one event per date remains enforced by `MeetingSession.weekId`
- named templates are reusable sources, not event sessions
- creating an event from a template still targets a single selected date
- event creation can be authorized by Google session or admin access; it is not Google-only

## Route Refactor Target

Current:

```txt
/seats
/seats?weekId=YYYY-MM-DD
/api/seats/[weekId]
/api/seats/templates
```

Recommended:

```txt
/seats                         -> index/list
/seats/new                     -> optional create page or modal state
/seats/[weekId]                -> editor for one event
/seats/[weekId]/print          -> print for one event
/api/seats                     -> list/create event seat maps
/api/seats/[weekId]            -> read/update one event seat map
/api/seats/[weekId]/duplicate  -> duplicate from source event/template
```

Compatibility:

- `/seats?weekId=...` can redirect to `/seats/[weekId]`.
- `/seats` should no longer silently open the current hardcoded week once an index exists.

## What To Undo Or Move From The Current MVP

Move out of `SeatingArranger`:

- inline `新座位表日期`
- inline `建立指定日期模板`
- template creation state and API wiring

Move into the seating index:

- date creation form
- source selection
- duplicate-date warning
- list of existing event seat maps

Keep in the editor:

- drag/drop seating
- rule editor
- local draft
- save/sync
- CSV/PDF export

Move event operations out of the editor or make them a separate event tab:

- publish public page
- create/open/close poll
- vote results
- vote export

## Recommended Batch Plan

### SEAT-IA-001 - Research And Decision

- [x] Identify one-to-many product model.
- [x] Define route architecture.
- [x] Define which controls belong in index vs editor vs event admin.
- [ ] Approve route target: `/seats/[weekId]`.

### SEAT-IA-002 - Seat Map Index

- [ ] Build `/seats` as an event seat map index.
- [ ] Move create-date UI from `SeatingArranger` into the index.
- [ ] Show existing event sessions with seat map/poll/public status.
- [ ] Link each row to `/seats/[weekId]`.

### SEAT-IA-003 - Dedicated Editor Route

- [ ] Add `/seats/[weekId]`.
- [ ] Move current editor page behavior there.
- [ ] Redirect `/seats?weekId=...` to `/seats/[weekId]`.
- [ ] Keep `/seats/print` until `/seats/[weekId]/print` exists.

### SEAT-IA-004 - Duplication Contract

- [ ] Replace `POST /api/seats/templates` with a clearer duplication endpoint.
- [ ] Add source selection.
- [ ] Add duplicate-date confirmation.
- [ ] Preserve local storage isolation by weekId.

### SEAT-IA-005 - Event Operations Placement

- [ ] Choose whether publish/poll belongs in `/admin/events/[weekId]` or tabs under `/seats/[weekId]`.

### SEAT-IA-007 - Named Reusable Templates

- [x] Add a real `SeatTemplate` model.
- [x] Save the latest event seat map as a named reusable template from `/admin/events/[weekId]`.
- [x] Use named templates as source choices when creating event seat maps from `/seats`.
- [ ] Move poll and publish controls out of generic list pages.
- [ ] Keep public/privacy DTO boundaries unchanged.

## Open Decisions

- Should the first page after login be `/seats` index or `/admin` dashboard?
- Should there be named reusable templates, or is duplicating the latest event enough for now?
- Should event creation require Google login only, admin password, or both?
- Should a date be unique by `weekId = YYYY-MM-DD`, or can there be multiple meetings on one date?
- Should `/seats/[weekId]` be readable without admin access, or always require login?

## Recommended Next Implementation

Do not keep adding controls to the current editor. The next implementation should:

1. Create `/seats` as an index page.
2. Move the existing editor to `/seats/[weekId]`.
3. Move create-date/duplicate controls into the index.
4. Leave voting controls scoped to a selected event, preferably `/admin/events/[weekId]`.

This will make the product model visible and reduce UI confusion.
