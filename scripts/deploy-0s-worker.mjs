import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DEFAULT_WORKSPACE_ROOT = '/workspaces/MetrAIyux-0S';
const REPO_ROOT = process.env.METRAIYUX_REPO_ROOT || (existsSync(DEFAULT_WORKSPACE_ROOT) ? DEFAULT_WORKSPACE_ROOT : process.cwd());
const ROOT_ENV_FILES = [...new Set([
  process.env.ROOT_ENV_FILE,
  process.env.METRAIYUX_ROOT_ENV,
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'env.txt'),
  path.join(DEFAULT_WORKSPACE_ROOT, '.env'),
  path.join(DEFAULT_WORKSPACE_ROOT, 'env.txt')
].filter(Boolean).map((file) => path.resolve(file)))].filter((candidate) => existsSync(candidate));
const ROOT_ENV = ROOT_ENV_FILES[0] || path.join(REPO_ROOT, '.env');
const SITE_ROOT = path.join(REPO_ROOT, 'metraiyux_0s_site');
const WRANGLER_CONFIG = path.join(REPO_ROOT, 'metraiyux_0s_site/wrangler.toml');
const DEPLOY_TMP_ROOT = path.join(REPO_ROOT, '.tmp', 'metraiyux-0s-worker-deploy');
const WORKER_SOURCE_STAGE = path.join(DEPLOY_TMP_ROOT, 'cloudflare');
const WORKER_ASSET_STAGE = path.join(DEPLOY_TMP_ROOT, 'assets');
const WORKER_SKYECOMMERCE_MIGRATIONS_STAGE = path.join(DEPLOY_TMP_ROOT, 'SkyeCommerce', 'migrations');
const GENERATED_WRANGLER_CONFIG = path.join(DEPLOY_TMP_ROOT, 'wrangler.toml');
const WORKER_DEPLOY_RECEIPT_DIR = path.join(REPO_ROOT, 'test-artifacts', '0s-worker-deploy');
const WORKER_DEPLOY_LATEST_RECEIPT = path.join(WORKER_DEPLOY_RECEIPT_DIR, 'founder-command-full-worker-deploy-latest.json');
const WORKER_NAME = process.env.ZERO_OS_WORKER_NAME || 'metraiyux-0s-full-system';
const WORKER_ASSET_LIMIT = Number(process.env.ZERO_OS_WORKER_ASSET_LIMIT || 19500);
const WORKER_MAX_ASSET_BYTES = Number(process.env.ZERO_OS_WORKER_MAX_ASSET_BYTES || 25 * 1024 * 1024);
const skippedOversizedAssets = [];
const DEPLOY_PROOF_ASSETS = ['1', 'true', 'yes', 'on'].includes(String(process.env.ZERO_OS_DEPLOY_PROOF_ASSETS || '').toLowerCase());
const DEPLOY_REFRESH_PROOF = ['1', 'true', 'yes', 'on'].includes(String(process.env.ZERO_OS_DEPLOY_REFRESH_PROOF || '').toLowerCase());

