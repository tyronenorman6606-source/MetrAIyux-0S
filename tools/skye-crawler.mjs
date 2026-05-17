import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { request as playwrightRequest, chromium } from 'playwright';

const CRAWLER_NAME = 'SkyeCrawler';
const CRAWLER_VERSION = '1.1.0';
const SITE_DIR = process.env.SITE_DIR || '/workspaces/MetrAIyux-0S/metraiyux_0s_site';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || '/workspaces/MetrAIyux-0S/test-artifacts/skye-crawler';
const REPORT_PATH = process.env.REPORT_PATH || '/workspaces/MetrAIyux-0S/test-artifacts/skye-crawler-report.json';
const SKIP_API = process.env.SKIP_API === '1' || process.env.SKIP_API === 'true';
const CRAWLER_PROFILE = process.env.SKYE_CRAWLER_PROFILE || (process.env.SKYEPAY_SCAN ? 'skyepay' : 'metraiyux-0s');
const BROWSER_CONCURRENCY = Number(process.env.SKYE_CRAWLER_CONCURRENCY || 1);
const BROWSER_BATCH_SIZE = Number(process.env.SKYE_CRAWLER_BATCH_SIZE || 25);
const BROWSER_ACTION_TIMEOUT = Number(process.env.SKYE_CRAWLER_ACTION_TIMEOUT || 12000);
const BROWSER_NAVIGATION_TIMEOUT = Number(process.env.SKYE_CRAWLER_NAVIGATION_TIMEOUT || 30000);

mkdirSync(ARTIFACT_DIR, { recursive: true });

const report = {
  crawler: CRAWLER_NAME,
  version: CRAWLER_VERSION,
  started_at: new Date().toISOString(),
  site_dir: SITE_DIR,
  base_url: BASE_URL,
  profile: CRAWLER_PROFILE,
  mode: CRAWLER_PROFILE === 'skyepay' ? 'skyepay-fs27-payment-lane' : (SKIP_API ? 'static-surface-crawl' : 'worker-or-live-crawl'),
  checks: [],
  failures: [],
  warnings: [],
  artifacts: [],
};

function record(name, ok, details = {}) {
  report.checks.push({ name, ok, ...details });
  if (!ok) report.failures.push({ name, ...details });
}

function warn(name, details = {}) {
  report.warnings.push({ name, ...details });
}

