# SkyeNet Client App Migration Todo

Generated: 2026-05-31T01:54:50.408Z

## Architecture Rule

Client/customer public apps, media bundles, artist storefronts, and generated business apps must deploy to standalone SkyeNet routes. The main 0S Worker stays the shared FS27/SkyGate/Free99 gate, owner command, control API, and redirect layer.

## Summary

- Candidates found: 73
- P0 routes: 4
- P1 client/customer apps: 36
- Stale Worker/Pages/Netlify deploy-target records: 0
- Candidates currently staged by the 0S Worker: 16

## Worker Stage Problems

- `free99-sovereigndocs` via `Free99/apps/sovereigndocs`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-skyevaultpro` via `Free99/apps/skyevaultpro`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-skyebox-authenticator` via `Free99/apps/skyebox-authenticator`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-brandforge` via `Free99/apps/brandforge`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-jobping` via `Free99/apps/jobping`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-keygate13` via `Free99/apps/keygate13`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-kaixu-codestudio` via `Free99/apps/kaixu-codestudio`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-social-batch-factory` via `Free99/apps/social-batch-factory`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-mydrive-offline-vault` via `Free99/apps/mydrive-offline-vault`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-skyepics` via `Free99/apps/skyepics`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-skyeopsconsole` via `Free99/apps/skyeopsconsole`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-skaixu-code-evaluator` via `Free99/apps/skaixu-code-evaluator`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-doctor-ops-personal-vault` via `Free99/apps/doctor-ops-personal-vault`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-documorph` via `Free99/apps/documorph`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-skyearcade` via `Free99/apps/skyearcade`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.
- `free99-kaixu-storefront` via `Free99/apps/kaixu-storefront`: Migrate public bundle to standalone SkyeNet or mark as gated 0S control/internal surface before removing from Worker stage.

## Migration Order

- P0 company/public network routes: SkyeRouteX, SkyeSol, SOLEnterprises, Valley Verified platform host/DNS/source custody.
- P1 generated client apps and real artist/customer storefronts: deploy each public bundle to SkyeNet host-native route with --source-root.
- P2 Valley business rebuild drops: decide whether each is a standalone client app or content under standalone Valley Verified.
- REVIEW Free99/product apps: keep internal/gated 0S tools mounted; only public sold/client handoff bundles move to SkyeNet.
- After archive and proof receipts exist, replace old 0S/client-app-factory/skyenet mounts with redirects or gated command records.

## P0 And P1 Surfaces

### P0 Skyeroutex Logistics Public

- Lane: `existing-skynet-drop`
- Build: `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public`
- Source root: `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public`
- Target: `https://skyenet.skyeroutex-logistics/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/skyemail-skyeroutex-logistics-provision/provision-latest.json`, `test-artifacts/skyemail-skyeroutex-logistics-provision-readiness/readiness-latest.json`, `test-artifacts/skyeroutex-logistics-company-brain-upgrade/receipt.json`, `test-artifacts/skyeroutex-logistics-public-deploy-blocked-2026-05-27T18-41-42Z.json`, `test-artifacts/skyeroutex-logistics-public-live-proof-2026-05-27T19-18-03Z.json`, `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public/deploy-target.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public   --source-root metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public   --project skyeroutex-logistics-public   --workspace skyeroutex-logistics   --host skyenet.skyeroutex-logistics   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Already staged as a SkyeNet drop; confirm route receipt, DNS/custom-host binding, and source custody before public copy points here.

### P0 Skyesol Company Public

- Lane: `existing-skynet-drop`
- Build: `metraiyux_0s_site/skyenet-drops/skyesol-company-public`
- Source root: `metraiyux_0s_site/skyenet-drops/skyesol-company-public`
- Target: `https://skyenet.skyesol/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/skyesol-company-public-live-proof-2026-05-27T23-39-50Z.json`, `test-artifacts/skyesol-company-public-live-proof-2026-05-28T00-07-35-976Z.json`, `test-artifacts/skyesol-company-public-live-proof-2026-05-28T00-29-48-380Z.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/Blogs/blog-manifest.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/SkyeDocx/manifest.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/SovereignVariables/manifest.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/THE NET WORKS/FEATURING/manifest.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/THE%20NET%20WORKS/FEATURING/manifest.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/deploy-target.json`, `metraiyux_0s_site/skyenet-drops/skyesol-company-public/docs/ai-endpoints-usage.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/skyenet-drops/skyesol-company-public   --source-root metraiyux_0s_site/skyenet-drops/skyesol-company-public   --project skyesol-company-public   --workspace skyesol   --host skyenet.skyesol   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Already staged as a SkyeNet drop; confirm route receipt, DNS/custom-host binding, and source custody before public copy points here.

