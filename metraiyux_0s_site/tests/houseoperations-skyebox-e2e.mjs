import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, request } from 'playwright';

const baseUrl = process.env.HOUSEOPS_SKYEBOX_BASE_URL || 'http://127.0.0.1:4173/';
const root = path.resolve(process.cwd());
const artifactDir = path.join(root, 'test-artifacts', 'houseoperations-skyebox');
const reportPath = path.join(root, 'test-artifacts', 'houseoperations-skyebox-e2e-report.json');

await fs.mkdir(artifactDir, { recursive: true });

const checks = [];
const videoEntries = [];

function routeUrl(route) {
  return new URL(route, baseUrl).toString();
}

function failText(error) {
  return String(error?.stack || error?.message || error).split('\n').slice(0, 5).join('\n').slice(0, 1000);
}

async function withPage(context, id, viewportName, fn) {
  const page = await context.newPage();
  const video = page.video();
  const jsErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => jsErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') jsErrors.push(message.text());
  });
  page.on('requestfailed', (requestItem) => {
    const failure = requestItem.failure()?.errorText || 'request failed';
    if (!failure.includes('ERR_ABORTED')) failedRequests.push(`${requestItem.method()} ${requestItem.url()}: ${failure}`);
  });

  const entry = { id: `${id}-${viewportName}`, checks: [], console_errors: jsErrors, failed_requests: failedRequests };
  try {
    await fn(page, entry);
    const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2);
    entry.checks.push({ name: 'no_horizontal_scroll', ok: noHorizontalScroll });
    entry.ok = entry.checks.every((item) => item.ok) && jsErrors.length === 0 && failedRequests.length === 0;
  } catch (error) {
    entry.ok = false;
    entry.error = failText(error);
  } finally {
    const screenshot = path.join(artifactDir, `${id}-${viewportName}.png`);
    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => undefined);
    entry.screenshot = screenshot;
    await page.close();
    if (video) {
      const generatedVideoPath = await video.path();
      const finalVideoPath = path.join(artifactDir, `${id}-${viewportName}.webm`);
      await fs.rm(finalVideoPath, { force: true });
      await fs.rename(generatedVideoPath, finalVideoPath);
      entry.video = finalVideoPath;
      entry.checks.push({ name: 'browser_video_recorded', ok: true, path: finalVideoPath });
      videoEntries.push({ id: entry.id, path: finalVideoPath, poster: screenshot });
    } else {
      entry.checks.push({ name: 'browser_video_recorded', ok: false });
    }
    entry.ok = entry.checks.every((item) => item.ok) && jsErrors.length === 0 && failedRequests.length === 0;
    checks.push(entry);
  }
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cssId(value) {
  return `video-${String(value).replace(/[^a-z0-9_-]/gi, '-')}`;
}

