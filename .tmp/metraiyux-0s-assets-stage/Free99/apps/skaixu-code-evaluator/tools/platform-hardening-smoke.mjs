import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemoryWorkspaceStore, createFileWorkspaceStore } from '../src/platform/shared-workspace-store.mjs';
import { materializeSeeds, safeResolveInside } from '../src/platform/seed-etl-worker.mjs';
import { planBuildExecution, executeBuildPlan } from '../src/platform/build-executor.mjs';
import { runIssuePatchLoop } from '../src/platform/task-runner.mjs';

const root = process.cwd();
const html = await fs.readFile(path.join(root, 'app.html'), 'utf8');
for (const needle of ['src/client/platform-client.js', 'workspaceVersionOut', 'seedProvenanceOut', 'taskReceiptOut', 'buildExecutionOut']) {
  if (!html.includes(needle)) throw new Error(`missing hardening surface: ${needle}`);
}

const identity = { tenantId: 'tenant-a', userId: 'operator-a', roles: ['owner'] };
const snapshotA = { id: 'alpha', name: 'Alpha', files: [{ path: 'index.html', text: '<h1>A</h1>' }] };
const snapshotB = { id: 'alpha', name: 'Alpha', files: [{ path: 'index.html', text: '<h1>B</h1>' }, { path: 'README.md', text: '# Alpha' }] };
const memory = createMemoryWorkspaceStore();
await memory.saveWorkspace({ identity, workspaceId: 'alpha', name: 'Alpha', snapshot: snapshotA });
await memory.saveWorkspace({ identity, workspaceId: 'alpha', name: 'Alpha', snapshot: snapshotB });
const versions = await memory.listWorkspaceVersions({ identity, workspaceId: 'alpha' });
if (versions.length !== 2) throw new Error(`expected 2 memory workspace versions, got ${versions.length}`);
if (versions[0].diff.summary.added < 1 || versions[0].diff.summary.changed < 1) throw new Error('workspace diff did not track added/changed files');

let blocked = false;
try { safeResolveInside(root, '../outside', { allowedPrefixes: ['platform-seed'], label: 'seed asset' }); } catch { blocked = true; }
if (!blocked) throw new Error('safeResolveInside allowed path traversal');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'skaixu-hardening-'));
await fs.mkdir(path.join(tmp, 'platform-seed', 'sample-businesses'), { recursive: true });
await fs.writeFile(path.join(tmp, 'platform-seed', 'manifest.json'), JSON.stringify({ assets: [{ path: 'platform-seed/sample-businesses', type: 'directory' }] }, null, 2));
await fs.writeFile(path.join(tmp, 'platform-seed', 'sample-businesses', 'businesses.csv'), 'name,city,state,website,category\nA Co,Phoenix,AZ,https://a.example,Ops\nA Co,Phoenix,AZ,https://a.example,Ops\nB Co,Glendale,AZ,https://b.example,Repair\n');
const etl = await materializeSeeds({ rootDir: tmp, chunkSize: 1 });
if (etl.businessDirectory.length !== 2) throw new Error(`expected deduped business count 2, got ${etl.businessDirectory.length}`);
if (etl.chunks.length !== 2) throw new Error(`expected 2 chunks, got ${etl.chunks.length}`);
if (!etl.provenance.records.length) throw new Error('seed provenance missing records');

await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module', scripts: { test: 'node -e "console.log(1)"' } }, null, 2));
const plan = await planBuildExecution({ rootDir: tmp });
if (!plan.commands.some(c => c.stage === 'test' && c.runnable)) throw new Error('build execution planner did not expose runnable test command');
const receipt = await executeBuildPlan({ rootDir: tmp, plan, stages: ['test'], dryRun: true });
if (receipt.status !== 'planned') throw new Error(`expected dry-run build receipt, got ${receipt.status}`);

const loop = await runIssuePatchLoop({ rootDir: tmp, issues: [{ id: 'proof-1', title: 'README missing', category: 'docs', action: 'Add README' }], files: {} });
if (!loop.run.receipts.length) throw new Error('task runner did not produce receipts');

console.log('✅ platform-hardening-smoke passed');
