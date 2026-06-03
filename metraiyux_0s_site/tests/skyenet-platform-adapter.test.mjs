import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const siteWorker = (await import('../cloudflare/worker.js')).default;
const { handleSkyeNetDeployRequest } = await import('../skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs');
const fs27Worker = (await import('../skyegate/source/SkyeGateFS27/cloudflare/worker.mjs')).default;
const FUNCTION_SIGNING_KEY = 'adapter-test-skynet-function-signing-key';

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

class MemoryQueue {
  constructor() {
    this.messages = [];
  }

  async send(message) {
    this.messages.push(message);
  }
}

function mockFunctionLoader() {
  return {
    async get(id, factory) {
      const code = await factory();
      return {
        id,
        code,
        getEntrypoint() {
          return {
            async fetch(request, passedEnv = {}) {
              return Response.json({
                ok: true,
                runtime: 'mock-dynamic-worker',
                worker_id: id,
                method: request.method,
                body: ['GET', 'HEAD'].includes(request.method) ? '' : await request.text(),
                module_count: Object.keys(code.modules || {}).length,
                global_outbound_null: code.globalOutbound === null,
                source_present: String(code.modules?.['functions/hello.js'] || code.modules?.['functions/hello.mjs'] || '').includes('handler'),
                env_keys: Object.keys(passedEnv).sort(),
                allowed_secret: passedEnv.ALLOWED_SECRET || '',
                forbidden_secret: passedEnv.FORBIDDEN_SECRET || ''
              }, {
                status: 201,
                headers: {
                  'content-type': 'application/json; charset=utf-8',
                  'x-skyenet-function': 'hello'
                }
              });
            }
          };
        }
      };
    }
  };
}