async function verifyVideoPlayback(browser) {
  const videoProofPath = path.join(artifactDir, 'video-proof.html');
  const videos = videoEntries.map((entry) => {
    const id = cssId(entry.id);
    const src = htmlEscape(path.basename(entry.path));
    const poster = htmlEscape(path.basename(entry.poster));
    return `<figure><video id="${id}" src="./${src}" poster="./${poster}" autoplay muted playsinline controls width="640"></video><figcaption>${htmlEscape(entry.id)}</figcaption></figure>`;
  }).join('\n');

  await fs.writeFile(videoProofPath, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HouseOperations + SkyeBox Browser Video Proof</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#111;color:#f8f5ef;padding:24px}
main{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
figure{margin:0}
video{display:block;width:100%;height:auto;background:#000;border:1px solid #706a5d}
figcaption{margin-top:8px;font-size:14px;color:#d9d1c1}
</style>
</head>
<body><main>${videos}</main></body></html>
`);

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const entry = { id: 'browser-video-playback-proof', ok: false, checks: [], console_errors: [], failed_requests: [], proof_page: videoProofPath };
  try {
    await page.goto(pathToFileURL(videoProofPath).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    for (const videoEntry of videoEntries) {
      const selector = `#${cssId(videoEntry.id)}`;
      await page.locator(selector).waitFor({ state: 'visible', timeout: 10000 });
      const playback = await page.locator(selector).evaluate(async (node) => {
        node.muted = true;
        node.playbackRate = 4;
        await node.play();
        await new Promise((resolve) => {
          if (node.currentTime > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          node.addEventListener('timeupdate', done, { once: true });
          setTimeout(done, 5000);
        });
        const rect = node.getBoundingClientRect();
        return {
          readyState: node.readyState,
          currentTime: node.currentTime,
          paused: node.paused,
          visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
        };
      });
      entry.checks.push({
        name: `video_playback:${videoEntry.id}`,
        ok: playback.readyState >= 2 && playback.currentTime > 0 && playback.paused === false && playback.visible === true,
        path: videoEntry.path,
        playback
      });
    }
    entry.ok = entry.checks.every((item) => item.ok);
  } catch (error) {
    entry.ok = false;
    entry.error = failText(error);
  } finally {
    checks.push(entry);
    await context.close();
  }
}

async function assertText(page, entry, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
  entry.checks.push({ name: `text:${text}`, ok: true });
}

async function assertSelector(page, entry, selector) {
  await page.locator(selector).first().waitFor({ state: 'attached', timeout: 12000 });
  entry.checks.push({ name: `selector:${selector}`, ok: true });
}

async function checkHouseOperations(page, entry) {
  const response = await page.goto(routeUrl('HouseOperations/index.html'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  entry.checks.push({ name: 'houseops_http_ok', ok: Boolean(response?.ok()), status: response?.status() || 0 });
  await assertText(page, entry, 'Task Command');
  await assertText(page, entry, 'SkyeBox Authenticator');
  await page.getByRole('button', { name: 'New Task' }).first().click();
  await assertText(page, entry, 'New house task');
  await page.getByRole('button', { name: 'Advance' }).first().click();
  await page.getByRole('button', { name: 'Save Proof' }).first().click();
  await assertText(page, entry, 'Proof saved.');

  const downloadPromise = page.waitForEvent('download', { timeout: 12000 });
  await page.getByRole('button', { name: 'Export' }).first().click();
  const download = await downloadPromise;
  const downloadPath = path.join(artifactDir, `houseoperations-${entry.id}.json`);
  await download.saveAs(downloadPath);
  entry.checks.push({ name: 'houseops_export_download', ok: true, suggested: download.suggestedFilename(), path: downloadPath });

  await page.goto(routeUrl('HouseOperations/runtime.html'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await assertText(page, entry, 'Runtime Proof');
  await assertText(page, entry, 'SkyeBox Authenticator Vault');

  await page.goto(routeUrl('HouseOperations/tutorial.html'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await assertText(page, entry, 'Guided Run');
  await page.getByRole('button', { name: 'Run Full Tutorial' }).first().click();
  await assertText(page, entry, 'Create billing intent');
  await assertText(page, entry, 'Owner alert created.');

  const tutorialDownloadPromise = page.waitForEvent('download', { timeout: 12000 });
  await page.getByRole('button', { name: 'Export Tutorial Receipt' }).first().click();
  const tutorialDownload = await tutorialDownloadPromise;
  const tutorialPath = path.join(artifactDir, `houseoperations-tutorial-${entry.id}.json`);
  await tutorialDownload.saveAs(tutorialPath);
  entry.checks.push({ name: 'houseops_tutorial_receipt_download', ok: true, suggested: tutorialDownload.suggestedFilename(), path: tutorialPath });

  await page.goto(routeUrl('HouseOperations/billing.html'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await assertText(page, entry, 'Billing Intent');
  await page.locator('input[name="customer_email"]').fill('buyer@example.com');
  await page.locator('input[name="company"]').fill('Buyer House Ops');
  await page.locator('form[data-form="billing"] button[type="submit"]').click();
  await assertText(page, entry, 'Buyer House Ops');
  await assertText(page, entry, 'HouseOperations Command');

  const billingDownloadPromise = page.waitForEvent('download', { timeout: 12000 });
  await page.locator('[data-action="export-billing-intent"]').first().click();
  const billingDownload = await billingDownloadPromise;
  const billingPath = path.join(artifactDir, `houseoperations-billing-${entry.id}.json`);
  await billingDownload.saveAs(billingPath);
  entry.checks.push({ name: 'houseops_billing_intent_download', ok: true, suggested: billingDownload.suggestedFilename(), path: billingPath });
}

async function checkSkyeBox(page, entry) {
  const response = await page.goto(routeUrl('HouseOperations/skye-box-authenticator-vault/index.html'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  entry.checks.push({ name: 'skyebox_http_ok', ok: Boolean(response?.ok()), status: response?.status() || 0 });
  await assertText(page, entry, 'Encrypted authenticator vault');
  await assertSelector(page, entry, '#authForm');

  await page.locator('#passwordInput').fill('correct horse battery staple');
  await page.locator('#confirmInput').fill('correct horse battery staple');
  await page.locator('#authSubmit').click();
  await page.locator('#appView:not(.hidden)').waitFor({ state: 'attached', timeout: 30000 });
  await assertText(page, entry, 'No authenticators yet.');

  await page.locator('#addBtn').click();
  await page.locator('#uriInput').fill('otpauth://totp/Example:operator%40metraiyux.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&period=30&digits=6');
  await page.locator('#saveTokenBtn').click();
  await assertText(page, entry, 'Token saved.');
  await assertText(page, entry, 'operator@metraiyux.com');
  await page.locator('.code').first().waitFor({ state: 'visible', timeout: 12000 });
  const tokenText = await page.locator('.code').first().innerText();
  entry.checks.push({ name: 'skyebox_totp_visible', ok: /^\d{3}\s\d{3}$/.test(tokenText), token_shape: tokenText.replace(/\d/g, '0') });

  const downloadPromise = page.waitForEvent('download', { timeout: 12000 });
  await page.locator('#exportBtn').click();
  const download = await downloadPromise;
  const downloadPath = path.join(artifactDir, `skyebox-${entry.id}.json`);
  await download.saveAs(downloadPath);
  entry.checks.push({ name: 'skyebox_export_download', ok: true, suggested: download.suggestedFilename(), path: downloadPath });
}

async function checkStaticEndpoints(api) {
  for (const endpoint of ['health', 'status', 'queue', 'review-board', 'execution-board', 'dispatch-board', 'v1/runtime-summary', 'v1/sessions']) {
    const res = await api.get(routeUrl(`HouseOperations/${endpoint}`), { timeout: 10000 });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {}
    checks.push({
      id: `endpoint-${endpoint.replaceAll('/', '-')}`,
      ok: res.ok() && parsed?.ok === true,
      checks: [{ name: 'endpoint_json_ok', ok: res.ok() && parsed?.ok === true, status: res.status(), endpoint }],
      console_errors: [],
      failed_requests: []
    });
  }

  const claim = await api.get(routeUrl('HouseOperations/CLAIM_CONTRACT.json'), { timeout: 10000 });
  const claimJson = await claim.json().catch(() => null);
  checks.push({
    id: 'houseoperations-claim-contract',
    ok: claim.ok() && Array.isArray(claimJson?.claims) && claimJson.claims.length >= 10,
    checks: [{ name: 'claim_contract_ok', ok: claim.ok() && Array.isArray(claimJson?.claims) && claimJson.claims.length >= 10, status: claim.status(), claims: claimJson?.claims?.length || 0 }],
    console_errors: [],
    failed_requests: []
  });

  for (const asset of ['manifest.json', 'sw.js', 'qa_report.md', 'upgrade_notes.md']) {
    const res = await api.get(routeUrl(`HouseOperations/skye-box-authenticator-vault/${asset}`), { timeout: 10000 });
    checks.push({
      id: `skyebox-asset-${asset.replaceAll('.', '-')}`,
      ok: res.ok(),
      checks: [{ name: 'skyebox_asset_ok', ok: res.ok(), status: res.status(), asset }],
      console_errors: [],
      failed_requests: []
    });
  }
}

const api = await request.newContext();
const browser = await chromium.launch({ headless: true, chromiumSandbox: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

for (const [viewportName, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    serviceWorkers: 'allow',
    recordVideo: { dir: artifactDir, size: viewport }
  });
  await withPage(context, 'houseoperations', viewportName, checkHouseOperations);
  await withPage(context, 'skyebox', viewportName, checkSkyeBox);
  await context.close();
}

await checkStaticEndpoints(api);
await verifyVideoPlayback(browser);
await api.dispose();
await browser.close();

const report = {
  ok: checks.every((entry) => entry.ok),
  base_url: baseUrl,
  generated_at: new Date().toISOString(),
  artifact_dir: artifactDir,
  video_proof_page: path.join(artifactDir, 'video-proof.html'),
  checks
};

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
