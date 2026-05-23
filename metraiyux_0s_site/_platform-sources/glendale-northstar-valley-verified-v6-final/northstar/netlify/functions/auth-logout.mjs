import { clearCookie, json, requireSession, getSql, auditEvent } from './_shared.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
    const session = await requireSession(event).catch(() => null);
    if (session) await auditEvent(getSql(), event, session, 'logout', 'Workspace user signed out.', {});
    return json(200, { ok: true }, { 'set-cookie': clearCookie() });
  } catch (error) {
    return json(200, { ok: true }, { 'set-cookie': clearCookie() });
  }
}
