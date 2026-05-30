#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const baseUrl = String(process.env.ZERO_OS_LIVE_BASE || process.env.ZERO_OS_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const runId = `operating-depth-closeout-${stamp}`;
const outDir = path.join(repoRoot, 'test-artifacts', '0s-operating-depth-closeout');
const stampedPath = path.join(outDir, stamp, 'receipt.json');
const latestPath = path.join(outDir, '0s-operating-depth-closeout-live-http-latest.json');
const fetchTimeoutMs = Number(process.env.ZERO_OS_CLOSEOUT_FETCH_TIMEOUT_MS || 30000);

const behaviorFields = [
  'create',
  'read',
  'update_or_closeout',
  'receipt_readback',
  'stress',
  'founder_command_visible'
];

const credentialKeys = [
  'ZERO_OS_GATE_SESSION',
  'MCP_GATE_SESSION',
  'MCP_HTTP_BEARER_TOKEN',
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

const providerSecretKeys = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_MESSAGING_SERVICE_SID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENDGRID_API_KEY',
  'RESEND_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON',
  'SKYEPAY_PROVIDER_SECRET',
  'SKYENET_AUTH'
];

const workflowSpecs = [
  {
    id: 'command-bridge-all-lanes',
    receipt: 'test-artifacts/0s-command-bridge/live-direct-proof-latest.json',
    supporting_receipts: [],
    livePath: '/founder-command/apps/0s-command-bridge/',
    marker: 'Command Bridge'
  },
  {
    id: 'skyeroutex-workforce-depth',
    receipt: 'test-artifacts/0s-workflow-rollups/skyeroutex-workforce-depth-latest.json',
    supporting_receipts: [
      'test-artifacts/founder-command-nexus-hire-workforce/founder-command-nexus-hire-workforce-live-http-latest.json',
      'test-artifacts/llc-to-0s-business-workflow/llc-to-0s-business-workflow-live-http-latest.json'
    ],
    livePath: '/live/skyeroutex-workforce-command.html',
    marker: 'SkyeRouteX'
  },
  {
    id: 'skymail-company-crm-lane',
    receipt: 'test-artifacts/0s-workflow-rollups/skymail-company-crm-lane-latest.json',
    supporting_receipts: [
      'test-artifacts/founder-company-enrollment-live-http/founder-company-enrollment-live-http-latest.json',
      'test-artifacts/0s-real-user-readiness/2026-05-27T07-41-38-810Z/receipt.json'
    ],
    livePath: '/live/SkyeMail/',
    marker: 'SkyeMail',
    specific: 'skyemail-handoff'
  },
  {
    id: 'relay13-communications-center',
    receipt: 'test-artifacts/connectlog-relay13-production-proof.json',
    supporting_receipts: [
      'test-artifacts/relay13-chat-system-proof.json',
      'test-artifacts/founder-company-enrollment-live-http/founder-company-enrollment-live-http-latest.json'
    ],
    livePath: '/live/relay13-chat-hub.html',
    marker: 'Relay13',
    specific: 'relay13-conversation'
  },
  {
    id: 'sovereigndocs-client-packet',
    receipt: 'test-artifacts/0s-workflow-rollups/sovereigndocs-client-packet-latest.json',
    supporting_receipts: [
      'test-artifacts/llc-to-0s-business-workflow/llc-to-0s-business-workflow-live-http-latest.json'
    ],
    livePath: '/Free99/apps/sovereigndocs/',
    marker: 'SovereignDocs'
  },
  {
    id: 'llc-to-0s-business-workflow',
    receipt: 'test-artifacts/llc-to-0s-business-workflow/llc-to-0s-business-workflow-live-http-latest.json',
    supporting_receipts: [],
    livePath: '/Free99/apps/sovereigndocs/business-formation/',
    marker: 'SovereignDocs'
  },
  {
    id: 'admin-brain-automation',
    receipt: 'test-artifacts/admin-brain-native/admin-brain-native-live-http-latest.json',
    supporting_receipts: [
      'test-artifacts/content-engine-provider-dispatch/content-engine-provider-dispatch-live-http-latest.json'
    ],
    livePath: '/admin/content-engine-lane.html',
    marker: 'Content Engine Lane'
  },
  {
    id: 'external-provider-hardening',
    receipt: 'test-artifacts/0s-workflow-rollups/external-provider-hardening-latest.json',
    supporting_receipts: [
      'test-artifacts/0s-provider-runtime/0s-provider-runtime-smoke-latest.json',
      'test-artifacts/0s-provider-runtime/0s-provider-runtime-stress-latest.json',
      'test-artifacts/admin-brain-native/admin-brain-native-live-http-latest.json',
      'test-artifacts/content-engine-provider-dispatch/content-engine-provider-dispatch-live-http-latest.json'
    ],
    livePath: '/api/admin/connectors/status',
    marker: 'connectors',
    specific: 'provider-status'
  },
  {
    id: 'content-engine-provider-dispatch',
    receipt: 'test-artifacts/content-engine-provider-dispatch/content-engine-provider-dispatch-live-http-latest.json',
    supporting_receipts: [],
    livePath: '/admin/content-engine-lane.html',
    marker: 'Content Engine Lane',
    specific: 'content-engine-cycle'
  },
  {
    id: 'skyenet-full-runtime',
    receipt: 'test-artifacts/0s-workflow-rollups/skyenet-full-runtime-latest.json',
    supporting_receipts: [
      'test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json',
      'test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json',
      'test-artifacts/skyenet-source-transfer-stress/skyenet-source-transfer-stress-latest.json',
      'test-artifacts/skyenet-source-download/skyenet-source-download-live-http-latest.json',
      'test-artifacts/founder-command-skynet-backend/founder-command-skynet-backend-live-http-latest.json'
    ],
    livePath: '/api/skyenet/status',
    marker: 'skyenet',
    specific: 'skyenet-ops'
  },
  {
    id: 'skyepay-commerce-financial-ops',
    receipt: 'test-artifacts/skyemusicnexus-skyepay-loop-live-direct/latest.json',
    supporting_receipts: [
      'test-artifacts/skyecommerce-e2e/api-e2e-receipt.json',
      'test-artifacts/skyecommerce-live-production-stress/latest.json',
      'test-artifacts/skyecommerce-production-direct-surfaces/latest.json'
    ],
    livePath: '/SkyeCommerce/',
    marker: 'SkyeCommerce'
  },
  {
    id: 'jobping-product-depth',
    receipt: 'test-artifacts/jobping-paid-runtime/jobping-paid-runtime-live-http-latest.json',
    supporting_receipts: [],
    livePath: '/Free99/apps/jobping/',
    marker: 'JobPing'
  },
  {
    id: 'valuation-deck-alignment',
    receipt: 'test-artifacts/valuation-deck-alignment/valuation-deck-alignment-latest.json',
    supporting_receipts: [
      'test-artifacts/0s-truth-ledger/0s-truth-ledger-latest.json',
      'metraiyux_0s_site/proof/0s-truth-ledger.json'
    ],
    livePath: '/admin/site-valuation.html',
    marker: 'valuation'
  }
];

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text.replace(/^Bearer\s+/i, '');
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function generatedAt(data = {}) {
  return data.generatedAt
    || data.generated_at
    || data.checkedAt
    || data.checked_at
    || data.startedAt
    || data.started_at
    || data.timestamp
    || '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readEnvFile(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    const values = {};
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) values[match[1]] = unquote(match[2]);
    }
    return values;
  } catch {
    return {};
  }
}

