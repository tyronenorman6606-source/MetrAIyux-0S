# Company Knowledge Loop-In Handoff - 2026-05-22

## Why This Exists

The 0S now has a Company Knowledge Layer intended to become a literal company knowledge base:

- Founder/admin-owned knowledge for the actual MetrAIyux 0S.
- SaaS tenant-owned knowledge bases for customers using the 0S for their own companies.
- Cloudflare-first storage, because Google Drive OAuth is still a bad dependency for this Worker path.
- Drive/SkyeVault can stay as source or backup references, but Cloudflare R2 is the production storage lane.

The user also asked to delete the temporary SkyeHands direction and make sure Company Knowledge is looped into the public 0S surface and ecosystem map.

## Production Truth Right Now

Last successful 0S Worker deploy observed during this work:

```text
Worker version: 7a9fa33e-35a8-4aab-864d-6aabc9aac49f
Worker URL: https://metraiyux-0s-full-system.graylondonskyes.workers.dev
Deploy path: Cloudflare Workers only
Do not use Netlify for this repo path.
```

Fresh authenticated HTTP check run at `2026-05-22T05:18:01.484Z`:

- `/` unauthenticated: `302` to `/admin/login.html?return=%2F`, `x-0s-gate: fs27-required`.
- `/ecosystem.html` unauthenticated: `302` to `/admin/login.html?return=%2Fecosystem.html`, `x-0s-gate: fs27-required`.
- `/admin/login.html` public: `200`, includes `Company Knowledge` and `company-knowledge-layer-proof`, does not include `SkyeHands`.
- `/` authenticated: `200`, includes `Company Knowledge` and `company-knowledge-layer-proof`, does not include `SkyeHands`.
- `/ecosystem.html` authenticated: `200`, includes `Company Knowledge` and `company-knowledge-layer-proof`, does not include `SkyeHands`.
- `/assets/system-map.js` authenticated: `200`, includes Company Knowledge and no SkyeHands.

Plain English: the homepage/login/ecosystem loop-in is live on the real Cloudflare Worker and still uses the shared FS27 gate.

## What Is Implemented

### Company Knowledge API

Main module:

```text
metraiyux_0s_site/cloudflare/company-knowledge.mjs
```

Worker integration:

```text
metraiyux_0s_site/cloudflare/worker.js
```

API prefix:

```text
/api/0s/company-knowledge
```

Implemented behavior:

- Uses the shared 0S FS27/SkyGate/Free99 auth lane.
- No app-specific founder, owner, admin, or client-admin password was introduced.
- Platform knowledge base is owner/admin gated.
- Tenant knowledge bases are scoped to tenant/workspace identity.
- R2 is used for object bodies and metadata when available.
- KV is best-effort fallback/mirror metadata after the production KV quota issue surfaced during stress.
- Knowledge item context retrieval returns source-backed snippets/citations for brain/context handoffs.
- Citadel mirror events are recorded through the existing adapter path when available.

Important storage binding:

```text
metraiyux_0s_site/wrangler.toml
COMPANY_KNOWLEDGE_BUCKET = "metraiyux-0s-company-knowledge"
```

The code also falls back through the existing storage names if needed:

```text
COMPANY_KNOWLEDGE_BUCKET -> COMPANY_KNOWLEDGE_R2 -> SKYEVAULT_BUCKET -> VAULT_BUCKET
COMPANY_KNOWLEDGE_KV -> TENANT_BACKBONE_KV -> CONTENT_ENGINE_KV -> SITE_EVENTS_KV
```

### Owner And SaaS Consoles

Owner/admin surface:

```text
metraiyux_0s_site/admin/company-knowledge.html
```

Tenant/SaaS surface:

```text
metraiyux_0s_site/saas/company-knowledge.html
```

Shared browser controller:

```text
metraiyux_0s_site/assets/js/company-knowledge-console.js
```

Public proof/documentation:

```text
docs/0S_COMPANY_KNOWLEDGE_LAYER.md
metraiyux_0s_site/cloudflare/worker.js route: /live/company-knowledge-layer-proof.html
```

