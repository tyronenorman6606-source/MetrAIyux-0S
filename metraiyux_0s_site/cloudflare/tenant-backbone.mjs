import {
  buildAiResponseMonitorSnapshot,
  evaluateAiResponseUsage,
  listAiResponseLanes,
  simulateAiResponseLoad
} from './relay13-ai-lanes.mjs';
import { recordCitadelMirrorEvent } from './citadeldb-adapter.mjs';

const TENANT_SCHEMA = 'metraiyux-0s-canonical-tenant-map-v1';
const TENANT_EVENT_PREFIX = 'tenant-backbone:v1:event:';
const TENANT_EVENT_INDEX_KEY = 'tenant-backbone:v1:events';
const TENANT_LEAD_PREFIX = 'tenant-backbone:v1:lead:';
const TENANT_DOCX_SHARE_PREFIX = 'tenant-backbone:v1:skye-docx-share:';
const TENANT_CONTENT_PACKAGE_PREFIX = 'tenant-backbone:v1:content-package:';
const TENANT_MEDIA_REUSE_PREFIX = 'tenant-backbone:v1:media-reuse:';
const TENANT_INDEX_PREFIX = 'tenant-backbone:v1:tenant:';
const RELAY_INDEX_PREFIX = 'tenant-backbone:v1:relay-inbox:';

