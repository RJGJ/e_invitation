# AI Feature Spec: Event Creation Flow (Flutter app)

## 1. Feature Overview

**Description:** Host-facing "Create an event" screen (design screen `00b`): step 1 picks an `EventType`, step 2 picks a `Template` for that type, then creates a draft `Event` via GraphQL and navigates into it. Reachable from the "＋ Create an event" button on Home (design screen `00`).
**Business Value:** The entry point for every host — nothing else in the product (reveals, RSVP, dashboard) exists until an `Event` is created.

## 2. Current System State (Crucial)

- Existing Infrastructure: Riverpod (`flutter_riverpod`), `go_router` (`app/lib/providers/router_provider.dart` — currently only `/splash`, `/login`, `/home`), JWT auth flow (`app/lib/providers/auth_provider.dart`, `app/lib/services/token_storage.dart`).
- **Hard dependency, not yet built:** `.docs/specs/app/media-event-models.md` (`Media`/`Event` Freezed models, `graphQLClientProvider`, `eventsProvider`) is specced but **no corresponding files exist yet** in `app/lib/models/`, `app/lib/services/`, or `app/lib/providers/` — verified empty as of this spec. That spec must land first (or its `graphQLClientProvider` + `Event`/`Media` models built as a prerequisite step of this ticket) before this ticket can write GraphQL mutations.
- Existing UI: `app/lib/screens/home_screen.dart` — bottom-nav `Scaffold` with `HomeView`/`TemplatesView` (`app/lib/widgets/views/`, currently a stub `Text("Templates View")`)/`AccountView` pages. `HomeView` is currently just a greeting — no event list yet (that's M5).
- Existing Theme: `app/lib/theme/app_theme.dart`, `app_colors.dart` — Material 3 `ColorScheme` already wired; this ticket must use `Theme.of(context)` tokens, not new hard-coded hex values.
- `Template` list (api) from `.docs/specs/api/event-creation.md` provides `id`/`name`/`type`/`motif`/`accentHex`.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/models/template.dart`: `Template` Freezed model (mirrors the api `Template` shape).
  - `lib/providers/template_provider.dart`: `templatesForTypeProvider(EventType)` — GraphQL query filtered by `type` and `isActive`.
  - `lib/providers/event_creation_provider.dart`: a `StateNotifier`/`Notifier` holding the two-step wizard state (`selectedType`, `selectedTemplateId`) and a `createEvent()` method that runs the `createEvent` GraphQL mutation.
  - `lib/screens/create_event_screen.dart`: two-step UI matching screen `00b` — type tabs (wedding/birthday/baptism), then a 2-column template grid with a check-mark on the selected card, continue button pinned to the bottom.
  - Route `/create-event` added to `routerProvider`; Home's "＋ Create an event" button navigates there.
  - On successful creation, navigate to a placeholder event-detail route (stub screen is fine — the real dashboard is M5).
- DEFERRED:
  - DO NOT build the reveal preview animation on the template cards — a static accent-colored swatch + motif label is enough (per DESIGN_SYSTEM.md, reveals are event-type behaviors implemented in M2, not template metadata).
  - DO NOT build the Hosting/Invited tabs or event cards on Home (M5).
  - DO NOT let the user set `title`/`startDate`/venue/etc. in this flow — those are edited afterward (M7); `createEvent` here only needs `type` + `template`, with a sensible placeholder `title` (e.g. "Untitled wedding") the host renames later.

## 4. Interfaces & Data Contracts

- `Template` Freezed model (`lib/models/template.dart`):
  ```dart
  @freezed
  abstract class Template with _$Template {
    const factory Template({
      required String id,
      required String name,
      required EventType type,
      required String motif,
      required String accentHex,
    }) = _Template;

    factory Template.fromJson(Map<String, dynamic> json) => _$TemplateFromJson(json);
  }
  ```
  (`EventType` reused from `lib/models/event.dart` per `.docs/specs/app/media-event-models.md` — do not redeclare it.)

- GraphQL query (`lib/providers/template_provider.dart`):
  ```graphql
  query GetTemplates($type: TemplateTypeType!) {
    templates(where: { type: { equals: $type }, isActive: { equals: true } }) {
      id
      name
      type
      motif
      accentHex
    }
  }
  ```

- GraphQL mutation (`lib/providers/event_creation_provider.dart`):
  ```graphql
  mutation CreateEvent($type: EventTypeType!, $templateId: ID, $title: String!) {
    createEvent(data: { type: $type, template: { connect: { id: $templateId } }, title: $title }) {
      id
      type
      title
      template { id name motif accentHex }
    }
  }
  ```

- Wizard state (`lib/providers/event_creation_provider.dart`):
  ```dart
  @freezed
  abstract class EventCreationState with _$EventCreationState {
    const factory EventCreationState({
      EventType? selectedType,
      String? selectedTemplateId,
      @Default(false) bool isSubmitting,
      String? errorMessage,
    }) = _EventCreationState;
  }
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]` (matches `feature/app-theme`, `feature/app-login`, `feature/app-media-event-models`).
- Target Branch Name: `feature/app-event-creation`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/models/template.dart`
  - `app/lib/providers/template_provider.dart`
  - `app/lib/providers/event_creation_provider.dart`
  - `app/lib/screens/create_event_screen.dart`
  - `app/test/providers/event_creation_provider_test.dart`, `app/test/models/template_test.dart`
