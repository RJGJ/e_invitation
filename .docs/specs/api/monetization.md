# AI Feature Spec: Monetization — Payment & Entitlement Model

## 1. Feature Overview

**Description:** Replace the `Event.isPremium` placeholder (used by M3/M6/M7/M8) with a real `Payment`/`Entitlement` model backed by PayMongo (primary, PH-first) and Stripe (international fallback), plus webhook handling and the 7-day refund window (design screen `07`; PLAN.md §3-7).
**Business Value:** The revenue mechanism for the entire platform — everything gated behind "premium" in M3/M6/M7/M8 currently reads a fake boolean; this ticket makes it real money.

## 2. Current System State (Crucial)

- Existing Infrastructure: `Event.isPremium` checkbox exists (`.docs/specs/api/rsvp-flow.md`), read directly by `submitRsvp` (M3), `Event.hooks.resolveInput.update`'s premium-gate (M7), and `uploadGuestPhoto` (M8). All three call sites need updating in this ticket to read the real entitlement instead.
- `Event.author` ownership pattern established; no `Payment` provider integration exists anywhere in `api/`.
- Pricing is placeholder-only per `PLAN.md` §4 (₱1,499 wedding, ₱799 birthday/baptism) — **do not treat these as final**; confirm current pricing with the user before this ticket's implementation, per PLAN.md §9's open item. This spec uses the placeholder values as-is since no updated figures have been provided.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Entitlement` list: one row per paid `Event` (`event` relationship, 1:1), `status` (`active`/`refunded`/`expired`), `purchasedAt`, `expiresAt` (2-year retention per PLAN.md §6), `amountPhp`.
  - `Payment` list: `entitlement` relationship, `provider` (`paymongo`/`stripe`), `providerPaymentId`, `status` (`pending`/`succeeded`/`failed`/`refunded`), `amountPhp`, `createdAt`.
  - `createCheckoutSession` custom mutation: given an `eventId`, computes the price from `Event.type` (per PLAN.md §4's table), creates a PayMongo (or Stripe, per a `provider` argument) checkout session, creates a `pending` `Payment` row, returns the checkout URL.
  - Webhook route (`api/routes/payments-webhook.ts`, following the existing `api/routes/` convention used by auth): verifies the provider's webhook signature, on a successful-payment event marks the `Payment` `succeeded`, creates/activates the `Entitlement`, sets `Event.isPremium = true` (kept as a *derived*, not primary, field — see below).
  - Replace `Event.isPremium`'s role: keep the field (other tickets already read it) but have it become a cached/derived boolean the webhook sets, rather than something the owner can toggle directly via `updateEvent` — remove `isPremium` from `Event`'s client-writable fields (`ui: { itemView: { fieldMode: 'read' } }`, matching the `author`/`updatedAt` hook-forced pattern already in `event-model.md`).
  - Refund eligibility check: a `checkRefundEligibility(eventId)` query returning whether the event is within the 7-day window AND hasn't been sent to guests (no `Guest` rows with `status != 'pending'`, i.e., no one has RSVP'd yet — closest available proxy for "not sent," since there's no explicit `Event.sentAt` field; add one if a more precise signal is needed) — actual refund processing (calling the provider's refund API) is a manual/admin action in this ticket, not a self-serve mutation.
  - Retention subsection: `Entitlement.expiresAt` set to `purchasedAt + 2 years` on creation; a scheduled job description (cron, run via whatever job runner this repo adopts — none exists yet, so this ticket adds a simple `api/lib/retention-check.ts` script runnable via a scheduled task, not a full job queue) that finds entitlements expiring within 30 days and flags them (email sending itself is deferred — see below).
- DEFERRED:
  - DO NOT build the business/subscription tier (M12) — one-time per-event payment only.
  - DO NOT build storage top-up or retention-extension purchases (PLAN.md §9 open item).
  - DO NOT send actual emails (retention reminders, receipt emails) — this ticket implements the *detection* logic (`retention-check.ts` identifying at-risk entitlements) but not an email-sending integration; that's a follow-up once an email provider is chosen.
  - DO NOT implement self-serve refund processing (calling PayMongo/Stripe's refund API automatically) — `checkRefundEligibility` only reports eligibility; an admin performs the actual refund out-of-band for this ticket.
  - DO NOT finalize pricing — placeholders from PLAN.md §4 used as-is.

## 4. Interfaces & Data Contracts

```typescript
export interface Entitlement {
  id: string;
  eventId: string;          // relationship, 1:1 with Event
  status: EntitlementStatus; // select: active | refunded | expired
  purchasedAt: Date;
  expiresAt: Date;            // purchasedAt + 2 years
  amountPhp: number;           // float
}
export enum EntitlementStatus { Active = "active", Refunded = "refunded", Expired = "expired" }

