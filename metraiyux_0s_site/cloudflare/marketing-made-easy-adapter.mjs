import { generateWebCreatorAurenReply } from './webcreator-auren-core.mjs';

const MME_BASE = '/api/marketing-made-easy';
const MME_PUBLIC_BASE = '/Marketing-Made-Easy';
const MME_STATE_KEY = 'marketing-made-easy:v1:state';
const MME_AE_VENDOR_PACKET_PREFIX = 'marketing-made-easy:v1:ae-vendor-packet:';
const MME_AE_VENDOR_FILE_PREFIX = 'marketing-made-easy:v1:ae-vendor-file:';
const MME_AE_VENDOR_PAYMENT_PREFIX = 'marketing-made-easy:v1:ae-vendor-payment-profile:';
const MME_AE_VENDOR_AUDIT_PREFIX = 'marketing-made-easy:v1:ae-vendor-audit:';
const MME_AE_VENDOR_INDEX_KEY = 'marketing-made-easy:v1:ae-vendor-packet-index';
const MME_STORAGE_TTL = 60 * 60 * 24 * 90;
const MME_AE_VENDOR_MAX_FILE_BYTES = 8 * 1024 * 1024;
const MME_AE_VENDOR_MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const MME_AE_VENDOR_ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.docx']);
const MME_AE_VENDOR_ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const MME_AE_VENDOR_REQUIRED_FIELDS = [
  'legal_name',
  'email',
  'phone',
  'typed_signature',
  'signature_date',
  'accept_ic_agreement',
  'accept_commission_plan',
  'accept_confidentiality',
  'accept_no_guarantees',
  'payment_method',
  'payment_display_name'
];
const MME_AE_VENDOR_DOCS = Object.freeze([
  { id: 'az-independent-contractor-agreement', title: 'Arizona Independent Contractor Agreement', href: '/Free99/apps/sovereigndocs/build/US-AZ/commercial-contracts/independent-contractor-agreement/' },
  { id: 'az-vendor-agreement', title: 'Arizona Vendor Agreement', href: '/Free99/apps/sovereigndocs/build/US-AZ/commercial-contracts/vendor-agreement/' },
  { id: 'az-contractor-onboarding-packet', title: 'Arizona Contractor Onboarding Packet', href: '/Free99/apps/sovereigndocs/build/US-AZ/employment-hr/contractor-onboarding-packet/' },
  { id: 'az-commission-plan', title: 'Arizona Sales Commission Plan', href: '/Free99/apps/sovereigndocs/build/US-AZ/employment-hr/commission-plan/' },
  { id: 'az-w9-request-letter', title: 'W-9 Request Letter', href: '/Free99/apps/sovereigndocs/build/US-AZ/tax-records-compliance/w9-request-letter/' },
  { id: 'az-1099-vendor-tracker', title: '1099 Vendor Tracker', href: '/Free99/apps/sovereigndocs/build/US-AZ/tax-records-compliance/1099-vendor-tracker/' },
  { id: 'az-ach-authorization', title: 'ACH Authorization Form', href: '/Free99/apps/sovereigndocs/build/US-AZ/finance-lending/ach-authorization-form/' }
]);

const MME_MODULES = Object.freeze([
  {
    id: 'ae-flowpro',
    name: 'AE-FlowPro',
    lane: 'sales-activation',
    summary: 'Lead flow, offer queue, follow-up rail, activation packs, and close-path proof.',
    entryPath: `${MME_PUBLIC_BASE}/AE-FlowPro/index.html`,
    workspaceRole: 'activation'
  },
  {
    id: 'brandid-offline-pwa',
    name: 'BrandID Offline PWA',
    lane: 'brand-identity',
    summary: 'Offline-first identity builder with local SVG export, outbox controls, and handoff packets.',
    entryPath: `${MME_PUBLIC_BASE}/BrandID-Offline-PWA/index.html`,
    workspaceRole: 'brand'
  },
  {
    id: 'businesslaunchgo',
    name: 'BusinessLaunchGo',
    lane: 'launch-packs',
    summary: 'Arizona launch-pack generation, export flows, and launch intake routing.',
    entryPath: `${MME_PUBLIC_BASE}/BusinessLaunchGo/index.html`,
    workspaceRole: 'launch'
  },
  {
    id: 'skyedocxmax',
    name: 'SkyeDocxMax',
    lane: 'documents',
    summary: 'Local-first document editor and package handoff room mounted under the shared gate.',
    entryPath: `${MME_PUBLIC_BASE}/SkyeDocxMax/index.html`,
    workspaceRole: 'documents'
  },
  {
    id: 'skyewebcreatormax',
    name: 'SkyeWebCreatorMax',
    lane: 'site-generation',
    summary: 'Website, UI, app-shell, preview, delivery, review, execution, and dispatch platform room.',
    entryPath: `${MME_PUBLIC_BASE}/SkyeWebCreatorMax/index.html`,
    workspaceRole: 'build'
  },
  {
    id: 'webgrowthoperator',
    name: 'WebGrowthOperator',
    lane: 'growth-ops',
    summary: 'Managed web presence, proof pages, AE command hub, and client portal lane.',
    entryPath: `${MME_PUBLIC_BASE}/WebGrowthOperator/index.html`,
    workspaceRole: 'growth'
  },
  {
    id: 'arizona-growth-index',
    name: 'Arizona Growth Index',
    lane: 'market-intelligence',
    summary: 'Arizona city insights, local market intelligence, reports, and regional growth proof.',
    entryPath: `${MME_PUBLIC_BASE}/arizona-growth-index/index.html`,
    workspaceRole: 'intelligence'
  },
  {
    id: 'kaixu-brandkit',
    name: 'kAIxU BrandKit',
    lane: 'brand-systems',
    summary: 'Brand system, voice board, asset kit, and campaign handoff lane.',
    entryPath: `${MME_PUBLIC_BASE}/kAIxUBrandKit/index.html`,
    workspaceRole: 'brand'
  }
]);

const MME_PUBLIC_ROUTES = Object.freeze([
  '/health',
  '/platform/status',
  '/platform/manifest',
  '/platform/catalog',
  '/platform/apps'
]);

function mmeHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-skye-gate-session,x-admin-token',
    'cache-control': 'no-store',
    ...extra
  };
}

function mmeJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: mmeHeaders({ 'content-type': 'application/json; charset=utf-8' })
  });
}

function mmeNow() {
  return new Date().toISOString();
}

function mmeText(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function mmeSafeFilename(value) {
  return mmeText(value || 'file', 160).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
}

function mmeFileExt(value) {
  const match = String(value || '').toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function mmeValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function mmeMask(value = '', visible = 4) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= visible) return '*'.repeat(text.length);
  return `${'*'.repeat(Math.max(4, text.length - visible))}${text.slice(-visible)}`;
}

function mmeBase64ToBytes(value) {
  const binary = atob(String(value || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function mmeBytesToBase64(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < input.length; index += chunkSize) {
    binary += String.fromCharCode(...input.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function mmeSha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

function mmeAeVendorEncryptionSecret(env) {
  return String(env.AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64 || env.CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64 || '').trim();
}

async function mmeAeVendorCryptoKey(env) {
  const raw = mmeAeVendorEncryptionSecret(env);
  if (!raw) throw new Error('Missing AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64 or CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64.');
  const keyBytes = mmeBase64ToBytes(raw);
  if (keyBytes.length !== 32) throw new Error('AE vendor packet encryption key must decode to exactly 32 bytes.');
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
}

async function mmeAeVendorEncryptBytes(env, bytes) {
  const key = await mmeAeVendorCryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return {
    algorithm: 'AES-256-GCM',
    iv: mmeBytesToBase64(iv),
    ciphertext: mmeBytesToBase64(new Uint8Array(encrypted))
  };
}

async function mmeAeVendorEncryptObject(env, object) {
  return mmeAeVendorEncryptBytes(env, new TextEncoder().encode(JSON.stringify(object, null, 2)));
}

function mmeAeVendorStorageStatus(env) {
  const storageMode = mmeStorageMode(env);
  return {
    storage_mode: storageMode,
    storage_configured: Boolean(mmeKv(env)),
    encrypted_storage: Boolean(mmeAeVendorEncryptionSecret(env)),
    encryption_secret_name: env.AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64 ? 'AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64' : (env.CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64 ? 'CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64' : null),
    provider: 'cloudflare_worker_kv_encrypted_packet_store'
  };
}

function mmeAeVendorEncryptionRequired(env) {
  if (mmeAeVendorEncryptionSecret(env)) return null;
  return mmeJson({
    ok: false,
    error: 'ae_vendor_encryption_not_configured',
    ...mmeAeVendorStorageStatus(env),
    message: 'AE/vendor onboarding stores W-9 and payment profile material only after a Cloudflare Worker encryption secret is configured.'
  }, 503);
}

function mmeSlug(value = 'marketing-made-easy') {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'marketing-made-easy';
}

function mmeId(prefix = 'mme') {
  const token = globalThis.crypto?.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 18)
    : `${Date.now()}${Math.random()}`.replace(/\D/g, '').slice(0, 18);
  return `${prefix}_${token}`;
}

function mmeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function mmeUnique(values = []) {
  return Array.from(new Set(mmeArray(values)));
}

function mmeKv(env) {
  return env.MARKETING_MADE_EASY_KV || env.SITE_EVENTS_KV || null;
}

function mmeStorageMode(env) {
  if (env.MARKETING_MADE_EASY_KV) return 'marketing_made_easy_kv';
  if (env.SITE_EVENTS_KV) return 'site_events_kv';
  return 'missing';
}

function mmeModuleMap() {
  return Object.fromEntries(MME_MODULES.map((item) => [item.id, item]));
}

function mmeDefaultWorkspaces() {
  const now = mmeNow();
  return [
    {
      id: 'marketing-made-easy-ops',
      slug: 'marketing-made-easy-ops',
      name: 'Marketing Made Easy Ops',
      status: 'active',
      modules: MME_MODULES.map((item) => item.id),
      ownerRef: 'shared-gate',
      free99: true,
      rateLimited: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'launch-room',
      slug: 'launch-room',
      name: 'Launch Room',
      status: 'active',
      modules: ['ae-flowpro', 'brandid-offline-pwa', 'businesslaunchgo', 'kaixu-brandkit'],
      ownerRef: 'shared-gate',
      free99: true,
      rateLimited: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'build-room',
      slug: 'build-room',
      name: 'Build Room',
      status: 'active',
      modules: ['skyewebcreatormax', 'webgrowthoperator', 'arizona-growth-index'],
      ownerRef: 'shared-gate',
      free99: true,
      rateLimited: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'document-room',
      slug: 'document-room',
      name: 'Document Room',
      status: 'active',
      modules: ['skyedocxmax'],
      ownerRef: 'shared-gate',
      free99: true,
      rateLimited: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function mmeDefaultState() {
  const now = mmeNow();
  return {
    schema: 'marketing-made-easy-platform-v1',
    updatedAt: now,
    workspaces: mmeDefaultWorkspaces(),
    briefs: [],
    ledger: [],
    auditEvents: [],
    rateLimitPolicy: {
      mode: 'free99-but-gated',
      workspaceCreatesPerDay: 25,
      briefCreatesPerDay: 100,
      boardReadsPerMinute: 120
    }
  };
}

function mmeNormalizeWorkspace(workspace = {}) {
  const now = mmeNow();
  const slug = mmeSlug(workspace.slug || workspace.name || workspace.id || 'workspace');
  return {
    id: mmeText(workspace.id, 120) || slug,
    slug,
    name: mmeText(workspace.name, 220) || slug,
    status: mmeText(workspace.status, 80) || 'active',
    modules: mmeUnique(workspace.modules).filter((item) => mmeModuleMap()[item]),
    ownerRef: mmeText(workspace.ownerRef, 240) || 'shared-gate',
    free99: workspace.free99 !== false,
    rateLimited: workspace.rateLimited !== false,
    notes: mmeText(workspace.notes, 4000),
    createdAt: mmeText(workspace.createdAt, 80) || now,
    updatedAt: mmeText(workspace.updatedAt, 80) || now
  };
}

function mmeNormalizeBrief(brief = {}) {
  const now = mmeNow();
  return {
    id: mmeText(brief.id, 120) || mmeId('mme_brief'),
    workspaceSlug: mmeSlug(brief.workspaceSlug || brief.workspace || 'marketing-made-easy-ops'),
    title: mmeText(brief.title, 220) || 'Untitled brief',
    status: mmeText(brief.status, 80) || 'queued',
    moduleId: mmeText(brief.moduleId, 120) || 'skyewebcreatormax',
    clientName: mmeText(brief.clientName, 220),
    summary: mmeText(brief.summary, 4000),
    requestedBy: mmeText(brief.requestedBy, 240),
    createdAt: mmeText(brief.createdAt, 80) || now,
    updatedAt: mmeText(brief.updatedAt, 80) || now
  };
}

function mmeNormalizeState(raw = {}) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const defaults = mmeDefaultState();
  const workspaceMap = new Map();
  for (const workspace of [...defaults.workspaces, ...(Array.isArray(base.workspaces) ? base.workspaces : [])]) {
    const normalized = mmeNormalizeWorkspace(workspace);
    workspaceMap.set(normalized.slug, normalized);
  }
  return {
    schema: base.schema || defaults.schema,
    updatedAt: mmeText(base.updatedAt, 80) || defaults.updatedAt,
    workspaces: [...workspaceMap.values()],
    briefs: Array.isArray(base.briefs) ? base.briefs.map(mmeNormalizeBrief) : [],
    ledger: Array.isArray(base.ledger) ? base.ledger : [],
    auditEvents: Array.isArray(base.auditEvents) ? base.auditEvents : [],
    rateLimitPolicy: base.rateLimitPolicy && typeof base.rateLimitPolicy === 'object'
      ? { ...defaults.rateLimitPolicy, ...base.rateLimitPolicy }
      : defaults.rateLimitPolicy
  };
}

async function mmeReadState(env) {
  const kv = mmeKv(env);
  if (!kv?.get) return mmeDefaultState();
  const stored = await kv.get(MME_STATE_KEY, { type: 'json' }).catch(() => null);
  return mmeNormalizeState(stored || mmeDefaultState());
}

async function mmeWriteState(env, state) {
  const next = mmeNormalizeState({ ...state, updatedAt: mmeNow() });
  const kv = mmeKv(env);
  if (kv?.put) await kv.put(MME_STATE_KEY, JSON.stringify(next), { expirationTtl: MME_STORAGE_TTL });
  return next;
}

async function mmeKvGetJson(kv, key, fallback = null) {
  if (!kv?.get) return fallback;
  return await kv.get(key, { type: 'json' }).catch(() => null) ?? fallback;
}

async function mmeKvPutJson(kv, key, value, options = {}) {
  if (!kv?.put) return false;
  await kv.put(key, JSON.stringify(value), { expirationTtl: MME_STORAGE_TTL, ...options });
  return true;
}

async function mmeAeVendorIndex(kv) {
  const index = await mmeKvGetJson(kv, MME_AE_VENDOR_INDEX_KEY, []);
  return Array.isArray(index) ? index : [];
}

async function mmeAeVendorWriteIndex(kv, summary) {
  const index = await mmeAeVendorIndex(kv);
  const next = [
    summary,
    ...index.filter((item) => item.id !== summary.id)
  ].slice(0, 500);
  await mmeKvPutJson(kv, MME_AE_VENDOR_INDEX_KEY, next);
  return next;
}

async function mmeAeVendorListPackets(env, limit = 100) {
  const kv = mmeKv(env);
  if (!kv) return [];
  const capped = Math.max(1, Math.min(500, Number(limit || 100)));
  if (kv.list) {
    const listed = await kv.list({ prefix: MME_AE_VENDOR_PACKET_PREFIX, limit: capped }).catch(() => null);
    if (listed?.keys?.length) {
      const packets = await Promise.all(listed.keys.map((key) => mmeKvGetJson(kv, key.name, null)));
      return packets.filter(Boolean).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
  }
  return (await mmeAeVendorIndex(kv)).slice(0, capped);
}

async function mmeAeVendorPacketById(env, id) {
  const safeId = mmeText(id, 160);
  if (!safeId) return null;
  return mmeKvGetJson(mmeKv(env), `${MME_AE_VENDOR_PACKET_PREFIX}${safeId}`, null);
}

async function mmeAeVendorReadFormData(request) {
  const form = await request.formData();
  const fields = {};
  const files = [];
  for (const [name, value] of form.entries()) {
    if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && 'name' in value) {
      const filename = mmeSafeFilename(value.name || name);
      const bytes = new Uint8Array(await value.arrayBuffer());
      if (bytes.length) {
        files.push({
          field: mmeText(name, 120),
          filename,
          mimeType: mmeText(value.type || 'application/octet-stream', 180),
          bytes
        });
      }
    } else {
      fields[name] = mmeText(value, 6000);
    }
  }
  return { fields, files };
}

function mmeAeVendorValidateFile(file) {
  const ext = mmeFileExt(file.filename);
  const mimeType = String(file.mimeType || '').toLowerCase();
  if (!MME_AE_VENDOR_ALLOWED_EXT.has(ext)) return `File extension not allowed for ${file.filename}.`;
  if (mimeType && mimeType !== 'application/octet-stream' && !MME_AE_VENDOR_ALLOWED_MIME.has(mimeType)) return `File type not allowed for ${file.filename}.`;
  if (file.bytes.length > MME_AE_VENDOR_MAX_FILE_BYTES) return `${file.filename} exceeds the 8MB per-file limit.`;
  return '';
}

function mmeAeVendorSummary(packet) {
  return {
    id: packet.id,
    submissionId: packet.submissionId,
    status: packet.status,
    legalName: packet.contractor?.legalName || packet.legalName || '',
    email: packet.contractor?.email || packet.email || '',
    roleLane: packet.contractor?.roleLane || packet.roleLane || '',
    workspaceSlug: packet.workspaceSlug,
    paymentMethod: packet.paymentProfile?.method || packet.paymentMethod || '',
    payoutStatus: packet.payoutLedger?.status || packet.payoutStatus || '',
    storageProvider: packet.storage?.provider || 'cloudflare_worker_kv_encrypted_packet_store',
    createdAt: packet.createdAt,
    updatedAt: packet.updatedAt
  };
}

function mmeAeVendorMissingFields(fields) {
  return MME_AE_VENDOR_REQUIRED_FIELDS.filter((key) => !fields[key]);
}

async function mmeCreateAeVendorPacket(request, env, auth, helpers = {}) {
  const storageBlocked = mmeStateRequiresStorage(env);
  if (storageBlocked) return storageBlocked;
  const encryptionBlocked = mmeAeVendorEncryptionRequired(env);
  if (encryptionBlocked) return encryptionBlocked;

  const kv = mmeKv(env);
  const { fields, files } = await mmeAeVendorReadFormData(request);
  if (fields._honey) return mmeJson({ ok: false, error: 'Spam check failed.' }, 400);
  const started = Number(fields.form_started_at || 0);
  if (started && Date.now() - started < 3500) return mmeJson({ ok: false, error: 'Submission was too fast. Please review the packet and submit again.' }, 400);

  const missing = mmeAeVendorMissingFields(fields);
  if (missing.length) return mmeJson({ ok: false, error: `Missing required fields: ${missing.join(', ')}`, missing }, 400);
  if (!mmeValidEmail(fields.email)) return mmeJson({ ok: false, error: 'Valid email is required.' }, 400);
  if (mmeText(fields.typed_signature).toLowerCase() !== mmeText(fields.legal_name).toLowerCase()) {
    return mmeJson({ ok: false, error: 'Typed signature must match legal name.' }, 400);
  }
  const w9 = files.find((file) => file.field === 'w9_file');
  if (!w9) return mmeJson({ ok: false, error: 'Completed W-9 upload is required.' }, 400);
  const totalBytes = files.reduce((sum, file) => sum + file.bytes.length, 0);
  if (totalBytes > MME_AE_VENDOR_MAX_TOTAL_BYTES) return mmeJson({ ok: false, error: 'Total upload exceeds 30MB limit.' }, 413);
  const fileError = files.map(mmeAeVendorValidateFile).find(Boolean);
  if (fileError) return mmeJson({ ok: false, error: fileError }, 400);

  const fingerprintBytes = new TextEncoder().encode(`${fields.email.toLowerCase()}|${fields.legal_name.toLowerCase()}`);
  const fingerprint = (await mmeSha256Hex(fingerprintBytes)).slice(0, 16);
  const existing = (await mmeAeVendorListPackets(env, 500)).find((packet) => packet.fingerprint === fingerprint || (packet.email || packet.contractor?.email) === fields.email);
  if (existing && !fields.allow_duplicate_submission) {
    return mmeJson({
      ok: false,
      error: 'A vendor/AE packet with this name/email already appears to exist. Admin can intentionally resubmit with duplicate submission enabled.',
      existingPacketId: existing.id || existing.submissionId
    }, 409);
  }

  const createdAt = mmeNow();
  const packetId = mmeId('ae_vendor');
  const submissionId = `ae-vendor-${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${packetId.slice(-8)}`;
  const workspaceSlug = mmeSlug(fields.entity_name || fields.legal_name || packetId);
  const sensitiveKeys = [
    'bank_account_type',
    'bank_name',
    'bank_routing',
    'bank_account',
    'stripe_account',
    'paypal_email',
    'cashapp_tag',
    'backup_payment_method',
    'payment_display_name',
    'address_line_1',
    'city_state_zip',
    'phone'
  ];
  const sensitive = {};
  for (const key of sensitiveKeys) if (fields[key]) sensitive[key] = mmeText(fields[key], 1200);
  const encryptedPaymentProfile = await mmeAeVendorEncryptObject(env, {
    submissionId,
    legalName: fields.legal_name,
    email: fields.email,
    sensitive,
    capturedAt: createdAt
  });
  const paymentProfileKey = `${MME_AE_VENDOR_PAYMENT_PREFIX}${packetId}`;
  await mmeKvPutJson(kv, paymentProfileKey, {
    id: `${packetId}_payment_profile`,
    packetId,
    submissionId,
    encrypted: true,
    ...encryptedPaymentProfile,
    createdAt
  });

  const storedFiles = [];
  for (const file of files) {
    const sha256 = await mmeSha256Hex(file.bytes);
    const encryptedFile = await mmeAeVendorEncryptBytes(env, file.bytes);
    const storageKey = `${MME_AE_VENDOR_FILE_PREFIX}${packetId}:${file.field}:${file.filename}`;
    await mmeKvPutJson(kv, storageKey, {
      packetId,
      field: file.field,
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: file.bytes.length,
      sha256,
      encrypted: true,
      ...encryptedFile,
      createdAt
    });
    storedFiles.push({
      field: file.field,
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: file.bytes.length,
      sha256,
      encryptedStorageKey: storageKey
    });
  }

  const packet = {
    id: packetId,
    submissionId,
    fingerprint,
    type: 'ae_vendor_onboarding_packet',
    status: 'submitted_pending_admin_review',
    workspaceSlug,
    contractor: {
      legalName: mmeText(fields.legal_name, 220),
      preferredName: mmeText(fields.preferred_name, 160),
      email: mmeText(fields.email, 240),
      phoneMasked: mmeMask(fields.phone),
      entityName: mmeText(fields.entity_name, 220),
      stateResidence: mmeText(fields.state_residence, 120),
      roleLane: mmeText(fields.role_lane || 'Part-Time Account Executive', 160),
      startDate: mmeText(fields.start_date, 80),
      approvedBy: mmeText(fields.approved_by, 160)
    },
    acceptance: {
      typedSignature: mmeText(fields.typed_signature, 220),
      signatureDate: mmeText(fields.signature_date, 80),
      acceptedIndependentContractorAgreement: true,
      acceptedCommissionPlan: true,
      acceptedConfidentiality: true,
      acceptedNoGuarantees: true,
      agreementVersion: 'cloudflare-ae-vendor-onboarding-v1'
    },
    taxProfile: {
      w9Uploaded: true,
      w9Matches: mmeText(fields.w9_matches || 'Not reviewed yet', 120),
      taxNote: mmeText(fields.tax_note, 1000),
      vendorTrackerTemplate: '/Free99/apps/sovereigndocs/build/US-AZ/tax-records-compliance/1099-vendor-tracker/'
    },
    paymentProfile: {
      method: mmeText(fields.payment_method, 120),
      displayNameMasked: mmeMask(fields.payment_display_name, 2),
      status: 'encrypted_pending_owner_verification',
      encryptedStorageKey: paymentProfileKey,
      payoutDestinationVerified: false
    },
    legalAndVendorDocs: MME_AE_VENDOR_DOCS,
    storage: {
      provider: 'cloudflare_worker_kv_encrypted_packet_store',
      packetKey: `${MME_AE_VENDOR_PACKET_PREFIX}${packetId}`,
      paymentProfileKey,
      fileCount: storedFiles.length,
      files: storedFiles,
      googleDrive: false,
      netlify: false
    },
    payoutLedger: {
      id: mmeId('ae_vendor_payout'),
      status: 'blocked_until_client_revenue_owner_approval_and_payout_destination_verification',
      amountCents: 0,
      currency: 'usd',
      externalTransferCreated: false,
      boundary: 'This creates a Cloudflare ledger and encrypted payout profile only. External ACH/Stripe/PayPal/Cash App transfer requires owner approval and a configured payout provider.'
    },
    audit: [
      {
        id: mmeId('ae_vendor_audit'),
        type: 'packet_submitted',
        actor: auth.actor || 'skygate-user',
        via: auth.via || 'skygate',
        createdAt
      }
    ],
    createdAt,
    updatedAt: createdAt
  };
  await mmeKvPutJson(kv, `${MME_AE_VENDOR_PACKET_PREFIX}${packetId}`, packet);
  await mmeAeVendorWriteIndex(kv, { ...mmeAeVendorSummary(packet), fingerprint });
  await mmeKvPutJson(kv, `${MME_AE_VENDOR_AUDIT_PREFIX}${packetId}`, packet.audit);
  if (helpers.mirrorSkygateEvent) {
    await helpers.mirrorSkygateEvent(env, {
      type: 'marketing_made_easy.ae_vendor_packet_submitted',
      meta: {
        packet_id: packetId,
        submission_id: submissionId,
        workspace_slug: workspaceSlug,
        role_lane: packet.contractor.roleLane,
        storage_provider: packet.storage.provider
      }
    }, auth.gate || auth);
  }
  return mmeJson({
    ok: true,
    packet: mmeAeVendorSummary(packet),
    receiptId: packetId,
    submissionId,
    status: packet.status,
    storage: packet.storage,
    paymentProfile: packet.paymentProfile,
    payoutLedger: packet.payoutLedger,
    legalAndVendorDocs: packet.legalAndVendorDocs,
    nextStep: 'Admin reviews the Cloudflare packet, verifies W-9/payment destination, then approves the vendor workspace before any client-revenue payout release.',
    ...mmeAeVendorStorageStatus(env)
  }, 201);
}

async function mmeApproveAeVendorPacket(request, env, auth, packetId) {
  const storageBlocked = mmeStateRequiresStorage(env);
  if (storageBlocked) return storageBlocked;
  const kv = mmeKv(env);
  const packet = await mmeAeVendorPacketById(env, packetId);
  if (!packet) return mmeJson({ ok: false, error: 'ae_vendor_packet_not_found', packetId }, 404);
  const body = await request.json().catch(() => ({}));
  const updatedAt = mmeNow();
  packet.status = body.status || 'approved_vendor_workspace_ready';
  packet.paymentProfile = {
    ...(packet.paymentProfile || {}),
    status: body.paymentProfileStatus || 'encrypted_verified_pending_payable_event',
    payoutDestinationVerified: body.payoutDestinationVerified !== false
  };
  packet.payoutLedger = {
    ...(packet.payoutLedger || {}),
    status: body.payoutStatus || 'payout_profile_verified_no_external_transfer_created',
    note: mmeText(body.note || 'Owner/admin approved vendor packet; actual transfer remains separate and provider-gated.', 1000),
    externalTransferCreated: false,
    updatedAt
  };
  packet.audit = [
    ...(packet.audit || []),
    {
      id: mmeId('ae_vendor_audit'),
      type: 'packet_approved',
      actor: auth.actor || 'skygate-user',
      note: mmeText(body.note, 1000),
      createdAt: updatedAt
    }
  ];
  packet.updatedAt = updatedAt;
  await mmeKvPutJson(kv, `${MME_AE_VENDOR_PACKET_PREFIX}${packet.id}`, packet);
  await mmeAeVendorWriteIndex(kv, { ...mmeAeVendorSummary(packet), fingerprint: packet.fingerprint });
  await mmeKvPutJson(kv, `${MME_AE_VENDOR_AUDIT_PREFIX}${packet.id}`, packet.audit);
  return mmeJson({ ok: true, packet: mmeAeVendorSummary(packet), payoutLedger: packet.payoutLedger, paymentProfile: packet.paymentProfile });
}

function mmeStateRequiresStorage(env) {
  if (mmeKv(env)) return null;
  return mmeJson({
    ok: false,
    error: 'marketing_made_easy_storage_not_configured',
    storage_mode: mmeStorageMode(env),
    message: 'Marketing Made Easy platform mutations require MARKETING_MADE_EASY_KV or SITE_EVENTS_KV.'
  }, 503);
}

function mmeBriefBuckets(state) {
  const briefs = Array.isArray(state.briefs) ? state.briefs : [];
  return {
    queue: briefs.filter((item) => ['queued', 'intake', 'ready'].includes(item.status)),
    review: briefs.filter((item) => ['review', 'blocked'].includes(item.status)),
    execution: briefs.filter((item) => ['active', 'building', 'execution'].includes(item.status)),
    dispatch: briefs.filter((item) => ['dispatch', 'complete', 'delivered'].includes(item.status))
  };
}

function mmeRoute(pathname, matchedBase) {
  return pathname === matchedBase ? '/' : pathname.slice(matchedBase.length) || '/';
}

function mmePublicApp(module) {
  return {
    ...module,
    routeIntoPlatform: `${MME_PUBLIC_BASE}/index.html?workspace=${module.workspaceRole || module.id}`,
    directEntry: module.entryPath
  };
}

function mmeHealth(env, mount) {
  return {
    ok: true,
    app_id: mount.id,
    app: mount.name,
    base: mount.base,
    mounted: true,
    status: 'LIVE/GATED',
    routing_model: 'same_domain_platform_adapter',
    service_binding_configured: Boolean(mount.serviceBinding && env[mount.serviceBinding]),
    origin_configured: Boolean(mount.originEnv && env[mount.originEnv]),
    target_base: mount.targetBase,
    error: null,
    note: mount.note,
    runtime_mode: 'northstar_style_mounted_platform',
    auth_mode: 'skygate-shared-lane',
    workspace_route: `${MME_PUBLIC_BASE}/index.html?workspace=:slug`,
    platform_shell: `${MME_PUBLIC_BASE}/index.html`,
    source_modules: MME_MODULES.length,
    storage_mode: mmeStorageMode(env),
    root_runtime_blocked: '/api/runtime/* remains blocked on the 0S root. Use /api/marketing-made-easy/*.',
    gate_owned: true,
    free99: true,
    rate_limited: true
  };
}

function mmeAiAvailability(env) {
  const configured = Boolean(env.OPENAI_API_KEY);
  const liveAvailable = configured
    && String(env.VANTA_DISABLE_LIVE_AI ?? '0') !== '1'
    && (String(env.VANTA_ALLOW_LIVE_AI ?? '0') === '1' || Boolean(env.forceLiveAi));
  return {
    configured,
    liveAvailable,
    model: String(env.OPENAI_MODEL || 'gpt-4.1-mini')
  };
}

function mmeWebCreatorRuntimeStatus(state, env) {
  const buckets = mmeBriefBuckets(state);
  return {
    ok: true,
    product: 'SkyeWebCreatorMax',
    deliveryPacks: state.briefs.length,
    reviewBoard: {
      draft: buckets.queue.filter((item) => item.status === 'draft').length,
      ready: buckets.queue.filter((item) => item.status === 'ready').length,
      approved: buckets.review.filter((item) => item.status === 'approved').length,
      blocked: buckets.review.filter((item) => item.status === 'blocked').length,
      dispatched: buckets.dispatch.filter((item) => item.status === 'dispatched').length
    },
    executionBoard: {
      queued: buckets.execution.filter((item) => item.status === 'queued').length,
      active: buckets.execution.filter((item) => item.status === 'active').length,
      fulfilled: buckets.dispatch.filter((item) => ['complete', 'delivered'].includes(item.status)).length,
      blocked: buckets.execution.filter((item) => item.status === 'blocked').length
    },
    dispatchBoard: {
      queued: buckets.dispatch.filter((item) => item.status === 'dispatch').length,
      active: 0,
      delivered: buckets.dispatch.filter((item) => ['complete', 'delivered'].includes(item.status)).length,
      blocked: buckets.dispatch.filter((item) => item.status === 'blocked').length
    },
    workflowTimeline: {
      intake: buckets.queue.length,
      review: buckets.review.length,
      execution: buckets.execution.length,
      dispatch: buckets.dispatch.length
    },
    ai: mmeAiAvailability(env),
    storageMode: mmeStorageMode(env)
  };
}

function mmeManifest(env) {
  return {
    ok: true,
    platform: {
      id: 'marketing-made-easy',
      name: 'Marketing Made Easy',
      shell: `${MME_PUBLIC_BASE}/index.html`,
      apiBase: MME_BASE,
      authMode: 'skygate-shared-lane',
      workspaceRoute: `${MME_PUBLIC_BASE}/index.html?workspace=:slug`,
      storageMode: mmeStorageMode(env),
      free99: true,
      rateLimited: true
    },
    modules: MME_MODULES.map(mmePublicApp),
    routes: {
      public: [
        `${MME_BASE}/health`,
        `${MME_BASE}/platform/status`,
        `${MME_BASE}/platform/manifest`,
        `${MME_BASE}/platform/catalog`,
        `${MME_BASE}/platform/apps`,
        `${MME_BASE}/platform/apps/:id`,
        `${MME_BASE}/ae-vendor-onboarding/health`
      ],
      gated: [
        `${MME_BASE}/v1/sessions`,
        `${MME_BASE}/v1/runtime-summary`,
        `${MME_BASE}/workspaces`,
        `${MME_BASE}/workspaces/:slug`,
        `${MME_BASE}/briefs`,
        `${MME_BASE}/queue`,
        `${MME_BASE}/review-board`,
        `${MME_BASE}/execution-board`,
        `${MME_BASE}/dispatch-board`,
        `${MME_BASE}/ae-vendor-onboarding/packets`,
        `${MME_BASE}/ae-vendor-onboarding/packets/:id`,
        `${MME_BASE}/ae-vendor-onboarding/submit`,
        `${MME_BASE}/ae-vendor-onboarding/packets/:id/approve`
      ]
    }
  };
}

function mmeSessionSummary(auth) {
  return {
    id: auth.identity?.id || auth.actor || 'skygate-user',
    actor: auth.actor,
    email: auth.identity?.email || '',
    role: auth.identity?.role || auth.role || 'user',
    via: auth.via,
    active: true,
    checkedAt: mmeNow()
  };
}

function mmeWorkspaceSummary(workspace = {}) {
  const moduleLookup = mmeModuleMap();
  return {
    ...workspace,
    moduleDetails: (workspace.modules || []).map((id) => mmePublicApp(moduleLookup[id])).filter(Boolean),
    route: `${MME_PUBLIC_BASE}/index.html?workspace=${workspace.slug}`
  };
}

function mmeListForWorkspace(items = [], workspaceSlug = '') {
  return !workspaceSlug ? items : items.filter((item) => item.workspaceSlug === workspaceSlug);
}

async function mmeHandlePublicGet(env, mount, path) {
  if (path === '/' || path === '/health' || path === '/platform/status') {
    return mmeJson({
      ...mmeHealth(env, mount),
      modules: MME_MODULES.map((item) => ({ id: item.id, name: item.name, lane: item.lane })),
      shell: `${MME_PUBLIC_BASE}/index.html`
    });
  }
  if (path === '/platform/manifest') return mmeJson(mmeManifest(env));
  if (path === '/webcreator-runtime/status') {
    const state = await mmeReadState(env);
    return mmeJson(mmeWebCreatorRuntimeStatus(state, env));
  }
  if (path === '/ae-vendor-onboarding/health' || path === '/contractor-onboarding/health') {
    return mmeJson({
      ok: true,
      product: 'Marketing Made Easy AE/Vendor Onboarding',
      cloudflare_only: true,
      netlify: false,
      googleDrive: false,
      auth_mode: 'skygate-shared-lane-or-admin-token',
      submitEndpoint: `${MME_BASE}/ae-vendor-onboarding/submit`,
      packetListEndpoint: `${MME_BASE}/ae-vendor-onboarding/packets`,
      requiredSecret: 'AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64',
      fallbackSecret: 'CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64',
      maxFileBytes: MME_AE_VENDOR_MAX_FILE_BYTES,
      maxTotalBytes: MME_AE_VENDOR_MAX_TOTAL_BYTES,
      allowedExtensions: [...MME_AE_VENDOR_ALLOWED_EXT],
      sovereignDocsTemplates: MME_AE_VENDOR_DOCS,
      ...mmeAeVendorStorageStatus(env)
    });
  }
  if (path === '/platform/catalog' || path === '/platform/apps') {
    return mmeJson({
      ok: true,
      modules: MME_MODULES.map(mmePublicApp),
      total: MME_MODULES.length,
      shell: `${MME_PUBLIC_BASE}/index.html`
    });
  }
  const appMatch = path.match(/^\/platform\/apps\/([^/]+)$/);
  if (appMatch) {
    const module = mmeModuleMap()[mmeSlug(decodeURIComponent(appMatch[1]))];
    if (!module) return mmeJson({ ok: false, error: 'marketing_made_easy_module_not_found', moduleId: decodeURIComponent(appMatch[1]) }, 404);
    return mmeJson({ ok: true, module: mmePublicApp(module) });
  }
  return null;
}

async function mmeHandleGatedGet(request, env, mount, path, helpers) {
  const auth = await helpers.requireGateAuth(request, env, 'Marketing Made Easy gated route');
  if (!auth.ok) return auth.response;
  const state = await mmeReadState(env);
  const url = new URL(request.url);
  const workspaceSlug = mmeSlug(url.searchParams.get('workspace') || '');
  const buckets = mmeBriefBuckets(state);
  if (path === '/v1/sessions') return mmeJson({ ok: true, sessions: [mmeSessionSummary(auth)] });
  if (path === '/v1/runtime-summary') {
    return mmeJson({
      ok: true,
      workspaceCount: state.workspaces.length,
      briefCount: state.briefs.length,
      queueCount: buckets.queue.length,
      reviewCount: buckets.review.length,
      executionCount: buckets.execution.length,
      dispatchCount: buckets.dispatch.length,
      moduleCount: MME_MODULES.length,
      storage_mode: mmeStorageMode(env),
      auth_mode: 'skygate-shared-lane',
      workspace_route: `${MME_PUBLIC_BASE}/index.html?workspace=:slug`
    });
  }
  if (path === '/workspaces') {
    return mmeJson({
      ok: true,
      workspaces: state.workspaces.map(mmeWorkspaceSummary),
      activeSession: mmeSessionSummary(auth)
    });
  }
  const workspaceMatch = path.match(/^\/workspaces\/([^/]+)$/);
  if (workspaceMatch) {
    const slug = mmeSlug(decodeURIComponent(workspaceMatch[1]));
    const workspace = state.workspaces.find((item) => item.slug === slug);
    if (!workspace) return mmeJson({ ok: false, error: 'marketing_made_easy_workspace_not_found', workspace: slug }, 404);
    return mmeJson({
      ok: true,
      workspace: mmeWorkspaceSummary(workspace),
      briefs: state.briefs.filter((item) => item.workspaceSlug === slug)
    });
  }
  if (path === '/briefs') return mmeJson({ ok: true, briefs: mmeListForWorkspace(state.briefs, workspaceSlug) });
  if (path === '/queue') return mmeJson({ ok: true, queue: mmeListForWorkspace(buckets.queue, workspaceSlug) });
  if (path === '/review-board') return mmeJson({ ok: true, review_board: mmeListForWorkspace(buckets.review, workspaceSlug) });
  if (path === '/execution-board') return mmeJson({ ok: true, execution_board: mmeListForWorkspace(buckets.execution, workspaceSlug) });
  if (path === '/dispatch-board') return mmeJson({ ok: true, dispatch_board: mmeListForWorkspace(buckets.dispatch, workspaceSlug) });
  if (path === '/ae-vendor-onboarding/packets' || path === '/contractor-onboarding/packets') {
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)));
    return mmeJson({
      ok: true,
      packets: (await mmeAeVendorListPackets(env, limit)).map(mmeAeVendorSummary),
      ...mmeAeVendorStorageStatus(env)
    });
  }
  const aeVendorPacketMatch = path.match(/^\/(?:ae-vendor-onboarding|contractor-onboarding)\/packets\/([^/]+)$/);
  if (aeVendorPacketMatch) {
    const packet = await mmeAeVendorPacketById(env, decodeURIComponent(aeVendorPacketMatch[1]));
    if (!packet) return mmeJson({ ok: false, error: 'ae_vendor_packet_not_found', packetId: decodeURIComponent(aeVendorPacketMatch[1]) }, 404);
    return mmeJson({ ok: true, packet, ...mmeAeVendorStorageStatus(env) });
  }
  if (path === '/audit') return mmeJson({ ok: true, events: state.auditEvents.slice(0, 200), ledger: state.ledger.slice(0, 100) });
  return mmeJson({ ok: false, error: 'marketing_made_easy_route_not_found', path }, 404);
}

async function mmeHandleMutation(request, env, mount, path, helpers) {
  if (path === '/webcreator-runtime/auren' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const state = await mmeReadState(env);
    const reply = await generateWebCreatorAurenReply({
      message: body.message || '',
      room: body.room || 'builder',
      allowLiveAi: body.allowLiveAi === true,
      brief: body.brief || {},
      runtime: body.runtime || mmeWebCreatorRuntimeStatus(state, env),
      env: {
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        OPENAI_BASE_URL: env.OPENAI_BASE_URL,
        OPENAI_MODEL: env.OPENAI_MODEL,
        VANTA_ALLOW_LIVE_AI: env.VANTA_ALLOW_LIVE_AI,
        VANTA_DISABLE_LIVE_AI: env.VANTA_DISABLE_LIVE_AI
      }
    });
    return mmeJson(reply);
  }

  if ((path === '/ae-vendor-onboarding/submit' || path === '/contractor-onboarding/submit') && request.method === 'POST') {
    const auth = await helpers.requireGateAuth(request, env, 'Marketing Made Easy AE/vendor onboarding');
    if (!auth.ok) return auth.response;
    return mmeCreateAeVendorPacket(request, env, auth, helpers);
  }
  const aeVendorApproveMatch = path.match(/^\/(?:ae-vendor-onboarding|contractor-onboarding)\/packets\/([^/]+)\/approve$/);
  if (aeVendorApproveMatch && request.method === 'POST') {
    const auth = await helpers.requireGateAuth(request, env, 'Marketing Made Easy AE/vendor approval');
    if (!auth.ok) return auth.response;
    return mmeApproveAeVendorPacket(request, env, auth, decodeURIComponent(aeVendorApproveMatch[1]));
  }

  const body = await request.json().catch(() => ({}));

  const auth = await helpers.requireGateAuth(request, env, 'Marketing Made Easy mutation');
  if (!auth.ok) return auth.response;
  const storageBlocked = mmeStateRequiresStorage(env);
  if (storageBlocked) return storageBlocked;
  const state = await mmeReadState(env);

  if (path === '/workspaces' && request.method === 'POST') {
    const workspace = mmeNormalizeWorkspace({
      id: body.id || mmeId('mme_ws'),
      slug: body.slug || body.name || mmeId('workspace'),
      name: body.name || 'Marketing Made Easy Workspace',
      status: body.status || 'active',
      modules: mmeUnique(body.modules).length ? mmeUnique(body.modules) : ['skyewebcreatormax'],
      ownerRef: auth.identity?.subject || auth.actor || 'shared-gate',
      free99: true,
      rateLimited: true,
      notes: body.notes || ''
    });
    state.workspaces = [
      workspace,
      ...state.workspaces.filter((item) => item.slug !== workspace.slug)
    ];
    state.auditEvents.unshift({
      id: mmeId('mme_evt'),
      type: 'workspace_created',
      actor: auth.actor,
      workspace: workspace.slug,
      createdAt: mmeNow()
    });
    state.ledger.unshift({
      id: mmeId('mme_ledger'),
      type: 'workspace_created',
      message: `${auth.actor} created ${workspace.name}`,
      workspace: workspace.slug,
      createdAt: mmeNow()
    });
    await mmeWriteState(env, state);
    if (helpers.mirrorSkygateEvent) {
      await helpers.mirrorSkygateEvent(env, {
        type: 'marketing_made_easy.workspace_created',
        meta: { workspace_slug: workspace.slug, modules: workspace.modules, free99: true, rate_limited: true }
      }, auth.gate || auth);
    }
    return mmeJson({ ok: true, workspace: mmeWorkspaceSummary(workspace) }, 201);
  }

  if (path === '/briefs' && request.method === 'POST') {
    const brief = mmeNormalizeBrief({
      id: body.id || mmeId('mme_brief'),
      workspaceSlug: body.workspaceSlug || body.workspace || 'marketing-made-easy-ops',
      title: body.title || body.clientName || 'Untitled brief',
      status: body.status || 'queued',
      moduleId: body.moduleId || 'skyewebcreatormax',
      clientName: body.clientName || '',
      summary: body.summary || '',
      requestedBy: auth.actor
    });
    state.briefs.unshift(brief);
    state.auditEvents.unshift({
      id: mmeId('mme_evt'),
      type: 'brief_created',
      actor: auth.actor,
      workspace: brief.workspaceSlug,
      briefId: brief.id,
      createdAt: mmeNow()
    });
    state.ledger.unshift({
      id: mmeId('mme_ledger'),
      type: 'brief_created',
      message: `${auth.actor} queued ${brief.title}`,
      workspace: brief.workspaceSlug,
      createdAt: mmeNow()
    });
    await mmeWriteState(env, state);
    if (helpers.mirrorSkygateEvent) {
      await helpers.mirrorSkygateEvent(env, {
        type: 'marketing_made_easy.brief_created',
        meta: { workspace_slug: brief.workspaceSlug, brief_id: brief.id, module_id: brief.moduleId, status: brief.status }
      }, auth.gate || auth);
    }
    return mmeJson({ ok: true, brief }, 201);
  }

  return mmeJson({ ok: false, error: 'marketing_made_easy_route_not_found', path }, 404);
}

export async function handleMarketingMadeEasyRoute(request, env, url, matchedBase, mount, helpers = {}) {
  const path = mmeRoute(url.pathname, matchedBase);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: mmeHeaders() });

  const publicGet = request.method === 'GET' ? await mmeHandlePublicGet(env, mount, path) : null;
  if (publicGet) return publicGet;

  if (request.method === 'GET') return mmeHandleGatedGet(request, env, mount, path, helpers);
  if (request.method === 'POST') return mmeHandleMutation(request, env, mount, path, helpers);
  return mmeJson({ ok: false, error: 'method_not_allowed', method: request.method, path }, 405);
}
