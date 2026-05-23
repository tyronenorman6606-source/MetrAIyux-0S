# Drinique MCP Comparison Rebuild Handoff

Date: 2026-05-22  
Repo: `/workspaces/MetrAIyux-0S`  
Surface: Valley Verified MCP comparison for Drinique  
Production project: `drinique-mcp-comparison`

## Executive Status

The Drinique comparison site is live in production and the visible public site files match the final local source byte-for-byte.

Production URL:

```text
https://drinique-mcp-comparison.pages.dev/
```

Latest verified deployment preview:

```text
https://54e4b27e.drinique-mcp-comparison.pages.dev
```

Routes:

```text
https://drinique-mcp-comparison.pages.dev/
https://drinique-mcp-comparison.pages.dev/base/
https://drinique-mcp-comparison.pages.dev/skrucible/
https://drinique-mcp-comparison.pages.dev/merser/
```

Production headed-browser proof is green:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-headed-browser-report.json
```

Summary of that proof:

- 8 production route runs: desktop and mobile-sized viewport across hub, base, SKRUCIBLE, and Merser.
- 102 human-style interactions.
- 30 assertions.
- 32 scroll-stop screenshots.
- 0 console errors.
- 0 page errors.
- 0 failed requests.
- 0 HTTP error responses.
- 0 proof failures.

## What Was Built

Source root:

```text
metraiyux_0s_site/valley-verified/mcp-comparison/drinique
```

Files:

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

This was built as a standalone Cloudflare Pages comparison surface. It did not overwrite the original Valley Verified generated Drinique profile:

```text
metraiyux_0s_site/valley-verified/business/drinique-phoenix-restaurant-food-service-419ae8c/index.html
```

The base site is hand-built. The Valley Verified generator was not used to create the base.

## Customer

Client selected: Drinique  
Valley Verified business id: `drinique-phoenix-restaurant-food-service-419ae8c`  
Category: Food And Events  
Niche: Bar / Restaurant Services  
City: Phoenix

Reason selected: restaurant/bar-type Valley Verified business with a generated profile, no matching app folder found in the checked client app locations, and suitable for comparing base vs SKRUCIBLE vs Merser.

## Variant Breakdown

Base:

- Route: `/base/`
- Hand-built restaurant preview.
- Full-bleed table/service visual.
- Menu anchors, request form, owner handoff area, and copy-link control.
- No boxed hero treatment.

SKRUCIBLE:

- Route: `/skrucible/`
- Uses SKRUCIBLE-style raw/refined forge mode.
- Kinetic wordmark treatment.
- Forge canvas and scroll chapter activation.
- Mode toggle mutates `html[data-forge-mode]`.
- Tools/contract used from SKRUCIBLE inspection:
  - `forge_palette`
  - `forge_component glass`
  - `forge_animation gsap-scroll`
  - `forge_animation kinetic-wordmark`
  - `forge_mode`

Merser:

- Route: `/merser/`
- Rebuilt around Merser source-world behavior, not just surface styling.
- Physical host-room interface with drag-to-pan, room hotspots, zoom controls, drawer conversion panels, route tabs, workspace dock, proof rail, and source-room iframe.
- Includes live source-room iframe:

```text
https://merser.pages.dev/source-packs/skye_real_worldsite_full_room_pack_v3/barbershop_chair_room_world.html
```

Merser contract details applied:

- Merser starts from extracted MCP2 zip/source-world packs, not disconnected demos.
- Room archetype used: `barbershop`.
- Room anchor concept adapted into the restaurant context as a host room.
- Interaction obligations applied:
  - drag-to-pan room
  - clickable service hotspots
  - drawer conversion panels
  - scroll camera movement
  - zoom controls
  - route selector
  - workspace dock
  - proof receipt rail

Tools/contract used from Merser inspection:

- `mcp4_build_plan`
- `mcp4_room barbershop`
- `mcp4_component sovereign-hero-slab`
- `mcp4_component route-selector-widget`
- `mcp4_component workspace-dock`
- `mcp4_component proof-receipt-rail`

## MCP Receipts

Primary variant receipt:

```text
metraiyux_0s_site/valley-verified/mcp-comparison/drinique/MCP_VARIANT_RECEIPT.json
```

Quantumskyes MCP mining receipt:

```text
metraiyux_0s_site/valley-verified/mcp-comparison/drinique/MCP_TOOLING_RECEIPT.json
```

Direct MCP artifact copy:

```text
test-artifacts/direct-mcp/drinique-mcp-tooling-receipt.json
```

Final MCP mining command run:

```bash
npm run mcp:mine -- metraiyux_0s_site/valley-verified/mcp-comparison/drinique
```

Final MCP mining result:

- `ok: true`
- resources read: 18
- listed tools: 27
- tool calls: 34
- failed calls: 0

## Production Proof

Proof runner:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/run-live-proof.mjs
```

