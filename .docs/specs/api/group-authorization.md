# AI Feature Spec: Group-Based Authorization

## 1. Feature Overview

**Description:** Replace the ad hoc `User.is_admin` boolean with Django's built-in Groups system as the sole authorization mechanism. `core/permissions.py`'s owner-or-admin bypass on `Event`/`Media` mutations checks membership in an `"admin"` group instead of the `is_admin` flag, and the GraphQL `UserType` exposes `groups: list[str]` instead of `is_admin`.
**Business Value:** Sets up group-based (role-based) authorization as the foundation going forward instead of a single hardcoded boolean flag, without building a full RBAC framework — just the minimal switch needed now, extensible later by adding more groups.

## 2. Current System State (Crucial)

- Existing Infrastructure: Django 6.1 API at `api/`, GraphQL-only via strawberry-django, JWT auth via `djangorestframework-simplejwt`. `User` model already extends `PermissionsMixin` (from `django.contrib.auth.models`), which already provides the `groups` (M2M to `auth.Group`) and `user_permissions` relations — no new dependency needed, this is stock Django.
- Existing Authorization: `api/core/permissions.py` — `require_owner_or_admin(info, obj, owner_field)` checks `getattr(obj, f"{owner_field}_id") != user.id and not user.is_admin`. Used by `media_items/schema.py` (`update_media`/`delete_media`, owner field `uploaded_by`) and `events/schema.py` (`update_event`/`delete_event`, owner field `author`).
- Existing Model: `api/users/models.py` — `User.is_admin` (`BooleanField`, default `False`). `UserManager.create_user` defaults it `False`; `UserManager.create_superuser` defaults it `True` (alongside `is_staff=True`, `is_superuser=True`).
- Existing GraphQL: `api/users/schema.py` — `UserType.is_admin: bool`, set from `user.is_admin` in `UserType.from_model`.
- Existing Admin: `api/users/admin.py` — `UserAdmin(DjangoUserAdmin)` fieldsets include `is_admin` in the "Permissions" section alongside `is_active`/`is_staff`/`is_superuser`/`groups`/`user_permissions` (the `groups` field is already listed there, just currently redundant with `is_admin` for authorization purposes).
- Existing Data: Fresh dev DB, one superuser (`jaictinrj@gmail.com`, `is_admin=True`, `is_superuser=True`, `is_staff=True`) created via `createsuperuser`. No other user data to preserve — this is a dev environment, no production migration risk, but the migration should still be written correctly (group creation + backfill before dropping the column) as a demonstration of a safe pattern.
- Existing Tests: `api/conftest.py`'s `admin_user` fixture creates a user via `make_user(is_admin=True)`. `api/users/tests.py` asserts `user.is_admin` on `create_user`/`create_superuser`. `api/media_items/tests.py::test_update_media_allows_admin` and `api/events/tests.py::test_update_event_allows_admin` both use the `admin_user` fixture to verify the bypass.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - Add a data migration that creates the `"admin"` `django.contrib.auth.models.Group` and backfills every existing user with `is_admin=True` into it.
  - Add a schema migration (after the data migration) that removes the `is_admin` field from `User`.
  - Update `core/permissions.py`'s `require_owner_or_admin` to check `user.groups.filter(name="admin").exists()` instead of `user.is_admin`.
  - Update `users/models.py`: remove the `is_admin` field; `UserManager.create_user` no longer sets it; `UserManager.create_superuser` adds the new user to the `"admin"` group after creation (superusers already bypass all Django permission checks via `is_superuser`, but should also land in the domain-level `"admin"` group for consistency with `require_owner_or_admin`).
  - Update `users/schema.py`: `UserType` drops `is_admin`, adds `groups: list[str]` (resolved as `list(user.groups.values_list("name", flat=True))`).
  - Update `users/admin.py`: remove `is_admin` from `list_display`/`list_filter`/`fieldsets` (field no longer exists); `groups` stays in the "Permissions" fieldset (already there) as the way admins manage this from now on.
  - Update `conftest.py`'s `admin_user` fixture to add the created user to the `"admin"` group instead of passing `is_admin=True`.
  - Update `users/tests.py`, `media_items/tests.py::test_update_media_allows_admin`, `events/tests.py::test_update_event_allows_admin` to match.
  - Add a test verifying a user who is *not* in the `"admin"` group (and not the owner) still gets `"Permission denied"` (regression coverage for the switch — equivalent case already exists as `test_update_media_denies_non_owner`/`test_update_event_denies_non_owner`, just confirm they still pass unchanged since `other_user` never had `is_admin` or group membership).
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT build a general-purpose RBAC/permissions framework (multiple named groups mapped to different capability sets) — only the single `"admin"` group replacing the old boolean.
  - DO NOT expose group *management* (add/remove group mutations) over GraphQL — Django Admin is sufficient for now.
  - DO NOT touch `is_staff`/`is_superuser` — those remain as Django's own built-in flags for Django Admin login access and full permission bypass, respectively; unrelated to this domain-level `"admin"` group.

