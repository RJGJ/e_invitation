# Masterplan — Emerald & Co. Invitation Platform

Source design: claude.ai/design project `184776f7-9e8f-43b4-8c17-c6896568e468`
(`Invitation Platform.dc.html`, `PLAN.md`, `DESIGN_SYSTEM.md`).

This folder holds one condensed spec per development milestone for the
remaining build, plus [`PROGRESS.md`](PROGRESS.md) tracking where the whole
project is at. Full-depth specs (matching `.docs/specs/api/event-model.md`'s
rigor) now exist under `.docs/specs/api/` and `.docs/specs/app/` for every
milestone below — see each milestone's linked file for its exact spec paths.
Before implementation, run each through the repo's standing workflow (see root
`CLAUDE.md`): review the spec(s) with the user, generate
`.docs/plans/<feature>-plan.md`, review that, then implement on the branch
the spec names.

## Already done (not respecced here)

| Area | Spec | Plan |
|---|---|---|
| JWT auth | `.docs/specs/api/jwt-auth.md` | `.docs/plans/jwt-auth-plan.md` |
| Login | `.docs/specs/app/login.md` | `.docs/plans/app-login-plan.md` |
| Theme (Flutter design tokens) | `.docs/specs/app/theme.md` | `.docs/plans/app-theme-plan.md` |
| Event model | `.docs/specs/api/event-model.md`, `.docs/specs/app/media-event-models.md` | `.docs/plans/event-model-plan.md` |
| Media storage | `.docs/specs/api/media-storage.md` | `.docs/plans/media-storage-plan.md` |

## Milestones (build order)

| # | Milestone | Screens | Touches | Status |
|---|---|---|---|---|
| M1 | [Event creation flow](M1-event-creation.md) | 00b | api + app | Not started |
| M2 | [Reveal experiences](M2-reveal-experiences.md) | 01, 02, 03 | app | Not started |
| M3 | [RSVP flow](M3-rsvp-flow.md) | 04 | api + app | Not started |
| M4 | [Event details page](M4-event-details.md) | 05 | api + app | Not started |
| M5 | [Host dashboard](M5-host-dashboard.md) | 06 (+ 00 hosting tab) | app | Not started |
| M6 | [Guest list management](M6-guest-list.md) | 08 | api + app | Not started |
| M7 | [RSVP form editor + paywall gating](M7-event-editor.md) | 09 | api + app | Not started |
| M8 | [Photo gallery (premium)](M8-photo-gallery.md) | 10 | api + app | Not started |
| M9 | [Monetization & entitlements](M9-monetization.md) | 07 | api + app | Not started |
| M10 | [Replay clip](M10-replay-clip.md) | 11 | api + app | Not started |
| M11 | [Lite fallback & public web invitation](M11-lite-fallback.md) | 12 | api (+ thin web) | Not started |
| M12 | [Business tier (fast-follow)](M12-business-tier.md) | — | api + app | Not started |

## Dependencies

```
M1 (create) ─▶ M2 (reveals) ─▶ M3 (RSVP) ─▶ M4 (details)
                                   │              │
                                   ▼              ▼
                              M6 (guest list) ◀── M5 (dashboard)
                                   │
                                   ▼
                              M7 (details editor)
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              M8 (gallery)   M9 (monetization)  M10 (replay clip)
                                   │
                                   ▼
                          M11 (lite fallback)
                                   │
                                   ▼
                          M12 (business tier — fast-follow, last)
```

M8, M9, M10 gate their features behind M9's entitlement model conceptually,
but M9 (the model + paywall UI) can be built in parallel with M8/M10 as long
as gating is stubbed until M9 lands.

## Notes

- Retention/billing-history background jobs (`PLAN.md` §6) are a subsection
  of M9, not a separate milestone — they're policy/cron on top of the
  Payment/Entitlement model.
- M12 is explicitly scoped last. Don't start it before M1-M11 (individual-host
  MVP) ship.
