import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const push = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

for (const file of ['wrangler.toml','package.json','src/index.js','migrations/0001_core.sql','migrations/0002_connectlog_bridge.sql','migrations/0003_connectlog_message_proof.sql','migrations/0004_connectlog_activation_proof.sql','migrations/0005_connectlog_live_proof.sql']) {
  push(`file:${file}`, exists(file), exists(file) ? 'present' : 'missing');
}
const wrangler = exists('wrangler.toml') ? read('wrangler.toml') : '';
const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
push('wrangler_has_thread_room_do', wrangler.includes('THREAD_ROOM') && wrangler.includes('ThreadRoom'), 'Durable Object binding must exist.');
push('wrangler_has_assets_binding', wrangler.includes('[assets]') && wrangler.includes('ASSETS'), 'Static admin/widget assets binding must exist.');
push('wrangler_d1_database_id_replaced', wrangler.includes('database_id =') && !wrangler.includes('REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID'), 'Replace placeholder database_id before remote deploy.');
push('script_smoke', Boolean(pkg.scripts?.smoke), 'npm run smoke must be available.');
push('script_remote_migration', Boolean(pkg.scripts?.['d1:migrate:remote']), 'npm run d1:migrate:remote must be available.');
push('script_activation_proof', Boolean(pkg.scripts?.['proof:activation']), 'npm run proof:activation must be available.');
push('script_live_proof', Boolean(pkg.scripts?.['proof:live']), 'npm run proof:live must be available.');
const output = { ok: checks.every((item) => item.ok), package: 'relay13-core-v1.7-connectlog-operator-proof', checked_at: new Date().toISOString(), checks };
console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
