import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');

const rootAssetFiles = new Set([
  'robots.txt',
  'sitemap.xml',
  'skyepay-api.json'
]);

const blockedSegments = new Set([
  '.wrangler',
  'cloudflare',
  'docs',
  'Gate-Upgrades',
  'netlify',
  'node_modules',
  'runtime',
  'scripts',
  'smoke',
  'sql',
  'src',
  'tests'
]);

const blockedFilenames = new Set([
  '.assetsignore',
  '.gitignore',
  '.netlifyignore',
  '.node-version',
  '.nvmrc',
  '_redirects',
  'deno.lock',
  'netlify.toml',
  'package-lock.json',
  'package.json',
  'readme.md',
  'README.md',
  'tsconfig.json',
  'wrangler.jsonc',
  'wrangler.toml'
]);

function shouldSkip(relativePath) {
  const segments = relativePath.split(path.sep).filter(Boolean);
  if (segments.some((segment) => blockedSegments.has(segment))) return true;
  const filename = segments.at(-1) || '';
  if (blockedFilenames.has(filename)) return true;
  if (filename.toLowerCase().startsWith('readme')) return true;
  return false;
}

async function exists(filepath) {
  try {
    await stat(filepath);
    return true;
  } catch {
    return false;
  }
}

async function copyFileRelative(relativePath) {
  const source = path.join(root, relativePath);
  if (!(await exists(source))) return;
  const target = path.join(publicRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

async function copyDirectoryFiltered(sourceRelativePath, targetRelativePath = sourceRelativePath) {
  const sourceRoot = path.join(root, sourceRelativePath);
  if (!(await exists(sourceRoot))) return;

  async function walk(currentSource, currentRelative = '') {
    for (const entry of await readdir(currentSource, { withFileTypes: true })) {
      const sourceEntry = path.join(currentSource, entry.name);
      const sourceRelative = path.join(sourceRelativePath, currentRelative, entry.name);
      if (shouldSkip(sourceRelative)) continue;

      const targetEntry = path.join(publicRoot, targetRelativePath, currentRelative, entry.name);
      if (entry.isDirectory()) {
        await mkdir(targetEntry, { recursive: true });
        await walk(sourceEntry, path.join(currentRelative, entry.name));
        continue;
      }
      if (entry.isFile()) {
        await mkdir(path.dirname(targetEntry), { recursive: true });
        await cp(sourceEntry, targetEntry);
      }
    }
  }

  await walk(sourceRoot);
}

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (entry.name.endsWith('.html') || rootAssetFiles.has(entry.name)) {
    await copyFileRelative(entry.name);
  }
}

await copyDirectoryFiltered('assets');
await copyDirectoryFiltered('admin');
await copyDirectoryFiltered(path.join('apps', 'skyeroutex'));
await copyDirectoryFiltered('openapi');
await copyDirectoryFiltered('pricing');

console.log(`Synced Cloudflare asset root: ${path.relative(root, publicRoot)}`);
