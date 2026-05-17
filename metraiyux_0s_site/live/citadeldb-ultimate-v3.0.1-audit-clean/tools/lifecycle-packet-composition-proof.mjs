import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `lifecycle-packet-composition-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');
const start = server.indexOf("app.get('/admin/apps/:appSlug/lifecycle-packet'");
const end = server.indexOf("\napp.", start + 20);
const handler = start === -1 ? '' : server.slice(start, end === -1 ? server.length : end);

const requiredFields = [
  'migrationPlan',
  'proofPacket',
  'rollbackPacket',
  'accepted',
  'connectionTest',
  'writeSmoke',
  'restoreTest',
  'evidenceRequired',
  'redactSecrets'
];

const checks = requiredFields.map(field => ({ field, ok: handler.includes(field) }));
checks.unshift({ field: 'handler_found', ok: handler.length > 0 });

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
