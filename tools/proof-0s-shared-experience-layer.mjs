#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  validateTourRegistry,
  zeroOsTourRegistry
} from '../packages/zero-os-experience/src/tour-registry.js';

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-shared-experience-layer');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, '0s-shared-experience-layer-latest.json');

const requiredDeps = {
  'react-joyride': '^3.1.0',
  zustand: '^5.0.14',
  'react-confetti': '^6.4.0',
  'canvas-confetti': '^1.9.4'
};

const sourceFiles = [
  'packages/zero-os-experience/package.json',
  'packages/zero-os-experience/src/celebration-contract.js',
  'packages/zero-os-experience/src/tour-registry.js',
  'packages/zero-os-experience/src/experience-store.js',
  'packages/zero-os-experience/src/ZeroOsTourProvider.js',
  'packages/zero-os-experience/src/ZeroOsCelebrationLayer.js',
  'packages/zero-os-experience/src/index.js',
  'metraiyux_0s_site/assets/js/0s-celebration-layer.js',
  'metraiyux_0s_site/assets/css/0s-experience-layer.css'
];

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test-artifacts' || entry.name === '.tmp' || entry.name === 'dist' || entry.name === 'cf-assets') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (/\.(?:js|mjs|jsx|ts|tsx|html)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function includesAll(text, needles = []) {
  return needles.every((needle) => text.includes(needle));
}

