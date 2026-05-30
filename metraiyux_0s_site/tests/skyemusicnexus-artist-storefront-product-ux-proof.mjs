#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const storefrontRoot = path.join(siteRoot, 'SkyeMusicNexus/artist-storefronts');
const redoReceipt = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/artist-storefront-product-redo-latest.json');
const proofPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/artist-storefront-product-ux-proof-latest.json');

function fail(message, detail = {}) {
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function assert(condition, message, detail = {}) {
  if (!condition) fail(message, detail);
}

function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function hrefsFrom(html) {
  return [...html.matchAll(/\bhref=(["'])(.*?)\1/g)].map((match) => match[2]);
}

function localTarget(file, href) {
  if (!href || href.startsWith('#') || /^(?:https?:)?\/\//i.test(href) || href.startsWith('mailto:')) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.startsWith('/')) return path.join(siteRoot, clean.replace(/^\/+/, ''));
  return path.resolve(path.dirname(file), clean);
}

function existsAsSurface(target) {
  if (!target) return true;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory() && fs.existsSync(path.join(target, 'index.html'))) return true;
  if (target.endsWith('/')) return fs.existsSync(path.join(target, 'index.html'));
  return false;
}

const receipt = readJson(redoReceipt);
assert(receipt.schema === 'skyemusicnexus.artist-storefront-product-redo.v1', 'unexpected redo receipt schema', {schema: receipt.schema});
assert(receipt.artists.length >= 30, 'expected product rooms for the full artist roster', {artists: receipt.artists.length});

const allHtmlFiles = listHtmlFiles(storefrontRoot);
const badLabels = [];
const badProductJsonLinks = [];
for (const file of allHtmlFiles) {
  const html = read(file);
  if (/Live Product Record|Product Blueprint/.test(html)) badLabels.push(path.relative(repoRoot, file));
  for (const href of hrefsFrom(html)) {
    if (/products\/products\.json(?:$|[?#])/.test(href)) badProductJsonLinks.push({file: path.relative(repoRoot, file), href});
  }
}
assert(!badLabels.length, 'raw product labels remain in public HTML', {badLabels});
assert(!badProductJsonLinks.length, 'public product links still point to products/products.json', {badProductJsonLinks});

const registryFiles = [
  path.join(storefrontRoot, 'index.html'),
  path.join(storefrontRoot, 'artist-apps/index.html'),
  path.join(storefrontRoot, 'local-artists/index.html'),
  path.join(storefrontRoot, 'local-artists/collective-personality-profiles.html'),
];
for (const file of registryFiles) {
  const html = read(file);
  assert(html.includes('Shop Products'), 'registry missing product-room CTA', {file: path.relative(repoRoot, file)});
  assert(!/\bhref=(["']).*?\.json(?:[?#].*)?\1/.test(html), 'registry still exposes JSON as navigation', {file: path.relative(repoRoot, file)});
  const broken = hrefsFrom(html)
    .map((href) => ({href, target: localTarget(file, href)}))
    .filter((link) => link.target && /\.(?:html)$|\/$/.test(link.href.split('#')[0].split('?')[0]))
    .filter((link) => !existsAsSurface(link.target));
  assert(!broken.length, 'registry has broken local HTML/surface links', {file: path.relative(repoRoot, file), broken});
}

const productRoomFailures = [];
for (const artist of receipt.artists) {
  const file = path.join(storefrontRoot, artist.slug, 'products/index.html');
  if (!fs.existsSync(file)) {
    productRoomFailures.push({slug: artist.slug, reason: 'missing products/index.html'});
    continue;
  }
  const html = read(file);
  const hasProducts = Number(artist.products || 0) > 0;
  if (!html.includes('product-room')) productRoomFailures.push({slug: artist.slug, reason: 'missing product room layout'});
  if (!html.includes('SkyePay Checkout') && !html.includes('Checkout pending')) productRoomFailures.push({slug: artist.slug, reason: 'missing checkout state'});
  if (!html.includes('Share')) productRoomFailures.push({slug: artist.slug, reason: 'missing share action'});
  if (hasProducts && !html.includes('nexus-player.js')) productRoomFailures.push({slug: artist.slug, reason: 'missing canonical player script'});
  if (hasProducts && !html.includes('data-nexus-track-id')) productRoomFailures.push({slug: artist.slug, reason: 'missing native audio track id'});
  if (hasProducts && (!html.includes('data-checkout-product') || !html.includes('data-select-product'))) productRoomFailures.push({slug: artist.slug, reason: 'product cards are not interactive'});
  if (/Live Product Record|Product Blueprint|href=(["']).*?products\/products\.json(?:[?#].*)?\1/.test(html)) productRoomFailures.push({slug: artist.slug, reason: 'raw product record exposed'});
}
assert(!productRoomFailures.length, 'product room proof failed', {productRoomFailures});

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  artists: receipt.artists.length,
  htmlFiles: allHtmlFiles.length,
  registryFiles: registryFiles.map((file) => path.relative(repoRoot, file)),
  sampleProductRooms: [
    '/SkyeMusicNexus/artist-storefronts/gray-skyes/products/',
    '/SkyeMusicNexus/artist-storefronts/dj-ajay/products/',
    '/SkyeMusicNexus/artist-storefronts/supaboy/products/',
  ],
  guarantees: [
    'no Live Product Record/Product Blueprint labels remain in artist-storefront HTML',
    'no public product href points to products/products.json',
    'all receipt artists have a products/index.html product room',
    'registry product links resolve to local product-room surfaces',
    'product rooms mount the canonical MusicNexus player and native audio tracking ids',
  ],
};
fs.mkdirSync(path.dirname(proofPath), {recursive: true});
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
