#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(ROOT, '..', '..', '..', '..', 'test-artifacts', 'skye-web-creator');
const BASE = process.argv[2] || 'http://127.0.0.1:4396';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function runViewport(browser, name, viewport) {
  const pageErrors = [];
  const requestFailures = [];
  const browserContext = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await browserContext.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });

  await page.goto(`${BASE}/builder.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#view-builder.active', { timeout: 15000 });
  await page.waitForSelector('#briefProjectName', { timeout: 15000 });
  await page.waitForSelector('#aurenLog', { timeout: 15000 });

  await page.fill('#briefProjectName', 'West Valley Martial Arts');
  await page.fill('#briefBusinessType', 'service');
  await page.fill('#briefOffer', 'Trial classes and family martial arts memberships');
  await page.fill('#briefAudience', 'Parents and adults searching for a local martial arts school');
  await page.fill('#briefPages', 'home, classes, pricing, faq, contact');
  await page.fill('#briefTemplateId', 'starter-fallback');
  await page.fill('#aurenInput', 'How do we make this website feel premium without slowing delivery?');

  const statusBefore = await page.locator('#aurenStatus').textContent();
  await page.click('#askAuren');
  await page.waitForFunction(
    (previousStatus) => {
      const status = document.querySelector('#aurenStatus')?.textContent || '';
      const latestAssistant = [...document.querySelectorAll('#aurenLog .auren-bubble.assistant')].at(-1);
      const latestMeta = latestAssistant?.querySelector('.auren-bubble-meta span:last-child')?.textContent || '';
      return status !== previousStatus && /Auren active/i.test(status) && /openai|fallback/i.test(latestMeta);
    },
    statusBefore,
    { timeout: 45000 },
  );

  const snapshot = await page.evaluate(() => {
    const assistantBubbles = [...document.querySelectorAll('#aurenLog .auren-bubble.assistant')];
    const lastAssistant = assistantBubbles.at(-1);
    const latestMeta = lastAssistant?.querySelector('.auren-bubble-meta span:last-child')?.textContent?.trim() || '';
    const latestMessage = lastAssistant?.innerText || '';
    const promptCount = document.querySelectorAll('#aurenPrompts button').length;
    const issueCount = document.querySelectorAll('#aurenIssues .auren-chip').length;
    const actionCount = document.querySelectorAll('#aurenActions .auren-chip').length;
    const liveToggle = document.querySelector('#aurenLiveAi');
    const status = document.querySelector('#aurenStatus')?.textContent?.trim() || '';
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    return {
      title: document.title,
      activeView: document.querySelector('.view.active')?.id || '',
      latestMeta,
      latestMessage,
      promptCount,
      issueCount,
      actionCount,
      liveToggleChecked: Boolean(liveToggle?.checked),
      liveToggleDisabled: Boolean(liveToggle?.disabled),
      status,
      overflow,
    };
  });

  const screenshotPath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browserContext.close();
  return {
    name,
    viewport,
    ...snapshot,
    screenshotPath,
    consoleErrors: pageErrors,
    requestFailures,
  };
}

async function main() {
  await ensureDir(ARTIFACT_DIR);
  const browser = await chromium.launch({ headless: true });
  try {
    const pages = [];
    pages.push(await runViewport(browser, 'builder-desktop', { width: 1440, height: 1000 }));
    pages.push(await runViewport(browser, 'builder-mobile', { width: 430, height: 932 }));

    const assertions = {
      noConsoleErrors: pages.every((page) => page.consoleErrors.length === 0),
      noRequestFailures: pages.every((page) => page.requestFailures.length === 0),
      builderViewLoaded: pages.every((page) => page.activeView === 'view-builder'),
      liveAurenEnabled: pages.every((page) => page.liveToggleChecked === true && page.liveToggleDisabled === false),
      assistantResponded: pages.every((page) => page.latestMessage.includes('West Valley Martial Arts') || page.latestMessage.length > 40),
      promptButtonsRendered: pages.every((page) => page.promptCount >= 1),
      issueCardsRendered: pages.every((page) => page.issueCount >= 1),
      actionCardsRendered: pages.every((page) => page.actionCount >= 1),
      noHorizontalOverflow: pages.every((page) => page.overflow === false),
    };

    const result = {
      baseUrl: BASE,
      checkedAt: new Date().toISOString(),
      pages,
      assertions,
    };
    const outPath = path.join(ARTIFACT_DIR, 'builder-auren-proof.json');
    await fs.writeFile(outPath, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (Object.values(assertions).some((value) => value !== true)) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
