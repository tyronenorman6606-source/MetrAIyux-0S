import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function normalizePath(value) { return String(value || '').replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/+/g, '/'); }
function readJson(files, filePath, fallback = {}) { try { return JSON.parse(files[filePath] || ''); } catch { return fallback; } }
function hasFile(files, re) { return Object.keys(files || {}).some(p => re.test(p)); }
function patchChange(action, filePath, content, reason) { return { action, path: normalizePath(filePath), content, reason }; }
function hash(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex'); }
async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

function safeOutputPath(rootDir, relPath) {
  const normalized = normalizePath(relPath);
  if (!normalized || normalized.includes('..') || path.isAbsolute(normalized) || /\0/.test(normalized)) throw new Error(`unsafe patch output path: ${relPath}`);
  const full = path.resolve(rootDir, normalized);
  const root = path.resolve(rootDir);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) throw new Error(`patch output escapes root: ${relPath}`);
  return full;
}

export function buildPatchBundleForIssue(issue = {}, files = {}) {
  const title = `${issue.title || ''} ${issue.action || ''} ${issue.category || ''}`.toLowerCase();
  const changes = [];
  if (/readme|documentation/.test(title) && !hasFile(files, /^readme(\.md)?$/i)) {
    changes.push(patchChange('create', 'README.md', `# Platform Workspace\n\nThis project has been upgraded for skAIxu platform evaluation.\n\n## Operator notes\n\n- Auth is inherited upstream. Do not add local auth here unless the upstream contract changes.\n- Run \`npm test\` before claiming readiness.\n- Keep seed data under \`platform-seed/\` and generated data under \`generated/platform-data/\`.\n`, 'Create missing README with operator-safe rules'));
  }
  if (/env|environment|secret/.test(title) && !hasFile(files, /^\.env\.example$/i)) {
    changes.push(patchChange('create', '.env.example', `# Runtime contracts\n# Auth is inherited from the upstream shell.\nSKAI_UPSTREAM_AUTH_REQUIRED=true\nSKAI_GATEWAY_URL=https://kaixugateway13.netlify.app\nSKAI_WORKSPACE_API_URL=\n`, 'Create missing env contract without secrets'));
  }
  if (/test|smoke|proof/.test(title)) {
    const pkg = readJson(files, 'package.json', null);
    if (pkg && !pkg.scripts?.test) {
      const next = { ...pkg, scripts: { ...(pkg.scripts || {}), test: 'node tools/smoke-check.mjs' } };
      changes.push(patchChange('update', 'package.json', `${JSON.stringify(next, null, 2)}\n`, 'Add deterministic smoke test command'));
    }
    if (!files['tools/smoke-check.mjs']) {
      changes.push(patchChange('create', 'tools/smoke-check.mjs', `import { readFileSync } from 'node:fs';\n\nconst html = readFileSync('index.html', 'utf8');\nconst required = ['tab-workspace', 'tab-proof'];\nconst missing = required.filter(id => !html.includes(id));\nif (missing.length) throw new Error('Missing required UI ids: ' + missing.join(', '));\nconsole.log('✅ smoke-check passed');\n`, 'Create deterministic smoke check'));
    }
  }
  if (/license/.test(title) && !hasFile(files, /^license(\.md)?$/i)) changes.push(patchChange('create', 'LICENSE', `Proprietary. All rights reserved.\n`, 'Create explicit license placeholder'));
  if (/provider|direct|gateway/.test(title)) {
    changes.push(patchChange('create', 'platform-ledgers/provider-policy.md', `# Provider Policy\n\nAll AI/model calls must route through kAIxuGateway13 or another approved gateway adapter. Direct browser calls to OpenAI, Anthropic, Gemini, Mistral, Groq, or similar provider APIs are blocked by policy.\n`, 'Write direct-provider policy ledger'));
  }
  if (!changes.length) {
    changes.push(patchChange('create', `platform-ledgers/tasks/${issue.id || 'manual-task'}.md`, `# ${issue.title || 'Implementation task'}\n\nStatus: open\nSeverity: ${issue.severity || 'medium'}\nCategory: ${issue.category || 'platform'}\n\n## Evidence\n${issue.evidence || 'No evidence supplied.'}\n\n## Required action\n${issue.action || 'Review and implement a full-file patch.'}\n`, 'Create manual task ledger for issue'));
  }
  return { type: 'SKAI_PATCH_BUNDLE', generatedAt: new Date().toISOString(), sourceIssueId: issue.id || null, summary: `Deterministic patch bundle for ${issue.title || issue.id || 'issue'}`, changes };
}

export function buildPatchBundlesFromIssues(issues = [], files = {}) { return issues.map(issue => buildPatchBundleForIssue(issue, files)); }

