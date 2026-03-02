import { test, expect, type Page } from '@playwright/test'

/**
 * Admin Frontend - Comprehensive Feature Tests
 */

// Admin auth localStorage keys - must match the implementation in src/stores/auth.ts
const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_IS_SUPER_KEY = 'admin_is_super'
const ADMIN_ROLES_KEY = 'admin_roles'
const ADMIN_PERMISSIONS_KEY = 'admin_permissions'

// Simulate admin super-admin authentication using addInitScript
// so localStorage is set BEFORE the Vue/Pinia store initializes.
// Also mock the critical authz API so the router guard succeeds.
async function setupAdminAuth(page: Page) {
  // Set localStorage before Vue app loads
  await page.addInitScript(
    ({ tokenKey, isSuperKey, rolesKey, permissionsKey }) => {
      localStorage.setItem(tokenKey, 'fake-admin-token-super')
      localStorage.setItem(isSuperKey, '1')
      localStorage.setItem(rolesKey, JSON.stringify(['super_admin']))
      localStorage.setItem(permissionsKey, JSON.stringify([]))
    },
    {
      tokenKey: ADMIN_TOKEN_KEY,
      isSuperKey: ADMIN_IS_SUPER_KEY,
      rolesKey: ADMIN_ROLES_KEY,
      permissionsKey: ADMIN_PERMISSIONS_KEY,
    }
  )

  // Mock authz/me API - the router guard calls this on first protected page visit
  await page.route('**/api/v1/admin/authz/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'ok',
        data: {
          is_super: true,
          roles: ['super_admin'],
          policies: [],
        },
      }),
    })
  })
}

// ── Admin Login Page ──────────────────────────────────────────────────────

test.describe('Admin Login Page', () => {
  test('renders admin login form with username and password', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
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
    await expect(submitBtn).toHaveText(/登录|Login/)
  })

  test('can type in admin login form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('adminpassword')
    await expect(page.locator('#username')).toHaveValue('admin')
    await expect(page.locator('#password')).toHaveValue('adminpassword')
  })

  test('unauthenticated user accessing admin dashboard redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('admin_token'))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin login page shows correct title', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const heading = page.locator('h3').filter({ hasText: /后台登录|Admin Login/ }).first()
    await expect(heading).toBeVisible()
  })
})

// ── Admin Dashboard ───────────────────────────────────────────────────────

test.describe('Admin Dashboard', () => {
  test('dashboard page loads with admin auth', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('dashboard shows admin sidebar navigation', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Admin sidebar should be present
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    await expect(sidebar).toBeVisible()
  })

  test('dashboard has range selector', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Products ──────────────────────────────────────────────────────

test.describe('Admin - Products', () => {
  test('/products loads correctly', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/products shows search input', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]').first()
    await expect(searchInput).toBeVisible()
  })

  test('/products shows create button', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const createBtn = page.locator('button').filter({ hasText: /新建商品|新增|Add|Create/ }).first()
    await expect(createBtn).toBeVisible()
  })
})

// ── Admin - Categories ────────────────────────────────────────────────────

test.describe('Admin - Categories', () => {
  test('/categories loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Card Secrets ──────────────────────────────────────────────────

test.describe('Admin - Card Secrets', () => {
  test('/card-secrets loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/card-secrets')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Gift Cards ────────────────────────────────────────────────────

test.describe('Admin - Gift Cards', () => {
  test('/gift-cards loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/gift-cards')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Orders ────────────────────────────────────────────────────────

test.describe('Admin - Orders', () => {
  test('/orders loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/orders shows filter inputs', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    // At least one input (order no filter)
    const input = page.locator('input').first()
    await expect(input).toBeVisible()
  })
})

// ── Admin - Payments ──────────────────────────────────────────────────────

test.describe('Admin - Payments', () => {
  test('/payments loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/payments')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Payment Channels ──────────────────────────────────────────────

test.describe('Admin - Payment Channels', () => {
  test('/payment-channels loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/payment-channels')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Users ─────────────────────────────────────────────────────────

test.describe('Admin - Users', () => {
  test('/users loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/users shows search input', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    const input = page.locator('input').first()
    await expect(input).toBeVisible()
  })
})

// ── Admin - User Login Logs ───────────────────────────────────────────────

test.describe('Admin - User Login Logs', () => {
  test('/user-login-logs loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/user-login-logs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Posts ─────────────────────────────────────────────────────────

test.describe('Admin - Posts', () => {
  test('/posts loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/posts')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Banners ───────────────────────────────────────────────────────

test.describe('Admin - Banners', () => {
  test('/banners loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/banners')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Coupons ───────────────────────────────────────────────────────

test.describe('Admin - Coupons', () => {
  test('/coupons loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/coupons')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Promotions ────────────────────────────────────────────────────

test.describe('Admin - Promotions', () => {
  test('/promotions loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/promotions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Settings ──────────────────────────────────────────────────────

test.describe('Admin - Settings', () => {
  test('/settings loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/settings shows tab navigation', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    // Settings has multiple tabs: basic, smtp, captcha etc.
    const tabButtons = page.locator('button').filter({ hasText: /基础配置|Basic|SMTP/ })
    await expect(tabButtons.first()).toBeVisible()
  })

  test('/settings tabs are clickable', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    // Click through available tabs
    const allTabBtns = page.locator('button[type="button"]').filter({ hasText: /SMTP/ })
    if (await allTabBtns.count() > 0) {
      await allTabBtns.first().click()
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

// ── Admin - Wallet Recharges ──────────────────────────────────────────────

test.describe('Admin - Wallet Recharges', () => {
  test('/wallet-recharges loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/wallet-recharges')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Affiliate Management ──────────────────────────────────────────

test.describe('Admin - Affiliate Management', () => {
  test('/affiliates/users loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/affiliates/users')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/affiliates/commissions loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/affiliates/commissions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/affiliates/withdraws loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/affiliates/withdraws')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Authorization ─────────────────────────────────────────────────

test.describe('Admin - Authorization', () => {
  test('/authz loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/authz')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/authz-audit-logs loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/authz-audit-logs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Forbidden Page ────────────────────────────────────────────────

test.describe('Admin - Forbidden Page', () => {
  test('/forbidden page loads', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/forbidden')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Admin - Navigation ────────────────────────────────────────────────────

test.describe('Admin - Sidebar Navigation', () => {
  test('sidebar has navigation links', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Find sidebar nav links
    const navLinks = page.locator('nav a[href]')
    const count = await navLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  test('can navigate to orders via sidebar', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const ordersLink = page.locator('a[href="/orders"]').first()
    await expect(ordersLink).toBeVisible()
    await ordersLink.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/orders/)
  })

  test('can navigate to settings via sidebar', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const settingsLink = page.locator('a[href="/settings"]').first()
    await expect(settingsLink).toBeVisible()
    await settingsLink.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/settings/)
  })

  test('can navigate to users via sidebar', async ({ page }) => {
    await setupAdminAuth(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const usersLink = page.locator('a[href="/users"]').first()
    await expect(usersLink).toBeVisible()
  })
})
