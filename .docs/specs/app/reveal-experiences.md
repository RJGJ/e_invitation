# AI Feature Spec: Reveal Experiences (Flutter app)

## 1. Feature Overview

**Description:** Guest-facing animated reveal screens for the three event types — wedding (wax-seal → envelope flap → card rise), baptism (candle light → glow bloom → orbs → name fade), birthday (balloon pop → confetti → photo spring) — matching design screens `01`/`02`/`03`. Tap-to-reveal, replayable, reduced-motion aware.
**Business Value:** The core "wow" moment guests see when opening an invite link — the product's primary differentiator and share driver (PLAN.md §1).

## 2. Current System State (Crucial)

- Existing Infrastructure: Riverpod, `go_router` (`app/lib/providers/router_provider.dart` — currently only `/splash`, `/login`, `/home`, all authenticated-app routes). No guest-facing/unauthenticated route exists yet.
- **Dependency:** `.docs/specs/app/media-event-models.md`'s `Event`/`Media` models + `graphQLClientProvider` must exist (not yet built as of this spec — see M1 app spec's note) to fetch the event data a reveal renders (`title`, `type`, `coverImage`, `startDate`, `venueName`).
- Existing Theme: `app/lib/theme/` (`app_colors.dart`, `app_typography.dart`, `app_theme.dart`) covers Material 3 tokens but **does not yet define per-event-type accents or motion-duration tokens** per `DESIGN_SYSTEM.md` §1.2/§4 (`accentWedding`/`accentBaptism`/`accentBirthday`, `motionMicro`/`motionEnter`/`motionSpring`/`motionAmbient`) — this ticket must add them (as a `ThemeExtension`, matching the `EmeraldColors` pattern the design system doc specifies) since no future ticket currently owns that gap.
- No `RevealController` or reveal screens exist yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - `EmeraldMotion`/`EmeraldEventColors` `ThemeExtension`s: motion durations/curves (§4) and per-type accent colors (§1.2), added to `app/lib/theme/`.
  - `lib/widgets/reveal/reveal_controller.dart`: an abstract `RevealController` + `WeddingReveal`/`BaptismReveal`/`BirthdayReveal` implementations, each an `AnimationController`-driven widget sequence.
  - `lib/screens/reveal_screen.dart`: takes an `eventId` (route param), fetches the `Event`, resolves `EventType` → the matching `RevealController`, renders it full-screen with a "tap to open/light/pop" hint, then post-reveal shows RSVP-now / View-details CTA buttons (stubs routing to placeholder screens — RSVP is M3, details is M4) and the "Made with Emerald & Co." app-download footer.
  - Public route `/invite/:eventId` (unauthenticated) added to `routerProvider`, bypassing the auth-redirect logic in `redirect:` (guests don't log in to view an invite).
  - Reduced-motion handling: `MediaQuery.of(context).disableAnimations` skips ambient loops (flicker/orb-float/confetti) and jumps straight to the revealed state.
  - Replay affordance: re-runs the local `AnimationController` sequence from the start.
- DEFERRED:
  - DO NOT build RSVP submission (M3) or the details page (M4) — CTA buttons route to placeholder/stub screens.
  - DO NOT build the "Lite mode" static fallback (M11) — this ticket only respects `disableAnimations`, it does not implement bandwidth-based fallback detection.
  - DO NOT build the "Replay clip" shareable export (M10) — the in-screen replay only re-plays the local animation, no video/GIF generation.
  - DO NOT add a 4th/5th event type — `RevealController` is designed to be extensible per DESIGN_SYSTEM.md §11, but only wedding/baptism/birthday ship now.

## 4. Interfaces & Data Contracts

- Theme extension additions (`app/lib/theme/`):
  ```dart
  @immutable
  class EmeraldEventColors extends ThemeExtension<EmeraldEventColors> {
    const EmeraldEventColors({
      required this.accentWedding,   // 0xFFC9A24B
      required this.accentBaptism,   // 0xFF7FA0B0
      required this.accentBirthday,  // 0xFFF2996F
    });
    final Color accentWedding;
    final Color accentBaptism;
    final Color accentBirthday;

    Color accentFor(EventType type) => switch (type) {
      EventType.wedding => accentWedding,
      EventType.baptism => accentBaptism,
      EventType.birthday => accentBirthday,
    };

    @override
    EmeraldEventColors copyWith({Color? accentWedding, Color? accentBaptism, Color? accentBirthday}) =>
        EmeraldEventColors(
          accentWedding: accentWedding ?? this.accentWedding,
          accentBaptism: accentBaptism ?? this.accentBaptism,
          accentBirthday: accentBirthday ?? this.accentBirthday,
        );

    @override
    EmeraldEventColors lerp(EmeraldEventColors? other, double t) =>
        other == null ? this : EmeraldEventColors(
          accentWedding: Color.lerp(accentWedding, other.accentWedding, t)!,
          accentBaptism: Color.lerp(accentBaptism, other.accentBaptism, t)!,
          accentBirthday: Color.lerp(accentBirthday, other.accentBirthday, t)!,
        );
  }

  abstract final class EmeraldMotion {
    static const micro = Duration(milliseconds: 180);   // taps/toggles, easeOut
    static const enter = Duration(milliseconds: 400);   // content reveal, easeOut
    static const spring = Duration(milliseconds: 550);  // balloon/photo pop, overshoot curve
    static const ambient = Duration(milliseconds: 2600); // flicker/glow/float loops, easeInOut
  }
  ```

- `RevealController` contract (`lib/widgets/reveal/reveal_controller.dart`):
  ```dart
  abstract class RevealController extends StatefulWidget {
    const RevealController({super.key, required this.event, required this.onRevealed});
    final Event event;
    final VoidCallback onRevealed; // fired once the reveal animation completes
  }

  RevealController revealControllerFor(Event event, {required VoidCallback onRevealed}) =>
      switch (event.type) {
        EventType.wedding => WeddingReveal(event: event, onRevealed: onRevealed),
        EventType.baptism => BaptismReveal(event: event, onRevealed: onRevealed),
        EventType.birthday => BirthdayReveal(event: event, onRevealed: onRevealed),
      };
  ```

- GraphQL query for the reveal screen (reuses `Event`'s existing shape from `media-event-models.md`, single-item lookup):
  ```graphql
  query GetEvent($id: ID!) {
    event(where: { id: $id }) {
      id title type startDate venueName address
      coverImage { image { url } }
    }
  }
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-reveal-experiences`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/theme/emerald_event_colors.dart`, `app/lib/theme/emerald_motion.dart`
  - `app/lib/widgets/reveal/reveal_controller.dart`, `wedding_reveal.dart`, `baptism_reveal.dart`, `birthday_reveal.dart`
  - `app/lib/screens/reveal_screen.dart`
  - `app/lib/providers/event_detail_provider.dart` (single-event `FutureProvider.family<Event, String>`)
  - `app/test/widgets/reveal/*_test.dart`
- Modify:
  - `app/lib/theme/app_theme.dart` — register `EmeraldEventColors` in `ThemeData.extensions`.
  - `app/lib/providers/router_provider.dart` — add public `/invite/:eventId` route, excluded from the auth `redirect:` check.

## 7. Implementation Steps

1. Checkout `feature/app-reveal-experiences` from `dev`.
2. Add `EmeraldEventColors`/`EmeraldMotion` theme extensions; register in `AppTheme.light`.
3. Add `event_detail_provider.dart` (`FutureProvider.family`) using the query from Section 4.
4. Build `WeddingReveal`, `BaptismReveal`, `BirthdayReveal` per the per-type animation sequences in DESIGN_SYSTEM.md §4, each wrapped by the shared `RevealController` tap/replay/reduced-motion logic.
5. Build `reveal_screen.dart`: resolves `revealControllerFor(event)`, shows post-reveal CTAs + footer.
6. Add the `/invite/:eventId` route to `router_provider.dart`; update `redirect:` to treat any `/invite/*` path as always-allowed (no auth required).
7. Write widget tests per Section 9; run them.
8. Manually verify against a running local API — open an invite link for each of the 3 types, confirm tap-to-reveal, replay, and reduced-motion (toggle OS accessibility setting) all work; stop the API server afterward.
9. Commit atomically (theme tokens, then controllers, then screen, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- If `event_detail_provider` fails (event not found, network error): show a simple "This invite couldn't be loaded" state — no reveal animation attempted.
- If `event.coverImage` is null: reveal widgets fall back to the existing diagonal-hatch placeholder pattern already used in the design mockups (a `Container` with a repeating gradient), not a broken-image icon.
- If `MediaQuery.disableAnimations` is true: skip directly to the fully-revealed state on first render — no tap required, ambient loops never start.
- If the user taps rapidly / taps mid-animation: the tap handler is a no-op once the reveal `AnimationController` has started (guard with a `_isRevealing` flag) — prevents restart glitches.
- If `event.type` is a value the app's `EventType` enum doesn't recognize (future-proofing): `revealControllerFor` has no default case — this is a compile-time exhaustiveness check via Dart's `switch` on an enum, so it can't reach runtime; if `EventType` ever grows, the compiler forces a new case to be added here.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/reveal_test.dart`.
- Coverage Required:
  - [ ] Happy path: opening `/invite/:id` for a wedding event shows the wax-seal reveal; tapping it plays the reveal and shows the RSVP/details CTAs.
  - [ ] Same happy path for baptism and birthday event types.
  - [ ] Replay control re-runs the animation.
  - [ ] Error state (event not found) shows the fallback message, no animation.

### 9a. Unit/Widget Testing

- Test Framework: `flutter_test`.
- Test File Location: `app/test/widgets/reveal/`.
- Coverage Required:
  - [ ] Each `RevealController` implementation transitions from pre-reveal to revealed state on tap and calls `onRevealed`.
  - [ ] `disableAnimations: true` (via a `MediaQueryData` override in the test) renders the revealed state immediately without requiring a tap.
  - [ ] `EmeraldEventColors.accentFor` returns the correct color per `EventType`.
  - [ ] Edge cases from Section 8 are each covered.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit/widget), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-reveal-experiences`.
- [ ] All 3 reveal types render, tap-to-reveal, and are replayable, verified manually.
- [ ] Reduced-motion setting skips ambient animation and shows the static revealed state immediately.
- [ ] `/invite/:eventId` is reachable without authentication.
- [ ] All tests defined in Section 9 pass.
