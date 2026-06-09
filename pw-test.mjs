import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const allErrors = [];

const page = await browser.newPage();
page.on("pageerror", err => allErrors.push(`PAGE ERROR: ${err.message}`));

await page.setViewportSize({ width: 1440, height: 900 });

// Load homepage — wait for H1 to render
await page.goto("http://localhost:4173/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.waitForSelector('h1', { timeout: 8000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-home-hero.png" });

await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(1000);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-home-trust.png" });

await page.evaluate(() => window.scrollTo(0, 1800));
await page.waitForTimeout(1000);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-home-howitworks.png" });

await page.evaluate(() => window.scrollTo(0, 2700));
await page.waitForTimeout(800);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-home-products.png" });

await page.goto("http://localhost:4173/clinic", { waitUntil: "domcontentloaded", timeout: 10000 });
await page.waitForSelector('h1', { timeout: 8000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-clinic-hero.png" });

await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(1000);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-clinic-features.png" });

await page.evaluate(() => window.scrollTo(0, 2000));
await page.waitForTimeout(1000);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-clinic-noraworks.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:4173/", { waitUntil: "domcontentloaded", timeout: 10000 });
await page.waitForSelector('h1', { timeout: 8000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mobile-home.png" });

await page.goto("http://localhost:4173/clinic", { waitUntil: "domcontentloaded", timeout: 10000 });
await page.waitForSelector('h1', { timeout: 8000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mobile-clinic.png" });

console.log("Errors:", allErrors.length ? allErrors.join("\n") : "NONE");
await browser.close();
console.log("Done.");
