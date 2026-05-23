# 0S Shared Shell / Giant Renderer Audit

Date: 2026-05-20

Scope: `metraiyux_0s_site`

This audit looks for surfaces where app-looking folders exist, but the user experience is still driven by one shell, one shared renderer, or repeated template code instead of real per-client dashboards.

Owner correction: generated catalogs and generated route folders are expected in this repo. Route volume is not a flaw by itself. The flaw is when generated/public/catalog routes are counted as proof of a functional app dashboard, client workspace, authenticated operating room, or role-specific user experience.

## Method

- Ran `npm run mcp:mine -- metraiyux_0s_site` per repo MCP workflow.
- Read the generated `metraiyux_0s_site/MCP_TOOLING_RECEIPT.json`.
- Scanned app folders for:
  - HTML count vs JS count.
  - common script imports across many folders.
  - giant renderer files.
  - exact duplicate JS hashes.
  - folder trees where `index.html` files mainly mount or import one shared renderer.

MCP inventory confirmed:

- `23,434` HTML files.
- `1,441` JS files.
- Source shell: `metraiyux_0s_site/index.html`, `style.css`, `script.js`.
- No canonical bundle or canonical JS was identified by the receipt.

## Critical Findings

### 1. `0s/` is a window wrapper, not a real app operating layer

Evidence:

- `metraiyux_0s_site/0s/os.js`
  - `87` app definitions.
  - `83` URL-backed launch targets.
  - `20` entries marked `kind: "wrapped"`.
  - only `4` internal `view:` surfaces.
- `renderIframe()` renders every wrapped app through the same iframe shell.
- `metraiyux_0s_site/assets/skyeway-routes.js`
  - `4,575,568` bytes.
  - one generated global route inventory.
  - `24,055` total routes.
  - `20,729` routes attributed to SovereignDocs.

Verdict: high-priority flaw, but not because routes are generated. `skyeway-routes.js` is a generated atlas and that is legitimate. The real issue is that the 0S launcher treats many URL-backed surfaces as mounted apps through the same iframe shell. A mounted app should declare capabilities, user/client identity needs, storage/API contracts, events, health, dashboard route, and proof route.

### 2. SovereignDocs is intentionally generated, with one canonical app tree

Evidence:

- Root: `metraiyux_0s_site/Free99/apps/sovereigndocs`
- `20,729` HTML files.
- `106` JS/MJS files.
- Largest app-side JS:
  - `server/sovereigndocs-server.mjs` - `110,206` bytes.
  - `assets/app.js` - `57,768` bytes.
  - `assets/multipage.js` - `45,402` bytes.
  - `assets/workflow-ui.js` - `33,836` bytes.
- Sampled HTML showed `assets/multipage.js` loaded in `400/400` sampled pages.
- `multipage.js` contains the real client-side renderer functions: library, builder, governance, vault, workspace, audit, and API status.
- `Free99/app-manifest.json` identifies `platform_id=sovereigndocs`, `slug=sovereigndocs`, and source `sovereigndocs-recovered-v20/sovereigndocs`.
- `0s/os.js` has multiple SovereignDocs launcher entries, but all point into this same `Free99/apps/sovereigndocs` tree:
  - `../Free99/apps/sovereigndocs/index.html`
  - `../Free99/apps/sovereigndocs/app/index.html`
  - `../Free99/apps/sovereigndocs/documents/index.html`
  - `../Free99/apps/sovereigndocs/builder/index.html`
  - `../Free99/apps/sovereigndocs/workspace/index.html`
  - `../Free99/apps/sovereigndocs/vault/index.html`
  - `../Free99/apps/sovereigndocs/api/index.html`
  - `../Free99/apps/sovereigndocs/admin/index.html`
  - `../Free99/apps/sovereigndocs/review-queue/index.html`
  - `../Free99/apps/sovereigndocs/official-sources/index.html`
  - `../Free99/apps/sovereigndocs/pricing/index.html`
  - `../Free99/apps/sovereigndocs/skye-docx-max/index.html`

