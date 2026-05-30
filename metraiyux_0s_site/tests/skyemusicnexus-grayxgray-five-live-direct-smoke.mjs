#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const pagesBase = (process.env.MUSIC_NEXUS_PAGES_BASE || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const workerBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts/reflection-and-collective-drops/skyemusicnexus-grayxgray-five-live-direct-smoke-latest.json',
);

const removedRoutes = [
  '/artist-storefronts/gray-skyes/drops/wooooah-factor/',
  '/artist-storefronts/sam-smith/drops/velvet-ledger/',
  '/artist-storefronts/sam-smith/drops/storefront-weather/',
  '/artist-storefronts/gray-skyes/drops/owner-mode/',
  '/artist-storefronts/artist-live-browser-20260524113443/drops/glass-at-the-line/',
  '/artist-storefronts/artist-live-browser-20260524113443/drops/neon-glass-relay/',
];

const privateCreationBinRoutes = [
  '/song-creation-bin/reflection/wooooah-factor/wooooah-factor.mp3',
  '/song-creation-bin/reflection/wooooah-factor/creation-receipt.json',
  '/song-creation-bin/gray-x-gray-five/core-switch-riot/creation-receipt.json',
  '/song-creation-bin/gray-x-gray-five/final-boss-calendar/lyrics.md',
];

const removedProductIds = [
  'prod_gray_skyes_wooooah_factor',
  'prod_gray_skyes_brain_wooooah_factor',
  'prod_sam_smith_velvet_ledger',
  'prod_gray_skyes_velvet_ledger',
  'prod_sam_smith_storefront_weather',
  'prod_gray_skyes_owner_mode',
  'prod_artist_live_browser_20260524113443_glass_at_the_line',
  'prod_artist_live_browser_20260524113443_neon_glass_relay',
  'prod_artist_network_20260524122314_neon_glass_relay',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {redirect: options.redirect || 'follow', signal: AbortSignal.timeout(30000)});
  const text = await response.text();
  return {url, status: response.status, headers: Object.fromEntries(response.headers.entries()), text};
}

async function main() {
  const receipt = {
    ok: false,
    checkedAt: new Date().toISOString(),
    pagesBase,
    workerBase,
    checks: [],
  };

  for (const route of removedRoutes) {
    const response = await fetchText(`${pagesBase}${route}`, {redirect: 'manual'});
    assert(response.status === 404, `${route} expected 404, got ${response.status}`);
    assert((response.headers['cache-control'] || '').includes('no-store'), `${route} missing no-store cache guard`);
    receipt.checks.push({surface: 'removed-route', route, status: response.status, cacheControl: response.headers['cache-control'] || ''});
  }

  for (const route of privateCreationBinRoutes) {
    const response = await fetchText(`${pagesBase}${route}`, {redirect: 'manual'});
    assert(response.status === 404, `${route} expected private 404, got ${response.status}`);
    assert((response.headers['cache-control'] || '').includes('no-store'), `${route} missing no-store cache guard`);
    assert(!response.text.includes('ID3'), `${route} exposed audio bytes`);
    assert(!response.text.includes('Core Switch Riot'), `${route} exposed private creation copy`);
    receipt.checks.push({surface: 'private-creation-bin', route, status: response.status, cacheControl: response.headers['cache-control'] || ''});
  }

  const release = await fetchText(`${pagesBase}/artist-storefronts/gray-skyes-collective/releases/gray-x-gray-five/`);
  assert(release.status === 200, `Gray x Gray Five release returned ${release.status}`);
  for (const text of ['Gray x Gray Five', 'Core Switch Riot', 'Proof Dog No Collar', 'Night Shift Seraph', 'Blackbox Halo', 'Final Boss Calendar', 'Produced by Gray London Skyes']) {
    assert(release.text.includes(text), `release missing ${text}`);
  }
  assert(!/<audio[^>]+src=/i.test(release.text), 'release should not expose audio before approved masters');
  receipt.checks.push({surface: 'release', status: release.status});

  const grayProducts = await fetchText(`${pagesBase}/artist-storefronts/gray-skyes/products/`);
  const brainProducts = await fetchText(`${pagesBase}/artist-storefronts/gray-skyes-brain/products/`);
  assert(grayProducts.status === 200, `Gray products returned ${grayProducts.status}`);
  assert(brainProducts.status === 200, `Brain products returned ${brainProducts.status}`);
  assert(grayProducts.text.includes('Core Switch Riot (Gray x Gray Five)'), 'Gray product room missing collab');
  assert(brainProducts.text.includes('Core Switch Riot (Gray x Gray Five)'), 'Brain product room missing collab');
  receipt.checks.push({surface: 'product-rooms', grayStatus: grayProducts.status, brainStatus: brainProducts.status});

  const catalog = await fetchText(`${pagesBase}/public/data/playlists.json`);
  assert(catalog.status === 200, `catalog returned ${catalog.status}`);
  const catalogJson = JSON.parse(catalog.text);
  const catalogText = JSON.stringify(catalogJson);
  for (const productId of removedProductIds) {
    assert(!catalogText.includes(productId), `${productId} still exists in live catalog`);
  }
  receipt.checks.push({surface: 'catalog', status: catalog.status, totals: catalogJson.totals});

  const workerGate = await fetchText(`${workerBase}/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/gray-x-gray-five/`, {redirect: 'manual'});
  assert([301, 302, 303, 307, 308].includes(workerGate.status), `worker gate expected redirect, got ${workerGate.status}`);
  assert((workerGate.headers.location || '').includes('/admin/login.html'), 'worker route did not redirect to shared login');
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
