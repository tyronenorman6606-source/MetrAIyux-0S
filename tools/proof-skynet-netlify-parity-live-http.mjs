#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

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

function authHeaders(token) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
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
    headers: {
      x_skynet_route: response.headers.get('x-skynet-route') || '',
      x_skynet_rewrite_target: response.headers.get('x-skynet-rewrite-target') || '',
      x_skyenet_rule_proof: response.headers.get('x-skyenet-rule-proof') || '',
      x_skyenet_landing_proof: response.headers.get('x-skyenet-landing-proof') || '',
      x_toml_header: response.headers.get('x-toml-header') || '',
      x_skynet_form_name: response.headers.get('x-skynet-form-name') || '',
      x_skynet_form_receipt: response.headers.get('x-skynet-form-receipt') || '',
      x_0s_runtime_archive: response.headers.get('x-0s-runtime-archive') || '',
      x_0s_request_id: response.headers.get('x-0s-request-id') || '',
      etag: response.headers.get('etag') || '',
      last_modified: response.headers.get('last-modified') || '',
      accept_ranges: response.headers.get('accept-ranges') || '',
      content_range: response.headers.get('content-range') || ''
    },
    text
  };
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, init);
  let body = {};
  try { body = result.text ? JSON.parse(result.text) : {}; } catch { body = { text: result.text }; }
  return { ...result, body };
}

async function pollRuntimeTelemetry({ token, liveUrl }) {
  const telemetryUrl = `${skynetBase}/api/skyenet/observability?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&limit=100`;
  const attempts = [];
  for (let index = 0; index < 8; index += 1) {
    if (index > 0) await sleep(3500);
    const triggered = liveUrl
      ? await fetchText(`${liveUrl}${liveUrl.includes('?') ? '&' : '?'}runtime-proof=${Date.now()}-${index}`)
      : { status: 0, headers: {}, elapsed_ms: 0 };
    const observed = await fetchJson(telemetryUrl, { headers: authHeaders(token), redirect: 'manual' });
    const body = observed.body?.sinks ? observed.body : observed.body?.skynet || {};
    const logObjects = Array.isArray(body.latest_log_objects) ? body.latest_log_objects : [];
    const rollupRows = Array.isArray(body.d1_rollups?.rows) ? body.d1_rollups.rows : [];
    const attempt = {
      attempt: index + 1,
      status: observed.status,
      elapsed_ms: observed.elapsed_ms,
      trigger_status: triggered.status,
      trigger_elapsed_ms: triggered.elapsed_ms,
      trigger_request_id: triggered.headers.x_0s_request_id || '',
      trigger_archive: triggered.headers.x_0s_runtime_archive || '',
      r2_archive_header_ok: /sync-r2:1/.test(triggered.headers.x_0s_runtime_archive || ''),
      sinks: body.sinks || {},
      latest_log_count: logObjects.length,
      project_log_count: logObjects.filter((item) => String(item.key || '').includes(`/project=${projectId}/`)).length,
      d1_configured: body.d1_rollups?.configured === true,
      d1_query_ok: body.d1_rollups?.query_ok === true,
      d1_rollup_rows: rollupRows.length
    };
    attempts.push(attempt);
    if (attempt.r2_archive_header_ok && attempt.d1_configured && attempt.d1_query_ok && attempt.d1_rollup_rows > 0) {
      return {
        ok: true,
        url: telemetryUrl,
        attempts,
        final: attempt
      };
    }
  }
  const final = attempts.at(-1) || {};
  return {
    ok: false,
    url: telemetryUrl,
    attempts,
    final
  };
}