## 4. Interfaces & Data Contracts

- GraphQL `UserType` (was):
  ```graphql
  type UserType {
    id: ID!
    email: String!
    name: String!
    isAdmin: Boolean!
  }
  ```
- GraphQL `UserType` (after):
  ```graphql
  type UserType {
    id: ID!
    email: String!
    name: String!
    groups: [String!]!
  }
  ```
- `core/permissions.py` (after):
  ```python
  def require_owner_or_admin(info, obj, owner_field):
      user = require_auth(info)
      owner_id = getattr(obj, f"{owner_field}_id")
      if owner_id != user.id and not user.groups.filter(name="admin").exists():
          raise Exception("Permission denied")
      return user
  ```
- Migration sequence (`users/migrations/`):
  ```python
  # 0002_create_admin_group.py — data migration
  def create_admin_group_and_backfill(apps, schema_editor):
      Group = apps.get_model("auth", "Group")
      User = apps.get_model("users", "User")
      admin_group, _ = Group.objects.get_or_create(name="admin")
      for user in User.objects.filter(is_admin=True):
          user.groups.add(admin_group)

  # 0003_remove_user_is_admin.py — schema migration
  # migrations.RemoveField(model_name="user", name="is_admin")
  ```

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev`, pull latest first.
- Branch Naming Convention: `feature/api-group-authorization`
- Target Branch Name: `feature/api-group-authorization`
- Commit Standard: Conventional Commits, atomic per implementation step. Do NOT mention any AI agent/brand name in commit messages or docs.
- Final Action: Push to remote and output the `git push` command used. **Do not push without explicit user confirmation.**

## 6. File Operations

- Create:
  - `api/users/migrations/0002_create_admin_group.py` - data migration creating `"admin"` group, backfilling `is_admin=True` users into it
  - `api/users/migrations/0003_remove_user_is_admin.py` - schema migration removing `User.is_admin`
- Modify:
  - `api/core/permissions.py` - `require_owner_or_admin` checks group membership
  - `api/users/models.py` - remove `is_admin` field; `create_superuser` adds new user to `"admin"` group
  - `api/users/schema.py` - `UserType` drops `is_admin`, adds `groups`
  - `api/users/admin.py` - remove `is_admin` from `list_display`/`list_filter`/`fieldsets`
  - `api/conftest.py` - `admin_user` fixture uses group membership
  - `api/users/tests.py` - drop `is_admin` assertions, add group-membership assertion for `create_superuser`
  - `api/media_items/tests.py` - `test_update_media_allows_admin` uses group-based `admin_user`
  - `api/events/tests.py` - `test_update_event_allows_admin` uses group-based `admin_user`

## 7. Implementation Steps

1. Checkout `feature/api-group-authorization` from `dev`.
2. Write `users/migrations/0002_create_admin_group.py` (data migration: `RunPython` creating the `"admin"` group and backfilling current `is_admin=True` users).
3. Run it (`python manage.py migrate users 0002`), confirm the existing superuser lands in the `"admin"` group via `python manage.py shell`.
4. Update `users/models.py` — remove `is_admin` field, update `UserManager.create_user`/`create_superuser` (the latter adds the created user to the `"admin"` group post-save).
5. Run `makemigrations` to generate `0003_remove_user_is_admin.py`, review it, then `migrate`.
6. Update `core/permissions.py`'s `require_owner_or_admin`.
7. Update `users/schema.py`'s `UserType`.
8. Update `users/admin.py` fieldsets/list_display/list_filter.
9. Update `conftest.py`'s `admin_user` fixture and all three affected test files.
10. Run `cd api && pytest`, fix any failures.
11. Manually verify: GraphQL `me` query no longer returns `isAdmin`, returns `groups: ["admin"]` for the superuser; a group-member can update/delete another user's Event/Media, a non-member non-owner still gets `"Permission denied"`.
12. Commit atomically per step, push only after user confirmation.

## 8. Error Handling & Edge Cases

- If a user is in no groups at all: `require_owner_or_admin` behaves exactly as before for a non-owner (raises `"Permission denied"`) — no behavior change for the common case.
- If the data migration runs on a DB with zero `is_admin=True` users: creates an empty `"admin"` group, no backfill needed, no error.
- If `create_superuser` is called and the `"admin"` group doesn't exist yet (e.g. on a fresh DB before migrations run): not a realistic runtime case since migrations always run before the app serves requests, but `Group.objects.get_or_create(name="admin")` is used (not a hard lookup) so it's self-healing if ever called out of order.
- Django's own `is_superuser` flag is untouched and continues to bypass all of Django's *own* permission framework (unrelated to this domain-level check) — a superuser who somehow isn't in the `"admin"` group would still NOT bypass `require_owner_or_admin`'s check unless also group-membered; the migration handles this by backfilling from `is_admin`, not `is_superuser`, matching the old check's actual semantics exactly (the old check only ever read `is_admin`, never `is_superuser`).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: `pytest-django` (existing convention).
- Test File Location: existing test files, no new files needed beyond the migration itself (migrations aren't unit-tested in this repo's existing convention).
- Coverage Required:
  - [ ] `UserManager.create_superuser` adds the new user to the `"admin"` group.
  - [ ] `UserManager.create_user` does NOT add the new user to any group.
  - [ ] `require_owner_or_admin`: owner succeeds; `"admin"`-group member (non-owner) succeeds; neither owner nor group member fails with `"Permission denied"` (existing `test_update_media_denies_non_owner`/`test_update_event_denies_non_owner` already cover this — confirm they still pass).
  - [ ] GraphQL `UserType`/`me` query returns `groups` and does not return `isAdmin` (schema-level — a query requesting `isAdmin` should fail to parse/validate).
  - [ ] `test_update_media_allows_admin`/`test_update_event_allows_admin` pass with the `admin_user` fixture now using group membership instead of `is_admin=True`.
- Do NOT: write a dedicated migration-execution test — the migration's effect is exercised indirectly through the fixture/model tests above, consistent with this repo's existing convention of not testing Django migrations directly.

### 9c. Test Execution

- Command to run tests: `cd api && pytest`
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] `User.is_admin` field no longer exists (migration applied).
- [ ] `"admin"` group exists and contains every user that previously had `is_admin=True` (verified against the pre-migration dev DB state).
- [ ] `core/permissions.py`'s owner-or-admin check uses group membership.
- [ ] GraphQL `UserType`/`me` exposes `groups: [String!]!`, no longer exposes `isAdmin`.
- [ ] Django Admin's `UserAdmin` no longer references `is_admin`; `groups` remains manageable from the user edit form.
- [ ] `UserManager.create_superuser` auto-adds new superusers to the `"admin"` group.
- [ ] All tests pass (`cd api && pytest`).
- [ ] Code is pushed to `feature/api-group-authorization` (only after explicit user confirmation to push).
