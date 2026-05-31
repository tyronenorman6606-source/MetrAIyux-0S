#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const packageRoot = path.join(repoRoot, 'packages', 'skyevault-agent');
const siteDownloadRoot = path.join(repoRoot, 'metraiyux_0s_site', 'downloads', 'skyevault-agent');
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'pack';

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

async function sha256File(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function walkFiles(dir) {
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  walk(dir);
  return files;
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function runCheck(file) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: repoRoot, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    status: result.status,
    stderr: String(result.stderr || '').slice(-1200)
  };
}

async function pack() {
  const pkg = readJson(path.join(packageRoot, 'package.json'));
  const version = argValue('--version', pkg.version);
  const releaseId = `v${version}`;
  const releaseDir = path.join(siteDownloadRoot, 'releases', releaseId);
  const latestDir = path.join(siteDownloadRoot, 'releases', 'latest');
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.rmSync(latestDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });

  const syntax = runCheck(path.join(packageRoot, 'bin', 'skyevault-agent.mjs'));
  if (!syntax.ok) {
    console.error(syntax.stderr);
    process.exit(1);
  }

  const archiveName = `skyevault-agent-${version}.tar.gz`;
  const archivePath = path.join(releaseDir, archiveName);
  const latestArchivePath = path.join(latestDir, 'skyevault-agent-latest.tar.gz');
  const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-release-'));
  const stagePackageRoot = path.join(stageRoot, 'skyevault-agent');
  fs.cpSync(packageRoot, stagePackageRoot, { recursive: true });
  const result = spawnSync('tar', ['-czf', archivePath, '-C', stageRoot, 'skyevault-agent'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  fs.rmSync(stageRoot, { recursive: true, force: true });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || `tar failed ${result.status}`);
    process.exit(result.status || 1);
  }
  fs.copyFileSync(archivePath, latestArchivePath);

  const archiveSha256 = await sha256File(archivePath);
  const latestSha256 = await sha256File(latestArchivePath);
  const fileRows = [];
  for (const file of walkFiles(packageRoot)) {
    fileRows.push({
      path: path.relative(packageRoot, file).split(path.sep).join('/'),
      bytes: fs.statSync(file).size,
      sha256: await sha256File(file)
    });
  }
  fileRows.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = {
    ok: true,
    schema: 'skyevault.agent.release-manifest.v1',
    generatedAt: new Date().toISOString(),
    package: {
      name: pkg.name,
      version,
      bin: pkg.bin,
      engines: pkg.engines
    },
    release: {
      id: releaseId,
      archiveName,
      archivePath: rel(archivePath),
      archiveUrl: `/downloads/skyevault-agent/releases/${releaseId}/${archiveName}`,
      latestArchiveUrl: '/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz',
      bytes: fs.statSync(archivePath).size,
      sha256: archiveSha256,
      latestSha256
    },
    skyepay: {
      offers: ['skyevault-starter-access', 'skyevault-pro-access', 'skyevault-command-access'],
      storeUrl: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=skyevault-pro-access',
      activationPath: '/skye-vault-os/agent/'
    },
    auth: {
      model: 'SkyePay workspace portal key for buyer uploads; optional shared 0S/FS27/SkyGate bearer for owner/admin lanes',
      bearerEnv: 'SKYEVAULT_GATE_BEARER',
      bearerRequiredForBuyerUpload: false,
      portalKeyEnv: 'SKYEVAULT_PORTAL_KEY',
      passphraseEnv: 'SKYEVAULT_AGENT_PASSPHRASE',
      noSeparateSkyeVaultPassword: true
    },
    files: fileRows
  };

  writeJson(path.join(releaseDir, 'manifest.json'), manifest);
  writeJson(path.join(latestDir, 'manifest.json'), manifest);
  writeJson(path.join(siteDownloadRoot, 'latest.json'), manifest);
  fs.writeFileSync(path.join(releaseDir, `${archiveName}.sha256`), `${archiveSha256}  ${archiveName}\n`);
  fs.writeFileSync(path.join(latestDir, 'skyevault-agent-latest.tar.gz.sha256'), `${latestSha256}  skyevault-agent-latest.tar.gz\n`);

  const receiptDir = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-package');
  const receiptPath = path.join(receiptDir, 'latest.json');
  writeJson(receiptPath, {
    ok: true,
    schema: 'skyevault.agent.package-receipt.v1',
    generatedAt: manifest.generatedAt,
    manifest: rel(path.join(siteDownloadRoot, 'latest.json')),
    releaseManifest: rel(path.join(releaseDir, 'manifest.json')),
    latestManifest: rel(path.join(latestDir, 'manifest.json')),
    archive: manifest.release,
    syntax
  });

  console.log(JSON.stringify({
    ok: true,
    receipt: rel(receiptPath),
    manifest: rel(path.join(siteDownloadRoot, 'latest.json')),
    archive: manifest.release
  }, null, 2));
}

if (command === 'pack' || command === 'release') {
  await pack();
} else {
  console.error('Usage: node tools/skyevault-agent-package.mjs pack');
  process.exit(2);
}
