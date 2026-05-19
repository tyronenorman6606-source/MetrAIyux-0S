/* app.js
 * kAIxu CodeStudio Pro — Platform Console + Executable Backend Bridge
 * Build: platform590-20260510 • 2026-05-10T23:39:00Z
 *
 * Non-negotiables:
 * - No external JS deps
 * - Strict CSP for main app (no inline scripts/styles, no eval)
 * - Offline-first PWA + update UX
 * - Secrets encrypted at rest (AES-256-GCM via WebCrypto)
 * - AI calls route ONLY via Kaixu Gateway
 * - Sandboxed code runner isolated in /sandbox (no same-origin)
 */

'use strict';

// ===== Build identity =====
const BUILD = Object.freeze({
  app: "kAIxu CodeStudio Pro",
  vendor: "SOLEnterprises",
  version: "5.9.0",
  schema: "codestudio-v5",
  buildId: "platform590-20260510",
  builtAt: "2026-05-10T23:39:00Z",
  gatewayBase: "https://kaixugateway13.netlify.app",
  gatewayChat: "https://kaixugateway13.netlify.app/.netlify/functions/gateway-chat",
});

// ===== DOM helpers (safe) =====
const $ = (id) => document.getElementById(id);

function el(tag, attrs = null, children = null){
  const node = document.createElement(tag);
  if (attrs){
    for (const [k,v] of Object.entries(attrs)){
      if (v === null || v === undefined) continue;
      if (k === 'class') node.className = String(v);
      else if (k === 'text') node.textContent = String(v);
      else if (k === 'htmlText') node.textContent = String(v); // explicit: no HTML injection
      else if (k === 'role') node.setAttribute('role', String(v));
      else if (k.startsWith('aria-')) node.setAttribute(k, String(v));
      else if (k === 'dataset' && v && typeof v === 'object'){
        for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
      }
      else if (k.startsWith('on') && typeof v === 'function'){
        node.addEventListener(k.slice(2), v);
      }
      else {
        node.setAttribute(k, String(v));
      }
    }
  }
  if (children !== null && children !== undefined){
    const arr = Array.isArray(children) ? children : [children];
    for (const ch of arr){
      if (ch === null || ch === undefined) continue;
      if (typeof ch === 'string') node.appendChild(document.createTextNode(ch));
      else node.appendChild(ch);
    }
  }
  return node;
}

function clear(node){
  while (node.firstChild) node.removeChild(node.firstChild);
}

function clamp(n, a, b){
  n = Number(n);
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function nowISO(){
  return new Date().toISOString();
}

function humanBytes(bytes){
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '0 B';
  const units = ['B','KB','MB','GB'];
  let u = 0; let v = n;
  while (v >= 1024 && u < units.length-1){ v/=1024; u++; }
  return `${v.toFixed(v>=10||u===0?0:1)} ${units[u]}`;
}

// ===== Toasts =====
const toastHost = $('toastHost');
let toastSeq = 0;

function toast(message, kind = 'success', detail = ''){
  const id = `t${++toastSeq}`;
  const dotClass = kind === 'error' ? 'bad' : (kind === 'warn' ? 'warn' : 'ok');
  const box = el('div', {class:`toast ${kind}`, dataset:{id}}, [
    el('span', {class:`dot ${dotClass}`}),
    el('div', {}, [
      el('b', {text: String(message)}),
      detail ? el('p', {text: String(detail)}) : el('p', {text: ''})
    ]),
    el('button', {
      class:'btn ghost mini',
      type:'button',
      'aria-label':'Dismiss toast',
      onclick: () => removeToast(id)
    }, 'Dismiss')
  ]);

  toastHost.appendChild(box);
  setTimeout(() => removeToast(id), 6000);
}

function removeToast(id){
  const node = toastHost.querySelector(`.toast[data-id="${CSS.escape(id)}"]`);
  if (node) node.remove();
}

// ===== IndexedDB (enterprise-safe wrapper) =====
const DB_NAME = 'kaixu_codestudio_pro';
const DB_VERSION = 3;

function idbOpen(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', {keyPath:'k'});
      if (!db.objectStoreNames.contains('audit')) db.createObjectStore('audit', {keyPath:'id', autoIncrement:true});
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', {keyPath:'ts'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kvGet(db, k){
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const req = store.get(k);
    req.onsuccess = () => resolve(req.result ? req.result.v : null);
    req.onerror = () => resolve(null);
  });
}

