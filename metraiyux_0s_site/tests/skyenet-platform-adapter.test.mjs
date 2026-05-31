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

  async get(key, options = {}) {
    const stored = this.map.get(key);
    if (!stored) return null;
    const originalBody = stored.body;
    const range = options?.range;
    let body = originalBody;
    if (range && Number.isFinite(range.offset) && Number.isFinite(range.length)) {
      const start = Math.max(0, Number(range.offset));
      const end = start + Math.max(0, Number(range.length));
      body = typeof originalBody === 'string'
        ? originalBody.slice(start, end)
        : originalBody.slice(start, end);
    }
    return {
      key,
      body,
      size: stored.size,
      uploaded: stored.uploaded,
      httpEtag: `"mem-${stored.size}-${key.replace(/[^A-Za-z0-9]+/g, '-').slice(0, 48)}"`,
      customMetadata: stored.options?.customMetadata || {},
      async text() {
        return typeof body === 'string' ? body : new TextDecoder().decode(body);
      },
      async arrayBuffer() {
        return typeof body === 'string' ? new TextEncoder().encode(body).buffer : body;
      },
      async json() {
        return JSON.parse(await this.text());
      },
      writeHttpMetadata(headers) {
        const type = stored.options?.httpMetadata?.contentType;
        if (type) headers.set('content-type', type);
        const cacheControl = stored.options?.httpMetadata?.cacheControl;
        if (cacheControl) headers.set('cache-control', cacheControl);
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
  assert.equal(status.data.skynet.capabilities.static_asset_conditional_last_modified, true);

  const manifest = await call(e, '/api/0s/route-manifest', { token: 'gate-token' });
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.data.api_bases.skynet, '/api/skyenet');
  assert.ok(manifest.data.apps.some((app) => app.id === 'skyenet' && app.base === '/api/skyenet'));
});

test('SN-02b SkyeNet exposes approved support, observability, receipts, cost, and customer export lanes', async () => {
  const e = envWithActualFs27();
  await e.__fsEnv.REQUEST_LOG_BUCKET.put('runtime-logs/yyyy=2026/mm=05/skyenet-proof.jsonl', '{"schema":"fs27.runtime_request.v1"}\n');
  const token = 'gate-token';

  const status = await call(e, '/api/skyenet/status', { token });
  assert.equal(status.response.status, 200);
  assert.equal(status.data.skynet.capabilities.customer_support_profile, true);
  assert.equal(status.data.skynet.capabilities.customer_export_bundle, true);
  assert.equal(status.data.skynet.capabilities.customer_export_private_source_embedded, false);
  assert.equal(status.data.skynet.capabilities.runtime_observability, true);
  assert.equal(status.data.skynet.capabilities.runtime_log_exports, true);

  const support = await call(e, '/api/skyenet/support', { token });
  assert.equal(support.response.status, 200);
  assert.equal(support.data.skynet.support.source, 'https://skyenet.skyesol/leadership/SkyesOverLondon.html');
  assert.equal(support.data.skynet.support.operations.email, 'SkyesOverLondonLC@solenterprises.org');
  assert.equal(support.data.skynet.support.founder.email, 'GrayLondonSkyes@solenterprises.org');
  assert.equal(support.data.skynet.support.general.email, 'Contact@solenterprises.org');
  assert.equal(support.data.skynet.support.b2b.email, 'B2B@solenterprises.org');
  assert.equal(support.data.skynet.support.hardcoded_wrong_contact_fallbacks, false);

  const observability = await call(e, '/api/skyenet/observability?limit=5', { token });
  assert.equal(observability.response.status, 200);
  assert.equal(observability.data.skynet.sinks.r2_runtime_logs, true);
  assert.equal(observability.data.skynet.sinks.r2_runtime_log_list, true);
  assert.ok(observability.data.skynet.latest_log_objects.some((item) => item.key.includes('skyenet-proof.jsonl')));

  const receipts = await call(e, '/api/skyenet/receipts?workspace_id=metraiyux-0s-owner', { token });
  assert.equal(receipts.response.status, 200);
  assert.equal(receipts.data.skynet.ok, true);
  assert.ok(Array.isArray(receipts.data.skynet.receipts));

  const cost = await call(e, '/api/skyenet/cost-model', { token });
  assert.equal(cost.response.status, 200);
  assert.equal(cost.data.skynet.cost_model.currency, 'usd');

  const exported = await call(e, '/api/skyenet/export?workspace_id=metraiyux-0s-owner&limit=5', { token });
  assert.equal(exported.response.status, 200);
  assert.equal(exported.data.skynet.schema, 'fs27.skynet.customer_export.v1');
  assert.equal(exported.data.skynet.redaction_policy.raw_bearer_tokens_included, false);
  assert.equal(exported.data.skynet.redaction_policy.raw_env_secret_values_included, false);
  assert.equal(exported.data.skynet.support.operations.email, 'SkyesOverLondonLC@solenterprises.org');
  assert.equal(exported.data.skynet.observability.sinks.r2_runtime_logs, true);
  assert.ok(!JSON.stringify(exported.data.skynet).includes('gate-token'));
});

