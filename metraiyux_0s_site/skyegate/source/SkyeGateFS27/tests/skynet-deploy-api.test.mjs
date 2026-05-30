import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { handleSkyeNetDeployRequest } = await import('../cloudflare/skynet-deploy-api.mjs');

function authHeaders(extra = {}) {
  return {
    authorization: 'Bearer gate-test-session',
    'x-0s-customer-id': '31',
    'x-0s-role': 'deployer',
    'content-type': 'application/json',
    ...extra
  };
}

function mockEnv() {
  const objects = new Map();
  const routes = new Map();
  return {
    objects,
    routes,
    DEPLOYMENT_ASSET_BUCKET: {
      async put(key, value, options) {
        objects.set(key, { value, options });
      },
      async head(key) {
        const stored = objects.get(key);
        if (!stored) return null;
        const bytes = stored.value instanceof Uint8Array
          ? stored.value
          : Buffer.from(await new Response(stored.value).arrayBuffer());
        return { key, size: bytes.byteLength, uploaded: new Date() };
      },
      async get(key) {
        const stored = objects.get(key);
        if (!stored) return null;
        const bytes = stored.value instanceof Uint8Array
          ? stored.value
          : Buffer.from(await new Response(stored.value).arrayBuffer());
        return {
          key,
          size: bytes.byteLength,
          uploaded: new Date(),
          body: new Response(bytes).body,
          async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); },
          async text() { return Buffer.from(bytes).toString('utf8'); },
          async json() { return JSON.parse(Buffer.from(bytes).toString('utf8')); },
          writeHttpMetadata(headers) {
            if (stored.options?.httpMetadata?.contentType) headers.set('content-type', stored.options.httpMetadata.contentType);
          }
        };
      },
      async list({ prefix = '', limit = 1000 } = {}) {
        return {
          objects: [...objects.keys()]
            .filter((key) => key.startsWith(prefix))
            .slice(0, limit)
            .map((key) => ({ key, size: 1, uploaded: new Date() }))
        };
      }
    },
    ROUTING_KV: {
      async put(key, value, options) {
        routes.set(key, { value, options });
      },
      async get(key, options) {
        const stored = routes.get(key);
        if (!stored) return null;
        return options?.type === 'json' ? JSON.parse(stored.value) : stored.value;
      },
      async delete(key) {
        routes.delete(key);
      },
      async list({ prefix = '', limit = 1000 } = {}) {
        return {
          keys: [...routes.keys()]
            .filter((key) => key.startsWith(prefix))
            .slice(0, limit)
            .map((name) => ({ name, metadata: routes.get(name)?.options?.metadata || null })),
          list_complete: true
        };
      }
    },
    REQUEST_LOG_BUCKET: {
      async put() {},
      async list() {
        return { objects: [{ key: 'runtime-logs/yyyy=2026/mm=05/dd=23/customer=31/project=sovereign-docs/hour=10/batch_test.jsonl', size: 128, uploaded: new Date() }] };
      }
    }
  };
}