async function kvSet(db, k, v){
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    store.put({k, v});
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function kvDel(db, k){
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(k);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function auditWrite(db, type, data = null){
  const safe = sanitizeAuditData(data);
  return new Promise((resolve) => {
    const tx = db.transaction('audit', 'readwrite');
    tx.objectStore('audit').add({ts: Date.now(), type: String(type), data: safe});
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function auditList(db, limit = 500){
  limit = clamp(limit, 1, 5000);
  return new Promise((resolve) => {
    const out = [];
    const tx = db.transaction('audit', 'readonly');
    const store = tx.objectStore('audit');
    const req = store.openCursor(null, 'prev');
    req.onsuccess = () => {
      const cur = req.result;
      if (cur && out.length < limit){
        out.push(cur.value);
        cur.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => resolve(out);
  });
}

function sanitizeAuditData(data){
  // Never store secrets. Best-effort deep scrub.
  const blacklist = ['authorization','bearer','token','key','secret','password','passphrase'];
  const seen = new WeakSet();
  function walk(v){
    if (v === null || v === undefined) return v;
    if (typeof v === 'string') return v.length > 4000 ? v.slice(0, 4000) + '…' : v;
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (typeof v === 'bigint') return v.toString();
    if (typeof v === 'function') return `[Function]`;
    if (v instanceof Error) return {name:v.name, message:v.message, stack:String(v.stack||'').slice(0,8000)};
    if (Array.isArray(v)) return v.slice(0, 200).map(walk);
    if (typeof v === 'object'){
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      const o = {};
      for (const [k,val] of Object.entries(v)){
        const lk = String(k).toLowerCase();
        if (blacklist.some(b => lk.includes(b))) o[k] = '[REDACTED]';
        else o[k] = walk(val);
      }
      return o;
    }
    try{ return String(v); }catch(e){ return '[Unserializable]'; }
  }
  return walk(data);
}

// ===== Crypto vault (AES-256-GCM) =====
const b64 = {
  to(bytes){
    let bin = '';
    for (let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  },
  from(str){
    const bin = atob(String(str||''));
    const out = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return out;
  }
};

async function deriveKeyPBKDF2(passphrase, saltBytes, iterations){
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt: saltBytes, iterations: Number(iterations), hash:'SHA-256'},
    baseKey,
    {name:'AES-GCM', length:256},
    false,
    ['encrypt','decrypt']
  );
}

async function vaultSeal(passphrase, plaintextObj, kdf = null){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iters = kdf && kdf.iterations ? Number(kdf.iterations) : 600000;
  const key = await deriveKeyPBKDF2(passphrase, salt, iters);
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(plaintextObj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data));
  return {
    schema: 1,
    kdf: {alg:'PBKDF2', hash:'SHA-256', iterations: iters},
    salt_b64: b64.to(salt),
    iv_b64: b64.to(iv),
    ct_b64: b64.to(ct),
  };
}

async function vaultOpen(passphrase, sealed){
  const salt = b64.from(sealed.salt_b64);
  const iv = b64.from(sealed.iv_b64);
  const ct = b64.from(sealed.ct_b64);
  const iters = sealed.kdf && sealed.kdf.iterations ? Number(sealed.kdf.iterations) : 600000;
  const key = await deriveKeyPBKDF2(passphrase, salt, iters);
  const ptBytes = new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct));
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(ptBytes));
}

// ===== Workspace model =====
function makeId(){
  return crypto.getRandomValues(new Uint8Array(9)).reduce((a,b)=>a + b.toString(16).padStart(2,'0'), '');
}

function normalizeName(name){
  let s = String(name||'').trim();
  s = s.replace(/[\\\n\r\t]/g,' ').replace(/\s+/g,' ');
  s = s.replace(/[<>:"|?*]/g,'-'); // windows-reserved
  if (!s) s = 'untitled';
  if (s.length > 80) s = s.slice(0,80);
  return s;
}

function guessLang(name){
  const n = String(name||'').toLowerCase();
  if (n.endsWith('.html') || n.endsWith('.htm')) return 'html';
  if (n.endsWith('.css')) return 'css';
  if (n.endsWith('.js') || n.endsWith('.mjs')) return 'javascript';
  if (n.endsWith('.json')) return 'json';
  if (n.endsWith('.md')) return 'markdown';
  return 'text';
}

function defaultWorkspace(){
  const root = {id:'root', type:'folder', name:'Workspace', parentId:null, children:[]};
  const readme = {
    id: makeId(), type:'file', name:'README.md', parentId:'root',
    language:'markdown',
    content: `# kAIxu CodeStudio Pro

Build: platform590-20260510

- Offline-first workspace
- Encrypted Vault for Kaixu Gateway key
- JS runner isolated in a sandbox
- Platform Console for provider packs, policy rules, workflow templates, webhook replay, release gates, and upstream claim contracts

Shortcuts:
- Ctrl+O Commands
- Ctrl+K Vault
- Ctrl+F Find
- Ctrl+P Preview
- Ctrl+Enter Run
- Ctrl+H Health

Use the Platform button to materialize /platform manifests into this workspace.
`
  };
  const demo = {
    id: makeId(), type:'file', name:'demo.js', parentId:'root',
    language:'javascript',
    content: `console.log("kAIxu CodeStudio Pro — build platform590-20260510");
console.log("Sandbox is isolated; network is blocked by default.");
console.log("Open Platform Console to install workflow templates and provider manifests.");
`
  };
  const platformFolder = {id: makeId(), type:'folder', name:'platform', parentId:'root', children:[]};
  const platformReadmeSeed = {
    id: makeId(), type:'file', name:'README.md', parentId: platformFolder.id,
    language:'markdown',
    content: `# Platform Console

Open the Platform button to enable provider packs, create policy rules, install workflow templates, queue webhook events, save upstream claim samples, and materialize the /platform manifest files.

This app intentionally inherits auth from upstream systems. The local platform console stores contract manifests and receipts; live provider execution belongs in backend workers/functions.
`
  };
  platformFolder.children.push(platformReadmeSeed.id);
  root.children.push(readme.id, demo.id, platformFolder.id);
  return {
    schema: BUILD.schema,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    nodes: {
      [root.id]: root,
      [readme.id]: readme,
      [demo.id]: demo,
      [platformFolder.id]: platformFolder,
      [platformReadmeSeed.id]: platformReadmeSeed,
    },
  };
}

function deepClone(obj){
  return JSON.parse(JSON.stringify(obj));
}

// ===== App state =====
const state = {
  db: null,
  deviceId: null,
  online: navigator.onLine,
  sw: {registered:false, waiting:false},
  updateReady: false,

  // vault
  vaultSealed: null,
  vaultUnlocked: false,
  vaultSecret: null, // gateway key, in-memory only
  workspaceKey: null, // random key for workspace encryption (in-memory only)
  vaultMeta: null,   // decrypted object
  vaultLastActivity: Date.now(),
  vaultTimer: null,

  // settings
  settings: {
    policyTemplate: 'Team',
    aiModel: 'kaixu:smart',
    aiTemperature: 0.2,
    aiMaxTokens: 1200,
    vaultAutoLockMins: 15,
    workspaceEncrypt: false,  // encrypt workspace at rest; requires unlocked vault
  },

  // workspace
  ws: null,
  tabs: [],
  activeTab: null,
  explorerFilter: '',
  previewOpen: false,

  // assistant
  chat: [],
  aiBusy: false,

  // platform console
  platform: null,

  // terminal
  terminalOpen: false,
  terminalLogs: [],

  // modal
  modalOpen: false,
  modalKind: null,
  modalPayload: null,
};

// ===== Runner / sandbox integration =====
const previewFrame = $('previewFrame');
let previewHostReady = false;

function ensurePreviewHostLoaded(){
  if (!previewFrame.getAttribute('src')) {
    previewFrame.setAttribute('src', './sandbox/host.html');
  }
}

window.addEventListener('message', (ev) => {
  // Only accept messages from our iframe window reference (origin may be 'null' due to sandbox)
  if (!previewFrame || ev.source !== previewFrame.contentWindow) return;
  const data = ev.data || {};
  if (!data || !data.t) return;

  if (data.t === 'HOST_READY') {
    previewHostReady = true;
    logTerminal('info', `[sandbox] host ready`);
    return;
  }
  if (data.t === 'READY') {
    // stage-bridge ready
    return;
  }
  if (data.t === 'LOG') {
    const lvl = String(data.level || 'log');
    const args = Array.isArray(data.args) ? data.args : [data.args];
    logTerminal(lvl, args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    return;
  }
  if (data.t === 'ERROR') {
    const msg = String(data.message || 'Error');
    const stack = data.stack ? String(data.stack) : '';
    logTerminal('error', msg + (stack ? `\n${stack}` : ''));
    return;
  }
});

function postToSandbox(payload){
  if (!previewFrame || !previewFrame.contentWindow) return false;
  try{ previewFrame.contentWindow.postMessage(payload, '*'); return true; }catch(e){ return false; }
}

function sandboxClear(){
  ensurePreviewHostLoaded();
  postToSandbox({t:'CLEAR'});
}

function sandboxPreviewHTML(html){
  ensurePreviewHostLoaded();
  postToSandbox({t:'PREVIEW_HTML', html:String(html||'')});
}

function sandboxRunJS(code, filename){
  ensurePreviewHostLoaded();
  postToSandbox({t:'RUN_JS', code:String(code||''), filename:String(filename||'script.js')});
}

// ===== Terminal =====
const terminalEl = $('terminal');
const terminalLogsEl = $('terminalLogs');

function setTerminalOpen(open){
  state.terminalOpen = !!open;
  terminalEl.classList.toggle('show', state.terminalOpen);
}

function logTerminal(level, text){
  const lvl = String(level || 'log');
  const line = {
    ts: Date.now(),
    level: lvl,
    text: String(text || '')
  };
  state.terminalLogs.push(line);
  if (state.terminalLogs.length > 1200) state.terminalLogs.splice(0, state.terminalLogs.length - 1200);
  renderTerminal();
}

function renderTerminal(){
  clear(terminalLogsEl);
  for (const l of state.terminalLogs.slice(-400)){
    const cls = l.level === 'error' ? 'logLine logErr' : (l.level === 'warn' ? 'logLine' : 'logLine');
    const stamp = new Date(l.ts).toLocaleTimeString();
    const header = `[${stamp}] ${l.level.toUpperCase()} `;
    terminalLogsEl.appendChild(el('div', {class:cls}, [
      el('span', {class:'logDim', text: header}),
      el('span', {text: l.text})
    ]));
  }
  terminalLogsEl.scrollTop = terminalLogsEl.scrollHeight;
}

// ===== Vault auto-lock =====
function bumpActivity(){
  state.vaultLastActivity = Date.now();
}

function startAutoLockTimer(){
  if (state.vaultTimer) clearInterval(state.vaultTimer);
  state.vaultTimer = setInterval(() => {
    if (!state.vaultUnlocked) return;
    const mins = clamp(state.settings.vaultAutoLockMins, 1, 240);
    const idleMs = Date.now() - state.vaultLastActivity;
    if (idleMs > mins * 60_000){
      vaultLock('Auto-lock after inactivity');
    }
  }, 10_000);
}

async function vaultLock(reason = 'Locked'){
  state.vaultUnlocked = false;
  state.vaultSecret = null;
  state.workspaceKey = null;
  state.vaultMeta = null;
  await auditWrite(state.db, 'vault_lock', {reason});
  toast('Vault locked', 'warn', reason);
  renderPills();
  renderAssistantStatus();
}

async function vaultUnlockFlow(){
  const sealed = state.vaultSealed;
  if (!sealed) {
    openModal('vault_setup', {});
    return;
  }
  openModal('vault_unlock', {});
}

async function vaultSetup(passphrase, gatewayKey, workspaceEncrypt, policyTemplate){
  const pp = String(passphrase || '');
  const key = String(gatewayKey || '').trim();
  if (pp.length < 10) throw new Error('Passphrase must be at least 10 characters.');
  if (!key || key.length < 10) throw new Error('Gateway key looks too short.');
  const payload = {
    gatewayKey: key,
    workspaceKey: b64.to(crypto.getRandomValues(new Uint8Array(32))),
    createdAt: nowISO(),
    policyTemplate: policyTemplate || state.settings.policyTemplate,
    workspaceEncrypt: !!workspaceEncrypt
  };
  const sealed = await vaultSeal(pp, payload);
  state.vaultSealed = sealed;
  await kvSet(state.db, 'vault', sealed);
  await auditWrite(state.db, 'vault_setup', {workspaceEncrypt: !!workspaceEncrypt, policyTemplate: payload.policyTemplate});
  toast('Vault created', 'success', 'Your gateway key is encrypted at rest on this device.');
}

async function vaultUnlock(passphrase){
  const sealed = state.vaultSealed;
  if (!sealed) throw new Error('No vault exists.');
  const meta = await vaultOpen(String(passphrase||''), sealed);
  if (!meta || !meta.gatewayKey) throw new Error('Vault payload invalid.');
  state.vaultUnlocked = true;
  state.vaultSecret = String(meta.gatewayKey);
  state.workspaceKey = meta.workspaceKey ? String(meta.workspaceKey) : null;
  state.vaultMeta = meta;
  if (meta.workspaceEncrypt && !state.workspaceKey){
    // Legacy vault missing workspaceKey: disable workspace encryption to avoid lockout
    meta.workspaceEncrypt = false;
    toast('Vault upgraded', 'warn', 'Legacy vault lacks workspaceKey. Workspace encryption disabled until vault is recreated.');
  }
  bumpActivity();
  await auditWrite(state.db, 'vault_unlock', {policyTemplate: meta.policyTemplate, workspaceEncrypt: !!meta.workspaceEncrypt});
  toast('Vault unlocked', 'success', 'AI is enabled. Workspace encryption may apply.');
  // apply policy + workspace encryption preferences
  state.settings.policyTemplate = meta.policyTemplate || state.settings.policyTemplate;
  state.settings.workspaceEncrypt = !!meta.workspaceEncrypt;
  await kvSet(state.db, 'settings', state.settings);
  startAutoLockTimer();
  renderAll();
}

// ===== Policies (Team / Agency / Enterprise) =====
const POLICY = Object.freeze({
  Team: {
    badge:'Team',
    sys: `You are kAIxu, the SOLEnterprises code mentor. Be direct, accurate, and security-minded.\n- Prefer small, safe changes.\n- Explain errors clearly.\n- Never reveal secrets.\n`,
    aiMaxTokens: 1200,
    aiTemperature: 0.2,
    modelDefault: 'kaixu:smart'
  },
  Agency: {
    badge:'Agency',
    sys: `You are kAIxu for an agency environment.\n- Optimize for speed and correctness.\n- Provide implementation-ready output.\n- Never include secrets.\n`,
    aiMaxTokens: 1600,
    aiTemperature: 0.25,
    modelDefault: 'kaixu:smart'
  },
  Enterprise: {
    badge:'Enterprise',
    sys: `You are kAIxu in an enterprise setting.\n- Apply strict security + compliance posture.\n- Prefer deterministic, testable solutions.\n- Provide risk notes and rollout steps.\n- Never include secrets.\n`,
    aiMaxTokens: 1800,
    aiTemperature: 0.15,
    modelDefault: 'kaixu:deep'
  }
});

function applyPolicyTemplate(name, silent=false){
  const p = POLICY[name] || POLICY.Team;
  state.settings.policyTemplate = name in POLICY ? name : 'Team';
  state.settings.aiMaxTokens = p.aiMaxTokens;
  state.settings.aiTemperature = p.aiTemperature;
  state.settings.aiModel = p.modelDefault;
  $('badgePolicy').textContent = p.badge;
  kvSet(state.db, 'settings', state.settings).catch(()=>{});
  auditWrite(state.db, 'policy_apply', {name: state.settings.policyTemplate}).catch(()=>{});
  if (!silent){
    toast('Policy applied', 'success', state.settings.policyTemplate);
  }
  renderAssistantStatus();
}

function buildSystemPrompt(){
  const p = POLICY[state.settings.policyTemplate] || POLICY.Team;
  return p.sys + `\nApp: ${BUILD.app} ${BUILD.version} (${BUILD.schema})\nBuild: ${BUILD.buildId}\n`;
}

// ===== Gateway client (timeouts + error mapping) =====
async function fetchWithTimeout(url, options, timeoutMs){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {...options, signal: ctrl.signal});
    return res;
  } finally {
    clearTimeout(t);
  }
}

function extractAssistantText(payload){
  if (!payload) return '';
  // common shapes
  if (typeof payload.text === 'string') return payload.text;
  if (payload.result && typeof payload.result === 'string') return payload.result;
  if (payload.message && typeof payload.message === 'string') return payload.message;
  if (payload.choices && payload.choices[0]){
    const c = payload.choices[0];
    if (c.message && typeof c.message.content === 'string') return c.message.content;
    if (typeof c.text === 'string') return c.text;
  }
  if (payload.output && typeof payload.output === 'string') return payload.output;
  if (payload.data && typeof payload.data === 'string') return payload.data;
  return '';
}

function gatewayWhyBlocked(payload){
  if (!payload) return null;
  const direct = payload.why_blocked || payload.blocked_reason || payload.reason;
  if (direct) return String(direct);
  if (payload.error){
    if (typeof payload.error === 'string') return payload.error;
    if (typeof payload.error === 'object') {
      return payload.error.reason || payload.error.code || payload.error.message || null;
    }
  }
  return null;
}

function humanizeBlockReason(reason){
  const r = String(reason||'').toLowerCase();
  if (!r) return null;
  if (r.includes('cap') || r.includes('quota')) return 'Usage cap reached (quota).';
  if (r.includes('rate')) return 'Rate limited. Slow down or increase limits.';
  if (r.includes('model')) return 'Model not allowed by policy.';
  if (r.includes('device')) return 'Device limit reached.';
  if (r.includes('auth') || r.includes('token') || r.includes('key')) return 'Authentication failed (bad or revoked key).';
  return null;
}

async function callKaixu(userText){
  if (!state.vaultUnlocked || !state.vaultSecret){
    toast('Vault locked', 'warn', 'Unlock to use AI.');
    renderAssistantStatus('Vault locked. Unlock to use AI.');
    return;
  }
  if (!state.online){
    toast('Offline', 'warn', 'AI requires connectivity to Kaixu Gateway.');
    renderAssistantStatus('Offline. AI requires connectivity.');
    return;
  }

  const file = getActiveFile();
  const context = file ? `\n\n---\nACTIVE_FILE:${file.name}\nLANG:${file.language}\nCONTENT:\n${file.content}\n---\n` : '';
  const sys = buildSystemPrompt();

  const body = {
    mode: 'chat',
    model: state.settings.aiModel || 'kaixu:smart',
    temperature: clamp(state.settings.aiTemperature, 0, 1),
    max_tokens: clamp(state.settings.aiMaxTokens, 128, 8192),
    messages: [
      {role:'system', content: sys},
      {role:'user', content: String(userText||'') + context}
    ],
    metadata: {
      app: BUILD.app,
      vendor: BUILD.vendor,
      version: BUILD.version,
      schema: BUILD.schema,
      buildId: BUILD.buildId,
      deviceId: state.deviceId
    }
  };

  state.aiBusy = true;
  renderAssistantStatus('Sending…');
  bumpActivity();
  await auditWrite(state.db, 'ai_send', {
    model: body.model,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    hasFileContext: !!file,
    chars: String(userText||'').length
  });

  const headers = {
    'Content-Type':'application/json',
    'Authorization':'Bearer ' + state.vaultSecret
  };

  let res = null;
  let payload = null;
  try {
    // retry on network errors only (2 attempts)
    for (let attempt=1; attempt<=2; attempt++) {
      try {
        res = await fetchWithTimeout(BUILD.gatewayChat, {
          method:'POST',
          headers,
          body: JSON.stringify(body)
        }, 30000);
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 600));
      }
    }

    const text = await res.text();
    try { payload = text ? JSON.parse(text) : {}; } catch(e) { payload = {raw:text}; }

    if (!res.ok) {
      const why = gatewayWhyBlocked(payload) || `HTTP ${res.status}`;
      const friendly = humanizeBlockReason(why) || String(why);
      renderAssistantStatus(`Blocked: ${friendly}`);
      toast('AI blocked', 'error', friendly);
      await auditWrite(state.db, 'ai_blocked', {status: res.status, reason: why});
      return;
    }

    const out = extractAssistantText(payload);
    if (!out) {
      renderAssistantStatus('No content returned.');
      toast('AI response empty', 'warn', 'Gateway returned no content.');
      await auditWrite(state.db, 'ai_empty', {status: res.status});
      return;
    }

    appendChat('assistant', out);
    renderAssistantStatus('Done.');
    await auditWrite(state.db, 'ai_ok', {
      status: res.status,
      model: body.model,
      // best-effort usage fields
      usage: payload.usage || payload.tokens || null
    });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'Timeout' : (e && e.message ? e.message : String(e));
    renderAssistantStatus('Error: ' + msg);
    toast('AI error', 'error', msg);
    await auditWrite(state.db, 'ai_error', {error: msg});
  } finally {
    state.aiBusy = false;
  }
}

// ===== Chat =====
function appendChat(role, text){
  state.chat.push({id: makeId(), ts: Date.now(), role: String(role), text: String(text||'')});
  if (state.chat.length > 200) state.chat.splice(0, state.chat.length - 200);
  kvSet(state.db, 'chat', state.chat).catch(()=>{});
  renderChat();
}

function renderChat(){
  const chatEl = $('chat');
  clear(chatEl);
  for (const msg of state.chat){
    const who = msg.role === 'user' ? 'You' : 'kAIxu';
    const cls = msg.role === 'user' ? 'chatMsg user' : 'chatMsg assistant';
    const stamp = new Date(msg.ts).toLocaleString();
    chatEl.appendChild(el('div', {class: cls}, [
      el('div', {class:'chatHdr'}, [
        el('b', {text: who}),
        el('span', {text: stamp})
      ]),
      el('div', {class:'chatBody', text: msg.text})
    ]));
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderAssistantStatus(text = null){
  const s = $('aiStatus');
  if (text !== null) s.textContent = String(text);
  else s.textContent = state.aiBusy ? 'Working…' : (state.vaultUnlocked ? 'Ready.' : 'Vault locked.');
}

// ===== Workspace encryption layer (optional) =====
async function wsMaybeEncrypt(ws){
  if (!state.settings.workspaceEncrypt) return ws;
  if (!state.vaultUnlocked || !state.vaultSecret || !state.vaultMeta) throw new Error('Workspace encryption requires unlocked vault.');
  // Encrypt entire workspace JSON as ct_b64, keep minimal header for detection
  if (!state.workspaceKey) throw new Error('Workspace key missing (vault payload).');
  const sealed = await vaultSeal(state.workspaceKey, ws, {iterations: 120000});
  return {encrypted:true, sealed};
}

async function wsMaybeDecrypt(stored){
  if (!stored) return null;
  if (stored.encrypted && stored.sealed){
    if (!state.vaultUnlocked || !state.vaultSecret) throw new Error('Workspace is encrypted. Unlock the vault to open.');
    if (!state.workspaceKey) throw new Error('Workspace key missing (vault payload).');
    const ws = await vaultOpen(state.workspaceKey, stored.sealed);
    return ws;
  }
  return stored;
}

// ===== Workspace persistence =====
async function loadWorkspace(){
  const raw = await kvGet(state.db, 'workspace');
  if (!raw) {
    state.ws = defaultWorkspace();
    await saveWorkspace('init');
    return;
  }
  // If encrypted, we may need vault unlocked. If locked, show locked state.
  try {
    state.ws = await wsMaybeDecrypt(raw);
  } catch (e) {
    state.ws = null;
    toast('Workspace locked', 'warn', 'Unlock vault to access encrypted workspace.');
    await auditWrite(state.db, 'workspace_locked', {reason: String(e.message||e)});
  }
}

async function saveWorkspace(reason='save'){
  if (!state.ws) return;
  state.ws.updatedAt = nowISO();
  let toStore = null;
  try{
    toStore = await wsMaybeEncrypt(state.ws);
  }catch(e){
    // Encryption enabled but vault unavailable — do not write partial/unsafe state.
    await auditWrite(state.db, 'workspace_save_blocked', {reason, error: (e && e.message) ? e.message : String(e)});
    toast('Save blocked', 'warn', 'Workspace encryption is enabled. Unlock vault to save.');
    return;
  }
  await kvSet(state.db, 'workspace', toStore);
  await auditWrite(state.db, 'workspace_save', {reason});
}

async function migrateLegacyLocalStorage(){
  // Pull older versions if present
  const legacy = localStorage.getItem('kaixu_fs_v4');
  if (!legacy) return false;
  try {
    const parsed = JSON.parse(legacy);
    if (parsed && parsed.nodes){
      await kvSet(state.db, 'workspace', parsed);
      localStorage.removeItem('kaixu_fs_v4');
      await auditWrite(state.db, 'migrate_localstorage', {from:'kaixu_fs_v4'});
      toast('Migrated workspace', 'success', 'Imported legacy localStorage workspace.');
      return true;
    }
  } catch (e) {}
  return false;
}

// ===== Workspace ops =====
function getNode(id){
  if (!state.ws) return null;
  return state.ws.nodes[id] || null;
}
function getRoot(){
  return getNode('root');
}

function getActiveFile(){
  if (!state.ws) return null;
  if (!state.activeTab) return null;
  const n = getNode(state.activeTab);
  if (n && n.type === 'file') return n;
  return null;
}

function setActiveTab(fileId){
  if (!fileId) return;
  if (!state.tabs.includes(fileId)) state.tabs.push(fileId);
  state.activeTab = fileId;
  kvSet(state.db, 'tabs', {tabs: state.tabs, active: state.activeTab}).catch(()=>{});
  renderTabs();
  renderEditor();
}

function closeTab(fileId){
  state.tabs = state.tabs.filter(t => t !== fileId);
  if (state.activeTab === fileId) state.activeTab = state.tabs[state.tabs.length-1] || null;
  kvSet(state.db, 'tabs', {tabs: state.tabs, active: state.activeTab}).catch(()=>{});
  renderTabs();
  renderEditor();
}

function findParent(id){
  const n = getNode(id);
  if (!n || !n.parentId) return null;
  return getNode(n.parentId);
}

function createFile(parentId, name){
  const p = getNode(parentId);
  if (!p || p.type !== 'folder') throw new Error('Invalid folder.');
  const nm = normalizeName(name);
  const id = makeId();
  const node = {id, type:'file', name:nm, parentId: p.id, language: guessLang(nm), content:''};
  state.ws.nodes[id] = node;
  p.children.push(id);
  auditWrite(state.db, 'create_file', {name: nm}).catch(()=>{});
  saveWorkspace('create_file').catch(()=>{});
  renderTree();
  setActiveTab(id);
}

function createFolder(parentId, name){
  const p = getNode(parentId);
  if (!p || p.type !== 'folder') throw new Error('Invalid folder.');
  const nm = normalizeName(name);
  const id = makeId();
  const node = {id, type:'folder', name:nm, parentId: p.id, children:[]};
  state.ws.nodes[id] = node;
  p.children.push(id);
  auditWrite(state.db, 'create_folder', {name: nm}).catch(()=>{});
  saveWorkspace('create_folder').catch(()=>{});
  renderTree();
}

function deleteNode(id){
  const n = getNode(id);
  if (!n || n.id === 'root') return;
  const parent = findParent(id);
  if (parent && parent.children) parent.children = parent.children.filter(c => c !== id);

  // recursive delete
  const toDelete = [];
  (function walk(x){
    const node = getNode(x);
    if (!node) return;
    toDelete.push(x);
    if (node.type === 'folder' && Array.isArray(node.children)){
      for (const c of node.children) walk(c);
    }
  })(id);

  for (const d of toDelete) delete state.ws.nodes[d];
  state.tabs = state.tabs.filter(t => !toDelete.includes(t));
  if (toDelete.includes(state.activeTab)) state.activeTab = state.tabs[state.tabs.length-1] || null;

  auditWrite(state.db, 'delete_node', {id, count: toDelete.length}).catch(()=>{});
  saveWorkspace('delete').catch(()=>{});
  renderAll();
}

function renameNode(id, newName){
  const n = getNode(id);
  if (!n || n.id === 'root') return;
  const nm = normalizeName(newName);
  n.name = nm;
  if (n.type === 'file') n.language = guessLang(nm);
  auditWrite(state.db, 'rename_node', {id, name: nm}).catch(()=>{});
  saveWorkspace('rename').catch(()=>{});
  renderAll();
}

// ===== Render: pills, tree, tabs, editor =====
function renderPills(){
  // online
  $('dotOnline').className = 'dot ' + (state.online ? 'ok' : 'bad');
  $('txtOnline').textContent = state.online ? 'Online' : 'Offline';

  // vault
  const has = !!state.vaultSealed;
  const unlocked = state.vaultUnlocked && !!state.vaultSecret;
  $('dotVault').className = 'dot ' + (unlocked ? 'ok' : (has ? 'warn' : 'bad'));
  $('txtVault').textContent = unlocked ? 'Vault unlocked' : (has ? 'Vault locked' : 'No vault');

  // update
  $('pillUpdate').classList.toggle('hidden', !state.updateReady);
  $('pillUpdate').classList.toggle('warnBorder', state.updateReady);

  // vault icon on button
  $('btnVault').querySelector('.i').setAttribute('data-icon', unlocked ? 'unlock' : 'lock');
}

function renderTree(){
  const tree = $('tree');
  clear(tree);

  if (!state.ws){
    tree.appendChild(el('div', {class:'small'}, 'Workspace locked. Unlock vault to open.'));
    return;
  }

  const filter = String(state.explorerFilter || '').toLowerCase().trim();

  function visible(node){
    if (!filter) return true;
    return String(node.name||'').toLowerCase().includes(filter);
  }

  function rowFor(node, depth){
    const indent = '•'.repeat(Math.min(depth, 8));
    const meta = node.type === 'folder' ? `${(node.children||[]).length}` : node.language;
    const active = node.type === 'file' && node.id === state.activeTab;

    const item = el('div', {
      class: 'treeItem' + (active ? ' active' : ''),
      role: 'treeitem',
      'aria-label': node.name,
      onclick: () => {
        bumpActivity();
        if (node.type === 'file') setActiveTab(node.id);
      }
    }, [
      el('span', {class:'meta', text: indent ? indent + ' ' : ''}),
      el('span', {class:'name', text: node.name}),
      el('span', {class:'meta', text: meta})
    ]);

    // context actions
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openModal('node_menu', {id: node.id});
    });

    return item;
  }

  function walk(folderId, depth){
    const folder = getNode(folderId);
    if (!folder || folder.type !== 'folder') return;
    for (const cid of folder.children || []){
      const child = getNode(cid);
      if (!child) continue;

      const match = visible(child);
      const isFolder = child.type === 'folder';

      if (match) tree.appendChild(rowFor(child, depth));
      if (isFolder) walk(child.id, depth+1);
    }
  }

  walk('root', 0);
}

function renderTabs(){
  const tabsEl = $('tabs');
  clear(tabsEl);
  if (!state.ws) return;

  for (const id of state.tabs){
    const n = getNode(id);
    if (!n || n.type !== 'file') continue;
    const active = id === state.activeTab;
    const tab = el('div', {class: 'tab' + (active ? ' active' : ''), role:'tab'}, [
      el('span', {text: n.name}),
      el('span', {
        class:'x',
        role:'button',
        'aria-label':'Close tab',
        onclick:(ev)=>{ ev.stopPropagation(); closeTab(id); }
      }, '×')
    ]);
    tab.addEventListener('click', () => setActiveTab(id));
    tabsEl.appendChild(tab);
  }
}

function renderGutter(text){
  const gutter = $('gutter');
  clear(gutter);
  const lines = String(text||'').split('\n').length;
  for (let i=1;i<=lines;i++){
    gutter.appendChild(el('div', {text: String(i)}));
  }
}

function renderEditor(){
  const codeArea = $('codeArea');
  if (!state.ws){
    codeArea.value = '';
    renderGutter('');
    return;
  }
  const file = getActiveFile();
  if (!file){
    codeArea.value = '';
    renderGutter('');
    return;
  }
  if (codeArea.value !== file.content) codeArea.value = file.content;
  renderGutter(file.content);

  // preview status
  if (state.previewOpen){
    $('previewWrap').classList.remove('hidden');
    $('codeWrap').classList.add('hidden');
  } else {
    $('previewWrap').classList.add('hidden');
    $('codeWrap').classList.remove('hidden');
  }
}

function renderAll(){
  renderPills();
  renderTree();
  renderTabs();
  renderEditor();
  renderChat();
  renderAssistantStatus();
  renderTerminal();
}


function setEditorFontPreset(preset){
  // preset: small/medium/large
  const root = document.body;
  root.classList.remove('font-small','font-medium','font-large');
  if (preset === 'small') root.classList.add('font-small');
  else if (preset === 'large') root.classList.add('font-large');
  else root.classList.add('font-medium');
}

// ===== Modal system (single host modal) =====
const backdrop = $('backdrop');
const modalTitle = $('modalTitle');
const modalBody = $('modalBody');
const btnModalClose = $('btnModalClose');

function openModal(kind, payload){
  state.modalOpen = true;
  state.modalKind = String(kind);
  state.modalPayload = payload || {};
  backdrop.classList.add('show');
  backdrop.setAttribute('aria-hidden','false');
  renderModal();
}

function closeModal(){
  state.modalOpen = false;
  state.modalKind = null;
  state.modalPayload = null;
  backdrop.classList.remove('show');
  backdrop.setAttribute('aria-hidden','true');
  clear(modalBody);
}

btnModalClose.addEventListener('click', closeModal);
backdrop.addEventListener('click', (ev) => {
  if (ev.target === backdrop) closeModal();
});

function renderModal(){
  clear(modalBody);

  const kind = state.modalKind;
  if (!kind) return;

  if (kind === 'commands'){
    modalTitle.textContent = 'Command Palette';
    renderCommandsModal();
    return;
  }

  if (kind === 'find'){
    modalTitle.textContent = 'Find / Replace';
    renderFindModal();
    return;
  }

  if (kind === 'vault_setup'){
    modalTitle.textContent = 'Secure Vault • Create';
    renderVaultSetupModal();
    return;
  }

  if (kind === 'vault_unlock'){
    modalTitle.textContent = 'Secure Vault • Unlock';
    renderVaultUnlockModal();
    return;
  }


  if (kind === 'create'){
    modalTitle.textContent = state.modalPayload.kind === 'folder' ? 'Create folder' : 'Create file';
    renderCreateModal(state.modalPayload.kind);
    return;
  }
  if (kind === 'settings'){
    modalTitle.textContent = 'Settings';
    renderSettingsModal();
    return;
  }

  if (kind === 'platform'){
    modalTitle.textContent = 'Platform Console';
    renderPlatformModal();
    return;
  }

  if (kind === 'tutorial'){
    modalTitle.textContent = 'Tutorial / Getting Started';
    renderTutorialModal(state.modalPayload || {});
    return;
  }

  if (kind === 'about'){
    modalTitle.textContent = 'About / Health';
    renderAboutModal();
    return;
  }

  if (kind === 'node_menu'){
    modalTitle.textContent = 'File Actions';
    renderNodeMenuModal(state.modalPayload);
    return;
  }

  if (kind === 'confirm'){
    modalTitle.textContent = state.modalPayload.title || 'Confirm';
    renderConfirmModal(state.modalPayload);
    return;
  }

  modalTitle.textContent = 'Modal';
  modalBody.appendChild(el('div',{class:'small', text:'Unknown modal.'}));
}

function renderConfirmModal({message, confirmText, danger, onConfirm}){
  modalBody.appendChild(el('div',{class:'small', text:String(message||'Are you sure?')}));
  modalBody.appendChild(el('div',{class:'hr'}));
  const row = el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: closeModal}, 'Cancel'),
    el('button',{class:'btn ' + (danger?'danger':'primary'), type:'button', onclick: async ()=>{ try{ await onConfirm(); } finally { closeModal(); } }}, String(confirmText||'Confirm'))
  ]);
  modalBody.appendChild(row);
}

