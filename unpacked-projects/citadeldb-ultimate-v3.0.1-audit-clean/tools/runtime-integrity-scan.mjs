
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const proofDir = join(root, 'proof');
mkdirSync(proofDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const outPath = join(proofDir, `runtime-integrity-${stamp}.json`);

const skipDirs = new Set(['node_modules', '.git', 'dist', '.next']);
const codeExts = new Set(['.mjs', '.js']);
const publicClaimRoots = ['README.md', 'site/', 'claims/', 'release/', 'docs/'];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const rel = relative(root, path);
    if (skipDirs.has(entry)) continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function ext(path) {
  const m = path.match(/(\.[^.]+)$/);
  return m ? m[1] : '';
}

function isPublicClaimSurface(file) {
  return publicClaimRoots.some(prefix => file === prefix.replace('/', '') || file.startsWith(prefix));
}

function isScannerOrProofTool(file) {
  return file.includes('runtime-integrity-scan') || file.includes('hard-proof-truth-scan') || file.startsWith('proof/');
}

const files = walk(root);
const codeFiles = files.filter(f => codeExts.has(ext(f)));
const results = [];

for (const file of codeFiles) {
  const rel = relative(root, file);
  const proc = spawnSync('node', ['--check', file], { encoding: 'utf8' });
  results.push({
    type: 'node_syntax',
    file: rel,
    ok: proc.status === 0,
    stdout: proc.stdout,
    stderr: proc.stderr
  });
}

const textFiles = files.filter(f => ['.md', '.mjs', '.js', '.json', '.html', '.txt', '.sh'].includes(ext(f)));
const allText = Object.fromEntries(textFiles.map(f => {
  try { return [relative(root, f), readFileSync(f, 'utf8')]; }
  catch { return [relative(root, f), '']; }
}));

const requiredSnippets = [
  { key: 'gateway_raw_body_capture', file: 'control-plane/gateway/src/server.mjs', snippet: 'req.rawBody' },
  { key: 'protected_routes_module', file: 'control-plane/gateway/src/protectedRoutes.mjs', snippet: 'protectedRoutes' },
  { key: 'sql_paid_guard', file: 'control-plane/gateway/src/server.mjs', snippet: "self_service_sql_execute" },
  { key: 'table_list_paid_guard', file: 'control-plane/gateway/src/server.mjs', snippet: "table_browser_list" },
  { key: 'table_preview_paid_guard', file: 'control-plane/gateway/src/server.mjs', snippet: "table_browser_preview" },
  { key: 'branch_request_paid_guard', file: 'control-plane/gateway/src/server.mjs', snippet: "branch_request" },
  { key: 'branch_clone_worker', file: 'tools/branch-clone-worker.sh', snippet: 'pg_dump' },
  { key: 'overclaim_audit', file: 'OVERCLAIM_AUDIT.md', snippet: 'Banned public claim' }
];

for (const item of requiredSnippets) {
  const txt = allText[item.file] || '';
  results.push({
    type: 'required_snippet',
    key: item.key,
    file: item.file,
    ok: txt.includes(item.snippet),
    snippet: item.snippet
  });
}

const bannedRegexSources = [
  'CitadelDB is better than Neon',
  'CitadelDB is fully better than Neon',
  'Neon replacement complete',
  'fully hosted Neon replacement',
  'full Neon parity'
];

for (const [file, txt] of Object.entries(allText)) {
  if (!isPublicClaimSurface(file) || isScannerOrProofTool(file)) continue;
  for (const source of bannedRegexSources) {
    if (txt.toLowerCase().includes(source.toLowerCase())) {
      results.push({ type: 'banned_claim', file, ok: false, phrase: source });
    }
  }
}

const placeholderSources = ['TODO_FAKE', 'mock success', 'fake success', 'pretend'];
const placeholderFailures = new Set(['control-plane/gateway/src/server.mjs', 'operator-dashboard/server.mjs', 'site/build.mjs']);

for (const [file, txt] of Object.entries(allText)) {
  if (isScannerOrProofTool(file)) continue;
  for (const phrase of placeholderSources) {
    if (txt.toLowerCase().includes(phrase.toLowerCase())) {
      results.push({
        type: placeholderFailures.has(file) ? 'placeholder_failure' : 'placeholder_notice',
        file,
        ok: placeholderFailures.has(file) ? false : true,
        phrase
      });
    }
  }
}

const ok = results.every(r => r.ok !== false);
const report = {
  ok,
  generatedAt: new Date().toISOString(),
  counts: {
    files: files.length,
    codeFiles: codeFiles.length,
    checks: results.length,
    failed: results.filter(r => r.ok === false).length
  },
  failed: results.filter(r => r.ok === false),
  results
};

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: relative(root, outPath), counts: report.counts, failed: report.failed.slice(0, 50) }, null, 2));

process.exit(ok ? 0 : 1);
