import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `handler-guard-proof-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');

const expectations = [
  { key: 'self_service_database_provision', route: "/admin/self-service/projects/:projectSlug/databases" },
  { key: 'self_service_sql_execute', route: "/admin/self-service/projects/:projectSlug/databases/:appSlug/sql" },
  { key: 'table_browser_list', route: "/admin/self-service/projects/:projectSlug/databases/:appSlug/tables" },
  { key: 'table_browser_preview', route: "/admin/self-service/projects/:projectSlug/databases/:appSlug/table-preview" },
  { key: 'branch_request', route: "/admin/self-service/projects/:projectSlug/databases/:appSlug/branch-request" },
  { key: 'setup_generate_secrets', route: "/admin/setup/generate-secrets" },
  { key: 'guided_proof_action', route: "/admin/guided/proof-action" },
  { key: 'app_lifecycle_action', route: "/admin/apps/:appSlug/lifecycle-action" },
  { key: 'credential_rotation', route: "/admin/apps/:appSlug/rotate-credential" },
  { key: 'ai_debug', route: "/admin/ai/debug" }
];

function findHandler(route) {
  const idx = server.indexOf(route);
  if (idx === -1) return null;
  const start = Math.max(0, server.lastIndexOf("app.", idx) - 10);
  const next = server.indexOf("\napp.", idx + route.length);
  const end = next === -1 ? Math.min(server.length, idx + 2500) : next;
  return server.slice(start, end);
}

const checks = expectations.map(exp => {
  const handler = findHandler(exp.route);
  const ok = Boolean(handler && handler.includes('requireCommercialGate') && handler.includes(exp.key) && handler.includes('if (!gate) return'));
  return {
    ...exp,
    ok,
    found: Boolean(handler),
    hasRequireCommercialGate: Boolean(handler?.includes('requireCommercialGate')),
    hasRouteKey: Boolean(handler?.includes(exp.key)),
    hasReturnGate: Boolean(handler?.includes('if (!gate) return')),
    handlerPreview: handler?.slice(0, 1200)
  };
});

const report = {
  ok: checks.every(c => c.ok),
  generatedAt: new Date().toISOString(),
  checks,
  failed: checks.filter(c => !c.ok)
};

writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed.map(f => ({ key: f.key, route: f.route, found: f.found, hasRequireCommercialGate: f.hasRequireCommercialGate, hasRouteKey: f.hasRouteKey, hasReturnGate: f.hasReturnGate })) }, null, 2));
process.exit(report.ok ? 0 : 1);
