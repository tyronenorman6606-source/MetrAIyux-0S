# Over3arth Product Ledger — v1.5.0

## Upgrade theme

v1.5 adds the Reality Anchors layer: users can bind intended identity to real-world cues, environment design, friction reduction, action, and reward. This keeps the app mythic but behavioral.

## Implemented

- Reality Anchors navigation tab.
- Anchor templates for morning ritual, money action, body reset, and shutdown reflection.
- Custom anchor form with cue, action, environment, friction reducer, reward, and realm.
- Anchor-to-proof quest creation.
- Anchor activation counts and seal/reopen controls.
- Anchor Grid Strength metric.
- Reality Forecast dashboard panel.
- Schema v6 local normalization for anchors.
- Export metadata updated to v1.5.0.
- Service worker cache version updated to v1.5.0.
- Manifest app name/description updated to v1.5.
- Fixed duplicate Restore button in snapshot vault.
- Fixed duplicate Level line in Ascension Card export.

## Still intentionally local-first

No fake cloud sync, fake payments, fake push scheduler, or fake AI backend was added. Backend features should be added only when real auth, storage, billing, and scheduler providers are connected.

## Proof requirements

- `npm install`
- `npm run lint`
- `npm run build`
- Production preview HTTP 200
- Manifest and service worker return v1.5 metadata
