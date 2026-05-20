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
    return {keys:[...this.map.keys()].slice(0, limit).map(name => ({name}))};
  }
}

function ctx() {
  return {waitUntil() {}};
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status:404});
      }
    },
    SKYE_PROFIT_CONSOLE_KV: new MemoryKV(),
    ADMIN_TOKEN: 'profit-admin',
    ...overrides
  };
}

function req(path, {method = 'GET', body, token} = {}) {
  const headers = body ? {'content-type':'application/json'} : {};
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

test('PROFIT-01 chooses cloud-backed SkyeProfitConsole runtime under /api/profit', async () => {
  const e = env();

  const health = await call(e, '/api/profit/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.app_id, 'profit');
  assert.equal(health.body.app, 'SkyeProfitConsole');
  assert.equal(health.body.status, 'LIVE/GATED');
  assert.equal(health.body.runtime_api_base, '/api/profit');
  assert.equal(health.body.storage_mode, 'skye_profit_console_kv');
  assert.equal(health.body.route_families.includes('GET|POST /api/profit/packs'), true);

  const manifest = await call(e, '/api/0s/route-manifest');
  assert.equal(manifest.body.api_bases.profit, '/api/profit');
  assert.equal(manifest.body.api_bases.skyeprofitconsole, '/api/profit');
  assert.equal(manifest.body.apps.some(app => app.id === 'profit' && app.health === '/api/profit/health'), true);
});

test('PROFIT-03 blocks old local runtime source and ungated runtime calls', async () => {
  const e = env();
  for (const path of [
    '/SkyeProfitConsole/runtime/local-runtime.mjs',
    '/SkyeProfitConsole/runtime/store.json',
    '/SkyeProfitConsole/smoke/smoke-proof.mjs'
  ]) {
    const response = await siteWorker.fetch(req(path), e, ctx());
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }

  const oldRoot = await call(e, '/api/runtime/status');
  assert.equal(oldRoot.response.status, 409);
  assert.equal(oldRoot.body.error, 'api_root_collision');

  const blocked = await call(e, '/api/profit/status');
  assert.equal(blocked.response.status, 401);
});

test('PROFIT-03 proves packs, splits, proof, exports, audit, execution, and dispatch', async () => {
  const e = env();
  const token = 'profit-admin';

  const created = await call(e, '/api/profit/packs', {
    method:'POST',
    token,
    body:{
      label:'Free99 Cloud Profit Lane',
      target:'AE-FlowPro',
      notes:'Close this after proof review.',
      snapshot:{runtime:'0S Worker runtime', auditScore:'91 / 100 close confidence', closePackCount:'1'},
      review:{owner:'profit-ops', status:'ready', checkpoint:'profit_positive', notes:'Ready for cloud runtime proof.'},
      recommended_actions:['Verify direct cost', 'Queue execution']
    }
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.body.review_pack.label, 'Free99 Cloud Profit Lane');
  assert.equal(created.body.review_board.ready, 1);
  const packId = created.body.review_pack.id;

  const reviewed = await call(e, `/api/profit/packs/${encodeURIComponent(packId)}/review`, {
    method:'POST',
    token,
    body:{owner:'profit-ops', status:'approved', checkpoint:'approved_for_execution', notes:'Approved.'}
  });
  assert.equal(reviewed.response.status, 200);
  assert.equal(reviewed.body.review_pack.review.status, 'approved');
  assert.equal(reviewed.body.review_board.approved, 1);

  const execution = await call(e, `/api/profit/packs/${encodeURIComponent(packId)}/execution`, {
    method:'POST',
    token,
    body:{owner:'profit-ops', target:'AE-FlowPro', status:'active', label:'Free99 execution', checkpoint:'execution_queued'}
  });
  assert.equal(execution.response.status, 200);
  assert.equal(execution.body.execution_item.status, 'active');
  assert.equal(execution.body.execution_board.active, 1);
  const executionId = execution.body.execution_item.id;

  const dispatch = await call(e, `/api/profit/execution-board/${encodeURIComponent(executionId)}/dispatch`, {
    method:'POST',
    token,
    body:{owner:'profit-ops', target:'AE-FlowPro', channel:'activation', status:'ready', checkpoint:'dispatch_ready'}
  });
  assert.equal(dispatch.response.status, 200);
  assert.equal(dispatch.body.dispatch_item.status, 'ready');
  assert.equal(dispatch.body.dispatch_board.ready, 1);

  const brief = await call(e, '/api/profit/close-briefs', {
    method:'POST',
    token,
    body:{
      packId,
      label:'Free99 Cloud Profit Lane',
      target:'AE-FlowPro',
      owner:'profit-ops',
      ask:9900,
      directCost:2700,
      grossProfit:7200,
      expectedProfit:6552,
      margin:73,
      paybackMultiple:3.6,
      confidence:91,
      action:'ask for the close',
      splitAllocation:[{name:'ae', percent:40, amount:2880}]
    }
  });
  assert.equal(brief.response.status, 200);
  assert.equal(brief.body.close_brief_board.close_now, 1);

  const splits = await call(e, '/api/profit/splits', {
    method:'POST',
    token,
    body:{splits:{ae:35, ops:20, tax:15, reserve:15, reinvest:15}}
  });
  assert.equal(splits.response.status, 200);
  assert.equal(splits.body.splits.ae, 35);

  const proof = await call(e, '/api/profit/proof', {
    method:'POST',
    token,
    body:{type:'profit_cloud_proof', category:'proof', detail:'Cloud-backed profit runtime proof recorded.', owner:'profit-ops'}
  });
  assert.equal(proof.response.status, 200);
  assert.equal(proof.body.workflow_timeline.proof, 1);

  const exported = await call(e, '/api/profit/exports', {token});
  assert.equal(exported.response.status, 200);
  assert.equal(exported.body.state.reviewPacks.some(pack => pack.id === packId), true);
  assert.equal(exported.body.status.close_brief_count, 1);

  const audit = await call(e, '/api/profit/audit', {token});
  assert.equal(audit.response.status, 200);
  assert.equal(audit.body.ok, true);
  assert.equal(audit.body.counts.review_packs, 1);
  assert.equal(audit.body.counts.close_briefs, 1);
  assert.equal(audit.body.counts.execution_items, 1);
  assert.equal(audit.body.counts.dispatch_items, 1);
});

test('PROFIT-03 browser surfaces default to /api/profit with localhost runtime fallback', async () => {
  const [apiBases, platform, truth, indexHtml] = await Promise.all([
    readFile(new URL('../assets/js/metraiyux-api-bases.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeProfitConsole/platform.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeProfitConsole/PLATFORM_TRUTH.json', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeProfitConsole/index.html', import.meta.url), 'utf8')
  ]);

  assert.match(apiBases, /profit:\s*'\/api\/profit'/);
  assert.match(apiBases, /skyeprofitconsole:\s*'\/api\/profit'/);
  assert.match(platform, /return "\/api\/profit"/);
  assert.match(platform, /return "\.\/api\/runtime"/);
  assert.doesNotMatch(platform, /const RUNTIME_BASE = "\.\/api\/runtime"/);
  assert.match(platform, /0S Worker runtime/);
  assert.match(truth, /\/api\/profit\/\*/);
  assert.match(indexHtml, /Runtime pending/);
  assert.match(indexHtml, /gated profit runtime/);
});
