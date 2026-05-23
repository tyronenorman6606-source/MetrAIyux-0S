# Ultimate Next Dev Handoff And Resume Play

Date written: 2026-05-22 UTC  
Repo: `/workspaces/MetrAIyux-0S`  
Purpose: one combined handoff for the next operator to resume all unfinished work without rereading the whole thread.  
Source of truth: this file was synthesized after reading every file currently in `.vscode/Handoffs/`.

## Read First

London said to make sure the site's neural map and brains are all up to date as well.

That means any resume pass that changes public/0S surfaces, company knowledge, docs, ledgers, pricing, app catalogs, MCP pages, or proof surfaces should also refresh the repo brain/map artifacts before calling the work closed:

```bash
npm run brain:sync:obsidian
npm run obsidian:graph
npm run obsidian:web-graph
```

Then verify the relevant outputs:

```text
metraiyux_0s_site/brain/obsidian-sync.json
obsidian-vault/_neural-map/graph-data.js
metraiyux_0s_site/assets/public-neural-map-data.js
```

If the change touches 0S live routing, offers, legal sync, or surface discovery, also update/check:

```text
LIVE_DEPLOYMENT_LEDGER.md
LIVE_URL_REGISTRY.md
metraiyux_0s_site/brain/live-surface-registry.json
metraiyux_0s_site/brain/sales-offer-registry.json
metraiyux_0s_site/brain/legal-sync.json
metraiyux_0s_site/llms.txt
metraiyux_0s_site/assets/system-map.js
metraiyux_0s_site/ecosystem.html
```

## Non-Negotiable Repo Rules

- Do not create app-specific founder, owner, admin, or client-admin passwords for mounted 0S apps.
- Use the shared FS27/SkyGate/Free99 auth lane owned by the main Worker.
- Mounted app APIs must rely on `requireGateAuth`, `requireOperatorAuth`, and shared owner/admin session helpers.
- Every app, platform, and sub-platform path mounted inside `metraiyux_0s_site` must pass through `enforceZeroOsGate` before `env.ASSETS` or proxied APIs.
- Do not print, commit, screenshot, or paste bearer tokens, provider keys, full demo codes, signed download URLs, unlock codes, or key material.
- For production-facing frontend changes, completion requires headed live-browser proof on deployed production desktop and mobile, with interactions, scroll stops, screenshots, console/network checks, and a receipt.
- Use the repo-local MCP source of truth when the user says MCP/tooling:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/MCP/stdio-server.mjs"]
    }
  }
}
```

- Default MCP workflow for target folders remains:

```bash
npm run mcp:mine -- <target-folder>
# read <target-folder>/MCP_TOOLING_RECEIPT.json
# apply changes using the receipt/tools/resources
npm run mcp:mine -- <target-folder>
```

## Source Handoffs Ingested

All of these files were read before this combined handoff was written:

```text
.vscode/Handoffs/2026-05-22-0s-pricing-intake-live-handoff.md
.vscode/Handoffs/2026-05-22-company-knowledge-loop-in-handoff.md
.vscode/Handoffs/2026-05-22-devs-playbook-marketing-keys-handoff.md
.vscode/Handoffs/2026-05-22-drinique-mcp-comparison-rebuild-handoff.md
.vscode/Handoffs/2026-05-22-free-sauce-mcp-suite-handoff.md
.vscode/Handoffs/2026-05-22-fs27-hosting-platform-runtime-ledger-handoff.md
.vscode/Handoffs/2026-05-22-gray-skyes-portfolio-drinique-mcp-case-study-handoff.md
.vscode/Handoffs/2026-05-22-legal-skyes-ai-operators-changelog-ledger-handoff.md
.vscode/Handoffs/2026-05-22-merser31-source-world-handoff.md
.vscode/Handoffs/2026-05-22-signinpro-free99-demo-code-handoff.md
.vscode/Handoffs/2026-05-22-skyemail-zoho-provider-closure-handoff.md
.vscode/Handoffs/2026-05-22-skyesol-company-knowledge-deep-scan-handoff.md
.vscode/Handoffs/FULL_REPO_VAULT_AND_SECRET_PACK_HANDOFF_20260522.md
.vscode/Handoffs/KEY_GATE_13TH_AGENTIC_GROWTH_HANDOFF_2026-05-22.md
.vscode/Handoffs/proof-ecology-skydrive-closure-2026-05-22.md
```

## Current Worktree Warning

The repo is already extremely dirty with many unrelated modified, deleted, and untracked files. Do not run destructive git commands. Do not reset or checkout broad paths. Treat existing unrelated changes as user/other-agent work.

The previous handoffs repeatedly mention:

- Wrangler/Pages deploys can hang during asset scans in this workspace.
- Xvfb/Chromium proof processes can pile up and cause false failures.
- Disk pressure has happened under `/workspaces`; use `/tmp` for proof output, archive output, and stream tests.
- Do not `source .env`; it has entries that are not safe shell assignments. Use the Node env-loader patterns from the handoffs/scripts.

Useful health checks before resuming heavy proof/deploy work:

```bash
df -h / /tmp /dev/shm
ps -eo pid,ppid,stat,etime,cmd | rg 'wrangler|proof-|chrome-linux64|chromium|Xvfb|xvfb'
```

## Fast Status Board

| Lane | Current truth | Next action |
| --- | --- | --- |
| Company Knowledge core + loop-in | Live, tested, stress/browser proofed. SkyeHands active references removed from targeted surfaces. | Keep brain/neural maps updated after future changes. Rerun MCP mine when workspace is quiet. |
| SkyeSol deep scan/company brain | Complete, live Company Knowledge API ingested, browser proof passed, neural maps updated at that time. | Preserve artifacts; split into smaller notes later if useful. |
| SkyeMusicNexus end-to-end repair | Local source is repaired and locally proofed. `npm run 0s:skyemusicnexus:proof` passed on 2026-05-23, including smoke, SkyPay, browser E2E, video proof, and the new mounted Worker stress test. MCP mine passed before and after repairs with zero failed calls. Git HEAD and `origin/main` are `4a00fee69a8f4107c2712765f12779833bd1e2c3` (`Preserve SkyeMusicNexus workspace state`). Production deploy is blocked by Cloudflare Worker auth: plain Wrangler had no shell token, and `node tools/run-root-wrangler.mjs deploy --config metraiyux_0s_site/wrangler.toml` failed with Cloudflare auth code `10000`. Authenticated production is still stale and does not contain the repaired `Command Field`, `Upload Studio`, `Music Player`, or `SKYE_MUSIC_NEXUS_STATIC_PREVIEW = false` markers. | Do not call production ready. Restore/rotate a Cloudflare token with Workers deploy permission, redeploy the main 0S Worker/assets, then rerun headed live-browser proof. Latest failed production browser receipt: `test-artifacts/live-browser-verifier/2026-05-23T03-17-33-642Z-skyemusicnexus-production-deploy-blocked/live-browser-verification-report.json`. |
| 0S pricing/intake router | Live and headed-browser proofed. | Regenerate MCP receipt later; separate SkyePay pricing pass only if requested. |
| Sign In Pro Free99 demo | Closed end to end, live API and browser proof passed. | Rotate demo code before meetings if needed; do not paste full code. |
| Legal Skyes AI Operators + Legal Center route correction | Shipped, deployed, live-headed proofed. Public Legal Center links now use the LegalSkyes Pages policy hub instead of the broken SOLE legal path. | Keep `solenterprises.org` brand/source links separate from legal-policy links unless the owner explicitly wants that custom domain imported or redirected. |
| Free Sauce MCP suite/dev hub | Built, npm packages published, dev hub deployed, custom headed proof passed. | Add setup pages/status badges if desired. |
| Drinique MCP comparison | Live, proofed, visible site hash-matches local source. | Optional: redeploy updated JSON receipts, then rerun proof. |
| FS27 SkyeNet runtime/deploy API | FS27 Worker live; deploy API smoke proved `/skynet-smoke/`. | Main 0S changelog edit is local until deployed/proofed. |
| Key Gate 13th + Agentic Growth | Backend/API live; desktop proof passes; mobile proof still failing until local pill-wrap fix is deployed. | Deploy local CSS/JS/proof fix and rerun `npm run proof:key-gate-13th`. |
| Merser3.1 | npm published, site deployed, stress/diagnostic proof ok; formal headed proof not green yet. | Rerun stabilized proof harness to get `ok: true`. |
| SkyeVault-Drop/full repo streaming | Worker deployed, dry runs passed; no passing headed proof yet; no small stream/full repo upload yet. | Browser proof first, then small stream proof, then real full repo push. |
| Proof Ecology + SkyeDrive packages | Generated/local browser proof passed; SkyeVault download receipts exist; production proof not done. | Deploy/certify marketing proof ecology if desired. |
| Gray Skyes portfolio Drinique case study | Pages project recreated/deployed; HTTP checks pass; headed proof not passed. | Patch proof script to `waitUntil: "commit"` and rerun. |
| Devs Playbook marketing key | Source closure/deep smoke done; live deploy/proof still required. | Set marketing secret, deploy, headed proof. |
| SkyEmail Zoho | Worker deployed with Zoho selected; token refresh works; Zoho Mail resource calls return `404 Invalid Input`; headed proof not green. | Fix Zoho org/account/token details, rerun smoke/deploy/proof. |

## Priority Resume Play

1. Stabilize the workspace.
   - Check disk.
   - Kill only clearly orphaned Wrangler/proof/browser processes.
   - Avoid broad git operations.

2. Close Key Gate 13th first if the user wants Agentic Growth credential custody production-cleared.
   - The hard part is built.
   - Local mobile fix is already in the listed files.
   - Deploy it, run the proof, and only call it done when `ok: true`.

3. Close the pending live-browser proof lanes.
   - Gray Skyes portfolio.
   - Merser3.1.
   - SkyeVault-Drop public surfaces.
   - Devs Playbook after deploy.
   - SkyEmail after Zoho account/org fix.
   - Proof Ecology after marketing deployment.

4. Refresh brains/maps/ledgers.
   - London specifically said to make sure the site's neural map and brains are up to date.
   - Run brain/graph commands after the next meaningful doc/surface pass.
   - Update live-surface registries and ledgers for any surface that becomes truly live-proofed.

5. Rerun MCP mining where handoffs say it hung or is stale.
   - `metraiyux_0s_site` had MCP mine hangs in multiple passes.
   - Do not treat hung MCP receipt as a reason to undo proven production work.
   - Use receipts to refresh audit trail once the workspace is quieter.

## SkyeMusicNexus 2026-05-23 Repair Pass

Local target:

```text
metraiyux_0s_site/SkyeMusicNexus
```

What was repaired/proved:

- MCP workflow was run before and after the repair:
  - `npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus`
  - Receipt: `metraiyux_0s_site/SkyeMusicNexus/MCP_TOOLING_RECEIPT.json`
  - Artifact: `test-artifacts/direct-mcp/SkyeMusicNexus-mcp-tooling-receipt.json`
- The root SkyeMusicNexus shell now uses the shared gate path instead of static preview bypass:
  - `window.SKYE_MUSIC_NEXUS_STATIC_PREVIEW = false`
  - body markers include `data-platform-hardening="p2-routed"` and `data-platform-id="skye-music-nexus"`
  - primary labels now include `Command Field`, `Upload Studio`, and `Music Player`
- The smoke proof no longer assumes the old top-level `SkyeGateFS27/` path; it can resolve the current mounted source path under `metraiyux_0s_site/skyegate/source/SkyeGateFS27`.
- The SkyePay offer proof now dynamically resolves the current FS27 source path and does not require an app-specific auth lane.
- `metraiyux_0s_site/cloudflare/worker.js` received a defensive music-state merge/tombstone path so repeated music mutations do not overwrite unrelated rows during the controlled Worker stress proof.
- New stress command:
  - `npm run 0s:skyemusicnexus:stress`
  - Script: `metraiyux_0s_site/tests/skyemusicnexus-mounted-worker-stress.mjs`
  - Latest canonical proof: `metraiyux_0s_site/SkyeMusicNexus/proof/skyemusicnexus-mounted-worker-stress-latest.json`

Passing local proof:

```bash
npm run 0s:skyemusicnexus:proof
```

The passing proof suite included:

- app smoke
- SkyPay offer proof
- Playwright browser integration E2E
- exchange video proof
- mounted Worker controlled stress

Stress scope:

- 12 serialized mutation workflows.
- 216 total workflow actions.
- 72 concurrent authenticated read-stress requests.
- Verified unauthenticated hub/write rejection.
- Verified shared FS27/SkyGate token access.
- Verified artist registration, upload, stream, studio save, export queue, release submit, rights update, drop submit, exchange, feed, social queue, analytics, and shared-KV state retention.

Production status:

- Repo code is already at `origin/main` on commit `4a00fee69a8f4107c2712765f12779833bd1e2c3`.
- Direct deploy command failed because this shell had no `CLOUDFLARE_API_TOKEN`.
- Root wrapper deploy command failed because the available Cloudflare token was rejected for the Worker deploy with auth code `10000`:

```bash
node tools/run-root-wrangler.mjs deploy --config metraiyux_0s_site/wrangler.toml
```

- The R2-specific Cloudflare token in `.env` verifies for R2 but returns `403` for Workers, so it cannot deploy the 0S Worker.
- Authenticated production fetch/browser checks prove the deployed SkyeMusicNexus surface is still stale.
- No, SkyeMusicNexus has not passed live headed browser verification after deployment because deployment was blocked and production still lacks the repaired markers.

Latest failed production browser receipt:

```text
test-artifacts/live-browser-verifier/2026-05-23T03-17-33-642Z-skyemusicnexus-production-deploy-blocked/live-browser-verification-report.json
```

Required next move:

```bash
# after restoring a Cloudflare token with Workers deploy permission
node tools/run-root-wrangler.mjs deploy --config metraiyux_0s_site/wrangler.toml
npm run proof:live-browser -- --url https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/index.html --expect "Upload Studio" --expect "Command Field"
```

Use a tailored authenticated headed proof if the generic verifier stops at the shared owner gate; the required outcome is desktop and mobile owner-login, app navigation, full-page scroll, console/network inspection, and a passing receipt.

## 0S Company Knowledge Layer

Production base:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev
```

