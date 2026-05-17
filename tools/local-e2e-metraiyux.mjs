import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { request as playwrightRequest, chromium } from 'playwright';

const SITE_DIR = process.env.SITE_DIR || '/workspaces/MetrAIyux-0S/metraiyux_0s_site';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || '/workspaces/MetrAIyux-0S/test-artifacts/metraiyux-local-e2e';
const REPORT_PATH = process.env.REPORT_PATH || '/workspaces/MetrAIyux-0S/test-artifacts/metraiyux-local-e2e-report.json';
const SKIP_API = process.env.SKIP_API === '1' || process.env.SKIP_API === 'true';

mkdirSync(ARTIFACT_DIR, { recursive: true });

const report = {
  started_at: new Date().toISOString(),
  site_dir: SITE_DIR,
  base_url: BASE_URL,
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
  for (const file of htmlFiles) {
    const pageUrl = urlFor(rel(file));
    try {
      const res = await api.get(pageUrl, { timeout: 10000 });
      const text = await res.text();
      if (!res.ok() || !text.includes('<html')) badPages.push({ url: pageUrl, status: res.status(), bytes: text.length });
    } catch (error) {
      badPages.push({ url: pageUrl, error: failText(error) });
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
      checked += 1;
      if (!res.ok()) bad.push({ url, status: res.status(), referenced_by: pages.slice(0, 8), ref_count: pages.length });
    } catch (error) {
      bad.push({ url, error: failText(error), referenced_by: pages.slice(0, 8), ref_count: pages.length });
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
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const bad = [];
  const soft = [];
  let index = 0;
  const total = htmlFiles.length;

  async function worker() {
    const page = await context.newPage();
    page.setDefaultTimeout(9000);
    page.setDefaultNavigationTimeout(12000);
    while (index < total) {
      const file = htmlFiles[index++];
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
        const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
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
    }
    await page.close().catch(() => {});
  }

  await Promise.all(Array.from({ length: 4 }, worker));
  await context.close().catch(() => {});
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
  record('flow:local-brain-ask-and-sources', result.includes('Local answer') && sources > 0, { sources, result_preview: result.slice(0, 400) });
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
  const saved = await page.locator('.tool-output').innerText();
  const storage = await page.evaluate(() => localStorage.getItem('omega-tool:risk-register'));
  await page.click('[data-clear]');
  const cleared = await page.locator('.tool-output').innerText();
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

async function main() {
  const files = walk(SITE_DIR);
  const htmlFiles = files.filter((file) => file.endsWith('.html')).sort();
  record('inventory:site-dir-exists', existsSync(SITE_DIR), { SITE_DIR });
  record('inventory:html-count', htmlFiles.length >= 500, { count: htmlFiles.length });

  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  await checkHttpInventory(api, htmlFiles);
  await checkLinkedLocalFiles(api, htmlFiles);
  if (SKIP_API) warn('api:skipped', { reason: 'SKIP_API enabled for static-server sweep' });
  else await checkWorkerApi(api);

  const browser = await launchBrowser();
  try {
    await browserSweep(browser, htmlFiles, { width: 1366, height: 768 });
    await browserSweep(browser, htmlFiles.slice(0, 160), { width: 390, height: 844 });
    await checkLocalBrain(browser);
    await checkPersonaBrain(browser);
    await checkProofRouter(browser);
    await checkCalculator(browser);
    await checkLocalTool(browser);
    await checkSaasTools(browser);
    await checkClientOsForm(browser);
    await screenshot(browser, 'index.html', 'home-desktop', { width: 1440, height: 900 });
    await screenshot(browser, 'index.html', 'home-mobile', { width: 390, height: 844 });
    await screenshot(browser, 'sales/live-proof-router.html', 'proof-router-desktop', { width: 1440, height: 900 });
    await screenshot(browser, 'local-brain.html', 'local-brain-desktop', { width: 1440, height: 900 });
  } finally {
    await browser.close().catch(() => {});
    await api.dispose();
  }

  report.finished_at = new Date().toISOString();
  report.ok = report.failures.length === 0;
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
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
