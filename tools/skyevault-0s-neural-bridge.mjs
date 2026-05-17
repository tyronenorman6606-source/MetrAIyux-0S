import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function resolvePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { event: 'parse-error', line: index + 1, error: error.message };
      }
    });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readReceipts(outDir) {
  if (!fs.existsSync(outDir)) return [];
  return fs.readdirSync(outDir)
    .filter((name) => /^skyevault-receipt-.*\.json$/.test(name))
    .map((name) => {
      const file = path.join(outDir, name);
      const stat = fs.statSync(file);
      if (stat.size === 0) return null;
      const receipt = readJson(file);
      if (!receipt?.receiptId) return null;
      const recovered = receipt.status?.manifest || {};
      const recoveredReceipt = receipt.status?.receipt || {};
      return {
        receiptId: receipt.receiptId,
        sessionId: receipt.sessionId || recovered.sessionId || recoveredReceipt.sessionId || null,
        completedAt: receipt.generatedAt || recovered.completedAt || recoveredReceipt.completedAt || null,
        destination: typeof receipt.destination === 'string' ? receipt.destination : receipt.destination?.name || recovered.destination?.name || recoveredReceipt.destinationName || null,
        fileName: receipt.fileName || receipt.name || recovered.file?.name || recoveredReceipt.fileName || null,
        fileSize: Number(receipt.fileSize || receipt.archive?.bytes || recovered.file?.size || recoveredReceipt.fileSize || 0),
        sha256: receipt.sha256 || receipt.archive?.sha256 || recovered.file?.fingerprint?.value || recoveredReceipt.fileFingerprint?.value || null,
        archiveFileCount: receipt.archive?.fileCount || null,
        excludedSecrets: receipt.archive?.secretLookingFilesExcluded || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.completedAt || a.receiptId).localeCompare(String(b.completedAt || b.receiptId)));
}

function cleanText(value, length = 220) {
  return String(value || '')
    .replace(/\b\/(?:tmp|workspaces|home)\/[^\s)]+/g, 'local path')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length);
}

function bytes(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}

