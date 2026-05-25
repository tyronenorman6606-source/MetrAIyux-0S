import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const siteWorker = (await import('../cloudflare/worker.js')).default;
const { handleSkyeNetDeployRequest } = await import('../skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs');
const fs27Worker = (await import('../skyegate/source/SkyeGateFS27/cloudflare/worker.mjs')).default;

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async put(key, value, options = {}) {
    this.map.set(key, { value: String(value), options });
  }

  async get(key, options = {}) {
    const stored = this.map.get(key);
    if (!stored) return null;
    return options.type === 'json' ? JSON.parse(stored.value) : stored.value;
  }

  async list({ prefix = '', limit = 1000 } = {}) {
    const keys = [...this.map.keys()]
      .filter((key) => key.startsWith(prefix))
      .slice(0, limit)
      .map((name) => ({ name, metadata: this.map.get(name)?.options?.metadata || null }));
    return { keys, list_complete: true };
  }
}

class MemoryR2 {
  constructor() {
    this.map = new Map();
  }

  async put(key, value, options = {}) {
    const body = typeof value === 'string' ? value : await new Response(value).arrayBuffer();
    this.map.set(key, {
      body,
      options,
      size: typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength,
      uploaded: new Date()
    });
  }

  async get(key) {
    const stored = this.map.get(key);
    if (!stored) return null;
    const body = stored.body;
    return {
      key,
      body,
      size: stored.size,
      uploaded: stored.uploaded,
      customMetadata: stored.options?.customMetadata || {},
      async text() {
        return typeof body === 'string' ? body : new TextDecoder().decode(body);
      },
      async json() {
        return JSON.parse(await this.text());
      },
      writeHttpMetadata(headers) {
        const type = stored.options?.httpMetadata?.contentType;
        if (type) headers.set('content-type', type);
      }
    };
  }

  async list({ prefix = '', limit = 1000 } = {}) {
    return {
      objects: [...this.map.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((key) => ({
          key,
          size: this.map.get(key)?.size || 0,
          uploaded: this.map.get(key)?.uploaded || new Date()
        }))
    };
  }
}

function ctx() {
  return { waitUntil() {} };
}

function fs27ServiceBinding(fsEnv) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/auth-introspect') {
        const body = await request.json().catch(() => ({}));
        if (body.token === 'gate-token') {
          return Response.json({
            active: true,
            sub: 'owner',
            email: 'owner@example.invalid',
            role: 'admin',
            scope: 'admin.read admin.write gateway.invoke',
            customer_id: 31,
            workspace_id: 'metraiyux-0s-owner'
          });
        }
        return Response.json({ active: false });
      }
      if (url.pathname.startsWith('/skyenet/')) {
        const route = await fsEnv.ROUTING_KV.get(`route:v1:host:${url.hostname}:path:/skyenet/demo-public`, { type: 'json' });
        if (!route) return new Response('missing route', { status: 404 });
        const object = await fsEnv.DEPLOYMENT_ASSET_BUCKET.get(`${route.asset_prefix}/index.html`);
        if (!object) return new Response('missing asset', { status: 404 });
        return new Response(await object.text(), {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-skynet-route': 'r2-deployment',
            'x-skynet-project-id': route.project_id
          }
        });
      }
      return handleSkyeNetDeployRequest(request, { env: fsEnv });
    }
  };
}

function actualFs27ServiceBinding(fsEnv) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/auth-introspect') {
        const body = await request.json().catch(() => ({}));
        if (body.token === 'gate-token') {
          return Response.json({
            active: true,
            sub: 'owner',
            email: 'owner@example.invalid',
            role: 'admin',
            scope: 'admin.read admin.write gateway.invoke',
            customer_id: 31,
            workspace_id: 'metraiyux-0s-owner'
          });
        }
        return Response.json({ active: false });
      }
      return fs27Worker.fetch(request, fsEnv, ctx());
    }
  };
}

function env() {
  const fsEnv = {
    DEPLOYMENT_ASSET_BUCKET: new MemoryR2(),
    ROUTING_KV: new MemoryKV(),
    REQUEST_LOG_BUCKET: new MemoryR2()
  };
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    },
    SKYGATEFS27_WORKER: fs27ServiceBinding(fsEnv),
    __fsEnv: fsEnv
  };
}

