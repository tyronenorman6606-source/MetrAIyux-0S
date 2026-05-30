#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = fs.existsSync('/workspaces/MetrAIyux-0S') ? '/workspaces/MetrAIyux-0S' : process.cwd();
const baseUrl = (process.env.SKYE_MUSIC_NEXUS_PROOF_BASE_URL || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const workerUrl = (process.env.ZERO_OS_WORKER_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || 'pages:f109f3e7 worker:c35e5191-c6c9-420b-815d-da39076302f2';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier', `${stamp}-skyemusicnexus-social-pr-parity`);
const reportPath = path.join(artifactDir, 'live-browser-verification-report.json');
const latestPath = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier', 'skyemusicnexus-social-pr-parity-latest.json');

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux' || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  if (process.env.DISPLAY && process.env.FORCE_LIVE_BROWSER_XVFB !== '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      LIVE_BROWSER_XVFB_ACTIVE: '1',
      DISPLAY: undefined,
      WAYLAND_DISPLAY: undefined
    }
  });
  process.exit(child.status ?? 1);
}

function urlFor(route, origin = baseUrl) {
  return new URL(route, `${origin}/`).toString();
}

function sanitize(value) {
  return String(value || '').replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]');
}

function observe(page, entry) {
  page.on('console', message => {
    if (message.type() === 'error') entry.consoleErrors.push(sanitize(message.text()).slice(0, 1000));
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'request failed';
    if (/ERR_ABORTED|net::ERR_BLOCKED_BY_CLIENT/i.test(failure)) return;
    entry.failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure
    });
  });
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status < 400) return;
    if (/favicon\.ico/i.test(url)) return;
    if (/\/api\/skymusicnexus\//i.test(url) && [401, 403, 404].includes(status)) return;
    entry.httpErrors.push({
      url,
      status,
      method: response.request().method(),
      resourceType: response.request().resourceType()
    });
  });
}

async function viewportMetrics(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visibleNodes = [...document.body.querySelectorAll('main, header, nav, section, article, aside, footer, h1, h2, h3, p, a, button, label, input, textarea, select, img, canvas, video, svg, figure, details, summary')].filter(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < vh && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const media = visibleNodes.filter(node => ['IMG', 'CANVAS', 'VIDEO', 'SVG', 'FIGURE'].includes(node.tagName));
    const text = visibleNodes.slice(0, 220).map(node => node.innerText || node.textContent || node.alt || node.getAttribute('aria-label') || '').join(' ').replace(/\s+/g, ' ').trim();
    const brokenImages = [...document.images].filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < vh && img.complete && img.naturalWidth === 0;
    }).map(img => img.currentSrc || img.src).slice(0, 10);
    return {
      viewport: { width: vw, height: vh },
      scrollY: Math.round(window.scrollY),
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      visibleElementCount: visibleNodes.length,
      visibleMediaCount: media.length,
      visibleTextLength: text.length,
      visibleTextSample: text.slice(0, 180),
      horizontalOverflow: Math.max(0, Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw),
      brokenImages
    };
  });
}

