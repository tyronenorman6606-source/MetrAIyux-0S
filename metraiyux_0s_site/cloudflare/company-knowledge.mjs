import { recordCitadelMirrorEvent } from './citadeldb-adapter.mjs';
import { resolveCanonicalTenant } from './tenant-backbone.mjs';

const API_PREFIX = '/api/0s/company-knowledge';
const COMPANY_KNOWLEDGE_SCHEMA = 'metraiyux-0s-company-knowledge-v1';
const PLATFORM_BASE_ID = 'metraiyux-0s';
const PLATFORM_WORKSPACE_ID = 'metraiyux-0s-owner';
const KEY_PREFIX = 'company-knowledge:v1:';
const BASE_KEY_PREFIX = `${KEY_PREFIX}base:`;
const ITEM_KEY_PREFIX = `${KEY_PREFIX}item:`;
const BASE_INDEX_KEY = `${KEY_PREFIX}bases`;
const OBJECT_PREFIX = 'company-knowledge/v1';
const MAX_CONTENT_CHARS = 220000;
const INLINE_CONTENT_LIMIT = 950000;

function now() {
  return new Date().toISOString();
}

function randomId(prefix = 'ck') {
  const token = globalThis.crypto?.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 18)
    : `${Date.now()}${Math.random()}`.replace(/\D/g, '').slice(0, 18);
  return `${prefix}_${token}`;
}

function text(value, max = 1000) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function contentText(value, max = MAX_CONTENT_CHARS) {
  return String(value == null ? '' : value)
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function slug(value = '', fallback = 'knowledge') {
  return text(value, 220)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || fallback;
}

function array(value, max = 16) {
  const list = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/[\n,]/) : []);
  return [...new Set(list.map((item) => text(item, 80)).filter(Boolean))].slice(0, max);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-skygate-session,x-skye-gate-token'
    }
  });
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function metadataStore(env) {
  return env.COMPANY_KNOWLEDGE_KV || env.TENANT_BACKBONE_KV || env.CONTENT_ENGINE_KV || env.SITE_EVENTS_KV || null;
}

function objectBucket(env) {
  return env.COMPANY_KNOWLEDGE_BUCKET || env.COMPANY_KNOWLEDGE_R2 || env.SKYEVAULT_BUCKET || env.VAULT_BUCKET || null;
}

function storageReceipt(env) {
  return {
    primary: objectBucket(env)?.put ? 'cloudflare_r2' : 'cloudflare_kv_inline',
    metadata: objectBucket(env)?.put ? 'cloudflare_r2_metadata' : metadataStore(env)?.put ? 'cloudflare_kv' : 'not_configured',
    r2: Boolean(objectBucket(env)?.put),
    kv: Boolean(metadataStore(env)?.put),
    drive: 'backup_reference_only',
    skyeVault: 'source_or_backup_reference'
  };
}

function metadataObjectKey(key) {
  return `${OBJECT_PREFIX}/metadata/${slug(key, 'metadata-key')}.json`;
}

async function getJson(env, key, fallback = null) {
  const bucket = objectBucket(env);
  if (bucket?.get) {
    const object = await bucket.get(metadataObjectKey(key)).catch(() => null);
    if (object?.json) {
      const value = await object.json().catch(() => null);
      if (value != null) return value;
    } else if (object?.text) {
      const raw = await object.text().catch(() => '');
      if (raw) {
        try { return JSON.parse(raw); } catch {}
      }
    }
  }
  const kv = metadataStore(env);
  if (!kv?.get) return fallback;
  const value = await kv.get(key, { type: 'json' }).catch(() => null);
  return value == null ? fallback : value;
}

async function putJson(env, key, value) {
  let stored = false;
  const bucket = objectBucket(env);
  if (bucket?.put) {
    await bucket.put(metadataObjectKey(key), JSON.stringify(value), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: { metadataKey: text(key, 900), schema: COMPANY_KNOWLEDGE_SCHEMA }
    }).then(() => {
      stored = true;
    }).catch(() => null);
  }
  const kv = metadataStore(env);
  if (kv?.put) {
    await kv.put(key, JSON.stringify(value)).then(() => {
      stored = true;
    }).catch(() => null);
  }
  return stored;
}