test('SN-02c SkyeNet source archive link is mounted through the actual FS27 Worker route table', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'source-link-route';
  const deploymentId = 'dep_source_link';

  const index = await call(e, `/api/skyenet/source-index?project_id=${projectId}&deployment_id=${deploymentId}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
    body: '{"path":"src/app.js","size":22,"content_type":"text/javascript; charset=utf-8"}\n'
  });
  assert.equal(index.response.status, 200);
  const prefix = index.data.skynet.source_package.prefix;

  const missingLink = await call(e, '/api/skyenet/source-archive-link', {
    method: 'POST',
    token,
    body: {
      project_id: projectId,
      deployment_id: deploymentId,
      key: `${prefix}/.skyenet/archive/source.tar.zst`,
      filename: 'source.tar.zst',
      bytes: 1,
      sha256: '84f81d49f65775e9a765a383a333c81d68ae7bdc7c35a72f29616401d4009c8b',
      content_type: 'application/zstd'
    }
  });
  assert.equal(missingLink.response.status, 404);
  assert.equal(missingLink.data.skynet.code, 'SOURCE_ARCHIVE_OBJECT_NOT_FOUND');
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

  const source = await siteWorker.fetch(req(`/api/skyenet/source-download?project_id=${projectId}&deployment_id=${deploymentId}`, { token }), e, ctx());
  assert.equal(source.status, 200);
  assert.equal(source.headers.get('content-type'), 'application/x-tar');
  assert.equal(source.headers.get('x-0s-skynet-source-download-proxy'), 'passthrough');
  const tarText = Buffer.from(await source.arrayBuffer()).toString('utf8');
  assert.match(tarText, /\.skyenet\/source-manifest\.json/);
  assert.match(tarText, /index\.html/);
  assert.match(tarText, /SkyeNet demo/);

  const manifest = await call(e, `/api/skyenet/source-manifest?project_id=${projectId}&deployment_id=${deploymentId}`, { token });
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.data.skynet.source_mode, 'public-deployment-files');
  assert.deepEqual(manifest.data.skynet.files, ['index.html']);

  const tree = await call(e, `/api/skyenet/source-tree?project_id=${projectId}&deployment_id=${deploymentId}`, { token });
  assert.equal(tree.response.status, 200);
  assert.ok(tree.data.skynet.entries.some((entry) => entry.type === 'file' && entry.path === 'index.html'));

  const file = await call(e, `/api/skyenet/source-file?project_id=${projectId}&deployment_id=${deploymentId}&path=index.html`, { token });
  assert.equal(file.response.status, 200);
  assert.equal(file.data.skynet.path, 'index.html');
  assert.match(file.data.skynet.text, /SkyeNet demo/);

  const search = await call(e, `/api/skyenet/source-search?project_id=${projectId}&deployment_id=${deploymentId}&q=demo`, { token });
  assert.equal(search.response.status, 200);
  assert.ok(search.data.skynet.results.some((result) => result.path === 'index.html'));

  const sourceIndex = await call(e, `/api/skyenet/source-index?project_id=${projectId}&deployment_id=${deploymentId}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
    body: '{"path":"src/app.js","size":22,"content_type":"text/javascript; charset=utf-8"}\n'
  });
  assert.equal(sourceIndex.response.status, 200);
  assert.equal(sourceIndex.data.skynet.source_index.file_count, 1);
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

