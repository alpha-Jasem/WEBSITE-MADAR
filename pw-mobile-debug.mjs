import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

const page = await context.newPage();
const jsErrors = [];
const consoleErrors = [];
const networkErrors = [];

page.on("pageerror", err => { jsErrors.push(err.message); });
page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("requestfailed", req => { networkErrors.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`); });

console.log("→ Loading madar.software on mobile...");
await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const root = document.getElementById("root");
  const body = document.body;
  const bodyBg = window.getComputedStyle(body).backgroundColor;
  const bodyColor = window.getComputedStyle(body).color;
  const rootBg = root ? window.getComputedStyle(root).backgroundColor : "NO ROOT";
  const rootHTML = root?.innerHTML?.slice(0, 300) || "EMPTY";
  const childCount = root?.children?.length ?? 0;

  // Check for any visible element
  const allEls = document.querySelectorAll("*");
  let visibleCount = 0;
  allEls.forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0") visibleCount++;
  });

  // Check for opacity:0 hiding everything
  const firstChild = root?.firstElementChild;
  const firstChildStyle = firstChild ? {
    opacity: window.getComputedStyle(firstChild).opacity,
    display: window.getComputedStyle(firstChild).display,
    visibility: window.getComputedStyle(firstChild).visibility,
    bg: window.getComputedStyle(firstChild).backgroundColor,
  } : null;

  // Check CSS custom properties
  const rootStyles = window.getComputedStyle(document.documentElement);

  return {
    bodyBg, bodyColor, rootBg, rootHTML, childCount, visibleCount,
    firstChildStyle,
    title: document.title,
    readyState: document.readyState,
  };
});

console.log("\n=== DOM State ===");
console.log("Title:", info.title);
console.log("Ready state:", info.readyState);
console.log("Body BG:", info.bodyBg);
console.log("Root BG:", info.rootBg);
console.log("Root children:", info.childCount);
console.log("Visible elements:", info.visibleCount);
console.log("First child style:", JSON.stringify(info.firstChildStyle, null, 2));
console.log("Root HTML preview:", info.rootHTML);

console.log("\n=== Errors ===");
console.log("JS Errors:", jsErrors.length ? jsErrors : "NONE");
console.log("Console Errors:", consoleErrors.length ? consoleErrors : "NONE");
console.log("Network Errors:", networkErrors.length ? networkErrors.slice(0, 5) : "NONE");

await page.screenshot({ path: "C:/Users/acer/Desktop/ss-prod-mobile.png", fullPage: false });
console.log("\n→ Screenshot saved: ss-prod-mobile.png");

// Also try scrolling and screenshot
await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(1000);
await page.screenshot({ path: "C:/Users/acer/Desktop/ss-prod-mobile-scroll.png" });

await browser.close();
console.log("Done.");
