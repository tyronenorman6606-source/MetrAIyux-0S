#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as esbuild from 'esbuild';
import { prepareFunctionBuild } from './skyenet-functions-build.mjs';

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
  let bundle = true;
  let installBuild = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--out') outDir = path.resolve(args[index + 1] || outDir);
    if (args[index] === '--signing-key') signingKey = args[index + 1] || signingKey;
    if (args[index] === '--tenant') tenantId = args[index + 1] || tenantId;
    if (args[index] === '--no-bundle') bundle = false;
    if (args[index] === '--install-build') installBuild = true;
  }
  return { projectRoot, outDir, signingKey, tenantId, bundle, installBuild };
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

function quotedConfigValue(source, key) {
  const pattern = new RegExp(`\\b${key}\\s*[:=]\\s*(['"\`])([^'"\`]+)\\1`, 'm');
  const match = String(source || '').match(pattern);
  return match ? match[2].trim() : '';
}

function booleanConfigValue(source, key) {
  const pattern = new RegExp(`\\b${key}\\s*[:=]\\s*true\\b`, 'm');
  return pattern.test(String(source || ''));
}

function functionInvocationConfig({ name, source }) {
  const schedule = quotedConfigValue(source, 'schedule');
  const background = /(^|[-_.])background$/i.test(name) || booleanConfigValue(source, 'background');
  if (schedule) {
    return {
      invocation_mode: 'scheduled',
      background: false,
      schedule: {
        cron: schedule,
        timezone: 'UTC',
        source: 'netlify-function-config'
      }
    };
  }
  if (background) {
    return {
      invocation_mode: 'background',
      background: true,
      schedule: null
    };
  }
  return {
    invocation_mode: 'request',
    background: false,
    schedule: null
  };
}

