import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `gateway-worker-job-parity-${stamp}.json`);

const server = readFileSync(join(root, 'control-plane/gateway/src/server.mjs'), 'utf8');
const worker = readFileSync(join(root, 'workers/job-runner/runner.mjs'), 'utf8');

const block = server.match(/const allowedJobTypes = new Set\(\[([\s\S]*?)\]\);/);
const gatewayJobs = block ? [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort() : [];
const workerJobs = [...worker.matchAll(/'([^']+)'\s*:\s*\[/g)].map(m => m[1]).sort();

const missingInGateway = workerJobs.filter(j => !gatewayJobs.includes(j));
const missingInWorker = gatewayJobs.filter(j => !workerJobs.includes(j));

const report = {
  ok: missingInGateway.length === 0 && missingInWorker.length === 0,
  generatedAt: new Date().toISOString(),
  gatewayJobs,
  workerJobs,
  missingInGateway,
  missingInWorker
};

writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), missingInGateway, missingInWorker }, null, 2));
process.exit(report.ok ? 0 : 1);
