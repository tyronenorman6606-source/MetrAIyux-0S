# Skyes Over London / SkyeSol Company Knowledge Deep Scan Handoff

Date written: 2026-05-22 UTC  
Repo: `/workspaces/MetrAIyux-0S`  
Archive source: `/workspaces/MetrAIyux-0S/Zenith/skyesol-main.zip`  
Extracted source: `/workspaces/MetrAIyux-0S/Zenith/skyesol-main-extracted/skyesol-main`  
Goal: unpack the SkyeSol archive, deep scan the company, add the knowledge into the local company brain, ingest the curated knowledge into the live shared-gated Company Knowledge API, and leave proof/handoff artifacts for the next operator.

## Status

End-to-end knowledge-base work is complete.

The SkyeSol/Skyes Over London archive has been unpacked, scanned, summarized, added to the curated Obsidian brain export, synced into the local browser brain, reflected in the private/public neural map artifacts, ingested into the live Cloudflare Company Knowledge API platform base, and checked in a headed browser on desktop and mobile.

Live API ingestion used the existing shared 0S/FS27/SkyGate/Free99 owner gate session through `/api/owner/admin-login`. No app-specific founder/admin/client password or new auth lane was created.

No production code was deployed in this pass. The production-facing data/state change was the owner-gated Company Knowledge API ingest, and that was verified through live API reads plus headed-browser proof against the deployed admin console.

## What Was Created

Primary longform dossier:

```text
Zenith/SKYESOL_COMPANY_DOSSIER.md
```

Curated Obsidian brain note containing the first dossier:

```text
obsidian-vault/00-command-center/Skyes Over London LC Company Dossier.md
```

Second-pass deep scan source-map and knowledge pack:

```text
obsidian-vault/00-command-center/Skyes Over London Deep Scan Knowledge Pack - 2026-05-21.md
```

Generated local brain export:

```text
metraiyux_0s_site/brain/obsidian-sync.json
```

Generated neural maps:

```text
obsidian-vault/_neural-map/graph-data.js
metraiyux_0s_site/assets/public-neural-map-data.js
```

Live ingest and proof artifacts:

```text
test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T05-19-07-935Z-live-ingest-receipt.json
test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T06-00-44-011Z-combined-live-browser-proof.json
test-artifacts/company-knowledge-skyesol-ingest/screenshots/
tools/proof-skyesol-company-knowledge-live.mjs
```

MCP mining receipt written by the repo MCP workflow:

```text
Zenith/skyesol-main-extracted/skyesol-main/MCP_TOOLING_RECEIPT.json
test-artifacts/direct-mcp/skyesol-main-mcp-tooling-receipt.json
```

Note: the MCP mine wrote a receipt but reported `ok: false` because its internal `design_validate` failed. It also briefly applied design parts to three extracted archive files, which were restored from the original zip because this work was analysis/knowledge ingestion, not a redesign.

## Archive Scan Summary

Extracted archive file count after MCP receipt: `1,575`.

Observed extension mix:

```text
707 html
368 md
255 js
58 mjs
57 png
27 json
22 svg
20 css
14 txt
11 pdf
6 sql
4 xml
4 webmanifest
3 toml
2 zip
```

Deeper HTML/Markdown corpus metrics:

```text
pages: 1,075
approx_words: 2,537,847
href_attributes: 30,765
pages_with_titles: 1,060
pages_with_descriptions: 1,014
pages_with_h1_or_md_h1: 1,039
```

Largest top-level archive areas:

```text
Blogs: 543 files
netlify: 212 files
Case Studies: 176 files
Services: 141 files
SkyeLeticXOfficialWebsite: 89 files
Operating-Systems: 77 files
THE NET WORKS: 33 files
WebPile Pro-Monaco Editor: 28 files
SkyeDocx: 26 files
gateway: 25 files
kAIxu: 18 files
Valuationx: 17 files
Valley Verified: 11 files
```

## Company Knowledge Captured

The brain now knows the archive as a company ecosystem, not a single website.

Major knowledge areas captured:

