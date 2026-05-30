import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];
const removedPages = ["app.html","dashboard.html","workflows.html","records.html","proof.html","runtime.html","settings.html","platform.js","platform.css"];

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
if (!htmlPages.includes('index.html')) failures.push('index.html missing');

const indexHtml = await fs.readFile(path.join(root, 'index.html'), 'utf8').catch(() => '');
if (!indexHtml.includes('data-platform-hardening="single-canonical-real-platform"')) failures.push('index.html missing single canonical platform marker');
if (!indexHtml.includes('platformCommand')) failures.push('index.html missing real platform command strip');
if (!indexHtml.includes('runtimeLaneStatus')) failures.push('index.html missing runtime lane status');
if (!indexHtml.includes('intakeForm')) failures.push('index.html missing intake form');
if (indexHtml.includes('Open Imported App') || indexHtml.includes('href="./app.html"')) failures.push('index.html still links to removed imported app');

for (const page of removedPages) {
  if (await exists(path.join(root, page))) failures.push(page + ' should not exist on the canonical platform');
}

for (const required of [
  'PLATFORM_TRUTH.json',
  'docs/PLATFORM_STATUS.md',
  'src/runtime-contract.json',
]) {
  if (!(await exists(path.join(root, required)))) failures.push(required + ' missing');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('AE-FlowPro single-platform smoke passed: canonical index checked and duplicate entrypoints absent.');
