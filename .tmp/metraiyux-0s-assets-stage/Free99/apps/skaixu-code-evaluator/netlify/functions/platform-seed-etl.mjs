import path from 'node:path';
import { materializeSeeds, safeResolveInside } from '../../src/platform/seed-etl-worker.mjs';

const PROJECT_ROOT = path.resolve(process.env.SKAI_PROJECT_ROOT || process.cwd());
const ALLOWED_MANIFESTS = new Set(['platform-seed/manifest.json']);
const ALLOWED_OUT_DIRS = new Set(['generated/platform-data', '.skaixu/generated/platform-data']);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': process.env.SKAI_CORS_ORIGIN || '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-skai-upstream-identity,x-skai-tenant-id,x-skai-user-id,x-skai-roles',
    },
    body: JSON.stringify(body),
  };
}

function safeBody(event) {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, { ok: true });
  if (!['POST', 'GET'].includes(event.httpMethod)) return json(405, { ok: false, error: 'method_not_allowed' });
  try {
    const body = safeBody(event);
    const manifestPath = String(body.manifestPath || 'platform-seed/manifest.json');
    const outDir = String(body.outDir || 'generated/platform-data');
    if (!ALLOWED_MANIFESTS.has(manifestPath)) throw new Error(`manifestPath rejected: ${manifestPath}`);
    if (!ALLOWED_OUT_DIRS.has(outDir)) throw new Error(`outDir rejected: ${outDir}`);
    safeResolveInside(PROJECT_ROOT, manifestPath, { allowedPrefixes: ['platform-seed'], label: 'manifestPath' });
    safeResolveInside(PROJECT_ROOT, outDir, { allowedPrefixes: ['generated/platform-data', '.skaixu/generated/platform-data'], label: 'outDir' });
    const result = await materializeSeeds({
      rootDir: PROJECT_ROOT,
      manifestPath,
      outDir,
      chunkSize: Number(body.chunkSize || 500),
      maxFiles: Number(body.maxFiles || 5000),
      maxFileBytes: Number(body.maxFileBytes || 2_000_000),
    });
    return json(200, { ok: true, entries: result.entries, records: result.records, businesses: result.businessDirectory.length, issues: result.validation.issues.length, chunks: result.chunks.length, outDir: result.outDir, provenance: result.provenance });
  } catch (error) {
    return json(400, { ok: false, error: error.message, code: 'seed_etl_error' });
  }
}
