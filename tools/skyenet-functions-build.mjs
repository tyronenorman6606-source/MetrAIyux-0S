#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const COPY_EXCLUDED_DIRS = new Set([
  '.cache',
  '.git',
  '.skyenet',
  '.wrangler',
  'coverage',
  'node_modules'
]);

const SECRET_KEY_PATTERN = /(secret|token|password|passwd|private|credential|bearer|auth|key)/i;
const CHROOT_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
const NAMESPACE_JAIL_SCRIPT = `
set -eu
rootfs="$1"
workspace="$2"
shift 2
mkdir -p "$rootfs/usr" "$rootfs/etc" "$rootfs/proc" "$rootfs/dev" "$rootfs/tmp" "$rootfs/workspace"
ln -snf usr/bin "$rootfs/bin"
ln -snf usr/lib "$rootfs/lib"
ln -snf usr/lib64 "$rootfs/lib64"
mount --rbind /usr "$rootfs/usr"
mount -o remount,ro,bind "$rootfs/usr" 2>/dev/null || true
mount --rbind /etc "$rootfs/etc"
mount -o remount,ro,bind "$rootfs/etc" 2>/dev/null || true
mount --bind "$workspace" "$rootfs/workspace"
mount -t tmpfs tmpfs "$rootfs/tmp"
mount -t tmpfs tmpfs "$rootfs/dev"
touch "$rootfs/dev/null" "$rootfs/dev/zero" "$rootfs/dev/random" "$rootfs/dev/urandom"
mount --bind /dev/null "$rootfs/dev/null"
mount --bind /dev/zero "$rootfs/dev/zero"
mount --bind /dev/random "$rootfs/dev/random"
mount --bind /dev/urandom "$rootfs/dev/urandom"
mount -t proc proc "$rootfs/proc"
exec /usr/bin/unshare --root="$rootfs" --wd=/workspace -- /usr/bin/env -i "$@"
`;

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(root) {
  try {
    return JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

function packageManagerName(packageJson) {
  const declared = String(packageJson?.packageManager || '').trim().toLowerCase();
  if (declared.startsWith('pnpm@')) return 'pnpm';
  if (declared.startsWith('yarn@')) return 'yarn';
  if (declared.startsWith('bun@')) return 'bun';
  if (declared.startsWith('npm@')) return 'npm';
  return '';
}

export async function detectPackageManager(root, packageJson = null) {
  const pkg = packageJson || await readPackageJson(root);
  const declared = packageManagerName(pkg);
  if (declared) return declared;
  if (await exists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await exists(path.join(root, 'yarn.lock'))) return 'yarn';
  if (await exists(path.join(root, 'bun.lockb')) || await exists(path.join(root, 'bun.lock'))) return 'bun';
  return 'npm';
}

async function installCommand(root, packageManager) {
  if (packageManager === 'pnpm') {
    return await exists(path.join(root, 'pnpm-lock.yaml'))
      ? ['pnpm', ['install', '--frozen-lockfile']]
      : ['pnpm', ['install']];
  }
  if (packageManager === 'yarn') {
    return ['yarn', ['install', '--frozen-lockfile']];
  }
  if (packageManager === 'bun') {
    return await exists(path.join(root, 'bun.lockb')) || await exists(path.join(root, 'bun.lock'))
      ? ['bun', ['install', '--frozen-lockfile']]
      : ['bun', ['install']];
  }
  return await exists(path.join(root, 'package-lock.json')) || await exists(path.join(root, 'npm-shrinkwrap.json'))
    ? ['npm', ['ci']]
    : ['npm', ['install']];
}

function buildCommand(packageManager) {
  if (packageManager === 'pnpm') return ['pnpm', ['run', 'build']];
  if (packageManager === 'yarn') return ['yarn', ['run', 'build']];
  if (packageManager === 'bun') return ['bun', ['run', 'build']];
  return ['npm', ['run', 'build']];
}

function safeCopyFilter(sourceRoot) {
  return (source) => {
    const rel = path.relative(sourceRoot, source).replace(/\\/g, '/');
    if (!rel) return true;
    const parts = rel.split('/');
    if (parts.some((part) => COPY_EXCLUDED_DIRS.has(part))) return false;
    const basename = parts[parts.length - 1] || '';
    if (/^\.env(?:\.|$)/i.test(basename)) return false;
    if (/^(id_rsa|id_dsa|id_ecdsa|id_ed25519|\.npmrc|\.pypirc|\.netrc)$/i.test(basename)) return false;
    if (/\.(pem|key|p12|pfx|crt|sqlite|sqlite3|db)$/i.test(basename)) return false;
    return true;
  };
}

function redactionValues(env = process.env) {
  const values = [];
  for (const [key, value] of Object.entries(env)) {
    if (!SECRET_KEY_PATTERN.test(key)) continue;
    const text = String(value || '');
    if (text.length >= 6) values.push(text);
  }
  return values;
}

function redact(text, secrets) {
  let out = String(text || '');
  for (const secret of secrets) {
    out = out.split(secret).join('[redacted]');
  }
  return out;
}

function scrubbedEnv(jailRoot, options = {}) {
  const chrooted = options.chrooted === true;
  const home = chrooted ? '/workspace/.home' : path.join(jailRoot, '.home');
  const tmp = chrooted ? '/workspace/.tmp' : path.join(jailRoot, '.tmp');
  return {
    CI: 'true',
    HOME: home,
    PATH: chrooted ? CHROOT_PATH : (process.env.PATH || ''),
    TMPDIR: tmp,
    npm_config_audit: 'false',
    npm_config_cache: chrooted ? '/workspace/.npm-cache' : path.join(jailRoot, '.npm-cache'),
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false'
  };
}

function commandLabel(command, args) {
  return [command, ...args].join(' ');
}

function osJailPreference(value = '') {
  const raw = String(value || process.env.SKYENET_FUNCTIONS_OS_JAIL || 'auto').trim().toLowerCase();
  if (/^(0|false|no|off|none|disabled)$/.test(raw)) return 'disabled';
  if (/^(1|true|yes|required|require|strict)$/.test(raw)) return 'required';
  return 'auto';
}

async function namespaceJailCandidate(jailParent, jailRoot, requested) {
  if (requested === 'disabled') {
    return {
      requested,
      mode: 'tempdir-env-only',
      enabled: false,
      reason: 'disabled'
    };
  }
  if (process.platform !== 'linux') {
    return {
      requested,
      mode: 'tempdir-env-only',
      enabled: false,
      reason: 'linux namespaces unavailable on this platform'
    };
  }
  if (!await exists('/usr/bin/unshare')) {
    return {
      requested,
      mode: 'tempdir-env-only',
      enabled: false,
      reason: '/usr/bin/unshare not found'
    };
  }
  return {
    requested,
    mode: 'linux-user-mount-pid-chroot',
    enabled: true,
    command: '/usr/bin/unshare',
    rootfs: path.join(jailParent, 'rootfs'),
    host_workspace: jailRoot,
    chroot_workspace: '/workspace',
    system_mounts: ['/usr:ro', '/etc:ro', '/proc', '/dev:minimal', '/tmp:tmpfs']
  };
}

function namespaceSpawn(command, args, env, isolation) {
  const envPairs = Object.entries(env || {}).map(([key, value]) => `${key}=${String(value ?? '')}`);
  return {
    command: isolation.command || '/usr/bin/unshare',
    args: [
      '-Ur',
      '-m',
      '-p',
      '-f',
      '--kill-child',
      '--propagation',
      'private',
      '--',
      '/usr/bin/sh',
      '-c',
      NAMESPACE_JAIL_SCRIPT,
      'skyenet-functions-os-jail',
      isolation.rootfs,
      isolation.host_workspace,
      ...envPairs,
      command,
      ...args
    ],
    cwd: '/',
    env: { PATH: process.env.PATH || CHROOT_PATH }
  };
}

async function runCommand({ command, args, cwd, env, timeoutMs, secrets, isolation = null }) {
  const startedAt = new Date();
  const started = Date.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  const isolated = isolation?.mode === 'linux-user-mount-pid-chroot';
  const spawnSpec = isolated
    ? namespaceSpawn(command, args, env, isolation)
    : { command, args, cwd, env };

  const child = spawn(spawnSpec.command, spawnSpec.args, {
    cwd: spawnSpec.cwd,
    env: spawnSpec.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 1000).unref?.();
  }, timeoutMs);
  timer.unref?.();

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    if (stdout.length > 12000) stdout = stdout.slice(-12000);
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 12000) stderr = stderr.slice(-12000);
  });

  const result = await new Promise((resolve) => {
    child.on('error', (error) => resolve({ error }));
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);

  const receipt = {
    command: commandLabel(command, args),
    argv: [command, ...args],
    cwd: isolated ? isolation.chroot_workspace : cwd,
    started_at: startedAt.toISOString(),
    duration_ms: Date.now() - started,
    isolation: isolated ? {
      mode: isolation.mode,
      workspace: isolation.chroot_workspace,
      host_workspace: isolation.host_workspace,
      rootfs: isolation.rootfs
    } : {
      mode: isolation?.mode || 'tempdir-env-only'
    },
    timed_out: timedOut,
    exit_code: result.code ?? null,
    signal: result.signal || null,
    stdout_tail: redact(stdout, secrets),
    stderr_tail: redact(stderr, secrets)
  };

  if (result.error || timedOut || result.code !== 0) {
    const detail = result.error?.message || (timedOut ? `timed out after ${timeoutMs}ms` : `exited with ${result.code}`);
    const error = new Error(`Function build command failed: ${receipt.command} ${detail}`);
    error.code = timedOut ? 'SKYENET_FUNCTION_BUILD_TIMEOUT' : 'SKYENET_FUNCTION_BUILD_FAILED';
    error.commandReceipt = receipt;
    throw error;
  }
  return receipt;
}

