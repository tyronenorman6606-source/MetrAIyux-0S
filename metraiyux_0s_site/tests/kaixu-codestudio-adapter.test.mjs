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
    ...overrides
  };
}

function req(path, {method = 'GET', body, token} = {}) {
  const headers = body ? {'content-type':'application/json'} : {};
  if (token) headers['x-admin-token'] = token;
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function data(response) {
  return response.json();
}

test('KAI-02 root /api/platform routes are blocked with a namespaced repair path', async () => {
  const res = await siteWorker.fetch(req('/api/platform/projects'), env(), ctx());
  assert.equal(res.status, 409);
  const body = await data(res);
  assert.equal(body.error, 'api_root_collision');
  assert.equal(body.namespaced_base, '/api/kaixu-codestudio');
  assert.equal(body.namespaced_path, '/api/kaixu-codestudio/platform/projects');
});

test('KAI-01 health marks CodeStudio as same-domain local/static proof adapter', async () => {
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/health'), env(), ctx());
  assert.equal(res.status, 200);
  const body = await data(res);
  assert.equal(body.app_id, 'kaixuCodestudio');
  assert.equal(body.mounted, true);
  assert.equal(body.status, 'LOCAL/PARTIAL');
  assert.equal(body.execution_mode, 'same_domain_control_plane_adapter');
  assert.equal(body.platform_api_base, '/api/kaixu-codestudio/platform');
  assert.equal(body.storage_mode, 'not_configured');
});

test('KAI-02 public catalog/status routes are namespaced and non-404', async () => {
  const e = env();
  const packs = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/provider-packs'), e, ctx());
  assert.equal(packs.status, 200);
  const packsBody = await data(packs);
  assert.equal(packsBody.packs.some(pack => pack.id === 'stripe'), true);

  const openapi = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/openapi.json'), e, ctx());
  assert.equal(openapi.status, 200);
  const openapiBody = await data(openapi);
  assert.ok(openapiBody.paths['/api/kaixu-codestudio/platform/projects']);

  const projects = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects'), e, ctx());
  assert.equal(projects.status, 200);
  const projectsBody = await data(projects);
  assert.equal(projectsBody.projects[0].id, 'default');
});

test('KAI-02 platform mutations require operator auth before storage writes', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(res.status, 401);
  const body = await data(res);
  assert.match(body.error, /Unauthorized kAIxu CodeStudio platform mutation/);
});

test('KAI-02 configured CodeStudio service bindings still get edge auth on platform mutations', async () => {
  const calls = [];
  const e = env({
    ADMIN_TOKEN:'secret',
    KAIXU_CODESTUDIO_WORKER: {
      async fetch(request) {
        calls.push(new URL(request.url).pathname);
        return Response.json({ok:true, path:new URL(request.url).pathname});
      }
    }
  });

  const blocked = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(blocked.status, 401);
  assert.deepEqual(calls, []);

  const allowed = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    token:'secret',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(allowed.status, 200);
  const allowedBody = await data(allowed);
  assert.equal(allowedBody.path, '/api/platform/projects');
  assert.deepEqual(calls, ['/api/platform/projects']);
});

test('KAI-02 authenticated project mutation persists through the namespaced adapter', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const created = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    token:'secret',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(created.status, 200);
  const createdBody = await data(created);
  assert.equal(createdBody.project.id, 'client-a');
  assert.equal(createdBody.receipt.type, 'project_upsert');

  const listed = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects'), e, ctx());
  const listedBody = await data(listed);
  assert.equal(listedBody.projects.some(project => project.id === 'client-a'), true);
});

test('KAI-01 authenticated paid/provider actions are queued, not fake-executed', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/provider-packs/stripe/actions/checkout.create/run', {
    method:'POST',
    token:'secret',
    body:{projectId:'default', input:{amountCents:1300}}
  }), e, ctx());
  assert.equal(res.status, 202);
  const body = await data(res);
  assert.equal(body.ok, false);
  assert.equal(body.executed, false);
  assert.equal(body.status, 'queued_for_operator_review');
  assert.equal(body.receipt.type, 'platform_execution_blocked');
});

test('KAI-02 CodeStudio browser bridge maps root platform paths to the namespaced 0S base', async () => {
  const source = await readFile(new URL('../Free99/apps/kaixu-codestudio/app/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../Free99/apps/kaixu-codestudio/app/index.html', import.meta.url), 'utf8');
  assert.match(source, /PLATFORM_0S_BACKEND_BASE = '\/api\/kaixu-codestudio'/);
  assert.match(source, /function platformBackendUrl/);
  assert.match(source, /raw\.slice\('\/api'\.length\)/);
  assert.match(html, /metraiyux-api-bases\.js/);
});