Desktop receipt:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-headed-browser-report-desktop.json
```

Mobile-sized receipt:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-headed-browser-report-mobile.json
```

Merged receipt:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-headed-browser-report.json
```

Screenshots:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/screenshots/
```

Hash comparison artifact:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/live-source-hash-compare.json
```

Hash comparison result:

- Public HTML/CSS/JS match final local source: `true`
- Receipt JSON files match live production: `false`

Meaning: the actual site users see is live and matches the final local source. The local receipt JSON files were updated after the verified deployment, and a redundant deploy to publish those JSON-only receipt updates hit Wrangler/Cloudflare connectivity problems.

## Browser Proof Details

The live proof opened the production canonical URL in headed Chromium under Xvfb and used production routes only.

Desktop viewport:

```text
1440x980
```

Mobile-sized viewport:

```text
390x844
```

The proof used a responsive mobile-sized headed viewport. Full Chromium mobile emulation (`isMobile: true`) was attempted but crashed before page creation in this environment, so the final passing mobile proof uses the 390x844 viewport without mobile device emulation flags. It still exercises the responsive mobile layout in a headed browser.

Interactions performed:

- Hub CTA route clicks for base, SKRUCIBLE, and Merser.
- Base menu/request/owner anchors.
- Base form submission.
- Copy current preview link control.
- SKRUCIBLE raw/refined mode toggle cycles.
- SKRUCIBLE section anchors and form submission.
- Merser three full interaction cycles:
  - focused host, bar, table, menu, proof, and source hotspots
  - zoom in and zoom out
  - drawer open/close validation
  - diner/group/owner route panels
  - form submission
- Full-page scroll stops on every route in both viewports.

## Deployment Ledger

The production ledger has been updated:

```text
LIVE_DEPLOYMENT_LEDGER.md
```

Ledger entry records:

- canonical production URL
- latest verified deployment preview
- routes
- headed-browser proof result
- source hash comparison result
- MCP mining status
- proof receipt paths

## Deployment Notes

Verified production deployment:

```text
https://54e4b27e.drinique-mcp-comparison.pages.dev
```

Canonical production URL:

```text
https://drinique-mcp-comparison.pages.dev/
```

A later redundant deploy was attempted only to publish newer local receipt JSON files. It did not complete:

- First retry failed with a Wrangler `fetch failed` network/connectivity error.
- Second retry hung inside Wrangler and was stopped.

After that, the public production HTML/CSS/JS were fetched with redirects followed and hash-compared against the final local source. They matched exactly:

```text
index.html                       MATCH
base/index.html                  MATCH
skrucible/index.html             MATCH
merser/index.html                MATCH
shared/drinique-sites.css        MATCH
shared/drinique-sites.js         MATCH
```

The JSON receipt files differ live vs local:

```text
MCP_VARIANT_RECEIPT.json         DIFF
MCP_TOOLING_RECEIPT.json         DIFF
```

This does not affect the public site, but if you want the receipt JSON files themselves updated on Pages, rerun the Pages deploy when Wrangler/Cloudflare connectivity is clear, then rerun the headed browser proof because the deployment preview URL will change.

Use the safer `.env` loader pattern below. Do not shell-source `.env`; it contains invalid shell variable names.

```bash
node - <<'NODE'
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const env = { ...process.env, CI: '1' };
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[match[1]] = value;
}
const args = [
  'pages', 'deploy', '/workspaces/MetrAIyux-0S/metraiyux_0s_site/valley-verified/mcp-comparison/drinique',
  '--project-name', 'drinique-mcp-comparison',
  '--branch', 'production',
  '--commit-dirty=true',
  '--commit-message', 'Finalize Drinique MCP comparison rebuild',
  '--commit-hash', '0000000000000000000000000000000000000000',
  '--skip-caching',
];
const result = spawnSync('/home/codespace/.npm/_npx/32026684e21afda6/node_modules/.bin/wrangler', args, {
  stdio: 'inherit',
  env,
});
process.exit(result.status ?? 1);
NODE
```

After any successful redeploy, update `deploymentUrl` in:

```text
test-artifacts/drinique-mcp-comparison-prod-rebuild/run-live-proof.mjs
```

Then rerun:

```bash
timeout 600s env PROOF_VIEWPORT=desktop XDG_CONFIG_HOME=/tmp/drinique-pw-config-desktop-final PLAYWRIGHT_BROWSERS_PATH=/home/codespace/.cache/ms-playwright xvfb-run -a node test-artifacts/drinique-mcp-comparison-prod-rebuild/run-live-proof.mjs

