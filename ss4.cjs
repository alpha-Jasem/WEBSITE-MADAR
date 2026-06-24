const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  // Slowly scroll through the page to trigger all whileInView animations
  for (let i = 0; i <= 40; i++) {
    await page.evaluate((pct) => window.scrollTo(0, document.body.scrollHeight * pct / 100), i);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshot-verify2.png" });
  await browser.close();
  console.log("Done");
})();
