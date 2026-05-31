import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import {
  handleRuntimeEventQueue,
  resolveGatewayRoute,
  withRuntimeLedger
} from '../cloudflare/runtime-observer.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

test('withRuntimeLedger records analytics and queues a redacted event without blocking response', async () => {
  const analytics = [];
  const queued = [];
  const waitUntil = [];
  const env = {
    REQUEST_ANALYTICS: {
      writeDataPoint(point) {
        analytics.push(point);
      }
    },
    REQUEST_EVENT_QUEUE: {
      async send(body) {
        queued.push(body);
      }
    }
  };
  const context = {
    waitUntil(promise) {
      waitUntil.push(promise);
    }
  };
  const request = new Request('https://client.example.com/api/contact?token=do-not-log&source=test', {
    method: 'POST',
    headers: {
      authorization: 'Bearer secret-token',
      cookie: 'skye_gate_session=secret-cookie',
      referer: 'https://referrer.example.com/start',
      'user-agent': 'Mozilla/5.0 Chrome/120'
    },
    body: JSON.stringify({ secret: 'body-not-read' })
  });

  const response = await withRuntimeLedger(request, env, context, async ({ runtimeMeta }) => {
    runtimeMeta.project_id = 'proj_demo';
    runtimeMeta.deployment_id = 'dep_live';
    runtimeMeta.runtime_type = 'function';
    runtimeMeta.function_name = 'contact';
    runtimeMeta.route_decision = 'test.handler';
    return new Response('ok', {
      status: 201,
      headers: { 'content-length': '2' }
    });
  });
  await Promise.all(waitUntil);

  assert.equal(response.status, 201);
  assert.match(response.headers.get('x-0s-request-id'), /^req_/);
  assert.equal(analytics.length, 1);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].project_id, 'proj_demo');
  assert.equal(queued[0].function_name, 'contact');
  assert.equal(queued[0].status_family, '2xx');
  assert.deepEqual(queued[0].query_shape, ['token', 'source']);
  assert.equal(queued[0].referer_host, 'referrer.example.com');
  assert.equal(queued[0].user_agent_family, 'chrome');
  assert.doesNotMatch(JSON.stringify(queued[0]), /secret-token|secret-cookie|body-not-read|do-not-log/);
});

test('resolveGatewayRoute prefers host path mount records over host records', async () => {
  const seenKeys = [];
  const records = new Map([
    ['route:v1:host:skynet.example.com', {
      project_id: 'proj_root',
      active_deployment_id: 'dep_root',
      asset_mode: 'r2',
      asset_prefix: 'deployments/root/active'
    }],
    ['route:v1:host:skynet.example.com:path:/sovereign-docs', {
      project_id: 'proj_docs',
      active_deployment_id: 'dep_docs',
      asset_mode: 'r2',
      asset_prefix: 'deployments/proj_docs/dep_docs',
      mount_path: '/sovereign-docs'
    }]
  ]);
  const env = {
    ROUTING_KV: {
      async get(key) {
        seenKeys.push(key);
        return records.get(key) || null;
      }
    }
  };

  const route = await resolveGatewayRoute(
    new Request('https://skynet.example.com/sovereign-docs/assets/app.js'),
    env
  );

  assert.equal(route.project_id, 'proj_docs');
  assert.equal(route.active_deployment_id, 'dep_docs');
  assert.equal(route.mount_path, '/sovereign-docs');
  assert.equal(route.strip_mount_path, true);
  assert.equal(route.route_key, 'route:v1:host:skynet.example.com:path:/sovereign-docs');
  assert.ok(seenKeys.includes('route:v1:host:skynet.example.com:path:/sovereign-docs'));
});

