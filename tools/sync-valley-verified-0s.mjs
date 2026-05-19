import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const SOURCE = path.join(REPO_ROOT, 'marketing/metraiyux-0s/phxverified_platform_v23_source_only_no_dist/dist');
const DEST = path.join(REPO_ROOT, 'metraiyux_0s_site/valley-verified');
const MOUNT_PATH = '/valley-verified';
const SOURCE_ORIGIN = 'https://valley-verified.pages.dev';
const TARGET_ORIGIN = String(process.env.VALLEY_VERIFIED_0S_ORIGIN || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);

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

function mountedPath(rel) {
  if (!rel || rel === 'index.html') return `${MOUNT_PATH}/`;
  if (rel.endsWith('/index.html')) return `${MOUNT_PATH}/${rel.slice(0, -'index.html'.length)}`;
  return `${MOUNT_PATH}/${rel}`;
}

function rewriteForMount(source, rel) {
  let body = source;
  body = body.replaceAll(`${SOURCE_ORIGIN}/`, `${TARGET_ORIGIN}${MOUNT_PATH}/`);
  body = body.replaceAll(SOURCE_ORIGIN, `${TARGET_ORIGIN}${mountedPath(rel)}`);
  body = body.replace(/(["'(=:\s])\/(?!\/|valley-verified\/|workspaces\/)/g, `$1${MOUNT_PATH}/`);
  body = body.replaceAll(`${MOUNT_PATH}//`, `${MOUNT_PATH}/`);
  return body;
}

async function main() {
  if (!(await exists(SOURCE))) {
    throw new Error(`Valley Verified dist folder is missing: ${SOURCE}`);
  }
  await fs.rm(DEST, { recursive: true, force: true });
  await fs.mkdir(path.dirname(DEST), { recursive: true });
  await fs.cp(SOURCE, DEST, { recursive: true });

  let rewritten = 0;
  const files = await walk(DEST);
  for (const file of files) {
    const ext = path.extname(file);
    if (!TEXT_EXTENSIONS.has(ext) && path.basename(file) !== '_redirects') continue;
    const rel = path.relative(DEST, file).replace(/\\/g, '/');
    const before = await fs.readFile(file, 'utf8').catch(() => null);
    if (before == null) continue;
    const after = rewriteForMount(before, rel);
    if (after !== before) {
      await fs.writeFile(file, after);
      rewritten += 1;
    }
  }

  const receipt = {
    mounted_at: new Date().toISOString(),
    source_folder: path.relative(REPO_ROOT, SOURCE),
    target_folder: path.relative(REPO_ROOT, DEST),
    public_route: `${MOUNT_PATH}/`,
    app_build_lane: `${MOUNT_PATH}/app-builds/`,
    bobs_post: `${MOUNT_PATH}/business/bobs-smoke-shop-litchfield-park/`,
    empire_post: `${MOUNT_PATH}/business/empire-pallets-phoenix/`,
    gate_offer: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane',
    rewritten_text_files: rewritten,
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
