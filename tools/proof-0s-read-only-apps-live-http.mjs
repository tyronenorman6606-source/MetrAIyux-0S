#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const matrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const perAppPath = path.join(repoRoot, 'test-artifacts', '0s-per-app-operating-proof', '0s-per-app-operating-proof-latest.json');
const outRoot = path.join(repoRoot, 'test-artifacts', '0s-read-only-apps-live-http');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(outRoot, stamp, 'receipt.json');
const latestPath = path.join(outRoot, '0s-read-only-apps-live-http-latest.json');
const timeoutMs = Number(process.env.ZERO_OS_READ_ONLY_APP_TIMEOUT_MS || 30000);
const stressReads = Number(process.env.ZERO_OS_READ_ONLY_APP_STRESS_READS || 3);

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function authHeaders(token, extra = {}) {
  return {
    accept: 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    cookie: [
      `metraiyux_admin_session=${encodeURIComponent(token)}`,
      `metraiyux_gate_session=${encodeURIComponent(token)}`,
      `skye_gate_session=${encodeURIComponent(token)}`,
      `skygate_session=${encodeURIComponent(token)}`
    ].join('; '),
    ...extra
  };
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function timedFetch(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: init.redirect || 'manual' });
    const text = await response.text().catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      text
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: '',
      location: '',
      text: '',
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function redirectTarget(currentUrl, location = '') {
  if (!location) return '';
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return '';
  }
}

async function fetchFollow(url, init = {}, limit = 5) {
  const chain = [];
  let current = url;
  let last = null;
  for (let attempt = 0; attempt <= limit; attempt += 1) {
    last = await timedFetch(current, { ...init, redirect: 'manual' });
    chain.push({
      url: current,
      status: last.status,
      location: last.location || '',
      contentType: last.contentType || '',
      bytes: last.text?.length || 0
    });
    const next = redirectTarget(current, last.location || '');
    if (![301, 302, 303, 307, 308].includes(last.status) || !next || chain.some((item) => item.url === next)) break;
    current = next;
  }
  return { ...last, finalUrl: current, redirectChain: chain };
}

async function fetchFollowRetry(url, init = {}, attempts = 3) {
  let last = null;
  for (let index = 0; index < attempts; index += 1) {
    last = await fetchFollow(url, init);
    if (last.status !== 0) return last;
  }
  return last;
}

function isReadOnly(row = {}) {
  return row.state_profile === 'read_only_static' || row.state_profile === 'proof_asset';
}

