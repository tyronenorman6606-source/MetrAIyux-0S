import { json } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { neon } from '@neondatabase/serverless';
import { fs27AuthErrorResponse, identityKeysForUser, primaryIdentityKey, requireFs27User } from './_lib/fs27-auth.mjs';

async function ensureTable(sql) {
  await sql`CREATE TABLE IF NOT EXISTS skyevault_profiles (
    user_id text PRIMARY KEY,
    email text,
    full_name text,
    plan_tier text,
    shipping_name text,
    shipping_email text,
    shipping_address text,
    shipping_city text,
    shipping_state text,
    shipping_zip text,
    shipping_country text,
    thumb_drive_tier text,
    updated_at timestamptz DEFAULT now()
  )`;
}

function tierDrive(planTier = 'core') {
  const tier = String(planTier || 'core').toLowerCase();
  if (tier === 'pro') return '1TB';
  if (tier === 'flow') return '512GB';
  return '256GB';
}

function normalizeProfile(profile, userId, email, user, migratedFrom = '') {
  const planTier = String(profile?.plan_tier || 'core').trim().toLowerCase();
  return {
    ...(profile || {}),
    user_id: userId,
    email: email || profile?.email || '',
    full_name: String(profile?.full_name || user.name || '').trim(),
    plan_tier: planTier,
    shipping_name: String(profile?.shipping_name || '').trim(),
    shipping_email: String(profile?.shipping_email || email || '').trim(),
    shipping_address: String(profile?.shipping_address || '').trim(),
    shipping_city: String(profile?.shipping_city || '').trim(),
    shipping_state: String(profile?.shipping_state || '').trim(),
    shipping_zip: String(profile?.shipping_zip || '').trim(),
    shipping_country: String(profile?.shipping_country || '').trim(),
    thumb_drive_tier: String(profile?.thumb_drive_tier || tierDrive(planTier)).trim(),
    migrated_from_user_id: migratedFrom || profile?.migrated_from_user_id || '',
    updated_at: profile?.updated_at || new Date().toISOString()
  };
}

async function saveNeonProfile(sql, profile) {
  await sql`INSERT INTO skyevault_profiles (
    user_id, email, full_name, plan_tier, shipping_name, shipping_email, shipping_address,
    shipping_city, shipping_state, shipping_zip, shipping_country, thumb_drive_tier, updated_at
  ) VALUES (
    ${profile.user_id}, ${profile.email}, ${profile.full_name}, ${profile.plan_tier}, ${profile.shipping_name}, ${profile.shipping_email}, ${profile.shipping_address},
    ${profile.shipping_city}, ${profile.shipping_state}, ${profile.shipping_zip}, ${profile.shipping_country}, ${profile.thumb_drive_tier}, ${profile.updated_at}
  ) ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    plan_tier = EXCLUDED.plan_tier,
    shipping_name = EXCLUDED.shipping_name,
    shipping_email = EXCLUDED.shipping_email,
    shipping_address = EXCLUDED.shipping_address,
    shipping_city = EXCLUDED.shipping_city,
    shipping_state = EXCLUDED.shipping_state,
    shipping_zip = EXCLUDED.shipping_zip,
    shipping_country = EXCLUDED.shipping_country,
    thumb_drive_tier = EXCLUDED.thumb_drive_tier,
    updated_at = EXCLUDED.updated_at`;
}

async function findNeonProfile(sql, userId, email, aliases, user) {
  const primaryRows = await sql`SELECT * FROM skyevault_profiles WHERE user_id = ${userId} LIMIT 1`;
  if (primaryRows[0]) return { profile: primaryRows[0], migratedFrom: '' };

  for (const alias of aliases) {
    if (alias === userId) continue;
    const rows = await sql`SELECT * FROM skyevault_profiles WHERE user_id = ${alias} LIMIT 1`;
    if (!rows[0]) continue;
    const profile = normalizeProfile(rows[0], userId, email, user, alias);
    await saveNeonProfile(sql, profile);
    return { profile, migratedFrom: alias };
  }

  if (email) {
    const rows = await sql`SELECT * FROM skyevault_profiles WHERE email = ${email} ORDER BY updated_at DESC LIMIT 1`;
    if (rows[0] && rows[0].user_id !== userId) {
      const profile = normalizeProfile(rows[0], userId, email, user, rows[0].user_id);
      await saveNeonProfile(sql, profile);
      return { profile, migratedFrom: rows[0].user_id };
    }
  }

  return { profile: null, migratedFrom: '' };
}

async function findBlobProfile(blobStore, userId, email, aliases, user) {
  for (const alias of aliases) {
    const key = `${alias}/profile.json`;
    const profile = await blobStore.get(key, { type: 'json' });
    if (!profile) continue;
    if (alias === userId) return { profile, migratedFrom: '' };
    const migrated = normalizeProfile(profile, userId, email, user, alias);
    await blobStore.setJSON(`${userId}/profile.json`, migrated);
    return { profile: migrated, migratedFrom: alias };
  }
  return { profile: null, migratedFrom: '' };
}

export default async (request, context) => {
  let user = null;
  try {
    user = await requireFs27User(request);
  } catch (error) {
    return fs27AuthErrorResponse(error);
  }

  const userId = primaryIdentityKey(user);
  const aliases = identityKeysForUser(user);
  const email = user.email || '';
  const blobStore = getStore('vault-profiles');
  const key = `${userId}/profile.json`;
  const dbUrl = process.env.DATABASE_URL;

  if (request.method === 'GET') {
    let sql = null;
    if (dbUrl) {
      sql = neon(dbUrl);
      await ensureTable(sql);
      const found = await findNeonProfile(sql, userId, email, aliases, user);
      if (found.profile) return json({ ok: true, profile: found.profile, backend: 'neon', migratedFrom: found.migratedFrom || undefined });
    }
    const found = await findBlobProfile(blobStore, userId, email, aliases, user);
    if (found.profile && sql) await saveNeonProfile(sql, found.profile);
    return json({ ok: true, profile: found.profile || null, backend: dbUrl ? 'neon-empty' : 'blobs', migratedFrom: found.migratedFrom || undefined });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const profile = {
      user_id: userId,
      email,
      full_name: String(body.full_name || user.name || '').trim(),
      plan_tier: String(body.plan_tier || 'core').trim().toLowerCase(),
      shipping_name: String(body.shipping_name || '').trim(),
      shipping_email: String(body.shipping_email || email).trim(),
      shipping_address: String(body.shipping_address || '').trim(),
      shipping_city: String(body.shipping_city || '').trim(),
      shipping_state: String(body.shipping_state || '').trim(),
      shipping_zip: String(body.shipping_zip || '').trim(),
      shipping_country: String(body.shipping_country || '').trim(),
      thumb_drive_tier: tierDrive(body.plan_tier || 'core'),
      updated_at: new Date().toISOString()
    };

    if (dbUrl) {
      const sql = neon(dbUrl);
      await ensureTable(sql);
      await saveNeonProfile(sql, profile);
      return json({ ok: true, profile, backend: 'neon' });
    }

    await blobStore.setJSON(key, profile);
    return json({ ok: true, profile, backend: 'blobs' });
  }

  return json({ error: 'Method not allowed.' }, { status: 405 });
};
