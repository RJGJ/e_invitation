// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from '@keystone-6/core'

// to keep this file tidy, we define our schema in a different file
import { lists } from './schema'

// authentication is configured separately here too, but you might move this elsewhere
// when you write your list-level access control functions, as they typically rely on session data
import { withAuth, session } from './auth'

import { jwtAuthMiddleware } from './lib/auth-middleware'
import { createAuthRouter } from './routes/auth'
import { createMediaRouter } from './routes/media'

import express from 'express'
import path from 'node:path'

import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

export default withAuth(
  config({
    server: {
      port: Number.parseInt(process.env.APP_PORT || '3000'),
      extendExpressApp: (app, commonContext) => {
        // Verify JWTs on incoming requests and attach the decoded payload
        // to req.jwtPayload for the session strategy to consume.
        app.use(jwtAuthMiddleware)

        // REST endpoints for JWT-based login/refresh/logout.
        app.use('/api/auth', createAuthRouter(commonContext))

        // REST endpoints for media upload/delete.
        app.use('/api/media', createMediaRouter(commonContext))

        // In local dev (the default), serve uploaded files back over HTTP
        // so STORAGE_LOCAL_PUBLIC_URL resolves to something real. S3/GCS
        // serve files directly from the bucket, so this is skipped there.
        if ((process.env.STORAGE_DRIVER || 'local') === 'local') {
          app.use(
            '/uploads',
            express.static(path.resolve(process.env.STORAGE_LOCAL_DIR || './uploads')),
          )
        }
      },
    },
    db: {
      provider: 'postgresql',
      url: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      onConnect: async (context) => {
        /* ... */
      },
      // Optional advanced configuration
      enableLogging: true,
      idField: { kind: 'uuid' },
    },
    lists,
    session,
  }),
)