const CANONICAL_TENANTS = Object.freeze([
  {
    clientId: 'fade-masters-phx',
    displayName: 'Fade Masters PHX',
    workspaceId: 'fade-masters-phx-preview-001',
    valleyBusinessId: 'fade-masters-phx',
    relayInboxId: 'relay13:fade-masters-phx',
    installQr: 'https://skyenet.fade-masters-phx/scan.html',
    clientAppRoute: 'https://skyenet.fade-masters-phx/',
    legacyZeroOsRoute: '/client-app-factory/client-apps/fade-masters-phx/',
    valleyRoute: '/valley-verified/business/fade-masters-phx/',
    northstarRoute: '/northstar/?workspace=fade-masters-phx',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'standalone-skynet-live'
  },
  {
    clientId: 'empire-pallets',
    displayName: 'Empire Pallets',
    workspaceId: 'empire-pallets-preview-001',
    valleyBusinessId: 'empire-pallets-phoenix',
    relayInboxId: 'relay13:empire-pallets',
    installQr: 'https://skyenet.empire-pallets/scan.html',
    clientAppRoute: 'https://skyenet.empire-pallets/',
    legacyZeroOsRoute: '/client-app-factory/client-apps/empire-pallets/',
    valleyRoute: '/valley-verified/business/empire-pallets-phoenix/',
    northstarRoute: '/northstar/?workspace=empire-pallets',
    defaultAiPlan: 'relay13-ai-response-plus',
    status: 'standalone-skynet-live'
  },
  {
    clientId: 'next-level-gaming-goodyear',
    displayName: 'Next Level Gaming',
    workspaceId: 'next-level-gaming-goodyear-preview-001',
    valleyBusinessId: 'next-level-gaming-goodyear',
    relayInboxId: 'relay13:next-level-gaming-goodyear',
    installQr: 'https://skyenet.next-level-gaming-goodyear/scan.html',
    clientAppRoute: 'https://skyenet.next-level-gaming-goodyear/',
    legacyZeroOsRoute: '/client-app-factory/client-apps/next-level-gaming-goodyear/',
    valleyRoute: '/valley-verified/business/next-level-gaming-goodyear/',
    northstarRoute: '/northstar/?workspace=next-level-gaming-goodyear',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'standalone-skynet-live'
  },
  {
    clientId: 'as-you-wish-pottery-westgate',
    displayName: 'As You Wish Pottery',
    workspaceId: 'as-you-wish-pottery-westgate-preview-001',
    valleyBusinessId: 'as-you-wish-pottery-westgate',
    relayInboxId: 'relay13:as-you-wish-pottery-westgate',
    installQr: 'https://skyenet.as-you-wish-pottery-westgate/scan.html',
    clientAppRoute: 'https://skyenet.as-you-wish-pottery-westgate/',
    legacyZeroOsRoute: '/client-app-factory/client-apps/as-you-wish-pottery-westgate/',
    valleyRoute: '/valley-verified/business/as-you-wish-pottery-westgate/',
    northstarRoute: '/northstar/?workspace=as-you-wish-pottery-westgate',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'standalone-skynet-live'
  },
  {
    clientId: 'bobs-smoke-shop',
    displayName: "Bob's Smoke Shop",
    workspaceId: 'bobs-smoke-shop-litchfield-park-preview-001',
    valleyBusinessId: 'bobs-smoke-shop-litchfield-park',
    relayInboxId: 'relay13:bobs-smoke-shop-litchfield-park',
    installQr: 'https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/',
    clientAppRoute: 'https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/',
    workspacePreviewRoute: 'https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/workspace-preview/',
    legacyZeroOsRoute: '/skyenet/bobs-smoke-shop/',
    valleyRoute: '/valley-verified/business/bobs-smoke-shop-litchfield-park/',
    northstarRoute: '/northstar/?workspace=bobs-smoke-shop-litchfield-park',
    defaultAiPlan: 'relay13-managed-ai-inbox',
    status: 'standalone-skynet-live'
  },
  {
    clientId: '480-realty-property-management',
    displayName: '480 Realty & Property Management',
    workspaceId: '480-realty-property-management-preview-001',
    valleyBusinessId: '480-realty-property-management-mesa-85209',
    relayInboxId: 'relay13:480-realty-property-management',
    installQr: '/client-app-factory/client-apps/480-realty-property-management/scan.html',
    clientAppRoute: '/client-app-factory/client-apps/480-realty-property-management/',
    valleyRoute: '/valley-verified/business/480-realty-property-management-mesa-85209/',
    northstarRoute: '/northstar/?workspace=480-realty-property-management',
    defaultAiPlan: 'relay13-ai-response-plus',
    status: 'tenant-ready'
  },
  {
    clientId: 'dink-and-dine-pickle-park',
    displayName: 'Dink & Dine Pickle Park',
    workspaceId: 'dink-and-dine-pickle-park-preview-001',
    valleyBusinessId: 'dink-and-dine-pickle-park-mesa-85201-5432605',
    relayInboxId: 'relay13:dink-and-dine-pickle-park',
    installQr: '/client-app-factory/client-apps/dink-and-dine-pickle-park/scan.html',
    clientAppRoute: '/client-app-factory/client-apps/dink-and-dine-pickle-park/',
    valleyRoute: '/valley-verified/business/dink-and-dine-pickle-park-mesa-85201-5432605/',
    northstarRoute: '/northstar/?workspace=dink-and-dine-pickle-park',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'tenant-ready'
  },
  {
    clientId: 'techbros-electronic-recycling-itad',
    displayName: 'Techbros Electronic Recycling & ITAD',
    workspaceId: 'techbros-electronic-recycling-itad-preview-001',
    valleyBusinessId: 'techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c',
    relayInboxId: 'relay13:techbros-electronic-recycling-itad',
    installQr: '/client-app-factory/client-apps/techbros-electronic-recycling-itad/scan.html',
    clientAppRoute: '/client-app-factory/client-apps/techbros-electronic-recycling-itad/',
    valleyRoute: '/valley-verified/business/techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c/',
    northstarRoute: '/northstar/?workspace=techbros-electronic-recycling-itad',
    defaultAiPlan: 'relay13-ai-response-plus',
    status: 'tenant-ready'
  },
  {
    clientId: 'dental-depot-orthodontics-phoenix',
    displayName: 'Dental Depot Orthodontics',
    workspaceId: 'dental-depot-orthodontics-phoenix-preview-001',
    valleyBusinessId: 'dental-depot-orthodontics-phoenix',
    relayInboxId: 'relay13:dental-depot-orthodontics-phoenix',
    installQr: '/client-app-factory/client-apps/dental-depot-orthodontics-phoenix/scan.html',
    clientAppRoute: '/client-app-factory/client-apps/dental-depot-orthodontics-phoenix/',
    valleyRoute: '/valley-verified/business/dental-depot-orthodontics-phoenix/',
    northstarRoute: '/northstar/?workspace=dental-depot-orthodontics-phoenix',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'tenant-ready'
  },
  {
    clientId: 'general-dentistry-4-kids-phoenix',
    displayName: 'General Dentistry 4 Kids',
    workspaceId: 'general-dentistry-4-kids-phoenix-preview-001',
    valleyBusinessId: 'general-dentistry-4-kids-phoenix-85032-237e895',
    relayInboxId: 'relay13:general-dentistry-4-kids-phoenix',
    installQr: '/client-app-factory/client-apps/general-dentistry-4-kids-phoenix/scan.html',
    clientAppRoute: '/client-app-factory/client-apps/general-dentistry-4-kids-phoenix/',
    valleyRoute: '/valley-verified/business/general-dentistry-4-kids-phoenix-85032-237e895/',
    northstarRoute: '/northstar/?workspace=general-dentistry-4-kids-phoenix',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'tenant-ready'
  },
  {
    clientId: 'arizona-biltmore-dentistry',
    displayName: 'Arizona Biltmore Dentistry',
    workspaceId: 'arizona-biltmore-dentistry-preview-001',
    valleyBusinessId: 'arizona-biltmore-dentistry',
    relayInboxId: 'relay13:arizona-biltmore-dentistry',
    installQr: '/client-app-factory/client-apps/arizona-biltmore-dentistry/scan.html',
    clientAppRoute: '/client-app-factory/client-apps/arizona-biltmore-dentistry/',
    valleyRoute: '/valley-verified/business/arizona-biltmore-dentistry/',
    northstarRoute: '/northstar/?workspace=arizona-biltmore-dentistry',
    defaultAiPlan: 'relay13-ai-response-starter',
    status: 'tenant-ready'
  }
]);

