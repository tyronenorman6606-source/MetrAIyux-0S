#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function cleanSlug(value, fallback = 'artist-package') {
  const slug = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
}

async function folderSize(root) {
  let bytes = 0;
  let files = 0;
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.skyenet'].includes(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        bytes += stat.size;
        files += 1;
      }
    }
  }
  await walk(root);
  return { bytes, files };
}

async function writeReceipt(dir, receipt) {
  const file = path.join(dir, 'SKYENET_DEPLOY_RECEIPT.json');
  await fs.writeFile(file, `${JSON.stringify(receipt, null, 2)}\n`);
  return file;
}

function parseJsonTail(text) {
  const source = String(text || '').trim();
  const start = source.lastIndexOf('\n{');
  const body = start >= 0 ? source.slice(start + 1) : source;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

const dir = path.resolve(arg('dir', 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/NexusArtistPrimePackage'));
const slug = cleanSlug(arg('slug', path.basename(dir)), 'nexus-artist-package');
const project = cleanSlug(arg('project', slug), slug);
const host = arg('host', 'metraiyux-0s-full-system.graylondonskyes.workers.dev');
const mount = arg('mount', `/musicnexus/${slug}`);
const workspace = arg('workspace', 'default-workspace');
const plan = arg('plan', 'free99');
const publicAccess = flag('public') || String(arg('auth', 'public')).toLowerCase() === 'public';
const gateAuth = await resolveZeroOsGateAuth().catch((error) => ({ ok: false, token: '', error: error?.message || String(error) }));
const gateToken = String(gateAuth.token || '').trim();

if (!existsSync(dir)) {
  console.error(`Source folder not found: ${dir}`);
  process.exit(1);
}

const inventory = await folderSize(dir);
const baseReceipt = {
  generatedAt: new Date().toISOString(),
  package: path.basename(dir),
  sourceFolder: path.relative(process.cwd(), dir).replace(/\\/g, '/'),
  provider: 'fs27-skynet',
  projectId: project,
  mountPath: mount,
  host,
  workspace,
  plan,
  publicAccess,
  fileCount: inventory.files,
  bytes: inventory.bytes,
  requiredCredential: 'shared FS27/SkyGate/Free99 gate bearer'
};

if (!gateToken) {
  const receiptPath = await writeReceipt(dir, {
    ...baseReceipt,
    ok: false,
    status: 'blocked_missing_owner_bearer',
    attempted: false,
    notes: [
      gateAuth.error || 'The shared FS27/SkyGate/Free99 gate bearer could not be resolved.',
      'No bearer token was printed or committed.',
      'Authenticate through the canonical 0S/FS27 gate and rerun this command.'
    ]
  });
  console.error(`SkyeNet deploy blocked: missing shared FS27/SkyGate bearer. Receipt: ${receiptPath}`);
  process.exit(2);
}

const args = [
  'tools/skyenet-deploy.mjs',
  '--dir', dir,
  '--project', project,
  '--workspace', workspace,
  '--plan', plan,
  '--host', host,
  '--mount', mount,
  '--token', gateToken
];
if (publicAccess) args.push('--public');

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 64
});

const deploy = parseJsonTail(result.stdout);
const ok = result.status === 0 && deploy?.ok === true;
const receiptPath = await writeReceipt(dir, {
  ...baseReceipt,
  ok,
  status: ok ? 'deployed' : 'failed',
  attempted: true,
  exitCode: result.status,
  liveUrl: deploy?.live_url || '',
  deploymentId: deploy?.deployment_id || '',
  routeKey: deploy?.route_key || '',
  error: ok ? '' : (result.stderr || result.stdout || 'SkyeNet deploy failed.').slice(0, 4000)
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
console.log(`\nSkyeNet receipt: ${receiptPath}`);
process.exit(ok ? 0 : (result.status || 1));
