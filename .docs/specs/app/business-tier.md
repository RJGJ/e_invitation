# AI Feature Spec: Business Tier — Org Workspace (Flutter app)

## 1. Feature Overview

**Description:** Multi-event dashboard and team-seat management for organization accounts (coordinators/planners/venues), on top of `.docs/specs/api/business-tier.md`'s `Organization`/`Subscription` models.
**Business Value:** The app-side surface for the recurring-revenue business segment (PLAN.md §2) — without it, org customers have no way to actually use their subscription.

## 2. Current System State (Crucial)

- **Explicitly last in build order** — do not start before M1-M11 ship, per `masterplan/README.md` and PLAN.md's "fast-follow" framing. This spec exists for planning completeness only.
- Depends entirely on `.docs/specs/api/business-tier.md` landing first, plus the individual-host dashboard (`.docs/specs/app/host-dashboard.md`, M5) whose `EventCard`/stats components this ticket reuses for the multi-event org view, rather than building a second card component.
- Pricing/seat-limit display depends on the same PLAN.md §9 open item the api spec flags — do not hardcode numbers into UI copy until confirmed.

## 3. Scope & Boundaries

- IN SCOPE (once this milestone actually starts, after confirming pricing with the user):
  - `lib/screens/org_dashboard_screen.dart`: multi-event list scoped to `organization.events` (reuses `EventCard` from M5), a member list with role indicators (owner/member), a "Subscription" panel (tier, status, next billing date, `Subscription.currentPeriodEnd`).
  - `lib/screens/org_settings_screen.dart`: invite/remove members (owner-only), branding-removal toggle (Pro-tier only), subscription management (upgrade/downgrade tier, cancel — via a checkout/billing-portal flow similar in shape to M9's checkout provider, but for recurring subscriptions rather than one-time payment).
  - Conditional footer suppression: reveal screen (M2) and other "Made with Emerald & Co." footers check `event.organization?.removeBranding` and hide the footer when true.
- DEFERRED:
  - DO NOT implement anything in this list until M1-M11 ship and the api-side spec's pricing questions are resolved.
  - DO NOT build a full RBAC settings UI — matches the api spec's two-tier (owner/member) simplicity.

## 4. Interfaces & Data Contracts

- To be finalized when this milestone starts, once `.docs/specs/api/business-tier.md`'s schema is implemented and confirmed. Expected shape (illustrative, not final):
  ```dart
  @freezed
  abstract class Organization with _$Organization {
    const factory Organization({
      required String id,
      required String name,
      required OrgTier tier,
      required bool removeBranding,
      required List<User> members,
      Subscription? subscription,
    }) = _Organization;
    factory Organization.fromJson(Map<String, dynamic> json) => _$OrganizationFromJson(json);
  }
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first (only after M1-M11 are merged).
- Branch Naming Convention: `feature/app-[brief-description]`.
- Target Branch Name: `feature/app-business-tier`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- To be finalized when this milestone actually starts.

## 7. Implementation Steps

1. **Before any other step:** confirm pricing/seat limits with the user (matches the api spec's Section 7 step 1) — this UI displays those numbers directly.
2. Checkout `feature/app-business-tier` from `dev` (only after M1-M11 are merged and `.docs/specs/api/business-tier.md` is implemented).
3. Build `org_dashboard_screen.dart` reusing `EventCard`/`EventStats` from M5.
4. Build `org_settings_screen.dart`: member management, branding toggle, subscription panel.
5. Add branding-suppression checks to the reveal screen and any other footer call sites.
6. Write tests; run them.
7. Commit atomically and push.

## 8. Error Handling & Edge Cases

- Member (non-owner) attempting to reach settings actions reserved for the owner: UI hides those actions entirely (matches the api's access-control denial) rather than showing a disabled button with no explanation.
- Subscription in `past_due`/`canceled` status: org dashboard shows a prominent billing-issue banner; event cards show premium features as locked (org-derived premium status revoked per the api spec's Section 8).
- Branding-removal toggle attempted on a Starter-tier org: disabled with an upsell prompt to Pro, not a silent no-op.

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app)

### 9b. End-to-End Testing

- Test Framework: Patrol.
- Coverage Required (finalize alongside Section 6):
  - [ ] Owner can manage members and see the subscription panel; member cannot see owner-only actions.
  - [ ] Multi-event dashboard correctly lists all org events using the reused `EventCard`.
  - [ ] Branding footer is suppressed on events under a `removeBranding: true` Pro org.
  - [ ] Past-due subscription shows the billing-issue banner and locks premium features.

### 9c. Test Execution

- Command: `cd app && flutter test` (unit), `cd app && patrol test` (integration).
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Not started before M1-M11 ship and pricing is confirmed with the user.
- [ ] Org owners/members can use the multi-event dashboard and settings per their role, verified manually.
- [ ] Branding removal correctly applies only for Pro-tier orgs with an active subscription.
- [ ] All tests defined in Section 9 pass.
