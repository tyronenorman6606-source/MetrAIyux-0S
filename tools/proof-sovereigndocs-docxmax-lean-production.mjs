#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const originUrl = (process.env.PROOF_DOCXMAX_ORIGIN || 'https://sovereigndocs-docxmax-lane.pages.dev').replace(/\/+$/, '');
const docxPath = '/Free99/apps/sovereigndocs/skye-docx-max/app/index.html';
const landingPath = '/Free99/apps/sovereigndocs/skye-docx-max/index.html';
const changelogPath = '/changelog';
const adminCode = firstEnv([
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_CODE',
  'FREE99_GATE_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'ADMIN_CODE',
  'ADMIN_PASSWORD'
]);

function firstEnv(keys) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1' }
  });
  process.exit(child.status ?? 1);
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error).split('\n').slice(0, 8).join('\n');
}

function freshEntry(name) {
  return {
    name,
    ok: false,
    actions: [],
    statuses: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    screenshots: []
  };
}

function observe(page, entry) {
  page.on('console', message => {
    if (message.type() === 'error') entry.consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    const failureText = request.failure()?.errorText || 'request failed';
    if (failureText.includes('ERR_ABORTED')) return;
    entry.failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: failureText
    });
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      const url = response.url();
      const ignored = [
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'favicon.ico',
        'cdn.jsdelivr.net',
        'cdnjs.cloudflare.com',
        'unpkg.com'
      ].some(fragment => url.includes(fragment));
      if (!ignored) {
        entry.httpErrors.push({
          url,
          status: response.status(),
          method: response.request().method(),
          resourceType: response.request().resourceType()
        });
      }
    }
  });
}

async function screenshot(page, artifactDir, entry, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  entry.screenshots.push(file);
}

function okStatus(entry, name, ok, state = {}) {
  entry.statuses.push({ name, ok: Boolean(ok), state });
}

function isMountedDocxUrl(href) {
  const url = new URL(href);
  const appPath = docxPath.replace(/index\.html$/, '');
  return url.origin === baseUrl && (url.pathname === docxPath || url.pathname === appPath || url.pathname === appPath.replace(/\/$/, ''));
}

