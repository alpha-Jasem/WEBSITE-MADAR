import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
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

// The sidebar is on the RIGHT in RTL — crop right side bottom
await page.screenshot({ path: 'ss-sidebar-bottom.png', clip: { x: 1200, y: 750, width: 240, height: 150 } });
// Also get sidebar full
await page.screenshot({ path: 'ss-sidebar.png', clip: { x: 1200, y: 0, width: 240, height: 900 } });

console.log('done');
await browser.close();
