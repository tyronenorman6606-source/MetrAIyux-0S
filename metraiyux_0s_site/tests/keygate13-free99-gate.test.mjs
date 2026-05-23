import test from 'node:test';
import assert from 'node:assert/strict';
import siteWorker from '../cloudflare/worker.js';

function ctx() {
  const waits = [];
  return {
    waits,
    waitUntil(promise) { waits.push(Promise.resolve(promise)); }
  };
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: body.token === 'fs27-keygate-token',
        sub: 'keygate13-free99-test',
        email: 'keygate13@example.invalid',
        role: 'operator',
        scope: 'gateway.invoke admin.read',
        customer_id: 'workspace-keygate13-free99-test'
      });
    }
  };
}

function env() {
  return {
    SKYGATEFS27_WORKER: gateWorker(),
    ASSETS: {
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        if (pathname === '/Free99/apps/keygate13/index.html') {
          return new Response('<!doctype html><title>KeyGate 13</title><main>KeyGate 13 Free99 Mount</main>', {
            headers: {'content-type': 'text/html; charset=utf-8'}
          });
        }
        return new Response(`asset:${pathname}`, {status: 404});
      }
    }
  };
}

function req(path, {token, accept = 'text/html'} = {}) {
  const headers = {accept};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(`https://metraiyux.example${path}`, {headers});
}

test('KeyGate 13 Free99 mount redirects unauthenticated browser requests to the shared 0S gate', async () => {
  const response = await siteWorker.fetch(req('/Free99/apps/keygate13/index.html'), env(), ctx());
  assert.equal(response.status, 302);
  assert.match(
    response.headers.get('location') || '',
    /\/admin\/login\.html\?return=%2FFree99%2Fapps%2Fkeygate13%2Findex\.html/
  );
  assert.equal(response.headers.get('x-0s-gate'), 'fs27-required');
});

test('KeyGate 13 Free99 mount renders normally with a shared FS27 bearer', async () => {
  const response = await siteWorker.fetch(
    req('/Free99/apps/keygate13/index.html', {token: 'fs27-keygate-token'}),
    env(),
    ctx()
  );
  assert.equal(response.status, 200);
  assert.match(await response.text(), /KeyGate 13 Free99 Mount/);
});
