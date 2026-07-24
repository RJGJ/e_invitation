// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from '@keystone-6/core'
import cors from 'cors'

// to keep this file tidy, we define our schema in a different file
import { lists } from './schema'

// authentication is configured separately here too, but you might move this elsewhere
// when you write your list-level access control functions, as they typically rely on session data
import { withAuth, session } from './auth'

import { jwtAuthMiddleware } from './lib/auth-middleware'
import { createAuthRouter } from './routes/auth'
import { mediaStorage } from './lib/media-storage'

import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

export default withAuth(
  config({
    server: {
      port: Number.parseInt(process.env.APP_PORT || '3000'),
      extendExpressApp: (app, commonContext) => {
        // Allow the Nuxt web client and Capacitor's native webviews to call
        // this API cross-origin. The Flutter app never went through a
        // browser, so this was never needed until now.
        app.use(
          cors({
            origin: [
              process.env.CORS_ORIGIN_DEV || 'http://localhost:3000',
              'capacitor://localhost',
              'http://localhost',
            ],
          }),
        )

        // Verify JWTs on incoming requests and attach the decoded payload
        // to req.jwtPayload for the session strategy to consume.
        app.use(jwtAuthMiddleware)

        // REST endpoints for JWT-based login/refresh/logout.
        app.use('/api/auth', createAuthRouter(commonContext))

        // Media uploads go through Keystone's standard GraphQL mutations
        // (Media.image is a native image() field) — no custom route needed.
        // For the local driver, Keystone auto-mounts the /uploads static
        // route itself via storageConfig.localImages.serverRoute.
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
    storage: mediaStorage.storageConfig,
  }),
)
