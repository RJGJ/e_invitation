# Implementation Plan: JWT Authentication for KeystoneJS API

## Goal Description

Add JWT-based authentication to the KeystoneJS API (`api/`) so that external clients (the `app` frontend, future mobile clients) can authenticate via stateless tokens instead of cookies. The existing cookie-based Admin UI auth must remain fully functional.

Based on the spec at [jwt-auth.md](file:///home/rjgj/personal_projects/e_invitation/.docs/specs/api/jwt-auth.md).

### Architecture Overview

```mermaid
sequenceDiagram
    participant Client as Frontend / Client
    participant MW as JWT Middleware
    participant Routes as /api/auth/*
    participant KS as Keystone Context
    participant DB as PostgreSQL

    Note over Client,DB: Login Flow
    Client->>Routes: POST /api/auth/login {email, password}
    Routes->>KS: context.sudo().db.User.findMany({where: {email}})
    KS->>DB: SELECT * FROM "User" WHERE email = ?
    DB-->>KS: User record
    KS-->>Routes: User (with hashed password)
    Routes->>Routes: Verify password (bcrypt compare via Keystone's internal validateSecret)
    Routes->>Routes: Generate accessToken (JWT, 24h) + refreshToken (random)
    Routes->>KS: context.sudo().db.User.updateOne({data: {refreshToken: hash}})
    KS->>DB: UPDATE "User" SET "refreshToken" = ?
    Routes-->>Client: {accessToken, refreshToken, user}

    Note over Client,DB: Authenticated Request Flow
    Client->>MW: GraphQL request + Authorization: Bearer <accessToken>
    MW->>MW: Verify JWT signature & expiry
    MW->>MW: Attach decoded payload to req
    MW->>KS: next() → Keystone resolves session from req
    KS->>DB: Query data with session context
    DB-->>KS: Results
    KS-->>Client: GraphQL response

    Note over Client,DB: Token Refresh Flow
    Client->>Routes: POST /api/auth/refresh {refreshToken}
    Routes->>DB: Find user by hashed refreshToken
    DB-->>Routes: User record
    Routes->>Routes: Generate new accessToken (JWT, 24h)
    Routes-->>Client: {accessToken}
```

## User Review Required

> [!IMPORTANT]
> **Single-device refresh tokens**: The spec stores one refresh token per user. Logging in on a second device will invalidate the first device's refresh token. If multi-device support is needed, this requires a separate `RefreshToken` list (deferred per spec).

> [!IMPORTANT]
> **Password verification approach**: Keystone doesn't expose its internal bcrypt compare function directly. The plan uses the `authenticateUserWithPassword` GraphQL mutation internally (via `context.graphql.raw`) to validate credentials, which is the sanctioned Keystone approach. This avoids reaching into Prisma internals.

> [!WARNING]
> **SESSION_SECRET missing from `.env`**: The current `.env` has no `SESSION_SECRET` entry, but `auth.ts` references `process.env.SESSION_SECRET`. This should be added alongside the JWT secrets.

## Open Questions

> [!IMPORTANT]
> **Access token expiry duration** — The spec sets 15 minutes. Confirm this is acceptable for your use case. Shorter = more secure but more refresh calls. ANSWER: 24 hours.

---

## Proposed Changes

### Component 1: Dependencies & Environment

#### [MODIFY] package.json

Install `jsonwebtoken` for token signing/verification.

```bash
cd api && npm install jsonwebtoken && npm install -D @types/jsonwebtoken
```

#### [MODIFY] .env

Add JWT secrets (values generated at implementation time):

```diff
 APP_PORT=3002
 DB_HOST=localhost
 DB_PORT=5432
 DB_NAME=rj_e_invitation_dev
 DB_USER=admin
 DB_PASSWORD=admin123
-1
+SESSION_SECRET=<generated-64-char-hex>
+JWT_SECRET=<generated-64-char-hex>
+JWT_REFRESH_SECRET=<generated-64-char-hex>
```

#### [MODIFY] .env.example

Add placeholder entries so other developers know which vars to set:

```
APP_PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
SESSION_SECRET=
JWT_SECRET=
JWT_REFRESH_SECRET=
```

---

### Component 2: JWT Utility Library

#### [NEW] lib/jwt.ts

Centralizes all JWT operations. Keeps token logic out of route handlers.

```typescript
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables.",
  );
}

export interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_EXPIRY = "24h";

/**
 * Signs a JWT access token with user claims.
 */
export function generateAccessToken(user: {
  id: string;
  email: string;
  isAdmin: boolean;
}): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

/**
 * Generates a cryptographically random opaque refresh token.
 */
export function generateRefreshToken(): string {
  return randomBytes(40).toString("hex");
}

/**
 * Verifies and decodes a JWT access token.
 * Throws if the token is expired or has an invalid signature.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload;
}

/**
 * SHA-256 hashes a refresh token before storage.
 * Prevents a DB leak from exposing usable tokens.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

---

### Component 3: Auth Route Handlers

#### [NEW] routes/auth.ts

Express router with three endpoints. Uses `context.sudo()` to bypass access control for internal auth operations.

```typescript
import { Router, type Request, type Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../lib/jwt";

import type { Context } from ".keystone/types";

export function createAuthRouter(commonContext: Context) {
  const router = Router();

  // Middleware to parse JSON bodies on auth routes
  router.use(require("express").json());

  /**
   * POST /api/auth/login
   * Validates credentials, returns access + refresh tokens.
   */
  router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      // Use Keystone's built-in authentication to validate credentials
      const result = await commonContext.graphql.raw({
        query: `
          mutation($email: String!, $password: String!) {
            authenticateUserWithPassword(email: $email, password: $password) {
              ... on UserAuthenticationWithPasswordSuccess {
                item {
                  id
                  name
                  email
                  isAdmin
                }
              }
              ... on UserAuthenticationWithPasswordFailure {
                message
              }
            }
          }
        `,
        variables: { email, password },
      });

      const authResult = result.data?.authenticateUserWithPassword;

      if (!authResult?.item) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = authResult.item;

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();
      const hashedRefreshToken = hashToken(refreshToken);

      // Store hashed refresh token on the user
      const sudoContext = commonContext.sudo();
      await sudoContext.db.User.updateOne({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/auth/refresh
   * Accepts a refresh token, returns a new access token.
   */
  router.post("/refresh", async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      const hashedToken = hashToken(refreshToken);
      const sudoContext = commonContext.sudo();

      // Find user with matching hashed refresh token
      const users = await sudoContext.db.User.findMany({
        where: { refreshToken: { equals: hashedToken } },
      });

      if (users.length === 0) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      const user = users[0];

      // Generate a new access token
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      });

      return res.status(200).json({ accessToken });
    } catch (error) {
      console.error("Refresh error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/auth/logout
   * Clears the refresh token, invalidating future refresh attempts.
   */
  router.post("/logout", async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      const hashedToken = hashToken(refreshToken);
      const sudoContext = commonContext.sudo();

      // Find user and clear their refresh token
      const users = await sudoContext.db.User.findMany({
        where: { refreshToken: { equals: hashedToken } },
      });

      if (users.length > 0) {
        await sudoContext.db.User.updateOne({
          where: { id: users[0].id },
          data: { refreshToken: null },
        });
      }

      // Always return success (don't reveal if the token was valid)
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
```

---

### Component 4: JWT Middleware

#### [NEW] lib/auth-middleware.ts

Express middleware that reads the `Authorization: Bearer` header, verifies the JWT, and attaches decoded session data to the request for Keystone to consume.

```typescript
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "./jwt";
import { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

// Extend Express Request to carry JWT session data
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload;
    }
  }
}

// Paths that should skip JWT verification entirely
const SKIP_PATHS = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"];

/**
 * Middleware that extracts and verifies JWT from the Authorization header.
 *
 * - If no Authorization header is present: continues as anonymous (no error).
 * - If token is valid: attaches decoded payload to req.jwtPayload.
 * - If token is expired or invalid: returns 401.
 */
export function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Skip auth routes and Admin UI paths
  if (
    SKIP_PATHS.some((p) => req.path.startsWith(p)) ||
    req.path.startsWith("/_next") ||
    req.path === "/"
  ) {
    return next();
  }

  const authHeader = req.headers.authorization;

  // No header → anonymous access (let Keystone access control decide)
  if (!authHeader) {
    return next();
  }

  // Malformed header → still allow through as anonymous
  if (!authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.jwtPayload = payload;
    return next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
}
```

---

### Component 5: Schema Update

#### [MODIFY] schema.ts

Add `refreshToken` field to the `User` list. Hidden from all Admin UI views.

```diff
 // in the User list fields:
     isAdmin: checkbox(),
+
+    refreshToken: text({
+      ui: {
+        itemView: { fieldMode: 'hidden' },
+        listView: { fieldMode: 'hidden' },
+        createView: { fieldMode: 'hidden' },
+      },
+      db: { isNullable: true },
+    }),
   },
 }),
```

This will trigger a Prisma migration adding a nullable `refreshToken` text column to the `User` table.

---

### Component 6: Keystone Configuration

#### [MODIFY] keystone.ts

Wire the JWT middleware and auth routes into the Express app via `server.extendExpressApp`. Also set up session resolution from JWT payload.

```diff
 import { config } from '@keystone-6/core'
 import { lists } from './schema'
 import { withAuth, session } from './auth'
+import { jwtAuthMiddleware } from './lib/auth-middleware'
+import { createAuthRouter } from './routes/auth'

 import dotenv from 'dotenv'
 dotenv.config({ path: '.env' })

 export default withAuth(
   config({
     server: {
       port: Number.parseInt(process.env.APP_PORT || '3000'),
+      extendExpressApp: (app, commonContext) => {
+        // Mount JWT verification middleware
+        app.use(jwtAuthMiddleware)
+
+        // Mount auth REST routes
+        app.use('/api/auth', createAuthRouter(commonContext))
+      },
     },
     db: {
       provider: 'postgresql',
       ...
     },
     lists,
     session,
   }),
 )
```

#### [MODIFY] auth.ts

Update the session strategy to also resolve sessions from JWT payloads (via `req.jwtPayload`) in addition to cookies.

```diff
-const session = statelessSessions({
-  maxAge: sessionMaxAge,
-  secret: process.env.SESSION_SECRET,
-})
+// Custom session strategy that supports both cookie-based sessions (Admin UI)
+// and JWT-based sessions (API clients)
+const session = {
+  ...statelessSessions({
+    maxAge: sessionMaxAge,
+    secret: process.env.SESSION_SECRET,
+  }),
+  get: async ({ context }: { context: any }) => {
+    // First try the default cookie-based session
+    const cookieSession = await statelessSessions({
+      maxAge: sessionMaxAge,
+      secret: process.env.SESSION_SECRET,
+    }).get({ context })
+
+    if (cookieSession) return cookieSession
+
+    // Fall back to JWT payload if present on the request
+    const jwtPayload = context.req?.jwtPayload
+    if (jwtPayload) {
+      return {
+        itemId: jwtPayload.sub,
+        data: { isAdmin: jwtPayload.isAdmin },
+        listKey: 'User',
+      }
+    }
+
+    return undefined
+  },
+}
```

> [!IMPORTANT]
> The session integration approach above is a **simplified illustration**. The actual Keystone `statelessSessions` API returns an object with `get`, `start`, and `end` methods. The implementation will need to spread the original session object and override only `get` to check `req.jwtPayload` as a fallback. I'll verify the exact API surface during implementation.

---

### Component 7: Automated Testing

Based on [Section 9 of the spec](file:///home/rjgj/personal_projects/e_invitation/.docs/specs/api/jwt-auth.md), which mandates a Vitest unit-test suite (API-only project, no UI in this feature). No test framework currently exists anywhere in the repo, so this component also establishes the convention for `api/`.

#### [MODIFY] package.json — dependencies

```bash
cd api && npm install -D vitest supertest @types/supertest
```

- `vitest` — the test runner, per spec §9a.
- `supertest` + `@types/supertest` — used only for `routes/auth.test.ts`, to exercise `createAuthRouter`'s handlers through a real `express()` app and a real `Response` object (via `request(app).post(...)`) instead of hand-rolling `req`/`res` mocks. This removes a whole class of "did I mock Express correctly" bugs and is the standard pairing for testing Express routers.
- No coverage package is added — the spec has no coverage threshold, only "all tests pass."
- No `tsconfig.json` changes are needed: Vitest transforms each file via esbuild independently of `tsconfig.json`'s `module`/`noEmit` settings, and discovers test files via its own glob (`**/*.test.ts`), not `tsconfig`'s `include`.

```diff
   "scripts": {
     "dev": "keystone dev",
     "start": "keystone start",
-    "build": "keystone build"
+    "build": "keystone build",
+    "test": "vitest run"
   },
```

#### [NEW] vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

#### [NEW] vitest.setup.ts

`lib/jwt.ts` throws at import time if `JWT_SECRET`/`JWT_REFRESH_SECRET` are unset, and its internal `dotenv.config()` call won't overwrite values already present in `process.env`. This setup file pre-seeds both before any test file (or the modules it imports) is evaluated — this must be a separate file, not inline in a test file, since `import` statements are hoisted above any same-file `process.env` assignment. It also makes the suite hermetic against `api/.env`, which is gitignored and won't exist in CI or on a fresh clone.

```typescript
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-do-not-use-in-production'
```

#### Mocking strategy

- `routes/auth.ts`'s handlers call `commonContext.sudo()` directly (used for `.db.User.updateOne`/`.db.User.findMany`) and, only in `/login`, `commonContext.withRequest(req, res)` (its resolved value is used for `.graphql.raw`). A shared test helper `api/test/mock-context.ts` builds a fake context with these as `vi.fn()`s, typed `as any` — tests never import the real `Context` type from `.keystone/types`, since that's a file generated by `keystone dev`/`build` (`node_modules/.keystone/types.ts`) that may not exist on a clean checkout. `routes/auth.ts`'s own `import type { Context }` is erased by esbuild at transform time regardless, so this is belt-and-suspenders rather than strictly required — but it avoids ever depending on Keystone having been built first.
- Route handlers (`/login`, `/refresh`, `/logout`) are tested via `supertest` against a minimal `express()` app that mounts the real `createAuthRouter(mockContext)` — this exercises real Express routing plus the router's own `json()` body-parser middleware, not just the handler function in isolation.
- `jwtAuthMiddleware` is tested via direct invocation (`jwtAuthMiddleware(req, res, next)` with hand-built minimal objects), since it's a plain function rather than a `Router` — no internals-coupling concern there.
- JWT tokens used in tests are generated with the **real** `jsonwebtoken`/`lib/jwt.ts` functions, not mocks — this is cheap, deterministic, and actually exercises the integration between `lib/jwt.ts` and `lib/auth-middleware.ts`:
  - Expired token: `jwt.sign(payload, secret, { expiresIn: -10 })` (produces an already-expired token instantly, no sleep/fake timers needed).
  - Tampered/invalid signature: sign with a different secret than `JWT_SECRET`, then verify against the real one.
  - The middleware's final catch-all branch (`401 { error: "Authentication failed" }`) is unreachable via real tokens, since real `jsonwebtoken` only ever throws `TokenExpiredError` or `JsonWebTokenError`. Covering it requires a scoped partial mock in just that one `describe` block:
    ```typescript
    vi.mock('../lib/jwt', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../lib/jwt')>()
      return { ...actual, verifyAccessToken: vi.fn(() => { throw new Error('boom') }) }
    })
    ```
    Call this out with a comment in the test file — it's a non-obvious gap in the "always use real tokens" strategy.

#### [NEW] lib/jwt.test.ts

- `generateAccessToken`: signs a token whose decoded payload's `sub`/`email`/`isAdmin` match the input user; the token is verifiable by `verifyAccessToken` (round-trip).
- `generateRefreshToken`: returns an 80-char hex string (40 bytes); returns a different value on each call.
- `verifyAccessToken`: returns the decoded payload for a valid token; throws `TokenExpiredError` for an expired token; throws `JsonWebTokenError` for a token signed with a different secret; throws `JsonWebTokenError` for a malformed/garbage token string.
- `hashToken`: returns the correct SHA-256 hex digest for a known input (fixed expected-value assertion); deterministic (same input → same output); distinct output for different inputs.

#### [NEW] lib/auth-middleware.test.ts

- Anonymous access: `next()` is called and `req.jwtPayload` is not set when the header is missing; same when the header doesn't start with `"Bearer "`; `res.status` is never called in either case.
- Valid token: attaches the decoded payload to `req.jwtPayload` (fields matching what was encoded) and calls `next()`.
- Expired token: returns `401 { error: "Token expired" }`, does not call `next()`.
- Invalid signature: returns `401 { error: "Invalid token" }` for a token signed with a different secret, does not call `next()`.
- Generic verify error (via the partial mock above): returns `401 { error: "Authentication failed" }`.
- `SKIP_PATHS`: calls `next()` unconditionally for `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/`, and `/_next/*` paths even with a bad/missing header.

#### [NEW] routes/auth.test.ts (+ [NEW] test/mock-context.ts)

- `POST /login`: 400 when `email` missing; 400 when `password` missing; 200 with `accessToken`+`refreshToken`+`user` on valid credentials; stores `hashToken(refreshToken)` via `sudo().db.User.updateOne` (assert the mock was called with the correctly-hashed value computed from the response body); asserts `commonContext.withRequest(req, res)`'s returned `graphql.raw` is used, not `commonContext.graphql.raw` directly; returns the *identical* `401 { error: "Invalid email or password" }` body for both a wrong password and a nonexistent email (enumeration-safety); 500 on `graphql.raw` rejection.
- `POST /refresh`: 400 when `refreshToken` missing; 200 with a new `accessToken` when the hashed token matches a stored user, and that token decodes (via `verifyAccessToken`) to the matched user's claims; 401 when no user matches, including for an arbitrary/garbage token string.
- `POST /logout`: 400 when `refreshToken` missing; 200 `{ success: true }` and calls `updateOne` with `refreshToken: null` when the token matches a user; 200 `{ success: true }` even when no user matches (does not reveal validity), and does **not** call `updateOne` in that case.
- Logout→refresh continuity: after a logout call, reconfigure the mock's `findMany` to resolve `[]` (simulating the now-cleared DB state) and confirm a subsequent `/refresh` with the same token returns 401 — document in a comment that this simulates DB state across two mocked calls, not real persistence, since Postgres is intentionally out of scope for this suite.

---

## Implementation Sequence

| Step | Action                                                           | Commit Message                                    |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Checkout `feature/jwt-auth` from `dev`                           | —                                                 |
| 2    | `npm install jsonwebtoken && npm install -D @types/jsonwebtoken` | `chore: add jsonwebtoken dependency`              |
| 3    | Add env vars to `.env` and `.env.example`                        | `chore: add JWT secret env variables`             |
| 4    | Create `api/lib/jwt.ts`                                          | `feat: add JWT utility library`                   |
| 5    | Add `refreshToken` field to User in `api/schema.ts`              | `feat: add refreshToken field to User schema`     |
| 6    | Create `api/routes/auth.ts`                                      | `feat: add JWT auth REST endpoints`               |
| 7    | Create `api/lib/auth-middleware.ts`                              | `feat: add JWT auth middleware`                   |
| 8    | Modify `api/keystone.ts` to mount middleware + routes            | `feat: wire JWT middleware into Keystone server`  |
| 9    | Modify `api/auth.ts` to resolve JWT sessions                     | `feat: extend session strategy with JWT fallback` |
| 10   | Run `keystone dev` to apply Prisma migration                     | `chore: apply refreshToken migration`             |
| 11   | `npm install -D vitest supertest @types/supertest`               | `chore: add vitest and supertest test dependencies` |
| 12   | Add `api/vitest.config.ts` and `api/vitest.setup.ts`              | `chore: configure vitest test environment`        |
| 13   | Add `"test": "vitest run"` to `api/package.json`                  | `chore: add test script`                          |
| 14   | Create `api/lib/jwt.test.ts`                                     | `test: add unit tests for JWT utility library`    |
| 15   | Create `api/lib/auth-middleware.test.ts`                          | `test: add unit tests for JWT auth middleware`    |
| 16   | Create `api/routes/auth.test.ts` (+ `api/test/mock-context.ts`)  | `test: add unit tests for JWT auth REST endpoints` |
| 17   | Run `cd api && npx vitest run`; fix any failures                 | —                                                 |
| 18   | Test all endpoints with `curl`                                   | —                                                 |
| 19   | Push to remote                                                   | —                                                 |

---

## Verification Plan

### Automated Tests

```bash
# Verify the project compiles
cd api && npx keystone build

# Run the automated test suite (unit tests, mocked Keystone context, no live DB)
cd api && npx vitest run
# Expect: all test files pass — lib/jwt.test.ts, lib/auth-middleware.test.ts, routes/auth.test.ts
```

Automated tests supplement the manual verification below rather than replacing it — the suite mocks the Keystone context and never touches Postgres, while the manual steps exercise the real DB and real GraphQL layer.

### Manual Verification

**1. Login — valid credentials:**

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}'
# Expected: 200 with {accessToken, refreshToken, user}
```

**2. Login — invalid credentials:**

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong"}'
# Expected: 401 with {error: "Invalid email or password"}
```

**3. Authenticated GraphQL query:**

```bash
curl -X POST http://localhost:3002/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"query": "{ authenticatedItem { ... on User { id email } } }"}'
# Expected: Returns the authenticated user
```

**4. Unauthenticated GraphQL query (no header):**

```bash
curl -X POST http://localhost:3002/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ authenticatedItem { ... on User { id email } } }"}'
# Expected: Returns null (no 401 error)
```

**5. Token refresh:**

```bash
curl -X POST http://localhost:3002/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken-from-login>"}'
# Expected: 200 with {accessToken}
```

**6. Logout:**

```bash
curl -X POST http://localhost:3002/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken-from-login>"}'
# Expected: 200 with {success: true}
# Then refresh should fail with 401
```

**7. Admin UI still works:**

- Navigate to `http://localhost:3002` in browser
- Log in via the Admin UI form
- Verify cookie-based session works as before

**8. Expired token:**

- Wait 15 minutes (or temporarily set expiry to `5s` for testing)
- Retry a GraphQL request with the old token
- Expected: `401 {error: "Token expired"}`
