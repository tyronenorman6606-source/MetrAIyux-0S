#!/usr/bin/env node
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  appendEvent,
  readRecord,
  repoRoot,
  saveRecord,
  slugify
} from "./factory-engine.mjs";
import {
  exists,
  latestGeneratedApp,
  markState,
  toPosix,
  walk,
  writeJson
} from "./factory-pipeline-shared.mjs";

const textExtensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".xml", ".txt"]);
const placeholderScanExtensions = new Set([".html", ".css", ".js", ".mjs", ".webmanifest", ".xml", ".txt"]);
const ignoreNames = new Set(["node_modules", ".git", ".DS_Store"]);
const reportFilePattern = /^(CLIENT_(ENHANCEMENT|IDENTITY|VERIFICATION)_REPORT|VALLEY_SYNC_PAYLOAD)\.json$/i;
const bannedSnippets = [
  "Client Brand",
  "CLIENT BRAND",
  "123 Main Street",
  "Client City",
  "Client State",
  "0000000000",
  "preview@client-brand-preview.com",
  "https://valley-verified.pages.dev/business/client-brand/",
  "https://client-brand.pages.dev/",
  "Pictures carried into the template.",
  "neutral placeholders ready for client footage"
];

function buildRouteMap(files, appDir) {
  const map = new Map();
  const add = (aliases, target) => {
    for (const alias of aliases.filter(Boolean)) map.set(alias, target);
  };
  for (const file of files.filter((entry) => entry.ext === ".html")) {
    const rel = toPosix(file.relative);
    const withoutExt = rel.replace(/\.html$/i, "");
    const target = path.join(appDir, file.relative);
    if (rel === "index.html") {
      add(["", "/", "index", "index.html", "/index", "/index.html"], target);
      continue;
    }
    if (rel.endsWith("/index.html")) {
      const routeBase = withoutExt.replace(/\/index$/, "");
      const dirRoute = `/${routeBase}`;
      add([routeBase, `${routeBase}/`, `${routeBase}.html`, rel, dirRoute, `${dirRoute}/`, `${dirRoute}/index.html`], target);
      continue;
    }
    const route = `/${withoutExt}`;
    add([withoutExt, `${withoutExt}/`, `${withoutExt}.html`, rel, route, `${route}/`, `/${rel}`], target);
  }
  return map;
}

