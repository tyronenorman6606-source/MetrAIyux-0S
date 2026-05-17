# ConnectLog v4 Irreplaceable Upgrade Ledger

## What changed from v3

ConnectLog v3 was a hardened local contact vault with QR sharing. v4 adds the missing platform mechanics that make it feel like a connection operating system.

## New major capabilities

✅ QR intake scanner: a scanner modal can import ConnectLog exchange links, compact payloads, and vCards. It uses camera scanning when supported and paste mode everywhere.

✅ Seed folder ingestion: curated business/contact datasets can live in `seed-data/`, be listed in `manifest.json`, and merge into the app after redeploy.

✅ Seed manifest generator: `npm run seed:manifest` rebuilds the seed manifest from the files currently in `seed-data/`.

✅ Relationship lanes: contacts now carry a lane so the app can distinguish leads, clients, partners, vendors, investors, community, personal, and other relationships.

✅ Relationship health: each card displays a derived score and label so stale or thin records are visible without manual digging.

✅ Action-first cards: each contact now supports direct contacted/snooze/calendar/archive/open actions from the grid.

✅ ICS reminders: any contact can export a calendar reminder for the next follow-up.

✅ All-contact vCard export: the entire local vault can be handed off to phone/contact tools through one `.vcf` file.

✅ Shareable HTML card: the owner profile can export a standalone branded HTML card containing the ConnectLog QR and vCard download link.

## Still intentionally not included

☐ Built-in auth. This is intentionally excluded because upstream auth will own access control.

☐ Cloud sync. This remains local-first. A future upstream sync adapter can be added without destroying the local vault model.

☐ Scraping engine. This package accepts seed data produced by an outside scraper, but it does not scrape the web itself.

☐ Legal/compliance bypass. Seed data should be public, permissioned, or legitimately sourced.
