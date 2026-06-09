import { webkit } from "@playwright/test";

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

// Use context.newPage() — not browser.newPage() — so viewport/UA applies
const page = await context.newPage();
const jsErrors = [];
page.on("pageerror", e => { jsErrors.push(e.message); console.log("JS ERR:", e.message); });

async function checkStuck(label) {
  const r = await page.evaluate(() => {
    const allEls = document.querySelectorAll("[style]");
    const stuck = [];
    allEls.forEach(el => {
      if (window.getComputedStyle(el).opacity === "0") {
        stuck.push({ tag: el.tagName, cls: el.className.slice(0, 60) });
      }
    });
    const h1 = document.querySelector("h1");
    return { stuckCount: stuck.length, sample: stuck.slice(0, 5), h1Op: h1 ? window.getComputedStyle(h1).opacity : "NO H1" };
  });
  console.log(`[${label}] H1 opacity:${r.h1Op} | stuck opacity:0 = ${r.stuckCount}`);
  if (r.sample.length) r.sample.forEach(s => console.log("  →", s.cls.slice(0,70)));
}

const base = "http://localhost:4173";

// ── HOME ──
await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(4000);
await checkStuck("home-load");
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mob-wk-home.png" });

await page.evaluate(() => window.scrollTo(0, 1000));
await page.waitForTimeout(1500);
await checkStuck("home-scroll1");
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mob-wk-trust.png" });

await page.evaluate(() => window.scrollTo(0, 2000));
await page.waitForTimeout(1500);
await checkStuck("home-scroll2");
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mob-wk-hiw.png" });

await page.evaluate(() => window.scrollTo(0, 3500));
await page.waitForTimeout(1500);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mob-wk-products.png" });

// ── CLINIC ──
await page.goto(`${base}/clinic`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(4000);
await checkStuck("clinic-load");
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mob-wk-clinic.png" });

await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(1500);
await checkStuck("clinic-scroll1");
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-mob-wk-clinic-feat.png" });

console.log("\nJS Errors:", jsErrors.length ? jsErrors : "NONE");
await browser.close();
console.log("Done.");
