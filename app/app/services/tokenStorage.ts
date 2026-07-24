import { Preferences } from '@capacitor/preferences'
import type { User } from '../types/auth'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

export const tokenStorage = {
  async readAccessToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY })
    return value
  },

  async readRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY })
    return value
  },

  async readUser(): Promise<User | null> {
    const { value } = await Preferences.get({ key: USER_KEY })
    return value ? (JSON.parse(value) as User) : null
  },

  async writeSession(session: { accessToken: string; refreshToken: string; user: User }): Promise<void> {
    await Promise.all([
      Preferences.set({ key: ACCESS_TOKEN_KEY, value: session.accessToken }),
      Preferences.set({ key: REFRESH_TOKEN_KEY, value: session.refreshToken }),
      Preferences.set({ key: USER_KEY, value: JSON.stringify(session.user) }),
    ])
  },

  async writeAccessToken(accessToken: string): Promise<void> {
    await Preferences.set({ key: ACCESS_TOKEN_KEY, value: accessToken })
  },

  async clear(): Promise<void> {
    await Promise.all([
      Preferences.remove({ key: ACCESS_TOKEN_KEY }),
      Preferences.remove({ key: REFRESH_TOKEN_KEY }),
      Preferences.remove({ key: USER_KEY }),
    ])
  },
}
