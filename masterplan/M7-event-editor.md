# Milestone Spec: M7 — RSVP Form Editor + Paywall Gating

## 1. Feature Overview

**Description:** Corrected from the original masterplan pass — design screen `09` is "Edit RSVP form", not a general event-details editor: a Free/Premium toggle where hosts enable/disable RSVP questions (meal, song, dietary, custom), with premium ones locked behind a `FeatureLockOverlay` and "Upgrade this event" CTA until the event is paid. Full spec: `.docs/specs/api/event-editor.md` + `.docs/specs/app/event-editor.md`.
**Business Value:** The primary in-product upsell moment (PLAN.md §5) — hosts see exactly what they're missing at the point they try to use it. (Schedule/venue/dress-code/registry editing, this milestone's original scope, needs no dedicated screen — those fields are edited via the standard `updateEvent` mutation `.docs/specs/api/event-details.md` (M4) already exposes.)

## 2. Current System State

- `api/`: `Event` schedule/venue/registry fields exist from M4, currently only settable via seed/console.
- `app/`: read-only details screen exists from M4; dashboard (M5) links here as a stub.

## 3. Scope & Boundaries

- IN SCOPE:
  - Owner-scoped `Event` update mutations covering all M4 fields.
  - Flutter editor forms mirroring the M4 read view, with save/publish state.
- DEFERRED:
  - DO NOT build template/type changes post-creation — event type is fixed at creation (M1).
  - DO NOT build the cover/gallery image upload UI here if `media-storage` spec already covers it — reuse, don't rebuild.
  - DO NOT build premium-only editor fields gating — that's addressed once M9 entitlements exist; until then all fields are editable in the editor (gating only affects the guest-facing RSVP questions, per PLAN.md §5).

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/event-editor`
- Target Branch Name: `feature/event-editor`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/event-editor.md` + `.docs/specs/app/event-editor.md`
per the template, written when this milestone is picked up.
