const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(15000);

  // ── Public landing ───────────────────────────────────────────────────────────
  console.log('=== Clinic OS Landing ===');
  await page.goto('http://localhost:5174/clinic-os');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-pub-landing.png', fullPage: false });
  const bodyLanding = await page.evaluate(() => document.body.innerText);
  console.log(bodyLanding.includes('تعذر') ? 'FAIL' : 'PASS', '— Landing page');

  // ── Demo signup ──────────────────────────────────────────────────────────────
  await page.goto('http://localhost:5174/clinic-os/demo-signup');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-pub-signup.png' });
  const bodySignup = await page.evaluate(() => document.body.innerText);
  console.log(bodySignup.includes('تعذر') ? 'FAIL' : 'PASS', '— Demo Signup page');

  await browser.close();
  console.log('\nDone — check screenshots');
})();
