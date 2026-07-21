# AI Feature Spec: RSVP Flow (Flutter app)

## 1. Feature Overview

**Description:** Guest-facing multi-step inline RSVP screen (design screen `04`): accept/decline → party size + meal (premium-gated) → dietary/song/note (premium-gated) → confirmation summary, reached from the reveal screen's "RSVP now" CTA.
**Business Value:** Converts an opened invite into a recorded response — the metric hosts care about most.

## 2. Current System State (Crucial)

- Existing Infrastructure: reveal screen (`.docs/specs/app/reveal-experiences.md`, M2) routes to this screen via a stub CTA that this ticket replaces with a real route. Public `/invite/:eventId` route pattern already established in `router_provider.dart`.
- `Guest`/`submitRsvp` exist per `.docs/specs/api/rsvp-flow.md` — guests are identified by an `inviteToken`, not a login. The app needs the token to be present in the invite link (e.g. `/invite/:eventId?guest=:inviteToken`) — coordinate with M6 (guest-list, which generates/distributes these links) on the exact URL shape; for this ticket, assume the token arrives as a route query parameter.
- No RSVP screen/provider exists yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/models/rsvp.dart`: `RsvpStatus` enum (`pending`/`going`/`declined`), `RsvpFormState` (party size, meal, dietary, song, note, current wizard step).
  - `lib/providers/rsvp_provider.dart`: `Notifier` holding `RsvpFormState`, step navigation (`nextStep`/`prevStep`), and `submit()` calling the `submitRsvp` mutation.
  - `lib/screens/rsvp_screen.dart`: 4-step wizard UI matching screen `04` — accept/decline, party size + meal (meal picker only rendered if `event.isPremium`), dietary/song/note (dietary+song only rendered if `event.isPremium`, note always shown), confirmation summary.
  - Route `/invite/:eventId/rsvp?guest=:inviteToken`, public (no auth).
- DEFERRED:
  - DO NOT build the "Get your replay clip" confirmation-screen action (M10) — render it as a disabled/coming-soon button or omit it.
  - DO NOT implement real entitlement-driven gating — read `event.isPremium` directly (same placeholder as the api spec; swap when M9 lands).
  - DO NOT persist wizard progress across app restarts — ephemeral Riverpod state is sufficient.

## 4. Interfaces & Data Contracts

- `RsvpFormState` (`lib/models/rsvp.dart`):
  ```dart
  enum RsvpStatus {
    @JsonValue('pending') pending,
    @JsonValue('going') going,
    @JsonValue('declined') declined,
  }

  @freezed
  abstract class RsvpFormState with _$RsvpFormState {
    const factory RsvpFormState({
      @Default(0) int step,
      RsvpStatus? status,
      @Default(1) int partySize,
      String? meal,
      @Default([]) List<String> dietary,
      String? songRequest,
      String? note,
      @Default(false) bool isSubmitting,
      String? errorMessage,
    }) = _RsvpFormState;
  }
  ```

- GraphQL mutation (`lib/providers/rsvp_provider.dart`):
  ```graphql
  mutation SubmitRsvp($input: SubmitRsvpInput!) {
    submitRsvp(data: $input) {
      id status partySize meal dietary songRequest note
    }
  }
  ```

- Query to resolve `event.isPremium` for gating (extends the existing `event_detail_provider` query from `.docs/specs/app/reveal-experiences.md` with an `isPremium` field — do not create a second event-fetch provider):
  ```graphql
  # add to GetEvent in event_detail_provider.dart:
  isPremium
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-rsvp-flow`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/models/rsvp.dart`
  - `app/lib/providers/rsvp_provider.dart`
  - `app/lib/screens/rsvp_screen.dart`
  - `app/test/providers/rsvp_provider_test.dart`, `app/integration_test/rsvp_test.dart`
- Modify:
  - `app/lib/providers/event_detail_provider.dart` — add `isPremium` to the query.
  - `app/lib/providers/router_provider.dart` — add `/invite/:eventId/rsvp` route.
  - `app/lib/widgets/reveal/reveal_controller.dart` (or wherever the reveal screen's "RSVP now" button lives) — wire it to `context.push('/invite/$eventId/rsvp?guest=$token')`.

## 7. Implementation Steps

1. Checkout `feature/app-rsvp-flow` from `dev`.
2. Add `isPremium` to the event-detail query.
3. Create `lib/models/rsvp.dart`; run codegen.
4. Create `lib/providers/rsvp_provider.dart` with step navigation + `submit()`.
5. Build `lib/screens/rsvp_screen.dart`: step-dot progress indicator, conditional premium-field rendering, confirmation summary.
6. Add the RSVP route; wire the reveal screen's CTA.
7. Write tests per Section 9; run them.
8. Manually verify against a running local API (using a seeded `Guest` token from `.docs/specs/api/rsvp-flow.md`'s seed script) — submit both an accept and decline flow, then stop the API server.
9. Commit atomically (models, then provider, then screen, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- Decline path: skips party-size/meal/dietary steps entirely, goes straight from accept/decline to confirmation (matches design screen `04`'s step-count difference between accept/decline).
- If `submit()` fails: show `errorMessage` inline on the confirmation step, allow retry — do not lose the entered form data.
- If the `guest` token query param is missing/malformed on screen load: show an error state ("This RSVP link looks invalid") instead of rendering the wizard.
- If `event.isPremium` is `false`: meal/dietary/song fields are not rendered at all in the wizard (not shown-then-disabled) — matches the free-tier scope in PLAN.md §3 (free = yes/no + count only).
- Guest revisits the RSVP link after already responding: wizard starts fresh at step 0 (no "load previous answer" in this ticket) — resubmitting overwrites the prior response per the api spec's idempotent `submitRsvp`.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/rsvp_test.dart`.
- Coverage Required:
  - [ ] Happy path (accept, premium event): full 4-step flow, all fields submitted, confirmation shows correct summary.
  - [ ] Happy path (decline): shortened flow, confirmation shows "not attending".
  - [ ] Happy path (accept, free event): meal/dietary/song fields never rendered.
  - [ ] Error states from Section 8 (invalid token, submit failure) are triggered and asserted.

### 9a. Unit Testing

- Test Framework: `flutter_test` + `mocktail`.
- Test File Location: `app/test/providers/rsvp_provider_test.dart`.
- Coverage Required:
  - [ ] Step navigation (`nextStep`/`prevStep`) transitions correctly for both accept and decline branches.
  - [ ] `submit()` sends the mutation with the correct `SubmitRsvpInput` shape and updates `isSubmitting`/`errorMessage` state.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-rsvp-flow`.
- [ ] A guest can complete the RSVP flow (accept and decline) end-to-end against a running API, verified manually.
- [ ] Premium fields are hidden (not disabled) on non-premium events.
- [ ] All tests defined in Section 9 pass.
