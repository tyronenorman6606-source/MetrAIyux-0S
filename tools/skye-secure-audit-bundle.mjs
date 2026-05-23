#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { hashFile, utcStamp } from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skye-secure-audit');
const bundlePath = path.join(artifactRoot, `skye-secure-audit-bundle-${utcStamp()}.json`);
const markdownPath = path.join(artifactRoot, `skye-secure-auditor-packet-${utcStamp()}.md`);
const latestBundlePath = path.join(artifactRoot, 'latest-audit-bundle.json');
const latestMarkdownPath = path.join(artifactRoot, 'latest-auditor-packet.md');

const scopeFiles = [
  'package.json',
  'package-lock.json',
  'packages/skye-secure/package.json',
  'packages/skye-secure/skye-secure-core.mjs',
  'tools/skye-secure-packs.mjs',
  'tools/skye-secure-platform.mjs',
  'tools/skye-secure-audit-bundle.mjs',
  'tools/skyevault-repo-push.mjs',
  'tests/skye-secure-packs-smoke.mjs',
  'tests/skye-secure-unlocker-browser-proof.mjs',
  'tests/skye-secure-platform-proof.mjs',
  'metraiyux_0s_site/skye-secure-secret-packs.html',
  'metraiyux_0s_site/skye-secure-secret-packs/app.html',
  'metraiyux_0s_site/assets/skye-secure-app.js',
  'metraiyux_0s_site/skye-secure-platform/index.html',
  'metraiyux_0s_site/assets/skye-secure-platform.js',
  'docs/SKYE_SECURE_SECRET_PACKS.md',
  'docs/SKYE_SECURE_PLATFORM_PARITY.md',
  'docs/SKYE_SECURE_EXTERNAL_AUDIT_RFP.md'
];

const proofFiles = [
  'test-artifacts/skye-secure-e2e/proof-report.json',
  'test-artifacts/skye-secure-browser-proof/browser-report.json',
  'test-artifacts/skye-secure-platform-proof/platform-proof-report.json'
];

function run(name, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  return {
    name,
    command: [command, ...args],
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status,
    signal: result.signal,
    error: result.error?.message || '',
    stdout: result.stdout,
    stderr: result.stderr,
    ok: !result.error && result.status === 0
  };
}

