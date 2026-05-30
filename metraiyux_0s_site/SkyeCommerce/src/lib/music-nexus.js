import { dbFirst, dbRun, uid } from './utils.js';

const STATUSES = new Set(['attached', 'pending_review', 'active', 'paused', 'detached']);

function text(value = '', max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function parseJson(value = '{}') {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function status(value = 'attached') {
  const normalized = text(value, 80).toLowerCase().replace(/[^a-z0-9_/-]+/g, '_');
  return STATUSES.has(normalized) ? normalized : 'attached';
}

export function musicNexusLinkRecord(row = {}) {
  if (!row) return null;
  return {
    id: row.id || '',
    merchantId: row.merchant_id || '',
    nexusArtistId: row.nexus_artist_id || '',
    nexusSkyeId: row.nexus_skye_id || '',
    nexusEmail: row.nexus_email || '',
    artistName: row.artist_name || '',
    nexusStoreId: row.nexus_store_id || '',
    nexusStoreSlug: row.nexus_store_slug || '',
    storefrontUrl: row.storefront_url || '',
    status: row.status || 'attached',
    meta: parseJson(row.meta_json || '{}'),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}

export function normalizeMusicNexusLinkInput(body = {}, merchant = {}, requestUrl = null) {
  const origin = requestUrl ? `${requestUrl.protocol}//${requestUrl.host}` : '';
  const merchantSlug = text(merchant.slug || body.merchantSlug || body.merchant_slug || '', 120);
  const fallbackStorefront = origin && merchantSlug ? `${origin}/SkyeCommerce/store/?slug=${encodeURIComponent(merchantSlug)}` : '';
  return {
    nexusArtistId: text(body.nexusArtistId || body.nexus_artist_id || body.artistId || body.artist_id || '', 120),
    nexusSkyeId: text(body.nexusSkyeId || body.nexus_skye_id || body.skyeId || body.skye_id || '', 120),
    nexusEmail: text(body.nexusEmail || body.nexus_email || body.email || '', 254).toLowerCase(),
    artistName: text(body.artistName || body.artist_name || body.name || merchant.brandName || merchant.brand_name || '', 180),
    nexusStoreId: text(body.nexusStoreId || body.nexus_store_id || body.storeId || body.store_id || '', 120),
    nexusStoreSlug: text(body.nexusStoreSlug || body.nexus_store_slug || body.storeSlug || body.store_slug || '', 120),
    storefrontUrl: text(body.storefrontUrl || body.storefront_url || fallbackStorefront, 1000),
    status: status(body.status || 'attached'),
    meta: body.meta && typeof body.meta === 'object' ? body.meta : {}
  };
}

export async function getMerchantMusicNexusLink(env = {}, merchantId = '') {
  const row = await dbFirst(env, `SELECT * FROM merchant_music_nexus_links WHERE merchant_id = ? LIMIT 1`, [merchantId]);
  return musicNexusLinkRecord(row);
}

export async function upsertMerchantMusicNexusLink(env = {}, merchantId = '', merchant = {}, body = {}, requestUrl = null) {
  const payload = normalizeMusicNexusLinkInput(body, merchant, requestUrl);
  if (!payload.nexusArtistId && !payload.nexusSkyeId && !payload.nexusEmail) {
    const error = new Error('A Nexus artist id, Skye ID, or Nexus email is required.');
    error.status = 400;
    throw error;
  }
  const existing = await dbFirst(env, `SELECT id FROM merchant_music_nexus_links WHERE merchant_id = ? LIMIT 1`, [merchantId]);
  const id = existing?.id || uid('mnx');
  await dbRun(env, `
    INSERT INTO merchant_music_nexus_links (
      id, merchant_id, nexus_artist_id, nexus_skye_id, nexus_email, artist_name,
      nexus_store_id, nexus_store_slug, storefront_url, status, meta_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(merchant_id) DO UPDATE SET
      nexus_artist_id = excluded.nexus_artist_id,
      nexus_skye_id = excluded.nexus_skye_id,
      nexus_email = excluded.nexus_email,
      artist_name = excluded.artist_name,
      nexus_store_id = excluded.nexus_store_id,
      nexus_store_slug = excluded.nexus_store_slug,
      storefront_url = excluded.storefront_url,
      status = excluded.status,
      meta_json = excluded.meta_json,
      updated_at = CURRENT_TIMESTAMP
  `, [id, merchantId, payload.nexusArtistId, payload.nexusSkyeId, payload.nexusEmail, payload.artistName, payload.nexusStoreId, payload.nexusStoreSlug, payload.storefrontUrl, payload.status, JSON.stringify({ ...payload.meta, source: 'skyecommerce_music_nexus_attach' })]);
  return getMerchantMusicNexusLink(env, merchantId);
}
