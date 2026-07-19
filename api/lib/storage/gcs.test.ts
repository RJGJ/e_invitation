import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveMock = vi.fn().mockResolvedValue(undefined)
const fileMock = vi.fn().mockReturnValue({ save: saveMock })
const bucketMock = vi.fn().mockReturnValue({ file: fileMock })

vi.mock('@google-cloud/storage', () => {
  class Storage {
    bucket = bucketMock
  }
  return { Storage }
})

import { createGcsDriver } from './gcs'

describe('createGcsDriver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bucketMock.mockReturnValue({ file: fileMock })
    fileMock.mockReturnValue({ save: saveMock })
  })

  it('saves the buffer to the correct bucket/key and returns the default googleapis URL', async () => {
    const driver = createGcsDriver({
      bucket: 'my-bucket',
      projectId: 'my-project',
      clientEmail: 'sa@my-project.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    })

    const result = await driver.upload({ buffer: Buffer.from('data'), key: 'k.png', mimeType: 'image/png' })

    expect(bucketMock).toHaveBeenCalledWith('my-bucket')
    expect(fileMock).toHaveBeenCalledWith('k.png')
    expect(saveMock).toHaveBeenCalledWith(Buffer.from('data'), { contentType: 'image/png' })
    expect(result).toEqual({ key: 'k.png', url: 'https://storage.googleapis.com/my-bucket/k.png' })
  })

  it('uses publicUrlBase when provided', async () => {
    const driver = createGcsDriver({
      bucket: 'my-bucket',
      projectId: 'my-project',
      clientEmail: 'sa@my-project.iam.gserviceaccount.com',
      privateKey: 'key',
      publicUrlBase: 'https://cdn.example.com/',
    })

    const result = await driver.upload({ buffer: Buffer.from('data'), key: 'k.png', mimeType: 'image/png' })

    expect(result.url).toBe('https://cdn.example.com/k.png')
  })

  it('reports kind as gcs', () => {
    const driver = createGcsDriver({
      bucket: 'my-bucket',
      projectId: 'my-project',
      clientEmail: 'sa@my-project.iam.gserviceaccount.com',
      privateKey: 'key',
    })
    expect(driver.kind).toBe('gcs')
  })
})
