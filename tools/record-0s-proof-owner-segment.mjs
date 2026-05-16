import { chromium } from 'playwright';
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const siteRoot = join(repoRoot, 'metraiyux_0s_site');
const outDir = join(repoRoot, 'test-artifacts', 'metraiyux-long-0s-proof');
const videoDir = join(outDir, 'owner-recording');
const finalVideo = join(outDir, 'metraiyux-0s-owner-brain-proof.webm');

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
]);

function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = resolve(root, `.${pathname}`);
    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': mime.get(extname(filePath).toLowerCase()) || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      resolveServer({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function caption(page, title, body = '') {
  await page.evaluate(({ title, body }) => {
    let proof = document.querySelector('[data-proof-caption]');
    if (!proof) {
      proof = document.createElement('div');
      proof.setAttribute('data-proof-caption', 'true');
      proof.style.cssText = 'position:fixed;left:22px;bottom:22px;z-index:2147483647;max-width:min(670px,calc(100vw - 44px));padding:16px 18px;border:1px solid rgba(99,241,255,.68);background:rgba(3,10,22,.9);box-shadow:0 0 28px rgba(99,241,255,.26),inset 0 0 20px rgba(255,210,106,.08);color:#f8fbff;font:600 16px/1.35 Inter,Arial,sans-serif;border-radius:8px;backdrop-filter:blur(12px)';
      document.body.appendChild(proof);
    }
    proof.innerHTML = `<div style="color:#63f1ff;text-transform:uppercase;letter-spacing:.12em;font-size:11px;margin-bottom:6px;">Live 0S owner proof capture</div><div style="font-size:19px;">${title}</div>${body ? `<div style="margin-top:7px;color:#cbd9ef;font-weight:500;font-size:14px;">${body}</div>` : ''}`;
  }, { title, body });
}

async function gotoStep(page, baseUrl, path, title, body = '') {
  console.log(`step: ${path}`);
  await page.goto(`${baseUrl}/${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await caption(page, title, body);
  await wait(1300);
}

async function fill(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
  await wait(250);
}

async function choose(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const option = [...el.options].find((item) => item.value === value || item.textContent.trim() === value);
    if (option) el.value = option.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
  await wait(250);
}

async function click(page, selector) {
  await page.locator(selector).first().evaluate((el) => el.click());
  await wait(1300);
}

async function textClick(page, text) {
  await page.getByText(text, { exact: true }).first().evaluate((el) => el.click());
  await wait(1300);
}

async function snap(page, name, shots) {
  const file = join(outDir, `${String(20 + shots.length).padStart(2, '0')}-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 30000 });
    shots.push({ name, file });
  } catch (error) {
    shots.push({ name, error: error.message });
  }
}

