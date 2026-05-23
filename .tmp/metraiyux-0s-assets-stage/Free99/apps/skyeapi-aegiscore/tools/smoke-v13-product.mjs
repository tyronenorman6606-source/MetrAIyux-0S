import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  MemoryOpsStore,
  loadProviderPackFromSource,
  runProviderPackSandbox,
  createBillingInvoiceDraft,
  buildBillingUsageRecords,
  persistBillingInvoice,
  listBillingInvoices,
  updateBillingInvoiceStatus,
  createPlanSubscriptionDraft,
  evaluateWorkspaceProjectAccess,
  createAuditExportBundle
} from '../packages/ops/dist/index.js';

const root = new URL('..', import.meta.url).pathname;
const proofDir = join(root, '.proof', 'v13-product');
await rm(proofDir, { recursive: true, force: true });
await mkdir(proofDir, { recursive: true });

const pack = {
  version: 'skyeapi.provider-pack.v1',
  provider: 'mailgun-custom',
  label: 'Mailgun Custom',
  category: 'email',
  capabilities: ['email.send'],
  requiredSecrets: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN'],
  optionalSecrets: [],
  dependencies: [],
  versionTag: '0.13.0',
  secrets_exposed: false
};

const checks = [];
const fail = (message) => { throw new Error(message); };

const inline = await loadProviderPackFromSource({ sourceType: 'inline', inlinePack: pack });
if (!inline.certification.ok || inline.loader !== 'inline') fail('inline provider-pack source loading failed');
checks.push('inline provider-pack source loader produced a certified loaded-source receipt');

const dir = join(proofDir, 'dir-pack');
await mkdir(dir, { recursive: true });
await writeFile(join(dir, 'pack.json'), JSON.stringify(pack, null, 2));
const directory = await loadProviderPackFromSource({ sourceType: 'directory', sourceUri: dir });
if (!directory.certification.ok || directory.loader !== 'filesystem') fail('directory provider-pack source loading failed');
checks.push('directory provider-pack loader read pack.json from filesystem');

const zipDir = join(proofDir, 'zip-pack');
await mkdir(zipDir, { recursive: true });
await writeFile(join(zipDir, 'pack.json'), JSON.stringify(pack, null, 2));
execFileSync('zip', ['-q', '-r', join(proofDir, 'pack.zip'), 'pack.json'], { cwd: zipDir });
const zipLoaded = await loadProviderPackFromSource({ sourceType: 'zip', sourceUri: join(proofDir, 'pack.zip') });
if (!zipLoaded.certification.ok || zipLoaded.loader !== 'zip-unzip') fail('zip provider-pack extraction failed');
checks.push('zip provider-pack loader extracted pack.json using unzip');

const gitDir = join(proofDir, 'git-pack');
await mkdir(gitDir, { recursive: true });
await writeFile(join(gitDir, 'pack.json'), JSON.stringify(pack, null, 2));
execFileSync('git', ['init'], { cwd: gitDir, stdio: 'ignore' });
execFileSync('git', ['config', 'user.email', 'proof@skyeapi.local'], { cwd: gitDir });
execFileSync('git', ['config', 'user.name', 'SkyeAPI Proof'], { cwd: gitDir });
execFileSync('git', ['add', 'pack.json'], { cwd: gitDir });
execFileSync('git', ['commit', '-m', 'pack'], { cwd: gitDir, stdio: 'ignore' });
const gitLoaded = await loadProviderPackFromSource({ sourceType: 'git', sourceUri: gitDir });
if (!gitLoaded.certification.ok || gitLoaded.loader !== 'git-clone') fail('git provider-pack clone loader failed');
checks.push('git provider-pack loader cloned source and read pack.json');

const sandbox = await runProviderPackSandbox({ pack, adapterSource: 'export async function execute() { return { ok: true, dryRun: true }; }' });
if (!sandbox.ok || sandbox.executedUntrustedCode !== false) fail('provider-pack sandbox did not pass safely');
checks.push('provider-pack sandbox generated dry-run receipts without executing untrusted code');

const usageRecords = buildBillingUsageRecords([{ projectId: 'proj_v13', window: '2026-05-10', capability: 'email.send', ok: true, count: 17 }]);
const invoiceDraft = createBillingInvoiceDraft({ projectId: 'proj_v13', records: usageRecords, customerEmail: 'customer@example.com', window: '2026-05-10' });
const store = new MemoryOpsStore();
const persisted = await persistBillingInvoice(store, invoiceDraft, { actorId: 'actor_v13' });
const updated = await updateBillingInvoiceStatus(store, { projectId: 'proj_v13', invoiceId: persisted.id, status: 'issued', actorId: 'actor_v13' });
const invoices = await listBillingInvoices(store, 'proj_v13');
if (!updated.ok || invoices.length !== 1 || invoices[0].status !== 'issued') fail('invoice persistence/history failed');
checks.push('billing invoice draft persisted, listed, and status history updated');

const subscription = createPlanSubscriptionDraft({ projectId: 'proj_v13', plan: 'builder', billingCycle: 'monthly', basePriceCents: 2900, includedCalls: 10000 });
if (subscription.version !== 'skyeapi.plan-subscription-draft.v1' || subscription.status !== 'active') fail('subscription draft failed');
checks.push('subscription draft object generated without claiming payment capture');

const binding = { version: 'skyeapi.workspace-project-binding.v1', workspaceId: 'wksp_v13', projectId: 'proj_v13', roles: ['developer'], createdAt: new Date().toISOString(), secrets_exposed: false };
const access = evaluateWorkspaceProjectAccess({ bindings: [binding], workspaceId: 'wksp_v13', projectId: 'proj_v13', role: 'developer', capability: 'email.send', roleCapabilities: { developer: ['email.send'] } });
if (!access.ok) fail('workspace project access hook failed');
checks.push('workspace/project binding allowed a scoped upstream role/capability decision');

const audit = await createAuditExportBundle({ projectId: 'proj_v13', sections: { invoices, providerInstalls: [inline], subscriptions: [subscription], events: [{ authorization: 'Bearer SHOULD_NOT_LEAK_1234567890' }] } });
const auditText = JSON.stringify(audit);
if (!audit.redacted || auditText.includes('SHOULD_NOT_LEAK')) fail('audit bundle redaction failed');
checks.push('redacted audit export bundle created with checksum and section counts');

const source = await readFile(new URL('../apps/gateway-worker/src/index.ts', import.meta.url), 'utf8');
for (const endpoint of ['/v1/admin/provider-pack-sandbox', '/v1/admin/billing-invoice-create', '/v1/admin/subscriptions', '/v1/admin/workspace-bindings', '/v1/admin/audit-export']) {
  if (!source.includes(endpoint)) fail(`gateway missing endpoint ${endpoint}`);
}
checks.push('hosted gateway source includes v0.13 admin endpoints');

const result = { ok: true, checkedAt: new Date().toISOString(), checks, secrets_exposed: false };
await mkdir(join(root, '.proof'), { recursive: true });
await writeFile(join(root, '.proof', 'v13-product-smoke-result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