// ===== Commands =====
const COMMANDS = [
  {id:'vault', name:'Open Secure Vault', hint:'Unlock / Lock / Create vault', shortcut:'Ctrl+K', run: () => vaultUnlockFlow()},
  {id:'preview', name:'Toggle Preview', hint:'Preview sanitized HTML', shortcut:'Ctrl+P', run: () => togglePreview()},
  {id:'run', name:'Run Active File', hint:'Runs JS in sandbox', shortcut:'Ctrl+Enter', run: () => runActive()},
  {id:'find', name:'Find / Replace', hint:'Search within active file', shortcut:'Ctrl+F', run: () => openModal('find',{})},
  {id:'export', name:'Export Workspace', hint:'Downloads JSON export', shortcut:'Ctrl+Shift+E', run: () => exportWorkspace()},
  {id:'import', name:'Import Workspace', hint:'Loads JSON export', shortcut:'Ctrl+Shift+I', run: () => importWorkspace()},
  {id:'about', name:'About / Health', hint:'Diagnostics + exports', shortcut:'Ctrl+H', run: () => openModal('about',{})},
  {id:'tutorial', name:'Tutorial / Getting Started', hint:'Show the in-app walkthrough', shortcut:'', run: () => openModal('tutorial', {firstRun:false})},
  {id:'platform', name:'Platform Console', hint:'Provider packs, policies, workflows, webhooks, release gates', shortcut:'', run: () => openModal('platform', {})},
  {id:'terminal', name:'Toggle Terminal', hint:'Show sandbox logs', shortcut:'Ctrl+`', run: () => setTerminalOpen(!state.terminalOpen)},
];

function renderCommandsModal(){
  const input = el('input',{class:'input', id:'cmdSearch', placeholder:'Type a command…', autocomplete:'off'});
  const list = el('div',{class:'list', id:'cmdList'});

  function draw(){
    clear(list);
    const q = String(input.value||'').toLowerCase().trim();
    const items = COMMANDS.filter(c => !q || (c.name.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)));
    if (!items.length){
      list.appendChild(el('div',{class:'listItem'}, el('span',{class:'small', text:'No matches.'})));
      return;
    }
    for (const c of items){
      const li = el('div',{class:'listItem', role:'button', tabindex:'0', onclick: ()=>{ closeModal(); c.run(); }},[
        el('div',{class:'left'},[
          el('b',{text:c.name}),
          el('span',{text:c.hint})
        ]),
        el('span',{class:'kbd', text:c.shortcut || ''})
      ]);
      li.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ closeModal(); c.run(); }});
      list.appendChild(li);
    }
  }

  input.addEventListener('input', draw);
  modalBody.appendChild(input);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(list);
  draw();
  setTimeout(()=>input.focus(), 20);
}

// ===== Find / Replace =====
function renderFindModal(){
  const file = getActiveFile();
  if (!file){
    modalBody.appendChild(el('div',{class:'small', text:'Open a file to use Find/Replace.'}));
    return;
  }

  const findInput = el('input',{class:'input', placeholder:'Find…', autocomplete:'off'});
  const replInput = el('input',{class:'input', placeholder:'Replace…', autocomplete:'off'});

  const status = el('div',{class:'small', text:''});
  const row = el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: ()=>doFindNext()}, 'Find next'),
    el('button',{class:'btn ghost', type:'button', onclick: ()=>doReplaceOne()}, 'Replace'),
    el('button',{class:'btn primary', type:'button', onclick: ()=>doReplaceAll()}, 'Replace all'),
  ]);

  modalBody.appendChild(findInput);
  modalBody.appendChild(replInput);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(row);
  modalBody.appendChild(status);

  function doFindNext(){
    const q = String(findInput.value||'');
    if (!q){ status.textContent = 'Enter text to find.'; return; }
    const area = $('codeArea');
    const text = area.value;
    const start = area.selectionEnd || 0;
    const idx = text.indexOf(q, start);
    const idx2 = idx >= 0 ? idx : text.indexOf(q, 0);
    if (idx2 < 0){ status.textContent = 'No match.'; return; }
    area.focus();
    area.setSelectionRange(idx2, idx2 + q.length);
    status.textContent = `Match at ${idx2}.`;
  }

  function doReplaceOne(){
    const q = String(findInput.value||'');
    const r = String(replInput.value||'');
    const area = $('codeArea');
    const text = area.value;
    const sel = text.slice(area.selectionStart, area.selectionEnd);
    if (sel !== q){ doFindNext(); return; }
    const before = text.slice(0, area.selectionStart);
    const after = text.slice(area.selectionEnd);
    const next = before + r + after;
    area.value = next;
    syncEditorToState();
    const pos = before.length + r.length;
    area.setSelectionRange(pos, pos);
    status.textContent = 'Replaced one.';
  }

  function doReplaceAll(){
    const q = String(findInput.value||'');
    if (!q){ status.textContent = 'Enter text to find.'; return; }
    const r = String(replInput.value||'');
    const area = $('codeArea');
    const text = area.value;
    const next = text.split(q).join(r);
    const count = (text.length - next.length) / Math.max(1, (q.length - r.length));
    area.value = next;
    syncEditorToState();
    status.textContent = 'Replaced all.';
  }

  setTimeout(()=>findInput.focus(), 20);
}

// ===== Vault modals =====
function renderVaultSetupModal(){
  const pass = el('input',{class:'input', placeholder:'New passphrase (10+ chars)', type:'password', autocomplete:'new-password'});
  const key = el('input',{class:'input', placeholder:'Kaixu Gateway sub-key', type:'password', autocomplete:'off'});
  const template = el('select',{class:'select'},[
    el('option',{value:'Team', text:'Team'}),
    el('option',{value:'Agency', text:'Agency'}),
    el('option',{value:'Enterprise', text:'Enterprise'}),
  ]);
  template.value = state.settings.policyTemplate;

  const encToggle = el('input',{type:'checkbox', id:'wsEncToggle'});
  encToggle.checked = !!state.settings.workspaceEncrypt;

  const encRow = el('label',{class:'row', for:'wsEncToggle'},[
    encToggle,
    el('span',{class:'small', text:'Encrypt workspace at rest (requires vault unlock on launch)'}),
  ]);

  const status = el('div',{class:'small', text:''});

  const btn = el('button',{class:'btn primary', type:'button', onclick: async ()=>{
    try{
      await vaultSetup(pass.value, key.value, encToggle.checked, template.value);
      await vaultUnlock(pass.value);
      closeModal();
    }catch(e){
      status.textContent = e && e.message ? e.message : String(e);
    }
  }}, 'Create vault');

  modalBody.appendChild(el('div',{class:'small', text:'Your gateway key is encrypted locally. Passphrase is never stored.'}));
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(pass);
  modalBody.appendChild(key);
  modalBody.appendChild(el('div',{class:'row'},[
    el('div',{class:'col', style:null},[
      el('div',{class:'small', text:'Policy template'}),
      template
    ])
  ]));
  modalBody.appendChild(encRow);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: closeModal}, 'Cancel'),
    btn
  ]));
  modalBody.appendChild(status);
  setTimeout(()=>pass.focus(), 20);
}

function renderVaultUnlockModal(){
  const pass = el('input',{class:'input', placeholder:'Passphrase', type:'password', autocomplete:'current-password'});
  const status = el('div',{class:'small', text:''});

  const btnUnlock = el('button',{class:'btn primary', type:'button', onclick: async ()=>{
    try{
      await vaultUnlock(pass.value);
      closeModal();
    }catch(e){
      status.textContent = 'Unlock failed. Check passphrase.';
      await auditWrite(state.db,'vault_unlock_fail',{});
    }
  }}, 'Unlock');

  const btnLock = el('button',{class:'btn ghost', type:'button', onclick: ()=>vaultLock('User action')}, 'Lock vault');

  modalBody.appendChild(el('div',{class:'small', text:'Unlock to use AI and (optionally) encrypted workspace.'}));
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(pass);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(el('div',{class:'row'},[
    btnLock,
    el('div',{class:'spacer'}),
    btnUnlock
  ]));
  modalBody.appendChild(status);
  setTimeout(()=>pass.focus(), 20);
}

