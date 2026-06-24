const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  // Scroll slowly to trigger all animations
  for (let i = 0; i <= 100; i += 3) {
    await page.evaluate((p) => window.scrollTo(0, document.body.scrollHeight * p / 100), i);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "ss-full.png", fullPage: true });
  await browser.close();
  console.log("Done");
})();
