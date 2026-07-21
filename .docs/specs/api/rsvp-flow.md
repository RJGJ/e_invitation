# AI Feature Spec: RSVP Flow — Guest Model

## 1. Feature Overview

**Description:** Add a `Guest` list to the Keystone schema — one row per invitee per `Event` — holding RSVP status, party size, and free/premium response fields (meal, dietary, song request, note). Add a token-based public mutation guests use to submit their own RSVP without logging in.
**Business Value:** RSVP data is the core value hosts get from the platform; also the first real free/premium feature gate (PLAN.md §3).

## 2. Current System State (Crucial)

- Existing Infrastructure: `Event` list (owner-scoped, public read) already implemented per `.docs/specs/api/event-model.md`. `User`/session pattern per `api/auth.ts`.
- No `Guest` list exists. Guests are not `User` accounts — they RSVP via a link/token, not a login (per PLAN.md's guest-facing free-tier design and DESIGN_SYSTEM.md §10's "web invitation, no app needed" requirement).
- Premium-question gating: the real `Plan`/`Entitlement` model doesn't exist yet (that's `.docs/specs/api/monetization.md`, M9). This spec gates on a placeholder `Event.isPremium` checkbox (defaultValue `false`) that M9's spec will replace with a real entitlement lookup — calling out explicitly so M9's author knows to remove this field and migrate its call sites.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Guest` list: `event` relationship, `name`, `contactInfo` (email/phone, optional), `inviteToken` (unique, server-generated), `status` (select: `pending`/`going`/`declined`), `partySize` (integer via `float`-then-round, or Keystone's `integer` field — use `integer`), `meal` (select, optional), `dietary` (text, optional, comma-list or `json`), `songRequest` (text, optional), `note` (text, optional), `respondedAt` (timestamp, optional).
  - `Event.isPremium` placeholder checkbox (defaultValue `false`) gating whether `meal`/`dietary`/`songRequest`/custom-question fields are accepted on submit — see Section 8.
  - A public (no-session) `submitRsvp` custom GraphQL mutation (Keystone extendGraphqlSchema) that looks up a `Guest` by `inviteToken`, validates it belongs to a non-deleted `Event`, and updates `status`/`partySize`/response fields + `respondedAt`.
  - Host-readable `Guest.event` back-relation query (`Event.guests`) — read-only in this ticket; host-side CRUD is `.docs/specs/api/guest-list.md` (M6).
  - Access control: `Guest.query` is public only when filtered by `inviteToken` (the token itself is the authorization — see Section 4); a logged-in `Event` owner can query all their event's guests; no anonymous "list all guests" query.
- DEFERRED:
  - DO NOT build host-side guest CRUD (add/import/remove) — that's `.docs/specs/api/guest-list.md` (M6). This ticket only supports a guest updating their own existing `Guest` row via token.
  - DO NOT build the real entitlement check — use the `Event.isPremium` placeholder, flagged for M9 to replace.
  - DO NOT build invite delivery (SMS/email) or token-generation-on-add — since M6 (which creates `Guest` rows and their tokens) hasn' shipped yet, seed test `Guest` rows with a script for this ticket's own testing.
  - DO NOT validate `partySize` against `Event.allowPlusOne` — out of scope, deferred to a future validation pass (same reasoning as `event-model.md`'s deferred `endDate`/`startDate` check).

## 4. Interfaces & Data Contracts

```typescript
export interface Guest {
  id: string;
  eventId: string;                 // relationship: event -> Event.guests
  name: string;                     // text, required
  contactInfo?: string;              // text, optional
  inviteToken: string;                // text, required, unique, server-generated (crypto.randomBytes)
  status: RsvpStatus;                  // select, required, defaultValue: "pending"
  partySize: number;                    // integer, required, defaultValue: 1
  meal?: string;                          // select, optional — only settable if event.isPremium
  dietary?: string;                        // text, optional — only settable if event.isPremium
  songRequest?: string;                     // text, optional — only settable if event.isPremium
  note?: string;                             // text, optional — always settable (free tier)
  respondedAt?: Date;                         // timestamp, optional
  createdAt: Date;
}

