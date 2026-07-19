// lib/jwt.ts throws at import time if JWT_SECRET/JWT_REFRESH_SECRET are
// unset, and its internal dotenv.config() call won't overwrite values
// already present in process.env. Setting them here, in a setup file,
// guarantees they exist before any test file (or the modules it imports)
// is evaluated — a same-file assignment above an `import` would run too
// late, since import statements are hoisted. This also keeps the suite
// hermetic against api/.env, which is gitignored and won't exist in CI.
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-do-not-use-in-production'

// lib/storage/index.ts's `storageDriver` singleton throws at import time if
// the active STORAGE_DRIVER's required env vars are unset. Default to a
// valid `local` config here for the same reason as the JWT secrets above.
process.env.STORAGE_DRIVER = 'local'
process.env.STORAGE_LOCAL_DIR = './uploads'
process.env.STORAGE_LOCAL_PUBLIC_URL = 'http://localhost:3002/uploads'
