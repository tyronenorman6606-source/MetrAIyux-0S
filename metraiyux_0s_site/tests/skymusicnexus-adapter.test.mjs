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

function gateWorker() {
  const claims = {
    active: true,
    sub: 'test-gate-owner',
    email: 'owner@metraiyux.test',
    username: 'owner@metraiyux.test',
    role: 'admin',
    scope: 'admin.read admin.write gateway.invoke',
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const auth = request.headers.get('authorization') || '';
      let postedToken = '';
      try { postedToken = (await request.clone().json()).token || ''; } catch {}
      const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : postedToken;
      const activeClaims = bearer === 'fan-token'
        ? {...claims, sub:'fan-gate-user', email:'fan@example.com', username:'fan@example.com', role:'fan', scope:'gateway.invoke'}
        : bearer === 'artist-token'
          ? {...claims, sub:'artist-gate-user', email:'artist@example.com', username:'artist@example.com', role:'artist', artistId:'artist_download_owner', scope:'gateway.invoke'}
          : claims;
      if (url.pathname === '/admin/login') return new Response(JSON.stringify({ok:true, token:'secret', ...claims}), {status:200, headers:{'content-type':'application/json'}});
      if (url.pathname === '/auth-introspect' || url.pathname === '/auth/introspect' || url.pathname === '/.netlify/functions/auth-introspect') return new Response(JSON.stringify(activeClaims), {status:200, headers:{'content-type':'application/json'}});
      if (url.pathname === '/platform/events') return new Response(JSON.stringify({ok:true, mirrored:true}), {status:200, headers:{'content-type':'application/json'}});
      return new Response(JSON.stringify({ok:false, error:'not_found'}), {status:404, headers:{'content-type':'application/json'}});
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
    SKYGATEFS27_WORKER: gateWorker(),
    SKYENET_DEPLOY_ENABLED: 'false',
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
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const token = 'secret';

  const health = await call(e, '/api/skymusicnexus/health', {token});
  assert.equal(health.response.status, 200);
  assert.equal(health.body.app_id, 'skymusicnexus');
  assert.equal(health.body.mounted, true);
  assert.equal(health.body.status, 'LIVE/PARTIAL');
  assert.equal(health.body.function_base, '/api/skymusicnexus');
  assert.equal(health.body.storage_mode, 'kv');
  assert.equal(health.body.mapped_functions.includes('music-assets'), true);
  assert.equal(health.body.mapped_functions.includes('music-releases'), true);
  assert.equal(health.body.mapped_functions.includes('music-brain'), true);
  assert.equal(health.body.mapped_functions.includes('music-store'), true);
  assert.equal(health.body.mapped_functions.includes('music-gamify'), true);

  const manifest = await call(e, '/api/skymusicnexus/routes/manifest', {token});
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.body.base, '/api/skymusicnexus');
  assert.equal(manifest.body.functions.includes('music-studio'), true);
  assert.equal(manifest.body.functions.includes('music-drops'), true);
  assert.equal(manifest.body.functions.includes('music-gamify'), true);
});

test('MUSIC-02 blocks old Netlify function source and root function URLs on the 0S Worker', async () => {
  const e = env();
  for (const path of [
    '/SkyeMusicNexus/netlify/functions/music-assets.js',
    '/SkyeMusicNexus/netlify/functions/music-drops.js',
    '/.netlify/functions/music-assets'
  ]) {
    const response = await siteWorker.fetch(req(path), e, ctx());
    assert.equal([302, 404].includes(response.status), true, path);
    if (response.status === 302) {
      assert.match(response.headers.get('location') || '', /\/admin\/login\.html/i, path);
    } else {
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', path);
      assert.match(await response.text(), /Private implementation source is not public/i, path);
    }
  }

  const directAudio = await call(e, '/SkyeMusicNexus/artist-storefronts/gray-skyes/media/audio/blades.mp3', {token:'fan-token'});
  assert.equal(directAudio.response.status, 402);
  assert.equal(directAudio.body.code, 'SKYEPAY_ASSET_PURCHASE_REQUIRED');

  const directZip = await call(e, '/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/reflection/source.zip', {token:'fan-token'});
  assert.equal(directZip.response.status, 402);
  assert.equal(directZip.body.gated_download_api, '/api/skymusicnexus/music-assets?action=download&id=<assetId>');
});

