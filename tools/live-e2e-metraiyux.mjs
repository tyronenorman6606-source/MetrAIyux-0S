import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, request as playwrightRequest } from 'playwright';

const FULL_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/';
const PUBLIC_URL = 'https://metraiyux-0s-public-spectacle.pages.dev/';
const LOGO_URL = 'https://metraiyux-0s-logo-rollout.pages.dev/';
const FS27_PROOF_URL = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/';
const FS27_ACTUAL_GATE_URL = 'https://skygatefs13-quantumskyes.netlify.app/';
const REPORT_PATH = 'metraiyux_0s_live_e2e_report.json';
const ARTIFACT_DIR = 'test-artifacts/live-e2e-metraiyux';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD || '';

mkdirSync(ARTIFACT_DIR, { recursive: true });

const report = {
  started_at: new Date().toISOString(),
  urls: { public: PUBLIC_URL, full: FULL_URL, logo_rollout_mirror: LOGO_URL, fs27_proof: FS27_PROOF_URL, fs27_actual_gate: FS27_ACTUAL_GATE_URL },
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

function errorSummary(error) {
  return String(error?.stack || error?.message || error)
    .split('\n')
    .slice(0, 6)
    .join('\n')
    .slice(0, 1200);
}

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    chromiumSandbox: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withFreshBrowser(task, attempts = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let browser = null;
    try {
      browser = await launchBrowser();
      return await task(browser);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await delay(750);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }
  throw lastError;
}

async function jsonFromResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON but got ${text.slice(0, 180)}`);
  }
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
    match[1]
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'")
  );
}

async function fetchText(api, url, name) {
  const response = await api.get(url);
  const text = await response.text();
  record(name, response.ok(), { status: response.status(), bytes: text.length });
  return { response, text };
}

async function sweepUrls(api, urls, name, concurrency = 16) {
  let index = 0;
  const bad = [];
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < urls.length) {
      const current = urls[index++];
      try {
        const response = await api.get(current);
        if (!response.ok()) bad.push({ url: current, status: response.status() });
      } catch (error) {
        bad.push({ url: current, error: error.message });
      }
    }
  });
  await Promise.all(workers);
  record(name, bad.length === 0, { total: urls.length, bad: bad.slice(0, 25) });
}

async function browserProbe(browser, url, label, viewport) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    requestFailures.push({ url: request.url(), resourceType: request.resourceType(), error: failure?.errorText || 'request failed' });
  });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  const title = await page.title();
  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  const layout = await page.evaluate(() => {
    function hasScrollableAncestor(el) {
      const rect = el.getBoundingClientRect();
      let node = el.parentElement;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const ancestorRect = node.getBoundingClientRect();
        const clipsInline = ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX);
        if (clipsInline && (rect.right > ancestorRect.right + 3 || rect.left < ancestorRect.left - 3)) return true;
        if (['auto', 'scroll'].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 3) return true;
        node = node.parentElement;
      }
      return false;
    }
    const overflow = Array.from(document.querySelectorAll('body *'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: String(el.className || ''),
          text: (el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 100),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          insideScrollable: hasScrollableAncestor(el),
        };
      })
      .filter((item) => item.width > 0 && !item.insideScrollable && (item.right > window.innerWidth + 3 || (item.left < -3 && item.right > 0)))
      .slice(0, 20);
    return {
      bodyScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 3,
      overflow,
    };
  });
  const screenshotPath = `${ARTIFACT_DIR}/${label}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  report.artifacts.push(screenshotPath);
  await context.close();

  record(`browser:${label}:${viewport.width}x${viewport.height}`, Boolean(response?.ok()) && bodyText.includes('MetrAIyux') && !layout.horizontalOverflow && layout.overflow.length === 0, {
    status: response?.status() || 0,
    title,
    body_contains_brand: bodyText.includes('MetrAIyux'),
    console_errors: consoleErrors.slice(0, 10),
    page_errors: pageErrors.slice(0, 10),
    request_failures: requestFailures.slice(0, 10),
    layout,
    screenshot: screenshotPath,
  });
  if (consoleErrors.length || pageErrors.length || requestFailures.length) {
    warn(`browser:${label}:${viewport.width}x${viewport.height}:nonfatal_observations`, {
      console_errors: consoleErrors.slice(0, 10),
      page_errors: pageErrors.slice(0, 10),
      request_failures: requestFailures.slice(0, 10),
    });
  }
}

