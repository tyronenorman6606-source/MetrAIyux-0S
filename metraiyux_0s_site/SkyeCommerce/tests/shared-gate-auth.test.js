import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { hashApiToken } from '../src/lib/platform-apps.js';

function fakeD1(state) {
  function firstFor(sql, bindings) {
    if (/FROM api_access_tokens/.test(sql)) return state.tokens.find((row) => row.token_hash === bindings[0]) || null;
    if (/FROM merchants WHERE slug = \?/.test(sql)) return state.merchants.find((row) => row.slug === bindings[0]) || null;
    if (/FROM merchants WHERE lower\(email\)/.test(sql)) {
      const email = String(bindings[0] || '').toLowerCase();
      return state.merchants.find((row) => row.email.toLowerCase() === email) || null;
    }
    return null;
  }

  function runFor(sql, bindings) {
    if (/UPDATE api_access_tokens SET last_used_at/.test(sql)) state.lastUsedTokenId = bindings[0];
    return { success: true };
  }

  return {
    prepare(sql) {
      return {
        bind(...bindings) {
          return {
            all: async () => ({ results: [] }),
            first: async () => firstFor(sql, bindings),
            run: async () => runFor(sql, bindings)
          };
        }
      };
    }
  };
}

async function headlessApi(state, rawToken) {
  const headers = new Headers({
    authorization: `Bearer ${rawToken}`,
    'x-skyecommerce-gate-handoff': 'gate-secret',
    'x-skyecommerce-gate-email': 'owner@example.com',
    'x-skyecommerce-gate-name': 'Owner Example'
  });
  const response = await app.fetch(new Request('https://commerce.test/api/headless/products', { headers }), {
    DB: fakeD1(state),
    SESSION_SECRET: 'shared-gate-api-secret',
    API_TOKEN_HASH_SECRET: 'api-hash-secret',
    SKYECOMMERCE_GATE_HANDOFF_SECRET: 'gate-secret',
    SKYECOMMERCE_OWNER_MERCHANT_SLUG: 'gate-store',
    COOKIE_SECURE: 'false',
    CSRF_ENFORCEMENT: 'false'
  });
  return { response, body: await response.json() };
}

test('shared gate mounted headless API rejects bearer tokens for a different merchant', async () => {
  const rawToken = 'skct_test_token';
  const state = {
    merchants: [
      { id: 'm1', slug: 'gate-store', email: 'owner@example.com', brand_name: 'Gate Store' },
      { id: 'm2', slug: 'other-store', email: 'other@example.com', brand_name: 'Other Store' }
    ],
    tokens: [{
      id: 'tok_1',
      merchant_id: 'm2',
      label: 'Other merchant token',
      token_hash: await hashApiToken('api-hash-secret', rawToken),
      scopes_json: '["catalog:read"]',
      status: 'active',
      expires_at: ''
    }]
  };

  const result = await headlessApi(state, rawToken);
  assert.equal(result.response.status, 403);
  assert.equal(result.body.code, 'shared_gate_api_token_merchant_mismatch');
  assert.equal(state.lastUsedTokenId, undefined);
});
