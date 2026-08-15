# AI Feature Spec: Django API Migration

## 1. Feature Overview

**Description:** Replace the existing KeystoneJS 6 + Prisma + Postgres API (`api/`) with a fresh Django project exposing the same domain (`User`, `Media`, `Event`) over a GraphQL-only API (strawberry-django), with JWT auth via `djangorestframework-simplejwt` defaults and Django Admin as the admin UI.
**Business Value:** Consolidate the stack on Django/Python, which the team wants going forward. This is a from-scratch reimplementation against a fresh database — no data migration is needed, and it drops unused Keystone-starter boilerplate (`Post`/`Tag`) that isn't part of the invitation domain.

## 2. Current System State (Crucial)

- Existing Infrastructure: `api/` is KeystoneJS 6 (`@keystone-6/core`, `@keystone-6/auth`) on Postgres, port `3002`. It will be **deleted entirely** and replaced in place by the new Django project (same `api/` path). Old code remains available via git history.
- Existing Domain Models (source of truth: `api/schema.ts`) — being ported:
  - `User`: name, email (unique), password, isAdmin (bool), createdAt, relations to media/events. (The old `refreshToken` field is dropped — simplejwt's token blacklist app handles refresh-token lifecycle in its own tables, not on `User`.)
  - `Media`: image, uploadedBy→User, coverOfEvent/galleryOfEvents (reverse of Event.coverImage/gallery), createdAt, deletedAt (soft delete).
  - `Event`: author→User, title, description, type (wedding/birthday/baptism), startDate, endDate, timezone, venueName, address, latitude, longitude, coverImage→Media, gallery→Media (M2M), allowPlusOne, rsvpDeadline, requireApproval, primaryColor/secondaryColor/fontFamily, createdAt, updatedAt (auto-stamped), deletedAt (soft delete).
  - `Post`/`Tag`: unrelated Keystone-starter boilerplate — **not ported**.
- Existing Auth: Hybrid Keystone-cookie (Admin UI) + hand-rolled JWT REST (`/api/auth/login|refresh|logout`). **Not ported as-is** — replaced with `djangorestframework-simplejwt`'s standard token-pair/refresh/blacklist views. The `app/` (Nuxt) frontend's auth client currently expects the old contract and will need matching updates in a **separate, follow-up task** — out of scope here.
- Client consumption: `app/` currently only calls the REST auth endpoints (no GraphQL client wired in yet). `NUXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:3002` — the new Django dev server should keep serving on port `3002` for continuity.
- Database: Fresh Postgres DB, Django manages its own migrations from scratch. Reuse the same env var names the old `.env` used for DB connection (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) so local Postgres setup doesn't need to change.
- All IDs were UUIDs in Keystone — carried forward as Django `UUIDField` primary keys on all three models.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Fresh Django project at `api/` (project package `config`, apps `users`, `media_items`, `events`).
  - Custom `User` model (`users.User`, `AUTH_USER_MODEL`) with UUID pk, email as `USERNAME_FIELD`, `name`, `is_admin`, `is_active`, `is_staff`, `date_joined`.
  - `Media` model (`media_items.Media`) with UUID pk, `image` (ImageField, local storage only), `uploaded_by` FK, `created_at`, `deleted_at` (soft delete), custom manager excluding soft-deleted rows by default.
  - `Event` model (`events.Event`) with UUID pk, all fields listed in §2, `cover_image` FK to Media, `gallery` M2M to Media, soft-delete manager, `updated_at` auto-stamped on save.
  - GraphQL-only API via `strawberry-django`: queries for public read of non-deleted Event/Media (with related User/Media fields), mutations for create/update/(soft)delete of Event and Media, gated by authentication + ownership (author/uploaded_by == request.user, or `is_admin` bypass).
  - JWT auth via `djangorestframework-simplejwt` **default configuration** (no custom token lifetimes/claims beyond the library defaults): `TokenObtainPairView`, `TokenRefreshView`, and the token-blacklist app's blacklist view for logout.
  - Custom Django middleware that authenticates the `Authorization: Bearer <token>` header (via simplejwt) and sets `request.user` before the GraphQL view runs, so GraphQL resolvers can check `info.context.request.user`.
  - `django-cors-headers` configured to allow the Nuxt dev origin (`CORS_ORIGIN_DEV` env, default `http://localhost:3000`) plus `capacitor://localhost` and `http://localhost` for the Capacitor webviews — mirrors the old CORS list.
  - Local-filesystem media storage only (Django's default `FileField`/`ImageField` behavior, `MEDIA_ROOT`/`MEDIA_URL`).
  - Django Admin registration for `User`, `Media`, `Event`.
  - Fresh `api/.env` / `api/.env.example` for the new settings (DB creds, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `APP_PORT`, `CORS_ORIGIN_DEV`).
  - Deletion of the old Keystone `api/` codebase (schema.ts, keystone.ts, auth.ts, lib/, routes/, schema.graphql, schema.prisma, package.json, `.keystone/`, `uploads/`, etc.).
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT port `Post`/`Tag` models.
  - DO NOT implement any of the forward-looking specs under `.docs/specs/api/` (guest-list, rsvp-flow, business-tier, monetization, photo-gallery, event-details/editor, public-web-invite) — those are separate future features.
  - DO NOT build S3/GCS storage backends — local filesystem only for now.
  - DO NOT add a REST CRUD API — GraphQL only, except the simplejwt token endpoints which are REST by necessity.
  - DO NOT update `app/` frontend auth client to match the new token endpoints — that is explicitly a separate follow-up task.
  - DO NOT implement password reset, OAuth/social login, rate limiting, or multi-device refresh-token management beyond what `djangorestframework-simplejwt`'s blacklist app provides out of the box.
  - DO NOT migrate any existing data from the old Postgres DB — fresh DB, fresh migrations.

## 4. Interfaces & Data Contracts

- Django Models (field-level contract):

  ```python
  # users/models.py
  class User(AbstractBaseUser, PermissionsMixin):
      id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
      email = models.EmailField(unique=True)
      name = models.CharField(max_length=255)
      is_admin = models.BooleanField(default=False)
      is_active = models.BooleanField(default=True)
      is_staff = models.BooleanField(default=False)  # gates Django Admin login
      date_joined = models.DateTimeField(auto_now_add=True)
      USERNAME_FIELD = "email"
      REQUIRED_FIELDS = ["name"]

  # media_items/models.py
  class Media(models.Model):
      id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
      image = models.ImageField(upload_to="media/%Y/%m/")
      uploaded_by = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="media_items")
      created_at = models.DateTimeField(auto_now_add=True)
      deleted_at = models.DateTimeField(null=True, blank=True)
      objects = ActiveManager()   # excludes deleted_at__isnull=False
      all_objects = models.Manager()

  # events/models.py
  class Event(models.Model):
      TYPE_CHOICES = [("wedding", "Wedding"), ("birthday", "Birthday"), ("baptism", "Baptism")]
      id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
      author = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="events")
      title = models.CharField(max_length=255)
      description = models.TextField(blank=True)
      type = models.CharField(max_length=20, choices=TYPE_CHOICES)
      start_date = models.DateTimeField()
      end_date = models.DateTimeField(null=True, blank=True)
      timezone = models.CharField(max_length=64)
      venue_name = models.CharField(max_length=255, blank=True)
      address = models.CharField(max_length=255, blank=True)
      latitude = models.FloatField(null=True, blank=True)
      longitude = models.FloatField(null=True, blank=True)
      cover_image = models.ForeignKey("media_items.Media", on_delete=models.SET_NULL, null=True, blank=True, related_name="cover_of_events")
      gallery = models.ManyToManyField("media_items.Media", blank=True, related_name="gallery_events")
      allow_plus_one = models.BooleanField(default=False)
      rsvp_deadline = models.DateTimeField(null=True, blank=True)
      require_approval = models.BooleanField(default=False)
      primary_color = models.CharField(max_length=32, blank=True)
      secondary_color = models.CharField(max_length=32, blank=True)
      font_family = models.CharField(max_length=128, blank=True)
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
      deleted_at = models.DateTimeField(null=True, blank=True)
      objects = ActiveManager()
      all_objects = models.Manager()
  ```

- GraphQL schema shape (strawberry-django), mounted at `/graphql/`:
  - `Query.events: list[EventType]` — public, excludes soft-deleted.
  - `Query.event(id: UUID!): EventType | null` — public, excludes soft-deleted.
  - `Query.mediaItems: list[MediaType]` / `Query.mediaItem(id: UUID!)` — public, excludes soft-deleted.
  - `Query.me: UserType | null` — requires auth, returns `request.user`.
  - `Mutation.createEvent(input: EventInput!): EventType` — requires auth; `author` forced from `request.user`, ignores client-supplied author.
  - `Mutation.updateEvent(id: UUID!, input: EventInput!): EventType` — requires auth; only `author` or `is_admin` may update; re-stamps `updated_at` (automatic via `auto_now`).
  - `Mutation.deleteEvent(id: UUID!): bool` — requires auth; only `author` or `is_admin`; sets `deleted_at`, does not hard-delete.
  - `Mutation.createMedia(image: Upload!): MediaType` — requires auth; `uploaded_by` forced from `request.user`.
  - `Mutation.updateMedia(id: UUID!, image: Upload!): MediaType` / `Mutation.deleteMedia(id: UUID!): bool` — requires auth; only `uploaded_by` or `is_admin`.
  - Auth failures raise a GraphQL error (e.g. `"Authentication required"` / `"Permission denied"`) rather than an HTTP-level 401/403 — GraphQL convention, matches how the query still returns `200` with an `errors` array.

- REST auth endpoints (simplejwt defaults, standard paths):
  - `POST /api/token/` — body `{ "email": "...", "password": "..." }` → `{ "refresh": "...", "access": "..." }` (200) or `401` on bad credentials.
  - `POST /api/token/refresh/` — body `{ "refresh": "..." }` → `{ "access": "..." }` (200) or `401` on invalid/expired.
  - `POST /api/token/blacklist/` — body `{ "refresh": "..." }` → `200` (logout, blacklists the token) or `401` if already invalid.
  - No custom response envelope beyond what simplejwt returns by default — this is an intentional break from the old bespoke contract (per the "simplejwt defaults" decision).

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev`, pull latest first.
- Branch Naming Convention: `feature/api-django-migration`
- Target Branch Name: `feature/api-django-migration`
- Commit Standard: Conventional Commits, atomic per implementation step. Do NOT mention any AI agent/brand name in commit messages or docs.
- Final Action: Push to remote and output the `git push` command used. **Do not push without explicit user confirmation at that point** (per this repo's risk-confirmation convention for actions affecting shared state).

## 6. File Operations

- Delete:
  - `api/schema.ts`, `api/schema.graphql`, `api/schema.prisma`, `api/keystone.ts`, `api/auth.ts`, `api/lib/`, `api/routes/`, `api/test/`, `api/schema.test.ts`, `api/vitest.config.ts`, `api/vitest.setup.ts`, `api/package.json`, `api/package-lock.json`, `api/tsconfig.json`, `api/.prettierrc`, `api/README.md`, `api/.keystone/`, `api/uploads/` — entire old Keystone codebase.
- Create:
  - `api/manage.py`, `api/config/{__init__,settings,urls,asgi,wsgi}.py` — Django project scaffold.
  - `api/users/{__init__,models,admin,managers}.py`, `api/users/migrations/` — custom User model.
  - `api/media_items/{__init__,models,admin,schema}.py`, `api/media_items/migrations/` — Media model + GraphQL types.
  - `api/events/{__init__,models,admin,schema}.py`, `api/events/migrations/` — Event model + GraphQL types.
  - `api/core/schema.py` — root strawberry `Query`/`Mutation` combining app schemas.
  - `api/core/authentication_middleware.py` — JWT-to-`request.user` Django middleware.
  - `api/core/managers.py` — shared `ActiveManager` (soft-delete filtering) if not per-app.
  - `api/requirements.txt`
  - `api/.env`, `api/.env.example`
  - `api/.gitignore` (venv, `__pycache__`, `media/`, `.env`, `db.sqlite3` if ever used locally)

## 7. Implementation Steps

1. Checkout `feature/api-django-migration` from `dev`.
2. `git rm -r` the old Keystone `api/` contents (see §6 Delete list).
3. Scaffold Django project: `django-admin startproject config .` inside `api/`, then `python manage.py startapp users|media_items|events`.
4. Add dependencies to `requirements.txt`: `django`, `strawberry-graphql-django`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `psycopg[binary]`, `pillow`, `python-dotenv`, `pytest-django`. Install into a venv.
5. Configure `config/settings.py`: `INSTALLED_APPS` (add `rest_framework`, `rest_framework_simplejwt.token_blacklist`, `corsheaders`, `strawberry_django`, `users`, `media_items`, `events`), `AUTH_USER_MODEL = "users.User"`, `DATABASES` built from `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` env vars, `MIDDLEWARE` (add `corsheaders.middleware.CorsMiddleware` + the new JWT middleware), `CORS_ALLOWED_ORIGINS`/`CORS_ALLOWED_ORIGIN_REGEXES` per §3, `MEDIA_ROOT`/`MEDIA_URL`, `REST_FRAMEWORK` default auth classes including simplejwt.
6. Implement `users/models.py` (custom `User` + `UserManager` for `create_user`/`create_superuser`), `users/admin.py`.
7. Implement `media_items/models.py` (`Media` + `ActiveManager`), `media_items/admin.py`.
8. Implement `events/models.py` (`Event` + `ActiveManager`), `events/admin.py`.
9. Run `makemigrations` for all three apps, review generated migrations.
10. Implement strawberry-django types + queries + mutations in `media_items/schema.py` and `events/schema.py`, combine in `core/schema.py`.
11. Implement `core/authentication_middleware.py` (parses `Authorization: Bearer`, uses simplejwt's `JWTAuthentication` to resolve a user, sets `request.user`; any failure — missing header, expired, invalid — leaves `request.user` as `AnonymousUser`, no request-level 401).
12. Wire `config/urls.py`: `/graphql/` (strawberry-django `GraphQLView`, GraphiQL enabled only when `DEBUG`), `/api/token/`, `/api/token/refresh/`, `/api/token/blacklist/`, `/admin/`, media serving in DEBUG.
13. Create fresh Postgres DB locally, set `api/.env` (DB creds + `DJANGO_SECRET_KEY` + `DJANGO_DEBUG=True` + `APP_PORT=3002` + `CORS_ORIGIN_DEV`), run `python manage.py migrate`.
14. Create a superuser (`python manage.py createsuperuser`) for Django Admin access.
15. Write tests (§9), run full suite.
16. Manually verify: obtain token pair, run a GraphQL query and an authenticated mutation with `curl`/GraphiQL, confirm Django Admin loads.
17. Commit atomically per logical step (project scaffold / models+migrations / GraphQL schema / auth middleware / admin+env / tests).

## 8. Error Handling & Edge Cases

- If the `Authorization` header is missing or malformed on a GraphQL request: middleware leaves `request.user` anonymous; public queries proceed normally; auth-required mutations raise a GraphQL `"Authentication required"` error (not an HTTP 401 — the HTTP response is still `200` per GraphQL convention).
- If the JWT access token is expired or has an invalid signature: same as above — treated as anonymous at the middleware level; the resulting GraphQL error is the same `"Authentication required"` message (do not distinguish reasons, avoids leaking token-validity info).
- If a non-owner (and non-admin) attempts to update/delete an `Event`/`Media` they don't own: mutation raises a GraphQL `"Permission denied"` error; no partial write occurs.
- If an `Event`/`Media` referenced by id is soft-deleted (`deleted_at` set) or doesn't exist: queries/mutations treat it as not found (`null` / not-found error), consistent with the soft-delete filtering on the default manager.
- If `POST /api/token/` receives invalid credentials: simplejwt's default `401` response, generic message (no user-enumeration distinction — this is the library default behavior, not custom logic).
- If `POST /api/token/refresh/` receives an invalid/expired/blacklisted refresh token: simplejwt's default `401`.
- If an image upload isn't a valid image file: Django's `ImageField`/Pillow validation raises a validation error surfaced as a GraphQL error on the mutation.
- Django's own startup checks already fail loudly if `DJANGO_SECRET_KEY`/DB env vars are missing — no extra custom guard needed (unlike the old hand-rolled `JWT_SECRET` check).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: `pytest-django` (idiomatic pairing with `strawberry-django`; no existing Python test convention in this repo to match).
- Test File Location: `api/<app>/tests.py` or `api/<app>/tests/test_*.py` per Django/pytest convention, one file per app (`users`, `media_items`, `events`).
- Coverage Required:
  - [ ] `User` manager: `create_user`/`create_superuser` set expected defaults (`is_admin`, `is_staff`, password hashing).
  - [ ] `Media`/`Event` soft-delete manager: `objects` excludes rows with `deleted_at` set; `all_objects` includes them.
  - [ ] `Event.updated_at` changes on save (`auto_now`), `created_at` does not.
  - [ ] GraphQL `events`/`mediaItems` queries: anonymous request returns only non-deleted rows.
  - [ ] GraphQL `createEvent`/`createMedia` mutations: anonymous request raises `"Authentication required"`; authenticated request forces `author`/`uploaded_by` from `request.user` regardless of client-supplied value.
  - [ ] GraphQL `updateEvent`/`deleteEvent`/`updateMedia`/`deleteMedia`: non-owner non-admin raises `"Permission denied"`; owner succeeds; admin (`is_admin=True`) succeeds on another user's object.
  - [ ] `deleteEvent`/`deleteMedia` performs a soft delete (`deleted_at` set), row still exists in `all_objects`.
  - [ ] `POST /api/token/` happy path returns `access`+`refresh`; wrong credentials returns `401`.
  - [ ] `POST /api/token/refresh/` happy path returns new `access`; invalid/expired returns `401`.
  - [ ] `POST /api/token/blacklist/` blacklists the token; a subsequent refresh with the same token then returns `401`.
  - [ ] Middleware: valid Bearer token sets `request.user` to the correct user; missing/malformed/expired header leaves `request.user` anonymous (no exception raised).
  - [ ] Edge cases from Section 8 above are each covered by a dedicated test case.
  - [ ] Database interactions use Django's test database (via `pytest-django`'s `db` fixture) — no external services mocked since this is the DB layer itself; no S3/GCS involved (local storage only).
- Do NOT: write tests against a live production-configured Postgres instance — use the test DB `pytest-django` creates automatically.

### 9c. Test Execution

- Command to run tests: `cd api && pytest`
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] Old Keystone `api/` code is fully removed; new Django project lives at `api/`.
- [ ] `python manage.py migrate` runs clean against a fresh Postgres DB.
- [ ] `python manage.py runserver` serves on port `3002` (via `APP_PORT` env or explicit arg).
- [ ] `/graphql/` responds to queries and mutations; GraphiQL available when `DEBUG=True`.
- [ ] `POST /api/token/` → `POST /api/token/refresh/` → `POST /api/token/blacklist/` flow works end-to-end via `curl`.
- [ ] An authenticated GraphQL mutation (valid `Authorization: Bearer <access>`) can create an `Event` and a `Media` item; `author`/`uploaded_by` is always the authenticated user, never client-controlled.
- [ ] A non-owner cannot update/delete another user's `Event`/`Media`; an admin (`is_admin=True`) can.
- [ ] Soft-deleted `Event`/`Media` no longer appear in public queries but still exist in the DB.
- [ ] Django Admin at `/admin/` loads and can manage `User`, `Media`, `Event`.
- [ ] `.env.example` documents every required env var for a fresh local setup.
- [ ] All tests defined in Section 9 pass (`cd api && pytest`).
- [ ] Code is pushed to `feature/api-django-migration` (only after explicit user confirmation to push).
