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

const appEnv = {
  SITE_EVENTS_KV: new MemoryKv(),
  ADMIN_TOKEN: 'local-admin-token',
  AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64')
};
const appCtx = { waitUntil() {} };
const total = Number(process.env.AE_VENDOR_STRESS_COUNT || 80);

function packetForm(index) {
  const name = `Stress Vendor ${String(index).padStart(3, '0')}`;
  const form = new FormData();
  const fields = {
    legal_name: name,
    preferred_name: name,
    email: `stress-${index}@example.com`,
    phone: `555-2${String(index).padStart(3, '0')}`,
    entity_name: `${name} LLC`,
    state_residence: 'Arizona',
    address_line_1: `${index} Stress Way`,
    city_state_zip: 'Phoenix, AZ 85004',
    role_lane: index % 2 ? 'Part-Time Account Executive' : 'Referral Partner',
    approved_by: 'SkyeDevAdmin',
    accept_ic_agreement: 'on',
    accept_commission_plan: 'on',
    accept_confidentiality: 'on',
    accept_no_guarantees: 'on',
    typed_signature: name,
    signature_date: '2026-05-20',
    w9_matches: 'Not reviewed yet',
    payment_method: index % 2 ? 'Stripe' : 'Bank / ACH',
    payment_display_name: name,
    bank_account_type: 'Checking',
    bank_name: 'Stress Bank',
    bank_routing: '111000025',
    bank_account: `999000${index}`
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('w9_file', new Blob([`%PDF-1.4 stress ${index}`], { type: 'application/pdf' }), `stress-${index}-w9.pdf`);
  return form;
}

async function submit(index) {
  const response = await worker.fetch(new Request('https://metraiyux.test/api/marketing-made-easy/ae-vendor-onboarding/submit', {
    method: 'POST',
    headers: { authorization: 'Bearer local-admin-token' },
    body: packetForm(index)
  }), appEnv, appCtx);
  const text = await response.text();
  const body = JSON.parse(text);
  return { index, status: response.status, body, text };
}

const startedAt = Date.now();
const results = await Promise.all(Array.from({ length: total }, (_, index) => submit(index + 1)));
const failed = results.filter((result) => result.status !== 201 || result.body.ok !== true);
assert.equal(failed.length, 0, JSON.stringify(failed.slice(0, 5), null, 2));
const ids = new Set(results.map((result) => result.body.receiptId));
assert.equal(ids.size, total);
assert.ok(results.every((result) => !result.text.includes('111000025')));

const listResponse = await worker.fetch(new Request('https://metraiyux.test/api/marketing-made-easy/ae-vendor-onboarding/packets?limit=100', {
  headers: { authorization: 'Bearer local-admin-token' }
}), appEnv, appCtx);
const listed = await listResponse.json();
assert.equal(listResponse.status, 200);
assert.equal(listed.packets.length, total);

const report = {
  ok: true,
  generated_at: new Date().toISOString(),
  concurrency: total,
  duration_ms: Date.now() - startedAt,
  success_count: results.length,
  failure_count: failed.length,
  unique_receipts: ids.size,
  packet_list_count: listed.packets.length,
  storage_keys: appEnv.SITE_EVENTS_KV.store.size,
  raw_payment_values_exposed: results.some((result) => result.text.includes('111000025'))
};
const outDir = join(process.cwd(), 'test-artifacts', 'ae-vendor-onboarding-cloudflare');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'stress-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