test('SN-05b SkyeNet honors Netlify-style _redirects and _headers from deployment assets', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'rules-demo';
  const deploymentId = 'dep_rules_demo';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, title: 'Rules Demo' }
  })).response.status, 200);

  const uploads = [
    ['index.html', '<h1>SPA Shell</h1>'],
    ['landing.html', '<h1>Landing Target</h1>'],
    ['toml.html', '<h1>Toml Target</h1>'],
    ['force-me.html', '<h1>Force Source</h1>'],
    ['contact.html', '<form name="contact" method="POST" data-netlify="true"><input name="form-name" value="contact"></form>'],
    ['assets/data.txt', '0123456789abcdef'],
    ['_redirects', '/old /landing.html 301\n/app/* /index.html 200\n/landing.html /index.html 200\n/force-me.html /index.html 200!\n'],
    ['_headers', '/*\n  X-SkyeNet-Test: rules-applied\n/landing.html\n  X-Landing-Header: yes\n'],
    ['netlify.toml', '[[redirects]]\nfrom = "/toml-old"\nto = "/toml.html"\nstatus = 302\n\n[[headers]]\nfor = "/toml.html"\n[headers.values]\nX-Toml-Header = "yes"\n']
  ];
  for (const [assetPath, body] of uploads) {
    const params = new URLSearchParams({ projectId, deploymentId, path: assetPath });
    assert.equal((await call(e, `/api/skyenet/deploy/upload?${params.toString()}`, {
      method: 'PUT',
      token,
      headers: { 'content-type': assetPath.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' },
      body
    })).response.status, 200);
  }

  assert.equal((await call(e, '/api/skyenet/deploy/complete', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, files: uploads.map(([assetPath]) => assetPath) }
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/rules-demo',
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: true,
      default_auth: 'public'
    }
  })).response.status, 200);

  const redirect = await siteWorker.fetch(req('/skyenet/rules-demo/old'), e, ctx());
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('x-skynet-route'), 'netlify-redirect');
  assert.equal(redirect.headers.get('location'), 'https://metraiyux.example/skyenet/rules-demo/landing.html');

  const landing = await siteWorker.fetch(req('/skyenet/rules-demo/landing.html'), e, ctx());
  assert.equal(landing.status, 200);
  assert.equal(landing.headers.get('x-skynet-route'), 'r2-deployment');
  assert.equal(landing.headers.get('x-skyenet-test'), 'rules-applied');
  assert.equal(landing.headers.get('x-landing-header'), 'yes');
  assert.match(await landing.text(), /Landing Target/);

  const rewrite = await siteWorker.fetch(req('/skyenet/rules-demo/app/deep/link'), e, ctx());
  assert.equal(rewrite.status, 200);
  assert.equal(rewrite.headers.get('x-skynet-route'), 'netlify-rewrite');
  assert.equal(rewrite.headers.get('x-skynet-rewrite-target'), '/index.html');
  assert.match(await rewrite.text(), /SPA Shell/);

  const forcedRewrite = await siteWorker.fetch(req('/skyenet/rules-demo/force-me.html'), e, ctx());
  assert.equal(forcedRewrite.status, 200);
  assert.equal(forcedRewrite.headers.get('x-skynet-route'), 'netlify-rewrite');
  assert.equal(forcedRewrite.headers.get('x-skynet-rewrite-target'), '/index.html');
  assert.match(await forcedRewrite.text(), /SPA Shell/);

  const tomlRedirect = await siteWorker.fetch(req('/skyenet/rules-demo/toml-old'), e, ctx());
  assert.equal(tomlRedirect.status, 302);
  assert.equal(tomlRedirect.headers.get('x-skynet-route'), 'netlify-redirect');
  assert.equal(tomlRedirect.headers.get('location'), 'https://metraiyux.example/skyenet/rules-demo/toml.html');

  const tomlAsset = await siteWorker.fetch(req('/skyenet/rules-demo/toml.html'), e, ctx());
  assert.equal(tomlAsset.status, 200);
  assert.equal(tomlAsset.headers.get('x-skynet-route'), 'r2-deployment');
  assert.equal(tomlAsset.headers.get('x-toml-header'), 'yes');
  assert.match(await tomlAsset.text(), /Toml Target/);

  const range = await siteWorker.fetch(req('/skyenet/rules-demo/assets/data.txt', { headers: { range: 'bytes=2-5' } }), e, ctx());
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('accept-ranges'), 'bytes');
  assert.equal(range.headers.get('content-range'), 'bytes 2-5/16');
  assert.equal(await range.text(), '2345');

  const fullAsset = await siteWorker.fetch(req('/skyenet/rules-demo/assets/data.txt'), e, ctx());
  const etag = fullAsset.headers.get('etag');
  assert.ok(etag);
  const conditional = await siteWorker.fetch(req('/skyenet/rules-demo/assets/data.txt', { headers: { 'if-none-match': etag } }), e, ctx());
  assert.equal(conditional.status, 304);
  assert.equal(conditional.headers.get('etag'), etag);
  const lastModified = fullAsset.headers.get('last-modified');
  assert.ok(lastModified);
  const conditionalDate = await siteWorker.fetch(req('/skyenet/rules-demo/assets/data.txt', { headers: { 'if-modified-since': lastModified } }), e, ctx());
  assert.equal(conditionalDate.status, 304);
  assert.equal(conditionalDate.headers.get('last-modified'), lastModified);

  const formBody = new URLSearchParams({
    'form-name': 'contact',
    name: 'Ada',
    message: 'SkyeNet form capture works'
  }).toString();
  const form = await siteWorker.fetch(req('/skyenet/rules-demo/contact', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: formBody
  }), e, ctx());
  const formData = await form.json();
  assert.equal(form.status, 202);
  assert.equal(form.headers.get('x-skynet-route'), 'netlify-form');
  assert.equal(formData.ok, true);
  assert.equal(formData.form_name, 'contact');
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(formData.receipt_key));

  const ruleFile = await siteWorker.fetch(req('/skyenet/rules-demo/_redirects'), e, ctx());
  assert.equal(ruleFile.status, 404);
  assert.equal(ruleFile.headers.get('x-skynet-route'), 'rule-asset-blocked');

  const tomlRuleFile = await siteWorker.fetch(req('/skyenet/rules-demo/netlify.toml'), e, ctx());
  assert.equal(tomlRuleFile.status, 404);
  assert.equal(tomlRuleFile.headers.get('x-skynet-route'), 'rule-asset-blocked');
});

