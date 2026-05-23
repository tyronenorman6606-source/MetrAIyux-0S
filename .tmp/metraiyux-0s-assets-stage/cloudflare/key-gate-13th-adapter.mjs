const JSON_LIMIT = 1024 * 1024;
const SECRET_TTL_SECONDS = 60 * 60 * 24 * 365;
const AUDIT_TTL_SECONDS = 60 * 60 * 24 * 365;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const KEY_GATE_13_ROUTE_FAMILIES = [
  'GET /api/key-gate-13th/health',
  'GET /api/key-gate-13th/v1/schema',
  'GET /api/key-gate-13th/v1/vendors',
  'GET /api/key-gate-13th/v1/secrets',
  'POST /api/key-gate-13th/v1/secrets',
  'POST /api/key-gate-13th/v1/secrets/:id/test',
  'POST /api/key-gate-13th/v1/secrets/:id/rotate',
  'POST /api/key-gate-13th/v1/secrets/:id/revoke',
  'POST /api/key-gate-13th/v1/secrets/:id/grants',
  'GET /api/key-gate-13th/v1/audit'
];

export const KEY_GATE_13_VENDORS = [
  {
    key: 'google-search-console',
    title: 'Google Search Console',
    lane: 'search-data',
    secretLabel: 'OAuth access token',
    credentialShape: 'bearer_token',
    capabilities: ['gsc.search_analytics.pull'],
    defaultScopes: ['agentic-growth:gsc']
  },
  {
    key: 'semrush',
    title: 'SEMrush',
    lane: 'keyword-data',
    secretLabel: 'SEMrush API key',
    credentialShape: 'api_key',
    capabilities: ['semrush.domain_organic.pull'],
    defaultScopes: ['agentic-growth:semrush']
  },
  {
    key: 'dataforseo',
    title: 'DataForSEO',
    lane: 'live-serp',
    secretLabel: 'DataForSEO login/password',
    credentialShape: 'json_login_password',
    capabilities: ['dataforseo.serp.live_advanced'],
    defaultScopes: ['agentic-growth:serp']
  },
  {
    key: 'stripe',
    title: 'Stripe',
    lane: 'payments',
    secretLabel: 'Stripe secret key',
    credentialShape: 'api_key',
    capabilities: ['stripe.balance.read', 'skyepay.product_lane'],
    defaultScopes: ['skyepay:stripe']
  },
  {
    key: 'cloudflare',
    title: 'Cloudflare',
    lane: 'deploy-provider',
    secretLabel: 'Cloudflare API token',
    credentialShape: 'api_token',
    capabilities: ['cloudflare.token.verify', 'cloudflare.deploy'],
    defaultScopes: ['deploy:cloudflare']
  },
  {
    key: 'openai',
    title: 'OpenAI',
    lane: 'model-provider',
    secretLabel: 'OpenAI API key',
    credentialShape: 'api_key',
    capabilities: ['model.call'],
    defaultScopes: ['ai:provider']
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-skygate-session'
    }
  });
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > JSON_LIMIT) throw new Error('Request body is too large for Key Gate 13th.');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanId(value, max = 180) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null && item !== '');
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const item of asArray(values).map(value => cleanText(value, 160)).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix = 'kg13') {
  const id = globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 28)}`;
}

function bytesToBase64(bytes) {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  if (globalThis.Buffer) return Buffer.from(bytes).toString('base64');
  throw new Error('No base64 encoder is available.');
}

function base64ToBytes(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  if (typeof atob === 'function') {
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  if (globalThis.Buffer) return new Uint8Array(Buffer.from(padded, 'base64'));
  throw new Error('No base64 decoder is available.');
}

function base64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  return hex(await crypto.subtle.digest('SHA-256', textEncoder.encode(String(value ?? ''))));
}

async function importAesKey(material) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(`key-gate-13th:aes:v1:${material}`));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function importHmacKey(material) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(`key-gate-13th:hmac:v1:${material}`));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function keyMaterial(env) {
  return cleanText(env.KEY_GATE_13_MASTER_KEY || env.KEY_GATE_13_ENCRYPTION_KEY || env.KEYGATE13_MASTER_KEY || '', 4000);
}

function fingerprintMaterial(env) {
  return cleanText(env.KEY_GATE_13_FINGERPRINT_PEPPER || env.KEY_GATE_13_PEPPER || keyMaterial(env), 4000);
}

function assertEncryptionReady(env) {
  const material = keyMaterial(env);
  if (material.length < 16) {
    throw new Error('KEY_GATE_13_MASTER_KEY is required and must be at least 16 characters before provider secrets can be stored or resolved.');
  }
  return material;
}

async function encryptPlaintext(env, plaintext, aad) {
  const key = await importAesKey(assertEncryptionReady(env));
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv,
    additionalData: textEncoder.encode(aad)
  }, key, textEncoder.encode(plaintext));
  return {
    alg: 'AES-GCM',
    version: 1,
    key_version: cleanText(env.KEY_GATE_13_KEY_VERSION || 'kg13-v1', 80),
    iv: base64Url(iv),
    ciphertext: base64Url(new Uint8Array(encrypted)),
    aad_hash: await sha256Hex(aad)
  };
}

async function decryptPlaintext(env, encrypted, aad) {
  const key = await importAesKey(assertEncryptionReady(env));
  const plaintext = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: base64ToBytes(encrypted.iv),
    additionalData: textEncoder.encode(aad)
  }, key, base64ToBytes(encrypted.ciphertext));
  return textDecoder.decode(plaintext);
}

async function hmacHex(env, value) {
  const key = await importHmacKey(fingerprintMaterial(env));
  return hex(await crypto.subtle.sign('HMAC', key, textEncoder.encode(String(value ?? ''))));
}

function vendorFor(value) {
  const key = cleanId(value, 80).toLowerCase();
  return KEY_GATE_13_VENDORS.find(vendor => vendor.key === key || vendor.title.toLowerCase() === key) || null;
}

function storage(env) {
  return env.KEY_GATE_13_KV || env.KEYGATE13_KV || env.SITE_EVENTS_KV || null;
}

function actorWorkspace(auth, body = {}) {
  return cleanId(
    body.workspace_id ||
    body.workspaceId ||
    auth?.identity?.workspace_id ||
    auth?.identity?.workspaceId ||
    auth?.identity?.ws_id ||
    auth?.identity?.customer_id ||
    auth?.gate?.data?.workspace_id ||
    auth?.gate?.data?.customer_id ||
    auth?.gate?.data?.org_id ||
    auth?.actor ||
    '0s-primary-workspace',
    160
  ) || '0s-primary-workspace';
}

function actorId(auth) {
  return cleanText(
    auth?.identity?.email ||
    auth?.identity?.username ||
    auth?.identity?.id ||
    auth?.gate?.data?.email ||
    auth?.gate?.data?.username ||
    auth?.gate?.data?.sub ||
    auth?.actor ||
    'fs27-gate-session',
    254
  );
}

function privileged(auth) {
  const role = cleanText(auth?.role || auth?.identity?.role || auth?.gate?.data?.role || '', 80).toLowerCase();
  const scope = `${auth?.gate?.data?.scope || ''} ${auth?.identity?.scope || ''}`.toLowerCase();
  return ['owner', 'admin', 'operator', 'system'].includes(role) || /\badmin\.(read|write)\b/.test(scope);
}

function secretKey(workspaceId, id) {
  return `key-gate-13th:secret:${workspaceId}:${id}`;
}

function auditKey(workspaceId, id = randomId('kg13_evt')) {
  return `key-gate-13th:audit:${workspaceId}:${new Date().toISOString()}:${id}`;
}

function redactDeep(value) {
  if (Array.isArray(value)) return value.map(redactDeep);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  const sensitive = new Set(['secret', 'value', 'plaintext', 'password', 'api_key', 'apikey', 'access_token', 'token', 'credentials', 'credential', 'authorization']);
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    out[key] = sensitive.has(normalized) ? '[redacted]' : redactDeep(child);
  }
  return out;
}

async function audit(env, ctx, auth, workspaceId, event = {}) {
  const kv = storage(env);
  const row = {
    id: event.id || randomId('kg13_evt'),
    app_id: 'key-gate-13th',
    type: event.type || 'key_gate_13th.event',
    workspace_id: workspaceId,
    actor: actorId(auth),
    auth_via: auth?.via || 'fs27-gate',
    secret_id: event.secret_id || null,
    vendor_key: event.vendor_key || null,
    status: event.status || 'recorded',
    metadata: redactDeep(event.metadata || {}),
    created_at: nowIso()
  };
  if (kv?.put) {
    const put = kv.put(auditKey(workspaceId, row.id), JSON.stringify(row), { expirationTtl: AUDIT_TTL_SECONDS });
    ctx?.waitUntil ? ctx.waitUntil(put) : await put;
  }
  return row;
}

function credentialStringFromBody(vendor, body) {
  const objectCredential = body.credentials || body.credential || null;
  if (objectCredential && typeof objectCredential === 'object' && !Array.isArray(objectCredential)) {
    const allowed = {};
    for (const key of ['login', 'username', 'password', 'apiKey', 'api_key', 'accessToken', 'token', 'secretKey', 'accountId', 'zoneId']) {
      if (objectCredential[key] !== undefined) allowed[key] = cleanText(objectCredential[key], 4000);
    }
    if (!Object.keys(allowed).length) throw new Error('Credential object did not include any supported provider fields.');
    return {
      plaintext: JSON.stringify(allowed),
      format: 'json',
      last4Source: allowed.password || allowed.apiKey || allowed.api_key || allowed.accessToken || allowed.token || allowed.secretKey || allowed.login || ''
    };
  }
  const plaintext = cleanText(body.secret || body.value || body.apiKey || body.api_key || body.accessToken || body.token || body.password || '', 8000);
  if (!plaintext) throw new Error(`${vendor.title} credential is required.`);
  return { plaintext, format: 'text', last4Source: plaintext };
}

function safeLast4(value) {
  const text = cleanText(value, 8000);
  return text ? text.slice(-4) : '';
}

async function buildSecretRecord(env, auth, body, existing = null) {
  const vendor = vendorFor(body.vendorKey || body.vendor_key || body.vendor || body.provider || existing?.vendor_key);
  if (!vendor) throw new Error('Supported vendor is required.');
  const workspaceId = actorWorkspace(auth, body);
  const id = existing?.id || cleanId(body.id, 160) || randomId('kg13_sec');
  const label = cleanText(body.label || existing?.label || `${vendor.title} credential`, 160);
  const credential = credentialStringFromBody(vendor, body);
  const salt = base64Url(randomBytes(18));
  const aad = `key-gate-13th:${workspaceId}:${id}:${vendor.key}:v${(existing?.version || 0) + 1}`;
  const encrypted = await encryptPlaintext(env, credential.plaintext, aad);
  const fingerprint = await hmacHex(env, `${workspaceId}\n${vendor.key}\n${credential.plaintext}`);
  const saltedHash = await sha256Hex(`${salt}\n${vendor.key}\n${credential.plaintext}`);
  const createdAt = existing?.created_at || nowIso();
  const record = {
    id,
    workspace_id: workspaceId,
    vendor_key: vendor.key,
    vendor_title: vendor.title,
    label,
    credential_shape: vendor.credentialShape,
    credential_format: credential.format,
    status: 'active',
    encrypted,
    aad,
    fingerprint,
    salted_hash: saltedHash,
    salt,
    last4: safeLast4(credential.last4Source),
    scopes: unique(body.scopes || existing?.scopes || vendor.defaultScopes),
    grants: {
      apps: unique(body.allowedApps || body.allowed_apps || existing?.grants?.apps || ['key-gate-13th', 'agentic-growth-layer'])
    },
    metadata: redactDeep(body.metadata || existing?.metadata || {}),
    version: (existing?.version || 0) + 1,
    created_at: createdAt,
    updated_at: nowIso(),
    created_by: existing?.created_by || actorId(auth),
    updated_by: actorId(auth),
    last_used_at: existing?.last_used_at || null,
    use_count: existing?.use_count || 0,
    test_status: existing?.test_status || 'untested',
    test_receipt_id: existing?.test_receipt_id || null
  };
  return record;
}

function safeSecret(record) {
  if (!record) return null;
  return {
    id: record.id,
    workspace_id: record.workspace_id,
    vendor_key: record.vendor_key,
    vendor_title: record.vendor_title,
    label: record.label,
    credential_shape: record.credential_shape,
    status: record.status,
    last4: record.last4,
    scopes: record.scopes || [],
    grants: record.grants || { apps: [] },
    fingerprint_prefix: record.fingerprint ? record.fingerprint.slice(0, 16) : '',
    salted_hash_prefix: record.salted_hash ? record.salted_hash.slice(0, 16) : '',
    version: record.version || 1,
    created_at: record.created_at,
    updated_at: record.updated_at,
    last_used_at: record.last_used_at || null,
    use_count: record.use_count || 0,
    test_status: record.test_status || 'untested',
    test_receipt_id: record.test_receipt_id || null
  };
}

async function putSecret(env, record) {
  const kv = storage(env);
  if (!kv?.put) throw new Error('Key Gate 13th requires SITE_EVENTS_KV or KEY_GATE_13_KV storage.');
  await kv.put(secretKey(record.workspace_id, record.id), JSON.stringify(record), { expirationTtl: SECRET_TTL_SECONDS });
  return record;
}

async function readSecret(env, workspaceId, id) {
  const kv = storage(env);
  if (!kv?.get) return null;
  return kv.get(secretKey(workspaceId, id), { type: 'json' }).catch(() => null);
}

async function findSecret(env, workspaceId, id, auth) {
  const direct = await readSecret(env, workspaceId, id);
  if (direct) return direct;
  const kv = storage(env);
  if (!privileged(auth) || !kv?.list || !kv?.get) return null;
  const listed = await kv.list({ prefix: 'key-gate-13th:secret:', limit: 500 }).catch(() => ({ keys: [] }));
  for (const key of listed.keys || []) {
    if (!key.name.endsWith(`:${id}`)) continue;
    const item = await kv.get(key.name, { type: 'json' }).catch(() => null);
    if (item?.id === id) return item;
  }
  return null;
}

async function listSecrets(env, workspaceId) {
  const kv = storage(env);
  if (!kv?.list) return [];
  const listed = await kv.list({ prefix: `key-gate-13th:secret:${workspaceId}:`, limit: 200 }).catch(() => ({ keys: [] }));
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await kv.get(key.name, { type: 'json' }).catch(() => null);
    if (item) rows.push(item);
  }
  return rows.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

async function listAudit(env, workspaceId, secretId = '') {
  const kv = storage(env);
  if (!kv?.list) return [];
  const listed = await kv.list({ prefix: `key-gate-13th:audit:${workspaceId}:`, limit: 120 }).catch(() => ({ keys: [] }));
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await kv.get(key.name, { type: 'json' }).catch(() => null);
    if (item && (!secretId || item.secret_id === secretId)) rows.push(item);
  }
  return rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function parseCredential(record, plaintext) {
  let value = plaintext;
  if (record.credential_format === 'json') {
    value = JSON.parse(plaintext);
  } else if (record.vendor_key === 'dataforseo' && plaintext.includes(':')) {
    const [login, ...rest] = plaintext.split(':');
    value = { login, password: rest.join(':') };
  }
  return value;
}

function normalizeSecretRef(ref) {
  if (!ref) return { id: '' };
  if (typeof ref === 'object') {
    return {
      id: cleanId(ref.id || ref.secret_id || ref.secretId || ref.credential_id || ref.credentialId, 180),
      workspace_id: cleanId(ref.workspace_id || ref.workspaceId, 160),
      vendor_key: cleanId(ref.vendor_key || ref.vendorKey || ref.vendor, 80)
    };
  }
  return { id: cleanId(ref, 180) };
}

function assertRecordAccess(record, auth, workspaceId) {
  if (!record) throw new Error('Key Gate 13th credential was not found.');
  if (record.workspace_id !== workspaceId && !privileged(auth)) throw new Error('Credential belongs to a different workspace.');
  if (record.status !== 'active') throw new Error(`Credential is ${record.status || 'not active'}.`);
}

function assertGrant(record, appId) {
  const apps = unique(record.grants?.apps || []);
  if (apps.length && appId && !apps.includes(appId) && !apps.includes('*')) {
    throw new Error(`Credential is not granted to ${appId}.`);
  }
}

export async function resolveKeyGate13Credential(env, {
  auth,
  secretRef,
  credentialRef,
  vendorKey = '',
  workspaceId = '',
  appId = 'agentic-growth-layer',
  purpose = 'provider-call'
} = {}) {
  const ref = normalizeSecretRef(secretRef || credentialRef);
  if (!ref.id) return { ok: false, skipped: true, reason: 'missing_key_gate_13th_secret_ref' };
  const workspace = cleanId(workspaceId || ref.workspace_id || actorWorkspace(auth, {}), 160);
  const record = await readSecret(env, workspace, ref.id);
  assertRecordAccess(record, auth, workspace);
  if (vendorKey && record.vendor_key !== cleanId(vendorKey, 80)) {
    throw new Error(`Credential vendor mismatch. Expected ${vendorKey}, got ${record.vendor_key}.`);
  }
  if (ref.vendor_key && record.vendor_key !== ref.vendor_key) {
    throw new Error(`Credential ref vendor mismatch. Expected ${ref.vendor_key}, got ${record.vendor_key}.`);
  }
  assertGrant(record, appId);
  const plaintext = await decryptPlaintext(env, record.encrypted, record.aad);
  const credential = parseCredential(record, plaintext);
  record.last_used_at = nowIso();
  record.use_count = Number(record.use_count || 0) + 1;
  record.updated_at = record.last_used_at;
  await putSecret(env, record);
  await audit(env, null, auth, record.workspace_id, {
    type: 'key_gate_13th.secret.resolved',
    secret_id: record.id,
    vendor_key: record.vendor_key,
    status: 'resolved',
    metadata: { app_id: appId, purpose }
  });
  return {
    ok: true,
    credential,
    vendor_key: record.vendor_key,
    secret: safeSecret(record),
    credential_ref: { id: record.id, workspace_id: record.workspace_id, vendor_key: record.vendor_key }
  };
}

function credentialPresence(vendorKey, credential) {
  if (vendorKey === 'dataforseo') return Boolean(credential?.login && credential?.password);
  if (credential && typeof credential === 'object') {
    return Boolean(credential.apiKey || credential.api_key || credential.accessToken || credential.token || credential.secretKey);
  }
  return Boolean(cleanText(credential, 8000));
}

async function providerTest(vendorKey, credential, body = {}) {
  const live = body.live === true;
  if (!credentialPresence(vendorKey, credential)) {
    return { ok: false, live, status: 'failed', message: 'Credential shape is incomplete.' };
  }
  if (!live) {
    return { ok: true, live: false, status: 'offline-validated', message: 'Credential decrypted server-side and matches the expected provider shape.' };
  }
  if (vendorKey === 'cloudflare') {
    const token = typeof credential === 'object' ? (credential.token || credential.apiKey || credential.api_key) : credential;
    const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { authorization: `Bearer ${token}` }
    });
    return { ok: response.ok, live: true, status: response.status, provider: 'cloudflare', endpoint: '/client/v4/user/tokens/verify' };
  }
  if (vendorKey === 'stripe') {
    const key = typeof credential === 'object' ? (credential.secretKey || credential.apiKey || credential.api_key) : credential;
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: { authorization: `Bearer ${key}` }
    });
    return { ok: response.ok, live: true, status: response.status, provider: 'stripe', endpoint: '/v1/balance' };
  }
  if (vendorKey === 'semrush') {
    const key = typeof credential === 'object' ? (credential.apiKey || credential.api_key) : credential;
    const params = new URLSearchParams({
      type: 'domain_organic',
      key,
      domain: cleanText(body.domain || 'example.com', 180),
      database: cleanText(body.database || 'us', 20),
      display_limit: '1',
      export_columns: 'Ph,Po,Nq'
    });
    const response = await fetch(`https://api.semrush.com/?${params}`);
    const text = await response.text();
    return { ok: response.ok && !/^ERROR/i.test(text), live: true, status: response.status, provider: 'semrush', endpoint: 'domain_organic', bytes: text.length };
  }
  if (vendorKey === 'google-search-console') {
    const token = typeof credential === 'object' ? (credential.accessToken || credential.token) : credential;
    const siteUrl = cleanText(body.siteUrl || body.site_url || '', 240);
    if (!siteUrl) return { ok: true, live: false, status: 'offline-validated', message: 'GSC token decrypted. Add siteUrl for a live Search Analytics probe.' };
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 1 })
    });
    return { ok: response.ok, live: true, status: response.status, provider: 'google-search-console', endpoint: 'searchAnalytics/query' };
  }
  if (vendorKey === 'dataforseo') {
    return { ok: true, live: false, status: 'offline-validated', message: 'DataForSEO login/password decrypted. Live SERP probes run from Agentic Growth source pulls.' };
  }
  return { ok: true, live: false, status: 'offline-validated' };
}

