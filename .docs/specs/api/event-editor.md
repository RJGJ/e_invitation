# AI Feature Spec: RSVP Form Editor — Question Toggles

## 1. Feature Overview

**Description:** Lets a host configure which RSVP questions are enabled for their event (design screen `09`, "Edit RSVP form"): free questions (attending yes/no, guest count) always on; premium questions (meal, song, dietary, custom) individually toggleable, gated behind `Event.isPremium`.
**Business Value:** This is the actual paywall touchpoint in the design — not a generic "event details" editor as originally labeled in the masterplan index. Hosts see exactly what they're paying to unlock, at the moment they try to enable it.

## 2. Current System State (Crucial)

- Existing Infrastructure: `Event.isPremium` placeholder checkbox exists per `.docs/specs/api/rsvp-flow.md` (M3), flagged there for replacement once `.docs/specs/api/monetization.md` (M9) lands. `submitRsvp` already silently drops premium fields when `isPremium` is `false`.
- No per-question toggle fields exist yet — M3 only gates on a single `isPremium` boolean for all premium fields at once. This ticket adds individual toggles so a host can enable e.g. meal choice without song requests.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Event` field additions: `rsvpQuestionMeal`, `rsvpQuestionSong`, `rsvpQuestionDietary`, `rsvpQuestionCustom` — checkboxes, each `defaultValue: false`, each settable by the owner only if `Event.isPremium` is `true` (enforced via a `resolveInput`/`validateInput` hook — toggling one on for a non-premium event is rejected, not silently ignored, since this is an explicit host action with a visible paywall response expected).
  - `Event.customQuestionText`: text, optional — the free-form label for the "custom question" (e.g. "Who are you most excited to see?"), only meaningful when `rsvpQuestionCustom` is `true`.
  - Update `submitRsvp` (from `.docs/specs/api/rsvp-flow.md`) to check the specific per-question flag rather than the blanket `isPremium`: e.g. `meal` is only accepted if `rsvpQuestionMeal && isPremium`.
- DEFERRED:
  - DO NOT build a generic schedule/venue/dress-code editor here — that data (from `.docs/specs/api/event-details.md`) is edited via the standard owner-scoped `updateEvent` mutation Keystone already generates; no new fields or mutation needed for that in this ticket (the app-side editor screen, if wanted, is a UI-only follow-up, not an API ticket).
  - DO NOT implement the actual entitlement check yet — `isPremium` remains the M3 placeholder; M9 replaces both this ticket's and M3's read of it with a real `Entitlement` lookup.
  - DO NOT build custom-question response *validation* beyond what `submitRsvp` already does — this ticket only gates whether the question is asked, not response content.

## 4. Interfaces & Data Contracts

```typescript
// Additions to Event:
rsvpQuestionMeal?: boolean;      // checkbox, defaultValue: false
rsvpQuestionSong?: boolean;       // checkbox, defaultValue: false
rsvpQuestionDietary?: boolean;     // checkbox, defaultValue: false
rsvpQuestionCustom?: boolean;       // checkbox, defaultValue: false
customQuestionText?: string;         // text, optional
```

- `Event.hooks.resolveInput` addition (alongside the existing `author`/`updatedAt` hook from `event-model.md` — extend, don't replace):
  ```typescript
  update: ({ resolvedData, item }) => {
    const premiumFields = ['rsvpQuestionMeal', 'rsvpQuestionSong', 'rsvpQuestionDietary', 'rsvpQuestionCustom'] as const;
    for (const field of premiumFields) {
      if (resolvedData[field] === true && !(resolvedData.isPremium ?? item.isPremium)) {
        throw new Error(`Cannot enable ${field} on a non-premium event`);
      }
    }
    return { ...resolvedData, updatedAt: new Date() };
  }
  ```
- `submitRsvp` resolver update (`api/lib/rsvp.ts`, from `.docs/specs/api/rsvp-flow.md`):
  ```typescript
  const event = guest.event; // { isPremium, rsvpQuestionMeal, rsvpQuestionSong, rsvpQuestionDietary, rsvpQuestionCustom }
  const updateData = {
    status: data.status,
    partySize: data.partySize,
    note: data.note,
    respondedAt: new Date(),
    ...(event.isPremium && event.rsvpQuestionMeal ? { meal: data.meal } : {}),
    ...(event.isPremium && event.rsvpQuestionDietary ? { dietary: data.dietary } : {}),
    ...(event.isPremium && event.rsvpQuestionSong ? { songRequest: data.songRequest } : {}),
  };
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/event-editor`
- Target Branch Name: `feature/event-editor`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Modify:
  - `api/schema.ts` — add the 5 fields to `Event`; extend the existing `hooks.resolveInput.update`.
  - `api/lib/rsvp.ts` — update `submitRsvp` per-question gating.
  - `api/schema.test.ts` / `api/lib/rsvp.test.ts` — extend tests.

## 7. Implementation Steps

1. Checkout `feature/event-editor` from `dev`.
2. Add the 5 fields to `Event.fields`.
3. Extend `Event.hooks.resolveInput.update` with the premium-gate validation per Section 4 (careful: merge with the existing `updatedAt` stamping logic, don't overwrite it).
4. Update `submitRsvp`'s field-inclusion logic per Section 4.
5. Run the Prisma migration for the new columns.
6. Write/extend tests per Section 9; run them.
7. Commit atomically (schema+hook, then resolver update, then tests) and push.

## 8. Error Handling & Edge Cases

- Owner tries to enable `rsvpQuestionMeal` (etc.) while `isPremium` is `false`: `updateEvent` throws (per the hook in Section 4) — the app is expected to catch this and show the paywall CTA (design screen `09`'s locked-overlay pattern), covered in the app spec.
- Owner enables `isPremium` and a question flag in the *same* mutation call: the hook must read `resolvedData.isPremium ?? item.isPremium` (not just `item.isPremium`) so this combined update succeeds — see the code in Section 4.
- Owner disables `isPremium` after questions were enabled: no cascading auto-disable of the question flags in this ticket (they stay `true` but `submitRsvp` still checks `event.isPremium` at submit time, so the fields simply stop being accepted) — acceptable, avoids surprising data loss on the flags themselves.
- `customQuestionText` set without `rsvpQuestionCustom` enabled: allowed (harmless unused text) — no validation coupling in this ticket.

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/schema.test.ts` (or `api/lib/rsvp.test.ts` for the `submitRsvp` gating tests).
- Coverage Required:
  - [ ] Enabling a premium question flag on a non-premium event throws.
  - [ ] Enabling `isPremium` and a question flag together in one mutation succeeds.
  - [ ] Enabling a premium question flag on an already-premium event succeeds.
  - [ ] `submitRsvp` only accepts `meal`/`dietary`/`songRequest` when both `isPremium` AND the specific flag are true.
  - [ ] Disabling `isPremium` after questions were enabled stops `submitRsvp` from accepting those fields, without erroring on the flags themselves.
  - [ ] Edge cases from Section 8 covered.
- Do NOT: write integration tests hitting a real database.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/event-editor`.
- [ ] Per-question premium gating enforced at the API level (not just UI-level), matching Section 4.
- [ ] `submitRsvp` respects per-question flags, not just the blanket `isPremium`.
- [ ] All tests defined in Section 9 pass.
