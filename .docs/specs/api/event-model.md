# AI Feature Spec: Event Model

## 1. Feature Overview

**Description:** Add an `Event` list to the KeystoneJS API schema representing an invitation event (wedding, birthday, baptism), owned by a `User`, with schedule, location, cover/gallery media, RSVP settings, and theme fields. This is the core domain object the rest of the invitation product (guests, RSVPs, invites) will attach to.
**Business Value:** Every other feature in this product (guest lists, RSVP flows, invite links, themed pages) depends on an `Event` record existing first. This spec unblocks that work.

## 2. Current System State (Crucial)

- Existing Infrastructure: KeystoneJS 6 app (`@keystone-6/core ^6.0.0`) with PostgreSQL, defined in `api/schema.ts`. JWT auth is already implemented (`api/lib/jwt.ts`, `api/lib/auth-middleware.ts`, `api/auth.ts`) — `context.session` is populated as `{ itemId, listKey: 'User', data }` for both cookie (Admin UI) and JWT (external client) requests. See `.docs/specs/api/jwt-auth.md`.
- Existing Lists: `User` (id, name, email, password, posts, media, createdAt, isAdmin, refreshToken), `Post`, `Tag` — the latter two are starter-project boilerplate, unrelated to this feature and not to be touched.
- Existing `Media` list (built per `.docs/specs/api/media-storage.md`, already implemented in `api/schema.ts`): a single `image()` field (Keystone auto-derives `width`/`height`/`filesize`/`extension` from the uploaded bytes), `uploadedBy` (relationship to `User`, hook-forced), `createdAt`, `deletedAt`, with the same public-read/owner-or-admin-write/soft-delete-filter access pattern this spec uses for `Event`. Uploading happens via `Media`'s own `createMedia` GraphQL mutation (multipart upload) — this spec does not add any upload capability, only relationships pointing at already-uploaded `Media` records.
- Access Control Pattern in Use: `Event` and `Media` are the only lists with real, per-record access control in this codebase; `User`/`Post`/`Tag` still use `access: allowAll` (starter default).
- No `Event` list and no relationship from `User`/`Media` to any event-like list currently exists.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Add an `Event` list to `api/schema.ts` with the fields described in Section 4, mapped to Keystone field types.
  - Add an `events` back-relation on the `User` list (mirrors the existing `User.posts` pattern).
  - Wire `Event.coverImage` (single) and `Event.gallery` (many) as relationships to the already-implemented `Media` list, replacing the plain URL-string fields from the original source interface — see Section 4. Add the corresponding back-relation fields (`coverOfEvent`, `galleryOfEvents`) to the existing `Media` list in `api/schema.ts`.
  - Implement access control: any request (including anonymous) can read non-soft-deleted events; only an authenticated user can create events; only the event's author (or `isAdmin`) can update or delete their own event.
  - Implement the `deletedAt` soft-delete convention: soft-deleted events (i.e. `deletedAt` is set) are excluded from all default query results via list-level `access.filter.query`.
  - Auto-set `author` to the requesting user on create (server-side; the client does not supply `authorId`).
  - Auto-set `createdAt`/`updatedAt` via Keystone hooks/defaults.
  - Unit tests for the access control and hook behavior described above.
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT implement `visibility`, `accessCode`, or `maxGuests` — these are explicitly commented out in the source interface and are a future invite-access-control ticket.
  - DO NOT implement `Debut`, `Anniversary`, `BabyShower`, `Graduation`, `Corporate`, `Reunion`, `Conference`, `Party`, or `Other` event types — only `wedding`, `birthday`, `baptism` are active (the rest are commented out in the source enum).
  - DO NOT build a combined "create Event with a new image upload in one request" mutation. The client uploads via `Media`'s own `createMedia` mutation first, then `connect`s the resulting id when creating/updating the `Event` — a two-step flow, same as Keystone's Admin UI itself would use.
  - DO NOT enforce that a `coverImage`/`gallery` item connected to an `Event` was uploaded by that event's own author — no cross-list ownership-matching validation hook in this ticket. Any `Media` id the caller can read can be connected (which, since `Media.query` is public, is effectively any non-soft-deleted `Media` record).
  - DO NOT cascade-delete or soft-delete a connected `Media` record when its `Event` is deleted, or vice versa — deleting/soft-deleting one has no effect on the other beyond removing the relationship link (Keystone's default behavior for a nullable relationship).
  - DO NOT build any Guest, RSVP, or Invite list — this ticket is the `Event` model only.
  - DO NOT build any `app/` (Flutter) UI for creating/viewing events — API only, per explicit instruction.
  - DO NOT implement a "restore soft-deleted event" mutation/endpoint.
  - DO NOT add rate limiting or pagination changes beyond Keystone defaults.

## 4. Interfaces & Data Contracts

Source TypeScript contract this list must satisfy (fields map to Keystone field types as noted):

```typescript
export interface Event {
  id: string;                    // Keystone default `id` (uuid)
  authorId: string;              // modeled as `author: relationship({ ref: 'User.events' })`

  title: string;                 // text, required
  description?: string;          // text, multiline, optional
  type: EventType;                // select, required, enum options below

  startDate: Date;               // timestamp, required
  endDate?: Date;                // timestamp, optional
  timezone: string;               // text, required (IANA tz string, e.g. "Asia/Manila")

  venueName?: string;             // text, optional
  address?: string;               // text, optional
  latitude?: number;               // float, optional
  longitude?: number;              // float, optional

  coverImage?: Media;              // relationship, optional, many: false, ref: 'Media.coverOfEvent' — connects an existing Media id; no upload happens through this field
  gallery?: Media[];               // relationship, optional, many: true, ref: 'Media.galleryOfEvents'

  allowPlusOne: boolean;           // checkbox, required, defaultValue: false
  rsvpDeadline?: Date;              // timestamp, optional
  requireApproval: boolean;         // checkbox, required, defaultValue: false

  primaryColor?: string;            // text, optional (hex string, e.g. "#FF00FF")
  secondaryColor?: string;           // text, optional
  fontFamily?: string;               // text, optional

  createdAt: Date;                   // timestamp, defaultValue: { kind: 'now' }
  updatedAt: Date;                    // timestamp, updated via hook on every write
  deletedAt?: Date;                    // timestamp, optional (soft-delete marker)
}

export enum EventType {
  Wedding = "wedding",
  Birthday = "birthday",
  Baptism = "baptism",
}
```

- Corresponding back-relation fields to add on the existing `Media` list:
  ```typescript
  // On Media:
  coverOfEvent: relationship({ ref: 'Event.coverImage', many: false }),   // a Media item is the cover of at most one Event
  galleryOfEvents: relationship({ ref: 'Event.gallery', many: true }),     // a Media item may appear in more than one Event's gallery
  ```

- Access control shape (Keystone `access` config on the `Event` list):
  ```typescript
  access: {
    operation: {
      query: () => true,                                   // public read
      create: ({ session }) => Boolean(session),            // must be logged in
      update: ({ session }) => Boolean(session),
      delete: ({ session }) => Boolean(session),
    },
    filter: {
      query: () => ({ deletedAt: { equals: null } }),        // hide soft-deleted everywhere
      update: ({ session }) =>
        session?.data?.isAdmin ? true : { author: { id: { equals: session?.itemId } } },
      delete: ({ session }) =>
        session?.data?.isAdmin ? true : { author: { id: { equals: session?.itemId } } },
    },
  }
  ```
  Note: `session.data.isAdmin` requires `isAdmin` to remain in the `sessionData` GraphQL fragment in `api/auth.ts` (it already is — no change needed there).

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` and ensure you pull latest changes first.
- Branch Naming Convention: `feature/[ticket-ID]-brief-description`
- Target Branch Name: `feature/event-model`
- Commit Standard: Use Conventional Commits. Commits must be atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the git push command used.

## 6. File Operations

- Create:
  - `api/schema.test.ts` — access control and hook unit tests for the `Event` list (or co-locate under `api/test/` if that matches whatever convention `api/test/` already holds — check before creating).
- Modify:
  - `api/schema.ts` — add the `Event` list; add `events: relationship({ ref: 'Event.author', many: true })` to the `User` list's `fields`; add `coverOfEvent`/`galleryOfEvents` back-relation fields to the existing `Media` list's `fields`.

## 7. Implementation Steps

1. Step 1: Checkout the new branch `feature/event-model` from `dev`.
2. Step 2: Add the `events` back-relation field to `User.fields` in `api/schema.ts`, following the existing `posts` relationship pattern.
3. Step 3: Add the `Event` list to `api/schema.ts` with all fields from Section 4, using `select` for `type` (options: `wedding`, `birthday`, `baptism`), `float` for `latitude`/`longitude`, and `checkbox` with `defaultValue: false` for `allowPlusOne`/`requireApproval`.
4. Step 4: Add the `author` relationship field (`ref: 'User.events'`, `many: false`), required.
5. Step 5: Add `coverImage: relationship({ ref: 'Media.coverOfEvent', many: false })` and `gallery: relationship({ ref: 'Media.galleryOfEvents', many: true })` to `Event.fields`; add the corresponding `coverOfEvent`/`galleryOfEvents` back-relation fields to the existing `Media` list's `fields` in `api/schema.ts`.
6. Step 6: Implement `access.operation` and `access.filter` exactly as specified in Section 4.
7. Step 7: Add a `resolveInput` hook (or `hooks.resolveInput`) on create that sets `author` to `{ connect: { id: session.itemId } }` server-side, ignoring any client-supplied author/authorId.
8. Step 8: Add an `updatedAt` field with a `resolveInput` hook that sets it to `new Date()` on every `create`/`update` operation.
9. Step 9: Run `keystone dev` (or the equivalent Prisma migration command used in this repo) to generate and apply the migration for the new `Event` table and the `Media` relationship columns.
10. Step 10: Write unit tests per Section 9 and run them.
11. Step 11: Commit atomically (schema change, then hooks/access control, then tests) and push.

## 8. Error Handling & Edge Cases

- If a request without a session attempts to `create`, `update`, or `delete` an Event: the GraphQL mutation is denied by Keystone's access control (standard Keystone "Access denied" error) — no custom error handling needed.
- If an authenticated user attempts to `update`/`delete` an Event they do not own (and they are not `isAdmin`): the item is filtered out of scope by `access.filter`, so Keystone returns its standard "not found" style access-denied error rather than leaking existence of the record.
- If `endDate` is provided and is before `startDate`: out of scope for this ticket — no validation hook is added (deferred to a future validation pass once RSVP/guest flows exist to define what "invalid" means for this product).
- If `type` is omitted or not one of `wedding`/`birthday`/`baptism`: standard Keystone `select` field validation rejects it (enforced by `validation: { isRequired: true }` and the fixed `options` list).
- If `coverImage`/`gallery` is connected to a `Media` id that doesn't exist (or is soft-deleted, and thus filtered out of `Media`'s own default query scope): standard Keystone relationship "unable to connect" error — no custom handling needed.
- Soft-deleted events (`deletedAt` set): excluded from every default query via `access.filter.query`, for both anonymous and authenticated requests, including the author themselves. There is no "view my deleted events" escape hatch in this ticket (deferred).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest (matches existing `api/vitest.config.ts` convention used by `api/lib/jwt.test.ts` and `api/routes/auth.test.ts`).
- Test File Location: Co-locate as `api/schema.test.ts`, next to `api/schema.ts`.
- Coverage Required:
  - [ ] Happy path: an authenticated session can create an `Event` with required fields (`title`, `type`, `startDate`, `timezone`, `allowPlusOne`, `requireApproval`) and the created record's `author` is automatically set to the session's `itemId`, regardless of any `author`/`authorId` value the caller passed in.
  - [ ] Validation errors: creating an `Event` missing `title`, `type`, `startDate`, or `timezone` fails.
  - [ ] Auth/permissions: an anonymous (no session) request cannot `create` an Event.
  - [ ] Auth/permissions: a session belonging to a different user cannot `update` or `delete` another user's Event (filtered out, access-denied).
  - [ ] Auth/permissions: a session with `isAdmin: true` CAN `update`/`delete` an Event it does not own.
  - [ ] Anonymous (no session) requests CAN `query` events (public read).
  - [ ] An Event with `deletedAt` set is excluded from `query` results for anonymous requests, non-owner requests, and the owner's own requests alike.
  - [ ] `updatedAt` changes on every `update` mutation.
  - [ ] An `Event` can be created/updated with `coverImage`/`gallery` connected to existing `Media` id(s), and querying the event back resolves `coverImage.image.url` / `gallery { image { url } }` correctly.
  - [ ] Connecting a nonexistent (or soft-deleted) `Media` id to `coverImage`/`gallery` fails with Keystone's standard relationship error.
  - [ ] Edge cases from Section 8 above are each covered by a dedicated test case.
  - [ ] External calls (Postgres) — use the same Keystone in-memory/test context setup pattern already established in `api/routes/auth.test.ts` / `api/lib/auth-middleware.test.ts`; do not hit a live database in this ticket.
- Do NOT: write integration tests that spin up a real database in this ticket.

### 9c. Test Execution

- Command to run tests: `cd api && npx vitest run`
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] The code is pushed to the remote branch `feature/event-model`.
- [ ] The `Event` list exists in `api/schema.ts` with every field from Section 4, correctly typed.
- [ ] `User.events` back-relation exists and resolves the events authored by that user.
- [ ] `Event.coverImage`/`Event.gallery` connect to existing `Media` records, and `Media.coverOfEvent`/`Media.galleryOfEvents` resolve the reverse direction correctly.
- [ ] An authenticated GraphQL request can create an `Event`; the resulting record's `author` matches the caller's session, not any client-supplied value.
- [ ] An anonymous GraphQL request can query `events` but cannot create, update, or delete one.
- [ ] A non-owner, non-admin authenticated session cannot update or delete another user's `Event`.
- [ ] An `isAdmin` session can update or delete any `Event`.
- [ ] Setting `deletedAt` on an `Event` removes it from all default query results, for every caller.
- [ ] All tests defined in Section 9 pass.
