import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import worker from '../metraiyux_0s_site/cloudflare/worker.js';

class MemoryKv {
  constructor() {
    this.store = new Map();
  }
  async get(key, options = {}) {
    const value = this.store.get(key);
    if (value == null) return null;
    if (options.type === 'json') return JSON.parse(value);
    return value;
  }
  async put(key, value) {
    this.store.set(key, String(value));
  }
  async list(options = {}) {
    const prefix = options.prefix || '';
    const limit = options.limit || 1000;
    return {
      keys: [...this.store.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }))
    };
  }
}

function env() {
  return {
    SITE_EVENTS_KV: new MemoryKv(),
    ADMIN_TOKEN: 'local-admin-token',
    AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64')
  };
}

function ctx() {
  return { waitUntil() {} };
}

function packetForm(seed = 'smoke') {
  const form = new FormData();
  const fields = {
    legal_name: `Skye ${seed} Vendor`,
    preferred_name: `Skye ${seed}`,
    email: `${seed}@example.com`,
    phone: '555-0100',
    entity_name: `Skye ${seed} LLC`,
    state_residence: 'Arizona',
    address_line_1: '100 Test Way',
    city_state_zip: 'Phoenix, AZ 85004',
    role_lane: 'Part-Time Account Executive',
    start_date: '2026-05-20',
    approved_by: 'SkyeDevAdmin',
    accept_ic_agreement: 'on',
    accept_commission_plan: 'on',
    accept_confidentiality: 'on',
    accept_no_guarantees: 'on',
    typed_signature: `Skye ${seed} Vendor`,
    signature_date: '2026-05-20',
    w9_matches: 'Not reviewed yet',
    tax_note: 'Smoke test packet only.',
    payment_method: 'Bank / ACH',
    payment_display_name: `Skye ${seed}`,
    bank_account_type: 'Checking',
    bank_name: 'Test Bank',
    bank_routing: '111000025',
    bank_account: '123456789',
    stripe_account: `${seed}@stripe.example`
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('w9_file', new Blob(['%PDF-1.4 smoke W9'], { type: 'application/pdf' }), `${seed}-w9.pdf`);
  form.append('signed_agreement_file', new Blob(['agreement smoke'], { type: 'application/octet-stream' }), `${seed}-agreement.pdf`);
  return form;
}

async function call(appEnv, path, init = {}) {
  const response = await worker.fetch(new Request(`https://metraiyux.test${path}`, init), appEnv, ctx());
  const text = await response.text();
  let body = {};
  try { body = JSON.parse(text); } catch {}
  return { response, status: response.status, text, body };
}

const appEnv = env();

const health = await call(appEnv, '/api/marketing-made-easy/ae-vendor-onboarding/health');
assert.equal(health.status, 200);
assert.equal(health.body.cloudflare_only, true);
assert.equal(health.body.netlify, false);
assert.equal(health.body.googleDrive, false);
assert.equal(health.body.encrypted_storage, true);

const unauth = await call(appEnv, '/api/marketing-made-easy/ae-vendor-onboarding/submit', {
  method: 'POST',
  body: packetForm('unauth')
});
assert.equal(unauth.status, 401);

const submitted = await call(appEnv, '/api/marketing-made-easy/ae-vendor-onboarding/submit', {
  method: 'POST',
  headers: { authorization: 'Bearer local-admin-token' },
  body: packetForm('smoke')
});
assert.equal(submitted.status, 201);
assert.equal(submitted.body.ok, true);
assert.match(submitted.body.receiptId, /^ae_vendor_/);
assert.equal(submitted.body.storage.provider, 'cloudflare_worker_kv_encrypted_packet_store');
assert.equal(submitted.body.storage.googleDrive, false);
assert.equal(submitted.body.storage.netlify, false);
assert.equal(submitted.body.paymentProfile.status, 'encrypted_pending_owner_verification');
assert.equal(submitted.body.payoutLedger.externalTransferCreated, false);
assert.ok(!submitted.text.includes('123456789'));
assert.ok(!submitted.text.includes('111000025'));

const listed = await call(appEnv, '/api/marketing-made-easy/ae-vendor-onboarding/packets', {
  headers: { authorization: 'Bearer local-admin-token' }
});
assert.equal(listed.status, 200);
assert.equal(listed.body.packets.length, 1);

const packetId = submitted.body.receiptId;
const packet = await call(appEnv, `/api/marketing-made-easy/ae-vendor-onboarding/packets/${encodeURIComponent(packetId)}`, {
  headers: { authorization: 'Bearer local-admin-token' }
});
assert.equal(packet.status, 200);
assert.equal(packet.body.packet.id, packetId);
assert.equal(packet.body.packet.storage.files.length, 2);
assert.ok(packet.body.packet.storage.files.every((file) => file.encryptedStorageKey));
assert.ok(!JSON.stringify(packet.body.packet).includes('123456789'));

const approved = await call(appEnv, `/api/marketing-made-easy/ae-vendor-onboarding/packets/${encodeURIComponent(packetId)}/approve`, {
  method: 'POST',
  headers: { authorization: 'Bearer local-admin-token', 'content-type': 'application/json' },
  body: JSON.stringify({ note: 'Smoke approval only.' })
});
assert.equal(approved.status, 200);
assert.equal(approved.body.packet.status, 'approved_vendor_workspace_ready');
assert.equal(approved.body.payoutLedger.externalTransferCreated, false);

const report = {
  ok: true,
  generated_at: new Date().toISOString(),
  checks: {
    health: health.status,
    unauthenticated_submit: unauth.status,
    authenticated_submit: submitted.status,
    packet_list: listed.body.packets.length,
    packet_read: packet.status,
    approval: approved.status,
    raw_payment_values_exposed: submitted.text.includes('123456789') || packet.text.includes('123456789')
  },
  receipt_id: packetId
};
const outDir = join(process.cwd(), 'test-artifacts', 'ae-vendor-onboarding-cloudflare');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'smoke-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
