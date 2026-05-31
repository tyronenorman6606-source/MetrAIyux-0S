#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { resolveZeroOsGateAuth } from "./lib/zero-os-gate-auth.mjs";

const repoRoot = "/workspaces/MetrAIyux-0S";
const origin = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const label = "reported-free99-apps-production";

const routes = [
  {
    id: "mydrive",
    path: "/Free99/apps/mydrive-offline-vault/index.html",
    expect: ["MyDrive", "Offline-first"],
    actions: async (page, actions) => {
      await clickVisible(page, "#demoSafetyBtn", actions, "clicked MyDrive local safety check");
      await clickVisible(page, '[data-locktab="setup"]', actions, "opened MyDrive create-vault tab");
      await clickVisible(page, "#genStrongPassBtn", actions, "clicked MyDrive generate passphrase");
    }
  },
  {
    id: "skyeopsconsole",
    path: "/Free99/apps/skyeopsconsole/index.html",
    expect: ["SkyeOps Offline Console v2", "0S gate-owned"],
    actions: async (page, actions) => {
      await clickVisible(page, '[data-action="loadDemo"]', actions, "clicked SkyeOps load demo data");
      await clickVisible(page, '[data-action="quickCapture"]', actions, "clicked SkyeOps quick capture");
      await clickVisible(page, '[data-action="closeModal"]', actions, "closed SkyeOps modal");
    }
  },
  {
    id: "skyeapi-aegiscore",
    path: "/Free99/apps/skyeapi-aegiscore/apps/console/",
    expect: ["0S-gated capability control plane", "Project import"],
    actions: async (page, actions) => {
      await clickVisible(page, "#clear-local", actions, "clicked SkyeAPI clear local console state");
      await fillVisible(page, "#project-id", "proj_live_browser_proof", actions, "filled SkyeAPI project id");
    },
    extraAssert: async (page) => {
      return page.evaluate(() => {
        const panel = document.querySelector(".panel");
        const shell = document.querySelector(".shell");
        const panelStyle = panel ? getComputedStyle(panel) : null;
        const shellStyle = shell ? getComputedStyle(shell) : null;
        return {
          panelCount: document.querySelectorAll(".panel").length,
          stylesheetCount: [...document.styleSheets].length,
          panelBorderRadius: panelStyle?.borderRadius || "",
          panelBackground: panelStyle?.backgroundColor || "",
          shellDisplay: shellStyle?.display || ""
        };
      });
    }
  },
  {
    id: "documorph",
    path: "/Free99/apps/documorph/app/",
    expect: ["DOCUMORPH", "PDF"],
    actions: async (page, actions) => {
      await clickVisible(page, "button:has-text('Settings')", actions, "clicked DocuMorph settings");
      await clickVisible(page, "button:has-text('Save')", actions, "clicked DocuMorph save settings");
    },
    extraAssert: async (page) => {
      return page.evaluate(() => ({
        rootText: document.querySelector("#root")?.textContent?.slice(0, 600) || "",
        rawScriptSpill: document.body.innerText.includes("const exportedIndex") || document.body.innerText.includes("ReactDOM.createRoot(document.getElementById('root')).render(<App/>);"),
        buttonCount: document.querySelectorAll("button").length
      }));
    }
  },
  {
    id: "jobping",
    path: "/Free99/apps/jobping/index.html",
    expect: ["JobPing is not mounted as a complete runtime yet", "Needed before JobPing can be pushed live"],
    actions: async (page, actions) => {
      await page.mouse.wheel(0, 520);
      actions.push("scrolled JobPing requirements");
      await clickVisible(page, 'a:has-text("View JobPing health JSON")', actions, "opened JobPing health JSON");
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
      actions.push("returned from JobPing health JSON");
    }
  }
];

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== "linux") return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === "1") return;
  const probe = spawnSync("which", ["xvfb-run"], { encoding: "utf8" });
  if (probe.status !== 0) return;
  const child = spawnSync("xvfb-run", ["-a", process.execPath, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: "1" }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function slug(value) {
  return String(value || label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

async function loginOwner(context) {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: origin });
  if (!auth.ok || !auth.token) throw new Error("Could not establish shared 0S gate session.");
  const token = String(auth.token || "").replace(/^Bearer\s+/i, "").trim();
  await context.setExtraHTTPHeaders({
    Authorization: `Bearer ${token}`,
    "x-free99-gate-session": token,
    "x-skye-gate-session": token
  });
  return {
    credentialKey: auth.credential?.key || "shared-gate",
    hasGateToken: true,
    expiresAt: auth.response?.body?.expiresAt || null
  };
}

async function clickVisible(page, selector, actions, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible({ timeout: 2500 }).catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ timeout: 4000 }).catch(async () => {
    const box = await locator.boundingBox().catch(() => null);
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  });
  actions.push(label);
  await page.waitForTimeout(500);
  return true;
}

