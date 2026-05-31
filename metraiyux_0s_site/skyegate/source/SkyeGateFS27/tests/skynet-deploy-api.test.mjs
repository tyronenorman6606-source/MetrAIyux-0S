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
  const completeBody = await complete.json();
  assert.equal(completeBody.asset_audit.ok, true);
  assert.equal(completeBody.asset_audit.checked_count, 2);
  assert.equal(completeBody.deployment.status, 'complete');
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
  assert.equal(sourceCompleteBody.source_package.index_file_count, 2);
  assert.equal(sourceCompleteBody.source_package.files_truncated, false);
  assert.equal(sourceCompleteBody.source_package.storage_verified, true);
  assert.equal(sourceCompleteBody.source_package.storage_checked_count, 2);
  assert.match(sourceCompleteBody.source_package.manifest_key, /\.skyenet\/source-package\.json$/);
  assert.match(sourceCompleteBody.source_package.index_key, /\.skyenet\/source-index\.jsonl$/);
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-sovereign-docs/deployment-dep_test_001/.skyenet/source-package.json'));
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-sovereign-docs/deployment-dep_test_001/.skyenet/source-index.jsonl'));

  const sourceManifest = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-manifest?project_id=sovereign-docs&deployment_id=dep_test_001',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(sourceManifest.status, 200);
  const sourceManifestBody = await sourceManifest.json();
  assert.equal(sourceManifestBody.source_mode, 'private-full-project');
  assert.equal(sourceManifestBody.file_count, 2);
  assert.deepEqual(sourceManifestBody.files, ['netlify/functions/hello.mjs', 'package.json']);

  const sourceTree = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-tree?project_id=sovereign-docs&deployment_id=dep_test_001',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(sourceTree.status, 200);
  const sourceTreeBody = await sourceTree.json();
  assert.ok(sourceTreeBody.entries.some((entry) => entry.type === 'directory' && entry.path === 'netlify'));
  assert.ok(sourceTreeBody.entries.some((entry) => entry.type === 'file' && entry.path === 'package.json'));

  const sourceFile = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-file?project_id=sovereign-docs&deployment_id=dep_test_001&path=package.json',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(sourceFile.status, 200);
  const sourceFileBody = await sourceFile.json();
  assert.equal(sourceFileBody.path, 'package.json');
  assert.match(sourceFileBody.text, /"build":"vite"/);

  const sourceSearch = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-search?project_id=sovereign-docs&deployment_id=dep_test_001&q=handler',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(sourceSearch.status, 200);
  const sourceSearchBody = await sourceSearch.json();
  assert.equal(sourceSearchBody.mode, 'path-and-small-text-content');
  assert.ok(sourceSearchBody.results.some((result) => result.path === 'netlify/functions/hello.mjs' && result.match === 'content'));

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
  assert.equal(statusBody.capabilities.ide_readable_source_codebases, true);
  assert.equal(statusBody.capabilities.private_source_tree_api, true);
  assert.equal(statusBody.capabilities.private_source_file_api, true);
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
  assert.equal(dashboardBody.deployments[0].source_manifest_url, '/api/skyenet/source-manifest?workspace_id=customer-31&project_id=sovereign-docs&deployment_id=dep_test_001');
  assert.equal(dashboardBody.deployments[0].source_tree_url, '/api/skyenet/source-tree?workspace_id=customer-31&project_id=sovereign-docs&deployment_id=dep_test_001');
  assert.equal(dashboardBody.deployments[0].source_search_url, '/api/skyenet/source-search?workspace_id=customer-31&project_id=sovereign-docs&deployment_id=dep_test_001');
  assert.equal(dashboardBody.deployments[0].source_transfer_url, '/api/skyenet/source-transfer');
  assert.equal(dashboardBody.deployments[0].source_custody.client_handoff_requires_transfer, true);
  assert.equal(dashboardBody.deployments[0].source_custody.secure_pack_extension, '.skye');
  assert.equal(dashboardBody.deployments[0].source_custody.private_full_project_package, true);
  assert.equal(dashboardBody.deployments[0].source_custody.private_source_file_count, 2);
  assert.equal(dashboardBody.deployments[0].source_custody.ide_readable_codebase, true);

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

