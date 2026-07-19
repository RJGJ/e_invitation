import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'node:path'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

import { mkdir, writeFile } from 'node:fs/promises'
import { createLocalDriver } from './local'

describe('createLocalDriver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes the buffer under dir and returns a URL built from publicUrl', async () => {
    const driver = createLocalDriver({ dir: '/tmp/uploads', publicUrl: 'http://localhost:3002/uploads' })

    const result = await driver.upload({ buffer: Buffer.from('hello'), key: 'abc.jpg', mimeType: 'image/jpeg' })

    expect(mkdir).toHaveBeenCalledWith('/tmp/uploads', { recursive: true })
    expect(writeFile).toHaveBeenCalledWith(path.join('/tmp/uploads', 'abc.jpg'), Buffer.from('hello'))
    expect(result).toEqual({ key: 'abc.jpg', url: 'http://localhost:3002/uploads/abc.jpg' })
  })

  it('does not produce a double slash when publicUrl has a trailing slash', async () => {
    const driver = createLocalDriver({ dir: '/tmp/uploads', publicUrl: 'http://localhost:3002/uploads/' })

    const result = await driver.upload({ buffer: Buffer.from('hello'), key: 'abc.jpg', mimeType: 'image/jpeg' })

    expect(result.url).toBe('http://localhost:3002/uploads/abc.jpg')
  })

  it('reports kind as local', () => {
    const driver = createLocalDriver({ dir: '/tmp/uploads', publicUrl: 'http://localhost:3002/uploads' })
    expect(driver.kind).toBe('local')
  })
})