### P0 Solenterprises Public

- Lane: `existing-skynet-drop`
- Build: `metraiyux_0s_site/skyenet-drops/solenterprises-public`
- Source root: `metraiyux_0s_site/skyenet-drops/solenterprises-public`
- Target: `https://skyenet.solenterprises/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/direct-mcp/solenterprises-public-mcp-tooling-receipt.json`, `test-artifacts/solenterprises-public-live-proof-2026-05-28T00-39-56-574Z.json`, `test-artifacts/solenterprises-public-live-proof-2026-05-28T00-43-55-397Z.json`, `metraiyux_0s_site/skyenet-drops/solenterprises-public/MCP_TOOLING_RECEIPT.json`, `metraiyux_0s_site/skyenet-drops/solenterprises-public/deploy-target.json`, `metraiyux_0s_site/skyenet-drops/solenterprises-public/skyenet-migration.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/skyenet-drops/solenterprises-public   --source-root metraiyux_0s_site/skyenet-drops/solenterprises-public   --project solenterprises-public   --workspace solenterprises   --host skyenet.solenterprises   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Already staged as a SkyeNet drop; confirm route receipt, DNS/custom-host binding, and source custody before public copy points here.

### P1 Valley Verified Custom Build

- Lane: `existing-skynet-drop`
- Build: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build`
- Source root: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build`
- Target: `https://skyenet.valley-verified/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/0s-browser-end-to-end/valley-verified-worker-deploy-receipt.json`, `test-artifacts/cloudflare-pages/valley-verified-direct-upload-manifest.json`, `test-artifacts/cloudflare-pages/valley-verified-direct-upload-receipt.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-26T12-46-12-626Z.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-26T12-46-23-379Z.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-26T12-50-47-198Z.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-26T12-58-20-922Z.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-26T13-00-17-457Z.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-27T16-52-34-895Z.json`, `test-artifacts/cloudflare-pages/valley-verified-no-generated-business-pages-http-smoke-2026-05-27T16-53-02-204Z.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/skyenet-drops/valley-verified-custom-build   --source-root metraiyux_0s_site/skyenet-drops/valley-verified-custom-build   --project valley-verified-custom-build   --workspace valley-verified   --host skyenet.valley-verified   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Already staged as a SkyeNet drop; confirm route receipt, DNS/custom-host binding, and source custody before public copy points here.

### P0 Valley Verified Marketplace

