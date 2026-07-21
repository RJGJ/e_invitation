# AI Feature Spec: Replay Clip (Flutter app)

## 1. Feature Overview

**Description:** Shareable video clip of the guest's reveal animation (design screen `11`), generated after RSVP confirmation, always free (PLAN.md §3 — an explicit growth driver, not gated).
**Business Value:** Named in `PLAN.md` §3 as the free tier's virality hook — a clip shared outside the platform (social media, chat apps) is the product's main organic-growth channel.

## 2. Current System State (Crucial)

- Existing Infrastructure: reveal screens (`.docs/specs/app/reveal-experiences.md`, M2) render the wedding/baptism/birthday animations. RSVP confirmation screen (`.docs/specs/app/rsvp-flow.md`, M3) has a "Get your replay clip" CTA currently deferred/stubbed there.
- **Design decision (resolved here, not left open):** client-side capture, not server-side rendering. Rationale: the reveal animation already runs correctly on-device (M2); re-rendering it server-side would require a headless browser/animation engine duplicate of the Flutter widget tree — a large, separate rendering pipeline for a feature PLAN.md keeps free/low-priority. Client-side capture (recording the on-screen animation via Flutter's frame-capture APIs) reuses the exact same rendering code with no duplication. This spec proceeds on that basis; no `api/` spec is needed for generation (only for optional clip *storage/sharing*, both handled by existing `media-storage` infra, not a new endpoint).

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/services/reveal_recorder.dart`: captures frames of a `RevealController`'s animation via `RepaintBoundary` + `toImage()` at a fixed interval during playback, encodes to an MP4/GIF using an on-device encoder package (e.g. `ffmpeg_kit_flutter` for MP4, chosen over pure-Dart GIF encoding for smaller/more shareable output — confirm package licensing (LGPL) is acceptable for this repo before adding).
  - Trigger: from the RSVP confirmation screen's "Get your replay clip" button, re-plays the *same* reveal animation off-screen (or replays visibly) while recording, in the vertical (9:16) aspect ratio shown in the design.
  - `lib/screens/replay_clip_screen.dart`: video preview (play/pause), "Save clip" (device gallery, via `image_gallery_saver`/platform save, reused from M8's download infra), "Share link" (native share sheet via `share_plus`), social-icon row (email/music-app/generic/link — reuses `share_plus`'s generic share target, not per-platform deep integration).
  - Clip storage: uploaded to the existing `Media` list (host-authenticated path uses `createMedia`; guest path — since the clip is generated from a guest's own RSVP flow, no session exists — reuses the same guest-upload pattern established in `.docs/specs/api/photo-gallery.md`'s `uploadGuestPhoto`, extended to accept a video mimetype if `Media.image()`'s underlying storage doesn't already support video; flag this as a small, likely one-line api-side follow-up if `image()` rejects video files during implementation, not a full new api spec).
- DEFERRED:
  - DO NOT build server-side rendering — resolved against in Section 2.
  - DO NOT gate this feature behind any entitlement — stays free per PLAN.md §3; do not read `event.isPremium` anywhere in this ticket.
  - DO NOT build per-platform native share integrations beyond what `share_plus`'s generic sheet provides.

## 4. Interfaces & Data Contracts

- `reveal_recorder.dart`:
  ```dart
  class RevealRecorder {
    RevealRecorder({required this.boundaryKey});
    final GlobalKey boundaryKey; // attached to a RepaintBoundary wrapping the reveal widget

    Future<File> record({required Duration duration, Duration frameInterval = const Duration(milliseconds: 66)}) async {
      // Captures frames via (boundaryKey.currentContext.findRenderObject() as RenderRepaintBoundary).toImage()
      // at `frameInterval` for `duration`, pipes PNG frames into ffmpeg_kit_flutter to produce an MP4.
    }
  }
  ```
- Upload reuses the M8 pattern (extended for video):
  ```graphql
  mutation UploadReplayClip($inviteToken: String!, $file: Upload!) {
    uploadGuestPhoto(inviteToken: $inviteToken, file: $file) { id image { url } }
  }
  ```
  Note: named `uploadGuestPhoto` for now (reusing the M8 mutation as-is) — if the api-side `image()` field rejects video mimetypes during implementation, the one-line follow-up noted in Section 3 either loosens its accepted mimetypes or the mutation is renamed/generalized; not deciding that ambiguity here, flagging it for the implementer to resolve against the real Keystone `image()` field behavior.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-replay-clip`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/services/reveal_recorder.dart`
  - `app/lib/screens/replay_clip_screen.dart`
  - `app/test/services/reveal_recorder_test.dart`
- Modify:
  - `app/lib/screens/rsvp_screen.dart` (M3's confirmation step) — wire "Get your replay clip" to trigger recording + navigate to `replay_clip_screen.dart`.
  - `app/pubspec.yaml` — add `ffmpeg_kit_flutter`, `share_plus`.

## 7. Implementation Steps

1. Checkout `feature/app-replay-clip` from `dev`.
2. Add `ffmpeg_kit_flutter`/`share_plus` dependencies; confirm LGPL licensing is acceptable (flag to the user if not, before proceeding further).
3. Build `reveal_recorder.dart`: `RepaintBoundary` frame capture + MP4 encode.
4. Build `replay_clip_screen.dart`: video preview, save/share actions.
5. Wire the RSVP confirmation screen's CTA to trigger recording (re-running the appropriate `RevealController` for `event.type`) then navigate to the clip screen.
6. Implement the upload call; resolve the video-mimetype question from Section 4 against the actual api behavior (adjust `Media.image()`'s accepted types on the api side if needed, as a small follow-up commit, not a new spec).
7. Write tests per Section 9; run them.
8. Manually verify on a physical device (frame capture / video encoding needs real device testing, not just simulator) for at least one event type; stop any running API server afterward.
9. Commit atomically (dependencies, then recorder, then screen, then RSVP wiring, then upload, then tests) and push.

## 8. Error Handling & Edge Cases

- Recording/encoding failure (device resource constraints, encoder error): show an error state with a "Try again" button — do not silently fail with a blank video.
- Upload failure after successful local recording: the clip stays available locally (via "Save clip") even if the share-link upload fails — local save and remote share are independent operations, not coupled.
- Low-end device where frame capture is too slow to keep up with `frameInterval`: acceptable degraded output (fewer frames, choppier clip) — no dynamic quality throttling in this ticket.
- User backgrounds the app mid-recording: recording is best-effort; if interrupted, show the error/retry state on return rather than a corrupted partial clip.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol (on a physical/emulated device — frame capture doesn't work in pure widget tests).
- Test File Location: `app/integration_test/replay_clip_test.dart`.
- Coverage Required:
  - [ ] Happy path: completing an RSVP and tapping "Get your replay clip" produces a playable video on the clip screen.
  - [ ] "Save clip" saves to the device gallery (verify via platform channel mock or manual check).
  - [ ] "Share link" opens the native share sheet.
  - [ ] Recording failure shows the retry state (Section 8).

### 9a. Unit Testing

- Test Framework: `flutter_test`.
- Test File Location: `app/test/services/reveal_recorder_test.dart`.
- Coverage Required:
  - [ ] `RevealRecorder.record` produces a non-empty file given a mocked frame-capture sequence (mock the `RenderRepaintBoundary`/ffmpeg calls — this is inherently an integration-heavy feature, so unit coverage focuses on the surrounding control flow, not the actual encode).

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration, physical/emulated device required).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-replay-clip`.
- [ ] A guest can generate, save, and share a replay clip after RSVPing, verified manually on a physical device, for all 3 event types.
- [ ] No entitlement check anywhere in this feature — confirmed free for all events.
- [ ] All tests defined in Section 9 pass.
