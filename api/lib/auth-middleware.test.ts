import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { jwtAuthMiddleware } from './auth-middleware'
import * as jwtModule from './jwt'

const user = { id: 'user-1', email: 'user@example.com', isAdmin: false }

function buildReq(overrides: Partial<Request> = {}): Request {
  return { path: '/api/graphql', headers: {}, ...overrides } as Request
}

function buildRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('anonymous access', () => {
  it('calls next() and does not set req.jwtPayload when the header is missing', () => {
    const req = buildReq()
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.jwtPayload).toBeUndefined()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() and does not set req.jwtPayload when the header is malformed', () => {
    const req = buildReq({ headers: { authorization: 'Basic abc123' } })
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.jwtPayload).toBeUndefined()
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('valid token', () => {
  it('attaches the decoded payload to req.jwtPayload and calls next()', () => {
    const token = jwtModule.generateAccessToken(user)
    const req = buildReq({ headers: { authorization: `Bearer ${token}` } })
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.jwtPayload).toMatchObject({
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })
  })
})

describe('expired token', () => {
  it('returns 401 Token expired and does not call next()', () => {
    const expired = jwt.sign(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: -10 },
    )
    const req = buildReq({ headers: { authorization: `Bearer ${expired}` } })
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('invalid signature', () => {
  it('returns 401 Invalid token and does not call next()', () => {
    const tampered = jwt.sign(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      'a-completely-different-secret',
    )
    const req = buildReq({ headers: { authorization: `Bearer ${tampered}` } })
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('generic verify error', () => {
  // Real jsonwebtoken only ever throws TokenExpiredError or JsonWebTokenError
  // (TokenExpiredError is itself a subclass of JsonWebTokenError), so the
  // middleware's final catch-all branch is unreachable with a real token.
  // Force it here by stubbing verifyAccessToken to throw a plain Error.
  it('returns 401 Authentication failed when verifyAccessToken throws a non-JWT error', () => {
    vi.spyOn(jwtModule, 'verifyAccessToken').mockImplementation(() => {
      throw new Error('boom')
    })
    const req = buildReq({ headers: { authorization: 'Bearer whatever' } })
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('SKIP_PATHS', () => {
  it.each([
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/',
    '/_next/static/chunk.js',
  ])('calls next() unconditionally for %s even with a bad header', (path) => {
    const req = buildReq({ path, headers: { authorization: 'Bearer garbage' } })
    const res = buildRes()
    const next = vi.fn() as NextFunction

    jwtAuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })
})
