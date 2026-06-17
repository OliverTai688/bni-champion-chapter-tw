# Production DB Health Diagnostics - 2026-06-17

## Request

User asked to fix the remaining production database connection problem after `/seats` started rendering the database timeout fallback.

## Findings

- Local Prisma schema validation passes.
- Local `prisma db push --skip-generate` reaches MongoDB and reports the database is already in sync.
- Local `.env` URL structure has `appName=Cluster0?retryWrites=true`, which means `retryWrites` is accidentally embedded into `appName` instead of being parsed as its own query parameter.
- Production `/seats` still times out when loading Prisma-backed data, which is consistent with a production `DATABASE_URL` problem or MongoDB Atlas Network Access blocking Vercel.

## Change

- Added `GET /api/health/db`.
- The health route checks whether `DATABASE_URL` is configured and parseable without exposing secrets.
- The health route performs a MongoDB `ping` through Prisma with a 6 second timeout.
- Added Prisma client startup normalization for the known malformed MongoDB URL shape where `retryWrites` was nested inside `appName`.
- Updated `.env.example` to show the correct MongoDB query string shape:

```txt
?retryWrites=true&w=majority&appName=Cluster0
```

## How To Use

After deployment, open:

```txt
https://bni-champion-chapter-tw.yzedtech.com/api/health/db
```

Expected successful response:

```json
{
  "ok": true,
  "status": "connected"
}
```

Common failure meanings:

- `missing_database_url`: Vercel Production does not have `DATABASE_URL`.
- `invalid_database_url`: Vercel Production `DATABASE_URL` is malformed.
- `timeout`: Vercel can resolve the app but cannot complete MongoDB ping within 6 seconds, most likely Atlas Network Access or wrong cluster credentials.
- `error`: Prisma/Mongo returned an immediate error; read the non-secret `error.message`.

## Manual Follow-Up

- In Vercel Production, set `DATABASE_URL` to the corrected format:

```txt
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/take-seat?retryWrites=true&w=majority&appName=Cluster0
```

- In MongoDB Atlas, allow Vercel outbound traffic. During early testing, temporarily allow `0.0.0.0/0`, then tighten later if needed.
- Redeploy Vercel after env changes.
- Recheck `/api/health/db`, then `/seats`.

## Evidence

- `pnpm exec prisma validate`: pass.
- `pnpm exec prisma db push --skip-generate`: pass locally, database already in sync.
- Production `/api/health/db` before normalization deployment returned `status: "timeout"` and `hasRetryWrites: false`, confirming the Vercel `DATABASE_URL` query string is malformed.
