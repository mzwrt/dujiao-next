import { test, expect, type Page } from '@playwright/test'

/**
 * Admin Frontend - All Admin Pages Tests
 */

// Simulate admin authentication
async function setupAdminAuth(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('admin_token', 'fake-admin-token')
    localStorage.setItem('admin_info', JSON.stringify({
      id: 1,
      username: 'admin',
      role: 'super_admin',
    }))
    // Mock permissions - all permissions granted
    localStorage.setItem('admin_permissions', JSON.stringify(['*']))
  })
}

test.describe('Admin Login Page', () => {
  test('renders admin login form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Admin login has username input with id="username" and password
    const usernameInput = page.locator('#username')
    const passwordInput = page.locator('#password')
    await expect(usernameInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('admin login page has submit button', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('unauthenticated user accessing admin dashboard redirects to login', async ({ page }) => {
    // Clear any stored admin auth
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('admin_token')
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Admin Dashboard', () => {
  test('dashboard page loads with admin auth', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Products', () => {
  test('/products loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Categories', () => {
  test('/categories loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Card Secrets', () => {
  test('/card-secrets loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/card-secrets')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Gift Cards', () => {
  test('/gift-cards loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/gift-cards')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Orders', () => {
  test('/orders loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Payments', () => {
  test('/payments loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/payments')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Payment Channels', () => {
  test('/payment-channels loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/payment-channels')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Users', () => {
  test('/users loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - User Login Logs', () => {
  test('/user-login-logs loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/user-login-logs')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Posts', () => {
  test('/posts loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/posts')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Banners', () => {
  test('/banners loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/banners')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Coupons', () => {
  test('/coupons loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/coupons')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Promotions', () => {
  test('/promotions loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/promotions')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Settings', () => {
  test('/settings loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Wallet Recharges', () => {
  test('/wallet-recharges loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/wallet-recharges')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Affiliate Management', () => {
  test('/affiliates/users loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/affiliates/users')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/affiliates/commissions loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/affiliates/commissions')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/affiliates/withdraws loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/affiliates/withdraws')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Authorization', () => {
  test('/authz loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/authz')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('/authz-audit-logs loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/authz-audit-logs')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Admin - Forbidden Page', () => {
  test('/forbidden page loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/forbidden')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
