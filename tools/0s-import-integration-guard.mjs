#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const failOnBlockers = args.includes("--fail-on-blockers");
const jsonOnly = args.includes("--json");
const targets = args.filter((arg) => !arg.startsWith("--"));

if (!targets.length) {
  console.error("Usage: npm run 0s:import-guard -- <target-folder> [more-folders] [--fail-on-blockers] [--json]");
  process.exit(2);
}

const repoRoot = process.cwd();
const receiptDir = path.join(repoRoot, "test-artifacts", "0s-import-integration-guard");
fs.mkdirSync(receiptDir, { recursive: true });

const ignored = new Set([".git", "node_modules", ".wrangler", ".netlify", "dist", "build", "coverage", "proof", "data", "docs", "smoke", "scripts", "tools", "test", "tests", "WHITE_GLOVE_V83"]);
const ignoredFiles = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "MCP_TOOLING_RECEIPT.json"]);
const sourceExtensions = new Set([".html", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".toml"]);
const routeNames = new Set([
  "app.html",
  "dashboard.html",
  "runtime.html",
  "records.html",
  "settings.html",
  "workflows.html",
  "platform.html",
  "workspace.html",
  "builder.html",
  "editor.html",
  "homepage.html",
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function walkSources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSources(full, out);
      continue;
    }
    if (!entry.isFile() || ignoredFiles.has(entry.name)) continue;
    if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function title(html) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, " ").trim() || "";
}

function count(re, source) {
  return (source.match(re) || []).length;
}

function metrics(file) {
  const html = read(file);
  const plain = text(html);
  return {
    file: path.relative(repoRoot, file),
    title: title(html),
    bytes: Buffer.byteLength(html),
    buttons: count(/<button\b/gi, html),
    forms: count(/<form\b/gi, html),
    inputs: count(/<(input|select|textarea)\b/gi, html),
    sections: count(/<section\b/gi, html),
    iframes: count(/<iframe\b/gi, html),
    sample: plain.slice(0, 260),
  };
}

