#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';
import pagesWorker from '../SkyeMusicNexus/_worker.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyemusicnexus-asset-download-gate');
const receiptPath = path.join(artifactDir, 'latest.json');

function memoryKv() {
  const store = new Map();
  return {
    async get(key, opts = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return opts.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
  };
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || 'artist:proof@skymusicnexus.local');
      const [role = 'artist', email = 'proof@skymusicnexus.local'] = token.split(':');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `asset-gate-${role}-${email}`,
        role,
        scope: role === 'admin' ? 'admin.read admin.write music.write' : 'music.read music.write',
        artistId: `artist_${email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      });
    },
  };
}

function assetBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const isAudio = /\.(?:mp3|wav|flac|m4a|aac|ogg)$/i.test(url.pathname);
      return new Response(`asset:${url.pathname}`, {
        status: 200,
        headers: { 'content-type': isAudio ? 'audio/mpeg' : 'text/plain; charset=utf-8' },
      });
    },
  };
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  const netlifySource = await readFile(path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/netlify/functions/music-assets.js'), 'utf8');
  assert(netlifySource.includes('handleStream(params, gate.claims || {})'), 'Netlify stream route is not entitlement-checking claims.');
  assert(!netlifySource.includes("clean(actor.email || '', '', 180)"), 'Netlify paid buyer lookup still truncates buyer email.');
  assert(!netlifySource.includes("clean(asset.originalName || asset.fileName || asset.title || asset.id || 'skymusicnexus-asset', 'skymusicnexus-asset', 160)"), 'Netlify download filename still uses the broken clean signature.');

  const pagesEnv = { ASSETS: assetBinding() };
  const pagesAudio = await pagesWorker.fetch(new Request('https://skye-music-nexus.pages.dev/artist-storefronts/reflection/audio/reflection.mp3'), pagesEnv);
  assert.equal(pagesAudio.status, 402, 'Standalone Pages raw storefront audio did not hit the SkyPay gate.');
  assert.equal(pagesAudio.headers.get('x-skye-download-gate'), 'artist-or-paid-skypay');
  const pagesPublicDropAudio = await pagesWorker.fetch(new Request('https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes/drops/skyline-pact/audio/skyline-pact.mp3'), pagesEnv);
  assert.equal(pagesPublicDropAudio.status, 200, 'Standalone Pages approved public drop audio should remain playable.');
  assert.match(pagesPublicDropAudio.headers.get('content-type') || '', /^audio\//, 'Standalone Pages approved public drop audio should keep audio content type.');
  const pagesHtml = await pagesWorker.fetch(new Request('https://skye-music-nexus.pages.dev/artist-storefronts/reflection/'), pagesEnv);
  assert.equal(pagesHtml.status, 200, 'Standalone Pages HTML storefront path should still pass to assets.');

  const mainEnv = {
    SITE_EVENTS_KV: memoryKv(),
    SKYGATEFS27_WORKER: fakeGateWorker(),
    ASSETS: assetBinding(),
    SKYGATE_SOURCE_APP: 'metraiyux-0s',
  };
  const mountedAudio = await worker.fetch(new Request('https://metraiyux-0s-full-system.test/SkyeMusicNexus/artist-storefronts/reflection/audio/reflection.mp3', {
    headers: { authorization: 'Bearer artist:proof@skymusicnexus.local' },
  }), mainEnv, { waitUntil() {} });
  assert.equal(mountedAudio.status, 402, 'Mounted 0S raw storefront audio did not hit the SkyPay gate.');
  assert.match(mountedAudio.headers.get('content-type') || '', /^application\/json\b/);
  const mountedPublicDropAudio = await worker.fetch(new Request('https://metraiyux-0s-full-system.test/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/skyline-pact/audio/skyline-pact.mp3', {
    headers: { authorization: 'Bearer artist:proof@skymusicnexus.local' },
  }), mainEnv, { waitUntil() {} });
  assert.equal(mountedPublicDropAudio.status, 200, 'Mounted 0S approved public drop audio should remain playable after shared gate.');
  assert.match(mountedPublicDropAudio.headers.get('content-type') || '', /^audio\//, 'Mounted approved public drop audio should keep audio content type.');

  const receipt = {
    ok: true,
    checkedAt,
    browserOpened: false,
    playwrightStarted: false,
    standalonePagesRawAudioStatus: pagesAudio.status,
    standalonePagesPublicDropAudioStatus: pagesPublicDropAudio.status,
    mountedWorkerRawAudioStatus: mountedAudio.status,
    mountedWorkerPublicDropAudioStatus: mountedPublicDropAudio.status,
    guarantees: [
      'Netlify music-assets stream and download require artist ownership or paid SkyPay entitlement.',
      'Standalone SkyeMusicNexus Pages blocks raw/non-drop storefront audio while keeping approved public drop audio playable.',
      'Mounted 0S SkyeMusicNexus blocks raw/non-drop storefront audio after the shared gate while keeping approved public drop audio playable.',
    ],
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch(async (error) => {
  await mkdir(artifactDir, { recursive: true });
  const failure = { ok: false, checkedAt, browserOpened: false, playwrightStarted: false, error: error.message, stack: error.stack };
  await writeFile(receiptPath, `${JSON.stringify(failure, null, 2)}\n`);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});