function now() {
  return new Date().toISOString();
}

function randomId(prefix = 'tenant_evt') {
  const token = globalThis.crypto?.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    : `${Date.now()}${Math.random()}`.replace(/\D/g, '').slice(0, 20);
  return `${prefix}_${token}`;
}

function text(value, max = 1000) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function slug(value = '') {
  return text(value, 200).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function array(value, max = 12) {
  const list = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/\n|,/) : []);
  return [...new Set(list.map((item) => text(item, 200)).filter(Boolean))].slice(0, max);
}

function storage(env) {
  return env.TENANT_BACKBONE_KV || env.CONTENT_ENGINE_KV || env.SITE_EVENTS_KV || null;
}

function publicTenant(tenant) {
  return {
    ...tenant,
    schema: TENANT_SCHEMA,
    gateAuthority: 'metraiyux-0s-gate',
    identityOwner: '0s-gate-owned-session',
    signInProMountRule: 'SignIn Pro is a mounted 0S app. Gate auth owns the session; this app never replaces the gate.',
    relayInboxRoute: `/api/0s/tenant-inbox?clientId=${encodeURIComponent(tenant.clientId)}`
  };
}

export function listCanonicalTenants() {
  return CANONICAL_TENANTS.map(publicTenant);
}

export function resolveCanonicalTenant(input = {}) {
  const values = [
    input.clientId,
    input.client_id,
    input.workspaceId,
    input.workspace_id,
    input.workspaceSlug,
    input.previewConfig?.workspaceId,
    input.previewConfig?.workspaceSlug,
    input.workspace,
    input.valleyBusinessId,
    input.valley_business_id,
    input.valleySync?.businessId,
    input.businessId,
    input.business_id,
    input.relayInboxId,
    input.relay_inbox_id,
    input.displayName,
    input.clientName,
    input.company,
    input.businessName
  ].map(slug).filter(Boolean);
  const exact = CANONICAL_TENANTS.find((tenant) => values.some((value) => [
    tenant.clientId,
    tenant.workspaceId,
    tenant.valleyBusinessId,
    tenant.relayInboxId,
    slug(tenant.displayName)
  ].map(slug).includes(value)));
  if (exact) return publicTenant(exact);
  const fallbackClientId = slug(input.clientId || input.client_id || input.workspaceSlug || input.previewConfig?.workspaceSlug || input.workspace || input.displayName || input.clientName || input.company || 'unknown-client');
  return publicTenant({
    clientId: fallbackClientId,
    displayName: text(input.displayName || input.clientName || input.company || fallbackClientId, 180),
    workspaceId: text(input.workspaceId || input.workspace_id || input.previewConfig?.workspaceId || `${fallbackClientId}-preview-001`, 180),
    valleyBusinessId: text(input.valleyBusinessId || input.valley_business_id || input.valleySync?.businessId || input.businessId || fallbackClientId, 180),
    relayInboxId: text(input.relayInboxId || input.relay_inbox_id || `relay13:${fallbackClientId}`, 180),
    installQr: `/client-app-factory/client-apps/${fallbackClientId}/scan.html`,
    clientAppRoute: `/client-app-factory/client-apps/${fallbackClientId}/`,
    valleyRoute: `/valley-verified/business/${text(input.valleyBusinessId || input.businessId || fallbackClientId, 180)}/`,
    northstarRoute: `/northstar/?workspace=${encodeURIComponent(fallbackClientId)}`,
    defaultAiPlan: text(input.aiPlan || input.planId || 'relay13-ai-response-starter', 120),
    status: 'dynamic-tenant'
  });
}

async function getJson(env, key, fallback = null) {
  const kv = storage(env);
  if (!kv?.get) return fallback;
  return await kv.get(key, { type: 'json' }).catch(() => null) || fallback;
}

async function putJson(env, key, value) {
  const kv = storage(env);
  if (!kv?.put) return false;
  await kv.put(key, JSON.stringify(value));
  return true;
}