async function deleteJson(env, key) {
  let deleted = false;
  const bucket = objectBucket(env);
  if (bucket?.delete) {
    await bucket.delete(metadataObjectKey(key)).then(() => {
      deleted = true;
    }).catch(() => null);
  }
  const kv = metadataStore(env);
  if (kv?.delete) {
    await kv.delete(key).then(() => {
      deleted = true;
    }).catch(() => null);
  }
  return deleted;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  if (globalThis.crypto?.subtle?.digest) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const byte of bytes) {
    h1 ^= byte;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ byte, 0x85ebca6b) + h1) >>> 0;
  }
  const chunk = [h1, h2, h1 ^ 0xa5a5a5a5, h2 ^ 0x5a5a5a5a, h1 ^ h2, Math.imul(h1, 31) >>> 0, Math.imul(h2, 131) >>> 0, (h1 + h2) >>> 0];
  return chunk.map((part) => part.toString(16).padStart(8, '0')).join('').slice(0, 64);
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || '')).byteLength;
}

function baseKey(baseId) {
  return `${BASE_KEY_PREFIX}${slug(baseId)}`;
}

function itemKey(itemId) {
  return `${ITEM_KEY_PREFIX}${slug(itemId)}`;
}

function itemIndexKey(baseId) {
  return `${BASE_KEY_PREFIX}${slug(baseId)}:items`;
}

function objectKey(baseId, itemId) {
  return `${OBJECT_PREFIX}/${slug(baseId)}/${slug(itemId)}.json`;
}

function baseSummary(base) {
  return {
    id: base.id,
    schema: base.schema,
    ownerType: base.ownerType,
    clientId: base.clientId,
    workspaceId: base.workspaceId,
    valleyBusinessId: base.valleyBusinessId || '',
    relayInboxId: base.relayInboxId || '',
    displayName: base.displayName,
    description: base.description,
    status: base.status,
    itemCount: Number(base.itemCount || 0),
    byteCount: Number(base.byteCount || 0),
    updatedAt: base.updatedAt || base.createdAt,
    storage: base.storage
  };
}

