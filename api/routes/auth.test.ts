import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createAuthRouter } from './auth'
import { createMockContext } from '../test/mock-context'
import { hashToken, verifyAccessToken } from '../lib/jwt'

const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'user@example.com',
  isAdmin: false,
}

function buildApp() {
  const { commonContext, dbUser, graphqlRaw } = createMockContext()
  const app = express()
  app.use('/api/auth', createAuthRouter(commonContext))
  return { app, commonContext, dbUser, graphqlRaw }
}

function mockSuccessfulAuth(graphqlRaw: ReturnType<typeof createMockContext>['graphqlRaw']) {
  graphqlRaw.mockResolvedValueOnce({
    data: { authenticateUserWithPassword: { item: user } },
  })
}

function mockFailedAuth(graphqlRaw: ReturnType<typeof createMockContext>['graphqlRaw']) {
  graphqlRaw.mockResolvedValueOnce({
    data: {
      authenticateUserWithPassword: { message: 'Authentication failed.' },
    },
  })
}

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const { app } = buildApp()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'pw' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const { app } = buildApp()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email })

    expect(res.status).toBe(400)
  })

  it('returns 200 with accessToken, refreshToken, and user on valid credentials', async () => {
    const { app, graphqlRaw, dbUser } = buildApp()
    mockSuccessfulAuth(graphqlRaw)
    dbUser.updateOne.mockResolvedValueOnce({})

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correct-password' })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toEqual(expect.any(String))
    expect(res.body.refreshToken).toEqual(expect.any(String))
    expect(res.body.user).toEqual(user)
  })

  it('stores the hashed refresh token via sudo().db.User.updateOne', async () => {
    const { app, graphqlRaw, dbUser } = buildApp()
    mockSuccessfulAuth(graphqlRaw)
    dbUser.updateOne.mockResolvedValueOnce({})

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correct-password' })

    expect(dbUser.updateOne).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { refreshToken: hashToken(res.body.refreshToken) },
    })
  })

  it("uses withRequest(req, res)'s graphql.raw, not commonContext.graphql.raw directly", async () => {
    const { app, commonContext, graphqlRaw, dbUser } = buildApp()
    mockSuccessfulAuth(graphqlRaw)
    dbUser.updateOne.mockResolvedValueOnce({})
    // commonContext intentionally has no top-level `graphql` property — if the
    // route called commonContext.graphql.raw directly instead of binding via
    // withRequest first, this would throw a TypeError and the request would 500.
    expect((commonContext as any).graphql).toBeUndefined()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correct-password' })

    expect(commonContext.withRequest).toHaveBeenCalledOnce()
    expect(res.status).toBe(200)
  })

  it('returns 401 "Invalid email or password" for a wrong password', async () => {
    const { app, graphqlRaw } = buildApp()
    mockFailedAuth(graphqlRaw)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid email or password' })
  })

  it('returns the identical 401 body for a nonexistent email (enumeration-safety)', async () => {
    const { app, graphqlRaw } = buildApp()
    mockFailedAuth(graphqlRaw)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid email or password' })
  })

  it('returns 500 when graphql.raw rejects', async () => {
    const { app, graphqlRaw } = buildApp()
    graphqlRaw.mockRejectedValueOnce(new Error('db unreachable'))

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'whatever' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Internal server error' })
  })
})

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refreshToken is missing', async () => {
    const { app } = buildApp()

    const res = await request(app).post('/api/auth/refresh').send({})

    expect(res.status).toBe(400)
  })

  it('returns 200 with a new accessToken when the hashed token matches a stored user', async () => {
    const { app, dbUser } = buildApp()
    dbUser.findMany.mockResolvedValueOnce([user])

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'some-opaque-refresh-token' })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toEqual(expect.any(String))
    expect(verifyAccessToken(res.body.accessToken)).toMatchObject({
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })
  })

  it('returns 401 when no user matches the hashed token', async () => {
    const { app, dbUser } = buildApp()
    dbUser.findMany.mockResolvedValueOnce([])

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'garbage-token' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid or expired refresh token' })
  })
})

describe('POST /api/auth/logout', () => {
  it('returns 400 when refreshToken is missing', async () => {
    const { app } = buildApp()

    const res = await request(app).post('/api/auth/logout').send({})

    expect(res.status).toBe(400)
  })

  it('clears the refresh token and returns success when the token matches a user', async () => {
    const { app, dbUser } = buildApp()
    dbUser.findMany.mockResolvedValueOnce([user])
    dbUser.updateOne.mockResolvedValueOnce({})

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-opaque-refresh-token' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(dbUser.updateOne).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { refreshToken: null },
    })
  })

  it('returns success without revealing validity when no user matches', async () => {
    const { app, dbUser } = buildApp()
    dbUser.findMany.mockResolvedValueOnce([])

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'garbage-token' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(dbUser.updateOne).not.toHaveBeenCalled()
  })
})

describe('logout then refresh (mock-continuity)', () => {
  it('rejects a refresh with the same token after logout', async () => {
    const { app, dbUser } = buildApp()

    // Simulates DB state across two mocked calls (logout clears the row, so the
    // next lookup finds nothing) — not real persistence, since Postgres is
    // intentionally out of scope for this suite.
    dbUser.findMany.mockResolvedValueOnce([user])
    dbUser.updateOne.mockResolvedValueOnce({})
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-opaque-refresh-token' })
    expect(logoutRes.body).toEqual({ success: true })

    dbUser.findMany.mockResolvedValueOnce([])
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'some-opaque-refresh-token' })

    expect(refreshRes.status).toBe(401)
  })
})
