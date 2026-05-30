#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const base = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-public-guide');
const latestPath = path.join(artifactRoot, 'skyenet-public-guide-live-http-latest.json');

const checks = [
  { label: 'SkyeNet home', path: '/', expect: ['SkyeNet Deploy', 'Post to SkyeNet', 'Source custody', 'skyenet.&lt;company-slug&gt;', 'Control origin'] },
  { label: 'Public posting guide', path: '/publish/', expect: ['Post to SkyeNet', '$97/mo', 'Free99', 'SkyeSecure v2 lane', 'skyenet.&lt;company-slug&gt;'] },
  { label: 'Console', path: '/console', expect: ['SkyeNet account command', 'Source downloads and stored transfers use the same shared gate session'] },
  { label: 'SkyeNet logo', path: '/assets/skyenet-mark.svg', expect: ['SkyeNet mark', 'routed diamond'] },
  { label: 'Bob live app', path: '/bobs-smoke-shop/', expect: ['Bob'] },
  { label: 'Bob workspace preview', path: '/bobs-smoke-shop/workspace-preview/', expect: ['workspace'] },
  { label: 'Robots', path: '/robots.txt', expect: ['Sitemap: https://skyenet.graylondonskyes.workers.dev/sitemap.xml'] },
  { label: 'Sitemap', path: '/sitemap.xml', expect: ['https://skyenet.graylondonskyes.workers.dev/publish/'] }
];

async function fetchText(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const text = await response.text().catch(() => '');
  return {
    url,
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: response.headers.get('content-type') || '',
    location: response.headers.get('location') || '',
    text
  };
}

function hasAll(text, needles) {
  const lower = String(text || '').toLowerCase();
  return needles.every((needle) => lower.includes(String(needle).toLowerCase()));
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.public-guide.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    base,
    checks: [],
    pricing_redirect: null,
    health: null,
    links: {
      home: `${base}/`,
      publish: `${base}/publish/`,
      pricing: `${base}/publish/#pricing`,
      console: `${base}/console`,
      bob_app: `${base}/bobs-smoke-shop/`,
      bob_workspace: `${base}/bobs-smoke-shop/workspace-preview/`,
      health: `${base}/health`
    }
  };

  for (const check of checks) {
    const result = await fetchText(`${base}${check.path}`);
    const passed = result.status === 200 && hasAll(result.text, check.expect);
    receipt.checks.push({
      label: check.label,
      path: check.path,
      url: result.url,
      status: result.status,
      ok: passed,
      elapsed_ms: result.elapsed_ms,
      content_type: result.content_type,
      expected_text: check.expect,
      text_sample: result.text.slice(0, 220)
    });
  }

  const redirect = await fetchText(`${base}/pricing`);
  receipt.pricing_redirect = {
    url: redirect.url,
    status: redirect.status,
    ok: redirect.status >= 300 && redirect.status < 400 && redirect.location === `${base}/publish/#pricing`,
    location: redirect.location,
    elapsed_ms: redirect.elapsed_ms
  };

  const health = await fetchText(`${base}/health`);
  let healthBody = null;
  try { healthBody = JSON.parse(health.text); } catch {}
  receipt.health = {
    url: health.url,
    status: health.status,
    ok: health.status === 200 && healthBody?.ok === true && healthBody?.service === 'skyenet-standalone-edge',
    body: healthBody,
    elapsed_ms: health.elapsed_ms
  };

  receipt.ok = receipt.checks.every((check) => check.ok) && receipt.pricing_redirect.ok && receipt.health.ok;
  const stamped = path.join(artifactRoot, `skyenet-public-guide-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, JSON.stringify(receipt, null, 2));
  await fs.writeFile(latestPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({
    ok: receipt.ok,
    latest: latestPath,
    stamped,
    failed: [
      ...receipt.checks.filter((check) => !check.ok).map((check) => check.label),
      receipt.pricing_redirect.ok ? null : 'pricing redirect',
      receipt.health.ok ? null : 'health'
    ].filter(Boolean),
    links: receipt.links
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