test('MUSIC-03 keeps SkyeMusicNexus functions gated while exposing production session status', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});

  const blocked = await call(e, '/api/skymusicnexus/music-assets?action=list');
  assert.equal(blocked.response.status, 401);
  assert.match(blocked.body.error, /Unauthorized .*music-assets|protected surface|Missing Authorization bearer token/i);

  const session = await call(e, '/api/skymusicnexus/skygate-session', {token:'secret'});
  assert.equal(session.response.status, 200);
  assert.equal(session.body.productionGate, true);
  assert.equal(session.body.free99, true);
  assert.equal(session.body.activeSession.source, 'admin_token');
  assert.equal(session.body.skygate.active, true);
});

test('MUSIC-03b wires ElevenLabs and Stability AI music provider routes behind the shared gate', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'secret', Stability_api_key:'test-stability-key', ZERO_OS_PROVIDER_SANDBOX:'1'});
  const token = 'secret';

  const status = await call(e, '/api/skymusicnexus/music-provider-hooks?action=ai-status', {token});
  assert.equal(status.response.status, 200);
  assert.equal(status.body.secretValuesReturned, false);
  const eleven = status.body.providers.find(provider => provider.id === 'elevenlabs');
  const stability = status.body.providers.find(provider => provider.id === 'stability');
  assert.equal(eleven.configured, false);
  assert.equal(stability.configured, true);
  assert.equal(stability.keyEnv, 'Stability_api_key');

  const queuedEleven = await call(e, '/api/skymusicnexus/music-provider-hooks', {
    method:'POST',
    token,
    body:{action:'queue-ai-song', provider:'elevenlabs', artistId:'444666666666', title:'Gate Ready Song', prompt:'Make a bright store launch theme.', durationSeconds:20}
  });
  assert.equal(queuedEleven.response.status, 202);
  assert.equal(queuedEleven.body.job.status, 'waiting-provider-key');
  assert.equal(queuedEleven.body.job.requiredEnv, 'ELEVENLABS_API_KEY_2');

  const queuedStability = await call(e, '/api/skymusicnexus/music-provider-hooks', {
    method:'POST',
    token,
    body:{action:'queue-ai-song', provider:'stability', artistId:'444666666666', title:'Stable Audio Queue', prompt:'Make a cinematic synth hook.', durationSeconds:20}
  });
  assert.equal(queuedStability.response.status, 202);
  assert.equal(queuedStability.body.job.status, 'queued-provider-ready');
  assert.equal(queuedStability.body.job.providerConfigured, true);

  const generatedStability = await call(e, '/api/skymusicnexus/music-provider-hooks', {
    method:'POST',
    token,
    body:{action:'generate-ai-song', provider:'stability', artistId:'444666666666', title:'Stable Audio Runtime', prompt:'Make a provider runtime hook.', durationSeconds:20}
  });
  assert.equal(generatedStability.response.status, 201);
  assert.equal(generatedStability.body.job.status, 'generated');
  assert.equal(generatedStability.body.job.providerRuntime.status, 'executed_sandbox');
  assert.equal(generatedStability.body.job.providerRuntime.action, 'stability.audio.generate');

  const jobs = await call(e, '/api/skymusicnexus/music-provider-hooks?action=jobs', {token});
  assert.equal(jobs.response.status, 200);
  assert.equal(jobs.body.jobs.length, 3);
});

test('MUSIC-03c tracks Gray Gang collective rename requests with owner review policy', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const token = 'secret';

  const list = await call(e, '/api/skymusicnexus/music-collectives?action=list', {token});
  assert.equal(list.response.status, 200);
  assert.equal(list.body.defaultCollective.name, 'Gray Gang');
  assert.equal(list.body.defaultCollective.approvalPolicy.renameApprovalWindowHours, 48);

  const requested = await call(e, '/api/skymusicnexus/music-collectives', {
    method:'POST',
    token,
    body:{action:'request-rename', collectiveId:'gray-skyes-collective', requestedName:'Gray Gang North', requestedBy:'artist-operator'}
  });
  assert.equal(requested.response.status, 202);
  assert.equal(requested.body.request.status, 'pending_admin_review');
  assert.match(requested.body.request.autoApproveAt, /T/);
  assert.equal(requested.body.request.skyemailAlert.skipped, true);

  const approved = await call(e, '/api/skymusicnexus/music-collectives', {
    method:'POST',
    token,
    body:{action:'approve-rename', collectiveId:'gray-skyes-collective', requestId:requested.body.request.requestId}
  });
  assert.equal(approved.response.status, 200);
  assert.equal(approved.body.collective.name, 'Gray Gang North');
  assert.equal(approved.body.request.status, 'approved_by_admin');
  assert.equal(approved.body.collective.renameRequests.some(item => item.requestId === requested.body.request.requestId && item.status === 'approved_by_admin'), true);
});

