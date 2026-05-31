#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const ledgerPath = path.resolve(process.env.SKYENET_73_LEDGER || 'test-artifacts/skyenet-73-client-app-closure/skyenet-73-client-app-closure-latest.json');
const artifactDir = path.resolve('test-artifacts/skyenet-73-client-app-closure');
const latestPath = path.join(artifactDir, 'skyenet-73-client-app-public-stress-latest.json');
const rounds = Math.max(1, Math.min(20, Number(process.env.SKYENET_PUBLIC_STRESS_ROUNDS || '3') || 3));
const concurrency = Math.max(1, Math.min(24, Number(process.env.SKYENET_PUBLIC_STRESS_CONCURRENCY || '8') || 8));
const timeoutMs = Math.max(3_000, Math.min(120_000, Number(process.env.SKYENET_PUBLIC_STRESS_TIMEOUT_MS || '20000') || 20_000));

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function candidateUrl(candidate) {
  return candidate?.deploy_target?.publicUrl
    || candidate?.deploy_target?.public_url
    || candidate?.target_url
    || candidate?.http_verification?.url
    || candidate?.target?.live_url
    || '';
}

function percentile(values, pct) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * pct) - 1))];
}

async function timedHead(url, label, round) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal
    });
    return {
      label,
      round,
      url,
      method: 'HEAD',
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      x_skynet_project_id: response.headers.get('x-skynet-project-id') || '',
      x_skynet_deployment_id: response.headers.get('x-skynet-deployment-id') || '',
      error: ''
    };
  } catch (error) {
    return {
      label,
      round,
      url,
      method: 'HEAD',
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      x_skynet_project_id: '',
      x_skynet_deployment_id: '',
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(items, limit, worker) {
  const out = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await worker(items[index], index);
    }
  }));
  return out;
}

function extraAssetTargets(liveCandidates) {
  const byId = new Map(liveCandidates.map((candidate) => [candidate.id, candidate]));
  const nexus = byId.get('musicnexus-NexusArtistPrimePackage');
  const base = nexus ? String(nexus.url || '').replace(/\/?$/, '/') : '';
  if (!base) return [];
  return [
    {
      id: 'musicnexus-NexusArtistPrimePackage:video:trap-metal-king',
      name: 'Nexus Prime public video asset',
      url: `${base}originals/gray-skyes/media/video/chicago-underground-trap-metal-king-main.mp4`
    },
    {
      id: 'musicnexus-NexusArtistPrimePackage:audio:cupid',
      name: 'Nexus Prime public audio asset',
      url: `${base}originals/gray-skyes/media/audio/cupid.mp3`
    },
    {
      id: 'musicnexus-NexusArtistPrimePackage:image:portrait',
      name: 'Nexus Prime public image asset',
      url: `${base}originals/gray-skyes/media/images/gray-red-portrait.jpg`
    }
  ];
}

const ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8'));
const liveCandidates = (ledger.candidates || [])
  .filter((candidate) => candidate.current_status === 'live-public-skynet')
  .map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    lane: candidate.lane,
    url: candidateUrl(candidate)
  }))
  .filter((candidate) => candidate.url);

const targets = [
  ...liveCandidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    lane: candidate.lane,
    url: candidate.url,
    kind: 'live-public-skynet-route'
  })),
  ...extraAssetTargets(liveCandidates).map((target) => ({
    ...target,
    lane: 'musicnexus-artist-storefront',
    kind: 'referenced-public-media-asset'
  }))
];

const jobs = [];
for (let round = 1; round <= rounds; round += 1) {
  for (const target of targets) jobs.push({ ...target, round });
}

const results = await runPool(jobs, concurrency, (job) => timedHead(job.url, job.id, job.round));
const failures = results.filter((result) => !result.ok);
const durations = results.map((result) => result.elapsed_ms);
const receipt = {
  schema: 'skyenet.73-client-app-public-route-stress.v1',
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  no_browser_proof_run: true,
  owner_manual_live_check: true,
  ledger: rel(ledgerPath),
  rounds,
  concurrency,
  timeout_ms: timeoutMs,
  target_count: targets.length,
  live_route_target_count: liveCandidates.length,
  extra_asset_target_count: targets.length - liveCandidates.length,
  total_requests: results.length,
  ok_requests: results.filter((result) => result.ok).length,
  failed_requests: failures.length,
  p50_ms: Number(percentile(durations, 0.5).toFixed(2)),
  p95_ms: Number(percentile(durations, 0.95).toFixed(2)),
  max_ms: Number(Math.max(...durations, 0).toFixed(2)),
  targets,
  failures,
  results
};

await fs.mkdir(artifactDir, { recursive: true });
const stamped = path.join(artifactDir, `skyenet-73-client-app-public-stress-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(latestPath, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);

console.log(JSON.stringify({
  ok: receipt.ok,
  live_route_target_count: receipt.live_route_target_count,
  extra_asset_target_count: receipt.extra_asset_target_count,
  total_requests: receipt.total_requests,
  ok_requests: receipt.ok_requests,
  failed_requests: receipt.failed_requests,
  p95_ms: receipt.p95_ms,
  receipt: rel(latestPath),
  stamped_receipt: rel(stamped),
  failures: failures.slice(0, 10)
}, null, 2));

if (!receipt.ok) process.exitCode = 1;
