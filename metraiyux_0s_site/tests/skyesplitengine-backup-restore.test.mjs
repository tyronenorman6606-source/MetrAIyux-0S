import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const SITE_ROOT = path.resolve(path.dirname(__filename), '..');
const GATE_TOKEN = 'skyesplitengine-backup-proof-token';
const STORE_KEY = 'SKYE_SPLIT_ENGINE_STATE_V3';
const PROOF_MEMO = 'SPLIT no data loss proof';

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8']
]);

function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const clean = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      let filePath = path.resolve(root, clean);
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
      const body = await readFile(filePath);
      res.writeHead(200, {'content-type': TYPES.get(path.extname(filePath)) || 'text/plain; charset=utf-8'});
      res.end(body);
    } catch {
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
      res.end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({server, baseUrl: `http://127.0.0.1:${address.port}`});
    });
  });
}

async function seedGate(context) {
  await context.addInitScript((token) => {
    const session = {
      token,
      source: 'skyesplitengine-backup-proof',
      client: 'MetrAIyux 0S Free99 Split Engine backup proof',
      status: 'free99_gate_session',
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem('SKYE_SPLIT_ENGINE_GATE_SESSION', JSON.stringify(session));
    sessionStorage.setItem('skye_split_engine_session', token);
    localStorage.setItem('saas_client_session', JSON.stringify({
      token,
      workspace_id: 'skyesplitengine-backup-proof',
      client: 'MetrAIyux 0S Free99 Split Engine backup proof',
      email: 'split-backup-proof@metraiyux.local',
      status: 'active'
    }));
  }, GATE_TOKEN);
}

function coreState(state) {
  return {
    people: state.people.map(({id, name, role, active}) => ({id, name, role, active})),
    products: state.products.map(({id, name, category, price, defaultRuleId, active}) => ({id, name, category, price, defaultRuleId, active})),
    rules: state.rules.map(({id, name, lines}) => ({id, name, lines: lines.map(({id: lineId, personId, type, value}) => ({id: lineId, personId, type, value}))})),
    txns: state.txns.map(({id, amount, currency, memo, status, productId, ruleId, externalRef}) => ({id, amount, currency, memo, status, productId, ruleId, externalRef}))
  };
}

async function stateFromPage(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
}

test('SPLIT-01/SPLIT-02 preserves local-first truth and proves JSON/CSV no-data-loss paths', async () => {
  const {server, baseUrl} = await startStaticServer(SITE_ROOT);
  const browser = await chromium.launch({headless: true});
  const pageErrors = [];

  try {
    const context = await browser.newContext({
      viewport: {width: 1440, height: 1000},
      acceptDownloads: true
    });
    await seedGate(context);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto(`${baseUrl}/SkyeSplitEngine/index.html`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.SSE && !document.querySelector('#skyeSplitGate'));
    const bodyText = await page.locator('body').innerText();
    assert.match(bodyText, /Local-first/);
    assert.match(bodyText, /Exportable/);

    await page.click('#calcBtn');
    await page.fill('#c_amount', '1234.56');
    await page.fill('#c_memo', PROOF_MEMO);
    await page.click('#c_save');
    await page.getByText(PROOF_MEMO, {exact: false}).first().waitFor({state: 'visible'});

    const before = await stateFromPage(page);
    const proofTxn = before.txns.find((txn) => txn.memo === PROOF_MEMO);
    assert.ok(proofTxn, 'proof transaction should exist before backup');

    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#quickBackup')
    ]);
    const backupPath = await jsonDownload.path();
    const backupText = await readFile(backupPath, 'utf8');
    const backup = JSON.parse(backupText);
    assert.deepEqual(coreState(backup), coreState(before));

    await page.evaluate(({key, state}) => {
      localStorage.setItem(key, JSON.stringify({...state, txns: []}));
    }, {key: STORE_KEY, state: before});
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.SSE && !document.querySelector('#skyeSplitGate'));
    assert.equal((await stateFromPage(page)).txns.length, 0);

    await page.locator('button[data-page="backup"]').click();
    await page.setInputFiles('#restoreFile', {
      name: 'skye-split-backup-proof.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupText)
    });
    await page.waitForFunction(({key, memo}) => {
      return JSON.parse(localStorage.getItem(key)).txns.some((txn) => txn.memo === memo);
    }, {key: STORE_KEY, memo: PROOF_MEMO});
    const restored = await stateFromPage(page);
    assert.deepEqual(coreState(restored), coreState(backup));

    await page.locator('button[data-page="backup"]').click();
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportAllTxns')
    ]);
    const csvText = await readFile(await csvDownload.path(), 'utf8');
    assert.match(csvText, /"SPLIT no data loss proof"/);
    assert.match(csvText, /"1234.56"/);

    await page.evaluate(({key, state}) => {
      localStorage.setItem(key, JSON.stringify({...state, txns: []}));
    }, {key: STORE_KEY, state: restored});
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.SSE && !document.querySelector('#skyeSplitGate'));
    await page.locator('button[data-page="txns"]').click();
    await page.setInputFiles('#importTxnsFile', {
      name: 'transactions-proof.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvText)
    });
    await page.waitForFunction(({key, memo}) => {
      return JSON.parse(localStorage.getItem(key)).txns.some((txn) => txn.memo === memo && Number(txn.amount) === 1234.56);
    }, {key: STORE_KEY, memo: PROOF_MEMO});
    const imported = await stateFromPage(page);
    const importedProof = imported.txns.find((txn) => txn.memo === PROOF_MEMO);
    assert.equal(importedProof.amount, 1234.56);
    assert.equal(importedProof.currency, proofTxn.currency);
    assert.equal(importedProof.status, proofTxn.status);

    assert.deepEqual(pageErrors, []);
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
