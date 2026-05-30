#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const migrationId = `bobs-0s-to-standalone-skynet-${stamp}`;
const workRoot = path.resolve('.tmp', migrationId);
const archiveRoot = path.join(workRoot, 'archive-root');
const receiptDir = path.resolve('test-artifacts/bobs-skynet-deploy');
const latestReceipt = path.join(receiptDir, 'bobs-0s-pre-redirect-archive-latest.json');
const archivePath = path.join(workRoot, `${migrationId}.zip`);

const zeroOsOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const skynetOrigin = 'https://skyenet.graylondonskyes.workers.dev';
const marketingOrigin = 'https://metraiyux-0s-marketing.pages.dev';
const skyVaultOrigin = 'https://skyevault-drop.graylondonskyes.workers.dev';

const copyTargets = [
  {
    rel: 'Skye-Clients/bobs-smoke-shop-mcp-redo',
    reason: 'Canonical Bob standalone app source used for SkyeNet deploys.'
  },
  {
    rel: '.tmp/bobs-smoke-shop-skynet-stage',
    optional: true,
    reason: 'Last staged SkyeNet deploy bundle, if present locally.'
  },
  {
    rel: 'metraiyux_0s_site/client-preview/bobs-smoke-shop.html',
    reason: 'Legacy gated 0S Bob preview page that can become a redirect.'
  },
  {
    rel: 'metraiyux_0s_site/client-preview/index.html',
    reason: 'Legacy 0S client preview index with Bob navigation.'
  },
  {
    rel: 'metraiyux_0s_site/data/client-preview/bobs-smoke-shop.json',
    optional: true,
    reason: 'Legacy 0S client-preview data record.'
  },
  {
    rel: 'metraiyux_0s_site/founder-command/client-credentials/bobs-smoke-shop.json',
    reason: 'Founder Command Bob credential/account handoff record before standalone URL cleanup.'
  },
  {
    rel: 'metraiyux_0s_site/cloudflare/tenant-backbone.mjs',
    reason: 'Canonical tenant map containing Bob workspace route metadata.'
  },
  {
    rel: 'metraiyux_0s_site/cloudflare/worker.js',
    reason: '0S Worker route layer before Bob legacy redirect insertion.'
  },
  {
    rel: 'metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/bobs-smoke-shop-litchfield-park',
    optional: true,
    reason: 'Valley Verified custom Bob business page copy; archived but not removed in this pass.'
  },
  {
    rel: 'metraiyux_0s_site/valley-verified/business/bobs-smoke-shop-litchfield-park/index.html',
    optional: true,
    reason: 'Current Valley Verified Bob business page; archived because Valley reconciliation is intentionally last.'
  },
  {
    rel: 'marketing/metraiyux-0s/bobs-smoke-shop-free-pilot.html',
    reason: 'Public Bob review page source.'
  },
  {
    rel: 'marketing/metraiyux-0s/bobs-smoke-shop-free-pilot-flyer.html',
    reason: 'Public Bob flyer source.'
  },
  {
    rel: 'test-artifacts/bobs-skynet-deploy/bobs-skynet-deploy-latest.json',
    optional: true,
    reason: 'Latest Bob SkyeNet deployment receipt.'
  },
  {
    rel: 'test-artifacts/bobs-skynet-deploy/bobs-standalone-skynet-http-smoke-latest.json',
    optional: true,
    reason: 'Latest Bob standalone SkyeNet HTTP smoke receipt.'
  },
  {
    rel: 'test-artifacts/bobs-skynet-deploy/standalone-skynet-architecture-closure-latest.json',
    optional: true,
    reason: 'Standalone SkyeNet architecture closure proof.'
  },
  {
    rel: 'test-artifacts/bobs-skynet-deploy/bobs-skyemail-provider-provision-status-latest.json',
    optional: true,
    reason: 'Current SkyEmail provider provisioning status and blocker receipt.'
  }
];

