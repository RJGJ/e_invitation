# Implementation Plan: Event Model

## Context

`.docs/specs/api/event-model.md` is fully written and reviewed, including its recent update wiring `Event.coverImage`/`Event.gallery` to the already-implemented `Media` list. The `Event` list itself doesn't exist in `api/schema.ts` yet — only `User`, `Post`, `Tag`, `Media` do. This plan implements it: a new `Event` list with schedule/location/theme/RSVP fields, owner-scoped access control mirroring `Media`'s exact pattern, and two-sided relationships to both `User` (author) and `Media` (coverImage/gallery). Work happens on a new `feature/event-model` branch off `dev` (where `feature/media-storage` was already merged).

Confirmed current state (verified directly against `api/schema.ts`):
- Field imports from `@keystone-6/core/fields`: `text, relationship, password, timestamp, checkbox, image` — need to add `select` and `float` for `Event.type`/`latitude`/`longitude`.
- `Media` list (`api/schema.ts:172-230`) is the exact access-control/hook template to copy: `access.operation` (public query, session-required write), `access.filter` (soft-delete exclusion on query, owner-or-admin scoping on update/delete via `session?.data?.isAdmin ? true : { uploadedBy: { id: { equals: session?.itemId } } }`), and `hooks.resolveInput.create` force-connecting `uploadedBy` from `context.session?.itemId`.
- Relationship convention: two-sided `relationship({ ref: 'OtherList.fieldName', many })` pairs, e.g. `User.posts` ↔ `Post.author`, `User.media` ↔ `Media.uploadedBy` (`api/schema.ts:57`, `:60`, `:214`).
- `api/schema.test.ts` tests `Media.access.operation/filter` and `hooks.resolveInput.create` as plain hand-written functions — no real Keystone runtime, no `createMockContext()` (that fixture is only for REST-route tests like `api/routes/auth.test.ts`). Same style applies to `Event`.
- No date/timezone library exists or is needed — `timezone` is a plain required `text` (IANA string).
- Keystone's real `ResolveInputListHook` type (confirmed earlier, `hooks.d.ts`) supports either one function for both operations or an object with independent `create`/`update` sub-hooks — the object form is what `Event` needs, since `updatedAt` must be set on both create and update, unlike `Media`'s hook which only handles `create`.

## Steps

1. **Branch**: `git checkout dev && git pull && git checkout -b feature/event-model`.

2. **`api/schema.ts` imports** — add `select` and `float` to the `@keystone-6/core/fields` import block (no `integer` needed — nothing in `Event` uses it).

3. **`User.fields`** — add, after the existing `media` relationship (`api/schema.ts:60`):
   ```ts
   // Events this User has authored — see the Event list below.
   events: relationship({ ref: 'Event.author', many: true }),
   ```

4. **`Media.fields`** — add, after `uploadedBy` (`api/schema.ts:219`):
   ```ts
   // A Media item is the cover of at most one Event.
   coverOfEvent: relationship({ ref: 'Event.coverImage', many: false }),
   // A Media item may appear in more than one Event's gallery.
   galleryOfEvents: relationship({ ref: 'Event.gallery', many: true }),
   ```

5. **New `Event` list** — add after `Media` as the last list. `access` block copied verbatim from `Media`'s pattern, substituting `author`/`Media.uploadedBy` → `author`/nothing (Event is the "owning" side via its own `author` field, filter checks `{ author: { id: { equals: session?.itemId } } }`).

   `hooks.resolveInput` as an **object with separate `create` and `update` sub-hooks** (not a single combined function, since `Media`'s single-function-for-create-only pattern doesn't fit — `Event` needs different behavior per operation):
   ```ts
   hooks: {
     resolveInput: {
       create: ({ resolvedData, context }) => ({
         ...resolvedData,
         author: { connect: { id: context.session?.itemId } },
         updatedAt: new Date(),
       }),
       update: ({ resolvedData }) => ({
         ...resolvedData,
         updatedAt: new Date(),
       }),
     },
   },
   ```

   `fields` (matching spec Section 4 exactly):
   ```ts
   author: relationship({
     ref: 'User.events',
     many: false,
     ui: { itemView: { fieldMode: 'read' } }, // hook-forced, never hand-editable
   }),

   title: text({ validation: { isRequired: true } }),
   description: text({ ui: { displayMode: 'textarea' } }),

   type: select({
     options: [
       { label: 'Wedding', value: 'wedding' },
       { label: 'Birthday', value: 'birthday' },
       { label: 'Baptism', value: 'baptism' },
       // Other EventType values are commented out in the source interface — deferred.
     ],
     validation: { isRequired: true },
   }),

   startDate: timestamp({ validation: { isRequired: true } }),
   endDate: timestamp(),
   timezone: text({ validation: { isRequired: true } }),

   venueName: text(),
   address: text(),
   latitude: float(),
   longitude: float(),

   // Connects an existing Media id — no upload happens through this field.
   coverImage: relationship({ ref: 'Media.coverOfEvent', many: false }),
   gallery: relationship({ ref: 'Media.galleryOfEvents', many: true }),

   allowPlusOne: checkbox({ defaultValue: false }),
   rsvpDeadline: timestamp(),
   requireApproval: checkbox({ defaultValue: false }),

   primaryColor: text(),
   secondaryColor: text(),
   fontFamily: text(),

   createdAt: timestamp({
     defaultValue: { kind: 'now' },
     ui: { createView: { fieldMode: 'hidden' }, itemView: { fieldMode: 'read' } },
   }),
   updatedAt: timestamp({
     ui: { createView: { fieldMode: 'hidden' }, itemView: { fieldMode: 'read' } },
   }),
   deletedAt: timestamp(),
   ```
   Note: `author` has no `validation.isRequired` — the hook is the sole source of truth for it, avoiding a chicken-and-egg validation-order conflict on create.