const WORKER_ASSET_DIR_INCLUDES = [
  '0s',
  '0s-wrapper-preview',
  'admin',
  'assets',
  'ae-command',
  'agentic-growth-layer',
  'ai-readiness',
  'apex',
  'ascension',
  'Auren',
  'blog',
  'branch-expansion',
  'business-card-factory',
  'changelog',
  'citadeldb',
  'client-app-factory',
  'connectlog-v7.7-relay13-operator-proof',
  'downloads/skyevault-agent',
  'founder-command',
  'gate',
  'HouseOperations',
  'key-gate-13th',
  'northstar',
  'operator',
  'pricing',
  'relay13-core-v1.7-connectlog-operator-proof',
  'saas',
  'sales',
  'signin-pro',
  'signinpro',
  'nexus',
  'skyenet',
  'skye-vault-os',
  'skye-content-repurposer-local',
  'skye-secure-platform',
  'skye-secure-secret-packs',
  'SkyeCommerce',
  'SkyeProfitConsole',
  'SkyeSplitEngine',
  'SkyeMusicNexus',
  'SkyeRouteX',
  'SkyeMediaCenter',
  'DeVisional Riftx/app',
  'skyerrors',
  'skyehawk',
  'sknore',
  'valley-verified',
  'Marketing-Made-Easy/AE-FlowPro',
  'Marketing-Made-Easy/BusinessLaunchGo',
  'Marketing-Made-Easy/kAIxUBrandKit',
  'Marketing-Made-Easy/BrandID-Offline-PWA',
  'Marketing-Made-Easy/SkyeWebCreatorMax',
  'Marketing-Made-Easy/SkyeDocxMax',
  'Marketing-Made-Easy/SkyeDocxBlog',
  'Marketing-Made-Easy/WebGrowthOperator',
  'Marketing-Made-Easy/arizona-growth-index',
  'Free99/apps/sovereigndocs',
  'Free99/apps/skyevaultpro',
  'Free99/apps/skyebox-authenticator',
  'Free99/apps/brandforge',
  'Free99/apps/jobping',
  'Free99/apps/keygate13',
  'Free99/apps/kaixu-codestudio',
  'Free99/apps/social-batch-factory',
  'Free99/apps/mydrive-offline-vault',
  'Free99/apps/skyepics',
  'Free99/apps/skyeapi-aegiscore',
  'Free99/apps/skyeopsconsole',
  'Free99/apps/skaixu-code-evaluator',
  'Free99/apps/doctor-ops-personal-vault',
  'Free99/apps/documorph',
  'Free99/apps/skyearcade',
  'Free99/apps/kaixu-storefront'
];

const WORKER_PUBLIC_CLIENT_SURFACE_SKIP_PREFIXES = [
  'client-app-factory/client-apps',
  'client-app-factory/assets/empire',
  'client-app-factory/assets/proof',
  'valley-verified/assets/client-builds',
  'valley-verified/business',
  'SkyeMusicNexus/artist-storefronts',
  'SkyeMusicNexus/one-music-gh-pages'
];

const MUSIC_NEXUS_WORKER_PUBLIC_ALLOW_PREFIXES = [
  'SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases',
  'SkyeMusicNexus/artist-storefronts/gray-skyes/drops/everything-movie-twin-engine'
];

const MUSIC_NEXUS_WORKER_PUBLIC_ALLOW_FILES = new Set(loadMusicNexusPublicCatalogFiles());

const WORKER_ASSET_FILE_INCLUDES = [
  'index.html',
  'favicon.ico',
  'favicon-32.png',
  'robots.txt',
  'sitemap.xml',
  'Free99/index.html',
  'Free99/demo.html',
  'Free99/free99-gate.js',
  'Free99/app-manifest.json',
  'live/SkyeMail/index.html',
  'live/skye-content-forge-publisher.html',
  'live/connectlog-relay13-operator-proof.html',
  'live/skye-media-center-operator-proof.html',
  'live/relay13-chat-hub.html',
  'live/company-knowledge-layer-proof.html',
  'live/marketing-made-easy-growth-suite.html',
  'live/houseoperations-skyebox-operator-proof.html',
  'live/skyeroutex-workforce-command.html',
  'live/skyeprofitconsole-profit-console.html',
  'live/skye-split-engine-operator-proof.html',
  'Marketing-Made-Easy/index.html',
  'skyegate/index.html',
  'brain/live-surface-registry.json',
  'brain/skyevault-vault-map.json',
  'proof/0s-truth-ledger.json',
  'proof/0s-truth-ledger.md',
  'proof/0s-production-closure.json',
  'data/skyenet-client-route-index.json',
  'SkyeMusicNexus/public/data/playlists.json',
  'SkyeMusicNexus/public/data/ad-placements.json',
  'valley-verified/data/businesses.json',
  'valley-verified/data/owner-crm-index.json',
  'valley-verified/data/ae-work-orders.json',
  'valley-verified/data/skyemail-provisioning.json',
  'valley-verified/data/client-app-factory-index.json',
  'valley-verified/data/account-opportunity-score.json',
  'valley-verified/data/lead-inbox-queue.json',
  'data/valuation-source-of-truth.json'
];

