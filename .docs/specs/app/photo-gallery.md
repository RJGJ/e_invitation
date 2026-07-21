# AI Feature Spec: Photo Gallery Screen (Flutter app)

## 1. Feature Overview

**Description:** Shared guest photo gallery tab (design screen `10`): usage meter ("128 photos · 0.9 of 2 GB used"), upload/download-all buttons, photo grid, `FeatureLockOverlay` when the event isn't premium.
**Business Value:** Surfaces the premium gallery feature to both hosts and guests; the paywall moment for anyone who opens the Gallery tab on a free event.

## 2. Current System State (Crucial)

- Existing Infrastructure: the Gallery tab on the event details screen (`.docs/specs/app/event-details.md`, M4) is currently a locked placeholder this ticket fills in with real content. `FeatureLockOverlay` exists per `.docs/specs/app/event-editor.md` (M7) — reuse it, do not rebuild.
- `uploadGuestPhoto` mutation + `Event.galleryUsageBytes` exist per `.docs/specs/api/photo-gallery.md`.
- No image-picker/upload dependency exists in `app/pubspec.yaml` yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/providers/gallery_provider.dart`: fetches `event.gallery`/`galleryUsageBytes`, exposes an `uploadPhoto(File)` method calling `uploadGuestPhoto` (multipart GraphQL upload — the first multipart upload in the app; `.docs/specs/app/media-event-models.md` explicitly deferred this, so this ticket is where it's first implemented).
  - `lib/screens/gallery_tab.dart`: usage-meter header, upload/download-all buttons, 3-column photo grid, `FeatureLockOverlay` (reused from M7) shown when `!event.isPremium`.
  - Photo picker integration (`image_picker` package) for guest photo selection.
  - Per-photo download (save to device gallery via `image_gallery_saver` or platform equivalent) and a "Download all" action (sequential downloads with a progress indicator — no zip bundling in this ticket).
- DEFERRED:
  - DO NOT implement zip-bundled "download all" — sequential per-photo download is sufficient for this ticket.
  - DO NOT implement photo moderation/reporting UI.
  - DO NOT implement the storage top-up purchase flow (matches the api spec's deferral).

## 4. Interfaces & Data Contracts

- `gallery_provider.dart`:
  ```dart
  final galleryProvider = FutureProvider.family<GalleryData, String>((ref, eventId) async {
    final client = ref.read(graphQLClientProvider);
    final result = await client.query(QueryOptions(
      document: gql(getGalleryQuery),
      variables: {'eventId': eventId},
    ));
    if (result.hasException) throw result.exception!;
    final event = result.data!['event'];
    return GalleryData(
      photos: (event['gallery'] as List).map((m) => Media.fromJson(m)).toList(),
      usageBytes: event['galleryUsageBytes'] as int,
      isPremium: event['isPremium'] as bool,
    );
  });

  @freezed
  abstract class GalleryData with _$GalleryData {
    const factory GalleryData({
      required List<Media> photos,
      required int usageBytes,
      required bool isPremium,
    }) = _GalleryData;
  }
  ```
  ```graphql
  query GetGallery($eventId: ID!) {
    event(where: { id: $eventId }) {
      isPremium galleryUsageBytes
      gallery { id image { url filesize } }
    }
  }
  ```
- Upload call (multipart, via `graphql_flutter`'s `MultipartFile` support):
  ```dart
  Future<void> uploadPhoto(String inviteToken, File file) async {
    final client = ref.read(graphQLClientProvider);
    final result = await client.mutate(MutationOptions(
      document: gql(uploadGuestPhotoMutation),
      variables: {
        'inviteToken': inviteToken,
        'file': MultipartFile.fromBytes('file', await file.readAsBytes(), filename: file.path.split('/').last),
      },
    ));
    if (result.hasException) throw result.exception!;
  }
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-photo-gallery`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/providers/gallery_provider.dart`
  - `app/lib/screens/gallery_tab.dart`
  - `app/test/providers/gallery_provider_test.dart`
- Modify:
  - `app/lib/screens/event_details_screen.dart` — replace the locked Gallery-tab placeholder with `GalleryTab`.
  - `app/pubspec.yaml` — add `image_picker`, `image_gallery_saver` (or platform equivalents).

## 7. Implementation Steps

1. Checkout `feature/app-photo-gallery` from `dev`.
2. Add `image_picker`/download dependencies; run `flutter pub get`.
3. Create `gallery_provider.dart` per Section 4, including the multipart upload call.
4. Build `gallery_tab.dart`: usage meter, buttons, grid, `FeatureLockOverlay` integration.
5. Wire into `event_details_screen.dart`'s Gallery tab.
6. Write tests per Section 9; run them.
7. Manually verify against a running local API — upload a photo on a premium event (confirm it appears + usage meter updates), confirm the lock overlay shows on a non-premium event; stop the API server afterward.
8. Commit atomically (dependencies, then provider, then screen, then integration, then tests) and push.

## 8. Error Handling & Edge Cases

- Upload on a non-premium event: upload button is hidden behind the `FeatureLockOverlay`, not merely disabled — matches the design's full-veil lock pattern.
- Upload exceeding the 2GB quota (api rejects per `.docs/specs/api/photo-gallery.md`): show an error snackbar "Gallery is full" — no partial/broken grid entry.
- Photo picker permission denied: show a message directing to app settings, matching the pattern from `.docs/specs/app/guest-list.md`'s contacts-permission handling.
- Empty gallery (zero photos, premium event): show an empty state ("No photos yet — be the first to share!") instead of a blank grid.
- Download failure (storage/permission issue): per-photo error shown inline in "Download all"'s progress list; the operation continues to the next photo rather than aborting entirely.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/gallery_test.dart`.
- Coverage Required:
  - [ ] Happy path (premium event): upload a photo, appears in the grid, usage meter updates.
  - [ ] Non-premium event: `FeatureLockOverlay` shown, upload button not reachable.
  - [ ] Empty-gallery state renders correctly.
  - [ ] Quota-exceeded error surfaces correctly (mock the api rejection).

### 9a. Unit Testing

- Test Framework: `flutter_test` + `mocktail`.
- Test File Location: `app/test/providers/gallery_provider_test.dart`.
- Coverage Required:
  - [ ] `galleryProvider` parses a mocked response into `GalleryData` correctly.
  - [ ] `uploadPhoto` sends a correctly-shaped multipart mutation and surfaces errors as exceptions.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-photo-gallery`.
- [ ] Guests can upload/view/download photos on a premium event; the tab is locked on a non-premium event, verified manually.
- [ ] Usage meter accurately reflects `galleryUsageBytes`.
- [ ] All tests defined in Section 9 pass.
