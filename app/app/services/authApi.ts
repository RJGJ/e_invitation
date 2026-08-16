import type { AuthFailure } from '../types/auth'

interface FetchErrorLike {
  response?: {
    status?: number
    _data?: unknown
  }
}

function baseUrl(): string {
  return useRuntimeConfig().public.apiBaseUrl
}

// simplejwt 401s: {detail: "..."}. DRF 400s: per-field array shape, e.g.
// {email: ["This field is required."]} — first field's first message wins.
function extractValidationMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const obj = data as Record<string, unknown>
  if (typeof obj.detail === 'string') return obj.detail
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }
  return undefined
}

function mapError(error: unknown): AuthFailure {
  const status = (error as FetchErrorLike).response?.status
  if (status === 401) return { kind: 'invalid-credentials' }
  if (status === 400) {
    const message = extractValidationMessage((error as FetchErrorLike).response?._data) ?? 'Validation error'
    return { kind: 'validation', message }
  }
  if (status === 500) return { kind: 'server' }
  return { kind: 'network' }
}

export const authApi = {
  async login(email: string, password: string) {
    try {
      return await $fetch<{ access: string; refresh: string }>('/api/token/', {
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
      const data = await $fetch<{ access: string }>('/api/token/refresh/', {
        baseURL: baseUrl(),
        method: 'POST',
        body: { refresh: refreshToken },
      })
      return data.access
    } catch (error) {
      throw mapError(error)
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await $fetch('/api/token/blacklist/', {
        baseURL: baseUrl(),
        method: 'POST',
        body: { refresh: refreshToken },
      })
    } catch {
      // Best-effort — always treat logout as succeeding client-side.
    }
  },
}
