import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const SOURCE = path.join(REPO_ROOT, 'metraiyux_0s_site/_platform-sources/valley-verified/dist');
const DEST = path.join(REPO_ROOT, 'metraiyux_0s_site/valley-verified');
const MOUNT_PATH = '/valley-verified';
const SOURCE_ORIGIN = 'https://valley-verified.pages.dev';
const TARGET_ORIGIN = String(process.env.VALLEY_VERIFIED_0S_ORIGIN || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);
const OPERATOR_WORKSPACE_SOURCE = path.join(REPO_ROOT, 'metraiyux_0s_site/_platform-sources/valley-verified/src/operator-workspace.js');
const OPERATOR_WORKSPACE_SCRIPT = '<script type="module" src="/valley-verified/assets/operator-workspace.js"></script>';
const VALLEY_BRAIN_ASSETS = [
  ['assets/valley-brain.js', path.join(SOURCE, 'assets/valley-brain.js')],
  ['assets/valley-brain.css', path.join(SOURCE, 'assets/valley-brain.css')]
];
const OPERATOR_WORKSPACE_ROUTES = [
  'owner-crm',
  'owner-verification',
  'owner-messaging',
  'claim-submissions',
  'claims-ledger',
  'accounts',
  'activation',
  'lifecycle',
  'ae-command',
  'pipeline',
  'ae-work-orders',
  'ae-assignments',
  'outreach',
  'lead-inbox',
  'lead-routing',
  'lead-records',
  'lead-routing-service',
  'admin-review',
  'admin-actions',
  'admin-console',
  'admin-api',
  'admin-batch',
  'action-queue',
  'approval-flow',
  'audit',
  'protected-admin',
  'operator'
];
const PROFILE_FALLBACK_SLUGS = [
  'fade-masters-phx',
  'bobs-smoke-shop-litchfield-park',
  'empire-pallets-phoenix',
  'amazon-phoenix-major-employer-adc4ff0'
];

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function mapLimit(items, limit, fn) {
  let index = 0;
  let changed = 0;
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (await fn(current)) changed += 1;
    }
  });
  await Promise.all(workers);
  return changed;
}

function mountedPath(rel) {
  if (!rel || rel === 'index.html') return `${MOUNT_PATH}/`;
  if (rel.endsWith('/index.html')) return `${MOUNT_PATH}/${rel.slice(0, -'index.html'.length)}`;
  return `${MOUNT_PATH}/${rel}`;
}

