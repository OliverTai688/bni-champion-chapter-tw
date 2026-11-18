# Check-in and click latency — 2026-11-16

## Problem

Tapping 簽到 (public check-in, member `/me`, console attendance buttons) took several seconds in production.

## Root causes found

1. **Region mismatch (main cause in production).** Vercel functions run in `iad1` (Washington DC; response header `x-vercel-id: hkg1::iad1::…`). MongoDB Atlas (M0) is in AWS `ap-northeast-1` (Tokyo). Every query crosses the Pacific (~150 ms round trip), and one check-in made about 10–15 queries one after another, followed by a page re-render with more queries.
2. **Serial queries on the check-in path.** Check-in re-read the row it had just loaded, the legacy mirror read and wrote the session and seat map one step at a time (and wrote session metadata even when nothing changed), and the operation log and seat hint were awaited before the reply.
3. **No pending feedback** on the console quick attendance buttons, 取消發布 and 還原: a click showed nothing until the server answered.
4. **Uncommitted `loading.tsx` files hang every server action** (local working tree only, never deployed). With any route `loading.tsx` above a page (Next.js 16.2.4), a server action that revalidates the page gets a complete, valid response but the client never commits it; the button stays pending forever and later actions queue behind it. Reproduced in Chrome on a production build; removing the files fixes it (84 ms).

## Changes

- `vercel.json` — `regions: ["hnd1"]` (Tokyo, next to the Atlas cluster). Takes effect on the next deploy.
- `src/server/tbx/log.ts` — operation log writes run in `after()` (after the response); awaited when called outside a request.
- `src/server/tbx/participation.ts` — `checkIn` updates directly (no extra read); `mirrorToLegacy` reads session and seat map together, writes only changed records, and runs both writes together.
- `src/app/(public)/e/[eventKey]/check-in/actions.ts` — event and row load together; seat hint is looked up while the check-in is written.
- `src/app/(member)/me/actions.ts` — viewer and event load together; uses the rows `ensureParticipations` already returned.
- `src/app/(console)/console/events/[eventKey]/attendance/actions.ts` — leader check and row load run together (`Promise.allSettled`, leader check still decides first); event and row load together.
- `src/app/(console)/console/events/[eventKey]/attendance/page.tsx` — guard, event and search params load together.
- `src/components/tbx/client.tsx` — `SubmitButton` gets `plain` (secondary style) and `aria-busy`; quick attendance buttons, 取消發布 and 還原 now show a pending label.
- Removed route `loading.tsx` files (see below).

Earlier uncommitted work in the tree (request memoising with `cache()`, parallel reads in `ensureParticipations`/`getGridSeatView`, SessionProvider scoped to the grid editor, redirect to the seat map after check-in) was kept.

## Removed loading files (to restore once the hang is understood)

All four rendered `PageSkeleton` from `src/components/tbx/loading.tsx`, which is kept.

- `src/app/(console)/console/loading.tsx` → `<PageSkeleton />`
- `src/app/(console)/console/events/[eventKey]/loading.tsx` → `<PageSkeleton variant="tab" />`
- `src/app/(member)/me/loading.tsx` → `<PageSkeleton variant="narrow" />`
- `src/app/(public)/loading.tsx` → `<main className="mx-auto flex w-full max-w-[960px] px-4 py-8"><PageSkeleton /></main>`

## Evidence (local production build, Docker MongoDB, Chrome)

| Check | Result |
| --- | --- |
| Committed HEAD, console 簽到 | row updates in 125 ms |
| Working tree with `loading.tsx`, console 簽到 | stuck on 簽到… (server wrote the row; client never committed) |
| Same, `after()` reverted | still stuck (not the cause) |
| Same, webpack build | still stuck (not the builder) |
| Only `console/loading.tsx` restored | still stuck |
| No route `loading.tsx` | 53–84 ms, pending label shown immediately |
| Public `/e/[key]/check-in`, member self check-in | confirmation with seat hint in 84 ms, then seat map opens |
| DB after public check-in | participation `present`, seat assignment `checked_in`, operation log `self_check_in` written |

Local DB is close to the server, so these numbers show correctness and the client hang, not the production speed-up. The production gain comes mostly from `hnd1`.

Validation: `pnpm exec eslint` (0 errors, 1 existing warning), `next build` passes, `git diff --check` clean.

## Not verified

- Production timing after deploy (needs push + deploy).
- Vercel plan allows the `hnd1` region (Hobby allows one region; check the project's Functions region setting after deploy).
- `/me` member check-in in the browser (needs a member login); its server path was built and type-checked.

Local test data: event `2026-10-08` in the Docker DB was set to `publicStatus: published`, `startsAt: 23:59` for the public check-in test; its date was restored.
