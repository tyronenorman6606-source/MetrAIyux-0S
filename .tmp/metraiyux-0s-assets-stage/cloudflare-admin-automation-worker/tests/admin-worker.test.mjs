import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const enc = new TextEncoder();

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, type) {
    const value = this.map.get(key);
    if (value == null) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async list({prefix = '', limit = 1000} = {}) {
    return {keys:[...this.map.keys()].filter(name => name.startsWith(prefix)).slice(0, limit).map(name => ({name}))};
  }
}

class MemoryQueue {
  constructor() { this.messages = []; }
  async send(body) { this.messages.push({body, acked:false, retried:false, ack(){ this.acked = true; }, retry(){ this.retried = true; }}); }
  drain() { const out = this.messages; this.messages = []; return out; }
}

function env(overrides = {}) {
  return {
    ADMIN_TOKEN:'test-admin-token',
    ADMIN_KV:new MemoryKV(),
    ADMIN_QUEUE:new MemoryQueue(),
    RESEND_API_KEY:'re_test',
    RESEND_FROM_EMAIL:'MetrAIyux Test <test@example.com>',
    ADMIN_APPROVAL_EMAIL:'admin@example.com',
    PUBLIC_ADMIN_URL:'https://admin.example.com',
    SOCIAL_DISPATCH_WEBHOOK:'https://connector.example/social',
    SOCIAL_DISPATCH_TOKEN:'social-token',
    CRM_CONNECTOR_URL:'https://connector.example/crm',
    CRM_CONNECTOR_TOKEN:'crm-token',
    CONTENT_PUBLISH_WEBHOOK:'https://connector.example/content',
    CONTENT_PUBLISH_TOKEN:'content-token',
    LOCAL_BRAIN_UPDATE_WEBHOOK:'https://connector.example/local-brain',
    LOCAL_BRAIN_UPDATE_TOKEN:'brain-token',
    CONTENT_REPOSITORY_WEBHOOK:'https://connector.example/repo',
    CONTENT_REPOSITORY_TOKEN:'repo-token',
    ADMIN_MFA_ENCRYPTION_KEY:'unit-test-encryption-key-with-enough-entropy',
    ADMIN_BACKUP_CODE_PEPPER:'unit-test-backup-pepper',
    CLOUDFLARE_ACCOUNT_ID:'cf-account',
    CLOUDFLARE_API_TOKEN:'cf-token',
    ...overrides
  };
}

function req(path, {method='GET', token='test-admin-token', headers={}, body} = {}) {
  return new Request(`https://worker.example${path}`, {
    method,
    headers:{...(body ? {'content-type':'application/json'} : {}), ...(token ? {authorization:`Bearer ${token}`} : {}), ...headers},
    body: body ? JSON.stringify(body) : undefined
  });
}

async function json(response) {
  return response.json();
}

function installFetchMock() {
  const calls = [];
  const prior = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    calls.push({url:href, init, body:init.body ? String(init.body) : ''});
    if (href.includes('api.cloudflare.com')) return Response.json({success:true, result:{name:'ADMIN_TOKEN'}});
    if (href.includes('api.resend.com')) return Response.json({id:'email_test', object:'email'});
    if (href.includes('connector.example')) return Response.json({ok:true, received:true});
    return Response.json({ok:true});
  };
  return {calls, restore(){ globalThis.fetch = prior; }};
}

