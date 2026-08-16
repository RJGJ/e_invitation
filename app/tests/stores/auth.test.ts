import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authApiMock = {
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
}

const meApiMock = {
  fetchMe: vi.fn(),
}

const tokenStorageMock = {
  readAccessToken: vi.fn(),
  readRefreshToken: vi.fn(),
  readUser: vi.fn(),
  writeSession: vi.fn(),
  writeAccessToken: vi.fn(),
  clear: vi.fn(),
}

vi.mock('../../app/services/authApi', () => ({ authApi: authApiMock }))
vi.mock('../../app/services/meApi', () => ({ meApi: meApiMock }))
vi.mock('../../app/services/tokenStorage', () => ({ tokenStorage: tokenStorageMock }))
vi.mock('../../app/utils/jwt', () => ({ isTokenExpired: vi.fn() }))

const { useAuthStore } = await import('../../app/stores/auth')
const { isTokenExpired } = await import('../../app/utils/jwt')

const user = { id: '1', name: 'Ada', email: 'ada@example.com', groups: [] as string[] }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('login', () => {
  it('fetches tokens then the profile, persists the session, and sets authenticated state', async () => {
    authApiMock.login.mockResolvedValueOnce({ access: 'a', refresh: 'r' })
    meApiMock.fetchMe.mockResolvedValueOnce(user)

    const store = useAuthStore()
    await store.login('ada@example.com', 'hunter2')

    expect(meApiMock.fetchMe).toHaveBeenCalledWith('a')
    expect(tokenStorageMock.writeSession).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r', user })
    expect(store.authState).toEqual({ status: 'authenticated', user })
  })

  it('leaves the store unauthenticated and rethrows on login failure', async () => {
    authApiMock.login.mockRejectedValueOnce({ kind: 'invalid-credentials' })

    const store = useAuthStore()
    await expect(store.login('ada@example.com', 'wrong')).rejects.toEqual({ kind: 'invalid-credentials' })
    expect(store.authState).toEqual({ status: 'unknown' })
    expect(meApiMock.fetchMe).not.toHaveBeenCalled()
  })

  it('persists nothing and rethrows when the profile fetch fails after a successful login', async () => {
    authApiMock.login.mockResolvedValueOnce({ access: 'a', refresh: 'r' })
    meApiMock.fetchMe.mockRejectedValueOnce({ kind: 'server' })

    const store = useAuthStore()
    await expect(store.login('ada@example.com', 'hunter2')).rejects.toEqual({ kind: 'server' })
    expect(tokenStorageMock.writeSession).not.toHaveBeenCalled()
    expect(store.authState).toEqual({ status: 'unknown' })
  })
})

describe('logout / forceLogout', () => {
  it('notifies the API, clears storage, and sets unauthenticated', async () => {
    tokenStorageMock.readRefreshToken.mockResolvedValueOnce('r')

    const store = useAuthStore()
    await store.logout()

    expect(authApiMock.logout).toHaveBeenCalledWith('r')
    expect(tokenStorageMock.clear).toHaveBeenCalled()
    expect(store.authState).toEqual({ status: 'unauthenticated' })
  })

  it('forceLogout clears the session without calling the API', async () => {
    const store = useAuthStore()
    await store.forceLogout()

    expect(authApiMock.logout).not.toHaveBeenCalled()
    expect(tokenStorageMock.clear).toHaveBeenCalled()
    expect(store.authState).toEqual({ status: 'unauthenticated' })
  })
})

describe('tryAutoLogin', () => {
  it('fast path: rehydrates the cached user when the access token is still valid', async () => {
    tokenStorageMock.readAccessToken.mockResolvedValueOnce('valid-token')
    tokenStorageMock.readUser.mockResolvedValueOnce(user)
    vi.mocked(isTokenExpired).mockReturnValueOnce(false)

    const store = useAuthStore()
    await store.tryAutoLogin()

    expect(authApiMock.refresh).not.toHaveBeenCalled()
    expect(store.authState).toEqual({ status: 'authenticated', user })
  })

  it('refreshes when the access token is expired, keeping the cached user (JWT has no name claim)', async () => {
    tokenStorageMock.readAccessToken.mockResolvedValueOnce('expired-token')
    tokenStorageMock.readUser.mockResolvedValueOnce(user)
    vi.mocked(isTokenExpired).mockReturnValueOnce(true)
    tokenStorageMock.readRefreshToken.mockResolvedValueOnce('r')
    authApiMock.refresh.mockResolvedValueOnce('new-access')

    const store = useAuthStore()
    await store.tryAutoLogin()

    expect(tokenStorageMock.writeAccessToken).toHaveBeenCalledWith('new-access')
    expect(store.authState).toEqual({ status: 'authenticated', user })
  })

  it('forces logout when nothing is stored', async () => {
    tokenStorageMock.readAccessToken.mockResolvedValueOnce(null)
    tokenStorageMock.readUser.mockResolvedValueOnce(null)
    tokenStorageMock.readRefreshToken.mockResolvedValueOnce(null)

    const store = useAuthStore()
    await store.tryAutoLogin()

    expect(store.authState).toEqual({ status: 'unauthenticated' })
  })

  it('forces logout when refresh fails — e.g. single-device logout invalidated this session', async () => {
    tokenStorageMock.readAccessToken.mockResolvedValueOnce('expired-token')
    tokenStorageMock.readUser.mockResolvedValueOnce(user)
    vi.mocked(isTokenExpired).mockReturnValueOnce(true)
    tokenStorageMock.readRefreshToken.mockResolvedValueOnce('r')
    authApiMock.refresh.mockRejectedValueOnce({ kind: 'invalid-credentials' })

    const store = useAuthStore()
    await store.tryAutoLogin()

    expect(tokenStorageMock.clear).toHaveBeenCalled()
    expect(store.authState).toEqual({ status: 'unauthenticated' })
  })
})
