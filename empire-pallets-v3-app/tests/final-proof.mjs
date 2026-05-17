import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4220';
const artifactDir = process.env.ARTIFACT_DIR || '/workspaces/MetrAIyux-0S/test-artifacts/empire-pallets-v3-app/final-proof';
fs.mkdirSync(artifactDir, { recursive: true });

const routes = [
  { name: 'desktop-home', path: '/?intro=1', viewport: { width: 1440, height: 1000 } },
  { name: 'mobile-home', path: '/?intro=1', viewport: { width: 390, height: 844, isMobile: true } },
  { name: 'mobile-scan', path: '/scan.html', viewport: { width: 390, height: 844, isMobile: true } },
  { name: 'mobile-preview', path: '/preview.html', viewport: { width: 390, height: 844, isMobile: true } },
  { name: 'mobile-quote', path: '/quote.html?source=proof&service=Drop%20Trailer%20Service', viewport: { width: 390, height: 844, isMobile: true } }
];

const browser = await chromium.launch({ headless: true });
const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  routes: {},
  artifacts: []
};

async function primeScrollReveals(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight;
    const steps = [0, innerHeight * 0.72, innerHeight * 1.45, innerHeight * 2.25, max].filter((value, index, list) => value >= 0 && value <= max && list.indexOf(value) === index);
    for (const y of steps) {
      scrollTo(0, y);
      await wait(140);
    }
    scrollTo(0, 0);
    await wait(180);
  });
}

