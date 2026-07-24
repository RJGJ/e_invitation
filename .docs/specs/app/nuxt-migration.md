# AI Feature Spec: Nuxt + Capacitor Migration (Login + Design System)

## 1. Feature Overview

**Description:** Migrate the client codebase from Flutter to Nuxt 3 + TypeScript + Pinia, packaged for native iOS/Android via Capacitor. This ticket ports exactly the two things already implemented and speced on the Flutter side — the JWT login flow and the "LuxeInvite" design system — to the new stack. Nothing else is ported.
**Business Value:** Flutter has become slow to iterate on locally. Moving primary development to the web (Nuxt) restores fast local iteration while still shipping to iOS/Android through Capacitor, without giving up the native app distribution model.

## 2. Current System State (Crucial)

- Existing Infrastructure: The Flutter client currently lives at `app/`. It has a complete, tested login flow (`.docs/specs/app/login.md`, `.docs/plans/app-login-plan.md`) and design system (`.docs/specs/app/theme.md`) — both fully implemented and merged. M1 (event creation) is also implemented on Flutter but sits on unmerged branches (`feature/event-creation`, `feature/app-media-event-models`, `feature/app-event-creation`) — out of scope here.
- Existing API: `api/` (KeystoneJS 6 + Express) has a fully implemented, unit-tested JWT auth REST API. No CORS middleware exists anywhere in `api/` today — the Flutter app never went through a browser, so this was never needed. It is needed now.
- Existing UI Components: None reusable across stacks — the Flutter design system (`app/lib/theme/*.dart`) is Dart/Flutter-specific and must be re-expressed as Tailwind config + Vue components, not directly reused.
- Directory convention going forward: `app/` (Flutter) is renamed to `flutter/` and kept as-is/dormant — not deleted, not actively developed further for now. The new Nuxt client takes over the `app/` path so existing repo-wide conventions (`masterplan/`, future spec docs) that say "the app" keep resolving to a live, current codebase.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Rename `app/` → `flutter/` (no code changes inside it beyond the rename).
  - Scaffold a new Nuxt 3 + TypeScript + Pinia + Tailwind project at `app/`.
  - Port the LuxeInvite design system (colors, typography, radius, spacing tokens) from `.docs/specs/app/theme.md` into Tailwind config + hand-rolled Vue components (`AppButton`, `AppInput`, `AppCard`).
  - Self-host the same five font files (Playfair Display, Montserrat) as static assets — no Google Fonts CDN dependency.
  - Port the login flow from `.docs/specs/app/login.md`: email/password form, client-side validation, secure-ish token storage, auto-login on startup, refresh-and-retry on 401, logout, a minimal placeholder authenticated home page.
  - Scaffold Capacitor (`cap init`, iOS + Android platform folders) — config only, no native build/run required for acceptance.
  - Add CORS support to the Keystone API so a browser-based (and Capacitor webview) client can call it.
