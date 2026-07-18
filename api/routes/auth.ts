import { Router, json, type Request, type Response } from 'express'
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../lib/jwt'

import type { Context } from '.keystone/types'

export function createAuthRouter(commonContext: Context) {
  const router = Router()

  // Middleware to parse JSON bodies on auth routes
  router.use(json())

  /**
   * POST /api/auth/login
   * Validates credentials, returns access + refresh tokens.
   */
  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
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
      })

      const authResult = result.data?.authenticateUserWithPassword as any

      if (!authResult?.item) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const user = authResult.item

      // Generate tokens
      const accessToken = generateAccessToken(user)
      const refreshToken = generateRefreshToken()
      const hashedRefreshToken = hashToken(refreshToken)

      // Store hashed refresh token on the user
      const sudoContext = commonContext.sudo()
      await sudoContext.db.User.updateOne({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      })

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * POST /api/auth/refresh
   * Accepts a refresh token, returns a new access token.
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' })
    }

    try {
      const hashedToken = hashToken(refreshToken)
      const sudoContext = commonContext.sudo()

      // Find user with matching hashed refresh token
      const users = await sudoContext.db.User.findMany({
        where: { refreshToken: { equals: hashedToken } },
      })

      if (users.length === 0) {
        return res
          .status(401)
          .json({ error: 'Invalid or expired refresh token' })
      }

      const user = users[0]

      // Generate a new access token
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      })

      return res.status(200).json({ accessToken })
    } catch (error) {
      console.error('Refresh error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * POST /api/auth/logout
   * Clears the refresh token, invalidating future refresh attempts.
   */
  router.post('/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' })
    }

    try {
      const hashedToken = hashToken(refreshToken)
      const sudoContext = commonContext.sudo()

      // Find user and clear their refresh token
      const users = await sudoContext.db.User.findMany({
        where: { refreshToken: { equals: hashedToken } },
      })

      if (users.length > 0) {
        await sudoContext.db.User.updateOne({
          where: { id: users[0].id },
          data: { refreshToken: null },
        })
      }

      // Always return success (don't reveal if the token was valid)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Logout error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
