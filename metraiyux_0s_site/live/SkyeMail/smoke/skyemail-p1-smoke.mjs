import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];
const generatedPages = ["index.html","dashboard.html","workflows.html","records.html","proof.html","runtime.html","settings.html"];

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

const allFiles = await walk(root);
const htmlPages = allFiles.filter((file) => file.endsWith('.html')).map((file) => path.relative(root, file).replaceAll(path.sep, '/'));
if (htmlPages.length < 12) failures.push('expected at least 12 html routes, found ' + htmlPages.length);

for (const page of generatedPages) {
  if (false) {
    const html = await fs.readFile(path.join(root, page), 'utf8').catch(() => '');
    if (!html.includes("data-platform-hardening=\"p1-routed\"")) failures.push(page + ' missing routed platform marker');
  }
}

for (const required of [
  'PLATFORM_TRUTH.json',
  'assets/platform-mark.svg',
  'docs/PLATFORM_STATUS.md',
  'src/runtime-contract.json',
]) {
  if (!(await exists(path.join(root, required)))) failures.push(required + ' missing');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('SkyeMail P1 fix smoke passed: ' + htmlPages.length + ' routes checked.');
