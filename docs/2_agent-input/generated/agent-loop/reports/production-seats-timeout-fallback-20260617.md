# Production Seats Timeout Fallback - 2026-06-17

## Request

User reported that the deployed `/seats` page at `https://bni-champion-chapter-tw.yzedtech.com/seats` renders the Next.js production error screen.

## Investigation

- `curl -i --max-time 25 https://bni-champion-chapter-tw.yzedtech.com/seats` timed out with 0 bytes received.
- `curl -i --max-time 25 https://bni-champion-chapter-tw.yzedtech.com/api/auth/session` returned `200` with `null`, so the deployment and Auth.js route are reachable.
- Local `/seats` server render directly awaited Prisma-backed loaders for `MeetingSession` and `SeatTemplate`, making the whole route vulnerable to a slow or blocked production MongoDB connection.

## Change

- Added a bounded loader in `src/app/seats/page.tsx`.
- `/seats` now races the database-backed index load against a 6 second timeout.
- On timeout or loader failure, the page renders an empty operational index with a visible deployment checklist instead of a production error screen.

## Manual Follow-Up

- Check Vercel `DATABASE_URL` is set on the Production environment.
- Check MongoDB Atlas Network Access allows Vercel serverless outbound IPs or a temporary `0.0.0.0/0` allow rule.
- Run `pnpm run prisma:push` against the production database after confirming the target database URL.
- Reopen `/seats` after the next Vercel deployment and confirm it either shows data or shows the fallback warning instead of the Next.js error page.

## Evidence

- `curl` to `/seats`: timed out after 25 seconds before the fix was deployed.
- `curl` to `/api/auth/session`: `HTTP/2 200`, body `null`.

