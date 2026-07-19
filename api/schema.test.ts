import { describe, it, expect } from 'vitest'
import { lists } from './schema'

// Media.access is a plain, hand-written config object (not the Keystone
// runtime), so these functions can be exercised directly without a real
// Keystone context — same style as lib/jwt.test.ts testing pure functions.
const mediaAccess = lists.Media.access as {
  operation: {
    query: () => boolean
    create: (args: { session: unknown }) => boolean
    update: (args: { session: unknown }) => boolean
    delete: (args: { session: unknown }) => boolean
  }
  filter: {
    query: () => unknown
    update: (args: { session: { itemId: string; data?: { isAdmin?: boolean } } | undefined }) => unknown
    delete: (args: { session: { itemId: string; data?: { isAdmin?: boolean } } | undefined }) => unknown
  }
}

describe('Media.access.operation', () => {
  it('allows query for anyone, session or not', () => {
    expect(mediaAccess.operation.query()).toBe(true)
  })

  it('denies create/update/delete without a session', () => {
    expect(mediaAccess.operation.create({ session: undefined })).toBe(false)
    expect(mediaAccess.operation.update({ session: undefined })).toBe(false)
    expect(mediaAccess.operation.delete({ session: undefined })).toBe(false)
  })

  it('allows create/update/delete with a session', () => {
    const session = { itemId: 'u1' }
    expect(mediaAccess.operation.create({ session })).toBe(true)
    expect(mediaAccess.operation.update({ session })).toBe(true)
    expect(mediaAccess.operation.delete({ session })).toBe(true)
  })
})

describe('Media.access.filter', () => {
  it('query filter excludes soft-deleted items', () => {
    expect(mediaAccess.filter.query()).toEqual({ deletedAt: { equals: null } })
  })

  it('update/delete filter scopes to the owner for a non-admin session', () => {
    const session = { itemId: 'u1', data: { isAdmin: false } }
    expect(mediaAccess.filter.update({ session })).toEqual({
      uploadedBy: { id: { equals: 'u1' } },
    })
    expect(mediaAccess.filter.delete({ session })).toEqual({
      uploadedBy: { id: { equals: 'u1' } },
    })
  })

  it('update/delete filter allows everything for an admin session', () => {
    const session = { itemId: 'admin-1', data: { isAdmin: true } }
    expect(mediaAccess.filter.update({ session })).toBe(true)
    expect(mediaAccess.filter.delete({ session })).toBe(true)
  })
})

describe('Media hooks.resolveInput.create', () => {
  it('forces uploadedBy to the session user, ignoring any client-supplied value', () => {
    const resolveInputCreate = (
      lists.Media.hooks as unknown as {
        resolveInput: { create: (args: { resolvedData: Record<string, unknown>; context: { session?: { itemId: string } } }) => Record<string, unknown> }
      }
    ).resolveInput.create

    const result = resolveInputCreate({
      resolvedData: { image: { upload: 'some-file-data' }, uploadedBy: { connect: { id: 'spoofed-user' } } },
      context: { session: { itemId: 'real-user' } },
    })

    expect(result).toEqual({
      image: { upload: 'some-file-data' },
      uploadedBy: { connect: { id: 'real-user' } },
    })
  })
})
