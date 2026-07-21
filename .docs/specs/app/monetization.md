# AI Feature Spec: Upgrade / Checkout Screen (Flutter app)

## 1. Feature Overview

**Description:** Upgrade screen (design screen `07`): plan tier cards (Free/Plus/Premium framing per DESIGN_SYSTEM.md §10, but PLAN.md's actual pricing is one-time-per-event-type, not per-feature-tier — see Section 2), payment-method selection (GCash/Maya/card), checkout, reached from any `FeatureLockOverlay`'s "Upgrade this event" button (M7, M8).
**Business Value:** The actual money-collection screen — where an upsell moment (M7/M8's lock overlays) converts into a paid `Entitlement`.

## 2. Current System State (Crucial)

- Existing Infrastructure: `FeatureLockOverlay` (M7) navigates here via a stub route this ticket fills in. `createCheckoutSession`/`checkRefundEligibility` exist per `.docs/specs/api/monetization.md`.
- **Design/pricing note:** the design mockup (screen `07`) shows a 3-tier plan picker with per-tier pricing, but `PLAN.md` §4's actual model is a single price *by event type* (wedding/birthday/baptism), not by tier — there's only one paid tier (everything unlocked) per PLAN.md §3's Free-vs-Premium table. This ticket follows `PLAN.md` (the authoritative pricing document) over the mockup's tier-picker visual: render a single "Unlock everything for this event" card showing the price for `event.type`, not a 3-tier selector. Confirm this interpretation with the user before implementing if there's any doubt.
- No Upgrade screen exists yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/providers/checkout_provider.dart`: calls `createCheckoutSession`, exposes the returned `checkoutUrl`.
  - `lib/screens/upgrade_screen.dart`: header (per event type's price + feature list pulled from PLAN.md §3's premium row: custom RSVP questions, photo gallery), payment-method selector (GCash/Maya/Card — labels only, actual method selection is passed to the provider's hosted checkout page), "Pay" button opens `checkoutUrl` in an in-app webview (`webview_flutter` or `url_launcher` external browser — recommend `url_launcher` external browser for this ticket, since PayMongo/Stripe checkout pages are already mobile-optimized and a webview adds complexity this ticket doesn't need), 7-day-money-back disclosure text.
  - Post-checkout return handling: a deep link / redirect URL the payment provider returns to (e.g. `emerald://checkout-complete?eventId=...`) that re-fetches the event to confirm `isPremium` flipped, shows a success state.
- DEFERRED:
  - DO NOT build a 3-tier visual picker — per Section 2's pricing-model correction.
  - DO NOT build refund self-service UI — `checkRefundEligibility` exists on the API but this ticket doesn't build a "Request refund" button; that's a follow-up once admin refund processing (deferred in the api spec) exists.
  - DO NOT build an in-app webview checkout — external browser handoff via `url_launcher`.

## 4. Interfaces & Data Contracts

- `checkout_provider.dart`:
  ```dart
  final checkoutProvider = FutureProvider.family<CheckoutSession, ({String eventId, String provider})>((ref, args) async {
    final client = ref.read(graphQLClientProvider);
    final result = await client.mutate(MutationOptions(
      document: gql(createCheckoutSessionMutation),
      variables: {'eventId': args.eventId, 'provider': args.provider},
    ));
    if (result.hasException) throw result.exception!;
    return CheckoutSession.fromJson(result.data!['createCheckoutSession']);
  });

  @freezed
  abstract class CheckoutSession with _$CheckoutSession {
    const factory CheckoutSession({required String checkoutUrl, required String paymentId}) = _CheckoutSession;
    factory CheckoutSession.fromJson(Map<String, dynamic> json) => _$CheckoutSessionFromJson(json);
  }
  ```
  ```graphql
  mutation CreateCheckoutSession($eventId: ID!, $provider: PaymentProviderType!) {
    createCheckoutSession(eventId: $eventId, provider: $provider) { checkoutUrl paymentId }
  }
  ```
- Static pricing display table (`lib/screens/upgrade_screen.dart`) — mirrors `api/lib/pricing.ts`; duplicated deliberately since the app needs it for display before the checkout call, not as a source of truth (the API computes the authoritative price server-side):
  ```dart
  const eventPricingPhpDisplay = {EventType.wedding: 1499, EventType.birthday: 799, EventType.baptism: 799};
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-monetization`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/providers/checkout_provider.dart`
  - `app/lib/screens/upgrade_screen.dart`
  - `app/test/providers/checkout_provider_test.dart`
- Modify:
  - `app/lib/providers/router_provider.dart` — add `/events/:eventId/upgrade` route + the deep-link return route.
  - `app/lib/widgets/shared/feature_lock_overlay.dart` (or its call sites in M7/M8) — point `onUpgrade` at the real route instead of a stub.
  - `app/pubspec.yaml` — add `url_launcher` if not already added by M4.
  - Platform config (`android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist`) — register the `emerald://` deep-link scheme for checkout return.

## 7. Implementation Steps

1. Checkout `feature/app-monetization` from `dev`.
2. Create `checkout_provider.dart` per Section 4.
3. Build `upgrade_screen.dart`: price card, payment-method labels, Pay button, disclosure text.
4. Register the `emerald://checkout-complete` deep link at the platform level; add the corresponding `routerProvider` route that re-fetches the event and shows success/failure.
5. Wire `FeatureLockOverlay` call sites in M7/M8 to the real route.
6. Write tests per Section 9; run them.
7. Manually verify against a running local API + provider sandbox mode — complete a full checkout, confirm the app detects the `isPremium` flip on return; stop the API server afterward.
8. Commit atomically (provider, then screen, then deep link, then call-site wiring, then tests) and push.

## 8. Error Handling & Edge Cases

- `createCheckoutSession` failure (network, API error): show an inline error on the Upgrade screen, Pay button re-enabled for retry.
- User cancels checkout in the external browser (never completes payment): no deep-link return fires; the app has no way to detect this in real time — the Upgrade screen simply remains as the last screen the user backed out to; a manual "Refresh status" affordance is acceptable but not required for this ticket.
- Deep-link return fires but `isPremium` hasn't actually flipped yet (webhook processing lag): show a brief "Confirming your payment…" loading state with a short retry/poll (e.g. 3 attempts, a few seconds apart) before falling back to "We're still confirming your payment — check back shortly."
- Deep-link return with a `paymentId` that doesn't match anything (tampered/replayed link): show a generic error, do not assume success.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/upgrade_test.dart`.
- Coverage Required:
  - [ ] Happy path: tapping Upgrade from a lock overlay reaches the Upgrade screen with the correct event-type price shown.
  - [ ] Tapping Pay attempts to launch the external checkout URL (mock `url_launcher`).
  - [ ] Deep-link return with a confirmed `isPremium: true` shows the success state and the originating lock overlay is gone on next visit.
  - [ ] Polling-then-failure state (Section 8) is triggered and asserted with a mocked delayed webhook.

### 9a. Unit Testing

- Test Framework: `flutter_test` + `mocktail`.
- Test File Location: `app/test/providers/checkout_provider_test.dart`.
- Coverage Required:
  - [ ] `checkoutProvider` correctly calls the mutation and parses `CheckoutSession`.
  - [ ] Error state surfaces correctly on mutation failure.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-monetization`.
- [ ] A host can complete checkout end-to-end (against provider sandbox mode) and see the event unlock, verified manually.
- [ ] Upgrade screen shows the single per-event-type price (not a 3-tier picker), per Section 2's pricing-model correction.
- [ ] All tests defined in Section 9 pass.