async function fillVisible(page, selector, value, actions, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible({ timeout: 2500 }).catch(() => false))) return false;
  await locator.fill(value, { timeout: 4000 });
  actions.push(label);
  await page.waitForTimeout(250);
  return true;
}

function wireTelemetry(page, check) {
  page.on("console", (message) => {
    if (message.type() === "error") check.consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    check.failedRequests.push({ url: request.url(), method: request.method(), failure });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (/\/favicon\.ico(?:\?|$)/.test(url)) return;
    check.failedResponses.push({ url, status });
  });
}

async function screenshot(page, artifactDir, name, check) {
  const file = path.join(artifactDir, `${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  check.screenshots.push(file);
}

async function verifyUnauthenticatedRedirect() {
  const results = [];
  for (const route of routes) {
    const url = `${origin}${route.path}`;
    const response = await fetch(url, { redirect: "manual" });
    results.push({
      id: route.id,
      url,
      status: response.status,
      location: response.headers.get("location"),
      gate: response.headers.get("x-0s-gate"),
      ok: response.status === 302
        && String(response.headers.get("location") || "").includes("/admin/login.html")
        && response.headers.get("x-0s-gate") === "fs27-required"
    });
  }
  return results;
}

async function verifyRoute(browser, route, viewport, artifactDir) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true
  });
  const login = await loginOwner(context);
  const page = await context.newPage();
  const check = {
    id: route.id,
    url: `${origin}${route.path}`,
    viewport,
    login,
    statuses: [],
    actions: [],
    assertions: [],
    consoleErrors: [],
    failedRequests: [],
    failedResponses: [],
    screenshots: []
  };
  wireTelemetry(page, check);

  const response = await page.goto(check.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: route.path, status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await page.waitForTimeout(route.id === "documorph" ? 4000 : 1000);
  const text = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  for (const expected of route.expect) {
    check.assertions.push({ name: `visible_text:${expected}`, ok: text.includes(expected), sample: text.slice(0, 500) });
  }
  const gateState = await page.evaluate(() => ({
    free99GateGlobal: typeof window.Free99PlatformGate,
    free99GateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
    lockedClass: document.documentElement.classList.contains("free99-platform-gate-locked"),
    title: document.title
  }));
  check.assertions.push({
    name: "no_app_level_client_gate",
    ok: gateState.free99GateGlobal === "undefined" && !gateState.free99GateOverlay && !gateState.lockedClass,
    state: gateState
  });
  if (route.extraAssert) {
    const state = await route.extraAssert(page);
    const ok = route.id === "skyeapi-aegiscore"
      ? state.panelCount >= 4 && state.stylesheetCount >= 1 && state.panelBorderRadius !== "0px"
      : route.id === "documorph"
        ? state.buttonCount >= 2 && !state.rawScriptSpill && /DocuMorph/i.test(state.rootText)
        : true;
    check.assertions.push({ name: `${route.id}_render_integrity`, ok, state });
  }

  await route.actions(page, check.actions);
  await screenshot(page, artifactDir, `${route.id}-${viewport.width}x${viewport.height}`, check);
  await context.close();
  check.ok = check.statuses.every((item) => item.ok)
    && check.assertions.every((item) => item.ok)
    && check.consoleErrors.length === 0
    && check.failedRequests.length === 0
    && check.failedResponses.length === 0
    && check.actions.length >= 2;
  return check;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts", "live-browser-verifier", `${stamp}-${label}`);
  fs.mkdirSync(artifactDir, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 100) });
  const report = {
    ok: false,
    checked_at: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    origin,
    artifact_dir: artifactDir,
    unauthenticated_redirects: await verifyUnauthenticatedRedirect(),
    checks: []
  };

  const viewports = [
    { width: 1440, height: 980 },
    { width: 390, height: 844 }
  ];
  try {
    for (const route of routes) {
      for (const viewport of viewports) {
        report.checks.push(await verifyRoute(browser, route, viewport, artifactDir));
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  report.ok = report.unauthenticated_redirects.every((item) => item.ok) && report.checks.every((item) => item.ok);
  const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, checks: report.checks.length, artifactDir }, null, 2));
  if (!report.ok) throw new Error(`Reported Free99 production proof failed. See ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
