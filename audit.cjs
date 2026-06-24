const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  // Slow scroll to trigger all animations
  for (let i = 0; i <= 100; i += 2) {
    await page.evaluate((p) => window.scrollTo(0, document.body.scrollHeight * p / 100), i);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1000);
  const stops = [0,8,16,24,32,40,48,56,64,72,80,88,96];
  for (const p of stops) {
    await page.evaluate((pct) => window.scrollTo(0, document.body.scrollHeight * pct / 100), p);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `audit-${p}.png` });
  }
  await browser.close();
  console.log("Done");
})();
