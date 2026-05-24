#!/usr/bin/env node
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const RUNTIME_SCRIPT = fileURLToPath(import.meta.url);

function headerObject(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) out[key.toLowerCase()] = value;
  return out;
}

function multiValueHeaderObject(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    out[lower] = out[lower] || [];
    out[lower].push(value);
  }
  return out;
}

function isTextualRequest(headers) {
  const type = (headers.get('content-type') || '').toLowerCase();
  if (!type) return true;
  return type.startsWith('text/')
    || type.includes('json')
    || type.includes('xml')
    || type.includes('x-www-form-urlencoded')
    || type.includes('graphql');
}

function manifestSignature(manifest, signingKey) {
  const clone = { ...manifest };
  delete clone.signature;
  return crypto.createHmac('sha256', signingKey).update(JSON.stringify(clone)).digest('hex');
}

function verifyManifestSignature(manifest, signingKey, { required = false } = {}) {
  if (!signingKey) {
    if (required) throw new Error('SkyeNet function bundle signature key is required.');
    return { ok: false, skipped: true, reason: 'no signing key configured' };
  }
  if (manifest.signature?.alg !== 'HS256' || !manifest.signature?.value) {
    if (required) throw new Error('SkyeNet function bundle is unsigned.');
    return { ok: false, skipped: true, reason: 'bundle unsigned' };
  }
  const expected = manifestSignature(manifest, signingKey);
  const actual = String(manifest.signature.value || '');
  const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  if (!ok) throw new Error('SkyeNet function bundle signature mismatch.');
  return { ok: true, alg: 'HS256', key_hint: manifest.signature.key_hint || '' };
}

function applyChildPolicy(policy = {}) {
  if (policy.egress === 'deny') {
    const deny = () => {
      throw new Error('SkyeNet function egress is denied by policy.');
    };
    globalThis.fetch = deny;
  }
}

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function runChild() {
  const payload = await readStdinJson();
  applyChildPolicy(payload.policy || {});
  const mod = await import(pathToFileURL(payload.modulePath).href);
  const handler = mod.handler || mod.default?.handler || mod.default;
  if (typeof handler !== 'function') throw new Error('Function module does not export handler(event, context).');
  const result = await handler(payload.event, payload.context || {});
  const response = result && typeof result === 'object' ? result : { statusCode: 200, body: String(result ?? '') };
  process.stdout.write(JSON.stringify({
    statusCode: Number(response.statusCode || 200),
    headers: response.headers || {},
    body: response.body == null ? '' : String(response.body),
    isBase64Encoded: Boolean(response.isBase64Encoded)
  }));
}

export async function loadManifest(bundleDir) {
  const manifestPath = path.join(path.resolve(bundleDir), 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  return {
    manifest,
    byName: new Map((manifest.functions || []).map((fn) => [fn.name, fn]))
  };
}

async function eventFromRequest(request, { maxBodyBytes = 1048576 } = {}) {
  const url = new URL(request.url);
  const queryStringParameters = {};
  const multiValueQueryStringParameters = {};
  for (const [key, value] of url.searchParams.entries()) queryStringParameters[key] = value;
  for (const [key, value] of url.searchParams.entries()) {
    multiValueQueryStringParameters[key] = multiValueQueryStringParameters[key] || [];
    multiValueQueryStringParameters[key].push(value);
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBodyBytes) {
    const error = new Error(`Function request body exceeds ${maxBodyBytes} bytes.`);
    error.statusCode = 413;
    throw error;
  }
  const bodyBytes = await readRequestBody(request);
  if (bodyBytes.byteLength > maxBodyBytes) {
    const error = new Error(`Function request body exceeds ${maxBodyBytes} bytes.`);
    error.statusCode = 413;
    throw error;
  }
  const textual = isTextualRequest(request.headers);
  return {
    path: url.pathname,
    httpMethod: request.method,
    headers: headerObject(request.headers),
    multiValueHeaders: multiValueHeaderObject(request.headers),
    queryStringParameters,
    multiValueQueryStringParameters,
    rawQuery: url.searchParams.toString(),
    rawUrl: url.href,
    cookies: (request.headers.get('cookie') || '').split(/;\s*/).filter(Boolean),
    body: textual ? Buffer.from(bodyBytes).toString('utf8') : Buffer.from(bodyBytes).toString('base64'),
    isBase64Encoded: !textual
  };
}

async function readRequestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return new Uint8Array();
  return new Uint8Array(await request.arrayBuffer());
}

function functionEnv({ name, grants = {}, record = {} }) {
  const scoped = grants[name] || grants['*'] || {};
  const allowlisted = {};
  for (const key of record.limits?.env_grants || []) {
    if (scoped[key] != null) allowlisted[key] = String(scoped[key]);
  }
  return {
    PATH: process.env.PATH || '',
    NODE_ENV: 'production',
    SKYENET_FUNCTION_NAME: name,
    ...allowlisted
  };
}

function mergeResponseHeaders(result = {}) {
  const headers = new Headers(result.headers || {});
  for (const [key, values] of Object.entries(result.multiValueHeaders || {})) {
    for (const value of Array.isArray(values) ? values : [values]) headers.append(key, String(value));
  }
  return headers;
}