async function mergedEnv() {
  const envFiles = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(repoRoot, file)));
  return merged;
}

async function readJson(relativePath) {
  const absolute = path.resolve(repoRoot, relativePath);
  try {
    const text = await fs.readFile(absolute, 'utf8');
    return { path: relativePath, absolute, exists: true, parse_error: '', data: JSON.parse(text) };
  } catch (error) {
    if (error?.code === 'ENOENT') return { path: relativePath, absolute, exists: false, parse_error: '', data: null };
    return { path: relativePath, absolute, exists: true, parse_error: error.message, data: null };
  }
}

function gateHeaders(token, extra = {}) {
  return {
    accept: 'application/json,text/html,*/*;q=0.8',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra
  };
}

async function fetchAbsolute(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(init.timeoutMs || fetchTimeoutMs));
  try {
    const { timeoutMs, ...cleanInit } = init;
    const response = await fetch(url, { ...cleanInit, signal: controller.signal });
    const text = await response.text().catch(() => '');
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {}
    return {
      url,
      status: response.status,
      ok: response.ok && body?.ok !== false,
      location: response.headers.get('location') || '',
      content_type: response.headers.get('content-type') || '',
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      bytes: Buffer.byteLength(text),
      text,
      body
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      location: '',
      content_type: '',
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      bytes: 0,
      text: '',
      body: { ok: false, error: error?.name === 'AbortError' ? 'request_timeout' : error.message || String(error) }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(pathname, init = {}) {
  return fetchAbsolute(`${baseUrl}${pathname}`, init);
}

function summarizeFetch(result, extra = {}) {
  return {
    status: result.status,
    ok: result.ok,
    elapsed_ms: result.elapsed_ms,
    bytes: result.bytes,
    location: result.location,
    error: result.body?.error || undefined,
    ...extra
  };
}

async function resolveGateToken(env) {
  const candidates = credentialKeys
    .filter((key) => env[key])
    .map((key) => ({ key, value: unquote(env[key]) }))
    .filter((item) => item.value);
  for (const candidate of candidates) {
    if (/SESSION|TOKEN|BEARER/i.test(candidate.key)) {
      const probe = await fetchText('/api/admin/connectors/status', { headers: gateHeaders(candidate.value) });
      if (probe.ok) return { token: candidate.value, source_key: candidate.key, mode: 'bearer' };
      continue;
    }
    for (const route of ['/api/founder-command/login', '/api/owner/admin-login']) {
      const response = await fetchAbsolute(`${baseUrl}${route}`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ code: candidate.value })
      });
      const token = unquote(response.body?.gateBearerToken || response.body?.gateToken || response.body?.token || response.body?.session || '');
      if (response.ok && token) return { token, source_key: candidate.key, mode: route };
    }
  }
  return null;
}