function normalizeSecret(secret) { return String(secret || '').toUpperCase().replace(/[\s=-]/g, ''); }
function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = normalizeSecret(base32);
  let bits = '';
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value === -1) throw new Error('bad base32');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}
async function totp(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const key = await crypto.subtle.importKey('raw', base32ToBytes(secret), {name:'HMAC', hash:{name:'SHA-1'}}, false, ['sign']);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary = ((sig[offset] & 0x7f) << 24) | ((sig[offset + 1] & 0xff) << 16) | ((sig[offset + 2] & 0xff) << 8) | (sig[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

test('status exposes connector, MFA, and rotation capability', async () => {
  const mock = installFetchMock();
  try {
    const data = await json(await worker.fetch(req('/api/admin/status'), env()));
    assert.equal(data.ok, true);
    assert.equal(data.connectors.length, 7);
    assert.equal(data.secret_rotation.cloudflare_api, true);
    assert.equal(data.mfa.encrypted_storage, true);
  } finally {
    mock.restore();
  }
});

test('social draft waits for approval, then dispatches through connector', async () => {
  const mock = installFetchMock();
  const e = env();
  try {
    const draft = await json(await worker.fetch(req('/api/admin/social/draft', {method:'POST', body:{platform:'linkedin', content:'Approved test post'}}), e));
    assert.equal(draft.ok, true);
    assert.equal(draft.connector_event.status, 'waiting_approval');

    const approval = await json(await worker.fetch(req('/api/admin/approval', {method:'POST', body:{item_id:draft.draft.id, decision:'approved'}}), e));
    assert.equal(approval.ok, true);
    assert.equal(approval.dispatches[0].ok, true);
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/social'), true);
  } finally {
    mock.restore();
  }
});

test('content engine lane creates approval-gated assets and dispatches after approval', async () => {
  const mock = installFetchMock();
  const e = env();
  const article = {
    title:'Account Executives Need More Than Scripts',
    slug:'account-executives-need-more-than-scripts',
    collection:'Cabinet Doctrine',
    category:'Revenue Operations',
    audience:'sales leaders and account executives',
    appWork:'a sales room where the AE can qualify the buyer and route proof',
    proofRule:'the AE should never promise a capability that cannot be opened or demonstrated inside 0S',
    marketingUse:'turn every sales objection into campaign material and proof packets',
    subtitle:'Revenue conversations need app proof behind them.',
    html:'blog/posts/account-executives-need-more-than-scripts.html',
    directAppRoutes:[
      {title:'AE Command', route:'ae-command/index.html', use:'Start sales rhythm and account ownership.'},
      {title:'Live Proof Router', route:'sales/live-proof-router.html', use:'Match buyer pain to live proof surfaces.'}
    ]
  };
  try {
    const created = await json(await worker.fetch(req('/api/admin/content-engine/activate', {
      method:'POST',
      body:{article, channels:['linkedin','x_thread','email','website_section','local_brain','repository_update']}
    }), e));
    assert.equal(created.ok, true);
    assert.equal(created.run.status, 'pending_approval');
    assert.equal(created.assets.length, 6);
    assert.equal(created.connector_events.every(event => event.status === 'waiting_approval'), true);

    const blocked = await worker.fetch(req('/api/admin/content-engine/dispatch', {method:'POST', body:{run_id:created.run.id}}), e);
    assert.equal(blocked.status, 403);

    const dispatched = await json(await worker.fetch(req('/api/admin/content-engine/dispatch', {
      method:'POST',
      body:{run_id:created.run.id, approved:true}
    }), e));
    assert.equal(dispatched.ok, true);
    assert.equal(dispatched.run.status, 'dispatched');
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/social'), true);
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/content'), true);
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/local-brain'), true);
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/repo'), true);

    const feed = await json(await worker.fetch(req('/api/admin/content-engine/local-brain-feed'), e));
    assert.equal(feed.ok, true);
    assert.equal(feed.chunks.length, 1);
    assert.equal(feed.chunks[0].id, 'content-engine-account-executives-need-more-than-scripts');

    const run = await json(await worker.fetch(req(`/api/admin/content-engine/run?id=${created.run.id}`), e));
    assert.equal(run.ok, true);
    assert.equal(run.assets.length, 6);
    assert.equal(run.connector_events.length >= 5, true);
  } finally {
    mock.restore();
  }
});

test('MFA setup issues a QR, verifies TOTP, and backup override is one-time', async () => {
  const mock = installFetchMock();
  const e = env();
  try {
    const setup = await json(await worker.fetch(req('/api/admin/security/mfa/setup', {method:'POST', body:{account_name:'admin@example.com'}}), e));
    assert.equal(setup.ok, true);
    assert.match(setup.otpauth_uri, /^otpauth:\/\/totp\//);
    assert.match(setup.qr_svg, /<svg/);

    const code = await totp(setup.secret_base32_once);
    const verified = await json(await worker.fetch(req('/api/admin/security/mfa/verify', {method:'POST', body:{device_id:setup.device.id, code}}), e));
    assert.equal(verified.ok, true);
    const session = verified.admin_session.token;

    const issued = await json(await worker.fetch(req('/api/admin/security/backup-codes/issue', {method:'POST', headers:{'x-admin-session':session}, body:{count:4, return_codes:true}}), e));
    assert.equal(issued.ok, true);
    assert.equal(issued.codes_once.length, 4);

    const override = await json(await worker.fetch(req('/api/admin/security/override-session', {method:'POST', body:{backup_code:issued.codes_once[0]}}), e));
    assert.equal(override.ok, true);
    const reused = await worker.fetch(req('/api/admin/security/override-session', {method:'POST', body:{backup_code:issued.codes_once[0]}}), e);
    assert.equal(reused.status, 401);
  } finally {
    mock.restore();
  }
});

test('secret rotation updates Cloudflare Workers secret API after MFA session', async () => {
  const mock = installFetchMock();
  const e = env();
  try {
    const setup = await json(await worker.fetch(req('/api/admin/security/mfa/setup', {method:'POST', body:{account_name:'admin@example.com'}}), e));
    const verified = await json(await worker.fetch(req('/api/admin/security/mfa/verify', {method:'POST', body:{device_id:setup.device.id, code:await totp(setup.secret_base32_once)}}), e));
    const rotated = await json(await worker.fetch(req('/api/admin/secrets/rotate', {method:'POST', headers:{'x-admin-session':verified.admin_session.token}, body:{secret_name:'ADMIN_TOKEN', approved:true, return_value_once:true}}), e));
    assert.equal(rotated.ok, true);
    const cfCall = mock.calls.find(call => call.url.includes('/workers/scripts/admin-automation-brain/secrets'));
    assert.ok(cfCall);
    assert.equal(JSON.parse(cfCall.body).type, 'secret_text');
    assert.equal(JSON.parse(cfCall.body).name, 'ADMIN_TOKEN');
  } finally {
    mock.restore();
  }
});

test('generated secret rotation blocks when no one-time delivery channel exists', async () => {
  const mock = installFetchMock();
  const e = env({RESEND_API_KEY:''});
  try {
    const setup = await json(await worker.fetch(req('/api/admin/security/mfa/setup', {method:'POST', body:{account_name:'admin@example.com'}}), e));
    const verified = await json(await worker.fetch(req('/api/admin/security/mfa/verify', {method:'POST', body:{device_id:setup.device.id, code:await totp(setup.secret_base32_once)}}), e));
    const response = await worker.fetch(req('/api/admin/secrets/rotate', {method:'POST', headers:{'x-admin-session':verified.admin_session.token}, body:{secret_name:'ADMIN_TOKEN', approved:true, deliver_once:true}}), e);
    const blocked = await json(response);
    assert.equal(response.status, 409);
    assert.equal(blocked.run.status, 'blocked_missing_delivery_channel');
    assert.equal(mock.calls.some(call => call.url.includes('api.cloudflare.com')), false);
  } finally {
    mock.restore();
  }
});

test('one-time generated secret return does not log plaintext when email is skipped', async () => {
  const mock = installFetchMock();
  const e = env({RESEND_API_KEY:''});
  try {
    const setup = await json(await worker.fetch(req('/api/admin/security/mfa/setup', {method:'POST', body:{account_name:'admin@example.com'}}), e));
    const verified = await json(await worker.fetch(req('/api/admin/security/mfa/verify', {method:'POST', body:{device_id:setup.device.id, code:await totp(setup.secret_base32_once)}}), e));
    const rotated = await json(await worker.fetch(req('/api/admin/secrets/rotate', {method:'POST', headers:{'x-admin-session':verified.admin_session.token}, body:{secret_name:'ADMIN_TOKEN', approved:true, deliver_once:true, return_value_once:true}}), e));
    assert.equal(rotated.ok, true);
    const returned = rotated.run.generated_value_returned_once;
    assert.match(returned, /^admin_/);
    const skippedLogs = await e.ADMIN_KV.list({prefix:'approval_email_skipped:'});
    assert.equal(skippedLogs.keys.length, 1);
    const skipped = await e.ADMIN_KV.get(skippedLogs.keys[0].name, 'json');
    assert.equal(JSON.stringify(skipped).includes(returned), false);
    assert.equal(skipped.payload.payload.message, '[redacted_sensitive_delivery]');
  } finally {
    mock.restore();
  }
});

test('STRIPE_SECRET rotates the exact legacy secret name', async () => {
  const mock = installFetchMock();
  const e = env();
  try {
    const setup = await json(await worker.fetch(req('/api/admin/security/mfa/setup', {method:'POST', body:{account_name:'admin@example.com'}}), e));
    const verified = await json(await worker.fetch(req('/api/admin/security/mfa/verify', {method:'POST', body:{device_id:setup.device.id, code:await totp(setup.secret_base32_once)}}), e));
    const rotated = await json(await worker.fetch(req('/api/admin/secrets/rotate', {method:'POST', headers:{'x-admin-session':verified.admin_session.token}, body:{secret_name:'STRIPE_SECRET', approved:true, new_value:'sk_live_replaced'}}), e));
    assert.equal(rotated.ok, true);
    const cfCall = mock.calls.find(call => call.url.includes('/workers/scripts/sovereign-saas-provisioning-worker/secrets'));
    assert.ok(cfCall);
    assert.equal(JSON.parse(cfCall.body).name, 'STRIPE_SECRET');
  } finally {
    mock.restore();
  }
});

test('inline approved social connector event dispatches immediately', async () => {
  const mock = installFetchMock();
  const e = env();
  try {
    const created = await json(await worker.fetch(req('/api/admin/connectors/event', {method:'POST', body:{connector_type:'social_dispatch', action:'social.publish', approved:true, payload:{content:'Approved inline'}, dispatch_now:true}}), e));
    assert.equal(created.ok, true);
    assert.equal(created.event.approval_required, false);
    assert.equal(created.dispatch.ok, true);
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/social'), true);
  } finally {
    mock.restore();
  }
});

test('repository update dispatches through GitHub Contents API when configured', async () => {
  const mock = installFetchMock();
  const e = env({
    CONTENT_REPOSITORY_WEBHOOK:'',
    CONTENT_REPOSITORY_TOKEN:'',
    GITHUB_CONTENT_REPO:'owner/repo',
    GITHUB_CONTENT_BRANCH:'content-engine',
    GITHUB_CONTENT_TOKEN:'gh-token'
  });
  try {
    const created = await json(await worker.fetch(req('/api/admin/connectors/event', {
      method:'POST',
      body:{
        connector_type:'repository_update',
        action:'content.repository.commit',
        approved:true,
        dispatch_now:true,
        payload:{files:[{path:'marketing/test.md', content:'# Test\n', message:'Add test content'}]}
      }
    }), e));
    assert.equal(created.ok, true);
    assert.equal(created.dispatch.ok, true);
    assert.equal(created.dispatch.response.provider, 'github_contents_api');
    assert.equal(mock.calls.some(call => call.url === 'https://api.github.com/repos/owner/repo/contents/marketing/test.md?ref=content-engine'), true);
    const putCall = mock.calls.find(call => call.url === 'https://api.github.com/repos/owner/repo/contents/marketing/test.md' && call.init.method === 'PUT');
    assert.ok(putCall);
    const payload = JSON.parse(putCall.body);
    assert.equal(payload.branch, 'content-engine');
    assert.equal(payload.message, 'Add test content');
    assert.equal(payload.content, 'IyBUZXN0Cg==');
  } finally {
    mock.restore();
  }
});

test('queue consumer dispatches queued CRM connector events', async () => {
  const mock = installFetchMock();
  const e = env();
  try {
    const event = await json(await worker.fetch(req('/api/admin/connectors/event', {method:'POST', body:{connector_type:'crm', action:'crm.lead.upsert', payload:{email:'buyer@example.com'}, dispatch_now:false}}), e));
    assert.equal(event.event.status, 'queued_dispatch');
    const messages = e.ADMIN_QUEUE.drain();
    await worker.queue({messages}, e, {waitUntil(){}});
    assert.equal(mock.calls.some(call => call.url === 'https://connector.example/crm'), true);
  } finally {
    mock.restore();
  }
});
