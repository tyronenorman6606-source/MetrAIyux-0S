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
const ownerDesiredMode = 'living-mirror';

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

function commandHasFlag(commandText, flagName) {
  return String(commandText || '').split(/\s+/).includes(flagName);
}

function ownerFullCurrentDaemonArgs({ envFile, intervalSeconds } = {}) {
  return [
    `--env-file=${envFile || argValue('--env-file', '.env')}`,
    '--mode=mirror',
    '--full-current-index',
    '--skip-delta',
    `--interval-seconds=${intervalSeconds || argValue('--interval-seconds', '600')}`
  ];
}

function ownerFullCurrentOnceArgs({ envFile } = {}) {
  return [
    `--env-file=${envFile || argValue('--env-file', '.env')}`,
    '--mode=mirror',
    '--full-current-index',
    '--skip-delta',
    '--skip-map'
  ];
}

function runNpm(script, extraArgs = []) {
  const result = spawnSync('npm', ['run', script, '--', ...extraArgs], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function currentRepoState() {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-autosync.mjs'),
    'state',
    `--env-file=${argValue('--env-file', '.env')}`
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16
  });
  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      error: (result.stderr || result.stdout || 'current repo state scan failed').trim().slice(-2000)
    };
  }
  try {
    const parsed = JSON.parse(result.stdout || '{}');
    return { ok: Boolean(parsed.ok), state: parsed.state || null };
  } catch (error) {
    return { ok: false, error: `current repo state JSON parse failed: ${error.message}` };
  }
}

function livingMirrorStatus() {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-living-repo-mirror.mjs'),
    'status',
    `--env-file=${argValue('--env-file', '.env')}`
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8
  });
  try {
    const parsed = JSON.parse(result.stdout || '{}');
    return { ok: result.status === 0 && Boolean(parsed.ok), status: result.status, ...parsed };
  } catch {
    return { ok: false, status: result.status, error: (result.stderr || result.stdout || 'living mirror status unavailable').trim().slice(-2000) };
  }
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
  const running = pidAlive(pid);
  const mode = modeFromCommand(commandText);
  const isDesired = mode === 'mirror'
    && commandHasFlag(commandText, '--skip-delta')
    && commandHasFlag(commandText, '--full-current-index');
  return {
    running,
    pid: Number.isInteger(pid) && pid > 0 ? pid : null,
    startedAt: record?.startedAt || '',
    command: commandText,
    mode,
    desiredMode: ownerDesiredMode,
    desiredCommandShape: '--mode=mirror --full-current-index --skip-delta',
    needsRestartForDesiredMode: Boolean(running && !isDesired),
    pidFile: fs.existsSync(pidFile) ? pidFile : ''
  };
}

