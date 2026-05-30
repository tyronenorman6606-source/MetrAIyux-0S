import { recordCitadelMirrorEvent } from './citadeldb-adapter.mjs';

const BASE = '/api/helper-k4i';
const SKYERRORS_BASE = '/api/skyerrors';
const SCAN_INDEX_KEY = 'helper-k4i:v1:scans:index';
const SCAN_PREFIX = 'helper-k4i:v1:scan:';
const SKYERROR_INDEX_KEY = 'helper-k4i:v1:skyerrors:index';
const SKYERROR_PREFIX = 'helper-k4i:v1:skyerror:';
const PATCH_PLAN_INDEX_KEY = 'helper-k4i:v1:patch-plans:index';
const PATCH_PLAN_PREFIX = 'helper-k4i:v1:patch-plan:';
const DEPLOY_AGENT_INDEX_KEY = 'helper-k4i:v1:deployment-agent:index';
const DEPLOY_AGENT_PREFIX = 'helper-k4i:v1:deployment-agent:';
const CAPABILITY_WATCH_INDEX_KEY = 'helper-k4i:v1:capability-watch:index';
const CAPABILITY_WATCH_PREFIX = 'helper-k4i:v1:capability-watch:';
const MAX_INDEX = 120;

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
  return env.HELPER_K4I_KV || env.SKYERRORS_KV || env.SITE_EVENTS_KV || null;
}

function hasD1(env) {
  return Boolean((env.CITADELDB || env.CITADELDB_D1 || env.METRAIYUX_CITADELDB)?.prepare);
}

function configured(env, keys) {
  return keys.some((key) => Boolean(String(env[key] || '').trim()));
}

function resendApiKey(env) {
  return String(
    env.RESEND_API_KEY
    || env.BACKUP_RESEND_API_TOKEN
    || env.backup_resend_api_token
    || env.bacup_resend_api_token
    || ''
  ).trim();
}

function safeParseJson(raw, fallback = null) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

async function readIndex(store, key) {
  if (!store?.get) return [];
  const raw = await store.get(key);
  const parsed = safeParseJson(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

async function putJson(store, key, value, ttlDays = 180) {
  if (!store?.put) return false;
  const options = ttlDays ? { expirationTtl: 60 * 60 * 24 * ttlDays } : undefined;
  await store.put(key, JSON.stringify(value), options);
  return true;
}

async function pushIndex(store, key, item) {
  if (!store?.put) return [];
  const current = await readIndex(store, key);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_INDEX);
  await putJson(store, key, next);
  return next;
}

async function requireGate(request, env, deps, label) {
  if (!deps?.requireGateAuth) return { ok: false, response: json({ ok: false, error: 'Gate auth helper is not mounted.' }, 500) };
  return deps.requireGateAuth(request, env, label);
}

async function requireOperator(request, env, deps, label) {
  if (deps?.requireOperatorAuth) return deps.requireOperatorAuth(request, env, label);
  return requireGate(request, env, deps, label);
}

function helperPersona() {
  return {
    id: 'helper-k4i-proof-ops-brain',
    name: 'Helper K4i',
    publicName: 'Helper K4i',
    role: '0S proof, health, SkyErrors, CitadelDB, deployment authority, and vault patch assistant',
    ownedBy: 'MetrAIyux 0S',
    boundaries: [
      'Uses shared FS27/SkyGate/Free99 auth only.',
      'Creates scan receipts and patch plans, but does not run destructive commands from the Worker.',
      'Can verify Cloudflare deployment authority when an owner-scoped token is configured, but never returns secret values.',
      'Redacts mail/API secrets from every response and alert.',
      'Sends owner alerts only through configured Resend settings.'
    ]
  };
}

function deploymentAgentPersona() {
  return {
    id: 'skyenet-deployment-agent',
    name: 'SkyeNet Deployment Agent',
    publicName: 'SkyeNet Deployment Agent',
    role: '0S-owned deployment authority checker, Cloudflare Pages/Workers handoff assistant, smoke/stress receipt writer, and secret-rotation planner',
    ownedBy: 'MetrAIyux 0S',
    boundaries: [
      'Uses shared FS27/SkyGate/Free99 operator auth only.',
      'Never exposes Cloudflare tokens, bearer sessions, API keys, or owner credentials.',
      'Treats secret rotation as an owner-approved handoff unless a valid owner-scoped Cloudflare management secret is explicitly configured.',
      'Records deploy attempts, blocked authority, smoke, stress, and rotation plans into the private 0S receipt lane.'
    ]
  };
}

function alertConfig(env) {
  const to = text(env.HELPER_K4I_ALERT_TO || env.OWNER_ALERT_EMAIL || env.RESEND_TO_EMAIL || env.NOTIFY_EMAIL_TO || env.ADMIN_NOTIFY_EMAIL || env.OWNER_EMAIL || '', 240);
  const from = text(env.HELPER_K4I_ALERT_FROM || env.RESEND_FROM_EMAIL || env.NOTIFY_EMAIL_FROM || env.RESEND_FROM || env.MAIL_FROM || '', 240);
  return {
    provider: 'resend',
    configured: Boolean(resendApiKey(env) && to && from),
    toConfigured: Boolean(to),
    fromConfigured: Boolean(from)
  };
}

function check(idValue, label, ok, severity, detail = '') {
  return {
    id: idValue,
    label,
    ok: Boolean(ok),
    severity: ok ? 'ok' : severity,
    detail: text(detail, 500)
  };
}

async function recentSkyErrors(env, limit = 20) {
  const store = kv(env);
  const index = await readIndex(store, SKYERROR_INDEX_KEY);
  return index.slice(0, Math.max(1, Math.min(Number(limit) || 20, 100)));
}

async function recentCapabilityWatch(env, limit = 20) {
  const store = kv(env);
  const index = await readIndex(store, CAPABILITY_WATCH_INDEX_KEY);
  return index.slice(0, Math.max(1, Math.min(Number(limit) || 20, 100)));
}

function latestCapabilityWatchSummary(items = []) {
  const latest = Array.isArray(items) && items.length ? items[0] : null;
  return {
    present: Boolean(latest),
    latest_id: text(latest?.id || '', 160),
    latest_status: text(latest?.status || '', 80),
    latest_ok: latest?.ok === true,
    latest_created_at: text(latest?.createdAt || '', 80),
    recent_receipts: Array.isArray(latest?.recent_receipts) ? latest.recent_receipts.slice(0, 12) : [],
    external_boundaries: Array.isArray(latest?.external_boundaries) ? latest.external_boundaries.slice(0, 12) : [],
    counts: latest?.counts || {},
    health_watch: latest?.health_watch || null
  };
}

function normalizeTags(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const out = {};
  for (const [key, item] of Object.entries(source).slice(0, 40)) {
    const cleanKey = text(key, 80).replace(/[^a-zA-Z0-9_.:-]/g, '_');
    if (!cleanKey) continue;
    out[cleanKey] = text(item, 240);
  }
  return out;
}

function normalizeContext(value, depth = 0) {
  if (depth > 3) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [key, item] of Object.entries(value).slice(0, 40)) {
    const cleanKey = text(key, 80).replace(/[^a-zA-Z0-9_.:-]/g, '_');
    if (!cleanKey) continue;
    if (Array.isArray(item)) out[cleanKey] = item.slice(0, 20).map((entry) => typeof entry === 'object' ? normalizeContext(entry, depth + 1) : text(entry, 500));
    else if (item && typeof item === 'object') out[cleanKey] = normalizeContext(item, depth + 1);
    else if (typeof item === 'boolean' || typeof item === 'number') out[cleanKey] = item;
    else out[cleanKey] = text(item, 1000);
  }
  return out;
}

