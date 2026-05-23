import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemoryWorkspaceStore, createFileWorkspaceStore, validateWorkspaceSnapshot } from '../src/platform/shared-workspace-store.mjs';
import { executeBuildPlan } from '../src/platform/build-executor.mjs';
import { runIssuePatchLoop } from '../src/platform/task-runner.mjs';
import { runPlatformClosure } from '../src/platform/platform-closure-orchestrator.mjs';
import { handler as workspaceHandler } from '../netlify/functions/platform-workspaces.mjs';
import { handler as seedHandler } from '../netlify/functions/platform-seed-etl.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const root = process.cwd();
const identity = { tenantId: 'closure-api', userId: 'operator', roles: ['owner'] };
const encoded = Buffer.from(JSON.stringify(identity)).toString('base64url');
const headers = { 'x-skai-upstream-identity': encoded };

assert(validateWorkspaceSnapshot({ files: [{ path: '../escape.js', text: 'bad' }] }).ok === false, 'workspace validator must block traversal');
assert(validateWorkspaceSnapshot({ files: [{ path: '.git/config', text: 'bad' }] }).ok === false, 'workspace validator must block protected dirs');

const memory = createMemoryWorkspaceStore();
const a = await memory.saveWorkspace({ identity, workspaceId: 'api-contract', snapshot: { id: 'api-contract', files: [{ path: 'index.html', text: 'a' }] } });
let conflict = false;
try { await memory.saveWorkspace({ identity, workspaceId: 'api-contract', expectedLatestVersionId: 'stale', snapshot: { id: 'api-contract', files: [{ path: 'index.html', text: 'b' }] } }); }
catch (error) { conflict = error.code === 'WORKSPACE_VERSION_CONFLICT'; }
assert(conflict, 'memory workspace must enforce expectedLatestVersionId conflicts');
await memory.saveWorkspace({ identity, workspaceId: 'api-contract', expectedLatestVersionId: a.latestVersionId, snapshot: { id: 'api-contract', files: [{ path: 'index.html', text: 'b' }] } });
assert((await memory.listWorkspaceVersions({ identity, workspaceId: 'api-contract' })).length === 2, 'workspace versions should survive successful concurrency update');

const fileTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'skaixu-closure-file-store-'));
const fileStore = createFileWorkspaceStore({ rootDir: path.join(fileTmp, 'workspaces'), maxVersions: 2 });
let latest = null;
for (let i = 0; i < 4; i++) {
  const saved = await fileStore.saveWorkspace({ identity, workspaceId: 'pruned', expectedLatestVersionId: latest, snapshot: { id: 'pruned', files: [{ path: 'index.html', text: String(i) }] } });
  latest = saved.latestVersionId;
}
assert((await fileStore.listWorkspaceVersions({ identity, workspaceId: 'pruned' })).length === 2, 'file workspace should prune old versions');

const postA = await workspaceHandler({ httpMethod: 'POST', headers, body: JSON.stringify({ id: 'fn-contract', snapshot: { id: 'fn-contract', files: [{ path: 'index.html', text: 'a' }] } }), queryStringParameters: {} });
assert(postA.statusCode === 200, `workspace function initial post failed: ${postA.body}`);
const latestFn = JSON.parse(postA.body).workspace.latestVersionId;
const postConflict = await workspaceHandler({ httpMethod: 'POST', headers, body: JSON.stringify({ id: 'fn-contract', expectedLatestVersionId: 'stale', snapshot: { id: 'fn-contract', files: [{ path: 'index.html', text: 'b' }] } }), queryStringParameters: {} });
assert(postConflict.statusCode === 409, 'workspace function should return 409 on stale expected version');
const postB = await workspaceHandler({ httpMethod: 'POST', headers, body: JSON.stringify({ id: 'fn-contract', expectedLatestVersionId: latestFn, snapshot: { id: 'fn-contract', files: [{ path: 'index.html', text: 'b' }] } }), queryStringParameters: {} });
assert(postB.statusCode === 200, 'workspace function should accept correct expected version');
const versions = await workspaceHandler({ httpMethod: 'GET', headers, queryStringParameters: { action: 'versions', id: 'fn-contract' } });
assert(JSON.parse(versions.body).versions.length >= 2, 'workspace function should list versions');

const seedBlocked = await seedHandler({ httpMethod: 'POST', headers, body: JSON.stringify({ manifestPath: '../evil.json' }), queryStringParameters: {} });
assert(seedBlocked.statusCode === 400, 'seed function should block unsafe manifest path');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'skaixu-closure-runner-'));
await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module', scripts: { test: 'node -e "console.log(13)"' } }, null, 2));
const noStage = await executeBuildPlan({ rootDir: tmp, stages: ['missing'], dryRun: true });
assert(noStage.status === 'blocked', 'build executor should block empty stage selections instead of passing');
const loop = await runIssuePatchLoop({ rootDir: tmp, issues: [{ id: 'manual', title: 'Manual task ledger', category: 'ops' }], files: {}, materialize: true });
assert(loop.run.artifactDir && loop.artifact?.written?.length >= 1, 'task loop should materialize patched artifact files');

const closure = await runPlatformClosure({ rootDir: root });
assert(closure.status === 'passed', `closure orchestrator failed: ${closure.failed.join(', ')}`);
assert(closure.receiptPath, 'closure receipt path missing');

console.log('✅ platform-closure-smoke passed');