API prefix:

```text
/api/0s/company-knowledge
```

Core files:

```text
metraiyux_0s_site/cloudflare/company-knowledge.mjs
metraiyux_0s_site/cloudflare/worker.js
metraiyux_0s_site/wrangler.toml
metraiyux_0s_site/admin/company-knowledge.html
metraiyux_0s_site/saas/company-knowledge.html
metraiyux_0s_site/assets/js/company-knowledge-console.js
metraiyux_0s_site/tests/company-knowledge.test.mjs
docs/0S_COMPANY_KNOWLEDGE_LAYER.md
```

Storage binding:

```text
COMPANY_KNOWLEDGE_BUCKET = "metraiyux-0s-company-knowledge"
```

Fallback chain:

```text
COMPANY_KNOWLEDGE_BUCKET -> COMPANY_KNOWLEDGE_R2 -> SKYEVAULT_BUCKET -> VAULT_BUCKET
COMPANY_KNOWLEDGE_KV -> TENANT_BACKBONE_KV -> CONTENT_ENGINE_KV -> SITE_EVENTS_KV
```

Live proof receipts:

```text
test-artifacts/company-knowledge-stress/2026-05-21T17-12-06-486Z/receipt.json
test-artifacts/company-knowledge-production/2026-05-21T17-20-58-081Z/receipt.json
test-artifacts/company-knowledge-loop-in/2026-05-22T06-10-49-441Z/receipt.json
test-artifacts/company-knowledge-loop-in/latest-receipt.json
```

Important:

- Company Knowledge is live and shared-gated.
- Public/login/home/ecosystem loop-in is live.
- SkyeHands was removed from targeted active 0S references, but do not claim every archive mention is gone without a fresh repo-wide scan.
- `npm run mcp:mine -- metraiyux_0s_site` previously hung. Rerun later for audit freshness.
- Do not deploy `.tmp/metraiyux-0s-assets-stage` as-is; it was observed stale in the earlier pass.

Useful checks:

```bash
node --test metraiyux_0s_site/tests/company-knowledge.test.mjs
node --check metraiyux_0s_site/cloudflare/worker.js
node --check metraiyux_0s_site/assets/system-map.js
node tools/proof-company-knowledge-loop-in-production.mjs
```

## SkyeSol / Skyes Over London Deep Scan Brain Work

Archive source:

```text
Zenith/skyesol-main.zip
Zenith/skyesol-main-extracted/skyesol-main
```

Primary artifacts:

```text
Zenith/SKYESOL_COMPANY_DOSSIER.md
obsidian-vault/00-command-center/Skyes Over London LC Company Dossier.md
obsidian-vault/00-command-center/Skyes Over London Deep Scan Knowledge Pack - 2026-05-21.md
metraiyux_0s_site/brain/obsidian-sync.json
obsidian-vault/_neural-map/graph-data.js
metraiyux_0s_site/assets/public-neural-map-data.js
tools/proof-skyesol-company-knowledge-live.mjs
```

Live ingest receipts:

```text
test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T05-19-07-935Z-live-ingest-receipt.json
test-artifacts/company-knowledge-skyesol-ingest/2026-05-22T06-00-44-011Z-combined-live-browser-proof.json
test-artifacts/company-knowledge-skyesol-ingest/screenshots/
```

Live item IDs:

```text
skyes-over-london-lc-company-dossier-2026-05-21
skyes-over-london-deep-scan-knowledge-pack-2026-05-21
```

Status:

- Done end to end.
- Archive unpacked and scanned.
- Obsidian brain synced.
- Neural maps regenerated.
- Live Company Knowledge platform base ingested.
- Headed browser proof passed on desktop and mobile.
- Secret/key pattern scans on exported knowledge artifacts passed.

Do not delete the extracted archive or MCP receipt until London confirms no more scan work is needed.

## 0S Pricing And Intake Router

Live route:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/pricing-offer-router.html
```

Cloudflare may canonicalize to:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/pricing-offer-router
```

Primary files:

```text
metraiyux_0s_site/sales/pricing-offer-router.html
metraiyux_0s_site/data/free99-entitlements.json
metraiyux_0s_site/index.html
metraiyux_0s_site/saas/index.html
metraiyux_0s_site/saas/signup.html
metraiyux_0s_site/Free99/index.html
metraiyux_0s_site/clients/intake.html
metraiyux_0s_site/cloudflare/worker.js
LIVE_URL_REGISTRY.md
LIVE_DEPLOYMENT_LEDGER.md
metraiyux_0s_site/brain/live-surface-registry.json
```

Proof:

```text
test-artifacts/live-browser-verifier/pricing-intake-live-2026-05-21T19-25-29-838Z/live-headed-browser-pricing-intake-receipt.json
```

Status:

- Live and browser-proved.
- Unauthenticated route redirects to shared owner gate.
- Free99 boundary is explicit: no AI/model/provider/custody/external publishing/outbound/payment/identity/route-provider/white-label cost-bearing work without paid entitlement.
- Do not casually change SkyePay catalog/pricing inside this router.
- Standalone HouseOps managed custody remains quote-only until policy/proof exists.

Next:

- Regenerate MCP receipt for `metraiyux_0s_site` when possible.
- Add enforcement against `data/free99-entitlements.json` in individual apps where copy is currently the only boundary.

## Sign In Pro Free99 Demo Code

Production Worker version:

