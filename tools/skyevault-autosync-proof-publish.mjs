#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const forceNotify = flag('--notify');
const notifyOnly = flag('--notify-only');
const notifyRequested = forceNotify;
const notifyIfEnabled = flag('--notify-if-enabled') || notifyOnly;
const skipStatus = flag('--skip-status') || notifyOnly;
const dryRunEmail = flag('--dry-run-email');

applyEnvFiles();

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function argValues(name) {
  const prefix = `${name}=`;
  return rawArgs.filter((arg) => arg.startsWith(prefix)).map((arg) => arg.slice(prefix.length)).filter(Boolean);
}

function flag(name) {
  return rawArgs.includes(name);
}

function parseEnvFile(file) {
  const values = {};
  if (!file || !fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function expandEnvValue(value, values, depth = 0) {
  if (depth > 8) return value;
  return String(value || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => {
    const replacement = process.env[name] ?? values[name] ?? '';
    return expandEnvValue(replacement, values, depth + 1);
  });
}

function applyEnvFiles() {
  const files = [
    ...String(process.env.SKYEVAULT_AUTOSYNC_ENV_FILE || '').split(path.delimiter).filter(Boolean),
    ...argValues('--env-file')
  ];
  for (const file of files) {
    const resolved = path.isAbsolute(file) ? file : path.resolve(repoRoot, file);
    const parsed = parseEnvFile(resolved);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = expandEnvValue(value, parsed);
      }
    }
  }
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function appendJsonl(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function sha12(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 24,
    ...options
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || '')
  };
}

function parseLastJsonObject(text) {
  const objects = extractJsonObjects(text);
  return objects.length ? objects[objects.length - 1] : null;
}

function extractJsonObjects(text) {
  const objects = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const slice = text.slice(start, i + 1);
        try {
          objects.push(JSON.parse(slice));
        } catch {}
        start = -1;
      }
    }
  }
  return objects;
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return fallback;
  }
}

function statusFromTool() {
  if (skipStatus) return null;
  const args = [path.join(repoRoot, 'tools', 'skyevault-autosync.mjs'), 'status', '--mode=full'];
  for (const file of argValues('--env-file')) args.push(`--env-file=${file}`);
  const result = run(process.execPath, args);
  const parsed = parseLastJsonObject(result.stdout);
  if (parsed?.schema === 'skyevault.autosync-status.v1') return parsed;
  return {
    ok: false,
    error: 'autosync status did not return a parseable status object',
    status: result.status,
    stderr: result.stderr.slice(0, 600)
  };
}

function readTail(file, maxBytes = 1024 * 1024 * 2) {
  try {
    const stat = fs.statSync(file);
    const start = Math.max(0, stat.size - maxBytes);
    const fd = fs.openSync(file, 'r');
    const buffer = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);
    return buffer.toString('utf8');
  } catch {
    return '';
  }
}

function latestUploadSummary() {
  const latest = latestUploadRawSummary();
  if (!latest) return null;
  return {
    receiptId: latest.receiptId,
    artifactBytes: latest.artifactBytes,
    artifactSha256: latest.artifactSha256,
    recoveryUrl: latest.recoveryUrl || '',
    downloadUrlAvailable: Boolean(latest.downloadUrl),
    controlUploadStatus: latest.controlUploadStatus || '',
    controlReceiptId: latest.controlUpload?.receiptId || '',
    controlDownloadUrlAvailable: Boolean(latest.controlUpload?.downloadUrl),
    controlBytes: latest.controlUpload?.bytes || null,
    ledgerEntryCount: latest.controlUpload?.ledgerEntryCount || null
  };
}

function latestDeltaJournalRaw() {
  return readJson(path.join(repoRoot, '.skyevault-out', 'delta-journal', 'latest-receipt.json'), null);
}

function latestDeltaJournalSummary() {
  const latest = latestDeltaJournalRaw();
  if (!latest) return null;
  return {
    ok: Boolean(latest.ok),
    action: latest.action || '',
    completedAt: latest.completedAt || '',
    digest: latest.state?.digest || '',
    branch: latest.state?.branch || '',
    shortHead: latest.state?.shortHead || '',
    changedFileCount: Number(latest.state?.changedFileCount || 0),
    tombstoneCount: Number(latest.state?.tombstoneCount || 0),
    skippedCount: Number(latest.state?.skippedCount || 0),
    packBytes: latest.pack?.packBytes || null,
    packSha256: latest.pack?.packSha256 || '',
    uploadReceiptId: latest.upload?.receiptId || '',
    uploadReceiptAvailable: Boolean(latest.upload?.receiptId),
    downloadUrlAvailable: Boolean(latest.upload?.downloadUrlAvailable)
  };
}

