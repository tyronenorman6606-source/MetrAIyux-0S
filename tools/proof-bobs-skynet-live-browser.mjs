#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium, devices, request as playwrightRequest } from 'playwright';

const repoRoot = process.cwd();
const baseUrl = String(process.env.BOBS_SKYENET_LIVE_URL || 'https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/').replace(/\/+$/, '/');
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.resolve('test-artifacts/bobs-skynet-live-browser');
const generatedAt = new Date().toISOString();
const stampedDir = path.join(artifactRoot, generatedAt.replace(/[:.]/g, '-'));
const latestReceipt = path.join(artifactRoot, 'latest.json');
const screenshotDir = path.join(stampedDir, 'screenshots');

const routeChecks = [
  { label: 'Home', path: '/', must: ["Bob's Smoke Shop", '21+ Entry', 'Free Claim Stack'] },
  { label: 'Home HTML Alias', path: '/index.html', must: ["Bob's Smoke Shop", '21+ Entry'] },
  { label: 'Inventory', path: '/inventory', must: ['Endless Glass Selection', 'Vapes'] },
  { label: 'Inventory HTML', path: '/inventory.html', must: ['Endless Glass Selection', 'Vapes'] },
  { label: 'Local SEO', path: '/local-seo', must: ['Litchfield Park', 'smoke shop'] },
  { label: 'Local SEO HTML', path: '/local-seo.html', must: ['Litchfield Park', 'smoke shop'] },
  { label: 'Blog', path: '/blog', must: ['Bob', 'Smoke Shop'] },
  { label: 'Blog Directory', path: '/blog/', must: ['Bob', 'Smoke Shop'] },
  { label: 'Shopping Guide Blog', path: '/blog/smoke-shop-shopping-guide-litchfield-park', must: ['Litchfield Park', 'Smoke Shop'] },
  { label: 'Shopping Guide Blog HTML', path: '/blog/smoke-shop-shopping-guide-litchfield-park.html', must: ['Litchfield Park', 'Smoke Shop'] },
  { label: 'Glass Vape Blog', path: '/blog/glass-vape-products-guide', must: ['glass', 'vape'] },
  { label: 'Glass Vape Blog HTML', path: '/blog/glass-vape-products-guide.html', must: ['glass', 'vape'] },
  { label: 'Cigars Tobacco Blog', path: '/blog/cigars-tobacco-hookah-basics', must: ['cigar', 'hookah'] },
  { label: 'Cigars Tobacco Blog HTML', path: '/blog/cigars-tobacco-hookah-basics.html', must: ['cigar', 'hookah'] },
  { label: 'Exotic Snacks Blog', path: '/blog/exotic-snacks-smoke-shop-feature', must: ['snack', 'Bob'] },
  { label: 'Exotic Snacks Blog HTML', path: '/blog/exotic-snacks-smoke-shop-feature.html', must: ['snack', 'Bob'] },
  { label: 'Specials', path: '/specials', must: ['Current Specials', 'Call'] },
  { label: 'Specials HTML', path: '/specials.html', must: ['Current Specials', 'Call'] },
  { label: 'Gallery', path: '/gallery', must: ['Gallery', 'Bob'] },
  { label: 'Gallery HTML', path: '/gallery.html', must: ['Gallery', 'Bob'] },
  { label: 'Contact', path: '/contact', must: ['Visit Bob', '623-935-0786', 'Quick Message'] },
  { label: 'Contact HTML', path: '/contact.html', must: ['Visit Bob', '623-935-0786', 'Quick Message'] },
  { label: 'FAQ', path: '/faq', must: ['FAQ', '21+'] },
  { label: 'FAQ HTML', path: '/faq.html', must: ['FAQ', '21+'] },
  { label: 'Delivery', path: '/delivery', must: ['Delivery', 'Bob'] },
  { label: 'Delivery HTML', path: '/delivery.html', must: ['Delivery', 'Bob'] },
  { label: 'Flyer', path: '/flyer', must: ['Bob', 'Call Now', '623-935-0786'] },
  { label: 'Flyer HTML', path: '/flyer.html', must: ['Bob', 'Call Now', '623-935-0786'] },
  { label: 'Workspace Preview', path: '/workspace-preview', must: ['Welcome to Your App', 'Free Claim', 'MediaOverLondon@solenterprises.org'] },
  { label: 'Workspace Preview Slash', path: '/workspace-preview/', must: ['Welcome to Your App', 'Free Claim', 'MediaOverLondon@solenterprises.org'] },
  { label: 'Workspace Preview HTML', path: '/workspace-preview.html', must: ['Welcome to Your App', 'Free Claim', 'MediaOverLondon@solenterprises.org'] },
  { label: 'Glass Category', path: '/categories/glass', must: ['Glass', 'Bob'] },
  { label: 'Glass Category HTML', path: '/categories/glass.html', must: ['Glass', 'Bob'] },
  { label: 'Vapes Category', path: '/categories/vapes', must: ['Vapes', 'Bob'] },
  { label: 'Vapes Category HTML', path: '/categories/vapes.html', must: ['Vapes', 'Bob'] },
  { label: 'Cigars Category', path: '/categories/cigars', must: ['Cigars', 'Bob'] },
  { label: 'Pipes Category', path: '/categories/pipes', must: ['Pipes', 'Bob'] },
  { label: 'Electronic Devices Category', path: '/categories/electronic-devices', must: ['Electronic Devices', 'Bob'] },
  { label: 'CBD Products Category', path: '/categories/cbd-products', must: ['CBD Products', 'Bob'] },
  { label: 'Tobacco Category', path: '/categories/tobacco', must: ['Tobacco', 'Bob'] },
  { label: 'Hookah Category', path: '/categories/hookah', must: ['Hookah', 'Bob'] },
  { label: 'Exotic Snacks Category', path: '/categories/exotic-snacks', must: ['Exotic Snacks', 'Bob'] }
];