Verdict: corrected. SovereignDocs should not be called fake just because it has a large generated document/template catalog. The generated pages are part of the product. The thing to audit is whether the dashboard routes (`customer-dashboard`, `admin`, `review-queue`, `case-command-center`, `workspace`, `vault`, partner/legal-review lanes) provide real role-specific state and actions, or whether they only present static route cards around the generated engine.

SkyeRouteX check: no second `SovereignDocs` or `sovereigndocs` app directory was found under `metraiyux_0s_site/SkyeRouteX`; the old root-level RouteX duplicate has been quarantined outside the deployed 0S site tree. Searches for `SovereignDocs`/`sovereigndocs` inside SkyeRouteX returned no app/code references. Searches for generic `sovereign` only found unrelated `owner_approved_after_sovereign_stack_review` proof/readiness strings.

### 3. Valley Verified is one public directory renderer stretched across hundreds of routes

Evidence:

- Root: `metraiyux_0s_site/valley-verified`
- `968` HTML files.
- `6` JS files.
- `376/400` sampled pages import `/valley-verified/assets/app.js`.
- Group counts:
  - `business`: `352` pages, `330` import `/valley-verified/assets/app.js`.
  - `category`: `15` pages, all import `/valley-verified/assets/app.js`.
  - `city`: `15` pages, all import `/valley-verified/assets/app.js`.
  - `market`: `65` pages, all import `/valley-verified/assets/app.js`.
  - `niche`: `379` pages, all import `/valley-verified/assets/app.js`.
  - `collection`: `7` pages, all import `/valley-verified/assets/app.js`.
- Some pages are huge static payloads:
  - `directory/index.html` - `814,946` bytes.
  - `collection/accepting-requests/index.html` - `814,705` bytes.
  - `business/index.html` - `814,686` bytes.

Verdict: high-priority product gap. Valley Verified has useful client-side interactions like shortlist, compare, claim, seed packet, and filters, but it is still mostly generated public directory routes. It does not yet read like a real owner dashboard, AE dashboard, admin review console, or client CRM.

### 4. Client App Factory output is mostly template variants, not client dashboards

Evidence:

- `client-app-factory/runtime-app/app.js`
  - one path/client-id driven renderer.
  - `PAGE_META` maps route names.
  - `renderPage()` switches on the route file name.
  - `root.innerHTML = renderPage(record, info)`.
- `client-app-factory/generated-apps/index.html`
  - only loads `../assets/app.js`.
- White-label app folders reuse the same script pattern:
  - `as-you-wish-pottery-westgate/script.js` - `26,147` bytes.
  - `fade-masters-phx/script.js` - `26,110` bytes.
  - `next-level-gaming-goodyear/script.js` - `26,133` bytes.
  - `skye-app-template/script.js` - `26,183` bytes.
- These four scripts expose the same `92` function/const/data-token signature count.
- Exact duplicate JS:
  - `assets/workspace-chat-widget.js` is identical across `as-you-wish-pottery-westgate`, `fade-masters-phx`, `next-level-gaming-goodyear`, and `skye-app-template`.
- Several law-firm client app folders are only two static HTML files with no local JS:
  - `burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b`
  - `fennemore-phoenix-85016-eb81f5b`
  - `gallagher-and-kennedy-p-a-phoenix-85016-887b1be`
  - `greenberg-traurig-llp-phoenix-85016-5f86b1d`
  - `kutak-rock-llp-scottsdale-85253-00c0044`
  - `milligan-lawless-p-c-phoenix-85018-94ab8a4`
  - `platz-juris-pllc-phoenix-85016-4e77b1f`

Verdict: highest client-facing rebuild priority. These folders can look like shipped client apps, but the durable dashboard/user experience layer is thin. Each paid or client-visible app needs an actual client workspace contract: tasks, requests, approvals, content edits, file vault, lead/contact capture, message/activity log, and deployment/proof state.

### 5. SkyeArcade is a monolithic game shell

Evidence:

- Root: `metraiyux_0s_site/Free99/apps/skyearcade`
- `13` HTML files.
- `app.js` is `151,874` bytes.
- Game route pages primarily load gate/platform scripts, while the application logic lives in one large file.