function normalizeSkyErrorEvent(body = {}, request = null, auth = {}) {
  const error = body.error && typeof body.error === 'object' ? body.error : {};
  const message = text(body.message || error.message || body.title || 'Captured error', 1000) || 'Captured error';
  const level = ['fatal', 'error', 'warning', 'info', 'debug'].includes(body.level) ? body.level : 'error';
  const createdAt = text(body.createdAt || body.created_at || body.timestamp || now(), 80) || now();
  return {
    id: text(body.id, 160) || id('skyerr'),
    type: 'skyerrors.capture',
    schema: 'skyerrors-event-v1',
    service: text(body.service || body.app || body.project || 'metraiyux-0s', 180),
    level,
    message,
    exception: {
      name: text(body.exception?.name || error.name || body.name || 'Error', 180),
      message,
      stack: text(body.exception?.stack || error.stack || body.stack || '', 6000)
    },
    release: text(body.release || '', 180),
    environment: text(body.environment || body.env || 'production', 120),
    url: text(body.url || request?.headers.get('referer') || '', 800),
    user: normalizeContext(body.user || {}),
    tags: normalizeTags(body.tags || {}),
    contexts: normalizeContext(body.contexts || body.context || {}),
    fingerprint: Array.isArray(body.fingerprint) ? body.fingerprint.slice(0, 8).map((item) => text(item, 160)).filter(Boolean) : [],
    actor: text(auth.actor || auth.identity?.email || auth.identity?.sub || '0s-gate-session', 180),
    request: {
      origin: text(request?.headers.get('origin') || '', 300),
      userAgent: text(request?.headers.get('user-agent') || '', 300)
    },
    createdAt
  };
}

async function storeSkyErrorEvent(env, event) {
  const store = kv(env);
  const result = { kv: false, skyerrors: false, citadel: false };
  if (store?.put) {
    await putJson(store, `${SKYERROR_PREFIX}${event.id}`, event);
    await pushIndex(store, SKYERROR_INDEX_KEY, event);
    result.kv = true;
    result.skyerrors = true;
  }
  const mirrored = await recordCitadelMirrorEvent(env, {
    source: 'skyerrors_sdk',
    appId: 'skyerrors',
    workspaceId: text(event.contexts?.workspaceId || event.contexts?.workspace_id || event.tags?.workspace_id || 'metraiyux-0s-ops', 180),
    table: 'skyerrors',
    recordId: event.id,
    operation: 'insert',
    payload: event,
    primary: {
      ok: true,
      system: 'skyerrors_worker_capture',
      receiptId: event.id,
      writtenAt: event.createdAt
    },
    citadel: {
      ok: true,
      storage: 'cloudflare_d1',
      writtenAt: now()
    }
  }, event.actor).catch((error) => ({ ok: false, error: text(error?.message || error, 300) }));
  result.citadel = mirrored.ok === true;
  result.citadelError = mirrored.ok ? '' : (mirrored.error || '');
  return { ...result, mirror: mirrored };
}