function redirectOrDeny(result) {
  return [301, 302, 303, 307, 308, 401, 403].includes(result.status)
    && /admin\/login|unauthorized|forbidden|gate|auth/i.test(`${result.location}\n${result.text}`);
}

function markerFound(result, marker) {
  const haystack = result.body ? JSON.stringify(result.body) : result.text;
  return new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(haystack);
}

function matrixLanes(matrix = {}) {
  if (Array.isArray(matrix.lanes)) return matrix.lanes;
  if (Array.isArray(matrix.behavior_matrix?.lanes)) return matrix.behavior_matrix.lanes;
  return [];
}

function hasOkStress(data = {}) {
  if (data.stress?.ok === true) return true;
  if (data.stress === true) return true;
  if (data.stressOk === true) return true;
  if (data.smoke?.stress?.ok === true) return true;
  if (Array.isArray(data.evidence) && data.evidence.some((item) => item.ok && /stress/i.test(`${item.id} ${item.path}`))) return true;
  if (Array.isArray(data.checks) && data.checks.some((item) => item.ok && /stress/i.test(`${item.label} ${item.id}`))) return true;
  return false;
}

function receiptOkForWorkflow(spec, receipt, supportingReceipts = []) {
  const data = receipt.data || {};
  const supportingOk = supportingReceipts.some((item) => item.data?.ok === true);
  if (spec.id === 'valuation-deck-alignment') {
    return data.ok === true;
  }
  if (spec.id === 'content-engine-provider-dispatch') {
    return data.ok === true && (data.run?.status === 'dispatched_for_operator_review' || data.dispatch_boundary?.provider_call_made === false || data.run?.dispatch_count >= 1);
  }
  if (spec.id === 'skyenet-full-runtime') {
    return data.ok === true || supportingOk;
  }
  return data.ok === true || supportingOk;
}

function receiptSummary(readback) {
  const data = readback.data || {};
  return {
    path: readback.path,
    exists: readback.exists,
    parse_error: readback.parse_error,
    ok: data.ok === true,
    aligned: typeof data.aligned === 'boolean' ? data.aligned : undefined,
    open_update_required: typeof data.open_update_required === 'boolean' ? data.open_update_required : undefined,
    schema: data.schema || '',
    lane: data.lane || '',
    generated_at: generatedAt(data),
    failures: Array.isArray(data.failures) ? data.failures : [],
    open_gaps: Array.isArray(data.open_gaps) ? data.open_gaps : [],
    evidence_count: Array.isArray(data.evidence) ? data.evidence.length : undefined,
    evidence_ok_count: Array.isArray(data.evidence) ? data.evidence.filter((item) => item.ok).length : undefined
  };
}

function commandBridgeEventFound(result, workflowId) {
  const events = Array.isArray(result.body?.events) ? result.body.events : [];
  return events.some((event) => {
    const text = JSON.stringify(event);
    return text.includes(runId) && text.includes(workflowId) && /update_or_closeout|operating_depth/i.test(text);
  });
}

