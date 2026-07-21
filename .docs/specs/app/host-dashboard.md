# AI Feature Spec: Host Dashboard (Flutter app)

## 1. Feature Overview

**Description:** Authenticated host's home screen (design screen `00`): Hosting/Invited tabs with event cards showing live stats, plus a per-event dashboard (design screen `06`) with aggregate RSVP stats, recent replies, a guest-gallery preview strip, and quick-action buttons.
**Business Value:** The host's daily-use surface — where they check RSVP progress and jump into guest/event management. Primary retention loop.

## 2. Current System State (Crucial)

- Existing Infrastructure: `app/lib/screens/home_screen.dart` — bottom-nav `Scaffold` with `HomeView`/`TemplatesView`/`AccountView`. `HomeView` (`app/lib/widgets/views/home_view.dart`) currently just renders a greeting from `authProvider` — this ticket replaces its body with the Hosting/Invited tab content, it does not touch the bottom-nav shell itself.
- `Event`/`Guest` models and `graphQLClientProvider` exist per `.docs/specs/app/media-event-models.md` + `.docs/specs/api/rsvp-flow.md` (M3) by the time this ticket starts (M5 is sequenced after M3 in `masterplan/README.md`'s dependency graph).
- No stats-aggregation query exists yet — `Guest.status` counts need to be computed either client-side (fetch all guests, count in Dart) or via a new API aggregate field. This ticket defaults to client-side counting for simplicity (small guest lists) — see Section 3.

## 3. Scope & Boundaries

- IN SCOPE:
  - `lib/providers/host_events_provider.dart`: `FutureProvider<List<Event>>` scoped to `where: { author: { id: { equals: <current user id> } } }` (Hosting tab) and a separate `guestEventsProvider` for events the user is invited to (Invited tab — requires the `Guest` model to carry a `userId`/`contactInfo` link back to the logged-in user; if no such link exists yet, the Invited tab shows an empty state with a TODO comment rather than blocking this ticket — flag this as a follow-up needed in `.docs/specs/api/guest-list.md` if not already covered there).
  - `lib/widgets/dashboard/event_card.dart`: the `EventCard` component from DESIGN_SYSTEM.md §7 — cover image + scrim, type/status badges, name, stat strip (accepted/pending/photos), "Manage" link.
  - Replace `HomeView`'s body with a tab switcher (Hosting/Invited) rendering `EventCard` lists, plus the existing "＋ Create an event" button (already added in M1, or added here if M1 hasn't landed) wired to `/create-event`.
  - `lib/screens/host_dashboard_screen.dart`: per-event dashboard — stat grid (accepted/pending/declined/total, computed client-side from `event.guests`), RSVP-progress bar, recent-replies list (last 4 guests by `respondedAt`), guest-gallery preview strip (photo count only in this ticket — real thumbnails are M8), quick-action buttons (Add guest → M6 stub route, Send reminder → stub/no-op, Edit details → M7 stub route, Export list → stub/no-op).
  - Route `/events/:eventId/dashboard` (authenticated).
- DEFERRED:
  - DO NOT implement "Send reminder" or "Export list" — quick-action buttons exist per the design but are no-ops/disabled with a "coming soon" tooltip in this ticket.
  - DO NOT build the guest-gallery preview's real photo thumbnails — M8. Show a photo count badge only.
  - DO NOT build server-side stat aggregation — client-side counting from the already-fetched `event.guests` list is accepted for this ticket's scale; revisit if guest lists grow large enough to need pagination.

## 4. Interfaces & Data Contracts

- `host_events_provider.dart`:
  ```dart
  final hostEventsProvider = FutureProvider<List<Event>>((ref) async {
    final userId = ref.watch(authProvider).maybeWhen(authenticated: (u) => u.id, orElse: () => null);
    if (userId == null) return [];
    final client = ref.read(graphQLClientProvider);
    final result = await client.query(QueryOptions(
      document: gql(getHostEventsQuery),
      variables: {'authorId': userId},
    ));
    if (result.hasException) throw result.exception!;
    return (result.data!['events'] as List).map((e) => Event.fromJson(e)).toList();
  });
  ```
  ```graphql
  query GetHostEvents($authorId: ID!) {
    events(where: { author: { id: { equals: $authorId } } }) {
      id title type startDate coverImage { image { url } }
      guests { id status }
    }
  }
  ```

