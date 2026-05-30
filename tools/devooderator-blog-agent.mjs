#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'brief';

const SAFE_ROOTS = [
  'marketing/devooderator',
  '.agents',
  'tools',
  'SkyeVault-Drop/public',
  'metraiyux_0s_site/proof',
  'metraiyux_0s_site/brain',
  'test-artifacts/merser31-devooderator',
  'test-artifacts/skrucible-devooderator',
  '.skyevault-out/autosync',
  '.skyevault-out/bins'
];

const SECRET_KEY_RE = /(secret|token|bearer|passphrase|pepper|password|private|credential|api.?key|admin.?code|signed)/i;
const SECRET_VALUE_RE = /\b(?:sk-[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_]{20,}|gh[pous]_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})\b/g;

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function writeText(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function git(gitArgs, fallback = '') {
  try {
    return execFileSync('git', gitArgs, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

function sinceDate() {
  const explicit = argValue('--since');
  if (explicit) return new Date(explicit);
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function safeString(value) {
  return String(value || '').replace(SECRET_VALUE_RE, '[redacted]');
}

function sanitize(value, key = '') {
  if (SECRET_KEY_RE.test(key)) return '[redacted]';
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => sanitize(item));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitize(childValue, childKey);
    }
    return out;
  }
  if (typeof value === 'string') return safeString(value).slice(0, 2000);
  return value;
}

function statusPaths(statusLines) {
  const paths = [];
  for (const line of statusLines) {
    if (!line || line.startsWith('##')) continue;
    const raw = line.slice(3).trim().replace(/^"|"$/g, '');
    if (!raw) continue;
    if (raw.includes(' -> ')) paths.push(...raw.split(' -> ').map((item) => item.trim()));
    else paths.push(raw);
  }
  return [...new Set(paths)].sort();
}

function recentFiles(root, since, limit = 160) {
  const abs = path.resolve(repoRoot, root);
  if (!fs.existsSync(abs)) return [];
  const sinceIso = since.toISOString();
  const output = execFileSync('find', [
    abs,
    '-type', 'f',
    '-newermt', sinceIso,
    '!', '-path', '*/node_modules/*',
    '!', '-path', '*/.git/*',
    '!', '-path', '*/.wrangler/*',
    '!', '-path', '*/.cache/*'
  ], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return output.split(/\r?\n/)
    .filter(Boolean)
    .map((file) => {
      const stat = fs.statSync(file);
      return { path: rel(file), bytes: stat.size, mtime: new Date(stat.mtimeMs).toISOString() };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime) || a.path.localeCompare(b.path))
    .slice(0, limit);
}

function recentReceipts(since) {
  const roots = [
    '.skyevault-out',
    'test-artifacts/merser31-devooderator',
    'test-artifacts/skrucible-devooderator',
    'marketing/devooderator'
  ];
  const files = roots.flatMap((root) => recentFiles(root, since, 80))
    .filter((item) => /\.(json|md|txt)$/i.test(item.path))
    .filter((item) => !/private-handoff|handoff|passphrase|pepper/i.test(item.path))
    .slice(0, 120);
  return files.map((item) => {
    const abs = path.resolve(repoRoot, item.path);
    if (!item.path.endsWith('.json')) return item;
    try {
      const parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
      const summary = sanitize({
        schema: parsed.schema,
        ok: parsed.ok,
        action: parsed.action,
        targetSurface: parsed.targetSurface,
        mcpName: parsed.mcpName,
        actualToolCalls: parsed.actualToolCalls,
        receiptId: parsed.receiptId,
        controlReceiptId: parsed.controlReceiptId || parsed.controlUpload?.receiptId,
        artifactBytes: parsed.artifactBytes,
        artifactSha256: parsed.artifactSha256,
        plannedModes: parsed.plannedModes,
        binId: parsed.binId,
        binLabel: parsed.binLabel,
        fileCount: parsed.fileCount,
        packPath: parsed.packPath
      });
      return { ...item, summary };
    } catch {
      return item;
    }
  });
}

function relevantScripts() {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  return Object.fromEntries(Object.entries(pkg.scripts || {})
    .filter(([key, value]) => /devooderator|vault|agent|mcp|proof|skyenet|cloudflare|worker|pages/i.test(`${key} ${value}`))
    .sort(([a], [b]) => a.localeCompare(b)));
}

function buildBrief() {
  const since = sinceDate();
  const status = git(['status', '--porcelain=v1', '--branch'], '').split(/\r?\n/).filter(Boolean);
  const changedPaths = statusPaths(status);
  const recentByRoot = Object.fromEntries(SAFE_ROOTS.map((root) => [root, recentFiles(root, since, 80)]));
  const receipts = recentReceipts(since);
  const latestAutosync = (() => {
    const file = path.join(repoRoot, '.skyevault-out/autosync/latest-success.json');
    if (!fs.existsSync(file)) return null;
    return sanitize(JSON.parse(fs.readFileSync(file, 'utf8')));
  })();
  const brief = {
    schema: 'devooderator.field-scribe.brief.v1',
    generatedAt: new Date().toISOString(),
    host: os.hostname(),
    since: since.toISOString(),
    repo: {
      root: repoRoot,
      branch: git(['branch', '--show-current'], 'HEAD') || 'HEAD',
      head: git(['rev-parse', '--short', 'HEAD'], ''),
      status,
      changedPathCount: changedPaths.length,
      changedPaths: changedPaths.slice(0, 220)
    },
    recentByRoot,
    receipts,
    latestAutosync,
    publicSurfaces: [
      'https://devooderator.pages.dev/',
      'https://devooderator.pages.dev/cards',
      'https://skyevault-drop.graylondonskyes.workers.dev/agent-install.html',
      'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/skyevault-autosync-proof.html'
    ],
    relevantScripts: relevantScripts(),
    safety: {
      redacted: true,
      rule: 'Do not print secrets, passphrases, peppers, bearer tokens, signed owner URLs, admin codes, raw env values, or private handoff bodies.'
    }
  };
  brief.digest = sha256Text(JSON.stringify(brief));
  return brief;
}

function markdownBrief(brief) {
  const changed = brief.repo.changedPaths.slice(0, 60).map((item) => `- \`${item}\``).join('\n') || '- No changed paths reported.';
  const receipts = brief.receipts.slice(0, 30).map((item) => {
    const label = item.summary?.schema || item.summary?.mcpName || 'receipt';
    return `- \`${item.path}\` (${label}, ${item.mtime})`;
  }).join('\n') || '- No recent receipts found.';
  const surfaces = brief.publicSurfaces.map((item) => `- ${item}`).join('\n');
  return `# DevodeRator Field Scribe Brief

Generated: ${brief.generatedAt}
Since: ${brief.since}
Branch: ${brief.repo.branch}
Head: ${brief.repo.head}
Digest: ${brief.digest}

## Changed Paths

${changed}

## Recent Receipts

${receipts}

## Public Surfaces To Check

${surfaces}

## Writing Notes

- Write in Gray's first-person founder/operator voice.
- Include what broke, what slowed down, what changed, what deployed, and what proof exists.
- Do not invent proof or imply headed browser proof passed unless the receipt exists.
- Do not expose secrets, env values, passphrases, peppers, bearer tokens, signed owner URLs, or private handoff content.
`;
}

function markdownDraft(brief) {
  return `${markdownBrief(brief)}

## Draft Scaffold

Today was one of those build days where the product had to prove itself inside my own workflow. I was not writing a feature from a distance. I was using the 0S, SkyeVault, DevodeRator, the MCP lanes, and the proof surfaces as the actual working system.

The first pressure point was the repo itself. The day touched ${brief.repo.changedPathCount} changed paths, with the highest-signal work clustered around DevodeRator, SkyeVault, agent instructions, autosync/bin receipts, and proof surfaces. That matters because source custody is not just a nice backup story for me. It is the difference between losing the real workspace and having a recovery lane that respects tracked files, untracked files, local-only material, and agent instructions.

What I have to say clearly is this: proof is the product language. If a page moved, a deploy happened, a vault receipt was written, or an MCP was called, the blog has to say exactly what backed it. The receipts collected in this brief are the source material. Anything not proven stays a boundary, a next pass, or a beta lane.

The architecture win is that DevodeRator now has a dedicated Field Scribe agent and SkyeVault has a companion bin path for agents. That means the blog system can collect the day, turn it into a founder/dev narrative, and keep the agent instructions protected in the SkyeAgents Bin without smearing those files across every other bin export.

Next, I would turn this scaffold into the final public post by choosing the strongest receipts from the brief, tightening the opening around the day's actual struggle, and ending with the next feature lane: vault bins, agent exports, and recovery workflows that make the 0S harder to lose.
`;
}

function writeOutputs(brief, includeDraft) {
  const outDir = path.join(repoRoot, '.skyevault-out', 'devooderator-blog-agent');
  const id = stamp();
  const briefJson = path.join(outDir, `brief-${id}.json`);
  const briefMd = path.join(outDir, `brief-${id}.md`);
  writeJson(briefJson, brief);
  writeJson(path.join(outDir, 'latest-brief.json'), brief);
  writeText(briefMd, markdownBrief(brief));
  const outputs = { briefJson: rel(briefJson), briefMarkdown: rel(briefMd) };
  if (includeDraft) {
    const draftMd = path.join(outDir, `draft-${id}.md`);
    writeText(draftMd, markdownDraft(brief));
    outputs.draftMarkdown = rel(draftMd);
  }
  return outputs;
}

if (!['brief', 'draft'].includes(command)) {
  console.error('Usage: node tools/devooderator-blog-agent.mjs brief|draft [--since=<date>]');
  process.exit(2);
}

const brief = buildBrief();
const outputs = writeOutputs(brief, command === 'draft');
console.log(JSON.stringify({
  ok: true,
  schema: 'devooderator.field-scribe.result.v1',
  command,
  generatedAt: brief.generatedAt,
  since: brief.since,
  digest: brief.digest,
  changedPathCount: brief.repo.changedPathCount,
  receiptCount: brief.receipts.length,
  outputs
}, null, 2));
