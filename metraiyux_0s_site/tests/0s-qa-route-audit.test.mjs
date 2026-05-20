import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import siteWorker from '../cloudflare/worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const ARTIFACT_DIR = path.join(REPO_ROOT, 'test-artifacts', '0s-qa-route-audit');
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const PUBLIC_RECEIPT_PATH = path.join(SITE_ROOT, 'proof', '0s-runtime-truth-route-audit-2026-05-19.json');
const ARTIFACT_RECEIPT_PATH = path.join(ARTIFACT_DIR, 'route-audit-2026-05-19.json');

const SHELLS = [
  ['home-shell', '/index.html'],
  ['launcher', '/0s/index.html'],
  ['admin-os', '/admin/index.html'],
  ['site-operator-api', '/operator/index.html'],
  ['saas-skyemerit', '/saas/index.html'],
  ['saas-skyemerit', '/saas/skyemerit.html'],
  ['sovereigndocs', '/Free99/apps/sovereigndocs/index.html'],
  ['sovereigndocs', '/Free99/apps/sovereigndocs/closure-dashboard/index.html'],
  ['kaixu-codestudio', '/Free99/apps/kaixu-codestudio/index.html'],
  ['skymusicnexus', '/SkyeMusicNexus/index.html'],
  ['skyemediacenter', '/SkyeMediaCenter/index.html'],
  ['skyeprofitconsole', '/SkyeProfitConsole/index.html'],
  ['skyeroutex', '/SkyeRouteX/index.html'],
  ['houseoperations', '/HouseOperations/index.html'],
  ['skyesplitengine', '/SkyeSplitEngine/index.html'],
  ['marketing-made-easy', '/Marketing-Made-Easy/index.html'],
  ['connectlog-relay13', '/connectlog-v7.7-relay13-operator-proof/app.html'],
  ['connectlog-relay13', '/relay13-core-v1.7-connectlog-operator-proof/public/index.html'],
  ['valley-verified', '/valley-verified/index.html'],
  ['northstar', '/northstar/index.html'],
  ['blog-proof-docs', '/blog/index.html']
];

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(String(key), String(value)); }
  async get(key, options) {
    const value = this.map.get(String(key));
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async delete(key) { this.map.delete(String(key)); }
  async list({ limit = 1000 } = {}) {
    return { keys: [...this.map.keys()].slice(0, limit).map((name) => ({ name })) };
  }
}

class MemoryQueue {
  constructor() { this.messages = []; }
  async send(body) { this.messages.push(body); }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.txt': 'text/plain; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function safeAssetPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const relative = normalized.replace(/^[/\\]+/, '') || 'index.html';
  return path.join(SITE_ROOT, relative);
}