function isSkippableLink(value = "") {
  return /^(mailto:|tel:|sms:|data:|javascript:|https?:\/\/|#|%23)/i.test(value);
}

function looksLikePathReference(value = "") {
  if (!value || /\s/.test(value)) return false;
  if (isSkippableLink(value)) return false;
  return /^(\/|\.\/|\.\.\/|assets\/|favicon\.png|manifest\.webmanifest|styles\.css|script\.js|service-worker\.js|workspace-preview(?:\/|\.html)?|blog(?:\/|\.html)?|inventory(?:\/|\.html)?|specials(?:\/|\.html)?|gallery(?:\/|\.html)?|faq(?:\/|\.html)?|contact(?:\/|\.html)?|local-seo(?:\/|\.html)?|delivery(?:\/|\.html)?|flyer(?:\/|\.html)?)/i.test(value)
    || /\.[a-z0-9]{2,5}($|[?#])/i.test(value)
    || value.includes("/");
}

function resolveReference(rawValue, attr, fileDir, appDir, routeMap) {
  if (attr === "href" && rawValue === "") return path.join(appDir, "index.html");
  if (!looksLikePathReference(rawValue) || isSkippableLink(rawValue)) return "";
  const clean = rawValue.split("?")[0].split("#")[0];
  const aliases = [
    rawValue,
    clean,
    clean.replace(/\/+$/, ""),
    clean.replace(/\.html$/i, ""),
    clean.endsWith(".html") ? clean.replace(/\.html$/i, "") : `${clean}.html`
  ];
  for (const alias of aliases) {
    if (routeMap.has(alias)) return routeMap.get(alias);
  }
  if (rawValue.startsWith("/")) return path.join(appDir, clean.replace(/^\//, ""));
  const localTarget = path.resolve(fileDir, clean);
  if (existsSync(localTarget)) return localTarget;
  const rootTarget = path.resolve(appDir, clean);
  if (existsSync(rootTarget)) return rootTarget;
  return path.resolve(fileDir, clean);
}

function collectAttributeRefs(content) {
  const refs = [];
  content.replace(/(href|src|poster|content)=("([^"]*)"|'([^']*)')/g, (full, attr, quoted, dbl, sgl) => {
    refs.push({ attr, value: dbl ?? sgl ?? "" });
    return full;
  });
  content.replace(/url\((['"]?)([^'")]+)\1\)/g, (full, quote, value) => {
    refs.push({ attr: "url()", value });
    return full;
  });
  return refs;
}

export async function runFactoryVerify(payload = {}) {
  const clientId = slugify(payload.clientId || "skye-app-template");
  const record = await readRecord(clientId);
  const app = latestGeneratedApp(record);
  if (!app?.publishFolder) {
    throw new Error(`No generated app folder is available for ${clientId}. Run the core pass first.`);
  }

  const appDir = path.resolve(app.publishFolder);
  const files = await walk(appDir, { skip: ignoreNames });
  const routeMap = buildRouteMap(files, appDir);
  const issues = [];
  const checkedRefs = [];
  const isTemplateRun = /white-label|template/i.test([record.clientId, record.displayName, record.industry].join(" "));

  for (const file of files.filter((entry) => textExtensions.has(entry.ext))) {
    const content = await readFile(file.path, "utf8");
    const relativeFile = toPosix(path.relative(repoRoot, file.path));
    if (!isTemplateRun && placeholderScanExtensions.has(file.ext) && !reportFilePattern.test(path.basename(file.path))) {
      for (const snippet of bannedSnippets) {
        if (content.includes(snippet)) {
          issues.push({
            level: "error",
            type: "placeholder-copy",
            file: relativeFile,
            value: snippet
          });
        }
      }
    }

    for (const ref of collectAttributeRefs(content)) {
      if (!ref.value) continue;
      if (ref.attr === "content" && !looksLikePathReference(ref.value)) continue;
      if (ref.attr === "url()" && !looksLikePathReference(ref.value)) continue;
      if (ref.value.startsWith("/") && !/^\/\//.test(ref.value) && !ref.value.startsWith("/api/")) {
        issues.push({
          level: "warn",
          type: "absolute-local-path",
          file: relativeFile,
          value: ref.value
        });
      }
      const resolved = resolveReference(ref.value, ref.attr, path.dirname(file.path), appDir, routeMap);
      if (!resolved) continue;
      checkedRefs.push({
        file: relativeFile,
        attr: ref.attr,
        value: ref.value,
        resolved: toPosix(path.relative(repoRoot, resolved))
      });
      if (!(await exists(resolved))) {
        issues.push({
          level: "error",
          type: "missing-local-target",
          file: relativeFile,
          value: ref.value,
          resolved: toPosix(path.relative(repoRoot, resolved))
        });
      }
    }
  }

  const reportPath = path.join(appDir, "CLIENT_VERIFICATION_REPORT.json");
  const report = {
    clientId,
    checkedAt: new Date().toISOString(),
    publishFolder: toPosix(path.relative(repoRoot, appDir)),
    ok: !issues.some((issue) => issue.level === "error"),
    issueCount: issues.length,
    issues,
    checkedRefs
  };
  await writeJson(reportPath, report);

  let next = {
    ...record,
    verificationReports: Array.from(new Set([...(record.verificationReports || []), toPosix(path.relative(repoRoot, reportPath))]))
  };
  if (report.ok) next = markState(next, "preview-ready");
  const event = await appendEvent(clientId, report.ok ? "verified-client-build" : "verify-client-build-failed", `${report.ok ? "Verified" : "Flagged"} generated app for ${record.displayName}`, {
    artifact: toPosix(path.relative(repoRoot, reportPath)),
    issues: issues.length
  });
  const saved = await saveRecord(next, event);

  return {
    ok: report.ok,
    clientId,
    record: saved,
    report
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = await runFactoryVerify({ clientId: process.argv[2] || "skye-app-template" });
  console.log(JSON.stringify(result, null, 2));
}