test('SkyeNet deploy API refuses unverified complete and route records', async () => {
  const env = mockEnv();
  const context = { env };

  assert.equal((await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/init', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ project_id: 'missing-asset-demo', deployment_id: 'dep_missing_assets' })
  }), context)).status, 200);

  assert.equal((await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/upload?projectId=missing-asset-demo&deploymentId=dep_missing_assets&path=index.html',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'text/html; charset=utf-8' }),
      body: '<h1>Only Root</h1>'
    }
  ), context)).status, 200);

  const earlyRoute = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/route', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      hostname: 'skynet.example.com',
      mount_path: '/missing-asset-demo',
      project_id: 'missing-asset-demo',
      deployment_id: 'dep_missing_assets',
      public_access: true
    })
  }), context);
  assert.equal(earlyRoute.status, 409);
  assert.equal((await earlyRoute.json()).code, 'DEPLOYMENT_NOT_COMPLETE');

  const badComplete = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/complete', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'missing-asset-demo',
      deployment_id: 'dep_missing_assets',
      files: ['index.html', 'assets/missing.css']
    })
  }), context);
  assert.equal(badComplete.status, 409);
  const badCompleteBody = await badComplete.json();
  assert.equal(badCompleteBody.code, 'DEPLOYMENT_ASSET_MISSING');
  assert.deepEqual(badCompleteBody.missing_files, ['assets/missing.css']);

  const goodComplete = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/complete', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'missing-asset-demo',
      deployment_id: 'dep_missing_assets',
      files: ['index.html']
    })
  }), context);
  assert.equal(goodComplete.status, 200);

  const readyRoute = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/route', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      hostname: 'skynet.example.com',
      mount_path: '/missing-asset-demo',
      project_id: 'missing-asset-demo',
      deployment_id: 'dep_missing_assets',
      public_access: true
    })
  }), context);
  assert.equal(readyRoute.status, 200);
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

test('SkyeNet private source custody preserves owner-gated package paths that public assets reject', async () => {
  const env = mockEnv();
  const context = { env };
  const files = [
    { path: 'runtime/standalone-apps/appointmentsetter/data/appointments.db', size: 2048, content_type: 'application/octet-stream' },
    { path: 'proof-pack/direct-workspaces/testnode/artifacts/public-trust-pack/leaf.key', size: 4096, content_type: 'application/octet-stream' }
  ];

  const privateIndex = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-index?project_id=private-paths&deployment_id=dep_private_paths',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/x-ndjson; charset=utf-8' }),
      body: `${files.map((file) => JSON.stringify(file)).join('\n')}\n`
    }
  ), context);
  assert.equal(privateIndex.status, 200);
  const body = await privateIndex.json();
  assert.equal(body.source_package.file_count, 2);
  assert.equal(body.source_package.files[0].path, files[0].path);
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-private-paths/deployment-dep_private_paths/.skyenet/source-index-pages/page-000000.json'));
});

