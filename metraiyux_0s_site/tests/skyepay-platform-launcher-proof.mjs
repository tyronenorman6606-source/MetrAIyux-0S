import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const siteRoot = path.join(repoRoot, "metraiyux_0s_site");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const proofDir = path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-proof", stamp);
const stressDir = path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-stress", stamp);

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

function createStaticServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const decodedPath = decodeURIComponent(url.pathname);
      const relative = decodedPath.endsWith("/") ? `${decodedPath.slice(1)}index.html` : decodedPath.slice(1);
      const target = path.resolve(root, relative || "index.html");
      if (!target.startsWith(root)) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, "index.html") : target;
      res.writeHead(200, {
        "content-type": mime.get(path.extname(file)) || "application/octet-stream",
        "cache-control": "no-store"
      });
      createReadStream(file).pipe(res);
    } catch (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function visibleText(page, selector) {
  return page.locator(selector).first().innerText({ timeout: 12000 }).then((text) => text.replace(/\s+/g, " ").trim());
}

async function cardCount(page) {
  return page.locator("[data-platform-cards] .launcher-card").count();
}

async function runViewport(browser, origin, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "request failed" });
  });

  const actions = [];
  const screenshots = [];
  const url = `${origin}/saas/skyepay.html#platform-launcher`;
  await page.goto(url, { waitUntil: "commit", timeout: 20000 });
  await page.waitForFunction(() => Boolean(document.querySelector("[data-platform-launcher]")), null, { timeout: 15000 });
  await page.waitForFunction(() => document.readyState !== "loading", null, { timeout: 15000 });
  await page.evaluate(() => document.querySelector("[data-platform-launcher]")?.scrollIntoView({ block: "start" }));
  await page.waitForFunction(() => Boolean(window.MetrAIyuxPlatformLauncher) && document.querySelectorAll("[data-platform-tabs] .platform-tab").length >= 7, null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById("brainStatus")?.textContent?.includes("Ready"), null, { timeout: 12000 });

  actions.push("loaded platform launcher and local brain");
  assert.ok(await page.locator("[data-platform-tabs] .platform-tab").count() >= 7, "platform tabs render");
  assert.match(await visibleText(page, "[data-platform-detail]"), /SkyeMusicNexus/, "default music platform visible");
  assert.ok(await cardCount(page) >= 7, "default music cards render");
  assert.ok(await page.locator(".skyemerit-deal-banner", { hasText: "-$2,000 SkyeMerit" }).count() >= 4, "SkyeMerit sale banners render on launch artist cards");

  const firstShot = path.join(proofDir, `${label}-launcher-default.png`);
  await page.screenshot({ path: firstShot, fullPage: false });
  screenshots.push(firstShot);

  await page.locator('[data-platform-id="free99"]').click();
  actions.push("clicked Free99 platform tab");
  assert.match(await visibleText(page, "[data-platform-detail]"), /Free99 App Stack/, "Free99 detail visible");
  assert.match(await visibleText(page, "[data-platform-cards]"), /SkyeProfitConsole/, "Free99 cards visible");

  await page.locator("#launcher-search").fill("Relay13");
  actions.push("searched Relay13");
  assert.match(await visibleText(page, "[data-platform-detail]"), /Relay13 \+ ConnectLog/, "Relay13 detail visible after search");
  assert.match(await visibleText(page, "[data-platform-cards]"), /Managed AI Inbox/, "Relay13 card visible");

  await page.locator("#launcher-search").fill("");
  await page.locator('[data-launcher-demo="marketing-media"]').click();
  actions.push("clicked Marketing shortcut");
  assert.match(await visibleText(page, "[data-platform-detail]"), /Marketing \+ Media Over London/, "marketing lane visible");
  assert.match(await visibleText(page, "[data-platform-cards]"), /MediaOverLondon@solenterprises\.org/, "Media Over London contact visible");

  await page.locator('[data-launcher-demo="skyemusicnexus"]').click();
  actions.push("clicked Music shortcut");
  await page.getByLabel(/Buyer question/i).fill("Which platform handles artist landing pages with SkyeMerit?");
  await page.getByRole("button", { name: /Ask brain/i }).click();
  actions.push("asked local brain");
  await page.waitForSelector(".brain-answer .route-pill", { timeout: 8000 });
  const answerText = await visibleText(page, ".brain-answer");
  assert.match(answerText, /Primary:/, "brain primary route visible");
  assert.match(answerText, /SkyePay platform launcher|SkyeMusicNexus|SkyeMerit/i, "brain answer references launcher/music merit");

  const brainShot = path.join(proofDir, `${label}-brain-answer.png`);
  await page.screenshot({ path: brainShot, fullPage: false });
  screenshots.push(brainShot);

  const stressQueries = ["artist landing", "free99", "relay13", "vault", "media over london", "custom universe", "skyemerit"];
  const stressResults = [];
  for (let cycle = 1; cycle <= 6; cycle += 1) {
    for (const query of stressQueries) {
      await page.locator("#launcher-search").fill(query);
      await page.waitForSelector("[data-platform-detail]", { timeout: 8000 });
      await page.waitForTimeout(80);
      const detail = await visibleText(page, "[data-platform-detail]");
      const cards = await cardCount(page);
      assert.ok(cards > 0, `cards render for ${query}`);
      stressResults.push({ cycle, query, detail: detail.slice(0, 120), cards });
    }
  }
  actions.push(`completed ${stressResults.length} launcher search/card stress checks`);

  const stressShot = path.join(stressDir, `${label}-stress-final.png`);
  await page.screenshot({ path: stressShot, fullPage: false });
  screenshots.push(stressShot);

  await context.close();
  return { label, viewport, url, actions, screenshots, stressResults, console: errors, failedRequests };
}

await fs.mkdir(proofDir, { recursive: true });
await fs.mkdir(stressDir, { recursive: true });

const { server, origin } = await createStaticServer(siteRoot);
const browser = await chromium.launch({ headless: true });
try {
  const viewports = [
    { label: "desktop", viewport: { width: 1440, height: 1000 } },
    { label: "mobile", viewport: { width: 390, height: 844 } }
  ];
  const viewportResults = [];
  for (const item of viewports) {
    viewportResults.push(await runViewport(browser, origin, item.viewport, item.label));
  }

  const receipt = {
    ok: true,
    generated_at: new Date().toISOString(),
    proof_type: "local-browser-platform-launcher-stress",
    local_origin: origin,
    target: "/saas/skyepay.html#platform-launcher",
    viewport_count: viewportResults.length,
    stress_iterations: viewportResults.reduce((sum, item) => sum + item.stressResults.length, 0),
    viewport_results: viewportResults,
    proof_dir: proofDir,
    stress_dir: stressDir
  };

  const proofReceipt = path.join(proofDir, "receipt.json");
  const stressReceipt = path.join(stressDir, "receipt.json");
  await fs.writeFile(proofReceipt, JSON.stringify(receipt, null, 2) + "\n");
  await fs.writeFile(stressReceipt, JSON.stringify(receipt, null, 2) + "\n");
  await fs.mkdir(path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-proof"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-stress"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-proof", "latest.json"), JSON.stringify(receipt, null, 2) + "\n");
  await fs.writeFile(path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-stress", "latest.json"), JSON.stringify(receipt, null, 2) + "\n");

  console.log(JSON.stringify({
    ok: true,
    target: receipt.target,
    stress_iterations: receipt.stress_iterations,
    proof_receipt: path.relative(repoRoot, proofReceipt),
    stress_receipt: path.relative(repoRoot, stressReceipt)
  }, null, 2));
} finally {
  await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