async function main() {
  const failures = [];
  const packageJson = await readJson('package.json');
  const lockJson = await readJson('package-lock.json');
  const packageDeps = packageJson.dependencies || {};
  const lockDeps = lockJson.packages || {};

  for (const [name, expected] of Object.entries(requiredDeps)) {
    if (packageDeps[name] !== expected) failures.push(`package.json dependency ${name} expected ${expected}, found ${packageDeps[name] || 'missing'}`);
    if (!lockDeps[`node_modules/${name}`]) failures.push(`package-lock missing node_modules/${name}`);
  }

  const registryValidation = validateTourRegistry(zeroOsTourRegistry);
  failures.push(...registryValidation.failures.map((failure) => `tour registry: ${failure}`));

  const registryEvidence = [];
  for (const entry of zeroOsTourRegistry) {
    const sourceFile = path.join(repoRoot, entry.source_path);
    if (!existsSync(sourceFile) || !statSync(sourceFile).isFile()) {
      failures.push(`tour registry source missing for ${entry.app_id}: ${entry.source_path}`);
      continue;
    }
    const source = await fs.readFile(sourceFile, 'utf8');
    const markers = Array.isArray(entry.react_surface_markers) ? entry.react_surface_markers : [];
    const markerHit = markers.some((marker) => source.includes(marker));
    if (!markerHit) failures.push(`tour registry source ${entry.source_path} does not contain any declared React marker for ${entry.app_id}`);
    registryEvidence.push({
      app_id: entry.app_id,
      route: entry.route,
      role: entry.role,
      source_path: entry.source_path,
      marker_hit: markerHit,
      steps: entry.steps.length,
      step_fields_complete: entry.steps.every((step) => step.id && step.target && step.placement && step.copy && Array.isArray(step.prerequisites) && step.completion_receipt_event)
    });
  }

  const files = {};
  for (const relativePath of sourceFiles) {
    const text = await readText(relativePath).catch(() => '');
    if (!text) failures.push(`source file missing or empty: ${relativePath}`);
    files[relativePath] = { bytes: Buffer.byteLength(text), sha256: sha256(text), text };
  }

  const tourProvider = files['packages/zero-os-experience/src/ZeroOsTourProvider.js'].text || '';
  if (!includesAll(tourProvider, ['react-joyride', 'callback', 'stepIndex', 'showSkipButton', 'ZERO_OS_TOUR_RECEIPT_EVENT'])) {
    failures.push('ZeroOsTourProvider does not prove controlled react-joyride flow, skip/finish controls, and receipt event wiring.');
  }

  const reactCelebration = files['packages/zero-os-experience/src/ZeroOsCelebrationLayer.js'].text || '';
  if (!includesAll(reactCelebration, ['react-confetti', 'ZERO_OS_CELEBRATION_EVENT', 'prefersReducedMotion', 'celebrationIsReceiptBacked', 'sessionStorage', 'videoModalKey'])) {
    failures.push('ZeroOsCelebrationLayer does not prove shared React confetti, reduced motion, receipt gating, dedupe, and video modal support.');
  }

  const store = files['packages/zero-os-experience/src/experience-store.js'].text || '';
  if (!includesAll(store, ["from 'zustand'", 'scope', 'ui-only', 'forbiddenTruthSources'])) {
    failures.push('experience-store does not prove zustand is scoped to UI-only state with forbidden server-truth boundaries.');
  }

  const staticLayer = files['metraiyux_0s_site/assets/js/0s-celebration-layer.js'].text || '';
  if (!includesAll(staticLayer, ['canvas-confetti@1.9.4', 'disableForReducedMotion', "prefers-reduced-motion: reduce", 'sessionStorage', 'receiptId', 'videoModalKey', 'not_receipt_backed'])) {
    failures.push('static celebration layer does not prove centralized canvas-confetti, reduced motion, dedupe, receipt gating, and optional video modal support.');
  }

  const css = files['metraiyux_0s_site/assets/css/0s-experience-layer.css'].text || '';
  if (!includesAll(css, ['.zero-os-celebration-log', '.zero-os-thank-you-modal', 'prefers-reduced-motion'])) {
    failures.push('experience CSS does not cover celebration log, thank-you modal, and reduced-motion media query.');
  }

  const scannedRoots = [
    path.join(repoRoot, 'metraiyux_0s_site'),
    path.join(repoRoot, 'packages'),
    path.join(repoRoot, 'client-app-factory'),
    path.join(repoRoot, 'MCP', 'skye-design-lab')
  ];
  const approved = new Set([
    'packages/zero-os-experience/src/ZeroOsTourProvider.js',
    'packages/zero-os-experience/src/ZeroOsCelebrationLayer.js',
    'packages/zero-os-experience/src/experience-store.js',
    'metraiyux_0s_site/assets/js/0s-celebration-layer.js'
  ]);
  const directUseFindings = [];
  for (const root of scannedRoots) {
    for (const file of await walk(root)) {
      const relative = rel(file);
      if (approved.has(relative)) continue;
      const text = await fs.readFile(file, 'utf8').catch(() => '');
      if (/(?:from\s+['"]react-joyride['"]|from\s+['"]react-confetti['"]|from\s+['"]zustand['"]|canvas-confetti@|from\s+['"]canvas-confetti['"])/.test(text)) {
        directUseFindings.push(relative);
      }
    }
  }
  if (directUseFindings.length) {
    failures.push(`direct package usage outside shared layer: ${directUseFindings.slice(0, 20).join(', ')}`);
  }

  const receipt = {
    ok: failures.length === 0,
    schema: 'metraiyux.0s.shared-experience-layer-proof.v1',
    generated_at: new Date().toISOString(),
    summary: {
      package_dependencies: Object.keys(requiredDeps).length,
      registry_entries: registryValidation.count,
      registry_steps: registryValidation.step_count,
      registry_sources_checked: registryEvidence.length,
      direct_use_findings: directUseFindings.length
    },
    requirements: {
      react_joyride_shared_registry: failures.every((failure) => !/tour registry|ZeroOsTourProvider|react-joyride/.test(failure)),
      registry_fields_complete: registryValidation.ok,
      react_confetti_shared_layer: failures.every((failure) => !/ZeroOsCelebrationLayer|react-confetti/.test(failure)),
      canvas_confetti_static_layer: failures.every((failure) => !/static celebration layer|canvas-confetti/.test(failure)),
      reduced_motion_and_dedupe: failures.every((failure) => !/reduced motion|dedupe|sessionStorage/.test(failure)),
      receipt_aware_event_contract: failures.every((failure) => !/receipt/.test(failure)),
      zustand_ui_only_boundary: failures.every((failure) => !/zustand|experience-store/.test(failure)),
      no_scattered_direct_imports: directUseFindings.length === 0
    },
    registry: registryEvidence,
    files: Object.fromEntries(Object.entries(files).map(([relativePath, evidence]) => [relativePath, {
      bytes: evidence.bytes,
      sha256: evidence.sha256
    }])),
    direct_use_findings: directUseFindings,
    failures
  };

  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    summary: receipt.summary,
    failures: receipt.failures.slice(0, 10)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
