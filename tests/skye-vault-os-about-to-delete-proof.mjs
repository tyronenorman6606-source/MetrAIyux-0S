import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { hashFile, sha256Text } from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const sourceRoot = path.join(repoRoot, 'about to delete');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'vaultos-about-to-delete-proof');
const runtimeRoot = path.join('/tmp', 'skye-vault-os-about-to-delete-proof');
const reloadRoot = path.join(runtimeRoot, 'reloaded-about-to-delete');
const bundleReloadRoot = path.join(runtimeRoot, 'reloaded-from-bundle');
const vaultDir = path.join(runtimeRoot, 'vault');
const attachedVaultDir = path.join(runtimeRoot, 'attached-vault');
const bundleRoot = path.join(runtimeRoot, 'drive-bundle');
const receiptMirrorDir = path.join(artifactRoot, 'receipts');
const screenshotDir = path.join(artifactRoot, 'screenshots');
const reportPath = path.join(artifactRoot, 'vaultos-about-to-delete-proof-report.json');
const manifestMirrorPath = path.join(receiptMirrorDir, 'vaultos-manifest.json');
const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=6144'].filter(Boolean).join(' '),
  VAULTOS_PROOF_PASSPHRASE: 'vaultos-proof-passphrase-with-production-length',
  VAULTOS_PROOF_PEPPER: 'vaultos-proof-pepper-for-live-system-proof'
};
const steps = [];

function run(args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, ['tools/skye-vault-os.mjs', ...args], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024
  });
  const finishedAt = Date.now();
  assert.equal(result.error, undefined, `${args.join(' ')} could not start: ${result.error?.message || ''}`);
  if (options.expectFailure) {
    assert.notEqual(result.status, 0, `${args.join(' ')} should have failed`);
    return result;
  }
  assert.equal(result.status, 0, `${args.join(' ')} failed\nSTDOUT:\n${result.stdout.slice(0, 12000)}\nSTDERR:\n${result.stderr}`);
  steps.push({ command: args[0], args: args.map((arg) => String(arg).replace(/--passphrase-env=.*/, '--passphrase-env=[env-name]').replace(/--pepper-env=.*/, '--pepper-env=[env-name]')), ms: finishedAt - startedAt });
  return result;
}

