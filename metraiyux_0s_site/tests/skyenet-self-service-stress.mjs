import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { handleSkyeNetDeployRequest } = await import('../skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs');

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
    return options?.type === 'json' ? JSON.parse(stored.value) : stored.value;
  }
  async list({ prefix = '', limit = 1000 } = {}) {
    return {
      keys: [...this.map.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name, metadata: this.map.get(name)?.options?.metadata || null })),
      list_complete: true
    };
  }
}

class MemoryR2 {
  constructor() {
    this.map = new Map();
  }
  async put(key, value, options = {}) {
    const body = typeof value === 'string' ? value : await new Response(value).arrayBuffer();
    this.map.set(key, { body, options, size: typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength, uploaded: new Date() });
  }
  async get(key) {
    const stored = this.map.get(key);
    if (!stored) return null;
    const body = stored.body;
    return {
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
}

function env() {
  const kv = new MemoryKV();
  return {
    DEPLOYMENT_ASSET_BUCKET: new MemoryR2(),
    ROUTING_KV: kv,
    SKYENET_WORKSPACES_KV: kv,
    SKYENET_RECEIPTS_KV: kv
  };
}

function headers(extra = {}) {
  return {
    authorization: 'Bearer customer-gate-session',
    'x-0s-customer-id': '42',
    'x-0s-role': 'deployer',
    'x-0s-email': 'customer@example.invalid',
    'content-type': 'application/json',
    ...extra
  };
}

async function call(e, pathname, { method = 'GET', body, contentType, extraHeaders = {} } = {}) {
  const response = await handleSkyeNetDeployRequest(new Request(`https://fs27.example.com${pathname}`, {
    method,
    headers: headers({ ...(contentType ? { 'content-type': contentType } : {}), ...extraHeaders }),
    body: body == null ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
  }), { env: e });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const e = env();
const workspace = await call(e, '/deploy/workspace', {
  method: 'POST',
  body: { workspace_id: 'customer-alpha', plan_name: 'skyenet-edge-growth', display_name: 'Customer Alpha' }
});
assert.equal(workspace.response.status, 200);
assert.equal(workspace.data.workspace.plan_name, 'skyenet-edge-growth');

const started = performance.now();
const deployCount = 12;
for (let i = 0; i < deployCount; i += 1) {
  const project = `stress-site-${String(i).padStart(2, '0')}`;
  const deployment = `dep_stress_${String(i).padStart(2, '0')}`;
  assert.equal((await call(e, '/deploy/init', { method: 'POST', body: { workspace_id: 'customer-alpha', plan_name: 'skyenet-edge-growth', project_id: project, deployment_id: deployment } })).response.status, 200);
  assert.equal((await call(e, `/deploy/upload?workspaceId=customer-alpha&projectId=${project}&deploymentId=${deployment}&path=index.html`, { method: 'PUT', contentType: 'text/html; charset=utf-8', body: `<h1>${project}</h1>` })).response.status, 200);
  assert.equal((await call(e, `/deploy/upload?workspaceId=customer-alpha&projectId=${project}&deploymentId=${deployment}&path=assets/app.js`, { method: 'PUT', contentType: 'text/javascript; charset=utf-8', body: `console.log(${JSON.stringify(project)});` })).response.status, 200);
  assert.equal((await call(e, '/deploy/complete', { method: 'POST', body: { workspace_id: 'customer-alpha', plan_name: 'skyenet-edge-growth', project_id: project, deployment_id: deployment, files: ['index.html', 'assets/app.js'] } })).response.status, 200);
  const route = await call(e, '/deploy/route', {
    method: 'POST',
    body: {
      workspace_id: 'customer-alpha',
      plan_name: 'skyenet-edge-growth',
      hostname: 'skynet.example.com',
      mount_path: `/skyenet/${project}`,
      project_id: project,
      deployment_id: deployment,
      public_access: i === 0,
      default_auth: i === 0 ? 'public' : 'gate'
    }
  });
  assert.equal(route.response.status, 200);
  assert.match(route.data.live_url, /https:\/\/skynet\.example\.com\/skyenet\/stress-site-/);
}

const dashboard = await call(e, '/deploy/dashboard?workspaceId=customer-alpha');
assert.equal(dashboard.response.status, 200);
assert.equal(dashboard.data.deployments.length, deployCount);
assert.equal(dashboard.data.routes.length, deployCount);
assert.ok(dashboard.data.receipts.length >= deployCount);

const receipts = await call(e, '/deploy/receipts?workspaceId=customer-alpha&limit=200');
assert.equal(receipts.response.status, 200);
assert.ok(receipts.data.count >= deployCount);

const quotaEnv = env();
await call(quotaEnv, '/deploy/route', {
  method: 'POST',
  body: { hostname: 'skynet.example.com', mount_path: '/skyenet/free-one', project_id: 'free-one', deployment_id: 'dep_one', public_access: true, default_auth: 'public' }
});
const blocked = await call(quotaEnv, '/deploy/route', {
  method: 'POST',
  body: { hostname: 'skynet.example.com', mount_path: '/skyenet/free-two', project_id: 'free-two', deployment_id: 'dep_two', public_access: true, default_auth: 'public' }
});
assert.equal(blocked.response.status, 429);
assert.equal(blocked.data.code, 'SKYENET_PUBLIC_ROUTE_QUOTA');

const adminEnv = env();
const adminHeaders = {
  'x-0s-role': 'owner',
  'x-0s-admin-override': 'true',
  'x-metraiyux-session-source': 'metraiyux-0s-skynet-console',
  'x-0s-email': 'owner@example.invalid'
};
const adminWorkspace = await call(adminEnv, '/deploy/workspace', {
  method: 'POST',
  extraHeaders: adminHeaders,
  body: { workspace_id: 'owner-unlocked', plan_name: 'free99', display_name: 'Owner Unlocked' }
});
assert.equal(adminWorkspace.response.status, 200);
assert.equal(adminWorkspace.data.workspace.admin_override, true);
assert.equal(adminWorkspace.data.workspace.free99_credits_limited, false);
for (const project of ['admin-one', 'admin-two']) {
  const route = await call(adminEnv, '/deploy/route', {
    method: 'POST',
    extraHeaders: adminHeaders,
    body: {
      workspace_id: 'owner-unlocked',
      plan_name: 'free99',
      hostname: 'skynet.example.com',
      mount_path: `/skyenet/${project}`,
      project_id: project,
      deployment_id: `dep_${project}`,
      public_access: true,
      default_auth: 'public'
    }
  });
  assert.equal(route.response.status, 200);
  assert.equal(route.data.workspace.admin_override, true);
}

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  deploy_count: deployCount,
  duration_ms: Math.round(performance.now() - started),
  dashboard: {
    deployments: dashboard.data.deployments.length,
    routes: dashboard.data.routes.length,
    receipts: dashboard.data.receipts.length
  },
  quota_guard: {
    status: blocked.response.status,
    code: blocked.data.code,
    admin_override: adminWorkspace.data.workspace.admin_override
  }
};

const out = path.resolve('test-artifacts/skyenet-self-service-stress-latest.json');
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
