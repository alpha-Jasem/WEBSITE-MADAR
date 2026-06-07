const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  // ── STEP 1: Go to login ──────────────────────────────────────────────────────
  console.log('=== STEP 1: Login page ===');
  await page.goto('http://localhost:5174/login?redirect=/clinic-os/dashboard&portal=client');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-clinic-1-login.png' });
  console.log('Screenshot saved: ss-clinic-1-login.png');

  // Click "بوابة العملاء" tab if not already active
  const clientTab = await page.$('button:has-text("بوابة العملاء")');
  if (clientTab) { await clientTab.click(); await page.waitForTimeout(500); }

  // Fill credentials
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="mail"]');
  const passInput  = await page.$('input[type="password"]');

  if (!emailInput || !passInput) {
    console.log('FAIL: Login form inputs not found');
    const html = await page.content();
    console.log('Page HTML snippet:', html.slice(0, 500));
    await browser.close(); return;
  }

  await emailInput.fill('z1jazz.98@gmail.com');
  await passInput.fill('Madar@2025');
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-clinic-2-filled.png' });
  console.log('Screenshot saved: ss-clinic-2-filled.png');

  const loginBtn = await page.$('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل الدخول")');
  if (loginBtn) await loginBtn.click();
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log('URL after login:', url);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-clinic-3-after-login.png' });
  console.log('Screenshot saved: ss-clinic-3-after-login.png');

  if (!url.includes('dashboard')) {
    console.log('Not redirected to dashboard - navigating directly');
    await page.goto('http://localhost:5174/clinic-os/dashboard');
    await page.waitForTimeout(4000);
    const url2 = page.url();
    console.log('After direct nav:', url2);
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-clinic-4-dashboard.png' });
  }

  // ── Check page content ───────────────────────────────────────────────────────
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('تعذر فتح')) {
    console.log('\nFAIL: ErrorBoundary triggered!');
  } else if (bodyText.includes('مواعيد') || bodyText.includes('صباح') || bodyText.includes('مساء')) {
    console.log('\nPASS: Dashboard content visible!');
  } else if (page.url().includes('login')) {
    console.log('\nINFO: Still on login - wrong password or no account');
  } else {
    console.log('\nINFO: Page text:', bodyText.slice(0, 300));
  }

  // ── STEP 2: Check each dashboard page ───────────────────────────────────────
  const PAGES = [
    { name: 'Appointments', path: '/clinic-os/dashboard/appointments' },
    { name: 'Patients',     path: '/clinic-os/dashboard/patients'     },
    { name: 'Doctors',      path: '/clinic-os/dashboard/doctors'      },
    { name: 'Services',     path: '/clinic-os/dashboard/services'     },
    { name: 'Calendar',     path: '/clinic-os/dashboard/calendar'     },
    { name: 'Messages',     path: '/clinic-os/dashboard/messages'     },
    { name: 'Settings',     path: '/clinic-os/dashboard/settings'     },
  ];

  if (!page.url().includes('login')) {
    for (const p of PAGES) {
      await page.goto('http://localhost:5174' + p.path);
      await page.waitForTimeout(2000);
      const t = await page.evaluate(() => document.body.innerText);
      const ok = !t.includes('تعذر فتح') && !page.url().includes('login');
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${p.name} (${page.url()})`);
      await page.screenshot({ path: `C:\\Users\\acer\\WEBSITE-MADAR\\ss-clinic-page-${p.name.toLowerCase()}.png` });
    }
  }

  await browser.close();
  console.log('\n=== Done ===');
})();
