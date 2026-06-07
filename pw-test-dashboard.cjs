const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  console.log('=== TEST 1: Login page ===');
  await page.goto('http://localhost:5174/clinic-os/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-1-login.png' });
  console.log('Screenshot: test-1-login.png');

  console.log('\n=== TEST 2: Login ===');
  try {
    const emailInput = await page.$('input[type="email"]') || await page.$('input[placeholder*="mail"]') || await page.$('input[placeholder*="بريد"]');
    const passInput  = await page.$('input[type="password"]');
    if (emailInput && passInput) {
      await emailInput.fill('z1jazz.98@gmail.com');
      await passInput.fill('123456');
      const submitBtn = await page.$('button[type="submit"]') || await page.$('button');
      if (submitBtn) await submitBtn.click();
      await page.waitForTimeout(4000);
    } else {
      console.log('No login form found');
    }
    console.log('URL after login attempt:', page.url());
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-2-after-login.png' });
    console.log('Screenshot: test-2-after-login.png');
  } catch(e) {
    console.log('Login error:', e.message);
  }

  console.log('\n=== TEST 3: Navigate to dashboard ===');
  try {
    await page.goto('http://localhost:5174/clinic-os/dashboard');
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log('Dashboard URL:', url);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('تعذر فتح')) {
      console.log('FAIL: ErrorBoundary triggered');
    } else if (bodyText.includes('صباح') || bodyText.includes('مواعيد') || bodyText.includes('مساء')) {
      console.log('PASS: Dashboard rendered - greeting/stats visible');
    } else if (url.includes('login')) {
      console.log('Redirected to login - need auth');
    } else {
      console.log('Page body preview:', bodyText.slice(0, 200));
    }
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-3-dashboard.png' });
    console.log('Screenshot: test-3-dashboard.png');
  } catch(e) {
    console.log('Dashboard error:', e.message);
  }

  console.log('\n=== TEST 4: Appointments page ===');
  try {
    await page.goto('http://localhost:5174/clinic-os/dashboard/appointments');
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('تعذر فتح')) {
      console.log('FAIL: ErrorBoundary on Appointments');
    } else {
      console.log('PASS: Appointments page rendered');
    }
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-4-appointments.png' });
    console.log('Screenshot: test-4-appointments.png');
  } catch(e) {
    console.log('Appointments error:', e.message);
  }

  await browser.close();
  console.log('\n=== Done ===');
})();