async function runHelperScan(env, auth, body = {}) {
  const alerts = alertConfig(env);
  const store = kv(env);
  const checks = [
    check('shared_gate', 'Shared 0S gate helpers mounted', true, 'error', 'Route reached through Worker gate enforcement and adapter auth.'),
    check('citadeldb', 'CitadelDB live database binding', hasD1(env), 'error', hasD1(env) ? 'CITADELDB binding is available.' : 'CITADELDB binding is missing.'),
    check('site_events_kv', 'SkyErrors receipt KV', Boolean(store?.put), 'warn', store?.put ? 'SITE_EVENTS_KV-compatible receipt storage is available.' : 'No KV receipt store is configured.'),
    check('owner_session', 'Owner/admin session secret', configured(env, ['OWNER_ADMIN_SESSION_SECRET', 'FREE99_ADMIN_SESSION_SECRET', 'SKYGATE_SESSION_SECRET']), 'error', 'Needed for the shared owner/admin auth lane.'),
    check('skygate', 'FS27/SkyGate handoff', configured(env, ['SKYGATEFS27_ORIGIN', 'SKYGATEFS27_WORKER_ORIGIN']) || Boolean(env.SKYGATEFS27_WORKER?.fetch), 'warn', 'Expected for remote 0S session introspection and event mirroring.'),
    check('resend', 'Resend owner alert lane', alerts.configured, 'warn', alerts.configured ? 'Resend owner alert lane is configured.' : 'RESEND_API_KEY, from, or owner recipient is missing; alerts will be recorded but not emailed.')
  ];
  const errors = checks.filter((item) => item.severity === 'error' && !item.ok);
  const warnings = checks.filter((item) => item.severity === 'warn' && !item.ok);
  const scan = {
    id: text(body.id, 160) || id('helper_k4i_scan'),
    type: 'helper_k4i.proof_health_scan',
    schema: 'helper-k4i-proof-ops-scan-v1',
    service: 'helper-k4i',
    persona: helperPersona(),
    status: errors.length ? 'error' : (warnings.length ? 'warn' : 'ok'),
    ok: errors.length === 0,
    severity: errors.length ? 'error' : (warnings.length ? 'warn' : 'ok'),
    scanMode: text(body.mode || body.kind || 'proof_health', 80),
    checks,
    counts: {
      checks: checks.length,
      errors: errors.length,
      warnings: warnings.length
    },
    actions: [
      'Record scan receipt in SkyErrors/CitadelDB.',
      'Notify owner through Resend when configured and the scan has warnings or errors.',
      'Create a vault patch plan for minor fix orchestration instead of mutating production code inside the Worker.'
    ],
    skyerrors: [...errors, ...warnings],
    actor: text(auth.actor || auth.identity?.email || '0s-operator', 180),
    createdAt: now()
  };
  return scan;
}

async function storeScan(env, scan) {
  const store = kv(env);
  const result = { kv: false, skyerrors: false, citadel: false };
  if (store?.put) {
    await putJson(store, `${SCAN_PREFIX}${scan.id}`, scan);
    await pushIndex(store, SCAN_INDEX_KEY, scan);
    result.kv = true;
    if (scan.skyerrors.length) {
      await putJson(store, `${SKYERROR_PREFIX}${scan.id}`, scan);
      await pushIndex(store, SKYERROR_INDEX_KEY, scan);
      result.skyerrors = true;
    }
  }
  const mirrored = await recordCitadelMirrorEvent(env, {
    source: 'helper_k4i',
    appId: 'helper-k4i',
    workspaceId: 'metraiyux-0s-ops',
    table: scan.skyerrors.length ? 'skyerrors' : 'proof_scans',
    recordId: scan.id,
    operation: 'insert',
    payload: scan,
    primary: {
      ok: true,
      system: 'helper_k4i_worker',
      receiptId: scan.id,
      writtenAt: scan.createdAt
    },
    citadel: {
      ok: true,
      storage: 'cloudflare_d1',
      writtenAt: now()
    }
  }, scan.actor).catch((error) => ({ ok: false, error: text(error?.message || error, 300) }));
  result.citadel = mirrored.ok === true;
  result.citadelError = mirrored.ok ? '' : (mirrored.error || '');
  return { ...result, mirror: mirrored };
}

function resendPayload(scan, message = '') {
  const subject = scan.ok
    ? `Helper K4i proof scan ok: ${scan.id}`
    : `Helper K4i needs attention: ${scan.counts.errors} errors, ${scan.counts.warnings} warnings`;
  const lines = [
    `Helper K4i scan ${scan.id}`,
    `Status: ${scan.status}`,
    `Mode: ${scan.scanMode}`,
    `Actor: ${scan.actor}`,
    `Created: ${scan.createdAt}`,
    '',
    ...scan.checks.map((item) => `- ${item.ok ? 'OK' : item.severity.toUpperCase()}: ${item.label}${item.detail ? ` (${item.detail})` : ''}`),
    '',
    message ? `Operator note: ${text(message, 1000)}` : ''
  ].filter(Boolean);
  return { subject, text: lines.join('\n'), html: `<pre>${escapeHtml(lines.join('\n'))}</pre>` };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function sendHelperAlert(env, scan, message = '') {
  const to = text(env.HELPER_K4I_ALERT_TO || env.OWNER_ALERT_EMAIL || env.RESEND_TO_EMAIL || env.NOTIFY_EMAIL_TO || env.ADMIN_NOTIFY_EMAIL || env.OWNER_EMAIL || '', 240);
  const from = text(env.HELPER_K4I_ALERT_FROM || env.RESEND_FROM_EMAIL || env.NOTIFY_EMAIL_FROM || env.RESEND_FROM || env.MAIL_FROM || '', 240);
  const apiKey = resendApiKey(env);
  if (!apiKey || !to || !from) {
    return {
      ok: false,
      skipped: true,
      provider: 'resend',
      reason: 'RESEND_API_KEY or backup Resend token, from email, and owner recipient are required.'
    };
  }
  const content = resendPayload(scan, message);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: to.split(',').map((item) => item.trim()).filter(Boolean),
      subject: content.subject,
      text: content.text,
      html: content.html
    })
  });
  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    provider: 'resend',
    status: response.status,
    id: text(body.id || '', 160),
    error: response.ok ? '' : text(body.message || body.error || response.statusText || 'resend_send_failed', 300)
  };
}