function parse(result) {
  return JSON.parse(result.stdout);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertExists(file, label = file) {
  assert.ok(fs.existsSync(file), `${label} does not exist`);
}

assertExists(sourceRoot, 'real /about to delete folder');
assert.equal(fs.statSync(sourceRoot).isDirectory(), true, '/about to delete is not a directory');

fs.rmSync(artifactRoot, { recursive: true, force: true });
fs.rmSync(runtimeRoot, { recursive: true, force: true });
fs.mkdirSync(receiptMirrorDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const init = parse(run(['init', `--vault-dir=${vaultDir}`, '--workspace=about-to-delete-vaultos', '--actor=gray']));
assert.equal(init.ok, true);

const scan = parse(run([
  'scan',
  `--vault-dir=${vaultDir}`,
  `--root=${sourceRoot}`,
  '--include-node-modules=true',
  '--actor=gray'
]));
assert.equal(scan.ok, true);
assert.ok(scan.summary.fileCount > 0, 'scan found no files');
assert.ok(scan.summary.totalBytes > 0, 'scan found no bytes');
assert.ok(fs.existsSync(scan.scanPath), 'scan receipt missing');

const offload = parse(run([
  'offload',
  `--vault-dir=${vaultDir}`,
  `--root=${sourceRoot}`,
  '--include-node-modules=true',
  '--max-file-mb=512',
  '--workspace=about-to-delete-vaultos',
  '--repo=metraiyux-0s-about-to-delete',
  '--client=MetrAIyux 0S',
  '--project=Real About To Delete VaultOS Proof',
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER',
  '--actor=gray'
]));
assert.equal(offload.ok, true);
assert.equal(offload.source.fileCount, scan.summary.fileCount);
assert.equal(offload.source.plaintextBytes, scan.summary.totalBytes);
assert.ok(offload.items.length >= 1, 'offload did not create encrypted objects');
for (const item of offload.items) assertExists(item.objectPath, 'encrypted VaultOS object');
const packSetId = offload.packSetId;
const packIds = offload.packIds;

const inventory = parse(run(['inventory', `--vault-dir=${vaultDir}`]));
assert.equal(inventory.objectCount, offload.items.length);
assert.equal(inventory.objects.reduce((sum, item) => sum + item.fileCount, 0), scan.summary.fileCount);
assert.equal(inventory.types.dependency > 0 || inventory.types.code > 0, true, 'inventory did not classify real folder types');

const search = parse(run(['search', `--vault-dir=${vaultDir}`, '--query=skyemusicnexus', `--scan=${scan.scanPath}`, '--limit=20']));
assert.equal(search.ok, true);
assert.ok(search.fileMatchCount >= 1, 'search did not find known current quarantine files');

const grant = parse(run(['grant', `--vault-dir=${vaultDir}`, '--subject=skyerunner-vault-watch', '--role=auditor', `--pack-set-id=${packSetId}`, '--actor=gray']));
assert.equal(grant.subject.roles.includes('auditor'), true);

const policy = parse(run(['policy', `--vault-dir=${vaultDir}`]));
assert.ok(policy.policy.subjects['skyerunner-vault-watch'], 'SkyeRunners observer grant missing');

const verify = parse(run([
  'verify',
  `--vault-dir=${vaultDir}`,
  `--pack-set-id=${packSetId}`,
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(verify.payloadVerified, true);
assert.equal(verify.fileCount, scan.summary.fileCount);

const sourceDiff = parse(run([
  'diff',
  `--vault-dir=${vaultDir}`,
  `--pack-set-id=${packSetId}`,
  `--root=${sourceRoot}`,
  '--include-node-modules=true',
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(sourceDiff.ok, true);
assert.equal(sourceDiff.summary.changedCount, 0);
assert.equal(sourceDiff.summary.missingCount, 0);

const dryReload = parse(run([
  'reload',
  `--vault-dir=${vaultDir}`,
  `--pack-set-id=${packSetId}`,
  `--to=${reloadRoot}`,
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER',
  '--dry-run'
]));
assert.equal(dryReload.result.dryRun, true);
assert.equal(fs.existsSync(reloadRoot), false, 'dry reload wrote files');

const reload = parse(run([
  'reload',
  `--vault-dir=${vaultDir}`,
  `--pack-set-id=${packSetId}`,
  `--to=${reloadRoot}`,
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(reload.ok, true);
assert.equal(reload.result.restored.length, scan.summary.fileCount);

const reloadDiff = parse(run([
  'diff',
  `--vault-dir=${vaultDir}`,
  `--pack-set-id=${packSetId}`,
  `--root=${reloadRoot}`,
  '--include-node-modules=true',
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(reloadDiff.ok, true);
assert.equal(reloadDiff.summary.verifiedCount, scan.summary.fileCount);
assert.equal(reloadDiff.summary.changedCount, 0);
assert.equal(reloadDiff.summary.missingCount, 0);

const restorePoint = parse(run([
  'restore-point',
  `--vault-dir=${vaultDir}`,
  '--name=about-to-delete-before-any-delete',
  `--scan=${scan.scanPath}`,
  '--actor=gray'
]));
assert.equal(restorePoint.ok, true);
assertExists(restorePoint.restorePath, 'restore point file');
assert.equal(restorePoint.restorePoint.scanSummary.fileCount, scan.summary.fileCount);

const revoke = parse(run(['revoke', `--vault-dir=${vaultDir}`, '--subject=skyerunner-vault-watch', '--role=auditor', `--pack-set-id=${packSetId}`, '--actor=gray']));
assert.equal(revoke.subject.roles.includes('auditor'), false);

const ls = parse(run(['ls', `--vault-dir=${vaultDir}`]));
assert.equal(ls.ok, true);
assert.ok(ls.packSets.some((item) => item.packSetId === packSetId), 'ls did not list pack set');

const tree = parse(run(['tree', `--vault-dir=${vaultDir}`, `--scan=${scan.scanPath}`, '--format=json', '--limit=80']));
assert.equal(tree.ok, true);
assert.ok(tree.count > 0, 'tree did not return scan inventory nodes');

const catMeta = parse(run(['cat-meta', `--vault-dir=${vaultDir}`, `--pack-set-id=${packSetId}`]));
assert.equal(catMeta.ok, true);
assert.equal(catMeta.objects.length, packIds.length);

const manifest = parse(run(['manifest', `--vault-dir=${vaultDir}`, `--output=${manifestMirrorPath}`]));
assert.equal(manifest.ok, true);
assert.equal(manifest.counts.objects, offload.items.length);
assert.equal(manifest.deleteGate.evidence.offload, true);
assertExists(manifestMirrorPath, 'VaultOS manifest mirror');

const bundle = parse(run(['bundle', `--vault-dir=${vaultDir}`, `--to=${bundleRoot}`, '--force']));
assert.equal(bundle.ok, true);
assertExists(path.join(bundleRoot, 'SKYEVAULTOS_BUNDLE.json'), 'VaultOS bundle receipt');

const attach = parse(run(['attach', `--vault-dir=${attachedVaultDir}`, `--from=${bundleRoot}`, '--force']));
assert.equal(attach.ok, true);
const attachedInventory = parse(run(['inventory', `--vault-dir=${attachedVaultDir}`]));
assert.equal(attachedInventory.objectCount, offload.items.length);

const attachedVerify = parse(run([
  'verify',
  `--vault-dir=${attachedVaultDir}`,
  `--pack-set-id=${packSetId}`,
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(attachedVerify.payloadVerified, true);
assert.equal(attachedVerify.fileCount, scan.summary.fileCount);

const bundleReload = parse(run([
  'reload',
  `--vault-dir=${attachedVaultDir}`,
  `--pack-set-id=${packSetId}`,
  `--to=${bundleReloadRoot}`,
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(bundleReload.ok, true);
assert.equal(bundleReload.result.restored.length, scan.summary.fileCount);

const bundleReloadDiff = parse(run([
  'diff',
  `--vault-dir=${attachedVaultDir}`,
  `--pack-set-id=${packSetId}`,
  `--root=${bundleReloadRoot}`,
  '--include-node-modules=true',
  '--recipient=owner',
  '--passphrase-env=VAULTOS_PROOF_PASSPHRASE',
  '--pepper-env=VAULTOS_PROOF_PEPPER'
]));
assert.equal(bundleReloadDiff.ok, true);
assert.equal(bundleReloadDiff.summary.verifiedCount, scan.summary.fileCount);
assert.equal(bundleReloadDiff.summary.changedCount, 0);
assert.equal(bundleReloadDiff.summary.missingCount, 0);

let fs27Sync = null;
if ((env.FS27_SKYESECURE_WRITE_SECRET || env.SKYESECURE_WRITE_SECRET) && env.VAULTOS_SKIP_FS27_SYNC !== '1') {
  fs27Sync = parse(run([
    'fs27-sync',
    `--vault-dir=${vaultDir}`,
    `--origin=${env.SKYGATEFS27_ORIGIN || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev'}`,
    `--secret-env=${env.FS27_SKYESECURE_WRITE_SECRET ? 'FS27_SKYESECURE_WRITE_SECRET' : 'SKYESECURE_WRITE_SECRET'}`
  ]));
  assert.equal(fs27Sync.ok, true);
}

const audit = parse(run(['audit', `--vault-dir=${vaultDir}`]));
const actions = audit.events.map((event) => event.action);
for (const action of [
  'vaultos.initialized',
  'folder.scanned',
  'folder.offloaded',
  'access.granted',
  'pack.verified',
  'pack.diffed',
  'pack.reloaded',
  'restore-point.created',
  'access.revoked',
  'vault.manifest',
  'vault.bundle.created'
]) {
  assert.ok(actions.includes(action), `audit log missing ${action}`);
}

const appUrl = `file://${path.join(repoRoot, 'metraiyux_0s_site', 'skye-vault-os', 'index.html')}`;
const browser = await chromium.launch({
  headless: true,
  chromiumSandbox: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const browserResults = [];
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 940 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await page.setInputFiles('#scanFile', scan.scanPath);
    await page.setInputFiles('#indexFile', path.join(vaultDir, 'vault-index.json'));
    await page.setInputFiles('#policyFile', path.join(vaultDir, 'access-policy.json'));
    await page.setInputFiles('#auditFile', path.join(vaultDir, 'audit-log.jsonl'));
    await page.setInputFiles('#restoreFile', restorePoint.restorePath);
    await page.setInputFiles('#manifestFile', manifestMirrorPath);
    await page.click('#loadButton');
    await page.waitForSelector('text=Real About To Delete VaultOS Proof', { timeout: 10000 });
    const data = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      commandCount: document.querySelectorAll('[data-command-pill]').length,
      objectRows: document.querySelectorAll('#objects tbody tr').length,
      auditRows: document.querySelectorAll('#audit tbody tr').length,
      apiRows: document.querySelectorAll('#liveApi tbody tr').length,
      body: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth
    }));
    const screenshot = path.join(screenshotDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.close();
    assert.equal(consoleErrors.length, 0, `${viewport.name} console errors: ${consoleErrors.join('\n')}`);
    assert.ok(data.commandCount >= 18, `${viewport.name} missing command coverage pills`);
    assert.ok(data.objectRows >= 1, `${viewport.name} did not show VaultOS objects`);
    assert.ok(data.auditRows >= 8, `${viewport.name} did not show lifecycle audit rows`);
    assert.ok(data.apiRows >= 4, `${viewport.name} did not show FS27 API rows`);
    assert.ok(data.body.includes('/about to delete') || data.body.includes('about to delete'), `${viewport.name} did not identify protected folder`);
    assert.ok(data.scrollWidth <= data.innerWidth + 1, `${viewport.name} has horizontal overflow`);
    browserResults.push({ viewport, ...data, body: data.body.slice(0, 280), screenshot, consoleErrors });
  }
} finally {
  await browser.close();
}

assertExists(sourceRoot, 'real /about to delete folder after proof');

const objectHashes = [];
for (const item of offload.items) objectHashes.push(await hashFile(item.objectPath));
const objectSha256 = sha256Text(objectHashes.join('\n'));
const savedScan = readJson(scan.scanPath);
const savedRestorePoint = readJson(restorePoint.restorePath);
const mirroredReceipts = {
  scan: path.join(receiptMirrorDir, 'scan.json'),
  index: path.join(receiptMirrorDir, 'vault-index.json'),
  policy: path.join(receiptMirrorDir, 'access-policy.json'),
  audit: path.join(receiptMirrorDir, 'audit-log.jsonl'),
  restorePoint: path.join(receiptMirrorDir, 'restore-point.json'),
  manifest: manifestMirrorPath,
  bundle: path.join(bundleRoot, 'SKYEVAULTOS_BUNDLE.json')
};
fs.copyFileSync(scan.scanPath, mirroredReceipts.scan);
fs.copyFileSync(path.join(vaultDir, 'vault-index.json'), mirroredReceipts.index);
fs.copyFileSync(path.join(vaultDir, 'access-policy.json'), mirroredReceipts.policy);
fs.copyFileSync(path.join(vaultDir, 'audit-log.jsonl'), mirroredReceipts.audit);
fs.copyFileSync(restorePoint.restorePath, mirroredReceipts.restorePoint);
const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
  artifactRoot,
  runtimeRoot,
  realFolder: {
    path: sourceRoot,
    preserved: true,
    fileCount: scan.summary.fileCount,
    totalBytes: scan.summary.totalBytes,
    types: scan.summary.types,
    largestFiles: scan.summary.largestFiles.slice(0, 8)
  },
  vault: {
    vaultDir,
    packSetId,
    packIds,
    objectPaths: offload.items.map((item) => item.objectPath),
    objectSha256,
    encryptedBytes: offload.items.reduce((sum, item) => sum + Number(item.encryptedBytes || 0), 0),
    objectBytes: offload.items.reduce((sum, item) => sum + Number(item.bytes || 0), 0),
    restorePointPath: restorePoint.restorePath,
    restorePointId: savedRestorePoint.id,
    mirroredReceipts
  },
  commandProof: {
    commandsCovered: ['scan', 'offload', 'inventory', 'search', 'diff', 'verify', 'reload', 'restore-point', 'grant', 'revoke', 'audit', 'ls', 'tree', 'cat-meta', 'manifest', 'bundle', 'attach', 'fs27-sync'],
    steps,
    auditEvents: audit.count,
    sourceDiff: sourceDiff.summary,
    reloadDiff: reloadDiff.summary,
    bundleReloadDiff: bundleReloadDiff.summary,
    dryReloadWroteFiles: false,
    reloadRestoredFiles: reload.result.restored.length,
    bundleReloadRestoredFiles: bundleReload.result.restored.length,
    manifestPath: manifestMirrorPath,
    bundleDir: bundleRoot,
    attachedVaultDir,
    fs27Sync
  },
  consoleProof: {
    ok: true,
    appUrl,
    screenshots: browserResults.map((item) => item.screenshot),
    results: browserResults
  },
  scanReceipt: {
    path: scan.scanPath,
    schema: savedScan.schema,
    summary: savedScan.summary
  }
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  ok: report.ok,
  generatedAt: report.generatedAt,
  hierarchy: report.hierarchy,
  realFolder: report.realFolder,
  vault: report.vault,
  commandProof: report.commandProof,
  consoleProof: {
    ok: true,
    screenshots: report.consoleProof.screenshots
  },
  reportPath
}, null, 2));
