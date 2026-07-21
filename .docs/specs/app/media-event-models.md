# AI Feature Spec: Media/Event Models + GraphQL Client (Flutter app)

## 1. Feature Overview

**Description:** Add `Media`/`Event` Freezed model classes to the Flutter app matching the API's GraphQL shape, introduce a GraphQL client into the app for the first time (reusing the existing JWT bearer-token flow), and add a single read-only `eventsProvider` that queries the API's `events` field — enough to prove the whole chain works end-to-end.
**Business Value:** The API already has working `Media`/`Event` Keystone lists (see `.docs/specs/api/media-storage.md`, `.docs/specs/api/event-model.md`), but the app has no way to read them at all — not just missing models, but missing any GraphQL client whatsoever. This is the foundational slice every future event-browsing/RSVP/invite screen in the app depends on.

## 2. Current System State (Crucial)

- Existing Infrastructure: KeystoneJS 6 API (`api/`) exposes `Media`/`Event` **only via GraphQL** (`/api/graphql`) — there are no REST routes for either, unlike auth which is REST-only (`/api/auth/login|refresh|logout`). `Event.query`/`Media.query` access control is public read (`() => true`); no session is required to fetch either.
- Existing Model Convention: Freezed exclusively. `app/lib/models/user.dart` (16 lines): `@freezed abstract class User with _$User`, `part 'user.freezed.dart'`, `part 'user.g.dart'`, `factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json)`. Sealed-union style (no JSON) used for `app/lib/models/auth_failure.dart` and `app/lib/providers/auth_state.dart`.
- Existing Networking: `app/lib/services/api_client.dart`'s `dioProvider` — a Riverpod `Provider<Dio>` wrapping a single Dio instance, used ONLY for the three REST auth endpoints. Its interceptor reads `tokenStorageProvider` and attaches `Authorization: Bearer <token>` to every non-auth-route request, with a single-flight refresh-on-401 flow. **No GraphQL client package exists anywhere in `app/pubspec.yaml` or the codebase** — this is the first one.
- Existing Token Storage: `app/lib/services/token_storage.dart`'s `tokenStorageProvider` (`SecureTokenStorage`) — `readAccessToken()`/`readRefreshToken()`/`writeAccessToken()` etc., backed by `flutter_secure_storage`. The new GraphQL client must read the access token from this exact provider — do not introduce a second token-reading mechanism.
- Existing Dependencies (`app/pubspec.yaml`): `dio ^5.10.0`, `flutter_riverpod ^3.3.2`, `freezed_annotation ^3.1.0`, `json_annotation ^4.12.0` (+ dev: `freezed`, `json_serializable`, `build_runner`), `go_router`, `flutter_secure_storage`, `flutter_dotenv`, `jwt_decoder`, `mocktail` (test).
- Existing Domain Code: none. No `Event`/`Media`/`Invitation` references exist anywhere in `app/lib` — this is greenfield.
- Existing Folder Structure: `app/lib/{config,models,providers,screens,services,theme,widgets}`.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Add the `graphql_flutter` package (wraps the `graphql` Dart package) as the app's GraphQL client. Chosen over `ferry`/`artemis` because those require full schema-driven codegen — a much bigger setup commitment than this read-only proof-of-chain ticket needs; `graphql_flutter` only needs a `GraphQLClient`/`Link` setup, comparable in weight to the existing hand-rolled Dio approach.
  - Add `lib/services/graphql_client.dart`: a Riverpod provider exposing a configured `GraphQLClient`, with an `AuthLink` (or equivalent) that reads the access token from the existing `tokenStorageProvider` and attaches it as `Authorization: Bearer <token>` on every request — mirroring `dioProvider`'s interceptor pattern, not duplicating token-reading logic.
  - Add `lib/models/media.dart`: a `Media` Freezed model (see Section 4) with `fromJson`/`toJson`.
  - Add `lib/models/event.dart`: an `Event` Freezed model plus an `EventType` enum (`wedding`/`birthday`/`baptism` only — matching the API's currently active `select` options, NOT the commented-out ones in the API's own source interface) with `fromJson`/`toJson`.
  - Add `lib/providers/event_provider.dart`: a single read-only provider (e.g. `eventsProvider`) that runs a `query { events { ... } }` against the new GraphQL client and returns `List<Event>`.
  - Unit tests for `Media`/`Event`/`EventType` `fromJson`/`toJson` round-trips, and a test for `eventsProvider` parsing a mocked GraphQL response into `List<Event>`.
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT implement any `createEvent`/`updateEvent`/`deleteEvent`/`createMedia`/`updateMedia`/`deleteMedia` mutation from the app. In particular, DO NOT implement multipart GraphQL file upload from Flutter (`Media.image.upload`) — nontrivial (needs `http.MultipartFile`-equivalent wiring through `graphql_flutter`) and a separate ticket.
  - DO NOT build any screen or widget that displays events (no `EventCard`, no list screen, no detail screen).
  - DO NOT implement pagination, filtering, sorting, or search on the events query — a single unfiltered `events { ... }` query is sufficient for this ticket.
  - DO NOT implement offline caching, local persistence, or `graphql_flutter`'s built-in cache normalization tuning — accept its default in-memory cache behavior as-is.
  - DO NOT build any error-state UI (toasts, error screens) — the provider surfaces a Dart exception/error state; nothing renders it yet.
  - DO NOT add real-time subscriptions (`graphql_flutter` supports them, but nothing here needs them).

