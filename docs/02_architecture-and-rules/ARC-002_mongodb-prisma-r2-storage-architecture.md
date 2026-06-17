# ARC-002: MongoDB, Prisma, And Cloudflare R2 Storage Architecture

Status: Research
Date: 2026-06-17

## Purpose

This document researches how `take-seat` should add MongoDB and Cloudflare R2 while using Prisma as the application data-management layer.

## External Source Findings

Official documentation findings checked on 2026-06-17:

- Prisma MongoDB support for Prisma ORM v7 is not yet available; Prisma says to use Prisma ORM v6.19 for MongoDB work until v7 support lands. Source: [Prisma MongoDB connector](https://www.prisma.io/docs/orm/core-concepts/supported-databases/mongodb).
- MongoDB IDs in Prisma should map Prisma `id` to MongoDB `_id` and use `@db.ObjectId`; relation scalar fields also use `String @db.ObjectId`. Source: [Prisma add MongoDB to existing project](https://www.prisma.io/docs/prisma-orm/add-to-existing-project/mongodb).
- Prisma Migrate is not supported for MongoDB. Use `prisma db push` to sync schema changes. Source: [Prisma add MongoDB to existing project](https://www.prisma.io/docs/prisma-orm/add-to-existing-project/mongodb).
- Prisma Studio currently does not support MongoDB. Use MongoDB Atlas, MongoDB shell, or Compass for data inspection. Source: [Prisma add MongoDB to existing project](https://www.prisma.io/docs/prisma-orm/add-to-existing-project/mongodb).
- Cloudflare R2 supports an S3-compatible API; existing S3 SDK code can work by changing the endpoint URL. Source: [Cloudflare R2 S3 get started](https://developers.cloudflare.com/r2/get-started/s3/).
- R2 S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; R2 region is `auto`. Source: [Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/).
- Cloudflare documents AWS SDK for JavaScript v3 usage with `@aws-sdk/client-s3`, `region: "auto"`, R2 endpoint, and R2 API credentials. Source: [Cloudflare R2 AWS SDK JS v3 example](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).
- R2 presigned URLs support `GET`, `HEAD`, `PUT`, and `DELETE`; treat presigned URLs as bearer tokens, configure CORS for browser use, and use S3 API domain rather than custom domains. Source: [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Architecture Decision

Use MongoDB for operational data and R2 for binary/file objects.

Prisma should manage:

- MongoDB collections and typed data access.
- Relations between meetings, seat maps, members, attendance, polls, exports, and asset metadata.
- Application-level operation records.

Prisma should not manage:

- File bytes.
- R2 bucket operations.
- Presigned URL generation itself.

R2 should store:

- PDF exports.
- CSV exports.
- Seat map snapshots when immutable artifact storage is useful.
- Member avatars/profile images later.
- Evidence screenshots or attendance attachments later, if approved.

MongoDB should store R2 metadata through an `Asset` model:

```txt
Asset record in MongoDB
-> bucket/key/contentType/size/checksum/public/private metadata
-> R2 object bytes
```

## Proposed Dependencies

Because MongoDB requires Prisma v6.19 at the time of research:

```bash
pnpm add @prisma/client@6.19.0 @aws-sdk/client-s3 @aws-sdk/s3-request-presigner server-only
pnpm add -D prisma@6.19.0
```

Do not install Prisma v7 for MongoDB until official support is available.

## Environment Variables

Create docs before adding real values. Do not commit secrets.

```txt
DATABASE_URL=mongodb+srv://...

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
R2_PRESIGNED_URL_TTL_SECONDS=900
```

Notes:

- Local MongoDB for Prisma must be a replica set if transactions are needed.
- Atlas is the simplest initial target.
- `R2_PUBLIC_BASE_URL` is optional and only for public assets; private assets should use signed URLs or server proxy.

## Proposed Prisma Schema Direction

First-pass model groups:

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

Model pattern:

```prisma
model MeetingSession {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  date        DateTime
  title       String
  chapterName String
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  seatMaps    SeatMap[]
  attendance  AttendanceRecord[]
  polls       LivePoll[]
}

model Asset {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  provider     String
  bucket       String
  key          String
  contentType  String
  byteSize     Int?
  checksum     String?
  visibility   String
  purpose      String
  createdAt    DateTime @default(now())
}
```

Use string enums or Prisma enum depending on MongoDB connector support in the selected Prisma version. Prefer explicit application-level union types in TypeScript either way.

## Proposed Source Structure

Add only when implementing:

```txt
prisma/
  schema.prisma

src/server/
  db/prisma.ts
  storage/r2-client.ts
  storage/r2-service.ts
  assets/asset-service.ts

src/domain/
  seating/
  meetings/
  assets/

src/application/
  seating/
  meetings/
  assets/

src/app/api/
  assets/presign/route.ts
  seats/[weekId]/route.ts
```

`src/server/*` should be server-only. It may import `process.env`, Prisma Client, and AWS SDK. Client Components must never import it.

## Next.js Boundary Rules

From local Next.js 16 docs:

- Route Handlers live in `app` and support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- Route Handlers are not cached by default.
- `route.ts` cannot exist at the same segment level as `page.tsx`.
- New projects should prefer a Data Access Layer that performs authorization checks and returns safe, minimal DTOs.

For this project:

- Use Route Handlers for upload presigning and server persistence APIs.
- Keep Prisma and R2 SDK calls server-side only.
- Return public/member/admin DTOs from application services, not raw Prisma records.

## Asset Upload Flow

Recommended initial upload flow:

```txt
Client requests upload intent
-> POST /api/assets/presign
-> server validates purpose/contentType/size
-> server creates object key
-> server returns PUT presigned URL
-> client PUTs bytes to R2
-> client confirms upload
-> server HEADs object if needed
-> server creates Asset metadata through Prisma
```

Do not expose R2 access keys to the browser.

## Export Flow

For CSV/PDF export:

```txt
Admin triggers export
-> server builds export from persisted seat map DTO
-> server writes object to R2
-> server creates Asset + ExportJob metadata
-> user receives short-lived signed download URL
```

The current browser CSV export can remain as a local MVP path until server persistence exists.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Prisma v7 cannot support MongoDB yet | Pin Prisma and `@prisma/client` to v6.19 until official v7 support lands |
| MongoDB lacks Prisma migration files | Use `prisma db push`, document schema changes, and use seed/check scripts |
| Prisma Studio not available for MongoDB | Use Atlas, shell, or Compass |
| Client imports server secrets accidentally | Keep Prisma/R2 under `src/server`, use `server-only`, lint/import review |
| Presigned URL leakage | Short TTL, content-type restriction, no secrets in reports, treat URLs as bearer tokens |
| R2 object without DB metadata | Confirm upload before metadata or add cleanup job for abandoned keys |
| DB metadata without R2 object | HEAD object verification and failed-state cleanup |

## Recommendation

Adopt MongoDB + Prisma + R2 in three steps:

1. Add dependencies, environment docs, Prisma schema, and read-only seed script.
2. Persist current seating workspace in MongoDB while keeping localStorage fallback.
3. Add R2 only for generated exports first, then expand to profile/media/uploads later.