const assetChecks = [
  { label: 'Manifest', path: '/manifest.webmanifest', type: /json/i, must: ['"scope": "/bobs-smoke-shop/"', '/bobs-smoke-shop/contact'] },
  { label: 'Service Worker', path: '/service-worker.js', type: /javascript/i, must: ['bobs-smoke-shop-pwa-v26', '/bobs-smoke-shop/index.html'] },
  { label: 'Hero MP4', path: '/assets/videos/bobs-cinematic-logo-hero.mp4', type: /video\/mp4|octet-stream/i, minBytes: 1_000_000 },
  { label: 'Workspace Chat Widget', path: '/assets/workspace-chat-widget.js', type: /javascript/i, must: ['MetrAIyuxWorkspaceChatConfig', 'metraiyux-chat-launcher'] },
  { label: 'QR SVG', path: '/assets/qr/bobs-smoke-shop-preview-qr.svg', type: /svg/i, must: ['svg'] }
];

function routeUrl(routePath) {
  const suffix = String(routePath || '/').replace(/^\/+/, '');
  return `${baseUrl}${suffix}`;
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function includesAll(haystack, needles = []) {
  const lower = String(haystack || '').toLowerCase();
  return needles.every((needle) => lower.includes(String(needle).toLowerCase()));
}

function publicCopyLooksClean(text) {
  const bad = [
    'SkyeNet deployment asset missing',
    'bobs-smoke-shop.pages.dev',
    'Cloudflare Pages',
    'skyesol.netlify.app',
    'dist/data/businesses.json',
    'seed/businesses/clients.json',
    'internal script',
    'MCP smoke'
  ];
  const found = bad.filter((needle) => String(text || '').includes(needle));
  return { ok: found.length === 0, found };
}

function importantUrl(url) {
  return url.startsWith(baseUrl)
    || url.startsWith(zeroOsBase)
    || url.includes('relay13-core.graylondonskyes.workers.dev');
}

async function screenshot(page, name) {
  const out = path.join(screenshotDir, `${name}.png`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: false });
  const stat = await fs.stat(out);
  return { file: rel(out), bytes: stat.size, ok: stat.size > 20_000 };
}

