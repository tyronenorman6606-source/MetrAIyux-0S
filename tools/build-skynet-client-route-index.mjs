#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const clientAppRoots = [
  path.join(siteRoot, 'client-app-factory', 'client-apps'),
  path.join(repoRoot, 'client-app-factory', 'client-apps')
];
const outPath = path.join(siteRoot, 'data', 'skyenet-client-route-index.json');

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function cleanPathPrefix(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return text.startsWith('/') ? text.replace(/\/+$/, '') || '/' : '';
  }
}

function standaloneTarget(target = {}) {
  target = target || {};
  const publicUrl = String(target.publicUrl || '').trim();
  const host = String(target.host || '').trim();
  const deploymentId = String(target.deploymentId || '').trim();
  return Boolean(publicUrl && host && deploymentId && /skyenet\./i.test(host) && /skyenet\./i.test(publicUrl));
}

function routeKeyForTarget(target = {}) {
  const host = String(target.host || '').trim().toLowerCase();
  const mountPath = cleanPathPrefix(target.mountPath || '/');
  return mountPath && mountPath !== '/'
    ? `route:v1:host:${host}:path:${mountPath}`
    : `route:v1:host:${host}`;
}

async function collectDeployTargets() {
  const entries = new Map();
  for (const root of clientAppRoots) {
    if (!existsSync(root)) continue;
    const children = await fs.readdir(root, { withFileTypes: true });
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const slug = child.name;
      const targetFile = path.join(root, slug, 'deploy-target.json');
      const target = await readJson(targetFile);
      if (!standaloneTarget(target)) continue;
      const legacyPrefixes = new Set([
        `/client-app-factory/client-apps/${slug}`,
        ...(Array.isArray(target.legacyRoutes) ? target.legacyRoutes.map(cleanPathPrefix) : [])
      ].filter(Boolean));
      entries.set(slug, {
        client_id: slug,
        workspace_id: target.workspaceId || slug,
        project_id: target.projectId || slug,
        deployment_id: target.deploymentId,
        public_url: target.publicUrl,
        host: target.host,
        mount_path: cleanPathPrefix(target.mountPath || '/'),
        url_mode: target.urlMode || 'path',
        route_key: routeKeyForTarget(target),
        source_download_api: target.sourceCustody?.sourceDownloadApi || '',
        source_auth: 'Shared FS27/SkyGate/Free99 bearer session required',
        legacy_path_prefixes: [...legacyPrefixes].sort(),
        legacy_route_policy: 'redirect-to-standalone-skynet',
        updated_at: target.updatedAt || new Date().toISOString(),
        source_record: rel(targetFile)
      });
    }
  }
  return [...entries.values()].sort((a, b) => a.client_id.localeCompare(b.client_id));
}

const generatedAt = new Date().toISOString();
const routes = await collectDeployTargets();
const payload = {
  schema: 'skyenet.client-route-index.v1',
  generated_at: generatedAt,
  rule: '0S keeps client account/control records; standalone SkyeNet serves public client apps.',
  route_count: routes.length,
  routes
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  route_count: routes.length,
  output: rel(outPath),
  routes: routes.map((route) => ({ client_id: route.client_id, public_url: route.public_url }))
}, null, 2));