async function appendIndex(env, key, item, limit = 250) {
  const existing = await getJson(env, key, []);
  const id = String(item.id || item.eventId || item.leadId || '');
  const next = [item, ...existing.filter((entry) => String(entry.id || entry.eventId || entry.leadId || '') !== id)].slice(0, limit);
  await putJson(env, key, next);
  return next;
}

function eventSummary(event) {
  return {
    id: event.id,
    type: event.type,
    clientId: event.clientId,
    workspaceId: event.workspaceId,
    valleyBusinessId: event.valleyBusinessId,
    relayInboxId: event.relayInboxId,
    title: event.title || event.subject || event.messagePreview || '',
    status: event.status,
    createdAt: event.createdAt
  };
}

function mirrorSummary(result = {}) {
  return {
    ok: result.ok === true,
    stored: result.stored === true,
    eventId: text(result.event?.id || '', 180),
    status: text(result.event?.status || result.error || 'not_recorded', 120),
    catchupRequired: result.catchupRequired === true,
    ledgerRoute: '/api/citadel/ledger',
    catchupRoute: '/api/citadel/catchup-queue'
  };
}

export async function recordTenantEvent(env, event = {}) {
  const tenant = resolveCanonicalTenant(event);
  const createdAt = text(event.createdAt || event.created_at, 80) || now();
  const stored = {
    id: text(event.id, 160) || randomId('tenant_evt'),
    type: text(event.type || 'metraiyux.tenant.event', 140),
    schema: 'metraiyux-0s-tenant-event-v1',
    clientId: tenant.clientId,
    workspaceId: tenant.workspaceId,
    valleyBusinessId: tenant.valleyBusinessId,
    relayInboxId: tenant.relayInboxId,
    tenant,
    status: text(event.status || 'stored', 120),
    title: text(event.title || event.subject || '', 240),
    messagePreview: text(event.messagePreview || event.message || event.notes || '', 600),
    payload: event.payload && typeof event.payload === 'object' ? event.payload : {},
    source: text(event.source || 'tenant-backbone', 160),
    createdAt
  };
  const eventKey = `${TENANT_EVENT_PREFIX}${stored.id}`;
  const ok = await putJson(env, eventKey, stored);
  await appendIndex(env, TENANT_EVENT_INDEX_KEY, eventSummary(stored), 500);
  await appendIndex(env, `${TENANT_INDEX_PREFIX}${stored.clientId}:events`, eventSummary(stored), 250);
  await appendIndex(env, `${RELAY_INDEX_PREFIX}${stored.relayInboxId}:events`, eventSummary(stored), 250);
  stored.sovereignMirror = mirrorSummary(await recordCitadelMirrorEvent(env, {
    id: `tenant_event:${stored.id}`,
    source: 'tenant_backbone',
    appId: 'tenant-backbone',
    workspaceId: stored.workspaceId,
    table: 'tenant_events',
    recordId: stored.id,
    operation: 'upsert',
    primary: {
      ok,
      system: 'cloudflare_worker_kv',
      receiptId: eventKey,
      writtenAt: createdAt
    },
    payloadRef: eventKey,
    payload: stored,
    note: `${stored.type} stored for ${stored.clientId}`
  }, 'metraiyux-0s-system'));
  if (ok) await putJson(env, eventKey, stored);
  return { ok, event: stored, tenant, sovereignMirror: stored.sovereignMirror };
}

function leadContact(body = {}) {
  const contact = body.contact && typeof body.contact === 'object' ? body.contact : {};
  return {
    name: text(contact.name || body.name || body.primaryContact || body.customer_name, 180),
    email: text(contact.email || body.email, 240),
    phone: text(contact.phone || body.phone, 90),
    company: text(contact.company || body.company || body.displayName || body.clientName, 220)
  };
}

