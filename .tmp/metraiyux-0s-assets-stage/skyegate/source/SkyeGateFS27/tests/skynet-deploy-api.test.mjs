import assert from 'node:assert/strict';
import test from 'node:test';
import { handleSkyeNetDeployRequest } from '../cloudflare/skynet-deploy-api.mjs';

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
      }
    },
    ROUTING_KV: {
      async put(key, value, options) {
        routes.set(key, { value, options });
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
