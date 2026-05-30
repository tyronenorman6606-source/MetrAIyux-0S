#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const receiptPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/low-quality-audio-quarantine-latest.json');
const heldAt = new Date().toISOString();
const producerCredit = 'Produced by Gray London Skyes';

const holdTitles = new Set([
  'Wooooah Factor',
  'Wooooah Factor (Reflection)',
  'Velvet Ledger',
  'Glass At The Line',
  'Neon Glass Relay',
  'Storefront Weather',
  'Owner Mode',
]);

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function baseTitle(title = '') {
  return String(title).replace(/\s+\((Reflection|Crooked Reflection|Skeptic Slime|Everything Movie|Vox Gray Modes)\)$/i, '').trim();
}

function shouldHold(product) {
  const title = product?.title || product?.name || '';
  const hasPublicAudioOrDrop = Boolean(product?.audioFile || product?.audioUrl || product?.streamUrl || product?.pwaUrl || product?.provider || product?.providerId);
  if (!hasPublicAudioOrDrop) return false;
  if (/^blueprint_/i.test(String(product?.productId || product?.id || ''))) return false;
  if (holdTitles.has(title) || holdTitles.has(baseTitle(title))) return true;
  const provider = String(product?.provider || product?.providerId || '').toLowerCase();
  const createdAt = Date.parse(product?.createdAt || '');
  return Number.isFinite(createdAt) &&
    createdAt >= Date.parse('2026-05-25T20:00:00.000Z') &&
    /openai-tts|stability-stable-audio-2/.test(provider);
}

function addCredit(description = '') {
  const clean = String(description || '').trim();
  if (/Produced by Gray London Skyes/i.test(clean)) return clean;
  return `${clean || 'Gray Gang digital music drop.'} ${producerCredit}.`;
}

function applyProductHold(product, artistSlug) {
  const previous = {
    status: product.status || '',
    audioFile: product.audioFile || '',
    audioUrl: product.audioUrl || '',
    streamUrl: product.streamUrl || '',
  };
  product.status = 'draft-quality-hold';
  product.publicReleaseStatus = 'held-for-remaster';
  product.qualityGate = {
    status: 'held_for_remaster',
    reason: 'Owner rejected audio quality; not promoted as public release audio.',
    heldAt,
    publicPromotion: false,
    radioEligible: false,
    chartEligible: false,
    storeEligible: false,
    heldBy: 'founder-command-quality-gate',
  };
  product.heldAudioFile = product.heldAudioFile || previous.audioFile || previous.audioUrl || previous.streamUrl || '';
  product.audioFile = '';
  product.audioUrl = '';
  product.streamUrl = '';
  product.producerName = 'Gray London Skyes';
  product.producedBy = 'Gray London Skyes';
  product.producerCredit = producerCredit;
  product.productionCredit = producerCredit;
  product.description = addCredit(product.description);
  product.artistSlug = product.artistSlug || artistSlug;
  return previous;
}

function dropHtmlFileFromPwa(pwaUrl = '') {
  const relative = String(pwaUrl || '')
    .replace(/^https?:\/\/[^/]+\/?/i, '')
    .replace(/^\/?SkyeMusicNexus\/artist-storefronts\//, '')
    .replace(/^\/+/, '')
    .replace(/\/?$/, '/index.html');
  if (!relative || relative === '/index.html') return '';
  return path.join(storefrontRoot, relative);
}

function applyDropHtmlHold(file) {
  if (!file || !fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  if (!/Produced by Gray London Skyes/i.test(html)) {
    html = html.replace(/(<section class="hero">[^]*?<p class="micro">[^<]+<\/p>)/, `$1<p class="micro">${producerCredit}</p>`);
  }
  html = html.replace(/<a class="btn primary" href="[^"]*" download>Download MP3<\/a>/g, '<span class="btn disabled">Remaster queued</span>');
  html = html.replace(/<audio([^>]*)src="[^"]*"([^>]*)><\/audio>/g, '<p class="muted">Audio held for remaster before public promotion.</p>');
  if (html === original) return false;
  fs.writeFileSync(file, html);
  return true;
}

function updateProducts() {
  const held = [];
  const dirs = fs.readdirSync(storefrontRoot, {withFileTypes: true}).filter((entry) => entry.isDirectory());
  for (const dirent of dirs) {
    const slug = dirent.name;
    const file = path.join(storefrontRoot, slug, 'products/products.json');
    const payload = readJson(file);
    if (!payload) continue;
    const products = productsFromPayload(payload);
    let changed = false;
    for (const product of products) {
      if (!shouldHold(product)) continue;
      const previous = applyProductHold(product, slug);
      held.push({
        artistSlug: slug,
        productId: product.productId || product.id || '',
        title: product.title || product.name || '',
        previous,
        pwaUrl: product.pwaUrl || '',
      });
      changed = true;
      applyDropHtmlHold(dropHtmlFileFromPwa(product.pwaUrl || ''));
    }
    if (changed) writeJson(file, payload);
  }
  return held;
}

function updateReflectionProject(held) {
  const heldIds = new Set(held.map((item) => item.productId).filter(Boolean));
  const heldSlugs = new Set(held.map((item) => slugify(baseTitle(item.title))).filter(Boolean));
  const file = path.join(storefrontRoot, 'reflection/project.json');
  const payload = readJson(file);
  if (!payload) return {changed: false};
  let changed = false;
  for (const track of payload.tracks || []) {
    const trackSlug = slugify(track.title || '');
    if (!heldIds.has(track.productId) && !heldSlugs.has(trackSlug)) continue;
    track.status = 'draft-quality-hold';
    track.publicReleaseStatus = 'held-for-remaster';
    track.qualityGate = {status: 'held_for_remaster', heldAt, publicPromotion: false};
    track.producerName = 'Gray London Skyes';
    track.producerCredit = producerCredit;
    track.heldAudio = track.heldAudio || track.audio || '';
    track.audio = '';
    changed = true;
  }
  payload.producerName = 'Gray London Skyes';
  payload.producerCredit = producerCredit;
  if (changed) writeJson(file, payload);
  applyDropHtmlHold(path.join(storefrontRoot, 'reflection/index.html'));
  return {changed};
}

const held = updateProducts();
const reflection = updateReflectionProject(held);
const receipt = {
  ok: true,
  heldAt,
  heldCount: held.length,
  heldTitles: [...new Set(held.map((item) => item.title))],
  held,
  reflection,
  producerCredit,
};

fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