async function forwardLeadToRelay13(env, lead) {
  const payload = {
    workspace: lead.tenant.clientId,
    workspace_id: lead.workspaceId,
    channel: 'client-app-lead',
    customer_name: lead.contact.name || lead.contact.company || 'Client app visitor',
    subject: lead.subject || `${lead.tenant.displayName} lead`,
    message: lead.message || lead.notes || lead.summary || 'Client app lead captured.',
    source_url: lead.sourceUrl,
    connectlog_bridge: true,
    connectlog_card_id: lead.clientId,
    connectlog_card_label: lead.tenant.displayName,
    metadata: {
      tenant_event_id: lead.id,
      client_id: lead.clientId,
      valley_business_id: lead.valleyBusinessId,
      relay_inbox_id: lead.relayInboxId,
      install_qr: lead.tenant.installQr,
      ai_policy_status: lead.aiRouting?.status || ''
    }
  };
  const headers = { 'content-type': 'application/json' };
  if (env.RELAY13_API_KEY) headers['x-relay13-api-key'] = String(env.RELAY13_API_KEY);
  const requestInit = { method: 'POST', headers, body: JSON.stringify(payload) };
  try {
    let response = null;
    let route = '';
    if (env.RELAY13_WORKER?.fetch) {
      route = '0s_service_binding';
      response = await env.RELAY13_WORKER.fetch(new Request('https://relay13.internal/api/v1/connectlog/scan', requestInit));
    } else if (env.RELAY13_WORKER_ORIGIN) {
      route = 'relay13_worker_origin';
      const origin = String(env.RELAY13_WORKER_ORIGIN).replace(/\/+$/, '');
      response = await fetch(new Request(`${origin}/api/v1/connectlog/scan`, requestInit));
    } else {
      return { attempted: false, ok: false, status: 'queued_no_relay13_binding', route: 'tenant_backbone_kv_only' };
    }
    const body = await response.json().catch(() => ({}));
    return {
      attempted: true,
      ok: response.ok,
      route,
      status: response.status,
      conversationId: body.conversation_id || body.conversationId || '',
      connectLogCardRecordId: body.connectlog_card_record_id || body.card?.id || '',
      response: body
    };
  } catch (error) {
    return { attempted: true, ok: false, status: 'relay13_forward_failed', route: 'exception', error: error?.message || String(error) };
  }
}

export async function recordTenantLead(env, body = {}, options = {}) {
  const tenant = resolveCanonicalTenant(body);
  const contact = leadContact(body);
  const message = text(body.message || body.text || body.note || body.notes || body.summary || '', 3000);
  const createdAt = text(body.createdAt || body.created_at, 80) || now();
  const aiRouting = evaluateAiResponseUsage({
    planId: body.aiPlan || body.planId || tenant.defaultAiPlan || 'relay13-ai-response-starter',
    addOnActive: body.aiAddOnActive === true || body.addOnActive === true || body.ai_active === true,
    usedThisMonth: body.usedThisMonth ?? body.aiUsedThisMonth ?? 0,
    message: { text: message, routine: body.routine === true }
  });
  const lead = {
    id: text(body.id, 160) || randomId('tenant_lead'),
    type: 'metraiyux.tenant.client_app_lead',
    schema: 'metraiyux-0s-tenant-lead-v1',
    source: text(options.source || body.source || 'client-app-factory', 160),
    clientId: tenant.clientId,
    workspaceId: tenant.workspaceId,
    valleyBusinessId: tenant.valleyBusinessId,
    relayInboxId: tenant.relayInboxId,
    tenant,
    contact,
    subject: text(body.subject || body.kind || body.intent || `${tenant.displayName} client app lead`, 240),
    message,
    notes: text(body.notes, 3000),
    summary: text(body.summary, 1000),
    services: array(body.services || body.selectedServices || body.items, 16),
    sourceUrl: text(body.sourceUrl || body.source_url || body.url || '', 600),
    sourcePath: text(body.sourcePath || body.path || '', 240),
    installQr: tenant.installQr,
    aiRouting,
    status: 'captured_for_tenant_inbox',
    createdAt
  };
  const relay13 = await forwardLeadToRelay13(env, lead);
  lead.delivery = {
    storedInTenantBackbone: Boolean(storage(env)),
    relay13,
    connectLog: {
      relayInboxId: lead.relayInboxId,
      workspaceId: lead.workspaceId,
      status: relay13.ok ? 'landed_or_forwarded_to_connectlog_bridge' : 'queued_in_tenant_backbone'
    }
  };
  const leadKey = `${TENANT_LEAD_PREFIX}${lead.id}`;
  const leadStored = await putJson(env, leadKey, lead);
  lead.delivery.sovereignMirror = mirrorSummary(await recordCitadelMirrorEvent(env, {
    id: `tenant_lead:${lead.id}`,
    source: 'tenant_backbone',
    appId: 'client-app-factory',
    workspaceId: lead.workspaceId,
    table: 'tenant_leads',
    recordId: lead.id,
    operation: 'insert',
    primary: {
      ok: leadStored,
      system: 'cloudflare_worker_kv',
      receiptId: leadKey,
      writtenAt: createdAt
    },
    payloadRef: leadKey,
    payload: lead,
    note: `Client app lead captured for ${lead.clientId}`
  }, 'metraiyux-0s-system'));
  if (leadStored) await putJson(env, leadKey, lead);
  await recordTenantEvent(env, {
    id: lead.id,
    type: lead.type,
    clientId: lead.clientId,
    workspaceId: lead.workspaceId,
    valleyBusinessId: lead.valleyBusinessId,
    relayInboxId: lead.relayInboxId,
    status: lead.delivery.connectLog.status,
    title: lead.subject,
    messagePreview: lead.message || lead.summary,
    source: lead.source,
    payload: { lead, delivery: lead.delivery },
    createdAt
  });
  return { ok: true, lead, tenant, delivery: lead.delivery, sovereignMirror: lead.delivery.sovereignMirror };
}

