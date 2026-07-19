import { vi } from 'vitest'

// createAuthRouter's handlers call commonContext.sudo() directly (used for
// .db.User.updateOne/.findMany) and, only in /login, commonContext.withRequest(req, res)
// (its resolved value is used for .graphql.raw). This builds a minimal fake covering
// just that shape — never the real generated Context type from .keystone/types, since
// that file only exists once `keystone dev`/`build` has run.
export function createMockContext() {
  const dbUser = { updateOne: vi.fn(), findMany: vi.fn() }
  const sudoContext = { db: { User: dbUser } }
  const graphqlRaw = vi.fn()
  const requestContext = { graphql: { raw: graphqlRaw } }

  const commonContext = {
    sudo: vi.fn().mockReturnValue(sudoContext),
    withRequest: vi.fn().mockResolvedValue(requestContext),
  }

  return { commonContext: commonContext as any, dbUser, graphqlRaw }
}
