import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const SITE_ROOT = path.resolve(path.dirname(__filename), "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "..");
const ARTIFACT_DIR = path.resolve(REPO_ROOT, "test-artifacts", "skyesplitengine-integration");
const GATE_TOKEN = "skyesplitengine-e2e-gate-session";

const TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"]
]);

function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const clean = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      let filePath = path.resolve(root, clean);
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": TYPES.get(path.extname(filePath)) || "text/plain; charset=utf-8" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectText(page, text) {
  const found = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  if (!found) throw new Error(`Missing visible text: ${text}`);
}

async function assertNoHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}

async function checkPage(page, baseUrl, route, label, requiredText, screenshotName) {
  await page.goto(`${baseUrl}/${route}`, { waitUntil: "domcontentloaded" });
  for (const text of requiredText) await expectText(page, text);
  await assertNoHorizontalScroll(page, label);
  if (screenshotName) await page.screenshot({ path: path.join(ARTIFACT_DIR, screenshotName), fullPage: true });
}

async function seedGate(context) {
  await context.addInitScript((token) => {
    const session = {
      token,
      source: "skyesplitengine-e2e",
      client: "MetrAIyux 0S Free99 Split Engine e2e",
      status: "free99_gate_session",
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem("SKYE_SPLIT_ENGINE_GATE_SESSION", JSON.stringify(session));
    sessionStorage.setItem("skye_split_engine_session", token);
    localStorage.setItem("saas_client_session", JSON.stringify({
      token,
      workspace_id: "skyesplitengine-e2e",
      client: "MetrAIyux 0S Free99 Split Engine e2e",
      email: "split-e2e@metraiyux.local",
      status: "active"
    }));
  }, GATE_TOKEN);
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const { server, baseUrl } = await startStaticServer(SITE_ROOT);
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const assertions = [];

  try {
    const ungatedContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const ungated = await ungatedContext.newPage();
    ungated.on("pageerror", (error) => pageErrors.push(`ungated: ${error.message}`));
    await ungated.goto(`${baseUrl}/SkyeSplitEngine/index.html`, { waitUntil: "domcontentloaded" });
    await expectText(ungated, "Free99 access is still gated.");
    await expectText(ungated, "Free99 means no charge");
    expect(await ungated.locator("#skyeSplitGate").isVisible(), "Ungated Split Engine route should show gate overlay.");
    const ungatedState = await ungated.evaluate(() => ({
      appApi: Boolean(window.SSE),
      navText: document.querySelector("#nav")?.textContent || "",
      contentText: document.querySelector("#content")?.textContent || ""
    }));
    expect(!ungatedState.appApi, "Skye Split Engine app API should not exist before gate unlock.");
    expect(ungatedState.navText.trim() === "", "Skye Split Engine nav should not render before gate unlock.");
    expect(ungatedState.contentText.trim() === "", "Skye Split Engine content should not render before gate unlock.");
    await ungated.screenshot({ path: path.join(ARTIFACT_DIR, "app-ungated-overlay.png"), fullPage: true });
    assertions.push("Ungated Skye Split Engine route displays the Free99 gate-session overlay and does not boot the app API.");
    await ungatedContext.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await seedGate(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`gated: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(`console: ${message.text()}`);
    });

    await checkPage(page, baseUrl, "index.html", "0S home desktop", ["Skye Split Engine", "Free99", "gate session"], "home-desktop.png");
    await checkPage(page, baseUrl, "live/skye-split-engine-operator-proof.html", "Split Engine hub desktop", ["Skye Split Engine is Free99", "meaning no charge", "gate session"], "hub-desktop.png");
    await checkPage(page, baseUrl, "proof/skyesplitengine-expansion-receipt.html", "Split Engine receipt desktop", ["Skye Split Engine was imported", "Zip removed", "Gate session"], "receipt-desktop.png");
    await checkPage(page, baseUrl, "pricing/index.html#skyesplitengine-free99", "Commercial pricing desktop", ["Skye Split Engine", "Free99", "no charge"], "pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/pricing.html#skyesplitengine-free99", "SaaS pricing desktop", ["Skye Split Engine", "Free99", "Gate session required"], "saas-pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/index.html", "SaaS overview desktop", ["Skye Split Engine", "Free99"], "saas-overview-desktop.png");
    await checkPage(page, baseUrl, "admin/index.html", "Admin hub desktop", ["Skye Split Engine Free99", "split-rule"], "admin-hub-desktop.png");
    assertions.push("0S public, SaaS, pricing, proof, and admin surfaces expose Skye Split Engine as Free99 and gated.");

    await page.goto(`${baseUrl}/sales/live-proof-router.html`, { waitUntil: "domcontentloaded" });
    await page.locator('input[value*="commission payout"]').check();
    await page.locator("#buildRoute").click();
    await expectText(page, "Skye Split Engine Free99");
    await assertNoHorizontalScroll(page, "Sales proof router desktop");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "sales-router-desktop.png"), fullPage: true });
    assertions.push("Sales proof router recommends the Split Engine surface for commission, payout, and split-rule needs.");

    await page.goto(`${baseUrl}/SkyeSplitEngine/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.querySelector("#skyeSplitGate"));
    await expectText(page, "Command Center");
    await expectText(page, "Visual Engine Online");
    await assertNoHorizontalScroll(page, "Skye Split Engine app desktop");

    await page.click("#calcBtn");
    await page.fill("#c_amount", "9900");
    await page.fill("#c_memo", "E2E split lane");
    await page.click("#c_run");
    await expectText(page, "$9,900");
    await page.click("#c_save");
    await expectText(page, "Transaction Ledger");
    await expectText(page, "E2E split lane");
    await page.locator('[data-page="reports"]').click();
    await expectText(page, "Settlement Reports");
    await expectText(page, "Gross");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "app-gated-workflow-desktop.png"), fullPage: true });

    const canvasHasPixels = await page.evaluate(() => {
      const canvas = document.querySelector("#field");
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return false;
      const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 3; index < sample.length; index += 4) {
        if (sample[index] !== 0) return true;
      }
      return false;
    });
    expect(canvasHasPixels, "Skye Split Engine visual canvas rendered blank pixels.");
    assertions.push("Seeded gate session unlocks Split Engine, split math runs, a transaction saves, reports render, and canvas pixels are nonblank.");

    const mobile = await context.newPage();
    mobile.on("pageerror", (error) => pageErrors.push(`mobile: ${error.message}`));
    await mobile.setViewportSize({ width: 390, height: 844 });
    await checkPage(mobile, baseUrl, "live/skye-split-engine-operator-proof.html", "Split Engine hub mobile", ["Skye Split Engine is Free99", "meaning no charge"], "hub-mobile.png");
    await mobile.goto(`${baseUrl}/SkyeSplitEngine/index.html`, { waitUntil: "domcontentloaded" });
    await mobile.waitForFunction(() => !document.querySelector("#skyeSplitGate"));
    await expectText(mobile, "Command Center");
    await assertNoHorizontalScroll(mobile, "Skye Split Engine app mobile");
    await mobile.screenshot({ path: path.join(ARTIFACT_DIR, "app-mobile.png"), fullPage: true });
    assertions.push("Mobile hub and gated app render without horizontal overflow.");

    expect(pageErrors.length === 0, `Browser page errors:\n${pageErrors.join("\n")}`);

    const report = {
      ok: true,
      app: "SkyeSplitEngine",
      baseUrl,
      checkedAt: new Date().toISOString(),
      gate: {
        free99_no_charge: true,
        gate_session_required: true,
        seeded_gate_token: GATE_TOKEN
      },
      assertions,
      artifacts: [
        "app-ungated-overlay.png",
        "home-desktop.png",
        "hub-desktop.png",
        "receipt-desktop.png",
        "pricing-desktop.png",
        "saas-pricing-desktop.png",
        "saas-overview-desktop.png",
        "admin-hub-desktop.png",
        "sales-router-desktop.png",
        "app-gated-workflow-desktop.png",
        "hub-mobile.png",
        "app-mobile.png"
      ]
    };
    await writeFile(path.join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
