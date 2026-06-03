#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '0.2.4';
const PRODUCT_NAME = 'Reape0r';
const PRODUCT_TITLE = 'Reape0r: the Autonomous Cloud Repo Mirror';
const args = process.argv.slice(2);
const COMMANDS = ['help', 'version', 'init', 'auto-install', 'status', 'snapshot', 'sync', 'watch', 'verify', 'restore', 'doctor'];
const command = parseCommand(args);
const jsonMode = args.includes('--json');
const homeDir = os.homedir();
const agentRoot = path.resolve(process.env.SKYEVAULT_AGENT_STATE_DIR || path.join(homeDir, '.skyevault-agent'));
const configPath = path.join(agentRoot, 'config.json');

function parseCommand(input) {
  if (input.includes('--help') || input.includes('-h')) return 'help';
  if (input.includes('--version') || input.includes('-v')) return 'version';
  return input.find((arg) => !arg.startsWith('-')) || 'status';
}

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function flag(name) {
  return args.includes(name);
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function terminalColor(value, code) {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return value;
  return `\u001b[${code}m${value}\u001b[0m`;
}

function terminalLink(label, target) {
  const clean = String(target || '').trim();
  if (!clean) return '';
  const isUrl = /^https?:\/\//i.test(clean);
  const href = isUrl ? clean : `file://${path.resolve(clean)}`;
  const visible = terminalColor(label, '34;1');
  if (!process.stdout.isTTY) return `${label}: ${clean}`;
  return `\u001b]8;;${href}\u001b\\${visible}\u001b]8;;\u001b\\ (${clean})`;
}

function humanBytes(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
  return `${(size / (1024 ** index)).toFixed(index ? 2 : 0)} ${units[index]}`;
}

function addLine(lines, label, value) {
  if (value === undefined || value === null || value === '') return;
  lines.push(`${label}: ${value}`);
}

function addLink(lines, label, target) {
  const linked = terminalLink(label, target);
  if (linked) lines.push(`- ${linked}`);
}

function humanizePayload(payload, status = 0) {
  if (!payload || typeof payload !== 'object') return String(payload ?? '');
  const ok = payload.ok !== false && status === 0;
  const latest = payload.latest && typeof payload.latest === 'object' ? payload.latest : null;
  const lines = [
    terminalColor(PRODUCT_TITLE, ok ? '36;1' : '31;1'),
    `Status: ${terminalColor(ok ? 'OK' : 'NEEDS ATTENTION', ok ? '32;1' : '31;1')}`
  ];
  addLine(lines, 'Version', payload.version || VERSION);
  addLine(lines, 'Workspace', payload.workspaceId);
  addLine(lines, 'Repo', payload.repoPath);
  addLine(lines, 'Model', payload.model || payload.custodyModel);
  addLine(lines, 'Action', payload.action);
  addLine(lines, 'Files', payload.fileCount);
  addLine(lines, 'Bytes', payload.totalBytes ? humanBytes(payload.totalBytes) : '');
  addLine(lines, 'Changed', payload.changedFileCount);
  addLine(lines, 'Deleted', payload.tombstoneCount);
  addLine(lines, 'Digest', payload.manifestDigest || payload.finalManifestDigest);

  if (payload.upload) {
    const uploadState = payload.upload.ok
      ? `uploaded ${payload.upload.uploaded ?? payload.upload.completedParts ?? 1}`
      : payload.upload.skipped
        ? `skipped: ${payload.upload.reason || 'not requested'}`
        : `failed: ${payload.upload.error || payload.upload.reason || 'unknown'}`;
    addLine(lines, 'Upload', uploadState);
  }

  if (payload.firstSync) {
    addLine(lines, 'First sync', payload.firstSync.ok ? `${payload.firstSync.kind || 'sync'} complete` : `failed: ${payload.firstSync.stderrTail || payload.firstSync.reason || 'unknown'}`);
    const serviceMode = payload.service?.mode || 'none';
    const serviceState = payload.service?.started
      ? `${serviceMode} started`
      : `${serviceMode} not started${payload.service?.reason ? ` (${payload.service.reason})` : ''}`;
    addLine(lines, 'Watcher service', serviceState);
  }

  if (latest) {
    addLine(lines, 'Latest mirror', latest.kind || latest.model || latest.action);
    addLine(lines, 'Latest action', latest.action);
    addLine(lines, 'Latest files', latest.fileCount);
    addLine(lines, 'Latest bytes', latest.totalBytes ? humanBytes(latest.totalBytes) : '');
    addLine(lines, 'Latest changed', latest.changedFileCount);
    addLine(lines, 'Latest tombstones', latest.tombstoneCount);
    addLine(lines, 'Latest digest', latest.manifestDigest || latest.finalManifestDigest);
    if (latest.upload) {
      const latestUploadState = latest.upload.ok
        ? `uploaded ${latest.upload.uploaded ?? latest.upload.completedParts ?? 1}`
        : latest.upload.skipped
          ? `skipped: ${latest.upload.reason || 'not requested'}`
          : `failed: ${latest.upload.error || latest.upload.reason || 'unknown'}`;
      addLine(lines, 'Latest upload', latestUploadState);
    }
  }

  if (payload.verifiedFiles !== undefined) addLine(lines, 'Verified files', payload.verifiedFiles);
  if (payload.failedFiles !== undefined) addLine(lines, 'Failed files', payload.failedFiles);
  if (payload.restoredFiles !== undefined) addLine(lines, 'Restored files', payload.restoredFiles);
  if (payload.out) addLine(lines, 'Restore output', payload.out);
  if (payload.error) addLine(lines, 'Error', payload.error);

  const links = [];
  addLink(links, 'Receipt', payload.receiptPath);
  addLink(links, 'Latest receipt', latest?.receiptPath);
  addLink(links, 'Restore kit', payload.restoreKitPath || payload.currentRestoreKitPath);
  addLink(links, 'Latest restore kit', latest?.restoreKitPath || latest?.currentRestoreKitPath);
  addLink(links, 'Current manifest', payload.currentManifestPath);
  addLink(links, 'Latest manifest', latest?.currentManifestPath);
  addLink(links, 'Config', payload.configPath);
  addLink(links, 'Env file', payload.envFile);
  addLink(links, 'Vault API', payload.vaultUrl || payload.upload?.vaultApi);
  if (links.length) lines.push('', terminalColor('Links', '34;1'), ...links);

  const next = payload.next || {};
  const commands = [next.status, next.watch, next.restore].filter(Boolean);
  if (commands.length) {
    lines.push('', terminalColor('Next commands', '33;1'));
    for (const commandText of commands) lines.push(commandText);
  }

  if (payload.warning) lines.push('', `Note: ${payload.warning}`);
  if (!ok && !payload.error) lines.push('', 'Run again with --json for the full machine receipt.');
  return `${lines.join('\n')}\n`;
}

function respond(payload, status = 0) {
  if (jsonMode) console.log(JSON.stringify(payload, null, 2));
  else if (typeof payload === 'string') console.log(payload);
  else console.log(humanizePayload(payload, status));
  process.exitCode = status;
}

function helpCommand() {
  const text = `${PRODUCT_TITLE} ${VERSION}

Usage:
  node bin/skyevault-agent.mjs <command> [options]

Commands:
  doctor    Check local Node, tar, git, config, and required environment.
  init      Save workspace, repo path, SkyeVault URL, and env variable names.
  auto-install
            Write the env file, configure the repo, run doctor, run first sync,
            and optionally install the background watcher service.
  status    Show current workspace config and last known custody state.
  snapshot  Legacy: create an encrypted full repo custody artifact.
  sync      Update one mutable encrypted current mirror. No delta packs by default.
  watch     Run sync on an interval so the vault stays current.
  verify    Decrypt and inspect a receipt-backed artifact without restoring it.
  restore   Restore from a mutable current receipt, or from legacy full/delta receipts.

Common options:
  --repo=/path/to/repo
  --workspace=<workspace-id>
  --vault-url=https://your-skyevault-origin
  --upload
  --json
  --skip-deps
  --passphrase-env=SKYEVAULT_AGENT_PASSPHRASE
  --portal-key-env=SKYEVAULT_PORTAL_KEY
  --bearer-env=SKYEVAULT_GATE_BEARER
  --env-file=~/.config/skyevault-agent/skyevault-agent.env
  --service=auto|none|systemd|launchd
  --no-first-sync
  --no-upload

Buyer upload auth:
  SKYEVAULT_PORTAL_KEY is the paid workspace upload key.
  SKYEVAULT_GATE_BEARER is optional and only adds the shared 0S/FS27/SkyGate bearer lane.

Restore example:
  node bin/skyevault-agent.mjs restore --receipt=/path/current-receipt.json --out=/tmp/restored-repo`;

  respond(jsonMode ? {
    ok: true,
    schema: 'skyevault.agent.help.v1',
    version: VERSION,
    commands: COMMANDS,
    product: PRODUCT_TITLE,
    text
  } : text);
}

function versionCommand() {
  respond(jsonMode ? {
    ok: true,
    schema: 'skyevault.agent.version.v1',
    version: VERSION
  } : VERSION);
}

function cleanSlug(value, fallback = 'workspace') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 120) || fallback;
}

