# AI Feature Spec: RSVP Form Editor Screen (Flutter app)

## 1. Feature Overview

**Description:** Host-facing "Edit RSVP form" screen (design screen `09`): a Free/Premium tab toggle for previewing, always-on free-question switches, premium-question switches with a `FeatureLockOverlay` when the event isn't premium, and an "Upgrade this event" CTA.
**Business Value:** The primary in-product upsell moment — hosts see exactly what they're missing at the point they try to use it (PLAN.md §5's "upsell, not wall" principle).

## 2. Current System State (Crucial)

- Existing Infrastructure: host dashboard's "Edit details" quick action (`.docs/specs/app/host-dashboard.md`, M5) is currently a stub this ticket wires to a real route (the design's screen 09 is reached from the dashboard, labeled "Edit RSVP form" — more precise than the dashboard's placeholder "Edit details" label; rename that button's label as part of this ticket).
- `Event.rsvpQuestionMeal/Song/Dietary/Custom`, `Event.customQuestionText`, `Event.isPremium` exist per `.docs/specs/api/event-editor.md`.
- No `FeatureLockOverlay` widget exists yet — DESIGN_SYSTEM.md §7 specifies it as a shared component; this ticket builds the first instance of it (reusable by M8's gallery lock later).

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/widgets/shared/feature_lock_overlay.dart`: the reusable `FeatureLockOverlay` component per DESIGN_SYSTEM.md §7 (semi-opaque veil, 🔒 glyph, title, subtitle, premium CTA button) — built generically (takes a title/subtitle/onUpgrade callback) so M8 can reuse it without duplicating.
  - `lib/screens/rsvp_form_editor_screen.dart`: always-on free-question rows (visually disabled switches, always "on"), premium-question toggle rows, `FeatureLockOverlay` shown over the premium section when `!event.isPremium`, tapping "Upgrade this event" navigates to the Upgrade screen (M9's route — stub route if M9 hasn't landed yet).
  - Toggling a premium question calls `updateEvent` with the corresponding flag; on the API's premium-gate rejection (per `.docs/specs/api/event-editor.md` Section 8), show the upgrade prompt instead of a generic error.
- DEFERRED:
  - DO NOT build the actual Upgrade/checkout screen — that's `.docs/specs/app/monetization.md` (M9); this ticket only navigates to its route (stub if not yet built).
  - DO NOT build a schedule/venue/dress-code editor UI — deferred per the api spec (Section 3), no screen for it in this ticket.

## 4. Interfaces & Data Contracts

- `FeatureLockOverlay` widget:
  ```dart
  class FeatureLockOverlay extends StatelessWidget {
    const FeatureLockOverlay({
      super.key,
      required this.title,
      required this.subtitle,
      required this.onUpgrade,
    });
    final String title;
    final String subtitle;
    final VoidCallback onUpgrade;
  }
  ```

- Mutation (`lib/providers/event_editor_provider.dart`):
  ```graphql
  mutation UpdateRsvpQuestions($eventId: ID!, $data: EventUpdateInput!) {
    updateEvent(where: { id: $eventId }, data: $data) {
      id isPremium rsvpQuestionMeal rsvpQuestionSong rsvpQuestionDietary rsvpQuestionCustom customQuestionText
    }
  }
  ```
  Note: extends the existing `Event` Freezed model (`.docs/specs/app/media-event-models.md`) with the 5 new fields — no new model file, an addition to `lib/models/event.dart` alongside the M4 app spec's additions.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-event-editor`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/widgets/shared/feature_lock_overlay.dart`
  - `app/lib/providers/event_editor_provider.dart`
  - `app/lib/screens/rsvp_form_editor_screen.dart`
  - `app/test/widgets/shared/feature_lock_overlay_test.dart`
- Modify:
  - `app/lib/models/event.dart` — add the 5 RSVP-question fields.
  - `app/lib/providers/router_provider.dart` — add `/events/:eventId/rsvp-form` route.
  - `app/lib/screens/host_dashboard_screen.dart` — rename/wire "Edit details" → "Edit RSVP form" quick action to the new route.

## 7. Implementation Steps

1. Checkout `feature/app-event-editor` from `dev`.
2. Add the 5 fields to the `Event` model; run codegen.
3. Build the generic `FeatureLockOverlay` widget.
4. Create `event_editor_provider.dart` with the update mutation.
5. Build `rsvp_form_editor_screen.dart`: free-question rows, premium-question rows, lock overlay, upgrade CTA.
6. Add the route; rename/wire the dashboard's quick action.
7. Write tests per Section 9; run them.
8. Manually verify against a running local API — toggle questions on a premium and non-premium event, confirm the lock overlay and rejection-driven upgrade prompt both work; stop the API server afterward.
9. Commit atomically (widget, then provider, then screen, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- Toggling a premium question on a non-premium event: the mutation fails (per the api spec's hook); catch the error and show the upgrade prompt/navigate to the lock overlay's CTA state rather than a raw error message.
- Free-question switches are rendered visually "on" but disabled (non-interactive) — tapping them does nothing, no confusing no-op mutation call.
- `customQuestionText` field only editable when `rsvpQuestionCustom` is enabled; disabled/hidden otherwise.
- Network failure during toggle: revert the switch's optimistic UI state, show an error snackbar.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/rsvp_form_editor_test.dart`.
- Coverage Required:
  - [ ] Non-premium event: premium section shows the lock overlay; tapping "Upgrade this event" navigates toward the Upgrade route.
  - [ ] Premium event: toggling a premium question succeeds and persists (reflected after a refetch).
  - [ ] Free-question switches are visually on and non-interactive.

### 9a. Unit/Widget Testing

- Test Framework: `flutter_test`.
- Test File Location: `app/test/widgets/shared/feature_lock_overlay_test.dart`.
- Coverage Required:
  - [ ] `FeatureLockOverlay` renders title/subtitle and calls `onUpgrade` when tapped.
  - [ ] Toggle failure (mocked mutation error) reverts the switch state (Section 8 edge case).

### 9c. Test Execution

- Command: `cd app && flutter test` (unit/widget), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-event-editor`.
- [ ] `FeatureLockOverlay` is a generic, reusable widget (verified it takes no gallery/RSVP-specific hard-coded copy).
- [ ] Premium-question toggling works end-to-end on a premium event and is correctly blocked/prompted on a non-premium one, verified manually.
- [ ] All tests defined in Section 9 pass.
