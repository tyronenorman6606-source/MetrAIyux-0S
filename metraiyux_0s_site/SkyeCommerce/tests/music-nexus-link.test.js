import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMusicNexusLinkInput,
  upsertMerchantMusicNexusLink
} from '../src/lib/music-nexus.js';

test('normalizes a Music Nexus artist link with a SkyeCommerce storefront URL', () => {
  const payload = normalizeMusicNexusLinkInput(
    { artistId: 'artist_13', skyeId: 'SKYE-00013', nexusEmail: 'ARTIST@EXAMPLE.COM', artistName: 'Signal Artist' },
    { slug: 'signal-store', brandName: 'Signal Store' },
    new URL('https://commerce.test/api/music-nexus-link')
  );
  assert.equal(payload.nexusArtistId, 'artist_13');
  assert.equal(payload.nexusEmail, 'artist@example.com');
  assert.equal(payload.storefrontUrl, 'https://commerce.test/SkyeCommerce/store/?slug=signal-store');
});

test('upserts Music Nexus storefront attachment for a merchant', async () => {
  const state = { links: [] };
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              first: async () => {
                if (/SELECT id FROM merchant_music_nexus_links/.test(sql)) return state.links.find((row) => row.merchant_id === bindings[0]) || null;
                if (/SELECT \* FROM merchant_music_nexus_links/.test(sql)) return state.links.find((row) => row.merchant_id === bindings[0]) || null;
                return null;
              },
              run: async () => {
                if (/INSERT INTO merchant_music_nexus_links/.test(sql)) {
                  const row = {
                    id: bindings[0],
                    merchant_id: bindings[1],
                    nexus_artist_id: bindings[2],
                    nexus_skye_id: bindings[3],
                    nexus_email: bindings[4],
                    artist_name: bindings[5],
                    nexus_store_id: bindings[6],
                    nexus_store_slug: bindings[7],
                    storefront_url: bindings[8],
                    status: bindings[9],
                    meta_json: bindings[10],
                    created_at: 'now',
                    updated_at: 'now'
                  };
                  const index = state.links.findIndex((item) => item.merchant_id === row.merchant_id);
                  if (index >= 0) state.links[index] = { ...state.links[index], ...row };
                  else state.links.push(row);
                }
                return { success: true };
              }
            };
          }
        };
      }
    }
  };
  const link = await upsertMerchantMusicNexusLink(env, 'm1', { slug: 'artist-shop', brandName: 'Artist Shop' }, {
    nexusArtistId: 'artist_1',
    nexusStoreSlug: 'artist-nexus-store',
    artistName: 'Artist One'
  }, new URL('https://commerce.test/api/music-nexus-link'));
  assert.equal(link.merchantId, 'm1');
  assert.equal(link.nexusArtistId, 'artist_1');
  assert.equal(link.nexusStoreSlug, 'artist-nexus-store');
  assert.equal(link.storefrontUrl, 'https://commerce.test/SkyeCommerce/store/?slug=artist-shop');
});
