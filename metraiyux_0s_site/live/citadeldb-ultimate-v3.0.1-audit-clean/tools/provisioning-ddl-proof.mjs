import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `provisioning-ddl-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');

function handlerFor(method, route) {
  const needle = `app.${method}('${route}'`;
  const idx = server.indexOf(needle);
  if (idx === -1) return '';
  const end = server.indexOf('\napp.', idx + needle.length);
  return server.slice(idx, end === -1 ? server.length : end);
}

const adminApps = handlerFor('post', '/admin/apps');
const selfService = handlerFor('post', '/admin/self-service/projects/:projectSlug/databases');

const checks = [
  {
    name: 'admin_apps_route_found',
    ok: adminApps.length > 0
  },
  {
    name: 'self_service_route_found',
    ok: selfService.length > 0
  },
  {
    name: 'admin_apps_has_no_begin_before_create_database',
    ok: !(adminApps.indexOf('BEGIN') !== -1 && adminApps.indexOf('BEGIN') < adminApps.indexOf('CREATE DATABASE'))
  },
  {
    name: 'admin_apps_checks_role_exists',
    ok: adminApps.includes('pg_roles')
  },
  {
    name: 'admin_apps_checks_database_exists',
    ok: adminApps.includes('pg_database')
  },
  {
    name: 'admin_apps_uses_sql_literal_password',
    ok: adminApps.includes('sqlLiteral(password)') && !/PASSWORD\s+\$1/i.test(adminApps)
  },
  {
    name: 'self_service_checks_role_exists',
    ok: selfService.includes('pg_roles')
  },
  {
    name: 'self_service_checks_database_exists',
    ok: selfService.includes('pg_database')
  },
  {
    name: 'self_service_uses_sql_literal_password',
    ok: selfService.includes('sqlLiteral(password)') && !/PASSWORD\s+\$1/i.test(selfService)
  },
  {
    name: 'app_credentials_secret_hint_schema_exists',
    ok: readFileSync(join(root, 'migrations/citadel-core/001_base_citadel_core.sql'), 'utf8').includes('secret_hint text')
  }
];

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
