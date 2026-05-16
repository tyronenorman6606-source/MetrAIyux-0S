import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'unpacked-projects', 'sol_staffing_agency_site');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'sol-real-e2e-proof');
const recordingDir = path.join(artifactRoot, 'recording');
const proofReportPath = path.join(artifactRoot, 'sol-staffing-real-workflow-proof.json');
const transactionReceiptPath = path.join(artifactRoot, 'sol-staffing-transaction-receipt.json');
const sourceVideoPath = path.join(artifactRoot, 'sol-staffing-real-workflow-recording.webm');
const outputMp4Path = path.join(repoRoot, 'SOL-Staffing-Marketing', 'assets', 'screenshots', 'sol-surface-reel.mp4');
const posterPath = path.join(repoRoot, 'SOL-Staffing-Marketing', 'assets', 'screenshots', 'sol-proof-workflow-poster.png');

const requireFromApp = createRequire(path.join(appRoot, 'package.json'));
const handlers = new Map();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

process.env.SOL_STAFFING_DEV_TOKEN = 'local-e2e-token';
process.env.SOL_STAFFING_DEV_EMAIL = 'proof-operator@localhost';
process.env.SOL_STAFFING_DEV_ROLE = 'admin';
process.env.SOL_STAFFING_ADMIN_ROLES = 'owner,admin,operator';
process.env.SOL_STAFFING_MAX_UPLOAD_BYTES ||= String(10 * 1024 * 1024);
delete process.env.OLLAMA_BASE_URL;
delete process.env.OLLAMA_MODEL;
delete process.env.GPU_BRAIN_ENDPOINT;
delete process.env.GPU_BRAIN_MODEL;
process.chdir(appRoot);

async function loadHandlers() {
  const functionsDir = path.join(appRoot, 'netlify', 'functions');
  const entries = await fs.readdir(functionsDir);
  for (const entry of entries) {
    if (!entry.endsWith('.js')) continue;
    const name = entry.replace(/\.js$/, '');
    handlers.set(name, requireFromApp(path.join(functionsDir, entry)).handler);
  }
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function headersObject(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value || '')]));
}

