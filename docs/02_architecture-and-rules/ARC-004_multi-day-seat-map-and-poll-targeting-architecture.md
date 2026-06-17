# ARC-004: Multi-Day Seat Map And Poll Targeting Architecture

Status: Implemented MVP
Date: 2026-06-17

## Context

The first public voting MVP assumed one current weekly seating plan. That made `/admin` create polls against `CURRENT_MEETING_WEEK.id`, which is not enough once the chapter needs multiple event days or future weekly pages.

## Goal

Admin must confirm the target event day and seat map before opening a poll.

## Data Boundary

Existing models are sufficient for the MVP:

- `MeetingSession.weekId` identifies the event day.
- `MeetingSession.date` stores the actual date.
- `SeatMap.sessionId` binds one or more seat map revisions to that day.
- `LivePoll.sessionId` binds polls to that day.

No schema change is required for the first multi-day support.

## Admin Flow

```txt
Admin opens /admin
-> sees existing MeetingSession records
-> selects target day
-> optionally creates a new day from the current seating template
-> reviews seat count and open poll count
-> creates poll for the selected day
-> monitors, closes, and exports that day's poll
```

## MVP Creation Rule

New dates are created from the current seating template:

- weekId: ISO date, e.g. `2026-06-18`
- title: auto-generated Minguo title unless admin enters one
- chapterName and meetingLabel: copied from the current template
- seat map: copied from the current layout data
- source: `generated`

This is a template clone, not yet a full per-date editor.

## API Contracts

Admin event sessions:

```txt
GET /admin/api/events
POST /admin/api/events
GET /api/admin/events
POST /api/admin/events
```

Poll management remains scoped under weekId:

```txt
GET /admin/api/events/[weekId]/polls
POST /admin/api/events/[weekId]/polls
PATCH /admin/api/events/[weekId]/polls/[pollId]
GET /admin/api/events/[weekId]/polls/[pollId]/export
```

## Privacy And Safety Rules

- Public pages still use public slugs, not raw week IDs.
- Admin selection can show seat map counts and poll counts.
- Raw vote codes and token hashes must not appear in admin event lists.
- Creating a new event session is an admin mutation and must require the admin access cookie.

## Future Work

- Dedicated `/admin/events/[weekId]` route with preview, publish, poll, and export tabs.
- Per-date seating editor route instead of cloning only the current template.
- Duplicate-date UX: warn before overwriting or versioning an existing date.
- Recurring weekly generator that can create future dates in batches.
- Strong admin allowlist rather than temporary password gate.