const liveSnapshots = [
  {
    id: 'old-zero-os-bob-home',
    url: `${zeroOsOrigin}/skyenet/bobs-smoke-shop/`,
    purpose: 'Old 0S-hosted Bob SkyeNet route before redirect.'
  },
  {
    id: 'old-zero-os-bob-workspace',
    url: `${zeroOsOrigin}/skyenet/bobs-smoke-shop/workspace-preview/`,
    purpose: 'Old 0S-hosted Bob workspace route before redirect.'
  },
  {
    id: 'old-zero-os-bob-manifest',
    url: `${zeroOsOrigin}/skyenet/bobs-smoke-shop/manifest.webmanifest`,
    purpose: 'Old 0S-hosted Bob PWA manifest before redirect.'
  },
  {
    id: 'old-zero-os-client-preview',
    url: `${zeroOsOrigin}/client-preview/bobs-smoke-shop.html`,
    purpose: 'Legacy gated 0S client preview route before redirect.'
  },
  {
    id: 'standalone-skynet-bob-home',
    url: `${skynetOrigin}/bobs-smoke-shop/`,
    purpose: 'Canonical standalone SkyeNet Bob app.'
  },
  {
    id: 'standalone-skynet-bob-workspace',
    url: `${skynetOrigin}/bobs-smoke-shop/workspace-preview/`,
    purpose: 'Canonical standalone SkyeNet Bob workspace preview.'
  },
  {
    id: 'bob-review-page',
    url: `${marketingOrigin}/bobs-smoke-shop-free-pilot`,
    purpose: 'Public Bob review page.'
  },
  {
    id: 'bob-flyer-page',
    url: `${marketingOrigin}/bobs-smoke-shop-free-pilot-flyer`,
    purpose: 'Public Bob flyer page.'
  },
  {
    id: 'zero-os-owner-unlock',
    url: `${zeroOsOrigin}/admin/login.html`,
    purpose: 'Owner/admin unlock page for gated 0S routes.'
  },
  {
    id: 'standalone-skynet-login',
    url: `${skynetOrigin}/login`,
    purpose: 'Standalone SkyeNet shared-gate login handoff.'
  },
  {
    id: 'skyevault-operator-unlock',
    url: `${skyVaultOrigin}/operator.html`,
    purpose: 'SkyeVault operator unlock page.'
  },
  {
    id: 'skyevault-client-vault',
    url: `${skyVaultOrigin}/#client-vault`,
    purpose: 'SkyeVault client-vault recovery surface.'
  }
];

function archiveRel(rel) {
  return path.join('repo-copy', rel.replace(/\\/g, '/'));
}

async function copyRecursive(source, destination) {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      if (['.git', 'node_modules', '.wrangler', '.skyenet'].includes(entry.name)) continue;
      await copyRecursive(path.join(source, entry.name), path.join(destination, entry.name));
    }
    return;
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

async function hashFile(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    import('node:fs').then(({ createReadStream }) => {
      const stream = createReadStream(file);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(hash.digest('hex')));
    }).catch(reject);
  });
}

async function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  const initial = await fs.stat(dir);
  if (initial.isFile()) return { files: 1, bytes: initial.size };
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        files += 1;
        bytes += (await fs.stat(full)).size;
      }
    }
  }
  await walk(dir);
  return { files, bytes };
}

