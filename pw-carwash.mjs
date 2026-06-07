import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", err => console.log("ERR:", err.message));

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:4173/car-wash", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-cw-hero.png" });

await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(800);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-cw-scroll1.png" });

await page.evaluate(() => window.scrollTo(0, 1800));
await page.waitForTimeout(800);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-cw-scroll2.png" });

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:4173/car-wash", { waitUntil: "domcontentloaded", timeout: 10000 });
await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-cw-mobile.png" });

await browser.close();
console.log("Done.");
