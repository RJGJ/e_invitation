import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'node:crypto'

import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables.',
  )
}

export interface JwtPayload {
  sub: string
  email: string
  isAdmin: boolean
  iat: number
  exp: number
}

const ACCESS_TOKEN_EXPIRY = '24h'

/**
 * Signs a JWT access token with user claims.
 */
export function generateAccessToken(user: {
  id: string
  email: string
  isAdmin: boolean
}): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  )
}

/**
 * Generates a cryptographically random opaque refresh token.
 */
export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex')
}

/**
 * Verifies and decodes a JWT access token.
 * Throws if the token is expired or has an invalid signature.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload
}

/**
 * SHA-256 hashes a refresh token before storage.
 * Prevents a DB leak from exposing usable tokens.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
