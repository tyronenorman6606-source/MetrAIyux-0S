#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const siteRoot = path.join(repoRoot, "marketing", "agentic-growth-layer");
const artifactRoot = path.join(repoRoot, "test-artifacts", "agentic-growth-layer", "browser-proof-local");
const receiptPath = path.join(artifactRoot, "receipt.json");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function staticServer(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const candidate = path.resolve(root, `.${cleanPath}`);
    if (!candidate.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(candidate, (error, body) => {
      if (error) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "content-type": mimeTypes.get(path.extname(candidate)) || "application/octet-stream",
        "cache-control": "no-store"
      });
      res.end(body);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done))
      });
    });
  });
}

async function collectScrollStops(page, label) {
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const positions = [...new Set([0, Math.floor(totalHeight * 0.22), Math.floor(totalHeight * 0.48), Math.floor(totalHeight * 0.74), totalHeight - viewportHeight])]
    .filter((value) => Number.isFinite(value) && value >= 0);
  const stops = [];

  for (const [index, y] of positions.entries()) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(180);
    const screenshotPath = path.join(artifactRoot, `${label}-scroll-${index}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const metrics = await page.evaluate(() => {
      const visibleText = [...document.body.querySelectorAll("h1,h2,h3,p,a,button,strong,span,li,pre")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0 && rect.height > 0;
        })
        .map((node) => node.textContent.trim())
        .filter(Boolean)
        .join(" ");
      const visibleImages = [...document.images].filter((img) => {
        const rect = img.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && img.complete && img.naturalWidth > 0;
      }).length;
      const canvasVisible = [...document.querySelectorAll("canvas")].some((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0 && rect.height > 0;
      });
      return {
        y: window.scrollY,
        visibleTextLength: visibleText.length,
        visibleImages,
        canvasVisible,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        overflowX: document.documentElement.scrollWidth - window.innerWidth
      };
    });
    assert(metrics.visibleTextLength > 20 || metrics.visibleImages > 0 || metrics.canvasVisible, `${label} scroll stop ${index} looked visually empty.`);
    assert(metrics.overflowX <= 2, `${label} has horizontal overflow of ${metrics.overflowX}px.`);
    stops.push({ ...metrics, screenshot: path.relative(repoRoot, screenshotPath) });
  }

  return stops;
}

async function runViewport(browser, viewport, label, baseUrl) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: label === "mobile" ? 2 : 1 });
  const page = await context.newPage();
  const consoleMessages = [];
  const requestFailures = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "request failed" });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Agentic Growth Layer");
    await page.waitForSelector("#proofOutput");
    await page.click('button[data-tab="connected"]');
    await page.waitForFunction(() => document.querySelector("#proofOutput")?.textContent.includes("connected_search_console"));
    await page.click('button[data-tab="stress"]');
    await page.waitForFunction(() => document.querySelector("#proofOutput")?.textContent.includes('"ok": true'));

    if (label === "mobile") {
      await page.click("[data-menu-button]");
      await page.waitForSelector("#navMenu.open");
      await page.click('#navMenu a[href="#engine"]');
    } else {
      await page.click('a[href="#pricing"]');
    }

    await page.waitForTimeout(220);
    const ctaHrefs = await page.$$eval('a[href*="skyepay.html"][href*="agentic-growth"]', (links) => links.map((link) => link.href));
    assert(ctaHrefs.length >= 4, `${label} expected SkyPay agentic-growth CTAs.`);
    assert(ctaHrefs.some((href) => href.includes("offer=agentic-growth-connected")), `${label} missing connected SkyPay offer CTA.`);

    const media = await page.evaluate(() => ({
      completeImages: [...document.images].filter((img) => img.complete && img.naturalWidth > 0).length,
      brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      proofLoaded: document.querySelector("#proofOutput")?.textContent.includes('"ok": true') || false,
      activeTab: document.querySelector(".tab.active")?.textContent.trim() || "",
      title: document.title
    }));
    assert(media.completeImages >= 1, `${label} did not load any images.`);
    assert(media.brokenImages.length === 0, `${label} has broken images: ${media.brokenImages.join(", ")}`);
    assert(media.proofLoaded, `${label} proof receipt did not render.`);

    const stops = await collectScrollStops(page, label);
    return { label, viewport, media, stops, consoleMessages, requestFailures, pageErrors };
  } finally {
    await context.close().catch(() => {});
  }
}

fs.mkdirSync(artifactRoot, { recursive: true });

const server = await staticServer(siteRoot);
const receipt = {
  ok: false,
  checkedAt: new Date().toISOString(),
  siteRoot: path.relative(repoRoot, siteRoot),
  url: server.baseUrl,
  viewports: []
};
let browser;

try {
  browser = await chromium.launch({ headless: true });
  receipt.viewports.push(await runViewport(browser, { width: 1440, height: 1000 }, "desktop", server.baseUrl));
  receipt.viewports.push(await runViewport(browser, { width: 390, height: 844 }, "mobile", server.baseUrl));

  const failures = receipt.viewports.flatMap((result) => [
    ...result.pageErrors.map((error) => `${result.label} page error: ${error}`),
    ...result.consoleMessages.filter((item) => item.type === "error").map((item) => `${result.label} console error: ${item.text}`),
    ...result.requestFailures.map((item) => `${result.label} request failed: ${item.url} ${item.error}`)
  ]);
  assert(failures.length === 0, failures.join("\n"));
  receipt.ok = true;
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Agentic Growth Layer browser proof passed: ${path.relative(repoRoot, receiptPath)}`);
} catch (error) {
  receipt.ok = false;
  receipt.error = error.message;
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(`Agentic Growth Layer browser proof failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser?.isConnected()) await browser.close().catch(() => {});
  await server.close();
}
