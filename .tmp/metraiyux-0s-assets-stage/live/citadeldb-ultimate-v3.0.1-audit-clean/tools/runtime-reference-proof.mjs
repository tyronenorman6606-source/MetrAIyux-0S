import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `runtime-reference-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');

function handlerFor(method, route) {
  const needle = `app.${method}('${route}'`;
  const idx = server.indexOf(needle);
  if (idx === -1) return '';
  const end = server.indexOf('\napp.', idx + needle.length);
  return server.slice(idx, end === -1 ? server.length : end);
}

const lifecycle = handlerFor('get', '/admin/apps/:appSlug/lifecycle-packet');

const checks = [
  {
    name: 'no_fetchLocalJson_placeholder',
    ok: !server.includes('fetchLocalJson')
  },
  {
    name: 'no_lifecycle_see_endpoint_note',
    ok: !server.includes('See ${path} through dashboard/gateway endpoint')
  },
  {
    name: 'lifecycle_route_found',
    ok: lifecycle.length > 0
  },
  {
    name: 'lifecycle_queries_apps',
    ok: lifecycle.includes('FROM citadel.apps')
  },
  {
    name: 'lifecycle_queries_jobs',
    ok: lifecycle.includes('FROM citadel.operator_jobs')
  },
  {
    name: 'lifecycle_queries_backups',
    ok: lifecycle.includes('FROM citadel.backup_receipts')
  },
  {
    name: 'lifecycle_queries_restores',
    ok: lifecycle.includes('FROM citadel.restore_receipts')
  },
  {
    name: 'lifecycle_queries_audit',
    ok: lifecycle.includes('FROM citadel.audit_events')
  },
  {
    name: 'lifecycle_redacts_packet',
    ok: lifecycle.includes('redactSecrets')
  },
  {
    name: 'no_stale_2_2_version',
    ok: !server.includes("version: '2.2.0'")
  }
];

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