export async function convertProject(projectRoot, options = {}) {
  const sourceRoot = path.resolve(projectRoot);
  const outDir = path.resolve(options.outDir || path.join(sourceRoot, '.skyenet', 'functions-bundle'));
  const shouldBundle = options.bundle !== false;
  let root = sourceRoot;
  let buildReceipt = null;
  let cleanupBuildRoot = '';
  if (options.installBuild) {
    try {
      const built = await prepareFunctionBuild(sourceRoot, {
        timeoutMs: options.installBuildTimeoutMs || options.buildTimeoutMs,
        runBuild: options.runBuild,
        osJail: options.installBuildOsJail || options.osJail
      });
      root = built.buildRoot;
      cleanupBuildRoot = options.keepBuildJail ? '' : built.jailRoot;
      buildReceipt = built.receipt;
    } catch (error) {
      await fs.rm(outDir, { recursive: true, force: true });
      await fs.mkdir(outDir, { recursive: true });
      if (error?.receipt) {
        await fs.writeFile(path.join(outDir, 'build-receipt.json'), JSON.stringify(error.receipt, null, 2));
      }
      throw error;
    }
  }
  const discovered = await discoverFunctionDir(root);
  if (!discovered) {
    if (cleanupBuildRoot) await fs.rm(path.dirname(cleanupBuildRoot), { recursive: true, force: true });
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
    const name = slugName(rel);
    if (!name) continue;
    const source = await fs.readFile(file, 'utf8');
    const invocation = functionInvocationConfig({ name, source });
    const targetName = shouldBundle ? `${name}.mjs` : `${name}${path.extname(rel)}`;
    const target = path.join(functionsOut, targetName);
    if (shouldBundle) {
      try {
        await esbuild.build({
          entryPoints: [file],
          outfile: target,
          bundle: true,
          format: 'esm',
          platform: 'neutral',
          target: 'es2022',
          mainFields: ['module', 'main'],
          conditions: ['worker', 'browser', 'import', 'default'],
          external: ['node:*'],
          legalComments: 'none',
          logLevel: 'silent',
          banner: {
            js: `// Bundled by SkyeNet from ${JSON.stringify(path.relative(root, file).replace(/\\/g, '/'))}.`
          }
        });
      } catch (error) {
        error.message = `Unable to bundle Netlify function ${path.relative(root, file).replace(/\\/g, '/')}: ${error.message}`;
        error.code = error.code || 'SKYENET_FUNCTION_BUNDLE_BUILD_FAILED';
        throw error;
      }
    } else {
      await fs.copyFile(file, target);
    }
    const routes = [
      `/.netlify/functions/${name}`,
      `/.skyenet/functions/${name}`
    ];
    if (invocation.invocation_mode === 'scheduled') routes.push(`/.skyenet/scheduled/${name}`);
    functions.push({
      name,
      source_path: path.relative(root, file).replace(/\\/g, '/'),
      bundle_path: `functions/${targetName}`,
      runtime: 'node',
      adapter: 'netlify.handler.v1',
      sha256: await sha256File(target),
      invocation_mode: invocation.invocation_mode,
      background: invocation.background,
      schedule: invocation.schedule,
      routes,
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
      },
      build: {
        bundled: shouldBundle,
        bundler: shouldBundle ? `esbuild@${esbuild.version}` : 'copy',
        original_extension: path.extname(rel)
      }
    });
  }

  const manifest = {
    schema: 'skyenet.functions.bundle.v1',
    bundle_id: `skybun_${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')}`,
    generated_at: new Date().toISOString(),
    tenant_id: options.tenantId || 'local-proof-tenant',
    project_root: sourceRoot,
    source_functions_dir: discovered.rel,
    function_count: functions.length,
    background_function_count: functions.filter((fn) => fn.invocation_mode === 'background').length,
    scheduled_function_count: functions.filter((fn) => fn.invocation_mode === 'scheduled').length,
    schedules: functions
      .filter((fn) => fn.schedule?.cron)
      .map((fn) => ({
        function_name: fn.name,
        cron: fn.schedule.cron,
        timezone: fn.schedule.timezone || 'UTC',
        route: `/.skyenet/scheduled/${fn.name}`
      })),
    functions,
    runtime_contract: {
      netlify_route_prefix: '/.netlify/functions/',
      skynet_route_prefix: '/.skyenet/functions/',
      entry: 'handler(event, context)',
      invocation_modes: ['request', 'background', 'scheduled'],
      isolation: 'cloudflare-dynamic-worker-v1',
      memory_cap: 'SkyeNet plan/runtime caps',
      timeout_cap: 'SkyeNet plan/runtime caps',
      env_policy: 'deny-by-default explicit grants only',
      egress_policy: 'deny-by-default',
      production_isolation_required_for_hostile_code: 'Cloudflare Dynamic Workers with no raw env and globalOutbound null',
      bundler: shouldBundle ? `esbuild@${esbuild.version}` : 'copy'
    }
  };
  if (buildReceipt) {
    manifest.build_pipeline = {
      receipt_path: 'build-receipt.json',
      package_manager: buildReceipt.package_manager || '',
      command_count: buildReceipt.commands?.length || 0,
      env_scrubbed: buildReceipt.env_policy?.scrubbed === true,
      os_jail: buildReceipt.isolation || null,
      source_root: sourceRoot,
      bundled_from_jail: true
    };
  }
  manifest.signature = signManifest(manifest, options.signingKey || '');

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  if (buildReceipt) await fs.writeFile(path.join(outDir, 'build-receipt.json'), JSON.stringify(buildReceipt, null, 2));
  if (cleanupBuildRoot) await fs.rm(path.dirname(cleanupBuildRoot), { recursive: true, force: true });
  return { ok: true, outDir, manifest, buildReceipt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { projectRoot, outDir, signingKey, tenantId, bundle, installBuild } = parseArgs(process.argv.slice(2));
  convertProject(projectRoot, { outDir, signingKey, tenantId, bundle, installBuild })
    .then((result) => {
      console.log(JSON.stringify({
        ok: true,
        outDir: result.outDir,
        bundle_id: result.manifest.bundle_id,
        signature: result.manifest.signature?.alg || 'none',
        function_count: result.manifest.function_count,
        bundler: result.manifest.runtime_contract?.bundler || '',
        background_function_count: result.manifest.background_function_count || 0,
        scheduled_function_count: result.manifest.scheduled_function_count || 0,
        schedules: result.manifest.schedules || [],
        functions: result.manifest.functions.map((fn) => ({ name: fn.name, invocation_mode: fn.invocation_mode, routes: fn.routes }))
      }, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message, code: error.code || 'SKYENET_CONVERT_FAILED' }, null, 2));
      process.exitCode = 1;
    });
}