async function browserUrlSweep(browser, urls, label, viewport, concurrency = 4) {
  const bad = [];
  let index = 0;
  let finished = 0;
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true, javaScriptEnabled: false });
  function createPage() {
    return context.newPage().then((page) => {
      page.setDefaultTimeout(6000);
      page.setDefaultNavigationTimeout(6000);
      return page;
    });
  }
  function relevantRequestFailures(items) {
    return items.filter((item) => !String(item.error || '').includes('ERR_ABORTED'));
  }
  async function worker() {
    let page = null;
    while (index < urls.length) {
      const url = urls[index++];
      const consoleErrors = [];
      const responseErrors = [];
      const requestFailures = [];
      try {
        if (!page || page.isClosed()) page = await createPage();
        page.removeAllListeners('console');
        page.removeAllListeners('response');
        page.removeAllListeners('requestfailed');
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('response', (response) => {
          if (response.status() >= 400) responseErrors.push({ status: response.status(), url: response.url() });
        });
        page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' }));
        const response = await page.goto(url, { waitUntil: 'commit', timeout: 6000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 2500 }).catch(() => {});
        await page.waitForTimeout(250);
        let layout = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            layout = await page.evaluate(() => ({
              bodyScrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
              horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 3,
              title: document.title,
              bodyLength: document.body?.innerText?.length || 0,
            }));
            break;
          } catch (error) {
            if (!/Execution context was destroyed|Cannot find context|Target closed/i.test(error.message) || attempt === 1) throw error;
            await page.waitForLoadState('domcontentloaded', { timeout: 2500 }).catch(() => {});
            await page.waitForTimeout(350);
          }
        }
        const hardRequestFailures = relevantRequestFailures(requestFailures);
        if (!response?.ok() || layout.horizontalOverflow || consoleErrors.length || responseErrors.length || hardRequestFailures.length) {
          bad.push({
            url,
            status: response?.status() || 0,
            layout,
            consoleErrors: consoleErrors.slice(0, 5),
            responseErrors: responseErrors.slice(0, 5),
            requestFailures: hardRequestFailures.slice(0, 5),
          });
        }
      } catch (error) {
        bad.push({ url, error: errorSummary(error) });
        if (page) await page.close().catch(() => {});
        page = null;
      }
      finished += 1;
      if (finished % 100 === 0 || finished === urls.length) {
        console.log(`[browser-sweep] ${label} ${viewport.width}x${viewport.height}: ${finished}/${urls.length}`);
      }
    }
    if (page) await page.close().catch(() => {});
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  await context.close().catch(() => {});
  record(`browser-sweep:${label}:${viewport.width}x${viewport.height}`, bad.length === 0, {
    total: urls.length,
    bad: bad.slice(0, 30),
  });
}

async function browserUrlSweepBatched(urls, label, viewport, concurrency = 3, batchSize = 120) {
  for (let start = 0; start < urls.length; start += batchSize) {
    const batch = urls.slice(start, start + batchSize);
    const batchNumber = Math.floor(start / batchSize) + 1;
    const batchBrowser = await launchBrowser();
    try {
      await browserUrlSweep(batchBrowser, batch, `${label}-batch-${batchNumber}`, viewport, concurrency);
    } finally {
      await batchBrowser.close().catch(() => {});
    }
  }
}

async function checkPublicBridge(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(PUBLIC_URL, { waitUntil: 'networkidle' });
  const fullLinks = await page.locator(`a[href^="${FULL_URL}"]`).evaluateAll((links) => links.map((link) => link.href));
  record('public:links-to-full-system', fullLinks.length >= 1, { count: fullLinks.length, links: fullLinks });
  await context.close();
}

async function apiStatus(api, path, shape, headers = {}) {
  const response = await api.get(new URL(path, FULL_URL).href, { headers });
  const data = await jsonFromResponse(response);
  const ok = response.ok() && shape(data);
  record(`api:${path}`, ok, { status: response.status(), data });
  return data;
}

async function apiPost(api, path, body, shape, headers = {}) {
  const response = await api.post(new URL(path, FULL_URL).href, {
    data: body,
    headers: { 'content-type': 'application/json', ...headers },
  });
  const data = await jsonFromResponse(response);
  const ok = response.ok() && shape(data);
  record(`api:${path}:post`, ok, { status: response.status(), data });
  return data;
}

