import { expect, test } from '@playwright/test'

// Hits a mocked API (no live DB dependency) so this suite is hermetic and
// fast in CI. Scenarios mirror the Flutter version's Patrol suite
// (flutter/integration_test/login_flow_test.dart).

const user = { id: '1', name: 'Ada Lovelace', email: 'ada@example.com' }

// A JWT-shaped token with a real future `exp`, so isTokenExpired() (used by
// the auto-login fast path) evaluates it the same way it would a real
// access token, without needing a signature the client never verifies.
function fakeAccessToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString(
    'base64url',
  )
  return `${header}.${payload}.`
}

test('happy path: valid login lands on home showing the user name', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { accessToken: fakeAccessToken(), refreshToken: 'refresh', user } }),
  )

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('hunter2')
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByText(`Welcome, ${user.name}`)).toBeVisible()
})

test('wrong password shows the exact enumeration-safe error message', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 401, json: { error: 'Invalid email or password' } }),
  )

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page.getByText('Invalid email or password')).toBeVisible()
  await expect(page).toHaveURL('/login')
})

test('loading state disables the form while the request is in flight', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.fulfill({ json: { accessToken: fakeAccessToken(), refreshToken: 'refresh', user } })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('hunter2')
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page.getByLabel('Email')).toBeDisabled()
  await expect(page.getByLabel('Password')).toBeDisabled()
  await expect(page).toHaveURL('/')
})

test('session survives a hard reload (auto-login)', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { accessToken: fakeAccessToken(), refreshToken: 'refresh', user } }),
  )

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('hunter2')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL('/')

  await page.reload()

  await expect(page).toHaveURL('/')
  await expect(page.getByText(`Welcome, ${user.name}`)).toBeVisible()
})

test('logout returns to /login', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { accessToken: fakeAccessToken(), refreshToken: 'refresh', user } }),
  )
  await page.route('**/api/auth/logout', (route) => route.fulfill({ json: { success: true } }))

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('hunter2')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL('/')

  await page.getByRole('button', { name: 'Log out' }).click()

  await expect(page).toHaveURL('/login')
})
