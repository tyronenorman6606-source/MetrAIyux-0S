#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const sourceDir = path.resolve('Skye-Clients/bobs-smoke-shop-mcp-redo');
const stageDir = path.resolve('.tmp/bobs-smoke-shop-skynet-stage');
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skyeNetHost = String(process.env.BOBS_SKYENET_HOST || process.env.SKYENET_HOST || process.env.SKYENET_PUBLIC_HOST || 'skyenet.graylondonskyes.workers.dev').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
const skyeNetOrigin = `https://${skyeNetHost}`;
const mountPath = String(process.env.BOBS_SKYENET_MOUNT || '/bobs-smoke-shop').replace(/\/+$/, '');
const liveUrl = `${skyeNetOrigin}${mountPath}/`;
const encodedLiveUrl = encodeURIComponent(liveUrl);
const artifactRoot = path.resolve('test-artifacts/bobs-skynet-deploy');
const latestReceipt = path.join(artifactRoot, 'bobs-skynet-deploy-latest.json');
const projectId = process.env.BOBS_SKYENET_PROJECT || 'bobs-smoke-shop';
const workspaceId = process.env.BOBS_SKYENET_WORKSPACE || 'bobs-smoke-shop';
const planName = process.env.BOBS_SKYENET_PLAN || 'free-claim-stack';
const leanBundle = process.env.BOBS_SKYENET_FULL_BUNDLE !== '1';
const leanImageFallbacks = {
  png: 'assets/live-site/bobs-live-logo.png',
  jpg: 'assets/videos/bobs-cinematic-logo-hero-poster.jpg',
  jpeg: 'assets/videos/bobs-cinematic-logo-hero-poster.jpg'
};
const leanKeepAssets = new Set([
  'assets/workspace-chat-widget.js',
  'assets/live-site/bobs-live-logo.png',
  'assets/live-site/bobs-live-storefront.png',
  'assets/live-site/live-product-g-device.png',
  'assets/live-site/live-glass-green.png',
  'assets/live-site/live-glass-color.png',
  'assets/live-site/live-wraps-display.jpeg',
  'assets/live-site/live-zemis-wraps.jpeg',
  'assets/live-site/live-cigars.jpeg',
  'assets/live-site/live-stiiizy-wraps.jpg',
  'assets/videos/bobs-cinematic-logo-hero.mp4',
  'assets/videos/bobs-cinematic-logo-hero-poster.jpg',
  'assets/videos/bobs-storefront-tour.mp4',
  'assets/videos/bobs-storefront-tour-poster.jpg',
  'assets/videos/bobs-inventory-sizzle.mp4',
  'assets/videos/bobs-inventory-sizzle-poster.jpg',
  'assets/videos/bobs-social-vertical.mp4',
  'assets/videos/bobs-social-vertical-poster.jpg',
  'assets/inventory/vapes.png',
  'assets/inventory/cigars.png',
  'assets/qr/bobs-smoke-shop-preview-qr.svg',
  'assets/qr/bobs-smoke-shop-preview-qr.png'
]);
const leanExcludeFiles = new Set([
  'MCP_TOOLING_RECEIPT.json',
  'README_DEPLOY.txt',
  'deploy-target.json',
  'google-indexing-submit.json',
  'netlify.toml'
]);
async function fetchAny(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const elapsedMs = Number((performance.now() - started).toFixed(2));
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  let body = null;
  if (contentType.includes('json') || text.trim().startsWith('{')) {
    try { body = JSON.parse(text); } catch {}
  }
  return {
    status: response.status,
    ok: response.ok,
    elapsedMs,
    contentType,
    location: response.headers.get('location') || '',
    bytes: Number(response.headers.get('content-length') || text.length || 0) || 0,
    text,
    snippet: text.slice(0, 2400),
    body
  };
}

async function retryFetch(url, init = {}, attempts = 6) {
  let last = null;
  for (let index = 0; index < attempts; index += 1) {
    last = await fetchAny(url, init);
    if (last.ok || [301, 302, 303, 307, 308, 401, 403].includes(last.status)) return last;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return last;
}

function textHasAll(text, needles) {
  return needles.every((needle) => String(text).includes(needle));
}

function textHasNone(text, needles) {
  return needles.every((needle) => !String(text).includes(needle));
}

async function listFiles(root) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.wrangler', '.skyenet'].includes(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        out.push({ full, rel });
      }
    }
  }
  await walk(root);
  return out;
}

