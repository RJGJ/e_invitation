# Milestone Spec: M9 — Monetization & Entitlements

## 1. Feature Overview

**Description:** The real Plan/Entitlement model, contextual paywall UI (`FeatureLockOverlay`), Upgrade/checkout screen, and PayMongo/Stripe payment integration + webhooks. Corresponds to design screen `07`; backs `PLAN.md` §3-7.
**Business Value:** This is the revenue mechanism for the entire platform (PLAN.md §1: free spreads the invite, premium is the business model).

## 2. Current System State

- `api/`: no `Plan`/`Entitlement`/`Payment` models exist. M3 and M8 currently gate premium features behind stub booleans that this milestone must replace.
- `app/`: no Upgrade screen or checkout flow exists.
- Pricing is placeholder-only per `PLAN.md` §4 — confirm current pricing with the user before hardcoding amounts in the detailed spec.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Plan` (Free/Plus/Premium per DESIGN_SYSTEM.md §10) + `Entitlement` per `Event` (one-time purchase, individual host tier per PLAN.md §2).
  - `Payment` model + PayMongo (primary, PH-first) integration, Stripe as fallback for international cards; webhook handler to flip entitlements on successful payment.
  - Upgrade screen (`PlanCard` components, feature comparison, checkout).
  - Swap M3's and M8's stub entitlement checks to read the real `Entitlement`.
  - 7-day refund window logic (PLAN.md §7) — refund eligibility check, not full refund automation UI.
  - Retention subsection: 2-year retention timer from payment date, pre-expiry reminder email + download-everything export (PLAN.md §6), 60-day grace for free events.
- DEFERRED:
  - DO NOT build the business/subscription tier billing (M12) — one-time per-event payment only.
  - DO NOT build storage top-up or retention-extension purchases — flagged as open pricing items in PLAN.md §9.
  - DO NOT finalize actual prices — use placeholders from PLAN.md §4 pending infra-cost confirmation.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/monetization`
- Target Branch Name: `feature/monetization`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/monetization.md` + `.docs/specs/app/monetization.md`
per the template, written when this milestone is picked up. Payment provider
credentials/webhook secrets must go through `.env`, never hardcoded.