function patchPlanFromBody(body = {}, auth = {}) {
  const patchId = text(body.id, 160) || id('helper_k4i_patch');
  const title = text(body.title || body.summary || 'Helper K4i minor bug patch plan', 180);
  const issue = text(body.issue || body.error || body.message || 'Operator requested Helper K4i patch orchestration.', 1400);
  return {
    id: patchId,
    type: 'helper_k4i.vault_patch_plan',
    schema: 'helper-k4i-vault-patch-plan-v1',
    status: 'planned_for_vault_handoff',
    title,
    issue,
    severity: text(body.severity || 'minor', 40),
    scope: text(body.scope || 'metraiyux_0s_site/cloudflare + tests + docs', 300),
    proposedSteps: Array.isArray(body.steps) && body.steps.length
      ? body.steps.map((item) => text(item, 500)).slice(0, 12)
      : [
        'Reproduce with the relevant Worker/API proof command.',
        'Patch the smallest responsible adapter, test, or document surface.',
        'Run CitadelDB and Helper K4i proof tests.',
        'Store the patch receipt in SkyeVault/autosync before production deploy.'
      ],
    vaultHandoff: {
      commands: [
        'npm run 0s:helper-k4i:proof',
        'node metraiyux_0s_site/tests/citadeldb-adapter.test.mjs',
        'npm run citadeldb:live-d1-sync-proof',
        'npm run vault:autosync:status',
        'npm run vault:autosync:proof'
      ],
      receiptTargets: [
        'test-artifacts/helper-k4i/',
        'test-artifacts/citadeldb-live-d1-sync/',
        'metraiyux_0s_site/proof/',
        'SkyeVault autosync receipt lane'
      ]
    },
    actor: text(auth.actor || auth.identity?.email || '0s-operator', 180),
    createdAt: now()
  };
}

async function storePatchPlan(env, plan) {
  const store = kv(env);
  const result = { kv: false, citadel: false };
  if (store?.put) {
    await putJson(store, `${PATCH_PLAN_PREFIX}${plan.id}`, plan);
    await pushIndex(store, PATCH_PLAN_INDEX_KEY, plan);
    result.kv = true;
  }
  const mirrored = await recordCitadelMirrorEvent(env, {
    source: 'helper_k4i',
    appId: 'helper-k4i',
    workspaceId: 'metraiyux-0s-ops',
    table: 'patch_plans',
    recordId: plan.id,
    operation: 'insert',
    payload: plan,
    primary: {
      ok: true,
      system: 'helper_k4i_worker',
      receiptId: plan.id,
      writtenAt: plan.createdAt
    },
    citadel: {
      ok: true,
      storage: 'cloudflare_d1',
      writtenAt: now()
    }
  }, plan.actor).catch((error) => ({ ok: false, error: text(error?.message || error, 300) }));
  result.citadel = mirrored.ok === true;
  result.citadelError = mirrored.ok ? '' : (mirrored.error || '');
  return { ...result, mirror: mirrored };
}

function firstEnv(env, keys) {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return { key, value };
  }
  return { key: '', value: '' };
}

function cloudflareAuthorityConfig(env) {
  const account = firstEnv(env, [
    'CLOUDFLARE_DEPLOY_ACCOUNT_ID',
    'CLOUDFLARE_ACCOUNT_ID',
    'CF_ACCOUNT_ID',
    'METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID'
  ]);
  const token = firstEnv(env, [
    'CLOUDFLARE_DEPLOY_API_TOKEN',
    'CLOUDFLARE_PAGES_API_TOKEN',
    'CLOUDFLARE_API_TOKEN',
    'CF_API_TOKEN'
  ]);
  const managementToken = firstEnv(env, [
    'CLOUDFLARE_SECRET_ROTATION_TOKEN',
    'CLOUDFLARE_MANAGEMENT_API_TOKEN'
  ]);
  return {
    accountConfigured: Boolean(account.value),
    tokenConfigured: Boolean(token.value),
    managementTokenConfigured: Boolean(managementToken.value),
    accountKey: account.key || null,
    tokenKey: token.key || null,
    managementTokenKey: managementToken.key || null,
    accountId: account.value,
    token: token.value,
    apiBase: String(env.CLOUDFLARE_API_BASE_URL || 'https://api.cloudflare.com/client/v4').replace(/\/+$/, '')
  };
}

async function cloudflareProbe(config, endpoint) {
  if (!config.accountConfigured || !config.tokenConfigured) {
    return { ok: false, skipped: true, status: 0, reason: 'cloudflare_account_or_token_not_configured' };
  }
  const response = await fetch(`${config.apiBase}${endpoint}`, {
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json'
    }
  }).catch((error) => ({ error }));
  if (response.error) {
    return { ok: false, skipped: false, status: 0, error: text(response.error?.message || response.error, 300) };
  }
  const body = await response.json().catch(() => ({}));
  const errors = Array.isArray(body.errors)
    ? body.errors.map((error) => ({ code: error.code || null, message: text(error.message || error, 240) })).slice(0, 3)
    : [];
  return {
    ok: response.ok && body.success !== false,
    skipped: false,
    status: response.status,
    success: Boolean(body.success),
    errors
  };
}

