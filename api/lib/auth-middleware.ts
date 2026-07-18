import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, type JwtPayload } from './jwt'
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'

// Extend Express Request to carry JWT session data
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload
    }
  }
}

// Paths that should skip JWT verification entirely
const SKIP_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']

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
    req.path.startsWith('/_next') ||
    req.path === '/'
  ) {
    return next()
  }

  const authHeader = req.headers.authorization

  // No header → anonymous access (let Keystone access control decide)
  if (!authHeader) {
    return next()
  }

  // Malformed header → still allow through as anonymous
  if (!authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    req.jwtPayload = payload
    return next()
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' })
    }
    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    return res.status(401).json({ error: 'Authentication failed' })
  }
}
