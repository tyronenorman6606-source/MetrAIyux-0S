import { json } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { fs27AuthErrorResponse, hasVaultBackupEntitlement, identityKeysForUser, primaryIdentityKey, requireFs27User } from './_lib/fs27-auth.mjs';

async function findSnapshot(store, userId, aliases, user) {
  for (const alias of aliases) {
    const key = `${alias}/vault-snapshot.json`;
    const entry = await store.get(key, { type: 'json' });
    if (!entry) continue;
    if (alias === userId) return { entry, migratedFrom: '' };
    const migrated = {
      ...entry,
      user_id: userId,
      email: user.email || entry.email || '',
      migrated_from_user_id: alias,
      migrated_at: new Date().toISOString()
    };
    await store.setJSON(`${userId}/vault-snapshot.json`, migrated);
    return { entry: migrated, migratedFrom: alias };
  }
  return { entry: null, migratedFrom: '' };
}

export default async (request, context) => {
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  let user = null;
  try {
    user = await requireFs27User(request);
  } catch (error) {
    return fs27AuthErrorResponse(error);
  }
  if (process.env.SKYEVAULTPRO_HOSTED_BACKUP_ENABLED !== '1') {
    return json({
      error: 'SkyeVault Pro hosted backup requires the $4.99/mo Sovereign Backup add-on and is disabled by default.'
    }, { status: 402 });
  }
  if (!hasVaultBackupEntitlement(user)) {
    return json({
      error: 'SkyeVault Pro hosted backup requires the Sovereign Backup gate entitlement.',
      code: 'skyevaultpro_backup_entitlement_required'
    }, { status: 402 });
  }
  const store = getStore('vault-backups');
  const userId = primaryIdentityKey(user);
  const aliases = identityKeysForUser(user);
  const key = `${userId}/vault-snapshot.json`;

  if (request.method === 'GET') {
    const found = await findSnapshot(store, userId, aliases, user);
    if (!found.entry) return json({ ok: true, snapshot: null });
    return json({ ok: true, snapshot: found.entry, migratedFrom: found.migratedFrom || undefined });
  }

  if (request.method === 'POST') {
    const snapshot = body?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') return json({ error: 'snapshot payload is required.' }, { status: 400 });
    await store.setJSON(key, {
      savedAt: new Date().toISOString(),
      siteVersion: '1.2.0',
      user_id: userId,
      email: user.email || '',
      snapshot
    });
    return json({ ok: true, savedAt: new Date().toISOString() });
  }

  return json({ error: 'Method not allowed.' }, { status: 405 });
};
