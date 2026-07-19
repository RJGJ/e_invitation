import type { KeystoneConfig } from '@keystone-6/core/types'

import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

export type MediaStorageConfig = NonNullable<KeystoneConfig['storage']>

export interface ResolvedMediaStorage {
  storageConfig: MediaStorageConfig
  activeStorageName: string
}

function requireVars(env: NodeJS.ProcessEnv, names: string[]): Record<string, string> {
  const missing = names.filter((name) => !env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required env var(s) for media storage: ${missing.join(', ')}`)
  }
  return Object.fromEntries(names.map((name) => [name, env[name] as string]))
}

function buildGenerateUrl(base: string | undefined): ((path: string) => string) | undefined {
  if (!base) return undefined
  const trimmed = base.replace(/\/$/, '')
  return (path: string) => `${trimmed}${path}`
}

// Resolves which single storage backend all Media.image uploads use. The
// active driver is picked once, at server startup, from STORAGE_DRIVER — a
// field's `storage` is fixed to one named entry at schema-build time, so
// there is no per-upload/per-record choice possible, by construction.
export function resolveMediaStorage(env: NodeJS.ProcessEnv = process.env): ResolvedMediaStorage {
  const driver = env.STORAGE_DRIVER || 'local'

  switch (driver) {
    case 'local': {
      const vars = requireVars(env, ['STORAGE_LOCAL_DIR', 'STORAGE_LOCAL_PUBLIC_URL'])
      return {
        activeStorageName: 'localImages',
        storageConfig: {
          localImages: {
            kind: 'local',
            type: 'image',
            storagePath: vars.STORAGE_LOCAL_DIR,
            generateUrl: buildGenerateUrl(vars.STORAGE_LOCAL_PUBLIC_URL) as (path: string) => string,
            serverRoute: { path: '/uploads' },
          },
        },
      }
    }

    case 's3': {
      const vars = requireVars(env, [
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ])
      return {
        activeStorageName: 's3Images',
        storageConfig: {
          s3Images: {
            kind: 's3',
            type: 'image',
            bucketName: vars.S3_BUCKET,
            region: vars.S3_REGION,
            accessKeyId: vars.S3_ACCESS_KEY_ID,
            secretAccessKey: vars.S3_SECRET_ACCESS_KEY,
            generateUrl: buildGenerateUrl(env.S3_PUBLIC_URL_BASE),
          },
        },
      }
    }

    // Experimental: Keystone's built-in storage only has 'local' and 's3'
    // kinds, so GCS goes through the 's3' kind's optional `endpoint` override
    // against GCS's S3-interoperability API, using GCS HMAC keys (not the
    // service-account credentials a native GCS SDK would use). Unverified
    // against a live bucket — see media-storage spec's deferred list.
    case 'gcs': {
      const vars = requireVars(env, [
        'GCS_BUCKET',
        'GCS_HMAC_ACCESS_KEY_ID',
        'GCS_HMAC_SECRET_ACCESS_KEY',
      ])
      return {
        activeStorageName: 'gcsImages',
        storageConfig: {
          gcsImages: {
            kind: 's3',
            type: 'image',
            bucketName: vars.GCS_BUCKET,
            region: 'auto',
            endpoint: 'https://storage.googleapis.com',
            accessKeyId: vars.GCS_HMAC_ACCESS_KEY_ID,
            secretAccessKey: vars.GCS_HMAC_SECRET_ACCESS_KEY,
            forcePathStyle: true,
            generateUrl: buildGenerateUrl(env.GCS_PUBLIC_URL_BASE),
          },
        },
      }
    }

    default:
      throw new Error(`Unrecognized STORAGE_DRIVER: "${driver}"`)
  }
}

export const mediaStorage: ResolvedMediaStorage = resolveMediaStorage()
