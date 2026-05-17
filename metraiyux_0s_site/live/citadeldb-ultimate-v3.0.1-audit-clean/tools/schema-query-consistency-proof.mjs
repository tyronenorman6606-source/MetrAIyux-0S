import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `schema-query-consistency-${stamp}.json`);

const migrationsDir = join(root, 'migrations/citadel-core');
const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
const migrationSql = migrationFiles.map(f => readFileSync(join(migrationsDir, f), 'utf8')).join('\n');

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');

const createdTables = new Set([...migrationSql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z_][\w]*\.[a-zA-Z_][\w]*)/gi)].map(m => m[1]));
const tableRefs = new Set([...server.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_][\w]*\.[a-zA-Z_][\w]*)/gi)].map(m => m[1]).filter(t => !t.startsWith('information_schema.')));

const missingTables = [...tableRefs].filter(t => !createdTables.has(t)).sort();

const requiredCore = [
  'citadel.apps',
  'citadel.app_credentials',
  'citadel.audit_events',
  'citadel.backup_receipts',
  'citadel.restore_receipts',
  'citadel.migration_receipts',
  'citadel.operator_jobs',
  'citadel.command_receipts',
  'self_service.projects',
  'self_service.project_databases',
  'platform.teams',
  'commercial.subscriptions',
  'live_gate.route_gate_events'
];

const missingRequired = requiredCore.filter(t => !createdTables.has(t));

const report = {
  ok: missingTables.length === 0 && missingRequired.length === 0,
  generatedAt: new Date().toISOString(),
  migrationFiles,
  createdTables: [...createdTables].sort(),
  tableRefs: [...tableRefs].sort(),
  missingTables,
  missingRequired
};

writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), missingTables, missingRequired }, null, 2));
process.exit(report.ok ? 0 : 1);
