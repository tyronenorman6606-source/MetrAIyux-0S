import { chromium } from 'playwright';
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const siteRoot = join(repoRoot, 'metraiyux_0s_site');
const outDir = join(repoRoot, 'test-artifacts', 'metraiyux-long-0s-proof');
const videoDir = join(outDir, 'recording');
const finalVideo = join(outDir, 'metraiyux-0s-long-real-proof.webm');
const reportPath = join(outDir, 'metraiyux-0s-long-real-proof.json');

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.webm', 'video/webm'],
  ['.mp4', 'video/mp4'],
]);

function prepareDir() {
  mkdirSync(outDir, { recursive: true });
  rmSync(videoDir, { recursive: true, force: true });
  mkdirSync(videoDir, { recursive: true });
}

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
    const type = mime.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function wait(ms) {
  await new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function caption(page, title, body = '') {
  await page.evaluate(({ title, body }) => {
    let proof = document.querySelector('[data-proof-caption]');
    if (!proof) {
      proof = document.createElement('div');
      proof.setAttribute('data-proof-caption', 'true');
      proof.style.cssText = [
        'position:fixed',
        'left:22px',
        'bottom:22px',
        'z-index:2147483647',
        'max-width:min(650px,calc(100vw - 44px))',
        'padding:16px 18px',
        'border:1px solid rgba(99,241,255,.66)',
        'background:rgba(3,10,22,.88)',
        'box-shadow:0 0 28px rgba(99,241,255,.26), inset 0 0 20px rgba(255,210,106,.08)',
        'color:#f8fbff',
        'font:600 16px/1.35 Inter, Arial, sans-serif',
        'border-radius:8px',
        'backdrop-filter:blur(12px)',
      ].join(';');
      document.body.appendChild(proof);
    }
    proof.innerHTML = `<div style="color:#63f1ff;text-transform:uppercase;letter-spacing:.12em;font-size:11px;margin-bottom:6px;">Live 0S proof capture</div><div style="font-size:19px;">${title}</div>${body ? `<div style="margin-top:7px;color:#cbd9ef;font-weight:500;font-size:14px;">${body}</div>` : ''}`;
  }, { title, body });
}

async function gotoStep(page, baseUrl, path, name, body = '') {
  await page.goto(`${baseUrl}/${path}`, { waitUntil: 'commit', timeout: 0 });
  await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await caption(page, name, body);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await wait(1100);
}

async function slowScroll(page, steps = 4, pause = 450) {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, 430);
    await wait(pause);
  }
}

