# Stripe Product Price Catalog

Updated: 2026-05-17

This is the repo-wide sales and Stripe source-of-truth. Use this file when creating products, prices, Payment Links, checkout sessions, quote templates, and brain sales guidance.

Canonical rule: do not turn every dollar amount in the repo into a Stripe price. Valuations, operating cost estimates, financing examples, monthly spend caps, model-cost inputs, and placeholder proposal pages are not checkout products unless they are explicitly listed here as `Create in Stripe`.

Currency: USD

## Stripe Dashboard Defaults

Use these metadata keys on every Product or Price where Stripe lets you add metadata:

| Key | Value pattern |
| --- | --- |
| `source_folder` | Folder that owns the offer. |
| `source_file` | File where the price was found or approved. |
| `offer_family` | `metraiyux`, `skyemusicnexus`, `skygate`, `kaixu`, `lane_vault`, `skyecorp`, `business_command_center`, `sol_staffing`. |
| `plan_id` | Stable internal id. |
| `status` | `approved`, `approved_floor`, `quote_only`, `do_not_create`. |
| `brain_owner` | Brain that should speak to the offer first. |
| `public_url` | Public surface to send a buyer to, when available. |

Suggested statement descriptors:

| Family | Descriptor |
| --- | --- |
| MetrAIyux 0S | `METRAIYUX0S` |
| SkyeGateFS27 | `SKYEGATEFS27` |
| kAIxU | `KAIXU` |
| Skyes Over London service builds | `SKYESOVERLONDON` |
| SOL Staffing | `SOLSTAFFING` |

Tax categories vary by account configuration. Use SaaS/software for recurring access plans, professional services for setup/build work, and support/maintenance for recurring managed care. Confirm inside Stripe Tax before going live.

## Folder: `metraiyux_0s_site`

Source files:
- `metraiyux_0s_site/data/plans.json`
- `metraiyux_0s_site/saas/pricing.html`
- `metraiyux_0s_site/saas/billing.html`
- `metraiyux_0s_site/live/connectlog-relay13-operator-proof.html`
- `metraiyux_0s_site/proof/connectlog-relay13-expansion-receipt.html`
- `metraiyux_0s_site/live/skyeroutex-workforce-command.html`
- `metraiyux_0s_site/proof/skyeroutex-expansion-receipt.html`
- `metraiyux_0s_site/SkyeRouteX/PLATFORM_CONTRACT.json`
- `metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/package.json`
- `metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/README.md`
- `metraiyux_0s_site/live/houseoperations-skyebox-operator-proof.html`
- `metraiyux_0s_site/proof/houseoperations-skyebox-expansion-receipt.html`
- `metraiyux_0s_site/HouseOperations/PLATFORM_CONTRACT.json`
- `metraiyux_0s_site/live/skyeprofitconsole-profit-console.html`
- `metraiyux_0s_site/proof/skyeprofitconsole-expansion-receipt.html`
- `metraiyux_0s_site/SkyeProfitConsole/PLATFORM_TRUTH.json`
- `metraiyux_0s_site/live/skyemusicnexus-neofront.html`
- `metraiyux_0s_site/proof/skyemusicnexus-expansion-receipt.html`
- `metraiyux_0s_site/SkyeMusicNexus/PLATFORM_TRUTH.json`
- `metraiyux_0s_site/data/skyemusicnexus-pricing.json`
- `metraiyux_0s_site/live/skye-content-forge-publisher.html`
- `metraiyux_0s_site/proof/skye-content-forge-expansion-receipt.html`
- `metraiyux_0s_site/skye-content-repurposer-local/README.md`
- `metraiyux_0s_site/skye-content-repurposer-local/package.json`

Role: canonical MetrAIyux 0S client subscription plans, owner-approved SkyeRouteX workforce command lane, the held-rate HouseOperations + SkyeBox scope expansion, Free99 local/proof lanes, and SkyeMusicNexus Lite plus paid music ops tiers and drop add-ons. Standard plans are ready to create in Stripe. RouteX has a named SkyePay offer, but activation stays owner-approved until production provider proof is selected and verified. SkyeProfitConsole, SkyeMediaCenter, Skye Split Engine, Skye Content Forge, SkyeMusicNexus Lite, SkyeOpsConsole, Still2Vid Forge, MyDrive Offline Vault, SkyePics, BrandForge core, and Social Batch Factory core are Free99, meaning no charge, and still require a gate session. Free99 never includes free AI/model calls, hosted custody, provider actions, outbound sends, payment/identity providers, or white-label resale. SkyeMusicNexus Studio, Label Command, Managed Music Ops, and add-ons are paid SkyePay offers.

### Create In Stripe

