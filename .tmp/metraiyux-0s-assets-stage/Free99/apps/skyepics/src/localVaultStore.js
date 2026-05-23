import {
  VAULT_VERSION,
  makeVaultHeader,
  deriveVaultKey,
  createVerifier,
  verifyKey,
  encryptJson,
  decryptJson,
  encryptBytes,
  decryptBytes,
  blobToBytes,
  bytesToBlob,
  bytesToBase64,
  base64ToBytes,
  sha256Base64
} from './cryptoVault.js';

const HEADER_KEY = 'skyepics.v1.header';
const MANIFEST_KEY = 'skyepics.v1.manifest';
const OPFS_ROOT = 'skyepics-vault-private-files';
const PHOTO_DIR = 'photos';

export function getLocalVaultHeader() {
  const raw = localStorage.getItem(HEADER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasVault() {
  return Boolean(getLocalVaultHeader());
}

export function supportsPrivateFileSystem() {
  return Boolean(globalThis.navigator?.storage?.getDirectory);
}

export async function assertPrivateFileSystem() {
  if (!supportsPrivateFileSystem()) {
    throw new Error('This browser needs Origin Private File System support. Use current Chrome, Edge, or another Chromium browser on HTTPS or localhost.');
  }
}

export async function getStorageStatus() {
  const storage = globalThis.navigator?.storage;
  const estimate = storage?.estimate ? await storage.estimate() : {};
  const persisted = storage?.persisted ? await storage.persisted() : false;
  return {
    supported: supportsPrivateFileSystem(),
    persisted: Boolean(persisted),
    quota: estimate.quota || 0,
    usage: estimate.usage || 0
  };
}

export async function requestPersistentStorage() {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persist) return false;
  return storage.persist();
}

async function getVaultRoot() {
  await assertPrivateFileSystem();
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_ROOT, { create: true });
}

async function getPhotosDir() {
  const root = await getVaultRoot();
  return root.getDirectoryHandle(PHOTO_DIR, { create: true });
}

async function writePrivateFile(name, bytes) {
  const dir = await getPhotosDir();
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(bytes);
  await writable.close();
}

async function readPrivateFile(name) {
  const dir = await getPhotosDir();
  const handle = await dir.getFileHandle(name, { create: false });
  const file = await handle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

async function deletePrivateFile(name) {
  try {
    const dir = await getPhotosDir();
    await dir.removeEntry(name);
  } catch {
    // Already gone is acceptable for vault cleanup.
  }
}

async function clearPrivateFiles() {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(OPFS_ROOT, { recursive: true });
  } catch {
    // Missing storage is acceptable during reset.
  }
}

function backupDigestPayload(backup) {
  return JSON.stringify({
    backupType: backup.backupType,
    backupVersion: backup.backupVersion,
    header: backup.header,
    manifest: backup.manifest,
    photos: backup.photos || []
  });
}

async function buildBackupChecksum(backup) {
  return `sha256:${await sha256Base64(backupDigestPayload(backup))}`;
}

