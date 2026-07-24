import { tokenStorage } from './tokenStorage'

interface FetchErrorLike {
  response?: { status?: number }
}

let refreshPromise: Promise<string> | null = null

function baseUrl(): string {
  return useRuntimeConfig().public.apiBaseUrl
}

function isAuthRoute(path: string): boolean {
  return path.includes('/api/auth/login') || path.includes('/api/auth/refresh')
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await tokenStorage.readRefreshToken()
  if (!refreshToken) throw new Error('no-refresh-token')

  const { accessToken } = await $fetch<{ accessToken: string }>('/api/auth/refresh', {
    baseURL: baseUrl(),
    method: 'POST',
    body: { refreshToken },
  })
  await tokenStorage.writeAccessToken(accessToken)
  return accessToken
}

// Bearer-token attachment + a single deduplicated refresh-and-retry on 401,
// mirroring the Flutter client's Dio interceptor (flutter/lib/services/api_client.dart).
// Import of the auth store is deferred (dynamic import) so this module never
// eagerly pulls in stores/auth.ts, which itself imports authApi — avoiding a
// circular-import cycle at module-load time.
export async function apiRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: unknown } = {},
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!isAuthRoute(path)) {
    const accessToken = await tokenStorage.readAccessToken()
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  }

  try {
    return await $fetch<T>(path, {
      baseURL: baseUrl(),
      method: options.method ?? 'GET',
      body: options.body,
      headers,
    })
  } catch (error) {
    const status = (error as FetchErrorLike).response?.status
    if (status !== 401 || isAuthRoute(path) || isRetry) throw error

    try {
      refreshPromise ??= refreshAccessToken()
      await refreshPromise
    } catch (refreshError) {
      const { useAuthStore } = await import('../stores/auth')
      await useAuthStore().forceLogout()
      throw refreshError
    } finally {
      refreshPromise = null
    }

    return apiRequest<T>(path, options, true)
  }
}