export function validatePatchBundle(bundle = {}) {
  const issues = [];
  if (!bundle || typeof bundle !== 'object') issues.push('bundle must be an object');
  if (!Array.isArray(bundle.changes) || !bundle.changes.length) issues.push('bundle.changes must be a non-empty array');
  for (const [index, change] of (bundle.changes || []).entries()) {
    const filePath = normalizePath(change.path);
    if (!['create', 'update', 'delete'].includes(change.action)) issues.push(`changes[${index}].action must be create/update/delete`);
    if (!filePath) issues.push(`changes[${index}].path is required`);
    if (path.isAbsolute(filePath)) issues.push(`changes[${index}].path cannot be absolute`);
    if (filePath.includes('..')) issues.push(`changes[${index}].path cannot contain ..`);
    if (/\0/.test(filePath)) issues.push(`changes[${index}].path cannot contain null bytes`);
    if (change.action !== 'delete' && typeof change.content !== 'string') issues.push(`changes[${index}].content must be full string content`);
  }
  return { ok: issues.length === 0, issues };
}

export function applyPatchBundleToFileMap(files = {}, bundle = {}) {
  const validation = validatePatchBundle(bundle);
  const receipt = {
    id: `task_receipt_${Date.now().toString(36)}_${hash(bundle).slice(0, 8)}`,
    type: 'SKAI_TASK_RUN_RECEIPT',
    generatedAt: new Date().toISOString(),
    bundleHash: hash(bundle),
    sourceIssueId: bundle.sourceIssueId || null,
    changes: [],
    status: 'running',
    validation,
  };
  const nextFiles = { ...files };
  if (!validation.ok) {
    receipt.status = 'blocked';
    receipt.finishedAt = new Date().toISOString();
    return { files: nextFiles, receipt };
  }
  for (const change of bundle.changes) {
    const filePath = normalizePath(change.path);
    const before = Object.prototype.hasOwnProperty.call(nextFiles, filePath) ? String(nextFiles[filePath]) : null;
    if (change.action === 'delete') delete nextFiles[filePath];
    else nextFiles[filePath] = String(change.content);
    const after = Object.prototype.hasOwnProperty.call(nextFiles, filePath) ? String(nextFiles[filePath]) : null;
    receipt.changes.push({ action: change.action, path: filePath, reason: change.reason || '', beforeHash: before === null ? null : hash(before), afterHash: after === null ? null : hash(after), changed: before !== after });
  }
  receipt.status = receipt.changes.every(change => change.changed || change.action === 'delete') ? 'applied' : 'no-op-or-applied';
  receipt.finishedAt = new Date().toISOString();
  return { files: nextFiles, receipt };
}

export async function materializePatchedFileMap({ rootDir, files = {}, receipt = null, clean = false } = {}) {
  const root = path.resolve(rootDir);
  if (clean) await fs.rm(root, { recursive: true, force: true });
  await ensureDir(root);
  const written = [];
  for (const [relPath, content] of Object.entries(files)) {
    const full = safeOutputPath(root, relPath);
    await ensureDir(path.dirname(full));
    await fs.writeFile(full, String(content));
    written.push({ path: normalizePath(relPath), bytes: Buffer.byteLength(String(content)), hash: hash(String(content)) });
  }
  if (receipt) await fs.writeFile(path.join(root, '_task-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  return { rootDir: root, written };
}

export async function runIssuePatchLoop({ issues = [], files = {}, outDir = 'generated/task-receipts', artifactDir = 'generated/task-artifacts', maxIterations = 25, rootDir = process.cwd(), materialize = true } = {}) {
  const receipts = [];
  let currentFiles = { ...files };
  const bundles = buildPatchBundlesFromIssues(issues.slice(0, maxIterations), currentFiles);
  for (const bundle of bundles) {
    const result = applyPatchBundleToFileMap(currentFiles, bundle);
    currentFiles = result.files;
    receipts.push(result.receipt);
  }
  const outputRoot = path.isAbsolute(outDir) ? outDir : path.join(rootDir, outDir);
  await ensureDir(outputRoot);
  const run = {
    id: `patch_loop_${Date.now().toString(36)}_${hash({ issues, currentFiles }).slice(0, 8)}`,
    type: 'SKAI_PATCH_LOOP_RECEIPT',
    generatedAt: new Date().toISOString(),
    status: receipts.every(receipt => ['applied', 'no-op-or-applied'].includes(receipt.status)) ? 'completed' : 'needs-work',
    issues: issues.length,
    iterations: receipts.length,
    finalFileCount: Object.keys(currentFiles).length,
    finalFileMapHash: hash(currentFiles),
    receipts,
  };
  await fs.writeFile(path.join(outputRoot, `${run.id}.json`), `${JSON.stringify(run, null, 2)}\n`);
  let artifact = null;
  if (materialize) {
    const artifactRoot = path.isAbsolute(artifactDir) ? path.join(artifactDir, run.id) : path.join(rootDir, artifactDir, run.id);
    artifact = await materializePatchedFileMap({ rootDir: artifactRoot, files: currentFiles, receipt: run, clean: true });
    run.artifactDir = path.relative(rootDir, artifact.rootDir).replaceAll(path.sep, '/');
    await fs.writeFile(path.join(outputRoot, `${run.id}.json`), `${JSON.stringify(run, null, 2)}\n`);
  }
  return { run, files: currentFiles, outDir: path.relative(rootDir, outputRoot).replaceAll(path.sep, '/'), artifact };
}
