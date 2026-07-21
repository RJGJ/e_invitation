# Milestone Spec: M6 — Guest List Management

## 1. Feature Overview

**Description:** Host-facing guest list: add guests individually or via import, remove guests, view RSVP status per guest, resend invites. Corresponds to design screen `08`.
**Business Value:** Hosts must be able to build and maintain their invite list; without it there's no one to send the reveal link to.

## 2. Current System State

- `api/`: `Guest` list exists from M3 (guest-submitted RSVP fields), but only guest-initiated mutations exist — host-side CRUD/import is new.
- `app/`: dashboard (M5) links here as a stub currently.

## 3. Scope & Boundaries

- IN SCOPE:
  - Host-scoped `Guest` CRUD mutations (add one, remove, bulk import from CSV/contacts), access-controlled to the event's owner.
  - Invite-link/token generation per guest (or shared per-event link — decide in the detailed spec).
  - Flutter guest list screen: rows with avatar/name/meta/status chip, add/import/remove actions.
- DEFERRED:
  - DO NOT build guest-side RSVP submission — that's M3, already done.
  - DO NOT build SMS/email delivery of invites — link generation only; delivery channel is a detailed-spec decision, may be deferred further.
  - DO NOT build org-level shared guest lists (M12).

## 5. Git & Version Control Rules

- Base Branch: `dev`
- Branch Naming Convention: `feature/guest-list`
- Target Branch Name: `feature/guest-list`
- Commit Standard: Conventional Commits, atomic per step, no AI-agent branding in messages.
- Final Action: push to remote and report the `git push` command used.

---
Full detail belongs in `.docs/specs/api/guest-list.md` + `.docs/specs/app/guest-list.md`
per the template, written when this milestone is picked up.
