import fs from 'node:fs/promises';
const required = [
  'netlify/functions/_shared.mjs',
  'netlify/functions/auth-login.mjs',
  'netlify/functions/auth-session.mjs',
  'netlify/functions/workspace-sync.mjs',
  'netlify/functions/operator-provision.mjs',
  'netlify/functions/operator-workspaces.mjs',
  'database/schema.sql',
  'database/migrations/003_workspace_closure_v6_4_0.sql',
  'assets/workspace-client.js',
  'assets/app.js',
  'assets/data/seed-workspaces.json',
  'scripts/provision-workspaces.mjs',
  'scripts/closure-local-proof.mjs',
  'docs/ADMIN_PROVISIONING.md',
  'docs/WORKSPACE_CLOSURE_V6_4.md',
  'docs/CLOSURE_RECEIPT_V6_4.md'
];
for (const file of required) await fs.access(file);
const html = await fs.readFile('index.html','utf8');
if (!html.includes('workspace-client.js')) throw new Error('index.html missing workspace client script');
const app = await fs.readFile('assets/app.js','utf8');
if (!app.includes('renderProvision') || !app.includes('operator-provision-form')) throw new Error('admin provision tab is missing');
const client = await fs.readFile('assets/workspace-client.js','utf8');
if (!client.includes("api('/operator-provision'") || !client.includes('operatorWorkspaces')) throw new Error('operator client API wiring is missing');
const sync = await fs.readFile('netlify/functions/workspace-sync.mjs','utf8');
if (!sync.includes('delete from attendees where workspace_id')) throw new Error('attendee mirror deletion is missing');
const netlify = await fs.readFile('netlify.toml','utf8');
if (!netlify.includes('/api/*')) throw new Error('netlify.toml missing API redirect');
console.log(JSON.stringify({ ok: true, checked: required.length + 6 }, null, 2));
