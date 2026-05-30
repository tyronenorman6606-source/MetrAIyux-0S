import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyecommerce-live-production-stress');
const baseUrl = (process.env.SKYE_COMMERCE_PRODUCTION_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const cycles = Number(process.env.SKYE_COMMERCE_STRESS_CYCLES || 20);
const concurrency = Number(process.env.SKYE_COMMERCE_STRESS_CONCURRENCY || 12);

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function stripBearer(value = '') {
  return unquote(value).replace(/^Bearer\s+/i, '').trim();
}

function parseEnv(file) {
  if (!fsSync.existsSync(file)) return {};
  const rows = {};
  for (const raw of fsSync.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function resolveEnvValue(rows, value, seen = new Set()) {
  const text = stripBearer(value);
  const alias = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/)?.[1];
  if (!alias || seen.has(alias)) return text;
  seen.add(alias);
  return resolveEnvValue(rows, rows[alias] || '', seen);
}

function ownerGateCandidates() {
  const rows = parseEnv(path.join(repoRoot, '.env'));
  const keys = [
    'FREE99_ADMIN_CODE',
    'FREE99_ADMIN_PASSWORD',
    'FREE99_GATE_CODE',
    'FREE99_GATE_PASSWORD',
    'FREE99_OWNER_CODE',
    'FREE99_OWNER_PASSWORD',
    'FREE99_PASSWORD',
    'ZERO_OS_GATE_CODE',
    'ZERO_OS_ADMIN_CODE',
    'METRAIYUX_OWNER_ADMIN_CODE',
    'OWNER_ADMIN_CODE',
    'OWNER_ADMIN_PASSWORD',
    'ADMIN_CODE',
    'ADMIN_PASSWORD',
    'FS27_ADMIN_CODE',
    'FS27_ADMIN_PASSWORD',
    'FS27_OWNER_CODE',
    'FS27_OWNER_PASSWORD',
    'SKYE_GATE_ADMIN_CODE',
    'SKYE_GATE_ADMIN_PASSWORD',
    'SKYE_GATE_OWNER_CODE',
    'SKYE_GATE_OWNER_PASSWORD',
    'SKYGATE_ADMIN_CODE',
    'SKYGATE_ADMIN_PASSWORD',
    'SKYGATE_OWNER_CODE',
    'SKYGATE_OWNER_PASSWORD',
    'SKYGATEFS27_ADMIN_CODE',
    'SKYGATEFS27_ADMIN_PASSWORD',
    'SKYGATEFS27_OWNER_CODE',
    'SKYGATEFS27_OWNER_PASSWORD',
    'SKYGATEFS13_ADMIN_PASSWORD',
    'QA_ADMIN_PASSWORD',
    'PHC_BOOTSTRAP_ADMIN_CODE',
    'SITE_OPERATOR_ADMIN_TOKEN',
    'METRAIYUX_ADMIN_TOKEN',
    'ADMIN_TOKEN',
    'SKYGATEFS13_WORKER_ADMIN_TOKEN',
    'MCP_HTTP_BEARER_TOKEN'
  ];
  const merged = { ...rows };
  for (const key of keys) {
    if (process.env[key] && !merged[key]) merged[key] = process.env[key];
  }
  return [...new Set(keys
    .flatMap((key) => [merged[key] || '', resolveEnvValue(merged, merged[key] || '')])
    .map(stripBearer)
    .filter((value) => value && value.length >= 4))];
}

async function findAcceptedGateCode(candidates) {
  for (const code of candidates) {
    const response = await fetch(`${baseUrl}/SkyeCommerce/api/auth/me`, {
      headers: { 'x-free99-admin-code': code },
      redirect: 'manual'
    });
    if (response.status === 200) return code;
  }
  throw new Error('No accepted shared 0S gate credential found for production stress.');
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function textIncludes(body, needle) {
  return String(body || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

const scenarios = [
  { label: 'overview', method: 'GET', path: '/SkyeCommerce/', status: 200, text: 'SkyeCommerce Foundation' },
  { label: 'merchant-command', method: 'GET', path: '/SkyeCommerce/merchant/', status: 200, text: 'Merchant profile' },
  { label: 'design-studio', method: 'GET', path: '/SkyeCommerce/design/', status: 200, text: 'Design Studio' },
  { label: 'storefront', method: 'GET', path: '/SkyeCommerce/store/?slug=metraiyux-0s-commerce', status: 200, text: 'Storefront' },
  { label: 'document-desk', method: 'GET', path: '/SkyeCommerce/docs/', status: 200, text: 'Document Desk' },
  { label: 'api-health', method: 'GET', path: '/SkyeCommerce/api/health', status: 200, json: (body) => body?.ok === true && body?.hasDb === true && body?.docsLane === 'shared_0s_sovereigndocs' },
  { label: 'api-auth-me-shared-gate', method: 'GET', path: '/SkyeCommerce/api/auth/me', status: 200, json: (body) => body?.session?.sharedGate === true },
  {
    label: 'api-sovereigndocs-kit',
    method: 'GET',
    path: '/SkyeCommerce/api/docs/sovereigndocs-kit',
    status: 200,
    json: (body) => body?.ok === true && (body?.kit?.templates?.length >= 8 || body?.templates?.length >= 8)
  },
  {
    label: 'blocked-app-local-owner-auth',
    method: 'POST',
    path: '/SkyeCommerce/api/merchant/register',
    status: 409,
    body: () => ({
      brandName: 'Blocked Stress Proof',
      slug: `blocked-stress-${Date.now().toString(36)}`,
      email: 'blocked-stress@example.com',
      password: 'blocked-stress-password'
    }),
    json: (body) => body?.code === 'shared_gate_owner_auth'
  }
];

async function runScenario(scenario, gateCode) {
  const started = performance.now();
  const headers = { 'x-free99-admin-code': gateCode };
  let body;
  if (scenario.body) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(scenario.body());
  }
  const response = await fetch(`${baseUrl}${scenario.path}`, {
    method: scenario.method,
    headers,
    body,
    redirect: 'manual'
  });
  const elapsedMs = Math.round(performance.now() - started);
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  let parsed = null;
  if (contentType.includes('json') || raw.trim().startsWith('{')) {
    parsed = JSON.parse(raw);
  }
  const statusOk = response.status === scenario.status;
  const textOk = scenario.text ? textIncludes(raw, scenario.text) : true;
  const jsonOk = scenario.json ? scenario.json(parsed) : true;
  return {
    label: scenario.label,
    method: scenario.method,
    path: scenario.path,
    status: response.status,
    ok: statusOk && textOk && jsonOk,
    elapsedMs,
    checks: { statusOk, textOk, jsonOk },
    bytes: raw.length
  };
}

await fs.mkdir(artifactDir, { recursive: true });

const unauth = await fetch(`${baseUrl}/SkyeCommerce/`, { redirect: 'manual' });
const receipt = {
  ok: false,
  mode: 'skyecommerce-live-production-stress',
  baseUrl,
  cycles,
  concurrency,
  startedAt: new Date().toISOString(),
  gate: {
    unauthenticatedStatus: unauth.status,
    unauthenticatedLocation: unauth.headers.get('location') || '',
    unauthenticatedRedirectsToLogin: unauth.status === 302 && /\/admin\/login\.html/.test(unauth.headers.get('location') || '')
  },
  scenarioSummary: {},
  timings: {},
  failures: []
};

const gateCode = await findAcceptedGateCode(ownerGateCandidates());
const queue = [];
for (let cycle = 0; cycle < cycles; cycle += 1) {
  for (const scenario of scenarios) queue.push(scenario);
}

const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < queue.length) {
    const index = cursor;
    cursor += 1;
    try {
      results[index] = await runScenario(queue[index], gateCode);
    } catch (error) {
      results[index] = {
        label: queue[index]?.label || 'unknown',
        method: queue[index]?.method || '',
        path: queue[index]?.path || '',
        status: 0,
        ok: false,
        elapsedMs: 0,
        error: error.message || String(error)
      };
    }
  }
}));

