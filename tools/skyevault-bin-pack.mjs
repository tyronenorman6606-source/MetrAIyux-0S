#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'list';

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function argValues(name) {
  const prefix = `${name}=`;
  return args
    .filter((arg) => arg.startsWith(prefix))
    .flatMap((arg) => arg.slice(prefix.length).split(','))
    .map((arg) => arg.trim())
    .filter(Boolean);
}

function flag(name) {
  return args.includes(name);
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function utcStamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function loadManifest() {
  const file = path.resolve(repoRoot, argValue('--manifest', 'skyevault-bins.json'));
  return { file, manifest: readJson(file) };
}

function findBin(manifest, id) {
  const bin = manifest.bins.find((item) => item.id === id);
  if (!bin) throw new Error(`Unknown bin "${id}". Run npm run vault:bins:list.`);
  return bin;
}

function collectFiles(bin, options = {}) {
  const files = [];
  const missing = [];
  const skipped = [];
  const maxBytes = Number(argValue('--max-file-mb', '75')) * 1024 * 1024;
  const seen = new Set();
  const ownedBy = options.ownedBy || new Map();
  const dedupe = Boolean(options.dedupe);

  function walk(abs) {
    const stat = fs.lstatSync(abs);
    if (stat.isSymbolicLink()) {
      skipped.push({ path: rel(abs), reason: 'symlink' });
      return;
    }
    if (stat.isDirectory()) {
      const base = path.basename(abs);
      if (['node_modules', '.git', '.wrangler', '.cache', '.skyevault-out'].includes(base)) {
        skipped.push({ path: rel(abs), reason: 'excluded-dir' });
        return;
      }
      for (const entry of fs.readdirSync(abs).sort()) walk(path.join(abs, entry));
      return;
    }
    if (!stat.isFile()) return;
    if (stat.size > maxBytes) {
      skipped.push({ path: rel(abs), reason: 'max-file-mb', bytes: stat.size });
      return;
    }
    const clean = rel(abs);
    if (seen.has(clean)) return;
    if (dedupe && ownedBy.has(clean)) {
      skipped.push({ path: clean, reason: 'dedupe-owner', ownerBinId: ownedBy.get(clean), bytes: stat.size });
      return;
    }
    seen.add(clean);
    files.push({ path: clean, bytes: stat.size });
  }

  for (const item of bin.paths || []) {
    const abs = path.resolve(repoRoot, item);
    if (!fs.existsSync(abs)) {
      missing.push(item);
      continue;
    }
    walk(abs);
  }

  if (missing.length && !bin.allowMissing && !args.includes('--allow-missing')) {
    throw new Error(`Bin ${bin.id} has missing paths: ${missing.join(', ')}`);
  }
  return { files, missing, skipped };
}

function binPriority(bin) {
  const value = Number(bin.exportPriority);
  return Number.isFinite(value) ? value : 100;
}

function selectedExportBins(manifest) {
  const requested = argValues('--bin');
  const ids = requested.length
    ? requested
    : (manifest.export?.defaultBinIds || manifest.bins.map((bin) => bin.id));
  const unique = [...new Set(ids)];
  return unique
    .map((id) => findBin(manifest, id))
    .filter((bin) => bin.exportEnabled !== false)
    .sort((a, b) => binPriority(a) - binPriority(b) || a.id.localeCompare(b.id));
}

function commandList() {
  const { manifest } = loadManifest();
  console.log(JSON.stringify({
    ok: true,
    schema: manifest.schema,
    status: manifest.status,
    bins: manifest.bins.map((bin) => ({
      id: bin.id,
      label: bin.label,
      pathCount: bin.paths.length,
      purpose: bin.purpose
    }))
  }, null, 2));
}

function packBin({ manifestFile, bin, collection }) {
  const stamp = utcStamp();
  const id = bin.id;
  const outDir = path.resolve(repoRoot, '.skyevault-out', 'bins', id, stamp);
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const pathsFile = path.join(outDir, 'paths.txt');
  const boundaryFile = path.join(outDir, 'source-boundary.json');
  const packOut = path.join(outDir, `${id}-${stamp}.skyesecrets`);
  const passphrase = process.env.SKYEVAULT_BIN_PASSPHRASE || crypto.randomBytes(48).toString('base64');
  const pepper = process.env.SKYEVAULT_BIN_PEPPER || crypto.randomBytes(32).toString('hex');

  fs.writeFileSync(pathsFile, `${collection.files.map((item) => item.path).join('\n')}\n`, { mode: 0o600 });
  writeJson(boundaryFile, {
    schema: 'skyevault.bin.source-boundary.v1',
    generatedAt: new Date().toISOString(),
    manifest: rel(manifestFile),
    bin: {
      id: bin.id,
      label: bin.label,
      purpose: bin.purpose,
      allowMissing: Boolean(bin.allowMissing)
    },
    files: collection.files,
    missing: collection.missing,
    skipped: collection.skipped,
    fileListSha256: sha256Text(collection.files.map((item) => `${item.path}\t${item.bytes}`).join('\n'))
  });

  const child = spawnSync(process.execPath, [
    'tools/skye-secure-packs.mjs',
    'pack',
    '--root=.',
    `--paths-file=${rel(pathsFile)}`,
    `--source-boundary=${rel(boundaryFile)}`,
    `--out=${rel(packOut)}`,
    '--workspace=owner-admin',
    '--repo=MetrAIyux-0S',
    `--project=SkyeVault Bin: ${bin.label}`,
    '--recipient=owner',
    '--passphrase-env=SKYEVAULT_BIN_PASSPHRASE',
    '--pepper-env=SKYEVAULT_BIN_PEPPER',
    '--allow-missing',
    '--max-file-mb=75'
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SKYEVAULT_BIN_PASSPHRASE: passphrase,
      SKYEVAULT_BIN_PEPPER: pepper
    },
    encoding: 'utf8'
  });

  if (child.status !== 0) {
    process.stderr.write(child.stderr || child.stdout || '');
    process.exit(child.status || 1);
  }

  const parsed = JSON.parse(child.stdout || '{}');
  writeJson(path.join(outDir, 'bin-pack-receipt.json'), {
    ok: true,
    generatedAt: new Date().toISOString(),
    binId: bin.id,
    binLabel: bin.label,
    fileCount: collection.files.length,
    missingCount: collection.missing.length,
    skippedCount: collection.skipped.length,
    sourceBoundary: rel(boundaryFile),
    pathsFile: rel(pathsFile),
    pack: parsed
  });

  return {
    ok: true,
    binId: bin.id,
    binLabel: bin.label,
    fileCount: collection.files.length,
    missingCount: collection.missing.length,
    skippedCount: collection.skipped.length,
    skippedByDedupeCount: collection.skipped.filter((item) => item.reason === 'dedupe-owner').length,
    packPath: parsed.packPath,
    receipt: rel(path.join(outDir, 'bin-pack-receipt.json')),
    handoffPath: parsed.handoffPath,
    note: 'Private handoff contains passphrase material and must not be printed, committed, or pasted into public chat.'
  };
}

