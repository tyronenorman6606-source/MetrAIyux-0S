import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async list({limit = 1000} = {}) {
    return {keys: [...this.map.keys()].slice(0, limit).map(name => ({name}))};
  }
}

function ctx() {
  return {waitUntil() {}};
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status: 404});
      }
    },
    HOUSEOPS_KV: new MemoryKV(),
    ADMIN_TOKEN: 'house-admin',
    ...overrides
  };
}

function req(path, {method = 'GET', body, token} = {}) {
  const headers = body ? {'content-type': 'application/json'} : {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return {response, body};
}

test('HOUSE-01 chooses cloud-backed HouseOperations runtime under /api/houseops', async () => {
  const e = env();

  const health = await call(e, '/api/houseops/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.app_id, 'houseops');
  assert.equal(health.body.app, 'HouseOperations');
  assert.equal(health.body.status, 'LIVE/GATED');
  assert.equal(health.body.runtime_api_base, '/api/houseops');
  assert.equal(health.body.storage_mode, 'houseops_kv');
  assert.equal(health.body.route_families.includes('GET|POST /api/houseops/tasks'), true);
  assert.equal(health.body.route_families.includes('GET|POST /api/houseops/proof'), true);

  const manifest = await call(e, '/api/0s/route-manifest');
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.body.api_bases.houseops, '/api/houseops');
  assert.equal(manifest.body.api_bases.houseoperations, '/api/houseops');
  assert.equal(manifest.body.apps.some(app => app.id === 'houseops' && app.health === '/api/houseops/health'), true);
});

test('HOUSE-02 blocks private source and gates runtime calls', async () => {
  const e = env();
  for (const path of [
    '/HouseOperations/src/houseops-mcp-runtime.js',
    '/HouseOperations/src/houseops-mcp-runtime.source.js',
    '/HouseOperations/src/styles.css'
  ]) {
    const response = await siteWorker.fetch(req(path), e, ctx());
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }

  const blocked = await call(e, '/api/houseops/status');
  assert.equal(blocked.response.status, 401);
});

test('HOUSE-02 proves task, vendor, schedule, alert, assignment, proof, gate packet, export, and board routes', async () => {
  const e = env();
  const token = 'house-admin';

  const task = await call(e, '/api/houseops/tasks', {
    method: 'POST',
    token,
    body: {title: 'Close owner approval', owner: 'House Desk', due: 'Today 14:00', priority: 'high', lane: 'owner', note: 'Approval required before dispatch.'}
  });
  assert.equal(task.response.status, 200);
  assert.equal(task.body.task.title, 'Close owner approval');
  assert.equal(task.body.task_board.open, 1);
  const taskId = task.body.task.id;

  const advancedTask = await call(e, `/api/houseops/tasks/${encodeURIComponent(taskId)}/advance`, {method: 'POST', token});
  assert.equal(advancedTask.response.status, 200);
  assert.equal(advancedTask.body.task.status, 'queued');

  const vendor = await call(e, '/api/houseops/vendors', {
    method: 'POST',
    token,
    body: {name: 'North Valley Supply', request: 'Invoice correction', value: 860, status: 'open', contact: 'billing@example.test'}
  });
  assert.equal(vendor.response.status, 200);
  assert.equal(vendor.body.vendor.name, 'North Valley Supply');
  const vendorId = vendor.body.vendor.id;

  const advancedVendor = await call(e, `/api/houseops/vendors/${encodeURIComponent(vendorId)}/advance`, {method: 'POST', token});
  assert.equal(advancedVendor.response.status, 200);
  assert.equal(advancedVendor.body.vendor.status, 'queued');

  const schedule = await call(e, '/api/houseops/schedule', {
    method: 'POST',
    token,
    body: {time: '16:00', title: 'Maintenance dispatch', lane: 'field', status: 'open', owner: 'Ops Lead'}
  });
  assert.equal(schedule.response.status, 200);
  assert.equal(schedule.body.event.title, 'Maintenance dispatch');

  const assignment = await call(e, '/api/houseops/assignments', {
    method: 'POST',
    token,
    body: {team: 'Field Dispatch', owner: 'Sia', lane: 'schedule', load: 72, status: 'green'}
  });
  assert.equal(assignment.response.status, 200);
  assert.equal(assignment.body.assignment.team, 'Field Dispatch');

  const alert = await call(e, '/api/houseops/alerts', {
    method: 'POST',
    token,
    body: {title: 'Emergency spend approval', owner: 'Owner', due: 'Now', priority: 'high', status: 'blocked', note: 'Owner must approve spend.'}
  });
  assert.equal(alert.response.status, 200);
  assert.equal(alert.body.alert.status, 'blocked');
  const alertId = alert.body.alert.id;

  const resolved = await call(e, `/api/houseops/alerts/${encodeURIComponent(alertId)}/resolve`, {method: 'POST', token});
  assert.equal(resolved.response.status, 200);
  assert.equal(resolved.body.alert.status, 'resolved');

  const proof = await call(e, '/api/houseops/proof', {
    method: 'POST',
    token,
    body: {title: 'HouseOperations cloud route proof', status: 'pass', note: 'Task/vendor/schedule/alert/assignment flow proved.'}
  });
  assert.equal(proof.response.status, 200);
  assert.equal(proof.body.proof.status, 'pass');

  const packet = await call(e, '/api/houseops/gate-packets', {method: 'POST', token, body: {app_id: 'metraiyux-houseoperations'}});
  assert.equal(packet.response.status, 200);
  assert.equal(packet.body.gate_packet.app_id, 'metraiyux-houseoperations');

  for (const path of [
    '/api/houseops/status',
    '/api/houseops/queue',
    '/api/houseops/handoff-packs',
    '/api/houseops/review-board',
    '/api/houseops/execution-board',
    '/api/houseops/dispatch-board',
    '/api/houseops/v1/runtime-summary',
    '/api/houseops/v1/sessions',
    '/api/houseops/exports',
    '/api/houseops/audit'
  ]) {
    const result = await call(e, path, {token});
    assert.notEqual(result.response.status, 404, path);
    assert.equal(result.body.ok, true, path);
  }

  const exported = await call(e, '/api/houseops/exports', {token});
  assert.equal(exported.response.status, 200);
  assert.equal(exported.body.status.task_count, 1);
  assert.equal(exported.body.status.vendor_count, 1);
  assert.equal(exported.body.status.schedule_count, 1);
  assert.equal(exported.body.status.assignment_count, 1);
  assert.equal(exported.body.status.proof_count, 1);
  assert.equal(exported.body.status.gate_packet_count, 1);

  const audit = await call(e, '/api/houseops/audit', {token});
  assert.equal(audit.response.status, 200);
  assert.equal(audit.body.counts.tasks, 1);
  assert.equal(audit.body.counts.vendors, 1);
  assert.equal(audit.body.ready, true);
});

test('HOUSE-01/HOUSE-02 browser surfaces point to /api/houseops without public src dependencies', async () => {
  const [apiBases, platform, contract, claims, indexHtml, runtimeHtml] = await Promise.all([
    readFile(new URL('../assets/js/metraiyux-api-bases.js', import.meta.url), 'utf8'),
    readFile(new URL('../HouseOperations/houseops-platform.js', import.meta.url), 'utf8'),
    readFile(new URL('../HouseOperations/PLATFORM_CONTRACT.json', import.meta.url), 'utf8'),
    readFile(new URL('../HouseOperations/CLAIM_CONTRACT.json', import.meta.url), 'utf8'),
    readFile(new URL('../HouseOperations/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../HouseOperations/runtime.html', import.meta.url), 'utf8')
  ]);

  assert.match(apiBases, /houseops:\s*'\/api\/houseops'/);
  assert.match(apiBases, /houseoperations:\s*'\/api\/houseops'/);
  assert.match(platform, /PRODUCTION_API_BASE = '\/api\/houseops'/);
  assert.match(platform, /endpointHref\(path\)/);
  assert.match(platform, /0S Worker runtime/);
  assert.match(contract, /"base": "\/api\/houseops"/);
  assert.match(contract, /"auth": "operator auth required for all routes except health"/);
  assert.match(claims, /\/api\/houseops\/tasks/);
  assert.match(claims, /\/api\/houseops\/proof/);
  assert.doesNotMatch(indexHtml, /src\/houseops-mcp-runtime|src\/styles/);
  assert.doesNotMatch(runtimeHtml, /src\/houseops-mcp-runtime|src\/styles/);
  assert.match(indexHtml, /metraiyux-api-bases\.js/);
});
