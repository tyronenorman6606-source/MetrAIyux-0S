#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const pagesBase = (process.env.MUSIC_NEXUS_PAGES_BASE || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const workerBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts/reflection-and-collective-drops/audio-quality-hold-live-direct-smoke-latest.json',
);

const heldDrops = [
  {
    title: 'Wooooah Factor',
    productId: 'prod_gray_skyes_wooooah_factor',
    page: '/artist-storefronts/gray-skyes/drops/wooooah-factor/',
    audio: '/artist-storefronts/gray-skyes/drops/wooooah-factor/audio/wooooah-factor.mp3',
  },
  {
    title: 'Velvet Ledger',
    productId: 'prod_sam_smith_velvet_ledger',
    page: '/artist-storefronts/sam-smith/drops/velvet-ledger/',
    audio: '/artist-storefronts/sam-smith/drops/velvet-ledger/audio/velvet-ledger.mp3',
  },
  {
    title: 'Storefront Weather',
    productId: 'prod_sam_smith_storefront_weather',
    page: '/artist-storefronts/sam-smith/drops/storefront-weather/',
    audio: '/artist-storefronts/sam-smith/drops/storefront-weather/audio/storefront-weather.mp3',
  },
  {
    title: 'Owner Mode',
    productId: 'prod_gray_skyes_owner_mode',
    page: '/artist-storefronts/gray-skyes/drops/owner-mode/',
    audio: '/artist-storefronts/gray-skyes/drops/owner-mode/audio/owner-mode.mp3',
  },
  {
    title: 'Glass At The Line',
    productId: 'prod_artist_live_browser_20260524113443_glass_at_the_line',
    page: '/artist-storefronts/artist-live-browser-20260524113443/drops/glass-at-the-line/',
    audio: '/artist-storefronts/artist-live-browser-20260524113443/drops/glass-at-the-line/audio/glass-at-the-line.mp3',
  },
  {
    title: 'Neon Glass Relay',
    productId: 'prod_artist_live_browser_20260524113443_neon_glass_relay',
    page: '/artist-storefronts/artist-live-browser-20260524113443/drops/neon-glass-relay/',
    audio: '/artist-storefronts/artist-live-browser-20260524113443/drops/neon-glass-relay/audio/neon-glass-relay.mp3',
  },
];

const activeAudioChecks = [
  '/artist-storefronts/music-4u/drops/receipts-in-the-sun/audio/receipts-in-the-sun.mp3',
  '/artist-storefronts/music-4u/drops/skyline-service/audio/skyline-service.mp3',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {redirect: options.redirect || 'follow', signal: AbortSignal.timeout(30000)});
  const text = await response.text();
  return {
    url,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    text,
  };
}

async function fetchBytes(url, options = {}) {
  const response = await fetch(url, {redirect: options.redirect || 'follow', signal: AbortSignal.timeout(30000)});
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    url,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    bytes: buffer.length,
    preview: buffer.toString('utf8', 0, Math.min(buffer.length, 220)),
  };
}

async function main() {
  const receipt = {
    ok: false,
    checkedAt: new Date().toISOString(),
    pagesBase,
    workerBase,
    checks: [],
  };

  const catalog = await fetchText(`${pagesBase}/public/data/playlists.json`);
  const catalogJson = JSON.parse(catalog.text);
  assert(catalog.status === 200, `catalog returned ${catalog.status}`);
  assert(catalogJson.totals?.tracks === 48, `expected 48 active tracks, got ${catalogJson.totals?.tracks}`);
  const catalogText = JSON.stringify(catalogJson);
  for (const held of heldDrops) {
    assert(!catalogText.includes(held.productId), `${held.title} still appears in active playlist catalog`);
  }
  receipt.checks.push({surface: 'catalog', status: catalog.status, totals: catalogJson.totals});

  for (const held of heldDrops) {
    const page = await fetchText(`${pagesBase}${held.page}`);
    assert(page.status === 200, `${held.title} page returned ${page.status}`);
    assert(page.text.includes('Produced by Gray London Skyes'), `${held.title} page missing producer credit`);
    assert(page.text.includes('held for remaster') || page.text.includes('Founder review queued'), `${held.title} page missing hold copy`);
    assert(!/<audio[^>]+src=/i.test(page.text), `${held.title} page still exposes a playable audio src`);

    const audio = await fetchBytes(`${pagesBase}${held.audio}`);
    const contentType = audio.headers['content-type'] || '';
    const isAcceptableHold = [404, 410].includes(audio.status) ||
      (audio.status === 200 && !/audio\/mpeg/i.test(contentType) && audio.bytes < 256 && /Audio held/i.test(audio.preview));
    assert(isAcceptableHold, `${held.title} audio route is still promoted as audio: status=${audio.status} type=${contentType} bytes=${audio.bytes}`);
    receipt.checks.push({
      surface: 'held-drop',
      title: held.title,
      pageStatus: page.status,
      audioStatus: audio.status,
      audioContentType: contentType,
      audioBytes: audio.bytes,
    });
  }

  for (const route of activeAudioChecks) {
    const audio = await fetchBytes(`${pagesBase}${route}`);
    assert(audio.status === 200, `${route} returned ${audio.status}`);
    assert(
      /audio\//i.test(audio.headers['content-type'] || '') || audio.preview.startsWith('ID3'),
      `${route} is not serving audio`,
    );
    assert(audio.bytes > 1_000_000, `${route} looks too small to be an active music file: ${audio.bytes}`);
    receipt.checks.push({surface: 'active-audio', route, status: audio.status, bytes: audio.bytes});
  }

  const creationBin = await fetchText(`${pagesBase}/song-creation-bin/index.json`, {redirect: 'manual'});
  assert([404, 410].includes(creationBin.status), `song creation bin should stay private on Pages, got ${creationBin.status}`);
  receipt.checks.push({surface: 'creation-bin-private', status: creationBin.status});

  const workerGate = await fetchText(`${workerBase}/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/wooooah-factor/`, {
    redirect: 'manual',
  });
  assert([301, 302, 303, 307, 308].includes(workerGate.status), `worker unauth gate returned ${workerGate.status}`);
  assert((workerGate.headers.location || '').includes('/admin/login.html'), 'worker unauth gate did not redirect to shared login');
  receipt.checks.push({surface: 'worker-unauth-gate', status: workerGate.status, location: workerGate.headers.location || ''});

  receipt.ok = true;
  fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
  fs.writeFileSync(receiptPath, `${JSON.stringify({ok: false, checkedAt: new Date().toISOString(), error: String(error?.stack || error)}, null, 2)}\n`);
  console.error(error.stack || error.message);
  process.exit(1);
});
