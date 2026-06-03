import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const MIN_WORKER_LOADER_WRANGLER_VERSION = '4.95.0';
export const MIN_WRANGLER_NODE_MAJOR = 22;

export function configPathFromWranglerArgs(args = [], cwd = process.cwd()) {
  const configIndex = args.findIndex((arg) => arg === '--config' || arg === '-c');
  const configPath = configIndex >= 0 ? args[configIndex + 1] : 'wrangler.toml';
  return configPath ? path.resolve(cwd, configPath) : '';
}

export function wranglerConfigUsesWorkerLoaders(configFile) {
  if (!configFile || !fs.existsSync(configFile)) return false;
  return /^\s*\[\[worker_loaders\]\]/m.test(fs.readFileSync(configFile, 'utf8'));
}

function parseVersionTuple(version) {
  const text = String(version || '').trim();
  if (/^(latest|next|beta)$/i.test(text)) return [Number.POSITIVE_INFINITY, 0, 0];
  const match = text.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [
    Number(match[1] || 0),
    Number(match[2] || 0),
    Number(match[3] || 0)
  ];
}

function candidateNodeBins(env = process.env) {
  const candidates = [];
  const add = (value) => {
    if (!value) return;
    const dir = path.basename(value) === 'node' ? path.dirname(value) : value;
    if (nodeMajorForBinDir(dir) < MIN_WRANGLER_NODE_MAJOR) return;
    if (!candidates.includes(dir)) candidates.push(dir);
  };

  add(env.WRANGLER_NODE_BIN);
  add(env.NVM_BIN);
  if (Number(String(process.version || '').match(/^v?(\d+)/)?.[1] || 0) >= MIN_WRANGLER_NODE_MAJOR) {
    add(path.dirname(process.execPath));
  }

  const home = env.HOME || process.env.HOME || '';
  const nvmRoot = env.NVM_DIR || (home ? path.join(home, '.nvm') : '');
  const versionsRoot = nvmRoot ? path.join(nvmRoot, 'versions', 'node') : '';
  if (versionsRoot && fs.existsSync(versionsRoot)) {
    const versionDirs = fs.readdirSync(versionsRoot)
      .map((name) => ({ name, tuple: parseVersionTuple(name.replace(/^v/, '')) }))
      .filter((item) => item.tuple && item.tuple[0] >= MIN_WRANGLER_NODE_MAJOR)
      .sort((left, right) => compareVersions(right.name.replace(/^v/, ''), left.name.replace(/^v/, '')));
    for (const item of versionDirs) add(path.join(versionsRoot, item.name, 'bin'));
  }

  return candidates;
}

function nodeMajorForBinDir(dir) {
  const nodePath = path.join(dir, 'node');
  if (!fs.existsSync(nodePath)) return 0;
  const result = spawnSync(nodePath, ['-v'], {
    encoding: 'utf8',
    timeout: 1500,
    stdio: ['ignore', 'pipe', 'ignore']
  });
  const version = `${result.stdout || ''}`.trim();
  return Number(version.match(/^v?(\d+)/)?.[1] || 0);
}

export function findModernNodeBinForWrangler(env = process.env) {
  for (const dir of candidateNodeBins(env)) {
    const nodePath = path.join(dir, 'node');
    if (fs.existsSync(nodePath)) return dir;
  }
  return '';
}

export function envWithModernNodeForWrangler(env = process.env) {
  const nodeBin = findModernNodeBinForWrangler(env);
  if (!nodeBin) return { ...env };
  const currentPath = env.PATH || '';
  const pathParts = currentPath.split(path.delimiter).filter(Boolean);
  const nextPath = pathParts.includes(nodeBin)
    ? currentPath
    : [nodeBin, ...pathParts].join(path.delimiter);
  return { ...env, PATH: nextPath };
}

function compareVersions(left, right) {
  const a = parseVersionTuple(left);
  const b = parseVersionTuple(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

export function wranglerVersionSupportsWorkerLoaders(version) {
  const comparison = compareVersions(version, MIN_WORKER_LOADER_WRANGLER_VERSION);
  return comparison !== null && comparison >= 0;
}

export function assertWranglerVersionSupportsConfig({
  configFile,
  wranglerVersion,
  commandLabel = 'wrangler deploy'
}) {
  if (!wranglerConfigUsesWorkerLoaders(configFile)) {
    return { ok: true, usesWorkerLoaders: false };
  }

  if (wranglerVersionSupportsWorkerLoaders(wranglerVersion)) {
    return { ok: true, usesWorkerLoaders: true };
  }

  const rel = path.relative(process.cwd(), configFile).split(path.sep).join('/') || configFile;
  throw new Error([
    `${commandLabel} refused: ${rel} contains [[worker_loaders]], but WRANGLER_VERSION=${wranglerVersion || '<empty>'}.`,
    `Use wrangler@${MIN_WORKER_LOADER_WRANGLER_VERSION} or newer so SKYENET_FUNCTION_LOADER is deployed.`
  ].join(' '));
}
