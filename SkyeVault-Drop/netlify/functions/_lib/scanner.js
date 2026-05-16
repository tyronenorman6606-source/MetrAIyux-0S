import crypto from 'node:crypto';

function configured(value) {
  return Boolean(String(value || '').trim());
}

function mode() {
  const value = String(process.env.SCAN_MODE || 'none').trim().toLowerCase();
  if (['none', 'manual_review', 'external_webhook'].includes(value)) return value;
  return 'none';
}

function timeoutMs() {
  const value = Number(process.env.SCANNER_TIMEOUT_MS || 10000);
  if (!Number.isFinite(value)) return 10000;
  return Math.min(30000, Math.max(1000, value));
}

function signPayload(payload) {
  const secret = String(process.env.SCANNER_WEBHOOK_SECRET || '').trim();
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['clean', 'flagged', 'manual_review', 'pending_scan', 'not_scanned', 'scanner_error'].includes(status)) return status;
  return 'manual_review';
}

function scannerPayload(entry, verifiedFile) {
  return {
    app: 'client-drop-vault',
    event: 'scan.requested',
    requestedAt: new Date().toISOString(),
    receiptId: entry.id || null,
    sessionId: entry.sessionId || null,
    submissionId: entry.submissionId || null,
    clientName: entry.clientName || '',
    clientEmail: entry.clientEmail || '',
    projectName: entry.projectName || '',
    fileName: entry.fileName || verifiedFile?.name || '',
    fileSize: Number(entry.fileSize || verifiedFile?.size || 0),
    mimeType: entry.mimeType || verifiedFile?.mimeType || '',
    driveFileId: verifiedFile?.id || entry.driveFile?.id || '',
    driveFileLink: verifiedFile?.webViewLink || entry.driveFile?.webViewLink || '',
    fingerprint: entry.fileFingerprint || null
  };
}

async function externalWebhookScan(entry, verifiedFile) {
  const url = String(process.env.SCANNER_WEBHOOK_URL || '').trim();
  if (!url) {
    return {
      configured: false,
      status: 'manual_review',
      verdict: 'Scanner mode is external_webhook, but SCANNER_WEBHOOK_URL is missing.',
      checkedAt: new Date().toISOString()
    };
  }
  const payload = scannerPayload(entry, verifiedFile);
  const signature = signPayload(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(signature ? { 'x-client-drop-vault-scanner-signature': `sha256=${signature}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text().catch(() => '');
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    return {
      configured: true,
      ok: response.ok,
      status: response.ok ? normalizeStatus(data?.status || data?.verdictStatus || 'manual_review') : 'scanner_error',
      verdict: data?.verdict || data?.message || (response.ok ? 'Scanner webhook completed.' : `Scanner webhook failed with ${response.status}.`),
      provider: data?.provider || 'external_webhook',
      statusCode: response.status,
      response: data,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: 'scanner_error',
      verdict: error.name === 'AbortError' ? 'Scanner webhook timed out.' : error.message,
      provider: 'external_webhook',
      checkedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function scannerConfigSummary() {
  const activeMode = mode();
  return {
    mode: activeMode,
    scannerEnabled: activeMode !== 'none',
    externalWebhookConfigured: configured(process.env.SCANNER_WEBHOOK_URL),
    externalWebhookSecretConfigured: configured(process.env.SCANNER_WEBHOOK_SECRET),
    defaultOutcome: activeMode === 'none' ? 'not_scanned' : (activeMode === 'manual_review' ? 'manual_review' : 'pending_scan')
  };
}

export async function scanUpload(entry, verifiedFile) {
  const activeMode = mode();
  if (activeMode === 'none') {
    return {
      configured: false,
      ok: true,
      mode: activeMode,
      status: 'not_scanned',
      verdict: 'No scanner configured. File accepted into the vault but not malware-scanned by this app.',
      checkedAt: new Date().toISOString()
    };
  }
  if (activeMode === 'manual_review') {
    return {
      configured: true,
      ok: true,
      mode: activeMode,
      status: 'manual_review',
      verdict: 'Upload marked for manual review by operator policy.',
      checkedAt: new Date().toISOString()
    };
  }
  return { mode: activeMode, ...(await externalWebhookScan(entry, verifiedFile)) };
}
