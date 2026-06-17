# Seat IA Named Reusable Templates - 2026-06-17

## Decisions

- Event editor route remains `/seats/[weekId]`.
- `/seats` remains the one-to-many event seat map index.
- Event creation is not Google-only; either Google session or admin access can authorize it.
- Same-day multiple meetings are not supported. `MeetingSession.weekId` remains unique by date.
- Named reusable templates are in scope now.

## Scope

Implemented `SEAT-IA-007` as a vertical slice for named reusable seat templates.

## Changed Files

- `prisma/schema.prisma`
- `src/server/repositories/admin-event-sessions-repository.ts`
- `src/app/api/seats/route.ts`
- `src/app/api/seat-templates/route.ts`
- `src/app/seats/page.tsx`
- `src/components/seat-map-create-panel.tsx`
- `src/components/seat-template-save-panel.tsx`
- `src/app/admin/events/[weekId]/page.tsx`
- `AGENTS.md`
- `docs/02_architecture-and-rules/ARC-005_one-to-many-seat-template-event-page-architecture.md`

## Behavior

- `SeatTemplate` stores a named snapshot of top roles, main seats, roster, heroes, and industry chains.
- `/admin/events/[weekId]` can save the event's latest seat map as a named template.
- `/seats` lists templates and lets admins create a new event date from a named template.
- `/api/seats` now accepts `sourceKind: "named_template"` and `sourceTemplateId`.
- `/api/seats` and `/api/seat-templates` accept either Google session or admin access.

## Validation

Passed:

```bash
pnpm run prisma:generate
pnpm run prisma:validate
pnpm run lint
pnpm run build
git diff --check
```

Non-mutating HTTP smoke checks:

```bash
curl -I http://localhost:3000/seats
curl -i http://localhost:3000/api/seat-templates
```

- `/seats` returned `HTTP/1.1 200 OK`.
- `/api/seat-templates` without Google/admin access returned `HTTP/1.1 401 Unauthorized`.

## Manual Evidence

MANUAL_REQUIRED:

- Run `pnpm run prisma:push` before writing templates to MongoDB.
- Open `/admin/events/2026-06-11`, save a named template, then confirm it appears as a source on `/seats`.
- Create a test future date from the saved template only after deciding that test write is acceptable.