// ===== Node actions =====
function renderNodeMenuModal({id}){
  const node = getNode(id);
  if (!node){
    modalBody.appendChild(el('div',{class:'small', text:'Not found.'}));
    return;
  }

  const title = el('div',{class:'small', text:`Selected: ${node.name}`});
  const rename = el('button',{class:'btn ghost', type:'button', onclick: ()=>{
    const inp = el('input',{class:'input', placeholder:'New name…', value: node.name});
    clear(modalBody);
    modalTitle.textContent = 'Rename';
    modalBody.appendChild(inp);
    modalBody.appendChild(el('div',{class:'hr'}));
    modalBody.appendChild(el('div',{class:'row'},[
      el('button',{class:'btn ghost', type:'button', onclick: ()=>openModal('node_menu',{id})}, 'Back'),
      el('button',{class:'btn primary', type:'button', onclick: ()=>{ renameNode(id, inp.value); closeModal(); }}, 'Rename')
    ]));
    setTimeout(()=>inp.focus(),20);
  }}, 'Rename');

  const del = el('button',{class:'btn ghost danger', type:'button', onclick: ()=>{
    openModal('confirm', {
      title: 'Delete',
      message: `Delete ${node.type} “${node.name}”? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
      onConfirm: async ()=>deleteNode(id)
    });
  }}, 'Delete');

  modalBody.appendChild(title);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(el('div',{class:'row'},[
    rename,
    del
  ]));
}

// ===== Settings =====
function renderSettingsModal(){
  const p = el('select',{class:'select'},[
    el('option',{value:'Team', text:'Team'}),
    el('option',{value:'Agency', text:'Agency'}),
    el('option',{value:'Enterprise', text:'Enterprise'}),
  ]);
  p.value = state.settings.policyTemplate;

  const model = el('select',{class:'select'},[
    el('option',{value:'kaixu:smart', text:'kaixu:smart'}),
    el('option',{value:'kaixu:fast', text:'kaixu:fast'}),
    el('option',{value:'kaixu:deep', text:'kaixu:deep'}),
  ]);
  model.value = state.settings.aiModel;

  const temp = el('input',{class:'input', type:'number', min:'0', max:'1', step:'0.05', value:String(state.settings.aiTemperature)});
  const maxTok = el('input',{class:'input', type:'number', min:'128', max:'8192', step:'64', value:String(state.settings.aiMaxTokens)});

  const lockMins = el('input',{class:'input', type:'number', min:'1', max:'240', step:'1', value:String(state.settings.vaultAutoLockMins)});
  const enc = el('input',{type:'checkbox'});
  enc.checked = !!state.settings.workspaceEncrypt;

  const font = el('select',{class:'select'},[
    el('option',{value:'small', text:'Small'}),
    el('option',{value:'medium', text:'Medium'}),
    el('option',{value:'large', text:'Large'}),
  ]);
  font.value = state.settings.editorFontPreset || 'medium';

  modalBody.appendChild(el('div',{class:'grid2'},[
    el('div',{class:'col'},[
      el('b',{text:'Policy'}),
      el('div',{class:'small', text:'Applies prompt discipline + defaults.'}),
      p,
      el('button',{class:'btn ghost', type:'button', onclick: ()=>applyPolicyTemplate(p.value)}, 'Apply policy')
    ]),
    el('div',{class:'col'},[
      el('b',{text:'Editor'}),
      el('div',{class:'small', text:'Font size preset.'}),
      font
    ])
  ]));

  modalBody.appendChild(el('div',{class:'hr'}));

  modalBody.appendChild(el('div',{class:'grid2'},[
    el('div',{class:'col'},[
      el('b',{text:'AI'}),
      el('div',{class:'small', text:'Model + generation parameters.'}),
      model,
      temp,
      maxTok
    ]),
    el('div',{class:'col'},[
      el('b',{text:'Security'}),
      el('div',{class:'small', text:'Auto-lock and data encryption.'}),
      lockMins,
      el('label',{class:'row'},[
        enc,
        el('span',{class:'small', text:'Encrypt workspace at rest'})
      ])
    ])
  ]));

  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: closeModal}, 'Close'),
    el('button',{class:'btn primary', type:'button', onclick: async ()=>{
      state.settings.policyTemplate = p.value;
      state.settings.aiModel = model.value;
      state.settings.aiTemperature = clamp(temp.value, 0, 1);
      state.settings.aiMaxTokens = clamp(maxTok.value, 128, 8192);
      state.settings.vaultAutoLockMins = clamp(lockMins.value, 1, 240);
      state.settings.workspaceEncrypt = !!enc.checked;
      state.settings.editorFontPreset = font.value;
      setEditorFontPreset(font.value);

      await kvSet(state.db, 'settings', state.settings);
      await auditWrite(state.db, 'settings_save', {policy: state.settings.policyTemplate});
      $('aiModel').value = state.settings.aiModel;
      applyPolicyTemplate(state.settings.policyTemplate);
      closeModal();

      // If workspace encryption toggled on, require vault unlocked then re-save workspace encrypted.
      if (state.settings.workspaceEncrypt){
        if (!state.vaultUnlocked || !state.vaultSecret){
          toast('Workspace encryption', 'warn', 'Unlock vault then re-save to encrypt workspace.');
        } else {
          await saveWorkspace('encrypt_workspace');
          toast('Workspace encrypted', 'success', 'Workspace was sealed and saved.');
        }
      } else {
        // store plaintext on next save
        await saveWorkspace('decrypt_workspace');
      }
    }}, 'Save')
  ]));
}


// ===== Platform Console =====
const PROVIDER_PACKS = Object.freeze([
  {id:'stripe', title:'Stripe Payments', lane:'payments', requiredSecrets:['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'], routes:['checkout.create','invoice.send','webhook.payment'], backend:'server/adapters/provider-registry.mjs#StripeAdapter'},
  {id:'resend', title:'Resend Email', lane:'email', requiredSecrets:['RESEND_API_KEY'], routes:['email.send','email.sequence','webhook.email'], backend:'server/adapters/provider-registry.mjs#ResendAdapter'},
  {id:'twilio', title:'Twilio Messaging', lane:'sms_voice', requiredSecrets:['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'], routes:['sms.send','voice.call','webhook.message'], backend:'server/adapters/provider-registry.mjs#TwilioAdapter'},
  {id:'cloudflare', title:'Cloudflare Platform', lane:'infra', requiredSecrets:['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN'], routes:['r2.object','d1.query','queue.publish','worker.deploy'], backend:'server/adapters/provider-registry.mjs#CloudflareAdapter'},
  {id:'neon', title:'Neon Postgres', lane:'database', requiredSecrets:['DATABASE_URL'], routes:['db.query','db.migrate','db.snapshot'], backend:'server/adapters/provider-registry.mjs#NeonAdapter'},
  {id:'netlify', title:'Netlify Deploy', lane:'deploy', requiredSecrets:['NETLIFY_AUTH_TOKEN','NETLIFY_SITE_ID'], routes:['deploy.trigger','site.status','function.invoke'], backend:'server/adapters/provider-registry.mjs#NetlifyAdapter'},
  {id:'openai_gateway', title:'Kaixu AI Gateway', lane:'ai', requiredSecrets:['KAIXU_GATEWAY_SUBKEY'], routes:['ai.chat','ai.summarize','ai.classify'], backend:'server/adapters/provider-registry.mjs#AIGatewayAdapter'},
  {id:'google_ops', title:'Google Ops', lane:'docs_calendar', requiredSecrets:['GOOGLE_SERVICE_ACCOUNT_JSON'], routes:['drive.save','calendar.book','sheet.append'], backend:'server/adapters/provider-registry.mjs#GoogleOpsAdapter'},
]);

const WORKFLOW_TEMPLATES = Object.freeze([
  {id:'send_invoice', title:'Send invoice', category:'Money', requiredProviders:['stripe','resend'], steps:['create_invoice','email_payment_link','write_receipt'], output:'payment_link'},
  {id:'qualify_lead', title:'Qualify lead', category:'Sales', requiredProviders:['openai_gateway','neon'], steps:['normalize_lead','score_fit','write_crm_note'], output:'lead_score'},
  {id:'book_appointment', title:'Book appointment', category:'Ops', requiredProviders:['google_ops','resend'], steps:['check_calendar','create_event','email_confirmation'], output:'calendar_event'},
  {id:'checkout_email_link', title:'Checkout + email link', category:'Sales', requiredProviders:['stripe','resend'], steps:['create_checkout_session','email_link','audit_receipt'], output:'checkout_url'},
  {id:'db_query_ai_summary', title:'DB query + AI summary', category:'Data', requiredProviders:['neon','openai_gateway'], steps:['run_readonly_query','summarize_rows','export_summary'], output:'summary_markdown'},
  {id:'legal_review_intake', title:'Document review intake', category:'Partner review', requiredProviders:['google_ops','resend'], steps:['capture_submission','save_to_drive','notify_partner_queue'], output:'review_packet'},
]);

const DEFAULT_POLICY_RULES = Object.freeze([
  {id:'pol_ai_tokens', enabled:true, scope:'ai', action:'max_tokens_per_call', limit:1200, effect:'cap', requiresApproval:false},
  {id:'pol_sms_destinations', enabled:true, scope:'sms_voice', action:'sms_destinations', limit:'us_ca_only', effect:'restrict', requiresApproval:false},
  {id:'pol_costly_calls', enabled:true, scope:'payments', action:'refund_or_charge_over_500', limit:500, effect:'approval_required', requiresApproval:true},
  {id:'pol_db_writes', enabled:true, scope:'database', action:'destructive_write', limit:'blocked_without_approval', effect:'block', requiresApproval:true},
  {id:'pol_webhook_replay', enabled:true, scope:'webhooks', action:'replay_live_event', limit:'local_only', effect:'restrict', requiresApproval:true},
]);

const DEFAULT_RELEASE_GATES = Object.freeze([
  {id:'gate_provider_manifest', title:'Provider manifests generated', done:false},
  {id:'gate_policy_manifest', title:'Policy manifest generated', done:false},
  {id:'gate_workflow_manifest', title:'Workflow templates materialized', done:false},
  {id:'gate_webhook_replay', title:'Webhook replay receipts exported', done:false},
  {id:'gate_claims', title:'Upstream identity claims sample saved', done:false},
  {id:'gate_vault', title:'Vault created for gateway/provider secret refs', done:false},
  {id:'gate_workspace_export', title:'Workspace export downloaded', done:false},
  {id:'gate_sandbox_run', title:'Sandbox run tested from Terminal', done:false},
  {id:'gate_backend_engine', title:'Executable backend engine files present', done:true},
  {id:'gate_backend_http', title:'Backend HTTP routes implemented', done:true},
  {id:'gate_backend_smoke', title:'Backend fixture smoke produced receipts', done:true},
  {id:'gate_live_backend', title:'Live provider secrets connected and verified', done:false},
]);

function defaultPlatform(){
  const providers = PROVIDER_PACKS.map(p => ({
    id:p.id, enabled:p.id === 'openai_gateway', lane:p.lane, secretRef:p.id === 'openai_gateway' ? 'vault:kaixu_gateway:primary' : '', status:p.id === 'openai_gateway' ? 'configured_ref' : 'available', installedAt:p.id === 'openai_gateway' ? nowISO() : null, lastRotatedAt:null
  }));
  return {
    schema:'kaixu-platform-v1',
    updatedAt:nowISO(),
    providers,
    policyRules: deepClone(DEFAULT_POLICY_RULES),
    workflows: [],
    webhookInbox: [],
    receipts: [],
    backendBase: localStorage.getItem('kaixu_platform_backend_base') || 'http://localhost:7137',
    backendLastHealth: null,
    backendReceipts: [],
    providerPacks: [],
    jobs: [],
    schedules: [],
    meterEvents: [],
    meterSummary: null,
    workflowGraphs: [],
    routeDecisions: [],
    invoices: [],
    bundles: [],
    imports: [],
    auditEvents: [],
    incidents: [],
    entitlements: [],
    records: [],
    forms: [],
    scorecard: null,
    projects: [{id:'default', name:'Default Workspace', slug:'default', status:'active', budget:{monthlyCapCents:50000, hardStop:true}, updatedAt:nowISO()}],
    activeProjectId: 'default',
    providerInstalls: [],
    workflowRuns: [],
    approvalQueue: [],
    webhookBackendEvents: [],
    releaseGates: deepClone(DEFAULT_RELEASE_GATES),
    upstreamClaims: {sub:'upstream-user', email:'operator@example.com', roles:['owner'], projectRoles:{default:['owner','admin']}},
  };
}

function ensurePlatformState(){
  if (!state.platform || typeof state.platform !== 'object') state.platform = defaultPlatform();
  if (!Array.isArray(state.platform.providers)) state.platform.providers = [];
  for (const pack of PROVIDER_PACKS){
    if (!state.platform.providers.find(p => p.id === pack.id)){
      state.platform.providers.push({id:pack.id, enabled:false, lane:pack.lane, secretRef:'', status:'available', installedAt:null, lastRotatedAt:null});
    }
  }
  if (!Array.isArray(state.platform.policyRules)) state.platform.policyRules = deepClone(DEFAULT_POLICY_RULES);
  if (!Array.isArray(state.platform.workflows)) state.platform.workflows = [];
  if (!Array.isArray(state.platform.webhookInbox)) state.platform.webhookInbox = [];
  if (!Array.isArray(state.platform.receipts)) state.platform.receipts = [];
  if (!state.platform.backendBase) state.platform.backendBase = localStorage.getItem('kaixu_platform_backend_base') || 'http://localhost:7137';
  if (!Array.isArray(state.platform.backendReceipts)) state.platform.backendReceipts = [];
  if (!Array.isArray(state.platform.providerPacks)) state.platform.providerPacks = [];
  if (!Array.isArray(state.platform.jobs)) state.platform.jobs = [];
  if (!Array.isArray(state.platform.deadLetters)) state.platform.deadLetters = [];
  if (!Array.isArray(state.platform.actions)) state.platform.actions = [];
  if (!state.platform.openapi || typeof state.platform.openapi !== 'object') state.platform.openapi = null;
  if (!state.platform.storageAdapter || typeof state.platform.storageAdapter !== 'object') state.platform.storageAdapter = null;
  if (!Array.isArray(state.platform.storageAdapters)) state.platform.storageAdapters = [];
  if (!Array.isArray(state.platform.webhookDispatchRules)) state.platform.webhookDispatchRules = [];
  if (!Array.isArray(state.platform.schedules)) state.platform.schedules = [];
  if (!Array.isArray(state.platform.meterEvents)) state.platform.meterEvents = [];
  if (!state.platform.meterSummary || typeof state.platform.meterSummary !== 'object') state.platform.meterSummary = null;
  if (!Array.isArray(state.platform.workflowGraphs)) state.platform.workflowGraphs = [];
  if (!Array.isArray(state.platform.routeDecisions)) state.platform.routeDecisions = [];
  if (!Array.isArray(state.platform.invoices)) state.platform.invoices = [];
  if (!Array.isArray(state.platform.bundles)) state.platform.bundles = [];
  if (!Array.isArray(state.platform.imports)) state.platform.imports = [];
  if (!Array.isArray(state.platform.auditEvents)) state.platform.auditEvents = [];
  if (!Array.isArray(state.platform.incidents)) state.platform.incidents = [];
  if (!Array.isArray(state.platform.entitlements)) state.platform.entitlements = [];
  if (!Array.isArray(state.platform.records)) state.platform.records = [];
  if (!Array.isArray(state.platform.forms)) state.platform.forms = [];
  if (!state.platform.scorecard || typeof state.platform.scorecard !== 'object') state.platform.scorecard = null;
  if (!Array.isArray(state.platform.projects)) state.platform.projects = [{id:'default', name:'Default Workspace', slug:'default', status:'active', budget:{monthlyCapCents:50000, hardStop:true}, updatedAt:nowISO()}];
  if (!state.platform.projects.find(p => p.id === 'default')) state.platform.projects.unshift({id:'default', name:'Default Workspace', slug:'default', status:'active', budget:{monthlyCapCents:50000, hardStop:true}, updatedAt:nowISO()});
  if (!state.platform.activeProjectId) state.platform.activeProjectId = 'default';
  if (!Array.isArray(state.platform.providerInstalls)) state.platform.providerInstalls = [];
  if (!Array.isArray(state.platform.workflowRuns)) state.platform.workflowRuns = [];
  if (!Array.isArray(state.platform.approvalQueue)) state.platform.approvalQueue = [];
  if (!Array.isArray(state.platform.webhookBackendEvents)) state.platform.webhookBackendEvents = [];
  if (!Array.isArray(state.platform.releaseGates)) state.platform.releaseGates = deepClone(DEFAULT_RELEASE_GATES);
  if (!state.platform.upstreamClaims || typeof state.platform.upstreamClaims !== 'object') state.platform.upstreamClaims = {roles:['owner']};
  return state.platform;
}

async function platformSave(reason='platform_save'){
  ensurePlatformState();
  state.platform.updatedAt = nowISO();
  await kvSet(state.db, 'platform', state.platform);
  await auditWrite(state.db, reason, platformStats());
}

function platformStats(){
  ensurePlatformState();
  return {
    providersEnabled: state.platform.providers.filter(p => p.enabled).length,
    providersTotal: PROVIDER_PACKS.length,
    policyRules: state.platform.policyRules.length,
    workflows: state.platform.workflows.length,
    queuedWebhooks: state.platform.webhookInbox.filter(e => e.status === 'queued').length,
    backendReceipts: Array.isArray(state.platform.backendReceipts) ? state.platform.backendReceipts.length : 0,
    projects: state.platform.projects.length,
    providerInstalls: state.platform.providerInstalls.filter(p => p.enabled).length,
    workflowRuns: state.platform.workflowRuns.length,
    openApprovals: state.platform.approvalQueue.filter(a => a.status === 'open').length,
    backendWebhooks: state.platform.webhookBackendEvents.length,
    providerPacks: state.platform.providerPacks.length,
    jobs: state.platform.jobs.length,
    deadLetters: (state.platform.deadLetters || []).length,
    schedules: state.platform.schedules.length,
    meterEvents: state.platform.meterEvents.length,
    workflowGraphs: state.platform.workflowGraphs.length,
    routeDecisions: state.platform.routeDecisions.length,
    invoices: state.platform.invoices.length,
    bundles: state.platform.bundles.length,
    auditEvents: state.platform.auditEvents.length,
    openIncidents: state.platform.incidents.filter(i => i.status !== 'resolved').length,
    entitlements: state.platform.entitlements.length,
    records: state.platform.records.length,
    forms: state.platform.forms.length,
    releaseGatesDone: state.platform.releaseGates.filter(g => g.done).length,
    releaseGatesTotal: state.platform.releaseGates.length,
  };
}

function packById(id){ return PROVIDER_PACKS.find(p => p.id === id) || null; }
function providerState(id){ ensurePlatformState(); return state.platform.providers.find(p => p.id === id) || null; }

async function platformToggleProvider(id){
  const p = providerState(id);
  if (!p) return;
  p.enabled = !p.enabled;
  p.status = p.enabled ? 'configured_ref' : 'available';
  p.installedAt = p.enabled ? nowISO() : null;
  if (p.enabled && !p.secretRef) p.secretRef = `vault:${id}:primary`;
  await platformSave('platform_provider_toggle');
  toast(p.enabled ? 'Provider enabled' : 'Provider disabled', 'success', id);
  renderModal();
}

async function platformRotateSecretRef(id){
  const p = providerState(id);
  if (!p) return;
  p.secretRef = `vault:${id}:v${Date.now()}`;
  p.lastRotatedAt = nowISO();
  if (!p.enabled) p.enabled = true;
  p.status = 'rotated_ref';
  await platformSave('platform_secret_ref_rotate');
  toast('Secret reference rotated', 'success', `${id} now points to ${p.secretRef}`);
  renderModal();
}

async function platformAddPolicyRule(scope, action, limit, effect, requiresApproval){
  ensurePlatformState();
  const rule = {
    id:'pol_' + makeId(),
    enabled:true,
    scope:String(scope||'general').trim() || 'general',
    action:String(action||'custom_action').trim() || 'custom_action',
    limit:String(limit||'approval_required').trim() || 'approval_required',
    effect:String(effect||'approval_required'),
    requiresApproval:!!requiresApproval,
  };
  state.platform.policyRules.push(rule);
  await platformSave('platform_policy_add');
  toast('Policy rule added', 'success', rule.action);
  renderModal();
}

async function platformRemovePolicyRule(id){
  ensurePlatformState();
  state.platform.policyRules = state.platform.policyRules.filter(r => r.id !== id);
  await platformSave('platform_policy_remove');
  renderModal();
}

async function platformToggleGate(id, done){
  ensurePlatformState();
  const gate = state.platform.releaseGates.find(g => g.id === id);
  if (gate) gate.done = !!done;
  await platformSave('platform_gate_toggle');
  renderModal();
}

function workspaceFindChild(parentId, name, type=null){
  const parent = getNode(parentId);
  if (!parent || !Array.isArray(parent.children)) return null;
  for (const id of parent.children){
    const child = getNode(id);
    if (child && child.name === name && (!type || child.type === type)) return child;
  }
  return null;
}

function workspaceEnsureFolderPath(pathParts){
  if (!state.ws) throw new Error('Workspace unavailable. Unlock vault if workspace is encrypted.');
  let parentId = 'root';
  for (const raw of pathParts){
    const name = normalizeName(raw);
    let folder = workspaceFindChild(parentId, name, 'folder');
    if (!folder){
      const parent = getNode(parentId);
      const id = makeId();
      folder = {id, type:'folder', name, parentId, children:[]};
      state.ws.nodes[id] = folder;
      parent.children.push(id);
    }
    parentId = folder.id;
  }
  return parentId;
}

async function workspaceUpsertFile(path, content, openAfter=false){
  if (!state.ws) throw new Error('Workspace unavailable. Unlock vault if workspace is encrypted.');
  const parts = String(path).split('/').filter(Boolean).map(normalizeName);
  if (!parts.length) throw new Error('Invalid path.');
  const fileName = parts.pop();
  const parentId = workspaceEnsureFolderPath(parts);
  let file = workspaceFindChild(parentId, fileName, 'file');
  if (!file){
    const id = makeId();
    file = {id, type:'file', name:fileName, parentId, language:guessLang(fileName), content:String(content||'')};
    state.ws.nodes[id] = file;
    getNode(parentId).children.push(id);
  } else {
    file.language = guessLang(fileName);
    file.content = String(content||'');
  }
  await saveWorkspace('platform_upsert_file');
  renderTree();
  if (openAfter) setActiveTab(file.id);
  return file;
}

function platformManifestObject(){
  ensurePlatformState();
  const enabled = state.platform.providers.filter(p => p.enabled).map(p => {
    const pack = packById(p.id);
    return {...p, title:pack ? pack.title : p.id, requiredSecrets: pack ? pack.requiredSecrets : [], routes: pack ? pack.routes : []};
  });
  return {
    schema: state.platform.schema,
    generatedAt: nowISO(),
    build: BUILD,
    providers: enabled,
    policyRules: state.platform.policyRules,
    workflows: state.platform.workflows,
    projects: state.platform.projects,
    activeProjectId: state.platform.activeProjectId,
    providerInstalls: state.platform.providerInstalls,
    workflowRuns: state.platform.workflowRuns,
    workflowGraphs: state.platform.workflowGraphs,
    routeDecisions: state.platform.routeDecisions,
    invoices: state.platform.invoices,
    approvalQueue: state.platform.approvalQueue,
    backend: {
      baseUrl: state.platform.backendBase,
      routes: ['/api/health','/api/platform/projects','/api/platform/projects/:projectId/providers','/api/platform/preflight','/api/platform/workflows/:templateId/run','/api/platform/runs','/api/platform/webhooks','/api/platform/webhooks/ingest','/api/platform/webhooks/:eventId/replay','/api/platform/approvals','/api/platform/provider-packs','/api/platform/jobs','/api/platform/schedules','/api/platform/meters','/api/platform/provider-router','/api/platform/provider-router/optimize','/api/platform/invoices','/api/platform/projects/:id/invoices/generate','/api/platform/workflow-builder/graphs','/api/platform/workflow-builder/graphs/:id/run','/api/platform/audit','/api/platform/incidents','/api/platform/entitlements','/api/platform/forms','/api/platform/forms/:id/submit','/api/platform/records/:collection','/api/platform/scorecard','/api/platform/projects/:id/export','/api/platform/import','/api/platform/smoke'],
      engine: 'server/platform-engine.mjs',
      httpServer: 'server/http-server.mjs'
    },
    upstreamClaimsSample: state.platform.upstreamClaims,
    releaseGates: state.platform.releaseGates,
  };
}

async function platformMaterializeFiles(openReadme=false){
  if (!state.ws){
    toast('Workspace unavailable', 'warn', 'Unlock vault if workspace is encrypted.');
    return;
  }
  ensurePlatformState();
  const manifest = platformManifestObject();
  await workspaceUpsertFile('platform/README.md', platformReadme(), openReadme);
  await workspaceUpsertFile('platform/providers/provider-manifest.json', JSON.stringify(manifest.providers, null, 2));
  await workspaceUpsertFile('platform/policies/policy-rules.json', JSON.stringify(state.platform.policyRules, null, 2));
  await workspaceUpsertFile('platform/workflows/workflow-registry.json', JSON.stringify(state.platform.workflows, null, 2));
  await workspaceUpsertFile('platform/webhooks/replay-inbox.json', JSON.stringify(state.platform.webhookInbox, null, 2));
  await workspaceUpsertFile('platform/upstream/claims.example.json', JSON.stringify(state.platform.upstreamClaims, null, 2));
  await workspaceUpsertFile('platform/releases/release-gates.json', JSON.stringify(state.platform.releaseGates, null, 2));
  await workspaceUpsertFile('platform/backend/backend-routes.json', JSON.stringify(manifest.backend, null, 2));
  await workspaceUpsertFile('platform/backend/backend-receipts.json', JSON.stringify(state.platform.backendReceipts || [], null, 2));
  await workspaceUpsertFile('platform/projects/project-registry.json', JSON.stringify(state.platform.projects || [], null, 2));
  await workspaceUpsertFile('platform/providers/project-installs.json', JSON.stringify(state.platform.providerInstalls || [], null, 2));
  await workspaceUpsertFile('platform/workflows/run-history.json', JSON.stringify(state.platform.workflowRuns || [], null, 2));
  await workspaceUpsertFile('platform/workflows/visual-graphs.json', JSON.stringify(state.platform.workflowGraphs || [], null, 2));
  await workspaceUpsertFile('platform/routing/provider-route-decisions.json', JSON.stringify(state.platform.routeDecisions || [], null, 2));
  await workspaceUpsertFile('platform/billing/invoices.json', JSON.stringify(state.platform.invoices || [], null, 2));
  await workspaceUpsertFile('platform/approvals/approval-queue.json', JSON.stringify(state.platform.approvalQueue || [], null, 2));
  await workspaceUpsertFile('platform/platform-manifest.json', JSON.stringify(manifest, null, 2));
  await auditWrite(state.db, 'platform_materialize_files', platformStats());
  toast('Platform files materialized', 'success', 'Generated /platform manifests in the workspace.');
  renderAll();
}

function platformReadme(){
  const stats = platformStats();
  return `# kAIxu CodeStudio Platform Console\n\nGenerated: ${nowISO()}\nBuild: ${BUILD.version} / ${BUILD.buildId}\n\n## Implemented local lanes\n\n- Provider pack registry with enable/disable state and vault secret references.\n- Policy rule builder for token, spend, SMS, DB-write, webhook replay, and approval controls.\n- Workflow template library that materializes workflow JSON files.\n- Webhook JSON inbox with local replay receipts.\n- Upstream identity claim sample intake for projects inheriting external auth.\n- Release gates for proving what is actually wired before production claims.\n- Visual workflow graph builder manifests with compiled workflow output.\n- Provider routing optimizer receipts for cheapest-ready provider selection.\n- Usage invoice generator built from persisted meter events.\n\n## Current counts\n\n- Enabled providers: ${stats.providersEnabled}/${stats.providersTotal}\n- Policy rules: ${stats.policyRules}\n- Workflows: ${stats.workflows}\n- Queued webhooks: ${stats.queuedWebhooks}\n- Release gates done: ${stats.releaseGatesDone}/${stats.releaseGatesTotal}\n\nBackend execution is implemented through server/platform-engine.mjs. Live provider calls only execute when real provider env vars are present; otherwise they block or run fixture proof explicitly.\n`;
}

async function platformInstallWorkflow(templateId){
  ensurePlatformState();
  const tpl = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;
  const existing = state.platform.workflows.find(w => w.templateId === tpl.id);
  const workflow = existing || {
    id:'wf_' + makeId(),
    templateId:tpl.id,
    title:tpl.title,
    category:tpl.category,
    enabled:true,
    requiredProviders:tpl.requiredProviders,
    steps:tpl.steps.map((step, idx) => ({id:`step_${idx+1}`, action:step, approval:false})),
    output:tpl.output,
    createdAt:nowISO(),
    lastPreflight:null,
  };
  if (!existing) state.platform.workflows.push(workflow);
  await platformSave('platform_workflow_install');
  if (state.ws){
    await workspaceUpsertFile(`platform/workflows/${tpl.id}.json`, JSON.stringify(workflow, null, 2), true);
  }
  toast(existing ? 'Workflow opened' : 'Workflow installed', 'success', tpl.title);
  renderModal();
}

async function platformPreflightWorkflow(templateId){
  ensurePlatformState();
  const tpl = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  const wf = state.platform.workflows.find(w => w.templateId === templateId);
  if (!tpl || !wf) return;
  const enabledProviders = new Set(state.platform.providers.filter(p => p.enabled).map(p => p.id));
  const missingProviders = tpl.requiredProviders.filter(id => !enabledProviders.has(id));
  const approvalRules = state.platform.policyRules.filter(r => r.enabled && r.requiresApproval).map(r => r.id);
  const ok = missingProviders.length === 0;
  const receipt = {
    id:'rcpt_' + makeId(),
    ts:nowISO(),
    type:'workflow_preflight',
    workflowId:wf.id,
    templateId,
    ok,
    missingProviders,
    approvalRules,
    message: ok ? 'Local preflight passed. Backend execution still requires live workers.' : 'Missing enabled providers.'
  };
  wf.lastPreflight = receipt;
  state.platform.receipts.unshift(receipt);
  if (state.platform.receipts.length > 100) state.platform.receipts.length = 100;
  await platformSave('platform_workflow_preflight');
  toast(ok ? 'Preflight passed' : 'Preflight blocked', ok ? 'success' : 'warn', receipt.message);
  renderModal();
}

function platformInferProviderFromEvent(obj){
  const text = JSON.stringify(obj).toLowerCase();
  if (text.includes('stripe') || text.includes('checkout') || text.includes('invoice')) return 'stripe';
  if (text.includes('twilio') || text.includes('sms') || text.includes('voice')) return 'twilio';
  if (text.includes('resend') || text.includes('email')) return 'resend';
  if (text.includes('cloudflare') || text.includes('r2') || text.includes('d1')) return 'cloudflare';
  if (text.includes('neon') || text.includes('postgres')) return 'neon';
  return 'unknown';
}

async function platformIngestWebhook(raw){
  ensurePlatformState();
  let parsed;
  try { parsed = JSON.parse(String(raw||'')); }
  catch(e){ toast('Invalid JSON', 'error', 'Webhook input must be valid JSON.'); return; }
  const event = {
    id:'evt_' + makeId(),
    ts:nowISO(),
    provider:platformInferProviderFromEvent(parsed),
    type:String(parsed.type || parsed.event || parsed.name || 'unknown.event'),
    status:'queued',
    routedTo:null,
    payload:parsed,
  };
  const candidate = state.platform.workflows.find(w => w.enabled && JSON.stringify(w.requiredProviders||[]).includes(event.provider));
  event.routedTo = candidate ? candidate.id : null;
  state.platform.webhookInbox.unshift(event);
  if (state.platform.webhookInbox.length > 200) state.platform.webhookInbox.length = 200;
  await platformSave('platform_webhook_ingest');
  toast('Webhook queued', 'success', `${event.provider} · ${event.type}`);
  renderModal();
}

async function platformReplayWebhook(id){
  ensurePlatformState();
  const event = state.platform.webhookInbox.find(e => e.id === id);
  if (!event) return;
  event.status = 'replayed_local';
  event.replayedAt = nowISO();
  const receipt = {id:'rcpt_' + makeId(), ts:nowISO(), type:'webhook_replay', eventId:id, provider:event.provider, routedTo:event.routedTo, ok:true, note:'Local replay receipt generated. No live provider endpoint was called.'};
  state.platform.receipts.unshift(receipt);
  await platformSave('platform_webhook_replay');
  if (state.ws){
    await workspaceUpsertFile(`platform/webhooks/receipts/${receipt.id}.json`, JSON.stringify(receipt, null, 2));
  }
  toast('Webhook replayed locally', 'success', event.type);
  renderModal();
}

async function platformSaveClaims(raw){
  ensurePlatformState();
  try{
    const claims = JSON.parse(String(raw||''));
    if (!claims || typeof claims !== 'object') throw new Error('Claims must be a JSON object.');
    state.platform.upstreamClaims = claims;
    await platformSave('platform_claims_save');
    if (state.ws) await workspaceUpsertFile('platform/upstream/claims.example.json', JSON.stringify(claims, null, 2));
    toast('Claims sample saved', 'success', 'Upstream auth shape updated.');
    renderModal();
  }catch(e){
    toast('Claims rejected', 'error', e && e.message ? e.message : String(e));
  }
}

function platformCan(action){
  ensurePlatformState();
  const claims = state.platform.upstreamClaims || {};
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  if (roles.includes('owner') || roles.includes('admin')) return true;
  if (action === 'read' && roles.includes('viewer')) return true;
  if ((action === 'write' || action === 'run') && roles.includes('operator')) return true;
  return false;
}

function platformBackendBase(){
  ensurePlatformState();
  return String(state.platform.backendBase || 'http://localhost:7137').replace(/\/+$/, '');
}

async function platformSetBackendBase(value){
  ensurePlatformState();
  state.platform.backendBase = String(value || 'http://localhost:7137').trim().replace(/\/+$/, '');
  localStorage.setItem('kaixu_platform_backend_base', state.platform.backendBase);
  await platformSave('platform_backend_base_save');
  toast('Backend base saved', 'success', state.platform.backendBase);
  renderModal();
}

async function platformBackendFetch(path, options={}){
  const headers = {'Content-Type':'application/json', ...(options.headers || {})};
  const res = await fetch(platformBackendBase() + path, {...options, headers});
  const text = await res.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch(e){ payload = {raw:text}; }
  if (!res.ok){
    const err = new Error(payload?.error?.message || payload?.error || `Backend ${res.status}`);
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function platformBackendHealth(){
  ensurePlatformState();
  try{
    const health = await platformBackendFetch('/api/health', {method:'GET'});
    state.platform.backendLastHealth = health;
    await platformSave('platform_backend_health');
    toast('Backend online', 'success', `${health.mode || 'live'} · ${Object.keys(health.providers || {}).length} provider probes`);
  }catch(e){
    state.platform.backendLastHealth = {ok:false, error:e.message, payload:e.payload || null, ts:nowISO()};
    await platformSave('platform_backend_health_error');
    toast('Backend unavailable', 'error', e.message);
  }
  renderModal();
}


async function platformBackendOpenApi(){
  ensurePlatformState();
  try{
    const doc = await platformBackendFetch('/api/platform/openapi.json', {method:'GET'});
    state.platform.openapi = doc;
    await platformSave('platform_backend_openapi');
    if (state.ws) await workspaceUpsertFile('platform/backend/openapi.json', JSON.stringify(doc, null, 2));
    toast('OpenAPI loaded', 'success', `${Object.keys(doc.paths || {}).length} backend paths`);
  }catch(e){
    toast('OpenAPI unavailable', 'error', e.message);
  }
  renderModal();
}

async function platformBackendSmoke(){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/smoke', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims})});
    state.platform.backendReceipts = result.receipts || [];
    state.platform.receipts.unshift({id:'rcpt_' + makeId(), ts:nowISO(), type:'backend_smoke', ok:!!result.ok, message:`Backend smoke ${result.ok ? 'passed' : 'failed'} in ${result.mode || 'unknown'} mode`});
    await platformSave('platform_backend_smoke');
    toast(result.ok ? 'Backend smoke passed' : 'Backend smoke failed', result.ok ? 'success' : 'warn', `${result.mode || 'unknown'} mode receipts stored.`);
  }catch(e){
    state.platform.receipts.unshift({id:'rcpt_' + makeId(), ts:nowISO(), type:'backend_smoke_error', ok:false, message:e.message});
    await platformSave('platform_backend_smoke_error');
    toast('Backend smoke failed', 'error', e.message);
  }
  renderModal();
}

async function platformBackendPreflightWorkflow(templateId){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/preflight', {method:'POST', body:JSON.stringify({templateId, claims:state.platform.upstreamClaims, input:sampleWorkflowInput(templateId)})});
    const wf = state.platform.workflows.find(w => w.templateId === templateId);
    if (wf) wf.lastPreflight = result;
    state.platform.receipts.unshift({id:'rcpt_' + makeId(), ts:nowISO(), type:'backend_preflight', ok:!!result.ok, templateId, message:result.ok ? 'Backend preflight passed.' : 'Backend preflight blocked.'});
    await platformSave('platform_backend_preflight');
    toast(result.ok ? 'Backend preflight passed' : 'Backend preflight blocked', result.ok ? 'success' : 'warn', templateId);
  }catch(e){
    state.platform.receipts.unshift({id:'rcpt_' + makeId(), ts:nowISO(), type:'backend_preflight_error', ok:false, templateId, message:e.message});
    await platformSave('platform_backend_preflight_error');
    toast('Backend preflight error', 'error', e.message);
  }
  renderModal();
}

async function platformBackendRunWorkflow(templateId){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch(`/api/platform/workflows/${encodeURIComponent(templateId)}/run`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, input:sampleWorkflowInput(templateId), approvals:{pol_webhook_replay:true}})});
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : (state.platform.backendReceipts || []);
    state.platform.receipts.unshift({id:'rcpt_' + makeId(), ts:nowISO(), type:'backend_workflow_run', ok:!!result.ok, templateId, message:result.ok ? 'Backend workflow executed.' : 'Backend workflow blocked.'});
    if (state.ws) await workspaceUpsertFile(`platform/backend/runs/${templateId}-${Date.now()}.json`, JSON.stringify(result, null, 2));
    await platformSave('platform_backend_workflow_run');
    toast(result.ok ? 'Backend workflow executed' : 'Backend workflow blocked', result.ok ? 'success' : 'warn', templateId);
  }catch(e){
    state.platform.receipts.unshift({id:'rcpt_' + makeId(), ts:nowISO(), type:'backend_workflow_error', ok:false, templateId, message:e.message});
    await platformSave('platform_backend_workflow_error');
    toast('Backend workflow error', 'error', e.message);
  }
  renderModal();
}

function sampleWorkflowInput(templateId){
  const base = {projectId:platformActiveProjectId(), to:'operator@example.com', email:'operator@example.com'};
  if (templateId === 'checkout_email_link' || templateId === 'send_invoice') return {...base, amountCents:1300, productName:'CodeStudio Platform Service'};
  if (templateId === 'db_query_ai_summary') return {projectId:platformActiveProjectId(), sql:'select 1 as smoke_check', maxTokens:500};
  if (templateId === 'qualify_lead') return {projectId:platformActiveProjectId(), lead:{company:'Fixture Local Business', city:'Glendale', need:'booking and payments automation'}, sql:'select 1 as crm_note'};
  if (templateId === 'book_appointment') return {...base, summary:'CodeStudio platform appointment', start:new Date(Date.now()+86400000).toISOString(), end:new Date(Date.now()+90000000).toISOString(), attendees:['operator@example.com']};
  if (templateId === 'legal_review_intake') return {...base, requester:'fixture client', document:'Fixture document review text', partnerEmail:'operator@example.com'};
  return base;
}


function platformActiveProjectId(){
  ensurePlatformState();
  return state.platform.activeProjectId || 'default';
}

function mergeById(list, item){
  if (!item || !item.id) return Array.isArray(list) ? list : [];
  const out = Array.isArray(list) ? list.filter(x => x && x.id !== item.id) : [];
  out.unshift(item);
  return out;
}

function mergeProviderInstall(list, install){
  if (!install || !install.projectId || !install.providerId) return Array.isArray(list) ? list : [];
  const out = Array.isArray(list) ? list.filter(x => !(x && x.projectId === install.projectId && x.providerId === install.providerId)) : [];
  out.unshift(install);
  return out;
}

async function platformCreateProjectFromUI(nameInput, capInput){
  ensurePlatformState();
  const name = String(nameInput || '').trim() || `Client Project ${state.platform.projects.length + 1}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,64) || 'project';
  const project = {id:slug === 'default' ? 'default' : `proj_${makeId()}`, name, slug, status:'active', budget:{monthlyCapCents:Math.max(0, Math.round(Number(capInput || 500) * 100)), hardStop:true}, updatedAt:nowISO()};
  try{
    const result = await platformBackendFetch('/api/platform/projects', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, project})});
    state.platform.projects = mergeById(state.platform.projects, result.project);
    state.platform.activeProjectId = result.project.id;
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_project_create_backend');
    toast('Project created', 'success', result.project.name);
  }catch(e){
    state.platform.projects = mergeById(state.platform.projects, project);
    state.platform.activeProjectId = project.id;
    await platformSave('platform_project_create_local');
    toast('Project saved locally', 'warn', e.message);
  }
  renderModal();
}

async function platformSetActiveProject(projectId){
  ensurePlatformState();
  state.platform.activeProjectId = projectId || 'default';
  await platformSave('platform_active_project_set');
  toast('Active project changed', 'success', state.platform.activeProjectId);
  renderModal();
}

async function platformInstallProviderForProject(providerId){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  const pack = packById(providerId);
  try{
    const result = await platformBackendFetch(`/api/platform/projects/${encodeURIComponent(projectId)}/providers/${encodeURIComponent(providerId)}`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, enabled:true, secretRef:`vault:${projectId}:${providerId}:primary`, routes:pack ? pack.routes : []})});
    state.platform.providerInstalls = mergeProviderInstall(state.platform.providerInstalls, result.install);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_project_provider_install_backend');
    toast('Provider installed on project', 'success', `${projectId} · ${providerId}`);
  }catch(e){
    const install = {id:'prov_' + makeId(), projectId, providerId, enabled:true, secretRef:`vault:${projectId}:${providerId}:primary`, routes:pack ? pack.routes : [], status:'installed_local', updatedAt:nowISO()};
    state.platform.providerInstalls = mergeProviderInstall(state.platform.providerInstalls, install);
    await platformSave('platform_project_provider_install_local');
    toast('Provider install saved locally', 'warn', e.message);
  }
  renderModal();
}

async function platformRotateProviderForProject(providerId){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch(`/api/platform/projects/${encodeURIComponent(projectId)}/providers/${encodeURIComponent(providerId)}/rotate`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims})});
    state.platform.providerInstalls = mergeProviderInstall(state.platform.providerInstalls, result.install);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_project_provider_rotate_backend');
    toast('Project provider ref rotated', 'success', result.install.secretRef);
  }catch(e){
    const current = state.platform.providerInstalls.find(x => x.projectId === projectId && x.providerId === providerId);
    if (current){ current.secretRef = `vault:${projectId}:${providerId}:v${Date.now()}`; current.lastRotatedAt = nowISO(); current.updatedAt = nowISO(); }
    await platformSave('platform_project_provider_rotate_local');
    toast('Local provider ref rotated', 'warn', e.message);
  }
  renderModal();
}

async function platformSyncBackendOperations(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const projects = await platformBackendFetch('/api/platform/projects', {method:'GET'});
    const providers = await platformBackendFetch(`/api/platform/projects/${encodeURIComponent(projectId)}/providers`, {method:'GET'});
    const runs = await platformBackendFetch(`/api/platform/runs?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const webhooks = await platformBackendFetch(`/api/platform/webhooks?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const dispatchRules = await platformBackendFetch('/api/platform/webhooks/dispatch-rules', {method:'GET'});
    const storage = await platformBackendFetch('/api/platform/storage', {method:'GET'});
    const approvals = await platformBackendFetch(`/api/platform/approvals?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const packs = await platformBackendFetch('/api/platform/provider-packs', {method:'GET'});
    const jobs = await platformBackendFetch(`/api/platform/jobs?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const deadLetters = await platformBackendFetch(`/api/platform/dead-letters?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const schedules = await platformBackendFetch(`/api/platform/schedules?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const meters = await platformBackendFetch(`/api/platform/meters?projectId=${encodeURIComponent(projectId)}&limit=100`, {method:'GET'});
    const bundles = await platformBackendFetch(`/api/platform/bundles?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const routes = await platformBackendFetch(`/api/platform/provider-router?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const invoices = await platformBackendFetch(`/api/platform/invoices?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const graphs = await platformBackendFetch(`/api/platform/workflow-builder/graphs?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const audit = await platformBackendFetch(`/api/platform/audit?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const incidents = await platformBackendFetch(`/api/platform/incidents?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const entitlements = await platformBackendFetch(`/api/platform/entitlements?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const forms = await platformBackendFetch(`/api/platform/forms?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const records = await platformBackendFetch(`/api/platform/records/form-submissions?projectId=${encodeURIComponent(projectId)}&limit=50`, {method:'GET'});
    const scorecard = await platformBackendFetch(`/api/platform/scorecard?projectId=${encodeURIComponent(projectId)}`, {method:'GET'});
    state.platform.projects = projects.projects || state.platform.projects;
    state.platform.providerInstalls = providers.installs || state.platform.providerInstalls;
    state.platform.workflowRuns = runs.runs || [];
    state.platform.webhookBackendEvents = webhooks.events || [];
    state.platform.webhookDispatchRules = dispatchRules.rules || [];
    state.platform.storageAdapter = storage.active || null;
    state.platform.storageAdapters = storage.available || [];
    state.platform.approvalQueue = approvals.approvals || [];
    state.platform.providerPacks = packs.packs || [];
    state.platform.jobs = jobs.jobs || [];
    state.platform.deadLetters = deadLetters.deadLetters || [];
    state.platform.schedules = schedules.schedules || [];
    state.platform.meterEvents = meters.events || [];
    state.platform.meterSummary = meters.summary || null;
    state.platform.bundles = bundles.bundles || [];
    state.platform.imports = bundles.imports || [];
    state.platform.routeDecisions = routes.decisions || [];
    state.platform.invoices = invoices.invoices || [];
    state.platform.workflowGraphs = graphs.graphs || [];
    state.platform.auditEvents = audit.events || [];
    state.platform.incidents = incidents.incidents || [];
    state.platform.entitlements = entitlements.entitlements || [];
    state.platform.forms = forms.forms || [];
    state.platform.records = records.records || [];
    state.platform.scorecard = scorecard || null;
    await platformSave('platform_backend_operations_sync');
    toast('Operations synced', 'success', `${state.platform.workflowRuns.length} runs · ${state.platform.jobs.length} jobs · ${state.platform.meterEvents.length} meter events`);
  }catch(e){
    toast('Operations sync blocked', 'error', e.message);
  }
  renderModal();
}

async function platformResolveApprovalFromUI(approvalId, status='approved'){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch(`/api/platform/approvals/${encodeURIComponent(approvalId)}/resolve`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, status, note:'Resolved from Platform Console'})});
    state.platform.approvalQueue = mergeById(state.platform.approvalQueue, result.approval);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_approval_resolve');
    toast('Approval resolved', 'success', `${approvalId} · ${status}`);
  }catch(e){
    toast('Approval resolve blocked', 'error', e.message);
  }
  renderModal();
}


async function platformBackendEnqueueJobFromUI(templateId='db_query_ai_summary'){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/jobs', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, workflowId:templateId, input:sampleWorkflowInput(templateId), runAt:new Date(Date.now()-1000).toISOString(), priority:50})});
    state.platform.jobs = mergeById(state.platform.jobs, result.job);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_job_enqueue_backend');
    toast('Job queued', 'success', result.job.id);
  }catch(e){ toast('Job enqueue blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendDrainJobsFromUI(){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/jobs/drain', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, limit:10})});
    await platformSyncBackendOperations();
    toast('Job drain complete', result.ok ? 'success' : 'warn', `${result.count || 0} jobs processed`);
  }catch(e){ toast('Job drain blocked', 'error', e.message); renderModal(); }
}

async function platformBackendVerifyStorageFromUI(){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/storage/verify', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims})});
    state.platform.storageAdapter = result.adapter || state.platform.storageAdapter;
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSyncBackendOperations();
    toast('Storage adapter verified', 'success', result.adapter?.id || 'json');
  }catch(e){ toast('Storage verification blocked', 'error', e.message); renderModal(); }
}

async function platformBackendRetryDeadLetterFromUI(deadLetterId){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch(`/api/platform/dead-letters/${encodeURIComponent(deadLetterId)}/retry`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, runAt:new Date(Date.now()+30000).toISOString()})});
    state.platform.jobs = mergeById(state.platform.jobs || [], result.job);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSyncBackendOperations();
    toast('Dead letter retried', 'success', result.job?.id || deadLetterId);
  }catch(e){ toast('Dead letter retry blocked', 'error', e.message); renderModal(); }
}

async function platformBackendScheduleFromUI(templateId='db_query_ai_summary'){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/schedules', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, workflowId:templateId, intervalMinutes:60, nextRunAt:new Date(Date.now()-1000).toISOString(), input:sampleWorkflowInput(templateId), label:`${templateId} hourly`})});
    state.platform.schedules = mergeById(state.platform.schedules, result.schedule);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_schedule_upsert_backend');
    toast('Schedule saved', 'success', result.schedule.id);
  }catch(e){ toast('Schedule blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendTickSchedulesFromUI(){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch('/api/platform/schedules/tick', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, limit:10})});
    await platformSyncBackendOperations();
    toast('Schedule tick complete', 'success', `${result.enqueued?.length || 0} jobs queued`);
  }catch(e){ toast('Schedule tick blocked', 'error', e.message); renderModal(); }
}

async function platformBackendExportProjectFromUI(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch(`/api/platform/projects/${encodeURIComponent(projectId)}/export`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims})});
    state.platform.bundles = mergeById(state.platform.bundles, result.bundle);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    if (result.data) downloadText(`codestudio-project-${projectId}-${Date.now()}.json`, JSON.stringify(result.data, null, 2), 'application/json');
    await platformSave('platform_project_export_backend');
    toast('Project bundle exported', 'success', result.bundle?.hash?.slice(0,12) || projectId);
  }catch(e){ toast('Project export blocked', 'error', e.message); }
  renderModal();
}


async function platformBackendOptimizeRouteFromUI(intent='email'){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch('/api/platform/provider-router/optimize', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, projectId, intent, requireInstalled:false})});
    state.platform.routeDecisions = mergeById(state.platform.routeDecisions || [], result.decision);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_provider_route_optimize');
    toast(result.ok ? 'Provider route selected' : 'No ready route', result.ok ? 'success' : 'warn', result.selected ? `${result.intent} → ${result.selected.providerId}` : result.intent);
  }catch(e){ toast('Provider route blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendGenerateInvoiceFromUI(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch(`/api/platform/projects/${encodeURIComponent(projectId)}/invoices/generate`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, customer:{name:(state.platform.projects.find(p => p.id === projectId)?.name || 'Client Workspace'), email:'billing@example.com'}, period:{from:new Date(Date.now()-30*86400000).toISOString(), to:new Date(Date.now()+1000).toISOString()}, minimumLineCents:1300, markupPercent:0})});
    state.platform.invoices = mergeById(state.platform.invoices || [], result.invoice);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    if (result.invoice) downloadText(`codestudio-invoice-${result.invoice.invoiceNumber}.json`, JSON.stringify(result.invoice, null, 2), 'application/json');
    await platformSave('platform_invoice_generate');
    toast('Invoice generated', 'success', `${result.invoice?.invoiceNumber || projectId} · $${(Number(result.invoice?.totalCents || 0)/100).toFixed(2)}`);
  }catch(e){ toast('Invoice generation blocked', 'error', e.message); }
  renderModal();
}

function platformDefaultGraph(){
  return {
    title:'Lead intake → score → CRM note',
    nodes:[
      {id:'trigger_lead', type:'trigger', label:'Lead captured'},
      {id:'score_fit', type:'provider', providerId:'openai_gateway', action:'score_fit', label:'Score fit'},
      {id:'write_crm', type:'provider', providerId:'neon', action:'write_crm_note', label:'Write CRM note'},
      {id:'notify', type:'provider', providerId:'resend', action:'email_confirmation', label:'Notify operator'}
    ],
    edges:[
      {from:'trigger_lead', to:'score_fit'},
      {from:'score_fit', to:'write_crm'},
      {from:'write_crm', to:'notify'}
    ]
  };
}

async function platformBackendSaveWorkflowGraphFromUI(raw){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  let graph;
  try { graph = raw ? JSON.parse(String(raw)) : platformDefaultGraph(); }
  catch(e){ toast('Graph JSON rejected', 'error', e.message); return; }
  try{
    const result = await platformBackendFetch('/api/platform/workflow-builder/graphs', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, projectId, graph})});
    state.platform.workflowGraphs = mergeById(state.platform.workflowGraphs || [], result.graph);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    if (state.ws && result.compiledWorkflow) await workspaceUpsertFile(`platform/workflows/visual-${result.graph.id}.json`, JSON.stringify(result.compiledWorkflow, null, 2));
    await platformSave('platform_workflow_graph_save');
    toast('Workflow graph saved', 'success', `${result.graph.title} · ${result.graph.nodes.length} nodes`);
  }catch(e){ toast('Workflow graph blocked', 'error', e.message); }
  renderModal();
}



async function platformBackendRunWorkflowGraphFromUI(graphId){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch(`/api/platform/workflow-builder/graphs/${encodeURIComponent(graphId)}/run`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, input:{projectId:platformActiveProjectId(), sql:'select 13 as visual_graph', prompt:'Run this visual workflow from the console'}})});
    state.platform.workflowRuns = mergeById(state.platform.workflowRuns || [], {id:result.runId, status:result.ok ? 'completed' : 'blocked', projectId:result.projectId, templateId:'visual_workflow', graphId, updatedAt:nowISO()});
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_workflow_graph_run');
    toast(result.ok ? 'Graph executed' : 'Graph blocked', result.ok ? 'success' : 'warn', `${graphId} · ${(result.steps || []).length} steps`);
  }catch(e){ toast('Graph run blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendCreateIntakeFormFromUI(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch('/api/platform/forms', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, projectId, title:'Client lead intake', fields:[{name:'email', type:'email', required:true},{name:'company', type:'text', required:true},{name:'need', type:'text', required:false}], submitWorkflowId:'qualify_lead'})});
    state.platform.forms = mergeById(state.platform.forms || [], result.form);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_form_create_backend');
    toast('Intake form created', 'success', result.form.id);
  }catch(e){ toast('Form create blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendSubmitIntakeFormFromUI(formId){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch(`/api/platform/forms/${encodeURIComponent(formId)}/submit`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, data:{projectId:platformActiveProjectId(), email:'lead@example.com', company:'Example Client', need:'Platform smoke intake'}})});
    state.platform.records = mergeById(state.platform.records || [], result.record);
    state.platform.workflowRuns = result.workflow?.runId ? mergeById(state.platform.workflowRuns || [], {id:result.workflow.runId, status:result.workflow.ok ? 'completed' : 'blocked', projectId:platformActiveProjectId(), templateId:'qualify_lead', updatedAt:nowISO()}) : state.platform.workflowRuns;
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_form_submit_backend');
    toast('Form submitted', 'success', result.record?.id || formId);
  }catch(e){ toast('Form submit blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendSeedEntitlementFromUI(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch('/api/platform/entitlements', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, projectId, key:'workflow_runs', enabled:true, limit:25, used:0})});
    state.platform.entitlements = mergeById(state.platform.entitlements || [], result.entitlement);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_entitlement_seed_backend');
    toast('Entitlement gate saved', 'success', `${result.entitlement.key} ≤ ${result.entitlement.limit}`);
  }catch(e){ toast('Entitlement blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendCheckEntitlementFromUI(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch('/api/platform/entitlements/check', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, projectId, key:'workflow_runs', quantity:1})});
    if (result.entitlement) state.platform.entitlements = mergeById(state.platform.entitlements || [], result.entitlement);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_entitlement_check_backend');
    toast(result.ok ? 'Entitlement allowed' : 'Entitlement blocked', result.ok ? 'success' : 'warn', result.reason || 'allowed');
  }catch(e){ toast('Entitlement check blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendOpenIncidentFromUI(){
  ensurePlatformState();
  const projectId = platformActiveProjectId();
  try{
    const result = await platformBackendFetch('/api/platform/incidents', {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, projectId, title:'Manual console incident', severity:'medium', source:'console'})});
    state.platform.incidents = mergeById(state.platform.incidents || [], result.incident);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_incident_open_backend');
    toast('Incident opened', 'success', result.incident.id);
  }catch(e){ toast('Incident blocked', 'error', e.message); }
  renderModal();
}

async function platformBackendResolveIncidentFromUI(incidentId){
  ensurePlatformState();
  try{
    const result = await platformBackendFetch(`/api/platform/incidents/${encodeURIComponent(incidentId)}/resolve`, {method:'POST', body:JSON.stringify({claims:state.platform.upstreamClaims, note:'Resolved from console'})});
    state.platform.incidents = mergeById(state.platform.incidents || [], result.incident);
    state.platform.backendReceipts = result.receipt ? [result.receipt, ...(state.platform.backendReceipts || [])].slice(0, 100) : state.platform.backendReceipts;
    await platformSave('platform_incident_resolve_backend');
    toast('Incident resolved', 'success', incidentId);
  }catch(e){ toast('Resolve blocked', 'error', e.message); }
  renderModal();
}

function renderIntakeGuardrailsPlane(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  const score = state.platform.scorecard;
  wrap.appendChild(el('div',{class:'platformActionRow'},[
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendCreateIntakeFormFromUI()}, 'Create intake form'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendSeedEntitlementFromUI()}, 'Seed entitlement gate'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendCheckEntitlementFromUI()}, 'Consume entitlement'),
    el('button',{class:'btn primary mini', type:'button', onclick:()=>platformBackendOpenIncidentFromUI()}, 'Open incident')
  ]));
  wrap.appendChild(el('div',{class:'small', text:`Forms: ${state.platform.forms.length} · Records: ${state.platform.records.length} · Entitlements: ${state.platform.entitlements.length} · Open incidents: ${state.platform.incidents.filter(i => i.status !== 'resolved').length} · Audit events: ${state.platform.auditEvents.length}`}));
  if (score){
    wrap.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:`Platform score ${score.score}/100`}), el('span',{text:`Runs ${score.runs} · success ${score.runSuccessRate}% · open incidents ${score.openIncidents}`})]), el('span',{class:'badge purple', text:'Scorecard'})]));
  }
  const forms = (state.platform.forms || []).slice(0, 3);
  for (const form of forms){
    wrap.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:form.title || form.id}), el('span',{text:`${form.id} · ${form.fields?.length || 0} fields · submit ${form.submitWorkflowId || 'none'}`})]),
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendSubmitIntakeFormFromUI(form.id)}, 'Submit sample')
    ]));
  }
  const incidents = (state.platform.incidents || []).slice(0, 4);
  for (const incident of incidents){
    wrap.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:`${incident.title} · ${incident.status}`}), el('span',{text:`${incident.id} · ${incident.severity} · ${incident.source}`})]),
      incident.status !== 'resolved' ? el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendResolveIncidentFromUI(incident.id)}, 'Resolve') : el('span',{class:'badge', text:'Resolved'})
    ]));
  }
  return wrap;
}

function renderCommerceRoutingPlane(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  const intent = el('select',{class:'select'},[
    el('option',{value:'email', text:'email'}),
    el('option',{value:'payments', text:'payments'}),
    el('option',{value:'ai summary', text:'ai summary'}),
    el('option',{value:'database', text:'database'}),
    el('option',{value:'sms', text:'sms'}),
    el('option',{value:'deploy', text:'deploy'}),
  ]);
  wrap.appendChild(el('div',{class:'grid2'},[
    intent,
    el('div',{class:'platformActionRow'},[
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendOptimizeRouteFromUI(intent.value)}, 'Optimize provider route'),
      el('button',{class:'btn primary mini', type:'button', onclick:()=>platformBackendGenerateInvoiceFromUI()}, 'Generate usage invoice')
    ])
  ]));
  wrap.appendChild(el('div',{class:'small', text:`Route decisions: ${(state.platform.routeDecisions || []).length} · Invoices: ${(state.platform.invoices || []).length}` }));
  const decision = (state.platform.routeDecisions || [])[0];
  if (decision){
    wrap.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:`${decision.intent} → ${decision.selectedProviderId || 'none'}`}), el('span',{text:`${decision.reason || 'route decision'} · ${decision.ts || ''}`})]),
      el('span',{class:'badge purple', text:decision.ok ? 'Selected' : 'Blocked'})
    ]));
  }
  const invoice = (state.platform.invoices || [])[0];
  if (invoice){
    wrap.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:`Invoice ${invoice.invoiceNumber}`}), el('span',{text:`${invoice.status} · $${(Number(invoice.totalCents || 0)/100).toFixed(2)} · ${invoice.lineItems?.length || 0} lines`})]),
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>downloadText(`codestudio-invoice-${invoice.invoiceNumber}.json`, JSON.stringify(invoice, null, 2), 'application/json')}, 'Download')
    ]));
  }
  return wrap;
}

function renderWorkflowGraphBuilder(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  const graph = platformDefaultGraph();
  const ta = el('textarea',{class:'textarea platformTextarea', spellcheck:'false'});
  ta.value = JSON.stringify(graph, null, 2);
  wrap.appendChild(el('div',{class:'workflowGraphPreview'}, graph.nodes.map(node => el('div',{class:'graphNode'}, [el('b',{text:node.label || node.id}), el('span',{text:`${node.type}${node.providerId ? ' · '+node.providerId : ''}`})]))));
  wrap.appendChild(el('div',{class:'small', text:'Edit the graph JSON, then save it. The backend validates node/edge integrity and compiles it into a workflow manifest.'}));
  wrap.appendChild(ta);
  wrap.appendChild(el('div',{class:'platformActionRow'},[
    el('button',{class:'btn primary mini', type:'button', onclick:()=>platformBackendSaveWorkflowGraphFromUI(ta.value)}, 'Save graph + compile'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>{ ta.value = JSON.stringify(platformDefaultGraph(), null, 2); }}, 'Reset sample')
  ]));
  const graphs = (state.platform.workflowGraphs || []).slice(0, 5);
  if (graphs.length){
    const list = el('div',{class:'list'});
    for (const graph of graphs){
      list.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:graph.title || graph.id}), el('span',{text:`${graph.id} · ${graph.nodes?.length || 0} nodes · ${graph.edges?.length || 0} edges`})]), el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendRunWorkflowGraphFromUI(graph.id)}, 'Run graph') ]));
    }
    wrap.appendChild(list);
  }
  return wrap;
}

function renderDurableOpsPlane(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  wrap.appendChild(el('div',{class:'platformActionRow'},[
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendEnqueueJobFromUI('db_query_ai_summary')}, 'Queue DB+AI job'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendDrainJobsFromUI()}, 'Drain jobs'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendVerifyStorageFromUI()}, 'Verify storage'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendScheduleFromUI('db_query_ai_summary')}, 'Create schedule'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendTickSchedulesFromUI()}, 'Tick schedules'),
    el('button',{class:'btn primary mini', type:'button', onclick:()=>platformBackendExportProjectFromUI()}, 'Export project bundle')
  ]));
  wrap.appendChild(el('div',{class:'small', text:`Provider packs: ${state.platform.providerPacks.length} · Jobs: ${state.platform.jobs.length} · Dead letters: ${(state.platform.deadLetters || []).length} · Schedules: ${state.platform.schedules.length} · Meter events: ${state.platform.meterEvents.length} · Bundles: ${state.platform.bundles.length}`}));
  if (state.platform.storageAdapter){
    wrap.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:`Storage adapter: ${state.platform.storageAdapter.id || 'json'}`}), el('span',{text:`Available: ${(state.platform.storageAdapters || []).map(a => a.id).join(', ') || 'json'}`})]), el('span',{class:'badge purple', text:'State'} )]));
  }
  if ((state.platform.webhookDispatchRules || []).length){
    wrap.appendChild(el('div',{class:'small', text:`Webhook dispatch rules: ${(state.platform.webhookDispatchRules || []).length} mapped replay paths`}));
  }
  if (state.platform.meterSummary){
    wrap.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:'Usage meter summary'}), el('span',{text:`${state.platform.meterSummary.totalEvents || 0} events · est cost ${(Number(state.platform.meterSummary.totalCostCents || 0)/100).toFixed(2)}`})]),
      el('span',{class:'badge purple', text:'Metered'})
    ]));
  }
  const jobs = state.platform.jobs.slice(0, 5);
  if (jobs.length){
    wrap.appendChild(el('div',{class:'small', text:'Recent jobs'}));
    const list = el('div',{class:'list'});
    for (const job of jobs){
      list.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:`${job.workflowId || job.type} · ${job.status}`}), el('span',{text:`${job.id} · runAt ${job.runAt || job.ts}`})])]));
    }
    wrap.appendChild(list);
  }
  const deadLetters = (state.platform.deadLetters || []).slice(0, 5);
  if (deadLetters.length){
    wrap.appendChild(el('div',{class:'small', text:'Dead letters'}));
    const deadList = el('div',{class:'list'});
    for (const dead of deadLetters){
      deadList.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:`${dead.workflowId || dead.jobId} · failed`}), el('span',{text:`${dead.id} · attempts ${dead.attempts || 0} · ${dead.error || ''}`})]), el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendRetryDeadLetterFromUI(dead.id)}, 'Retry') ]));
    }
    wrap.appendChild(deadList);
  }
  const schedules = state.platform.schedules.slice(0, 5);
  if (schedules.length){
    wrap.appendChild(el('div',{class:'small', text:'Schedules'}));
    const list = el('div',{class:'list'});
    for (const schedule of schedules){
      list.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:`${schedule.workflowId} · ${schedule.status}`}), el('span',{text:`${schedule.id} · next ${schedule.nextRunAt || 'not set'}`})])]));
    }
    wrap.appendChild(list);
  }
  return wrap;
}

function renderProjectControlPlane(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  const name = el('input',{class:'input', placeholder:'New client/project name', autocomplete:'off'});
  const cap = el('input',{class:'input', placeholder:'Monthly cap in dollars, e.g. 500', autocomplete:'off', value:'500'});
  wrap.appendChild(el('div',{class:'grid2'},[name, cap]));
  wrap.appendChild(el('div',{class:'platformActionRow'},[
    el('button',{class:'btn primary mini', type:'button', onclick:()=>platformCreateProjectFromUI(name.value, cap.value)}, 'Create project'),
    el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformSyncBackendOperations()}, 'Sync backend ops')
  ]));
  const projects = el('div',{class:'list'});
  for (const project of state.platform.projects.slice(0, 10)){
    const active = project.id === platformActiveProjectId();
    const capText = project.budget && Number.isFinite(Number(project.budget.monthlyCapCents)) ? `$${(Number(project.budget.monthlyCapCents)/100).toFixed(0)} cap` : 'no cap';
    projects.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:project.name || project.id}), el('span',{text:`${project.id} · ${project.status || 'active'} · ${capText}`})]),
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformSetActiveProject(project.id)}, active ? 'Active' : 'Use')
    ]));
  }
  wrap.appendChild(projects);

  const installs = state.platform.providerInstalls.filter(p => p.projectId === platformActiveProjectId());
  wrap.appendChild(el('div',{class:'small', text:`Project provider installs for ${platformActiveProjectId()}: ${installs.filter(i => i.enabled).length}` }));
  const buttons = el('div',{class:'platformActionRow'});
  for (const pack of PROVIDER_PACKS.slice(0, 8)){
    const installed = installs.find(i => i.providerId === pack.id && i.enabled);
    buttons.appendChild(el('button',{class:'btn ghost mini', type:'button', onclick:()=>installed ? platformRotateProviderForProject(pack.id) : platformInstallProviderForProject(pack.id)}, installed ? `Rotate ${pack.id}` : `Install ${pack.id}`));
  }
  wrap.appendChild(buttons);
  return wrap;
}

function renderOperationsLedger(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  wrap.appendChild(el('div',{class:'small', text:`Active project: ${platformActiveProjectId()} · Runs: ${state.platform.workflowRuns.length} · Backend webhooks: ${state.platform.webhookBackendEvents.length} · Approvals: ${state.platform.approvalQueue.length}`}));
  const approvals = state.platform.approvalQueue.slice(0, 5);
  if (approvals.length){
    wrap.appendChild(el('div',{class:'small', text:'Approval queue'}));
    const list = el('div',{class:'list'});
    for (const approval of approvals){
      list.appendChild(el('div',{class:'listItem'},[
        el('div',{class:'left'},[el('b',{text:`${approval.subject || approval.reason} · ${approval.status}`}), el('span',{text:`${approval.id} · ${approval.ts || approval.updatedAt || ''}`})]),
        approval.status === 'open' ? el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformResolveApprovalFromUI(approval.id, 'approved')}, 'Approve') : el('span',{class:'badge', text:approval.status})
      ]));
    }
    wrap.appendChild(list);
  }
  const runs = state.platform.workflowRuns.slice(0, 6);
  if (runs.length){
    wrap.appendChild(el('div',{class:'small', text:'Recent workflow runs'}));
    const list = el('div',{class:'list'});
    for (const run of runs){
      list.appendChild(el('div',{class:'listItem'},[
        el('div',{class:'left'},[el('b',{text:`${run.templateId || run.workflowId || 'workflow'} · ${run.status || 'unknown'}`}), el('span',{text:`${run.id} · ${run.projectId || 'default'} · ${run.updatedAt || run.ts || ''}`})])
      ]));
    }
    wrap.appendChild(list);
  }
  const webhooks = state.platform.webhookBackendEvents.slice(0, 4);
  if (webhooks.length){
    wrap.appendChild(el('div',{class:'small', text:'Backend webhook queue'}));
    const list = el('div',{class:'list'});
    for (const event of webhooks){
      list.appendChild(el('div',{class:'listItem'},[
        el('div',{class:'left'},[el('b',{text:`${event.provider} · ${event.type}`}), el('span',{text:`${event.status} · ${event.id}`})])
      ]));
    }
    wrap.appendChild(list);
  }
  if (!approvals.length && !runs.length && !webhooks.length){
    wrap.appendChild(el('div',{class:'listItem'}, el('span',{class:'small', text:'No backend operations synced yet. Run backend smoke or sync ops after starting the platform server.'})));
  }
  return wrap;
}

function renderBackendBridge(){
  ensurePlatformState();
  const wrap = el('div',{class:'platformStack'});
  const input = el('input',{class:'input', value:state.platform.backendBase || 'http://localhost:7137', autocomplete:'off', 'aria-label':'Backend base URL'});
  const health = state.platform.backendLastHealth;
  wrap.appendChild(el('div',{class:'grid2'},[
    input,
    el('div',{class:'platformActionRow'},[
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformSetBackendBase(input.value)}, 'Save base'),
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendHealth()}, 'Probe health'),
      el('button',{class:'btn primary mini', type:'button', onclick:()=>platformBackendSmoke()}, 'Run backend smoke')
    ])
  ]));
  wrap.appendChild(el('div',{class:'small', text:'Run backend locally with: npm run platform:server. Use CODESTUDIO_PROVIDER_MODE=fixture for local proof receipts, or live env secrets for real provider calls.'}));
  if (health){
    const ok = !!health.ok;
    const providers = health.providers ? Object.entries(health.providers).filter(([,v]) => v && v.ok).length : 0;
    wrap.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:`Backend ${ok ? 'online' : 'offline'}`}), el('span',{text: ok ? `${health.mode || 'live'} mode · ${providers} provider probes OK` : (health.error || 'No response')})]),
      el('span',{class:'badge ' + (ok ? 'purple' : 'gold'), text:ok ? 'Connected' : 'Blocked'})
    ]));
  }
  if (state.platform.backendReceipts && state.platform.backendReceipts.length){
    wrap.appendChild(el('div',{class:'small', text:`Backend receipts cached: ${state.platform.backendReceipts.length}`}));
    wrap.appendChild(el('button',{class:'btn ghost mini', type:'button', onclick:()=>downloadText(`backend-receipts-${BUILD.buildId}.json`, JSON.stringify(state.platform.backendReceipts, null, 2), 'application/json')}, 'Download backend receipts'));
  }
  return wrap;
}

function renderPlatformModal(){
  ensurePlatformState();
  const stats = platformStats();

  modalBody.appendChild(renderOperatorCommandCenter(stats));

  const summary = el('div',{class:'platformSummary compact'},[
    platformMetric('Enabled providers', `${stats.providersEnabled}/${stats.providersTotal}`),
    platformMetric('Policy rules', String(stats.policyRules)),
    platformMetric('Workflows', String(stats.workflows)),
    platformMetric('Queued webhooks', String(stats.queuedWebhooks)),
    platformMetric('Projects', String(stats.projects)),
    platformMetric('Open approvals', String(stats.openApprovals)),
    platformMetric('Run history', String(stats.workflowRuns)),
    platformMetric('Jobs', String(stats.jobs)),
    platformMetric('Meters', String(stats.meterEvents)),
    platformMetric('Graphs', String(stats.workflowGraphs || 0)),
    platformMetric('Invoices', String(stats.invoices || 0)),
    platformMetric('Incidents', String(stats.openIncidents || 0)),
    platformMetric('Forms', String(stats.forms || 0)),
    platformMetric('Release gates', `${stats.releaseGatesDone}/${stats.releaseGatesTotal}`),
  ]);
  modalBody.appendChild(summary);

  modalBody.appendChild(el('div',{class:'platformActionRow'},[
    el('span',{class:'small', text:`Access check: read=${platformCan('read') ? 'yes' : 'no'} · write=${platformCan('write') ? 'yes' : 'no'} · run=${platformCan('run') ? 'yes' : 'no'}`})
  ]));

  modalBody.appendChild(platformSection('Backend execution bridge', renderBackendBridge()));
  modalBody.appendChild(platformSection('Project / tenancy plane', renderProjectControlPlane()));
  modalBody.appendChild(platformSection('Operations ledger', renderOperationsLedger()));
  modalBody.appendChild(platformSection('Intake, entitlements, incidents, audit', renderIntakeGuardrailsPlane()));
  modalBody.appendChild(platformSection('Durable jobs, schedules, meters, migrations', renderDurableOpsPlane()));
  modalBody.appendChild(platformSection('Provider routing + usage invoices', renderCommerceRoutingPlane()));
  modalBody.appendChild(platformSection('Visual workflow graph builder', renderWorkflowGraphBuilder()));
  modalBody.appendChild(platformSection('Provider marketplace', renderProviderCards()));
  modalBody.appendChild(platformSection('Policy rule builder', renderPolicyBuilder()));
  modalBody.appendChild(platformSection('Workflow templates', renderWorkflowTemplates()));
  modalBody.appendChild(platformSection('Webhook inbox / replay', renderWebhookInbox()));
  modalBody.appendChild(platformSection('Upstream auth claim intake', renderClaimsEditor()));
  modalBody.appendChild(platformSection('Release gates', renderReleaseGates()));
}

function platformMetric(label, value){
  return el('div',{class:'platformMetric'},[el('span',{text:label}), el('b',{text:value})]);
}

function platformSection(title, body){
  return el('section',{class:'platformSection'},[el('h3',{text:title}), body]);
}

function renderOperatorCommandCenter(stats){
  const health = state.platform.backendLastHealth || {};
  const score = state.platform.scorecard && Number.isFinite(state.platform.scorecard.score) ? state.platform.scorecard.score : null;
  const activeProject = (state.platform.projects || []).find(p => p.id === platformActiveProjectId()) || {name:'Default Workspace', id:'default'};
  const readyProviders = health.providers ? Object.values(health.providers).filter(p => p && p.ok).length : stats.providerInstalls;
  const openProblems = Number(stats.openApprovals || 0) + Number(stats.openIncidents || 0) + Number(stats.deadLetters || 0);
  return el('div',{class:'operatorCommandCenter'},[
    el('div',{class:'operatorHero'},[
      el('div',{},[
        el('span',{class:'eyebrow', text:'Operator command center'}),
        el('h2',{text:activeProject.name || activeProject.id}),
        el('p',{class:'small', text:`${platformActiveProjectId()} · backend ${health.ok ? 'online' : 'not checked'} · ${readyProviders} provider probes ready · ${openProblems} open issues`})
      ]),
      el('div',{class:'operatorScore'},[
        el('span',{text:'Platform score'}),
        el('b',{text:score === null ? '—' : String(score)})
      ])
    ]),
    el('div',{class:'operatorQuickActions'},[
      el('button',{class:'btn primary', type:'button', onclick:()=>platformBackendHealth()}, 'Sync backend'),
      el('button',{class:'btn ghost', type:'button', onclick:()=>platformRefreshBackendState()}, 'Refresh ledgers'),
      el('button',{class:'btn ghost', type:'button', onclick:()=>platformBackendOpenApi()}, 'Load OpenAPI'),
      el('button',{class:'btn ghost', type:'button', onclick:()=>platformMaterializeFiles(true)}, 'Materialize files'),
      el('button',{class:'btn ghost', type:'button', onclick:()=>downloadText(`platform-manifest-${BUILD.buildId}.json`, JSON.stringify(platformManifestObject(), null, 2), 'application/json')}, 'Export manifest')
    ]),
    el('div',{class:'operatorFocusGrid'},[
      platformFocusTile('Execution', `${stats.workflowRuns} runs`, `${stats.jobs} jobs · ${stats.deadLetters || 0} dead letters`),
      platformFocusTile('Risk', `${stats.openApprovals} approvals`, `${stats.openIncidents || 0} incidents`),
      platformFocusTile('Commerce', `${stats.invoices || 0} invoices`, `${stats.meterEvents || 0} meter events`),
      platformFocusTile('Build proof', `${stats.releaseGatesDone}/${stats.releaseGatesTotal}`, 'release gates')
    ])
  ]);
}

function platformFocusTile(label, value, sub){
  return el('div',{class:'operatorFocusTile'},[el('span',{text:label}), el('b',{text:value}), el('small',{text:sub})]);
}

function renderProviderCards(){
  const wrap = el('div',{class:'platformCards'});
  for (const pack of PROVIDER_PACKS){
    const st = providerState(pack.id);
    const card = el('div',{class:'providerCard ' + (st && st.enabled ? 'enabled' : '')},[
      el('div',{class:'providerTop'},[
        el('div',{},[el('b',{text:pack.title}), el('span',{text:`${pack.lane} · ${pack.routes.length} routes`})]),
        el('span',{class:'badge ' + (st && st.enabled ? 'purple' : ''), text:st && st.enabled ? 'Enabled' : 'Available'})
      ]),
      el('div',{class:'small', text:`Secrets: ${pack.requiredSecrets.join(', ')}`}),
      el('div',{class:'small', text:`Backend: ${pack.backend || 'not wired'}`}),
      el('div',{class:'small', text:`Secret ref: ${(st && st.secretRef) || 'not assigned'}`}),
      el('div',{class:'platformActionRow'},[
        el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformToggleProvider(pack.id)}, st && st.enabled ? 'Disable' : 'Enable'),
        el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformRotateSecretRef(pack.id)}, 'Rotate ref')
      ])
    ]);
    wrap.appendChild(card);
  }
  return wrap;
}

function renderPolicyBuilder(){
  const wrap = el('div',{class:'platformStack'});
  const scope = el('select',{class:'select'}, PROVIDER_PACKS.map(p => el('option',{value:p.lane, text:p.lane})));
  const action = el('input',{class:'input', placeholder:'Action, e.g. ai.tokens.per.call', autocomplete:'off'});
  const limit = el('input',{class:'input', placeholder:'Limit, e.g. 1200 / approval_required', autocomplete:'off'});
  const effect = el('select',{class:'select'},[
    el('option',{value:'cap', text:'cap'}),
    el('option',{value:'restrict', text:'restrict'}),
    el('option',{value:'approval_required', text:'approval_required'}),
    el('option',{value:'block', text:'block'}),
  ]);
  const approval = el('input',{type:'checkbox'});
  wrap.appendChild(el('div',{class:'grid2'},[scope, action, limit, effect]));
  wrap.appendChild(el('label',{class:'row'},[approval, el('span',{class:'small', text:'Requires approval'})]));
  wrap.appendChild(el('button',{class:'btn primary', type:'button', onclick:()=>platformAddPolicyRule(scope.value, action.value, limit.value, effect.value, approval.checked)}, 'Add policy rule'));

  const list = el('div',{class:'list'});
  for (const rule of state.platform.policyRules){
    list.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:`${rule.scope} · ${rule.action}`}), el('span',{text:`${rule.effect} / ${rule.limit} / approval=${rule.requiresApproval ? 'yes' : 'no'}`})]),
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformRemovePolicyRule(rule.id)}, 'Remove')
    ]));
  }
  wrap.appendChild(list);
  return wrap;
}

function renderWorkflowTemplates(){
  const wrap = el('div',{class:'platformCards'});
  for (const tpl of WORKFLOW_TEMPLATES){
    const wf = state.platform.workflows.find(w => w.templateId === tpl.id);
    const missing = tpl.requiredProviders.filter(id => !(providerState(id) && providerState(id).enabled));
    wrap.appendChild(el('div',{class:'providerCard ' + (wf ? 'enabled' : '')},[
      el('div',{class:'providerTop'},[
        el('div',{},[el('b',{text:tpl.title}), el('span',{text:`${tpl.category} · output: ${tpl.output}`})]),
        el('span',{class:'badge ' + (missing.length ? 'gold' : 'purple'), text:missing.length ? `${missing.length} missing` : 'Ready'})
      ]),
      el('div',{class:'small', text:`Providers: ${tpl.requiredProviders.join(', ')}`}),
      el('div',{class:'small', text:`Steps: ${tpl.steps.join(' → ')}`}),
      wf && wf.lastPreflight ? el('div',{class:'small', text:`Last preflight: ${wf.lastPreflight.ok ? 'passed' : 'blocked'} · ${wf.lastPreflight.message}`}) : el('div',{class:'small', text:'Not installed yet.'}),
      el('div',{class:'platformActionRow'},[
        el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformInstallWorkflow(tpl.id)}, wf ? 'Open file' : 'Install'),
        el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformPreflightWorkflow(tpl.id)}, 'Local preflight'),
        el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformBackendPreflightWorkflow(tpl.id)}, 'Backend preflight'),
        el('button',{class:'btn primary mini', type:'button', onclick:()=>platformBackendRunWorkflow(tpl.id)}, 'Run backend')
      ])
    ]));
  }
  return wrap;
}

function renderWebhookInbox(){
  const wrap = el('div',{class:'platformStack'});
  const sample = JSON.stringify({provider:'stripe', type:'checkout.session.completed', data:{id:'cs_test_123', customer:'demo'}}, null, 2);
  const ta = el('textarea',{class:'textarea platformTextarea', placeholder:sample});
  wrap.appendChild(ta);
  wrap.appendChild(el('button',{class:'btn primary', type:'button', onclick:()=>platformIngestWebhook(ta.value || sample)}, 'Queue webhook JSON'));
  const list = el('div',{class:'list'});
  const events = state.platform.webhookInbox.slice(0, 12);
  if (!events.length) list.appendChild(el('div',{class:'listItem'}, el('span',{class:'small', text:'No webhook events queued yet.'})));
  for (const event of events){
    list.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:`${event.provider} · ${event.type}`}), el('span',{text:`${event.status} · routedTo=${event.routedTo || 'none'} · ${event.ts}`})]),
      el('button',{class:'btn ghost mini', type:'button', onclick:()=>platformReplayWebhook(event.id)}, 'Replay local')
    ]));
  }
  wrap.appendChild(list);
  return wrap;
}

function renderClaimsEditor(){
  const wrap = el('div',{class:'platformStack'});
  const ta = el('textarea',{class:'textarea platformTextarea', spellcheck:'false'});
  ta.value = JSON.stringify(state.platform.upstreamClaims, null, 2);
  wrap.appendChild(el('div',{class:'small', text:'Paste the upstream auth claim shape this app should honor. No auth is implemented here; this is the contract surface downstream modules consume.'}));
  wrap.appendChild(ta);
  wrap.appendChild(el('button',{class:'btn primary', type:'button', onclick:()=>platformSaveClaims(ta.value)}, 'Save claims sample'));
  return wrap;
}

function renderReleaseGates(){
  const wrap = el('div',{class:'platformStack'});
  const list = el('div',{class:'list'});
  for (const gate of state.platform.releaseGates){
    const box = el('input',{type:'checkbox'});
    box.checked = !!gate.done;
    box.addEventListener('change', ()=>platformToggleGate(gate.id, box.checked));
    list.appendChild(el('label',{class:'listItem'},[
      el('div',{class:'left'},[el('b',{text:gate.title}), el('span',{text:gate.done ? 'Marked done' : 'Open'})]),
      box
    ]));
  }
  wrap.appendChild(list);
  const recent = state.platform.receipts.slice(0, 6);
  if (recent.length){
    wrap.appendChild(el('div',{class:'hr'}));
    wrap.appendChild(el('div',{class:'small', text:'Recent receipts'}));
    const receipts = el('div',{class:'list'});
    for (const r of recent){
      receipts.appendChild(el('div',{class:'listItem'},[el('div',{class:'left'},[el('b',{text:`${r.type} · ${r.ok ? 'ok' : 'blocked'}`}), el('span',{text:`${r.ts} · ${r.message || r.note || ''}`})]) ]));
    }
    wrap.appendChild(receipts);
  }
  return wrap;
}

// ===== About / Health =====
function renderTutorialModal(payload){
  const firstRun = !!(payload && payload.firstRun);

  const header = el('div',{class:'small', text: firstRun
    ? 'Welcome. This 90-second walkthrough gets users productive fast.'
    : 'Quick walkthrough of the main workflows.'});

  const steps = el('div',{class:'list'},[
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'1) Explorer → open files'}),
        el('span',{text:'Right-click a file in Explorer for Rename/Delete. Click a file to open it in a tab.'})
      ]),
      el('span',{class:'badge', text:'Core'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'2) Create content'}),
        el('span',{text:'Use “+ File” or “+ Folder”. Filename controls language (e.g., .js, .html, .css).'})
      ]),
      el('span',{class:'badge', text:'Core'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'3) Preview HTML (Ctrl+P)'}),
        el('span',{text:'Preview is sanitized for safety (scripts stripped). Use Run for JavaScript execution.'})
      ]),
      el('span',{class:'badge gold', text:'Safe'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'4) Run JS (Ctrl+Enter)'}),
        el('span',{text:'Runs inside the sandbox (network blocked). Logs appear in Terminal (Ctrl+`).'})
      ]),
      el('span',{class:'badge purple', text:'Sandbox'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'5) Secure Vault (Ctrl+K)'}),
        el('span',{text:'Create/unlock your encrypted vault. Paste your Kaixu Gateway sub-key once.'})
      ]),
      el('span',{class:'badge', text:'Security'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'6) Ask kAIxu (Assistant panel)'}),
        el('span',{text:'Your prompt can include the active file as context. AI routes through Kaixu Gateway only.'})
      ]),
      el('span',{class:'badge', text:'AI'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'7) Export / Import'}),
        el('span',{text:'Use Export to download your workspace JSON. Import restores workspace + tabs + chat.'})
      ]),
      el('span',{class:'badge', text:'Portability'})
    ]),
    el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:'8) Commands (Ctrl+O)'}),
        el('span',{text:'Everything is discoverable from the command palette: vault, preview, run, exports, health.'})
      ]),
      el('span',{class:'badge', text:'Discoverability'})
    ]),
  ]);

  const tips = el('div',{class:'small'}, 
    'Tip: In Settings, you can enable “Encrypt workspace at rest.” That requires vault unlock on launch, but hardens the device footprint.'
  );

  const row = el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: ()=>{ closeModal(); }}, 'Close'),
    el('div',{class:'spacer'}),
    el('button',{class:'btn primary', type:'button', onclick: async ()=>{
      try{
        await kvSet(state.db, 'onboardingSeen', true);
        await auditWrite(state.db, 'tutorial_complete', {firstRun});
      }catch(e){}
      closeModal();
      toast('Tutorial saved', 'success', 'You can reopen it anytime from Commands → Tutorial.');
    }}, firstRun ? 'Finish' : 'Mark as done')
  ]);

  modalBody.appendChild(header);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(steps);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(tips);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(row);
}

