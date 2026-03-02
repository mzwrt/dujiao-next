import { test, expect, type Page } from '@playwright/test'

/**
 * User Frontend - Personal Center Tests
 * Tests all sections of the personal center via auth simulation
 */

// Shared setup to simulate authenticated user
async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('user_token', 'fake-token-for-test')
    localStorage.setItem('user_profile', JSON.stringify({
      id: 1,
      email: 'test@example.com',
      nickname: 'Test User',
      locale: 'zh-CN',
    }))
  })
}

// ── Navigation Guards ─────────────────────────────────────────────────────

test.describe('Personal Center - Navigation', () => {
  test('personal center loads with auth token set', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('/me/profile loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/profile')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })

  test('/me/security loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/security')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })

  test('/me/orders loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/orders')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })

  test('/me/wallet loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/wallet')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })

  test('/me/gift-cards loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/gift-cards')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })

  test('/me/affiliate loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/affiliate')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/auth\/login/)
  })
})

// ── Section UI ────────────────────────────────────────────────────────────

test.describe('Personal Center - Overview', () => {
  test('overview page shows sidebar navigation', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('overview has multiple section buttons', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    const buttons = page.locator('aside button[type="button"]')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(3)
  })

  test('clicking orders tab navigates to /me/orders', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    const ordersBtn = page.locator('aside button').filter({ hasText: /订单|Orders/ }).first()
    await ordersBtn.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/me\/orders/)
  })

  test('clicking wallet tab navigates to /me/wallet', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    const walletBtn = page.locator('aside button').filter({ hasText: /钱包|Wallet/ }).first()
    await walletBtn.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/me\/wallet/)
  })

  test('clicking profile tab navigates to /me/profile', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    const profileBtn = page.locator('aside button').filter({ hasText: /资料设置|Profile/ }).first()
    await profileBtn.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/me\/profile/)
  })
})

// ── Profile Panel ─────────────────────────────────────────────────────────

test.describe('Personal Center - Profile Panel', () => {
  test('shows nickname input and locale selector', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/profile')
    await page.waitForLoadState('networkidle')
    const nicknameInput = page.locator('input[placeholder*="昵称"], input[placeholder*="Nickname"]')
    await expect(nicknameInput).toBeVisible()
    const localeSelect = page.locator('select')
    await expect(localeSelect).toBeVisible()
  })

  test('shows save button', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/profile')
    await page.waitForLoadState('networkidle')
    const saveBtn = page.locator('button[type="submit"]')
    await expect(saveBtn).toBeVisible()
  })
})

// ── Security Panel ────────────────────────────────────────────────────────

test.describe('Personal Center - Security Panel', () => {
  test('shows email change form', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/security')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()
  })

  test('shows password fields', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/security')
    await page.waitForLoadState('networkidle')
    const passwordInputs = page.locator('input[type="password"]')
    const count = await passwordInputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ── Wallet Panel ──────────────────────────────────────────────────────────

test.describe('Personal Center - Wallet Panel', () => {
  test('shows recharge amount input', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/wallet')
    await page.waitForLoadState('networkidle')
    const amountInput = page.locator('input[inputmode="decimal"]')
    await expect(amountInput).toBeVisible()
  })
})