export async function createSkyeDocxShare(env, body = {}) {
  const tenant = resolveCanonicalTenant(body);
  const targets = array(body.targets || body.target || ['skyeBlog', 'skyeDrive', 'skyeMail'], 6);
  const share = {
    id: text(body.id, 160) || randomId('docx_share'),
    type: 'metraiyux.skye_docx_max.shared_package',
    schema: 'skye-docx-max-shared-worker-persistence-v1',
    clientId: tenant.clientId,
    workspaceId: tenant.workspaceId,
    valleyBusinessId: tenant.valleyBusinessId,
    relayInboxId: tenant.relayInboxId,
    tenant,
    title: text(body.title || body.documentTitle || 'SkyeDocxMax shared package', 240),
    documentId: text(body.documentId || body.activeDocId, 180),
    handoffId: text(body.handoffId, 180),
    targets,
    html: text(body.html, 20000),
    text: text(body.text || body.markdown, 20000),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    skyeBlog: { status: targets.some((target) => /blog/i.test(target)) ? 'queued' : 'not_requested' },
    skyeDrive: { status: targets.some((target) => /drive/i.test(target)) ? 'queued' : 'not_requested' },
    skyeMail: { status: targets.some((target) => /mail/i.test(target)) ? 'queued' : 'not_requested' },
    createdAt: now()
  };
  await putJson(env, `${TENANT_DOCX_SHARE_PREFIX}${share.id}`, share);
  const event = await recordTenantEvent(env, {
    id: share.id,
    type: share.type,
    clientId: share.clientId,
    workspaceId: share.workspaceId,
    valleyBusinessId: share.valleyBusinessId,
    relayInboxId: share.relayInboxId,
    status: 'shared_worker_package_stored',
    title: share.title,
    source: 'skye-docx-max',
    messagePreview: `Shared to ${targets.join(', ')}`,
    payload: { share },
    createdAt: share.createdAt
  });
  return { ok: true, share, tenant, event: event.event };
}

export async function createContentPackage(env, body = {}) {
  const tenant = resolveCanonicalTenant(body);
  const pkg = {
    id: text(body.id, 160) || randomId('content_pkg'),
    type: 'metraiyux.content_engine.shared_package',
    schema: 'metraiyux-0s-content-package-v1',
    clientId: tenant.clientId,
    workspaceId: tenant.workspaceId,
    valleyBusinessId: tenant.valleyBusinessId,
    relayInboxId: tenant.relayInboxId,
    tenant,
    source: text(body.source || 'marketing-made-easy', 180),
    title: text(body.title || body.brief?.title || body.campaign?.name || 'Content Engine package', 260),
    brief: body.brief && typeof body.brief === 'object' ? body.brief : {},
    campaign: body.campaign && typeof body.campaign === 'object' ? body.campaign : {},
    aeVendorDocs: Array.isArray(body.aeVendorDocs) ? body.aeVendorDocs.slice(0, 24) : [],
    generatedAssets: Array.isArray(body.generatedAssets) ? body.generatedAssets.slice(0, 48) : [],
    dispatchLimits: {
      aiPlan: text(body.aiPlan || tenant.defaultAiPlan || 'relay13-ai-response-starter', 120),
      usage: evaluateAiResponseUsage({
        planId: body.aiPlan || tenant.defaultAiPlan || 'relay13-ai-response-starter',
        addOnActive: body.aiAddOnActive === true,
        usedThisMonth: body.usedThisMonth ?? 0,
        message: { text: body.brief?.summary || body.title || '', routine: true }
      })
    },
    createdAt: now()
  };
  await putJson(env, `${TENANT_CONTENT_PACKAGE_PREFIX}${pkg.id}`, pkg);
  const event = await recordTenantEvent(env, {
    id: pkg.id,
    type: pkg.type,
    clientId: pkg.clientId,
    workspaceId: pkg.workspaceId,
    valleyBusinessId: pkg.valleyBusinessId,
    relayInboxId: pkg.relayInboxId,
    status: 'content_engine_package_stored',
    title: pkg.title,
    source: pkg.source,
    messagePreview: 'Marketing/brief/vendor/assets package stored for Content Engine activation.',
    payload: { package: pkg },
    createdAt: pkg.createdAt
  });
  return { ok: true, package: pkg, tenant, event: event.event };
}