## 4. Interfaces & Data Contracts

- `Media` Freezed model (`lib/models/media.dart`) — mirrors the API's `Media` list (a single `image()` field with sub-values, no separate scalar filename/mimeType/size fields, per `.docs/specs/api/media-storage.md`):
  ```dart
  @freezed
  abstract class Media with _$Media {
    const factory Media({
      required String id,
      required MediaImage image,
      String? uploadedById,
      required DateTime createdAt,
    }) = _Media;

    factory Media.fromJson(Map<String, dynamic> json) => _$MediaFromJson(json);
  }

  @freezed
  abstract class MediaImage with _$MediaImage {
    const factory MediaImage({
      required String url,
      required int width,
      required int height,
      required int filesize,
      required String extension,
    }) = _MediaImage;

    factory MediaImage.fromJson(Map<String, dynamic> json) => _$MediaImageFromJson(json);
  }
  ```
  Note: `deletedAt` is deliberately NOT modeled — soft-deleted records are already excluded by the API's own `access.filter.query`, so a client-visible `Media` is never soft-deleted; there's nothing for the app to do with that field (same reasoning `User.isAdmin` was omitted from the app's `User` model).

- `Event` Freezed model + `EventType` enum (`lib/models/event.dart`) — mirrors `.docs/specs/api/event-model.md` Section 4:
  ```dart
  enum EventType {
    @JsonValue('wedding')
    wedding,
    @JsonValue('birthday')
    birthday,
    @JsonValue('baptism')
    baptism,
  }

  @freezed
  abstract class Event with _$Event {
    const factory Event({
      required String id,
      String? authorId,
      required String title,
      String? description,
      required EventType type,
      required DateTime startDate,
      DateTime? endDate,
      required String timezone,
      String? venueName,
      String? address,
      double? latitude,
      double? longitude,
      Media? coverImage,
      @Default([]) List<Media> gallery,
      required bool allowPlusOne,
      DateTime? rsvpDeadline,
      required bool requireApproval,
      String? primaryColor,
      String? secondaryColor,
      String? fontFamily,
      required DateTime createdAt,
      required DateTime updatedAt,
    }) = _Event;

    factory Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);
  }
  ```
  Note: `deletedAt` omitted from `Event` for the same reason as `Media` above.

- GraphQL query the new provider sends (`lib/providers/event_provider.dart`):
  ```graphql
  query GetEvents {
    events {
      id
      author { id }
      title
      description
      type
      startDate
      endDate
      timezone
      venueName
      address
      latitude
      longitude
      coverImage { id image { url width height filesize extension } }
      gallery { id image { url width height filesize extension } }
      allowPlusOne
      rsvpDeadline
      requireApproval
      primaryColor
      secondaryColor
      fontFamily
      createdAt
      updatedAt
    }
  }
  ```
  Note: `author { id }` — the query only needs the id (mapped to `authorId`), not the full nested `User`, to keep this model simple; expanding to a nested `User` object is deferred if a future screen needs the author's name/email.

- Provider signature (`lib/providers/event_provider.dart`):
  ```dart
  final eventsProvider = FutureProvider<List<Event>>((ref) async {
    final client = ref.read(graphQLClientProvider);
    final result = await client.query(QueryOptions(document: gql(getEventsQuery)));
    if (result.hasException) throw result.exception!;
    final eventsJson = result.data!['events'] as List<dynamic>;
    return eventsJson
        .map((e) => Event.fromJson(e as Map<String, dynamic>))
        .toList();
  });
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` and ensure you pull latest changes first.
- Branch Naming Convention: `feature/app-[brief-description]` (matches this repo's existing app-side convention, e.g. `feature/app-theme`, `feature/app-login`).
- Target Branch Name: `feature/app-media-event-models`
- Commit Standard: Use Conventional Commits. Commits must be atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the git push command used.

## 6. File Operations

- Create:
  - `app/lib/models/media.dart` — `Media`/`MediaImage` Freezed models.
  - `app/lib/models/event.dart` — `Event` Freezed model + `EventType` enum.
  - `app/lib/services/graphql_client.dart` — `graphQLClientProvider`, wiring the bearer-token auth link to `tokenStorageProvider`.
  - `app/lib/providers/event_provider.dart` — `eventsProvider` + the `getEventsQuery` GraphQL document.
  - `app/test/models/media_test.dart`, `app/test/models/event_test.dart` — `fromJson`/`toJson` round-trip tests.
  - `app/test/providers/event_provider_test.dart` — mocked-client test for `eventsProvider`.
- Modify:
  - `app/pubspec.yaml` — add `graphql_flutter` (and its transitive `graphql` dependency) to `dependencies`.

## 7. Implementation Steps

1. Step 1: Checkout the new branch `feature/app-media-event-models` from `dev`.
2. Step 2: Add `graphql_flutter` to `app/pubspec.yaml`; run `flutter pub get`.
3. Step 3: Create `lib/models/media.dart` and `lib/models/event.dart` per Section 4; run `dart run build_runner build` (or the project's existing codegen command) to generate `.freezed.dart`/`.g.dart` parts.
4. Step 4: Create `lib/services/graphql_client.dart` — build a `GraphQLClient` with an `HttpLink` pointed at the API's `/api/graphql` endpoint (reuse `app_config.dart`'s existing base URL config) composed with an `AuthLink`/custom `Link` that reads `tokenStorageProvider`'s access token and sets the `Authorization` header, matching `dioProvider`'s interceptor behavior.
5. Step 5: Create `lib/providers/event_provider.dart` with the `getEventsQuery` document and `eventsProvider` per Section 4.
6. Step 6: Write unit tests per Section 9 and run them.
7. Step 7: Manually verify against a running local API instance (`cd api && npm run dev`) — confirm `eventsProvider` successfully fetches and parses events, then stop the API server per this repo's dev-server convention (kill the actual listening PID, not just a shell wrapper).
8. Step 8: Commit atomically (dependency bump, then models, then client, then provider, then tests) and push.

## 8. Error Handling & Edge Cases

- If the GraphQL request fails (network error, non-2xx, GraphQL errors array populated): `eventsProvider`'s `FutureProvider` surfaces the exception through Riverpod's `AsyncValue.error` state — no custom retry/backoff logic in this ticket.
- If the access token is missing/expired when the events query runs: since `Event.query`/`Media.query` are public read, the request still succeeds even without a valid token — there is no 401-driven refresh flow needed for this specific query, unlike the Dio interceptor's auth-route handling. (A future ticket adding an authenticated mutation is where the GraphQL client would need its own refresh-on-error handling, mirroring `dioProvider`'s; not needed here since nothing in scope requires auth.)
- If `coverImage`/`gallery` are absent (null/empty) on an `Event`: `coverImage` is nullable, `gallery` defaults to an empty list — no crash on parsing.
- If the API response is missing an expected non-nullable field: `fromJson` throws a `TypeError`/`CheckedFromJsonException` from `json_serializable` — acceptable for this ticket (no custom validation/error-message layer around parsing failures).

## 9. Testing Requirements

**Project type:** Includes UI (Flutter app), but this ticket adds no screens/widgets — testing is unit-level only, per Section 9a's spirit applied to Dart.

### 9a. Unit Testing

- Test Framework: `flutter_test` + `mocktail` (matches existing convention, e.g. `app/test/providers/auth_provider_test.dart`, `app/test/services/auth_api_test.dart`).
- Test File Location: `app/test/models/media_test.dart`, `app/test/models/event_test.dart`, `app/test/providers/event_provider_test.dart`.
- Coverage Required:
  - [ ] `Media.fromJson`/`toJson` round-trips correctly against a realistic API response fixture (including nested `MediaImage`).
  - [ ] `Event.fromJson`/`toJson` round-trips correctly, including `type` enum serialization (`"wedding"` string ↔ `EventType.wedding`), nullable fields (`description`, `endDate`, `coverImage`, etc.), and `gallery` as a list of `Media`.
  - [ ] `eventsProvider` parses a mocked GraphQL response (a `Map` shaped like the query in Section 4) into the expected `List<Event>`.
  - [ ] `eventsProvider` surfaces an error state when the mocked GraphQL client returns a `QueryResult` with `hasException: true`.
  - [ ] Edge cases from Section 8 above are each covered by a dedicated test case.
  - [ ] The GraphQL client itself is mocked in provider tests — no real network call, no live API hit.
- Do NOT: write integration tests that hit a real running API instance in this ticket (that's covered by the manual verification step in Section 7 instead).

### 9c. Test Execution

- Command to run tests: `cd app && flutter test`
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] The code is pushed to the remote branch `feature/app-media-event-models`.
- [ ] `Media`/`MediaImage`/`Event`/`EventType` model classes exist in `app/lib/models/`, matching the API's GraphQL shape from Section 4.
- [ ] A `GraphQLClient` is wired in `app/lib/services/graphql_client.dart`, attaching the JWT bearer token from the existing `tokenStorageProvider` to every request.
- [ ] `eventsProvider` successfully fetches and parses events from a running local API instance (manually verified).
- [ ] No mutation, upload, or UI code was added — scope stayed limited to models + client + one read query, per Section 3.
- [ ] All tests defined in Section 9 pass.
