import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

// Mobile viewport
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'ar-SA',
  reducedMotion: 'reduce',
  deviceScaleFactor: 2
});
const page = await context.newPage();

await page.goto('https://madar.software/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'z1jazz.98@gmail.com');
await page.fill('input[type="password"]', 'Madar@Ahmed2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/client**', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(5000);

await page.screenshot({ path: 'ss-mobile.png', fullPage: false });
console.log('mobile done');
await browser.close();
