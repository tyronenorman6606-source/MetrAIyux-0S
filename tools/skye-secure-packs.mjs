#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_PBKDF2_ITERATIONS,
  addWrappedRecipient,
  buildPayloadFromFiles,
  buildSecretPack,
  collectFiles,
  decryptSecretPayload,
  generateX25519KeyPair,
  hashFile,
  packPublicSummary,
  readSecretPack,
  removeWrappedRecipient,
  restorePayloadFiles,
  sha256Text,
  utcStamp,
  validateSecretPack,
  writeSecretPack
} from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      parsed._.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    let key;
    let value;
    if (eq >= 0) {
      key = arg.slice(2, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        value = argv[index + 1];
        index += 1;
      } else {
        value = true;
      }
    }
    if (parsed[key] === undefined) parsed[key] = value;
    else if (Array.isArray(parsed[key])) parsed[key].push(value);
    else parsed[key] = [parsed[key], value];
  }
  return parsed;
}

const args = parseArgs(rawArgs);
const command = args._[0] || 'help';

function values(name) {
  const value = args[name];
  if (value === undefined || value === true) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function value(name, fallback = '') {
  const found = values(name);
  return found.length ? found[found.length - 1] : fallback;
}

function bool(name) {
  const found = args[name];
  if (found === undefined) return false;
  if (found === true) return true;
  return !['0', 'false', 'no', 'off'].includes(String(Array.isArray(found) ? found.at(-1) : found).toLowerCase());
}

function resolvePath(input, fallback = '') {
  const clean = String(input || fallback || '').trim();
  if (!clean) return '';
  return path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
}

function sanitizeName(input, fallback = 'recipient') {
  return String(input || fallback).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function envSecret(name, label = name) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error(`${label} is required.`);
  const value = process.env[clean];
  if (!value) throw new Error(`Missing environment secret: ${clean}`);
  return value;
}

function jsonOut(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function receiptPath(kind) {
  return path.join(repoRoot, '.skyevault-out', 'skye-secure', `skyesecure-${kind}-${utcStamp()}.json`);
}

function writeReceipt(kind, data) {
  const file = receiptPath(kind);
  writeJson(file, {
    schema: 'skye.secure.local-receipt.v2',
    kind,
    recordedAt: new Date().toISOString(),
    host: os.hostname(),
    ...data
  });
  return file;
}

function readLines(file) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function collectRequestedPaths() {
  const requested = [];
  for (const item of values('path')) requested.push(item);
  for (const item of values('paths')) {
    for (const piece of item.split(',')) {
      if (piece.trim()) requested.push(piece.trim());
    }
  }
  for (const file of values('paths-file')) {
    requested.push(...readLines(resolvePath(file)));
  }
  const unique = [];
  const seen = new Set();
  for (const item of requested) {
    const clean = item.replace(/\\/g, '/').replace(/^\.\/+/, '').trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    unique.push(clean);
  }
  return unique;
}

function loadPublicKeyRecipient(spec) {
  const [recipientIdRaw, fileRaw] = String(spec || '').split(':');
  if (!recipientIdRaw || !fileRaw) {
    throw new Error(`Invalid --recipient-key value. Use recipientId:path/to/public-key.json`);
  }
  const recipientId = sanitizeName(recipientIdRaw);
  const file = resolvePath(fileRaw);
  const key = readJson(file);
  if (!key.publicKeyPem) throw new Error(`Public key file is missing publicKeyPem: ${file}`);
  return {
    type: 'x25519-public-key',
    recipientId,
    publicKeyPem: key.publicKeyPem
  };
}

function loadPrivateKey(fileRaw) {
  const file = resolvePath(fileRaw);
  const parsed = readJson(file);
  if (!parsed.privateKeyPem) throw new Error(`Private key file is missing privateKeyPem: ${file}`);
  return parsed.privateKeyPem;
}

function unlockOptions() {
  const privateKeyFile = value('private-key');
  if (privateKeyFile) {
    return {
      privateKeyPem: loadPrivateKey(privateKeyFile),
      recipientId: value('recipient', '')
    };
  }
  const passphraseEnv = value('passphrase-env', 'SKYE_SECURE_PASSPHRASE');
  return {
    passphrase: envSecret(passphraseEnv, '--passphrase-env'),
    pepper: value('pepper-env') ? envSecret(value('pepper-env'), '--pepper-env') : '',
    recipientId: value('recipient', '')
  };
}

function safePackSummary(pack) {
  return packPublicSummary(pack);
}

async function commandKeygen() {
  const recipientId = sanitizeName(value('recipient', value('name', 'owner')));
  const outDir = resolvePath(value('out-dir', '.skyevault-out/skye-secure/keys'));
  const createdAt = new Date().toISOString();
  const pair = generateX25519KeyPair();
  const publicKey = {
    schema: 'skye.secure.x25519-public-key.v1',
    type: 'x25519-public-key',
    recipientId,
    createdAt,
    publicKeyFingerprint: pair.publicKeyFingerprint,
    publicKeyPem: pair.publicKeyPem
  };
  const privateKey = {
    schema: 'skye.secure.x25519-private-key.v1',
    type: 'x25519-private-key',
    recipientId,
    createdAt,
    publicKeyFingerprint: pair.publicKeyFingerprint,
    privateKeyPem: pair.privateKeyPem
  };
  const publicKeyPath = path.join(outDir, `${recipientId}.public.json`);
  const privateKeyPath = path.join(outDir, `${recipientId}.private.json`);
  writeJson(publicKeyPath, publicKey, 0o644);
  writeJson(privateKeyPath, privateKey, 0o600);
  const receipt = writeReceipt('keygen', {
    ok: true,
    recipientId,
    publicKeyFingerprint: pair.publicKeyFingerprint,
    publicKeyPath,
    privateKeyPath
  });
  jsonOut({ ok: true, recipientId, publicKeyFingerprint: pair.publicKeyFingerprint, publicKeyPath, privateKeyPath, receipt });
}

async function commandPack() {
  const root = resolvePath(value('root', '.'));
  const paths = collectRequestedPaths();
  if (!paths.length) {
    throw new Error('No secret paths were provided. Use --path, --paths, or --paths-file from `npm run vault:secrets:manifest`.');
  }

  const passphraseEnv = value('passphrase-env');
  const recipients = [];
  if (passphraseEnv) {
    recipients.push({
      type: 'passphrase',
      recipientId: sanitizeName(value('recipient', 'owner')),
      passphrase: envSecret(passphraseEnv, '--passphrase-env'),
      pepper: value('pepper-env') ? envSecret(value('pepper-env'), '--pepper-env') : '',
      hint: value('hint', ''),
      iterations: Number(value('iterations', DEFAULT_PBKDF2_ITERATIONS))
    });
  }
  for (const spec of values('recipient-key')) recipients.push(loadPublicKeyRecipient(spec));
  if (!recipients.length) {
    throw new Error('At least one recipient is required. Use --passphrase-env or --recipient-key.');
  }

  const sourceBoundaryFile = value('source-boundary');
  const sourceBoundaryPath = sourceBoundaryFile ? resolvePath(sourceBoundaryFile) : '';
  const sourceBoundary = sourceBoundaryPath ? readJson(sourceBoundaryPath) : null;
  const sourceBoundarySha256 = sourceBoundaryPath
    ? await hashFile(sourceBoundaryPath)
    : sha256Text(paths.slice().sort().join('\n'));
  const maxFileMb = Number(value('max-file-mb', '50'));
  const collection = collectFiles({
    root,
    paths,
    allowMissing: bool('allow-missing'),
    includeSymlinks: bool('include-symlinks'),
    maxFileBytes: Number.isFinite(maxFileMb) ? Math.max(1, maxFileMb) * 1024 * 1024 : DEFAULT_MAX_FILE_BYTES
  });
  const payload = buildPayloadFromFiles({
    collection,
    sourceBoundary,
    restorePolicy: {
      defaultOverwrite: false,
      requireExplicitForceForOverwrite: true,
      product: 'SkyeSecure Secret Packs'
    }
  });

  const out = resolvePath(value('out', path.join('.skyevault-out', 'skye-secure', `skyesecure-${utcStamp()}.skyesecrets`)));
  const { pack } = buildSecretPack({
    payload,
    recipients,
    metadata: {
      workspaceId: value('workspace', value('workspace-id', '')),
      repoId: value('repo', value('repo-id', path.basename(root))),
      clientName: value('client', ''),
      projectName: value('project', ''),
      notes: value('notes', 'Encrypted before vault upload. Public metadata intentionally excludes secret values.'),
      fileCount: collection.files.length,
      plaintextBytes: collection.plaintextBytes,
      sourceBoundarySha256,
      sourceBoundaryRef: sourceBoundaryPath ? path.relative(repoRoot, sourceBoundaryPath).split(path.sep).join('/') : 'inline-reviewed-path-list',
      restoreRootHint: value('restore-root-hint', path.basename(root))
    }
  });

  writeSecretPack(out, pack);
  const packSha256 = await hashFile(out);
  const summary = safePackSummary(pack);
  const receipt = writeReceipt('pack', {
    ok: true,
    packPath: out,
    packSha256,
    summary,
    source: {
      root,
      requestedPathCount: paths.length,
      packedFileCount: collection.files.length,
      missingCount: collection.missing.length,
      skippedCount: collection.skipped.length,
      plaintextBytes: collection.plaintextBytes
    }
  });

  // Auto-write private handoff so the passphrase is never lost.
  // This file is chmod 600 and lives only in .skyevault-out — never commit it.
  const handoffPath = receipt.replace(/\.json$/, '.skyehandoff.json');
  const passphraseValues = recipients
    .filter((r) => r.type === 'passphrase')
    .map((r) => ({ recipientId: r.recipientId, passphrase: r.passphrase || '', pepper: r.pepper || '' }));
  writeJson(handoffPath, {
    schema: 'skye.secure.private-handoff.v1',
    warning: 'PRIVATE — contains plaintext passphrase. Do not commit or share.',
    generatedAt: new Date().toISOString(),
    packPath: out,
    packSha256,
    packId: pack.publicManifest.packId,
    recipients: passphraseValues,
    cliUnlockCommand: passphraseValues.length
      ? `SKYE_SECURE_PASSPHRASE="${passphraseValues[0].passphrase}" node tools/skye-secure-packs.mjs unlock --pack "${out}" --out .skyevault-out/restored/`
      : '(no passphrase recipients — use --private-key to unlock)'
  }, 0o600);

  jsonOut({ ok: true, packPath: out, handoffPath, receipt, summary });
}

async function commandInspect() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const pack = readSecretPack(packFile);
  jsonOut({ ok: true, packPath: packFile, packSha256: await hashFile(packFile), summary: safePackSummary(pack) });
}

async function commandVerify() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const pack = readSecretPack(packFile);
  const envelope = validateSecretPack(pack);
  let payload = null;
  let payloadVerified = false;
  if (value('private-key') || value('passphrase-env')) {
    const decrypted = decryptSecretPayload(pack, unlockOptions());
    payload = decrypted.payload;
    payloadVerified = true;
  }
  const receipt = writeReceipt('verify', {
    ok: true,
    packPath: packFile,
    packSha256: await hashFile(packFile),
    envelopeVerified: true,
    payloadVerified,
    fileCount: payload?.files?.length || pack.publicManifest.fileCount
  });
  jsonOut({
    ok: true,
    packPath: packFile,
    receipt,
    envelopeVerified: true,
    payloadVerified,
    fileCount: payload?.files?.length || pack.publicManifest.fileCount,
    publicManifestSha256: envelope.publicManifestSha256,
    encryptedPayloadSha256: envelope.encryptedPayloadSha256
  });
}

