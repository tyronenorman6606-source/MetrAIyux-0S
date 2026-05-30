# SkyeMail Status

- Classification: `platform-foundation`
- Runnable surface: root standalone mail pages, `suite/` shell, deployed sovereign Worker/Netlify-compatible functions, FS27 session exchange, Citadel/SkyeNet send/read inbox lane, sovereign mailbox provisioning endpoints, mailbox/runtime lanes, same-folder mail handoff runtime, and the local `build:suite` dist sync lane.
- Proof commands:
  - `npm run smoke:standalone-proof`
  - `npm run smoke:proof`
  - `npm run smoke:zoho-provider`
  - `npm run proof:live-email -- --provider=zoho`
- What the proof covers: root page presence, suite app mounts, key Netlify Function source lanes, FS27 auth exchange markers, hosted mailbox provisioning source lanes, required backend/provider markers, successful `dist/SkyeMail` regeneration, same-folder `mail-handoff-packets` runtime health/status, and packet archive/list/fetch persistence derived from selected message summaries, plus donor-aligned review/execution/dispatch defaults and bounded workflow timeline reads.
- Live sovereign proof: the 2026-05-24 run sends two real messages through the active Citadel/SkyeNet mail lane and reads them back from the sovereign inbox. The public sanitized receipt is deployed at `https://skyemail-platform.graylondonskyes.workers.dev/proof/live-email-proof.json`.
- What it does not cover: Gmail OAuth, Stalwart/external mailbox-server ownership, inbound webhook delivery from third-party senders, or write-through into downstream live SkyeHands services until those provider lanes are separately exercised.
