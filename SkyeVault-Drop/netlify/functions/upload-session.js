import crypto from 'node:crypto';
import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { resolvePortalAccess, safeFileName, cleanText, safeId } from './_lib/security.js';
import { loadConfig, chooseDestinations, assertFileAllowed, newSessionId, saveSessionManifest, writeAuditEventSafe, loadLedger } from './_lib/config.js';
import { createResumableSession, createStreamingMultipartSession } from './_lib/google-drive.js';
import { applyNamedRateLimit, applyRateLimit, assertHoneypot, verifyTurnstile } from './_lib/rate-limit.js';

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

function booleanField(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function intakeFields(config, body, portalAccess = {}) {
  const workspaceId = safeId(portalAccess.workspaceId || body.workspaceId || '');
  const developerId = safeId(portalAccess.developerId || body.developerId || '');
  const requestedCustodyScope = cleanText(body.custodyScope || portalAccess.custodyScope || '', 80).toLowerCase();
  const custodyScope = requestedCustodyScope || (portalAccess.type === 'owner-admin' && body.ownerPrivate === true ? 'owner-private' : '');
  if (custodyScope === 'owner-private' && portalAccess.type !== 'owner-admin') {
    fail('Owner-private vault custody can only be created from the shared owner/admin gate.');
  }
  const ownerPrivate = custodyScope === 'owner-private';
  const fields = {
    clientName: cleanText(body.clientName || portalAccess.clientName, 180),
    clientEmail: validateEmail(body.clientEmail || portalAccess.clientEmail),
    clientPhone: cleanText(body.clientPhone, 80),
    websiteUrl: validateUrl(body.websiteUrl),
    projectName: cleanText(body.projectName || portalAccess.projectName || workspaceId, 180),
    clientReference: cleanText(body.clientReference, 120),
    assetType: cleanText(body.assetType || 'General project package', 120),
    deadline: validateDate(body.deadline),
    notes: cleanText(body.notes, 1200),
    usageRightsAccepted: body.usageRightsAccepted === true,
    retentionAcknowledged: body.retentionAcknowledged === true,
    clientRequestId: cleanText(body.clientRequestId, 160),
    submissionId: cleanText(body.submissionId, 160),
    workspaceId,
    developerId,
    developerName: cleanText(body.developerName || portalAccess.developerName, 120),
    accessType: cleanText(portalAccess.type || 'portal', 40),
    custodyScope,
    vaultVisibility: cleanText(body.vaultVisibility || (ownerPrivate ? 'owner-only' : ''), 80).toLowerCase(),
    ownerAccountId: safeId(body.ownerAccountId || body.accountId || ''),
    ownerSubject: cleanText(body.ownerSubject || '', 120),
    ownerEmail: validateEmail(body.ownerEmail || ''),
    ownerWorkspaceId: safeId(body.ownerWorkspaceId || ''),
    ownerWorkspaceSlug: safeId(body.ownerWorkspaceSlug || ''),
    accessPolicy: cleanText(body.accessPolicy || (ownerPrivate ? 'shared-gate-owner-admin-only' : ''), 160),
    clientVaultVisible: ownerPrivate ? false : booleanField(body.clientVaultVisible, true),
    clientVaultDownloadAllowed: ownerPrivate ? false : booleanField(body.clientVaultDownloadAllowed, true)
  };

  if (config.requireClientName !== false && !fields.clientName) fail('Client name is required.');
  if (config.requireClientEmail !== false && !fields.clientEmail) fail('Client email is required.');
  if (config.requireProjectName !== false && !fields.projectName) fail('Project / website name is required.');
  return fields;
}



function scopedLimit(configValue, accessValue) {
  const configNumber = Number(configValue);
  const accessNumber = Number(accessValue);
  if (Number.isFinite(accessNumber) && accessNumber > 0) return accessNumber;
  return configNumber;
}

function validateSubmissionPolicy(config, body, fallbackFileSize, portalAccess = {}) {
  const fileCount = Number(body.submissionFileCount || 1);
  const totalBytes = Number(body.submissionTotalBytes || fallbackFileSize || 0);
  const maxFiles = Number(scopedLimit(config.maxFilesPerSubmission || 25, portalAccess.maxFilesPerSubmission));
  const maxTotalGb = Number(scopedLimit(config.maxTotalSubmissionGb || 5000, portalAccess.maxTotalSubmissionGb));
  const maxTotalBytes = maxTotalGb * 1024 * 1024 * 1024;
  if (!Number.isFinite(fileCount) || fileCount < 1) fail('Submission file count is invalid.');
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) fail('Submission total size is invalid.');
  if (maxFiles && fileCount > maxFiles) fail(`This portal allows ${maxFiles} files per submission.`, 413);
  if (maxTotalBytes && totalBytes > maxTotalBytes) fail(`This portal allows up to ${maxTotalGb} GB per submission.`, 413);
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
    fields.workspaceId ? `Workspace: ${fields.workspaceId}` : '',
    fields.developerId ? `Developer: ${fields.developerName || fields.developerId}` : '',
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

function wantsStreamingMultipart(body = {}) {
  const mode = cleanText(body.uploadMode || body.uploadModeRequested || '', 80).toLowerCase();
  return body.streamingMultipart === true || mode === 's3-multipart-streaming' || mode === 'streaming-s3-multipart';
}

function isRepoPushRequest(body = {}, fileName = '') {
  const text = [
    body.assetType,
    body.clientReference,
    body.projectName,
    body.notes,
    fileName
  ].map((item) => String(item || '').toLowerCase()).join(' ');
  return /full[- ]?repo|repo[- ]?push|repo[- ]?custody|full[- ]?custody|brain[- ]?vault|workspace[- ]?snapshot/.test(text);
}

function repoPushEntryMatches(entry = {}) {
  return isRepoPushRequest({
    assetType: entry.assetType,
    clientReference: entry.clientReference,
    projectName: entry.projectName,
    notes: entry.notes
  }, entry.fileName || '');
}

function sameRepoMeterSubject(entry = {}, fields = {}) {
  if (fields.workspaceId) return entry.workspaceId === fields.workspaceId;
  if (fields.developerId) return entry.developerId === fields.developerId;
  if (fields.clientEmail) return String(entry.clientEmail || '').toLowerCase() === fields.clientEmail;
  return false;
}

async function enforceRepoPushMeter(portalAccess = {}, fields = {}, body = {}, fileName = '') {
  if (!isRepoPushRequest(body, fileName)) return null;
  if (String(portalAccess.repoPushMode || '').toLowerCase() === 'unlimited' || portalAccess.type === 'owner-admin') {
    return {
      kind: 'full-repo-push',
      mode: 'unlimited',
      plan: portalAccess.repoPushPlan || portalAccess.planName || 'owner-unlimited',
      maxGb: Number(portalAccess.maxTotalSubmissionGb || 5000)
    };
  }
  const limit = Number(portalAccess.repoPushesPerWindow || process.env.SKYEVAULT_DEFAULT_REPO_PUSHES_PER_WINDOW || 1);
  const windowDays = Number(portalAccess.repoPushWindowDays || process.env.SKYEVAULT_REPO_PUSH_WINDOW_DAYS || 30);
  const windowMs = Math.max(1, windowDays) * 24 * 60 * 60 * 1000;
  const since = Date.now() - windowMs;
  const ledger = await loadLedger(2500).catch(() => ({ entries: [] }));
  const used = (ledger.entries || []).filter((entry) => {
    const completedAt = Date.parse(entry.completedAt || entry.createdAt || '');
    return Number.isFinite(completedAt)
      && completedAt >= since
      && sameRepoMeterSubject(entry, fields)
      && repoPushEntryMatches(entry);
  }).length;
  if (limit > 0 && used >= limit) {
    fail(`This plan allows ${limit} full repo push${limit === 1 ? '' : 'es'} every ${windowDays} day${windowDays === 1 ? '' : 's'}.`, 429);
  }
  return {
    kind: 'full-repo-push',
    mode: 'metered',
    plan: portalAccess.repoPushPlan || portalAccess.planName || 'repo-standard',
    limit,
    used,
    remaining: limit > 0 ? Math.max(0, limit - used - 1) : null,
    windowDays,
    maxGb: Number(portalAccess.maxTotalSubmissionGb || 0)
  };
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
    const portalAccess = await resolvePortalAccess(event, body);
    if (portalAccess.workspaceId) {
      applyNamedRateLimit(`workspace:${portalAccess.workspaceId}:upload-session`, {
        limit: Number(portalAccess.rateLimitUploadSessionsPerWindow || process.env.WORKSPACE_UPLOAD_SESSION_RATE_LIMIT || 20),
        windowMs: Number(portalAccess.rateLimitWindowMs || process.env.WORKSPACE_RATE_WINDOW_MS || 60 * 60 * 1000),
        message: 'This vault workspace has reached its upload-session rate limit. Wait for the workspace window to reset.'
      });
    }
    const humanGate = await verifyTurnstile(event, body);

    const { config } = await loadConfig();
    requireIntakeConsent(config, body);

    const fileName = safeFileName(body.fileName);
    const streamingMultipart = wantsStreamingMultipart(body);
    const fileSize = Number(body.fileSize || body.expectedMaxBytes || body.declaredMaxBytes);
    const mimeType = cleanText(body.mimeType || 'application/octet-stream', 160) || 'application/octet-stream';
    const sessionId = newSessionId();
    const submissionPolicy = validateSubmissionPolicy(config, body, fileSize, portalAccess);
    const fields = intakeFields(config, body, portalAccess);
    const fileFingerprint = normalizeFingerprint(body.fileFingerprint);
    const repoPushPolicy = await enforceRepoPushMeter(portalAccess, fields, body, fileName);

    const destinations = chooseDestinations(config, portalAccess.destinationId || body.destinationId, body.failedDestinationIds || []);
    if (!destinations.length) {
      return json(400, { ok: false, error: 'No enabled vault destination is available for this upload.' }, noStoreCors(event));
    }

    const attempts = [];
    for (const destination of destinations) {
      try {
        const scopedDestination = portalAccess.maxFileSizeGb
          ? { ...destination, maxFileSizeGb: Math.min(Number(destination.maxFileSizeGb || portalAccess.maxFileSizeGb), Number(portalAccess.maxFileSizeGb)) }
          : destination;
        assertFileAllowed(scopedDestination, fileSize, mimeType, fileName, config);
        const uploadInput = {
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
        };
        const session = streamingMultipart
          ? await createStreamingMultipartSession(scopedDestination, uploadInput)
          : await createResumableSession(scopedDestination, uploadInput);

        const manifestResult = await saveSessionManifest({
          sessionId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          destination,
          file: { name: fileName, size: fileSize, mimeType, fingerprint: fileFingerprint },
          intake: fields,
          access: {
            type: portalAccess.type || 'portal',
            workspaceId: fields.workspaceId,
            developerId: fields.developerId,
            developerName: fields.developerName,
            custodyScope: fields.custodyScope,
            vaultVisibility: fields.vaultVisibility,
            ownerAccountId: fields.ownerAccountId,
            ownerWorkspaceId: fields.ownerWorkspaceId,
            accessPolicy: fields.accessPolicy
          },
          policy: {
            chunkSizeMb: config.chunkSizeMb,
            maxFilesPerSubmission: config.maxFilesPerSubmission,
            maxTotalSubmissionGb: config.maxTotalSubmissionGb,
            submissionFileCount: submissionPolicy.fileCount,
            submissionTotalBytes: submissionPolicy.totalBytes,
            blockedExtensions: config.blockedExtensions || [],
            maxFileSizeGb: scopedDestination.maxFileSizeGb,
            accept: scopedDestination.accept || '*',
            streamingMultipart,
            repoPushPolicy
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
          workspaceId: fields.workspaceId || null,
          developerId: fields.developerId || null,
          fileName,
          fileSize,
          mimeType,
          submissionFileCount: submissionPolicy.fileCount,
          submissionTotalBytes: submissionPolicy.totalBytes,
          streamingMultipart,
          repoPushPolicy,
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
          chunkSize: session.chunkSize || Math.floor(Number(config.chunkSizeMb || 8) * 1024 * 1024),
          maxParts: session.maxParts || null,
          partUrlEndpoint: session.partUrlEndpoint || '',
          destination: {
            id: scopedDestination.id,
            name: scopedDestination.name,
            role: scopedDestination.role,
            priority: scopedDestination.priority
          },
          workspace: fields.workspaceId ? {
            id: fields.workspaceId,
            developerId: fields.developerId,
            developerName: fields.developerName,
            accessType: fields.accessType
          } : null,
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
            blockedExtensions: config.blockedExtensions || [],
            streamingMultipart,
            repoPushPolicy
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
