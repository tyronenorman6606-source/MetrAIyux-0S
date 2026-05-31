import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import {
  buildCustomerDisplayName,
  customerRecord,
  normalizeCustomerProfileInput,
  normalizeCustomerRegistrationInput,
  normalizeSavedCartInput
} from '../src/lib/customers.js';

test('normalizeCustomerRegistrationInput sanitizes customer registration payload', () => {
  const normalized = normalizeCustomerRegistrationInput({
    slug: 'delta-store',
    email: ' USER@Example.COM ',
    password: 'secret',
    firstName: ' Delta ',
    marketingOptIn: 'true',
    defaultAddress: { countryCode: 'us', stateCode: 'az' }
  });
  assert.equal(normalized.slug, 'delta-store');
  assert.equal(normalized.email, 'user@example.com');
  assert.equal(normalized.firstName, 'Delta');
  assert.equal(normalized.marketingOptIn, true);
  assert.equal(normalized.defaultAddress.countryCode, 'US');
});

test('normalizeSavedCartInput constrains line quantities and discount code formatting', () => {
  const normalized = normalizeSavedCartInput({
    note: ' VIP reorder ',
    items: [{ productId: 'p1', quantity: 0 }, { productId: 'p2', quantity: 3 }],
    discountCode: 'save10',
    location: { countryCode: 'us', stateCode: 'ny' }
  });
  assert.equal(normalized.note, 'VIP reorder');
  assert.equal(normalized.items[0].quantity, 1);
  assert.equal(normalized.items[1].quantity, 3);
  assert.equal(normalized.discountCode, 'SAVE10');
  assert.equal(normalized.location.stateCode, 'NY');
});

test('customerRecord parses default address and buildCustomerDisplayName prefers names', () => {
  const customer = customerRecord({
    id: 'cus_1',
    merchant_id: 'm1',
    email: 'buyer@example.com',
    first_name: 'Buyer',
    last_name: 'One',
    marketing_opt_in: 1,
    default_address_json: JSON.stringify({ countryCode: 'us', stateCode: 'ca' })
  });
  assert.equal(customer.defaultAddress.countryCode, 'US');
  assert.equal(customer.marketingOptIn, true);
  assert.equal(buildCustomerDisplayName(customer), 'Buyer One');
  assert.equal(buildCustomerDisplayName({ email: 'fallback@example.com' }), 'fallback@example.com');
});

test('normalizeCustomerProfileInput allows raw field object input', () => {
  const profile = normalizeCustomerProfileInput({
    firstName: 'A',
    lastName: 'B',
    countryCode: 'us',
    stateCode: 'tx',
    address1: '1 Main'
  });
  assert.equal(profile.defaultAddress.countryCode, 'US');
  assert.equal(profile.defaultAddress.stateCode, 'TX');
  assert.equal(profile.defaultAddress.address1, '1 Main');
});

function fakeGateD1(state) {
  function firstFor(sql, bindings) {
    if (/FROM merchants WHERE slug = \?/.test(sql)) return state.merchants.find((row) => row.slug === bindings[0]) || null;
    if (/FROM merchants WHERE id = \?/.test(sql)) return state.merchants.find((row) => row.id === bindings[0]) || null;
    if (/FROM customer_accounts/.test(sql) && /lower\(email\)/.test(sql)) {
      const merchantId = bindings[1];
      const email = String(bindings[2] || '').toLowerCase();
      const row = state.customers.find((item) => item.merchant_id === merchantId && item.email.toLowerCase() === email);
      return row ? { ...row, merchant_slug: bindings[0] } : null;
    }
    if (/FROM customer_accounts/.test(sql) && /WHERE id = \?/.test(sql)) {
      const row = state.customers.find((item) => item.id === bindings[1]);
      return row ? { ...row, merchant_slug: bindings[0] } : null;
    }
    return null;
  }

  function runFor(sql, bindings) {
    if (/INSERT INTO customer_accounts/.test(sql)) {
      state.customers.push({
        id: bindings[0],
        merchant_id: bindings[1],
        email: bindings[2],
        password_hash: bindings[3],
        first_name: bindings[4],
        last_name: bindings[5],
        phone: bindings[6],
        default_address_json: bindings[7],
        marketing_opt_in: bindings[8],
        created_at: 'now',
        updated_at: 'now'
      });
    }
    if (/INSERT INTO customer_sessions/.test(sql)) {
      state.customerSessions.push({
        id: bindings[0],
        customer_id: bindings[1],
        merchant_id: bindings[2],
        token_hash: bindings[3],
        expires_at: '2999-01-01T00:00:00.000Z'
      });
    }
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

async function gateApi(state, path, { method = 'GET', body } = {}) {
  const headers = new Headers({
    'x-skyecommerce-gate-handoff': 'gate-secret',
    'x-skyecommerce-gate-email': 'gate.customer@example.com',
    'x-skyecommerce-gate-name': 'Gate Customer'
  });
  if (body !== undefined) headers.set('content-type', 'application/json');
  const response = await app.fetch(new Request(`https://commerce.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), {
    DB: fakeGateD1(state),
    SESSION_SECRET: 'customer-gate-secret',
    SKYECOMMERCE_GATE_HANDOFF_SECRET: 'gate-secret',
    COOKIE_SECURE: 'false',
    CSRF_ENFORCEMENT: 'false'
  });
  return { response, body: await response.json() };
}

test('shared gate customer session reconciles to the FS27 gate email and creates a compatibility account', async () => {
  const state = {
    merchants: [{ id: 'm1', slug: 'gate-store', brand_name: 'Gate Store' }],
    customers: [],
    customerSessions: []
  };

  const current = await gateApi(state, '/api/customers/me?slug=gate-store');
  assert.equal(current.response.status, 200);
  assert.equal(current.body.ok, true);
  assert.equal(current.body.sharedGate, true);
  assert.equal(current.body.customer.email, 'gate.customer@example.com');
  assert.equal(state.customers.length, 1);
  assert.equal(state.customers[0].password_hash, 'shared-0s-gate-only');

  const login = await gateApi(state, '/api/customers/login', {
    method: 'POST',
    body: { slug: 'gate-store', email: 'gate.customer@example.com', password: 'ignored-local-password' }
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.sharedGate, true);
  assert.equal(login.body.sessionSource, 'fs27-gate');
  assert.equal(state.customers.length, 1);
  assert.equal(state.customerSessions.length, 0);
  assert.equal(login.response.headers.has('set-cookie'), false);
});

test('shared gate customer login rejects a different local customer email', async () => {
  const state = {
    merchants: [{ id: 'm1', slug: 'gate-store', brand_name: 'Gate Store' }],
    customers: [],
    customerSessions: []
  };

  const login = await gateApi(state, '/api/customers/login', {
    method: 'POST',
    body: { slug: 'gate-store', email: 'other@example.com', password: 'local-password' }
  });
  assert.equal(login.response.status, 403);
  assert.equal(login.body.code, 'shared_gate_customer_identity_mismatch');
  assert.equal(state.customers.length, 0);
});