async function commandRestore() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const root = resolvePath(value('root', value('out-dir', '.')));
  const pack = readSecretPack(packFile);
  const { payload } = decryptSecretPayload(pack, unlockOptions());
  const result = restorePayloadFiles({
    payload,
    root,
    force: bool('force'),
    dryRun: bool('dry-run')
  });
  const receipt = writeReceipt('restore', {
    ok: result.conflicts.length === 0,
    packPath: packFile,
    packSha256: await hashFile(packFile),
    restoreRoot: root,
    dryRun: result.dryRun,
    restoredCount: result.restored.length,
    conflictCount: result.conflicts.length,
    restored: result.restored.map(({ path: itemPath, size, sha256 }) => ({ path: itemPath, size, sha256 })),
    conflicts: result.conflicts.map(({ path: itemPath, reason }) => ({ path: itemPath, reason }))
  });
  jsonOut({ ok: result.conflicts.length === 0, receipt, ...result });
  if (result.conflicts.length) process.exitCode = 2;
}

async function commandGrant() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const out = resolvePath(value('out', packFile.replace(/\.skyesecrets$/i, `-granted-${utcStamp()}.skyesecrets`)));
  const pack = readSecretPack(packFile);
  const { contentKey } = decryptSecretPayload(pack, unlockOptions());
  let next = pack;
  const newPassphraseEnv = value('new-passphrase-env');
  if (newPassphraseEnv) {
    next = addWrappedRecipient(next, {
      type: 'passphrase',
      recipientId: sanitizeName(value('new-recipient', 'approved-developer')),
      passphrase: envSecret(newPassphraseEnv, '--new-passphrase-env'),
      pepper: value('new-pepper-env') ? envSecret(value('new-pepper-env'), '--new-pepper-env') : '',
      hint: value('new-hint', ''),
      iterations: Number(value('iterations', DEFAULT_PBKDF2_ITERATIONS))
    }, contentKey);
  }
  for (const spec of values('recipient-key')) {
    next = addWrappedRecipient(next, loadPublicKeyRecipient(spec), contentKey);
  }
  if (next === pack) throw new Error('No new recipient was provided. Use --new-passphrase-env or --recipient-key.');
  writeSecretPack(out, next);
  const receipt = writeReceipt('grant', {
    ok: true,
    sourcePackPath: packFile,
    outputPackPath: out,
    outputPackSha256: await hashFile(out),
    summary: safePackSummary(next)
  });
  jsonOut({ ok: true, packPath: out, receipt, summary: safePackSummary(next) });
}