function safeRef(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(String(value || prefix)).digest('hex').slice(0, 12)}`;
}

function shortSha(value) {
  return value ? String(value).slice(0, 16) : null;
}

function safeSourcePath(file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (relative.startsWith('..') || path.isAbsolute(relative)) return path.basename(file);
  return relative;
}

function addNode(nodes, node) {
  if (!node?.id) return;
  const current = nodes.get(node.id) || {};
  nodes.set(node.id, { ...current, ...node });
}

function addLink(links, source, target, type, strength = 1) {
  if (!source || !target || source === target) return;
  const key = `${source}::${target}::${type}`;
  if (!links.has(key)) links.set(key, { source, target, type, strength });
}

function sortByTime(events) {
  return [...events].sort((a, b) => String(a.recordedAt || a.exportedAt || '').localeCompare(String(b.recordedAt || b.exportedAt || '')));
}

function repoKey(event) {
  return `${event.workspaceId || 'default'}/${event.repoId || 'repo'}`;
}

const outDir = resolvePath(argValue('--out-dir'), path.join(root, '.skyevault-out'));
const remoteLedgerPath = resolvePath(argValue('--remote-ledger'), path.join(outDir, 'git-remote-ledger.jsonl'));
const uploadLedgerPath = resolvePath(argValue('--upload-ledger'), path.join(outDir, 'vault-ledger.jsonl'));
const outputPath = resolvePath(argValue('--output'), path.join(root, 'metraiyux_0s_site', 'brain', 'skyevault-vault-map.json'));
const maxEvents = Number.parseInt(argValue('--max-events') || '500', 10);

const remoteEvents = sortByTime(readJsonl(remoteLedgerPath).filter((event) => event.event && event.event !== 'parse-error')).slice(-maxEvents);
const uploadEvents = sortByTime(readJsonl(uploadLedgerPath).filter((event) => event.event && event.event !== 'parse-error')).slice(-maxEvents);
const receipts = readReceipts(outDir).slice(-200);
const safeUploads = receipts.map((receipt) => ({
  receipt_ref: safeRef('receipt', receipt.receiptId),
  session_ref: receipt.sessionId ? safeRef('session', receipt.sessionId) : null,
  completedAt: receipt.completedAt,
  destination: receipt.destination,
  fileName: cleanText(receipt.fileName, 100),
  fileSize: receipt.fileSize,
  sha256_prefix: shortSha(receipt.sha256),
  archiveFileCount: receipt.archiveFileCount,
  excludedSecrets: receipt.excludedSecrets
}));

const nodes = new Map();
const links = new Map();
const repos = new Map();

addNode(nodes, {
  id: 'skyevault:hub',
  label: 'SkyeVault',
  type: 'vault-hub',
  group: 'vault',
  size: 30,
  summary: 'Git remote, vault upload, restore, export, and proof event lane for 0S.'
});

for (const event of remoteEvents) {
  const key = repoKey(event);
  const repo = repos.get(key) || {
    id: key,
    workspace_id: event.workspaceId || 'default',
    repo_id: event.repoId || 'repo',
    ref_updates: 0,
    requests: 0,
    exports: 0,
    services: {},
    refs: {},
    latest_commit: null,
    latest_event_at: null
  };

  repo.latest_event_at = event.recordedAt || event.exportedAt || repo.latest_event_at;
  if (event.event === 'git.ref-update') {
    repo.ref_updates += 1;
    repo.refs[event.ref] = event.newRev;
    if (event.commit) repo.latest_commit = event.commit;
  }
  if (event.event === 'git.remote-request') {
    repo.requests += 1;
    repo.services[event.service || 'unknown'] = (repo.services[event.service || 'unknown'] || 0) + 1;
  }
  if (event.event === 'git.remote-export') repo.exports += 1;
  repos.set(key, repo);

  const workspaceNode = `workspace:${repo.workspace_id}`;
  const repoNode = `repo:${key}`;
  addNode(nodes, {
    id: workspaceNode,
    label: repo.workspace_id,
    type: 'workspace',
    group: 'workspace',
    size: 20,
    summary: `Vault workspace ${repo.workspace_id}`
  });
  addNode(nodes, {
    id: repoNode,
    label: key,
    type: 'repo',
    group: 'repo',
    size: 16 + Math.min(10, repo.ref_updates),
    summary: `${repo.ref_updates} ref updates, ${repo.requests} Git requests, ${repo.exports} exports`
  });
  addLink(links, 'skyevault:hub', workspaceNode, 'workspace', 1.8);
  addLink(links, workspaceNode, repoNode, 'repo', 1.8);

  if (event.event === 'git.ref-update' && event.commit?.hash) {
    const commitNode = `commit:${event.commit.hash}`;
    addNode(nodes, {
      id: commitNode,
      label: event.commit.subject || event.commit.hash.slice(0, 12),
      type: 'commit',
      group: 'commit',
      size: 10,
      summary: cleanText(`${event.action} ${event.ref} at ${event.commit.date || event.recordedAt}`)
    });
    addLink(links, repoNode, commitNode, event.action || 'ref-update', 1.2);
  }

  if (event.event === 'git.remote-export') {
    const exportNode = `export:${key}:${event.sha256 || event.fileName || event.exportedAt}`;
    addNode(nodes, {
      id: exportNode,
      label: event.fileName || 'Git bundle export',
      type: 'bundle-export',
      group: 'export',
      size: 11,
      summary: `Cloneable bundle, ${bytes(event.bytes)}, sha256 ${event.sha256 || 'unknown'}`
    });
    addLink(links, repoNode, exportNode, 'export', 1.4);
  }
}

for (const receipt of receipts) {
  const safe = safeUploads.find((item) => item.receipt_ref === safeRef('receipt', receipt.receiptId));
  const uploadNode = `upload:${safe.receipt_ref}`;
  addNode(nodes, {
    id: uploadNode,
    label: safe.fileName || safe.receipt_ref,
    type: 'vault-upload',
    group: 'upload',
    size: 11,
    summary: cleanText(`${safe.destination || 'Vault'} upload ${bytes(safe.fileSize)} sha256 ${safe.sha256_prefix || 'unknown'}`)
  });
  addLink(links, 'skyevault:hub', uploadNode, 'upload-receipt', 1);
}

const repoList = [...repos.values()]
  .sort((a, b) => String(b.latest_event_at || '').localeCompare(String(a.latest_event_at || '')))
  .map((repo) => ({
    id: repo.id,
    workspace_id: repo.workspace_id,
    repo_id: repo.repo_id,
    ref_updates: repo.ref_updates,
    requests: repo.requests,
    exports: repo.exports,
    refs: repo.refs,
    service_summary: Object.fromEntries(Object.entries(repo.services).sort((a, b) => a[0].localeCompare(b[0]))),
    latest_subject: repo.latest_commit?.subject || null,
    latest_head: repo.latest_commit?.hash || null,
    latest_author: repo.latest_commit?.authorName || null,
    latest_event_at: repo.latest_event_at
  }));

const chunks = [
  {
    id: 'skyevault-0s-architecture',
    title: 'SkyeVault 0S Neural Map',
    heading: 'Gate controls identity, SkyeVault stores repos, 0S tracks the brain map',
    text: `SkyeVault is the Git and vault storage engine. SkyeGateFS27 should authorize users, roles, customers, workspace limits, and audit events. MetrAIyux 0S consumes this SkyeVault map as the neural context for repos, pushes, clones, bundle exports, restore events, and vault uploads. Current map has ${repoList.length} repos and ${receipts.length} upload receipts.`,
    source: 'brain/skyevault-vault-map.json',
    tags: ['skyevault', 'skygate', 'metraiyux-0s', 'git', 'neural-map']
  },
  ...repoList.map((repo) => ({
    id: `skyevault-repo-${repo.workspace_id}-${repo.repo_id}`,
    title: 'SkyeVault Repo',
    heading: `${repo.workspace_id}/${repo.repo_id}`,
    text: `Workspace ${repo.workspace_id} repo ${repo.repo_id} has ${repo.ref_updates} ref updates, ${repo.requests} Git smart HTTP requests, ${repo.exports} bundle exports, and latest commit ${repo.latest_subject || 'none'} ${repo.latest_head || ''}. Services: ${Object.entries(repo.service_summary).map(([name, count]) => `${name} ${count}`).join(', ') || 'none'}.`,
    source: 'brain/skyevault-vault-map.json',
    tags: ['skyevault', 'repo', 'git', repo.workspace_id, repo.repo_id]
  })),
  ...safeUploads.slice(-20).map((receipt) => ({
    id: `skyevault-upload-${receipt.receipt_ref}`,
    title: 'SkyeVault Upload Receipt',
    heading: receipt.fileName || receipt.receipt_ref,
    text: `Vault receipt ${receipt.receipt_ref} uploaded ${receipt.fileName || 'archive'} to ${receipt.destination || 'vault'} with size ${bytes(receipt.fileSize)} and sha256 prefix ${receipt.sha256_prefix || 'unknown'}.`,
    source: 'brain/skyevault-vault-map.json',
    tags: ['skyevault', 'upload', 'receipt']
  }))
];

const payload = {
  schema: 'metraiyux.0s.skyevault-map.v1',
  generated_at: new Date().toISOString(),
  sources: {
    remote_ledger: safeSourcePath(remoteLedgerPath),
    upload_ledger: safeSourcePath(uploadLedgerPath),
    receipts_dir: safeSourcePath(outDir)
  },
  safety: 'public-safe summary: absolute paths, raw tokens, raw session IDs, full receipt IDs, author emails, and private file bodies are not emitted',
  repo_count: repoList.length,
  remote_event_count: remoteEvents.length,
  upload_event_count: uploadEvents.length,
  receipt_count: receipts.length,
  total_receipt_bytes: receipts.reduce((sum, item) => sum + Number(item.fileSize || 0), 0),
  total_receipt_human: bytes(receipts.reduce((sum, item) => sum + Number(item.fileSize || 0), 0)),
  repos: repoList,
  uploads: safeUploads,
  nodes: [...nodes.values()],
  links: [...links.values()],
  chunks
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Generated SkyeVault 0S neural bridge with ${payload.repo_count} repos, ${payload.receipt_count} receipts, ${payload.nodes.length} nodes, and ${payload.links.length} links.`);
console.log(path.relative(root, outputPath));
