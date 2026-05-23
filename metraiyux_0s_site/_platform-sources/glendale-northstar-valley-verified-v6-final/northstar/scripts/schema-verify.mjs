import fs from 'node:fs';
const sql = fs.readFileSync('database/schema.sql','utf8');
const tables = ['workspaces','workspace_users','workspace_settings','workspace_states','attendees','workspace_audit_events','workspace_login_attempts','workspace_invites','workspace_backups'];
const result = Object.fromEntries(tables.map((t)=>[t, new RegExp(`CREATE TABLE IF NOT EXISTS ${t}`).test(sql)]));
result.workspaceOperationalSummary = /CREATE OR REPLACE VIEW workspace_operational_summary/.test(sql);
result.attendeesCompositePrimaryKey = /PRIMARY KEY\(workspace_id, attendee_id\)/.test(sql);
result.workspaceStatePrimaryKey = /workspace_id uuid PRIMARY KEY/.test(sql);
console.log(JSON.stringify(result,null,2));
if (Object.values(result).includes(false)) process.exit(1);