export interface Payment {
  id: string;
  entitlementId: string;     // relationship
  provider: PaymentProvider;  // select: paymongo | stripe
  providerPaymentId: string;   // text, unique
  status: PaymentStatus;        // select: pending | succeeded | failed | refunded
  amountPhp: number;             // float
  createdAt: Date;
}
export enum PaymentProvider { PayMongo = "paymongo", Stripe = "stripe" }
export enum PaymentStatus { Pending = "pending", Succeeded = "succeeded", Failed = "failed", Refunded = "refunded" }
```

- Pricing table (`api/lib/pricing.ts`), from PLAN.md §4 (placeholder):
  ```typescript
  export const EVENT_PRICING_PHP: Record<'wedding' | 'birthday' | 'baptism', number> = {
    wedding: 1499,
    birthday: 799,
    baptism: 799,
  };
  ```
- `createCheckoutSession` mutation:
  ```graphql
  type Mutation {
    createCheckoutSession(eventId: ID!, provider: PaymentProviderType!): CheckoutSession
  }
  type CheckoutSession { checkoutUrl: String!, paymentId: ID! }
  ```
  Resolver: verify `session` owns `eventId` (reuse the `Event.access.filter.update` ownership check pattern), look up price via `EVENT_PRICING_PHP[event.type]`, call the provider SDK to create a checkout session, create a `pending` `Payment` + `Entitlement` (status not yet `active` — or omit `Entitlement` creation until the webhook confirms, whichever this repo's Keystone version makes simpler; recommend creating `Entitlement` at webhook-confirm time only, to avoid orphaned entitlements from abandoned checkouts).
- Webhook route (`api/routes/payments-webhook.ts`), modeled on the existing `api/routes/auth.ts` REST-route convention:
  ```typescript
  export async function paymentsWebhookHandler(req, res) {
    // verify signature (provider-specific), parse event
    // on 'payment.succeeded': find Payment by providerPaymentId, mark succeeded,
    // create Entitlement (status: active, purchasedAt: now, expiresAt: now + 2y),
    // set Event.isPremium = true via context.sudo() (bypasses the now-read-only field)
  }
  ```
- `Event.isPremium` field change:
  ```typescript
  isPremium: checkbox({
    defaultValue: false,
    ui: { itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
  }),
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/monetization`
- Target Branch Name: `feature/monetization`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `api/lib/pricing.ts`
  - `api/lib/checkout.ts` — `createCheckoutSession` resolver + `checkRefundEligibility` query.
  - `api/routes/payments-webhook.ts`
  - `api/lib/retention-check.ts`
  - Test files co-located per the above.
- Modify:
  - `api/schema.ts` — add `Entitlement`/`Payment` lists; change `Event.isPremium` to read-only; update `Event.hooks` premium-gate to no longer accept `isPremium` in `resolvedData` (since it's now hidden from create/update views).
  - `api/lib/rsvp.ts` — `submitRsvp` and the M7 premium-gate hook now read the real `isPremium` (unchanged read pattern, just confirming the field source is now trustworthy).
  - `api/lib/photo-gallery.ts` — `uploadGuestPhoto`'s `isPremium` check, unchanged logic.
  - `.env.example` — add `PAYMONGO_SECRET_KEY`, `STRIPE_SECRET_KEY`, `PAYMENTS_WEBHOOK_SECRET` placeholders (no real secrets committed).
  - `api/keystone.ts` — register the webhook route.

## 7. Implementation Steps

1. Checkout `feature/monetization` from `dev`.
2. Add `Entitlement`/`Payment` lists to `api/schema.ts`.
3. Change `Event.isPremium` to read-only per Section 4; adjust the M7 hook to stop reading `resolvedData.isPremium` (it's no longer client-settable).
4. Add `pricing.ts` with the placeholder table.
5. Implement `createCheckoutSession` + `checkRefundEligibility` in `checkout.ts`, wired via `extendGraphqlSchema`.
6. Implement the PayMongo/Stripe webhook handler in `payments-webhook.ts`; register the route in `keystone.ts`.
7. Implement `retention-check.ts` (finds entitlements within 30 days of `expiresAt`, logs/flags them — no email send).
8. Add `.env.example` placeholders.
9. Run the Prisma migration for the new tables + `Event.isPremium` field-mode change (mode changes are UI-only, no migration needed for that part).
10. Write tests per Section 9; run them.
11. Commit atomically (schema, then pricing, then checkout resolver, then webhook, then retention script, then tests) and push.

## 8. Error Handling & Edge Cases

- `createCheckoutSession` for an event the caller doesn't own: rejected, same ownership check as `Event.access.filter.update`.
- `createCheckoutSession` called twice for the same event before the first checkout completes: allowed — creates a second `pending` `Payment`; the webhook only activates the entitlement for whichever `providerPaymentId` actually succeeds, abandoned pending payments are left as `pending` (a cleanup job for stale-pending payments is deferred).
- Webhook signature verification failure: reject with 401, do not process the event body — prevents spoofed webhook calls from granting free entitlements.
- Webhook for a `providerPaymentId` that doesn't match any known `Payment`: log and ignore (idempotent no-op), don't throw 500 (provider webhooks retry on failure — an unrecognized event shouldn't trigger endless retries).
- Double-delivery of the same webhook event (providers guarantee at-least-once delivery): the handler must be idempotent — check `Payment.status` is still `pending` before transitioning to `succeeded`; if already `succeeded`, no-op.
- `checkRefundEligibility` on an event with zero guests but past 7 days: not eligible (time-based check fails) regardless of the "not sent" proxy — both conditions must hold.

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/lib/checkout.test.ts`, `api/routes/payments-webhook.test.ts`, `api/lib/retention-check.test.ts`.
- Coverage Required:
  - [ ] `createCheckoutSession` computes the correct price per event type and rejects non-owners.
  - [ ] Webhook handler activates the `Entitlement` and sets `Event.isPremium = true` on a valid, correctly-signed `payment.succeeded` event.
  - [ ] Webhook handler rejects an incorrectly-signed request (401, no state change).
  - [ ] Webhook handler is idempotent against duplicate delivery of the same event.
  - [ ] Webhook handler ignores an unrecognized `providerPaymentId` without throwing.
  - [ ] `checkRefundEligibility` returns true only within 7 days AND zero non-pending guest RSVPs; false otherwise.
  - [ ] `retention-check.ts` correctly identifies entitlements within 30 days of `expiresAt`.
  - [ ] `Event.isPremium` can no longer be set directly via `updateEvent` (mocked client attempt is ignored/rejected).
  - [ ] Edge cases from Section 8 covered.
- Do NOT: call real PayMongo/Stripe APIs in tests — mock the provider SDK client.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/monetization`.
- [ ] `Entitlement`/`Payment` models exist; `Event.isPremium` is now webhook-derived, not client-writable.
- [ ] `createCheckoutSession` produces a real checkout URL (verified against provider sandbox/test mode).
- [ ] Webhook correctly activates entitlements idempotently and securely (signature-verified).
- [ ] `submitRsvp`/M7's hook/`uploadGuestPhoto` all continue working, now reading real entitlement state.
- [ ] All tests defined in Section 9 pass.
