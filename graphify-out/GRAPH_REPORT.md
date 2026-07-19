# Graph Report - e_invitation  (2026-07-19)

## Corpus Check
- 73 files · ~34,485 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 530 nodes · 635 edges · 63 communities (28 shown, 35 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18ab094f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- fake_token_storage.dart
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
- package:flutter/material.dart
- login_screen_test.dart
- auth_api_test.dart
- app_colors.dart

## God Nodes (most connected - your core abstractions)
1. `Flutter app pubspec.yaml dependency manifest` - 17 edges
2. `AuthNotifier` - 15 edges
3. `createAuthRouter()` - 12 edges
4. `AuthFailure` - 12 edges
5. `AI Feature Spec: App Theme ("LuxeInvite" Design System)` - 11 edges
6. `AuthState` - 9 edges
7. `jwtAuthMiddleware()` - 8 edges
8. `Implementation Plan: LuxeInvite App Theme` - 8 edges
9. `Proposed Changes` - 8 edges
10. `LoginScreen` - 7 edges

## Surprising Connections (you probably didn't know these)
- `session` --references--> `extendExpressApp wiring (keystone.ts)`  [AMBIGUOUS]
  api/auth.ts → .docs/plans/jwt-auth-plan.md
- `dioProvider` --semantically_similar_to--> `jwtAuthMiddleware()`  [INFERRED] [semantically similar]
  app/lib/services/api_client.dart → api/lib/auth-middleware.ts
- `AuthNotifier` --semantically_similar_to--> `verifyAccessToken()`  [INFERRED] [semantically similar]
  app/lib/providers/auth_provider.dart → api/lib/jwt.ts
- `Rationale: use authenticateUserWithPassword mutation instead of raw bcrypt` --rationale_for--> `createAuthRouter()`  [EXTRACTED]
  .docs/plans/jwt-auth-plan.md → api/routes/auth.ts
- `Enumeration-safe Login Error Response` --references--> `createAuthRouter()`  [EXTRACTED]
  .docs/specs/api/jwt-auth.md → api/routes/auth.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **App Login Flow (Riverpod Providers & Services)** — app_lib_providers_auth_provider_authnotifier, app_lib_providers_login_controller_provider_logincontroller, app_lib_services_token_storage_tokenstorage, app_lib_services_auth_api_authapi, app_lib_services_api_client_dioprovider, app_lib_providers_router_provider_routerprovider [INFERRED 0.85]
- **JWT Auth REST API Flow** — api_routes_auth_createauthrouter, api_lib_auth_middleware_jwtauthmiddleware, api_lib_jwt_generateaccesstoken, api_lib_jwt_verifyaccesstoken, api_lib_jwt_hashtoken, api_auth_session [INFERRED 0.85]
- **Login Feature Test Suite** — app_test_services_auth_api_test, app_test_providers_auth_provider_test, app_test_screens_login_screen_test, app_integration_test_login_flow_test [EXTRACTED 1.00]

## Communities (63 total, 35 thin omitted)

### Community 0 - "User & AuthState Freezed Models"
Cohesion: 0.05
Nodes (47): @freezed, @JsonSerializable, fromJson, User, fromJson, _User, AuthState, authenticated (+39 more)

### Community 1 - "JWT Auth Specs & Plans"
Cohesion: 0.08
Nodes (32): Implementation Plan: Login Pages for the Flutter App, Implementation Plan: JWT Authentication for KeystoneJS API, jsonwebtoken package (Node), Rationale: use authenticateUserWithPassword mutation instead of raw bcrypt, Rationale: single-device refresh tokens (one per user), supertest package, vitest test runner, AI Feature Spec: JWT Authentication (+24 more)

### Community 2 - "App Config & API Base URL"
Cohesion: 0.13
Nodes (15): build, createState, dispose, _emailController, _emailRegex, _formKey, _LoginScreenState, _mapFailure (+7 more)

### Community 3 - "AuthNotifier Provider"
Cohesion: 0.08
Nodes (23): _authApi, build, forceLogout, login, logout, _tokenStorage, tryAutoLogin, _GoRouterRefreshNotifier (+15 more)

### Community 4 - "Dio Client & Design Rationale"
Cohesion: 0.05
Nodes (46): Rationale: auto-login caches full User, not just tokens (JWT lacks name claim), Rationale: avoid circular provider init via lazy ref.read in interceptor, api_client.dart, AuthNotifier, config, dio, dioProvider, refreshCompleter (+38 more)

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
Cohesion: 0.22
Nodes (8): AccountView, build, build, HomeView, build, TemplatesView, package:flutter/material.dart, StatelessWidget

### Community 10 - "AuthProvider Unit Tests"
Cohesion: 0.05
Nodes (44): accessToken, clear, readAccessToken, readRefreshToken, readUser, refreshToken, user, writeAccessToken (+36 more)

### Community 11 - "Fake Token Storage Test Double"
Cohesion: 0.07
Nodes (28): Architecture Overview, Automated Tests, Component 1: Fonts & pubspec.yaml, Component 2: Colors, Component 3: Typography, Component 4: Radius & Spacing, Component 5: Combined ThemeData, Component 6: App Entrypoint Wiring (+20 more)

### Community 12 - "Web App Manifest"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, prefer_related_applications, short_name (+2 more)

### Community 13 - "Login Screen Widget Tests"
Cohesion: 0.10
Nodes (20): 10. Acceptance Criteria, 1. Feature Overview, 2. Current System State (Crucial), 3. Scope & Boundaries, 4. Interfaces & Data Contracts, 5. Git & Version Control Rules, 6. File Operations, 7. Implementation Steps (+12 more)

### Community 14 - "Auth API Unit Tests"
Cohesion: 0.29
Nodes (7): build, createState, SplashScreen, _SplashScreenState, ConsumerStatefulWidget, package:flutter_riverpod/flutter_riverpod.dart, ../providers/auth_provider.dart

### Community 15 - "API tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, noEmit, strict, target

### Community 16 - "fake_token_storage.dart"
Cohesion: 0.10
Nodes (19): main, _testEmail, _testPassword, appService, binding, dartTestGroup, initialize, main (+11 more)

### Community 59 - "package:flutter/material.dart"
Cohesion: 0.25
Nodes (8): build, load, main, MyApp, routerProvider, ConsumerWidget, package:flutter_dotenv/flutter_dotenv.dart, providers/router_provider.dart

### Community 60 - "login_screen_test.dart"
Cohesion: 0.29
Nodes (6): Rationale: API_BASE_URL differs per run target (emulator/simulator/device), apiBaseUrl, AppConfig, appConfigProvider, fromEnv, _

### Community 61 - "auth_api_test.dart"
Cohesion: 0.20
Nodes (10): authProvider, build, LoginController, loginControllerProvider, submit, LoginScreen, initState, AsyncNotifier (+2 more)

### Community 63 - "app_colors.dart"
Cohesion: 0.12
Nodes (17): _bottomNavItems, build, createState, HomeScreen, _HomeScreenState, initState, _onItemTapped, _selectedIndex (+9 more)

## Ambiguous Edges - Review These
- `session` → `extendExpressApp wiring (keystone.ts)`  [AMBIGUOUS]
  .docs/plans/jwt-auth-plan.md · relation: references

## Knowledge Gaps
- **277 isolated node(s):** `_viewController`, `_selectedIndex`, `_bottomNavItems`, `_views`, `createState` (+272 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `session` and `extendExpressApp wiring (keystone.ts)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `AuthNotifier` connect `Dio Client & Design Rationale` to `User & AuthState Freezed Models`, `JWT Auth Specs & Plans`, `AuthNotifier Provider`, `AuthProvider Unit Tests`, `Auth API Unit Tests`, `package:flutter/material.dart`, `auth_api_test.dart`, `app_colors.dart`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Implementation Plan: Login Pages for the Flutter App` connect `JWT Auth Specs & Plans` to `fake_token_storage.dart`, `App pubspec.yaml Dependencies`, `AuthProvider Unit Tests`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Flutter app pubspec.yaml dependency manifest` connect `App pubspec.yaml Dependencies` to `JWT Auth Specs & Plans`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `_viewController`, `_selectedIndex`, `_bottomNavItems` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `User & AuthState Freezed Models` be split into smaller, more focused modules?**
  _Cohesion score 0.050170068027210885 - nodes in this community are weakly interconnected._
- **Should `JWT Auth Specs & Plans` be split into smaller, more focused modules?**
  _Cohesion score 0.08309178743961353 - nodes in this community are weakly interconnected._