const durations = results.map((item) => item.elapsedMs).filter(Boolean);
for (const scenario of scenarios) {
  const rows = results.filter((item) => item.label === scenario.label);
  receipt.scenarioSummary[scenario.label] = {
    ok: rows.every((item) => item.ok),
    count: rows.length,
    statusCounts: rows.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
    failures: rows.filter((item) => !item.ok).slice(0, 5)
  };
}
receipt.timings = {
  count: durations.length,
  minMs: durations.length ? Math.min(...durations) : 0,
  p50Ms: percentile(durations, 0.5),
  p95Ms: percentile(durations, 0.95),
  maxMs: durations.length ? Math.max(...durations) : 0
};
receipt.totalRequests = results.length + 2;
receipt.passedRequests = results.filter((item) => item.ok).length;
receipt.failedRequests = results.filter((item) => !item.ok).length;
receipt.failures = results.filter((item) => !item.ok).slice(0, 20);
receipt.ok = receipt.gate.unauthenticatedRedirectsToLogin && receipt.failedRequests === 0;
receipt.finishedAt = new Date().toISOString();

const receiptPath = path.join(artifactDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-stress.json`);
receipt.receiptPath = receiptPath;
await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
await fs.writeFile(path.join(artifactDir, 'latest.json'), JSON.stringify(receipt, null, 2));

console.log(JSON.stringify({
  ok: receipt.ok,
  totalRequests: receipt.totalRequests,
  passedRequests: receipt.passedRequests,
  failedRequests: receipt.failedRequests,
  p95Ms: receipt.timings.p95Ms,
  receiptPath
}, null, 2));