async function gotoAndInspect(page, check) {
  const url = routeUrl(check.path);
  const started = performance.now();
  let response = null;
  try {
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  } catch (error) {
    return {
      label: check.label,
      path: check.path,
      url,
      ok: false,
      status: 0,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      navigation_error: error?.message || String(error)
    };
  }
  await page.waitForTimeout(250).catch(() => {});
  const elapsedMs = Number((performance.now() - started).toFixed(2));
  const text = await page.locator('body').innerText({ timeout: 8_000 }).catch(() => '');
  const html = await page.content().catch(() => '');
  const inspected = `${text}\n${html}`;
  const clean = publicCopyLooksClean(inspected);
  const status = response?.status() || 0;
  const contentType = response?.headers()?.['content-type'] || '';
  const skynetRoute = response?.headers()?.['x-skynet-route'] || '';
  const ok = status === 200
    && includesAll(inspected, check.must)
    && clean.ok
    && skynetRoute === 'r2-deployment';
  return {
    label: check.label,
    path: check.path,
    url,
    ok,
    status,
    content_type: contentType,
    x_skynet_route: skynetRoute,
    elapsed_ms: elapsedMs,
    missing_text: (check.must || []).filter((needle) => !includesAll(inspected, [needle])),
    bad_public_copy: clean.found
  };
}

async function checkAssets(api) {
  const checks = [];
  for (const check of assetChecks) {
    const url = routeUrl(check.path);
    const response = await api.get(url, { failOnStatusCode: false, timeout: 45_000 });
    const contentType = response.headers()['content-type'] || '';
    const body = await response.body();
    const text = body.toString('utf8');
    const clean = publicCopyLooksClean(text);
    const ok = response.status() === 200
      && (!check.type || check.type.test(contentType))
      && (!check.minBytes || body.byteLength >= check.minBytes)
      && includesAll(text, check.must || [])
      && clean.ok;
    checks.push({
      label: check.label,
      path: check.path,
      url,
      ok,
      status: response.status(),
      content_type: contentType,
      bytes: body.byteLength,
      bad_public_copy: clean.found
    });
  }
  return checks;
}

