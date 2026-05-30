CREATE TABLE IF NOT EXISTS merchant_music_nexus_links (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL UNIQUE,
  nexus_artist_id TEXT NOT NULL DEFAULT '',
  nexus_skye_id TEXT NOT NULL DEFAULT '',
  nexus_email TEXT NOT NULL DEFAULT '',
  artist_name TEXT NOT NULL DEFAULT '',
  nexus_store_id TEXT NOT NULL DEFAULT '',
  nexus_store_slug TEXT NOT NULL DEFAULT '',
  storefront_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'attached',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_music_nexus_artist ON merchant_music_nexus_links (nexus_artist_id);
CREATE INDEX IF NOT EXISTS idx_merchant_music_nexus_status ON merchant_music_nexus_links (status, updated_at DESC);
