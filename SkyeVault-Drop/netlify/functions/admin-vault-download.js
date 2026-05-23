import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdminAccess, cleanText, safeFileName } from './_lib/security.js';
import { loadLedger, writeAuditEventSafe } from './_lib/config.js';
import { createDownloadUrl, getDriveFileMetadata } from './_lib/google-drive.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function entryFileId(entry) {
  return cleanText(entry?.driveFile?.id || entry?.driveFile?.key || '', 500);
}

function safeEntry(entry) {
  const file = entry.driveFile || {};
  return {
    id: entry.id,
    completedAt: entry.completedAt || '',
    sessionId: entry.sessionId || '',
    workspaceId: entry.workspaceId || '',
    developerId: entry.developerId || '',
    destinationName: entry.destinationName || entry.destinationId || 'Vault storage',
    clientName: entry.clientName || '',
    clientEmail: entry.clientEmail || '',
    projectName: entry.projectName || '',
    assetType: entry.assetType || '',
    fileName: safeFileName(entry.fileName || file.name || 'vault-file'),
    fileSize: Number(entry.fileSize || file.size || 0),
    mimeType: entry.mimeType || file.mimeType || 'application/octet-stream',
    scan: entry.scan ? { status: entry.scan.status || '', verdict: entry.scan.verdict || '' } : null
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const admin = await requireAdminAccess(event);
    const body = await readJson(event);
    const receiptId = cleanText(body.receiptId, 120);
    if (!receiptId) fail('Receipt ID is required.');

    const ledger = await loadLedger(2500);
    const entry = ledger.entries.find((item) => item.id === receiptId);
    if (!entry) fail('Receipt was not found in the vault ledger.', 404);

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
    await writeAuditEventSafe('admin-vault-download-link-created', {
      actor: admin.actor,
      authType: admin.type,
      workspaceId: admin.workspaceId || entry.workspaceId || '',
      customerId: admin.customerId || entry.customerId || '',
      gateCardId: admin.gateCardId,
      receiptId: entry.id,
      sessionId: entry.sessionId,
      clientEmail: entry.clientEmail || '',
      fileName: entry.fileName || metadata.name,
      fileSize: Number(entry.fileSize || metadata.size || 0),
      expiresInSeconds
    });

    return json(200, {
      ok: true,
      actor: admin,
      item: safeEntry(entry),
      downloadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
