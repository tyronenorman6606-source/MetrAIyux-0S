
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const { buildPortalPlan, runPortalAutomation } = require('../platform/portal-automation');
const { createSubmissionJob } = require('../platform/submission-adapters');
const { repoPath, fail, ok, writeJson } = require('./lib');

(async () => {
  const child = spawn('node', [repoPath('scripts','start-ui-bridge-stack.js')], { cwd: repoPath(), stdio: ['ignore','pipe','pipe'] });
  const rl = readline.createInterface({ input: child.stdout });
  const firstLine = await new Promise((resolve, reject) => {
    rl.once('line', resolve);
    child.once('error', reject);
    child.stderr.on('data', (chunk) => { const text = String(chunk || ''); if (text.trim()) process.stderr.write(text); });
  });
  const stack = JSON.parse(firstLine);
  const pkg = repoPath('artifacts','retailer-packages','skydocx','sovereign-author-publishing-os-apple-ready.zip');
  const job = createSubmissionJob({ channel:'apple_books', package_path:pkg, title:'Sovereign Author Publishing OS', slug:'sovereign-author-publishing-os', metadata:{ operator:'Skyes Over London', portal_password:'portal-test-password' } });
  const plan = buildPortalPlan(job, { endpoint:`http://127.0.0.1:${stack.echo_port}/apple_books` });
  if (!plan.steps || plan.steps.length < 10 || !plan.profile || !plan.profile.selectors) fail('[portal-automation] FAIL :: plan');
  const receipt = await runPortalAutomation(plan, { outputDir: repoPath('artifacts','portal-automation','test-run') });
  if (!receipt.ok || !receipt.remote_reference || receipt.step_count < 10 || !receipt.screenshots.length) fail('[portal-automation] FAIL :: receipt');
  if (receipt.browser_engine !== 'playwright-chromium' || receipt.proof_mode !== 'playwright-browser-local-bridge') fail('[portal-automation] FAIL :: engine');
  const stat = fs.statSync(receipt.screenshots[0]);
  if (stat.size < 1000) fail('[portal-automation] FAIL :: screenshot-too-small');
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', () => resolve()));
  writeJson(repoPath('artifacts','portal-automation','manifest.json'), { ok:true, version:'3.8.0', channel:plan.channel, remote_reference:receipt.remote_reference, remote_status:receipt.remote_status, screenshots:receipt.screenshots.length, step_count:receipt.step_count, browser_engine:receipt.browser_engine, proof_mode:receipt.proof_mode, dom_path:receipt.dom_path });
  ok('[portal-automation] PASS');
})().catch((error) => fail(error.stack || error.message));
