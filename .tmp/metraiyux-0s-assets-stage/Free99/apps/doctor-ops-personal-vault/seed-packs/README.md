# Seed Packs

Drop workspace JSON files here when preparing data to import into the platform.

The browser app can import a full workspace seed from the command dashboard. Individual app pages can import app-specific JSON arrays, `{ "records": [] }`, or the same full workspace envelope.

Use `node scripts/build-seed-index.mjs` to generate `seed-packs/manifest.json` from every JSON seed in this folder.