function loadConfig() {
  return readJson(configPath, {});
}

function truthy(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function shellSingleQuote(value) {
  return `'${String(value || '').replace(/'/g, `'\\''`)}'`;
}

function envFilePath() {
  return path.resolve(argValue(
    '--env-file',
    process.env.SKYEVAULT_AGENT_ENV_FILE || path.join(homeDir, '.config', 'skyevault-agent', 'skyevault-agent.env')
  ));
}

function buildConfig({
  workspaceId = cleanSlug(argValue('--workspace', process.env.SKYEVAULT_WORKSPACE_ID || 'customer-workspace')),
  repoPath = path.resolve(argValue('--repo', process.env.SKYEVAULT_REPO_PATH || process.cwd())),
  vaultUrl = String(argValue('--vault-url', process.env.SKYEVAULT_DROP_URL || 'https://skyevault-drop.graylondonskyes.workers.dev')).replace(/\/+$/, ''),
  intervalSeconds = Number(argValue('--interval-seconds', process.env.SKYEVAULT_AGENT_INTERVAL_SECONDS || '600')) || 600,
  createdAt = new Date().toISOString()
} = {}) {
  return {
    schema: 'skyevault.agent.config.v1',
    version: VERSION,
    workspaceId: cleanSlug(workspaceId),
    repoPath: path.resolve(repoPath),
    vaultUrl,
    intervalSeconds,
    portalKeyEnv: argValue('--portal-key-env', 'SKYEVAULT_PORTAL_KEY'),
    bearerEnv: argValue('--bearer-env', 'SKYEVAULT_GATE_BEARER'),
    passphraseEnv: argValue('--passphrase-env', 'SKYEVAULT_AGENT_PASSPHRASE'),
    custodyModel: 'mutable-current-mirror',
    literalRepoDefault: true,
    createdAt,
    product: PRODUCT_TITLE,
    note: 'Bearer tokens and passphrases are read from environment variables and are not stored here.'
  };
}

function safeCommandResult(name, result) {
  return {
    name,
    ok: result.status === 0,
    status: result.status,
    stdoutTail: String(result.stdout || '').slice(-1200),
    stderrTail: String(result.stderr || '').slice(-1200)
  };
}

function gitValue(repoPath, gitArgs, fallback = '') {
  const result = spawnSync('git', gitArgs, { cwd: repoPath, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : fallback;
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function sha256FileSync(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function nowStamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeRelPath(relPath) {
  const clean = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean === '.' || clean.includes('\0')) throw new Error(`Unsafe relative path: ${relPath}`);
  const normalized = path.posix.normalize(clean);
  if (normalized === '..' || normalized.startsWith('../') || path.isAbsolute(normalized)) throw new Error(`Unsafe relative path: ${relPath}`);
  return normalized;
}

function safeJoin(root, relPath) {
  const target = path.resolve(root, safeRelPath(relPath));
  if (!isInside(target, path.resolve(root))) throw new Error(`Refusing to write outside restore root: ${relPath}`);
  return target;
}

function collectManifest(repoPath, outputRoot, skipDeps, includeHashes = true) {
  const files = [];
  const skipped = [];
  let totalBytes = 0;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const rel = path.relative(repoPath, file).split(path.sep).join('/');
      if (isInside(file, outputRoot) || rel === '.skyevault-agent' || rel.startsWith('.skyevault-agent/')) {
        skipped.push({ path: rel, reason: 'agent-output' });
        continue;
      }
      if (rel === '.skyevault-out' || rel.startsWith('.skyevault-out/')) {
        skipped.push({ path: rel, reason: 'local-skyevault-output' });
        continue;
      }
      if (skipDeps && (rel === 'node_modules' || rel.includes('/node_modules/'))) {
        skipped.push({ path: rel, reason: 'skip-deps' });
        continue;
      }
      if (entry.isSymbolicLink()) {
        skipped.push({ path: rel, reason: 'symlink' });
        continue;
      }
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = fs.statSync(file);
      const row = { path: rel, bytes: stat.size, mtimeMs: Math.floor(stat.mtimeMs) };
      if (includeHashes) row.sha256 = sha256FileSync(file);
      files.push(row);
      totalBytes += stat.size;
    }
  }

  walk(repoPath);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped, totalBytes };
}

function manifestDigest(manifest) {
  const hash = crypto.createHash('sha256');
  for (const file of manifest.files || []) {
    hash.update(`${file.path}\0${file.bytes}\0${file.sha256 || ''}\0${file.mtimeMs || ''}\n`);
  }
  return hash.digest('hex');
}

function workspaceRoot(workspaceId) {
  return path.join(agentRoot, 'workspaces', cleanSlug(workspaceId));
}

function statePath(workspaceId) {
  return path.join(workspaceRoot(workspaceId), 'state.json');
}

function loadState(workspaceId) {
  return readJson(statePath(workspaceId), {});
}

function saveState(workspaceId, state) {
  writeJson(statePath(workspaceId), state);
}

function tarExcludes(repoPath, outputRoot, skipDeps) {
  const excludes = [
    '--exclude=.skyevault-agent',
    '--exclude=.skyevault-out'
  ];
  const relOut = path.relative(repoPath, outputRoot).split(path.sep).join('/');
  if (relOut && !relOut.startsWith('..')) excludes.push(`--exclude=${relOut}`);
  if (skipDeps) excludes.push('--exclude=node_modules');
  return excludes;
}

function makeTar(repoPath, outputRoot, stamp, skipDeps) {
  const tarPath = path.join(outputRoot, `repo-${stamp}.tar`);
  const tarArgs = [
    ...tarExcludes(repoPath, outputRoot, skipDeps),
    '-cf',
    tarPath,
    '-C',
    repoPath,
    '.'
  ];
  const result = spawnSync('tar', tarArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`tar failed: ${result.stderr || result.stdout || result.status}`);
  }
  return tarPath;
}

function makeTarFromDirectory(sourceDir, outputRoot, stamp, label = 'bundle') {
  const tarPath = path.join(outputRoot, `${label}-${stamp}.tar`);
  const result = spawnSync('tar', ['-cf', tarPath, '-C', sourceDir, '.'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`tar failed: ${result.stderr || result.stdout || result.status}`);
  }
  return tarPath;
}

function passphraseForRun() {
  const envName = argValue('--passphrase-env', 'SKYEVAULT_AGENT_PASSPHRASE');
  const fromEnv = String(process.env[envName] || '').trim();
  if (fromEnv) return { value: fromEnv, source: `env:${envName}`, envName, generated: false };
  return { value: crypto.randomBytes(36).toString('base64url'), source: 'generated-local-unlock-file', envName, generated: true };
}

async function encryptFile(input, output, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase.value, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  await new Promise((resolve, reject) => {
    const read = fs.createReadStream(input);
    const write = fs.createWriteStream(output, { mode: 0o600 });
    read.on('error', reject);
    write.on('error', reject);
    write.on('finish', resolve);
    read.pipe(cipher).pipe(write);
  });
  const tag = cipher.getAuthTag();
  return {
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: tag.toString('hex'),
    passphraseSource: passphrase.source
  };
}

function initCommand() {
  const config = buildConfig();
  writeJson(configPath, config);
  respond({
    ok: true,
    action: 'configured',
    product: PRODUCT_TITLE,
    version: VERSION,
    workspaceId: config.workspaceId,
    repoPath: config.repoPath,
    vaultUrl: config.vaultUrl,
    model: config.custodyModel,
    configPath,
    config,
    next: {
      status: 'node bin/skyevault-agent.mjs status',
      watch: `node bin/skyevault-agent.mjs watch --interval-seconds=${config.intervalSeconds} --upload`,
      restore: 'node bin/skyevault-agent.mjs restore --receipt=/path/to/current-receipt.json --out=/path/to/repaired-repo'
    }
  });
}

function writeAgentEnvFile(file, values) {
  const rows = [
    '# Reape0r environment.',
    '# Generated by Reape0r auto-install. Keep this file outside Git.',
    `SKYEVAULT_DROP_URL=${shellSingleQuote(values.SKYEVAULT_DROP_URL)}`,
    `SKYEVAULT_WORKSPACE_ID=${shellSingleQuote(values.SKYEVAULT_WORKSPACE_ID)}`,
    `SKYEVAULT_REPO_PATH=${shellSingleQuote(values.SKYEVAULT_REPO_PATH)}`,
    `SKYEVAULT_PORTAL_KEY=${shellSingleQuote(values.SKYEVAULT_PORTAL_KEY)}`,
    `SKYEVAULT_AGENT_PASSPHRASE=${shellSingleQuote(values.SKYEVAULT_AGENT_PASSPHRASE)}`,
    `SKYEVAULT_GATE_BEARER=${shellSingleQuote(values.SKYEVAULT_GATE_BEARER)}`,
    `SKYEVAULT_AGENT_INTERVAL_SECONDS=${shellSingleQuote(values.SKYEVAULT_AGENT_INTERVAL_SECONDS)}`,
    'SKYEVAULT_AGENT_CUSTODY_MODEL=mutable-current-mirror'
  ];
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${rows.join('\n')}\n`, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}

function installSystemdService({ installDir, envFile, intervalSeconds, dryRun }) {
  const serviceDir = path.join(homeDir, '.config', 'systemd', 'user');
  const servicePath = path.join(serviceDir, 'skyevault-agent.service');
  const serviceBody = `[Unit]
Description=Reape0r autonomous cloud repo mirror
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${installDir}
EnvironmentFile=${envFile}
ExecStart=/usr/bin/env node ${path.join(installDir, 'bin', 'skyevault-agent.mjs')} watch --interval-seconds=${intervalSeconds} --upload
Restart=always
RestartSec=15
NoNewPrivileges=true

[Install]
WantedBy=default.target
`;
  fs.mkdirSync(serviceDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(servicePath, serviceBody, { mode: 0o600 });
  if (dryRun) return { ok: true, mode: 'systemd', servicePath, started: false, dryRun: true };
  const reload = spawnSync('systemctl', ['--user', 'daemon-reload'], { encoding: 'utf8' });
  const enable = reload.status === 0
    ? spawnSync('systemctl', ['--user', 'enable', '--now', 'skyevault-agent.service'], { encoding: 'utf8' })
    : { status: 1, stdout: '', stderr: 'daemon-reload failed' };
  return {
    ok: reload.status === 0 && enable.status === 0,
    mode: 'systemd',
    servicePath,
    started: reload.status === 0 && enable.status === 0,
    reload: safeCommandResult('systemctl --user daemon-reload', reload),
    enable: safeCommandResult('systemctl --user enable --now skyevault-agent.service', enable)
  };
}

function installLaunchdService({ installDir, envFile, intervalSeconds, dryRun }) {
  const launchDir = path.join(homeDir, 'Library', 'LaunchAgents');
  const plistPath = path.join(launchDir, 'com.skyevault.reape0r.plist');
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.skyevault.reape0r</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>bash</string>
    <string>-lc</string>
    <string>set -a; . "${envFile}"; set +a; node "${path.join(installDir, 'bin', 'skyevault-agent.mjs')}" watch --interval-seconds="${intervalSeconds}" --upload</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/reape0r.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/reape0r.err.log</string>
</dict>
</plist>
`;
  fs.mkdirSync(launchDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(plistPath, plist, { mode: 0o600 });
  if (dryRun) return { ok: true, mode: 'launchd', servicePath: plistPath, started: false, dryRun: true };
  const unload = spawnSync('launchctl', ['unload', plistPath], { encoding: 'utf8' });
  const load = spawnSync('launchctl', ['load', '-w', plistPath], { encoding: 'utf8' });
  return {
    ok: load.status === 0,
    mode: 'launchd',
    servicePath: plistPath,
    started: load.status === 0,
    unload: safeCommandResult('launchctl unload', unload),
    load: safeCommandResult('launchctl load -w', load)
  };
}

function installWatcherService({ mode, installDir, envFile, intervalSeconds, dryRun }) {
  const requested = String(mode || 'auto').toLowerCase();
  if (requested === 'none' || requested === 'off') return { ok: true, mode: 'none', skipped: true, reason: 'service_disabled' };
  if (requested === 'systemd' || (requested === 'auto' && process.platform === 'linux')) {
    const probe = spawnSync('systemctl', ['--user', '--version'], { encoding: 'utf8' });
    if (probe.status === 0) return installSystemdService({ installDir, envFile, intervalSeconds, dryRun });
    if (requested === 'systemd') {
      return { ok: false, mode: 'systemd', skipped: false, reason: 'systemctl_user_unavailable', probe: safeCommandResult('systemctl --user --version', probe) };
    }
  }
  if (requested === 'launchd' || (requested === 'auto' && process.platform === 'darwin')) {
    const probe = spawnSync('launchctl', ['version'], { encoding: 'utf8' });
    if (probe.status === 0 || process.platform === 'darwin') return installLaunchdService({ installDir, envFile, intervalSeconds, dryRun });
    if (requested === 'launchd') {
      return { ok: false, mode: 'launchd', skipped: false, reason: 'launchctl_unavailable', probe: safeCommandResult('launchctl version', probe) };
    }
  }
  return { ok: true, mode: requested, skipped: true, reason: 'no_supported_user_service_manager_detected' };
}

function parseJsonMaybe(value) {
  try { return JSON.parse(String(value || '')); } catch { return null; }
}

async function autoInstallCommand() {
  const workspaceId = cleanSlug(argValue('--workspace', process.env.SKYEVAULT_WORKSPACE_ID || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', process.env.SKYEVAULT_REPO_PATH || process.cwd()));
  const vaultUrl = String(argValue('--vault-url', process.env.SKYEVAULT_DROP_URL || 'https://skyevault-drop.graylondonskyes.workers.dev')).replace(/\/+$/, '');
  const intervalSeconds = Number(argValue('--interval-seconds', process.env.SKYEVAULT_AGENT_INTERVAL_SECONDS || '600')) || 600;
  const envFile = envFilePath();
  const installDir = path.resolve(argValue('--install-dir', process.env.SKYEVAULT_AGENT_INSTALL_DIR || path.resolve(new URL('..', import.meta.url).pathname)));
  const serviceMode = argValue('--service', process.env.SKYEVAULT_AGENT_SERVICE_MODE || 'auto');
  const runFirstSync = !flag('--no-first-sync') && truthy(process.env.SKYEVAULT_AGENT_RUN_FIRST_SYNC, true);
  const upload = !flag('--no-upload') && truthy(process.env.SKYEVAULT_AGENT_UPLOAD, true);
  const dryRunService = flag('--dry-run-service') || truthy(process.env.SKYEVAULT_AGENT_DRY_RUN_SERVICE, false);
  const portalKey = String(argValue('--portal-key', process.env.SKYEVAULT_PORTAL_KEY || '') || '');
  const bearer = String(argValue('--gate-bearer', process.env.SKYEVAULT_GATE_BEARER || '') || '');
  let passphrase = String(argValue('--passphrase', process.env.SKYEVAULT_AGENT_PASSPHRASE || '') || '');
  const generatedPassphrase = !passphrase;
  if (!passphrase) passphrase = crypto.randomBytes(36).toString('base64url');

  if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
    throw new Error(`Repo path does not exist or is not a directory: ${repoPath}`);
  }

  const envValues = {
    SKYEVAULT_DROP_URL: vaultUrl,
    SKYEVAULT_WORKSPACE_ID: workspaceId,
    SKYEVAULT_REPO_PATH: repoPath,
    SKYEVAULT_PORTAL_KEY: portalKey,
    SKYEVAULT_AGENT_PASSPHRASE: passphrase,
    SKYEVAULT_GATE_BEARER: bearer,
    SKYEVAULT_AGENT_INTERVAL_SECONDS: String(intervalSeconds)
  };
  writeAgentEnvFile(envFile, envValues);
  Object.assign(process.env, envValues, { SKYEVAULT_AGENT_ENV_FILE: envFile });

  const config = buildConfig({ workspaceId, repoPath, vaultUrl, intervalSeconds });
  writeJson(configPath, config);

  const childEnv = { ...process.env, ...envValues, SKYEVAULT_AGENT_ENV_FILE: envFile };
  const cliPath = new URL(import.meta.url).pathname;
  const doctor = safeCommandResult('doctor', spawnSync(process.execPath, [cliPath, 'doctor', '--json'], {
    cwd: repoPath,
    env: childEnv,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  }));

  let firstSync = { ok: true, skipped: true, reason: 'first_sync_disabled' };
  if (runFirstSync) {
    const syncArgs = [cliPath, 'sync', `--workspace=${workspaceId}`, `--repo=${repoPath}`, '--json'];
    if (upload) syncArgs.push('--upload');
    if (flag('--skip-deps')) syncArgs.push('--skip-deps');
    if (flag('--fast-scan')) syncArgs.push('--fast-scan');
    const result = spawnSync(process.execPath, syncArgs, {
      cwd: repoPath,
      env: childEnv,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20
    });
    const parsed = parseJsonMaybe(result.stdout);
    firstSync = {
      ...safeCommandResult(`sync${upload ? ' --upload' : ''}`, result),
      kind: parsed?.kind || '',
      model: parsed?.model || '',
      receiptPath: parsed?.receiptPath || '',
      restoreKitPath: parsed?.restoreKitPath || '',
      artifactBytes: parsed?.artifact?.bytes || 0,
      upload: parsed?.upload ? { ok: parsed.upload.ok === true, skipped: parsed.upload.skipped === true, reason: parsed.upload.reason || '', fileSize: parsed.upload.fileSize || 0 } : null
    };
  }

  const service = installWatcherService({
    mode: serviceMode,
    installDir,
    envFile,
    intervalSeconds,
    dryRun: dryRunService
  });

  const receipt = {
    ok: doctor.ok && firstSync.ok && service.ok,
    schema: 'skyevault.agent.auto-install-receipt.v1',
    product: PRODUCT_TITLE,
    version: VERSION,
    installedAt: new Date().toISOString(),
    workspaceId,
    repoPath,
    vaultUrl,
    configPath,
    envFile,
    installDir,
    permissions: { envFileMode: '0600', configMode: '0600' },
    secrets: {
      portalKeyStored: Boolean(portalKey),
      bearerStored: Boolean(bearer),
      passphraseStored: true,
      passphraseGenerated: generatedPassphrase,
      rawSecretsPrinted: false
    },
      firstSync,
    service,
    next: {
      status: `node ${cliPath} status`,
      watch: `set -a; . ${shellSingleQuote(envFile)}; set +a; node ${cliPath} watch --interval-seconds=${intervalSeconds} --upload`,
      restore: firstSync.receiptPath ? `node ${cliPath} restore --receipt=${firstSync.receiptPath} --out=/path/to/repaired-repo` : ''
    },
    warning: generatedPassphrase ? 'A local unlock passphrase was generated and written to the env file. Store it somewhere the repo itself cannot lose.' : 'The provided unlock passphrase was written to the env file.'
  };
  const receiptPath = path.join(agentRoot, 'auto-install-receipt.json');
  writeJson(receiptPath, receipt);
  respond({ ...receipt, receiptPath }, receipt.ok ? 0 : 1);
}

function latestReceipt(workspaceId) {
  const latest = path.join(agentRoot, 'workspaces', cleanSlug(workspaceId), 'latest.json');
  return readJson(latest, null);
}

function statusCommand() {
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const latest = latestReceipt(workspaceId);
  respond({
    ok: true,
    schema: 'skyevault.agent.status.v1',
    version: VERSION,
    configured: Boolean(config.workspaceId),
    configPath,
    workspaceId,
    repoPath: argValue('--repo', config.repoPath || process.cwd()),
    vaultUrl: config.vaultUrl || 'https://skyevault-drop.graylondonskyes.workers.dev',
    bearerConfigured: Boolean(process.env[config.bearerEnv || 'SKYEVAULT_GATE_BEARER']),
    portalKeyConfigured: Boolean(process.env[config.portalKeyEnv || 'SKYEVAULT_PORTAL_KEY']),
    latest
  });
}

function readChunk(file, start, end) {
  const length = end - start + 1;
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.allocUnsafe(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, start);
    if (bytesRead !== length) throw new Error(`expected ${length} bytes, got ${bytesRead}`);
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 500) }; }
  if (!response.ok || data.ok === false) throw new Error(data.error || `POST ${url} failed ${response.status}`);
  return data;
}

async function uploadEncryptedArtifact(config, receipt, artifactPath, artifactSha256) {
  const portalKey = process.env[config.portalKeyEnv || 'SKYEVAULT_PORTAL_KEY'] || '';
  const bearer = process.env[config.bearerEnv || 'SKYEVAULT_GATE_BEARER'] || '';
  if (!portalKey) return { ok: false, skipped: true, reason: 'missing_portal_key_env' };

  const baseUrl = String(config.vaultUrl || 'https://skyevault-drop.graylondonskyes.workers.dev').replace(/\/+$/, '');
  const fileName = path.basename(artifactPath);
  const stat = fs.statSync(artifactPath);
  const headers = {
    'x-portal-key': portalKey
  };
  if (bearer) {
    const cleanBearer = bearer.replace(/^Bearer\s+/i, '');
    headers.authorization = /^Bearer\s+/i.test(bearer) ? bearer : `Bearer ${bearer}`;
    headers['x-skye-gate-session'] = cleanBearer;
    headers['x-free99-gate-session'] = cleanBearer;
  }
  const body = {
    clientName: config.clientName || receipt.workspaceId,
    clientEmail: config.clientEmail || '',
    projectName: `${receipt.repoName} ${PRODUCT_NAME} ${receipt.kind === 'current-object' ? 'Current Object' : receipt.kind === 'delta' ? 'Delta' : 'Snapshot'}`,
    clientReference: `skyevault-agent:${receipt.workspaceId}:${receipt.stamp}`,
    assetType: `${PRODUCT_NAME} encrypted repo ${receipt.kind === 'current-object' ? 'current object' : receipt.kind === 'delta' ? 'delta' : 'snapshot'}`,
    notes: receipt.kind === 'current-object'
      ? `Encrypted mutable current mirror object generated by ${PRODUCT_TITLE}.`
      : `Encrypted repo custody artifact generated by ${PRODUCT_TITLE}.`,
    clientRequestId: `skyevault-agent-${receipt.stamp}`,
    submissionId: `skyevault-agent-${receipt.workspaceId}-${receipt.stamp}`,
    workspaceId: receipt.workspaceId,
    repoId: receipt.repoName,
    usageRightsAccepted: true,
    retentionAcknowledged: true,
    portalKey,
    fileName,
    fileSize: stat.size,
    mimeType: 'application/octet-stream',
    fileFingerprint: {
      algorithm: 'SHA-256',
      mode: receipt.kind === 'current-object' ? 'current' : receipt.kind === 'delta' ? 'delta' : 'full',
      value: artifactSha256,
      bytesHashed: stat.size,
      generatedAt: new Date().toISOString()
    },
    submissionFileCount: 1,
    submissionTotalBytes: stat.size,
    archiveFileCount: receipt.fileCount || receipt.changedFileCount || 1
  };
  const session = await postJson(`${baseUrl}/api/upload-session`, body, headers);
  const completedParts = [];
  for (const part of session.parts || []) {
    const chunk = readChunk(artifactPath, part.start, part.end);
    const response = await fetch(part.uploadUrl, { method: 'PUT', body: chunk });
    if (!response.ok) throw new Error(`R2 upload part ${part.partNumber} failed ${response.status}`);
    completedParts.push({
      partNumber: part.partNumber,
      eTag: (response.headers.get('etag') || '').replace(/^"|"$/g, '')
    });
  }
  const completion = await postJson(`${baseUrl}/api/upload-complete`, {
    ...body,
    sessionId: session.sessionId,
    destinationId: session.destination?.id || 'primary',
    destinationName: session.destination?.name || 'primary',
    driveFileId: session.objectKey,
    driveFile: {
      ...(session.r2Object || {}),
      id: session.objectKey,
      key: session.objectKey,
      bucket: session.bucket,
      uploadId: session.uploadId,
      parts: completedParts,
      name: fileName,
      size: String(stat.size),
      mimeType: 'application/octet-stream'
    }
  }, headers);
  return {
    ok: true,
    vaultApi: baseUrl,
    authMode: bearer ? 'portal-key-plus-shared-gate' : 'portal-key',
    sessionId: session.sessionId,
    receiptId: completion.receipt?.id || completion.entry?.id || '',
    completedParts: completedParts.length,
    fileName,
    fileSize: stat.size,
    sha256: artifactSha256
  };
}

function repoMeta(repoPath) {
  return {
    branch: gitValue(repoPath, ['branch', '--show-current'], 'unknown'),
    head: gitValue(repoPath, ['rev-parse', 'HEAD'], 'unknown'),
    dirtyEntries: gitValue(repoPath, ['status', '--short'], '').split(/\r?\n/).filter(Boolean).length,
    repoName: path.basename(repoPath) || 'repo'
  };
}

function writeManifest(outputRoot, receipt, manifest) {
  const manifestPath = path.join(outputRoot, 'manifest.json');
  writeJson(manifestPath, {
    schema: 'skyevault.agent.file-manifest.v1',
    generatedAt: receipt.generatedAt,
    workspaceId: receipt.workspaceId,
    repoPath: receipt.repoPath,
    repoName: receipt.repoName,
    digest: receipt.manifestDigest,
    scanMode: receipt.scanMode,
    files: manifest.files,
    skipped: manifest.skipped
  });
  return manifestPath;
}

function attachUnlockReceipt(outputRoot, receipt, encryptedPath, passphrase) {
  if (passphrase.generated) {
    const unlockPath = path.join(outputRoot, 'unlock.local.json');
    writeJson(unlockPath, {
      schema: 'skyevault.agent.local-unlock.v1',
      generatedAt: receipt.generatedAt,
      artifact: path.basename(encryptedPath),
      passphrase: passphrase.value,
      warning: 'Keep this local. Anyone with this passphrase and the encrypted artifact can decrypt the snapshot.'
    });
    receipt.unlock = { mode: 'generated-local-file', path: unlockPath };
  } else {
    receipt.unlock = { mode: 'environment', env: passphrase.envName };
  }
}

async function writeReceiptAndUpload({ config, workspaceId, outputRoot, receipt, encryptedPath, artifactSha256 }) {
  if (flag('--upload')) {
    try {
      receipt.upload = await uploadEncryptedArtifact(config, receipt, encryptedPath, artifactSha256);
    } catch (error) {
      receipt.upload = { ok: false, error: error.message };
      receipt.ok = false;
    }
  }
  const receiptPath = path.join(outputRoot, `${receipt.kind || 'snapshot'}-receipt.json`);
  writeJson(receiptPath, receipt);
  writeJson(path.join(workspaceRoot(workspaceId), 'latest.json'), { ...receipt, receiptPath });
  return receiptPath;
}

async function snapshotCommand() {
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', config.repoPath || process.cwd()));
  const skipDeps = flag('--skip-deps');
  const includeHashes = !flag('--fast-scan');
  const stamp = nowStamp();
  const outputRoot = path.resolve(argValue('--out', path.join(agentRoot, 'workspaces', workspaceId, 'snapshots', stamp)));
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });

  const manifest = collectManifest(repoPath, outputRoot, skipDeps, includeHashes);
  const digest = manifestDigest(manifest);
  const { branch, head, dirtyEntries, repoName } = repoMeta(repoPath);

  if (flag('--dry-run')) {
    respond({
      ok: true,
      dryRun: true,
      schema: 'skyevault.agent.snapshot-preview.v1',
      workspaceId,
      repoPath,
      repoName,
      fileCount: manifest.files.length,
      totalBytes: manifest.totalBytes,
      skippedCount: manifest.skipped.length,
      branch,
      head,
      dirtyEntries,
      literalRepo: !skipDeps,
      scanMode: includeHashes ? 'sha256' : 'metadata',
      manifestDigest: digest
    });
    return;
  }

  const tarPath = makeTar(repoPath, outputRoot, stamp, skipDeps);
  const passphrase = passphraseForRun();
  const encryptedPath = path.join(outputRoot, `${repoName}-${stamp}.tar.enc`);
  const cryptoMeta = await encryptFile(tarPath, encryptedPath, passphrase);
  fs.rmSync(tarPath, { force: true });
  const encryptedSha256 = await sha256File(encryptedPath);
  const receipt = {
    ok: true,
    schema: 'skyevault.agent.snapshot-receipt.v1',
    version: VERSION,
    kind: 'full',
    stamp,
    generatedAt: new Date().toISOString(),
    workspaceId,
    repoPath,
    repoName,
    branch,
    head,
    dirtyEntries,
    literalRepo: !skipDeps,
    scanMode: includeHashes ? 'sha256' : 'metadata',
    manifestDigest: digest,
    fileCount: manifest.files.length,
    totalBytes: manifest.totalBytes,
    skippedCount: manifest.skipped.length,
    artifact: {
      path: encryptedPath,
      bytes: fs.statSync(encryptedPath).size,
      sha256: encryptedSha256,
      crypto: cryptoMeta
    },
    upload: { ok: false, skipped: true, reason: 'upload_not_requested' }
  };

  receipt.manifestPath = writeManifest(outputRoot, receipt, manifest);
  attachUnlockReceipt(outputRoot, receipt, encryptedPath, passphrase);
  const receiptPath = await writeReceiptAndUpload({ config, workspaceId, outputRoot, receipt, encryptedPath, artifactSha256: encryptedSha256 });
  saveState(workspaceId, {
    schema: 'skyevault.agent.workspace-state.v1',
    updatedAt: receipt.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    latestFullReceiptPath: receiptPath,
    latestReceiptPath: receiptPath,
    latestManifestPath: receipt.manifestPath,
    latestManifestDigest: digest,
    latestKind: 'full'
  });
  respond({ ...receipt, receiptPath });
}

function compareManifest(previousManifest, currentManifest) {
  const previous = new Map((previousManifest.files || []).map((file) => [file.path, file]));
  const current = new Map((currentManifest.files || []).map((file) => [file.path, file]));
  const changed = [];
  const deleted = [];
  for (const file of currentManifest.files || []) {
    const old = previous.get(file.path);
    if (!old || old.bytes !== file.bytes || String(old.sha256 || '') !== String(file.sha256 || '') || (!file.sha256 && old.mtimeMs !== file.mtimeMs)) {
      changed.push(file);
    }
  }
  for (const file of previousManifest.files || []) {
    if (!current.has(file.path)) deleted.push({ path: file.path, bytes: file.bytes || 0, sha256: file.sha256 || '' });
  }
  return { changed, deleted };
}

function currentRoot(workspaceId) {
  return path.join(workspaceRoot(workspaceId), 'current');
}

function currentObjectsRoot(workspaceId) {
  return path.join(currentRoot(workspaceId), 'objects');
}

function currentManifestPath(workspaceId) {
  return path.join(currentRoot(workspaceId), 'manifest.json');
}

function currentRestoreKitPath(workspaceId) {
  return path.join(currentRoot(workspaceId), 'CURRENT_REPO_BACKUP.json');
}

function currentObjectRel(file) {
  const sha = String(file.sha256 || crypto.createHash('sha256').update(`${file.path}:${file.bytes}:${file.mtimeMs}`).digest('hex'));
  const pathSha = crypto.createHash('sha256').update(String(file.path || '')).digest('hex');
  return `objects/${pathSha.slice(0, 2)}/${pathSha}-${sha}.enc`;
}

function mutablePassphraseForRun(workspaceId) {
  const envName = argValue('--passphrase-env', 'SKYEVAULT_AGENT_PASSPHRASE');
  const fromEnv = String(process.env[envName] || '').trim();
  if (fromEnv) return { value: fromEnv, source: `env:${envName}`, envName, generated: false };
  const unlockPath = path.join(currentRoot(workspaceId), 'unlock.local.json');
  const existing = readJson(unlockPath, null);
  if (existing?.passphrase) {
    return { value: String(existing.passphrase), source: `local:${unlockPath}`, envName, generated: true, unlockPath };
  }
  const generated = crypto.randomBytes(36).toString('base64url');
  fs.mkdirSync(path.dirname(unlockPath), { recursive: true, mode: 0o700 });
  writeJson(unlockPath, {
    schema: 'skyevault.agent.current-local-unlock.v1',
    generatedAt: new Date().toISOString(),
    passphrase: generated,
    warning: 'Private mutable current mirror unlock material. Keep outside Git and do not share.'
  });
  return { value: generated, source: `local:${unlockPath}`, envName, generated: true, unlockPath };
}

async function encryptCurrentObject(source, target, passphrase) {
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  return await encryptFile(source, target, passphrase);
}

function currentEntryByPath(manifest) {
  return new Map((manifest?.files || []).map((file) => [file.path, file]));
}

function currentObjectPath(workspaceId, objectRel) {
  return path.join(currentRoot(workspaceId), safeRelPath(objectRel));
}

function cleanupCurrentObjects(workspaceId, keepObjectRels) {
  const objectsRoot = currentObjectsRoot(workspaceId);
  if (!fs.existsSync(objectsRoot)) return { deleted: 0 };
  let deleted = 0;
  const keep = new Set(keepObjectRels);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        try { fs.rmdirSync(file); } catch {}
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(currentRoot(workspaceId), file).split(path.sep).join('/');
      if (!keep.has(rel)) {
        fs.rmSync(file, { force: true });
        deleted += 1;
      }
    }
  }
  walk(objectsRoot);
  return { deleted };
}

async function uploadCurrentMirrorObjects(config, receipt, uploadItems = []) {
  if (!flag('--upload')) return { ok: false, skipped: true, reason: 'upload_not_requested', mode: 'mutable-current-object-upserts' };
  const uploads = [];
  let failed = 0;
  let authMode = '';
  for (const item of uploadItems) {
    try {
      const sha = await sha256File(item.objectPath);
      const uploadReceipt = await uploadEncryptedArtifact(config, {
        ...receipt,
        kind: 'current-object',
        fileCount: 1,
        changedFileCount: 1,
        objectPath: item.path
      }, item.objectPath, sha);
      if (!uploadReceipt.ok) {
        failed += 1;
        uploads.push({ path: item.path, objectRel: item.objectRel, ok: false, skipped: uploadReceipt.skipped || false, reason: uploadReceipt.reason || 'upload_failed' });
        continue;
      }
      authMode ||= uploadReceipt.authMode || '';
      uploads.push({ path: item.path, objectRel: item.objectRel, ok: true, receiptId: uploadReceipt.receiptId || '', fileSize: uploadReceipt.fileSize || 0 });
    } catch (error) {
      failed += 1;
      uploads.push({ path: item.path, objectRel: item.objectRel, ok: false, error: error.message });
    }
  }
  return {
    ok: failed === 0,
    mode: 'mutable-current-object-upserts',
    authMode,
    uploaded: uploads.filter((item) => item.ok).length,
    failed,
    items: uploads.slice(0, 200),
    truncated: uploads.length > 200
  };
}

async function currentSyncCommand() {
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', config.repoPath || process.cwd()));
  const skipDeps = flag('--skip-deps');
  const includeHashes = true;
  const stamp = nowStamp();
  const root = currentRoot(workspaceId);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const previous = readJson(currentManifestPath(workspaceId), { files: [] });
  const currentScanned = collectManifest(repoPath, root, skipDeps, includeHashes);
  const currentDigest = manifestDigest(currentScanned);
  const priorByPath = currentEntryByPath(previous);
  const { changed, deleted } = compareManifest(previous, currentScanned);
  const { branch, head, dirtyEntries, repoName } = repoMeta(repoPath);
  const passphrase = mutablePassphraseForRun(workspaceId);
  const files = [];
  const uploadItems = [];

  if (flag('--dry-run')) {
    respond({
      ok: true,
      dryRun: true,
      schema: 'skyevault.agent.current-sync-preview.v1',
      model: 'mutable-current-mirror',
      workspaceId,
      repoPath,
      repoName,
      branch,
      head,
      dirtyEntries,
      fileCount: currentScanned.files.length,
      totalBytes: currentScanned.totalBytes,
      changedFileCount: changed.length,
      tombstoneCount: deleted.length,
      manifestDigest: currentDigest
    });
    return;
  }

  const changedPaths = new Set(changed.map((file) => file.path));
  for (const file of currentScanned.files) {
    const prior = priorByPath.get(file.path);
    const shouldReuse = prior
      && !changedPaths.has(file.path)
      && prior.objectRel
      && fs.existsSync(currentObjectPath(workspaceId, prior.objectRel));
    if (shouldReuse) {
      files.push({ ...file, objectRel: prior.objectRel, crypto: prior.crypto });
      continue;
    }
    const objectRel = currentObjectRel(file);
    const objectPath = currentObjectPath(workspaceId, objectRel);
    const cryptoMeta = await encryptCurrentObject(safeJoin(repoPath, file.path), objectPath, passphrase);
    const encryptedSha256 = await sha256File(objectPath);
    files.push({
      ...file,
      objectRel,
      encryptedBytes: fs.statSync(objectPath).size,
      encryptedSha256,
      crypto: cryptoMeta
    });
    uploadItems.push({ path: file.path, objectRel, objectPath });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  const keepObjects = files.map((file) => file.objectRel).filter(Boolean);
  const cleanup = cleanupCurrentObjects(workspaceId, keepObjects);
  const generatedAt = new Date().toISOString();
  const manifest = {
    schema: 'skyevault.agent.current-manifest.v1',
    generatedAt,
    version: VERSION,
    model: 'mutable-current-mirror',
    workspaceId,
    repoPath,
    repoName,
    branch,
    head,
    dirtyEntries,
    literalRepo: !skipDeps,
    scanMode: 'sha256',
    digest: currentDigest,
    fileCount: files.length,
    totalBytes: currentScanned.totalBytes,
    skipped: currentScanned.skipped,
    files
  };
  writeJson(currentManifestPath(workspaceId), manifest);

  const receipt = {
    ok: true,
    schema: 'skyevault.agent.current-repo-receipt.v1',
    version: VERSION,
    kind: 'current',
    model: 'mutable-current-mirror',
    action: previous?.digest ? (changed.length || deleted.length ? 'update-current' : 'noop') : 'seed-current',
    stamp,
    generatedAt,
    workspaceId,
    repoPath,
    repoName,
    branch,
    head,
    dirtyEntries,
    literalRepo: !skipDeps,
    scanMode: 'sha256',
    manifestDigest: currentDigest,
    previousManifestDigest: previous?.digest || '',
    changedFileCount: changed.length,
    tombstoneCount: deleted.length,
    fileCount: files.length,
    totalBytes: currentScanned.totalBytes,
    currentManifestPath: currentManifestPath(workspaceId),
    currentRestoreKitPath: currentRestoreKitPath(workspaceId),
    cleanup,
    upload: { ok: false, skipped: true, reason: 'upload_not_requested' },
    unlock: passphrase.generated
      ? { mode: 'generated-local-file', path: passphrase.unlockPath || path.join(currentRoot(workspaceId), 'unlock.local.json') }
      : { mode: 'environment', env: passphrase.envName }
  };

  receipt.upload = await uploadCurrentMirrorObjects(config, receipt, uploadItems);
  if (receipt.upload.ok === false && !receipt.upload.skipped) receipt.ok = false;
  const restoreKit = {
    ok: true,
    schema: 'skyevault.agent.mutable-current-restore-kit.v1',
    createdAt: new Date().toISOString(),
    model: 'mutable-current-mirror',
    workspaceId,
    repoPath,
    repoName,
    digest: currentDigest,
    manifestPath: currentManifestPath(workspaceId),
    receiptPath: '',
    unlock: receipt.unlock,
    restoreCommand: `node bin/skyevault-agent.mjs restore --receipt=${path.join(root, 'current-receipt.json')} --out=/path/to/repaired-repo`
  };
  writeJson(currentRestoreKitPath(workspaceId), restoreKit);
  const receiptPath = path.join(root, 'current-receipt.json');
  writeJson(receiptPath, { ...receipt, restoreKitPath: currentRestoreKitPath(workspaceId) });
  restoreKit.receiptPath = receiptPath;
  writeJson(currentRestoreKitPath(workspaceId), restoreKit);
  writeJson(path.join(workspaceRoot(workspaceId), 'latest.json'), { ...receipt, receiptPath, restoreKitPath: currentRestoreKitPath(workspaceId) });
  saveState(workspaceId, {
    schema: 'skyevault.agent.workspace-state.v1',
    updatedAt: receipt.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    custodyModel: 'mutable-current-mirror',
    latestReceiptPath: receiptPath,
    latestCurrentReceiptPath: receiptPath,
    latestManifestPath: currentManifestPath(workspaceId),
    latestManifestDigest: currentDigest,
    latestKind: 'current',
    currentRestoreKitPath: currentRestoreKitPath(workspaceId)
  });
  respond({ ...receipt, receiptPath, restoreKitPath: currentRestoreKitPath(workspaceId) }, receipt.ok ? 0 : 1);
}

function copyDeltaFiles(repoPath, stageFilesRoot, changed) {
  for (const file of changed) {
    const source = safeJoin(repoPath, file.path);
    const target = safeJoin(stageFilesRoot, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

async function syncCommand() {
  if (!flag('--legacy-delta')) {
    await currentSyncCommand();
    return;
  }
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', config.repoPath || process.cwd()));
  const skipDeps = flag('--skip-deps');
  const includeHashes = !flag('--fast-scan');
  const priorState = loadState(workspaceId);
  if (flag('--full') || flag('--baseline') || !priorState.latestFullReceiptPath || !fs.existsSync(priorState.latestManifestPath || '')) {
    await snapshotCommand();
    return;
  }

  const stamp = nowStamp();
  const outputRoot = path.resolve(argValue('--out', path.join(agentRoot, 'workspaces', workspaceId, 'deltas', stamp)));
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const currentManifest = collectManifest(repoPath, outputRoot, skipDeps, includeHashes);
  const currentDigest = manifestDigest(currentManifest);
  const previousManifest = readJson(priorState.latestManifestPath, { files: [] });
  const { changed, deleted } = compareManifest(previousManifest, currentManifest);
  const { branch, head, dirtyEntries, repoName } = repoMeta(repoPath);

  if (flag('--dry-run') || (changed.length === 0 && deleted.length === 0)) {
    const receipt = {
      ok: true,
      schema: 'skyevault.agent.sync-receipt.v1',
      version: VERSION,
      kind: 'noop',
      dryRun: flag('--dry-run'),
      stamp,
      generatedAt: new Date().toISOString(),
      workspaceId,
      repoPath,
      repoName,
      branch,
      head,
      dirtyEntries,
      scanMode: includeHashes ? 'sha256' : 'metadata',
      manifestDigest: currentDigest,
      baseManifestDigest: priorState.latestManifestDigest || null,
      changedFileCount: changed.length,
      tombstoneCount: deleted.length,
      upload: { ok: false, skipped: true, reason: 'no_changes' }
    };
    const receiptPath = path.join(outputRoot, 'sync-receipt.json');
    writeJson(receiptPath, receipt);
    writeJson(path.join(workspaceRoot(workspaceId), 'latest.json'), { ...receipt, receiptPath });
    respond({ ...receipt, receiptPath });
    return;
  }

  const stageRoot = path.join(outputRoot, 'delta-stage');
  const stageFilesRoot = path.join(stageRoot, 'files');
  fs.mkdirSync(stageFilesRoot, { recursive: true, mode: 0o700 });
  copyDeltaFiles(repoPath, stageFilesRoot, changed);
  const deltaManifest = {
    schema: 'skyevault.agent.delta-manifest.v1',
    generatedAt: new Date().toISOString(),
    workspaceId,
    repoPath,
    repoName,
    baseFullReceiptPath: priorState.latestFullReceiptPath,
    baseReceiptPath: priorState.latestReceiptPath,
    baseManifestDigest: priorState.latestManifestDigest || null,
    nextManifestDigest: currentDigest,
    changed,
    deleted
  };
  writeJson(path.join(stageRoot, 'SKYEVAULT_DELTA_MANIFEST.json'), deltaManifest);

  const tarPath = makeTarFromDirectory(stageRoot, outputRoot, stamp, 'delta');
  fs.rmSync(stageRoot, { recursive: true, force: true });
  const passphrase = passphraseForRun();
  const encryptedPath = path.join(outputRoot, `${repoName}-${stamp}.delta.tar.enc`);
  const cryptoMeta = await encryptFile(tarPath, encryptedPath, passphrase);
  fs.rmSync(tarPath, { force: true });
  const encryptedSha256 = await sha256File(encryptedPath);

  const receipt = {
    ok: true,
    schema: 'skyevault.agent.delta-receipt.v1',
    version: VERSION,
    kind: 'delta',
    stamp,
    generatedAt: deltaManifest.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    branch,
    head,
    dirtyEntries,
    literalRepo: !skipDeps,
    scanMode: includeHashes ? 'sha256' : 'metadata',
    manifestDigest: currentDigest,
    baseManifestDigest: priorState.latestManifestDigest || null,
    baseFullReceiptPath: priorState.latestFullReceiptPath,
    baseReceiptPath: priorState.latestReceiptPath,
    changedFileCount: changed.length,
    tombstoneCount: deleted.length,
    fileCount: changed.length,
    totalBytes: changed.reduce((sum, file) => sum + Number(file.bytes || 0), 0),
    artifact: {
      path: encryptedPath,
      bytes: fs.statSync(encryptedPath).size,
      sha256: encryptedSha256,
      crypto: cryptoMeta
    },
    upload: { ok: false, skipped: true, reason: 'upload_not_requested' }
  };
  receipt.manifestPath = writeManifest(outputRoot, receipt, currentManifest);
  attachUnlockReceipt(outputRoot, receipt, encryptedPath, passphrase);
  const receiptPath = await writeReceiptAndUpload({ config, workspaceId, outputRoot, receipt, encryptedPath, artifactSha256: encryptedSha256 });
  saveState(workspaceId, {
    schema: 'skyevault.agent.workspace-state.v1',
    updatedAt: receipt.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    latestFullReceiptPath: priorState.latestFullReceiptPath,
    latestReceiptPath: receiptPath,
    latestManifestPath: receipt.manifestPath,
    latestManifestDigest: currentDigest,
    latestKind: 'delta'
  });
  respond({ ...receipt, receiptPath });
}

async function watchCommand() {
  const config = loadConfig();
  const intervalSeconds = Number(argValue('--interval-seconds', config.intervalSeconds || '600')) || 600;
  const upload = flag('--upload');
  const stopAfter = Number(argValue('--runs', '0')) || 0;
  let count = 0;
  if (jsonMode) {
    process.stdout.write(JSON.stringify({
      ok: true,
      event: 'watch_started',
      product: PRODUCT_TITLE,
      version: VERSION,
      intervalSeconds,
      upload
    }) + '\n');
  } else {
    process.stdout.write(`${terminalColor(PRODUCT_TITLE, '36;1')}\nWatch started: every ${intervalSeconds}s${upload ? ' with upload enabled' : ''}.\n\n`);
  }
  while (!stopAfter || count < stopAfter) {
    count += 1;
    const childArgs = [flag('--full-every-run') ? 'snapshot' : 'sync'];
    if (jsonMode) childArgs.push('--json');
    if (upload) childArgs.push('--upload');
    if (flag('--legacy-delta')) childArgs.push('--legacy-delta');
    for (const name of ['--workspace', '--repo', '--out', '--passphrase-env']) {
      const value = argValue(name);
      if (value) childArgs.push(`${name}=${value}`);
    }
    if (flag('--skip-deps')) childArgs.push('--skip-deps');
    if (flag('--fast-scan')) childArgs.push('--fast-scan');
    const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname, ...childArgs], { encoding: 'utf8' });
    process.stdout.write(child.stdout || '');
    if (child.stderr) process.stderr.write(child.stderr);
    if (child.status !== 0) process.exitCode = child.status;
    if (stopAfter && count >= stopAfter) break;
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
}

function receiptPathFromArgs() {
  const explicit = argValue('--receipt');
  if (explicit) return path.resolve(explicit);
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const latest = latestReceipt(workspaceId);
  if (latest?.receiptPath) return latest.receiptPath;
  throw new Error('Receipt is required. Pass --receipt=/path/to/*-receipt.json or run init/sync first.');
}

function passphraseForReceipt(receipt) {
  const direct = argValue('--passphrase');
  if (direct) return { value: direct, source: 'argv:--passphrase' };
  const envName = argValue('--passphrase-env', receipt.unlock?.env || 'SKYEVAULT_AGENT_PASSPHRASE');
  const fromEnv = String(process.env[envName] || '').trim();
  if (fromEnv) return { value: fromEnv, source: `env:${envName}` };
  if (receipt.unlock?.mode === 'generated-local-file' && receipt.unlock.path && fs.existsSync(receipt.unlock.path)) {
    const unlock = readJson(receipt.unlock.path, {});
    if (unlock.passphrase) return { value: String(unlock.passphrase), source: `local:${receipt.unlock.path}` };
  }
  throw new Error(`Missing unlock passphrase. Set ${envName} or pass --passphrase-env=<env var>.`);
}

async function decryptFile(input, output, cryptoMeta, passphrase) {
  const salt = Buffer.from(cryptoMeta.salt || '', 'hex');
  const iv = Buffer.from(cryptoMeta.iv || '', 'hex');
  const authTag = Buffer.from(cryptoMeta.authTag || '', 'hex');
  if (!salt.length || !iv.length || !authTag.length) throw new Error('Receipt is missing encryption metadata.');
  const key = crypto.scryptSync(passphrase.value, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  await new Promise((resolve, reject) => {
    const read = fs.createReadStream(input);
    const write = fs.createWriteStream(output, { mode: 0o600 });
    read.on('error', reject);
    write.on('error', reject);
    write.on('finish', resolve);
    read.pipe(decipher).pipe(write);
  });
}

async function decryptReceiptToTar(receipt, tempRoot) {
  const artifactPath = path.resolve(argValue('--artifact', receipt.artifact?.path || ''));
  if (!artifactPath || !fs.existsSync(artifactPath)) throw new Error(`Artifact not found: ${artifactPath}`);
  const expectedSha = receipt.artifact?.sha256 || '';
  const actualSha = await sha256File(artifactPath);
  if (expectedSha && actualSha !== expectedSha) throw new Error(`Artifact SHA mismatch: expected ${expectedSha}, got ${actualSha}`);
  const passphrase = passphraseForReceipt(receipt);
  const tarPath = path.join(tempRoot, `${receipt.kind || 'artifact'}.tar`);
  await decryptFile(artifactPath, tarPath, receipt.artifact?.crypto || {}, passphrase);
  return { tarPath, artifactPath, artifactSha256: actualSha, passphraseSource: passphrase.source };
}

async function verifyCommand() {
  const receiptPath = receiptPathFromArgs();
  const receipt = readJson(receiptPath, null);
  if (receipt?.kind === 'current' || receipt?.schema === 'skyevault.agent.current-repo-receipt.v1') {
    const manifest = readJson(receipt.currentManifestPath || '', null);
    if (!manifest?.files) throw new Error(`Current manifest not found: ${receipt.currentManifestPath || ''}`);
    let verifiedFiles = 0;
    let failedFiles = 0;
    const passphrase = passphraseForReceipt(receipt);
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-current-verify-'));
    try {
      for (const file of manifest.files || []) {
        const objectPath = currentObjectPath(receipt.workspaceId, file.objectRel || '');
        const plainPath = path.join(tempRoot, `${verifiedFiles}.plain`);
        try {
          await decryptFile(objectPath, plainPath, file.crypto || {}, passphrase);
          const sha = await sha256File(plainPath);
          if (file.sha256 && sha !== file.sha256) failedFiles += 1;
          else verifiedFiles += 1;
        } catch {
          failedFiles += 1;
        } finally {
          fs.rmSync(plainPath, { force: true });
        }
      }
      respond({
        ok: failedFiles === 0,
        schema: 'skyevault.agent.current-verify-receipt.v1',
        version: VERSION,
        checkedAt: new Date().toISOString(),
        receiptPath,
        kind: 'current',
        manifestDigest: receipt.manifestDigest || manifest.digest || null,
        verifiedFiles,
        failedFiles
      }, failedFiles === 0 ? 0 : 1);
      return;
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
  if (!receipt?.artifact?.path) throw new Error(`Invalid receipt: ${receiptPath}`);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-verify-'));
  try {
    const decrypted = await decryptReceiptToTar(receipt, tempRoot);
    const listing = spawnSync('tar', ['-tf', decrypted.tarPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
    if (listing.status !== 0) throw new Error(`tar verify failed: ${listing.stderr || listing.stdout || listing.status}`);
    const entries = String(listing.stdout || '').split(/\r?\n/).filter(Boolean);
    respond({
      ok: true,
      schema: 'skyevault.agent.verify-receipt.v1',
      version: VERSION,
      checkedAt: new Date().toISOString(),
      receiptPath,
      kind: receipt.kind || 'unknown',
      artifactPath: decrypted.artifactPath,
      artifactSha256: decrypted.artifactSha256,
      passphraseSource: decrypted.passphraseSource,
      tarEntryCount: entries.length,
      manifestDigest: receipt.manifestDigest || null
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function ensureRestoreRoot(out) {
  const restoreRoot = path.resolve(out);
  if (fs.existsSync(restoreRoot)) {
    const entries = fs.readdirSync(restoreRoot);
    if (entries.length && !flag('--force')) throw new Error(`Restore folder is not empty: ${restoreRoot}. Pass --force to apply anyway.`);
  }
  fs.mkdirSync(restoreRoot, { recursive: true, mode: 0o700 });
  return restoreRoot;
}

function applyDeltaFolder(deltaRoot, restoreRoot) {
  const deltaManifest = readJson(path.join(deltaRoot, 'SKYEVAULT_DELTA_MANIFEST.json'), null);
  if (!deltaManifest) throw new Error('Delta bundle is missing SKYEVAULT_DELTA_MANIFEST.json.');
  const filesRoot = path.join(deltaRoot, 'files');
  for (const tombstone of deltaManifest.deleted || []) {
    const target = safeJoin(restoreRoot, tombstone.path);
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
  }
  for (const file of deltaManifest.changed || []) {
    const source = safeJoin(filesRoot, file.path);
    const target = safeJoin(restoreRoot, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  return {
    changedFileCount: (deltaManifest.changed || []).length,
    tombstoneCount: (deltaManifest.deleted || []).length,
    nextManifestDigest: deltaManifest.nextManifestDigest || null
  };
}

async function restoreCommand() {
  const receiptPath = receiptPathFromArgs();
  const receipt = readJson(receiptPath, null);
  if (receipt?.kind === 'current' || receipt?.schema === 'skyevault.agent.current-repo-receipt.v1') {
    const out = argValue('--out');
    if (!out) throw new Error('Restore output folder is required. Pass --out=/path/to/restore.');
    const restoreRoot = ensureRestoreRoot(out);
    const manifest = readJson(receipt.currentManifestPath || '', null);
    if (!manifest?.files) throw new Error(`Current manifest not found: ${receipt.currentManifestPath || ''}`);
    const passphrase = passphraseForReceipt(receipt);
    let restoredFiles = 0;
    for (const file of manifest.files || []) {
      const objectPath = currentObjectPath(receipt.workspaceId, file.objectRel || '');
      const target = safeJoin(restoreRoot, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await decryptFile(objectPath, target, file.crypto || {}, passphrase);
      restoredFiles += 1;
    }
    respond({
      ok: true,
      schema: 'skyevault.agent.current-restore-receipt.v1',
      version: VERSION,
      restoredAt: new Date().toISOString(),
      receiptPath,
      out: restoreRoot,
      baseKind: 'current',
      restoredFiles,
      finalManifestDigest: receipt.manifestDigest || manifest.digest || null
    });
    return;
  }
  if (!receipt?.artifact?.path) throw new Error(`Invalid receipt: ${receiptPath}`);
  if (receipt.kind === 'delta') throw new Error('Restore must start from a full/baseline receipt. Pass deltas with --delta-receipts=a.json,b.json.');
  const out = argValue('--out');
  if (!out) throw new Error('Restore output folder is required. Pass --out=/path/to/restore.');
  const restoreRoot = ensureRestoreRoot(out);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-restore-'));
  const appliedDeltas = [];
  try {
    const decrypted = await decryptReceiptToTar(receipt, tempRoot);
    const extract = spawnSync('tar', ['-xf', decrypted.tarPath, '-C', restoreRoot], { encoding: 'utf8' });
    if (extract.status !== 0) throw new Error(`tar restore failed: ${extract.stderr || extract.stdout || extract.status}`);
    const deltaReceipts = String(argValue('--delta-receipts', '') || '').split(',').map((item) => item.trim()).filter(Boolean);
    for (const deltaReceiptPath of deltaReceipts) {
      const deltaReceipt = readJson(path.resolve(deltaReceiptPath), null);
      if (!deltaReceipt?.artifact?.path) throw new Error(`Invalid delta receipt: ${deltaReceiptPath}`);
      const deltaTemp = fs.mkdtempSync(path.join(tempRoot, 'delta-'));
      const deltaTar = await decryptReceiptToTar(deltaReceipt, deltaTemp);
      const deltaExtractRoot = path.join(deltaTemp, 'extract');
      fs.mkdirSync(deltaExtractRoot, { recursive: true });
      const deltaExtract = spawnSync('tar', ['-xf', deltaTar.tarPath, '-C', deltaExtractRoot], { encoding: 'utf8' });
      if (deltaExtract.status !== 0) throw new Error(`delta restore failed: ${deltaExtract.stderr || deltaExtract.stdout || deltaExtract.status}`);
      appliedDeltas.push({ receiptPath: path.resolve(deltaReceiptPath), ...applyDeltaFolder(deltaExtractRoot, restoreRoot) });
    }
    respond({
      ok: true,
      schema: 'skyevault.agent.restore-receipt.v1',
      version: VERSION,
      restoredAt: new Date().toISOString(),
      receiptPath,
      out: restoreRoot,
      baseKind: receipt.kind || 'full',
      appliedDeltas,
      finalManifestDigest: appliedDeltas.at(-1)?.nextManifestDigest || receipt.manifestDigest || null
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function doctorCommand() {
  const tar = spawnSync('tar', ['--version'], { encoding: 'utf8' });
  const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
  const config = loadConfig();
  respond({
    ok: tar.status === 0,
    schema: 'skyevault.agent.doctor.v1',
    version: VERSION,
    node: process.version,
    platform: process.platform,
    configPath,
    configured: Boolean(config.workspaceId),
    tar: { ok: tar.status === 0, version: String(tar.stdout || tar.stderr || '').split(/\r?\n/)[0] || '' },
    git: { ok: git.status === 0, version: String(git.stdout || git.stderr || '').trim() || '' },
    env: {
      gateBearer: Boolean(process.env[config.bearerEnv || 'SKYEVAULT_GATE_BEARER']),
      portalKey: Boolean(process.env[config.portalKeyEnv || 'SKYEVAULT_PORTAL_KEY']),
      passphrase: Boolean(process.env[config.passphraseEnv || 'SKYEVAULT_AGENT_PASSPHRASE'])
    }
  }, tar.status === 0 ? 0 : 1);
}

try {
  if (command === 'help') helpCommand();
  else if (command === 'version') versionCommand();
  else if (command === 'init') initCommand();
  else if (command === 'auto-install') await autoInstallCommand();
  else if (command === 'status') statusCommand();
  else if (command === 'snapshot') await snapshotCommand();
  else if (command === 'sync') await syncCommand();
  else if (command === 'watch') await watchCommand();
  else if (command === 'verify') await verifyCommand();
  else if (command === 'restore') await restoreCommand();
  else if (command === 'doctor') doctorCommand();
  else respond({ ok: false, error: `Unknown command: ${command}`, commands: COMMANDS }, 2);
} catch (error) {
  respond({ ok: false, error: error.message, stack: flag('--debug') ? error.stack : undefined }, 1);
}
