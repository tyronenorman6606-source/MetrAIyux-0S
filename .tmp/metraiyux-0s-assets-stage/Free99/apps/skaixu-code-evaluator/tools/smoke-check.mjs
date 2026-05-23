import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const website = read('index.html');
const app = read('app.html');
const scriptMatch = app.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Could not extract inline app script from app.html');

const temp = resolve(root, '.smoke-inline-app.cjs');
writeFileSync(temp, scriptMatch[1]);
try {
  execFileSync(process.execPath, ['--check', temp], { stdio: 'pipe' });
} finally {
  try { unlinkSync(temp); } catch {}
}

const requiredIds = [
  'workspaceName',
  'saveWorkspaceBtn',
  'workspaceSel',
  'tab-platform',
  'tab-seed',
  'tab-proof',
  'seedFolderPick',
  'seedZipPick',
  'exportProofBtn',
  'identityJson',
  'tab-ops',
  'tab-data',
  'issueLedgerOut',
  'exportBacklogBtn',
  'writeBacklogFilesBtn',
  'validateSeedsBtn',
  'materializeSeedBtn',
  'tab-marketplace',
  'providerPackBadge',
  'scanProviderPacksBtn',
  'installProviderPacksBtn',
  'writeProviderRegistryBtn',
  'providerPackOut',
  'installedProviderOut',
  'promoteIssuesBtn',
  'runPolicyGatesBtn',
  'exportTasksBtn',
  'taskQueueOut',
  'policyGateOut',
  'tab-automation',
  'runWorkflowBtn',
  'planEtlJobsBtn',
  'writeEtlJobsBtn',
  'runBrowserProofBtn',
  'workflowRunOut',
  'browserProofOut',
  'etlQueueOut',
  'syncEndpointInp',
  'saveSyncConfigBtn',
  'pushWorkspaceApiBtn',
  'pullWorkspaceApiBtn',
  'syncAdapterOut',
  'seedSchemaOut',
  'tab-backplane',
  'runBackplaneAuditBtn',
  'writeBackplaneFilesBtn',
  'queueDeterministicPatchBtn',
  'frameworkAdapterOut',
  'providerLifecycleOut',
  'workspaceContractOut',
  'taskPatchBundleOut'
];
for (const id of requiredIds) {
  if (!app.includes(`id="${id}"`)) throw new Error(`Missing required platform UI id in app.html: ${id}`);
}


const requiredFunctions = [
  'function buildIssueLedger',
  'function validateSeedRegistry',
  'function materializeSeedRegistry',
  'function validatePatchBundle',
  'function writeBacklogFiles',
  'function renderOpsPanel',
  'function runPolicyGates',
  'function discoverProviderPacks',
  'function installSafeProviderPacks',
  'function promoteIssuesToTasks',
  'function runClosureWorkflow',
  'function planSeedEtlJobs',
  'function runBrowserPreviewProof',
  'function saveSyncConfig',
  'function renderDataPanel',
  'function buildFrameworkAdapterManifest',
  'function buildProviderLifecycleAudit',
  'function buildWorkspaceBackplaneContract',
  'function buildDeterministicTaskPatchBundles',
  'function runBackplaneAudit',
  'function writeBackplaneFiles',
  'function queueDeterministicPatchBundle'
];
for (const fn of requiredFunctions) {
  if (!app.includes(fn)) throw new Error(`Missing required platform function in app.html: ${fn}`);
}

const requiredSourceFiles = [
  'src/platform/shared-workspace-store.mjs',
  'src/platform/seed-etl-worker.mjs',
  'src/platform/provider-lifecycle.mjs',
  'src/platform/framework-adapters.mjs',
  'src/platform/task-runner.mjs',
  'tools/platform-api-smoke.mjs',
  'netlify/functions/platform-workspaces.mjs',
  'netlify/functions/platform-seed-etl.mjs'
];
for (const file of requiredSourceFiles) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing required backplane source file: ${file}`);
}

const requiredWebsiteFiles = ['index.html', 'app.html', 'assets/skaixu-mark.svg', 'site.webmanifest', 'robots.txt', 'sitemap.xml', 'ai.md'];
for (const file of requiredWebsiteFiles) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing required website file: ${file}`);
}
for (const needle of ['Launch Evaluator', 'Open App', 'Proof-first', 'app.html']) {
  if (!website.includes(needle)) throw new Error(`Landing page missing expected public website copy/link: ${needle}`);
}
if (!website.includes('<script type="application/ld+json">')) throw new Error('Landing page missing SoftwareApplication structured data');

const manifest = JSON.parse(read('platform-seed/manifest.json'));
if (!Array.isArray(manifest.files) || manifest.files.length < 1) {
  throw new Error('platform-seed/manifest.json must include a non-empty files array');
}
for (const item of manifest.files) {
  if (!item.path) throw new Error('Seed manifest item missing path');
  if (!existsSync(resolve(root, item.path))) throw new Error(`Seed manifest references missing file: ${item.path}`);
}

const forbiddenDirectProviderPatterns = [
  'https://api.openai.com',
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com'
];
for (const pattern of forbiddenDirectProviderPatterns) {
  if (`${website}
${app}`.includes(pattern)) throw new Error(`Forbidden direct provider endpoint in website/app HTML: ${pattern}`);
}

console.log('✅ smoke-check passed: website files exist, landing page is client-facing, app inline JS parses, platform UI/ops/data/marketplace/automation/backplane IDs exist, core platform functions exist, backplane files exist, seed manifest resolves, gateway-only endpoint scan passed.');
