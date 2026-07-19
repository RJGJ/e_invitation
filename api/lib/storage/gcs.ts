import { Storage } from '@google-cloud/storage'
import type { StorageDriver, UploadInput, UploadResult } from './types'

export interface GcsDriverConfig {
  bucket: string
  projectId: string
  clientEmail: string
  privateKey: string
  publicUrlBase?: string
}

export function createGcsDriver(config: GcsDriverConfig): StorageDriver {
  const storage = new Storage({
    projectId: config.projectId,
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
  })
  const bucket = storage.bucket(config.bucket)

  return {
    kind: 'gcs',
    async upload({ buffer, key, mimeType }: UploadInput): Promise<UploadResult> {
      await bucket.file(key).save(buffer, { contentType: mimeType })

      const url = config.publicUrlBase
        ? `${config.publicUrlBase.replace(/\/$/, '')}/${key}`
        : `https://storage.googleapis.com/${config.bucket}/${key}`

      return { key, url }
    },
  }
}