- Lane: `marketplace-client-network`
- Build: `metraiyux_0s_site/_platform-sources/valley-verified/dist`
- Source root: `metraiyux_0s_site/_platform-sources/valley-verified`
- Target: `https://skyenet.valley-verified/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/_platform-sources/valley-verified/dist   --source-root metraiyux_0s_site/_platform-sources/valley-verified   --project valley-verified-marketplace   --workspace valley-verified   --host skyenet.valley-verified   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Directive says reconcile Valley Verified last when another agent is actively changing it, but it is still a public client network that should not remain a main 0S Worker asset warehouse.

### P1 Arizona Biltmore Dentistry

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/arizona-biltmore-dentistry`
- Source root: `client-app-factory/client-apps/arizona-biltmore-dentistry`
- Target: `https://skyenet.arizona-biltmore-dentistry/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/arizona-biltmore-dentistry-phoenix-85016-d406e26/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/arizona-biltmore-dentistry-phoenix-85016-d406e26/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/arizona-biltmore-dentistry-phoenix-85016-d406e26/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/arizona-biltmore-dentistry-phoenix-85016-d406e26/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/arizona-biltmore-dentistry-phoenix-85016-d406e26/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/arizona-biltmore-dentistry-phoenix-85016-d406e26/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/arizona-biltmore-dentistry   --source-root client-app-factory/client-apps/arizona-biltmore-dentistry   --project arizona-biltmore-dentistry   --workspace arizona-biltmore-dentistry   --host skyenet.arizona-biltmore-dentistry   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 As You Wish Pottery Westgate

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/as-you-wish-pottery-westgate`
- Source root: `client-app-factory/client-apps/as-you-wish-pottery-westgate`
- Target: `https://skyenet.as-you-wish-pottery-westgate/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/as-you-wish-pottery-westgate/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/as-you-wish-pottery-westgate/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/as-you-wish-pottery-westgate/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/as-you-wish-pottery-westgate/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/as-you-wish-pottery-westgate/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/as-you-wish-pottery-westgate/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/as-you-wish-pottery-westgate   --source-root client-app-factory/client-apps/as-you-wish-pottery-westgate   --project as-you-wish-pottery-westgate   --workspace as-you-wish-pottery-westgate   --host skyenet.as-you-wish-pottery-westgate   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Burch And Cracchiolo P A Phoenix 85004 Acf6c6b

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b`
- Source root: `client-app-factory/client-apps/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b`
- Target: `https://skyenet.burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b   --source-root client-app-factory/client-apps/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b   --project burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b   --workspace burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b   --host skyenet.burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Dental Depot Orthodontics Phoenix

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/dental-depot-orthodontics-phoenix`
- Source root: `client-app-factory/client-apps/dental-depot-orthodontics-phoenix`
- Target: `https://skyenet.dental-depot-orthodontics-phoenix/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/dental-depot-orthodontics-phoenix-85053-c0fa26f/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/dental-depot-orthodontics-phoenix-85053-c0fa26f/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/dental-depot-orthodontics-phoenix-85053-c0fa26f/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/dental-depot-orthodontics-phoenix-85053-c0fa26f/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/dental-depot-orthodontics-phoenix-85053-c0fa26f/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/dental-depot-orthodontics-phoenix-85053-c0fa26f/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/dental-depot-orthodontics-phoenix   --source-root client-app-factory/client-apps/dental-depot-orthodontics-phoenix   --project dental-depot-orthodontics-phoenix   --workspace dental-depot-orthodontics-phoenix   --host skyenet.dental-depot-orthodontics-phoenix   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Empire Pallets

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/empire-pallets`
- Source root: `client-app-factory/client-apps/empire-pallets`
- Target: `https://skyenet.empire-pallets/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/empire-pallets-phoenix/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/empire-pallets-phoenix/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/empire-pallets-phoenix/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/empire-pallets-phoenix/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/empire-pallets-phoenix/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/empire-pallets-phoenix/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/empire-pallets   --source-root client-app-factory/client-apps/empire-pallets   --project empire-pallets   --workspace empire-pallets   --host skyenet.empire-pallets   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Fade Masters Phx

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/fade-masters-phx`
- Source root: `client-app-factory/client-apps/fade-masters-phx`
- Target: `https://skyenet.fade-masters-phx/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/fade-masters-phx/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fade-masters-phx/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fade-masters-phx/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fade-masters-phx/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fade-masters-phx/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fade-masters-phx/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/fade-masters-phx   --source-root client-app-factory/client-apps/fade-masters-phx   --project fade-masters-phx   --workspace fade-masters-phx   --host skyenet.fade-masters-phx   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Fennemore Phoenix 85016 Eb81f5b

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/fennemore-phoenix-85016-eb81f5b`
- Source root: `client-app-factory/client-apps/fennemore-phoenix-85016-eb81f5b`
- Target: `https://skyenet.fennemore-phoenix-85016-eb81f5b/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/fennemore-phoenix-85016-eb81f5b/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fennemore-phoenix-85016-eb81f5b/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fennemore-phoenix-85016-eb81f5b/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fennemore-phoenix-85016-eb81f5b/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fennemore-phoenix-85016-eb81f5b/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/fennemore-phoenix-85016-eb81f5b/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/fennemore-phoenix-85016-eb81f5b   --source-root client-app-factory/client-apps/fennemore-phoenix-85016-eb81f5b   --project fennemore-phoenix-85016-eb81f5b   --workspace fennemore-phoenix-85016-eb81f5b   --host skyenet.fennemore-phoenix-85016-eb81f5b   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Gallagher And Kennedy P A Phoenix 85016 887b1be

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/gallagher-and-kennedy-p-a-phoenix-85016-887b1be`
- Source root: `client-app-factory/client-apps/gallagher-and-kennedy-p-a-phoenix-85016-887b1be`
- Target: `https://skyenet.gallagher-and-kennedy-p-a-phoenix-85016-887b1be/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/gallagher-and-kennedy-p-a-phoenix-85016-887b1be   --source-root client-app-factory/client-apps/gallagher-and-kennedy-p-a-phoenix-85016-887b1be   --project gallagher-and-kennedy-p-a-phoenix-85016-887b1be   --workspace gallagher-and-kennedy-p-a-phoenix-85016-887b1be   --host skyenet.gallagher-and-kennedy-p-a-phoenix-85016-887b1be   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 General Dentistry 4 Kids Phoenix

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/general-dentistry-4-kids-phoenix`
- Source root: `client-app-factory/client-apps/general-dentistry-4-kids-phoenix`
- Target: `https://skyenet.general-dentistry-4-kids-phoenix/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/general-dentistry-4-kids-phoenix-85032-237e895/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/general-dentistry-4-kids-phoenix-85032-237e895/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/general-dentistry-4-kids-phoenix-85032-237e895/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/general-dentistry-4-kids-phoenix-85032-237e895/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/general-dentistry-4-kids-phoenix-85032-237e895/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/general-dentistry-4-kids-phoenix-85032-237e895/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/general-dentistry-4-kids-phoenix   --source-root client-app-factory/client-apps/general-dentistry-4-kids-phoenix   --project general-dentistry-4-kids-phoenix   --workspace general-dentistry-4-kids-phoenix   --host skyenet.general-dentistry-4-kids-phoenix   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Greenberg Traurig Llp Phoenix 85016 5f86b1d

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/greenberg-traurig-llp-phoenix-85016-5f86b1d`
- Source root: `client-app-factory/client-apps/greenberg-traurig-llp-phoenix-85016-5f86b1d`
- Target: `https://skyenet.greenberg-traurig-llp-phoenix-85016-5f86b1d/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/greenberg-traurig-llp-phoenix-85016-5f86b1d/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/greenberg-traurig-llp-phoenix-85016-5f86b1d/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/greenberg-traurig-llp-phoenix-85016-5f86b1d/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/greenberg-traurig-llp-phoenix-85016-5f86b1d/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/greenberg-traurig-llp-phoenix-85016-5f86b1d/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/greenberg-traurig-llp-phoenix-85016-5f86b1d/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/greenberg-traurig-llp-phoenix-85016-5f86b1d   --source-root client-app-factory/client-apps/greenberg-traurig-llp-phoenix-85016-5f86b1d   --project greenberg-traurig-llp-phoenix-85016-5f86b1d   --workspace greenberg-traurig-llp-phoenix-85016-5f86b1d   --host skyenet.greenberg-traurig-llp-phoenix-85016-5f86b1d   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Kutak Rock Llp Scottsdale 85253 00c0044

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/kutak-rock-llp-scottsdale-85253-00c0044`
- Source root: `client-app-factory/client-apps/kutak-rock-llp-scottsdale-85253-00c0044`
- Target: `https://skyenet.kutak-rock-llp-scottsdale-85253-00c0044/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/kutak-rock-llp-scottsdale-85253-00c0044/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/kutak-rock-llp-scottsdale-85253-00c0044/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/kutak-rock-llp-scottsdale-85253-00c0044/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/kutak-rock-llp-scottsdale-85253-00c0044/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/kutak-rock-llp-scottsdale-85253-00c0044/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/kutak-rock-llp-scottsdale-85253-00c0044/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/kutak-rock-llp-scottsdale-85253-00c0044   --source-root client-app-factory/client-apps/kutak-rock-llp-scottsdale-85253-00c0044   --project kutak-rock-llp-scottsdale-85253-00c0044   --workspace kutak-rock-llp-scottsdale-85253-00c0044   --host skyenet.kutak-rock-llp-scottsdale-85253-00c0044   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Milligan Lawless P C Phoenix 85018 94ab8a4

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/milligan-lawless-p-c-phoenix-85018-94ab8a4`
- Source root: `client-app-factory/client-apps/milligan-lawless-p-c-phoenix-85018-94ab8a4`
- Target: `https://skyenet.milligan-lawless-p-c-phoenix-85018-94ab8a4/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/milligan-lawless-p-c-phoenix-85018-94ab8a4/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/milligan-lawless-p-c-phoenix-85018-94ab8a4/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/milligan-lawless-p-c-phoenix-85018-94ab8a4/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/milligan-lawless-p-c-phoenix-85018-94ab8a4/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/milligan-lawless-p-c-phoenix-85018-94ab8a4/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/milligan-lawless-p-c-phoenix-85018-94ab8a4/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/milligan-lawless-p-c-phoenix-85018-94ab8a4   --source-root client-app-factory/client-apps/milligan-lawless-p-c-phoenix-85018-94ab8a4   --project milligan-lawless-p-c-phoenix-85018-94ab8a4   --workspace milligan-lawless-p-c-phoenix-85018-94ab8a4   --host skyenet.milligan-lawless-p-c-phoenix-85018-94ab8a4   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Next Level Gaming Az

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/next-level-gaming-az`
- Source root: `client-app-factory/client-apps/next-level-gaming-az`
- Target: `https://skyenet.next-level-gaming-az/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/next-level-gaming-az   --source-root client-app-factory/client-apps/next-level-gaming-az   --project next-level-gaming-az   --workspace next-level-gaming-az   --host skyenet.next-level-gaming-az   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Next Level Gaming Goodyear

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/next-level-gaming-goodyear`
- Source root: `client-app-factory/client-apps/next-level-gaming-goodyear`
- Target: `https://skyenet.next-level-gaming-goodyear/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/next-level-gaming-goodyear/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/next-level-gaming-goodyear/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/next-level-gaming-goodyear/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/next-level-gaming-goodyear/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/next-level-gaming-goodyear/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/next-level-gaming-goodyear/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/next-level-gaming-goodyear   --source-root client-app-factory/client-apps/next-level-gaming-goodyear   --project next-level-gaming-goodyear   --workspace next-level-gaming-goodyear   --host skyenet.next-level-gaming-goodyear   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Platz Juris Pllc Phoenix 85016 4e77b1f

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/platz-juris-pllc-phoenix-85016-4e77b1f`
- Source root: `client-app-factory/client-apps/platz-juris-pllc-phoenix-85016-4e77b1f`
- Target: `https://skyenet.platz-juris-pllc-phoenix-85016-4e77b1f/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `metraiyux_0s_site/skyenet-drops/valley-verified-custom-build/business/platz-juris-pllc-phoenix-85016-4e77b1f/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/platz-juris-pllc-phoenix-85016-4e77b1f/README.md`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/platz-juris-pllc-phoenix-85016-4e77b1f/assets/asset-inventory.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/platz-juris-pllc-phoenix-85016-4e77b1f/business.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/platz-juris-pllc-phoenix-85016-4e77b1f/research.json`, `metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses/platz-juris-pllc-phoenix-85016-4e77b1f/research.md`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/platz-juris-pllc-phoenix-85016-4e77b1f   --source-root client-app-factory/client-apps/platz-juris-pllc-phoenix-85016-4e77b1f   --project platz-juris-pllc-phoenix-85016-4e77b1f   --workspace platz-juris-pllc-phoenix-85016-4e77b1f   --host skyenet.platz-juris-pllc-phoenix-85016-4e77b1f   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 Skye App Template

