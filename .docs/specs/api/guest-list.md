# AI Feature Spec: Guest List Management — Host CRUD

## 1. Feature Overview

**Description:** Host-scoped `Guest` CRUD (add one, bulk import, remove) and invite-link/token generation, extending the `Guest` list `.docs/specs/api/rsvp-flow.md` (M3) created. M3 only supported guests updating their own RSVP by token; this ticket lets the event owner manage the roster itself.
**Business Value:** Hosts must be able to build and maintain the invite list — without this, `Guest` rows can only be created via the seed script from M3, which doesn't scale past a demo.

## 2. Current System State (Crucial)

- Existing Infrastructure: `Guest` list exists per `.docs/specs/api/rsvp-flow.md` with `access.operation.create/update/delete` all hard-set to `() => false` (guest rows could only be written via the `submitRsvp` custom resolver's `context.sudo()` bypass). This ticket changes that access config to allow the event owner through, in addition to the existing `submitRsvp` path.
- `Event.author` ownership pattern already established.

## 3. Scope & Boundaries

- IN SCOPE:
  - Change `Guest.access.operation` so `create`/`update`/`delete` require a session (matching `Event`/`Media`'s pattern), and `Guest.access.filter` restricts `update`/`delete` to the parent event's owner (or admin) — same shape as `Event.access.filter`.
  - `Guest.hooks.resolveInput.create`: server-generates `inviteToken` (crypto-random, e.g. `randomBytes(16).toString('hex')`) — never client-supplied — and validates the connected `event` belongs to the requesting session (reject if not, via a `validateInput` hook or resolver check) so a host can't create guests under another host's event.
  - A `bulkImportGuests` custom mutation accepting an array of `{ name, contactInfo }` for a given `eventId`, creating multiple `Guest` rows in one call (wraps individual creates in a loop inside the resolver — no new bulk-specific list logic needed).
- DEFERRED:
  - DO NOT build CSV file parsing — `bulkImportGuests` accepts already-parsed `{ name, contactInfo }[]` JSON; parsing an uploaded CSV file is the app's job (or a future ticket) if a raw file needs to be accepted.
  - DO NOT build SMS/email invite delivery — this ticket only generates the `inviteToken`; sending the actual invite link is out of scope (host copies/shares the link manually for v1).
  - DO NOT build a "resend invite" mutation — the same `inviteToken` is reusable indefinitely; "resend" is a UI-only action (app re-shares the same link), no new API surface needed.

## 4. Interfaces & Data Contracts

- Updated `Guest.access` (`api/schema.ts`):
  ```typescript
  access: {
    operation: {
      query: ({ session }) => Boolean(session),
      create: ({ session }) => Boolean(session),
      update: ({ session }) => Boolean(session),
      delete: ({ session }) => Boolean(session),
    },
    filter: {
      query: ({ session }) =>
        session?.data?.isAdmin ? true : { event: { author: { id: { equals: session?.itemId } } } },
      update: ({ session }) =>
        session?.data?.isAdmin ? true : { event: { author: { id: { equals: session?.itemId } } } },
      delete: ({ session }) =>
        session?.data?.isAdmin ? true : { event: { author: { id: { equals: session?.itemId } } } },
    },
  }
  ```
  Note: `submitRsvp`'s resolver already uses `context.sudo()` (per `.docs/specs/api/rsvp-flow.md` Section 4), so it is unaffected by tightening `operation.query`/`update` here — guests never call the standard `updateGuest` mutation directly.
- `Guest.hooks`:
  ```typescript
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => ({
        ...resolvedData,
        inviteToken: randomBytes(16).toString('hex'),
        status: 'pending',
      }),
    },
    validateInput: async ({ resolvedData, context, addValidationError }) => {
      const eventId = resolvedData.event?.connect?.id;
      if (!eventId) return;
      const event = await context.sudo().query.Event.findOne({ where: { id: eventId }, query: 'author { id }' });
      if (event?.author?.id !== context.session?.itemId && !context.session?.data?.isAdmin) {
        addValidationError("Cannot add guests to an event you don't own");
      }
    },
  }
  ```
- `bulkImportGuests` custom mutation:
  ```graphql
  input BulkGuestInput { name: String!, contactInfo: String }
  type Mutation {
    bulkImportGuests(eventId: ID!, guests: [BulkGuestInput!]!): [Guest!]!
  }
  ```
  Resolver: validates `eventId` belongs to `context.session.itemId` (or admin), then loops `context.db.Guest.createOne({ data: { ...g, event: { connect: { id: eventId } } } })` for each entry (the `resolveInput` hook above still fires per-item, generating each `inviteToken`).

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/guest-list`
- Target Branch Name: `feature/guest-list`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Modify:
  - `api/schema.ts` — update `Guest.access`/`Guest.hooks`.
  - `api/lib/rsvp.ts` (or a new `api/lib/guests.ts`) — add `bulkImportGuests` resolver, wire via `extendGraphqlSchema`.
  - `api/schema.test.ts` / `api/lib/rsvp.test.ts` — extend with host-CRUD + bulk-import tests.

## 7. Implementation Steps

1. Checkout `feature/guest-list` from `dev`.
2. Update `Guest.access` per Section 4.
3. Add `resolveInput`/`validateInput` hooks per Section 4.
4. Implement `bulkImportGuests` in `api/lib/guests.ts`; wire into `extendGraphqlSchema` in `api/keystone.ts` alongside `submitRsvp`.
5. Write tests per Section 9; run them.
6. Commit atomically (access/hooks, then bulk mutation, then tests) and push.

## 8. Error Handling & Edge Cases

- Non-owner attempting to `createGuest`/`updateGuest`/`deleteGuest` under someone else's event: rejected by `validateInput` (create) / `access.filter` (update/delete).
- `bulkImportGuests` with an empty array: returns `[]`, no error.
- `bulkImportGuests` targeting a non-existent or another host's `eventId`: whole call rejected before any rows are created (validate once up front, not per-item) — no partial import.
- Duplicate `name`/`contactInfo` in a bulk import: allowed — no uniqueness constraint on `Guest.name`/`contactInfo` (a host may genuinely have two guests named "Maria Santos").

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/lib/guests.test.ts`.
- Coverage Required:
  - [ ] Happy path: event owner creates a `Guest`, `inviteToken` is server-generated (not client-settable — passing a client `inviteToken` is ignored).
  - [ ] Non-owner cannot create/update/delete a guest under another host's event.
  - [ ] `bulkImportGuests` creates all provided guests, each with a distinct `inviteToken`.
  - [ ] `bulkImportGuests` rejects entirely if `eventId` isn't owned by the caller.
  - [ ] Existing `submitRsvp` guest-facing flow from `.docs/specs/api/rsvp-flow.md` still passes unaffected by the tightened `Guest.access`.
  - [ ] Edge cases from Section 8 covered.
- Do NOT: write integration tests hitting a real database.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/guest-list`.
- [ ] Event owners can create/update/delete their own event's guests; cannot touch other hosts' guests.
- [ ] `bulkImportGuests` works for a valid owner-scoped `eventId`, rejects otherwise.
- [ ] `submitRsvp` (M3) continues to work unaffected.
- [ ] All tests defined in Section 9 pass.
