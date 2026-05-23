#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = '/workspaces/MetrAIyux-0S';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyevaultpro-backed-claims', stamp);
const latestPath = path.join(repoRoot, 'test-artifacts', 'skyevaultpro-backed-claims', 'latest-proof.json');
const stressRoot = path.join(os.tmpdir(), `skyevaultpro-bridge-stress-${stamp}`);
const sourceRoot = path.join(stressRoot, 'source');
const outRoot = path.join(stressRoot, 'out');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function parseJsonFromOutput(stdout) {
  const text = String(stdout || '').trim();
  for (let index = text.lastIndexOf('{'); index >= 0; index = text.lastIndexOf('{', index - 1)) {
    try {
      return JSON.parse(text.slice(index));
    } catch {}
  }
  throw new Error(`Could not parse JSON from command output: ${text.slice(-500)}`);
}

function runNpm(script, args = []) {
  const started = Date.now();
  const result = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64
  });
  const parsed = result.status === 0 ? parseJsonFromOutput(result.stdout) : null;
  return {
    command: `npm run ${script} -- ${args.join(' ')}`.trim(),
    status: result.status,
    durationMs: Date.now() - started,
    stdoutTail: String(result.stdout || '').slice(-1200),
    stderrTail: String(result.stderr || '').slice(-1200),
    parsed
  };
}

function makeStressSource() {
  fs.rmSync(stressRoot, { recursive: true, force: true });
  ensureDir(sourceRoot);
  let fileCount = 0;
  let byteCount = 0;
  for (let dirIndex = 0; dirIndex < 96; dirIndex += 1) {
    const dir = path.join(sourceRoot, `client-${String(dirIndex).padStart(3, '0')}`, 'docs');
    ensureDir(dir);
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const body = [
        `SkyeVault Pro stress file ${dirIndex}-${fileIndex}`,
        `created=${new Date(0).toISOString()}`,
        `payload=${'sovereign-local-copy '.repeat(24)}`,
        `hash-seed=${crypto.createHash('sha256').update(`${dirIndex}:${fileIndex}`).digest('hex')}`
      ].join('\n');
      const file = path.join(dir, `note-${String(fileIndex).padStart(2, '0')}.md`);
      fs.writeFileSync(file, body);
      fileCount += 1;
      byteCount += Buffer.byteLength(body);
    }
  }

  const publicAsset = path.join(sourceRoot, 'assets', 'real-logo-proof.svg');
  ensureDir(path.dirname(publicAsset));
  fs.writeFileSync(publicAsset, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#111"/><path d="M10 44 L32 8 L54 44 Z" fill="#f3d483"/></svg>\n');
  fileCount += 1;
  byteCount += fs.statSync(publicAsset).size;

  ensureDir(path.join(sourceRoot, 'config'));
  fs.writeFileSync(path.join(sourceRoot, '.env.local'), 'SHOULD_NOT_COPY=1\n');
  fs.writeFileSync(path.join(sourceRoot, 'config', 'secret-token.txt'), 'fake_secret_for_scanner=sk-testfake000000000000000000000000\n');
  fs.writeFileSync(path.join(sourceRoot, 'config', 'private-key.txt'), '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n');
  fs.writeFileSync(path.join(sourceRoot, 'archive.db'), 'skip me');

  return { expectedIncludedFiles: fileCount, expectedIncludedBytesAtLeast: byteCount, expectedSecretLikeExclusionsAtLeast: 2 };
}

function readManifest(out) {
  return JSON.parse(fs.readFileSync(path.join(out, '.skye-vault-manifest.json'), 'utf8'));
}

function validateManifest(manifest, expected) {
  const copiedSecretPaths = [
    '.env.local',
    'config/secret-token.txt',
    'config/private-key.txt',
    'archive.db'
  ].filter((rel) => fs.existsSync(path.join(manifest.destination, rel)));
  const sampled = manifest.files.slice(0, 12).map((item) => ({
    path: item.path,
    bytes: item.bytes,
    hashMatches: item.sha256 === sha256(path.join(manifest.destination, item.path))
  }));
  return {
    schemaOk: manifest.schema === 'skyevaultpro.local-import.v1',
    fileCountOk: manifest.fileCount === expected.expectedIncludedFiles,
    bytesOk: manifest.bytes >= expected.expectedIncludedBytesAtLeast,
    secretExclusionsOk: manifest.excludedSecretLikeFiles >= expected.expectedSecretLikeExclusionsAtLeast,
    copiedSecretPathCount: copiedSecretPaths.length,
    copiedSecretPathsOk: copiedSecretPaths.length === 0,
    sampledCount: sampled.length,
    sampledHashesOk: sampled.every((item) => item.hashMatches),
    importStepsMentionLocal: manifest.importSteps.join(' ').includes('local folder sync')
  };
}

