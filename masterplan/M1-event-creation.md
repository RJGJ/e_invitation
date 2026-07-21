# Milestone Spec: M1 — Event Creation Flow

## 1. Feature Overview

**Description:** Host-facing "Create an event" flow — pick an event type (wedding/baptism/birthday), then pick a starting template — that creates a draft `Event` record. Corresponds to design screen `00b · Create event`.
**Business Value:** Entry point for every host; nothing else in the platform exists until an `Event` is created. Unblocks M2-M9.

## 2. Current System State

- `api/`: `Event` list already exists (owner-scoped access control, per `de2b3e09`/`2bdaca8f`), with `coverImage`/`gallery` wired to `Media` (per `.docs/specs/api/event-model.md`).
- `app/`: theme tokens (`app/lib/theme/`), auth/login flow, and router provider exist. No create-event screen yet.
- No `Template` concept exists yet in the schema — this milestone introduces it.

## 3. Scope & Boundaries

- IN SCOPE:
  - `Template` list in Keystone (or a seeded static set if templates aren't user-editable in v1) keyed by `EventType`, holding whatever a template needs to render its reveal preview (accent, motif).
  - `Event.templateId` (or equivalent relationship) set at creation.
  - Type-picker + template-picker Flutter screens (screen 00b) that create a draft `Event` via existing/extended GraphQL mutations.
- DEFERRED:
  - DO NOT build the reveal animations themselves (M2).
  - DO NOT build the details editor (M7) — creation only sets type/template, not schedule/venue/etc.
  - DO NOT support custom/user-uploaded templates in v1.

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/event-creation`
- Target Branch Name: `feature/event-creation`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail (data contracts, error handling, test plan) belongs in a follow-up
spec at `.docs/specs/api/event-creation.md` + `.docs/specs/app/event-creation.md`
per `.docs/specs/template.md`, written when this milestone is picked up.
