#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const FUNCTION_DIRS = ['netlify/functions', 'functions', 'skyenet/functions'];
const FUNCTION_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

function slugName(filename) {
  return filename.slice(0, -path.extname(filename).length)
    .replace(/[\\/]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(file));
  return hash.digest('hex');
}

async function walkFunctions(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFunctions(full);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && FUNCTION_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

async function discoverFunctionDir(projectRoot) {
  for (const rel of FUNCTION_DIRS) {
    const candidate = path.join(projectRoot, rel);
    if (await exists(candidate)) return { dir: candidate, rel };
  }
  return null;
}

function parseArgs(argv) {
  const args = [...argv];
  const projectRoot = path.resolve(args.shift() || '.');
  let outDir = path.join(projectRoot, '.skyenet', 'functions-bundle');
  let signingKey = process.env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || '';
  let tenantId = process.env.SKYENET_TENANT_ID || 'local-proof-tenant';
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--out') outDir = path.resolve(args[index + 1] || outDir);
    if (args[index] === '--signing-key') signingKey = args[index + 1] || signingKey;
    if (args[index] === '--tenant') tenantId = args[index + 1] || tenantId;
  }
  return { projectRoot, outDir, signingKey, tenantId };
}

function signManifest(manifest, signingKey) {
  if (!signingKey) {
    return {
      alg: 'none',
      status: 'unsigned-dev-bundle',
      note: 'Set SKYENET_FUNCTION_BUNDLE_SIGNING_KEY before staging or running production bundles.'
    };
  }
  const body = JSON.stringify(manifest);
  return {
    alg: 'HS256',
    key_hint: crypto.createHash('sha256').update(signingKey).digest('hex').slice(0, 12),
    value: crypto.createHmac('sha256', signingKey).update(body).digest('hex')
  };
}

export async function convertProject(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const outDir = path.resolve(options.outDir || path.join(root, '.skyenet', 'functions-bundle'));
  const discovered = await discoverFunctionDir(root);
  if (!discovered) {
    const error = new Error('No Netlify/SkyeNet functions directory found.');
    error.code = 'NO_FUNCTIONS_DIR';
    throw error;
  }

  const functionsOut = path.join(outDir, 'functions');
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(functionsOut, { recursive: true });

  const files = await walkFunctions(discovered.dir);
  const functions = [];
  for (const file of files) {
    const rel = path.relative(discovered.dir, file).replace(/\\/g, '/');
    const ext = path.extname(rel);
    const name = slugName(rel);
    if (!name) continue;
    const target = path.join(functionsOut, `${name}${ext}`);
    await fs.copyFile(file, target);
    functions.push({
      name,
      source_path: path.relative(root, file).replace(/\\/g, '/'),
      bundle_path: `functions/${path.basename(target)}`,
      runtime: 'node',
      adapter: 'netlify.handler.v1',
      sha256: await sha256File(file),
      routes: [
        `/.netlify/functions/${name}`,
        `/.skyenet/functions/${name}`
      ],
      compatibility: {
        event_context_signature: true,
        statusCode_headers_body_response: true,
        multiValueHeaders: true,
        base64_body: true
      },
      limits: {
        timeout_ms: Number(options.timeoutMs || 10000),
        memory_mb: Number(options.memoryMb || 128),
        max_body_bytes: Number(options.maxBodyBytes || 1048576),
        egress: options.egress || 'deny-by-default',
        env_grants: []
      }
    });
  }

  const manifest = {
    schema: 'skyenet.functions.bundle.v1',
    bundle_id: `skybun_${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')}`,
    generated_at: new Date().toISOString(),
    tenant_id: options.tenantId || 'local-proof-tenant',
    project_root: root,
    source_functions_dir: discovered.rel,
    function_count: functions.length,
    functions,
    runtime_contract: {
      netlify_route_prefix: '/.netlify/functions/',
      skynet_route_prefix: '/.skyenet/functions/',
      entry: 'handler(event, context)',
      isolation: 'skynetd-child-process-v1',
      memory_cap: 'node --max-old-space-size per invocation',
      timeout_cap: 'SIGKILL after function timeout',
      env_policy: 'deny-by-default explicit grants only',
      egress_policy: 'deny-by-default guard in v1; rootless container/microVM required for hostile code',
      production_isolation_required_for_hostile_code: 'rootless-container-cgroups-seccomp-or-microvm'
    }
  };
  manifest.signature = signManifest(manifest, options.signingKey || '');

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { ok: true, outDir, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { projectRoot, outDir, signingKey, tenantId } = parseArgs(process.argv.slice(2));
  convertProject(projectRoot, { outDir, signingKey, tenantId })
    .then((result) => {
      console.log(JSON.stringify({
        ok: true,
        outDir: result.outDir,
        bundle_id: result.manifest.bundle_id,
        signature: result.manifest.signature?.alg || 'none',
        function_count: result.manifest.function_count,
        functions: result.manifest.functions.map((fn) => ({ name: fn.name, routes: fn.routes }))
      }, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message, code: error.code || 'SKYENET_CONVERT_FAILED' }, null, 2));
      process.exitCode = 1;
    });
}
