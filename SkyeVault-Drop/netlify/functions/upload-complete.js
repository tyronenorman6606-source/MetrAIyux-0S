import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { resolvePortalAccess, cleanText, safeFileName, getHeader } from './_lib/security.js';
import { appendLedger, loadConfig, receiptIdFor, loadSessionManifest, markSessionManifestComplete, updateSessionManifestStatus, writeAuditEventSafe } from './_lib/config.js';
import { completeMultipartUpload, createDownloadUrl, getDriveFileMetadata } from './_lib/google-drive.js';
import { notifyUploadComplete, sendClientReceiptEmail } from './_lib/notifications.js';
import { scanUpload } from './_lib/scanner.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}


function verifyFingerprint(body, appProperties, manifest) {
  const manifestFingerprint = manifest?.file?.fingerprint || null;
  const bodyFingerprint = body.fileFingerprint || null;
  const driveFingerprint = appProperties.fileFingerprintValue ? {
    algorithm: appProperties.fileFingerprintAlgorithm || 'SHA-256',
    mode: appProperties.fileFingerprintMode || '',
    value: appProperties.fileFingerprintValue || '',
    bytesHashed: Number(appProperties.fileFingerprintBytes || 0)
  } : null;

  const expected = manifestFingerprint || bodyFingerprint || null;
  if (!expected) return null;
  if (!driveFingerprint?.value) fail('Vault object is missing the expected file fingerprint metadata.', 403);
  if (String(driveFingerprint.value).toLowerCase() !== String(expected.value || '').toLowerCase()) {
    fail('Vault object fingerprint metadata does not match the upload manifest.', 409);
  }
  if (bodyFingerprint?.value && String(bodyFingerprint.value).toLowerCase() !== String(expected.value || '').toLowerCase()) {
    fail('Completion fingerprint does not match the upload manifest.', 409);
  }
  return driveFingerprint;
}

function verifyManifest(body, manifestRecord, verifiedFile) {
  if (!manifestRecord?.manifest) fail('Upload session manifest was not found. Completion is blocked to avoid untracked vault objects.', 409);
  const manifest = manifestRecord.manifest;
  const declaredSize = Number(body.fileSize || 0);
  const manifestSize = Number(manifest.file?.size || 0);
  const actualSize = Number(verifiedFile.size || 0);
  if (manifest.sessionId !== cleanText(body.sessionId, 120)) fail('Upload manifest session does not match completion request.', 403);
  if (manifest.destination?.id !== cleanText(body.destinationId, 120)) fail('Upload manifest destination does not match completion request.', 403);
  if (manifest.file?.name && safeFileName(manifest.file.name) !== safeFileName(body.fileName || verifiedFile.name)) fail('Upload manifest file name does not match completion request.', 409);
  if (manifestSize && actualSize && manifestSize !== actualSize) fail('Vault object size does not match the upload manifest.', 409);
  if (declaredSize && manifestSize && declaredSize !== manifestSize) fail('Completion file size does not match the upload manifest.', 409);
  if (manifest.status === 'complete' && manifest.receiptId) return manifest;
  return manifest;
}

function verifiedText(value, fallback = '', max = 180) {
  return cleanText(value || fallback || '', max);
}

function envEnabled(name, fallback = true) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  if (!value) return fallback;
  return !['0', 'false', 'no', 'off'].includes(value);
}

function boundedSeconds(value, fallback = 900) {
  const seconds = Number(value || fallback);
  if (!Number.isFinite(seconds) || seconds <= 0) return fallback;
  return Math.min(3600, Math.max(300, seconds));
}