async function run() {
  mkdirSync(outDir, { recursive: true });
  rmSync(videoDir, { recursive: true, force: true });
  mkdirSync(videoDir, { recursive: true });
  const { server, baseUrl } = await startStaticServer(siteRoot);
  const shots = [];
  let context;
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox', '--disable-extensions'],
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
    });
    await context.route('https://metraiyux-0s-full-system.graylondonskyes.workers.dev/**', (route) => route.abort('failed'));
    const page = await context.newPage();
    page.setDefaultTimeout(12000);

    await gotoStep(page, baseUrl, 'saas/billing.html', 'Billing intent proves the sellable subscription path', 'Static proof records plan and payment preference without charging anyone.');
    await choose(page, 'select[name="plan"]', 'autonomous-office');
    await fill(page, 'input[name="billing_email"]', 'billing@proofops.example');
    await choose(page, 'select[name="payment_preference"]', 'Invoice');
    await textClick(page, 'Create Billing Intent');
    await snap(page, 'owner-segment-billing-intent', shots);

    await gotoStep(page, baseUrl, 'saas/customer-dashboard.html', 'Customer dashboard routes a command from the buyer menu', 'This is the customer-side command surface creating a route receipt.');
    await choose(page, 'select[name="priority"]', 'approval-needed');
    await fill(page, 'textarea[name="command"]', 'Draft three launch posts, route to the Marketing Brain, require QA review, then send to owner approval before anything public happens.');
    await textClick(page, 'Route Command');
    await snap(page, 'owner-segment-customer-command', shots);

    await gotoStep(page, baseUrl, 'admin/automation-brain.html', 'Owner admin brain routes work across the operating brains', 'Worker calls are blocked for local proof, so the admin brain records a local receipt instead of exposing secrets.');
    await fill(page, '#adminMessage', 'Create a launch proof packet from customer commands, route content to Valentina, QA to Victor, and require Gray approval before public posting.');
    await click(page, '#adminChatForm button[type="submit"]');
    await wait(2600);
    await snap(page, 'owner-segment-admin-brain', shots);

    await gotoStep(page, baseUrl, 'local-brain.html#ask', 'Local brain answers from the included company corpus', 'The knowledge brain searches the local cabinet docs and returns usable operating guidance.');
    await fill(page, '#brainQuestion', 'Which cabinet owns public launch proof and how should we explain approval gates to a client?');
    await click(page, '#askBrain');
    await wait(1800);
    await snap(page, 'owner-segment-local-brain', shots);

    await gotoStep(page, baseUrl, 'nexus/index.html', 'NEXUS classifies a business signal into the brain mesh', 'The system creates a routing receipt with primary brain, secondary review, and next actions.');
    await fill(page, '#nexus-input', 'A new prospect wants pricing, a proof-backed dashboard, and weekly content automation but needs public claims reviewed before launch.');
    await textClick(page, 'Route through Site Operator Brain');
    await snap(page, 'owner-segment-nexus', shots);

    await gotoStep(page, baseUrl, 'crown-os/autonomous-command-room.html', 'CROWN command room creates an approval-gated operating receipt', 'Founder/operator view: classify work, assign review, and keep external action behind approval.');
    await fill(page, '[data-field="signal"]', 'Revenue critical launch request: route customer dashboard setup, content production, proof page validation, and owner approval before anything external is sent.');
    await choose(page, '[data-field="priority"]', 'Revenue Critical');
    await choose(page, '[data-field="approval"]', 'Founder approval required');
    await click(page, '[data-action="crown-route"]');
    await snap(page, 'owner-segment-crown-command', shots);

    await gotoStep(page, baseUrl, 'crown-os/proof-command-center.html', 'Proof command center records evidence work', 'Claims become receipts, screenshots, and browser proof instead of unsupported marketing copy.');
    await fill(page, '[data-field="signal"]', 'Build a standalone public proof page with long browser video, screenshots, route receipts, and no private secrets exposed.');
    await choose(page, '[data-field="priority"]', 'Founder Review');
    await choose(page, '[data-field="approval"]', 'Founder approval required');
    await click(page, '[data-action="crown-route"]');
    await snap(page, 'owner-segment-proof-command', shots);

    await gotoStep(page, baseUrl, 'proof/proof-center.html', 'Proof vault closes the walkthrough', 'The public proof page will link to this long browser capture and the supporting state screenshots.');
    await page.mouse.wheel(0, 700);
    await wait(900);
    await page.mouse.wheel(0, 700);
    await wait(1500);
    await snap(page, 'owner-segment-proof-vault', shots);
  } finally {
    if (context) {
      await context.close().catch((error) => console.warn(`context close warning: ${error.message}`));
    }
    if (browser) await browser.close().catch(() => {});
    server.close();
  }

  const videoFiles = readdirSync(videoDir)
    .filter((file) => file.endsWith('.webm'))
    .map((file) => join(videoDir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!videoFiles[0]) throw new Error('No owner segment video was recorded.');
  copyFileSync(videoFiles[0], finalVideo);
  writeFileSync(join(outDir, 'owner-segment-report.json'), `${JSON.stringify({ generated_at: new Date().toISOString(), finalVideo, shots }, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, finalVideo, screenshots: shots.length }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
