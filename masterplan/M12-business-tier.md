# Milestone Spec: M12 — Business Tier (Fast-Follow)

## 1. Feature Overview

**Description:** Organization workspace for coordinators/planners/venues running many events: multi-event dashboard, team seats, monthly subscription billing (as opposed to individual hosts' one-time per-event payment). Per `PLAN.md` §2, §8-12.
**Business Value:** Recurring revenue from professional event organizers, distinct customer segment from individual hosts.

## 2. Current System State

- Nothing exists yet — this is entirely new scope. Depends on M9's `Plan`/`Payment` infrastructure existing first (subscription billing extends it rather than replacing it).
- **Explicitly last in build order.** Per `PLAN.md`: "Business tier is a fast-follow after individual MVP — scope it, don't build it first." Do not start until M1-M11 ship.

## 3. Scope & Boundaries

- IN SCOPE (once started):
  - Org/workspace model with multi-seat team access.
  - Multi-event dashboard (list/manage many events under one org).
  - Monthly subscription billing (Starter/Pro tiers per PLAN.md §4 — pricing still placeholder, `₱X/mo`, `₱Y/mo`).
  - Branding-removal option for Pro tier.
- DEFERRED (until this milestone starts):
  - DO NOT build anything here before M1-M11 are shipped and stable.
  - DO NOT finalize business-tier limits (events per plan, seat counts) — flagged as an open item in PLAN.md §9; needs a product decision first.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/business-tier`
- Target Branch Name: `feature/business-tier`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/business-tier.md` + `.docs/specs/app/business-tier.md`
per the template, written when this milestone is picked up — and only after
confirming scope/pricing decisions with the user, per PLAN.md §9's open items.
