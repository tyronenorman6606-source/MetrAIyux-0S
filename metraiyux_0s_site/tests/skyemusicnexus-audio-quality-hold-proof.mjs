import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const proofPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/skyemusicnexus-audio-quality-hold-proof-latest.json');

const heldDrops = [
  {
    title: 'Wooooah Factor',
    productFile: 'gray-skyes/products/products.json',
    productId: 'prod_gray_skyes_wooooah_factor',
    dropHtml: 'gray-skyes/drops/wooooah-factor/index.html',
    audioFile: 'gray-skyes/drops/wooooah-factor/audio/wooooah-factor.mp3',
  },
  {
    title: 'Velvet Ledger',
    productFile: 'sam-smith/products/products.json',
    productId: 'prod_sam_smith_velvet_ledger',
    dropHtml: 'sam-smith/drops/velvet-ledger/index.html',
    audioFile: 'sam-smith/drops/velvet-ledger/audio/velvet-ledger.mp3',
  },
  {
    title: 'Storefront Weather',
    productFile: 'sam-smith/products/products.json',
    productId: 'prod_sam_smith_storefront_weather',
    dropHtml: 'sam-smith/drops/storefront-weather/index.html',
    audioFile: 'sam-smith/drops/storefront-weather/audio/storefront-weather.mp3',
  },
  {
    title: 'Owner Mode',
    productFile: 'gray-skyes/products/products.json',
    productId: 'prod_gray_skyes_owner_mode',
    dropHtml: 'gray-skyes/drops/owner-mode/index.html',
    audioFile: 'gray-skyes/drops/owner-mode/audio/owner-mode.mp3',
  },
  {
    title: 'Glass At The Line',
    productFile: 'artist-live-browser-20260524113443/products/products.json',
    productId: 'prod_artist_live_browser_20260524113443_glass_at_the_line',
    dropHtml: 'artist-live-browser-20260524113443/drops/glass-at-the-line/index.html',
    audioFile: 'artist-live-browser-20260524113443/drops/glass-at-the-line/audio/glass-at-the-line.mp3',
  },
  {
    title: 'Neon Glass Relay',
    productFile: 'artist-live-browser-20260524113443/products/products.json',
    productId: 'prod_artist_live_browser_20260524113443_neon_glass_relay',
    dropHtml: 'artist-live-browser-20260524113443/drops/neon-glass-relay/index.html',
    audioFile: 'artist-live-browser-20260524113443/drops/neon-glass-relay/audio/neon-glass-relay.mp3',
  },
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function productsFrom(file) {
  const payload = readJson(path.join(storefrontRoot, file));
  return Array.isArray(payload) ? payload : payload.products || [];
}

const catalog = readJson(path.join(nexusRoot, 'public/data/playlists.json'));
const catalogText = JSON.stringify(catalog);
const results = [];

for (const held of heldDrops) {
  const products = productsFrom(held.productFile);
  const product = products.find((item) => (item.productId || item.id) === held.productId);
  assert(product, `${held.title} product missing`);
  assert(product.status === 'draft-quality-hold', `${held.title} not held`);
  assert(product.qualityGate?.status === 'held_for_remaster', `${held.title} missing quality gate`);
  assert(product.producerCredit === 'Produced by Gray London Skyes', `${held.title} missing producer credit`);
  assert(!product.audioFile && !product.audioUrl && !product.streamUrl, `${held.title} still has public audio route in product data`);

  const htmlFile = path.join(storefrontRoot, held.dropHtml);
  const html = fs.readFileSync(htmlFile, 'utf8');
  assert(html.includes('Produced by Gray London Skyes'), `${held.title} drop missing producer credit`);
  assert(html.includes('Remaster queued') || html.includes('held for remaster'), `${held.title} drop missing hold messaging`);
  assert(!/<audio[^>]+src=/i.test(html), `${held.title} drop still has playable audio src`);

  const heldAudioPath = path.join(storefrontRoot, held.audioFile);
  assert(fs.existsSync(heldAudioPath), `${held.title} hold tombstone missing`);
  const heldAudioText = fs.readFileSync(heldAudioPath, 'utf8');
  assert(heldAudioText.includes('Audio held for remaster'), `${held.title} hold tombstone is not a remaster hold`);
  assert(fs.statSync(heldAudioPath).size < 256, `${held.title} hold tombstone is too large and may still be audio`);
  assert(!catalogText.includes(held.productId), `${held.title} still appears in playlist catalog`);
  results.push({title: held.title, productId: held.productId, status: product.status});
}

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  heldCount: results.length,
  catalogTracks: catalog.totals?.tracks || catalog.tracks?.length || 0,
  producerCredit: 'Produced by Gray London Skyes',
  held: results,
};

fs.mkdirSync(path.dirname(proofPath), {recursive: true});
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
