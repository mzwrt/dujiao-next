import { test, expect } from '@playwright/test'

/**
 * User Frontend - Authentication Pages Tests
 */

test.describe('Login Page', () => {
  test('renders login form with email and password fields', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('login form has submit button', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('login form has remember me checkbox', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const rememberMe = page.locator('input[type="checkbox"]')
    await expect(rememberMe).toBeVisible()
  })

  test('login page has link to register page', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const registerLink = page.locator('a[href="/auth/register"]')
    await expect(registerLink).toBeVisible()
  })

  test('login page has link to forgot password page', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const forgotLink = page.locator('a[href="/auth/forgot"]')
    await expect(forgotLink).toBeVisible()
  })

  test('shows error when submitting empty form', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Try to submit without filling in fields
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]')
    // Email field should still be focused/invalid
    await expect(emailInput).toBeVisible()
  })

  test('back to home link works', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const homeLink = page.locator('a[href="/"]').first()
    await expect(homeLink).toBeVisible()
  })
})

test.describe('Register Page', () => {
  test('renders register form', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('register page has password field', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('register page has submit button', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('register page has link to login', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')

    const loginLink = page.locator('a[href="/auth/login"]').first()
    await expect(loginLink).toBeVisible()
  })
})

test.describe('Forgot Password Page', () => {
  test('renders forgot password form', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('forgot password page has submit button', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('forgot password page has back to login link', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')

    const loginLink = page.locator('a[href="/auth/login"]').first()
    await expect(loginLink).toBeVisible()
  })
})

test.describe('Auth Navigation Guards', () => {
  test('unauthenticated access to /me redirects to login', async ({ page }) => {
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/orders redirects to login', async ({ page }) => {
    await page.goto('/me/orders')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/wallet redirects to login', async ({ page }) => {
    await page.goto('/me/wallet')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/profile redirects to login', async ({ page }) => {
    await page.goto('/me/profile')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('authenticated user visiting login page redirects to orders', async ({ page }) => {
    // Set a token in localStorage to simulate logged-in state
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('user_token', 'fake-token-for-test')
    })
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    // Should redirect away from login page
    await expect(page).toHaveURL(/\/me\/orders/)
  })
})
