import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (authStore.authState.status === 'unknown') {
    await authStore.tryAutoLogin()
  }

  const isLoginPage = to.path === '/login'

  if (authStore.authState.status === 'unauthenticated' && !isLoginPage) {
    return navigateTo('/login')
  }

  if (authStore.authState.status === 'authenticated' && isLoginPage) {
    return navigateTo('/')
  }
})