async function deploymentAuthoritySnapshot(env, body = {}) {
  const config = cloudflareAuthorityConfig(env);
  const projectName = text(body.projectName || body.project || 'devooderator', 120);
  const workerName = text(body.workerName || body.worker || 'metraiyux-0s-full-system', 160);
  const probes = {
    tokenVerify: await cloudflareProbe(config, '/user/tokens/verify'),
    pagesProject: await cloudflareProbe(config, `/accounts/${config.accountId}/pages/projects/${encodeURIComponent(projectName)}`),
    zeroOsWorker: await cloudflareProbe(config, `/accounts/${config.accountId}/workers/services/${encodeURIComponent(workerName)}`)
  };
  const pagesReady = probes.pagesProject.ok === true;
  const workerReady = probes.zeroOsWorker.ok === true;
  const fs27Ready = Boolean(env.SKYGATEFS27_WORKER?.fetch || env.SKYGATEFS27_ORIGIN);
  const skynetReady = fs27Ready && Boolean(env.SITE_EVENTS_KV?.put || env.CITADELDB?.prepare);
  return {
    ok: pagesReady || workerReady || skynetReady,
    status: pagesReady || workerReady ? 'cloudflare_authority_ready' : (skynetReady ? 'skyenet_internal_ready_cloudflare_token_missing' : 'blocked_missing_cloudflare_authority'),
    agent: deploymentAgentPersona(),
    target: {
      pagesProject: projectName,
      zeroOsWorker: workerName
    },
    configured: {
      account: config.accountConfigured,
      deployToken: config.tokenConfigured,
      managementToken: config.managementTokenConfigured,
      accountKey: config.accountKey,
      tokenKey: config.tokenKey,
      managementTokenKey: config.managementTokenKey,
      fs27ServiceBinding: Boolean(env.SKYGATEFS27_WORKER?.fetch),
      fs27Origin: Boolean(env.SKYGATEFS27_ORIGIN),
      receiptKv: Boolean(env.SITE_EVENTS_KV?.put),
      citadel: hasD1(env)
    },
    probes,
    capabilities: {
      pagesDeploy: pagesReady,
      zeroOsWorkerDeploy: workerReady,
      skynetProxy: fs27Ready,
      smokeStressReceipts: Boolean(env.SITE_EVENTS_KV?.put || hasD1(env)),
      secretRotationPlan: true,
      directSecretRotation: Boolean(config.managementTokenConfigured && (pagesReady || workerReady))
    },
    boundary: 'Cloudflare secrets are checked by presence and API status only. Raw token values are never returned, stored in public assets, or sent in alerts.'
  };
}

async function storeDeployAgentReceipt(env, receipt) {
  const store = kv(env);
  const result = { kv: false, citadel: false };
  if (store?.put) {
    await putJson(store, `${DEPLOY_AGENT_PREFIX}${receipt.id}`, receipt);
    await pushIndex(store, DEPLOY_AGENT_INDEX_KEY, receipt);
    result.kv = true;
  }
  const mirrored = await recordCitadelMirrorEvent(env, {
    source: 'helper_k4i_deployment_agent',
    appId: 'skyenet-deployment-agent',
    workspaceId: 'metraiyux-0s-ops',
    table: 'deployment_agent_receipts',
    recordId: receipt.id,
    operation: 'insert',
    payload: receipt,
    primary: {
      ok: receipt.ok !== false,
      system: 'helper_k4i_worker',
      receiptId: receipt.id,
      writtenAt: receipt.createdAt
    },
    citadel: {
      ok: true,
      storage: 'cloudflare_d1',
      writtenAt: now()
    }
  }, receipt.actor).catch((error) => ({ ok: false, error: text(error?.message || error, 300) }));
  result.citadel = mirrored.ok === true;
  result.citadelError = mirrored.ok ? '' : (mirrored.error || '');
  return { ...result, mirror: mirrored };
}

function normalizeWatchCheck(value = {}, index = 0) {
  const source = value && typeof value === 'object' ? value : {};
  const ok = source.ok !== false && source.status !== 'fail' && source.status !== 'error';
  const severity = source.severity
    ? text(source.severity, 40)
    : (ok ? 'ok' : 'error');
  return {
    id: text(source.id || `check_${index + 1}`, 120),
    label: text(source.label || source.name || source.id || `Capability check ${index + 1}`, 240),
    ok,
    status: text(source.status || (ok ? 'pass' : 'fail'), 80),
    severity,
    proof_kind: text(source.proof_kind || source.evidence_level || source.classification || 'unclassified', 120),
    http_status: Number.isFinite(source.http_status) ? source.http_status : null,
    duration_ms: Number.isFinite(source.duration_ms) ? source.duration_ms : null,
    live_action_observed: source.live_action_observed === true,
    real_time_observed: source.real_time_observed === true,
    detail: text(source.detail || source.observation || source.failure_reason || '', 900),
    boundary: text(source.boundary || '', 900)
  };
}

function normalizeReceiptReference(value = {}, index = 0) {
  const source = value && typeof value === 'object' ? value : {};
  const summary = source.summary && typeof source.summary === 'object' ? source.summary : {};
  return {
    id: text(source.id || `receipt_${index + 1}`, 140),
    label: text(source.label || source.id || `Proof receipt ${index + 1}`, 240),
    path: text(source.path || '', 420),
    exists: source.exists === true,
    ok: source.ok === true,
    status: text(source.status || (source.exists === false ? 'missing' : source.ok === true ? 'ok' : 'attention'), 80),
    schema: text(source.schema || '', 180),
    generated_at: text(source.generated_at || source.generatedAt || '', 90),
    no_browser_proof_run: source.no_browser_proof_run === true,
    owner_manual_live_check: source.owner_manual_live_check === true,
    proves: text(source.proves || source.description || '', 420),
    summary: normalizeContext({
      route_failures: summary.route_failures,
      gate_failures: summary.gate_failures,
      authenticated_failures: summary.authenticated_failures,
      behavior_green: summary.behavior_green,
      behavior_yellow: summary.behavior_yellow,
      behavior_red: summary.behavior_red,
      checks: summary.checks,
      stress_ok: summary.stress_ok,
      stress_requests: summary.stress_requests,
      live_provider_send_attempted: summary.live_provider_send_attempted,
      provider_call_made: summary.provider_call_made
    })
  };
}

function normalizeExternalBoundary(value = {}, index = 0) {
  const source = value && typeof value === 'object' ? value : {};
  const boundaries = Array.isArray(source.boundaries || source.external_boundaries)
    ? (source.boundaries || source.external_boundaries).slice(0, 8).map((item) => text(item, 520)).filter(Boolean)
    : [];
  return {
    id: text(source.id || `boundary_${index + 1}`, 140),
    priority: text(source.priority || '', 40),
    surface: text(source.surface || source.label || source.id || `External boundary ${index + 1}`, 260),
    receipt_path: text(source.receipt_path || source.receiptPath || '', 420),
    receipt_ok: source.receipt_ok === true,
    computed_truth: text(source.computed_truth || source.current_truth || '', 100),
    boundaries,
    next_step: text(source.next_step || source.next_build_step || '', 520)
  };
}