| Product | Price nickname | Type | Amount | Billing | Lookup key | Metadata |
| --- | --- | --- | ---: | --- | --- | --- |
| MetrAIyux 0S - Starter Command | Starter Command monthly | Recurring | $397.00 | Monthly | `metraiyux_starter_command_monthly` | `source_folder=metraiyux_0s_site`, `plan_id=starter-command`, `offer_family=metraiyux`, `status=approved`, `brain_owner=celeste-monroe-brain`, `includes=connectlog_relay13_houseops_skyebox_skyeroutex_static_ready_content_forge_free99` |
| MetrAIyux 0S - Starter Command Setup | Starter Command setup | One-time | $1,500.00 | Once | `metraiyux_starter_command_setup` | same as above, `setup_for=starter-command` |
| MetrAIyux 0S - Growth Cabinet | Growth Cabinet monthly | Recurring | $997.00 | Monthly | `metraiyux_growth_cabinet_monthly` | `source_folder=metraiyux_0s_site`, `plan_id=growth-cabinet`, `offer_family=metraiyux`, `status=approved`, `brain_owner=celeste-monroe-brain`, `includes=connectlog_relay13_houseops_skyebox_skyeroutex_workflow_map_content_forge_free99` |
| MetrAIyux 0S - Growth Cabinet Setup | Growth Cabinet setup | One-time | $3,500.00 | Once | `metraiyux_growth_cabinet_setup` | same as above, `setup_for=growth-cabinet` |
| Agentic Growth Layer - Starter | Starter monthly | Recurring | $497.00 | Monthly | `agentic_growth_starter_monthly` | `source_folder=packages/agentic-growth-layer`, `plan_id=agentic-growth-starter`, `offer_family=agentic_growth`, `status=approved`, `owner_approval_required=true`, `brain_owner=celeste-monroe-brain`, `includes=no_domain_preview_growth_cycles_seed_keywords_competitor_mapping_static_patch_manifests` |
| Agentic Growth Layer - Starter Setup | Starter setup | One-time | $1,500.00 | Once | `agentic_growth_starter_setup` | same as above, `setup_for=agentic-growth-starter` |
| Agentic Growth Layer - Connected | Connected monthly | Recurring | $1,497.00 | Monthly | `agentic_growth_connected_monthly` | `source_folder=packages/agentic-growth-layer`, `plan_id=agentic-growth-connected`, `offer_family=agentic_growth`, `status=approved`, `owner_approval_required=true`, `brain_owner=celeste-monroe-brain`, `includes=key_gate_13th_encrypted_provider_refs_gsc_semrush_dataforseo_serp_pull_prioritized_tasks_experiment_ledger_proof_packet` |
| Agentic Growth Layer - Connected Setup | Connected setup | One-time | $3,500.00 | Once | `agentic_growth_connected_setup` | same as above, `setup_for=agentic-growth-connected` |
| Agentic Growth Layer - Operator | Operator monthly | Recurring | $2,997.00 | Monthly | `agentic_growth_operator_monthly` | `source_folder=packages/agentic-growth-layer`, `plan_id=agentic-growth-operator`, `offer_family=agentic_growth`, `status=approved`, `owner_approval_required=true`, `brain_owner=celeste-monroe-brain`, `includes=key_gate_13th_rotation_test_revoke_audit_managed_adapter_auto_apply_policy_live_browser_proof_monthly_growth_ledger` |
| Agentic Growth Layer - Operator Setup | Operator setup | One-time | $7,500.00 | Once | `agentic_growth_operator_setup` | same as above, `setup_for=agentic-growth-operator` |
| MetrAIyux 0S - RouteX Workforce Command | RouteX Workforce Command monthly | Recurring | $1,497.00 | Monthly | `metraiyux_routex_workforce_command_monthly` | `source_folder=metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0`, `plan_id=routex-workforce-command`, `offer_family=metraiyux`, `status=approved`, `owner_approval_required=true`, `brain_owner=marcus-vale-brain`, `includes=skyeroutex_v040_api_browser_proof_v83_local_runtime_content_forge_free99` |
| MetrAIyux 0S - RouteX Workforce Command Setup | RouteX Workforce Command setup | One-time | $6,500.00 | Once | `metraiyux_routex_workforce_command_setup` | same as above, `setup_for=routex-workforce-command` |
| MetrAIyux 0S - Autonomous Office | Autonomous Office monthly | Recurring | $2,497.00 | Monthly | `metraiyux_autonomous_office_monthly` | `source_folder=metraiyux_0s_site`, `plan_id=autonomous-office`, `offer_family=metraiyux`, `status=approved`, `brain_owner=celeste-monroe-brain`, `includes=connectlog_relay13_houseops_skyebox_skyeroutex_v040_handoff_content_forge_free99` |
| MetrAIyux 0S - Autonomous Office Setup | Autonomous Office setup | One-time | $7,500.00 | Once | `metraiyux_autonomous_office_setup` | same as above, `setup_for=autonomous-office` |
| MetrAIyux 0S - Enterprise | Enterprise monthly | Recurring | $3,997.00 | Monthly | `metraiyux_enterprise_monthly` | `source_folder=metraiyux_0s_site`, `plan_id=enterprise-command`, `offer_family=metraiyux`, `status=approved`, `owner_approval_required=true`, `brain_owner=celeste-monroe-brain`, `includes=managed_connectlog_relay13_houseops_skyebox_custom_skyeroutex_v040_content_forge_free99` |
| MetrAIyux 0S - Enterprise Setup | Enterprise setup | One-time | $15,000.00 | Once | `metraiyux_enterprise_setup` | same as above, `setup_for=enterprise` |
| SkyeMusicNexus Studio | Studio monthly | Recurring | $497.00 | Monthly | `skyemusicnexus_studio_monthly` | `source_folder=metraiyux_0s_site/SkyeMusicNexus`, `source_file=metraiyux_0s_site/data/skyemusicnexus-pricing.json`, `plan_id=skyemusicnexus-studio`, `offer_family=skyemusicnexus`, `status=approved_pending_sync`, `brain_owner=naomi-sterling-brain`, `gate_session_required=true` |
| SkyeMusicNexus Studio Setup | Studio setup | One-time | $1,500.00 | Once | `skyemusicnexus_studio_setup` | same as above, `setup_for=skyemusicnexus-studio` |
| SkyeMusicNexus Label Command | Label Command monthly | Recurring | $1,497.00 | Monthly | `skyemusicnexus_label_command_monthly` | `source_folder=metraiyux_0s_site/SkyeMusicNexus`, `source_file=metraiyux_0s_site/data/skyemusicnexus-pricing.json`, `plan_id=skyemusicnexus-label-command`, `offer_family=skyemusicnexus`, `status=approved_pending_sync`, `brain_owner=naomi-sterling-brain`, `gate_session_required=true` |
| SkyeMusicNexus Label Command Setup | Label Command setup | One-time | $6,500.00 | Once | `skyemusicnexus_label_command_setup` | same as above, `setup_for=skyemusicnexus-label-command` |
| SkyeMusicNexus Managed Music Ops | Managed Music Ops monthly | Recurring | $3,997.00 | Monthly | `skyemusicnexus_managed_music_ops_monthly` | `source_folder=metraiyux_0s_site/SkyeMusicNexus`, `source_file=metraiyux_0s_site/data/skyemusicnexus-pricing.json`, `plan_id=skyemusicnexus-managed-music-ops`, `offer_family=skyemusicnexus`, `status=approved_pending_sync`, `owner_approval_required=true`, `brain_owner=naomi-sterling-brain`, `gate_session_required=true` |
| SkyeMusicNexus Managed Music Ops Setup | Managed Music Ops setup | One-time | $15,000.00 | Once | `skyemusicnexus_managed_music_ops_setup` | same as above, `setup_for=skyemusicnexus-managed-music-ops` |
| SkyeMusicNexus Single Song Drop | Single Song Drop | One-time | $199.00 | Once | `skyemusicnexus_single_song_drop` | `source_folder=metraiyux_0s_site/SkyeMusicNexus`, `source_file=metraiyux_0s_site/data/skyemusicnexus-pricing.json`, `plan_id=skyemusicnexus-single-song-drop`, `offer_family=skyemusicnexus`, `status=approved_pending_sync`, `brain_owner=naomi-sterling-brain`, `gate_session_required=true` |
| SkyeMusicNexus Release Drop Plus | Release Drop Plus | One-time | $399.00 | Once | `skyemusicnexus_release_drop_plus` | same as above, `plan_id=skyemusicnexus-release-drop-plus` |
| SkyeMusicNexus EP Drop | EP Drop | One-time | $799.00 | Once | `skyemusicnexus_ep_drop` | same as above, `plan_id=skyemusicnexus-ep-drop` |
| SkyeMusicNexus Album Drop | Album Drop | One-time | $1,497.00 | Once | `skyemusicnexus_album_drop` | same as above, `plan_id=skyemusicnexus-album-drop` |
| SkyeMusicNexus Catalog Import Pack | Catalog Import Pack | One-time | $299.00 | Once | `skyemusicnexus_catalog_import_pack` | same as above, `plan_id=skyemusicnexus-catalog-import-pack` |
| SkyeMusicNexus Royalty Ledger Setup | Royalty Ledger Setup | One-time | $249.00 | Once | `skyemusicnexus_royalty_ledger_setup` | same as above, `plan_id=skyemusicnexus-royalty-ledger-setup` |
| SkyeMusicNexus Payout Review Pack | Payout Review Pack | One-time | $149.00 | Once | `skyemusicnexus_payout_review_pack` | same as above, `plan_id=skyemusicnexus-payout-review-pack` |
| SkyeMusicNexus Artist Profile Buildout | Artist Profile Buildout | One-time | $99.00 | Once | `skyemusicnexus_artist_profile_buildout` | same as above, `plan_id=skyemusicnexus-artist-profile-buildout` |
| SkyeMusicNexus Social Caption Pack | Social Caption Pack | One-time | $99.00 | Once | `skyemusicnexus_social_caption_pack` | same as above, `plan_id=skyemusicnexus-social-caption-pack` |
| SkyeMusicNexus Cover / Canvas Request | Cover / Canvas Request | One-time | $199.00 | Once | `skyemusicnexus_cover_canvas_request` | same as above, `plan_id=skyemusicnexus-cover-canvas-request` |
| SkyeMusicNexus Short-Form Clip Brief | Short-Form Clip Brief | One-time | $249.00 | Once | `skyemusicnexus_short_form_clip_brief` | same as above, `plan_id=skyemusicnexus-short-form-clip-brief` |
| SkyeMusicNexus Release Content Kit | Release Content Kit | One-time | $499.00 | Once | `skyemusicnexus_release_content_kit` | same as above, `plan_id=skyemusicnexus-release-content-kit` |
| SkyeMusicNexus Community Campaign Sprint | Community Campaign Sprint | One-time | $899.00 | Once | `skyemusicnexus_community_campaign_sprint` | same as above, `plan_id=skyemusicnexus-community-campaign-sprint` |
| SkyeMusicNexus Extra Artist Seat | Extra Artist Seat monthly | Recurring | $29.00 | Monthly | `skyemusicnexus_extra_artist_seat_monthly` | same as above, `plan_id=skyemusicnexus-extra-artist-seat` |
| SkyeMusicNexus Extra Release Pack | Extra Release Pack monthly | Recurring | $99.00 | Monthly | `skyemusicnexus_extra_release_pack_monthly` | same as above, `plan_id=skyemusicnexus-extra-release-pack` |
| SkyeMusicNexus White-Label Artist Portal | White-label portal monthly | Recurring | $197.00 | Monthly | `skyemusicnexus_white_label_artist_portal_monthly` | same as above, `plan_id=skyemusicnexus-white-label-artist-portal` |
| SkyeMusicNexus White-Label Artist Portal Setup | White-label portal setup | One-time | $997.00 | Once | `skyemusicnexus_white_label_artist_portal_setup` | same as above, `setup_for=skyemusicnexus-white-label-artist-portal` |

