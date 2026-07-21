# AI Feature Spec: Guest List Management (Flutter app)

## 1. Feature Overview

**Description:** Host-facing guest list screen (design screen `08`): add-guest / import-contacts buttons, All/Going/Pending/Declined filter chips, guest rows with avatar initials/name/meta/status chip.
**Business Value:** Where hosts actually build and monitor their invite list day to day.

## 2. Current System State (Crucial)

- Existing Infrastructure: host dashboard (`.docs/specs/app/host-dashboard.md`, M5) has a stub "Add guest" quick-action button this ticket wires to a real route.
- `Guest` model doesn't exist in the app yet (only on the api side, per M3/M6 api specs) — this ticket adds it, following the `Event`/`Media` Freezed pattern from `.docs/specs/app/media-event-models.md`.
- Host-scoped `Guest` CRUD + `bulkImportGuests` exist per `.docs/specs/api/guest-list.md`.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/models/guest.dart`: `Guest` Freezed model (`id`, `name`, `contactInfo`, `status`, `partySize`, `meal`, `inviteToken`).
  - `lib/providers/guest_list_provider.dart`: `FutureProvider.family<List<Guest>, String>` (by `eventId`) + a `Notifier` for add/import/remove actions.
  - `lib/screens/guest_list_screen.dart`: header (invited/attending counts), add-guest + import-contacts buttons, filter chip row, guest row list with `StatusChip` (DESIGN_SYSTEM.md §7).
  - "Add guest" dialog/sheet: name + contact fields, calls `createGuest`.
  - "Import contacts" flow: uses the device contacts picker (`flutter_contacts` or platform contact picker) to select multiple contacts, maps to `bulkImportGuests` input.
  - Route `/events/:eventId/guests` (authenticated, owner-only — enforced server-side by the api's access control regardless, but the app should not surface the screen to non-owners).
- DEFERRED:
  - DO NOT build invite-link sharing UI (share sheet, copy-link button showing the generated `inviteToken` URL) beyond a basic "Copy invite link" action per guest row — richer share UX is a follow-up.
  - DO NOT build guest editing (change name/contact after creation) — only add/remove in this ticket.
  - DO NOT build "Send reminder" (still a host-dashboard stub per M5).

## 4. Interfaces & Data Contracts

- `Guest` model (`lib/models/guest.dart`):
  ```dart
  @freezed
  abstract class Guest with _$Guest {
    const factory Guest({
      required String id,
      required String name,
      String? contactInfo,
      required RsvpStatus status,
      required int partySize,
      String? meal,
      required String inviteToken,
    }) = _Guest;

    factory Guest.fromJson(Map<String, dynamic> json) => _$GuestFromJson(json);
  }
  ```
  (`RsvpStatus` reused from `lib/models/rsvp.dart`, per `.docs/specs/app/rsvp-flow.md` — not redeclared.)

- Queries/mutations (`lib/providers/guest_list_provider.dart`):
  ```graphql
  query GetGuests($eventId: ID!) {
    guests(where: { event: { id: { equals: $eventId } } }) {
      id name contactInfo status partySize meal inviteToken
    }
  }
  mutation CreateGuest($eventId: ID!, $name: String!, $contactInfo: String) {
    createGuest(data: { event: { connect: { id: $eventId } }, name: $name, contactInfo: $contactInfo }) {
      id name contactInfo status partySize meal inviteToken
    }
  }
  mutation DeleteGuest($id: ID!) { deleteGuest(where: { id: $id }) { id } }
  mutation BulkImportGuests($eventId: ID!, $guests: [BulkGuestInput!]!) {
    bulkImportGuests(eventId: $eventId, guests: $guests) { id name contactInfo status partySize meal inviteToken }
  }
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-guest-list`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/models/guest.dart`
  - `app/lib/providers/guest_list_provider.dart`
  - `app/lib/screens/guest_list_screen.dart`
  - `app/lib/widgets/dashboard/guest_row.dart`, `status_chip.dart` (shared with M5 if not already extracted there)
  - `app/test/providers/guest_list_provider_test.dart`
- Modify:
  - `app/lib/providers/router_provider.dart` — add `/events/:eventId/guests` route.
  - `app/lib/screens/host_dashboard_screen.dart` — wire "Add guest" quick action to the new route.
  - `app/pubspec.yaml` — add a contacts-picker package if not already present.

## 7. Implementation Steps

1. Checkout `feature/app-guest-list` from `dev`.
2. Create `Guest` model; run codegen.
3. Create `guest_list_provider.dart` with queries/mutations from Section 4.
4. Build `GuestRow`/`StatusChip` widgets per DESIGN_SYSTEM.md §7.
5. Build `guest_list_screen.dart`: header counts, action buttons, filter chips, guest list.
6. Build the add-guest dialog and import-contacts flow.
7. Add the route; wire the dashboard's "Add guest" action.
8. Write tests per Section 9; run them.
9. Manually verify against a running local API — add a guest, import a batch, remove one, confirm counts update; stop the API server afterward.
10. Commit atomically (model, then provider, then widgets, then screen, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- Add-guest with an empty name: form validation blocks submit, inline error shown — no API call made.
- Contacts permission denied (OS-level): "Import contacts" shows a message directing the user to app settings, falls back to manual add — no crash.
- `bulkImportGuests` failing (e.g. network error mid-import): show an error snackbar; since the api spec rejects the whole batch atomically on ownership failure but this ticket doesn't add client-side partial-retry logic, the user simply retries the whole import.
- Deleting a guest who has already RSVP'd: allowed, no confirmation-of-data-loss dialog in this ticket (kept simple) — DELETE is immediate.
- Filter chips with zero matching guests: show an empty state within the filtered view, not a blank screen.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/guest_list_test.dart`.
- Coverage Required:
  - [ ] Happy path: add a guest manually, appears in the list with "Draft"/pending status.
  - [ ] Filter chips correctly narrow the visible list.
  - [ ] Deleting a guest removes it from the list.
  - [ ] Error states from Section 8 (empty name, import failure) are triggered and asserted.

### 9a. Unit Testing

- Test Framework: `flutter_test` + `mocktail`.
- Test File Location: `app/test/providers/guest_list_provider_test.dart`.
- Coverage Required:
  - [ ] `Guest.fromJson`/`toJson` round-trip.
  - [ ] Provider correctly issues create/delete/bulk-import mutations and refreshes the list on success.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-guest-list`.
- [ ] A host can add, bulk-import, filter, and remove guests, verified manually against a running API.
- [ ] All tests defined in Section 9 pass.
