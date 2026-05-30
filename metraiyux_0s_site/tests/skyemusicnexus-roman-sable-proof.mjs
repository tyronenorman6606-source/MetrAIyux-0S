#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const romanSlug = 'artist-live-browser-20260524113443';
const sableSlug = 'artist-network-20260524122314';
const catalogPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const creationBinRoot = path.join(nexusRoot, 'song-creation-bin', 'singles');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-roman-sable-proof-latest.json',
);

const expectedDrops = [
  {
    title: 'Glass At The Line',
    slug: 'glass-at-the-line',
    primarySlug: romanSlug,
    artistName: 'Roman Glass',
    collaborators: ['Roman Glass'],
  },
  {
    title: 'Neon Glass Relay',
    slug: 'neon-glass-relay',
    primarySlug: romanSlug,
    artistName: 'Roman Glass',
    collaborators: ['Roman Glass', 'Sable June'],
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function productsFor(slug) {
  const file = path.join(storefrontRoot, slug, 'products', 'products.json');
  const payload = readJson(file);
  return Array.isArray(payload) ? payload : payload.products || [];
}

function localPathFromPublicUrl(url) {
  if (!url) return '';
  const clean = String(url)
    .replace(/^https:\/\/skye-music-nexus\.pages\.dev\//, '')
    .replace(/^\/SkyeMusicNexus\//, '')
    .replace(/^\/+/, '');
  return path.join(nexusRoot, clean);
}

const catalog = readJson(catalogPath);
assert(catalog.schema === 'skyemusicnexus.playlists.v1', 'playlist catalog schema mismatch');

const proofDrops = [];
for (const expected of expectedDrops) {
  const dropDir = path.join(storefrontRoot, expected.primarySlug, 'drops', expected.slug);
  const audioFile = path.join(dropDir, 'audio', `${expected.slug}.mp3`);
  const htmlFile = path.join(dropDir, 'index.html');
  const visualPackageFile = path.join(dropDir, 'pics2vid', 'package.json');
  const receiptFile = path.join(creationBinRoot, expected.slug, 'creation-receipt.json');
  const promptFile = path.join(creationBinRoot, expected.slug, 'prompt.txt');

  assert(fs.existsSync(htmlFile), `${expected.title} drop page missing`);
  assert(fs.existsSync(audioFile), `${expected.title} audio missing`);
  assert(fs.statSync(audioFile).size > 100000, `${expected.title} audio is too small to be a generated track`);
  assert(fs.existsSync(visualPackageFile), `${expected.title} Pics2Vid package missing`);
  assert(fs.existsSync(receiptFile), `${expected.title} creation receipt missing`);
  assert(fs.existsSync(promptFile), `${expected.title} prompt receipt missing`);

  const html = readText(htmlFile);
  assert(html.includes(expected.title), `${expected.title} page missing title`);
  assert(html.includes('nexus-player.js'), `${expected.title} page missing canonical player`);
  assert(html.includes('https://skye-music-nexus.pages.dev/'), `${expected.title} page missing public audio origin`);

  const visualPackage = readJson(visualPackageFile);
  assert(visualPackage.status === 'ready_for_still2vid_export', `${expected.title} Pics2Vid package not ready`);
  assert(visualPackage.sourceImages.length >= expected.collaborators.length, `${expected.title} missing collaborator images`);

  const creationReceipt = readJson(receiptFile);
  assert(creationReceipt.provider.id === 'openai-tts', `${expected.title} provider receipt mismatch`);
  assert(creationReceipt.languagePolicy.required === 'English only', `${expected.title} receipt missing English-only policy`);
  for (const collaborator of expected.collaborators) {
    assert(
      creationReceipt.artists.some((artist) => artist.stageName === collaborator),
      `${expected.title} receipt missing collaborator ${collaborator}`,
    );
  }

  const prompt = readText(promptFile);
  assert(prompt.includes(expected.title), `${expected.title} prompt did not store the title`);
  assert(prompt.includes('original English rhythmic vocal demo'), `${expected.title} prompt missing OpenAI speech performance direction`);

  const catalogTrack = catalog.tracks.find((track) => track.title === expected.title);
  assert(catalogTrack, `${expected.title} missing from playlist catalog`);
  assert(catalogTrack.artistName === expected.artistName, `${expected.title} catalog artist mismatch`);
  assert(catalogTrack.audioUrl.startsWith('https://skye-music-nexus.pages.dev/'), `${expected.title} catalog audio not public Pages URL`);
  assert(fs.existsSync(localPathFromPublicUrl(catalogTrack.audioUrl)), `${expected.title} catalog audio target missing`);

  proofDrops.push({
    title: expected.title,
    provider: creationReceipt.provider.id,
    bytes: fs.statSync(audioFile).size,
    dropUrl: `/SkyeMusicNexus/artist-storefronts/${expected.primarySlug}/drops/${expected.slug}/`,
    pics2vidImages: visualPackage.sourceImages.length,
    productId: creationReceipt.files.productId,
  });
}

const romanProducts = productsFor(romanSlug);
const sableProducts = productsFor(sableSlug);
assert(romanProducts.some((product) => product.title === 'Glass At The Line' && product.status === 'active' && product.pwaUrl), 'Roman product missing Glass At The Line');
assert(romanProducts.some((product) => product.title === 'Neon Glass Relay' && product.status === 'active' && product.pwaUrl), 'Roman product missing Neon Glass Relay');
assert(sableProducts.some((product) => product.title === 'Neon Glass Relay' && product.status === 'active' && product.pwaUrl), 'Sable product missing Neon Glass Relay');

for (const [slug, expectedTitles] of [
  [romanSlug, ['Glass At The Line', 'Neon Glass Relay']],
  [sableSlug, ['Neon Glass Relay']],
]) {
  const html = readText(path.join(storefrontRoot, slug, 'products', 'index.html'));
  for (const title of expectedTitles) assert(html.includes(title), `${slug} product room missing ${title}`);
  assert(!/href=["'][^"']*products\/products\.json/i.test(html), `${slug} product room exposes raw products.json`);
}

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  catalogTotals: catalog.totals,
  drops: proofDrops,
  storefrontProductCounts: {
    roman: romanProducts.length,
    sable: sableProducts.length,
  },
};

fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
