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

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status:404});
      }
    },
    ...overrides
  };
}

function req(path, {method = 'GET', body, token} = {}) {
  const headers = body ? {'content-type':'application/json'} : {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function data(response) {
  return response.json();
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const body = response.headers.get('content-type')?.includes('application/json')
    ? await data(response)
    : await response.text();
  return {response, body};
}

test('MUSIC-01 maps SkyeMusicNexus Netlify function contracts under the 0S namespace', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV()});

  const health = await call(e, '/api/skymusicnexus/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.app_id, 'skymusicnexus');
  assert.equal(health.body.mounted, true);
  assert.equal(health.body.status, 'LIVE/PARTIAL');
  assert.equal(health.body.function_base, '/api/skymusicnexus');
  assert.equal(health.body.storage_mode, 'kv');
  assert.equal(health.body.mapped_functions.includes('music-assets'), true);
  assert.equal(health.body.mapped_functions.includes('music-releases'), true);

  const manifest = await call(e, '/api/skymusicnexus/routes/manifest');
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.body.base, '/api/skymusicnexus');
  assert.equal(manifest.body.functions.includes('music-studio'), true);
  assert.equal(manifest.body.functions.includes('music-drops'), true);
});

test('MUSIC-02 blocks old Netlify function source and root function URLs on the 0S Worker', async () => {
  const e = env();
  for (const path of [
    '/SkyeMusicNexus/netlify/functions/music-assets.js',
    '/SkyeMusicNexus/netlify/functions/music-drops.js',
    '/.netlify/functions/music-assets'
  ]) {
    const response = await siteWorker.fetch(req(path), e, ctx());
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', path);
    assert.match(await response.text(), /Private implementation source is not public/i, path);
  }
});

test('MUSIC-03 keeps SkyeMusicNexus functions gated while exposing production session status', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});

  const blocked = await call(e, '/api/skymusicnexus/music-assets?action=list');
  assert.equal(blocked.response.status, 401);
  assert.match(blocked.body.error, /Unauthorized music-assets/);

  const session = await call(e, '/api/skymusicnexus/skygate-session');
  assert.equal(session.response.status, 200);
  assert.equal(session.body.productionGate, true);
  assert.equal(session.body.free99, true);
  assert.equal(session.body.activeSession, null);
  assert.equal(session.body.skygate.active, false);
});

