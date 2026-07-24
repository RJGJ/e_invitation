import type { AuthFailure, User } from '../types/auth'

interface FetchErrorLike {
  response?: {
    status?: number
    _data?: { error?: string }
  }
}

function baseUrl(): string {
  return useRuntimeConfig().public.apiBaseUrl
}

function mapError(error: unknown): AuthFailure {
  const status = (error as FetchErrorLike).response?.status
  if (status === 401) return { kind: 'invalid-credentials' }
  if (status === 400) {
    const message = (error as FetchErrorLike).response?._data?.error ?? 'Validation error'
    return { kind: 'validation', message }
  }
  if (status === 500) return { kind: 'server' }
  return { kind: 'network' }
}

export const authApi = {
  async login(email: string, password: string) {
    try {
      return await $fetch<{ accessToken: string; refreshToken: string; user: User }>('/api/auth/login', {
        baseURL: baseUrl(),
        method: 'POST',
        body: { email, password },
      })
    } catch (error) {
      throw mapError(error)
    }
  },

  // Called directly by AuthStore.tryAutoLogin(); apiClient's own 401
  // interceptor makes its refresh call inline rather than through here, to
  // avoid an extra module hop inside that hot path.
  async refresh(refreshToken: string): Promise<string> {
    try {
      const data = await $fetch<{ accessToken: string }>('/api/auth/refresh', {
        baseURL: baseUrl(),
        method: 'POST',
        body: { refreshToken },
      })
      return data.accessToken
    } catch (error) {
      throw mapError(error)
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await $fetch('/api/auth/logout', {
        baseURL: baseUrl(),
        method: 'POST',
        body: { refreshToken },
      })
    } catch {
      // Best-effort — the API always returns 200 per its contract.
    }
  },
}
