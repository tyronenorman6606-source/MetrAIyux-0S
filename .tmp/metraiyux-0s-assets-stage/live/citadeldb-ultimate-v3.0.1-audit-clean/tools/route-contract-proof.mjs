import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `route-contract-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');
const contract = JSON.parse(readFileSync(join(root, 'control-plane/gateway/route-contract.json'), 'utf8'));

const actual = [...server.matchAll(/app\.(get|post|put|patch|delete)\('([^']+)'/gi)]
  .map(m => `${m[1].toUpperCase()} ${m[2]}`)
  .sort();

const declared = contract.routes.map(r => `${r.method} ${r.path}`).sort();

const missingInContract = actual.filter(r => !declared.includes(r));
const missingInServer = declared.filter(r => !actual.includes(r));

function handlerFor(method, route) {
  const needle = `app.${method.toLowerCase()}('${route}'`;
  const idx = server.indexOf(needle);
  if (idx === -1) return '';
  const end = server.indexOf('\napp.', idx + needle.length);
  return server.slice(idx, end === -1 ? server.length : end);
}

const checks = [];
checks.push({ name: 'contract_route_count_matches_server', ok: missingInContract.length === 0 && missingInServer.length === 0, missingInContract, missingInServer });
checks.push({ name: 'all_admin_routes_have_admin_security', ok: contract.routes.filter(r => r.path.startsWith('/admin/')).every(r => r.security === 'admin') });
checks.push({ name: 'stripe_webhook_not_admin', ok: contract.routes.some(r => r.path === '/webhooks/stripe' && r.security === 'stripe_signature') });
checks.push({ name: 'health_public', ok: contract.routes.some(r => r.path === '/health' && r.security === 'public') });
checks.push({ name: 'admin_mutation_audit_middleware_present', ok: server.includes("admin_mutation_request") && server.includes("app.use('/admin', requireAdmin") });

const protectedFailures = contract.routes
  .filter(r => r.protectedKey)
  .map(r => {
    const handler = handlerFor(r.method, r.path);
    return {
      route: `${r.method} ${r.path}`,
      protectedKey: r.protectedKey,
      ok: handler.includes('requireCommercialGate') && handler.includes(r.protectedKey) && handler.includes('if (!gate) return')
    };
  })
  .filter(r => !r.ok);

checks.push({ name: 'protected_routes_guarded_in_handler', ok: protectedFailures.length === 0, protectedFailures });

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