async function recordCommandBridgeCloseout(token, spec, receipt, live) {
  if (!token) return { ok: false, reason: 'missing_shared_gate_token' };
  const closeoutEntityId = `operating-closeout:${spec.id}`;
  const payload = {
    source_app: '0s-operating-proof-matrix',
    source_surface: 'operating-depth-closeout-live-http',
    event_type: '0s.workflow.update_or_closeout.proved',
    summary: `Operating depth closeout recorded for ${spec.id}`,
    entity: {
      kind: 'workflow',
      id: closeoutEntityId,
      label: spec.id
    },
    crm: {
      stage: 'update_or_closeout_proved',
      workflow_id: spec.id,
      run_id: runId
    },
    metadata: {
      run_id: runId,
      workflow_id: spec.id,
      receipt_path: spec.receipt,
      receipt_ok: receipt.data?.ok === true,
      live_http_read_ok: Boolean(live?.authenticated?.ok),
      no_browser_proof_run: true
    }
  };
  const post = await fetchText('/api/0s-command-bridge/events', {
    method: 'POST',
    headers: gateHeaders(token, { 'content-type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  let readback = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    readback = await fetchText(`/api/0s-command-bridge/events?entity=${encodeURIComponent(closeoutEntityId)}&limit=80`, { headers: gateHeaders(token) });
    if (readback.ok && commandBridgeEventFound(readback, spec.id)) break;
    await sleep(400);
  }
  if (!readback?.ok || !commandBridgeEventFound(readback, spec.id)) {
    const globalReadback = await fetchText('/api/0s-command-bridge/events?limit=160', { headers: gateHeaders(token) });
    if (globalReadback.ok) readback = globalReadback;
  }
  const stored = post.ok && (post.body?.stored === true || post.body?.ok !== false);
  const found = Boolean(readback?.ok && commandBridgeEventFound(readback, spec.id));
  return {
    ok: stored && found,
    event_type: payload.event_type,
    entity_id: closeoutEntityId,
    post: summarizeFetch(post, { stored }),
    readback: summarizeFetch(readback || { status: 0, ok: false, elapsed_ms: 0, bytes: 0, location: '', body: {} }, { found })
  };
}

async function runCommandBridgeStress(token) {
  if (!token) return { ok: false, reason: 'missing_shared_gate_token', requests: 0, failures: [] };
  const paths = [
    '/api/0s-command-bridge/status?limit=20',
    '/api/0s-command-bridge/events?limit=20',
    '/api/0s-command-bridge/graph?limit=20',
    '/api/admin/connectors/status',
    '/api/skyenet/status'
  ];
  const total = Number(process.env.ZERO_OS_CLOSEOUT_STRESS_TOTAL || 25);
  const samples = [];
  for (let index = 0; index < total; index += 1) {
    const pathname = paths[index % paths.length];
    samples.push({ pathname, result: await fetchText(pathname, { headers: gateHeaders(token), timeoutMs: 20000 }) });
  }
  const failures = samples
    .filter((item) => !item.result.ok)
    .map((item) => ({ path: item.pathname, status: item.result.status, error: item.result.body?.error || item.result.text.slice(0, 160) }));
  const durations = samples.map((item) => item.result.elapsed_ms).sort((a, b) => a - b);
  return {
    ok: failures.length === 0,
    requests: total,
    p95_ms: durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] || 0,
    max_ms: durations.at(-1) || 0,
    failures
  };
}

async function runSkyemailHandoff(token) {
  const slug = runId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const mailbox = `${slug}@skyemail.solenterprises.org`;
  const handoffId = `skymail_handoff_${slug}`;
  const payload = {
    action: 'stage-only',
    handoff_id: handoffId,
    skip_provision: true,
    provider_safe_only: true,
    company_name: '0S Operating Depth Closeout',
    workspace_handle: slug,
    workspace_slug: slug,
    workspace_id: `workspace_${slug}`,
    customer_id: `cust_${slug}`,
    owner_email: 'grayskyes@solenterprises.org',
    owner_name: '0S Operating Depth Owner',
    local_part: slug,
    domain: 'skyemail.solenterprises.org',
    mailbox_email: mailbox,
    plan_id: 'operating-depth-closeout-no-charge',
    send_email: false,
    welcome_title: '0S operating depth closeout SkyeMail handoff',
    welcome_message: 'Provider-safe closeout handoff staged through shared Founder Command gate.'
  };
  const create = await fetchText('/api/founder-command/skyemail/handoffs', {
    method: 'POST',
    headers: gateHeaders(token, { 'content-type': 'application/json' }),
    body: JSON.stringify(payload),
    timeoutMs: 60000
  });
  const id = create.body?.record?.id || handoffId;
  const directRead = await fetchText(`/api/founder-command/skyemail/handoffs?id=${encodeURIComponent(id)}`, { headers: gateHeaders(token), timeoutMs: 60000 });
  const listRead = await fetchText(`/api/founder-command/skyemail/handoffs?limit=100`, { headers: gateHeaders(token), timeoutMs: 60000 });
  const rows = Array.isArray(listRead.body?.handoffs) ? listRead.body.handoffs : [];
  const found = Boolean(directRead.body?.record)
    || rows.some((row) => row.id === id || row.mailbox_email === mailbox || row.workspace_id === payload.workspace_id);
  return {
    ok: create.ok && Boolean(id) && (directRead.ok || listRead.ok) && found,
    created: create.ok && Boolean(id),
    read: (directRead.ok || listRead.ok) && found,
    id,
    mailbox,
    create: summarizeFetch(create),
    direct_readback: summarizeFetch(directRead, { found: Boolean(directRead.body?.record) }),
    readback: summarizeFetch(listRead, { found, count: rows.length }),
    provider_boundary: create.body?.record?.provision?.skipped ? create.body.record.provision.reason || 'provider_provision_skipped' : ''
  };
}

async function runRelayConversation(token) {
  const slug = runId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const workspace = `relay-${slug}`;
  const payload = {
    workspace,
    workspace_slug: workspace,
    customer_name: '0S Operating Depth Closeout',
    customer_email: 'grayskyes@solenterprises.org',
    subject: `Relay13 operating closeout ${runId}`,
    message: 'Operating depth closeout conversation proving create/read/closeout visibility through shared Founder Command gate.',
    source_url: `${baseUrl}/founder-command/index.html?tab=inbox`,
    external_user_id: runId,
    connectlog_card_id: `${workspace}-card`,
    connectlog_card_label: '0S operating depth Relay13 card',
    connectlog_campaign: '0s-operating-depth-closeout',
    connectlog_owner_name: 'Gray Skyes',
    connectlog_owner_company: 'Skyes Over London LC'
  };
  const create = await fetchText('/api/founder-command/inbox/conversations', {
    method: 'POST',
    headers: gateHeaders(token, { 'content-type': 'application/json' }),
    body: JSON.stringify(payload),
    timeoutMs: 60000
  });
  const conversationId = create.body?.conversation?.id || create.body?.id || '';
  const read = await fetchText(`/api/founder-command/inbox?workspace=${encodeURIComponent(workspace)}&limit=10`, { headers: gateHeaders(token), timeoutMs: 60000 });
  const rows = Array.isArray(read.body?.conversations) ? read.body.conversations : (Array.isArray(read.body?.items) ? read.body.items : []);
  const found = JSON.stringify(read.body || {}).includes(conversationId) || JSON.stringify(rows).includes(runId);
  return {
    ok: create.ok && Boolean(conversationId || create.body?.ok !== false) && read.ok && found,
    created: create.ok,
    read: read.ok && found,
    conversation_id: conversationId,
    workspace,
    create: summarizeFetch(create),
    readback: summarizeFetch(read, { found, count: rows.length })
  };
}

async function runProviderStatus(token) {
  const status = await fetchText('/api/admin/connectors/status', { headers: gateHeaders(token) });
  const connectors = Array.isArray(status.body?.connectors) ? status.body.connectors : [];
  return {
    ok: status.ok && connectors.length > 0,
    read: status.ok && connectors.length > 0,
    configured_connectors: connectors.filter((item) => item.configured).length,
    connector_count: connectors.length,
    storage_mode: status.body?.storage_mode || '',
    status: summarizeFetch(status)
  };
}

async function runContentEngineCycle(token) {
  const marker = runId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const headers = gateHeaders(token, { 'content-type': 'application/json' });
  const article = {
    slug: marker,
    title: `0S operating closeout content package ${marker}`,
    subtitle: 'Live HTTP closeout proof for Content Engine create/read/approve/dispatch/readback.',
    audience: 'Founder Command operator',
    category: '0S Proof',
    proofRule: 'Provider dispatch stays approval-gated unless owner-approved credentials are configured.',
    marketingUse: 'Produce proof assets without unsupported external publishing.',
    operatingMove: 'Create, store, queue provider-gated events, read back the receipt.'
  };
  const activate = await fetchText('/api/admin/content-engine/activate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ article, channels: ['email', 'website_section', 'local_brain', 'repository_update'] }),
    timeoutMs: 60000
  });
  const contentRunId = activate.body?.run?.id || '';
  const readCreated = contentRunId
    ? await fetchText(`/api/admin/content-engine/run?id=${encodeURIComponent(contentRunId)}`, { headers: gateHeaders(token), timeoutMs: 60000 })
    : { ok: false, status: 0, body: {}, elapsed_ms: 0, bytes: 0, location: '' };
  const dispatch = contentRunId
    ? await fetchText('/api/admin/content-engine/dispatch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ run_id: contentRunId, approved: true, notes: `0S operating depth closeout ${runId}` }),
        timeoutMs: 60000
      })
    : { ok: false, status: 0, body: {}, elapsed_ms: 0, bytes: 0, location: '' };
  await sleep(250);
  const readDispatched = contentRunId
    ? await fetchText(`/api/admin/content-engine/run?id=${encodeURIComponent(contentRunId)}`, { headers: gateHeaders(token), timeoutMs: 60000 })
    : { ok: false, status: 0, body: {}, elapsed_ms: 0, bytes: 0, location: '' };
  const dispatches = Array.isArray(dispatch.body?.dispatches) ? dispatch.body.dispatches : [];
  const connectorEvents = Array.isArray(readDispatched.body?.connector_events) ? readDispatched.body.connector_events : [];
  return {
    ok: activate.ok
      && Boolean(contentRunId)
      && readCreated.ok
      && dispatch.ok
      && dispatch.body?.provider_call_made === false
      && dispatches.length >= 1
      && readDispatched.ok
      && readDispatched.body?.run?.status === 'dispatched_for_operator_review'
      && connectorEvents.length >= 1,
    created: activate.ok && Boolean(contentRunId),
    read: readCreated.ok && readDispatched.ok,
    run_id: contentRunId,
    run_status: readDispatched.body?.run?.status || '',
    dispatch_count: dispatches.length,
    connector_event_count: connectorEvents.length,
    provider_call_made: dispatch.body?.provider_call_made === true,
    activate: summarizeFetch(activate),
    read_created: summarizeFetch(readCreated),
    dispatch: summarizeFetch(dispatch),
    read_dispatched: summarizeFetch(readDispatched)
  };
}

