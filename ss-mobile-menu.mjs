import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  extraHTTPHeaders: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
})
const page = await ctx.newPage()

await page.goto('https://madar.software/car-wash', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.screenshot({ path: 'ss-cw-closed.png' })

// click hamburger
const ham = await page.$('.show-mobile')
if (ham) { await ham.click(); await page.waitForTimeout(800) }
else {
  // try button with menu icon
  const btns = await page.$$('button')
  for (const b of btns) {
    const txt = await b.innerText().catch(() => '')
    if (!txt) { await b.click(); await page.waitForTimeout(800); break }
  }
}
await page.screenshot({ path: 'ss-cw-open.png' })

await browser.close()
console.log('done')