async function renderAboutModal(){
  const lines = [];
  lines.push({label:'App', value:`${BUILD.app}`});
  lines.push({label:'Vendor', value:`${BUILD.vendor}`});
  lines.push({label:'Version', value:`${BUILD.version}`});
  lines.push({label:'Schema', value:`${BUILD.schema}`});
  lines.push({label:'Build ID', value:`${BUILD.buildId}`});
  lines.push({label:'Built at', value:`${BUILD.builtAt}`});
  lines.push({label:'DB', value:`${DB_NAME} v${DB_VERSION}`});
  lines.push({label:'Device ID', value: state.deviceId ? state.deviceId : '—'});
  lines.push({label:'Network', value: state.online ? 'Online' : 'Offline'});
  lines.push({label:'Vault', value: state.vaultUnlocked ? 'Unlocked' : (state.vaultSealed ? 'Locked' : 'Not created')});
  lines.push({label:'Workspace', value: state.ws ? 'Loaded' : 'Locked/Unavailable'});
  lines.push({label:'Platform', value: state.platform ? `${platformStats().providersEnabled}/${platformStats().providersTotal} providers · ${platformStats().workflows} workflows` : 'Not initialized'});

  let storageEstimate = null;
  if (navigator.storage && navigator.storage.estimate){
    try { storageEstimate = await navigator.storage.estimate(); } catch(e){}
  }

  const box = el('div',{class:'list'});
  for (const l of lines){
    box.appendChild(el('div',{class:'listItem'},[
      el('div',{class:'left'},[
        el('b',{text:l.label}),
        el('span',{text:l.value})
      ])
    ]));
  }

  modalBody.appendChild(box);

  if (storageEstimate){
    modalBody.appendChild(el('div',{class:'hr'}));
    modalBody.appendChild(el('div',{class:'small', text:`Storage: ${humanBytes(storageEstimate.usage||0)} used / ${humanBytes(storageEstimate.quota||0)} quota`}));
  }

  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: async ()=>{
      const audit = await auditList(state.db, 1000);
      downloadText(`kaixu-audit-${BUILD.buildId}.json`, JSON.stringify(audit, null, 2), 'application/json');
      toast('Exported audit log', 'success', `${audit.length} entries`);
    }}, 'Export audit'),
    el('button',{class:'btn ghost', type:'button', onclick: async ()=>{
      const diag = await buildDiagnostics();
      downloadText(`kaixu-diagnostics-${BUILD.buildId}.json`, JSON.stringify(diag, null, 2), 'application/json');
      toast('Exported diagnostics', 'success', 'JSON downloaded');
    }}, 'Export diagnostics'),
    el('button',{class:'btn ghost', type:'button', onclick: async ()=>{
      await resetApp();
    }}, 'Factory reset'),
  ]));
}