async function commandRevoke() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const recipientRaw = value('recipient');
  if (!recipientRaw) throw new Error('--recipient is required.');
  const recipientId = sanitizeName(recipientRaw);
  const out = resolvePath(value('out', packFile.replace(/\.skyesecrets$/i, `-revoked-${utcStamp()}.skyesecrets`)));
  const pack = readSecretPack(packFile);
  const next = removeWrappedRecipient(pack, recipientId);
  writeSecretPack(out, next);
  const warning = 'Revocation removes this recipient from the new pack only. Anyone with an older pack copy and its key may still decrypt that older copy.';
  const receipt = writeReceipt('revoke', {
    ok: true,
    sourcePackPath: packFile,
    outputPackPath: out,
    revokedRecipientId: recipientId,
    warning,
    summary: safePackSummary(next)
  });
  jsonOut({ ok: true, packPath: out, receipt, warning, summary: safePackSummary(next) });
}

async function commandRotate() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const pack = readSecretPack(packFile);
  const { payload } = decryptSecretPayload(pack, unlockOptions());
  const recipients = [];
  const newPassphraseEnv = value('new-passphrase-env', value('passphrase-env'));
  if (newPassphraseEnv) {
    recipients.push({
      type: 'passphrase',
      recipientId: sanitizeName(value('new-recipient', value('recipient', 'owner'))),
      passphrase: envSecret(newPassphraseEnv, '--new-passphrase-env'),
      pepper: value('new-pepper-env') ? envSecret(value('new-pepper-env'), '--new-pepper-env') : '',
      hint: value('new-hint', ''),
      iterations: Number(value('iterations', DEFAULT_PBKDF2_ITERATIONS))
    });
  }
  for (const spec of values('recipient-key')) recipients.push(loadPublicKeyRecipient(spec));
  if (!recipients.length) throw new Error('Rotation requires at least one new recipient.');
  const out = resolvePath(value('out', packFile.replace(/\.skyesecrets$/i, `-rotated-${utcStamp()}.skyesecrets`)));
  const { pack: next } = buildSecretPack({
    payload,
    recipients,
    metadata: {
      ...pack.publicManifest,
      packId: '',
      notes: `${pack.publicManifest.notes || ''} Rotated at ${new Date().toISOString()}.`.trim()
    }
  });
  writeSecretPack(out, next);
  const receipt = writeReceipt('rotate', {
    ok: true,
    sourcePackPath: packFile,
    outputPackPath: out,
    outputPackSha256: await hashFile(out),
    summary: safePackSummary(next)
  });
  jsonOut({ ok: true, packPath: out, receipt, summary: safePackSummary(next) });
}

