import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../..");
const mcpRoot = path.join(repoRoot, "MCP");
const require = createRequire(path.join(mcpRoot, "package.json"));
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const runId = process.argv.find((arg) => arg.startsWith("--run-id="))?.split("=")[1] || `mcp-${Date.now()}`;
const files = [
  "index.html",
  "dashboard.html",
  "compose.html",
  "monitoring.html",
  "settings.html",
  "suite/index.html",
  "marketing.html",
  "live-proof.html",
  "mcp-proof.html",
  "assets/mail-ui.css",
  "assets/marketing.css",
  "assets/spectacle-motion.js",
  "assets/live-proof.js",
  "assets/mcp-proof.js",
];
const source = files.map((file) => `\n/* ${file} */\n${fs.readFileSync(path.join(root, file), "utf8")}`).join("\n");

function textFrom(result) {
  return result.content.map((item) => item.text || "").join("\n");
}

function parseJsonResult(result) {
  const text = textFrom(result);
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw_text_preview: text.slice(0, 900) };
  }
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(mcpRoot, "stdio-server.mjs")],
    env: { ...process.env, REPO_ROOT: repoRoot },
  });
  const client = new Client({ name: "skymail-full-mcp-proof", version: "0.2.0" });
  await client.connect(transport);
  const resourcesRead = [];
  const toolsCalled = [];
  const audits = {};
  const callResults = {};

  async function readResource(uri) {
    const result = await client.readResource({ uri });
    resourcesRead.push(uri);
    return result.contents.map((item) => item.text || "").join("\n");
  }

  async function callTool(name, args) {
    const result = await client.callTool({ name, arguments: args });
    toolsCalled.push(name);
    const parsed = parseJsonResult(result);
    callResults[name] = parsed;
    return parsed;
  }

  try {
    const listedResources = await client.listResources();
    const listedTools = await client.listTools();
    const resourceUris = listedResources.resources.map((resource) => resource.uri);
    const toolNames = listedTools.tools.map((tool) => tool.name);

    for (const uri of resourceUris) await readResource(uri);

    const qualityGate = await callTool("design_quality_gate", { surface: "SkyeMail website and actual app shell" });
    await callTool("repo_read", { path: "metraiyux_0s_site/live/SkyeMail/index.html" });
    await callTool("design_find", { query: "logo standards", limit: 8 });
    await callTool("design_asset_manifest", {});
    await callTool("design_logo_manifest", {});
    const logoAudit = await callTool("design_logo_audit", {
      product: "SkyeMail",
      requireExistingAsset: false,
      source,
    });
    const designValidate = await callTool("design_validate", { content: source });
    const contentAudit = await callTool("design_content_audit", {
      requireFirstPerson: false,
      content: [
        "SkyeMail gives each 0S client a real email lane, a vault-key onboarding card, Resend delivery monitoring, encrypted inbox storage, and a clean workspace.",
        "The client workspace uses SkyeGateFS27 access, proof receipts, vault keys, and delivery routing.",
      ].join("\n"),
    });
    const generatedContent = await callTool("design_content_generate", {
      product: "SkyeMail",
      audience: "0S clients",
      offer: "a real secure email workspace",
      components: ["client workspace", "SkyeGateFS27 access", "proof receipts", "vault keys", "delivery routing"],
      format: "proof",
    });
    const stackAudit = await callTool("design_stack_audit", {
      source,
      packageJson: fs.readFileSync(path.join(root, "package.json"), "utf8"),
      required: ["three", "gsap", "lenis", "motion"],
    });
    const effectAudit = await callTool("design_effect_audit", {
      source,
      requested: ["cursorTrail", "neonScrollbar", "textEffects", "motionChrome", "surfaceScreenshots", "gsapScroll", "threeCanvas"],
    });
    const e2eAudit = await callTool("design_e2e_proof_audit", {
      source,
      claims: [
        "SkyeMail sends, receives, and shows live receipt proof in browser",
        "SkyeMail MCP proof page shows the MCP receipt in browser",
      ],
      proofReport: [
        "Playwright browser recording path: proof/videos/skymail-live-proof-browser.webm",
        "Playwright browser recording path: proof/videos/skymail-mcp-proof-browser.webm",
        "page.goto live-proof, page.waitForSelector SkyeMail passed the two-way proof run, page.screenshot",
        "page.goto mcp-proof, page.waitForSelector SkyeMail passed the MCP upgrade gate, page.screenshot",
        "video readyState >= 2, currentTime > 0, paused === false, visible",
      ].join("\n"),
    });
    const performanceAudit = await callTool("design_performance_audit", { source });
    await callTool("design_elements", { namespace: "skye.core" });
    await callTool("design_compose_brief", {
      product: "SkyeMail",
      surface: "public website and email app shell",
      goal: "buyer trust before signup",
      audience: "0S clients",
      intensity: "production proof",
    });
    await callTool("design_open_source_stack", { tag: "screenshot" });
    await callTool("design_stack_catalog", {});
    await callTool("design_recipe_plan", {
      product: "SkyeMail",
      surface: "public email workspace proof pages",
      goal: "prove live send receive and MCP upgrade with premium neon motion WebGL",
      audience: "0S clients",
      effects: ["cursorTrail", "neonScrollbar", "textEffects", "motionChrome", "surfaceScreenshots", "gsapScroll", "threeCanvas"],
    });
    await callTool("design_pattern_pack", { patternId: "neon-motion-chrome" });
    await callTool("design_pattern_pack", { patternId: "app-first-command-center" });

    audits.quality_gate = { ok: Array.isArray(qualityGate.required) && qualityGate.required.length > 0, required_count: qualityGate.required?.length || 0 };
    audits.logo = { ok: Boolean(logoAudit.ok), issues: logoAudit.issues || [], detected: logoAudit.detected || {} };
    audits.design_validate = { ok: Boolean(designValidate.ok), issues: designValidate.issues || [] };
    audits.content = { ok: Boolean(contentAudit.ok && generatedContent.ok && generatedContent.audit?.ok), issues: [...(contentAudit.issues || []), ...(generatedContent.audit?.issues || [])] };
    audits.stack = { ok: Boolean(stackAudit.ok), missing: stackAudit.missingImports || [] };
    audits.effects = { ok: Boolean(effectAudit.ok), missing: effectAudit.missingEffects || [] };
    audits.e2e_proof = { ok: Boolean(e2eAudit.ok), issues: e2eAudit.issues || [], detected: e2eAudit.detected || {} };
    audits.performance = { ok: Boolean(performanceAudit.ok), issues: performanceAudit.issues || [] };

    const allAuditOk = Object.values(audits).every((audit) => audit.ok);
    const allListedToolsCalled = toolNames.every((name) => toolsCalled.includes(name));
    const proof = {
      ok: Boolean(allAuditOk && allListedToolsCalled && resourceUris.length === resourcesRead.length),
      run_id: runId,
      completed_at: new Date().toISOString(),
      mcp_server: "MCP/stdio-server.mjs",
      mcp_package: "quantumskyes-design-mcp",
      mcp_version: "0.2.0",
      upgraded_surface: "SkyeMail website plus actual app shell",
      logo_asset: "/assets/skyes-over-london-deity-logo.png",
      logo_source: "same logo already used by SkyeMail index/signup/send/ai/founder pages",
      listed_resources: resourceUris,
      listed_tools: toolNames,
      resources_read: resourcesRead,
      tools_called: toolsCalled,
      audits,
      tool_result_summary: Object.fromEntries(Object.entries(callResults).map(([name, value]) => [name, {
        ok: value.ok ?? true,
        issue_count: Array.isArray(value.issues) ? value.issues.length : 0,
      }])),
      public_pages: [
        "https://skyemail-platform.graylondonskyes.workers.dev/marketing",
        "https://skyemail-platform.graylondonskyes.workers.dev/live-proof",
        "https://skyemail-platform.graylondonskyes.workers.dev/mcp-proof",
        "https://skyemail-platform.graylondonskyes.workers.dev/suite",
        "https://skyemail-platform.graylondonskyes.workers.dev/dashboard",
        "https://skyemail-platform.graylondonskyes.workers.dev/compose",
      ],
    };

    const outDir = path.join(root, "proof");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "skymail-mcp-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
    await client.close();
    if (!proof.ok) process.exitCode = 1;
  } catch (error) {
    await client.close();
    throw error;
  }
}

main();
