#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const storefrontRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts');
const receiptPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/gray-collective-producer-credit-latest.json');
const collectiveId = 'gray-skyes-collective';
const producerName = 'Gray London Skyes';
const producerCredit = 'Produced by Gray London Skyes';

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

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function isCollectiveProduct(product, payload) {
  return (
    product?.collectiveId === collectiveId ||
    product?.collective?.id === collectiveId ||
    payload?.collective?.id === collectiveId ||
    /Gray Gang|Reflection|Skeptic Slime|Everything Movie|Vox Gray Modes|Crooked Reflection/i.test(`${product?.title || ''} ${product?.project || ''}`)
  );
}

function withProducerDescription(description = '') {
  const clean = String(description || '').trim();
  if (/Produced by Gray London Skyes/i.test(clean)) return clean;
  return `${clean || 'Gray Gang digital music drop.'} ${producerCredit}.`;
}

function stampProduct(product, payload) {
  if (!isCollectiveProduct(product, payload)) return false;
  product.collectiveId = product.collectiveId || collectiveId;
  product.producerName = producerName;
  product.producedBy = producerName;
  product.producerCredit = producerCredit;
  product.productionCredit = producerCredit;
  product.description = withProducerDescription(product.description);
  return true;
}

function updateProductFiles() {
  let filesChanged = 0;
  let productsChanged = 0;
  const artists = fs.readdirSync(storefrontRoot, {withFileTypes: true}).filter((entry) => entry.isDirectory());
  for (const artist of artists) {
    const file = path.join(storefrontRoot, artist.name, 'products/products.json');
    const payload = readJson(file);
    if (!payload) continue;
    const products = productsFromPayload(payload);
    let changed = false;
    for (const product of products) {
      if (stampProduct(product, payload)) {
        productsChanged += 1;
        changed = true;
      }
    }
    if (!changed) continue;
    writeJson(file, payload);
    filesChanged += 1;
  }
  return {filesChanged, productsChanged};
}

function walk(dir, predicate, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, predicate, found);
    else if (predicate(file)) found.push(file);
  }
  return found;
}

function stampHtml(file) {
  let html = fs.readFileSync(file, 'utf8');
  if (/Produced by Gray London Skyes/i.test(html)) return false;
  const credit = `<p class="micro producer-credit">${producerCredit}</p>`;
  const replacements = [
    [/(<section class="hero">\s*<img[^>]+>\s*<p class="micro">[^<]+<\/p>)/, `$1${credit}`],
    [/(<section class="hero">\s*<p class="micro">[^<]+<\/p>)/, `$1${credit}`],
    [/(<p class="lede">[^<]+<\/p>)/, `$1${credit}`],
  ];
  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(html)) continue;
    html = html.replace(pattern, replacement);
    fs.writeFileSync(file, html);
    return true;
  }
  return false;
}

function updateHtmlFiles() {
  const htmlFiles = [
    path.join(storefrontRoot, 'gray-skyes-collective/index.html'),
    path.join(storefrontRoot, 'reflection/index.html'),
    ...walk(path.join(storefrontRoot, 'gray-skyes-collective/releases'), (file) => file.endsWith('/index.html')),
    ...walk(storefrontRoot, (file) => /\/drops\/[^/]+\/index\.html$/.test(file)),
  ];
  let changed = 0;
  for (const file of [...new Set(htmlFiles)]) {
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!/Gray Gang|Reflection|gray-skyes-collective|SkyeMusicNexus/i.test(html)) continue;
    if (stampHtml(file)) changed += 1;
  }
  return {filesChanged: changed};
}

function stampReleaseJson(file) {
  const payload = readJson(file);
  if (!payload) return false;
  payload.producerName = producerName;
  payload.producedBy = producerName;
  payload.producerCredit = producerCredit;
  payload.productionCredit = producerCredit;
  if (Array.isArray(payload.tracks)) {
    payload.tracks = payload.tracks.map((track) => ({
      ...track,
      producerName,
      producedBy: producerName,
      producerCredit,
      productionCredit: producerCredit,
    }));
  }
  writeJson(file, payload);
  return true;
}

function updateReleaseJson() {
  const files = [
    path.join(storefrontRoot, 'reflection/project.json'),
    ...walk(path.join(storefrontRoot, 'gray-skyes-collective/releases'), (file) => file.endsWith('/release.json')),
  ].filter((file) => fs.existsSync(file));
  let changed = 0;
  for (const file of files) if (stampReleaseJson(file)) changed += 1;
  return {filesChanged: changed};
}

const receipt = {
  ok: true,
  producerName,
  producerCredit,
  products: updateProductFiles(),
  releaseJson: updateReleaseJson(),
  html: updateHtmlFiles(),
  checkedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
