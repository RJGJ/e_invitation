import { describe, it, expect, vi, beforeEach } from 'vitest'

const { createLocalDriver, createS3Driver, createGcsDriver } = vi.hoisted(() => ({
  createLocalDriver: vi.fn().mockReturnValue({ kind: 'local', upload: vi.fn() }),
  createS3Driver: vi.fn().mockReturnValue({ kind: 's3', upload: vi.fn() }),
  createGcsDriver: vi.fn().mockReturnValue({ kind: 'gcs', upload: vi.fn() }),
}))

vi.mock('./local', () => ({ createLocalDriver }))
vi.mock('./s3', () => ({ createS3Driver }))
vi.mock('./gcs', () => ({ createGcsDriver }))

import { resolveStorageDriver } from './index'

describe('resolveStorageDriver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to local when STORAGE_DRIVER is unset', () => {
    const driver = resolveStorageDriver({
      STORAGE_LOCAL_DIR: './uploads',
      STORAGE_LOCAL_PUBLIC_URL: 'http://localhost/uploads',
    } as NodeJS.ProcessEnv)

    expect(driver.kind).toBe('local')
    expect(createLocalDriver).toHaveBeenCalledWith({
      dir: './uploads',
      publicUrl: 'http://localhost/uploads',
    })
  })

  it('builds the local driver explicitly', () => {
    const driver = resolveStorageDriver({
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: './uploads',
      STORAGE_LOCAL_PUBLIC_URL: 'http://localhost/uploads',
    } as NodeJS.ProcessEnv)

    expect(driver.kind).toBe('local')
  })

  it('throws naming the missing var(s) when local config is incomplete', () => {
    expect(() =>
      resolveStorageDriver({ STORAGE_DRIVER: 'local' } as NodeJS.ProcessEnv),
    ).toThrow(/STORAGE_LOCAL_DIR/)
  })

  it('builds the s3 driver when all required vars are present', () => {
    const driver = resolveStorageDriver({
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'bucket',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'id',
      S3_SECRET_ACCESS_KEY: 'secret',
    } as NodeJS.ProcessEnv)

    expect(driver.kind).toBe('s3')
    expect(createS3Driver).toHaveBeenCalledWith({
      bucket: 'bucket',
      region: 'us-east-1',
      accessKeyId: 'id',
      secretAccessKey: 'secret',
      publicUrlBase: undefined,
    })
  })

  it('throws naming the missing var(s) when s3 config is incomplete', () => {
    expect(() =>
      resolveStorageDriver({ STORAGE_DRIVER: 's3', S3_BUCKET: 'bucket' } as NodeJS.ProcessEnv),
    ).toThrow(/S3_REGION/)
  })

  it('builds the gcs driver when all required vars are present, unescaping the private key', () => {
    const driver = resolveStorageDriver({
      STORAGE_DRIVER: 'gcs',
      GCS_BUCKET: 'bucket',
      GCS_PROJECT_ID: 'project',
      GCS_CLIENT_EMAIL: 'sa@project.iam.gserviceaccount.com',
      GCS_PRIVATE_KEY: '-----BEGIN KEY-----\\nabc\\n-----END KEY-----\\n',
    } as NodeJS.ProcessEnv)

    expect(driver.kind).toBe('gcs')
    expect(createGcsDriver).toHaveBeenCalledWith({
      bucket: 'bucket',
      projectId: 'project',
      clientEmail: 'sa@project.iam.gserviceaccount.com',
      privateKey: '-----BEGIN KEY-----\nabc\n-----END KEY-----\n',
      publicUrlBase: undefined,
    })
  })

  it('throws naming the missing var(s) when gcs config is incomplete', () => {
    expect(() =>
      resolveStorageDriver({ STORAGE_DRIVER: 'gcs', GCS_BUCKET: 'bucket' } as NodeJS.ProcessEnv),
    ).toThrow(/GCS_PROJECT_ID/)
  })

  it('throws for an unrecognized driver', () => {
    expect(() =>
      resolveStorageDriver({ STORAGE_DRIVER: 'bogus' } as NodeJS.ProcessEnv),
    ).toThrow(/Unrecognized STORAGE_DRIVER/)
  })
})

describe('storageDriver singleton', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws at import time when misconfigured', async () => {
    vi.stubEnv('STORAGE_DRIVER', 's3')
    vi.stubEnv('S3_BUCKET', '')
    vi.stubEnv('S3_REGION', '')
    vi.stubEnv('S3_ACCESS_KEY_ID', '')
    vi.stubEnv('S3_SECRET_ACCESS_KEY', '')

    await expect(import('./index')).rejects.toThrow(/Missing required env var/)

    vi.unstubAllEnvs()
  })

  it('constructs successfully at import time with a valid local config', async () => {
    vi.stubEnv('STORAGE_DRIVER', 'local')
    vi.stubEnv('STORAGE_LOCAL_DIR', './uploads')
    vi.stubEnv('STORAGE_LOCAL_PUBLIC_URL', 'http://localhost/uploads')

    const mod = await import('./index')
    expect(mod.storageDriver.kind).toBe('local')

    vi.unstubAllEnvs()
  })
})
