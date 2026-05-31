const MAX_TEXT = 500;
const MAX_PATH = 700;
const RUNTIME_SCHEMA = 'fs27.runtime_request.v1';
const RUNTIME_ROLLUP_SQL = `
  create table if not exists runtime_rollups_hourly (
    hour_utc text not null,
    project_id text not null,
    deployment_id text,
    runtime_type text not null,
    status_family text not null,
    request_count integer not null default 0,
    error_count integer not null default 0,
    total_duration_ms integer not null default 0,
    total_bytes_out integer not null default 0,
    updated_at text not null,
    primary key (hour_utc, project_id, deployment_id, runtime_type, status_family)
  );
`;

function cleanText(value, max = MAX_TEXT) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function safeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix = 'req') {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id}`;
}

function statusFamily(status) {
  const code = Number(status || 0);
  if (!Number.isFinite(code) || code < 100) return '0xx';
  return `${Math.floor(code / 100)}xx`;
}

function userAgentFamily(value) {
  const ua = String(value || '').toLowerCase();
  if (!ua) return '';
  if (ua.includes('googlebot')) return 'googlebot';
  if (ua.includes('bingbot')) return 'bingbot';
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome/') || ua.includes('crios/')) return 'chrome';
  if (ua.includes('firefox/') || ua.includes('fxios/')) return 'firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari';
  if (ua.includes('curl/')) return 'curl';
  if (ua.includes('python-requests')) return 'python-requests';
  return 'other';
}

function refererHost(request) {
  const raw = request.headers.get('referer') || request.headers.get('referrer') || '';
  if (!raw) return '';
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

function presentedGateSignal(request) {
  const cookie = request.headers.get('cookie') || '';
  if (request.headers.get('authorization')) return 'bearer-present';
  if (request.headers.get('x-skye-gate-session') || request.headers.get('x-skygate-session') || request.headers.get('x-0s-gate-session')) return 'gate-header-present';
  if (/skye_gate_session|skygate_session|skyegate_session|metraiyux_admin_session/i.test(cookie)) return 'gate-cookie-present';
  return '';
}

function headerNumber(response, name) {
  const raw = response?.headers?.get?.(name);
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function analyticsDataset(env) {
  return env.REQUEST_ANALYTICS || env.FS27_REQUEST_ANALYTICS || null;
}

function requestQueue(env) {
  return env.REQUEST_EVENT_QUEUE || env.FS27_REQUEST_EVENT_QUEUE || null;
}

function truthy(value) {
  return /^(1|true|yes|y|on)$/i.test(String(value || '').trim());
}

function directRuntimeArchiveEnabled(env) {
  return truthy(env.RUNTIME_DIRECT_ARCHIVE || env.FS27_RUNTIME_DIRECT_ARCHIVE || '');
}

function directRuntimeArchiveMode(env) {
  const mode = cleanText(env.RUNTIME_DIRECT_ARCHIVE || env.FS27_RUNTIME_DIRECT_ARCHIVE || '', 20).toLowerCase();
  return mode === 'sync' ? 'sync' : directRuntimeArchiveEnabled(env) ? 'async' : '';
}

function routeKv(env) {
  return env.ROUTING_KV || env.FS27_ROUTING_KV || null;
}

function normalizeMountPath(value) {
  const raw = cleanText(value || '', 300)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  if (!raw || raw === '/') return '';
  const parts = raw.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean);
  if (!parts.length) return '';
  return `/${parts.map((part) => {
    let decoded = part;
    try { decoded = decodeURIComponent(part); } catch {}
    return encodeURIComponent(decoded);
  }).join('/')}`;
}

function normalizeLegacyMountPath(value) {
  const raw = cleanText(value || '', 300)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  if (!raw || raw === '/') return '';
  return `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHostname(value) {
  const raw = cleanText(value || '', 260).toLowerCase();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname.toLowerCase();
  } catch {}
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\*\./, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function hostCandidates(request, env) {
  const url = new URL(request.url);
  const candidates = [
    normalizeHostname(url.hostname),
    normalizeHostname(request.headers.get('x-forwarded-host') || ''),
    normalizeHostname(request.headers.get('x-0s-original-host') || ''),
    normalizeHostname(request.headers.get('x-skynet-public-host') || ''),
    normalizeHostname(env?.SKYENET_DEFAULT_HOST || env?.SKYENET_EDGE_HOST || env?.SKYENET_PUBLIC_HOST || '')
  ];
  if (candidates.includes('skyegatefs27.internal') || request.headers.get('x-0s-skynet-surface-proxy')) {
    candidates.push('skyegatefs27.internal');
  }
  return [...new Set(candidates.filter(Boolean))];
}

