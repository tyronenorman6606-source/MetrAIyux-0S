import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SKYESECURE2_MARKER = 'SKYESEC2';
export const SKYESECURE2_SCHEMA = 'skye.secure.secret-pack.v2';
export const SKYESECURE2_FORMAT = 'skye-secure-secret-pack-v2';
export const DEFAULT_PBKDF2_ITERATIONS = 310000;
export const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export function utcStamp(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

export function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(value) {
  return Buffer.from(String(value || ''), 'base64');
}

export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

export async function hashFile(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function stableValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function normalizeRelativePath(input) {
  const clean = String(input || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!clean || clean === '.' || clean.includes('\0')) throw new Error(`Invalid restore path: ${input}`);
  const normalized = path.posix.normalize(clean);
  if (normalized === '.' || normalized.startsWith('../') || normalized === '..' || path.isAbsolute(normalized)) {
    throw new Error(`Unsafe restore path: ${input}`);
  }
  return normalized;
}

export function safeJoin(root, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, normalized);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes restore root: ${relativePath}`);
  }
  return target;
}

export function randomBytes(size) {
  return crypto.randomBytes(size);
}

function aadBytes(value) {
  return TEXT_ENCODER.encode(String(value || ''));
}

export function encryptAesGcm(keyBytes, plainBytes, aad = '') {
  const iv = randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyBytes), iv);
  if (aad) cipher.setAAD(aadBytes(aad));
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plainBytes)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(encrypted),
    tag: bytesToBase64(tag),
    aad
  };
}

export function decryptAesGcm(keyBytes, encryptedBlock) {
  if (!encryptedBlock || encryptedBlock.alg !== 'AES-256-GCM') throw new Error('Unsupported encrypted block.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyBytes), base64ToBytes(encryptedBlock.iv));
  if (encryptedBlock.aad) decipher.setAAD(aadBytes(encryptedBlock.aad));
  decipher.setAuthTag(base64ToBytes(encryptedBlock.tag));
  return Buffer.concat([
    decipher.update(base64ToBytes(encryptedBlock.cipher)),
    decipher.final()
  ]);
}

export function derivePassphraseKey({ passphrase, salt, iterations = DEFAULT_PBKDF2_ITERATIONS, pepper = '' }) {
  if (!passphrase) throw new Error('Passphrase is required.');
  const material = `${String(passphrase)}\0skyesecure-pepper\0${String(pepper || '')}`;
  return crypto.pbkdf2Sync(material, Buffer.from(salt), Number(iterations), 32, 'sha256');
}

export function fingerprintPublicKey(publicKeyPem) {
  const key = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return sha256Bytes(key).slice(0, 32);
}

export function generateX25519KeyPair() {
  const pair = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return {
    publicKeyPem: pair.publicKey,
    privateKeyPem: pair.privateKey,
    publicKeyFingerprint: fingerprintPublicKey(pair.publicKey)
  };
}

function wrapAad(packId, recipientId) {
  return `${SKYESECURE2_MARKER}|wrap|${packId}|${recipientId}`;
}

export function wrapContentKeyWithPassphrase({ contentKey, packId, recipientId = 'owner', passphrase, hint = '', pepper = '', iterations = DEFAULT_PBKDF2_ITERATIONS }) {
  const salt = randomBytes(32);
  const wrapKey = derivePassphraseKey({ passphrase, salt, iterations, pepper });
  const encryptedKey = encryptAesGcm(wrapKey, contentKey, wrapAad(packId, recipientId));
  return {
    type: 'passphrase',
    recipientId,
    hint: String(hint || ''),
    kdf: 'PBKDF2-SHA256',
    iterations: Number(iterations),
    salt: bytesToBase64(salt),
    pepperRequired: Boolean(pepper),
    encryptedKey
  };
}

export function unwrapContentKeyWithPassphrase({ wrappedKey, packId, passphrase, pepper = '' }) {
  if (!wrappedKey || wrappedKey.type !== 'passphrase') throw new Error('Wrapped key is not passphrase-based.');
  const wrapKey = derivePassphraseKey({
    passphrase,
    salt: base64ToBytes(wrappedKey.salt),
    iterations: wrappedKey.iterations,
    pepper
  });
  return decryptAesGcm(wrapKey, { ...wrappedKey.encryptedKey, aad: wrapAad(packId, wrappedKey.recipientId) });
}

export function wrapContentKeyWithPublicKey({ contentKey, packId, recipientId, publicKeyPem }) {
  if (!recipientId) throw new Error('Public-key recipientId is required.');
  const recipientPublicKey = crypto.createPublicKey(publicKeyPem);
  const ephemeral = crypto.generateKeyPairSync('x25519');
  const shared = crypto.diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipientPublicKey });
  const salt = randomBytes(32);
  const info = Buffer.from(`${SKYESECURE2_MARKER}|x25519|${packId}|${recipientId}`);
  const wrapKey = Buffer.from(crypto.hkdfSync('sha256', shared, salt, info, 32));
  const encryptedKey = encryptAesGcm(wrapKey, contentKey, wrapAad(packId, recipientId));
  const ephemeralPublicKeyPem = ephemeral.publicKey.export({ type: 'spki', format: 'pem' });
  return {
    type: 'x25519-public-key',
    recipientId,
    recipientPublicKeyFingerprint: fingerprintPublicKey(publicKeyPem),
    ephemeralPublicKeyPem,
    kdf: 'HKDF-SHA256',
    salt: bytesToBase64(salt),
    encryptedKey
  };
}

export function unwrapContentKeyWithPrivateKey({ wrappedKey, packId, privateKeyPem }) {
  if (!wrappedKey || wrappedKey.type !== 'x25519-public-key') throw new Error('Wrapped key is not public-key based.');
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const ephemeralPublicKey = crypto.createPublicKey(wrappedKey.ephemeralPublicKeyPem);
  const shared = crypto.diffieHellman({ privateKey, publicKey: ephemeralPublicKey });
  const info = Buffer.from(`${SKYESECURE2_MARKER}|x25519|${packId}|${wrappedKey.recipientId}`);
  const wrapKey = Buffer.from(crypto.hkdfSync('sha256', shared, base64ToBytes(wrappedKey.salt), info, 32));
  return decryptAesGcm(wrapKey, { ...wrappedKey.encryptedKey, aad: wrapAad(packId, wrappedKey.recipientId) });
}

function payloadAad(packId) {
  return `${SKYESECURE2_MARKER}|payload|${packId}`;
}

export function buildSecretPack({ payload, recipients = [], metadata = {}, createdAt = new Date().toISOString() }) {
  if (!Array.isArray(recipients) || recipients.length === 0) throw new Error('At least one recipient is required.');
  const packId = metadata.packId || `skyesec_${crypto.randomUUID()}`;
  const contentKey = randomBytes(32);
  const payloadText = stableJson({
    schema: 'skye.secure.secret-payload.v2',
    createdAt,
    ...payload
  });
  const payloadBytes = TEXT_ENCODER.encode(payloadText);
  const encryptedPayload = encryptAesGcm(contentKey, payloadBytes, payloadAad(packId));
  const encryptedPayloadBytes = base64ToBytes(encryptedPayload.cipher);
  encryptedPayload.bytes = encryptedPayloadBytes.length;
  encryptedPayload.sha256 = sha256Bytes(encryptedPayloadBytes);

  const wrappedKeys = recipients.map((recipient) => {
    if (recipient.type === 'passphrase') {
      return wrapContentKeyWithPassphrase({ ...recipient, contentKey, packId });
    }
    if (recipient.type === 'x25519-public-key') {
      return wrapContentKeyWithPublicKey({ ...recipient, contentKey, packId });
    }
    throw new Error(`Unsupported recipient type: ${recipient.type}`);
  });

  const publicManifest = {
    schema: 'skye.secure.secret-pack-public-manifest.v2',
    packId,
    format: SKYESECURE2_FORMAT,
    createdAt,
    updatedAt: createdAt,
    product: 'SkyeSecure Secret Packs',
    workspaceId: String(metadata.workspaceId || ''),
    repoId: String(metadata.repoId || ''),
    clientName: String(metadata.clientName || ''),
    projectName: String(metadata.projectName || ''),
    assetType: 'Encrypted developer secret pack',
    fileCount: Number(metadata.fileCount || payload.files?.length || 0),
    plaintextBytes: Number(metadata.plaintextBytes || 0),
    encryptedBytes: encryptedPayload.bytes,
    sourceBoundarySha256: String(metadata.sourceBoundarySha256 || ''),
    sourceBoundaryRef: String(metadata.sourceBoundaryRef || ''),
    restoreRootHint: String(metadata.restoreRootHint || ''),
    algorithm: {
      payload: 'AES-256-GCM',
      passphraseKdf: 'PBKDF2-SHA256',
      publicKeyWrap: 'X25519-HKDF-SHA256'
    },
    notes: String(metadata.notes || '')
  };

  const pack = {
    schema: SKYESECURE2_SCHEMA,
    marker: SKYESECURE2_MARKER,
    format: SKYESECURE2_FORMAT,
    encrypted: true,
    publicManifest,
    encryptedPayload,
    wrappedKeys,
    integrity: {
      publicManifestSha256: sha256Text(stableJson(publicManifest)),
      encryptedPayloadSha256: encryptedPayload.sha256,
      wrappedKeyCount: wrappedKeys.length
    }
  };
  return { pack, contentKey };
}

export function validateSecretPack(pack) {
  if (!pack || typeof pack !== 'object') throw new Error('Pack is not an object.');
  if (pack.schema !== SKYESECURE2_SCHEMA) throw new Error(`Unsupported pack schema: ${pack.schema}`);
  if (pack.marker !== SKYESECURE2_MARKER) throw new Error('Pack marker mismatch.');
  if (pack.format !== SKYESECURE2_FORMAT || pack.encrypted !== true) throw new Error('Unsupported pack format.');
  if (!pack.publicManifest || pack.publicManifest.format !== SKYESECURE2_FORMAT) throw new Error('Pack public manifest is invalid.');
  if (!pack.encryptedPayload || pack.encryptedPayload.alg !== 'AES-256-GCM') throw new Error('Pack encrypted payload is invalid.');
  if (!Array.isArray(pack.wrappedKeys) || pack.wrappedKeys.length === 0) throw new Error('Pack has no wrapped keys.');
  const publicManifestSha256 = sha256Text(stableJson(pack.publicManifest));
  if (pack.integrity?.publicManifestSha256 !== publicManifestSha256) throw new Error('Public manifest SHA-256 mismatch.');
  const encryptedPayloadSha256 = sha256Bytes(base64ToBytes(pack.encryptedPayload.cipher));
  if (pack.integrity?.encryptedPayloadSha256 !== encryptedPayloadSha256 || pack.encryptedPayload.sha256 !== encryptedPayloadSha256) {
    throw new Error('Encrypted payload SHA-256 mismatch.');
  }
  return { ok: true, publicManifestSha256, encryptedPayloadSha256 };
}

export function serializeSecretPack(pack) {
  validateSecretPack(pack);
  return Buffer.concat([
    Buffer.from(SKYESECURE2_MARKER, 'utf8'),
    Buffer.from([0]),
    Buffer.from(JSON.stringify(pack, null, 2), 'utf8'),
    Buffer.from('\n')
  ]);
}

export function parseSecretPack(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const marker = Buffer.from(SKYESECURE2_MARKER, 'utf8');
  const hasMarker = bytes.length > marker.length + 1 && bytes.subarray(0, marker.length).equals(marker) && bytes[marker.length] === 0;
  const raw = hasMarker ? bytes.subarray(marker.length + 1).toString('utf8') : bytes.toString('utf8');
  const pack = JSON.parse(raw);
  validateSecretPack(pack);
  return pack;
}

export function readSecretPack(file) {
  return parseSecretPack(fs.readFileSync(file));
}

export function writeSecretPack(file, pack) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, serializeSecretPack(pack), { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}

export function selectWrappedKey(pack, { recipientId = '', type = '' } = {}) {
  const keys = pack.wrappedKeys.filter((key) => (!recipientId || key.recipientId === recipientId) && (!type || key.type === type));
  if (keys.length === 0) throw new Error(`No wrapped key found${recipientId ? ` for ${recipientId}` : ''}${type ? ` (${type})` : ''}.`);
  if (keys.length > 1 && !recipientId) throw new Error('Multiple wrapped keys match. Pass --recipient=<id>.');
  return keys[0];
}

export function decryptSecretPayload(pack, { passphrase = '', pepper = '', privateKeyPem = '', recipientId = '' } = {}) {
  validateSecretPack(pack);
  let contentKey;
  if (privateKeyPem) {
    const wrappedKey = selectWrappedKey(pack, { recipientId, type: 'x25519-public-key' });
    contentKey = unwrapContentKeyWithPrivateKey({ wrappedKey, packId: pack.publicManifest.packId, privateKeyPem });
  } else {
    const wrappedKey = selectWrappedKey(pack, { recipientId, type: 'passphrase' });
    contentKey = unwrapContentKeyWithPassphrase({ wrappedKey, packId: pack.publicManifest.packId, passphrase, pepper });
  }
  const payloadBytes = decryptAesGcm(contentKey, { ...pack.encryptedPayload, aad: payloadAad(pack.publicManifest.packId) });
  const payload = JSON.parse(TEXT_DECODER.decode(payloadBytes));
  validatePayload(payload);
  return { payload, contentKey };
}

export function validatePayload(payload) {
  if (!payload || payload.schema !== 'skye.secure.secret-payload.v2') throw new Error('Unsupported secret payload schema.');
  if (!Array.isArray(payload.files)) throw new Error('Secret payload file list is missing.');
  for (const item of payload.files) {
    normalizeRelativePath(item.path);
    if (item.type !== 'file') throw new Error(`Unsupported payload entry type for ${item.path}: ${item.type}`);
    const bytes = base64ToBytes(item.dataBase64);
    if (sha256Bytes(bytes) !== item.sha256) throw new Error(`File SHA-256 mismatch in payload: ${item.path}`);
    if (Number(item.size) !== bytes.length) throw new Error(`File size mismatch in payload: ${item.path}`);
  }
  return true;
}

export function collectFiles({ root, paths, maxFileBytes = DEFAULT_MAX_FILE_BYTES, allowMissing = false, includeSymlinks = false }) {
  const resolvedRoot = path.resolve(root);
  const files = [];
  const missing = [];
  const skipped = [];
  const seen = new Set();

  function addFile(file) {
    const stat = fs.lstatSync(file);
    const relativePath = normalizeRelativePath(path.relative(resolvedRoot, file).split(path.sep).join('/'));
    if (seen.has(relativePath)) return;
    if (stat.isSymbolicLink()) {
      if (!includeSymlinks) {
        skipped.push({ path: relativePath, reason: 'symlink skipped by default' });
        return;
      }
      const target = fs.realpathSync(file);
      addFile(target);
      return;
    }
    if (!stat.isFile()) return;
    if (stat.size > maxFileBytes) throw new Error(`Secret file exceeds max size (${maxFileBytes} bytes): ${relativePath}`);
    const data = fs.readFileSync(file);
    files.push({
      path: relativePath,
      type: 'file',
      mode: (stat.mode & 0o777).toString(8),
      size: data.length,
      mtime: stat.mtime.toISOString(),
      sha256: sha256Bytes(data),
      dataBase64: bytesToBase64(data)
    });
    seen.add(relativePath);
  }

  function walkDirectory(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDirectory(file);
      else addFile(file);
    }
  }

  for (const rawPath of paths) {
    if (!String(rawPath || '').trim()) continue;
    const target = safeJoin(resolvedRoot, rawPath);
    if (!fs.existsSync(target)) {
      if (allowMissing) {
        missing.push(normalizeRelativePath(rawPath));
        continue;
      }
      throw new Error(`Secret path does not exist: ${rawPath}`);
    }
    const stat = fs.lstatSync(target);
    if (stat.isDirectory()) walkDirectory(target);
    else addFile(target);
  }

  const plaintextBytes = files.reduce((sum, item) => sum + item.size, 0);
  return {
    root: resolvedRoot,
    host: os.hostname(),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    missing,
    skipped,
    plaintextBytes
  };
}

export function buildPayloadFromFiles({ collection, sourceBoundary = null, restorePolicy = {} }) {
  const safeFiles = collection.files.map((item) => ({ ...item }));
  return {
    rootHint: collection.root,
    host: collection.host,
    files: safeFiles,
    restorePolicy: {
      defaultOverwrite: false,
      refusePathTraversal: true,
      requireExplicitForceForOverwrite: true,
      ...restorePolicy
    },
    sourceBoundary: sourceBoundary || null,
    missingAtPackTime: collection.missing || [],
    skippedAtPackTime: collection.skipped || []
  };
}

export function restorePayloadFiles({ payload, root, force = false, dryRun = false }) {
  validatePayload(payload);
  const restored = [];
  const conflicts = [];
  const resolvedRoot = path.resolve(root);
  for (const item of payload.files) {
    const target = safeJoin(resolvedRoot, item.path);
    if (fs.existsSync(target) && !force) {
      conflicts.push({ path: item.path, target, reason: 'target exists' });
      continue;
    }
    restored.push({
      path: item.path,
      target,
      size: item.size,
      sha256: item.sha256,
      mode: item.mode
    });
    if (!dryRun) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, base64ToBytes(item.dataBase64), { mode: Number.parseInt(item.mode || '600', 8) });
      try { fs.chmodSync(target, Number.parseInt(item.mode || '600', 8)); } catch {}
    }
  }
  return { restored, conflicts, dryRun, root: resolvedRoot };
}

export function packPublicSummary(pack) {
  validateSecretPack(pack);
  return {
    schema: 'skye.secure.secret-pack-summary.v2',
    packId: pack.publicManifest.packId,
    format: pack.publicManifest.format,
    createdAt: pack.publicManifest.createdAt,
    updatedAt: pack.publicManifest.updatedAt,
    workspaceId: pack.publicManifest.workspaceId,
    repoId: pack.publicManifest.repoId,
    clientName: pack.publicManifest.clientName,
    projectName: pack.publicManifest.projectName,
    fileCount: pack.publicManifest.fileCount,
    plaintextBytes: pack.publicManifest.plaintextBytes,
    encryptedBytes: pack.publicManifest.encryptedBytes,
    sourceBoundarySha256: pack.publicManifest.sourceBoundarySha256,
    sourceBoundaryRef: pack.publicManifest.sourceBoundaryRef,
    recipients: pack.wrappedKeys.map((key) => ({
      recipientId: key.recipientId,
      type: key.type,
      hint: key.hint || '',
      pepperRequired: Boolean(key.pepperRequired),
      publicKeyFingerprint: key.recipientPublicKeyFingerprint || ''
    })),
    integrity: pack.integrity
  };
}

export function addWrappedRecipient(pack, recipient, contentKey) {
  validateSecretPack(pack);
  const packId = pack.publicManifest.packId;
  const nextWrapped = recipient.type === 'passphrase'
    ? wrapContentKeyWithPassphrase({ ...recipient, contentKey, packId })
    : wrapContentKeyWithPublicKey({ ...recipient, contentKey, packId });
  const next = structuredClone(pack);
  next.wrappedKeys = next.wrappedKeys.filter((key) => key.recipientId !== nextWrapped.recipientId);
  next.wrappedKeys.push(nextWrapped);
  next.publicManifest.updatedAt = new Date().toISOString();
  next.integrity.publicManifestSha256 = sha256Text(stableJson(next.publicManifest));
  next.integrity.wrappedKeyCount = next.wrappedKeys.length;
  validateSecretPack(next);
  return next;
}

export function removeWrappedRecipient(pack, recipientId) {
  validateSecretPack(pack);
  const next = structuredClone(pack);
  const before = next.wrappedKeys.length;
  next.wrappedKeys = next.wrappedKeys.filter((key) => key.recipientId !== recipientId);
  if (next.wrappedKeys.length === before) throw new Error(`Recipient not found: ${recipientId}`);
  if (next.wrappedKeys.length === 0) throw new Error('Cannot remove the final recipient from a pack.');
  next.publicManifest.updatedAt = new Date().toISOString();
  next.integrity.publicManifestSha256 = sha256Text(stableJson(next.publicManifest));
  next.integrity.wrappedKeyCount = next.wrappedKeys.length;
  validateSecretPack(next);
  return next;
}