function schemaResponse(base = '/api/key-gate-13th') {
  return {
    ok: true,
    product: 'Key Gate 13th',
    auth: 'FS27/SkyGate/Free99 shared gate only',
    storage: 'Encrypted provider-key custody using Worker WebCrypto AES-GCM plus HMAC/salted fingerprints.',
    raw_secret_policy: 'Accepted once on create/rotate, encrypted server-side, never returned by API responses, receipts, ledgers, or audits.',
    endpoints: {
      health: `GET ${base}/health`,
      schema: `GET ${base}/v1/schema`,
      vendors: `GET ${base}/v1/vendors`,
      listSecrets: `GET ${base}/v1/secrets`,
      createSecret: `POST ${base}/v1/secrets`,
      testSecret: `POST ${base}/v1/secrets/:id/test`,
      rotateSecret: `POST ${base}/v1/secrets/:id/rotate`,
      revokeSecret: `POST ${base}/v1/secrets/:id/revoke`,
      grants: `POST ${base}/v1/secrets/:id/grants`,
      audit: `GET ${base}/v1/audit`
    },
    createPayload: {
      vendorKey: 'semrush',
      label: 'Client SEMrush key',
      secret: 'accepted once, never returned',
      allowedApps: ['agentic-growth-layer'],
      scopes: ['agentic-growth:semrush']
    },
    dataForSeoPayload: {
      vendorKey: 'dataforseo',
      label: 'Client DataForSEO',
      credentials: { login: 'accepted once', password: 'accepted once' }
    },
    agenticGrowthBinding: {
      sourceConfig: {
        semrush: { credentialRef: 'kg13_sec_...' },
        dataForSeo: { credentialRef: 'kg13_sec_...' },
        gsc: { credentialRef: 'kg13_sec_...', siteUrl: 'sc-domain:example.com' }
      }
    }
  };
}

