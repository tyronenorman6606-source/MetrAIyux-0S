#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const workerBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const pagesBase = (process.env.MUSIC_NEXUS_PAGES_BASE || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-pricing-live-direct-smoke-latest.json');

const secretKeys = [
  'MCP_GATE_SESSION',
  'QUANTUMSKYES_MCP_TOKEN',
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_OWNER_CODE',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_OWNER_CODE',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function parseEnvText(text) {
  const rows = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:)\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function expandCandidate(value) {
  const clean = unquote(value).replace(/^Bearer\s+/i, '').trim();
  if (!clean) return [];
  const out = [clean];
  try {
    const parsed = JSON.parse(clean);
    for (const key of ['token', 'gateToken', 'gateBearerToken', 'bearer', 'session', 'ownerToken']) {
      if (typeof parsed?.[key] === 'string') out.push(parsed[key].replace(/^Bearer\s+/i, '').trim());
    }
  } catch {}
  return out.filter(Boolean);
}

function localCandidates() {
  const merged = {
    ...parseEnvText(readText(path.join(repoRoot, '.env'))),
    ...parseEnvText(readText(path.join(repoRoot, 'env.txt'))),
    ...parseEnvText(readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))),
    ...process.env,
  };
  const seen = new Set();
  const candidates = [];
  for (const key of secretKeys) {
    for (const value of expandCandidate(merged[key])) {
      if (!seen.has(value)) {
        seen.add(value);
        candidates.push({ key, value });
      }
    }
  }
  return candidates;
}

function gateHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
  };
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), ...options });
  return {
    url,
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    text: await response.text(),
  };
}

async function resolveOwnerGate(receipt) {
  for (const candidate of localCandidates()) {
    try {
      const response = await fetch(`${workerBase}/api/owner/admin-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: candidate.value }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => ({}));
      const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
      receipt.authAttempts.push({ sourceKey: candidate.key, status: response.status, ok: response.ok && Boolean(token) });
      if (response.ok && token) return { token, sourceKey: candidate.key };
    } catch (error) {
      receipt.authAttempts.push({ sourceKey: candidate.key, ok: false, error: String(error?.message || error).slice(0, 160) });
    }
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

function assertText(record, snippet) {
  assert(record.text.includes(snippet), `${record.url} missing ${snippet}`);
}

async function main() {
  const receipt = {
    ok: false,
    checkedAt: new Date().toISOString(),
    pagesBase,
    workerBase,
    authAttempts: [],
    checks: [],
  };

  const pagesChecks = [
    ['/public/pricing.html', ['Song Creation pays for provider-backed drafting', 'Drop Packaging', 'DAW Beta']],
    ['/public/pricing-song-creation.html', ['Everything Movie', '$23', 'Cinematic Suite']],
    ['/public/pricing-drops.html', ['No AI generation in this lane.', '$15', '$99']],
    ['/public/pricing-artist-apps.html', ['$239', '$1,197+', 'Custom Artist Universe']],
    ['/public/pricing-daw.html', ['$0 through December 31, 2026', 'every user', 'beta']],
  ];

  for (const [route, snippets] of pagesChecks) {
    const record = await fetchText(`${pagesBase}${route}`, { redirect: 'follow' });
    assert(record.status === 200, `${route} Pages returned ${record.status}`);
    for (const snippet of snippets) assertText(record, snippet);
    receipt.checks.push({ surface: `pages:${route}`, status: record.status, ok: true });
  }

  const unauth = await fetchText(`${workerBase}/SkyeMusicNexus/public/pricing.html`, { redirect: 'manual' });
  assert(unauth.status === 302, `unauth Worker pricing route returned ${unauth.status}`);
  assert(String(unauth.headers.location || '').includes('/admin/login.html'), 'unauth Worker pricing route did not redirect to shared login');
  receipt.checks.push({
    surface: 'worker:unauth:/SkyeMusicNexus/public/pricing.html',
    status: unauth.status,
    ok: true,
    locationIncludesLogin: true,
  });

  const owner = await resolveOwnerGate(receipt);
  for (const [route, snippets] of [
    ['/SkyeMusicNexus/public/pricing.html', ['Song Creation pays for provider-backed drafting', 'Drop Packaging', 'DAW Beta']],
    ['/SkyeMusicNexus/public/pricing-song-creation.html', ['Everything Movie', '$23', 'Cinematic Suite']],
  ]) {
    const record = await fetchText(`${workerBase}${route}`, { headers: gateHeaders(owner.token) });
    assert(record.status === 200, `${route} authenticated Worker returned ${record.status}`);
    for (const snippet of snippets) assertText(record, snippet);
    receipt.checks.push({ surface: `worker:auth:${route}`, status: record.status, ok: true });
  }

  receipt.ok = true;
  receipt.auth = { ok: true, sourceKey: owner.sourceKey };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
