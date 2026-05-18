#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "metraiyux_0s_site", "Marketing-Made-Easy");
const artifactDir = path.join(root, "test-artifacts", "marketing-made-easy");
const reportPath = path.join(artifactDir, "deep-scan.json");
const summaryPath = path.join(target, "DEEP_SCAN_SUMMARY.md");
const runSmoke = process.argv.includes("--smoke");

const binaryExts = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".zip",
  ".webm",
  ".mp4",
  ".pdf",
]);

const smokePlan = [
  { id: "ae-flowpro:p1", cwd: "AE-FlowPro", command: ["node", "smoke/ae-flowpro-p1-smoke.mjs"] },
  { id: "ae-flowpro:proof", cwd: "AE-FlowPro", command: ["node", "smoke/smoke-proof.mjs"] },
  { id: "brandid:static", cwd: "BrandID-Offline-PWA", command: ["node", "smoke/smoke-static-proof.mjs"] },
  { id: "brandid:proof", cwd: "BrandID-Offline-PWA", command: ["node", "smoke/smoke-proof.mjs"] },
  { id: "businesslaunchgo:p1", cwd: "BusinessLaunchGo", command: ["node", "smoke/businesslaunchgo-p1-smoke.mjs"] },
  { id: "businesslaunchgo:proof", cwd: "BusinessLaunchGo", command: ["node", "smoke/smoke-proof.mjs"] },
  { id: "skydocxmax:proof", cwd: "SkyeDocxMax", command: ["npm", "run", "smoke"] },
  { id: "skyewebcreatormax:proof", cwd: "SkyeWebCreatorMax", command: ["npm", "run", "smoke"] },
  { id: "kaixu-brandkit:contract", cwd: "kAIxUBrandKit", command: ["npm", "run", "smoke:contract-proof"] },
  { id: "kaixu-brandkit:proof", cwd: "kAIxUBrandKit", command: ["npm", "run", "smoke:proof"] },
  { id: "webgrowthoperator:static", cwd: "WebGrowthOperator", command: ["npm", "run", "build"] },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
    } else {
      files.push(absolute);
    }
  }
  return files;
}