export async function prepareFunctionBuild(projectRoot, options = {}) {
  const sourceRoot = path.resolve(projectRoot);
  const rawTimeoutMs = Number(options.timeoutMs || process.env.SKYENET_FUNCTIONS_BUILD_TIMEOUT_MS || 120000);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 120000;
  const jailParent = options.jailParent
    ? path.resolve(options.jailParent)
    : await fs.mkdtemp(path.join(os.tmpdir(), 'skyenet-functions-jail-parent-'));
  await fs.mkdir(jailParent, { recursive: true });
  const jailRoot = path.join(jailParent, 'project');
  const receipt = {
    schema: 'skyenet.functions.build-receipt.v1',
    ok: false,
    source_root: sourceRoot,
    jail_root: jailRoot,
    generated_at: new Date().toISOString(),
    timeout_ms: timeoutMs,
    env_policy: {
      scrubbed: true,
      allowlist: ['CI', 'HOME', 'PATH', 'TMPDIR', 'npm_config_audit', 'npm_config_cache', 'npm_config_fund', 'npm_config_update_notifier']
    },
    copy_policy: {
      excluded_dirs: [...COPY_EXCLUDED_DIRS].sort(),
      excluded_secret_files: true
    },
    isolation: {
      requested: osJailPreference(options.osJail),
      mode: 'tempdir-env-only',
      enabled: false
    },
    package_manager: '',
    commands: []
  };

  try {
    await fs.rm(jailRoot, { recursive: true, force: true });
    await fs.cp(sourceRoot, jailRoot, {
      recursive: true,
      dereference: false,
      filter: safeCopyFilter(sourceRoot)
    });
    await fs.mkdir(path.join(jailRoot, '.home'), { recursive: true });
    await fs.mkdir(path.join(jailRoot, '.tmp'), { recursive: true });

    const packageJson = await readPackageJson(jailRoot);
    if (!packageJson) {
      receipt.ok = true;
      receipt.skipped = true;
      receipt.reason = 'no package.json found';
      return { ok: true, buildRoot: jailRoot, jailRoot, receipt };
    }

    const manager = await detectPackageManager(jailRoot, packageJson);
    receipt.package_manager = manager;
    let isolation = await namespaceJailCandidate(jailParent, jailRoot, receipt.isolation.requested);
    if (isolation.enabled) {
      try {
        await runCommand({
          command: '/usr/bin/true',
          args: [],
          cwd: jailRoot,
          env: scrubbedEnv(jailRoot, { chrooted: true }),
          timeoutMs: Math.min(timeoutMs, 5000),
          secrets: [],
          isolation
        });
      } catch (error) {
        if (receipt.isolation.requested === 'required') {
          error.code = 'SKYENET_FUNCTION_OS_JAIL_UNAVAILABLE';
          throw error;
        }
        isolation = {
          requested: receipt.isolation.requested,
          mode: 'tempdir-env-only',
          enabled: false,
          reason: error?.message || 'namespace jail probe failed'
        };
      }
    }
    receipt.isolation = {
      requested: isolation.requested,
      mode: isolation.mode,
      enabled: isolation.enabled === true,
      reason: isolation.reason || '',
      chroot_workspace: isolation.chroot_workspace || '',
      system_mounts: isolation.system_mounts || []
    };
    const env = scrubbedEnv(jailRoot, { chrooted: isolation.enabled === true });
    const secrets = redactionValues();

    const [installBin, installArgs] = await installCommand(jailRoot, manager);
    receipt.commands.push(await runCommand({
      command: installBin,
      args: installArgs,
      cwd: jailRoot,
      env,
      timeoutMs,
      secrets,
      isolation
    }));

    if (packageJson.scripts?.build && options.runBuild !== false) {
      const [buildBin, buildArgs] = buildCommand(manager);
      receipt.commands.push(await runCommand({
        command: buildBin,
        args: buildArgs,
        cwd: jailRoot,
        env,
        timeoutMs,
        secrets,
        isolation
      }));
    }

    receipt.ok = true;
    return { ok: true, buildRoot: jailRoot, jailRoot, receipt };
  } catch (error) {
    receipt.ok = false;
    receipt.error = error?.message || String(error);
    receipt.code = error?.code || 'SKYENET_FUNCTION_BUILD_FAILED';
    if (error?.commandReceipt) receipt.commands.push(error.commandReceipt);
    error.receipt = receipt;
    throw error;
  }
}
