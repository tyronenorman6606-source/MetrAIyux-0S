#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { deflateRawSync, gzipSync } from 'node:zlib';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-netlify-parity');
const latestReceipt = path.join(artifactRoot, 'skyenet-netlify-parity-live-http-latest.json');
const fixtureRoot = path.join(repoRoot, 'tmp', 'skyenet-parity-proof');
const publicDir = path.join(fixtureRoot, 'dist');
const projectId = process.env.SKYENET_PARITY_PROJECT || 'skynet-parity-proof';
const workspaceId = process.env.SKYENET_PARITY_WORKSPACE || 'founder-skynet-parity';
const planName = process.env.SKYENET_PARITY_PLAN || 'skyenet-functions-managed';
const host = process.env.SKYENET_PARITY_HOST || 'skyenet.graylondonskyes.workers.dev';
const mount = process.env.SKYENET_PARITY_MOUNT || `/${projectId}`;
const secretProofValue = `proof-secret-${Date.now()}`;
const fetchTimeoutMs = Number(process.env.SKYENET_PARITY_FETCH_TIMEOUT_MS || 45000);

function authHeaders(token) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function readFunctionSigningKey() {
  const envValue = String(process.env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || '').trim();
  if (envValue) return { key: envValue, source: 'env' };
  try {
    const value = (await fs.readFile('/tmp/skynet_function_signing_key', 'utf8')).trim();
    if (value) return { key: value, source: '/tmp/skynet_function_signing_key' };
  } catch {}
  return { key: '', source: 'missing' };
}

async function sha256Text(text) {
  return createHash('sha256').update(String(text || '')).digest('hex');
}

function signFunctionManifest(manifest, signingKey) {
  const clone = { ...manifest };
  delete clone.signature;
  return {
    alg: 'HS256',
    key_hint: createHash('sha256').update(signingKey).digest('hex').slice(0, 12),
    value: createHmac('sha256', signingKey).update(JSON.stringify(clone)).digest('hex')
  };
}

function tarOctal(value, width) {
  return `${Math.max(0, Number(value || 0)).toString(8).padStart(width - 1, '0').slice(0, width - 1)}\0`;
}

function tarHeader(name, size) {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  header.set(encoder.encode(String(name || '').slice(0, 100)), 0);
  header.set(encoder.encode(tarOctal(0o644, 8)), 100);
  header.set(encoder.encode(tarOctal(0, 8)), 108);
  header.set(encoder.encode(tarOctal(0, 8)), 116);
  header.set(encoder.encode(tarOctal(size, 12)), 124);
  header.set(encoder.encode(tarOctal(0, 12)), 136);
  header.fill(32, 148, 156);
  header[156] = '0'.charCodeAt(0);
  header.set(encoder.encode('ustar\0'), 257);
  header.set(encoder.encode('00'), 263);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.set(encoder.encode(tarOctal(sum, 8)), 148);
  return header;
}

function tarPadding(size) {
  const remainder = Number(size || 0) % 512;
  return remainder ? new Uint8Array(512 - remainder) : new Uint8Array();
}

