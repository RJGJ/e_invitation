# Graph Report - . (2026-07-18)

## Corpus Check

- Corpus is ~27,640 words - fits in a single context window. You may not need a graph.

## Summary

- 441 nodes · 544 edges · 59 communities (24 shown, 35 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 728,620 output

## Community Hubs (Navigation)

- User & AuthState Freezed Models
- JWT Auth Specs & Plans
- App Config & API Base URL
- AuthNotifier Provider
- Dio Client & Design Rationale
- API package.json Dependencies
- AuthFailure Error Union
- iOS AppDelegate/SceneDelegate
- App pubspec.yaml Dependencies
- Secure Token Storage
- AuthProvider Unit Tests
- Fake Token Storage Test Double
- Web App Manifest
- Login Screen Widget Tests
- Auth API Unit Tests
- API tsconfig.json
- Patrol E2E Login Tests
- Android MainActivity
- isAdmin Exclusion Rationale
- Graphify Project Instructions
- Keystone Starter README
- Default Flutter Icon (Android hdpi)
- Default Flutter Icon (Android mdpi)
- Default Flutter Icon (Android xhdpi)
- Default Flutter Icon (Android xxhdpi)
- Default Flutter Icon (Android xxxhdpi)
- Default Flutter Icon (iOS 1024)
- Default Flutter Icon (iOS 20x20@1x)
- Default Flutter Icon (iOS 20x20@2x)
- Default Flutter Icon (iOS 20x20@3x)
- Default Flutter Icon (iOS 29x29@1x)
- Default Flutter Icon (iOS 29x29@2x)
- Default Flutter Icon (iOS 29x29@3x)
- Default Flutter Icon (iOS 40x40@1x)
- Default Flutter Icon (iOS 40x40@2x)
- Default Flutter Icon (iOS 40x40@3x)
- Default Flutter Icon (iOS 60x60@2x)
- Default Flutter Icon (iOS 60x60@3x)
- Default Flutter Icon (iOS 76x76@1x)
- Default Flutter Icon (iOS 76x76@2x)
- Default Flutter Icon (iOS 83.5x83.5@2x)
- iOS Launch Image (3x, blank)
- iOS Launch Image (1x, blank)
- iOS Launch Image README
- Flutter App README
- Web Favicon (Custom)
- Default Flutter Icon (Web 192)
- Default Flutter Icon (Web 512)
- Default Flutter Maskable Icon (192)
- Default Flutter Maskable Icon (512)
- Flutter Web index.html
- Repo Root README

## God Nodes (most connected - your core abstractions)

1. `Flutter app pubspec.yaml dependency manifest` - 17 edges
2. `AuthNotifier` - 15 edges
3. `createAuthRouter()` - 12 edges
4. `AuthFailure` - 12 edges
5. `AuthState` - 9 edges
6. `jwtAuthMiddleware()` - 8 edges
7. `authProvider` - 8 edges
8. `verifyAccessToken()` - 7 edges
9. `compilerOptions` - 7 edges
10. `routerProvider` - 7 edges

## Surprising Connections (you probably didn't know these)

- `session` --references--> `extendExpressApp wiring (keystone.ts)` [AMBIGUOUS]
  api/auth.ts → .docs/plans/jwt-auth-plan.md
- `dioProvider` --semantically_similar_to--> `jwtAuthMiddleware()` [INFERRED] [semantically similar]
  app/lib/services/api_client.dart → api/lib/auth-middleware.ts
- `AuthNotifier` --semantically_similar_to--> `verifyAccessToken()` [INFERRED] [semantically similar]
  app/lib/providers/auth_provider.dart → api/lib/jwt.ts
- `Rationale: use authenticateUserWithPassword mutation instead of raw bcrypt` --rationale_for--> `createAuthRouter()` [EXTRACTED]
  .docs/plans/jwt-auth-plan.md → api/routes/auth.ts
- `Enumeration-safe Login Error Response` --references--> `createAuthRouter()` [EXTRACTED]
  .docs/specs/api/jwt-auth.md → api/routes/auth.ts

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **App Login Flow (Riverpod Providers & Services)** — app_lib_providers_auth_provider_authnotifier, app_lib_providers_login_controller_provider_logincontroller, app_lib_services_token_storage_tokenstorage, app_lib_services_auth_api_authapi, app_lib_services_api_client_dioprovider, app_lib_providers_router_provider_routerprovider [INFERRED 0.85]
- **JWT Auth REST API Flow** — api_routes_auth_createauthrouter, api_lib_auth_middleware_jwtauthmiddleware, api_lib_jwt_generateaccesstoken, api_lib_jwt_verifyaccesstoken, api_lib_jwt_hashtoken, api_auth_session [INFERRED 0.85]
- **Login Feature Test Suite** — app_test_services_auth_api_test, app_test_providers_auth_provider_test, app_test_screens_login_screen_test, app_integration_test_login_flow_test [EXTRACTED 1.00]

## Communities (59 total, 35 thin omitted)

### Community 0 - "User & AuthState Freezed Models"

Cohesion: 0.05
Nodes (47): @freezed, @JsonSerializable, fromJson, User, fromJson, \_User, AuthState, authenticated (+39 more)

### Community 1 - "JWT Auth Specs & Plans"

Cohesion: 0.08
Nodes (32): Implementation Plan: Login Pages for the Flutter App, Implementation Plan: JWT Authentication for KeystoneJS API, jsonwebtoken package (Node), Rationale: use authenticateUserWithPassword mutation instead of raw bcrypt, Rationale: single-device refresh tokens (one per user), supertest package, vitest test runner, AI Feature Spec: JWT Authentication (+24 more)

### Community 2 - "App Config & API Base URL"

Cohesion: 0.06
Nodes (40): Rationale: API_BASE_URL differs per run target (emulator/simulator/device), apiBaseUrl, AppConfig, appConfigProvider, fromEnv, build, load, main (+32 more)

### Community 3 - "AuthNotifier Provider"

Cohesion: 0.06
Nodes (32): \_authApi, authProvider, build, forceLogout, login, logout, \_tokenStorage, tryAutoLogin (+24 more)

### Community 4 - "Dio Client & Design Rationale"

Cohesion: 0.08
Nodes (29): Rationale: auto-login caches full User, not just tokens (JWT lacks name claim), Rationale: avoid circular provider init via lazy ref.read in interceptor, api_client.dart, AuthNotifier, config, dio, dioProvider, refreshCompleter (+21 more)

### Community 5 - "API package.json Dependencies"

Cohesion: 0.06
Nodes (30): dependencies, dotenv, jsonwebtoken, @keystone-6/auth, @keystone-6/core, @keystone-6/fields-document, typescript, devDependencies (+22 more)

### Community 6 - "AuthFailure Error Union"

Cohesion: 0.09
Nodes (27): AuthFailure, invalidCredentials, network, server, validation, invalidCredentials, network, server (+19 more)

### Community 7 - "iOS AppDelegate/SceneDelegate"

Cohesion: 0.11
Nodes (14): Any, AppDelegate, SceneDelegate, RunnerTests, Bool, Flutter, FlutterAppDelegate, FlutterImplicitEngineBridge (+6 more)

### Community 8 - "App pubspec.yaml Dependencies"

Cohesion: 0.11
Nodes (18): Dart analyzer configuration (analysis_options.yaml), Flutter app pubspec.yaml dependency manifest, build_runner package (codegen), cupertino_icons package, dio package, flutter_dotenv package, flutter_lints package, flutter_riverpod package (+10 more)

### Community 9 - "Secure Token Storage"

Cohesion: 0.12
Nodes (17): \_accessTokenKey, clear, readAccessToken, readRefreshToken, readUser, \_refreshTokenKey, SecureTokenStorage, \_storage (+9 more)

### Community 10 - "AuthProvider Unit Tests"

Cohesion: 0.12
Nodes (15): authApi, \_base64Segment, container, encode, \_expiredToken, header, \_jwtWithExp, main (+7 more)

### Community 11 - "Fake Token Storage Test Double"

Cohesion: 0.17
Nodes (11): accessToken, clear, readAccessToken, readRefreshToken, readUser, refreshToken, user, writeAccessToken (+3 more)

### Community 12 - "Web App Manifest"

Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, prefer_related_applications, short_name (+2 more)

### Community 13 - "Login Screen Widget Tests"

Cohesion: 0.20
Nodes (9): authApi, main, \_pumpLoginScreen, pumpWidget, \_user, ElevatedButton, ../fakes/fake_token_storage.dart, MockAuthApi (+1 more)

### Community 14 - "Auth API Unit Tests"

Cohesion: 0.20
Nodes (9): authApi, dio, \_dioError, main, package:e_invitation/models/auth_failure.dart, package:e_invitation/models/user.dart, package:e_invitation/services/auth_api.dart, package:mocktail/mocktail.dart (+1 more)

### Community 15 - "API tsconfig.json"

Cohesion: 0.25
Nodes (7): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, noEmit, strict, target

### Community 16 - "Patrol E2E Login Tests"

Cohesion: 0.29
Nodes (6): main, \_testEmail, \_testPassword, package:e_invitation/main.dart, package:flutter_test/flutter_test.dart, package:patrol/patrol.dart

## Ambiguous Edges - Review These

- `session` → `extendExpressApp wiring (keystone.ts)` [AMBIGUOUS]
  .docs/plans/jwt-auth-plan.md · relation: references

## Knowledge Gaps

- **223 isolated node(s):** `cookieSession`, `user`, `Express`, `user`, `name` (+218 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `session` and `extendExpressApp wiring (keystone.ts)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `AuthNotifier` connect `Dio Client & Design Rationale` to `User & AuthState Freezed Models`, `JWT Auth Specs & Plans`, `App Config & API Base URL`, `AuthNotifier Provider`, `Secure Token Storage`, `AuthProvider Unit Tests`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `Implementation Plan: Login Pages for the Flutter App` connect `JWT Auth Specs & Plans` to `Patrol E2E Login Tests`, `App pubspec.yaml Dependencies`, `Auth API Unit Tests`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Flutter app pubspec.yaml dependency manifest` connect `App pubspec.yaml Dependencies` to `JWT Auth Specs & Plans`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `cookieSession`, `user`, `Express` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `User & AuthState Freezed Models` be split into smaller, more focused modules?**
  _Cohesion score 0.050170068027210885 - nodes in this community are weakly interconnected._
- **Should `JWT Auth Specs & Plans` be split into smaller, more focused modules?**
  _Cohesion score 0.08309178743961353 - nodes in this community are weakly interconnected._