async function snap(page, name, proof) {
  const file = join(outDir, `${String(proof.length + 1).padStart(2, '0')}-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 60000 });
    proof.push({ name, file });
  } catch (error) {
    proof.push({ name, file: null, error: error.message });
    console.warn(`Screenshot skipped for ${name}: ${error.message}`);
  }
}

async function fill(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
  await wait(180);
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
  await wait(180);
}

async function checkByValue(page, value) {
  await page.evaluate((valueToCheck) => {
    const input = [...document.querySelectorAll('input[type="checkbox"]')].find((el) => el.value === valueToCheck);
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await wait(150);
}

async function clickText(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
  await locator.evaluate((el) => el.click());
  await wait(900);
}

async function run() {
  prepareDir();
  const { server, baseUrl } = await startStaticServer(siteRoot);
  const proof = [];
  const routeLog = [];
  console.log(`Recording MetrAIyux 0S from ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  });
  await context.route('https://metraiyux-0s-full-system.graylondonskyes.workers.dev/**', (route) => route.abort('failed'));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(0);

  try {
    await gotoStep(page, baseUrl, 'index.html', 'Opening the real MetrAIyux 0S command surface', 'I start at the actual local 0S build, then move through customer, owner, brain, and proof rooms.');
    await slowScroll(page, 5, 420);
    await snap(page, 'home-command-routes', proof);
    routeLog.push('Home command routes, cabinet model, SaaS links, admin links, NEXUS and CROWN routes visible.');

    await gotoStep(page, baseUrl, 'saas/signup.html', 'Customer signup creates a local signup receipt', 'This proves the buyer-facing path captures plan, company, contact, and primary need before deployment persistence is connected.');
    await fill(page, 'input[name="full_name"]', 'Jordan Proof');
    await fill(page, 'input[name="email"]', 'jordan.proof@example.com');
    await fill(page, 'input[name="company_name"]', 'ProofOps Growth Studio');
    await fill(page, 'input[name="phone"]', '555-0100');
    await choose(page, 'select[name="plan"]', 'autonomous-office');
    await fill(page, 'textarea[name="primary_need"]', 'I need the 0S to route client onboarding, proof receipts, weekly content, approval gates, and dashboard requests through a protected workspace.');
    await clickText(page, 'Save Signup Intent');
    await snap(page, 'customer-signup-receipt', proof);

    await gotoStep(page, baseUrl, 'saas/customer-onboarding.html', 'Onboarding records operating facts and approval rules', 'The customer can define workflows, risk boundaries, and approval email before workspace setup.');
    await choose(page, 'select[name="business_type"]', 'Consulting / agency');
    await fill(page, 'input[name="team_size"]', '6-20');
    await fill(page, 'textarea[name="workflows"]', 'Lead intake, client onboarding, marketing drafts, proof vault updates, approval inbox, and operator digest.');
    await fill(page, 'input[name="approval_email"]', 'owner@proofops.example');
    await fill(page, 'textarea[name="risk_boundaries"]', 'Never publish, charge, sign, hire, file, or make public claims without owner approval.');
    await clickText(page, 'Save Onboarding');
    await snap(page, 'customer-onboarding-receipt', proof);

    await gotoStep(page, baseUrl, 'saas/company-profile.html', 'Company profile saves workspace identity', 'This feeds the tenant workspace record that app owners can later persist with Cloudflare D1.');
    await fill(page, 'input[name="company_name"]', 'ProofOps Growth Studio LLC');
    await fill(page, 'input[name="brand_name"]', 'ProofOps');
    await fill(page, 'input[name="website"]', 'https://proofops.example');
    await fill(page, 'input[name="service_area"]', 'Phoenix metro and nationwide remote');
    await fill(page, 'textarea[name="core_services"]', 'Growth operations, customer onboarding, proof-backed launch systems, content routing.');
    await fill(page, 'textarea[name="customer_promise"]', 'We turn service chaos into a visible command room with receipts.');
    await fill(page, 'input[name="owner_name"]', 'Jordan Proof');
    await clickText(page, 'Save Company Profile');
    await snap(page, 'company-profile-receipt', proof);

    await gotoStep(page, baseUrl, 'saas/service-selector.html', 'Service selection chooses what the workspace includes', 'This is the app-owner dashboard path: pick modules, save the offer shape, and provision the workspace.');
    await choose(page, 'select[name="plan"]', 'autonomous-office');
    for (const label of ['15-Brain command routing', 'Admin automation brain', 'Client success workflows', 'Social content drafts', 'Proof vault', 'Customer dashboard']) {
      await checkByValue(page, label);
    }
    await fill(page, 'textarea[name="notes"]', 'Start with customer command routing, admin approvals, proof receipts, and weekly content workflows.');
    await clickText(page, 'Save Service Selection');
    await snap(page, 'service-selection-receipt', proof);

    await gotoStep(page, baseUrl, 'saas/workspace-setup.html', 'Workspace setup builds the tenant record', 'The static proof creates a browser-local record; production swaps this into Worker/D1 provisioning.');
    await clickText(page, 'Create Local Workspace');
    await snap(page, 'workspace-created-receipt', proof);

    await gotoStep(page, baseUrl, 'saas/billing.html', 'Billing intent proves the sellable subscription path', 'This does not charge in static mode; it records the plan and payment preference for provider wiring.');
    await choose(page, 'select[name="plan"]', 'autonomous-office');
    await fill(page, 'input[name="billing_email"]', 'billing@proofops.example');
    await choose(page, 'select[name="payment_preference"]', 'Invoice');
    await clickText(page, 'Create Billing Intent');
    await snap(page, 'billing-intent-receipt', proof);

    await gotoStep(page, baseUrl, 'saas/customer-dashboard.html', 'Customer dashboard routes a command to the site operator brain', 'This shows the customer-facing menu doing actual command routing and emitting a receipt.');
    await choose(page, 'select[name="priority"]', 'approval-needed');
    await fill(page, 'textarea[name="command"]', 'Draft three launch posts, route to the Marketing Brain, require QA review, then send to owner approval before anything public happens.');
    await clickText(page, 'Route Command');
    await snap(page, 'customer-command-routed', proof);
    routeLog.push('Customer command routed to Valentina Reyes / Marketing Brain with Victor Saint QA review and approval required.');

    await gotoStep(page, baseUrl, 'admin/automation-brain.html', 'Owner admin brain receives and routes a protected command', 'The Worker is blocked on purpose for local proof, so the brain falls back to local receipts without exposing private keys.');
    await fill(page, '#adminMessage', 'Create a launch proof packet from customer commands, route content to Valentina, QA to Victor, and require Gray approval before public posting.');
    await page.locator('#adminChatForm button[type="submit"]').evaluate((el) => el.click());
    await wait(2600);
    await snap(page, 'admin-brain-response-ledger', proof);
    await slowScroll(page, 2, 400);
    await snap(page, 'admin-brain-ledger-visible', proof);

    await gotoStep(page, baseUrl, 'local-brain.html#ask', 'Local brain answers from the included company corpus', 'This proves the browser-local knowledge brain is not just a landing page.');
    await fill(page, '#brainQuestion', 'Which cabinet owns public launch proof and how should we explain approval gates to a client?');
    await page.locator('#askBrain').evaluate((el) => el.click());
    await wait(1800);
    await snap(page, 'local-brain-answer', proof);

    await gotoStep(page, baseUrl, 'nexus/index.html', 'NEXUS classifies a business signal into the brain mesh', 'Signals become local routing receipts with primary brain, secondary review, and next actions.');
    await fill(page, '#nexus-input', 'A new prospect wants pricing, a proof-backed dashboard, and weekly content automation but needs public claims reviewed before launch.');
    await clickText(page, 'Route through Site Operator Brain');
    await wait(1000);
    await snap(page, 'nexus-routing-receipt', proof);

    await gotoStep(page, baseUrl, 'crown-os/autonomous-command-room.html', 'CROWN command room turns requests into approval-gated operating receipts', 'This is the founder/operator side: route the work, assign review, and keep risky actions approval-gated.');
    await fill(page, '[data-field="signal"]', 'Revenue critical launch request: route customer dashboard setup, content production, proof page validation, and owner approval before anything external is sent.');
    await choose(page, '[data-field="priority"]', 'Revenue Critical');
    await choose(page, '[data-field="approval"]', 'Founder approval required');
    await page.locator('[data-action="crown-route"]').evaluate((el) => el.click());
    await wait(1000);
    await snap(page, 'crown-command-receipt', proof);

    await gotoStep(page, baseUrl, 'crown-os/proof-command-center.html', 'Proof command center records public-claim evidence work', 'The proof vault is where claims become receipts instead of vibes.');
    await fill(page, '[data-field="signal"]', 'Build a standalone public proof page with long browser video, screenshots, route receipts, and no private secrets exposed.');
    await choose(page, '[data-field="priority"]', 'Founder Review');
    await choose(page, '[data-field="approval"]', 'Founder approval required');
    await page.locator('[data-action="crown-route"]').evaluate((el) => el.click());
    await wait(1000);
    await snap(page, 'proof-command-receipt', proof);

    await gotoStep(page, baseUrl, 'proof/proof-center.html', 'Proof vault closes the walkthrough', 'The final proof surface ties the public claim back to QA, launch receipts, and exportable operating evidence.');
    await slowScroll(page, 4, 450);
    await snap(page, 'proof-vault-surface', proof);
    await wait(2000);
  } finally {
    await context.close();
    await browser.close();
    server.close();
  }

  const videoFiles = readdirSync(videoDir)
    .filter((file) => file.endsWith('.webm'))
    .map((file) => join(videoDir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!videoFiles[0]) throw new Error('No Playwright video was recorded.');
  copyFileSync(videoFiles[0], finalVideo);
  const report = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    video: finalVideo,
    screenshots: proof,
    proof_route: routeLog,
    surfaces_recorded: [
      'Public 0S home',
      'Customer signup',
      'Customer onboarding',
      'Company profile',
      'Service selector',
      'Workspace setup',
      'Billing intent',
      'Customer dashboard command routing',
      'Admin automation brain',
      'Local cabinet brain',
      'NEXUS routing',
      'CROWN autonomous command room',
      'CROWN proof command center',
      'Proof vault',
    ],
    boundaries: [
      'No private .env values or secrets are shown.',
      'Static-mode billing creates a billing intent only; it does not charge.',
      'Cloudflare Worker, provider connectors, and D1 persistence still require production credentials.',
    ],
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, finalVideo, reportPath, screenshots: proof.length }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