function healthResponse(base = '/api/key-gate-13th', env = {}) {
  return {
    ok: true,
    app_id: 'keyGate13th',
    app: 'Key Gate 13th',
    base,
    mounted: true,
    status: 'LIVE/GATED/FS27',
    auth_mode: 'fs27_shared_gate_only',
    no_app_passwords: true,
    encryption_configured: keyMaterial(env).length >= 16,
    fingerprint_configured: fingerprintMaterial(env).length >= 16,
    storage_configured: Boolean(storage(env)),
    route_families: KEY_GATE_13_ROUTE_FAMILIES,
    vendors: KEY_GATE_13_VENDORS.map(vendor => vendor.key),
    skyepay_lanes: ['agentic-growth-starter', 'agentic-growth-connected', 'agentic-growth-operator'],
    checked_at: nowIso()
  };
}

export async function handleKeyGate13Route(request, env, ctx, url, matchedBase = '/api/key-gate-13th', mount = {}, helpers = {}) {
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') return json({ ok: true });
  const auth = await helpers.requireGateAuth?.(request, env, 'Key Gate 13th runtime');
  if (!auth?.ok) return auth?.response || json({ ok: false, error: 'FS27 gate session required for Key Gate 13th.' }, 401);
  const suffix = url.pathname === matchedBase ? '/' : (url.pathname.slice(matchedBase.length) || '/');
  const parts = suffix.split('/').filter(Boolean);
  const workspaceId = actorWorkspace(auth, { workspace_id: url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || '' });

  if (method === 'GET' && (suffix === '/' || suffix === '/health')) {
    return json({ ...healthResponse(matchedBase, env), auth: { via: auth.via || 'fs27-gate', actor: actorId(auth), workspace_id: workspaceId } });
  }
  if (method === 'GET' && suffix === '/v1/schema') return json(schemaResponse(matchedBase));
  if (method === 'GET' && suffix === '/v1/vendors') return json({ ok: true, vendors: KEY_GATE_13_VENDORS });
  if (method === 'GET' && suffix === '/v1/secrets') {
    const rows = await listSecrets(env, workspaceId);
    return json({ ok: true, workspace_id: workspaceId, items: rows.map(safeSecret), count: rows.length });
  }
  if (method === 'GET' && suffix === '/v1/audit') {
    const secretId = cleanId(url.searchParams.get('secret_id') || url.searchParams.get('secretId') || '', 180);
    return json({ ok: true, workspace_id: workspaceId, items: await listAudit(env, workspaceId, secretId) });
  }
  if (method !== 'POST' && method !== 'DELETE') return json({ ok: false, error: 'method_not_allowed', route_families: KEY_GATE_13_ROUTE_FAMILIES }, 405);

  let body = {};
  try {
    body = method === 'DELETE' ? {} : await readJson(request);
  } catch (error) {
    return json({ ok: false, error: cleanText(error.message || 'Invalid JSON body.', 300) }, 400);
  }

  try {
    if (method === 'POST' && suffix === '/v1/secrets') {
      const record = await buildSecretRecord(env, auth, { ...body, workspace_id: body.workspace_id || workspaceId });
      await putSecret(env, record);
      const event = await audit(env, ctx, auth, record.workspace_id, {
        type: 'key_gate_13th.secret.created',
        secret_id: record.id,
        vendor_key: record.vendor_key,
        status: 'created',
        metadata: { label: record.label, scopes: record.scopes, grants: record.grants }
      });
      return json({ ok: true, secret: safeSecret(record), audit: event }, 201);
    }

    if (parts[0] === 'v1' && parts[1] === 'secrets' && parts[2]) {
      const id = cleanId(parts[2], 180);
      const operationWorkspaceId = actorWorkspace(auth, { workspace_id: body.workspace_id || body.workspaceId || workspaceId });
      const record = await findSecret(env, operationWorkspaceId, id, auth);
      if (!record) return json({ ok: false, error: 'secret_not_found' }, 404);
      assertRecordAccess(record, auth, record.workspace_id || operationWorkspaceId);

      if (method === 'DELETE' || parts[3] === 'revoke') {
        record.status = 'revoked';
        record.updated_at = nowIso();
        record.updated_by = actorId(auth);
        await putSecret(env, record);
        const event = await audit(env, ctx, auth, record.workspace_id, {
          type: 'key_gate_13th.secret.revoked',
          secret_id: record.id,
          vendor_key: record.vendor_key,
          status: 'revoked',
          metadata: { reason: cleanText(body.reason || 'operator_revoked', 240) }
        });
        return json({ ok: true, secret: safeSecret(record), audit: event });
      }

      if (parts[3] === 'rotate') {
        const rotated = await buildSecretRecord(env, auth, { ...body, workspace_id: record.workspace_id || operationWorkspaceId, vendorKey: record.vendor_key, label: body.label || record.label }, record);
        await putSecret(env, rotated);
        const event = await audit(env, ctx, auth, rotated.workspace_id, {
          type: 'key_gate_13th.secret.rotated',
          secret_id: rotated.id,
          vendor_key: rotated.vendor_key,
          status: 'rotated',
          metadata: { version: rotated.version, label: rotated.label }
        });
        return json({ ok: true, secret: safeSecret(rotated), audit: event });
      }

      if (parts[3] === 'grants') {
        record.grants = { apps: unique(body.allowedApps || body.allowed_apps || body.apps || record.grants?.apps || []) };
        record.scopes = unique(body.scopes || record.scopes || []);
        record.updated_at = nowIso();
        record.updated_by = actorId(auth);
        await putSecret(env, record);
        const event = await audit(env, ctx, auth, record.workspace_id, {
          type: 'key_gate_13th.secret.grants_updated',
          secret_id: record.id,
          vendor_key: record.vendor_key,
          status: 'grants_updated',
          metadata: { grants: record.grants, scopes: record.scopes }
        });
        return json({ ok: true, secret: safeSecret(record), audit: event });
      }

      if (parts[3] === 'test') {
        const resolved = await resolveKeyGate13Credential(env, {
          auth,
          secretRef: { id: record.id, workspace_id: record.workspace_id || operationWorkspaceId, vendor_key: record.vendor_key },
          appId: 'key-gate-13th',
          purpose: 'credential-test'
        });
        const testResult = await providerTest(record.vendor_key, resolved.credential, body);
        record.test_status = testResult.ok ? 'passed' : 'failed';
        record.test_receipt_id = randomId('kg13_test');
        record.updated_at = nowIso();
        await putSecret(env, record);
        const event = await audit(env, ctx, auth, record.workspace_id, {
          id: record.test_receipt_id,
          type: 'key_gate_13th.secret.tested',
          secret_id: record.id,
          vendor_key: record.vendor_key,
          status: record.test_status,
          metadata: testResult
        });
        return json({ ok: true, test: testResult, secret: safeSecret(record), audit: event });
      }
    }
  } catch (error) {
    const status = /required|missing|not found/i.test(error.message || '') ? 400 : 403;
    return json({ ok: false, error: cleanText(error.message || 'Key Gate 13th request failed.', 400) }, status);
  }

  return json({ ok: false, error: 'key_gate_13th_route_not_found', requested_path: url.pathname, base: matchedBase }, 404);
}
