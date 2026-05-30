import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const artifactDir = path.join(root, 'test-artifacts', 'skyecommerce-e2e');
const baseUrl = process.env.SKYE_COMMERCE_BASE_URL || 'http://127.0.0.1:8790';
const apiReceiptPath = path.join(artifactDir, 'api-e2e-receipt.json');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function visibleText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60000 });
}

async function captureViewport(page, filePath) {
  const session = await page.context().newCDPSession(page);
  const screenshot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await fs.writeFile(filePath, Buffer.from(screenshot.data, 'base64'));
  await session.detach();
}

function slugFromPreview(previewUrl = '') {
  try {
    const url = new URL(previewUrl);
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
  } catch {
    return '';
  }
}

await fs.mkdir(artifactDir, { recursive: true });

const apiReceipt = JSON.parse(await fs.readFile(apiReceiptPath, 'utf8'));
const storeSlug = process.env.SKYE_COMMERCE_STORE_SLUG || slugFromPreview(apiReceipt.publish?.previewUrl);
const productTitle = apiReceipt.product?.title || '';
expect(storeSlug && productTitle, 'API receipt does not contain a store slug and product title');

const receipt = {
  ok: false,
  baseUrl,
  storeSlug,
  productTitle,
  startedAt: new Date().toISOString(),
  actions: [],
  screenshots: [],
  consoleErrors: [],
  failedRequests: []
};

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  page.on('console', (message) => {
    if (message.type() === 'error') receipt.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => receipt.consoleErrors.push(error.message));
  page.on('requestfailed', (request) => receipt.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || '' }));

  await page.goto(`${baseUrl}/`, { waitUntil: 'commit' });
  await visibleText(page, 'SkyeCommerce Foundation');
  await visibleText(page, 'Merchant Command');
  await captureViewport(page, path.join(artifactDir, 'browser-overview-desktop.png'));
  receipt.screenshots.push('browser-overview-desktop.png');
  receipt.actions.push('desktop overview rendered');

  await page.goto(`${baseUrl}/merchant/`, { waitUntil: 'commit' });
  await visibleText(page, 'Register merchant');
  await visibleText(page, 'Merchant profile');
  await captureViewport(page, path.join(artifactDir, 'browser-merchant-desktop.png'));
  receipt.screenshots.push('browser-merchant-desktop.png');
  receipt.actions.push('desktop merchant command rendered');

  await page.goto(`${baseUrl}/store/?slug=${encodeURIComponent(storeSlug)}`, { waitUntil: 'commit' });
  await visibleText(page, productTitle);
  await visibleText(page, 'Add to order');
  await captureViewport(page, path.join(artifactDir, 'browser-storefront-desktop.png'));
  receipt.screenshots.push('browser-storefront-desktop.png');
  receipt.actions.push('desktop storefront rendered published product');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/store/?slug=${encodeURIComponent(storeSlug)}`, { waitUntil: 'commit' });
  await visibleText(page, productTitle);
  await captureViewport(page, path.join(artifactDir, 'browser-storefront-mobile.png'));
  receipt.screenshots.push('browser-storefront-mobile.png');
  receipt.actions.push('mobile storefront rendered published product');

  expect(receipt.failedRequests.length === 0, `Failed requests: ${JSON.stringify(receipt.failedRequests)}`);
  expect(receipt.consoleErrors.length === 0, `Console errors: ${receipt.consoleErrors.join('\n')}`);
  receipt.ok = true;
} finally {
  receipt.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(artifactDir, 'browser-smoke-receipt.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
}

console.log(JSON.stringify(receipt, null, 2));