function latestDeltaUploadRawSummary() {
  const latest = latestDeltaJournalRaw();
  const receiptPath = latest?.upload?.receiptPath || '';
  if (!receiptPath) return null;
  const file = path.isAbsolute(receiptPath) ? receiptPath : path.resolve(repoRoot, receiptPath);
  const receipt = readJson(file, null);
  if (!receipt) return null;
  return {
    receiptId: receipt.receiptId || latest.upload?.receiptId || '',
    downloadUrl: receipt.download?.downloadUrl || '',
    recoveryUrl: receipt.download?.recoveryUrl || latest.upload?.recoveryUrl || '',
    expiresAt: receipt.download?.expiresAt || '',
    fileSize: receipt.fileSize || receipt.archive?.bytes || latest.pack?.packBytes || null,
    sha256: receipt.sha256 || receipt.archive?.sha256 || latest.pack?.packSha256 || ''
  };
}

function latestUploadRawSummary() {
  const handoffs = listFullRepoHandoffs()
    .map(summaryFromFullRepoHandoff)
    .filter(Boolean);
  if (handoffs.length) return handoffs[handoffs.length - 1];

  const watchLog = path.join(repoRoot, '.skyevault-out', 'autosync', 'watch.log');
  const manualLogs = listTempUploadLogs();
  const blobs = [readTail(watchLog), ...manualLogs.map((file) => readTail(file, 512 * 1024))].filter(Boolean);
  const summaries = blobs
    .flatMap((text) => extractJsonObjects(text))
    .filter((item) => item && item.ok === true && item.receiptId && item.artifactBytes);
  return summaries[summaries.length - 1] || null;
}

function listFullRepoHandoffs() {
  const files = [];
  const latestDownloadLinks = readJson(path.join(repoRoot, '.skyevault-out', 'autosync', 'latest-full-repo-download-links.json'), null);
  const linkHandoff = latestDownloadLinks?.handoff || '';
  if (linkHandoff) files.push(path.isAbsolute(linkHandoff) ? linkHandoff : path.resolve(repoRoot, linkHandoff));
  if (process.env.SKYEVAULT_FULL_REPO_HANDOFF) {
    files.push(path.isAbsolute(process.env.SKYEVAULT_FULL_REPO_HANDOFF)
      ? process.env.SKYEVAULT_FULL_REPO_HANDOFF
      : path.resolve(repoRoot, process.env.SKYEVAULT_FULL_REPO_HANDOFF));
  }
  try {
    for (const name of fs.readdirSync('/tmp')) {
      if (!name.startsWith('skyevault-full-repo-MetrAIyux-0S-')) continue;
      files.push(path.join('/tmp', name, 'FULL_REPO_SKYDRIVE_HANDOFF.json'));
    }
  } catch {}
  return [...new Set(files)]
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => {
      const aTime = Date.parse(readJson(a, {})?.completedAt || '') || fs.statSync(a).mtimeMs;
      const bTime = Date.parse(readJson(b, {})?.completedAt || '') || fs.statSync(b).mtimeMs;
      return aTime - bTime;
    });
}

function summaryFromFullRepoHandoff(file) {
  const handoff = readJson(file, null);
  const receiptId = handoff?.vault?.entry?.id || handoff?.vault?.receipt?.id || handoff?.receiptId || '';
  const artifactBytes = Number(handoff?.artifact?.bytes || handoff?.vault?.entry?.fileSize || 0);
  const artifactSha256 = handoff?.artifact?.sha256 || handoff?.vault?.entry?.sha256 || '';
  if (!receiptId || !artifactBytes || !artifactSha256) return null;
  return {
    ok: true,
    receiptId,
    artifactBytes,
    artifactSha256,
    artifactName: handoff?.artifact?.fileName || handoff?.vault?.entry?.fileName || '',
    completedAt: handoff?.completedAt || '',
    recoveryUrl: handoff?.recoveryUrl || handoff?.vault?.entry?.recoveryUrl || `${skyeVaultDropOrigin()}/#client-vault`,
    downloadUrl: '',
    controlUploadStatus: handoff?.controlUploadStatus || handoff?.controlUpload?.status || '',
    controlUpload: handoff?.controlUpload ? {
      receiptId: handoff.controlUpload.receiptId || handoff.controlUpload.id || '',
      downloadUrl: '',
      bytes: handoff.controlUpload.bytes || null,
      sha256: handoff.controlUpload.sha256 || '',
      ledgerEntryCount: handoff.controlUpload.ledgerEntryCount || null
    } : null,
    handoffPath: rel(file)
  };
}

