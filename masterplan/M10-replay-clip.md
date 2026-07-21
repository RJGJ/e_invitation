# Milestone Spec: M10 — Replay Clip

## 1. Feature Overview

**Description:** A short shareable video/GIF clip of the guest's reveal animation, generated after RSVP confirmation ("Get your replay clip" CTA), stays free per PLAN.md §3 as a growth driver. Corresponds to design screen `11`.
**Business Value:** Named explicitly in `PLAN.md` §3 as a growth/virality driver — free tier's "genuinely useful" hook that gets shared outside the platform (social media).

## 2. Current System State

- `app/`: reveal animations exist from M2; no capture/export mechanism yet.
- `api/`: no rendering/export service exists.

## 3. Scope & Boundaries

- **Open question to resolve in the detailed spec before implementation:** client-side capture (Flutter renders and exports a local video/GIF of the already-played animation) vs. server-side render (headless renderer replays the animation server-side and returns a file). Client-side is far cheaper and simpler; recommend defaulting to it unless there's a concrete reason server rendering is needed.
- IN SCOPE (assuming client-side default):
  - Trigger clip generation from the RSVP confirmation screen.
  - Shareable output (social-media-ready aspect ratio) + share sheet integration.
  - Storage of the generated clip (reuse `media-storage` infra) for re-sharing later.
- DEFERRED:
  - DO NOT build server-side rendering unless the detailed spec's open question resolves that way.
  - DO NOT gate this feature — PLAN.md §3 keeps it free; confirm with user before changing that in the detailed spec.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/replay-clip`
- Target Branch Name: `feature/replay-clip`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/app/replay-clip.md` (+ `.docs/specs/api/replay-clip.md`
if server rendering is chosen) per the template, written when this milestone is picked up.