async function buildDiagnostics(){
  const audit = await auditList(state.db, 100);
  const storage = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(()=>null) : null;
  return {
    build: BUILD,
    userAgent: navigator.userAgent,
    online: state.online,
    sw: state.sw,
    settings: {...state.settings, vaultSecret:'[REDACTED]'},
    vault: {exists: !!state.vaultSealed, unlocked: !!state.vaultUnlocked, workspaceEncrypt: !!state.settings.workspaceEncrypt},
    workspace: state.ws ? {schema: state.ws.schema, updatedAt: state.ws.updatedAt, nodeCount: Object.keys(state.ws.nodes||{}).length} : null,
    platform: state.platform ? platformStats() : null,
    storage,
    recentAudit: audit
  };
}

// ===== Export / Import =====
function downloadText(filename, text, mime='text/plain'){
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

async function exportWorkspace(){
  if (!state.ws){
    toast('Workspace unavailable', 'warn', 'Unlock vault if workspace is encrypted.');
    return;
  }
  const payload = {
    exportedAt: nowISO(),
    build: BUILD,
    settings: {...state.settings, vaultSecret:'[REDACTED]'},
    workspace: state.ws,
    platform: state.platform,
    tabs: {tabs: state.tabs, active: state.activeTab},
    chat: state.chat
  };
  await auditWrite(state.db, 'export', {nodeCount: Object.keys(state.ws.nodes||{}).length});
  downloadText(`kaixu-workspace-${BUILD.buildId}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

async function importWorkspace(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    try{
      const file = input.files && input.files[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !data.workspace || !data.workspace.nodes) throw new Error('Invalid import file.');

      // basic schema check
      const ws = data.workspace;
      if (!ws.nodes.root) throw new Error('Missing root node.');

      state.ws = ws;
      await kvSet(state.db, 'workspace', ws);
      state.tabs = (data.tabs && Array.isArray(data.tabs.tabs)) ? data.tabs.tabs : [];
      state.activeTab = (data.tabs && data.tabs.active) ? data.tabs.active : null;
      state.chat = Array.isArray(data.chat) ? data.chat : [];
      if (data.platform && typeof data.platform === 'object') state.platform = data.platform;
      ensurePlatformState();

      await kvSet(state.db, 'tabs', {tabs: state.tabs, active: state.activeTab});
      await kvSet(state.db, 'chat', state.chat);
      await kvSet(state.db, 'platform', state.platform);
      await auditWrite(state.db, 'import', {nodeCount: Object.keys(ws.nodes||{}).length});
      toast('Imported', 'success', 'Workspace loaded.');
      renderAll();
    }catch(e){
      toast('Import failed', 'error', e && e.message ? e.message : String(e));
      await auditWrite(state.db,'import_fail',{});
    }
  };
  input.click();
}

// ===== Reset =====
async function resetApp(){
  openModal('confirm', {
    title: 'Factory reset',
    message: 'This clears local workspace, settings, vault, and logs on this device.',
    confirmText: 'Reset',
    danger: true,
    onConfirm: async ()=>{
      await auditWrite(state.db,'factory_reset',{});
      state.vaultUnlocked = false;
      state.vaultSecret = null;
      state.vaultMeta = null;
      await kvDel(state.db,'workspace');
      await kvDel(state.db,'settings');
      await kvDel(state.db,'vault');
      await kvDel(state.db,'tabs');
      await kvDel(state.db,'chat');
      await kvDel(state.db,'platform');
      toast('Reset complete', 'success', 'Reloading…');
      setTimeout(()=>location.reload(), 400);
    }
  });
}

// ===== Preview + Run =====
function togglePreview(){
  state.previewOpen = !state.previewOpen;
  bumpActivity();
  renderEditor();
  if (state.previewOpen){
    const file = getActiveFile();
    if (file && file.language === 'html'){
      sandboxPreviewHTML(file.content);
      toast('Preview', 'success', 'Scripts are stripped for safety. Use Run for JS files.');
    } else {
      sandboxPreviewHTML('<!doctype html><html><body><pre>Preview works for HTML files.</pre></body></html>');
    }
  } else {
    sandboxClear();
  }
}

function runActive(){
  const file = getActiveFile();
  if (!file){
    toast('Nothing to run', 'warn', 'Open a JS file.');
    return;
  }
  if (file.language !== 'javascript'){
    toast('Run supports JS', 'warn', 'Open a .js file to run in the sandbox.');
    return;
  }
  setTerminalOpen(true);
  logTerminal('info', `[run] ${file.name}`);
  sandboxRunJS(file.content, file.name);
}

function syncEditorToState(){
  const file = getActiveFile();
  if (!file) return;
  const area = $('codeArea');
  file.content = area.value;
  renderGutter(file.content);
  scheduleSave();
}

let saveTimer = null;
function scheduleSave(){
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveWorkspace('edit').catch(()=>{}), 500);
}

// ===== Service Worker =====
async function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register('./service-worker.js', {scope:'./'});
    state.sw.registered = true;

    function onUpdateFound(){
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller){
          state.updateReady = true;
          renderPills();
          toast('Update ready', 'warn', 'Reload to apply.');
        }
      });
    }

    reg.addEventListener('updatefound', onUpdateFound);
    if (reg.waiting){
      state.updateReady = true;
      renderPills();
    }
  }catch(e){
    // ignore
  }
}

// ===== Device ID =====
async function ensureDeviceId(){
  let id = await kvGet(state.db, 'deviceId');
  if (!id){
    id = 'dev_' + makeId();
    await kvSet(state.db,'deviceId', id);
  }
  state.deviceId = id;
}

// ===== Event wiring =====
function wireUI(){
  // Top actions
  $('btnCommands').addEventListener('click', ()=>openModal('commands',{}));
  $('btnFind').addEventListener('click', ()=>openModal('find',{}));
  $('btnTerminal').addEventListener('click', ()=>setTerminalOpen(!state.terminalOpen));
  $('btnVault').addEventListener('click', ()=>vaultUnlockFlow());
  $('btnExport').addEventListener('click', ()=>exportWorkspace());
  $('btnImport').addEventListener('click', ()=>importWorkspace());
  $('btnSettings').addEventListener('click', ()=>openModal('settings',{}));
  $('btnPlatform').addEventListener('click', ()=>openModal('platform',{}));
  $('btnAbout').addEventListener('click', ()=>openModal('about',{}));
  $('btnTutorial').addEventListener('click', ()=>openModal('tutorial',{firstRun:false}));
  $('btnReload').addEventListener('click', ()=>location.reload());

  // Explorer
  $('explorerFilter').addEventListener('input', (e)=>{ state.explorerFilter = e.target.value; renderTree(); });
  $('btnNewFile').addEventListener('click', ()=>promptCreate('file'));
  $('btnNewFolder').addEventListener('click', ()=>promptCreate('folder'));

  // Editor
  $('btnPreview').addEventListener('click', togglePreview);
  $('btnRun').addEventListener('click', runActive);
  $('codeArea').addEventListener('input', ()=>{ bumpActivity(); syncEditorToState(); });

  // Assistant
  $('btnClearChat').addEventListener('click', async ()=>{
    state.chat = [];
    await kvSet(state.db,'chat', state.chat);
    await auditWrite(state.db,'chat_clear',{});
    renderChat();
    toast('Chat cleared','success','');
  });
  $('btnSendAI').addEventListener('click', ()=>sendAI());
  $('aiPrompt').addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
      e.preventDefault();
      sendAI();
    }
  });
  $('aiModel').addEventListener('change', (e)=>{
    state.settings.aiModel = e.target.value;
    kvSet(state.db,'settings', state.settings).catch(()=>{});
  });

  // Terminal buttons
  $('btnTerminalClose').addEventListener('click', ()=>setTerminalOpen(false));
  $('btnTerminalClear').addEventListener('click', ()=>{
    state.terminalLogs = [];
    renderTerminal();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && k.toLowerCase() === 'o'){ e.preventDefault(); openModal('commands',{}); }
    if (ctrl && k.toLowerCase() === 'k'){ e.preventDefault(); vaultUnlockFlow(); }
    if (ctrl && k.toLowerCase() === 'f'){ e.preventDefault(); openModal('find',{}); }
    if (ctrl && k.toLowerCase() === 'h'){ e.preventDefault(); openModal('about',{}); }
    if (ctrl && k.toLowerCase() === 'p'){ e.preventDefault(); togglePreview(); }
    if (ctrl && e.shiftKey && k.toLowerCase() === 'e'){ e.preventDefault(); exportWorkspace(); }
    if (ctrl && e.shiftKey && k.toLowerCase() === 'i'){ e.preventDefault(); importWorkspace(); }
    if (ctrl && k === '`'){ e.preventDefault(); setTerminalOpen(!state.terminalOpen); }
    if (ctrl && k === 'Enter'){ e.preventDefault(); runActive(); }
  });

  // network status
  window.addEventListener('online', ()=>{ state.online = true; renderPills(); });
  window.addEventListener('offline', ()=>{ state.online = false; renderPills(); });

  // activity bump
  ['click','mousemove','keydown','touchstart'].forEach((evt) => {
    window.addEventListener(evt, bumpActivity, {passive:true});
  });
}