### Live Stripe Sync Receipt

Synced on 2026-05-17 from the root `.env` Stripe credentials into account `acct_1Seml2HEgCmnlKPJ`. Receipt: `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json`.

| Lookup key | Live Price ID | Amount | Status |
| --- | --- | ---: | --- |
| `metraiyux_starter_command_setup` | `price_1TY9TxHEgCmnlKPJ0mBR8cwZ` | $1,500.00 once | Replaced stale $997 setup price and archived the old price. |
| `metraiyux_starter_command_monthly` | `price_1TY9TyHEgCmnlKPJTl703ekt` | $397.00/mo | Replaced stale $297/mo price and archived the old price. |
| `metraiyux_growth_cabinet_setup` | `price_1TY9TzHEgCmnlKPJqXBTbH5Y` | $3,500.00 once | Replaced stale $2,500 setup price and archived the old price. |
| `metraiyux_growth_cabinet_monthly` | `price_1TY9TzHEgCmnlKPJqFm0FhAS` | $997.00/mo | Replaced stale $797/mo price and archived the old price. |
| `metraiyux_routex_workforce_command_setup` | `price_1TY9U1HEgCmnlKPJPNiPFacB` | $6,500.00 once | Created live price. |
| `metraiyux_routex_workforce_command_monthly` | `price_1TY9U1HEgCmnlKPJ8s3kF0eC` | $1,497.00/mo | Created live price. |
| `metraiyux_autonomous_office_setup` | `price_1TY9U2HEgCmnlKPJPqDe4Cqr` | $7,500.00 once | Replaced stale $5,000 setup price and archived the old price. |
| `metraiyux_autonomous_office_monthly` | `price_1TY9U2HEgCmnlKPJq5d7ccZs` | $2,497.00/mo | Replaced stale $1,997/mo price and archived the old price. |
| `metraiyux_enterprise_setup` | `price_1TY9U3HEgCmnlKPJ7ACUntvj` | $15,000.00 once | Replaced stale $10,000 setup price and archived the old price. |
| `metraiyux_enterprise_monthly` | `price_1TY9U4HEgCmnlKPJSWLllIxH` | $3,997.00/mo | Replaced stale $2,497/mo price and archived the old price. |
| `skygatefs27_managed_gate_onboarding` | `price_1TXzxUHEgCmnlKPJblNj18GS` | $12,500.00 once | Reused current live price. |
| `skygatefs27_managed_control_plane_monthly` | `price_1TXzxTHEgCmnlKPJegZKYyZH` | $1,250.00/mo | Reused current live price. |
| `skygatefs27_lane_maintenance_monthly` | `price_1TXzxVHEgCmnlKPJI2ByxaOg` | $249.00/mo | Reused current live price. |

