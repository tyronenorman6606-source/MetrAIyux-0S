
import qrcodeFactory from "qrcode-generator";

const CORS = {
  'content-type':'application/json',
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'content-type,authorization,x-admin-session,x-override-session,x-idempotency-key,x-skygate-app,x-kaixu-app,x-kaixu-build,x-kaixu-request-id,x-0s-shared-gate,x-0s-internal-proxy-secret'
};
const routes = [
  {keys:['post','social','content','campaign','blog','seo','linkedin','instagram','facebook','twitter','x ','tiktok'], primary:'Valentina Reyes — Marketing & Brand Brain', secondary:'Victor Saint — QA Brain', task:'Draft content, run claims/brand review, queue social draft for approval.'},
  {keys:['lead','deal','prospect','proposal','close','pipeline','ae'], primary:'Celeste Monroe — Sales & AE Brain', secondary:'Marcus Vale — Operations Brain', task:'Qualify lead, create AE follow-up plan, update pipeline task.'},
  {keys:['client','onboard','renewal','complaint','escalation'], primary:'Adrian Cross — Client Success Brain', secondary:'Victor Saint — QA Brain', task:'Create client success action plan and escalation receipt.'},
  {keys:['candidate','resume','job order','placement','recruit'], primary:'Sienna Brooks — Staffing Brain', secondary:'Julian Mercer — Compliance Brain', task:'Create staffing placement checklist and compliance documentation task.'},
  {keys:['contract','legal','compliance','insurance','risk','incorporation'], primary:'Julian Mercer — Compliance Brain', secondary:'Gray London Skyes — Founder Command Brain', task:'Create risk note and professional escalation checklist.'},
  {keys:['cloudflare','worker','api','automation','brain','deploy','admin'], primary:'Orion Hayes — Technology Systems Brain', secondary:'Victor Saint — QA Brain', task:'Create deployment task, smoke test list, and proof receipt.'},
  {keys:['finance','invoice','budget','margin','payroll','forecast'], primary:'Naomi Sterling — Finance Brain', secondary:'Marcus Vale — Operations Brain', task:'Create finance review packet and approval note.'},
  {keys:['government','sam','procurement','bid','capability','contracting'], primary:'Donovan Pierce — Government & Enterprise Brain', secondary:'Julian Mercer — Compliance Brain', task:'Create government readiness packet.'},
  {keys:['vendor','partner','subcontractor','referral'], primary:'Helena Ward — Partnerships Brain', secondary:'Julian Mercer — Compliance Brain', task:'Create vendor/partner intake and risk scorecard.'},
  {keys:['quality','qa','proof','claim','audit','test','receipt'], primary:'Victor Saint — Quality Assurance Brain', secondary:'Gray London Skyes — Founder Command Brain', task:'Create QA proof receipt and public claims review.'},
  {keys:['expand','innovation','new product','automation idea','ai workflow'], primary:'Amara Voss — Expansion & Innovation Brain', secondary:'Orion Hayes — Technology Brain', task:'Create innovation pilot brief and risk/cost review.'}
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
const OVERRIDE_SESSION_TTL_SECONDS = 30 * 60;
const CONNECTOR_DEFINITIONS = {
  crm: {
    label: 'CRM',
    urlVars: ['CRM_CONNECTOR_URL', 'CRM_WEBHOOK_URL'],
    tokenVars: ['CRM_CONNECTOR_TOKEN', 'CRM_API_TOKEN'],
    providerVar: 'CRM_CONNECTOR_PROVIDER',
    defaultActions: ['crm.lead.upsert', 'crm.deal.note', 'crm.follow_up.create']
  },
  social_dispatch: {
    label: 'Social dispatch',
    urlVars: ['SOCIAL_DISPATCH_WEBHOOK', 'SOCIAL_CONNECTOR_URL'],
    tokenVars: ['SOCIAL_DISPATCH_TOKEN', 'SOCIAL_CONNECTOR_TOKEN'],
    providerVar: 'SOCIAL_CONNECTOR_PROVIDER',
    approvalAlways: true,
    defaultActions: ['social.publish', 'social.schedule']
  },
  project_management: {
    label: 'Project management',
    urlVars: ['PROJECT_MANAGEMENT_CONNECTOR_URL', 'PROJECT_CONNECTOR_URL', 'PM_CONNECTOR_URL'],
    tokenVars: ['PROJECT_MANAGEMENT_CONNECTOR_TOKEN', 'PROJECT_CONNECTOR_TOKEN', 'PM_CONNECTOR_TOKEN'],
    providerVar: 'PROJECT_MANAGEMENT_CONNECTOR_PROVIDER',
    defaultActions: ['project.task.create', 'project.comment.create']
  },
  payroll: {
    label: 'Payroll',
    urlVars: ['PAYROLL_CONNECTOR_URL', 'PAYROLL_WEBHOOK_URL'],
    tokenVars: ['PAYROLL_CONNECTOR_TOKEN', 'PAYROLL_API_TOKEN'],
    providerVar: 'PAYROLL_CONNECTOR_PROVIDER',
    approvalAlways: true,
    defaultActions: ['payroll.review_packet', 'payroll.timesheet.queue']
  },
  content_publish: {
    label: 'Content publish',
    urlVars: ['CONTENT_PUBLISH_WEBHOOK', 'PERSONAL_SITE_WEBHOOK', 'MARKETING_SITE_WEBHOOK'],
    tokenVars: ['CONTENT_PUBLISH_TOKEN', 'PERSONAL_SITE_TOKEN', 'MARKETING_SITE_TOKEN'],
    providerVar: 'CONTENT_PUBLISH_PROVIDER',
    approvalAlways: true,
    defaultActions: ['content.site.upsert', 'content.marketing.update', 'content.email.package']
  },
  local_brain_update: {
    label: 'Local brain update',
    urlVars: ['LOCAL_BRAIN_UPDATE_WEBHOOK', 'LOCAL_BRAIN_WEBHOOK'],
    tokenVars: ['LOCAL_BRAIN_UPDATE_TOKEN', 'LOCAL_BRAIN_TOKEN'],
    providerVar: 'LOCAL_BRAIN_UPDATE_PROVIDER',
    approvalAlways: true,
    defaultActions: ['content.local_brain.chunk.upsert']
  },
  repository_update: {
    label: 'Repository content update',
    urlVars: ['CONTENT_REPOSITORY_WEBHOOK', 'GITHUB_CONTENT_REPOSITORY_WEBHOOK'],
    tokenVars: ['CONTENT_REPOSITORY_TOKEN', 'GITHUB_CONTENT_REPOSITORY_TOKEN'],
    providerVar: 'CONTENT_REPOSITORY_PROVIDER',
    approvalAlways: true,
    defaultActions: ['content.repository.commit']
  }
};

const SECRET_TARGETS = {
  ADMIN_TOKEN: {
    label: 'Admin bearer token',
    envName: 'ADMIN_TOKEN',
    scriptVar: 'ADMIN_WORKER_SCRIPT_NAME',
    defaultScript: 'admin-automation-brain',
    generator: 'strong_token',
    rotationDays: 30
  },
  RESEND_API_KEY: {
    label: 'Resend API key',
    envName: 'RESEND_API_KEY',
    scriptVar: 'ADMIN_WORKER_SCRIPT_NAME',
    defaultScript: 'admin-automation-brain',
    externalValueRequired: true,
    rotationDays: 60
  },
  STRIPE_SECRET: {
    label: 'Stripe secret key',
    envName: 'STRIPE_SECRET',
    scriptVar: 'SAAS_WORKER_SCRIPT_NAME',
    defaultScript: 'sovereign-saas-provisioning-worker',
    externalValueRequired: true,
    rotationDays: 60
  },
  STRIPE_SECRET_KEY: {
    label: 'Stripe secret key',
    envName: 'STRIPE_SECRET_KEY',
    scriptVar: 'SAAS_WORKER_SCRIPT_NAME',
    defaultScript: 'sovereign-saas-provisioning-worker',
    externalValueRequired: true,
    rotationDays: 60
  }
};

function boolEnv(value){
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

function randomBytes(length){
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes){
  return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

function bytesToBase64(bytes){
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}

function stringToBase64(value){
  return bytesToBase64(encoder.encode(String(value ?? '')));
}

function base64ToBytes(value){
  const raw = atob(String(value || ''));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function base32Encode(bytes){
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += alphabet[parseInt(chunk, 2)];
  }
  return out;
}

function normalizeBase32(value){
  return String(value || '').toUpperCase().replace(/[\s=-]/g, '');
}

function base32ToBytes(base32){
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = normalizeBase32(base32);
  let bits = '';
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value === -1) throw new Error('Invalid base32 secret.');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

async function sha256Hex(value){
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(String(value || '')))));
}

async function hmacHex(secret, value){
  const key = await crypto.subtle.importKey('raw', encoder.encode(String(secret || '')), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(String(value || '')))));
}