function promptCreate(kind){
  if (!state.ws){
    toast('Workspace locked', 'warn', 'Unlock vault to open encrypted workspace.');
    return;
  }
  openModal('create', {kind: kind === 'folder' ? 'folder' : 'file'});
}

function renderCreateModal(kind){
  const isFolder = kind === 'folder';
  const inp = el('input',{class:'input', placeholder: isFolder ? 'Folder name…' : 'File name…', value: isFolder ? 'New Folder' : 'new-file.js'});
  const status = el('div',{class:'small', text:''});

  modalBody.appendChild(inp);
  modalBody.appendChild(el('div',{class:'hr'}));
  modalBody.appendChild(el('div',{class:'row'},[
    el('button',{class:'btn ghost', type:'button', onclick: closeModal}, 'Cancel'),
    el('button',{class:'btn primary', type:'button', onclick: ()=>{
      try{
        if (isFolder) createFolder('root', inp.value);
        else createFile('root', inp.value);
        closeModal();
      }catch(e){
        status.textContent = e && e.message ? e.message : String(e);
      }
    }}, 'Create')
  ]));
  modalBody.appendChild(status);
  setTimeout(()=>inp.focus(),20);
}

async function sendAI(){
  const box = $('aiPrompt');
  const text = String(box.value||'').trim();
  if (!text) return;
  appendChat('user', text);
  box.value = '';
  await callKaixu(text);
}