### Quote Only

| Offer | Stripe action | Reason |
| --- | --- | --- |
| Enterprise / Government Readiness | See table above. Enterprise now has a fixed base price at $3,997/mo after the ConnectLog + Relay13, HouseOperations + SkyeBox, and SkyeRouteX expansion. Custom quotes/invoices for scope beyond the base. | |
| HouseOperations + SkyeBox as standalone managed custody | Do not create new Stripe products yet. | Added to existing MetrAIyux plan scope at held rates. Standalone pricing requires a separate managed-security custody policy and live deployment proof. |
| SkyeProfitConsole Free99 gated feature | Do not create a paid Stripe product. | Free99 means no charge. Access still requires a 0S or FS27 gate session, and runtime calls reject ungated requests. |
| Skye Split Engine Free99 gated feature | Do not create a paid Stripe product. | Free99 means no charge. Access still requires a 0S, FS27, SkyGate, or local admin gate session before app boot. It supports split rules, transactions, reports, CSV/JSON exports, backups, restore snapshots, and repair controls, but does not move money, run payroll, file taxes, or replace accounting/legal review. |
| Skye Content Forge Free99 gated feature | Do not create a paid Stripe product. | Free99 means no charge. Access still requires a 0S, FS27, SkyGate, or local admin gate session, and source scan, generation, export, scheduler, backup, and deployment routes reject ungated requests. |
| SkyeMusicNexus Lite Free99 gated feature | Do not create a paid Stripe product for Lite. | Free99 means no charge only for Lite. Access still requires a 0S, FS27, or SkyGate session, and music artist/release/workflow reads reject ungated requests. |
| SkyeOpsConsole Free99 gated feature | Do not create a paid Stripe product. | Offline operations console; no provider-cost lane. |
| Still2Vid Forge Free99 gated feature | Do not create a paid Stripe product. | Browser-local motion export from real uploaded, live-surface, open-source, or AI-receipted source assets. No provider generation is included. |
| MyDrive Offline Vault Free99 gated feature | Do not create a paid Stripe product. | Local encrypted vault only; hosted backup, recovery, sync, or custody is paid scope. |
| SkyePics Free99 gated feature | Do not create a paid Stripe product. | Local encrypted photo/OCR vault only; hosted sync or AI helper work is paid scope. |
| BrandForge Core Free99 gated feature | Do not create a paid Stripe product for core. | Local campaign intelligence is Free99; provider-backed AI generation requires a paid SkyPay/FS27 entitlement and usage receipt. |
| Social Batch Factory Core Free99 gated feature | Do not create a paid Stripe product for core. | Local batch assets, ZIPs, proof sheets, save/load, and brand kits are Free99; AI copy generation requires paid capped entitlement. |
| White-label 0S resale / branded tenant platform | Enterprise / Managed Gate or custom quote only. | Selling access as the buyer's own SaaS, branded tenant provisioning, custom portal mirroring, custom domains, or managed control-plane use is never Free99. |
| SkyeMusicNexus Provider Integration Proof Lane | Quote or owner-approved proof lane starting at $2,500. | Do not claim live distributor ingestion, DSP royalty settlement, payment movement, production identity handoff, label/legal authority, or deployed persistence until separate provider integrations are approved and proven. |
| RouteX production deployment beyond local proof | Use custom scope before activation. | v0.4.0 proves local API/browser flows; production database, storage, payment, notification, identity/compliance, route-intelligence, DNS/SSL, and live operations must be selected and verified. |
| `metraiyux_0s_site/pricing/*.html` 13-cabinet package pages | Do not create Stripe products yet. | Files explicitly say pricing is demonstrative/placeholder and must be edited before client use. |

## Folder: `Metraiyux-Marketing`

Source files:
- `Metraiyux-Marketing/index.html`
- `Metraiyux-Marketing/sell-sheet.html`
- `Metraiyux-Marketing/valuation-brief.md`

Role: public/sales explanation for the deployed MetrAIyux asset. It should point buyers back to the canonical MetrAIyux products above.

### Stripe Action

Do not create duplicate Stripe products from this folder. Create the MetrAIyux products from `metraiyux_0s_site/data/plans.json` only.

### Do Not Create