async function loginOwner(page, returnPath, entry) {
  if (!adminCode) throw new Error('Owner admin code env var is required for live proof.');
  const loginUrl = new URL('/admin/login.html', baseUrl);
  loginUrl.searchParams.set('return', returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  entry.statuses.push({ name: 'admin_login_opened', status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await page.fill('input[name="code"]', adminCode);
  await page.evaluate(async ({ targetPath, proofCode }) => {
    const response = await fetch('/api/owner/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: proofCode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `owner login failed (${response.status})`);
    const clean = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
    if (clean) {
      const shared = {
        token: clean,
        source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login',
        platform_id: 'metraiyux-0s',
        usage_lane: 'fs27-owner-gate',
        issued_at: new Date().toISOString()
      };
      sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
      localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
    }
    location.assign(targetPath);
  }, { targetPath: returnPath, proofCode: adminCode });
  await page.waitForURL(url => url.pathname === returnPath || url.pathname === returnPath.replace(/\/index\.html$/, '/'), { timeout: 30000 });
  entry.actions.push(`unlocked shared owner session and opened ${returnPath}`);
}

async function directOriginChecks(browser, artifactDir, report) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const entry = freshEntry('direct-origin-gate');
  observe(page, entry);

  const health = await context.request.get(`${originUrl}/health`);
  const healthJson = await health.json().catch(() => ({}));
  okStatus(entry, 'direct_origin_health_gate_owned', health.status() === 200 && healthJson.gateOwned === true, healthJson);

  const jsonBoundary = await context.request.get(`${originUrl}/Free99/apps/sovereigndocs/skye-docx-max/app/js/fallback-runtime.js`, {
    headers: { accept: 'application/json' }
  });
  okStatus(entry, 'direct_origin_non_html_requires_main_gate_or_proxy_secret', jsonBoundary.status() === 401, {
    status: jsonBoundary.status(),
    gateHeader: jsonBoundary.headers()['x-0s-gate'] || ''
  });

  await page.goto(`${originUrl}${docxPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  const state = await page.evaluate(() => ({
    href: location.href,
    host: location.host,
    path: location.pathname,
    search: location.search,
    title: document.title,
    body: document.body.innerText.slice(0, 800)
  }));
  okStatus(entry, 'direct_origin_html_redirects_to_main_0s_login', state.host.includes('metraiyux-0s-full-system') && state.path === '/admin/login.html' && state.search.includes('return='), state);
  await screenshot(page, artifactDir, entry, 'direct-origin-gate');
  await context.close();
  entry.ok = entry.statuses.every(item => item.ok);
  report.entries.push(entry);
}

async function mountedDesktopChecks(browser, artifactDir, report) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const entry = freshEntry('mounted-desktop-docxmax');
  observe(page, entry);

  await page.goto(`${baseUrl}${docxPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  const unauth = await page.evaluate(() => ({ path: location.pathname, search: location.search, title: document.title }));
  okStatus(entry, 'mounted_unauth_redirects_to_shared_login', unauth.path === '/admin/login.html' && unauth.search.includes('return='), unauth);

  await loginOwner(page, docxPath, entry);
  await page.getByText('SkyeDocxMax', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  const mounted = await page.evaluate(() => ({
    href: location.href,
    title: document.title,
    body: document.body.innerText.slice(0, 1200),
    gateOverlay: Boolean(document.querySelector('#free99PlatformGate')),
    localProofButton: Boolean(document.querySelector('#free99PlatformLocalProof')),
    appSpecificGateKeys: Object.keys(sessionStorage).filter(key => /^FREE99_PLATFORM_GATE_SESSION_/.test(key)),
    scripts: Array.from(document.scripts).map(script => script.src).filter(Boolean).slice(0, 12)
  }));
  okStatus(entry, 'mounted_docxmax_renders_from_main_0s_path', isMountedDocxUrl(mounted.href) && /SkyeDocxMax/i.test(mounted.body), mounted);
  okStatus(entry, 'no_per_app_gate_overlay_or_app_session_key', !mounted.gateOverlay && !mounted.localProofButton && mounted.appSpecificGateKeys.length === 0, mounted);
  await screenshot(page, artifactDir, entry, 'mounted-desktop-docxmax');

  await page.goto(`${baseUrl}${landingPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.getByText('SovereignDocs', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  const launch = page.getByRole('link', { name: /Open blank SkyeDocxMax/i }).first();
  let launchHref = '';
  if (await launch.count()) {
    launchHref = await launch.getAttribute('href') || '';
    await page.goto(new URL(launchHref, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  }
  const wired = await page.evaluate(() => ({
    href: location.href,
    body: document.body.innerText.slice(0, 1200)
  }));
  const wiredHost = new URL(wired.href).host;
  okStatus(entry, 'landing_routes_forward_into_docxmax_without_leaving_0s_domain', Boolean(launchHref) && isMountedDocxUrl(wired.href) && wiredHost.includes('metraiyux-0s-full-system'), { ...wired, launchHref });
  await screenshot(page, artifactDir, entry, 'mounted-desktop-landing-forward');

  await context.close();
  entry.ok = entry.statuses.every(item => item.ok) && entry.consoleErrors.length === 0 && entry.failedRequests.length === 0 && entry.httpErrors.length === 0;
  report.entries.push(entry);
}

async function mountedMobileChecks(browser, artifactDir, report) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const entry = freshEntry('mounted-mobile-docxmax');
  observe(page, entry);
  await loginOwner(page, docxPath, entry);
  await page.getByText('SkyeDocxMax', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  const mobile = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return {
      href: location.href,
      title: document.title,
      overflow,
      body: document.body.innerText.slice(0, 1000)
    };
  });
  okStatus(entry, 'mobile_docxmax_renders_on_main_0s_domain', isMountedDocxUrl(mobile.href) && /SkyeDocxMax/i.test(mobile.body), mobile);
  okStatus(entry, 'mobile_has_no_material_horizontal_overflow', mobile.overflow <= 3, mobile);
  await screenshot(page, artifactDir, entry, 'mounted-mobile-docxmax');
  await context.close();
  entry.ok = entry.statuses.every(item => item.ok) && entry.consoleErrors.length === 0 && entry.failedRequests.length === 0 && entry.httpErrors.length === 0;
  report.entries.push(entry);
}

async function changelogChecks(browser, artifactDir, report) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const entry = freshEntry('mounted-changelog-docxmax-release');
  observe(page, entry);
  await loginOwner(page, changelogPath, entry);
  await page.getByText('SovereignDocs SkyeDocxMax Lean Lane', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  const state = await page.evaluate(() => ({
    href: location.href,
    hasRelease: document.body.innerText.includes('SovereignDocs SkyeDocxMax Lean Lane'),
    hasProofPath: document.body.innerText.includes('test-artifacts/sovereigndocs-docxmax-lean-live/latest-live-browser-report.json')
  }));
  okStatus(entry, 'changelog_release_entry_live_after_shared_gate', state.hasRelease && state.hasProofPath, state);
  await screenshot(page, artifactDir, entry, 'mounted-changelog-docxmax-release');
  await context.close();
  entry.ok = entry.statuses.every(item => item.ok) && entry.consoleErrors.length === 0 && entry.failedRequests.length === 0 && entry.httpErrors.length === 0;
  report.entries.push(entry);
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(repoRoot, 'test-artifacts/sovereigndocs-docxmax-lean-live', stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    generated_at: new Date().toISOString(),
    baseUrl,
    originUrl,
    docxPath,
    entries: [],
    screenshots: [],
    deployment: {
      workerVersion: process.env.PROOF_WORKER_VERSION || '',
      pagesDeployment: process.env.PROOF_PAGES_DEPLOYMENT || ''
    }
  };

  const browser = await chromium.launch({ headless: false });
  try {
    await directOriginChecks(browser, artifactDir, report);
    await mountedDesktopChecks(browser, artifactDir, report);
    await mountedMobileChecks(browser, artifactDir, report);
    await changelogChecks(browser, artifactDir, report);
  } catch (error) {
    report.error = cleanFailure(error);
  } finally {
    await browser.close();
  }

  report.entries.forEach(entry => report.screenshots.push(...entry.screenshots));
  report.ok = !report.error && report.entries.length === 4 && report.entries.every(entry => entry.ok);
  const reportPath = path.join(artifactDir, 'live-browser-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const latestPath = path.join(repoRoot, 'test-artifacts/sovereigndocs-docxmax-lean-live/latest-live-browser-report.json');
  fs.mkdirSync(path.dirname(latestPath), { recursive: true });
  fs.copyFileSync(reportPath, latestPath);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, latest: latestPath }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  console.error(cleanFailure(error));
  process.exit(1);
});
