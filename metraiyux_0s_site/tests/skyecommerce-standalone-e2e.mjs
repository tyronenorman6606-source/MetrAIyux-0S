import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const artifactDir = path.join(root, 'test-artifacts', 'skyecommerce-e2e');
const baseUrl = process.env.SKYE_COMMERCE_BASE_URL || 'http://127.0.0.1:8790';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function visibleText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60000 });
}

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow <= 2, `${label} horizontal overflow: ${overflow}px`);
}

async function captureViewport(page, filePath) {
  const session = await page.context().newCDPSession(page);
  const screenshot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await fs.writeFile(filePath, Buffer.from(screenshot.data, 'base64'));
  await session.detach();
}

await fs.mkdir(artifactDir, { recursive: true });

const receipt = {
  ok: false,
  baseUrl,
  actions: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: [],
  startedAt: new Date().toISOString()
};

const health = await fetch(`${baseUrl}/api/health`).then(async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) }));
expect(health.status === 200 && health.body.ok, `SkyeCommerce health failed: ${health.status}`);
receipt.health = health;

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(60000);
page.setDefaultNavigationTimeout(60000);
page.on('console', (message) => {
  if (message.type() === 'error') receipt.consoleErrors.push(message.text());
});
page.on('pageerror', (error) => receipt.consoleErrors.push(error.message));
page.on('requestfailed', (request) => receipt.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || '' }));

try {
  const slug = `skye-e2e-${Date.now().toString(36)}`;
  const productTitle = `Proof Pack ${Date.now().toString(36)}`;

  await page.goto(`${baseUrl}/`, { waitUntil: 'commit', timeout: 60000 });
  await visibleText(page, 'SkyeCommerce Foundation');
  await visibleText(page, 'Merchant Command');
  await noHorizontalOverflow(page, 'overview desktop');
  await captureViewport(page, path.join(artifactDir, 'overview-desktop.png'));
  receipt.screenshots.push('overview-desktop.png');
  receipt.actions.push('opened overview and verified navigation');

  await page.goto(`${baseUrl}/merchant/`, { waitUntil: 'commit', timeout: 60000 });
  await visibleText(page, 'Register merchant');
  await page.fill('#register-form input[name="brandName"]', 'SkyeCommerce E2E Store');
  await page.fill('#register-form input[name="slug"]', slug);
  await page.fill('#register-form input[name="email"]', `${slug}@example.com`);
  await page.fill('#register-form input[name="password"]', 'local-proof-password-12345');
  await page.fill('#register-form input[name="heroTitle"]', 'Commerce proof shelf');
  await page.fill('#register-form input[name="heroTagline"]', 'A local checkout path with catalog proof.');
  await page.click('#register-form button[type="submit"]');
  await visibleText(page, `Open ${slug}`);
  receipt.actions.push('registered local merchant session');

  await page.fill('#product-form input[name="title"]', productTitle);
  await page.fill('#product-form input[name="slug"]', 'proof-pack');
  await page.fill('#product-form input[name="priceCents"]', '2500');
  await page.fill('#product-form input[name="sku"]', 'SKYE-PROOF-001');
  await page.fill('#product-form input[name="inventoryOnHand"]', '9');
  await page.fill('#product-form textarea[name="shortDescription"]', 'Browser-created catalog product.');
  await page.click('#product-form button[type="submit"]');
  await visibleText(page, productTitle);
  receipt.actions.push('created merchant catalog product');

  await page.click('#publish-store');
  await visibleText(page, 'Storefront snapshot published');
  receipt.actions.push('published storefront snapshot');

  await page.goto(`${baseUrl}/store/?slug=${encodeURIComponent(slug)}`, { waitUntil: 'commit', timeout: 60000 });
  await visibleText(page, productTitle);
  await page.click(`[data-add]:has-text("Add to order")`);
  await visibleText(page, 'qty 1');
  await page.click('#quote-refresh');
  await visibleText(page, '$25.00');
  await captureViewport(page, path.join(artifactDir, 'storefront-cart-desktop.png'));
  receipt.screenshots.push('storefront-cart-desktop.png');
  receipt.actions.push('opened published storefront, added product to cart, and refreshed quote');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/merchant/`, { waitUntil: 'commit', timeout: 60000 });
  await visibleText(page, productTitle);
  await noHorizontalOverflow(page, 'merchant mobile');
  await captureViewport(page, path.join(artifactDir, 'merchant-mobile.png'));
  receipt.screenshots.push('merchant-mobile.png');
  receipt.actions.push('checked merchant command on mobile');

  expect(receipt.consoleErrors.length === 0, `Console errors:\n${receipt.consoleErrors.join('\n')}`);
  expect(receipt.failedRequests.length === 0, `Failed requests:\n${receipt.failedRequests.map((item) => `${item.url}: ${item.failure}`).join('\n')}`);
  receipt.ok = true;
} finally {
  receipt.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(artifactDir, 'standalone-e2e-receipt.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
}

console.log(JSON.stringify(receipt, null, 2));