- Lane: `client-app-factory-generated-app`
- Build: `metraiyux_0s_site/client-app-factory/client-apps/skye-app-template`
- Source root: `client-app-factory/client-apps/skye-app-template`
- Target: `https://skyenet.skye-app-template/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/client-app-factory/client-apps/skye-app-template   --source-root client-app-factory/client-apps/skye-app-template   --project skye-app-template   --workspace skye-app-template   --host skyenet.skye-app-template   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Generated client app. Public app/media should move to standalone SkyeNet; 0S should keep only owner command records and redirects.

### P1 SkyeMusicNexus Artist Apps

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/artist-apps`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.artist-apps/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/skyemusicnexus-artist-apps-gray-local/receipt.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/artist-apps   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-artist-apps   --workspace musicnexus-artist-apps   --host skyenet.artist-apps   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Artist Network 20260524122314

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/artist-network-20260524122314`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.artist-network-20260524122314/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/artist-network-20260524122314   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-artist-network-20260524122314   --workspace musicnexus-artist-network-20260524122314   --host skyenet.artist-network-20260524122314   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Artist Network 20260524122637

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/artist-network-20260524122637`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.artist-network-20260524122637/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/artist-network-20260524122637   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-artist-network-20260524122637   --workspace musicnexus-artist-network-20260524122637   --host skyenet.artist-network-20260524122637   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Dj Ajay

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/dj-ajay`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.dj-ajay/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/dj-ajay   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-dj-ajay   --workspace musicnexus-dj-ajay   --host skyenet.dj-ajay   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Gray Skyes

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.gray-skyes/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-gray-skyes   --workspace musicnexus-gray-skyes   --host skyenet.gray-skyes   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Gray Skyes Brain

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes-brain`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.gray-skyes-brain/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes-brain   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-gray-skyes-brain   --workspace musicnexus-gray-skyes-brain   --host skyenet.gray-skyes-brain   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Gray Skyes Collective

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes-collective`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.gray-skyes-collective/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes-collective   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-gray-skyes-collective   --workspace musicnexus-gray-skyes-collective   --host skyenet.gray-skyes-collective   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Jessica Walsh

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/jessica-walsh`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.jessica-walsh/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/jessica-walsh   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-jessica-walsh   --workspace musicnexus-jessica-walsh   --host skyenet.jessica-walsh   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Local Artists

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/local-artists`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.local-artists/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/local-artists   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-local-artists   --workspace musicnexus-local-artists   --host skyenet.local-artists   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Music 4u

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/music-4u`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.music-4u/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/reflection-and-collective-drops/skyemusicnexus-music4u-samir-gray-proof-latest.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/music-4u   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-music-4u   --workspace musicnexus-music-4u   --host skyenet.music-4u   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus NexusArtistPrimePackage

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/NexusArtistPrimePackage`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.NexusArtistPrimePackage/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/NexusArtistPrimePackage   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-NexusArtistPrimePackage   --workspace musicnexus-NexusArtistPrimePackage   --host skyenet.NexusArtistPrimePackage   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Radio Vibez

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/radio-vibez`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.radio-vibez/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/radio-vibez   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-radio-vibez   --workspace musicnexus-radio-vibez   --host skyenet.radio-vibez   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Reflection

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/reflection`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.reflection/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/reflection   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-reflection   --workspace musicnexus-reflection   --host skyenet.reflection   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Sam Smith

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/sam-smith`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.sam-smith/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/sam-smith   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-sam-smith   --workspace musicnexus-sam-smith   --host skyenet.sam-smith   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Smoke Artist Mpku77m6

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/smoke-artist-mpku77m6`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.smoke-artist-mpku77m6/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/smoke-artist-mpku77m6   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-smoke-artist-mpku77m6   --workspace musicnexus-smoke-artist-mpku77m6   --host skyenet.smoke-artist-mpku77m6   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Smoke Artist Mpku84sm

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/smoke-artist-mpku84sm`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.smoke-artist-mpku84sm/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/smoke-artist-mpku84sm   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-smoke-artist-mpku84sm   --workspace musicnexus-smoke-artist-mpku84sm   --host skyenet.smoke-artist-mpku84sm   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Supaboy

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/supaboy`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.supaboy/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-artist-room-proof-http-smoke.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-artist-room-proof-manifest.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-artist-room-proof-receipt.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-artist-world-http-smoke.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-artist-world-manifest.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-artist-world-receipt.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-browser-fix-http-smoke.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-browser-fix-manifest.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-browser-fix-receipt.json`, `test-artifacts/cloudflare-pages/skye-music-nexus-supaboy-browser-proof-final-http-smoke.json`
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/supaboy   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-supaboy   --workspace musicnexus-supaboy   --host skyenet.supaboy   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus Tha Stoves

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/tha-stoves`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.tha-stoves/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/tha-stoves   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-tha-stoves   --workspace musicnexus-tha-stoves   --host skyenet.tha-stoves   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

### P1 SkyeMusicNexus William Parker

- Lane: `musicnexus-artist-storefront`
- Build: `metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/william-parker`
- Source root: `metraiyux_0s_site/SkyeMusicNexus`
- Target: `https://skyenet.william-parker/`
- 0S Worker staged: no
- Stale deploy target: no
- Linked receipts: none yet
- Deploy: `npm run skyenet:deploy --   --api https://skyenet.graylondonskyes.workers.dev/api/skyenet   --dir metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/william-parker   --source-root metraiyux_0s_site/SkyeMusicNexus   --project musicnexus-william-parker   --workspace musicnexus-william-parker   --host skyenet.william-parker   --mount /   --url-mode subdomain   --public   --concurrency 4`
- Notes: Artist/customer storefront. Deploy through SkyeNet with source custody; 0S MusicNexus keeps owner command and gated operations.

