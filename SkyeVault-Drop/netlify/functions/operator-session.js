import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { constantTimeEqual, createOperatorSessionCookie } from './_lib/security.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const configured = process.env.ADMIN_TOKEN;
    if (!configured) return json(500, { ok: false, error: 'ADMIN_TOKEN is not configured.' }, noStoreCors(event));
    const body = await readJson(event);
    const provided = body.adminToken || body.token || '';
    if (!constantTimeEqual(provided, configured)) {
      return json(401, { ok: false, error: 'Operator token is invalid.' }, noStoreCors(event));
    }
    return json(200, { ok: true, message: 'Operator session created.' }, {
      ...noStoreCors(event),
      'set-cookie': createOperatorSessionCookie(event)
    });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
