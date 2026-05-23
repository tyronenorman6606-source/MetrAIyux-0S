import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  buildPayloadFromFiles,
  buildSecretPack,
  collectFiles,
  decryptSecretPayload,
  hashFile,
  readSecretPack,
  restorePayloadFiles,
  writeSecretPack
} from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skye-secure-browser-proof');
const sourceRoot = path.join(artifactRoot, 'source');
const screenshotDir = path.join(artifactRoot, 'screenshots');
const packPath = path.join(artifactRoot, 'browser-passphrase.skyesecrets');
const browserCreatedPack = path.join(artifactRoot, 'browser-created.skyesecrets');
const browserCreatedRestore = path.join(artifactRoot, 'browser-created-restored');
const reportPath = path.join(artifactRoot, 'browser-report.json');
const passphrase = 'browser-proof-passphrase-with-real-length';
const pepper = 'browser-proof-pepper';

fs.rmSync(artifactRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(sourceRoot, 'private'), { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });
fs.writeFileSync(path.join(sourceRoot, '.env'), 'CLIENT_SECRET=FAKE_BROWSER_PROOF_ONLY\n');
fs.writeFileSync(path.join(sourceRoot, 'private', 'token.txt'), 'browser local restore token\n');

const collection = collectFiles({
  root: sourceRoot,
  paths: ['.env', 'private/token.txt']
});
const payload = buildPayloadFromFiles({ collection });
const { pack } = buildSecretPack({
  payload,
  recipients: [{
    type: 'passphrase',
    recipientId: 'owner',
    passphrase,
    pepper,
    hint: 'browser proof'
  }],
  metadata: {
    workspaceId: 'browser-proof-workspace',
    repoId: 'browser-proof-repo',
    clientName: 'Browser Proof Client',
    projectName: 'SkyeSecure Browser Proof',
    fileCount: collection.files.length,
    plaintextBytes: collection.plaintextBytes
  }
});
writeSecretPack(packPath, pack);

const appUrl = `file://${path.join(repoRoot, 'metraiyux_0s_site', 'skye-secure-secret-packs', 'app.html')}`;
const browser = await chromium.launch({
  headless: true,
  chromiumSandbox: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const results = [];
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 920 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, acceptDownloads: true });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const response = await page.goto(appUrl, { waitUntil: 'domcontentloaded' });

    await page.setInputFiles('#sourceFiles', sourceRoot);
    await page.fill('#createRecipientId', 'owner');
    await page.fill('#createWorkspace', 'browser-created-workspace');
    await page.fill('#createRepo', 'browser-created-repo');
    await page.fill('#createProject', 'Browser Created Pack');
    await page.fill('#createClient', 'Browser Proof Client');
    await page.fill('#createPassphrase', passphrase);
    await page.fill('#createPepper', pepper);
    const downloadPromise = page.waitForEvent('download');
    await page.click('#createPackButton');
    const download = await downloadPromise;
    if (viewport.name === 'desktop') await download.saveAs(browserCreatedPack);
    await page.waitForSelector('text=Created encrypted pack', { timeout: 10000 });

    await page.setInputFiles('#packFile', packPath);
    await page.click('#inspectButton');
    await page.fill('#recipientId', 'owner');
    await page.fill('#passphrase', passphrase);
    await page.fill('#pepper', pepper);
    await page.click('#unlockButton');
    await page.waitForSelector('text=Payload verified for 2 files.', { timeout: 10000 });
    const data = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      fileRows: document.querySelectorAll('#files tbody tr').length,
      downloadLinks: Array.from(document.querySelectorAll('#files a[download]')).map((item) => item.getAttribute('download')),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth
    }));
    const screenshot = path.join(screenshotDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await context.close();
    assert.equal(consoleErrors.length, 0, `${viewport.name} console errors: ${consoleErrors.join('\n')}`);
    assert.equal(data.fileRows, 2, `${viewport.name} did not render two decrypted files`);
    assert.ok(data.downloadLinks.includes('.env'), `${viewport.name} missing .env download`);
    assert.ok(data.scrollWidth <= data.innerWidth + 1, `${viewport.name} has horizontal overflow`);
    results.push({
      viewport,
      status: response?.status() || 0,
      ...data,
      screenshot,
      consoleErrors
    });
  }
} finally {
  await browser.close();
}

const browserPack = readSecretPack(browserCreatedPack);
const browserPayload = decryptSecretPayload(browserPack, {
  recipientId: 'owner',
  passphrase,
  pepper
}).payload;
const browserRestore = restorePayloadFiles({
  payload: browserPayload,
  root: browserCreatedRestore
});
assert.equal(browserRestore.conflicts.length, 0, 'browser-created pack restore had conflicts');
const restoredEnv = browserPayload.files.find((item) => item.path === '.env' || item.path.endsWith('/.env'));
const restoredToken = browserPayload.files.find((item) => item.path === 'token.txt' || item.path.endsWith('/token.txt'));
assert.ok(restoredEnv, 'browser-created pack did not include .env');
assert.ok(restoredToken, 'browser-created pack did not include token.txt');
assert.equal(fs.readFileSync(path.join(browserCreatedRestore, restoredEnv.path), 'utf8'), fs.readFileSync(path.join(sourceRoot, '.env'), 'utf8'));
assert.equal(fs.readFileSync(path.join(browserCreatedRestore, restoredToken.path), 'utf8'), fs.readFileSync(path.join(sourceRoot, 'private', 'token.txt'), 'utf8'));

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  appUrl,
  packPath,
  packSha256: await hashFile(packPath),
  browserCreatedPack,
  browserCreatedPackSha256: await hashFile(browserCreatedPack),
  browserCreatedNodeDecrypt: {
    ok: true,
    fileCount: browserPayload.files.length,
    restoredRoot: browserCreatedRestore
  },
  results
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
