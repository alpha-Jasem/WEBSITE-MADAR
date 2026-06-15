import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
})
const page = await ctx.newPage()

await page.goto('http://localhost:5173/car-wash', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: 'ss-local-cw-closed.png' })

// click hamburger (show-mobile class)
const ham = await page.$('.show-mobile')
if (ham) {
  await ham.click()
  await page.waitForTimeout(1000)
} else {
  console.log('hamburger not found, available buttons:')
  const btns = await page.$$eval('button', bs => bs.map(b => b.className + ' | ' + b.textContent?.trim()))
  console.log(btns)
}
await page.screenshot({ path: 'ss-local-cw-open.png' })

await browser.close()
console.log('done')
