import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async list({limit = 1000} = {}) {
    return {keys:[...this.map.keys()].slice(0, limit).map(name => ({name}))};
  }
}

function ctx() {
  return {waitUntil() {}};
}

function gateWorker({active = true, role = 'admin'} = {}) {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: active && body.token === 'media-token',
        sub: 'media-operator',
        email: 'media-operator@example.invalid',
        role
      });
    }
  };
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status:404});
      }
    },
    SKYE_MEDIA_CENTER_KV: new MemoryKV(),
    SKYGATEFS27_WORKER: gateWorker(),
    ...overrides
  };
}

function req(path, {method = 'GET', body, token} = {}) {
  const headers = body ? {'content-type':'application/json'} : {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return {response, body};
}

test('MEDIA-01 keeps SkyeMediaCenter as the gated Free99 API model', async () => {
  const e = env();

  const health = await call(e, '/api/media/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.app_id, 'media');
  assert.equal(health.body.status, 'LIVE/GATED');
  assert.equal(health.body.mounted, true);
  assert.equal(health.body.target_base, '/api/media');

  const blocked = await call(e, '/api/media/assets?action=list');
  assert.equal(blocked.response.status, 401);
  assert.equal(blocked.body.free99, true);
  assert.equal(blocked.body.gateSessionRequired, true);

  const session = await call(e, '/api/media/session', {token:'media-token'});
  assert.equal(session.response.status, 200);
  assert.equal(session.body.productionGate, true);
  assert.equal(session.body.free99, true);
  assert.equal(session.body.activeSession.source, 'fs27-skygate-session');
  assert.equal(session.body.activeSession.role, 'admin');

  const localBootstrap = await call(e, '/api/media/session', {
    method:'POST',
    body:{subject:'local-proof'}
  });
  assert.equal(localBootstrap.response.status, 503);
  assert.equal(localBootstrap.body.productionGate, true);
});

test('MEDIA-02 blocks legacy Netlify media function URLs while /api/media remains live', async () => {
  const e = env();
  for (const path of [
    '/SkyeMediaCenter/netlify/functions/media-assets.js',
    '/SkyeMediaCenter/scripts/deploy.mjs',
    '/.netlify/functions/media-assets'
  ]) {
    const response = await siteWorker.fetch(req(path), e, ctx());
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }

  const live = await call(e, '/api/media/assets?action=list', {token:'media-token'});
  assert.equal(live.response.status, 200);
  assert.equal(live.body.ok, true);
  assert.deepEqual(live.body.assets, []);
});

test('MEDIA-03 proves authenticated media upload, boards, publish, stats, and file delivery', async () => {
  const e = env();
  const token = 'media-token';
  const content = 'media proof body';

  const uploaded = await call(e, '/api/media/assets', {
    method:'POST',
    token,
    body:{
      action:'upload',
      title:'Closure Proof Asset',
      type:'document',
      filename:'closure-proof.txt',
      content_base64:Buffer.from(content, 'utf8').toString('base64'),
      tags:['proof','closure','launch'],
      description:'MEDIA-03 closure proof upload',
      status:'draft',
      mimeType:'text/plain; charset=utf-8'
    }
  });
  assert.equal(uploaded.response.status, 201);
  assert.match(uploaded.body.asset.url, /^\/api\/media\/file\?id=/);
  const assetId = uploaded.body.asset.id;

  const list = await call(e, '/api/media/assets?action=list', {token});
  assert.equal(list.body.assets.some(asset => asset.id === assetId), true);

  const search = await call(e, '/api/media/search?q=closure&type=document', {token});
  assert.equal(search.body.results.some(result => result.asset.id === assetId), true);

  const review = await call(e, '/api/media/assets', {
    method:'PUT',
    token,
    body:{action:'review', id:assetId, owner:'creative-ops', status:'approved', checkpoint:'client-proof', notes:'Ready for execution'}
  });
  assert.equal(review.response.status, 200);
  assert.equal(review.body.review.status, 'approved');
  const reviewBoard = await call(e, '/api/media/assets?action=review-board', {token});
  assert.equal(reviewBoard.body.counts.approved >= 1, true);

  const execution = await call(e, '/api/media/assets', {
    method:'PUT',
    token,
    body:{action:'execution', id:assetId, owner:'publishing-ops', status:'active', checkpoint:'publish-prep', targets:['SkyeWebCreatorMax','SkyeProofx']}
  });
  assert.equal(execution.response.status, 200);
  assert.equal(execution.body.execution.status, 'active');
  const executionBoard = await call(e, '/api/media/assets?action=execution-board', {token});
  assert.equal(executionBoard.body.counts.active >= 1, true);

  const dispatch = await call(e, '/api/media/assets', {
    method:'PUT',
    token,
    body:{action:'dispatch', id:assetId, owner:'distribution-ops', status:'scheduled', checkpoint:'launch-window', targets:['web','social']}
  });
  assert.equal(dispatch.response.status, 200);
  assert.equal(dispatch.body.dispatch.status, 'scheduled');
  const dispatchBoard = await call(e, '/api/media/assets?action=dispatch-board', {token});
  assert.equal(dispatchBoard.body.counts.scheduled >= 1, true);

  const publish = await call(e, '/api/media/publish', {
    method:'POST',
    token,
    body:{assetId, publishTarget:'web'}
  });
  assert.equal(publish.response.status, 200);
  assert.equal(publish.body.entry.status, 'published');
  assert.equal(publish.body.asset.status, 'published');
  assert.equal(publish.body.asset.dispatch.status, 'published');

  const queue = await call(e, '/api/media/publish?status=published', {token});
  assert.equal(queue.body.entries.some(entry => entry.assetId === assetId), true);

  const fileBlocked = await siteWorker.fetch(req(`/api/media/file?id=${encodeURIComponent(assetId)}`), e, ctx());
  assert.equal(fileBlocked.status, 401);

  const file = await siteWorker.fetch(req(`/api/media/file?id=${encodeURIComponent(assetId)}`, {token}), e, ctx());
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await file.text(), content);

  const stats = await call(e, '/api/media/stats', {token});
  assert.equal(stats.body.totalAssets, 1);
  assert.equal(stats.body.byStatus.published, 1);
  assert.equal(stats.body.totalFileSize, Buffer.byteLength(content));

  const timeline = await call(e, '/api/media/assets?action=workflow-timeline', {token});
  assert.equal(timeline.body.workflowTimeline.summary.review >= 1, true);
  assert.equal(timeline.body.workflowTimeline.summary.execution >= 1, true);
  assert.equal(timeline.body.workflowTimeline.summary.dispatch >= 1, true);
});

test('MEDIA-03 browser surfaces default to /api/media instead of legacy function paths', async () => {
  const [
    worker,
    experience,
    platform,
    authHelper,
    gateHelper,
    intakeHtml
  ] = await Promise.all([
    readFile(new URL('../cloudflare/worker.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeMediaCenter/public/media-experience.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeMediaCenter/platform.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeMediaCenter/public/skygate-auth.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeMediaCenter/gate-session.js', import.meta.url), 'utf8'),
    readFile(new URL('../SkyeMediaCenter/public/index.html', import.meta.url), 'utf8')
  ]);

  assert.match(worker, /return `\/api\/media\/file\?id=/);
  assert.match(experience, /return '\/api\/media'/);
  assert.match(experience, /function mediaApiPath/);
  assert.doesNotMatch(experience, /\$\{API\}\/media-(assets|file|publish|search|stats)/);
  assert.match(platform, /return '\/api\/media'/);
  assert.match(platform, /mediaApiPath\('media-assets'\)/);
  assert.doesNotMatch(platform, /\$\{API\}\/media-(assets|search|stats)/);
  assert.match(authHelper, /\/api\/media\/session/);
  assert.match(gateHelper, /\/api\/media\/session/);
  assert.match(intakeHtml, /\/api\/media\/assets/);
  assert.doesNotMatch(intakeHtml, /\/\.netlify\/functions\/media-assets/);
});