function hasUnsafeMutationSource(source = '') {
  const compact = source.replace(/\s+/g, ' ');
  return /<form\b[^>]*method=["']?(?:post|put|patch|delete)\b/i.test(compact)
    || /\bfetch\s*\([^)]*method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(compact)
    || /\bXMLHttpRequest\b/i.test(compact)
    || /\baxios\.(?:post|put|patch|delete)\b/i.test(compact);
}

function normalizeWords(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value = '') {
  const stop = new Set(['worker', 'asset', 'live', 'index', 'html', 'app', 'page']);
  return normalizeWords(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stop.has(token));
}

function humanMarkers(row = {}, html = '') {
  const text = normalizeWords(html);
  const markers = [
    row.id,
    row.name,
    row.canonical_family,
    path.basename(row.mounted_path || '').replace(/\.html$/i, '')
  ].filter(Boolean);
  const matched = [];
  for (const marker of markers) {
    const normalized = normalizeWords(marker);
    const tokens = significantTokens(marker);
    const tokenMatches = tokens.filter((token) => text.includes(token));
    const tokenHit = tokens.length >= 2 && tokenMatches.length >= 2;
    if ((normalized && text.includes(normalized)) || tokenHit) matched.push(marker);
  }
  return {
    expected: markers,
    matched
  };
}

async function stressRoute(row, token) {
  const calls = await Promise.all(Array.from({ length: stressReads }, async (_, index) => {
    const result = await fetchFollow(`${BASE_URL}${row.mounted_path}`, { headers: authHeaders(token) });
    return {
      index,
      ok: result.status === 200 && result.text.length > 100,
      status: result.status,
      finalUrl: result.finalUrl || '',
      elapsedMs: result.elapsedMs,
      bytes: result.text.length
    };
  }));
  return {
    ok: calls.every((call) => call.ok),
    requests: calls.length,
    p95Ms: calls.map((call) => call.elapsedMs).sort((a, b) => a - b)[Math.max(0, Math.ceil(calls.length * 0.95) - 1)] || 0,
    maxMs: Math.max(...calls.map((call) => call.elapsedMs), 0),
    calls
  };
}

async function appProof(row, perAppRow, token) {
  const sourceFile = perAppRow?.source_file ? path.join(repoRoot, perAppRow.source_file) : '';
  const sourceExists = Boolean(sourceFile && existsSync(sourceFile));
  const source = sourceExists ? await fs.readFile(sourceFile, 'utf8') : '';
  const sourceHash = source ? sha256(source) : '';
  const unauth = await timedFetch(`${BASE_URL}${row.mounted_path}`, { redirect: 'manual' });
  const authed = await fetchFollowRetry(`${BASE_URL}${row.mounted_path}`, { headers: authHeaders(token) });
  const stress = await stressRoute(row, token);
  const markers = humanMarkers(row, authed.text);
  const mutationUnsafe = hasUnsafeMutationSource(source || authed.text);
  const perAppModel = perAppRow?.proof_model || {};
  const sourceHashMatches = !perAppRow?.source_sha256 || perAppRow.source_sha256 === sourceHash;
  const unauthGateOk = unauth.status >= 300 && unauth.status < 400 && /\/admin\/login\.html/i.test(unauth.location)
    || unauth.status === 401
    || unauth.status === 403;
  const readOk = authed.status === 200 && authed.text.length > 100 && /html|text|javascript|json/i.test(authed.contentType || 'text/html');
  const sourceOk = sourceExists
    && sourceHashMatches
    && perAppModel.source_marker_integrity === true
    && perAppModel.source_provenance_receipt === true;
  const mutationBoundaryOk = mutationUnsafe === false
    && (perAppModel.mutation_denial_or_not_applicable === true || row.state_profile === 'proof_asset');
  const behaviors = {
    human_flow: unauthGateOk && readOk && markers.matched.length > 0,
    read: readOk,
    receipt_readback: sourceOk,
    stress: stress.ok === true,
    mutation_denial_or_not_applicable: mutationBoundaryOk
  };
  const failures = [
    ...(unauthGateOk ? [] : ['unauthenticated_gate_not_proven']),
    ...(readOk ? [] : ['authenticated_read_failed']),
    ...(sourceOk ? [] : ['source_or_provenance_readback_failed']),
    ...(markers.matched.length > 0 ? [] : ['human_visible_marker_missing']),
    ...(stress.ok ? [] : ['route_stress_failed']),
    ...(mutationBoundaryOk ? [] : ['mutation_boundary_failed'])
  ];
  return {
    ok: failures.length === 0,
    app_id: row.id,
    name: row.name,
    mounted_path: row.mounted_path,
    state_profile: row.state_profile,
    canonical_family: row.canonical_family,
    source_file: perAppRow?.source_file || '',
    source_sha256: sourceHash,
    source_hash_matches_per_app_receipt: sourceHashMatches,
    unauthenticated_gate: {
      ok: unauthGateOk,
      status: unauth.status,
      location: unauth.location
    },
    authenticated_read: {
      ok: readOk,
      status: authed.status,
      finalUrl: authed.finalUrl || '',
      redirectChain: authed.redirectChain || [],
      contentType: authed.contentType,
      bytes: authed.text.length,
      markers
    },
    source_readback: {
      ok: sourceOk,
      exists: sourceExists,
      source_marker_integrity: perAppModel.source_marker_integrity === true,
      source_provenance_receipt: perAppModel.source_provenance_receipt === true
    },
    mutation_boundary: {
      ok: mutationBoundaryOk,
      unsafe_mutation_source_detected: mutationUnsafe,
      per_app_mutation_denial_or_not_applicable: perAppModel.mutation_denial_or_not_applicable === true
    },
    stress,
    behaviors,
    failures
  };
}

async function main() {
  const [matrix, perApp, gateAuth] = await Promise.all([
    readJson(matrixPath),
    readJson(perAppPath),
    resolveZeroOsGateAuth({ zeroOsBase: BASE_URL })
  ]);
  if (!gateAuth?.token) throw new Error('Unable to resolve shared 0S gate bearer for read-only app proof.');
  const rows = (matrix?.app_behavior_matrix?.rows || []).filter(isReadOnly);
  const perAppRows = new Map((perApp?.rows || []).map((row) => [row.id, row]));
  const proofs = {};
  for (const row of rows) {
    proofs[row.id] = await appProof(row, perAppRows.get(row.id), gateAuth.token);
  }
  const failures = Object.values(proofs).filter((proof) => !proof.ok);
  const receipt = {
    ok: failures.length === 0,
    schema: 'metraiyux.0s.read-only-apps-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    source_matrix: path.relative(repoRoot, matrixPath),
    source_per_app_receipt: path.relative(repoRoot, perAppPath),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    credential_source: gateAuth.credential?.key || gateAuth.credential?.source || 'shared-gate',
    standard: 'Read-only/proof assets must prove shared gate, authenticated human-visible read, source/provenance receipt readback, route stress, and explicit no-mutation boundary.',
    summary: {
      total: rows.length,
      green: rows.length - failures.length,
      failing: failures.length,
      stress_reads_per_app: stressReads
    },
    read_only_app_proofs: proofs,
    failures: failures.map((proof) => ({
      app_id: proof.app_id,
      mounted_path: proof.mounted_path,
      failures: proof.failures
    }))
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(outRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, receiptPath),
    latest: path.relative(repoRoot, latestPath),
    summary: receipt.summary,
    first_failures: receipt.failures.slice(0, 20)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.read-only-apps-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    error: error?.stack || error?.message || String(error)
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(outRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, latest: path.relative(repoRoot, latestPath), error: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
});
