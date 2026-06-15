import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'ar-SA',
  reducedMotion: 'reduce'
});
const page = await context.newPage();

// Capture console errors
page.on('console', msg => { if (msg.type() === 'error') console.log('JS ERROR:', msg.text()) });

await page.goto('https://madar.software/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(3000);

await page.fill('input[type="email"]', 'z1jazz.98@gmail.com');
await page.fill('input[type="password"]', 'Madar@Ahmed2026');
await page.click('button[type="submit"]');

// Wait for navigation to /client
await page.waitForURL('**/client**', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(5000);

console.log('URL after login:', page.url());

// Full page screenshot
await page.screenshot({ path: 'ss-full.png', fullPage: true });
console.log('✓ full page screenshot');

// Wider topbar crop (top 100px)
await page.screenshot({ path: 'ss-topbar2.png', clip: { x: 0, y: 0, width: 1440, height: 100 } });
console.log('✓ topbar crop');

await browser.close();
