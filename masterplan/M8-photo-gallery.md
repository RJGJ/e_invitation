# Milestone Spec: M8 — Photo Gallery (Premium)

## 1. Feature Overview

**Description:** Shared guest photo gallery per event — guests upload, host and guests view/download, capped at 2GB storage per event. Corresponds to design screen `10`. Premium-gated feature (PLAN.md §3).
**Business Value:** Primary premium feature named in `PLAN.md` — the main thing hosts pay for beyond the free reveal+RSVP.

## 2. Current System State

- `api/`: `.docs/specs/api/media-storage.md` already covers `Media` storage fundamentals and `Event.coverImage`/`gallery` relations. This milestone extends that to guest-uploaded (not just host-uploaded) media, with a per-event quota.
- Entitlement model does not exist yet (M9) — build the gallery itself now, but wire the actual lock/unlock check to a stub boolean until M9 lands, then swap.

## 3. Scope & Boundaries

- IN SCOPE:
  - Guest-facing upload mutation (access-controlled to invited guests of the event) writing into the existing `Media`/`Event.gallery` relation.
  - 2GB-per-event quota enforcement + usage meter query.
  - Flutter gallery tab: grid view, upload, per-photo download.
  - `FeatureLockOverlay` UI treatment when gated (stub entitlement check for now).
- DEFERRED:
  - DO NOT build the real entitlement/plan check (M9) — use a stub.
  - DO NOT build storage top-up purchase flow (PLAN.md §3 "offer a top-up later") — out of scope for v1.
  - DO NOT build photo moderation/reporting tools.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/photo-gallery`
- Target Branch Name: `feature/photo-gallery`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/photo-gallery.md` + `.docs/specs/app/photo-gallery.md`
per the template, written when this milestone is picked up.