function tarBytes(entries) {
  const encoder = new TextEncoder();
  const chunks = [];
  for (const entry of entries) {
    const body = encoder.encode(entry.text || '');
    chunks.push(tarHeader(entry.path, body.byteLength), body, tarPadding(body.byteLength));
  }
  chunks.push(new Uint8Array(1024));
  const tarSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const tar = new Uint8Array(tarSize);
  let offset = 0;
  for (const chunk of chunks) {
    tar.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return tar;
}

function tarGz(entries) {
  return gzipSync(tarBytes(entries));
}

function tarZst(entries) {
  const tar = tarBytes(entries);
  const result = spawnSync('zstd', ['-q', '-c', '-3'], {
    input: Buffer.from(tar),
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`zstd fixture compression failed: ${result.stderr?.toString?.() || 'unknown error'}`);
  }
  return new Uint8Array(result.stdout);
}

function le16(value) {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function le32(value) {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function zipDeflated(entries) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const body = encoder.encode(entry.text || '');
    const compressed = deflateRawSync(body);
    const localHeader = concatBytes([
      le32(0x04034b50),
      le16(20),
      le16(0x0800),
      le16(8),
      le16(0),
      le16(0),
      le32(0),
      le32(compressed.byteLength),
      le32(body.byteLength),
      le16(name.byteLength),
      le16(0)
    ]);
    localChunks.push(localHeader, name, compressed);
    centralChunks.push(concatBytes([
      le32(0x02014b50),
      le16(20),
      le16(20),
      le16(0x0800),
      le16(8),
      le16(0),
      le16(0),
      le32(0),
      le32(compressed.byteLength),
      le32(body.byteLength),
      le16(name.byteLength),
      le16(0),
      le16(0),
      le16(0),
      le16(0),
      le32(0),
      le32(localOffset)
    ]), name);
    localOffset += localHeader.byteLength + name.byteLength + compressed.byteLength;
  }
  const centralDir = concatBytes(centralChunks);
  const eocd = concatBytes([
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(entries.length),
    le16(entries.length),
    le32(centralDir.byteLength),
    le32(localOffset),
    le16(0)
  ]);
  return concatBytes([...localChunks, centralDir, eocd]);
}

async function functionManifestForSources(sources, signingKey, deploymentId, functionConfig = {}) {
  const functions = [];
  for (const [name, source] of Object.entries(sources)) {
    const config = functionConfig[name] || {};
    const invocationMode = config.invocation_mode || config.invocationMode || (config.background ? 'background' : (config.schedule?.cron ? 'scheduled' : 'request'));
    const routes = [`/.netlify/functions/${name}`, `/.skyenet/functions/${name}`];
    if (invocationMode === 'scheduled') routes.push(`/.skyenet/scheduled/${name}`);
    functions.push({
      name,
      source_path: `netlify/functions/${name}.mjs`,
      bundle_path: `functions/${name}.mjs`,
      runtime: 'node',
      adapter: 'netlify.handler.v1',
      sha256: await sha256Text(source),
      invocation_mode: invocationMode,
      background: invocationMode === 'background',
      schedule: invocationMode === 'scheduled' ? {
        cron: config.schedule?.cron || config.cron || '17 13 * * 1,3,5',
        timezone: config.schedule?.timezone || 'UTC',
        source: config.schedule?.source || 'live-parity-proof'
      } : null,
      routes,
      limits: {
        timeout_ms: 10000,
        memory_mb: 128,
        max_body_bytes: 16,
        egress: 'deny-by-default',
        env_grants: Array.isArray(config.env_grants) ? config.env_grants : []
      }
    });
  }
  const manifest = {
    schema: 'skyenet.functions.bundle.v1',
    bundle_id: `skybun_${projectId}_${deploymentId}`,
    generated_at: new Date().toISOString(),
    tenant_id: workspaceId,
    function_count: functions.length,
    background_function_count: functions.filter((fn) => fn.invocation_mode === 'background').length,
    scheduled_function_count: functions.filter((fn) => fn.invocation_mode === 'scheduled').length,
    schedules: functions
      .filter((fn) => fn.schedule?.cron)
      .map((fn) => ({
        function_name: fn.name,
        cron: fn.schedule.cron,
        timezone: fn.schedule.timezone || 'UTC',
        route: `/.skyenet/scheduled/${fn.name}`
      })),
    functions,
    runtime_contract: {
      entry: 'handler(event, context)',
      isolation: 'cloudflare-dynamic-worker-v1',
      invocation_modes: ['request', 'background', 'scheduled'],
      egress_policy: 'globalOutbound:null',
      env_policy: 'deny-by-default'
    }
  };
  if (signingKey) manifest.signature = signFunctionManifest(manifest, signingKey);
  return manifest;
}

async function fetchText(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const response = await fetch(url, { redirect: 'manual', ...init, signal: init.signal || controller.signal });
    const text = await response.text().catch(() => '');
    return {
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      headers: {
        x_skynet_route: response.headers.get('x-skynet-route') || '',
        x_skynet_rewrite_target: response.headers.get('x-skynet-rewrite-target') || '',
        x_skyenet_rule_proof: response.headers.get('x-skyenet-rule-proof') || '',
        x_skyenet_landing_proof: response.headers.get('x-skyenet-landing-proof') || '',
        x_toml_header: response.headers.get('x-toml-header') || '',
        x_skynet_form_name: response.headers.get('x-skynet-form-name') || '',
        x_skynet_form_receipt: response.headers.get('x-skynet-form-receipt') || '',
        x_skynet_form_notification: response.headers.get('x-skynet-form-notification') || '',
        x_skynet_form_spam: response.headers.get('x-skynet-form-spam') || '',
        x_skynet_form_file_count: response.headers.get('x-skynet-form-file-count') || '',
        x_skynet_form_file: response.headers.get('x-skynet-form-file') || '',
        x_skynet_function_name: response.headers.get('x-skynet-function-name') || '',
        x_skynet_function_receipt: response.headers.get('x-skynet-function-receipt') || '',
        x_skynet_function_env_grants: response.headers.get('x-skynet-function-env-grants') || '',
        x_skynet_scheduled_function: response.headers.get('x-skynet-scheduled-function') || '',
        x_skynet_background_job: response.headers.get('x-skynet-background-job') || '',
        x_skynet_background_completion_receipt: response.headers.get('x-skynet-background-completion-receipt') || '',
        x_0s_runtime_archive: response.headers.get('x-0s-runtime-archive') || '',
        x_0s_request_id: response.headers.get('x-0s-request-id') || '',
        etag: response.headers.get('etag') || '',
        last_modified: response.headers.get('last-modified') || '',
        accept_ranges: response.headers.get('accept-ranges') || '',
        content_range: response.headers.get('content-range') || ''
      },
      text
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      location: '',
      headers: {},
      text: '',
      error: error?.name === 'AbortError' ? `timeout after ${fetchTimeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, init);
  let body = {};
  try { body = result.text ? JSON.parse(result.text) : {}; } catch { body = { text: result.text }; }
  return { ...result, body };
}

function apiBody(result) {
  return result?.body?.skynet || result?.body || {};
}

async function pollRuntimeTelemetry({ token, liveUrl }) {
  const telemetryUrl = `${skynetBase}/api/skyenet/observability?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&limit=100`;
  const attempts = [];
  for (let index = 0; index < 8; index += 1) {
    if (index > 0) await sleep(3500);
    const triggered = liveUrl
      ? await fetchText(`${liveUrl}${liveUrl.includes('?') ? '&' : '?'}runtime-proof=${Date.now()}-${index}`)
      : { status: 0, headers: {}, elapsed_ms: 0 };
    const observed = await fetchJson(telemetryUrl, { headers: authHeaders(token), redirect: 'manual' });
    const body = observed.body?.sinks ? observed.body : observed.body?.skynet || {};
    const logObjects = Array.isArray(body.latest_log_objects) ? body.latest_log_objects : [];
    const rollupRows = Array.isArray(body.d1_rollups?.rows) ? body.d1_rollups.rows : [];
    const attempt = {
      attempt: index + 1,
      status: observed.status,
      elapsed_ms: observed.elapsed_ms,
      trigger_status: triggered.status,
      trigger_elapsed_ms: triggered.elapsed_ms,
      trigger_request_id: triggered.headers.x_0s_request_id || '',
      trigger_archive: triggered.headers.x_0s_runtime_archive || '',
      r2_archive_header_ok: /sync-r2:1/.test(triggered.headers.x_0s_runtime_archive || ''),
      sinks: body.sinks || {},
      latest_log_count: logObjects.length,
      project_log_count: logObjects.filter((item) => String(item.key || '').includes(`/project=${projectId}/`)).length,
      d1_configured: body.d1_rollups?.configured === true,
      d1_query_ok: body.d1_rollups?.query_ok === true,
      d1_rollup_rows: rollupRows.length
    };
    attempts.push(attempt);
    if (attempt.r2_archive_header_ok && attempt.d1_configured && attempt.d1_query_ok && attempt.d1_rollup_rows > 0) {
      return {
        ok: true,
        url: telemetryUrl,
        attempts,
        final: attempt
      };
    }
  }
  const final = attempts.at(-1) || {};
  return {
    ok: false,
    url: telemetryUrl,
    attempts,
    final
  };
}

function hasAll(text, needles) {
  return needles.every((needle) => String(text || '').includes(needle));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scrub(text, token) {
  const value = String(text || '');
  return token ? value.split(token).join('[redacted-token]') : value;
}

async function writeFixture() {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(publicDir, 'assets'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'netlify', 'functions'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'vendor', 'skyenet-proof-dep'), { recursive: true });
  await fs.writeFile(path.join(publicDir, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SkyeNet parity proof</title>
    <link rel="stylesheet" href="assets/app.css">
  </head>
  <body>
    <main>
      <p>SkyeNet parity proof</p>
      <h1>Public bundle is live on SkyeNet</h1>
      <p>The full project source stays private until an account-scoped download or transfer is approved.</p>
      <script src="assets/app.js" type="module"></script>
    </main>
  </body>
</html>
`);
  await fs.writeFile(path.join(publicDir, 'assets', 'app.css'), `body{font-family:system-ui,sans-serif;margin:0;background:#101820;color:#f6f1e8}main{max-width:760px;margin:0 auto;padding:72px 24px}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.02}p{font-size:1.05rem;color:#d8e1df}`);
  await fs.writeFile(path.join(publicDir, 'assets', 'app.js'), `document.documentElement.dataset.skynetParityProof = "public-bundle";\n`);
  await fs.writeFile(path.join(publicDir, 'assets', 'data.txt'), '0123456789abcdef');
  await fs.writeFile(path.join(publicDir, 'landing.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SkyeNet landing target</title></head>
  <body><main><h1>Landing Target</h1><p>Netlify-style header rules reached this public asset.</p></main></body>
</html>
`);
  await fs.writeFile(path.join(publicDir, 'toml.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SkyeNet toml target</title></head>
  <body><main><h1>Toml Target</h1><p>netlify.toml redirect and header rules reached this public asset.</p></main></body>
</html>
`);
  await fs.writeFile(path.join(publicDir, 'contact.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SkyeNet form target</title></head>
  <body><main><form name="contact" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" enctype="multipart/form-data"><input type="hidden" name="form-name" value="contact"><p hidden><label>Do not fill <input name="bot-field"></label></p><input name="name"><textarea name="message"></textarea><input type="file" name="attachment"><button>Send</button></form></main></body>
</html>
`);
  await fs.writeFile(path.join(publicDir, '_redirects'), `/old /landing.html 301
/app/* /index.html 200
/landing.html /index.html 200
`);
  await fs.writeFile(path.join(publicDir, '_headers'), `/*
  X-SkyeNet-Rule-Proof: rules-applied
/landing.html
  X-SkyeNet-Landing-Proof: landing-header
`);
  await fs.writeFile(path.join(publicDir, 'netlify.toml'), `[[redirects]]
from = "/toml-old"
to = "/toml.html"
status = 302

[[headers]]
for = "/toml.html"
[headers.values]
X-Toml-Header = "yes"
`);
  await fs.writeFile(path.join(fixtureRoot, 'package.json'), `${JSON.stringify({
    name: 'skynet-parity-proof',
    private: true,
    scripts: {
      build: 'echo build handled before upload',
      'skyenet:deploy': 'npm run build && npm run skyenet:deploy -- --dir dist --source-root .'
    },
    dependencies: {
      'skyenet-proof-dep': 'file:./vendor/skyenet-proof-dep'
    }
  }, null, 2)}\n`);
  await fs.writeFile(path.join(fixtureRoot, 'vendor', 'skyenet-proof-dep', 'package.json'), `${JSON.stringify({
    name: 'skyenet-proof-dep',
    version: '1.0.0',
    type: 'module',
    main: 'index.mjs'
  }, null, 2)}\n`);
  await fs.writeFile(path.join(fixtureRoot, 'vendor', 'skyenet-proof-dep', 'index.mjs'), `export const proofDependency = "cli-installed-file-dependency-live";\n`);
  await fs.writeFile(path.join(fixtureRoot, 'src', 'main.js'), `export const sourceCustody = "private-full-project-package";\n`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'hello.mjs'), `export async function handler(event, context) {
  const secretLeak = typeof process !== "undefined" && process.env
    ? (process.env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || process.env.ZERO_OS_GATE_CODE || process.env.OWNER_ADMIN_SESSION_SECRET || "")
    : "";
  return {
    statusCode: 201,
    headers: { "content-type": "application/json; charset=utf-8", "x-proof-function": "hello" },
    body: JSON.stringify({
      ok: true,
      method: event.httpMethod,
      body: event.body,
      query: event.queryStringParameters,
      runtime: context.runtime,
      secret_leak: secretLeak
    })
  };
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'egress.mjs'), `export async function handler() {
  await fetch("https://example.com/");
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: false, egress: "unexpected-open" })
  };
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'job-background.mjs'), `export const background = true;

export async function handler(event, context) {
  return {
    statusCode: 202,
    headers: { "content-type": "application/json; charset=utf-8", "x-proof-function": "job-background" },
    body: JSON.stringify({ ok: true, trigger: context.triggerKind, job: context.backgroundJobId || "", body: event.body })
  };
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'tick.mjs'), `export const config = { schedule: "17 13 * * 1,3,5" };

export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8", "x-proof-function": "tick" },
    body: JSON.stringify({ ok: true, trigger: context.triggerKind, scheduled: true, body: event.body })
  };
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'secret-check.mjs'), `const topLevelAllowed = process.env.ALLOWED_SECRET || "";
const topLevelForbidden = process.env.FORBIDDEN_SECRET || "";
const platformSecretLeak = process.env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || process.env.ZERO_OS_GATE_CODE || process.env.OWNER_ADMIN_SESSION_SECRET || "";

export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8", "x-proof-function": "secret-check" },
    body: JSON.stringify({
      ok: true,
      allowed_secret: process.env.ALLOWED_SECRET || "",
      forbidden_secret: process.env.FORBIDDEN_SECRET || "",
      top_level_allowed: topLevelAllowed,
      top_level_forbidden: topLevelForbidden,
      platform_secret_leak: platformSecretLeak,
      context_allowed_secret: context.env?.ALLOWED_SECRET || ""
    })
  };
}
`);
  await fs.mkdir(path.join(fixtureRoot, 'netlify', 'lib'), { recursive: true });
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'lib', 'parity-message.mjs'), `export function parityMessage() {
  return "cli-bundled-helper-live";
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'with-helper.mjs'), `import { proofDependency } from "skyenet-proof-dep";
import { parityMessage } from "../lib/parity-message.mjs";

export async function handler() {
  return {
    statusCode: 202,
    headers: { "content-type": "application/json; charset=utf-8", "x-proof-function": "with-helper" },
    body: JSON.stringify({ ok: true, helper: parityMessage(), dependency: proofDependency })
  };
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'README.md'), `# SkyeNet parity proof

This file proves private full-project source custody through SkyeNet source downloads.
`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      shell: false
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      resolve({
        code,
        stdout: scrub(stdout, options.token),
        stderr: scrub(stderr, options.token),
        elapsed_ms: Number((performance.now() - started).toFixed(2))
      });
    });
  });
}

function parseLastJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const start = trimmed.lastIndexOf('\n{');
  const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try { return JSON.parse(jsonText); } catch { return null; }
}

async function proveUploadedFunctions({ token, deploymentId, liveUrl }) {
  const signing = await readFunctionSigningKey();
  const proof = {
    ok: false,
    signing_key_source: signing.source,
    signing_key_present: Boolean(signing.key),
    activation_signing_mode: signing.key ? 'client-signed-or-server-signed' : 'server-signed-customer-upload',
    upload: [],
    unsigned_reject: null,
    mismatch_reject: null,
    activate: null,
    status: null,
    invoke_hello: null,
    invoke_background: null,
    invoke_env_grants: null,
    invoke_body_cap: null,
    invoke_egress: null,
    failures: []
  };

  const helloSource = await fs.readFile(path.join(fixtureRoot, 'netlify', 'functions', 'hello.mjs'), 'utf8');
  const egressSource = await fs.readFile(path.join(fixtureRoot, 'netlify', 'functions', 'egress.mjs'), 'utf8');
  const backgroundSource = await fs.readFile(path.join(fixtureRoot, 'netlify', 'functions', 'job-background.mjs'), 'utf8');
  const tickSource = await fs.readFile(path.join(fixtureRoot, 'netlify', 'functions', 'tick.mjs'), 'utf8');
  const secretCheckSource = await fs.readFile(path.join(fixtureRoot, 'netlify', 'functions', 'secret-check.mjs'), 'utf8');
  const sources = { hello: helloSource, egress: egressSource, 'job-background': backgroundSource, tick: tickSource, 'secret-check': secretCheckSource };
  const functionConfig = {
    'job-background': { invocation_mode: 'background', background: true },
    tick: { invocation_mode: 'scheduled', schedule: { cron: '17 13 * * 1,3,5', timezone: 'UTC', source: 'live-parity-proof' } },
    'secret-check': { env_grants: ['ALLOWED_SECRET'] }
  };
  const allowedEnv = await fetchJson(`${skynetBase}/api/skyenet/env`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      workspace_id: workspaceId,
      project_id: projectId,
      key: 'ALLOWED_SECRET',
      value: 'visible-to-granted-function',
      scope: 'production',
      secret: true
    })
  });
  const forbiddenEnv = await fetchJson(`${skynetBase}/api/skyenet/env`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      workspace_id: workspaceId,
      project_id: projectId,
      key: 'FORBIDDEN_SECRET',
      value: 'must-not-leak',
      scope: 'production',
      secret: true
    })
  });
  proof.env_setup = {
    allowed_status: allowedEnv.status,
    forbidden_status: forbiddenEnv.status,
    ok: allowedEnv.status === 200 && forbiddenEnv.status === 200
  };
  for (const [name, source] of Object.entries(sources)) {
    const upload = await fetchJson(`${skynetBase}/api/skyenet/functions-upload?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&plan_name=${encodeURIComponent(planName)}&path=${encodeURIComponent(`functions/${name}.mjs`)}`, {
      method: 'PUT',
      headers: { ...authHeaders(token), 'content-type': 'text/javascript; charset=utf-8' },
      body: source
    });
    proof.upload.push({
      name,
      status: upload.status,
      ok: upload.status === 200 && upload.body?.ok !== false,
      sha256: upload.body?.sha256 || upload.body?.skynet?.sha256 || '',
      elapsed_ms: upload.elapsed_ms
    });
  }

  const unsignedManifest = await functionManifestForSources(sources, '', deploymentId, functionConfig);
  await fetchJson(`${skynetBase}/api/skyenet/functions-upload?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&path=manifest.json`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(unsignedManifest)
  });
  const unsignedComplete = await fetchJson(`${skynetBase}/api/skyenet/functions-complete`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, plan_name: planName })
  });
  proof.unsigned_reject = {
    status: unsignedComplete.status,
    ok: unsignedComplete.status === 403 && (unsignedComplete.body?.code || unsignedComplete.body?.skynet?.code) === 'FUNCTION_BUNDLE_UNSIGNED',
    code: unsignedComplete.body?.code || unsignedComplete.body?.skynet?.code || ''
  };

  const mismatchedSources = { ...sources, hello: `${helloSource}\n// mismatch proof\n` };
  const mismatchedManifest = await functionManifestForSources(mismatchedSources, '', deploymentId, functionConfig);
  await fetchJson(`${skynetBase}/api/skyenet/functions-upload?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&path=manifest.json`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(mismatchedManifest)
  });
  const mismatchComplete = await fetchJson(`${skynetBase}/api/skyenet/functions-complete`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, plan_name: planName, server_sign_manifest: true, customer_upload: true })
  });
  proof.mismatch_reject = {
    status: mismatchComplete.status,
    ok: mismatchComplete.status === 409 && (mismatchComplete.body?.code || mismatchComplete.body?.skynet?.code) === 'FUNCTION_BUNDLE_STORAGE_MISMATCH',
    code: mismatchComplete.body?.code || mismatchComplete.body?.skynet?.code || ''
  };

  const goodManifest = await functionManifestForSources(sources, signing.key || '', deploymentId, functionConfig);
  await fetchJson(`${skynetBase}/api/skyenet/functions-upload?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&path=manifest.json`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(goodManifest)
  });
  const activate = await fetchJson(`${skynetBase}/api/skyenet/functions-complete`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, plan_name: planName, server_sign_manifest: !signing.key, customer_upload: !signing.key })
  });
  const activated = activate.body?.function_bundle || activate.body?.skynet?.function_bundle || {};
  proof.activate = {
    status: activate.status,
    ok: activate.status === 200
      && activated.status === 'active'
      && activated.signed === true
      && activated.storage_verified === true
      && activated.background_function_count === 1
      && activated.scheduled_function_count === 1
      && activated.schedule_index?.indexed_count === 1
      && (signing.key || activated.signature?.server_signed === true),
    function_count: activated.function_count || 0,
    background_function_count: activated.background_function_count || 0,
    scheduled_function_count: activated.scheduled_function_count || 0,
    schedule_indexed_count: activated.schedule_index?.indexed_count || 0,
    runtime: activated.runtime_policy?.isolation || '',
    global_outbound: activated.runtime_policy?.global_outbound ?? null,
    server_signed: activated.signature?.server_signed === true
  };

  const status = await fetchJson(`${skynetBase}/api/skyenet/functions-status?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`, {
    headers: authHeaders(token)
  });
  const statusBundle = status.body?.function_bundle || status.body?.skynet?.function_bundle || {};
  proof.status = {
    status: status.status,
    ok: status.status === 200
      && statusBundle.status === 'active'
      && Array.isArray(statusBundle.functions)
      && statusBundle.functions.length === 5
      && statusBundle.background_function_count === 1
      && statusBundle.scheduled_function_count === 1
      && statusBundle.schedule_index?.indexed_count === 1,
    function_count: statusBundle.function_count || 0,
    background_function_count: statusBundle.background_function_count || 0,
    scheduled_function_count: statusBundle.scheduled_function_count || 0,
    schedule_indexed_count: statusBundle.schedule_index?.indexed_count || 0,
    schedule_route: statusBundle.schedules?.[0]?.route || ''
  };

  const hello = await fetchJson(new URL('.netlify/functions/hello?plan=managed&plan=owner', liveUrl).toString(), {
    method: 'POST',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'payload-live'
  });
  proof.invoke_hello = {
    status: hello.status,
    ok: hello.status === 201
      && hello.body?.ok === true
      && hello.body?.method === 'POST'
      && hello.body?.body === 'payload-live'
      && hello.body?.secret_leak === ''
      && hello.headers.x_skynet_route === 'skynet-function'
      && hello.headers.x_skynet_function_name === 'hello'
      && Boolean(hello.headers.x_skynet_function_receipt),
    route: hello.headers.x_skynet_route,
    function_name: hello.headers.x_skynet_function_name,
    receipt_present: Boolean(hello.headers.x_skynet_function_receipt),
    secret_leak_present: Boolean(hello.body?.secret_leak)
  };

  const background = await fetchJson(new URL('.netlify/functions/job-background', liveUrl).toString(), {
    method: 'POST',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'bg'
  });
  proof.invoke_background = {
    status: background.status,
    ok: background.status === 202
      && background.body?.accepted === true
      && background.body?.mode === 'background'
      && Boolean(background.body?.job_id)
      && background.body?.completion_receipt_required === true
      && background.headers.x_skynet_route === 'skynet-function'
      && background.headers.x_skynet_function_name === 'job-background'
      && Boolean(background.headers.x_skynet_background_job || background.body?.job_id)
      && background.headers.x_skynet_background_completion_receipt === 'required'
      && Boolean(background.headers.x_skynet_function_receipt),
    route: background.headers.x_skynet_route,
    function_name: background.headers.x_skynet_function_name,
    job_id: background.body?.job_id || '',
    receipt_present: Boolean(background.headers.x_skynet_function_receipt),
    completion_receipt_required: background.body?.completion_receipt_required === true,
    completion_receipt_header: background.headers.x_skynet_background_completion_receipt || ''
  };

  const secretCheck = await fetchJson(new URL('.netlify/functions/secret-check', liveUrl).toString());
  proof.invoke_env_grants = {
    status: secretCheck.status,
    ok: secretCheck.status === 200
      && secretCheck.body?.ok === true
      && secretCheck.body?.allowed_secret === 'visible-to-granted-function'
      && secretCheck.body?.top_level_allowed === 'visible-to-granted-function'
      && secretCheck.body?.context_allowed_secret === 'visible-to-granted-function'
      && secretCheck.body?.forbidden_secret === ''
      && secretCheck.body?.top_level_forbidden === ''
      && secretCheck.body?.platform_secret_leak === ''
      && secretCheck.headers.x_skynet_route === 'skynet-function'
      && secretCheck.headers.x_skynet_function_name === 'secret-check'
      && secretCheck.headers.x_skynet_function_env_grants === '1'
      && Boolean(secretCheck.headers.x_skynet_function_receipt),
    route: secretCheck.headers.x_skynet_route,
    function_name: secretCheck.headers.x_skynet_function_name,
    granted_count_header: secretCheck.headers.x_skynet_function_env_grants || '',
    receipt_present: Boolean(secretCheck.headers.x_skynet_function_receipt),
    allowed_secret_present: secretCheck.body?.allowed_secret === 'visible-to-granted-function',
    forbidden_secret_leaked: Boolean(secretCheck.body?.forbidden_secret || secretCheck.body?.top_level_forbidden || secretCheck.body?.platform_secret_leak)
  };

  const scheduled = await fetchJson(new URL('.skyenet/scheduled/tick', liveUrl).toString(), {
    method: 'POST',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'scheduled'
  });
  proof.invoke_scheduled = {
    status: scheduled.status,
    ok: scheduled.status === 200
      && scheduled.body?.ok === true
      && scheduled.body?.trigger === 'scheduled'
      && scheduled.body?.scheduled === true
      && scheduled.headers.x_skynet_route === 'skynet-function'
      && scheduled.headers.x_skynet_function_name === 'tick'
      && scheduled.headers.x_skynet_scheduled_function === 'tick'
      && Boolean(scheduled.headers.x_skynet_function_receipt),
    route: scheduled.headers.x_skynet_route,
    function_name: scheduled.headers.x_skynet_function_name,
    scheduled_function: scheduled.headers.x_skynet_scheduled_function,
    receipt_present: Boolean(scheduled.headers.x_skynet_function_receipt)
  };

  const tooLarge = await fetchJson(new URL('.netlify/functions/hello', liveUrl).toString(), {
    method: 'POST',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    body: 'x'.repeat(2048)
  });
  proof.invoke_body_cap = {
    status: tooLarge.status,
    ok: tooLarge.status === 413,
    code: tooLarge.body?.code || ''
  };

  const egress = await fetchJson(new URL('.netlify/functions/egress', liveUrl).toString());
  proof.invoke_egress = {
    status: egress.status,
    ok: egress.status === 500 && /failed|fetch|outbound|network/i.test(JSON.stringify(egress.body || {})),
    code: egress.body?.code || ''
  };

  if (!proof.env_setup.ok) proof.failures.push('Function env variables could not be stored for grant proof.');
  if (!proof.upload.every((item) => item.ok)) proof.failures.push('Function source upload failed.');
  if (!proof.unsigned_reject.ok) proof.failures.push('Unsigned function manifest was not rejected.');
  if (!proof.mismatch_reject.ok) proof.failures.push('Signed mismatched function manifest was not rejected.');
  if (!proof.activate.ok) proof.failures.push('Signed function bundle did not activate.');
  if (!proof.status.ok) proof.failures.push('Functions status did not show the active bundle.');
  if (!proof.invoke_hello.ok) proof.failures.push('Uploaded hello function invocation failed.');
  if (!proof.invoke_background.ok) proof.failures.push('Uploaded background function did not accept and receipt a background job.');
  if (!proof.invoke_env_grants.ok) proof.failures.push('Per-function env grants did not expose only the explicitly granted variable.');
  if (!proof.invoke_scheduled.ok) proof.failures.push('Uploaded scheduled function did not invoke through the scheduled route.');
  if (!proof.invoke_body_cap.ok) proof.failures.push('Function body cap did not reject oversized request.');
  if (!proof.invoke_egress.ok) proof.failures.push('Function egress was not denied.');
  proof.ok = proof.failures.length === 0;
  return proof;
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  const token = auth.token || '';
  const receipt = {
    schema: 'skyenet.netlify-parity.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    base: { zero_os: zeroOsBase, skynet: skynetBase },
    target: { workspace_id: workspaceId, project_id: projectId, plan_name: planName, host, mount },
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    fixture: null,
    unauth_env: null,
    login: null,
    public_static: null,
    console: null,
    publish_guide: null,
    console_function_ops: null,
    status: null,
    support: null,
    observability: null,
    receipts: null,
    cost_model: null,
    customer_export: null,
    env_write: null,
    env_list: null,
    deploy: null,
    public_assets: null,
    cli_functions: null,
    functions: null,
    source_download: null,
    archive_backed_source_file: null,
    zstd_backed_source_file: null,
    zip_backed_source_file: null,
    public_source_exposure: null,
    runtime_telemetry: null,
    links: {
      skynet_home: `${skynetBase}/`,
      skynet_console: `${skynetBase}/console`,
      skynet_publish: `${skynetBase}/publish/`,
      live_app: `${skynetBase}${mount}/`
    },
    failures: []
  };

  await writeFixture();
  receipt.fixture = {
    root: path.relative(repoRoot, fixtureRoot),
	    public_dir: path.relative(repoRoot, publicDir),
	    private_source_files_expected: ['package.json', 'src/main.js', 'netlify/functions/hello.mjs', 'netlify/functions/egress.mjs', 'netlify/functions/job-background.mjs', 'netlify/functions/tick.mjs', 'netlify/functions/secret-check.mjs', 'netlify/functions/with-helper.mjs', 'netlify/lib/parity-message.mjs', 'vendor/skyenet-proof-dep/index.mjs', 'README.md'],
	    public_files_expected: ['index.html', 'landing.html', 'toml.html', 'contact.html', 'assets/app.css', 'assets/app.js', 'assets/data.txt', '_redirects', '_headers', 'netlify.toml']
	  };

  const unauthEnv = await fetchJson(`${skynetBase}/api/skyenet/env?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}`);
  receipt.unauth_env = {
    status: unauthEnv.status,
    ok: unauthEnv.status === 401 || unauthEnv.status === 403,
    code: unauthEnv.body?.code || '',
    elapsed_ms: unauthEnv.elapsed_ms
  };
  if (!receipt.unauth_env.ok) receipt.failures.push('Unauthenticated env registry request was not rejected.');

  receipt.login = {
    status: Number(auth.response?.status || 0) || 0,
    ok: Boolean(auth.ok && token),
    token_received: Boolean(token),
    via: auth.response?.via || auth.credential?.source || ''
  };

  if (!token) {
    receipt.failures.push(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');
  } else {
      const consoleCheck = await fetchText(`${skynetBase}/console`);
      receipt.console = {
        status: consoleCheck.status,
        ok: consoleCheck.status === 200 && hasAll(consoleCheck.text, ['Publish package', 'public_files', 'source_files', 'Environment variables', 'Source custody', 'private full project source package']),
        elapsed_ms: consoleCheck.elapsed_ms,
        content_type: consoleCheck.content_type
      };
      const publishCheck = await fetchText(`${skynetBase}/publish/`);
      receipt.publish_guide = {
        status: publishCheck.status,
        ok: publishCheck.status === 200 && hasAll(publishCheck.text, ['--source-root', 'private full project source package', 'Environment variables']),
        elapsed_ms: publishCheck.elapsed_ms,
        content_type: publishCheck.content_type
      };
      const consoleHtml = consoleCheck;
      const consoleAsset = await fetchText(`${skynetBase}/assets/skyenet.js`);
      receipt.console_function_ops = {
        console_status: consoleHtml.status,
        asset_status: consoleAsset.status,
        ok: consoleHtml.status === 200
          && consoleAsset.status === 200
          && hasAll(consoleHtml.text, ['Functions and env grants', 'rollbackStatus', 'Rollback route'])
          && hasAll(consoleAsset.text, ['Function grants', 'env_grants', 'rollbackDeployment', '/api/skyenet/rollback']),
        elapsed_ms: Number((Number(consoleHtml.elapsed_ms || 0) + Number(consoleAsset.elapsed_ms || 0)).toFixed(2))
      };

      const query = new URLSearchParams({ workspace_id: workspaceId, project_id: projectId });
      const status = await fetchJson(`${skynetBase}/api/skyenet/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
        headers: authHeaders(token)
      });
      receipt.status = {
        status: status.status,
        ok: Boolean(status.ok && (status.body?.ok !== false)),
        service: status.body?.service || status.body?.skynet?.service || '',
        capabilities: status.body?.capabilities || status.body?.skynet?.capabilities || {},
        elapsed_ms: status.elapsed_ms
      };

      const support = await fetchJson(`${skynetBase}/api/skyenet/support`, {
        headers: authHeaders(token)
      });
      const supportProfile = support.body?.support || support.body?.skynet?.support || {};
      receipt.support = {
        status: support.status,
        ok: Boolean(support.ok && supportProfile.operations?.email === 'SkyesOverLondonLC@solenterprises.org' && supportProfile.source === 'https://skyenet.skyesol/leadership/SkyesOverLondon.html'),
        source: supportProfile.source || '',
        operations_email: supportProfile.operations?.email || '',
        founder_email: supportProfile.founder?.email || '',
        general_email: supportProfile.general?.email || '',
        b2b_email: supportProfile.b2b?.email || '',
        elapsed_ms: support.elapsed_ms
      };

      const observability = await fetchJson(`${skynetBase}/api/skyenet/observability?limit=10`, {
        headers: authHeaders(token)
      });
      const observabilityBody = observability.body?.sinks ? observability.body : observability.body?.skynet || {};
      receipt.observability = {
        status: observability.status,
        ok: Boolean(observability.ok && observabilityBody.ok !== false),
        sinks: observabilityBody.sinks || {},
        latest_log_count: Array.isArray(observabilityBody.latest_log_objects) ? observabilityBody.latest_log_objects.length : 0,
        runtime_event_schema: observabilityBody.runtime_event_schema || '',
        elapsed_ms: observability.elapsed_ms
      };

      const receipts = await fetchJson(`${skynetBase}/api/skyenet/receipts?workspace_id=${encodeURIComponent(workspaceId)}&limit=25`, {
        headers: authHeaders(token)
      });
      const receiptBody = receipts.body?.receipts ? receipts.body : receipts.body?.skynet || {};
      receipt.receipts = {
        status: receipts.status,
        ok: Boolean(receipts.ok && receiptBody.ok !== false && Array.isArray(receiptBody.receipts)),
        count: Array.isArray(receiptBody.receipts) ? receiptBody.receipts.length : 0,
        elapsed_ms: receipts.elapsed_ms
      };

      const costModel = await fetchJson(`${skynetBase}/api/skyenet/cost-model`, {
        headers: authHeaders(token)
      });
      const costBody = costModel.body?.cost_model ? costModel.body : costModel.body?.skynet || {};
      receipt.cost_model = {
        status: costModel.status,
        ok: Boolean(costModel.ok && costBody.cost_model?.currency === 'usd'),
        currency: costBody.cost_model?.currency || '',
        plans: Object.keys(costBody.cost_model?.plans || {}).length,
        elapsed_ms: costModel.elapsed_ms
      };

      const customerExport = await fetchJson(`${skynetBase}/api/skyenet/export?workspace_id=${encodeURIComponent(workspaceId)}&limit=25`, {
        headers: authHeaders(token)
      });
      const exportBody = customerExport.body?.schema === 'fs27.skynet.customer_export.v1' ? customerExport.body : customerExport.body?.skynet || {};
      const exportText = JSON.stringify(exportBody || {});
      receipt.customer_export = {
        status: customerExport.status,
        ok: Boolean(customerExport.ok && exportBody.schema === 'fs27.skynet.customer_export.v1' && exportBody.redaction_policy?.raw_bearer_tokens_included === false && exportBody.support?.operations?.email === 'SkyesOverLondonLC@solenterprises.org'),
        schema: exportBody.schema || '',
        deployments: Array.isArray(exportBody.deployments) ? exportBody.deployments.length : 0,
        routes: Array.isArray(exportBody.routes) ? exportBody.routes.length : 0,
        receipts: Array.isArray(exportBody.receipts) ? exportBody.receipts.length : 0,
        includes_raw_token: token ? exportText.includes(token) : false,
        includes_raw_env_secret: exportText.includes(secretProofValue),
        elapsed_ms: customerExport.elapsed_ms
      };

      const envWrite = await fetchJson(`${skynetBase}/api/skyenet/env`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          key: 'SKYENET_PARITY_SECRET',
          value: secretProofValue,
          scope: 'production'
        })
      });
      receipt.env_write = {
        status: envWrite.status,
        ok: Boolean(envWrite.ok && envWrite.body?.ok !== false),
        key: envWrite.body?.env?.key || '',
        redacted: envWrite.body?.env?.value || '',
        has_raw_secret: JSON.stringify(envWrite.body).includes(secretProofValue),
        elapsed_ms: envWrite.elapsed_ms
      };

      const envList = await fetchJson(`${skynetBase}/api/skyenet/env?${query.toString()}`, {
        headers: authHeaders(token)
      });
      const envBody = JSON.stringify(envList.body || {});
      const envItems = envList.body?.env || envList.body?.skynet?.env || [];
      receipt.env_list = {
        status: envList.status,
        ok: Boolean(envList.ok && envList.body?.ok !== false),
        count: Array.isArray(envItems) ? envItems.length : 0,
        has_key: Array.isArray(envItems) && envItems.some((item) => item?.key === 'SKYENET_PARITY_SECRET'),
        raw_secret_exposed: envBody.includes(secretProofValue),
        elapsed_ms: envList.elapsed_ms
      };

      const deploy = await runCommand('npm', [
        'run',
        'skyenet:deploy',
        '--',
        '--dir', publicDir,
        '--source-root', fixtureRoot,
        '--project', projectId,
        '--workspace', workspaceId,
        '--plan', planName,
        '--host', host,
        '--mount', mount,
        '--public',
        '--concurrency', '4'
      ], {
        env: { ...process.env, SKYENET_AUTH: token },
        token
      });
      const deployJson = parseLastJson(deploy.stdout);
      receipt.deploy = {
        code: deploy.code,
        ok: deploy.code === 0 && deployJson?.ok === true && deployJson?.private_source_package?.uploaded === true && deployJson?.functions?.uploaded === true,
        elapsed_ms: deploy.elapsed_ms,
        stdout_json: deployJson,
        stderr_sample: deploy.stderr.slice(-1200)
      };

      const deploymentId = deployJson?.deployment_id || '';
      const liveUrl = deployJson?.live_url || `${skynetBase}${mount}/`;
      receipt.links.live_app = liveUrl;
      receipt.links.source_download = deploymentId
        ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`
        : '';

      const publicStatic = await fetchText(liveUrl);
      receipt.public_static = {
        url: liveUrl,
        status: publicStatic.status,
        ok: publicStatic.status === 200 && hasAll(publicStatic.text, ['SkyeNet parity proof', 'Public bundle is live on SkyeNet']),
        content_type: publicStatic.content_type,
        elapsed_ms: publicStatic.elapsed_ms
      };

      if (deploymentId) {
        const cliStatus = await fetchJson(`${skynetBase}/api/skyenet/functions-status?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`, {
          headers: authHeaders(token)
        });
        const cliBundle = cliStatus.body?.function_bundle || cliStatus.body?.skynet?.function_bundle || {};
        const helper = await fetchJson(new URL('.netlify/functions/with-helper', liveUrl).toString());
        receipt.cli_functions = {
          deploy_uploaded: deployJson?.functions?.uploaded === true,
          deploy_function_count: deployJson?.functions?.function_count || 0,
          status: {
            status: cliStatus.status,
    ok: cliStatus.status === 200 && cliBundle.status === 'active' && Array.isArray(cliBundle.functions) && cliBundle.functions.some((fn) => fn.name === 'with-helper'),
            function_count: cliBundle.function_count || 0,
            server_signed: cliBundle.signature?.server_signed === true || deployJson?.functions?.server_signed === true,
            runtime: cliBundle.runtime_policy?.isolation || ''
          },
          invoke_helper: {
            status: helper.status,
            ok: helper.status === 202
              && helper.body?.ok === true
              && helper.body?.helper === 'cli-bundled-helper-live'
              && helper.body?.dependency === 'cli-installed-file-dependency-live'
              && helper.headers.x_skynet_route === 'skynet-function'
              && helper.headers.x_skynet_function_name === 'with-helper'
              && Boolean(helper.headers.x_skynet_function_receipt),
            route: helper.headers.x_skynet_route,
            function_name: helper.headers.x_skynet_function_name,
            receipt_present: Boolean(helper.headers.x_skynet_function_receipt)
          },
          ok: false
        };
        receipt.cli_functions.ok = receipt.cli_functions.deploy_uploaded
          && receipt.cli_functions.status.ok
          && receipt.cli_functions.status.server_signed
          && receipt.cli_functions.invoke_helper.ok;
        receipt.functions = await proveUploadedFunctions({ token, deploymentId, liveUrl });
      }

      const expectedLandingUrl = new URL('landing.html', liveUrl).toString();
	      const redirectRule = await fetchText(new URL('old', liveUrl).toString());
	      const landingRule = await fetchText(expectedLandingUrl);
	      const rewriteRule = await fetchText(new URL('app/deep/link', liveUrl).toString());
	      const privateRuleFile = await fetchText(new URL('_redirects', liveUrl).toString());
	      const tomlRedirectRule = await fetchText(new URL('toml-old', liveUrl).toString());
	      const tomlRule = await fetchText(new URL('toml.html', liveUrl).toString());
	      const privateTomlFile = await fetchText(new URL('netlify.toml', liveUrl).toString());
	      receipt.netlify_rules = {
	        redirects_file: true,
	        headers_file: true,
	        netlify_toml: true,
	        redirect: {
	          status: redirectRule.status,
          ok: redirectRule.status === 301 && redirectRule.location === expectedLandingUrl,
          location: redirectRule.location,
          route: redirectRule.headers.x_skynet_route,
          elapsed_ms: redirectRule.elapsed_ms
        },
        shadowed_asset: {
          status: landingRule.status,
          ok: landingRule.status === 200
            && hasAll(landingRule.text, ['Landing Target'])
            && landingRule.headers.x_skyenet_rule_proof === 'rules-applied'
            && landingRule.headers.x_skyenet_landing_proof === 'landing-header',
          route: landingRule.headers.x_skynet_route,
          rule_header: landingRule.headers.x_skyenet_rule_proof,
          landing_header: landingRule.headers.x_skyenet_landing_proof,
          elapsed_ms: landingRule.elapsed_ms
        },
        rewrite: {
          status: rewriteRule.status,
          ok: rewriteRule.status === 200
            && hasAll(rewriteRule.text, ['SkyeNet parity proof', 'Public bundle is live on SkyeNet'])
            && rewriteRule.headers.x_skynet_rewrite_target === '/index.html'
            && rewriteRule.headers.x_skyenet_rule_proof === 'rules-applied',
          route: rewriteRule.headers.x_skynet_route,
          rewrite_target: rewriteRule.headers.x_skynet_rewrite_target,
	          rule_header: rewriteRule.headers.x_skyenet_rule_proof,
	          elapsed_ms: rewriteRule.elapsed_ms
	        },
	        toml_redirect: {
	          status: tomlRedirectRule.status,
	          ok: tomlRedirectRule.status === 302 && tomlRedirectRule.location === new URL('toml.html', liveUrl).toString(),
	          location: tomlRedirectRule.location,
	          route: tomlRedirectRule.headers.x_skynet_route,
	          elapsed_ms: tomlRedirectRule.elapsed_ms
	        },
	        toml_header: {
	          status: tomlRule.status,
	          ok: tomlRule.status === 200 && hasAll(tomlRule.text, ['Toml Target']) && tomlRule.headers.x_toml_header === 'yes',
	          route: tomlRule.headers.x_skynet_route,
	          toml_header: tomlRule.headers.x_toml_header,
	          elapsed_ms: tomlRule.elapsed_ms
	        },
	        rule_file_blocked: {
	          status: privateRuleFile.status,
	          ok: privateRuleFile.status === 404 && !privateRuleFile.text.includes('/old /landing.html'),
	          route: privateRuleFile.headers.x_skynet_route,
	          elapsed_ms: privateRuleFile.elapsed_ms
	        },
	        toml_file_blocked: {
	          status: privateTomlFile.status,
	          ok: privateTomlFile.status === 404 && !privateTomlFile.text.includes('[[redirects]]'),
	          route: privateTomlFile.headers.x_skynet_route,
	          elapsed_ms: privateTomlFile.elapsed_ms
	        }
	      };

	      const assetUrls = [
	        new URL('assets/app.css', liveUrl).toString(),
	        new URL('assets/app.js', liveUrl).toString(),
	        new URL('assets/data.txt', liveUrl).toString()
	      ];
      const assetChecks = [];
      for (const assetUrl of assetUrls) {
        const asset = await fetchText(assetUrl);
        assetChecks.push({
          url: assetUrl,
          status: asset.status,
          ok: asset.status === 200,
          content_type: asset.content_type,
          elapsed_ms: asset.elapsed_ms
        });
      }
	      receipt.public_assets = {
	        ok: assetChecks.every((asset) => asset.ok),
	        checks: assetChecks
	      };

	      const dataAssetUrl = new URL('assets/data.txt', liveUrl).toString();
	      const fullDataAsset = await fetchText(dataAssetUrl);
	      const rangedDataAsset = await fetchText(dataAssetUrl, { headers: { range: 'bytes=2-5' } });
	      const conditionalDataAsset = fullDataAsset.headers.etag
	        ? await fetchText(dataAssetUrl, { headers: { 'if-none-match': fullDataAsset.headers.etag } })
	        : { status: 0, headers: {}, elapsed_ms: 0, text: '' };
	      const conditionalDateAsset = fullDataAsset.headers.last_modified
	        ? await fetchText(dataAssetUrl, { headers: { 'if-modified-since': fullDataAsset.headers.last_modified } })
	        : { status: 0, headers: {}, elapsed_ms: 0, text: '' };
	      const formsPolicy = deploymentId
	        ? await fetchJson(`${skynetBase}/api/skyenet/forms-policy`, {
	          method: 'POST',
	          headers: { ...authHeaders(token), 'content-type': 'application/json' },
	          body: JSON.stringify({
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
	          })
	        })
	        : { status: 0, body: {}, headers: {}, elapsed_ms: 0 };
	      const formsPolicyBody = apiBody(formsPolicy);
	      const formCapture = await fetchJson(new URL('contact', liveUrl).toString(), {
	        method: 'POST',
	        headers: {
	          accept: 'application/json',
	          'content-type': 'application/x-www-form-urlencoded'
	        },
	        body: new URLSearchParams({
	          'form-name': 'contact',
	          name: 'SkyeNet Proof',
	          message: 'Netlify Forms basic capture live proof'
	        }).toString()
	      });
	      const uploadBody = new FormData();
	      uploadBody.set('form-name', 'contact');
	      uploadBody.set('name', 'SkyeNet Upload Proof');
	      uploadBody.set('bot-field', 'filled-by-bot-proof');
	      uploadBody.set('message', 'Netlify Forms multipart file custody and honeypot proof');
	      uploadBody.append('attachment', new Blob(['hello upload'], { type: 'text/plain' }), 'hello.txt');
	      const formUploadCapture = await fetchJson(new URL('contact', liveUrl).toString(), {
	        method: 'POST',
	        headers: {
	          accept: 'application/json',
	          'x-netlify-honeypot': 'bot-field'
	        },
	        body: uploadBody
	      });
	      const policySpamCapture = await fetchJson(new URL('contact', liveUrl).toString(), {
	        method: 'POST',
	        headers: {
	          accept: 'application/json',
	          'content-type': 'application/x-www-form-urlencoded'
	        },
	        body: new URLSearchParams({
	          'form-name': 'contact',
	          name: 'Policy Spam',
	          email: 'lead@spam.example',
	          message: 'casino proof http://one.example http://two.example',
	          skynet_form_started_at: String(Date.now())
	        }).toString()
	      });
	      const inboxUrl = `${skynetBase}/api/skyenet/forms-inbox?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&limit=20`;
	      const formsInbox = deploymentId ? await fetchJson(inboxUrl, { headers: authHeaders(token) }) : { status: 0, body: {}, headers: {}, elapsed_ms: 0 };
	      const inboxBody = apiBody(formsInbox);
	      const uploadReceiptKey = formUploadCapture.body?.receipt_key || formUploadCapture.headers.x_skynet_form_receipt || '';
	      const uploadSubmissionUrl = `${skynetBase}/api/skyenet/forms-submission?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&receipt_key=${encodeURIComponent(uploadReceiptKey)}`;
	      const uploadSubmission = uploadReceiptKey ? await fetchJson(uploadSubmissionUrl, { headers: authHeaders(token) }) : { status: 0, body: {}, headers: {}, elapsed_ms: 0 };
	      const uploadSubmissionBody = apiBody(uploadSubmission);
	      const uploadFileKey = uploadSubmissionBody.submission?.files?.[0]?.key || '';
	      const formFileUrl = `${skynetBase}/api/skyenet/forms-file?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}&file_key=${encodeURIComponent(uploadFileKey)}`;
	      const formFileDownload = uploadFileKey ? await fetchText(formFileUrl, { headers: authHeaders(token) }) : { status: 0, text: '', headers: {}, elapsed_ms: 0 };
	      const moderation = uploadReceiptKey ? await fetchJson(`${skynetBase}/api/skyenet/forms-submission`, {
	        method: 'PATCH',
	        headers: { ...authHeaders(token), 'content-type': 'application/json' },
	        body: JSON.stringify({
	          workspace_id: workspaceId,
	          project_id: projectId,
	          deployment_id: deploymentId,
	          receipt_key: uploadReceiptKey,
	          status: 'read',
	          spam_status: 'not_spam',
	          note: 'owner moderation live parity proof'
	        })
	      }) : { status: 0, body: {}, headers: {}, elapsed_ms: 0 };
	      const moderationBody = apiBody(moderation);
	      const policySpamReceiptKey = policySpamCapture.body?.receipt_key || policySpamCapture.headers.x_skynet_form_receipt || '';
	      const notification = policySpamReceiptKey ? await fetchJson(`${skynetBase}/api/skyenet/forms-notify`, {
	        method: 'POST',
	        headers: { ...authHeaders(token), 'content-type': 'application/json' },
	        body: JSON.stringify({
	          workspace_id: workspaceId,
	          project_id: projectId,
	          deployment_id: deploymentId,
	          receipt_key: policySpamReceiptKey
	        })
	      }) : { status: 0, body: {}, headers: {}, elapsed_ms: 0 };
	      const notificationBody = apiBody(notification);
	      receipt.static_http = {
	        range: {
	          status: rangedDataAsset.status,
	          ok: rangedDataAsset.status === 206
	            && rangedDataAsset.text === '2345'
	            && rangedDataAsset.headers.accept_ranges === 'bytes'
	            && rangedDataAsset.headers.content_range === 'bytes 2-5/16',
	          content_range: rangedDataAsset.headers.content_range,
	          accept_ranges: rangedDataAsset.headers.accept_ranges,
	          elapsed_ms: rangedDataAsset.elapsed_ms
	        },
	        conditional_etag: {
	          status: conditionalDataAsset.status,
	          ok: Boolean(fullDataAsset.headers.etag) && conditionalDataAsset.status === 304,
	          etag_present: Boolean(fullDataAsset.headers.etag),
	          elapsed_ms: conditionalDataAsset.elapsed_ms
	        },
	        conditional_last_modified: {
	          status: conditionalDateAsset.status,
	          ok: Boolean(fullDataAsset.headers.last_modified) && conditionalDateAsset.status === 304,
	          last_modified_present: Boolean(fullDataAsset.headers.last_modified),
	          elapsed_ms: conditionalDateAsset.elapsed_ms
	        },
	        form_capture: {
	          status: formCapture.status,
	          ok: formCapture.status === 202
	            && formCapture.body?.ok === true
	            && formCapture.body?.form_name === 'contact'
	            && formCapture.headers.x_skynet_route === 'netlify-form'
	            && formUploadCapture.status === 202
	            && formUploadCapture.body?.ok === true
	            && formUploadCapture.body?.form_name === 'contact'
	            && formUploadCapture.body?.spam_detected === true
	            && Array.isArray(formUploadCapture.body?.spam_reasons)
	            && formUploadCapture.body.spam_reasons.includes('honeypot')
	            && formUploadCapture.body?.file_count === 1
	            && formUploadCapture.headers.x_skynet_route === 'netlify-form'
	            && formUploadCapture.headers.x_skynet_form_spam === '1'
	            && formUploadCapture.headers.x_skynet_form_file_count === '1',
	          form_name: formCapture.body?.form_name || '',
		          route: formCapture.headers.x_skynet_route,
		          receipt_key_present: Boolean(formCapture.body?.receipt_key || formCapture.headers.x_skynet_form_receipt),
		          notification_receipt_key_present: Boolean(formCapture.body?.notification_receipt_key || formCapture.headers.x_skynet_form_notification),
		          multipart_file_upload: {
		            status: formUploadCapture.status,
		            ok: formUploadCapture.status === 202 && formUploadCapture.body?.file_count === 1,
		            file_count: formUploadCapture.body?.file_count || 0,
		            receipt_key_present: Boolean(formUploadCapture.body?.receipt_key || formUploadCapture.headers.x_skynet_form_receipt),
		            notification_receipt_key_present: Boolean(formUploadCapture.body?.notification_receipt_key || formUploadCapture.headers.x_skynet_form_notification)
		          },
	          honeypot_spam: {
	            status: formUploadCapture.status,
	            ok: formUploadCapture.body?.spam_detected === true && formUploadCapture.headers.x_skynet_form_spam === '1',
	            spam_reasons: formUploadCapture.body?.spam_reasons || []
	          },
	          elapsed_ms: formCapture.elapsed_ms
		        }
		      };
	      receipt.forms_owner_workflow = {
	        ok: formsPolicy.status === 200
	          && formsPolicyBody.forms_policy?.spam_controls?.link_limit === 2
	          && formsPolicyBody.forms_policy?.notifications?.mode === 'owner-queue'
	          && formsPolicyBody.forms_policy?.notifications?.external_delivery_enabled === true
	          && policySpamCapture.status === 202
	          && policySpamCapture.body?.notification_status === 'queued_owner_delivery'
	          && policySpamCapture.body?.spam_detected === true
	          && Array.isArray(policySpamCapture.body?.spam_reasons)
	          && policySpamCapture.body.spam_reasons.includes('blocked_term')
	          && policySpamCapture.body.spam_reasons.includes('blocked_domain')
	          && policySpamCapture.body.spam_reasons.includes('link_density')
	          && policySpamCapture.body.spam_reasons.includes('too_fast')
	          && formsInbox.status === 200
	          && Number(inboxBody.counts?.total || 0) >= 3
	          && Array.isArray(inboxBody.submissions)
	          && inboxBody.submissions.some((item) => item.key === uploadReceiptKey)
	          && uploadSubmission.status === 200
	          && uploadFileKey
	          && formFileDownload.status === 200
	          && formFileDownload.text === 'hello upload'
	          && formFileDownload.headers.x_skynet_form_file === 'private'
	          && moderation.status === 200
	          && moderationBody.summary?.status === 'read'
	          && moderationBody.summary?.spam_detected === false
	          && notification.status === 200
	          && Boolean(notificationBody.notification_key)
	          && notificationBody.notification?.status === 'queued_owner_delivery'
	          && notificationBody.notification?.external_delivery_enabled === true
	          && notificationBody.notification?.external_delivery_attempted === true,
	        policy: {
	          status: formsPolicy.status,
	          link_limit: formsPolicyBody.forms_policy?.spam_controls?.link_limit || 0,
	          notification_mode: formsPolicyBody.forms_policy?.notifications?.mode || '',
	          external_delivery_enabled: formsPolicyBody.forms_policy?.notifications?.external_delivery_enabled === true,
	          elapsed_ms: formsPolicy.elapsed_ms
	        },
	        policy_spam: {
	          status: policySpamCapture.status,
	          spam_detected: policySpamCapture.body?.spam_detected === true,
	          spam_reasons: policySpamCapture.body?.spam_reasons || [],
	          notification_status: policySpamCapture.body?.notification_status || '',
	          receipt_key_present: Boolean(policySpamReceiptKey),
	          notification_receipt_key_present: Boolean(policySpamCapture.body?.notification_receipt_key || policySpamCapture.headers.x_skynet_form_notification),
	          elapsed_ms: policySpamCapture.elapsed_ms
	        },
	        inbox: {
	          status: formsInbox.status,
	          count: inboxBody.counts?.total || 0,
	          has_upload_submission: Array.isArray(inboxBody.submissions) && inboxBody.submissions.some((item) => item.key === uploadReceiptKey),
	          elapsed_ms: formsInbox.elapsed_ms
	        },
	        submission: {
	          status: uploadSubmission.status,
	          file_key_present: Boolean(uploadFileKey),
	          elapsed_ms: uploadSubmission.elapsed_ms
	        },
	        private_file_download: {
	          status: formFileDownload.status,
	          ok: formFileDownload.status === 200 && formFileDownload.text === 'hello upload' && formFileDownload.headers.x_skynet_form_file === 'private',
	          bytes: Buffer.byteLength(formFileDownload.text || ''),
	          elapsed_ms: formFileDownload.elapsed_ms
	        },
	        moderation: {
	          status: moderation.status,
	          summary_status: moderationBody.summary?.status || '',
	          spam_detected: moderationBody.summary?.spam_detected === true,
	          elapsed_ms: moderation.elapsed_ms
	        },
	        notification: {
	          status: notification.status,
	          notification_key_present: Boolean(notificationBody.notification_key),
	          notification_status: notificationBody.notification?.status || '',
	          external_delivery_enabled: notificationBody.notification?.external_delivery_enabled === true,
	          external_delivery_attempted: notificationBody.notification?.external_delivery_attempted === true,
	          delivery_channel: notificationBody.notification?.delivery_channel || '',
	          elapsed_ms: notification.elapsed_ms
	        }
	      };

      if (deploymentId) {
        const sourceUrl = receipt.links.source_download;
        const started = performance.now();
        const response = await fetch(sourceUrl, { headers: authHeaders(token), redirect: 'manual' });
        const bytes = Buffer.from(await response.arrayBuffer());
        const bodyText = bytes.toString('utf8');
	        receipt.source_download = {
	          url: sourceUrl,
          status: response.status,
          ok: response.ok
            && response.headers.get('content-type') === 'application/x-tar'
            && hasAll(bodyText, ['.skyenet/source-manifest.json', 'package.json', 'src/main.js', 'netlify/functions/hello.mjs', 'netlify/functions/egress.mjs', 'netlify/functions/job-background.mjs', 'netlify/functions/tick.mjs', 'netlify/functions/secret-check.mjs', 'netlify/functions/with-helper.mjs', 'netlify/lib/parity-message.mjs', 'vendor/skyenet-proof-dep/index.mjs', 'README.md']),
          content_type: response.headers.get('content-type') || '',
          source_mode_header: response.headers.get('x-skynet-source-mode') || '',
          bytes: bytes.byteLength,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          checks: {
            has_manifest: bodyText.includes('.skyenet/source-manifest.json'),
            has_package_json: bodyText.includes('package.json'),
            has_src_main: bodyText.includes('src/main.js'),
            has_netlify_function: bodyText.includes('netlify/functions/hello.mjs'),
            has_egress_function: bodyText.includes('netlify/functions/egress.mjs'),
            has_background_function: bodyText.includes('netlify/functions/job-background.mjs'),
            has_scheduled_function: bodyText.includes('netlify/functions/tick.mjs'),
            has_helper_function: bodyText.includes('netlify/functions/with-helper.mjs'),
            has_helper_module: bodyText.includes('netlify/lib/parity-message.mjs'),
            has_file_dependency: bodyText.includes('vendor/skyenet-proof-dep/index.mjs'),
            has_public_index: bodyText.includes('index.html')
          },
	          elapsed_ms: Number((performance.now() - started).toFixed(2))
	        };

	        const sourceApiUrl = (path, extra = {}) => {
	          const target = new URL(sourceUrl);
	          target.pathname = `/api/skyenet/${path}`;
	          target.searchParams.set('workspace_id', workspaceId);
	          target.searchParams.set('project_id', projectId);
	          target.searchParams.set('deployment_id', deploymentId);
	          for (const [key, value] of Object.entries(extra)) target.searchParams.set(key, value);
	          return target.toString();
	        };
	        const manifest = await fetchJson(sourceApiUrl('source-manifest', { limit: '20' }), { headers: authHeaders(token), redirect: 'manual' });
	        const tree = await fetchJson(sourceApiUrl('source-tree'), { headers: authHeaders(token), redirect: 'manual' });
	        const sourceFile = await fetchJson(sourceApiUrl('source-file', { path: 'src/main.js' }), { headers: authHeaders(token), redirect: 'manual' });
	        const search = await fetchJson(sourceApiUrl('source-search', { q: 'handler' }), { headers: authHeaders(token), redirect: 'manual' });
	        const transferVault = await fetchJson(`${skynetBase}/api/skyenet/source-transfer`, {
	          method: 'POST',
	          headers: { ...authHeaders(token), 'content-type': 'application/json' },
	          body: JSON.stringify({
	            workspace_id: workspaceId,
	            project_id: projectId,
	            deployment_id: deploymentId,
	            method: 'skyevault',
	            vault_id: 'skyenet-netlify-parity-proof'
	          })
	        });
	        const transferDrive = await fetchJson(`${skynetBase}/api/skyenet/source-transfer`, {
	          method: 'POST',
	          headers: { ...authHeaders(token), 'content-type': 'application/json' },
	          body: JSON.stringify({
	            workspace_id: workspaceId,
	            project_id: projectId,
	            deployment_id: deploymentId,
	            method: 'skyedrive',
	            drive_id: 'skyenet-netlify-parity-proof'
	          })
	        });
	        const codebases = await fetchJson(sourceApiUrl('source-codebases'), { headers: authHeaders(token), redirect: 'manual' });
	        const codebaseItems = Array.isArray(codebases.body?.codebases) ? codebases.body.codebases : [];
	        receipt.source_codebase = {
	          manifest: {
	            status: manifest.status,
	            ok: manifest.ok && manifest.body?.source_mode === 'private-full-project' && hasAll(JSON.stringify(manifest.body.files || []), ['package.json', 'src/main.js', 'netlify/functions/hello.mjs', 'netlify/functions/egress.mjs', 'netlify/functions/job-background.mjs', 'netlify/functions/tick.mjs', 'netlify/functions/secret-check.mjs', 'netlify/functions/with-helper.mjs', 'netlify/lib/parity-message.mjs']),
	            file_count: manifest.body?.file_count || 0
	          },
	          tree: {
	            status: tree.status,
	            ok: tree.ok && hasAll(JSON.stringify(tree.body?.entries || []), ['src', 'netlify', 'package.json']),
	            entry_count: tree.body?.entry_count || 0
	          },
		          file: {
		            status: sourceFile.status,
		            ok: sourceFile.ok && sourceFile.body?.path === 'src/main.js' && String(sourceFile.body?.text || '').includes('private-full-project-package'),
		            bytes: sourceFile.body?.bytes || 0
		          },
	          search: {
	            status: search.status,
	            ok: search.ok && Array.isArray(search.body?.results) && search.body.results.some((item) => item.path === 'netlify/functions/hello.mjs'),
	            result_count: search.body?.result_count || 0
	          },
	          promoted_codebase: {
	            vault_transfer_status: transferVault.status,
	            drive_transfer_status: transferDrive.status,
	            codebases_status: codebases.status,
	            ok: transferVault.ok
	              && transferVault.body?.status === 'completed'
	              && transferVault.body?.storage?.stored === true
	              && String(transferVault.body?.storage?.key || '').includes('skyevault/source-transfers')
	              && transferDrive.ok
	              && transferDrive.body?.status === 'completed'
	              && transferDrive.body?.storage?.stored === true
	              && String(transferDrive.body?.storage?.key || '').includes('skyedrive/source-transfers')
	              && Array.isArray(transferVault.body?.promoted_codebases)
	              && transferVault.body.promoted_codebases.some((item) => item.project_id === projectId && item.deployment_id === deploymentId && item.relation === 'source-owner')
	              && Array.isArray(transferDrive.body?.promoted_codebases)
	              && transferDrive.body.promoted_codebases.some((item) => item.project_id === projectId && item.deployment_id === deploymentId && item.relation === 'source-owner')
	              && codebases.ok
	              && codebaseItems.some((item) => item.project_id === projectId && item.deployment_id === deploymentId && item.access_policy?.read_source_granted === true),
	            vault_transfer_id: transferVault.body?.transfer_id || '',
	            drive_transfer_id: transferDrive.body?.transfer_id || '',
	            vault_promoted_count: Array.isArray(transferVault.body?.promoted_codebases) ? transferVault.body.promoted_codebases.length : 0,
	            drive_promoted_count: Array.isArray(transferDrive.body?.promoted_codebases) ? transferDrive.body.promoted_codebases.length : 0,
	            listed_count: codebaseItems.length,
	            vault_storage_key: transferVault.body?.storage?.key || '',
	            drive_storage_key: transferDrive.body?.storage?.key || ''
	          }
	        };

	        const archiveProjectId = `${projectId}-archive-read`;
	        const archiveDeploymentId = `dep_archive_${receipt.generated_at.replace(/[-:TZ.]/g, '').slice(0, 14)}`;
	        const archiveTargetPath = 'src/arbitrary-target.txt';
	        const archiveEntries = [
	          { path: 'README.md', text: 'archive-backed source package\n' },
	          { path: 'src/bootstrap.js', text: 'console.log("archive boot");\n' },
	          { path: archiveTargetPath, text: 'TARGET: live tar.gz archive lazy read works\n' },
	          ...Array.from({ length: 60 }, (_, index) => ({
	            path: `vendor/generated/file-${String(index).padStart(4, '0')}.txt`,
	            text: `trailing archive file ${index}\n`
	          }))
	        ];
	        const archiveIndexBody = `${archiveEntries.map((entry) => JSON.stringify({
	          path: entry.path,
	          size: Buffer.byteLength(entry.text),
	          content_type: 'text/plain; charset=utf-8'
	        })).join('\n')}\n`;
	        const archiveBytes = tarGz(archiveEntries);
	        const archiveHash = createHash('sha256').update(archiveBytes).digest('hex');
	        const archiveIndex = await fetchJson(`${skynetBase}/api/skyenet/source-index?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: archiveProjectId,
	          deployment_id: archiveDeploymentId
	        }).toString()}`, {
	          method: 'PUT',
	          headers: { ...authHeaders(token), 'content-type': 'application/x-ndjson; charset=utf-8' },
	          body: archiveIndexBody
	        });
	        const archiveUpload = await fetchJson(`${skynetBase}/api/skyenet/source-archive?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: archiveProjectId,
	          deployment_id: archiveDeploymentId,
	          filename: 'source.tar.gz'
	        }).toString()}`, {
	          method: 'PUT',
	          headers: {
	            ...authHeaders(token),
	            'content-type': 'application/gzip',
	            'x-skynet-source-archive-bytes': String(archiveBytes.byteLength),
	            'x-skynet-source-archive-sha256': archiveHash
	          },
	          body: archiveBytes
	        });
	        const archiveIndexBodyJson = archiveIndex.body?.skynet || archiveIndex.body || {};
	        const archiveUploadBodyJson = archiveUpload.body?.skynet || archiveUpload.body || {};
	        const archiveFile = await fetchJson(`${skynetBase}/api/skyenet/source-file?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: archiveProjectId,
	          deployment_id: archiveDeploymentId,
	          path: archiveTargetPath
	        }).toString()}`, {
	          headers: authHeaders(token),
	          redirect: 'manual'
	        });
	        const archiveFileBody = archiveFile.body?.skynet || archiveFile.body || {};
	        receipt.archive_backed_source_file = {
	          project_id: archiveProjectId,
	          deployment_id: archiveDeploymentId,
	          source_index_status: archiveIndex.status,
	          source_archive_status: archiveUpload.status,
	          source_file_status: archiveFile.status,
	          ok: archiveIndex.ok
	            && archiveUpload.ok
	            && archiveFile.ok
	            && archiveFileBody.path === archiveTargetPath
	            && archiveFileBody.text === 'TARGET: live tar.gz archive lazy read works\n'
	            && archiveFileBody.archive_lazy_read?.decompressed_stream === true
	            && archiveFileBody.archive_lazy_read?.materialized_file_object === false,
	          file_count: archiveIndexBodyJson.source_index?.file_count || archiveFileBody.source_package?.file_count || 0,
	          archive_bytes: archiveUploadBodyJson.source_archive?.bytes || archiveBytes.byteLength,
	          compression: archiveFileBody.archive_lazy_read?.compression || '',
	          scanned_entries: archiveFileBody.archive_lazy_read?.scanned_entries || 0,
	          materialized_file_object: archiveFileBody.archive_lazy_read?.materialized_file_object ?? null
	        };

	        const zstdProjectId = `${projectId}-zstd-read`;
	        const zstdDeploymentId = `dep_zstd_${receipt.generated_at.replace(/[-:TZ.]/g, '').slice(0, 14)}`;
	        const zstdTargetPath = 'src/arbitrary-target.txt';
	        const zstdEntries = [
	          { path: 'README.md', text: 'zstd-backed source package\n' },
	          { path: 'src/bootstrap.js', text: 'console.log("zstd archive boot");\n' },
	          { path: zstdTargetPath, text: 'TARGET: live tar.zst archive lazy read works\n' },
	          ...Array.from({ length: 60 }, (_, index) => ({
	            path: `vendor/generated/file-${String(index).padStart(4, '0')}.txt`,
	            text: `trailing zstd archive file ${index}\n`
	          }))
	        ];
	        const zstdIndexBody = `${zstdEntries.map((entry) => JSON.stringify({
	          path: entry.path,
	          size: Buffer.byteLength(entry.text),
	          content_type: 'text/plain; charset=utf-8'
	        })).join('\n')}\n`;
	        const zstdBytes = tarZst(zstdEntries);
	        const zstdHash = createHash('sha256').update(zstdBytes).digest('hex');
	        const zstdIndex = await fetchJson(`${skynetBase}/api/skyenet/source-index?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: zstdProjectId,
	          deployment_id: zstdDeploymentId
	        }).toString()}`, {
	          method: 'PUT',
	          headers: { ...authHeaders(token), 'content-type': 'application/x-ndjson; charset=utf-8' },
	          body: zstdIndexBody
	        });
	        const zstdUpload = await fetchJson(`${skynetBase}/api/skyenet/source-archive?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: zstdProjectId,
	          deployment_id: zstdDeploymentId,
	          filename: 'source.tar.zst'
	        }).toString()}`, {
	          method: 'PUT',
	          headers: {
	            ...authHeaders(token),
	            'content-type': 'application/zstd',
	            'x-skynet-source-archive-bytes': String(zstdBytes.byteLength),
	            'x-skynet-source-archive-sha256': zstdHash
	          },
	          body: zstdBytes
	        });
	        const zstdIndexBodyJson = zstdIndex.body?.skynet || zstdIndex.body || {};
	        const zstdUploadBodyJson = zstdUpload.body?.skynet || zstdUpload.body || {};
	        const zstdFile = await fetchJson(`${skynetBase}/api/skyenet/source-file?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: zstdProjectId,
	          deployment_id: zstdDeploymentId,
	          path: zstdTargetPath
	        }).toString()}`, {
	          headers: authHeaders(token),
	          redirect: 'manual'
	        });
	        const zstdFileBody = zstdFile.body?.skynet || zstdFile.body || {};
	        receipt.zstd_backed_source_file = {
	          project_id: zstdProjectId,
	          deployment_id: zstdDeploymentId,
	          source_index_status: zstdIndex.status,
	          source_archive_status: zstdUpload.status,
	          source_file_status: zstdFile.status,
	          ok: zstdIndex.ok
	            && zstdUpload.ok
	            && zstdFile.ok
	            && zstdFileBody.path === zstdTargetPath
	            && zstdFileBody.text === 'TARGET: live tar.zst archive lazy read works\n'
	            && zstdFileBody.archive_lazy_read?.decompressed_stream === true
	            && zstdFileBody.archive_lazy_read?.compression === 'zstd'
	            && zstdFileBody.archive_lazy_read?.materialized_file_object === false,
	          file_count: zstdIndexBodyJson.source_index?.file_count || zstdFileBody.source_package?.file_count || 0,
	          archive_bytes: zstdUploadBodyJson.source_archive?.bytes || zstdBytes.byteLength,
	          compression: zstdFileBody.archive_lazy_read?.compression || '',
	          scanned_entries: zstdFileBody.archive_lazy_read?.scanned_entries || 0,
	          materialized_file_object: zstdFileBody.archive_lazy_read?.materialized_file_object ?? null
	        };

	        const zipProjectId = `${projectId}-zip-read`;
	        const zipDeploymentId = `dep_zip_${receipt.generated_at.replace(/[-:TZ.]/g, '').slice(0, 14)}`;
	        const zipTargetPath = 'src/arbitrary-target.txt';
	        const zipEntries = [
	          { path: 'README.md', text: 'zip-backed source package\n' },
	          { path: 'src/bootstrap.js', text: 'console.log("zip archive boot");\n' },
	          { path: zipTargetPath, text: 'TARGET: live zip archive lazy read works\n' },
	          ...Array.from({ length: 60 }, (_, index) => ({
	            path: `vendor/generated/file-${String(index).padStart(4, '0')}.txt`,
	            text: `trailing zip archive file ${index}\n`
	          }))
	        ];
	        const zipIndexBody = `${zipEntries.map((entry) => JSON.stringify({
	          path: entry.path,
	          size: Buffer.byteLength(entry.text),
	          content_type: 'text/plain; charset=utf-8'
	        })).join('\n')}\n`;
	        const zipBytes = zipDeflated(zipEntries);
	        const zipHash = createHash('sha256').update(zipBytes).digest('hex');
	        const zipIndex = await fetchJson(`${skynetBase}/api/skyenet/source-index?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: zipProjectId,
	          deployment_id: zipDeploymentId
	        }).toString()}`, {
	          method: 'PUT',
	          headers: { ...authHeaders(token), 'content-type': 'application/x-ndjson; charset=utf-8' },
	          body: zipIndexBody
	        });
	        const zipUpload = await fetchJson(`${skynetBase}/api/skyenet/source-archive?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: zipProjectId,
	          deployment_id: zipDeploymentId,
	          filename: 'source.zip'
	        }).toString()}`, {
	          method: 'PUT',
	          headers: {
	            ...authHeaders(token),
	            'content-type': 'application/zip',
	            'x-skynet-source-archive-bytes': String(zipBytes.byteLength),
	            'x-skynet-source-archive-sha256': zipHash
	          },
	          body: zipBytes
	        });
	        const zipIndexBodyJson = zipIndex.body?.skynet || zipIndex.body || {};
	        const zipUploadBodyJson = zipUpload.body?.skynet || zipUpload.body || {};
	        const zipFile = await fetchJson(`${skynetBase}/api/skyenet/source-file?${new URLSearchParams({
	          workspace_id: workspaceId,
	          project_id: zipProjectId,
	          deployment_id: zipDeploymentId,
	          path: zipTargetPath
	        }).toString()}`, {
	          headers: authHeaders(token),
	          redirect: 'manual'
	        });
	        const zipFileBody = zipFile.body?.skynet || zipFile.body || {};
	        receipt.zip_backed_source_file = {
	          project_id: zipProjectId,
	          deployment_id: zipDeploymentId,
	          source_index_status: zipIndex.status,
	          source_archive_status: zipUpload.status,
	          source_file_status: zipFile.status,
	          ok: zipIndex.ok
	            && zipUpload.ok
	            && zipFile.ok
	            && zipFileBody.path === zipTargetPath
	            && zipFileBody.text === 'TARGET: live zip archive lazy read works\n'
	            && zipFileBody.archive_lazy_read?.compression === 'zip'
	            && zipFileBody.archive_lazy_read?.zip_method === 'deflate'
	            && zipFileBody.archive_lazy_read?.materialized_file_object === false,
	          file_count: zipIndexBodyJson.source_index?.file_count || zipFileBody.source_package?.file_count || 0,
	          archive_bytes: zipUploadBodyJson.source_archive?.bytes || zipBytes.byteLength,
	          compression: zipFileBody.archive_lazy_read?.compression || '',
	          zip_method: zipFileBody.archive_lazy_read?.zip_method || '',
	          compressed_size: zipFileBody.archive_lazy_read?.compressed_size || 0,
	          central_directory_bytes: zipFileBody.archive_lazy_read?.central_directory_bytes || 0,
	          scanned_entries: zipFileBody.archive_lazy_read?.scanned_entries || 0,
	          materialized_file_object: zipFileBody.archive_lazy_read?.materialized_file_object ?? null
	        };

	        const exposedUrl = `${skynetBase}${mount}/netlify/functions/hello.mjs`;
        const exposure = await fetchText(exposedUrl);
        receipt.public_source_exposure = {
          url: exposedUrl,
          status: exposure.status,
          ok: exposure.status !== 200 && !exposure.text.includes('skyenet-functions-managed'),
          elapsed_ms: exposure.elapsed_ms,
          content_type: exposure.content_type
        };

	        receipt.runtime_telemetry = await pollRuntimeTelemetry({ token, liveUrl });
      }

      const caps = receipt.status.capabilities || {};
      if (!receipt.console.ok) receipt.failures.push('SkyeNet console did not show env/private source controls.');
      if (!receipt.publish_guide.ok) receipt.failures.push('SkyeNet publish guide did not show source-root/env copy.');
      if (!receipt.console_function_ops.ok) receipt.failures.push('SkyeNet console did not expose function env grants and rollback UI.');
	      if (!receipt.status.ok || caps.private_full_project_source_packages !== true) receipt.failures.push('SkyeNet status did not advertise private full project packages.');
	      if (caps.env_variable_registry !== true) receipt.failures.push('SkyeNet status did not advertise env variable registry.');
	      if (caps.uploaded_function_bundle_activation_api !== true || caps.uploaded_function_dynamic_worker_invocation !== true || caps.arbitrary_uploaded_serverless_functions !== true) receipt.failures.push('SkyeNet status did not advertise live uploaded function activation/invocation parity.');
	      if (caps.netlify_toml_redirects_headers !== true || caps.netlify_forms_basic_capture !== true || caps.netlify_forms_honeypot_spam_filter !== true || caps.netlify_forms_multipart_file_uploads !== true || caps.netlify_forms_private_upload_custody !== true || caps.netlify_forms_owner_inbox !== true || caps.netlify_forms_submission_status_controls !== true || caps.netlify_forms_notification_receipts !== true || caps.netlify_forms_spam_policy_controls !== true || caps.netlify_forms_private_file_downloads !== true || caps.static_asset_range_requests !== true || caps.static_asset_conditional_etag !== true || caps.static_asset_conditional_last_modified !== true) receipt.failures.push('SkyeNet status did not advertise the newly closed static/forms parity capabilities.');
	      if (caps.customer_support_profile !== true || caps.customer_export_bundle !== true || caps.runtime_observability !== true || caps.runtime_log_exports !== true) receipt.failures.push('SkyeNet status did not advertise support/export/observability parity capabilities.');
	      if (!receipt.support?.ok) receipt.failures.push('Approved Skyes Over London support profile did not pass live API proof.');
	      if (!receipt.observability?.ok || receipt.observability?.sinks?.r2_runtime_logs !== true || receipt.observability?.sinks?.queue !== true || receipt.observability?.sinks?.d1_rollups !== true) receipt.failures.push('Observability endpoint did not prove R2 runtime logs, queue telemetry, and CitadelDB D1 rollups.');
	      if (!receipt.receipts?.ok) receipt.failures.push('Deployment receipt export lane did not return account-scoped receipts.');
	      if (!receipt.cost_model?.ok) receipt.failures.push('SkyeNet cost model endpoint did not return the expected USD pricing model.');
	      if (!receipt.customer_export?.ok || receipt.customer_export?.includes_raw_token || receipt.customer_export?.includes_raw_env_secret) receipt.failures.push('Customer export bundle failed or included a raw token/secret.');
	      if (!receipt.env_write.ok || receipt.env_write.has_raw_secret) receipt.failures.push('Env write failed or returned raw secret.');
      if (!receipt.env_list.ok || !receipt.env_list.has_key || receipt.env_list.raw_secret_exposed) receipt.failures.push('Env list failed, missed the key, or exposed the raw secret.');
      if (!receipt.deploy.ok) receipt.failures.push('SkyeNet CLI deploy did not upload a private full source package plus function bundle.');
      if (!receipt.public_static.ok) receipt.failures.push('Published SkyeNet public app route did not render expected content.');
	      if (!receipt.cli_functions?.ok) receipt.failures.push('SkyeNet CLI deploy did not bundle/upload/server-sign/invoke arbitrary customer functions with helper imports.');
	      if (!receipt.functions?.ok) receipt.failures.push(`Uploaded signed function activation/invocation proof failed: ${(receipt.functions?.failures || []).join('; ')}`);
	      if (!receipt.netlify_rules?.redirect?.ok || !receipt.netlify_rules?.shadowed_asset?.ok || !receipt.netlify_rules?.rewrite?.ok || !receipt.netlify_rules?.toml_redirect?.ok || !receipt.netlify_rules?.toml_header?.ok || !receipt.netlify_rules?.rule_file_blocked?.ok || !receipt.netlify_rules?.toml_file_blocked?.ok) receipt.failures.push('Netlify-style _redirects/_headers/netlify.toml behavior did not pass live HTTP proof.');
	      if (!receipt.public_assets?.ok) receipt.failures.push('Published SkyeNet public assets did not resolve under the mounted route.');
	      if (!receipt.static_http?.range?.ok || !receipt.static_http?.conditional_etag?.ok || !receipt.static_http?.conditional_last_modified?.ok || !receipt.static_http?.form_capture?.ok) receipt.failures.push('Static asset range/conditional request or Netlify Forms capture did not pass live HTTP proof.');
	      if (!receipt.forms_owner_workflow?.ok) receipt.failures.push('SkyeNet Forms owner inbox/policy/moderation/notification/file workflow did not pass live HTTP proof.');
	      if (!receipt.source_download?.ok) receipt.failures.push('Gated source download did not include full private project files.');
	      if (!receipt.source_codebase?.manifest?.ok || !receipt.source_codebase?.tree?.ok || !receipt.source_codebase?.file?.ok || !receipt.source_codebase?.search?.ok) receipt.failures.push('Gated source codebase manifest/tree/file/search APIs did not prove IDE-readable source custody.');
	      if (!receipt.source_codebase?.promoted_codebase?.ok) receipt.failures.push('SkyeVault source transfer did not create a project-aware codebase mount record.');
	      if (!receipt.archive_backed_source_file?.ok) receipt.failures.push('Archive-backed tar.gz source-file lazy read did not pass live API proof.');
	      if (!receipt.zstd_backed_source_file?.ok) receipt.failures.push('Archive-backed tar.zst source-file lazy read did not pass live API proof.');
	      if (!receipt.zip_backed_source_file?.ok) receipt.failures.push('Archive-backed zip source-file lazy read did not pass live API proof.');
	      if (!receipt.public_source_exposure?.ok) receipt.failures.push('Private source file was exposed through the public route.');
	      if (!receipt.runtime_telemetry?.ok) receipt.failures.push('Runtime telemetry did not prove a production request archived to R2 and rolled up into CitadelDB D1.');
  }

  receipt.ok = receipt.failures.length === 0;
  const stamped = path.join(artifactRoot, `skyenet-netlify-parity-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    live_app: receipt.links.live_app,
    source_download_status: receipt.source_download?.status || 0,
    private_source_bytes: receipt.source_download?.bytes || 0,
    functions_ok: receipt.functions?.ok === true,
    function_invocation_status: receipt.functions?.invoke_hello?.status || 0,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.netlify-parity.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    no_browser_proof_run: true
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