export enum RsvpStatus { Pending = "pending", Going = "going", Declined = "declined" }
```

- `Guest` access control:
  ```typescript
  access: {
    operation: {
      // No public list-all query — reads happen only via the submitRsvp
      // mutation's own token lookup (bypasses list access via context.sudo(),
      // see the resolver below) or an authenticated event-owner query.
      query: ({ session }) => Boolean(session),
      create: () => false,   // Guest rows are created by M6's host-side CRUD, not here
      update: () => false,   // updates happen only via submitRsvp's context.sudo() write
      delete: () => false,
    },
    filter: {
      query: ({ session }) =>
        session?.data?.isAdmin ? true : { event: { author: { id: { equals: session?.itemId } } } },
    },
  }
  ```
- `Event.fields` addition:
  ```typescript
  isPremium: checkbox({ defaultValue: false }), // TODO(M9): replace with real Entitlement lookup
  guests: relationship({ ref: 'Guest.event', many: true }),
  ```
- Custom mutation (`api/schema.ts` via `extendGraphqlSchema`, or `api/lib/rsvp.ts` if this repo splits custom resolvers into `lib/`):
  ```graphql
  input SubmitRsvpInput {
    inviteToken: String!
    status: RsvpStatusType!
    partySize: Int
    meal: MealType
    dietary: String
    songRequest: String
    note: String
  }
  type Mutation {
    submitRsvp(data: SubmitRsvpInput!): Guest
  }
  ```
  Resolver logic: look up `Guest` by `inviteToken` via `context.sudo().query.Guest.findOne(...)` (bypasses the session-only `query` access above, since the token itself is the auth mechanism); if not found, throw; if `meal`/`dietary`/`songRequest` are supplied but `guest.event.isPremium` is `false`, silently drop those fields (do not error — matches the app's UI simply not offering those fields on free events); update `status`/`partySize`/allowed fields/`respondedAt: new Date()`.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/rsvp-flow`
- Target Branch Name: `feature/rsvp-flow`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `api/lib/rsvp.ts` — `submitRsvp` custom mutation resolver + `extendGraphqlSchema` config.
  - `api/lib/seed-guests.ts` — test-only seed script creating `Guest` rows with known tokens for manual/automated testing.
  - `api/schema.test.ts` (extend) or `api/lib/rsvp.test.ts` — tests for `submitRsvp` and `Guest` access control.
- Modify:
  - `api/schema.ts` — add `Guest` list; add `isPremium`/`guests` fields to `Event`.
  - `api/keystone.ts` — wire `extendGraphqlSchema` if not already composed there.

## 7. Implementation Steps

1. Checkout `feature/rsvp-flow` from `dev`.
2. Add `Guest` list to `api/schema.ts` per Section 4.
3. Add `isPremium`/`guests` fields to `Event`.
4. Run the Prisma migration for the new `Guest` table + `Event.isPremium` column.
5. Implement `submitRsvp` in `api/lib/rsvp.ts`, wire via `extendGraphqlSchema` in `api/keystone.ts`.
6. Write `api/lib/seed-guests.ts` for manual testing.
7. Write tests per Section 9; run them.
8. Commit atomically (schema, then resolver, then seed script, then tests) and push.

## 8. Error Handling & Edge Cases

- `submitRsvp` with an unknown `inviteToken`: throw a GraphQL error (`"Invalid invite token"`) — do not leak whether the token format was wrong vs. simply not found.
- `submitRsvp` targeting a `Guest` whose `Event` has `deletedAt` set: treat as not found (same error as above) — soft-deleted events have no valid guests.
- `submitRsvp` supplying `meal`/`dietary`/`songRequest` when `event.isPremium` is `false`: those fields are silently ignored (not an error) — `note` and `status`/`partySize` still apply.
- `submitRsvp` called twice for the same token (guest changes their mind): allowed — each call overwrites the previous response and updates `respondedAt`; no "already responded" lock in this ticket.
- An authenticated non-owner querying another host's `guests`: filtered out via `access.filter.query`, same access-denied-by-omission pattern as `Event`.

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/lib/rsvp.test.ts`.
- Coverage Required:
  - [ ] Happy path: valid token + `status: going` + `partySize` updates the `Guest` row and sets `respondedAt`.
  - [ ] Invalid/unknown token: mutation throws, no row modified.
  - [ ] Premium fields on a non-premium event: fields ignored, no error, `status`/`partySize`/`note` still saved.
  - [ ] Premium fields on a premium (`isPremium: true`) event: fields saved.
  - [ ] Event owner (authenticated) can query `event.guests`; a different authenticated user cannot.
  - [ ] Anonymous session cannot directly `query` the `Guest` list (only via `submitRsvp`).
  - [ ] Edge cases from Section 8 each covered.
  - [ ] No live database — existing Keystone test-context pattern.
- Do NOT: write integration tests hitting a real database.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/rsvp-flow`.
- [ ] `Guest` list exists with fields/access control from Section 4.
- [ ] `submitRsvp` mutation works end-to-end via a valid token, rejecting invalid ones.
- [ ] Premium-question gating respects `Event.isPremium`, with a `TODO(M9)` comment marking the field for replacement.
- [ ] All tests defined in Section 9 pass.
