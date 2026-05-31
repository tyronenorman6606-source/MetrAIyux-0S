import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdminAccess, cleanText, adminAuditDetails } from './_lib/security.js';
import { loadReceipt, writeAuditEventSafe } from './_lib/config.js';
import { notifyUploadComplete, sendClientReceiptEmail } from './_lib/notifications.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const admin = await requireAdminAccess(event);
    const body = await readJson(event);
    const receiptId = cleanText(body.receiptId, 160);
    if (!receiptId) {
      const error = new Error('receiptId is required.');
      error.statusCode = 400;
      throw error;
    }
    const record = await loadReceipt(receiptId);
    if (!record?.receipt?.entry) {
      const error = new Error('Receipt was not found.');
      error.statusCode = 404;
      throw error;
    }
    const entry = record.receipt.entry;
    const notification = await notifyUploadComplete(entry, 'notification.replay');
    const clientReceiptEmail = body.sendClientReceipt === true ? await sendClientReceiptEmail(entry) : { skipped: true, ok: true };
    const audit = await writeAuditEventSafe('notification-replayed', adminAuditDetails(admin, {
      receiptId,
      notificationOk: notification.ok,
      clientReceiptEmailOk: clientReceiptEmail.ok,
      channels: notification.results?.map((item) => item.channel) || []
    }));
    return json(200, { ok: notification.ok && clientReceiptEmail.ok, notification, clientReceiptEmail, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
