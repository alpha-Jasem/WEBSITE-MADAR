const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.38));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "screenshot-verify.png" });
  await browser.close();
  console.log("Done");
})();
