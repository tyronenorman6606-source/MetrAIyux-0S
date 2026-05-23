# Business Cards v2 - Production Handoff
**Date:** 2026-05-23  
**Status:** Deployed live, headed-browser proof passed, Git source ready for next dev

---

## Final Production State

Business Cards v2 is live at:

```text
https://metraiyux-0s-marketing.pages.dev/business-cards.html
```

Cloudflare Pages production deployment:

```text
deploymentId: f8e8b6e0-2077-42a9-a757-28f191a52cf3
preview: https://f8e8b6e0.metraiyux-0s-marketing.pages.dev
project: metraiyux-0s-marketing
source: marketing/metraiyux-0s
assetCount: 171
receipt: test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-v2-responsive-receipt.json
manifest: test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-v2-responsive-manifest.json
```

Line `1240` in root `.env` was the token lane that could reach Cloudflare Pages. Do not print or commit the value. The token around line `1236` could read account and Zero Trust resources, but it returned Cloudflare Pages auth errors and was not valid for this deploy lane.

---

## What Shipped

Source:

```text
marketing/metraiyux-0s/business-cards.html
marketing/metraiyux-0s/assets/vendor/qrcode-generator.js
```

Business Cards v2 includes:

- 2 founder cards: Gold founder edition and Cyan tech edition.
- 1 Valley Verified client card with live business/city/category form updates.
- 12 platform cards: MetrAIyux 0S, SkyeMusicNexus, SkyeRouteX, PHX Verified, NorthStar, Free99, LegalSkyes, QuantumSkyes MCP, kAIxu CodeStudio, Agentic Growth Layer, SkyeVaultOS, and Merser.
- Print isolation: each card prints alone on a 3.5in by 2in page.
- Local QR generation from `assets/vendor/qrcode-generator.js`; the old unpkg dependency was removed so production does not fail if the CDN blocks.
- Desktop card previews fit the requested 600px display target, while mobile computes `--screen-scale` at runtime so cards do not overflow the viewport.

---

## Live Browser Proof

Headed production proof passed under Chromium with desktop and mobile viewports:

```text
proof command: node tools/proof-business-cards-v2-production.mjs
receipt: test-artifacts/live-browser-verifier/2026-05-23T01-56-21-087Z-business-cards-v2-production-focused/live-browser-verification-report.json
desktop: 1440x980
mobile: 390x844
failures: []
```

The proof opened the live production URL, verified expected text, checked responsive layout, edited the Valley Verified card fields, clicked four print buttons with `window.print` trapped, inspected QR canvas pixels, checked for broken images, scrolled the full rendered page on both viewports, saved screenshots at each scroll stop, and recorded zero console errors plus zero failed network requests.

---

## Deploy Lane That Worked

Wrangler Pages upload was hanging in this Codespace, so the repo now has a direct Cloudflare Pages asset-upload tool:

```text
tools/cloudflare-pages-direct-upload.mjs
```

The compatibility wrapper now points to that tool:

```text
cf_pages_deploy.py
```

Package scripts:

```bash
npm run pages:direct-upload
npm run proof:business-cards
```

Deploy command shape, with secret values sourced locally and never printed:

```bash
CLOUDFLARE_API_TOKEN="$(sed -n '1240p' .env | sed -E 's/^[^=]+=//' | sed -E 's/^['\"'\"']|['\"'\"']$//g')" \
CLOUDFLARE_ACCOUNT_ID="$(sed -n '1241p' .env | sed -E 's/^[^=]+=//' | sed -E 's/^['\"'\"']|['\"'\"']$//g')" \
PAGES_PROJECT=metraiyux-0s-marketing \
PAGES_DIR=marketing/metraiyux-0s \
PAGES_COMMIT_MESSAGE="Business Cards v2 local QR and responsive proof" \
PAGES_RECEIPT=test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-v2-responsive-receipt.json \
PAGES_MANIFEST=test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-v2-responsive-manifest.json \
node tools/cloudflare-pages-direct-upload.mjs
```

The uploader uses Cloudflare's current Pages upload-token/assets/manifest flow and writes a receipt plus manifest under `test-artifacts/cloudflare-pages/`. It discovers the BLAKE3 helper from the repo environment or Wrangler's npm cache; if the standalone `blake3-wasm` registry dependency is still broken, let the script bootstrap Wrangler's cache instead of hardcoding another deploy token or reverting to the older Python-only uploader.

---

## Validation Commands

Run these before another commit touching this lane:

```bash
node --check tools/cloudflare-pages-direct-upload.mjs
node --check tools/proof-business-cards-v2-production.mjs
python3 -m py_compile cf_pages_deploy.py
npm run proof:business-cards
```

2026-05-23 closure validation already run:

```text
node --check tools/cloudflare-pages-direct-upload.mjs
node --check tools/proof-business-cards-v2-production.mjs
python3 -m py_compile cf_pages_deploy.py
npm run proof:business-cards
npm run brain:sync:obsidian
npm run vault:0s:map
```

Brain/neural-map result after the business-card production pass:

```text
Obsidian brain sync: 13 notes into 224 local-brain chunks
SkyeVault 0S neural bridge: 1 repo, 24 receipts, 62 nodes, 61 links, 1 workspace map
```

---

## Files To Keep Together

```text
cf_pages_deploy.py
package.json
tools/cloudflare-pages-direct-upload.mjs
tools/proof-business-cards-v2-production.mjs
marketing/metraiyux-0s/business-cards.html
marketing/metraiyux-0s/assets/vendor/qrcode-generator.js
marketing/metraiyux-0s/CHANGELOG.md
LIVE_DEPLOYMENT_LEDGER.md
.vscode/Handoffs/2026-05-23-business-cards-v2-handoff.md
.vscode/Handoffs/2026-05-22-ultimate-next-dev-handoff.md
```

Do not commit `.env`, raw Cloudflare tokens, signed vault links, direct restore-kit key material, `.skyesecrets`, or unlock-code files.

---

## Next-Agent Project Operating Notes

For the full repo/deploy/vault playbook, read:

```text
.vscode/Handoffs/2026-05-22-ultimate-next-dev-handoff.md
```

The short version for this surface:

- Business Cards v2 is a Cloudflare Pages surface in `marketing/metraiyux-0s`.
- The live URL is `https://metraiyux-0s-marketing.pages.dev/business-cards.html`.
- Pages deploys should use `tools/cloudflare-pages-direct-upload.mjs` or `cf_pages_deploy.py`; Wrangler Pages upload hung during this pass.
- Root `.env` line `1240` was the Pages-capable token lane and line `1241` was the account ID. Do not print the values.
- After a production push, run `npm run proof:business-cards` and keep the headed proof receipt.
- Then update `marketing/metraiyux-0s/CHANGELOG.md`, `LIVE_DEPLOYMENT_LEDGER.md`, this handoff, and the ultimate handoff.
- Run `npm run brain:sync:obsidian` and `npm run vault:0s:map` after repo-wide closure/preservation passes.
- Push `main`, then move `full-workspace-snapshot-20260523-fastzip-contact-handoff` to the same commit if the owner asks for one repo of truth plus a snapshot branch.

Owner local clone commands:

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone --progress https://github.com/tyronenorman6606-source/MetrAIyux-0S.git
cd MetrAIyux-0S
git switch main
git pull --ff-only
code .
```

SkyeDrive/SkyeVault rule:

```text
Git is the safe source snapshot.
SkyeVault/SkyeDrive is the full "lose nothing" workspace backup.
The full artifact is .zip.enc, and the direct restore kit unlocks it into the real .zip.
Fresh signed links belong in owner chat only, not committed handoff files.
```
