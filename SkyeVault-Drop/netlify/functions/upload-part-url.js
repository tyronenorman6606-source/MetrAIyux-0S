import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { resolvePortalAccess, cleanText } from './_lib/security.js';
import { loadSessionManifest, writeAuditEventSafe } from './_lib/config.js';
import { createMultipartPartUrl } from './_lib/google-drive.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function cleanPartNumbers(body = {}) {
  const raw = Array.isArray(body.partNumbers) ? body.partNumbers : [body.partNumber];
  const unique = [...new Set(raw.map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= 10000))];
  if (!unique.length) fail('partNumber or partNumbers is required.');
  if (unique.length > 250) fail('A single request can mint up to 250 part URLs.', 413);
  return unique.sort((a, b) => a - b);
}

function enforceAccess(portalAccess = {}, manifest = {}) {
  if (portalAccess.type === 'owner-admin') return;
  const manifestAccess = manifest.access || {};
  if (portalAccess.type === 'developer-workspace') {
    if (!portalAccess.workspaceId || manifestAccess.workspaceId !== portalAccess.workspaceId) {
      fail('This streaming upload session belongs to a different workspace.', 403);
    }
    return;
  }
  if (portalAccess.workspaceId && manifestAccess.workspaceId && portalAccess.workspaceId !== manifestAccess.workspaceId) {
    fail('This streaming upload session belongs to a different portal workspace.', 403);
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event);
    const portalAccess = await resolvePortalAccess(event, body);
    const sessionId = cleanText(body.sessionId, 120);
    const objectKey = cleanText(body.objectKey || body.driveFileId, 500);
    const uploadId = cleanText(body.uploadId, 500);
    if (!sessionId) fail('sessionId is required.');
    if (!objectKey) fail('objectKey is required.');
    if (!uploadId) fail('uploadId is required.');
    if (!objectKey.includes(sessionId)) fail('objectKey does not match the upload session.', 403);

    const manifestRecord = await loadSessionManifest(sessionId);
    if (!manifestRecord?.manifest) fail('Upload session manifest was not found.', 404);
    const manifest = manifestRecord.manifest;
    if (manifest.status !== 'pending') fail('Streaming part URLs can only be minted for pending sessions.', 409);
    if (manifest.file?.name && manifest.destination?.id && manifest.policy?.streamingMultipart !== true) {
      fail('This upload session is not a streaming multipart session.', 409);
    }
    if (manifest.destination?.id && body.destinationId && manifest.destination.id !== cleanText(body.destinationId, 120)) {
      fail('destinationId does not match the upload session manifest.', 403);
    }
    if (manifest.driveFileId && manifest.driveFileId !== objectKey) fail('objectKey does not match the upload session manifest.', 403);
    enforceAccess(portalAccess, manifest);

    const expires = Number(body.expiresInSeconds || process.env.R2_PRESIGNED_URL_TTL_SECONDS || 6 * 60 * 60);
    const parts = cleanPartNumbers(body).map((partNumber) => ({
      partNumber,
      uploadUrl: createMultipartPartUrl(objectKey, uploadId, partNumber, { expires })
    }));

    await writeAuditEventSafe('streaming-upload-part-url-created', {
      sessionId,
      objectKey,
      destinationId: manifest.destination?.id || '',
      workspaceId: manifest.access?.workspaceId || '',
      partCount: parts.length,
      firstPart: parts[0]?.partNumber || null,
      lastPart: parts[parts.length - 1]?.partNumber || null
    });

    return json(200, {
      ok: true,
      sessionId,
      objectKey,
      uploadId,
      parts,
      expiresInSeconds: Math.min(604800, Math.max(60, expires))
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