// ===== Boot =====
async function boot(){
  // splash stays until end
  $('splash').classList.remove('hidden');

  try{
    state.db = await idbOpen();
    await ensureDeviceId();
    await migrateLegacyLocalStorage();

    const settings = await kvGet(state.db, 'settings');
    if (settings && typeof settings === 'object') state.settings = {...state.settings, ...settings};

    const tabs = await kvGet(state.db, 'tabs');
    if (tabs && typeof tabs === 'object'){
      state.tabs = Array.isArray(tabs.tabs) ? tabs.tabs : [];
      state.activeTab = tabs.active || null;
    }

    const chat = await kvGet(state.db, 'chat');
    if (Array.isArray(chat)) state.chat = chat;

    const vault = await kvGet(state.db, 'vault');
    if (vault) state.vaultSealed = vault;

    const platform = await kvGet(state.db, 'platform');
    state.platform = platform && typeof platform === 'object' ? platform : defaultPlatform();
    ensurePlatformState();
    await kvSet(state.db, 'platform', state.platform);

    $('aiModel').value = state.settings.aiModel || 'kaixu:smart';
    applyPolicyTemplate(state.settings.policyTemplate || 'Team', true);
    setEditorFontPreset(state.settings.editorFontPreset || 'medium');

    await loadWorkspace();

    // If workspace is encrypted and vault exists, encourage unlock (no auto prompt)
    if (!state.ws && state.vaultSealed){
      toast('Workspace encrypted', 'warn', 'Unlock vault to access workspace.');
    }

    wireUI();
    await registerSW();

    state.online = navigator.onLine;
    renderAll();

    // Open a default tab
    if (state.ws && !state.activeTab){
      const root = getRoot();
      const firstFile = (root.children || []).map(id => getNode(id)).find(n => n && n.type === 'file');
      if (firstFile){
        setActiveTab(firstFile.id);
      }
    } else {
      renderEditor();
    }

    // preload sandbox host only when preview/run is first used
    // keep splash a minimum time
    await new Promise(r => setTimeout(r, 350));

    $('splash').classList.add('hidden');
    await auditWrite(state.db, 'boot', {version: BUILD.version, buildId: BUILD.buildId});
  }catch(e){
    $('splash').classList.add('hidden');
    toast('Boot failed', 'error', e && e.message ? e.message : String(e));
  }
}

boot();
