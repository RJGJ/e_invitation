# AI Feature Spec: Lite Fallback Widget (Flutter app)

## 1. Feature Overview

**Description:** A static, non-animated `LiteCard` widget (design screen `12`) shown in place of the full reveal animation when the device has reduced-motion enabled or the reveal's assets haven't loaded within a load-time budget — matching DESIGN_SYSTEM.md §7's `LiteCard` spec.
**Business Value:** Guests on slow connections still get a usable, fast-loading invite instead of a stalled animation — PLAN.md's low-bandwidth requirement, in-app counterpart to `.docs/specs/api/public-web-invite.md`'s web fallback.

## 2. Current System State (Crucial)

- Existing Infrastructure: `.docs/specs/app/reveal-experiences.md` (M2) already handles `MediaQuery.disableAnimations` by skipping straight to the revealed state — this ticket adds the *second* trigger (load-time budget exceeded) and the actual static `LiteCard` visual design, which M2 deliberately deferred ("DO NOT build the Lite mode static fallback").
- No load-budget/timeout detection exists in the reveal screen yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/widgets/reveal/lite_card.dart`: static card per design screen `12` — photo circle, overline, name, date/venue, RSVP + details buttons, "lite version" pill, "Try the full version →" link.
  - Load-budget detection in `reveal_screen.dart` (M2): a timer (e.g. 3 seconds) started when the screen loads; if the event's cover image + reveal assets haven't finished loading by the timeout, show `LiteCard` instead of the animated `RevealController`. "Try the full version" retries loading the animated reveal.
  - `⚡ Lite mode` toggle already present in the reveal screen's top bar (per the M2 design mockups, shown as a badge) — wire it to manually switch to `LiteCard` on demand, not just automatically.
- DEFERRED:
  - DO NOT build actual network-speed detection (e.g. measuring throughput) — the load-budget timeout (did assets finish loading within N seconds) is a simpler, sufficient proxy for this ticket.
  - DO NOT touch the public web route (`.docs/specs/api/public-web-invite.md`) — that's a separate, non-Flutter surface handled entirely on the api side.

## 4. Interfaces & Data Contracts

- `lite_card.dart`:
  ```dart
  class LiteCard extends StatelessWidget {
    const LiteCard({super.key, required this.event, required this.onTryFullVersion});
    final Event event;
    final VoidCallback onTryFullVersion;
  }
  ```
- Load-budget logic addition to `reveal_screen.dart` (extends the `event_detail_provider`-driven build already there from M2):
  ```dart
  static const _loadBudget = Duration(seconds: 3);
  // On successful event fetch, start a Timer(_loadBudget, () => setState(() => _showLiteCard = true))
  // if the cover image hasn't finished precaching by then; cancel the timer if it loads first.
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-lite-fallback`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/widgets/reveal/lite_card.dart`
  - `app/test/widgets/reveal/lite_card_test.dart`
- Modify:
  - `app/lib/screens/reveal_screen.dart` — add load-budget timer + manual "⚡ Lite mode" toggle wiring.

## 7. Implementation Steps

1. Checkout `feature/app-lite-fallback` from `dev`.
2. Build `lite_card.dart` per Section 4/design screen `12`.
3. Add the load-budget timer to `reveal_screen.dart`; wire the existing "⚡ Lite mode" badge to manually toggle it.
4. Wire `LiteCard`'s "Try the full version" to cancel lite mode and attempt the animated reveal again.
5. Write tests per Section 9; run them.
6. Manually verify by throttling network in a simulator/emulator to force the load-budget timeout; confirm `LiteCard` appears and "Try the full version" recovers correctly.
7. Commit atomically (widget, then screen integration, then tests) and push.

## 8. Error Handling & Edge Cases

- Load-budget timer fires after the animated reveal has already started playing (race condition — asset loaded just in time but the timer fired a moment later): guard with the same `_isRevealing` flag pattern from M2 — once the reveal has started, the timer is a no-op even if it fires.
- User manually toggles Lite mode mid-animation: cancel the in-progress `AnimationController`, switch immediately to `LiteCard` — no half-played animation left visible.
- `LiteCard`'s RSVP/details buttons route to the same M3/M4 screens as the full reveal — no separate lite-mode RSVP flow.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9a. Unit/Widget Testing

- Test Framework: `flutter_test`.
- Test File Location: `app/test/widgets/reveal/lite_card_test.dart`.
- Coverage Required:
  - [ ] `LiteCard` renders event title/date/venue and calls `onTryFullVersion` when tapped.
  - [ ] `reveal_screen.dart`'s load-budget timer shows `LiteCard` when the timeout elapses before assets load (use `fakeAsync`/`Timer` mocking).
  - [ ] Manual Lite-mode toggle switches views correctly and cancels any in-progress animation (Section 8 edge case).

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/lite_fallback_test.dart`.
- Coverage Required:
  - [ ] Simulated slow load shows `LiteCard` automatically.
  - [ ] "Try the full version" recovers to the animated reveal.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit/widget), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-lite-fallback`.
- [ ] `LiteCard` shows automatically on load timeout and manually via the Lite-mode toggle, verified manually.
- [ ] All tests defined in Section 9 pass.
