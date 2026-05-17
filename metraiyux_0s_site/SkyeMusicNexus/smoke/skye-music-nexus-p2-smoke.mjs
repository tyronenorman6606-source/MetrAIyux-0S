import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const routePages = ["index.html","dashboard.html","workflows.html","records.html","runtime.html","proof.html","settings.html"];
const required = [
  'PLATFORM_TRUTH.json',
  'assets/platform-mark.svg',
  'docs/PLATFORM_STATUS.md',
  'src/runtime-contract.json',
];
const failures = [];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['.git', 'node_modules', '.next'].includes(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

for (const page of routePages) {
  const html = await fs.readFile(path.join(root, page), 'utf8').catch(() => '');
  if (!html.includes("data-platform-hardening=\"p2-routed\"")) failures.push(page + ' missing routed marker');
  if (!html.includes("./gate-session.js")) failures.push(page + ' missing gate session overlay');
}

for (const file of required) {
  if (!(await exists(path.join(root, file)))) failures.push(file + ' missing');
}

for (const [, href] of [["Public App","./public/index.html"],["Admin Console","./public/admin.html"],["Smoke Proof","./smoke/smoke-proof.mjs"]]) {
  if (href.endsWith('.mjs')) continue;
  const target = href.replace(/^\.\//, '');
  if (!(await exists(path.join(root, target)))) failures.push(target + ' launch target missing');
}

const htmlPages = (await walk(root)).filter((file) => file.endsWith('.html'));
if (htmlPages.length < 7) failures.push('expected at least 7 html routes, found ' + htmlPages.length);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('SkyeMusicNexus P2 promotion smoke passed: ' + htmlPages.length + ' routes checked.');
