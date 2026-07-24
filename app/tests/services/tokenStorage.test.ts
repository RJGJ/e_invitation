import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value)
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      store.delete(key)
    }),
  },
}))

const { tokenStorage } = await import('../../app/services/tokenStorage')

beforeEach(() => {
  store.clear()
})

describe('tokenStorage', () => {
  it('returns null for everything before a session is written', async () => {
    expect(await tokenStorage.readAccessToken()).toBeNull()
    expect(await tokenStorage.readRefreshToken()).toBeNull()
    expect(await tokenStorage.readUser()).toBeNull()
  })

  it('writeSession persists tokens and the user, readable back individually', async () => {
    const user = { id: '1', name: 'Ada', email: 'ada@example.com' }
    await tokenStorage.writeSession({ accessToken: 'access', refreshToken: 'refresh', user })

    expect(await tokenStorage.readAccessToken()).toBe('access')
    expect(await tokenStorage.readRefreshToken()).toBe('refresh')
    expect(await tokenStorage.readUser()).toEqual(user)
  })

  it('writeAccessToken updates only the access token', async () => {
    const user = { id: '1', name: 'Ada', email: 'ada@example.com' }
    await tokenStorage.writeSession({ accessToken: 'access', refreshToken: 'refresh', user })

    await tokenStorage.writeAccessToken('new-access')

    expect(await tokenStorage.readAccessToken()).toBe('new-access')
    expect(await tokenStorage.readRefreshToken()).toBe('refresh')
  })

  it('clear removes the whole session', async () => {
    const user = { id: '1', name: 'Ada', email: 'ada@example.com' }
    await tokenStorage.writeSession({ accessToken: 'access', refreshToken: 'refresh', user })

    await tokenStorage.clear()

    expect(await tokenStorage.readAccessToken()).toBeNull()
    expect(await tokenStorage.readRefreshToken()).toBeNull()
    expect(await tokenStorage.readUser()).toBeNull()
  })
})