function storageLimits() {
  const daemonMaxGb = Number(process.env.SKYEVAULT_AUTOSYNC_FULL_MAX_GB || process.env.SKYEVAULT_FULL_REPO_MAX_GB || 50);
  return {
    legacyFullStreamMaxGb: Number.isFinite(daemonMaxGb) ? daemonMaxGb : 50,
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
    pid: pidAlive(pid) ? pid : null,
    url: status?.url && !String(status.url).includes('FULL_17GB_REPO_DOWNLOAD')
      ? status.url
      : 'http://127.0.0.1:17687/CURRENT_REPO_BACKUP.html',
    htmlOut: status?.htmlOut && !String(status.htmlOut).includes('FULL_17GB_REPO_DOWNLOAD')
      ? status.htmlOut
      : '.skyevault-out/autosync/CURRENT_REPO_BACKUP.html',
    restoreKit: status?.restoreKit || null,
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
The owner lane keeps one living encrypted repo mirror. The daemon updates the current base itself, and download/restore reads that current mirror.

## What To Restore First

1. Restore from the living current mirror when you need everything in the workspace, including ignored/generated/local state.
2. Use the owner Git origin only as a terminal clone/fetch/push convenience lane.
3. Restore secret/control material through SkyeSecure, not chat or public docs.

## One Login Truth

- The shared 0S/FS27/SkyGate/Free99 gate session is the owner/admin login.
- The owner restore kit is the private pointer to the current mutable mirror; it is not a separate rebuilt full artifact.
- SkyeSecure passphrase/pepper material unlocks encrypted \`.skyesecrets\` packs. It is encryption material, not another app login.
- Legacy admin/operator tokens are emergency fallback only when the shared gate is unavailable.

## Links

- SkyeVault Drive: https://skyevault-drop.graylondonskyes.workers.dev/#client-vault
- SkyeVault Command Center: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html
- SkyeSecure Unlocker: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html
- Owner login: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html
- Owner current backup launcher: ${status.links?.ownerDownloadLauncher || 'run `npm run vault:source:download -- --env-file=.env`'}
- Owner Git origin: ${status.links?.ownerGitOrigin || 'run `npm run vault:origin:start && npm run vault:origin:proof`'}
- Private fallback opener: \`.skyevault-out/autosync/CURRENT_REPO_BACKUP.html\` when served locally

## Latest Local Pointers

- Primary custody receipt: ${status.latestPrimarySuccess?.file ? `\`${rel(status.latestPrimarySuccess.file)}\`` : 'none yet'}
- Living mirror receipt: ${status.livingMirror?.latestReceipt?.receiptPath ? `\`${rel(status.livingMirror.latestReceipt.receiptPath)}\`` : 'none yet'}
- Owner download launcher receipt: \`.skyevault-out/autosync/owner-download-launcher.json\`
- Owner Git origin receipt: \`.skyevault-out/git-remote/owner-git-origin-status.json\`
- Private current restore kit: \`.skyevault-out/autosync/CURRENT_REPO_BACKUP.json\`

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
  const currentState = currentRepoState();
  const mirror = livingMirrorStatus();
  const currentDigest = currentState.state?.digest || '';
  const latestFullDigest = full?.value?.state?.digest || '';
  const latestFullCurrent = Boolean(currentState.ok && currentDigest && latestFullDigest && currentDigest === latestFullDigest);
  const status = {
    ok: true,
    schema: 'skyevault.sovereign-source-status.v1',
    checkedAt: new Date().toISOString(),
    repo: repoName,
    model: {
      sourceOfTruth: 'living current encrypted repo mirror in SkyeVault/SkyeDrive custody',
      compute: 'Codespaces/local IDE are disposable restore targets',
      daemonMode: ownerDesiredMode,
      ownerContract: 'one living current encrypted repo mirror; no owner restore from separate delta packs',
      fullStateLane: 'full current encrypted per-path mirror objects plus one current manifest; owner download returns the current restore kit, not a rebuilt full artifact',
      gitOriginLane: 'local owner-private smart HTTP Git origin for clone/fetch/push restore convenience',
      staleDownloadRule: 'the launcher must refuse stale restore kits whose digest does not match the current mirror manifest'
    },
    authModel: {
      login: 'shared 0S/FS27/SkyGate/Free99 gate session',
      restoreKit: 'private current mirror pointer issued after owner gate auth',
      skyeSecureUnlock: 'encryption unlock material for .skyesecrets packs, not an app login',
      legacyFallback: 'legacy admin/operator token only when the shared gate is unavailable'
    },
    daemon: daemonStatus(),
    livingMirror: mirror.ok ? {
      ok: true,
      digest: mirror.manifest?.digest || '',
      generatedAt: mirror.manifest?.generatedAt || '',
      mode: mirror.manifest?.mode || '',
      fullCurrentIndexReady: Boolean(mirror.manifest?.fullCurrentIndexReady),
      adoptedBasePresent: Boolean(mirror.manifest?.adoptedBasePresent),
      needsFullCurrentSeed: !mirror.manifest?.fullCurrentIndexReady,
      entryCount: mirror.manifest?.entryCount || 0,
      fileCount: mirror.manifest?.fileCount || 0,
      totalBytes: mirror.manifest?.totalBytes || 0,
      remote: mirror.manifest?.remote || null,
      latestReceipt: mirror.latestReceipt || null,
      mirrorRoot: mirror.mirrorRoot || ''
    } : {
      ok: false,
      error: mirror.error || 'living mirror has not been seeded yet',
      status: mirror.status ?? null
    },
    ownerGitOrigin: readOwnerGitOriginStatus(),
    currentRepoState: currentState.ok ? {
      digest: currentDigest,
      branch: currentState.state?.branch || '',
      shortHead: currentState.state?.shortHead || '',
      dirty: Boolean(currentState.state?.dirty),
      statusCounts: currentState.state?.statusCounts || null,
      changedFileFingerprintCount: currentState.state?.changedFileFingerprintCount || 0,
      localOnlyCriticalCount: currentState.state?.localOnlyCriticalCount || 0
    } : {
      ok: false,
      error: currentState.error || 'current repo state unavailable'
    },
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
      current: latestFullCurrent,
      staleReason: latestFullCurrent ? '' : `latest full digest ${String(latestFullDigest).slice(0, 16)} does not match current repo digest ${String(currentDigest).slice(0, 16)}`,
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
      localDirectDownloadOpener: '.skyevault-out/autosync/CURRENT_REPO_BACKUP.html'
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
  runNpm('vault:agent:start', ownerFullCurrentDaemonArgs());
} else if (command === 'restart') {
  runNpm('vault:agent:restart', ownerFullCurrentDaemonArgs());
} else if (command === 'sync-once') {
  runNpm('vault:autosync:once', ownerFullCurrentOnceArgs());
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