test('SkyeNet deploy API initializes, uploads, completes, and routes a path-mounted app', async () => {
  const env = mockEnv();
  const context = { env };

  const init = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/init', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'sovereign-docs',
      deployment_id: 'dep_test_001',
      title: 'Sovereign Docs'
    })
  }), context);
  assert.equal(init.status, 200);
  const initBody = await init.json();
  assert.equal(initBody.asset_prefix, 'deployments/sovereign-docs/dep_test_001');
  assert.ok(env.objects.has('deployments/sovereign-docs/dep_test_001/.fs27/deployment-init.json'));

  const upload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/upload?projectId=sovereign-docs&deploymentId=dep_test_001&path=/assets/app.js',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'text/javascript; charset=utf-8' }),
      body: 'console.log("ok");'
    }
  ), context);
  assert.equal(upload.status, 200);
  const uploadBody = await upload.json();
  assert.equal(uploadBody.key, 'deployments/sovereign-docs/dep_test_001/assets/app.js');
  assert.equal(uploadBody.content_type, 'text/javascript; charset=utf-8');
  assert.ok(env.objects.has('deployments/sovereign-docs/dep_test_001/assets/app.js'));

  const uploadIndex = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/upload?projectId=sovereign-docs&deploymentId=dep_test_001&path=/index.html',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'text/html; charset=utf-8' }),
      body: '<!doctype html><title>Sovereign Docs</title><script src="/assets/app.js"></script>'
    }
  ), context);
  assert.equal(uploadIndex.status, 200);
  assert.ok(env.objects.has('deployments/sovereign-docs/dep_test_001/index.html'));

  const complete = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/complete', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'sovereign-docs',
      deployment_id: 'dep_test_001',
      files: ['index.html', 'assets/app.js']
    })
  }), context);
  assert.equal(complete.status, 200);
  assert.ok(env.objects.has('deployments/sovereign-docs/dep_test_001/.fs27/deployment-complete.json'));

  const sourceUpload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-upload?projectId=sovereign-docs&deploymentId=dep_test_001&path=netlify/functions/hello.mjs',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'text/javascript; charset=utf-8' }),
      body: 'export async function handler(){return {statusCode:200,body:"hello"};}'
    }
  ), context);
  assert.equal(sourceUpload.status, 200);
  const sourceUploadBody = await sourceUpload.json();
  assert.equal(sourceUploadBody.source_package.public_asset_exposure, false);
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-sovereign-docs/deployment-dep_test_001/netlify/functions/hello.mjs'));

  const sourceUploadPackage = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-upload?projectId=sovereign-docs&deploymentId=dep_test_001&path=package.json',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: '{"scripts":{"build":"vite"}}'
    }
  ), context);
  assert.equal(sourceUploadPackage.status, 200);

  const sourceComplete = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/source-complete', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'sovereign-docs',
      deployment_id: 'dep_test_001',
      files: ['netlify/functions/hello.mjs', 'package.json']
    })
  }), context);
  assert.equal(sourceComplete.status, 200);
  const sourceCompleteBody = await sourceComplete.json();
  assert.equal(sourceCompleteBody.source_package.mode, 'private-full-project');
  assert.equal(sourceCompleteBody.source_package.file_count, 2);
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-sovereign-docs/deployment-dep_test_001/.skyenet/source-package.json'));

  const route = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/route', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      hostname: 'skynet.example.com',
      mount_path: '/sovereign-docs',
      project_id: 'sovereign-docs',
      deployment_id: 'dep_test_001',
      public_access: false,
      default_auth: 'gate'
    })
  }), context);
  assert.equal(route.status, 200);
  const routeBody = await route.json();
  assert.equal(routeBody.key, 'route:v1:host:skynet.example.com:path:/sovereign-docs');
  assert.equal(routeBody.route.customer_id, '31');
  assert.equal(routeBody.route.strip_mount_path, true);
  assert.equal(routeBody.route.asset_prefix, 'deployments/sovereign-docs/dep_test_001');
  assert.ok(env.routes.has('route:v1:host:skynet.example.com:path:/sovereign-docs'));

  const status = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/status?projectId=sovereign-docs&deploymentId=dep_test_001', {
    method: 'GET',
    headers: authHeaders()
  }), context);
  assert.equal(status.status, 200);
  const statusBody = await status.json();
  assert.equal(statusBody.service, 'fs27-skynet');
  assert.equal(statusBody.status, 'ready');
  assert.equal(statusBody.capabilities.static_drop_hosting, true);
  assert.equal(statusBody.capabilities.private_full_project_source_packages, true);
  assert.equal(statusBody.capabilities.env_variable_registry, true);
  assert.equal(statusBody.capabilities.arbitrary_uploaded_serverless_functions, false);
  assert.equal(statusBody.requested_deployment.manifest.complete.files.length, 2);

  const routes = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/routes?host=skynet.example.com', {
    method: 'GET',
    headers: authHeaders()
  }), context);
  assert.equal(routes.status, 200);
  const routesBody = await routes.json();
  assert.equal(routesBody.count, 1);
  assert.equal(routesBody.routes[0].route.project_id, 'sovereign-docs');

  const observability = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/observability', {
    method: 'GET',
    headers: authHeaders()
  }), context);
  assert.equal(observability.status, 200);
  const observabilityBody = await observability.json();
  assert.equal(observabilityBody.sinks.r2_runtime_logs, true);
  assert.equal(observabilityBody.latest_log_objects.length, 1);

  const cost = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/cost-model', {
    method: 'GET',
    headers: authHeaders()
  }), context);
  assert.equal(cost.status, 200);
  const costBody = await cost.json();
  assert.equal(costBody.cost_model.free99_policy.recommended_caps.custom_domains, 0);

  const dashboard = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/dashboard', {
    method: 'GET',
    headers: authHeaders()
  }), context);
  assert.equal(dashboard.status, 200);
  const dashboardBody = await dashboard.json();
  assert.equal(dashboardBody.deployments[0].source_download_url, '/api/skyenet/source-download?workspace_id=customer-31&project_id=sovereign-docs&deployment_id=dep_test_001');
  assert.equal(dashboardBody.deployments[0].source_transfer_url, '/api/skyenet/source-transfer');
  assert.equal(dashboardBody.deployments[0].source_custody.client_handoff_requires_transfer, true);
  assert.equal(dashboardBody.deployments[0].source_custody.secure_pack_extension, '.skye');
  assert.equal(dashboardBody.deployments[0].source_custody.private_full_project_package, true);
  assert.equal(dashboardBody.deployments[0].source_custody.private_source_file_count, 2);

  const envSave = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/env', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'sovereign-docs',
      key: 'API_TOKEN',
      value: 'secret-1234',
      scope: 'production',
      secret: true
    })
  }), context);
  assert.equal(envSave.status, 200);
  const envSaveBody = await envSave.json();
  assert.equal(envSaveBody.env.key, 'API_TOKEN');
  assert.equal(envSaveBody.env.value_preview, '****1234');
  assert.equal(envSaveBody.env.value, undefined);

  const envList = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/env?project_id=sovereign-docs', {
    method: 'GET',
    headers: authHeaders()
  }), context);
  assert.equal(envList.status, 200);
  const envListBody = await envList.json();
  assert.equal(envListBody.count, 1);
  assert.equal(envListBody.env[0].key, 'API_TOKEN');
  assert.equal(envListBody.env[0].has_value, true);
  assert.equal(envListBody.env[0].value, undefined);

  const sourceDownload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-download?project_id=sovereign-docs&deployment_id=dep_test_001',
    {
      method: 'GET',
      headers: authHeaders()
    }
  ), context);
  assert.equal(sourceDownload.status, 200);
  assert.equal(sourceDownload.headers.get('content-type'), 'application/x-tar');
  assert.match(sourceDownload.headers.get('content-disposition'), /sovereign-docs-dep_test_001-source\.tar/);
  const tarBytes = Buffer.from(await sourceDownload.arrayBuffer());
  const tarText = tarBytes.toString('utf8');
  assert.match(tarText, /\.skyenet\/source-manifest\.json/);
  assert.match(tarText, /private-full-project/);
  assert.match(tarText, /netlify\/functions\/hello\.mjs/);
  assert.match(tarText, /package\.json/);
  assert.match(tarText, /export async function handler/);

  const sourceTransfer = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/source-transfer', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'sovereign-docs',
      deployment_id: 'dep_test_001',
      method: 'secure-skye-pack'
    })
  }), context);
  assert.equal(sourceTransfer.status, 200);
  const sourceTransferBody = await sourceTransfer.json();
  assert.equal(sourceTransferBody.method.id, 'secure-skye-pack');
  assert.equal(sourceTransferBody.status, 'completed');
  assert.equal(sourceTransferBody.storage.stored, true);
  assert.equal(sourceTransferBody.storage.content_type, 'application/vnd.skye.secure-pack+json; charset=utf-8');
  assert.match(sourceTransferBody.storage.key, /skyevault\/secure-skye-packs\/customer-31\/workspace-customer-31\/project-sovereign-docs\/deployment-dep_test_001\/srcxfer_/);
  assert.match(sourceTransferBody.storage.key, /\.skye$/);
  assert.equal(sourceTransferBody.secure_pack.object_key, sourceTransferBody.storage.key);
  assert.equal(sourceTransferBody.secure_pack.marker, 'SKYESEC2');
  assert.equal(sourceTransferBody.secure_pack.extension, '.skye');
  assert.equal(sourceTransferBody.secure_pack.plaintext_source_exposed_to_storage, false);
  assert.equal(sourceTransferBody.custody_policy.client_access_without_transfer, false);
  assert.equal(sourceTransferBody.receipt.type, 'skynet.source.transfer.completed');
  assert.ok(env.objects.has(sourceTransferBody.storage.key));
  assert.ok(env.objects.has(sourceTransferBody.storage.manifest_key));
  assert.ok(env.objects.has(sourceTransferBody.storage.key_custody_key));
  const skyePackObject = await env.DEPLOYMENT_ASSET_BUCKET.get(sourceTransferBody.storage.key);
  const skyePackText = await skyePackObject.text();
  assert.match(skyePackText, /SKYESEC2/);
  assert.match(skyePackText, /payload_base64/);
  assert.doesNotMatch(skyePackText, /export async function handler/);
  const keyCustody = await (await env.DEPLOYMENT_ASSET_BUCKET.get(sourceTransferBody.storage.key_custody_key)).json();
  assert.equal(keyCustody.public_response_exposes_key, false);
  assert.ok(keyCustody.key_base64);

  for (const method of ['skyedrive', 'skyevault']) {
    const response = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/source-transfer', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        project_id: 'sovereign-docs',
        deployment_id: 'dep_test_001',
        method
      })
    }), context);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'completed');
    assert.equal(body.method.id, method);
    assert.equal(body.storage.stored, true);
    assert.equal(body.storage.content_type, 'application/x-tar');
    assert.match(body.storage.key, new RegExp(`${method}/source-transfers/customer-31/workspace-customer-31/project-sovereign-docs/deployment-dep_test_001/srcxfer_`));
    assert.match(body.storage.key, /\.tar$/);
    const storedTar = await env.DEPLOYMENT_ASSET_BUCKET.get(body.storage.key);
    const storedTarText = await storedTar.text();
    assert.match(storedTarText, /\.skyenet\/source-manifest\.json/);
    assert.match(storedTarText, /export async function handler/);
  }
});

test('SkyeNet deploy API rejects source/runtime asset paths', async () => {
  const env = mockEnv();
  const response = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/upload?projectId=bad&deploymentId=dep_bad&path=runtime/store.json',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: '{}'
    }
  ), { env });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, 'SOURCE_PATH_BLOCKED');
});