function listTempUploadLogs() {
  try {
    return fs.readdirSync('/tmp')
      .filter((name) => name.startsWith('skyevault-full-repo-MetrAIyux-0S-'))
      .map((name) => path.join('/tmp', name, 'full-repo-stream-upload.log'))
      .filter((file) => fs.existsSync(file))
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)
      .slice(-5);
  } catch {
    return [];
  }
}

function daemonStatus() {
  const base = path.join(repoRoot, '.skyevault-out', 'autosync');
  const watchPid = Number.parseInt(String(fs.existsSync(path.join(base, 'watch.pid')) ? fs.readFileSync(path.join(base, 'watch.pid'), 'utf8') : '').trim(), 10);
  const processLock = readJson(path.join(base, 'process.lock'), null);
  const lockPid = Number.parseInt(processLock?.pid, 10);
  return {
    watchPid: Number.isInteger(watchPid) ? watchPid : null,
    watchRunning: pidIsAlive(watchPid),
    activeLock: processLock ? {
      pid: Number.isInteger(lockPid) ? lockPid : null,
      running: pidIsAlive(lockPid),
      command: processLock.command || '',
      startedAt: processLock.startedAt || '',
      host: processLock.host || ''
    } : null,
    lastDaemonLine: readTail(path.join(base, 'watch.log'), 64 * 1024)
      .split(/\r?\n/)
      .filter((line) => line.startsWith('[autosync-daemon]'))
      .pop() || ''
  };
}

function notifySettings() {
  const file = path.join(repoRoot, '.skyevault-out', 'autosync-notify-settings.json');
  const local = readJson(file, {});
  const envEnabled = process.env.SKYEVAULT_AUTOSYNC_NOTIFY;
  const enabled = envEnabled === undefined || envEnabled === ''
    ? Boolean(local.enabled)
    : envFlag('SKYEVAULT_AUTOSYNC_NOTIFY', false);
  return {
    schema: 'skyevault.autosync-notify-settings.v1',
    enabled,
    throttleMinutes: Number(local.throttleMinutes || process.env.SKYEVAULT_AUTOSYNC_NOTIFY_THROTTLE_MINUTES || 10),
    notifyTo: String(local.notifyTo || process.env.SKYEVAULT_AUTOSYNC_NOTIFY_TO || '').trim(),
    source: local.source || (envEnabled ? 'env' : 'local-config'),
    settingsPath: rel(file)
  };
}

function emailRecipients(settings) {
  const raw = settings.notifyTo
    || process.env.SKYEVAULT_AUTOSYNC_NOTIFY_TO
    || process.env.RESEND_TO_EMAIL
    || process.env.NOTIFY_EMAIL_TO
    || process.env.ADMIN_NOTIFY_EMAIL
    || process.env.ADMIN_EMAILS
    || process.env.MAIL_TO
    || process.env.PLATFORM_SCREENSHOT_EMAIL
    || process.env.LEGAL_REVIEW_ADMIN_EMAIL
    || '';
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function emailFrom() {
  return String(process.env.RESEND_FROM_EMAIL || process.env.NOTIFY_EMAIL_FROM || process.env.RESEND_FROM || process.env.MAIL_FROM || '').trim();
}

function configuredUrl(...values) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

function zeroOsOrigin() {
  return configuredUrl(
    process.env.ZERO_OS_PUBLIC_URL,
    process.env.PUBLIC_ADMIN_URL,
    process.env.METRAIYUX_0S_PUBLIC_URL,
    'https://metraiyux-0s-full-system.graylondonskyes.workers.dev'
  ).replace(/\/+$/, '');
}

function skyeVaultDropOrigin() {
  return configuredUrl(
    process.env.SKYEVAULT_DROP_WORKER_URL,
    process.env.SKYEVAULT_DROP_CLOUDFLARE_URL,
    process.env.SKYEVAULT_DROP_URL,
    'https://skyevault-drop.graylondonskyes.workers.dev'
  ).replace(/\/+$/, '');
}

function withReceiptParam(url, receiptId) {
  if (!url || !receiptId) return '';
  return `${url}${url.includes('?') ? '&' : '?'}receipt=${encodeURIComponent(receiptId)}`;
}

function emailLinks(proof) {
  const origin = zeroOsOrigin();
  const latestRaw = latestUploadRawSummary() || {};
  const latestDeltaRaw = latestDeltaUploadRawSummary() || {};
  const vaultDriveUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_VAULT_DRIVE_URL,
    process.env.SKYEVAULT_DRIVE_URL,
    proof.latestUpload?.recoveryUrl,
    `${skyeVaultDropOrigin()}/#client-vault`
  );
  const unlockUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_UNLOCK_URL,
    process.env.SKYEVAULT_UNLOCK_URL,
    `${origin}/skye-secure-secret-packs/app.html`
  );
  const commandCenterUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_COMMAND_CENTER_URL,
    `${origin}/admin/skyevault-command-center.html`
  );
  const proofUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_PROOF_URL,
    `${origin}/proof/skyevault-autosync-proof.html`
  );
  const logoUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_LOGO_URL,
    process.env.METRAIYUX_0S_LOGO_URL,
    `${origin}/assets/metraiyux-0s-emblem-transparent.png`
  );
  const artifactDownloadUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_ARTIFACT_DOWNLOAD_URL,
    latestRaw.downloadUrl
  );
  const controlPackDownloadUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_CONTROL_PACK_URL,
    latestRaw.controlUpload?.downloadUrl
  );
  const deltaJournalDownloadUrl = configuredUrl(
    process.env.SKYEVAULT_AUTOSYNC_DELTA_DOWNLOAD_URL,
    latestDeltaRaw.downloadUrl
  );
  const artifactReceiptUrl = withReceiptParam(vaultDriveUrl, proof.latestUpload?.receiptId || '');
  const controlReceiptUrl = withReceiptParam(vaultDriveUrl, proof.latestUpload?.controlReceiptId || '');
  const deltaReceiptUrl = withReceiptParam(vaultDriveUrl, proof.latestDeltaJournal?.uploadReceiptId || latestDeltaRaw.receiptId || '');
  return {
    proofUrl,
    vaultDriveUrl,
    unlockUrl,
    commandCenterUrl,
    logoUrl,
    artifactDownloadUrl,
    controlPackDownloadUrl,
    deltaJournalDownloadUrl,
    artifactReceiptUrl,
    controlReceiptUrl,
    deltaReceiptUrl
  };
}

