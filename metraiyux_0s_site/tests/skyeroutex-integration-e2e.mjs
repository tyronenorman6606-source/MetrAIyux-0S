import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const SITE_ROOT = path.resolve(path.dirname(__filename), '..');
const ARTIFACT_DIR = path.resolve(SITE_ROOT, '..', 'test-artifacts', 'skyeroutex-integration');

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
]);

function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const clean = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      let filePath = path.resolve(root, clean);
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (existsSync(filePath) && !path.extname(filePath) && clean.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
      }
      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': TYPES.get(path.extname(filePath)) || 'text/plain; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function expectText(page, text) {
  const found = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  if (!found) throw new Error(`Missing visible text: ${text}`);
}

async function assertNoHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const { server, baseUrl } = await startStaticServer(SITE_ROOT);
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'SkyeRouteX');
    await expectText(page, 'route-heavy workforce command lane');
    await assertNoHorizontalScroll(page, '0S home desktop');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'home-desktop.png'), fullPage: true });

    await page.goto(`${baseUrl}/live/skyeroutex-workforce-command.html`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'Route-heavy work now has its own command lane');
    await expectText(page, 'API/browser proof platform');
    await assertNoHorizontalScroll(page, 'RouteX hub desktop');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'routex-hub-desktop.png'), fullPage: true });

    await page.goto(`${baseUrl}/SkyeRouteX/workforce-command-v0.4.0/index.html`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'SkyeRoutex Workforce Command');
    await expectText(page, 'v0.4.0');
    await assertNoHorizontalScroll(page, 'RouteX v0.4.0 hub desktop');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'routex-v040-hub-desktop.png'), fullPage: true });

    await page.goto(`${baseUrl}/skyeroutex-workforce-command-v0.4.0/index.html`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'SkyeRoutex Workforce Command');
    await expectText(page, 'v0.4.0');
    await assertNoHorizontalScroll(page, 'RouteX legacy v0.4.0 compatibility path');

    await page.goto(`${baseUrl}/SkyeRouteX/workforce-command-v0.4.0/public/index.html`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'City/state job boards');
    await expectText(page, 'Provider Panel');
    await expectText(page, 'Contractor Panel');
    await assertNoHorizontalScroll(page, 'RouteX v0.4.0 public UI desktop');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'routex-v040-public-desktop.png'), fullPage: true });

    await page.goto(`${baseUrl}/SkyeRouteX/index.html`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'SkyeRouteX Workforce Command');
    await page.locator('[data-action="dashboard-0"]').first().click();
    await page.locator('#quickRuntime').click();
    await expectText(page, 'Runtime');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'routex-app-desktop.png'), fullPage: true });

    for (const endpoint of ['health', 'status', 'v1/runtime-summary', 'v1/sessions', 'queue', 'handoff-packs', 'review-board', 'execution-board', 'dispatch-board']) {
      const response = await page.request.get(`${baseUrl}/SkyeRouteX/${endpoint}`);
      if (!response.ok()) throw new Error(`RouteX endpoint failed: ${endpoint} ${response.status()}`);
      const body = await response.text();
      if (!body.includes('SkyeRouteX Workforce Command')) throw new Error(`RouteX endpoint missing app title: ${endpoint}`);
    }

    await page.goto(`${baseUrl}/sales/live-proof-router.html`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/The day breaks in the field/i).check();
    await page.locator('#buildRoute').click();
    await expectText(page, 'SkyeRouteX Workforce Command');

    await page.goto(`${baseUrl}/pricing/index.html#routex-workforce-command`, { waitUntil: 'domcontentloaded' });
    await expectText(page, 'RouteX Workforce Command');
    await expectText(page, '$1,497');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    mobile.on('pageerror', (error) => errors.push(error.message));
    await mobile.goto(`${baseUrl}/live/skyeroutex-workforce-command.html`, { waitUntil: 'domcontentloaded' });
    await expectText(mobile, 'SkyeRouteX expansion');
    await assertNoHorizontalScroll(mobile, 'RouteX hub mobile');
    await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'routex-hub-mobile.png'), fullPage: true });
    await mobile.close();

    if (errors.length) throw new Error(`Browser page errors: ${errors.join(' | ')}`);

    const report = {
      ok: true,
      baseUrl,
      checkedAt: new Date().toISOString(),
      assertions: [
        '0S home links SkyeRouteX',
        'RouteX hub renders with runtime boundary copy',
        'RouteX v0.4.0 static hub and API UI render inside the SkyeRouteX folder',
        'Legacy v0.4.0 path resolves through the compatibility pointer',
        'RouteX app shell opens and controls respond',
        'RouteX static contract endpoints return content',
        'Sales proof router recommends SkyeRouteX for field-route pain',
        'Pricing exposes RouteX Workforce Command',
        'Desktop and mobile screenshots captured without horizontal overflow'
      ],
      artifacts: ['home-desktop.png', 'routex-hub-desktop.png', 'routex-v040-hub-desktop.png', 'routex-v040-public-desktop.png', 'routex-app-desktop.png', 'routex-hub-mobile.png']
    };
    await writeFile(path.join(ARTIFACT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
