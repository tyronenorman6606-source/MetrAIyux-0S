#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const nexusRoot = path.join(siteRoot, 'SkyeMusicNexus');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-pricing-hub-proof-latest.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(root, relativePath) {
  return JSON.parse(read(root, relativePath));
}

function fileExists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function extractRefs(html) {
  return [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
}

function assertIncludes(html, snippets, label) {
  for (const snippet of snippets) {
    assert(html.includes(snippet), `${label} missing ${snippet}`);
  }
}

const simplePricing = readJson(nexusRoot, 'data/skyemusicnexus-simple-pricing.json');
const nexusPricing = readJson(nexusRoot, 'data/skyemusicnexus-pricing.json');
const sitePricing = readJson(siteRoot, 'data/skyemusicnexus-pricing.json');

const realmIds = ['drops', 'artist-apps', 'song-creation', 'daw-beta'];
for (const pricing of [simplePricing, nexusPricing]) {
  assert(Array.isArray(pricing.pricingRealms), 'camel pricing realms missing');
  assert(JSON.stringify(pricing.pricingRealms.map((realm) => realm.id)) === JSON.stringify(realmIds), 'camel pricing realms are not in the expected order');
  assert(Array.isArray(pricing.songCreationPricing) && pricing.songCreationPricing.length === 6, 'camel song creation ladder should have 6 offers');
  assert(pricing.songCreationPricing.some((item) => item.id === 'skyemusicnexus-song-draft'), 'camel pricing missing Song Draft');
  assert(pricing.songCreationPricing.some((item) => item.id === 'skyemusicnexus-cinematic-suite'), 'camel pricing missing Cinematic Suite');
  assert(pricing.dawBetaAccess?.availableThrough === '2026-12-31', 'camel DAW beta should be free through 2026');
}

assert(Array.isArray(sitePricing.pricing_realms), 'snake pricing realms missing');
assert(JSON.stringify(sitePricing.pricing_realms.map((realm) => realm.id)) === JSON.stringify(realmIds), 'snake pricing realms are not in the expected order');
assert(Array.isArray(sitePricing.song_creation_pricing) && sitePricing.song_creation_pricing.length === 6, 'snake song creation ladder should have 6 offers');
assert(sitePricing.daw_beta_access?.available_through === '2026-12-31', 'snake DAW beta should be free through 2026');

for (const drop of simplePricing.dropPricing.filter((item) => item.id.includes('drop') && !item.id.includes('content') && !item.id.includes('campaign'))) {
  assert(drop.generationIncluded === false, `${drop.id} should be marked packaging-only`);
}

const pages = {
  'public/pricing.html': ['Drop Packaging', 'Artist Apps', 'Song Creation', 'DAW Beta', 'Song Creation pays for kAIxU drafting'],
  'public/pricing-drops.html': ['No AI generation in this lane.', '$15', '$29', '$49', '$99'],
  'public/pricing-artist-apps.html': ['$239', '$444', '$796', '$996', '$1,197+'],
  'public/pricing-song-creation.html': ['$23', '$49', '$99', '$249', '$497+', 'Everything Movie', '12 total generated minutes', 'Prompt-led, not hardcoded'],
  'public/pricing-daw.html': ['$0 through December 31, 2026', 'beta', 'every user'],
};

for (const [relativePath, snippets] of Object.entries(pages)) {
  assert(fileExists(nexusRoot, relativePath), `${relativePath} missing`);
  const html = read(nexusRoot, relativePath);
  assertIncludes(html, snippets, relativePath);
  assert(!/letter-spacing\s*:\s*-/.test(html), `${relativePath} contains negative letter spacing inline`);
}

assert(read(nexusRoot, 'public/index.html').includes('href="./pricing.html"'), 'public workspace nav missing pricing link');
assert(read(nexusRoot, 'index.html').includes('href="./public/pricing.html"'), 'root MusicNexus sidebar missing pricing link');
assert(read(nexusRoot, 'platform.html').includes('href="./public/pricing.html"'), 'MusicNexus platform nav missing pricing link');

const missingRefs = [];
for (const relativePath of Object.keys(pages)) {
  const html = read(nexusRoot, relativePath);
  for (const ref of extractRefs(html)) {
    if (!ref || ref.startsWith('#') || ref.startsWith('http') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:')) continue;
    const url = new URL(ref, `https://skye-music-nexus.local/${relativePath}`);
    if (url.origin !== 'https://skye-music-nexus.local') continue;
    const clean = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const target = clean.endsWith('/') ? path.join(clean, 'index.html') : clean;
    if (!fileExists(nexusRoot, target)) missingRefs.push({ page: relativePath, ref, target });
  }
}
assert(missingRefs.length === 0, `pricing local refs missing: ${JSON.stringify(missingRefs.slice(0, 10))}`);

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  pages: Object.keys(pages),
  pricingRealms: realmIds,
  songCreationOffers: simplePricing.songCreationPricing.map((item) => ({ id: item.id, name: item.name, price: item.price })),
  dropPackagingOffers: simplePricing.dropPricing.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    generationIncluded: item.generationIncluded ?? null,
  })),
  dawBetaAccess: simplePricing.dawBetaAccess,
  assertions: {
    hubAndRealmPagesExist: true,
    jsonTruthFilesAligned: true,
    songCreationHasCustomizableLadder: true,
    dropPackagingMarkedGenerationExcluded: true,
    dawBetaFreeThrough2026: true,
    visibleNavLinksAdded: true,
    localRefsResolved: true,
    browserProofSkippedByOwnerPolicy: true,
  },
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