function isTextPatchCandidate(rel) {
  return /\.(html|css|js|mjs|json|webmanifest|xml|txt)$/i.test(rel);
}

function patchRootPaths(text, rel = '') {
  let out = text;
  const prefix = mountPath;
  out = out.replace(/\b(href|src|poster|content|action)=("|')\/(?!\/)/g, `$1=$2${prefix}/`);
  out = out.replace(/url\(\s*(['"]?)\/(?!\/)/g, `url($1${prefix}/`);
  out = out.replace(/(["'`])\/(assets|index\.html|service-worker\.js|script\.js|styles\.css|manifest\.webmanifest|favicon\.png|workspace-preview|inventory|local-seo|blog|specials|gallery|contact|faq|categories|delivery|flyer)(?=[/?#"'`])/g, `$1${prefix}/$2`);
  if (rel === 'service-worker.js') {
    out = out.replace(/(["'`])\/(?!\/|skyenet\/)([^"'`,\]\)]+)/g, `$1${prefix}/$2`);
    out = out.replace(/(["'`])\/(?=[?#"'`,\]\)])/g, `$1${prefix}/`);
  }
  out = out.replace(/"start_url"\s*:\s*"\/\?source=pwa"/, `"start_url": "${prefix}/?source=pwa"`);
  out = out.replace(/"scope"\s*:\s*"\/"/, `"scope": "${prefix}/"`);
  out = out.replace(/https:\/\/bobs-smoke-shop\.pages\.dev\//g, liveUrl);
  out = out.replace(/https%3A%2F%2Fbobs-smoke-shop\.pages\.dev%2F/gi, encodedLiveUrl);
  out = out.replace(/https:\/\/metraiyux-0s-full-system\.graylondonskyes\.workers\.dev\/skyenet\/bobs-smoke-shop\//g, liveUrl);
  out = out.replace(/https%3A%2F%2Fmetraiyux-0s-full-system\.graylondonskyes\.workers\.dev%2Fskyenet%2Fbobs-smoke-shop%2F/gi, encodedLiveUrl);
  return out;
}

function isLeanExcluded(rel) {
  if (!leanBundle) return false;
  if (leanExcludeFiles.has(rel)) return true;
  if (rel.startsWith('live-site-upgrades/')) return true;
  if (rel.startsWith('assets/videos/') && !leanKeepAssets.has(rel)) return true;
  return false;
}

function leanFallbackFor(rel) {
  if (!leanBundle) return '';
  if (rel === 'favicon.png') return leanImageFallbacks.png;
  if (leanKeepAssets.has(rel) || rel.startsWith('assets/qr/')) return '';
  const match = rel.match(/\.(png|jpe?g)$/i);
  if (!match) return '';
  if (!rel.startsWith('assets/')) return '';
  return leanImageFallbacks[match[1].toLowerCase()] || '';
}

async function stageSkyeNetApp() {
  await fs.rm(stageDir, { recursive: true, force: true });
  await fs.mkdir(stageDir, { recursive: true });
  const files = await listFiles(sourceDir);
  const staged = [];
  const leanReplaced = [];
  const leanExcluded = [];
  const htmlRouteAliases = [];
  for (const file of files) {
    if (file.rel.startsWith('live-site-upgrades/source-html/') || isLeanExcluded(file.rel)) {
      leanExcluded.push(file.rel);
      continue;
    }
    const dest = path.join(stageDir, file.rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const fallback = leanFallbackFor(file.rel);
    if (fallback) {
      await fs.copyFile(path.join(sourceDir, fallback), dest);
      leanReplaced.push({ rel: file.rel, fallback });
    } else if (isTextPatchCandidate(file.rel)) {
      const source = await fs.readFile(file.full, 'utf8');
      await fs.writeFile(dest, patchRootPaths(source, file.rel));
    } else {
      await fs.copyFile(file.full, dest);
    }
    staged.push(file.rel);
  }
  for (const rel of [...staged]) {
    if (!rel.endsWith('.html') || rel === 'index.html' || rel.endsWith('/index.html')) continue;
    const aliasRel = rel.replace(/\.html$/i, '/index.html');
    const aliasPath = path.join(stageDir, aliasRel);
    try {
      await fs.access(aliasPath);
      continue;
    } catch {}
    await fs.mkdir(path.dirname(aliasPath), { recursive: true });
    await fs.copyFile(path.join(stageDir, rel), aliasPath);
    htmlRouteAliases.push({ from: rel, to: aliasRel });
    staged.push(aliasRel);
  }
  await fs.writeFile(path.join(stageDir, 'skynet-hosting.json'), `${JSON.stringify({
    schema: 'skyenet.client-app-hosting.v1',
    app: "Bob's Smoke Shop",
    project_id: projectId,
    workspace_id: workspaceId,
    mount_path: mountPath,
    live_url: liveUrl,
    source: 'Skye-Clients/bobs-smoke-shop-mcp-redo',
    hosted_on: 'SkyeNet standalone edge',
    public_access: true,
    bundle_mode: leanBundle ? 'client-facing-lean' : 'full-source',
    html_route_aliases: htmlRouteAliases.length,
    lean_replaced_assets: leanReplaced.length,
    lean_excluded_files: leanExcluded.length,
    generated_at: new Date().toISOString()
  }, null, 2)}\n`);
  return { staged, leanReplaced, leanExcluded, htmlRouteAliases };
}

async function login() {
  return resolveZeroOsGateAuth({ zeroOsBase });
}

function runSkyeNetDeploy(token) {
  if (process.env.BOBS_SKYENET_SKIP_DEPLOY === '1') {
    return {
      ok: true,
      status: 0,
      stdout: 'Skipped upload/route bind because BOBS_SKYENET_SKIP_DEPLOY=1; verifying existing live route.',
      stderr: '',
      deploy: {
        ok: true,
        project_id: projectId,
        deployment_id: process.env.BOBS_SKYENET_DEPLOYMENT_ID || '',
        workspace_id: workspaceId,
        file_count: 0,
        live_url: liveUrl,
        route_key: ''
      }
    };
  }
  const args = [
    'tools/skyenet-deploy.mjs',
    '--dir', stageDir,
    '--project', projectId,
    '--workspace', workspaceId,
    '--plan', planName,
    '--host', skyeNetHost,
    '--mount', mountPath,
    '--public',
    '--concurrency', process.env.BOBS_SKYENET_CONCURRENCY || '4'
  ];
  const result = spawnSync('node', args, {
    cwd: repoRoot,
    env: { ...process.env, SKYENET_AUTH: token },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  let deploy = null;
  const jsonMatch = String(result.stdout || '').match(/\{\s*"ok"[\s\S]*\}\s*$/);
  if (jsonMatch) {
    try { deploy = JSON.parse(jsonMatch[0]); } catch {}
  }
  return {
    ok: result.status === 0 && deploy?.ok === true,
    status: result.status,
    stdout: String(result.stdout || '').slice(-6000),
    stderr: String(result.stderr || '').slice(-6000),
    deploy
  };
}

async function updateFounderAccount(token, skynetLiveUrl, deployedDeploymentId = '') {
  const activeDeploymentId = deployedDeploymentId || process.env.BOBS_SKYENET_DEPLOYMENT_ID || '';
  const sourceDownloadApi = activeDeploymentId
    ? `${skyeNetOrigin}/api/skyenet/source-download?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(activeDeploymentId)}`
    : `${skyeNetOrigin}/api/skyenet/dashboard?workspace_id=${encodeURIComponent(workspaceId)}`;
  const skynetConsole = `${skyeNetOrigin}/console?workspace_id=${encodeURIComponent(workspaceId)}`;
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'content-type': 'application/json'
  };
  const account = await fetchAny(`${zeroOsBase}/api/founder-command/accounts/upsert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_account_id: 'founder-client:bobs-smoke-shop',
      display_name: "Bob's Smoke Shop",
      client_id: 'bobs-smoke-shop',
      workspace_id: 'ws_bobs_smoke_shop',
      valley_business_id: 'bobs-smoke-shop-litchfield-park',
      relay_inbox_id: 'bobs-smoke-shop',
      skyemail: 'bobs-smokeshop@skyemail.solenterprises.org',
      ae_contact_id: 'ae_contact_bobs_smoke_shop',
        status: 'skyenet-standalone-hosted',
      source_systems: ['founder-command', 'skyenet', 'client-app-factory'],
      profile: {
        email: 'bobsmokeshopaz@gmail.com',
        phone: '(623) 935-0786',
        public_contact_email: 'MediaOverLondon@solenterprises.org',
        public_contact_phone: '1-(800)-484-4783',
        city: 'Litchfield Park',
        state: 'AZ',
        website: skynetLiveUrl
      },
      routes: {
        sovereign_skynet_app: skynetLiveUrl,
        workspace_preview: `${skynetLiveUrl}workspace-preview/`,
        skynet_console: skynetConsole,
        skynet_source_download_api: sourceDownloadApi,
        pilot_review: 'https://metraiyux-0s-marketing.pages.dev/bobs-smoke-shop-free-pilot',
        zero_os_browser: `${zeroOsBase}/0s/index.html`
      },
      skynet: {
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: activeDeploymentId,
        source_download: {
          status: activeDeploymentId ? 'gated-account-download-ready' : 'pending-active-deployment-id',
          format: 'tar',
          console: skynetConsole,
          api: sourceDownloadApi,
          auth: 'Shared FS27/SkyGate/Free99 bearer session required'
        }
      }
    })
  });
  const operation = await fetchAny(`${zeroOsBase}/api/founder-command/accounts/${encodeURIComponent('founder-client:bobs-smoke-shop')}/operations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'bobs-skynet-sovereign-hosting',
      lane: 'skyenet',
      source_app: 'founder-command',
      source_record_id: projectId,
      status: 'sovereign-skynet-live',
      priority: 'high',
      next_action: `Bob's app is live on the standalone SkyeNet hosting route: ${skynetLiveUrl}`,
      links: [
        { label: 'Sovereign SkyeNet App', href: skynetLiveUrl, kind: 'skyenet' },
        { label: 'SkyeNet Homepage', href: skyeNetOrigin, kind: 'skyenet' },
        { label: 'SkyeNet Account Console', href: skynetConsole, kind: 'skyenet-console' }
      ]
    })
  });
  const link = await fetchAny(`${zeroOsBase}/api/founder-command/identity/link`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_account_id: 'founder-client:bobs-smoke-shop',
      source_system: 'skyenet',
      source_table: 'deployments',
      source_id: projectId,
      link_type: 'sovereign-client-app-hosting',
      source_email: 'bobsmokeshopaz@gmail.com',
      metadata: { live_url: skynetLiveUrl, mount_path: mountPath, source_download_api: sourceDownloadApi, skynet_console: skynetConsole }
    })
  });
  return { account, operation, link };
}

async function writeReceipt(receipt) {
  const stamp = receipt.generated_at.replace(/[:.]/g, '-');
  const stamped = path.join(artifactRoot, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  return { stamped, latest: latestReceipt };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receipt = {
    ok: false,
    generated_at: generatedAt,
    lane: 'bobs-app-skynet-sovereign-deploy',
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    source_dir: path.relative(repoRoot, sourceDir),
    stage_dir: path.relative(repoRoot, stageDir),
    project_id: projectId,
    workspace_id: workspaceId,
    plan_name: planName,
    mount_path: mountPath,
    expected_live_url: liveUrl,
    dry_run: process.env.BOBS_SKYENET_DRY_RUN === '1',
    bundle_mode: leanBundle ? 'client-facing-lean' : 'full-source',
    credential_source: '',
    staged_files: 0,
    staged_bytes: 0,
    html_route_aliases: [],
    lean_replaced_assets: [],
    lean_excluded_files: [],
    deploy: null,
    founder_command_writes: null,
    checks: [],
    failures: []
  };

  const stage = await stageSkyeNetApp();
  const stagedFiles = await listFiles(stageDir);
  receipt.staged_files = stagedFiles.length;
  for (const file of stagedFiles) {
    const stat = await fs.stat(file.full);
    receipt.staged_bytes += stat.size;
  }
  receipt.lean_replaced_assets = stage.leanReplaced;
  receipt.lean_excluded_files = stage.leanExcluded;
  receipt.html_route_aliases = stage.htmlRouteAliases;

  if (receipt.dry_run) {
    receipt.ok = true;
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({
      ok: true,
      dry_run: true,
      staged_files: receipt.staged_files,
      staged_bytes: receipt.staged_bytes,
      bundle_mode: receipt.bundle_mode,
      receipt: path.relative(repoRoot, paths.latest)
    }, null, 2));
    return;
  }

  const auth = await login();
  receipt.credential_source = auth.credential.key || 'missing';
  receipt.checks.push({ label: 'Owner shared-gate login', ok: Boolean(auth.token), status: auth.response?.status || 0, token_received: Boolean(auth.token) });
  if (!auth.token) receipt.failures.push(auth.response?.body?.error || 'Owner shared-gate login did not return a bearer token.');

  if (auth.token) {
    const deployment = runSkyeNetDeploy(auth.token);
    receipt.deploy = {
      ok: deployment.ok,
      status: deployment.status,
      project_id: deployment.deploy?.project_id || '',
      deployment_id: deployment.deploy?.deployment_id || '',
      workspace_id: deployment.deploy?.workspace_id || '',
      file_count: deployment.deploy?.file_count || 0,
      live_url: deployment.deploy?.live_url || liveUrl,
      route_key: deployment.deploy?.route_key || '',
      stdout_tail: deployment.stdout,
      stderr_tail: deployment.stderr
    };
    if (!deployment.ok) receipt.failures.push(`SkyeNet deploy failed with status ${deployment.status}.`);

    const deployedUrl = `${String(deployment.deploy?.live_url || liveUrl).replace(/\/+$/, '')}/`;
    const targets = [
      {
        label: 'SkyeNet Bob home route',
        url: deployedUrl,
        must: ["Bob's Smoke Shop", 'bobs-cinematic-logo-hero.mp4', 'Free Claim Stack'],
        mustNot: ['Free 7-Day Trial', 'free tester workspace', 'Open Trial Page']
      },
      {
        label: 'SkyeNet Bob workspace route',
        url: `${deployedUrl}workspace-preview/`,
        must: ['Free Claim', 'MediaOverLondon@solenterprises.org', 'starter seats'],
        mustNot: ['Free trial', 'Free 7 Days', 'SkyesOverLondonLC@solenterprises.org']
      },
      {
        label: 'SkyeNet Bob service worker route',
        url: `${deployedUrl}service-worker.js`,
        must: ['bobs-smoke-shop-pwa-v26', `${mountPath}/index.html`],
        mustNot: ["'/index.html'", '"/index.html"']
      },
      {
        label: 'SkyeNet Bob manifest route',
        url: `${deployedUrl}manifest.webmanifest`,
        must: [`"scope": "${mountPath}/"`, `${mountPath}/contact`],
        mustNot: ['"scope": "/"']
      }
    ];
    for (const target of targets) {
      const response = await retryFetch(target.url);
      const ok = response.status === 200 && textHasAll(response.text, target.must) && textHasNone(response.text, target.mustNot || []);
      receipt.checks.push({ label: target.label, ok, status: response.status, url: target.url, elapsed_ms: response.elapsedMs });
      if (!ok) receipt.failures.push(`Smoke failed: ${target.label}`);
    }

    const video = await retryFetch(`${deployedUrl}assets/videos/bobs-cinematic-logo-hero.mp4`);
    const videoOk = video.status === 200 && /video\/mp4|application\/octet-stream/i.test(video.contentType) && video.bytes > 1_000_000;
    receipt.checks.push({ label: 'SkyeNet Bob hero video asset', ok: videoOk, status: video.status, content_type: video.contentType, bytes: video.bytes, url: `${deployedUrl}assets/videos/bobs-cinematic-logo-hero.mp4` });
    if (!videoOk) receipt.failures.push('Smoke failed: SkyeNet Bob hero video asset.');

    if (deployment.ok) {
      const writes = await updateFounderAccount(auth.token, deployedUrl, deployment.deploy?.deployment_id || '');
      receipt.founder_command_writes = {
        account: { status: writes.account.status, ok: Boolean(writes.account.ok && writes.account.body?.ok !== false), route: writes.account.body?.route || '' },
        operation: { status: writes.operation.status, ok: Boolean(writes.operation.ok && writes.operation.body?.ok !== false), operation_id: writes.operation.body?.operation?.id || '' },
        identity_link: { status: writes.link.status, ok: Boolean(writes.link.ok && writes.link.body?.ok !== false), link_id: writes.link.body?.link?.id || '' }
      };
      for (const [label, value] of Object.entries(receipt.founder_command_writes)) {
        receipt.checks.push({ label: `Founder Command ${label} write`, ok: value.ok, status: value.status });
        if (!value.ok) receipt.failures.push(`Founder Command ${label} write failed.`);
      }
    }
  }

  receipt.ok = receipt.failures.length === 0;
  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    live_url: receipt.deploy?.live_url || liveUrl,
    receipt: path.relative(repoRoot, paths.latest),
    stamped_receipt: path.relative(repoRoot, paths.stamped),
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    generated_at: new Date().toISOString(),
    lane: 'bobs-app-skynet-sovereign-deploy',
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    fatal: error?.stack || error?.message || String(error)
  };
  const paths = await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
