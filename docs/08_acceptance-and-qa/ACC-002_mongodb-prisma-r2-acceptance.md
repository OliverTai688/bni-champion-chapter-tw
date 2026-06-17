# ACC-002: MongoDB, Prisma, And Cloudflare R2 Acceptance

Status: Draft
Date: 2026-06-17

## Acceptance Policy

Statuses:

- `PASSED`
- `FAILED`
- `BLOCKED`
- `MANUAL_REQUIRED`

Do not mark remote database or R2 tasks as `PASSED` without evidence from a safe target environment.

## Research Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| DATA-RES-001 | Prisma MongoDB version is selected | Plan uses Prisma v6.19 while v7 MongoDB support is unavailable |
| DATA-RES-002 | MongoDB schema evolution is documented | Plan uses `prisma db push`, not Prisma Migrate |
| DATA-RES-003 | R2 integration path is documented | Plan uses S3-compatible API and AWS SDK v3 |
| DATA-RES-004 | R2 metadata responsibility is clear | Prisma stores `Asset` metadata; R2 stores bytes |

## Prisma Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| PRISMA-001 | `prisma/schema.prisma` validates | `pnpm prisma validate` passes |
| PRISMA-002 | Prisma Client generated | `pnpm prisma generate` passes |
| PRISMA-003 | MongoDB ObjectId mapping | Models use `String @id @default(auto()) @map("_id") @db.ObjectId` |
| PRISMA-004 | Database write guard | `prisma db push` is not run against remote DB without explicit approval |
| PRISMA-005 | Current layout import dry run | Seed/import script reports intended records without writing |

## R2 Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| R2-001 | R2 client initializes server-side | Client code cannot import R2 credentials or SDK service |
| R2-002 | Presigned upload URL generated | URL uses S3 API domain, short TTL, and restricted content type |
| R2-003 | Upload metadata saved | `Asset` record includes bucket, key, content type, size, visibility, purpose |
| R2-004 | Failed upload confirmation | Failed or missing R2 object does not create successful asset metadata |
| R2-005 | Export object stored | Generated CSV/PDF object exists in R2 and has matching DB metadata |

## Privacy And Security Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| SEC-001 | Public DTO reads seat map | No email, raw ID, confirmation code, private notes, or full attendee list |
| SEC-002 | Member DTO reads seat map | Member sees only own seat and allowed public tablemate data |
| SEC-003 | Report generated | No secrets, raw cookies, tokens, credentials, or live presigned URLs are saved |
| SEC-004 | Env files reviewed | Real `.env*` secrets are not committed |

## Regression Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| REG-001 | `/seats` seed mode | Current seating workspace still renders |
| REG-002 | localStorage draft | Existing local draft flow still works until replacement is explicitly approved |
| REG-003 | CSV export | Browser CSV export still works |
| REG-004 | Print route | `/seats/print` still renders saved print state |

## Evidence Paths

Save implementation reports under:

```txt
docs/2_agent-input/generated/agent-loop/reports/
```

Do not save real presigned URLs unless redacted.