function uploadBinPack({ bin, collection, summary }) {
  const packPath = summary.packPath ? path.resolve(repoRoot, summary.packPath) : '';
  if (!packPath || !fs.existsSync(packPath)) {
    return { ok: false, skipped: true, reason: 'pack path missing' };
  }
  const result = spawnSync(process.execPath, [
    'tools/skyevault-repo-push.mjs',
    `--upload-archive=${packPath}`,
    `--file-count=${collection.files.length}`,
    '--secret-excludes=0',
    '--mime-type=application/octet-stream',
    `--asset-type=SkyeVault encrypted bin pack`,
    `--project-name=SkyeVault Bin: ${bin.label}`,
    `--client-reference=bin:${bin.id}:${utcStamp()}`,
    `--notes=Encrypted SkyeVault companion bin export for ${bin.id}. File bodies are already encrypted in a SkyeSecure pack before upload.`
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const receiptPath = stdout.split(/\r?\n/).map((line) => line.match(/Receipt written:\s*(.+)$/)?.[1]).find(Boolean) || '';
  return {
    ok: result.status === 0,
    status: result.status,
    receiptPath: receiptPath ? rel(path.resolve(repoRoot, receiptPath)) : '',
    stdoutTail: stdout.slice(-1600),
    stderrTail: stderr.slice(-1600)
  };
}

function dryRunBin({ bin, collection }) {
  return {
    ok: true,
    dryRun: true,
    binId: bin.id,
    binLabel: bin.label,
    exportLane: bin.exportLane || 'default',
    fileCount: collection.files.length,
    missingCount: collection.missing.length,
    skippedCount: collection.skipped.length,
    skippedByDedupeCount: collection.skipped.filter((item) => item.reason === 'dedupe-owner').length,
    fileListSha256: sha256Text(collection.files.map((item) => `${item.path}\t${item.bytes}`).join('\n')),
    sampleFiles: collection.files.slice(0, 20)
  };
}

function commandPack() {
  const { file: manifestFile, manifest } = loadManifest();
  const id = argValue('--bin', argValue('--id'));
  if (!id) throw new Error('--bin=<id> is required.');
  const bin = findBin(manifest, id);
  const collection = collectFiles(bin);
  const summary = flag('--dry-run')
    ? dryRunBin({ bin, collection })
    : packBin({ manifestFile, bin, collection });
  console.log(JSON.stringify(summary, null, 2));
}

function commandExport() {
  const { file: manifestFile, manifest } = loadManifest();
  const dedupe = !flag('--no-dedupe') && manifest.export?.dedupe !== false;
  const upload = flag('--upload') || envFlag('SKYEVAULT_BIN_UPLOAD', false);
  const ownedBy = new Map();
  const bins = selectedExportBins(manifest);
  const results = [];

  for (const bin of bins) {
    const collection = collectFiles(bin, { dedupe, ownedBy });
    for (const item of collection.files) ownedBy.set(item.path, bin.id);
    const summary = flag('--dry-run')
      ? dryRunBin({ bin, collection })
      : packBin({ manifestFile, bin, collection });
    if (upload && !flag('--dry-run')) {
      summary.upload = uploadBinPack({ bin, collection, summary });
      if (summary.upload && !summary.upload.ok) summary.ok = false;
    }
    results.push(summary);
  }

  const receipt = {
    ok: results.every((item) => item.ok),
    schema: 'skyevault.bin-export-receipt.v1',
    generatedAt: new Date().toISOString(),
    dryRun: flag('--dry-run'),
    dedupe,
    upload,
    manifest: rel(manifestFile),
    binCount: results.length,
    totalFiles: results.reduce((sum, item) => sum + (item.fileCount || 0), 0),
    skippedByDedupeCount: results.reduce((sum, item) => sum + (item.skippedByDedupeCount || 0), 0),
    results
  };

  if (!flag('--dry-run')) {
    const outDir = path.resolve(repoRoot, '.skyevault-out', 'bins', 'exports');
    const receiptPath = path.join(outDir, `bin-export-${utcStamp()}.json`);
    writeJson(receiptPath, receipt);
    writeJson(path.join(outDir, 'latest-export.json'), receipt);
    receipt.receiptPath = rel(receiptPath);
  }

  console.log(JSON.stringify(receipt, null, 2));
}

if (command === 'list') commandList();
else if (command === 'pack') commandPack();
else if (command === 'export') commandExport();
else {
  console.error('Usage: node tools/skyevault-bin-pack.mjs list|pack|export --bin=<id>');
  process.exit(2);
}
