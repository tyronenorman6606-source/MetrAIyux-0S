#!/usr/bin/env node
// Optional real-browser E2E harness. Install @playwright/test and run against a local/live URL:
//   npm i -D @playwright/test && npx playwright install chromium
//   BASE_URL=http://localhost:8888 ZERO_OS_GATE_SESSION=... CLIENT_PORTAL_KEY=... npm run e2e:browser

const baseUrl = process.env.BASE_URL || process.env.URL || 'http://localhost:8888';
const gateToken = process.env.ZERO_OS_GATE_SESSION || process.env.SKYEVAULT_GATE_BEARER || process.env.SKYENET_AUTH || '';
const portalKey = process.env.CLIENT_PORTAL_KEY || 'local-client-code';

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
    process.exit(2);
  }

  const browser = await playwright.chromium.launch({ headless: process.env.HEADLESS !== 'false' });
  const page = await browser.newPage();
  const failures = [];
  const assert = async (label, fn) => {
    try {
      await fn();
      console.log(`✅ ${label}`);
    } catch (error) {
      failures.push({ label, error: error.message });
      console.error(`❌ ${label}: ${error.message}`);
    }
  };

  await assert('public upload portal renders without operator links', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const text = await page.textContent('body');
    if (!text || !/upload|file|project/i.test(text)) throw new Error('Upload portal body did not render expected content.');
    if (/setup command center|routing command/i.test(text)) throw new Error('Operator wording leaked onto public portal.');
  });

  await assert('operator login page renders', async () => {
    await page.goto(`${baseUrl}/operator.html`, { waitUntil: 'networkidle' });
    const text = await page.textContent('body');
    if (!/operator/i.test(text || '')) throw new Error('Operator page did not render.');
  });

  await assert('protected admin page is not exposed without session', async () => {
    const response = await page.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body');
    if (response?.status() === 200 && /Vault destinations/i.test(body || '') && !/operator/i.test(body || '')) {
      throw new Error('Admin page appears exposed without operator flow.');
    }
  });

  await assert('local operator session endpoint is retired', async () => {
    const response = await page.request.post(`${baseUrl}/api/operator-session`, {
      data: { token: gateToken || 'shared-gate-required' }
    });
    if (![404, 410].includes(response.status())) throw new Error(`operator-session should be retired, got ${response.status()}: ${await response.text()}`);
  });

  await assert('portal status endpoint rejects missing portal key', async () => {
    const response = await page.request.get(`${baseUrl}/api/upload-status?sessionId=missing`);
    if (![401, 403].includes(response.status())) throw new Error(`Expected 401/403, got ${response.status()}.`);
  });

  await assert('public config endpoint responds', async () => {
    const response = await page.request.get(`${baseUrl}/api/public-config`);
    if (!response.ok()) throw new Error(`public-config returned ${response.status()}.`);
    const data = await response.json();
    if (!data.brandName) throw new Error('public-config missing brandName.');
  });

  console.log(`\nBase URL: ${baseUrl}`);
  console.log(`Portal key supplied: ${Boolean(portalKey)}`);
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