function readText(file) {
  try {
    const ext = path.extname(file).toLowerCase();
    if (binaryExts.has(ext)) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function extractTitle(html) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractH1(html) {
  return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function summarizePlatform(dirName) {
  const dir = path.join(target, dirName);
  const files = walk(dir);
  const summary = {
    id: dirName,
    path: path.relative(root, dir),
    files: files.length,
    html: 0,
    js: 0,
    css: 0,
    json: 0,
    markdown: 0,
    title: "",
    h1: "",
    manifests: [],
    smoke_scripts: [],
    local_runtime: fs.existsSync(path.join(dir, "runtime", "local-runtime.mjs")),
    service_worker: fs.existsSync(path.join(dir, "sw.js")) || fs.existsSync(path.join(dir, "service-worker.js")),
    gate_terms: 0,
    proof_terms: 0,
    price_terms: 0,
  };

  const indexHtml = path.join(dir, "index.html");
  if (fs.existsSync(indexHtml)) {
    const html = readText(indexHtml);
    summary.title = extractTitle(html);
    summary.h1 = extractH1(html);
  }

  for (const file of files) {
    const rel = path.relative(dir, file);
    const ext = path.extname(file).toLowerCase();
    if (ext === ".html") summary.html += 1;
    if (ext === ".js" || ext === ".mjs") summary.js += 1;
    if (ext === ".css") summary.css += 1;
    if (ext === ".json") summary.json += 1;
    if (ext === ".md") summary.markdown += 1;
    if (/smoke.*\.mjs$/i.test(rel)) summary.smoke_scripts.push(rel);
    if (/(PLATFORM|CONTRACT|TRUTH|STATUS|MANIFEST|BUILD_PROOF|runtime-proof)\.(json|md)$|README\.md|PROOF_STATUS\.md|STATUS\.md/i.test(path.basename(file))) {
      summary.manifests.push(rel);
    }
    const text = readText(file);
    if (!text) continue;
    summary.gate_terms += (text.match(/\b(gate|FS27|SkyGate|SkyeGate|session|auth)\b/gi) || []).length;
    summary.proof_terms += (text.match(/\b(proof|receipt|runtime|smoke)\b/gi) || []).length;
    summary.price_terms += (text.match(/\b(price|pricing|checkout|Stripe|SkyePay|paid|Free99|\$[0-9])/gi) || []).length;
  }

  summary.manifests = summary.manifests.slice(0, 24);
  summary.smoke_scripts = summary.smoke_scripts.slice(0, 24);
  return summary;
}

function buildReport() {
  if (!fs.existsSync(target)) {
    throw new Error(`Target folder missing: ${path.relative(root, target)}`);
  }
  const dirs = fs.readdirSync(target, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const allFiles = walk(target);
  const byExt = {};
  for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase() || "(none)";
    byExt[ext] = (byExt[ext] || 0) + 1;
  }
  const platforms = dirs.map(summarizePlatform);
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    target: path.relative(root, target),
    surface_count: platforms.length,
    file_count: allFiles.length,
    extension_counts: Object.fromEntries(Object.entries(byExt).sort(([a], [b]) => a.localeCompare(b))),
    mcp_receipt: path.relative(root, path.join(target, "MCP_TOOLING_RECEIPT.json")),
    platform_ids: platforms.map((platform) => platform.id),
    platforms,
    gate_boundary: [
      "Marketing-Made-Easy is a 0S growth-suite import, not a public promise of automatic provider execution.",
      "Free/no-charge or local PWA surfaces still require a 0S, FS27, SkyGate, or owner-admin gate session before production handoff.",
      "WebGrowthOperator and Arizona Growth Index contain public marketing/intelligence content; pricing and intake language must stay aligned to approved 0S/SkyePay catalog rules.",
      "Provider publishing, external ad spend, Stripe checkout, Drive/Netlify/GitHub writes, and live customer tenancy require separate credential and owner approval proof."
    ],
    smoke: {
      planned: smokePlan.map(({ id, cwd, command }) => ({
        id,
        cwd: path.join("metraiyux_0s_site/Marketing-Made-Easy", cwd),
        command: command.join(" "),
      })),
      ran: false,
      results: [],
    },
  };
}

function markdown(report) {
  const lines = [
    "# Marketing Made Easy Deep Scan",
    "",
    `Generated: \`${report.generated_at}\``,
    "",
    "## Inventory",
    "",
    `- Target: \`${report.target}\``,
    `- Platform folders: \`${report.surface_count}\``,
    `- Files scanned: \`${report.file_count}\``,
    `- MCP receipt: \`${report.mcp_receipt}\``,
    "",
    "## Platform Folders",
    "",
    "| Folder | HTML | JS/MJS | CSS | JSON | MD | Runtime | Smoke scripts |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |",
  ];
  for (const platform of report.platforms) {
    lines.push(`| \`${platform.id}\` | ${platform.html} | ${platform.js} | ${platform.css} | ${platform.json} | ${platform.markdown} | ${platform.local_runtime ? "yes" : "no"} | ${platform.smoke_scripts.length} |`);
  }
  lines.push(
    "",
    "## Gate Boundary",
    "",
    ...report.gate_boundary.map((item) => `- ${item}`),
    "",
    "## Smoke Plan",
    "",
    ...report.smoke.planned.map((item) => `- \`${item.command}\` in \`${item.cwd}\``),
    ""
  );
  if (report.smoke.ran) {
    lines.push(
      "## Smoke Results",
      "",
      ...report.smoke.results.map((item) => `- \`${item.id}\`: ${item.ok ? "PASS" : "FAIL"} (${item.exit_code})`),
      ""
    );
  }
  return `${lines.join("\n")}\n`;
}

function run(command, cwd) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (code) => {
      resolve({
        exit_code: code,
        ok: code === 0,
        duration_ms: Date.now() - started,
        stdout_tail: stdout.slice(-4000),
        stderr_tail: stderr.slice(-4000),
      });
    });
  });
}

async function main() {
  await fsp.mkdir(artifactDir, { recursive: true });
  const report = buildReport();

  if (runSmoke) {
    report.smoke.ran = true;
    for (const item of smokePlan) {
      const cwd = path.join(target, item.cwd);
      const result = await run(item.command, cwd);
      report.smoke.results.push({
        id: item.id,
        cwd: path.relative(root, cwd),
        command: item.command.join(" "),
        ...result,
      });
      if (!result.ok) break;
    }
    report.ok = report.smoke.results.every((result) => result.ok);
  }

  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await fsp.writeFile(summaryPath, markdown(report));
  console.log(JSON.stringify({
    ok: report.ok,
    target: report.target,
    platforms: report.surface_count,
    files: report.file_count,
    report: path.relative(root, reportPath),
    summary: path.relative(root, summaryPath),
    smoke_ran: report.smoke.ran,
    smoke_failures: report.smoke.results.filter((item) => !item.ok).map((item) => item.id),
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
