# Production Readiness Report

Snapshot generated: 2026-05-15 UTC. Current deployed 0S/FS27/SovereignDocs status is tracked in `LIVE_DEPLOYMENT_LEDGER.md` and `LIVE_URL_REGISTRY.md`; this report preserves the readiness blockers from that May 15 build pass.

## Projects

- Node OS: retired external import; not required by the current MetrAIyux 0S runtime.
- Citadel Forge: current FS27 source lives at `metraiyux_0s_site/skyegate/source/SkyeGateFS27`.
- Client Drop Vault: current vault/drop source is maintained through `SkyeVault-Drop/` and the 0S vault tooling.

## Status

### Node OS

Local prep completed. Nix is installed, the flake evaluates, shell/Python checks pass, Aegis/Reliquary smoke passes, and the OpenWebUI unfree package / Docker compatibility / renamed ISO option blockers were fixed.

Snapshot blocker: the full ISO build and boot proof needed more disk than the active workspace had available. Treat required free space as a build-host requirement, not a stable workspace fact.

Needs from operator:

- A build host with enough free disk for the NixOS ISO closure, recommended 30-50 GB free.
- Target hardware profile and GPU expectation if the brain stack should run with acceleration.
- Boot proof after ISO build.
- Post-boot model pull/proof: `s13-install-brain coder`, `s13-ai-status`, `s13-router-chat`, and `ollama list`.
- Production exposure policy for SSH, sudo, Open WebUI, and the Orynth router.

### Citadel Forge

Local stack is stood up. Postgres, Forgejo, control plane, and portal containers are running. Control-plane health is green against DB and Forgejo. Forgejo admin/API token and control-plane admin API key are configured locally. Account provisioning was made idempotent and tested.

Snapshot blocker: public domains, auth, billing prices, runner, and backup policy still depended on external-account setup.

Needs from operator:

- Real domains for `PORTAL_DOMAIN`, `CONTROL_DOMAIN`, and `FORGE_DOMAIN`.
- DNS A records pointed at the production server.
- Real `ACME_EMAIL` for HTTPS certificates.
- Production auth decision: trusted-header auth behind a protected proxy, or OIDC/JWT values for issuer, audience, and JWKS URL.
- Stripe price IDs for starter, studio, and agency plans.
- Stripe webhook pointed to `https://CONTROL_DOMAIN/api/billing/stripe/webhook`.
- Forgejo runner registration token/secret and a successful workflow proof.
- Offsite backup target and restore proof.

### Client Drop Vault

Local app checks and smoke pass. Google service-account auth works. Public/admin config load works. Admin Drive config write works. CSP was patched for Cloudflare Turnstile, and scanner mode is set to `manual_review` until a real scanner endpoint is provided.

Snapshot blocker: the live upload destination proof failed on Google Drive service-account quota.

Needs from operator:

- A Google Shared Drive, or user-owned Drive folders, created by a real Google account/admin.
- Share the config, primary intake, and overflow folders with the service account as Content manager/Editor, or enable domain-wide delegation and provide the delegated user.
- Replace the config/destination folder IDs with those user-owned or Shared Drive IDs.
- Admin notification email and from-domain verification if email receipts/alerts should be live.
- Optional Cloudflare Turnstile site and secret keys for public anti-abuse.
- Optional scanner endpoint if production should use external malware/review automation instead of manual review.

## Verification

- Node OS: `./scripts/smoke.sh` passed.
- Citadel Forge: `npm run check` passed; Docker health endpoint returned OK for DB and Forgejo.
- Client Drop Vault: `npm run check` and `npm run smoke` passed.
- Client Drop Vault live Drive proof: config/admin Drive write passed; destination writes failed because service accounts do not have storage quota outside Shared Drive/delegation.

## MetrAIyux 0S / SkyeGateFS27 Addendum

Updated: 2026-05-15 UTC

### Live URLs

- Full MetrAIyux 0S system: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/`
- Live proof router: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/live-proof-router.html`
- Public spectacle site: `https://metraiyux-0s-public-spectacle.pages.dev/`
- Logo rollout mirror: `https://metraiyux-0s-logo-rollout.pages.dev/`
- SkyeGateFS27 proof surface: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html`
- SkyeGateFS27 gate-map alias: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-map.html`
- Actual SkyeGate control plane linked from proof: `https://skygatefs13-quantumskyes.netlify.app/`

### Deployment State

- Full-system Worker current version: `ce1f50e2-ad2b-449f-8f57-0f61e0c32697`
- FS27 proof Worker current version: `3fc470b2-4b7d-4dfb-a8a5-e5d5e2a7228d`
- `.env` has the live proof router, FS27 proof URLs, FS27 Worker URL, and latest full-system Worker version recorded.
- MetrAIyux 0S reports `16` system brains, `8` live surfaces, and D1/KV/Queue/SkyGate connectivity through `/api/site-operator/status`.
- The live-surface registry lives at `metraiyux_0s_site/brain/live-surface-registry.json`.
- The FS27 living architecture map lives at `metraiyux_0s_site/skyegate/source/SkyeGateFS27/THE_GATE_MAP.md`.

### Verification

- Final production E2E report: `metraiyux_0s_live_e2e_report.json`
- Final result: `71` checks, `0` failures, `0` warnings.
- Browser screenshots: `test-artifacts/live-e2e-metraiyux/`
- Local syntax checks passed for `tools/live-e2e-metraiyux.mjs` and `metraiyux_0s_site/cloudflare/worker.js`.
- Brain JSON and live-surface registry parse successfully; registry declares and contains `8` surfaces.
- MetrAIyux sitemaps contain `479` URLs and include `/sales/live-proof-router.html`.
- FS27 sitemap contains `6` URLs and includes `/gate-proofx.html`.
- Direct live smoke checked the full-system status API, live-surfaces API, proof router, FS27 proof page, gate-map alias, and actual SkyeGate control plane; all returned HTTP `200`.

### Notes

- Direct Netlify update for the original FS27 control-plane site was blocked earlier by a forbidden token, so the public FS27 proof surface is deployed on the Cloudflare Worker lane and links back to the actual Netlify gate.
- The production E2E runner now batches browser sweeps and uses fresh browser lifetimes so it can inspect the large sitemap without headless Chromium exhausting itself.
