# 2026-05-23 Production Sync Artifacts

This folder exists because the repo intentionally ignores proof/deploy output under `test-artifacts/`.

Git standard untracked scan was clean:

```bash
git ls-files --others --exclude-standard
```

The downloadable bundle here collects the relevant ignored artifacts from the valuation/marketing/contractor production push without adding all ignored caches, local env files, `node_modules`, `.wrangler`, or secrets.

## Bundle

```text
download-handoffs/2026-05-23-production-sync-artifacts/ignored-proof-and-deploy-artifacts.tar.gz
```

Size at creation: 89,241,996 bytes.

## Contents

See:

```text
download-handoffs/2026-05-23-production-sync-artifacts/artifact-list.txt
```

High-level contents:

- Cloudflare Pages direct-upload receipts/manifests for the valuation/MusicNexus refresh.
- Cloudflare Pages direct-upload receipts/manifests for the interactive valuation console refresh.
- Contractor onboarding headed browser proof from `test-artifacts/contractor-onboarding-live-browser-20260523085137/`.
- `test-artifacts/contractor-onboarding-live-browser-latest.json`.
- The failed/stopped generic valuation live-browser screenshot folders, preserved for transparency because final manual live verification is owner-handled.

## Extract

```bash
mkdir -p /tmp/metraiyux-prod-artifacts
tar -xzf download-handoffs/2026-05-23-production-sync-artifacts/ignored-proof-and-deploy-artifacts.tar.gz -C /tmp/metraiyux-prod-artifacts
```
