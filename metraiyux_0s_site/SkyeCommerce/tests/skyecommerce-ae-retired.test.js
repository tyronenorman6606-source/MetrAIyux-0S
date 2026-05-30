import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';

const env = {
  DB: {},
  SESSION_SECRET: 'skyecommerce-ae-retired-test-secret',
  API_RATE_LIMIT_DISABLED: 'true'
};

async function readJson(response) {
  return response.json().catch(() => ({}));
}

test('SkyeCommerce AE API lane is retired before local auth or CSRF can unlock it', async () => {
  const login = await app.fetch(new Request('https://commerce.test/api/ae/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'legacy-token' })
  }), env);
  const loginData = await readJson(login);
  assert.equal(login.status, 410);
  assert.equal(loginData.code, 'skyecommerce_ae_lane_retired');
  assert.equal(loginData.canonical.aeFlow, '/Marketing-Made-Easy/AE-FlowPro/');

  const roster = await app.fetch(new Request('https://commerce.test/api/ae/roster', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'skye_session=stale-local-session'
    },
    body: JSON.stringify({ displayName: 'Legacy AE' })
  }), env);
  const rosterData = await readJson(roster);
  assert.equal(roster.status, 410);
  assert.equal(rosterData.code, 'skyecommerce_ae_lane_retired');
});

test('SkyeCommerce health advertises shared 0S AE handoff instead of a local AE token', async () => {
  const response = await app.fetch(new Request('https://commerce.test/api/health'), env);
  const data = await readJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.aeLane, 'retired_shared_0s_only');
  assert.equal(data.canonicalAeFlow, '/Marketing-Made-Easy/AE-FlowPro/');
  assert.equal('hasAeToken' in data, false);
});
