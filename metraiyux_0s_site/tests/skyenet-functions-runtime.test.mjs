import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { convertProject } from '../../tools/skyenet-functions-convert.mjs';
import { createServer } from '../../tools/skyenet-functions-runtime.mjs';

async function tempProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skyenet-functions-'));
  await fs.mkdir(path.join(root, 'netlify/functions'), { recursive: true });
  await fs.writeFile(path.join(root, 'netlify/functions/hello.mjs'), `
export async function handler(event, context) {
  return {
    statusCode: 201,
    headers: {'content-type': 'application/json; charset=utf-8', 'x-skyenet-function': context.functionName},
    body: JSON.stringify({
      ok: true,
      method: event.httpMethod,
      query: event.queryStringParameters,
      body: event.body,
      multi: event.multiValueQueryStringParameters,
      cookies: event.cookies,
      runtime: context.runtime
    })
  };
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/slow.mjs'), `
export async function handler() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { statusCode: 200, body: 'late' };
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/secret.mjs'), `
export async function handler() {
  return {
    statusCode: 200,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body: JSON.stringify({
      allowed: process.env.ALLOWED_SECRET || '',
      forbidden: process.env.FORBIDDEN_SECRET || ''
    })
  };
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/egress.mjs'), `
export async function handler() {
  await fetch('https://example.com/');
  return { statusCode: 200, body: 'egress-open' };
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/binary.mjs'), `
export async function handler(event) {
  return {
    statusCode: 200,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body: JSON.stringify({isBase64Encoded: event.isBase64Encoded, body: event.body})
  };
}
`);
  return root;
}

async function withServer(bundleDir, fn, options = {}) {
  const server = createServer({ bundleDir, timeoutMs: options.timeoutMs || 30000, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
  }
}

async function readManifest(bundleDir) {
  return JSON.parse(await fs.readFile(path.join(bundleDir, 'manifest.json'), 'utf8'));
}

async function writeManifest(bundleDir, manifest) {
  await fs.writeFile(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function signManifest(manifest, key) {
  const clone = { ...manifest };
  delete clone.signature;
  return crypto.createHmac('sha256', key).update(JSON.stringify(clone)).digest('hex');
}

test('SkyeNet Functions converts and serves Netlify-compatible handler routes', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  const result = await convertProject(root, { outDir });
  assert.equal(result.manifest.function_count, 5);
  assert.ok(result.manifest.functions.some((fn) => fn.name === 'hello' && fn.routes.includes('/.netlify/functions/hello')));

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/hello?plan=free99&plan=paid`, {
      method: 'POST',
      headers: { cookie: 'sky=net' },
      body: 'payload',
    });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('x-skyenet-function'), 'hello');
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.method, 'POST');
    assert.equal(body.query.plan, 'paid');
    assert.deepEqual(body.multi.plan, ['free99', 'paid']);
    assert.deepEqual(body.cookies, ['sky=net']);
    assert.equal(body.body, 'payload');
    assert.equal(body.runtime, 'skyenet-functions-v0');
  });
});

test('SkyeNet Functions runtime enforces invocation timeout', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  await convertProject(root, { outDir });

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.skyenet/functions/slow`);
    assert.equal(response.status, 504);
    const body = await response.json();
    assert.equal(body.error, 'Function timed out');
  }, { timeoutMs: 100 });
});

test('SkyeNet Functions runtime keeps env deny-by-default and grants only declared function secrets', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  await convertProject(root, { outDir });
  const manifest = await readManifest(outDir);
  const secret = manifest.functions.find((fn) => fn.name === 'secret');
  secret.limits.env_grants = ['ALLOWED_SECRET'];
  await writeManifest(outDir, manifest);

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/secret`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.allowed, 'visible-to-this-function');
    assert.equal(body.forbidden, '');
  }, { envGrants: { secret: { ALLOWED_SECRET: 'visible-to-this-function', FORBIDDEN_SECRET: 'must-not-leak' } } });
});

test('SkyeNet Functions runtime denies outbound fetch by default', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  await convertProject(root, { outDir });

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/egress`);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.error, 'Function failed');
    assert.match(body.stderr, /egress is denied/i);
  });
});

test('SkyeNet Functions runtime enforces request body caps and binary body shape', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  await convertProject(root, { outDir });

  await withServer(outDir, async (origin) => {
    const binary = await fetch(`${origin}/.skyenet/functions/binary`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: Buffer.from([1, 2, 3, 4]),
    });
    assert.equal(binary.status, 200);
    const binaryBody = await binary.json();
    assert.equal(binaryBody.isBase64Encoded, true);
    assert.equal(binaryBody.body, Buffer.from([1, 2, 3, 4]).toString('base64'));

    const tooLarge = await fetch(`${origin}/.skyenet/functions/binary`, {
      method: 'POST',
      body: 'too long',
    });
    assert.equal(tooLarge.status, 413);
  }, { maxBodyBytes: 4 });
});

test('SkyeNet Functions runtime verifies signed bundles when required', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  const signingKey = 'unit-test-signing-key';
  await convertProject(root, { outDir, signingKey, tenantId: 'tenant-proof' });

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/hello`);
    assert.equal(response.status, 201);
  }, { signingKey, requireSignature: true });

  const manifest = await readManifest(outDir);
  manifest.tenant_id = 'tampered-tenant';
  await writeManifest(outDir, manifest);
  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/hello`);
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.error, /signature mismatch/i);
  }, { signingKey, requireSignature: true });
});