async function sha256Text(text) {
  const bytes = new TextEncoder().encode(String(text));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function signFunctionManifest(manifest) {
  const clone = { ...manifest };
  delete clone.signature;
  return {
    alg: 'HS256',
    key_hint: createHmac('sha256', FUNCTION_SIGNING_KEY).update('hint').digest('hex').slice(0, 12),
    value: createHmac('sha256', FUNCTION_SIGNING_KEY).update(JSON.stringify(clone)).digest('hex')
  };
}

async function signedFunctionManifest(source, projectId, deploymentId, options = {}) {
  const envGrants = Array.isArray(options.env_grants) ? options.env_grants : [];
  const manifest = {
    schema: 'skyenet.functions.bundle.v1',
    bundle_id: `skybun_${projectId}_${deploymentId}`,
    generated_at: '2026-05-31T00:00:00.000Z',
    tenant_id: 'adapter-test-tenant',
    function_count: 1,
    functions: [{
      name: 'hello',
      source_path: 'netlify/functions/hello.mjs',
      bundle_path: 'functions/hello.mjs',
      runtime: 'node',
      adapter: 'netlify.handler.v1',
      sha256: await sha256Text(source),
      routes: ['/.netlify/functions/hello', '/.skyenet/functions/hello'],
      limits: {
        timeout_ms: 10000,
        memory_mb: 128,
        max_body_bytes: 1048576,
        egress: 'deny-by-default',
        env_grants: envGrants
      }
    }],
    runtime_contract: {
      entry: 'handler(event, context)',
      isolation: 'cloudflare-dynamic-worker-v1'
    }
  };
  manifest.signature = signFunctionManifest(manifest);
  return manifest;
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
        if (body.token === 'client-token') {
          return Response.json({
            active: true,
            sub: 'client',
            email: 'client@example.invalid',
            role: 'client',
            scope: 'gateway.invoke',
            customer_id: 31,
            workspace_id: 'metraiyux-0s-owner'
          });
        }
        if (body.token === 'recipient-token') {
          return Response.json({
            active: true,
            sub: 'recipient',
            email: 'recipient@example.invalid',
            role: 'client',
            scope: 'gateway.invoke',
            customer_id: 77,
            workspace_id: 'recipient-workspace'
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
        if (body.token === 'recipient-token') {
          return Response.json({
            active: true,
            sub: 'recipient',
            email: 'recipient@example.invalid',
            role: 'client',
            scope: 'gateway.invoke',
            customer_id: 77,
            workspace_id: 'recipient-workspace'
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
    REQUEST_EVENT_QUEUE: new MemoryQueue(),
    SKYENET_FUNCTION_BUNDLE_SIGNING_KEY: FUNCTION_SIGNING_KEY,
    SKYENET_FUNCTION_LOADER: mockFunctionLoader(),
    ASSETS: {
      async fetch(request) {
        return new Response(`fs27-asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    }
  };
  return {
    ZERO_OS_GATE_CODE: 'owner-code',
    OWNER_ADMIN_SESSION_SECRET: 'owner-session-secret',
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
  assert.equal(status.data.skynet.capabilities.netlify_forms_honeypot_spam_filter, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_multipart_file_uploads, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_private_upload_custody, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_owner_inbox, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_submission_status_controls, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_notification_receipts, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_spam_policy_controls, true);
  assert.equal(status.data.skynet.capabilities.netlify_forms_private_file_downloads, true);

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

test('SN-02b-owner-login SkyeNet accepts the shared 0S owner session bearer when FS27 admin login is unavailable', async () => {
  const e = envWithActualFs27();
  const login = await siteWorker.fetch(req('/api/owner/admin-login', {
    method: 'POST',
    body: { code: 'owner-code' }
  }), e, ctx());
  assert.equal(login.status, 200);
  const body = await login.json();
  assert.equal(body.ok, true);
  assert.match(body.token, /^0s-owner\./);

  const status = await call(e, '/api/skyenet/status', { token: body.token });
  assert.equal(status.response.status, 200);
  assert.equal(status.data.skynet.service, 'fs27-skynet');
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

test('SN-02d SkyeNet 0S proxy exposes clean source/env/transfer aliases', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'alias-source-route';
  const deploymentId = 'dep_alias_source';
  const workspaceId = 'metraiyux-0s-owner';

  const envList = await call(e, `/api/skyenet/env?workspace_id=${workspaceId}&project_id=${projectId}`, { token });
  assert.equal(envList.response.status, 200);
  assert.equal(envList.data.skynet.ok, true);

  const upload = await call(e, `/api/skyenet/source-upload?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=README.md`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
    body: '# Alias source route\n'
  });
  assert.equal(upload.response.status, 200);
  assert.equal(upload.data.skynet.path, 'README.md');

  const complete = await call(e, '/api/skyenet/source-complete', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      files: [{ path: 'README.md', size: 21, content_type: 'text/markdown; charset=utf-8' }],
      total_bytes: 21
    }
  });
  assert.equal(complete.response.status, 200);
  assert.equal(complete.data.skynet.source_package.file_count, 1);

  const transfer = await call(e, '/api/skyenet/source-transfer', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      method: 'download'
    }
  });
  assert.equal(transfer.response.status, 200);
  assert.match(transfer.data.skynet.source_download_url, new RegExp(`project_id=${projectId}`));
  assert.equal(transfer.data.skynet.custody_policy.client_access_without_transfer, false);
});

test('SN-02e SkyeNet SkyeVault transfer promotes a project-aware codebase mount and recipient read grant', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const workspaceId = 'metraiyux-0s-owner';
  const projectId = 'promoted-vault-codebase';
  const deploymentId = 'dep_promoted_vault';
  const sourcePath = 'src/main.js';
  const sourceText = 'export const proof = "project-aware SkyeVault codebase";\n';

  const upload = await call(e, `/api/skyenet/source-upload?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${encodeURIComponent(sourcePath)}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
    body: sourceText
  });
  assert.equal(upload.response.status, 200);

  const complete = await call(e, '/api/skyenet/source-complete', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      files: [{ path: sourcePath, size: sourceText.length, content_type: 'text/javascript; charset=utf-8' }],
      total_bytes: sourceText.length
    }
  });
  assert.equal(complete.response.status, 200);
  assert.equal(complete.data.skynet.source_package.file_count, 1);

  const transfer = await call(e, '/api/skyenet/source-transfer', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      method: 'skyevault',
      vault_id: 'recipient-project-vault',
      recipient_customer_id: '77'
    }
  });
  assert.equal(transfer.response.status, 200);
  assert.equal(transfer.data.skynet.status, 'completed');
  assert.equal(transfer.data.skynet.storage.stored, true);
  assert.ok(transfer.data.skynet.promoted_codebases.some((record) => record.customer_id === '31' && record.relation === 'source-owner'));
  assert.ok(transfer.data.skynet.promoted_codebases.some((record) => record.customer_id === '77' && record.relation === 'recipient'));

  const ownerCodebases = await call(e, `/api/skyenet/source-codebases?workspace_id=${workspaceId}&project_id=${projectId}`, { token });
  assert.equal(ownerCodebases.response.status, 200);
  assert.equal(ownerCodebases.data.skynet.count, 1);
  assert.equal(ownerCodebases.data.skynet.codebases[0].project_id, projectId);
  assert.equal(ownerCodebases.data.skynet.codebases[0].mount.source_manifest_key.endsWith('.skyenet/source-package.json'), true);

  const recipientCodebases = await call(e, `/api/skyenet/source-codebases?workspace_id=${workspaceId}&project_id=${projectId}`, { token: 'recipient-token' });
  assert.equal(recipientCodebases.response.status, 200);
  assert.equal(recipientCodebases.data.skynet.count, 1);
  assert.equal(recipientCodebases.data.skynet.codebases[0].relation, 'recipient');
  assert.equal(recipientCodebases.data.skynet.codebases[0].access_policy.read_source_granted, true);
  assert.equal(recipientCodebases.data.skynet.codebases[0].source_owner_customer_id, '31');

  const recipientRead = await call(e, `/api/skyenet/source-file?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${encodeURIComponent(sourcePath)}`, {
    token: 'recipient-token'
  });
  assert.equal(recipientRead.response.status, 200);
  assert.equal(recipientRead.data.skynet.path, sourcePath);
  assert.match(recipientRead.data.skynet.text, /project-aware SkyeVault codebase/);

  const driveProjectId = 'promoted-drive-codebase';
  const driveDeploymentId = 'dep_promoted_drive';
  const driveSourceText = 'export const proof = "project-aware SkyDrive codebase";\n';
  const driveUpload = await call(e, `/api/skyenet/source-upload?workspace_id=${workspaceId}&project_id=${driveProjectId}&deployment_id=${driveDeploymentId}&path=${encodeURIComponent(sourcePath)}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
    body: driveSourceText
  });
  assert.equal(driveUpload.response.status, 200);
  const driveComplete = await call(e, '/api/skyenet/source-complete', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: driveProjectId,
      deployment_id: driveDeploymentId,
      files: [{ path: sourcePath, size: driveSourceText.length, content_type: 'text/javascript; charset=utf-8' }],
      total_bytes: driveSourceText.length
    }
  });
  assert.equal(driveComplete.response.status, 200);
  const driveTransfer = await call(e, '/api/skyenet/source-transfer', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: driveProjectId,
      deployment_id: driveDeploymentId,
      method: 'skyedrive',
      drive_id: 'recipient-project-drive',
      recipient_customer_id: '77'
    }
  });
  assert.equal(driveTransfer.response.status, 200);
  assert.equal(driveTransfer.data.skynet.status, 'completed');
  assert.equal(driveTransfer.data.skynet.storage.stored, true);
  assert.match(driveTransfer.data.skynet.storage.key, /skyedrive\/source-transfers/);
  assert.ok(driveTransfer.data.skynet.promoted_codebases.some((record) => record.customer_id === '31' && record.relation === 'source-owner'));
  assert.ok(driveTransfer.data.skynet.promoted_codebases.some((record) => record.customer_id === '77' && record.relation === 'recipient'));
  const driveOwnerCodebases = await call(e, `/api/skyenet/source-codebases?workspace_id=${workspaceId}&project_id=${driveProjectId}`, { token });
  assert.equal(driveOwnerCodebases.response.status, 200);
  assert.equal(driveOwnerCodebases.data.skynet.count, 1);
  assert.equal(driveOwnerCodebases.data.skynet.codebases[0].transfer_policy.method, 'skyedrive');
  const driveRecipientRead = await call(e, `/api/skyenet/source-file?workspace_id=${workspaceId}&project_id=${driveProjectId}&deployment_id=${driveDeploymentId}&path=${encodeURIComponent(sourcePath)}`, {
    token: 'recipient-token'
  });
  assert.equal(driveRecipientRead.response.status, 200);
  assert.match(driveRecipientRead.data.skynet.text, /project-aware SkyDrive codebase/);
});

test('SN-02f SkyeNet source custody owner override can mount recovered customer scopes', async () => {
  const e = envWithActualFs27();
  const olderDuplicateCustomerId = '1201161732';
  const recoveredCustomerId = '229147072';
  const workspaceId = 'quantumskyes';
  const projectId = 'recovered-source';
  const deploymentId = 'dep_recovered';
  const olderSourcePrefix = `source-packages/customer-${olderDuplicateCustomerId}/workspace-${workspaceId}/project-${projectId}/deployment-${deploymentId}`;
  const sourcePrefix = `source-packages/customer-${recoveredCustomerId}/workspace-${workspaceId}/project-${projectId}/deployment-${deploymentId}`;
  const sourcePath = 'README.md';
  const olderSourceText = '# Older duplicate source\nwrong account scope\n';
  const sourceText = '# Recovered source\nowner override proof\n';

  await e.__fsEnv.DEPLOYMENT_ASSET_BUCKET.put(`${olderSourcePrefix}/${sourcePath}`, olderSourceText, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' }
  });
  await e.__fsEnv.DEPLOYMENT_ASSET_BUCKET.put(`${sourcePrefix}/${sourcePath}`, sourceText, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' }
  });
  await e.__fsEnv.SKYENET_RECEIPTS_KV.put(
    `skynet:deployment:v1:customer:${olderDuplicateCustomerId}:workspace:${workspaceId}:project:${projectId}:deployment:${deploymentId}`,
    JSON.stringify({
      schema: 'fs27.skynet.deployment.v1',
      customer_id: olderDuplicateCustomerId,
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      status: 'completed',
      updated_at: '2026-05-01T00:00:00.000Z',
      source_package: {
        schema: 'fs27.skynet.source_package.v1',
        mode: 'private-full-project',
        prefix: olderSourcePrefix,
        files: [{ path: sourcePath, size: olderSourceText.length, content_type: 'text/markdown; charset=utf-8' }],
        sample_files: [{ path: sourcePath, size: olderSourceText.length, content_type: 'text/markdown; charset=utf-8' }],
        file_count: 1,
        total_bytes: olderSourceText.length,
        public_asset_exposure: false,
        downloadable: true
      }
    })
  );
  await e.__fsEnv.SKYENET_RECEIPTS_KV.put(
    `skynet:workspace:v1:customer:${recoveredCustomerId}:workspace:${workspaceId}`,
    JSON.stringify({
      schema: 'fs27.skynet.workspace.v1',
      customer_id: recoveredCustomerId,
      workspace_id: workspaceId,
      plan_name: 'owner-admin-recovered-custody'
    })
  );
  await e.__fsEnv.SKYENET_RECEIPTS_KV.put(
    `skynet:deployment:v1:customer:${recoveredCustomerId}:workspace:${workspaceId}:project:${projectId}:deployment:${deploymentId}`,
    JSON.stringify({
      schema: 'fs27.skynet.deployment.v1',
      customer_id: recoveredCustomerId,
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      status: 'completed',
      updated_at: '2026-05-31T00:00:00.000Z',
      source_package: {
        schema: 'fs27.skynet.source_package.v1',
        mode: 'private-full-project',
        prefix: sourcePrefix,
        files: [{ path: sourcePath, size: sourceText.length, content_type: 'text/markdown; charset=utf-8' }],
        sample_files: [{ path: sourcePath, size: sourceText.length, content_type: 'text/markdown; charset=utf-8' }],
        file_count: 1,
        total_bytes: sourceText.length,
        public_asset_exposure: false,
        downloadable: true
      }
    })
  );

  const denied = await call(e, `/api/skyenet/source-file?customer_id=${recoveredCustomerId}&workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${sourcePath}`, {
    token: 'client-token'
  });
  assert.ok([401, 403].includes(denied.response.status));

  const read = await call(e, `/api/skyenet/source-file?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${sourcePath}`, {
    token: 'gate-token'
  });
  assert.equal(read.response.status, 200);
  assert.equal(read.data.skynet.path, sourcePath);
  assert.match(read.data.skynet.text, /owner override proof/);

  const list = await call(e, `/api/skyenet/dashboard?workspace_id=${workspaceId}&project_id=${projectId}`, {
    token: 'gate-token'
  });
  assert.equal(list.response.status, 200);
  assert.equal(list.data.skynet.custody_scope.customer_id, recoveredCustomerId);
  assert.equal(list.data.skynet.custody_scope.owner_override, true);
  assert.equal(list.data.skynet.deployments[0].project_id, projectId);

  const transfer = await call(e, '/api/skyenet/source-transfer', {
    method: 'POST',
    token: 'gate-token',
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      method: 'download'
    }
  });
  assert.equal(transfer.response.status, 200);
  assert.equal(transfer.data.skynet.custody_policy.source_owner_customer_id, recoveredCustomerId);
  assert.equal(transfer.data.skynet.custody_policy.requested_by_customer_id, '31');
  assert.equal(transfer.data.skynet.custody_policy.client_access_without_transfer, false);
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
  const workspaceId = 'metraiyux-0s-owner';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, title: 'Rules Demo' }
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
    const params = new URLSearchParams({ workspace_id: workspaceId, projectId, deploymentId, path: assetPath });
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
    body: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, files: uploads.map(([assetPath]) => assetPath) }
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/rules-demo',
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: true,
      default_auth: 'public'
    }
  })).response.status, 200);

  const formsPolicy = await call(e, '/api/skyenet/forms-policy', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      spam_controls: {
        blocked_terms: ['casino'],
        blocked_domains: ['spam.example'],
        link_limit: 2,
        min_elapsed_ms: 5000
      },
      notifications: {
        mode: 'owner-queue',
        owner_recipients: ['owner@example.test'],
        suppress_spam: false
      }
    }
  });
  assert.equal(formsPolicy.response.status, 200, JSON.stringify(formsPolicy.data));
  assert.equal(formsPolicy.data.skynet.forms_policy.spam_controls.link_limit, 2);
  assert.equal(formsPolicy.data.skynet.forms_policy.notifications.receipt_only, false);
  assert.equal(formsPolicy.data.skynet.forms_policy.notifications.external_delivery_enabled, true);

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
  assert.ok(formData.notification_receipt_key);
  assert.equal(formData.notification_status, 'queued_owner_delivery');
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(formData.receipt_key));
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(formData.notification_receipt_key));
  const formDeliveryMessages = e.__fsEnv.REQUEST_EVENT_QUEUE.messages.filter((item) => item.schema === 'fs27.skynet.forms_notification.delivery.v1');
  assert.equal(formDeliveryMessages.length, 1);
  assert.equal(formDeliveryMessages[0].recipients[0], 'owner@example.test');

  const uploadBody = new FormData();
  uploadBody.set('form-name', 'contact');
  uploadBody.set('name', 'Bot Check');
  uploadBody.set('bot-field', 'filled-by-bot');
  uploadBody.append('attachment', new Blob(['hello upload'], { type: 'text/plain' }), 'hello.txt');
  const upload = await siteWorker.fetch(new Request('https://metraiyux.example/skyenet/rules-demo/contact', {
    method: 'POST',
    headers: { accept: 'application/json', 'x-netlify-honeypot': 'bot-field' },
    body: uploadBody
  }), e, ctx());
  const uploadData = await upload.json();
  assert.equal(upload.status, 202);
  assert.equal(upload.headers.get('x-skynet-route'), 'netlify-form');
  assert.equal(upload.headers.get('x-skynet-form-spam'), '1');
  assert.equal(upload.headers.get('x-skynet-form-file-count'), '1');
  assert.equal(uploadData.spam_detected, true);
  assert.deepEqual(uploadData.spam_reasons, ['honeypot']);
  assert.equal(uploadData.file_count, 1);
  assert.ok(uploadData.notification_receipt_key);
  const uploadRecordObject = await e.__fsEnv.REQUEST_LOG_BUCKET.get(uploadData.receipt_key);
  const uploadRecord = await uploadRecordObject.json();
  assert.equal(uploadRecord.spam.detected, true);
  assert.equal(uploadRecord.files[0].name, 'hello.txt');
  assert.equal(uploadRecord.files[0].type, 'text/plain');
  assert.equal(uploadRecord.files[0].size, 12);
  assert.ok(uploadRecord.files[0].sha256);
  assert.equal(uploadRecord.notification.status, 'queued_owner_delivery');
  assert.equal(uploadRecord.notification.external_delivery_enabled, true);
  assert.equal(uploadRecord.notification.external_delivery_attempted, true);
  assert.equal(uploadRecord.notification.delivery_channel, 'queue');
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(uploadRecord.notification.key));
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(uploadRecord.files[0].key));

  const policySpamBody = new URLSearchParams({
    'form-name': 'contact',
    name: 'Policy Spam',
    email: 'lead@spam.example',
    message: 'casino proof http://one.example http://two.example',
    skynet_form_started_at: String(Date.now())
  }).toString();
  const policySpam = await siteWorker.fetch(req('/skyenet/rules-demo/contact', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: policySpamBody
  }), e, ctx());
  const policySpamData = await policySpam.json();
  assert.equal(policySpam.status, 202);
  assert.equal(policySpamData.notification_status, 'queued_owner_delivery');
  assert.equal(policySpamData.spam_detected, true);
  assert.ok(policySpamData.spam_reasons.includes('blocked_term'));
  assert.ok(policySpamData.spam_reasons.includes('blocked_domain'));
  assert.ok(policySpamData.spam_reasons.includes('link_density'));
  assert.ok(policySpamData.spam_reasons.includes('too_fast'));

  const inboxParams = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    limit: '10'
  });
  const inbox = await call(e, `/api/skyenet/forms-inbox?${inboxParams.toString()}`, { token });
  assert.equal(inbox.response.status, 200);
  assert.equal(inbox.data.skynet.counts.total, 3);
  assert.ok(inbox.data.skynet.submissions.some((item) => item.key === uploadData.receipt_key));
  assert.ok(inbox.data.skynet.submissions.some((item) => item.notification_receipt_key === policySpamData.notification_receipt_key));

  const submissionParams = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    receipt_key: uploadData.receipt_key
  });
  const submission = await call(e, `/api/skyenet/forms-submission?${submissionParams.toString()}`, { token });
  assert.equal(submission.response.status, 200);
  assert.equal(submission.data.skynet.submission.files[0].name, 'hello.txt');

  const fileParams = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    file_key: uploadRecord.files[0].key
  });
  const formFile = await siteWorker.fetch(req(`/api/skyenet/forms-file?${fileParams.toString()}`, { token }), e, ctx());
  assert.equal(formFile.status, 200);
  assert.equal(formFile.headers.get('x-skynet-form-file'), 'private');
  assert.equal(formFile.headers.get('x-0s-skynet-form-file-proxy'), 'passthrough');
  assert.equal(await formFile.text(), 'hello upload');

  const moderated = await call(e, '/api/skyenet/forms-submission', {
    method: 'PATCH',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      receipt_key: uploadData.receipt_key,
      status: 'read',
      spam_status: 'not_spam',
      note: 'owner reviewed in adapter proof'
    }
  });
  assert.equal(moderated.response.status, 200);
  assert.equal(moderated.data.skynet.summary.status, 'read');
  assert.equal(moderated.data.skynet.summary.spam_detected, false);

  const notified = await call(e, '/api/skyenet/forms-notify', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      receipt_key: policySpamData.receipt_key
    }
  });
  assert.equal(notified.response.status, 200);
  assert.ok(notified.data.skynet.notification_key);
  assert.equal(notified.data.skynet.notification.status, 'queued_owner_delivery');
  assert.equal(notified.data.skynet.notification.external_delivery_enabled, true);
  assert.equal(notified.data.skynet.notification.external_delivery_attempted, true);
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(notified.data.skynet.notification_key));
  assert.ok(e.__fsEnv.REQUEST_EVENT_QUEUE.messages.filter((item) => item.schema === 'fs27.skynet.forms_notification.delivery.v1').length >= 4);

  const ruleFile = await siteWorker.fetch(req('/skyenet/rules-demo/_redirects'), e, ctx());
  assert.equal(ruleFile.status, 404);
  assert.equal(ruleFile.headers.get('x-skynet-route'), 'rule-asset-blocked');

  const tomlRuleFile = await siteWorker.fetch(req('/skyenet/rules-demo/netlify.toml'), e, ctx());
  assert.equal(tomlRuleFile.status, 404);
  assert.equal(tomlRuleFile.headers.get('x-skynet-route'), 'rule-asset-blocked');
});

test('SN-05c SkyeNet activates and invokes uploaded signed function bundles through the public route', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'functions-public';
  const deploymentId = 'dep_functions_public';
  const workspaceId = 'metraiyux-0s-owner';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, title: 'Functions Public', plan_name: 'skyenet-functions-managed' }
  })).response.status, 200);

  const uploadParams = new URLSearchParams({ workspace_id: workspaceId, projectId, deploymentId, path: 'index.html' });
  assert.equal((await call(e, `/api/skyenet/deploy/upload?${uploadParams.toString()}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<h1>Functions public</h1>'
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/complete', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, files: ['index.html'] }
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/env', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, key: 'ALLOWED_SECRET', value: 'visible-to-granted-function' }
  })).response.status, 200);
  assert.equal((await call(e, '/api/skyenet/env', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, key: 'FORBIDDEN_SECRET', value: 'must-not-leak' }
  })).response.status, 200);

  const functionSource = 'export async function handler(event){return {statusCode:201,headers:{"content-type":"application/json"},body:JSON.stringify({ok:true,method:event.httpMethod,body:event.body})};}';
  const functionUpload = await call(e, `/api/skyenet/functions-upload?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&plan_name=skyenet-functions-managed&path=functions/hello.mjs`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
    body: functionSource
  });
  assert.equal(functionUpload.response.status, 200);
  assert.equal(functionUpload.data.skynet.function_bundle.status, 'uploading');

  const manifest = await signedFunctionManifest(functionSource, projectId, deploymentId, { env_grants: ['ALLOWED_SECRET'] });
  const manifestUpload = await call(e, `/api/skyenet/functions-upload?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=manifest.json`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(manifest)
  });
  assert.equal(manifestUpload.response.status, 200);

  const activate = await call(e, '/api/skyenet/functions-complete', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      plan_name: 'skyenet-functions-managed'
    }
  });
  assert.equal(activate.response.status, 200);
  assert.equal(activate.data.skynet.function_bundle.status, 'active');
  assert.equal(activate.data.skynet.function_bundle.runtime_policy.global_outbound, null);

  const functionStatus = await call(e, `/api/skyenet/functions-status?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}`, { token });
  assert.equal(functionStatus.response.status, 200);
  assert.equal(functionStatus.data.skynet.function_bundle.functions[0].name, 'hello');

  assert.equal((await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/functions-public',
      project_id: projectId,
      deployment_id: deploymentId,
      workspace_id: workspaceId,
      public_access: true,
      default_auth: 'public',
      function_mode: 'dynamic-worker'
    }
  })).response.status, 200);
  const live = await siteWorker.fetch(req('/skyenet/functions-public/.netlify/functions/hello?plan=managed', {
    method: 'POST',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'payload'
  }), e, ctx());
  assert.equal(live.status, 201);
  assert.equal(live.headers.get('x-skynet-route'), 'skynet-function');
  assert.equal(live.headers.get('x-skynet-function-name'), 'hello');
  assert.equal(live.headers.get('x-skynet-function-env-grants'), '1');
  const receiptKey = live.headers.get('x-skynet-function-receipt');
  assert.ok(receiptKey);
  assert.ok(e.__fsEnv.REQUEST_LOG_BUCKET.map.has(receiptKey));
  const liveBody = await live.json();
  assert.equal(liveBody.ok, true);
  assert.equal(liveBody.method, 'POST');
  assert.equal(liveBody.body, 'payload');
  assert.equal(liveBody.global_outbound_null, true);
  assert.equal(liveBody.source_present, true);
  assert.equal(liveBody.allowed_secret, 'visible-to-granted-function');
  assert.equal(liveBody.forbidden_secret, '');
  assert.deepEqual(liveBody.env_keys.includes('ALLOWED_SECRET'), true);
  const invocationReceipt = await e.__fsEnv.REQUEST_LOG_BUCKET.get(receiptKey);
  const invocationRecord = JSON.parse(await invocationReceipt.text());
  assert.deepEqual(invocationRecord.env_grants.granted_keys, ['ALLOWED_SECRET']);
  assert.deepEqual(invocationRecord.env_grants.missing_keys, []);
});

