import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CONNECTLOG_RELAY13_BASE_URL || 'http://127.0.0.1:4173/';
const root = path.resolve(process.cwd());
const artifactDir = path.join(root, 'test-artifacts', 'connectlog-relay13');
const reportPath = path.join(root, 'test-artifacts', 'connectlog-relay13-e2e-report.json');

await fs.mkdir(artifactDir, { recursive: true });

const pages = [
  {
    id: 'home',
    route: 'index.html',
    selectors: ['a[href="live/connectlog-relay13-operator-proof.html"]', '#connectlog-relay13-expansion'],
    text: ['ConnectLog + Relay13']
  },
  {
    id: 'expansion-hub',
    route: 'live/connectlog-relay13-operator-proof.html',
    selectors: ['a[href="../connectlog-v7.7-relay13-operator-proof/app.html"]', 'a[href="https://relay13-core.graylondonskyes.workers.dev/"]'],
    text: ['relationship network', 'Live Worker boundary', 'production activation proof']
  },
  {
    id: 'proof-receipt',
    route: 'proof/connectlog-relay13-expansion-receipt.html',
    selectors: ['a[href="../connectlog-v7.7-relay13-operator-proof/app.html"]', 'a[href="https://relay13-core.graylondonskyes.workers.dev/admin/"]', 'video[data-proof-video]'],
    text: ['ConnectLog package check', 'Relay13 package smoke', 'Browser action reel'],
    videoSelector: 'video[data-proof-video]'
  },
  {
    id: 'connectlog-landing',
    route: 'connectlog-v7.7-relay13-operator-proof/index.html',
    selectors: ['a[data-open-app]', 'img[src="assets/connectlog-logo-512.png"]'],
    text: ['Meet people once', 'Offline-first PWA']
  },
  {
    id: 'connectlog-app-relay-panel',
    route: 'connectlog-v7.7-relay13-operator-proof/app.html#relay13',
    selectors: ['#relayOriginInput', '#relayBridgeHealthBtn', '#relayRunActivationProofBtn', '#relayOpenAdminBtn'],
    text: ['Relay13 bridge']
  },
  {
    id: 'relay13-public-preview',
    route: 'relay13-core-v1.7-connectlog-operator-proof/public/index.html',
    selectors: ['a[href="admin/"]', 'img.hero-logo'],
    text: ['One relay', 'Launch Relay13 Console'],
    imageSelector: 'img.hero-logo'
  },
  {
    id: 'relay13-console-preview',
    route: 'relay13-core-v1.7-connectlog-operator-proof/public/admin/',
    selectors: ['#adminToken', '#bootstrap', '#workspaceSelect', 'script[src="app.js"]'],
    text: ['Relay13 Console', 'Platform admin token'],
    imageSelector: '.brand-logo'
  }
];

const checks = [];
const browser = await chromium.launch();

async function runViewport(viewport, suffix) {
  const context = await browser.newContext({ viewport });
  for (const spec of pages) {
    const page = await context.newPage();
    const jsErrors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') jsErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!url.includes('/api/')) failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'failed'}`);
    });

    const url = new URL(spec.route, baseUrl).toString();
    const startedAt = new Date().toISOString();
    const entry = { id: `${spec.id}-${suffix}`, route: spec.route, url, started_at: startedAt, checks: [] };

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      entry.checks.push({ name: 'http_ok', ok: Boolean(response?.ok()), status: response?.status() || 0 });

      for (const selector of spec.selectors) {
        await page.locator(selector).first().waitFor({ state: 'attached', timeout: 8000 });
        entry.checks.push({ name: `selector:${selector}`, ok: true });
      }

      for (const text of spec.text) {
        await page.getByText(text, { exact: false }).first().waitFor({ state: 'attached', timeout: 8000 });
        entry.checks.push({ name: `text:${text}`, ok: true });
      }

      if (spec.imageSelector) {
        const imageOk = await page.locator(spec.imageSelector).first().evaluate((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0);
        entry.checks.push({ name: `image_loaded:${spec.imageSelector}`, ok: imageOk });
      }

      if (spec.videoSelector) {
        const videoState = await page.locator(spec.videoSelector).first().evaluate(async (video) => {
          if (!(video instanceof HTMLVideoElement)) {
            return { ok: false, reason: 'not_a_video_element' };
          }

          video.muted = true;
          video.currentTime = 0;
          try {
            await video.play();
          } catch (error) {
            return { ok: false, reason: error.message, readyState: video.readyState, paused: video.paused, currentTime: video.currentTime };
          }

          await new Promise((resolve) => setTimeout(resolve, 850));
          const rect = video.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          return {
            ok: video.readyState >= 2 && video.currentTime > 0 && !video.paused && visible,
            readyState: video.readyState,
            paused: video.paused,
            currentTime: video.currentTime,
            visible
          };
        });
        entry.checks.push({ name: `video_playback:${spec.videoSelector}`, ok: videoState.ok, details: videoState });
      }

      const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2);
      entry.checks.push({ name: 'no_horizontal_scroll', ok: noHorizontalScroll });

      const screenshot = path.join(artifactDir, `${spec.id}-${suffix}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      entry.screenshot = screenshot;

      entry.console_errors = jsErrors;
      entry.failed_requests = failedRequests;
      entry.ok = entry.checks.every((item) => item.ok) && jsErrors.length === 0 && failedRequests.length === 0;
    } catch (error) {
      entry.ok = false;
      entry.error = error.message;
      entry.console_errors = jsErrors;
      entry.failed_requests = failedRequests;
    } finally {
      entry.finished_at = new Date().toISOString();
      checks.push(entry);
      await page.close();
    }
  }
  await context.close();
}

await runViewport({ width: 1440, height: 1000 }, 'desktop');
await runViewport({ width: 390, height: 844 }, 'mobile');
await browser.close();

const report = {
  ok: checks.every((entry) => entry.ok),
  base_url: baseUrl,
  generated_at: new Date().toISOString(),
  checks
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