const WORKER_ASSET_SKIP_SEGMENTS = new Set([
  '.git',
  '.github',
  '.wrangler',
  '.cache',
  'node_modules',
  'test-artifacts',
  'coverage',
  'build',
  'data',
  'docs',
  'netlify',
  'original-masters',
  'originals',
  'proof',
  'scripts',
  'server',
  'smoke',
  'song-creation-bin',
  'src',
  'template-library',
  'templates',
  'tests'
]);
const WORKER_ASSET_SKIP_FILENAMES = new Set([
  '.assetsignore',
  '.env',
  '.dev.vars',
  'env.txt'
]);
const WORKER_ASSET_SKIP_PREFIXES = [
  '.env.',
  '.env-',
  '.dev.vars.'
];
const WORKER_ASSET_SKIP_SUFFIXES = [
  '.key',
  '.p12',
  '.pem',
  '.pfx'
];

function shouldSkipAssetFilename(name) {
  const lower = String(name || '').toLowerCase();
  if (WORKER_ASSET_SKIP_FILENAMES.has(lower)) return true;
  if (WORKER_ASSET_SKIP_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;
  if (WORKER_ASSET_SKIP_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return true;
  return false;
}

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function tokenShaped(value) {
  return /^[A-Za-z0-9_.-]{20,}$/.test(String(value || ''));
}

function addCandidate(candidates, candidate) {
  if (!candidate.token || !candidate.account || !tokenShaped(candidate.token)) return;
  if (candidates.some((item) => item.token === candidate.token && item.account === candidate.account)) return;
  candidates.push(candidate);
}

function relativeStagePath(file) {
  return path.relative(REPO_ROOT, file).replace(/\\/g, '/');
}

function normalizeWorkerAssetPath(value) {
  const clean = String(value || '').trim().replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
  if (!clean) return '';
  if (clean.startsWith('SkyeMusicNexus/')) return clean;
  return `SkyeMusicNexus/${clean}`;
}

function loadMusicNexusPublicCatalogFiles() {
  const files = [];
  const catalogPath = path.join(SITE_ROOT, 'SkyeMusicNexus/public/data/playlists.json');
  if (!existsSync(catalogPath)) return files;
  try {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    for (const track of catalog.tracks || []) {
      for (const field of ['audioUrl', 'localAudioHref', 'audio', 'audioFile', 'src']) {
        const normalized = normalizeWorkerAssetPath(track?.[field]);
        if (normalized) files.push(normalized);
      }
    }
  } catch (error) {
    console.warn(`Unable to read Music Nexus public catalog allowlist: ${error.message}`);
  }
  return [...new Set(files)];
}

function isMusicNexusWorkerPublicAllowed(rel) {
  return MUSIC_NEXUS_WORKER_PUBLIC_ALLOW_FILES.has(rel)
    || MUSIC_NEXUS_WORKER_PUBLIC_ALLOW_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

function shouldSkipAssetPath(fullPath) {
  const rel = path.relative(SITE_ROOT, fullPath).replace(/\\/g, '/');
  const name = path.basename(fullPath);
  if (shouldSkipAssetFilename(name)) return true;
  if (!isMusicNexusWorkerPublicAllowed(rel) && WORKER_PUBLIC_CLIENT_SURFACE_SKIP_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) return true;
  const segments = rel.split('/').filter(Boolean);
  if (segments.some((segment) => WORKER_ASSET_SKIP_SEGMENTS.has(segment))) return true;
  try {
    const stat = statSync(fullPath);
    if (stat.isFile() && stat.size > WORKER_MAX_ASSET_BYTES) {
      if (!skippedOversizedAssets.some((item) => item.path === rel)) {
        skippedOversizedAssets.push({ path: rel, bytes: stat.size, limit: WORKER_MAX_ASSET_BYTES });
      }
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function copyAssetEntry(relativePath) {
  const source = path.join(SITE_ROOT, relativePath);
  if (!existsSync(source)) return false;
  const stat = statSync(source);
  if (shouldSkipAssetPath(source)) return false;
  const dest = path.join(WORKER_ASSET_STAGE, relativePath);
  if (stat.isDirectory()) {
    cpSync(source, dest, {
      recursive: true,
      force: true,
      filter: (src) => !shouldSkipAssetPath(src)
    });
    return true;
  }
  if (stat.isFile()) {
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(source, dest);
    return true;
  }
  return false;
}

function shouldSkipExplicitAssetFile(fullPath) {
  const rel = path.relative(SITE_ROOT, fullPath).replace(/\\/g, '/');
  const name = path.basename(fullPath);
  if (shouldSkipAssetFilename(name)) return true;
  try {
    const stat = statSync(fullPath);
    if (stat.isFile() && stat.size > WORKER_MAX_ASSET_BYTES) {
      if (!skippedOversizedAssets.some((item) => item.path === rel)) {
        skippedOversizedAssets.push({ path: rel, bytes: stat.size, limit: WORKER_MAX_ASSET_BYTES });
      }
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function copyExplicitAssetFile(relativePath) {
  const source = path.join(SITE_ROOT, relativePath);
  if (!existsSync(source)) return false;
  const stat = statSync(source);
  if (!stat.isFile() || shouldSkipExplicitAssetFile(source)) return false;
  const dest = path.join(WORKER_ASSET_STAGE, relativePath);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  return true;
}

function copyTopLevelRuntimeFiles() {
  for (const entry of readdirSync(SITE_ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (shouldSkipAssetFilename(entry.name)) continue;
    if (/^(wrangler(?:\..*)?\.toml|package(?:-lock)?\.json)$/i.test(entry.name)) continue;
    copyAssetEntry(entry.name);
  }
}

function countFiles(root) {
  if (!existsSync(root)) return 0;
  let count = 0;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) count += 1;
    }
  }
  return count;
}

function shouldCopyWorkerSourcePath(sourceRoot, fullPath) {
  const rel = path.relative(sourceRoot, fullPath).replace(/\\/g, '/');
  if (!rel) return true;
  const name = path.basename(fullPath);
  if (shouldSkipAssetFilename(name)) return false;
  const segments = rel.split('/').filter(Boolean);
  return !segments.some((segment) => ['.git', '.wrangler', '.cache', 'node_modules', 'test-artifacts', 'coverage'].includes(segment));
}

function copyWorkerSourceTree(sourceRoot, destRoot) {
  rmSync(destRoot, { recursive: true, force: true });
  if (!existsSync(sourceRoot)) return false;
  mkdirSync(path.dirname(destRoot), { recursive: true });
  cpSync(sourceRoot, destRoot, {
    recursive: true,
    force: true,
    filter: (src) => shouldCopyWorkerSourcePath(sourceRoot, src)
  });
  return true;
}

function stageWorkerSourcePackage() {
  mkdirSync(DEPLOY_TMP_ROOT, { recursive: true });
  copyWorkerSourceTree(path.join(SITE_ROOT, 'cloudflare'), WORKER_SOURCE_STAGE);
  copyWorkerSourceTree(path.join(SITE_ROOT, 'SkyeCommerce', 'migrations'), WORKER_SKYECOMMERCE_MIGRATIONS_STAGE);
}

function copyRepoVaultProjectManifest() {
  if (!DEPLOY_PROOF_ASSETS) return;
  const sourceDir = path.join(SITE_ROOT, 'proof', 'repo-vault-project-manifest');
  const includeChunks = ['1', 'true', 'yes', 'on'].includes(String(process.env.ZERO_OS_DEPLOY_PROJECT_MANIFEST_CHUNKS || '').toLowerCase());
  if (includeChunks && existsSync(sourceDir)) {
    const destDir = path.join(WORKER_ASSET_STAGE, 'proof', 'repo-vault-project-manifest');
    mkdirSync(path.dirname(destDir), { recursive: true });
    cpSync(sourceDir, destDir, {
      recursive: true,
      force: true,
      filter: (src) => !shouldSkipAssetFilename(path.basename(src))
    });
  }
  copyExplicitAssetFile('proof/repo-vault-project-manifest.json');
}

function stageWorkerAssets() {
  rmSync(WORKER_ASSET_STAGE, { recursive: true, force: true });
  mkdirSync(WORKER_ASSET_STAGE, { recursive: true });
  copyTopLevelRuntimeFiles();
  for (const relativePath of WORKER_ASSET_DIR_INCLUDES) copyAssetEntry(relativePath);
  for (const relativePath of WORKER_ASSET_FILE_INCLUDES) copyExplicitAssetFile(relativePath);
  copyRepoVaultProjectManifest();

  const fileCount = countFiles(WORKER_ASSET_STAGE);
  if (fileCount > WORKER_ASSET_LIMIT) {
    console.error(JSON.stringify({
      ok: false,
      error: 'Curated 0S Worker asset stage exceeds the deploy asset cap.',
      fileCount,
      limit: WORKER_ASSET_LIMIT,
      stage: relativeStagePath(WORKER_ASSET_STAGE)
    }, null, 2));
    process.exit(1);
  }
  const summary = {
    ok: true,
    worker_asset_stage: relativeStagePath(WORKER_ASSET_STAGE),
    fileCount,
    limit: WORKER_ASSET_LIMIT,
    maxAssetBytes: WORKER_MAX_ASSET_BYTES,
    oversizedAssetSkips: skippedOversizedAssets,
    publicClientSurfaceSkips: WORKER_PUBLIC_CLIENT_SURFACE_SKIP_PREFIXES,
    proofAssetsDeployEnabled: DEPLOY_PROOF_ASSETS,
    strategy: '0S Worker deploys shared gate/API/runtime/control assets. Public client app bundles stay on standalone SkyeNet; 0S stages only route/control records and redirects after proof.'
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

function readJsonFile(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeWorkerDeployReceipt({ status, output, stageSummary }) {
  const currentVersionId = String(output || '').match(/Current Version ID:\s*([0-9a-f-]+)/i)?.[1] || '';
  const publicUrl = String(output || '').match(/https:\/\/metraiyux-0s-full-system\.graylondonskyes\.workers\.dev[^\s]*/i)?.[0] || `https://${WORKER_NAME}.graylondonskyes.workers.dev`;
  const uploadedChangedAssets = Number(String(output || '').match(/Uploaded\s+(\d+)\s+files/i)?.[1] || String(output || '').match(/Found\s+(\d+)\s+new or modified static assets/i)?.[1] || 0);
  const previous = readJsonFile(WORKER_DEPLOY_LATEST_RECEIPT, {});
  const generatedAt = new Date().toISOString();
  const receipt = {
    ok: status === 0 && Boolean(currentVersionId),
    generatedAt,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    worker: WORKER_NAME,
    url: publicUrl,
    currentVersionId,
    previousVersionId: previous.currentVersionId || previous.versionId || '',
    reason: process.env.ZERO_OS_DEPLOY_REASON || '0S Worker deploy with curated gated assets, proof receipts, and non-browser production verification.',
    assetStage: stageSummary.worker_asset_stage,
    stagedFileCount: stageSummary.fileCount,
    uploadedChangedAssets,
    sensitiveFilenameCount: 0,
    sensitiveFilenames: [],
    secretFileStageBlocked: true
  };
  mkdirSync(WORKER_DEPLOY_RECEIPT_DIR, { recursive: true });
  writeFileSync(WORKER_DEPLOY_LATEST_RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  const dated = path.join(WORKER_DEPLOY_RECEIPT_DIR, `${generatedAt.replace(/[:.]/g, '-')}-worker-deploy.json`);
  writeFileSync(dated, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    deploy_receipt: path.relative(REPO_ROOT, WORKER_DEPLOY_LATEST_RECEIPT).split(path.sep).join('/'),
    dated_receipt: path.relative(REPO_ROOT, dated).split(path.sep).join('/'),
    currentVersionId: receipt.currentVersionId,
    previousVersionId: receipt.previousVersionId,
    stagedFileCount: receipt.stagedFileCount,
    uploadedChangedAssets: receipt.uploadedChangedAssets
  }, null, 2));
}

function writeGeneratedWranglerConfig() {
  mkdirSync(DEPLOY_TMP_ROOT, { recursive: true });
  const source = readFileSync(WRANGLER_CONFIG, 'utf8');
  const config = source
    .replace(/^main\s*=\s*"cloudflare\/worker\.js"$/m, 'main = "cloudflare/worker.js"')
    .replace(/^base_dir\s*=\s*"cloudflare"$/m, 'base_dir = "cloudflare"')
    .replace(/^directory\s*=\s*"\.\/"$/m, 'directory = "assets"')
    .replace(/^migrations_dir\s*=\s*"SkyeCommerce\/migrations"$/m, 'migrations_dir = "SkyeCommerce/migrations"');
  writeFileSync(GENERATED_WRANGLER_CONFIG, config);
  return GENERATED_WRANGLER_CONFIG;
}

function readCloudflareCandidates() {
  const candidates = [];

  if (process.env.CLOUDFLARE_API_TOKEN && (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID)) {
    addCandidate(candidates, {
      source: 'process-env:CLOUDFLARE_API_TOKEN',
      line: null,
      score: 90,
      token: process.env.CLOUDFLARE_API_TOKEN,
      account: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID
    });
  }

  for (const envPath of ROOT_ENV_FILES) {
    const labelPrefix = path.relative(REPO_ROOT, envPath) || path.basename(envPath);
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    const formal = {};

    lines.forEach((raw, index) => {
      const line = index + 1;
      const assignment = raw.trim().match(/^(?:export\s+)?(CLOUDFLARE_API_TOKEN|CLOUDFLARE_DEPLOY_API_TOKEN|CLOUDFLARE_MANAGEMENT_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CF_API_TOKEN|CF_ACCOUNT_ID|METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID)\s*=\s*(.*)$/);
      if (assignment) {
        formal[assignment[1]] = { value: unquote(assignment[2]), line };
      }

      const proseToken = raw.match(/Your API Token\s*=\s*"([^"]+)"/i);
      if (!proseToken) return;

      let account = '';
      let accountLine = null;
      for (let offset = 1; offset <= 4; offset += 1) {
        const accountMatch = (lines[index + offset] || '').match(/Account ID\s*=\s*"([^"]+)"/i);
        if (accountMatch) {
          account = accountMatch[1];
          accountLine = line + offset;
          break;
        }
      }

      const label = lines.slice(Math.max(0, index - 4), index).reverse().find((item) => item.trim())?.trim() || `${labelPrefix}-prose-token`;
      addCandidate(candidates, {
        source: `${labelPrefix}:prose:${label.slice(0, 64)}`,
        line,
        accountLine,
        score: /super\s+api\s+token|pages|deploy|worker/i.test(label) ? 120 : 60,
        token: proseToken[1],
        account
      });
    });

    const formalAccount = formal.CLOUDFLARE_ACCOUNT_ID?.value || formal.CF_ACCOUNT_ID?.value || formal.METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID?.value;
    addCandidate(candidates, {
      source: `${labelPrefix}:CLOUDFLARE_DEPLOY_API_TOKEN`,
      line: formal.CLOUDFLARE_DEPLOY_API_TOKEN?.line,
      score: 115,
      token: formal.CLOUDFLARE_DEPLOY_API_TOKEN?.value,
      account: formalAccount
    });
    addCandidate(candidates, {
      source: `${labelPrefix}:CLOUDFLARE_API_TOKEN`,
      line: formal.CLOUDFLARE_API_TOKEN?.line,
      score: 90,
      token: formal.CLOUDFLARE_API_TOKEN?.value,
      account: formalAccount
    });
    addCandidate(candidates, {
      source: `${labelPrefix}:CF_API_TOKEN`,
      line: formal.CF_API_TOKEN?.line,
      score: 80,
      token: formal.CF_API_TOKEN?.value,
      account: formalAccount
    });
  }

  return candidates.sort((a, b) => b.score - a.score || (b.line || 0) - (a.line || 0));
}

async function cloudflareGet(candidate, path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: {
      Authorization: `Bearer ${candidate.token}`,
      'Content-Type': 'application/json'
    }
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return {
    status: response.status,
    success: Boolean(body.success),
    errors: Array.isArray(body.errors) ? body.errors.map((error) => ({
      code: error.code,
      message: error.message
    })).slice(0, 3) : []
  };
}

async function resolveCloudflareEnv() {
  const candidates = readCloudflareCandidates();
  const failures = [];

  for (const candidate of candidates) {
    const verify = await cloudflareGet(candidate, '/user/tokens/verify');
    const service = await cloudflareGet(candidate, `/accounts/${candidate.account}/workers/services/${WORKER_NAME}`);

    const redacted = {
      source: candidate.source,
      line: candidate.line,
      accountLine: candidate.accountLine,
      tokenHash: sha12(candidate.token),
      accountSuffix: candidate.account.slice(-6),
      verify,
      service
    };

    if (service.success) {
      console.log(JSON.stringify({
        ok: true,
        using: {
          source: redacted.source,
          line: redacted.line,
          accountLine: redacted.accountLine,
          tokenHash: redacted.tokenHash,
          accountSuffix: redacted.accountSuffix,
          worker: WORKER_NAME,
          verifyStatus: verify.status,
          serviceStatus: service.status
        }
      }, null, 2));

      return {
        ...process.env,
        TMPDIR: '/tmp',
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_WRITE_LOGS: 'false',
        CLOUDFLARE_API_TOKEN: candidate.token,
        CLOUDFLARE_ACCOUNT_ID: candidate.account,
        CF_ACCOUNT_ID: candidate.account
      };
    }

    failures.push(redacted);
  }

  console.error(JSON.stringify({
    ok: false,
    error: `No Cloudflare token candidate could access Worker service ${WORKER_NAME}.`,
    failures
  }, null, 2));
  process.exit(1);
}

function runBuildProof() {
  const steps = [
    ['node', ['tools/skyevault-autosync-proof-publish.mjs', '--env-file=env.txt']]
  ];
  for (const [command, args] of steps) {
    const result = spawnSync(command, args, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        SKYEVAULT_AUTOSYNC_NOTIFY: process.env.SKYEVAULT_AUTOSYNC_NOTIFY || '0'
      },
      stdio: 'inherit'
    });
    if (result.status !== 0) {
      console.error(`${command} ${args.join(' ')} failed before Worker deploy.`);
      process.exit(result.status ?? 1);
    }
  }
}

if (DEPLOY_REFRESH_PROOF) runBuildProof();
stageWorkerSourcePackage();
const stageSummary = stageWorkerAssets();
const deployConfig = writeGeneratedWranglerConfig();
if (process.argv.includes('--stage-only')) {
  console.log(JSON.stringify({
    ok: true,
    stage_only: true,
    worker_source_stage: relativeStagePath(WORKER_SOURCE_STAGE),
    worker_asset_stage: relativeStagePath(WORKER_ASSET_STAGE),
    generated_config: relativeStagePath(deployConfig)
  }, null, 2));
  process.exit(0);
}

const wranglerVersion = process.env.WRANGLER_VERSION || '4.14.0';
const result = spawnSync('npx', ['-y', '-p', `wrangler@${wranglerVersion}`, 'wrangler', 'deploy', '--config', deployConfig], {
  cwd: REPO_ROOT,
  env: await resolveCloudflareEnv(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 32
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
writeWorkerDeployReceipt({
  status: result.status ?? 1,
  output: `${result.stdout || ''}\n${result.stderr || ''}`,
  stageSummary
});

process.exit(result.status ?? 1);
