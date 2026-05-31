import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'metraiyux_0s_site', 'HouseOperations');
const contract = JSON.parse(fs.readFileSync(path.join(appDir, 'CLAIM_CONTRACT.json'), 'utf8'));
const appJs = fs.readFileSync(path.join(appDir, 'houseops-platform.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
const tutorialHtml = fs.readFileSync(path.join(appDir, 'tutorial.html'), 'utf8');
const billingHtml = fs.readFileSync(path.join(appDir, 'billing.html'), 'utf8');
const runtimeSummary = JSON.parse(fs.readFileSync(path.join(appDir, 'v1', 'runtime-summary'), 'utf8'));
const skyepayCatalogPath = fs.existsSync(path.join(root, 'SkyeGateFS27', 'netlify', 'functions', '_lib', 'skyepayCatalog.js'))
  ? path.join(root, 'SkyeGateFS27', 'netlify', 'functions', '_lib', 'skyepayCatalog.js')
  : path.join(root, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'netlify', 'functions', '_lib', 'skyepayCatalog.js');
const skyepayCatalog = fs.readFileSync(skyepayCatalogPath, 'utf8');
const stripeSync = fs.readFileSync(path.join(root, 'tools', 'sync-metraiyux-stripe-products.mjs'), 'utf8');
const saasTools = fs.readFileSync(path.join(root, 'metraiyux_0s_site', 'assets', 'js', 'saas-tools.js'), 'utf8');
const pricingPage = fs.readFileSync(path.join(root, 'metraiyux_0s_site', 'saas', 'pricing.html'), 'utf8');

const requiredClaims = [
  'task_intake',
  'vendor_intake',
  'workboard',
  'owner_alerts',
  'proof_ledger',
  'backup_export',
  'gate_packet_export',
  'skyebox_vault',
  'pin_gate',
  'billing_intent',
  'tutorial'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ids = new Set(contract.claims.map((claim) => claim.id));
for (const id of requiredClaims) assert(ids.has(id), `Missing claim contract id: ${id}`);

const sourceChecks = [
  ['task_intake', 'function addTask', 'data-form="task"'],
  ['vendor_intake', 'function addVendor', 'data-form="vendor"'],
  ['workboard', "const flow = ['open', 'queued', 'review', 'done']", 'data-action="advance-task"'],
  ['owner_alerts', 'function resolveAlert', 'function addOwnerAlert'],
  ['proof_ledger', 'function saveProof', 'HouseOperations proof snapshot'],
  ['backup_export', 'function exportBackup', 'houseoperations-standalone-backup.json'],
  ['gate_packet_export', 'function queueGateMirror', 'houseoperations-gate-mirror-packet.json'],
  ['billing_intent', 'function createBillingIntent', 'metraiyux-houseoperations-command'],
  ['tutorial', 'function runTutorialStep', 'Run Full Tutorial'],
  ['pin_gate', 'FS27 PIN Gate', 'pin-gate.html']
];

const allSource = [appJs, indexHtml, tutorialHtml, billingHtml].join('\n');
for (const [claimId, ...tokens] of sourceChecks) {
  for (const token of tokens) {
    assert(allSource.includes(token), `${claimId} missing source token: ${token}`);
  }
}

assert(runtimeSummary.version === '1.1.0', 'runtime summary version must be 1.1.0');
assert(runtimeSummary.claimContract === './CLAIM_CONTRACT.json', 'runtime summary must point to CLAIM_CONTRACT.json');
assert(runtimeSummary.billing?.payment === 'SkyePay/FS27', 'runtime summary must preserve billing boundary');

const commerceSource = [skyepayCatalog, stripeSync, saasTools, pricingPage, billingHtml].join('\n');
for (const token of [
  'metraiyux-houseoperations-command',
  'metraiyux-houseoperations-managed',
  'metraiyux_houseoperations_command_setup',
  'metraiyux_houseoperations_command_monthly',
  'metraiyux_houseoperations_managed_setup',
  'metraiyux_houseoperations_managed_monthly',
  'HouseOperations Command',
  'HouseOperations Managed'
]) {
  assert(commerceSource.includes(token), `Commercial wiring missing token: ${token}`);
}

console.log('houseoperations-claim-contract: ok');