test('SN-05d SkyeNet scheduled functions are indexed and invoked by the FS27 cron dispatcher', async () => {
  const e = envWithActualFs27();
  const token = 'gate-token';
  const projectId = 'functions-scheduled';
  const deploymentId = 'dep_functions_scheduled';
  const workspaceId = 'metraiyux-0s-owner';
  const functionName = 'weekday-tick';
  const functionSource = 'export async function handler(event, context){return {statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify({ok:true,trigger:context.triggerKind,path:event.path})};}';

  assert.equal((await call(e, '/api/skyenet/deploy/init', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, title: 'Scheduled Functions', plan_name: 'skyenet-functions-managed' }
  })).response.status, 200);

  const uploadParams = new URLSearchParams({ workspace_id: workspaceId, projectId, deploymentId, path: 'index.html' });
  assert.equal((await call(e, `/api/skyenet/deploy/upload?${uploadParams.toString()}`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<h1>Scheduled Functions</h1>'
  })).response.status, 200);

  assert.equal((await call(e, '/api/skyenet/deploy/complete', {
    method: 'POST',
    token,
    body: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, files: ['index.html'] }
  })).response.status, 200);

  const sourceUpload = await call(e, `/api/skyenet/functions-upload?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&plan_name=skyenet-functions-managed&path=functions/${functionName}.mjs`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
    body: functionSource
  });
  assert.equal(sourceUpload.response.status, 200);

  const manifest = {
    schema: 'skyenet.functions.bundle.v1',
    bundle_id: `skybun_${projectId}_${deploymentId}`,
    generated_at: '2026-05-31T00:00:00.000Z',
    tenant_id: 'adapter-test-tenant',
    function_count: 1,
    scheduled_function_count: 1,
    schedules: [{
      function_name: functionName,
      cron: '17 13 * * 1,3,5',
      timezone: 'UTC',
      route: `/.skyenet/scheduled/${functionName}`
    }],
    functions: [{
      name: functionName,
      source_path: `netlify/functions/${functionName}.mjs`,
      bundle_path: `functions/${functionName}.mjs`,
      runtime: 'node',
      adapter: 'netlify.handler.v1',
      sha256: await sha256Text(functionSource),
      invocation_mode: 'scheduled',
      background: false,
      schedule: { cron: '17 13 * * 1,3,5', timezone: 'UTC', source: 'adapter-test' },
      routes: [`/.netlify/functions/${functionName}`, `/.skyenet/functions/${functionName}`, `/.skyenet/scheduled/${functionName}`],
      limits: {
        timeout_ms: 10000,
        memory_mb: 128,
        max_body_bytes: 1048576,
        egress: 'deny-by-default',
        env_grants: []
      }
    }],
    runtime_contract: {
      entry: 'handler(event, context)',
      isolation: 'cloudflare-dynamic-worker-v1'
    }
  };
  manifest.signature = signFunctionManifest(manifest);

  const manifestUpload = await call(e, `/api/skyenet/functions-upload?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=manifest.json`, {
    method: 'PUT',
    token,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(manifest)
  });
  assert.equal(manifestUpload.response.status, 200);

  const activate = await call(e, '/api/skyenet/functions-complete', {
    method: 'POST',
    token,
    body: {
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      plan_name: 'skyenet-functions-managed'
    }
  });
  assert.equal(activate.response.status, 200);
  assert.equal(activate.data.skynet.function_bundle.scheduled_function_count, 1);
  assert.equal(activate.data.skynet.function_bundle.schedule_index.indexed_count, 1);

  const scheduleKey = `skynet:function-schedule:v1:customer:31:workspace:${workspaceId}:project:${projectId}:deployment:${deploymentId}:function:${functionName}`;
  assert.ok(e.__fsEnv.SKYENET_RECEIPTS_KV.map.has(scheduleKey));

  assert.equal((await call(e, '/api/skyenet/deploy/route', {
    method: 'POST',
    token,
    body: {
      hostname: 'metraiyux.example',
      mount_path: '/skyenet/functions-scheduled',
      project_id: projectId,
      deployment_id: deploymentId,
      workspace_id: workspaceId,
      public_access: true,
      default_auth: 'public',
      function_mode: 'dynamic-worker'
    }
  })).response.status, 200);
  const liveScheduled = await siteWorker.fetch(req(`/skyenet/functions-scheduled/.skyenet/scheduled/${functionName}`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'manual-scheduled-proof'
  }), e, ctx());
  assert.equal(liveScheduled.status, 201);
  assert.equal(liveScheduled.headers.get('x-skynet-route'), 'skynet-function');
  assert.equal(liveScheduled.headers.get('x-skynet-function-name'), functionName);
  assert.equal(liveScheduled.headers.get('x-skynet-scheduled-function'), functionName);
  const liveScheduledBody = await liveScheduled.json();
  assert.equal(liveScheduledBody.ok, true);
  assert.equal(liveScheduledBody.method, 'POST');
  assert.equal(liveScheduledBody.body, 'manual-scheduled-proof');

  const early = await fs27Worker.scheduled({ scheduledTime: Date.parse('2026-06-02T13:17:00.000Z') }, e.__fsEnv, ctx());
  assert.equal(early.checked_schedules, 1);
  assert.equal(early.invoked_count, 0);

  const due = await fs27Worker.scheduled({ scheduledTime: Date.parse('2026-06-01T13:17:00.000Z') }, e.__fsEnv, ctx());
  assert.equal(due.checked_schedules, 1);
  assert.equal(due.due_count, 1);
  assert.equal(due.invoked_count, 1);
  assert.equal(due.results[0].function_name, functionName);
  assert.equal(due.results[0].status, 201);
  assert.ok([...e.__fsEnv.REQUEST_LOG_BUCKET.map.keys()].some((key) => key.includes(`function=${functionName}`)));
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
