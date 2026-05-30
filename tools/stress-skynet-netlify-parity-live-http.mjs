#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const runs = Math.max(1, Math.min(5, Number(process.env.SKYENET_STRESS_RUNS || 3)));
const readLoops = Math.max(6, Math.min(90, Number(process.env.SKYENET_STRESS_READS || 36)));
const workspaceId = process.env.SKYENET_STRESS_WORKSPACE || 'founder-skynet-parity-stress';
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-netlify-parity-stress');
const latestReceipt = path.join(artifactRoot, 'skyenet-netlify-parity-stress-live-http-latest.json');
const parityLatest = path.join(repoRoot, 'test-artifacts', 'skyenet-netlify-parity', 'skyenet-netlify-parity-live-http-latest.json');

function runProof(index) {
  return new Promise((resolve) => {
    const project = `skynet-parity-stress-${index}`;
    const started = performance.now();
    const child = spawn('node', ['tools/proof-skynet-netlify-parity-live-http.mjs'], {
      cwd: repoRoot,
      shell: false,
      env: {
        ...process.env,
        SKYENET_PARITY_PROJECT: project,
        SKYENET_PARITY_WORKSPACE: workspaceId,
        SKYENET_PARITY_MOUNT: `/${project}`,
        SKYENET_PARITY_PLAN: process.env.SKYENET_PARITY_PLAN || 'skyenet-functions-managed',
        SKYENET_PARITY_HOST: process.env.SKYENET_PARITY_HOST || 'skyenet.graylondonskyes.workers.dev'
      }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => resolve({
      index,
      project,
      code,
      ok: code === 0,
      stdout,
      stderr: stderr.slice(-2000),
      elapsed_ms: Number((performance.now() - started).toFixed(2))
    }));
  });
}

async function fetchCheck(url) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual' });
  const text = await response.text().catch(() => '');
  return {
    url,
    status: response.status,
    ok: response.status === 200,
    content_type: response.headers.get('content-type') || '',
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    has_parity_marker: text.includes('SkyeNet parity proof') || text.includes('skynetParityProof') || text.includes('font-family')
  };
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.netlify-parity.live-stress.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    skynet_base: skynetBase,
    workspace_id: workspaceId,
    runs_requested: runs,
    read_checks_requested: readLoops,
    deployments: [],
    public_read_stress: [],
    failures: []
  };

  for (let i = 1; i <= runs; i += 1) {
    const result = await runProof(i);
    let proofReceipt = null;
    try {
      proofReceipt = JSON.parse(await fs.readFile(parityLatest, 'utf8'));
      const copyPath = path.join(artifactRoot, `run-${i}-${result.project}.json`);
      await fs.writeFile(copyPath, `${JSON.stringify(proofReceipt, null, 2)}\n`);
      result.receipt_copy = path.relative(repoRoot, copyPath);
      result.live_app = proofReceipt.links?.live_app || `${skynetBase}/${result.project}/`;
      result.deployment_id = proofReceipt.deploy?.stdout_json?.deployment_id || '';
      result.private_source_uploaded = proofReceipt.deploy?.stdout_json?.private_source_package?.uploaded === true;
      result.source_download_ok = proofReceipt.source_download?.ok === true;
      result.env_redacted = proofReceipt.env_list?.raw_secret_exposed === false;
      result.public_source_exposure_ok = proofReceipt.public_source_exposure?.ok === true;
      result.failures = proofReceipt.failures || [];
    } catch (error) {
      result.failures = [`Unable to read proof receipt: ${error.message}`];
    }
    result.ok = result.ok
      && result.private_source_uploaded
      && result.source_download_ok
      && result.env_redacted
      && result.public_source_exposure_ok
      && !result.failures?.length;
    receipt.deployments.push(result);
    if (!result.ok) receipt.failures.push(`Run ${i} failed for ${result.project}.`);
  }

  const liveUrls = receipt.deployments
    .filter((run) => run.live_app)
    .flatMap((run) => [
      run.live_app,
      new URL('assets/app.css', run.live_app).toString(),
      new URL('assets/app.js', run.live_app).toString()
    ]);
  const queue = [];
  for (let i = 0; i < readLoops; i += 1) {
    queue.push(fetchCheck(liveUrls[i % liveUrls.length]));
  }
  receipt.public_read_stress = await Promise.all(queue);
  const failedReads = receipt.public_read_stress.filter((check) => !check.ok);
  if (failedReads.length) receipt.failures.push(`${failedReads.length} public read stress checks failed.`);

  receipt.ok = receipt.failures.length === 0;
  const stamped = path.join(artifactRoot, `skyenet-netlify-parity-stress-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    deployments: receipt.deployments.map((run) => ({
      project: run.project,
      ok: run.ok,
      deployment_id: run.deployment_id,
      live_app: run.live_app
    })),
    read_checks: receipt.public_read_stress.length,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.netlify-parity.live-stress.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    no_browser_proof_run: true
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
