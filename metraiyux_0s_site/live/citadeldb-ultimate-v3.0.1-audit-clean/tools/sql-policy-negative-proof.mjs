import { validateSqlForConsole } from '../control-plane/gateway/src/sqlPolicy.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `sql-policy-negative-${stamp}.json`);

const cases = [
  { sql: '', expectOk: false, name: 'empty' },
  { sql: 'select 1', expectOk: true, name: 'select' },
  { sql: 'select 1; select 2', expectOk: false, name: 'multi_statement' },
  { sql: 'drop database citadel', expectOk: false, name: 'drop_database' },
  { sql: 'alter role app_user with password x', expectOk: false, name: 'alter_role' },
  { sql: 'create extension file_fdw', expectOk: false, name: 'create_extension' },
  { sql: 'select pg_sleep(10)', expectOk: false, name: 'pg_sleep' }
];

const results = cases.map(c => {
  const result = validateSqlForConsole(c.sql);
  return { ...c, result, ok: result.ok === c.expectOk };
});

const report = { ok: results.every(r => r.ok), generatedAt: new Date().toISOString(), results, failed: results.filter(r => !r.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