function normalizeHealthWatch(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    schema: text(source.schema || '', 180),
    generated_at: text(source.generated_at || source.generatedAt || '', 90),
    summary: normalizeContext(source.summary || {}),
    failed_receipts: Array.isArray(source.failed_receipts || source.failedReceipts)
      ? (source.failed_receipts || source.failedReceipts).slice(0, 20).map((item, index) => normalizeReceiptReference({ ...item, exists: true, ok: false, status: 'attention' }, index))
      : [],
    missing_receipts: Array.isArray(source.missing_receipts || source.missingReceipts)
      ? (source.missing_receipts || source.missingReceipts).slice(0, 20).map((item, index) => normalizeReceiptReference({ ...item, exists: false }, index))
      : [],
    consumption: normalizeContext(source.consumption || {}),
    boundary_rule: text(source.boundary_rule || source.boundaryRule || '', 900)
  };
}

function capabilityWatchReceiptFromBody(body = {}, auth = {}) {
  const checks = Array.isArray(body.checks)
    ? body.checks.map((item, index) => normalizeWatchCheck(item, index)).slice(0, 80)
    : [];
  const recentReceipts = Array.isArray(body.recent_receipts || body.recentProofReceipts || body.recent_proof_receipts)
    ? (body.recent_receipts || body.recentProofReceipts || body.recent_proof_receipts).slice(0, 40).map((item, index) => normalizeReceiptReference(item, index))
    : [];
  const externalBoundaries = Array.isArray(body.external_boundaries || body.externalBoundaries)
    ? (body.external_boundaries || body.externalBoundaries).slice(0, 40).map((item, index) => normalizeExternalBoundary(item, index)).filter((item) => item.boundaries.length)
    : [];
  const healthWatch = normalizeHealthWatch(body.health_watch || body.healthWatch || {});
  const errors = checks.filter((item) => !item.ok || item.severity === 'error');
  const warnings = checks.filter((item) => item.ok && item.severity === 'warn');
  const failingReceipts = recentReceipts.filter((item) => item.exists && !item.ok);
  const missingReceipts = recentReceipts.filter((item) => !item.exists);
  const status = text(body.status || (errors.length ? 'error' : warnings.length ? 'warn' : 'ok'), 40);
  const receiptId = text(body.id || body.receipt_id || '', 160) || id('capability_watch');
  return {
    id: receiptId,
    receipt_id: receiptId,
    type: 'helper_k4i.capability_watch',
    schema: 'helper-k4i.capability-watch-receipt.v1',
    ok: body.ok === false ? false : errors.length === 0,
    status,
    capability_id: text(body.capability_id || body.capabilityId || body.system || '0s-live-capability-watch', 160),
    surface: text(body.surface || body.label || '0S Live Capability Watch', 240),
    target_route: text(body.target_route || body.targetRoute || body.route || '', 500),
    source: text(body.source || '0s-non-browser-proof-runner', 180),
    proof_kind: text(body.proof_kind || body.evidence_level || 'mixed_non_browser', 120),
    no_browser_proof_run: body.no_browser_proof_run !== false,
    owner_manual_live_check: body.owner_manual_live_check !== false,
    provider_spend_gated: body.provider_spend_gated !== false,
    destructive_actions_gated: body.destructive_actions_gated !== false,
    checks,
    recent_receipts: recentReceipts,
    external_boundaries: externalBoundaries,
    health_watch: healthWatch,
    counts: {
      checks: checks.length,
      errors: errors.length,
      warnings: warnings.length,
      live_action_observed: checks.filter((item) => item.live_action_observed).length,
      real_time_observed: checks.filter((item) => item.real_time_observed).length,
      recent_receipts: recentReceipts.length,
      failing_receipts: failingReceipts.length,
      missing_receipts: missingReceipts.length,
      external_boundaries: externalBoundaries.length
    },
    summary: normalizeContext(body.summary || {}),
    receipt_paths: Array.isArray(body.receipt_paths || body.receiptPaths)
      ? (body.receipt_paths || body.receiptPaths).slice(0, 20).map((item) => text(item, 400)).filter(Boolean)
      : [],
    actor: text(auth.actor || auth.identity?.email || '0s-operator', 180),
    createdAt: text(body.createdAt || body.created_at || body.generated_at || now(), 80) || now()
  };
}

async function storeCapabilityWatchReceipt(env, receipt) {
  const store = kv(env);
  const result = { kv: false, citadel: false };
  if (store?.put) {
    await putJson(store, `${CAPABILITY_WATCH_PREFIX}${receipt.id}`, receipt);
    await pushIndex(store, CAPABILITY_WATCH_INDEX_KEY, receipt);
    result.kv = true;
  }
  const mirrored = await recordCitadelMirrorEvent(env, {
    source: 'helper_k4i_capability_watch',
    appId: 'helper-k4i',
    workspaceId: 'metraiyux-0s-ops',
    table: 'capability_watch_receipts',
    recordId: receipt.id,
    operation: 'insert',
    payload: receipt,
    primary: {
      ok: receipt.ok !== false,
      system: 'helper_k4i_worker',
      receiptId: receipt.id,
      writtenAt: receipt.createdAt
    },
    citadel: {
      ok: true,
      storage: 'cloudflare_d1',
      writtenAt: now()
    }
  }, receipt.actor).catch((error) => ({ ok: false, error: text(error?.message || error, 300) }));
  result.citadel = mirrored.ok === true;
  result.citadelError = mirrored.ok ? '' : (mirrored.error || '');
  return { ...result, mirror: mirrored };
}

