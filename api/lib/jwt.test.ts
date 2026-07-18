import { describe, it, expect } from 'vitest'
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  hashToken,
} from './jwt'

const user = { id: 'user-1', email: 'user@example.com', isAdmin: true }

describe('generateAccessToken', () => {
  it('signs a token whose payload matches the input user', () => {
    const token = generateAccessToken(user)
    const decoded = jwt.decode(token) as any

    expect(decoded.sub).toBe(user.id)
    expect(decoded.email).toBe(user.email)
    expect(decoded.isAdmin).toBe(user.isAdmin)
  })

  it('produces a token verifiable by verifyAccessToken', () => {
    const token = generateAccessToken(user)
    const payload = verifyAccessToken(token)

    expect(payload.sub).toBe(user.id)
    expect(payload.email).toBe(user.email)
    expect(payload.isAdmin).toBe(user.isAdmin)
  })
})

describe('generateRefreshToken', () => {
  it('returns an 80-character hex string (40 bytes)', () => {
    const token = generateRefreshToken()

    expect(token).toMatch(/^[0-9a-f]{80}$/)
  })

  it('returns a different value on each call', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()

    expect(a).not.toBe(b)
  })
})

describe('verifyAccessToken', () => {
  it('returns the decoded payload for a valid token', () => {
    const token = generateAccessToken(user)

    expect(verifyAccessToken(token)).toMatchObject({
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    })
  })

  it('throws TokenExpiredError for an expired token', () => {
    const expired = jwt.sign(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: -10 },
    )

    expect(() => verifyAccessToken(expired)).toThrow(TokenExpiredError)
  })

  it('throws JsonWebTokenError for a token signed with a different secret', () => {
    const wrongSecret = jwt.sign(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      'a-completely-different-secret',
    )

    expect(() => verifyAccessToken(wrongSecret)).toThrow(JsonWebTokenError)
  })

  it('throws JsonWebTokenError for a malformed token string', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow(JsonWebTokenError)
  })
})

describe('hashToken', () => {
  it('returns the correct SHA-256 hex digest for a known input', () => {
    // echo -n "hello" | sha256sum
    expect(hashToken('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    )
  })

  it('is deterministic', () => {
    expect(hashToken('some-token')).toBe(hashToken('some-token'))
  })

  it('produces different output for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'))
  })
})