Verdict: medium-high priority. This is not just a marketing shell, but the app needs modular game engines/surfaces instead of one monolith pretending the game folders are independent products.

### 6. Skyebox Authenticator is duplicated as multiple apps

Evidence:

Exact duplicate app JS hash:

- `metraiyux_0s_site/Free99/apps/skyebox-authenticator/app.js`
- `metraiyux_0s_site/HouseOperations/skye-box-authenticator-vault/app.js`

Both are `43,293` bytes.

Also:

- `Free99/apps/skyebox-authenticator/index.html` - `89,091` bytes.
- `HouseOperations/skye-box-authenticator-vault/index.html` - `92,139` bytes.
- `admin/skyebox-authenticator/app.js` is also `43,293` bytes by size.

Verdict: likely functional utility, but misleading product architecture. This should be one shared authenticated vault/authenticator module with branded mounts, not copied app shells.

### 7. Northstar is duplicated between source mirror and live mount

Evidence:

Exact duplicate app JS hash:

- `metraiyux_0s_site/_platform-sources/glendale-northstar-valley-verified-v6-final/northstar/assets/app.js`
- `metraiyux_0s_site/northstar/assets/app.js`

Both are `40,947` bytes.

Verdict: lower priority than client dashboards. This looks like source/live mirroring rather than deliberate app fraud, but it should be tracked as a source-of-truth risk.

### 8. Marketing-Made-Easy contains repeated site shells

Evidence:

- `Marketing-Made-Easy/WebGrowthOperator`
  - `87` HTML files.
  - `79` nested pages load `../js/site.js`.
  - `53` pages load `../js/tracking.js`.
- `Marketing-Made-Easy/arizona-growth-index`
  - `43` HTML files.
  - `34` nested pages load the same `main.js`, `tracking-config.js`, and `tracking-hooks.js`.

Verdict: lower priority if these are websites. High priority if they are being presented as apps or dashboards.

### 9. Skye Over London source is a different flaw: inline monolith pages

Evidence:

- Root: `metraiyux_0s_site/_platform-sources/skyes-over-london-lc`
- `21` HTML files.
- only `1` local JS file: `assets/menu.js`.
- Active `login.html` is `65,959` bytes and carries Firebase/auth/workspace behavior inline.
- Large pages embed their own renderers/scripts instead of using a typed app architecture.

Verdict: not the same shared-shell problem, but still a maintenance flaw. The login/client workspace should be split into real modules and dashboards instead of one HTML blob.

## Rebuild Priority

1. Client App Factory client dashboards.
   - Replace template-only client folders with a reusable dashboard contract and per-client data.
   - Minimum real UX: requests, approvals, content edits, lead/contact capture, file vault, status/proof, activity log.

2. 0S launcher.
   - Stop treating iframe wrapping as app integration.
   - Add a real app registry contract: auth state, user/client identity, app capabilities, events, storage, health, dashboard URL, and proof URL.

3. Valley Verified.
   - Build real owner, AE, and admin workspaces.
   - Keep generated public pages, but do not count them as dashboards.

4. SovereignDocs.
   - Keep the generated catalog and the real builder/vault/export engine.
   - Do not count generated catalog route volume as theater.
   - Audit only the role dashboards and case lifecycle: customer, reviewer, admin, partner, workspace, vault, legal-review, and case-command-center.

5. SkyeArcade and duplicated utilities.
   - Split monoliths into modules.
   - Replace copied app shells with shared modules plus branded mounts.

## Short Version

The main flaw is real, but the wording matters: generated route folders are expected. The actual risk is when generated/catalog/static pages are treated as evidence that a working dashboard or app workspace exists. The functional architecture is still concentrated in a few shells:

- `0s/os.js`
- `assets/skyeway-routes.js`
- `Free99/apps/sovereigndocs/assets/multipage.js`
- `valley-verified/assets/app.js`
- `client-app-factory/runtime-app/app.js`
- `client-app-factory/assets/app.js`
- repeated `client-app-factory/client-apps/*/script.js`

The most urgent client-facing problem is `client-app-factory/client-apps/*`: several folders look like finished client apps but are still white-label pages, repeated scripts, or two-file static shells with no real dashboard layer.
