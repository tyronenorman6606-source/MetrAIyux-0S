import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { createOperatorSessionCookie, requireAdminAccess, adminAuditDetails } from './_lib/security.js';
import { writeAuditEventSafe } from './_lib/config.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event).catch(() => ({}));
    const bodyToken = String(body.token || body.gateToken || body.session || '').replace(/^Bearer\s+/i, '').trim();
    const authEvent = bodyToken
      ? {
          ...event,
          headers: {
            ...(event.headers || {}),
            authorization: `Bearer ${bodyToken}`,
            'x-skye-gate-session': bodyToken
          }
        }
      : event;
    const admin = await requireAdminAccess(authEvent);
    const audit = await writeAuditEventSafe('operator-session-created', adminAuditDetails(admin, {
      recoveryType: 'fs27-bound-operator-session'
    }));
    return json(200, {
      ok: true,
      message: 'FS27-bound SkyeVault operator session created.',
      source: admin.type || 'fs27-skygate',
      actor: admin.actor,
      audit
    }, {
      ...noStoreCors(event),
      'set-cookie': createOperatorSessionCookie(event, admin)
    });
  } catch (error) {
    return json(error.statusCode || 401, { ok: false, error: error.message, code: 'shared_gate_required' }, noStoreCors(event));
  }
}
