import fs from 'node:fs';
import path from 'node:path';

const PRODUCT_PATH = path.join('Marketing-Made-Easy', 'SkyeWebCreatorMax');

function productRoot(repoRoot = process.cwd()) {
  const direct = path.join(repoRoot, PRODUCT_PATH);
  if (fs.existsSync(direct)) return direct;
  const nested = path.join(repoRoot, 'metraiyux_0s_site', PRODUCT_PATH);
  if (fs.existsSync(nested)) return nested;
  return direct;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function validateWebCreatorSpec(spec = {}) {
  const errors = [];
  if (!String(spec.name || '').trim()) errors.push('name is required');
  if (!String(spec.brief || '').trim()) errors.push('brief is required');
  if (spec.pages && !Array.isArray(spec.pages)) errors.push('pages must be an array');
  if (spec.features && !Array.isArray(spec.features)) errors.push('features must be an array');
  return errors;
}

export function getWebCreatorProductionReadiness(options = {}) {
  const root = productRoot(options.repoRoot);
  const contract = readJson(path.join(root, 'config', 'env.contract.json'), { productionRequired: [] });
  const required = Array.isArray(contract.productionRequired) ? contract.productionRequired : [];
  const missing = required
    .map((entry) => ({ name: String(entry.name || '').trim(), purpose: entry.purpose || '' }))
    .filter((entry) => entry.name && !String(process.env[entry.name] || '').trim());
  const requiredFiles = [
    'index.html',
    'builder.html',
    'js/skygate-client.js',
    'js/webcreator.js',
    'RELEASE_MANIFEST.json'
  ];
  const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  return {
    localReady: missingFiles.length === 0,
    productionReady: missingFiles.length === 0 && missing.length === 0,
    allowedProductionBlockers: missing,
    missingFiles,
    productRoot: root
  };
}