function itemSummary(item) {
  return {
    id: item.id,
    baseId: item.baseId,
    clientId: item.clientId,
    workspaceId: item.workspaceId,
    title: item.title,
    summary: item.summary,
    tags: item.tags || [],
    source: item.source || {},
    contentType: item.contentType,
    byteLength: Number(item.byteLength || 0),
    sha256: item.sha256 || '',
    storage: item.storage,
    objectKey: item.objectKey || '',
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function platformBase() {
  return {
    id: PLATFORM_BASE_ID,
    schema: COMPANY_KNOWLEDGE_SCHEMA,
    ownerType: 'platform',
    clientId: 'metraiyux-0s',
    workspaceId: PLATFORM_WORKSPACE_ID,
    valleyBusinessId: 'metraiyux-0s',
    relayInboxId: 'relay13:metraiyux-0s',
    displayName: 'MetrAIyux 0S Company Knowledge',
    description: 'Founder-owned 0S company knowledge base for facts, doctrine, operating memory, vault references, and brain context.',
    status: 'active',
    itemCount: 0,
    byteCount: 0,
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
    storage: {
      primary: 'cloudflare_r2',
      metadata: 'cloudflare_kv',
      backup: 'skyevault_or_drive_reference'
    },
    gateAuthority: 'FS27/SkyGate/Free99 shared gate'
  };
}

function tenantBaseFromInput(input = {}) {
  const tenant = resolveCanonicalTenant(input);
  const baseId = slug(input.knowledgeBaseId || input.baseId || input.id || `tenant-${tenant.clientId}`, `tenant-${tenant.clientId}`);
  return {
    id: baseId,
    schema: COMPANY_KNOWLEDGE_SCHEMA,
    ownerType: 'tenant',
    clientId: tenant.clientId,
    workspaceId: tenant.workspaceId,
    valleyBusinessId: tenant.valleyBusinessId,
    relayInboxId: tenant.relayInboxId,
    tenant,
    displayName: text(input.displayName || input.name || `${tenant.displayName} Knowledge`, 220),
    description: text(input.description || input.notes || 'Tenant company knowledge base for workspace facts, docs, policies, offers, receipts, and customer operating context.', 1200),
    status: text(input.status || 'active', 80),
    itemCount: 0,
    byteCount: 0,
    createdAt: now(),
    updatedAt: now(),
    storage: {
      primary: 'cloudflare_r2',
      metadata: 'cloudflare_kv',
      backup: 'skyevault_or_drive_reference'
    },
    gateAuthority: 'FS27/SkyGate/Free99 shared gate'
  };
}

function actorFromAuth(auth = {}) {
  const data = auth.gate?.data || {};
  const identity = auth.identity || {};
  const scopes = Array.isArray(identity.scopes) ? identity.scopes : String(identity.scope || data.scope || data.scopes || '').split(/\s+/).filter(Boolean);
  const gateCard = data.gate_card || data.gateCard || {};
  return {
    id: text(identity.id || identity.subject || data.sub || data.user_id || data.user?.id || auth.actor || '', 220),
    actor: text(auth.actor || identity.email || data.email || data.username || data.user?.email || 'gate-session', 240),
    email: text(identity.email || data.email || data.username || data.user?.email || '', 240),
    role: text(identity.role || data.role || data.user?.role || data.workspace_role || data.workspaceRole || '', 80).toLowerCase(),
    scopes,
    isAdmin: identity.isAdmin === true || ['founder', 'owner', 'admin', 'operator', 'deployer'].includes(String(identity.role || data.role || '').toLowerCase()) || scopes.some((scope) => /^admin\.|keys\.write|gateway\.invoke|0s\.owner$/i.test(String(scope))),
    workspaceId: text(identity.workspace || data.workspace || data.workspace_id || data.workspaceId || gateCard.workspace || gateCard.workspace_id || '', 220),
    clientId: text(data.client_id || data.clientId || data.org_id || data.orgId || data.customer_id || data.customerId || gateCard.client_id || gateCard.clientId || '', 220),
    customerId: text(data.customer_id || data.customerId || data.org_id || data.orgId || gateCard.customer_id || '', 220),
    gateSessionId: text(data.session_id || data.sessionId || data.session?.id || '', 220),
    via: auth.via || data.source || 'skygate'
  };
}

function actorSlugs(actor = {}) {
  return new Set([
    actor.workspaceId,
    actor.clientId,
    actor.customerId,
    actor.email?.split('@')[0] || ''
  ].map((value) => slug(value, '')).filter(Boolean));
}

function canAccessBase(base, actor) {
  if (!base) return { ok: false, status: 404, error: 'knowledge_base_not_found' };
  if (actor.isAdmin) return { ok: true };
  if (base.ownerType === 'platform') {
    return { ok: false, status: 403, error: 'platform_knowledge_requires_owner_or_admin_gate_session' };
  }
  const allowed = actorSlugs(actor);
  const baseValues = [base.clientId, base.workspaceId, base.valleyBusinessId, base.relayInboxId].map((value) => slug(value, '')).filter(Boolean);
  if (baseValues.some((value) => allowed.has(value))) return { ok: true };
  return { ok: false, status: 403, error: 'tenant_knowledge_base_not_in_gate_workspace' };
}

async function upsertBaseIndex(env, base) {
  const current = await getJson(env, BASE_INDEX_KEY, []);
  const next = [baseSummary(base), ...current.filter((entry) => entry.id !== base.id)].slice(0, 500);
  await putJson(env, BASE_INDEX_KEY, next);
  return next;
}

async function getStoredBase(env, id) {
  const wanted = slug(id || PLATFORM_BASE_ID);
  if (wanted === PLATFORM_BASE_ID) {
    return (await getJson(env, baseKey(PLATFORM_BASE_ID), null)) || platformBase();
  }
  return await getJson(env, baseKey(wanted), null);
}

async function ensureBase(env, input = {}, actor = {}, { persist = false } = {}) {
  const requestedId = input.knowledgeBaseId || input.baseId || input.id || '';
  let base = requestedId ? await getStoredBase(env, requestedId) : null;
  if (!base && (slug(requestedId) === PLATFORM_BASE_ID || input.ownerType === 'platform' || input.scope === 'platform')) {
    base = platformBase();
  }
  if (!base) base = tenantBaseFromInput(input);
  const access = canAccessBase(base, actor);
  if (!access.ok) return { ok: false, access };
  if (persist) {
    const existing = await getStoredBase(env, base.id);
    if (!existing) {
      const stored = await putJson(env, baseKey(base.id), base);
      await upsertBaseIndex(env, base);
      base.stored = stored;
    }
  }
  return { ok: true, base };
}

async function saveBase(env, rawBase, actor, deps = {}) {
  if (!metadataStore(env)?.put) {
    return { ok: false, status: 503, error: 'company_knowledge_metadata_store_not_configured' };
  }
  const bodyOwnerType = String(rawBase.ownerType || rawBase.scope || '').toLowerCase();
  const base = bodyOwnerType === 'platform' || slug(rawBase.id || rawBase.baseId || rawBase.knowledgeBaseId) === PLATFORM_BASE_ID
    ? { ...platformBase(), ...rawBase, id: PLATFORM_BASE_ID, ownerType: 'platform', updatedAt: now() }
    : { ...tenantBaseFromInput(rawBase), ...rawBase, ownerType: 'tenant', id: slug(rawBase.knowledgeBaseId || rawBase.baseId || rawBase.id || `tenant-${resolveCanonicalTenant(rawBase).clientId}`), updatedAt: now() };
  base.displayName = text(base.displayName || base.name || base.id, 220);
  base.description = text(base.description || '', 1200);
  base.status = text(base.status || 'active', 80);
  base.storage = { ...base.storage, ...storageReceipt(env) };
  if (base.ownerType === 'platform' && !actor.isAdmin) {
    return { ok: false, status: 403, error: 'platform_knowledge_requires_owner_or_admin_gate_session' };
  }
  const access = canAccessBase(base, actor);
  if (!access.ok) return { ok: false, status: access.status, error: access.error };
  const existing = await getStoredBase(env, base.id);
  const next = {
    ...existing,
    ...base,
    createdAt: existing?.createdAt || base.createdAt || now(),
    updatedAt: now(),
    itemCount: Number(existing?.itemCount || base.itemCount || 0),
    byteCount: Number(existing?.byteCount || base.byteCount || 0),
    createdBy: existing?.createdBy || actor.actor,
    updatedBy: actor.actor
  };
  const stored = await putJson(env, baseKey(next.id), next);
  await upsertBaseIndex(env, next);
  await mirrorKnowledgeEvent(env, {
    type: 'company_knowledge.base_upserted',
    actor,
    base: next,
    recordId: next.id,
    primary: {
      ok: stored,
      system: 'cloudflare_worker_kv',
      receiptId: baseKey(next.id),
      writtenAt: next.updatedAt
    }
  }, deps);
  return { ok: true, base: next, stored, storage: storageReceipt(env) };
}

async function listBases(env, actor, input = {}) {
  const stored = await getJson(env, BASE_INDEX_KEY, []);
  const map = new Map(stored.map((entry) => [entry.id, entry]));
  const platform = await getStoredBase(env, PLATFORM_BASE_ID);
  map.set(PLATFORM_BASE_ID, baseSummary(platform));
  if (input.clientId || input.workspaceId || input.valleyBusinessId || input.knowledgeBaseId || input.baseId) {
    const ensured = await ensureBase(env, input, actor);
    if (ensured.ok) map.set(ensured.base.id, baseSummary(ensured.base));
  }
  const bases = [...map.values()].filter((base) => canAccessBase(base, actor).ok);
  bases.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return bases;
}

async function listItemSummaries(env, baseId, limit = 100) {
  const items = await getJson(env, itemIndexKey(baseId), []);
  return items.slice(0, Math.max(1, Math.min(500, Number(limit || 100))));
}

async function upsertItemIndex(env, base, item) {
  const current = await getJson(env, itemIndexKey(base.id), []);
  const next = [itemSummary(item), ...current.filter((entry) => entry.id !== item.id)].slice(0, 1000);
  await putJson(env, itemIndexKey(base.id), next);
  const bytes = next.reduce((sum, entry) => sum + Number(entry.byteLength || 0), 0);
  const updatedBase = {
    ...base,
    itemCount: next.length,
    byteCount: bytes,
    updatedAt: now()
  };
  await putJson(env, baseKey(updatedBase.id), updatedBase);
  await upsertBaseIndex(env, updatedBase);
  return { index: next, base: updatedBase };
}

async function removeItemFromIndex(env, base, itemId) {
  const current = await getJson(env, itemIndexKey(base.id), []);
  const next = current.filter((entry) => entry.id !== itemId);
  await putJson(env, itemIndexKey(base.id), next);
  const bytes = next.reduce((sum, entry) => sum + Number(entry.byteLength || 0), 0);
  const updatedBase = { ...base, itemCount: next.length, byteCount: bytes, updatedAt: now() };
  await putJson(env, baseKey(updatedBase.id), updatedBase);
  await upsertBaseIndex(env, updatedBase);
  return updatedBase;
}

function sourceFromBody(body = {}) {
  const source = body.source && typeof body.source === 'object' ? body.source : {};
  return {
    kind: text(source.kind || body.sourceKind || body.source || 'manual_drop', 120),
    vaultReceiptId: text(source.vaultReceiptId || source.receiptId || body.vaultReceiptId || body.receiptId, 180),
    vaultObjectKey: text(source.vaultObjectKey || body.vaultObjectKey, 500),
    driveFileId: text(source.driveFileId || body.driveFileId, 220),
    drivePath: text(source.drivePath || body.drivePath, 500),
    path: text(source.path || body.path || body.filePath, 500),
    url: text(source.url || body.url || body.sourceUrl, 800)
  };
}

function titleFromContent(body, content) {
  return text(
    body.title ||
    body.name ||
    content.split(/\n+/).map((line) => line.trim()).find(Boolean) ||
    'Knowledge item',
    240
  );
}

function summaryFromContent(body, content) {
  return text(body.summary || content.replace(/\s+/g, ' ').slice(0, 320), 420);
}

async function readStoredContent(env, item) {
  if (!item) return '';
  if (item.contentInline) return item.contentInline;
  const bucket = objectBucket(env);
  if (bucket?.get && item.objectKey) {
    const object = await bucket.get(item.objectKey).catch(() => null);
    if (object?.text) {
      const raw = await object.text();
      try {
        const parsed = JSON.parse(raw);
        return contentText(parsed.content || parsed.text || '', MAX_CONTENT_CHARS);
      } catch {
        return contentText(raw, MAX_CONTENT_CHARS);
      }
    }
  }
  return '';
}

async function createKnowledgeItem(env, body, actor, deps = {}) {
  if (!metadataStore(env)?.put) {
    return { ok: false, status: 503, error: 'company_knowledge_metadata_store_not_configured' };
  }
  const ensured = await ensureBase(env, body, actor, { persist: true });
  if (!ensured.ok) return { ok: false, status: ensured.access.status, error: ensured.access.error };
  let base = ensured.base;
  const content = contentText(body.content || body.text || body.markdown || body.html || body.note || body.notes || '', MAX_CONTENT_CHARS);
  if (!content && !body.vaultReceiptId && !body.driveFileId) {
    return { ok: false, status: 400, error: 'knowledge_item_requires_content_or_source_reference' };
  }
  const createdAt = text(body.createdAt || body.created_at, 80) || now();
  const itemId = slug(body.id || body.itemId || body.knowledgeItemId || randomId('ck_item'));
  const bytes = byteLength(content);
  const hash = await sha256Hex(content || `${itemId}:${createdAt}`);
  const key = objectKey(base.id, itemId);
  const bucket = objectBucket(env);
  let objectStored = false;
  let inlineContent = '';
  if (bucket?.put) {
    await bucket.put(key, JSON.stringify({
      schema: `${COMPANY_KNOWLEDGE_SCHEMA}-object`,
      baseId: base.id,
      itemId,
      content,
      storedAt: now()
    }), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: {
        baseId: base.id,
        itemId,
        clientId: base.clientId || '',
        workspaceId: base.workspaceId || '',
        sha256: hash
      }
    });
    objectStored = true;
  } else if (bytes <= INLINE_CONTENT_LIMIT) {
    inlineContent = content;
  } else {
    return { ok: false, status: 507, error: 'company_knowledge_r2_bucket_required_for_large_item' };
  }
  const item = {
    id: itemId,
    schema: `${COMPANY_KNOWLEDGE_SCHEMA}-item`,
    baseId: base.id,
    ownerType: base.ownerType,
    clientId: base.clientId,
    workspaceId: base.workspaceId,
    valleyBusinessId: base.valleyBusinessId || '',
    relayInboxId: base.relayInboxId || '',
    title: titleFromContent(body, content),
    summary: summaryFromContent(body, content),
    tags: array(body.tags || body.labels || body.categories, 24),
    source: sourceFromBody(body),
    contentType: text(body.contentType || body.mimeType || 'text/plain', 120),
    byteLength: bytes,
    sha256: hash,
    objectKey: objectStored ? key : '',
    contentInline: inlineContent,
    storage: objectStored ? 'cloudflare_r2' : 'cloudflare_kv_inline',
    status: text(body.status || 'active', 80),
    createdAt,
    updatedAt: now(),
    createdBy: actor.actor,
    updatedBy: actor.actor
  };
  const stored = await putJson(env, itemKey(item.id), item);
  const updated = await upsertItemIndex(env, base, item);
  base = updated.base;
  const mirror = await mirrorKnowledgeEvent(env, {
    type: 'company_knowledge.item_upserted',
    actor,
    base,
    item,
    recordId: item.id,
    primary: {
      ok: stored,
      system: item.storage,
      receiptId: item.objectKey || itemKey(item.id),
      writtenAt: item.updatedAt
    }
  }, deps);
  const { contentInline, ...publicItem } = item;
  return {
    ok: true,
    base,
    item: publicItem,
    contentPreview: content.slice(0, 600),
    stored,
    storage: storageReceipt(env),
    mirror
  };
}

async function getItemRecord(env, itemId) {
  return await getJson(env, itemKey(itemId), null);
}

async function mirrorKnowledgeEvent(env, event = {}, deps = {}) {
  try {
    const result = await recordCitadelMirrorEvent(env, {
      id: `${event.type || 'company_knowledge.event'}:${event.recordId || randomId('ck_evt')}`,
      source: 'company_knowledge',
      appId: 'company-knowledge',
      workspaceId: event.base?.workspaceId || event.item?.workspaceId || PLATFORM_WORKSPACE_ID,
      table: event.item ? 'company_knowledge_items' : 'company_knowledge_bases',
      recordId: event.recordId || '',
      operation: event.type?.includes('deleted') ? 'delete' : 'upsert',
      primary: event.primary || {},
      payloadRef: event.item?.objectKey || event.primary?.receiptId || '',
      payload: event.item || event.base || null,
      note: `${event.type || 'company_knowledge.event'} for ${event.base?.id || event.item?.baseId || 'unknown-base'}`
    }, event.actor?.actor || 'company-knowledge');
    if (deps?.mirrorSkygateEvent) {
      deps.mirrorSkygateEvent(env, { type: event.type, meta: { base_id: event.base?.id, item_id: event.item?.id, record_id: event.recordId } }).catch(() => null);
    }
    return {
      ok: result.ok === true,
      stored: result.stored === true,
      eventId: result.event?.id || '',
      status: result.event?.status || result.error || 'not_recorded',
      catchupRequired: result.catchupRequired === true,
      ledgerRoute: '/api/citadel/ledger'
    };
  } catch (error) {
    if (deps?.mirrorSkygateEvent) {
      deps.mirrorSkygateEvent(env, { type: event.type, meta: { base_id: event.base?.id, item_id: event.item?.id, record_id: event.recordId } }).catch(() => null);
    }
    return {
      ok: false,
      stored: false,
      eventId: '',
      status: `mirror_deferred:${text(error?.message || 'unknown', 180)}`,
      catchupRequired: true,
      ledgerRoute: '/api/citadel/ledger'
    };
  }
}

function scoreItem(query, item, content) {
  const terms = String(query || '').toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 1);
  if (!terms.length) return 1;
  const hay = [
    item.title,
    item.summary,
    (item.tags || []).join(' '),
    item.source?.kind,
    item.source?.vaultReceiptId,
    item.source?.driveFileId,
    content
  ].join(' ').toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (String(item.title || '').toLowerCase().includes(term)) score += 8;
    if (String(item.summary || '').toLowerCase().includes(term)) score += 4;
    if ((item.tags || []).join(' ').toLowerCase().includes(term)) score += 3;
    const matches = hay.split(term).length - 1;
    score += Math.min(matches, 6);
  }
  return score;
}

