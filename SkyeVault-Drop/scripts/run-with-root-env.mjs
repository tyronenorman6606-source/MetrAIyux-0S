#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname);
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '..');

function parseEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const separator = process.argv.indexOf('--');
const command = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);
if (!command.length) {
  console.error('Usage: node scripts/run-with-root-env.mjs -- <command> [...args]');
  process.exit(2);
}

const loaded = {
  ...parseEnv(path.join(repoRoot, '.env')),
  ...parseEnv(path.join(appRoot, '.env')),
  ...process.env
};

if (!loaded.CLOUDFLARE_API_TOKEN && loaded.cloudflare_api_token) loaded.CLOUDFLARE_API_TOKEN = loaded.cloudflare_api_token;
if (!loaded.CLOUDFLARE_ACCOUNT_ID) {
  loaded.CLOUDFLARE_ACCOUNT_ID = loaded.cloudflare_account_ID
    || loaded.METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID
    || loaded.R2_ACCOUNT_ID
    || loaded.CLOUDFLARE_R2_ACCOUNT_ID
    || '';
}
if (!loaded.R2_ACCOUNT_ID && loaded.CLOUDFLARE_R2_ACCOUNT_ID) loaded.R2_ACCOUNT_ID = loaded.CLOUDFLARE_R2_ACCOUNT_ID;
if (!loaded.R2_ACCESS_KEY_ID && loaded.CLOUDFLARE_R2_ACCESS_KEY) loaded.R2_ACCESS_KEY_ID = loaded.CLOUDFLARE_R2_ACCESS_KEY;
if (!loaded.R2_SECRET_ACCESS_KEY && loaded.CLOUDFLARE_R2_SECRET_KEY) loaded.R2_SECRET_ACCESS_KEY = loaded.CLOUDFLARE_R2_SECRET_KEY;

const child = spawn(command[0], command.slice(1), {
  cwd: appRoot,
  env: loaded,
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Command exited by signal ${signal}.`);
    process.exit(1);
  }
  process.exit(code || 0);
});
