# Public Vote Attendance Independence And Five-Column Map - 2026-06-17

## Scope

Adjusted the public event/vote experience after attendance controls were added.

## Decisions

- Public voting must not require a seat or voter to be marked arrived.
- The public main seat map should render with at least five columns so the first visual row is five seats, not four.

## Changed Files

- `src/application/events/mappers.ts`
- `src/app/w/[slug]/page.tsx`
- `src/components/public-vote-client.tsx`
- `AGENTS.md`

## Behavior

- Poll option creation already includes assigned and checked-in members; it does not filter by `checked_in`.
- Vote submission already validates vote access/token and option eligibility, not attendance status.
- Public page and vote page copy now explicitly says public voting does not require arrival marking.
- `toPublicWeeklyEventDTO` now emits `seatMap.columns >= 5`, making the public main seat map render a five-seat first row.

## Validation

Passed:

```bash
pnpm run prisma:validate
pnpm run lint
pnpm run build
git diff --check
```

Non-mutating smoke checks:

```bash
curl -I http://localhost:3000/w/2026-06-18-5f9139
GET /api/public/events/2026-06-18-5f9139
```

- Public page returned `HTTP/1.1 200 OK`.
- Public event DTO returned `seatMap.columns: 5`.

## Manual Evidence

MANUAL_REQUIRED:

- Open `/w/[slug]` and confirm the main seat map first visual row has five seats.
- Open `/w/[slug]/vote` and confirm public voting copy says no arrival mark is required.
