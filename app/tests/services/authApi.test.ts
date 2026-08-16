import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '../../app/services/authApi'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBaseUrl: 'http://test' } }))
})

describe('authApi.login', () => {
  it('returns tokens on success', async () => {
    const payload = { access: 'access', refresh: 'refresh' }
    fetchMock.mockResolvedValueOnce(payload)

    const result = await authApi.login('ada@example.com', 'hunter2')

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/token/',
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

  it('maps a 400 with DRF field-array errors to validation with the first message', async () => {
    fetchMock.mockRejectedValueOnce({
      response: { status: 400, _data: { email: ['This field is required.'] } },
    })

    await expect(authApi.login('', 'x')).rejects.toEqual({
      kind: 'validation',
      message: 'This field is required.',
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
  it('posts refresh to /api/token/refresh/ and returns the new access token', async () => {
    fetchMock.mockResolvedValueOnce({ access: 'new-access' })

    await expect(authApi.refresh('refresh-token')).resolves.toBe('new-access')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/token/refresh/',
      expect.objectContaining({
        baseURL: 'http://test',
        method: 'POST',
        body: { refresh: 'refresh-token' },
      }),
    )
  })

  it('maps a 401 {detail} to invalid-credentials', async () => {
    fetchMock.mockRejectedValueOnce({ response: { status: 401, _data: { detail: 'Token is invalid or expired' } } })

    await expect(authApi.refresh('bad-token')).rejects.toEqual({ kind: 'invalid-credentials' })
  })
})

describe('authApi.logout', () => {
  it('posts refresh to /api/token/blacklist/ and swallows all failures', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))

    await expect(authApi.logout('refresh-token')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/token/blacklist/',
      expect.objectContaining({
        baseURL: 'http://test',
        method: 'POST',
        body: { refresh: 'refresh-token' },
      }),
    )
  })
})