test('MUSIC-03d joins MusicNexus store orders to SkyPay receivables, split settlements, payouts, and CRM bridge events', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), SITE_EVENTS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const token = 'secret';

  const artistCreated = await call(e, '/api/skymusicnexus/music-artists', {
    method:'POST',
    token,
    body:{action:'register', artistId:'artist_loop_primary', name:'Loop Primary', email:'primary@example.com'}
  });
  assert.equal(artistCreated.response.status, 200);

  const productCreated = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token,
    body:{
      action:'create-product',
      artistId:'artist_loop_primary',
      productId:'prod_loop_split',
      title:'Split Loop Single',
      priceCents:10000,
      feeMode:'artist_absorbed',
      splitSheet:[
        {lineId:'primary', artistId:'artist_loop_primary', stageName:'Loop Primary', role:'primary_artist', shareBps:7000},
        {lineId:'producer', artistId:'artist_loop_producer', stageName:'Loop Producer', role:'producer', shareBps:3000}
      ]
    }
  });
  assert.equal(productCreated.response.status, 201);
  assert.equal(productCreated.body.product.splitSummary.valid, true);

  const orderRecorded = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token,
    body:{action:'record-order', productId:'prod_loop_split', orderId:'order_loop_1', buyerEmail:'fan@example.com'}
  });
  assert.equal(orderRecorded.response.status, 201);
  assert.equal(orderRecorded.body.order.status, 'pending_skyepay_checkout');
  assert.equal(orderRecorded.body.checkoutIntent.confirmationAction, 'confirm-skypay-order');

  const confirmed = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token,
    body:{
      action:'confirm-skypay-order',
      orderId:'order_loop_1',
      providerReference:'cs_music_loop_paid',
      skyepayOrderId:'skyepay_order_loop_1',
      paymentStatus:'paid'
    }
  });
  assert.equal(confirmed.response.status, 200);
  assert.equal(confirmed.body.order.paymentStatus, 'paid');
  assert.equal(confirmed.body.receivable.grossCents, 10000);
  assert.equal(confirmed.body.receivable.platformFeeCents, 1300);
  assert.equal(confirmed.body.receivable.artistNetCents, 8700);
  assert.equal(confirmed.body.settlements.length, 2);
  assert.equal(confirmed.body.settlements.reduce((sum, item) => sum + item.payableCents, 0), 8700);
  assert.equal(confirmed.body.payouts.length, 2);
  assert.equal(confirmed.body.payoutPolicy.stripeConnectRequired, false);
  assert.equal(confirmed.body.bridgeEvents.filter(item => item.stored).length, 3);

  const payments = await call(e, '/api/skymusicnexus/music-payments?action=settlements', {token});
  assert.equal(payments.response.status, 200);
  assert.equal(payments.body.settlements.some(item => item.orderId === 'order_loop_1' && item.receivableId === confirmed.body.receivable.receivableId), true);

  const bridge = await call(e, '/api/0s-command-bridge/events?entity=order_loop_1&limit=20', {token});
  assert.equal(bridge.response.status, 200);
  const eventTypes = bridge.body.events.map(item => item.type || item.event_type);
  assert.equal(eventTypes.includes('skyepay.payment.confirmed'), true);
  assert.equal(eventTypes.includes('merchant.receivable.created'), true);
  assert.equal(eventTypes.includes('music.splits.settlement_recorded'), true);
});

test('MUSIC-03e gates creative asset downloads to artists or paid SkyPay buyers', async () => {
  const e = env({SKYMUSICNEXUS_KV:new MemoryKV(), SITE_EVENTS_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});

  const artistCreated = await call(e, '/api/skymusicnexus/music-artists', {
    method:'POST',
    token:'secret',
    body:{action:'register', artistId:'artist_download_owner', name:'Download Owner', email:'artist@example.com'}
  });
  assert.equal(artistCreated.response.status, 200);

  const assetUploaded = await call(e, '/api/skymusicnexus/music-assets', {
    method:'POST',
    token:'secret',
    body:{
      action:'upload',
      artistId:'artist_download_owner',
      title:'Paid Only Loop',
      fileName:'paid-only-loop.mp3',
      contentType:'audio/mpeg',
      bytes:128,
      dataBase64:'data:audio/mpeg;base64,AAAA'
    }
  });
  assert.equal(assetUploaded.response.status, 200);
  const assetId = assetUploaded.body.asset.id;

  const productCreated = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token:'secret',
    body:{action:'create-product', artistId:'artist_download_owner', productId:'prod_paid_loop_download', title:'Paid Only Loop', priceCents:444, assetId}
  });
  assert.equal(productCreated.response.status, 201);

  const unpaidFan = await call(e, `/api/skymusicnexus/music-assets?action=download&id=${encodeURIComponent(assetId)}`, {token:'fan-token'});
  assert.equal(unpaidFan.response.status, 402);
  assert.equal(unpaidFan.body.code, 'SKYEPAY_ASSET_PURCHASE_REQUIRED');

  const unpaidStream = await call(e, `/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(assetId)}`, {token:'fan-token'});
  assert.equal(unpaidStream.response.status, 402);
  assert.equal(unpaidStream.body.code, 'SKYEPAY_ASSET_PURCHASE_REQUIRED');

  const artistDownload = await siteWorker.fetch(req(`/api/skymusicnexus/music-assets?action=download&id=${encodeURIComponent(assetId)}`, {token:'artist-token'}), e, ctx());
  assert.equal(artistDownload.status, 200);
  assert.equal(artistDownload.headers.get('x-skye-download-gate'), 'artist-or-paid-skypay');

  const orderRecorded = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token:'secret',
    body:{action:'record-order', productId:'prod_paid_loop_download', orderId:'order_paid_loop_download', buyerEmail:'fan@example.com'}
  });
  assert.equal(orderRecorded.response.status, 201);

  const blockedFulfillment = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token:'secret',
    body:{action:'fulfill-order', orderId:'order_paid_loop_download'}
  });
  assert.equal(blockedFulfillment.response.status, 402);
  assert.equal(blockedFulfillment.body.code, 'SKYEPAY_REQUIRED_BEFORE_FULFILLMENT');

  const paid = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token:'secret',
    body:{action:'confirm-skypay-order', orderId:'order_paid_loop_download', providerReference:'cs_paid_loop_download', paymentStatus:'paid'}
  });
  assert.equal(paid.response.status, 200);
  assert.equal(paid.body.order.paymentStatus, 'paid');

  const paidFan = await siteWorker.fetch(req(`/api/skymusicnexus/music-assets?action=download&id=${encodeURIComponent(assetId)}`, {token:'fan-token'}), e, ctx());
  assert.equal(paidFan.status, 200);
  assert.equal(paidFan.headers.get('content-disposition')?.includes('attachment'), true);
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
  assert.equal(artistCreated.body.artist.paperwork.requiredBeforePayout, true);
  assert.equal(artistCreated.body.artist.skyepay.payoutEligibility, 'blocked_until_paperwork_complete');
  assert.match(artistCreated.body.artist.paperwork.workforceFormUrl, /WebGrowthOperator\/ae-command-hub\/onboarding\.html/);

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

  const stream = await siteWorker.fetch(req(`/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(asset.id)}`, {token:'artist-token'}), e, ctx());
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
  assert.equal(batchPublished.body.deploy.status, 'deploy-intent');

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

  const storeSaved = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token,
    body:{action:'upsert-store', artistId, artistName:'E2E Artist', name:'E2E Nexus Store', feeMode:'buyer_covered'}
  });
  assert.equal(storeSaved.response.status, 201);
  assert.equal(storeSaved.body.store.artistId, artistId);

  const productCreated = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token,
    body:{action:'create-product', artistId, releaseId, title:'Night Signal Digital Pass', productType:'digital', priceCents:1300}
  });
  assert.equal(productCreated.response.status, 201);
  const productId = productCreated.body.product.productId;

  const orderRecorded = await call(e, '/api/skymusicnexus/music-store', {
    method:'POST',
    token,
    body:{action:'record-order', productId, quantity:2, buyerEmail:'fan@example.com', feeMode:'buyer_covered'}
  });
  assert.equal(orderRecorded.response.status, 201);
  assert.equal(orderRecorded.body.order.platformFeeBps, 1300);
  assert.match(orderRecorded.body.checkoutIntent.url, /skyepay-store\.html/);

  const networkArtist = await call(e, '/api/skymusicnexus/music-artists', {
    method:'POST',
    token,
    body:{action:'register', name:'Supaboy Drops', email:'supaboy@example.com'}
  });
  assert.equal(networkArtist.response.status, 200);
  const networkArtistId = networkArtist.body.artistId;

  const networkRelease = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{
      action:'submit',
      artistId:networkArtistId,
      title:'Supa Signal',
      tracks:[{title:'Supa Signal', duration:144}]
    }
  });
  assert.equal(networkRelease.response.status, 201);
  const networkReleaseId = networkRelease.body.release.id;

  await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{action:'update-rights', id:networkReleaseId, rights:{ownershipAttested:true, previewUseAuthorized:true, distributionAuthorized:true}}
  });
  await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{action:'review', id:networkReleaseId, decision:'approve', notes:'Network release approved.'}
  });
  const networkPublished = await call(e, '/api/skymusicnexus/music-releases', {
    method:'POST',
    token,
    body:{action:'publish', id:networkReleaseId}
  });
  assert.equal(networkPublished.response.status, 200);
  assert.equal(networkPublished.body.release.status, 'live');

  const networkFeedPost = await call(e, '/api/skymusicnexus/music-social', {
    method:'POST',
    token,
    body:{action:'create-feed-post', artistId:networkArtistId, releaseId:networkReleaseId, caption:'Supa Signal just landed.', hashtags:'#supaSignal'}
  });
  assert.equal(networkFeedPost.response.status, 201);

  const brainSeeded = await call(e, '/api/skymusicnexus/music-brain', {
    method:'POST',
    token,
    body:{action:'seed-artist-brain', artistId, artistName:'E2E Artist', objectives:'post release updates, stream network releases, reply to fans, route fans to store'}
  });
  assert.equal(brainSeeded.response.status, 201);
  assert.equal(brainSeeded.body.profile.providerRequired, false);

  const brainCycle = await call(e, '/api/skymusicnexus/music-brain', {
    method:'POST',
    token,
    body:{action:'run-local-cycle', artistId, execute:true, limit:8, goal:'stream Supaboy, post, engage, and route fans to store'}
  });
  assert.equal(brainCycle.response.status, 201);
  assert.equal(brainCycle.body.actions.some(item => item.type === 'listen_release' && item.releaseId === networkReleaseId), true);
  assert.equal(brainCycle.body.receipts.some(item => item.kind === 'listen_release'), true);

  const networkReleaseAfterCycle = await call(e, `/api/skymusicnexus/music-releases?action=get&id=${encodeURIComponent(networkReleaseId)}`, {token});
  assert.equal(networkReleaseAfterCycle.response.status, 200);
  assert.equal(Number(networkReleaseAfterCycle.body.release.analytics.nexusStreams || 0) >= 1, true);

  const meterBoost = await call(e, '/api/skymusicnexus/music-gamify', {
    method:'POST',
    token,
    body:{action:'record-activity', artistId, activityType:'operator_award', points:125, note:'fill meter proof'}
  });
  assert.equal(meterBoost.response.status, 201);
  assert.equal(meterBoost.body.merits.length >= 1, true);

  const giveawayOpened = await call(e, '/api/skymusicnexus/music-gamify', {
    method:'POST',
    token,
    body:{action:'open-giveaway', title:'Content Launch Drop Package Giveaway', prizeType:'content_launch_drop_package', entryCostPoints:0}
  });
  assert.equal(giveawayOpened.response.status, 201);
  const giveawayId = giveawayOpened.body.giveaway.giveawayId;

  const giveawayEntered = await call(e, '/api/skymusicnexus/music-gamify', {
    method:'POST',
    token,
    body:{action:'enter-giveaway', giveawayId, artistId, note:'E2E artist entry'}
  });
  assert.equal(giveawayEntered.response.status, 201);
  assert.equal(giveawayEntered.body.entry.artistId, artistId);

  const giveawayDrawn = await call(e, '/api/skymusicnexus/music-gamify', {
    method:'POST',
    token,
    body:{action:'draw-giveaway', giveawayId, winnerIndex:0}
  });
  assert.equal(giveawayDrawn.response.status, 200);
  assert.equal(giveawayDrawn.body.winner.artistId, artistId);

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
  assert.equal(payout.body.payout.status, 'paperwork_hold');
  assert.equal(payout.body.payout.paperwork.requiredBeforePayout, true);

  const payoutCompleted = await call(e, '/api/skymusicnexus/music-payments', {
    method:'POST',
    token,
    body:{action:'complete-payout', payoutId}
  });
  assert.equal(payoutCompleted.response.status, 409);
  assert.equal(payoutCompleted.body.error, 'paperwork_required_before_payout');

  const analytics = await call(e, '/api/skymusicnexus/music-analytics', {token});
  assert.equal(analytics.response.status, 200);
  assert.equal(analytics.body.liveReleases, 2);
  assert.equal(analytics.body.assets, 1);
  assert.equal(analytics.body.drops, 1);
  assert.equal(analytics.body.feedItems >= 3, true);
  assert.equal(analytics.body.storeProducts >= 1, true);
  assert.equal(analytics.body.artistBrains, 1);
  assert.equal(analytics.body.skyeMerits >= 1, true);
  assert.equal(analytics.body.giveaways, 1);
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
