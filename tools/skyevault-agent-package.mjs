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

function createReproducibleArchive(stageRoot, archivePath) {
  const tar = spawnSync('tar', [
    '--sort=name',
    '--mtime=@0',
    '--owner=0',
    '--group=0',
    '--numeric-owner',
    '--pax-option=exthdr.name=%d/PaxHeaders/%f,delete=atime,delete=ctime',
    '-cf',
    '-',
    '-C',
    stageRoot,
    'skyevault-agent'
  ], {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 1024 * 1024 * 200
  });
  if (tar.status !== 0) {
    throw new Error(`tar failed: ${String(tar.stderr || tar.stdout || tar.status)}`);
  }
  const gzip = spawnSync('gzip', ['-n', '-9'], {
    cwd: repoRoot,
    input: tar.stdout,
    encoding: null,
    maxBuffer: 1024 * 1024 * 200
  });
  if (gzip.status !== 0) {
    throw new Error(`gzip failed: ${String(gzip.stderr || gzip.stdout || gzip.status)}`);
  }
  fs.writeFileSync(archivePath, gzip.stdout, { mode: 0o644 });
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
  try {
    createReproducibleArchive(stageRoot, archivePath);
  } catch (error) {
    console.error(error?.message || String(error));
    process.exit(1);
  } finally {
    fs.rmSync(stageRoot, { recursive: true, force: true });
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
      product: 'Reape0r: the Autonomous Cloud Repo Mirror',
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
      latestSha256,
      reproducible: true
    },
    skyepay: {
      offers: ['skyevault-starter-access', 'skyevault-pro-access', 'skyevault-command-access', 'skyevault-auto-install-addon'],
      storeUrl: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=skyevault-pro-access',
      activationPath: '/skye-vault-os/agent/',
      plans: [
        {
          id: 'skyevault-starter-access',
          title: 'Reape0r Starter Access',
          price: '$49/month',
          quota: { workspaces: 1, storage: '1 GB', filesPerMonth: 250, rpm: 30, rpd: 500, devices: 1, monthlyCap: '$50' }
        },
        {
          id: 'skyevault-pro-access',
          title: 'Reape0r Pro Access',
          price: '$149/month',
          quota: { workspaces: 3, storage: '25 GB', filesPerMonth: 1500, rpm: 90, rpd: 2500, devices: 3, monthlyCap: '$150' }
        },
        {
          id: 'skyevault-command-access',
          title: 'Reape0r Command Access',
          price: '$499/month',
          quota: { workspaces: 10, storage: '100 GB', filesPerMonth: 10000, rpm: 240, rpd: 10000, devices: 10, monthlyCap: '$500' }
        },
        {
          id: 'skyevault-auto-install-addon',
          title: 'Reape0r Auto-Install Add-On',
          price: '$13 one time',
          quota: { machines: 1, requiresExistingPlan: true, includes: ['env file written 0600', 'first current mirror receipt', 'watcher service attempt'] }
        }
      ]
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
