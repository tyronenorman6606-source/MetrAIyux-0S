import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';

const gatewayBase = process.env.GATEWAY_BASE_URL || 'http://gateway:7313';
const token = process.env.GATEWAY_ADMIN_TOKEN || '';
const workerId = process.env.WORKER_ID || `job-runner-${os.hostname()}`;
const pollMs = Number(process.env.JOB_RUNNER_POLL_MS || 5000);
const once = process.env.JOB_RUNNER_ONCE === 'true';

const allowed = {
  'health': ['./cli/citadel', 'health'],
  'backup-now': ['./cli/citadel', 'backup-now'],
  'backup-encrypted': ['./cli/citadel', 'backup-encrypted'],
  'restore-test': ['./cli/citadel', 'restore-test'],
  'smoke-all': ['./cli/citadel', 'smoke-all'],
  'object-backup-sync': ['./cli/citadel', 'object-backup-sync'],
  'validate-env': ['./cli/citadel', 'validate-env'],
  'policy-check': ['./cli/citadel', 'policy-check'],
  'backup-manifest': ['./cli/citadel', 'backup-manifest'],
  'branch-clone': ['./tools/branch-clone-job.sh'],
  'app-write-smoke': ['./tools/run-app-write-smoke.sh']
};

async function api(path, options = {}) {
  const res = await fetch(`${gatewayBase}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: text || `HTTP ${res.status}` }; }
}

async function post(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function runCommand(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: '/workspace',
      env: process.env,
      shell: false
    });

    let output = '';

    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('close', code => {
      resolve({
        code,
        output,
        outputTail: output.slice(-4000)
      });
    });
  });
}

async function checksum(path) {
  try {
    const data = await readFile(path);
    return createHash('sha256').update(data).digest('hex');
  } catch {
    return null;
  }
}

async function workOnce() {
  const claimed = await post('/admin/jobs/claim', { workerId });
  if (!claimed.ok || !claimed.job) {
    return false;
  }

  const job = claimed.job;
  const pair = allowed[job.job_type];

  if (!pair) {
    await post(`/admin/jobs/${job.id}/finish`, {
      success: false,
      error: `Job type not allowlisted: ${job.job_type}`
    });
    return true;
  }

  await post(`/admin/jobs/${job.id}/start`, {});
  const [command, ...args] = pair;
  let result;
  if (job.job_type === 'app-write-smoke') {
    result = {
      code: 2,
      output: 'App write smoke needs the app DATABASE_URL/password. Use the dashboard connection panel to copy the env, then run tools/run-app-write-smoke.sh from the app environment. This job records the request but does not fake a successful app write.\n',
      outputTail: 'App write smoke needs the app DATABASE_URL/password. No fake success.\n'
    };
  } else {
    result = await runCommand(command, args);
  }

  const receiptMatch = result.output.match(/(?:written|receipt|Path):\s*(proof\/[^\s]+)/i);
  const receiptPath = receiptMatch ? receiptMatch[1] : null;
  const receiptChecksum = receiptPath ? await checksum(`/workspace/${receiptPath}`) : null;

  await post(`/admin/jobs/${job.id}/finish`, {
    success: result.code === 0,
    receiptPath,
    outputTail: result.outputTail,
    error: result.code === 0 ? null : `Command exited with ${result.code}`,
    commandName: job.job_type,
    checksum: receiptChecksum,
    metadata: { command, args, workerId }
  });

  return true;
}

while (true) {
  try {
    const didWork = await workOnce();
    if (once) process.exit(didWork ? 0 : 0);
  } catch (error) {
    console.error('worker loop error:', error);
    if (once) process.exit(1);
  }

  await new Promise(resolve => setTimeout(resolve, pollMs));
}
