import { mkdtemp, rm, readFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFileWorkspaceStore, createMemoryWorkspaceStore, validateWorkspaceSnapshot } from '../src/platform/shared-workspace-store.mjs';
import { materializeSeeds, parseCsv } from '../src/platform/seed-etl-worker.mjs';
import { validateProviderPack, createProviderRegistry } from '../src/platform/provider-lifecycle.mjs';
import { buildFrameworkAdapterManifest } from '../src/platform/framework-adapters.mjs';
import { buildPatchBundleForIssue, validatePatchBundle } from '../src/platform/task-runner.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const tmp = await mkdtemp(path.join(tmpdir(), 'skaixu-platform-smoke-'));
try {
  const identity = { tenantId: 'tenant-a', userId: 'operator-1', roles: ['owner'] };
  const snapshot = { id: 'demo', name: 'Demo', files: [{ path: 'index.html', text: '<button>Run</button>' }], entryPath: 'index.html' };
  assert(validateWorkspaceSnapshot(snapshot).ok, 'workspace snapshot should validate');

  const memory = createMemoryWorkspaceStore();
  await memory.saveWorkspace({ identity, workspaceId: 'demo', snapshot });
  assert((await memory.listWorkspaces({ identity })).length === 1, 'memory workspace list should contain saved item');

  const fileStore = createFileWorkspaceStore({ rootDir: path.join(tmp, 'workspaces') });
  await fileStore.saveWorkspace({ identity, workspaceId: 'demo', snapshot });
  const loaded = await fileStore.loadWorkspace({ identity, workspaceId: 'demo' });
  assert(loaded?.snapshot?.files?.[0]?.path === 'index.html', 'file workspace should load saved snapshot');

  assert(parseCsv('name,city,state\nAlpha,Phoenix,AZ\n').length === 1, 'CSV parser should parse one record');
  await cp(path.join(process.cwd(), 'platform-seed'), path.join(tmp, 'platform-seed'), { recursive: true });
  const etl = await materializeSeeds({ rootDir: tmp, outDir: 'generated/platform-data' });
  assert(etl.businessDirectory.length >= 1, 'seed ETL should materialize sample business records');
  assert(etl.provenance?.sourceFiles?.length >= 1, 'seed ETL should produce provenance');
  assert(etl.chunks?.length >= 1, 'seed ETL should produce chunk manifest');
  const etlJson = JSON.parse(await readFile(path.join(tmp, 'generated/platform-data', 'business-directory.json'), 'utf8'));
  assert(Array.isArray(etlJson), 'seed ETL output should be an array');

  const safePack = { id: 'safe-pack', gatewayOnly: true, endpoints: [{ url: 'https://kaixugateway13.netlify.app/api/chat' }] };
  assert(validateProviderPack(safePack).ok, 'safe provider pack should validate');
  const unsafePack = { id: 'bad-pack', gatewayOnly: false, endpoints: [{ url: 'https://api.openai.com/v1/chat/completions' }] };
  assert(!validateProviderPack(unsafePack).ok, 'direct provider pack should fail');
  const registry = createProviderRegistry({ registryPath: path.join(tmp, 'provider-registry.json') });
  await registry.install(safePack);
  assert((await registry.audit()).ok, 'installed provider registry should audit clean');

  const manifest = buildFrameworkAdapterManifest({ 'package.json': JSON.stringify({ scripts: { test: 'node tools/smoke-check.mjs' }, dependencies: { vite: '^5.0.0', react: '^18.0.0' } }), 'src/main.jsx': 'console.log(1)' });
  assert(manifest.primaryFramework === 'vite', 'framework adapter should detect vite as primary');

  const patch = buildPatchBundleForIssue({ id: 'issue-test', title: 'Missing smoke test', category: 'proof' }, { 'package.json': JSON.stringify({ name: 'demo', scripts: {} }) });
  assert(validatePatchBundle(patch).ok, 'deterministic task patch bundle should validate');
  assert(patch.changes.some(change => change.path === 'package.json'), 'task patch should update package.json for test issue');

  console.log('✅ platform-api-smoke passed: workspace store, ETL worker, provider lifecycle, framework adapters, and task runner validate.');
} finally {
  await rm(tmp, { recursive: true, force: true });
}
