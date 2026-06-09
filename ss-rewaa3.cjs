const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto('https://platform.rewaatech.com/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.fill('input[type="email"]', 'z1jazz.98@gmail.com').catch(() => {})
  await page.fill('input[type="password"]', 'Aa12345++').catch(() => {})
  await page.click('button[type="submit"]').catch(() => {})
  await page.waitForTimeout(6000)

  const routes = [
    { path: '/sales/promotions', name: 'promotions' },
    { path: '/customers/list', name: 'customers-list' },
    { path: '/settings', name: 'settings' },
    { path: '/reports/sales-by-product', name: 'report-product' },
    { path: '/reports/sales-by-employee', name: 'report-employee' },
  ]

  for (const { path, name } of routes) {
    await page.goto(`https://platform.rewaatech.com${path}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `rw2-${name}.png`, fullPage: false })
    console.log(`✓ ${name} — ${page.url()}`)
  }

  await browser.close()
})()
