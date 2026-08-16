import { GraphQLClient, gql } from 'graphql-request'
import type { AuthFailure, User } from '../types/auth'

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      groups
    }
  }
`

function baseUrl(): string {
  return useRuntimeConfig().public.apiBaseUrl
}

export const meApi = {
  async fetchMe(accessToken: string): Promise<User> {
    const client = new GraphQLClient(`${baseUrl()}/graphql/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    let data: { me: User | null }
    try {
      data = await client.request<{ me: User | null }>(ME_QUERY)
    } catch {
      throw { kind: 'server' } satisfies AuthFailure
    }

    if (!data.me) throw { kind: 'server' } satisfies AuthFailure
    return data.me
  },
}
