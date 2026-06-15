import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'ar-SA',
  reducedMotion: 'reduce'
});
const page = await context.newPage();

// Login with Ahmed's account
await page.goto('https://madar.software/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

await page.fill('input[type="email"]', 'z1jazz.98@gmail.com');
await page.fill('input[type="password"]', 'Madar@Ahmed2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);

// Screenshot after login
await page.screenshot({ path: 'ss-live-dashboard.png', fullPage: false });
console.log('✓ live dashboard:', page.url());

// Zoom on topbar area
await page.screenshot({ path: 'ss-live-topbar.png', clip: { x: 0, y: 0, width: 1440, height: 65 } });
console.log('✓ topbar crop');

await browser.close();
