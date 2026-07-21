# AI Feature Spec: Public Web Invitation Route

## 1. Feature Overview

**Description:** A server-rendered, no-login, no-app-required web page showing an invitation's essentials (invite + static reveal + Yes/No + count RSVP + app-download footer), per DESIGN_SYSTEM.md §10 and design screen `12`. Serves guests on slow connections or without the Flutter app installed.
**Business Value:** PH-first, low-bandwidth requirement (DESIGN_SYSTEM.md §0.4) — a guest link must work for anyone, on any connection, without requiring an app install first. Also a distribution surface: the link works standalone, app-download is the upsell inside it.

## 2. Current System State (Crucial)

- Existing Infrastructure: `api/routes/` already holds REST routes (`auth.ts`) alongside the GraphQL API — this ticket follows that convention rather than adding a second web framework. `Event`/`Guest` (public read / token-based RSVP) already exist per `event-model.md`/`rsvp-flow.md`.
- No server-rendered HTML route exists anywhere in `api/` yet — Keystone's Express app (`api/keystone.ts`) can register additional routes; this ticket adds one that returns HTML instead of JSON.

## 3. Scope & Boundaries

- IN SCOPE:
  - `GET /invite/:eventId` route: server-renders a minimal, self-contained HTML page (inline CSS, no client-side framework bundle) showing hero photo, title, date/venue, a simple Yes/No + count RSVP form (posts to a small REST endpoint, not GraphQL, to keep the page framework-free), and an app-download footer linking to the app stores.
  - `POST /invite/:eventId/rsvp` route: accepts `{ inviteToken, status, partySize }` form data, calls the same `submitRsvp` logic as the GraphQL mutation (extract the shared logic from `api/lib/rsvp.ts` into a plain function both the GraphQL resolver and this REST route call, rather than duplicating the guest-lookup/update logic).
  - No custom RSVP questions on this page — matches DESIGN_SYSTEM.md §10 ("custom questions are answered only in the app"), so `meal`/`dietary`/`songRequest`/`note` are never rendered or accepted here, regardless of `Event.isPremium`.
- DEFERRED:
  - DO NOT render the photo gallery on this page.
  - DO NOT build a JS-driven animated reveal for this route — static image/text only, true to the "lite"/low-bandwidth requirement.
  - DO NOT build server-side rendering for the full authenticated app experience — this route is guest-facing only, entirely separate from the Flutter app's own screens.

## 4. Interfaces & Data Contracts

- Shared RSVP logic extraction (`api/lib/rsvp.ts`), used by both the GraphQL `submitRsvp` resolver and the new REST route:
  ```typescript
  export async function applyRsvp(context: KeystoneContext, params: {
    inviteToken: string; status: RsvpStatus; partySize?: number;
    meal?: string; dietary?: string; songRequest?: string; note?: string;
  }) {
    // the guest-lookup + field-gating + update logic currently inline in the
    // submitRsvp GraphQL resolver, extracted so the REST route can call it too.
  }
  ```
- REST routes (`api/routes/public-invite.ts`):
  ```typescript
  export async function renderInvitePage(req, res) {
    const event = await context.sudo().query.Event.findOne({ where: { id: req.params.eventId }, query: '...' });
    if (!event) return res.status(404).send(renderNotFoundHtml());
    res.set('Content-Type', 'text/html').send(renderInviteHtml(event));
  }
  export async function submitPublicRsvp(req, res) {
    await applyRsvp(context, { inviteToken: req.body.inviteToken, status: req.body.status, partySize: Number(req.body.partySize) });
    res.redirect(`/invite/${req.params.eventId}?rsvp=success`);
  }
  ```
  `meal`/`dietary`/`songRequest`/`note` are never read from `req.body` here — the REST route only ever passes `status`/`partySize` to `applyRsvp`, enforcing the "no custom questions on the web" rule at the route level, not just the UI level.

## 5. Git & Version Control Rules

- Base Branch: Branch off `dev`, pull latest first.
- Branch Naming Convention: `feature/lite-fallback`
- Target Branch Name: `feature/lite-fallback`
- Commit Standard: Conventional Commits, atomic per step. CRITICAL: do not mention the AI agent name or brand used.
- Final Action: Push to remote and output the `git push` command used.

## 6. File Operations

- Create:
  - `api/routes/public-invite.ts` — route handlers + inline HTML templates.
  - `api/routes/public-invite.test.ts`
- Modify:
  - `api/lib/rsvp.ts` — extract `applyRsvp` shared logic; update the GraphQL `submitRsvp` resolver to call it.
  - `api/keystone.ts` — register the two new routes.

## 7. Implementation Steps

1. Checkout `feature/lite-fallback` from `dev`.
2. Extract `applyRsvp` from the existing `submitRsvp` resolver in `api/lib/rsvp.ts`; update the GraphQL resolver to call it (no behavior change for the existing GraphQL path — verify M3's tests still pass).
3. Implement `renderInvitePage`/`submitPublicRsvp` in `api/routes/public-invite.ts`.
4. Register both routes in `api/keystone.ts`.
5. Write tests per Section 9; run them.
6. Commit atomically (extraction refactor, then new routes, then tests) and push.

## 8. Error Handling & Edge Cases

- `eventId` not found or soft-deleted: renders a simple "This invitation is no longer available" HTML page, HTTP 404.
- `POST /invite/:eventId/rsvp` with an invalid `inviteToken`: redirects back to the invite page with an error query param (`?rsvp=error`), rendered as an inline message — no raw error page.
- Malicious/unexpected `status` value: rejected by the same `select` field validation `Guest.status` already enforces (via `applyRsvp` calling the same underlying Keystone mutation logic).
- Extracting `applyRsvp` must not change `submitRsvp`'s existing behavior or GraphQL error shape — covered by re-running M3's existing test suite as a regression check (Section 9).

## 9. Testing Requirements

**Project type:** API-only

### 9a. Unit Testing

- Test Framework: Vitest.
- Test File Location: `api/routes/public-invite.test.ts`.
- Coverage Required:
  - [ ] `GET /invite/:eventId` renders HTML with the event's title/date/venue for a valid event.
  - [ ] `GET /invite/:eventId` returns 404 HTML for an unknown/soft-deleted event.
  - [ ] `POST /invite/:eventId/rsvp` with a valid token updates the guest and redirects with `?rsvp=success`.
  - [ ] `POST /invite/:eventId/rsvp` with an invalid token redirects with `?rsvp=error`, no guest modified.
  - [ ] `POST /invite/:eventId/rsvp` ignores any `meal`/`dietary`/`songRequest`/`note` fields even if present in the request body.
  - [ ] Regression: `.docs/specs/api/rsvp-flow.md`'s existing `submitRsvp` test suite still passes after the `applyRsvp` extraction.
  - [ ] Edge cases from Section 8 covered.
- Do NOT: write integration tests hitting a real database.

### 9c. Test Execution

- Command: `cd api && npx vitest run`
- CRITICAL: all tests pass before the push step in Section 5.

## 10. Acceptance Criteria

- [ ] Pushed to `feature/lite-fallback`.
- [ ] `/invite/:eventId` renders a working, framework-free HTML page with a functional Yes/No + count RSVP form.
- [ ] No custom RSVP questions are ever accepted through this route, regardless of `Event.isPremium`.
- [ ] `submitRsvp`'s existing GraphQL behavior is unchanged (regression-tested).
- [ ] All tests defined in Section 9 pass.
