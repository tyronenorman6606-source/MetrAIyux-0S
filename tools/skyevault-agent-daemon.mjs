#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'status';
const outDir = path.join(repoRoot, '.skyevault-out', 'autosync');
const pidFile = path.join(outDir, 'watch.pid');
const logFile = path.join(outDir, 'watch.log');

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

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function currentPidRecord() {
  const record = readJson(pidFile, null);
  if (record && typeof record === 'object') return record;
  try {
    const pid = Number.parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    return Number.isInteger(pid) ? { pid } : null;
  } catch {
    return null;
  }
}

function manualDaemonCandidates() {
  const result = spawnSync('ps', ['-eo', 'pid,ppid,etime,stat,cmd'], { encoding: 'utf8' });
  return String(result.stdout || '')
    .split(/\r?\n/)
    .filter((line) => /skyevault-autosync|vault:autosync/.test(line) && !/skyevault-agent-daemon/.test(line))
    .slice(0, 12);
}

function status() {
  const record = currentPidRecord();
  const running = pidAlive(Number(record?.pid));
  const candidates = !running || !record?.command ? manualDaemonCandidates() : [];
  console.log(JSON.stringify({
    ok: true,
    schema: 'skyevault.agent-daemon-status.v1',
    running,
    pidFile: path.relative(repoRoot, pidFile),
    logFile: path.relative(repoRoot, logFile),
    pid: Number(record?.pid) || null,
    startedAt: record?.startedAt || '',
    command: record?.command || '',
    manualDaemonCandidates: candidates
  }, null, 2));
}

function start() {
  fs.mkdirSync(outDir, { recursive: true });
  const existing = currentPidRecord();
  if (pidAlive(Number(existing?.pid))) {
    console.log(JSON.stringify({ ok: true, action: 'already-running', pid: Number(existing.pid), pidFile }, null, 2));
    return;
  }

  const envFile = argValue('--env-file', process.env.SKYEVAULT_AUTOSYNC_ENV_FILE || 'env.txt');
  const mode = argValue('--mode', process.env.SKYEVAULT_AUTOSYNC_MODE || 'git+full');
  const interval = argValue('--interval-seconds', process.env.SKYEVAULT_AUTOSYNC_INTERVAL_SECONDS || '600');
  const childArgs = [
    'run',
    'vault:autosync',
    '--',
    `--env-file=${envFile}`,
    `--mode=${mode}`,
    `--interval-seconds=${interval}`,
    '--skip-map'
  ];
  if (args.includes('--deep-scan')) childArgs.push('--deep-scan');
  if (args.includes('--scan-generated')) childArgs.push('--scan-generated');

  const log = fs.openSync(logFile, 'a', 0o600);
  fs.writeSync(log, `\n[agent-daemon] ${new Date().toISOString()} starting mode=${mode} interval=${interval}s envFile=${envFile}\n`);
  const child = spawn('npm', childArgs, {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', log, log],
    env: {
      ...process.env,
      SKYEVAULT_AUTOSYNC_FULL_ARCHIVE_FORMAT: process.env.SKYEVAULT_AUTOSYNC_FULL_ARCHIVE_FORMAT || 'tar.zst',
      SKYEVAULT_AUTOSYNC_FULL_DIRECT_R2: process.env.SKYEVAULT_AUTOSYNC_FULL_DIRECT_R2 || '1',
      SKYEVAULT_AUTOSYNC_ADDITIVE_BASELINE: process.env.SKYEVAULT_AUTOSYNC_ADDITIVE_BASELINE || '1',
      SKYEVAULT_AUTOSYNC_FULL_CHECKPOINT: process.env.SKYEVAULT_AUTOSYNC_FULL_CHECKPOINT || '0',
      SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC: process.env.SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC || '1',
      SKYEVAULT_FULL_REPO_STREAM_UPLOAD_CONCURRENCY: process.env.SKYEVAULT_FULL_REPO_STREAM_UPLOAD_CONCURRENCY || '8',
      SKYEVAULT_FULL_REPO_LITERAL: '1',
      SKYEVAULT_FULL_REPO_ALL_BYTES: '1',
      SKYEVAULT_FULL_REPO_SOURCE_CUSTODY: '0',
      SKYEVAULT_AUTOSYNC_FULL_SOURCE_CUSTODY: '0'
    }
  });
  child.unref();
  writeJson(pidFile, {
    schema: 'skyevault.agent-daemon-pid.v1',
    pid: child.pid,
    startedAt: new Date().toISOString(),
    command: `npm ${childArgs.join(' ')}`
  });
  console.log(JSON.stringify({ ok: true, action: 'started', pid: child.pid, pidFile, logFile, mode, intervalSeconds: Number(interval) }, null, 2));
}

function stop() {
  const record = currentPidRecord();
  const pid = Number(record?.pid);
  if (!pidAlive(pid)) {
    try { fs.unlinkSync(pidFile); } catch {}
    console.log(JSON.stringify({ ok: true, action: 'not-running', pid: pid || null }, null, 2));
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try { process.kill(pid, 'SIGTERM'); } catch {}
  }
  try { fs.unlinkSync(pidFile); } catch {}
  console.log(JSON.stringify({ ok: true, action: 'stopped', pid }, null, 2));
}

if (['start', 'on', 'enable'].includes(command)) start();
else if (['stop', 'off', 'disable'].includes(command)) stop();
else if (command === 'restart') {
  stop();
  start();
} else if (command === 'status') status();
else {
  console.error(`Unknown SkyeVault agent daemon command: ${command}`);
  process.exit(1);
}
