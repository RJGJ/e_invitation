import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveMediaStorage } from './media-storage'

describe('resolveMediaStorage', () => {
  it('defaults to local when STORAGE_DRIVER is unset', () => {
    const result = resolveMediaStorage({
      STORAGE_LOCAL_DIR: './uploads',
      STORAGE_LOCAL_PUBLIC_URL: 'http://localhost:3002/uploads',
    } as NodeJS.ProcessEnv)

    expect(result.activeStorageName).toBe('localImages')
    const config = result.storageConfig.localImages as any
    expect(config.kind).toBe('local')
    expect(config.type).toBe('image')
    expect(config.storagePath).toBe('./uploads')
    expect(config.serverRoute).toEqual({ path: '/uploads' })
    expect(config.generateUrl('/abc.jpg')).toBe('http://localhost:3002/uploads/abc.jpg')
  })

  it('throws naming the missing var(s) when local config is incomplete', () => {
    expect(() =>
      resolveMediaStorage({ STORAGE_DRIVER: 'local' } as NodeJS.ProcessEnv),
    ).toThrow(/STORAGE_LOCAL_DIR/)
  })

  it('builds the s3 storage config when all required vars are present', () => {
    const result = resolveMediaStorage({
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'bucket',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'id',
      S3_SECRET_ACCESS_KEY: 'secret',
    } as NodeJS.ProcessEnv)

    expect(result.activeStorageName).toBe('s3Images')
    const config = result.storageConfig.s3Images as any
    expect(config.kind).toBe('s3')
    expect(config.type).toBe('image')
    expect(config.bucketName).toBe('bucket')
    expect(config.region).toBe('us-east-1')
    expect(config.accessKeyId).toBe('id')
    expect(config.secretAccessKey).toBe('secret')
    expect(config.generateUrl).toBeUndefined()
  })

  it('uses S3_PUBLIC_URL_BASE for generateUrl when provided', () => {
    const result = resolveMediaStorage({
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'bucket',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'id',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_PUBLIC_URL_BASE: 'https://cdn.example.com/',
    } as NodeJS.ProcessEnv)

    const config = result.storageConfig.s3Images as any
    expect(config.generateUrl('/abc.jpg')).toBe('https://cdn.example.com/abc.jpg')
  })

  it('throws naming the missing var(s) when s3 config is incomplete', () => {
    expect(() =>
      resolveMediaStorage({ STORAGE_DRIVER: 's3', S3_BUCKET: 'bucket' } as NodeJS.ProcessEnv),
    ).toThrow(/S3_REGION/)
  })

  it('builds the gcs storage config (s3 kind + GCS S3-interop endpoint) when all required vars are present', () => {
    const result = resolveMediaStorage({
      STORAGE_DRIVER: 'gcs',
      GCS_BUCKET: 'bucket',
      GCS_HMAC_ACCESS_KEY_ID: 'hmac-id',
      GCS_HMAC_SECRET_ACCESS_KEY: 'hmac-secret',
    } as NodeJS.ProcessEnv)

    expect(result.activeStorageName).toBe('gcsImages')
    const config = result.storageConfig.gcsImages as any
    expect(config.kind).toBe('s3')
    expect(config.type).toBe('image')
    expect(config.bucketName).toBe('bucket')
    expect(config.endpoint).toBe('https://storage.googleapis.com')
    expect(config.accessKeyId).toBe('hmac-id')
    expect(config.secretAccessKey).toBe('hmac-secret')
    expect(config.forcePathStyle).toBe(true)
  })

  it('throws naming the missing var(s) when gcs config is incomplete', () => {
    expect(() =>
      resolveMediaStorage({ STORAGE_DRIVER: 'gcs', GCS_BUCKET: 'bucket' } as NodeJS.ProcessEnv),
    ).toThrow(/GCS_HMAC_ACCESS_KEY_ID/)
  })

  it('throws for an unrecognized driver', () => {
    expect(() =>
      resolveMediaStorage({ STORAGE_DRIVER: 'bogus' } as NodeJS.ProcessEnv),
    ).toThrow(/Unrecognized STORAGE_DRIVER/)
  })
})

describe('mediaStorage singleton', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws at import time when misconfigured', async () => {
    vi.stubEnv('STORAGE_DRIVER', 's3')
    vi.stubEnv('S3_BUCKET', '')
    vi.stubEnv('S3_REGION', '')
    vi.stubEnv('S3_ACCESS_KEY_ID', '')
    vi.stubEnv('S3_SECRET_ACCESS_KEY', '')

    await expect(import('./media-storage')).rejects.toThrow(/Missing required env var/)

    vi.unstubAllEnvs()
  })

  it('constructs successfully at import time with a valid local config', async () => {
    vi.stubEnv('STORAGE_DRIVER', 'local')
    vi.stubEnv('STORAGE_LOCAL_DIR', './uploads')
    vi.stubEnv('STORAGE_LOCAL_PUBLIC_URL', 'http://localhost/uploads')

    const mod = await import('./media-storage')
    expect(mod.mediaStorage.activeStorageName).toBe('localImages')

    vi.unstubAllEnvs()
  })
})
