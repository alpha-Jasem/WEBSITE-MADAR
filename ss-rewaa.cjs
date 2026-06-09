const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto('https://platform.rewaatech.com/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Try to fill login
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="بريد" i]', 'z1jazz.98@gmail.com').catch(() => {})
  await page.fill('input[type="password"]', 'Aa12345++').catch(() => {})
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'rw-login.png', fullPage: false })

  await page.click('button[type="submit"], button:has-text("دخول"), button:has-text("Login"), button:has-text("تسجيل")').catch(() => {})
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'rw-after-login.png', fullPage: false })
  console.log('URL:', page.url())

  // Main dashboard
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'rw-dashboard.png', fullPage: false })

  await browser.close()
})()
