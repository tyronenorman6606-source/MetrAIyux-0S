#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWebCreatorAurenReply } from '../../../cloudflare/webcreator-auren-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..', '..', '..');
const STORE_PATH = path.join(ROOT, 'runtime', 'store.json');

function loadRepoEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      if (!key || process.env[key]) continue;
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // Optional in deployed environments.
  }
  if (process.env.OPENAI_API_KEY && !process.env.VANTA_ALLOW_LIVE_AI && !process.env.VANTA_DISABLE_LIVE_AI) {
    process.env.VANTA_ALLOW_LIVE_AI = '1';
  }
}

function aiAvailability() {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const allow = String(process.env.VANTA_ALLOW_LIVE_AI ?? '0') === '1';
  const disable = String(process.env.VANTA_DISABLE_LIVE_AI ?? '0') === '1';
  return {
    configured: hasApiKey,
    liveAvailable: hasApiKey && allow && !disable,
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  };
}

loadRepoEnv();
const PORT = Number(process.env.PORT || 4396);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.toml': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function createDefaultStore() {
  return {
    deliveryPacks: [],
    audit: [],
  };
}

function normalizeDispatch(dispatch = {}, pack = {}) {
  const status = dispatch.status || 'queued';
  return {
    status,
    owner: dispatch.owner || '',
    checkpoint: dispatch.checkpoint || '',
    notes: dispatch.notes || '',
    targets: Array.isArray(dispatch.targets) && dispatch.targets.length ? dispatch.targets : inferTargets(pack),
    updatedAt: dispatch.updatedAt || new Date().toISOString(),
  };
}

function normalizeExecution(execution = {}, pack = {}) {
  const status = execution.status || 'queued';
  return {
    status,
    owner: execution.owner || '',
    checkpoint: execution.checkpoint || '',
    notes: execution.notes || '',
    targets: Array.isArray(execution.targets) && execution.targets.length ? execution.targets : inferTargets(pack),
    updatedAt: execution.updatedAt || new Date().toISOString(),
  };
}

async function ensureStore() {
  await fsp.mkdir(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    await fsp.writeFile(STORE_PATH, JSON.stringify(createDefaultStore(), null, 2));
  }
}

