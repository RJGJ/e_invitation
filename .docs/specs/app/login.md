# AI Feature Spec: Login Pages (Flutter App)

## 1. Feature Overview

**Description:** Build a login screen in the Flutter client (`app/`) and wire it up to the already-implemented JWT REST auth API. This is the first real feature in the app — everything up to this point is the unmodified `flutter create` scaffold.
**Business Value:** The JWT auth API has no client consuming it yet. This unblocks the app to authenticate users and gives future screens (Post/Tag/User) a session to build on.

## 2. Current System State (Crucial)

- Existing Infrastructure: `app/` is an unmodified `flutter create` scaffold. `app/lib/` contains only the stock counter-demo `main.dart` (title "Flutter Demo", default deep-purple theme, no branding). `app/pubspec.yaml` has zero third-party dependencies beyond `cupertino_icons` and `flutter_lints` — no HTTP client, no state management, no routing package, no secure storage, no DI, no form/validation package. `app/test/` contains only the default `widget_test.dart` (counter smoke test). `app/integration_test/` does not exist. Dart SDK constraint `^3.12.2`.
- Existing API: The backend (`api/`, KeystoneJS 6 + Express) has a fully implemented and unit-tested JWT auth flow (`.docs/specs/api/jwt-auth.md`, `.docs/plans/jwt-auth-plan.md`). Dev server runs on `http://localhost:3002` (from `api/.env`'s `APP_PORT`).
- Existing API Contract (reproduced in full so this doc is self-contained):
  - `POST /api/auth/login` — body `{ email: string, password: string }`.
    - `200` → `{ accessToken: string (JWT), refreshToken: string (opaque hex), user: { id: string, name: string, email: string } }`
    - `400` → `{ error: string }` (missing email or password)
    - `401` → `{ error: "Invalid email or password" }` — **enumeration-safe**: this exact message is returned for both a wrong password and an unknown email. Do not build UI that distinguishes the two cases.
    - `500` → `{ error: string }`
  - `POST /api/auth/refresh` — body `{ refreshToken: string }`.
    - `200` → `{ accessToken: string }`
    - `400` → `{ error: string }` (missing refreshToken)
    - `401` → `{ error: "Invalid or expired refresh token" }`
  - `POST /api/auth/logout` — body `{ refreshToken: string }`.
    - Always `200` → `{ success: true }`, regardless of whether the token was valid — the API deliberately never reveals token validity here.
  - Access token: JWT, **24 hour** expiry, payload `{ sub, email, iat, exp }`. Used as `Authorization: Bearer <accessToken>` on subsequent authenticated calls (e.g. `/api/graphql`).
  - Refresh token: opaque random string, **single-device only** — the API stores exactly one refresh token per user, so logging in again on another device invalidates this device's refresh token. A subsequent `/api/auth/refresh` call from this device will then 401. The client must treat that as "you've been logged out elsewhere" and route to the login screen — not crash or retry silently.
- Existing UI Components: None — no design system, no reusable widgets exist yet.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Login screen: email/password form, client-side validation, loading state, error display.
  - Secure storage of access + refresh tokens on-device.
  - App-startup auto-login: skip the login screen if a valid (or silently-refreshable) session already exists.
  - Automatic refresh-and-retry on a 401 from any authenticated API call.
  - A minimal placeholder authenticated home screen (shows the logged-in user's name) with a logout button — included only because login needs somewhere to land and something to exercise `logout()`.
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT implement registration/signup.
  - DO NOT implement password reset / forgot password.
  - DO NOT build any GraphQL-backed data screens (Post/Tag/User lists, etc.) beyond the placeholder home screen described above.
  - DO NOT implement multi-device session handling beyond "redirect to login when a session is invalidated" — no UI for managing/viewing other active sessions.
  - DO NOT implement biometric login or a "remember me" toggle (secure storage is always persistent by default; there's no non-persistent mode to opt out of in this ticket).
  - DO NOT build any real app shell (navigation drawer, tabs, settings, etc.) around the placeholder home screen.

## 4. Interfaces & Data Contracts

- REST contracts: see Section 2 above (reproduced in full there).

- `User` (Dart, [freezed](https://pub.dev/packages/freezed) immutable data class with generated JSON parsing):

  ```dart
  @freezed
  class User with _$User {
    const factory User({
      required String id,
      required String name,
      required String email,
    }) = _User;

    factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  }
  ```

- `AuthFailure` (Dart, freezed sealed union, implements `Exception` so it can still be thrown/caught):

  ```dart
  @freezed
  sealed class AuthFailure with _$AuthFailure implements Exception {
    const factory AuthFailure.invalidCredentials() = InvalidCredentialsFailure;
    const factory AuthFailure.validation(String message) = ValidationFailure;
    const factory AuthFailure.network() = NetworkFailure;
    const factory AuthFailure.server() = ServerFailure;
  }
  ```

  This is the single source of truth for UI error-mapping (Section 8) — match exhaustively via `.when()`, not `is`-checks, so an unhandled variant is a compile error, not a silent gap.

- `AuthState` (Dart, freezed union — describes long-lived **session status** only, never in-flight login-attempt state):
  ```dart
  @freezed
  sealed class AuthState with _$AuthState {
    const factory AuthState.unknown() = _Unknown;               // startup, still checking
    const factory AuthState.authenticated(User user) = _Authenticated;
    const factory AuthState.unauthenticated() = _Unauthenticated;
  }
  ```
  In-flight login-attempt state (loading/error while the login button is being pressed) is intentionally kept out of `AuthState` and instead lives in a screen-local controller (see Section 7) driven by riverpod's built-in `AsyncValue` — `AuthState` should only ever contain the three states the router's redirect logic cares about.

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` and ensure you pull latest changes first.
- Branch Naming Convention: `feature/[ticket-ID]-brief-description`
- Target Branch Name: `feature/app-login`
- Commit Standard: Use Conventional Commits. Commits must be atomic per step. CRITICAL: don't mention the AI agent name or brand used.
- Final Action: Push to remote and output the git push command used.

## 6. File Operations

- Create:
  - `app/.env` (gitignored) — `API_BASE_URL=` for the running API instance (e.g. `http://10.0.2.2:3002` on an Android emulator, `http://localhost:3002` on an iOS simulator).
  - `app/.env.example` — checked-in placeholder mirroring `.env`.
  - `app/lib/config/app_config.dart` — reads `flutter_dotenv`, exposes `AppConfig.apiBaseUrl`.
  - `app/lib/models/user.dart`, `app/lib/models/auth_failure.dart` — freezed classes from Section 4 (plus their generated `*.freezed.dart`/`*.g.dart` files — commit generated output rather than gitignoring it, so a fresh clone doesn't need to run codegen before the app compiles).
  - `app/lib/services/token_storage.dart` — an abstract `TokenStorage` interface plus a `flutter_secure_storage`-backed implementation (Keychain/Keystore), so tests can substitute an in-memory fake.
  - `app/lib/services/api_client.dart` — a single shared `Dio` instance with two interceptors: one that attaches `Authorization: Bearer <accessToken>` to every outgoing request except `/api/auth/login` and `/api/auth/refresh`, and one that, on any `401`, performs exactly one refresh-and-retry (see Section 8) before giving up.
  - `app/lib/services/auth_api.dart` — thin wrapper exposing `login()`, `refresh()`, `logout()`, translating REST responses into `User`/tokens or a thrown `AuthFailure`.
  - `app/lib/providers/auth_state.dart` — the freezed `AuthState` union from Section 4 (plus generated file).
  - `app/lib/providers/auth_provider.dart` — a riverpod `NotifierProvider<AuthNotifier, AuthState>` exposing `login()`, `logout()`, `tryAutoLogin()`.
  - `app/lib/providers/login_controller_provider.dart` — a riverpod `AsyncNotifier<void>` that wraps a single login attempt in `AsyncValue` (loading/data/error), driving the login screen's UI without touching the global `AuthState` on failure.
  - `app/lib/providers/router_provider.dart` — a `Provider<GoRouter>` plus a small `ChangeNotifier` bridge (`ref.listen(authProvider, ...)` → `notifyListeners()`) so `go_router`'s `refreshListenable` reacts to riverpod state changes and redirects to `/login` from anywhere in the app when the session becomes unauthenticated.
  - `app/lib/screens/splash_screen.dart` — shown while `tryAutoLogin()` runs at startup.
  - `app/lib/screens/login_screen.dart` — the feature itself (see Section 8 for behavior).
  - `app/lib/screens/home_screen.dart` — minimal placeholder authenticated landing screen (`"Welcome, {user.name}"` + a logout button, nothing else).
  - `app/test/services/auth_api_test.dart`, `app/test/providers/auth_provider_test.dart`, `app/test/screens/login_screen_test.dart` — see Section 9.
  - `app/integration_test/login_flow_test.dart` — Patrol E2E, see Section 9.
- Modify:
  - `app/pubspec.yaml` — add dependencies: `dio`, `flutter_riverpod`, `go_router`, `flutter_secure_storage`, `flutter_dotenv`, `jwt_decoder`, `freezed_annotation`, `json_annotation`; dev dependencies: `mocktail`, `patrol`, `integration_test` (Flutter SDK package), `build_runner`, `freezed`, `json_serializable`. Declare `.env` as a bundled asset.
  - `app/.gitignore` — add `**/.env` (it currently does not ignore `.env` at all).
  - `app/lib/main.dart` — replace the stock counter app with `ProviderScope` + `MaterialApp.router`, wired to `router_provider`.
  - Delete `app/test/widget_test.dart` — the stock counter smoke test, no longer applicable once `main.dart` has no counter.

Folder structure is deliberately flat (`lib/config/`, `lib/models/`, `lib/services/`, `lib/providers/`, `lib/screens/`) — no `repositories/`, `di/` container, or `features/<name>/` module split. That level of structure is premature for a single screen; introduce it when the second and third real feature screens land and a repeated pattern becomes obvious.

## 7. Implementation Steps

1. Step 1: Checkout the new branch `feature/app-login` from `dev`.
2. Step 2: `cd app && flutter pub add dio flutter_riverpod go_router flutter_secure_storage flutter_dotenv jwt_decoder freezed_annotation json_annotation`.
3. Step 3: `cd app && flutter pub add --dev mocktail integration_test build_runner freezed json_serializable`.
4. Step 4: Add `app/.env` (gitignored) + `app/.env.example`; add `**/.env` to `app/.gitignore`; declare `.env` as an asset in `pubspec.yaml`.
5. Step 5: Create `lib/config/app_config.dart`.
6. Step 6: Create `lib/models/user.dart` and `lib/models/auth_failure.dart` (freezed), then run `dart run build_runner build --delete-conflicting-outputs` and commit the generated output.
7. Step 7: Create `lib/services/token_storage.dart`.
8. Step 8: Create `lib/services/api_client.dart` (Dio instance + the two interceptors from Section 8).
9. Step 9: Create `lib/services/auth_api.dart`.
10. Step 10: Create `lib/providers/auth_state.dart` (freezed union), run `build_runner` again, commit generated output.
11. Step 11: Create `lib/providers/auth_provider.dart` and `lib/providers/login_controller_provider.dart`.
12. Step 12: Create `lib/providers/router_provider.dart` (go_router + riverpod bridge).
13. Step 13: Create `lib/screens/splash_screen.dart`, `login_screen.dart`, `home_screen.dart`.
14. Step 14: Rewrite `lib/main.dart` (`ProviderScope`, `MaterialApp.router`); remove the stock counter code.
15. Step 15: Delete `test/widget_test.dart`.
16. Step 16: Add `test/services/auth_api_test.dart`, `test/providers/auth_provider_test.dart`, `test/screens/login_screen_test.dart` per Section 9; run `flutter test` and fix failures.
17. Step 17: `dart pub global activate patrol_cli`; run `patrol bootstrap` to scaffold native test runners (one-time setup, not just a pubspec add).
18. Step 18: Add `integration_test/login_flow_test.dart` per Section 9; run `patrol test` against a running local API with a seeded test user, and fix failures.
19. Step 19: Manual verification pass (Android emulator with `API_BASE_URL=http://10.0.2.2:3002`, iOS simulator with `http://localhost:3002`): confirm the wrong-password path, the happy path, that a successful login survives an app restart (auto-login), and that logout returns to the login screen.
20. Step 20: Push to remote and commit.

## 8. Error Handling & Edge Cases

- Client-side validation runs before any network call: empty email → `"Email is required"`; malformed email (basic regex) → `"Enter a valid email address"`; empty password → `"Password is required"`. No request is sent until all validators pass.
- While a login request is in flight: the submit button and both text fields are disabled, and a loading indicator is shown. Re-enabled on any terminal outcome.
- `AuthFailure.invalidCredentials()` (server 401) → display the server's exact string `"Invalid email or password"` verbatim. Never derive a different message per case (wrong password vs. unknown email look identical in the UI, matching the API's enumeration-safety guarantee).
- `AuthFailure.validation(message)` (server 400 — should not normally be reachable given client-side validation, but handled defensively) → generic `"Please check your email and password and try again."`
- `AuthFailure.server()` (500) or `AuthFailure.network()` (timeout, DNS failure, no connectivity, JSON parse failure) → generic `"Something went wrong. Please try again."` — never surface raw exception text or stack traces in the UI.
- App startup (auto-login), evaluated by `AuthNotifier.tryAutoLogin()`:
  1. No stored tokens → `AuthState.unauthenticated()` → router redirects to `/login`.
  2. A stored access token is present and not expired (checked locally by decoding its `exp` claim via `jwt_decoder` — no signature verification needed client-side, since the server re-validates on every real request anyway) → `AuthState.authenticated(user)` directly, no network call.
  3. Access token missing or expired, but a refresh token is stored → call `POST /api/auth/refresh` exactly once. Success → store the new access token, `AuthState.authenticated(user)`. Failure (401 — including the single-device "logged in elsewhere" case) → clear stored tokens, `AuthState.unauthenticated()` → `/login`. Must not crash or retry silently.
- Token refresh interceptor (in `api_client.dart`), on any `401` from an authenticated request:
  1. Skip retry if the failing request _was_ the `/api/auth/refresh` call itself, or has already been retried once — enforces exactly one refresh-and-retry, never a loop.
  2. Guard concurrent 401s behind a single in-flight refresh (e.g. a shared `Completer`) so several simultaneous requests share one `/refresh` call instead of each firing their own.
  3. Refresh success → persist the new access token, update `AuthState`, re-dispatch the original request with the new header.
  4. Refresh failure → clear stored tokens, flip `AuthState` to `unauthenticated()` (the router's redirect then sends the user to `/login` from wherever they were), and reject the original error.
- Logout: calls `AuthApi.logout()` best-effort (the API always returns 200 per its contract, so failures here are ignored), then unconditionally clears `TokenStorage` and flips `AuthState` to `unauthenticated()` regardless of the network call's outcome.
- If the `User` associated with a stored session is deleted server-side: the next authenticated call 401s, the refresh attempt also fails (the deleted user's refresh token no longer matches anything), and the client falls back to the same "logged out elsewhere" path above — no special-case handling needed.

## 9. Testing Requirements

**Project type:** Full-stack (Flutter UI consuming an already-implemented, already-tested API)

### 9a. Unit/Widget Testing

- Test Framework: `flutter_test` (built-in) + `mocktail` for mocking (no mocking package exists in `app/` yet — this introduces the convention).
- Test File Location: `app/test/`, mirroring the `lib/` structure (`test/services/`, `test/providers/`, `test/screens/`).
- Coverage Required:
  - [ ] `test/services/auth_api_test.dart`: `login()` happy path parses `User` + both tokens from a mocked `200` response; a mocked `401` maps to `AuthFailure.invalidCredentials()`; a mocked `400` maps to `AuthFailure.validation(message)`; a mocked `500` maps to `AuthFailure.server()`; a mocked timeout/no-connectivity `DioException` maps to `AuthFailure.network()`; `refresh()` happy path returns a new access token, a mocked `401` throws the appropriate failure; `logout()` never throws even when the mocked response is non-200. Assert failures via freezed's generated equality (`expect(failure, const AuthFailure.invalidCredentials())`), not `isA<T>()` type checks. HTTP layer fully mocked — no real network calls.
  - [ ] `test/providers/auth_provider_test.dart`: `login()` success sets `AuthState.authenticated(user)` and persists both tokens via a fake `TokenStorage`; each `login()` failure type leaves `AuthState` at `unauthenticated()`/unchanged and does not persist tokens; `tryAutoLogin()` covers all four cases from Section 8 (no tokens / valid non-expired token / expired token + successful refresh / expired token + failed refresh); `logout()` clears storage and state even when the mocked `AuthApi.logout()` call throws.
  - [ ] `test/screens/login_screen_test.dart`: renders the email field, password field, and submit button; tapping submit with empty fields shows the validation messages and does not call `login()`; tapping submit with a malformed email shows its message and does not call `login()`; tapping submit with valid input calls `login(email, password)` exactly once; while the call is pending (`AsyncLoading` on the login controller), the submit button is disabled and a loading indicator is visible; each `AuthFailure` variant renders its Section-8-mapped message via the controller's `AsyncError`. Add `Key`s to the email field (`login_email_field`), password field (`login_password_field`), submit button (`login_submit_button`), and error banner (`login_error_banner`) — required both for these tests and for Patrol selectors below. Navigation on success is left to the E2E test rather than asserted here (asserting `go_router` redirects in a pure widget test is comparatively brittle).
  - [ ] Edge cases from Section 8 above are each covered by a dedicated test case.
  - [ ] External calls (the Dio-backed HTTP layer, secure storage) are mocked, not hit live.
- Do NOT: write integration tests that spin up a real API/database in this ticket — that's what the Patrol suite below is for.

### 9b. End-to-End Testing (Patrol)

- Test Framework: **Patrol** (this repo's Flutter UI — Playwright doesn't apply here, per `.docs/specs/template.md`'s Flutter branch).
- Test File Location: `app/integration_test/login_flow_test.dart`.
- Coverage Required:
  - [ ] Happy path: launch the app with no stored session → lands on the login screen → enter a known-valid seeded test user's email/password → tap submit → lands on `HomeScreen` showing the user's name.
  - [ ] Wrong-password path: enter a valid email with an incorrect password → tap submit → the `login_error_banner` Key shows `"Invalid email or password"` and the app remains on the login screen.
  - [ ] Component renders correctly using the `Key`s defined in 9a rather than brittle selectors.
- Do NOT: add a screenshot/visual-regression test or an offline/airplane-mode test in this ticket.

### 9c. Test Execution

- Command to run tests: `cd app && flutter test` (unit/widget) / `cd app && patrol test` (E2E).
- Environment precondition for 9b: `patrol test` drives the _real_ compiled app against the _real_ running API (dev DB), not a mock — this requires the API running locally at the configured `API_BASE_URL` and a known seeded test user to exist in its database. This is a meaningful deviation from the fully-mocked unit tests in 9a and must be satisfied manually (or by a CI setup step) before running Patrol; this ticket does not build a seeding script.
- `patrol_cli` must be activated globally (`dart pub global activate patrol_cli`) and `patrol bootstrap` run once to scaffold native Android/iOS test runners before `patrol test` will work.
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] The code is pushed to the remote branch `feature/app-login`.
- [ ] Launching the app with no stored session lands on the login screen (not the placeholder home screen).
- [ ] Valid credentials land on the placeholder home screen showing the logged-in user's name, and the session persists across an app restart (auto-login).
- [ ] Invalid credentials show the exact message `"Invalid email or password"` and the app remains on the login screen.
- [ ] An expired access token with a still-valid refresh token triggers a transparent silent refresh with no visible interruption to the user.
- [ ] An invalidated refresh token (simulated by logging in again from a second session) routes the app back to `/login` on its next authenticated call, rather than crashing.
- [ ] Logout clears the stored session and returns the app to the login screen.
- [ ] All tests defined in Section 9 pass.
