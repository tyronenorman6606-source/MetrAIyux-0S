import { json, method, handleOptions, noStoreCors } from './_lib/http.js';
import { clearOperatorSessionCookie } from './_lib/security.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST', 'GET']);
  if (wrongMethod) return wrongMethod;
  return json(200, { ok: true, message: 'Operator session cleared.' }, {
    ...noStoreCors(event),
    'set-cookie': clearOperatorSessionCookie()
  });
}
