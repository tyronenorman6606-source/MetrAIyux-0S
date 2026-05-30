const fs = require('fs');
const { fail, ok, repoPath, readJson } = require('./lib');
const releaseArtifacts = readJson(repoPath('artifacts','release-artifacts.json'));
const contractProof = readJson(repoPath('artifacts','contract-proof.json'));
const liveProof = readJson(repoPath('artifacts','live-proof','manifest.json'));
const portalTargets = readJson(repoPath('artifacts','production-lanes','portal-targets.json'));
const pkg = readJson(repoPath('package.json'));
const currentVersion = pkg.version;
const issues = [];
const txt = JSON.stringify(releaseArtifacts);
if ((releaseArtifacts.production_lanes?.checkout?.provider || '').includes('mock')) issues.push('production-lanes-mock-provider');
if (txt.includes('/tmp/super250') || txt.includes('/tmp/super260') || txt.includes('/tmp/super320') || txt.includes('mock-stripe') || txt.includes('http-dom-driver')) issues.push('stale-temp-or-provider');
for (const bad of ['"version": "2.4.3"','"version": "2.6.0"','"version": "3.0.0"','"version": "3.1.0"','"version": "3.2.0"','"version": "3.3.0"','"version": "3.6.0"','"version": "3.7.0"']) { if (txt.includes(bad)) issues.push('stale-version-residue'); }
if (contractProof.ok !== true || (contractProof.checks_failed || 0) !== 0) issues.push('contract-proof-failures');
for (const file of fs.readdirSync(repoPath())) {
  if (/^CURRENT_(DIRECTIVE|COMPLETION_STATUS)_.*\.md$/.test(file) && !file.includes(currentVersion)) issues.push('stale-root-directives');
}
if (fs.existsSync(repoPath('artifacts','portal-automation','debug'))) issues.push('portal-debug-dir');
if (fs.existsSync(repoPath('artifacts','production-lanes'))) {
  for (const file of fs.readdirSync(repoPath('artifacts','production-lanes'))) {
    if (/^production-pass-.*\.json$/.test(file)) issues.push('stale-production-pass');
  }
}
const targetText = JSON.stringify(portalTargets);
if (targetText.includes('127.0.0.1') || targetText.includes('localhost') || targetText.includes('"target_mode":"local"') || targetText.includes('"secure":false')) issues.push('primary-portal-targets-not-external');
if (!liveProof.ok || liveProof.stripe?.provider !== 'stripe' || liveProof.stripe?.webhook_ready !== true) issues.push('live-proof-stripe-not-webhook-ready');
if (Object.values(liveProof.channels || {}).some((entry) => !entry.ok || entry.target_mode !== 'external' || entry.secure !== true)) issues.push('live-proof-channel-not-external-secure');
if (issues.length) fail(`[artifact-freshness] FAIL :: ${Array.from(new Set(issues)).join(', ')}`);
ok('[artifact-freshness] PASS');