- Client-side stat computation (`lib/widgets/dashboard/event_stats.dart`):
  ```dart
  class EventStats {
    const EventStats({required this.accepted, required this.pending, required this.declined});
    factory EventStats.fromGuests(List<Guest> guests) => EventStats(
      accepted: guests.where((g) => g.status == RsvpStatus.going).length,
      pending: guests.where((g) => g.status == RsvpStatus.pending).length,
      declined: guests.where((g) => g.status == RsvpStatus.declined).length,
    );
    final int accepted;
    final int pending;
    final int declined;
    int get total => accepted + pending + declined;
    double get replyRate => total == 0 ? 0 : (accepted + declined) / total;
  }
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-host-dashboard`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `app/lib/providers/host_events_provider.dart`
  - `app/lib/widgets/dashboard/event_card.dart`, `event_stats.dart`
  - `app/lib/screens/host_dashboard_screen.dart`
  - `app/test/providers/host_events_provider_test.dart`, `app/test/widgets/dashboard/event_stats_test.dart`
- Modify:
  - `app/lib/widgets/views/home_view.dart` — replace stub body with Hosting/Invited tabs.
  - `app/lib/providers/router_provider.dart` — add `/events/:eventId/dashboard` route.

## 7. Implementation Steps

1. Checkout `feature/app-host-dashboard` from `dev`.
2. Create `host_events_provider.dart` + the Invited-tab equivalent (or its documented empty-state stub).
3. Create `EventStats` + `EventCard` widgets.
4. Rebuild `home_view.dart`: tab switcher, `EventCard` lists per DESIGN_SYSTEM.md §7's card spec, empty states for zero events.
5. Build `host_dashboard_screen.dart`: stat grid, progress bar, recent replies, gallery-count strip, quick-action row (with the 2 deferred actions visibly disabled).
6. Add the dashboard route; wire `EventCard`'s "Manage" link to it.
7. Write tests per Section 9; run them.
8. Manually verify against a running local API with a seeded event + guests (reuse `.docs/specs/api/rsvp-flow.md`'s seed script); stop the API server afterward.
9. Commit atomically (providers/widgets, then screens, then routing, then tests) and push.

## 8. Error Handling & Edge Cases

- Zero hosted events: Hosting tab shows an empty state ("You haven't created an event yet") with a prominent create-event CTA, not a blank list.
- `hostEventsProvider` failing (network error): show a retry-able error state, not a crash.
- An event with zero guests: stat grid shows all zeros, progress bar shows 0%, recent-replies section is hidden (not "no replies yet" clutter) — matches the empty-section-hiding pattern from `.docs/specs/app/event-details.md`.
- Disabled quick-action buttons (Send reminder/Export list): visually distinguished (reduced opacity) and show a `SnackBar` "Coming soon" on tap rather than silently doing nothing.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Test File Location: `app/integration_test/host_dashboard_test.dart`.
- Coverage Required:
  - [ ] Happy path: Home shows Hosting tab with event cards reflecting live stats; tapping "Manage" opens the per-event dashboard.
  - [ ] Empty state (zero hosted events) shows the create-event CTA.
  - [ ] Per-event dashboard's stat grid matches the seeded guest data.
  - [ ] Disabled quick actions show the "coming soon" snackbar.

### 9a. Unit Testing

- Test Framework: `flutter_test`.
- Test File Location: `app/test/widgets/dashboard/event_stats_test.dart`.
- Coverage Required:
  - [ ] `EventStats.fromGuests` correctly counts accepted/pending/declined and computes `replyRate`, including the zero-guests edge case (no division by zero).
  - [ ] `hostEventsProvider` parses a mocked response into `List<Event>` and returns `[]` for an unauthenticated user.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/app-host-dashboard`.
- [ ] Home's Hosting tab shows real event cards with live stats, verified manually.
- [ ] Per-event dashboard renders correct aggregate stats from the event's guest list.
- [ ] All tests defined in Section 9 pass.