| Amount / phrase | Why not |
| --- | --- |
| `$150,000-$300,000` revised asset valuation | Valuation range, not a checkout price. |
| Build/deploy cost estimates and ARR scenarios | Forecasting material, not a buyer-facing product. |
| Any deployment requirement language | Operational explanation, not a product. |

## Folder: `metraiyux_0s_public_spectacle_site`

Role: public proof/overview site. It can link to sales surfaces, brain walls, and fit checks, but should not own pricing.

### Stripe Action

No products. Use this as a sales route into the MetrAIyux plans, SkyeGate proof surface, kAIxU, and live operating decks.

## Folder: `metraiyux_0s_444CL`

Role: white-label/client clone of MetrAIyux 0S.

### Stripe Action

Do not create duplicate products for the clone. Use the canonical MetrAIyux prices unless a client-specific quote is approved. Client deployments should carry metadata:

`source_folder=metraiyux_0s_444CL`, `offer_family=metraiyux_white_label`, `status=quote_only`, `parent_price_lookup_key=<canonical lookup key>`.

## Folder: `SkyeGateFS27`

Source files:
- `SkyeGateFS27/index.html`
- `SkyeGateFS27/netlify/functions/stripe-create-checkout.js`
- `SkyeGateFS27/pricing/pricing.json`
- `SkyeGateFS27/env.template`
- `SkyeGateFS27/env.ultimate.template`

Role: auth, usage, billing, monitor, event, and control-plane gate. The current checkout function supports one-time usage top-ups. Managed subscription pricing comes from the existing Xinth/governance offer language in the Skyes Over London service catalog.

### Create In Stripe

| Product | Price nickname | Type | Amount | Billing | Lookup key | Metadata |
| --- | --- | --- | ---: | --- | --- | --- |
| SkyeGateFS27 Usage Top-Up | Variable usage credit | One-time variable | Admin entered | Once | `skygatefs27_usage_topup_variable` | `source_folder=SkyeGateFS27`, `source_file=SkyeGateFS27/netlify/functions/stripe-create-checkout.js`, `offer_family=skygate`, `status=approved`, `brain_owner=naomi-sterling-brain` |
| SkyeGateFS27 Managed Control Plane | Managed gate operations monthly | Recurring | $1,250.00 | Monthly | `skygatefs27_managed_control_plane_monthly` | `source_folder=SkyeGateFS27`, `source_file=skyesol_current_public_site/SkyeSol/skyesol-main/Services/Lane-Vault!/index.html`, `offer_family=skygate`, `status=approved`, `brain_owner=naomi-sterling-brain` |
| SkyeGateFS27 Managed Gate Onboarding | Managed gate onboarding | One-time | $12,500.00 | Once | `skygatefs27_managed_gate_onboarding` | same as above, `setup_for=skygatefs27_managed_control_plane_monthly` |
| SkyeGateFS27 Lane Maintenance | Lane maintenance monthly | Recurring | $249.00 | Monthly per lane | `skygatefs27_lane_maintenance_monthly` | `source_folder=SkyeGateFS27`, `offer_family=skygate`, `status=approved`, `unit_label=lane` |

### Do Not Create

| Amount / field | Why not |
| --- | --- |
| `2000 = $20/month spend limit` / `DEFAULT_CUSTOMER_CAP_CENTS=2000` | This is a usage cap, not a subscription plan. |
| `SkyeGateFS27/pricing/pricing.json` model prices | Internal metering/provider cost inputs. They inform usage accounting, not public product cards by themselves. |
| Voice per-minute env values | Usage meter inputs. Convert to metered prices only after deciding markup and billing policy. |

### Subscription Path

For managed gate clients, sell the path as:

1. One-time onboarding: `skygatefs27_managed_gate_onboarding` at $12,500.
2. Monthly managed control plane: `skygatefs27_managed_control_plane_monthly` at $1,250/month.
3. Optional lane maintenance: `skygatefs27_lane_maintenance_monthly` at $249/month per lane.
4. Usage top-ups: variable one-time checkout, already supported by `stripe-create-checkout.js`.

## Folder: `skyesol_current_public_site/SkyeSol/skyesol-main/kAIxu`

Source file:
- `skyesol_current_public_site/SkyeSol/skyesol-main/kAIxu/pricing.html`

Role: kAIxU platform and usage pricing. Create the platform plans as recurring products. Create usage as metered prices only when the Stripe integration is ready to report units.

### Create Platform Plans In Stripe

| Product | Price nickname | Type | Amount | Billing | Lookup key | Metadata |
| --- | --- | --- | ---: | --- | --- | --- |
| kAIxU Starter | kAIxU Starter monthly | Recurring | $249.00 | Monthly | `kaixu_starter_monthly` | `source_folder=skyesol_current_public_site/SkyeSol/skyesol-main/kAIxu`, `offer_family=kaixu`, `status=approved`, `brain_owner=orion-hayes-brain` |
| kAIxU Team | kAIxU Team monthly | Recurring | $799.00 | Monthly | `kaixu_team_monthly` | same family, `plan_id=kaixu-team` |
| kAIxU Scale | kAIxU Scale monthly | Recurring | $1,890.00 | Monthly | `kaixu_scale_monthly` | same family, `plan_id=kaixu-scale` |

### Usage Prices To Configure As Metered Stripe Prices

Use `unit_amount_decimal` where needed. Unit label should be `1M tokens`. Create separate input and output prices so usage is auditable.

