#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'marketing', 'metraiyux-0s');
const baseUrl = String(process.env.DOSSIER_BASE_URL || 'http://127.0.0.1:4329').replace(/\/+$/, '');
const mode = process.env.DOSSIER_ROUTE_MODE || 'html';
const cycles = Math.max(1, Number(process.env.DOSSIER_STRESS_CYCLES || 1));
const concurrency = Math.max(1, Number(process.env.DOSSIER_CONCURRENCY || 8));
const data = JSON.parse(fs.readFileSync(path.join(siteRoot, 'data', 'platform-dossiers.json'), 'utf8'));

function htmlPath(platform) {
  if (platform.slug === 'skyenet') return '/skyenet.html';
  return `/platform-dossiers/${platform.slug}.html`;
}

function cleanPath(platform) {
  if (platform.slug === 'skyenet') return '/skyenet';
  return `/platform-dossiers/${platform.slug}`;
}

const coreRoutes = [
  { path: mode === 'clean' ? '/0s-dossier' : '/0s-dossier.html', expect: 'Mega 0S Dossier' },
  { path: mode === 'clean' ? '/platform-dossiers/' : '/platform-dossiers/index.html', expect: '0S Platform Dossier Hub' },
  { path: mode === 'clean' ? '/skyenet' : '/skyenet.html', expect: 'ghost extension from an approved extension list' }
];

const platformRoutes = data.platforms.map((platform) => ({
  path: mode === 'clean' ? cleanPath(platform) : htmlPath(platform),
  expect: `${platform.name} Dossier | MetrAIyux 0S`
}));

const routes = [...coreRoutes, ...platformRoutes];
const queue = [];
for (let cycle = 0; cycle < cycles; cycle += 1) {
  for (const route of routes) queue.push({ ...route, cycle: cycle + 1 });
}

async function check(route) {
  const url = `${baseUrl}${route.path}`;
  const started = performance.now();
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  const durationMs = Math.round(performance.now() - started);
  const ok = response.status === 200 && text.includes(route.expect);
  return {
    ok,
    url,
    path: route.path,
    cycle: route.cycle,
    status: response.status,
    durationMs,
    bytes: text.length,
    expected: route.expect,
    missingExpectedText: !text.includes(route.expect)
  };
}

async function worker(results) {
  while (queue.length) {
    const route = queue.shift();
    results.push(await check(route).catch((error) => ({
      ok: false,
      url: `${baseUrl}${route.path}`,
      path: route.path,
      cycle: route.cycle,
      status: 0,
      durationMs: 0,
      bytes: 0,
      expected: route.expect,
      error: error?.message || String(error)
    })));
  }
}

const results = [];
await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker(results)));

const durations = results.map((item) => item.durationMs).filter(Boolean).sort((a, b) => a - b);
const percentile = (p) => durations.length ? durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * p))] : 0;
const failures = results.filter((item) => !item.ok);
const receipt = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  baseUrl,
  mode,
  cycles,
  concurrency,
  route_count: routes.length,
  request_count: results.length,
  p50_ms: percentile(.5),
  p95_ms: percentile(.95),
  max_ms: durations.at(-1) || 0,
  failures,
  sample: results.slice(0, 8)
};

const outDir = path.join(repoRoot, 'test-artifacts', '0s-platform-dossiers');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(outDir, `http-proof-${mode}-${stamp}.json`);
fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, `http-proof-${mode}-latest.json`), `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({ ...receipt, receipt: file }, null, 2));
if (!receipt.ok) process.exit(1);
