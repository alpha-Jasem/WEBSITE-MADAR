const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // ── Login as CLIENT (Jasem) ──
  await page.goto('https://madar.software/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  await page.locator('text=بوابة العملاء').first().click()
  await page.waitForTimeout(600)

  await page.fill('input[type="email"]', 'jasemaltubaishi@gmail.com')
  await page.fill('input[type="password"]', 'Madar@2026!0')
  await page.waitForTimeout(400)

  await page.click('button[type="submit"]')
  await page.waitForURL(/\/client/, { timeout: 20_000 }).catch(() => {})
  await page.waitForTimeout(4000)
  console.log('URL after login:', page.url())

  const routes = [
    { path: '/client',             name: 'overview'    },
    { path: '/client/queue',       name: 'queue'       },
    { path: '/client/leads',       name: 'leads'       },
    { path: '/client/finance',     name: 'finance'     },
    { path: '/client/reports',     name: 'reports'     },
    { path: '/client/automations', name: 'automations' },
    { path: '/client/settings',    name: 'settings'    },
  ]

  for (const { path, name } of routes) {
    await page.goto(`https://madar.software${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `ss-${name}.png`, fullPage: false })
    console.log(`✓ ${name}`)
  }

  await browser.close()
  console.log('All screenshots done.')
})()
