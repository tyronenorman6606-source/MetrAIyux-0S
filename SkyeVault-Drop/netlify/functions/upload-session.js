import crypto from 'node:crypto';
import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requirePortalKey, safeFileName, cleanText } from './_lib/security.js';
import { loadConfig, chooseDestinations, assertFileAllowed, newSessionId, saveSessionManifest, writeAuditEventSafe } from './_lib/config.js';
import { createResumableSession } from './_lib/google-drive.js';
import { applyRateLimit, assertHoneypot, verifyTurnstile } from './_lib/rate-limit.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function requireIntakeConsent(config, body) {
  if (config.requireUsageRights !== false && body.usageRightsAccepted !== true) {
    fail('Asset permission confirmation is required before upload.');
  }
  if (config.requireRetentionAck !== false && body.retentionAcknowledged !== true) {
    fail('Storage and project-use acknowledgement is required before upload.');
  }
}

function validateEmail(value) {
  const email = cleanText(value, 180);
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Client email must be a valid email address.');
  return email;
}

function validateUrl(value) {
  const url = cleanText(value, 240);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) fail('Website URL must start with http:// or https://.');
    return parsed.toString().slice(0, 240);
  } catch {
    fail('Website URL must be a valid URL.');
  }
}

function validateDate(value) {
  const date = cleanText(value, 40);
  if (!date) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('Needed-by date must use YYYY-MM-DD format.');
  return date;
}

function intakeFields(config, body) {
  const fields = {
    clientName: cleanText(body.clientName, 180),
    clientEmail: validateEmail(body.clientEmail),
    clientPhone: cleanText(body.clientPhone, 80),
    websiteUrl: validateUrl(body.websiteUrl),
    projectName: cleanText(body.projectName, 180),
    clientReference: cleanText(body.clientReference, 120),
    assetType: cleanText(body.assetType || 'General project package', 120),
    deadline: validateDate(body.deadline),
    notes: cleanText(body.notes, 1200),
    usageRightsAccepted: body.usageRightsAccepted === true,
    retentionAcknowledged: body.retentionAcknowledged === true,
    clientRequestId: cleanText(body.clientRequestId, 160),
    submissionId: cleanText(body.submissionId, 160)
  };

  if (config.requireClientName !== false && !fields.clientName) fail('Client name is required.');
  if (config.requireClientEmail !== false && !fields.clientEmail) fail('Client email is required.');
  if (config.requireProjectName !== false && !fields.projectName) fail('Project / website name is required.');
  return fields;
}



function validateSubmissionPolicy(config, body, fallbackFileSize) {
  const fileCount = Number(body.submissionFileCount || 1);
  const totalBytes = Number(body.submissionTotalBytes || fallbackFileSize || 0);
  const maxFiles = Number(config.maxFilesPerSubmission || 25);
  const maxTotalBytes = Number(config.maxTotalSubmissionGb || 5000) * 1024 * 1024 * 1024;
  if (!Number.isFinite(fileCount) || fileCount < 1) fail('Submission file count is invalid.');
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) fail('Submission total size is invalid.');
  if (maxFiles && fileCount > maxFiles) fail(`This portal allows ${maxFiles} files per submission.`, 413);
  if (maxTotalBytes && totalBytes > maxTotalBytes) fail(`This portal allows up to ${config.maxTotalSubmissionGb} GB per submission.`, 413);
  return { fileCount: Math.floor(fileCount), totalBytes: Math.floor(totalBytes) };
}

function normalizeFingerprint(input) {
  if (!input || typeof input !== 'object') return null;
  const algorithm = cleanText(input.algorithm || 'SHA-256', 40).toUpperCase();
  const mode = cleanText(input.mode || 'sampled-head-middle-tail', 80);
  const value = cleanText(input.value, 128).toLowerCase();
  const bytesHashed = Number(input.bytesHashed || 0);
  if (algorithm !== 'SHA-256') fail('Unsupported file fingerprint algorithm.');
  if (!/^[a-f0-9]{64}$/.test(value)) fail('File fingerprint must be a 64-character SHA-256 hex value.');
  if (!Number.isFinite(bytesHashed) || bytesHashed <= 0) fail('File fingerprint bytesHashed value is invalid.');
  return {
    algorithm,
    mode,
    value,
    bytesHashed: Math.floor(bytesHashed),
    generatedAt: cleanText(input.generatedAt, 80),
    note: cleanText(input.note, 180)
  };
}

