import fs from 'node:fs';
const required = [
  'netlify/functions/_shared.mjs',
  'netlify/functions/auth-login.mjs',
  'netlify/functions/auth-session.mjs',
  'netlify/functions/workspace-sync.mjs',
  'netlify/functions/workspace-audit.mjs',
  'netlify/functions/workspace-settings.mjs',
  'netlify/functions/workspace-users.mjs',
  'netlify/functions/workspace-backups.mjs',
  'database/schema.sql',
  'assets/workspace-client.js'
];
const missing = required.filter((p) => !fs.existsSync(p));
const shared = fs.readFileSync('netlify/functions/_shared.mjs','utf8');
const schema = fs.readFileSync('database/schema.sql','utf8');
const client = fs.readFileSync('assets/workspace-client.js','utf8');
const checks = {
  missing,
  csrfServer: /requireCsrf/.test(shared),
  rolePermissions: /ROLE_PERMISSIONS/.test(shared),
  loginAttempts: /workspace_login_attempts/.test(schema),
  workspaceSettings: /workspace_settings/.test(schema),
  workspaceBackups: /workspace_backups/.test(schema),
  clientCsrfHeader: /x-csrf-token/.test(client),
  rlsDatabaseGuard: /ENABLE ROW LEVEL SECURITY/.test(schema)
};
console.log(JSON.stringify(checks,null,2));
if (missing.length || Object.values(checks).some((v)=>v===false)) process.exit(1);