async function snapshotUrl(item) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(item.url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'text/html,application/json,text/plain,*/*' }
    });
    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';
    const ext = contentType.includes('json')
      ? 'json'
      : contentType.includes('html')
        ? 'html'
        : contentType.includes('javascript')
          ? 'js'
          : contentType.includes('xml')
            ? 'xml'
            : 'txt';
    const safeId = item.id.replace(/[^a-z0-9._-]+/gi, '-');
    const bodyRel = path.join('live-snapshots', `${safeId}.${ext}`);
    const metaRel = path.join('live-snapshots', `${safeId}.headers.json`);
    await fs.mkdir(path.join(archiveRoot, 'live-snapshots'), { recursive: true });
    await fs.writeFile(path.join(archiveRoot, bodyRel), body);
    const meta = {
      ...item,
      status: response.status,
      ok: response.ok,
      elapsed_ms: Date.now() - startedAt,
      content_type: contentType,
      location: response.headers.get('location') || '',
      bytes: body.length,
      captured_at: new Date().toISOString(),
      body_archive_path: bodyRel
    };
    await fs.writeFile(path.join(archiveRoot, metaRel), `${JSON.stringify(meta, null, 2)}\n`);
    return meta;
  } catch (error) {
    return {
      ...item,
      ok: false,
      status: 0,
      elapsed_ms: Date.now() - startedAt,
      error: error?.message || String(error),
      captured_at: new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

await fs.rm(workRoot, { recursive: true, force: true });
await fs.mkdir(archiveRoot, { recursive: true });

const copied = [];
const missing = [];
for (const target of copyTargets) {
  const source = path.resolve(target.rel);
  if (!existsSync(source)) {
    missing.push({ ...target, source: target.rel });
    if (!target.optional) process.exitCode = 1;
    continue;
  }
  const destination = path.join(archiveRoot, archiveRel(target.rel));
  await copyRecursive(source, destination);
  const stats = await countFiles(destination);
  copied.push({ ...target, source: target.rel, archive_path: archiveRel(target.rel), ...stats });
}

const snapshots = [];
for (const item of liveSnapshots) snapshots.push(await snapshotUrl(item));

const manifest = {
  schema: 'bobs.0s-to-standalone-skynet.pre-redirect-archive.v1',
  ok: missing.filter((item) => !item.optional).length === 0,
  migration_id: migrationId,
  generated_at: new Date().toISOString(),
  source: 'MetrAIyux-0S workspace',
  purpose: 'Full pre-delete/pre-redirect copy of Bob-related 0S surfaces before old 0S routes are converted to standalone SkyeNet redirects.',
  deletion_boundary: {
    planned_action: 'redirect-old-0s-entrypoints',
    destructive_delete_performed_by_this_script: false,
    valley_verified_reconciliation: 'deferred-to-final-pass-after-owner-agent-work',
    standalone_skynet_canonical_app: `${skynetOrigin}/bobs-smoke-shop/`,
    standalone_skynet_canonical_workspace: `${skynetOrigin}/bobs-smoke-shop/workspace-preview/`
  },
  copied,
  missing,
  live_snapshots: snapshots,
  unlock_pages: [
    `${zeroOsOrigin}/admin/login.html`,
    `${skynetOrigin}/login`,
    `${skyVaultOrigin}/operator.html`,
    `${skyVaultOrigin}/#client-vault`
  ]
};

await writeJson(path.join(archiveRoot, 'manifest.json'), manifest);

const zip = spawnSync('zip', ['-qr', archivePath, '.'], { cwd: archiveRoot, encoding: 'utf8' });
if (zip.status !== 0) {
  throw new Error(`zip failed: ${zip.stderr || zip.stdout || zip.status}`);
}
const archiveStats = await fs.stat(archivePath);
const archiveSha256 = await hashFile(archivePath);
const archiveCounts = await countFiles(archiveRoot);

const receipt = {
  ...manifest,
  ok: manifest.ok,
  archive: {
    path: path.relative(repoRoot, archivePath),
    bytes: archiveStats.size,
    sha256: archiveSha256,
    file_count: archiveCounts.files
  },
  local_restore_note: 'Unzip the archive and use repo-copy/ for the exact pre-redirect local files plus live-snapshots/ for fetched production copies.'
};

await fs.mkdir(receiptDir, { recursive: true });
const stampedReceipt = path.join(receiptDir, `${migrationId}.json`);
await writeJson(stampedReceipt, receipt);
await writeJson(latestReceipt, { ...receipt, stamped_receipt: path.relative(repoRoot, stampedReceipt) });

console.log(JSON.stringify({
  ok: receipt.ok,
  migration_id: migrationId,
  archive: receipt.archive,
  copied: copied.length,
  missing_required: missing.filter((item) => !item.optional).length,
  receipt: path.relative(repoRoot, latestReceipt),
  stamped_receipt: path.relative(repoRoot, stampedReceipt)
}, null, 2));
