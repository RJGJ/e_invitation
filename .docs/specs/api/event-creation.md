# AI Feature Spec: Event Creation — Template List

## 1. Feature Overview

**Description:** Add a `Template` list to the Keystone schema (one row per event-type template: motif, accent, reveal-style label) and a `template` relationship on `Event`, so the host's "choose a template" step (design screen `00b`) has something real to connect to.
**Business Value:** Unblocks the app's create-event flow (M1 app spec) — without a `Template` list, "pick a template" has nothing to persist against, and `Event.type` alone can't distinguish "Classic Gold" from "Ivory Rose" within the same `wedding` type.

## 2. Current System State (Crucial)

- Existing Infrastructure: KeystoneJS 6 (`api/schema.ts`), JWT + cookie session (`api/auth.ts`), `Event` list with owner-scoped access control (`author`/`access.filter` pattern) and `type: select` (`wedding`/`birthday`/`baptism`) already implemented (`.docs/specs/api/event-model.md`).
- Existing Access Pattern: public `query`, session-required `create`/`update`/`delete`, `session?.data?.isAdmin` bypass, `deletedAt` soft-delete filter — see `Event`/`Media` in `api/schema.ts`. This spec reuses that exact shape for `Template` reads (public) and admin-only writes (templates are curated content, not user-generated).
- No `Template` list exists. `Event` has no `template` field yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Template` list: `name`, `type` (same `select` options as `Event.type`), `motif` (short text/emoji label, e.g. "wax-seal", used by the app to pick a `RevealController` visual), `accentHex` (text), `isActive` (checkbox, defaultValue true).
  - `Event.template` relationship (optional, `many: false`) + back-relation `templateOfEvents` on `Template`.
  - Access control: anyone can `query` active templates; only `isAdmin` sessions can `create`/`update`/`delete` templates (curated content, not per-user).
  - Seed data: at least one `Template` row per event type (wedding/birthday/baptism), inserted via a seed script or Admin UI — not a migration-embedded seed.
- DEFERRED:
  - DO NOT let hosts author their own custom templates — out of scope per masterplan M1.
  - DO NOT add template preview images — `motif`/`accentHex` are enough for the app to render its own preview (matches DESIGN_SYSTEM.md's accent-per-type approach); a `previewImage` relationship to `Media` can be added later without a breaking change.
  - DO NOT touch `Event.type`, `primaryColor`/`secondaryColor`/`fontFamily` — those stay as free-form per-event overrides, independent of the template's own `accentHex` default.

## 4. Interfaces & Data Contracts

```typescript
export interface Template {
  id: string;
  name: string;                 // text, required, e.g. "Classic Gold"
  type: EventType;               // select, required — same options as Event.type
  motif: string;                 // text, required, e.g. "wax-seal" | "candle" | "balloons"
  accentHex: string;              // text, required, e.g. "#C9A24B"
  isActive: boolean;               // checkbox, required, defaultValue: true
  createdAt: Date;
}
```

- `Template` access control (mirrors `Event`/`Media`'s operation/filter split, admin-only writes):
  ```typescript
  access: {
    operation: {
      query: () => true,
      create: ({ session }) => Boolean(session?.data?.isAdmin),
      update: ({ session }) => Boolean(session?.data?.isAdmin),
      delete: ({ session }) => Boolean(session?.data?.isAdmin),
    },
    filter: {
      query: () => ({ isActive: { equals: true } }),
    },
  }
  ```
- Additions to `Event.fields` in `api/schema.ts`:
  ```typescript
  template: relationship({ ref: 'Template.templateOfEvents', many: false }),
  ```
- Additions to `Template.fields`:
  ```typescript
  templateOfEvents: relationship({ ref: 'Event.template', many: true }),
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/event-creation`
- Target Branch Name: `feature/event-creation`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `api/lib/seed-templates.ts` (or equivalent) — one-off seed script inserting the initial `Template` rows via `context.query.Template.createOne`.
  - `api/schema.test.ts` — extend with `Template` access-control tests (or co-locate as `api/test/template.test.ts` if that convention exists by then).
- Modify:
  - `api/schema.ts` — add `Template` list; add `template`/`templateOfEvents` relationship fields to `Event`/`Template`.

## 7. Implementation Steps

1. Checkout `feature/event-creation` from `dev`.
2. Add the `Template` list to `api/schema.ts` per Section 4.
3. Add `template: relationship({ ref: 'Template.templateOfEvents', many: false })` to `Event.fields`.
4. Run the Prisma migration for the new `Template` table and `Event.template` column.
5. Write `api/lib/seed-templates.ts` with 1-2 rows per event type; run it against the dev database.
6. Write access-control tests per Section 9; run them.
7. Commit atomically (schema, then seed script, then tests) and push.

## 8. Error Handling & Edge Cases

- Non-admin session attempting `create`/`update`/`delete` on `Template`: standard Keystone access-denied error.
- `Event.template` connected to an inactive (`isActive: false`) template: connecting still succeeds (the `filter.query` only hides inactive templates from `query`, it doesn't block relationship connects) — accepted for this ticket; hiding retired templates from new event creation while not breaking existing events that reference them is the intended behavior.
- `Event.template` connected to a `Template` whose `type` differs from the `Event.type`: no cross-field validation in this ticket — deferred, the app is expected to only offer templates matching the chosen type (per the M1 app spec's two-step picker).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest (`api/vitest.config.ts`), matching `api/schema.test.ts`.
- Test File Location: `api/schema.test.ts` (or `api/test/template.test.ts` if the repo has split by then).
- Coverage Required:
  - [ ] Happy path: anonymous query returns only `isActive: true` templates.
  - [ ] An `isAdmin` session can create/update/delete a `Template`.
  - [ ] A non-admin authenticated session cannot create/update/delete a `Template`.
  - [ ] An anonymous session cannot create/update/delete a `Template`.
  - [ ] An `Event` can be created/updated with `template` connected to an existing `Template` id, and querying the event back resolves `template { name motif accentHex }`.
  - [ ] Edge cases from Section 8 are each covered.
  - [ ] No live database — use the existing Keystone test-context pattern.
- Do NOT: write integration tests hitting a real database.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/event-creation`.
- [ ] `Template` list exists with fields from Section 4; access control matches Section 4 exactly.
- [ ] `Event.template` / `Template.templateOfEvents` resolve both directions.
- [ ] At least one active `Template` per event type exists in the dev database after running the seed script.
- [ ] All tests defined in Section 9 pass.
