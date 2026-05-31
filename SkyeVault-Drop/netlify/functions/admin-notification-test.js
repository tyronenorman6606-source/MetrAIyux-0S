import { json, method, handleOptions, noStoreCors } from './_lib/http.js';
import { requireAdminAccess, adminAuditDetails } from './_lib/security.js';
import { sendNotificationTest, notificationConfigSummary } from './_lib/notifications.js';
import { writeAuditEventSafe } from './_lib/config.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const admin = await requireAdminAccess(event);
    const result = await sendNotificationTest();
    const audit = await writeAuditEventSafe('admin-notification-test-ran', adminAuditDetails(admin, { ok: result.ok, configured: result.configured }));
    return json(200, { ok: result.ok, configured: result.configured, config: notificationConfigSummary(), notification: result, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
