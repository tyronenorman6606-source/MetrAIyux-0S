#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'status';
const settingsPath = path.join(repoRoot, '.skyevault-out', 'autosync-notify-settings.json');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}

function boolFor(commandName, fallback) {
  if (['on', 'enable', 'enabled', 'true', '1'].includes(commandName)) return true;
  if (['off', 'disable', 'disabled', 'false', '0'].includes(commandName)) return false;
  return fallback;
}

const current = readJson(settingsPath, {
  schema: 'skyevault.autosync-notify-settings.v1',
  enabled: false,
  throttleMinutes: 10,
  notifyTo: '',
  source: 'local-cli'
});

if (command === 'status') {
  console.log(JSON.stringify({
    ok: true,
    settingsPath,
    settings: {
      ...current,
      notifyToConfigured: Boolean(current.notifyTo),
      notifyTo: current.notifyTo ? '[configured]' : ''
    }
  }, null, 2));
  process.exit(0);
}

const next = {
  schema: 'skyevault.autosync-notify-settings.v1',
  enabled: boolFor(command, Boolean(current.enabled)),
  throttleMinutes: Number(argValue('--throttle-minutes', current.throttleMinutes || 10)) || 10,
  notifyTo: argValue('--to', current.notifyTo || ''),
  updatedAt: new Date().toISOString(),
  source: 'local-cli'
};

writeJson(settingsPath, next);
console.log(JSON.stringify({
  ok: true,
  settingsPath,
  enabled: next.enabled,
  throttleMinutes: next.throttleMinutes,
  notifyToConfigured: Boolean(next.notifyTo)
}, null, 2));