- Skyes Over London LC / SkyeSol / SOLEnterprises identity and holding-company shape.
- Founder/operator narrative for Gray Skyes, including operations-before-software positioning.
- Dakayla Clark VP operations/compliance narrative.
- Core thesis: businesses need governed operating lanes, not disconnected tools.
- Premium web and brand offers: CineFrame, ContentEngine, BrandForge, Sentinel Web Authority, SkyePWA Forge.
- AI/governance offers: kAIxU 6.7, Gateway13, DataPilot, 0megaGate, kAIxU Powered Platforms.
- Portal/workflow offers: AccessAtlas, SignalFlow, CheckoutForge, ConnectBridge, PulseWire, RetainEngine, InsightForge.
- Trust/security/docs/migration offers: TrustLayer, ShieldStack, VaultOps, MigrateOps, WebPile Pro Enterprise, SovereignVariables.
- Launch and packaged offers: Ultimate Business Launch Stack, Revenue Ops Accelerator, Lane Vault, SkyeFyve, SkyePack 0megaPhase.
- SkyeSuite product layer: SkyeDocx, SkyeFlow, SkyeArchive, SkyeDrive, SkyeCollab, SkyeSlides, SkyeSheets, SkyeLedger, SkyeOps.
- Platform/app inventory from `Platforms-Apps`.
- Market/content engine across Phoenix, Houston, Chicago, Denver, Phoenix AI, Arizona operations, Houston dev/AI, Colorado AI, nightlife/editorial, techwear, and app-engineering content.
- Case-study library, including Phoenix services, logistics, accounting, AI/SaaS, contractor portals, directory systems, strategic cases, 2026 Ultimate 13, and named account pages.
- Valuation and proof-asset pages with explicit boundaries around revenue/traffic/customer proof.
- Backend/runtime architecture under `netlify/functions`.
- Gateway13 security doctrine from `docs/Gateway-Bind.md` and `SolenteAI/Security-Data-Handling/index.html`.
- QA/risk signals from broken-link, nav-audit, placeholder-link, and stub-page reports.

## Verification Already Run

Brain sync:

```bash
npm run brain:sync:obsidian
```

Final sync result:

```text
Synced 13 Obsidian notes into 224 local-brain chunks.
metraiyux_0s_site/brain/obsidian-sync.json
```

Target note verification:

```text
Skyes Over London LC Company Dossier
source: obsidian-vault/00-command-center/Skyes Over London LC Company Dossier.md
chunk_count: 78
actual_chunks: 78

Skyes Over London Deep Scan Knowledge Pack - 2026-05-21
source: obsidian-vault/00-command-center/Skyes Over London Deep Scan Knowledge Pack - 2026-05-21.md
chunk_count: 63
actual_chunks: 63
```

Neural maps regenerated:

```bash
npm run obsidian:graph
npm run obsidian:web-graph
```

Final map results:

```text
obsidian-vault/_neural-map/graph-data.js
node_count: 148
link_count: 213
has_deep_scan: true

metraiyux_0s_site/assets/public-neural-map-data.js
node_count: 279
link_count: 1111
has_deep_scan: true
```

Live Company Knowledge API ingest:

```text
receipt: test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T05-19-07-935Z-live-ingest-receipt.json
ok: true
base: metraiyux-0s
base_url: https://metraiyux-0s-full-system.graylondonskyes.workers.dev
auth_method: owner-admin-login through shared 0S/FS27/SkyGate/Free99 gate
credential_source_key: SKYEVAULT_ONE_AUTH_LAST_PROVEN_SESSION_ID
```

Live item IDs upserted:

```text
skyes-over-london-lc-company-dossier-2026-05-21
skyes-over-london-deep-scan-knowledge-pack-2026-05-21
```

Live API verification performed:

```text
GET  /api/0s/company-knowledge/status
POST /api/0s/company-knowledge/bases
POST /api/0s/company-knowledge/items
GET  /api/0s/company-knowledge/items?knowledgeBaseId=metraiyux-0s&limit=100
POST /api/0s/company-knowledge/context
```

Context query proven live:

```text
kAIxU Gateway13 Lane Vault SkyeFyve SkyeSuite SkyeSol company doctrine
```

Live headed browser proof:

```text
receipt: test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T06-00-44-011Z-combined-live-browser-proof.json
ok: true
url: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/company-knowledge.html
browser: headed Chromium under xvfb
desktop: 1440x1000, 4 interactions, 4 scroll stops, 0 console errors, 0 failed network requests
mobile: 390x844, 4 interactions, 4 scroll stops, 0 console errors, 0 failed network requests
screenshots: test-artifacts/company-knowledge-skyesol-ingest/screenshots/
```

Safety scan on exported notes/brain files:

```bash
rg -n "([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)" -i \
  "obsidian-vault/00-command-center/Skyes Over London Deep Scan Knowledge Pack - 2026-05-21.md" \
  "obsidian-vault/00-command-center/Skyes Over London LC Company Dossier.md" \
  "metraiyux_0s_site/brain/obsidian-sync.json" \
  "obsidian-vault/_neural-map/graph-data.js" \
  "metraiyux_0s_site/assets/public-neural-map-data.js"
```

Result: no hits.

Archive-level stricter scan produced three possible `sk-...` hits, but inspection showed false positives from `skAIxU-layer` filenames/URLs, not credentials.

Live ingest/proof receipts and the reusable proof script were also scanned for common email/API-key/private-key patterns after redacting the owner actor field from the API receipt. Result: no hits.

## Current Git Status For This Work

Expected changed/untracked files:

