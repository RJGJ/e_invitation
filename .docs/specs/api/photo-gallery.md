# AI Feature Spec: Photo Gallery — Guest Uploads & Storage Quota

## 1. Feature Overview

**Description:** Extend `Event.gallery` (currently host-only, per `event-model.md`) to accept guest uploads via `inviteToken`, and enforce a 2GB-per-event storage cap (design screen `10`, PLAN.md §3).
**Business Value:** The flagship premium feature named explicitly in `PLAN.md` §3 — the main thing hosts pay for beyond the free reveal+RSVP.

## 2. Current System State (Crucial)

- Existing Infrastructure: `Media` list (`.docs/specs/api/media-storage.md`) — `image()` field, `uploadedBy` relationship (hook-forced to the session), soft-delete. `Event.gallery`/`coverImage` relationships already connect existing `Media` records (`.docs/specs/api/event-model.md`) but creation only happens via `Media`'s own `createMedia` mutation, which requires a session (`access.operation.create: ({ session }) => Boolean(session)`) — guests (token-based, no session) currently cannot upload at all.
- `Event.isPremium` placeholder exists per `.docs/specs/api/rsvp-flow.md`, to be replaced by M9.
- No storage-quota tracking exists.

## 3. Scope & Boundaries

- IN SCOPE:
  - A public (no-session) `uploadGuestPhoto` custom mutation: takes `inviteToken` + an uploaded file, validates the token resolves to a valid `Guest`/`Event`, validates `event.isPremium` is `true` (reject otherwise — gallery is premium-only, per PLAN.md §3), validates the event's current gallery usage + new file size doesn't exceed 2GB, creates a `Media` record via `context.sudo()` (bypassing the normal session-required `Media.create`) with `uploadedBy` left null (guest uploads aren't tied to a `User`) and connects it to `Event.gallery`.
  - `Event.galleryUsageBytes`: a computed/virtual field (Keystone `virtual` field type) summing `gallery { image { filesize } }` — powers the "0.9 of 2 GB used" usage meter.
  - Quota constant `GALLERY_QUOTA_BYTES = 2 * 1024 * 1024 * 1024` (2GB) in `api/lib/photo-gallery.ts`.
- DEFERRED:
  - DO NOT build a storage top-up purchase flow — PLAN.md §3 explicitly defers this ("offer a top-up later").
  - DO NOT build photo moderation/reporting/deletion-by-guest — only the event owner can delete gallery `Media` (inherits `Media`'s existing owner-or-admin delete access; a guest who uploaded a photo cannot delete it themselves in this ticket).
  - DO NOT change `Media.uploadedBy`'s existing hook-forced-from-session behavior for host uploads — this ticket adds a *second*, guest-specific upload path (`uploadGuestPhoto`) rather than modifying `createMedia` itself, since `createMedia` legitimately requires a session for the host-upload case host dashboards will keep using (e.g. cover image).

## 4. Interfaces & Data Contracts

```typescript
// api/lib/photo-gallery.ts
export const GALLERY_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;
```

- Custom mutation:
  ```graphql
  type Mutation {
    uploadGuestPhoto(inviteToken: String!, file: Upload!): MediaItem
  }
  ```
  Resolver logic:
  ```typescript
  async (root, { inviteToken, file }, context) => {
    const guest = await context.sudo().query.Guest.findOne({
      where: { inviteToken },
      query: 'event { id isPremium gallery { image { filesize } } }',
    });
    if (!guest) throw new Error('Invalid invite token');
    if (!guest.event.isPremium) throw new Error('Gallery is a premium feature');

    const currentUsage = guest.event.gallery.reduce((sum, m) => sum + m.image.filesize, 0);
    // Keystone's image() field derives filesize after upload; a pre-check against
    // the incoming file's byte length (available from the Upload scalar) guards
    // the common case, with a post-upload check as a fallback below.
    const media = await context.sudo().query.Media.createOne({
      data: { image: { upload: file }, galleryOfEvents: { connect: { id: guest.event.id } } },
      query: 'id image { url filesize }',
    });
    if (currentUsage + media.image.filesize > GALLERY_QUOTA_BYTES) {
      await context.sudo().query.Media.deleteOne({ where: { id: media.id } });
      throw new Error('Event photo gallery is full (2GB limit)');
    }
    return media;
  }
  ```
- `Event` field addition (virtual, computed — not stored):
  ```typescript
  galleryUsageBytes: virtual({
    field: graphql.field({
      type: graphql.Int,
      resolve: async (item, args, context) => {
        const event = await context.query.Event.findOne({
          where: { id: item.id.toString() },
          query: 'gallery { image { filesize } }',
        });
        return event.gallery.reduce((sum: number, m: any) => sum + m.image.filesize, 0);
      },
    }),
  }),
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/photo-gallery`
- Target Branch Name: `feature/photo-gallery`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `api/lib/photo-gallery.ts` — `uploadGuestPhoto` resolver + `GALLERY_QUOTA_BYTES` constant.
  - `api/lib/photo-gallery.test.ts`
- Modify:
  - `api/schema.ts` — add `Event.galleryUsageBytes` virtual field.
  - `api/keystone.ts` — wire `uploadGuestPhoto` into `extendGraphqlSchema`.

## 7. Implementation Steps

1. Checkout `feature/photo-gallery` from `dev`.
2. Add `galleryUsageBytes` virtual field to `Event`.
3. Implement `uploadGuestPhoto` in `api/lib/photo-gallery.ts` per Section 4 (post-upload quota check + rollback-delete on overage, since Keystone's `image()` field doesn't expose byte size pre-upload).
4. Wire the mutation via `extendGraphqlSchema`.
5. Write tests per Section 9; run them.
6. Commit atomically (virtual field, then resolver, then tests) and push.

## 8. Error Handling & Edge Cases

- Invalid `inviteToken`: mutation throws `"Invalid invite token"`, no `Media` created.
- Non-premium event: throws `"Gallery is a premium feature"` before any upload attempt — no wasted storage write.
- Upload that would exceed the 2GB quota: the file is uploaded (Keystone's `image()` field requires the file to exist to derive `filesize`), then immediately deleted and the mutation throws `"Event photo gallery is full (2GB limit)"` — a transient storage write happens but is cleaned up synchronously; acceptable for this ticket's scale (no async cleanup job needed).
- Event soft-deleted (`deletedAt` set) between token issuance and upload: `context.sudo().query.Guest.findOne` still resolves (sudo bypasses the `Event` list's own query filter only when querying `Event` directly, but `Guest`'s own filter doesn't check `event.deletedAt`) — add an explicit `deletedAt: null` check on the fetched event in the resolver and throw `"Invalid invite token"` if it's soft-deleted, treating it the same as a not-found event.
- Concurrent uploads pushing combined usage over quota (race condition): out of scope for this ticket — the post-upload check is best-effort, not transactionally safe against simultaneous uploads; acceptable given the guest-upload volume this product expects.

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/lib/photo-gallery.test.ts`.
- Coverage Required:
  - [ ] Happy path: valid token + premium event + under-quota upload succeeds, connects to `Event.gallery`.
  - [ ] Invalid token rejected, no `Media` created.
  - [ ] Non-premium event rejected before upload.
  - [ ] Upload exceeding quota is uploaded-then-deleted and the mutation throws (verify no orphaned `Media` row remains after the call).
  - [ ] `galleryUsageBytes` correctly sums `filesize` across all gallery items.
  - [ ] Soft-deleted event's guest token is treated as invalid.
  - [ ] Edge cases from Section 8 covered.
- Do NOT: write integration tests hitting a real database or real storage backend — mock the storage driver per `.docs/specs/api/media-storage.md`'s existing test conventions.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/photo-gallery`.
- [ ] Guests can upload photos via a valid token to a premium event, blocked on non-premium events and quota overage.
- [ ] `Event.galleryUsageBytes` accurately reflects total gallery storage.
- [ ] All tests defined in Section 9 pass.
