const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  console.log('=== TEST 1: Login page ===');
  await page.goto('http://localhost:5174/clinic-os/login');
  await page.waitForLoadState('networkidle');
  const loginTitle = await page.title();
  console.log('Title:', loginTitle);
  await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-login.png' });
  console.log('Login screenshot saved');

  console.log('\n=== TEST 2: Login with credentials ===');
  try {
    await page.fill('input[type="email"], input[placeholder*="mail"], input[placeholder*="بريد"]', 'z1jazz.98@gmail.com');
    await page.fill('input[type="password"], input[placeholder*="password"], input[placeholder*="كلمة"]', '123456');
    await page.click('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل")');
    await page.waitForTimeout(3000);
    const afterLogin = page.url();
    console.log('URL after login:', afterLogin);
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-after-login.png' });
    console.log('After-login screenshot saved');
  } catch(e) {
    console.log('Login error:', e.message);
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-login-error.png' });
  }

  console.log('\n=== TEST 3: Dashboard overview ===');
  try {
    await page.goto('http://localhost:5174/clinic-os/dashboard');
    await page.waitForTimeout(3000);
    const dashUrl = page.url();
    console.log('Dashboard URL:', dashUrl);
    await page.screenshot({ path: 'C:\\Users\\acer\\WEBSITE-MADAR\\test-dashboard.png' });
    console.log('Dashboard screenshot saved');
    
    // Check if ErrorBoundary triggered
    const errorText = await page.$eval('body', el => el.innerText).catch(() => '');
    if (errorText.includes('تعذر فتح')) {
      console.log('ERROR: ErrorBoundary triggered!');
    } else {
      console.log('No ErrorBoundary - page rendered OK');
    }
  } catch(e) {
    console.log('Dashboard error:', e.message);
  }

  await browser.close();
  console.log('\nDone.');
})();
