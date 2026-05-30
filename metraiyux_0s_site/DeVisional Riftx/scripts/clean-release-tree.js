const fs = require('fs');
const path = require('path');
const { repoPath, ok } = require('./lib');
const pkg = JSON.parse(fs.readFileSync(repoPath('package.json'), 'utf8'));
const keepVersion = pkg.version;
for (const file of fs.readdirSync(repoPath())) {
  if (/^CURRENT_(DIRECTIVE|COMPLETION_STATUS)_.*\.md$/.test(file) && !file.includes(keepVersion)) {
    fs.rmSync(repoPath(file), { force:true });
  }
}
const docsDir = repoPath('docs');
if (fs.existsSync(docsDir)) {
  for (const file of fs.readdirSync(docsDir)) {
    if (/SUPERIDEV2_SOVEREIGN_AUTHOR_.*_(DIRECTIVE|COMPLETION_STATUS|PROOF_AND_VALUATION)_.*\.md$/.test(file) && !file.includes(keepVersion)) {
      fs.rmSync(path.join(docsDir, file), { force:true });
    }
  }
}
for (const dir of ['artifacts/portal-automation','artifacts/production-lanes','artifacts/ui-smoke','artifacts/live-proof']) {
  fs.rmSync(repoPath(dir), { recursive:true, force:true });
  fs.mkdirSync(repoPath(dir), { recursive:true });
}
for (const dir of ['artifacts/runtime']) {
  fs.rmSync(repoPath(dir), { recursive:true, force:true });
}
for (const file of fs.readdirSync(repoPath('artifacts'))) {
  if (/^production-pass-.*\.json$/.test(file)) fs.rmSync(repoPath('artifacts', file), { force:true });
}
ok('[clean-release-tree] PASS');
