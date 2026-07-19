import { vi } from 'vitest'

// createAuthRouter's handlers call commonContext.sudo() directly (used for
// .db.User.updateOne/.findMany) and, only in /login, commonContext.withRequest(req, res)
// (its resolved value is used for .graphql.raw). createMediaRouter's handlers call
// commonContext.withRequest(req, res) for .session/.db.Media.createOne and
// commonContext.sudo() for .db.Media/.db.User lookups. This builds a minimal fake
// covering just that shape — never the real generated Context type from
// .keystone/types, since that file only exists once `keystone dev`/`build` has run.
export function createMockContext() {
  const dbUser = { updateOne: vi.fn(), findMany: vi.fn(), findOne: vi.fn() }
  const dbMedia = { createOne: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() }
  const db = { User: dbUser, Media: dbMedia }
  const sudoContext = { db }
  const graphqlRaw = vi.fn()

  // A plain mutable object (not vi.fn()-wrapped) so tests can set
  // requestContext.session directly before making a request.
  const requestContext: { graphql: { raw: typeof graphqlRaw }; db: typeof db; session?: unknown } = {
    graphql: { raw: graphqlRaw },
    db,
    session: undefined,
  }

  const commonContext = {
    sudo: vi.fn().mockReturnValue(sudoContext),
    withRequest: vi.fn().mockResolvedValue(requestContext),
  }

  return { commonContext: commonContext as any, dbUser, dbMedia, graphqlRaw, requestContext }
}
