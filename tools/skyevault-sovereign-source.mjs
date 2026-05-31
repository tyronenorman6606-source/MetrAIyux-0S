#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'status';
const repoName = path.basename(repoRoot);
const autosyncDir = path.join(repoRoot, '.skyevault-out', 'autosync');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (inline) return inline;
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function modeFromCommand(commandText) {
  const text = String(commandText || '');
  const inline = text.match(/--mode=([^\s]+)/);
  if (inline) return inline[1];
  const spaced = text.match(/--mode\s+([^\s]+)/);
  return spaced?.[1] || '';
}

function runNpm(script, extraArgs = []) {
  const result = spawnSync('npm', ['run', script, '--', ...extraArgs], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function latestTempFullRun() {
  const prefix = `skyevault-full-repo-${repoName}-`;
  let entries = [];
  try {
    entries = fs.readdirSync(os.tmpdir(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => path.join(os.tmpdir(), entry.name))
      .sort();
  } catch {
    return null;
  }
  let fallback = null;
  for (const dir of entries.reverse()) {
    const logFile = path.join(dir, 'full-repo-stream-upload.log');
    const plan = readJson(path.join(dir, 'PLAN.json'), null);
    const handoff = readJson(path.join(dir, 'FULL_REPO_SKYDRIVE_HANDOFF.json'), null);
    let log = '';
    try {
      log = fs.readFileSync(logFile, 'utf8');
    } catch {}
    const uploadedParts = [...log.matchAll(/Uploaded part\s+(\d+)\s+\((\d+) bytes\)/g)]
      .map((match) => ({ part: Number(match[1]), bytes: Number(match[2]) }))
      .filter((item) => Number.isFinite(item.part));
    const objectKey = log.match(/Upload session\s+(\S+)\s+object\s+(\S+)/);
    const item = {
      dir,
      logFile: fs.existsSync(logFile) ? logFile : '',
      planFile: fs.existsSync(path.join(dir, 'PLAN.json')) ? path.join(dir, 'PLAN.json') : '',
      handoffFile: fs.existsSync(path.join(dir, 'FULL_REPO_SKYDRIVE_HANDOFF.json')) ? path.join(dir, 'FULL_REPO_SKYDRIVE_HANDOFF.json') : '',
      fileName: plan?.fileName || handoff?.artifact?.fileName || '',
      completedAt: handoff?.completedAt || '',
      artifactBytes: handoff?.artifact?.bytes || null,
      artifactSha256: handoff?.artifact?.sha256 || '',
      artifactReceiptId: handoff?.artifactReceiptId || '',
      controlReceiptId: handoff?.controlUpload?.receiptId || '',
      uploadSessionId: objectKey?.[1] || '',
      objectKey: objectKey?.[2] || '',
      uploadedPartCount: uploadedParts.length,
      highestUploadedPart: uploadedParts.reduce((max, item) => Math.max(max, item.part), 0),
      uploadedBytesApprox: uploadedParts.reduce((sum, item) => sum + item.bytes, 0)
    };
    if (!fallback) fallback = item;
    if (item.completedAt || item.uploadedPartCount > 0) return item;
  }
  return fallback;
}

function latestReceipt(name) {
  const file = path.join(autosyncDir, name);
  const value = readJson(file, null);
  return value ? { file, value } : null;
}

function daemonStatus() {
  const pidFile = path.join(autosyncDir, 'watch.pid');
  const record = readJson(pidFile, null);
  const pid = Number(record?.pid || 0);
  const commandText = record?.command || '';
  return {
    running: pidAlive(pid),
    pid: Number.isInteger(pid) && pid > 0 ? pid : null,
    startedAt: record?.startedAt || '',
    command: commandText,
    mode: modeFromCommand(commandText),
    desiredMode: 'git+full',
    needsRestartForDesiredMode: Boolean(pidAlive(pid) && modeFromCommand(commandText) && modeFromCommand(commandText) !== 'git+full'),
    pidFile: fs.existsSync(pidFile) ? pidFile : ''
  };
}

function storageLimits() {
  const daemonMaxGb = Number(process.env.SKYEVAULT_AUTOSYNC_FULL_MAX_GB || process.env.SKYEVAULT_FULL_REPO_MAX_GB || 50);
  return {
    currentDaemonFullStreamMaxGb: Number.isFinite(daemonMaxGb) ? daemonMaxGb : 50,
    defaultVaultDestinationMaxFileSizeGb: 5000,
    defaultVaultSubmissionMaxTotalGb: 5000,
    defaultVaultFilesPerSubmission: 25,
    cloudflareR2SingleObjectCeilingTb: 5,
    multipartChunkMb: Number(process.env.SKYEVAULT_FULL_REPO_DIRECT_R2_CHUNK_MB || process.env.SKYEVAULT_CHUNK_SIZE_MB || 64)
  };
}

function readLauncherStatus() {
  const file = path.join(autosyncDir, 'owner-download-launcher.json');
  const status = readJson(file, null);
  const pid = Number(status?.pid || 0);
  return {
    running: pidAlive(pid),
    pid: Number.isInteger(pid) && pid > 0 ? pid : null,
    url: status?.url || 'http://127.0.0.1:17687/FULL_17GB_REPO_DOWNLOAD.html',
    htmlOut: status?.htmlOut || '.skyevault-out/autosync/FULL_17GB_REPO_DOWNLOAD.html',
    signedDownload: status?.signedDownload || null,
    statusReceipt: fs.existsSync(file) ? file : ''
  };
}

function readOwnerGitOriginStatus() {
  const dir = path.join(repoRoot, '.skyevault-out', 'git-remote');
  const status = readJson(path.join(dir, 'owner-git-origin-status.json'), null);
  const sync = readJson(path.join(dir, 'owner-git-origin-sync.json'), null);
  const proof = readJson(path.join(dir, 'owner-git-origin-proof.json'), null);
  const pid = Number(status?.pid || 0);
  return {
    running: Boolean(status?.running) && (!pid || pidAlive(pid)),
    pid: Number.isInteger(pid) && pid > 0 ? pid : null,
    baseUrl: status?.baseUrl || 'http://127.0.0.1:8787',
    cloneUrl: status?.cloneUrl || 'http://127.0.0.1:8787/metraiyux-0s-owner/MetrAIyux-0S.git',
    remoteName: status?.remoteName || 'skyevault',
    workspaceId: status?.workspaceId || 'metraiyux-0s-owner',
    repoId: status?.repoId || repoName,
    auth: status?.auth || sync?.auth || proof?.auth || {
      mode: 'unknown',
      runtimeEnv: '.skyevault-out/git-remote/owner-git-origin.env'
    },
    storageRoot: status?.storageRoot || '.skyevault-out/git-remote/storage',
    remoteMatchesLocalHead: Boolean(status?.remoteMatchesLocalHead || sync?.remoteMatchesLocalHead || proof?.headMatches),
    latestSync: sync ? {
      ok: Boolean(sync.ok),
      completedAt: sync.completedAt || '',
      localHead: sync.localHead || '',
      remoteMatchesLocalHead: Boolean(sync.remoteMatchesLocalHead),
      syncReceipt: '.skyevault-out/git-remote/owner-git-origin-sync.json'
    } : null,
    latestProof: proof ? {
      ok: Boolean(proof.ok),
      provedAt: proof.provedAt || '',
      headMatches: Boolean(proof.headMatches),
      cloneDir: proof.cloneDir || '',
      proofReceipt: '.skyevault-out/git-remote/owner-git-origin-proof.json'
    } : null,
    statusReceipt: status ? path.join(dir, 'owner-git-origin-status.json') : ''
  };
}

function writeRestoreGuide(status) {
  const file = path.join(repoRoot, '.skyevault-out', 'sovereign-source', 'RESTORE_FROM_SKYEVAULT.md');
  const text = `# Restore From SkyeVault Sovereign Source

This repo treats Codespaces as disposable compute. SkyeVault is the custody lane.
Autosync tracks custody coverage per lane, so a missing Git pack can be added without re-uploading an already-covered full encrypted artifact for the same digest.

## What To Restore First

1. Restore the latest Git vault pack when you need clone/fetch/push-level repo history.
2. Restore the latest encrypted full-repo artifact when you need everything in the workspace, including ignored/generated/local state.
3. Restore secret/control material through SkyeSecure, not chat or public docs.

## One Login Truth

- The shared 0S/FS27/SkyGate/Free99 gate session is the owner/admin login.
- A signed SkyeVault download URL is only a short-lived file ticket minted after that gate session is accepted.
- SkyeSecure passphrase/pepper material unlocks encrypted \`.skyesecrets\` packs. It is encryption material, not another app login.
- Legacy admin/operator tokens are emergency fallback only when the shared gate is unavailable.

## Links

- SkyeVault Drive: https://skyevault-drop.graylondonskyes.workers.dev/#client-vault
- SkyeVault Command Center: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html
- SkyeSecure Unlocker: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html
- Owner login: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html
- Owner HTTP download launcher: ${status.links?.ownerDownloadLauncher || 'run `npm run vault:source:download -- --env-file=.env`'}
- Owner Git origin: ${status.links?.ownerGitOrigin || 'run `npm run vault:origin:start && npm run vault:origin:proof`'}
- Private fallback opener: \`.skyevault-out/autosync/FULL_17GB_REPO_DOWNLOAD.html\` when minted locally

## Latest Local Pointers

- Primary custody receipt: ${status.latestPrimarySuccess?.file ? `\`${rel(status.latestPrimarySuccess.file)}\`` : 'none yet'}
- Full repo custody receipt: ${status.latestFullRepoSuccess?.file ? `\`${rel(status.latestFullRepoSuccess.file)}\`` : 'none yet'}
- Owner download launcher receipt: \`.skyevault-out/autosync/owner-download-launcher.json\`
- Owner Git origin receipt: \`.skyevault-out/git-remote/owner-git-origin-status.json\`
- Private signed-link receipt: \`.skyevault-out/autosync/FULL_17GB_REPO_DOWNLOAD.json\` when minted locally

Signed URLs, bearer tokens, passphrases, peppers, and private unlock material stay out of this guide.
`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
  return file;
}

function buildStatus() {
  const primary = latestReceipt('latest-primary-success.json');
  const full = latestReceipt('latest-full-repo-success.json');
  const current = latestTempFullRun();
  const launcher = readLauncherStatus();
  const status = {
    ok: true,
    schema: 'skyevault.sovereign-source-status.v1',
    checkedAt: new Date().toISOString(),
    repo: repoName,
    model: {
      sourceOfTruth: 'SkyeVault/SkyeDrive custody lane',
      compute: 'Codespaces/local IDE are disposable restore targets',
      daemonMode: 'git+full',
      laneCoverage: 'mode-level dedupe: git/full/safe receipts can combine for the same digest without re-streaming covered lanes',
      gitLevelLane: 'Git bundle/remote refs plus sanitized dirty overlay',
      fullStateLane: 'encrypted literal full-repo tar.zst snapshots',
      fastLane: 'encrypted delta journal for changed/untracked/local-critical files',
      gitOriginLane: 'local owner-private smart HTTP Git origin for clone/fetch/push restore'
    },
    authModel: {
      login: 'shared 0S/FS27/SkyGate/Free99 gate session',
      signedDownloadUrl: 'short-lived SkyeVault object ticket minted after gate auth',
      skyeSecureUnlock: 'encryption unlock material for .skyesecrets packs, not an app login',
      legacyFallback: 'legacy admin/operator token only when the shared gate is unavailable'
    },
    daemon: daemonStatus(),
    ownerGitOrigin: readOwnerGitOriginStatus(),
    latestPrimarySuccess: primary ? {
      file: primary.file,
      recordedAt: primary.value.recordedAt || '',
      digest: primary.value.state?.digest || '',
      plannedModes: primary.value.plannedModes || []
    } : null,
    latestFullRepoSuccess: full ? {
      file: full.file,
      recordedAt: full.value.recordedAt || '',
      digest: full.value.state?.digest || '',
      artifactBytes: full.value.fullRun?.childSummaries?.find((item) => item.artifactBytes)?.artifactBytes || null,
      artifactSha256: full.value.fullRun?.childSummaries?.find((item) => item.artifactSha256)?.artifactSha256 || '',
      artifactReceiptId: full.value.fullRun?.childSummaries?.find((item) => item.receiptId)?.receiptId || '',
      controlReceiptId: full.value.fullRun?.childSummaries?.find((item) => item.controlReceiptId)?.controlReceiptId || ''
    } : null,
    activeOrLatestFullStream: current ? {
      ...current,
      dir: current.dir,
      logFile: current.logFile,
      planFile: current.planFile,
      handoffFile: current.handoffFile
    } : null,
    ownerDownloadLauncher: launcher,
    storageLimits: storageLimits(),
    links: {
      skyeVaultDrive: 'https://skyevault-drop.graylondonskyes.workers.dev/#client-vault',
      skyeVaultCommandCenter: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html',
      skyeSecureUnlocker: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html',
      ownerLogin: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html',
      ownerGitOrigin: readOwnerGitOriginStatus().cloneUrl,
      ownerDownloadLauncher: launcher.url,
      localDirectDownloadOpener: '.skyevault-out/autosync/FULL_17GB_REPO_DOWNLOAD.html'
    }
  };
  const out = path.join(repoRoot, '.skyevault-out', 'sovereign-source', 'latest-status.json');
  writeJson(out, status);
  status.statusReceipt = out;
  status.restoreGuide = writeRestoreGuide(status);
  return status;
}

if (command === 'status') {
  console.log(JSON.stringify(buildStatus(), null, 2));
} else if (command === 'start') {
  runNpm('vault:agent:start', [
    `--env-file=${argValue('--env-file', 'env.txt')}`,
    '--mode=git+full',
    `--interval-seconds=${argValue('--interval-seconds', '600')}`
  ]);
} else if (command === 'restart') {
  runNpm('vault:agent:restart', [
    `--env-file=${argValue('--env-file', 'env.txt')}`,
    '--mode=git+full',
    `--interval-seconds=${argValue('--interval-seconds', '600')}`
  ]);
} else if (command === 'sync-once') {
  runNpm('vault:autosync:once', [
    `--env-file=${argValue('--env-file', 'env.txt')}`,
    '--mode=git+full',
    '--skip-map'
  ]);
} else if (command === 'download') {
  runNpm('vault:source:download', [
    `--env-file=${argValue('--env-file', '.env')}`,
    `--port=${argValue('--port', '17687')}`
  ]);
} else if (command === 'guide') {
  const status = buildStatus();
  console.log(JSON.stringify({ ok: true, guide: status.restoreGuide, statusReceipt: status.statusReceipt }, null, 2));
} else {
  console.error(`Unknown sovereign source command: ${command}`);
  process.exit(1);
}
