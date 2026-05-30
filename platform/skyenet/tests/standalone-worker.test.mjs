import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker.js';

function env() {
  const calls = [];
  return {
    calls,
    SKYENET_PUBLIC_HOST: 'skyenet.example.test',
    ZERO_OS_ORIGIN: 'https://zero.example.test',
    SKYENET_RUNTIME_ORIGIN: 'https://fs27.example.test',
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return new Response('<!doctype html><title>SkyeNet</title><body>SkyeNet standalone</body>', {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          });
        }
        if (url.pathname === '/console.html') {
          return new Response('<!doctype html><title>Console</title><body>SkyeNet Console</body>', {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          });
        }
        if (url.pathname === '/publish.html') {
          return new Response('<!doctype html><title>Post to SkyeNet</title><body>Post to SkyeNet $97/mo Free99</body>', {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          });
        }
        return new Response('missing', { status: 404 });
      }
    },
    SKYENET_RUNTIME: {
      async fetch(request) {
        const url = new URL(request.url);
        calls.push({
          method: request.method,
          url: url.toString(),
          path: url.pathname,
          host: url.hostname,
          source: request.headers.get('x-metraiyux-session-source'),
          publicHost: request.headers.get('x-skynet-public-host'),
          auth: request.headers.get('authorization')
        });
        if (url.pathname === '/deploy/source-download') {
          return new Response('tar-bytes', {
            headers: {
              'content-type': 'application/x-tar',
              'content-disposition': 'attachment; filename="source.tar"'
            }
          });
        }
        if (url.pathname === '/deploy/source-transfer') {
          const body = await request.json().catch(() => ({}));
          return Response.json({
            ok: true,
            service: 'fs27-skynet',
            path: url.pathname,
            method: { id: body.method || 'download' },
            custody_policy: { client_access_without_transfer: false }
          });
        }
        if (url.pathname === '/deploy/env') {
          return Response.json({
            ok: true,
            service: 'fs27-skynet',
            path: url.pathname,
            env: [{ key: 'API_TOKEN', value_preview: '****1234' }]
          });
        }
        if (url.pathname === '/deploy/source-upload' || url.pathname === '/deploy/source-complete') {
          return Response.json({ ok: true, service: 'fs27-skynet', path: url.pathname });
        }
        if (url.pathname.startsWith('/deploy/')) {
          return Response.json({ ok: true, service: 'fs27-skynet', path: url.pathname });
        }
        return new Response('client app', {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-skynet-route': 'r2-deployment',
            'x-skynet-project-id': 'bobs-smoke-shop'
          }
        });
      }
    }
  };
}

function req(path, init = {}) {
  return new Request(`https://skyenet.example.test${path}`, init);
}

function hostReq(hostname, path, init = {}) {
  return new Request(`https://${hostname}${path}`, init);
}

test('standalone SkyeNet serves its own homepage from assets', async () => {
  const e = env();
  const response = await worker.fetch(req('/'), e);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-skynet-standalone-project'), 'skyenet');
  assert.match(await response.text(), /SkyeNet standalone/);
});

test('standalone SkyeNet console exposes full package publisher controls', async () => {
  const e = env();
  const response = await worker.fetch(req('/console'), e);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Publish package/);
  assert.match(html, /name="public_files"/);
  assert.match(html, /name="source_files"/);
  assert.match(html, /Publish full package/);
});

test('standalone SkyeNet API maps to FS27 deploy API and preserves shared gate bearer', async () => {
  const e = env();
  const response = await worker.fetch(req('/api/skyenet/status', {
    headers: { authorization: 'Bearer gate-token' }
  }), e);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.path, '/deploy/status');
  assert.equal(e.calls[0].source, 'standalone-skynet');
  assert.equal(e.calls[0].publicHost, 'skyenet.example.test');
  assert.equal(e.calls[0].auth, 'Bearer gate-token');
});

