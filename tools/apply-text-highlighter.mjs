#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const siteRoots = [
  "Metraiyux-Marketing",
  "SkyeGateFS27",
  "SkyeVault-Drop/public",
  "SkyeVault-Drop/internal-pages",
  "bobs-smoke-shop",
  "bobs-smoke-shop-mcp-redo",
  "client-app-factory",
  "empire-pallets-v3-app",
  "legalskyes-website",
  "marketing",
  "metraiyux-portal",
  "metraiyux_0s_site",
  "neon-rift-blocks-mobile-v13-site",
  "skyesol_spectacle_reference/reference-site",
];

const standaloneHtml = ["sovereign-business-command.html"];

const skipDirs = new Set([
  ".git",
  ".netlify",
  ".wrangler",
  ".wrangler-dry-run",
  "node_modules",
  "test-artifacts",
  "tmp",
]);

const skipPathFragments = [
  "/assets/vendor/",
  "/proof/e2e-",
  "/proof/behavioral-proof-",
  "/MCP_TOOLING_RECEIPT",
];

const maxHighlightsPerFile = 8;
const maxFileBytes = 520_000;

const highlighterCss = `

/* Magic UI text highlighter treatment */
.magic-highlighter,
.magic-highlight,
.magic-underline,
[data-highlight] {
  --highlighter-color: #87cefa;
  display: inline;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.magic-highlighter[data-highlight="highlight"],
.magic-highlight,
[data-highlight="highlight"] {
  border-radius: .18em;
  padding: 0 .12em;
  background:
    linear-gradient(104deg,
      transparent .08em,
      color-mix(in srgb, var(--highlighter-color) 68%, transparent) .08em,
      color-mix(in srgb, var(--highlighter-color) 68%, transparent) calc(100% - .08em),
      transparent calc(100% - .08em));
  text-shadow: 0 .08em .22em rgba(0, 0, 0, .16);
}

.magic-highlighter[data-highlight="underline"],
.magic-underline,
[data-highlight="underline"] {
  text-decoration-line: underline;
  text-decoration-color: var(--highlighter-color);
  text-decoration-thickness: .16em;
  text-underline-offset: .13em;
  text-decoration-skip-ink: none;
}

@supports not (color: color-mix(in srgb, white 50%, transparent)) {
  .magic-highlighter[data-highlight="highlight"],
  .magic-highlight,
  [data-highlight="highlight"] {
    background: linear-gradient(104deg, transparent .08em, var(--highlighter-color) .08em, var(--highlighter-color) calc(100% - .08em), transparent calc(100% - .08em));
  }
}
`;

const inlineStyles = {
  highlight:
    "--highlighter-color:#87CEFA;display:inline;box-decoration-break:clone;-webkit-box-decoration-break:clone;border-radius:.18em;padding:0 .12em;background:linear-gradient(104deg,transparent .08em,color-mix(in srgb,var(--highlighter-color) 68%,transparent) .08em,color-mix(in srgb,var(--highlighter-color) 68%,transparent) calc(100% - .08em),transparent calc(100% - .08em));text-shadow:0 .08em .22em rgba(0,0,0,.16)",
  underline:
    "--highlighter-color:#FF9800;display:inline;box-decoration-break:clone;-webkit-box-decoration-break:clone;text-decoration-line:underline;text-decoration-color:var(--highlighter-color);text-decoration-thickness:.16em;text-underline-offset:.13em;text-decoration-skip-ink:none",
};

