#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repoRoot, 'skyesol_current_public_site/SkyeSol/skyesol-main/src/SkyesolMcpApp.jsx');
const outfile = path.join(repoRoot, 'skyesol_current_public_site/SkyeSol/skyesol-main/assets/skyesol-rebuild/app.bundle.js');

if (!fs.existsSync(source)) {
  console.log('Skipped build: skyesol_current_public_site was removed, so the legacy SkyeSol MCP app source is not present.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(outfile), { recursive: true });
execFileSync('esbuild', [
  source,
  '--bundle',
  '--format=esm',
  '--platform=browser',
  '--target=es2020',
  `--outfile=${outfile}`,
  '--minify'
], {
  cwd: repoRoot,
  stdio: 'inherit'
});
