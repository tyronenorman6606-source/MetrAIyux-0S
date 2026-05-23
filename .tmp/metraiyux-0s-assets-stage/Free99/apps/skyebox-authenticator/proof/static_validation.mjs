import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim()).filter(Boolean);
new vm.Script(app, { filename: 'app.js' });
for (const [index, script] of inlineScripts.entries()) {
  new vm.Script(script, { filename: `index.html:inline-script-${index + 1}.js` });
}
new vm.Script(sw, { filename: 'sw.js' });

const required = [
  'Content-Security-Policy',
  'changePasswordBtn',
  'wipeVaultBtn',
  'autoLockSelect',
  'copy-uri',
  'decryptVaultRecord',
  'changeMasterPassword',
  'accountToOtpUri',
  'scheduleClipboardClear',
  'skyebox-v3-encrypted-backup'
];
for (const token of required) {
  if (!(html + app).includes(token)) throw new Error(`Missing expected upgrade token: ${token}`);
}
if (/https?:\/\//i.test(html.replace(/otpauth:\/\/totp/g, ''))) throw new Error('Unexpected external http(s) reference in index.html');
if (!/^3\.0\.\d+$/.test(manifest.version)) throw new Error('Manifest version mismatch');
if (!sw.includes(`skyebox-auth-v${manifest.version}`)) throw new Error('Service worker cache not bumped');
console.log('static_validation: ok');
