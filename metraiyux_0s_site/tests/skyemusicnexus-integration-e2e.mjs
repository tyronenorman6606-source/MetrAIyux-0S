import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const SITE_ROOT = path.resolve(path.dirname(__filename), "..");
const ARTIFACT_DIR = path.resolve(SITE_ROOT, "..", "test-artifacts", "skyemusicnexus-integration");
const GATE_TOKEN = "skyemusic-e2e-gate-session";

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
  [".svg", "image/svg+xml; charset=utf-8"]
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
      source: "skyemusicnexus-e2e",
      client: "MetrAIyux 0S Free99 e2e",
      status: "free99_gate_session",
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem("SKYE_MUSIC_NEXUS_GATE_SESSION", JSON.stringify(session));
    sessionStorage.setItem("skye_music_nexus_session", token);
    localStorage.setItem("saas_client_session", JSON.stringify({
      token,
      workspace_id: "skyemusicnexus-e2e",
      client: "MetrAIyux 0S Free99 e2e",
      email: "music-e2e@metraiyux.local",
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
    await ungated.goto(`${baseUrl}/SkyeMusicNexus/index.html`, { waitUntil: "domcontentloaded" });
    await expectText(ungated, "SkyeMusicNexus is Free99, not ungated.");
    await expectText(ungated, "Free99 means no charge");
    expect(await ungated.locator("#skyeMusicGate").isVisible(), "Ungated SkyeMusicNexus route should show gate overlay.");
    assertions.push("Ungated SkyeMusicNexus app route displays the Free99 gate-session overlay.");
    await ungated.screenshot({ path: path.join(ARTIFACT_DIR, "app-ungated-overlay.png"), fullPage: true });
    await ungatedContext.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await seedGate(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`gated: ${error.message}`));

    await checkPage(page, baseUrl, "index.html", "0S home desktop", ["SkyeMusicNexus", "Free99"], "home-desktop.png");
    assertions.push("0S home exposes SkyeMusicNexus and Free99 expansion language.");

    await checkPage(page, baseUrl, "live/skyemusicnexus-neofront.html", "SkyeMusicNexus hub desktop", ["Free99 music operating stage", "gate session", "no charge"], "hub-desktop.png");
    assertions.push("SkyeMusicNexus hub states Free99/no charge while preserving the gate-session boundary.");

    await checkPage(page, baseUrl, "proof/skyemusicnexus-expansion-receipt.html", "SkyeMusicNexus receipt desktop", ["SkyeMusicNexus was imported as a Free99, gated feature", "Zip removed", "Gate session"], "receipt-desktop.png");
    assertions.push("Expansion receipt documents archive unpack, zip removal, gate session, and commercial posture.");

    await checkPage(page, baseUrl, "pricing/index.html#skyemusicnexus-free99", "Commercial pricing desktop", ["SkyeMusicNexus", "Free99", "no charge"], "pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/pricing.html#skyemusicnexus-free99", "SaaS pricing desktop", ["SkyeMusicNexus", "Free99", "no charge"], "saas-pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/index.html", "SaaS overview desktop", ["SkyeMusicNexus Free99", "gate session still required"], "saas-overview-desktop.png");
    await checkPage(page, baseUrl, "admin/index.html", "Admin hub desktop", ["SkyeMusicNexus Free99", "music function auth boundary"], "admin-hub-desktop.png");
    assertions.push("Pricing, SaaS overview, and admin hub expose SkyeMusicNexus as Free99/no-charge gated access.");

    await page.goto(`${baseUrl}/sales/live-proof-router.html`, { waitUntil: "domcontentloaded" });
    await page.locator('input[value*="music artist release"]').check();
    await page.locator("#buildRoute").click();
    await expectText(page, "SkyeMusicNexus Free99 Music Stage");
    await assertNoHorizontalScroll(page, "Sales proof router desktop");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "sales-router-desktop.png"), fullPage: true });
    assertions.push("Sales proof router recommends the Free99 music stage for music operations needs.");

    await page.goto(`${baseUrl}/SkyeMusicNexus/index.html`, { waitUntil: "domcontentloaded" });
    await expectText(page, "Command Field");
    await expectText(page, "Artist Nebula");
    await expectText(page, "Release Forge");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await assertNoHorizontalScroll(page, "SkyeMusicNexus app shell desktop");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "app-shell-gated-desktop.png"), fullPage: true });
    assertions.push("Seeded gate session unlocks the SkyeMusicNexus app shell without removing auth requirements.");

    await checkPage(page, baseUrl, "SkyeMusicNexus/public/index.html", "Artist stage desktop", ["Release music through a living signal stage", "Artist Nebula", "Release Forge"], "artist-stage-desktop.png");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/admin.html", "Operator stage desktop", ["Move releases like live assets", "Payout Gate", "Analytics Prism"], "operator-stage-desktop.png");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    assertions.push("Artist and operator stages render end to end with the seeded gate session.");

    const mobile = await context.newPage();
    mobile.on("pageerror", (error) => pageErrors.push(`mobile: ${error.message}`));
    await mobile.setViewportSize({ width: 390, height: 844 });
    await checkPage(mobile, baseUrl, "live/skyemusicnexus-neofront.html", "SkyeMusicNexus hub mobile", ["Free99 music operating stage", "no charge"], "hub-mobile.png");
    await checkPage(mobile, baseUrl, "SkyeMusicNexus/public/index.html", "Artist stage mobile", ["Release music through a living signal stage", "Artist Nebula"], "artist-stage-mobile.png");
    assertions.push("Mobile hub and artist stage render without horizontal overflow.");

    expect(pageErrors.length === 0, `Browser page errors:\n${pageErrors.join("\n")}`);

    const report = {
      ok: true,
      app: "SkyeMusicNexus",
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
        "app-shell-gated-desktop.png",
        "artist-stage-desktop.png",
        "operator-stage-desktop.png",
        "hub-mobile.png",
        "artist-stage-mobile.png"
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
