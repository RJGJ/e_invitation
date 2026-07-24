# Implementation Plan: Nuxt + Capacitor Migration (Login + Design System)

## Context

The Flutter app (`app/`) has grown slow to iterate on locally. The user wants to move client development to the web (Nuxt), and ship the same app to iOS/Android by wrapping the built Nuxt SPA in Capacitor. Flutter is not being thrown away yet — `app/` will be renamed to `flutter/` and kept as-is (M1 event-creation work already lives on unmerged branches there); the new Nuxt client will live at `app/` going forward, following the same path convention the rest of this repo's specs/docs already assume (`app/lib/...` → `app/` becomes `app/pages`, `app/stores`, etc.).

This ticket ports exactly the two things already implemented and speced on the Flutter side — nothing more:

- **Login** (`.docs/specs/app/login.md` + `.docs/plans/app-login-plan.md`) — email/password auth against the existing JWT REST API, session persistence, auto-login, refresh-and-retry, logout.
- **Theme / "LuxeInvite" design system** (`.docs/specs/app/theme.md`) — the same color/typography/radius/spacing tokens, ported to Tailwind config + hand-rolled Vue components, instead of a Flutter `ThemeData`.

Stack: **Nuxt 3, Pinia, TypeScript, Tailwind CSS, Capacitor**. Package manager: **pnpm**. No UI kit — components are hand-rolled against the Tailwind tokens, matching the Flutter version's approach (no Material-alternative library either).

Everything else (event creation, event detail, templates, etc.) stays out of scope — those screens exist only as Flutter placeholders today and are not being ported in this ticket.

## Decisions carried over from the Flutter version (unchanged contracts)

These are reproduced from `.docs/specs/app/login.md` and `.docs/specs/app/theme.md` so this plan is self-contained; the API is not changing.

**Auth API contract** (`api/routes/auth.ts`, unchanged):
- `POST /api/auth/login` `{email, password}` → `200 {accessToken, refreshToken, user: {id, name, email}}` / `400 {error}` / `401 {error: "Invalid email or password"}` (enumeration-safe — never distinguish wrong-password vs unknown-email in the UI) / `500 {error}`
- `POST /api/auth/refresh` `{refreshToken}` → `200 {accessToken}` / `400` / `401 {error: "Invalid or expired refresh token"}`
- `POST /api/auth/logout` `{refreshToken}` → always `200 {success: true}`
- Access token: JWT, 24h expiry, `Authorization: Bearer <token>`. Refresh token: opaque, **single-device only** — a second login elsewhere invalidates this device's refresh token; a subsequent refresh 401s and must route to `/login`, not crash/retry.

**LuxeInvite tokens** (`.docs/specs/app/theme.md`, ported to Tailwind instead of `ThemeData`): Rich Emerald `primary` `#00492E`, Subtle Gold `secondary` `#735C00` / `secondaryContainer` `#FED65B`, Soft Cream `surface` `#FAF9F7`, plus the full color role set, Playfair Display (display/headline) + Montserrat (body/label) type scale, radius scale (`sm 2 / md 4 / lg 6 / xl 8 / xxl 12 / full 9999`), spacing (`unit 8 / gutter 24 / marginMobile 20 / marginDesktop 64 / containerMax 1200`). Full token values are in the source spec — Section 4 there is copied verbatim into the new spec doc, not re-derived.

## New gap this migration introduces: CORS

The Flutter app never went through a browser, so `api/keystone.ts` has zero CORS configuration today (verified — no `cors` usage anywhere in `api/`). A Nuxt dev server (`localhost:3000`) and a Capacitor webview (`capacitor://localhost` on iOS, `http://localhost` on Android) both need it. This is now in scope on the API side: add `cors` middleware in `extendExpressApp` (`api/keystone.ts:28`), allow-listing the Nuxt dev origin and the two Capacitor origins, credentials not required (auth is Bearer-token, not cookie-based).

## Status

Spec (`.docs/specs/app/nuxt-migration.md`) written and approved by the user. Implementing on branch `feature/nuxt-migration` (branched from `dev`).

## Implementation Steps