- Modify:
  - `app/lib/providers/router_provider.dart` — add `/create-event` route.
  - `app/lib/widgets/views/home_view.dart` (or wherever the "＋ Create an event" button lives once M5 adds it) — wire it to `context.push('/create-event')`. If M5 hasn't landed yet, add the button directly to `HomeView` as an interim entry point.

## 7. Implementation Steps

1. Checkout `feature/app-event-creation` from `dev`.
2. Confirm `graphQLClientProvider`/`Event`/`Media` models exist (per `.docs/specs/app/media-event-models.md`); if not yet implemented, implement that spec first as a prerequisite (do not duplicate a second GraphQL client).
3. Create `lib/models/template.dart`; run codegen (`dart run build_runner build`).
4. Create `lib/providers/template_provider.dart` with the query from Section 4.
5. Create `lib/providers/event_creation_provider.dart` with wizard state + `createEvent()` mutation call.
6. Create `lib/screens/create_event_screen.dart`: type-tab row, template grid (`GridView.count(crossAxisCount: 2)`), continue button.
7. Add the `/create-event` route to `routerProvider`; wire Home's create button.
8. Write tests per Section 9; run them.
9. Manually verify against a running local API (`cd api && npm run dev`) — create an event end-to-end, then stop the API server (kill the actual listening PID).
10. Commit atomically (models, then providers, then screen, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- If `templatesForTypeProvider` returns an empty list for a type (no active templates seeded): show an empty-state message in the grid, disable "Continue" until a template is selected — no crash.
- If `createEvent()` fails (network error, GraphQL error): set `EventCreationState.errorMessage`, show it inline above the continue button; do not navigate away.
- If the user backgrounds/leaves the flow mid-wizard: wizard state is ephemeral (Riverpod provider, not persisted) — resuming the app restarts the flow from step 1, which is acceptable for this ticket.
- If the access token is missing/expired when `createEvent` runs (mutation requires a session per the api spec's `access.operation.create`): the GraphQL client's existing auth-link behavior applies (per `.docs/specs/app/media-event-models.md`) — a 401/access-denied surfaces as `errorMessage`; no custom retry logic added here.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol (Flutter UI can't be driven by Playwright).
- Test File Location: `app/integration_test/create_event_test.dart`.
- Coverage Required:
  - [ ] Happy path: select a type, select a template, tap Continue, event is created and the app navigates away from the create screen.
  - [ ] Continue button is disabled until both a type and a template are selected.
  - [ ] Error state from Section 8 (mutation failure) shows the inline error message and keeps the user on the screen.
  - [ ] Loading state (`isSubmitting`) disables the Continue button and shows a spinner during the mutation.

### 9a. Unit Testing (providers/models)

- Test Framework: `flutter_test` + `mocktail`.
- Test File Location: `app/test/providers/event_creation_provider_test.dart`, `app/test/models/template_test.dart`.
- Coverage Required:
  - [ ] `Template.fromJson`/`toJson` round-trip.
  - [ ] `templatesForTypeProvider` parses a mocked GraphQL response into `List<Template>`.
  - [ ] `EventCreationNotifier.createEvent()` calls the mutation with the selected type/template and updates state on success/failure.
- Do NOT: hit a live GraphQL endpoint in unit tests.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration, per this repo's existing Patrol setup in `app/patrol_test/`).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-event-creation`.
- [ ] A host can pick a type, pick a template, and create a draft `Event`, verified manually against a running API.
- [ ] `create_event_screen.dart` uses `Theme.of(context)` tokens, no hard-coded colors.
- [ ] All tests defined in Section 9 pass.