test('SN-06 SkyeNet refuses route registration before a storage-verified complete', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'missing-root-public';
  const deploymentId = 'dep_missing_root_public';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, title: 'Missing Root Public' }
  })).response.status, 200);

  const route = await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/missing-root-public',
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: true,
      default_auth: 'public'
    }
  });
  assert.equal(route.response.status, 409);
  assert.equal(route.data.skynet?.code, 'DEPLOYMENT_NOT_COMPLETE');

  const live = await siteWorker.fetch(req('/skyenet/missing-root-public'), e, ctx());
  const text = await live.text();
  assert.equal(live.status, 404);
  assert.equal(live.headers.get('x-0s-skynet-route-miss'), 'true');
  assert.match(text, /^SkyeNet route not found$/i);
});

test('SN-07 Founder Command can be mounted as a private SkyeNet surface with shared gate headers', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'founder-command';
  const deploymentId = 'dep_founder_command';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { project_id: projectId, deployment_id: deploymentId, title: 'Founder Command' }
  })).response.status, 200);

  const uploadParams = new URLSearchParams({ projectId, deploymentId, path: 'index.html' });
  assert.equal((await call(e, `/api/skyenet/deploy/upload?${uploadParams.toString()}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<h1>Founder Command on SkyeNet</h1>'
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
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/founder-command',
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: false,
      default_auth: 'gate'
    }
  });
  assert.equal(route.response.status, 200);

  const denied = await siteWorker.fetch(req('/skyenet/founder-command/'), e, ctx());
  assert.equal(denied.status, 401);

  const live = await siteWorker.fetch(req('/skyenet/founder-command/', { token }), e, ctx());
  const text = await live.text();
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-0s-skynet-surface-proxy'), 'fs27-service-binding');
  assert.equal(live.headers.get('x-skynet-route'), 'r2-deployment');
  assert.match(text, /Founder Command on SkyeNet/);

  const redirect = await siteWorker.fetch(req('/founder-command/?view=repo-vault', { token }), e, ctx());
  assert.equal(redirect.status, 302);
  assert.match(redirect.headers.get('location') || '', /\/skyenet\/founder-command\/\?view=repo-vault$/);
});
