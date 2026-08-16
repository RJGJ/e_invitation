# AI Feature Spec: Django Auth Integration

## 1. Feature Overview

**Description:** Update the Nuxt `app/` frontend's auth service layer (`apiClient.ts`, `authApi.ts`, `stores/auth.ts`, `types/auth.ts`) to speak the new Django API's auth contract (`djangorestframework-simplejwt` default endpoints) instead of the retired Keystone REST contract, and add a GraphQL `me` query call (via a new `graphql-request`-based client) to populate the user profile that the token endpoints no longer return inline.
**Business Value:** The API was migrated from KeystoneJS to Django (see `.docs/specs/api/django-migration.md`, `.docs/specs/api/group-authorization.md`) — the frontend's auth flow is currently broken against the new backend and must be updated before login works at all.

## 2. Current System State (Crucial)

- Existing Infrastructure: Nuxt 3 + Pinia + Capacitor app at `app/`, package manager **pnpm**. No GraphQL client of any kind exists anywhere in `app/` today.
- Existing Auth Flow: `app/app/services/apiClient.ts` (generic `$fetch` wrapper, dedup'd refresh-and-retry via module-level `refreshPromise`, `isAuthRoute()` path-matching), `app/app/services/authApi.ts` (`login`/`refresh`/`logout` + `mapError()`), `app/app/services/tokenStorage.ts` (Capacitor `Preferences`, keys `access_token`/`refresh_token`/`user`), `app/app/stores/auth.ts` (Pinia — `login`/`logout`/`forceLogout`/`tryAutoLogin`), `app/app/types/auth.ts` (`User`, `AuthFailure`, `AuthState`). All hard-code the old paths `/api/auth/login|refresh|logout` and response shape `{accessToken, refreshToken, user}`.
- Existing consumers: `app/app/pages/login.vue` (calls `authStore.login()`, maps `AuthFailure.kind` to display text), `app/app/pages/index.vue` (reads `authState.user.name`, calls `authStore.logout()`), `app/app/middleware/auth.global.ts` (route guard on `authState.status`, unaffected by contract shape).
- Existing JWT handling: `app/app/utils/jwt.ts`'s `isTokenExpired()` only reads the `exp` claim — compatible with simplejwt tokens as-is, no change needed.
- New Backend Contract (already implemented, merged to `dev`):
  - `POST /api/token/` — body `{email, password}` → `200 {access, refresh}` or `401 {detail: "No active account found with the given credentials"}`.
  - `POST /api/token/refresh/` — body `{refresh}` → `200 {access}` or `401 {detail: "..."}`.
  - `POST /api/token/blacklist/` — body `{refresh}` → `200 {}` (blacklisted) or `401` if already invalid.
  - `POST /graphql/` — `query { me { id name email groups } }` (requires `Authorization: Bearer <access>`; returns `null` for `me` if unauthenticated, never a GraphQL error for that case).
  - Field-validation errors (e.g. missing `email`/`password`) return `400` with DRF's default per-field array shape, e.g. `{"email": ["This field is required."]}` — different from the old bespoke `{error: "..."}` shape.
- Existing Tests: `app/tests/services/authApi.test.ts`, `app/tests/stores/auth.test.ts` (Vitest, mock `$fetch`/services), `app/e2e/login.spec.ts` (Playwright, mocks `**/api/auth/login`/`**/api/auth/logout` routes) — all assert the old contract.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Add `graphql-request` dependency (`pnpm add graphql-request`).
  - New `app/app/services/meApi.ts` — wraps a `graphql-request` `GraphQLClient` pointed at `${apiBaseUrl}/graphql/`, exposes `meApi.fetchMe(accessToken): Promise<User>` running the `me` query.
  - Update `apiClient.ts`: `isAuthRoute()` matches `/api/token/`; `refreshAccessToken()` posts `{refresh}` to `/api/token/refresh/`, reads `{access}` from the response.
  - Update `authApi.ts`: `login()` posts to `/api/token/` returning `{access, refresh}` only (no `user`); `refresh()` posts `{refresh}` to `/api/token/refresh/`, reads `{access}`; `logout()` posts `{refresh}` to `/api/token/blacklist/`; `mapError()` updated to read DRF's `{detail: "..."}` (simplejwt 401s) and per-field array validation errors (400s) instead of `{error: "..."}`.
  - Update `stores/auth.ts`: `login()` sequence becomes tokens (`authApi.login`) → user profile (`meApi.fetchMe(tokens.access)`) → only then `tokenStorage.writeSession(...)` + set `authState` — if `meApi.fetchMe` throws, nothing is persisted (tokens were only ever held in a local variable) and the error propagates to the caller exactly like a login failure today.
  - Update `types/auth.ts`: `User` gains `groups: string[]`; still no `isAdmin`.
  - Rewrite `app/tests/services/authApi.test.ts` for new paths/shapes; add `app/tests/services/meApi.test.ts`; rewrite `app/tests/stores/auth.test.ts`'s `login` tests to mock `meApi.fetchMe`; rewrite `app/e2e/login.spec.ts`'s route mocks (`**/api/token/`, `**/graphql/` for the `me` query, `**/api/token/blacklist/` for logout).
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT build a general-purpose GraphQL client/codegen setup — just the one hand-written `me` query, matching the backend's currently GraphQL-only-apart-from-auth scope.
  - DO NOT add UI that uses `groups` (e.g. admin-gated views) — just carry the field through the type/query so it's available when needed.
  - DO NOT change `tokenStorage.ts`'s storage mechanism or key names — `writeSession()`'s shape (`{accessToken, refreshToken, user}`) is unchanged, only what populates `user` changes upstream in the store.
  - DO NOT change `middleware/auth.global.ts` or `utils/jwt.ts` — neither depends on the response contract.

## 4. Interfaces & Data Contracts

- `authApi.login(email, password): Promise<{access: string; refresh: string}>`
- `authApi.refresh(refreshToken: string): Promise<string>` (returns the new access token, same public signature as today)
- `authApi.logout(refreshToken: string): Promise<void>` (best-effort, same as today)
- `meApi.fetchMe(accessToken: string): Promise<User>` — throws `{kind: 'server'} satisfies AuthFailure` if the query fails or returns `null` for `me` (shouldn't happen with a token freshly issued by `authApi.login`, but handled defensively)
- `types/auth.ts` (after):
  ```typescript
  export interface User {
    id: string
    name: string
    email: string
    groups: string[]
  }
  ```
- GraphQL query (in `meApi.ts`):
  ```graphql
  query Me {
    me {
      id
      name
      email
      groups
    }
  }
  ```
- `mapError()` (after) — reads DRF/simplejwt's actual error body shape:
  ```typescript
  function extractValidationMessage(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined
    const obj = data as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    }
    return undefined
  }
  ```
  Status mapping unchanged (401→invalid-credentials, 400→validation, 5xx→server, else→network), only the message-extraction logic changes.

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` (which already has `feature/api-group-authorization` merged in), pull latest first.
- Branch Naming Convention: `feature/app-django-auth-integration`
- Target Branch Name: `feature/app-django-auth-integration`
- Commit Standard: Conventional Commits, atomic per implementation step. Do NOT mention any AI agent/brand name in commit messages or docs.
- Final Action: Push to remote and output the `git push` command used. **Do not push without explicit user confirmation.**

## 6. File Operations

- Create:
  - `app/app/services/meApi.ts` - GraphQL `me` query client
  - `app/tests/services/meApi.test.ts` - unit tests for `meApi.fetchMe`
- Modify:
  - `app/package.json` - add `graphql-request` dependency
  - `app/app/services/apiClient.ts` - new endpoint paths, request/response key renames
  - `app/app/services/authApi.ts` - new endpoints, response shape, `mapError()` message extraction
  - `app/app/stores/auth.ts` - `login()` calls `meApi.fetchMe` before persisting
  - `app/app/types/auth.ts` - `User` gains `groups: string[]`
  - `app/tests/services/authApi.test.ts` - new paths/shapes
  - `app/tests/stores/auth.test.ts` - mock `meApi.fetchMe` in login tests
  - `app/e2e/login.spec.ts` - new route mocks incl. GraphQL `me`

## 7. Implementation Steps

1. Checkout `feature/app-django-auth-integration` from `dev`.
2. `cd app && pnpm add graphql-request`.
3. Create `app/app/services/meApi.ts`.
4. Update `app/app/types/auth.ts` (`User.groups`).
5. Update `app/app/services/apiClient.ts` (paths, request/response keys).
6. Update `app/app/services/authApi.ts` (endpoints, shapes, `mapError()`).
7. Update `app/app/stores/auth.ts` (`login()` sequencing).
8. Update `app/tests/services/authApi.test.ts`; create `app/tests/services/meApi.test.ts`.
9. Update `app/tests/stores/auth.test.ts`.
10. Update `app/e2e/login.spec.ts`.
11. Run `cd app && pnpm test`, fix failures.
12. Run `cd app && pnpm test:e2e`, fix failures.
13. Manually verify against the live Django dev server (see §10 acceptance criteria / verification).
14. Commit atomically per step, push only after user confirmation.

## 8. Error Handling & Edge Cases

- If `authApi.login` succeeds but `meApi.fetchMe` fails (network blip, server error): the whole `login()` action throws, no tokens are persisted (nothing was written to `tokenStorage` yet), `authState` stays `{status: 'unknown'}` — identical externally-observable failure behavior to today's bad-credentials case from the caller's (`login.vue`) point of view, it just displays the mapped `AuthFailure`.
- If `me` returns `null` despite a 200 response and a token that was just issued: treated as a `meApi.fetchMe` failure (defensive — shouldn't happen in practice).
- `authApi.refresh()`/`apiClient.ts`'s inline refresh-and-retry: unchanged behavior, only the wire shape changes (`{refresh}`→`{access}` instead of `{refreshToken}`→`{accessToken}`).
- `authApi.logout()`: still best-effort/swallows all errors, including simplejwt's `401` on an already-blacklisted/invalid token — consistent with today's "always treat logout as succeeding client-side" behavior.
- DRF 400 validation errors with multiple field errors: `extractValidationMessage` picks the first field's first message deterministically (`Object.values` iteration order = insertion order = however DRF serializes the fields, typically alphabetical) — acceptable since the UI only shows one message at a time today.

## 9. Testing Requirements

**Project type:** Full-stack (service/store unit tests + e2e UI flow)

### 9a. Unit Testing

- Test Framework: Vitest (existing convention).
- Test File Location: `app/tests/services/*.test.ts`, `app/tests/stores/*.test.ts` (existing convention).
- Coverage Required:
  - [ ] `authApi.login` posts to `/api/token/` with `{email, password}`, returns `{access, refresh}` on success.
  - [ ] `authApi.login`/`refresh` map a `401 {detail: "..."}` to `{kind: 'invalid-credentials'}`.
  - [ ] `authApi.login` maps a `400` with DRF field-array errors (e.g. `{email: ["This field is required."]}`) to `{kind: 'validation', message: 'This field is required.'}`.
  - [ ] `authApi.refresh` posts `{refresh}` to `/api/token/refresh/`, returns the new `access` string.
  - [ ] `authApi.logout` posts `{refresh}` to `/api/token/blacklist/`, swallows all errors.
  - [ ] `meApi.fetchMe` sends `Authorization: Bearer <token>` header, returns the `me` payload including `groups`.
  - [ ] `meApi.fetchMe` throws `{kind: 'server'}` when the GraphQL request fails or `me` is `null`.
  - [ ] `stores/auth.ts login()`: on success, calls `authApi.login` then `meApi.fetchMe` with the returned access token, then `tokenStorage.writeSession` with the combined result, sets `authState` to authenticated with the fetched user (including `groups`).
  - [ ] `stores/auth.ts login()`: if `meApi.fetchMe` rejects, `tokenStorage.writeSession` is never called, `authState` stays `{status: 'unknown'}`, the error rethrows.
  - [ ] `tryAutoLogin`/`logout`/`forceLogout` tests continue to pass unchanged (no contract dependency of their own beyond `authApi.refresh`'s already-covered shape).
  - [ ] Edge cases from Section 8 are each covered by a dedicated test case.
  - [ ] External calls (`$fetch`, `graphql-request`'s `GraphQLClient`) are mocked, not hit live.
- Do NOT: write integration tests that hit a real Django server in this ticket.

### 9b. End-to-End Testing (Playwright)

- Test Framework: Playwright (existing convention, `app/e2e/`).
- Test File Location: `app/e2e/login.spec.ts` (existing file, updated in place).
- Coverage Required:
  - [ ] Happy path: mock `**/api/token/` (returns `{access, refresh}`) and `**/graphql/` (returns `{data: {me: {...}}}` for the `Me` query) — login lands on `/` showing `Welcome, {name}`.
  - [ ] Wrong password: mock `**/api/token/` with `401 {detail: "No active account found with the given credentials"}` — error message shown, stays on `/login`.
  - [ ] Loading state: unchanged behavior (delay the `/api/token/` mock response), still asserts form disables while in flight.
  - [ ] Session survives hard reload: unchanged (relies on cached `user`/token in Preferences, not on network shape).
  - [ ] Logout: mock `**/api/token/blacklist/` instead of `**/api/auth/logout`, asserts return to `/login`.
- Do NOT: add new e2e scenarios beyond porting the existing ones to the new mocks — this ticket is a contract migration, not new UI behavior.

### 9c. Test Execution

- Command to run tests: `cd app && pnpm test` (Vitest), `cd app && pnpm test:e2e` (Playwright)
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] `authApi.login/refresh/logout` target `/api/token/`, `/api/token/refresh/`, `/api/token/blacklist/` with the correct request/response key names.
- [ ] `meApi.fetchMe` successfully fetches `{id, name, email, groups}` via GraphQL using the access token from login.
- [ ] `stores/auth.ts login()` never persists a session without a successfully fetched user profile.
- [ ] `types/auth.ts User` includes `groups: string[]`.
- [ ] All unit tests pass (`cd app && pnpm test`).
- [ ] All e2e tests pass (`cd app && pnpm test:e2e`).
- [ ] Manual run against the live Django dev server: login populates `user.name`/`groups`, session survives reload, token refresh on expiry works, logout blacklists the refresh token server-side (verify a second refresh attempt with the same token then fails).
- [ ] Code is pushed to `feature/app-django-auth-integration` (only after explicit user confirmation to push).
