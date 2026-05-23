#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mcpRoot, '..');
const distRoot = path.join(mcpRoot, 'skye-design-lab', 'dist');
const generatedMapPath = path.join(__dirname, 'generated-file-map.mjs');
const outputPath = path.join(distRoot, '_worker.js');

const includeRoots = [
  path.join(mcpRoot, 'design'),
  path.join(mcpRoot, 'skye-design-lab', 'registry'),
  path.join(mcpRoot, 'skye-design-lab', 'docs'),
  path.join(mcpRoot, 'magicuidesign-changelog-template-2ad04a0'),
  path.join(mcpRoot, 'magicuidesign-blog-template-bc0cb81'),
  path.join(mcpRoot, 'magicuidesign-portfolio-5ef12e4'),
  path.join(repoRoot, 'skyesol_spectacle_reference')
];

const includeFiles = [
  path.join(repoRoot, 'LIVE_DEPLOYMENT_LEDGER.md'),
  path.join(repoRoot, 'package.json'),
  path.join(mcpRoot, 'package.json'),
  path.join(mcpRoot, 'MCP_TOOLING_RECEIPT.json'),
  path.join(mcpRoot, 'skye-design-lab', 'README.md'),
  path.join(mcpRoot, 'skye-design-lab', 'package.json')
];

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mdx', '.mjs', '.ts', '.tsx', '.txt']);
const skipNames = new Set(['node_modules', 'dist', '.git', '.wrangler', '.next', 'package-lock.json', 'pnpm-lock.yaml']);

function walk(root, acc = []) {
  if (!fs.existsSync(root)) return acc;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (skipNames.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) acc.push(full);
  }
  return acc;
}

function toPosixAbsolute(filePath) {
  return path.resolve(filePath).split(path.sep).join('/');
}

function buildFileMap() {
  const files = [...includeFiles, ...includeRoots.flatMap((root) => walk(root))]
    .filter((filePath) => fs.existsSync(filePath))
    .filter((filePath, index, list) => list.indexOf(filePath) === index)
    .sort((a, b) => a.localeCompare(b));

  const map = {};
  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 550_000) continue;
    map[toPosixAbsolute(filePath)] = fs.readFileSync(filePath, 'utf8');
  }
  return map;
}

function aliasPlugin() {
  const aliases = new Map([
    ['node:fs', path.join(__dirname, 'shims', 'node-fs.mjs')],
    ['node:path', path.join(__dirname, 'shims', 'node-path.mjs')],
    ['node:url', path.join(__dirname, 'shims', 'node-url.mjs')],
    ['@modelcontextprotocol/sdk/server/stdio.js', path.join(__dirname, 'shims', 'stdio-empty.mjs')]
  ]);

  return {
    name: 'quantumskyes-worker-alias',
    setup(buildApi) {
      buildApi.onResolve({ filter: /.*/ }, (args) => {
        const alias = aliases.get(args.path);
        return alias ? { path: alias } : undefined;
      });
    }
  };
}

const fileMap = buildFileMap();
fs.writeFileSync(
  generatedMapPath,
  `export const FILE_MAP = ${JSON.stringify(fileMap, null, 2)};\n`,
  'utf8'
);

await build({
  entryPoints: [path.join(__dirname, 'worker-source.mjs')],
  outfile: outputPath,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  define: {
    'globalThis.process': JSON.stringify({
      env: {
        REPO_ROOT: '/workspaces/MetrAIyux-0S'
      },
      argv: []
    })
  },
  plugins: [aliasPlugin()]
});

fs.writeFileSync(
  path.join(distRoot, '_routes.json'),
  JSON.stringify({
    version: 1,
    include: ['/*'],
    exclude: ['/assets/*']
  }, null, 2),
  'utf8'
);

const outputBytes = fs.statSync(outputPath).size;
console.log(JSON.stringify({
  ok: true,
  filesEmbedded: Object.keys(fileMap).length,
  outputPath,
  outputBytes
}, null, 2));
