import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

const MME_ROOT = new URL('../Marketing-Made-Easy/', import.meta.url);
const EXPECTED_APPS = [
  'AE-FlowPro',
  'BrandID-Offline-PWA',
  'BusinessLaunchGo',
  'SkyeDocxMax',
  'SkyeWebCreatorMax',
  'WebGrowthOperator',
  'arizona-growth-index',
  'kAIxUBrandKit'
];

function ctx() {
  return { waitUntil() {} };
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 200 });
      }
    },
    ...overrides
  };
}

function req(path, options = {}) {
  return new Request(`https://metraiyux.example${path}`, options);
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, MME_ROOT), 'utf8'));
}

async function assertExists(path) {
  await access(new URL(path, MME_ROOT));
}

test('MME-01 inventories every Marketing Made Easy surface and its local runtime truth', async () => {
  const audit = await readJson('MME_RUNTIME_AUDIT.json');
  assert.equal(audit.decision, 'mounted_same_domain_platform_adapter');
  assert.equal(audit.productionApiBase, '/api/marketing-made-easy');
  assert.match(audit.rootApiPolicy, /\/api\/runtime\/\*/);
  assert.equal(audit.apps.length, EXPECTED_APPS.length);
  assert.deepEqual(audit.apps.map((app) => app.id).sort(), [...EXPECTED_APPS].sort());

  for (const app of audit.apps) {
    assert.equal(app.publicApiMounted, false, app.id);
    assert.match(app.mode, /mounted_module|local|static/, app.id);
    assert.equal(app.mountedUnderPlatform, true, app.id);
    assert.equal(typeof app.operatorTruth, 'string', app.id);
    assert.ok(app.operatorTruth.length > 20, app.id);
    await assertExists(app.publicEntry);
    for (const file of [...(app.runtimeFiles || []), ...(app.privateSourceFiles || [])]) {
      await assertExists(file);
    }
  }
});

test('MME-02 labels same-folder runtimes as local/static proof in the hub and Worker health', async () => {
  const html = await readFile(new URL('index.html', MME_ROOT), 'utf8');
  assert.match(html, /MME_RUNTIME_AUDIT\.json/);
  assert.match(html, /\/api\/marketing-made-easy\/health/);
  assert.match(html, /mounted platform/i);
  assert.match(html, /one gate lane/i);

  const healthRes = await siteWorker.fetch(req('/api/marketing-made-easy/health'), env(), ctx());
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.app_id, 'marketingMadeEasy');
  assert.equal(health.mounted, true);
  assert.equal(health.runtime_mode, 'northstar_style_mounted_platform');
  assert.equal(health.base, '/api/marketing-made-easy');
  assert.equal(health.platform_shell, '/Marketing-Made-Easy/index.html');
  assert.match(health.root_runtime_blocked, /\/api\/runtime\/\*/);
  assert.equal(health.gate_owned, true);

  const collisionRes = await siteWorker.fetch(req('/api/runtime/status'), env(), ctx());
  assert.equal(collisionRes.status, 409);
  const collision = await collisionRes.json();
  assert.equal(collision.error, 'api_root_collision');
  assert.equal(collision.app_id, 'marketingMadeEasy');
  assert.equal(collision.namespaced_base, '/api/marketing-made-easy');
});

test('MME-03 blocks local runtime source and keeps public Marketing Made Easy pages reachable', async () => {
  const blocked = [
    '/Marketing-Made-Easy/AE-FlowPro/runtime/local-runtime.mjs',
    '/Marketing-Made-Easy/AE-FlowPro/src/runtime-contract.json',
    '/Marketing-Made-Easy/BrandID-Offline-PWA/runtime/data/ops-journal.json',
    '/Marketing-Made-Easy/BusinessLaunchGo/netlify/functions/neon-health.js',
    '/Marketing-Made-Easy/BusinessLaunchGo/runtime/store.json',
    '/Marketing-Made-Easy/BusinessLaunchGo/schema.sql',
    '/Marketing-Made-Easy/SkyeWebCreatorMax/runtime/store.json',
    '/Marketing-Made-Easy/kAIxUBrandKit/netlify/functions/kaixu-generate.js',
    '/Marketing-Made-Easy/WebGrowthOperator/netlify/functions/contractor-onboarding-submit.js',
    '/Marketing-Made-Easy/arizona-growth-index/scripts/qa-audit.mjs',
    '/Marketing-Made-Easy/arizona-growth-index/netlify.toml',
    '/Marketing-Made-Easy/SkyeDocxMax/package.json',
    '/Marketing-Made-Easy/SkyeDocxMax/smoke/smoke-proof-contract.mjs'
  ];

  for (const path of blocked) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }

  const publicPages = [
    '/Marketing-Made-Easy/index.html',
    '/Marketing-Made-Easy/SkyeWebCreatorMax/index.html',
    '/Marketing-Made-Easy/WebGrowthOperator/index.html'
  ];

  for (const path of publicPages) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(res.status, 200, path);
  }
});
