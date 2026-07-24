import { defineStore } from 'pinia'
import { authApi } from '../services/authApi'
import { tokenStorage } from '../services/tokenStorage'
import type { AuthState } from '../types/auth'
import { isTokenExpired } from '../utils/jwt'

export const useAuthStore = defineStore('auth', {
  state: (): { authState: AuthState } => ({
    authState: { status: 'unknown' },
  }),

  actions: {
    async login(email: string, password: string) {
      const result = await authApi.login(email, password)
      await tokenStorage.writeSession(result)
      this.authState = { status: 'authenticated', user: result.user }
    },

    async logout() {
      const refreshToken = await tokenStorage.readRefreshToken()
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
      await this.forceLogout()
    },

    // Clears the session without an API call — used when the session is
    // already known-dead (a failed refresh), unlike the public logout()
    // which best-effort-notifies the server first.
    async forceLogout() {
      await tokenStorage.clear()
      this.authState = { status: 'unauthenticated' }
    },

    async tryAutoLogin() {
      const accessToken = await tokenStorage.readAccessToken()
      const cachedUser = await tokenStorage.readUser()

      // The JWT payload has no `name` claim, so the cached User (not just
      // the decoded token) is what backs this fast path after a restart.
      if (accessToken && cachedUser && !isTokenExpired(accessToken)) {
        this.authState = { status: 'authenticated', user: cachedUser }
        return
      }

      const refreshToken = await tokenStorage.readRefreshToken()
      if (!refreshToken || !cachedUser) {
        await this.forceLogout()
        return
      }

      try {
        const newAccessToken = await authApi.refresh(refreshToken)
        await tokenStorage.writeAccessToken(newAccessToken)
        this.authState = { status: 'authenticated', user: cachedUser }
      } catch {
        await this.forceLogout()
      }
    },
  },
})
