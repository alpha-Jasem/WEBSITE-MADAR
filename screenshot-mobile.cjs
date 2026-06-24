const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();
  await page.goto('https://madar.software', { waitUntil: 'networkidle', timeout: 30000 });

  // Scroll down to AiSection (roughly)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-ai-section.png', fullPage: false });

  // Also full page
  await page.screenshot({ path: 'screenshot-full.png', fullPage: true });

  await browser.close();
  console.log('Done');
})();