test('withRuntimeLedger can direct-archive runtime events before returning a response', async () => {
  const r2Writes = [];
  const d1Statements = [];
  const env = {
    FS27_RUNTIME_DIRECT_ARCHIVE: 'sync',
    REQUEST_LOG_BUCKET: {
      async put(key, value, options) {
        r2Writes.push({ key, value, options });
      }
    },
    RUNTIME_ROLLUP_DB: {
      async exec(sql) {
        d1Statements.push({ type: 'exec', sql });
      },
      prepare(sql) {
        return {
          bind(...args) {
            return { type: 'prepared', sql, args };
          }
        };
      },
      async batch(statements) {
        d1Statements.push(...statements);
      }
    }
  };

  const response = await withRuntimeLedger(new Request('https://skynet.example.com/app'), env, {}, async ({ runtimeMeta }) => {
    runtimeMeta.project_id = 'direct_project';
    runtimeMeta.customer_id = 'direct_customer';
    runtimeMeta.deployment_id = 'direct_dep';
    runtimeMeta.runtime_type = 'mapped_route';
    return new Response('ok', { status: 200 });
  });

  assert.equal(response.status, 200);
  assert.equal(r2Writes.length, 1);
  assert.match(r2Writes[0].key, /customer=direct_customer\/project=direct_project/);
  assert.ok(d1Statements.some((item) => item.type === 'prepared' && item.args.includes('direct_project')));
});

test('handleRuntimeEventQueue archives exact events and writes async rollups', async () => {
  const r2Writes = [];
  const d1Statements = [];
  const citadelPosts = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    citadelPosts.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), { status: 202 });
  };

  const env = {
    REQUEST_LOG_BUCKET: {
      async put(key, value, options) {
        r2Writes.push({ key, value, options });
      }
    },
    RUNTIME_ROLLUP_DB: {
      async exec(sql) {
        d1Statements.push({ type: 'exec', sql });
      },
      prepare(sql) {
        return {
          bind(...args) {
            return { type: 'prepared', sql, args };
          }
        };
      },
      async batch(statements) {
        d1Statements.push(...statements);
      }
    },
    CITADEL_RUNTIME_INGEST_URL: 'https://citadel.example.test/runtime-ingest',
    CITADEL_RUNTIME_INGEST_TOKEN: 'citadel-token'
  };

  try {
    const result = await handleRuntimeEventQueue({
      messages: [
        {
          body: {
            schema: 'fs27.runtime_request.v1',
            request_id: 'req_test_1',
            event_ts: '2026-05-22T14:03:12.000Z',
            hostname: 'client.example.com',
            path: '/api/contact',
            method: 'POST',
            query_shape: ['source'],
            project_id: 'proj_demo',
            customer_id: 'cust_demo',
            deployment_id: 'dep_live',
            runtime_type: 'function',
            function_name: 'contact',
            auth_state: 'public',
            status: 500,
            status_family: '5xx',
            duration_ms: 42,
            bytes_out: 17,
            cache_status: 'miss',
            route_decision: 'test.handler',
            error_code: 'boom'
          }
        }
      ]
    }, env, {});

    assert.equal(result.ok, true);
    assert.equal(result.events, 1);
    assert.equal(r2Writes.length, 1);
    assert.match(r2Writes[0].key, /^runtime-logs\/yyyy=2026\/mm=05\/dd=22\/customer=cust_demo\/project=proj_demo\/hour=14\/batch_/);
    assert.match(r2Writes[0].value, /"request_id":"req_test_1"/);
    assert.equal(r2Writes[0].options.httpMetadata.contentType, 'application/x-ndjson; charset=utf-8');
    assert.ok(d1Statements.some((item) => item.type === 'prepared' && item.args.includes('proj_demo') && item.args.includes('5xx')));
    assert.equal(citadelPosts.length, 1);
    assert.equal(citadelPosts[0].url, 'https://citadel.example.test/runtime-ingest');
    assert.equal(citadelPosts[0].init.headers.get('authorization'), 'Bearer citadel-token');
    assert.match(citadelPosts[0].init.body, /"schema":"fs27.runtime_request.batch.v1"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
