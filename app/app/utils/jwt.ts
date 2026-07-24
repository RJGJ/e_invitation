export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number
    }
    if (!payload.exp) return true
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}