function hasAll(text, needles) {
  return needles.every((needle) => String(text || '').includes(needle));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  await fs.writeFile(path.join(publicDir, 'assets', 'data.txt'), '0123456789abcdef');
  await fs.writeFile(path.join(publicDir, 'landing.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SkyeNet landing target</title></head>
  <body><main><h1>Landing Target</h1><p>Netlify-style header rules reached this public asset.</p></main></body>
</html>
`);
  await fs.writeFile(path.join(publicDir, 'toml.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SkyeNet toml target</title></head>
  <body><main><h1>Toml Target</h1><p>netlify.toml redirect and header rules reached this public asset.</p></main></body>
</html>
`);
  await fs.writeFile(path.join(publicDir, 'contact.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SkyeNet form target</title></head>
  <body><main><form name="contact" method="POST" data-netlify="true"><input type="hidden" name="form-name" value="contact"><input name="name"><textarea name="message"></textarea><button>Send</button></form></main></body>
</html>
`);
  await fs.writeFile(path.join(publicDir, '_redirects'), `/old /landing.html 301
/app/* /index.html 200
/landing.html /index.html 200
`);
  await fs.writeFile(path.join(publicDir, '_headers'), `/*
  X-SkyeNet-Rule-Proof: rules-applied
/landing.html
  X-SkyeNet-Landing-Proof: landing-header
`);
  await fs.writeFile(path.join(publicDir, 'netlify.toml'), `[[redirects]]
from = "/toml-old"
to = "/toml.html"
status = 302

[[headers]]
for = "/toml.html"
[headers.values]
X-Toml-Header = "yes"
`);
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
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  const token = auth.token || '';
  const receipt = {
    schema: 'skyenet.netlify-parity.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    base: { zero_os: zeroOsBase, skynet: skynetBase },
    target: { workspace_id: workspaceId, project_id: projectId, plan_name: planName, host, mount },
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    fixture: null,
    unauth_env: null,
    login: null,
    public_static: null,
    console: null,
    publish_guide: null,
    status: null,
    support: null,
    observability: null,
    receipts: null,
    cost_model: null,
    customer_export: null,
    env_write: null,
    env_list: null,
    deploy: null,
    public_assets: null,
    source_download: null,
    public_source_exposure: null,
    runtime_telemetry: null,
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
	    public_files_expected: ['index.html', 'landing.html', 'toml.html', 'contact.html', 'assets/app.css', 'assets/app.js', 'assets/data.txt', '_redirects', '_headers', 'netlify.toml']
	  };

  const unauthEnv = await fetchJson(`${skynetBase}/api/skyenet/env?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}`);
  receipt.unauth_env = {
    status: unauthEnv.status,
    ok: unauthEnv.status === 401 || unauthEnv.status === 403,
    code: unauthEnv.body?.code || '',
    elapsed_ms: unauthEnv.elapsed_ms
  };
  if (!receipt.unauth_env.ok) receipt.failures.push('Unauthenticated env registry request was not rejected.');

  receipt.login = {
    status: Number(auth.response?.status || 0) || 0,
    ok: Boolean(auth.ok && token),
    token_received: Boolean(token),
    via: auth.response?.via || auth.credential?.source || ''
  };

  if (!token) {
    receipt.failures.push(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');
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

      const support = await fetchJson(`${skynetBase}/api/skyenet/support`, {
        headers: authHeaders(token)
      });
      const supportProfile = support.body?.support || support.body?.skynet?.support || {};
      receipt.support = {
        status: support.status,
        ok: Boolean(support.ok && supportProfile.operations?.email === 'SkyesOverLondonLC@solenterprises.org' && supportProfile.source === 'https://skyenet.skyesol/leadership/SkyesOverLondon.html'),
        source: supportProfile.source || '',
        operations_email: supportProfile.operations?.email || '',
        founder_email: supportProfile.founder?.email || '',
        general_email: supportProfile.general?.email || '',
        b2b_email: supportProfile.b2b?.email || '',
        elapsed_ms: support.elapsed_ms
      };

      const observability = await fetchJson(`${skynetBase}/api/skyenet/observability?limit=10`, {
        headers: authHeaders(token)
      });
      const observabilityBody = observability.body?.sinks ? observability.body : observability.body?.skynet || {};
      receipt.observability = {
        status: observability.status,
        ok: Boolean(observability.ok && observabilityBody.ok !== false),
        sinks: observabilityBody.sinks || {},
        latest_log_count: Array.isArray(observabilityBody.latest_log_objects) ? observabilityBody.latest_log_objects.length : 0,
        runtime_event_schema: observabilityBody.runtime_event_schema || '',
        elapsed_ms: observability.elapsed_ms
      };

      const receipts = await fetchJson(`${skynetBase}/api/skyenet/receipts?workspace_id=${encodeURIComponent(workspaceId)}&limit=25`, {
        headers: authHeaders(token)
      });
      const receiptBody = receipts.body?.receipts ? receipts.body : receipts.body?.skynet || {};
      receipt.receipts = {
        status: receipts.status,
        ok: Boolean(receipts.ok && receiptBody.ok !== false && Array.isArray(receiptBody.receipts)),
        count: Array.isArray(receiptBody.receipts) ? receiptBody.receipts.length : 0,
        elapsed_ms: receipts.elapsed_ms
      };

      const costModel = await fetchJson(`${skynetBase}/api/skyenet/cost-model`, {
        headers: authHeaders(token)
      });
      const costBody = costModel.body?.cost_model ? costModel.body : costModel.body?.skynet || {};
      receipt.cost_model = {
        status: costModel.status,
        ok: Boolean(costModel.ok && costBody.cost_model?.currency === 'usd'),
        currency: costBody.cost_model?.currency || '',
        plans: Object.keys(costBody.cost_model?.plans || {}).length,
        elapsed_ms: costModel.elapsed_ms
      };

      const customerExport = await fetchJson(`${skynetBase}/api/skyenet/export?workspace_id=${encodeURIComponent(workspaceId)}&limit=25`, {
        headers: authHeaders(token)
      });
      const exportBody = customerExport.body?.schema === 'fs27.skynet.customer_export.v1' ? customerExport.body : customerExport.body?.skynet || {};
      const exportText = JSON.stringify(exportBody || {});
      receipt.customer_export = {
        status: customerExport.status,
        ok: Boolean(customerExport.ok && exportBody.schema === 'fs27.skynet.customer_export.v1' && exportBody.redaction_policy?.raw_bearer_tokens_included === false && exportBody.support?.operations?.email === 'SkyesOverLondonLC@solenterprises.org'),
        schema: exportBody.schema || '',
        deployments: Array.isArray(exportBody.deployments) ? exportBody.deployments.length : 0,
        routes: Array.isArray(exportBody.routes) ? exportBody.routes.length : 0,
        receipts: Array.isArray(exportBody.receipts) ? exportBody.receipts.length : 0,
        includes_raw_token: token ? exportText.includes(token) : false,
        includes_raw_env_secret: exportText.includes(secretProofValue),
        elapsed_ms: customerExport.elapsed_ms
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
        '--concurrency', '4',
        '--token', token
      ], {
        env: process.env,
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

      const expectedLandingUrl = new URL('landing.html', liveUrl).toString();
	      const redirectRule = await fetchText(new URL('old', liveUrl).toString());
	      const landingRule = await fetchText(expectedLandingUrl);
	      const rewriteRule = await fetchText(new URL('app/deep/link', liveUrl).toString());
	      const privateRuleFile = await fetchText(new URL('_redirects', liveUrl).toString());
	      const tomlRedirectRule = await fetchText(new URL('toml-old', liveUrl).toString());
	      const tomlRule = await fetchText(new URL('toml.html', liveUrl).toString());
	      const privateTomlFile = await fetchText(new URL('netlify.toml', liveUrl).toString());
	      receipt.netlify_rules = {
	        redirects_file: true,
	        headers_file: true,
	        netlify_toml: true,
	        redirect: {
	          status: redirectRule.status,
          ok: redirectRule.status === 301 && redirectRule.location === expectedLandingUrl,
          location: redirectRule.location,
          route: redirectRule.headers.x_skynet_route,
          elapsed_ms: redirectRule.elapsed_ms
        },
        shadowed_asset: {
          status: landingRule.status,
          ok: landingRule.status === 200
            && hasAll(landingRule.text, ['Landing Target'])
            && landingRule.headers.x_skyenet_rule_proof === 'rules-applied'
            && landingRule.headers.x_skyenet_landing_proof === 'landing-header',
          route: landingRule.headers.x_skynet_route,
          rule_header: landingRule.headers.x_skyenet_rule_proof,
          landing_header: landingRule.headers.x_skyenet_landing_proof,
          elapsed_ms: landingRule.elapsed_ms
        },
        rewrite: {
          status: rewriteRule.status,
          ok: rewriteRule.status === 200
            && hasAll(rewriteRule.text, ['SkyeNet parity proof', 'Public bundle is live on SkyeNet'])
            && rewriteRule.headers.x_skynet_rewrite_target === '/index.html'
            && rewriteRule.headers.x_skyenet_rule_proof === 'rules-applied',
          route: rewriteRule.headers.x_skynet_route,
          rewrite_target: rewriteRule.headers.x_skynet_rewrite_target,
	          rule_header: rewriteRule.headers.x_skyenet_rule_proof,
	          elapsed_ms: rewriteRule.elapsed_ms
	        },
	        toml_redirect: {
	          status: tomlRedirectRule.status,
	          ok: tomlRedirectRule.status === 302 && tomlRedirectRule.location === new URL('toml.html', liveUrl).toString(),
	          location: tomlRedirectRule.location,
	          route: tomlRedirectRule.headers.x_skynet_route,
	          elapsed_ms: tomlRedirectRule.elapsed_ms
	        },
	        toml_header: {
	          status: tomlRule.status,
	          ok: tomlRule.status === 200 && hasAll(tomlRule.text, ['Toml Target']) && tomlRule.headers.x_toml_header === 'yes',
	          route: tomlRule.headers.x_skynet_route,
	          toml_header: tomlRule.headers.x_toml_header,
	          elapsed_ms: tomlRule.elapsed_ms
	        },
	        rule_file_blocked: {
	          status: privateRuleFile.status,
	          ok: privateRuleFile.status === 404 && !privateRuleFile.text.includes('/old /landing.html'),
	          route: privateRuleFile.headers.x_skynet_route,
	          elapsed_ms: privateRuleFile.elapsed_ms
	        },
	        toml_file_blocked: {
	          status: privateTomlFile.status,
	          ok: privateTomlFile.status === 404 && !privateTomlFile.text.includes('[[redirects]]'),
	          route: privateTomlFile.headers.x_skynet_route,
	          elapsed_ms: privateTomlFile.elapsed_ms
	        }
	      };

	      const assetUrls = [
	        new URL('assets/app.css', liveUrl).toString(),
	        new URL('assets/app.js', liveUrl).toString(),
	        new URL('assets/data.txt', liveUrl).toString()
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

	      const dataAssetUrl = new URL('assets/data.txt', liveUrl).toString();
	      const fullDataAsset = await fetchText(dataAssetUrl);
	      const rangedDataAsset = await fetchText(dataAssetUrl, { headers: { range: 'bytes=2-5' } });
	      const conditionalDataAsset = fullDataAsset.headers.etag
	        ? await fetchText(dataAssetUrl, { headers: { 'if-none-match': fullDataAsset.headers.etag } })
	        : { status: 0, headers: {}, elapsed_ms: 0, text: '' };
	      const conditionalDateAsset = fullDataAsset.headers.last_modified
	        ? await fetchText(dataAssetUrl, { headers: { 'if-modified-since': fullDataAsset.headers.last_modified } })
	        : { status: 0, headers: {}, elapsed_ms: 0, text: '' };
	      const formCapture = await fetchJson(new URL('contact', liveUrl).toString(), {
	        method: 'POST',
	        headers: {
	          accept: 'application/json',
	          'content-type': 'application/x-www-form-urlencoded'
	        },
	        body: new URLSearchParams({
	          'form-name': 'contact',
	          name: 'SkyeNet Proof',
	          message: 'Netlify Forms basic capture live proof'
	        }).toString()
	      });
	      receipt.static_http = {
	        range: {
	          status: rangedDataAsset.status,
	          ok: rangedDataAsset.status === 206
	            && rangedDataAsset.text === '2345'
	            && rangedDataAsset.headers.accept_ranges === 'bytes'
	            && rangedDataAsset.headers.content_range === 'bytes 2-5/16',
	          content_range: rangedDataAsset.headers.content_range,
	          accept_ranges: rangedDataAsset.headers.accept_ranges,
	          elapsed_ms: rangedDataAsset.elapsed_ms
	        },
	        conditional_etag: {
	          status: conditionalDataAsset.status,
	          ok: Boolean(fullDataAsset.headers.etag) && conditionalDataAsset.status === 304,
	          etag_present: Boolean(fullDataAsset.headers.etag),
	          elapsed_ms: conditionalDataAsset.elapsed_ms
	        },
	        conditional_last_modified: {
	          status: conditionalDateAsset.status,
	          ok: Boolean(fullDataAsset.headers.last_modified) && conditionalDateAsset.status === 304,
	          last_modified_present: Boolean(fullDataAsset.headers.last_modified),
	          elapsed_ms: conditionalDateAsset.elapsed_ms
	        },
	        form_capture: {
	          status: formCapture.status,
	          ok: formCapture.status === 202
	            && formCapture.body?.ok === true
	            && formCapture.body?.form_name === 'contact'
	            && formCapture.headers.x_skynet_route === 'netlify-form',
	          form_name: formCapture.body?.form_name || '',
	          route: formCapture.headers.x_skynet_route,
	          receipt_key_present: Boolean(formCapture.body?.receipt_key || formCapture.headers.x_skynet_form_receipt),
	          elapsed_ms: formCapture.elapsed_ms
	        }
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

	        const sourceApiUrl = (path, extra = {}) => {
	          const target = new URL(sourceUrl);
	          target.pathname = `/api/skyenet/${path}`;
	          target.searchParams.set('workspace_id', workspaceId);
	          target.searchParams.set('project_id', projectId);
	          target.searchParams.set('deployment_id', deploymentId);
	          for (const [key, value] of Object.entries(extra)) target.searchParams.set(key, value);
	          return target.toString();
	        };
	        const manifest = await fetchJson(sourceApiUrl('source-manifest', { limit: '20' }), { headers: authHeaders(token), redirect: 'manual' });
	        const tree = await fetchJson(sourceApiUrl('source-tree'), { headers: authHeaders(token), redirect: 'manual' });
	        const sourceFile = await fetchJson(sourceApiUrl('source-file', { path: 'src/main.js' }), { headers: authHeaders(token), redirect: 'manual' });
	        const search = await fetchJson(sourceApiUrl('source-search', { q: 'handler' }), { headers: authHeaders(token), redirect: 'manual' });
	        receipt.source_codebase = {
	          manifest: {
	            status: manifest.status,
	            ok: manifest.ok && manifest.body?.source_mode === 'private-full-project' && hasAll(JSON.stringify(manifest.body.files || []), ['package.json', 'src/main.js', 'netlify/functions/hello.mjs']),
	            file_count: manifest.body?.file_count || 0
	          },
	          tree: {
	            status: tree.status,
	            ok: tree.ok && hasAll(JSON.stringify(tree.body?.entries || []), ['src', 'netlify', 'package.json']),
	            entry_count: tree.body?.entry_count || 0
	          },
		          file: {
		            status: sourceFile.status,
		            ok: sourceFile.ok && sourceFile.body?.path === 'src/main.js' && String(sourceFile.body?.text || '').includes('private-full-project-package'),
		            bytes: sourceFile.body?.bytes || 0
		          },
	          search: {
	            status: search.status,
	            ok: search.ok && Array.isArray(search.body?.results) && search.body.results.some((item) => item.path === 'netlify/functions/hello.mjs'),
	            result_count: search.body?.result_count || 0
	          }
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

	        receipt.runtime_telemetry = await pollRuntimeTelemetry({ token, liveUrl });
      }

      const caps = receipt.status.capabilities || {};
      if (!receipt.console.ok) receipt.failures.push('SkyeNet console did not show env/private source controls.');
      if (!receipt.publish_guide.ok) receipt.failures.push('SkyeNet publish guide did not show source-root/env copy.');
	      if (!receipt.status.ok || caps.private_full_project_source_packages !== true) receipt.failures.push('SkyeNet status did not advertise private full project packages.');
	      if (caps.env_variable_registry !== true) receipt.failures.push('SkyeNet status did not advertise env variable registry.');
	      if (caps.netlify_toml_redirects_headers !== true || caps.netlify_forms_basic_capture !== true || caps.static_asset_range_requests !== true || caps.static_asset_conditional_etag !== true || caps.static_asset_conditional_last_modified !== true) receipt.failures.push('SkyeNet status did not advertise the newly closed static parity capabilities.');
	      if (caps.customer_support_profile !== true || caps.customer_export_bundle !== true || caps.runtime_observability !== true || caps.runtime_log_exports !== true) receipt.failures.push('SkyeNet status did not advertise support/export/observability parity capabilities.');
	      if (!receipt.support?.ok) receipt.failures.push('Approved Skyes Over London support profile did not pass live API proof.');
	      if (!receipt.observability?.ok || receipt.observability?.sinks?.r2_runtime_logs !== true || receipt.observability?.sinks?.queue !== true || receipt.observability?.sinks?.d1_rollups !== true) receipt.failures.push('Observability endpoint did not prove R2 runtime logs, queue telemetry, and CitadelDB D1 rollups.');
	      if (!receipt.receipts?.ok) receipt.failures.push('Deployment receipt export lane did not return account-scoped receipts.');
	      if (!receipt.cost_model?.ok) receipt.failures.push('SkyeNet cost model endpoint did not return the expected USD pricing model.');
	      if (!receipt.customer_export?.ok || receipt.customer_export?.includes_raw_token || receipt.customer_export?.includes_raw_env_secret) receipt.failures.push('Customer export bundle failed or included a raw token/secret.');
	      if (!receipt.env_write.ok || receipt.env_write.has_raw_secret) receipt.failures.push('Env write failed or returned raw secret.');
      if (!receipt.env_list.ok || !receipt.env_list.has_key || receipt.env_list.raw_secret_exposed) receipt.failures.push('Env list failed, missed the key, or exposed the raw secret.');
      if (!receipt.deploy.ok) receipt.failures.push('SkyeNet CLI deploy did not upload a private full source package.');
      if (!receipt.public_static.ok) receipt.failures.push('Published SkyeNet public app route did not render expected content.');
	      if (!receipt.netlify_rules?.redirect?.ok || !receipt.netlify_rules?.shadowed_asset?.ok || !receipt.netlify_rules?.rewrite?.ok || !receipt.netlify_rules?.toml_redirect?.ok || !receipt.netlify_rules?.toml_header?.ok || !receipt.netlify_rules?.rule_file_blocked?.ok || !receipt.netlify_rules?.toml_file_blocked?.ok) receipt.failures.push('Netlify-style _redirects/_headers/netlify.toml behavior did not pass live HTTP proof.');
	      if (!receipt.public_assets?.ok) receipt.failures.push('Published SkyeNet public assets did not resolve under the mounted route.');
	      if (!receipt.static_http?.range?.ok || !receipt.static_http?.conditional_etag?.ok || !receipt.static_http?.conditional_last_modified?.ok || !receipt.static_http?.form_capture?.ok) receipt.failures.push('Static asset range/conditional request or Netlify Forms capture did not pass live HTTP proof.');
	      if (!receipt.source_download?.ok) receipt.failures.push('Gated source download did not include full private project files.');
	      if (!receipt.source_codebase?.manifest?.ok || !receipt.source_codebase?.tree?.ok || !receipt.source_codebase?.file?.ok || !receipt.source_codebase?.search?.ok) receipt.failures.push('Gated source codebase manifest/tree/file/search APIs did not prove IDE-readable source custody.');
	      if (!receipt.public_source_exposure?.ok) receipt.failures.push('Private source file was exposed through the public route.');
	      if (!receipt.runtime_telemetry?.ok) receipt.failures.push('Runtime telemetry did not prove a production request archived to R2 and rolled up into CitadelDB D1.');
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
