import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { hashFile } from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skye-secure-platform-proof');
const sourceRoot = path.join(artifactRoot, 'about-to-delete-fixture');
const reloadRoot = path.join(artifactRoot, 'reloaded');
const vaultDir = path.join(artifactRoot, 'vault');
const screenshotDir = path.join(artifactRoot, 'screenshots');
const reportPath = path.join(artifactRoot, 'platform-proof-report.json');
const env = {
  ...process.env,
  PLATFORM_PASS: 'platform-proof-passphrase-with-real-length',
  PLATFORM_PEPPER: 'platform-proof-pepper'
};

function run(args, options = {}) {
  const result = spawnSync(process.execPath, ['tools/skye-secure-platform.mjs', ...args], {
    cwd: repoRoot,
    env,
    encoding: 'utf8'
  });
  assert.equal(result.error, undefined, `${args.join(' ')} could not start: ${result.error?.message || ''}`);
  if (options.expectFailure) {
    assert.notEqual(result.status, 0, `${args.join(' ')} should have failed`);
    return result;
  }
  assert.equal(result.status, 0, `${args.join(' ')} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  return result;
}

function parse(result) {
  return JSON.parse(result.stdout);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

fs.rmSync(artifactRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(sourceRoot, 'private'), { recursive: true });
fs.mkdirSync(path.join(sourceRoot, 'docs'), { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });
fs.writeFileSync(path.join(sourceRoot, '.env'), 'DATABASE_URL=postgres://fake:test@localhost/skye\n');
fs.writeFileSync(path.join(sourceRoot, 'private', 'service-account.credentials.json'), JSON.stringify({
  client_email: 'fake-platform@example.test',
  private_key: '-----BEGIN PRIVATE KEY-----\\nFAKE_ONLY\\n-----END PRIVATE KEY-----\\n'
}, null, 2));
fs.writeFileSync(path.join(sourceRoot, 'docs', 'handoff.md'), '# Local handoff\n\nThis folder should round-trip from the platform vault.\n');

const init = parse(run(['init', `--vault-dir=${vaultDir}`, '--workspace=platform-proof']));
assert.equal(init.ok, true);

const offload = parse(run([
  'offload',
  `--vault-dir=${vaultDir}`,
  `--root=${sourceRoot}`,
  '--workspace=platform-proof',
  '--repo=fixture-repo',
  '--client=Fixture Client',
  '--project=About To Delete Offload Proof',
  '--recipient=owner',
  '--passphrase-env=PLATFORM_PASS',
  '--pepper-env=PLATFORM_PEPPER',
  '--actor=gray'
]));
assert.equal(offload.ok, true);
assert.equal(offload.item.fileCount, 3);
assert.equal(offload.source.types.environment, 1);
assert.equal(offload.source.types.credential, 1);
assert.ok(fs.existsSync(offload.item.objectPath), 'offloaded pack object missing');

const packId = offload.item.packId;
const inventory = parse(run(['inventory', `--vault-dir=${vaultDir}`]));
assert.equal(inventory.objectCount, 1);
assert.equal(inventory.types.environment, 1);
assert.equal(inventory.types.credential, 1);

const searchEnv = parse(run(['search', `--vault-dir=${vaultDir}`, '--type=environment']));
assert.equal(searchEnv.matchCount, 1);

const grant = parse(run(['grant', `--vault-dir=${vaultDir}`, '--subject=dev-a', '--role=developer', `--pack-id=${packId}`, '--actor=gray']));
assert.equal(grant.subject.roles.includes('developer'), true);

const policy = parse(run(['policy', `--vault-dir=${vaultDir}`]));
assert.ok(policy.policy.subjects['dev-a'], 'developer subject was not persisted');

const verify = parse(run([
  'verify',
  `--vault-dir=${vaultDir}`,
  `--pack-id=${packId}`,
  '--recipient=owner',
  '--passphrase-env=PLATFORM_PASS',
  '--pepper-env=PLATFORM_PEPPER'
]));
assert.equal(verify.payloadVerified, true);
assert.equal(verify.fileCount, 3);

const dryReload = parse(run([
  'reload',
  `--vault-dir=${vaultDir}`,
  `--pack-id=${packId}`,
  `--to=${reloadRoot}`,
  '--recipient=owner',
  '--passphrase-env=PLATFORM_PASS',
  '--pepper-env=PLATFORM_PEPPER',
  '--dry-run'
]));
assert.equal(dryReload.result.dryRun, true);
assert.equal(fs.existsSync(path.join(reloadRoot, '.env')), false);

const reload = parse(run([
  'reload',
  `--vault-dir=${vaultDir}`,
  `--pack-id=${packId}`,
  `--to=${reloadRoot}`,
  '--recipient=owner',
  '--passphrase-env=PLATFORM_PASS',
  '--pepper-env=PLATFORM_PEPPER'
]));
assert.equal(reload.ok, true);
assert.equal(read(path.join(reloadRoot, '.env')), read(path.join(sourceRoot, '.env')));
assert.equal(read(path.join(reloadRoot, 'private', 'service-account.credentials.json')), read(path.join(sourceRoot, 'private', 'service-account.credentials.json')));
assert.equal(read(path.join(reloadRoot, 'docs', 'handoff.md')), read(path.join(sourceRoot, 'docs', 'handoff.md')));

const revoke = parse(run(['revoke', `--vault-dir=${vaultDir}`, '--subject=dev-a', '--role=developer', `--pack-id=${packId}`, '--actor=gray']));
assert.equal(revoke.subject.roles.includes('developer'), false);

const audit = parse(run(['audit', `--vault-dir=${vaultDir}`]));
const actions = audit.events.map((event) => event.action);
for (const action of ['vault.initialized', 'folder.offloaded', 'access.granted', 'pack.verified', 'pack.reloaded', 'access.revoked']) {
  assert.ok(actions.includes(action), `audit log missing ${action}`);
}

const appUrl = `file://${path.join(repoRoot, 'metraiyux_0s_site', 'skye-secure-platform', 'index.html')}`;
const browser = await chromium.launch({
  headless: true,
  chromiumSandbox: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const browserResults = [];
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 920 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const response = await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await page.setInputFiles('#indexFile', path.join(vaultDir, 'vault-index.json'));
    await page.setInputFiles('#policyFile', path.join(vaultDir, 'access-policy.json'));
    await page.setInputFiles('#auditFile', path.join(vaultDir, 'audit-log.jsonl'));
    await page.click('#loadButton');
    await page.waitForSelector('text=About To Delete Offload Proof', { timeout: 10000 });
    await page.fill('#typeInput', 'environment');
    await page.click('#searchButton');
    const data = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      objectRows: document.querySelectorAll('#objects tbody tr').length,
      policyRows: document.querySelectorAll('#policy tbody tr').length,
      auditRows: document.querySelectorAll('#audit tbody tr').length,
      body: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth
    }));
    const screenshot = path.join(screenshotDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.close();
    assert.equal(consoleErrors.length, 0, `${viewport.name} console errors: ${consoleErrors.join('\n')}`);
    assert.equal(data.objectRows, 1, `${viewport.name} did not show one searched object`);
    assert.ok(data.policyRows >= 1, `${viewport.name} did not render policy rows`);
    assert.ok(data.auditRows >= 1, `${viewport.name} did not render audit rows`);
    assert.ok(data.body.includes('environment:1'), `${viewport.name} did not show environment type`);
    assert.ok(data.scrollWidth <= data.innerWidth + 1, `${viewport.name} has horizontal overflow`);
    browserResults.push({ viewport, status: response?.status() || 0, ...data, body: data.body.slice(0, 240), screenshot, consoleErrors });
  }
} finally {
  await browser.close();
}

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  artifactRoot,
  vaultDir,
  packId,
  objectPath: offload.item.objectPath,
  objectSha256: await hashFile(offload.item.objectPath),
  platformConsole: {
    ok: true,
    appUrl,
    results: browserResults
  },
  assertions: {
    offloadEncryptedObjectCreated: true,
    inventoryTracksObjectAndTypes: true,
    searchFindsEnvironmentType: true,
    accessGrantAndRevokePersist: true,
    verifyDecryptsPayload: true,
    dryReloadDoesNotWrite: true,
    reloadRestoresMatchingBytes: true,
    auditLogRecordsLifecycle: true,
    platformConsoleLoadsSearchesAndRendersEvidence: true
  }
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
