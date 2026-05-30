import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const siteWorker = (await import('../cloudflare/worker.js')).default;
const fs27Worker = (await import('../skyegate/source/SkyeGateFS27/cloudflare/worker.mjs')).default;

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async put(key, value, options = {}) {
    this.map.set(key, { value: String(value), options });
  }

  async get(key, options = {}) {
    const stored = this.map.get(key);
    if (!stored) return null;
    return options.type === 'json' ? JSON.parse(stored.value) : stored.value;
  }

  async list({ prefix = '', limit = 1000 } = {}) {
    const keys = [...this.map.keys()]
      .filter((key) => key.startsWith(prefix))
      .slice(0, limit)
      .map((name) => ({ name, metadata: this.map.get(name)?.options?.metadata || null }));
    return { keys, list_complete: true };
  }
}

class MemoryR2 {
  constructor() {
    this.map = new Map();
  }

  async put(key, value, options = {}) {
    const body = typeof value === 'string' ? value : await new Response(value).arrayBuffer();
    this.map.set(key, {
      body,
      options,
      size: typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength,
      uploaded: new Date()
    });
  }

  async get(key) {
    const stored = this.map.get(key);
    if (!stored) return null;
    const body = stored.body;
    return {
      key,
      body,
      size: stored.size,
      uploaded: stored.uploaded,
      customMetadata: stored.options?.customMetadata || {},
      async text() {
        return typeof body === 'string' ? body : new TextDecoder().decode(body);
      },
      async json() {
        return JSON.parse(await this.text());
      },
      writeHttpMetadata(headers) {
        const type = stored.options?.httpMetadata?.contentType;
        if (type) headers.set('content-type', type);
      }
    };
  }

  async list({ prefix = '', limit = 1000 } = {}) {
    return {
      objects: [...this.map.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((key) => ({
          key,
          size: this.map.get(key)?.size || 0,
          uploaded: this.map.get(key)?.uploaded || new Date()
        }))
    };
  }
}

function ctx() {
  return { waitUntil() {} };
}

function fs27ServiceBinding(fsEnv) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/auth-introspect') {
        const body = await request.json().catch(() => ({}));
        if (body.token === 'gate-token' || body.token === '0s-service-skynet') {
          return Response.json({
            active: true,
            sub: 'owner',
            email: 'owner@example.invalid',
            role: 'admin',
            scope: 'admin.read admin.write gateway.invoke',
            customer_id: 31,
            workspace_id: 'metraiyux-0s-owner'
          });
        }
        return Response.json({ active: false });
      }
      return fs27Worker.fetch(request, fsEnv, ctx());
    }
  };
}

function env() {
  const fsEnv = {
    DEPLOYMENT_ASSET_BUCKET: new MemoryR2(),
    ROUTING_KV: new MemoryKV(),
    SKYENET_WORKSPACES_KV: new MemoryKV(),
    SKYENET_RECEIPTS_KV: new MemoryKV(),
    REQUEST_LOG_BUCKET: new MemoryR2(),
    ASSETS: {
      async fetch(request) {
        return new Response(`fs27-asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    }
  };
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    },
    SKYGATEFS27_WORKER: fs27ServiceBinding(fsEnv),
    SKYMUSICNEXUS_KV: new MemoryKV(),
    SITE_EVENTS_KV: new MemoryKV(),
    MUSIC_NEXUS_SKYENET_PUBLIC_HOST: 'metraiyux.example',
    __fsEnv: fsEnv
  };
}

function req(path, { method = 'GET', token, headers = {}, body } = {}) {
  const finalHeaders = {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...headers
  };
  const init = { method, headers: finalHeaders };
  if (body !== undefined) {
    if (typeof body === 'string' || body instanceof ArrayBuffer) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      finalHeaders['content-type'] ||= 'application/json';
    }
  }
  return new Request(`https://metraiyux.example${path}`, init);
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test('Music Nexus publishes an artist storefront to canonical /skyenet and serves it publicly', async () => {
  const e = env();
  const token = 'gate-token';

  const store = await call(e, '/api/skymusicnexus/music-store', {
    method: 'POST',
    token,
    body: {
      action: 'upsert-store',
      artistId: '444666666666',
      artistName: 'Gray Skyes',
      name: 'Gray Skyes Prime Store',
      slug: 'gray-skyes',
      bio: 'Founder-grade SkyeMusicNexus storefront for polished artist drops, products, and public preview signal.',
      storefrontPlan: 'artist-host',
      fulfillmentEmail: 'gray@example.invalid',
      supportUrl: '/SkyeMusicNexus/public/store.html'
    }
  });
  assert.equal(store.response.status, 201);

  const product = await call(e, '/api/skymusicnexus/music-store', {
    method: 'POST',
    token,
    body: {
      action: 'create-product',
      artistId: '444666666666',
      artistName: 'Gray Skyes',
      title: 'Prime Drop Access',
      description: 'Public storefront offer with private delivery and payout handling still gated inside SkyGate.',
      productType: 'digital',
      priceCents: 2300,
      currency: 'USD',
      status: 'active'
    }
  });
  assert.equal(product.response.status, 201);

  const published = await call(e, '/api/skymusicnexus/music-store', {
    method: 'POST',
    token,
    body: {
      action: 'publish-skynet-storefront',
      artistId: '444666666666',
      routeSlug: 'gray-skyes-prime'
    }
  });
  assert.equal(published.response.status, 201, JSON.stringify(published.data));
  assert.equal(published.data.publish.status, 'published_to_skyenet');
  assert.equal(published.data.publish.mountPath, '/skyenet/musicnexus/artists/gray-skyes-prime');
  assert.match(published.data.publish.liveUrl, /^https:\/\/metraiyux\.example\/skyenet\/musicnexus\/artists\/gray-skyes-prime\/$/);
  assert.doesNotMatch(published.data.publish.liveUrl, /\/skynet\//);
  assert.equal(published.data.publish.providerRuntimeStatus?.status, 'executed_sandbox');
  assert.equal(published.data.publish.providerRuntimeStatus?.action, 'skynet.deploy.route');

  const providerReceipts = published.data.deploy.providerRuntimeReceipts;
  assert.ok(Array.isArray(providerReceipts));
  assert.equal(providerReceipts.filter((receipt) => receipt.action === 'skynet.deploy.init').length, 1);
  assert.equal(providerReceipts.filter((receipt) => receipt.action === 'storage.object.put').length, published.data.deploy.fileCount);
  assert.equal(providerReceipts.filter((receipt) => receipt.action === 'skynet.deploy.complete').length, 1);
  assert.equal(providerReceipts.filter((receipt) => receipt.action === 'skynet.deploy.route').length, 1);
  assert.ok(providerReceipts.every((receipt) => receipt.status === 'executed_sandbox'));
  assert.ok(providerReceipts.every((receipt) => receipt.executed === true));
  assert.ok(providerReceipts.every((receipt) => receipt.provider_call_made === false));
  assert.ok(providerReceipts.every((receipt) => receipt.receipt_id));
  assert.deepEqual(published.data.publish.providerRuntimeReceiptIds, providerReceipts.map((receipt) => receipt.receipt_id));
  const storedReceipts = await e.SITE_EVENTS_KV.list({ prefix: '0s-provider-runtime:receipt:' });
  assert.ok(storedReceipts.keys.length >= providerReceipts.length);

  const live = await siteWorker.fetch(req('/skyenet/musicnexus/artists/gray-skyes-prime/'), e, ctx());
  const html = await live.text();
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-0s-skynet-surface-proxy'), 'fs27-service-binding');
  assert.equal(live.headers.get('x-skynet-route'), 'r2-deployment');
  assert.match(html, /Gray Skyes/);
  assert.match(html, /SkyeMusicNexus player/);
  assert.match(html, /Music Nexus legal notice/);

  const data = await siteWorker.fetch(req('/skyenet/musicnexus/artists/gray-skyes-prime/site-data.json'), e, ctx());
  const siteData = await data.json();
  assert.equal(data.status, 200);
  assert.equal(siteData.artist.name, 'Gray Skyes');
  assert.equal(siteData.products[0].title, 'Prime Drop Access');
  assert.equal(siteData.links.musicLegal, '/legal/music-nexus/');

  const legacy = await siteWorker.fetch(req('/skynet/musicnexus/artists/gray-skyes-prime/?proof=1'), e, ctx());
  assert.equal(legacy.status, 301);
  assert.match(legacy.headers.get('location') || '', /\/skyenet\/musicnexus\/artists\/gray-skyes-prime\/\?proof=1$/);
});
