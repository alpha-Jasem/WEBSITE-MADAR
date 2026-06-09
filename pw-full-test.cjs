const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);

  // Use clinic client account (z1jazz.98 → company has the real synced appointments)
  const EMAIL = 'z1jazz.98@gmail.com';
  const PASS  = 'Clinic@2026!';

  console.log(`Logging in as ${EMAIL} via client portal`);
  await page.goto('http://localhost:5174/login?portal=client');
  await page.waitForLoadState('networkidle');

  // Click client tab
  const clientTab = await page.$('button:has-text("بوابة العملاء")');
  if (clientTab) { await clientTab.click(); await page.waitForTimeout(300); }

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-login-filled.png' });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  const urlAfterLogin = page.url();
  console.log('URL after login:', urlAfterLogin);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-after-login.png' });

  if (urlAfterLogin.includes('login')) {
    const errEl = await page.$('[class*="red"]');
    if (errEl) console.log('Error:', await errEl.innerText());
    console.log('FAIL — still on login');
    await browser.close(); return;
  }
  console.log('SUCCESS — logged in as clinic user!');

  // Navigate to clinic dashboard
  await page.goto('http://localhost:5174/clinic-os/dashboard');
  await page.waitForTimeout(4000);
  const dashUrl = page.url();
  console.log('Dashboard URL:', dashUrl);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\ss-dash-overview.png' });

  // Test all pages
  const PAGES = [
    { name: 'overview',     path: '/clinic-os/dashboard'              },
    { name: 'appointments', path: '/clinic-os/dashboard/appointments' },
    { name: 'patients',     path: '/clinic-os/dashboard/patients'     },
    { name: 'doctors',      path: '/clinic-os/dashboard/doctors'      },
    { name: 'services',     path: '/clinic-os/dashboard/services'     },
    { name: 'calendar',     path: '/clinic-os/dashboard/calendar'     },
    { name: 'messages',     path: '/clinic-os/dashboard/messages'     },
    { name: 'settings',     path: '/clinic-os/dashboard/settings'     },
  ];

  console.log('\n--- Dashboard pages ---');
  for (const p of PAGES) {
    await page.goto('http://localhost:5174' + p.path);
    await page.waitForTimeout(3000);
    const t = await page.evaluate(() => document.body.innerText);
    const status = t.includes('تعذر فتح') ? 'FAIL(error-boundary)'
      : page.url().includes('login') ? 'FAIL(redirect-login)'
      : 'PASS';
    console.log(`  ${status}: ${p.name}`);
    await page.screenshot({ path: `C:\\Users\\acer\\WEBSITE-MADAR\\ss-dash-${p.name}.png` });
  }

  await browser.close();
  console.log('\nDone.');
})();
