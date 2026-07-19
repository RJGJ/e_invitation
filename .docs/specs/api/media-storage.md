# AI Feature Spec: Media Storage

## 1. Feature Overview

**Description:** Add a dedicated `Media` list to the KeystoneJS API schema plus a pluggable storage layer that uploads files to local disk (development), Amazon S3, or Google Cloud Storage, selected at server startup via an env var. Add a REST upload/delete endpoint since binary file upload does not go through Keystone's GraphQL API.
**Business Value:** `Event.coverImageUrl` and `Event.gallery` (see `.docs/specs/api/event-model.md`) currently only accept pre-existing URL strings — there is no way to actually upload an image. This spec provides that upload path and a `Media` record to track ownership/lifecycle, in a storage-provider-agnostic way so local dev doesn't require real cloud credentials.

## 2. Current System State (Crucial)

- Existing Infrastructure: KeystoneJS 6 (`@keystone-6/core ^6.0.0`) on Express, entry point `api/keystone.ts`, lists in `api/schema.ts`. JWT auth already implemented (`api/lib/jwt.ts`, `api/lib/auth-middleware.ts`, `api/auth.ts`) — `context.session` is `{ itemId, listKey: 'User', data }` for both cookie and JWT requests.
- Existing REST Pattern: `api/routes/auth.ts` defines `createAuthRouter(commonContext)`, mounted in `api/keystone.ts` via `server.extendExpressApp`. This spec follows the same pattern for a new `api/routes/media.ts`.
- Existing Env Vars (`api/.env`, `api/.env.example`): `APP_PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
- Existing Access Control Precedent: `.docs/specs/api/event-model.md` establishes the pattern this repo now uses for owned resources — public `query`, session-required `create`, owner-or-`isAdmin` `update`/`delete`, and a `deletedAt`-based soft-delete filter excluding deleted items from all default queries. This spec reuses that exact pattern for `Media`.
- No file upload handling (no `multer` or equivalent), no cloud SDKs (`@aws-sdk/client-s3`, `@google-cloud/storage`), and no `Media` list currently exist in `api/`.
- The `Event` list itself (from `event-model.md`) may or may not be implemented yet when this ticket is picked up — this spec does not depend on it and does not modify `Event`. Wiring `Media` into `Event.coverImageUrl`/`gallery` is explicitly deferred (see Section 3).

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Add a `Media` list to `api/schema.ts` tracking uploaded file metadata (see Section 4).
  - Add a storage driver abstraction (`api/lib/storage/`) with three implementations: `local` (filesystem, dev default), `s3` (Amazon S3 via `@aws-sdk/client-s3`), `gcs` (Google Cloud Storage via `@google-cloud/storage`).
  - Driver selection is controlled entirely by the `STORAGE_DRIVER` env var (`local` | `s3` | `gcs`), read once at server startup — no runtime switching, no per-request override.
  - A REST endpoint `POST /api/media/upload` (multipart/form-data, authenticated) that uploads a single file through the active driver and creates a `Media` record.
  - A REST endpoint `DELETE /api/media/:id` (authenticated, owner or `isAdmin`) that soft-deletes the `Media` record (sets `deletedAt`).
  - When `STORAGE_DRIVER=local`, serve uploaded files back over HTTP via `express.static` so local dev has working URLs without any cloud account.
  - File validation: mime-type allow-list (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) and a max upload size (10 MB), enforced by `multer` limits before the driver is ever called.
  - `.env.example` updated with all new variables, grouped and commented per driver.
  - Unit tests for the `Media` access control, the upload/delete routes (with driver mocked), and each storage driver's `upload()` contract (with the underlying `fs`/AWS SDK/GCS SDK client mocked).
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT wire `Media` into `Event.coverImageUrl`/`Event.gallery` — that remains plain URL strings for now; a future ticket will decide whether those become relationships to `Media`.
  - DO NOT implement image resizing/thumbnailing, video/file-type support beyond the image allow-list, or client-side crop UI.
  - DO NOT implement presigned/signed upload URLs (direct browser-to-S3/GCS upload) — all uploads proxy through the API server in this ticket.
  - DO NOT implement actual deletion of the underlying blob/object from S3/GCS/disk when a `Media` record is soft-deleted — the object is left in storage; a future cleanup/garbage-collection job handles reclaiming orphaned objects.
  - DO NOT implement private/signed read URLs, CDN integration, or cache invalidation — uploaded objects are assumed publicly readable at a stable URL.
  - DO NOT add virus/malware scanning of uploaded files.
  - DO NOT build any `app/` (Flutter) UI for uploading media — API only.
  - DO NOT support multi-file/batch upload in a single request — one file per `POST /api/media/upload` call.

## 4. Interfaces & Data Contracts

- `Media` Keystone list fields:
  ```typescript
  {
    id: string;                 // Keystone default `id` (uuid)
    filename: string;            // text, required — original client-supplied filename
    mimeType: string;            // text, required
    size: number;                 // integer, required — bytes
    driver: 'local' | 's3' | 'gcs'; // select, required — recorded at upload time, not read from current env, so switching STORAGE_DRIVER later doesn't corrupt historical records
    storageKey: string;           // text, required — local relative path or S3/GCS object key
    url: string;                  // text, required — publicly resolvable URL, computed and stored at upload time
    width?: number;                // integer, optional — populated only if easily available; not a hard requirement
    height?: number;               // integer, optional
    uploadedBy: User;              // relationship, required, ref 'User.media', many: false — auto-set server-side, never from client input
    createdAt: Date;                // timestamp, defaultValue: { kind: 'now' }
    deletedAt?: Date;                // timestamp, optional — soft-delete marker, same convention as Event
  }
  ```

- Access control (identical pattern to `Event`, see `.docs/specs/api/event-model.md` Section 4):
  ```typescript
  access: {
    operation: {
      query: () => true,
      create: ({ session }) => Boolean(session),
      update: ({ session }) => Boolean(session),
      delete: ({ session }) => Boolean(session),
    },
    filter: {
      query: () => ({ deletedAt: { equals: null } }),
      update: ({ session }) =>
        session?.data?.isAdmin ? true : { uploadedBy: { id: { equals: session?.itemId } } },
      delete: ({ session }) =>
        session?.data?.isAdmin ? true : { uploadedBy: { id: { equals: session?.itemId } } },
    },
  }
  ```

- Storage driver interface (`api/lib/storage/types.ts`):
  ```typescript
  export interface UploadInput {
    buffer: Buffer;
    key: string;        // pre-generated, e.g. `${randomUUID()}-${sanitizedFilename}`
    mimeType: string;
  }

  export interface UploadResult {
    key: string;
    url: string;
  }

  export interface StorageDriver {
    kind: 'local' | 's3' | 'gcs';
    upload(input: UploadInput): Promise<UploadResult>;
  }
  ```

- `POST /api/media/upload` (multipart/form-data, field name `file`, `Authorization: Bearer <token>` or cookie session required):
  - Response (201):
    ```json
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 204800,
      "driver": "local",
      "url": "http://localhost:3002/uploads/<key>",
      "createdAt": "2026-07-19T00:00:00.000Z"
    }
    ```
  - Response (400): `{ "error": "Unsupported file type" }` or `{ "error": "File too large" }`
  - Response (401): `{ "error": "Authentication required" }`

- `DELETE /api/media/:id` (authenticated, owner or `isAdmin`):
  - Response (200): `{ "success": true }`
  - Response (401): `{ "error": "Authentication required" }`
  - Response (404): `{ "error": "Media not found" }` (covers both "doesn't exist" and "not yours" — no enumeration leak)

- New env vars (`api/.env`, `api/.env.example`):
  ```
  # Storage driver: local | s3 | gcs
  STORAGE_DRIVER=local

  # local driver (development)
  STORAGE_LOCAL_DIR=./uploads
  STORAGE_LOCAL_PUBLIC_URL=http://localhost:3002/uploads

  # s3 driver
  S3_BUCKET=
  S3_REGION=
  S3_ACCESS_KEY_ID=
  S3_SECRET_ACCESS_KEY=
  S3_PUBLIC_URL_BASE=

  # gcs driver
  GCS_BUCKET=
  GCS_PROJECT_ID=
  GCS_CLIENT_EMAIL=
  GCS_PRIVATE_KEY=
  GCS_PUBLIC_URL_BASE=
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` and ensure you pull latest changes first.
- Branch Naming Convention: `feature/[ticket-ID]-brief-description`
- Target Branch Name: `feature/media-storage`
- Commit Standard: Use Conventional Commits. Commits must be atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the git push command used.

## 6. File Operations

- Create:
  - `api/lib/storage/types.ts` — `StorageDriver`, `UploadInput`, `UploadResult` interfaces.
  - `api/lib/storage/local.ts` — filesystem driver, writes under `STORAGE_LOCAL_DIR`, returns `${STORAGE_LOCAL_PUBLIC_URL}/${key}`.
  - `api/lib/storage/s3.ts` — S3 driver using `@aws-sdk/client-s3`'s `PutObjectCommand`, returns `${S3_PUBLIC_URL_BASE || default virtual-hosted-style URL}/${key}`.
  - `api/lib/storage/gcs.ts` — GCS driver using `@google-cloud/storage`, returns `${GCS_PUBLIC_URL_BASE || default storage.googleapis.com URL}/${key}`.
  - `api/lib/storage/index.ts` — factory: reads `STORAGE_DRIVER` once, validates required env vars for the selected driver are present (throw a clear startup error if not), exports the singleton `StorageDriver` instance.
  - `api/lib/storage/local.test.ts`, `api/lib/storage/s3.test.ts`, `api/lib/storage/gcs.test.ts`, `api/lib/storage/index.test.ts`
  - `api/routes/media.ts` — Express router: `createMediaRouter(commonContext)` exposing `POST /upload` and `DELETE /:id`, using `multer` with memory storage and the limits from Section 4.
  - `api/routes/media.test.ts`
  - `api/schema.test.ts` — extend if it already exists (from `event-model`), otherwise create, adding `Media` access-control tests alongside/independent of `Event` tests.
- Modify:
  - `api/schema.ts` — add the `Media` list; add `media: relationship({ ref: 'Media.uploadedBy', many: true })` to `User.fields`.
  - `api/keystone.ts` — mount `createMediaRouter(commonContext)` at `/api/media`; when `STORAGE_DRIVER === 'local'`, add `app.use('/uploads', express.static(path.resolve(STORAGE_LOCAL_DIR)))`.
  - `api/.env` / `api/.env.example` — add the new variables from Section 4.
  - `api/package.json` — add `multer`, `@types/multer`, `@aws-sdk/client-s3`, `@google-cloud/storage` (all installed regardless of which driver is active in a given environment — this keeps `npm install` deterministic across dev/staging/prod).

## 7. Implementation Steps

1. Step 1: Checkout the new branch `feature/media-storage` from `dev`.
2. Step 2: Install `multer`, `@types/multer`, `@aws-sdk/client-s3`, `@google-cloud/storage`.
3. Step 3: Add the new env vars to `api/.env` (with a working local-driver default so `npm run dev` works out of the box) and `api/.env.example`.
4. Step 4: Create `api/lib/storage/types.ts` with the `StorageDriver` interface.
5. Step 5: Implement `api/lib/storage/local.ts` — write the buffer to `STORAGE_LOCAL_DIR/<key>` (creating the directory if missing), return the public URL built from `STORAGE_LOCAL_PUBLIC_URL`.
6. Step 6: Implement `api/lib/storage/s3.ts` — `PutObjectCommand` against `S3_BUCKET`/`S3_REGION` with the given key/buffer/mimeType, return the resulting public URL.
7. Step 7: Implement `api/lib/storage/gcs.ts` — upload the buffer to `GCS_BUCKET` under the given key via `@google-cloud/storage`, return the resulting public URL.
8. Step 8: Implement `api/lib/storage/index.ts` — factory reading `STORAGE_DRIVER`, instantiating and exporting exactly one of the three drivers, throwing a startup error if the selected driver's required env vars are missing.
9. Step 9: Add the `media` back-relation to `User.fields` and the `Media` list (with access control from Section 4) to `api/schema.ts`.
10. Step 10: Add a `resolveInput` hook on `Media` create that sets `uploadedBy` to `{ connect: { id: session.itemId } }` server-side, ignoring any client-supplied value.
11. Step 11: Create `api/routes/media.ts` — `multer` memory storage with mime-type allow-list + 10 MB limit; `POST /upload` generates a key (`${randomUUID()}-${sanitizedFilename}`), calls the active driver's `upload()`, creates the `Media` record via `context.db.Media.createOne` (with `uploadedBy` from the authenticated session — reject with 401 if no session), and returns the record. `DELETE /:id` sets `deletedAt` via `context.db.Media.updateOne`, relying on Keystone's own `access.filter.delete`/`update`-equivalent semantics for authorization (or an explicit ownership check before the update, if a plain `context.db` call bypasses list access control in this Keystone version — verify which is the case before writing the route).
12. Step 12: Wire `createMediaRouter(commonContext)` and (conditionally) the `/uploads` static file server into `api/keystone.ts`'s `server.extendExpressApp`.
13. Step 13: Run `keystone dev` to generate/apply the Prisma migration for the new `Media` table.
14. Step 14: Write unit tests per Section 9 (mocking `fs`, the AWS SDK client, and the GCS SDK client — no real cloud calls in CI) and run them.
15. Step 15: Manually verify locally: start the server with `STORAGE_DRIVER=local`, `POST` a small image to `/api/media/upload` with a valid session, confirm the returned URL serves the file, then commit and push.

## 8. Error Handling & Edge Cases

- If `STORAGE_DRIVER` is unset: default to `local` (safe dev default), do not throw.
- If `STORAGE_DRIVER=s3` or `gcs` and the corresponding required env vars are missing: throw a startup error immediately with a clear message naming the missing variable(s), preventing the server from running against a misconfigured backend.
- If `STORAGE_DRIVER` is set to an unrecognized value: throw a startup error immediately.
- If the uploaded file's mime type is not in the allow-list: `multer`'s `fileFilter` rejects it before it reaches the driver; return `400 { "error": "Unsupported file type" }`.
- If the uploaded file exceeds 10 MB: `multer`'s `limits.fileSize` rejects it; return `400 { "error": "File too large" }`.
- If no file is present in the request body: return `400 { "error": "No file provided" }`.
- If the request to `/api/media/upload` or `/api/media/:id` (DELETE) has no valid session: return `401 { "error": "Authentication required" }` — unlike GraphQL list access control (which fails silently/generically), this is a plain REST route so an explicit check is needed before touching the driver or DB.
- If the storage driver's `upload()` call itself throws (e.g. network error, bucket permission error, disk full): return `500 { "error": "Upload failed" }`; do not create a `Media` record for a failed upload.
- If `DELETE /api/media/:id` targets a record that doesn't exist or isn't owned by the caller (and caller isn't `isAdmin`): return `404 { "error": "Media not found" }` (no distinction between "not found" and "not yours").
- Soft-deleted `Media` (`deletedAt` set): excluded from all default query results for every caller, same as `Event`. The underlying stored object is not deleted (see Section 3 deferred list).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest (matches existing `api/vitest.config.ts` convention).
- Test File Location: Co-located `*.test.ts` next to each source file, as listed in Section 6.
- Coverage Required:
  - [ ] `local` driver: `upload()` writes the buffer under `STORAGE_LOCAL_DIR` and returns a URL built from `STORAGE_LOCAL_PUBLIC_URL` (mock `fs`/`fs/promises`).
  - [ ] `s3` driver: `upload()` calls `PutObjectCommand` with the correct bucket/key/body/contentType and returns the expected public URL (mock the `@aws-sdk/client-s3` client — no real AWS calls).
  - [ ] `gcs` driver: `upload()` calls the GCS SDK with the correct bucket/key/buffer and returns the expected public URL (mock `@google-cloud/storage` — no real GCS calls).
  - [ ] Storage factory: selects the correct driver class for each value of `STORAGE_DRIVER`; defaults to `local` when unset; throws on an unrecognized value; throws when a selected driver's required env vars are missing.
  - [ ] Happy path: `POST /api/media/upload` with a valid session and a valid image file returns `201` with a `Media` record whose `uploadedBy` is the session's `itemId`, regardless of any client-supplied uploader value.
  - [ ] Validation errors: `POST /api/media/upload` with an unsupported mime type returns `400`; with an oversized file returns `400`; with no file returns `400`.
  - [ ] Auth/permissions: `POST /api/media/upload` with no session returns `401`.
  - [ ] Auth/permissions: `DELETE /api/media/:id` with no session returns `401`.
  - [ ] Auth/permissions: `DELETE /api/media/:id` by a non-owner, non-admin session returns `404`.
  - [ ] Auth/permissions: `DELETE /api/media/:id` by the owner, or by an `isAdmin` session for any record, succeeds and sets `deletedAt`.
  - [ ] Anonymous `query` of `Media` via GraphQL succeeds (public read); a soft-deleted `Media` item is excluded from those results for anonymous, owner, and non-owner callers alike.
  - [ ] Edge cases from Section 8 above are each covered by a dedicated test case.
  - [ ] All cloud/network/filesystem calls are mocked — no real S3, GCS, or live database hit in this ticket's tests.
- Do NOT: write integration tests that spin up a real database, a real S3/GCS bucket, or write to the real filesystem in this ticket.

### 9c. Test Execution

- Command to run tests: `cd api && npx vitest run`
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] The code is pushed to the remote branch `feature/media-storage`.
- [ ] The `Media` list exists in `api/schema.ts` with every field from Section 4, correctly typed, and `User.media` back-relation resolves correctly.
- [ ] `STORAGE_DRIVER=local` works out of the box in development with no cloud credentials: an uploaded file is retrievable at the returned URL.
- [ ] `STORAGE_DRIVER=s3` and `STORAGE_DRIVER=gcs` are implemented behind the same `StorageDriver` interface and covered by mocked unit tests, without requiring real cloud credentials to run the test suite.
- [ ] `POST /api/media/upload` requires authentication, enforces the mime-type allow-list and 10 MB size limit, and creates a `Media` record whose `uploadedBy` cannot be spoofed by the client.
- [ ] `DELETE /api/media/:id` requires authentication and ownership (or `isAdmin`), and performs a soft delete (`deletedAt`) without removing the underlying stored object.
- [ ] Anonymous GraphQL queries of `Media` succeed; soft-deleted records never appear in query results for any caller.
- [ ] `.env.example` documents every new variable, grouped by driver.
- [ ] All tests defined in Section 9 pass.
