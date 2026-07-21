# Implementation Plan: M1 — Event Creation Flow

## Context

`.docs/specs/api/event-creation.md` and `.docs/specs/app/event-creation.md` are written and cover M1 from `masterplan/README.md`: the host picks an event type then a template, creating a draft `Event`. This is the first milestone in the masterplan's dependency graph — everything else (reveals, RSVP, dashboard) depends on an `Event` existing.

Two things confirmed directly against the repo just now:
- `api/schema.ts` has `User`/`Post`/`Tag`/`Media`/`Event` lists only — no `Template` list, no `extendGraphqlSchema` config in `api/keystone.ts` (M1's api spec needs none — a plain list + relationship, no custom mutation).
- `app/lib/{models,services,providers}` has no `Event`/`Media`/`Template` model, no GraphQL client, no `graphQLClientProvider` — `.docs/specs/app/media-event-models.md` (a prerequisite spec, already written, already reviewed per `masterplan/PROGRESS.md`) is fully unimplemented. `app/pubspec.yaml` confirms: `freezed`/`json_serializable`/`build_runner` are present (so Freezed codegen works today), but `graphql_flutter` is not yet a dependency. The M1 app spec explicitly calls this out as a hard dependency to build first (Section 2/Step 2).

So this plan has three sequential phases, each its own branch/PR, in this order:

1. **`feature/event-creation`** (api) — `Template` list. Independent of the app work; can happen any time.
2. **`feature/app-media-event-models`** (app) — the prerequisite: `Media`/`Event` Freezed models, `graphQLClientProvider`, `eventsProvider`. Implements the already-reviewed `.docs/specs/app/media-event-models.md` spec verbatim (not re-speccing it here — following the existing document).
3. **`feature/app-event-creation`** (app) — branches off `dev` only after #2 is merged. `Template` model, `templatesForTypeProvider`, `event_creation_provider`, `create_event_screen.dart`, routing.

Phase 1 and phase 2 can happen in parallel (different branches, no file overlap); phase 3 requires phase 2 merged (needs `graphQLClientProvider`/`Event` model) and benefits from phase 1 being merged too (needs a real `Template` id to create against during manual verification), though phase 3's code itself only needs phase 1's GraphQL schema to exist on whatever API instance it's tested against, not phase 1's branch merged to `dev` first.

## Phase 1 — api: `Template` list (`feature/event-creation`)

Reuses the exact `Media`/`Event` access-control template already in `api/schema.ts` (`access.operation`/`access.filter` split, `deletedAt`-style soft-delete convention — except `Template` has no soft-delete per its spec, just an `isActive` filter).

1. `git checkout dev && git pull && git checkout -b feature/event-creation`.
2. In `api/schema.ts`, add a `Template` list (after `Event`, following the file's existing list order) with `access`/`fields` exactly as specified in `.docs/specs/api/event-creation.md` Section 4: `name`/`type`(`select`, same 3 options as `Event.type`)/`motif`/`accentHex` (`text`)/`isActive` (`checkbox`, default `true`)/`createdAt`, admin-only writes, public query filtered to `isActive: true`.
3. Add `template: relationship({ ref: 'Template.templateOfEvents', many: false })` to `Event.fields`; add `templateOfEvents: relationship({ ref: 'Event.template', many: true })` to `Template.fields`.
4. Run `keystone dev` (or this repo's existing migration command, same non-interactive `yes |`-piped background pattern used for the `Event` migration per `.docs/plans/event-model-plan.md` Step 7) to generate the `Template` table + `Event.template` column. Kill the dev server's actual listening PID afterward.
5. Create `api/lib/seed-templates.ts`: a small script using `getContext`/`context.sudo().query.Template.createOne` to insert 1-2 rows per event type (e.g. wedding "Classic Gold" `#C9A24B` motif `wax-seal`, baptism "Powder Blue" `#7FA0B0` motif `candle`, birthday "Coral Pop" `#F2996F` motif `balloons` — matching `DESIGN_SYSTEM.md` §1.2's accent table). Run it against the dev database.
6. Extend `api/schema.test.ts` with `Template` access-control tests per the spec's Section 9 (mirrors the existing `Event`/`Media` `describe` block structure: query-is-public-and-filtered, admin-only write, non-admin/anonymous denied) plus a test that `Event.template` connects to and resolves from an existing `Template`.
7. `cd api && npx vitest run` and `npx tsc --noEmit` — confirm everything passes, no new type errors.
8. Commit atomically (schema+relationship, then seed script, then tests) — Conventional Commits, no AI-agent mentions. Check whether `api/schema.prisma`/`api/schema.graphql` are git-tracked (per `.docs/plans/event-model-plan.md`'s precedent, they likely are) and include them in the schema commit if so.
9. `git push -u origin feature/event-creation`.

## Phase 2 — app: media/event models prerequisite (`feature/app-media-event-models`)

Implements `.docs/specs/app/media-event-models.md` as written (already reviewed) — summarized here for this plan's execution, not re-decided:

1. `git checkout dev && git pull && git checkout -b feature/app-media-event-models`.
2. Add `graphql_flutter` to `app/pubspec.yaml` dependencies; `flutter pub get`.
3. Create `app/lib/models/media.dart` (`Media`/`MediaImage` Freezed models) and `app/lib/models/event.dart` (`Event` Freezed model + `EventType` enum: `wedding`/`birthday`/`baptism`) per the spec's Section 4 exactly. Run `dart run build_runner build` to generate `.freezed.dart`/`.g.dart` parts.
4. Create `app/lib/services/graphql_client.dart`: `graphQLClientProvider` — `HttpLink` at the API's `/api/graphql` (via `appConfigProvider`'s `apiBaseUrl`, the same config `dioProvider` already uses in `app/lib/services/api_client.dart`) composed with an auth link reading `tokenStorageProvider`'s access token, mirroring `dioProvider`'s `Authorization: Bearer` interceptor pattern — do not build a second token-reading mechanism.
5. Create `app/lib/providers/event_provider.dart`: `eventsProvider` (`FutureProvider<List<Event>>`) running the `GetEvents` query from the spec's Section 4.
6. Write unit tests: `app/test/models/media_test.dart`, `app/test/models/event_test.dart` (fromJson/toJson round-trips), `app/test/providers/event_provider_test.dart` (mocked GraphQL client).
7. `cd app && flutter test` — all pass.
8. Manually verify against a running local API (`cd api && npm run dev`) — confirm `eventsProvider` fetches real data, then stop the API server (actual listening PID, not the shell wrapper).
9. Commit atomically (dependency bump, then models, then client, then provider, then tests) and push: `git push -u origin feature/app-media-event-models`.

## Phase 3 — app: create-event flow (`feature/app-event-creation`)

1. `git checkout dev && git pull` (pull in phase 2's merge) `&& git checkout -b feature/app-event-creation`. If phase 2 isn't merged to `dev` yet, branch from `feature/app-media-event-models` instead and rebase once it lands — do not duplicate `graphQLClientProvider`.
2. Create `app/lib/models/template.dart` (`Template` Freezed model, reusing `EventType` from `event.dart`) per the app spec's Section 4. Run codegen.
3. Create `app/lib/providers/template_provider.dart`: `templatesForTypeProvider` family provider running the `GetTemplates` query, filtered by `type`+`isActive`.
4. Create `app/lib/providers/event_creation_provider.dart`: `EventCreationState` (Freezed: `selectedType`, `selectedTemplateId`, `isSubmitting`, `errorMessage`) + a notifier with `selectType()`/`selectTemplate()`/`createEvent()` running the `CreateEvent` mutation from the spec's Section 4 (placeholder `title` like `"Untitled ${type}"`).
5. Create `app/lib/screens/create_event_screen.dart`: type-tab row (wedding/birthday/baptism, `Theme.of(context)` tokens per `EmeraldEventColors`-equivalent or existing `AppColors` — no hard-coded hex), 2-column template grid (`GridView.count(crossAxisCount: 2)`) with a check mark on the selected card, Continue button pinned to the bottom, disabled until both a type and template are picked.
6. Add `/create-event` route to `app/lib/providers/router_provider.dart`. Add a "＋ Create an event" button to `app/lib/widgets/views/home_view.dart` (M5's dashboard hasn't landed yet, so this ticket adds the entry point directly there, per the spec's Section 6 fallback instruction) wired to `context.push('/create-event')`.
7. On successful `createEvent()`, navigate to a placeholder stub route (e.g. `/events/:eventId` showing just the created event's id/title — M5 replaces this later).
8. Write tests: `app/test/models/template_test.dart`, `app/test/providers/event_creation_provider_test.dart` (unit, mocked client); `app/integration_test/create_event_test.dart` (Patrol — happy path, disabled-Continue state, error state, loading state per the spec's Section 9).
9. `cd app && flutter test` then `cd app && patrol test` — all pass.
10. Manually verify end-to-end against a running local API with phase 1's seeded templates: pick a type, pick a template, tap Continue, confirm the `Event` is created with the right `type`/`template` connected. Stop the API server afterward.
11. Commit atomically (models, then providers, then screen, then routing, then tests) and push: `git push -u origin feature/app-event-creation`.

## Verification

1. **Phase 1:** `cd api && npx vitest run && npx tsc --noEmit` pass; `api/schema.graphql` has `Template`, `TemplateWhereInput`, etc.; seeded templates are queryable and filtered to `isActive: true` for anonymous callers.
2. **Phase 2:** `cd app && flutter test` passes; `eventsProvider` successfully round-trips against a live local API (manual check).
3. **Phase 3:** `cd app && flutter test && flutter analyze` pass; `patrol test` passes; manual walkthrough (Step 10 above) creates a real `Event` with the correct `type`/`template`.
4. Kill any dev server process started during verification (actual listening PID, not the shell wrapper) — per this repo's `CLAUDE.md` "Dev servers" rule.
5. Update `masterplan/PROGRESS.md`'s M1 row (Plan written ✅) once all three branches are pushed.

### Critical files

`api/schema.ts`, `api/schema.test.ts`, `api/lib/seed-templates.ts` · `app/lib/models/{media,event}.dart`, `app/lib/services/graphql_client.dart`, `app/lib/providers/event_provider.dart` · `app/lib/models/template.dart`, `app/lib/providers/{template_provider,event_creation_provider}.dart`, `app/lib/screens/create_event_screen.dart`, `app/lib/providers/router_provider.dart`, `app/lib/widgets/views/home_view.dart`
