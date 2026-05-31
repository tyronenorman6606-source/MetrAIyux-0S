#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const apiBase = `${zeroOsBase}/api/skyenet`;
const skyeNetHost = String(process.env.BOBS_SKYENET_HOST || process.env.SKYENET_HOST || process.env.SKYENET_PUBLIC_HOST || 'skyenet.graylondonskyes.workers.dev').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
const stageDir = path.resolve('.tmp/bobs-smoke-shop-skynet-stage');
const workspaceId = process.env.BOBS_SKYENET_WORKSPACE || 'bobs-smoke-shop';
const projectId = process.env.BOBS_SKYENET_PROJECT || 'bobs-smoke-shop';
const deploymentId = process.env.BOBS_SKYENET_DEPLOYMENT_ID || 'dep_20260527190244';
const liveUrl = `https://${skyeNetHost}/bobs-smoke-shop/`;
const artifactRoot = path.resolve('test-artifacts/bobs-skynet-deploy');
const latestReceipt = path.join(artifactRoot, 'bobs-skynet-targeted-upload-latest.json');
const changedFiles = [
  'assets/workspace-chat-widget.js',
  'service-worker.js',
  'script.js',
  'styles.css',
  'workspace-preview.html',
  'workspace-preview/index.html'
];
function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function contentTypeForPath(pathname) {
  const clean = String(pathname || '').toLowerCase();
  if (clean.endsWith('.html')) return 'text/html; charset=utf-8';
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (clean.endsWith('.json') || clean.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function fetchWithTimeout(url, init = {}, timeoutMs = Number(process.env.SKYENET_FETCH_TIMEOUT_MS || 60_000)) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text().catch(() => '');
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, headers: Object.fromEntries(response.headers), text, body };
  } finally {
    clearTimeout(timer);
  }
}

async function login() {
  return resolveZeroOsGateAuth({ zeroOsBase });
}

async function uploadFile(token, relPath) {
  const full = path.join(stageDir, relPath);
  const body = await fs.readFile(full);
  const params = new URLSearchParams({ workspaceId, projectId, deploymentId, path: relPath });
  let last = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/deploy/upload?${params.toString()}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'x-skye-gate-session': token,
          'content-type': contentTypeForPath(relPath)
        },
        body
      }, Number(process.env.SKYENET_UPLOAD_TIMEOUT_MS || 90_000));
      last = response;
      if (response.ok && response.body?.ok !== false) {
        return { rel: relPath, ok: true, status: response.status, bytes: body.byteLength };
      }
    } catch (error) {
      last = { ok: false, status: 0, error: error?.message || String(error) };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return { rel: relPath, ok: false, status: last?.status || 0, error: last?.body?.error || last?.text || last?.error || 'upload failed', bytes: body.byteLength };
}

async function smoke() {
  const targets = [
    {
      label: 'live widget URL helper',
      url: `${liveUrl}assets/workspace-chat-widget.js`,
      must: ['base.endsWith("/") ? base', 'api/v1/conversations'],
      mustNot: ['base.endsWith("/skyenet/bobs-smoke-shop/") ? base']
    },
    {
      label: 'live service worker mounted cache',
      url: `${liveUrl}service-worker.js`,
      must: ['/bobs-smoke-shop/inventory.html', '/bobs-smoke-shop/assets/videos/bobs-cinematic-logo-hero.mp4'],
      mustNot: ["'/inventory.html'", "'/assets/videos/bobs-cinematic-logo-hero.mp4'"]
    },
    {
      label: 'live workspace handoff page',
      url: `${liveUrl}workspace-preview/`,
      must: ['MediaOverLondon@solenterprises.org', 'media-over-london.html', 'No app-local password is issued from this page.'],
      mustNot: ['SkyesOverLondonLC@solenterprises.org', 'skyesol.netlify.app']
    }
  ];
  const checks = [];
  for (const target of targets) {
    const response = await fetchWithTimeout(target.url, {}, 30_000);
    const ok = response.status === 200
      && target.must.every((needle) => response.text.includes(needle))
      && (target.mustNot || []).every((needle) => !response.text.includes(needle));
    checks.push({
      label: target.label,
      ok,
      status: response.status,
      url: target.url,
      missing: target.must.filter((needle) => !response.text.includes(needle)),
      forbidden: (target.mustNot || []).filter((needle) => response.text.includes(needle))
    });
  }
  return checks;
}

async function writeReceipt(receipt) {
  const stamp = receipt.generated_at.replace(/[:.]/g, '-');
  const stamped = path.join(artifactRoot, stamp, 'targeted-upload-receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
  return { stamped };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receipt = {
    ok: false,
    generated_at: generatedAt,
    lane: 'bobs-skynet-targeted-live-asset-overwrite',
    live_url: liveUrl,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    project_id: projectId,
    changed_files: changedFiles,
    credential_source: '',
    uploads: [],
    checks: [],
    failures: []
  };

  const auth = await login();
  receipt.credential_source = auth.credential.key || 'missing';
  if (!auth.token) receipt.failures.push(`Shared gate login failed with status ${auth.response?.status || 0}.`);
  if (auth.token) {
    for (const file of changedFiles) {
      const result = await uploadFile(auth.token, file);
      receipt.uploads.push(result);
      if (!result.ok) receipt.failures.push(`Upload failed: ${file}`);
    }
    receipt.checks = await smoke();
    for (const check of receipt.checks) {
      if (!check.ok) receipt.failures.push(`Smoke failed: ${check.label}`);
    }
  }
  receipt.ok = receipt.failures.length === 0;
  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    live_url: liveUrl,
    deployment_id: deploymentId,
    uploads: receipt.uploads.length,
    receipt: rel(latestReceipt),
    stamped_receipt: rel(paths.stamped),
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    generated_at: new Date().toISOString(),
    lane: 'bobs-skynet-targeted-live-asset-overwrite',
    live_url: liveUrl,
    deployment_id: deploymentId,
    fatal: error?.stack || error?.message || String(error)
  };
  const paths = await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: rel(latestReceipt), stamped_receipt: rel(paths.stamped), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
