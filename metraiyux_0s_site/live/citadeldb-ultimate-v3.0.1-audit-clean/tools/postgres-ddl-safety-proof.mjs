import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `postgres-ddl-safety-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');

const badPatterns = [
  { name: 'alter_role_password_parameter', pattern: /ALTER ROLE[^`]*PASSWORD\s+\$1/i },
  { name: 'create_role_password_parameter', pattern: /CREATE ROLE[^`]*PASSWORD\s+\$1/i }
];

const checks = badPatterns.map(p => ({ name: p.name, ok: !p.pattern.test(server) }));
checks.push({ name: 'sql_literal_helper_imported', ok: server.includes('sqlLiteral') });
checks.push({ name: 'credential_rotation_receipt_insert', ok: server.includes('INSERT INTO citadel.app_credentials') });

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
