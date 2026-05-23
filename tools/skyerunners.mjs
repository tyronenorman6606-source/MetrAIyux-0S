#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT_DIR = process.env.ROOT_DIR || path.resolve(new URL('..', import.meta.url).pathname);
const SITE_DIR = path.join(ROOT_DIR, 'metraiyux_0s_site');
const STATE_DIR = path.join(ROOT_DIR, 'ops', 'skyerunners');
const QUEUE_DIR = path.join(STATE_DIR, 'queue');
const LEDGER_PATH = path.join(STATE_DIR, 'ledger.ndjson');
const PUBLIC_MAP_PATH = path.join(SITE_DIR, 'brain', 'skyerunners.json');
const ARTIFACT_DIR = path.join(ROOT_DIR, 'test-artifacts', 'skyerunners');
const ARTIFACT_MAP_PATH = path.join(ARTIFACT_DIR, 'knowledge-map.json');
const HOST = process.env.SKYERUNNERS_HOST || '127.0.0.1';
const PORT = Number(process.env.SKYERUNNERS_PORT || 4176);

const logs = [];
let activeRun = null;

const RESOURCE_POLICY = {
  mode: 'operator-directed-full-proof',
  plain_english: 'SkyeRunners are allowed to run complete live system proof and repo-awareness passes when the operator asks. Paid API use, production deploys, billing changes, credential changes, and irreversible actions still require explicit operator approval.',
  spend_position: 'No tiny arbitrary local QA cap; spend-bearing or production-mutating work is approval-gated and ledgered before it happens.',
  hard_boundaries: [
    'Only commands in this SkyeRunners allowlist can run through the local bridge.',
    'External provider spend is not triggered by this bridge by default.',
    'Production deploy, billing, credential, legal, hiring, payment, or customer-impacting actions must be routed through owner approval.',
    'Runner receipts must name the command, target, exit code, artifact path, and follow-up bug notes.',
    'SkySecure live proofs may use the dedicated FS27 SkySecure write secret only for encrypted dummy packs, metadata receipts, and health grants; never for plaintext secret export.',
    'VaultOS about-to-delete proofs are live system proofs with explicit execution scope. They may scan, encrypt, bundle, attach, reload, diff, and restore into test-artifacts or /tmp only; they must not delete the original candidate folder or imply that a Cloudflare Worker mounted the private /workspaces filesystem.'
  ]
};

const RUNNERS = [
  {
    id: 'skyerunner-cartographer',
    name: 'Repo Cartographer',
    lane: 'knowledge',
    primary_brain: 'orion-hayes-brain',
    secondary_brain: 'victor-saint-brain',
    mission: 'Keep the repo inventory, brain map, command map, proof map, and surface map current.',
    uses: ['git inventory', 'package scripts', '0S command registry', 'brain JSON', 'SkyeVault map', 'crawler receipts'],
    default_command: 'map'
  },
  {
    id: 'skyerunner-human-flow',
    name: 'Human Flow Runner',
    lane: 'browser-qa',
    primary_brain: 'victor-saint-brain',
    secondary_brain: 'site-operator-brain',
    mission: 'Use public, admin, operator, and app surfaces like a human would, then report breakage before customers find it.',
    uses: ['SkyeCrawler', 'Playwright browser sweeps', 'mobile layout checks', 'proof artifacts'],
    default_command: 'crawler-static'
  },
  {
    id: 'skyerunner-brain-sync',
    name: 'Brain Sync Runner',
    lane: 'knowledge',
    primary_brain: 'site-operator-brain',
    secondary_brain: 'central-company-command-brain',
    mission: 'Refresh Obsidian exports, private neural maps, public-safe neural maps, and SkyeRunners brain chunks after repo changes.',
    uses: ['Obsidian sync', 'private graph', 'public graph', 'SkyeRunners map'],
    default_command: 'knowledge-refresh'
  },
  {
    id: 'skyerunner-bug-hunter',
    name: 'Bug Hunter',
    lane: 'repo-qa',
    primary_brain: 'victor-saint-brain',
    secondary_brain: '0meg4kai-security-brain',
    mission: 'Run health checks, inspect dirty-state risk, compare receipts, and surface likely defects or missing proof.',
    uses: ['repo health', 'static crawler', 'ledger checks', 'tracked secret-risk scan'],
    default_command: 'repo-health'
  },
  {
    id: 'skyerunner-vault-watch',
    name: 'Vault Watch',
    lane: 'repo-memory',
    primary_brain: 'orion-hayes-brain',
    secondary_brain: '0meg4kai-security-brain',
    mission: 'Keep SkyeVault repo/change memory, VaultOS scans, restore points, and delete-candidate guardrails attached to the 0S brain without exposing workspace secrets.',
    uses: ['SkyeVault 0S bridge', 'workspace maps', 'vault ledgers', 'SkyeVaultOS proof receipts'],
    default_command: 'vaultos-proof'
  },
  {
    id: 'skyerunner-skysecure-health',
    name: 'SkySecure Health Runner',
    lane: 'vault-security',
    primary_brain: '0meg4kai-security-brain',
    secondary_brain: 'victor-saint-brain',
    mission: 'Watch the FS27 -> SkyeVault -> SkySecure proof lane, verify encrypted-pack receipts, check VaultOS command parity, and surface missing live evidence before clients rely on it.',
    uses: ['SkySecure proof receipts', 'FS27 SkySecure API', 'SkyeVault encrypted receipts', 'VaultOS live system proof', '0S proof lane'],
    default_command: 'skysecure-live-proof'
  }
];