```text
M  metraiyux_0s_site/assets/public-neural-map-data.js
M  metraiyux_0s_site/brain/obsidian-sync.json
M  obsidian-vault/_neural-map/graph-data.js
?? Zenith/SKYESOL_COMPANY_DOSSIER.md
?? Zenith/skyesol-main-extracted/skyesol-main/MCP_TOOLING_RECEIPT.json
?? obsidian-vault/00-command-center/Skyes Over London Deep Scan Knowledge Pack - 2026-05-21.md
?? obsidian-vault/00-command-center/Skyes Over London LC Company Dossier.md
?? .vscode/Handoffs/2026-05-22-skyesol-company-knowledge-deep-scan-handoff.md
?? tools/proof-skyesol-company-knowledge-live.mjs
```

The extracted archive folder itself is also present under:

```text
Zenith/skyesol-main-extracted/skyesol-main
```

Depending on `.gitignore`, most extracted files may not appear in targeted git status. Do not delete that folder until the user confirms the archive scan artifacts are no longer needed.

The live proof receipts and screenshots exist under `test-artifacts/company-knowledge-skyesol-ingest/`, but that folder may be ignored by git and may not appear in `git status`.

## Live Company Knowledge API Boundary

The repo's 0S company knowledge layer is documented at:

```text
docs/0S_COMPANY_KNOWLEDGE_LAYER.md
```

The API lives behind the main 0S Worker:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/0s/company-knowledge
```

The platform base is:

```text
metraiyux-0s
```

Live ingestion is now complete for the two curated SkyeSol notes. The live API still requires the existing shared 0S gate credentials accepted by the Worker:

```text
Authorization
x-admin-token
x-free99-admin-code
x-free99-gate-session
x-skye-gate-session
gate cookies
owner session issued by /api/owner/admin-login
```

Do not create any app-specific founder/admin/client password to ingest this.

## Live Ingest And Browser Proof Commands

The successful live ingest was performed by a credential-safe Node runner that resolved the shared owner session from local 0S gate material without printing any secret. The durable receipt is:

```text
test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T05-19-07-935Z-live-ingest-receipt.json
```

The reusable headed browser proof script is:

```bash
PROOF_VIEWPORT=desktop xvfb-run -a node tools/proof-skyesol-company-knowledge-live.mjs
PROOF_VIEWPORT=mobile xvfb-run -a node tools/proof-skyesol-company-knowledge-live.mjs
```

The final combined proof receipt is:

```text
test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T06-00-44-011Z-combined-live-browser-proof.json
```

The proof opened:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/company-knowledge.html
```

It clicked Load Bases, selected `metraiyux-0s`, clicked Load Items, searched for the SkyeSol/kAIxU/Gateway13 doctrine query, scrolled desktop and mobile, saved screenshots, and recorded no console or failed-network issues.

Related existing proof scripts:

```text
tools/proof-company-knowledge-production.mjs
tools/stress-company-knowledge-production.mjs
tools/proof-company-knowledge-loop-in-production.mjs
```

## Important Boundaries For Future Agents

It is now accurate to say the live Cloudflare Company Knowledge API has the SkyeSol dossier and deep-scan knowledge pack as of the ingest receipt above.

Do not call the archive a production audit of current live URLs. This work is archive-local.

Do not present internal valuation pages as external market validation. The valuation pages explicitly exclude revenue, traffic, conversion performance, customer multiples, and acquisition premiums.

Do not present named-account case studies as endorsements. The archive includes no-endorsement/confidentiality language.

Do not invent or add auth lanes. The shared FS27/SkyGate/Free99 gate is the only acceptable owner/admin route.

Do not delete the extracted archive or generated MCP receipt until the user confirms.

## Best Next Steps

1. Commit or otherwise preserve the dossier, Obsidian notes, brain export, neural map updates, live ingest receipt, browser proof receipt, and proof script.
2. Keep the extracted archive available until the user confirms no more scan work is needed.
3. If this should become more granular durable company memory, consider splitting the deep scan into separate smaller notes:
   - Canonical company identity.
   - kAIxU/Gateway13 doctrine.
   - Service catalog and prices.
   - Lane Vault and SkyePack packaging.
   - SkyeSuite product inventory.
   - Case-study and proof boundaries.
   - Market/content strategy.
   - Valuation boundaries.
   - QA/risk register.
   - Founder and leadership narrative.

## Final End-To-End Definition Of Done

Definition of done has been met:

- Archive unpacked.
- Archive inventoried.
- First longform dossier written.
- Second deep scan/source-map knowledge pack written.
- Both notes marked `brain: true`.
- Obsidian brain sync regenerated.
- Local brain export contains both notes.
- Neural maps regenerated.
- Secret/key/email pattern scan on exported knowledge artifacts passed.
- Live Company Knowledge API platform base upserted.
- Two SkyeSol knowledge items ingested into live `metraiyux-0s`.
- Live context query verified.
- Headed browser proof completed on desktop and mobile.
- Live API receipts and browser screenshots saved.
