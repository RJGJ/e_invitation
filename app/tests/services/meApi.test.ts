import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.fn()
class GraphQLClientMock {
  request = requestMock
  constructor(...args: unknown[]) {
    GraphQLClientMock.calls.push(args)
  }
  static calls: unknown[][] = []
}

vi.mock('graphql-request', () => ({
  GraphQLClient: GraphQLClientMock,
  gql: (strings: TemplateStringsArray) => strings.join(''),
}))

vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBaseUrl: 'http://test' } }))

const { meApi } = await import('../../app/services/meApi')

beforeEach(() => {
  requestMock.mockReset()
  GraphQLClientMock.calls = []
})

describe('meApi.fetchMe', () => {
  it('sends the access token as a Bearer header and returns the me payload', async () => {
    const me = { id: '1', name: 'Ada', email: 'ada@example.com', groups: ['admin'] }
    requestMock.mockResolvedValueOnce({ me })

    const result = await meApi.fetchMe('token-123')

    expect(result).toEqual(me)
    expect(GraphQLClientMock.calls).toEqual([
      ['http://test/graphql/', expect.objectContaining({ headers: { Authorization: 'Bearer token-123' } })],
    ])
  })

  it('throws {kind: server} when the request fails', async () => {
    requestMock.mockRejectedValueOnce(new Error('network down'))

    await expect(meApi.fetchMe('token-123')).rejects.toEqual({ kind: 'server' })
  })

  it('throws {kind: server} when me is null', async () => {
    requestMock.mockResolvedValueOnce({ me: null })

    await expect(meApi.fetchMe('token-123')).rejects.toEqual({ kind: 'server' })
  })
})