test('standalone SkyeNet source-download keeps the account bearer and tar response', async () => {
  const e = env();
  const response = await worker.fetch(req('/api/skyenet/source-download?workspace_id=bobs-smoke-shop&project_id=bobs-smoke-shop&deployment_id=dep_1', {
    headers: { authorization: 'Bearer gate-token' }
  }), e);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/x-tar');
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="source.tar"');
  assert.equal(await response.text(), 'tar-bytes');
  assert.equal(e.calls[0].path, '/deploy/source-download');
  assert.equal(e.calls[0].auth, 'Bearer gate-token');
});

test('standalone SkyeNet source-transfer maps to FS27 and keeps custody behind gate', async () => {
  const e = env();
  const response = await worker.fetch(req('/api/skyenet/source-transfer', {
    method: 'POST',
    headers: { authorization: 'Bearer gate-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      workspace_id: 'bobs-smoke-shop',
      project_id: 'bobs-smoke-shop',
      deployment_id: 'dep_1',
      method: 'secure-skye-pack'
    })
  }), e);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.path, '/deploy/source-transfer');
  assert.equal(body.method.id, 'secure-skye-pack');
  assert.equal(body.custody_policy.client_access_without_transfer, false);
  assert.equal(e.calls[0].path, '/deploy/source-transfer');
  assert.equal(e.calls[0].auth, 'Bearer gate-token');
});

test('standalone SkyeNet env and private source APIs map to FS27', async () => {
  const e = env();
  const envResponse = await worker.fetch(req('/api/skyenet/env?workspace_id=demo&project_id=demo', {
    headers: { authorization: 'Bearer gate-token' }
  }), e);
  assert.equal(envResponse.status, 200);
  assert.equal((await envResponse.json()).path, '/deploy/env');
  assert.equal(e.calls[0].path, '/deploy/env');

  const uploadResponse = await worker.fetch(req('/api/skyenet/source-upload?workspaceId=demo&projectId=demo&deploymentId=dep_1&path=package.json', {
    method: 'PUT',
    headers: { authorization: 'Bearer gate-token' },
    body: '{}'
  }), e);
  assert.equal(uploadResponse.status, 200);
  assert.equal((await uploadResponse.json()).path, '/deploy/source-upload');
  assert.equal(e.calls[1].path, '/deploy/source-upload');
});

test('standalone SkyeNet client app routes stay on the standalone host', async () => {
  const e = env();
  const response = await worker.fetch(req('/bobs-smoke-shop/'), e);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-skynet-route'), 'r2-deployment');
  assert.equal(response.headers.get('x-skynet-project-id'), 'bobs-smoke-shop');
  assert.equal(e.calls[0].host, 'skyenet.example.test');
  assert.equal(e.calls[0].path, '/bobs-smoke-shop/');
});

test('host-native company root routes to the deployment runtime', async () => {
  const e = env();
  const response = await worker.fetch(hostReq('skyenet.skyesol', '/'), e);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-skynet-route'), 'r2-deployment');
  assert.equal(e.calls[0].host, 'skyenet.skyesol');
  assert.equal(e.calls[0].path, '/');
});

test('host-native company assets route to the deployment runtime', async () => {
  const e = env();
  const response = await worker.fetch(hostReq('skyenet.skyesol', '/assets/site.css'), e);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-skynet-route'), 'r2-deployment');
  assert.equal(e.calls[0].host, 'skyenet.skyesol');
  assert.equal(e.calls[0].path, '/assets/site.css');
});

test('standalone SkyeNet serves public posting guide', async () => {
  const e = env();
  const response = await worker.fetch(req('/publish/'), e);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Post to SkyeNet/);
  assert.equal(e.calls.length, 0);
});

test('standalone SkyeNet pricing alias redirects to public guide anchor', async () => {
  const e = env();
  const response = await worker.fetch(req('/pricing'), e);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://skyenet.example.test/publish/#pricing');
  assert.equal(e.calls.length, 0);
});
