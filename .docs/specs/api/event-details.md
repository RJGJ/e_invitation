# AI Feature Spec: Event Details — Schedule & Registry Fields

## 1. Feature Overview

**Description:** Add schedule, dress-code, and gift-registry fields to the `Event` list so the guest-facing details page (design screen `05`) has real data to render beyond what `event-model.md` already covers (venue/date/cover image).
**Business Value:** Guests need ceremony/reception times, a run-of-show, dress code, and registry links to actually plan attendance — the reveal + RSVP alone don't cover this.

## 2. Current System State (Crucial)

- Existing Infrastructure: `Event` list with `venueName`/`address`/`latitude`/`longitude`/`startDate`/`endDate` already implemented (`.docs/specs/api/event-model.md`). Public read, owner-scoped write, `deletedAt` soft-delete convention.
- No schedule/dress-code/registry fields exist yet. These are read-only from the app's perspective until `.docs/specs/api/event-editor.md` (M7) adds host-side write UI — this spec only adds the schema fields + read access; writes happen via the existing owner-scoped `updateEvent` mutation Keystone already generates (no new mutation needed).

## 3. Scope & Boundaries

- IN SCOPE:
  - `Event.scheduleItems`: `json` field, an array of `{ time: string, label: string }` — a lightweight run-of-show list (ceremony, cocktails, dinner, etc.), matching design screen `05`'s timeline.
  - `Event.ceremonyTime`/`Event.receptionTime`: text fields (free-form display strings like "3:00 PM" — not `timestamp`, since these are display labels tied to `scheduleItems`' first two conventional entries, not separately-queryable datetimes) for the two stat cards at the top of the details page.
  - `Event.dressCode`: text, optional.
  - `Event.dressCodePalette`: `json` field, array of hex strings (the swatch row in the design).
  - `Event.registryLinks`: `json` field, array of `{ label: string, url: string }`.
- DEFERRED:
  - DO NOT add a dedicated `ScheduleItem`/`RegistryLink` relational list — a `json` field is sufficient for this ticket's scale (a handful of items per event) and avoids the complexity of ordering/CRUD on a child list; revisit if a future ticket needs per-item access control.
  - DO NOT build any write/editor UI — that's `.docs/specs/api/event-editor.md` (M7).
  - DO NOT validate `scheduleItems`/`registryLinks` JSON shape server-side beyond Keystone's default `json` field (accepts any valid JSON) — client-side shape validation only, in this ticket.

## 4. Interfaces & Data Contracts

```typescript
// Additions to the existing Event interface (event-model.md):
scheduleItems?: { time: string; label: string }[];   // json, optional
ceremonyTime?: string;                                  // text, optional
receptionTime?: string;                                  // text, optional
dressCode?: string;                                        // text, optional
dressCodePalette?: string[];                                // json, optional, array of hex strings
registryLinks?: { label: string; url: string }[];            // json, optional
```

Keystone field additions to `Event.fields` in `api/schema.ts`:
```typescript
scheduleItems: json({ defaultValue: [] }),
ceremonyTime: text(),
receptionTime: text(),
dressCode: text(),
dressCodePalette: json({ defaultValue: [] }),
registryLinks: json({ defaultValue: [] }),
```
No access-control changes — these fields inherit `Event`'s existing `access` config (public read, owner-or-admin write) as-is.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/event-details`
- Target Branch Name: `feature/event-details`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Modify:
  - `api/schema.ts` — add the 6 fields above to `Event.fields`.
  - `api/schema.test.ts` — extend with coverage for the new fields (read/write, default values).

## 7. Implementation Steps

1. Checkout `feature/event-details` from `dev`.
2. Add the 6 fields to `Event.fields` in `api/schema.ts` per Section 4.
3. Run the Prisma migration for the new `Event` columns.
4. Extend `api/schema.test.ts` per Section 9.
5. Commit atomically (schema, then tests) and push.

## 8. Error Handling & Edge Cases

- `scheduleItems`/`registryLinks`/`dressCodePalette` omitted on create: default to `[]` — the details page renders an empty section, not a crash.
- Malformed JSON shape supplied (e.g. `scheduleItems` items missing `label`): accepted as-is by Keystone's `json` field (no server validation in this ticket) — the app's Freezed model parsing (M4 app spec) is responsible for defensive parsing of malformed entries.
- Non-owner attempting to update these fields: denied by `Event`'s existing `access.filter.update`, unchanged from `event-model.md`.

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/schema.test.ts`.
- Coverage Required:
  - [ ] Happy path: creating/updating an `Event` with all 6 new fields persists and round-trips correctly through a query.
  - [ ] Fields omitted on create default to `[]` (json fields) / `null` (text fields).
  - [ ] Non-owner cannot update these fields (reuses `Event`'s existing access-control test pattern).
  - [ ] Edge cases from Section 8 covered.
- Do NOT: write integration tests hitting a real database.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/event-details`.
- [ ] All 6 fields exist on `Event`, inherit existing access control, default correctly when omitted.
- [ ] All tests defined in Section 9 pass.