## Review/Hold Surfaces

- HOLD `musicnexus-artist-full-matrix-20260523053627` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260523053627/`; staged by 0S: no
- HOLD `musicnexus-artist-full-matrix-20260523060758` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260523060758/`; staged by 0S: no
- HOLD `musicnexus-artist-full-matrix-20260523061022` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260523061022/`; staged by 0S: no
- HOLD `musicnexus-artist-full-matrix-20260523062114` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260523062114/`; staged by 0S: no
- HOLD `musicnexus-artist-full-matrix-20260523062856` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260523062856/`; staged by 0S: no
- HOLD `musicnexus-artist-full-matrix-20260524085129` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260524085129/`; staged by 0S: no
- HOLD `musicnexus-artist-full-matrix-20260524113514` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-full-matrix-20260524113514/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523052115` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523052115/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523052538` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523052538/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523052844` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523052844/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523053620` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523053620/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523060751` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523060751/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523061012` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523061012/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523062106` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523062106/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260523062845` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260523062845/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260524085059` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260524085059/`; staged by 0S: no
- HOLD `musicnexus-artist-live-browser-20260524113443` (musicnexus-generated-proof-storefront) -> `https://skyenet.graylondonskyes.workers.dev/musicnexus/artist-live-browser-20260524113443/`; staged by 0S: no
- REVIEW `free99-sovereigndocs` (free99-mounted-app-review) -> `https://skyenet.sovereigndocs/`; staged by 0S: yes
- REVIEW `free99-skyevaultpro` (free99-mounted-app-review) -> `https://skyenet.skyevaultpro/`; staged by 0S: yes
- REVIEW `free99-skyebox-authenticator` (free99-mounted-app-review) -> `https://skyenet.skyebox-authenticator/`; staged by 0S: yes
- REVIEW `free99-brandforge` (free99-mounted-app-review) -> `https://skyenet.brandforge/`; staged by 0S: yes
- REVIEW `free99-jobping` (free99-mounted-app-review) -> `https://skyenet.jobping/`; staged by 0S: yes
- REVIEW `free99-keygate13` (free99-mounted-app-review) -> `https://skyenet.keygate13/`; staged by 0S: yes
- REVIEW `free99-kaixu-codestudio` (free99-mounted-app-review) -> `https://skyenet.kaixu-codestudio/`; staged by 0S: yes
- REVIEW `free99-social-batch-factory` (free99-mounted-app-review) -> `https://skyenet.social-batch-factory/`; staged by 0S: yes
- REVIEW `free99-mydrive-offline-vault` (free99-mounted-app-review) -> `https://skyenet.mydrive-offline-vault/`; staged by 0S: yes
- REVIEW `free99-skyepics` (free99-mounted-app-review) -> `https://skyenet.skyepics/`; staged by 0S: yes
- REVIEW `free99-skyeopsconsole` (free99-mounted-app-review) -> `https://skyenet.skyeopsconsole/`; staged by 0S: yes
- REVIEW `free99-skaixu-code-evaluator` (free99-mounted-app-review) -> `https://skyenet.skaixu-code-evaluator/`; staged by 0S: yes
- REVIEW `free99-doctor-ops-personal-vault` (free99-mounted-app-review) -> `https://skyenet.doctor-ops-personal-vault/`; staged by 0S: yes
- REVIEW `free99-documorph` (free99-mounted-app-review) -> `https://skyenet.documorph/`; staged by 0S: yes
- REVIEW `free99-skyearcade` (free99-mounted-app-review) -> `https://skyenet.skyearcade/`; staged by 0S: yes
- REVIEW `free99-kaixu-storefront` (free99-mounted-app-review) -> `https://skyenet.kaixu-storefront/`; staged by 0S: yes

## Required Closeout Per Surface

- Archive current 0S/Pages/legacy surface before deletion or redirect.
- Deploy public build bundle to standalone SkyeNet.
- Upload private source package with --source-root.
- Prove route, key assets, source-download 401 without auth, and gated source download with shared owner gate.
- Update Founder Command/client records, QR targets, sitemaps, robots, JSON-LD, and cross-links.
- Redirect old 0S/legacy route only after archive and proof receipts exist.

Browser verification remains owner-handled per repo policy; this todo is for code/deploy/API/source-custody closure.

