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

// Event.access is a plain, hand-written config object, exercised directly —
// same style as mediaAccess above.
const eventAccess = lists.Event.access as {
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

describe('Event.access.operation', () => {
  it('allows query for anyone, session or not', () => {
    expect(eventAccess.operation.query()).toBe(true)
  })

  it('denies create/update/delete without a session', () => {
    expect(eventAccess.operation.create({ session: undefined })).toBe(false)
    expect(eventAccess.operation.update({ session: undefined })).toBe(false)
    expect(eventAccess.operation.delete({ session: undefined })).toBe(false)
  })

  it('allows create/update/delete with a session', () => {
    const session = { itemId: 'u1' }
    expect(eventAccess.operation.create({ session })).toBe(true)
    expect(eventAccess.operation.update({ session })).toBe(true)
    expect(eventAccess.operation.delete({ session })).toBe(true)
  })
})

describe('Event.access.filter', () => {
  it('query filter excludes soft-deleted events', () => {
    expect(eventAccess.filter.query()).toEqual({ deletedAt: { equals: null } })
  })

  it('update/delete filter scopes to the author for a non-admin session', () => {
    const session = { itemId: 'u1', data: { isAdmin: false } }
    expect(eventAccess.filter.update({ session })).toEqual({
      author: { id: { equals: 'u1' } },
    })
    expect(eventAccess.filter.delete({ session })).toEqual({
      author: { id: { equals: 'u1' } },
    })
  })

  it('update/delete filter allows everything for an admin session', () => {
    const session = { itemId: 'admin-1', data: { isAdmin: true } }
    expect(eventAccess.filter.update({ session })).toBe(true)
    expect(eventAccess.filter.delete({ session })).toBe(true)
  })
})

describe('Event hooks.resolveInput', () => {
  // Real generated ResolveInputListHook types are stricter than this
  // hand-written narrow shape (same gotcha as Media's hook test above) —
  // cast through unknown first.
  const resolveInput = lists.Event.hooks as unknown as {
    resolveInput: {
      create: (args: { resolvedData: Record<string, unknown>; context: { session?: { itemId: string } } }) => Record<string, unknown>
      update: (args: { resolvedData: Record<string, unknown>; context: { session?: { itemId: string } } }) => Record<string, unknown>
    }
  }

  it('forces author to the session user on create, ignoring any client-supplied value, and sets updatedAt', () => {
    const result = resolveInput.resolveInput.create({
      resolvedData: {
        title: 'A Wedding',
        type: 'wedding',
        author: { connect: { id: 'spoofed-user' } },
      },
      context: { session: { itemId: 'real-user' } },
    })

    expect(result.author).toEqual({ connect: { id: 'real-user' } })
    expect(result.updatedAt).toBeInstanceOf(Date)
  })

  it('sets updatedAt on every update', () => {
    const result = resolveInput.resolveInput.update({
      resolvedData: { title: 'Renamed' },
      context: { session: { itemId: 'real-user' } },
    })

    expect(result.updatedAt).toBeInstanceOf(Date)
    expect(result.title).toBe('Renamed')
  })
})

// Template.access is a plain, hand-written config object, exercised
// directly — same style as mediaAccess/eventAccess above. Template has no
// deletedAt soft-delete convention (unlike Media/Event) — it uses an
// isActive filter instead, and writes are admin-only rather than
// owner-scoped (templates are curated content, not user-generated).
const templateAccess = lists.Template.access as {
  operation: {
    query: () => boolean
    create: (args: { session: { data?: { isAdmin?: boolean } } | undefined }) => boolean
    update: (args: { session: { data?: { isAdmin?: boolean } } | undefined }) => boolean
    delete: (args: { session: { data?: { isAdmin?: boolean } } | undefined }) => boolean
  }
  filter: {
    query: () => unknown
  }
}

describe('Template.access.operation', () => {
  it('allows query for anyone, session or not', () => {
    expect(templateAccess.operation.query()).toBe(true)
  })

  it('denies create/update/delete without a session', () => {
    expect(templateAccess.operation.create({ session: undefined })).toBe(false)
    expect(templateAccess.operation.update({ session: undefined })).toBe(false)
    expect(templateAccess.operation.delete({ session: undefined })).toBe(false)
  })

  it('denies create/update/delete for a non-admin session', () => {
    const session = { data: { isAdmin: false } }
    expect(templateAccess.operation.create({ session })).toBe(false)
    expect(templateAccess.operation.update({ session })).toBe(false)
    expect(templateAccess.operation.delete({ session })).toBe(false)
  })

  it('allows create/update/delete for an admin session', () => {
    const session = { data: { isAdmin: true } }
    expect(templateAccess.operation.create({ session })).toBe(true)
    expect(templateAccess.operation.update({ session })).toBe(true)
    expect(templateAccess.operation.delete({ session })).toBe(true)
  })
})

describe('Template.access.filter', () => {
  it('query filter excludes inactive templates', () => {
    expect(templateAccess.filter.query()).toEqual({ isActive: { equals: true } })
  })
})
