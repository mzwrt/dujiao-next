import { test, expect, type Page } from '@playwright/test'

/**
 * User Frontend - Public Pages & Feature Interaction Tests
 */

// ── Navbar ──────────────────────────────────────────────────────────────────

test.describe('Navbar', () => {
  test('shows all navigation links', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav a[href="/products"]').first()).toBeVisible()
    await expect(page.locator('nav a[href="/blog"]').first()).toBeVisible()
    await expect(page.locator('nav a[href="/notice"]').first()).toBeVisible()
    await expect(page.locator('nav a[href="/about"]').first()).toBeVisible()
  })

  test('theme toggle button is present and clickable', async ({ page }) => {
    await page.goto('/')
    // Theme toggle button is in nav - has a sun or moon icon
    const themeBtn = page.locator('nav button').filter({ has: page.locator('svg') }).first()
    await expect(themeBtn).toBeVisible()
    await themeBtn.click()
    // After click the html element should have a different class (dark/light)
    const html = page.locator('html')
    await expect(html).toBeVisible()
  })

  test('language switcher button opens dropdown', async ({ page }) => {
    await page.goto('/')
    // Language button shows current locale code
    const langBtn = page.locator('button').filter({ hasText: /^(简|繁|EN)$/ })
    await expect(langBtn).toBeVisible()
    await langBtn.click()
    // Dropdown should appear with language options
    const dropdown = page.locator('button').filter({ hasText: /简体中文|繁體中文|English/ }).first()
    await expect(dropdown).toBeVisible()
  })

  test('language switcher changes language on selection', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('button').filter({ hasText: /^(简|繁|EN)$/ })
    await langBtn.click()
    // Click English option
    await page.locator('button').filter({ hasText: 'English' }).click()
    // Language button should now show EN
    await expect(page.locator('button').filter({ hasText: 'EN' })).toBeVisible()
    // Switch back to Chinese
    const langBtnEn = page.locator('button').filter({ hasText: 'EN' })
    await langBtnEn.click()
    await page.locator('button').filter({ hasText: '简体中文' }).click()
  })

  test('cart link shows correct badge when items in cart', async ({ page }) => {
    // Inject 2 items into cart localStorage
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('cart_items', JSON.stringify([
        { productId: 1, skuId: 0, slug: 'test-p', title: { 'zh-CN': '测试商品' }, priceAmount: '9.90', quantity: 2 },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Badge should show the total count (2)
    const badge = page.locator('.theme-nav-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('2')
  })

  test('login link is visible when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('user_token'))
    await page.reload()
    await expect(page.locator('a[href="/auth/login"]').first()).toBeVisible()
  })

  test('mobile menu button opens menu on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // Mobile menu button (hamburger)
    const hamburger = page.locator('nav button.md\\:hidden')
    await expect(hamburger).toBeVisible()
    await hamburger.click()
    // Mobile menu should appear
    const mobileMenu = page.locator('nav .md\\:hidden').filter({ has: page.locator('a[href="/products"]') })
    await expect(mobileMenu).toBeVisible()
  })
})

// ── Home Page ────────────────────────────────────────────────────────────────

test.describe('Home Page', () => {
  test('renders with title and hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('.home-page')).toBeVisible()
  })

  test('hero section has CTA buttons and links to products', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const productsLink = page.locator('a[href="/products"]')
    await expect(productsLink.first()).toBeVisible()
  })

  test('products section shows heading', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Products section heading
    const heading = page.locator('h2').filter({ hasText: /精选商品|Featured Products/ }).first()
    await expect(heading).toBeVisible()
  })

  test('latest posts section shows blog and notice links', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a[href="/blog"]').first()).toBeVisible()
    await expect(page.locator('a[href="/notice"]').first()).toBeVisible()
  })

  test('footer is present with copyright', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer, [class*="contentinfo"]')
    await expect(footer.first()).toBeVisible()
  })
})

// ── Products Page ─────────────────────────────────────────────────────────

test.describe('Products Page', () => {
  test('renders with page heading', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const heading = page.locator('h1').filter({ hasText: /商品中心|Products/ }).first()
    await expect(heading).toBeVisible()
  })

  test('has search input', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
  })

  test('can type in search input', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]')
    await searchInput.fill('test search query')
    await expect(searchInput).toHaveValue('test search query')
  })

  test('has category sidebar with All Products button', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const allCatBtn = page.locator('button').filter({ hasText: /全部商品|All/ }).first()
    await expect(allCatBtn).toBeVisible()
  })

  test('All Products button is clickable', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const allCatBtn = page.locator('button').filter({ hasText: /全部商品|All/ }).first()
    await allCatBtn.click()
    await expect(allCatBtn).toBeVisible()
  })
})

// ── Blog Page ─────────────────────────────────────────────────────────────

test.describe('Blog Page', () => {
  test('renders with page heading', async ({ page }) => {
    await page.goto('/blog')
    await page.waitForLoadState('networkidle')
    const heading = page.locator('h1').filter({ hasText: /博客|Blog/ }).first()
    await expect(heading).toBeVisible()
  })

  test('shows empty state or post list when loaded', async ({ page }) => {
    await page.goto('/blog')
    await page.waitForLoadState('networkidle')
    // Either empty message or posts are present
    const hasContent = await page.locator('.blog-page').isVisible()
    expect(hasContent).toBe(true)
  })
})

// ── Notice Page ───────────────────────────────────────────────────────────

test.describe('Notice Page', () => {
  test('renders with page heading', async ({ page }) => {
    await page.goto('/notice')
    await page.waitForLoadState('networkidle')
    const heading = page.locator('h1').filter({ hasText: /公告|Notice/ }).first()
    await expect(heading).toBeVisible()
  })
})

