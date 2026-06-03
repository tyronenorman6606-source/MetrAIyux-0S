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
  await fs.mkdir(path.join(root, 'netlify/lib'), { recursive: true });
  await fs.writeFile(path.join(root, 'netlify/lib/message.mjs'), `
export function message() {
  return 'bundled-helper-ok';
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/with-helper.mjs'), `
import { message } from '../lib/message.mjs';

export async function handler() {
  return {
    statusCode: 200,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body: JSON.stringify({ ok: true, message: message() })
  };
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/job-background.mjs'), `
export async function handler(event, context) {
  return {
    statusCode: 202,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body: JSON.stringify({ ok: true, mode: context.triggerKind, body: event.body })
  };
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/tick.mjs'), `
export const config = { schedule: '*/15 * * * *' };

export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body: JSON.stringify({ ok: true, mode: context.triggerKind, schedule: context.functionName, method: event.httpMethod })
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

async function waitForFile(file, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function readManifest(bundleDir) {
  return JSON.parse(await fs.readFile(path.join(bundleDir, 'manifest.json'), 'utf8'));
}

async function writeManifest(bundleDir, manifest) {
  await fs.writeFile(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
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
  assert.equal(result.manifest.function_count, 8);
  assert.equal(result.manifest.background_function_count, 1);
  assert.equal(result.manifest.scheduled_function_count, 1);
  assert.deepEqual(result.manifest.schedules.map((item) => item.function_name), ['tick']);
  assert.ok(result.manifest.functions.some((fn) => fn.name === 'hello' && fn.routes.includes('/.netlify/functions/hello')));
  assert.ok(result.manifest.functions.some((fn) => fn.name === 'job-background' && fn.invocation_mode === 'background'));
  assert.ok(result.manifest.functions.some((fn) => fn.name === 'tick' && fn.schedule.cron === '*/15 * * * *'));

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

test('SkyeNet Functions runtime accepts background jobs and writes completion receipts', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  const jobsDir = path.join(root, 'background-jobs');
  await convertProject(root, { outDir });

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/job-background`, {
      method: 'POST',
      body: 'run-later'
    });
    assert.equal(response.status, 202);
    const body = await response.json();
    assert.equal(body.accepted, true);
    assert.equal(body.mode, 'background');
    assert.equal(response.headers.get('x-skynet-background-job'), body.job_id);
    const receipt = await waitForFile(body.receipt_path);
    assert.equal(receipt.status, 'completed');
    assert.equal(receipt.function_name, 'job-background');
    assert.equal(receipt.result.statusCode, 202);
    assert.match(receipt.result.body, /run-later/);
  }, { backgroundJobsDir: jobsDir });
});

test('SkyeNet Functions runtime triggers scheduled functions through the scheduled lane', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  await convertProject(root, { outDir });

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.skyenet/scheduled/tick`, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-skynet-scheduled-function'), 'tick');
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.mode, 'scheduled');
    assert.equal(body.schedule, 'tick');

    const notScheduled = await fetch(`${origin}/.skyenet/scheduled/hello`, { method: 'POST' });
    assert.equal(notScheduled.status, 409);
  });
});

test('SkyeNet Functions bundles local helper imports for customer-uploaded functions', async () => {
  const root = await tempProject();
  const outDir = path.join(root, '.skyenet/functions-bundle');
  const result = await convertProject(root, { outDir });
  const helper = result.manifest.functions.find((fn) => fn.name === 'with-helper');
  assert.ok(helper);
  const bundledSource = await fs.readFile(path.join(outDir, helper.bundle_path), 'utf8');
  assert.match(bundledSource, /bundled-helper-ok/);
  assert.doesNotMatch(bundledSource, /from ['"]\.\.\/lib\/message/);

  await withServer(outDir, async (origin) => {
    const response = await fetch(`${origin}/.netlify/functions/with-helper`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { ok: true, message: 'bundled-helper-ok' });
  });
});

test('SkyeNet Functions build jail installs dependencies, runs build output, and scrubs secrets', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skyenet-functions-build-jail-'));
  await fs.mkdir(path.join(root, 'netlify/functions'), { recursive: true });
  await fs.mkdir(path.join(root, 'vendor/jail-generated-dep'), { recursive: true });
  await fs.mkdir(path.join(root, 'tools'), { recursive: true });
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
    type: 'module',
    scripts: {
      preinstall: 'node tools/assert-scrubbed-build-env.mjs preinstall',
      build: 'node tools/assert-scrubbed-build-env.mjs build'
    },
    dependencies: {
      'jail-generated-dep': 'file:./vendor/jail-generated-dep'
    }
  }, null, 2));
  await fs.writeFile(path.join(root, 'vendor/jail-generated-dep/package.json'), JSON.stringify({
    name: 'jail-generated-dep',
    version: '1.0.0',
    type: 'module',
    main: 'index.mjs'
  }, null, 2));
  await fs.writeFile(path.join(root, 'vendor/jail-generated-dep/index.mjs'), `
export const dependencyValue = 'dependency-installed-in-jail';
`);
  await fs.writeFile(path.join(root, 'tools/assert-scrubbed-build-env.mjs'), `
import fs from 'node:fs/promises';

const stage = process.argv[2] || 'unknown';
const leaked = process.env.SKYE_JAIL_SECRET || '';
if (leaked) throw new Error('secret leaked into ' + stage + ' env');
if (stage === 'preinstall') {
  await fs.writeFile('install-env-check.json', JSON.stringify({ stage, leaked }, null, 2));
}
if (stage === 'build') {
  await fs.mkdir('netlify/lib', { recursive: true });
  await fs.writeFile('netlify/lib/generated-env.mjs', 'export const buildEnvSecret = "";\\nexport const buildGeneratedValue = "build-generated-in-jail";\\n');
}
`);
  await fs.writeFile(path.join(root, 'netlify/functions/uses-generated-dependency.mjs'), `
import { dependencyValue } from 'jail-generated-dep';
import { buildEnvSecret, buildGeneratedValue } from '../lib/generated-env.mjs';

export async function handler() {
  return {
    statusCode: 200,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body: JSON.stringify({ dependencyValue, buildGeneratedValue, buildEnvSecret })
  };
}
`);

  const previousSecret = process.env.SKYE_JAIL_SECRET;
  process.env.SKYE_JAIL_SECRET = 'super-secret-build-value';
  try {
    const outDir = path.join(root, '.skyenet/functions-bundle');
    const result = await convertProject(root, {
      outDir,
      installBuild: true,
      installBuildTimeoutMs: 60000,
      installBuildOsJail: 'required'
    });
    assert.equal(result.manifest.function_count, 1);
    assert.equal(result.manifest.build_pipeline.env_scrubbed, true);
    assert.equal(result.manifest.build_pipeline.bundled_from_jail, true);
    assert.equal(result.manifest.build_pipeline.os_jail.mode, 'linux-user-mount-pid-chroot');
    assert.equal(result.manifest.build_pipeline.os_jail.enabled, true);
    assert.equal(await fileExists(path.join(root, 'node_modules')), false);
    assert.equal(await fileExists(path.join(root, 'netlify/lib/generated-env.mjs')), false);

    const receipt = JSON.parse(await fs.readFile(path.join(outDir, 'build-receipt.json'), 'utf8'));
    assert.equal(receipt.ok, true);
    assert.equal(receipt.package_manager, 'npm');
    assert.equal(receipt.isolation.mode, 'linux-user-mount-pid-chroot');
    assert.equal(receipt.isolation.enabled, true);
    assert.equal(receipt.commands.length, 2);
    assert.equal(receipt.commands.every((command) => command.isolation.mode === 'linux-user-mount-pid-chroot'), true);
    assert.match(receipt.commands[0].command, /^npm install$/);
    assert.match(receipt.commands[1].command, /^npm run build$/);
    assert.doesNotMatch(JSON.stringify(receipt), /super-secret-build-value/);

    const fn = result.manifest.functions.find((item) => item.name === 'uses-generated-dependency');
    const bundled = await fs.readFile(path.join(outDir, fn.bundle_path), 'utf8');
    assert.match(bundled, /dependency-installed-in-jail/);
    assert.match(bundled, /build-generated-in-jail/);

    await withServer(outDir, async (origin) => {
      const response = await fetch(`${origin}/.netlify/functions/uses-generated-dependency`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body, {
        dependencyValue: 'dependency-installed-in-jail',
        buildGeneratedValue: 'build-generated-in-jail',
        buildEnvSecret: ''
      });
    });
  } finally {
    if (previousSecret === undefined) delete process.env.SKYE_JAIL_SECRET;
    else process.env.SKYE_JAIL_SECRET = previousSecret;
  }
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
