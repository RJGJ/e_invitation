import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn().mockResolvedValue({})

vi.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand {
    input: unknown
    constructor(input: unknown) {
      this.input = input
    }
  }
  class S3Client {
    send = sendMock
  }
  return { S3Client, PutObjectCommand }
})

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { createS3Driver } from './s3'

describe('createS3Driver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends a PutObjectCommand with the correct args and returns the default virtual-hosted-style URL', async () => {
    const driver = createS3Driver({
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIA...',
      secretAccessKey: 'secret',
    })

    const result = await driver.upload({ buffer: Buffer.from('data'), key: 'k.png', mimeType: 'image/png' })

    expect(sendMock).toHaveBeenCalledTimes(1)
    const command = sendMock.mock.calls[0][0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toEqual({
      Bucket: 'my-bucket',
      Key: 'k.png',
      Body: Buffer.from('data'),
      ContentType: 'image/png',
    })
    expect(result).toEqual({ key: 'k.png', url: 'https://my-bucket.s3.us-east-1.amazonaws.com/k.png' })
  })

  it('uses publicUrlBase when provided', async () => {
    const driver = createS3Driver({
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIA...',
      secretAccessKey: 'secret',
      publicUrlBase: 'https://cdn.example.com/',
    })

    const result = await driver.upload({ buffer: Buffer.from('data'), key: 'k.png', mimeType: 'image/png' })

    expect(result.url).toBe('https://cdn.example.com/k.png')
  })

  it('reports kind as s3', () => {
    const driver = createS3Driver({
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIA...',
      secretAccessKey: 'secret',
    })
    expect(driver.kind).toBe('s3')
  })
})
