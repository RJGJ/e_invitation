import { Router, type Request, type Response, type NextFunction } from 'express'
import multer, { MulterError } from 'multer'
import { randomUUID } from 'node:crypto'
import type { Context } from '.keystone/types'
import { storageDriver } from '../lib/storage'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  // Reject unsupported mime types with a distinguishable error so the route
  // can tell "wrong type" apart from "no file field at all" (multer leaves
  // req.file undefined for both cb(null, false) and a missing field).
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('UNSUPPORTED_MIME'))
      return
    }
    cb(null, true)
  },
})

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

// Wraps multer's callback-style middleware so its three failure modes map to
// the distinct 400 error bodies the spec requires, before the route handler
// ever runs.
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' })
      }
      if (err instanceof Error && err.message === 'UNSUPPORTED_MIME') {
        return res.status(400).json({ error: 'Unsupported file type' })
      }
      return res.status(400).json({ error: 'Upload failed' })
    }
    next()
  })
}

export function createMediaRouter(commonContext: Context) {
  const router = Router()

  /**
   * POST /api/media/upload
   * Uploads a single file (multipart/form-data, field "file") through the
   * active storage driver and creates a Media record owned by the caller.
   */
  router.post('/upload', async (req: Request, res: Response) => {
    // Check auth before multer ever buffers the request body.
    const requestContext = await commonContext.withRequest(req, res)
    const session = requestContext.session
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    handleUpload(req, res, async () => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      const key = `${randomUUID()}-${sanitizeFilename(req.file.originalname)}`

      let uploadResult
      try {
        uploadResult = await storageDriver.upload({
          buffer: req.file.buffer,
          key,
          mimeType: req.file.mimetype,
        })
      } catch (error) {
        console.error('Storage upload error:', error)
        return res.status(500).json({ error: 'Upload failed' })
      }

      try {
        // Use the session-bound requestContext (not sudo()) so the
        // resolveInput hook on Media sees context.session and force-sets
        // uploadedBy; uploadedBy is intentionally omitted from `data`.
        const created = await requestContext.db.Media.createOne({
          data: {
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            driver: storageDriver.kind,
            storageKey: uploadResult.key,
            url: uploadResult.url,
          },
        })

        return res.status(201).json({
          id: created.id,
          filename: created.filename,
          mimeType: created.mimeType,
          size: created.size,
          driver: created.driver,
          url: created.url,
          createdAt: created.createdAt,
        })
      } catch (error) {
        console.error('Media create error:', error)
        return res.status(500).json({ error: 'Internal server error' })
      }
    })
  })

  /**
   * DELETE /api/media/:id
   * Soft-deletes a Media record (sets deletedAt). Restricted to the
   * uploader or an admin, checked explicitly here rather than relying on
   * Media's own access.filter — see media-storage-plan.md for why.
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    const requestContext = await commonContext.withRequest(req, res)
    const session = requestContext.session
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    try {
      const sudoContext = commonContext.sudo()
      const existing = await sudoContext.db.Media.findOne({ where: { id: req.params.id } })

      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: 'Media not found' })
      }

      const isOwner = existing.uploadedById === session.itemId

      let isAdmin = false
      if (!isOwner) {
        const user = await sudoContext.db.User.findOne({ where: { id: session.itemId } })
        isAdmin = Boolean(user?.isAdmin)
      }

      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: 'Media not found' })
      }

      await sudoContext.db.Media.updateOne({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Media delete error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
