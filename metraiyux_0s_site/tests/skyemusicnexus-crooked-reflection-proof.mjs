#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-crooked-reflection-proof-latest.json',
);

const expectedDrops = [
  {
    title: 'Skyline Pact',
    slug: 'skyline-pact',
    artistSlug: 'gray-skyes',
    collaboratorSlugs: ['gray-skyes-brain', 'music-4u', 'jessica-walsh'],
  },
  {
    title: 'Neon Drift Relay',
    slug: 'neon-drift-relay',
    artistSlug: 'artist-full-matrix-20260523060758',
    collaboratorSlugs: ['smoke-artist-mpku84sm', 'artist-live-browser-20260523061012', 'music-4u'],
  },
  {
    title: 'Close The Mirror',
    slug: 'close-the-mirror',
    artistSlug: 'gray-skyes',
    collaboratorSlugs: [],
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function productsFor(slug) {
  const filePath = path.join(storefrontRoot, slug, 'products', 'products.json');
  const payload = readJson(filePath);
  return Array.isArray(payload) ? payload : payload.products || [];
}

function assertFile(filePath, minBytes = 1) {
  const stat = fs.statSync(filePath);
  assert(stat.size >= minBytes, `${path.relative(repoRoot, filePath)} expected at least ${minBytes} bytes`);
  return stat.size;
}

const redirects = fs.readFileSync(path.join(nexusRoot, '_redirects'), 'utf8');
assert(redirects.includes('/SkyeMusicNexus/* /:splat 302'), 'Pages prefix redirect missing');

const registryHtml = fs.readFileSync(path.join(storefrontRoot, 'index.html'), 'utf8');
assert(registryHtml.includes('artist-card-media'), 'artist registry missing product-count portrait media');
assert(registryHtml.includes('<figcaption><strong>23 products</strong><span>23 live</span></figcaption>'), 'Gray Skyes product count badge missing');
assert(!registryHtml.includes('products/products.json'), 'artist registry still exposes product JSON href');

const collectiveHtml = fs.readFileSync(path.join(storefrontRoot, 'gray-skyes-collective', 'index.html'), 'utf8');
assert(collectiveHtml.includes('./releases/crooked-reflection/'), 'collective page missing Crooked Reflection link');

const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective', 'releases', 'crooked-reflection');
const releaseHtml = fs.readFileSync(path.join(releaseDir, 'index.html'), 'utf8');
const release = readJson(path.join(releaseDir, 'release.json'));
assert(release.schema === 'skyemusicnexus.collective-release.v1', 'release schema mismatch');
assert(release.title === 'Crooked Reflection', 'release title mismatch');
assert(release.partner === 'Skye Music Nexus', 'release partner mismatch');
assert(release.trackCount >= 31, 'release track count too low');
assert(release.newTrackCount === 3, 'release should pin three new tracks');
assert(!releaseHtml.includes('href="/gray-skyes/"'), 'release contains root-relative bad Gray link');

for (const drop of expectedDrops) {
  const dropDir = path.join(storefrontRoot, drop.artistSlug, 'drops', drop.slug);
  const audioFile = path.join(dropDir, 'audio', `${drop.slug}.mp3`);
  const pwaHtml = fs.readFileSync(path.join(dropDir, 'index.html'), 'utf8');
  const packageDir = path.join(dropDir, 'pics2vid');
  const packageJson = readJson(path.join(packageDir, 'package.json'));
  const imageDir = path.join(packageDir, 'images');
  const imageCount = fs.readdirSync(imageDir).filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file)).length;
  assertFile(audioFile, 1_000_000);
  assert(pwaHtml.includes(drop.title), `${drop.title} PWA missing title`);
  assert(pwaHtml.includes('Open Pics2Vid Package'), `${drop.title} missing visual package link`);
  assert(packageJson.status === 'ready_for_still2vid_export', `${drop.title} visual package not ready`);
  assert(imageCount >= Math.max(1, drop.collaboratorSlugs.length + 1), `${drop.title} missing artist images`);
  assert(release.tracks.some((track) => track.title === drop.title && track.newlyGenerated), `${drop.title} missing from release as new track`);

  const ownerProducts = productsFor(drop.artistSlug);
  assert(ownerProducts.some((product) => String(product.title || '').startsWith(drop.title)), `${drop.title} missing owner product`);
  for (const collaboratorSlug of drop.collaboratorSlugs) {
    const collaboratorProducts = productsFor(collaboratorSlug);
    assert(collaboratorProducts.some((product) => String(product.title || '').startsWith(drop.title)), `${drop.title} missing collaborator product for ${collaboratorSlug}`);
  }
}

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  redirects: true,
  release: {
    trackCount: release.trackCount,
    newTrackCount: release.newTrackCount,
    artistCount: release.artistCount,
    url: release.releaseUrl,
  },
  drops: expectedDrops.map((drop) => ({
    title: drop.title,
    artistSlug: drop.artistSlug,
    audioBytes: fs.statSync(path.join(storefrontRoot, drop.artistSlug, 'drops', drop.slug, 'audio', `${drop.slug}.mp3`)).size,
    collaborators: drop.collaboratorSlugs,
  })),
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
