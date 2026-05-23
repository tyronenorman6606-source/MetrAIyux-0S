# Proof Ecology + SkyeDrive Closure Handoff

Date: 2026-05-22 UTC

## What Changed

- Added a generated proof ecology surface to the MetrAIyux 0S marketing site:
  - `marketing/metraiyux-0s/proof-ecology.html`
  - `marketing/metraiyux-0s/proof-ecology/ledger.json`
  - `marketing/metraiyux-0s/proof-ecology/proof-ecology.css`
  - `marketing/metraiyux-0s/proof-ecology/proof-ecology.js`
- Added the generator:
  - `tools/publish-proof-ecology.mjs`
- Added the npm script:
  - `npm run proof:publish-ecology`
- Wired Proof Ecology into:
  - `marketing/metraiyux-0s/index.html`
  - `marketing/metraiyux-0s/proof.html`
  - `marketing/metraiyux-0s/site-search.js`
  - `marketing/metraiyux-0s/README.md`
- Patched `tools/skyevault-repo-push.mjs` with `SKYEVAULT_SKIP_GIT_STATUS=1` support because this repo's `git status` can stall under the current Codespace filesystem load.

## Proof Ecology Generation

Latest generator run:

```json
{
  "scanned": 2905,
  "published": 240,
  "pass": 43,
  "attention": 7,
  "recorded": 190,
  "headedBrowser": 4,
  "liveUrls": 100,
  "categories": ["Free99 / Gate", "Headed Browser", "MCP Tooling"]
}
```

Local browser proof:

- Receipt: `test-artifacts/proof-ecology-packaging/local-browser-receipt.json`
- Result: `ok: true`
- Desktop: HTTP 200, 240 cards, 0 failed requests, 0 console errors, 0 page errors
- Mobile: HTTP 200, 240 cards, 0 failed requests, 0 console errors, 0 page errors

Syntax checks passed:

```bash
node --check tools/publish-proof-ecology.mjs
node --check marketing/metraiyux-0s/proof-ecology/proof-ecology.js
```

## SkyeDrive / SkyeVault Packages

Vault base used for fresh signed download links:

```text
https://skyevault-drop.graylondonskyes.workers.dev
```

Consolidated download-link receipt:

```text
.skyevault-out/proof-ecology-skydrive-download-links-20260522T112107Z.json
```

That JSON contains the actual signed `downloadUrl` values. They are intentionally not duplicated here because they are long, expiring R2 signed URLs.

Print the current direct download links:

```bash
node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('.skyevault-out/proof-ecology-skydrive-download-links-20260522T112107Z.json','utf8')); for (const l of d.links) console.log('\\n'+l.label+'\\nreceipt: '+l.receiptId+'\\nexpires: '+l.expiresAt+'\\n'+l.downloadUrl);"
```

### Regular Full Project Zip

- Label: Regular full project safe zip
- Receipt ID: `cdv_a7d77246e8559aeccb843042`
- Receipt path: `.skyevault-out/skyevault-receipt-cdv_a7d77246e8559aeccb843042.json`
- Download-link receipt: `.skyevault-out/download-link-cdv_a7d77246e8559aeccb843042.json`
- File: `MetrAIyux-0S-repo-safe-20260521T173132Z.zip`
- Size: `1,630,888,267` bytes
- File count: `49,519`
- SHA-256: `498aa816468e51eb1311f32175062f5d1089004f9db613c7ea4098ace993e63f`
- Secret-looking files excluded: `34`
- Fresh link expires: `2026-05-22T12:21:05.479Z`

This is the real regular project recovery zip already in SkyeVault. I stopped rebuilding it because the existing vault receipt is stronger and complete.

### Proof Ecology SkyPack

- Label: Proof Ecology SkyPack
- Receipt ID: `cdv_e39931ef2b3a927ae02f805d`
- Receipt path: `.skyevault-out/skyevault-receipt-cdv_e39931ef2b3a927ae02f805d.json`
- Download-link receipt: `.skyevault-out/download-link-cdv_e39931ef2b3a927ae02f805d.json`
- File: `MetrAIyux-0S-proof-ecology-skyepack-20260522T082705Z.zip`
- Size: `258,176` bytes
- File count: `13`
- SHA-256: `570b5b2e078e84283ba53f9d69cb023a5bf4749be0edc9df5a090ebfca0cf58f`
- Secret-looking files excluded: `0`
- Fresh link expires: `2026-05-22T12:21:06.253Z`

Local build metadata:

```text
/tmp/skydrive-packages/latest-proof-ecology-skyepack-build.json
```

### Marketing Proof Package

- Label: Marketing proof ecology package
- Receipt ID: `cdv_9c0bec9aabc08c5cbf9f5d7a`
- Receipt path: `.skyevault-out/skyevault-receipt-cdv_9c0bec9aabc08c5cbf9f5d7a.json`
- Download-link receipt: `.skyevault-out/download-link-cdv_9c0bec9aabc08c5cbf9f5d7a.json`
- File: `metraiyux-0s-marketing-canonical-rich-founder-package-20260522T091106Z.zip`
- Size: `70,325,258` bytes
- File count: `174`
- SHA-256: `07bbac43a18ca0719db54ff1f2f9b5071f19539da172b8f6cce1e3bc77685a99`
- Secret-looking files excluded: `0`
- Fresh link expires: `2026-05-22T12:21:06.994Z`

## If Download Links Expire

The objects remain in SkyeVault; only the signed URLs expire. Regenerate links through the Worker client vault route using the same receipt IDs:

- Regular full zip: `cdv_a7d77246e8559aeccb843042`
- Proof Ecology SkyPack: `cdv_e39931ef2b3a927ae02f805d`
- Marketing proof package: `cdv_9c0bec9aabc08c5cbf9f5d7a`

Use the portal:

```text
https://skyevault-drop.graylondonskyes.workers.dev/vault.html
```

Or rerun the same `/api/client-vault` link mint flow with `action: "download"` and the shared portal key from local env.

## Disk Closure

The npm cache was the biggest easy disposable space win. It is npm's local tarball/metadata cache for package installs. Clearing it does not delete project source; future installs may be slower and need network.

Action taken:

```bash
npm cache clean --force
```

This helped pull `/workspaces` back from 100% to about 89% used during closure.

## Production Status

I did not certify the proof ecology page as production-ready in a live headed production browser in this closure pass. The completed deliverable here is the SkyeDrive/SkyeVault package and receipt flow, plus local browser proof. If you want the marketing site production push certified later, run the repo live-browser gate after the deployed URL serves `proof-ecology.html`.

Suggested production proof command when the production URL is known live:

```bash
npm run proof:live-browser -- --url https://metraiyux-0s-marketing.pages.dev/proof-ecology.html --expect "The artifact pile is now a public proof surface" --label proof-ecology-production
```