async function commandUpload() {
  const packFile = resolvePath(value('pack', value('file')));
  if (!packFile) throw new Error('--pack is required.');
  const pack = readSecretPack(packFile);
  const summary = safePackSummary(pack);
  const uploadArgs = [
    path.join(repoRoot, 'tools', 'skyevault-repo-push.mjs'),
    `--upload-archive=${packFile}`,
    '--mime-type=application/vnd.skyesecure.secret-pack',
    '--asset-type=Encrypted SkyeSecure secret pack',
    `--project-name=${summary.projectName || 'SkyeSecure Secret Pack'}`,
    `--client-reference=skyesecure:${summary.packId}`,
    `--notes=Encrypted SkyeSecure Secret Pack. Public file count ${summary.fileCount}; plaintext remains client-side encrypted.`
  ];
  if (bool('dry-run')) uploadArgs.push('--dry-run');
  const result = spawnSync(process.execPath, uploadArgs, { cwd: repoRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status || 0;
}

function printHelp() {
  process.stdout.write(`SkyeSecure Secret Packs

Commands:
  keygen   --recipient=dev --out-dir=.skyevault-out/skye-secure/keys
  pack     --root=. --paths-file=.skyevault-out/secret-boundary/latest.paths.txt --out=client.skyesecrets --passphrase-env=SKYE_SECURE_PASSPHRASE
  inspect  --pack=client.skyesecrets
  verify   --pack=client.skyesecrets --recipient=owner --passphrase-env=SKYE_SECURE_PASSPHRASE [--pepper-env=SKYE_SECURE_PEPPER]
  restore  --pack=client.skyesecrets --root=restore-dir --recipient=owner --passphrase-env=SKYE_SECURE_PASSPHRASE [--force] [--dry-run]
  grant    --pack=client.skyesecrets --out=client-granted.skyesecrets --passphrase-env=SKYE_SECURE_PASSPHRASE --recipient-key=dev:path/to/dev.public.json
  revoke   --pack=client-granted.skyesecrets --out=client-revoked.skyesecrets --recipient=owner
  rotate   --pack=client.skyesecrets --out=client-rotated.skyesecrets --passphrase-env=OLD_PASS --new-passphrase-env=NEW_PASS
  upload   --pack=client.skyesecrets

Inputs:
  --path may be repeated. --paths accepts comma-separated paths. --paths-file reads one path per line.
  --recipient-key uses recipientId:path/to/public-key.json.
  --private-key uses a keygen private JSON file for X25519 recipients.
`);
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === 'keygen') return commandKeygen();
  if (command === 'pack') return commandPack();
  if (command === 'inspect') return commandInspect();
  if (command === 'verify') return commandVerify();
  if (command === 'restore') return commandRestore();
  if (command === 'grant') return commandGrant();
  if (command === 'revoke') return commandRevoke();
  if (command === 'rotate') return commandRotate();
  if (command === 'upload') return commandUpload();
  throw new Error(`Unknown command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(`SkyeSecure error: ${error.message}`);
  process.exitCode = 1;
}