function snippetFor(query, content, fallback = '') {
  const clean = text(content || fallback, 1200);
  const terms = String(query || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const lower = clean.toLowerCase();
  const index = terms.map((term) => lower.indexOf(term)).find((hit) => hit >= 0);
  if (index == null || index < 0) return clean.slice(0, 420);
  const start = Math.max(0, index - 140);
  return clean.slice(start, start + 520);
}

async function searchKnowledge(env, base, query, limit = 8) {
  const summaries = await listItemSummaries(env, base.id, 500);
  const hits = [];
  for (const summary of summaries) {
    const record = await getItemRecord(env, summary.id) || summary;
    const content = await readStoredContent(env, record);
    const score = scoreItem(query, record, content);
    if (score <= 0) continue;
    hits.push({
      ...itemSummary(record),
      score,
      snippet: snippetFor(query, content, record.summary)
    });
  }
  hits.sort((a, b) => b.score - a.score || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return hits.slice(0, Math.max(1, Math.min(30, Number(limit || 8))));
}

function contextFromHits(base, hits) {
  const lines = [
    `Company knowledge context: ${base.displayName}`,
    `Base: ${base.id} / workspace: ${base.workspaceId} / client: ${base.clientId}`,
    'Use these notes as internal context only. Keep owner approval for legal, payments, public claims, credential, and regulated actions.'
  ];
  hits.forEach((hit, index) => {
    lines.push(`[${index + 1}] ${hit.title}`);
    lines.push(`source=${hit.source?.kind || 'manual'} item=${hit.id} sha=${String(hit.sha256 || '').slice(0, 12)}`);
    lines.push(hit.snippet);
  });
  return lines.join('\n\n');
}

export async function handleCompanyKnowledgeRoute(request, env, ctx, url, deps = {}) {
  if (!url.pathname.startsWith(API_PREFIX)) return null;
  if (request.method === 'OPTIONS') return json({ ok: true });
  const auth = deps?.requireGateAuth
    ? await deps.requireGateAuth(request, env, 'company knowledge base')
    : { ok: false, response: json({ ok: false, error: 'Company knowledge requires the canonical FS27/SkyGate auth helper.', code: 'fs27_helper_required' }, 503) };
  if (!auth.ok) return auth.response || json({ ok: false, error: 'company_knowledge_requires_gate_session' }, 401);
  const actor = actorFromAuth(auth);
  const method = request.method.toUpperCase();
  const route = url.pathname.slice(API_PREFIX.length) || '/';

  try {
  if ((route === '/' || route === '/health' || route === '/status') && method === 'GET') {
    return json({
      ok: true,
      schema: COMPANY_KNOWLEDGE_SCHEMA,
      gateAuthority: 'FS27/SkyGate/Free99 shared gate',
      storage: storageReceipt(env),
      defaultPlatformBaseId: PLATFORM_BASE_ID,
      actor: { actor: actor.actor, role: actor.role, isAdmin: actor.isAdmin, workspaceId: actor.workspaceId, clientId: actor.clientId }
    });
  }

  if (route === '/bases' && method === 'GET') {
    const bases = await listBases(env, actor, {
      knowledgeBaseId: url.searchParams.get('knowledgeBaseId') || url.searchParams.get('baseId'),
      clientId: url.searchParams.get('clientId'),
      workspaceId: url.searchParams.get('workspaceId'),
      valleyBusinessId: url.searchParams.get('valleyBusinessId')
    });
    return json({ ok: true, schema: COMPANY_KNOWLEDGE_SCHEMA, bases, count: bases.length, storage: storageReceipt(env) });
  }

  if ((route === '/bases' || route === '/base') && method === 'POST') {
    const result = await saveBase(env, await readBody(request), actor, deps);
    return json(result, result.ok ? 201 : result.status || 400);
  }

  if (route === '/base' && method === 'GET') {
    const ensured = await ensureBase(env, {
      knowledgeBaseId: url.searchParams.get('knowledgeBaseId') || url.searchParams.get('baseId'),
      clientId: url.searchParams.get('clientId'),
      workspaceId: url.searchParams.get('workspaceId')
    }, actor);
    if (!ensured.ok) return json({ ok: false, error: ensured.access.error }, ensured.access.status);
    return json({ ok: true, base: ensured.base, storage: storageReceipt(env) });
  }

  if (route === '/items' && method === 'GET') {
    const ensured = await ensureBase(env, {
      knowledgeBaseId: url.searchParams.get('knowledgeBaseId') || url.searchParams.get('baseId'),
      clientId: url.searchParams.get('clientId'),
      workspaceId: url.searchParams.get('workspaceId')
    }, actor);
    if (!ensured.ok) return json({ ok: false, error: ensured.access.error }, ensured.access.status);
    const items = await listItemSummaries(env, ensured.base.id, url.searchParams.get('limit'));
    return json({ ok: true, base: ensured.base, items, count: items.length, storage: storageReceipt(env) });
  }

  if ((route === '/items' || route === '/item') && method === 'POST') {
    const result = await createKnowledgeItem(env, await readBody(request), actor, deps);
    return json(result, result.ok ? 201 : result.status || 400);
  }

  if (route === '/vault-ingest' && method === 'POST') {
    const body = await readBody(request);
    const result = await createKnowledgeItem(env, {
      ...body,
      source: {
        ...(body.source || {}),
        kind: 'skyevault_receipt',
        vaultReceiptId: body.vaultReceiptId || body.receiptId || body.source?.receiptId,
        vaultObjectKey: body.vaultObjectKey || body.source?.vaultObjectKey
      },
      title: body.title || `SkyeVault receipt ${body.vaultReceiptId || body.receiptId || ''}`.trim(),
      content: body.content || body.summary || body.notes || `SkyeVault receipt reference ${body.vaultReceiptId || body.receiptId || ''}`.trim()
    }, actor, deps);
    return json(result, result.ok ? 201 : result.status || 400);
  }

  if (route.startsWith('/items/') && ['GET', 'DELETE'].includes(method)) {
    const itemId = slug(decodeURIComponent(route.slice('/items/'.length)));
    const item = await getItemRecord(env, itemId);
    if (!item) return json({ ok: false, error: 'knowledge_item_not_found' }, 404);
    const base = await getStoredBase(env, item.baseId);
    const access = canAccessBase(base, actor);
    if (!access.ok) return json({ ok: false, error: access.error }, access.status);
    if (method === 'DELETE') {
      const bucket = objectBucket(env);
      if (bucket?.delete && item.objectKey) await bucket.delete(item.objectKey).catch(() => null);
      await deleteJson(env, itemKey(item.id));
      const updatedBase = await removeItemFromIndex(env, base, item.id);
      await mirrorKnowledgeEvent(env, {
        type: 'company_knowledge.item_deleted',
        actor,
        base: updatedBase,
        item,
        recordId: item.id,
        primary: { ok: true, system: item.storage, receiptId: item.objectKey || itemKey(item.id), writtenAt: now() }
      }, deps);
      return json({ ok: true, deleted: true, item: itemSummary(item), base: updatedBase });
    }
    const content = await readStoredContent(env, item);
    return json({ ok: true, base, item: itemSummary(item), content, storage: storageReceipt(env) });
  }

  if ((route === '/search' || route === '/context') && method === 'POST') {
    const body = await readBody(request);
    const ensured = await ensureBase(env, body, actor);
    if (!ensured.ok) return json({ ok: false, error: ensured.access.error }, ensured.access.status);
    const hits = await searchKnowledge(env, ensured.base, body.query || body.q || '', body.limit || 8);
    const payload = {
      ok: true,
      base: ensured.base,
      query: text(body.query || body.q || '', 500),
      hits,
      count: hits.length,
      storage: storageReceipt(env)
    };
    if (route === '/context') {
      payload.context = contextFromHits(ensured.base, hits);
      payload.citations = hits.map((hit, index) => ({ index: index + 1, itemId: hit.id, title: hit.title, sha256: hit.sha256, source: hit.source }));
    }
    return json(payload);
  }

    return json({ ok: false, error: 'company_knowledge_route_not_found', path: url.pathname }, 404);
  } catch (error) {
    return json({
      ok: false,
      error: 'company_knowledge_internal_error',
      message: text(error?.message || error, 400)
    }, 500);
  }
}
