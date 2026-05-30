import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const appRoot = path.join(repoRoot, 'metraiyux_0s_site', 'Marketing-Made-Easy', 'SkyeDocxBlog');

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
}

for (const file of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest']) {
  assert.equal(fs.existsSync(path.join(appRoot, file)), true, `missing SkyeDocx Blog file: ${file}`);
}

const index = read('index.html');
const app = read('app.js');
const os = fs.readFileSync(path.join(repoRoot, 'metraiyux_0s_site', '0s', 'os.js'), 'utf8');
const deploy = fs.readFileSync(path.join(repoRoot, 'scripts', 'deploy-0s-worker.mjs'), 'utf8');
const marketing = fs.readFileSync(path.join(repoRoot, 'metraiyux_0s_site', 'Marketing-Made-Easy', 'index.html'), 'utf8');
const editor = fs.readFileSync(path.join(repoRoot, 'metraiyux_0s_site', 'Marketing-Made-Easy', 'SkyeDocxMax', 'editor.html'), 'utf8');
const skyewayBuilder = fs.readFileSync(path.join(repoRoot, 'tools', 'build-skyeway-routes.mjs'), 'utf8');

assert.match(index, /Free99\/free99-gate\.js/);
assert.match(index, /data-platform-id="skyedocx-blog"/);
assert.match(app, /zeroos\.skyedocx_blog\.package\.v1/);
assert.match(app, /source: 'superide-skyeblog-promoted-to-0s'/);
assert.match(app, /provider-free local package builder/);
assert.match(app, /skye\.blog\.bridgeDraft/);
assert.doesNotMatch(index + app, /openai|anthropic|gemini|elevenlabs|stability|api[_-]?key|provider token|stripe secret/i);
assert.match(os, /id: "skyedocx-blog"/);
assert.match(marketing, /data-module-id="skyedocx-blog"/);
assert.match(deploy, /Marketing-Made-Easy\/SkyeDocxBlog/);
assert.match(editor, /Marketing-Made-Easy\/SkyeDocxBlog\/index\.html/);
assert.match(skyewayBuilder, /DeVisional\(\?:%20\| \)Riftx/);

console.log(JSON.stringify({
  ok: true,
  surface: 'Marketing-Made-Easy/SkyeDocxBlog',
  source: 'SuperIDE SkyeBlog lane promoted into 0S',
  auth_owner: 'FS27/SkyGate/Free99 shared gate',
  provider_boundary: 'provider-free local package builder'
}, null, 2));
