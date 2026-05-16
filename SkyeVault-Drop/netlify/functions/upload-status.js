import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requirePortalKey, cleanText } from './_lib/security.js';
import { loadSessionManifest, loadReceipt } from './_lib/config.js';
import { applyRateLimit } from './_lib/rate-limit.js';

function publicManifest(manifest) {
  if (!manifest) return null;
  return {
    status: manifest.status || 'unknown',
    sessionId: manifest.sessionId || '',
    submissionId: manifest.intake?.submissionId || '',
    clientRequestId: manifest.intake?.clientRequestId || '',
    createdAt: manifest.createdAt || null,
    completedAt: manifest.completedAt || null,
    receiptId: manifest.receiptId || null,
    destination: manifest.destination ? {
      id: manifest.destination.id,
      name: manifest.destination.name,
      role: manifest.destination.role
    } : null,
    file: manifest.file ? {
      name: manifest.file.name,
      size: manifest.file.size,
      mimeType: manifest.file.mimeType,
      fingerprint: manifest.file.fingerprint ? {
        algorithm: manifest.file.fingerprint.algorithm,
        mode: manifest.file.fingerprint.mode,
        value: manifest.file.fingerprint.value,
        bytesHashed: manifest.file.fingerprint.bytesHashed
      } : null
    } : null,
    driveFileId: manifest.driveFileId || null
  };
}

function publicReceipt(receipt) {
  const entry = receipt?.entry || receipt;
  if (!entry?.id) return null;
  return {
    id: entry.id,
    receiptSignature: receipt?.receiptSignature || entry.receiptSignature || null,
    completedAt: entry.completedAt || null,
    sessionId: entry.sessionId || '',
    submissionId: entry.submissionId || '',
    clientRequestId: entry.clientRequestId || '',
    destinationName: entry.destinationName || entry.destinationId || '',
    fileName: entry.fileName || '',
    fileSize: entry.fileSize || 0,
    mimeType: entry.mimeType || '',
    fileFingerprint: entry.fileFingerprint || null,
    driveFile: entry.driveFile ? {
      id: entry.driveFile.id,
      name: entry.driveFile.name,
      size: entry.driveFile.size,
      mimeType: entry.driveFile.mimeType,
      webViewLink: entry.driveFile.webViewLink || ''
    } : null
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event);
    applyRateLimit(event, {
      bucket: 'upload-status',
      limit: Number(process.env.STATUS_RATE_LIMIT || 80),
      windowMs: Number(process.env.STATUS_RATE_WINDOW_MS || 10 * 60 * 1000),
      message: 'Too many status lookups from this requester. Wait and try again.'
    });
    requirePortalKey(event, body);
    const sessionId = cleanText(body.sessionId, 160);
    const receiptId = cleanText(body.receiptId, 160);
    if (!sessionId && !receiptId) {
      return json(400, { ok: false, error: 'sessionId or receiptId is required.' }, noStoreCors(event));
    }

    const [manifestRecord, receiptRecord] = await Promise.all([
      sessionId ? loadSessionManifest(sessionId) : Promise.resolve(null),
      receiptId ? loadReceipt(receiptId) : Promise.resolve(null)
    ]);

    return json(200, {
      ok: true,
      manifest: publicManifest(manifestRecord?.manifest || null),
      manifestFileId: manifestRecord?.file?.id || null,
      receipt: publicReceipt(receiptRecord?.receipt || null),
      receiptFileId: receiptRecord?.file?.id || null
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