6. **`api/schema.test.ts`** — append `Event.access.operation`/`access.filter`/`hooks.resolveInput` `describe` blocks, exactly mirroring the existing `Media` blocks' structure (hand-written narrow type casts, `as unknown as {...}` before the hook cast — same gotcha hit previously with Media's hook test, since the real generated `ResolveInputListHook` type is stricter than a narrow test-local shape). Cover: `query()` always true; `create`/`update`/`delete` require a session; `filter.query()` excludes soft-deleted; `filter.update`/`delete` scope to `{ author: { id: { equals } } }` for non-admin, `true` for admin; `resolveInput.create` forces `author` (ignoring a spoofed value) and sets `updatedAt`; `resolveInput.update` sets `updatedAt`.

7. **Regenerate schema**: run `./node_modules/.bin/keystone dev` (or `postinstall`) against the local dev Postgres container (same one used for `Media`) to regenerate `schema.prisma`/`schema.graphql`/`node_modules/.keystone/types.ts` and create the new `Event` table plus `Media`'s new `coverOfEvent`/`galleryOfEvents` columns. If it prompts interactively, pipe `yes |` into it via `nohup` in the background (same approach used for the Media migration), then check the log. This is a brand-new table plus two new nullable relationship columns on `Media` — no destructive changes expected, so an interactive prompt is unlikely but should still be handled non-interactively for a smooth run. Kill the server process afterward (checking the actual listening PID, not just the shell wrapper — per this repo's `CLAUDE.md` "Dev servers" rule).

8. **Run tests**: `cd api && npx vitest run` — confirm all existing tests plus the new `Event` tests pass. `npx tsc --noEmit` — confirm no new type errors.

9. **Manual verification** (same multipart-GraphQL pattern documented in `media-storage.md` Section 4): log in as a test user → `createMedia` to get a real `Media` id → `createEvent` with required fields plus `coverImage: { connect: { id } } }` → confirm `author.id` matches the caller, not any client-supplied value → confirm anonymous `events` query succeeds → confirm anonymous `createEvent` is denied → confirm a second user's session can't `updateEvent`/`deleteEvent` on the first user's event → confirm an admin session can → set `deletedAt` and confirm it's excluded from queries for every caller → query `Media.coverOfEvent`/`galleryOfEvents` and confirm the reverse relation resolves. Clean up test data afterward.

10. **Commit** (atomic, Conventional Commits, no AI-agent mentions): schema + hooks + relationships in one commit, tests in a second, generated `schema.prisma`/`schema.graphql` in a third **only if those files are git-tracked** (check `git status`/`git check-ignore api/schema.prisma` first — they were tracked for the `Media` feature, so likely tracked here too, but verify rather than assume).

11. **Push**: `git push -u origin feature/event-model`, per the spec's Section 5 "Final Action."

## Verification

1. `cd api && npx tsc --noEmit` — no new type errors.
2. `cd api && npx vitest run` — full suite passes (existing `jwt`/`auth`/`auth-middleware`/`Media` tests unmodified, plus new `Event` tests).
3. Schema regeneration confirmed: `api/schema.prisma` has a new `model Event { ... }` and `model Media` gains `coverOfEvent`/`galleryOfEvents` relation fields; `api/schema.graphql` has `Event`, `EventWhereInput`, `EventCreateInput`, etc.
4. Manual GraphQL walkthrough per Step 9 above, covering access control, soft-delete filtering, and both relationship directions.
5. Kill any dev server process started during verification (actual listening PID, not the shell wrapper).

### Critical files
`api/schema.ts`, `api/schema.test.ts`, `api/schema.prisma` (generated, verify only), `api/schema.graphql` (generated, verify only)