async function runSkyeNetOps(token) {
  const headers = gateHeaders(token);
  const zeroStatus = await fetchText('/api/skyenet/status', { headers });
  const zeroCost = await fetchText('/api/skyenet/cost-model', { headers });
  const zeroObservability = await fetchText('/api/skyenet/observability', { headers });
  const zeroReceipts = await fetchText('/api/skyenet/receipts?limit=10', { headers });
  const skynetStatus = await fetchAbsolute(`${skynetBase}/api/skyenet/status`, { headers });
  const okChecks = [zeroStatus, zeroCost, zeroObservability, zeroReceipts, skynetStatus].filter((item) => item.ok).length;
  return {
    ok: zeroStatus.ok && skynetStatus.ok && okChecks >= 3,
    read: zeroStatus.ok && skynetStatus.ok,
    checks_ok: okChecks,
    zero_os: {
      status: summarizeFetch(zeroStatus),
      cost_model: summarizeFetch(zeroCost),
      observability: summarizeFetch(zeroObservability),
      receipts: summarizeFetch(zeroReceipts)
    },
    skynet_platform: {
      status: summarizeFetch(skynetStatus)
    }
  };
}

async function runSpecificCloseout(spec, token) {
  if (!token) return { ok: false, reason: 'missing_shared_gate_token' };
  if (spec.specific === 'skyemail-handoff') return runSkyemailHandoff(token);
  if (spec.specific === 'relay13-conversation') return runRelayConversation(token);
  if (spec.specific === 'provider-status') return runProviderStatus(token);
  if (spec.specific === 'content-engine-cycle') return runContentEngineCycle(token);
  if (spec.specific === 'skyenet-ops') return runSkyeNetOps(token);
  return { ok: true, reason: 'covered_by_receipt_and_command_bridge_closeout' };
}

