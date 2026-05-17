# SkyeMail Status

- Classification: `platform-foundation`
- Runnable surface: root standalone mail pages, `suite/` shell, deployed Netlify Functions, FS27 session exchange, hosted mailbox provisioning endpoints, provider-backed mailbox/runtime lanes, same-folder mail handoff runtime, and the local `build:suite` dist sync lane.
- Proof commands:
  - `npm run smoke:standalone-proof`
  - `npm run smoke:proof`
- What the proof covers: root page presence, suite app mounts, key Netlify Function source lanes, FS27 auth exchange markers, hosted mailbox provisioning source lanes, required backend/provider markers, successful `dist/SkyeMail` regeneration, same-folder `mail-handoff-packets` runtime health/status, and packet archive/list/fetch persistence derived from selected message summaries, plus donor-aligned review/execution/dispatch defaults and bounded workflow timeline reads.
- What it does not cover: live provider credentials, deployed Functions execution, Gmail OAuth, Stalwart/external mailbox provisioning against a real provider, inbound webhooks, real external mail delivery, or write-through into downstream live SkyeHands services until production env and DNS/webhook setup are complete.