const COMMANDS = {
  map: {
    id: 'map',
    title: 'Build SkyeRunners Repo Knowledge Map',
    lane: 'knowledge',
    risk: 'low',
    spend_profile: 'local-only',
    result: 'Writes metraiyux_0s_site/brain/skyerunners.json and test-artifacts/skyerunners/knowledge-map.json.',
    steps: [{ label: 'Build SkyeRunners map', internal: 'map' }]
  },
  'knowledge-refresh': {
    id: 'knowledge-refresh',
    title: 'Refresh Brain, Neural Maps, and SkyeRunners Map',
    lane: 'knowledge',
    risk: 'low',
    spend_profile: 'local-only',
    result: 'Refreshes Obsidian brain export, private graph, public graph, and SkyeRunners repo map.',
    steps: [
      { label: 'Sync Obsidian brain', command: 'npm', args: ['run', 'brain:sync:obsidian'] },
      { label: 'Generate private Obsidian neural map', command: 'npm', args: ['run', 'obsidian:graph'] },
      { label: 'Generate public-safe neural map', command: 'npm', args: ['run', 'obsidian:web-graph'] },
      { label: 'Bridge SkyeVault map', command: 'npm', args: ['run', 'vault:0s:map'] },
      { label: 'Build SkyeRunners map', internal: 'map' }
    ]
  },
  'repo-health': {
    id: 'repo-health',
    title: 'Run Repo Health Check',
    lane: 'repo-qa',
    risk: 'low',
    spend_profile: 'local-only',
    result: 'Runs the repo health checker and records the result in the SkyeRunners ledger.',
    steps: [{ label: 'Repo health', command: 'npm', args: ['run', 'repo:health'] }]
  },
  'crawler-static': {
    id: 'crawler-static',
    title: 'Run Static SkyeCrawler Human-Flow QA',
    lane: 'browser-qa',
    risk: 'low',
    spend_profile: 'local-only',
    result: 'Runs static browser QA and writes the SkyeCrawler report under test-artifacts.',
    steps: [{ label: 'Static SkyeCrawler', command: 'npm', args: ['run', 'skye:crawl:static'] }]
  },
  'crawler-live': {
    id: 'crawler-live',
    title: 'Run Live SkyeCrawler QA',
    lane: 'browser-qa',
    risk: 'medium',
    spend_profile: 'network-read-only',
    result: 'Runs live HTTP/browser checks against the configured production URL.',
    steps: [{ label: 'Live SkyeCrawler', command: 'npm', args: ['run', 'skye:crawl:live'] }]
  },
  'vault-map': {
    id: 'vault-map',
    title: 'Refresh SkyeVault 0S Neural Bridge',
    lane: 'repo-memory',
    risk: 'low',
    spend_profile: 'local-only',
    result: 'Refreshes metraiyux_0s_site/brain/skyevault-vault-map.json.',
    steps: [{ label: 'SkyeVault 0S map', command: 'npm', args: ['run', 'vault:0s:map'] }]
  },
  'skysecure-live-proof': {
    id: 'skysecure-live-proof',
    title: 'Run SkySecure FS27/SkyeVault Live Proof',
    lane: 'vault-security',
    risk: 'high',
    spend_profile: 'network-production-write',
    result: 'Builds a dummy encrypted .skyesecrets pack, uploads it to SkyeVault, registers safe metadata in FS27 SkySecure, grants SkyeRunners observer access, and writes a production proof report.',
    steps: [{ label: 'SkySecure live FS27 vault proof', command: 'npm', args: ['run', 'skye-secure:live-proof'] }]
  },
  'vaultos-proof': {
    id: 'vaultos-proof',
    title: 'Run SkyeVaultOS About-To-Delete Proof',
    lane: 'vault-security',
    risk: 'high',
    spend_profile: 'local-heavy-proof',
    result: 'Runs live system proof with explicit execution scope: scans the /about to delete folder, creates an encrypted VaultOS pack set, verifies, diffs, dry-reloads, reloads into isolated proof storage, creates a restore point, tests grant/revoke/audit, proves bash-native ls/tree/cat-meta/manifest, bundles the vault, attaches it into a fresh vault, reloads from that bundle, and browser-tests the VaultOS console.',
    steps: [{ label: 'VaultOS live system about-to-delete proof', command: 'npm', args: ['run', 'vaultos:proof'] }]
  },
  'mcp-mine-0s': {
    id: 'mcp-mine-0s',
    title: 'Mine Repo MCP Receipt For 0S Site',
    lane: 'mcp',
    risk: 'low',
    spend_profile: 'local-only',
    result: 'Runs the repo-local QuantumSkyes MCP mining flow for metraiyux_0s_site.',
    steps: [{ label: 'MCP mine metraiyux_0s_site', command: 'npm', args: ['run', 'mcp:mine', '--', 'metraiyux_0s_site'] }]
  }
};

