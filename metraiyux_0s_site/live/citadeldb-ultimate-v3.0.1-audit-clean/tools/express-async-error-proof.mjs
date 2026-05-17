import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `express-async-error-${stamp}.json`);

const pkg = JSON.parse(readFileSync(join(root, 'control-plane/gateway/package.json'), 'utf8'));
const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');

const checks = [
  { name: 'express4_dependency_declared', ok: String(pkg.dependencies?.express || '').startsWith('^4') || String(pkg.dependencies?.express || '').startsWith('4') },
  { name: 'async_route_wrapper_present', ok: server.includes('function asyncRoute(handler)') },
  { name: 'app_methods_wrapped', ok: server.includes("for (const method of ['get', 'post', 'put', 'patch', 'delete'])") },
  { name: 'zod_error_handler_present', ok: server.includes("error?.name === 'ZodError'") && server.includes('Invalid request body') },
  { name: 'redacted_500_error_present', ok: server.includes('redactSecrets(error?.message') },
  { name: 'error_middleware_before_listen', ok: server.indexOf("app.use((error") !== -1 && server.indexOf("app.use((error") < server.indexOf('app.listen(') }
];

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