1. Copy this plan to `.docs/plans/nuxt-migration-plan.md` and commit it alongside the spec on `feature/nuxt-migration`.
2. `git mv app flutter` — rename the Flutter project directory. Update the one cross-reference in `masterplan/README.md` / `PROGRESS.md` that says `app/lib/...` if any exist (spot-check; don't rewrite historical spec docs under `.docs/specs/app/*.md` — those describe Flutter and stay accurate as history).
3. Scaffold new `app/` as a Nuxt 3 + TypeScript project: `pnpm dlx nuxi init app`, then `pnpm add pinia @pinia/nuxt`, `pnpm add -D tailwindcss @tailwindcss/vite` (or `@nuxtjs/tailwindcss` module — prefer the official Nuxt Tailwind module for zero-config content scanning), `pnpm add @capacitor/core @capacitor/preferences`, `pnpm add -D @capacitor/cli @capacitor/ios @capacitor/android`.
4. Configure `nuxt.config.ts`: `ssr: false` (Capacitor wraps a static SPA — same reasoning as any Capacitor+Nuxt app; no server exists on-device), register `@pinia/nuxt` and the Tailwind module, set `runtimeConfig.public.apiBaseUrl` sourced from `NUXT_PUBLIC_API_BASE_URL` (Nuxt's env-var convention, the equivalent of the Flutter version's `.env`/`AppConfig`).
5. `app/.env` (gitignored) / `app/.env.example` — `NUXT_PUBLIC_API_BASE_URL=http://localhost:3002` for web dev; Android emulator note (`10.0.2.2:3002`) carried over from the Flutter spec, documented in `.env.example` comments since Nuxt has no per-target env swap built in.
6. **Design tokens → Tailwind** (`app/tailwind.config.ts` or `app/assets/css/main.css` if using Tailwind v4 CSS-based config): translate `app_colors.dart`'s full color set into Tailwind theme colors under a `luxe` namespace (e.g. `luxe.primary`, `luxe.secondary`, `luxe.surface-container-high`, ...) — same names as the Dart constants, kebab/camel adjusted to Tailwind convention, same hex values, no reinterpretation. Register Playfair Display + Montserrat as `font-serif` / `font-sans` overrides. Radius/spacing become Tailwind `borderRadius`/`spacing` scale extensions (`rounded-md` = 4px etc., matching `AppRadius` positions from the theme spec exactly).
7. **Fonts**: self-host the same five `.ttf`/converted `.woff2` files (Playfair Display SemiBold/Bold, Montserrat Regular/Medium/SemiBold) under `app/public/fonts/`, declared via `@font-face` in `app/assets/css/main.css` — mirrors the Flutter spec's "bundled assets, not runtime CDN fetch" rationale (no flash-of-unstyled-text, no Google Fonts CDN dependency).
8. **Design system components** (`app/components/ui/`): `AppButton.vue`, `AppInput.vue`, `AppCard.vue` — Tailwind classes built from the tokens in step 6, matching the Flutter theme spec's component defaults (buttons/inputs: `rounded-md` primary-filled; cards: `rounded-xl`, 1px `secondary`-colored border, primary-tinted shadow, not black). Base typography scale (`display-lg`, `headline-md`, etc.) exposed as Tailwind utility classes (`text-display-lg`), since Tailwind's `fontSize` theme extension supports named line-height/letter-spacing pairs directly and needs no wrapper component.
9. **Auth types** (`app/types/auth.ts`): `User { id, name, email }`, a discriminated union for `AuthFailure` (`invalid-credentials | validation | network | server`, mirroring the Flutter `AuthFailure` sealed union so UI error-mapping stays exhaustive via a `switch`).
10. **Token storage** (`app/composables/useTokenStorage.ts` or `app/services/tokenStorage.ts`): wrap `@capacitor/preferences` (works in-browser via a web fallback during `nuxt dev`, and via native `UserDefaults`/`SharedPreferences` once wrapped by Capacitor) behind the same interface shape as the Flutter `TokenStorage` (`readAccessToken`, `readRefreshToken`, `readUser`, `writeSession`, `writeAccessToken`, `clear`).
    > Flag (carried over from the original spec's own caveat about Flutter's Keychain storage): `@capacitor/preferences` is not Keychain/Keystore-grade encrypted storage — it's plain persisted key-value storage. If stronger-than-`localStorage` guarantees are required later, swap in `capacitor-secure-storage-plugin` behind this same interface; not needed for this ticket's scope.
11. **API client** (`app/services/apiClient.ts`): `ofetch`/`$fetch` (Nuxt's built-in, no need for axios/ky) instance with a base URL from runtime config, an interceptor-equivalent (`onRequest`/`onResponseError` hooks) that (a) attaches `Authorization: Bearer <token>` to non-auth routes, (b) on a 401, performs exactly one deduplicated refresh-and-retry (port the Dio interceptor's single-flight logic — a plain in-flight `Promise` cache has the same effect in JS).
12. **Auth API wrapper** (`app/services/authApi.ts`): `login()`, `refresh()`, `logout()` — thin wrapper translating REST responses into `User`/tokens or a thrown `AuthFailure`, same mapping as `auth_api.dart`'s `_mapError`.
13. **Pinia auth store** (`app/stores/auth.ts`): state `'unknown' | {status:'authenticated', user} | 'unauthenticated'` (the union-typed equivalent of the Flutter `AuthState`), actions `login(email, password)`, `logout()`, `forceLogout()`, `tryAutoLogin()` — same behavior as `AuthNotifier`, including the "auto-login rehydrates the cached `User`, not just tokens, because the JWT has no `name` claim" fix already discovered on the Flutter side (`.docs/plans/app-login-plan.md`'s "User Review Required" note) — port that fix directly, don't rediscover it.
14. **Router guard** (Nuxt middleware, `app/middleware/auth.global.ts`): the equivalent of `router_provider.dart`'s `redirect` callback — reads the Pinia auth store, redirects `/` unknown→a loading state (Nuxt has no dedicated splash route pattern — a global loading guard is enough), unauthenticated→`/login`, authenticated-on-`/login`→`/`.
15. **Pages**: `app/pages/login.vue` (port `login_screen.dart`'s form: email/password fields, client-side validation — required + regex email check, required password — loading-disables-inputs, error banner mapped via the `AuthFailure` union, submit button), `app/pages/index.vue` (placeholder authenticated home: "Welcome, {user.name}" + logout button, same minimal scope as `home_screen.dart`).
16. **Capacitor**: `pnpm dlx cap init` (app id/name — ask user if not obvious from existing branding), `capacitor.config.ts` with `webDir: '.output/public'` (Nuxt's static build output dir), `pnpm dlx cap add ios && pnpm dlx cap add android` — scaffold only, no native build/run required for this ticket's acceptance criteria.
17. **API-side CORS** (`api/keystone.ts:28`, inside `extendExpressApp`, before the auth router mount): `npm install cors` (matching `api/`'s existing npm convention) in `api/`, `app.use(cors({ origin: [process.env.CORS_ORIGIN_DEV, 'capacitor://localhost', 'http://localhost'] }))`, add `CORS_ORIGIN_DEV=http://localhost:3000` to `api/.env` / `api/.env.example`.
18. **Tests**: Vitest + `@vue/test-utils` (Nuxt's standard test stack via `@nuxt/test-utils`) for the store/service logic — port the coverage from `app/test/services/auth_api_test.dart` and `app/test/providers/auth_provider_test.dart` 1:1 (login success, 401/400/500 mapping, auto-login fast-path with cached user, refresh failure → forced logout, single-device-logout 401 handling). Playwright for the login page E2E — port `login_flow_test.dart`'s scenarios (happy path, wrong password, restart-persists-session, logout-returns-to-login).
19. Manual verification: `pnpm dev` in `app/`, confirm login against a running local `api/` (seeded test user), confirm the design tokens render (Playfair headings, Montserrat body, emerald/gold palette, card border+shadow), confirm session survives a hard reload (auto-login), confirm logout redirects to `/login`.
20. Update `masterplan/README.md`/`PROGRESS.md` to note the stack change and the new `app/` = Nuxt convention (so future milestone specs written against "the app" aren't ambiguous about which codebase).
21. Push branch, per this repo's Git rule: conventional commits, atomic per step, no agent-name mentions in commit messages.

## Verification

- `cd app && pnpm test` (Vitest) and `pnpm exec playwright test` (E2E) pass.
- `cd api && npm test` still passes (CORS addition shouldn't break existing auth route tests).
- Manual: `pnpm dev` (Nuxt) + `npm run dev` (API) running together, full login/auto-login/logout cycle exercised in a real browser at `localhost:3000`, network tab confirms no CORS errors.
- `pnpm dlx cap sync` completes without error after `pnpm build` (confirms the Capacitor scaffold is wired to the correct `webDir`), even though a native run isn't required for acceptance.
