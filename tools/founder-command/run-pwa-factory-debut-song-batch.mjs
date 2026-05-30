#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const planPath = path.join(repoRoot, 'metraiyux_0s_site/founder-command/apps/pwa-factory-v213/debut-song-batch-plan.json');
const execute = process.argv.includes('--execute');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 1) : Infinity;

const secretKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE'
];

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function localSecretCandidates() {
  const texts = [readText(path.join(repoRoot, '.env')), readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))];
  const values = [];
  for (const key of secretKeys) {
    if (process.env[key]) values.push({ key, value: unquote(process.env[key]) });
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push({ key, value });
    }
  }
  const seen = new Set();
  return values.filter((item) => item.value && !seen.has(item.value) && seen.add(item.value));
}

function gateHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token
  };
}

async function resolveOwnerGate() {
  for (const candidate of localSecretCandidates()) {
    const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch(() => null);
    if (!response) continue;
    const data = await response.json().catch(() => ({}));
    const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
    if (response.ok && token) return { token, sourceKey: candidate.key };
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

async function generateArtist(token, artist) {
  const body = {
    action: 'generate-ai-song',
    provider: 'elevenlabs',
    artistId: artist.artistId,
    artistName: artist.stageName,
    collectiveId: 'gray-skyes-collective',
    title: artist.title,
    prompt: artist.prompt,
    durationSeconds: artist.durationSeconds,
    makeStoreProduct: true,
    makeFeedPost: true,
    priceCents: 444,
    productDescription: `${artist.stageName} debut song drop, sold through SkyeMusicNexus and tracked to Gray Gang.`
  };
  const startedAt = new Date().toISOString();
  const response = await fetch(`${baseUrl}/api/skymusicnexus/music-provider-hooks`, {
    method: 'POST',
    headers: { ...gateHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  return {
    artistId: artist.artistId,
    slug: artist.slug,
    stageName: artist.stageName,
    title: artist.title,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: response.status,
    ok: response.ok && payload.ok === true && payload.job?.status === 'generated',
    providerStatusCode: payload.job?.providerStatusCode || 0,
    jobId: payload.job?.id || '',
    assetId: payload.job?.assetId || '',
    productId: payload.job?.productId || '',
    bytes: payload.job?.bytes || 0,
    error: payload.error || payload.job?.error || ''
  };
}

async function main() {
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const selected = plan.artists.filter((artist) => artist.status !== 'generated_live').slice(0, limit);
  const receipt = {
    schema: 'skyemusicnexus.gray-gang-debut-song-batch-receipt.v1',
    mode: execute ? 'execute' : 'dry-run',
    baseUrl,
    requestedAt: new Date().toISOString(),
    selectedCount: selected.length,
    estimatedUsd: Number((selected.reduce((sum, artist) => sum + Number(artist.estimatedUsd || 0), 0)).toFixed(2)),
    results: []
  };
  if (!execute) {
    receipt.results = selected.map((artist) => ({
      artistId: artist.artistId,
      slug: artist.slug,
      stageName: artist.stageName,
      title: artist.title,
      durationSeconds: artist.durationSeconds,
      estimatedUsd: artist.estimatedUsd,
      wouldCall: '/api/skymusicnexus/music-provider-hooks',
      makeStoreProduct: true,
      makeFeedPost: true
    }));
  } else {
    const owner = await resolveOwnerGate();
    receipt.auth = { ok: true, sourceKey: owner.sourceKey };
    for (const artist of selected) {
      receipt.results.push(await generateArtist(owner.token, artist));
      fs.mkdirSync(path.join(repoRoot, 'test-artifacts/gray-gang-debut-song-batch'), { recursive: true });
      fs.writeFileSync(path.join(repoRoot, 'test-artifacts/gray-gang-debut-song-batch/latest.json'), JSON.stringify(receipt, null, 2) + '\n');
    }
  }
  receipt.ok = receipt.results.every((result) => execute ? result.ok : true);
  receipt.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.join(repoRoot, 'test-artifacts/gray-gang-debut-song-batch'), { recursive: true });
  const out = path.join(repoRoot, `test-artifacts/gray-gang-debut-song-batch/${receipt.mode}-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
  fs.writeFileSync(path.join(repoRoot, 'test-artifacts/gray-gang-debut-song-batch/latest.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ ok: receipt.ok, mode: receipt.mode, selectedCount: receipt.selectedCount, estimatedUsd: receipt.estimatedUsd, receipt: out }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
