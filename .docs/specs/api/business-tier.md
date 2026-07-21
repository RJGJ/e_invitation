# AI Feature Spec: Business Tier — Organization Model

## 1. Feature Overview

**Description:** `Organization` list for coordinators/planners/venues running many events: multi-seat membership, a monthly `Subscription` (distinct from individual hosts' one-time per-`Event` `Entitlement` from `.docs/specs/api/monetization.md`), and org-scoped access to member events.
**Business Value:** Recurring revenue from professional event organizers — a distinct customer segment from individual hosts (PLAN.md §2).

## 2. Current System State (Crucial)

- **Explicitly last in build order.** Per `masterplan/README.md` and `PLAN.md`: "Business tier is a fast-follow after individual MVP — scope it, don't build it first." This spec must not be implemented before M1-M11 have shipped.
- Existing Infrastructure: `Entitlement`/`Payment` models exist per `.docs/specs/api/monetization.md`, built for one-time per-event purchases by an individual `User`. This ticket adds a parallel, separate `Subscription` concept for orgs rather than retrofitting `Entitlement` — an org's subscription doesn't attach to one `Event`, it grants premium to every event under the org.
- **Open pricing/limits question, unresolved:** PLAN.md §9 explicitly lists "business-tier limits (events per plan, seat counts)" and Starter/Pro monthly prices as open items with no confirmed values (`₱X/mo`, `₱Y/mo` placeholders). Do not invent numbers — confirm with the user before implementing the pricing table this spec's `SubscriptionTier` enum implies.

## 3. Scope & Boundaries

- IN SCOPE (once this milestone actually starts):
  - `Organization` list: `name`, `owner` (relationship to `User`), `members` (many-to-many relationship to `User`, via a join list or Keystone's native many-to-many), `tier` (select: `starter`/`pro`).
  - `Subscription` list: `organization` (1:1), `status` (`active`/`canceled`/`past_due`), `provider`/`providerSubscriptionId` (mirrors `Payment`'s provider fields, reused pattern), `currentPeriodEnd`.
  - `Event.organization`: optional relationship — an event created under an org context is linked here; `Event.isPremium`'s webhook-derived logic (from `monetization.md`) is extended so an event with a non-null `organization` whose `Subscription.status == 'active'` is treated as premium without needing its own individual `Entitlement`.
  - Access control: org members can query/create/update events under their `organization` (extending `Event.access.filter` beyond the single-author check); only the org `owner` can manage `members`/`tier`/billing.
  - Branding-removal flag on `Organization` (`removeBranding: boolean`, Pro-tier only) — read by the app to conditionally hide the "Made with Emerald & Co." footer (per DESIGN_SYSTEM.md's reveal-screen footer).
- DEFERRED:
  - DO NOT implement anything in this list until M1-M11 ship and the pricing/limits open items in PLAN.md §9 are resolved with the user.
  - DO NOT build a full RBAC system for org roles beyond owner-vs-member — a two-tier permission model (owner manages billing/members, members manage events) is sufficient per PLAN.md §2's description.

## 4. Interfaces & Data Contracts

```typescript
export interface Organization {
  id: string;
  name: string;
  ownerId: string;         // relationship -> User
  memberIds: string[];      // many-to-many -> User
  tier: OrgTier;              // select: starter | pro
  removeBranding: boolean;     // checkbox, defaultValue: false, Pro-only (enforced by hook)
}
export enum OrgTier { Starter = "starter", Pro = "pro" }

export interface Subscription {
  id: string;
  organizationId: string;    // relationship, 1:1
  status: SubscriptionStatus;
  provider: PaymentProvider;   // reused enum from monetization.md
  providerSubscriptionId: string;
  currentPeriodEnd: Date;
}
export enum SubscriptionStatus { Active = "active", Canceled = "canceled", PastDue = "past_due" }
```

- `Event` field addition: `organization: relationship({ ref: 'Organization.events', many: false })`.
- Premium-check extension (wherever `.docs/specs/api/monetization.md`'s webhook/derived `isPremium` logic lives): treat `event.organization?.subscription?.status === 'active'` as an additional premium source, alongside the existing per-event `Entitlement`.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/business-tier`
- Target Branch Name: `feature/business-tier`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- To be finalized when this milestone actually starts — do not create files against this spec until M1-M11 ship and pricing/limits are confirmed with the user.

## 7. Implementation Steps

1. **Before any other step:** confirm Starter/Pro pricing and per-tier event/seat limits with the user (PLAN.md §9 open item) — do not proceed on placeholder numbers for a paid subscription product.
2. Checkout `feature/business-tier` from `dev` (only after M1-M11 are merged).
3. Add `Organization`/`Subscription` lists; add `Event.organization`.
4. Extend the premium-check logic from `monetization.md` to include org subscriptions.
5. Implement org-scoped `Event.access.filter` extension.
6. Write tests per Section 9; run them.
7. Commit atomically and push.

## 8. Error Handling & Edge Cases

- An org member removed from `Organization.members`: loses org-scoped event access going forward; events they already created under the org remain org-owned, not reassigned to them individually (no ownership transfer in this ticket).
- `Subscription.status` transitions to `past_due`/`canceled`: all org events lose the org-derived premium status immediately (no grace period in this ticket — a grace period is a product decision to confirm with the user if wanted).
- A `User` who is both an individual host (with their own per-event `Entitlement`s) and an org member: the two premium sources are independent — losing org access doesn't affect their personally-purchased entitlements and vice versa.

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Coverage Required (to be finalized alongside Section 6 when this milestone starts):
  - [ ] Org owner can manage members/tier/billing; members cannot.
  - [ ] Org members can create/manage events under the org.
  - [ ] An event under an active-subscription org is treated as premium without its own `Entitlement`.
  - [ ] Losing org access / subscription lapsing correctly revokes org-derived premium status.
  - [ ] Edge cases from Section 8 covered.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Not started before M1-M11 ship and PLAN.md §9's pricing/limits are confirmed with the user.
- [ ] `Organization`/`Subscription` models exist with the access control described in Section 4.
- [ ] Org-subscription-derived premium status correctly extends (not replaces) the individual-`Entitlement` premium path.
- [ ] All tests defined in Section 9 pass.
