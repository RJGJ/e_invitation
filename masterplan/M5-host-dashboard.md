# Milestone Spec: M5 — Host Dashboard

## 1. Feature Overview

**Description:** Authenticated host's "Home" screen — hosting vs. invited tabs, event cards with live stats (accepted/pending/photos), and a fuller per-event dashboard view. Corresponds to design screens `00` (Home) and `06` (Host dashboard).
**Business Value:** The host's daily-use surface once an event exists; primary retention loop for people running multiple events over time.

## 2. Current System State

- `api/`: `Event` list (owner-scoped) and `Guest`/RSVP data (from M3) will exist by this point.
- `app/`: login/auth flow exists; no home/dashboard screen yet.

## 3. Scope & Boundaries

- IN SCOPE:
  - Home screen: Hosting tab (event cards with stats) / Invited tab (events where the user is a guest, with their RSVP status).
  - Per-event host dashboard: aggregate stats (accepted/pending/declined counts, photo count once M8 exists — stub at 0 until then), quick links to guest list (M6) and editor (M7).
- DEFERRED:
  - DO NOT build guest list management itself (M6) — link out to a stub.
  - DO NOT build the details editor itself (M7) — link out to a stub.
  - DO NOT build org/multi-seat dashboards (M12).

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/host-dashboard`
- Target Branch Name: `feature/host-dashboard`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/app/host-dashboard.md` per the template,
written when this milestone is picked up.
