import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const title = 'Wooooah Factor';
const songId = 'gray-brain-wooooah-factor';
const dropUrl = '/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/wooooah-factor/';
const proofPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/skyemusicnexus-grayxgray-wooooah-proof-latest.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function productsFrom(file) {
  const payload = readJson(file);
  return Array.isArray(payload) ? payload : payload.products || [];
}

function findTrack(node) {
  if (!node || typeof node !== 'object') return null;
  if (String(node.title || '').includes(title)) return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findTrack(item);
      if (found) return found;
    }
    return null;
  }
  for (const value of Object.values(node)) {
    const found = findTrack(value);
    if (found) return found;
  }
  return null;
}

const dropDir = path.join(storefrontRoot, 'gray-skyes/drops/wooooah-factor');
const audioFile = path.join(dropDir, 'audio/wooooah-factor.mp3');
const dropHtml = fs.readFileSync(path.join(dropDir, 'index.html'), 'utf8');
const audioBytes = fs.statSync(audioFile).size;
assert(audioBytes > 1_000_000, `Wooooah Factor audio too small: ${audioBytes}`);
assert(dropHtml.includes(title), 'drop page missing Wooooah Factor title');
assert(dropHtml.includes('Produced by Gray London Skyes'), 'drop page missing producer credit');
assert(dropHtml.includes('nexus-player.js'), 'drop page missing canonical Nexus player script');
assert(!dropHtml.includes('products.json'), 'drop page should not link users into raw product JSON');

const packageJson = readJson(path.join(dropDir, 'pics2vid/package.json'));
assert(packageJson.status === 'ready_for_still2vid_export', 'Pics2Vid package is not ready');
assert((packageJson.sourceImages || []).length >= 6, 'Pics2Vid package needs Gray and Gray Brain source images');

const creationReceipt = readJson(path.join(nexusRoot, 'song-creation-bin/reflection/wooooah-factor/creation-receipt.json'));
assert(creationReceipt.songId === songId, 'creation receipt song id mismatch');
assert(creationReceipt.provider?.id === 'openai-tts', `unexpected provider ${creationReceipt.provider?.id}`);
assert(creationReceipt.provider?.bytes === audioBytes, 'creation receipt bytes do not match audio file');
assert(creationReceipt.files?.pwaUrl === dropUrl, 'creation receipt drop URL mismatch');

const grayProducts = productsFrom(path.join(storefrontRoot, 'gray-skyes/products/products.json'));
const brainProducts = productsFrom(path.join(storefrontRoot, 'gray-skyes-brain/products/products.json'));
const grayProduct = grayProducts.find((product) => product.title === `${title} (Reflection)` && product.pwaUrl === dropUrl);
const brainProduct = brainProducts.find((product) => product.title === `${title} (Reflection)` && product.pwaUrl === dropUrl);
assert(grayProduct, 'Gray storefront product missing Wooooah Factor');
assert(brainProduct, 'Gray Brain collaborator product missing Wooooah Factor');
assert(grayProduct.producerCredit === 'Produced by Gray London Skyes', 'Gray product missing producer credit');
assert(brainProduct.producerCredit === 'Produced by Gray London Skyes', 'Gray Brain product missing producer credit');
assert(grayProduct.visualPackage?.packageUrl === `${dropUrl}pics2vid/`, 'Gray product visual package mismatch');
assert((grayProduct.splitSheet || []).length === 2, 'split sheet should include both Gray artists');

const reflectionProject = readJson(path.join(storefrontRoot, 'reflection/project.json'));
const reflectionTrack = (reflectionProject.tracks || []).find((track) => track.id === songId);
assert(reflectionTrack?.dropUrl === dropUrl, 'Reflection project missing Wooooah Factor drop link');
assert(reflectionTrack?.audio === './audio/wooooah-factor.mp3', 'Reflection project audio copy missing');
assert(fs.statSync(path.join(storefrontRoot, 'reflection/audio/wooooah-factor.mp3')).size === audioBytes, 'Reflection project audio copy bytes mismatch');

const playlists = readJson(path.join(nexusRoot, 'public/data/playlists.json'));
const playlistTrack = findTrack(playlists);
assert(playlistTrack, 'playlist catalog missing Wooooah Factor');
assert(String(playlistTrack.audioUrl || playlistTrack.localAudioHref || playlistTrack.audio || playlistTrack.audioFile || '').includes('wooooah-factor.mp3'), 'playlist catalog missing Wooooah Factor audio');
assert(playlistTrack.producerCredit === 'Produced by Gray London Skyes', 'playlist catalog missing producer credit');

const proof = {
  ok: true,
  title,
  songId,
  dropUrl,
  audioBytes,
  provider: creationReceipt.provider,
  productIds: [grayProduct.productId, brainProduct.productId],
  pics2vidImages: packageJson.sourceImages.length,
  playlistTrackId: playlistTrack.id || playlistTrack.trackId || '',
  checkedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(proofPath), {recursive: true});
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
