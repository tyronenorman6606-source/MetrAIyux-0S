#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-netlify-parity');
const latestReceipt = path.join(artifactRoot, 'skyenet-netlify-parity-live-http-latest.json');
const fixtureRoot = path.join(repoRoot, 'tmp', 'skyenet-parity-proof');
const publicDir = path.join(fixtureRoot, 'dist');
const projectId = process.env.SKYENET_PARITY_PROJECT || 'skynet-parity-proof';
const workspaceId = process.env.SKYENET_PARITY_WORKSPACE || 'founder-skynet-parity';
const planName = process.env.SKYENET_PARITY_PLAN || 'skyenet-functions-managed';
const host = process.env.SKYENET_PARITY_HOST || 'skyenet.graylondonskyes.workers.dev';
const mount = process.env.SKYENET_PARITY_MOUNT || `/${projectId}`;
const secretProofValue = `proof-secret-${Date.now()}`;

const credentialKeys = [
  'ZERO_OS_GATE_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATEFS13_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

async function readEnvFile(file) {
  if (!file || !existsSync(file)) return {};
  const rows = {};
  const text = await fs.readFile(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function expandEnvRefs(values) {
  const out = { ...values };
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [key, value] of Object.entries(out)) {
      out[key] = String(value || '').replace(/\$\{([A-Z0-9_]+)\}/g, (_match, ref) => out[ref] || '');
    }
  }
  return out;
}

async function ownerCredential() {
  const files = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean).map((file) => path.resolve(file));
  let merged = { ...process.env };
  for (const file of files) Object.assign(merged, await readEnvFile(file));
  merged = expandEnvRefs(merged);
  for (const key of credentialKeys) {
    if (merged[key]) return { key, value: merged[key] };
  }
  return { key: '', value: '' };
}

function authHeaders(token) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function fetchText(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const text = await response.text().catch(() => '');
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: response.headers.get('content-type') || '',
    location: response.headers.get('location') || '',
    text
  };
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, init);
  let body = {};
  try { body = result.text ? JSON.parse(result.text) : {}; } catch { body = { text: result.text }; }
  return { ...result, body };
}

function hasAll(text, needles) {
  return needles.every((needle) => String(text || '').includes(needle));
}

function scrub(text, token) {
  const value = String(text || '');
  return token ? value.split(token).join('[redacted-token]') : value;
}

async function writeFixture() {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(publicDir, 'assets'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'netlify', 'functions'), { recursive: true });
  await fs.writeFile(path.join(publicDir, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SkyeNet parity proof</title>
    <link rel="stylesheet" href="assets/app.css">
  </head>
  <body>
    <main>
      <p>SkyeNet parity proof</p>
      <h1>Public bundle is live on SkyeNet</h1>
      <p>The full project source stays private until an account-scoped download or transfer is approved.</p>
      <script src="assets/app.js" type="module"></script>
    </main>
  </body>
</html>
`);
  await fs.writeFile(path.join(publicDir, 'assets', 'app.css'), `body{font-family:system-ui,sans-serif;margin:0;background:#101820;color:#f6f1e8}main{max-width:760px;margin:0 auto;padding:72px 24px}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.02}p{font-size:1.05rem;color:#d8e1df}`);
  await fs.writeFile(path.join(publicDir, 'assets', 'app.js'), `document.documentElement.dataset.skynetParityProof = "public-bundle";\n`);
  await fs.writeFile(path.join(fixtureRoot, 'package.json'), `${JSON.stringify({
    name: 'skynet-parity-proof',
    private: true,
    scripts: {
      build: 'echo build handled before upload',
      'skyenet:deploy': 'npm run build && npm run skyenet:deploy -- --dir dist --source-root .'
    },
    dependencies: {
      '@skyenet/runtime': 'workspace:*'
    }
  }, null, 2)}\n`);
  await fs.writeFile(path.join(fixtureRoot, 'src', 'main.js'), `export const sourceCustody = "private-full-project-package";\n`);
  await fs.writeFile(path.join(fixtureRoot, 'netlify', 'functions', 'hello.mjs'), `export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, runtime: "skyenet-functions-managed" })
  };
}
`);
  await fs.writeFile(path.join(fixtureRoot, 'README.md'), `# SkyeNet parity proof

This file proves private full-project source custody through SkyeNet source downloads.
`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      shell: false
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      resolve({
        code,
        stdout: scrub(stdout, options.token),
        stderr: scrub(stderr, options.token),
        elapsed_ms: Number((performance.now() - started).toFixed(2))
      });
    });
  });
}

function parseLastJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const start = trimmed.lastIndexOf('\n{');
  const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try { return JSON.parse(jsonText); } catch { return null; }
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const credential = await ownerCredential();
  const receipt = {
    schema: 'skyenet.netlify-parity.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    base: { zero_os: zeroOsBase, skynet: skynetBase },
    target: { workspace_id: workspaceId, project_id: projectId, plan_name: planName, host, mount },
    credential_source: credential.key || 'missing',
    fixture: null,
    unauth_env: null,
    login: null,
    public_static: null,
    console: null,
    publish_guide: null,
    status: null,
    env_write: null,
    env_list: null,
    deploy: null,
    public_assets: null,
    source_download: null,
    public_source_exposure: null,
    links: {
      skynet_home: `${skynetBase}/`,
      skynet_console: `${skynetBase}/console`,
      skynet_publish: `${skynetBase}/publish/`,
      live_app: `${skynetBase}${mount}/`
    },
    failures: []
  };

  await writeFixture();
  receipt.fixture = {
    root: path.relative(repoRoot, fixtureRoot),
    public_dir: path.relative(repoRoot, publicDir),
    private_source_files_expected: ['package.json', 'src/main.js', 'netlify/functions/hello.mjs', 'README.md'],
    public_files_expected: ['index.html', 'assets/app.css', 'assets/app.js']
  };

  const unauthEnv = await fetchJson(`${skynetBase}/api/skyenet/env?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}`);
  receipt.unauth_env = {
    status: unauthEnv.status,
    ok: unauthEnv.status === 401 || unauthEnv.status === 403,
    code: unauthEnv.body?.code || '',
    elapsed_ms: unauthEnv.elapsed_ms
  };
  if (!receipt.unauth_env.ok) receipt.failures.push('Unauthenticated env registry request was not rejected.');

  if (!credential.value) {
    receipt.failures.push('No shared owner gate credential found in process env, .env, or env.txt.');
  } else {
    const login = await fetchJson(`${zeroOsBase}/api/founder-command/login`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ code: credential.value })
    });
    const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
    receipt.login = {
      status: login.status,
      ok: Boolean(login.ok && token),
      token_received: Boolean(token),
      elapsed_ms: login.elapsed_ms
    };
    if (!token) {
      receipt.failures.push(login.body?.error || 'Shared gate login did not return a bearer token.');
    } else {
      const consoleCheck = await fetchText(`${skynetBase}/console`);
      receipt.console = {
        status: consoleCheck.status,
        ok: consoleCheck.status === 200 && hasAll(consoleCheck.text, ['Publish package', 'public_files', 'source_files', 'Environment variables', 'Source custody', 'private full project source package']),
        elapsed_ms: consoleCheck.elapsed_ms,
        content_type: consoleCheck.content_type
      };
      const publishCheck = await fetchText(`${skynetBase}/publish/`);
      receipt.publish_guide = {
        status: publishCheck.status,
        ok: publishCheck.status === 200 && hasAll(publishCheck.text, ['--source-root', 'private full project source package', 'Environment variables']),
        elapsed_ms: publishCheck.elapsed_ms,
        content_type: publishCheck.content_type
      };

      const query = new URLSearchParams({ workspace_id: workspaceId, project_id: projectId });
      const status = await fetchJson(`${skynetBase}/api/skyenet/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
        headers: authHeaders(token)
      });
      receipt.status = {
        status: status.status,
        ok: Boolean(status.ok && (status.body?.ok !== false)),
        service: status.body?.service || status.body?.skynet?.service || '',
        capabilities: status.body?.capabilities || status.body?.skynet?.capabilities || {},
        elapsed_ms: status.elapsed_ms
      };

      const envWrite = await fetchJson(`${skynetBase}/api/skyenet/env`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          key: 'SKYENET_PARITY_SECRET',
          value: secretProofValue,
          scope: 'production'
        })
      });
      receipt.env_write = {
        status: envWrite.status,
        ok: Boolean(envWrite.ok && envWrite.body?.ok !== false),
        key: envWrite.body?.env?.key || '',
        redacted: envWrite.body?.env?.value || '',
        has_raw_secret: JSON.stringify(envWrite.body).includes(secretProofValue),
        elapsed_ms: envWrite.elapsed_ms
      };

      const envList = await fetchJson(`${skynetBase}/api/skyenet/env?${query.toString()}`, {
        headers: authHeaders(token)
      });
      const envBody = JSON.stringify(envList.body || {});
      const envItems = envList.body?.env || envList.body?.skynet?.env || [];
      receipt.env_list = {
        status: envList.status,
        ok: Boolean(envList.ok && envList.body?.ok !== false),
        count: Array.isArray(envItems) ? envItems.length : 0,
        has_key: Array.isArray(envItems) && envItems.some((item) => item?.key === 'SKYENET_PARITY_SECRET'),
        raw_secret_exposed: envBody.includes(secretProofValue),
        elapsed_ms: envList.elapsed_ms
      };

      const deploy = await runCommand('npm', [
        'run',
        'skyenet:deploy',
        '--',
        '--dir', publicDir,
        '--source-root', fixtureRoot,
        '--project', projectId,
        '--workspace', workspaceId,
        '--plan', planName,
        '--host', host,
        '--mount', mount,
        '--public',
        '--concurrency', '4'
      ], {
        env: { ...process.env, SKYENET_AUTH: token },
        token
      });
      const deployJson = parseLastJson(deploy.stdout);
      receipt.deploy = {
        code: deploy.code,
        ok: deploy.code === 0 && deployJson?.ok === true && deployJson?.private_source_package?.uploaded === true,
        elapsed_ms: deploy.elapsed_ms,
        stdout_json: deployJson,
        stderr_sample: deploy.stderr.slice(-1200)
      };

      const deploymentId = deployJson?.deployment_id || '';
      const liveUrl = deployJson?.live_url || `${skynetBase}${mount}/`;
      receipt.links.live_app = liveUrl;
      receipt.links.source_download = deploymentId
        ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`
        : '';

      const publicStatic = await fetchText(liveUrl);
      receipt.public_static = {
        url: liveUrl,
        status: publicStatic.status,
        ok: publicStatic.status === 200 && hasAll(publicStatic.text, ['SkyeNet parity proof', 'Public bundle is live on SkyeNet']),
        content_type: publicStatic.content_type,
        elapsed_ms: publicStatic.elapsed_ms
      };

      const assetUrls = [
        new URL('assets/app.css', liveUrl).toString(),
        new URL('assets/app.js', liveUrl).toString()
      ];
      const assetChecks = [];
      for (const assetUrl of assetUrls) {
        const asset = await fetchText(assetUrl);
        assetChecks.push({
          url: assetUrl,
          status: asset.status,
          ok: asset.status === 200,
          content_type: asset.content_type,
          elapsed_ms: asset.elapsed_ms
        });
      }
      receipt.public_assets = {
        ok: assetChecks.every((asset) => asset.ok),
        checks: assetChecks
      };

      if (deploymentId) {
        const sourceUrl = receipt.links.source_download;
        const started = performance.now();
        const response = await fetch(sourceUrl, { headers: authHeaders(token), redirect: 'manual' });
        const bytes = Buffer.from(await response.arrayBuffer());
        const bodyText = bytes.toString('utf8');
        receipt.source_download = {
          url: sourceUrl,
          status: response.status,
          ok: response.ok
            && response.headers.get('content-type') === 'application/x-tar'
            && hasAll(bodyText, ['.skyenet/source-manifest.json', 'package.json', 'src/main.js', 'netlify/functions/hello.mjs', 'README.md']),
          content_type: response.headers.get('content-type') || '',
          source_mode_header: response.headers.get('x-skynet-source-mode') || '',
          bytes: bytes.byteLength,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          checks: {
            has_manifest: bodyText.includes('.skyenet/source-manifest.json'),
            has_package_json: bodyText.includes('package.json'),
            has_src_main: bodyText.includes('src/main.js'),
            has_netlify_function: bodyText.includes('netlify/functions/hello.mjs'),
            has_public_index: bodyText.includes('index.html')
          },
          elapsed_ms: Number((performance.now() - started).toFixed(2))
        };

        const exposedUrl = `${skynetBase}${mount}/netlify/functions/hello.mjs`;
        const exposure = await fetchText(exposedUrl);
        receipt.public_source_exposure = {
          url: exposedUrl,
          status: exposure.status,
          ok: exposure.status !== 200 && !exposure.text.includes('skyenet-functions-managed'),
          elapsed_ms: exposure.elapsed_ms,
          content_type: exposure.content_type
        };
      }

      const caps = receipt.status.capabilities || {};
      if (!receipt.console.ok) receipt.failures.push('SkyeNet console did not show env/private source controls.');
      if (!receipt.publish_guide.ok) receipt.failures.push('SkyeNet publish guide did not show source-root/env copy.');
      if (!receipt.status.ok || caps.private_full_project_source_packages !== true) receipt.failures.push('SkyeNet status did not advertise private full project packages.');
      if (caps.env_variable_registry !== true) receipt.failures.push('SkyeNet status did not advertise env variable registry.');
      if (!receipt.env_write.ok || receipt.env_write.has_raw_secret) receipt.failures.push('Env write failed or returned raw secret.');
      if (!receipt.env_list.ok || !receipt.env_list.has_key || receipt.env_list.raw_secret_exposed) receipt.failures.push('Env list failed, missed the key, or exposed the raw secret.');
      if (!receipt.deploy.ok) receipt.failures.push('SkyeNet CLI deploy did not upload a private full source package.');
      if (!receipt.public_static.ok) receipt.failures.push('Published SkyeNet public app route did not render expected content.');
      if (!receipt.public_assets?.ok) receipt.failures.push('Published SkyeNet public assets did not resolve under the mounted route.');
      if (!receipt.source_download?.ok) receipt.failures.push('Gated source download did not include full private project files.');
      if (!receipt.public_source_exposure?.ok) receipt.failures.push('Private source file was exposed through the public route.');
    }
  }

  receipt.ok = receipt.failures.length === 0;
  const stamped = path.join(artifactRoot, `skyenet-netlify-parity-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    live_app: receipt.links.live_app,
    source_download_status: receipt.source_download?.status || 0,
    private_source_bytes: receipt.source_download?.bytes || 0,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.netlify-parity.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    no_browser_proof_run: true
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
