# AI Feature Spec: Event Details Page (Flutter app)

## 1. Feature Overview

**Description:** Guest-facing details page (design screen `05`): hero photo, ceremony/reception stat cards, map, run-of-show timeline, dress code, gift registry — reached from the reveal screen's "View event details" CTA. Read-only in this ticket.
**Business Value:** Completes the guest-facing invite experience alongside the reveal (M2) and RSVP (M3) — everything a guest needs to plan attendance.

## 2. Current System State (Crucial)

- Existing Infrastructure: reveal screen (`.docs/specs/app/reveal-experiences.md`) has a stub "View event details" CTA this ticket replaces with a real route. `event_detail_provider.dart` (from the reveal spec) already fetches core `Event` fields — this ticket extends its query, not duplicating a fetch.
- `Event.scheduleItems`/`ceremonyTime`/`receptionTime`/`dressCode`/`dressCodePalette`/`registryLinks` exist per `.docs/specs/api/event-details.md`.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/models/event.dart` additions: `scheduleItems` (`List<ScheduleItem>`), `ceremonyTime`, `receptionTime`, `dressCode`, `dressCodePalette` (`List<String>`), `registryLinks` (`List<RegistryLink>`) — extends the existing `Event` Freezed model from `.docs/specs/app/media-event-models.md`, not a new model.
  - `lib/screens/event_details_screen.dart`: Details/Schedule/Gallery tab bar (Gallery tab is a locked placeholder — real content is M8), hero image, ceremony/reception cards, static map placeholder + "Open in Maps" external link (`url_launcher`, using `address` for the query), timeline list, dress-code card with palette swatches, registry link list.
  - Route `/invite/:eventId/details`, public.
- DEFERRED:
  - DO NOT render an embedded interactive map — an "Open in Maps →" link opening the device's maps app via `url_launcher` is sufficient (matches the design's `MAP EMBED` placeholder + external-link pattern).
  - DO NOT implement the Gallery tab's real content — locked placeholder only (M8 fills it in).
  - DO NOT build editing — read-only (M7).

## 4. Interfaces & Data Contracts

- `Event` model additions (`lib/models/event.dart`):
  ```dart
  @freezed
  abstract class ScheduleItem with _$ScheduleItem {
    const factory ScheduleItem({required String time, required String label}) = _ScheduleItem;
    factory ScheduleItem.fromJson(Map<String, dynamic> json) => _$ScheduleItemFromJson(json);
  }

  @freezed
  abstract class RegistryLink with _$RegistryLink {
    const factory RegistryLink({required String label, required String url}) = _RegistryLink;
    factory RegistryLink.fromJson(Map<String, dynamic> json) => _$RegistryLinkFromJson(json);
  }

  // Added fields on the existing Event factory:
  @Default([]) List<ScheduleItem> scheduleItems,
  String? ceremonyTime,
  String? receptionTime,
  String? dressCode,
  @Default([]) List<String> dressCodePalette,
  @Default([]) List<RegistryLink> registryLinks,
  ```

- Query addition to `event_detail_provider.dart`'s `GetEvent`:
  ```graphql
  scheduleItems
  ceremonyTime
  receptionTime
  dressCode
  dressCodePalette
  registryLinks
  ```
  Note: Keystone's `json` fields deserialize to raw `dynamic` (List/Map) — the model's `fromJson` must defensively skip malformed entries (e.g. a schedule item missing `label`) rather than throwing, per Section 8.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-event-details`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/screens/event_details_screen.dart`
  - `app/test/screens/event_details_screen_test.dart`, `app/test/models/event_details_fields_test.dart`
- Modify:
  - `app/lib/models/event.dart` — add `ScheduleItem`/`RegistryLink` + the 6 new `Event` fields.
  - `app/lib/providers/event_detail_provider.dart` — extend the query.
  - `app/lib/providers/router_provider.dart` — add `/invite/:eventId/details` route.
  - `app/pubspec.yaml` — add `url_launcher` if not already present.

## 7. Implementation Steps

1. Checkout `feature/app-event-details` from `dev`.
2. Extend `Event` model + query per Section 4; run codegen.
3. Add `url_launcher` dependency if missing; run `flutter pub get`.
4. Build `event_details_screen.dart`: tab bar, hero, stat cards, schedule timeline, dress-code card, registry list, locked gallery placeholder tab.
5. Add the details route; wire the reveal screen's "View event details" CTA.
6. Write tests per Section 9; run them.
7. Manually verify against a running local API with an event seeded with schedule/registry data; stop the API server afterward.
8. Commit atomically (models, then screen, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- Malformed `scheduleItems`/`registryLinks` entries (missing required sub-fields): skipped during parsing, not thrown — the model's `fromJson` filters the raw list defensively (`.whereType` / try-catch per item) so one bad entry doesn't break the whole page.
- Empty `scheduleItems`/`registryLinks`/`dressCodePalette`: sections render an empty/hidden state (no "Schedule" heading shown with nothing under it) rather than an empty list with just a heading.
- `url_launcher` failing to open (no maps app installed, invalid address): show a snackbar "Couldn't open maps" — no crash.
- Missing `ceremonyTime`/`receptionTime`: stat card shows the label with a "TBA" placeholder instead of blank.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/event_details_test.dart`.
- Coverage Required:
  - [ ] Happy path: navigating from the reveal screen's CTA shows the details page with hero/schedule/registry populated.
  - [ ] Gallery tab shows a locked placeholder, not real content.
  - [ ] "Open in Maps" link attempts to launch an external URL (mock `url_launcher`).

### 9a. Unit Testing

- Test Framework: `flutter_test`.
- Test File Location: `app/test/models/event_details_fields_test.dart`.
- Coverage Required:
  - [ ] `ScheduleItem`/`RegistryLink` `fromJson`/`toJson` round-trip.
  - [ ] Malformed entries in the raw JSON list are skipped without throwing (Section 8 edge case).
  - [ ] Empty-state rendering logic (no heading shown for empty sections) is covered at the widget level.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-event-details`.
- [ ] Details page renders schedule/dress-code/registry data from a running API, verified manually.
- [ ] Malformed JSON data does not crash the page.
- [ ] All tests defined in Section 9 pass.
