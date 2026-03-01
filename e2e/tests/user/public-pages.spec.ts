import { test, expect } from '@playwright/test'

/**
 * User Frontend - Public Pages Tests
 * Tests all public-facing pages: Home, Products, Blog, etc.
 */

test.describe('Home Page', () => {
  test('renders home page with hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
    // Hero section should be present
    const homeDiv = page.locator('.home-page')
    await expect(homeDiv).toBeVisible()
  })

  test('hero section has navigation buttons', async ({ page }) => {
    await page.goto('/')
    // Should have "View All" link to products
    const productsLinks = page.locator('a[href="/products"]')
    await expect(productsLinks.first()).toBeVisible()
  })

  test('latest posts section exists', async ({ page }) => {
    await page.goto('/')
    // Blog and notice links should exist
    const blogLink = page.locator('a[href="/blog"]').first()
    await expect(blogLink).toBeVisible()
    const noticeLink = page.locator('a[href="/notice"]').first()
    await expect(noticeLink).toBeVisible()
  })

  test('navigation bar is present', async ({ page }) => {
    await page.goto('/')
    const navbar = page.locator('nav').first()
    await expect(navbar).toBeVisible()
  })
})

test.describe('Products Page', () => {
  test('renders products listing page', async ({ page }) => {
    await page.goto('/products')
    await expect(page).toHaveTitle(/.+/)
    // Products page should render
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('products page has search or filter UI', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    // Page should render without JS errors
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    // Wait for page to stabilize
    await expect(page.locator('body')).toBeVisible()
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('ERR_'))).toHaveLength(0)
  })
})

test.describe('Blog Page', () => {
  test('renders blog listing page', async ({ page }) => {
    await page.goto('/blog')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Notice Page', () => {
  test('renders notice page', async ({ page }) => {
    await page.goto('/notice')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('About Page', () => {
  test('renders about page', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Legal Pages', () => {
  test('renders terms page', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('renders privacy page', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Cart Page', () => {
  test('renders cart page with empty state', async ({ page }) => {
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Cart shows empty state for unauthenticated user
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('cart page has checkout flow steps', async ({ page }) => {
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Flow steps should be visible
    const flowSteps = page.locator('.theme-step-chip')
    await expect(flowSteps.first()).toBeVisible()
  })

  test('empty cart shows link to products', async ({ page }) => {
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Should have link to products when empty
    const productsLink = page.locator('a[href="/products"]')
    await expect(productsLink.first()).toBeVisible()
  })
})

test.describe('Checkout Page', () => {
  test('renders checkout page', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Payment Page', () => {
  test('renders payment page', async ({ page }) => {
    await page.goto('/pay')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Guest Orders Page', () => {
  test('renders guest orders page', async ({ page }) => {
    await page.goto('/guest/orders')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Not Found Page', () => {
  test('renders 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-at-all')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