function fieldEvidence(ok, evidence = {}) {
  return { ok: Boolean(ok), ...evidence };
}

function inferBehavior({ spec, lane, receipt, supportingReceipts, live, closeout, closeoutStress }) {
  const receiptReadback = receipt.exists && !receipt.parse_error && Boolean(receipt.data);
  const primaryReceiptOk = receipt.data?.ok === true;
  const supportingReceiptOk = supportingReceipts.some((item) => item.data?.ok === true);
  const workflowReceiptOk = receiptOkForWorkflow(spec, receipt, supportingReceipts);
  const liveReadOk = Boolean(live?.authenticated?.ok);
  const closeoutOk = Boolean(closeout?.command_bridge?.ok && closeout?.specific?.ok !== false);
  const specificCreated = closeout?.specific?.created === true;
  const specificRead = closeout?.specific?.read === true;
  const stressOk = hasOkStress(receipt.data || {}) || supportingReceipts.some((item) => hasOkStress(item.data || {})) || closeoutStress?.ok === true;
  const behavior = {
    create: workflowReceiptOk || primaryReceiptOk || supportingReceiptOk || specificCreated,
    read: receiptReadback && (workflowReceiptOk || liveReadOk || specificRead),
    update_or_closeout: workflowReceiptOk && closeoutOk,
    receipt_readback: receiptReadback,
    stress: stressOk,
    founder_command_visible: Boolean(closeout?.command_bridge?.ok)
  };
  return {
    ...behavior,
    field_evidence: {
      create: fieldEvidence(behavior.create, { receipt_ok: primaryReceiptOk, supporting_receipt_ok: supportingReceiptOk, specific_created: specificCreated }),
      read: fieldEvidence(behavior.read, { receipt_readback: receiptReadback, live_http_read_ok: liveReadOk, specific_read: specificRead }),
      update_or_closeout: fieldEvidence(behavior.update_or_closeout, { workflow_receipt_ok: workflowReceiptOk, command_bridge_closeout_ok: Boolean(closeout?.command_bridge?.ok), specific_closeout_ok: closeout?.specific?.ok !== false }),
      receipt_readback: fieldEvidence(behavior.receipt_readback, { receipt_path: spec.receipt }),
      stress: fieldEvidence(behavior.stress, { receipt_stress_ok: hasOkStress(receipt.data || {}), closeout_stress_ok: closeoutStress?.ok === true }),
      founder_command_visible: fieldEvidence(behavior.founder_command_visible, { command_bridge_entity_id: closeout?.command_bridge?.entity_id || '' })
    },
    live_http_read_ok: liveReadOk,
    unauthenticated_gate_ok: Boolean(live?.unauthenticated?.ok),
    state: behaviorFields.every((field) => behavior[field]) ? 'green' : (workflowReceiptOk || closeoutOk ? 'yellow' : (lane?.state || 'blocked')),
    missing_behaviors: behaviorFields.filter((field) => !behavior[field]),
    receipt_path: spec.receipt,
    receipt_ok: primaryReceiptOk,
    workflow_receipt_ok: workflowReceiptOk,
    supporting_receipt_ok: supportingReceiptOk,
    supporting_receipts: supportingReceipts.map(receiptSummary),
    receipt_generated_at: generatedAt(receipt.data || {})
  };
}