| Metered product | Direction | Amount per 1M tokens | Lookup key |
| --- | --- | ---: | --- |
| kAIxU 6.7 Flash-Lite | Input | $0.14 | `kaixu_67_flash_lite_input_1m` |
| kAIxU 6.7 Flash-Lite | Output | $0.56 | `kaixu_67_flash_lite_output_1m` |
| kAIxU 6.7 Flash | Input | $0.29 | `kaixu_67_flash_input_1m` |
| kAIxU 6.7 Flash | Output | $1.16 | `kaixu_67_flash_output_1m` |
| kAIxU 6.7 Flash Vision | Input | $0.49 | `kaixu_67_flash_vision_input_1m` |
| kAIxU 6.7 Flash Vision | Output | $1.96 | `kaixu_67_flash_vision_output_1m` |
| kAIxU 6.7 Builder | Input | $1.99 | `kaixu_67_builder_input_1m` |
| kAIxU 6.7 Builder | Output | $7.95 | `kaixu_67_builder_output_1m` |
| kAIxU 6.7 Pro | Input | $7.05 | `kaixu_67_pro_input_1m` |
| kAIxU 6.7 Pro | Output | $21.15 | `kaixu_67_pro_output_1m` |
| kAIxU 6.7 Pro Long | Input | $9.85 | `kaixu_67_pro_long_input_1m` |
| kAIxU 6.7 Pro Long | Output | $29.55 | `kaixu_67_pro_long_output_1m` |
| kAIxU 6.7 Ultra | Input | $12.69 | `kaixu_67_ultra_input_1m` |
| kAIxU 6.7 Ultra | Output | $38.07 | `kaixu_67_ultra_output_1m` |
| kAIxU 6.7 Sovereign | Input | $19.65 | `kaixu_67_sovereign_input_1m` |
| kAIxU 6.7 Sovereign | Output | $98.25 | `kaixu_67_sovereign_output_1m` |
| kAIxU 6.7 Crown | Input | $28.50 | `kaixu_67_crown_input_1m` |
| kAIxU 6.7 Crown | Output | $142.50 | `kaixu_67_crown_output_1m` |

## Folder: `skyesol_current_public_site/SkyeSol/skyesol-main/Services/Lane-Vault!`

Source files:
- `Services/Lane-Vault!/index.html`
- Individual lane pages in the same folder

Role: productized business lane builds with base pricing and 20 percent down financing language.

### Create Full Build Products In Stripe

| Product | Type | Base amount | 20 percent down reference | Lookup key |
| --- | --- | ---: | ---: | --- |
| Lane Vault - Intake Lane | One-time | $9,500.00 | $1,900.00 | `lane_vault_intake_lane_build` |
| Lane Vault - Front Office Lane | One-time | $12,500.00 | $2,500.00 | `lane_vault_front_office_lane_build` |
| Lane Vault - Delivery Lane | One-time | $18,500.00 | $3,700.00 | `lane_vault_delivery_lane_build` |
| Lane Vault - Client Portal Lane | One-time | $14,500.00 | $2,900.00 | `lane_vault_client_portal_lane_build` |
| Lane Vault - Contractor Lane | One-time | $16,500.00 | $3,300.00 | `lane_vault_contractor_lane_build` |
| Lane Vault - Reporting Lane | One-time | $13,500.00 | $2,700.00 | `lane_vault_reporting_lane_build` |
| Lane Vault - Scheduling Lane | One-time | $11,500.00 | $2,300.00 | `lane_vault_scheduling_lane_build` |
| Lane Vault - Inventory Lane | One-time | $17,500.00 | $3,500.00 | `lane_vault_inventory_lane_build` |
| Lane Vault - Billing Lane | One-time | $19,500.00 | $3,900.00 | `lane_vault_billing_lane_build` |
| Lane Vault - HR Onboarding Lane | One-time | $16,500.00 | $3,300.00 | `lane_vault_hr_onboarding_lane_build` |
| Lane Vault - Support Lane | One-time | $15,500.00 | $3,100.00 | `lane_vault_support_lane_build` |
| Lane Vault - Compliance Vault Lane | One-time | $22,500.00 | $4,500.00 | `lane_vault_compliance_vault_lane_build` |

Metadata for all lane products:

`source_folder=skyesol_current_public_site/SkyeSol/skyesol-main/Services/Lane-Vault!`, `offer_family=lane_vault`, `status=approved`, `brain_owner=celeste-monroe-brain`.

### Create Add-On Products In Stripe

| Product | Type | Amount | Billing | Lookup key |
| --- | --- | ---: | --- | --- |
| kAIxU Powered Lane Upgrade | One-time | $7,500.00 | Once per lane | `lane_vault_kaixu_powered_upgrade_setup` |
| Xinth Governance and Billing Onboarding | One-time | $12,500.00 | Once | `xinth_governance_billing_onboarding` |
| Xinth Governance Platform Access | Recurring | $1,250.00 | Monthly | `xinth_governance_platform_monthly` |
| Lane Vault Maintenance Plan | Recurring | $249.00 | Monthly per lane | `lane_vault_maintenance_monthly_per_lane` |

### Quote Only

The monthly financing examples on lane pages are not subscription products. They are payment plan examples for the remaining 80 percent after a down payment. Use Stripe Quotes/Invoicing or a financing provider if you want to offer those terms.

## Folder: `skyesol_current_public_site/SkyeSol/skyesol-main/Services/SkyeCorp/Phase1`

Source file:
- `Services/SkyeCorp/Phase1/index.html`

Role: embedded kAIxU task-agent build offers. These are base build prices with 20 percent down language.

### Create In Stripe When Actively Selling This Catalog

| Product | Type | Base amount | 20 percent down reference | Lookup key |
| --- | --- | ---: | ---: | --- |
| kAIxU OpsDesk Agent Suite | One-time | $28,500.00 | $5,700.00 | `skyecorp_phase1_opsdesk_agent_suite_build` |
| kAIxU Sales Follow-Up Agent | One-time | $19,500.00 | $3,900.00 | `skyecorp_phase1_sales_followup_agent_build` |
| kAIxU FinanceGuard Agent | One-time | $22,500.00 | $4,500.00 | `skyecorp_phase1_financeguard_agent_build` |
| kAIxU SupportCopilot Agent | One-time | $24,500.00 | $4,900.00 | `skyecorp_phase1_supportcopilot_agent_build` |
| kAIxU Hiring and Onboarding Agent | One-time | $18,500.00 | $3,700.00 | `skyecorp_phase1_hiring_onboarding_agent_build` |
| kAIxU Compliance and Audit Agent | One-time | $32,500.00 | $6,500.00 | `skyecorp_phase1_compliance_audit_agent_build` |

