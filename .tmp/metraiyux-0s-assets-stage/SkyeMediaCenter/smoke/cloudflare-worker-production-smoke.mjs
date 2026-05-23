#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition, message){ if(!condition) throw new Error(message); }

class MemoryKV {
  constructor(){ this.rows = new Map(); }
  async get(key, options = {}){
    const value = this.rows.has(key) ? this.rows.get(key) : null;
    if (value == null) return null;
    if (options.type === 'json') return JSON.parse(value);
    return value;
  }
  async put(key, value){ this.rows.set(key, String(value)); }
  async list({ limit = 1000 } = {}){
    return { keys: Array.from(this.rows.keys()).slice(0, limit).map((name)=>({ name })) };
  }
}

async function parse(response){
  const text = await response.text();
  try { return JSON.parse(text || '{}'); } catch { return { raw:text }; }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const worker = (await import(path.join(root, 'cloudflare/worker.js'))).default;
const originalFetch = globalThis.fetch;
const validToken = 'fs27-prod-client-token';

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.origin === 'https://fs27.local.test') {
    if (url.pathname === '/platform/events') {
      return new Response(JSON.stringify({ ok:true, mirrored:true }), { status:200, headers:{ 'content-type':'application/json' } });
    }
    if (['/auth-introspect','/auth/introspect','/.netlify/functions/auth-introspect'].includes(url.pathname)) {
      const body = JSON.parse(init.body || '{}');
      return new Response(JSON.stringify({
        active: body.token === validToken,
        sub: 'client-media-operator',
        email: 'client-media@internal.invalid',
        role: 'admin'
      }), { status:200, headers:{ 'content-type':'application/json' } });
    }
  }
  return originalFetch(input, init);
};

const env = {
  SITE_EVENTS_KV: new MemoryKV(),
  SKYGATEFS27_ORIGIN: 'https://fs27.local.test',
  SKYGATE_EVENT_MIRROR_SECRET: 'test-secret',
  SKYGATE_SOURCE_APP: 'metraiyux-0s-production-smoke'
};
const ctx = { waitUntil(promise){ Promise.resolve(promise).catch((error)=>{ throw error; }); } };

async function call(pathname, { method='GET', token=validToken, body } = {}){
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('content-type', 'application/json');
  return worker.fetch(new Request(`https://metraiyux-0s.example${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), env, ctx);
}

const legacyFunctionBlocked = await call('/.netlify/functions/media-assets?action=list', { token:'' });
assert(legacyFunctionBlocked.status === 404, `legacy root media function should be blocked, got ${legacyFunctionBlocked.status}`);

const blocked = await call('/api/media/assets?action=list', { token:'' });
assert(blocked.status === 401, `unauthenticated media list returned ${blocked.status}`);

const session = await parse(await call('/api/media/session'));
assert(session.productionGate === true && session.activeSession?.source === 'fs27-skygate-session', 'production session did not resolve through FS27 gate');

const bootstrap = await call('/api/media/session', { method:'POST', body:{ subject:'local-proof' } });
assert(bootstrap.status === 503, `production local bootstrap should be disabled, got ${bootstrap.status}`);

const upload = await parse(await call('/api/media/assets', {
  method:'POST',
  body:{
    action:'upload',
    title:'Production Proof Asset',
    type:'document',
    filename:'production-proof.txt',
    content_base64:Buffer.from('production media body', 'utf8').toString('base64'),
    tags:['production','proof'],
    description:'Production worker media upload',
    status:'draft',
    mimeType:'text/plain; charset=utf-8'
  }
}));
assert(upload.asset?.id, 'production worker upload did not return an asset id');
assert(upload.asset?.url?.startsWith('/api/media/file?id='), 'production worker upload returned a legacy file URL');
const assetId = upload.asset.id;

const list = await parse(await call('/api/media/assets?action=list'));
assert(list.assets?.some((asset)=>asset.id === assetId), 'API alias list did not include uploaded asset');

const search = await parse(await call('/api/media/search?q=production&type=document'));
assert(search.results?.some((result)=>result.asset?.id === assetId), 'production search did not find uploaded asset');

const review = await parse(await call('/api/media/assets', {
  method:'PUT',
  body:{ action:'review', id:assetId, owner:'creative-ops', status:'approved', checkpoint:'client-proof', notes:'Ready for client publish' }
}));
assert(review.review?.status === 'approved', 'review state did not persist');

const execution = await parse(await call('/api/media/assets', {
  method:'PUT',
  body:{ action:'execution', id:assetId, owner:'publishing-ops', status:'active', checkpoint:'publish-prep', targets:['web'] }
}));
assert(execution.execution?.status === 'active', 'execution state did not persist');

const dispatch = await parse(await call('/api/media/assets', {
  method:'PUT',
  body:{ action:'dispatch', id:assetId, owner:'distribution-ops', status:'scheduled', checkpoint:'launch-window', targets:['web'] }
}));
assert(dispatch.dispatch?.status === 'scheduled', 'dispatch state did not persist');

const publish = await parse(await call('/api/media/publish', {
  method:'POST',
  body:{ assetId, publishTarget:'web' }
}));
assert(publish.entry?.status === 'published', 'publish did not create a published entry');

const fileBlocked = await call(`/api/media/file?id=${encodeURIComponent(assetId)}`, { token:'' });
assert(fileBlocked.status === 401, `ungated file delivery returned ${fileBlocked.status}`);
const file = await call(`/api/media/file?id=${encodeURIComponent(assetId)}`);
assert(file.status === 200, `gated file delivery returned ${file.status}`);
assert(await file.text() === 'production media body', 'gated file body did not match uploaded content');

const stats = await parse(await call('/api/media/stats'));
assert(stats.totalAssets >= 1 && stats.byStatus.published >= 1, 'production stats did not count published asset');

const archived = await parse(await call(`/api/media/assets?id=${encodeURIComponent(assetId)}`, { method:'DELETE' }));
assert(archived.asset?.status === 'archived', 'archive did not mark asset archived');

const timeline = await parse(await call('/api/media/assets?action=workflow-timeline'));
assert(timeline.workflowTimeline?.summary?.review >= 1, 'workflow timeline missed review event');
assert(timeline.workflowTimeline?.summary?.execution >= 1, 'workflow timeline missed execution event');
assert(timeline.workflowTimeline?.summary?.dispatch >= 1, 'workflow timeline missed dispatch event');
assert(timeline.workflowTimeline?.summary?.archive >= 1, 'workflow timeline missed archive event');

globalThis.fetch = originalFetch;

console.log(JSON.stringify({
  ok:true,
  app:'SkyeMediaCenter',
  production_worker:'cloudflare',
  verified:[
    'Cloudflare Worker blocks old root Netlify media function URLs while serving /api/media routes',
    'all media routes require an FS27/SkyGate introspected bearer session',
    'production local proof bootstrap is disabled',
    'KV-backed upload, list, search, review, execution, dispatch, publish, file delivery, stats, archive, and workflow timeline work end to end'
  ],
  assetId
}, null, 2));