const phraseRules = [
  ["proof-backed deployment", "highlight", "#87CEFA"],
  ["restore-tested backups", "highlight", "#87CEFA"],
  ["private operator handoff", "highlight", "#87CEFA"],
  ["authenticated buyer access", "highlight", "#87CEFA"],
  ["approval gates", "highlight", "#87CEFA"],
  ["proof receipts", "highlight", "#87CEFA"],
  ["receipt-backed", "highlight", "#87CEFA"],
  ["operator proof", "highlight", "#87CEFA"],
  ["workflow proof", "highlight", "#87CEFA"],
  ["browser proof", "highlight", "#87CEFA"],
  ["client-ready dashboard", "highlight", "#87CEFA"],
  ["client workspace", "highlight", "#87CEFA"],
  ["client portal", "highlight", "#87CEFA"],
  ["command room", "highlight", "#87CEFA"],
  ["command center", "highlight", "#87CEFA"],
  ["operating system", "highlight", "#87CEFA"],
  ["autonomous business", "highlight", "#87CEFA"],
  ["AI-operated company", "highlight", "#87CEFA"],
  ["brain-to-brain routing", "highlight", "#87CEFA"],
  ["site operator brain", "highlight", "#87CEFA"],
  ["local brain", "highlight", "#87CEFA"],
  ["16-brain layer", "highlight", "#87CEFA"],
  ["13-cabinet", "highlight", "#87CEFA"],
  ["Cloudflare Worker", "highlight", "#87CEFA"],
  ["Cloudflare R2", "highlight", "#87CEFA"],
  ["Stripe Checkout", "highlight", "#87CEFA"],
  ["Google Drive", "highlight", "#87CEFA"],
  ["form-to-record backend", "highlight", "#87CEFA"],
  ["multi-tenant isolation", "highlight", "#87CEFA"],
  ["owned infra", "highlight", "#87CEFA"],
  ["white-label resale model", "highlight", "#87CEFA"],
  ["hard approval gates", "highlight", "#87CEFA"],
  ["Phoenix-area businesses", "highlight", "#87CEFA"],
  ["commercial pallet supply", "highlight", "#87CEFA"],
  ["heat-treatment support", "highlight", "#87CEFA"],
  ["drop-trailer programs", "highlight", "#87CEFA"],
  ["pallet recycling", "highlight", "#87CEFA"],
  ["Custom-built pallets", "highlight", "#87CEFA"],
  ["Quality-inspected", "highlight", "#87CEFA"],
  ["ISPM-15 compliance", "highlight", "#87CEFA"],
  ["Litchfield Park", "highlight", "#87CEFA"],
  ["exotic snacks", "highlight", "#87CEFA"],
  ["CBD products", "highlight", "#87CEFA"],
  ["premium cigars", "highlight", "#87CEFA"],
  ["premium glass", "highlight", "#87CEFA"],
  ["local SEO", "highlight", "#87CEFA"],
  ["Human review required", "highlight", "#87CEFA"],
  ["No professional advice", "highlight", "#87CEFA"],
  ["high-risk", "highlight", "#87CEFA"],
  ["regulated decisions", "highlight", "#87CEFA"],
  ["privacy requests", "highlight", "#87CEFA"],
  ["MetrAIyux 0S", "underline", "#FF9800"],
  ["Skyes Over London LC", "underline", "#FF9800"],
  ["Skyes Over London", "underline", "#FF9800"],
  ["Gray London Skyes", "underline", "#FF9800"],
  ["SkyeGateFS27", "underline", "#FF9800"],
  ["SkyeVault-Drop", "underline", "#FF9800"],
  ["SkyeMail", "underline", "#FF9800"],
  ["SkyePay", "underline", "#FF9800"],
  ["SkyeSol", "underline", "#FF9800"],
  ["Legal Skyes", "underline", "#FF9800"],
  ["Empire Pallets", "underline", "#FF9800"],
  ["Bob's Smoke Shop", "underline", "#FF9800"],
  ["SoveReign13", "underline", "#FF9800"],
  ["CitadelDB Ultimate", "underline", "#FF9800"],
  ["0meg4kAI", "underline", "#FF9800"],
  ["kAIxU", "underline", "#FF9800"],
  ["VANTA13", "underline", "#FF9800"],
].map(([text, action, color]) => ({
  text,
  action,
  color,
  regex: new RegExp(escapeRegExp(text), "gi"),
})).sort((a, b) => b.text.length - a.text.length);

const skipTextTags = new Set([
  "script",
  "style",
  "code",
  "pre",
  "textarea",
  "select",
  "option",
  "title",
  "svg",
  "header",
  "nav",
  "footer",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function shouldSkip(filePath) {
  const rel = `/${toPosix(path.relative(repoRoot, filePath))}`;
  return skipPathFragments.some((fragment) => rel.includes(fragment));
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (!shouldSkip(full)) acc.push(full);
  }
  return acc;
}

function collectFiles() {
  const files = [];
  for (const root of siteRoots) {
    const abs = path.join(repoRoot, root);
    files.push(...walk(abs));
  }
  for (const file of standaloneHtml) {
    const abs = path.join(repoRoot, file);
    if (fs.existsSync(abs)) files.push(abs);
  }
  return [...new Set(files)];
}

function appendCss(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > maxFileBytes) return false;
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes("Magic UI text highlighter treatment")) return false;
  fs.writeFileSync(filePath, `${source.replace(/\s*$/, "")}${highlighterCss}\n`);
  return true;
}