async function readStore() {
  await ensureStore();
  try {
    return JSON.parse(await fsp.readFile(STORE_PATH, 'utf8'));
  } catch {
    const fresh = createDefaultStore();
    await fsp.writeFile(STORE_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

async function writeStore(store) {
  await ensureStore();
  await fsp.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function json(res, code, payload) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function inferTargets(pack) {
  const targets = new Set(pack.targets || []);
  const snapshot = JSON.stringify(pack.sourceSnapshot || {}).toLowerCase();
  const brief = `${pack.projectName || ''} ${pack.label || ''} ${pack.notes || ''}`.toLowerCase();
  if (snapshot.includes('contact') || brief.includes('lead')) targets.add('SkyeLeadVault');
  if (snapshot.includes('pricing') || brief.includes('activation')) targets.add('AE-FlowPro');
  if (snapshot.includes('proof') || brief.includes('audit')) targets.add('SkyeProofx');
  if (snapshot.includes('book') || snapshot.includes('team') || brief.includes('workforce')) targets.add('skyeroutex-workforce-command-v0.4.0');
  if (!targets.size) targets.add('AE-FlowPro');
  return [...targets];
}

function buildSummary(pack) {
  const files = Object.keys(pack.sourceSnapshot || {});
  return {
    fileCount: files.length,
    hasReadme: files.includes('README.md'),
    hasStyles: files.includes('styles.css'),
    hasScript: files.includes('app.js'),
    hasMarkup: files.includes('index.html'),
  };
}

function normalizeReview(review = {}) {
  const status = review.status || 'draft';
  return {
    status,
    owner: review.owner || '',
    checkpoint: review.checkpoint || '',
    notes: review.notes || '',
    updatedAt: new Date().toISOString(),
  };
}

function boardSummary(packs) {
  return packs.reduce((acc, pack) => {
    const key = pack.review?.status || 'draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { draft: 0, ready: 0, approved: 0, blocked: 0, dispatched: 0 });
}

function executionSummary(packs) {
  return packs.reduce((acc, pack) => {
    const key = pack.execution?.status || 'queued';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { queued: 0, active: 0, fulfilled: 0, blocked: 0 });
}

function dispatchSummary(packs) {
  return packs.reduce((acc, pack) => {
    const key = pack.dispatch?.status || 'queued';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { queued: 0, active: 0, delivered: 0, blocked: 0 });
}

function workflowTimeline(audit = []) {
  const summary = { archive: 0, review: 0, execution: 0, dispatch: 0 };
  const items = audit.map((entry) => {
    if (entry.type === 'delivery_pack_created') summary.archive += 1;
    else if (entry.type === 'delivery_pack_execution_updated') summary.execution += 1;
    else if (entry.type === 'delivery_pack_dispatched') summary.dispatch += 1;
    else summary.review += 1;
    return {
      id: entry.id || '',
      type: entry.type || '',
      createdAt: entry.createdAt || '',
      owner: entry.owner || '',
      status: entry.status || '',
      checkpoint: entry.checkpoint || '',
      notes: entry.notes || '',
      targets: Array.isArray(entry.targets) ? entry.targets : [],
    };
  });
  return { summary, items };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  const store = await readStore();

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, service: 'SkyeWebCreatorMax local runtime', ai: aiAvailability() });
  }
  if (req.method === 'GET' && url.pathname === '/api/runtime/status') {
    return json(res, 200, {
      ok: true,
      product: 'SkyeWebCreatorMax',
      deliveryPacks: store.deliveryPacks.length,
      reviewBoard: boardSummary(store.deliveryPacks),
      executionBoard: executionSummary(store.deliveryPacks),
      dispatchBoard: dispatchSummary(store.deliveryPacks),
      workflowTimeline: workflowTimeline(store.audit).summary,
      ai: aiAvailability(),
      storePath: path.relative(ROOT, STORE_PATH),
    });
  }
  if (req.method === 'POST' && url.pathname === '/api/runtime/auren') {
    const body = await readBody(req);
    const reply = await generateWebCreatorAurenReply({
      message: body.message || '',
      room: body.room || 'builder',
      allowLiveAi: body.allowLiveAi === true,
      brief: body.brief || {},
      runtime: body.runtime || {
        ok: true,
        deliveryPacks: store.deliveryPacks.length,
        reviewBoard: boardSummary(store.deliveryPacks),
        executionBoard: executionSummary(store.deliveryPacks),
        dispatchBoard: dispatchSummary(store.deliveryPacks),
      },
      env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        OPENAI_MODEL: process.env.OPENAI_MODEL,
        VANTA_ALLOW_LIVE_AI: process.env.VANTA_ALLOW_LIVE_AI,
        VANTA_DISABLE_LIVE_AI: process.env.VANTA_DISABLE_LIVE_AI,
      },
    });
    return json(res, 200, reply);
  }
  if (req.method === 'GET' && url.pathname === '/api/runtime/delivery-board') {
    return json(res, 200, {
      ok: true,
      summary: boardSummary(store.deliveryPacks),
      executionSummary: executionSummary(store.deliveryPacks),
      dispatchSummary: dispatchSummary(store.deliveryPacks),
      items: store.deliveryPacks.map((pack) => ({
        id: pack.id,
        label: pack.label,
        projectName: pack.projectName,
        target: pack.target,
        createdAt: pack.createdAt,
        review: pack.review,
        execution: pack.execution,
        dispatch: pack.dispatch,
      })),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/runtime/execution-board') {
    return json(res, 200, {
      ok: true,
      summary: executionSummary(store.deliveryPacks),
      items: store.deliveryPacks
        .filter((pack) => pack.execution)
        .map((pack) => ({
          id: pack.id,
          label: pack.label,
          projectName: pack.projectName,
          target: pack.target,
          createdAt: pack.createdAt,
          review: pack.review,
          execution: pack.execution,
          dispatch: pack.dispatch,
        })),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/runtime/dispatch-board') {
    return json(res, 200, {
      ok: true,
      summary: dispatchSummary(store.deliveryPacks),
      items: store.deliveryPacks
        .filter((pack) => pack.dispatch)
        .map((pack) => ({
          id: pack.id,
          label: pack.label,
          projectName: pack.projectName,
          target: pack.target,
          createdAt: pack.createdAt,
          review: pack.review,
          execution: pack.execution,
          dispatch: pack.dispatch,
        })),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/runtime/workflow-timeline') {
    return json(res, 200, {
      ok: true,
      workflowTimeline: workflowTimeline(store.audit),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/runtime/delivery-packs') {
    return json(res, 200, { ok: true, items: store.deliveryPacks });
  }
  if (req.method === 'POST' && url.pathname === '/api/runtime/delivery-packs') {
    const body = await readBody(req);
    const pack = {
      id: `delivery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: body.projectId || '',
      projectName: body.projectName || 'Unnamed Project',
      label: body.label || body.projectName || 'Website delivery pack',
      target: body.target || 'ae-commandhub',
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      sourceSnapshot: body.sourceSnapshot || {},
      recommendedActions: body.recommendedActions || ['review package', 'route to downstream lane'],
      targets: inferTargets(body),
      summary: buildSummary(body),
      review: normalizeReview(body.review),
      execution: normalizeExecution(body.execution, body),
      dispatch: body.dispatch ? normalizeDispatch(body.dispatch, body) : null,
    };
    store.deliveryPacks.unshift(pack);
    store.audit.unshift({
      type: 'delivery_pack_created',
      id: pack.id,
      createdAt: pack.createdAt,
      owner: pack.review?.owner || '',
      status: pack.review?.status || '',
      checkpoint: pack.review?.checkpoint || '',
      notes: pack.notes || '',
      targets: pack.targets || [],
    });
    await writeStore(store);
    return json(res, 201, { ok: true, item: pack });
  }
  const detailMatch = url.pathname.match(/^\/api\/runtime\/delivery-packs\/([^/]+)$/);
  if (req.method === 'GET' && detailMatch) {
    const pack = store.deliveryPacks.find((item) => item.id === detailMatch[1]);
    return pack ? json(res, 200, { ok: true, item: pack }) : json(res, 404, { ok: false, error: 'not_found' });
  }
  const reviewMatch = url.pathname.match(/^\/api\/runtime\/delivery-packs\/([^/]+)\/review$/);
  if (req.method === 'POST' && reviewMatch) {
    const body = await readBody(req);
    const pack = store.deliveryPacks.find((item) => item.id === reviewMatch[1]);
    if (!pack) return json(res, 404, { ok: false, error: 'not_found' });
    pack.review = normalizeReview(body);
    store.audit.unshift({
      type: pack.review.status === 'dispatched' ? 'delivery_pack_dispatched' : 'delivery_pack_reviewed',
      id: pack.id,
      createdAt: pack.review.updatedAt,
      owner: pack.review.owner || '',
      status: pack.review.status || '',
      checkpoint: pack.review.checkpoint || '',
      notes: pack.review.notes || '',
      targets: pack.targets || [],
    });
    await writeStore(store);
    return json(res, 200, { ok: true, item: pack, summary: boardSummary(store.deliveryPacks) });
  }
  const executionMatch = url.pathname.match(/^\/api\/runtime\/delivery-packs\/([^/]+)\/execution$/);
  if (req.method === 'POST' && executionMatch) {
    const body = await readBody(req);
    const pack = store.deliveryPacks.find((item) => item.id === executionMatch[1]);
    if (!pack) return json(res, 404, { ok: false, error: 'not_found' });
    pack.execution = normalizeExecution({
      ...pack.execution,
      ...body,
      updatedAt: new Date().toISOString(),
    }, pack);
    store.audit.unshift({
      type: 'delivery_pack_execution_updated',
      id: pack.id,
      createdAt: pack.execution.updatedAt,
      owner: pack.execution.owner || '',
      status: pack.execution.status || '',
      checkpoint: pack.execution.checkpoint || '',
      notes: pack.execution.notes || '',
      targets: pack.execution.targets || [],
    });
    await writeStore(store);
    return json(res, 200, { ok: true, item: pack, summary: executionSummary(store.deliveryPacks) });
  }
  const dispatchMatch = url.pathname.match(/^\/api\/runtime\/delivery-packs\/([^/]+)\/dispatch$/);
  if (req.method === 'POST' && dispatchMatch) {
    const body = await readBody(req);
    const pack = store.deliveryPacks.find((item) => item.id === dispatchMatch[1]);
    if (!pack) return json(res, 404, { ok: false, error: 'not_found' });
    pack.dispatch = normalizeDispatch({
      ...pack.dispatch,
      ...body,
      updatedAt: new Date().toISOString(),
    }, pack);
    pack.review = normalizeReview({
      ...pack.review,
      status: pack.dispatch.status === 'delivered' ? 'dispatched' : pack.review?.status || 'approved',
      updatedAt: pack.dispatch.updatedAt,
    });
    pack.execution = normalizeExecution({
      ...pack.execution,
      status: pack.dispatch.status === 'delivered' ? 'fulfilled' : pack.execution?.status || 'active',
      updatedAt: pack.dispatch.updatedAt,
    }, pack);
    store.audit.unshift({
      type: 'delivery_pack_dispatched',
      id: pack.id,
      createdAt: pack.dispatch.updatedAt,
      owner: pack.dispatch.owner || '',
      status: pack.dispatch.status || '',
      checkpoint: pack.dispatch.checkpoint || '',
      notes: pack.dispatch.notes || '',
      targets: pack.dispatch.targets || [],
    });
    await writeStore(store);
    return json(res, 200, { ok: true, item: pack, summary: dispatchSummary(store.deliveryPacks) });
  }
  return false;
}

async function serveStatic(req, res, url) {
  const relative = url.pathname === '/' ? '/index.html' : url.pathname;
  const resolved = path.resolve(ROOT, `.${relative}`);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(ROOT, 'index.html');
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

await ensureStore();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  try {
    const handled = await handleApi(req, res, url);
    if (handled !== false) return;
    await serveStatic(req, res, url);
  } catch (error) {
    json(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(JSON.stringify({ ok: true, port: PORT, root: ROOT }));
});
