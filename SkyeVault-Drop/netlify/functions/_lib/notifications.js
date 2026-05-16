import crypto from 'node:crypto';

function configured(value) {
  return Boolean(String(value || '').trim());
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function retries() {
  const value = Number(process.env.NOTIFY_RETRIES || 2);
  if (!Number.isFinite(value)) return 2;
  return Math.min(5, Math.max(0, Math.floor(value)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryNotify(operation) {
  const maxRetries = retries();
  let attempt = 0;
  let delay = 700;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      attempt += 1;
      await sleep(Math.min(7000, delay) * (0.75 + Math.random() * 0.5));
      delay *= 2;
    }
  }
}

function timeoutMs() {
  const value = Number(process.env.NOTIFY_TIMEOUT_MS || 8000);
  if (!Number.isFinite(value)) return 8000;
  return Math.min(30000, Math.max(1000, value));
}

function hmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function notificationPayload(entry, eventType = 'upload.completed') {
  return {
    app: 'client-drop-vault',
    event: eventType,
    eventId: `evt_${crypto.randomBytes(10).toString('hex')}`,
    receiptId: entry.id || null,
    completedAt: entry.completedAt || new Date().toISOString(),
    clientName: entry.clientName || '',
    clientEmail: entry.clientEmail || '',
    projectName: entry.projectName || '',
    destinationId: entry.destinationId || '',
    destinationName: entry.destinationName || '',
    fileName: entry.fileName || '',
    fileSize: Number(entry.fileSize || 0),
    fileSizeLabel: formatBytes(entry.fileSize || 0),
    mimeType: entry.mimeType || '',
    scanStatus: entry.scan?.status || '',
    scanVerdict: entry.scan?.verdict || '',
    driveFileId: entry.driveFile?.id || entry.driveFileId || '',
    driveFileLink: entry.driveFile?.webViewLink || '',
    sessionId: entry.sessionId || '',
    submissionId: entry.submissionId || ''
  };
}

async function postWebhook(entry, eventType) {
  const url = String(process.env.NOTIFY_WEBHOOK_URL || '').trim();
  if (!url) return { configured: false, ok: true, skipped: true, channel: 'webhook' };
  const payload = notificationPayload(entry, eventType);
  const secret = String(process.env.NOTIFY_WEBHOOK_SECRET || '').trim();
  const signature = secret ? hmac(secret, payload) : null;
  const run = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs());
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(secret ? { 'x-client-drop-vault-secret': secret, 'x-client-drop-vault-signature': `sha256=${signature}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const text = await response.text().catch(() => '');
      if ([408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        const error = new Error(`Retryable webhook response ${response.status}.`);
        error.statusCode = response.status;
        error.response = text.slice(0, 500);
        throw error;
      }
      return { configured: true, ok: response.ok, channel: 'webhook', status: response.status, eventId: payload.eventId, signed: Boolean(signature), response: text.slice(0, 500) };
    } finally {
      clearTimeout(timeout);
    }
  };
  return retryNotify(run);
}

function operatorEmailText(entry) {
  const payload = notificationPayload(entry);
  return [
    'A SkyeVault-Drop upload completed.',
    '',
    `Receipt: ${payload.receiptId}`,
    payload.submissionId ? `Submission: ${payload.submissionId}` : '',
    `Client: ${payload.clientName || 'Not provided'} <${payload.clientEmail || 'not provided'}>`,
    `Project: ${payload.projectName || 'Not provided'}`,
    `Destination: ${payload.destinationName || payload.destinationId || 'Not provided'}`,
    `File: ${payload.fileName} (${payload.fileSizeLabel})`,
    payload.scanStatus ? `Scan: ${payload.scanStatus}${payload.scanVerdict ? ` — ${payload.scanVerdict}` : ''}` : '',
    payload.driveFileLink ? `Vault object: ${payload.driveFileLink}` : '',
    `Completed: ${payload.completedAt}`
  ].filter(Boolean).join('\n');
}

function htmlEscape(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function operatorEmailHtml(entry) {
  const p = notificationPayload(entry);
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#070912;color:#f5f7ff;padding:24px"><div style="max-width:680px;margin:auto;background:#11162a;border:1px solid #29304d;border-radius:18px;padding:24px"><p style="letter-spacing:.16em;text-transform:uppercase;color:#9fb3ff;font-size:12px">SkyeVault-Drop</p><h1 style="margin:0 0 14px">New upload received</h1><p><strong>Receipt:</strong> ${htmlEscape(p.receiptId)}</p><p><strong>Client:</strong> ${htmlEscape(p.clientName)} &lt;${htmlEscape(p.clientEmail)}&gt;</p><p><strong>Project:</strong> ${htmlEscape(p.projectName)}</p><p><strong>File:</strong> ${htmlEscape(p.fileName)} (${htmlEscape(p.fileSizeLabel)})</p><p><strong>Destination:</strong> ${htmlEscape(p.destinationName || p.destinationId)}</p><p><strong>Scan:</strong> ${htmlEscape(p.scanStatus || 'not configured')} ${p.scanVerdict ? `— ${htmlEscape(p.scanVerdict)}` : ''}</p><p style="color:#9aa3bb">Completed ${htmlEscape(p.completedAt)}</p></div></body></html>`;
}

async function postResend(body) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text().catch(() => '');
  if ([408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
    const error = new Error(`Retryable Resend response ${response.status}.`);
    error.statusCode = response.status;
    error.response = text.slice(0, 500);
    throw error;
  }
  return { ok: response.ok, status: response.status, response: text.slice(0, 500) };
}

async function sendResendEmail(entry, eventType) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const to = String(process.env.NOTIFY_EMAIL_TO || '').trim();
  const from = String(process.env.NOTIFY_EMAIL_FROM || '').trim();
  if (!apiKey || !to || !from) return { configured: false, ok: true, skipped: true, channel: 'resend-email' };
  const subject = eventType === 'notification.test'
    ? 'SkyeVault-Drop notification test'
    : eventType === 'notification.replay'
      ? `Replay: ${entry.projectName || entry.fileName || 'Client upload'}`
      : `New upload: ${entry.projectName || entry.fileName || 'Client asset'}`;
  const result = await retryNotify(() => postResend({
    from,
    to: to.split(',').map((item) => item.trim()).filter(Boolean),
    subject,
    text: operatorEmailText(entry),
    html: operatorEmailHtml(entry)
  }));
  return { configured: true, channel: 'resend-email', ...result };
}

function clientReceiptText(entry) {
  const payload = notificationPayload(entry);
  return [
    `Your upload was received for ${payload.projectName || 'your project'}.`,
    '',
    `Receipt ID: ${payload.receiptId}`,
    payload.submissionId ? `Submission ID: ${payload.submissionId}` : '',
    `File: ${payload.fileName} (${payload.fileSizeLabel})`,
    `Destination: ${payload.destinationName || 'Project intake vault'}`,
    payload.scanStatus ? `Security handling: ${payload.scanStatus}${payload.scanVerdict ? ` — ${payload.scanVerdict}` : ''}` : '',
    `Completed: ${payload.completedAt}`,
    '',
    'Keep this receipt ID for follow-up. If you uploaded the wrong file or need a replacement, contact your project operator.'
  ].filter(Boolean).join('\n');
}

function clientReceiptHtml(entry) {
  const p = notificationPayload(entry);
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7fb;color:#111827;padding:24px"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px"><p style="letter-spacing:.16em;text-transform:uppercase;color:#4f46e5;font-size:12px">Upload received</p><h1 style="margin:0 0 14px">Your project files landed</h1><p>Receipt ID: <strong>${htmlEscape(p.receiptId)}</strong></p><p>Project: <strong>${htmlEscape(p.projectName || 'Project intake')}</strong></p><p>File: <strong>${htmlEscape(p.fileName)}</strong> (${htmlEscape(p.fileSizeLabel)})</p><p>Destination: ${htmlEscape(p.destinationName || 'Project intake vault')}</p>${p.scanStatus ? `<p>Security handling: ${htmlEscape(p.scanStatus)} ${p.scanVerdict ? `— ${htmlEscape(p.scanVerdict)}` : ''}</p>` : ''}<p style="color:#6b7280">Keep this receipt ID for follow-up. Completed ${htmlEscape(p.completedAt)}.</p></div></body></html>`;
}

export async function sendClientReceiptEmail(entry) {
  if (String(process.env.CLIENT_RECEIPT_EMAILS || '').toLowerCase() !== 'true') {
    return { configured: false, ok: true, skipped: true, channel: 'client-receipt-email' };
  }
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.CLIENT_RECEIPT_EMAIL_FROM || process.env.NOTIFY_EMAIL_FROM || '').trim();
  const to = String(entry.clientEmail || '').trim();
  if (!apiKey || !from || !to) return { configured: false, ok: true, skipped: true, channel: 'client-receipt-email' };
  const result = await retryNotify(() => postResend({
    from,
    to: [to],
    reply_to: String(process.env.CLIENT_RECEIPT_REPLY_TO || process.env.NOTIFY_EMAIL_TO || '').trim() || undefined,
    subject: `Upload received: ${entry.projectName || entry.fileName || 'Project assets'}`,
    text: clientReceiptText(entry),
    html: clientReceiptHtml(entry)
  }));
  return { configured: true, channel: 'client-receipt-email', ...result };
}

export function notificationConfigSummary() {
  return {
    webhookConfigured: configured(process.env.NOTIFY_WEBHOOK_URL),
    webhookSecretConfigured: configured(process.env.NOTIFY_WEBHOOK_SECRET),
    webhookHmacSigning: configured(process.env.NOTIFY_WEBHOOK_URL) && configured(process.env.NOTIFY_WEBHOOK_SECRET),
    resendConfigured: configured(process.env.RESEND_API_KEY) && configured(process.env.NOTIFY_EMAIL_TO) && configured(process.env.NOTIFY_EMAIL_FROM),
    emailToConfigured: configured(process.env.NOTIFY_EMAIL_TO),
    emailFromConfigured: configured(process.env.NOTIFY_EMAIL_FROM),
    clientReceiptEmailsEnabled: String(process.env.CLIENT_RECEIPT_EMAILS || '').toLowerCase() === 'true',
    clientReceiptFromConfigured: configured(process.env.CLIENT_RECEIPT_EMAIL_FROM || process.env.NOTIFY_EMAIL_FROM),
    retries: retries(),
    timeoutMs: timeoutMs()
  };
}

export async function notifyUploadComplete(entry, eventType = 'upload.completed') {
  const results = [];
  for (const runner of [postWebhook, sendResendEmail]) {
    try {
      results.push(await runner(entry, eventType));
    } catch (error) {
      results.push({ ok: false, channel: runner.name, error: error.message, statusCode: error.statusCode || undefined, response: error.response || undefined });
    }
  }
  return {
    ok: results.every((item) => item.ok),
    configured: results.some((item) => item.configured),
    results
  };
}

export async function sendNotificationTest() {
  return notifyUploadComplete({
    id: `test_${Date.now()}`,
    completedAt: new Date().toISOString(),
    clientName: 'Operator Test',
    clientEmail: 'operator@example.com',
    projectName: 'SkyeVault-Drop Notification Test',
    destinationName: 'Test Destination',
    fileName: 'notification-test.txt',
    fileSize: 13,
    mimeType: 'text/plain',
    sessionId: 'test-session',
    scan: { status: 'test', verdict: 'notification channel test' }
  }, 'notification.test');
}
