import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const appRoot = path.join(siteRoot, 'founder-command', 'apps', '0s-calendar');
const rawSuperideRoot = path.join(siteRoot, 'DeVisional Riftx', 'public', 'SkyeCalendar');

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
}

for (const file of ['index.html', 'manifest.webmanifest', 'partials/superide-calendar-background.css']) {
  assert.equal(fs.existsSync(path.join(appRoot, file)), true, `missing 0S Calendar file: ${file}`);
}
for (const removedNativeFile of ['app.js', 'styles.css']) {
  assert.equal(fs.existsSync(path.join(appRoot, removedNativeFile)), false, `old native substitute file should not remain: ${removedNativeFile}`);
}
assert.equal(fs.existsSync(path.join(rawSuperideRoot, 'index.html')), true, 'missing raw copied SuperIDE SkyeCalendar source');

const index = read('index.html');
const partial = read('partials/superide-calendar-background.css');
const rawSuperide = fs.readFileSync(path.join(rawSuperideRoot, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(siteRoot, 'cloudflare', 'worker.js'), 'utf8');
const founderApp = fs.readFileSync(path.join(siteRoot, 'founder-command', 'app.js'), 'utf8');
const founderIndex = fs.readFileSync(path.join(siteRoot, 'founder-command', 'index.html'), 'utf8');
const os = fs.readFileSync(path.join(siteRoot, '0s', 'os.js'), 'utf8');
const pkg = fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8');

assert.match(rawSuperide, /SkyeCalendar Command Surface/);
assert.match(rawSuperide, /\/_shared\/standalone-session\.js/);
assert.match(index, /Free99\/free99-gate\.js/);
assert.match(index, /data-platform-id="founder-command-0s-calendar"/);
assert.match(index, /data-source="superidev3-skye-calendar-copied"/);
assert.match(index, /SuperIDE SkyeCalendar Command Surface/);
assert.match(index, /Dependency Timeline/);
assert.match(index, /Workload Heatmap/);
assert.match(index, /Reminder Audit Trail/);
assert.match(index, /detectConflicts/);
assert.match(index, /Export ICS/);
assert.match(index, /\/api\/founder-command\/calendar/);
assert.match(index, /\/api\/founder-command\/status/);
assert.match(index, /Music Drops/);
assert.match(index, /BEGIN:VCALENDAR/);
assert.match(index, /METRAIYUX_GATE_SESSION/);
assert.match(index, /superide-skyecalendar/);
assert.match(partial, /skyes-over-london-deity-logo\.png/);
assert.match(partial, /metraiyux-0s-logo-transparent\.png/);
assert.doesNotMatch(index, /\/_shared\/auth-unlock\.js|\/_shared\/standalone-session\.js|fonts\.googleapis|fonts\.gstatic/i);
assert.doesNotMatch(index, /openai|anthropic|gemini|elevenlabs|stability|api[_-]?key|provider token|stripe secret/i);
assert.match(worker, /founder-command\/apps\/0s-calendar/);
assert.match(worker, /core-0s-calendar/);
assert.match(worker, /SuperIDE SkyeCalendar/);
assert.match(founderApp, /core-0s-calendar/);
assert.match(founderApp, /SuperIDE SkyeCalendar/);
assert.match(founderIndex, /Open SuperIDE SkyeCalendar/);
assert.match(os, /id: "founder-calendar"/);
assert.match(os, /SuperIDE SkyeCalendar/);
assert.match(pkg, /0s:calendar:proof/);

console.log(JSON.stringify({
  ok: true,
  surface: 'founder-command/apps/0s-calendar',
  source: 'SuperIDEv3 public/SkyeCalendar copied source',
  source_of_truth: '/api/founder-command/calendar',
  sync_engine: 'SuperIDE calendar with 0S ledger adapter, local shadow sync, and ICS export',
  auth_owner: 'FS27/SkyGate/Free99 shared gate'
}, null, 2));
