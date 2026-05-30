#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const workerDeployScript = path.join(repoRoot, 'scripts', 'deploy-0s-worker.mjs');
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-client-app-migration-inventory');
const latestReceipt = path.join(artifactRoot, 'skyenet-client-app-migration-inventory-latest.json');
const docsPath = path.join(siteRoot, 'docs', 'SKYENET_CLIENT_APP_MIGRATION_TODO.md');

const clientSurfaceIncludes = new Set([
  'client-app-factory',
  'valley-verified',
  'SkyeMusicNexus',
  'skye-content-repurposer-local',
  'SkyeMediaCenter',
  'SkyeRouteX',
  'Marketing-Made-Easy/AE-FlowPro',
  'Marketing-Made-Easy/BusinessLaunchGo',
  'Marketing-Made-Easy/kAIxUBrandKit',
  'Marketing-Made-Easy/BrandID-Offline-PWA',
  'Marketing-Made-Easy/SkyeWebCreatorMax',
  'Marketing-Made-Easy/SkyeDocxMax',
  'Marketing-Made-Easy/SkyeDocxBlog',
  'Marketing-Made-Easy/WebGrowthOperator',
  'Marketing-Made-Easy/arizona-growth-index'
]);

const free99AppsToReview = [
  'sovereigndocs',
  'skyevaultpro',
  'skyebox-authenticator',
  'brandforge',
  'jobping',
  'keygate13',
  'kaixu-codestudio',
  'social-batch-factory',
  'mydrive-offline-vault',
  'skyepics',
  'skyeapi-aegiscore',
  'skyeopsconsole',
  'skaixu-code-evaluator',
  'doctor-ops-personal-vault',
  'documorph',
  'skyearcade',
  'kaixu-storefront'
];

const knownHostnames = {
  'skyeroutex-logistics-public': 'skyenet.skyeroutex-logistics',
  'skyesol-company-public': 'skyenet.skyesol',
  'solenterprises-public': 'skyenet.solenterprises',
  'valley-verified-custom-build': 'skyenet.valley-verified',
  'valley-verified-marketplace': 'skyenet.valley-verified'
};

const knownWorkspaces = {
  'skyeroutex-logistics-public': 'skyeroutex-logistics',
  'skyesol-company-public': 'skyesol',
  'solenterprises-public': 'solenterprises',
  'valley-verified-custom-build': 'valley-verified',
  'valley-verified-marketplace': 'valley-verified'
};

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function siteRel(file) {
  return path.relative(siteRoot, file).replace(/\\/g, '/');
}

function slugHost(slug) {
  return knownHostnames[slug] || `skyenet.${slug.replace(/-public$/i, '').replace(/-custom-build$/i, '')}`;
}

function workspaceIdFor(id) {
  return knownWorkspaces[id] || id.replace(/-public$/i, '');
}