export async function createMediaReusePackage(env, body = {}) {
  const tenant = resolveCanonicalTenant(body);
  const pkg = {
    id: text(body.id, 160) || randomId('media_reuse'),
    type: 'metraiyux.skyemediacenter.reusable_asset_package',
    schema: 'metraiyux-0s-media-reuse-v1',
    clientId: tenant.clientId,
    workspaceId: tenant.workspaceId,
    valleyBusinessId: tenant.valleyBusinessId,
    relayInboxId: tenant.relayInboxId,
    tenant,
    assetId: text(body.assetId || body.asset?.id, 180),
    title: text(body.title || body.asset?.title || 'Reusable media asset', 240),
    asset: body.asset && typeof body.asset === 'object' ? body.asset : {},
    targets: array(body.targets || ['client_app_factory', 'content_engine'], 8),
    clientAppFactoryEndpoint: '/api/client-app-factory/factory/assets',
    contentEngineEndpoint: '/api/admin/content-engine/from-media-center',
    createdAt: now()
  };
  await putJson(env, `${TENANT_MEDIA_REUSE_PREFIX}${pkg.id}`, pkg);
  const event = await recordTenantEvent(env, {
    id: pkg.id,
    type: pkg.type,
    clientId: pkg.clientId,
    workspaceId: pkg.workspaceId,
    valleyBusinessId: pkg.valleyBusinessId,
    relayInboxId: pkg.relayInboxId,
    status: 'media_reuse_package_stored',
    title: pkg.title,
    source: 'skyemediacenter',
    messagePreview: `Reusable by ${pkg.targets.join(', ')}`,
    payload: { package: pkg },
    createdAt: pkg.createdAt
  });
  return { ok: true, package: pkg, tenant, event: event.event };
}

async function requireAuth(deps, request, env, label) {
  if (deps?.requireGateAuth) return deps.requireGateAuth(request, env, label);
  if (deps?.requireOperatorAuth) return deps.requireOperatorAuth(request, env, label);
  return { ok: false, response: json({ ok: false, error: `${label || '0S tenant backbone'} requires the canonical FS27/SkyGate auth helper.`, code: 'fs27_helper_required' }, 503) };
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-skye-gate-session'
    }
  });
}

async function listEvents(env, key, limit) {
  return (await getJson(env, key, [])).slice(0, Math.max(1, Math.min(500, Number(limit || 100))));
}

async function listFullTenantEvents(env, key, limit) {
  const summaries = await listEvents(env, key, limit);
  const full = [];
  for (const summary of summaries) {
    const stored = await getJson(env, `${TENANT_EVENT_PREFIX}${summary.id}`, null);
    full.push(stored || summary);
  }
  return full;
}