timeout 600s env PROOF_VIEWPORT=mobile XDG_CONFIG_HOME=/tmp/drinique-pw-config-mobile-final PLAYWRIGHT_BROWSERS_PATH=/home/codespace/.cache/ms-playwright xvfb-run -a node test-artifacts/drinique-mcp-comparison-prod-rebuild/run-live-proof.mjs
```

Merge receipts with the same pattern used in the current merged receipt, or rerun the helper Node merge from shell history if available.

## Known Issues And Caveats

The repo worktree is dirty beyond this task. Do not reset the repo.

The Drinique comparison folder is currently untracked from Git's point of view. That is expected for this handoff unless you choose to commit it.

The main 0S Worker was not redeployed. This comparison was intentionally deployed as its own Pages project to avoid touching unrelated 0S production surfaces.

The current production site is ready as a public comparison surface. The only unfinished optional item is publishing the latest local receipt JSON files to the Pages deployment; the visible site itself is already live, proofed, and hash-matched.

## Quick Validation Commands

Check the live Merser route returns production HTML:

```bash
curl -I -L https://drinique-mcp-comparison.pages.dev/merser/
curl -s https://drinique-mcp-comparison.pages.dev/merser/ | rg "Drinique Host Room|Merser source-world output|data-merser-world"
```

Summarize production proof:

```bash
node -e "const r=require('./test-artifacts/drinique-mcp-comparison-prod-rebuild/live-headed-browser-report.json'); console.log(JSON.stringify({ok:r.ok,url:r.deployment.canonicalUrl,preview:r.deployment.deploymentUrl,runs:r.runs.length,actions:r.runs.reduce((s,x)=>s+x.actions.length,0),assertions:r.runs.reduce((s,x)=>s+x.assertions.length,0),screenshots:r.runs.reduce((s,x)=>s+x.scrollStops.length,0),failures:r.failures},null,2))"
```

Summarize MCP receipt:

```bash
node -e "const r=require('./metraiyux_0s_site/valley-verified/mcp-comparison/drinique/MCP_TOOLING_RECEIPT.json'); console.log(JSON.stringify({generatedAt:r.generatedAt,listedTools:(r.listedTools||[]).length,resourcesRead:(r.resourcesRead||[]).length,toolCalls:(r.toolCalls||[]).length,failedCalls:(r.toolCalls||[]).filter(c=>c.ok===false).length},null,2))"
```

Summarize source hash comparison:

```bash
node -e "const r=require('./test-artifacts/drinique-mcp-comparison-prod-rebuild/live-source-hash-compare.json'); console.log(JSON.stringify({visibleSiteMatchesLive:r.visibleSiteMatchesLive,receiptJsonMatchesLive:r.receiptJsonMatchesLive,visible:r.visibleSiteFiles.map(x=>[x.file,x.match]),receipts:r.receiptJsonFiles.map(x=>[x.file,x.match])},null,2))"
```

