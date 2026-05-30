import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const artifactDir = path.join(root, 'test-artifacts', 'skyecommerce-e2e');
const baseUrl = process.env.SKYE_COMMERCE_BASE_URL || 'http://127.0.0.1:8790';
const cookies = new Map();

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function storeCookies(response) {
  const header = response.headers.get('set-cookie');
  if (!header) return;
  const [pair] = header.split(';');
  const index = pair.indexOf('=');
  if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
}

function cookieHeader() {
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function request(pathname, { method = 'GET', body, csrfToken = '', timeoutMs = 180000 } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (cookies.size) headers.set('Cookie', cookieHeader());
  if (csrfToken) headers.set('X-Skye-CSRF', csrfToken);
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  storeCookies(response);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return { status: response.status, data };
}

await fs.mkdir(artifactDir, { recursive: true });

const receipt = {
  ok: false,
  baseUrl,
  startedAt: new Date().toISOString(),
  actions: []
};

try {
  const slug = `skye-api-${Date.now().toString(36)}`;
  const productTitle = `API Proof Pack ${Date.now().toString(36)}`;

  const health = await request('/api/health');
  expect(health.data.ok && health.data.hasDb, 'health did not report a ready DB-backed app');
  receipt.health = health.data;
  receipt.actions.push('health check passed');

  const csrf = await request('/api/auth/csrf');
  const csrfToken = csrf.data.csrfToken;
  expect(csrfToken && cookies.has('skye_csrf'), 'csrf token/cookie was not issued');
  receipt.actions.push('csrf token issued');

  const register = await request('/api/merchant/register', {
    method: 'POST',
    body: {
      brandName: 'SkyeCommerce API Proof Store',
      slug,
      email: `${slug}@example.com`,
      password: 'local-proof-password-12345',
      heroTitle: 'API commerce proof shelf',
      heroTagline: 'A local checkout path with catalog proof.'
    },
    csrfToken
  });
  expect(register.status === 201 && register.data.merchant?.slug === slug, 'merchant registration did not return the new merchant');
  expect(cookies.has('skye_session'), 'merchant session cookie was not issued');
  receipt.actions.push('merchant registered and session cookie issued');

  const me = await request('/api/auth/me');
  expect(me.data.session?.merchant?.slug === slug, 'merchant session was not readable after registration');
  receipt.actions.push('merchant session verified');

  const product = await request('/api/products', {
    method: 'POST',
    csrfToken,
    body: {
      title: productTitle,
      slug: 'proof-pack',
      priceCents: 2500,
      sku: 'SKYE-API-PROOF-001',
      inventoryOnHand: 9,
      trackInventory: true,
      shortDescription: 'API-created catalog product.'
    }
  });
  expect(product.status === 201 && product.data.product?.title === productTitle, 'product create failed');
  receipt.product = product.data.product;
  receipt.actions.push('product created');

  const publish = await request('/api/publish', { method: 'POST', csrfToken });
  expect(publish.data.productCount >= 1, 'publish snapshot did not include products');
  receipt.publish = { snapshotId: publish.data.snapshotId, productCount: publish.data.productCount, previewUrl: publish.data.previewUrl };
  receipt.actions.push('storefront snapshot published');

  const bootstrap = await request(`/api/store/${encodeURIComponent(slug)}/bootstrap`);
  const publishedProduct = bootstrap.data.snapshot?.products?.find((item) => item.id === product.data.product.id);
  expect(publishedProduct?.title === productTitle, 'published storefront bootstrap did not include product');
  receipt.actions.push('published product loaded from storefront bootstrap');

  const quote = await request('/api/orders/quote', {
    method: 'POST',
    body: {
      slug,
      items: [{ productId: product.data.product.id, quantity: 1 }],
      location: { countryCode: 'US', stateCode: 'AZ' }
    }
  });
  expect(quote.data.quote?.subtotalCents === 2500, 'quote subtotal did not match product price');
  receipt.quote = quote.data.quote;
  receipt.actions.push('storefront cart quote returned expected total');

  receipt.ok = true;
} finally {
  receipt.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(artifactDir, 'api-e2e-receipt.json'), JSON.stringify(receipt, null, 2));
}

console.log(JSON.stringify(receipt, null, 2));
