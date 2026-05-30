import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import {
  buildSovereignDocsCommerceKit,
  sovereignDocsSkyeDocxMaxUrl
} from '../src/lib/sovereigndocs.js';

const env = {
  DB: {},
  SESSION_SECRET: 'skyecommerce-sovereigndocs-test-secret',
  API_RATE_LIMIT_DISABLED: 'true'
};

async function readJson(response) {
  return response.json().catch(() => ({}));
}

test('SovereignDocs commerce kit points SkyeCommerce at the shared 0S document lane', () => {
  const kit = buildSovereignDocsCommerceKit({ jurisdiction: 'US-AZ', storeSlug: 'demo-store' });
  assert.equal(kit.lane, 'shared_0s_sovereigndocs');
  assert.equal(kit.category, 'website-digital-commerce');
  assert.ok(kit.templates.length >= 10);
  assert.ok(kit.templates.some((item) => item.slug === 'privacy-policy-basic'));
  assert.ok(kit.templates.some((item) => item.slug === 'marketplace-seller-agreement'));
  assert.match(kit.templates[0].sovereignDocsUrl, /^\/Free99\/apps\/sovereigndocs\/build\/US-AZ\/website-digital-commerce\//);
  assert.match(kit.templates[0].skyeDocxMaxUrl, /^\/Marketing-Made-Easy\/SkyeDocxMax\/editor.html\?/);
  assert.match(kit.boundary, /not a law firm/i);
});

test('SkyeDocxMax handoff carries template and SkyeCommerce context', () => {
  const url = sovereignDocsSkyeDocxMaxUrl({
    templateSlug: 'refund-policy',
    jurisdiction: 'US-AZ',
    storeSlug: 'demo-store',
    merchantId: 'mrc_123'
  });
  assert.match(url, /source=skyecommerce/);
  assert.match(url, /ws_id=skyecommerce/);
  assert.match(url, /templatePath=US-AZ%2Fwebsite-digital-commerce%2Frefund-policy%2F/);
  assert.match(url, /storeSlug=demo-store/);
  assert.match(url, /merchantId=mrc_123/);
});

test('SkyeCommerce public API exposes SovereignDocs kit without merchant-local auth', async () => {
  const response = await app.fetch(new Request('https://commerce.test/api/docs/sovereigndocs-kit?storeSlug=demo-store'), env);
  const data = await readJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.lane, 'shared_0s_sovereigndocs');
  assert.equal(data.storeSlug, 'demo-store');
  assert.equal(data.templates.some((item) => item.slug === 'website-terms-of-use'), true);
});

test('SkyeCommerce health advertises the shared SovereignDocs bridge', async () => {
  const response = await app.fetch(new Request('https://commerce.test/api/health'), env);
  const data = await readJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.docsLane, 'shared_0s_sovereigndocs');
  assert.equal(data.sovereignDocsCategory, 'website-digital-commerce');
});