function readJsonIfPresent(relativePath) {
  const file = path.join(repoRoot, relativePath);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function manifestFor(relativePaths) {
  const out = [];
  for (const relativePath of relativePaths) {
    const file = path.join(repoRoot, relativePath);
    if (!fs.existsSync(file)) {
      out.push({ path: relativePath, exists: false });
      continue;
    }
    const stat = fs.statSync(file);
    out.push({
      path: relativePath,
      exists: true,
      bytes: stat.size,
      sha256: await hashFile(file)
    });
  }
  return out;
}

function summarizeAudit(command) {
  try {
    const parsed = JSON.parse(command.stdout || '{}');
    return {
      ok: command.ok,
      vulnerabilities: parsed.metadata?.vulnerabilities || null,
      dependencies: parsed.metadata?.dependencies || null
    };
  } catch {
    return { ok: false, parseError: 'npm audit output was not JSON' };
  }
}

fs.mkdirSync(artifactRoot, { recursive: true });

const syntaxChecks = [
  run('node syntax: core', process.execPath, ['--check', 'packages/skye-secure/skye-secure-core.mjs']),
  run('node syntax: cli', process.execPath, ['--check', 'tools/skye-secure-packs.mjs']),
  run('node syntax: browser app', process.execPath, ['--check', 'metraiyux_0s_site/assets/skye-secure-app.js']),
  run('node syntax: platform cli', process.execPath, ['--check', 'tools/skye-secure-platform.mjs']),
  run('node syntax: platform app', process.execPath, ['--check', 'metraiyux_0s_site/assets/skye-secure-platform.js']),
  run('node syntax: cli proof', process.execPath, ['--check', 'tests/skye-secure-packs-smoke.mjs']),
  run('node syntax: browser proof', process.execPath, ['--check', 'tests/skye-secure-unlocker-browser-proof.mjs']),
  run('node syntax: platform proof', process.execPath, ['--check', 'tests/skye-secure-platform-proof.mjs'])
];
const npmAudit = run('npm audit: external dependency advisory database', 'npm', ['audit', '--json']);
const gitStatus = run('git status: audit scope', 'git', ['status', '--short', '--', ...scopeFiles]);

const proofReports = Object.fromEntries(proofFiles.map((relativePath) => [relativePath, readJsonIfPresent(relativePath)]));
const bundle = {
  schema: 'skye.secure.audit-bundle.v1',
  generatedAt: new Date().toISOString(),
  host: os.hostname(),
  repoRoot,
  product: 'SkyeSecure Secret Packs',
  independentThirdPartyCryptoAudit: {
    status: 'not-performed-by-codex',
    reason: 'A third-party cryptography audit requires an independent external auditor or firm to review the code and sign a report. This bundle prepares that handoff and records automated evidence without pretending to be independent signoff.',
    requiredBeforeClaimingAudited: true
  },
  automatedExternalChecks: {
    npmAudit: summarizeAudit(npmAudit)
  },
  sourceManifest: await manifestFor(scopeFiles),
  proofManifest: await manifestFor(proofFiles),
  proofReports,
  commands: {
    syntaxChecks,
    npmAudit,
    gitStatus
  },
  auditorReviewTargets: [
    'Confirm AES-GCM AAD, nonce generation, tag handling, and key separation.',
    'Confirm PBKDF2 parameters, pepper handling, and passphrase threat model.',
    'Confirm X25519 HKDF wrapping behavior and recipient metadata safety.',
    'Confirm public manifests cannot be modified without detection.',
    'Confirm ciphertext tamper and malicious payloads fail closed.',
    'Confirm browser and Node runtimes produce interoperable SKYESEC2 packs.',
    'Confirm restore path traversal protections and overwrite behavior.',
    'Confirm vault upload stores ciphertext only and does not expose plaintext values.',
    'Confirm platform inventory, search, policy, audit, offload, and reload flows do not expose plaintext values.',
    'Confirm revocation language and old-pack access limitations are visible to operators.'
  ]
};

const proofOk = Object.values(proofReports).every((item) => item?.ok === true);
const syntaxOk = syntaxChecks.every((item) => item.ok);
const npmAuditOk = bundle.automatedExternalChecks.npmAudit.vulnerabilities?.total === 0;
bundle.readiness = {
  automatedProofOk: proofOk && syntaxOk && npmAuditOk,
  syntaxOk,
  proofReportsOk: proofOk,
  npmAuditZeroKnownVulnerabilities: npmAuditOk,
  externalCryptoAuditStillRequired: true
};

const markdown = [
  '# SkyeSecure External Auditor Packet',
  '',
  `Generated: ${bundle.generatedAt}`,
  `Bundle: \`${bundlePath}\``,
  '',
  '## Status',
  '',
  `- Automated proof ok: ${bundle.readiness.automatedProofOk ? 'yes' : 'no'}`,
  `- Syntax checks ok: ${bundle.readiness.syntaxOk ? 'yes' : 'no'}`,
  `- Proof reports ok: ${bundle.readiness.proofReportsOk ? 'yes' : 'no'}`,
  `- npm audit known vulnerabilities: ${bundle.automatedExternalChecks.npmAudit.vulnerabilities?.total ?? 'unknown'}`,
  '- Independent third-party cryptography audit: not performed inside Codex; external signoff required before audited claims.',
  '',
  '## Scope',
  '',
  ...bundle.sourceManifest.map((item) => `- \`${item.path}\` ${item.exists ? `${item.bytes} bytes ${item.sha256}` : 'missing'}`),
  '',
  '## Proof Reports',
  '',
  ...bundle.proofManifest.map((item) => `- \`${item.path}\` ${item.exists ? `${item.bytes} bytes ${item.sha256}` : 'missing'}`),
  '',
  '## Auditor Review Targets',
  '',
  ...bundle.auditorReviewTargets.map((item) => `- ${item}`),
  '',
  '## Signoff Boundary',
  '',
  'This packet is audit-ready evidence, not an independent audit report. A real third-party auditor must review the source, threat model, tests, and generated artifacts, then issue their own report.'
].join('\n');

fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
fs.writeFileSync(markdownPath, `${markdown}\n`);
fs.copyFileSync(bundlePath, latestBundlePath);
fs.copyFileSync(markdownPath, latestMarkdownPath);

console.log(JSON.stringify({
  ok: true,
  bundlePath,
  markdownPath,
  latestBundlePath,
  latestMarkdownPath,
  readiness: bundle.readiness
}, null, 2));
