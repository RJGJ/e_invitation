# Milestone Spec: M2 — Reveal Experiences

## 1. Feature Overview

**Description:** Guest-facing animated reveal screens, one signature interaction per event type: wedding wax-seal/envelope, baptism candle-light, birthday balloon-pop. Corresponds to design screens `01`, `02`, `03`.
**Business Value:** The core "wow" moment that drives virality/sharing (PLAN.md §1 — free tier's job is to spread the invite). First thing a guest sees when opening a link.

## 2. Current System State

- `app/lib/theme/`: motion tokens are not yet defined — `DESIGN_SYSTEM.md` §4 specifies `motionMicro/Enter/Spring/Ambient` durations/curves; confirm these exist in the theme spec/plan before starting, add if missing.
- `Event` model (api) holds type + cover/gallery media already.
- No guest-facing (unauthenticated, link-based) screen route exists yet — this milestone likely needs a public/shareable route distinct from the authenticated host app shell.

## 3. Scope & Boundaries

- IN SCOPE:
  - Three `RevealController` strategies keyed by `EventType` (per DESIGN_SYSTEM.md §11): wedding, baptism, birthday.
  - Tap-to-reveal interaction, replay affordance, reduced-motion fallback (skip ambient loop, jump to revealed state).
  - Post-reveal CTA row: RSVP now / View details / app-download footer.
- DEFERRED:
  - DO NOT build the actual RSVP submission (M3) or details page (M4) — CTAs can route to stub screens.
  - DO NOT build the "Lite mode" static fallback screen (M11) — only respect reduced-motion within this screen.
  - DO NOT build the "Replay clip" shareable export (M10) — the in-screen "replay" tap just re-runs the local animation.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/reveal-experiences`
- Target Branch Name: `feature/reveal-experiences`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/app/reveal-experiences.md` per the template,
written when this milestone is picked up.
