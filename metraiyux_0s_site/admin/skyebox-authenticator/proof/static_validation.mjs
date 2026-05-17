import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error('Inline app script missing');
new vm.Script(script, { filename: 'index.html:inline-script.js' });
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
  if (!html.includes(token)) throw new Error(`Missing expected upgrade token: ${token}`);
}
if (/https?:\/\//i.test(html.replace(/otpauth:\/\/totp/g, ''))) throw new Error('Unexpected external http(s) reference in index.html');
if (manifest.version !== '3.0.0') throw new Error('Manifest version mismatch');
if (!sw.includes('skyebox-auth-v3.0.0')) throw new Error('Service worker cache not bumped');
console.log('static_validation: ok');