function titleFromSlug(slug) {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeNeedle(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function readText(file, fallback = '') {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function listChildDirs(root) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function dirStats(root, limit = 8000) {
  let files = 0;
  let bytes = 0;
  let truncated = false;
  const extensions = {};
  const largest = [];
  async function walk(current) {
    if (truncated) return;
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (['.git', 'node_modules', '.wrangler', '.skyenet', '.cache'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        let stat;
        try {
          stat = await fs.stat(full);
        } catch {
          continue;
        }
        files += 1;
        bytes += stat.size;
        const ext = path.extname(entry.name).slice(1).toLowerCase() || '(none)';
        extensions[ext] = (extensions[ext] || 0) + stat.size;
        largest.push({ path: rel(full), bytes: stat.size });
        largest.sort((a, b) => b.bytes - a.bytes);
        largest.splice(8);
        if (files >= limit) {
          truncated = true;
          return;
        }
      }
    }
  }
  await walk(root);
  return { files, bytes, truncated, extensions, largest };
}

function parseQuotedArray(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

async function workerStageManifest() {
  const source = await readText(workerDeployScript);
  return {
    dirIncludes: parseQuotedArray(source, 'WORKER_ASSET_DIR_INCLUDES'),
    fileIncludes: parseQuotedArray(source, 'WORKER_ASSET_FILE_INCLUDES'),
    publicClientSurfaceSkipPrefixes: parseQuotedArray(source, 'WORKER_PUBLIC_CLIENT_SURFACE_SKIP_PREFIXES')
  };
}

function stagedByWorker(siteRelativePath, stageManifest) {
  const normalized = String(siteRelativePath || '').replace(/^\/+/, '').replace(/\/+$/, '');
  const skipHit = (stageManifest.publicClientSurfaceSkipPrefixes || []).find((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  if (skipHit) return { staged: false, by: `skipped:${skipHit}` };
  const dirHit = stageManifest.dirIncludes.find((include) => normalized === include || normalized.startsWith(`${include}/`));
  const fileHit = stageManifest.fileIncludes.find((include) => normalized === include || include.startsWith(`${normalized}/`));
  return {
    staged: Boolean(dirHit || fileHit),
    by: dirHit || fileHit || ''
  };
}

async function receiptIndex() {
  const roots = [
    path.join(repoRoot, 'test-artifacts'),
    path.join(siteRoot, 'skyenet-drops')
  ];
  const files = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git'].includes(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile() && /\.(json|md)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  for (const root of roots) {
    if (existsSync(root)) await walk(root);
  }
  return files.map((file) => ({ file, normalized: normalizeNeedle(rel(file)) }));
}

function matchingReceipts(receipts, slug) {
  const needles = [...new Set([
    slug,
    slug.replace(/-(public|custom-build)$/i, ''),
    slug.replace(/-/g, '')
  ].map(normalizeNeedle).filter((item) => item.length > 3))];
  return receipts
    .filter((receipt) => needles.some((needle) => receipt.normalized.includes(needle)))
    .slice(0, 10)
    .map((receipt) => rel(receipt.file));
}

function deployCommand({ buildDir, sourceRoot, projectId, workspaceId, host, mount = '/', publicAccess = true }) {
  const args = [
    'npm run skyenet:deploy --',
    `  --api ${skynetBase}/api/skyenet`,
    `  --dir ${buildDir}`,
    `  --source-root ${sourceRoot}`,
    `  --project ${projectId}`,
    `  --workspace ${workspaceId}`,
    `  --host ${host}`,
    `  --mount ${mount}`,
    '  --url-mode subdomain',
    publicAccess ? '  --public' : '',
    '  --concurrency 4'
  ].filter(Boolean);
  return args.join(' \\\n');
}

async function candidateBase({
  id,
  name,
  lane,
  sourceRoot,
  buildDir = sourceRoot,
  currentRoutes = [],
  targetHost = slugHost(id),
  targetMount = '/',
  publicAccess = true,
  priority = 'P2',
  notes = [],
  stageManifest,
  receipts
}) {
  const buildExists = await exists(buildDir);
  const sourceExists = await exists(sourceRoot);
  const buildSiteRel = buildDir.startsWith(siteRoot) ? siteRel(buildDir) : rel(buildDir);
  const stage = buildDir.startsWith(siteRoot)
    ? stagedByWorker(buildSiteRel, stageManifest)
    : { staged: false, by: '' };
  const deployTarget = await readJson(path.join(buildDir, 'deploy-target.json'));
  const stats = buildExists ? await dirStats(buildDir) : null;
  const projectId = id;
  const workspaceId = workspaceIdFor(id);
  const targetUrl = targetMount === '/' ? `https://${targetHost}/` : `https://${targetHost}${targetMount.endsWith('/') ? targetMount : `${targetMount}/`}`;
  const deployTargetPrimary = deployTarget
    ? [
        deployTarget.deployHost,
        deployTarget.provider,
        deployTarget.publicUrl,
        deployTarget.liveUrl,
        deployTarget.url,
        deployTarget.host
      ].filter(Boolean).join(' ')
    : '';
  const staleDeployTarget = Boolean(deployTarget && /worker assets|metraiyux-0s|pages\.dev|netlify/i.test(deployTargetPrimary));
  return {
    id,
    name,
    lane,
    priority,
    source_root: rel(sourceRoot),
    public_build_dir: rel(buildDir),
    source_exists: sourceExists,
    build_exists: buildExists,
    current_routes: currentRoutes,
    target: {
      hostname: targetHost,
      mount_path: targetMount,
      url_mode: 'subdomain',
      public_access: publicAccess,
      live_url: targetUrl
    },
    zero_os_worker_stage: stage,
    stale_deploy_target: staleDeployTarget,
    deploy_target: deployTarget,
    receipts: matchingReceipts(receipts, id),
    stats,
    deploy_command: deployCommand({
      buildDir: rel(buildDir),
      sourceRoot: rel(sourceRoot),
      projectId,
      workspaceId,
      host: targetHost,
      mount: targetMount,
      publicAccess
    }),
    required_closeout: [
      'Archive current 0S/Pages/legacy surface before deletion or redirect.',
      'Deploy public build bundle to standalone SkyeNet.',
      'Upload private source package with --source-root.',
      'Prove route, key assets, source-download 401 without auth, and gated source download with shared owner gate.',
      'Update Founder Command/client records, QR targets, sitemaps, robots, JSON-LD, and cross-links.',
      'Redirect old 0S/legacy route only after archive and proof receipts exist.'
    ],
    notes
  };
}

async function buildInventory() {
  const stageManifest = await workerStageManifest();
  const receipts = await receiptIndex();
  const candidates = [];

  for (const dir of await listChildDirs(path.join(siteRoot, 'skyenet-drops'))) {
    const slug = path.basename(dir);
    if (slug === 'valley-verified-rebuild-content') continue;
    if (!(await exists(path.join(dir, 'index.html')))) continue;
    candidates.push(await candidateBase({
      id: slug,
      name: titleFromSlug(slug),
      lane: 'existing-skynet-drop',
      sourceRoot: dir,
      buildDir: dir,
      currentRoutes: [`${zeroOsBase}/skyenet/${slug.replace(/-public$/i, '')}/`, `${skynetBase}/${slug.replace(/-public$/i, '')}/`],
      targetHost: slugHost(slug),
      priority: ['skyeroutex-logistics-public', 'skyesol-company-public', 'solenterprises-public'].includes(slug) ? 'P0' : 'P1',
      notes: ['Already staged as a SkyeNet drop; confirm route receipt, DNS/custom-host binding, and source custody before public copy points here.'],
      stageManifest,
      receipts
    }));
  }

  const valleySource = path.join(siteRoot, '_platform-sources', 'valley-verified');
  const valleyDist = path.join(valleySource, 'dist');
  candidates.push(await candidateBase({
    id: 'valley-verified-marketplace',
    name: 'Valley Verified Marketplace',
    lane: 'marketplace-client-network',
    sourceRoot: valleySource,
    buildDir: valleyDist,
    currentRoutes: [`${zeroOsBase}/valley-verified/`, `${skynetBase}/valley-verified/`],
    targetHost: knownHostnames['valley-verified-marketplace'],
    priority: 'P0',
    notes: ['Directive says reconcile Valley Verified last when another agent is actively changing it, but it is still a public client network that should not remain a main 0S Worker asset warehouse.'],
    stageManifest,
    receipts
  }));

  for (const dir of await listChildDirs(path.join(siteRoot, 'client-app-factory', 'client-apps'))) {
    const slug = path.basename(dir);
    if (!(await exists(path.join(dir, 'index.html')))) continue;
    const rootTwin = path.join(repoRoot, 'client-app-factory', 'client-apps', slug);
    candidates.push(await candidateBase({
      id: slug,
      name: titleFromSlug(slug),
      lane: 'client-app-factory-generated-app',
      sourceRoot: existsSync(rootTwin) ? rootTwin : dir,
      buildDir: dir,
      currentRoutes: [`${zeroOsBase}/client-app-factory/client-apps/${slug}/`],
      targetHost: slugHost(slug),
      priority: 'P1',
      notes: ['Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.'],
      stageManifest,
      receipts
    }));
  }

  for (const dir of await listChildDirs(path.join(siteRoot, 'skyenet-drops', 'valley-verified-rebuild-content', 'businesses'))) {
    const slug = path.basename(dir);
    if (!(await exists(path.join(dir, 'index.html')))) continue;
    candidates.push(await candidateBase({
      id: slug,
      name: titleFromSlug(slug),
      lane: 'valley-verified-business-app-drop',
      sourceRoot: dir,
      buildDir: dir,
      currentRoutes: [`${zeroOsBase}/valley-verified/business/${slug}/`],
      targetHost: slugHost(slug),
      priority: 'P2',
      notes: ['Business-specific rebuild content. Deploy individually only when this is meant to be a standalone client app; otherwise keep as Valley Verified marketplace content under the standalone Valley host.'],
      stageManifest,
      receipts
    }));
  }

  for (const dir of await listChildDirs(path.join(siteRoot, 'SkyeMusicNexus', 'artist-storefronts'))) {
    const slug = path.basename(dir);
    if (!(await exists(path.join(dir, 'index.html')))) continue;
    const generatedProof = /^artist-(live-browser|full-matrix)-\d+/i.test(slug);
    candidates.push(await candidateBase({
      id: `musicnexus-${slug}`,
      name: `SkyeMusicNexus ${titleFromSlug(slug)}`,
      lane: generatedProof ? 'musicnexus-generated-proof-storefront' : 'musicnexus-artist-storefront',
      sourceRoot: path.join(siteRoot, 'SkyeMusicNexus'),
      buildDir: dir,
      currentRoutes: [`${zeroOsBase}/SkyeMusicNexus/artist-storefronts/${slug}/`, `${skynetBase}/musicnexus/${slug}/`],
      targetHost: generatedProof ? 'skyenet.graylondonskyes.workers.dev' : slugHost(slug),
      targetMount: generatedProof ? `/musicnexus/${slug}` : '/',
      priority: generatedProof ? 'HOLD' : 'P1',
      notes: generatedProof
        ? ['Generated proof/time-stamped storefront; do not make it a canonical public client app without owner cleanup/approval.']
        : ['Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.'],
      stageManifest,
      receipts
    }));
  }

  for (const slug of free99AppsToReview) {
    const dir = path.join(siteRoot, 'Free99', 'apps', slug);
    if (!(await exists(path.join(dir, 'index.html')))) continue;
    candidates.push(await candidateBase({
      id: `free99-${slug}`,
      name: `Free99 ${titleFromSlug(slug)}`,
      lane: 'free99-mounted-app-review',
      sourceRoot: dir,
      buildDir: dir,
      currentRoutes: [`${zeroOsBase}/Free99/apps/${slug}/`],
      targetHost: slugHost(slug),
      priority: 'REVIEW',
      publicAccess: false,
      notes: ['Do not blindly move core 0S tools. If this app is sold or handed to a client as a public product, deploy that public bundle on standalone SkyeNet and keep 0S as shared-gate command/control.'],
      stageManifest,
      receipts
    }));
  }

  const p0 = candidates.filter((item) => item.priority === 'P0');
  const p1 = candidates.filter((item) => item.priority === 'P1');
  const stale = candidates.filter((item) => item.stale_deploy_target);
  const workerStaged = candidates.filter((item) => item.zero_os_worker_stage.staged);
  const stagedClientIncludes = workerStaged.map((item) => ({
    include: item.zero_os_worker_stage.by,
    candidate_id: item.id,
    priority: item.priority,
    lane: item.lane,
    problem: 'Client/customer/product candidate is staged as a main 0S Worker asset include.',
    required_fix: 'Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.'
  }));
  return {
    schema: 'skyenet.client-app-migration-inventory.v1',
    ok: true,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    zero_os_base: zeroOsBase,
    skynet_base: skynetBase,
    directive: 'Public client/customer apps belong on standalone SkyeNet platform-native routes; the 0S Worker is the shared-gate control/API plane.',
    worker_stage_manifest: {
      client_surface_includes: stagedClientIncludes,
      public_client_surface_skip_prefixes: stageManifest.publicClientSurfaceSkipPrefixes || [],
      dir_include_count: stageManifest.dirIncludes.length,
      file_include_count: stageManifest.fileIncludes.length
    },
    summary: {
      total_candidates: candidates.length,
      p0_count: p0.length,
      p1_count: p1.length,
      stale_deploy_target_count: stale.length,
      currently_staged_by_zero_os_worker_count: workerStaged.length,
      existing_receipt_linked_count: candidates.filter((item) => item.receipts.length).length
    },
    migration_order: [
      'P0 company/public network routes: SkyeRouteX, SkyeSol, SOLEnterprises, Valley Verified platform host/DNS/source custody.',
      'P1 generated client apps and real artist/customer storefronts: deploy each public bundle to SkyeNet host-native route with --source-root.',
      'P2 Valley business rebuild drops: decide whether each is a standalone client app or content under standalone Valley Verified.',
      'REVIEW Free99/product apps: keep internal/gated 0S tools mounted; only public sold/client handoff bundles move to SkyeNet.',
      'After archive and proof receipts exist, replace old 0S/client-app-factory/skyenet mounts with redirects or gated command records.'
    ],
    candidates
  };
}

function compactCommand(command) {
  return command.replace(/\s+\\\n/g, ' ');
}

function renderDoc(receipt) {
  const lines = [];
  lines.push('# SkyeNet Client App Migration Todo');
  lines.push('');
  lines.push(`Generated: ${receipt.generated_at}`);
  lines.push('');
  lines.push('## Architecture Rule');
  lines.push('');
  lines.push('Client/customer public apps, media bundles, artist storefronts, and generated business apps must deploy to standalone SkyeNet routes. The main 0S Worker stays the shared FS27/SkyGate/Free99 gate, owner command, control API, and redirect layer.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Candidates found: ${receipt.summary.total_candidates}`);
  lines.push(`- P0 routes: ${receipt.summary.p0_count}`);
  lines.push(`- P1 client/customer apps: ${receipt.summary.p1_count}`);
  lines.push(`- Stale Worker/Pages/Netlify deploy-target records: ${receipt.summary.stale_deploy_target_count}`);
  lines.push(`- Candidates currently staged by the 0S Worker: ${receipt.summary.currently_staged_by_zero_os_worker_count}`);
  lines.push('');
  lines.push('## Worker Stage Problems');
  lines.push('');
  if (!receipt.worker_stage_manifest.client_surface_includes.length) {
    lines.push('- No client-surface directory includes were detected in the 0S Worker staging manifest.');
  } else {
    for (const item of receipt.worker_stage_manifest.client_surface_includes) {
      lines.push(`- \`${item.candidate_id}\` via \`${item.include}\`: ${item.required_fix}`);
    }
  }
  lines.push('');
  lines.push('## Migration Order');
  lines.push('');
  for (const item of receipt.migration_order) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## P0 And P1 Surfaces');
  lines.push('');
  for (const item of receipt.candidates.filter((candidate) => ['P0', 'P1'].includes(candidate.priority))) {
    lines.push(`### ${item.priority} ${item.name}`);
    lines.push('');
    lines.push(`- Lane: \`${item.lane}\``);
    lines.push(`- Build: \`${item.public_build_dir}\``);
    lines.push(`- Source root: \`${item.source_root}\``);
    lines.push(`- Target: \`${item.target.live_url}\``);
    lines.push(`- 0S Worker staged: ${item.zero_os_worker_stage.staged ? `yes via \`${item.zero_os_worker_stage.by}\`` : 'no'}`);
    lines.push(`- Stale deploy target: ${item.stale_deploy_target ? 'yes' : 'no'}`);
    lines.push(`- Linked receipts: ${item.receipts.length ? item.receipts.map((receipt) => `\`${receipt}\``).join(', ') : 'none yet'}`);
    lines.push(`- Deploy: \`${compactCommand(item.deploy_command)}\``);
    if (item.notes.length) lines.push(`- Notes: ${item.notes.join(' ')}`);
    lines.push('');
  }
  lines.push('## Review/Hold Surfaces');
  lines.push('');
  for (const item of receipt.candidates.filter((candidate) => !['P0', 'P1'].includes(candidate.priority)).slice(0, 80)) {
    lines.push(`- ${item.priority} \`${item.id}\` (${item.lane}) -> \`${item.target.live_url}\`; staged by 0S: ${item.zero_os_worker_stage.staged ? 'yes' : 'no'}`);
  }
  lines.push('');
  lines.push('## Required Closeout Per Surface');
  lines.push('');
  for (const step of receipt.candidates[0]?.required_closeout || []) lines.push(`- ${step}`);
  lines.push('');
  lines.push('Browser verification remains owner-handled per repo policy; this todo is for code/deploy/API/source-custody closure.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const receipt = await buildInventory();
await fs.mkdir(artifactRoot, { recursive: true });
await fs.mkdir(path.dirname(docsPath), { recursive: true });
const stamped = path.join(artifactRoot, `skyenet-client-app-migration-inventory-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
await fs.writeFile(docsPath, renderDoc(receipt));
console.log(JSON.stringify({
  ok: receipt.ok,
  receipt: rel(latestReceipt),
  stamped_receipt: rel(stamped),
  todo: rel(docsPath),
  summary: receipt.summary,
  worker_stage_client_surface_includes: receipt.worker_stage_manifest.client_surface_includes.map((item) => item.include)
}, null, 2));
