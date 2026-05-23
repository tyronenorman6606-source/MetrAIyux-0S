const BASE = '/api/citadel';
const LEDGER_INDEX_KEY = 'citadel:v1:ledger:index';
const EVENT_PREFIX = 'citadel:v1:ledger:event:';
const JOB_INDEX_KEY = 'citadel:v1:jobs:index';
const JOB_PREFIX = 'citadel:v1:jobs:';
const MAX_INDEX = 500;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-skye-gate-session'
    }
  });
}

function text(value, max = 1000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

function kv(env) {
  return env.CITADELDB_KV || env.SITE_EVENTS_KV || null;
}

async function getJson(store, key, fallback) {
  if (!store) return fallback;
  const raw = await store.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function putJson(store, key, value) {
  if (!store) return false;
  await store.put(key, JSON.stringify(value));
  return true;
}

async function pushIndex(store, key, item) {
  const index = await getJson(store, key, []);
  const next = [item, ...index.filter((entry) => entry.id !== item.id)].slice(0, MAX_INDEX);
  await putJson(store, key, next);
  return next;
}

function configured(env, keys) {
  return keys.some((key) => Boolean(String(env[key] || '').trim()));
}

function isPrimarySource(source = '') {
  return /^(neon|both|primary|worker_kv|cloudflare_kv|site_events_kv|tenant_backbone|content_engine_kv|client_app_factory_kv|skye_media_center_kv)$/i.test(String(source || ''));
}

function statusSnapshot(env, ledger = [], jobs = []) {
  const primaryWrites = ledger.filter((event) => event.primary?.ok === true || isPrimarySource(event.source));
  const neonWrites = ledger.filter((event) => event.neon?.ok === true || event.source === 'neon' || event.source === 'both');
  const workerKvWrites = ledger.filter((event) => event.primary?.system === 'cloudflare_worker_kv' || /^(worker_kv|cloudflare_kv|site_events_kv|tenant_backbone|content_engine_kv|client_app_factory_kv|skye_media_center_kv)$/i.test(event.source || ''));
  const citadelWrites = ledger.filter((event) => event.citadel?.ok === true || event.source === 'citadel' || event.source === 'both');
  const catchup = ledger.filter((event) => event.status === 'needs_citadel_catchup');
  const lastPrimaryWriteAt = primaryWrites[0]?.createdAt || '';
  const lastNeonWriteAt = neonWrites[0]?.createdAt || '';
  const lastCitadelWriteAt = citadelWrites[0]?.createdAt || '';
  return {
    ok: true,
    service: 'metraiyux-0s-citadeldb-control-plane',
    gateOwned: true,
    mountedInZeroOs: true,
    productionSafety: {
      localDockerCanNotAffectProductionUnlessExplicitlyConfigured: true,
      productionShouldUseRemoteCitadelGateway: true,
      neonMayRemainPrimaryUntilCutoverProofPasses: true,
      noLocalhostProductionWrites: true
    },
    configured: {
      neonPrimary: configured(env, ['NEON_DATABASE_URL', 'DATABASE_URL', 'NETLIFY_DATABASE_URL', 'PHC_NEON_DATABASE_URL']),
      citadelGateway: configured(env, ['CITADELDB_GATEWAY_URL', 'CITADELDB_API_URL', 'SKYGATEFS27_ORIGIN', 'SKYGATEFS27_WORKER_ORIGIN']),
      citadelTargetDatabase: configured(env, ['CITADEL_TARGET_DATABASE_URL', 'CITADEL_DATABASE_URL', 'CITADELDB_DATABASE_URL']),
      skyeMailPlanned: configured(env, ['SKYEMAIL_PLATFORM_URL', 'SKYEMAIL_WORKER_ORIGIN', 'SKYEMAIL_DATABASE_URL'])
    },
    mirrorMode: 'primary_storage_to_citadel_mirror_until_cutover',
    parityTarget: 'functional parity with Neon/Postgres for app onboarding, credentials, SQL console policy, migrations, backups, restore tests, dashboards, and catch-up jobs',
    counts: {
      ledgerEvents: ledger.length,
      primaryWrites: primaryWrites.length,
      neonWrites: neonWrites.length,
      workerKvWrites: workerKvWrites.length,
      citadelWrites: citadelWrites.length,
      needsCitadelCatchup: catchup.length,
      jobs: jobs.length
    },
    lastPrimaryWriteAt,
    lastNeonWriteAt,
    lastCitadelWriteAt,
    catchupRequired: catchup.length > 0 || (lastPrimaryWriteAt && (!lastCitadelWriteAt || lastPrimaryWriteAt > lastCitadelWriteAt))
  };
}

function normalizeWriteEvent(body = {}, actor = 'operator') {
  const source = text(body.source || body.writeSource || 'neon', 40).toLowerCase();
  const primaryOk = body.primary?.ok === true || isPrimarySource(source);
  const neonOk = body.neon?.ok === true || source === 'neon' || source === 'both';
  const citadelOk = body.citadel?.ok === true || source === 'citadel' || source === 'both';
  const status = citadelOk ? 'mirrored_to_citadel' : (primaryOk ? 'needs_citadel_catchup' : 'recorded_no_successful_write');
  return {
    id: text(body.id, 160) || id('citadel_evt'),
    type: 'metraiyux.citadeldb.write_mirror_event',
    schema: 'metraiyux-0s-citadeldb-ledger-v1',
    status,
    source,
    appId: text(body.appId || body.app_id || body.app || 'unknown-app', 160),
    workspaceId: text(body.workspaceId || body.workspace_id || '', 180),
    table: text(body.table || body.tableName || '', 180),
    recordId: text(body.recordId || body.record_id || body.primaryKey || '', 240),
    operation: text(body.operation || body.op || 'upsert', 60),
    primary: {
      ok: primaryOk,
      system: text(body.primary?.system || body.primarySystem || (isPrimarySource(source) ? source : ''), 120),
      receiptId: text(body.primary?.receiptId || body.primaryReceiptId || '', 300),
      writtenAt: text(body.primary?.writtenAt || body.primaryWrittenAt || '', 80)
    },
    neon: {
      ok: neonOk,
      receiptId: text(body.neon?.receiptId || body.neonReceiptId || '', 180),
      writtenAt: text(body.neon?.writtenAt || body.neonWrittenAt || '', 80)
    },
    citadel: {
      ok: citadelOk,
      receiptId: text(body.citadel?.receiptId || body.citadelReceiptId || '', 180),
      writtenAt: text(body.citadel?.writtenAt || body.citadelWrittenAt || '', 80)
    },
    checksum: text(body.checksum || body.rowChecksum || '', 256),
    payloadRef: text(body.payloadRef || body.payload_ref || '', 500),
    note: text(body.note || body.message || '', 1000),
    actor,
    createdAt: now()
  };
}

function normalizeCatchupJob(body = {}, actor = 'operator') {
  return {
    id: text(body.id, 160) || id('citadel_job'),
    type: 'metraiyux.citadeldb.catchup_job',
    schema: 'metraiyux-0s-citadeldb-job-v1',
    status: 'queued',
    mode: text(body.mode || 'neon_to_citadel', 80),
    dryRun: body.dryRun !== false,
    appId: text(body.appId || body.app_id || '', 160),
    table: text(body.table || body.tableName || '', 180),
    since: text(body.since || body.sinceUpdatedAt || '', 80),
    limit: Math.min(Math.max(Number(body.limit || 1000), 1), 50000),
    source: {
      neonConfigured: true,
      valueRedacted: true
    },
    target: {
      citadelConfigured: true,
      valueRedacted: true
    },
    runbook: [
      'Dump or select rows from Neon using the app/table filter.',
      'Upsert into Citadel with app-owned credentials, never the Citadel admin password.',
      'Verify counts and checksums.',
      'Mark the matching 0S ledger events as mirrored_to_citadel.',
      'Only cut over DATABASE_URL after write smoke, restore test, and rollback path pass.'
    ],
    actor,
    createdAt: now()
  };
}

export async function recordCitadelMirrorEvent(env, body = {}, actor = 'metraiyux-0s-system') {
  const store = kv(env);
  if (!store) return { ok: false, stored: false, error: 'CitadelDB mirror ledger storage is not configured.' };
  const event = normalizeWriteEvent(body, actor);
  await putJson(store, `${EVENT_PREFIX}${event.id}`, event);
  await pushIndex(store, LEDGER_INDEX_KEY, event);
  return { ok: true, stored: true, event, catchupRequired: event.status === 'needs_citadel_catchup' };
}

async function requireGate(request, env, deps, label) {
  if (!deps?.requireGateAuth) return { ok: false, response: json({ ok: false, error: 'Gate auth helper is not mounted.' }, 500) };
  return deps.requireGateAuth(request, env, label);
}

async function requireOperator(request, env, deps, label) {
  if (deps?.requireOperatorAuth) return deps.requireOperatorAuth(request, env, label);
  return requireGate(request, env, deps, label);
}

export async function handleCitadelDbRoute(request, env, ctx, url, deps = {}) {
  if (!url.pathname.startsWith(BASE)) return null;
  if (request.method === 'OPTIONS') return json({ ok: true });

  const route = url.pathname.slice(BASE.length) || '/';
  const store = kv(env);
  const ledger = await getJson(store, LEDGER_INDEX_KEY, []);
  const jobs = await getJson(store, JOB_INDEX_KEY, []);

  if ((route === '/' || route === '/health') && request.method === 'GET') {
    return json({
      ok: true,
      service: 'citadeldb',
      mountedInZeroOs: true,
      gateOwned: true,
      storage: Boolean(store),
      productionSafety: statusSnapshot(env, ledger, jobs).productionSafety
    });
  }

  if ((route === '/status' || route === '/parity') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB status');
    if (!auth.ok) return auth.response;
    return json({
      ...statusSnapshot(env, ledger, jobs),
      recentEvents: ledger.slice(0, 12),
      recentJobs: jobs.slice(0, 12)
    });
  }

  if ((route === '/ledger' || route === '/mirror-events') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB mirror ledger');
    if (!auth.ok) return auth.response;
    const status = url.searchParams.get('status');
    const appId = url.searchParams.get('appId') || url.searchParams.get('app_id');
    const filtered = ledger.filter((event) => {
      if (status && event.status !== status) return false;
      if (appId && event.appId !== appId) return false;
      return true;
    });
    return json({ ok: true, events: filtered.slice(0, 100), count: filtered.length, storage: Boolean(store) });
  }

  if ((route === '/mirror-event' || route === '/dual-write-receipt') && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'CitadelDB dual-write receipt');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const recorded = await recordCitadelMirrorEvent(env, body, auth.actor || auth.identity?.email || 'operator');
    if (!recorded.ok) return json({ ok: false, error: recorded.error }, 503);
    const { event } = recorded;
    if (ctx?.waitUntil && deps?.mirrorSkygateEvent) {
      ctx.waitUntil(deps.mirrorSkygateEvent(env, {
        type: 'citadeldb.write_mirror_event',
        meta: { id: event.id, app_id: event.appId, table: event.table, status: event.status }
      }, auth.gate || auth));
    }
    return json({ ok: true, event, catchupRequired: recorded.catchupRequired }, 201);
  }

  if ((route === '/catchup-queue' || route === '/catchup') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB catch-up queue');
    if (!auth.ok) return auth.response;
    const queue = ledger.filter((event) => event.status === 'needs_citadel_catchup');
    return json({ ok: true, queue, count: queue.length, storage: Boolean(store) });
  }

  if (route === '/catchup/request' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'CitadelDB catch-up request');
    if (!auth.ok) return auth.response;
    if (!store) return json({ ok: false, error: 'CitadelDB job storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const job = normalizeCatchupJob(body, auth.actor || auth.identity?.email || 'operator');
    await putJson(store, `${JOB_PREFIX}${job.id}`, job);
    await pushIndex(store, JOB_INDEX_KEY, job);
    return json({ ok: true, job }, 201);
  }

  if (route === '/catchup/mark' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'CitadelDB catch-up completion');
    if (!auth.ok) return auth.response;
    if (!store) return json({ ok: false, error: 'CitadelDB mirror ledger storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map((item) => text(item, 180)).filter(Boolean) : [text(body.id, 180)].filter(Boolean);
    if (!ids.length) return json({ ok: false, error: 'event_id_required' }, 400);
    const updated = [];
    const index = await getJson(store, LEDGER_INDEX_KEY, []);
    const next = [];
    for (const event of index) {
      if (ids.includes(event.id)) {
        const patched = {
          ...event,
          status: 'mirrored_to_citadel',
          citadel: { ...(event.citadel || {}), ok: true, receiptId: text(body.citadelReceiptId || body.receiptId || event.citadel?.receiptId || '', 180), writtenAt: text(body.writtenAt || now(), 80) },
          mirroredAt: now(),
          mirroredBy: auth.actor || 'operator'
        };
        updated.push(patched);
        next.push(patched);
        await putJson(store, `${EVENT_PREFIX}${patched.id}`, patched);
      } else {
        next.push(event);
      }
    }
    await putJson(store, LEDGER_INDEX_KEY, next);
    return json({ ok: true, updated, count: updated.length });
  }

  return json({ ok: false, error: 'citadeldb_route_not_found', path: url.pathname }, 404);
}
