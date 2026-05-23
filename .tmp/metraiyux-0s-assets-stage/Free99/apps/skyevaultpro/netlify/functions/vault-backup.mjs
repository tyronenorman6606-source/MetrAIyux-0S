import { json } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

function getUserId(context, body) {
  const identity = context?.netlify?.identity;
  const user = context?.netlify?.user;
  return user?.sub || user?.email || identity?.url || String(body?.userId || '').trim() || null;
}

export default async (request, context) => {
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  if (process.env.SKYEVAULTPRO_HOSTED_BACKUP_ENABLED !== '1') {
    return json({
      error: 'SkyeVault Pro hosted backup requires the $4.99/mo Sovereign Backup add-on and is disabled by default.'
    }, { status: 402 });
  }
  const store = getStore('vault-backups');
  const userId = getUserId(context, body);
  if (!userId) return json({ error: 'Login is required for hosted backup.' }, { status: 401 });
  const key = `${userId}/vault-snapshot.json`;

  if (request.method === 'GET') {
    const entry = await store.get(key, { type: 'json' });
    if (!entry) return json({ ok: true, snapshot: null });
    return json({ ok: true, snapshot: entry });
  }

  if (request.method === 'POST') {
    const snapshot = body?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') return json({ error: 'snapshot payload is required.' }, { status: 400 });
    await store.setJSON(key, {
      savedAt: new Date().toISOString(),
      siteVersion: '1.2.0',
      snapshot
    });
    return json({ ok: true, savedAt: new Date().toISOString() });
  }

  return json({ error: 'Method not allowed.' }, { status: 405 });
};