- DEFERRED (Do NOT do this yet — saved for future tickets):
  - DO NOT port event creation, event detail, templates, or any other Flutter screen beyond login/home.
  - DO NOT delete `flutter/` — it stays in the tree as dormant reference/fallback.
  - DO NOT implement registration/signup or password reset (same deferral as the original login spec — the API doesn't support them yet either).
  - DO NOT build or run a native iOS/Android binary as part of this ticket — Capacitor scaffolding only.
  - DO NOT introduce a component/UI kit library (e.g. Nuxt UI) — components are hand-rolled against Tailwind tokens, matching the "no Material-alternative library" approach the Flutter version took.
  - DO NOT implement dark mode, Glassmorphism, or any DESIGN.md feature already deferred in `.docs/specs/app/theme.md` — those deferrals carry over unchanged.

## 4. Interfaces & Data Contracts

### Auth API (unchanged — `api/routes/auth.ts`)
- `POST /api/auth/login` `{email, password}` → `200 {accessToken, refreshToken, user: {id, name, email}}` / `400 {error}` / `401 {error: "Invalid email or password"}` (enumeration-safe) / `500 {error}`
- `POST /api/auth/refresh` `{refreshToken}` → `200 {accessToken}` / `400` / `401 {error: "Invalid or expired refresh token"}`
- `POST /api/auth/logout` `{refreshToken}` → always `200 {success: true}`
- Access token: JWT, 24h expiry, `Authorization: Bearer <token>`. Refresh token: opaque, **single-device only** — a second login elsewhere invalidates this device's refresh token; a subsequent refresh 401s and must route to `/login`.

### `User` (TypeScript)
```ts
interface User {
  id: string
  name: string
  email: string
}
```

### `AuthFailure` (TypeScript discriminated union, mirrors the Flutter `AuthFailure` sealed union)
```ts
type AuthFailure =
  | { kind: 'invalid-credentials' }
  | { kind: 'validation'; message: string }
  | { kind: 'network' }
  | { kind: 'server' }
```

### Auth store state (Pinia, mirrors the Flutter `AuthState` union)
```ts
type AuthState =
  | { status: 'unknown' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }
```

### LuxeInvite design tokens (verbatim values from `.docs/specs/app/theme.md` §4, ported to Tailwind instead of Flutter `ThemeData`)
- Colors: full Material-3-derived role set — `primary #00492E`, `onPrimary #FFFFFF`, `secondary #735C00`, `secondaryContainer #FED65B`, `surface #FAF9F7`, `onSurface #1A1C1B`, `error #BA1A1A`, plus the remaining `surfaceContainer*`, `outline*`, `tertiary*`, `*Fixed*` roles listed in the theme spec's `AppColors` class — copy every value, do not reinterpret or drop any (deprecated `background`/`onBackground`/`surfaceVariant` stay omitted, same as the Flutter version, since they duplicate other roles' hex values).
- Typography: Playfair Display (display/headline slots) + Montserrat (body/label/title slots), the same 14-slot scale (sizes/weights/line-heights/letter-spacing) documented in the theme spec's `AppTypography` table — including the interpolated slots DESIGN.md didn't define directly (`displayMedium/Small`, `titleLarge/Medium/Small`, `bodySmall`).
- Radius: `sm 2px / md 4px / lg 6px / xl 8px / xxl 12px / full 9999px` (same positional renaming from DESIGN.md's own `sm/DEFAULT/md/lg/xl/full` names, documented in the theme spec).
- Spacing: `unit 8 / gutter 24 / marginMobile 20 / marginDesktop 64 / containerMax 1200`.
- Component defaults: buttons/inputs use `radius.md` (4px); cards use `radius.xl` (8px), a 1px `secondary`-colored border, and a `primary`-tinted (15% opacity) shadow instead of a black one.

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` and ensure you pull latest changes first.
- Branch Naming Convention: `feature/[ticket-ID]-brief-description`
- Target Branch Name: `feature/nuxt-migration`
- Commit Standard: Use Conventional Commits. Commits must be atomic per step. CRITICAL: don't mention the AI agent name or brand used.
- Final Action: Push to remote and output the git push command used.

## 6. File Operations

- Rename: `app/` → `flutter/` (git mv, no content changes).
- Create (new `app/` = Nuxt project):
  - `app/nuxt.config.ts`, `app/tsconfig.json`, `app/package.json` — Nuxt 3 scaffold (`ssr: false`).
  - `app/.env` (gitignored), `app/.env.example` — `NUXT_PUBLIC_API_BASE_URL`.
  - `app/tailwind.config.ts` (or CSS-based Tailwind v4 config) — LuxeInvite tokens under a `luxe` namespace.
  - `app/assets/css/main.css` — `@font-face` declarations for the five self-hosted fonts.
  - `app/public/fonts/PlayfairDisplay-{SemiBold,Bold}.{woff2}`, `app/public/fonts/Montserrat-{Regular,Medium,SemiBold}.{woff2}`.
  - `app/components/ui/AppButton.vue`, `AppInput.vue`, `AppCard.vue`.
  - `app/types/auth.ts` — `User`, `AuthFailure`.
  - `app/services/tokenStorage.ts` — `@capacitor/preferences`-backed session storage.
  - `app/services/apiClient.ts` — `$fetch`-based client with bearer-token + single-flight refresh-and-retry interceptor logic.
  - `app/services/authApi.ts` — `login()`, `refresh()`, `logout()`.
  - `app/stores/auth.ts` — Pinia store (`login`, `logout`, `forceLogout`, `tryAutoLogin`).
  - `app/middleware/auth.global.ts` — route guard mirroring `router_provider.dart`'s redirect logic.
  - `app/pages/login.vue`, `app/pages/index.vue`.
  - `app/capacitor.config.ts`, `app/ios/`, `app/android/` (Capacitor scaffolds).
  - `app/tests/**` — Vitest unit tests; `app/e2e/**` — Playwright tests.
- Modify:
  - `api/keystone.ts` — add `cors` middleware in `extendExpressApp`.
  - `api/.env`, `api/.env.example` — add `CORS_ORIGIN_DEV`.
  - `api/package.json` — add `cors` dependency.
  - `masterplan/README.md`, `masterplan/PROGRESS.md` — note the stack change and that `app/` now means the Nuxt client.

## 7. Implementation Steps

See `.docs/plans/nuxt-migration-plan.md` (generated from this spec) for the full ordered implementation sequence.

## 8. Error Handling & Edge Cases

- CORS: allow-list only the known dev/Capacitor origins (`http://localhost:3000` for Nuxt dev, `capacitor://localhost` for iOS, `http://localhost` for Android) — no wildcard `origin: '*'`, since the API also serves authenticated requests.
- 401 on `/api/auth/refresh` itself, or a retry that's already been retried once, must not re-enter the refresh loop — same single-flight/no-double-retry guarantee as the Flutter Dio interceptor.
- `@capacitor/preferences` is not Keychain/Keystore-grade encrypted storage. Acceptable for this ticket's scope (matches "session persistence," not "defend against a compromised device"); flagged for a future ticket if stronger guarantees are needed.
- Same enumeration-safety and single-device-refresh-invalidation rules from the original login spec (Section 2 above) apply unchanged — do not add UI that distinguishes "wrong password" from "unknown email," and treat a refresh 401 as "logged out elsewhere," not a crash/silent retry.

## 9. Testing Requirements

**Project type:** Full-stack (API CORS change + UI)

### 9a. API-only (CORS change) → Unit Testing
- Existing `api/schema.test.ts`/auth tests must continue to pass unmodified after adding CORS middleware.

### 9b. Includes UI → End-to-End Testing (Playwright)
- Test Framework: Playwright.
- Test File Location: `app/e2e/login.spec.ts`.
- Coverage Required:
  - [ ] Happy path: valid login lands on the home page showing the user's name.
  - [ ] Wrong password shows the exact enumeration-safe error message.
  - [ ] Loading state disables the form while a login request is in flight.
  - [ ] Session survives a hard reload (auto-login).
  - [ ] Logout returns to `/login`.
- Do NOT: add visual regression/screenshot tests in this ticket.

Unit tests (Vitest, `app/tests/**`) cover the auth store and API client logic 1:1 with the Flutter test coverage (`auth_api_test.dart`, `auth_provider_test.dart`): login success, 400/401/500 error mapping, auto-login fast path with cached user, refresh failure forcing logout.

### 9c. Test Execution
- Command to run tests: `cd app && pnpm test` (Vitest) / `pnpm exec playwright test` (E2E); `cd api && npm test`.
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] `flutter/` exists (renamed from `app/`), untouched otherwise.
- [ ] `app/` is a working Nuxt 3 + TypeScript + Pinia + Tailwind project.
- [ ] Login works end-to-end against the local API: happy path, wrong-password path, auto-login after reload, logout.
- [ ] Every LuxeInvite color/typography/radius/spacing token from `.docs/specs/app/theme.md` is present in the Tailwind config with matching values.
- [ ] Fonts are self-hosted static assets, not a CDN dependency.
- [ ] Capacitor is scaffolded (`ios/`, `android/` folders, `capacitor.config.ts`) with the correct `webDir`.
- [ ] The Keystone API accepts cross-origin requests from the Nuxt dev origin and Capacitor origins, and rejects others.
- [ ] All tests defined in Section 9 pass.
- [ ] Code is pushed to `feature/nuxt-migration`.