function hashSecret(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function descriptionForIntake(fields) {
  return [
    'Uploaded through SkyeVault-Drop.',
    fields.clientName ? `Client: ${fields.clientName}` : '',
    fields.clientEmail ? `Email: ${fields.clientEmail}` : '',
    fields.clientPhone ? `Phone: ${fields.clientPhone}` : '',
    fields.websiteUrl ? `Website/URL: ${fields.websiteUrl}` : '',
    fields.projectName ? `Project: ${fields.projectName}` : '',
    fields.clientReference ? `Reference: ${fields.clientReference}` : '',
    fields.assetType ? `Asset type: ${fields.assetType}` : '',
    fields.deadline ? `Needed by: ${fields.deadline}` : '',
    fields.clientRequestId ? `Client request ID: ${fields.clientRequestId}` : '',
    fields.submissionId ? `Submission ID: ${fields.submissionId}` : '',
    `Permission confirmed: ${fields.usageRightsAccepted ? 'yes' : 'no'}`,
    `Storage acknowledgement: ${fields.retentionAcknowledged ? 'yes' : 'no'}`,
    fields.notes ? `Notes: ${fields.notes}` : ''
  ].filter(Boolean).join('\n');
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event);
    applyRateLimit(event, {
      bucket: 'upload-session',
      limit: Number(process.env.UPLOAD_SESSION_RATE_LIMIT || 30),
      windowMs: Number(process.env.UPLOAD_SESSION_RATE_WINDOW_MS || 10 * 60 * 1000),
      message: 'Too many upload-session attempts from this requester. Wait and try again.'
    });
    assertHoneypot(body);
    requirePortalKey(event, body);
    const humanGate = await verifyTurnstile(event, body);

    const { config } = await loadConfig();
    requireIntakeConsent(config, body);

    const fileName = safeFileName(body.fileName);
    const fileSize = Number(body.fileSize);
    const mimeType = cleanText(body.mimeType || 'application/octet-stream', 160) || 'application/octet-stream';
    const sessionId = newSessionId();
    const submissionPolicy = validateSubmissionPolicy(config, body, fileSize);
    const fields = intakeFields(config, body);
    const fileFingerprint = normalizeFingerprint(body.fileFingerprint);

    const destinations = chooseDestinations(config, body.destinationId, body.failedDestinationIds || []);
    if (!destinations.length) {
      return json(400, { ok: false, error: 'No enabled vault destination is available for this upload.' }, noStoreCors(event));
    }

    const attempts = [];
    for (const destination of destinations) {
      try {
        assertFileAllowed(destination, fileSize, mimeType, fileName, config);
        const session = await createResumableSession(destination, {
          sessionId,
          fileName,
          fileSize,
          mimeType,
          chunkSizeMb: config.chunkSizeMb,
          submissionFileCount: submissionPolicy.fileCount,
          submissionTotalBytes: submissionPolicy.totalBytes,
          description: descriptionForIntake(fields),
          fileFingerprint,
          ...fields
        });

        const manifestResult = await saveSessionManifest({
          sessionId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          destination,
          file: { name: fileName, size: fileSize, mimeType, fingerprint: fileFingerprint },
          intake: fields,
          policy: {
            chunkSizeMb: config.chunkSizeMb,
            maxFilesPerSubmission: config.maxFilesPerSubmission,
            maxTotalSubmissionGb: config.maxTotalSubmissionGb,
            submissionFileCount: submissionPolicy.fileCount,
            submissionTotalBytes: submissionPolicy.totalBytes,
            blockedExtensions: config.blockedExtensions || [],
            maxFileSizeGb: destination.maxFileSizeGb,
            accept: destination.accept || '*'
          },
          attempts,
          uploadUrlHash: hashSecret(session.uploadUrl)
        });

        const audit = await writeAuditEventSafe('upload-session-created', {
          sessionId,
          submissionId: fields.submissionId || null,
          clientRequestId: fields.clientRequestId || null,
          destinationId: destination.id,
          destinationName: destination.name,
          fileName,
          fileSize,
          mimeType,
          submissionFileCount: submissionPolicy.fileCount,
          submissionTotalBytes: submissionPolicy.totalBytes,
          manifestFileId: manifestResult.saved?.id || null
        });

        return json(200, {
          ok: true,
          storageProvider: session.storageProvider || 'cloudflare-r2',
          uploadMode: session.uploadMode || 's3-multipart',
          sessionId,
          submissionId: fields.submissionId || '',
          uploadUrl: session.uploadUrl,
          uploadId: session.uploadId || '',
          objectKey: session.objectKey || '',
          bucket: session.bucket || '',
          parts: session.parts || [],
          chunkSize: Math.floor(Number(config.chunkSizeMb || 8) * 1024 * 1024),
          destination: {
            id: destination.id,
            name: destination.name,
            role: destination.role,
            priority: destination.priority
          },
          file: {
            name: fileName,
            size: fileSize,
            mimeType,
            fingerprint: fileFingerprint
          },
          r2Object: session.r2Object || null,
          manifest: {
            id: manifestResult.manifest.sessionId,
            fileId: manifestResult.saved?.id || null,
            status: manifestResult.manifest.status
          },
          policy: {
            blockedExtensions: config.blockedExtensions || []
          },
          abuseControls: {
            turnstile: humanGate?.configured ? { configured: true, ok: true } : { configured: false, skipped: true }
          },
          attempts,
          audit,
          createdAt: new Date().toISOString()
        }, noStoreCors(event));
      } catch (error) {
        attempts.push({
          destinationId: destination.id,
          destinationName: destination.name,
          ok: false,
          error: error.message,
          statusCode: error.statusCode || 500
        });
      }
    }

    await writeAuditEventSafe('upload-session-failed', { attempts, fileName, fileSize, mimeType });
    return json(502, { ok: false, error: 'Every configured destination failed to create an upload session.', attempts }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
