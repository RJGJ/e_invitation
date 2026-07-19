import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createMediaRouter } from './media'
import { createMockContext } from '../test/mock-context'

const uploadMock = vi.fn()

vi.mock('../lib/storage', () => ({
  storageDriver: {
    kind: 'local',
    upload: (...args: unknown[]) => uploadMock(...args),
  },
}))

function buildApp() {
  const { commonContext, dbMedia, dbUser, requestContext } = createMockContext()
  const app = express()
  app.use('/api/media', createMediaRouter(commonContext))
  return { app, commonContext, dbMedia, dbUser, requestContext }
}

const OWNER_SESSION = { itemId: 'user-1', data: { isAdmin: false } }
// JWT-derived sessions always carry data: null (see api/auth.ts) — several
// tests below deliberately use this shape to catch any authorization logic
// that wrongly trusts session.data.isAdmin.
const JWT_ADMIN_SESSION = { itemId: 'admin-1', data: null }

const createdMediaRecord = {
  id: 'media-1',
  filename: 'photo.jpg',
  mimeType: 'image/jpeg',
  size: 1234,
  driver: 'local',
  storageKey: 'key-abc-photo.jpg',
  url: 'http://localhost:3002/uploads/key-abc-photo.jpg',
  uploadedById: 'user-1',
  createdAt: new Date('2026-07-19T00:00:00.000Z'),
  deletedAt: null,
}

describe('POST /api/media/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when there is no session', async () => {
    const { app } = buildApp()

    const res = await request(app)
      .post('/api/media/upload')
      .attach('file', Buffer.from('fake-image-bytes'), { filename: 'a.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required' })
  })

  it('returns 400 when no file is provided', async () => {
    const { app, requestContext } = buildApp()
    requestContext.session = OWNER_SESSION

    const res = await request(app).post('/api/media/upload')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'No file provided' })
  })

  it('returns 400 for an unsupported mime type', async () => {
    const { app, requestContext } = buildApp()
    requestContext.session = OWNER_SESSION

    const res = await request(app)
      .post('/api/media/upload')
      .attach('file', Buffer.from('not an image'), { filename: 'a.txt', contentType: 'text/plain' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Unsupported file type' })
  })

  it('returns 400 for an oversized file', async () => {
    const { app, requestContext } = buildApp()
    requestContext.session = OWNER_SESSION

    const oversized = Buffer.alloc(11 * 1024 * 1024, 1)
    const res = await request(app)
      .post('/api/media/upload')
      .attach('file', oversized, { filename: 'big.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'File too large' })
  })

  it('returns 201 with the created record on a valid upload, ignoring client-supplied uploadedBy', async () => {
    const { app, requestContext, dbMedia } = buildApp()
    requestContext.session = OWNER_SESSION
    uploadMock.mockResolvedValueOnce({ key: 'key-abc-photo.jpg', url: createdMediaRecord.url })
    dbMedia.createOne.mockResolvedValueOnce(createdMediaRecord)

    const res = await request(app)
      .post('/api/media/upload')
      .field('uploadedBy', 'someone-else')
      .attach('file', Buffer.from('fake-image-bytes'), { filename: 'photo.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      id: createdMediaRecord.id,
      filename: createdMediaRecord.filename,
      mimeType: createdMediaRecord.mimeType,
      size: createdMediaRecord.size,
      driver: createdMediaRecord.driver,
      url: createdMediaRecord.url,
      createdAt: createdMediaRecord.createdAt.toISOString(),
    })

    expect(dbMedia.createOne).toHaveBeenCalledTimes(1)
    const call = dbMedia.createOne.mock.calls[0][0]
    expect(call.data).not.toHaveProperty('uploadedBy')
    expect(call.data).not.toHaveProperty('uploadedById')
  })

  it('returns 500 and never creates a record when the storage driver rejects', async () => {
    const { app, requestContext, dbMedia } = buildApp()
    requestContext.session = OWNER_SESSION
    uploadMock.mockRejectedValueOnce(new Error('bucket unreachable'))

    const res = await request(app)
      .post('/api/media/upload')
      .attach('file', Buffer.from('fake-image-bytes'), { filename: 'photo.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Upload failed' })
    expect(dbMedia.createOne).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/media/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when there is no session', async () => {
    const { app } = buildApp()

    const res = await request(app).delete('/api/media/media-1')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required' })
  })

  it('returns 404 when the record does not exist', async () => {
    const { app, requestContext, dbMedia } = buildApp()
    requestContext.session = OWNER_SESSION
    dbMedia.findOne.mockResolvedValueOnce(null)

    const res = await request(app).delete('/api/media/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Media not found' })
  })

  it('returns 404 when the record is already soft-deleted', async () => {
    const { app, requestContext, dbMedia } = buildApp()
    requestContext.session = OWNER_SESSION
    dbMedia.findOne.mockResolvedValueOnce({ ...createdMediaRecord, deletedAt: new Date() })

    const res = await request(app).delete('/api/media/media-1')

    expect(res.status).toBe(404)
  })

  it('returns 404 for a non-owner, non-admin session', async () => {
    const { app, requestContext, dbMedia, dbUser } = buildApp()
    requestContext.session = { itemId: 'someone-else', data: { isAdmin: false } }
    dbMedia.findOne.mockResolvedValueOnce(createdMediaRecord)
    dbUser.findOne.mockResolvedValueOnce({ id: 'someone-else', isAdmin: false })

    const res = await request(app).delete('/api/media/media-1')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Media not found' })
    expect(dbMedia.updateOne).not.toHaveBeenCalled()
  })

  it('soft-deletes and returns 200 for the owner', async () => {
    const { app, requestContext, dbMedia } = buildApp()
    requestContext.session = OWNER_SESSION
    dbMedia.findOne.mockResolvedValueOnce(createdMediaRecord)
    dbMedia.updateOne.mockResolvedValueOnce({})

    const res = await request(app).delete('/api/media/media-1')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(dbMedia.updateOne).toHaveBeenCalledWith({
      where: { id: 'media-1' },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('soft-deletes and returns 200 for an admin with a JWT-shaped session (data: null)', async () => {
    // Regresses the gap in api/auth.ts where JWT sessions always get
    // data: null — the route must look up isAdmin explicitly rather than
    // trusting session.data.isAdmin.
    const { app, requestContext, dbMedia, dbUser } = buildApp()
    requestContext.session = JWT_ADMIN_SESSION
    dbMedia.findOne.mockResolvedValueOnce(createdMediaRecord)
    dbUser.findOne.mockResolvedValueOnce({ id: 'admin-1', isAdmin: true })
    dbMedia.updateOne.mockResolvedValueOnce({})

    const res = await request(app).delete('/api/media/media-1')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
  })
})
