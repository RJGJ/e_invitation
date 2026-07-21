# Milestone Spec: M4 — Event Details Page

## 1. Feature Overview

**Description:** Guest-facing details page — hero, ceremony/reception cards, map, schedule timeline, dress code, gifts/registry links — reached from the reveal screen's "View event details" CTA. Corresponds to design screen `05`.
**Business Value:** Gives guests everything they need (when/where/what to wear/what to bring) without contacting the host directly.

## 2. Current System State

- `api/`: `Event` list exists with cover/gallery media; no schedule/venue/registry fields yet.
- `app/`: no details screen yet. Reveal screens (M2) will link here.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Event` schema additions: venue/map coordinates, ceremony/reception (or equivalent) time blocks, schedule items (ordered list of time+label), dress-code text + palette, registry links.
  - Read-only guest-facing details screen with Details/Schedule/Gallery tabs (Gallery tab itself is M8 — here it's just a locked/empty placeholder tab).
- DEFERRED:
  - DO NOT build the host-side editor for these fields (M7) — this milestone is read-only, seed data via API console/seed script for now.
  - DO NOT build the actual gallery tab content (M8).
  - DO NOT implement the "Open in Maps" deep link resolution beyond a plain URL — no in-app map rendering required.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/event-details`
- Target Branch Name: `feature/event-details`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/event-details.md` + `.docs/specs/app/event-details.md`
per the template, written when this milestone is picked up.
