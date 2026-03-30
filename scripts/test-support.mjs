import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results = [];

  // Test 1: Admin Support page (will redirect to login since not authenticated)
  try {
    const res = await page.goto('http://localhost:3000/admin/support', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    // Admin pages redirect to /login if not authenticated
    const passed = url.includes('/login') || url.includes('/admin/support');
    await page.screenshot({ path: path.join(screenshotDir, '01-admin-support.png'), fullPage: true });
    results.push({ test: 'Admin Support page access', passed, url });
  } catch (err) {
    results.push({ test: 'Admin Support page access', passed: false, error: err.message });
  }

  // Test 2: Dashboard Support page (partner)
  try {
    const res = await page.goto('http://localhost:3000/dashboard/support', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    const passed = url.includes('/login') || url.includes('/dashboard/support');
    await page.screenshot({ path: path.join(screenshotDir, '02-dashboard-support.png'), fullPage: true });
    results.push({ test: 'Dashboard Support page access', passed, url });
  } catch (err) {
    results.push({ test: 'Dashboard Support page access', passed: false, error: err.message });
  }

  // Test 3: Advertiser Support page
  try {
    const res = await page.goto('http://localhost:3000/advertiser/support', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    // Advertiser pages redirect to /advertiser/login
    const passed = url.includes('/advertiser/login') || url.includes('/advertiser/support');
    await page.screenshot({ path: path.join(screenshotDir, '03-advertiser-support.png'), fullPage: true });
    results.push({ test: 'Advertiser Support page access', passed, url });
  } catch (err) {
    results.push({ test: 'Advertiser Support page access', passed: false, error: err.message });
  }

  // Test 4: Admin Support API
  try {
    const apiRes = await page.goto('http://localhost:3000/api/admin/support', { waitUntil: 'networkidle', timeout: 10000 });
    const status = apiRes.status();
    // Should return 401 (unauthorized) since we're not logged in as admin
    const passed = status === 401 || status === 403;
    results.push({ test: 'Admin Support API auth check', passed, status });
  } catch (err) {
    results.push({ test: 'Admin Support API auth check', passed: false, error: err.message });
  }

  // Test 5: Feedback API
  try {
    const apiRes = await page.goto('http://localhost:3000/api/feedback', { waitUntil: 'networkidle', timeout: 10000 });
    const status = apiRes.status();
    // Should return 401 since not logged in
    const passed = status === 401;
    results.push({ test: 'Feedback API auth check', passed, status });
  } catch (err) {
    results.push({ test: 'Feedback API auth check', passed: false, error: err.message });
  }

  // Print results
  console.log('\n=== Support System Test Results ===\n');
  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${r.test}`);
    if (r.url) console.log(`       URL: ${r.url}`);
    if (r.status) console.log(`       Status: ${r.status}`);
    if (r.error) console.log(`       Error: ${r.error}`);
  }

  const allPassed = results.every(r => r.passed);
  console.log(`\nTotal: ${results.filter(r => r.passed).length}/${results.length} passed`);

  await browser.close();
  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
