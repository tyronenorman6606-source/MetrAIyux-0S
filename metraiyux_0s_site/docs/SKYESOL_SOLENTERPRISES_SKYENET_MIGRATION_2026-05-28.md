# SkyeSol / SOLEnterprises SkyeNet Migration

Updated: 2026-05-28

## Canonical Public Surfaces

| Company surface | SkyeNet URL | Project | Status |
| --- | --- | --- | --- |
| SkyeRouteX Logistics | `https://skyenet.skyeroutex-logistics/` | `skyeroutex-logistics-public` | Routed; DNS binding pending public HTTP proof |
| SkyeSol / Skyes Over London LC | `https://skyenet.skyesol/` | `skyesol-company-public` | Routed; DNS binding pending public HTTP proof |
| SOLEnterprises umbrella | `https://skyenet.solenterprises/` | `solenterprises-public` | Routed; DNS binding pending public HTTP proof |

SkyeNet platform-native hostnames are the canonical public company lane. The SkyeNet route records and source custody are proven; direct public HTTP still needs DNS/custom-hostname edge binding for the three hostnames before owner browser proof can pass. Previous Netlify links and 0S `/skyenet/...` path mounts are legacy mirrors/staging once the platform-native hostname is edge-bound and proofed.

## SkyeRouteX Deployment

- Staged SkyeNet source: `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public`
- Platform-native public hostname: `https://skyenet.skyeroutex-logistics/`
- Live URL: `https://skyenet.skyeroutex-logistics/`
- Deployment: `dep_20260528223019`
- Receipt: `receipt_e972de4149684940ad5b049c`
- Route key: `route:v1:host:skyenet.skyeroutex-logistics`
- Deployed files: 10
- Operator app entry: `/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`
- Worker version carrying the operator-entry route: `c648a570-db0e-47cd-968c-fb9c524b3389`
- Live HTTP proof: `test-artifacts/company-skynet-host-routes/company-skynet-host-routes-latest.json`
- Operator-entry stress proof: `test-artifacts/skyeroutex-operator-entry-live-http-2026-05-28T14-39-24-995Z.json`

The public homepage now exposes a real Open App path for returning owners and operators. The route is not a new password lane: anonymous requests redirect to the shared 0S login with the SkyeRouteX return attached, and authenticated shared-gate requests redirect into Workforce Command.

## SkyeSol Deployment

- Source import: `Zenith/skyesol-main-extracted/skyesol-main`
- Company dossier: `Zenith/SKYESOL_COMPANY_DOSSIER.md`
- Staged SkyeNet source: `metraiyux_0s_site/skyenet-drops/skyesol-company-public`
- Stage script: `tools/stage-skyesol-skynet.mjs`
- Platform-native public hostname: `https://skyenet.skyesol/`
- Live URL: `https://skyenet.skyesol/`
- Deployment: `dep_20260528223108`
- Receipt: `receipt_918eb4671a3c4958a79b19e3`
- Route key: `route:v1:host:skyenet.skyesol`
- Deployed files: 1163
- Encoded path copies: 289
- Migration receipt: `metraiyux_0s_site/skyenet-drops/skyesol-company-public/skyenet-migration.json`
- MCP inventory receipt: `Zenith/skyesol-main-extracted/skyesol-main/MCP_TOOLING_RECEIPT.json`
- Live HTTP proof: `test-artifacts/company-skynet-host-routes/company-skynet-host-routes-latest.json`

The staging pass copied the public SkyeSol source, rewrote internal paths and SkyeSol Netlify canonicals to the platform-native `/` mount behind `https://skyenet.skyesol/`, created a root `index.html`, generated `robots.txt`, `sitemap.xml`, and `skyenet-migration.json`, and added encoded path copies so URLs containing escaped spaces and symbols resolve publicly once the hostname is bound at the edge.

## SOLEnterprises Status

A standalone `solenterprises.org` website source root was not found in this repo. The repo contains SOLEnterprises references, emails, links, generated support surfaces, and valuation/company materials, but not a complete public website root ready to migrate.

Because the source root was absent, the public umbrella site was intentionally rebuilt from repo-local company records, the SkyeSol dossier, Founder Command records, SkyeRouteX proof, and SkyeNet migration ledgers.

- Staged SkyeNet source: `metraiyux_0s_site/skyenet-drops/solenterprises-public`
- Platform-native public hostname: `https://skyenet.solenterprises/`
- Live URL: `https://skyenet.solenterprises/`
- Deployment: `dep_20260528225625`
- Receipt: `receipt_7e5c57da380f4a9fba3e365f`
- Route key: `route:v1:host:skyenet.solenterprises`
- Deployed files: 13
- Migration receipt: `metraiyux_0s_site/skyenet-drops/solenterprises-public/skyenet-migration.json`
- MCP inventory receipt: `metraiyux_0s_site/skyenet-drops/solenterprises-public/MCP_TOOLING_RECEIPT.json`
- Live HTTP proof: `test-artifacts/company-skynet-host-routes/company-skynet-host-routes-latest.json`

## Verification

- `node --check tools/stage-skyesol-skynet.mjs`
- `node --check tools/skyenet-deploy.mjs`
- `node --check tools/proof-company-public-skynet-crosslinks.mjs`
- `node --check tools/proof-company-skynet-host-routes.mjs`
- `node --check metraiyux_0s_site/cloudflare/worker.js`
- `node --test metraiyux_0s_site/tests/skyeroutex-tour-token.test.mjs`
- `node tools/proof-skyeroutex-operator-entry-live-http.mjs`
- `node tools/proof-company-skynet-host-routes.mjs`
- Host-route proof confirmed SkyeNet route records for `skyenet.skyeroutex-logistics`, `skyenet.skyesol`, and `skyenet.solenterprises` with `url_mode: subdomain`, empty mount paths, public access, expected project IDs, expected deployment IDs, and route keys.
- Source-custody proof confirms anonymous source download is denied, owner-gated source-transfer receipts are recorded, and gated source archive download is available for the company deployments that complete within the proof read window.
- Direct public DNS/edge proof for the platform-native hostnames is tracked separately in `test-artifacts/company-skynet-host-routes/company-skynet-host-routes-latest.json`. From this environment the route records exist, but the public hostnames still require DNS/custom-hostname edge binding before those URLs can be called fully browser-live.
- Gated Founder Command proof confirmed `/skyenet/founder-command/client-credentials/skyeroutex-logistics.json` returns `401` anonymously, then returns `200` with the shared owner gate and contains the final SkyeRouteX, SkyeSol, SOLEnterprises deployment IDs, and the operator-entry route. Receipt: `test-artifacts/founder-command-skyeroutex-platform-host-record-latest.json`.

Browser proof remains owner-handled per repo policy.
