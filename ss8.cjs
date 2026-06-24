const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  // Scroll slowly to trigger animations
  for (let i = 0; i <= 100; i += 2) {
    await page.evaluate((p) => window.scrollTo(0, document.body.scrollHeight * p / 100), i);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1000);
  // Take 8 viewport screenshots at different scroll positions
  const positions = [0, 12, 24, 36, 48, 60, 72, 84, 96];
  for (const pct of positions) {
    await page.evaluate((p) => window.scrollTo(0, document.body.scrollHeight * p / 100), pct);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `ss-p${pct}.png` });
  }
  await browser.close();
  console.log("Done");
})();
