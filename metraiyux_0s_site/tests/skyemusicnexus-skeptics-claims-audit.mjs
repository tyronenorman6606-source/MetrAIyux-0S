#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const dataPath = path.join(nexusRoot, 'data', 'skeptics-override-claims.json');
const pagePath = path.join(nexusRoot, 'skepticks-spectic-override.html');
const scriptPath = path.join(nexusRoot, 'skepticks-spectic-override.js');

function fail(message) {
  throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertFile(file) {
  if (!fs.existsSync(file)) fail(`Missing file: ${path.relative(repoRoot, file)}`);
}

assertFile(dataPath);
assertFile(pagePath);
assertFile(scriptPath);

const data = readJson(dataPath);
const page = fs.readFileSync(pagePath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');
const claims = Array.isArray(data.claims) ? data.claims : [];
const receipts = Array.isArray(data.primaryReceipts) ? data.primaryReceipts : [];
const receiptMissing = receipts
  .filter((receipt) => receipt.path && !receipt.path.startsWith('https://'))
  .filter((receipt) => !fs.existsSync(path.join(repoRoot, receipt.path)));

if (data.schema !== 'skye.music.nexus.skeptics.override.v1') fail('Unexpected skeptics override schema.');
if (!page.includes('Skepticks and SPectic Override')) fail('Page does not expose the requested title.');
if (!page.includes('./data/skeptics-override-claims.json') && !script.includes('./data/skeptics-override-claims.json')) fail('Page/script does not load the claim ledger.');
if (claims.length < 12) fail(`Expected at least 12 audited claims; found ${claims.length}.`);
if (receipts.length < 8) fail(`Expected at least 8 evidence receipts; found ${receipts.length}.`);
if (receiptMissing.length) fail(`Missing cited receipts: ${receiptMissing.map((item) => item.path).join(', ')}`);

const verdicts = new Set(claims.map((claim) => claim.verdict));
for (const required of ['verified', 'stress-backed', 'boundary']) {
  if (!verdicts.has(required)) fail(`Missing ${required} claim verdict.`);
}

for (const claim of claims) {
  if (!claim.id || !claim.claim || !claim.skepticQuestion || !claim.boardRoomLanguage) fail(`Claim is incomplete: ${claim.id || claim.claim || 'unknown'}`);
  if (!Array.isArray(claim.proof) || claim.proof.length < 2) fail(`Claim lacks evidence: ${claim.id}`);
}

const boundaryText = JSON.stringify(data.doNotClaimYet || []).toLowerCase();
for (const phrase of ['dsp', 'r2', 'real-money', 'legal', 'provider', 'public cdn']) {
  if (!boundaryText.includes(phrase)) fail(`Boundary list does not call out ${phrase}.`);
}

const musicDropClaim = claims.find((claim) => claim.id === 'music-drops');
if (!musicDropClaim || musicDropClaim.verdict !== 'verified') fail('Music drops claim is not verified.');
const musicDropText = JSON.stringify(musicDropClaim).toLowerCase();
if (!musicDropText.includes('skynet') || !musicDropText.includes('/deploy/init') || !musicDropText.includes('/skynet/musicnexus')) {
  fail('Music drops claim does not state the in-house FS27 SkyeNet deploy lane.');
}

const payoutClaim = claims.find((claim) => claim.id === 'payments-payout-ledger');
if (!payoutClaim || payoutClaim.verdict !== 'boundary') fail('Payment/payout claim must stay boundary until real-money payout proof exists.');

console.log(JSON.stringify({
  ok: true,
  claims: claims.length,
  receipts: receipts.length,
  verdicts: Object.fromEntries([...verdicts].map((verdict) => [verdict, claims.filter((claim) => claim.verdict === verdict).length])),
  page: path.relative(repoRoot, pagePath),
  data: path.relative(repoRoot, dataPath)
}, null, 2));
