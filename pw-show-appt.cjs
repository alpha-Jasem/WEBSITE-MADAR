const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);

  // Login
  await page.goto('http://localhost:5174/login?portal=client');
  await page.waitForLoadState('networkidle');
  const tab = await page.$('button:has-text("بوابة العملاء")');
  if (tab) { await tab.click(); await page.waitForTimeout(300); }
  await page.fill('input[type="email"]', 'z1jazz.98@gmail.com');
  await page.fill('input[type="password"]', 'Clinic@2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  if (page.url().includes('login')) { console.log('Login failed'); await browser.close(); return; }

  // ── Overview ──────────────────────────────────────────────────────────────
  await page.goto('http://localhost:5174/clinic-os/dashboard');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-real-overview.png' });
  console.log('✅ Overview saved');

  // ── Appointments page — filter to "هذا الأسبوع" (week) ─────────────────
  await page.goto('http://localhost:5174/clinic-os/dashboard/appointments');
  await page.waitForTimeout(3000);

  // First select = date filter; select 'week'
  const selects = await page.$$('select');
  if (selects.length > 0) {
    await selects[0].selectOption('week');
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-real-appts-week.png' });
  console.log('✅ Appointments (week) saved');

  // Also screenshot with "الكل" to see everything
  if (selects.length > 0) {
    await selects[0].selectOption('all');
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-real-appts-all.png' });
  console.log('✅ Appointments (all) saved');

  // ── Patients page ─────────────────────────────────────────────────────────
  await page.goto('http://localhost:5174/clinic-os/dashboard/patients');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-real-patients.png' });
  console.log('✅ Patients saved');

  // ── Services page ─────────────────────────────────────────────────────────
  await page.goto('http://localhost:5174/clinic-os/dashboard/services');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-real-services.png' });
  console.log('✅ Services saved');

  await browser.close();
  console.log('\nAll done.');
})();
