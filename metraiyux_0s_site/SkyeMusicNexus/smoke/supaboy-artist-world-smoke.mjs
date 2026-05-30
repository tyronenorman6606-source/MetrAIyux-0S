import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd());
const supa = path.join(root, 'artist-storefronts', 'supaboy');
const receiptPath = path.join(root, 'proof', 'supaboy-artist-world-smoke-latest.json');
const failures = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(supa, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(supa, rel));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function localRefs(html, fileRel) {
  const refs = [];
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const ref = match[1];
    if (!ref || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(ref)) continue;
    const fileRef = ref.split('#')[0].split('?')[0];
    if (!fileRef) continue;
    if (ref.startsWith('/')) {
      refs.push({ ref, resolved: path.join(root, fileRef.replace(/^\/SkyeMusicNexus\//, '').replace(/^\//, '')) });
    } else {
      refs.push({ ref, resolved: path.resolve(path.dirname(path.join(supa, fileRel)), fileRef) });
    }
  }
  return refs;
}

function checkHtml(fileRel, markers) {
  const html = read(fileRel);
  assert(!/src=["']["']/.test(html), `${fileRel} has an empty src attribute`);
  assert(!/href=["']["']/.test(html), `${fileRel} has an empty href attribute`);
  assert(!/nexus-player\.(?:js|css)/.test(html), `${fileRel} should not mount the global Nexus player`);
  markers.forEach((marker) => assert(html.includes(marker), `${fileRel} missing marker: ${marker}`));
  for (const { ref, resolved } of localRefs(html, fileRel)) {
    assert(fs.existsSync(resolved), `${fileRel} local reference missing: ${ref}`);
  }
  return html;
}

assert(exists('assets/supaboy-world.css'), 'missing SupaBoy world CSS');
assert(exists('assets/supaboy-world.js'), 'missing SupaBoy world JS');
assert(exists('products/products.json'), 'missing SupaBoy products JSON');
assert(exists('welcome-pack/index.html'), 'missing SupaBoy personalized welcome pack');

const indexHtml = checkHtml('index.html', [
  'SUPABOY',
  'Nigerian roots. Chicago pressure. Houston proof.',
  'SLB / Superboy',
  '24 Hr In Houston',
  'iamsuperboy2x'
]);

const welcomeHtml = checkHtml('welcome.html', [
  'Welcome to',
  'Skye Music Nexus,',
  'SupaBoy-only artist ID',
  'This is the page Gray can send you',
  'welcome-pack/',
  'Upload Song'
]);

const welcomePackHtml = checkHtml('welcome-pack/index.html', [
  'SupaBoy',
  'welcome pack.',
  'actual builds and apps',
  'how to upload a song',
  '444666666667',
  'Upload Gated Audio',
  'Release Forge',
  'Rights Vault',
  'Artist Apps'
]);

const productsHtml = checkHtml('products/index.html', [
  'Product Desk.',
  'checkout locked',
  'SLB / Superboy',
  '24 Hr In Houston',
  'Welcome Pack',
  'data-product-roster'
]);

assert(!welcomeHtml.includes('SkyeMusicNexus, SupaBoy'), 'welcome header still uses merged SkyeMusicNexus wording');
assert(indexHtml.includes('data-stage="houston"'), 'storefront stage switcher missing Houston control');
assert(productsHtml.includes('data-product-grid'), 'product grid mount missing');

const products = JSON.parse(read('products/products.json'));
assert(products.artistId === '444666666667', 'products JSON has wrong artist ID');
assert(Array.isArray(products.products) && products.products.length >= 4, 'products JSON needs at least four staged SupaBoy lanes');
for (const product of products.products || []) {
  assert(product.artistId === '444666666667', `${product.productId} has wrong artist ID`);
  assert(product.title && product.description && product.coverImage, `${product.productId} missing title, description, or cover`);
  assert(fs.existsSync(path.resolve(path.join(supa, 'products'), product.coverImage)), `${product.productId} cover missing: ${product.coverImage}`);
  if (!product.audioFile) {
    assert(product.checkoutEnabled === false, `${product.productId} has checkout enabled without audio`);
    assert(product.status !== 'active', `${product.productId} is active without audio`);
  }
}

const mediaRequired = [
  'media/hero-night.webp',
  'media/slb-cover.webp',
  'media/houston-proof.webp',
  'media/chicago-block.webp',
  'media/green-wall.webp',
  'media/night-motion.webp'
];
mediaRequired.forEach((rel) => assert(exists(rel), `missing required SupaBoy media: ${rel}`));

const oldSelectors = read('assets/supaboy-world.js').match(/data-detail-/g) || [];
assert(oldSelectors.length === 0, 'old product data-detail selectors still present');

const profile = JSON.parse(read('profile.json'));
assert(profile.welcomePackUrl === './welcome-pack/', 'profile JSON missing welcome pack URL');
assert(String(profile.uploadSongUrl || '').includes('artistId=444666666667'), 'profile JSON missing SupaBoy upload URL');

const allHtml = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) allHtml.push(full);
  }
}
walk(root);

let emptyAttrCount = 0;
let oldVisualPackCount = 0;
for (const file of allHtml) {
  const html = fs.readFileSync(file, 'utf8');
  emptyAttrCount += (html.match(/\b(?:src|href)=["']["']/g) || []).length;
  oldVisualPackCount += (html.match(/\.\.\/tracks\/[^"']+\/pics2vid\//g) || []).length;
}
if (emptyAttrCount) warnings.push(`${emptyAttrCount} empty src/href attributes still exist outside the rebuilt SupaBoy lane`);
if (oldVisualPackCount) warnings.push(`${oldVisualPackCount} legacy ../tracks/.../pics2vid links still need cleanup outside SupaBoy`);

const receipt = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  target: supa,
  files: {
    index: path.join(supa, 'index.html'),
    welcome: path.join(supa, 'welcome.html'),
    welcomePack: path.join(supa, 'welcome-pack', 'index.html'),
    products: path.join(supa, 'products', 'index.html'),
    productsJson: path.join(supa, 'products', 'products.json')
  },
  supaboyProductCount: products.products?.length || 0,
  warnings,
  failures
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');

if (failures.length) {
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(receipt, null, 2));