function publicBaseUrl(event) {
  const configured = String(process.env.SKYEVAULT_PUBLIC_URL || process.env.URL || process.env.DEPLOY_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const host = String(getHeader(event, 'host') || '').trim();
  if (!host) return '';
  const proto = String(getHeader(event, 'x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
  return `${proto}://${host}`;
}

async function uploadRecoveryLink(event, entry, verifiedFile) {
  if (!envEnabled('SKYEVAULT_RETURN_DOWNLOAD_LINK', true)) return null;
  const expiresInSeconds = boundedSeconds(process.env.SKYEVAULT_DOWNLOAD_LINK_SECONDS || process.env.UPLOAD_COMPLETE_DOWNLOAD_LINK_SECONDS, 900);
  const downloadUrl = createDownloadUrl(verifiedFile.id, {
    fileName: entry.fileName || verifiedFile.name,
    mimeType: entry.mimeType || verifiedFile.mimeType,
    expires: expiresInSeconds
  });
  const baseUrl = publicBaseUrl(event);
  return {
    ok: true,
    downloadUrl,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    expiresInSeconds,
    recoveryUrl: baseUrl ? `${baseUrl}/#client-vault` : '',
    receiptId: entry.id,
    clientEmail: entry.clientEmail,
    access: 'Short-lived signed download URL minted only after gated upload completion. Recovery portal still requires the upload email and portal/workspace key.'
  };
}

function verifyVaultObject(body, verifiedFile, config) {
  const sessionId = cleanText(body.sessionId, 120);
  const destinationId = cleanText(body.destinationId, 120);
  const clientRequestId = cleanText(body.clientRequestId, 160);
  const submissionId = cleanText(body.submissionId, 160);
  const appProperties = verifiedFile?.appProperties || {};

  if (!sessionId) fail('sessionId is required.');
  if (!destinationId) fail('destinationId is required.');
  if (appProperties.source !== 'client-drop-vault') fail('Vault object was not created by SkyeVault-Drop.', 403);
  if (appProperties.sessionId !== sessionId) fail('Vault object session does not match this completion request.', 403);
  if (appProperties.destinationId !== destinationId) fail('Vault object destination does not match this completion request.', 403);
  if (body.workspaceId && appProperties.workspaceId && appProperties.workspaceId !== cleanText(body.workspaceId, 120)) {
    fail('Vault object workspace does not match this completion request.', 403);
  }
  if (clientRequestId && appProperties.clientRequestId && appProperties.clientRequestId !== clientRequestId) {
    fail('Vault object request ID does not match this completion request.', 403);
  }
  if (submissionId && appProperties.submissionId && appProperties.submissionId !== submissionId) {
    fail('Vault object submission ID does not match this completion request.', 403);
  }
  if (config.requireUsageRights !== false && appProperties.usageRightsAccepted !== 'true') fail('Vault object is missing the required usage-rights confirmation.', 403);
  if (config.requireRetentionAck !== false && appProperties.retentionAcknowledged !== 'true') fail('Vault object is missing the required storage acknowledgement.', 403);

  const destination = config.destinations.find((item) => item.id === destinationId);
  if (!destination) fail('Completion destination no longer exists in routing config.', 400);
  if (destination.folderId && Array.isArray(verifiedFile.parents) && !verifiedFile.parents.includes(destination.folderId)) {
    fail('Vault object is not inside the expected destination prefix.', 403);
  }

  const declaredSize = Number(body.fileSize || 0);
  const actualSize = Number(verifiedFile.size || 0);
  if (declaredSize && actualSize && declaredSize !== actualSize) {
    fail('Vault object size does not match the original upload request.', 409);
  }

  return { sessionId, destinationId, destination, appProperties };
}

function enforcePortalAccess(portalAccess = {}, manifest = null, appProperties = {}) {
  if (portalAccess.type !== 'developer-workspace') return;
  const expectedWorkspace = portalAccess.workspaceId || '';
  const manifestWorkspace = manifest?.intake?.workspaceId || manifest?.access?.workspaceId || '';
  const objectWorkspace = appProperties.workspaceId || '';
  if (!expectedWorkspace) fail('Developer workspace access is misconfigured.', 500);
  if (manifestWorkspace !== expectedWorkspace) fail('This upload session belongs to a different developer workspace.', 403);
  if (objectWorkspace !== expectedWorkspace) fail('This vault object belongs to a different developer workspace.', 403);
  if (portalAccess.destinationId && manifest?.destination?.id && manifest.destination.id !== portalAccess.destinationId) {
    fail('This upload session belongs to a destination outside this developer workspace.', 403);
  }
}

async function finalizeUploadedObject(body, objectKey) {
  const upload = body.driveFile || body.r2Object || {};
  if (upload.uploadId && Array.isArray(upload.parts) && upload.parts.length) {
    try {
      return await getDriveFileMetadata(objectKey);
    } catch (error) {
      if (error.statusCode && error.statusCode !== 404) throw error;
    }
    await completeMultipartUpload(objectKey, upload.uploadId, upload.parts);
  }
  return getDriveFileMetadata(objectKey);
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event);
    const portalAccess = await resolvePortalAccess(event, body);

    const driveFileId = cleanText(body.driveFileId || body.driveFile?.id, 160);
    if (!driveFileId) fail('driveFileId is required.');

    const [{ config }, verifiedFile] = await Promise.all([
      loadConfig(),
      finalizeUploadedObject(body, driveFileId)
    ]);

    const verified = verifyVaultObject(body, verifiedFile, config);
    const manifestRecord = await loadSessionManifest(verified.sessionId);
    const manifest = verifyManifest(body, manifestRecord, verifiedFile);
    enforcePortalAccess(portalAccess, manifest, verified.appProperties);
    const verifiedFingerprint = verifyFingerprint(body, verified.appProperties, manifest);
    const receiptId = receiptIdFor(verified.sessionId, verifiedFile.id);
    const props = verified.appProperties || {};
    const manifestIntake = manifest.intake || {};
    const entry = {
      id: receiptId,
      completedAt: new Date().toISOString(),
      sessionId: verified.sessionId,
      clientRequestId: verifiedText(manifestIntake.clientRequestId, props.clientRequestId || body.clientRequestId, 160),
      submissionId: verifiedText(manifestIntake.submissionId, props.submissionId || body.submissionId, 160),
      workspaceId: verifiedText(manifestIntake.workspaceId, props.workspaceId || body.workspaceId, 120),
      developerId: verifiedText(manifestIntake.developerId, props.developerId || body.developerId, 120),
      developerName: verifiedText(manifestIntake.developerName, body.developerName, 120),
      accessType: verifiedText(manifestIntake.accessType, portalAccess.type || body.accessType, 40),
      destinationId: verified.destinationId,
      destinationName: cleanText(body.destinationName || verified.destination.name, 180),
      clientName: verifiedText(manifestIntake.clientName, props.clientName || body.clientName, 180),
      clientEmail: verifiedText(manifestIntake.clientEmail, props.clientEmail || body.clientEmail, 180),
      clientPhone: verifiedText(manifestIntake.clientPhone, props.clientPhone || body.clientPhone, 80),
      websiteUrl: verifiedText(manifestIntake.websiteUrl, props.websiteUrl || body.websiteUrl, 240),
      projectName: verifiedText(manifestIntake.projectName, props.projectName || body.projectName, 180),
      clientReference: verifiedText(manifestIntake.clientReference, props.clientReference || body.clientReference, 120),
      assetType: verifiedText(manifestIntake.assetType, props.assetType || body.assetType, 120),
      deadline: verifiedText(manifestIntake.deadline, props.deadline || body.deadline, 40),
      notes: cleanText(body.notes, 1200),
      usageRightsAccepted: props.usageRightsAccepted === 'true' || body.usageRightsAccepted === true,
      retentionAcknowledged: props.retentionAcknowledged === 'true' || body.retentionAcknowledged === true,
      fileName: safeFileName(body.fileName || verifiedFile.name),
      fileSize: Number(verifiedFile.size || body.fileSize || 0),
      mimeType: cleanText(verifiedFile.mimeType || body.mimeType || 'application/octet-stream', 160),
      driveFile: verifiedFile,
      fileFingerprint: verifiedFingerprint || manifest.file?.fingerprint || null,
      manifestFileId: manifestRecord?.file?.id || null
    };

    const scan = await scanUpload(entry, verifiedFile);
    entry.scan = scan;
    if (scan.status === 'flagged' && String(process.env.SCAN_BLOCK_FLAGGED || '').toLowerCase() === 'true') {
      await updateSessionManifestStatus(verified.sessionId, 'flagged', {
        lastError: `Scanner flagged upload: ${scan.verdict || 'No scanner verdict supplied.'}`,
        policy: { scan }
      }).catch(() => null);
      await writeAuditEventSafe('upload-scan-flagged', {
        sessionId: entry.sessionId,
        submissionId: entry.submissionId || null,
        destinationId: entry.destinationId,
        fileName: entry.fileName,
        driveFileId: verifiedFile.id,
        workspaceId: entry.workspaceId || null,
        developerId: entry.developerId || null,
        scan
      });
      fail('Upload was received but flagged by scanner policy. Operator review is required.', 409);
    }

    const ledger = await appendLedger(entry);
    let manifestUpdate = null;
    let manifestWarning = null;
    try {
      manifestUpdate = await markSessionManifestComplete(verified.sessionId, {
        receiptId: entry.id,
        driveFileId: verifiedFile.id,
        completedAt: entry.completedAt,
        destination: verified.destination,
        file: { name: entry.fileName, size: entry.fileSize, mimeType: entry.mimeType, fingerprint: entry.fileFingerprint },
        intake: {
          clientName: entry.clientName,
          clientEmail: entry.clientEmail,
          clientPhone: entry.clientPhone,
          websiteUrl: entry.websiteUrl,
          projectName: entry.projectName,
          clientReference: entry.clientReference,
          assetType: entry.assetType,
          deadline: entry.deadline,
          clientRequestId: entry.clientRequestId,
          submissionId: entry.submissionId,
          workspaceId: entry.workspaceId,
          developerId: entry.developerId,
          developerName: entry.developerName,
          accessType: entry.accessType
        },
        policy: { scan }
      });
    } catch (error) {
      manifestWarning = `Receipt was saved, but session manifest completion failed: ${error.message}`;
    }
    const audit = await writeAuditEventSafe('upload-completed', {
      receiptId: entry.id,
      sessionId: entry.sessionId,
      submissionId: entry.submissionId || null,
      clientRequestId: entry.clientRequestId || null,
      destinationId: entry.destinationId,
      destinationName: entry.destinationName,
      workspaceId: entry.workspaceId || null,
      developerId: entry.developerId || null,
      fileName: entry.fileName,
      fileSize: entry.fileSize,
      driveFileId: verifiedFile.id,
      receiptFileId: ledger?.receiptSaved?.id || null,
      manifestFileId: manifestRecord?.file?.id || null,
      scanStatus: entry.scan?.status || null,
      scanVerdict: entry.scan?.verdict || null
    });
    let notification = null;
    try {
      notification = await notifyUploadComplete({ ...entry, receiptSignature: ledger?.receiptSignature || undefined });
    } catch (error) {
      notification = { ok: false, configured: true, error: error.message };
    }
    let clientReceiptEmail = null;
    try {
      clientReceiptEmail = await sendClientReceiptEmail({ ...entry, receiptSignature: ledger?.receiptSignature || undefined });
    } catch (error) {
      clientReceiptEmail = { ok: false, configured: true, error: error.message };
    }
    await writeAuditEventSafe('notification-delivery-recorded', {
      receiptId: entry.id,
      sessionId: entry.sessionId,
      notificationOk: notification?.ok ?? null,
      clientReceiptEmailOk: clientReceiptEmail?.ok ?? null,
      notificationConfigured: notification?.configured ?? null,
      channels: notification?.results?.map((item) => ({ channel: item.channel, ok: item.ok, status: item.status || null, signed: item.signed || false })) || []
    });

    let download = null;
    try {
      download = await uploadRecoveryLink(event, entry, verifiedFile);
      if (download?.downloadUrl) {
        await writeAuditEventSafe('upload-complete-download-link-created', {
          receiptId: entry.id,
          sessionId: entry.sessionId,
          clientEmail: entry.clientEmail || '',
          fileName: entry.fileName,
          fileSize: entry.fileSize,
          expiresInSeconds: download.expiresInSeconds
        });
      }
    } catch (error) {
      download = {
        ok: false,
        warning: `Upload completed, but the immediate download link could not be created: ${error.message}`
      };
    }

    const receiptEntry = ledger?.receiptCreated === false && ledger?.receiptSaved ? ledger.receiptSaved : null;
    return json(200, {
      ok: true,
      entry: { ...entry, receiptSignature: ledger?.receiptSignature || undefined },
      ledger,
      receipt: {
        id: entry.id,
        created: ledger.receiptCreated,
        fileId: ledger.receiptSaved?.id || receiptEntry?.id || null,
        warning: ledger.ledgerWarning || manifestWarning || null
      },
      manifest: {
        id: verified.sessionId,
        fileId: manifestRecord?.file?.id || null,
        updated: Boolean(manifestUpdate?.saved),
        warning: manifestWarning
      },
      notification,
      clientReceiptEmail,
      download,
      audit
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
