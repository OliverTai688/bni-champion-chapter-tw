# take-seat Development Strategy

Date: 2026-06-17
Status: READY_FOR_AGENT_LOOP

## Current Situation

The project has a useful local-first seating workspace, but not yet a complete website or live operating system.

Current strengths:

- Working drag-and-drop seating workspace.
- BNI-specific roster and seat rules.
- CSV and print/PDF output.
- Local draft repository abstraction.

Current gaps:

- Landing page is not yet the real product surface.
- No meeting/event list.
- No auth or role model.
- No backend persistence.
- No attendance read model.
- No live poll/vote model.
- No public/member/admin DTO split.

## North Star

Build a calm operating website where the seat map progressively reveals the live state of a meeting:

- Public sees anonymous event momentum.
- Member sees own seat, allowed table context, and voting actions.
- Staff sees check-in workflow.
- Admin sees the full operating cockpit.

## Phase 0: Baseline And Audit

- Read docs and current code.
- Inventory reusable components and gaps.
- Confirm validation commands.
- Produce an audit report without production code changes.

## Phase 1: Website And Meeting Surfaces

- Make `/` a useful entry point.
- Add or prepare current/upcoming meeting surfaces.
- Keep `/seats` stable.
- Add before/live/after state in seed-backed contracts.

## Phase 2: Seat Map Contracts

- Add formal statuses and DTOs.
- Separate public/member/staff/admin views.
- Preserve current drag-and-drop behavior.

## Phase 3: Attendance

- Add presence read model.
- Add checked-in/unassigned states.
- Add staff/admin reasoned manual updates.

## Phase 4: Member Voting

- Add live poll contracts.
- Add member vote UI.
- Add result visibility controls.
- Keep admin audit data separate from public/member result DTOs.

## Phase 5: Evidence And Hardening

- Add automated tests where risk justifies it.
- Use browser proof for responsive UI and privacy surfaces.
- Run lint/build before claiming product slices are complete.

## Default Validation

```bash
pnpm run lint
pnpm run build
git diff --check
```

Use browser screenshots for visible UI changes.

## Guardrails

- Do not erase the weekly BNI seating workflow.
- Do not expose private attendee/member data in public surfaces.
- Do not introduce backend persistence without explicit architecture notes.
- Do not mutate production systems without explicit approval.
- Preserve unrelated worktree changes.