function htmlEscape(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[ch]));
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(bytes || 0);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

async function maybeSendEmail(proof, settings) {
  const shouldNotify = notifyRequested || (notifyIfEnabled && settings.enabled);
  if (!shouldNotify) return { ok: true, skipped: true, reason: settings.enabled ? 'notification not requested for this proof publish' : 'notifications disabled' };
  if (!settings.enabled && !notifyRequested) return { ok: true, skipped: true, reason: 'notifications disabled' };

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = emailFrom();
  const to = emailRecipients(settings);
  if (!apiKey || !from || !to.length) {
    return { ok: false, skipped: true, reason: 'RESEND_API_KEY, RESEND_FROM_EMAIL, and recipient are required' };
  }

  const lastFile = path.join(repoRoot, '.skyevault-out', 'autosync-last-email.json');
  const last = readJson(lastFile, null);
  const latest = proof.latestSuccess || {};
  const dedupeKey = `${latest.completedAt || ''}:${latest.digest || ''}:${proof.latestUpload?.receiptId || ''}`;
  if (last?.dedupeKey === dedupeKey) {
    return { ok: true, skipped: true, reason: 'latest autosync success already notified', dedupeKey };
  }
  const throttleMs = Math.max(1, Number(settings.throttleMinutes || 10)) * 60 * 1000;
  if (last?.sentAt && Date.parse(last.sentAt) > Date.now() - throttleMs) {
    return { ok: true, skipped: true, reason: 'notification throttled', dedupeKey };
  }

  const links = emailLinks(proof);
  const subject = `SkyeVault autosync updated ${proof.repo.name}`;
  const optionalTextLinks = [
    links.artifactDownloadUrl ? `Signed artifact download: ${links.artifactDownloadUrl}` : '',
    links.controlPackDownloadUrl ? `Signed control pack download: ${links.controlPackDownloadUrl}` : '',
    links.deltaJournalDownloadUrl ? `Signed delta journal download: ${links.deltaJournalDownloadUrl}` : '',
    links.artifactReceiptUrl ? `Artifact receipt in vault drive: ${links.artifactReceiptUrl}` : '',
    links.controlReceiptUrl ? `Control pack receipt in vault drive: ${links.controlReceiptUrl}` : ''
    ,
    links.deltaReceiptUrl ? `Delta journal receipt in vault drive: ${links.deltaReceiptUrl}` : ''
  ].filter(Boolean);
  const htmlLinks = [
    ['Open proof log', links.proofUrl],
    ['Open vault drive', links.vaultDriveUrl],
    ['Open unlock surface', links.unlockUrl],
    ['Open command center', links.commandCenterUrl],
    links.artifactDownloadUrl ? ['Signed artifact download', links.artifactDownloadUrl] : null,
    links.controlPackDownloadUrl ? ['Signed control pack download', links.controlPackDownloadUrl] : null,
    links.deltaJournalDownloadUrl ? ['Signed delta journal download', links.deltaJournalDownloadUrl] : null,
    links.artifactReceiptUrl ? ['Artifact receipt in vault drive', links.artifactReceiptUrl] : null,
    links.controlReceiptUrl ? ['Control pack receipt in vault drive', links.controlReceiptUrl] : null,
    links.deltaReceiptUrl ? ['Delta journal receipt in vault drive', links.deltaReceiptUrl] : null
  ].filter(Boolean);
  const text = [
    `SkyeVault autosync updated ${proof.repo.name}.`,
    `Completed: ${latest.completedAt || 'not recorded'}`,
    `Branch: ${proof.repo.branch || 'unknown'} @ ${proof.repo.shortHead || 'unknown'}`,
    `Vault receipt: ${proof.latestUpload?.receiptId || 'not parsed yet'}`,
    `Control pack receipt: ${proof.latestUpload?.controlReceiptId || 'not parsed yet'}`,
    `Fast delta journal: ${proof.latestDeltaJournal?.action || 'not recorded'} (${proof.latestDeltaJournal?.changedFileCount ?? 0} changed, ${proof.latestDeltaJournal?.tombstoneCount ?? 0} tombstones)`,
    `Delta journal receipt: ${proof.latestDeltaJournal?.uploadReceiptId || 'not parsed yet'}`,
    `Artifact: ${formatBytes(proof.latestUpload?.artifactBytes || 0)} ${proof.latestUpload?.artifactSha256 || ''}`,
    `Digest: ${latest.digest || 'not recorded'}`,
    `Daemon running: ${proof.daemon.watchRunning ? 'yes' : 'no'}`,
    `Proof: ${links.proofUrl}`,
    `Vault drive: ${links.vaultDriveUrl}`,
    `Unlock surface: ${links.unlockUrl}`,
    `Command center: ${links.commandCenterUrl}`,
    ...optionalTextLinks
  ].join('\n');
  const html = `<div style="font-family:Inter,Arial,sans-serif;background:#050a10;color:#f8fbff;padding:24px;border-radius:18px"><img src="${htmlEscape(links.logoUrl)}" alt="MetrAIyux 0S" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:contain;margin:0 0 16px"><p style="margin:0 0 12px;color:#f3d483;font-weight:800;letter-spacing:.04em;text-transform:uppercase">SkyeVault autosync updated</p><h1 style="font-size:24px;line-height:1.2;margin:0 0 16px">${htmlEscape(proof.repo.name)}</h1><ul style="line-height:1.6"><li>Completed: ${htmlEscape(latest.completedAt || 'not recorded')}</li><li>Branch: ${htmlEscape(proof.repo.branch || 'unknown')} @ ${htmlEscape(proof.repo.shortHead || 'unknown')}</li><li>Vault receipt: <code>${htmlEscape(proof.latestUpload?.receiptId || 'not parsed yet')}</code></li><li>Control pack receipt: <code>${htmlEscape(proof.latestUpload?.controlReceiptId || 'not parsed yet')}</code></li><li>Fast delta journal: ${htmlEscape(proof.latestDeltaJournal?.action || 'not recorded')} (${htmlEscape(proof.latestDeltaJournal?.changedFileCount ?? 0)} changed, ${htmlEscape(proof.latestDeltaJournal?.tombstoneCount ?? 0)} tombstones)</li><li>Delta journal receipt: <code>${htmlEscape(proof.latestDeltaJournal?.uploadReceiptId || 'not parsed yet')}</code></li><li>Artifact: ${htmlEscape(formatBytes(proof.latestUpload?.artifactBytes || 0))}</li><li>Digest: <code>${htmlEscape(latest.digest || 'not recorded')}</code></li><li>Daemon running: ${proof.daemon.watchRunning ? 'yes' : 'no'}</li></ul><p style="line-height:2">${htmlLinks.map(([label, href]) => `<a href="${htmlEscape(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 12px;border-radius:999px;background:#f3d483;color:#07111d;font-weight:800;text-decoration:none">${htmlEscape(label)}</a>`).join('')}</p><p style="color:#b8cae3;font-size:13px">Full mode defaults to encrypted literal all-bytes repo custody. Signed download links appear only in owner/private receipts after the upload lane mints them.</p></div>`;

  if (dryRunEmail) return { ok: true, skipped: true, dryRun: true, toCount: to.length, dedupeKey };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, text, html })
  });
  const data = await response.json().catch(() => ({}));
  const result = {
    ok: response.ok,
    status: response.status,
    id: data.id || '',
    toCount: to.length,
    dedupeKey,
    skipped: false,
    reason: response.ok ? '' : (data.message || data.error || 'Resend request failed')
  };
  const record = {
    schema: 'skyevault.autosync-email.v1',
    sentAt: new Date().toISOString(),
    dedupeKey,
    latestCompletedAt: latest.completedAt || '',
    latestDigest: latest.digest || '',
    receiptId: proof.latestUpload?.receiptId || '',
    result: {
      ok: result.ok,
      status: result.status,
      id: result.id,
      toCount: result.toCount,
      reason: result.reason
    }
  };
  if (result.ok) writeJson(lastFile, record, 0o600);
  appendJsonl(path.join(repoRoot, '.skyevault-out', 'autosync-email-ledger.jsonl'), record, 0o600);
  return result;
}

function publicProofHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Public-safe SkyeVault autosync proof log for the MetrAIyux 0S repo custody lane.">
  <title>SkyeVault Autosync Proof | MetrAIyux 0S</title>
  <link rel="stylesheet" href="../style.css">
  <link rel="icon" type="image/png" href="../favicon-32.png">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="../index.html"><img class="brand-logo floating-logo" src="../assets/metraiyux-0s-emblem-transparent.png" alt="MetrAIyux 0S emblem"><span class="brand-text">MetrAIyux 0S</span></a>
    <nav><a href="index.html">Proof</a><a href="../changelog/index.html">Changelog</a><a href="../admin/skyevault-command-center.html">Vault Command</a></nav>
  </header>
  <main>
    <section class="hero slim">
      <div class="hero-copy">
        <p class="eyebrow">Repo custody heartbeat</p>
        <h1>SkyeVault autosync is the 0S repo continuity proof.</h1>
        <p class="hero-lede">This page is generated by the build proof script from the local autosync receipts. Full mode defaults to encrypted literal all-bytes repo custody; this public surface proves the lane without publishing secrets, passphrases, bearer tokens, object download URLs, or file contents.</p>
      </div>
    </section>
    <section class="section">
      <p class="eyebrow">Current state</p>
      <div id="autosyncProofCards" class="route-grid"></div>
    </section>
    <section class="section">
      <p class="eyebrow">Published log</p>
      <h2>Recent proof entries</h2>
      <div id="autosyncProofLog" class="tool-panel">Loading proof log...</div>
    </section>
  </main>
  <footer><p>Public-safe proof only. Full encrypted literal repo artifacts and control packs stay in SkyeVault/R2 behind the owner recovery lane.</p></footer>
  <script>
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[ch]));
    const fmt = (bytes) => {
      const units = ['B','KB','MB','GB','TB'];
      let size = Number(bytes || 0); let unit = 0;
      while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
      return size.toFixed(size >= 10 || unit === 0 ? 0 : 1) + ' ' + units[unit];
    };
    async function loadProof() {
      const [proof, log] = await Promise.all([
        fetch('skyevault-autosync-proof.json', {cache:'no-store'}).then(r => r.json()),
        fetch('skyevault-autosync-proof-log.json', {cache:'no-store'}).then(r => r.json()).catch(() => ({entries:[]}))
      ]);
      document.getElementById('autosyncProofCards').innerHTML = [
        ['Latest vault success', proof.latestSuccess?.completedAt || 'none', proof.latestSuccess?.digest || ''],
        ['Current repo digest', proof.currentStatus?.digest || 'unknown', proof.parity?.currentDigestMatchesLatestSuccess ? 'covered by latest success' : 'next daemon tick required'],
        ['Encrypted artifact', proof.latestUpload?.receiptId || 'not parsed', fmt(proof.latestUpload?.artifactBytes || 0)],
        ['Fast delta journal', proof.latestDeltaJournal?.action || 'not recorded', (proof.latestDeltaJournal?.changedFileCount ?? 0) + ' changed / ' + (proof.latestDeltaJournal?.tombstoneCount ?? 0) + ' tombstones'],
        ['Daemon', proof.daemon?.watchRunning ? 'running' : 'not running', proof.daemon?.lastDaemonLine || ''],
        ['Local-only critical', proof.currentStatus?.localOnlyCriticalCount ?? 0, 'count only; secret values never published'],
        ['Notification lane', proof.notifications?.enabled ? 'enabled' : 'disabled', proof.notifications?.lastResult?.reason || proof.notifications?.lastResult?.id || '']
      ].map(([title, value, detail]) => '<article class="route-card"><h3>'+esc(title)+'</h3><p><strong>'+esc(value)+'</strong></p><p>'+esc(detail)+'</p></article>').join('');
      const entries = Array.isArray(log.entries) ? log.entries : [];
      document.getElementById('autosyncProofLog').innerHTML = entries.slice().reverse().map((entry) => '<p><strong>'+esc(entry.generatedAt)+'</strong> · '+esc(entry.latestCompletedAt || 'no success')+' · digest '+esc(entry.currentDigest || '').slice(0, 16)+' · receipt '+esc(entry.artifactReceiptId || 'n/a')+'</p>').join('') || 'No entries yet.';
    }
    loadProof().catch((error) => {
      document.getElementById('autosyncProofCards').innerHTML = '<article class="route-card"><h3>Proof unavailable</h3><p>'+esc(error.message)+'</p></article>';
    });
  </script>
  <script src="../script.js"></script>
