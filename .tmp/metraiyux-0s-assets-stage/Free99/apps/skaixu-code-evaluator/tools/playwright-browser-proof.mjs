import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(process.argv[2] || process.cwd());
const proofDir = path.join(rootDir, 'proof', 'browser');
const proofPath = path.join(proofDir, 'playwright-proof.json');

async function tryImportPlaywright() {
  try { return await import('playwright'); }
  catch (error) {
    await mkdir(proofDir, { recursive: true });
    const skipped = { status: 'skipped', reason: 'playwright_not_installed', detail: error.message, generatedAt: new Date().toISOString() };
    await writeFile(proofPath, `${JSON.stringify(skipped, null, 2)}\n`);
    console.log('☐ Playwright browser proof skipped: install playwright to run real browser E2E.');
    console.log(`receipt=${path.relative(rootDir, proofPath)}`);
    process.exit(0);
  }
}

function mime(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function serveStatic() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
      const full = path.resolve(rootDir, rel);
      if (full !== rootDir && !full.startsWith(`${rootDir}${path.sep}`)) throw new Error('path_escape');
      res.setHeader('content-type', mime(full));
      createReadStream(full).on('error', () => { res.statusCode = 404; res.end('not found'); }).pipe(res);
    } catch (error) {
      res.statusCode = 400;
      res.end(String(error.message || error));
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const { chromium } = await tryImportPlaywright();
const server = await serveStatic();
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;
const receipt = { status: 'running', generatedAt: new Date().toISOString(), url, checks: [] };
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const landingTitle = await page.title();
  receipt.checks.push({ name: 'landing-title', pass: /skAIxu Code Evaluator Platform/i.test(landingTitle), evidence: landingTitle });
  const launchLinks = await page.locator('a[href="app.html"]').count();
  receipt.checks.push({ name: 'landing-launch-links', pass: launchLinks >= 2, evidence: `count=${launchLinks}` });
  await page.goto(`${url}app.html`, { waitUntil: 'domcontentloaded' });
  const requiredIds = ['dropZone', 'tab-workspace', 'tab-platform', 'tab-seed', 'tab-backplane', 'saveWorkspaceBtn', 'runBackplaneAuditBtn', 'workspaceVersionOut', 'buildExecutionOut', 'taskReceiptOut'];
  for (const id of requiredIds) {
    const count = await page.locator(`#${id}`).count();
    receipt.checks.push({ name: `ui-id:${id}`, pass: count > 0, evidence: `count=${count}` });
  }
  await page.click('[data-tab="platform"]');
  receipt.checks.push({ name: 'platform-tab-click', pass: await page.locator('#tab-platform').isVisible(), evidence: 'platform tab visible' });
  await page.click('[data-tab="backplane"]');
  receipt.checks.push({ name: 'backplane-tab-click', pass: await page.locator('#tab-backplane').isVisible(), evidence: 'backplane tab visible' });
  const title = await page.title();
  receipt.checks.push({ name: 'app-document-title', pass: Boolean(title) && /App|Evaluator/i.test(title), evidence: title });
  receipt.status = receipt.checks.every(c => c.pass) ? 'passed' : 'needs-work';
} catch (error) {
  receipt.status = 'failed';
  receipt.error = error.message;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.close();
  receipt.finishedAt = new Date().toISOString();
  await mkdir(proofDir, { recursive: true });
  await writeFile(proofPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`${receipt.status === 'passed' ? '✅' : '☐'} playwright-browser-proof ${receipt.status}`);
  console.log(`receipt=${path.relative(rootDir, proofPath)}`);
  if (receipt.status === 'failed') process.exit(1);
}
