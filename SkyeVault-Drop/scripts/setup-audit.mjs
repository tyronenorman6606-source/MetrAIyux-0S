import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const required = [
  'internal-pages/setup.html',
  'public/assets/setup.js',
  'public/operator.html',
  'netlify/functions/setup-diagnostics.js',
  'netlify/functions/operator-session.js',
  'netlify/functions/operator-page.js',
  'docs/DEPLOYMENT_COMMAND_CENTER.md'
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing setup command center files: ${missing.join(', ')}`);
  process.exit(1);
}

const setupHtml = read('internal-pages/setup.html');
const setupJs = read('public/assets/setup.js');
const setupFn = read('netlify/functions/setup-diagnostics.js');
const operatorSession = read('netlify/functions/operator-session.js');
const operatorPage = read('netlify/functions/operator-page.js');
const readme = read('README.md');
const proof = read('docs/PROOF_LEDGER.md');
const netlifyToml = read('netlify.toml');

const checks = [
  ['setup page links setup.js', setupHtml.includes('/assets/setup.js')],
  ['setup page is served as protected internal page', !fs.existsSync(path.join(root, 'public/setup.html')) && operatorPage.includes('internal-pages/setup.html')],
  ['operator pages are routed through functions', netlifyToml.includes('operator-page?page=setup') && netlifyToml.includes('operator-page?page=admin')],
  ['operator login issues HttpOnly session cookie', operatorSession.includes('createOperatorSessionCookie') && read('netlify/functions/_lib/security.js').includes('HttpOnly')],
  ['setup page has checklist', setupHtml.includes('setupChecklist') && setupJs.includes('checklistItems')],
  ['setup page generates ADMIN_TOKEN', setupHtml.includes('ADMIN_TOKEN') && setupJs.includes('generateTokens')],
  ['setup page generates R2_CONFIG_JSON', setupHtml.includes('R2_CONFIG_JSON') || setupJs.includes('R2_CONFIG_JSON')],
  ['setup page includes notification env controls', setupHtml.includes('NOTIFY_WEBHOOK_URL') && setupJs.includes('NOTIFY_WEBHOOK_SECRET')],
  ['setup page has diagnostics controls', setupHtml.includes('runDiagnostics') && setupJs.includes('/api/setup-diagnostics')],
  ['diagnostics function requires admin token or operator session', setupFn.includes('requireAdmin(event)')],
  ['diagnostics does not return storage secrets', !setupFn.includes('r2SecretKey,') && setupFn.includes('R2 access key and secret are configured')],
  ['diagnostics can live-test R2 auth', setupFn.includes('getAccessToken') && setupFn.includes('getFolderMetadata')],
  ['README documents setup page', readme.includes('/setup.html')],
  ['proof ledger names setup command center', proof.toLowerCase().includes('deployment command center')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nSetup audit failed.');
  process.exit(1);
}

console.log('\n✅ Setup audit passed: protected deployment command center, env generator, diagnostics gate, notification controls, and docs are present.');