function constantTimeEqual(left, right){
  const a = String(left || '');
  const b = String(right || '');
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function strongToken(prefix='skye'){
  return `${prefix}_${bytesToHex(randomBytes(32))}`;
}

function safeJsonParse(value, fallback=null){
  try { return JSON.parse(value); } catch { return fallback; }
}

function envValue(env, keys){
  for (const key of keys) {
    const value = env[key];
    if (value) return String(value);
  }
  return '';
}

async function kvPutJson(env, key, value, options){
  if (!env.ADMIN_KV) return false;
  await env.ADMIN_KV.put(key, JSON.stringify(value), options);
  return true;
}

async function kvGetJson(env, key){
  if (!env.ADMIN_KV) return null;
  return env.ADMIN_KV.get(key, 'json');
}

async function kvListJson(env, prefix, limit=200){
  if (!env.ADMIN_KV) return [];
  const list = await env.ADMIN_KV.list({prefix, limit});
  const rows = [];
  for (const key of list.keys) {
    const row = await env.ADMIN_KV.get(key.name, 'json');
    if (row) rows.push(row);
  }
  return rows;
}

async function safeDbRun(env, sql, bindings=[]){
  if (!env.ADMIN_DB) return {ok:false, skipped:true, reason:'ADMIN_DB_not_bound'};
  try {
    await env.ADMIN_DB.prepare(sql).bind(...bindings).run();
    return {ok:true};
  } catch (error) {
    return {ok:false, error:error?.message || String(error)};
  }
}

async function safeDbAll(env, sql, bindings=[]){
  if (!env.ADMIN_DB) return [];
  try {
    const rows = await env.ADMIN_DB.prepare(sql).bind(...bindings).all();
    return rows.results || [];
  } catch {
    return [];
  }
}

function bearer(request){
  const hdr = request.headers.get('authorization') || '';
  return hdr.replace(/^Bearer\s+/i,'').trim();
}
function skygateOrigin(env){
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || '').replace(/\/+$/,'');
}
function internalProxySecret(env){
  return String(env.ZERO_OS_INTERNAL_PROXY_SECRET || env.METRAIYUX_0S_INTERNAL_PROXY_SECRET || env.ADMIN_AUTOMATION_INTERNAL_PROXY_SECRET || '').trim();
}
function sharedGateProxyAuth(request, env){
  const expected = internalProxySecret(env);
  if (!expected) return false;
  return String(request.headers.get('x-0s-shared-gate') || '').toLowerCase() === 'operator'
    && String(request.headers.get('x-0s-internal-proxy-secret') || '').trim() === expected;
}
function scopeList(scope){
  if (Array.isArray(scope)) return scope.map(String);
  return String(scope || '').split(/\s+/).filter(Boolean);
}
function emailAllowlist(env){
  return String(env.SKYGATE_ADMIN_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
}
function allowsAdminGate(claims, env){
  if (!claims?.active) return false;
  const role = String(claims.role || '').toLowerCase();
  const scopes = new Set(scopeList(claims.scope).map(x=>x.toLowerCase()));
  const email = String(claims.email || claims.username || '').toLowerCase();
  const allowedEmails = emailAllowlist(env);
  return ['founder','owner','admin'].includes(role)
    || scopes.has('admin.write')
    || scopes.has('admin.read')
    || scopes.has('keys.write')
    || (allowedEmails.length && allowedEmails.includes(email));
}
async function introspectSkygate(token, env){
  const origin = skygateOrigin(env);
  if (!origin && !env.SKYGATE_WORKER) return {ok:false, error:'SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is not configured on this Worker.'};
  if (!token) return {ok:false, error:'Missing Authorization bearer token.'};
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const path of paths) {
    let res;
    if (env.SKYGATE_WORKER) {
      // Service binding avoids Worker-to-Worker URL routing issues with run_worker_first
      res = await env.SKYGATE_WORKER.fetch(new Request(`https://skygate-internal${path}`, {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({token})
      }));
    } else {
      res = await fetch(`${origin}${path}`, {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({token})
      });
    }
    const data = await res.json().catch(()=>({active:false, error:'Invalid Skyegate response'}));
    last = {res, data, path};
    if (res.status === 404) continue;
    if (!res.ok) return {ok:false, error:data.error || `Skyegate introspection returned ${res.status}`, skygate:data, path};
    if (!data.active) return {ok:false, error:data.error || 'Skyegate token is inactive or invalid.', skygate:data, path};
    if (!allowsAdminGate(data, env)) return {ok:false, error:'Skyegate token is active but not admin-scoped for MetrAIyux 0S.', skygate:data, path};
    return {ok:true, via:'skygate', skygate:data, actor:data.email || data.username || data.sub || 'skygate-admin', path};
  }
  return {ok:false, error:last ? `Skyegate introspection endpoint was not found at ${origin || 'service-binding'}.` : 'Skyegate introspection did not run.'};
}
async function primaryAuth(request, env){
  const token = bearer(request);
  if (sharedGateProxyAuth(request, env)) return {ok:true, via:'zero_os_shared_gate_proxy', actor:'0s-shared-gate'};
  if (env.SKYGATE_WORKER || skygateOrigin(env)) return introspectSkygate(token, env);
  if (env.ADMIN_TOKEN && token && token === env.ADMIN_TOKEN) return {ok:true, via:'legacy_admin_token', actor:'legacy-admin'};
  if (!env.ADMIN_TOKEN) return {ok:false, error:'Neither ADMIN_TOKEN nor SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is configured on this Worker.'};
  return {ok:false, error:'Unauthorized admin request.'};
}

function encryptionSecret(env){
  return String(env.ADMIN_MFA_ENCRYPTION_KEY || env.ADMIN_SECURITY_ENCRYPTION_KEY || env.SECURITY_ENCRYPTION_KEY || '').trim();
}

async function aesKey(env){
  const secret = encryptionSecret(env);
  if (!secret) throw new Error('ADMIN_MFA_ENCRYPTION_KEY is required for encrypted MFA storage.');
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
}

async function encryptJson(env, value){
  const iv = randomBytes(12);
  const key = await aesKey(env);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, encoder.encode(JSON.stringify(value))));
  return {v:1, alg:'AES-GCM', iv:bytesToBase64(iv), ciphertext:bytesToBase64(ciphertext)};
}

async function decryptJson(env, envelope){
  const data = typeof envelope === 'string' ? safeJsonParse(envelope) : envelope;
  if (!data?.iv || !data?.ciphertext) throw new Error('Invalid encrypted envelope.');
  const key = await aesKey(env);
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv:base64ToBytes(data.iv)}, key, base64ToBytes(data.ciphertext));
  return JSON.parse(decoder.decode(plaintext));
}

function backupPepper(env){
  return String(env.ADMIN_BACKUP_CODE_PEPPER || env.ADMIN_MFA_ENCRYPTION_KEY || env.ADMIN_SECURITY_ENCRYPTION_KEY || '').trim();
}

async function getTotpKey(secret, algorithm='SHA-1'){
  return crypto.subtle.importKey('raw', base32ToBytes(secret), {name:'HMAC', hash:{name:algorithm}}, false, ['sign']);
}

async function generateTotp(secret, {period=30, digits=6, algorithm='SHA-1', timestamp=Date.now()}={}){
  const counter = Math.floor(timestamp / 1000 / period);
  const key = await getTotpKey(secret, algorithm);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary = ((signature[offset] & 0x7f) << 24)
    | ((signature[offset + 1] & 0xff) << 16)
    | ((signature[offset + 2] & 0xff) << 8)
    | (signature[offset + 3] & 0xff);
  return String(binary % (10 ** digits)).padStart(digits, '0');
}

async function verifyTotp(secret, code, options={}){
  const clean = String(code || '').replace(/\s+/g, '');
  const digits = Number(options.digits || 6);
  if (!new RegExp(`^\\d{${digits}}$`).test(clean)) return false;
  const period = Number(options.period || 30);
  const windowSize = Number(options.window || 1);
  const nowTs = Date.now();
  for (let skew = -windowSize; skew <= windowSize; skew += 1) {
    const expected = await generateTotp(secret, {...options, period, digits, timestamp:nowTs + (skew * period * 1000)});
    if (constantTimeEqual(expected, clean)) return true;
  }
  return false;
}