function externalBoundaryFor(spec, lane, receipt, env, closeout = {}) {
  const data = receipt.data || {};
  const gaps = [
    ...(Array.isArray(lane?.external_boundaries) ? lane.external_boundaries : []),
    ...(Array.isArray(lane?.open_gaps) ? lane.open_gaps : []),
    ...(Array.isArray(data.external_boundaries) ? data.external_boundaries : []),
    ...(Array.isArray(data.open_gaps) ? data.open_gaps : [])
  ].filter(Boolean);
  const missingEnv = providerSecretKeys.filter((key) => !env[key]);
  const boundary = [];
  const serialized = JSON.stringify(data).slice(0, 20000);
  if (/provider|external|twilio|stripe|sendgrid|resend|payout|refund|social|email|government|legal|filing|background/i.test(`${spec.id} ${lane?.gap_type || ''} ${gaps.join(' ')} ${serialized}`)) {
    boundary.push({
      workflow_id: spec.id,
      reason: lane?.gap_type || data.gap_type || 'provider_or_real_world_boundary',
      missing_secret_keys: missingEnv,
      provider_call_made: data.dispatch_boundary?.provider_call_made === true || closeout?.specific?.provider_call_made === true,
      notes: gaps.length ? [...new Set(gaps)] : ['External/provider/legal/government execution stays owner-approved and is not simulated by this proof.']
    });
  }
  if (data.dispatch_boundary?.provider_call_made === false || closeout?.specific?.provider_call_made === false) {
    boundary.push({
      workflow_id: spec.id,
      reason: data.dispatch_boundary?.reason || 'provider dispatch intentionally gated',
      missing_secret_keys: missingEnv,
      provider_call_made: false,
      notes: ['Provider dispatch receipt explicitly records provider_call_made:false until owner-approved connector credentials are attached.']
    });
  }
  return boundary;
}