Metadata:

`source_folder=skyesol_current_public_site/SkyeSol/skyesol-main/Services/SkyeCorp/Phase1`, `offer_family=skyecorp`, `status=approved`, `brain_owner=orion-hayes-brain`.

## Folder: `skyesol_current_public_site/SkyeSol/skyesol-main/Services/SkyeCorp/0megaPhase`

Source files:
- `Services/SkyeCorp/0megaPhase/index.html`
- Individual pack pages in the same folder

Role: larger packaged operating-system builds. Create as one-time build products only when this catalog is actively being sold.

### Create In Stripe

| Product | Type | Base amount | 20 percent down reference | Lookup key |
| --- | --- | ---: | ---: | --- |
| 0megaPhase Pack 01 - SMB Company OS | One-time | $35,000.00 | $7,000.00 | `omegaphase_pack_01_smb_company_os_build` |
| 0megaPhase Pack 02 - Field Service Ops | One-time | $55,000.00 | $11,000.00 | `omegaphase_pack_02_field_service_ops_build` |
| 0megaPhase Pack 03 - Property Management Maintenance Ops | One-time | $60,000.00 | $12,000.00 | `omegaphase_pack_03_property_mgmt_ops_build` |
| 0megaPhase Pack 04 - Contact Center Support Ops | One-time | $40,000.00 | $8,000.00 | `omegaphase_pack_04_contact_center_support_ops_build` |
| 0megaPhase Pack 05 - Compliance Proof Trust Center | One-time | $65,000.00 | $13,000.00 | `omegaphase_pack_05_compliance_proof_trust_center_build` |
| 0megaPhase Pack 06 - Identity Access Governance | One-time | $45,000.00 | $9,000.00 | `omegaphase_pack_06_identity_access_governance_build` |
| 0megaPhase Pack 07 - Creator Agency Ops | One-time | $50,000.00 | $10,000.00 | `omegaphase_pack_07_creator_agency_ops_build` |
| 0megaPhase Pack 08 - Public Sector Requests Portal | One-time | $70,000.00 | $14,000.00 | `omegaphase_pack_08_public_sector_requests_portal_build` |
| 0megaPhase Pack 09 - Healthcare Adjacent Ops | One-time | $58,000.00 | $11,600.00 | `omegaphase_pack_09_healthcare_adjacent_ops_build` |
| 0megaPhase Pack 10 - Legal Intake Case Flow | One-time | $75,000.00 | $15,000.00 | `omegaphase_pack_10_legal_intake_case_flow_build` |
| 0megaPhase Pack 11 - Insurance Adjuster Claims Ops | One-time | $80,000.00 | $16,000.00 | `omegaphase_pack_11_insurance_adjuster_claims_ops_build` |
| 0megaPhase Pack 12 - Franchise Multi-Location OS | One-time | $120,000.00 | $24,000.00 | `omegaphase_pack_12_franchise_multi_location_os_build` |
| 0megaPhase Pack 13 - Logistics Fleet Dispatch Ops | One-time | $95,000.00 | $19,000.00 | `omegaphase_pack_13_logistics_fleet_dispatch_ops_build` |
| 0megaPhase Pack 14 - Retail DTC Brand Operations | One-time | $85,000.00 | $17,000.00 | `omegaphase_pack_14_retail_dtc_brand_ops_build` |
| 0megaPhase Pack 15 - Task Agents Inside Business Apps | One-time | $35,000.00 | $7,000.00 | `omegaphase_pack_15_task_agents_business_apps_build` |

Metadata:

`source_folder=skyesol_current_public_site/SkyeSol/skyesol-main/Services/SkyeCorp/0megaPhase`, `offer_family=skyecorp`, `status=approved`, `brain_owner=orion-hayes-brain`.

Use the same kAIxU/Xinth add-ons from the Lane Vault section where applicable.

## Folder: `skye-business-command-center`

Source files:
- `skye-business-command-center/docs/SALES_OFFER_PACK.md`
- `skye-business-command-center/docs/COSTS.md`
- `skye-business-command-center/docs/CLIENT_PROPOSAL_TEMPLATE.md`
- `skye-business-command-center/templates/invoices/service-packages.md`

Role: white-label business command center for small businesses.

Operating cost note from repo: serious single-client production is estimated at $60-$120/month before your labor, margin, support, and payment fees. Shared early infrastructure is estimated at $30-$75/month, but isolation risk rises when multiple paying businesses share a stack.

### Create In Stripe

| Product | Price nickname | Type | Amount | Billing | Lookup key | Metadata |
| --- | --- | --- | ---: | --- | --- | --- |
| Skye Business Command Center - Starter Ops Portal Setup | Starter setup | One-time | $497.00 | Once | `sbcc_starter_ops_portal_setup` | `source_folder=skye-business-command-center`, `offer_family=business_command_center`, `status=approved`, `brain_owner=celeste-monroe-brain` |
| Skye Business Command Center - Starter Hosting and Support | Starter monthly | Recurring | $99.00 | Monthly | `sbcc_starter_hosting_support_monthly` | same family, `plan_id=starter-ops-portal` |
| Skye Business Command Center - Business Setup | Business setup | One-time | $997.00 | Once | `sbcc_business_command_center_setup` | same family, `plan_id=business-command-center` |
| Skye Business Command Center - Business Monthly Support | Business monthly | Recurring | $199.00 | Monthly | `sbcc_business_monthly_support` | same family, `plan_id=business-command-center` |
| Skye Business Command Center - Ops Pro Setup Floor | Ops Pro setup floor | One-time | $1,997.00 | Once | `sbcc_ops_pro_setup_floor` | `status=approved_floor`, `plan_id=ops-pro` |
| Skye Business Command Center - Ops Pro Monthly Floor | Ops Pro monthly floor | Recurring | $399.00 | Monthly | `sbcc_ops_pro_monthly_floor` | `status=approved_floor`, `plan_id=ops-pro` |
| Skye Business Command Center - Dedicated Instance Setup Floor | Dedicated setup floor | One-time | $3,500.00 | Once | `sbcc_dedicated_instance_setup_floor` | `status=approved_floor`, `plan_id=dedicated-instance` |
| Skye Business Command Center - Dedicated Instance Monthly Floor | Dedicated monthly floor | Recurring | $750.00 | Monthly | `sbcc_dedicated_instance_monthly_floor` | `status=approved_floor`, `plan_id=dedicated-instance` |

