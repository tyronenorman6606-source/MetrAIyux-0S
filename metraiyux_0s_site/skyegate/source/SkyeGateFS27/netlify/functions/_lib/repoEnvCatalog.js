import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CANONICAL_ENV_TEMPLATE = "env.ultimate.template";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const TEMPLATE_PATH = path.join(PROJECT_ROOT, CANONICAL_ENV_TEMPLATE);

const OWNERSHIP = Object.freeze({
  gate: { owner: "Gate-owned", note: "Parent authority, billing, secrets, and shared control-plane state stay under operator control." },
  runtime: { owner: "Runtime-shell-only", note: "These vars wire runtime control, MCP, child platforms, and launcher stacks into the gate." },
  mixed: { owner: "Mixed", note: "Either gate-owned or customer BYO depending on whether the platform is using house lanes or isolated customer lanes." }
});

function titleToKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "env-section";
}

function isTitleCandidate(text) {
  return !text.includes("=") && !text.startsWith("KAIXU_ALIAS_");
}

function ownershipForTitle(title) {
  const normalized = title.toLowerCase();
  if (
    normalized.includes("runtime") ||
    normalized.includes("bridge") ||
    normalized.includes("mcp") ||
    normalized.includes("child apps")
  ) {
    return OWNERSHIP.runtime;
  }
  if (
    normalized.includes("ai vendors") ||
    normalized.includes("vector") ||
    normalized.includes("communications") ||
    normalized.includes("voice")
  ) {
    return OWNERSHIP.mixed;
  }
  return OWNERSHIP.gate;
}

function parseEnvTemplate(raw) {
  const sections = [];
  let pendingTitle = "";
  let current = null;
  let afterDivider = false;
  let lastCommentText = "";

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      const text = trimmed.replace(/^#+\s?/, "").trim();
      if (!text) continue;
      if (/^-+$/.test(text)) {
        if (!pendingTitle && lastCommentText && isTitleCandidate(lastCommentText)) pendingTitle = lastCommentText;
        afterDivider = true;
        lastCommentText = "";
        continue;
      }
      if (afterDivider && !pendingTitle && isTitleCandidate(text)) {
        pendingTitle = text;
      }
      afterDivider = false;
      lastCommentText = text;
      continue;
    }

    const match = /^([A-Z0-9_]+)\s*=/.exec(trimmed);
    if (!match) continue;

    if (!current || (pendingTitle && current.title !== pendingTitle)) {
      const title = pendingTitle || "Unsectioned";
      current = {
        key: titleToKey(title),
        title,
        ownership: ownershipForTitle(title),
        vars: []
      };
      sections.push(current);
      pendingTitle = "";
    }

    current.vars.push(match[1]);
    afterDivider = false;
    lastCommentText = "";
  }

  return sections.filter((section) => section.vars.length);
}

function readTemplateSections() {
  const raw = fs.readFileSync(TEMPLATE_PATH, "utf8");
  return parseEnvTemplate(raw);
}

function detectConfigured(name) {
  return !!String(process.env[name] || "").trim();
}

export function getRepoEnvSections() {
  return readTemplateSections().map((section) => ({
    ...section,
    canonical_template: CANONICAL_ENV_TEMPLATE,
    owner: section.ownership?.owner || "Unspecified",
    ownership_note: section.ownership?.note || "",
    vars: section.vars.map((name) => ({
      name,
      configured: detectConfigured(name)
    }))
  }));
}

export function getRepoEnvSummary() {
  const sections = getRepoEnvSections();
  const all = sections.flatMap((section) => section.vars);
  return {
    canonical_template: CANONICAL_ENV_TEMPLATE,
    sections: sections.length,
    total_vars: all.length,
    configured_vars: all.filter((entry) => entry.configured).length,
    missing_vars: all.filter((entry) => !entry.configured).length
  };
}
