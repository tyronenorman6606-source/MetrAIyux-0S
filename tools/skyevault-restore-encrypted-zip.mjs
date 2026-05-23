#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function value(name, fallback = '') {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function has(name) {
  return args.includes(name);
}

function usage() {
  return [
    'Usage:',
    '  node skyevault-restore-encrypted-zip.mjs --artifact=repo.zip.enc --kit=direct-restore-kit.zip --out-dir=./restore-repo',
    '  node skyevault-restore-encrypted-zip.mjs --artifact=repo.zip.enc --key-file=./artifact-key-material.txt --out-dir=./restore-repo',
    '',
    'Options:',
    '  --artifact=FILE   Required encrypted .zip.enc artifact.',
    '  --kit=FILE        Direct restore kit zip containing *-artifact-key-material.txt.',
    '  --key-file=FILE   Artifact key material file if no kit is used.',
    '  --zip-out=FILE    Decrypted zip output. Defaults to artifact name without .enc.',
    '  --out-dir=DIR     Extract destination. Defaults to ./restore-metraiyux-0s.',
    '  --no-extract      Only decrypt and verify the zip.',
    '  --force           Overwrite existing decrypted zip and extract folder files.',
    ''
  ].join('\n');
}

function fail(message) {
  console.error(message);
  console.error('');
  console.error(usage());
  process.exit(1);
}

function existingFile(file, label) {
  const resolved = path.resolve(file || '');
  if (!file || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) fail(`${label} not found: ${file || '(missing)'}`);
  return resolved;
}

function run(command, commandArgs, label) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status) throw new Error(`${label} failed with status ${result.status}.`);
}

function findKeyFile(dir) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(file);
      if (entry.isFile() && /artifact-key-material\.txt$/i.test(entry.name)) return file;
    }
  }
  return '';
}

const artifact = existingFile(value('--artifact'), 'Encrypted artifact');
const force = has('--force');
const shouldExtract = !has('--no-extract');
const defaultZipOut = artifact.replace(/\.enc$/i, '');
const zipOut = path.resolve(value('--zip-out', defaultZipOut));
const outDir = path.resolve(value('--out-dir', './restore-metraiyux-0s'));
let keyFile = value('--key-file');
let kitTemp = '';

if (!keyFile && value('--kit')) {
  const kit = existingFile(value('--kit'), 'Direct restore kit');
  kitTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-restore-kit-'));
  run('unzip', ['-q', kit, '-d', kitTemp], 'restore kit unzip');
  keyFile = findKeyFile(kitTemp);
}

keyFile = existingFile(keyFile, 'Artifact key material file');

if (fs.existsSync(zipOut) && !force) {
  fail(`Decrypted zip already exists: ${zipOut}. Pass --force to overwrite it.`);
}

if (shouldExtract) fs.mkdirSync(outDir, { recursive: true });

console.log(`Decrypting ${path.basename(artifact)} to ${zipOut}`);
run('openssl', [
  'enc',
  '-d',
  '-aes-256-cbc',
  '-pbkdf2',
  '-iter',
  '700000',
  '-md',
  'sha256',
  '-pass',
  `file:${keyFile}`,
  '-in',
  artifact,
  '-out',
  zipOut
], 'OpenSSL decrypt');

console.log('Verifying decrypted ZIP structure');
run('unzip', ['-tq', zipOut], 'zip verification');

if (shouldExtract) {
  console.log(`Extracting repo to ${outDir}`);
  run('unzip', [force ? '-oq' : '-q', zipOut, '-d', outDir], 'repo unzip');
}

if (kitTemp) fs.rmSync(kitTemp, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  decryptedZip: zipOut,
  extractedTo: shouldExtract ? outDir : null
}, null, 2));