function checkpoint(stage) {
  report.last_checkpoint = { stage, at: new Date().toISOString() };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[${CRAWLER_NAME}] ${stage}`);
}

function failText(error) {
  return String(error?.stack || error?.message || error).split('\n').slice(0, 5).join('\n').slice(0, 1000);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (['.git', '.wrangler', 'node_modules', 'coming-soon', 'live'].includes(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(SITE_DIR, file).split(path.sep).join('/');
}

function urlFor(relativePath) {
  return new URL(relativePath, BASE_URL).href;
}

async function canReach(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureSkyePayDevServer() {
  if (CRAWLER_PROFILE !== 'skyepay') return null;
  if (process.env.SKYE_CRAWLER_SKYEPAY_AUTOSTART === '0') return null;

  const healthUrl = urlFor('skyepay.html?client=bobs-smoke-shop&dry_run=1');
  if (await canReach(healthUrl)) {
    record('server:skyepay-dev-existing', true, { healthUrl });
    return null;
  }

  let port = '4197';
  try {
    port = new URL(BASE_URL).port || port;
  } catch {}

  const logs = [];
  const child = spawn(process.execPath, ['scripts/skyepay-dev-server.mjs'], {
    cwd: SITE_DIR,
    env: { ...process.env, SKYPAY_DEV_PORT: port },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const capture = (chunk) => {
    logs.push(String(chunk).trim().slice(0, 500));
    while (logs.length > 8) logs.shift();
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) break;
    if (await canReach(healthUrl)) {
      record('server:skyepay-dev-autostart', true, { healthUrl, port });
      return { child, logs };
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const details = { healthUrl, port, exitCode: child.exitCode, logs };
  record('server:skyepay-dev-autostart', false, details);
  child.kill('SIGTERM');
  throw new Error(`SkyePay dev server did not start: ${JSON.stringify(details)}`);
}

async function stopSkyePayDevServer(server) {
  if (!server?.child || server.child.killed) return;
  server.child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 1500);
    server.child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function isIgnoredHref(value) {
  return !value ||
    value.startsWith('#') ||
    /^mailto:|^tel:|^sms:|^javascript:|^data:/i.test(value);
}

function extractLocalReferences(html, pageUrl) {
  const refs = [];
  const attrRe = /\s(?:href|src)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(attrRe)) {
    const raw = match[1].trim();
    if (isIgnoredHref(raw)) continue;
    if (raw.includes('${')) continue;
    let absolute;
    try {
      absolute = new URL(raw, pageUrl);
    } catch {
      refs.push({ raw, error: 'invalid URL' });
      continue;
    }
    if (absolute.origin === new URL(BASE_URL).origin) {
      absolute.hash = '';
      refs.push({ raw, url: absolute.href });
    }
  }
  return refs;
}

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    chromiumSandbox: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

async function checkHttpInventory(api, htmlFiles) {
  const badPages = [];
  let checked = 0;
  for (const file of htmlFiles) {
    const pageUrl = urlFor(rel(file));
    try {
      const res = await api.get(pageUrl, { timeout: 10000 });
      const text = await res.text();
      if (!res.ok() || !text.includes('<html')) badPages.push({ url: pageUrl, status: res.status(), bytes: text.length });
    } catch (error) {
      badPages.push({ url: pageUrl, error: failText(error) });
    }
    checked += 1;
    if (checked % 100 === 0 || checked === htmlFiles.length) {
      console.log(`[${CRAWLER_NAME}] HTTP pages: ${checked}/${htmlFiles.length}`);
    }
  }
  record('http:all-html-pages-load', badPages.length === 0, { total: htmlFiles.length, bad: badPages.slice(0, 50) });
}

async function checkLinkedLocalFiles(api, htmlFiles) {
  const refs = new Map();
  const invalid = [];
  for (const file of htmlFiles) {
    const pageUrl = urlFor(rel(file));
    const html = readFileSync(file, 'utf8');
    for (const item of extractLocalReferences(html, pageUrl)) {
      if (item.error) invalid.push({ page: pageUrl, ...item });
      else if (!refs.has(item.url)) refs.set(item.url, []);
      if (!item.error) refs.get(item.url).push(pageUrl);
    }
  }
  const bad = [];
  let checked = 0;
  for (const [url, pages] of refs.entries()) {
    try {
      const res = await api.get(url, { timeout: 10000 });
      if (!res.ok()) bad.push({ url, status: res.status(), referenced_by: pages.slice(0, 8), ref_count: pages.length });
    } catch (error) {
      bad.push({ url, error: failText(error), referenced_by: pages.slice(0, 8), ref_count: pages.length });
    }
    checked += 1;
    if (checked % 100 === 0 || checked === refs.size) {
      console.log(`[${CRAWLER_NAME}] linked refs: ${checked}/${refs.size}`);
    }
  }
  record('links:local-href-src-resolve', bad.length === 0 && invalid.length === 0, {
    unique_refs: refs.size,
    checked,
    invalid: invalid.slice(0, 20),
    bad: bad.slice(0, 80),
  });
}

async function browserSweep(browser, htmlFiles, viewport) {
  const bad = [];
  const soft = [];
  let finished = 0;
  const total = htmlFiles.length;

  async function runBatch(batchFiles) {
    const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
    let index = 0;

    async function worker() {
      const page = await context.newPage();
      page.setDefaultTimeout(BROWSER_ACTION_TIMEOUT);
      page.setDefaultNavigationTimeout(BROWSER_NAVIGATION_TIMEOUT);
      while (index < batchFiles.length) {
        const file = batchFiles[index++];
        const pageUrl = urlFor(rel(file));
        const consoleErrors = [];
        const pageErrors = [];
        const responseErrors = [];
        const requestFailures = [];
        try {
          page.removeAllListeners();
          page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
          });
          page.on('pageerror', (error) => pageErrors.push(error.message));
          page.on('response', (response) => {
            if (response.url().startsWith(BASE_URL) && response.status() >= 400) {
              responseErrors.push({ url: response.url(), status: response.status() });
            }
          });
          page.on('requestfailed', (request) => {
            if (request.url().startsWith(BASE_URL)) {
              const error = request.failure()?.errorText || 'request failed';
              if (!error.includes('ERR_ABORTED')) requestFailures.push({ url: request.url(), error });
            }
          });
          const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: BROWSER_NAVIGATION_TIMEOUT });
          await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(150);
          let layout;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              layout = await page.evaluate(() => ({
                title: document.title,
                bodyLength: document.body?.innerText?.trim().length || 0,
                horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 3,
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
              }));
              break;
            } catch (error) {
              if (!/Execution context was destroyed|Cannot find context/i.test(error.message) || attempt === 1) throw error;
              await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
              await page.waitForTimeout(250);
            }
          }
          const hard = !response?.ok() || !layout.bodyLength || responseErrors.length || requestFailures.length || pageErrors.length;
          if (hard) {
            bad.push({
              url: pageUrl,
              status: response?.status() || 0,
              layout,
              consoleErrors: consoleErrors.slice(0, 5),
              pageErrors: pageErrors.slice(0, 5),
              responseErrors: responseErrors.slice(0, 8),
              requestFailures: requestFailures.slice(0, 8),
            });
          } else if (consoleErrors.length || layout.horizontalOverflow) {
            soft.push({ url: pageUrl, layout, consoleErrors: consoleErrors.slice(0, 5) });
          }
        } catch (error) {
          bad.push({ url: pageUrl, error: failText(error) });
        }
        finished += 1;
        if (finished % 25 === 0 || finished === total) {
          console.log(`[${CRAWLER_NAME}] browser ${viewport.width}x${viewport.height}: ${finished}/${total}`);
        }
      }
      await page.close().catch(() => {});
    }

    await Promise.all(Array.from({ length: BROWSER_CONCURRENCY }, worker));
    await context.close().catch(() => {});
  }

  for (let start = 0; start < total; start += BROWSER_BATCH_SIZE) {
    await runBatch(htmlFiles.slice(start, start + BROWSER_BATCH_SIZE));
  }

  record(`browser:${viewport.width}x${viewport.height}:all-html-runtime`, bad.length === 0, {
    total,
    bad: bad.slice(0, 80),
  });
  if (soft.length) warn(`browser:${viewport.width}x${viewport.height}:soft-observations`, { total: soft.length, sample: soft.slice(0, 40) });
}

async function screenshot(browser, relativePath, label, viewport) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(urlFor(relativePath), { waitUntil: 'networkidle', timeout: 20000 });
  const file = path.join(ARTIFACT_DIR, `${label}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.artifacts.push(file);
  await context.close();
}

