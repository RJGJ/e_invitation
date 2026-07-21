# Milestone Spec: M3 — RSVP Flow

## 1. Feature Overview

**Description:** Guest-facing multi-step inline RSVP: accept/decline, party size, and (premium only) meal/dietary/song/note questions, ending in a confirmation screen. Corresponds to design screen `04`.
**Business Value:** Core conversion event for hosts (guest response data) and the first real feature gate between free and paid tiers (PLAN.md §3).

## 2. Current System State

- `api/`: no `Guest`/`RSVP` list exists yet. `Event` list exists with owner-scoped access.
- `app/`: no RSVP screen/provider yet.
- Entitlement/plan model does not exist yet (that's M9) — this milestone should gate premium questions behind a simple boolean/enum on `Event` for now (e.g. `Event.plan` placeholder field) and swap to the real entitlements model when M9 lands.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Guest` list (api): name/contact, invited-by-event relation, RSVP status, party size, and free-form answer fields (meal, dietary, song, note).
  - Guest-facing RSVP mutation(s), accessible via invite link/token (no login required for guests).
  - Flutter multi-step RSVP UI (accept/decline → party size + meal → dietary/song/note → confirmation), matching step-dot progress pattern in the design.
- DEFERRED:
  - DO NOT build the host-side guest list management UI (M6) — this milestone only handles a guest submitting their own RSVP.
  - DO NOT build real entitlement checks (M9) — stub the free/premium question gate.
  - DO NOT build the "Get your replay clip" export (M10) — the confirmation screen's CTA can be a stub link.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/rsvp-flow`
- Target Branch Name: `feature/rsvp-flow`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/rsvp-flow.md` + `.docs/specs/app/rsvp-flow.md`
per the template, written when this milestone is picked up.