async function runHomeFunctionality(page, viewportName) {
  const checks = [];
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('[data-age-yes]', { timeout: 10_000 });
  checks.push({ label: `${viewportName} age gate visible`, ok: await page.locator('[data-age-yes]').isVisible().catch(() => false) });
  await page.locator('[data-age-yes]').click();
  await page.waitForFunction(() => document.body.classList.contains('app-ready'), null, { timeout: 14_000 }).catch(() => {});
  const ready = await page.evaluate(() => document.body.classList.contains('app-ready'));
  checks.push({ label: `${viewportName} age gate enters app`, ok: ready });
  await page.waitForTimeout(1800);

  const video = await page.evaluate(async () => {
    const el = document.querySelector('[data-hero-video]');
    if (!el) return { ok: false, reason: 'missing-video' };
    el.muted = true;
    el.setAttribute('playsinline', '');
    const started = Date.now();
    await new Promise((resolve) => {
      if (el.readyState >= 2) return resolve();
      const done = () => resolve();
      el.addEventListener('loadeddata', done, { once: true });
      el.addEventListener('canplay', done, { once: true });
      setTimeout(resolve, 5000);
    });
    try { await el.play(); } catch {}
    const rect = el.getBoundingClientRect();
    return {
      ok: el.readyState >= 2 && rect.width > 120 && rect.height > 80 && !el.error,
      readyState: el.readyState,
      networkState: el.networkState,
      paused: el.paused,
      currentSrc: el.currentSrc,
      videoWidth: el.videoWidth,
      videoHeight: el.videoHeight,
      rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
      elapsedMs: Date.now() - started,
      error: el.error ? { code: el.error.code, message: el.error.message } : null
    };
  });
  checks.push({ label: `${viewportName} hero video loads and renders`, ok: Boolean(video.ok), details: video });

  let previewClickError = '';
  await page.locator('[data-preview-open]').first().click({ timeout: 6_000 }).catch((error) => {
    previewClickError = error?.message || String(error);
  });
  await page.waitForSelector('[data-preview-window].is-open', { timeout: 5_000 }).catch(() => {});
  const previewOpen = await page.locator('[data-preview-window].is-open').count();
  checks.push({ label: `${viewportName} preview/workspace walkthrough opens`, ok: previewOpen > 0, details: previewClickError ? { click_error: previewClickError.slice(0, 800) } : null });
  await page.locator('[data-preview-minimize]').click().catch(() => {});
  await page.waitForSelector('[data-preview-window].is-minimized', { timeout: 5_000 }).catch(() => {});
  checks.push({ label: `${viewportName} preview/window minimizes`, ok: await page.locator('[data-preview-window].is-minimized').count() > 0 });

  const share = await page.evaluate((expectedUrl) => {
    const button = document.querySelector('[data-share-site]');
    const links = Array.from(document.querySelectorAll('.social-share-strip a')).map((link) => link.href);
    return {
      dataShareUrl: button?.getAttribute('data-share-url') || '',
      links,
      ok: (button?.getAttribute('data-share-url') || '') === expectedUrl
        && links.length >= 4
        && links.every((href) => href.includes(encodeURIComponent(expectedUrl)) || href.includes(expectedUrl))
    };
  }, baseUrl);
  checks.push({ label: `${viewportName} share controls point to SkyeNet app`, ok: Boolean(share.ok), details: share });

  const inventoryNav = page.locator('nav a', { hasText: 'Inventory' }).first();
  const inventoryNavVisible = await inventoryNav.isVisible().catch(() => false);
  if (inventoryNavVisible) {
    await inventoryNav.click({ timeout: 6_000 }).catch(() => {});
    await page.waitForURL(/\/inventory(?:$|[?#/])/, { timeout: 8_000 }).catch(() => {});
  } else {
    await page.goto(routeUrl('/inventory'), { waitUntil: 'domcontentloaded', timeout: 20_000 });
  }
  const navText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
  checks.push({
    label: `${viewportName} inventory route is reachable from the app surface`,
    ok: page.url().includes('/inventory') && /(Endless Glass Selection|Vapes|Inventory)/i.test(navText),
    details: { desktop_nav_link_visible: inventoryNavVisible }
  });

  return checks;
}

async function runContactFunctionality(page) {
  await page.goto(routeUrl('/contact'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.evaluate(() => {
    const form = document.querySelector('form[name="app-lead"]');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      window.__bobsContactProof = Object.fromEntries(new FormData(form).entries());
    });
  });
  await page.locator('input[name="name"]').fill('Bob Smoke Shop Proof');
  await page.locator('input[name="contact"]').fill('bob@example.com');
  await page.locator('textarea[name="message"]').fill('Proof check only. Do not send.');
  await page.locator('form[name="app-lead"] button[type="submit"]').click();
  const proof = await page.evaluate(() => window.__bobsContactProof || null);
  return [{
    label: 'Contact form fields and submit handler are usable without exposing old contact info',
    ok: Boolean(proof?.name === 'Bob Smoke Shop Proof' && proof?.contact === 'bob@example.com' && proof?.message?.includes('Proof check')),
    details: proof
  }];
}

async function runWorkspaceFunctionality(page) {
  await page.goto(routeUrl('/workspace-preview'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('.metraiyux-chat-launcher', { timeout: 10_000 });
  await page.locator('.metraiyux-chat-launcher').click();
  await page.waitForSelector('.metraiyux-chat-root[data-open="true"]', { timeout: 5_000 }).catch(() => {});
  await page.locator('[data-chat-input]').fill('Bob proof message for workspace handoff.');
  await page.locator('[data-chat-form] button[type="submit"]').click();
  await page.waitForFunction(() => {
    const keys = Object.keys(localStorage).filter((key) => key.includes('bob-smoke-shop-preview-001'));
    const relayKey = keys.find((key) => key.endsWith('.relay'));
    const eventsKey = keys.find((key) => key.endsWith('.events'));
    let relay = {};
    let events = [];
    try { relay = JSON.parse(localStorage.getItem(relayKey) || '{}'); } catch {}
    try { events = JSON.parse(localStorage.getItem(eventsKey) || '[]'); } catch {}
    return Boolean(relay.conversation_id || events.some((event) => event.eventType === 'network.failed'));
  }, null, { timeout: 12_000 }).catch(() => {});
  const chat = await page.evaluate(() => {
    const root = document.querySelector('.metraiyux-chat-root');
    const keys = Object.keys(localStorage).filter((key) => key.includes('bob-smoke-shop-preview-001'));
    const messagesKey = keys.find((key) => key.endsWith('.messages'));
    const eventsKey = keys.find((key) => key.endsWith('.events'));
    const relayKey = keys.find((key) => key.endsWith('.relay'));
    let messages = [];
    let events = [];
    let relayState = {};
    try { messages = JSON.parse(localStorage.getItem(messagesKey) || '[]'); } catch {}
    try { events = JSON.parse(localStorage.getItem(eventsKey) || '[]'); } catch {}
    try { relayState = JSON.parse(localStorage.getItem(relayKey) || '{}'); } catch {}
    return {
      open: root?.getAttribute('data-open') === 'true',
      keys,
      messages,
      events,
      relayState,
      disclaimer: document.querySelector('.metraiyux-chat-disclaimer')?.textContent || '',
      hasNoLocalPassword: String(window.MetrAIyuxWorkspaceChatConfig?.accessReply || '').includes('No app-local password is issued from this page.'),
      companyContactUrl: Array.from(document.querySelectorAll('a')).find((link) => link.textContent.includes('Company Contact'))?.href || ''
    };
  });
  const workspaceLinks = await page.evaluate((expectedBase) => {
    const links = Array.from(document.querySelectorAll('a')).map((link) => ({ text: link.textContent.trim(), href: link.href }));
    return {
      openWorkspace: links.find((link) => /Open Workspace/i.test(link.text))?.href || '',
      openShopApp: links.find((link) => /Open Shop App/i.test(link.text))?.href || '',
      qr: links.find((link) => /Open Store QR/i.test(link.text))?.href || '',
      ok: links.some((link) => /Open Workspace/i.test(link.text) && link.href.includes('/saas/client-login.html'))
        && links.some((link) => /Open Shop App/i.test(link.text) && link.href === expectedBase)
        && links.some((link) => /Open Store QR/i.test(link.text) && link.href.includes('/assets/qr/bobs-smoke-shop-preview-qr.svg'))
    };
  }, baseUrl);
  return [
    {
      label: 'Workspace chat widget opens, records Bob message, and creates Relay13 conversation',
      ok: Boolean(
        chat.open
        && chat.messages.some((msg) => /Bob proof message/.test(msg.body || msg.text || ''))
        && chat.relayState?.conversation_id
        && chat.events.some((event) => event.eventType === 'network.sent')
      ),
      details: chat
    },
    {
      label: 'Workspace handoff links use shared 0S login, SkyeNet app, QR, and Media Over London contact',
      ok: Boolean(workspaceLinks.ok && chat.hasNoLocalPassword && chat.companyContactUrl.includes('media-over-london.html')),
      details: workspaceLinks
    }
  ];
}

async function runViewportProof(browser, viewport) {
  const context = await browser.newContext(viewport.contextOptions);
  const page = await context.newPage();
  const network = [];
  const consoleErrors = [];
  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 400 && importantUrl(url)) network.push({ url, status, type: 'response' });
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (importantUrl(url)) network.push({ url, failure: request.failure()?.errorText || '', type: 'requestfailed' });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text().slice(0, 500), url: page.url() });
  });

  const functionality = [];
  functionality.push(...await runHomeFunctionality(page, viewport.name));
  const homeShot = await screenshot(page, `${viewport.id}-home-after-age-gate`);
  functionality.push({ label: `${viewport.name} screenshot is nonblank`, ok: homeShot.ok, details: homeShot });
  functionality.push(...await runWorkspaceFunctionality(page));
  const workspaceShot = await screenshot(page, `${viewport.id}-workspace-chat`);
  functionality.push({ label: `${viewport.name} workspace screenshot is nonblank`, ok: workspaceShot.ok, details: workspaceShot });
  functionality.push(...await runContactFunctionality(page));
  const contactShot = await screenshot(page, `${viewport.id}-contact-form`);
  functionality.push({ label: `${viewport.name} contact screenshot is nonblank`, ok: contactShot.ok, details: contactShot });

  await context.close();
  return { viewport: viewport.name, functionality, network, console_errors: consoleErrors };
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });
  const receipt = {
    ok: false,
    generated_at: generatedAt,
    lane: 'bobs-skynet-live-browser-proof',
    explicit_owner_browser_proof_request: true,
    live_url: baseUrl,
    route_checks: [],
    asset_checks: [],
    viewport_proofs: [],
    failures: [],
    warnings: [],
    screenshot_dir: rel(screenshotDir)
  };

  const api = await playwrightRequest.newContext();
  receipt.asset_checks = await checkAssets(api);
  await api.dispose();

  const browser = await chromium.launch({ headless: true });
  try {
    const routeContext = await browser.newContext({
      viewport: { width: 1365, height: 900 },
      ignoreHTTPSErrors: true,
      javaScriptEnabled: false
    });
    await routeContext.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();
      const type = request.resourceType();
      if (['image', 'media', 'font'].includes(type)) return route.abort();
      if (!importantUrl(url) && ['script', 'stylesheet'].includes(type)) return route.abort();
      return route.continue();
    });
    const routePage = await routeContext.newPage();
    for (const [index, check] of routeChecks.entries()) {
      const result = await gotoAndInspect(routePage, check);
      receipt.route_checks.push(result);
      if ((index + 1) % 10 === 0 || index + 1 === routeChecks.length) {
        process.stderr.write(`bobs-live-browser-proof: route ${index + 1}/${routeChecks.length}\n`);
      }
    }
    await routeContext.close();

    const viewports = [
      { id: 'desktop', name: 'Desktop', contextOptions: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
      { id: 'mobile', name: 'Mobile', contextOptions: { ...devices['iPhone 13'], locale: 'en-US' } }
    ];
    for (const viewport of viewports) {
      receipt.viewport_proofs.push(await runViewportProof(browser, viewport));
    }
  } finally {
    await browser.close();
  }

  for (const check of [...receipt.asset_checks, ...receipt.route_checks]) {
    if (!check.ok) receipt.failures.push(`${check.label} failed`);
  }
  for (const viewport of receipt.viewport_proofs) {
    for (const check of viewport.functionality) {
      if (!check.ok) receipt.failures.push(`${check.label} failed`);
    }
    const materialNetwork = viewport.network.filter((item) => {
      if (/favicon\.ico/.test(item.url)) return false;
      if (item.failure === 'net::ERR_ABORTED' && /\.mp4(?:$|[?#])/.test(item.url)) return false;
      return true;
    });
    if (materialNetwork.length) receipt.failures.push(`${viewport.viewport} material network failures: ${materialNetwork.length}`);
    if (viewport.console_errors.length) receipt.warnings.push(`${viewport.viewport} console errors recorded: ${viewport.console_errors.length}`);
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(path.dirname(latestReceipt), { recursive: true });
  await fs.writeFile(path.join(stampedDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(path.join(stampedDir, 'receipt.json')) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    live_url: baseUrl,
    route_checks: receipt.route_checks.length,
    asset_checks: receipt.asset_checks.length,
    viewport_proofs: receipt.viewport_proofs.length,
    receipt: rel(latestReceipt),
    stamped_receipt: rel(path.join(stampedDir, 'receipt.json')),
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(stampedDir, { recursive: true });
  const receipt = {
    ok: false,
    generated_at: generatedAt,
    lane: 'bobs-skynet-live-browser-proof',
    fatal: error?.stack || error?.message || String(error)
  };
  await fs.writeFile(path.join(stampedDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(path.dirname(latestReceipt), { recursive: true });
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(path.join(stampedDir, 'receipt.json')) }, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, receipt: rel(latestReceipt), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