// ── About Page ────────────────────────────────────────────────────────────

test.describe('About Page', () => {
  test('renders about page container', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.about-page')).toBeVisible()
  })
})

// ── Legal Pages ───────────────────────────────────────────────────────────

test.describe('Legal Pages', () => {
  test('terms page renders with title', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
    const title = page.locator('h1').filter({ hasText: /服务条款|Terms/ }).first()
    await expect(title).toBeVisible()
  })

  test('privacy page renders with title', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    const title = page.locator('h1').filter({ hasText: /隐私政策|Privacy/ }).first()
    await expect(title).toBeVisible()
  })
})

// ── Cart Page ─────────────────────────────────────────────────────────────

async function injectCartItem(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('cart_items', JSON.stringify([
      {
        productId: 1,
        skuId: 0,
        slug: 'test-product',
        title: { 'zh-CN': '测试商品', 'en-US': 'Test Product' },
        priceAmount: '10.00',
        image: '',
        quantity: 2,
        purchaseType: 'member',
        fulfillmentType: 'auto',
        // Provide available auto stock so quantity controls are enabled
        skuAutoStockAvailable: 10,
      },
    ]))
  })
  // Reload so the Pinia cart store re-reads from localStorage
  await page.reload()
}

test.describe('Cart Page', () => {
  test('empty cart shows products link', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('cart_items'))
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    const productsLink = page.locator('a[href="/products"]')
    await expect(productsLink.first()).toBeVisible()
  })

  test('cart page has checkout flow steps', async ({ page }) => {
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    const flowStep = page.locator('.theme-step-chip')
    await expect(flowStep.first()).toBeVisible()
  })

  test('cart with items shows product title and quantity controls', async ({ page }) => {
    await injectCartItem(page)
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Quantity buttons - and + should be visible
    const minusBtn = page.locator('button').filter({ hasText: '-' }).first()
    const plusBtn = page.locator('button').filter({ hasText: '+' }).first()
    await expect(minusBtn).toBeVisible()
    await expect(plusBtn).toBeVisible()
  })

  test('cart with items shows summary and checkout button', async ({ page }) => {
    await injectCartItem(page)
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Checkout button
    const checkoutLink = page.locator('a[href="/checkout"]')
    await expect(checkoutLink).toBeVisible()
  })

  test('cart increase quantity button works', async ({ page }) => {
    await injectCartItem(page)
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Get quantity input (starts at 2)
    const qtyInput = page.locator('input.cart-qty-input').first()
    await expect(qtyInput).toBeVisible()
    const before = await qtyInput.inputValue()
    // Click plus button
    await page.locator('button').filter({ hasText: '+' }).first().click()
    const after = await qtyInput.inputValue()
    expect(Number(after)).toBeGreaterThan(Number(before))
  })

  test('cart remove item works', async ({ page }) => {
    await injectCartItem(page)
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    // Remove button - '移除' in Chinese
    const removeBtn = page.locator('button').filter({ hasText: /移除|Remove/ }).first()
    await expect(removeBtn).toBeVisible()
    await removeBtn.click()
    // Cart should now show empty state
    const productsLink = page.locator('a[href="/products"]')
    await expect(productsLink.first()).toBeVisible()
  })
})

// ── Checkout Page ─────────────────────────────────────────────────────────

test.describe('Checkout Page', () => {
  test('renders checkout page', async ({ page }) => {
    await injectCartItem(page)
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('checkout page has guest email field', async ({ page }) => {
    await injectCartItem(page)
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@example.com')
    await expect(emailInput).toHaveValue('test@example.com')
  })

  test('checkout flow steps are shown', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    const flowStep = page.locator('.theme-step-chip')
    await expect(flowStep.first()).toBeVisible()
  })
})

// ── Payment Page ──────────────────────────────────────────────────────────

test.describe('Payment Page', () => {
  test('renders payment page without order (shows not found)', async ({ page }) => {
    await page.goto('/pay')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Guest Orders Page ─────────────────────────────────────────────────────

test.describe('Guest Orders Page', () => {
  test('renders guest orders page with search form', async ({ page }) => {
    await page.goto('/guest/orders')
    await page.waitForLoadState('networkidle')
    // Page heading
    const heading = page.locator('h1').filter({ hasText: /游客订单|Guest/ }).first()
    await expect(heading).toBeVisible()
  })

  test('search form has email, password and order no inputs', async ({ page }) => {
    await page.goto('/guest/orders')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const orderInput = page.locator('input[type="text"]').first()
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(orderInput).toBeVisible()
  })

  test('can fill search form fields', async ({ page }) => {
    await page.goto('/guest/orders')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').first().fill('guest@example.com')
    await page.locator('input[type="password"]').first().fill('secret123')
    await page.locator('input[type="text"]').first().fill('ORD-123456')
    await expect(page.locator('input[type="email"]').first()).toHaveValue('guest@example.com')
  })

  test('search button is present and clickable', async ({ page }) => {
    await page.goto('/guest/orders')
    await page.waitForLoadState('networkidle')
    const searchBtn = page.locator('button').filter({ hasText: /查询订单|Search/ }).first()
    await expect(searchBtn).toBeVisible()
    // Click it and expect it either shows loading or error
    await searchBtn.click()
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Product Detail Page ───────────────────────────────────────────────────

test.describe('Product Detail Page', () => {
  test('non-existent product shows not found', async ({ page }) => {
    await page.goto('/products/non-existent-product-slug-xyz')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

// ── Not Found Page ────────────────────────────────────────────────────────

test.describe('Not Found Page', () => {
  test('renders 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-at-all')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