function otpAuthUri({issuer='MetrAIyux 0S', account='admin', secret, digits=6, period=30, algorithm='SHA1'}){
  const label = `${issuer}:${account}`;
  const params = new URLSearchParams({secret, issuer, algorithm, digits:String(digits), period:String(period)});
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function qrSvg(data){
  const qr = qrcodeFactory(0, 'M');
  qr.addData(data);
  qr.make();
  return qr.createSvgTag({cellSize:5, margin:4, scalable:true, alt:'MetrAIyux 0S authenticator QR code'});
}

async function listMfaDevices(env){
  const dbRows = await safeDbAll(env, 'select id,label,account_name,issuer,status,digits,period,algorithm,encrypted_secret,created_at,verified_at,last_used_at from admin_mfa_devices order by created_at desc');
  if (dbRows.length) return dbRows.map(row => ({...row, encrypted_secret:safeJsonParse(row.encrypted_secret, row.encrypted_secret)}));
  return kvListJson(env, 'mfa_device:');
}

async function getMfaDevice(env, id){
  const rows = await safeDbAll(env, 'select id,label,account_name,issuer,status,digits,period,algorithm,encrypted_secret,created_at,verified_at,last_used_at from admin_mfa_devices where id=?1 limit 1', [id]);
  if (rows[0]) return {...rows[0], encrypted_secret:safeJsonParse(rows[0].encrypted_secret, rows[0].encrypted_secret)};
  return kvGetJson(env, `mfa_device:${id}`);
}

async function putMfaDevice(env, device){
  await kvPutJson(env, `mfa_device:${device.id}`, device);
  await safeDbRun(env, `insert into admin_mfa_devices
    (id,label,account_name,issuer,status,digits,period,algorithm,encrypted_secret,created_at,verified_at,last_used_at)
    values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
    on conflict(id) do update set label=excluded.label, account_name=excluded.account_name, issuer=excluded.issuer,
    status=excluded.status, digits=excluded.digits, period=excluded.period, algorithm=excluded.algorithm,
    encrypted_secret=excluded.encrypted_secret, verified_at=excluded.verified_at, last_used_at=excluded.last_used_at`,
    [device.id, device.label, device.account_name, device.issuer, device.status, device.digits, device.period, device.algorithm, JSON.stringify(device.encrypted_secret), device.created_at, device.verified_at || null, device.last_used_at || null]);
  return device;
}

async function activeMfaDevices(env){
  return (await listMfaDevices(env)).filter(device => device.status === 'active');
}

async function createAdminSession(env, actor, kind='mfa', ttlSeconds=ADMIN_SESSION_TTL_SECONDS){
  const token = strongToken(kind === 'override' ? 'override' : 'mfa');
  const token_hash = await sha256Hex(token);
  const nowIso = new Date().toISOString();
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const session = {id:crypto.randomUUID(), token_hash, actor, kind, status:'active', created_at:nowIso, expires_at:expires};
  await kvPutJson(env, `admin_session:${token_hash}`, session, {expirationTtl: ttlSeconds});
  await safeDbRun(env, `insert into admin_security_sessions (id,token_hash,actor,kind,status,created_at,expires_at)
    values (?1,?2,?3,?4,?5,?6,?7)`, [session.id, token_hash, actor, kind, session.status, session.created_at, session.expires_at]);
  return {token, session:{id:session.id, actor, kind, expires_at:expires}};
}

async function validateAdminSession(env, token){
  if (!token) return {ok:false, error:'Missing MFA/override session.'};
  const token_hash = await sha256Hex(token);
  let session = await kvGetJson(env, `admin_session:${token_hash}`);
  if (!session) {
    const rows = await safeDbAll(env, 'select id,token_hash,actor,kind,status,created_at,expires_at from admin_security_sessions where token_hash=?1 limit 1', [token_hash]);
    session = rows[0] || null;
  }
  if (!session || session.status !== 'active') return {ok:false, error:'Admin security session is not active.'};
  if (new Date(session.expires_at).getTime() <= Date.now()) return {ok:false, error:'Admin security session expired.'};
  return {ok:true, session};
}

async function sessionFromRequest(request, env){
  const token = request.headers.get('x-admin-session') || request.headers.get('x-override-session') || '';
  return validateAdminSession(env, token.trim());
}

async function auth(request, env, options={}){
  const primary = await primaryAuth(request, env);
  if (!primary.ok) return primary;
  if (options.skipMfa) return primary;
  const requireMfa = boolEnv(env.ADMIN_MFA_REQUIRED);
  if (!requireMfa) return primary;
  const session = await sessionFromRequest(request, env);
  if (!session.ok) return {...session, mfa_required:true, primary};
  return {...primary, mfa_session:session.session};
}
function classify(message){
  const m = String(message || '').toLowerCase();
  let best = null, score = -1;
  for (const r of routes){
    const s = r.keys.reduce((n,k)=> n + (m.includes(k) ? (k.length > 5 ? 4 : 2) : 0), 0);
    if (s > score){ score = s; best = r; }
  }
  if (!best || score <= 0) best = {primary:'Central Company Command Brain', secondary:'Site Operator Brain', task:'Clarify business objective, split into cabinet tasks, and create operator approval plan.'};
  const approval_required = /(publish|post|send|email|contract|payment|hire|fire|legal|tax|file|incorporat|price|refund|public claim|bind|signature)/i.test(message);
  const social_intent = /(post|publish|social|linkedin|facebook|instagram|twitter|x |tiktok|campaign|content)/i.test(message);
  return {...best, approval_required, social_intent};
}
async function log(env, type, payload){
  const row = { id: crypto.randomUUID(), type, payload, created_at: new Date().toISOString() };
  if (env.ADMIN_KV) await env.ADMIN_KV.put(`${type}:${row.id}`, JSON.stringify(row));
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into audit_log (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(row.id,type,JSON.stringify(payload),row.created_at).run();
  return row;
}
function mirrorSecret(env){
  return String(env.SKYGATE_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET || '').trim();
}
async function mirrorPlatformEvent(env, type, meta={}, authContext=null){
  const origin = skygateOrigin(env);
  const secret = mirrorSecret(env);
  if (!origin || !secret) return {ok:false, skipped:true, reason:'Skyegate origin or mirror secret is not configured.'};
  const actor = authContext?.skygate?.email || authContext?.skygate?.username || authContext?.actor || 'metraiyux-admin';
  const body = {
    source_app: env.SKYGATE_SOURCE_APP || 'metraiyux-0s',
    actor,
    org_id: authContext?.skygate?.org || authContext?.skygate?.customer_id || null,
    ws_id: meta?.workspace_id || meta?.item_id || meta?.receipt_id || null,
    type,
    event_ts: new Date().toISOString(),
    meta
  };
  const res = await fetch(`${origin}/platform/events`, {
    method:'POST',
    headers:{'content-type':'application/json','x-skygate-mirror-secret':secret},
    body:JSON.stringify(body)
  });
  const data = await res.json().catch(()=>({ok:false, status:res.status}));
  return {ok:res.ok, status:res.status, data};
}
async function createTask(env, title, owner, payload){
  const task = { id: crypto.randomUUID(), title, owner, status:'queued_admin_review', payload, created_at:new Date().toISOString() };
  if (env.ADMIN_KV) await env.ADMIN_KV.put(`task:${task.id}`, JSON.stringify(task));
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into brain_tasks (id,title,owner,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(task.id,task.title,task.owner,task.status,JSON.stringify(payload),task.created_at).run();
  if (env.ADMIN_QUEUE) await env.ADMIN_QUEUE.send({kind:'brain_task', task});
  return task;
}

function connectorConfig(env, type){
  const def = CONNECTOR_DEFINITIONS[type];
  if (!def) return null;
  const url = envValue(env, def.urlVars);
  const token = envValue(env, def.tokenVars);
  const githubRepo = githubRepositoryConfig(env);
  return {
    type,
    label:def.label,
    provider:String(env[def.providerVar] || (type === 'repository_update' && githubRepo.configured ? 'github_contents_api' : (url ? 'webhook' : 'not_configured'))),
    configured:Boolean(url) || (type === 'repository_update' && githubRepo.configured),
    endpoint_configured:Boolean(url),
    token_configured:Boolean(token),
    github_configured:type === 'repository_update' ? githubRepo.configured : false,
    approval_always:Boolean(def.approvalAlways),
    default_actions:def.defaultActions,
    url,
    token
  };
}

function publicConnectorConfig(config){
  if (!config) return null;
  const {url, token, ...safe} = config;
  return {...safe, url_configured:Boolean(url), token_configured:Boolean(token)};
}

function allConnectorStatus(env){
  return Object.keys(CONNECTOR_DEFINITIONS).map(type => publicConnectorConfig(connectorConfig(env, type)));
}

function githubRepositoryConfig(env){
  const combined = String(env.GITHUB_CONTENT_REPO || env.CONTENT_REPOSITORY_GITHUB_REPO || '').trim();
  const [combinedOwner, combinedRepo] = combined.includes('/') ? combined.split('/', 2) : ['', ''];
  const owner = String(env.GITHUB_CONTENT_OWNER || env.CONTENT_REPOSITORY_OWNER || combinedOwner || '').trim();
  const repo = String(env.GITHUB_CONTENT_REPO_NAME || env.CONTENT_REPOSITORY_REPO || combinedRepo || '').trim();
  const branch = String(env.GITHUB_CONTENT_BRANCH || env.CONTENT_REPOSITORY_BRANCH || 'main').trim();
  const token = String(env.GITHUB_CONTENT_TOKEN || env.CONTENT_REPOSITORY_GITHUB_TOKEN || env.GITHUB_TOKEN || '').trim();
  return {owner, repo, branch, token, configured:Boolean(owner && repo && token)};
}

function connectorApprovalRequired(type, action, payload={}){
  const def = CONNECTOR_DEFINITIONS[type];
  const text = `${action || ''} ${JSON.stringify(payload || {})}`;
  return Boolean(def?.approvalAlways)
    || Boolean(payload.approval_required || payload.requires_approval)
    || /(payroll|payment|publish|post|send|contract|signature|legal|tax|hire|fire|price|pricing|public claim|refund)/i.test(text);
}

function inferConnectorEvents(message, route, receipt){
  const text = String(message || '');
  const events = [];
  if (route?.social_intent || /(post|publish|social|linkedin|facebook|instagram|twitter|tiktok|campaign)/i.test(text)) {
    events.push({connector_type:'social_dispatch', action:'social.publish', payload:{content:text, platform:'generic', source:'brain_chat'}});
  }
  if (/(lead|deal|prospect|proposal|pipeline|crm|follow[- ]?up|client intake)/i.test(text)) {
    events.push({connector_type:'crm', action:'crm.lead.upsert', payload:{summary:text, source:'brain_chat', route}});
  }
  if (/(project|task|ticket|asana|linear|jira|pm|milestone|sprint)/i.test(text)) {
    events.push({connector_type:'project_management', action:'project.task.create', payload:{title:route?.task || 'Admin automation task', description:text, source:'brain_chat', route}});
  }
  if (/(payroll|timesheet|commission|wage|salary|pay run|contractor pay)/i.test(text)) {
    events.push({connector_type:'payroll', action:'payroll.review_packet', payload:{summary:text, source:'brain_chat', route}});
  }
  return events.map(event => ({
    ...event,
    item_id: receipt?.id || null,
    approval_required: connectorApprovalRequired(event.connector_type, event.action, event.payload) || Boolean(route?.approval_required),
    source_receipt_id: receipt?.id || null
  }));
}

async function persistConnectorEvent(env, event){
  await kvPutJson(env, `connector_event:${event.id}`, event);
  if (event.item_id) await kvPutJson(env, `connector_event_index:${event.item_id}:${event.id}`, {item_id:event.item_id, event_id:event.id});
  await safeDbRun(env, `insert into connector_events
    (id,item_id,connector_type,action,status,approval_required,attempts,max_attempts,payload,last_error,created_at,updated_at,dispatched_at)
    values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
    on conflict(id) do update set status=excluded.status, attempts=excluded.attempts, payload=excluded.payload,
    last_error=excluded.last_error, updated_at=excluded.updated_at, dispatched_at=excluded.dispatched_at`,
    [event.id, event.item_id || null, event.connector_type, event.action, event.status, event.approval_required ? 1 : 0, event.attempts || 0, event.max_attempts || 3, JSON.stringify(event.payload || {}), event.last_error || null, event.created_at, event.updated_at, event.dispatched_at || null]);
  return event;
}

async function createConnectorEvent(env, input){
  const nowIso = new Date().toISOString();
  const event = {
    id: input.id || crypto.randomUUID(),
    item_id: input.item_id || input.source_receipt_id || null,
    connector_type: input.connector_type || input.type,
    action: input.action || 'connector.event',
    status: input.approval_required ? 'waiting_approval' : 'queued_dispatch',
    approval_required: Boolean(input.approval_required),
    attempts:0,
    max_attempts:Number(input.max_attempts || 3),
    payload: input.payload || {},
    source_receipt_id: input.source_receipt_id || input.item_id || null,
    created_at: nowIso,
    updated_at: nowIso
  };
  await persistConnectorEvent(env, event);
  await log(env, 'connector_event_created', {event_id:event.id, item_id:event.item_id, connector_type:event.connector_type, action:event.action, status:event.status, approval_required:event.approval_required});
  if (env.ADMIN_QUEUE) await env.ADMIN_QUEUE.send({kind:'connector_event', event_id:event.id});
  return event;
}

async function getConnectorEvent(env, id){
  const kv = await kvGetJson(env, `connector_event:${id}`);
  if (kv) return kv;
  const rows = await safeDbAll(env, 'select * from connector_events where id=?1 limit 1', [id]);
  if (!rows[0]) return null;
  return {...rows[0], approval_required:Boolean(rows[0].approval_required), payload:safeJsonParse(rows[0].payload, {})};
}

async function connectorEventsForItem(env, itemId){
  if (!itemId) return [];
  const rows = await safeDbAll(env, 'select * from connector_events where item_id=?1 or id=?1 order by created_at desc limit 50', [itemId]);
  if (rows.length) return rows.map(row => ({...row, approval_required:Boolean(row.approval_required), payload:safeJsonParse(row.payload, {})}));
  const direct = await getConnectorEvent(env, itemId);
  const indexed = await kvListJson(env, `connector_event_index:${itemId}:`);
  const events = [];
  if (direct) events.push(direct);
  for (const idx of indexed) {
    const event = await getConnectorEvent(env, idx.event_id);
    if (event) events.push(event);
  }
  return events.filter((event, index, arr) => arr.findIndex(x => x.id === event.id) === index);
}

async function listConnectorEvents(env){
  const rows = await safeDbAll(env, 'select * from connector_events order by created_at desc limit 200');
  if (rows.length) return rows.map(row => ({...row, approval_required:Boolean(row.approval_required), payload:safeJsonParse(row.payload, {})}));
  return kvListJson(env, 'connector_event:', 200);
}

async function hasApproval(env, itemId){
  if (!itemId) return false;
  const rows = await safeDbAll(env, "select id from approvals where item_id=?1 and decision in ('approved','override_approved') limit 1", [itemId]);
  if (rows.length) return true;
  const approvals = await kvListJson(env, 'approval:', 500);
  return approvals.some(approval => approval.item_id === itemId && ['approved','override_approved'].includes(approval.decision));
}

function connectorDispatchPayload(event, authContext=null){
  return {
    schema:'metraiyux.connector_event.v1',
    id:event.id,
    item_id:event.item_id || null,
    connector_type:event.connector_type,
    action:event.action,
    actor:authContext?.actor || authContext?.skygate?.email || 'metraiyux-0s',
    payload:event.payload || {},
    created_at:event.created_at,
    dispatched_at:new Date().toISOString()
  };
}

async function dispatchGithubRepositoryUpdate(env, event, authContext=null){
  const config = githubRepositoryConfig(env);
  if (!config.configured) return {ok:false, blocked:true, reason:'github_repository_not_configured'};
  const files = Array.isArray(event.payload?.files) ? event.payload.files : [];
  if (!files.length) return {ok:false, error:'repository_update_requires_files'};
  const actor = authContext?.actor || authContext?.skygate?.email || 'metraiyux-0s';
  const results = [];
  for (const file of files) {
    const filePath = String(file.path || '').replace(/^\/+/, '');
    const content = String(file.content ?? '');
    if (!filePath || !content) {
      results.push({path:filePath, ok:false, error:'file_path_and_content_required'});
      continue;
    }
    const baseUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`;
    const headers = {
      authorization:`Bearer ${config.token}`,
      accept:'application/vnd.github+json',
      'content-type':'application/json',
      'user-agent':'metraiyux-0s-content-engine'
    };
    let sha = null;
    const current = await fetch(`${baseUrl}?ref=${encodeURIComponent(config.branch)}`, {headers});
    if (current.ok) {
      const data = await current.json().catch(()=>({}));
      sha = data.sha || null;
    } else if (current.status !== 404) {
      const errorText = await current.text().catch(()=> '');
      results.push({path:filePath, ok:false, status:current.status, error:errorText.slice(0, 500)});
      continue;
    }
    const body = {
      message:file.message || event.payload?.commit_message || `MetrAIyux content engine update: ${event.payload?.article_slug || event.id}`,
      content:stringToBase64(content),
      branch:config.branch,
      committer:event.payload?.committer || undefined,
      author:event.payload?.author || undefined,
      sha:sha || undefined
    };
    const res = await fetch(baseUrl, {method:'PUT', headers, body:JSON.stringify(body)});
    const data = await res.json().catch(async()=>({raw:await res.text().catch(()=> '')}));
    results.push({path:filePath, ok:res.ok, status:res.status, sha:data.content?.sha || null, commit:data.commit?.sha || null, data:res.ok ? undefined : data});
  }
  const ok = results.every(result => result.ok);
  await log(env, ok ? 'github_repository_update' : 'github_repository_update_failed', {event_id:event.id, actor, owner:config.owner, repo:config.repo, branch:config.branch, results});
  return {ok, provider:'github_contents_api', results};
}

async function dispatchConnectorEvent(env, eventOrId, authContext=null){
  const event = typeof eventOrId === 'string' ? await getConnectorEvent(env, eventOrId) : eventOrId;
  if (!event) return {ok:false, error:'connector_event_not_found'};
  const config = connectorConfig(env, event.connector_type);
  if (!config) {
    event.status = 'failed';
    event.last_error = `Unknown connector type: ${event.connector_type}`;
    event.updated_at = new Date().toISOString();
    await persistConnectorEvent(env, event);
    return {ok:false, error:event.last_error, event};
  }
  if (event.approval_required && !(await hasApproval(env, event.item_id || event.id))) {
    event.status = 'waiting_approval';
    event.updated_at = new Date().toISOString();
    await persistConnectorEvent(env, event);
    return {ok:false, blocked:true, reason:'approval_required', event};
  }
  if (event.connector_type === 'repository_update' && githubRepositoryConfig(env).configured) {
    event.attempts = Number(event.attempts || 0) + 1;
    event.status = 'dispatching';
    event.updated_at = new Date().toISOString();
    await persistConnectorEvent(env, event);
    const result = await dispatchGithubRepositoryUpdate(env, event, authContext);
    event.status = result.ok ? 'dispatched' : (event.attempts < event.max_attempts ? 'retry_pending' : 'failed');
    event.last_error = result.ok ? null : (result.error || result.reason || JSON.stringify(result).slice(0, 1000));
    event.dispatch_response = result;
    event.dispatched_at = result.ok ? new Date().toISOString() : null;
    event.updated_at = new Date().toISOString();
    await persistConnectorEvent(env, event);
    return {ok:result.ok, status:result.ok ? 200 : 409, event, response:result};
  }
  if (!config.configured) {
    event.status = 'blocked_missing_connector';
    event.last_error = `${config.label} connector URL is not configured.`;
    event.updated_at = new Date().toISOString();
    await persistConnectorEvent(env, event);
    await log(env, 'connector_dispatch_blocked', {event_id:event.id, connector_type:event.connector_type, reason:event.last_error});
    return {ok:false, blocked:true, reason:'connector_not_configured', event};
  }
  const body = connectorDispatchPayload(event, authContext);
  const headers = {
    'content-type':'application/json',
    'x-metraiyux-event-id':event.id,
    'x-metraiyux-connector-type':event.connector_type,
    ...(config.token ? {authorization:`Bearer ${config.token}`} : {})
  };
  event.attempts = Number(event.attempts || 0) + 1;
  event.status = 'dispatching';
  event.updated_at = new Date().toISOString();
  await persistConnectorEvent(env, event);
  let res, text;
  try {
    res = await fetch(config.url, {method:'POST', headers, body:JSON.stringify(body)});
    text = await res.text();
  } catch (error) {
    event.status = event.attempts < event.max_attempts ? 'retry_pending' : 'failed';
    event.last_error = error?.message || 'Connector dispatch failed.';
    event.updated_at = new Date().toISOString();
    await persistConnectorEvent(env, event);
    await log(env, 'connector_dispatch_failed', {event_id:event.id, connector_type:event.connector_type, error:event.last_error, attempts:event.attempts});
    return {ok:false, retry:event.status === 'retry_pending', error:event.last_error, event};
  }
  event.status = res.ok ? 'dispatched' : (event.attempts < event.max_attempts ? 'retry_pending' : 'failed');
  event.last_error = res.ok ? null : text.slice(0, 1000);
  event.dispatch_response = {status:res.status, ok:res.ok, body:text.slice(0,1000)};
  event.dispatched_at = res.ok ? new Date().toISOString() : null;
  event.updated_at = new Date().toISOString();
  await persistConnectorEvent(env, event);
  await log(env, res.ok ? 'connector_dispatched' : 'connector_dispatch_failed', {event_id:event.id, connector_type:event.connector_type, action:event.action, status:res.status, response:text.slice(0,1000), attempts:event.attempts});
  return {ok:res.ok, status:res.status, event, response:text.slice(0,1000)};
}

async function dispatchApprovedItem(env, itemId, authContext=null){
  const events = await connectorEventsForItem(env, itemId);
  const dispatches = [];
  for (const event of events) {
    if (['dispatched','dispatching'].includes(event.status)) continue;
    dispatches.push(await dispatchConnectorEvent(env, event, authContext));
  }
  return dispatches;
}

function slugify(value){
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'content-engine-item';
}

function sentence(value){
  const text = String(value || '').trim();
  if (!text) return '';
  const capped = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

function routeList(article, prefix=''){
  return (article.directAppRoutes || article.surfaces || []).map(route => ({
    title:route.title || route.name || route.route || 'App room',
    route:route.route || route.path || route.href || '',
    use:route.use || route.purpose || ''
  })).filter(route => route.title);
}

function normalizeContentArticle(input={}){
  const article = input.article || input;
  const title = String(article.title || '').trim();
  if (!title) return null;
  return {
    title,
    slug:slugify(article.slug || title),
    subtitle:String(article.subtitle || article.description || '').trim(),
    collection:String(article.collection || 'Content Engine').trim(),
    category:String(article.category || 'Content Engine').trim(),
    author:String(article.author || 'MetrAIyux 0S').trim(),
    audience:String(article.audience || article.contentEngineUse?.audience || 'buyers, operators, and marketing channels').trim(),
    appWork:String(article.appWork || article.contentEngineUse?.appWork || 'a working app route with proof receipts and approval gates').trim(),
    proofRule:String(article.proofRule || article.contentEngineUse?.proofRule || 'do not publish a claim unless the linked proof surface supports it').trim(),
    marketingUse:String(article.marketingUse || article.contentEngineUse?.marketingUse || 'turn the article into social, website, email, local-brain, and sales assets').trim(),
    html:String(article.html || '').trim(),
    markdown:String(article.markdown || '').trim(),
    directAppRoutes:routeList(article)
  };
}

function articleRoomText(article){
  const routes = routeList(article);
  if (!routes.length) return 'Open the article and route the reader to the relevant MetrAIyux 0S app room.';
  return routes.slice(0, 5).map(route => `${route.title}${route.route ? ` (${route.route})` : ''}: ${route.use}`).join('\n');
}

function buildLinkedInPost(article){
  const rooms = routeList(article).slice(0, 4).map(route => `- ${route.title}`).join('\n');
  return `I built the 0S blog to behave like an operating lane, not a content shelf.\n\n${article.title}\n\nThe point is simple: ${sentence(article.subtitle || article.marketingUse)}\n\nWhen a buyer, AE, or operator reads this piece, I want them to move directly into the command rooms that prove the claim:\n${rooms || '- MetrAIyux 0S proof and command rooms'}\n\nProof rule: ${sentence(article.proofRule)}\n\nThis is how I turn one longform article into sales follow-up, website copy, local-brain context, and campaign material without letting the message drift away from the app.`;
}

function buildXThread(article){
  const routes = routeList(article).slice(0, 3);
  const tweets = [
    `I am turning the 0S blog into a content engine. Each article has to route into the app, not just sound smart. This one: ${article.title}`,
    `${sentence(article.subtitle || article.marketingUse)} The reader should leave with a next action, not a vague impression.`,
    `The app rooms behind it: ${routes.map(r => r.title).join(', ') || 'proof router, command rooms, and local brain'}.`,
    `Proof rule: ${sentence(article.proofRule)} That keeps the public story useful without overclaiming.`,
    `This is the loop: longform article -> app route -> sales follow-up -> website copy -> local-brain chunk -> approval-gated publishing.`
  ];
  return tweets.map((tweet, index) => `${index + 1}/${tweets.length} ${tweet}`).join('\n\n');
}

function buildEmailPackage(article){
  return `Subject: ${article.title}\n\nI wanted to send this because it explains a real operating piece of MetrAIyux 0S, not just a broad idea.\n\n${article.subtitle || article.marketingUse}\n\nThe useful part is that the article routes into the actual rooms behind the claim:\n${articleRoomText(article)}\n\nThe boundary is just as important as the pitch: ${article.proofRule}.\n\nIf this is the kind of operating structure you want to see, the next move is to open the linked room and look at the proof path.`;
}

function buildWebsiteSection(article){
  const routeCards = routeList(article).slice(0, 5).map(route => `<li><strong>${escapeHtmlEmail(route.title)}</strong>${route.use ? ` - ${escapeHtmlEmail(route.use)}` : ''}</li>`).join('');
  return `<section class="content-engine-route" data-article="${escapeHtmlEmail(article.slug)}">
  <p class="eyebrow">${escapeHtmlEmail(article.collection)} / ${escapeHtmlEmail(article.category)}</p>
  <h2>${escapeHtmlEmail(article.title)}</h2>
  <p>${escapeHtmlEmail(article.subtitle || article.marketingUse)}</p>
  <ul>${routeCards}</ul>
  <p><strong>Proof rule:</strong> ${escapeHtmlEmail(article.proofRule)}</p>
</section>`;
}

function buildLocalBrainChunk(article){
  return {
    id:`content-engine-${article.slug}`,
    title:`Content Engine: ${article.title}`,
    heading:article.category,
    source:article.html || `blog/posts/${article.slug}.html`,
    text:`${article.title}. ${article.subtitle}. Audience: ${article.audience}. App work: ${article.appWork}. Proof rule: ${article.proofRule}. Marketing use: ${article.marketingUse}. Direct app routes: ${articleRoomText(article)}`
  };
}

function buildRepositoryFiles(article, assets){
  const markdown = [
    `# ${article.title}`,
    '',
    article.subtitle || '',
    '',
    `Audience: ${article.audience}`,
    '',
    `Proof rule: ${article.proofRule}`,
    '',
    '## App Routes',
    '',
    articleRoomText(article),
    '',
    '## Campaign Assets',
    '',
    ...assets.filter(asset => asset.type !== 'repository_update').map(asset => `### ${asset.title}\n\n${asset.content}`)
  ].join('\n');
  return [
    {
      path:`marketing/metraiyux-0s/generated/${article.slug}-campaign.md`,
      content:markdown,
      message:`Add content engine campaign for ${article.title}`
    },
    {
      path:`metraiyux_0s_site/brain/generated/content-engine-${article.slug}.json`,
      content:JSON.stringify(buildLocalBrainChunk(article), null, 2) + '\n',
      message:`Add local brain chunk for ${article.title}`
    }
  ];
}

function createContentAssets(article, options={}){
  const requested = new Set((options.channels || ['linkedin','x_thread','email','website_section','local_brain','repository_update']).map(String));
  const assets = [];
  const makeAsset = (type, title, content, payload={}) => assets.push({
    id:crypto.randomUUID(),
    type,
    title,
    destination:payload.destination || type,
    platform:payload.platform || type,
    status:'pending_approval',
    content,
    payload,
    created_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  });
  if (requested.has('linkedin')) makeAsset('social', 'LinkedIn personal post', buildLinkedInPost(article), {platform:'linkedin', destination:'personal_social'});
  if (requested.has('x_thread')) makeAsset('social', 'X thread', buildXThread(article), {platform:'x', destination:'personal_social'});
  if (requested.has('email')) makeAsset('email', 'Follow-up email package', buildEmailPackage(article), {destination:'sales_email'});
  if (requested.has('website_section')) makeAsset('website_section', 'Website section update', buildWebsiteSection(article), {destination:'personal_site'});
  if (requested.has('local_brain')) makeAsset('local_brain', 'Local brain knowledge chunk', JSON.stringify(buildLocalBrainChunk(article), null, 2), {destination:'local_brain', chunk:buildLocalBrainChunk(article)});
  if (requested.has('repository_update')) makeAsset('repository_update', 'Repository content update', '', {destination:'repository'});
  const repo = assets.find(asset => asset.type === 'repository_update');
  if (repo) {
    repo.payload.files = buildRepositoryFiles(article, assets);
    repo.content = JSON.stringify({files:repo.payload.files.map(file => file.path)}, null, 2);
  }
  return assets;
}

async function persistContentEngineRun(env, run){
  await kvPutJson(env, `content_engine_run:${run.id}`, run);
  await safeDbRun(env, `insert into content_engine_runs
    (id,article_slug,article_title,status,approval_required,channels,destinations,package_json,created_at,updated_at,approved_at,dispatched_at)
    values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
    on conflict(id) do update set status=excluded.status, package_json=excluded.package_json, updated_at=excluded.updated_at, approved_at=excluded.approved_at, dispatched_at=excluded.dispatched_at`,
    [run.id, run.article_slug, run.article_title, run.status, run.approval_required ? 1 : 0, JSON.stringify(run.channels || []), JSON.stringify(run.destinations || []), JSON.stringify(run.package || {}), run.created_at, run.updated_at, run.approved_at || null, run.dispatched_at || null]);
  return run;
}

async function persistContentEngineAsset(env, asset){
  await kvPutJson(env, `content_engine_asset:${asset.id}`, asset);
  if (asset.run_id) await kvPutJson(env, `content_engine_asset_index:${asset.run_id}:${asset.id}`, {run_id:asset.run_id, asset_id:asset.id});
  await safeDbRun(env, `insert into content_engine_assets
    (id,run_id,asset_type,destination,platform,status,content,payload,created_at,updated_at)
    values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
    on conflict(id) do update set status=excluded.status, content=excluded.content, payload=excluded.payload, updated_at=excluded.updated_at`,
    [asset.id, asset.run_id || null, asset.type, asset.destination || null, asset.platform || null, asset.status, asset.content || '', JSON.stringify(asset.payload || {}), asset.created_at, asset.updated_at]);
  return asset;
}

async function listContentEngineRuns(env){
  const rows = await safeDbAll(env, 'select * from content_engine_runs order by created_at desc limit 100');
  if (rows.length) return rows.map(row => ({...row, approval_required:Boolean(row.approval_required), channels:safeJsonParse(row.channels, []), destinations:safeJsonParse(row.destinations, []), package:safeJsonParse(row.package_json, {})}));
  return kvListJson(env, 'content_engine_run:', 100);
}

async function getContentEngineRun(env, id){
  const kv = await kvGetJson(env, `content_engine_run:${id}`);
  if (kv) return kv;
  const rows = await safeDbAll(env, 'select * from content_engine_runs where id=?1 limit 1', [id]);
  if (!rows[0]) return null;
  return {...rows[0], approval_required:Boolean(rows[0].approval_required), channels:safeJsonParse(rows[0].channels, []), destinations:safeJsonParse(rows[0].destinations, []), package:safeJsonParse(rows[0].package_json, {})};
}

async function listContentEngineAssets(env, runId=null){
  if (runId) {
    const rows = await safeDbAll(env, 'select * from content_engine_assets where run_id=?1 order by created_at asc', [runId]);
    if (rows.length) return rows.map(row => ({...row, type:row.asset_type, payload:safeJsonParse(row.payload, {})}));
    const indexed = await kvListJson(env, `content_engine_asset_index:${runId}:`);
    const assets = [];
    for (const idx of indexed) {
      const asset = await kvGetJson(env, `content_engine_asset:${idx.asset_id}`);
      if (asset) assets.push(asset);
    }
    return assets;
  }
  const rows = await safeDbAll(env, 'select * from content_engine_assets order by created_at desc limit 200');
  if (rows.length) return rows.map(row => ({...row, type:row.asset_type, payload:safeJsonParse(row.payload, {})}));
  return kvListJson(env, 'content_engine_asset:', 200);
}

async function createContentEngineRun(env, body, authContext=null){
  const article = normalizeContentArticle(body.article || body);
  if (!article) return {ok:false, error:'article_required'};
  const channels = body.channels || ['linkedin','x_thread','email','website_section','local_brain','repository_update'];
  const destinations = body.destinations || ['social_dispatch','content_publish','local_brain_update','repository_update'];
  const assets = createContentAssets(article, {channels});
  const run = {
    id:body.id || crypto.randomUUID(),
    type:'content_engine_run',
    article_slug:article.slug,
    article_title:article.title,
    article,
    channels,
    destinations,
    approval_required:true,
    status:'pending_approval',
    package:{article, assets:assets.map(asset => ({id:asset.id, type:asset.type, title:asset.title, destination:asset.destination, platform:asset.platform, content:asset.content, payload:asset.payload}))},
    created_by:authContext?.actor || authContext?.skygate?.email || 'admin',
    created_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
  await persistContentEngineRun(env, run);
  const connector_events = [];
  for (const asset of assets) {
    asset.run_id = run.id;
    asset.article_slug = article.slug;
    await persistContentEngineAsset(env, asset);
    if (asset.type === 'social') {
      await createSocialDraft(env, {source_content_engine_run:run.id, topic:article.title, platform:asset.platform, content:asset.content, article_slug:article.slug, status:'draft_pending_approval'});
      connector_events.push(await createConnectorEvent(env, {connector_type:'social_dispatch', action:'social.publish', item_id:run.id, approval_required:true, payload:{platform:asset.platform, content:asset.content, article, asset_id:asset.id, run_id:run.id}}));
    } else if (asset.type === 'website_section' || asset.type === 'email') {
      connector_events.push(await createConnectorEvent(env, {connector_type:'content_publish', action:asset.type === 'email' ? 'content.email.package' : 'content.site.upsert', item_id:run.id, approval_required:true, payload:{content:asset.content, article, asset_id:asset.id, run_id:run.id, destination:asset.destination}}));
    } else if (asset.type === 'local_brain') {
      await kvPutJson(env, `content_engine_local_brain_pending:${asset.id}`, asset.payload.chunk || safeJsonParse(asset.content, {}));
      connector_events.push(await createConnectorEvent(env, {connector_type:'local_brain_update', action:'content.local_brain.chunk.upsert', item_id:run.id, approval_required:true, payload:{chunk:asset.payload.chunk || safeJsonParse(asset.content, {}), article, asset_id:asset.id, run_id:run.id}}));
    } else if (asset.type === 'repository_update') {
      connector_events.push(await createConnectorEvent(env, {connector_type:'repository_update', action:'content.repository.commit', item_id:run.id, approval_required:true, payload:{files:asset.payload.files || [], article_slug:article.slug, article_title:article.title, asset_id:asset.id, run_id:run.id, commit_message:`MetrAIyux content engine update: ${article.title}`}}));
    }
  }
  await log(env, 'content_engine_run_created', {run_id:run.id, article_slug:article.slug, article_title:article.title, channels, destinations, asset_count:assets.length});
  return {ok:true, run, assets, connector_events};
}

async function approveAndDispatchContentRun(env, body, authContext=null){
  const runId = body.run_id || body.id || body.item_id;
  const run = await getContentEngineRun(env, runId);
  if (!run) return {ok:false, error:'content_engine_run_not_found'};
  if (body.approved || body.decision === 'approved' || body.decision === 'override_approved') {
    await recordApproval(env, {item_id:run.id, decision:body.decision || 'approved', notes:body.notes || 'Approved content engine run for connector dispatch.'}, authContext);
    run.status = 'approved';
    run.approved_at = new Date().toISOString();
  }
  const dispatches = await dispatchApprovedItem(env, run.id, authContext);
  const allOk = dispatches.length > 0 && dispatches.every(item => item.ok);
  run.status = allOk ? 'dispatched' : (dispatches.some(item => item.blocked) ? 'blocked' : 'dispatch_attempted');
  run.dispatched_at = allOk ? new Date().toISOString() : null;
  run.updated_at = new Date().toISOString();
  await persistContentEngineRun(env, run);
  await log(env, 'content_engine_run_dispatch', {run_id:run.id, status:run.status, dispatches:dispatches.map(d => ({ok:d.ok, reason:d.reason || d.error || null, event_id:d.event?.id || null}))});
  return {ok:allOk, run, dispatches};
}

async function contentEngineLocalBrainFeed(env){
  const assets = (await listContentEngineAssets(env)).filter(asset => (asset.type || asset.asset_type) === 'local_brain');
  const chunks = [];
  for (const asset of assets) {
    if (!(await hasApproval(env, asset.run_id))) continue;
    const payload = asset.payload || {};
    const chunk = payload.chunk || safeJsonParse(asset.content, null);
    if (chunk) chunks.push({...chunk, source_run_id:asset.run_id, source_asset_id:asset.id});
  }
  return chunks;
}

async function recordApproval(env, input, authContext=null){
  const approval = {
    id:input.id || crypto.randomUUID(),
    item_id:input.item_id || null,
    decision:input.decision || 'pending',
    approver:input.approver || authContext?.actor || authContext?.skygate?.email || 'admin',
    notes:input.notes || '',
    created_at:input.created_at || new Date().toISOString()
  };
  await kvPutJson(env, `approval:${approval.id}`, approval);
  if (env.ADMIN_DB) {
    await env.ADMIN_DB.prepare('insert into approvals (id,item_id,decision,approver,notes,created_at) values (?1,?2,?3,?4,?5,?6)')
      .bind(approval.id,approval.item_id,approval.decision,approval.approver,approval.notes,approval.created_at)
      .run();
  }
  await log(env, 'approval', approval);
  return approval;
}

function approvalEmailConfigured(env){
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL && env.ADMIN_APPROVAL_EMAIL);
}
function adminApprovalUrl(env, receiptId){
  const base = (env.PUBLIC_ADMIN_URL || '').replace(/\/$/, '');
  if (!base) return '';
  return `${base}/admin/approval-inbox.html?item=${encodeURIComponent(receiptId || '')}`;
}
function escapeHtmlEmail(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function approvalEmailHtml(payload){
  const route = payload.route || {};
  const link = payload.approval_url || '';
  return `<!doctype html><html><body style="margin:0;background:#08101d;color:#f7fbff;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:720px;margin:0 auto;padding:28px;">
    <div style="border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:24px;background:linear-gradient(135deg,#111827,#0b1220);">
      <p style="margin:0 0 10px;color:#f2c76e;letter-spacing:.16em;text-transform:uppercase;font-size:12px;">Admin approval required</p>
      <h1 style="margin:0 0 14px;font-size:26px;line-height:1.15;">Main Automation Brain needs your approval</h1>
      <p style="line-height:1.6;color:#d8e6ff;">A command was routed to the cabinet-brain system and was blocked from external action until you approve it.</p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;color:#f7fbff;">
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Receipt</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(payload.id)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Primary brain</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(route.primary)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Secondary review</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(route.secondary)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Status</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(payload.status)}</td></tr>
      </table>
      <p style="white-space:pre-wrap;background:#050a12;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px;color:#eaf2ff;">${escapeHtmlEmail(payload.message || payload.topic || payload.title || '')}</p>
      ${link ? `<p style="margin:24px 0;"><a href="${escapeHtmlEmail(link)}" style="background:#f2c76e;color:#07101d;text-decoration:none;font-weight:800;padding:14px 18px;border-radius:14px;display:inline-block;">Open Admin Approval Inbox</a></p>` : `<p style="color:#f2c76e;">PUBLIC_ADMIN_URL is not configured, so no direct admin link was included.</p>`}
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;">Guardrail: approval is required before publishing, sending email, client commitments, pricing changes, legal/tax/HR actions, payments, signatures, or public claims.</p>
    </div>
  </div></body></html>`;
}
async function sendApprovalNotification(env, payload){
  if (!approvalEmailConfigured(env)) {
    const safePayload = payload?.sensitive ? {...payload, message:'[redacted_sensitive_delivery]'} : payload;
    await log(env, 'approval_email_skipped', {reason:'RESEND_API_KEY, RESEND_FROM_EMAIL, or ADMIN_APPROVAL_EMAIL missing', payload:safePayload});
    return {ok:false, skipped:true, reason:'Resend approval email is not configured.'};
  }
  const approval_url = adminApprovalUrl(env, payload.id);
  const emailPayload = {...payload, approval_url};
  const subject = `[Approval Required] ${payload.route?.primary || payload.owner || 'Main Automation Brain'} — ${String(payload.message || payload.title || 'New command').slice(0,80)}`;
  const res = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${env.RESEND_API_KEY}`},
    body:JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [env.ADMIN_APPROVAL_EMAIL],
      reply_to: env.RESEND_REPLY_TO || undefined,
      subject,
      html: approvalEmailHtml(emailPayload),
      text: `Approval required\n\nReceipt: ${payload.id}\nPrimary: ${payload.route?.primary || payload.owner || ''}\nSecondary: ${payload.route?.secondary || ''}\nStatus: ${payload.status || ''}\n\nCommand:\n${payload.message || payload.topic || payload.title || ''}\n\nOpen: ${approval_url || 'PUBLIC_ADMIN_URL not configured'}\n`
    })
  });
  const data = await res.json().catch(async()=>({raw: await res.text().catch(()=> '')}));
  const record = {id:crypto.randomUUID(), item_id:payload.id || null, provider:'resend', status:res.ok ? 'sent' : 'failed', response:data, created_at:new Date().toISOString()};
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into notification_log (id,item_id,provider,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(record.id,record.item_id,record.provider,record.status,JSON.stringify({request:{to:env.ADMIN_APPROVAL_EMAIL,subject},response:data}),record.created_at).run().catch(()=>{});
  await log(env, 'approval_email', record);
  return {ok:res.ok, status:res.status, data, record};
}

function secretTarget(secretName, body={}){
  const key = String(secretName || '').trim().toUpperCase();
  const target = SECRET_TARGETS[key];
  if (!target) return null;
  return {
    ...target,
    secret_name:key,
    envName: body.env_name || target.envName,
    scriptName: body.target_script || body.script_name || null
  };
}

function resolveTargetScript(env, target){
  return target.scriptName || env[target.scriptVar] || target.defaultScript;
}

async function callCloudflareSecretUpdate(env, scriptName, name, text){
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const apiToken = String(env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || '').trim();
  if (!accountId || !apiToken) return {ok:false, skipped:true, reason:'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN missing'};
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/secrets`, {
    method:'PUT',
    headers:{'content-type':'application/json','authorization':`Bearer ${apiToken}`},
    body:JSON.stringify({name, text, type:'secret_text'})
  });
  const data = await res.json().catch(async()=>({raw:await res.text().catch(()=> '')}));
  return {ok:res.ok && data?.success !== false, status:res.status, data};
}

async function persistRotationRun(env, run){
  await kvPutJson(env, `secret_rotation:${run.id}`, run);
  await safeDbRun(env, `insert into secret_rotation_runs
    (id,secret_name,target_script,status,mode,actor,approval_id,cloudflare_status,error,created_at,completed_at,payload)
    values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
    on conflict(id) do update set status=excluded.status, cloudflare_status=excluded.cloudflare_status,
    error=excluded.error, completed_at=excluded.completed_at, payload=excluded.payload`,
    [run.id, run.secret_name, run.target_script, run.status, run.mode, run.actor || '', run.approval_id || null, run.cloudflare_status || null, run.error || null, run.created_at, run.completed_at || null, JSON.stringify(run.payload || {})]);
  return run;
}

async function listRotationRuns(env){
  const rows = await safeDbAll(env, 'select * from secret_rotation_runs order by created_at desc limit 200');
  if (rows.length) return rows.map(row => ({...row, payload:safeJsonParse(row.payload, {})}));
  return kvListJson(env, 'secret_rotation:', 200);
}

async function requireSecuritySessionForSensitiveAction(request, env){
  const active = await activeMfaDevices(env);
  if (!active.length && !boolEnv(env.REQUIRE_MFA_FOR_ROTATION)) return {ok:true, reason:'no_active_mfa_device'};
  const session = await sessionFromRequest(request, env);
  if (!session.ok) return {ok:false, error:'A current MFA or backup-code override session is required for secret rotation.'};
  return session;
}

async function rotateSecret(env, body, authContext, request){
  const target = secretTarget(body.secret_name || body.name, body);
  if (!target) return {ok:false, status:400, error:'Unsupported secret_name. Supported: ADMIN_TOKEN, RESEND_API_KEY, STRIPE_SECRET, STRIPE_SECRET_KEY.'};
  const sessionGate = body.scheduled ? {ok:true, reason:'scheduled_worker_cron'} : await requireSecuritySessionForSensitiveAction(request, env);
  if (!sessionGate.ok) return {ok:false, status:403, error:sessionGate.error};
  const scriptName = resolveTargetScript(env, target);
  const created_at = new Date().toISOString();
  const run = {
    id:crypto.randomUUID(),
    secret_name:target.envName,
    requested_secret_name:target.secret_name,
    target_script:scriptName,
    actor:authContext?.actor || authContext?.skygate?.email || 'admin',
    mode:target.externalValueRequired ? 'staged_external_value' : 'generated_secret',
    status:'started',
    created_at,
    payload:{approved:Boolean(body.approved), deliver_once:Boolean(body.deliver_once), cloudflare_account_configured:Boolean(env.CLOUDFLARE_ACCOUNT_ID), session:sessionGate.session ? {kind:sessionGate.session.kind, expires_at:sessionGate.session.expires_at} : null}
  };
  if (!body.approved) {
    run.status = 'approval_required';
    run.error = 'Set approved=true after operator review before rotating a production secret.';
    await persistRotationRun(env, run);
    await sendApprovalNotification(env, {id:run.id, message:`Secret rotation requested for ${target.envName} on ${scriptName}.`, status:'approval_required', route:{primary:'0meg4kAI Security / QA Brain', secondary:'Gray London Skyes — Founder Command Brain'}});
    return {ok:false, status:403, error:run.error, run};
  }
  let newValue = String(body.new_value || '').trim();
  if (!newValue && target.generator === 'strong_token') newValue = strongToken('admin');
  if (target.generator === 'strong_token' && body.deliver_once && !body.return_value_once && !approvalEmailConfigured(env)) {
    run.status = 'blocked_missing_delivery_channel';
    run.error = 'Generated secret rotation is blocked because deliver_once was requested but Resend is not configured and return_value_once is false.';
    await persistRotationRun(env, run);
    return {ok:false, status:409, error:run.error, run};
  }
  if (!newValue && target.externalValueRequired) {
    run.status = 'needs_external_secret';
    run.error = `${target.envName} cannot be minted inside this Worker. Paste the new provider key as new_value after creating it in the provider account.`;
    await persistRotationRun(env, run);
    await sendApprovalNotification(env, {id:run.id, message:run.error, status:'rotation_waiting_for_external_key', route:{primary:'0meg4kAI Security / QA Brain', secondary:'Orion Hayes — Technology Systems Brain'}});
    return {ok:false, status:409, error:run.error, run};
  }
  const cf = await callCloudflareSecretUpdate(env, scriptName, target.envName, newValue);
  run.cloudflare_status = cf.ok ? 'updated' : (cf.skipped ? 'not_configured' : 'failed');
  run.status = cf.ok ? 'completed' : (cf.skipped ? 'blocked_missing_cloudflare_api' : 'failed');
  run.error = cf.ok ? null : (cf.reason || cf.data?.errors?.[0]?.message || `Cloudflare secret update failed with ${cf.status || 'no status'}`);
  run.completed_at = new Date().toISOString();
  run.payload.cloudflare = cf.ok ? {status:cf.status, success:true} : {status:cf.status || null, reason:cf.reason || null, data:cf.data || null};
  run.payload.value_delivery = body.deliver_once ? 'email_once_requested' : 'not_returned';
  await persistRotationRun(env, run);
  await log(env, 'secret_rotation', {run_id:run.id, secret_name:target.envName, target_script:scriptName, status:run.status, cloudflare_status:run.cloudflare_status});
  if (body.deliver_once && cf.ok) {
    await sendApprovalNotification(env, {
      id:run.id,
      message:`Secret ${target.envName} was rotated on ${scriptName}. New value is delivered once below:\n\n${newValue}\n\nStore it immediately. It is not persisted in plaintext by the Worker.`,
      status:'secret_rotated_deliver_once',
      sensitive:true,
      route:{primary:'0meg4kAI Security / QA Brain', secondary:'Gray London Skyes — Founder Command Brain'}
    });
  }
  return {ok:cf.ok, status:cf.ok ? 200 : 502, run:{...run, generated_value_returned_once: body.return_value_once ? newValue : undefined}};
}

async function runDueRotations(env){
  const due = [];
  if (boolEnv(env.AUTO_ROTATE_ADMIN_TOKEN)) due.push({secret_name:'ADMIN_TOKEN', approved:true, deliver_once:true, scheduled:true});
  const results = [];
  for (const item of due) {
    const fakeRequest = new Request('https://internal/rotation', {headers:{'x-admin-session':''}});
    results.push(await rotateSecret(env, item, {actor:'scheduled-rotation'}, fakeRequest));
  }
  return results;
}

function formatBackupCode(){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from(randomBytes(n)).map(byte => alphabet[byte % alphabet.length]).join('');
  return `SKYE-${pick(4)}-${pick(4)}-${pick(4)}`;
}

async function hashBackupCode(env, code){
  const pepper = backupPepper(env);
  if (!pepper) throw new Error('ADMIN_BACKUP_CODE_PEPPER or ADMIN_MFA_ENCRYPTION_KEY is required for backup-code hashing.');
  return hmacHex(pepper, String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
}

async function persistBackupCode(env, row){
  await kvPutJson(env, `backup_code:${row.code_hash}`, row);
  await safeDbRun(env, `insert into admin_backup_codes
    (id,code_hash,batch_id,status,created_at,used_at,expires_at,delivery)
    values (?1,?2,?3,?4,?5,?6,?7,?8)
    on conflict(code_hash) do update set status=excluded.status, used_at=excluded.used_at`,
    [row.id, row.code_hash, row.batch_id, row.status, row.created_at, row.used_at || null, row.expires_at || null, row.delivery || 'email_once']);
}

async function issueBackupCodes(env, authContext, {count=10, expires_at=null, return_codes=false}={}){
  const bounded = Math.min(20, Math.max(4, Number(count || 10)));
  const batch_id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const codes = [];
  for (let i = 0; i < bounded; i += 1) {
    const code = formatBackupCode();
    codes.push(code);
    await persistBackupCode(env, {id:crypto.randomUUID(), code_hash:await hashBackupCode(env, code), batch_id, status:'active', created_at, expires_at, delivery:'email_once'});
  }
  const html = `<h2>MetrAIyux 0S backup override codes</h2><p>These are one-time emergency override codes. Each code can be used once.</p><ol>${codes.map(code => `<li><code>${escapeHtmlEmail(code)}</code></li>`).join('')}</ol><p>Generated: ${created_at}</p>`;
  const delivery = await (async()=>{
    if (!approvalEmailConfigured(env)) return {ok:false, skipped:true, reason:'RESEND_API_KEY, RESEND_FROM_EMAIL, or ADMIN_APPROVAL_EMAIL missing'};
    const res = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'content-type':'application/json','authorization':`Bearer ${env.RESEND_API_KEY}`},
      body:JSON.stringify({from:env.RESEND_FROM_EMAIL, to:[env.ADMIN_APPROVAL_EMAIL], subject:'MetrAIyux 0S backup override codes', html, text:`MetrAIyux 0S backup override codes\n\n${codes.join('\n')}\n\nEach code can be used once.`})
    });
    const data = await res.json().catch(async()=>({raw:await res.text().catch(()=> '')}));
    return {ok:res.ok, status:res.status, data};
  })();
  await log(env, 'backup_codes_issued', {batch_id, count:bounded, actor:authContext?.actor || 'admin', delivery:{ok:delivery.ok, skipped:delivery.skipped, status:delivery.status || null}});
  return {batch_id, count:bounded, delivery, codes_once:return_codes ? codes : undefined};
}

async function consumeBackupCode(env, code, actor='admin'){
  const code_hash = await hashBackupCode(env, code);
  let row = await kvGetJson(env, `backup_code:${code_hash}`);
  if (!row) {
    const rows = await safeDbAll(env, 'select * from admin_backup_codes where code_hash=?1 limit 1', [code_hash]);
    row = rows[0] || null;
  }
  if (!row || row.status !== 'active') return {ok:false, error:'Backup code is invalid or already used.'};
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return {ok:false, error:'Backup code expired.'};
  row.status = 'used';
  row.used_at = new Date().toISOString();
  row.used_by = actor;
  await persistBackupCode(env, row);
  await log(env, 'backup_code_consumed', {batch_id:row.batch_id, actor});
  return {ok:true, row};
}

async function maybeAI(env, message, route){
  // Optional Workers AI binding. Deterministic fallback is used if no AI binding is present.
  if (!env.AI) return null;
  try {
    const prompt = `You are the Main Automation Brain for a 13-cabinet business OS. Reply as an admin operator. Route to ${route.primary} with ${route.secondary}. Keep approval boundaries clear. User command: ${message}`;
    const out = await env.AI.run(env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {messages:[{role:'system',content:'You route business tasks, require proof receipts, and never fake external execution.'},{role:'user',content:prompt}]});
    return out.response || out.result?.response || null;
  } catch(e){ return null; }
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {headers:CORS});
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/admin/status') {
      const mfaDevices = await activeMfaDevices(env).catch(()=>[]);
      return Response.json({
        ok:true,
        service:'Admin Automation Brain Worker',
        brains:16,
        durable_mode:Boolean(env.ADMIN_DB),
        queue:Boolean(env.ADMIN_QUEUE),
        kv:Boolean(env.ADMIN_KV),
        connectors:allConnectorStatus(env),
        social_connector:Boolean(env.SOCIAL_DISPATCH_WEBHOOK),
        resend_approval_email:approvalEmailConfigured(env),
        approval_recipient: env.ADMIN_APPROVAL_EMAIL ? 'configured' : 'missing',
        secret_rotation:{cloudflare_api:Boolean(env.CLOUDFLARE_ACCOUNT_ID && (env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN)), supported:Object.keys(SECRET_TARGETS)},
        mfa:{required:boolEnv(env.ADMIN_MFA_REQUIRED), active_devices:mfaDevices.length, encrypted_storage:Boolean(encryptionSecret(env))},
        skygate_auth:Boolean(skygateOrigin(env)),
        skygate_event_mirror:Boolean(skygateOrigin(env) && mirrorSecret(env)),
        time:new Date().toISOString()
      }, {headers:CORS});
    }
    if (url.pathname === '/api/admin/auth/introspect' && request.method === 'POST') {
      const a = await primaryAuth(request, env);
      return Response.json({ok:a.ok, via:a.via || null, actor:a.actor || null, skygate:a.skygate || null, error:a.ok ? null : a.error}, {status:a.ok ? 200 : 401, headers:CORS});
    }
    let authContext = null;
    if (url.pathname.startsWith('/api/admin/')) {
      const primaryOnly = [
        '/api/admin/security/status',
        '/api/admin/security/mfa/setup',
        '/api/admin/security/mfa/verify',
        '/api/admin/security/mfa/qr.svg',
        '/api/admin/security/backup-codes/issue',
        '/api/admin/security/override-session'
      ].includes(url.pathname);
      authContext = await auth(request, env, {skipMfa:primaryOnly});
      if(!authContext.ok) return Response.json({ok:false,error:authContext.error, skygate:authContext.skygate || null}, {status:401, headers:CORS});
    }
    if (url.pathname === '/api/admin/security/status') {
      const devices = await listMfaDevices(env);
      const session = await sessionFromRequest(request, env);
      return Response.json({ok:true, mfa:{required:boolEnv(env.ADMIN_MFA_REQUIRED), devices:devices.map(({encrypted_secret, ...device}) => device), active_devices:devices.filter(d=>d.status === 'active').length, session:session.ok ? session.session : null}, backup_codes:{configured:Boolean(backupPepper(env))}, secret_rotation:{cloudflare_api:Boolean(env.CLOUDFLARE_ACCOUNT_ID && (env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN))}}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/security/mfa/setup' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const active = await activeMfaDevices(env);
      if (active.length) {
        const session = await sessionFromRequest(request, env);
        if (!session.ok) return Response.json({ok:false,error:'Existing MFA is active. Re-issuing a QR requires an MFA or override session.'}, {status:403, headers:CORS});
      }
      const secret = base32Encode(randomBytes(20));
      const issuer = body.issuer || 'MetrAIyux 0S';
      const account_name = body.account_name || body.account || authContext.actor || 'admin';
      const digits = Number(body.digits || 6);
      const period = Number(body.period || 30);
      const algorithm = 'SHA-1';
      const uri = otpAuthUri({issuer, account:account_name, secret, digits, period, algorithm:'SHA1'});
      const device = {
        id:crypto.randomUUID(),
        label:body.label || 'Primary admin authenticator',
        account_name,
        issuer,
        status:'pending_verification',
        digits,
        period,
        algorithm,
        encrypted_secret:await encryptJson(env, {secret}),
        created_at:new Date().toISOString(),
        verified_at:null,
        last_used_at:null
      };
      await putMfaDevice(env, device);
      await log(env, 'mfa_setup_started', {device_id:device.id, account_name, issuer});
      return Response.json({ok:true, device:{id:device.id,label:device.label,status:device.status,account_name,issuer,digits,period,algorithm}, otpauth_uri:uri, qr_svg:qrSvg(uri), secret_base32_once:secret, skye_box_path:'/Free99/apps/skyebox-authenticator/index.html'}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/security/mfa/verify' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const devices = body.device_id ? [await getMfaDevice(env, body.device_id)] : await listMfaDevices(env);
      for (const device of devices.filter(Boolean)) {
        const secret = (await decryptJson(env, device.encrypted_secret)).secret;
        const ok = await verifyTotp(secret, body.code, {period:Number(device.period || 30), digits:Number(device.digits || 6), algorithm:device.algorithm || 'SHA-1'});
        if (!ok) continue;
        device.status = 'active';
        device.verified_at = device.verified_at || new Date().toISOString();
        device.last_used_at = new Date().toISOString();
        await putMfaDevice(env, device);
        const session = await createAdminSession(env, authContext.actor || device.account_name || 'admin', 'mfa', ADMIN_SESSION_TTL_SECONDS);
        await log(env, 'mfa_verified', {device_id:device.id, session_id:session.session.id});
        return Response.json({ok:true, device_id:device.id, admin_session:session}, {headers:CORS});
      }
      return Response.json({ok:false,error:'Invalid authenticator code.'}, {status:401, headers:CORS});
    }
    if (url.pathname === '/api/admin/security/mfa/qr.svg') {
      const deviceId = url.searchParams.get('device_id') || '';
      const device = await getMfaDevice(env, deviceId);
      if (!device) return Response.json({ok:false,error:'MFA device not found.'}, {status:404, headers:CORS});
      if (device.status === 'active') {
        const session = await sessionFromRequest(request, env);
        if (!session.ok) return Response.json({ok:false,error:'Re-reading an active MFA QR requires an MFA or override session.'}, {status:403, headers:CORS});
      }
      const secret = (await decryptJson(env, device.encrypted_secret)).secret;
      const uri = otpAuthUri({issuer:device.issuer, account:device.account_name, secret, digits:Number(device.digits || 6), period:Number(device.period || 30), algorithm:'SHA1'});
      return new Response(qrSvg(uri), {headers:{...CORS, 'content-type':'image/svg+xml'}});
    }
    if (url.pathname === '/api/admin/security/backup-codes/issue' && request.method === 'POST') {
      const active = await activeMfaDevices(env);
      if (active.length) {
        const session = await sessionFromRequest(request, env);
        if (!session.ok) return Response.json({ok:false,error:'Issuing backup codes requires an MFA or override session once MFA is active.'}, {status:403, headers:CORS});
      }
      const body = await request.json().catch(()=>({}));
      const issued = await issueBackupCodes(env, authContext, {count:body.count || 10, expires_at:body.expires_at || null, return_codes:Boolean(body.return_codes)});
      return Response.json({ok:true, ...issued}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/security/override-session' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const consumed = await consumeBackupCode(env, body.backup_code || body.code || '', authContext.actor || 'admin');
      if (!consumed.ok) return Response.json(consumed, {status:401, headers:CORS});
      const session = await createAdminSession(env, authContext.actor || 'admin', 'override', OVERRIDE_SESSION_TTL_SECONDS);
      return Response.json({ok:true, admin_session:session, consumed:{batch_id:consumed.row.batch_id, used_at:consumed.row.used_at}}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/connectors/status') {
      return Response.json({ok:true, connectors:allConnectorStatus(env)}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/connectors/events') {
      return Response.json({ok:true, events:await listConnectorEvents(env)}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/connectors/event' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const approval_required = body.approved ? false : (connectorApprovalRequired(body.connector_type || body.type, body.action, body.payload || body) || Boolean(body.approval_required));
      const event = await createConnectorEvent(env, {...body, connector_type:body.connector_type || body.type, approval_required});
      if (body.approved) await recordApproval(env, {item_id:event.item_id || event.id, decision:'approved', notes:'Approved inline before connector event dispatch.'}, authContext);
      let dispatch = null;
      if (!event.approval_required && body.dispatch_now !== false) dispatch = await dispatchConnectorEvent(env, event, authContext);
      if (event.approval_required) await sendApprovalNotification(env, {id:event.item_id || event.id, message:`Connector action ${event.action} is waiting for approval.`, status:'approval_required', route:{primary:CONNECTOR_DEFINITIONS[event.connector_type]?.label || event.connector_type, secondary:'0meg4kAI Security / QA Brain'}});
      return Response.json({ok:true, event, dispatch}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/connectors/dispatch' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const event = await getConnectorEvent(env, body.event_id || body.id);
      if (!event) return Response.json({ok:false,error:'connector_event_not_found'}, {status:404, headers:CORS});
      if (body.approved) {
        await recordApproval(env, {item_id:event.item_id || event.id, decision:'approved', notes:'Approved inline for connector dispatch.'}, authContext);
      }
      const dispatch = await dispatchConnectorEvent(env, event, authContext);
      return Response.json({ok:dispatch.ok, dispatch}, {status:dispatch.ok ? 200 : 409, headers:CORS});
    }
    if (url.pathname === '/api/admin/content-engine/runs') {
      return Response.json({ok:true, runs:await listContentEngineRuns(env)}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/content-engine/run') {
      const runId = url.searchParams.get('id') || url.searchParams.get('run_id') || '';
      if (!runId) return Response.json({ok:false,error:'run_id_required'}, {status:400, headers:CORS});
      const run = await getContentEngineRun(env, runId);
      if (!run) return Response.json({ok:false,error:'content_engine_run_not_found'}, {status:404, headers:CORS});
      return Response.json({ok:true, run, assets:await listContentEngineAssets(env, runId), connector_events:await connectorEventsForItem(env, runId)}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/content-engine/local-brain-feed') {
      return Response.json({ok:true, chunks:await contentEngineLocalBrainFeed(env)}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/content-engine/activate' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const result = await createContentEngineRun(env, body, authContext);
      if (!result.ok) return Response.json(result, {status:400, headers:CORS});
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.content_engine.activate', {run_id:result.run.id, article_slug:result.run.article_slug, channels:result.run.channels}, authContext));
      const approval_email = await sendApprovalNotification(env, {
        id:result.run.id,
        message:`Content engine package waiting for approval: ${result.run.article_title}\n\nAssets: ${result.assets.map(asset => `${asset.title} -> ${asset.destination}`).join('\n')}`,
        status:'approval_required',
        route:{primary:'Valentina Reyes — Marketing & Brand Brain', secondary:'Victor Saint — QA Brain'}
      });
      return Response.json({...result, approval_email, connectors:allConnectorStatus(env)}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/content-engine/dispatch' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const approved = body.approved || body.decision === 'approved' || body.decision === 'override_approved';
      if (!approved) return Response.json({ok:false,error:'Content engine dispatch blocked: approved=true or decision=approved is required.'}, {status:403, headers:CORS});
      const result = await approveAndDispatchContentRun(env, body, authContext);
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.content_engine.dispatch', {run_id:body.run_id || body.id || body.item_id, ok:result.ok, status:result.run?.status || null}, authContext));
      return Response.json(result, {status:result.ok ? 200 : 409, headers:CORS});
    }
    if (url.pathname === '/api/admin/secrets/rotate' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const result = await rotateSecret(env, body, authContext, request);
      return Response.json(result, {status:result.status || (result.ok ? 200 : 400), headers:CORS});
    }
    if (url.pathname === '/api/admin/secrets/rotations') {
      return Response.json({ok:true, runs:await listRotationRuns(env), targets:SECRET_TARGETS}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/brain/chat' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const message = String(body.message || '');
      const route = classify(message);
      const receipt = { id:crypto.randomUUID(), message, route, status:route.approval_required ? 'approval_required' : 'queued_internal', created_at:new Date().toISOString(), guardrail:'Admin approval required before publishing, sending, legal/financial/HR action, payments, or client promises.' };
      const aiText = await maybeAI(env, message, route);
      const reply = aiText || `Command received. Routing to ${route.primary}; secondary review: ${route.secondary}. Task: ${route.task}. ${route.approval_required ? 'Approval required before external/public action.' : 'Queued as internal operator task.'}`;
      await log(env, 'chat_command', receipt);
      await createTask(env, route.task, route.primary, receipt);
      const connector_events = [];
      for (const candidate of inferConnectorEvents(message, route, receipt)) connector_events.push(await createConnectorEvent(env, candidate));
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.brain.chat', {receipt_id:receipt.id, route, approval_required:route.approval_required, social_intent:route.social_intent, message_preview:message.slice(0,500)}, authContext));
      let approval_email = null;
      if (route.approval_required) approval_email = await sendApprovalNotification(env, receipt);
      if (route.social_intent) await createSocialDraft(env, {source_command:receipt.id, topic:message, draft:`Draft requested: ${message}`, status:'draft_pending_approval'});
      return Response.json({ok:true, reply, receipt, approval_email, connector_events}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/task' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const task = await createTask(env, body.title || 'Untitled admin task', body.owner || 'Site Operator Brain', body);
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.task.create', {task_id:task.id, title:task.title, owner:task.owner, approval_required:Boolean(body.approval_required || body.requires_approval)}, authContext));
      let approval_email = null;
      if (body.approval_required || body.requires_approval) approval_email = await sendApprovalNotification(env, {id:task.id, title:task.title, owner:task.owner, message:body.message || body.description || task.title, status:'approval_required', route:{primary:task.owner, secondary:body.secondary || 'Site Operator Brain'}});
      return Response.json({ok:true, task, approval_email}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/social/draft' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const draft = await createSocialDraft(env, {...body, status:'draft_pending_approval'});
      const connector_event = await createConnectorEvent(env, {connector_type:'social_dispatch', action:'social.publish', item_id:draft.id, approval_required:true, payload:{platform:draft.platform, content:draft.content, topic:draft.topic, draft_id:draft.id}});
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.social.draft', {draft_id:draft.id, platform:draft.platform, status:draft.status, topic:draft.topic}, authContext));
      const approval_email = await sendApprovalNotification(env, {id:draft.id, message:draft.content || draft.topic || 'Social draft pending approval', status:'approval_required', route:{primary:'Valentina Reyes — Marketing & Brand Brain', secondary:'Victor Saint — QA Brain'}, platform:draft.platform});
      return Response.json({ok:true, draft, connector_event, approval_email}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/social/publish' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      if (!body.approved) return Response.json({ok:false,error:'Publish blocked: approved=true is required.'}, {status:403,headers:CORS});
      const event = await createConnectorEvent(env, {connector_type:'social_dispatch', action:'social.publish', item_id:body.item_id || body.draft_id || null, approval_required:false, payload:{platform:body.platform||'generic', content:body.text||body.content||'', metadata:body}});
      const dispatch = await dispatchConnectorEvent(env, event, authContext);
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.social.publish_attempt', {platform:body.platform||'generic', dispatch_status:dispatch.status || null, ok:dispatch.ok, event_id:event.id}, authContext));
      return Response.json({ok:dispatch.ok, dispatch}, {status:dispatch.ok ? 200 : 409, headers:CORS});
    }
    if (url.pathname === '/api/admin/approval' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const approval = await recordApproval(env, body, authContext);
      const dispatches = ['approved','override_approved'].includes(approval.decision) ? await dispatchApprovedItem(env, approval.item_id, authContext) : [];
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.approval.record', {approval_id:approval.id, item_id:approval.item_id, decision:approval.decision}, authContext));
      return Response.json({ok:true, approval, dispatches}, {headers:CORS});
    }

    if (url.pathname === '/api/admin/approval-email/test' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const testPayload = {id:crypto.randomUUID(), message:body.message || 'Test approval email from the Admin Automation Brain.', status:'approval_required', route:{primary:'Site Operator Brain', secondary:'Victor Saint — QA Brain'}};
      const approval_email = await sendApprovalNotification(env, testPayload);
      ctx?.waitUntil?.(mirrorPlatformEvent(env, 'admin.approval_email.test', {receipt_id:testPayload.id, sent:Boolean(approval_email.ok), status:approval_email.status || null}, authContext));
      return Response.json({ok:approval_email.ok, approval_email, testPayload}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/ledger') {
      if (!env.ADMIN_DB) {
        if (!env.ADMIN_KV) return Response.json({ok:true, ledger:[], note:'ADMIN_DB and ADMIN_KV not bound.'}, {headers:CORS});
        const list = await env.ADMIN_KV.list({limit:200});
        const ledger = [];
        for (const key of list.keys) ledger.push(await env.ADMIN_KV.get(key.name, 'json'));
        return Response.json({ok:true, ledger:ledger.filter(Boolean), mode:'kv_fallback'}, {headers:CORS});
      }
      const rows = await env.ADMIN_DB.prepare('select id,type,payload,created_at from audit_log order by created_at desc limit 200').all();
      return Response.json({ok:true, ledger:rows.results||[]}, {headers:CORS});
    }
    return Response.json({ok:false,error:'Not found',routes:['/api/admin/status','/api/admin/auth/introspect','/api/admin/brain/chat','/api/admin/task','/api/admin/social/draft','/api/admin/social/publish','/api/admin/connectors/status','/api/admin/connectors/event','/api/admin/connectors/dispatch','/api/admin/connectors/events','/api/admin/content-engine/activate','/api/admin/content-engine/dispatch','/api/admin/content-engine/runs','/api/admin/content-engine/run','/api/admin/content-engine/local-brain-feed','/api/admin/security/status','/api/admin/security/mfa/setup','/api/admin/security/mfa/verify','/api/admin/security/backup-codes/issue','/api/admin/security/override-session','/api/admin/secrets/rotate','/api/admin/secrets/rotations','/api/admin/approval','/api/admin/approval-email/test','/api/admin/ledger']}, {status:404, headers:CORS});
  },
  async queue(batch, env, ctx) {
    for (const message of batch.messages || []) {
      const body = message.body || {};
      try {
        if (body.kind === 'connector_event' && body.event_id) {
          const result = await dispatchConnectorEvent(env, body.event_id, {actor:'admin-queue'});
          if (!result.ok && result.retry && typeof message.retry === 'function') message.retry({delaySeconds:60});
          else if (typeof message.ack === 'function') message.ack();
        } else if (typeof message.ack === 'function') {
          message.ack();
        }
      } catch (error) {
        await log(env, 'queue_processing_error', {message:body, error:error?.message || String(error)});
        if (typeof message.retry === 'function') message.retry({delaySeconds:120});
      }
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDueRotations(env));
  }
}
async function createSocialDraft(env, payload){
  const draft = { id:crypto.randomUUID(), content:payload.content || payload.draft || '', topic:payload.topic || '', platform:payload.platform || 'generic', status:payload.status || 'draft_pending_approval', payload, created_at:new Date().toISOString() };
  if (env.ADMIN_KV) await env.ADMIN_KV.put(`social_draft:${draft.id}`, JSON.stringify(draft));
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into social_drafts (id,platform,content,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(draft.id,draft.platform,draft.content,draft.status,JSON.stringify(payload),draft.created_at).run();
  if (env.ADMIN_QUEUE) await env.ADMIN_QUEUE.send({kind:'social_draft', draft});
  await log(env, 'social_draft', draft);
  return draft;
}