async function deployAssistReceipt(env, auth, body = {}) {
  const authority = await deploymentAuthoritySnapshot(env, body);
  const action = text(body.action || 'production_deploy_assist', 100);
  const receipt = {
    id: text(body.id, 160) || id('deployment_agent'),
    type: 'skyenet_deployment_agent.assist',
    schema: 'skyenet-deployment-agent-assist-v1',
    ok: authority.capabilities.pagesDeploy || authority.capabilities.zeroOsWorkerDeploy || authority.capabilities.skynetProxy,
    status: authority.status,
    action,
    target: authority.target,
    authority,
    recommendedNext: authority.capabilities.pagesDeploy
      ? [
        'Run the local deployment agent with the selected Cloudflare authority.',
        'Run HTTP smoke and controlled stress receipts.',
        'Update the changelog only after green smoke/stress.'
      ]
      : [
        'Rotate or re-issue a Cloudflare deploy token with Pages project access.',
        'Store it as an owner-scoped Worker/local deploy secret, not in public assets.',
        'Re-run deploy-authority and deployment-agent smoke.'
      ],
    actor: text(auth.actor || auth.identity?.email || '0s-operator', 180),
    createdAt: now()
  };
  const stored = await storeDeployAgentReceipt(env, receipt);
  return { receipt, stored };
}

async function secretRotationPlan(env, auth, body = {}) {
  const authority = await deploymentAuthoritySnapshot(env, body);
  const plan = {
    id: text(body.id, 160) || id('deployment_secret_rotation'),
    type: 'skyenet_deployment_agent.secret_rotation_plan',
    schema: 'skyenet-secret-rotation-plan-v1',
    ok: true,
    status: authority.capabilities.directSecretRotation ? 'management_authority_configured' : 'owner_action_required',
    target: authority.target,
    authority,
    rotationModel: {
      mutualAwareness: '0S Worker, Helper K4i, and the deployment agent share secret presence/probe status and receipt ids, not raw secret values.',
      rawSecretRule: 'Raw Cloudflare, Resend, database, and bearer secrets stay inside Cloudflare secrets or local env only.',
      directRotationBoundary: 'Direct Cloudflare token creation or Worker secret mutation is allowed only when an owner-scoped Cloudflare management token is configured.'
    },
    ownerActions: [
      'Mint or rotate a Cloudflare API token with the narrow Pages/Workers permissions needed for the deployment lane.',
      'Store the Pages/Workers token as CLOUDFLARE_DEPLOY_API_TOKEN or CLOUDFLARE_API_TOKEN in the local deploy environment.',
      'If Worker-side authority checks are desired, store the same scoped token as a Cloudflare Worker secret; do not place it in static assets or public vars.',
      'Re-run /api/helper-k4i/deploy-authority and the local deployment-agent smoke/stress receipts.'
    ],
    localCommands: [
      'node tools/deployment-agent.mjs diagnose --project=devooderator --worker=metraiyux-0s-full-system',
      'node tools/deployment-agent.mjs deploy-pages --project=devooderator --dir=marketing/devooderator',
      'node tools/deployment-agent.mjs smoke-devooderator',
      'node tools/deployment-agent.mjs stress-devooderator'
    ],
    actor: text(auth.actor || auth.identity?.email || '0s-operator', 180),
    createdAt: now()
  };
  const stored = await storeDeployAgentReceipt(env, plan);
  return { plan, stored };
}