export async function handleTenantBackboneRoute(request, env, ctx, url, deps = {}) {
  if (!url.pathname.startsWith('/api/0s/')) return null;
  if (request.method === 'OPTIONS') return json({ ok: true });
  const method = request.method.toUpperCase();
  const route = url.pathname.slice('/api/0s'.length) || '/';

  if ((route === '/tenants' || route === '/tenant-map') && method === 'GET') {
    return json({
      ok: true,
      schema: TENANT_SCHEMA,
      gateAuthority: 'metraiyux-0s-gate',
      northStarSignInProRule: 'NorthStar SignInPro is a mounted app inside the 0S. The Gate owns auth/session authority for every paid and Free99 lane.',
      tenants: listCanonicalTenants()
    });
  }

  if (route === '/tenant' && method === 'GET') {
    const tenant = resolveCanonicalTenant({
      clientId: url.searchParams.get('clientId'),
      workspaceId: url.searchParams.get('workspaceId'),
      valleyBusinessId: url.searchParams.get('valleyBusinessId'),
      relayInboxId: url.searchParams.get('relayInboxId')
    });
    return json({ ok: true, schema: TENANT_SCHEMA, tenant });
  }

  if ((route === '/ai-response-tiers' || route === '/tenant-ai-tiers') && method === 'GET') {
    return json({
      ok: true,
      source: 'SkyePay/Stripe add-on catalog via Relay13 AI lanes',
      providerCostRule: 'Local brain first. Paid AI provider calls are allowed only inside an active tier and protected bucket.',
      tiers: listAiResponseLanes()
    });
  }

  if (route === '/ai-response/evaluate' && method === 'POST') {
    const body = await readBody(request);
    return json({ ok: true, result: evaluateAiResponseUsage(body), monitor: buildAiResponseMonitorSnapshot(body) });
  }

  if (route === '/ai-response/stress' && method === 'POST') {
    const body = await readBody(request);
    return json({ ok: true, result: simulateAiResponseLoad(body) });
  }

  if ((route === '/tenant-leads' || route === '/lead') && method === 'POST') {
    const body = await readBody(request);
    const result = await recordTenantLead(env, body, { source: body.source || 'public-tenant-lead-endpoint' });
    if (ctx?.waitUntil && deps?.mirrorSkygateEvent) {
      ctx.waitUntil(deps.mirrorSkygateEvent(env, {
        type: 'tenant_backbone.lead_captured',
        meta: {
          lead_id: result.lead.id,
          client_id: result.lead.clientId,
          workspace_id: result.lead.workspaceId,
          relay_inbox_id: result.lead.relayInboxId,
          delivery_status: result.delivery.connectLog.status
        }
      }));
    }
    return json(result, 201);
  }

  if (route === '/tenant-inbox' && method === 'GET') {
    const auth = await requireAuth(deps, request, env, 'tenant inbox');
    if (!auth.ok) return auth.response;
    const tenant = resolveCanonicalTenant({
      clientId: url.searchParams.get('clientId'),
      workspaceId: url.searchParams.get('workspaceId'),
      valleyBusinessId: url.searchParams.get('valleyBusinessId'),
      relayInboxId: url.searchParams.get('relayInboxId')
    });
    const events = await listEvents(env, `${RELAY_INDEX_PREFIX}${tenant.relayInboxId}:events`, url.searchParams.get('limit'));
    return json({ ok: true, tenant, events, count: events.length, storage: Boolean(storage(env)) });
  }

  if (route === '/tenant-events' && method === 'GET') {
    const auth = await requireAuth(deps, request, env, 'tenant event ledger');
    if (!auth.ok) return auth.response;
    const clientId = url.searchParams.get('clientId');
    const key = clientId
      ? `${TENANT_INDEX_PREFIX}${resolveCanonicalTenant({ clientId }).clientId}:events`
      : TENANT_EVENT_INDEX_KEY;
    const events = await listEvents(env, key, url.searchParams.get('limit'));
    return json({ ok: true, events, count: events.length, storage: Boolean(storage(env)) });
  }

  if ((route === '/tenant-export' || route === '/sovereign-export') && method === 'GET') {
    const auth = await requireAuth(deps, request, env, 'tenant sovereign export');
    if (!auth.ok) return auth.response;
    const tenant = resolveCanonicalTenant({
      clientId: url.searchParams.get('clientId'),
      workspaceId: url.searchParams.get('workspaceId'),
      valleyBusinessId: url.searchParams.get('valleyBusinessId'),
      relayInboxId: url.searchParams.get('relayInboxId')
    });
    const events = await listFullTenantEvents(env, `${TENANT_INDEX_PREFIX}${tenant.clientId}:events`, url.searchParams.get('limit'));
    const leads = events.map((event) => event.payload?.lead).filter(Boolean);
    return json({
      ok: true,
      schema: 'metraiyux-0s-tenant-sovereign-export-v1',
      sovereignExport: true,
      generatedAt: now(),
      tenant,
      counts: {
        events: events.length,
        leads: leads.length
      },
      citadel: {
        mirrorLedger: '/api/citadel/ledger',
        catchupQueue: '/api/citadel/catchup-queue',
        mode: 'primary_storage_to_citadel_mirror_until_cutover'
      },
      events,
      leads,
      storage: Boolean(storage(env))
    });
  }

  if ((route === '/skye-docx-max/share' || route === '/docx/share') && method === 'POST') {
    const auth = await requireAuth(deps, request, env, 'SkyeDocxMax shared persistence');
    if (!auth.ok) return auth.response;
    const result = await createSkyeDocxShare(env, await readBody(request));
    return json(result, 201);
  }

  if (route === '/content-packages' && method === 'POST') {
    const auth = await requireAuth(deps, request, env, 'Content Engine package persistence');
    if (!auth.ok) return auth.response;
    const result = await createContentPackage(env, await readBody(request));
    return json(result, 201);
  }

  if (route === '/media/reuse' && method === 'POST') {
    const auth = await requireAuth(deps, request, env, 'SkyeMediaCenter reuse package');
    if (!auth.ok) return auth.response;
    const result = await createMediaReusePackage(env, await readBody(request));
    return json(result, 201);
  }

  return json({ ok: false, error: 'tenant_backbone_route_not_found', path: url.pathname }, 404);
}
