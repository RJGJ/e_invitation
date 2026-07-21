# Milestone Spec: M11 — Lite Fallback & Public Web Invitation

## 1. Feature Overview

**Description:** Two related low-bandwidth guest experiences: (a) an in-app static "Lite mode" fallback card shown instead of the animated reveal when bandwidth/reduced-motion demands it, and (b) a public, no-app-required web view of the invitation (invite + reveal + Yes/No RSVP + app-download footer) per `DESIGN_SYSTEM.md` §10. Corresponds to design screen `12`.
**Business Value:** PH-first, low-bandwidth requirement (DESIGN_SYSTEM.md §0.4) — guests on slow connections or without the app must still get a usable invite; the web view is also a distribution/growth surface (link works for anyone, app-download is the upsell).

## 2. Current System State

- `app/`: reveal screens (M2) exist; no static LiteCard widget yet.
- No public (non-Flutter, browser-accessible) surface exists in `api/` yet — this is new infrastructure, likely a server-rendered or lightweight static route in `api/routes/`.

## 3. Scope & Boundaries

- IN SCOPE:
  - `LiteCard` Flutter widget (per DESIGN_SYSTEM.md §7): static reveal fallback used when reduced-motion or a load-budget threshold is exceeded.
  - Public web invitation route: server-rendered page showing invite details + reveal (static or lightly animated) + Yes/No + count RSVP only (custom questions require the app, per DESIGN_SYSTEM.md §10) + app-download footer.
- DEFERRED:
  - DO NOT build custom RSVP questions in the web view — app-only per design system.
  - DO NOT build the photo gallery in the web view.
  - DO NOT build offline/PWA support — out of scope unless requested later.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/lite-fallback`
- Target Branch Name: `feature/lite-fallback`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/public-web-invite.md` + `.docs/specs/app/lite-fallback.md`
per the template, written when this milestone is picked up.
