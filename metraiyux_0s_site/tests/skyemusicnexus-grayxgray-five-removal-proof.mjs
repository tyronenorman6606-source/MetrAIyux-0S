import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const proofPath = path.join(
  repoRoot,
  'test-artifacts/reflection-and-collective-drops/skyemusicnexus-grayxgray-five-removal-proof-latest.json',
);

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

const removedDropDirs = [
  'gray-skyes/drops/wooooah-factor',
  'sam-smith/drops/velvet-ledger',
  'sam-smith/drops/storefront-weather',
  'gray-skyes/drops/owner-mode',
  'artist-live-browser-20260524113443/drops/glass-at-the-line',
  'artist-live-browser-20260524113443/drops/neon-glass-relay',
];

const collabTitles = [
  'Core Switch Riot',
  'Proof Dog No Collar',
  'Night Shift Seraph',
  'Blackbox Halo',
  'Final Boss Calendar',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function productsFrom(file) {
  const payload = readJson(file);
  return Array.isArray(payload) ? payload : payload.products || [];
}

for (const relative of removedDropDirs) {
  assert(!fs.existsSync(path.join(storefrontRoot, relative)), `${relative} still exists`);
}

const productFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'products.json') productFiles.push(file);
  }
};
walk(storefrontRoot);

const productText = productFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const productId of removedProductIds) {
  assert(!productText.includes(productId), `${productId} still exists in public product JSON`);
}

const redirects = fs.readFileSync(path.join(nexusRoot, '_redirects'), 'utf8');
for (const relative of removedDropDirs) {
  const route = `/artist-storefronts/${relative}`;
  assert(redirects.includes(`${route} /404.html 404!`), `${route} missing exact 404 redirect`);
  assert(redirects.includes(`${route}/* /404.html 404!`), `${route} missing splat 404 redirect`);
}

const catalog = readJson(path.join(nexusRoot, 'public/data/playlists.json'));
const catalogText = JSON.stringify(catalog);
for (const productId of removedProductIds) {
  assert(!catalogText.includes(productId), `${productId} still exists in playlist catalog`);
}

const reflection = readJson(path.join(storefrontRoot, 'reflection/project.json'));
assert(!JSON.stringify(reflection).includes('Wooooah Factor'), 'Reflection project still contains Wooooah Factor');

const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective/releases/gray-x-gray-five');
const release = readJson(path.join(releaseDir, 'release.json'));
assert(release.trackCount === 5, `expected 5 Gray x Gray tracks, got ${release.trackCount}`);
for (const title of collabTitles) {
  assert(release.tracks.some((track) => track.title === title), `${title} missing from release`);
}
const releaseHtml = fs.readFileSync(path.join(releaseDir, 'index.html'), 'utf8');
assert(!/<audio[^>]+src=/i.test(releaseHtml), 'Gray x Gray Five should not expose public audio before approved masters');
assert(releaseHtml.includes('Produced by Gray London Skyes'), 'release missing producer credit');

const grayProducts = productsFrom(path.join(storefrontRoot, 'gray-skyes/products/products.json'));
const brainProducts = productsFrom(path.join(storefrontRoot, 'gray-skyes-brain/products/products.json'));
for (const title of collabTitles) {
  const gray = grayProducts.find((product) => product.title === `${title} (Gray x Gray Five)`);
  const brain = brainProducts.find((product) => product.title === `${title} (Gray x Gray Five)`);
  assert(gray, `${title} missing Gray product blueprint`);
  assert(brain, `${title} missing Gray Brain product blueprint`);
  assert(gray.status === 'waiting_finished_audio', `${title} Gray product should wait for audio`);
  assert(brain.status === 'waiting_finished_audio', `${title} Brain product should wait for audio`);
  assert(!gray.audioFile && !brain.audioFile, `${title} should not expose audio`);
  assert(gray.qualityGate?.publicPromotion === false, `${title} Gray quality gate missing`);
  assert(brain.qualityGate?.publicPromotion === false, `${title} Brain quality gate missing`);
}

const collectiveIndex = fs.readFileSync(path.join(storefrontRoot, 'gray-skyes-collective/index.html'), 'utf8');
assert(collectiveIndex.includes('Gray x Gray Five'), 'collective page missing Gray x Gray Five link');

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  removedProductIds: removedProductIds.length,
  removedDropDirs,
  catalogTotals: catalog.totals,
  release: {
    title: release.title,
    trackCount: release.trackCount,
    tracks: release.tracks.map((track) => track.title),
    publicAudioAttached: false,
  },
};

fs.mkdirSync(path.dirname(proofPath), {recursive: true});
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