export async function invokeFunction({ bundleDir, name, request, timeoutMs = 10000, maxBodyBytes = 1048576, signingKey = '', requireSignature = false, envGrants = {}, egress = 'deny' }) {
  const loaded = await loadManifest(bundleDir);
  try {
    verifyManifestSignature(loaded.manifest, signingKey, { required: requireSignature });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const record = loaded.byName.get(name);
  if (!record) {
    return new Response(JSON.stringify({ ok: false, error: 'Function not found', name }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const modulePath = path.resolve(bundleDir, record.bundle_path);
  let event;
  try {
    const effectiveMaxBodyBytes = Math.min(Number(record.limits?.max_body_bytes || maxBodyBytes), Number(maxBodyBytes || 1048576));
    event = await eventFromRequest(request, { maxBodyBytes: effectiveMaxBodyBytes });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: error.statusCode || 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const effectiveTimeout = Number(timeoutMs || record.limits?.timeout_ms || 10000);
  const memoryMb = Math.max(32, Math.min(Number(record.limits?.memory_mb || 128), 512));
  const child = spawn(process.execPath, [`--max-old-space-size=${memoryMb}`, RUNTIME_SCRIPT, 'run-child'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.resolve(bundleDir),
    env: functionEnv({ name, grants: envGrants, record })
  });

  const timer = setTimeout(() => child.kill('SIGKILL'), effectiveTimeout);
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.stdin.end(JSON.stringify({
    modulePath,
    event,
    policy: {
      egress: egress === 'allow' || record.limits?.egress === 'allow' ? 'allow' : 'deny'
    },
    context: {
      functionName: name,
      runtime: 'skyenet-functions-v0',
      bundleId: loaded.manifest.bundle_id || null,
      tenantId: loaded.manifest.tenant_id || null,
      requestId: crypto.randomUUID?.() || `${Date.now()}`
    }
  }));

  const exit = await new Promise((resolve) => child.on('close', (code, signal) => resolve({ code, signal })));
  clearTimeout(timer);
  if (exit.signal || exit.code !== 0) {
    const timedOut = exit.signal === 'SIGKILL';
    return new Response(JSON.stringify({
      ok: false,
      error: timedOut ? 'Function timed out' : 'Function failed',
      signal: exit.signal,
      stderr: Buffer.concat(stderr).toString('utf8').slice(0, 2000)
    }), {
      status: timedOut ? 504 : 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const result = JSON.parse(Buffer.concat(stdout).toString('utf8') || '{}');
  const headers = mergeResponseHeaders(result);
  if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8');
  const body = result.isBase64Encoded ? Buffer.from(result.body || '', 'base64') : result.body || '';
  return new Response(body, { status: result.statusCode || 200, headers });
}

function functionNameForPath(pathname) {
  for (const prefix of ['/.netlify/functions/', '/.skyenet/functions/']) {
    if (pathname.startsWith(prefix)) return pathname.slice(prefix.length).split('/')[0];
  }
  return '';
}

export function createServer({ bundleDir, timeoutMs = 10000, maxBodyBytes = 1048576, signingKey = process.env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || '', requireSignature = false, runtimeToken = process.env.SKYENET_FUNCTION_RUNTIME_TOKEN || '', envGrants = {}, egress = 'deny' }) {
  return http.createServer(async (incoming, outgoing) => {
    try {
      if (runtimeToken && incoming.headers['x-skyenet-runtime-token'] !== runtimeToken) {
        outgoing.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
        outgoing.end(JSON.stringify({ ok: false, error: 'SkyeNet runtime token required' }));
        return;
      }
      const url = new URL(incoming.url || '/', `http://${incoming.headers.host || '127.0.0.1'}`);
      const name = functionNameForPath(url.pathname);
      if (!name) {
        outgoing.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
        outgoing.end(JSON.stringify({ ok: false, error: 'SkyeNet function route not found' }));
        return;
      }
      const request = new Request(url, {
        method: incoming.method,
        headers: incoming.headers,
        body: ['GET', 'HEAD'].includes(incoming.method || 'GET') ? undefined : incoming,
        duplex: 'half'
      });
      const response = await invokeFunction({ bundleDir, name, request, timeoutMs, maxBodyBytes, signingKey, requireSignature, envGrants, egress });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      const body = await response.arrayBuffer();
      outgoing.end(Buffer.from(body));
    } catch (error) {
      outgoing.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      outgoing.end(JSON.stringify({ ok: false, error: error.message || 'SkyeNet runtime error' }));
    }
  });
}

function parseArgs(argv) {
  let bundleDir = '';
  let port = 8789;
  let timeoutMs = 10000;
  let maxBodyBytes = 1048576;
  let requireSignature = false;
  let egress = 'deny';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--bundle') bundleDir = argv[index + 1] || bundleDir;
    if (argv[index] === '--port') port = Number(argv[index + 1] || port);
    if (argv[index] === '--timeout-ms') timeoutMs = Number(argv[index + 1] || timeoutMs);
    if (argv[index] === '--max-body-bytes') maxBodyBytes = Number(argv[index + 1] || maxBodyBytes);
    if (argv[index] === '--require-signature') requireSignature = true;
    if (argv[index] === '--egress') egress = argv[index + 1] || egress;
  }
  return { bundleDir, port, timeoutMs, maxBodyBytes, requireSignature, egress };
}

if (process.argv[2] === 'run-child') {
  runChild().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const { bundleDir, port, timeoutMs, maxBodyBytes, requireSignature, egress } = parseArgs(process.argv.slice(2));
  if (!bundleDir) {
    console.error('Usage: node tools/skyenet-functions-runtime.mjs --bundle <bundle-dir> [--port 8789]');
    process.exit(1);
  }
  const server = createServer({ bundleDir, timeoutMs, maxBodyBytes, requireSignature, egress });
  server.listen(port, '127.0.0.1', () => {
    console.log(`SkyeNet Functions runtime listening on http://127.0.0.1:${port}`);
  });
}
