import { test, expect } from '@playwright/test'

/**
 * User Frontend - Authentication Pages Tests
 * Tests all auth pages with real interactions
 */

// ── Login Page ────────────────────────────────────────────────────────────

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
    await expect(submitBtn).toHaveText(/登录|Sign In|Login/)
  })

  test('login form has remember me checkbox', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const rememberMe = page.locator('input[type="checkbox"]')
    await expect(rememberMe).toBeVisible()
    // Checkbox should be checked by default
    await expect(rememberMe).toBeChecked()
  })

  test('can toggle remember me checkbox', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const rememberMe = page.locator('input[type="checkbox"]')
    await rememberMe.uncheck()
    await expect(rememberMe).not.toBeChecked()
    await rememberMe.check()
    await expect(rememberMe).toBeChecked()
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

  test('can type email and password into login form', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    await emailInput.fill('user@example.com')
    await passwordInput.fill('password123')
    await expect(emailInput).toHaveValue('user@example.com')
    await expect(passwordInput).toHaveValue('password123')
  })

  test('submitting empty form does not navigate away', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await page.locator('button[type="submit"]').click()
    // Should stay on login page (HTML5 validation or API error)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('back to home link works', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const homeLink = page.locator('a[href="/"]').first()
    await expect(homeLink).toBeVisible()
  })
})

// ── Register Page ─────────────────────────────────────────────────────────

test.describe('Register Page', () => {
  test('renders register form with required fields', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('register page has verification code input and send button', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const codeInput = page.locator('input[type="text"]').first()
    const sendCodeBtn = page.locator('button').filter({ hasText: /发送验证码|Send Code/ })
    await expect(codeInput).toBeVisible()
    await expect(sendCodeBtn).toBeVisible()
  })

  test('register page has submit button that is disabled without agreeing', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
    // Submit button should be disabled when agreement not checked
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button enables after agreeing to terms', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const agreementCheckbox = page.locator('input[type="checkbox"]')
    await expect(agreementCheckbox).toBeVisible()
    // Checkbox is not checked by default
    await agreementCheckbox.check()
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).not.toBeDisabled()
  })

  test('register page has link to login', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const loginLink = page.locator('a[href="/auth/login"]').first()
    await expect(loginLink).toBeVisible()
  })

  test('can fill register form fields', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill('newuser@example.com')
    await page.locator('input[type="password"]').fill('securepassword123')
    await expect(page.locator('input[type="email"]')).toHaveValue('newuser@example.com')
  })

  test('register page has links to privacy and terms', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const privacyLink = page.locator('a[href="/privacy"]').first()
    const termsLink = page.locator('a[href="/terms"]').first()
    await expect(privacyLink).toBeVisible()
    await expect(termsLink).toBeVisible()
  })
})

// ── Forgot Password Page ──────────────────────────────────────────────────

test.describe('Forgot Password Page', () => {
  test('renders forgot password form with email field', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('forgot page has verification code input and send button', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')
    const sendCodeBtn = page.locator('button').filter({ hasText: /发送验证码|Send Code/ })
    await expect(sendCodeBtn).toBeVisible()
  })

  test('forgot page has new password field', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('forgot password page has submit button', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('can fill forgot password form', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill('forgot@example.com')
    await expect(page.locator('input[type="email"]')).toHaveValue('forgot@example.com')
  })

  test('forgot password page has back to login link', async ({ page }) => {
    await page.goto('/auth/forgot')
    await page.waitForLoadState('networkidle')
    const loginLink = page.locator('a[href="/auth/login"]').first()
    await expect(loginLink).toBeVisible()
  })
})

// ── Auth Navigation Guards ─────────────────────────────────────────────────

test.describe('Auth Navigation Guards', () => {
  test('unauthenticated access to /me redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/orders redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me/orders')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/wallet redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me/wallet')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/profile redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me/profile')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/security redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me/security')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/gift-cards redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me/gift-cards')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated access to /me/affiliate redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.goto('/me/affiliate')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('authenticated user visiting login page redirects to orders', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('user_token', 'fake-token-for-test')
    })
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/me\/orders/)
  })
})
