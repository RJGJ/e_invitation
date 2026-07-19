import { createLocalDriver } from './local'
import { createS3Driver } from './s3'
import { createGcsDriver } from './gcs'
import type { StorageDriver } from './types'

function requireVars(env: NodeJS.ProcessEnv, names: string[]): Record<string, string> {
  const missing = names.filter((name) => !env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required env var(s) for storage driver: ${missing.join(', ')}`)
  }
  return Object.fromEntries(names.map((name) => [name, env[name] as string]))
}

export function resolveStorageDriver(env: NodeJS.ProcessEnv = process.env): StorageDriver {
  const driver = env.STORAGE_DRIVER || 'local'

  switch (driver) {
    case 'local': {
      const vars = requireVars(env, ['STORAGE_LOCAL_DIR', 'STORAGE_LOCAL_PUBLIC_URL'])
      return createLocalDriver({
        dir: vars.STORAGE_LOCAL_DIR,
        publicUrl: vars.STORAGE_LOCAL_PUBLIC_URL,
      })
    }

    case 's3': {
      const vars = requireVars(env, [
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ])
      return createS3Driver({
        bucket: vars.S3_BUCKET,
        region: vars.S3_REGION,
        accessKeyId: vars.S3_ACCESS_KEY_ID,
        secretAccessKey: vars.S3_SECRET_ACCESS_KEY,
        publicUrlBase: env.S3_PUBLIC_URL_BASE || undefined,
      })
    }

    case 'gcs': {
      const vars = requireVars(env, [
        'GCS_BUCKET',
        'GCS_PROJECT_ID',
        'GCS_CLIENT_EMAIL',
        'GCS_PRIVATE_KEY',
      ])
      return createGcsDriver({
        bucket: vars.GCS_BUCKET,
        projectId: vars.GCS_PROJECT_ID,
        clientEmail: vars.GCS_CLIENT_EMAIL,
        privateKey: vars.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        publicUrlBase: env.GCS_PUBLIC_URL_BASE || undefined,
      })
    }

    default:
      throw new Error(`Unrecognized STORAGE_DRIVER: "${driver}"`)
  }
}

export const storageDriver: StorageDriver = resolveStorageDriver()

export type { StorageDriver, UploadInput, UploadResult } from './types'
