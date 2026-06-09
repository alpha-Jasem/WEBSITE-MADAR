import { chromium } from "@playwright/test";

const browser = await chromium.launch({ args: ['--disable-web-security'] });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", err => { pageErrors.push(err.message); console.log("PAGE ERR:", err.message); });
page.on("console", msg => { if (msg.type() === "error") console.log("CONSOLE ERR:", msg.text()); });

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:5174/clinic", { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const root = document.getElementById("root");
  const hasChildren = root && root.children.length > 0;

  // Find hero section
  const heroSection = document.querySelector("section");
  const heroBg = heroSection ? window.getComputedStyle(heroSection).backgroundColor : "no section";

  // Find the root container div
  const rootDiv = root?.firstElementChild;
  const rootDivBg = rootDiv ? window.getComputedStyle(rootDiv).backgroundColor : "no root div";

  // Check body
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;

  // Check for any element with white background
  const allDivs = document.querySelectorAll("div, section");
  const whiteBgElements = [];
  allDivs.forEach(el => {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !bg.includes('0, 0, 0')) {
      whiteBgElements.push({ tag: el.tagName, class: el.className.slice(0, 60), bg });
    }
  });

  // Get first child opacity
  const firstChild = document.querySelector("#root > div");
  const firstChildOpacity = firstChild ? window.getComputedStyle(firstChild).opacity : "no first child";

  // Check all motion divs
  const motionDivs = document.querySelectorAll("[style]");
  const withOpacity = [];
  motionDivs.forEach(el => {
    const style = el.getAttribute("style");
    if (style && style.includes("opacity: 0")) {
      withOpacity.push({ tag: el.tagName, class: el.className.slice(0, 60), style: style.slice(0, 100) });
    }
  });

  return {
    hasChildren,
    childCount: root?.children.length || 0,
    heroBg,
    rootDivBg,
    bodyBg,
    whiteBgElements: whiteBgElements.slice(0, 10),
    firstChildOpacity,
    opacityZeroElements: withOpacity.slice(0, 10),
    html: root?.innerHTML.slice(0, 200)
  };
});

console.log("Root has children:", info.hasChildren, "(count:", info.childCount, ")");
console.log("Body BG:", info.bodyBg);
console.log("Root div BG:", info.rootDivBg);
console.log("Hero section BG:", info.heroBg);
console.log("First child opacity:", info.firstChildOpacity);
console.log("Non-black BG elements:", JSON.stringify(info.whiteBgElements, null, 2));
console.log("Opacity-0 elements:", JSON.stringify(info.opacityZeroElements, null, 2));
console.log("HTML preview:", info.html);

await page.screenshot({ path: "C:/Users/acer/Desktop/ss-clinic-debug.png" });
await browser.close();