Public proof URL:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/company-knowledge-layer-proof.html
```

The public login/gate page now includes a Company Knowledge public proof link so cold visitors can discover the proof surface while protected 0S routes still go through FS27.

### Ecosystem/Homepage Loop-In

Production already shows Company Knowledge in these places:

- Public `/admin/login.html` proof link.
- Authenticated `/` homepage content.
- Authenticated `/ecosystem.html` quick dock/footer/subtitle text.
- Authenticated `/assets/system-map.js` contains Company Knowledge node data and no SkyeHands text.

Current live map files:

```text
metraiyux_0s_site/ecosystem.html
metraiyux_0s_site/assets/system-map.js
```

The ecosystem page imports:

```html
<script type="module" src="assets/system-map.js"></script>
```

The live `assets/system-map.js` contains the Company Knowledge node:

```text
id: company-knowledge
x: 230
y: 545
```

The temporary cache-busted `assets/system-map-company-knowledge.js` experiment was removed after the final proof passed against the live `assets/system-map.js` path.

## SkyeHands Cleanup

Deleted folders:

```text
skyehands-public-site
skyehands_runtime_control
```

Active 0S references were removed/replaced in these files:

```text
metraiyux_0s_site/ecosystem.html
metraiyux_0s_site/assets/system-map.js
metraiyux_0s_site/cloudflare/worker.js
metraiyux_0s_site/brain/live-surface-registry.json
metraiyux_0s_site/brain/sales-offer-registry.json
metraiyux_0s_site/brain/legal-sync.json
metraiyux_0s_site/llms.txt
metraiyux_0s_site/changelog/index.html
metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
marketing/metraiyux-0s/ecosystem.html
marketing/gray-skyes-canonical-site/ecosystem.html
```

Do not claim every historical/archive mention in the entire monorepo is gone unless you run a repo-wide scan again. The cleanup targeted the active 0S loop-in and public surface references.

## Verification Already Passed

Unit tests:

```bash
node --test metraiyux_0s_site/tests/company-knowledge.test.mjs
```

Result:

```text
3/3 tests passed
```

Syntax checks passed for:

```text
metraiyux_0s_site/cloudflare/worker.js
metraiyux_0s_site/assets/system-map.js
metraiyux_0s_site/cloudflare/generated-admin-login-page.mjs
metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
tools/proof-company-knowledge-loop-in-production.mjs
```

JSON parse checks passed for:

```text
metraiyux_0s_site/brain/live-surface-registry.json
metraiyux_0s_site/brain/sales-offer-registry.json
metraiyux_0s_site/brain/legal-sync.json
```

Company Knowledge stress proof passed before the loop-in change:

```text
Local receipt: test-artifacts/company-knowledge-stress/2026-05-21T17-12-06-486Z/receipt.json
Public JSON: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/live-company-knowledge-stress-latest.json
Stress result: 108/108 operations, 0 failures, 9/9 checks
```

Previous headed browser proof for the Company Knowledge layer passed before this latest homepage/ecosystem loop-in:

```text
Local receipt: test-artifacts/company-knowledge-production/2026-05-21T17-20-58-081Z/receipt.json
Live verifier: test-artifacts/live-browser-verifier/company-knowledge-production-2026-05-21T17-20-58-081Z.json
Result: 66 actions, 40 assertions, 36 scroll stops, failures []
```

Latest headed browser proof for the homepage/ecosystem loop-in passed after the live deploy:

```text
Local receipt: test-artifacts/company-knowledge-loop-in/2026-05-22T06-10-49-441Z/receipt.json
Latest receipt copy: test-artifacts/company-knowledge-loop-in/latest-receipt.json
Result: ok true, 20 actions, 15 scroll stops, 0 console errors, 0 failed requests, 0 HTTP errors, failures []
```

That proof checked:

- public `/admin/login.html` shows the Company Knowledge proof link and no SkyeHands text
- unauthenticated `/` redirects through `/admin/login.html?return=%2F` with `x-0s-gate: fs27-required`
- unauthenticated `/ecosystem.html` redirects through `/admin/login.html?return=%2Fecosystem.html` with `x-0s-gate: fs27-required`
- authenticated desktop `/` shows Company Knowledge and links to the proof
- authenticated desktop `/ecosystem.html` shows and links Company Knowledge through the quick dock
- authenticated mobile `/` shows Company Knowledge and links to the proof
- authenticated mobile `/ecosystem.html` shows and links Company Knowledge through the quick dock
- desktop and mobile scroll stops were screenshot and nonblank

Known proof note: the visible quick-dock/public route passed, but the script did not assert the dynamic JS node layer as visible during the run. There were no console errors, failed network requests, or HTTP errors. The user-visible ecosystem loop-in proven here is the quick dock/footer/public route plus the authenticated page content.

## Deploy Attempt Notes

The final proof above passed on the already-live Cloudflare Worker. A separate optional attempt to deploy a cache-busted map asset was abandoned because it was not needed and the full asset scan was unhealthy in this workspace.

- A successful Worker deploy got the public/login/home/ecosystem text loop-in live.
- After that, I temporarily tried a cache-busted `system-map-company-knowledge.js` and moved the Company Knowledge node.
- Every full Cloudflare asset deploy attempt after that got killed during or just after Wrangler's large asset scan.
- The repo has a very large asset tree, and there were also ambient Wrangler/Pages/browser processes running in the workspace.
- The temporary cache-busted asset was removed locally after the live proof passed against `assets/system-map.js`.

Final retry note:

```bash
NODE_OPTIONS="--max-old-space-size=4096" node scripts/deploy-0s-worker.mjs
```

This retry reached:

```text
Building list of assets...
```

It then stayed in the asset scan for several minutes. The wrapper died with no successful deploy output, leaving the Wrangler deploy child orphaned. That orphaned 0S deploy process was killed so the workspace was not left with a half-running production deploy.

MCP tooling note:

```bash
npm run mcp:mine -- metraiyux_0s_site
```

This was attempted and hung for multiple minutes. It was stopped and should be rerun when the workspace is quieter.

Important warning:

```text
.tmp/metraiyux-0s-assets-stage
```

Do not deploy this staged folder as-is. It was observed stale/incomplete:

- staged `ecosystem.html` did not include `system-map-company-knowledge.js`
- staged `system-map.js` did not include the new `x: 250`, `y: 820` node placement

That staged-folder warning is kept here because the stale folder still existed during the work. It is not part of the final proven path.

## Current Proof Script

Script:

```text
tools/proof-company-knowledge-loop-in-production.mjs
```

It does all of this:

- Obtains the shared FS27 admin bearer from root env candidates without printing secrets.
- Checks public `/admin/login.html`.
- Checks unauthenticated `/` and `/ecosystem.html` redirect through FS27.
- Opens headed Chromium via Xvfb when needed.
- Checks desktop and mobile.
- Opens authenticated `/`.
- Clicks the Company Knowledge proof link.
- Opens authenticated `/ecosystem.html`.
- Checks the quick dock and Company Knowledge text.
- Clicks the ecosystem Company Knowledge quick dock link.
- Scrolls both home and ecosystem on desktop/mobile.
- Captures screenshots and JSON receipt under:

```text
test-artifacts/company-knowledge-loop-in/<timestamp>/receipt.json
test-artifacts/company-knowledge-loop-in/latest-receipt.json
```

The script produced the passing final receipt:

```text
test-artifacts/company-knowledge-loop-in/2026-05-22T06-10-49-441Z/receipt.json
```

## Optional Next Moves

1. Let or stop unrelated deploy/browser jobs safely.

Current process scan showed unrelated/ambient Cloudflare and browser work, including:

```text
wrangler deploy --assets ../.tmp/metraiyux-0s-assets-stage --message "Key Gate 13th mobile overflow runtime guard"
wrangler pages deploy . --project-name=skyes-over-london-legal
wrangler pages deployment list --project-name=metraiyux-0s-marketing
Xvfb / Chromium processes from proof runs
```

Be careful before killing anything because this workspace may have parallel work. If it is clearly an orphaned Company Knowledge proof browser, it is safe to clean up.

2. Rerun local checks.

```bash
node --test metraiyux_0s_site/tests/company-knowledge.test.mjs
node --check metraiyux_0s_site/cloudflare/worker.js
node --check metraiyux_0s_site/assets/system-map.js
node --check metraiyux_0s_site/cloudflare/generated-admin-login-page.mjs
node --check metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
```

3. Run the headed browser proof again when touching the homepage/ecosystem.

```bash
node tools/proof-company-knowledge-loop-in-production.mjs
```

Passing criteria:

- `ok: true`
- no console errors
- no failed network requests
- no HTTP 4xx/5xx except intentionally ignored favicon/admin-login cases
- desktop and mobile screenshots saved
- home and ecosystem scroll stops show nonblank visible viewports
- public login page shows Company Knowledge proof link
- unauthenticated home/ecosystem redirect through FS27
- authenticated home/ecosystem show Company Knowledge
- SkyeHands not visible on those public/loop-in surfaces

## Files Added Or Changed For This Work

Core Company Knowledge:

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

Public loop-in / SkyeHands cleanup:

```text
metraiyux_0s_site/ecosystem.html
metraiyux_0s_site/assets/system-map.js
metraiyux_0s_site/cloudflare/generated-admin-login-page.mjs
metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
metraiyux_0s_site/brain/live-surface-registry.json
metraiyux_0s_site/brain/sales-offer-registry.json
metraiyux_0s_site/brain/legal-sync.json
metraiyux_0s_site/llms.txt
metraiyux_0s_site/changelog/index.html
marketing/metraiyux-0s/ecosystem.html
marketing/gray-skyes-canonical-site/ecosystem.html
```

Proof tooling:

```text
tools/proof-company-knowledge-loop-in-production.mjs
```

Handoff:

```text
.vscode/Handoffs/2026-05-22-company-knowledge-loop-in-handoff.md
```

## Bottom Line

The Company Knowledge system itself is built, tested, stress-proven, Cloudflare-backed, and deployed in production. The public/login/home/ecosystem text loop-in is also live now.

The latest required headed browser proof for that homepage/ecosystem loop-in passed at `test-artifacts/company-knowledge-loop-in/2026-05-22T06-10-49-441Z/receipt.json`.
