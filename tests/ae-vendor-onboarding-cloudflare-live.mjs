import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const reportDir = join(root, 'test-artifacts', 'ae-vendor-onboarding-cloudflare');
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const stressCount = Number(process.env.LIVE_AE_VENDOR_STRESS_COUNT || 20);

function parseEnvFile(file) {
  const values = {};
  let text = '';
  try { text = readFileSync(file, 'utf8'); } catch { return values; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const env = {
  ...parseEnvFile(join(root, '.env')),
  ...process.env
};

const zeroSOrigin = String(env.METRAIYUX_0S_WORKER_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const fs27Origin = String(env.SKYGATEFS27_ORIGIN || env.FS27_LIVE_BASE || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev').replace(/\/+$/, '');

async function readJson(response) {
  const text = await response.text();
  try {
    return { text, data: JSON.parse(text || '{}') };
  } catch {
    return { text, data: {} };
  }
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const { text, data } = await readJson(response);
  return { response, text, data };
}

async function obtainFs27Bearer() {
  const direct = env.SKYEVAULT_ONE_AUTH_BEARER || env.SKYGATE_SESSION_TOKEN || env.FS27_ADMIN_BEARER || '';
  if (direct) return { bearer: direct, source: 'env-bearer', login: null };
  const password = [
    env.ADMIN_PASSWORD,
    env.FS27_ADMIN_PASSWORD,
    env.SKYGATEFS27_ADMIN_PASSWORD,
    env.SKYGATE_ADMIN_PASSWORD,
    env.SKYEGATE_ADMIN_PASSWORD,
    env.SKYGATEFS13_ADMIN_PASSWORD,
    env.QA_ADMIN_PASSWORD,
    env.PHC_OPERATOR_PASSWORD
  ].map((value) => String(value || '').trim()).find(Boolean) || '';
  assert.ok(password, 'No FS27 bearer env or admin password is available for live proof.');
  const login = await postJson(`${fs27Origin}/admin/login`, { password });
  assert.equal(login.response.status, 200, `FS27 admin login failed: ${login.text.slice(0, 180)}`);
  assert.ok(login.data.token, 'FS27 admin login did not return a bearer token.');
  return { bearer: login.data.token, source: 'fs27-admin-login', login: { ok: true, via: login.data.via || 'admin-login' } };
}

async function introspectBearer(bearer) {
  const result = await postJson(`${fs27Origin}/auth-introspect`, { token: bearer });
  return {
    status: result.response.status,
    ok: result.response.ok && result.data.active === true,
    active: Boolean(result.data.active),
    role: result.data.role || '',
    subject: result.data.sub || result.data.user_id || '',
    email: result.data.email || result.data.username || '',
    error: result.data.error || ''
  };
}

function packetForm(seed, index = 0) {
  const name = `0S Live Proof ${seed} ${index}`.trim();
  const email = `0s-live-proof-${runId}-${seed}-${index}@example.com`;
  const form = new FormData();
  const fields = {
    form_started_at: String(Date.now() - 5000),
    legal_name: name,
    preferred_name: name,
    email,
    phone: '555-0199',
    entity_name: `${name} LLC`,
    state_residence: 'Arizona',
    address_line_1: '100 Cloudflare Proof Way',
    city_state_zip: 'Phoenix, AZ 85004',
    role_lane: index % 2 ? 'Part-Time Account Executive' : 'Referral Partner',
    start_date: '2026-05-20',
    approved_by: 'SkyeDevAdmin',
    accept_ic_agreement: 'on',
    accept_commission_plan: 'on',
    accept_confidentiality: 'on',
    accept_no_guarantees: 'on',
    typed_signature: name,
    signature_date: '2026-05-20',
    w9_matches: 'Production proof test packet',
    tax_note: 'Automated Cloudflare live proof packet. Not a real vendor payout.',
    payment_method: index % 2 ? 'Stripe' : 'Bank / ACH',
    payment_display_name: name,
    bank_account_type: 'Checking',
    bank_name: 'Proof Bank',
    bank_routing: '111000025',
    bank_account: `777000${String(index).padStart(4, '0')}`,
    stripe_account: `${email}.stripe`
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('w9_file', new Blob([`%PDF-1.4 live W9 ${seed} ${index}`], { type: 'application/pdf' }), `${seed}-${index}-w9.pdf`);
  form.append('signed_agreement_file', new Blob([`live agreement ${seed} ${index}`], { type: 'application/octet-stream' }), `${seed}-${index}-agreement.pdf`);
  return form;
}

async function api(path, init = {}) {
  const response = await fetch(`${zeroSOrigin}${path}`, init);
  const { text, data } = await readJson(response);
  return { response, status: response.status, text, data };
}

function authHeaders(bearer, extra = {}) {
  return {
    authorization: `Bearer ${bearer}`,
    'x-skye-gate-session': bearer,
    'x-skye-platform': 'metraiyux-0s',
    'x-skye-usage-lane': 'ae-vendor-cloudflare-live-proof',
    ...extra
  };
}

const report = {
  ok: false,
  schema: 'metraiyux-0s.ae-vendor.cloudflare-live-proof.v1',
  generated_at: new Date().toISOString(),
  run_id: runId,
  worker_version_id: env.LIVE_WORKER_VERSION_ID || '',
  origins: { zeroSOrigin, fs27Origin },
  stress_count: stressCount,
  checks: {}
};

const health = await api('/api/marketing-made-easy/ae-vendor-onboarding/health');
assert.equal(health.status, 200);
assert.equal(health.data.cloudflare_only, true);
assert.equal(health.data.netlify, false);
assert.equal(health.data.googleDrive, false);
assert.equal(health.data.encrypted_storage, true);
report.checks.health = {
  status: health.status,
  cloudflare_only: health.data.cloudflare_only,
  encrypted_storage: health.data.encrypted_storage,
  storage_configured: health.data.storage_configured
};

const page = await fetch(`${zeroSOrigin}/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html`, { redirect: 'follow' });
const pageText = await page.text();
assert.equal(page.status, 200);
assert.ok(pageText.includes('/api/marketing-made-easy/ae-vendor-onboarding/submit'));
assert.ok(pageText.includes('Cloudflare encrypted packet store'));
assert.ok(!pageText.includes('Netlify Function'));
report.checks.live_page = {
  status: page.status,
  cloudflare_action_present: pageText.includes('/api/marketing-made-easy/ae-vendor-onboarding/submit'),
  stale_netlify_function_copy_present: pageText.includes('Netlify Function')
};

const unauth = await api('/api/marketing-made-easy/ae-vendor-onboarding/submit', {
  method: 'POST',
  body: packetForm('unauth', 0)
});
assert.equal(unauth.status, 401);
report.checks.unauthenticated_submit = { status: unauth.status, error: unauth.data.error || '' };

const { bearer, source, login } = await obtainFs27Bearer();
const introspection = await introspectBearer(bearer);
assert.equal(introspection.ok, true, `FS27 bearer did not introspect active: ${JSON.stringify(introspection)}`);
report.checks.fs27_auth = { source, login, introspection };

const smoke = await api('/api/marketing-made-easy/ae-vendor-onboarding/submit', {
  method: 'POST',
  headers: authHeaders(bearer),
  body: packetForm('smoke', 1)
});
assert.equal(smoke.status, 201, smoke.text);
assert.equal(smoke.data.ok, true);
assert.equal(smoke.data.storage.provider, 'cloudflare_worker_kv_encrypted_packet_store');
assert.equal(smoke.data.storage.netlify, false);
assert.equal(smoke.data.storage.googleDrive, false);
assert.equal(smoke.data.payoutLedger.externalTransferCreated, false);
assert.ok(!smoke.text.includes('111000025'));
assert.ok(!smoke.text.includes('7770000001'));
report.checks.authenticated_smoke_submit = {
  status: smoke.status,
  receipt_id: smoke.data.receiptId,
  storage_provider: smoke.data.storage.provider,
  raw_payment_values_exposed: smoke.text.includes('111000025') || smoke.text.includes('7770000001')
};

const packet = await api(`/api/marketing-made-easy/ae-vendor-onboarding/packets/${encodeURIComponent(smoke.data.receiptId)}`, {
  headers: authHeaders(bearer)
});
assert.equal(packet.status, 200, packet.text);
assert.equal(packet.data.packet.id, smoke.data.receiptId);
assert.ok(!packet.text.includes('111000025'));
assert.ok(!packet.text.includes('7770000001'));
report.checks.packet_read = {
  status: packet.status,
  receipt_id: packet.data.packet.id,
  file_count: packet.data.packet.storage?.files?.length || 0,
  raw_payment_values_exposed: packet.text.includes('111000025') || packet.text.includes('7770000001')
};

const approval = await api(`/api/marketing-made-easy/ae-vendor-onboarding/packets/${encodeURIComponent(smoke.data.receiptId)}/approve`, {
  method: 'POST',
  headers: authHeaders(bearer, { 'content-type': 'application/json' }),
  body: JSON.stringify({ note: 'Automated live proof approval; no external transfer created.' })
});
assert.equal(approval.status, 200, approval.text);
assert.equal(approval.data.payoutLedger.externalTransferCreated, false);
report.checks.approval = {
  status: approval.status,
  payout_status: approval.data.payoutLedger.status,
  external_transfer_created: approval.data.payoutLedger.externalTransferCreated
};

const startedStress = Date.now();
const stressResults = await Promise.all(Array.from({ length: stressCount }, (_, index) => api('/api/marketing-made-easy/ae-vendor-onboarding/submit', {
  method: 'POST',
  headers: authHeaders(bearer),
  body: packetForm('stress', index + 1)
}).then((result) => ({ index: index + 1, ...result }))));
const failed = stressResults.filter((result) => result.status !== 201 || result.data.ok !== true);
const stressIds = new Set(stressResults.map((result) => result.data.receiptId).filter(Boolean));
assert.equal(failed.length, 0, JSON.stringify(failed.slice(0, 3).map((item) => ({ index: item.index, status: item.status, text: item.text.slice(0, 180) })), null, 2));
assert.equal(stressIds.size, stressCount);
assert.equal(stressResults.some((result) => result.text.includes('111000025')), false);
report.checks.live_authenticated_stress = {
  concurrency: stressCount,
  duration_ms: Date.now() - startedStress,
  success_count: stressResults.length,
  failure_count: failed.length,
  unique_receipts: stressIds.size,
  raw_payment_values_exposed: stressResults.some((result) => result.text.includes('111000025'))
};

const list = await api('/api/marketing-made-easy/ae-vendor-onboarding/packets?limit=100', {
  headers: authHeaders(bearer)
});
assert.equal(list.status, 200, list.text);
const listedIds = new Set((list.data.packets || []).map((item) => item.id));
assert.ok(listedIds.has(smoke.data.receiptId), 'Smoke receipt missing from live packet list.');
assert.ok([...stressIds].every((id) => listedIds.has(id)), 'One or more stress receipts missing from live packet list.');
report.checks.packet_list = {
  status: list.status,
  returned_count: list.data.packets?.length || 0,
  smoke_receipt_listed: listedIds.has(smoke.data.receiptId),
  stress_receipts_listed: [...stressIds].every((id) => listedIds.has(id))
};

report.ok = true;
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'live-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  ok: report.ok,
  generated_at: report.generated_at,
  run_id: report.run_id,
  worker_version_id: report.worker_version_id,
  health: report.checks.health,
  live_page: report.checks.live_page,
  unauthenticated_submit: report.checks.unauthenticated_submit,
  fs27_auth: {
    source: report.checks.fs27_auth.source,
    introspection: report.checks.fs27_auth.introspection
  },
  authenticated_smoke_submit: report.checks.authenticated_smoke_submit,
  approval: report.checks.approval,
  live_authenticated_stress: report.checks.live_authenticated_stress,
  packet_list: report.checks.packet_list
}, null, 2));