test('MUSIC-03 proves asset, DAW save, drops, feed, release, rights, and admin review flows', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const token = 'secret';

  const artistCreated = await call(e, '/api/skymusicnexus/music-artists', {
    method:'POST',
    token,
    body:{action:'register', name:'E2E Artist', email:'artist@example.com'}
  });
  assert.equal(artistCreated.response.status, 200);
  const artistId = artistCreated.body.artistId;
  assert.ok(artistId);

  const projectSaved = await call(e, '/api/skymusicnexus/music-studio', {
    method:'POST',
    token,
    body:{action:'saveProject', project:{id:'studio-e2e', artistId, title:'Night Signal Session'}}
  });
  assert.equal(projectSaved.response.status, 200);
  assert.equal(projectSaved.body.status, 'STUDIO_PROJECT_SAVED');

  const assetUploaded = await call(e, '/api/skymusicnexus/music-assets', {
    method:'POST',
    token,
    body:{
      action:'upload',
      artistId,
      title:'Night Signal',
      fileName:'night-signal.mp3',
      contentType:'audio/mpeg',
      bytes:128,
      dataBase64:'data:audio/mpeg;base64,AAAA'
    }
  });
  assert.equal(assetUploaded.response.status, 200);
  const asset = assetUploaded.body.asset;
  assert.match(asset.streamUrl, /^\/api\/skymusicnexus\/music-assets\?action=stream&id=/);

  const assetList = await call(e, `/api/skymusicnexus/music-assets?action=list&artistId=${encodeURIComponent(artistId)}`, {token});
  assert.equal(assetList.response.status, 200);
  assert.equal(assetList.body.assets.some(item => item.id === asset.id), true);

  const stream = await siteWorker.fetch(req(`/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(asset.id)}`, {token}), e, ctx());
  assert.equal(stream.status, 200);
  assert.equal(stream.headers.get('content-type'), 'audio/mpeg');

  const submitted = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{
      action:'submit',
      artistId,
      title:'Night Signal',
      tracks:[{title:'Night Signal', duration:181, previewUrl:asset.streamUrl}]
    }
  });
  assert.equal(submitted.response.status, 201);
  const releaseId = submitted.body.release.id;
  assert.equal(submitted.body.release.status, 'submitted');

  const rights = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{
      action:'update-rights',
      id:releaseId,
      rights:{ownershipAttested:true, previewUseAuthorized:true, distributionAuthorized:true}
    }
  });
  assert.equal(rights.response.status, 200);
  assert.equal(rights.body.rights.status, 'distribution-ready');

  const reviewed = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{action:'review', id:releaseId, decision:'approve', notes:'Operator approved release.'}
  });
  assert.equal(reviewed.response.status, 200);
  assert.equal(reviewed.body.release.status, 'approved');

  const published = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{action:'publish', id:releaseId}
  });
  assert.equal(published.response.status, 200);
  assert.equal(published.body.release.status, 'live');

  const playback = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{action:'playback-stream', id:releaseId, trackIndex:0, listenSeconds:30}
  });
  assert.equal(playback.response.status, 200);
  assert.equal(playback.body.playback.releaseId, releaseId);

  const dropCreated = await call(e, '/api/skymusicnexus/music-drops', {
    method:'POST',
    token,
    body:{action:'create-drop', artistId, releaseId, title:'Night Signal Drop', tracks:[{title:'Night Signal', previewUrl:asset.streamUrl}]}
  });
  assert.equal(dropCreated.response.status, 201);
  const dropId = dropCreated.body.drop.dropId;

  const dropSubmitted = await call(e, '/api/skymusicnexus/music-drops', {
    method:'POST',
    token,
    body:{action:'submit-drop', dropId}
  });
  assert.equal(dropSubmitted.response.status, 200);
  assert.equal(dropSubmitted.body.drop.status, 'submitted');

  const batchFormed = await call(e, '/api/skymusicnexus/music-drops', {
    method:'POST',
    token,
    body:{action:'form-batch', dropIds:[dropId]}
  });
  assert.equal(batchFormed.response.status, 201);
  const batchId = batchFormed.body.batch.batchId;

  const batchApproved = await call(e, '/api/skymusicnexus/music-drops', {
    method:'POST',
    token,
    body:{action:'approve-batch', batchId}
  });
  assert.equal(batchApproved.response.status, 200);
  assert.equal(batchApproved.body.batch.status, 'approved');

  const batchPublished = await call(e, '/api/skymusicnexus/music-drops', {
    method:'POST',
    token,
    body:{action:'publish-batch', batchId}
  });
  assert.equal(batchPublished.response.status, 200);
  assert.equal(batchPublished.body.deploy.status, 'queued_for_operator_deploy');

  const feedPost = await call(e, '/api/skymusicnexus/music-social', {
    method:'POST',
    token,
    body:{action:'create-feed-post', artistId, releaseId, caption:'Night Signal is live.', hashtags:'#nightSignal'}
  });
  assert.equal(feedPost.response.status, 201);
  assert.equal(feedPost.body.post.status, 'published');

  const feed = await call(e, `/api/skymusicnexus/music-social?action=feed&artistId=${encodeURIComponent(artistId)}`, {token});
  assert.equal(feed.response.status, 200);
  assert.equal(feed.body.feedItems.some(item => item.id === feedPost.body.post.id), true);

  const credit = await call(e, '/api/skymusicnexus/music-payments', {
    method:'POST',
    token,
    body:{action:'credit', artistId, amount:25, reason:'proof-streams', referenceId:releaseId}
  });
  assert.equal(credit.response.status, 200);
  assert.equal(credit.body.balance, 25);

  const payout = await call(e, '/api/skymusicnexus/music-payments', {
    method:'POST',
    token,
    body:{action:'payout', artistId, amount:10}
  });
  assert.equal(payout.response.status, 200);
  const payoutId = payout.body.payout.id;

  const payoutCompleted = await call(e, '/api/skymusicnexus/music-payments', {
    method:'POST',
    token,
    body:{action:'complete-payout', payoutId}
  });
  assert.equal(payoutCompleted.response.status, 200);
  assert.equal(payoutCompleted.body.payout.status, 'completed');

  const analytics = await call(e, '/api/skymusicnexus/music-analytics', {token});
  assert.equal(analytics.response.status, 200);
  assert.equal(analytics.body.liveReleases, 1);
  assert.equal(analytics.body.assets, 1);
  assert.equal(analytics.body.drops, 1);
  assert.equal(analytics.body.feedItems, 1);
});

test('MUSIC-01 browser rooms default to the namespaced 0S API base on production hosts', async () => {
  const neo = await readFile(new URL('../SkyeMusicNexus/public/neo-nexus.js', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../SkyeMusicNexus/public/skygate-auth.js', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../SkyeMusicNexus/public/open-source-studio.js', import.meta.url), 'utf8');
  const daw = await readFile(new URL('../SkyeMusicNexus/public/nexus-daw.js', import.meta.url), 'utf8');

  assert.match(neo, /return '\/api\/skymusicnexus\/';/);
  assert.doesNotMatch(neo, /const apiBase = '\/\.netlify\/functions\/';/);
  assert.match(auth, /return '\/api\/skymusicnexus\/skygate-session';/);
  assert.doesNotMatch(auth, /options\.sessionPath \|\| '\/\.netlify\/functions\/skygate-session'/);
  assert.match(studio, /return `\/api\/skymusicnexus\/\$\{name\}`;/);
  assert.doesNotMatch(studio, /studio: "\/\.netlify\/functions\/music-studio"/);
  assert.match(daw, /return `\/api\/skymusicnexus\/\$\{name\}`;/);
  assert.doesNotMatch(daw, /studio: "\/\.netlify\/functions\/music-studio"/);
});
