import { json } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { neon } from '@neondatabase/serverless';

function getUser(context) {
  return context?.netlify?.user || null;
}

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

export default async (request, context) => {
  const user = getUser(context);
  if (!user) return json({ error: 'Login is required for hosted profile sync.' }, { status: 401 });

  const userId = user.sub || user.email;
  const email = user.email || '';
  const blobStore = getStore('vault-profiles');
  const key = `${userId}/profile.json`;
  const dbUrl = process.env.DATABASE_URL;

  if (request.method === 'GET') {
    if (dbUrl) {
      const sql = neon(dbUrl);
      await ensureTable(sql);
      const rows = await sql`SELECT * FROM skyevault_profiles WHERE user_id = ${userId} LIMIT 1`;
      if (rows[0]) return json({ ok: true, profile: rows[0], backend: 'neon' });
    }
    const profile = await blobStore.get(key, { type: 'json' });
    return json({ ok: true, profile: profile || null, backend: dbUrl ? 'neon-empty' : 'blobs' });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const profile = {
      user_id: userId,
      email,
      full_name: String(body.full_name || user.user_metadata?.full_name || '').trim(),
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
      return json({ ok: true, profile, backend: 'neon' });
    }

    await blobStore.setJSON(key, profile);
    return json({ ok: true, profile, backend: 'blobs' });
  }

  return json({ error: 'Method not allowed.' }, { status: 405 });
};
