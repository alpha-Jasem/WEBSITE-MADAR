import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'ar-SA',
  reducedMotion: 'reduce',
  deviceScaleFactor: 2  // retina for better clarity
});
const page = await context.newPage();

await page.goto('https://madar.software/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'z1jazz.98@gmail.com');
await page.fill('input[type="password"]', 'Madar@Ahmed2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/client**', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(5000);

// Crop: left side of topbar (controls area in RTL)
await page.screenshot({ path: 'ss-controls.png', clip: { x: 0, y: 0, width: 400, height: 55 } });
// Crop: right side of topbar (title area in RTL)
await page.screenshot({ path: 'ss-title.png', clip: { x: 1040, y: 0, width: 400, height: 55 } });
// Full topbar
await page.screenshot({ path: 'ss-topbar3.png', clip: { x: 0, y: 0, width: 1440, height: 55 } });

console.log('done, url:', page.url());
await browser.close();