async function runApiFlow(api) {
  await apiStatus(api, '/api/site-operator/live-surfaces', (data) =>
    data.ok &&
    Array.isArray(data.surfaces) &&
    data.surfaces.some((surface) => String(surface.url || '').startsWith(FS27_PROOF_URL))
  );
  await apiStatus(api, '/api/site-operator/status', (data) => data.ok && data.total_system_brains === 16 && data.storage?.d1 === true);
  await apiPost(api, '/api/site-operator/route', { message: 'Live E2E D1 route check for the site operator.' }, (data) => data.ok && data.stored?.d1 === true);
  await apiStatus(api, '/api/site-operator/ledger', (data) => data.ok && data.persistence === 'd1' && Array.isArray(data.events));

  await apiStatus(api, '/api/admin/status', (data) => data.ok && data.brains === 16 && data.durable_mode === true);
  if (ADMIN_TOKEN) {
    await apiPost(api, '/api/admin/brain/chat', { message: 'Live E2E internal QA proof receipt, no external action.' }, (data) => data.ok && data.receipt?.id, {
      authorization: `Bearer ${ADMIN_TOKEN}`,
    });
  } else {
    warn('api:/api/admin/brain/chat:skipped', { reason: 'ADMIN_TOKEN/ADMIN_PASSWORD not available in process env' });
  }
  if (ADMIN_TOKEN) {
    await apiStatus(api, '/api/admin/ledger', (data) => data.ok && Array.isArray(data.ledger), {
      authorization: `Bearer ${ADMIN_TOKEN}`,
    });
  } else {
    warn('api:/api/admin/ledger:skipped', { reason: 'ADMIN_TOKEN/ADMIN_PASSWORD not available in process env' });
  }

  await apiStatus(api, '/api/saas/status', (data) => data.ok && data.d1 === true && data.kv === true && data.queue === true);
  await apiPost(
    api,
    '/api/saas/signup',
    { email: `live-e2e-${Date.now()}@example.com`, company_name: 'Live E2E Smoke Test', plan: 'starter-command' },
    (data) => data.ok && data.persistence === 'd1' && data.customer_id
  );
  await apiStatus(api, '/api/saas/ledger', (data) => data.ok && Array.isArray(data.rows), ADMIN_TOKEN ? { authorization: `Bearer ${ADMIN_TOKEN}` } : {});

  await apiStatus(api, '/api/omega/status', (data) => data.ok && data.d1 === true && data.kv === true && data.queue === true);
  await apiPost(api, '/api/omega/scan', { workspace_id: 'live-e2e', command_text: 'Create an internal onboarding checklist.' }, (data) => data.ok && data.event?.decision);

  await apiStatus(api, '/api/crown/status', (data) => data.ok && data.persistence?.d1 === true);
  await apiPost(api, '/api/crown/route', { message: 'Live E2E Cloudflare D1 deployment proof receipt.' }, (data) => data.route?.primary);
  await apiStatus(api, '/api/crown/ledger', (data) => data.ok && data.persistence === 'd1' && Array.isArray(data.ledger));

  await apiStatus(api, '/api/nexus/status', (data) => data.ok && data.persistence?.d1 === true);
  await apiPost(api, '/api/nexus/route', { message: 'Live E2E government buyer needs compliance and proposal routing.' }, (data) => data.status === 'routed');
  await apiStatus(api, '/api/nexus/ledger', (data) => data.ok && Array.isArray(data.events));

  await apiStatus(api, '/api/sentinel/status', (data) => data.ok && data.persistence?.d1 === true);
  await apiPost(api, '/api/sentinel/route', { message: 'Live E2E contract compliance proof audit.' }, (data) => data.status === 'queued_for_human_review');
  await apiStatus(api, '/api/sentinel/ledger', (data) => data.ok && data.persistence === 'd1' && Array.isArray(data.events));
}

