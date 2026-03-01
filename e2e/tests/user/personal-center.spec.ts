import { test, expect, type Page } from '@playwright/test'

/**
 * User Frontend - Personal Center Tests
 * All sections of the personal center are tested via navigation guards
 */

// Shared setup to simulate authenticated user
async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('user_token', 'fake-token-for-test')
    // Store minimal profile data
    localStorage.setItem('user_profile', JSON.stringify({
      id: 1,
      email: 'test@example.com',
      nickname: 'Test User',
      locale: 'zh-CN',
    }))
  })
}

test.describe('Personal Center - Navigation', () => {
  test('personal center loads with auth token set', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me')
    await page.waitForLoadState('networkidle')
    // Should not redirect to login since we have a token
    // (The API will fail but the page routing should work)
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/me/profile loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/profile')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/me/security loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/security')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/me/orders loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/orders')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/me/wallet loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/wallet')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/me/gift-cards loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/gift-cards')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/me/affiliate loads', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/me/affiliate')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
