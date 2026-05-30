#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'marketing', 'metraiyux-0s');
const dataPath = path.join(siteRoot, 'data', 'platform-dossiers.json');

function read(rel) {
  return fs.readFileSync(path.join(siteRoot, rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(pattern, text) {
  return [...text.matchAll(pattern)].length;
}

assert(fs.existsSync(dataPath), 'platform dossier data file is missing');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
assert(data.count >= 40, `expected at least 40 dossiers, got ${data.count}`);
assert(data.platforms.length === data.count, 'platform dossier count mismatch');

const mega = read('0s-dossier.html');
const hub = read('platform-dossiers/index.html');
const skynet = read('skyenet.html');
const homepage = read('index.html');
const search = read('site-search.js');
const sitemap = read('sitemap.xml');
const indexing = JSON.parse(read('google-indexing-submit.json'));

assert(mega.includes('Mega 0S Dossier'), 'mega dossier heading missing');
assert(mega.includes('The 0S exists because business tools keep leaving the hard parts between products.'), 'mega pain-first hero missing');
assert(mega.includes('Every platform dossier'), 'mega platform hub section missing');
assert(count(/class="dossier-index-card reveal"/g, mega) >= data.count, 'mega dossier card inventory too small');
assert(hub.includes('Every app lane gets a page with pain, truth, proof, and competitor context.'), 'hub hero missing');
assert(count(/class="dossier-index-card reveal"/g, hub) >= data.count, 'hub card inventory too small');
assert(skynet.includes('ghost extension from an approved extension list'), 'SkyeNet founder pain story missing');
assert(skynet.includes('I am not saying Netlify is a bad company'), 'SkyeNet fair competitor boundary missing');
assert(skynet.includes('How it stacks up without lying.'), 'SkyeNet competitor analysis missing');
assert(homepage.includes('href="0s-dossier.html"'), 'homepage does not link the mega dossier');
assert(homepage.includes('href="platform-dossiers/"'), 'homepage does not link the dossier hub');
assert(search.includes('Mega 0S Dossier'), 'search index does not expose mega dossier');
assert(search.includes('0S Platform Dossier Hub'), 'search index does not expose platform hub');
assert(indexing.page_count >= data.count, 'google indexing manifest page count is too small');
assert(sitemap.includes('https://metraiyux-0s-marketing.pages.dev/0s-dossier'), 'sitemap missing mega dossier');
assert(sitemap.includes('https://metraiyux-0s-marketing.pages.dev/platform-dossiers/skyemail'), 'sitemap missing SkyeMail dossier');
assert(sitemap.includes('https://metraiyux-0s-marketing.pages.dev/platform-dossiers/skyecommerce'), 'sitemap missing SkyeCommerce dossier');

for (const platform of data.platforms) {
  const rel = platform.slug === 'skyenet'
    ? 'skyenet.html'
    : `platform-dossiers/${platform.slug}.html`;
  const abs = path.join(siteRoot, rel);
  assert(fs.existsSync(abs), `${platform.name} dossier missing at ${rel}`);
  const html = fs.readFileSync(abs, 'utf8');
  assert(html.includes(`${platform.name} Dossier | MetrAIyux 0S`), `${platform.name} title missing`);
  assert(html.includes(platform.pain), `${platform.name} pain statement missing`);
  assert(html.includes('Competitor stack'), `${platform.name} competitor stack missing`);
  assert(html.includes('Truth ledger'), `${platform.name} truth ledger missing`);
  assert(html.includes('Proof and receipts'), `${platform.name} proof section missing`);
}

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  platform_count: data.count,
  checked_files: data.count + 6,
  required_routes: [
    '/0s-dossier',
    '/platform-dossiers/',
    '/skyenet',
    '/platform-dossiers/skyemail',
    '/platform-dossiers/skyecommerce'
  ]
};

const outDir = path.join(repoRoot, 'test-artifacts', '0s-platform-dossiers');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'local-proof-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