async function main() {
  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const publicSitemap = await fetchText(api, new URL('/sitemap.xml', PUBLIC_URL).href, 'public:sitemap');
  const publicUrls = sitemapUrls(publicSitemap.text);
  record('public:sitemap-count', publicUrls.length >= 10, { count: publicUrls.length });

  const fullSitemap = await fetchText(api, new URL('/sitemap.xml', FULL_URL).href, 'full:sitemap');
  const fullUrls = sitemapUrls(fullSitemap.text);
  record('full:sitemap-count', fullUrls.length >= 479 && fullUrls.includes(new URL('/sales/live-proof-router.html', FULL_URL).href), {
    count: fullUrls.length,
    has_live_proof_router: fullUrls.includes(new URL('/sales/live-proof-router.html', FULL_URL).href),
  });

  const logoSitemap = await fetchText(api, new URL('/sitemap.xml', LOGO_URL).href, 'logo-rollout:sitemap');
  const logoUrls = sitemapUrls(logoSitemap.text);
  record('logo-rollout:sitemap-count', logoUrls.length >= 476, { count: logoUrls.length });

  const fs27Sitemap = await fetchText(api, new URL('/sitemap.xml', FS27_PROOF_URL).href, 'fs27:sitemap');
  const fs27Urls = sitemapUrls(fs27Sitemap.text);
  record('fs27:sitemap-count', fs27Urls.length >= 6 && fs27Urls.includes(new URL('/gate-proofx.html', FS27_PROOF_URL).href), {
    count: fs27Urls.length,
    has_gate_proof: fs27Urls.includes(new URL('/gate-proofx.html', FS27_PROOF_URL).href),
  });
  await fetchText(api, new URL('/robots.txt', FS27_PROOF_URL).href, 'fs27:robots');
  await fetchText(api, FS27_ACTUAL_GATE_URL, 'fs27:actual-gate-backlink-target');

  await sweepUrls(api, publicUrls, 'public:sitemap-url-sweep', 8);
  await sweepUrls(api, fullUrls, 'full:sitemap-url-sweep', 24);
  await sweepUrls(api, logoUrls.slice(0, 80), 'logo-rollout:sample-url-sweep', 16);
  await sweepUrls(api, fs27Urls, 'fs27:sitemap-url-sweep', 8);

  const persona = await jsonFromResponse(await api.get(new URL('/brain/persona-brains.json', FULL_URL).href));
  record('full:persona-brain-json', persona.total_brains === 16 && persona.total_system_brains === 16 && persona.profiles?.length === 16, {
    total_brains: persona.total_brains,
    total_system_brains: persona.total_system_brains,
    profiles: persona.profiles?.length,
  });

  const knowledge = await jsonFromResponse(await api.get(new URL('/brain/knowledge-base.json', FULL_URL).href));
  record('full:knowledge-base-json', knowledge.chunk_count === 722 && knowledge.chunks?.length === 722, {
    declared: knowledge.chunk_count,
    actual: knowledge.chunks?.length,
  });

  const surfaceRegistry = await jsonFromResponse(await api.get(new URL('/brain/live-surface-registry.json', FULL_URL).href));
  record('full:live-surface-registry-json', surfaceRegistry.surface_count >= 8 && surfaceRegistry.surfaces?.some((surface) => surface.url === new URL('/gate-proofx.html', FS27_PROOF_URL).href), {
    surface_count: surfaceRegistry.surface_count,
    actual: surfaceRegistry.surfaces?.length,
    has_fs27_proof: surfaceRegistry.surfaces?.some((surface) => surface.url === new URL('/gate-proofx.html', FS27_PROOF_URL).href),
  });

  await runApiFlow(api);

  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844 };
  await browserUrlSweepBatched(publicUrls, 'public-sitemap-desktop', desktop, 2, 20);
  await browserUrlSweepBatched(publicUrls, 'public-sitemap-mobile', mobile, 2, 20);

  await browserUrlSweepBatched(fullUrls, 'full-sitemap-desktop', desktop, 2, 80);
  await browserUrlSweepBatched(fullUrls, 'full-sitemap-mobile', mobile, 1, 40);

  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, PUBLIC_URL, 'public-home-desktop', desktop));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, PUBLIC_URL, 'public-home-mobile', mobile));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, FULL_URL, 'full-home-desktop', desktop));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, FULL_URL, 'full-home-mobile', mobile));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/local-brain.html', FULL_URL).href, 'full-local-brain-desktop', desktop));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/person-brains.html', FULL_URL).href, 'full-person-brains-mobile', mobile));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/sales/live-proof-router.html', FULL_URL).href, 'full-live-proof-router-desktop', desktop));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/sales/live-proof-router.html', FULL_URL).href, 'full-live-proof-router-mobile', mobile));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/gate-proofx.html', FS27_PROOF_URL).href, 'fs27-proof-desktop', desktop));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/gate-proofx.html', FS27_PROOF_URL).href, 'fs27-proof-mobile', mobile));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, new URL('/gate-map.html', FS27_PROOF_URL).href, 'fs27-gate-map-desktop', desktop));
  await withFreshBrowser((freshBrowser) => browserProbe(freshBrowser, LOGO_URL, 'logo-rollout-home-desktop', desktop));
  await withFreshBrowser((freshBrowser) => checkPublicBridge(freshBrowser));

  await api.dispose();
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
  report.failures.push({ name: 'runner', error: errorSummary(error) });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
