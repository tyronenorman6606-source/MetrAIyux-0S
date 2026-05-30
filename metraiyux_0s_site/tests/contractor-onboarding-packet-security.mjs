import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true
  });
}

const { default: worker } = await import('../cloudflare/worker.js');

function memoryKv() {
  const store = new Map();
  return {
    store,
    async get(key, opts = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return opts.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()]
        .filter((name) => name.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }));
      return { keys };
    }
  };
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'contractor', email = `${role}@packet.local`] = token.split(':');
      return Response.json({
        active: true,
        email,
        sub: `gate-${role}-${email}`,
        role,
        routex_role: role,
        scope: role === 'admin' ? 'admin.read admin.write' : ''
      });
    }
  };
}

function formPacket(suffix) {
  const form = new FormData();
  const fields = {
    legal_name: `Packet Contractor ${suffix}`,
    preferred_name: 'Packet',
    email: `packet-${suffix}@example.com`,
    phone: '+15551234567',
    role_lane: 'Artist / Music Nexus Contractor',
    commission_plan: 'Artist/vendor payout hold — custom rights and payout addendum required',
    approved_by: 'Founder Command owner review required',
    typed_signature: `Packet Contractor ${suffix}`,
    signature_date: '2026-05-23',
    accept_ic_agreement: 'on',
    accept_commission_plan: 'on',
    accept_confidentiality: 'on',
    accept_no_guarantees: 'on',
    payment_method: 'Bank / ACH',
    payment_display_name: 'Packet Contractor',
    bank_name: 'Test Bank',
    bank_routing: '000111222',
    bank_account: '999888777666',
    address_line_1: '100 Private Packet Lane',
    city_state_zip: 'Phoenix, AZ 85001',
    tax_note: 'Sole proprietor test packet',
    source_app: 'SkyeMusicNexus',
    artist_slug: 'supaboy',
    artist_id: '444666666667',
    stage_name: 'SupaBoy',
    company_onboarding_lane: 'Skyes Over London LC artist/vendor contractor onboarding',
    music_nexus_release_lane: 'slb-superboy',
    founder_command_copy: 'true',
    founder_command_route: '/api/founder-command/contractor-packets',
    contractor_packet_inbox_route: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html',
    ae_command_route: '/ae-command/?artist=supaboy&artistId=444666666667&stageName=SupaBoy&lane=artist',
    workforce_command_route: '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel',
    skye_pay_tracking_ref: 'skyepay_artist_444666666667',
    rights_review_required: 'true',
    payout_hold_reason: 'Artist payout and checkout stay blocked until paperwork, rights/audio ownership review, payout destination verification, and owner approval clear.'
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('w9_file', new Blob(['fake pdf W9 with sensitive tin 123-45-6789'], { type: 'application/pdf' }), 'w9.pdf');
  return form;
}

async function call(env, method, path, { token, body, expectOk = true } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (typeof body === 'string') headers['content-type'] = 'application/json';
  const response = await worker.fetch(new Request(`https://contractor-packet.test${path}`, {
    method,
    headers,
    body
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ raw: await response.text() }));
  if (expectOk && !response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
}

const kv = memoryKv();
const resendCalls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const target = new URL(String(url));
  if (target.hostname === 'api.resend.com' && target.pathname === '/emails') {
    resendCalls.push({
      url: String(url),
      headers: Object.fromEntries(new Headers(init.headers || {}).entries()),
      body: JSON.parse(String(init.body || '{}'))
    });
    return Response.json({ id: `email_${resendCalls.length}` }, { status: 200 });
  }
  return originalFetch(url, init);
};

try {
  const env = {
    SITE_EVENTS_KV: kv,
    SKYGATEFS27_WORKER: fakeGateWorker(),
    AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString('base64'),
    RESEND_API_KEY: 'test_resend_key',
    RESEND_FROM_EMAIL: 'Skyes Packet Vault <packets@example.com>',
    CONTRACTOR_PACKET_NOTIFY_EMAIL: 'owner@example.com'
  };
  const suffix = Date.now().toString(36);
  const contractorToken = `contractor:packet-${suffix}@example.com`;
  const adminToken = 'admin:owner@example.com';

  const created = await call(env, 'POST', '/api/marketing-made-easy/ae-vendor-onboarding/submit', {
    token: contractorToken,
    body: formPacket(suffix)
  });
  assert.equal(created.status, 201);
  assert.equal(created.payload.ok, true);
  assert.equal(created.payload.storage.googleDrive, false);
  assert.equal(created.payload.storage.netlify, false);
  assert.equal(created.payload.paymentProfile.status, 'encrypted_pending_owner_verification');
  assert.equal(created.payload.payoutLedger.externalTransferCreated, false);
  assert.equal(created.payload.packet.artistSlug, 'supaboy');
  assert.equal(created.payload.packet.artistId, '444666666667');
  assert.equal(created.payload.packet.founderCommandCopy, true);
  assert.equal(created.payload.founderCommand.status, 'visible_through_founder_command_contractor_packets_alias');
  assert.equal(created.payload.adminNotification.ok, true);
  assert.equal(created.payload.adminNotification.provider_runtime?.provider_id, 'resend');
  assert.equal(created.payload.adminNotification.provider_runtime?.action, 'resend.email.send');
  assert.equal(resendCalls.length, 1);

  const emailBody = JSON.stringify(resendCalls[0].body);
  assert.match(emailBody, /contractor packet pending/i);
  assert.doesNotMatch(emailBody, /000111222|999888777666|123-45-6789|100 Private Packet Lane/i);
  assert.equal(resendCalls[0].body.to[0], 'owner@example.com');

  const allStored = JSON.stringify([...kv.store.values()]);
  assert.doesNotMatch(allStored, /000111222|999888777666|123-45-6789/i);
  assert.match(allStored, /encrypted/i);

  const contractorList = await call(env, 'GET', '/api/marketing-made-easy/ae-vendor-onboarding/packets', {
    token: contractorToken,
    expectOk: false
  });
  assert.equal(contractorList.status, 403);

  const inbox = await call(env, 'GET', '/api/marketing-made-easy/ae-vendor-onboarding/packets', { token: adminToken });
  assert.equal(inbox.payload.packets.length, 1);
  assert.equal(inbox.payload.packets[0].companyOnboardingLane, 'Skyes Over London LC artist/vendor contractor onboarding');

  const founderContractorListBlocked = await call(env, 'GET', '/api/founder-command/contractor-packets?artist=supaboy', {
    token: contractorToken,
    expectOk: false
  });
  assert.equal(founderContractorListBlocked.status, 403);

  const founderInbox = await call(env, 'GET', '/api/founder-command/contractor-packets?artist=supaboy', { token: adminToken });
  assert.equal(founderInbox.payload.packets.length, 1);
  assert.equal(founderInbox.payload.packets[0].artistSlug, 'supaboy');

  const packetId = created.payload.receiptId;
  const contractorApprove = await call(env, 'POST', `/api/marketing-made-easy/ae-vendor-onboarding/packets/${packetId}/approve`, {
    token: contractorToken,
    body: JSON.stringify({ note: 'should not approve' }),
    expectOk: false
  });
  assert.equal(contractorApprove.status, 403);

  const founderDetail = await call(env, 'GET', `/api/founder-command/contractor-packets/${packetId}`, { token: adminToken });
  assert.equal(founderDetail.payload.packet.onboardingContext.artistId, '444666666667');
  assert.equal(founderDetail.payload.packet.companyOnboarding.founderCommandRoute, '/api/founder-command/contractor-packets');

  const approved = await call(env, 'POST', `/api/founder-command/contractor-packets/${packetId}/approve`, {
    token: adminToken,
    body: JSON.stringify({ note: 'Owner approved test packet.', payoutDestinationVerified: true })
  });
  assert.equal(approved.payload.packet.status, 'approved_vendor_workspace_ready');
  assert.equal(approved.payload.payoutLedger.externalTransferCreated, false);
  assert.equal(approved.payload.paymentProfile.payoutDestinationVerified, true);

  const detail = await call(env, 'GET', `/api/marketing-made-easy/ae-vendor-onboarding/packets/${packetId}`, { token: adminToken });
  assert.equal(detail.payload.packet.adminNotification.ok, true);
  assert.equal(detail.payload.packet.adminNotification.provider_runtime?.provider_id, 'resend');
  assert.equal(detail.payload.packet.storage.files[0].encryptedStorageKey.includes('ae-vendor-file'), true);
  assert.equal(detail.payload.packet.storage.files[0].sha256.length, 64);

  console.log(JSON.stringify({
    ok: true,
    checkedAt: new Date().toISOString(),
    packetId,
    resendCalls: resendCalls.length,
    contractorInboxBlockedStatus: contractorList.status,
    founderContractorInboxBlockedStatus: founderContractorListBlocked.status,
    ownerInboxPackets: inbox.payload.packets.length,
    founderInboxPackets: founderInbox.payload.packets.length,
    externalTransferCreated: approved.payload.payoutLedger.externalTransferCreated,
    leakScan: 'no raw routing/account/tin values found in email or KV JSON'
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