function ensureState() {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(PUBLIC_MAP_PATH), { recursive: true });
}

function cleanLine(value) {
  return String(value || '').replace(/\r/g, '').trimEnd();
}

function pushLog(value) {
  const text = cleanLine(value);
  if (!text) return;
  for (const line of text.split(/\n/)) {
    logs.push({ at: new Date().toISOString(), line });
    if (activeRun) {
      activeRun.logs = activeRun.logs || [];
      activeRun.logs.push({ at: new Date().toISOString(), line });
      while (activeRun.logs.length > 120) activeRun.logs.shift();
    }
  }
  while (logs.length > 300) logs.shift();
}

function writeLedger(event) {
  ensureState();
  fs.appendFileSync(LEDGER_PATH, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
}

function rel(file) {
  return path.relative(ROOT_DIR, file).split(path.sep).join('/');
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

function gitList(args, zero = false) {
  try {
    const out = execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(zero ? '\0' : /\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function statusCounts(lines) {
  return lines.reduce((acc, line) => {
    if (line.startsWith('??')) acc.untracked += 1;
    else if (line.slice(0, 2).includes('D')) acc.deleted += 1;
    else acc.modified += 1;
    return acc;
  }, { modified: 0, deleted: 0, untracked: 0, total: lines.length });
}

function classifySurface(file) {
  const rules = [
    ['0s-site', /^metraiyux_0s_site\//],
    ['admin', /^metraiyux_0s_site\/admin\//],
    ['operator', /^metraiyux_0s_site\/operator\//],
    ['brain', /^metraiyux_0s_site\/brain\//],
    ['proof', /^metraiyux_0s_site\/proof\//],
    ['live', /^metraiyux_0s_site\/live\//],
    ['skygate-fs27', /^SkyeGateFS27\//],
    ['mcp', /^MCP\//],
    ['obsidian-vault', /^obsidian-vault\//],
    ['tools', /^tools\//],
    ['ops', /^ops\//],
    ['docs', /^docs\//],
    ['client-app-factory', /^client-app-factory\//],
    ['portal', /^metraiyux-portal\//]
  ];
  return rules.filter(([, pattern]) => pattern.test(file)).map(([name]) => name);
}

function summarizeFiles(files, untrackedSet) {
  const folders = new Map();
  const extensions = new Map();
  const surfaces = new Map();
  const html = [];
  const scripts = [];
  const brain = [];

  for (const file of files) {
    const folder = file.includes('/') ? file.split('/')[0] : '(root)';
    const current = folders.get(folder) || { folder, files: 0, untracked: 0 };
    current.files += 1;
    if (untrackedSet.has(file)) current.untracked += 1;
    folders.set(folder, current);

    const ext = path.extname(file).toLowerCase() || '(none)';
    extensions.set(ext, (extensions.get(ext) || 0) + 1);
    for (const surface of classifySurface(file)) surfaces.set(surface, (surfaces.get(surface) || 0) + 1);
    if (file.endsWith('.html')) html.push(file);
    if (/\.(mjs|js|ts|tsx|jsx)$/.test(file)) scripts.push(file);
    if (file.startsWith('metraiyux_0s_site/brain/') || file.startsWith('obsidian-vault/')) brain.push(file);
  }

  return {
    top_folders: [...folders.values()].sort((a, b) => b.files - a.files || a.folder.localeCompare(b.folder)).slice(0, 60),
    extensions: [...extensions.entries()].map(([extension, count]) => ({ extension, count })).sort((a, b) => b.count - a.count).slice(0, 40),
    surfaces: [...surfaces.entries()].map(([surface, count]) => ({ surface, count })).sort((a, b) => b.count - a.count),
    html_count: html.length,
    script_count: scripts.length,
    brain_file_count: brain.length,
    sample_html: html.slice(0, 40),
    sample_scripts: scripts.slice(0, 40)
  };
}

function readLedger(limit = 50) {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  return fs.readFileSync(LEDGER_PATH, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { event: 'parse-error', error: error.message };
      }
    });
}

function compactLedgerEntry(entry) {
  return {
    event: entry.event || 'event',
    at: entry.at || null,
    command_id: entry.run?.command_id || entry.command_id || null,
    status: entry.run?.status || null,
    title: entry.run?.title || null,
    path: entry.path || null,
    artifact: entry.artifact || null,
    total_files: entry.total_files || null,
    task_id: entry.task?.id || null,
    mission: entry.task?.mission || null,
    error: entry.error || null
  };
}

function readQueue() {
  ensureState();
  return fs.readdirSync(QUEUE_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(QUEUE_DIR, name)))
    .filter(Boolean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function readReport(file) {
  const report = readJson(file);
  if (!report) return { exists: false, path: rel(file) };
  return {
    exists: true,
    path: rel(file),
    ok: report.ok,
    checks: report.checks?.length || 0,
    failures: report.failures?.length || 0,
    warnings: report.warnings?.length || 0,
    started_at: report.started_at || null,
    finished_at: report.finished_at || null,
    checkpoint: report.last_checkpoint || null
  };
}

function readSkySecureLiveProof(file) {
  const report = readJson(file);
  if (!report) return { exists: false, path: rel(file) };
  return {
    exists: true,
    path: rel(file),
    ok: report.ok === true,
    generated_at: report.generatedAt || null,
    hierarchy: report.hierarchy?.chain || null,
    proof_lane: report.fs27?.proofLane || null,
    fs27_base: report.fs27Base || null,
    metraiyux0s_base: report.metraiyux0sBase || null,
    pack_id: report.pack?.packId || null,
    pack_sha256: report.pack?.packSha256 || null,
    vault_receipt_id: report.vaultReceipt?.receiptId || null,
    vault_destination: report.vaultReceipt?.destination || null,
    counts: report.counts || {},
    checks: report.checks || {}
  };
}

function readVaultOSProof(file) {
  const report = readJson(file);
  if (!report) return { exists: false, path: rel(file) };
  const fs27SyncReport = readJson(path.join(path.dirname(file), 'fs27-sync-live.json'));
  const fs27SyncOk = report.commandProof?.fs27Sync
    ? report.commandProof.fs27Sync.ok === true
    : fs27SyncReport?.ok === true;
  return {
    exists: true,
    path: rel(file),
    ok: report.ok === true,
    generated_at: report.generatedAt || null,
    hierarchy: report.hierarchy || null,
    real_folder: report.realFolder?.path || null,
    real_folder_preserved: report.realFolder?.preserved === true,
    file_count: report.realFolder?.fileCount || 0,
    total_bytes: report.realFolder?.totalBytes || 0,
    pack_id: report.vault?.packId || null,
    object_sha256: report.vault?.objectSha256 || null,
    restore_point_id: report.vault?.restorePointId || null,
    command_count: report.commandProof?.commandsCovered?.length || 0,
    commands_covered: report.commandProof?.commandsCovered || [],
    manifest_path: report.commandProof?.manifestPath || null,
    bundle_dir: report.commandProof?.bundleDir || null,
    attached_vault_dir: report.commandProof?.attachedVaultDir || null,
    source_diff_ok: report.commandProof?.sourceDiff?.ok === true,
    reload_diff_ok: report.commandProof?.reloadDiff?.ok === true,
    bundle_reload_diff_ok: report.commandProof?.bundleReloadDiff?.ok === true,
    fs27_sync_ok: fs27SyncOk,
    fs27_sync_count: fs27SyncReport?.syncedCount || report.commandProof?.fs27Sync?.syncedCount || 0,
    console_ok: report.consoleProof?.ok === true
  };
}

function commandSummary(command) {
  return {
    id: command.id,
    title: command.title,
    lane: command.lane,
    risk: command.risk,
    spend_profile: command.spend_profile,
    result: command.result,
    steps: command.steps.map((step) => step.label)
  };
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function addLink(links, source, target, type, strength = 1) {
  if (!source || !target || source === target) return;
  const key = `${source}::${target}::${type}`;
  if (!links.has(key)) links.set(key, { source, target, type, strength });
}

function buildGraph(summary, queue) {
  const nodes = new Map();
  const links = new Map();

  addNode(nodes, { id: 'skyerunners:hub', label: 'SkyeRunners', type: 'hub', group: 'runner', size: 30 });
  addNode(nodes, { id: 'brain:local', label: '0S Local Brain', type: 'brain', group: 'brain', size: 22 });
  addNode(nodes, { id: 'admin:control', label: 'Admin Control', type: 'admin', group: 'admin', size: 20, path: 'metraiyux_0s_site/admin/skyerunners.html' });
  addNode(nodes, { id: 'ops:state', label: 'ops/skyerunners', type: 'state', group: 'ops', size: 18, path: 'ops/skyerunners' });
  addNode(nodes, { id: 'fs27:skysecure', label: 'FS27 SkySecure API', type: 'control-plane', group: 'vault-security', size: 22, path: 'SkyeGateFS27/netlify/functions/skysecure-api.js' });
  addNode(nodes, { id: 'skyevault:custody', label: 'SkyeVault Ciphertext Custody', type: 'vault', group: 'vault-security', size: 20, path: 'SkyeVault-Drop' });
  addNode(nodes, { id: 'vaultos:console', label: 'SkyeVaultOS Console', type: 'console', group: 'vault-security', size: 20, path: 'metraiyux_0s_site/skye-vault-os/index.html' });
  addNode(nodes, { id: 'proof:skysecure-live', label: 'SkySecure Live Proof', type: 'proof', group: 'vault-security', size: 18, path: 'test-artifacts/skye-secure-live-production-proof/live-production-proof-report.json' });
  addNode(nodes, { id: 'proof:vaultos-about-delete', label: 'VaultOS About-To-Delete Proof', type: 'proof', group: 'vault-security', size: 18, path: 'test-artifacts/vaultos-about-to-delete-proof/vaultos-about-to-delete-proof-report.json' });
  addLink(links, 'skyerunners:hub', 'brain:local', 'feeds', 2);
  addLink(links, 'skyerunners:hub', 'admin:control', 'controls', 2);
  addLink(links, 'skyerunners:hub', 'ops:state', 'ledgers', 1.7);
  addLink(links, 'skyerunners:hub', 'fs27:skysecure', 'health-checks', 1.8);
  addLink(links, 'fs27:skysecure', 'skyevault:custody', 'registers-receipts-from', 1.7);
  addLink(links, 'fs27:skysecure', 'vaultos:console', 'publishes-command-proof-for', 1.5);
  addLink(links, 'fs27:skysecure', 'proof:skysecure-live', 'proves', 1.6);
  addLink(links, 'vaultos:console', 'proof:vaultos-about-delete', 'renders', 1.5);
  addLink(links, 'skyevault:custody', 'proof:vaultos-about-delete', 'custodies-encrypted-object-for', 1.4);

  for (const runner of RUNNERS) {
    const runnerNode = `runner:${runner.id}`;
    addNode(nodes, { id: runnerNode, label: runner.name, type: 'runner', group: runner.lane, size: 18, summary: runner.mission });
    addLink(links, 'skyerunners:hub', runnerNode, 'runner', 1.8);
    addLink(links, runnerNode, `command:${runner.default_command}`, 'default-command', 1.5);
  }

  for (const command of Object.values(COMMANDS)) {
    addNode(nodes, { id: `command:${command.id}`, label: command.title, type: 'command', group: command.lane, size: 14, summary: command.result });
    addLink(links, 'admin:control', `command:${command.id}`, 'can-run', 1.2);
  }

  for (const folder of summary.top_folders.slice(0, 35)) {
    const folderNode = `folder:${folder.folder}`;
    addNode(nodes, { id: folderNode, label: folder.folder, type: 'folder', group: 'repo', size: 8 + Math.min(18, Math.log2(folder.files + 1) * 3), summary: `${folder.files} files` });
    addLink(links, 'skyerunners:hub', folderNode, 'knows-folder', 0.8);
  }

  for (const surface of summary.surfaces) {
    const surfaceNode = `surface:${surface.surface}`;
    addNode(nodes, { id: surfaceNode, label: surface.surface, type: 'surface', group: surface.surface, size: 10 + Math.min(10, Math.log2(surface.count + 1) * 2), summary: `${surface.count} files` });
    addLink(links, 'skyerunners:hub', surfaceNode, 'surface', 1);
  }

  for (const task of queue.slice(0, 20)) {
    const taskNode = `task:${task.id}`;
    addNode(nodes, { id: taskNode, label: task.mission || task.id, type: 'task', group: task.status || 'queued', size: 10, summary: task.notes || task.target || '' });
    addLink(links, 'ops:state', taskNode, 'queued-task', 1);
  }

  return { nodes: [...nodes.values()], links: [...links.values()] };
}

function chunksFor(payload) {
  const folderText = payload.knowledge_map.top_folders
    .slice(0, 18)
    .map((item) => `${item.folder}: ${item.files} files${item.untracked ? `, ${item.untracked} untracked` : ''}`)
    .join('; ');
  const commandText = payload.commands.map((command) => `${command.id}: ${command.title} (${command.lane}, ${command.risk}, ${command.spend_profile})`).join('; ');
  const runnerText = payload.runners.map((runner) => `${runner.name} owns ${runner.lane}: ${runner.mission}`).join(' ');

  return [
    {
      id: 'skyerunners-purpose',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'Purpose',
      text: 'SkyeRunners are repo-aware worker agents controlled from admin and operator surfaces. They know the repo through generated maps, brain JSON, command registries, proof receipts, and SkyeVault memory. They use the system like a human by launching browser QA, repo health, brain sync, and proof commands through an allowlisted local bridge.',
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-resource-policy',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'Resource and approval policy',
      text: `${payload.resource_policy.plain_english} ${payload.resource_policy.spend_position} Boundaries: ${payload.resource_policy.hard_boundaries.join(' ')}`,
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-runner-roles',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'Runner roles',
      text: runnerText,
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-command-catalog',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'Allowlisted command catalog',
      text: commandText,
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-repo-inventory',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'Repo inventory',
      text: `The current SkyeRunners map sees ${payload.summary.total_files} repo files, ${payload.summary.tracked_files} tracked files, ${payload.summary.untracked_files} untracked files, ${payload.knowledge_map.html_count} HTML surfaces, ${payload.knowledge_map.script_count} script files, and ${payload.knowledge_map.brain_file_count} brain or vault files. Top folders: ${folderText}.`,
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-current-proof-state',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'Current proof state',
      text: `Latest static crawler report: ${payload.current_state.reports.static.exists ? `${payload.current_state.reports.static.checks} checks, ${payload.current_state.reports.static.failures} failures, ${payload.current_state.reports.static.warnings} warnings` : 'not found'}. Repo dirty state: ${payload.current_state.git.status.total} working tree changes. Queue: ${payload.current_state.queue.total} queued SkyeRunners task files. Ledger entries: ${payload.current_state.ledger_count}.`,
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-skysecure-live-proof',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'SkySecure live proof lane',
      text: payload.current_state.skysecure_live.exists
        ? `SkySecure live proof is ${payload.current_state.skysecure_live.ok ? 'passing' : 'not passing'} for ${payload.current_state.skysecure_live.hierarchy || 'FS27 -> SkyeVault -> SkySecure'}. Proof lane ${payload.current_state.skysecure_live.proof_lane || 'unknown'} registered pack ${payload.current_state.skysecure_live.pack_id || 'unknown'} with SkyeVault receipt ${payload.current_state.skysecure_live.vault_receipt_id || 'unknown'} and FS27 counts ${JSON.stringify(payload.current_state.skysecure_live.counts || {})}.`
        : 'SkySecure live proof report is not present yet. Run npm run skye-secure:live-proof after FS27 and SkyeVault are deployed.',
      source: 'brain/skyerunners.json'
    },
    {
      id: 'skyerunners-vaultos-proof',
      title: 'SkyeRunners Repo Agent Map',
      heading: 'SkyeVaultOS live system about-to-delete proof lane',
      text: payload.current_state.vaultos_about_delete.exists
        ? `SkyeVaultOS live system proof is ${payload.current_state.vaultos_about_delete.ok ? 'passing' : 'not passing'} for ${payload.current_state.vaultos_about_delete.real_folder || '/about to delete'}. It preserved the source folder, encrypted ${payload.current_state.vaultos_about_delete.file_count} files, produced restore point ${payload.current_state.vaultos_about_delete.restore_point_id || 'unknown'}, covered ${payload.current_state.vaultos_about_delete.command_count || 0} commands, wrote manifest ${payload.current_state.vaultos_about_delete.manifest_path || 'unknown'}, bundled to ${payload.current_state.vaultos_about_delete.bundle_dir || 'unknown'}, attached into ${payload.current_state.vaultos_about_delete.attached_vault_dir || 'unknown'}, and has source/reload/bundle reload diff checks ${payload.current_state.vaultos_about_delete.source_diff_ok && payload.current_state.vaultos_about_delete.reload_diff_ok && payload.current_state.vaultos_about_delete.bundle_reload_diff_ok ? 'passing' : 'not passing'}. Execution scope remains CLI/app filesystem operations plus deployed FS27 and 0S proof surfaces.`
        : 'SkyeVaultOS live system proof report is not present yet. Run npm run vaultos:proof before deleting the /about to delete folder.',
      source: 'brain/skyerunners.json'
    }
  ];
}

async function buildKnowledgeMap() {
  ensureState();
  const tracked = gitList(['ls-files', '-z'], true);
  const untracked = gitList(['ls-files', '--others', '--exclude-standard', '-z'], true);
  const untrackedSet = new Set(untracked);
  const files = [...new Set([...tracked, ...untracked])]
    .filter((file) => !file.startsWith('node_modules/') && !file.startsWith('.git/') && !file.startsWith('tmp/'));
  const packageJson = readJson(path.join(ROOT_DIR, 'package.json')) || {};
  const commandRegistry = readJson(path.join(ROOT_DIR, 'ops', '0s-command-registry.json')) || {};
  const obsidianSync = readJson(path.join(SITE_DIR, 'brain', 'obsidian-sync.json')) || {};
  const knowledgeBase = readJson(path.join(SITE_DIR, 'brain', 'knowledge-base.json')) || {};
  const liveSurfaces = readJson(path.join(SITE_DIR, 'brain', 'live-surface-registry.json')) || {};
  const skyevaultMap = readJson(path.join(SITE_DIR, 'brain', 'skyevault-vault-map.json')) || {};
  const queue = readQueue();
  const ledger = readLedger(100);
  const statusLines = gitList(['status', '--porcelain=v1']);
  const knowledgeMap = summarizeFiles(files, untrackedSet);

  const payload = {
    id: 'skyerunners-repo-agent-map',
    name: 'SkyeRunners',
    version: '0.1.0',
    generated_at: new Date().toISOString(),
    source: 'tools/skyerunners.mjs',
    exposure: 'admin/operator brain map; no secrets, no raw env values',
    summary: {
      total_files: files.length,
      tracked_files: tracked.length,
      untracked_files: untracked.length,
      package_scripts: Object.keys(packageJson.scripts || {}).length,
      operator_commands: (commandRegistry.commands || []).length,
      obsidian_notes: obsidianSync.note_count || 0,
      obsidian_chunks: obsidianSync.chunk_count || 0,
      base_knowledge_chunks: knowledgeBase.chunk_count || (knowledgeBase.chunks || []).length || 0,
      live_surfaces: liveSurfaces.surface_count || (liveSurfaces.surfaces || []).length || 0,
      skyevault_repos: (skyevaultMap.repos || []).length,
      skyevault_receipts: (skyevaultMap.uploads || []).length
    },
    resource_policy: RESOURCE_POLICY,
    runners: RUNNERS,
    commands: Object.values(COMMANDS).map(commandSummary),
    operator_controls: {
      local_bridge_url: `http://${HOST}:${PORT}`,
      admin_page: 'metraiyux_0s_site/admin/skyerunners.html',
      operator_page: 'metraiyux_0s_site/operator/index.html',
      queue_dir: rel(QUEUE_DIR),
      ledger_path: rel(LEDGER_PATH)
    },
    knowledge_map: knowledgeMap,
    current_state: {
      git: {
        branch: git(['branch', '--show-current'], 'unknown'),
        commit: git(['rev-parse', '--short', 'HEAD'], 'unknown'),
        status: statusCounts(statusLines)
      },
      reports: {
        static: readReport(path.join(ROOT_DIR, 'test-artifacts', 'skye-crawler-report.json')),
        worker: readReport(path.join(ROOT_DIR, 'test-artifacts', 'skye-crawler-worker-report.json')),
        live: readReport(path.join(ROOT_DIR, 'test-artifacts', 'skye-crawler-live-report.json'))
      },
      skysecure_live: readSkySecureLiveProof(path.join(ROOT_DIR, 'test-artifacts', 'skye-secure-live-production-proof', 'live-production-proof-report.json')),
      vaultos_about_delete: readVaultOSProof(path.join(ROOT_DIR, 'test-artifacts', 'vaultos-about-to-delete-proof', 'vaultos-about-to-delete-proof-report.json')),
      queue: {
        total: queue.length,
        latest: queue.slice(0, 12)
      },
      ledger_count: ledger.length,
      latest_ledger: ledger.slice(-12).map(compactLedgerEntry)
    }
  };

  const graph = buildGraph(knowledgeMap, queue);
  payload.nodes = graph.nodes;
  payload.links = graph.links;
  payload.chunks = chunksFor(payload);

  writeJson(PUBLIC_MAP_PATH, payload);
  writeJson(ARTIFACT_MAP_PATH, payload);
  writeLedger({ event: 'map.generated', path: rel(PUBLIC_MAP_PATH), artifact: rel(ARTIFACT_MAP_PATH), total_files: files.length });
  return payload;
}

function enqueueTask(input = {}) {
  ensureState();
  const id = `skr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const task = {
    id,
    status: 'queued',
    created_at: new Date().toISOString(),
    requested_by: input.requested_by || 'operator',
    mission: String(input.mission || 'SkyeRunners operator task').slice(0, 180),
    lane: input.lane || 'operator',
    target: input.target || '',
    priority: input.priority || 'normal',
    notes: input.notes || '',
    suggested_command: input.suggested_command || 'map',
    payload: input.payload || {}
  };
  writeJson(path.join(QUEUE_DIR, `${id}.json`), task);
  writeLedger({ event: 'task.queued', task });
  return task;
}

function spawnStep(step) {
  return new Promise((resolve) => {
    if (step.internal === 'map') {
      buildKnowledgeMap()
        .then((map) => {
          pushLog(`[${step.label}] wrote ${rel(PUBLIC_MAP_PATH)} with ${map.summary.total_files} files`);
          resolve({ ok: true, code: 0, signal: null });
        })
        .catch((error) => {
          pushLog(`[${step.label}] ${error.stack || error.message}`);
          resolve({ ok: false, code: 1, signal: null, error: error.message });
        });
      return;
    }

    const child = spawn(step.command, step.args || [], {
      cwd: path.join(ROOT_DIR, step.cwd || '.'),
      env: { ...process.env, ROOT_DIR },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (data) => pushLog(`[${step.label}] ${data}`));
    child.stderr.on('data', (data) => pushLog(`[${step.label}] ${data}`));
    child.on('exit', (code, signal) => resolve({ ok: code === 0, code: code ?? 1, signal: signal || null }));
    child.on('error', (error) => {
      pushLog(`[${step.label}] ${error.message}`);
      resolve({ ok: false, code: 1, signal: null, error: error.message });
    });
  });
}

async function executeRun(commandId) {
  const command = COMMANDS[commandId];
  if (!command) throw new Error(`Unknown SkyeRunners command: ${commandId}`);
  if (activeRun) throw new Error(`SkyeRunners is already running ${activeRun.command_id}`);

  activeRun = {
    id: `run_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    command_id: command.id,
    title: command.title,
    lane: command.lane,
    risk: command.risk,
    spend_profile: command.spend_profile,
    started_at: new Date().toISOString(),
    status: 'running',
    step_index: 0,
    steps: command.steps.map((step) => step.label),
    logs: []
  };
  writeLedger({ event: 'run.started', run: { ...activeRun, logs: [] } });
  pushLog(`[control] starting ${activeRun.id}: ${command.title}`);

  const completedSteps = [];
  let ok = true;
  for (let index = 0; index < command.steps.length; index += 1) {
    const step = command.steps[index];
    activeRun.step_index = index;
    activeRun.current_step = step.label;
    pushLog(`[control] step ${index + 1}/${command.steps.length}: ${step.label}`);
    const result = await spawnStep(step);
    completedSteps.push({ label: step.label, ...result });
    if (!result.ok) {
      ok = false;
      break;
    }
  }

  const finished = {
    ...activeRun,
    status: ok ? 'passed' : 'failed',
    finished_at: new Date().toISOString(),
    completed_steps: completedSteps,
    logs: activeRun.logs || []
  };
  writeLedger({ event: 'run.finished', run: { ...finished, logs: finished.logs.slice(-40) } });
  pushLog(`[control] finished ${finished.id}: ${finished.status}`);
  activeRun = null;
  return finished;
}

function bridgeStatus() {
  ensureState();
  const map = readJson(PUBLIC_MAP_PATH);
  const stat = fs.existsSync(PUBLIC_MAP_PATH) ? fs.statSync(PUBLIC_MAP_PATH) : null;
  const queue = readQueue();
  const ledger = readLedger(40);
  return {
    ok: true,
    bridge: 'SkyeRunners Control',
    active: Boolean(activeRun),
    activeRun,
    map: map ? {
      exists: true,
      path: rel(PUBLIC_MAP_PATH),
      generated_at: map.generated_at,
      bytes: stat?.size || 0,
      total_files: map.summary?.total_files || 0,
      runners: (map.runners || []).length,
      commands: (map.commands || []).length,
      chunks: (map.chunks || []).length
    } : { exists: false, path: rel(PUBLIC_MAP_PATH) },
    queue: {
      total: queue.length,
      latest: queue.slice(0, 20)
    },
    ledger,
    commands: Object.values(COMMANDS).map(commandSummary),
    runners: RUNNERS,
    logs: logs.slice(-100)
  };
}

function headers(type = 'application/json; charset=utf-8') {
  return {
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store'
  };
}

function send(res, status, data) {
  res.writeHead(status, headers());
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function startServer() {
  ensureState();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers());
      res.end();
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      send(res, 200, { ok: true, bridge: 'SkyeRunners Control', status_url: `http://${HOST}:${PORT}/status` });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/status') {
      send(res, 200, bridgeStatus());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/map') {
      send(res, 200, readJson(PUBLIC_MAP_PATH) || { ok: false, error: 'SkyeRunners map has not been generated yet.' });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/queue') {
      send(res, 200, { ok: true, queue: readQueue() });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/enqueue') {
      const body = await readBody(req);
      send(res, 201, { ok: true, task: enqueueTask(body) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/run') {
      const body = await readBody(req);
      const commandId = body.command || body.command_id || 'map';
      if (!COMMANDS[commandId]) {
        send(res, 404, { ok: false, error: `Unknown SkyeRunners command: ${commandId}` });
        return;
      }
      if (activeRun) {
        send(res, 409, { ok: false, error: 'SkyeRunners is already running.', activeRun });
        return;
      }
      executeRun(commandId).catch((error) => {
        writeLedger({ event: 'run.error', command_id: commandId, error: error.message });
        pushLog(`[control] ${error.stack || error.message}`);
        activeRun = null;
      });
      send(res, 202, { ok: true, run: activeRun });
      return;
    }
    send(res, 404, { ok: false, error: 'Not found' });
  });

  server.listen(PORT, HOST, () => {
    console.log(`SkyeRunners Control listening at http://${HOST}:${PORT}`);
  });
}

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function printHelp() {
  console.log('Usage: node tools/skyerunners.mjs <command>');
  console.log('');
  console.log('Commands:');
  console.log('  map                         Build the repo knowledge map');
  console.log('  status                      Print bridge/map/queue status');
  console.log('  enqueue --mission=<text>    Queue an operator task');
  console.log('  run <command-id>            Run an allowlisted command');
  console.log('  serve                       Start local admin bridge');
  console.log('');
  console.log('Allowlisted command IDs:');
  Object.values(COMMANDS).forEach((command) => {
    console.log(`  ${command.id.padEnd(18)} ${command.title}`);
  });
}

async function main() {
  const [cmd, maybeId] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') {
    printHelp();
    return;
  }
  if (cmd === 'map') {
    const map = await buildKnowledgeMap();
    console.log(`SkyeRunners map generated: ${rel(PUBLIC_MAP_PATH)}`);
    console.log(JSON.stringify({ generated_at: map.generated_at, total_files: map.summary.total_files, chunks: map.chunks.length }, null, 2));
    return;
  }
  if (cmd === 'status') {
    console.log(JSON.stringify(bridgeStatus(), null, 2));
    return;
  }
  if (cmd === 'enqueue') {
    const task = enqueueTask({
      mission: argValue('--mission', process.argv.slice(3).join(' ') || 'SkyeRunners operator task'),
      lane: argValue('--lane', 'operator'),
      target: argValue('--target', ''),
      priority: argValue('--priority', 'normal'),
      notes: argValue('--notes', ''),
      suggested_command: argValue('--command', 'map')
    });
    console.log(JSON.stringify(task, null, 2));
    return;
  }
  if (cmd === 'run') {
    const run = await executeRun(maybeId || 'map');
    console.log(JSON.stringify({ id: run.id, status: run.status, command_id: run.command_id, completed_steps: run.completed_steps }, null, 2));
    process.exit(run.status === 'passed' ? 0 : 1);
  }
  if (cmd === 'serve') {
    startServer();
    return;
  }
  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
