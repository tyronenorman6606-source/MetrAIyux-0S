#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const artifactRoot = path.resolve('test-artifacts/bobs-skynet-deploy');
const latestReceipt = path.join(artifactRoot, 'bobs-0s-redirect-closure-latest.json');
const zeroOsBase = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const skynetBase = 'https://skyenet.graylondonskyes.workers.dev';
const marketingBase = 'https://metraiyux-0s-marketing.pages.dev';
const skyVaultBase = 'https://skyevault-drop.graylondonskyes.workers.dev';

async function fetchAny(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: contentType,
    location: response.headers.get('location') || '',
    cache_control: response.headers.get('cache-control') || '',
    x_bobs_route: response.headers.get('x-0s-bobs-route') || '',
    bytes: text.length,
    text
  };
}

async function login() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  return {
    credential_source: auth.credential?.key || '',
    token,
    status: auth.response?.status || 0,
    ok: Boolean(auth.ok && token)
  };
}

function hasAll(text, needles) {
  return needles.every((needle) => String(text || '').includes(needle));
}

function expectedRedirect(response, target) {
  return [301, 302, 303, 307, 308].includes(response.status) && response.location === target;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receipt = {
    ok: false,
    generated_at: generatedAt,
    lane: 'bobs-0s-to-standalone-skynet-redirect-closure',
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    worker_version_expected_from_deploy: 'fe5f88bc-59eb-4f45-9d70-7414eff9c345',
    archive_receipt: 'test-artifacts/bobs-skynet-deploy/bobs-0s-pre-redirect-archive-latest.json',
    skyevault_receipt: '.skyevault-out/skyevault-receipt-cdv_a28f9a81544b70a0cedda204.json',
    checks: [],
    failures: []
  };

  const archiveExists = existsSync(path.resolve(receipt.archive_receipt));
  const vaultExists = existsSync(path.resolve(receipt.skyevault_receipt));
  receipt.checks.push({ label: 'Pre-redirect local archive receipt exists', ok: archiveExists, path: receipt.archive_receipt });
  receipt.checks.push({ label: 'SkyeVault upload receipt exists', ok: vaultExists, path: receipt.skyevault_receipt });
  if (!archiveExists) receipt.failures.push('Missing pre-redirect local archive receipt.');
  if (!vaultExists) receipt.failures.push('Missing SkyeVault upload receipt.');

  const redirects = [
    {
      label: 'Old 0S Bob app redirects to standalone SkyeNet',
      url: `${zeroOsBase}/skyenet/bobs-smoke-shop/`,
      target: `${skynetBase}/bobs-smoke-shop/`
    },
    {
      label: 'Old 0S Bob workspace redirects to standalone SkyeNet workspace',
      url: `${zeroOsBase}/skyenet/bobs-smoke-shop/workspace-preview/`,
      target: `${skynetBase}/bobs-smoke-shop/workspace-preview/`
    },
    {
      label: 'Old 0S Bob manifest redirects to standalone SkyeNet manifest',
      url: `${zeroOsBase}/skyenet/bobs-smoke-shop/manifest.webmanifest`,
      target: `${skynetBase}/bobs-smoke-shop/manifest.webmanifest`
    }
  ];
  for (const check of redirects) {
    const response = await fetchAny(check.url);
    const ok = expectedRedirect(response, check.target) && response.x_bobs_route === 'standalone-skynet-redirect';
    receipt.checks.push({ label: check.label, ok, status: response.status, url: check.url, location: response.location, x_bobs_route: response.x_bobs_route });
    if (!ok) receipt.failures.push(`Redirect failed: ${check.label}`);
  }

  const unauthPreview = await fetchAny(`${zeroOsBase}/client-preview/bobs-smoke-shop.html`, {
    headers: { accept: 'text/html' }
  });
  const unauthPreviewOk = [301, 302, 303, 307, 308].includes(unauthPreview.status) && /\/admin\/login\.html/i.test(unauthPreview.location);
  receipt.checks.push({ label: 'Unauthenticated legacy client preview goes to shared 0S unlock', ok: unauthPreviewOk, status: unauthPreview.status, location: unauthPreview.location });
  if (!unauthPreviewOk) receipt.failures.push('Unauthenticated legacy client preview did not go to shared 0S unlock.');

  const auth = await login();
  receipt.checks.push({ label: 'Shared owner gate login for authenticated legacy redirect smoke', ok: auth.ok, status: auth.status, credential_source: auth.credential_source, token_received: Boolean(auth.token) });
  if (!auth.ok) receipt.failures.push('Shared owner gate login did not return a token.');
  if (auth.token) {
    const authPreview = await fetchAny(`${zeroOsBase}/client-preview/bobs-smoke-shop.html`, {
      headers: {
        accept: 'text/html',
        authorization: `Bearer ${auth.token}`,
        'x-skye-gate-session': auth.token,
        'x-free99-gate-session': auth.token
      }
    });
    const authPreviewOk = expectedRedirect(authPreview, `${skynetBase}/bobs-smoke-shop/workspace-preview/`);
    receipt.checks.push({ label: 'Authenticated legacy client preview redirects to standalone workspace', ok: authPreviewOk, status: authPreview.status, location: authPreview.location });
    if (!authPreviewOk) receipt.failures.push('Authenticated legacy client preview did not redirect to standalone workspace.');
  }

  const livePages = [
    {
      label: 'Standalone Bob home',
      url: `${skynetBase}/bobs-smoke-shop/`,
      must: ["Bob's Smoke Shop", 'bobs-cinematic-logo-hero.mp4', 'Free Claim Stack']
    },
    {
      label: 'Standalone Bob workspace',
      url: `${skynetBase}/bobs-smoke-shop/workspace-preview/`,
      must: ['Free Claim', 'MediaOverLondon@solenterprises.org', 'starter seats']
    },
    {
      label: 'Standalone Bob sitemap uses standalone SkyeNet',
      url: `${skynetBase}/bobs-smoke-shop/sitemap.xml`,
      must: [`${skynetBase}/bobs-smoke-shop/`]
    },
    {
      label: 'Standalone Bob robots uses standalone SkyeNet',
      url: `${skynetBase}/bobs-smoke-shop/robots.txt`,
      must: [`Sitemap: ${skynetBase}/bobs-smoke-shop/sitemap.xml`]
    },
    {
      label: 'Bob public pilot page',
      url: `${marketingBase}/bobs-smoke-shop-free-pilot`,
      must: ['Open Sovereign App', `${skynetBase}/bobs-smoke-shop/`, 'MediaOverLondon@solenterprises.org']
    },
    {
      label: 'Bob public flyer page',
      url: `${marketingBase}/bobs-smoke-shop-free-pilot-flyer`,
      must: ['Open Sovereign App', `${skynetBase}/bobs-smoke-shop/`, '1-(800)-484-4783']
    },
    {
      label: 'SkyeVault client-vault unlock page',
      url: `${skyVaultBase}/#client-vault`,
      must: ['SkyeVault']
    },
    {
      label: '0S owner unlock page',
      url: `${zeroOsBase}/admin/login.html`,
      must: ['Free99 Admin Code Unlock']
    },
    {
      label: 'Standalone SkyeNet homepage',
      url: `${skynetBase}/`,
      must: ['SkyeNet']
    }
  ];
  for (const check of livePages) {
    const response = await fetchAny(check.url);
    const ok = response.status === 200 && hasAll(response.text, check.must);
    receipt.checks.push({ label: check.label, ok, status: response.status, url: check.url, bytes: response.bytes });
    if (!ok) receipt.failures.push(`Live page smoke failed: ${check.label}`);
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `bobs-0s-redirect-closure-${generatedAt.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    checks: receipt.checks.length,
    failures: receipt.failures,
    receipt: path.relative(repoRoot, latestReceipt),
    stamped_receipt: path.relative(repoRoot, stamped)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
