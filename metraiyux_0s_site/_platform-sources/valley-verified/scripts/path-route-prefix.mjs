import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DEFAULT_MOUNT_PATH = '/valley-verified-marketplace';
const MOUNT_PATH = normalizeMountPath(process.env.VALLEY_VERIFIED_MOUNT_PATH || DEFAULT_MOUNT_PATH);
const ZERO_OS_BASE = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.xml', '.txt', '.webmanifest']);

function normalizeMountPath(value) {
  const clean = String(value || '').trim();
  if (!clean || clean === '/') return '';
  return `/${clean.replace(/^\/+|\/+$/g, '')}`;
}

function splitUrl(value) {
  const match = String(value || '').match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  return {
    pathname: match?.[1] || '',
    query: match?.[2] || '',
    hash: match?.[3] || ''
  };
}

function normalizeLegacyPath(pathname) {
  if (pathname === '/valley-verified') return '/';
  if (pathname.startsWith('/valley-verified/')) return `/${pathname.slice('/valley-verified/'.length)}`;
  if (pathname === '/skyenet/valley-verified') return '/';
  if (pathname.startsWith('/skyenet/valley-verified/')) return `/${pathname.slice('/skyenet/valley-verified/'.length)}`;
  return pathname;
}

function shouldPrefixPath(pathname) {
  if (!MOUNT_PATH) return false;
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false;
  if (pathname === MOUNT_PATH || pathname.startsWith(`${MOUNT_PATH}/`)) return false;
  if (/^\/(?:cdn-cgi)(?:\/|$)/.test(pathname)) return false;
  return true;
}

function shouldRouteToZeroOs(pathname) {
  return /^\/(?:live|northstar|admin\/login\.html)(?:\/|$)/.test(pathname);
}

function prefixPath(rawValue) {
  const { pathname, query, hash } = splitUrl(rawValue);
  const normalized = normalizeLegacyPath(pathname);
  if (shouldRouteToZeroOs(normalized)) return `${ZERO_OS_BASE}${normalized}${query}${hash}`;
  if (!shouldPrefixPath(normalized)) return rawValue;
  const pathPart = normalized === '/' ? '/' : normalized;
  return `${MOUNT_PATH}${pathPart}${query}${hash}`.replace(/\/{2,}/g, '/');
}

function rewriteBody(body) {
  let next = body.replace(/\b(href|src|poster|action|content|data-url|data-href|data-share-url)=(")(\/[^"]*)"/g, (_match, attr, quote, value) => {
    return `${attr}=${quote}${prefixPath(value)}"`;
  });

  next = next.replace(/\b(href|src|poster|action|content|data-url|data-href|data-share-url)=(')(\/[^']*)'/g, (_match, attr, quote, value) => {
    return `${attr}=${quote}${prefixPath(value)}'`;
  });

  next = next.replace(/url\((["']?)(\/[^"')]+)\1\)/g, (_match, quote, value) => {
    return `url(${quote}${prefixPath(value)}${quote})`;
  });

  next = next.replace(/\b(fetch)\((["'])(\/[^"']*)\2/g, (_match, fn, quote, value) => {
    return `${fn}(${quote}${prefixPath(value)}${quote}`;
  });

  if (path.extname(currentFile || '') === '.webmanifest') {
    next = next.replace(/"((?:start_url|scope|src)"\s*:\s*")([^"]+)"/g, (_match, prefix, value) => {
      return `"${prefix}${prefixPath(value)}"`;
    });
  }

  return next;
}

let currentFile = '';
let changed = 0;
let scanned = 0;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    currentFile = full;
    scanned += 1;
    const before = await fs.readFile(full, 'utf8');
    const after = rewriteBody(before);
    if (after !== before) {
      await fs.writeFile(full, after);
      changed += 1;
    }
  }
}

await walk(DIST);
console.log(JSON.stringify({ ok: true, mountPath: MOUNT_PATH || '/', scanned, changed }, null, 2));