### Quote Only

Custom workflow buildout, data migration, emergency recovery, and any price above the floor should be handled by Stripe Quote or invoice.

## Folder: `SOL-Staffing-Marketing`

Source files:
- `SOL-Staffing-Marketing/index.html`
- `SOL-Staffing-Marketing/white-label.html`
- `SOL-Staffing-Marketing/valuation-brief.md`

Role: sales site and white-label offer for staffing operations.

### Create In Stripe

| Product | Price nickname | Type | Amount | Billing | Lookup key | Metadata |
| --- | --- | --- | ---: | --- | --- | --- |
| SOL Staffing OS - Direct Launch Site | Direct launch site | One-time | $2,500.00 | Once | `sol_staffing_direct_launch_site` | `source_folder=SOL-Staffing-Marketing`, `offer_family=sol_staffing`, `status=approved`, `brain_owner=celeste-monroe-brain` |
| SOL Staffing OS - Direct Live Staffing OS | Direct live staffing OS | One-time | $7,500.00 | Once | `sol_staffing_direct_live_staffing_os` | same family |
| SOL Staffing OS - Operator Command | Operator command monthly | Recurring | $1,500.00 | Monthly | `sol_staffing_operator_command_monthly` | same family |
| SOL Staffing OS - White-Label Launch Package | White-label launch package setup | One-time | $3,500.00 | Once | `sol_staffing_white_label_launch_package_setup` | `source_folder=SOL-Staffing-Marketing`, `source_file=SOL-Staffing-Marketing/white-label.html`, `offer_family=sol_staffing`, `status=approved` |
| SOL Staffing OS - White-Label Live OS Package | White-label live OS package setup | One-time | $8,500.00 | Once | `sol_staffing_white_label_live_os_package_setup` | same family |
| SOL Staffing OS - Managed Support | Managed support monthly | Recurring | $1,500.00 | Monthly | `sol_staffing_managed_support_monthly` | same family |

### Do Not Create

Valuation ranges and "suggested sales packages" in `valuation-brief.md` are guidance, not fixed checkout products.

## Folder: `metraiyux_0s_site/live/sol_staffing_agency_site`

Source files:
- `metraiyux_0s_site/live/sol_staffing_agency_site/pricing.html`
- `metraiyux_0s_site/live/sol_staffing_agency_site/bill-rate-calculator-notes.md`

Role: current staffing website. It intentionally avoids hardcoded staffing rates.

### Stripe Action

Do not create fixed staffing rate products from this folder. It says exact pricing depends on role type, market, pay rate, urgency, compliance requirements, volume, risk, and contract terms. Use quote requests, proposals, and client agreements.

The bill-rate calculator formula is an estimator:

`Loaded Cost = Pay Rate x (1 + Burden %)`.

`Bill Rate = Loaded Cost / (1 - Gross Margin %)`.

This is not final pricing.

## Phantom Price Cleanup List

Treat these as non-checkout amounts unless a future edit explicitly promotes them into this catalog:

| Folder / file | Amounts | Status |
| --- | --- | --- |
| `Metraiyux-Marketing/valuation-brief.md` | Asset valuation, build cost estimates, ARR projections | Do not create |
| `metraiyux_0s_site/pricing/*.html` | Demonstrative 13-cabinet pricing placeholders | Do not create |
| `SkyeGateFS27/index.html` and env templates | `$20/month` default cap | Do not create |
| `SkyeGateFS27/pricing/pricing.json` | Provider/model token costs | Internal metering only |
| `SkyeGateFS27/env.ultimate.template` | Voice per-minute cost inputs | Internal metering until markup approved |
| Lane Vault and SkyeCorp pages | 12/24/36 month example payments after down payment | Financing examples only |
| `SOL-Staffing-Marketing/valuation-brief.md` | Suggested ranges | Quote guidance only |
| `metraiyux_0s_site/live/sol_staffing_agency_site` | Staffing engagement models and calculator outputs | Quote only |

## Brain Sales Rules

The brains should sell from `metraiyux_0s_site/brain/sales-offer-registry.json`, which mirrors this catalog in machine-readable form.

### Live Stripe Sync Receipt

Latest live sync: `2026-05-21T13:37:40.139Z`, account `acct_1Seml2HEgCmnlKPJ`, receipt `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json`.

Agentic Growth live prices:

| Plan | Setup price ID | Monthly price ID |
| --- | --- | --- |
| `agentic-growth-starter` | `price_1TZWmeHEgCmnlKPJxg9u4y0t` | `price_1TZWmeHEgCmnlKPJ7pVJ9ZRo` |
| `agentic-growth-connected` | `price_1TZWmfHEgCmnlKPJShJ6WPP9` | `price_1TZWmgHEgCmnlKPJSoEeldWf` |
| `agentic-growth-operator` | `price_1TZWmhHEgCmnlKPJ4C9Kzply` | `price_1TZWmhHEgCmnlKPJYbktfFeU` |

Rules:

1. If `status=approved`, the brain may quote the exact price and route to checkout/proposal.
2. If `status=approved_floor`, the brain may say "starts at" and should recommend a scoped quote before charging more.
3. If `status=quote_only`, the brain must ask discovery questions and route to proposal/quote.
4. If `status=do_not_create`, the brain must not present the amount as a price.
5. No brain should invent discounts, guarantees, payment terms, or Stripe links.