function rewriteForMount(source, rel) {
  if (!source.includes(SOURCE_ORIGIN) && !/(["'=]|url\(\s*)\//.test(source)) return source;
  let body = source;
  body = body.replaceAll(`${SOURCE_ORIGIN}/`, `${TARGET_ORIGIN}${MOUNT_PATH}/`);
  body = body.replaceAll(SOURCE_ORIGIN, `${TARGET_ORIGIN}${mountedPath(rel)}`);
  body = body.replace(/(["'=])\/(?!\/|>|valley-verified\/|workspaces\/|client-app-factory\/|northstar\/|api\/northstar)/g, `$1${MOUNT_PATH}/`);
  body = body.replace(/url\(\s*\/(?!\/|valley-verified\/|workspaces\/|client-app-factory\/|northstar\/|api\/northstar)/g, `url(${MOUNT_PATH}/`);
  body = body.replaceAll(`${MOUNT_PATH}//`, `${MOUNT_PATH}/`);
  return body;
}

async function createProfileFallbacks() {
  const profilePage = path.join(DEST, 'business-profile/index.html');
  if (!(await exists(profilePage))) return { created: [], skippedExisting: [] };

  const created = [];
  const skippedExisting = [];
  for (const slug of PROFILE_FALLBACK_SLUGS) {
    const targetDir = path.join(DEST, 'business', slug);
    const targetFile = path.join(targetDir, 'index.html');
    if (await exists(targetFile)) {
      skippedExisting.push(`${MOUNT_PATH}/business/${slug}/`);
      continue;
    }
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(profilePage, targetFile);
    created.push(`${MOUNT_PATH}/business/${slug}/`);
  }
  return { created, skippedExisting };
}

async function rewriteFileIfExists(rel, transform) {
  const file = path.join(DEST, rel);
  const before = await fs.readFile(file, 'utf8').catch(() => null);
  if (before == null) return false;
  const after = transform(before);
  if (after === before) return false;
  await fs.writeFile(file, after);
  return true;
}

async function applyStaticMountPolicy() {
  let changed = 0;
  const gateOffer = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane';

  if (await rewriteFileIfExists('admin-console/index.html', (source) => source
    .replace(
      'This surface calls runtime endpoints through an FS27 gate token. In production, public x-upstream headers are stripped and trusted identity is injected by the gate adapter.',
      `This surface is proof-only on the 0S Valley mount. It reads VALLEY_RUNTIME_DECISION.json and points live execution back to ${gateOffer}.`
    )
    .replace('Runtime admin console wiring for Valley Verified upstream-auth endpoints.', 'Proof-only admin console model for the 0S Valley static mount.')
  )) changed += 1;

  if (await rewriteFileIfExists('admin-api/index.html', (source) => source
    .replace(
      'The admin endpoint orchestrates approvals, rejections, replay, change-set export, outbox processing, and exposure-order intake without adding local auth.',
      'The admin API is model-only on this 0S mount. Live mutation endpoints stay outside the static Valley route and are represented here as contracts and proof data.'
    )
  )) changed += 1;

  if (await rewriteFileIfExists('quote-router/index.html', (source) => source
    .replace(
      'The platform can stage quote_request actions, rank seeded providers, create lead_route_decision records, and keep AE/admin approval between matching and owner delivery.',
      'The platform can model quote_request actions, rank seeded providers, and show route decisions. VALLEY_RUNTIME_DECISION.json records that live lead execution is not mounted on this 0S static route.'
    )
    .replaceAll(`${MOUNT_PATH}/.netlify/functions/phx-lead`, `${MOUNT_PATH}/VALLEY_RUNTIME_DECISION.json`)
    .replaceAll('/.netlify/functions/phx-lead', '/VALLEY_RUNTIME_DECISION.json')
    .replace('Lead function model', 'Runtime decision')
  )) changed += 1;

  return changed;
}

async function applyOperatorWorkspaceMount() {
  const assetSources = [
    OPERATOR_WORKSPACE_SOURCE,
    path.join(SOURCE, 'assets/operator-workspace.js')
  ];
  let copiedAsset = false;
  for (const candidate of assetSources) {
    if (!(await exists(candidate))) continue;
    const target = path.join(DEST, 'assets/operator-workspace.js');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(candidate, target);
    copiedAsset = true;
    break;
  }

  const pagesWired = [];
  for (const route of OPERATOR_WORKSPACE_ROUTES) {
    const changed = await rewriteFileIfExists(`${route}/index.html`, (source) => {
      if (source.includes('operator-workspace.js')) return source;
      if (source.includes('</body>')) return source.replace('</body>', `${OPERATOR_WORKSPACE_SCRIPT}</body>`);
      return `${source}${OPERATOR_WORKSPACE_SCRIPT}`;
    });
    if (changed) pagesWired.push(`${MOUNT_PATH}/${route}/`);
  }

  return { copiedAsset, pagesWired };
}

async function restoreRouteAwareBrainAssets() {
  const copied = [];
  for (const [rel, source] of VALLEY_BRAIN_ASSETS) {
    if (!(await exists(source))) continue;
    const target = path.join(DEST, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    copied.push(`${MOUNT_PATH}/${rel}`);
  }
  return copied;
}

async function main() {
  if (!(await exists(SOURCE))) {
    throw new Error(`Valley Verified dist folder is missing: ${SOURCE}`);
  }
  await fs.rm(DEST, { recursive: true, force: true });
  await fs.mkdir(path.dirname(DEST), { recursive: true });
  await fs.cp(SOURCE, DEST, { recursive: true });

  const files = await walk(DEST);
  const textFiles = files.filter((file) => {
    const ext = path.extname(file);
    return TEXT_EXTENSIONS.has(ext) || path.basename(file) === '_redirects';
  });
  const rewritten = await mapLimit(textFiles, 48, async (file) => {
    const rel = path.relative(DEST, file).replace(/\\/g, '/');
    const before = await fs.readFile(file, 'utf8').catch(() => null);
    if (before == null) return false;
    const after = rewriteForMount(before, rel);
    if (after !== before) {
      await fs.writeFile(file, after);
      return true;
    }
    return false;
  });
  const staticPolicyFiles = await applyStaticMountPolicy();
  const operatorWorkspace = await applyOperatorWorkspaceMount();
  const routeAwareBrainAssets = await restoreRouteAwareBrainAssets();
  const profileFallbacks = await createProfileFallbacks();

  const receipt = {
    mounted_at: new Date().toISOString(),
    source_folder: path.relative(REPO_ROOT, SOURCE),
    target_folder: path.relative(REPO_ROOT, DEST),
    public_route: `${MOUNT_PATH}/`,
    app_build_lane: `${MOUNT_PATH}/app-builds/`,
    bobs_post: `${MOUNT_PATH}/business/bobs-smoke-shop-litchfield-park/`,
    empire_post: `${MOUNT_PATH}/business/empire-pallets-phoenix/`,
    realty_480_post: `${MOUNT_PATH}/business/480-realty-property-management-mesa-85209/`,
    dink_post: `${MOUNT_PATH}/business/dink-and-dine-pickle-park-mesa-85201-5432605/`,
    techbros_post: `${MOUNT_PATH}/business/techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c/`,
    arclight_post: `${MOUNT_PATH}/business/arclight-pictures-tucson/`,
    gate_offer: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane',
    rewritten_text_files: rewritten,
    profile_fallbacks: profileFallbacks.created,
    profile_fallbacks_skipped_existing: profileFallbacks.skippedExisting,
    static_mount_policy_files: staticPolicyFiles,
    operator_workspace_asset: operatorWorkspace.copiedAsset ? `${MOUNT_PATH}/assets/operator-workspace.js` : null,
    operator_workspace_routes: operatorWorkspace.pagesWired,
    valley_brain_assets: {
      script: `${MOUNT_PATH}/assets/valley-brain.js`,
      styles: `${MOUNT_PATH}/assets/valley-brain.css`,
      public_index: `${MOUNT_PATH}/data/brain-public-index.json`,
      admin_index: '/api/valley-verified/admin-brain-index',
      admin_static_asset_policy: `${MOUNT_PATH}/data/brain-admin-index.json is Worker-gated in production`,
      relay_endpoint: '/api/valley-verified/relay-leads',
      route_aware_assets_restored: routeAwareBrainAssets
    },
    url_policy: {
      mount_path: MOUNT_PATH,
      target_origin: TARGET_ORIGIN,
      note: 'Absolute Valley Verified routes are rewritten so the platform works from inside the MetrAIyux 0S static site folder.'
    }
  };
  await fs.writeFile(path.join(DEST, 'MOUNTED_IN_0S.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