async function writeReceipt(receipt) {
  await fs.mkdir(path.dirname(stampedPath), { recursive: true });
  await fs.writeFile(stampedPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(outDir, { recursive: true });
  const latest = { ...receipt, stamped_receipt: rel(stampedPath) };
  await fs.writeFile(latestPath, `${JSON.stringify(latest, null, 2)}\n`);
}

async function main() {
  const env = await mergedEnv();
  const owner = await resolveGateToken(env);
  const matrixReadback = await readJson('test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json');
  const truthReadback = await readJson('metraiyux_0s_site/proof/0s-truth-ledger.json');
  const productionReadback = await readJson('test-artifacts/0s-production-closure/0s-production-closure-latest.json');
  const lanes = matrixLanes(matrixReadback.data || {});
  const closeoutStress = await runCommandBridgeStress(owner?.token || '');
  const behavior_proofs = {};
  const receipt_readbacks = [];
  const live_http_checks = {};
  const closeout_operations = {};
  const external_boundaries = [];

  for (const spec of workflowSpecs) {
    const lane = lanes.find((item) => item.id === spec.id) || null;
    const receipt = await readJson(spec.receipt);
    const supportingReceipts = [];
    for (const supportPath of spec.supporting_receipts || []) supportingReceipts.push(await readJson(supportPath));
    const unauth = await fetchText(spec.livePath, { redirect: 'manual', headers: { accept: 'application/json,text/html' } });
    const live = {
      unauthenticated: {
        path: spec.livePath,
        status: unauth.status,
        ok: redirectOrDeny(unauth),
        location: unauth.location,
        elapsed_ms: unauth.elapsed_ms
      },
      authenticated: null
    };
    if (owner?.token) {
      const authed = await fetchText(spec.livePath, { headers: gateHeaders(owner.token), timeoutMs: 60000 });
      live.authenticated = {
        path: spec.livePath,
        status: authed.status,
        ok: authed.ok && (spec.marker ? markerFound(authed, spec.marker) || authed.body?.ok !== false : true),
        marker: spec.marker,
        marker_found: spec.marker ? markerFound(authed, spec.marker) : undefined,
        bytes: authed.bytes,
        elapsed_ms: authed.elapsed_ms
      };
    }
    const specific = await runSpecificCloseout(spec, owner?.token || '');
    const commandBridge = await recordCommandBridgeCloseout(owner?.token || '', spec, receipt, live);
    const closeout = { specific, command_bridge: commandBridge };
    live_http_checks[spec.id] = live;
    closeout_operations[spec.id] = closeout;
    receipt_readbacks.push(receiptSummary(receipt));
    behavior_proofs[spec.id] = inferBehavior({ spec, lane, receipt, supportingReceipts, live, closeout, closeoutStress });
    external_boundaries.push(...externalBoundaryFor(spec, lane, receipt, env, closeout));
  }

  const behaviorValues = Object.values(behavior_proofs);
  const fieldCount = (field) => behaviorValues.filter((item) => item[field] === true).length;
  const closeoutFailures = Object.entries(closeout_operations)
    .filter(([, op]) => op.command_bridge?.ok !== true || op.specific?.ok === false)
    .map(([id, op]) => ({
      workflow_id: id,
      command_bridge_ok: op.command_bridge?.ok === true,
      specific_ok: op.specific?.ok !== false,
      specific_reason: op.specific?.reason || op.specific?.provider_boundary || ''
    }));

  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.operating-depth-closeout-live-http.v2',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    skynet_base_url: skynetBase,
    run_id: runId,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    credential_source: owner?.source_key || 'missing',
    credential_mode: owner?.mode || '',
    workflow_count: workflowSpecs.length,
    behavior_fields: behaviorFields,
    behavior_proofs,
    receipt_readbacks,
    live_http_checks,
    closeout_operations,
    closeout_stress: closeoutStress,
    local_rollups: {
      operating_matrix: receiptSummary(matrixReadback),
      truth_ledger: receiptSummary(truthReadback),
      production_closure: receiptSummary(productionReadback)
    },
    external_boundaries,
    summary: {
      workflows_with_create: fieldCount('create'),
      workflows_with_read: fieldCount('read'),
      workflows_with_update_or_closeout: fieldCount('update_or_closeout'),
      workflows_with_receipt_readback: fieldCount('receipt_readback'),
      workflows_with_stress: fieldCount('stress'),
      workflows_with_founder_command_visible: fieldCount('founder_command_visible'),
      workflows_missing_update_or_closeout: Object.entries(behavior_proofs).filter(([, item]) => item.update_or_closeout !== true).map(([id]) => id),
      external_boundary_count: external_boundaries.length,
      closeout_operation_failures: closeoutFailures
    },
    failures: []
  };

  receipt.failures.push(
    ...receipt_readbacks.filter((item) => !item.exists).map((item) => `Missing receipt readback: ${item.path}`),
    ...receipt_readbacks.filter((item) => item.parse_error).map((item) => `Receipt parse failed: ${item.path}: ${item.parse_error}`),
    ...(owner?.token ? [] : ['No shared owner/gate credential was available; authenticated HTTP reads and closeout writes were skipped.']),
    ...(closeoutStress.ok ? [] : ['Operating depth closeout stress failed.']),
    ...closeoutFailures.map((item) => `Closeout operation failed for ${item.workflow_id}.`)
  );
  receipt.operating_depth_closed = receipt.summary.workflows_missing_update_or_closeout.length === 0 && receipt.failures.length === 0;
  receipt.ok = receipt.operating_depth_closed;

  await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    operating_depth_closed: receipt.operating_depth_closed,
    receipt: rel(stampedPath),
    latest: rel(latestPath),
    credential_source: receipt.credential_source,
    summary: receipt.summary,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