</body>
</html>
`;
}

function buildProof(status, latestSuccess, settings) {
  const latestUpload = latestUploadSummary();
  const latestDeltaJournal = latestDeltaJournalSummary();
  const daemon = daemonStatus();
  const currentState = status?.state || latestSuccess?.state || {};
  const latestDigest = latestSuccess?.state?.digest || latestSuccess?.digest || '';
  const currentDigest = currentState.digest || '';
  return {
    schema: 'skyevault.autosync-public-proof.v1',
    generatedAt: new Date().toISOString(),
    repo: {
      name: 'MetrAIyux-0S',
      root: 'local-dev-workspace',
      rootHash: sha12(repoRoot),
      branch: currentState.branch || git(['branch', '--show-current'], 'HEAD') || 'HEAD',
      shortHead: currentState.shortHead || git(['rev-parse', '--short', 'HEAD'], ''),
      upstream: currentState.upstream || git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], ''),
      ahead: Number(currentState.ahead || 0),
      behind: Number(currentState.behind || 0)
    },
    currentStatus: {
      ok: status?.ok !== false,
      checkedAt: status?.checkedAt || null,
      dirty: Boolean(currentState.dirty),
      statusCounts: currentState.statusCounts || {},
      digest: currentDigest,
      scanMode: currentState.scanMode || latestSuccess?.state?.boundary?.scanMode || '',
      scannedFiles: currentState.scannedFiles || latestSuccess?.state?.boundary?.scannedFiles || null,
      localOnlyCriticalCount: Number(currentState.localOnlyCriticalCount || 0),
      secretLikeTotal: Number(currentState.secretLikeTotal || latestSuccess?.state?.boundary?.secretLikeTotal || 0)
    },
    latestSuccess: latestSuccess ? {
      ok: Boolean(latestSuccess.ok),
      completedAt: latestSuccess.completedAt || '',
      startedAt: latestSuccess.startedAt || '',
      mode: latestSuccess.mode || '',
      digest: latestDigest,
      plannedModes: latestSuccess.plannedModes || [],
      statusCounts: latestSuccess.state?.statusCounts || {},
      durationMs: latestSuccess.runs?.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) || 0
    } : null,
    latestUpload,
    latestDeltaJournal,
    daemon,
    parity: {
      latestSuccessExists: Boolean(latestSuccess?.ok),
      currentDigestMatchesLatestSuccess: Boolean(currentDigest && latestDigest && currentDigest === latestDigest),
      nextDaemonTickRequired: Boolean(currentDigest && latestDigest && currentDigest !== latestDigest),
      intervalSeconds: Number(status?.intervalSeconds || process.env.SKYEVAULT_AUTOSYNC_INTERVAL_SECONDS || 600),
      fastDeltaJournalEnabled: Boolean(status?.deltaJournal?.enabled ?? latestDeltaJournal)
    },
    custodyContract: {
      mode: 'encrypted literal full-repo custody by default',
      archiveDefault: 'tar.zst.enc',
      deltaCommand: 'npm run vault:delta:upload -- --env-file=env.txt',
      fullCommand: 'npm run vault:repo:full -- --env-file=env.txt --archive-format=tar.zst --literal-full --direct-r2',
      sourceCustodyOptInCommand: 'SKYEVAULT_AUTOSYNC_FULL_SOURCE_CUSTODY=1 npm run vault:autosync:dry-run -- --env-file=env.txt --mode=full --source-custody',
      fastLane: 'encrypted delta journal runs before the heavier full snapshot to seal changed/untracked/local-critical files and tombstones faster',
      includes: ['literal repo tree under workspace root', '.git', 'tracked source', 'untracked source', 'ignored dependency/build/media/state folders that live inside the repo', 'root env/config files', 'local-only critical files', 'secret-like files inside encrypted artifact'],
      sourceCustodyFilteredModeExcludes: ['node_modules', 'build outputs', 'wrangler/netlify caches', 'test artifacts', 'large production media extensions', 'self-generated autosync proof files from the digest trigger'],
      encryption: 'openssl aes-256-cbc pbkdf2 before Cloudflare R2 upload',
      publicProofBoundary: 'This file publishes counts, digests, receipt IDs, and status only; it never publishes bearer tokens, passphrases, peppers, file bodies, or signed download URLs.'
    },
    notifications: {
      enabled: Boolean(settings.enabled),
      throttleMinutes: settings.throttleMinutes,
      settingsPath: settings.settingsPath,
      lastResult: null
    }
  };
}

function generateProjectManifest() {
  const script = path.join(repoRoot, 'tools', 'skyevault-project-manifest.mjs');
  const result = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16
  });
  const parsed = parseLastJsonObject(result.stdout);
  return {
    ok: result.status === 0 && parsed?.ok === true,
    status: result.status,
    outputPath: parsed?.outputPath || 'metraiyux_0s_site/proof/repo-vault-project-manifest.json',
    safe_browser_entry_count: parsed?.safe_browser_entry_count ?? null,
    private_entry_count: parsed?.private_entry_count ?? null,
    skipped_entry_count: parsed?.skipped_entry_count ?? null,
    directory_count: parsed?.directory_count ?? null,
    error: result.status === 0 ? '' : String(result.stderr || '').slice(0, 1000)
  };
}

async function main() {
  const settings = notifySettings();
  const latestSuccess = readJson(path.join(repoRoot, '.skyevault-out', 'autosync', 'latest-success.json'), null);
  const status = statusFromTool();
  const proof = buildProof(status, latestSuccess, settings);
  const emailResult = await maybeSendEmail(proof, settings);
  proof.notifications.lastResult = {
    ok: emailResult.ok,
    skipped: Boolean(emailResult.skipped),
    status: emailResult.status || null,
    id: emailResult.id || '',
    reason: emailResult.reason || '',
    toCount: emailResult.toCount || 0,
    dryRun: Boolean(emailResult.dryRun)
  };

  if (!notifyOnly) {
    const proofFile = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'skyevault-autosync-proof.json');
    const logFile = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'skyevault-autosync-proof-log.json');
    const htmlFile = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'skyevault-autosync-proof.html');
    writeJson(proofFile, proof, 0o644);
    const existing = readJson(logFile, { schema: 'skyevault.autosync-public-proof-log.v1', entries: [] });
    const entries = Array.isArray(existing.entries) ? existing.entries : [];
    entries.push({
      generatedAt: proof.generatedAt,
      latestCompletedAt: proof.latestSuccess?.completedAt || '',
      currentDigest: proof.currentStatus.digest || '',
      latestDigest: proof.latestSuccess?.digest || '',
      parity: proof.parity.currentDigestMatchesLatestSuccess ? 'covered' : 'pending-next-tick',
      artifactReceiptId: proof.latestUpload?.receiptId || '',
      artifactBytes: proof.latestUpload?.artifactBytes || null,
      deltaJournal: proof.latestDeltaJournal ? {
        action: proof.latestDeltaJournal.action,
        completedAt: proof.latestDeltaJournal.completedAt,
        changedFileCount: proof.latestDeltaJournal.changedFileCount,
        tombstoneCount: proof.latestDeltaJournal.tombstoneCount,
        uploadReceiptId: proof.latestDeltaJournal.uploadReceiptId || ''
      } : null,
      daemonRunning: proof.daemon.watchRunning,
      statusCounts: proof.currentStatus.statusCounts,
      localOnlyCriticalCount: proof.currentStatus.localOnlyCriticalCount,
      notification: proof.notifications.lastResult
    });
    writeJson(logFile, {
      schema: 'skyevault.autosync-public-proof-log.v1',
      updatedAt: proof.generatedAt,
      entries: entries.slice(-60)
    }, 0o644);
    fs.writeFileSync(htmlFile, publicProofHtml(), { mode: 0o644 });
    proof.projectManifest = generateProjectManifest();
    writeJson(proofFile, proof, 0o644);
  }

  console.log(JSON.stringify({
    ok: true,
    notifyOnly,
    generatedAt: proof.generatedAt,
    latestCompletedAt: proof.latestSuccess?.completedAt || null,
    parity: proof.parity,
    latestUpload: proof.latestUpload,
    projectManifest: proof.projectManifest || null,
    notifications: proof.notifications.lastResult,
    proofPath: notifyOnly ? null : 'metraiyux_0s_site/proof/skyevault-autosync-proof.json'
  }, null, 2));
}

await main();