function staticChecks() {
  const changelog = read('metraiyux_0s_site/changelog/index.html');
  const generatedChangelog = read('metraiyux_0s_site/cloudflare/generated-changelog-page.mjs');
  const ledger = read('LIVE_DEPLOYMENT_LEDGER.md');
  const architecture = read('docs/0S_APP_INTERCONNECT_ARCHITECTURE.md');
  const repoPush = read('SKYEVAULT_REPO_PUSH.md');
  const readme = read('metraiyux_0s_site/Free99/apps/skyevaultpro/README.md');
  const hostedBridge = read('metraiyux_0s_site/Free99/apps/skyevaultpro/assets/js/hosted-bridge.js');
  const backupFunction = read('metraiyux_0s_site/Free99/apps/skyevaultpro/netlify/functions/vault-backup.mjs');
  const worker = read('metraiyux_0s_site/cloudflare/worker.js');
  const bridge = read('metraiyux_0s_site/Free99/apps/skyevaultpro/assets/js/skye-docxmax-vault-bridge.js');

  return {
    oldDocxFolderDeleted: !fs.existsSync(path.join(repoRoot, 'metraiyux_0s_site/Free99/apps/skyevaultpro/apps/docx')),
    changelogMentionsDeletedRuntime: changelog.includes('deleted from the live SkyeVault Pro app tree'),
    generatedChangelogSynced: generatedChangelog.includes('deleted from the live SkyeVault Pro app tree'),
    ledgerMentionsLatestProof: ledger.includes('test-artifacts/skyevaultpro-docxmax-live/latest-live-browser-report.json'),
    architectureMentionsSingleRuntime: architecture.includes('The old SkyeVault Pro `apps/docx` runtime has been deleted'),
    repoPushMentionsLocalImport: repoPush.includes('SkyeVault Pro') && repoPush.includes('Import folder'),
    readmeMentionsNoAppGate: readme.includes('Do not add a SkyeVault-specific founder password'),
    backupAddonPriceInUi: hostedBridge.includes("priceLabel: '$4.99/mo'") && hostedBridge.includes('backupAddonActive()'),
    backupFunctionDefaultDenies: backupFunction.includes("SKYEVAULTPRO_HOSTED_BACKUP_ENABLED !== '1'") && backupFunction.includes('status: 402'),
    suiteEventsRequireGate: worker.includes("requireGateAuth(request, env, 'suite events')"),
    suiteEventsStoredSynchronously: worker.includes('await env.SITE_EVENTS_KV.put(key, JSON.stringify(event)'),
    legacyDocxRedirect: worker.includes('legacySkyeVaultProDocxRedirectResponse'),
    bridgeLoadedByCurrentEditor: bridge.includes('__SKYEDOCX_SKYEVAULT_BRIDGE__') && bridge.includes('saveEditorCommit')
  };
}

function assertAll(name, checks, failures) {
  for (const [key, value] of Object.entries(checks)) {
    if (typeof value === 'boolean' && value !== true) failures.push(`${name}:${key}`);
  }
}

async function main() {
  ensureDir(artifactDir);
  const report = {
    ok: false,
    startedAt: new Date().toISOString(),
    artifactDir,
    stressRoot,
    stress: {},
    staticChecks: {},
    failures: []
  };

  const expected = makeStressSource();
  const dryRun = runNpm('vault:pro:stage', ['--dry-run', '--source', sourceRoot, '--out', path.join(outRoot, 'dry-run')]);
  const stage = runNpm('vault:pro:stage', ['--source', sourceRoot, '--out', path.join(outRoot, 'stage')]);
  const fromDev = runNpm('vault:pro:from-dev', ['--source', sourceRoot, '--out', path.join(outRoot, 'from-dev')]);
  const latest = runNpm('vault:pro:stage:latest', ['--source', sourceRoot, '--out', path.join(outRoot, 'latest')]);

  report.stress.commands = { dryRun, stage, fromDev, latest };
  for (const [name, command] of Object.entries(report.stress.commands)) {
    if (command.status !== 0) report.failures.push(`stress-command:${name}`);
  }

  if (stage.status === 0 && fromDev.status === 0 && latest.status === 0) {
    const manifests = {
      stage: readManifest(path.join(outRoot, 'stage')),
      fromDev: readManifest(path.join(outRoot, 'from-dev')),
      latest: readManifest(path.join(outRoot, 'latest'))
    };
    report.stress.manifests = Object.fromEntries(Object.entries(manifests).map(([name, manifest]) => [name, {
      destination: manifest.destination,
      fileCount: manifest.fileCount,
      bytes: manifest.bytes,
      excludedSecretLikeFiles: manifest.excludedSecretLikeFiles,
      sampledFiles: manifest.files.slice(0, 5)
    }]));
    report.stress.validation = Object.fromEntries(Object.entries(manifests).map(([name, manifest]) => [name, validateManifest(manifest, expected)]));
    for (const [name, checks] of Object.entries(report.stress.validation)) assertAll(`stress:${name}`, checks, report.failures);
  }

  report.staticChecks = staticChecks();
  assertAll('static', report.staticChecks, report.failures);
  report.ok = report.failures.length === 0;
  report.finishedAt = new Date().toISOString();

  const reportPath = path.join(artifactDir, 'proof.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  ensureDir(path.dirname(latestPath));
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, reportPath, latestPath, failures: report.failures }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