async function inspectRoute(route) {
  const page = await browser.newPage({ viewport: route.viewport });
  const consoleMessages = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'request failed' });
  });

  const waitUntil = route.path.includes('intro=1') ? 'domcontentloaded' : 'networkidle';
  const response = await page.goto(new URL(route.path, baseUrl).toString(), { waitUntil, timeout: 45000 });
  await page.waitForTimeout(route.path.includes('intro=1') ? 2300 : 900);

  const introData = await page.evaluate(() => {
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    };
    const intro = document.querySelector('[data-app-intro]');
    const introVideo = document.querySelector('[data-intro-video]');
    const gatedSurfaces = ['.header-alert', '.top', 'main'].map((selector) => document.querySelector(selector)).filter(Boolean);
    return {
      present: !!intro,
      visible: visible(intro),
      bodyIntroActive: document.body.classList.contains('intro-active'),
      appSurfaceVisibleWhileIntro: gatedSurfaces.some((element) => visible(element)),
      appSurfaceLockedWhileIntro: gatedSurfaces.every((element) => element.hasAttribute('inert') && element.getAttribute('aria-hidden') === 'true'),
      videoState: introVideo ? {
        readyState: introVideo.readyState,
        currentTime: introVideo.currentTime,
        paused: introVideo.paused,
        width: Math.round(introVideo.getBoundingClientRect().width),
        height: Math.round(introVideo.getBoundingClientRect().height)
      } : null
    };
  });

  if (introData.visible) {
    const introScreenshot = path.join(artifactDir, `${route.name}-custom-intro.png`);
    await page.screenshot({ path: introScreenshot, fullPage: false });
    report.artifacts.push(introScreenshot);
    await page.evaluate(() => document.querySelector('[data-enter-intro]')?.click());
    await page.waitForTimeout(1000);
  }

  await primeScrollReveals(page);

  const screenshot = path.join(artifactDir, `${route.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  report.artifacts.push(screenshot);

  const data = await page.evaluate(async () => {
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    };
    const query = (selector) => document.querySelector(selector);
    const all = (selector) => [...document.querySelectorAll(selector)];
    const video = query('.hero-media video') || query('video');
    const manifestHref = query('link[rel="manifest"]')?.getAttribute('href');
    const manifestOk = manifestHref ? await fetch(manifestHref).then((result) => result.ok).catch(() => false) : false;
    const swRegistered = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().then(Boolean).catch(() => false) : false;

    return {
      title: document.title,
      h1: query('h1')?.textContent.trim() || '',
      manifestOk,
      swRegistered,
      hScroll: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, document.body.scrollWidth - document.body.clientWidth),
      hasQr: !!query('img[src*="qr"], img[src*="empire-pallets-scan-qr"]'),
      hasVideo: !!video,
      videoState: video ? {
        readyState: video.readyState,
        currentTime: video.currentTime,
        paused: video.paused,
        width: Math.round(video.getBoundingClientRect().width),
        height: Math.round(video.getBoundingClientRect().height)
      } : null,
      ctaVisible: all('a,button').some((element) => /quote|scan|install|call|preview/i.test(element.textContent || '') && visible(element)),
      mainSubjectVisible: visible(query('.hero-media')) || visible(query('.hero-copy')) || visible(query('form[data-record-form]')),
      mobileMenuButtonVisible: visible(query('.hamb')),
      motionChrome: document.body.classList.contains('neon-motion-chrome'),
      livingCanvas: !!query('.industrial-living-field'),
      shimmer: !!query('.text-shimmer'),
      publicCopyClean: !/website|MCP smoke|debug|placeholder|OpenHands|ADFlow|SkyRoutes|VANTA|pitch engine|repair logic/i.test(document.body.innerText)
    };
  });
  data.intro = introData;

  if (data.mobileMenuButtonVisible) {
    await page.click('.hamb');
    await page.waitForTimeout(150);
    data.mobileMenu = await page.evaluate(() => ({
      navDisplay: getComputedStyle(document.querySelector('.links')).display,
      visibleLinks: [...document.querySelectorAll('.links a')].filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }).map((link) => link.textContent.trim())
    }));
    const menuScreenshot = path.join(artifactDir, `${route.name}-menu-open.png`);
    await page.screenshot({ path: menuScreenshot, fullPage: true });
    report.artifacts.push(menuScreenshot);
  }

  await page.close();
  report.routes[route.name] = {
    path: route.path,
    status: response?.status() || 0,
    consoleMessages,
    failedRequests,
    data
  };
}

for (const route of routes) {
  await inspectRoute(route);
}

const quote = await browser.newPage({ viewport: { width: 390, height: 844, isMobile: true } });
await quote.goto(new URL('/quote.html?source=final-proof', baseUrl).toString(), { waitUntil: 'networkidle', timeout: 45000 });
await quote.fill('[name="company"]', 'Empire Pallets');
await quote.fill('[name="contact"]', 'Preview Tester');
await quote.fill('[name="email"]', 'sales@empirepalletsaz.com');
await quote.fill('[name="phone"]', '480-662-6551');
await quote.selectOption('[name="service"]', { label: 'Drop Trailer Service' });
await quote.fill('[name="quantity"]', '500');
await quote.fill('[name="area"]', 'Phoenix 85009');
await quote.fill('[name="requirements"]', 'Final proof request for drop trailer route testing.');
await quote.click('button[type="submit"]');
await quote.waitForTimeout(900);
report.quoteSubmit = await quote.evaluate(() => ({
  result: document.querySelector('[data-form-result]')?.textContent.trim() || '',
  localRecords: JSON.parse(localStorage.getItem('empirePreviewRequests') || '[]').length,
  hScroll: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, document.body.scrollWidth - document.body.clientWidth)
}));
const quoteScreenshot = path.join(artifactDir, 'mobile-quote-submit.png');
await quote.screenshot({ path: quoteScreenshot, fullPage: true });
report.artifacts.push(quoteScreenshot);
await quote.close();
await browser.close();

const failures = [];
for (const [name, result] of Object.entries(report.routes)) {
  const data = result.data;
  if (result.status !== 200) failures.push(`${name}: status ${result.status}`);
  if (result.consoleMessages.length) failures.push(`${name}: console warnings/errors`);
  if (result.failedRequests.length) failures.push(`${name}: failed requests`);
  if (data.hScroll !== 0) failures.push(`${name}: horizontal overflow ${data.hScroll}`);
  if (!data.manifestOk) failures.push(`${name}: manifest missing`);
  if (!data.swRegistered) failures.push(`${name}: service worker missing`);
  if (!data.ctaVisible) failures.push(`${name}: first action not visible`);
  if (!data.mainSubjectVisible) failures.push(`${name}: main subject not visible`);
  if (!data.motionChrome) failures.push(`${name}: motion chrome missing`);
  if (!data.livingCanvas) failures.push(`${name}: living background missing`);
  if (!data.shimmer) failures.push(`${name}: text shimmer missing`);
  if (!data.publicCopyClean) failures.push(`${name}: public copy contains forbidden terms`);
  if (data.mobileMenuButtonVisible && (!data.mobileMenu || data.mobileMenu.navDisplay === 'none' || data.mobileMenu.visibleLinks.length === 0)) failures.push(`${name}: mobile menu did not open`);
}

for (const name of ['desktop-home', 'mobile-home']) {
  const intro = report.routes[name]?.data.intro;
  if (!intro?.present) failures.push(`${name}: custom intro missing`);
  if (!intro?.visible || !intro?.bodyIntroActive) failures.push(`${name}: custom intro did not cover app on load`);
  if (intro?.appSurfaceVisibleWhileIntro) failures.push(`${name}: app surfaces visible during intro`);
  if (!intro?.appSurfaceLockedWhileIntro) failures.push(`${name}: app surfaces were not inert during intro`);
  const introVideo = intro?.videoState;
  if (!introVideo || introVideo.readyState < 2 || introVideo.paused || introVideo.currentTime <= 0 || introVideo.width <= 0 || introVideo.height <= 0) {
    failures.push(`${name}: supplied intro video not playing`);
  }
}

for (const name of ['desktop-home', 'mobile-home', 'mobile-scan', 'mobile-preview']) {
  const state = report.routes[name]?.data.videoState;
  if (!state || state.readyState < 2 || state.paused || state.currentTime <= 0) failures.push(`${name}: video not playing`);
}

if (!report.routes['desktop-home']?.data.hasQr || !report.routes['mobile-scan']?.data.hasQr) failures.push('QR route/image missing');
if (!/Preview saved|Request received/i.test(report.quoteSubmit.result)) failures.push('quote submit proof missing');
if (report.quoteSubmit.hScroll !== 0) failures.push('quote submit horizontal overflow');

report.ok = failures.length === 0;
report.failures = failures;

const reportPath = path.join(artifactDir, 'final-proof.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, failures, reportPath, artifacts: report.artifacts.length }, null, 2));
if (!report.ok) process.exit(1);
