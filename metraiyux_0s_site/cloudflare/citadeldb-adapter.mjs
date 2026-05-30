const BASE = '/api/citadel';
const LEDGER_INDEX_KEY = 'citadel:v1:ledger:index';
const EVENT_PREFIX = 'citadel:v1:ledger:event:';
const JOB_INDEX_KEY = 'citadel:v1:jobs:index';
const JOB_PREFIX = 'citadel:v1:jobs:';
const MAX_INDEX = 500;
const D1_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS citadel_mirror_events (
    id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT,
    app_id TEXT,
    workspace_id TEXT,
    table_name TEXT,
    record_id TEXT,
    operation TEXT,
    primary_ok INTEGER DEFAULT 0,
    neon_ok INTEGER DEFAULT 0,
    citadel_ok INTEGER DEFAULT 0,
    checksum TEXT,
    created_at TEXT NOT NULL,
    mirrored_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_citadel_mirror_events_created_at ON citadel_mirror_events(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_citadel_mirror_events_status ON citadel_mirror_events(status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_citadel_mirror_events_app_table ON citadel_mirror_events(app_id, table_name, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS citadel_rows (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    workspace_id TEXT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    source TEXT,
    checksum TEXT,
    payload_ref TEXT,
    payload_json TEXT,
    event_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_citadel_rows_identity ON citadel_rows(app_id, table_name, record_id)`,
  `CREATE INDEX IF NOT EXISTS idx_citadel_rows_updated_at ON citadel_rows(updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS citadel_catchup_jobs (
    id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL,
    mode TEXT,
    app_id TEXT,
    table_name TEXT,
    dry_run INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_citadel_catchup_jobs_created_at ON citadel_catchup_jobs(created_at DESC)`
];
const d1SchemaReady = new WeakSet();

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session'
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

function d1(env) {
  return env.CITADELDB || env.CITADELDB_D1 || env.METRAIYUX_CITADELDB || null;
}

function isD1Database(value) {
  return Boolean(value && typeof value.prepare === 'function');
}

function safeParseJson(raw, fallback = null) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

function toPayloadJson(value, max = 220000) {
  if (value == null) return '';
  const serialized = JSON.stringify(value);
  return serialized.length > max ? serialized.slice(0, max) : serialized;
}

function boolInt(value) {
  return value ? 1 : 0;
}

function storageInfo(env) {
  const hasD1 = isD1Database(d1(env));
  const hasKv = Boolean(kv(env));
  return {
    primary: hasD1 ? 'cloudflare_d1' : (hasKv ? 'cloudflare_kv_receipt_mirror' : 'unconfigured'),
    citadelDatabase: hasD1,
    d1Binding: hasD1 ? 'CITADELDB' : '',
    d1DatabaseName: hasD1 ? text(env.CITADELDB_D1_NAME || 'metraiyux-citadeldb', 120) : '',
    kvReceiptMirror: hasKv,
    localDatabaseRunning: false,
    neonSyncSourceAllowed: true,
    productionHost: 'cloudflare'
  };
}

async function getJson(store, key, fallback) {
  if (!store) return fallback;
  const raw = await store.get(key);
  return safeParseJson(raw, fallback);
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

async function ensureD1Schema(db) {
  if (!isD1Database(db)) return false;
  if (d1SchemaReady.has(db)) return true;
  for (const statement of D1_SCHEMA) await db.prepare(statement).run();
  d1SchemaReady.add(db);
  return true;
}

function bind(statement, values = []) {
  return values.length ? statement.bind(...values) : statement;
}

async function d1Run(db, sql, values = []) {
  return bind(db.prepare(sql), values).run();
}

async function d1All(db, sql, values = []) {
  const result = await bind(db.prepare(sql), values).all();
  return Array.isArray(result?.results) ? result.results : [];
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

async function readD1Events(env, limit = MAX_INDEX) {
  const db = d1(env);
  if (!isD1Database(db)) return [];
  await ensureD1Schema(db);
  const rows = await d1All(db, 'SELECT payload_json FROM citadel_mirror_events ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map((row) => safeParseJson(row.payload_json, null)).filter(Boolean);
}

async function readD1Jobs(env, limit = MAX_INDEX) {
  const db = d1(env);
  if (!isD1Database(db)) return [];
  await ensureD1Schema(db);
  const rows = await d1All(db, 'SELECT payload_json FROM citadel_catchup_jobs ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map((row) => safeParseJson(row.payload_json, null)).filter(Boolean);
}

export async function readD1Rows(env, filters = {}) {
  const db = d1(env);
  if (!isD1Database(db)) return { ok: false, configured: false, rows: [] };
  await ensureD1Schema(db);
  const where = [];
  const values = [];
  const appId = text(filters.appId || filters.app_id || '', 160);
  const workspaceId = text(filters.workspaceId || filters.workspace_id || '', 180);
  const table = text(filters.table || filters.tableName || '', 180);
  const recordId = text(filters.recordId || filters.record_id || '', 240);
  if (appId) {
    where.push('app_id = ?');
    values.push(appId);
  }
  if (workspaceId) {
    where.push('workspace_id = ?');
    values.push(workspaceId);
  }
  if (table) {
    where.push('table_name = ?');
    values.push(table);
  }
  if (recordId) {
    where.push('record_id = ?');
    values.push(recordId);
  }
  const limit = clampNumber(filters.limit, 50, 1, 100);
  values.push(limit);
  const rows = await d1All(db, `SELECT
    id, app_id, workspace_id, table_name, record_id, operation, source, checksum,
    payload_ref, payload_json, event_id, created_at, updated_at
  FROM citadel_rows${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
  ORDER BY updated_at DESC LIMIT ?`, values);
  return {
    ok: true,
    configured: true,
    rows: rows.map((row) => ({
      id: row.id,
      appId: row.app_id,
      workspaceId: row.workspace_id || '',
      table: row.table_name,
      recordId: row.record_id,
      operation: row.operation,
      source: row.source || '',
      checksum: row.checksum || '',
      payloadRef: row.payload_ref || '',
      payload: safeParseJson(row.payload_json, null),
      eventId: row.event_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  };
}

async function putD1Event(env, event) {
  const db = d1(env);
  if (!isD1Database(db)) return false;
  await ensureD1Schema(db);
  await d1Run(db, `INSERT OR REPLACE INTO citadel_mirror_events (
    id, payload_json, status, source, app_id, workspace_id, table_name, record_id, operation,
    primary_ok, neon_ok, citadel_ok, checksum, created_at, mirrored_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    event.id,
    JSON.stringify(event),
    event.status,
    event.source,
    event.appId,
    event.workspaceId,
    event.table,
    event.recordId,
    event.operation,
    boolInt(event.primary?.ok),
    boolInt(event.neon?.ok),
    boolInt(event.citadel?.ok),
    event.checksum,
    event.createdAt,
    event.mirroredAt || ''
  ]);
  return true;
}

async function putD1Job(env, job) {
  const db = d1(env);
  if (!isD1Database(db)) return false;
  await ensureD1Schema(db);
  await d1Run(db, `INSERT OR REPLACE INTO citadel_catchup_jobs (
    id, payload_json, status, mode, app_id, table_name, dry_run, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    job.id,
    JSON.stringify(job),
    job.status,
    job.mode,
    job.appId,
    job.table,
    boolInt(job.dryRun),
    job.createdAt
  ]);
  return true;
}

async function resolveMirrorPayload(env, body = {}) {
  const direct = body.payload || body.row || body.record || null;
  if (direct && typeof direct === 'object') return { source: 'request_payload', value: direct };
  if (body.item && typeof body.item === 'object') return { source: 'request_item', value: body.item };
  if (body.base && typeof body.base === 'object') return { source: 'request_base', value: body.base };

  const payloadRef = text(body.payloadRef || body.payload_ref || '', 500);
  const store = kv(env);
  if (!payloadRef || !store) return null;
  try {
    const raw = await store.get(payloadRef);
    if (!raw) return null;
    return { source: 'kv_payload_ref', value: safeParseJson(raw, { raw: text(raw, 12000) }) };
  } catch {
    return null;
  }
}

function rowIdForEvent(event) {
  return text(`citadel_row:${event.appId || 'unknown'}:${event.table || 'unknown'}:${event.recordId || event.id}`, 420);
}

async function mirrorRowToD1(env, event, payload) {
  const db = d1(env);
  if (!isD1Database(db)) return { ok: false, configured: false };
  await ensureD1Schema(db);
  const rowId = rowIdForEvent(event);
  await d1Run(db, `INSERT INTO citadel_rows (
    id, app_id, workspace_id, table_name, record_id, operation, source, checksum,
    payload_ref, payload_json, event_id, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    workspace_id = excluded.workspace_id,
    operation = excluded.operation,
    source = excluded.source,
    checksum = excluded.checksum,
    payload_ref = excluded.payload_ref,
    payload_json = excluded.payload_json,
    event_id = excluded.event_id,
    updated_at = excluded.updated_at`, [
    rowId,
    event.appId,
    event.workspaceId,
    event.table || 'unknown',
    event.recordId || event.id,
    event.operation,
    event.source,
    event.checksum,
    event.payloadRef,
    toPayloadJson(payload?.value || null),
    event.id,
    event.createdAt,
    now()
  ]);
  return { ok: true, configured: true, rowId, payloadStored: Boolean(payload), payloadSource: payload?.source || '' };
}

async function putCitadelEventStores(env, event) {
  const store = kv(env);
  const result = { d1: false, kv: false };
  try {
    result.d1 = await putD1Event(env, event);
  } catch (error) {
    result.d1Error = text(error?.message || error, 300);
  }
  if (store) {
    await putJson(store, `${EVENT_PREFIX}${event.id}`, event);
    await pushIndex(store, LEDGER_INDEX_KEY, event);
    result.kv = true;
  }
  return result;
}

async function putCitadelJobStores(env, job) {
  const store = kv(env);
  const result = { d1: false, kv: false };
  try {
    result.d1 = await putD1Job(env, job);
  } catch (error) {
    result.d1Error = text(error?.message || error, 300);
  }
  if (store) {
    await putJson(store, `${JOB_PREFIX}${job.id}`, job);
    await pushIndex(store, JOB_INDEX_KEY, job);
    result.kv = true;
  }
  return result;
}

function mergeById(items = []) {
  const byId = new Map();
  for (const item of items) {
    if (!item?.id || byId.has(item.id)) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, MAX_INDEX);
}

async function loadCitadelState(env) {
  const store = kv(env);
  const d1Events = await readD1Events(env).catch(() => []);
  const d1Jobs = await readD1Jobs(env).catch(() => []);
  const kvEvents = store ? await getJson(store, LEDGER_INDEX_KEY, []) : [];
  const kvJobs = store ? await getJson(store, JOB_INDEX_KEY, []) : [];
  return {
    ledger: mergeById([...d1Events, ...kvEvents]),
    jobs: mergeById([...d1Jobs, ...kvJobs]),
    storage: storageInfo(env)
  };
}

function configured(env, keys) {
  return keys.some((key) => Boolean(String(env[key] || '').trim()));
}

function isPrimarySource(source = '') {
  return /^(neon|both|primary|worker_kv|cloudflare_kv|site_events_kv|tenant_backbone|content_engine_kv|client_app_factory_kv|skye_media_center_kv|company_knowledge)$/i.test(String(source || ''));
}

function statusSnapshot(env, ledger = [], jobs = [], storage = storageInfo(env)) {
  const primaryWrites = ledger.filter((event) => event.primary?.ok === true || isPrimarySource(event.source));
  const neonWrites = ledger.filter((event) => event.neon?.ok === true || event.source === 'neon' || event.source === 'both');
  const workerKvWrites = ledger.filter((event) => event.primary?.system === 'cloudflare_worker_kv' || /^(worker_kv|cloudflare_kv|site_events_kv|tenant_backbone|content_engine_kv|client_app_factory_kv|skye_media_center_kv|company_knowledge)$/i.test(event.source || ''));
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
    storage,
    productionSafety: {
      localDockerCanNotAffectProductionUnlessExplicitlyConfigured: true,
      productionUsesCloudflareCitadelDatabase: storage.citadelDatabase === true,
      neonMayRemainPrimaryUntilCutoverProofPasses: true,
      noLocalhostProductionWrites: true
    },
    configured: {
      cloudflareCitadelDatabase: storage.citadelDatabase === true,
      d1Binding: storage.d1Binding,
      neonPrimary: configured(env, ['NEON_DATABASE_URL', 'DATABASE_URL', 'NETLIFY_DATABASE_URL', 'PHC_NEON_DATABASE_URL']),
      citadelGateway: configured(env, ['CITADELDB_GATEWAY_URL', 'CITADELDB_API_URL', 'SKYGATEFS27_ORIGIN', 'SKYGATEFS27_WORKER_ORIGIN']),
      skyeMailPlanned: configured(env, ['SKYEMAIL_PLATFORM_URL', 'SKYEMAIL_WORKER_ORIGIN', 'SKYEMAIL_DATABASE_URL'])
    },
    mirrorMode: 'neon_or_primary_storage_to_citadeldb_cloudflare_database_until_cutover',
    parityTarget: 'CitadelDB receives D1 mirror rows and receipts now; Neon stays a removable sync source until app DATABASE_URL cutover proof passes.',
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

function citadelRuntimeMatrix(env) {
  const storage = storageInfo(env);
  return {
    ok: true,
    service: 'citadeldb-runtime-matrix',
    publicProduct: 'CitadelDB',
    publicLanes: {
      edge: 'CitadelDB Edge',
      postgres: 'CitadelDB Sovereign Postgres'
    },
    namingRule: 'Customer-facing copy says CitadelDB. Provider primitives stay in internal operator proof and cost ledgers.',
    edgeNative: {
      feasible: true,
      releaseLane: true,
      privateServerRequired: false,
      currentDatabase: storage.citadelDatabase ? 'CitadelDB Cloudflare D1' : 'pending Cloudflare D1 binding',
      capabilities: [
        'tenant ledgers',
        'mirror receipts',
        'catch-up queues',
        'app onboarding registry',
        'proof dashboards',
        'edge SQL workloads that fit SQLite semantics'
      ],
      implementationNotes: [
        'D1 for relational CitadelDB ledgers and generic mirrored rows',
        'KV remains a receipt mirror/fallback, not the primary CitadelDB database',
        'Durable Objects SQLite can be added for stateful per-tenant locks and live coordination',
        'R2 for backups, exports, snapshots, and receipts',
        'Queues/Workflows for catch-up and migration jobs',
        'Hyperdrive bridge when an external Postgres engine remains configured'
      ]
    },
    postgresEngine: {
      privateServerRequiredForOwnedEngine: false,
      managedPostgresFallbackAllowed: true,
      note: 'Only raw Postgres wire protocol, WAL/PITR, or existing Postgres-client compatibility needs a Postgres-compatible engine. CitadelDB Edge itself is live on Cloudflare database primitives.',
      capabilitiesThatNeedPostgresEngine: [
        'Postgres wire protocol',
        'WAL archiving',
        'PITR beyond edge object windows',
        'replicas',
        'Kubernetes HA Postgres',
        'raw compatibility with existing Postgres clients'
      ]
    },
    configured: {
      edgeLedgerStorage: storage.citadelDatabase || storage.kvReceiptMirror,
      cloudflareCitadelDatabase: storage.citadelDatabase,
      kvReceiptMirror: storage.kvReceiptMirror,
      postgresPrimary: configured(env, ['NEON_DATABASE_URL', 'DATABASE_URL', 'NETLIFY_DATABASE_URL', 'PHC_NEON_DATABASE_URL']),
      citadelGateway: configured(env, ['CITADELDB_GATEWAY_URL', 'CITADELDB_API_URL', 'SKYGATEFS27_ORIGIN', 'SKYGATEFS27_WORKER_ORIGIN'])
    }
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
    schema: 'metraiyux-0s-citadeldb-ledger-v2-cloudflare-d1',
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
      writtenAt: text(body.citadel?.writtenAt || body.citadelWrittenAt || '', 80),
      storage: text(body.citadel?.storage || '', 80)
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
    schema: 'metraiyux-0s-citadeldb-job-v2-cloudflare-d1',
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
      system: 'cloudflare_d1',
      valueRedacted: true
    },
    runbook: [
      'Read new rows from Neon or the current primary source using the app/table filter.',
      'Upsert them into CitadelDB Cloudflare D1 with app-scoped metadata.',
      'Verify counts and checksums.',
      'Mark the matching 0S ledger events as mirrored_to_citadel.',
      'Only cut over DATABASE_URL after write smoke, export, restore, and rollback proof pass.'
    ],
    actor,
    createdAt: now()
  };
}

export async function recordCitadelMirrorEvent(env, body = {}, actor = 'metraiyux-0s-system') {
  if (!isD1Database(d1(env)) && !kv(env)) {
    return { ok: false, stored: false, error: 'CitadelDB Cloudflare database storage is not configured.' };
  }

  const event = normalizeWriteEvent(body, actor);
  const payload = await resolveMirrorPayload(env, body);
  const rowMirror = await mirrorRowToD1(env, event, payload).catch((error) => ({
    ok: false,
    configured: true,
    error: text(error?.message || error, 300)
  }));

  event.payloadMirror = {
    storage: rowMirror.ok ? 'cloudflare_d1' : '',
    rowId: rowMirror.rowId || '',
    payloadStored: rowMirror.payloadStored === true,
    payloadSource: rowMirror.payloadSource || '',
    error: rowMirror.error || ''
  };

  if (rowMirror.ok && rowMirror.payloadStored) {
    event.status = 'mirrored_to_citadel';
    event.citadel = {
      ...(event.citadel || {}),
      ok: true,
      receiptId: `citadeldb-d1:${event.id}`,
      writtenAt: now(),
      storage: 'cloudflare_d1'
    };
    event.mirroredAt = event.citadel.writtenAt;
  }

  const stores = await putCitadelEventStores(env, event);
  if (!stores.d1 && !stores.kv) {
    return { ok: false, stored: false, error: stores.d1Error || 'CitadelDB write failed.' };
  }
  return {
    ok: true,
    stored: true,
    event,
    storage: stores,
    rowMirror,
    catchupRequired: event.status === 'needs_citadel_catchup'
  };
}

async function requireGate(request, env, deps, label) {
  if (!deps?.requireGateAuth) return { ok: false, response: json({ ok: false, error: 'Gate auth helper is not mounted.' }, 500) };
  return deps.requireGateAuth(request, env, label);
}

async function requireOperator(request, env, deps, label) {
  if (deps?.requireOperatorAuth) return deps.requireOperatorAuth(request, env, label);
  return requireGate(request, env, deps, label);
}

function slug(value, fallback = 'workspace') {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return cleaned || fallback;
}

function devName(value, fallback, max = 160) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, max);
  return cleaned || fallback;
}

function devAuthScopes(auth = {}) {
  const identity = auth.identity || {};
  const gateData = auth.gate?.data || auth.gate || {};
  return [
    ...(Array.isArray(auth.scopes) ? auth.scopes : []),
    ...(Array.isArray(identity.scopes) ? identity.scopes : []),
    ...String(identity.scope || gateData.scope || gateData.scopes || gateData.user?.scope || '')
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  ];
}

function isOperatorAuth(auth = {}) {
  const role = String(auth.role || auth.identity?.role || auth.gate?.data?.role || auth.gate?.data?.user?.role || '').toLowerCase();
  const scopes = new Set(devAuthScopes(auth).map((item) => item.toLowerCase()));
  return auth.via === '0s-free99-admin-code'
    || auth.identity?.isAdmin === true
    || ['owner', 'founder', 'admin', 'operator', 'deployer'].includes(role)
    || scopes.has('admin.read')
    || scopes.has('admin.write')
    || scopes.has('citadeldb.admin')
    || scopes.has('citadeldb.write_all');
}

function developerScopeFromAuth(auth = {}) {
  const identity = auth.identity || {};
  const gateData = auth.gate?.data || {};
  const email = text(identity.email || gateData.email || gateData.username || gateData.user?.email || auth.actor || '', 180);
  const subject = text(identity.subject || identity.id || gateData.sub || gateData.id || gateData.user?.id || email || '0s-user', 180);
  const workspace = text(
    identity.workspace
      || identity.workspaceId
      || identity.workspace_id
      || gateData.workspace
      || gateData.workspaceId
      || gateData.workspace_id
      || gateData.workspace?.id
      || gateData.user?.workspace
      || gateData.user?.workspaceId
      || gateData.user?.workspace_id
      || '',
    180
  );
  const workspaceId = workspace || `0s-${slug(email || subject, 'user')}`;
  const role = text(auth.role || identity.role || gateData.role || gateData.user?.role || 'member', 80);
  const operator = isOperatorAuth(auth);
  return {
    actor: text(auth.actor || email || subject || '0s-gate-user', 180),
    subject,
    email,
    role,
    workspaceId,
    workspaceSlug: slug(workspaceId, 'workspace'),
    operator,
    scopes: [...new Set(devAuthScopes(auth))].slice(0, 20),
    allowedOperations: operator
      ? ['connection', 'insert_row', 'query_rows', 'safe_select_sql', 'workspace_override']
      : ['connection', 'insert_row', 'query_rows', 'safe_select_sql'],
    tenantBoundary: operator ? 'operator_can_filter_or_override_workspace' : 'bound_to_0s_gate_workspace'
  };
}

function ensureWorkspaceAccess(scope, requestedWorkspaceId = '') {
  const workspaceId = text(requestedWorkspaceId || scope.workspaceId || '', 180);
  if (scope.operator) return { ok: true, workspaceId: workspaceId || scope.workspaceId };
  if (!workspaceId || workspaceId === scope.workspaceId) return { ok: true, workspaceId: scope.workspaceId };
  return { ok: false, response: json({
    ok: false,
    error: 'citadeldb_workspace_scope_denied',
    message: 'This 0S account can only use its own CitadelDB workspace unless an owner/operator session is presented.',
    scope: {
      workspaceId: scope.workspaceId,
      operator: false
    }
  }, 403) };
}

function normalizeDevRowBody(body = {}, scope) {
  const workspaceAccess = ensureWorkspaceAccess(scope, body.workspaceId || body.workspace_id || '');
  if (!workspaceAccess.ok) return workspaceAccess;
  const payload = body.payload || body.row || body.record || body.item || {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, response: json({ ok: false, error: 'payload_object_required' }, 400) };
  }
  const appId = devName(body.appId || body.app_id || body.app || 'developer-app', 'developer-app');
  const table = devName(body.table || body.tableName || body.collection || 'records', 'records', 180);
  const recordId = devName(
    body.recordId || body.record_id || body.primaryKey || payload.id || payload.recordId || id('devrow'),
    id('devrow'),
    240
  );
  const operation = devName(body.operation || body.op || 'upsert', 'upsert', 60).toLowerCase();
  return {
    ok: true,
    row: {
      source: 'citadeldb_dev_http',
      appId,
      workspaceId: workspaceAccess.workspaceId,
      table,
      recordId,
      operation,
      payload,
      primary: {
        ok: true,
        system: '0s_citadeldb_developer_http_api',
        receiptId: text(body.primaryReceiptId || body.receiptId || '', 180),
        writtenAt: now()
      },
      citadel: {
        ok: true,
        storage: 'cloudflare_d1',
        writtenAt: now()
      },
      checksum: text(body.checksum || body.rowChecksum || '', 256),
      note: text(body.note || 'CitadelDB developer HTTP database URL write', 500)
    }
  };
}

function normalizeDevQueryBody(body = {}, scope) {
  const workspaceAccess = ensureWorkspaceAccess(scope, body.workspaceId || body.workspace_id || '');
  if (!workspaceAccess.ok) return workspaceAccess;
  return {
    ok: true,
    filters: {
      appId: text(body.appId || body.app_id || body.app || '', 160),
      workspaceId: workspaceAccess.workspaceId,
      table: text(body.table || body.tableName || body.collection || '', 180),
      recordId: text(body.recordId || body.record_id || body.primaryKey || '', 240),
      limit: clampNumber(body.limit, 50, 1, 100)
    }
  };
}

function developerConnectionPayload(request, url, scope, storage) {
  const baseUrl = `${url.origin}${BASE}/dev`;
  const envBlock = [
    `CITADELDB_DATABASE_URL=${baseUrl}`,
    'CITADELDB_AUTH="Bearer <0S_GATE_SESSION>"'
  ];
  return {
    ok: true,
    service: 'citadeldb',
    product: 'CitadelDB Developer Access',
    mode: 'skynet-citadeldb-http-database-url',
    gateOwned: true,
    databaseUrl: baseUrl,
    endpoints: {
      insertRow: `${baseUrl}/rows`,
      queryRows: `${baseUrl}/query`,
      safeSql: `${baseUrl}/sql`
    },
    env: envBlock,
    bash: {
      status: `curl -s "$CITADELDB_DATABASE_URL/connection" -H "Authorization: $CITADELDB_AUTH"`,
      insert: `curl -s -X POST "$CITADELDB_DATABASE_URL/rows" -H "Authorization: $CITADELDB_AUTH" -H "content-type: application/json" --data '{"appId":"my-app","table":"profiles","recordId":"user_1","payload":{"id":"user_1","name":"Skye User"}}'`,
      query: `curl -s -X POST "$CITADELDB_DATABASE_URL/query" -H "Authorization: $CITADELDB_AUTH" -H "content-type: application/json" --data '{"appId":"my-app","table":"profiles","limit":25}'`,
      safeSelect: `curl -s -X POST "$CITADELDB_DATABASE_URL/sql" -H "Authorization: $CITADELDB_AUTH" -H "content-type: application/json" --data '{"sql":"select * from citadel_rows","appId":"my-app","table":"profiles","limit":25}'`
    },
    scope,
    storage,
    protocolBoundary: {
      accepts: ['HTTPS JSON writes', 'structured row queries', 'safe SELECT compatibility'],
      doesNotExpose: ['raw TCP Postgres wire protocol', 'arbitrary SQL mutation', 'cross-tenant reads without owner/operator scope'],
      note: 'Apps can paste CITADELDB_DATABASE_URL into their stack as an HTTP database URL today. Raw Postgres-compatible URLs remain a separate CitadelDB Sovereign engine lane.'
    },
    requestHost: text(request.headers.get('host') || url.host, 180)
  };
}

function safeDevSqlPlan(body = {}, scope) {
  const sql = String(body.sql || '').trim();
  if (!sql) return { ok: false, response: json({ ok: false, error: 'sql_required' }, 400) };
  const compact = sql.replace(/\s+/g, ' ').trim();
  const lowered = compact.toLowerCase();
  const forbidden = /(?:;|--|\/\*|\*\/|\b(?:insert|update|delete|drop|alter|create|replace|pragma|attach|detach|vacuum|reindex|grant|revoke|truncate|merge)\b)/i;
  if (!/^select\b/i.test(compact) || forbidden.test(compact)) {
    return { ok: false, response: json({
      ok: false,
      error: 'citadeldb_safe_select_only',
      message: 'CitadelDB dev SQL accepts safe SELECT adapters only. Use /dev/rows for writes.'
    }, 400) };
  }
  const tableMatch = lowered.match(/\bfrom\s+([a-z_][a-z0-9_]*)\b/i);
  const sourceTable = tableMatch?.[1] || 'citadel_rows';
  if (!['citadel_rows', 'citadel_mirror_events'].includes(sourceTable)) {
    return { ok: false, response: json({ ok: false, error: 'citadeldb_sql_table_not_allowed', allowedTables: ['citadel_rows', 'citadel_mirror_events'] }, 400) };
  }
  if (sourceTable === 'citadel_mirror_events' && !scope.operator) {
    return { ok: false, response: json({ ok: false, error: 'citadeldb_operator_scope_required_for_mirror_events' }, 403) };
  }
  const workspaceAccess = ensureWorkspaceAccess(scope, body.workspaceId || body.workspace_id || '');
  if (!workspaceAccess.ok) return workspaceAccess;
  return {
    ok: true,
    plan: {
      sqlCompatibility: 'safe_select_adapter',
      table: sourceTable,
      filters: {
        appId: text(body.appId || body.app_id || '', 160),
        workspaceId: workspaceAccess.workspaceId,
        table: text(body.table || body.tableName || '', 180),
        recordId: text(body.recordId || body.record_id || '', 240),
        limit: clampNumber(body.limit, 50, 1, 100)
      }
    }
  };
}

async function readD1MirrorEvents(env, filters = {}) {
  const db = d1(env);
  if (!isD1Database(db)) return { ok: false, configured: false, events: [] };
  await ensureD1Schema(db);
  const where = [];
  const values = [];
  const appId = text(filters.appId || filters.app_id || '', 160);
  const workspaceId = text(filters.workspaceId || filters.workspace_id || '', 180);
  const table = text(filters.table || filters.tableName || '', 180);
  const recordId = text(filters.recordId || filters.record_id || '', 240);
  if (appId) {
    where.push('app_id = ?');
    values.push(appId);
  }
  if (workspaceId) {
    where.push('workspace_id = ?');
    values.push(workspaceId);
  }
  if (table) {
    where.push('table_name = ?');
    values.push(table);
  }
  if (recordId) {
    where.push('record_id = ?');
    values.push(recordId);
  }
  values.push(clampNumber(filters.limit, 50, 1, 100));
  const rows = await d1All(db, `SELECT payload_json FROM citadel_mirror_events${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`, values);
  return { ok: true, configured: true, events: rows.map((row) => safeParseJson(row.payload_json, null)).filter(Boolean) };
}

export async function handleCitadelDbRoute(request, env, ctx, url, deps = {}) {
  if (!url.pathname.startsWith(BASE)) return null;
  if (request.method === 'OPTIONS') return json({ ok: true });

  const route = url.pathname.slice(BASE.length) || '/';
  const state = await loadCitadelState(env);
  const { ledger, jobs, storage } = state;

  if ((route === '/' || route === '/health') && request.method === 'GET') {
    return json({
      ok: true,
      service: 'citadeldb',
      mountedInZeroOs: true,
      gateOwned: true,
      storage,
      productionSafety: statusSnapshot(env, ledger, jobs, storage).productionSafety
    });
  }

  if ((route === '/dev' || route === '/dev/' || route === '/dev/connection' || route === '/dev/status') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB developer database URL');
    if (!auth.ok) return auth.response;
    return json(developerConnectionPayload(request, url, developerScopeFromAuth(auth), storage));
  }

  if ((route === '/dev/rows' || route === '/dev/row') && request.method === 'POST') {
    const auth = await requireGate(request, env, deps, 'CitadelDB developer row write');
    if (!auth.ok) return auth.response;
    if (!storage.citadelDatabase) return json({ ok: false, error: 'CitadelDB database storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const scope = developerScopeFromAuth(auth);
    const normalized = normalizeDevRowBody(body, scope);
    if (!normalized.ok) return normalized.response;
    const recorded = await recordCitadelMirrorEvent(env, normalized.row, scope.actor || 'citadeldb-dev-user');
    if (!recorded.ok) return json({ ok: false, error: recorded.error }, 503);
    if (ctx?.waitUntil && deps?.mirrorSkygateEvent) {
      ctx.waitUntil(deps.mirrorSkygateEvent(env, {
        type: 'citadeldb.dev_row_write',
        meta: {
          id: recorded.event.id,
          app_id: recorded.event.appId,
          workspace_id: recorded.event.workspaceId,
          table: recorded.event.table,
          record_id: recorded.event.recordId,
          status: recorded.event.status
        }
      }, auth.gate || auth));
    }
    return json({
      ok: true,
      event: recorded.event,
      rowMirror: recorded.rowMirror,
      storage: recorded.storage,
      scope: {
        workspaceId: scope.workspaceId,
        operator: scope.operator
      }
    }, 201);
  }

  if (route === '/dev/query' && request.method === 'POST') {
    const auth = await requireGate(request, env, deps, 'CitadelDB developer row query');
    if (!auth.ok) return auth.response;
    if (!storage.citadelDatabase) return json({ ok: false, error: 'CitadelDB database storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const scope = developerScopeFromAuth(auth);
    const normalized = normalizeDevQueryBody(body, scope);
    if (!normalized.ok) return normalized.response;
    const rows = await readD1Rows(env, normalized.filters);
    if (!rows.ok) return json({ ok: false, error: 'CitadelDB row storage is not configured.' }, 503);
    return json({
      ok: true,
      rows: rows.rows,
      count: rows.rows.length,
      filters: normalized.filters,
      scope: {
        workspaceId: scope.workspaceId,
        operator: scope.operator
      }
    });
  }

  if (route === '/dev/sql' && request.method === 'POST') {
    const auth = await requireGate(request, env, deps, 'CitadelDB developer safe SQL');
    if (!auth.ok) return auth.response;
    if (!storage.citadelDatabase) return json({ ok: false, error: 'CitadelDB database storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const scope = developerScopeFromAuth(auth);
    const planned = safeDevSqlPlan(body, scope);
    if (!planned.ok) return planned.response;
    if (planned.plan.table === 'citadel_mirror_events') {
      const events = await readD1MirrorEvents(env, planned.plan.filters);
      if (!events.ok) return json({ ok: false, error: 'CitadelDB mirror storage is not configured.' }, 503);
      return json({
        ok: true,
        sqlCompatibility: planned.plan.sqlCompatibility,
        rows: events.events,
        count: events.events.length,
        plan: planned.plan
      });
    }
    const rows = await readD1Rows(env, planned.plan.filters);
    if (!rows.ok) return json({ ok: false, error: 'CitadelDB row storage is not configured.' }, 503);
    return json({
      ok: true,
      sqlCompatibility: planned.plan.sqlCompatibility,
      rows: rows.rows,
      count: rows.rows.length,
      plan: planned.plan
    });
  }

  if ((route === '/status' || route === '/parity') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB status');
    if (!auth.ok) return auth.response;
    return json({
      ...statusSnapshot(env, ledger, jobs, storage),
      recentEvents: ledger.slice(0, 12),
      recentJobs: jobs.slice(0, 12)
    });
  }

  if ((route === '/runtime-matrix' || route === '/edge-thesis') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB runtime matrix');
    if (!auth.ok) return auth.response;
    return json(citadelRuntimeMatrix(env));
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
    return json({ ok: true, events: filtered.slice(0, 100), count: filtered.length, storage });
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
        meta: { id: event.id, app_id: event.appId, table: event.table, status: event.status, storage: event.citadel?.storage || '' }
      }, auth.gate || auth));
    }
    return json({ ok: true, event, catchupRequired: recorded.catchupRequired, storage: recorded.storage, rowMirror: recorded.rowMirror }, 201);
  }

  if ((route === '/catchup-queue' || route === '/catchup') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'CitadelDB catch-up queue');
    if (!auth.ok) return auth.response;
    const queue = ledger.filter((event) => event.status === 'needs_citadel_catchup');
    return json({ ok: true, queue, count: queue.length, storage });
  }

  if (route === '/catchup/request' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'CitadelDB catch-up request');
    if (!auth.ok) return auth.response;
    if (!storage.citadelDatabase && !storage.kvReceiptMirror) return json({ ok: false, error: 'CitadelDB job storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const job = normalizeCatchupJob(body, auth.actor || auth.identity?.email || 'operator');
    const stores = await putCitadelJobStores(env, job);
    return json({ ok: true, job, storage: stores }, 201);
  }

  if (route === '/catchup/mark' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'CitadelDB catch-up completion');
    if (!auth.ok) return auth.response;
    if (!storage.citadelDatabase && !storage.kvReceiptMirror) return json({ ok: false, error: 'CitadelDB mirror ledger storage is not configured.' }, 503);
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map((item) => text(item, 180)).filter(Boolean) : [text(body.id, 180)].filter(Boolean);
    if (!ids.length) return json({ ok: false, error: 'event_id_required' }, 400);
    const updated = [];
    for (const event of ledger) {
      if (!ids.includes(event.id)) continue;
      const patched = {
        ...event,
        status: 'mirrored_to_citadel',
        citadel: {
          ...(event.citadel || {}),
          ok: true,
          receiptId: text(body.citadelReceiptId || body.receiptId || event.citadel?.receiptId || `citadeldb-d1:${event.id}`, 180),
          writtenAt: text(body.writtenAt || now(), 80),
          storage: text(body.storage || event.citadel?.storage || 'cloudflare_d1', 80)
        },
        mirroredAt: now(),
        mirroredBy: auth.actor || 'operator'
      };
      updated.push(patched);
      await putCitadelEventStores(env, patched);
    }
    return json({ ok: true, updated, count: updated.length });
  }

  return json({ ok: false, error: 'citadeldb_route_not_found', path: url.pathname }, 404);
}