function countKinds(secrets = []) {
  return secrets.reduce((acc, item) => {
    const kind = item.kind || 'text';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
}


function daysBetweenNow(isoDate) {
  if (!isoDate) return null;
  const then = new Date(isoDate).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

function dateIsPast(dateString) {
  if (!dateString) return false;
  const value = new Date(`${dateString}T23:59:59`).getTime();
  return Number.isFinite(value) && value < Date.now();
}

function isSensitiveKind(kind = '') {
  return ['api_key', 'password', 'secret', 'token', 'database_url', 'cloud_key', 'private_key', 'url_or_connection_string'].includes(kind);
}

function isPasswordLike(secret = {}) {
  const text = `${secret.kind || ''} ${secret.label || ''}`.toLowerCase();
  return /password|passwd|pwd|login/.test(text) || secret.kind === 'password';
}

function createEmergencyKitHtml(kit) {
  const escape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const rows = [
    ['Created', kit.createdAt],
    ['Backup checksum', kit.backupChecksum],
    ['Backup version', kit.backupVersion],
    ['Photo count', kit.photos],
    ['Encrypted file count', kit.encryptedFiles],
    ['Secret record count', kit.secretRecords],
    ['Latest integrity', kit.latestIntegrity ? `${kit.latestIntegrity.ok ? 'OK' : 'Needs attention'} · ${kit.latestIntegrity.checkedAt}` : 'No integrity check recorded'],
    ['Latest secret audit', kit.latestSecretAudit ? `${kit.latestSecretAudit.ok ? 'OK' : 'Needs attention'} · ${kit.latestSecretAudit.createdAt}` : 'No secret audit recorded']
  ];
  const rowHtml = rows.map(([label, value]) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SkyePics Emergency Recovery Kit</title>
<style>
  body{font-family:Inter,Arial,sans-serif;background:#050814;color:#eef5ff;margin:0;padding:32px;line-height:1.55}
  main{max-width:920px;margin:0 auto;border:1px solid rgba(125,249,255,.35);border-radius:24px;padding:28px;background:linear-gradient(135deg,rgba(125,249,255,.08),rgba(138,92,246,.08))}
  h1{margin:0 0 8px;font-size:34px;letter-spacing:-.04em} h2{margin-top:28px;color:#7df9ff} p,li{color:#c9d6f6} table{width:100%;border-collapse:collapse;margin:18px 0;background:rgba(255,255,255,.04)} th,td{border:1px solid rgba(255,255,255,.16);padding:10px;text-align:left;vertical-align:top} th{width:210px;color:#7df9ff} code{display:block;white-space:pre-wrap;word-break:break-word;background:#02040c;border:1px solid rgba(125,249,255,.25);border-radius:12px;padding:12px;color:#b9fff9}.danger{border:1px solid rgba(255,90,128,.45);border-radius:16px;padding:14px;background:rgba(255,90,128,.1);color:#ffd5df}@media print{body{background:#fff;color:#000}main{border:1px solid #222;background:#fff}p,li,th,td{color:#000}h2{color:#000}code{color:#000;background:#f4f4f4}.danger{color:#000;background:#fff}}
</style>
</head>
<body>
<main>
<h1>SkyePics Emergency Recovery Kit</h1>
<p>This is a redacted recovery guide. It contains no secret values and no image bytes. Keep it with your encrypted backup file and your vault password storage procedure.</p>
<table>${rowHtml}</table>
<h2>Restore sequence</h2>
<ol>
<li>Open SkyePics on the new browser/device over HTTPS or localhost.</li>
<li>Choose Restore on the unlock screen.</li>
<li>Select the encrypted <code>.skyepics-backup.json</code> file.</li>
<li>Enter the vault password that was active when that backup was exported.</li>
<li>Verify the checksum shown by the app matches this kit before replacing the local vault.</li>
<li>After restore, run Health Check, Secret Audit, and then export a fresh backup from the restored device.</li>
</ol>
<h2>Backup checksum</h2>
<code>${escape(kit.backupChecksum)}</code>
<div class="danger">Do not treat browser local storage as the only archive. Keep at least one encrypted backup outside the browser profile.</div>
</main>
</body>
</html>`;
}

function emptyManifest() {
  return {
    vault: VAULT_VERSION,
    updatedAt: new Date().toISOString(),
    photos: [],
    secrets: [],
    integrityReports: [],
    secretRiskReports: [],
    settings: {
      backupReminderDays: 7,
      lastBackupAt: '',
      lastBackupChecksum: '',
      installPromptDismissedAt: '',
      lockOnHidden: true,
      clipboardTtlSeconds: 30
    },
    audit: [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: 'vault_created',
        note: 'Local encrypted SkyePics vault initialized.'
      }
    ]
  };
}

function normalizeManifest(manifest) {
  const normalized = manifest && typeof manifest === 'object' ? manifest : emptyManifest();
  normalized.vault = normalized.vault || VAULT_VERSION;
  normalized.updatedAt = normalized.updatedAt || new Date().toISOString();
  normalized.photos = Array.isArray(normalized.photos) ? normalized.photos : [];
  normalized.secrets = Array.isArray(normalized.secrets) ? normalized.secrets : [];
  normalized.integrityReports = Array.isArray(normalized.integrityReports) ? normalized.integrityReports : [];
  normalized.secretRiskReports = Array.isArray(normalized.secretRiskReports) ? normalized.secretRiskReports : [];
  normalized.settings = normalized.settings && typeof normalized.settings === 'object' ? normalized.settings : {};
  normalized.settings.backupReminderDays = Number.isFinite(Number(normalized.settings.backupReminderDays)) ? Number(normalized.settings.backupReminderDays) : 7;
  normalized.settings.lastBackupAt = normalized.settings.lastBackupAt || '';
  normalized.settings.lastBackupChecksum = normalized.settings.lastBackupChecksum || '';
  normalized.settings.installPromptDismissedAt = normalized.settings.installPromptDismissedAt || '';
  normalized.settings.lockOnHidden = normalized.settings.lockOnHidden !== false;
  normalized.settings.clipboardTtlSeconds = Number.isFinite(Number(normalized.settings.clipboardTtlSeconds)) ? Math.max(5, Math.min(120, Number(normalized.settings.clipboardTtlSeconds))) : 30;
  normalized.audit = Array.isArray(normalized.audit) ? normalized.audit : [];
  return normalized;
}

export async function createVault(password) {
  await assertPrivateFileSystem();
  const header = makeVaultHeader();
  const key = await deriveVaultKey(password, header.salt, header.kdf);
  header.verifier = await createVerifier(key);
  localStorage.setItem(HEADER_KEY, JSON.stringify(header));
  const manifestPayload = await encryptJson(emptyManifest(), key, `${VAULT_VERSION}:manifest`);
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifestPayload));
  await getPhotosDir();
  await requestPersistentStorage().catch(() => false);
  return new VaultSession(header, key, await decryptJson(manifestPayload, key));
}

export async function unlockVault(password) {
  await assertPrivateFileSystem();
  const header = getLocalVaultHeader();
  if (!header) throw new Error('No SkyePics vault exists on this browser profile yet.');
  const key = await deriveVaultKey(password, header.salt, header.kdf);
  await verifyKey(header, key);
  const rawManifest = localStorage.getItem(MANIFEST_KEY);
  const manifest = rawManifest ? await decryptJson(JSON.parse(rawManifest), key) : emptyManifest();
  return new VaultSession(header, key, normalizeManifest(manifest));
}

export async function resetVault() {
  localStorage.removeItem(HEADER_KEY);
  localStorage.removeItem(MANIFEST_KEY);
  await clearPrivateFiles();
}

export async function verifyBackupFile(backup, passwordForVerification) {
  if (!backup || backup.backupType !== 'skyepics-local-encrypted-backup') {
    throw new Error('This is not a SkyePics encrypted backup file.');
  }
  if (!backup.header || !backup.header.salt || !backup.header.verifier || !backup.manifest) {
    throw new Error('Backup is missing vault header or manifest.');
  }
  const key = await deriveVaultKey(passwordForVerification, backup.header.salt, backup.header.kdf);
  await verifyKey(backup.header, key);
  if (backup.checksum) {
    const expected = await buildBackupChecksum(backup);
    if (expected !== backup.checksum) {
      throw new Error('Backup checksum mismatch. The file may be damaged or edited.');
    }
  }
  const manifest = normalizeManifest(await decryptJson(backup.manifest, key));
  return {
    ok: true,
    exportedAt: backup.exportedAt || null,
    backupVersion: backup.backupVersion || 1,
    checksum: backup.checksum || null,
    photos: manifest.photos.length,
    secrets: manifest.secrets.length,
    encryptedFiles: Array.isArray(backup.photos) ? backup.photos.length : 0,
    kinds: countKinds(manifest.secrets),
    updatedAt: manifest.updatedAt || null
  };
}

export class VaultSession {
  constructor(header, key, manifest) {
    this.header = header;
    this.key = key;
    this.manifest = normalizeManifest(manifest);
  }

  async persist() {
    this.manifest.updatedAt = new Date().toISOString();
    const payload = await encryptJson(this.manifest, this.key, `${VAULT_VERSION}:manifest`);
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(payload));
  }

  addAudit(action, note = '') {
    this.manifest.audit = this.manifest.audit || [];
    this.manifest.audit.unshift({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      action,
      note
    });
    this.manifest.audit = this.manifest.audit.slice(0, 300);
  }

  getStats() {
    const totalPhotoBytes = this.manifest.photos.reduce((sum, item) => sum + (item.size || 0), 0);
    const latestIntegrity = this.manifest.integrityReports?.[0] || null;
    const latestSecretAudit = this.manifest.secretRiskReports?.[0] || null;
    const backupAgeMs = this.manifest.settings?.lastBackupAt ? Date.now() - new Date(this.manifest.settings.lastBackupAt).getTime() : Infinity;
    const backupReminderDays = Number(this.manifest.settings?.backupReminderDays || 7);
    return {
      photos: this.manifest.photos.length,
      secrets: this.manifest.secrets.length,
      bytes: totalPhotoBytes,
      updatedAt: this.manifest.updatedAt,
      storage: 'Origin Private File System + Web Crypto AES-GCM',
      lastIntegrityAt: latestIntegrity?.checkedAt || '',
      lastIntegrityOk: latestIntegrity ? Boolean(latestIntegrity.ok) : null,
      integrityReports: this.manifest.integrityReports?.length || 0,
      lastSecretAuditAt: latestSecretAudit?.createdAt || '',
      lastSecretAuditOk: latestSecretAudit ? Boolean(latestSecretAudit.ok) : null,
      secretRiskReports: this.manifest.secretRiskReports?.length || 0,
      lastBackupAt: this.manifest.settings?.lastBackupAt || '',
      lastBackupChecksum: this.manifest.settings?.lastBackupChecksum || '',
      backupDue: !this.manifest.settings?.lastBackupAt || backupAgeMs > backupReminderDays * 24 * 60 * 60 * 1000,
      lockOnHidden: this.manifest.settings?.lockOnHidden !== false,
      clipboardTtlSeconds: this.manifest.settings?.clipboardTtlSeconds || 30
    };
  }

  listPhotos() {
    return [...this.manifest.photos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  listSecrets() {
    return [...this.manifest.secrets].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  async savePhoto(blob, info = {}) {
    const id = crypto.randomUUID();
    const bytes = await blobToBytes(blob);
    const encrypted = await encryptBytes(bytes, this.key, `${VAULT_VERSION}:photo:${id}`);
    const fileName = `${id}.skyepic`;
    await writePrivateFile(fileName, new TextEncoder().encode(JSON.stringify(encrypted)));
    const meta = {
      id,
      fileName,
      title: info.title?.trim() || `SkyePic ${new Date().toLocaleString()}`,
      note: info.note?.trim() || '',
      mime: blob.type || 'image/jpeg',
      size: blob.size || bytes.length,
      width: info.width || null,
      height: info.height || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      secretIds: []
    };
    this.manifest.photos.unshift(meta);
    this.addAudit('photo_saved', meta.title);
    await this.persist();
    return meta;
  }

  async updatePhoto(id, patch = {}) {
    const photo = this.manifest.photos.find((item) => item.id === id);
    if (!photo) throw new Error('Photo not found.');
    if (typeof patch.title === 'string') photo.title = patch.title.trim() || photo.title;
    if (typeof patch.note === 'string') photo.note = patch.note.trim();
    photo.updatedAt = new Date().toISOString();
    this.addAudit('photo_updated', photo.title);
    await this.persist();
    return photo;
  }

  async getPhotoBlob(id) {
    const photo = this.manifest.photos.find((item) => item.id === id);
    if (!photo) throw new Error('Photo not found.');
    const encryptedBytes = await readPrivateFile(photo.fileName);
    const encrypted = JSON.parse(new TextDecoder().decode(encryptedBytes));
    const plainBytes = await decryptBytes(encrypted, this.key);
    return bytesToBlob(plainBytes, photo.mime || 'image/jpeg');
  }

  async deletePhoto(id) {
    const photo = this.manifest.photos.find((item) => item.id === id);
    if (!photo) return false;
    await deletePrivateFile(photo.fileName);
    this.manifest.photos = this.manifest.photos.filter((item) => item.id !== id);
    this.manifest.secrets = this.manifest.secrets.map((secret) => {
      if (secret.photoId !== id) return secret;
      return { ...secret, photoId: null };
    });
    this.addAudit('photo_deleted', photo.title);
    await this.persist();
    return true;
  }

  async saveSecret(record = {}) {
    const now = new Date().toISOString();
    const normalized = {
      id: record.id || crypto.randomUUID(),
      photoId: record.photoId || null,
      label: (record.label || 'Captured Secret').trim(),
      kind: (record.kind || 'text').trim(),
      value: record.value || '',
      provider: (record.provider || '').trim(),
      account: (record.account || '').trim(),
      url: (record.url || '').trim(),
      tags: Array.isArray(record.tags) ? record.tags : String(record.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      rotationDue: record.rotationDue || '',
      rawText: record.rawText || '',
      notes: record.notes || '',
      createdAt: record.createdAt || now,
      updatedAt: now
    };
    const index = this.manifest.secrets.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      this.manifest.secrets[index] = normalized;
    } else {
      this.manifest.secrets.unshift(normalized);
      if (normalized.photoId) {
        const photo = this.manifest.photos.find((item) => item.id === normalized.photoId);
        if (photo && !photo.secretIds.includes(normalized.id)) {
          photo.secretIds.push(normalized.id);
          photo.updatedAt = now;
        }
      }
    }
    if (normalized.photoId) {
      const photo = this.manifest.photos.find((item) => item.id === normalized.photoId);
      if (photo && !photo.secretIds.includes(normalized.id)) {
        photo.secretIds.push(normalized.id);
        photo.updatedAt = now;
      }
    }
    this.addAudit(index >= 0 ? 'secret_updated' : 'secret_saved', normalized.label);
    await this.persist();
    return normalized;
  }

  async deleteSecret(id) {
    const target = this.manifest.secrets.find((item) => item.id === id);
    this.manifest.secrets = this.manifest.secrets.filter((item) => item.id !== id);
    this.manifest.photos.forEach((photo) => {
      photo.secretIds = (photo.secretIds || []).filter((secretId) => secretId !== id);
    });
    this.addAudit('secret_deleted', target?.label || id);
    await this.persist();
  }

  async checkVaultIntegrity() {
    const result = {
      checkId: crypto.randomUUID(),
      checkedAt: new Date().toISOString(),
      ok: true,
      photosChecked: 0,
      secretRecordsChecked: this.manifest.secrets.length,
      encryptedBytesChecked: 0,
      encryptedFileChecksums: [],
      unreadablePhotos: [],
      danglingSecretLinks: [],
      localStorageHeader: Boolean(localStorage.getItem(HEADER_KEY)),
      localStorageManifest: Boolean(localStorage.getItem(MANIFEST_KEY))
    };

    const photoIds = new Set(this.manifest.photos.map((photo) => photo.id));
    for (const photo of this.manifest.photos) {
      try {
        const encryptedBytes = await readPrivateFile(photo.fileName);
        result.encryptedBytesChecked += encryptedBytes.byteLength;
        result.encryptedFileChecksums.push({
          id: photo.id,
          title: photo.title,
          fileName: photo.fileName,
          checksum: `sha256:${await sha256Base64(encryptedBytes)}`,
          encryptedBytes: encryptedBytes.byteLength
        });
        await this.getPhotoBlob(photo.id);
        result.photosChecked += 1;
      } catch (err) {
        result.ok = false;
        result.unreadablePhotos.push({ id: photo.id, title: photo.title, error: err.message || 'Unreadable encrypted photo.' });
      }
    }

    for (const secret of this.manifest.secrets) {
      if (secret.photoId && !photoIds.has(secret.photoId)) {
        result.ok = false;
        result.danglingSecretLinks.push({ id: secret.id, label: secret.label, photoId: secret.photoId });
      }
    }

    const ledgerEntry = {
      checkId: result.checkId,
      checkedAt: result.checkedAt,
      ok: result.ok,
      photosChecked: result.photosChecked,
      secretRecordsChecked: result.secretRecordsChecked,
      encryptedBytesChecked: result.encryptedBytesChecked,
      unreadablePhotoCount: result.unreadablePhotos.length,
      danglingSecretLinkCount: result.danglingSecretLinks.length,
      encryptedFileChecksums: result.encryptedFileChecksums
    };
    this.manifest.integrityReports = [ledgerEntry, ...(this.manifest.integrityReports || [])].slice(0, 50);
    this.addAudit(result.ok ? 'health_check_passed' : 'health_check_failed', `${result.photosChecked} photo file(s), ${result.secretRecordsChecked} secret record(s), ${result.encryptedFileChecksums.length} encrypted checksum(s).`);
    await this.persist();
    return result;
  }

  async rotatePassword(currentPassword, newPassword) {
    const oldKey = await deriveVaultKey(currentPassword, this.header.salt, this.header.kdf);
    await verifyKey(this.header, oldKey);
    if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters.');

    const plainPhotos = [];
    for (const photo of this.manifest.photos) {
      const encryptedBytes = await readPrivateFile(photo.fileName);
      const encrypted = JSON.parse(new TextDecoder().decode(encryptedBytes));
      const plainBytes = await decryptBytes(encrypted, this.key);
      plainPhotos.push({ photo, plainBytes });
    }

    const newHeader = makeVaultHeader();
    const newKey = await deriveVaultKey(newPassword, newHeader.salt, newHeader.kdf);
    newHeader.verifier = await createVerifier(newKey);

    for (const item of plainPhotos) {
      const encrypted = await encryptBytes(item.plainBytes, newKey, `${VAULT_VERSION}:photo:${item.photo.id}`);
      await writePrivateFile(item.photo.fileName, new TextEncoder().encode(JSON.stringify(encrypted)));
    }

    this.header = newHeader;
    this.key = newKey;
    localStorage.setItem(HEADER_KEY, JSON.stringify(newHeader));
    this.addAudit('password_rotated', 'Vault password changed and all encrypted photo files were rewrapped.');
    await this.persist();
    return true;
  }

  async buildBackupPayload() {
    const photos = [];
    for (const photo of this.manifest.photos) {
      const bytes = await readPrivateFile(photo.fileName);
      photos.push({ fileName: photo.fileName, data: bytesToBase64(bytes) });
    }
    const backup = {
      backupType: 'skyepics-local-encrypted-backup',
      backupVersion: 5,
      exportedAt: new Date().toISOString(),
      note: 'Encrypted export. Restore needs the active SkyePics vault password from the moment this file was exported.',
      header: JSON.parse(localStorage.getItem(HEADER_KEY)),
      manifest: JSON.parse(localStorage.getItem(MANIFEST_KEY)),
      photos
    };
    backup.checksum = await buildBackupChecksum(backup);
    return backup;
  }

  async exportBackup() {
    const backup = await this.buildBackupPayload();
    this.manifest.settings.lastBackupAt = backup.exportedAt;
    this.manifest.settings.lastBackupChecksum = backup.checksum;
    this.addAudit('backup_exported', `${backup.photos.length} encrypted photo file(s) included. ${backup.checksum}`);
    await this.persist();
    return backup;
  }

  async exportRecoveryReceipt() {
    const backup = await this.buildBackupPayload();
    const manifest = normalizeManifest(await decryptJson(backup.manifest, this.key));
    return {
      receiptType: 'skyepics-redacted-recovery-receipt',
      receiptVersion: 1,
      createdAt: new Date().toISOString(),
      backupChecksum: backup.checksum,
      backupVersion: backup.backupVersion,
      vaultCreatedAt: this.header.createdAt || null,
      manifestUpdatedAt: manifest.updatedAt || null,
      photos: manifest.photos.length,
      encryptedFiles: backup.photos.length,
      secretRecords: manifest.secrets.length,
      secretKinds: countKinds(manifest.secrets),
      latestIntegrity: manifest.integrityReports?.[0] || null,
      backupReminderDays: manifest.settings?.backupReminderDays || 7,
      redactedPhotoIndex: manifest.photos.map((photo) => ({
        id: photo.id,
        title: photo.title,
        createdAt: photo.createdAt,
        size: photo.size || 0,
        linkedSecretCount: (photo.secretIds || []).length
      })),
      redactedSecretIndex: manifest.secrets.map((secret) => ({
        id: secret.id,
        label: secret.label,
        kind: secret.kind,
        provider: secret.provider || '',
        account: secret.account || '',
        tags: secret.tags || [],
        rotationDue: secret.rotationDue || '',
        linkedPhotoId: secret.photoId || null,
        updatedAt: secret.updatedAt || secret.createdAt
      })),
      warning: 'This receipt intentionally excludes image bytes and secret values. It only proves what an encrypted backup should contain.'
    };
  }

  async exportIntegrityLedger() {
    return {
      ledgerType: 'skyepics-redacted-integrity-ledger',
      ledgerVersion: 1,
      createdAt: new Date().toISOString(),
      vaultCreatedAt: this.header.createdAt || null,
      manifestUpdatedAt: this.manifest.updatedAt || null,
      photoCount: this.manifest.photos.length,
      secretRecordCount: this.manifest.secrets.length,
      reports: (this.manifest.integrityReports || []).map((report) => ({
        checkId: report.checkId,
        checkedAt: report.checkedAt,
        ok: report.ok,
        photosChecked: report.photosChecked,
        secretRecordsChecked: report.secretRecordsChecked,
        encryptedBytesChecked: report.encryptedBytesChecked,
        unreadablePhotoCount: report.unreadablePhotoCount,
        danglingSecretLinkCount: report.danglingSecretLinkCount,
        encryptedFileChecksums: report.encryptedFileChecksums || []
      })),
      warning: 'This ledger is redacted. It includes encrypted-file checksums, counts, and health status, but no image bytes and no secret values.'
    };
  }

  async runSecretRiskAudit() {
    const duplicateMap = new Map();
    const report = {
      auditType: 'skyepics-redacted-secret-risk-audit',
      auditVersion: 1,
      createdAt: new Date().toISOString(),
      ok: true,
      totals: {
        records: this.manifest.secrets.length,
        linkedRecords: this.manifest.secrets.filter((secret) => secret.photoId).length,
        recordsWithRotationDue: this.manifest.secrets.filter((secret) => secret.rotationDue).length
      },
      findings: [],
      weakPasswords: [],
      overdueRotations: [],
      missingRotationDates: [],
      longLivedRecords: [],
      unlinkedRecords: [],
      privateKeyRecords: [],
      duplicateValueGroups: [],
      redactedRecords: []
    };

    for (const secret of this.manifest.secrets) {
      const value = String(secret.value || '');
      const valueHash = await sha256Base64(new TextEncoder().encode(value));
      const record = {
        id: secret.id,
        label: secret.label,
        kind: secret.kind || 'text',
        provider: secret.provider || '',
        account: secret.account || '',
        tags: secret.tags || [],
        valueLength: value.length,
        multiline: value.includes('\n'),
        linkedPhotoId: secret.photoId || null,
        rotationDue: secret.rotationDue || '',
        ageDays: daysBetweenNow(secret.createdAt),
        updatedAgeDays: daysBetweenNow(secret.updatedAt || secret.createdAt)
      };
      report.redactedRecords.push(record);
      if (value) {
        const current = duplicateMap.get(valueHash) || [];
        current.push(record);
        duplicateMap.set(valueHash, current);
      }
      if (isPasswordLike(secret) && value.length > 0 && value.length < 16) {
        report.weakPasswords.push({ ...record, reason: 'password-like value is shorter than 16 characters' });
      }
      if (secret.rotationDue && dateIsPast(secret.rotationDue)) {
        report.overdueRotations.push({ ...record, reason: `rotation date passed: ${secret.rotationDue}` });
      }
      if (isSensitiveKind(secret.kind) && !secret.rotationDue) {
        report.missingRotationDates.push({ ...record, reason: 'sensitive record has no rotation due date' });
      }
      if ((record.ageDays || 0) > 365 && isSensitiveKind(secret.kind)) {
        report.longLivedRecords.push({ ...record, reason: 'sensitive record is older than 365 days' });
      }
      if (!secret.photoId) {
        report.unlinkedRecords.push({ ...record, reason: 'record is not linked to an evidence photo' });
      }
      if (secret.kind === 'private_key' || /BEGIN [A-Z ]*PRIVATE KEY/.test(value)) {
        report.privateKeyRecords.push({ ...record, reason: 'private key material detected' });
      }
    }

    for (const records of duplicateMap.values()) {
      if (records.length > 1) {
        report.duplicateValueGroups.push({
          duplicateCount: records.length,
          records: records.map(({ id, label, kind, provider, account, linkedPhotoId }) => ({ id, label, kind, provider, account, linkedPhotoId }))
        });
      }
    }

    if (report.weakPasswords.length) report.findings.push(`${report.weakPasswords.length} weak password-like record(s).`);
    if (report.duplicateValueGroups.length) report.findings.push(`${report.duplicateValueGroups.length} duplicate secret value group(s).`);
    if (report.overdueRotations.length) report.findings.push(`${report.overdueRotations.length} overdue rotation record(s).`);
    if (report.missingRotationDates.length) report.findings.push(`${report.missingRotationDates.length} sensitive record(s) without rotation date.`);
    if (report.longLivedRecords.length) report.findings.push(`${report.longLivedRecords.length} sensitive record(s) older than 365 days.`);
    if (report.unlinkedRecords.length) report.findings.push(`${report.unlinkedRecords.length} record(s) not linked to evidence photos.`);
    report.ok = !report.weakPasswords.length && !report.duplicateValueGroups.length && !report.overdueRotations.length;

    const ledgerEntry = {
      auditType: report.auditType,
      auditVersion: report.auditVersion,
      createdAt: report.createdAt,
      ok: report.ok,
      totals: report.totals,
      findings: report.findings,
      counts: {
        weakPasswords: report.weakPasswords.length,
        overdueRotations: report.overdueRotations.length,
        missingRotationDates: report.missingRotationDates.length,
        longLivedRecords: report.longLivedRecords.length,
        unlinkedRecords: report.unlinkedRecords.length,
        privateKeyRecords: report.privateKeyRecords.length,
        duplicateValueGroups: report.duplicateValueGroups.length
      }
    };
    this.manifest.secretRiskReports = [ledgerEntry, ...(this.manifest.secretRiskReports || [])].slice(0, 50);
    this.addAudit(report.ok ? 'secret_audit_passed' : 'secret_audit_flagged', report.findings.length ? report.findings.join(' ') : 'No major local risk findings.');
    await this.persist();
    return report;
  }

  async exportSecretRiskLedger() {
    return {
      ledgerType: 'skyepics-redacted-secret-risk-ledger',
      ledgerVersion: 1,
      createdAt: new Date().toISOString(),
      vaultCreatedAt: this.header.createdAt || null,
      manifestUpdatedAt: this.manifest.updatedAt || null,
      reports: this.manifest.secretRiskReports || [],
      warning: 'This ledger intentionally excludes secret values and image bytes. It only includes redacted risk counts and labels.'
    };
  }

  async exportEmergencyKit() {
    const backup = await this.buildBackupPayload();
    const manifest = normalizeManifest(await decryptJson(backup.manifest, this.key));
    const kit = {
      kitType: 'skyepics-redacted-emergency-recovery-kit',
      kitVersion: 1,
      createdAt: new Date().toISOString(),
      backupChecksum: backup.checksum,
      backupVersion: backup.backupVersion,
      photos: manifest.photos.length,
      encryptedFiles: backup.photos.length,
      secretRecords: manifest.secrets.length,
      latestIntegrity: manifest.integrityReports?.[0] || null,
      latestSecretAudit: manifest.secretRiskReports?.[0] || null,
      html: ''
    };
    kit.html = createEmergencyKitHtml(kit);
    this.addAudit('emergency_kit_exported', `Redacted recovery kit created for backup checksum ${backup.checksum}.`);
    await this.persist();
    return kit;
  }

  async updateVaultSettings(patch = {}) {
    this.manifest.settings = this.manifest.settings || {};
    if (Number.isFinite(Number(patch.backupReminderDays))) {
      this.manifest.settings.backupReminderDays = Math.max(1, Math.min(90, Number(patch.backupReminderDays)));
    }
    if (typeof patch.installPromptDismissedAt === 'string') {
      this.manifest.settings.installPromptDismissedAt = patch.installPromptDismissedAt;
    }
    if (typeof patch.lockOnHidden === 'boolean') {
      this.manifest.settings.lockOnHidden = patch.lockOnHidden;
    }
    if (Number.isFinite(Number(patch.clipboardTtlSeconds))) {
      this.manifest.settings.clipboardTtlSeconds = Math.max(5, Math.min(120, Number(patch.clipboardTtlSeconds)));
    }
    this.addAudit('settings_updated', 'Vault settings changed.');
    await this.persist();
    return this.manifest.settings;
  }

  async runRecoveryDrill(passwordForVerification) {
    if (!passwordForVerification) throw new Error('Enter the active vault password for the recovery drill.');
    const backup = await this.buildBackupPayload();
    const verification = await verifyBackupFile(backup, passwordForVerification);
    const receipt = await this.exportRecoveryReceipt();
    const drill = {
      drillType: 'skyepics-backup-recovery-drill',
      drillVersion: 1,
      createdAt: new Date().toISOString(),
      ok: true,
      backupChecksum: backup.checksum,
      backupVersion: backup.backupVersion,
      exportedAt: backup.exportedAt,
      verification,
      receipt,
      nextAction: 'Export and store the encrypted backup file somewhere outside this browser profile.'
    };
    this.addAudit('recovery_drill_passed', `${verification.photos} photo(s), ${verification.secrets} secret record(s), ${backup.checksum}`);
    await this.persist();
    return drill;
  }
}

export async function restoreBackup(backup, passwordForVerification) {
  await assertPrivateFileSystem();
  await verifyBackupFile(backup, passwordForVerification);
  await clearPrivateFiles();
  await getPhotosDir();
  localStorage.setItem(HEADER_KEY, JSON.stringify(backup.header));
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(backup.manifest));
  for (const item of backup.photos || []) {
    if (!item.fileName || !item.data) continue;
    await writePrivateFile(item.fileName, base64ToBytes(item.data));
  }
  const session = await unlockVault(passwordForVerification);
  session.addAudit('backup_restored', `${session.manifest.photos.length} photo(s), ${session.manifest.secrets.length} secret record(s).`);
  await session.persist();
  return session;
}
