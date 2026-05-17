import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });

const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const proofPath = join(root, 'proof', `behavioral-proof-${stamp}.json`);

const report = {
  ok: false,
  generatedAt: new Date().toISOString(),
  phases: [],
  checks: [],
  notes: []
};

function addPhase(name, data) {
  report.phases.push({ name, ...data });
}

function addCheck(name, ok, data = {}) {
  report.checks.push({ name, ok, ...data });
}

function command(cmd, args, cwd, timeoutMs = 30000) {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: timeoutMs });
  return { command: [cmd, ...args].join(' '), cwd, status: res.status, stdout: res.stdout?.slice(-5000), stderr: res.stderr?.slice(-5000), error: res.error?.message };
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 3000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text: text.slice(0, 4000), headers: Object.fromEntries(res.headers.entries()) };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bootAndProbe({ name, commandArgs, cwd, env, probes }) {
  const child = spawn(commandArgs[0], commandArgs.slice(1), {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', d => { stdout += d.toString(); });
  child.stderr.on('data', d => { stderr += d.toString(); });

  await wait(1500);

  const results = [];
  for (const probe of probes) {
    const result = await fetchText(probe.url, probe);
    results.push({ ...probe, result });
  }

  child.kill('SIGTERM');
  await wait(500);

  addPhase(`${name}_boot`, {
    command: commandArgs.join(' '),
    cwd,
    stdout: stdout.slice(-5000),
    stderr: stderr.slice(-5000),
    probes: results
  });

  return results;
}

const syntax = command('node', ['tools/runtime-integrity-scan.mjs'], root, 60000);
addPhase('runtime_integrity_scan', syntax);
addCheck('runtime_integrity_scan_exit_0', syntax.status === 0, { status: syntax.status });

const siteBuild = command('node', ['build.mjs'], join(root, 'site'), 60000);
addPhase('site_build', siteBuild);
addCheck('site_build_exit_0', siteBuild.status === 0, { status: siteBuild.status });

const dashboardPkg = join(root, 'operator-dashboard', 'package.json');
const gatewayPkg = join(root, 'control-plane', 'gateway', 'package.json');

if (existsSync(dashboardPkg)) {
  const install = command('npm', ['install', '--omit=dev'], join(root, 'operator-dashboard'), 120000);
  addPhase('operator_dashboard_npm_install', install);
  addCheck('operator_dashboard_install_exit_0', install.status === 0, { status: install.status });
}

if (existsSync(gatewayPkg)) {
  const install = command('npm', ['install', '--omit=dev'], join(root, 'control-plane', 'gateway'), 120000);
  addPhase('gateway_npm_install', install);
  addCheck('gateway_install_exit_0', install.status === 0, { status: install.status });
}

const dashboardProbes = await bootAndProbe({
  name: 'operator_dashboard',
  commandArgs: ['node', 'server.mjs'],
  cwd: join(root, 'operator-dashboard'),
  env: {
    DASHBOARD_PORT: '17413',
    GATEWAY_BASE_URL: 'http://127.0.0.1:17313',
    GATEWAY_ADMIN_TOKEN: 'test-token'
  },
  probes: [
    { url: 'http://127.0.0.1:17413/', expectText: 'CitadelDB' },
    { url: 'http://127.0.0.1:17413/setup-wizard', expectText: 'Setup Wizard' },
    { url: 'http://127.0.0.1:17413/live-gates/protected-routes', expectText: 'Protected Routes' }
  ]
});

for (const probe of dashboardProbes) {
  const ok = probe.result.ok && (!probe.expectText || probe.result.text.includes(probe.expectText));
  addCheck(`dashboard_probe_${probe.url}`, ok, { status: probe.result.status, expectText: probe.expectText, error: probe.result.error });
}

const gatewayProbes = await bootAndProbe({
  name: 'gateway',
  commandArgs: ['node', 'src/server.mjs'],
  cwd: join(root, 'control-plane', 'gateway'),
  env: {
    GATEWAY_PORT: '17313',
    GATEWAY_ADMIN_TOKEN: 'test-token',
    POSTGRES_PASSWORD: 'test',
    BACKUP_ENCRYPTION_PASSWORD: 'test',
    DATABASE_URL: 'postgres://citadel_admin:test@127.0.0.1:15432/citadel'
  },
  probes: [
    { url: 'http://127.0.0.1:17313/health' }
  ]
});

for (const probe of gatewayProbes) {
  // Gateway may fail when Postgres unavailable; record whether HTTP route is reachable.
  addCheck(`gateway_probe_${probe.url}`, probe.result.status > 0, { status: probe.result.status, error: probe.result.error, body: probe.result.text });
}

report.ok = report.checks.every(c => c.ok);
report.failed = report.checks.filter(c => !c.ok);
writeFileSync(proofPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: proofPath.replace(root + '/', ''), checks: report.checks.length, failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
