# Admin Poll Results Close Export - 2026-06-17

## Summary

Implemented the admin-side voting operations loop for 長冠軍之星 polls.

## Scope

- Show live admin vote ranking and current leading candidate(s).
- Allow admin to close a poll from the admin interface.
- Persist close time and winner summary metadata.
- Write an operation log when a poll is closed.
- Export poll summary and anonymous vote detail rows as CSV.

## Changed Files

- `src/server/repositories/live-poll-repository.ts`
- `src/server/admin/poll-route-handlers.ts`
- `src/app/admin/api/events/[weekId]/polls/[pollId]/route.ts`
- `src/app/admin/api/events/[weekId]/polls/[pollId]/export/route.ts`
- `src/app/api/admin/events/[weekId]/polls/[pollId]/route.ts`
- `src/app/api/admin/events/[weekId]/polls/[pollId]/export/route.ts`
- `src/components/admin-poll-controls.tsx`
- `docs/05_execution-plans/PLN-003_weekly-public-page-and-star-voting-batch-plan.md`

## API Evidence

```txt
GET /admin/api/events/2026-06-11/polls with admin cookie
-> pollCount: 1
-> firstPoll.status: open
-> firstPoll.voteCount: 1
-> firstPoll.resultCount: 36
-> firstPoll.winnerCount: 1
-> firstPoll.highestVoteCount: 1

GET /admin/api/events/2026-06-11/polls/[pollId]/export with admin cookie
-> returned CSV header and summary rows

PATCH /admin/api/events/2026-06-11/polls/[pollId] without admin cookie
-> 401 Unauthorized
```

## Validation

```txt
pnpm run lint
pnpm run build
git diff --check
```

## Not Done

- Public result DTO based on `resultVisibility`.
- Public post-event recap view.
- Stronger admin role policy beyond the current temporary admin gate.