async function screenshot(page, entry, label) {
  const file = path.join(artifactDir, `${entry.viewportLabel}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 90000 });
  const bytes = fs.statSync(file).size;
  entry.screenshots.push({ label, path: file, bytes });
  return file;
}

async function assertVisible(page, entry, selector, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  const box = await locator.boundingBox();
  const ok = Boolean(box && box.width > 2 && box.height > 2);
  entry.checks.push({ name: label, ok, selector, box });
  if (!ok) throw new Error(`${label} not visible`);
}

async function gotoRoute(page, entry, route, expectText) {
  const target = urlFor(route);
  const response = await page.goto(target, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const text = await page.locator('body').innerText({ timeout: 30000 });
  const ok = text.toLowerCase().includes(expectText.toLowerCase());
  entry.actions.push(`navigated ${route}`);
  entry.checks.push({ name: `${route} contains ${expectText}`, ok, status: response?.status() || 0, finalUrl: page.url() });
  if (!ok) throw new Error(`${route} did not contain ${expectText}`);
}

async function click(page, entry, selector, label) {
  await page.locator(selector).first().click({ timeout: 30000 });
  entry.actions.push(label);
  await page.waitForTimeout(700);
}

async function fill(page, entry, selector, value, label) {
  await page.locator(selector).first().fill(String(value), { timeout: 30000 });
  entry.actions.push(label);
}

async function select(page, entry, selector, value, label) {
  await page.locator(selector).first().selectOption(value, { timeout: 30000 });
  entry.actions.push(label);
}

async function scrollProof(page, entry, label) {
  const maxY = await page.evaluate(() => Math.max(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight));
  const stops = maxY < 10 ? [0] : [0, Math.round(maxY * 0.25), Math.round(maxY * 0.55), Math.round(maxY * 0.82), maxY];
  const scrollStops = [];
  for (const [index, y] of stops.entries()) {
    await page.mouse.wheel(0, index === 0 ? -99999 : 999);
    await page.evaluate(nextY => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(450);
    const metrics = await viewportMetrics(page);
    const shot = await screenshot(page, entry, `${label}-scroll-${String(index + 1).padStart(2, '0')}`);
    const ok = metrics.visibleElementCount >= 6
      && (metrics.visibleTextLength >= 30 || metrics.visibleMediaCount >= 2)
      && metrics.brokenImages.length === 0
      && metrics.horizontalOverflow <= 24;
    scrollStops.push({ ...metrics, ok, screenshot: shot });
    if (!ok) throw new Error(`${label} failed visual gate at scrollY ${metrics.scrollY}: ${JSON.stringify(metrics)}`);
  }
  entry.scrollStops.push({ label, stops: scrollStops });
}

async function selectedValue(page, selector) {
  return page.locator(selector).first().evaluate(node => node.value).catch(() => '');
}

async function exerciseFeed(page, entry, viewportLabel) {
  await gotoRoute(page, entry, '/public/feed.html', 'Open Social Feed');
  await assertVisible(page, entry, '#socialFeedDeck', 'feed deck visible');
  await assertVisible(page, entry, '#socialStoryRail', 'story rail visible');
  await assertVisible(page, entry, '#socialPrAgentForm', 'PR brain form visible');
  await assertVisible(page, entry, '#contestCreateForm', 'contest form visible');
  await screenshot(page, entry, 'feed-top');

  await click(page, entry, 'nav a[href="./library.html"]', 'clicked Library nav from feed');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  entry.checks.push({ name: 'library navigation reached', ok: /\/public\/library/i.test(page.url()), url: page.url() });
  await gotoRoute(page, entry, '/public/feed.html', 'Open Social Feed');

  const suffix = `${viewportLabel}-${Date.now()}`;
  await fill(page, entry, '#feedComposeForm [name="caption"]', `Live browser proof post ${suffix}: release signal, fan prompt, and social action check.`, 'filled feed caption');
  await fill(page, entry, '#feedComposeForm [name="artistId"]', `proof_artist_${suffix}`, 'filled feed artist');
  await fill(page, entry, '#feedComposeForm [name="releaseId"]', `proof_release_${suffix}`, 'filled feed release');
  await fill(page, entry, '#feedComposeForm [name="hashtags"]', 'musicnexus,proof,feature', 'filled feed tags');
  await fill(page, entry, '#feedComposeForm [name="mediaUrl"]', 'https://skye-music-nexus.pages.dev/assets/og-card.svg', 'filled feed media');
  await fill(page, entry, '#feedComposeForm [name="altText"]', 'SkyeMusicNexus proof card cover', 'filled feed alt text');
  await click(page, entry, '#feedComposeForm button[type="submit"]', 'submitted feed composer');
  await assertVisible(page, entry, '#feedComposeResult', 'feed composer result visible');
  await page.waitForFunction(() => document.body.innerText.includes('Live browser proof post'), null, { timeout: 30000 });
  entry.checks.push({ name: 'feed post rendered after composer submit', ok: true });

  await click(page, entry, '[data-feed-action="like"]', 'liked feed post');
  await click(page, entry, '[data-feed-action="save"]', 'saved feed post');
  await fill(page, entry, '.real-feed-card:first-child .feed-comment-form input[name="body"]', `Proof comment ${suffix}`, 'filled feed comment');
  await click(page, entry, '.real-feed-card:first-child .feed-comment-form button', 'posted feed comment');
  await page.waitForFunction(() => document.body.innerText.includes('Proof comment'), null, { timeout: 30000 });
  entry.checks.push({ name: 'comment rendered after submit', ok: true });

  await fill(page, entry, '#socialPrAgentForm [name="artistId"]', `proof_artist_${suffix}`, 'filled PR artist');
  await fill(page, entry, '#socialPrAgentForm [name="releaseId"]', `proof_release_${suffix}`, 'filled PR release');
  await fill(page, entry, '#socialPrAgentForm [name="title"]', `Proof Feature ${suffix}`, 'filled PR title');
  await fill(page, entry, '#socialPrAgentForm [name="focus"]', 'new drop, contest winner, artist story, fan discovery, and storefront push', 'filled PR focus');
  await fill(page, entry, '#socialPrAgentForm [name="keywords"]', 'SkyeMusicNexus, artist feature, new music', 'filled PR keywords');
  await click(page, entry, '#socialPrAgentForm button[type="submit"]', 'drafted PR feature package');
  await page.waitForFunction(() => document.body.innerText.includes('Proof Feature'), null, { timeout: 30000 });
  entry.checks.push({ name: 'PR package rendered after submit', ok: true });

  await fill(page, entry, '#contestCreateForm [name="title"]', `Proof Feature Contest ${suffix}`, 'filled contest title');
  await select(page, entry, '#contestCreateForm [name="prizeType"]', 'featured_blog_pr_package', 'selected contest prize');
  await fill(page, entry, '#contestCreateForm [name="maxEntries"]', '40', 'filled contest max entries');
  await fill(page, entry, '#contestCreateForm [name="prizeDescription"]', 'Featured blog, feed push, and SkyeNet PR package', 'filled contest prize detail');
  await fill(page, entry, '#contestCreateForm [name="rules"]', 'Owner approval, safe links, rights-safe assets, public artist links only.', 'filled contest rules');
  await click(page, entry, '#contestCreateForm button[type="submit"]', 'created contest');
  await page.waitForFunction(() => document.body.innerText.includes('Proof Feature Contest'), null, { timeout: 30000 });
  entry.checks.push({ name: 'contest rendered after creation', ok: true });

  const contestId = await selectedValue(page, '#contestEntryForm select[name="contestId"]');
  entry.checks.push({ name: 'contest select populated', ok: Boolean(contestId), contestId });
  if (!contestId) throw new Error('contest select did not populate after contest creation');
  await fill(page, entry, '#contestEntryForm [name="artistId"]', `proof_artist_${suffix}`, 'filled contest entry artist id');
  await fill(page, entry, '#contestEntryForm [name="artistName"]', `Proof Artist ${suffix}`, 'filled contest entry artist name');
  await fill(page, entry, '#contestEntryForm [name="submittedLinks"]', 'https://skye-music-nexus.pages.dev/public/player.html, /public/library.html', 'filled contest safe links');
  await fill(page, entry, '#contestEntryForm [name="note"]', 'This artist has a new release moment ready for a featured PR lane.', 'filled contest note');
  await click(page, entry, '#contestEntryForm button[type="submit"]', 'submitted contest entry');
  await page.waitForFunction(() => document.body.innerText.includes('pending_review') || document.body.innerText.includes('Proof Artist'), null, { timeout: 30000 });
  entry.checks.push({ name: 'contest entry rendered after submit', ok: true });

  await click(page, entry, '#contestDrawForm button[type="submit"]', 'selected contest winner');
  await page.waitForFunction(() => document.body.innerText.includes('owner_approval_required') || document.body.innerText.includes('feature_pkg'), null, { timeout: 30000 }).catch(() => {});
  const packageId = await selectedValue(page, '#contestPackageForm select[name="featurePackageId"]');
  entry.checks.push({ name: 'feature package select populated', ok: Boolean(packageId), packageId });
  if (packageId) {
    await fill(page, entry, '#contestPackageForm [name="focus"]', 'winner feature angle and release discovery', 'filled package focus');
    await click(page, entry, '#contestPackageForm button[type="submit"]', 'generated contest feature package');
    await page.waitForFunction(() => document.body.innerText.includes('drafted_for_owner_review') || document.body.innerText.includes('Feature'), null, { timeout: 30000 }).catch(() => {});
  }

  await scrollProof(page, entry, 'feed');
}

async function exerciseContests(page, entry) {
  await gotoRoute(page, entry, '/public/contests.html', 'Contests');
  await assertVisible(page, entry, '#contestCreateForm', 'contest page create form visible');
  await assertVisible(page, entry, '#socialPrAgentForm', 'contest page PR form visible');
  await screenshot(page, entry, 'contests-top');
  await click(page, entry, 'nav a[href="./feed.html"]', 'clicked Feed nav from contests');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  entry.checks.push({ name: 'feed navigation reached from contests', ok: /\/public\/feed/i.test(page.url()), url: page.url() });
  await gotoRoute(page, entry, '/public/contests.html', 'Contests');
  await scrollProof(page, entry, 'contests');
}

async function exerciseSupportPages(page, entry) {
  await gotoRoute(page, entry, '/public/ads.html', 'Ad');
  await scrollProof(page, entry, 'ads');
  await gotoRoute(page, entry, '/public/library.html', 'Library');
  await scrollProof(page, entry, 'library');
}

async function proofMountedGate(page, entry) {
  const response = await page.goto(urlFor('/SkyeMusicNexus/public/feed.html', workerUrl), { waitUntil: 'commit', timeout: 90000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  const finalUrl = page.url();
  const ok = (response?.status() || 0) < 400 && /\/admin\/login\.html/i.test(finalUrl);
  entry.actions.push('opened mounted gated feed route');
  entry.checks.push({ name: 'mounted 0S route redirects to shared owner gate unauthenticated', ok, status: response?.status() || 0, finalUrl });
  if (!ok) throw new Error(`mounted gate route did not land on admin login: ${finalUrl}`);
  await screenshot(page, entry, 'mounted-gate-login');
}

async function runViewport(browser, viewport, viewportLabel) {
  const entry = {
    viewport,
    viewportLabel,
    ok: false,
    actions: [],
    checks: [],
    screenshots: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    failures: []
  };
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(90000);
  observe(page, entry);
  try {
    await exerciseFeed(page, entry, viewportLabel);
    await exerciseContests(page, entry);
    if (viewportLabel === 'desktop') await exerciseSupportPages(page, entry);
    await proofMountedGate(page, entry);
  } catch (error) {
    entry.failures.push(sanitize(error?.stack || error?.message || error).split('\n').slice(0, 10).join('\n'));
  } finally {
    const materialConsoleErrors = entry.consoleErrors.filter(message => {
      if (/Failed to load resource/i.test(message) && /\/api\/skymusicnexus\//i.test(message)) return false;
      if (/^Failed to load resource: the server responded with a status of (401|403|404)/i.test(message)) return false;
      return !/favicon\.ico/i.test(message);
    });
    if (materialConsoleErrors.length) entry.failures.push(`console errors: ${materialConsoleErrors.slice(0, 4).join(' | ')}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests: ${entry.failedRequests.slice(0, 4).map(item => item.url).join(', ')}`);
    if (entry.httpErrors.length) entry.failures.push(`http errors: ${entry.httpErrors.slice(0, 4).map(item => `${item.status} ${item.url}`).join(', ')}`);
    entry.ok = entry.failures.length === 0 && entry.checks.every(check => check.ok);
    entry.materialConsoleErrors = materialConsoleErrors;
    await context.close();
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });
  const browser = await chromium.launch({
    headless: false,
    timeout: 300000,
    args: ['--disable-gpu', '--disable-software-rasterizer', '--ozone-platform=x11', '--no-sandbox']
  });
  const results = [];
  try {
    results.push(await runViewport(browser, { width: 1440, height: 980 }, 'desktop'));
    results.push(await runViewport(browser, { width: 390, height: 844 }, 'mobile'));
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    ok: results.every(result => result.ok),
    mode: 'headed-live-browser',
    headless: false,
    generatedAt: new Date().toISOString(),
    baseUrl,
    workerUrl,
    deploymentVersion,
    artifactDir,
    results,
    failures: results.flatMap(result => result.failures)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: report.ok,
    reportPath,
    latestPath,
    summary: results.map(result => ({
      viewport: result.viewportLabel,
      checks: result.checks.length,
      actions: result.actions.length,
      screenshots: result.screenshots.length,
      scrollGroups: result.scrollStops.length,
      failures: result.failures.length
    })),
    failures: report.failures
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    mode: 'headed-live-browser',
    headless: false,
    generatedAt: new Date().toISOString(),
    baseUrl,
    workerUrl,
    deploymentVersion,
    artifactDir,
    failures: [sanitize(error?.stack || error?.message || error)]
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, reportPath, latestPath, error: sanitize(error?.message || error) }, null, 2));
  process.exit(1);
});
