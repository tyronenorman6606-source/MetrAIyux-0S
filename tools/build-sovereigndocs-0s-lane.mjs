import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repoRoot, 'metraiyux_0s_site/Free99/apps/sovereigndocs');
const deployRoot = path.join(repoRoot, 'test-artifacts/sovereigndocs-0s-lane/deploy');
const receiptPath = path.join(repoRoot, 'test-artifacts/sovereigndocs-0s-lane/build-manifest.json');

const blockedSegments = new Set([
  '.devcontainer',
  '.git',
  '.wrangler',
  'build',
  'database',
  'docs',
  'node_modules',
  'scripts',
  'seed-tools',
  'server',
  'smoke',
  'templates'
]);

const copied = [];

function normalized(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function hasBlockedSegment(relativePath) {
  return normalized(relativePath).split('/').some((segment) => blockedSegments.has(segment));
}

function allowed(relativePath) {
  const norm = normalized(relativePath);
  const basename = path.basename(norm);
  const ext = path.extname(norm).toLowerCase();
  if (hasBlockedSegment(relativePath)) return false;
  if (/\.(env|pem|key|p12|zip|sqlite|db)$/i.test(norm)) return false;

  if ([
    '_headers',
    'homepage.html',
    'index.html',
    'manifest.json',
    'manifest.webmanifest',
    'offline.html',
    'robots.txt',
    'service-worker.js',
    'sitemap.xml',
    'sw.js'
  ].includes(basename)) return true;

  if (norm.startsWith('assets/')) return ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.json', '.mp4'].includes(ext);
  if (norm.startsWith('data/')) return ext === '.json';
  if (norm.startsWith('ai-assist/')) return ext === '.json';
  if (norm.startsWith('official-source-library/')) return ext === '.json';
  if (norm.startsWith('official-ingestion/')) return ext === '.json';
  if (norm.startsWith('review-workflow/')) return ext === '.json';
  if (norm.startsWith('template-bundles/')) return ext === '.json';
  if (norm.startsWith('template-library/')) return ext === '.json' || ext === '.ndjson';
  if (norm.startsWith('openapi/')) return ext === '.json';
  if (norm.startsWith('audit/')) return ext === '.json';

  if (norm.startsWith('skye-docx-max/app/assets/')) return ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.ico'].includes(ext);
  if (norm.startsWith('skye-docx-max/app/js/')) return ext === '.js';
  if (norm.startsWith('skye-docx-max/app/_shared/')) return ext === '.js';
  if (norm === 'skye-docx-max/app/sd-bridge.js') return true;

  return false;
}

function copyFile(sourceFile, destinationRoot, relativePath) {
  const destination = path.join(destinationRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(sourceFile, destination);
  copied.push(normalized(relativePath));
}

function consider(sourceFile) {
  const relativePath = path.relative(sourceRoot, sourceFile);
  if (!allowed(relativePath)) return;
  copyFile(sourceFile, path.join(deployRoot, 'Free99/apps/sovereigndocs'), relativePath);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relativePath = path.relative(sourceRoot, absolute);
    if (entry.isDirectory()) {
      if (!hasBlockedSegment(relativePath)) walk(absolute);
    } else if (entry.isFile()) {
      consider(absolute);
    }
  }
}

function copyShared0sAsset(source, destinationRoot, relativePath) {
  copyFile(path.join(repoRoot, source), path.join(deployRoot, destinationRoot), relativePath);
}

fs.rmSync(deployRoot, { recursive: true, force: true });
walk(sourceRoot);

copyShared0sAsset('metraiyux_0s_site/Free99/free99-gate.js', 'Free99', 'free99-gate.js');
copyShared0sAsset('metraiyux_0s_site/assets/js/0s-runtime-truth.js', 'assets/js', '0s-runtime-truth.js');
copyShared0sAsset('metraiyux_0s_site/assets/css/0s-runtime-truth.css', 'assets/css', '0s-runtime-truth.css');
copyShared0sAsset('metraiyux_0s_site/assets/js/0s-gate-card-bridge.js', 'assets/js', '0s-gate-card-bridge.js');
copyShared0sAsset('metraiyux_0s_site/audits/0S_SURFACE_STATUS.json', 'audits', '0S_SURFACE_STATUS.json');

fs.writeFileSync(
  path.join(deployRoot, 'index.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/Free99/apps/sovereigndocs/"><title>SovereignDocs lane</title><a href="/Free99/apps/sovereigndocs/">Open SovereignDocs</a>\n'
);
copied.push('index.html');

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: path.relative(repoRoot, sourceRoot),
  deploy: path.relative(repoRoot, deployRoot),
  copied_files: copied.length,
  excluded: [...blockedSegments].sort(),
  sample: copied.slice(0, 80)
}, null, 2));

console.log(JSON.stringify({
  ok: true,
  files: copied.length,
  deploy: path.relative(repoRoot, deployRoot),
  receipt: path.relative(repoRoot, receiptPath)
}, null, 2));
