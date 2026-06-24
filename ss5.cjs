const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);
  for (let i = 0; i <= 5; i++) {
    await page.evaluate((p) => window.scrollTo(0, document.body.scrollHeight * p / 100), i * 2);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "screenshot-rebrand.png" });
  await browser.close();
  console.log("Done");
})();