export async function handleHelperK4iRoute(request, env, ctx, url, deps = {}) {
  const isHelper = url.pathname.startsWith(BASE);
  const isSkyErrors = url.pathname.startsWith(SKYERRORS_BASE);
  if (!isHelper && !isSkyErrors) return null;
  if (request.method === 'OPTIONS') return json({ ok: true });

  const activeBase = isSkyErrors ? SKYERRORS_BASE : BASE;
  const route = url.pathname.slice(activeBase.length) || '/';

  if ((route === '/' || route === '/status' || route === '/health') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'Helper K4i status');
    if (!auth.ok) return auth.response;
    const store = kv(env);
    const scans = await readIndex(store, SCAN_INDEX_KEY);
    const watchItems = await recentCapabilityWatch(env, 10);
    return json({
      ok: true,
      service: isSkyErrors ? 'skyerrors' : 'helper-k4i',
      upstreamService: 'helper-k4i',
      gateOwned: true,
      mountedInZeroOs: true,
      persona: helperPersona(),
      alert: alertConfig(env),
      storage: {
        skyerrorsKv: Boolean(store?.put),
        citadelDatabase: hasD1(env)
      },
      routes: {
        scan: `${BASE}/scan`,
        skyerrors: `${BASE}/skyerrors`,
        skyerrorsApi: `${SKYERRORS_BASE}/events`,
        skyerrorsStatus: `${SKYERRORS_BASE}/status`,
        skyerrorsHealth: `${SKYERRORS_BASE}/health`,
        capabilityWatch: `${BASE}/capability-watch`,
        skyerrorsWatch: `${SKYERRORS_BASE}/watch`,
        notify: `${BASE}/notify`,
        patchPlan: `${BASE}/patch-plan`,
        deployAuthority: `${BASE}/deploy-authority`,
        deployAssist: `${BASE}/deploy-assist`,
        secretRotationPlan: `${BASE}/secret-rotation-plan`
      },
      recentScans: scans.slice(0, 5),
      recentCapabilityWatch: watchItems.slice(0, 5),
      capabilityWatchHealth: latestCapabilityWatchSummary(watchItems)
    });
  }

  if (route === '/scan' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i scan');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const scan = await runHelperScan(env, auth, body);
    const stored = await storeScan(env, scan);
    let notification = { ok: false, skipped: true, reason: 'notify=false' };
    if (body.notify === true || (!scan.ok && body.notify !== false)) {
      const send = sendHelperAlert(env, scan, body.message || body.note || '');
      if (ctx?.waitUntil) ctx.waitUntil(send);
      notification = await send.catch((error) => ({ ok: false, provider: 'resend', error: text(error?.message || error, 300) }));
    }
    return json({ ok: true, scan, stored, notification }, scan.ok ? 200 : 207);
  }

  if (route === '/skyerrors' && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'Helper K4i SkyErrors');
    if (!auth.ok) return auth.response;
    const items = await recentSkyErrors(env, url.searchParams.get('limit') || 30);
    return json({
      ok: true,
      service: 'helper-k4i',
      skyerrors: items,
      count: items.length,
      storage: {
        skyerrorsKv: Boolean(kv(env)?.put),
        citadelDatabase: hasD1(env)
      }
    });
  }

  if ((route === '/events' || route === '/capture' || route === '/skyerrors') && request.method === 'POST') {
    const auth = await requireGate(request, env, deps, 'SkyErrors capture');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const event = normalizeSkyErrorEvent(body, request, auth);
    const stored = await storeSkyErrorEvent(env, event);
    if (ctx?.waitUntil && deps?.mirrorSkygateEvent) {
      ctx.waitUntil(deps.mirrorSkygateEvent(env, {
        type: 'skyerrors.capture',
        meta: {
          id: event.id,
          service: event.service,
          level: event.level,
          storage: stored.citadel ? 'citadeldb' : stored.kv ? 'kv' : 'unconfigured'
        }
      }, auth.gate || auth));
    }
    return json({ ok: true, event, stored }, 201);
  }

  if ((route === '/events' || (isSkyErrors && route === '/')) && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'SkyErrors events');
    if (!auth.ok) return auth.response;
    const items = await recentSkyErrors(env, url.searchParams.get('limit') || 30);
    return json({
      ok: true,
      service: 'skyerrors',
      gateOwned: true,
      sdkCaptureRoute: `${SKYERRORS_BASE}/events`,
      events: items,
      count: items.length,
      storage: {
        skyerrorsKv: Boolean(kv(env)?.put),
        citadelDatabase: hasD1(env)
      }
    });
  }

  if ((route === '/capability-watch' || route === '/watch') && request.method === 'GET') {
    const auth = await requireGate(request, env, deps, 'Helper K4i capability watch');
    if (!auth.ok) return auth.response;
    const items = await recentCapabilityWatch(env, url.searchParams.get('limit') || 30);
    return json({
      ok: true,
      service: isSkyErrors ? 'skyerrors' : 'helper-k4i',
      gateOwned: true,
      capabilityWatchRoute: `${BASE}/capability-watch`,
      skyerrorsWatchRoute: `${SKYERRORS_BASE}/watch`,
      receipts: items,
      latest: items[0] || null,
      capabilityWatchHealth: latestCapabilityWatchSummary(items),
      count: items.length,
      storage: {
        receiptKv: Boolean(kv(env)?.put),
        citadelDatabase: hasD1(env)
      }
    });
  }

  if ((route === '/capability-watch' || route === '/watch') && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i capability watch');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const receipt = capabilityWatchReceiptFromBody(body, auth);
    const stored = await storeCapabilityWatchReceipt(env, receipt);
    if (ctx?.waitUntil && deps?.mirrorSkygateEvent) {
      ctx.waitUntil(deps.mirrorSkygateEvent(env, {
        type: 'helper_k4i.capability_watch',
        meta: {
          id: receipt.id,
          capability_id: receipt.capability_id,
          status: receipt.status,
          checks: receipt.counts.checks,
          storage: stored.citadel ? 'citadeldb' : stored.kv ? 'kv' : 'unconfigured'
        }
      }, auth.gate || auth));
    }
    return json({ ok: true, receipt, stored }, receipt.ok ? 201 : 207);
  }

  if (route === '/notify' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i notify');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const scan = await runHelperScan(env, auth, { ...body, mode: body.mode || 'manual_notify' });
    const stored = await storeScan(env, scan);
    const notification = await sendHelperAlert(env, scan, body.message || body.note || '').catch((error) => ({
      ok: false,
      provider: 'resend',
      error: text(error?.message || error, 300)
    }));
    return json({ ok: Boolean(notification.ok || notification.skipped), scan, stored, notification });
  }

  if ((route === '/patch-plan' || route === '/patch') && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i vault patch plan');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const plan = patchPlanFromBody(body, auth);
    const stored = await storePatchPlan(env, plan);
    return json({ ok: true, plan, stored }, 201);
  }

  if (route === '/deploy-authority' && request.method === 'GET') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i deployment authority');
    if (!auth.ok) return auth.response;
    const authority = await deploymentAuthoritySnapshot(env, {
      project: url.searchParams.get('project') || url.searchParams.get('projectName') || '',
      worker: url.searchParams.get('worker') || url.searchParams.get('workerName') || ''
    });
    return json({
      ok: true,
      service: 'helper-k4i',
      gateOwned: true,
      deploymentAgent: deploymentAgentPersona(),
      authority
    });
  }

  if (route === '/deploy-assist' && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i deployment assist');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const result = await deployAssistReceipt(env, auth, body);
    return json({ ok: true, ...result }, result.receipt.ok ? 201 : 207);
  }

  if ((route === '/secret-rotation-plan' || route === '/rotate-secrets') && request.method === 'POST') {
    const auth = await requireOperator(request, env, deps, 'Helper K4i secret rotation plan');
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const result = await secretRotationPlan(env, auth, body);
    return json({ ok: true, ...result }, 201);
  }

  return json({ ok: false, error: 'helper_k4i_route_not_found', path: url.pathname }, 404);
}