async function assetResponse(request) {
  const url = new URL(request.url);
  let filePath = safeAssetPath(url.pathname);
  if (!filePath.startsWith(SITE_ROOT)) return new Response('not found', { status: 404 });
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    const body = await readFile(filePath);
    return new Response(body, { status: 200, headers: { 'content-type': contentType(filePath) } });
  } catch (_err) {
    return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

function workerEnv() {
  const sharedKv = new MemoryKV();
  return {
    ASSETS: { fetch: assetResponse },
    SITE_EVENTS_KV: sharedKv,
    SITE_TASK_QUEUE: new MemoryQueue(),
    ADMIN_KV: new MemoryKV(),
    SAAS_KV: new MemoryKV(),
    SOVEREIGNDOCS_KV: new MemoryKV(),
    SKYEROUTEX_KV: new MemoryKV(),
    SKYMUSICNEXUS_KV: new MemoryKV(),
    MEDIA_KV: new MemoryKV(),
    PROFIT_KV: new MemoryKV(),
    HOUSEOPS_KV: new MemoryKV()
  };
}

function ctx() {
  return { waitUntil() {} };
}

async function toFetchRequest(nodeRequest) {
  const chunks = [];
  for await (const chunk of nodeRequest) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${nodeRequest.headers.host}${nodeRequest.url}`, {
    method: nodeRequest.method,
    headers: nodeRequest.headers,
    body: nodeRequest.method === 'GET' || nodeRequest.method === 'HEAD' ? undefined : body
  });
}

async function writeNodeResponse(nodeResponse, workerResponse, method) {
  nodeResponse.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers.entries()));
  if (method === 'HEAD') {
    nodeResponse.end();
    return;
  }
  nodeResponse.end(Buffer.from(await workerResponse.arrayBuffer()));
}

async function startWorkerServer() {
  const env = workerEnv();
  const server = createServer(async (nodeRequest, nodeResponse) => {
    try {
      const request = await toFetchRequest(nodeRequest);
      const response = await siteWorker.fetch(request, env, ctx());
      await writeNodeResponse(nodeResponse, response, nodeRequest.method);
    } catch (error) {
      nodeResponse.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      nodeResponse.end(error?.stack || String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))
  };
}

function slug(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function healthEndpoint(record) {
  if (record?.healthPath) return record.healthPath;
  if (record?.apiBase) return `${String(record.apiBase).replace(/\/$/, '')}/health`;
  return null;
}

function authMode(record) {
  const tags = new Set(record?.statusTags || []);
  if (tags.has('GATED')) return 'gate/session required';
  if (tags.has('LOCAL')) return 'local device only';
  if (tags.has('STATIC') || tags.has('PROOF_ONLY')) return 'no workflow auth';
  return 'public read, protected writes';
}

function storageMode(record) {
  const tags = new Set(record?.statusTags || []);
  if (tags.has('LOCAL')) return 'browser-local/exportable';
  if (tags.has('STATIC') || tags.has('PROOF_ONLY')) return 'static proof/data';
  if (record?.apiBase) return 'worker/kv/provider path';
  return 'no shared backend storage';
}

async function loadRegistry() {
  const registry = JSON.parse(await readFile(path.join(SITE_ROOT, 'audits', '0S_SURFACE_STATUS.json'), 'utf8'));
  return new Map(registry.surfaces.map((surface) => [surface.id, surface]));
}

async function auditViewport(browser, baseUrl, surfaceId, route, viewportName, viewport) {
  const page = await browser.newPage({ viewport });
  const api404s = [];
  const pageErrors = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl && url.pathname.startsWith('/api/') && response.status() === 404) {
      api404s.push({ surfaceId, route, viewport: viewportName, path: url.pathname, status: 404 });
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.ok(response, `${route} did not return a response`);
  assert.equal(response.status() < 400, true, `${route} returned ${response.status()}`);
  await page.locator('[data-os-runtime-truth]').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(450);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const screenshot = path.join(SCREENSHOT_DIR, `${slug(surfaceId)}-${slug(route)}-${viewportName}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  assert.deepEqual(pageErrors, [], `${route} ${viewportName} emitted page errors`);

  return {
    responseStatus: response.status(),
    screenshot,
    api404s,
    pageErrors,
    horizontalOverflowPx: overflow
  };
}

test('QA-01/QA-04/QA-05 route audit opens major shells with screenshots and no unexpected API 404s', async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const registry = await loadRegistry();
  const server = await startWorkerServer();
  const browser = await chromium.launch({ headless: true, chromiumSandbox: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const entries = [];
  const allApi404s = [];

  try {
    for (const [surfaceId, route] of SHELLS) {
      const record = registry.get(surfaceId);
      assert.ok(record, `${surfaceId} missing from registry`);
      const desktop = await auditViewport(browser, server.baseUrl, surfaceId, route, 'desktop-1440x1000', { width: 1440, height: 1000 });
      const mobile = await auditViewport(browser, server.baseUrl, surfaceId, route, 'mobile-390x844', { width: 390, height: 844 });
      allApi404s.push(...desktop.api404s, ...mobile.api404s);
      entries.push({
        surfaceId,
        route,
        endpoint: healthEndpoint(record),
        authMode: authMode(record),
        storageMode: storageMode(record),
        statusTags: record.statusTags,
        runtimeBadge: record.runtimeBadge,
        result: 'passed',
        desktop,
        mobile
      });
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const receipt = {
    schema: 'metraiyux-0s-qa-route-audit.v1',
    date: '2026-05-19',
    generatedAt: new Date().toISOString(),
    checks: ['QA-01', 'QA-04', 'QA-05'],
    routeCount: SHELLS.length,
    screenshotCount: entries.length * 2,
    unexpectedApi404s: allApi404s,
    surfaces: entries
  };
  await writeFile(ARTIFACT_RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  await writeFile(PUBLIC_RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);

  assert.deepEqual(allApi404s, []);
  for (const entry of entries) {
    assert.equal(entry.desktop.horizontalOverflowPx <= 2, true, `${entry.route} desktop horizontal overflow`);
    assert.equal(entry.mobile.horizontalOverflowPx <= 2, true, `${entry.route} mobile horizontal overflow`);
  }
});
