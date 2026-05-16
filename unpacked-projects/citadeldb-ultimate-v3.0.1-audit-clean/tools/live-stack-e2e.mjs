import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const proofPath = join(root, 'proof', `live-stack-e2e-${stamp}.json`);

const report = {
  ok: false,
  generatedAt: new Date().toISOString(),
  checks: [],
  phases: []
};

function run(name, cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: opts.timeoutMs || 120000, env: { ...process.env, ...opts.env } });
  const phase = { name, command: [cmd, ...args].join(' '), status: res.status, stdout: res.stdout?.slice(-6000), stderr: res.stderr?.slice(-6000), error: res.error?.message };
  report.phases.push(phase);
  return phase;
}

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || 5000);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${process.env.GATEWAY_ADMIN_TOKEN || 'dev-token'}` }
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, json };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function check(name, ok, data = {}) {
  report.checks.push({ name, ok, ...data });
}

function hasDocker() {
  const res = spawnSync('docker', ['--version'], { encoding: 'utf8' });
  return res.status === 0;
}

if (!hasDocker()) {
  check('docker_available', false, { error: 'Docker is not available in this environment. Run this proof on the deployment machine.' });
  report.ok = false;
  writeFileSync(proofPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: false, proof: proofPath.replace(root + '/', ''), failed: report.checks.filter(c => !c.ok) }, null, 2));
  process.exit(2);
}

check('docker_available', true);

run('compose_down_before', 'docker', ['compose', '-f', 'deploy/vps-postgres/docker-compose.yml', 'down', '-v'], { timeoutMs: 120000 });
const up = run('compose_up', 'docker', ['compose', '-f', 'deploy/vps-postgres/docker-compose.yml', 'up', '-d', '--build'], { timeoutMs: 300000 });
check('compose_up_exit_0', up.status === 0, { status: up.status });

await new Promise(r => setTimeout(r, 10000));

const health = await fetchJson('http://127.0.0.1:7313/health');
check('gateway_health_http', health.ok, health);

const setup = await fetchJson('http://127.0.0.1:7313/admin/setup/env-readiness');
check('setup_env_readiness_http', setup.ok, setup);

const protectedRoutes = await fetchJson('http://127.0.0.1:7313/admin/live-gates/protected-routes');
check('protected_routes_http', protectedRoutes.ok && protectedRoutes.json?.guarded >= 5, protectedRoutes);

const project = await fetchJson('http://127.0.0.1:7313/admin/self-service/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
  body: JSON.stringify({ projectSlug: `e2e-${stamp.toLowerCase()}`, projectName: 'E2E Project', ownerRef: 'e2e-account', maxDatabases: 3 })
});
check('create_self_service_project', project.ok, project);

let projectSlug = project.json?.project?.project_slug;
if (projectSlug) {
  const db = await fetchJson(`http://127.0.0.1:7313/admin/self-service/projects/${projectSlug}/databases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
    body: JSON.stringify({ appSlug: 'primary' })
  });
  check('provision_self_service_database', db.ok, { status: db.status, error: db.error, body: db.json ? { ok: db.json.ok, warning: db.json.warning, database: db.json.database, hasConnection: Boolean(db.json.connection?.databaseUrl) } : null });

  const databaseUrl = db.json?.connection?.databaseUrl;
  if (databaseUrl) {
    const sql = await fetchJson(`http://127.0.0.1:7313/admin/self-service/projects/${projectSlug}/databases/${db.json.database.app_slug}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
      body: JSON.stringify({ databaseUrl, sql: 'select current_database() as db, current_user as role_name' })
    });
    check('sql_console_select', sql.ok, { status: sql.status, body: sql.json });

    const tableCreate = await fetchJson(`http://127.0.0.1:7313/admin/self-service/projects/${projectSlug}/databases/${db.json.database.app_slug}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
      body: JSON.stringify({ databaseUrl, sql: 'create table if not exists e2e_smoke (id serial primary key, note text)' })
    });
    check('sql_console_create_table', tableCreate.ok, { status: tableCreate.status, body: tableCreate.json });

    const insert = await fetchJson(`http://127.0.0.1:7313/admin/self-service/projects/${projectSlug}/databases/${db.json.database.app_slug}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
      body: JSON.stringify({ databaseUrl, sql: "insert into e2e_smoke (note) values ('citadel-live-proof')" })
    });
    check('sql_console_insert', insert.ok, { status: insert.status, body: insert.json });

    const tables = await fetchJson(`http://127.0.0.1:7313/admin/self-service/projects/${projectSlug}/databases/${db.json.database.app_slug}/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
      body: JSON.stringify({ databaseUrl })
    });
    check('table_browser_list_tables', tables.ok, { status: tables.status, body: tables.json });

    const preview = await fetchJson(`http://127.0.0.1:7313/admin/self-service/projects/${projectSlug}/databases/${db.json.database.app_slug}/table-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-citadel-team': 'e2e-team', 'x-citadel-account': 'e2e-account' },
      body: JSON.stringify({ databaseUrl, schema: 'public', table: 'e2e_smoke', limit: 10 })
    });
    check('table_browser_preview_rows', preview.ok, { status: preview.status, body: preview.json });
  }
}

const jobs = await fetchJson('http://127.0.0.1:7313/admin/jobs');
check('jobs_endpoint_http', jobs.ok, jobs);

report.ok = report.checks.every(c => c.ok);
report.failed = report.checks.filter(c => !c.ok);
writeFileSync(proofPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: proofPath.replace(root + '/', ''), checks: report.checks.length, failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
