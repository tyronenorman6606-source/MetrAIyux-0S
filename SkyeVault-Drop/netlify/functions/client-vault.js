import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { cleanText, resolvePortalAccess, safeFileName } from './_lib/security.js';
import { loadLedger, writeAuditEventSafe } from './_lib/config.js';
import { createDownloadUrl, getDriveFileMetadata } from './_lib/google-drive.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function normalizeEmail(value) {
  return cleanText(value, 180).toLowerCase();
}

function safeEntry(entry) {
  const file = entry.driveFile || {};
  return {
    id: entry.id,
    completedAt: entry.completedAt || '',
    sessionId: entry.sessionId || '',
    submissionId: entry.submissionId || '',
    clientRequestId: entry.clientRequestId || '',
    workspaceId: entry.workspaceId || '',
    developerId: entry.developerId || '',
    custodyScope: entry.custodyScope || '',
    vaultVisibility: entry.vaultVisibility || '',
    ownerAccountId: entry.ownerAccountId || '',
    destinationName: entry.destinationName || entry.destinationId || 'Vault storage',
    clientName: entry.clientName || '',
    clientEmail: entry.clientEmail || '',
    projectName: entry.projectName || '',
    clientReference: entry.clientReference || '',
    assetType: entry.assetType || '',
    deadline: entry.deadline || '',
    fileName: safeFileName(entry.fileName || file.name || 'vault-file'),
    fileSize: Number(entry.fileSize || file.size || 0),
    mimeType: entry.mimeType || file.mimeType || 'application/octet-stream',
    fileFingerprint: entry.fileFingerprint || null,
    scan: entry.scan ? {
      status: entry.scan.status || '',
      verdict: entry.scan.verdict || ''
    } : null,
    receiptSignature: entry.receiptSignature || ''
  };
}

function entryFileId(entry) {
  return cleanText(entry.driveFile?.id || entry.driveFile?.key || '', 500);
}

function isOwnerPrivateEntry(entry = {}) {
  const explicit = String(entry.custodyScope || '').toLowerCase() === 'owner-private'
    || String(entry.vaultVisibility || '').toLowerCase() === 'owner-only'
    || entry.clientVaultVisible === false
    || entry.clientVaultDownloadAllowed === false;
  const combined = [
    entry.workspaceId,
    entry.accessType,
    entry.assetType,
    entry.projectName,
    entry.fileName,
    entry.clientReference
  ].join(' ');
  const ownerRepoArtifact = /\b(owner-admin|metraiyux-0s-owner)\b/i.test(combined)
    && /(full[- ]repo|git vault|skydrive|sovereign source|restore pack|control pack|\.skyesecrets|\.tar\.zst\.enc)/i.test(combined);
  return explicit || ownerRepoArtifact;
}

async function clientEntries(email, receiptId = '', portalAccess = {}) {
  const ledger = await loadLedger(2500);
  const wantedReceipt = cleanText(receiptId, 120);
  return ledger.entries
    .filter((entry) => !isOwnerPrivateEntry(entry))
    .filter((entry) => normalizeEmail(entry.clientEmail) === email)
    .filter((entry) => portalAccess.type !== 'developer-workspace' || entry.workspaceId === portalAccess.workspaceId)
    .filter((entry) => !wantedReceipt || entry.id === wantedReceipt)
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event);
    const portalAccess = await resolvePortalAccess(event, body);

    const email = normalizeEmail(body.clientEmail || body.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter the email used for the vault upload.');

    const action = cleanText(body.action || 'list', 40).toLowerCase();
    const receiptId = cleanText(body.receiptId, 120);
    const entries = await clientEntries(email, receiptId, portalAccess);

    if (action === 'download') {
      if (!receiptId) fail('Receipt ID is required to download a vault file.');
      const entry = entries.find((item) => item.id === receiptId);
      if (!entry) fail('No matching vault receipt was found for that email.', 404);
      if (isOwnerPrivateEntry(entry)) fail('This vault receipt is owner-private. Use the shared owner/admin gate to mint its download link.', 403);
      const fileId = entryFileId(entry);
      if (!fileId) fail('This receipt does not include a downloadable vault object.', 409);

      const metadata = await getDriveFileMetadata(fileId);
      const objectSession = metadata.appProperties?.sessionId || '';
      if (entry.sessionId && objectSession && objectSession !== entry.sessionId) {
        fail('Vault object metadata does not match the receipt.', 409);
      }
      const expiresInSeconds = Math.min(3600, Math.max(300, Number(body.expiresInSeconds || 900)));
      const downloadUrl = createDownloadUrl(fileId, {
        fileName: entry.fileName || metadata.name,
        mimeType: entry.mimeType || metadata.mimeType,
        expires: expiresInSeconds
      });
      await writeAuditEventSafe('client-vault-download-link-created', {
        receiptId: entry.id,
        sessionId: entry.sessionId,
        clientEmail: email,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        expiresInSeconds
      });
      return json(200, {
        ok: true,
        item: safeEntry(entry),
        downloadUrl,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      }, noStoreCors(event));
    }

    if (action !== 'list') fail('Unsupported client vault action.', 400);
    await writeAuditEventSafe('client-vault-list-viewed', {
      clientEmail: email,
      resultCount: entries.length
    });
    return json(200, {
      ok: true,
      items: entries.map(safeEntry),
      count: entries.length
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