async function checkLocalBrain(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(urlFor('local-brain.html'), { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#brainStatus')?.textContent?.includes('Ready'), null, { timeout: 15000 });
  await page.fill('#brainQuestion', 'Which cabinet owns government contracting readiness and what proof should a buyer see?');
  await page.click('#askBrain');
  const result = await page.locator('#brainAnswer').innerText();
  const sources = await page.locator('#brainSources .source-card').count();
  const answered = /Local answer|Primary:/i.test(result) && sources > 0;
  record('flow:local-brain-ask-and-sources', answered, { sources, result_preview: result.slice(0, 400) });
  await context.close();
}

async function checkPersonaBrain(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(urlFor('person-brains.html'), { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#personaStatus')?.textContent?.includes('Ready'), null, { timeout: 15000 });
  await page.selectOption('#brainSelector', { index: 4 });
  await page.fill('#personaQuestion', 'What do you own and what should not be claimed yet?');
  await page.click('#askPersonaBrain');
  const result = await page.locator('#personaAnswer').innerText();
  const cards = await page.locator('#brainCards .brain-card').count();
  const sources = await page.locator('#personaSources .source-card').count();
  record('flow:persona-brain-select-ask-and-sources', cards >= 16 && result.length > 120 && sources > 0, {
    brain_cards: cards,
    sources,
    result_preview: result.slice(0, 400),
  });
  await context.close();
}

async function checkProofRouter(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(urlFor('sales/live-proof-router.html'), { waitUntil: 'networkidle' });
  await page.check('#buyerSignals input[value*="proof"]');
  await page.check('#buyerSignals input[value*="client"]');
  await page.click('#buildRoute');
  const title = await page.locator('#routeTitle').innerText();
  const count = await page.locator('#surfaceResults .surface-result').count();
  const talk = await page.locator('#talkTrack').innerText();
  record('flow:live-proof-router-builds-route', title.includes('Show') && count >= 1 && talk.includes('deployable operating surface'), { title, count, talk_preview: talk.slice(0, 300) });
  await context.close();
}

async function checkCalculator(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(urlFor('calculators/staffing-margin.html'), { waitUntil: 'networkidle' });
  await page.fill('#bill', '55');
  await page.fill('#pay', '30');
  await page.fill('#hrs', '40');
  await page.fill('#heads', '3');
  await page.click('button:has-text("Calculate")');
  const out = await page.locator('#out').innerText();
  record('flow:staffing-margin-calculates', out.includes('Monthly revenue') && out.includes('Gross margin'), { output: out });
  await context.close();
}

async function checkLocalTool(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(urlFor('admin/risk-register.html'), { waitUntil: 'networkidle' });
  await page.fill('input[name="recordName"]', 'E2E client readiness risk');
  await page.fill('input[name="owner"]', 'Operations');
  await page.fill('textarea[name="notes"]', 'Customer-facing proof needs one last review.');
  await page.click('[data-save]');
  const output = page.locator('.tool-output').first();
  const saved = await output.innerText();
  const storage = await page.evaluate(() => localStorage.getItem('omega-tool:risk-register'));
  await page.click('[data-clear]');
  const cleared = await output.innerText();
  record('flow:admin-local-tool-save-clear', saved.includes('Saved locally') && storage?.includes('E2E client readiness risk') && cleared.includes('Cleared'), {
    saved_preview: saved.slice(0, 300),
    cleared,
  });
  await context.close();
}

async function checkSaasTools(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(urlFor('saas/signup.html'), { waitUntil: 'networkidle' });
  const hasTool = await page.evaluate(() => Boolean(window.SaaSUpgrade?.saveSignup));
  const inputs = await page.locator('form input, form textarea, form select').count();
  if (hasTool && inputs) {
    const firstInput = page.locator('form input, form textarea').first();
    await firstInput.fill('e2e@example.com');
    await page.evaluate(() => window.SaaSUpgrade.saveSignup());
  }
  const receipt = await page.locator('#signupReceipt').innerText().catch(() => '');
  record('flow:saas-signup-local-receipt', hasTool && receipt.includes('signup_intent'), { hasTool, inputs, receipt_preview: receipt.slice(0, 400) });
  await context.close();
}

async function checkClientOsForm(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(urlFor('client-os/onboarding-wizard.html'), { waitUntil: 'networkidle' });
  await page.fill('#company', 'E2E Customer Co');
  await page.fill('#primary-contact', 'Test Operator');
  await page.click('button:has-text("Save Local Record")');
  const out = await page.locator('#out-onboarding-wizard').innerText();
  const storage = await page.evaluate(() => localStorage.getItem('ultra-onboarding-wizard'));
  record('flow:client-os-onboarding-save', out.includes('Saved locally') && storage?.includes('E2E Customer Co'), {
    output_preview: out.slice(0, 300),
  });
  await context.close();
}

async function checkWorkerApi(api) {
  const status = await api.get(urlFor('api/site-operator/status'));
  const statusText = await status.text();
  record('api:site-operator-status-local', status.ok() && statusText.includes('"ok"'), { status: status.status(), body_preview: statusText.slice(0, 300) });

  const route = await api.post(urlFor('api/site-operator/route'), {
    data: { message: 'E2E proof routing check for a buyer who needs deployment evidence.' },
    headers: { 'content-type': 'application/json' },
  });
  const routeText = await route.text();
  record('api:site-operator-route-local', route.ok() && routeText.includes('primary_brain'), { status: route.status(), body_preview: routeText.slice(0, 500) });
}

function secretSignals(value) {
  return /(sk_live_|sk_test_|rk_live_|rk_test_|whsec_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|NETLIFY_DATABASE_URL|DATABASE_URL=)/i.test(String(value || ''));
}

async function responseJson(response) {
  const text = await response.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

async function checkSkyePayLinkedAssets(api) {
  const htmlPath = path.join(SITE_DIR, 'skyepay.html');
  const exists = existsSync(htmlPath);
  record('inventory:skyepay-html-exists', exists, { htmlPath });
  if (!exists) return;

  const refs = extractLocalReferences(readFileSync(htmlPath, 'utf8'), urlFor('skyepay.html?client=bobs-smoke-shop&dry_run=1'))
    .filter((ref) => ref.url);
  const bad = [];
  for (const ref of refs) {
    try {
      const res = await api.get(ref.url, { timeout: 10000 });
      if (!res.ok()) bad.push({ url: ref.url, status: res.status(), raw: ref.raw });
    } catch (error) {
      bad.push({ url: ref.url, error: failText(error), raw: ref.raw });
    }
  }
  record('links:skyepay-local-href-src-resolve', bad.length === 0, {
    unique_refs: refs.length,
    bad: bad.slice(0, 40)
  });
}

async function checkSkyePayHttp(api) {
  const page = await api.get(urlFor('skyepay.html?client=bobs-smoke-shop&dry_run=1'), { timeout: 12000 });
  const pageText = await page.text();
  record('http:skyepay-public-app-loads', page.ok() && pageText.includes('SkyePay') && pageText.includes('skypayForm'), {
    status: page.status(),
    bytes: pageText.length
  });

  const offersRes = await api.get(urlFor('.netlify/functions/skyepay-offers?client=metraiyux-0s'), { timeout: 12000 });
  const offers = await responseJson(offersRes);
  record('api:skyepay-offers-catalog', offersRes.ok() &&
    offers.json?.ok === true &&
    offers.json?.offers?.length >= 60 &&
    offers.json?.repo_stripe_catalog?.imported_checkout_offers >= 50 &&
    offers.json?.platform_routes?.length >= 4, {
    status: offersRes.status(),
    offers: offers.json?.offers?.length || 0,
    imported_checkout_offers: offers.json?.repo_stripe_catalog?.imported_checkout_offers || 0,
    catalog_source: offers.json?.repo_stripe_catalog?.source || null,
    platform_routes: offers.json?.platform_routes?.length || 0,
    client: offers.json?.client?.client_name || null
  });
  record('security:skyepay-offers-no-secret-signals', !secretSignals(offers.text), {
    bytes: offers.text.length
  });

  const corsProbe = await api.get(urlFor('.netlify/functions/skyepay-offers?client=metraiyux-0s'), {
    headers: { origin: 'https://not-approved.example' },
    timeout: 12000
  });
  const allowOrigin = corsProbe.headers()['access-control-allow-origin'] || '';
  record('security:skyepay-unlisted-origin-not-cors-granted', !allowOrigin, { allowOrigin });

  const invalidRes = await api.post(urlFor('.netlify/functions/skyepay-checkout'), {
    headers: { 'content-type': 'application/json' },
    data: {
      client_slug: 'metraiyux-0s',
      offer_id: 'metraiyux-routex-workforce-command',
      customer_name: 'Scanner Invalid',
      customer_email: 'not-an-email',
      company_name: 'Scanner Co',
      dry_run: true,
      idempotency_key: 'scanner_invalid_email'
    },
    timeout: 12000
  });
  const invalid = await responseJson(invalidRes);
  record('api:skyepay-checkout-rejects-invalid-email', invalidRes.status() === 400 && /customer_email/i.test(invalid.text), {
    status: invalidRes.status(),
    body_preview: invalid.text.slice(0, 260)
  });

  const checkoutRes = await api.post(urlFor('.netlify/functions/skyepay-checkout'), {
    headers: { 'content-type': 'application/json' },
    data: {
      client_slug: 'metraiyux-0s',
      offer_id: 'metraiyux-routex-workforce-command',
      customer_name: 'Scanner Operator',
      customer_email: 'scanner@example.com',
      company_name: 'RouteX Scanner Co',
      dry_run: true,
      idempotency_key: `scanner_${Date.now()}`
    },
    timeout: 12000
  });
  const checkout = await responseJson(checkoutRes);
  const checkoutUrl = checkout.json?.url || '';
  const checkoutOrigin = checkoutUrl ? new URL(checkoutUrl).origin : '';
  const baseOrigin = new URL(BASE_URL).origin;
  record('api:skyepay-checkout-dry-run-return-origin', checkoutRes.ok() && checkout.json?.ok === true && checkoutOrigin === baseOrigin, {
    status: checkoutRes.status(),
    checkoutOrigin,
    baseOrigin,
    approval_status: checkout.json?.approval_status || null
  });
  record('security:skyepay-checkout-no-secret-signals', !secretSignals(checkout.text), {
    bytes: checkout.text.length
  });

  const demoSession = checkout.json?.id || '';
  const statusRes = await api.get(urlFor(`.netlify/functions/skyepay-status?demo_session=${encodeURIComponent(demoSession)}&offer=metraiyux-routex-workforce-command`), { timeout: 12000 });
  const status = await responseJson(statusRes);
  record('api:skyepay-status-demo-public-safe', statusRes.ok() && status.json?.order?.approval_status === 'demo_pending_owner_approval' && status.json?.order?.provisioning_status === 'waiting_for_owner_approval' && !secretSignals(status.text), {
    status: statusRes.status(),
    order_keys: Object.keys(status.json?.order || {})
  });

  const contractTargets = [
    ['docs', 'skyepay-api.html', /SkyePay API/i],
    ['manifest', 'skyepay-api.json', /"skyepay-api"/i],
    ['openapi', 'openapi/skyepay.openapi.json', /"openapi"\s*:\s*"3\.1\.0"/i],
    ['sdk', 'assets/skyepay-client.js', /SkyePayClient/]
  ];
  const contractResults = [];
  for (const [name, route, expected] of contractTargets) {
    const res = await api.get(urlFor(route), { timeout: 12000 });
    const text = await res.text();
    contractResults.push({
      name,
      route,
      status: res.status(),
      ok: res.ok() && expected.test(text) && !secretSignals(text),
      bytes: text.length
    });
  }
  record('api:skyepay-contract-assets-load', contractResults.every((result) => result.ok), {
    assets: contractResults
  });
}

async function checkSkyePayPublicSource() {
  const sourceFiles = [
    'skyepay.html',
    'skyepay-store.html',
    'skyepay-api.html',
    'skyepay-api.json',
    'openapi/skyepay.openapi.json',
    'assets/skyepay.css',
    'assets/skyepay.js',
    'assets/skyepay-store.js',
    'assets/skyepay-client.js',
    'assets/skyepay-motion.mjs'
  ];
  const missing = [];
  const bodies = [];
  for (const relPath of sourceFiles) {
    const file = path.join(SITE_DIR, relPath);
    if (!existsSync(file)) missing.push(relPath);
    else bodies.push(readFileSync(file, 'utf8'));
  }
  const source = bodies.join('\n');
  record('security:skyepay-public-source-no-secret-signals', missing.length === 0 && !secretSignals(source), {
    files: sourceFiles,
    missing
  });
  record('content:skyepay-public-copy-avoids-website-language', !/\bwebsite\b/i.test(source), {
    scanned_files: sourceFiles
  });
  record('effects:skyepay-motion-stack-source-present', /gsap/i.test(source) && /Lenis/i.test(source) && /ScrollTrigger/i.test(source), {
    required: ['gsap', 'Lenis', 'ScrollTrigger']
  });
}

async function checkSkyePayBrowser(browser, viewport, label) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto(urlFor('skyepay.html?client=metraiyux-0s&offer=metraiyux-routex-workforce-command&dry_run=1'), { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#skypayForm', { timeout: 10000 });
    const bodyText = await page.locator('body').innerText();
    await page.fill('input[name="customer_name"]', 'Scanner RouteX');
    await page.fill('input[name="customer_email"]', 'scanner@example.com');
    await page.fill('input[name="company_name"]', 'RouteX Scanner Co');
    await page.click('#checkoutBtn');
    await page.waitForURL(/status=success/, { timeout: 12000 });
    await page.waitForSelector('#statusPanel:not([hidden])', { timeout: 8000 });
    await page.waitForFunction(() => /pending owner approval/i.test(document.querySelector('#statusPanel')?.innerText || ''), null, { timeout: 12000 });
    const statusText = await page.locator('#statusPanel').innerText();
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      bodyLength: document.body?.innerText?.trim().length || 0
    }));
    const file = path.join(ARTIFACT_DIR, `skyepay-${label}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.artifacts.push(file);
    record(`browser:skyepay:${label}:dry-run-checkout`, !layout.overflow && /pending owner approval/i.test(statusText) && !/\bwebsite\b/i.test(bodyText) && consoleErrors.length === 0 && pageErrors.length === 0, {
      layout,
      status_preview: statusText.slice(0, 320),
      consoleErrors: consoleErrors.slice(0, 5),
      pageErrors: pageErrors.slice(0, 5),
      screenshot: file
    });
  } finally {
    await context.close().catch(() => {});
  }
}

async function mainSkyePayProfile() {
  record('profile:skyepay-enabled', true, {
    SITE_DIR,
    BASE_URL,
    note: 'FS27 payment gateway scan using the 0S SkyeCrawler runner.'
  });
  checkpoint('SkyePay profile selected');

  const devServer = await ensureSkyePayDevServer();
  try {
    const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    try {
      await checkSkyePayLinkedAssets(api);
      checkpoint('SkyePay asset resolution complete');
      await checkSkyePayHttp(api);
      checkpoint('SkyePay HTTP and function checks complete');
      await checkSkyePayPublicSource();
      checkpoint('SkyePay public source checks complete');
    } finally {
      await api.dispose();
    }

    const browser = await launchBrowser();
    try {
      await checkSkyePayBrowser(browser, { width: 1440, height: 1000 }, 'desktop');
      checkpoint('SkyePay desktop browser checkout complete');
      await checkSkyePayBrowser(browser, { width: 390, height: 844 }, 'mobile');
      checkpoint('SkyePay mobile browser checkout complete');
    } finally {
      await browser.close().catch(() => {});
    }

    report.finished_at = new Date().toISOString();
    report.ok = report.failures.length === 0;
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({
      crawler: CRAWLER_NAME,
      version: CRAWLER_VERSION,
      profile: CRAWLER_PROFILE,
      ok: report.ok,
      checks: report.checks.length,
      failures: report.failures.length,
      warnings: report.warnings.length,
      report: REPORT_PATH,
      artifacts: report.artifacts,
    }, null, 2));
  } finally {
    await stopSkyePayDevServer(devServer);
  }

  if (!report.ok) process.exit(1);
}

async function main() {
  if (CRAWLER_PROFILE === 'skyepay') {
    await mainSkyePayProfile();
    return;
  }

  const files = walk(SITE_DIR);
  const htmlFiles = files.filter((file) => file.endsWith('.html')).sort();
  record('inventory:site-dir-exists', existsSync(SITE_DIR), { SITE_DIR });
  record('inventory:html-count', htmlFiles.length >= 500, { count: htmlFiles.length });
  checkpoint(`inventory complete: ${htmlFiles.length} HTML files`);

  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    await checkHttpInventory(api, htmlFiles);
    checkpoint('HTTP inventory complete');
    await checkLinkedLocalFiles(api, htmlFiles);
    checkpoint('local link and asset resolution complete');
    if (SKIP_API) record('api:skipped-static-mode', true, { reason: 'SKIP_API enabled for static-server sweep' });
    else await checkWorkerApi(api);
    checkpoint(SKIP_API ? 'API checks skipped for static mode' : 'Worker API checks complete');
  } finally {
    await api.dispose();
  }

  const browser = await launchBrowser();
  try {
    await browserSweep(browser, htmlFiles, { width: 1366, height: 768 });
    checkpoint('desktop browser sweep complete');
    await browserSweep(browser, htmlFiles.slice(0, 160), { width: 390, height: 844 });
    checkpoint('mobile browser sweep complete');
    await checkLocalBrain(browser);
    checkpoint('Local Brain flow complete');
    await checkPersonaBrain(browser);
    checkpoint('Persona Brain flow complete');
    await checkProofRouter(browser);
    checkpoint('Live Proof Router flow complete');
    await checkCalculator(browser);
    checkpoint('calculator flow complete');
    await checkLocalTool(browser);
    checkpoint('admin local tool flow complete');
    await checkSaasTools(browser);
    checkpoint('SaaS signup flow complete');
    await checkClientOsForm(browser);
    checkpoint('Client OS onboarding flow complete');
    await screenshot(browser, 'index.html', 'home-desktop', { width: 1440, height: 900 });
    await screenshot(browser, 'index.html', 'home-mobile', { width: 390, height: 844 });
    await screenshot(browser, 'sales/live-proof-router.html', 'proof-router-desktop', { width: 1440, height: 900 });
    await screenshot(browser, 'local-brain.html', 'local-brain-desktop', { width: 1440, height: 900 });
    checkpoint('screenshot artifacts captured');
  } finally {
    await browser.close().catch(() => {});
  }

  report.finished_at = new Date().toISOString();
  report.ok = report.failures.length === 0;
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    crawler: CRAWLER_NAME,
    version: CRAWLER_VERSION,
    ok: report.ok,
    checks: report.checks.length,
    failures: report.failures.length,
    warnings: report.warnings.length,
    report: REPORT_PATH,
    artifacts: report.artifacts,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  report.finished_at = new Date().toISOString();
  report.ok = false;
  report.failures.push({ name: 'runner', error: failText(error) });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