test('SkyeNet source-complete stores large source indexes outside the inline deployment file cap', async () => {
  const env = mockEnv();
  const context = { env };
  const files = Array.from({ length: 20001 }, (_item, index) => ({
    path: `src/generated/file-${String(index).padStart(5, '0')}.js`,
    size: index + 1,
    content_type: 'text/javascript; charset=utf-8'
  }));

  const indexUpload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-index?project_id=large-source&deployment_id=dep_large_index',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/x-ndjson; charset=utf-8' }),
      body: `${files.map((file) => JSON.stringify(file)).join('\n')}\n`
    }
  ), context);
  assert.equal(indexUpload.status, 200);
  const indexBody = await indexUpload.json();
  assert.equal(indexBody.source_index.file_count, 20001);
  assert.equal(indexBody.source_index.files_truncated, true);

  const complete = await handleSkyeNetDeployRequest(new Request('https://fs27.example.com/deploy/source-complete', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      project_id: 'large-source',
      deployment_id: 'dep_large_index',
      index_key: indexBody.source_index.key,
      file_count: indexBody.source_index.file_count,
      sample_files: files.slice(0, 1000)
    })
  }), context);
  assert.equal(complete.status, 200);
  const body = await complete.json();
  assert.equal(body.source_package.file_count, 20001);
  assert.equal(body.source_package.files.length, 0);
  assert.equal(body.source_package.sample_files.length, 1000);
  assert.equal(body.source_package.files_truncated, true);
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-large-source/deployment-dep_large_index/.skyenet/source-index.jsonl'));

  const manifest = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-manifest?project_id=large-source&deployment_id=dep_large_index&limit=3',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(manifest.status, 200);
  const manifestBody = await manifest.json();
  assert.equal(manifestBody.file_count, 20001);
  assert.equal(manifestBody.files.length, 3);
  assert.equal(manifestBody.next_cursor, '3');
  assert.equal(manifestBody.files[0].path, 'src/generated/file-00000.js');
  assert.equal(manifestBody.index_paged, true);

  const tree = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-tree?project_id=large-source&deployment_id=dep_large_index&prefix=src/generated&limit=2',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(tree.status, 200);
  const treeBody = await tree.json();
  assert.equal(treeBody.entries.length, 2);
  assert.equal(treeBody.next_cursor, '2');
  assert.equal(treeBody.tree_paged, true);

  const archive = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-archive?project_id=large-source&deployment_id=dep_large_index&filename=large-source.tar.zst',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/zstd' }),
      body: 'stored-archive-bytes'
    }
  ), context);
  assert.equal(archive.status, 200);
  const archiveBody = await archive.json();
  assert.equal(archiveBody.source_archive.filename, 'large-source.tar.zst');
  assert.match(archiveBody.source_archive.key, /\.skyenet\/archive\/large-source\.tar\.zst$/);

  const archiveLink = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-archive-link',
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        project_id: 'large-source',
        deployment_id: 'dep_large_index',
        key: archiveBody.source_archive.key,
        filename: archiveBody.source_archive.filename,
        bytes: archiveBody.source_archive.bytes,
        sha256: archiveBody.source_archive.sha256,
        content_type: archiveBody.source_archive.content_type,
        recovery_receipt: 'test-artifacts/netlify-quantumskyes-drive-handoff/handoff-summary.json'
      })
    }
  ), context);
  assert.equal(archiveLink.status, 200);
  const archiveLinkBody = await archiveLink.json();
  assert.equal(archiveLinkBody.source_archive.key, archiveBody.source_archive.key);
  assert.equal(archiveLinkBody.source_archive.bytes, 20);

  const download = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-download?project_id=large-source&deployment_id=dep_large_index',
    { method: 'GET', headers: authHeaders() }
  ), context);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('x-skynet-source-download'), 'stored-archive');
  assert.equal(download.headers.get('content-disposition'), 'attachment; filename="large-source.tar.zst"');
  assert.equal(await download.text(), 'stored-archive-bytes');

  const rangeDownload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-download?project_id=large-source&deployment_id=dep_large_index',
    { method: 'GET', headers: authHeaders({ range: 'bytes=7-13' }) }
  ), context);
  assert.equal(rangeDownload.status, 206);
  assert.equal(rangeDownload.headers.get('content-range'), 'bytes 7-13/20');
  assert.equal(rangeDownload.headers.get('accept-ranges'), 'bytes');
  assert.equal(await rangeDownload.text(), 'archive');

  const transfer = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-transfer',
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        project_id: 'large-source',
        deployment_id: 'dep_large_index',
        method: 'skyevault',
        vault_id: 'large-source-proof-vault'
      })
    }
  ), context);
  assert.equal(transfer.status, 200);
  const transferBody = await transfer.json();
  assert.equal(transferBody.status, 'completed');
  assert.equal(transferBody.archive.file_count, 20001);
  assert.equal(transferBody.archive.stored_archive_reused, true);
  assert.equal(transferBody.storage.stored, true);
  assert.equal(transferBody.storage.stored_archive_reused, true);
  assert.equal(transferBody.storage.filename, 'large-source.tar.zst');
  assert.ok(env.objects.has(transferBody.storage.key));
});

test('SkyeNet private source uploads accept dependency trees and do not stop at the inline file cap', async () => {
  const env = mockEnv();
  const context = { env };
  const files = Array.from({ length: 20001 }, (_item, index) => ({
    path: `node_modules/demo-pkg/file-${String(index).padStart(5, '0')}.js`,
    size: 10,
    content_type: 'text/javascript; charset=utf-8'
  }));

  const indexUpload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-index?project_id=dependency-tree&deployment_id=dep_dependency_tree',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/x-ndjson; charset=utf-8' }),
      body: `${files.map((file) => JSON.stringify(file)).join('\n')}\n`
    }
  ), context);
  assert.equal(indexUpload.status, 200);

  const upload = await handleSkyeNetDeployRequest(new Request(
    'https://fs27.example.com/deploy/source-upload?project_id=dependency-tree&deployment_id=dep_dependency_tree&path=node_modules/demo-pkg/live.js',
    {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'text/javascript; charset=utf-8' }),
      body: 'export const live = true;'
    }
  ), context);
  assert.equal(upload.status, 200);
  const body = await upload.json();
  assert.equal(body.source_package.file_count, 20002);
  assert.equal(body.source_package.files_truncated, true);
  assert.ok(env.objects.has('source-packages/customer-31/workspace-customer-31/project-dependency-tree/deployment-dep_dependency_tree/node_modules/demo-pkg/live.js'));
});
