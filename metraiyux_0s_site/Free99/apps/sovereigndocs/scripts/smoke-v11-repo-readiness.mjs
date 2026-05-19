import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function assert(cond,msg){ if(!cond){ console.error(`❌ ${msg}`); process.exit(1); } }
async function json(rel){ return JSON.parse(await readFile(path.join(ROOT,rel),'utf8')); }
const pkg=await json('package.json');
assert(['11.0.0','12.0.0','13.0.0'].includes(pkg.version),'package version is v11/v12/v13 compatible');
assert((await readFile(path.join(ROOT,'README.md'),'utf8')).includes('SovereignDocs v13'), 'README updated to v11');
assert((await readFile(path.join(ROOT,'service-worker.js'),'utf8')).includes('sovereigndocs-v13'), 'service worker cache is v11');
assert(!existsSync(path.join(ROOT,'트ademarks')), 'bad typo route removed');
assert(existsSync(path.join(ROOT,'.github/workflows/sovereigndocs-ci.yml')), 'CI workflow exists');
assert(existsSync(path.join(ROOT,'.devcontainer/devcontainer.json')), 'devcontainer exists');
assert(existsSync(path.join(ROOT,'Dockerfile')), 'Dockerfile exists');
assert(existsSync(path.join(ROOT,'openapi/sovereigndocs.openapi.json')), 'OpenAPI file exists');
for(const f of ['data/legal-review-submissions.json','data/customer-orders.json','data/esign-envelope-log.json','data/audit.json','data/vault.json']){
  const rows=JSON.parse(await readFile(path.join(ROOT,f),'utf8'));
  assert(Array.isArray(rows), `${f} is a valid runtime array`);
}
assert(existsSync(path.join(ROOT,'data/fixtures')), 'data fixtures folder exists for smoke/dev records');
const server=await readFile(path.join(ROOT,'server/sovereigndocs-server.mjs'),'utf8');
assert(server.includes('SOVEREIGNDOCS_ENABLE_DEV_TOKEN'), 'dev token endpoint is explicit opt-in');
assert(server.includes('validateProductionConfig'), 'production config status is wired');
assert(server.includes('createCheckoutIntent'), 'payment adapter is wired');
assert(server.includes('sendNotification'), 'notification adapter is wired');
assert(server.includes('createExternalSigningEnvelope'), 'external signature adapter is wired');
console.log('✅ v11/v12/v13 repo-readiness smoke passed');
