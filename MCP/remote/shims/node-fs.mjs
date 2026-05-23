import { FILE_MAP } from '../generated-file-map.mjs';
import path from './node-path.mjs';

const memoryFiles = new Map(Object.entries(FILE_MAP));

function normalize(filePath) {
  return path.resolve(String(filePath || '.'));
}

function fileExists(filePath) {
  return memoryFiles.has(normalize(filePath));
}

function directoryExists(dirPath) {
  const normalized = normalize(dirPath);
  const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`;
  for (const filePath of memoryFiles.keys()) {
    if (filePath.startsWith(prefix)) return true;
  }
  return normalized === '/workspaces/MetrAIyux-0S' || normalized === '/workspaces/MetrAIyux-0S/MCP';
}

export function existsSync(filePath) {
  return fileExists(filePath) || directoryExists(filePath);
}

export function statSync(filePath) {
  const normalized = normalize(filePath);
  if (memoryFiles.has(normalized)) {
    const text = memoryFiles.get(normalized) || '';
    return {
      size: new TextEncoder().encode(text).length,
      isFile: () => true,
      isDirectory: () => false
    };
  }
  if (directoryExists(normalized)) {
    return {
      size: 0,
      isFile: () => false,
      isDirectory: () => true
    };
  }
  throw new Error(`ENOENT: no such file or directory, stat '${normalized}'`);
}

export function readFileSync(filePath, encoding = 'utf8') {
  const normalized = normalize(filePath);
  if (!memoryFiles.has(normalized)) {
    throw new Error(`ENOENT: no such file or directory, open '${normalized}'`);
  }
  const text = memoryFiles.get(normalized) || '';
  if (encoding && encoding !== 'utf8') return new TextEncoder().encode(text);
  return text;
}

export function readdirSync(dirPath, options = {}) {
  const normalized = normalize(dirPath);
  const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`;
  const children = new Map();

  for (const filePath of memoryFiles.keys()) {
    if (!filePath.startsWith(prefix)) continue;
    const rest = filePath.slice(prefix.length);
    if (!rest) continue;
    const [name, ...remaining] = rest.split('/');
    if (!name) continue;
    children.set(name, remaining.length > 0 ? 'dir' : 'file');
  }

  const names = [...children.keys()].sort();
  if (!options?.withFileTypes) return names;

  return names.map((name) => {
    const type = children.get(name);
    return {
      name,
      isDirectory: () => type === 'dir',
      isFile: () => type === 'file'
    };
  });
}

export function mkdirSync() {
  return undefined;
}

export function writeFileSync(filePath, data) {
  memoryFiles.set(normalize(filePath), String(data ?? ''));
}

export default {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
};
