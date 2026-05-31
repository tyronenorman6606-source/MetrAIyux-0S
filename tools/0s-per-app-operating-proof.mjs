#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const latestMatrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-per-app-operating-proof');
const latestPath = path.join(artifactRoot, '0s-per-app-operating-proof-latest.json');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readText(file, fallback = '') {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function mountedPathToFile(mountedPath = '') {
  const clean = decodeURIComponent(String(mountedPath || '').split('?')[0]).replace(/^\/+/, '');
  if (!clean) return '';
  const absolute = path.join(siteRoot, clean);
  if (existsSync(absolute) && statSync(absolute).isFile()) return absolute;
  if (!path.extname(clean)) {
    const indexFile = path.join(siteRoot, clean, 'index.html');
    if (existsSync(indexFile)) return indexFile;
    const publicIndexFile = path.join(siteRoot, clean, 'public', 'index.html');
    if (existsSync(publicIndexFile)) return publicIndexFile;
  }
  return absolute;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function hasRouteMarker(text = '', app = {}) {
  const lower = text.toLowerCase();
  const hasRenderableDocument = /<html|<!doctype|application\/json|\{/.test(lower);
  const hasDocumentMarker = /<title[^>]*>[^<]+|<h1[^>]*>[^<]+|data-page|data-app|id=["']app["']/i.test(text);
  const nameParts = String(app.name || app.id || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
  const pathParts = String(app.mounted_path || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 3);
  return hasRenderableDocument
    && (hasDocumentMarker || nameParts.some((part) => lower.includes(part)) || pathParts.some((part) => lower.includes(part)));
}

function localBoundaryOk(text = '') {
  return /local|offline|cache|indexeddb|browser|vault|export|download|standalone|owner-handled|owner handled/i.test(text);
}

function readOnlyBoundaryOk(text = '') {
  return !/method=["']post["']|fetch\([^)]*method:\s*["']POST["']/i.test(text)
    || /read-only|static|proof|not applicable|no mutation|owner approval|gate/i.test(text);
}

function familyReceiptOk(app = {}) {
  return app.direct_app_receipt === true || app.family_receipt_ok === true;
}

function proofModelFor(app = {}, sourceText = '') {
  const routeOk = app.route_gate_ok === true && app.route_authenticated_ok === true && app.route_ok === true;
  const markerOk = hasRouteMarker(sourceText, app);
  const profile = app.state_profile || 'remote_stateful';
  const base = {
    route_gate_and_auth: routeOk,
    source_marker_integrity: markerOk,
    source_provenance_receipt: true,
    non_browser_route_stress_basis: routeOk,
    owner_manual_browser_check_required: true
  };
  if (profile === 'read_only_static' || profile === 'proof_asset') {
    return {
      ...base,
      model: profile,
      mutation_denial_or_not_applicable: readOnlyBoundaryOk(sourceText),
      family_receipt_linked: familyReceiptOk(app)
    };
  }
  if (profile === 'local_first_stateful') {
    return {
      ...base,
      model: profile,
      local_export_or_vault_boundary: localBoundaryOk(sourceText),
      family_receipt_linked: familyReceiptOk(app),
      live_mutation_claim_blocked: /local|offline|cache|pending|worker|bridge|receipt|gate/i.test(sourceText)
    };
  }
  return {
    ...base,
    model: profile,
    family_receipt_linked: familyReceiptOk(app),
    proxy_or_runtime_boundary: familyReceiptOk(app) && /api|worker|runtime|gate|receipt|bridge|session|auth|command/i.test(sourceText)
  };
}

function modelOk(model = {}) {
  if (!model.route_gate_and_auth || !model.source_marker_integrity || !model.source_provenance_receipt || !model.non_browser_route_stress_basis) return false;
  if (model.model === 'read_only_static' || model.model === 'proof_asset') return model.mutation_denial_or_not_applicable === true;
  if (model.model === 'local_first_stateful') return model.local_export_or_vault_boundary === true && model.live_mutation_claim_blocked === true;
  return model.family_receipt_linked === true && model.proxy_or_runtime_boundary === true;
}

async function main() {
  const matrix = await readJson(latestMatrixPath);
  if (!matrix?.app_behavior_matrix?.rows) {
    throw new Error(`Run npm run 0s:operating-proof-matrix first; missing ${rel(latestMatrixPath)}`);
  }
  const rows = [];
  for (const app of matrix.app_behavior_matrix.rows) {
    const sourceFile = mountedPathToFile(app.mounted_path);
    const sourceExists = Boolean(sourceFile && existsSync(sourceFile));
    const sourceText = sourceExists ? await readText(sourceFile) : '';
    const model = proofModelFor(app, sourceText);
    rows.push({
      id: app.id,
      name: app.name,
      mounted_path: app.mounted_path,
      state_profile: app.state_profile,
      canonical_family: app.canonical_family,
      coverage_model_before: app.coverage_model,
      source_file: sourceExists ? rel(sourceFile) : rel(sourceFile || siteRoot),
      source_exists: sourceExists,
      source_bytes: Buffer.byteLength(sourceText),
      source_sha256: sourceExists ? sha256(sourceText) : '',
      proof_model: model,
      ok: sourceExists && modelOk(model),
      failures: [
        ...(sourceExists ? [] : ['source_file_missing']),
        ...(model.route_gate_and_auth ? [] : ['route_gate_or_authenticated_render_not_proven']),
        ...(model.source_marker_integrity ? [] : ['source_marker_integrity_missing']),
        ...(model.model === 'read_only_static' || model.model === 'proof_asset'
          ? (model.mutation_denial_or_not_applicable ? [] : ['mutation_denial_or_not_applicable_missing'])
          : []),
        ...(model.model === 'local_first_stateful'
          ? [
            ...(model.local_export_or_vault_boundary ? [] : ['local_export_or_vault_boundary_missing']),
            ...(model.live_mutation_claim_blocked ? [] : ['live_mutation_claim_boundary_missing'])
          ]
          : []),
        ...(!['read_only_static', 'proof_asset', 'local_first_stateful'].includes(model.model)
          ? [
            ...(model.family_receipt_linked ? [] : ['family_runtime_receipt_missing']),
            ...(model.proxy_or_runtime_boundary ? [] : ['proxy_or_runtime_boundary_missing'])
          ]
          : [])
      ]
    });
  }
  const failures = rows.filter((row) => !row.ok);
  const receipt = {
    ok: failures.length === 0,
    schema: 'metraiyux.0s.per-app-operating-proof.receipt.v1',
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    source_matrix: rel(latestMatrixPath),
    checked_apps: rows.length,
    green: rows.filter((row) => row.ok).length,
    yellow: failures.length,
    rows,
    failures: failures.map((row) => ({
      id: row.id,
      mounted_path: row.mounted_path,
      failures: row.failures,
      next_build_step: 'Patch this app route so its live/local/static boundary is explicit, then rerun per-app proof.'
    }))
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    checked_apps: receipt.checked_apps,
    green: receipt.green,
    yellow: receipt.yellow,
    failures: receipt.failures.slice(0, 12)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
