import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `gateway-sql-console-proof-${stamp}.json`);

const gateway = process.env.GATEWAY_BASE_URL || 'http://127.0.0.1:7313';
const token = process.env.GATEWAY_ADMIN_TOKEN || '';
const projectSlug = process.env.CITADEL_PROJECT_SLUG;
const appSlug = process.env.CITADEL_APP_SLUG;
const databaseUrl = process.env.DATABASE_URL;

const report = { ok: false, generatedAt: new Date().toISOString(), checks: [] };

function check(name, ok, data = {}) {
  report.checks.push({ name, ok, ...data });
}

async function post(path, body) {
  try {
    const res = await fetch(`${gateway}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-citadel-team': process.env.CITADEL_TEAM_SLUG || 'proof-team',
        'x-citadel-account': process.env.CITADEL_ACCOUNT_REF || 'proof-account'
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, json };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

if (!projectSlug || !appSlug || !databaseUrl) {
  check('required_env', false, { error: 'CITADEL_PROJECT_SLUG, CITADEL_APP_SLUG, and DATABASE_URL are required.' });
} else {
  check('required_env', true);

  const select = await post(`/admin/self-service/projects/${encodeURIComponent(projectSlug)}/databases/${encodeURIComponent(appSlug)}/sql`, {
    databaseUrl,
    sql: 'select current_database() as database_name, current_user as user_name'
  });
  check('sql_select', select.ok, select);

  const create = await post(`/admin/self-service/projects/${encodeURIComponent(projectSlug)}/databases/${encodeURIComponent(appSlug)}/sql`, {
    databaseUrl,
    sql: 'create table if not exists citadel_gateway_sql_proof (id serial primary key, note text)'
  });
  check('sql_create_table', create.ok, create);

  const insert = await post(`/admin/self-service/projects/${encodeURIComponent(projectSlug)}/databases/${encodeURIComponent(appSlug)}/sql`, {
    databaseUrl,
    sql: "insert into citadel_gateway_sql_proof (note) values ('gateway-proof')"
  });
  check('sql_insert', insert.ok, insert);

  const tables = await post(`/admin/self-service/projects/${encodeURIComponent(projectSlug)}/databases/${encodeURIComponent(appSlug)}/tables`, { databaseUrl });
  check('table_list', tables.ok, tables);

  const preview = await post(`/admin/self-service/projects/${encodeURIComponent(projectSlug)}/databases/${encodeURIComponent(appSlug)}/table-preview`, {
    databaseUrl,
    schema: 'public',
    table: 'citadel_gateway_sql_proof',
    limit: 10
  });
  check('table_preview', preview.ok, preview);
}

report.ok = report.checks.every(c => c.ok);
report.failed = report.checks.filter(c => !c.ok);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
