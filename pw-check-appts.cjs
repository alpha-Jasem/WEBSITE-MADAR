const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);

  // Log in as clinic user
  await page.goto('http://localhost:5174/login?portal=client');
  await page.waitForLoadState('networkidle');
  const clientTab = await page.$('button:has-text("بوابة العملاء")');
  if (clientTab) { await clientTab.click(); await page.waitForTimeout(300); }
  await page.fill('input[type="email"]', 'z1jazz.98@gmail.com');
  await page.fill('input[type="password"]', 'Clinic@2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  if (page.url().includes('login')) {
    console.log('Login failed!'); await browser.close(); return;
  }
  console.log('Logged in — URL:', page.url());

  // Go to overview
  await page.goto('http://localhost:5174/clinic-os/dashboard');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-live-overview.png', fullPage: false });
  const body = await page.evaluate(() => document.body.innerText);
  console.log('Overview text snippet:', body.slice(0, 300));

  // Go to appointments — change filter to ALL dates
  await page.goto('http://localhost:5174/clinic-os/dashboard/appointments');
  await page.waitForTimeout(3000);

  // Change date filter from "اليوم" to "هذا الأسبوع" to see more data
  const dateSelect = await page.$('select');
  if (dateSelect) {
    await dateSelect.selectOption({ index: 1 }); // pick second option
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-live-appts.png', fullPage: false });

  // Also try clicking "هذا الأسبوع" or changing filter
  const apptBody = await page.evaluate(() => document.body.innerText);
  console.log('Appointments text snippet:', apptBody.slice(0, 500));

  await browser.close();
  console.log('\nDone — check ss-live-*.png');
})();