function pushPathRouteKeys(keys, seen, host, cleanPath) {
  const path = cleanPath || '/';
  const segments = path.split('/').filter(Boolean);
  for (let index = segments.length; index >= 1; index -= 1) {
    const mountPath = `/${segments.slice(0, index).join('/')}`;
    const key = `route:v1:host:${host}:path:${mountPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push({ key, mountPath });
  }
}

function pathRouteKeys(host, pathname) {
  const cleanPath = normalizeMountPath(pathname) || '/';
  const keys = [];
  const seen = new Set();
  pushPathRouteKeys(keys, seen, host, cleanPath);
  const legacyDecodedPath = normalizeLegacyMountPath(safeDecodeURIComponent(pathname)) || '/';
  pushPathRouteKeys(keys, seen, host, legacyDecodedPath);
  return keys;
}

async function readRouteRecord(kv, key) {
  return kv.get(key, { type: 'json' }).catch(async () => {
    const raw = await kv.get(key).catch(() => null);
    return safeJson(raw, null);
  });
}

function runtimeLogBucket(env) {
  return env.REQUEST_LOG_BUCKET || env.FS27_REQUEST_LOG_BUCKET || null;
}

function rollupDb(env) {
  return env.RUNTIME_ROLLUP_DB || env.FS27_RUNTIME_ROLLUP_DB || null;
}

export function makeRequestId(request) {
  const header = cleanText(
    request.headers.get('x-kaixu-request-id') ||
    request.headers.get('x-request-id') ||
    request.headers.get('cf-ray') ||
    '',
    180
  );
  return header || randomId('req');
}

export async function resolveGatewayRoute(request, env) {
  const kv = routeKv(env);
  if (!kv?.get) return null;
  const url = new URL(request.url);
  const hosts = hostCandidates(request, env);
  let record = null;
  let routeKeySource = '';
  let matchedMountPath = '';
  let matchedHost = hosts[0] || normalizeHostname(url.hostname);
  for (const host of hosts) {
    for (const candidate of pathRouteKeys(host, url.pathname)) {
      record = await readRouteRecord(kv, candidate.key);
      if (record && typeof record === 'object') {
        routeKeySource = candidate.key;
        matchedMountPath = candidate.mountPath;
        matchedHost = host;
        break;
      }
    }
    if (record) break;
  }
  if (!record) {
    for (const host of hosts) {
      routeKeySource = `route:v1:host:${host}`;
      record = await readRouteRecord(kv, routeKeySource);
      if (record && typeof record === 'object') {
        matchedHost = host;
        break;
      }
    }
  }
  if (!record || typeof record !== 'object') return null;
  const mountPath = normalizeMountPath(record.mount_path || record.mountPath || matchedMountPath);
  return {
    schema: cleanText(record.schema || 'fs27.route.v1', 80),
    hostname: normalizeHostname(record.hostname || matchedHost),
    route_key: cleanText(routeKeySource, 500),
    mount_path: mountPath,
    strip_mount_path: record.strip_mount_path !== false && record.stripMountPath !== false,
    customer_id: cleanText(record.customer_id || record.customerId || '', 160),
    project_id: cleanText(record.project_id || record.projectId || '', 160),
    active_deployment_id: cleanText(record.active_deployment_id || record.deployment_id || record.deploymentId || '', 180),
    public_access: record.public_access !== false,
    default_auth: cleanText(record.default_auth || record.auth || 'public', 80).toLowerCase(),
    asset_mode: cleanText(record.asset_mode || record.assetMode || '', 80).toLowerCase(),
    asset_prefix: cleanText(record.asset_prefix || record.assetPrefix || '', 700),
    function_mode: cleanText(record.function_mode || record.functionMode || '', 80).toLowerCase(),
    dispatch_name: cleanText(record.dispatch_name || record.dispatchName || '', 220),
    forward_auth: record.forward_auth === true || record.forwardAuth === true,
    fallback_origin: cleanText(record.fallback_origin || record.fallbackOrigin || '', 700),
    updated_at: cleanText(record.updated_at || record.updatedAt || '', 100)
  };
}

export function redactRuntimeEvent(event = {}) {
  const out = {
    schema: cleanText(event.schema || RUNTIME_SCHEMA, 80),
    request_id: cleanText(event.request_id || randomId('req'), 180),
    event_ts: cleanText(event.event_ts || nowIso(), 100),
    hostname: cleanText(event.hostname, 260).toLowerCase(),
    path: cleanText(event.path || '/', MAX_PATH),
    method: cleanText(event.method || 'GET', 20).toUpperCase(),
    query_shape: Array.isArray(event.query_shape)
      ? event.query_shape.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 50)
      : [],
    project_id: cleanText(event.project_id || 'unknown', 180),
    customer_id: cleanText(event.customer_id || '', 180),
    deployment_id: cleanText(event.deployment_id || '', 180),
    runtime_type: cleanText(event.runtime_type || 'unknown', 80),
    function_name: cleanText(event.function_name || '', 180),
    auth_state: cleanText(event.auth_state || 'public', 80),
    status: Math.max(0, Math.min(999, Number(event.status || 0) || 0)),
    status_family: cleanText(event.status_family || statusFamily(event.status), 20),
    duration_ms: Math.max(0, Math.round(Number(event.duration_ms || 0) || 0)),
    bytes_out: Math.max(0, Math.round(Number(event.bytes_out || 0) || 0)),
    cache_status: cleanText(event.cache_status || 'unknown', 80).toLowerCase(),
    colo: cleanText(event.colo || '', 40),
    country: cleanText(event.country || '', 10),
    user_agent_family: cleanText(event.user_agent_family || '', 80),
    referer_host: cleanText(event.referer_host || '', 260).toLowerCase(),
    ip_hash: cleanText(event.ip_hash || '', 180),
    route_decision: cleanText(event.route_decision || 'unknown', 160),
    origin_status: Number.isFinite(Number(event.origin_status)) ? Number(event.origin_status) : null,
    error_code: cleanText(event.error_code || '', 160) || null
  };
  return out;
}

export function observeGatewayRequest(env, context, event) {
  const safe = redactRuntimeEvent(event);
  try {
    analyticsDataset(env)?.writeDataPoint?.({
      blobs: [
        safe.hostname || 'unknown',
        safe.project_id || 'unknown',
        safe.deployment_id || 'none',
        safe.runtime_type || 'unknown',
        safe.method || 'GET',
        safe.status_family || '0xx',
        safe.auth_state || 'public',
        safe.cache_status || 'unknown',
        safe.route_decision || 'unknown'
      ],
      doubles: [
        safe.status || 0,
        safe.duration_ms || 0,
        safe.bytes_out || 0
      ],
      indexes: [safe.project_id || safe.hostname || 'unknown']
    });
  } catch (error) {
    console.warn('runtime analytics write failed', error?.message || error);
  }

  const queue = requestQueue(env);
  if (context?.waitUntil && directRuntimeArchiveMode(env) === 'async') {
    context.waitUntil(handleRuntimeEventQueue({ messages: [{ body: safe }] }, env, context).catch((error) => {
      console.warn('runtime direct archive failed', error?.message || error);
    }));
  } else if (context?.waitUntil && queue?.send) {
    context.waitUntil(queue.send(safe).catch((error) => {
      console.warn('runtime event queue send failed', error?.message || error);
    }));
  }
  return safe;
}

function stampRequestId(response, requestId, archiveStatus = '') {
  if (!response || !(response instanceof Response)) return response;
  if (response.webSocket) return response;
  const headers = new Headers(response.headers);
  headers.set('x-0s-request-id', requestId);
  if (archiveStatus) headers.set('x-0s-runtime-archive', archiveStatus);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function withRuntimeLedger(request, env, context, handler) {
  const started = Date.now();
  const requestId = makeRequestId(request);
  const url = new URL(request.url);
  const routeRecord = await resolveGatewayRoute(request, env);
  const runtimeMeta = {
    schema: RUNTIME_SCHEMA,
    request_id: requestId,
    hostname: url.hostname,
    path: url.pathname,
    method: request.method,
    query_shape: [...url.searchParams.keys()].slice(0, 50),
    project_id: routeRecord?.project_id || '',
    customer_id: routeRecord?.customer_id || '',
    deployment_id: routeRecord?.active_deployment_id || '',
    runtime_type: routeRecord ? 'mapped_route' : 'fs27',
    auth_state: routeRecord?.default_auth || presentedGateSignal(request) || 'public',
    route_decision: routeRecord ? 'routing_kv.record' : 'fs27.default',
    function_name: ''
  };

  let response = null;
  let caught = null;
  let archiveStatus = '';
  try {
    response = await handler({ requestId, routeRecord, runtimeMeta });
  } catch (error) {
    caught = error;
    runtimeMeta.error_code = cleanText(error?.code || error?.name || 'runtime_exception', 160);
    response = new Response('Internal error', { status: Number(error?.status || 500) || 500 });
  } finally {
    const safeEvent = observeGatewayRequest(env, context, {
      ...runtimeMeta,
      event_ts: nowIso(),
      status: response?.status || 0,
      status_family: statusFamily(response?.status || 0),
      duration_ms: Date.now() - started,
      bytes_out: headerNumber(response, 'content-length'),
      cache_status: response?.headers?.get?.('cf-cache-status') || runtimeMeta.cache_status || 'unknown',
      colo: request.cf?.colo || '',
      country: request.cf?.country || '',
      user_agent_family: userAgentFamily(request.headers.get('user-agent')),
      referer_host: refererHost(request),
      origin_status: runtimeMeta.origin_status || response?.status || 0,
      error_code: runtimeMeta.error_code || ''
    });
    if (directRuntimeArchiveMode(env) === 'sync') {
      const archived = await handleRuntimeEventQueue({ messages: [{ body: safeEvent }] }, env, context).catch((error) => {
        console.warn('runtime sync archive failed', error?.message || error);
        return { ok: false, error: error?.message || String(error) };
      });
      archiveStatus = archived?.ok
        ? `sync-r2:${archived.results?.r2?.ok ? 1 : 0}-d1:${archived.results?.d1?.ok ? 1 : 0}-citadel:${archived.results?.citadel?.ok ? 1 : 0}${archived.results?.d1?.error ? `-d1err:${cleanText(archived.results.d1.error, 80)}` : ''}`
        : `sync-error:${cleanText(archived?.error || 'unknown', 120)}`;
    }
  }

  if (caught) throw caught;
  return stampRequestId(response, requestId, archiveStatus);
}

function jsonl(events) {
  return `${events.map((event) => JSON.stringify(redactRuntimeEvent(event))).join('\n')}\n`;
}

function hourKey(eventTs) {
  const date = new Date(eventTs || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 13);
  return date.toISOString().slice(0, 13);
}

function archiveKey(event, batchId) {
  const date = new Date(event.event_ts || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const yyyy = safeDate.getUTCFullYear();
  const mm = String(safeDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(safeDate.getUTCDate()).padStart(2, '0');
  const hh = String(safeDate.getUTCHours()).padStart(2, '0');
  const customer = cleanText(event.customer_id || 'unknown', 120).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const project = cleanText(event.project_id || 'unknown', 120).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `runtime-logs/yyyy=${yyyy}/mm=${mm}/dd=${dd}/customer=${customer}/project=${project}/hour=${hh}/${batchId}.jsonl`;
}

function groupByArchiveKey(events, batchId) {
  const groups = new Map();
  for (const event of events) {
    const key = archiveKey(event, batchId);
    const bucket = groups.get(key) || [];
    bucket.push(event);
    groups.set(key, bucket);
  }
  return groups;
}

async function writeR2Archive(env, events) {
  const bucket = runtimeLogBucket(env);
  if (!bucket?.put || !events.length) return { ok: false, skipped: true, reason: 'REQUEST_LOG_BUCKET not configured' };
  const batchId = randomId('batch');
  const keys = [];
  const groups = groupByArchiveKey(events, batchId);
  for (const [key, grouped] of groups.entries()) {
    await bucket.put(key, jsonl(grouped), {
      httpMetadata: { contentType: 'application/x-ndjson; charset=utf-8' },
      customMetadata: {
        schema: RUNTIME_SCHEMA,
        events: String(grouped.length)
      }
    });
    keys.push(key);
  }
  return { ok: true, archived: events.length, keys };
}

function rollupGroups(events) {
  const groups = new Map();
  for (const event of events) {
    const safe = redactRuntimeEvent(event);
    const key = [
      hourKey(safe.event_ts),
      safe.project_id || 'unknown',
      safe.deployment_id || '',
      safe.runtime_type || 'unknown',
      safe.status_family || statusFamily(safe.status)
    ].join('|');
    const current = groups.get(key) || {
      hour_utc: hourKey(safe.event_ts),
      project_id: safe.project_id || 'unknown',
      deployment_id: safe.deployment_id || '',
      runtime_type: safe.runtime_type || 'unknown',
      status_family: safe.status_family || statusFamily(safe.status),
      request_count: 0,
      error_count: 0,
      total_duration_ms: 0,
      total_bytes_out: 0
    };
    current.request_count += 1;
    current.error_count += safe.status >= 500 || safe.error_code ? 1 : 0;
    current.total_duration_ms += safe.duration_ms || 0;
    current.total_bytes_out += safe.bytes_out || 0;
    groups.set(key, current);
  }
  return [...groups.values()];
}

async function writeD1Rollups(env, events) {
  const db = rollupDb(env);
  if (!db?.prepare || !events.length) return { ok: false, skipped: true, reason: 'RUNTIME_ROLLUP_DB not configured' };
  const upsert = `
    insert into runtime_rollups_hourly
      (hour_utc, project_id, deployment_id, runtime_type, status_family, request_count, error_count, total_duration_ms, total_bytes_out, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(hour_utc, project_id, deployment_id, runtime_type, status_family)
    do update set
      request_count = request_count + excluded.request_count,
      error_count = error_count + excluded.error_count,
      total_duration_ms = total_duration_ms + excluded.total_duration_ms,
      total_bytes_out = total_bytes_out + excluded.total_bytes_out,
      updated_at = excluded.updated_at
  `;
  const updatedAt = nowIso();
  const statements = rollupGroups(events).map((group) => db.prepare(upsert).bind(
    group.hour_utc,
    group.project_id,
    group.deployment_id,
    group.runtime_type,
    group.status_family,
    group.request_count,
    group.error_count,
    group.total_duration_ms,
    group.total_bytes_out,
    updatedAt
  ));
  if (statements.length) await db.batch(statements);
  return { ok: true, rollups: statements.length };
}

async function sendCitadelRuntimeEvents(env, events) {
  const url = cleanText(env.CITADEL_RUNTIME_INGEST_URL || env.CITADELDB_RUNTIME_INGEST_URL || '', 700);
  if (!url || !events.length) return { ok: false, skipped: true, reason: 'CITADEL_RUNTIME_INGEST_URL not configured' };
  const headers = new Headers({ 'content-type': 'application/json' });
  const token = cleanText(env.CITADEL_RUNTIME_INGEST_TOKEN || env.CITADELDB_RUNTIME_INGEST_TOKEN || '', 1000);
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ schema: 'fs27.runtime_request.batch.v1', events: events.map(redactRuntimeEvent) })
  });
  if (!response.ok) {
    const error = new Error(`Citadel runtime ingest failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return { ok: true, status: response.status, sent: events.length };
}

export async function handleRuntimeEventQueue(batch, env, context) {
  const events = (batch.messages || [])
    .map((message) => redactRuntimeEvent(message.body || message))
    .filter((event) => event.request_id && event.hostname);

  if (!events.length) return { ok: true, skipped: true, reason: 'empty runtime event batch' };

  const results = {};
  const failures = [];

  for (const [name, task] of [
    ['r2', () => writeR2Archive(env, events)],
    ['d1', () => writeD1Rollups(env, events)],
    ['citadel', () => sendCitadelRuntimeEvents(env, events)]
  ]) {
    try {
      results[name] = await task();
    } catch (error) {
      failures.push({ name, message: error?.message || String(error) });
      results[name] = { ok: false, error: error?.message || String(error) };
    }
  }

  const stored = Object.values(results).some((result) => result?.ok);
  if (!stored && failures.length) {
    throw new Error(`runtime event batch failed all sinks: ${failures.map((failure) => `${failure.name}:${failure.message}`).join('; ')}`);
  }

  if (failures.length) {
    context?.waitUntil?.(Promise.resolve().then(() => {
      console.warn('runtime event batch partial sink failure', JSON.stringify(failures));
    }));
  }

  return { ok: true, events: events.length, results, failures };
}
