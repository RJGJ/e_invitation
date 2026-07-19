import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StorageDriver, UploadInput, UploadResult } from './types'

export interface S3DriverConfig {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  publicUrlBase?: string
}

export function createS3Driver(config: S3DriverConfig): StorageDriver {
  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return {
    kind: 's3',
    async upload({ buffer, key, mimeType }: UploadInput): Promise<UploadResult> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      )

      const url = config.publicUrlBase
        ? `${config.publicUrlBase.replace(/\/$/, '')}/${key}`
        : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`

      return { key, url }
    },
  }
}