```text
ec3ebc67-07e8-4bfe-b92a-d6b1fecbf4c0
```

Live routes:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/demo?return=/northstar/index.html
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/demo.html?return=/northstar/index.html
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/free99-demo-code.html
```

Current active demo code:

```text
Preview: SIP-...8809
Expires: 2026-05-24T06:42:57.850Z
Full local-only code receipt: test-artifacts/free99-signinpro-closure/production-demo-code-proof.json
JSON key: current_demo_code_local_handoff_only
```

Do not paste the full code. Rotate it from the owner room before a real meeting if needed.

Proof receipts:

```text
test-artifacts/free99-signinpro-closure/production-demo-code-final-proof.json
test-artifacts/free99-signinpro-closure/live-headed-browser-proof.json
test-artifacts/free99-platform-intake/free99-platform-intake-e2e-report.json
```

Status:

- Closed end to end.
- Demo sessions use shared 0S gate cookies.
- Demo sessions are not operator/admin sessions.
- Demo workspace sync is browser-local while signup/workspace events are tracked.

## Legal Skyes AI Operators + 0S Changelog

Live links:

```text
https://skyes-over-london-legal.pages.dev/legal/ai-operators/
https://skyes-over-london-legal.pages.dev/ai-operators
https://skyes-over-london-legal.pages.dev/kaixu
https://skyes-over-london-legal.pages.dev/kai-xu
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/changelog/
```

Deployments:

```text
Legal Skyes Pages deployment: 946d9ac8-4543-4d51-a577-02508e788705
0S Worker deployment: 24b87d27-ec19-4cfb-9879-296f03d8cd2b
0S Worker version: 3e09c679-75a6-46c4-9943-ffc9c00a1144
```

Proof receipts:

```text
test-artifacts/live-browser-verifier/2026-05-22T05-48-23-969Z-legal-skyes-ai-operators/live-browser-verification-report-normalized-pass.json
test-artifacts/live-browser-verifier/2026-05-22T05-48-23-969Z-legal-skyes-ai-operators/favicon-resolution-headed-check.json
test-artifacts/live-browser-verifier/2026-05-22T08-18-34-510Z-0s-changelog-legal-ledger/live-browser-verification-report-normalized-pass.json
test-artifacts/live-browser-verifier/2026-05-22T08-18-34-510Z-0s-changelog-legal-ledger/live-browser-verification-report.json
test-artifacts/live-browser-verifier/2026-05-22T08-18-34-510Z-0s-changelog-legal-ledger/supplemental-assertion-check.json
```

Files:

```text
legalskyes-website/legal/ai-operators/index.html
legalskyes-website/_redirects
legalskyes-website/assets/site.js
legalskyes-website/index.html
legalskyes-website/legal/index.html
legalskyes-website/llms.txt
metraiyux_0s_site/changelog/index.html
metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
LIVE_DEPLOYMENT_LEDGER.md
```

Status:

- Shipped and browser-proofed.
- The canonical proved Legal Skyes URL is the Cloudflare Pages domain.
- `solenterprises.org` still serves a different gateway/wrong surface. Import/change SOL Enterprises separately before claiming that custom-domain route.
- No attorney reviewed the page.

2026-05-23 Legal Center route correction:

```text
Public LegalSkyes policy hub: https://skyes-over-london-legal.pages.dev/legal/
Marketplace policy route: https://skyes-over-london-legal.pages.dev/legal/marketplace-commerce/
Broken route closed out of public Legal Center surfaces: https://solenterprises.org/legal/ returned 404.
```

Deployments:

```text
LegalSkyes Pages deployment: 56a9197d-6113-470e-8411-63d94a9cb730
LegalSkyes preview: https://56a9197d.skyes-over-london-legal.pages.dev
MetrAIyux marketing deployment: 14855f13-5688-4de8-a86d-665c561823ad
MetrAIyux marketing preview: https://14855f13.metraiyux-0s-marketing.pages.dev
Gray portfolio mirror deployment: e09e7995-ebe9-404a-aee2-e03db06ef678
Gray portfolio mirror preview: https://e09e7995.gray-skyes-founder-portfolio.pages.dev
```

Files corrected:

```text
legalskyes-website/** canonical/OG/JSON-LD public URLs
marketing/metraiyux-0s/index.html
marketing/metraiyux-0s/marketplace.html
marketing/metraiyux-0s/ecosystem.html
marketing/metraiyux-0s/business-cards.html
marketing/gray-skyes-canonical-site/marketplace.html
marketing/gray-skyes-canonical-site/ecosystem.html
```

Proof:

```text
proof command: node tools/proof-legal-skyes-policy-routes.mjs
receipt: test-artifacts/live-browser-verifier/2026-05-23T03-04-19-649Z-legal-skyes-policy-routes/live-browser-verification-report.json
desktop: 1440x980
mobile: 390x844
failures: []
```

The proof opened the deployed LegalSkyes hub and marketplace-policy routes, clicked Legal Center and Marketplace Policy links from MetrAIyux and Gray public pages, verified the Business Cards LegalSkyes card display/QR target, scrolled every checked page on desktop and mobile, and confirmed the checked public legal-center surfaces no longer contain `https://solenterprises.org/legal/`.

## Free Sauce MCP Suite / Dev Hub

Production page:

```text
https://metraiyux-0s-marketing.pages.dev/dev-hub.html
```

Cloudflare may canonicalize to:

```text
https://metraiyux-0s-marketing.pages.dev/dev-hub
```

Published packages:

```text
skrucible@1.0.3
quantumskyes-mcp@1.0.1
skye-world-mcp@1.0.0
```

Endpoints:

```text
https://skrucible.pages.dev/mcp
https://skye-design-mcp.pages.dev/mcp
https://skye-design-mcp.pages.dev/use-mcp.html
```

Main files:

```text
marketing/gray-skyes-canonical-site/dev-hub.html
marketing/gray-skyes-canonical-site/index.html
.vscode/MCP3-SKRUCIBLE/npm-pkg/package.json
MCP/npm-pkg/package.json
MCP/npm-pkg/quantumskyes-mcp.js
.vscode/MCP2/npm-pkg/package.json
.vscode/MCP2/npm-pkg/skye-world-mcp.js
```

MCP receipt:

```text
marketing/gray-skyes-canonical-site/MCP_TOOLING_RECEIPT.json
test-artifacts/direct-mcp/gray-skyes-canonical-site-mcp-tooling-receipt.json
```

Browser proof:

```text
test-artifacts/live-browser-verifier/2026-05-22T05-46-03-015Z-dev-hub-custom-headed-pass/live-browser-verification-report.json
```

Status:

- Built, deployed, browser-checked.
- NPM packages are published with working bins.
- Do not republish without version bumps.
- If any MCPs become 0S-mounted surfaces, route through FS27/SkyGate/Free99.

## Drinique MCP Comparison

Production:

```text
https://drinique-mcp-comparison.pages.dev/
https://drinique-mcp-comparison.pages.dev/base/
https://drinique-mcp-comparison.pages.dev/skrucible/
https://drinique-mcp-comparison.pages.dev/merser/
```

Source:

```text
metraiyux_0s_site/valley-verified/mcp-comparison/drinique
```

Important files:

```text
index.html
base/index.html
skrucible/index.html
merser/index.html
shared/drinique-sites.css
shared/drinique-sites.js
_redirects
MCP_VARIANT_RECEIPT.json
MCP_TOOLING_RECEIPT.json
```

Proof:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-headed-browser-report.json
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-source-hash-compare.json
test-artifacts/drinique-mcp-comparison-prod-rebuild/screenshots/
```

Status:

- Public visible site is live, proofed, and hash-matches local source.
- Local receipt JSON files are newer than live JSON receipt files. Optional redeploy only if you want JSON receipts updated on Pages.
- If redeployed, rerun desktop and mobile proof because the deployment preview changes.

Do not overwrite the original generated Valley Verified Drinique profile:

```text
metraiyux_0s_site/valley-verified/business/drinique-phoenix-restaurant-food-service-419ae8c/index.html
```

## FS27 SkyeNet Runtime Ledger And Deploy API

Live Worker:

```text
https://skyegatefs27-citadeldb.graylondonskyes.workers.dev
```

Latest deploy API Worker version:

```text
a6adb8d2-39f5-4fca-8a39-07697decbb3b
```

Core files:

```text
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/runtime-observer.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/worker.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/wrangler.toml
metraiyux_0s_site/skyegate/source/SkyeGateFS27/tests/runtime-observer.test.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/tests/skynet-deploy-api.test.mjs
```

Cloudflare resources:

```text
Analytics Engine dataset: fs27_runtime_requests
Queue: fs27-runtime-events
Dead letter queue: fs27-runtime-events-dlq
R2 request log bucket: fs27-runtime-request-logs
R2 deployment asset bucket: zero-os-deploy-artifacts
KV route namespace: ROUTING_KV = 62d5bbc0c9e946b489dc44507fb8c40b
```

Deploy API routes:

```text
POST /deploy/init
PUT  /deploy/upload
POST /deploy/upload
POST /deploy/complete
POST /deploy/route
```

Live smoke mounted:

```text
project_id: skynet-smoke
deployment_id: dep_20260522112827
mount_path: /skynet-smoke
route key: route:v1:host:skyegatefs27-citadeldb.graylondonskyes.workers.dev:path:/skynet-smoke
```

Status:

- FS27 runtime ledger foundation is live.
- Static SkyeNet deploy lane is live-smoke-proven.
- Request logging must remain nonblocking on the hot path.
- D1 rollup was not enabled because the available token lacked D1 permission.
- Citadel ingest still needs to be stood up/configured.
- Main 0S changelog was edited locally for FS27 SkyeNet Deploy, but not confirmed live after the handoff-only stop.

Resume if needed:

```bash
cd metraiyux_0s_site/skyegate/source/SkyeGateFS27
npm run check:worker
npm run test:runtime-observer
npm run test:skynet-deploy-api
```

If deploying the main 0S changelog edit later, smoke:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/changelog/
Expected text: FS27 can now deploy and serve first-party SkyeNet apps
```

## Key Gate 13th + Agentic Growth

Production:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/key-gate-13th/
```

Latest confirmed live Worker version tested:

```text
bb78cb08-740e-4bc4-a8f0-cb996816623b
```

Current proof receipt:

```text
test-artifacts/key-gate-13th/0s-live-proof/receipt.json
```

Backend/API files:

```text
metraiyux_0s_site/cloudflare/key-gate-13th-adapter.mjs
metraiyux_0s_site/cloudflare/agentic-growth-adapter.mjs
metraiyux_0s_site/cloudflare/worker.js
metraiyux_0s_site/assets/js/metraiyux-api-bases.js
```

Dashboard/proof files needing final local deploy:

```text
metraiyux_0s_site/key-gate-13th/index.html
metraiyux_0s_site/key-gate-13th/style.css
metraiyux_0s_site/key-gate-13th/operator.js
tools/proof-key-gate-13th-0s-production.mjs
```

Local fix already made:

- Mobile `.pill { white-space: normal; }` in CSS.
- Same runtime guard in `operator.js`.
- Proof now clicks created credential row and supports `PROOF_NAV_TIMEOUT_MS`.

Blocker:

```text
Mobile proof failed horizontal overflow: 48px at /key-gate-13th/
Root cause: selected key pill like "semrush - kg13_sec_..." had nowrap behavior.
```

Local tests:

```bash
node --test metraiyux_0s_site/tests/key-gate-13th-adapter.test.mjs
node --test metraiyux_0s_site/tests/agentic-growth-0s-adapter.test.mjs
npm --prefix packages/agentic-growth-layer test
```

Close play:

```bash
node --test metraiyux_0s_site/tests/key-gate-13th-adapter.test.mjs
# deploy metraiyux_0s_site with the final dashboard fix
PROOF_DEPLOYMENT_VERSION=<new-version-id> PROOF_NAV_TIMEOUT_MS=120000 npm run proof:key-gate-13th
```

Definition of done:

```json
{ "ok": true }
```

Do not call the UI production-cleared until mobile proof passes.

## Merser3.1

Live:

```text
https://merser3-1.pages.dev/
https://merser3-1.pages.dev/health
https://merser3-1.pages.dev/mcp
```

NPM:

```text
@skyes0verl0nd0n/merser3-1@3.1.0
```

Important source:

```text
.vscode/MCP5-Merser3.1/src/App.jsx
.vscode/MCP5-Merser3.1/src/styles.css
.vscode/MCP5-Merser3.1/mcp4-core.mjs
.vscode/MCP5-Merser3.1/stdio-server.mjs
.vscode/MCP5-Merser3.1/http-server.mjs
.vscode/MCP5-Merser3.1/remote/worker-source.mjs
.vscode/MCP5-Merser3.1/tools/stress-merser.mjs
.vscode/MCP5-Merser3.1/tools/proof-merser31-production.mjs
```

Stress proof:

```text
test-artifacts/merser31-mcp-stress/2026-05-22T11-25-54-591Z-merser31-mcp-stress-report.json
```

Diagnostic:

```text
test-artifacts/merser31-live-proof/diag.png
test-artifacts/merser31-live-proof/latest-live-headed-browser-report.json
```

Status:

- Published, deployed, health works.
- `POST /mcp` unauthenticated returns shared-gate `401`.
- Runtime diagnostics show hydration, no page errors, no failed requests, and active advanced stack signals.
- Formal headed live-browser receipt is still not clean `ok: true`.

Close play:

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
rm -rf /workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/production-final
timeout 720s xvfb-run -a npm run proof:live -- --url https://merser3-1.pages.dev --output-dir /workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/production-final
```

After proof passes, update 0S changelog/valuation/Skyeway/dev-free-sauce surfaces if requested, redeploy them, and run repo live-browser verifier.

## SkyeVault-Drop / Full Repo SkyDrive

Live Worker:

```text
https://skyevault-drop.graylondonskyes.workers.dev
```

Deploy:

```text
Worker: skyevault-drop
Version ID: 74bdde5c-7a1e-4f46-8128-7933056a3939
```

Public surfaces:

```text
https://skyevault-drop.graylondonskyes.workers.dev/
https://skyevault-drop.graylondonskyes.workers.dev/agent-install
https://skyevault-drop.graylondonskyes.workers.dev/upload
https://skyevault-drop.graylondonskyes.workers.dev/vault
https://skyevault-drop.graylondonskyes.workers.dev/repo
https://skyevault-drop.graylondonskyes.workers.dev/process
```

Core files:

```text
SkyeVault-Drop/cloudflare/worker.mjs
SkyeVault-Drop/public/agent-install.html
SkyeVault-Drop/public/assets/styles.css
SkyeVault-Drop/public/index.html
SkyeVault-Drop/public/upload.html
SkyeVault-Drop/public/vault.html
SkyeVault-Drop/public/repo.html
SkyeVault-Drop/public/process.html
SkyeVault-Drop/netlify/functions/upload-session.js
SkyeVault-Drop/netlify/functions/upload-part-url.js
SkyeVault-Drop/netlify/functions/upload-complete.js
tools/skyevault-full-repo-push.mjs
SkyeVault-Drop/scripts/run-with-root-env.mjs
```

Important endpoint:

```text
/api/upload-part-url
```

Status:

- Cloudflare/R2 full-repo streaming lane built and deployed.
- Dry run passed.
- Worker deployed.
- No passing headed live-browser proof receipt yet.
- Small streaming upload proof not done.
- Real full repo upload not done.
- Admin recovery/download proof not done.

Required order:

1. Headed browser proof.
2. Small `/tmp/skyevault-stream-proof` upload.
3. Real 100 GB-capable owner/admin full repo push.
4. Save `FULL_REPO_SKYDRIVE_HANDOFF.json` and `.skyesecrets` paths into a new handoff.

Suggested proof:

```bash
cd /workspaces/MetrAIyux-0S
xvfb-run -a npm run proof:live-browser -- \
  --url https://skyevault-drop.graylondonskyes.workers.dev/ \
  --url https://skyevault-drop.graylondonskyes.workers.dev/agent-install \
  --url https://skyevault-drop.graylondonskyes.workers.dev/upload \
  --url https://skyevault-drop.graylondonskyes.workers.dev/vault \
  --url https://skyevault-drop.graylondonskyes.workers.dev/repo \
  --url https://skyevault-drop.graylondonskyes.workers.dev/process \
  --expect "SkyeVault-Drop" \
  --expect "AI Install" \
  --label skyevault-drop-public-surfaces
```

Small stream proof:

```bash
cd /workspaces/MetrAIyux-0S
rm -rf /tmp/skyevault-stream-proof
mkdir -p /tmp/skyevault-stream-proof/source
printf 'proof\n' > /tmp/skyevault-stream-proof/source/proof.txt
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev \
npm run vault:repo:full -- \
  --repo=/tmp/skyevault-stream-proof/source \
  --repo-name=stream-proof \
  --max-gb=1 \
  --out-dir=/tmp/skyevault-stream-proof/run
```

Real owner/admin full repo push:

```bash
cd /workspaces/MetrAIyux-0S
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev \
npm run vault:repo:full -- --max-gb=100 --out-dir=/tmp/skyevault-full-repo-live
```

Never paste `UNLOCK_CODES.txt`, artifact key material, `.skyesecrets` contents, signed links, or provider credentials.

## Proof Ecology + SkyeDrive

Generated marketing surface:

```text
marketing/metraiyux-0s/proof-ecology.html
marketing/metraiyux-0s/proof-ecology/ledger.json
marketing/metraiyux-0s/proof-ecology/proof-ecology.css
marketing/metraiyux-0s/proof-ecology/proof-ecology.js
tools/publish-proof-ecology.mjs
```

Local proof:

```text
test-artifacts/proof-ecology-packaging/local-browser-receipt.json
```

Latest generator summary:

```json
{
  "scanned": 2905,
  "published": 240,
  "pass": 43,
  "attention": 7,
  "recorded": 190,
  "headedBrowser": 4,
  "liveUrls": 100
}
```

SkyeVault download-link receipt:

```text
.skyevault-out/proof-ecology-skydrive-download-links-20260522T112107Z.json
```

Package receipt IDs:

```text
Regular full project safe zip: cdv_a7d77246e8559aeccb843042
Proof Ecology SkyPack: cdv_e39931ef2b3a927ae02f805d
Marketing proof ecology package: cdv_9c0bec9aabc08c5cbf9f5d7a
```

Signed download URLs are expiring and intentionally not reproduced here. Regenerate by receipt ID through the SkyeVault portal or `/api/client-vault` using local shared portal auth.

Status:

- Local page generation and local browser proof passed.
- SkyeVault package/receipt flow completed.
- Marketing production live-headed proof was not done.

Production proof when deployed:

```bash
npm run proof:live-browser -- --url https://metraiyux-0s-marketing.pages.dev/proof-ecology.html --expect "The artifact pile is now a public proof surface" --label proof-ecology-production
```

## Gray Skyes Portfolio Drinique Case Study

Portfolio:

```text
https://gray-skyes-founder-portfolio.pages.dev/
https://gray-skyes-founder-portfolio.pages.dev/skyeknowlogy/
https://gray-skyes-founder-portfolio.pages.dev/skyeknowology/
```

Latest deployment:

```text
Project: gray-skyes-founder-portfolio
Deployment ID: 85623c18-1dfa-4d55-83c5-89eb13ca6e18
Preview URL: https://85623c18.gray-skyes-founder-portfolio.pages.dev
```

Files:

```text
marketing/gray-skyes-canonical-site/skyeknowology.html
marketing/gray-skyes-canonical-site/portfolio.html
marketing/gray-skyes-canonical-site/canonical.css
test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-deploy.mjs
test-artifacts/gray-skyes-portfolio-drinique-update/live-browser-proof.mjs
```

Receipts:

```text
test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-deploy-receipt.json
test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-manifest.json
test-artifacts/gray-skyes-portfolio-drinique-update/live-proof/live-browser-report.json
```

Status:

- Pages project recreated and deployed.
- HTTP checks pass and production HTML contains Drinique section.
- Required headed live-browser proof has not passed.
- Proof failures were timeout/lifecycle related after one visible text fix.

Patch proof script:

- In `test-artifacts/gray-skyes-portfolio-drinique-update/live-browser-proof.mjs`, change route `page.goto(...)` calls from `waitUntil: "domcontentloaded"` to `waitUntil: "commit"`.
- Keep visible-text assertions and screenshots as actual render proof.

Run:

```bash
XDG_CONFIG_HOME=/tmp/gray-skyes-portfolio-xdg \
PLAYWRIGHT_BROWSERS_PATH=/home/codespace/.cache/ms-playwright \
timeout 240s xvfb-run -a \
node test-artifacts/gray-skyes-portfolio-drinique-update/live-browser-proof.mjs
```

After pass:

- Update `LIVE_DEPLOYMENT_LEDGER.md` with deployment `85623c18-1dfa-4d55-83c5-89eb13ca6e18` and proof receipt.
- Do not deploy this portfolio over `metraiyux-0s-marketing`.

## Devs Playbook Marketing Key

Surface:

```text
/devs-playbook/login.html?key=skdevpbk
/devs-playbook/
```

Marketing key:

```text
skdevpbk
```

Files:

```text
metraiyux_0s_site/cloudflare/worker.js
metraiyux_0s_site/cloudflare/marketing-keys.schema.sql
metraiyux_0s_site/devs-playbook/login.html
metraiyux_0s_site/devs-playbook/index.html
metraiyux_0s_site/tests/marketing-keys-dev-playbook-flow.mjs
metraiyux_0s_site/changelog/index.html
metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
```

Marketing endpoints:

```text
POST /api/marketing-keys/signup
GET  /api/marketing-keys/me
POST /api/marketing-keys/logout
GET  /api/marketing-keys/signups
GET  /api/marketing-keys/summary
```

Boundary:

- Email marketing session cookie is `marketing_key_session`.
- It does not unlock `/northstar/`, `/admin/`, owner APIs, Free99 apps, or other 0S surfaces.
- Owner/admin remains shared FS27/SkyGate/Free99.

Status:

- Source closure complete.
- Deep smoke only.
- Live deploy and headed browser proof still required.

Before production closure, set:

```bash
cd /workspaces/MetrAIyux-0S/metraiyux_0s_site
npx wrangler secret put MARKETING_KEY_SESSION_SECRET --name metraiyux-0s-full-system
```

Smoke:

```bash
node --check metraiyux_0s_site/cloudflare/worker.js
node --check metraiyux_0s_site/tests/marketing-keys-dev-playbook-flow.mjs
node metraiyux_0s_site/tests/marketing-keys-dev-playbook-flow.mjs
```

After deploy proof:

```bash
npm run proof:live-browser -- --url "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/devs-playbook/login.html?key=skdevpbk" --expect "Devs Playbook access"
```

Verify:

- Desktop and mobile login render.
- Email signup writes `marketing_keys` with `skdevpbk`.
- `/devs-playbook/` opens with marketing session.
- Same cookie does not open `/northstar/` or `/admin/`.
- Owner analytics returns signup.
- Changelog still says live proof was required until proof actually passes.

## SkyEmail Zoho Provider

Live Worker:

```text
https://skyemail-platform.graylondonskyes.workers.dev/
```

Status URL:

```text
https://skyemail-platform.graylondonskyes.workers.dev/.netlify/functions/mailbox-domains
```

Worker version:

```text
a8fdb047-e9dc-4e05-a144-c2c86b58d5a6
```

Current live provider status:

```text
provider: "zoho"
zohoApiReady: true
zohoReady: false
zohoOrgReady: false
```

Meaning:

- Zoho OAuth triple is present.
- Access token refresh works.
- Zoho Mail resource calls return `404 Invalid Input`.
- It is not ready to create/read/send Zoho Mail accounts yet.

Receipts:

```text
test-artifacts/skyemail-zoho-provider-smoke/zoho-provider-smoke.json
test-artifacts/live-browser-verifier/2026-05-22T09-11-16-556Z-skyemail-zoho-closure-headed/live-headed-browser-report.json
metraiyux_0s_site/live/SkyeMail/CHANGELOG.md
LIVE_DEPLOYMENT_LEDGER.md
```

Next fix:

1. In Zoho, confirm/regenerate a refresh token for the exact Zoho Mail org/admin account and datacenter.
2. Add:

```bash
ZOHO_ORG_ID=
ZOHO_ACCOUNT_ID=
ZOHO_DEFAULT_FROM=
```

3. Rerun:

```bash
cd /workspaces/MetrAIyux-0S/metraiyux_0s_site/live/SkyeMail
npm run smoke:zoho-provider
npm run cloudflare:secrets:check
npm run cloudflare:secrets:push
npm run cloudflare:deploy
```

Target:

```text
provider: zoho
zohoApiReady: true
zohoOrgReady: true
zohoReady: true
provider_configured.configured: true
```

The main 0S mount for `/live/SkyeMail/` already redirects unauthenticated users to the shared `/admin/login.html?return=...` gate, but do not claim full 0S folder redeploy from this pass.

## SkyeVault Git Remote / Forgejo Clarification

Current Git remote:

```text
https://github.com/tyronenorman6606-source/MetrAIyux-0S
```

Repo already contains a SkyeVault Git remote lane:

```text
docs/SKYEVAULT_GIT_REMOTE_SERVICE.md
docs/SKYEVAULT_REPO_WORKSPACE_UPGRADE.md
SKYEVAULT_REPO_PUSH.md
tools/skyevault-git-remote-server.mjs
tools/skyevault-repo-workspace.mjs
deploy/skyevault-git-remote/
```

Scripts:

```text
vault:git:remote
vault:git:remote:proof
vault:repo
vault:git:push
vault:git:dry-run
vault:repo:full
```

Clean answer:

```text
Yes, the repo already has the pieces for a self-owned IDE-integrated repo/vault lane.
Use SkyeVault Git Remote for immediate Git push/fetch/clone behavior.
Treat Citadel Forge/Forgejo as the heavier product/server lane that still needs production domain, DNS, auth policy, runner, Stripe, and backup/restore decisions.
```

Do not create a new Forgejo/SkyeVault owner password. Gate it through shared FS27/SkyGate/Free99.

## Auth, Secrets, And Codes

Known sensitive artifacts that may exist locally:

```text
test-artifacts/free99-signinpro-closure/production-demo-code-proof.json
.skyevault-out/proof-ecology-skydrive-download-links-20260522T112107Z.json
/tmp/skyevault-*/UNLOCK_CODES.txt
/tmp/skyevault-*/*-artifact-key-material.txt
*.skyesecrets
.env
.dev.vars
```

Rules:

- Read only when required.
- Do not print contents in chat or commit.
- Do not copy full secrets into handoffs.
- Reference paths, receipt IDs, previews, and expiration metadata only.
- Rotate demo codes/secrets before business-facing use if there is any doubt.

## Exact Final Checks For Any Future Production-Facing Change

For a 0S Worker surface:

```bash
node --check metraiyux_0s_site/cloudflare/worker.js
npm run mcp:mine -- metraiyux_0s_site
npm run brain:sync:obsidian
npm run obsidian:graph
npm run obsidian:web-graph
npm run proof:live-browser -- --url <production-url> --expect "<visible text>"
```

For a standalone Pages site:

```bash
npm run mcp:mine -- <target-folder>
# deploy using Wrangler if healthy or direct Pages upload if Wrangler hangs
npm run proof:live-browser -- --url <production-url> --expect "<visible text>"
```

For a pure backend/API lane:

```bash
node --test <targeted-tests>
node --check <changed-js-or-mjs-files>
# run live API proof script if one exists
# still run headed browser proof for any associated public/admin UI
```

## What Not To Say Yet

Do not say these are fully production-cleared until the named receipts pass:

- Key Gate 13th UI: mobile proof still pending final local fix deploy.
- Merser3.1: formal live headed browser proof still pending.
- SkyeVault-Drop: headed proof, small stream proof, and full repo upload still pending.
- Gray Skyes founder portfolio Drinique case study: headed proof pending.
- Devs Playbook: live deploy and proof pending.
- SkyEmail Zoho: Zoho resource/org readiness and clean proof pending.
- Proof Ecology marketing page: production deploy/proof pending.

Do say these are live/proofed, with receipt paths:

- 0S Company Knowledge layer and loop-in.
- SkyeSol deep scan live Company Knowledge ingestion.
- 0S pricing/intake router.
- Sign In Pro Free99 demo lane.
- Legal Skyes AI Operators plus 0S changelog.
- Free Sauce MCP dev hub.
- Drinique MCP comparison visible site.
- FS27 SkyeNet deploy API smoke, with the caveat that full headed proof was owner-overridden for that pass and the main 0S changelog edit remains local until deployed.

## Best Immediate Next Commit Group

If the next dev is asked to preserve current work, group related artifacts instead of one monster commit if possible:

1. Company Knowledge + SkyeSol brain/neural map artifacts.
2. Legal Skyes + 0S changelog + ledger artifacts.
3. Key Gate 13th + Agentic Growth once mobile proof passes.
4. FS27 SkyeNet runtime/deploy API.
5. Free99 Sign In Pro demo lane.
6. MCP/free-sauce/dev-hub and Drinique comparison surfaces.
7. SkyeVault/Proof Ecology only after proof/upload closure is done.

Do not commit unrelated deleted/generated folders accidentally. Inspect `git status --short` carefully because the worktree contains many unrelated changes.

## 2026-05-23 Addendum - Fast ZIP Vault Lane, Contact Accuracy, And Git Snapshot Directive

Owner directive from London:

- The full-workspace backup lane must be much faster and must produce ZIP artifacts, not tar-only artifacts.
- The site neural map and brains must stay up to date whenever these repo-wide preservation/deploy passes run.
- Company/contact information must be treated as a source-of-truth problem, not guessed from old pages or copied generated templates.
- Preserve the entire workspace for the next Codespace without losing untracked work. Use the encrypted vault for the full "lose nothing" workspace, and use git for the safe branch snapshot.

Fast full-repo ZIP lane now lives at:

```bash
tools/skyevault-full-repo-push.mjs
```

The owner backup lane now defaults to ZIP. Use this form for the next full vault push:

```bash
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev \
node tools/skyevault-full-repo-push.mjs \
  --repo=/workspaces/MetrAIyux-0S \
  --repo-name=MetrAIyux-0S \
  --archive-format=zip \
  --zip-level=0 \
  --zip-upload-concurrency=8 \
  --max-gb=100
```

What changed:

- `zip` is now a first-class archive format and the default archive format.
- ZIP level defaults to `0` for speed so the lane spends less time compressing and more time moving bytes.
- ZIP mode creates a staged `.zip`, encrypts it to `.zip.enc`, uploads the encrypted file with concurrent multipart R2 PUTs, then removes temporary plaintext/encrypted stages unless `--keep-zip-stage` is passed.
- `--zip-upload-concurrency` defaults to `8` and can go up to `32`.
- The old streamed `tar.zst.enc` lane still exists for explicit `--archive-format=tar.zst`, but owner downloads should use ZIP unless there is a specific reason not to.

Fast ZIP proof:

```text
node --check tools/skyevault-full-repo-push.mjs
node --check tools/audit-contact-info.mjs
```

Tiny live vault integration smoke succeeded against SkyeVault Drop:

```text
receiptId: cdv_1fc9684ea72a73ceea342ea6
mode: staged encrypted ZIP plus concurrent multipart upload
artifactBytes: 512
```

Most recent full encrypted ZIP vault push from this pass:

```text
artifact: MetrAIyux-0S-full-repo-20260522T234329Z.zip.enc
artifactReceipt: cdv_33333e3e2d5e70c86618ec0d
artifactBytes: 7342939696
artifactSha256: 3208f4b9126cbfd3cd57fc998489fe87c0a71efb59aee716ba5ea98dcc8e13f7
controlPack: MetrAIyux-0S-skydrive-control-20260522T234329Z.skyesecrets
controlReceipt: cdv_76a9f5ae2935ee50dee8bf6c
linkReceipt: .skyevault-out/full-repo-zip-skydrive-3hour-download-links-latest.json
rangeProof: .skyevault-out/full-repo-zip-skydrive-3hour-download-links-range-get-proof.json
restoreBundle: .skyevault-out/full-repo-zip-20260522T234329Z/
rawLinkExpiry: 2026-05-23T03:06:33.711Z
```

Do not print or commit unlock codes, raw signed URLs, bearer tokens, provider keys, `.env`, `.skyesecrets`, or SkyeSecure control material. The encrypted vault artifact is the complete workspace preservation lane, including ignored/untracked material. Git should carry the safe source snapshot and handoff receipts that do not expose secrets.

Contact inventory and accuracy directive:

```text
full inventory markdown: .vscode/Handoffs/contact-info-inventory-latest.md
full inventory json: .vscode/Handoffs/contact-info-inventory-latest.json
generatedAt: 2026-05-23T00:20:56.627Z
counts: 286 emails, 8111 phone numbers, 132 mailto/tel links, 359 street-address candidates
flags: 169 placeholder/local/test contact warnings
company-owned email candidates: 52
```

Every public company-owned contact below must be reconciled against the owner-approved current source of truth before shipping public pages, email templates, ads, invoices, onboarding flows, or legal copy. Placeholder/local/test contacts such as `example.com`, `.local`, and `internal.invalid` are not customer-facing support contacts. Valley Verified and client profile phone numbers are lead/profile data, not automatically Skyes/Metraiyux company contact data.

Company-owned email candidates found by the repo scan:

```text
admin@skyesoverlondon.com
approvals@skyesoverlondon.com
approvals@solenterprises.org
B2B@SOLEnterprises.org
contact-skyemail-e2e-mp8y271m@solenterprises.org
contact-skyemail-e2e-mp8yn4yk@solenterprises.org
contact@metraiyux.com
Contact@solenterprises.org
dev@skyesoverlondon.dev
e2e-test@metraiyux-test.com
graylondonskyes@gmail.com
GrayLondonSkyes@solenterprises.org
graylondonskyes+northstar-arizona-biltmore-dentistry@gmail.com
graylondonskyes+northstar-as-you-wish-pottery-westgate@gmail.com
graylondonskyes+northstar-burch-and-cracchiolo-pa@gmail.com
graylondonskyes+northstar-chicken-n-pickle-westgate@gmail.com
graylondonskyes+northstar-dave-and-busters-westgate@gmail.com
graylondonskyes+northstar-dental-depot-orthodontics@gmail.com
graylondonskyes+northstar-escape-westgate@gmail.com
graylondonskyes+northstar-fennemore-phoenix@gmail.com
graylondonskyes+northstar-gallagher-and-kennedy-pa@gmail.com
graylondonskyes+northstar-general-dentistry-4-kids@gmail.com
graylondonskyes+northstar-goodyear-ballpark@gmail.com
graylondonskyes+northstar-greenberg-traurig-phoenix@gmail.com
graylondonskyes+northstar-kutak-rock-scottsdale@gmail.com
graylondonskyes+northstar-milligan-lawless-pc@gmail.com
graylondonskyes+northstar-platz-juris-pllc@gmail.com
graylondonskyes+northstar-popstroke-westgate@gmail.com
graylondonskyes+northstar-state-farm-stadium@gmail.com
graylondonskyes+northstar-stir-crazy-comedy-club@gmail.com
graylondonskyes+northstar-the-wigwam-resort@gmail.com
graylondonskyes+northstar-theaterworks-peoria@gmail.com
graylondonskyes+northstar-westgate-entertainment-district@gmail.com
grayskyes@solenterprises.org
hello@skyesoverlondon.com
legal@skyesoverlondon.com
noreply@metraiyux.com
noreply@solenterprises.org
onboarding@solenterprises.org
operator@metraiyux.com
ops@skyesoverlondon.com
owner@metraiyux.com
pending@solenterprises.org
proof-a-buyer-demo-1778941796@solenterprises.org
proof-b-buyer-demo-1778941796@solenterprises.org
skyemail-e2e-mp8y271m@solenterprises.org
skyemail-e2e-mp8yn4yk@solenterprises.org
skyemail-mp8wcu2v-3smmb1@solenterprises.org
skyesoverlondon@gmail.com
SkyesOverLondonLC@solenterprises.org
skymail-mp8u6m34-8i31hz@solenterprises.org
tyronenorman@solenterprises.org
```

High-repeat company phone candidate from the repo scan:

```text
(480) 469-5416
```

Treat all other phone numbers in the inventory as mixed client/profile/test data until verified. The full phone/address/link list is intentionally kept in the generated inventory files so the next dev can audit by source path instead of copying stale public copy by hand.

Git snapshot directive:

- Push a safe branch snapshot when `main` is risky or messy.
- Use normal `git add -A` so tracked changes, deletions, and untracked non-ignored workspace files are captured.
- Do not force-add ignored vault payloads, `.env`, `.dev.vars`, key files, logs, local browser artifacts, archives, or SkyeSecure secret packs.
- Before commit, check staged files for GitHub-size blockers and obvious credential material.
- If push fails because the default branch trips, push the snapshot branch and preserve the branch URL in the chat/handoff.

## 2026-05-23 Correction - ZIP Artifact Means Encrypted ZIP Wrapper Until Decrypted

Important owner restore clarification:

- The large downloaded file named `MetrAIyux-0S-full-repo-20260522T234329Z.zip.enc` is not directly unzip-able.
- It is an OpenSSL encrypted container whose decrypted output is the real repo ZIP: `MetrAIyux-0S-full-repo-20260522T234329Z.zip`.
- The first byte/range proof for the large artifact showed OpenSSL encrypted payload (`firstByteHex: 53`), not a ZIP header.
- The direct restore kit proof showed a real ZIP header (`firstByteHex: 50`).

Fresh direct restore kit minted during this correction:

```text
restore kit file: MetrAIyux-0S-full-repo-direct-restore-kit-20260523T004619Z.zip
restore kit receipt: cdv_af91f24a2bce34764821a222
restore kit bytes: 1336
restore kit sha256: bfc5ea06d96e9626d7527fe8b90291e0d7d5bf24b451409c988c0fd8b3bf3f19
link receipt: .skyevault-out/full-repo-zip-direct-restore-links-latest.json
range proof: .skyevault-out/full-repo-zip-direct-restore-links-range-proof.json
expiresAt: 2026-05-23T03:47:32.488Z
```

The direct restore kit contains:

```text
README.txt
RESTORE.md
MetrAIyux-0S-artifact-key-material.txt
```

Restore steps for the next dev or new Codespace:

```bash
unzip MetrAIyux-0S-full-repo-direct-restore-kit-20260523T004619Z.zip -d restore-kit
cp restore-kit/MetrAIyux-0S-artifact-key-material.txt .
openssl enc -d -aes-256-cbc -pbkdf2 -iter 700000 -md sha256 -pass file:./MetrAIyux-0S-artifact-key-material.txt -in ./MetrAIyux-0S-full-repo-20260522T234329Z.zip.enc -out ./MetrAIyux-0S-full-repo-20260522T234329Z.zip
unzip -q ./MetrAIyux-0S-full-repo-20260522T234329Z.zip -d ./restore-metraiyux-0s
```

Operational rule after this correction:

- Never tell the owner the `.zip.enc` is the final ZIP.
- Say: "Download the encrypted artifact plus the direct restore kit. The restore kit unlocks the encrypted artifact into the real repo ZIP."
- Keep raw signed URLs and key contents out of commits/handoffs. The chat can receive fresh short-lived links only when the owner explicitly asks for them.

## 2026-05-23 Customer-Grade Restore Flow Follow-Up

The restore confusion was converted into a product flow:

- Added `tools/skyevault-restore-encrypted-zip.mjs`, a standalone restore helper that decrypts `.zip.enc` into a real `.zip`, verifies it, and extracts it.
- Updated `tools/skyevault-full-repo-push.mjs` so ZIP full-repo pushes now build a direct restore kit automatically. The kit includes `README.txt`, `RESTORE.md`, `<repo>-artifact-key-material.txt`, and the restore helper.
- The full-repo push script attempts to upload that direct restore kit unless `--skip-direct-restore-kit-upload` is passed.
- Added `SkyeVault-Drop/docs/ENCRYPTED_REPO_ZIP_RESTORE.md`.
- Added `SkyeVault-Drop/CHANGELOG.md`.
- Updated `SkyeVault-Drop/public/repo.html`, `SkyeVault-Drop/public/vault.html`, and `SkyeVault-Drop/public/assets/app.js` so customer-facing copy says `.zip.enc` is encrypted and needs the matching restore kit.
- Updated `SkyeVault-Drop/scripts/live-worker-browser-proof.mjs` to check the restore-flow copy and record console/network evidence.

Customer wording to keep:

```text
Download two files: the encrypted repo artifact and the direct restore kit. The artifact ends in .zip.enc because it is protected. The restore kit unlocks it into the real .zip, verifies it, and extracts the repo folder.
```

Direct helper command shape:

```bash
unzip MetrAIyux-0S-full-repo-direct-restore-kit-<stamp>.zip -d restore-kit
node restore-kit/skyevault-restore-encrypted-zip.mjs --artifact=./MetrAIyux-0S-full-repo-<stamp>.zip.enc --key-file=./restore-kit/MetrAIyux-0S-artifact-key-material.txt --out-dir=./restore-metraiyux-0s --force
```

Do not put raw signed links or key material in committed files. The direct restore kit is sensitive because it can unlock the encrypted artifact.

2026-05-23 follow-through checks and production status:

```text
npm run mcp:mine -- SkyeVault-Drop
cd SkyeVault-Drop && npm run smoke
npm run brain:sync:obsidian
npm run vault:0s:map
```

Results:

- MCP mining refreshed `SkyeVault-Drop/MCP_TOOLING_RECEIPT.json` with zero failed calls.
- SkyeVault smoke passed, including the new customer restore checks for `.zip.enc` plus direct restore kit wording.
- Obsidian brain sync refreshed `metraiyux_0s_site/brain/obsidian-sync.json` with 224 local-brain chunks.
- SkyeVault neural bridge refreshed `metraiyux_0s_site/brain/skyevault-vault-map.json` and `metraiyux_0s_site/brain/skyevault-workspaces/index.json` with 62 nodes and 61 links.
- `tools/run-root-wrangler.mjs` was hardened so Worker deploys probe Workers credentials first instead of using a D1-only probe.
- `SkyeVault-Drop/package.json` now points `cloudflare:check` and `cloudflare:deploy` at the root Wrangler runner so the deploy lane does not depend on a pre-existing `SkyeVault-Drop/node_modules/wrangler/bin/wrangler.js`.
- Cloudflare dry-run deploy for `SkyeVault-Drop` passed with 30 asset files and the expected `SKYGATEFS27_WORKER` + `ASSETS` bindings.

Production deploy blocker:

- Real Cloudflare deploy to `skyevault-drop` was attempted on 2026-05-23 and blocked by Cloudflare auth.
- Wrangler returned `Authentication error [code: 10000]` and `Invalid access token [code: 9109]` for the configured API token lane.
- Do not claim the SkyeVault customer restore UI is production-live until a valid Cloudflare Workers deploy token is supplied and the headed live-browser proof passes.
- After token repair, run:

```bash
cd SkyeVault-Drop
npm run cloudflare:build
ROOT_ENV_FILE=../.env WRANGLER_VERSION=4.94.0 node ../tools/run-root-wrangler.mjs deploy --dry-run --outdir /tmp/skyevault-wrangler-dry-run
ROOT_ENV_FILE=../.env WRANGLER_VERSION=4.94.0 node ../tools/run-root-wrangler.mjs deploy
HEADLESS=false BASE_URL=https://skyevault-drop.graylondonskyes.workers.dev node scripts/run-with-root-env.mjs -- npm run live:browser-proof
```

If the Codespace has no display server, wrap the proof command with `xvfb-run -a`. The updated proof script now scrolls desktop/mobile pages, checks split routes, records scroll-stop screenshots, and fails on console errors or failed browser requests.

## 2026-05-23 Business Cards Client Access Studio Follow-Up

Source state:

- Business Cards Client Access Studio is present in Git at `marketing/metraiyux-0s/business-cards.html`.
- Local QR generation is vendored at `marketing/metraiyux-0s/assets/vendor/qrcode-generator.js`; the external unpkg dependency was removed after live proof caught the failed CDN request.
- The marketing changelog now records the deployed Client Access Studio production state at `marketing/metraiyux-0s/CHANGELOG.md`.
- The dedicated deploy handoff is `.vscode/Handoffs/2026-05-23-business-cards-v2-handoff.md`.
- MCP mining was run before and after the rebuild for `marketing/metraiyux-0s`; both passes reported 18 resources read, 27 tools listed, 30 tool calls, and zero failed calls.

Production state:

- Live URL `https://metraiyux-0s-marketing.pages.dev/business-cards.html` now serves the corrected founder-branded Client Access Studio overwrite.
- Cloudflare Pages deployment: `ac63a830-4a79-476a-93d2-9ce120e2578a`.
- Preview URL: `https://ac63a830.metraiyux-0s-marketing.pages.dev`.
- Final deploy used `tools/cloudflare-pages-direct-upload.mjs` because Wrangler Pages upload was hanging in this Codespace.
- Root `.env` line `1240` was the token lane that could reach Pages. Do not print or commit the value. The token around line `1236` could read account/Zero Trust resources but was not valid for Pages deployment.
- Headed live-browser proof passed desktop `1440x980` and mobile `390x844`: production URL opened, expected card text rendered, Valley Verified fields updated in-browser, four print actions fired, QR canvas pixels were nonblank, founder/logo images loaded, full-page scroll proof was captured, and there were zero console errors plus zero failed requests.
- Proof receipt: `test-artifacts/live-browser-verifier/2026-05-23T02-38-26-557Z-business-cards-v2-production-focused/live-browser-verification-report.json`.
- Deploy receipt: `test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-founder-assets-receipt.json`.
- Manifest: `test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-founder-assets-manifest.json`.

What changed after owner rejection of the prior cards:

- Replaced the card surface with a browser card studio instead of a set of near-identical dark templates.
- Added 3 founder card directions using the real local founder headshot, portrait, founder cutout, Skye Over London logo, and MetrAIyux 0S logos.
- Rebuilt the Valley Verified card as a selected-client priority-access pass with business/city/category/contact fields, generated access code, founder photo, Skye Over London logo, and a QR that opens a prefilled direct email to Gray London Skyes.
- Owner correction: do not add `875+`, fake Phoenix-business counts, or inflated Valley Verified scale claims unless a verified source of truth is provided.
- Rebuilt the 12 platform cards from structured data so future updates only edit the platform array.
- Added print/PDF actions for single cards, full set, and platform set.

Repeat deploy command shape:

```bash
CLOUDFLARE_API_TOKEN="$(sed -n '1240p' .env | sed -E 's/^[^=]+=//' | sed -E 's/^['\"'\"']|['\"'\"']$//g')" \
CLOUDFLARE_ACCOUNT_ID="$(sed -n '1241p' .env | sed -E 's/^[^=]+=//' | sed -E 's/^['\"'\"']|['\"'\"']$//g')" \
PAGES_PROJECT=metraiyux-0s-marketing \
PAGES_DIR=marketing/metraiyux-0s \
PAGES_COMMIT_MESSAGE="Overwrite business cards with founder assets" \
node tools/cloudflare-pages-direct-upload.mjs
```

Repeat proof:

```bash
npm run proof:business-cards
```

Closure validation for this business-card production pass already ran:

```text
node --check tools/cloudflare-pages-direct-upload.mjs
node --check tools/proof-business-cards-v2-production.mjs
python3 -m py_compile cf_pages_deploy.py
npm run proof:business-cards
npm run brain:sync:obsidian
npm run vault:0s:map
```

Brain/neural-map refresh result after the latest Business Cards Client Access Studio overwrite: 13 Obsidian notes into 224 local-brain chunks, plus 1 SkyeVault repo / 26 receipts / 64 nodes / 63 links / 1 workspace map.

## 2026-05-23 Next-Agent Operating Playbook - Repo, Production, Vaults, And Local Clone

This is the practical "do not break the owner's project" playbook for any next agent/dev landing in this repo.

### First Read Order

1. Read `AGENTS.md` at repo root. It is the active repo rulebook.
2. Read `.agents/live-browser-verifier/browser-proof-policy.toml` before claiming any production-facing web/app work is done.
3. Read this handoff, then the specific dated handoff for the surface being touched.
4. For MCP/tooling work, use the repo MCP source of truth in `.mcp.json`: `quantumskyes` runs `node /workspaces/MetrAIyux-0S/MCP/stdio-server.mjs`.
5. For SkyeVault/drive/restore work, read `SkyeVault-Drop/docs/ENCRYPTED_REPO_ZIP_RESTORE.md`, `SkyeVault-Drop/CHANGELOG.md`, and the SkyeVault sections in this handoff.

### Non-Negotiable Repo Rules

- Do not create per-app founder/admin/client passwords for mounted 0S apps. Owner/admin access must use the shared FS27/SkyGate/Free99 gate lane and accepted headers/cookies/helpers.
- Every mounted app path inside `metraiyux_0s_site` must pass through `enforceZeroOsGate` before assets or proxied APIs are served.
- Production-facing web/app changes are not complete until a headed browser proof passes on the deployed production URL across desktop and mobile. Curl, static screenshots, and headless-only checks do not satisfy the repo gate.
- Never commit or print raw bearer tokens, Cloudflare API token values, `.env`, `.dev.vars`, signed vault links in docs, `.skyesecrets`, unlock-code files, artifact key material, or direct restore-kit key material.
- Work with the current tree. Do not reset, checkout, or revert user changes unless the owner explicitly asks.
- Keep the site neural map and brains current during repo-wide preservation/deploy passes: run `npm run brain:sync:obsidian` and `npm run vault:0s:map`.

### Git Source Of Truth

Canonical Git remote:

```text
https://github.com/tyronenorman6606-source/MetrAIyux-0S
```

Canonical branch:

```text
main
```

Safety snapshot branch used during this pass:

```text
full-workspace-snapshot-20260523-fastzip-contact-handoff
```

Local VS Code clone commands for the owner:

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone --progress https://github.com/tyronenorman6606-source/MetrAIyux-0S.git
cd MetrAIyux-0S
git switch main
git pull --ff-only
code .
```

If the owner wants the snapshot branch instead:

```bash
git fetch origin full-workspace-snapshot-20260523-fastzip-contact-handoff
git switch -c full-workspace-snapshot-20260523-fastzip-contact-handoff origin/full-workspace-snapshot-20260523-fastzip-contact-handoff
code .
```

The repo already clones into one folder named `MetrAIyux-0S/`. Do not move every project into another nested folder inside the repo; many scripts use repo-relative paths.

### Safe Commit And Push Flow

Before commit:

```bash
git status --short --branch
git diff --stat
```

Stage normal source/docs/proof artifacts:

```bash
git add -A
```

If a safe proof receipt/screenshot under ignored `test-artifacts/` must be preserved, force-add only that exact receipt folder:

```bash
git add -f test-artifacts/<safe-proof-folder-or-receipt>
```

Pre-commit safety checks:

```bash
git diff --cached --name-only | rg '(^|/)\\.env$|\\.dev\\.vars$|\\.skyevault-out|\\.skyesecrets$|UNLOCK_CODES|artifact-key-material|full-repo-.*\\.(zip|enc)$|X-Amz-Signature|\\.env[0-9]+$|private-key|secret-pack|control-pack' || true
git diff --cached -U0 | rg -n '(cfat_[A-Za-z0-9]+|cfut_[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|X-Amz-Signature=|R2_SECRET_ACCESS_KEY=)' || true
git diff --cached --name-only -z --diff-filter=AM | xargs -0 -r stat -c '%s %n' | awk '$1 > 100000000 {print}'
git diff --cached --check
```

Commit and push:

```bash
git commit -m "<short accurate message>"
git push origin main
git branch -f full-workspace-snapshot-20260523-fastzip-contact-handoff main
git push origin full-workspace-snapshot-20260523-fastzip-contact-handoff
git status --short --branch
```

If `main` ever rejects for policy/size/auth reasons, push the snapshot branch and report the branch name/hash to the owner immediately.

### Cloudflare Pages Production Push Lane

Use this lane for the MetrAIyux marketing Pages project and other static Pages deploys when Wrangler Pages upload hangs:

```text
tools/cloudflare-pages-direct-upload.mjs
cf_pages_deploy.py
npm run pages:direct-upload
```

Root `.env` line `1240` was the Pages-capable token lane in this Codespace, and line `1241` was the matching account ID. Do not print the values. The token around line `1236` could read account/Zero Trust resources but failed Cloudflare Pages deployment.

Repeat shape:

```bash
CLOUDFLARE_API_TOKEN="$(sed -n '1240p' .env | sed -E 's/^[^=]+=//' | sed -E 's/^['\"'\"']|['\"'\"']$//g')" \
CLOUDFLARE_ACCOUNT_ID="$(sed -n '1241p' .env | sed -E 's/^[^=]+=//' | sed -E 's/^['\"'\"']|['\"'\"']$//g')" \
PAGES_PROJECT=metraiyux-0s-marketing \
PAGES_DIR=marketing/metraiyux-0s \
PAGES_COMMIT_MESSAGE="<accurate deploy message>" \
node tools/cloudflare-pages-direct-upload.mjs
```

After deploy, verify production over HTTP and then run headed browser proof. For Business Cards:

```bash
npm run proof:business-cards
```

Latest Business Cards production facts:

```text
production URL: https://metraiyux-0s-marketing.pages.dev/business-cards.html
deployment: ac63a830-4a79-476a-93d2-9ce120e2578a
preview: https://ac63a830.metraiyux-0s-marketing.pages.dev
deploy receipt: test-artifacts/cloudflare-pages/metraiyux-0s-marketing-business-cards-founder-assets-receipt.json
browser proof: test-artifacts/live-browser-verifier/2026-05-23T02-38-26-557Z-business-cards-v2-production-focused/live-browser-verification-report.json
```

### Cloudflare Worker Push Lane

For Workers, use the repo runner instead of assuming a local package install:

```bash
ROOT_ENV_FILE=../.env WRANGLER_VERSION=4.94.0 node ../tools/run-root-wrangler.mjs deploy --dry-run --outdir /tmp/<worker>-wrangler-dry-run
ROOT_ENV_FILE=../.env WRANGLER_VERSION=4.94.0 node ../tools/run-root-wrangler.mjs deploy
```

Then perform the required headed live-browser proof on the production Worker URL. Do not claim production-live when Cloudflare auth blocks deploy. SkyeVault Drop was still Worker-deploy blocked by Cloudflare auth during the earlier restore-flow pass, even though its local smoke/dry-run checks passed.

### SkyeDrive / SkyeVault Full-Repo Backup Lane

The full "lose nothing" workspace backup lane is SkyeVault/SkyeDrive, not Git. Git is the safe source snapshot; the vault artifact is the full encrypted workspace preservation path, including ignored/untracked material that should not be committed.

Current full-repo backup tool:

```text
tools/skyevault-full-repo-push.mjs
npm run vault:repo:full
```

Use ZIP mode. The owner explicitly wanted ZIP, not tar-only:

```bash
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev \
npm run vault:repo:full -- \
  --repo=/workspaces/MetrAIyux-0S \
  --repo-name=MetrAIyux-0S \
  --archive-format=zip \
  --zip-level=0 \
  --zip-upload-concurrency=8 \
  --max-gb=100
```

Important restore wording:

```text
Download two files: the encrypted repo artifact and the direct restore kit.
The artifact ends in .zip.enc because it is protected.
The restore kit unlocks it into the real .zip, verifies it, and extracts the repo folder.
```

Never tell the owner that `.zip.enc` is directly unzip-able. The real `.zip` only appears after decrypting/unlocking with the restore kit.

Direct restore command shape:

```bash
unzip MetrAIyux-0S-full-repo-direct-restore-kit-<stamp>.zip -d restore-kit
node restore-kit/skyevault-restore-encrypted-zip.mjs --artifact=./MetrAIyux-0S-full-repo-<stamp>.zip.enc --key-file=./restore-kit/MetrAIyux-0S-artifact-key-material.txt --out-dir=./restore-metraiyux-0s --force
```

Vault outputs and what can be shared:

- It is okay to give the owner fresh short-lived signed download links in chat when explicitly requested.
- Do not commit signed URLs, unlock codes, `.skyesecrets`, direct restore kit contents, or key material to Git.
- Commit only safe docs/receipts that do not contain raw secrets.
- Keep the local `FULL_REPO_SKYDRIVE_HANDOFF.json`, `SKYDRIVE_UPLOAD_RECEIPT.json`, range proofs, and `.skyevault-out/*download-links*.json` private unless the owner asks for link details in chat.

### Customer-Grade Restore Rule

For customers, the UI/copy must make the restore flow obvious:

```text
.zip.enc is the protected artifact.
Direct restore kit is the unlock/restore helper.
Run the helper and it creates the real .zip/extracted repo.
```

The direct restore kit is intentionally small because it contains helper files and key material, not the whole repo. The large `.zip.enc` is the whole repo artifact.

### Brain / Neural Map Refresh

Run these after repo-wide backup/deploy/handoff passes:

```bash
npm run brain:sync:obsidian
npm run vault:0s:map
```

Latest refresh from this pass:

```text
Obsidian brain sync: 13 notes into 224 local-brain chunks
SkyeVault 0S neural bridge: 1 repo, 24 receipts, 62 nodes, 61 links, 1 workspace map
```

### Contact Accuracy

The contact inventory is already attached earlier in this handoff:

```text
.vscode/Handoffs/contact-info-inventory-latest.md
.vscode/Handoffs/contact-info-inventory-latest.json
```

Do not guess company contact details from old generated pages. Treat `graylondonskyes@gmail.com`, `hello@skyesoverlondon.com`, `ops@skyesoverlondon.com`, `admin@skyesoverlondon.com`, `operator@metraiyux.com`, and the high-repeat phone `(480) 469-5416` as candidates until the owner-approved current source of truth is confirmed. Client/profile phone numbers are not automatically company contact info.