function isCanonicalHandoff(file) {
  const html = read(file);
  return /data-0s-handoff=["']canonical["']/i.test(html)
    || /name=["']x-0s-handoff["'][^>]*content=["']canonical["']/i.test(html);
}

function isCanonicalPlatform(html) {
  return /data-0s-canonical-platform=["']true["']/i.test(html)
    || /data-0s-canonical-surface=["']true["']/i.test(html);
}

function unique(items) {
  return [...new Set(items)];
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function isCanonicalGateSource(file) {
  const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
  return rel.includes("/skyegate/source/SkyeGateFS27/")
    || rel === "metraiyux_0s_site/cloudflare/worker.js"
    || rel.includes("/tests/")
    || rel.includes("/smoke/");
}

const authLanePatterns = [
  {
    key: "local_auth_api",
    severity: "blocker",
    re: /(?:\/api\/)?auth[-/](?:signup|login)|auth-(?:signup|login)|admin-login|client-admin-login/gi,
    message: "App-local auth/login endpoint detected."
  },
  {
    key: "local_password_lane",
    severity: "blocker",
    re: /(founder|owner|admin|client admin|operator|workspace)\s+password|password_hash|bcrypt\.compare|verifyPassword\(|hashPassword\(/gi,
    message: "App-local password storage or password login detected."
  },
  {
    key: "local_session_minting",
    severity: "blocker",
    re: /issueSession|createWorkspaceSession|createFirstAdmin|signJwt\(|jwt\.sign|Set-Cookie[^;\n]*(?:session|token)|sessionStorage\.setItem\([^)]*(?:token|session)|localStorage\.setItem\([^)]*(?:token|session)/gi,
    message: "App-local session/token minting detected."
  },
  {
    key: "local_proof_bootstrap",
    severity: "blocker",
    re: /SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP|local-proof-bootstrap|Local SkyGate bootstrap|localIdentity/gi,
    message: "Local proof/bootstrap identity lane detected."
  },
  {
    key: "basic_or_pin_auth",
    severity: "blocker",
    re: /Basic Auth|authorization:\s*Basic|pin\s+(?:lock|login|password)|PIN\s+(?:lock|login|password)/gi,
    message: "Standalone Basic/PIN auth detected."
  }
];

const sharedGatePatterns = [
  /requireGateAuth|requireOperatorAuth|handleOwnerAdminLogin|\/api\/owner\/admin-login/gi,
  /x-skye-gate-session|x-skygate-session|x-free99-gate-session|Authorization/gi,
  /FS27|SkyGate|Free99|auth-fs27-session|auth-introspect|0S Gate/gi
];

function scanAuthLanes(files) {
  const findings = [];
  let sharedGateRefs = 0;
  for (const file of files) {
    let source = read(file);
    if (!source || Buffer.byteLength(source) > 512_000) continue;
    const rel = path.relative(repoRoot, file);
    for (const re of sharedGatePatterns) {
      re.lastIndex = 0;
      if (re.test(source)) sharedGateRefs += 1;
    }
    if (isCanonicalGateSource(file)) continue;
    for (const pattern of authLanePatterns) {
      pattern.re.lastIndex = 0;
      const matches = [...source.matchAll(pattern.re)].slice(0, 12);
      for (const match of matches) {
        findings.push({
          classification: "app-local-auth-lane",
          type: pattern.key,
          severity: pattern.severity,
          file: rel,
          line: lineNumber(source, match.index || 0),
          match: String(match[0] || "").slice(0, 120),
          message: pattern.message
        });
      }
    }
  }
  return {
    sharedGateRefs,
    findings,
    missingSharedGateIntegration: sharedGateRefs === 0
  };
}

function classify(candidate) {
  if (candidate.appLocalAuthHits.length) return "app-local-auth-lane";
  if (candidate.duplicateComponentHits.length) return "duplicate-canonical-component";
  if (candidate.canonicalPlatform && candidate.index.sections >= 4 && !candidate.phraseHits.includes("imported") && !candidate.phraseHits.includes("staticRuntime")) {
    return candidate.index.forms + candidate.index.inputs + candidate.index.buttons >= 8 ? "canonical-real-app" : "canonical-platform-hub";
  }
  if (candidate.index.forms + candidate.index.inputs + candidate.index.buttons >= 8 && !candidate.phraseHits.includes("imported")) return "canonical-real-app";
  if (candidate.indexShellScore >= 8 && candidate.richnessDelta > 15) return "nested-real-app-blocker";
  if (
    candidate.indexShellScore >= 6
    && candidate.richnessDelta <= 15
    && candidate.phraseHits.length === 0
    && candidate.index.buttons + candidate.index.forms + candidate.index.inputs >= 4
  ) return "canonical-routed-app";
  if (candidate.index.forms + candidate.index.inputs === 0 && candidate.phraseHits.includes("marketingShell") && candidate.richnessDelta > 15) return "static-marketing-shell";
  if (candidate.indexShellScore >= 6) return "docked-menu-shell";
  if (candidate.indexShellScore >= 4 && candidate.richnessDelta > 40) return "marketing-to-app-handoff";
  return "partial-app-needs-browser-proof";
}

function inspectDirectory(dir) {
  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) return null;
  const html = read(indexPath);
  const plain = text(html);
  const names = fs.readdirSync(dir).filter((name) => name.endsWith(".html"));
  const siblingRoutes = names.filter((name) => {
    if (name === "index.html" || !routeNames.has(name)) return false;
    return !isCanonicalHandoff(path.join(dir, name));
  });
  const links = [...html.matchAll(/href=["']([^"']+\.html(?:#[^"']*)?)["']/gi)].map((match) => match[1]);
  const nestedLinks = links.filter((href) => href.includes("/") || routeNames.has(path.basename(href)));
  const phraseChecks = {
    imported: () => /Imported App|Open Imported App/i.test(plain),
    commandLane: () => /command lane|Live command surface|standalone platform truth|real product surface lives/i.test(plain),
    staticRuntime: () => /Live runtime is unavailable|Static mode is active|static-safe entry|served by the Node runtime/i.test(plain),
    docked: () => /\bdocked\b|\bdock(?:ed|ing)?\b/i.test(plain) || /class=["'][^"']*(?:skye-dock|dock-nav|dock-proof)[^"']*["']/i.test(html),
    marketingShell: () => /(landing page|marketing page|request demo|learn more|coming soon|launch page|open app|open platform)/i.test(plain),
  };
  const phraseHits = Object.entries(phraseChecks).filter(([, check]) => check()).map(([key]) => key);
  const appLocalAuthHits = unique((plain.match(/(founder|owner|admin|client admin|operator)\s+password|local operator login/gi) || []).slice(0, 8));
  const duplicateComponentHits = unique((plain.match(/local editor|built-in editor|local crm|local billing|local proof ledger/gi) || []).slice(0, 8));

  const index = metrics(indexPath);
  const nestedCandidates = [];
  for (const href of unique([...siblingRoutes, ...nestedLinks.map((href) => href.replace(/^\.\//, ""))])) {
    const full = path.join(dir, href);
    if (fs.existsSync(full) && full !== indexPath && !isCanonicalHandoff(full)) nestedCandidates.push(metrics(full));
  }
  const publicIndex = path.join(dir, "public", "index.html");
  if (fs.existsSync(publicIndex)) nestedCandidates.push(metrics(publicIndex));
  nestedCandidates.sort((a, b) => (b.inputs + b.forms * 2 + b.buttons + b.bytes / 2000) - (a.inputs + a.forms * 2 + a.buttons + a.bytes / 2000));
  const richestNested = nestedCandidates[0] || null;
  const richnessDelta = richestNested
    ? Math.round((richestNested.inputs + richestNested.forms * 2 + richestNested.buttons + richestNested.bytes / 2000) - (index.inputs + index.forms * 2 + index.buttons + index.bytes / 2000))
    : 0;

  let indexShellScore = 0;
  if (siblingRoutes.length >= 5) indexShellScore += 3;
  else if (siblingRoutes.length >= 2) indexShellScore += 1;
  if (nestedLinks.length >= 4) indexShellScore += 3;
  else if (nestedLinks.length >= 1) indexShellScore += 1;
  if (phraseHits.includes("imported")) indexShellScore += 3;
  if (phraseHits.includes("commandLane")) indexShellScore += 2;
  if (phraseHits.includes("staticRuntime")) indexShellScore += 2;
  if (phraseHits.includes("docked")) indexShellScore += 1;
  if (index.forms === 0 && index.inputs === 0 && siblingRoutes.length >= 3) indexShellScore += 1;
  if (richnessDelta > 20) indexShellScore += 2;

  const candidate = {
    dir: path.relative(repoRoot, dir),
    index,
    siblingRoutes,
    nestedLinks: unique(nestedLinks).slice(0, 12),
    phraseHits,
    appLocalAuthHits,
    duplicateComponentHits,
    canonicalPlatform: isCanonicalPlatform(html),
    richestNested,
    richnessDelta,
    indexShellScore,
  };
  candidate.classification = classify(candidate);
  return candidate;
}

const targetReports = targets.map((target) => {
  const absolute = path.resolve(repoRoot, target);
  if (!fs.existsSync(absolute)) {
    return { target, exists: false, candidates: [], blockers: [{ classification: "missing-target", dir: target }] };
  }
  const htmlFiles = walk(absolute);
  const sourceFiles = walkSources(absolute);
  const dirs = unique(htmlFiles.map((file) => path.dirname(file)));
  const candidates = dirs.map(inspectDirectory).filter(Boolean);
  const interesting = candidates.filter((item) => item.classification !== "canonical-real-app" || item.indexShellScore >= 3);
  const authScan = scanAuthLanes(sourceFiles);
  const appLocalAuthBlockers = authScan.findings.filter((finding) => finding.severity === "blocker").slice(0, 80);
  const blockers = [
    ...interesting.filter((item) => ["nested-real-app-blocker", "docked-menu-shell", "static-marketing-shell", "duplicate-canonical-component", "app-local-auth-lane"].includes(item.classification)),
    ...appLocalAuthBlockers
  ];
  return {
    target: path.relative(repoRoot, absolute),
    exists: true,
    htmlFiles: htmlFiles.length,
    sourceFiles: sourceFiles.length,
    authScan,
    candidates: interesting.sort((a, b) => b.indexShellScore - a.indexShellScore || b.richnessDelta - a.richnessDelta),
    blockers,
  };
});

const receipt = {
  ok: targetReports.every((report) => report.exists && report.blockers.length === 0),
  generatedAt: new Date().toISOString(),
  agent: "0s-import-integration-guard",
  targets: targetReports,
};

const receiptPath = path.join(receiptDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-import-guard.json`);
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

if (jsonOnly) {
  console.log(JSON.stringify({ ...receipt, receiptPath }, null, 2));
} else {
  console.log(`0S import guard receipt: ${path.relative(repoRoot, receiptPath)}`);
  for (const report of targetReports) {
    console.log(`\n${report.exists ? "OK" : "MISSING"} ${report.target}`);
    console.log(`html files: ${report.htmlFiles || 0}; source files: ${report.sourceFiles || 0}; blockers: ${report.blockers.length}; candidates: ${report.candidates.length}`);
    if (report.authScan?.findings?.length) {
      for (const finding of report.authScan.findings.slice(0, 8)) {
        console.log(`- ${finding.classification} ${finding.type} ${finding.file}:${finding.line} ${finding.match}`);
      }
    }
    for (const item of report.candidates.slice(0, 8)) {
      if (!item.index) continue;
      console.log(`- ${item.classification} score=${item.indexShellScore} delta=${item.richnessDelta} ${item.dir}`);
      if (item.richestNested) console.log(`  richest nested: ${item.richestNested.file}`);
      if (item.phraseHits.length) console.log(`  phrases: ${item.phraseHits.join(", ")}`);
    }
  }
}

if (failOnBlockers && !receipt.ok) process.exit(1);