function envWithActualFs27() {
  const fsEnv = {
    DEPLOYMENT_ASSET_BUCKET: new MemoryR2(),
    ROUTING_KV: new MemoryKV(),
    SKYENET_WORKSPACES_KV: new MemoryKV(),
    SKYENET_RECEIPTS_KV: new MemoryKV(),
    REQUEST_LOG_BUCKET: new MemoryR2(),
    ASSETS: {
      async fetch(request) {
        return new Response(`fs27-asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    }
  };
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    },
    SKYGATEFS27_WORKER: actualFs27ServiceBinding(fsEnv),
    __fsEnv: fsEnv
  };
}

function req(path, { method = 'GET', token, headers = {}, body } = {}) {
  const finalHeaders = {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...headers
  };
  const init = { method, headers: finalHeaders };
  if (body !== undefined) {
    if (typeof body === 'string' || body instanceof ArrayBuffer) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      finalHeaders['content-type'] ||= 'application/json';
    }
  }
  return new Request(`https://metraiyux.example${path}`, init);
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test('SN-01 SkyeNet 0S API requires the shared operator gate', async () => {
  const e = env();
  const result = await call(e, '/api/skyenet/status');
  assert.equal(result.response.status, 401);
  assert.match(result.data.error, /Missing|Unauthorized|Inactive/i);
});

test('SN-02 SkyeNet status and route manifest expose the gated deploy lane', async () => {
  const e = env();
  const status = await call(e, '/api/skyenet/status', { token: 'gate-token' });
  assert.equal(status.response.status, 200);
  assert.equal(status.data.ok, true);
  assert.equal(status.data.skynet.service, 'fs27-skynet');
  assert.equal(status.data.skynet.capabilities.static_drop_hosting, true);
  assert.equal(status.data.skynet.capabilities.signed_function_bundle_manifest, true);
  assert.equal(status.data.skynet.capabilities.owned_skyenet_functions_runtime_v1, true);
  assert.equal(status.data.skynet.capabilities.function_runtime_env_isolation, true);
  assert.equal(status.data.skynet.capabilities.function_runtime_egress_default_deny, true);
  assert.equal(status.data.skynet.capabilities.arbitrary_uploaded_serverless_functions, false);

  const manifest = await call(e, '/api/0s/route-manifest', { token: 'gate-token' });
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.data.api_bases.skynet, '/api/skyenet');
  assert.ok(manifest.data.apps.some((app) => app.id === 'skyenet' && app.base === '/api/skyenet'));
});

test('SN-03 SkyeNet proxy initializes, uploads, completes, and registers a route through FS27', async () => {
  const e = env();
  const token = 'gate-token';
  const projectId = 'demo-surface';
  const deploymentId = 'dep_demo_001';

  const init = await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, title: 'Demo Surface' }
  });
  assert.equal(init.response.status, 200);
  assert.equal(init.data.skynet.asset_prefix, `deployments/${projectId}/${deploymentId}`);

  const uploadParams = new URLSearchParams({ projectId, deploymentId, path: 'index.html' });
  const upload = await call(e, `/api/skyenet/deploy/upload?${uploadParams.toString()}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<h1>SkyeNet demo</h1>'
  });
  assert.equal(upload.response.status, 200);
  assert.equal(upload.data.skynet.path, 'index.html');

  const complete = await call(e, '/api/skyenet/deploy/complete', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, files: ['index.html'] }
  });
  assert.equal(complete.response.status, 200);
  assert.equal(complete.data.skynet.files, 1);

  const route = await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/demo',
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: false,
      default_auth: 'gate'
    }
  });
  assert.equal(route.response.status, 200);
  assert.equal(route.data.skynet.route.project_id, projectId);
  assert.equal(route.data.skynet.route.customer_id, '31');

  const routes = await call(e, '/api/skyenet/routes?host=metraiyux.example', { token });
  assert.equal(routes.response.status, 200);
  assert.equal(routes.data.skynet.count, 1);
  assert.equal(routes.data.skynet.routes[0].route.active_deployment_id, deploymentId);
});

test('SN-04 SkyeNet published path serves uploaded asset without 0S gate redirect', async () => {
  const e = env();
  const token = 'gate-token';
  const projectId = 'demo-public';
  const deploymentId = 'dep_demo_public';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, title: 'Demo Public' }
  })).response.status, 200);

  const uploadParams = new URLSearchParams({ projectId, deploymentId, path: 'index.html' });
  assert.equal((await call(e, `/api/skyenet/deploy/upload?${uploadParams.toString()}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<h1>Public SkyeNet Asset</h1>'
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/complete', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, files: ['index.html'] }
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/demo-public',
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: true,
      default_auth: 'public'
    }
  })).response.status, 200);

  const live = await siteWorker.fetch(req('/skyenet/demo-public'), e, ctx());
  const text = await live.text();
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-0s-skynet-surface-proxy'), 'fs27-service-binding');
  assert.equal(live.headers.get('x-skynet-route'), 'r2-deployment');
  assert.match(text, /Public SkyeNet Asset/);
});

test('SN-05 SkyeNet public resolver serves routes with human mount names and legacy internal host fallback', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'human-name-public';
  const deploymentId = 'dep_human_public';
  const rawMount = '/skyenet/Gray Skyes Demo';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, title: 'Human Name Public' }
  })).response.status, 200);

  const uploadParams = new URLSearchParams({ projectId, deploymentId, path: 'index.html' });
  assert.equal((await call(e, `/api/skyenet/deploy/upload?${uploadParams.toString()}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<h1>Human route SkyeNet Asset</h1>'
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/complete', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, files: ['index.html'] }
  })).response.status, 200);

  const route = await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      mount_path: rawMount,
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: true,
      default_auth: 'public'
    }
  });
  assert.equal(route.response.status, 200);
  assert.equal(route.data.skynet.route.hostname, 'metraiyux.example');
  assert.equal(route.data.skynet.route.mount_path, '/skyenet/Gray%20Skyes%20Demo');
  assert.match(route.data.skynet.live_url, /\/skyenet\/Gray%20Skyes%20Demo\/$/);

  const live = await siteWorker.fetch(req('/skyenet/Gray%20Skyes%20Demo/'), e, ctx());
  const text = await live.text();
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-0s-skynet-surface-proxy'), 'fs27-service-binding');
  assert.equal(live.headers.get('x-skynet-route'), 'r2-deployment');
  assert.match(text, /Human route SkyeNet Asset/);
});
