import { webkit } from "@playwright/test";

console.log("→ Testing with WebKit (Safari engine)...");

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

const page = await context.newPage();
const jsErrors = [];
const consoleErrors = [];

page.on("pageerror", err => { jsErrors.push(err.message); console.log("JS ERR:", err.message); });
page.on("console", msg => {
  if (msg.type() === "error") { consoleErrors.push(msg.text()); console.log("CONSOLE ERR:", msg.text()); }
});

// Test production
await page.goto("https://madar.software", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const root = document.getElementById("root");
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const firstChild = root?.firstElementChild;
  const firstChildOpacity = firstChild ? window.getComputedStyle(firstChild).opacity : "N/A";
  const firstChildBg = firstChild ? window.getComputedStyle(firstChild).backgroundColor : "N/A";

  // Check all elements with opacity 0
  const allEls = document.querySelectorAll("[style]");
  const opacityZero = [];
  allEls.forEach(el => {
    const style = el.getAttribute("style") || "";
    const computed = window.getComputedStyle(el).opacity;
    if (style.includes("opacity: 0") || computed === "0") {
      opacityZero.push({ tag: el.tagName, class: el.className.slice(0, 50), style: style.slice(0, 80) });
    }
  });

  // Check H1
  const h1 = document.querySelector("h1");
  const h1Opacity = h1 ? window.getComputedStyle(h1).opacity : "NO H1";
  const h1Visibility = h1 ? window.getComputedStyle(h1).visibility : "NO H1";

  return {
    bodyBg,
    rootChildren: root?.children.length ?? 0,
    firstChildOpacity,
    firstChildBg,
    opacityZeroCount: opacityZero.length,
    opacityZeroSample: opacityZero.slice(0, 5),
    h1Opacity,
    h1Visibility,
    h1Text: h1?.textContent?.slice(0, 50) || "NO H1",
  };
});

console.log("\n=== WebKit State ===");
console.log("Body BG:", info.bodyBg);
console.log("Root children:", info.rootChildren);
console.log("First child opacity:", info.firstChildOpacity);
console.log("First child BG:", info.firstChildBg);
console.log("H1 opacity:", info.h1Opacity, "| visibility:", info.h1Visibility);
console.log("H1 text:", info.h1Text);
console.log("Elements stuck at opacity:0:", info.opacityZeroCount);
if (info.opacityZeroSample.length) {
  console.log("Samples:", JSON.stringify(info.opacityZeroSample, null, 2));
}

console.log("\nJS Errors:", jsErrors.length ? jsErrors : "NONE");
console.log("Console Errors:", consoleErrors.length ? consoleErrors : "NONE");

await page.screenshot({ path: "C:/Users/acer/Desktop/ss-webkit-mobile.png" });
console.log("\n→ Screenshot: ss-webkit-mobile.png");

await browser.close();
console.log("Done.");
