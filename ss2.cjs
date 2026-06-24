const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto("https://madar.software", { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.30));
  await page.waitForTimeout(800);
  await page.screenshot({ path: "screenshot-ai-30.png" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.38));
  await page.waitForTimeout(800);
  await page.screenshot({ path: "screenshot-ai-38.png" });
  await browser.close();
  console.log("Done");
})();
