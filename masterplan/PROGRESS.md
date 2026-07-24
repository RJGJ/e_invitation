# Progress — Emerald & Co. Invitation Platform

One row per workstream. Columns follow this repo's standing workflow
(`CLAUDE.md`: spec → review → plan → review → implement).

Legend: ✅ done · ⬜ not yet

## Foundational (pre-masterplan)

| Workstream | Spec | Reviewed | Plan | Reviewed | Implemented |
|---|---|---|---|---|---|
| JWT auth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Theme (Flutter tokens) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Event model | ✅ | ✅ | ✅ | ✅ | ✅ |
| Media storage | ✅ | ✅ | ✅ | ✅ | ✅ |
| Media/Event Flutter models + GraphQL client | ✅ | ✅ | — | — | ⬜ *(specced, not yet built — see note below)* |

**Note:** `.docs/specs/app/media-event-models.md` is written but its files
(`flutter/lib/models/event.dart`, `media.dart`, `flutter/lib/services/graphql_client.dart`,
`flutter/lib/providers/event_provider.dart`) do not exist in `flutter/lib/` yet, verified
2026-07-21. Every app-side milestone below (M1-M11) depends on it — implement it
before or alongside M1.

**2026-07-24:** Client development moved to Nuxt 3 + Pinia + TypeScript
(`.docs/specs/app/nuxt-migration.md`, `.docs/plans/nuxt-migration-plan.md`).
The Flutter project was renamed `app/` → `flutter/` and kept as dormant
reference; `app/` now refers to the Nuxt client. M1's Flutter branches above
predate this move and are not affected, but future milestones build on Nuxt.

## Milestones (`masterplan/README.md` has the full dependency graph)

| # | Milestone | Spec written | Spec reviewed | Plan written | Plan reviewed | Implemented |
|---|---|---|---|---|---|---|
| M1 | Event creation flow | ✅ | ⬜ | ✅ | ⬜ | ⬜ |
| M2 | Reveal experiences | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M3 | RSVP flow | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M4 | Event details page | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M5 | Host dashboard | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M6 | Guest list management | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M7 | RSVP form editor + paywall | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M8 | Photo gallery (premium) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M9 | Monetization & entitlements | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M10 | Replay clip | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M11 | Lite fallback & public web invite | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| M12 | Business tier (fast-follow) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ *(do not start before M1-M11 ship)* |

Full specs (2026-07-21 pass): `.docs/specs/api/<slug>.md` + `.docs/specs/app/<slug>.md`
per milestone — see `masterplan/README.md`'s table for exact filenames. The
condensed `masterplan/M<n>-*.md` files remain the index-level summary.

## Next step

Pick a milestone (M1 recommended — everything else depends on it, alongside
the media-event-models gap above), review its spec(s) with the user, then run
the spec → plan step (`.docs/plans/<feature>-plan.md`) per `CLAUDE.md`.
