# AI Feature Spec: Media Storage

## 1. Feature Overview

**Description:** Add a `Media` list to the KeystoneJS API schema built around Keystone's native `image()` field, backed by a pluggable storage config (local disk for development, Amazon S3, or Google Cloud Storage), selected once at server startup via an env var. Uploads go through Keystone's standard GraphQL mutations (multipart upload) — there is no custom REST endpoint and no custom upload code, since Keystone's `image()` field already provides an Admin UI upload widget and auto-derives file metadata from the actual bytes.
**Business Value:** `Event.coverImageUrl` and `Event.gallery` (see `.docs/specs/api/event-model.md`) currently only accept pre-existing URL strings — there is no way to actually upload an image. This spec provides that upload path and a `Media` record to track ownership/lifecycle, in a storage-provider-agnostic way so local dev doesn't require real cloud credentials, and so an admin can upload/browse media directly from Keystone's Admin UI without hand-typing metadata that should come from the file itself.

## 2. Current System State (Crucial)

- Existing Infrastructure: KeystoneJS 6 (`@keystone-6/core ^6.0.0`) on Express, entry point `api/keystone.ts`, lists in `api/schema.ts`. JWT auth already implemented (`api/lib/jwt.ts`, `api/lib/auth-middleware.ts`, `api/auth.ts`) — `context.session` is `{ itemId, listKey: 'User', data }` for both cookie and JWT requests. **Known gap**: JWT-authenticated sessions always get `data: null` (see `api/auth.ts`'s custom `session.get`), so `session?.data?.isAdmin` is always falsy over JWT even for real admins. This is pre-existing and out of scope to fix here — `Media`'s access control inherits it the same way `Event`'s does.
- Existing Access Control Precedent: `.docs/specs/api/event-model.md` establishes the pattern this repo uses for owned resources — public `query`, session-required `create`, owner-or-`isAdmin` `update`/`delete`, and a `deletedAt`-based soft-delete filter excluding deleted items from all default queries. This spec reuses that exact pattern for `Media`.
- Existing Env Vars (`api/.env`, `api/.env.example`): `APP_PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
- **Revision history**: an earlier version of this feature built a fully custom `Media` list (`filename`/`mimeType`/`size`/`driver`/`storageKey`/`url`/`width`/`height` scalar fields) plus a hand-rolled storage driver abstraction (`api/lib/storage/{local,s3,gcs}.ts`) and REST routes (`api/routes/media.ts`). That approach had two real problems surfaced in use: (1) `driver` was a manually-typed required `select` field in Keystone's Admin UI — even though the REST route auto-set it server-side, anyone creating a record through the Admin UI had to pick a value by hand every time; (2) `width`/`height` were never actually computed anywhere (confirmed absent from the REST route's `data` object, always `null`), and every field was a plain scalar with no real upload widget behind it. This spec supersedes that design entirely in favor of Keystone's native `image()` field, which solves both problems using code Keystone already bundles (`file-type` for mime/extension sniffing, `image-size` for width/height, its own S3 client) — see Section 4.
- The `Event` list itself (from `event-model.md`) may or may not be implemented yet when this ticket is picked up — this spec does not depend on it and does not modify `Event`. Wiring `Media` into `Event.coverImageUrl`/`gallery` is explicitly deferred (see Section 3).

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Add a `Media` list to `api/schema.ts` with a single `image()` field (see Section 4) plus `uploadedBy`/`createdAt`/`deletedAt`.
  - Add `api/lib/media-storage.ts`: a pure config-resolution module that reads `STORAGE_DRIVER` (`local` | `s3` | `gcs`) once at server startup and returns Keystone's top-level `storage` config map plus which single named entry the `image()` field should use. No per-upload/per-record driver choice is possible — it's fixed for the whole running server.
  - Wire the resolved `storage` config into `config({ storage })` in `api/keystone.ts`.
  - For the `local` driver, rely on Keystone's own `serverRoute` config to auto-mount the `/uploads` static route — no manual `express.static` wiring.
  - `.env.example` updated with all new variables, grouped and commented per driver.
  - Unit tests for the `Media` access control/hook and for `api/lib/media-storage.ts`'s config-resolution logic (env → config shape, missing-var errors, unknown-driver errors).
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT wire `Media` into `Event.coverImageUrl`/`Event.gallery` — that remains plain URL strings for now; a future ticket will decide whether those become relationships to `Media`.
  - DO NOT implement image resizing/thumbnailing, video/non-image file support, or client-side crop UI — Keystone's `image()` field itself only accepts `jpg`/`png`/`webp`/`gif` (enforced by its bundled `file-type` sniffing), which is an acceptable scope boundary, not a gap to fill.
  - DO NOT implement presigned/signed upload URLs (direct browser-to-S3/GCS upload) — all uploads proxy through the API server's GraphQL endpoint.
  - DO NOT implement actual deletion of the underlying blob/object from S3/GCS/disk when a `Media` record is soft-deleted — the object is left in storage; a future cleanup/garbage-collection job handles reclaiming orphaned objects.
  - DO NOT implement private/signed read URLs, CDN integration, or cache invalidation — uploaded objects are assumed publicly readable at a stable URL.
  - DO NOT add virus/malware scanning of uploaded files.
  - DO NOT build any `app/` (Flutter) UI for uploading media, and DO NOT design/document the client-side multipart GraphQL upload contract for the app — API and Admin UI only for this ticket. Any client (including the app) uploads via the standard `createMedia`/`updateMedia` GraphQL mutations following the `graphql-multipart-request-spec`; how a specific client library does that is out of scope here.
  - DO NOT preserve the original client-supplied filename as a separate column — Keystone's `image()` field doesn't store one (only a generated `id` + `extension`); this is an accepted limitation, not a bug to work around.
  - DO NOT build any migration tooling for switching `STORAGE_DRIVER` after uploads already exist. Because `image()` URLs are generated dynamically at query time from the *currently* active storage config (not stored per-record), switching drivers after uploading orphans previously-uploaded assets — their bytes don't move, and their generated URL will point at the new backend. This is an inherent tradeoff of the native-field design, called out here rather than worked around.
  - GCS support is **experimental**: Keystone's built-in storage config only has `kind: 'local'` and `kind: 's3'` — there is no native `kind: 'gcs'`. This spec routes GCS through the `s3` kind's optional `endpoint` override, pointed at GCS's S3-interoperability API, authenticated with GCS **HMAC keys** (a different credential type than a GCS service account). This has not been verified against a live GCS bucket in development (no live credentials available) — treat it as unverified until confirmed against a real bucket.

## 4. Interfaces & Data Contracts

- `Media` Keystone list fields:
  ```typescript
  {
    id: string;                    // Keystone default `id` (uuid)
    image: {                        // image() field — Keystone auto-derives all of this from the actual file bytes on upload
      id: string;                    // generated storage key/filename (not the original filename)
      extension: 'jpg' | 'png' | 'webp' | 'gif'; // sniffed from magic bytes via `file-type`, not trusted from a client-declared mime type
      width: number;                  // via `image-size`
      height: number;                  // via `image-size`
      filesize: number;                 // buffer length, in bytes
      url: string;                       // computed dynamically at query time from the currently active storage config — NOT a persisted column
    };
    uploadedBy: User;                     // relationship, required, ref 'User.media', many: false — auto-set server-side via hook, never from client input; ui.itemView.fieldMode: 'read'
    createdAt: Date;                       // timestamp, defaultValue: { kind: 'now' }; ui.createView.fieldMode: 'hidden', ui.itemView.fieldMode: 'read'
    deletedAt?: Date;                       // timestamp, optional — soft-delete marker, same convention as Event
  }
  ```
  Note: there is no `filename`/`mimeType`/`size`/`driver`/`storageKey` scalar field and no separate `width`/`height` top-level field — all of that collapses into the single `image` field, whose sub-values Keystone computes and exposes via GraphQL (e.g. `{ image { url width height filesize extension } }`).

- Access control (identical pattern to `Event`, see `.docs/specs/api/event-model.md` Section 4 — unchanged from the original design):
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

- `resolveInput.create` hook (unchanged in spirit from the original design — still force-connects the uploader):
  ```typescript
  hooks: {
    resolveInput: {
      create: ({ resolvedData, context }) => ({
        ...resolvedData,
        uploadedBy: { connect: { id: context.session?.itemId } },
      }),
    },
  }
  ```

- Media storage config-resolution module (`api/lib/media-storage.ts`):
  ```typescript
  export interface ResolvedMediaStorage {
    storageConfig: Record<string, StorageConfig>; // Keystone's own StorageConfig type, from '@keystone-6/core/types'
    activeStorageName: string;                      // the single key `image({ storage: ... })` should reference
  }

  export function resolveMediaStorage(env?: NodeJS.ProcessEnv): ResolvedMediaStorage
  export const mediaStorage: ResolvedMediaStorage; // module-load-time singleton, fails fast like lib/jwt.ts does for missing secrets
  ```
  - `local`: `{ kind: 'local', type: 'image', storagePath: STORAGE_LOCAL_DIR, generateUrl: path => `${STORAGE_LOCAL_PUBLIC_URL}${path}`, serverRoute: { path: '/uploads' } }` — Keystone auto-mounts `/uploads` itself.
  - `s3`: `{ kind: 's3', type: 'image', bucketName: S3_BUCKET, region: S3_REGION, accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, generateUrl: S3_PUBLIC_URL_BASE ? ... : undefined }`.
  - `gcs` (experimental): `{ kind: 's3', type: 'image', bucketName: GCS_BUCKET, region: 'auto', endpoint: 'https://storage.googleapis.com', accessKeyId: GCS_HMAC_ACCESS_KEY_ID, secretAccessKey: GCS_HMAC_SECRET_ACCESS_KEY, forcePathStyle: true, generateUrl: GCS_PUBLIC_URL_BASE ? ... : undefined }`.

- Example client mutation (multipart GraphQL, per `graphql-multipart-request-spec` — this is what the Admin UI itself does under the hood, and what any API client, including a future app integration, would need to follow):
  ```graphql
  mutation($file: Upload!) {
    createMedia(data: { image: { upload: $file } }) {
      id
      image { url width height filesize extension }
      uploadedBy { id }
    }
  }
  ```
  A `curl` example (per the multipart spec's `operations`/`map` fields):
  ```
  curl <api>/api/graphql \
    -H "Authorization: Bearer <token>" \
    -H "apollo-require-preflight: true" \
    -F operations='{ "query": "mutation($file: Upload!) { createMedia(data: {image: {upload: $file}}) { id image { url width height filesize extension } } }", "variables": { "file": null } }' \
    -F map='{ "0": ["variables.file"] }' \
    -F 0=@photo.jpg
  ```
  Note the `apollo-require-preflight: true` header — Apollo Server's CSRF prevention rejects `multipart/form-data` requests without it or an equivalent non-simple header.

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

  # gcs driver (experimental — via S3-interoperability API, HMAC keys)
  GCS_BUCKET=
  GCS_HMAC_ACCESS_KEY_ID=
  GCS_HMAC_SECRET_ACCESS_KEY=
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
  - `api/lib/media-storage.ts` — config-resolution module described in Section 4.
  - `api/lib/media-storage.test.ts` — unit tests for `resolveMediaStorage`/the singleton.
- Modify:
  - `api/schema.ts` — replace/add the `Media` list (`image`, `uploadedBy`, `createdAt`, `deletedAt` fields, access control, `resolveInput.create` hook); `User.media` back-relation (`relationship({ ref: 'Media.uploadedBy', many: true })`) is unchanged.
  - `api/keystone.ts` — add `storage: mediaStorage.storageConfig` to the top-level `config({...})` object; no route mounting or manual static-file serving needed.
  - `api/schema.test.ts` — `Media` access-control + hook tests (same assertions as before; not specific to the removed scalar fields).
  - `api/.env` / `api/.env.example` — add the variables from Section 4.
- Do NOT create: any custom REST route file for media, any custom storage-driver-per-provider file, any `multer`/`@aws-sdk/client-s3`/`@google-cloud/storage` dependency — none of this is needed; Keystone bundles equivalent functionality (`graphql-upload`, `file-type`, `image-size`, its own S3 client) internally.

## 7. Implementation Steps

1. Step 1: Branch `feature/media-storage` from `dev` (or continue on it, if already checked out from a prior iteration of this ticket).
2. Step 2: Add the new env vars to `api/.env` (with a working local-driver default so `npm run dev` works out of the box) and `api/.env.example`.
3. Step 3: Create `api/lib/media-storage.ts` — `resolveMediaStorage(env)` reading `STORAGE_DRIVER`, validating the selected driver's required vars (collect *all* missing names into one thrown error), returning `{ storageConfig, activeStorageName }`; export the module-load-time singleton `mediaStorage`. Call `dotenv.config({ path: '.env' })` at the top of this file (matching `lib/jwt.ts`'s pattern) — schema.ts's import of this module executes before `keystone.ts`'s own `dotenv.config()` call, since import statements compile to requires in source order.
4. Step 4: In `api/schema.ts`, replace the `Media` list's fields with `image: image({ storage: mediaStorage.activeStorageName })`, `uploadedBy` (add `ui.itemView.fieldMode: 'read'`), `createdAt` (add `ui.createView.fieldMode: 'hidden'`, `ui.itemView.fieldMode: 'read'`), `deletedAt`. Keep `access` and `hooks.resolveInput.create` as already described.
5. Step 5: In `api/keystone.ts`, import `mediaStorage` and add `storage: mediaStorage.storageConfig` to `config({...})`.
6. Step 6: Run `keystone dev` (or `postinstall`) against the dev Postgres container to regenerate `schema.prisma`/`schema.graphql`/`.keystone` types. Expect Prisma to drop any old scalar `Media` columns and add `image_id`/`image_extension`/`image_width`/`image_height`/`image_filesize` — confirm this against the actual dev DB (`TRUNCATE`/drop old test rows first if needed; this is dev-only data).
7. Step 7: Write unit tests per Section 9 and run them.
8. Step 8: Manually verify: start `npm run dev`, obtain a session, send a multipart GraphQL `createMedia` mutation (see the `curl` example in Section 4) or use the Admin UI directly, confirm `width`/`height`/`filesize`/`extension` come back correctly and the returned URL serves the file, confirm anonymous `createMedia` is denied, confirm `updateMedia(data: { deletedAt: ... })` excludes the record from a subsequent `mediaItems` query.
9. Step 9: Clean up any test user/records created during the manual verification, then commit and push.

## 8. Error Handling & Edge Cases

- If `STORAGE_DRIVER` is unset: default to `local` (safe dev default), do not throw.
- If `STORAGE_DRIVER=s3` or `gcs` and the corresponding required env vars are missing: throw a startup error immediately with a clear message naming the missing variable(s), preventing the server from running against a misconfigured backend.
- If `STORAGE_DRIVER` is set to an unrecognized value: throw a startup error immediately.
- If an uploaded file isn't `jpg`/`png`/`webp`/`gif` (per `file-type` sniffing) or dimensions can't be determined: Keystone's `image()` field rejects the upload with a GraphQL error — no custom validation code needed.
- If a `createMedia`/`updateMedia`/`deleteMedia` request has no session: standard Keystone GraphQL access-denied error (per `access.operation`) — no custom REST-style error body, unlike the original REST design.
- If a non-owner, non-admin session attempts `updateMedia`/`deleteMedia` on someone else's record: excluded by `access.filter`, standard Keystone access-denied error.
- Soft-deleted `Media` (`deletedAt` set): excluded from all default query results for every caller, same as `Event`. The underlying stored object is not deleted (see Section 3 deferred list).
- Switching `STORAGE_DRIVER` after records already exist: previously-uploaded assets' URLs will resolve against the *new* backend, not where their bytes actually live — this will 404 for pre-existing records. No migration tooling exists for this (see Section 3).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest (matches existing `api/vitest.config.ts` convention).
- Test File Location: Co-located `*.test.ts` next to each source file, as listed in Section 6.
- Coverage Required:
  - [ ] `resolveMediaStorage`: builds the correct `StorageConfig` shape for each of `local`/`s3`/`gcs`; defaults to `local` when `STORAGE_DRIVER` is unset; throws (naming the missing var) when a selected driver's required vars are incomplete; throws for an unrecognized driver value.
  - [ ] The `mediaStorage` singleton throws at import time when misconfigured (`vi.resetModules()` + `vi.stubEnv` + dynamic `import`), and constructs successfully with a valid config.
  - [ ] `Media.access.operation.query()` is always `true`; `create`/`update`/`delete` require a session.
  - [ ] `Media.access.filter.query()` excludes soft-deleted items; `update`/`delete` filters scope to the owner for a non-admin session and allow everything for an admin session.
  - [ ] `Media.hooks.resolveInput.create` forces `uploadedBy` to the session's `itemId`, ignoring any client-supplied value in `resolvedData`.
  - [ ] Edge cases from Section 8 that are pure-function-testable (config resolution) are each covered; access-control/GraphQL-level behavior (upload rejection for bad file types, access-denied errors) is verified manually per Section 7 Step 8, not via mocked unit tests, since it now lives inside Keystone's own field/access-control runtime rather than custom route code.
  - [ ] No real cloud SDK calls, filesystem writes, or live database hits in this ticket's automated tests.
- Do NOT: write integration tests that spin up a real database, a real S3/GCS bucket, or write to the real filesystem in this ticket.

### 9c. Test Execution

- Command to run tests: `cd api && npx vitest run`
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] The code is pushed to the remote branch `feature/media-storage`.
- [ ] The `Media` list exists in `api/schema.ts` with a single `image()` field plus `uploadedBy`/`createdAt`/`deletedAt`, and `User.media` back-relation resolves correctly.
- [ ] `STORAGE_DRIVER=local` works out of the box in development with no cloud credentials: an uploaded file's URL (auto-mounted by Keystone at `/uploads`) actually serves the file.
- [ ] `STORAGE_DRIVER=s3` builds a valid `StorageConfig` and is covered by mocked/pure-function unit tests without requiring real cloud credentials to run the test suite. `STORAGE_DRIVER=gcs` likewise builds a valid config via the `s3` kind + endpoint override, but is explicitly documented as unverified against a live GCS bucket.
- [ ] A `createMedia` mutation (multipart GraphQL upload) requires authentication, and the resulting record's `uploadedBy` cannot be spoofed by the client.
- [ ] Uploading an image auto-populates `width`/`height`/`filesize`/`extension` correctly, with no custom code computing them.
- [ ] `updateMedia`/`deleteMedia` require authentication and ownership (or `isAdmin`); soft-deleting via `deletedAt` excludes the record from subsequent queries without removing the underlying stored object.
- [ ] Anonymous GraphQL queries of `mediaItems` succeed; soft-deleted records never appear in query results for any caller.
- [ ] `.env.example` documents every new variable, grouped by driver, with the GCS section clearly marked experimental.
- [ ] All tests defined in Section 9 pass.
