import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '../../app/services/authApi'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBaseUrl: 'http://test' } }))
})

describe('authApi.login', () => {
  it('returns tokens and user on success', async () => {
    const payload = {
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: '1', name: 'Ada', email: 'ada@example.com' },
    }
    fetchMock.mockResolvedValueOnce(payload)

    const result = await authApi.login('ada@example.com', 'hunter2')

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        baseURL: 'http://test',
        method: 'POST',
        body: { email: 'ada@example.com', password: 'hunter2' },
      }),
    )
  })

  it('maps a 401 to invalid-credentials', async () => {
    fetchMock.mockRejectedValueOnce({ response: { status: 401 } })

    await expect(authApi.login('ada@example.com', 'wrong')).rejects.toEqual({ kind: 'invalid-credentials' })
  })

  it('maps a 400 to validation with the server message', async () => {
    fetchMock.mockRejectedValueOnce({ response: { status: 400, _data: { error: 'Missing password' } } })

    await expect(authApi.login('ada@example.com', '')).rejects.toEqual({
      kind: 'validation',
      message: 'Missing password',
    })
  })

  it('maps a 500 to server', async () => {
    fetchMock.mockRejectedValueOnce({ response: { status: 500 } })

    await expect(authApi.login('ada@example.com', 'x')).rejects.toEqual({ kind: 'server' })
  })

  it('maps anything else (e.g. no response) to network', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fetch failed'))

    await expect(authApi.login('ada@example.com', 'x')).rejects.toEqual({ kind: 'network' })
  })
})

describe('authApi.refresh', () => {
  it('returns the new access token', async () => {
    fetchMock.mockResolvedValueOnce({ accessToken: 'new-access' })

    await expect(authApi.refresh('refresh-token')).resolves.toBe('new-access')
  })

  it('throws a mapped AuthFailure on 401', async () => {
    fetchMock.mockRejectedValueOnce({ response: { status: 401 } })

    await expect(authApi.refresh('bad-token')).rejects.toEqual({ kind: 'invalid-credentials' })
  })
})

describe('authApi.logout', () => {
  it('swallows failures — the API always returns 200 per its contract', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))

    await expect(authApi.logout('refresh-token')).resolves.toBeUndefined()
  })
})
