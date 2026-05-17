import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `mutating-route-audit-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');
const contract = JSON.parse(readFileSync(join(root, 'control-plane/gateway/route-contract.json'), 'utf8'));

const adminMutations = contract.routes.filter(r => r.path.startsWith('/admin/') && r.mutating);
const checks = [
  { name: 'admin_mutations_exist', ok: adminMutations.length > 0, count: adminMutations.length },
  { name: 'global_admin_mutation_audit_middleware', ok: server.includes("admin_mutation_request") && server.includes("app.use('/admin', requireAdmin") },
  { name: 'global_admin_mutation_audit_inserts_audit_events', ok: server.includes('INSERT INTO citadel.audit_events') && server.includes('admin_mutation_request') },
  { name: 'admin_mutation_contract_security', ok: adminMutations.every(r => r.security === 'admin') }
];

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), adminMutations, checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
