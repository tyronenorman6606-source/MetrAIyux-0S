#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repoRoot, 'metraiyux_0s_site/Free99/apps/sovereigndocs');
const docxRoot = path.join(sourceRoot, 'skye-docx-max');
const assetsRoot = path.join(sourceRoot, 'assets');
const deployRoot = path.join(repoRoot, 'test-artifacts/sovereigndocs-docxmax-lane/deploy');
const receiptPath = path.join(repoRoot, 'test-artifacts/sovereigndocs-docxmax-lane/build-manifest.json');
const mountRoot = 'Free99/apps/sovereigndocs';
const canonical0sUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/sovereigndocs/skye-docx-max/app/index.html';

const copied = [];

function normalized(filePath) {
  return filePath.split(path.sep).join('/');
}

function copyFile(sourceFile, relativeDestination) {
  const destination = path.join(deployRoot, relativeDestination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(sourceFile, destination);
  const stat = fs.statSync(destination);
  copied.push({ path: normalized(relativeDestination), bytes: stat.size });
}

function copyTree(sourceDirectory, relativeDestinationRoot) {
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const absolute = path.join(sourceDirectory, entry.name);
    const destination = path.join(relativeDestinationRoot, entry.name);
    if (entry.isDirectory()) {
      copyTree(absolute, destination);
    } else if (entry.isFile()) {
      copyFile(absolute, destination);
    }
  }
}

function writeGenerated(relativeDestination, content) {
  const destination = path.join(deployRoot, relativeDestination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  const stat = fs.statSync(destination);
  copied.push({ path: normalized(relativeDestination), bytes: stat.size, generated: true });
}

const pagesWorker = String.raw`const MAIN_0S_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const CANONICAL_DOCX_PATH = '/Free99/apps/sovereigndocs/skye-docx-max/app/index.html';

function noStore(headers = {}) {
  return {
    ...headers,
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    'x-sovereigndocs-docxmax-origin': 'gate-owned'
  };
}

function wantsHtml(request) {
  const accept = String(request.headers.get('accept') || '').toLowerCase();
  const dest = String(request.headers.get('sec-fetch-dest') || '').toLowerCase();
  return dest === 'document' || !accept || accept.includes('text/html') || accept.includes('*/*');
}

function mappedReturnPath(url) {
  if (url.pathname === '/' || url.pathname === '/index.html') return CANONICAL_DOCX_PATH;
  return url.pathname + (url.search || '');
}

function redirectToGate(request) {
  const url = new URL(request.url);
  const target = new URL('/admin/login.html', MAIN_0S_ORIGIN);
  target.searchParams.set('return', mappedReturnPath(url));
  return new Response(null, {
    status: 302,
    headers: noStore({
      location: target.toString(),
      'x-0s-gate': 'fs27-required',
      'x-origin-direct-access': 'redirected-to-main-0s-gate'
    })
  });
}

function hasProxySecret(request, env) {
  const expected = String(env.SOVEREIGNDOCS_ORIGIN_PROXY_SECRET || '').trim();
  const presented = String(request.headers.get('x-0s-origin-secret') || '').trim();
  return Boolean(expected && presented && expected === presented);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        app: 'sovereigndocs-docxmax-lane',
        gateOwned: true,
        directAccess: 'redirect-to-main-0s-gate',
        canonical0sPath: CANONICAL_DOCX_PATH
      }, { headers: noStore() });
    }

    if (hasProxySecret(request, env)) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('x-sovereigndocs-docxmax-origin', 'proxied-by-main-0s');
      headers.set('x-0s-auth-owner', 'metraiyux-0s-full-system');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (wantsHtml(request)) return redirectToGate(request);
    }

    return Response.json({
      ok: false,
      error: 'shared_0s_gate_required',
      message: 'Open this app through the MetrAIyux 0S gate-owned route.',
      canonical: MAIN_0S_ORIGIN + CANONICAL_DOCX_PATH
    }, { status: 401, headers: noStore({ 'x-0s-gate': 'fs27-required' }) });
  }
};
`;

fs.rmSync(deployRoot, { recursive: true, force: true });

copyTree(docxRoot, path.join(mountRoot, 'skye-docx-max'));
copyTree(assetsRoot, path.join(mountRoot, 'assets'));
writeGenerated(
  'index.html',
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0; url=${canonical0sUrl}"><title>SovereignDocs SkyeDocxMax lane</title><a href="${canonical0sUrl}">Open through the 0S gate</a>\n`
);
writeGenerated('_worker.js', `${pagesWorker}\n`);

const manifest = {
  generated_at: new Date().toISOString(),
  purpose: 'lean gated SovereignDocs SkyeDocxMax Pages origin',
  source: {
    docx: path.relative(repoRoot, docxRoot),
    assets: path.relative(repoRoot, assetsRoot)
  },
  deploy: path.relative(repoRoot, deployRoot),
  canonical_0s_url: canonical0sUrl,
  files: copied.length,
  bytes: copied.reduce((sum, file) => sum + file.bytes, 0),
  cloudflare_pages_cap: 20000,
  under_pages_file_cap: copied.length < 20000,
  generated_files: copied.filter(file => file.generated).map(file => file.path),
  sample: copied.slice(0, 80).map(file => file.path)
};

writeGenerated('deploy-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
manifest.files = copied.length;
manifest.bytes = copied.reduce((sum, file) => sum + file.bytes, 0);

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  files: manifest.files,
  bytes: manifest.bytes,
  deploy: path.relative(repoRoot, deployRoot),
  receipt: path.relative(repoRoot, receiptPath),
  under_pages_file_cap: manifest.under_pages_file_cap
}, null, 2));