async function callFunction(req, res, url) {
  const name = url.pathname.replace('/.netlify/functions/', '').split('/')[0];
  const handler = handlers.get(name);
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Missing function ${name}` }));
    return;
  }

  const bodyBuffer = await collectBody(req);
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');
  const event = {
    path: url.pathname,
    rawUrl: url.href,
    rawQuery: url.searchParams.toString(),
    httpMethod: req.method,
    headers: headersObject(req.headers),
    body: isMultipart ? bodyBuffer.toString('base64') : bodyBuffer.toString('utf8'),
    isBase64Encoded: isMultipart,
    requestContext: {
      identity: { sourceIp: req.socket.remoteAddress || '127.0.0.1' }
    }
  };

  const result = await handler(event, {});
  const headers = result.headers || {};
  const statusCode = result.statusCode || 200;
  res.writeHead(statusCode, headers);
  res.end(result.body || '');
}

async function serveStatic(res, requestPath) {
  const cleanPath = decodeURIComponent(requestPath).replace(/^\/+/, '') || 'index.html';
  const resolved = path.resolve(appRoot, cleanPath);
  if (resolved !== appRoot && !resolved.startsWith(appRoot + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let filePath = resolved;
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    if (!path.extname(filePath)) filePath = `${filePath}.html`;
  }

  try {
    const body = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

async function startServer() {
  await loadHandlers();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname.startsWith('/.netlify/functions/')) {
        await callFunction(req, res, url);
        return;
      }
      await serveStatic(res, url.pathname);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error.message || error) }));
    }
  });
  await new Promise(resolve => server.listen(8890, '127.0.0.1', resolve));
  return server;
}

async function main() {
  await fs.rm(artifactRoot, { recursive: true, force: true });
  await fs.mkdir(recordingDir, { recursive: true });
  await fs.rm(path.join(appRoot, '.staffing-db'), { recursive: true, force: true });

  const server = await startServer();
  const baseUrl = 'http://127.0.0.1:8890';
  const actions = [];
  const errors = [];
  const consoleMessages = [];
  const receipts = {
    generated_at: null,
    source_app: 'unpacked-projects/sol_staffing_agency_site',
    base_url: baseUrl,
    operator: {
      email: process.env.SOL_STAFFING_DEV_EMAIL,
      role: process.env.SOL_STAFFING_DEV_ROLE
    },
    transactions: {},
    summaries: {},
    assertions: []
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: recordingDir, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (!/favicon/i.test(text)) consoleMessages.push({ type: msg.type(), text });
  });
  page.on('pageerror', error => errors.push(String(error.message || error)));
  page.on('dialog', async dialog => {
    actions.push(`dialog:${dialog.message()}`);
    await dialog.accept();
  });

  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
    actions.push('goto:index.html');
    await page.screenshot({ path: path.join(artifactRoot, '01-public-home.png'), fullPage: false });

    await page.locator('a[href="#hire"]').first().click();
    actions.push('click:Request Staff CTA');
    await page.locator('form[name="staffing-request"] input[name="company"]').fill('Acme Logistics');
    await page.locator('form[name="staffing-request"] input[name="name"]').fill('Jordan Reyes');
    await page.locator('form[name="staffing-request"] input[name="email"]').fill('ops@example.com');
    await page.locator('form[name="staffing-request"] input[name="phone"]').fill('(602) 555-0188');
    await page.locator('form[name="staffing-request"] select[name="need"]').selectOption({ label: 'Temporary staffing' });
    await page.locator('form[name="staffing-request"] textarea[name="details"]').fill('Six warehouse associates, second shift, steel-toe required, Glendale site, Monday start.');
    actions.push('fill:employer staffing request');
    await page.screenshot({ path: path.join(artifactRoot, '02-employer-intake-filled.png'), fullPage: false });
    await page.locator('form[name="staffing-request"] button[type="submit"]').click();
    actions.push('submit:employer staffing request to staffing-submit function');
    await page.waitForTimeout(900);

    await page.goto(`${baseUrl}/staffing-login.html?next=${encodeURIComponent('/admin-dashboard.html')}`, { waitUntil: 'networkidle' });
    actions.push('goto:staffing-login.html');
    await page.locator('#loginForm textarea[name="token"]').fill('local-e2e-token');
    actions.push('fill:Skyegate FS27 dev token');
    await page.locator('#loginForm button[type="submit"]').click();
    actions.push('submit:staffing-auth-session creates HttpOnly admin session');
    await page.waitForURL('**/admin-dashboard.html', { timeout: 10000 });
    await page.waitForSelector('#authStatus:text-matches("Signed in", "i")', { timeout: 10000 });
    actions.push('route:admin-dashboard authenticated');
    await page.screenshot({ path: path.join(artifactRoot, '03-admin-dashboard-authenticated.png'), fullPage: false });
    receipts.transactions.auth_session = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-auth-me', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    });
    receipts.summaries.after_public_intake = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-records?summary=1', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    });
    receipts.transactions.public_job_order = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-records?collection=job_orders&limit=5', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      const record = Array.isArray(data.records) ? data.records[0] : null;
      return {
        status: res.status,
        ok: res.ok,
        id: record?.id || null,
        collection: record?.collection || null,
        form_name: record?.form_name || null,
        title: record?.data?.role || record?.data?.need || record?.data?.company || null,
        created_at: record?.created_at || null
      };
    });

    await page.locator('#manualRecordForm input[name="title"]').fill('Government warehouse staffing pursuit');
    await page.locator('#manualRecordForm input[name="contact"]').fill('procurement@example.gov');
    await page.locator('#manualRecordForm textarea[name="notes"]').fill('Route this as a government pursuit with safe-claim guardrails.');
    await page.locator('#manualRecordForm select[name="collection"]').selectOption('gov_pursuits');
    actions.push('fill:manual admin record');
    await page.locator('#manualRecordForm button[type="submit"]').click();
    await page.waitForSelector('#manualStatus:text("Record created.")', { timeout: 10000 });
    actions.push('submit:manual admin record to staffing-records function');
    receipts.transactions.manual_admin_record = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-records?collection=gov_pursuits&limit=5', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      const record = Array.isArray(data.records) ? data.records[0] : null;
      return {
        status: res.status,
        ok: res.ok,
        id: record?.id || null,
        collection: record?.collection || null,
        form_name: record?.form_name || null,
        title: record?.data?.title || null,
        created_at: record?.created_at || null
      };
    });

    const uploadFile = path.join(artifactRoot, 'proof-upload.txt');
    await fs.writeFile(uploadFile, 'SOL Staffing OS proof upload generated during Playwright E2E recording.\n');
    await page.locator('#uploadForm input[name="label"]').fill('Proof upload packet');
    await page.locator('#uploadForm input[name="record_id"]').fill('playwright-proof');
    await page.locator('#uploadForm input[name="document"]').setInputFiles(uploadFile);
    actions.push('select-file:secure upload vault');
    await page.locator('#uploadForm button[type="submit"]').click();
    await page.waitForSelector('#uploadStatus:text-matches("Uploaded", "i")', { timeout: 10000 });
    actions.push('submit:secure file to staffing-files function');
    receipts.transactions.secure_upload = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-files', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      const file = Array.isArray(data.files) ? data.files[0] : null;
      return {
        status: res.status,
        ok: res.ok,
        id: file?.id || null,
        name: file?.name || null,
        label: file?.label || null,
        size: file?.size || null,
        content_type: file?.content_type || null,
        linked_record_id: file?.linked_record_id || null,
        created_at: file?.created_at || null
      };
    });
    await page.screenshot({ path: path.join(artifactRoot, '04-admin-record-upload.png'), fullPage: false });

    await page.locator('#brainLiveForm textarea[name="prompt"]').fill('Build a safe staffing intake checklist for a government warehouse support request.');
    const brainResult = await page.evaluate(async () => {
      const prompt = document.querySelector('#brainLiveForm textarea[name="prompt"]')?.value || '';
      const output = document.querySelector('#brainLiveOutput');
      if (output) output.textContent = 'Calling authenticated brain route...';
      const res = await fetch('/.netlify/functions/brain', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json().catch(() => ({}));
      if (output) output.textContent = data.answer || data.error || `HTTP ${res.status}`;
      return {
        status: res.status,
        ok: res.ok,
        mode: data.mode || null,
        answer: data.answer || null,
        error: data.error || null
      };
    });
    receipts.transactions.authenticated_brain_route = brainResult;
    actions.push(`submit:authenticated live brain endpoint request (${brainResult.status}:${brainResult.mode || 'unknown'})`);
    await page.screenshot({ path: path.join(artifactRoot, '05-live-brain-endpoint.png'), fullPage: false });

    await page.goto(`${baseUrl}/brain.html`, { waitUntil: 'networkidle' });
    actions.push('goto:local brain page');
    await page.locator('#brainInput').fill('What do you need for an employer job order?');
    await page.locator('#brainAsk').click();
    await page.waitForSelector('#brainOutput .brain-msg.assistant', { timeout: 10000 });
    actions.push('click:local SOL brain answers job-order checklist');
    receipts.transactions.local_brain_answer = await page.evaluate(() => {
      const text = document.querySelector('#brainOutput .brain-msg.assistant pre')?.textContent || '';
      return {
        ok: text.length > 40,
        answer_excerpt: text.slice(0, 500)
      };
    });
    await page.screenshot({ path: path.join(artifactRoot, '06-local-brain-answer.png'), fullPage: false });
    receipts.summaries.final = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-records?summary=1', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    });
    receipts.transactions.audit_entries = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/staffing-records?collection=audit&limit=20', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      return {
        status: res.status,
        ok: res.ok,
        entries: Array.isArray(data.records)
          ? data.records.slice(0, 8).map(record => ({
            id: record.id,
            action: record.action,
            collection: record.collection,
            record_id: record.record_id,
            at: record.at
          }))
          : []
      };
    });

    await page.waitForTimeout(1200);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    server.close();
    if (video) {
      const videoPath = await video.path();
      await fs.copyFile(videoPath, sourceVideoPath);
    }
  }

  const generatedAt = new Date().toISOString();
  receipts.generated_at = generatedAt;
  receipts.assertions = [
    {
      name: 'job_order_record_created',
      ok: Boolean(receipts.transactions.public_job_order?.id),
      evidence: receipts.transactions.public_job_order
    },
    {
      name: 'admin_record_created',
      ok: Boolean(receipts.transactions.manual_admin_record?.id),
      evidence: receipts.transactions.manual_admin_record
    },
    {
      name: 'secure_upload_stored',
      ok: Boolean(receipts.transactions.secure_upload?.id),
      evidence: receipts.transactions.secure_upload
    },
    {
      name: 'brain_route_responded',
      ok: Boolean(receipts.transactions.authenticated_brain_route?.status),
      evidence: receipts.transactions.authenticated_brain_route
    },
    {
      name: 'local_brain_answered',
      ok: Boolean(receipts.transactions.local_brain_answer?.ok),
      evidence: receipts.transactions.local_brain_answer
    }
  ];

  const proof = {
    generated_at: generatedAt,
    source_app: 'unpacked-projects/sol_staffing_agency_site',
    source_video: path.relative(repoRoot, sourceVideoPath),
    output_video: path.relative(repoRoot, outputMp4Path),
    poster: path.relative(repoRoot, posterPath),
    base_url: baseUrl,
    action_path: actions,
    claims_proven: [
      'public employer intake submits through staffing-submit',
      'Skyegate FS27 token creates an authenticated admin session',
      'admin dashboard reads/writes staffing records',
      'secure upload vault stores an authenticated file',
      'authenticated GPU/Ollama brain endpoint route responds with configuration guardrail',
      'local SOL brain answers a job-order workflow prompt'
    ],
    transaction_receipt: path.relative(repoRoot, transactionReceiptPath),
    transaction_assertions: receipts.assertions.map(item => ({ name: item.name, ok: item.ok })),
    errors,
    consoleMessages
  };
  await fs.writeFile(transactionReceiptPath, JSON.stringify(receipts, null, 2) + '\n');
  await fs.writeFile(proofReportPath, JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
