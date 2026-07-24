export interface User {
  id: string
  name: string
  email: string
}

export type AuthFailure =
  | { kind: 'invalid-credentials' }
  | { kind: 'validation'; message: string }
  | { kind: 'network' }
  | { kind: 'server' }

export type AuthState =
  | { status: 'unknown' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }
