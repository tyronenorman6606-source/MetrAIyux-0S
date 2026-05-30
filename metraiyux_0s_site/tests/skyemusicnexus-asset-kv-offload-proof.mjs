#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyemusicnexus-asset-kv-offload-proof');
const receiptPath = path.join(artifactDir, 'latest.json');
const adminCode = 'asset-offload-admin';

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async get(key, opts = {}) {
    const value = this.map.get(key);
    if (value == null) return null;
    return opts.type === 'json' ? JSON.parse(value) : value;
  }

  async put(key, value) {
    this.map.set(key, String(value));
  }
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({
          ok: true,
          token: 'admin:music-owner@example.com',
          active: true,
          email: 'music-owner@example.com',
          username: 'music-owner@example.com',
          role: 'admin',
          scope: 'admin.read admin.write music.write gateway.invoke',
          isAdmin: true,
        });
      }
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || 'artist:proof@example.com');
      const [role = 'artist', email = 'proof@example.com'] = token.split(':');
      const artistId = `artist_${email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `asset-offload-${role}-${email}`,
        role,
        scope: role === 'admin' ? 'admin.read admin.write music.write' : 'music.read music.write',
        isAdmin: role === 'admin',
        artistId,
      });
    },
  };
}

async function call(env, method, route, { body, token = 'artist:proof@example.com', admin = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) {
    headers['x-admin-token'] = adminCode;
    headers['x-free99-admin-code'] = adminCode;
  }
  const response = await worker.fetch(new Request(`https://asset-offload.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  return response;
}

async function jsonCall(env, method, route, opts = {}) {
  const response = await call(env, method, route, opts);
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  assert.equal(response.ok, true, `${method} ${route} failed: ${JSON.stringify(payload).slice(0, 900)}`);
  return payload;
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  const kv = new MemoryKV();
  const env = {
    SKYMUSICNEXUS_KV: kv,
    SKYGATEFS27_WORKER: fakeGateWorker(),
    ADMIN_TOKEN: adminCode,
    FREE99_ADMIN_CODE: adminCode,
    SKYGATE_SOURCE_APP: 'metraiyux-0s',
  };
  const artistId = 'artist_proof_example_com';
  const assetId = `asset_offload_${Date.now().toString(36)}`;
  const originalBytes = Buffer.from('skymusicnexus offloaded gated asset proof', 'utf8');
  const originalBase64 = originalBytes.toString('base64');

  await jsonCall(env, 'POST', '/api/skymusicnexus/music-artists', {
    body: {
      action: 'register',
      id: artistId,
      name: 'Asset Offload Proof Artist',
      email: 'proof@example.com',
      genre: ['proof'],
    },
  });

  const uploaded = await jsonCall(env, 'POST', '/api/skymusicnexus/music-assets', {
    body: {
      action: 'upload',
      id: assetId,
      artistId,
      title: 'Offloaded Gated Stream Proof',
      fileName: 'offloaded-proof.mp3',
      contentType: 'audio/mpeg',
      bytes: originalBytes.byteLength,
      dataBase64: originalBase64,
    },
  });
  assert.equal(uploaded.asset.id, assetId, 'upload did not return requested asset id');

  const state = await kv.get('skymusicnexus:v1:state', { type: 'json' });
  const storedAsset = state.assets.find((asset) => asset.id === assetId);
  assert(storedAsset, 'stored state missing uploaded asset metadata');
  assert.equal('dataBase64' in storedAsset, false, 'state still contains inline asset dataBase64');
  assert.equal(storedAsset.storageMode, 'worker-kv-asset-data', 'stored asset did not switch to KV asset-data mode');
  assert(storedAsset.assetDataKey, 'stored asset missing assetDataKey');
  const dataRecord = await kv.get(storedAsset.assetDataKey, { type: 'json' });
  assert.equal(dataRecord.dataBase64, originalBase64, 'offloaded asset data record does not contain original base64');

  const streamResponse = await call(env, 'GET', `/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(assetId)}`);
  assert.equal(streamResponse.status, 200, 'gated stream did not return 200 for owner artist');
  const streamed = Buffer.from(await streamResponse.arrayBuffer());
  assert.equal(streamed.toString('utf8'), originalBytes.toString('utf8'), 'gated stream did not hydrate bytes from offloaded KV asset data');

  const receipt = {
    ok: true,
    checkedAt,
    script: 'metraiyux_0s_site/tests/skyemusicnexus-asset-kv-offload-proof.mjs',
    assetId,
    assetDataKey: storedAsset.assetDataKey,
    stateHasInlineData: 'dataBase64' in storedAsset,
    storageMode: storedAsset.storageMode,
    streamStatus: streamResponse.status,
    streamedBytes: streamed.byteLength,
    browserOpened: false,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch(async (error) => {
  await mkdir(artifactDir, { recursive: true });
  const failure = { ok: false, checkedAt, error: error.message, stack: error.stack, browserOpened: false };
  await writeFile(receiptPath, `${JSON.stringify(failure, null, 2)}\n`);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});