function getTagName(tag) {
  const match = tag.match(/^<\/?\s*([a-zA-Z0-9-]+)/);
  return match ? match[1].toLowerCase() : "";
}

function isClosingTag(tag) {
  return /^<\//.test(tag);
}

function isSelfClosingTag(tag) {
  return /\/\s*>$/.test(tag) || /^<\s*(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(tag);
}

function isExistingHighlighter(tag) {
  return /\bmagic-(?:highlighter|highlight|underline)\b/i.test(tag) || /\bdata-highlight=/i.test(tag);
}

function boundaryOk(text, start, end) {
  const before = start > 0 ? text[start - 1] : "";
  const after = end < text.length ? text[end] : "";
  return !/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after);
}

function collectRanges(text, state) {
  const ranges = [];
  for (const rule of phraseRules) {
    if (state.count >= maxHighlightsPerFile) break;
    const key = `${rule.action}:${rule.text.toLowerCase()}`;
    if (state.used.has(key)) continue;
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (!boundaryOk(text, start, end)) continue;
      if (ranges.some((range) => start < range.end && end > range.start)) continue;
      ranges.push({ start, end, match: match[0], rule, key });
      state.used.add(key);
      state.count += 1;
      break;
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function wrapRange(range) {
  const style = inlineStyles[range.rule.action].replace(
    /--highlighter-color:#[A-Fa-f0-9]+/,
    `--highlighter-color:${range.rule.color}`,
  );
  return `<span class="magic-highlighter" data-highlight="${range.rule.action}" style="${style}">${range.match}</span>`;
}

function highlightText(text, state) {
  if (!text.trim() || state.count >= maxHighlightsPerFile) return text;
  const ranges = collectRanges(text, state);
  if (!ranges.length) return text;
  let out = "";
  let cursor = 0;
  for (const range of ranges) {
    out += text.slice(cursor, range.start);
    out += wrapRange(range);
    cursor = range.end;
  }
  out += text.slice(cursor);
  return out;
}

function highlightHtml(source) {
  const state = { count: 0, used: new Set() };
  let result = "";
  let cursor = 0;
  const tagStack = [];
  const tagRegex = /<[^>]*>/g;
  let match;

  const skipped = () => tagStack.length > 0;

  while ((match = tagRegex.exec(source))) {
    const text = source.slice(cursor, match.index);
    result += skipped() ? text : highlightText(text, state);

    const tag = match[0];
    const name = getTagName(tag);
    if (name) {
      if (isClosingTag(tag)) {
        const index = tagStack.lastIndexOf(name);
        if (index >= 0) tagStack.splice(index, 1);
      } else if (!isSelfClosingTag(tag) && (skipTextTags.has(name) || isExistingHighlighter(tag))) {
        tagStack.push(name);
      }
    }
    result += tag;
    cursor = tagRegex.lastIndex;
  }

  const tail = source.slice(cursor);
  result += skipped() ? tail : highlightText(tail, state);
  return { html: result, count: state.count };
}

function updateHtml(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > maxFileBytes) return 0;
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes("magic-highlighter")) return 0;
  const { html, count } = highlightHtml(source);
  if (!count || html === source) return 0;
  fs.writeFileSync(filePath, html);
  return count;
}

const files = collectFiles();
const cssFiles = files.filter((file) => file.endsWith(".css"));
const htmlFiles = files.filter((file) => file.endsWith(".html"));

let cssChanged = 0;
let htmlChanged = 0;
let highlights = 0;

for (const file of cssFiles) {
  if (appendCss(file)) cssChanged += 1;
}

for (const file of htmlFiles) {
  const count = updateHtml(file);
  if (count) {
    htmlChanged += 1;
    highlights += count;
  }
}

const report = {
  cssChanged,
  htmlChanged,
  highlights,
  htmlScanned: htmlFiles.length,
  cssScanned: cssFiles.length,
};

console.log(JSON.stringify(report, null, 2));

