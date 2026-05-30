
const HOMEPAGE_SURFACE_INDEX = [
  { group: 'Core 0S', title: '0S Launcher', href: '0s/index.html', text: 'Desktop shell, command palette, app atlas, surface search, windows, dock, terminal, and command registry.' },
  { group: 'Core 0S', title: '0s SkyeWay', href: 'skyeway.html', text: 'Primary guided wayfinding route for the 0S platform.' },
  { group: 'Core 0S', title: 'Auren', href: 'Auren/index.html', text: 'Central intelligence and operator-facing app lane.' },
  { group: 'Core 0S', title: 'Admin OS', href: 'admin/index.html', text: 'Owner-admin command, automation, approval, security, and tutorial rooms.' },
  { group: 'Core 0S', title: 'SkyeVault Command Center', href: 'admin/skyevault-command-center.html', text: 'FS27-authenticated receipt custody, signed vault downloads, audit events, exports, and SkyeSecure secret-pack handoff.' },
  { group: 'Core 0S', title: 'Operator Center', href: 'operator/index.html', text: 'Operator control lane for the platform.' },
  { group: 'Core 0S', title: 'Cabinet Brain', href: 'local-brain.html', text: 'Private cabinet knowledge assistant and company corpus search.' },
  { group: 'Core 0S', title: 'Neural Map', href: 'neural-map.html', text: 'Public-safe route map for brains, proof, production, and sales paths.' },
  { group: 'Core 0S', title: 'Walkthroughs', href: 'walkthroughs/index.html', text: 'Guided walkthroughs for buyers, operators, admins, and client-facing routes.' },
  { group: 'Core 0S', title: 'Ecosystem Map', href: 'ecosystem.html', text: 'Mapped 0S ecosystem, proof rooms, platform lanes, and Skye network links.' },
  { group: 'Core 0S', title: 'Platform Ledger', href: 'operator/platform-integration-ledger.html', text: 'App and platform accounting ledger for routes, catalog groups, and proof commands.' },
  { group: 'Core 0S', title: 'Customer SaaS', href: 'saas/index.html', text: 'Customer-facing SaaS entry, onboarding, workspace, billing intent, and service selection.' },
  { group: 'Core 0S', title: 'Customer Portal', href: 'saas/customer-dashboard.html', text: 'Customer workspace and dashboard path.' },
  { group: 'Core 0S', title: 'Pricing', href: 'pricing/index.html', text: '0S offers, SaaS plans, and price-card routing.' },
  { group: 'Core 0S', title: 'SkyeMerit', href: 'saas/skyemerit.html', text: 'Protected first-time merit wallet with capped discount math and owner approval boundaries.' },
  { group: 'Core 0S', title: 'SkyePay Store', href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s', text: 'FS27 storefront for approved 0S offers, RouteX, vault access, SkyeCard usage, and music add-ons.' },
  { group: 'Core 0S', title: '0S Gate Signup', href: 'gate/signup/', text: 'Canonical 0S signup with Skye ID, SkyEmail claim, phone, profile, Gate session, and SkyEmail platform binding.' },
  { group: 'Core 0S', title: 'SkyeMail', href: 'live/SkyeMail/index.html', text: 'Gate-bound SkyEmail platform home with inbox, compose, contacts, settings, proof, pricing, and generator routes.' },
  { group: 'Core 0S', title: 'SkyEmail Generator', href: 'skyegate/source/SkyeGateFS27/generators/SKYEMAIL-GEN/index.html', text: 'SkyEmail generator for artist, client, operator, and 0S identity onboarding.' },
  { group: 'Core 0S', title: 'Skye ID Generator', href: 'skyegate/source/SkyeGateFS27/generators/Skye-ID/index.html', text: 'Shared Skye ID generator for artist identity, profile photo, and cross-app 0S account handoff.' },
  { group: 'Business Network', title: 'Valley Verified', href: 'valley-verified/', text: 'Business discovery network and local app-build proof lane.' },
  { group: 'Business Network', title: "Bob's Smoke Shop", href: 'valley-verified/business/bobs-smoke-shop-litchfield-park/', text: 'Valley Verified business profile and local app-build example.' },
  { group: 'Business Network', title: 'Empire Pallets', href: 'valley-verified/business/empire-pallets-phoenix/', text: 'Valley Verified business profile and B2B app-build example.' },

  { group: 'Platform Apps', title: 'SkyeMusicNexus', href: 'SkyeMusicNexus/index.html', text: 'Music platform shell with artist, release, feed, DAW, upload, player, rights, exchange, payout, and operations rooms.' },
  { group: 'Platform Apps', title: 'SkyeMusicNexus Artist Stage', href: 'SkyeMusicNexus/public/index.html', text: 'Artist registration, release forge, content requests, community signals, achievements, campaign packs, royalty motion, and records.' },
  { group: 'Platform Apps', title: 'SkyeMusicNexus Operator Stage', href: 'SkyeMusicNexus/public/admin.html', text: 'Operator controls for review, publishing, exchange console, payout, analytics, workflow, and capsule-wall proof.' },
  { group: 'Platform Apps', title: 'Music DAW', href: 'SkyeMusicNexus/public/daw.html', text: 'Audio import, keyboard notes, pads, tracks, mixer, and release-packet handoff.' },
  { group: 'Platform Apps', title: 'Music Upload', href: 'SkyeMusicNexus/public/upload.html', text: 'Upload studio for music assets and release material.' },
  { group: 'Platform Apps', title: 'Music Drops', href: 'SkyeMusicNexus/public/drops.html', text: 'Single, album, campaign, private delivery, approval queue, and publish batching room.' },
  { group: 'Platform Apps', title: 'Music Releases', href: 'SkyeMusicNexus/public/releases.html', text: 'Release records and music publishing route.' },
  { group: 'Platform Apps', title: 'Music Rights', href: 'SkyeMusicNexus/public/rights.html', text: 'Rights and royalty routing for music operations.' },
  { group: 'Platform Apps', title: 'Music Exchange', href: 'SkyeMusicNexus/public/exchange.html', text: 'Content request exchange and collaboration route.' },
  { group: 'Platform Apps', title: 'Music Feed', href: 'SkyeMusicNexus/public/feed.html', text: 'Artist social surface with posts, drops, reactions, community relay, achievements, and campaign signals.' },
  { group: 'Platform Apps', title: 'Music Discover', href: 'SkyeMusicNexus/public/discover.html', text: 'Listener-facing discovery graph, playlist rails, release lanes, previews, and player routing.' },
  { group: 'Platform Apps', title: 'Music Player', href: 'SkyeMusicNexus/public/player.html', text: 'Music playback surface.' },
  { group: 'Platform Apps', title: 'Music Exports', href: 'SkyeMusicNexus/public/exports.html', text: 'Export room for music records and handoff packets.' },
  { group: 'Platform Apps', title: 'SkyeRouteX', href: 'SkyeRouteX/index.html', text: 'V83 workforce command shell with dashboard, routes, stops, proof, analytics, runtime, and settings.' },
  { group: 'Platform Apps', title: 'SkyeRouteX v0.4 Platform', href: 'SkyeRouteX/workforce-command-v0.4.0/index.html', text: 'Runtime-safe workforce command platform hub.' },
  { group: 'Platform Apps', title: 'SkyeRouteX API Command UI', href: 'SkyeRouteX/workforce-command-v0.4.0/public/index.html', text: 'Provider jobs, contractor boards, assignments, route stops, proof, payments, exports, and audit panels.' },
  { group: 'Platform Apps', title: 'SkyeProfitConsole', href: 'SkyeProfitConsole/index.html', text: 'Profit packs, fastest-cash ranking, close briefs, margin simulation, proof events, exports, and runtime sync.' },
  { group: 'Platform Apps', title: 'SkyeProfitConsole App Room', href: 'SkyeProfitConsole/app.html', text: 'Profit console app room.' },
  { group: 'Platform Apps', title: 'SkyeProfitConsole Runtime', href: 'SkyeProfitConsole/runtime.html', text: 'Runtime mode and gate-session proof lane.' },
  { group: 'Platform Apps', title: 'SkyeMediaCenter', href: 'SkyeMediaCenter/index.html', text: 'Media nerve for signal atlas, workflow reactor, vault loom, runtime spine, proof forge, and control core.' },
  { group: 'Platform Apps', title: 'Asset Drop Reactor', href: 'SkyeMediaCenter/public/index.html', text: 'Media intake portal for upload, tags, status, and recent asset rendering.' },
  { group: 'Platform Apps', title: 'Media Operator Theater', href: 'SkyeMediaCenter/public/admin.html', text: 'Media review, execution, dispatch, publishing, search, and workflow timeline.' },
  { group: 'Platform Apps', title: 'Client App Factory', href: 'client-app-factory/', text: 'Valley client app foundry with source, brand, media, build, QA, payment, and Still2Vid media handoff lanes.' },
  { group: 'Platform Apps', title: 'Skye Split Engine', href: 'SkyeSplitEngine/index.html', text: 'Commission and payout split command center with rules, ledger, reports, exports, backups, restore, and repair controls.' },
  { group: 'Platform Apps', title: 'HouseOperations', href: 'HouseOperations/index.html', text: 'House command workspace with tasks, vendors, schedule, alerts, assignments, and proof controls.' },
  { group: 'Platform Apps', title: 'Canonical SkyeBox Authenticator', href: 'Free99/apps/skyebox-authenticator/index.html', text: 'Single encrypted authenticator vault with WebCrypto proof, backup import/export, idle lock, and PWA install support.' },
  { group: 'Platform Apps', title: 'Skye Content Forge Hub', href: 'live/skye-content-forge-publisher.html', text: 'Content command lane for approved source scan, original generation, drafts, export, scheduler, backup, and deployment hooks.' },
  { group: 'Platform Apps', title: 'ConnectLog App', href: 'connectlog-v7.7-relay13-operator-proof/app.html', text: 'Private relationship workspace, QR exchange, relationship intelligence, seed imports, follow-up, and Relay13 bridge panel.' },
  { group: 'Platform Apps', title: 'Relay13 Preview', href: 'relay13-core-v1.7-connectlog-operator-proof/public/index.html', text: 'Messaging platform surface, operator console, worker proof routes, request ledgers, and activation proof.' },
  { group: 'Platform Apps', title: 'Relay13 Inbox', href: 'connectlog-v7.7-relay13-operator-proof/relay13-inbox.html', text: 'Relay13 inbox and message operations.' },
  { group: 'Platform Apps', title: 'Relay13 Proof', href: 'connectlog-v7.7-relay13-operator-proof/relay13-proof.html', text: 'Relay13 proof room.' },

  { group: 'Marketing Made Easy', title: 'Marketing Made Easy Suite', href: 'Marketing-Made-Easy/index.html', text: 'Growth-suite index for AE flow, brand identity, launch packs, document editing, web creation, growth ops, Arizona intelligence, and kAIxU brand kits.' },
  { group: 'Marketing Made Easy', title: 'AE-FlowPro', href: 'Marketing-Made-Easy/AE-FlowPro/index.html', text: 'Lead flow, offer queue, follow-up rail, AE proof, close path, recovery journal, backup snapshots, and activation packs.' },
  { group: 'Marketing Made Easy', title: 'BrandID Offline PWA', href: 'Marketing-Made-Easy/BrandID-Offline-PWA/index.html', text: 'Offline-first brand identity generator, SVG export, PWA install shell, outbox controls, and handoff packets.' },
  { group: 'Marketing Made Easy', title: 'BusinessLaunchGo', href: 'Marketing-Made-Easy/BusinessLaunchGo/index.html', text: 'Arizona launch pack generator, browser-local launch packs, PDF/ZIP export, form markup, hooks, and runtime records.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax', href: 'Marketing-Made-Easy/SkyeDocxMax/index.html', text: 'Offline-first private document editor, encrypted document vault, local packages, journal, draft recovery, and static PWA proof.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax Editor', href: 'Marketing-Made-Easy/SkyeDocxMax/editor.html', text: 'Direct document editor room.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax Documents', href: 'Marketing-Made-Easy/SkyeDocxMax/documents.html', text: 'Document library and document-control route.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax Templates', href: 'Marketing-Made-Easy/SkyeDocxMax/templates.html', text: 'Template room for document generation.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax Exports', href: 'Marketing-Made-Easy/SkyeDocxMax/exports.html', text: 'Document export route.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax Packages', href: 'Marketing-Made-Easy/SkyeDocxMax/packages.html', text: 'Local package import/export route.' },
  { group: 'Marketing Made Easy', title: 'SkyeDocxMax Settings', href: 'Marketing-Made-Easy/SkyeDocxMax/settings.html', text: 'Document app settings.' },
  { group: 'Marketing Made Easy', title: 'SkyeWebCreatorMax', href: 'Marketing-Made-Easy/SkyeWebCreatorMax/index.html', text: 'Website, UI, app-shell, and 3D web creation surface.' },
  { group: 'Marketing Made Easy', title: 'SkyeWebCreatorMax Builder', href: 'Marketing-Made-Easy/SkyeWebCreatorMax/builder.html', text: 'Direct site and app builder room.' },
  { group: 'Marketing Made Easy', title: 'SkyeWebCreatorMax Workspace', href: 'Marketing-Made-Easy/SkyeWebCreatorMax/builder-workspace.html', text: 'Builder workspace with briefs, previews, and delivery context.' },
  { group: 'Marketing Made Easy', title: 'SkyeWebCreatorMax Templates', href: 'Marketing-Made-Easy/SkyeWebCreatorMax/templates.html', text: 'Template library for web creation.' },
  { group: 'Marketing Made Easy', title: 'SkyeWebCreatorMax Preview', href: 'Marketing-Made-Easy/SkyeWebCreatorMax/preview.html', text: 'Preview room for generated sites.' },
  { group: 'Marketing Made Easy', title: 'SkyeWebCreatorMax Delivery', href: 'Marketing-Made-Easy/SkyeWebCreatorMax/delivery.html', text: 'Delivery and handoff surface.' },
  { group: 'Marketing Made Easy', title: 'WebGrowthOperator', href: 'Marketing-Made-Easy/WebGrowthOperator/index.html', text: 'Managed web presence and Phoenix growth operations site.' },
  { group: 'Marketing Made Easy', title: 'Arizona Growth Index', href: 'Marketing-Made-Easy/arizona-growth-index/index.html', text: 'Arizona local market intelligence publication with city pages, reports, playbooks, and intake routing.' },
  { group: 'Marketing Made Easy', title: 'kAIxU BrandKit', href: 'Marketing-Made-Easy/kAIxUBrandKit/index.html', text: 'Brand system, voice board, asset kit, campaign kit, proof deck, kAIxU Studio panel, and brand handoff runtime.' },

  { group: 'Free99 Intake', title: 'Free99 Intake Hub', href: 'Free99/index.html', text: 'Mounted app intake for SkyeOpsConsole plus paid/gated platform lanes.' },
  { group: 'Free99 Intake', title: 'Sign In Pro Demo', href: 'Free99/demo.html?return=/northstar/index.html', text: 'Free99 business demo lane with signup tracking, a two-day rotating demo code, and demo-only shared gate sessions.' },
  { group: 'Free99 Intake', title: 'Sign In Pro Demo Code Rotation', href: 'admin/free99-demo-code.html', text: 'Owner-gated rotation room for the Free99 Sign In Pro demo code and recent demo signup records.' },
  { group: 'Free99 Intake', title: 'SkyeOpsConsole', href: 'Free99/apps/skyeopsconsole/index.html', text: 'Free99 offline operations console.' },
  { group: 'Free99 Intake', title: 'Still2Vid Forge', href: 'Free99/apps/still2vid-forge/index.html', text: 'Free99 gated image-to-video forge for real logos, live-surface images, licensed media, and AI-receipted assets.' },
  { group: 'Free99 Intake', title: 'SkyeAPI + AegisCore', href: 'Free99/apps/skyeapi-aegiscore/apps/console/index.html', text: 'Credential, capability, provider, and gateway control plane.' },
  { group: 'Free99 Intake', title: 'SkyeAPI Website', href: 'Free99/apps/skyeapi-aegiscore/apps/website/index.html', text: 'Secondary public/website surface for SkyeAPI and AegisCore.' },
  { group: 'Free99 Intake', title: 'SovereignDocs', href: 'Free99/apps/sovereigndocs/index.html', text: 'Document workflow platform with quotas, template library, partner review, paid plans, and guarded self-help boundary.' },
  { group: 'Free99 Intake', title: 'SovereignDocs App', href: 'Free99/apps/sovereigndocs/app/index.html', text: 'SovereignDocs app surface.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Documents', href: 'Free99/apps/sovereigndocs/documents/index.html', text: 'Document library and template records.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Builder', href: 'Free99/apps/sovereigndocs/builder/index.html', text: 'Guided builder route for document workflows.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Workspace', href: 'Free99/apps/sovereigndocs/workspace/index.html', text: 'Workspace room for document work.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Vault', href: 'Free99/apps/sovereigndocs/vault/index.html', text: 'SovereignDocs vault route.' },
  { group: 'Free99 Intake', title: 'SovereignDocs API', href: 'Free99/apps/sovereigndocs/api/index.html', text: 'SovereignDocs API lane.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Admin', href: 'Free99/apps/sovereigndocs/admin/index.html', text: 'SovereignDocs admin route.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Review Queue', href: 'Free99/apps/sovereigndocs/review-queue/index.html', text: 'Review queue for document governance.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Official Sources', href: 'Free99/apps/sovereigndocs/official-sources/index.html', text: 'Official-source routing and self-help document boundaries.' },
  { group: 'Free99 Intake', title: 'SovereignDocs Pricing', href: 'Free99/apps/sovereigndocs/pricing/index.html', text: 'Imported paid-plan pricing surface.' },
  { group: 'Free99 Intake', title: 'SovereignDocs SkyeDocxMax', href: 'Free99/apps/sovereigndocs/skye-docx-max/index.html', text: 'SkyeDocxMax integration inside SovereignDocs.' },
  { group: 'Free99 Intake', title: 'kAIxU CodeStudio', href: 'Free99/apps/kaixu-codestudio/index.html', text: 'Provider backplane, policy, and code platform with approval rules for costly calls.' },
  { group: 'Free99 Intake', title: 'kAIxU CodeStudio App', href: 'Free99/apps/kaixu-codestudio/app/index.html', text: 'Secondary app surface for CodeStudio.' },
  { group: 'Free99 Intake', title: 'kAIxU CodeStudio Reports', href: 'Free99/apps/kaixu-codestudio/reports/index.html', text: 'Report route for CodeStudio.' },
  { group: 'Free99 Intake', title: 'skAIxU Code Evaluator', href: 'Free99/apps/skaixu-code-evaluator/index.html', text: 'Evaluation platform with rubric, workflow, browser proof, and seed materialization packs.' },
  { group: 'Free99 Intake', title: 'SkyeVaultPro', href: 'Free99/apps/skyevaultpro/index.html', text: 'Offline-first vault with backup, AI helper, identity, and profile sync paths.' },
  { group: 'Free99 Intake', title: 'SkyeVaultPro Drive', href: 'Free99/apps/skyevaultpro/drive/index.html', text: 'Drive route for SkyeVaultPro.' },
  { group: 'Free99 Intake', title: 'SkyeVaultPro Founder', href: 'Free99/apps/skyevaultpro/founder/index.html', text: 'Founder route for SkyeVaultPro.' },
  { group: 'Free99 Intake', title: 'SkyeVaultPro Docx App', href: 'Free99/apps/skyevaultpro/apps/docx/index.html', text: 'SkyeVaultPro document editor subapp.' },
  { group: 'Free99 Intake', title: 'Doctor Ops Personal Vault', href: 'Free99/apps/doctor-ops-personal-vault/index.html', text: 'Local-first personal doctor workflow vault. Not an EHR or medical advice product.' },
  { group: 'Free99 Intake', title: 'Documorph', href: 'Free99/apps/documorph/index.html', text: 'Document transform app with database-backed runtime surfaces.' },
  { group: 'Free99 Intake', title: 'Documorph App', href: 'Free99/apps/documorph/app/index.html', text: 'Secondary document transform app surface.' },
  { group: 'Free99 Intake', title: 'SkyeArcade Sovereign Vault', href: 'Free99/apps/skyearcade/index.html', text: 'Static game vault with local saves and upstream bridge events.' },
  { group: 'Free99 Intake', title: 'SkyeBox Authenticator', href: 'Free99/apps/skyebox-authenticator/index.html', text: 'Encrypted local TOTP vault using browser crypto.' },
  { group: 'Free99 Intake', title: 'kAIxU Storefront', href: 'Free99/apps/kaixu-storefront/index.html', text: 'Mini storefront and product ecology source for future approved offers.' }
];

const SURFACE_STATUS_REGISTRY_PATH = 'audits/0S_SURFACE_STATUS.json';
const SURFACE_STATUS_HINTS = [
  ['sovereigndocs', /sovereigndocs/i],
  ['kaixu-codestudio', /codestudio|skaixu code evaluator/i],
  ['skymusicnexus', /skymusicnexus|music/i],
  ['skyemail', /skyemail|skyemail gen|skyemail generator|skyemail platform|skyemail onboarding|skyemail-gen|skyemail gen|skyemail|skymail|skyemail|skye id generator|skye-id|mailbox/i],
  ['skyemediacenter', /skyemediacenter|media/i],
  ['skyeprofitconsole', /skyeprofitconsole|profit/i],
  ['skyeroutex', /skyeroutex|routex|workforce/i],
  ['houseoperations', /houseoperations|houseops|house command/i],
  ['skyesplitengine', /skye split|skyesplit|split engine/i],
  ['marketing-made-easy', /marketing-made-easy|marketing made easy|ae-flow|brandid|businesslaunch|skyewebcreator|webgrowth|arizona growth|brandkit|skyedocxmax/i],
  ['connectlog-relay13', /connectlog|relay13/i],
  ['valley-verified', /valley verified|valley-verified|bob's|empire pallets/i],
  ['northstar', /northstar|signinpro/i],
  ['saas-skyemerit', /customer saas|customer portal|pricing|skyemerit|skyepay/i],
  ['admin-os', /\badmin os\b|main brain/i],
  ['site-operator-api', /operator center|platform ledger|site operator/i],
  ['launcher', /^0s launcher/i],
  ['home-shell', /0s skyeway|auren|cabinet brain|neural map|walkthroughs|ecosystem map/i]
];
const SURFACE_STATUS_CLASS_BY_LABEL = {
  'Production live': 'runtime-badge-live',
  'Gate required': 'runtime-badge-gated',
  'Local only': 'runtime-badge-local',
  'Static proof': 'runtime-badge-static',
  'Proof only': 'runtime-badge-proof',
  'Backend missing': 'runtime-badge-broken',
  'Partial': 'runtime-badge-partial'
};

function surfaceIdForItem(item){
  const haystack = `${item.group} ${item.title} ${item.href} ${item.text}`;
  const match = SURFACE_STATUS_HINTS.find(([, pattern]) => pattern.test(haystack));
  return match ? match[0] : 'home-shell';
}

function surfaceStatusClass(record){
  return SURFACE_STATUS_CLASS_BY_LABEL[record?.runtimeBadge] || 'runtime-badge-static';
}

async function loadSurfaceStatusRegistry(){
  if(window.__metraiyuxSurfaceStatusRegistry) return window.__metraiyuxSurfaceStatusRegistry;

  const registry = new Map();
  try{
    const url = new URL(SURFACE_STATUS_REGISTRY_PATH, document.baseURI);
    const response = await fetch(url.href, { cache: 'no-store' });
    if(!response.ok) throw new Error(`status ${response.status}`);
    const data = await response.json();
    (data.surfaces || []).forEach(record => {
      if(record && record.id) registry.set(record.id, record);
    });
  }catch(_err){
    registry.set('home-shell', {
      id: 'home-shell',
      runtimeBadge: 'Backend missing',
      proof: 'Surface status registry could not be loaded from this route.'
    });
  }
  window.__metraiyuxSurfaceStatusRegistry = registry;
  return registry;
}

async function mountSurfaceStatusBadges(scope){
  const badges = [...scope.querySelectorAll('[data-runtime-badge-for]')];
  if(!badges.length) return;

  const registry = await loadSurfaceStatusRegistry();
  badges.forEach(badge => {
    const record = registry.get(badge.dataset.runtimeBadgeFor) || registry.get('home-shell');
    if(!record) return;
    badge.textContent = record.runtimeBadge || 'Static proof';
    badge.className = `runtime-badge ${surfaceStatusClass(record)}`;
    badge.title = record.proof || '';
  });
}

const HEADER_NAV_ORDER = [
  'Command',
  'Sell & Proof',
  'Operate',
  'Create & Market',
  'Docs & Vault',
  'Music',
  'Dev & Free99'
];

const HEADER_NAV_SUMMARY = {
  'Command': 'Launcher, admin, operator, SaaS, pricing, brain, and platform-ledger rooms.',
  'Sell & Proof': 'Buyer proof, Valley Verified, stores, vault handoff, mail, ConnectLog, and Relay13 routes.',
  'Operate': 'Route, profit, media, split, house, content, and workforce operating rooms.',
  'Create & Market': 'Marketing Made Easy, AE flow, brand, launch, web creation, and growth intelligence.',
  'Docs & Vault': 'Document editors, SovereignDocs, SkyeVaultPro, Documorph, SkyeBox, and private vault routes.',
  'Music': 'SkyeMusicNexus artist, operator, DAW, drops, releases, rights, exchange, feed, and export rooms.',
  'Dev & Free99': 'Free99 intake, SkyeOpsConsole, SkyeAPI, CodeStudio, evaluator, arcade, and storefront lanes.'
};

function classifyHeaderUseCase(item){
  const haystack = `${item.group} ${item.title} ${item.href} ${item.text}`.toLowerCase();
  if(/music|daw|drops|release|rights|exchange|player|stems/.test(haystack)) return 'Music';
  if(/docx|document|sovereigndocs|documorph|vault|skyebox|doctor/.test(haystack)) return 'Docs & Vault';
  if(/skyeapi|aegis|codestudio|code evaluator|free99|skyeopsconsole|storefront|arcade/.test(haystack)) return 'Dev & Free99';
  if(/ae-flow|brandid|businesslaunch|skyewebcreator|webgrowth|arizona growth|brandkit|marketing-made-easy|marketing made easy/.test(haystack)) return 'Create & Market';
  if(/routex|profit|media|split|houseoperations|content forge|workforce/.test(haystack)) return 'Operate';
  if(/proof|valley|bob's|empire|skyepay|skyevault drop|skyemail|connectlog|relay13|sales/.test(haystack)) return 'Sell & Proof';
  return 'Command';
}

function mountHomepageHeaderNav(nav){
  if(!nav || nav.dataset.usecaseMenu === 'true') return;

  const directLinks = [
    { title: 'Launcher', href: '0s/index.html' },
    { title: 'All Surfaces', href: '#all-platform-surfaces' },
    { title: 'Search', href: '#surface-search' }
  ];
  const grouped = new Map(HEADER_NAV_ORDER.map(group => [group, []]));
  const seen = new Set();

  HOMEPAGE_SURFACE_INDEX.forEach(item => {
    const key = `${item.title}|${item.href}`;
    if(seen.has(key)) return;
    seen.add(key);
    const group = classifyHeaderUseCase(item);
    if(!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(item);
  });

  nav.classList.add('nav-usecase-menu');
  nav.dataset.usecaseMenu = 'true';
  nav.innerHTML = `
    ${directLinks.map(item => `<a class="nav-direct" href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a>`).join('')}
    ${HEADER_NAV_ORDER.map(group => {
      const items = grouped.get(group) || [];
      return `
        <details class="nav-dropdown" data-nav-dropdown>
          <summary>${escapeHtml(group)} <span>${items.length}</span></summary>
          <div class="nav-dropdown-panel">
            <p>${escapeHtml(HEADER_NAV_SUMMARY[group] || '')}</p>
            ${items.map(item => `
              <a href="${escapeHtml(item.href)}"${isExternalHref(item.href) ? ' target="_blank" rel="noopener"' : ''}>
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.text)}</small>
              </a>
            `).join('')}
          </div>
        </details>
      `;
    }).join('')}
  `;

  const dropdowns = [...nav.querySelectorAll('[data-nav-dropdown]')];
  const updatePanelTop = () => {
    const bottom = Math.ceil(nav.getBoundingClientRect().bottom + 8);
    document.documentElement.style.setProperty('--nav-panel-top', `${bottom}px`);
  };
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('toggle', () => {
      if(!dropdown.open) return;
      updatePanelTop();
      dropdowns.forEach(other => {
        if(other !== dropdown) other.removeAttribute('open');
      });
    });
  });
  updatePanelTop();
  window.addEventListener('resize', updatePanelTop, { passive: true });

  document.addEventListener('pointerdown', event => {
    if(nav.contains(event.target)) return;
    dropdowns.forEach(dropdown => dropdown.removeAttribute('open'));
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') dropdowns.forEach(dropdown => dropdown.removeAttribute('open'));
  });
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function isExternalHref(href){
  return /^https?:\/\//i.test(href);
}

function mountHomepageSurfaceIndex(){
  const main = document.querySelector('main#top');
  if(!main || document.querySelector('#all-platform-surfaces')) return;

  const nav = document.querySelector('.site-header nav');
  if(nav){
    mountHomepageHeaderNav(nav);
  }

  const section = document.createElement('section');
  section.className = 'section crown-band';
  section.id = 'all-platform-surfaces';
  section.innerHTML = `
    <p class="eyebrow">Full platform surface index</p>
    <h2>Every mounted app, platform, and subplatform gets a direct route.</h2>
    <p class="wide">The 0S homepage now exposes the direct app inventory instead of hiding imported apps behind bundle-only links. Search here, use the top nav, or open the 0S Launcher command palette.</p>
    <div class="surface-runtime-legend" aria-label="Runtime status legend">
      <span class="runtime-badge runtime-badge-live">Production live</span>
      <span class="runtime-badge runtime-badge-gated">Gate required</span>
      <span class="runtime-badge runtime-badge-local">Local only</span>
      <span class="runtime-badge runtime-badge-static">Static proof</span>
      <span class="runtime-badge runtime-badge-broken">Backend missing</span>
    </div>
    <div class="surface-index-tools">
      <label class="surface-index-search">
        <span>Search 0S surfaces</span>
        <input id="surface-search" type="search" autocomplete="off" placeholder="Search SkyeDocxMax, SovereignDocs, DAW, SkyeVaultPro, Relay13...">
      </label>
      <span class="surface-index-status" data-surface-index-count>${HOMEPAGE_SURFACE_INDEX.length} routes mounted</span>
    </div>
    <div class="route-grid surface-index-grid" data-surface-index-grid>
      ${HOMEPAGE_SURFACE_INDEX.map(item => {
        const surfaceId = surfaceIdForItem(item);
        return `
        <a class="route-card surface-index-card" href="${escapeHtml(item.href)}" data-surface-id="${escapeHtml(surfaceId)}" data-surface-search-target data-search-title="${escapeHtml([item.group, item.title, item.text].join(' '))}"${isExternalHref(item.href) ? ' target="_blank" rel="noopener"' : ''}>
          <span class="surface-index-group">${escapeHtml(item.group)}</span>
          <span class="runtime-badge runtime-badge-loading" data-runtime-badge-for="${escapeHtml(surfaceId)}">Runtime status loading</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
        </a>
      `;
      }).join('')}
    </div>
  `;

  const anchor = document.querySelector('#live-surface-command-strip') || main.querySelector('.hero');
  if(anchor && anchor.nextSibling){
    anchor.parentNode.insertBefore(section, anchor.nextSibling);
  }else{
    main.appendChild(section);
  }

  const input = section.querySelector('#surface-search');
  const cards = [...section.querySelectorAll('[data-surface-search-target]')];
  const count = section.querySelector('[data-surface-index-count]');
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      const show = !q || text.includes(q);
      card.hidden = !show;
      if(show) visible += 1;
    });
    count.textContent = `${visible} of ${cards.length} routes visible`;
  };
  input.addEventListener('input', filter);
  mountSurfaceStatusBadges(section);
}

mountHomepageSurfaceIndex();

const search = document.querySelector('#search');
const searchableCards = [...document.querySelectorAll('.leader-card,.route-card,[data-surface-search-target]')];
if (search) {
  search.placeholder = 'Search leaders, apps, routes, or Valley Verified...';
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    searchableCards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = !q || text.includes(q) ? '' : 'none';
    });
  });
}
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});observer.unobserve(entry.target)}
  })
},{threshold:.1});
document.querySelectorAll('.leader-card,.panel,.cabinet-map div,.quote-panel').forEach(el=>{el.style.opacity=0;observer.observe(el)});

(function(){
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function parseMorphingTexts(el){
    try{
      const parsed = JSON.parse(el.dataset.morphingText || '[]');
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    }catch(_err){
      return String(el.dataset.morphingText || '').split('|').map(item => item.trim()).filter(Boolean);
    }
  }

  function sizeMorphingText(el, texts){
    const longest = texts.reduce((max, item) => Math.max(max, item.length), el.textContent.trim().length || 1);
    el.style.setProperty('--morph-chars', String(Math.min(Math.max(longest, 10), 24)));
  }

  function initCssMorphingText(el){
    if(el.dataset.morphingActive === 'true') return;
    const texts = parseMorphingTexts(el);
    if(!texts.length) return;
    let index = Math.max(0, texts.indexOf(el.textContent.trim()));
    el.dataset.morphingActive = 'true';
    el.dataset.motionProvider = 'css-fallback';
    el.setAttribute('aria-live', 'polite');
    sizeMorphingText(el, texts);
    if(reducedMotion || texts.length < 2) return;

    window.setInterval(() => {
      index = (index + 1) % texts.length;
      el.classList.remove('is-morphing-in');
      el.classList.add('is-morphing-out');
      window.setTimeout(() => {
        el.textContent = texts[index];
        el.classList.remove('is-morphing-out');
        el.classList.add('is-morphing-in');
      }, 260);
      window.setTimeout(() => el.classList.remove('is-morphing-in'), 720);
    }, 2200);
  }

  function initMotionChromeFallback(){
    const progress = document.querySelector('.motion-progress i');
    if(progress){
      const updateProgress = () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
      };
      updateProgress();
      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
    }

    const glow = document.querySelector('.motion-cursor-glow');
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if(glow && finePointer && !reducedMotion){
      let raf = 0;
      let x = -400;
      let y = -400;
      window.addEventListener('pointermove', event => {
        x = event.clientX - 140;
        y = event.clientY - 140;
        if(raf) return;
        raf = window.requestAnimationFrame(() => {
          glow.style.opacity = '.86';
          glow.style.transform = `translate3d(${x}px,${y}px,0)`;
          raf = 0;
        });
      }, { passive: true });
    }
  }

  function bootFallbackEffects(){
    if(window.__metraiyuxMotionLoaded) return;
    document.querySelectorAll('.morphing-text[data-morphing-text]').forEach(initCssMorphingText);
    initMotionChromeFallback();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(bootFallbackEffects, 1200), { once: true });
  }else{
    window.setTimeout(bootFallbackEffects, 1200);
  }
})();

(function(){
  const canvas = document.querySelector('.living-background');
  if(!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if(!ctx) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.2 : 1.5);
  let width = 0;
  let height = 0;
  let particles = [];

  function resizeLivingBackground(){
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = compact ? 22 : 42;
    particles = Array.from({ length: count }, (_, i) => ({
      x: (i * 97) % Math.max(width, 1),
      y: (i * 53) % Math.max(height, 1),
      r: 1.2 + (i % 4) * .55,
      s: .12 + (i % 6) * .035
    }));
  }

  function drawWave(time, yBase, color, amplitude, offset){
    ctx.beginPath();
    for(let x = 0; x <= width; x += 18){
      const y = yBase + Math.sin((x * .008) + time + offset) * amplitude + Math.cos((x * .003) - time * .7) * amplitude * .54;
      if(x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawLivingBackground(frameTime){
    const time = frameTime * .00035;
    ctx.clearRect(0, 0, width, height);
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, 'rgba(53,183,255,.08)');
    wash.addColorStop(.45, 'rgba(243,212,131,.06)');
    wash.addColorStop(1, 'rgba(111,242,199,.055)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    drawWave(time, height * .62, 'rgba(53,183,255,.09)', 32, 0);
    drawWave(time * 1.25, height * .72, 'rgba(243,212,131,.08)', 24, 2.4);
    drawWave(time * .92, height * .78, 'rgba(111,242,199,.07)', 28, 5.1);

    particles.forEach((p, i) => {
      const drift = reducedMotion ? 0 : frameTime * p.s * .01;
      const x = (p.x + drift + Math.sin(time + i) * 18) % Math.max(width, 1);
      const y = (p.y + Math.cos(time * 1.4 + i) * 14) % Math.max(height, 1);
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(243,212,131,.32)' : i % 3 === 1 ? 'rgba(53,183,255,.30)' : 'rgba(111,242,199,.28)';
      ctx.fill();
    });

    if(!reducedMotion) window.requestAnimationFrame(drawLivingBackground);
  }

  resizeLivingBackground();
  window.addEventListener('resize', resizeLivingBackground);
  window.requestAnimationFrame(drawLivingBackground);
})();

(function(){
  if(window.__metraiyuxSkyeUIPolish) return;
  window.__metraiyuxSkyeUIPolish = true;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactScreen = window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
  const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const beamColors = ['#f3d483', '#35b7ff', '#6ff2c7', '#a88cff'];

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function createFlickeringGrid(){
    if(document.querySelector('.skye-flickering-grid')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'skye-flickering-grid';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    if(!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let cells = new Float32Array(0);
    const dpr = Math.min(window.devicePixelRatio || 1, compactScreen ? 1.1 : 1.4);
    const square = compactScreen ? 3 : 4;
    const gap = compactScreen ? 13 : 16;
    const maxOpacity = compactScreen ? .13 : .18;

    function resize(){
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.ceil(width / (square + gap)));
      rows = Math.max(1, Math.ceil(height / (square + gap)));
      cells = new Float32Array(cols * rows);
      for(let i = 0; i < cells.length; i += 1){
        cells[i] = Math.random() * maxOpacity;
      }
      draw(0);
    }

    function draw(time){
      ctx.clearRect(0, 0, width, height);
      for(let x = 0; x < cols; x += 1){
        for(let y = 0; y < rows; y += 1){
          const index = x * rows + y;
          if(!reducedMotion && Math.random() < .018){
            cells[index] = Math.random() * maxOpacity;
          }
          const alpha = cells[index] + (Math.sin(time * .001 + index * .17) + 1) * .012;
          const colorIndex = (x + y) % 4;
          ctx.fillStyle = colorIndex === 0
            ? `rgba(243, 212, 131, ${alpha})`
            : colorIndex === 1
              ? `rgba(53, 183, 255, ${alpha})`
              : colorIndex === 2
                ? `rgba(111, 242, 199, ${alpha})`
                : `rgba(168, 140, 255, ${alpha})`;
          ctx.fillRect(x * (square + gap), y * (square + gap), square, square);
        }
      }
      if(!reducedMotion) window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if(!reducedMotion) window.requestAnimationFrame(draw);
  }

  function ensureMotionChrome(){
    if(!document.querySelector('.motion-progress')){
      const progress = document.createElement('div');
      progress.className = 'motion-progress scroll-progress motion-chrome';
      progress.setAttribute('aria-hidden', 'true');
      progress.innerHTML = '<i></i>';
      document.body.prepend(progress);
    }
    if(!document.querySelector('.motion-cursor-glow')){
      const glow = document.createElement('div');
      glow.className = 'motion-cursor-glow pointer-reactive motion-chrome';
      glow.setAttribute('aria-hidden', 'true');
      document.body.prepend(glow);
    }
  }

  function Meteors(container, opts){
    if(!container || reducedMotion || container.dataset.skyeMeteors === 'true') return;
    const settings = Object.assign({ count: compactScreen ? 6 : 12, color: 'rgba(53, 183, 255, .62)' }, opts || {});
    container.dataset.skyeMeteors = 'true';
    container.style.overflow = container.style.overflow || 'hidden';
    for(let i = 0; i < settings.count; i += 1){
      const meteor = document.createElement('span');
      meteor.className = 'skye-meteor';
      meteor.style.setProperty('--skye-meteor-color', settings.color);
      meteor.style.setProperty('--skye-meteor-delay', `${(i * .38 + Math.random() * 1.4).toFixed(2)}s`);
      meteor.style.setProperty('--skye-meteor-duration', `${(2.1 + Math.random() * 1.4).toFixed(2)}s`);
      meteor.style.top = `${8 + Math.random() * 70}%`;
      meteor.style.left = `${32 + Math.random() * 58}%`;
      container.appendChild(meteor);
    }
  }

  function ShineBorder(el, opts){
    if(!el || el.dataset.skyeShine === 'true') return;
    const settings = Object.assign({ c1: '#a88cff', c2: '#f3d483', c3: '#35b7ff', duration: '6s' }, opts || {});
    el.dataset.skyeShine = 'true';
    el.classList.add('skye-shine-wrap');
    el.style.setProperty('--skye-shine-c1', settings.c1);
    el.style.setProperty('--skye-shine-c2', settings.c2);
    el.style.setProperty('--skye-shine-c3', settings.c3);
    el.style.setProperty('--skye-shine-dur', settings.duration);
  }

  function BorderBeam(el, opts){
    if(!el || reducedMotion || el.dataset.skyeBeam === 'true') return;
    const settings = Object.assign({ color: '#f3d483', size: 88, duration: 4600, delay: 0 }, opts || {});
    el.dataset.skyeBeam = 'true';
    el.classList.add('skye-beam-host');
    const beam = document.createElement('i');
    beam.className = 'skye-border-beam';
    beam.setAttribute('aria-hidden', 'true');
    beam.style.setProperty('--skye-beam-color', settings.color);
    beam.style.setProperty('--skye-beam-size', `${settings.size}px`);
    el.appendChild(beam);

    let start = null;
    function tick(timestamp){
      if(!start) start = timestamp + settings.delay;
      const elapsed = timestamp - start;
      if(elapsed < 0){
        window.requestAnimationFrame(tick);
        return;
      }
      const w = Math.max(1, el.offsetWidth);
      const h = Math.max(1, el.offsetHeight);
      const perimeter = 2 * (w + h);
      const position = ((elapsed % settings.duration) / settings.duration) * perimeter;
      let x = 0;
      let y = 0;
      let angle = 0;
      if(position <= w){
        x = position;
        y = 0;
      }else if(position <= w + h){
        x = w;
        y = position - w;
        angle = 90;
      }else if(position <= (2 * w) + h){
        x = w - (position - w - h);
        y = h;
        angle = 180;
      }else{
        x = 0;
        y = h - (position - (2 * w) - h);
        angle = 270;
      }
      beam.style.transform = `translate3d(${x - settings.size / 2}px, ${y - 1}px, 0) rotate(${angle}deg)`;
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function TextBlurIn(el, opts){
    if(!el || reducedMotion || el.dataset.skyeTextBlur === 'true' || el.children.length) return;
    const settings = Object.assign({ stagger: 70, delay: 0 }, opts || {});
    const text = el.textContent.trim();
    if(!text) return;
    el.dataset.skyeTextBlur = 'true';
    el.textContent = '';
    text.split(/(\s+)/).forEach((piece, index) => {
      if(/^\s+$/.test(piece)){
        el.appendChild(document.createTextNode(piece));
        return;
      }
      const span = document.createElement('span');
      span.className = 'skye-blur-word';
      span.style.animationDelay = `${settings.delay + index * settings.stagger}px`;
      span.textContent = piece;
      el.appendChild(span);
    });
  }

  function addRevealChoreography(){
    const revealTargets = [
      ...document.querySelectorAll('h1, h2, .hero-lede, .wide, .route-card, .ultra-card, .commercial-card, .saas-card, .visual-kpi, .visual-panel, .sentinel-card, .nexus-card, .tool-panel, .panel, .quote-panel')
    ].filter((el, index) => index < 140 && !el.closest('nav') && !el.classList.contains('skye-text-reveal'));

    revealTargets.forEach((el, index) => {
      el.classList.add('skye-text-reveal');
      el.style.setProperty('--skye-reveal-delay', `${Math.min((index % 8) * 55, 385)}ms`);
    });

    if(!('IntersectionObserver' in window)){
      revealTargets.forEach(el => el.classList.add('skye-text-visible'));
      return;
    }

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        entry.target.classList.add('skye-text-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(el => revealObserver.observe(el));
  }

  function addOrbitingLogoField(){
    const logo = document.querySelector('.hero-platform-logo');
    const host = document.querySelector('.logo-showcase, .hero-media') || (logo && logo.parentElement);
    if(!host || host.dataset.skyeOrbit === 'true' || reducedMotion) return;
    host.dataset.skyeOrbit = 'true';
    host.classList.add('skye-orbit-host');
    const overlay = document.createElement('span');
    overlay.className = 'skye-orbit-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const ringSizes = compactScreen ? [220, 290] : [340, 460];
    ringSizes.forEach((size, ringIndex) => {
      const ring = document.createElement('span');
      ring.className = `skye-orbit-ring${ringIndex % 2 ? ' reverse' : ''}`;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.setProperty('--skye-orbit-speed', `${ringIndex ? 24 : 18}s`);
      overlay.appendChild(ring);
      for(let i = 0; i < 4; i += 1){
        const node = document.createElement('span');
        node.className = 'skye-orbit-node';
        node.style.setProperty('--skye-node-angle', `${(i * 90) + (ringIndex * 35)}deg`);
        node.style.setProperty('--skye-node-radius', `${size / 2}px`);
        node.style.setProperty('--skye-orbit-color', beamColors[(i + ringIndex) % beamColors.length]);
        ring.appendChild(node);
      }
    });
    host.prepend(overlay);
  }

  function addMagneticControls(){
    if(!finePointer || reducedMotion) return;
    document.querySelectorAll('a.button, .button-row a, .button-row button, .sentinel-btn, .saas-btn, .nexus-btn, .crown-btn, .action-btn, button[type="button"], button[type="submit"]').forEach(el => {
      el.classList.add('skye-magnetic');
    });
  }

  function applySkyeComponents(){
    document.body.classList.add('skye-ui-polished');
    ensureMotionChrome();
    createFlickeringGrid();

    const hero = document.querySelector('.hero, .upgrade-hero, .admin-hero, .commercial-hero, header.hero');
    Meteors(hero, { count: compactScreen ? 6 : 14, color: 'rgba(243, 212, 131, .56)' });

    document.querySelectorAll('.hero-title, .hero h1, header.hero h1').forEach((el, index) => {
      if(index < 2 && !el.children.length) el.classList.add('skye-gradient-text', 'neon-gradient-text');
    });
    document.querySelectorAll('.morphing-text').forEach(el => el.classList.add('premium-text-effects-lab', 'neon-gradient-text'));

    document.querySelectorAll('.route-card, .ultra-card, .commercial-card, .saas-card, .visual-kpi, .visual-panel, .sentinel-card, .nexus-card, .logo-asset-card, .upgrade-card, .panel, .tool-panel').forEach((el, index) => {
      if(index < 36){
        ShineBorder(el, {
          c1: beamColors[index % beamColors.length],
          c2: beamColors[(index + 1) % beamColors.length],
          c3: beamColors[(index + 2) % beamColors.length],
          duration: `${5 + (index % 4)}s`
        });
      }
      if(index < 10){
        BorderBeam(el, {
          color: beamColors[index % beamColors.length],
          size: compactScreen ? 58 : 88,
          duration: 4200 + index * 170,
          delay: index * 160
        });
      }
    });

    const firstPlainHeadline = [...document.querySelectorAll('h1, h2')].find(el => !el.children.length && el.textContent.trim().length < 72);
    TextBlurIn(firstPlainHeadline, { stagger: 38, delay: 80 });

    const statStrip = document.querySelector('.stat-strip');
    if(statStrip) statStrip.classList.add('skye-animated-beam');

    addOrbitingLogoField();
    addMagneticControls();
    addRevealChoreography();
  }

  window.SkyeUI = Object.assign({}, window.SkyeUI || {}, {
    Meteors,
    ShineBorder,
    BorderBeam,
    TextBlurIn,
    OrbitRings: addOrbitingLogoField
  });

  onReady(applySkyeComponents);
})();

(function(){
  if(window.__zeroSurfaceMiniApps) return;
  window.__zeroSurfaceMiniApps = true;

  const VERSION = '0s-surface-mini-apps-2026-05-17';
  const LEDGER_KEY = 'zero-surface-mini-app-ledger';
  const PLATFORM_FOLDERS = new Set([
    'admin','ae-command','ai-readiness','apex','automation','autonomous-business',
    'brain-governance','branch-expansion','buyer-intelligence','calculators',
    'certification-readiness','client-os','client-preview','clients','cloudflare',
    'conversion','crown-os','dominion-upgrade','download-center','downloads',
    'governance','government','investor','launch','legal-readiness','member',
    'nexus','operator','portal-layer','portals','pricing','proof','proof-export',
    'proof-vault','proposal-center','quantum-ops','revenue-ops','saas','sales',
    'sales-enablement','sentinel-os','training-academy'
  ]);

  const FIELD_LABELS = {
    owner: 'Owner',
    target: 'Target / buyer / workflow',
    signal: 'Surface claim or incoming signal',
    status: 'Workflow status',
    priority: 'Priority',
    proofStatus: 'Proof status',
    proofLink: 'Proof link',
    risk: 'Risk level',
    impactValue: 'Impact value',
    nextAction: 'Next action',
    reviewDate: 'Review date',
    notes: 'Operator notes'
  };

  const STATUS_POINTS = {
    Intake: 12,
    Draft: 24,
    Active: 42,
    'Needs proof': 32,
    'Operator review': 58,
    'QA review': 68,
    'Client ready': 82,
    'Ready for handoff': 92
  };
  const PROOF_POINTS = { Missing: 0, Partial: 14, Linked: 24, Verified: 34 };
  const PRIORITY_POINTS = { Low: 4, Standard: 8, High: 12, Critical: 15, 'Founder review': 10 };
  const RISK_PENALTY = { Low: 0, Medium: 8, High: 18, 'Do not publish yet': 34 };

  const LANE_MAP = [
    ['proof', /proof|receipt|claim|qa|audit|verify|evidence|vault/i, 'Proof control', 'Victor Saint QA Brain', 'Attach evidence and mark public claims as unproven until verified.'],
    ['revenue', /revenue|deal|proposal|pricing|pipeline|ae|sales|commission|conversion|buyer/i, 'Revenue route', 'Celeste Monroe Revenue Brain', 'Protect the next buyer action and keep proof near the CTA.'],
    ['client', /client|customer|onboard|renewal|success|workspace|portal|intake/i, 'Client route', 'Adrian Cross Client Success Brain', 'Route to client success with status, owner, and next touch date.'],
    ['staffing', /candidate|staff|recruit|resume|placement|workforce/i, 'Staffing route', 'Sienna Brooks Staffing Brain', 'Capture candidate/client evidence before external action.'],
    ['compliance', /legal|compliance|contract|policy|insurance|security|privacy|government|certification|risk/i, 'Compliance route', 'Julian Mercer Compliance Brain', 'Keep professional review and proof gates visible before publishing.'],
    ['technology', /brain|automation|worker|cloudflare|api|deploy|sdk|database|ai|readiness/i, 'Technology route', 'Orion Hayes Technology Brain', 'Turn the system note into a testable operator task with proof.'],
    ['training', /training|academy|tutorial|playbook|certification|lesson/i, 'Training route', 'Marcus Vale Operations Brain', 'Turn the material into a tracked completion and operator handoff.'],
    ['finance', /billing|finance|invoice|margin|valuation|investor|budget/i, 'Finance route', 'Naomi Sterling Finance Brain', 'Treat numbers as directional until owner-approved and evidence-backed.'],
    ['marketing', /brand|content|blog|seo|market|campaign|public|download/i, 'Public route', 'Valentina Reyes Brand Brain', 'Keep public copy proof-backed and buyer-safe.'],
    ['founder', /founder|command|approval|override|member|governance/i, 'Founder route', 'Gray London Skyes Founder Brain', 'Escalate authority, money, legal, and public representation changes.']
  ];

  function onReady(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function pathParts(){
    return location.pathname.split('/').filter(Boolean).filter(part => !part.endsWith('.html'));
  }

  function platformFolder(){
    const parts = pathParts();
    return parts[0] || 'root';
  }

  function pageTitle(){
    return (document.querySelector('main h1, h1')?.textContent || document.title || '0S Surface').trim().replace(/\s+/g, ' ');
  }

  function pageText(){
    return [
      location.pathname,
      document.title,
      pageTitle(),
      document.querySelector('.hero-lede,.hero-copy,.wide,meta[name="description"]')?.textContent || '',
      document.body?.innerText?.slice(0, 1600) || ''
    ].join(' ');
  }

  function classifySurface(text){
    const value = text || pageText();
    const hit = LANE_MAP.find(item => item[1].test(value));
    if(hit) return { lane: hit[0], routeLabel: hit[2], owner: hit[3], guidance: hit[4] };
    return { lane: 'operations', routeLabel: 'Operations route', owner: 'Site Operator Brain', guidance: 'Capture owner, proof, risk, and next action before handoff.' };
  }

  function safe(value, fallback){
    const text = String(value || '').trim();
    return text || fallback;
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function slug(value){
    return String(value || '0s-surface-record').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '0s-surface-record';
  }

  function numberValue(value){
    return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
  }

  function readJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_err){
      return fallback;
    }
  }

  function readLedger(){
    const items = readJson(LEDGER_KEY, []);
    return Array.isArray(items) ? items : [];
  }

  function writeLedger(record){
    const next = [
      record,
      ...readLedger().filter(item => item.storageKey !== record.storageKey)
    ].slice(0, 300);
    localStorage.setItem(LEDGER_KEY, JSON.stringify(next, null, 2));
    return next;
  }

  function storageKey(id){
    return `zero-surface-mini:${id || location.pathname}`;
  }

  function download(filename, content, type){
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function scoreStatus(score, risk){
    if(risk === 'Do not publish yet') return 'Do not publish yet';
    if(score >= 82) return 'Ready for handoff';
    if(score >= 64) return 'Operator review';
    if(score >= 42) return 'Needs proof work';
    return 'Incomplete record';
  }

  function evaluate(data, context){
    const proof = PROOF_POINTS[data.proofStatus] ?? 0;
    const status = STATUS_POINTS[data.status] ?? 0;
    const priority = PRIORITY_POINTS[data.priority] ?? 0;
    const riskPenalty = RISK_PENALTY[data.risk] ?? 0;
    const hasOwner = safe(data.owner, '') ? 8 : 0;
    const hasSignal = safe(data.signal, '') ? 9 : 0;
    const hasNext = safe(data.nextAction, '') ? 8 : 0;
    const hasReview = safe(data.reviewDate, '') ? 5 : 0;
    const hasProofLink = safe(data.proofLink, '') ? 8 : 0;
    const score = Math.max(0, Math.min(100, Math.round(status + proof + priority + hasOwner + hasSignal + hasNext + hasReview + hasProofLink - riskPenalty)));
    const value = numberValue(data.impactValue);
    const actions = [
      !safe(data.owner, '') && 'Assign an accountable owner.',
      !safe(data.signal, '') && 'Capture the claim, request, or workflow this surface is supposed to handle.',
      data.proofStatus !== 'Verified' && 'Attach or verify proof before external use.',
      data.risk === 'High' && 'Escalate high-risk items for operator review.',
      data.risk === 'Do not publish yet' && 'Keep this out of public/buyer use until corrected.',
      !safe(data.nextAction, '') && 'Write the next action.',
      !safe(data.reviewDate, '') && 'Set a review date.'
    ].filter(Boolean);
    const statusLabel = scoreStatus(score, data.risk);
    const route = data.risk === 'Do not publish yet'
      ? 'Hold internally until proof, owner, and review are corrected.'
      : `${context.guidance} ${data.proofStatus === 'Verified' ? 'Proof is verified.' : 'Proof still needs work.'}`;
    return {
      score,
      status: statusLabel,
      route,
      actions,
      primaryMetric: value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : safe(data.status, 'Intake'),
      secondaryMetric: safe(data.proofStatus, 'Missing'),
      summary: `${safe(data.recordName, pageTitle())} is a ${context.lane} surface at ${safe(data.status, 'Intake')} with ${safe(data.proofStatus, 'Missing')} proof and ${safe(data.risk, 'Medium')} risk.`
    };
  }

  function markdown(record){
    const data = record.data;
    const fieldLines = Object.keys(FIELD_LABELS)
      .map(key => `- ${FIELD_LABELS[key]}: ${safe(data[key], 'Not set')}`)
      .join('\n');
    const actionLines = record.result.actions.length ? record.result.actions.map(item => `- ${item}`).join('\n') : '- No immediate blockers.';
    return [
      `# ${record.title} 0S Surface Receipt`,
      '',
      `- Generated: ${record.savedAt}`,
      `- Version: ${VERSION}`,
      `- URL: ${record.path}`,
      `- Platform: ${record.platform}`,
      `- Lane: ${record.context.lane}`,
      `- Score: ${record.result.score}/100`,
      `- Status: ${record.result.status}`,
      `- ${record.context.routeLabel}: ${record.result.route}`,
      '',
      '## Summary',
      record.result.summary,
      '',
      '## Fields',
      fieldLines,
      '',
      '## Next Actions',
      actionLines,
      '',
      '## Source Note',
      'Private 0S operator record. Export only through the approved handoff path.'
    ].join('\n');
  }

  function buildRecord(id, data, context, title){
    const result = evaluate(data, context);
    const record = {
      id: `0S-${Date.now()}`,
      version: VERSION,
      storageKey: storageKey(id),
      path: location.pathname,
      platform: platformFolder(),
      title,
      context,
      savedAt: new Date().toISOString(),
      data,
      result
    };
    record.markdown = markdown(record);
    return record;
  }

  function renderResult(host, record){
    const output = host.querySelector('[data-zero-output]');
    host.querySelectorAll('[data-zero-score]').forEach(el => { el.textContent = record.result.score; });
    host.querySelectorAll('[data-zero-status]').forEach(el => { el.textContent = record.result.status; });
    host.querySelectorAll('[data-zero-primary]').forEach(el => { el.textContent = record.result.primaryMetric; });
    host.querySelectorAll('[data-zero-secondary]').forEach(el => { el.textContent = record.result.secondaryMetric; });
    host.querySelectorAll('[data-zero-route]').forEach(el => { el.textContent = record.result.route; });
    if(output){
      output.innerHTML = [
        `<h3>${escapeHtml(record.context.routeLabel)}</h3>`,
        `<p>${escapeHtml(record.result.summary)}</p>`,
        '<ul>',
        (record.result.actions.length ? record.result.actions : ['No immediate blockers.']).map(item => `<li>${escapeHtml(item)}</li>`).join(''),
        '</ul>'
      ].join('');
    }
    const receipt = host.querySelector('[data-zero-receipt]');
    if(receipt) receipt.textContent = record.markdown;
  }

  function formData(form){
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  function workbenchHtml(context, title){
    return [
      '<section class="section zero-mini-app" data-zero-universal>',
      '  <div class="zero-mini-head">',
      '    <p class="eyebrow">0S local mini app</p>',
      `    <h2>${escapeHtml(title)} workbench</h2>`,
      '    <div class="zero-mini-strip">',
      '      <span><b data-zero-score>0</b>Surface score</span>',
      '      <span><b data-zero-primary>Intake</b>Primary metric</span>',
      '      <span><b data-zero-secondary>Missing</b>Proof</span>',
      '    </div>',
      '  </div>',
      '  <div class="zero-mini-grid">',
      '    <form class="zero-mini-form">',
      `      <label>Record name<input name="recordName" value="${escapeHtml(title)}"></label>`,
      `      <label>Owner<input name="owner" placeholder="${escapeHtml(context.owner)}"></label>`,
      '      <label>Target / buyer / workflow<input name="target" placeholder="Client, buyer, claim, task, room, or workflow"></label>',
      '      <label>Status<select name="status"><option>Intake</option><option>Draft</option><option>Active</option><option>Needs proof</option><option>Operator review</option><option>QA review</option><option>Client ready</option><option>Ready for handoff</option></select></label>',
      '      <label>Priority<select name="priority"><option>Standard</option><option>Low</option><option>High</option><option>Critical</option><option>Founder review</option></select></label>',
      '      <label>Proof status<select name="proofStatus"><option>Missing</option><option>Partial</option><option>Linked</option><option>Verified</option></select></label>',
      '      <label>Risk level<select name="risk"><option>Medium</option><option>Low</option><option>High</option><option>Do not publish yet</option></select></label>',
      '      <label>Impact value<input name="impactValue" type="number" inputmode="decimal" placeholder="0"></label>',
      '      <label>Review date<input name="reviewDate" type="date"></label>',
      '      <label>Next action<input name="nextAction" placeholder="The next real action this surface should drive"></label>',
      '      <label class="zero-wide">Proof link<input name="proofLink" type="url" placeholder="../proof/proof-center.html"></label>',
      '      <label class="zero-wide">Surface claim or incoming signal<textarea name="signal" placeholder="Write what this surface claims to do, or paste the real buyer/client/operator signal."></textarea></label>',
      '      <label class="zero-wide">Operator notes<textarea name="notes" placeholder="Known blockers, evidence, limits, owner notes, or handoff details."></textarea></label>',
      '      <div class="button-row zero-actions">',
      '        <button type="button" data-zero-save>Save</button>',
      '        <button type="button" data-zero-export-json>Export JSON</button>',
      '        <button type="button" data-zero-export-md>Export MD</button>',
      '        <button type="button" data-zero-copy>Copy receipt</button>',
      '        <button type="button" data-zero-clear>Clear</button>',
      '      </div>',
      '    </form>',
      '    <aside class="zero-mini-preview">',
      '      <div class="zero-score-card"><span>Surface score</span><strong data-zero-score>0</strong><small data-zero-status>Incomplete record</small></div>',
      '      <div class="zero-route-card"><span>Route</span><p data-zero-route>Start the record.</p></div>',
      '      <div class="zero-result" data-zero-output></div>',
      '    </aside>',
      '  </div>',
      '  <pre class="tool-output zero-receipt" data-zero-receipt></pre>',
      '</section>'
    ].join('');
  }

  function revealFunctionalHost(host){
    if(!host) return;
    host.classList.add('skye-text-visible');
    host.querySelectorAll('.skye-text-reveal').forEach(el => {
      el.classList.add('skye-text-visible');
    });
  }

  function mountUniversalWorkbench(){
    const folder = platformFolder();
    if(!PLATFORM_FOLDERS.has(folder)) return;
    if(location.pathname.includes('/ascension/')) return;
    if(document.querySelector('[data-zero-universal], [data-ascension-mini-app]')) return;
    if(document.querySelector('.zero-mini-enhanced')) return;

    const context = classifySurface();
    const title = pageTitle();
    const main = document.querySelector('main') || document.body;
    if(!main) return;
    main.insertAdjacentHTML('beforeend', workbenchHtml(context, title));
    const host = document.querySelector('[data-zero-universal]');
    revealFunctionalHost(host);
    wireZeroHost(host, storageKey(location.pathname), context, title);
  }

  function collectPanelData(panel){
    const data = {
      recordName: panel.querySelector('h1,h2,h3')?.textContent?.trim() || pageTitle(),
      owner: '',
      target: pageTitle(),
      status: 'Operator review',
      priority: 'Standard',
      proofStatus: 'Partial',
      proofLink: '',
      risk: 'Medium',
      impactValue: '',
      nextAction: '',
      reviewDate: '',
      signal: '',
      notes: ''
    };
    const fields = [...panel.querySelectorAll('input, textarea, select')];
    fields.forEach((field, index) => {
      const name = field.name || field.dataset.field || field.id || `field_${index}`;
      const value = field.type === 'checkbox' ? (field.checked ? field.value || 'checked' : '') : field.value;
      if(/owner/i.test(name)) data.owner = value;
      else if(/status|stage/i.test(name)) data.status = statusFrom(value);
      else if(/priority/i.test(name)) data.priority = priorityFrom(value);
      else if(/risk|approval|legal|compliance/i.test(name)) data.risk = riskFrom(value);
      else if(/proof|evidence/i.test(name)) data.proofStatus = proofFrom(value);
      else if(/date|review/i.test(name)) data.reviewDate = value;
      else if(/next|action/i.test(name)) data.nextAction = value;
      else if(/value|price|amount|budget|pipeline|revenue/i.test(name)) data.impactValue = value;
      else if(/link|url/i.test(name)) data.proofLink = value;
      else if(!data.signal && value) data.signal = value;
      else if(value) data.notes += `${name}: ${value}\n`;
    });
    return data;
  }

  function statusFrom(value){
    const text = String(value || '').toLowerCase();
    if(/ready|handoff|complete|client/.test(text)) return 'Ready for handoff';
    if(/qa|review|approval|founder|compliance/.test(text)) return 'Operator review';
    if(/active|delivery|progress/.test(text)) return 'Active';
    if(/proof|evidence/.test(text)) return 'Needs proof';
    if(/draft|normal|standard/.test(text)) return 'Draft';
    return 'Intake';
  }

  function priorityFrom(value){
    const text = String(value || '').toLowerCase();
    if(/critical|revenue/.test(text)) return 'Critical';
    if(/high|founder|compliance|sensitive/.test(text)) return 'High';
    if(/low/.test(text)) return 'Low';
    return 'Standard';
  }

  function riskFrom(value){
    const text = String(value || '').toLowerCase();
    if(/do not|legal|compliance|founder|professional|required|sensitive/.test(text)) return 'High';
    if(/high/.test(text)) return 'High';
    if(/low|no/.test(text)) return 'Low';
    return 'Medium';
  }

  function proofFrom(value){
    const text = String(value || '').toLowerCase();
    if(/verified|ready|client|qa|complete/.test(text)) return 'Verified';
    if(/link|receipt|evidence|collected/.test(text)) return 'Linked';
    if(/partial|draft|pending|operator/.test(text)) return 'Partial';
    return 'Missing';
  }

  function enhanceExistingTools(){
    const selectors = [
      '.tool-panel[data-tool]',
      '.tool-panel',
      '.form-shell[data-crown-tool]',
      '.crown-tool[data-crown-tool]',
      '.saas-tool',
      '.local-tool',
      'form.asc-tool'
    ];
    document.querySelectorAll(selectors.join(',')).forEach((panel, index) => {
      if(panel.closest('[data-zero-universal], [data-ascension-mini-app]')) return;
      if(location.pathname.includes('/ascension/') && panel.matches('form.asc-tool')) return;
      if(panel.dataset.zeroEnhanced === 'true') return;
      if(!panel.querySelector('input,textarea,select')) return;

      panel.dataset.zeroEnhanced = 'true';
      panel.classList.add('zero-mini-enhanced');
      const context = classifySurface(panel.innerText);
      const title = panel.querySelector('h1,h2,h3')?.textContent?.trim() || pageTitle();
      const id = panel.dataset.tool || panel.dataset.crownTool || panel.id || `${location.pathname}#tool-${index}`;
      panel.insertAdjacentHTML('beforeend', [
        '<div class="zero-tool-bridge">',
        '  <div class="zero-mini-strip">',
        '    <span><b data-zero-score>0</b>0S score</span>',
        '    <span><b data-zero-status>Not saved</b>Status</span>',
        '    <span><b data-zero-secondary>Partial</b>Proof</span>',
        '  </div>',
        '  <div class="button-row zero-actions">',
        '    <button type="button" data-zero-save>Generate 0S Receipt</button>',
        '    <button type="button" data-zero-export-json>Export 0S JSON</button>',
        '    <button type="button" data-zero-export-md>Export 0S MD</button>',
        '  </div>',
        '  <div class="zero-result" data-zero-output></div>',
        '  <pre class="tool-output zero-receipt" data-zero-receipt></pre>',
        '</div>'
      ].join(''));
      revealFunctionalHost(panel);
      wireZeroHost(panel, storageKey(id), context, title, () => collectPanelData(panel));
    });
  }

  function wireZeroHost(host, key, context, title, collector){
    if(!host) return;
    revealFunctionalHost(host);
    const form = host.querySelector('.zero-mini-form');
    const collect = collector || (() => formData(form));
    const saved = readJson(key, null);
    if(saved && saved.data && form){
      Object.entries(saved.data).forEach(([name, value]) => {
        const field = form.elements[name];
        if(field) field.value = value;
      });
    }
    const update = () => {
      const record = buildRecord(key, collect(), context, title);
      renderResult(host, record);
      return record;
    };
    if(form){
      form.addEventListener('input', update);
      form.addEventListener('change', update);
    }
    host.querySelectorAll('[data-zero-save]').forEach(button => {
      button.addEventListener('click', () => {
        const record = update();
        localStorage.setItem(key, JSON.stringify(record, null, 2));
        writeLedger(record);
        const receipt = host.querySelector('[data-zero-receipt]');
        if(receipt) receipt.textContent = `${record.markdown}\n\nSaved locally: ${record.savedAt}`;
        mountPlatformCockpit();
      });
    });
    host.querySelectorAll('[data-zero-export-json]').forEach(button => {
      button.addEventListener('click', () => {
        const record = update();
        download(`${slug(record.title)}-0s-receipt.json`, JSON.stringify(record, null, 2), 'application/json');
      });
    });
    host.querySelectorAll('[data-zero-export-md]').forEach(button => {
      button.addEventListener('click', () => {
        const record = update();
        download(`${slug(record.title)}-0s-receipt.md`, record.markdown, 'text/markdown');
      });
    });
    host.querySelectorAll('[data-zero-copy]').forEach(button => {
      button.addEventListener('click', async () => {
        const record = update();
        try{ await navigator.clipboard.writeText(record.markdown); }catch(_err){}
        const receipt = host.querySelector('[data-zero-receipt]');
        if(receipt) receipt.textContent = `${record.markdown}\n\nCopied to clipboard.`;
      });
    });
    host.querySelectorAll('[data-zero-clear]').forEach(button => {
      button.addEventListener('click', () => {
        localStorage.removeItem(key);
        if(form) form.reset();
        const record = update();
        const receipt = host.querySelector('[data-zero-receipt]');
        if(receipt) receipt.textContent = `${record.title} local 0S record cleared.`;
      });
    });
    update();
  }

  function mountPlatformCockpit(){
    const folder = platformFolder();
    if(!PLATFORM_FOLDERS.has(folder)) return;
    if(!/\/index\.html$|\/$/.test(location.pathname)) return;
    if(location.pathname.includes('/ascension/')) return;
    const main = document.querySelector('main') || document.body;
    if(!main) return;
    const records = readLedger().filter(item => item.platform === folder);
    const avg = records.length ? Math.round(records.reduce((sum, item) => sum + (item.result?.score || 0), 0) / records.length) : 0;
    const ready = records.filter(item => (item.result?.score || 0) >= 82).length;
    const needsProof = records.filter(item => /proof|Incomplete|Do not publish/i.test(item.result?.status || '') || (item.result?.score || 0) < 64).length;
    const html = [
      '<section class="section zero-platform-cockpit" data-zero-platform-cockpit>',
      '  <div class="zero-mini-head">',
      '    <p class="eyebrow">0S platform cockpit</p>',
      `    <h2>${escapeHtml(folder.replace(/-/g, ' '))} local records</h2>`,
      '    <div class="zero-mini-strip">',
      `      <span><b>${avg}</b>Average score</span>`,
      `      <span><b>${ready}</b>Ready surfaces</span>`,
      `      <span><b>${needsProof}</b>Needs work</span>`,
      '    </div>',
      '  </div>',
      '  <div class="zero-ledger-grid">',
      (records.length ? records.slice(0, 12).map(record => [
        '<article class="zero-ledger-card">',
        `  <span>${escapeHtml(record.context?.lane || 'surface')}</span>`,
        `  <h3>${escapeHtml(record.title)}</h3>`,
        `  <strong>${record.result?.score || 0}/100</strong>`,
        `  <p>${escapeHtml(record.result?.status || 'Not saved')}</p>`,
        `  <small>${escapeHtml(record.path)}</small>`,
        '</article>'
      ].join('')).join('') : '<p class="wide">No local 0S records yet. Open a surface, generate a receipt, and this cockpit will fill itself.</p>'),
      '  </div>',
      '</section>'
    ].join('');
    const existing = document.querySelector('[data-zero-platform-cockpit]');
    if(existing) existing.outerHTML = html;
    else {
      const firstGrid = main.querySelector('.route-grid,.grid.cards,.upgrade-grid');
      (firstGrid?.closest('section') || main).insertAdjacentHTML(firstGrid ? 'beforebegin' : 'beforeend', html);
    }
    revealFunctionalHost(document.querySelector('[data-zero-platform-cockpit]'));
  }

  function boot(){
    enhanceExistingTools();
    mountUniversalWorkbench();
    mountPlatformCockpit();
  }

  window.ZeroSurfaceApps = {
    version: VERSION,
    evaluate,
    classifySurface,
    exportLedger(){
      download('metraiyux-0s-surface-ledger.json', JSON.stringify(readLedger(), null, 2), 'application/json');
    },
    clearLedger(){
      localStorage.removeItem(LEDGER_KEY);
      mountPlatformCockpit();
    }
  };

  onReady(boot);
})();

(function(){
  if(window.__metraiyuxZeroGuide) return;
  window.__metraiyuxZeroGuide = true;

  const VERSION = '2026-05-17-self-guided-0s';
  const STORE_KEY = 'metraiyux0s.guide.state.v1';

  const JOURNEYS = [
    {
      id: 'first-run',
      title: 'First Run Command Tour',
      audience: 'New user',
      minutes: '12 min',
      description: 'A complete first pass through the command deck, brain router, sales proof, client operations, admin brain, and training layer.',
      steps: [
        {
          title: 'Start at the command surface',
          path: 'index.html',
          selector: '.hero-actions',
          body: 'Use the first screen as the launch board. The primary buttons open the admin brain, neural map, customer signup, client preview, charter, and Cabinet Brain.',
          action: 'Study the highlighted launch controls, then press Next control.'
        },
        {
          title: 'Read the proof route strip',
          path: 'index.html',
          selector: '#live-surface-command-strip',
          body: 'This strip shows the live surfaces users should reach for first: public overview, brain wall, proof router, neural map, and FS27 gate proof.',
          action: 'Review the proof routes, then press Next room to enter the Cabinet Brain.'
        },
        {
          title: 'Ask the Cabinet Brain',
          path: 'local-brain.html',
          selector: '#brainQuestion',
          body: 'The Cabinet Brain teaches what brain owns a question, which reviewer checks it, and which live proof surface should be sent.',
          action: 'Type a real business question and run it through the Cabinet Brain.'
        },
        {
          title: 'Learn the sales path',
          path: 'sales-enablement/index.html',
          selector: '.ultra-grid',
          body: 'The Sales Kit is where AEs learn what to show, what to say, which objections to handle, and where proof belongs in the demo.',
          action: 'Open the Live Proof Router or Discovery Blueprint.'
        },
        {
          title: 'Learn client operations',
          path: 'client-os/index.html',
          selector: '.ultra-grid',
          body: 'Client OS teaches onboarding, status, documents, escalation, renewals, and the client preview workspace.',
          action: 'Open the Onboarding Wizard and see what data a client handoff needs.'
        },
        {
          title: 'Try the Main Automation Brain',
          path: 'admin/automation-brain.html',
          selector: '.brain-command-row',
          body: 'The admin brain is the command window. Fast commands show what the system can route, draft, queue, and require for approval.',
          action: 'Click a fast command, then inspect the ledger and approval language.'
        },
        {
          title: 'Check proof and safety',
          path: 'proof/proof-center.html',
          selector: '.upgrade-table',
          body: 'The Proof Center separates built assets from operator-required tasks. Users should learn this before they make public claims.',
          action: 'Review which items are built and which require real setup.'
        },
        {
          title: 'Finish in training',
          path: 'training-academy/index.html',
          selector: '.zero-academy-journeys',
          body: 'Training Academy turns the tour into role-specific practice. Each role can start a guided journey and save local training records.',
          action: 'Choose the role that matches the user and start that path.'
        }
      ]
    },
    {
      id: 'admin-operator',
      title: 'Admin Operator Walkthrough',
      audience: 'Owner/admin',
      minutes: '18 min',
      description: 'Teaches the private command window, worker endpoint, token validation, fast commands, approval gates, and smoke tests.',
      steps: [
        {
          title: 'Open the admin command room',
          path: 'admin/automation-brain.html',
          selector: '.admin-hero',
          body: 'This room explains the difference between private operator receipt mode and deployed Cloudflare Worker mode.',
          action: 'Read the mode banner before sending commands.'
        },
        {
          title: 'Connect the Worker when available',
          path: 'admin/automation-brain.html',
          selector: '#endpointInput',
          body: 'The Worker origin and admin token turn the brain from private operator receipts into shared operational automation.',
          action: 'Paste the Worker origin only when the deployed endpoint is ready.'
        },
        {
          title: 'Send a command safely',
          path: 'admin/automation-brain.html',
          selector: '#adminMessage',
          body: 'The composer is for routing real work. Strong commands name the goal, the cabinet owner, the reviewer, and the approval gate.',
          action: 'Use a concrete command, not a vague request.'
        },
        {
          title: 'Use fast commands as templates',
          path: 'admin/automation-brain.html',
          selector: '.brain-command-row',
          body: 'Fast commands show the expected grammar for social, lead, client, government, proof, security, and deployment tasks.',
          action: 'Click one and inspect the draft before approving anything.'
        },
        {
          title: 'Export the ledger',
          path: 'admin/automation-brain.html',
          selector: '#exportAdminBrain',
          body: 'Ledger export is how an operator proves what was asked, routed, saved, and kept approval-gated.',
          action: 'Export before handoff or live operational claims.'
        },
        {
          title: 'Open the admin tutorial map',
          path: 'admin/tutorial/index.html',
          selector: '.tutorial-nav',
          body: 'The tutorial index is the deep reference map for login modes, brain routing, proof, Cloudflare, Resend, connectors, and safety.',
          action: 'Use the numbered lessons as the reference manual.'
        },
        {
          title: 'Review approval gates',
          path: 'admin/tutorial/09-approval-gates.html',
          selector: 'main',
          body: 'Money, contracts, hiring, filings, legal/tax advice, security claims, and public claims stay human-approved.',
          action: 'Do not let users treat automation as permission.'
        },
        {
          title: 'Run final smoke checks',
          path: 'admin/tutorial/22-operator-final-smoke.html',
          selector: 'main',
          body: 'Before calling the admin layer live, prove chat, persistence, approvals, provider state, and export receipts.',
          action: 'Finish only when the proof path is visible.'
        }
      ]
    },
    {
      id: 'ae-sales',
      title: 'AE Sales Demo Walkthrough',
      audience: 'Account executive',
      minutes: '16 min',
      description: 'Teaches AEs how to qualify a buyer, choose proof, handle objections, run a demo, build a proposal, and close without overclaiming.',
      steps: [
        {
          title: 'Open the Sales Kit',
          path: 'sales-enablement/index.html',
          selector: '.ultra-grid',
          body: 'This is the AE command library. Every demo should start from the buyer problem and move toward live proof.',
          action: 'Start with the Live Proof Router.'
        },
        {
          title: 'Route the buyer to proof',
          path: 'sales/live-proof-router.html',
          selector: 'main',
          body: 'The proof router matches buyer pain to the right live surface so an AE does not improvise unsupported claims.',
          action: 'Pick a buyer pain and open the recommended route.'
        },
        {
          title: 'Run discovery',
          path: 'sales-enablement/discovery-blueprint.html',
          selector: 'main',
          body: 'Discovery maps pain, urgency, stakeholders, budget, authority, timeline, and risk before proposals are discussed.',
          action: 'Use the question bank before showing too much product.'
        },
        {
          title: 'Handle objections',
          path: 'sales-enablement/objection-matrix.html',
          selector: 'main',
          body: 'Objection handling keeps price, trust, timing, staffing reliability, and technology skepticism grounded in proof.',
          action: 'Choose the objection that matches the buyer.'
        },
        {
          title: 'Run the demo room',
          path: 'sales-enablement/demo-room-script.html',
          selector: 'main',
          body: 'The demo script gives a show flow that avoids drowning buyers in private implementation detail.',
          action: 'Show command, proof, client operations, and next step.'
        },
        {
          title: 'Build the proposal',
          path: 'proposal-center/index.html',
          selector: '.route-grid',
          body: 'Proposal Center gives scope modules, timeline, pricing narrative, contracting boundaries, and handoff language.',
          action: 'Use proposal modules after buyer fit is clear.'
        },
        {
          title: 'Practice the AE certification path',
          path: 'training-academy/ae-certification-path.html',
          selector: '.tool-panel',
          body: 'The AE training page records the current status, evidence, blockers, next action, approval, and review date.',
          action: 'Save a local training record.'
        }
      ]
    },
    {
      id: 'client-success',
      title: 'Client Success Walkthrough',
      audience: 'Client success',
      minutes: '15 min',
      description: 'Teaches onboarding, document requests, status boards, escalation, renewal reviews, and handoff discipline.',
      steps: [
        {
          title: 'Open Client OS',
          path: 'client-os/index.html',
          selector: '.ultra-grid',
          body: 'Client OS is the front-office surface for intake, onboarding, status, renewal, escalation, and document control.',
          action: 'Use this hub before opening individual tools.'
        },
        {
          title: 'Collect onboarding data',
          path: 'client-os/onboarding-wizard.html',
          selector: 'main',
          body: 'The onboarding wizard captures stakeholders, scope, files, access, timeline, and communication preferences.',
          action: 'Fill the fields from a realistic client scenario.'
        },
        {
          title: 'Request documents cleanly',
          path: 'client-os/document-request-center.html',
          selector: 'main',
          body: 'The document center keeps requests client-facing and avoids exposing internal notes.',
          action: 'Use a checklist instead of scattered messages.'
        },
        {
          title: 'Track account status',
          path: 'client-os/status-board.html',
          selector: 'main',
          body: 'The status board shows phase, risk, next action, owner, and renewal timing.',
          action: 'Update status before escalation or renewal.'
        },
        {
          title: 'Escalate with proof',
          path: 'client-os/escalation-desk.html',
          selector: 'main',
          body: 'Escalation requires severity, owner, promised response, proof required, and resolution notes.',
          action: 'Capture the issue before promising a fix.'
        },
        {
          title: 'Prepare renewal review',
          path: 'client-os/renewal-review.html',
          selector: 'main',
          body: 'Renewal review gathers account health, ROI notes, service issues, and expansion paths.',
          action: 'Do not wait until the renewal date to collect evidence.'
        },
        {
          title: 'Save client success training',
          path: 'training-academy/client-success-training.html',
          selector: '.tool-panel',
          body: 'The training tool saves owner, status, evidence, blockers, next action, approval, and review date locally.',
          action: 'Export a record after the practice run.'
        }
      ]
    },
    {
      id: 'recruiting-staffing',
      title: 'Recruiting and Staffing Walkthrough',
      audience: 'Recruiter',
      minutes: '14 min',
      description: 'Teaches job orders, candidate scoring, placement workflow, client onboarding packets, and recruiter training records.',
      steps: [
        {
          title: 'Open recruiting operations',
          path: 'recruiting/index.html',
          selector: '.route-grid',
          body: 'Recruiting Operations groups job orders, scorecards, placement workflow, and client onboarding materials.',
          action: 'Start from the hub to avoid skipping the intake step.'
        },
        {
          title: 'Capture the job order',
          path: 'recruiting/job-order-intake.html',
          selector: '.form-shell',
          body: 'A job order needs role, headcount, location, schedule, pay range, requirements, and urgency.',
          action: 'Save a test order locally.'
        },
        {
          title: 'Score the candidate',
          path: 'recruiting/candidate-scorecard.html',
          selector: '.form-shell',
          body: 'The scorecard evaluates role fit, reliability, skill match, and client-fit risk.',
          action: 'Calculate and save a sample score.'
        },
        {
          title: 'Follow placement workflow',
          path: 'recruiting/placement-workflow.html',
          selector: '.timeline',
          body: 'Placement moves from accepted job order to sourcing, submission, onboarding, and post-start check-in.',
          action: 'Use the timeline to explain where the candidate is.'
        },
        {
          title: 'Prepare client onboarding packet',
          path: 'recruiting/client-onboarding-packet.html',
          selector: '.upgrade-grid',
          body: 'The packet organizes client information, role information, and delivery rhythm.',
          action: 'Use it before sending a staffing client live.'
        },
        {
          title: 'Save recruiter training',
          path: 'training-academy/recruiter-training-path.html',
          selector: '.tool-panel',
          body: 'The training record captures proof that the recruiter knows the workflow.',
          action: 'Export a record for handoff.'
        }
      ]
    },
    {
      id: 'proof-governance',
      title: 'Proof and Governance Walkthrough',
      audience: 'QA, operator, founder',
      minutes: '17 min',
      description: 'Teaches proof receipts, launch evidence, claims review, governance, policies, and operator content control.',
      steps: [
        {
          title: 'Start with Proof Center',
          path: 'proof/proof-center.html',
          selector: '.upgrade-table',
          body: 'Proof Center tells users what is built, what is blocked, and what needs real operator setup.',
          action: 'Read the status table before making claims.'
        },
        {
          title: 'Open Proof Vault',
          path: 'proof-vault/index.html',
          selector: '.grid.cards,.route-grid,.upgrade-grid,main',
          body: 'Proof Vault stores release receipts and readiness evidence for training, portal QA, branch launch, and security upgrades.',
          action: 'Pick the receipt that matches the claim.'
        },
        {
          title: 'Use Proof Export',
          path: 'proof-export/index.html',
          selector: '.route-grid,.grid.cards,.upgrade-grid,main',
          body: 'Proof Export creates release receipts, claims sheets, link audits, content freeze records, and launch handoff evidence.',
          action: 'Generate export evidence before publishing.'
        },
        {
          title: 'Review governance',
          path: 'governance/index.html',
          selector: '.route-grid,.grid.cards,.upgrade-grid,main',
          body: 'Governance organizes resolutions, authority, minutes, delegation, and founder approvals.',
          action: 'Separate planning language from legal filings.'
        },
        {
          title: 'Check policies',
          path: 'policies/index.html',
          selector: '.route-grid,.grid.cards,.upgrade-grid,main',
          body: 'Policies explain privacy, terms, accessibility, data handling, and no-legal-advice boundaries.',
          action: 'Use policies to keep public claims safer.'
        },
        {
          title: 'Finish in Operator Command',
          path: 'operator/index.html',
          selector: '.route-grid,.grid.cards,.upgrade-grid,main',
          body: 'Operator Command is where deployment runbooks, provider maps, content freeze, and brain tests belong.',
          action: 'Run this path before launch handoff.'
        }
      ]
    }
  ];

  const CONTEXTS = [
    {
      test: path => path === 'index.html',
      title: 'Home command deck',
      body: 'This page is the map. Use it to launch the brain, proof routes, sales kit, client OS, admin OS, and training.',
      journey: 'first-run'
    },
    {
      test: path => path === 'local-brain.html',
      title: 'Cabinet Brain room',
      body: 'Use this room to ask where a question belongs, which cabinet owns it, which reviewer checks it, and what proof link to send.',
      journey: 'first-run'
    },
    {
      test: path => path.startsWith('admin/'),
      title: 'Admin operating room',
      body: 'This is protected operator territory. Teach users command syntax, approval gates, worker setup, ledgers, and proof before live actions.',
      journey: 'admin-operator'
    },
    {
      test: path => path.startsWith('sales') || path.startsWith('sales-enablement') || path.startsWith('proposal-center'),
      title: 'Sales and proposal room',
      body: 'Use this path to teach discovery, proof routing, objections, demo flow, proposals, and handoff language.',
      journey: 'ae-sales'
    },
    {
      test: path => path.startsWith('client-os') || path.startsWith('client-preview'),
      title: 'Client operations room',
      body: 'Use this path to teach onboarding, status, document requests, escalations, renewals, and client-ready handoff.',
      journey: 'client-success'
    },
    {
      test: path => path.startsWith('recruiting') || path.startsWith('candidates'),
      title: 'Recruiting and staffing room',
      body: 'Use this path to teach job order intake, candidate scoring, placement flow, and staffing client onboarding.',
      journey: 'recruiting-staffing'
    },
    {
      test: path => path.startsWith('proof') || path.startsWith('proof-vault') || path.startsWith('proof-export') || path.startsWith('governance') || path.startsWith('policies') || path.startsWith('operator'),
      title: 'Proof and governance room',
      body: 'Use this path to teach receipts, claims review, content freeze, governance, policies, and launch evidence.',
      journey: 'proof-governance'
    },
    {
      test: path => path.startsWith('training-academy') || path.startsWith('walkthroughs'),
      title: 'Training and walkthrough room',
      body: 'This is where users pick a role, start a guided path, practice the workflow, and save local completion records.',
      journey: 'first-run'
    }
  ];

  const LESSON_COACHES = {
    'training-academy/ae-certification-path.html': {
      title: 'AE lesson coach',
      body: 'Complete this after walking through Sales Kit, Proof Router, Discovery Blueprint, Objection Matrix, Demo Script, and Proposal Center.',
      journey: 'ae-sales'
    },
    'training-academy/recruiter-training-path.html': {
      title: 'Recruiter lesson coach',
      body: 'Complete this after job order intake, candidate scoring, placement workflow, and staffing client onboarding packet practice.',
      journey: 'recruiting-staffing'
    },
    'training-academy/client-success-training.html': {
      title: 'Client success lesson coach',
      body: 'Complete this after onboarding wizard, document request, status board, escalation desk, and renewal room practice.',
      journey: 'client-success'
    },
    'training-academy/operator-training-library.html': {
      title: 'Operator lesson coach',
      body: 'Complete this after the first-run tour, admin operator walkthrough, proof center, and operator command room.',
      journey: 'admin-operator'
    },
    'training-academy/cabinet-leader-onboarding.html': {
      title: 'Cabinet leader lesson coach',
      body: 'Complete this after reviewing the cabinet dashboards, governance center, proof center, and admin approval gates.',
      journey: 'proof-governance'
    }
  };

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function currentSitePath(){
    const marker = '/metraiyux_0s_site/';
    let path = location.pathname.replace(/\\/g, '/');
    const index = path.indexOf(marker);
    if(index >= 0) path = path.slice(index + marker.length);
    else path = path.replace(/^\/+/, '');
    if(!path || path.endsWith('/')) path += 'index.html';
    return path.replace(/^\.?\//, '');
  }

  function normalizePath(path){
    let normalized = String(path || 'index.html').replace(/^\/+/, '').replace(/^\.?\//, '');
    if(!normalized || normalized.endsWith('/')) normalized += 'index.html';
    return normalized;
  }

  function depthPrefix(){
    const path = currentSitePath();
    const depth = Math.max(0, path.split('/').length - 1);
    return '../'.repeat(depth);
  }

  function hrefFor(path){
    return depthPrefix() + normalizePath(path);
  }

  function isCurrentPath(path){
    return normalizePath(path) === normalizePath(currentSitePath());
  }

  function readState(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    }catch(_err){
      return {};
    }
  }

  function writeState(state){
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...state, version: VERSION, updatedAt: new Date().toISOString() }));
  }

  function getJourney(id){
    return JOURNEYS.find(journey => journey.id === id) || JOURNEYS[0];
  }

  function progressFor(journey, saved){
    const completed = new Set(saved?.completed || []);
    return Math.round((completed.size / journey.steps.length) * 100);
  }

  function contextForPage(){
    const path = currentSitePath();
    return CONTEXTS.find(context => context.test(path)) || {
      title: '0S room',
      body: 'This room is part of the MetrAIyux 0S operating surface. Use the guide to connect it to the right workflow.',
      journey: 'first-run'
    };
  }

  function ensureRoot(){
    let root = document.querySelector('[data-zero-guide-root]');
    if(root) return root;
    root = document.createElement('div');
    root.dataset.zeroGuideRoot = 'true';
    root.innerHTML = [
      '<button class="zero-guide-launcher" type="button" data-zero-guide-open aria-expanded="false"><span>Guide</span><b>0S</b></button>',
      '<aside class="zero-guide-drawer" data-zero-guide-drawer hidden></aside>',
      '<section class="zero-guide-panel" data-zero-guide-panel hidden></section>',
      '<div class="zero-guide-spotlight" data-zero-guide-spotlight hidden></div>'
    ].join('');
    document.body.appendChild(root);
    return root;
  }

  function renderDrawer(){
    const root = ensureRoot();
    const drawer = root.querySelector('[data-zero-guide-drawer]');
    const state = readState();
    const context = contextForPage();
    const cards = JOURNEYS.map(journey => {
      const saved = state.journeys?.[journey.id] || {};
      const progress = progressFor(journey, saved);
      const activeStep = typeof saved.step === 'number' ? saved.step : 0;
      return [
        '<article class="zero-guide-card">',
        `  <div class="zero-guide-meta"><span>${escapeHtml(journey.audience)}</span><span>${escapeHtml(journey.minutes)}</span><span>${progress}% complete</span></div>`,
        `  <h3>${escapeHtml(journey.title)}</h3>`,
        `  <p>${escapeHtml(journey.description)}</p>`,
        '  <div class="zero-guide-progress" aria-hidden="true"><i style="--zero-guide-progress:' + progress + '%"></i></div>',
        '  <div class="zero-guide-actions">',
        `    <button class="zero-guide-button primary" type="button" data-zero-guide-start="${escapeHtml(journey.id)}">Start</button>`,
        `    <button class="zero-guide-button" type="button" data-zero-guide-resume="${escapeHtml(journey.id)}" data-zero-guide-step="${activeStep}">Resume</button>`,
        `    <button class="zero-guide-button" type="button" data-zero-guide-reset="${escapeHtml(journey.id)}">Reset</button>`,
        '  </div>',
        '</article>'
      ].join('');
    }).join('');

    drawer.innerHTML = [
      '<div class="zero-guide-head">',
      '  <div>',
      '    <p class="eyebrow">Self-guided 0S</p>',
      '    <h2>Pick a role and I will walk them through the command rooms.</h2>',
      '    <p>No human demo needed. The guide opens the right brain, proof, sales, client, admin, or governance surface, highlights the right control, and tracks progress locally.</p>',
      '  </div>',
      '  <button class="zero-guide-close" type="button" data-zero-guide-close aria-label="Close guide">x</button>',
      '</div>',
      '<div class="zero-guide-context">',
      `  <span class="zero-guide-pill">Current room</span><h3>${escapeHtml(context.title)}</h3>`,
      `  <p>${escapeHtml(context.body)}</p>`,
      '  <div class="zero-guide-actions">',
      `    <button class="zero-guide-button primary" type="button" data-zero-guide-start="${escapeHtml(context.journey)}">Guide this room</button>`,
      `    <a class="zero-guide-link" href="${escapeHtml(hrefFor('walkthroughs/index.html'))}">Open walkthrough center</a>`,
      `    <a class="zero-guide-link" href="${escapeHtml(hrefFor('training-academy/index.html'))}">Open academy</a>`,
      '  </div>',
      '</div>',
      '<div class="zero-guide-card-grid">',
      cards,
      '</div>'
    ].join('');
  }

  function openDrawer(){
    renderDrawer();
    const root = ensureRoot();
    root.querySelector('[data-zero-guide-drawer]').hidden = false;
    root.querySelector('[data-zero-guide-open]').setAttribute('aria-expanded', 'true');
  }

  function closeDrawer(){
    const root = ensureRoot();
    root.querySelector('[data-zero-guide-drawer]').hidden = true;
    root.querySelector('[data-zero-guide-open]').setAttribute('aria-expanded', 'false');
  }

  function clearHighlight(){
    document.querySelectorAll('.zero-guide-highlight').forEach(el => el.classList.remove('zero-guide-highlight'));
    const spotlight = ensureRoot().querySelector('[data-zero-guide-spotlight]');
    spotlight.hidden = true;
  }

  function targetForStep(step){
    if(step.selector){
      const selectors = step.selector.split(',').map(item => item.trim()).filter(Boolean);
      for(const selector of selectors){
        const found = document.querySelector(selector);
        if(found) return found;
      }
    }
    return document.querySelector('main h1, h1, main, body');
  }

  function positionSpotlight(target){
    const spotlight = ensureRoot().querySelector('[data-zero-guide-spotlight]');
    if(!target) return;
    const rect = target.getBoundingClientRect();
    const pad = 10;
    spotlight.style.left = `${Math.max(8, rect.left - pad)}px`;
    spotlight.style.top = `${Math.max(8, rect.top - pad)}px`;
    spotlight.style.width = `${Math.min(window.innerWidth - 16, rect.width + pad * 2)}px`;
    spotlight.style.height = `${Math.min(window.innerHeight - 16, rect.height + pad * 2)}px`;
    spotlight.hidden = false;
  }

  function highlightStep(step){
    clearHighlight();
    if(!isCurrentPath(step.path)) return;
    const target = targetForStep(step);
    if(!target) return;
    target.classList.add('zero-guide-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    window.setTimeout(() => positionSpotlight(target), 320);
  }

  function saveActive(id, stepIndex){
    const journey = getJourney(id);
    const state = readState();
    const current = state.journeys?.[id] || {};
    state.active = { id, step: stepIndex, autopilot: true };
    state.journeys = {
      ...(state.journeys || {}),
      [id]: {
        ...current,
        step: Math.max(0, Math.min(stepIndex, journey.steps.length - 1)),
        lastPath: journey.steps[Math.max(0, Math.min(stepIndex, journey.steps.length - 1))].path
      }
    };
    writeState(state);
  }

  function enterStep(id, stepIndex){
    const journey = getJourney(id);
    const boundedStep = Math.max(0, Math.min(stepIndex, journey.steps.length - 1));
    const step = journey.steps[boundedStep];
    saveActive(id, boundedStep);
    closeDrawer();
    if(!isCurrentPath(step.path)){
      location.assign(hrefFor(step.path));
      return true;
    }
    renderActive();
    return false;
  }

  function markComplete(id, stepIndex){
    const state = readState();
    const current = state.journeys?.[id] || {};
    const completed = Array.from(new Set([...(current.completed || []), stepIndex]));
    state.journeys = {
      ...(state.journeys || {}),
      [id]: { ...current, completed }
    };
    writeState(state);
  }

  function renderActive(){
    const root = ensureRoot();
    const panel = root.querySelector('[data-zero-guide-panel]');
    const state = readState();
    const active = state.active;
    document.body.classList.toggle('zero-guide-active', Boolean(active));
    if(!active){
      panel.hidden = true;
      clearHighlight();
      return;
    }

    const journey = getJourney(active.id);
    const stepIndex = Math.max(0, Math.min(active.step || 0, journey.steps.length - 1));
    const step = journey.steps[stepIndex];
    const saved = state.journeys?.[journey.id] || {};
    const completed = new Set(saved.completed || []);
    const stepCount = journey.steps.length;
    const progress = Math.round(((completed.size + (completed.has(stepIndex) ? 0 : .35)) / stepCount) * 100);
    const inRoom = isCurrentPath(step.path);
    const next = journey.steps[stepIndex + 1];
    const nextLabel = stepIndex === stepCount - 1
      ? 'Finish'
      : next && next.path !== step.path
        ? 'Next room'
        : 'Next control';
    const roomAction = inRoom
      ? '<span class="zero-guide-pill">You are in the right room</span>'
      : `<span class="zero-guide-pill">Entering ${escapeHtml(step.path)}</span>`;

    panel.innerHTML = [
      '<div class="zero-guide-panel-head">',
      '  <div>',
      `    <p class="eyebrow">${escapeHtml(journey.title)}</p>`,
      `    <h2>${escapeHtml(step.title)}</h2>`,
      '  </div>',
      '  <button class="zero-guide-close" type="button" data-zero-guide-panel-close aria-label="Close walkthrough">x</button>',
      '</div>',
      '<div class="zero-guide-progress" aria-hidden="true"><i style="--zero-guide-progress:' + Math.min(100, progress) + '%"></i></div>',
      `<div class="zero-guide-meta"><span>Step ${stepIndex + 1} of ${stepCount}</span><span>${escapeHtml(journey.audience)}</span><span>${escapeHtml(step.path)}</span></div>`,
      `<p>${escapeHtml(step.body)}</p>`,
      `<p><strong>Action:</strong> ${escapeHtml(step.action)}</p>`,
      '<div class="zero-guide-actions">',
      roomAction,
      `  <a class="zero-guide-link" href="${escapeHtml(hrefFor('training-academy/index.html'))}">Open academy</a>`,
      '</div>',
      '<div class="zero-guide-panel-actions">',
      `  <button class="zero-guide-button" type="button" data-zero-guide-prev="${escapeHtml(journey.id)}" ${stepIndex === 0 ? 'disabled' : ''}>Previous</button>`,
      `  <button class="zero-guide-button primary" type="button" data-zero-guide-next="${escapeHtml(journey.id)}">${nextLabel}</button>`,
      `  <button class="zero-guide-button" type="button" data-zero-guide-open-list="${escapeHtml(journey.id)}">View steps</button>`,
      '</div>'
    ].join('');
    panel.hidden = false;
    if(inRoom) highlightStep(step);
    else {
      clearHighlight();
      if(state.active?.autopilot){
        window.setTimeout(() => {
          if(!isCurrentPath(step.path)) location.assign(hrefFor(step.path));
        }, 120);
      }
    }
  }

  function startJourney(id, stepIndex = 0){
    enterStep(id, stepIndex);
  }

  function nextStep(id){
    const state = readState();
    const active = state.active || { id, step: 0 };
    const journey = getJourney(id);
    const stepIndex = Math.max(0, Math.min(active.step || 0, journey.steps.length - 1));
    markComplete(id, stepIndex);
    if(stepIndex >= journey.steps.length - 1){
      const nextState = readState();
      nextState.active = null;
      nextState.journeys = {
        ...(nextState.journeys || {}),
        [id]: {
          ...(nextState.journeys?.[id] || {}),
          finishedAt: new Date().toISOString()
        }
      };
      writeState(nextState);
      document.body.classList.remove('zero-guide-active');
      clearHighlight();
      ensureRoot().querySelector('[data-zero-guide-panel]').hidden = true;
      openDrawer();
      return;
    }
    enterStep(id, stepIndex + 1);
  }

  function previousStep(id){
    const state = readState();
    const active = state.active || { id, step: 0 };
    enterStep(id, Math.max(0, (active.step || 0) - 1));
  }

  function resetJourney(id){
    const state = readState();
    if(state.journeys?.[id]) delete state.journeys[id];
    if(state.active?.id === id) state.active = null;
    writeState(state);
    clearHighlight();
    renderDrawer();
    renderActive();
  }

  function showStepList(id){
    const journey = getJourney(id);
    const root = ensureRoot();
    const drawer = root.querySelector('[data-zero-guide-drawer]');
    const list = journey.steps.map((step, index) => [
      `<a href="${escapeHtml(hrefFor(step.path))}" data-zero-guide-jump="${escapeHtml(journey.id)}" data-zero-guide-step="${index}">`,
      `  <b>${index + 1}</b>`,
      '  <span>',
      `    <h4>${escapeHtml(step.title)}</h4>`,
      `    <p>${escapeHtml(step.action)}</p>`,
      '  </span>',
      '</a>'
    ].join('')).join('');
    drawer.innerHTML = [
      '<div class="zero-guide-head">',
      '  <div>',
      `    <p class="eyebrow">${escapeHtml(journey.audience)} path</p>`,
      `    <h2>${escapeHtml(journey.title)}</h2>`,
      `    <p>${escapeHtml(journey.description)}</p>`,
      '  </div>',
      '  <button class="zero-guide-close" type="button" data-zero-guide-close aria-label="Close guide">x</button>',
      '</div>',
      '<div class="zero-guide-step-list">',
      list,
      '</div>',
      '<div class="zero-guide-actions">',
      '  <button class="zero-guide-button" type="button" data-zero-guide-back>Back to journeys</button>',
      '</div>'
    ].join('');
    drawer.hidden = false;
  }

  function injectGuideNav(){
    const nav = document.querySelector('.site-header nav, .topnav, .nav-upgrade');
    if(!nav || nav.querySelector('[data-zero-guide-nav]')) return;
    if(nav.classList.contains('nav-usecase-menu')) return;
    const link = document.createElement('a');
    link.href = hrefFor('walkthroughs/index.html');
    link.dataset.zeroGuideNav = 'true';
    link.textContent = 'Walkthroughs';
    nav.appendChild(link);
  }

  function injectHomeGuideBand(){
    if(!isCurrentPath('index.html') || document.querySelector('[data-zero-guide-band]')) return;
    const hero = document.querySelector('main .hero, .hero');
    if(!hero) return;
    const band = document.createElement('section');
    band.className = 'section zero-guide-band';
    band.dataset.zeroGuideBand = 'true';
    band.innerHTML = [
      '<p class="eyebrow">Self-teaching operating system</p>',
      '<h2>I made 0S walk users through the command rooms instead of waiting for a human demo.</h2>',
      '<p class="wide">Start a role path and the guide opens the correct brain, proof, client, sales, admin, or governance room, highlights the right control, explains the action, and remembers progress in this browser.</p>',
      '<div class="zero-guide-card-grid">',
      JOURNEYS.slice(0, 6).map(journey => [
        '<article class="zero-guide-card">',
        `  <div class="zero-guide-meta"><span>${escapeHtml(journey.audience)}</span><span>${escapeHtml(journey.minutes)}</span></div>`,
        `  <h3>${escapeHtml(journey.title)}</h3>`,
        `  <p>${escapeHtml(journey.description)}</p>`,
        `  <button class="zero-guide-button primary" type="button" data-zero-guide-start="${escapeHtml(journey.id)}">Start walkthrough</button>`,
        '</article>'
      ].join('')).join(''),
      '</div>'
    ].join('');
    hero.insertAdjacentElement('afterend', band);
  }

  function injectLessonCoach(){
    const path = currentSitePath();
    const coach = LESSON_COACHES[path];
    if(!coach || document.querySelector('[data-zero-lesson-coach]')) return;
    const main = document.querySelector('main') || document.body;
    const firstSection = main.querySelector('section');
    const section = document.createElement('section');
    section.className = 'section zero-lesson-coach';
    section.dataset.zeroLessonCoach = 'true';
    section.innerHTML = [
      '<p class="eyebrow">Lesson coach</p>',
      `<h2>${escapeHtml(coach.title)}</h2>`,
      `<p>${escapeHtml(coach.body)}</p>`,
      '<div class="zero-guide-actions">',
      `  <button class="zero-guide-button primary" type="button" data-zero-guide-start="${escapeHtml(coach.journey)}">Start related walkthrough</button>`,
      `  <a class="zero-guide-link" href="${escapeHtml(hrefFor('walkthroughs/index.html'))}">Open walkthrough center</a>`,
      '</div>'
    ].join('');
    if(firstSection) firstSection.insertAdjacentElement('afterend', section);
    else main.prepend(section);
  }

  function bindEvents(){
    document.addEventListener('click', event => {
      const open = event.target.closest('[data-zero-guide-open]');
      if(open){
        const drawer = ensureRoot().querySelector('[data-zero-guide-drawer]');
        if(drawer.hidden) openDrawer();
        else closeDrawer();
        return;
      }

      if(event.target.closest('[data-zero-guide-close]')){
        closeDrawer();
        return;
      }

      if(event.target.closest('[data-zero-guide-panel-close]')){
        const state = readState();
        state.active = null;
        writeState(state);
        document.body.classList.remove('zero-guide-active');
        ensureRoot().querySelector('[data-zero-guide-panel]').hidden = true;
        clearHighlight();
        return;
      }

      const start = event.target.closest('[data-zero-guide-start]');
      if(start){
        event.preventDefault();
        startJourney(start.dataset.zeroGuideStart, 0);
        return;
      }

      const resume = event.target.closest('[data-zero-guide-resume]');
      if(resume){
        event.preventDefault();
        startJourney(resume.dataset.zeroGuideResume, Number(resume.dataset.zeroGuideStep || 0));
        return;
      }

      const reset = event.target.closest('[data-zero-guide-reset]');
      if(reset){
        event.preventDefault();
        resetJourney(reset.dataset.zeroGuideReset);
        return;
      }

      const next = event.target.closest('[data-zero-guide-next]');
      if(next){
        event.preventDefault();
        nextStep(next.dataset.zeroGuideNext);
        return;
      }

      const prev = event.target.closest('[data-zero-guide-prev]');
      if(prev){
        event.preventDefault();
        previousStep(prev.dataset.zeroGuidePrev);
        return;
      }

      const openList = event.target.closest('[data-zero-guide-open-list]');
      if(openList){
        event.preventDefault();
        showStepList(openList.dataset.zeroGuideOpenList);
        return;
      }

      if(event.target.closest('[data-zero-guide-back]')){
        event.preventDefault();
        renderDrawer();
        return;
      }

      const jump = event.target.closest('[data-zero-guide-jump]');
      if(jump){
        saveActive(jump.dataset.zeroGuideJump, Number(jump.dataset.zeroGuideStep || 0));
      }
    });

    window.addEventListener('resize', () => {
      const state = readState();
      if(state.active){
        const journey = getJourney(state.active.id);
        const step = journey.steps[state.active.step || 0];
        if(step && isCurrentPath(step.path)){
          const target = targetForStep(step);
          if(target) positionSpotlight(target);
        }
      }
    }, { passive: true });

    window.addEventListener('scroll', () => {
      const state = readState();
      if(state.active){
        const journey = getJourney(state.active.id);
        const step = journey.steps[state.active.step || 0];
        if(step && isCurrentPath(step.path)){
          const target = targetForStep(step);
          if(target) positionSpotlight(target);
        }
      }
    }, { passive: true });
  }

  function boot(){
    ensureRoot();
    renderDrawer();
    renderActive();
    injectGuideNav();
    injectHomeGuideBand();
    injectLessonCoach();
    bindEvents();
    window.MetrAIyuxZeroGuide = {
      version: VERSION,
      journeys: JOURNEYS,
      start: startJourney,
      state: readState
    };
  }

  onReady(boot);
})();

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js

(function(){
  if(window.__metraiyux0sBrandBackdrop) return;
  window.__metraiyux0sBrandBackdrop = true;

  const fallbackBrandLogos = [
    { name: 'MetrAIyux 0S', kind: 'platform', src: '/assets/metraiyux-0s-logo-transparent.png', x: '5%', y: '16%', size: '118px', dx: '42px', dy: '-26px', duration: '22s' },
    { name: 'MetrAIyux Emblem', kind: 'platform', src: '/assets/metraiyux-0s-emblem-transparent.png', x: '80%', y: '10%', size: '102px', dx: '-36px', dy: '32px', duration: '24s' },
    { name: 'SkyeMusicNexus', kind: 'platform', src: '/SkyeMusicNexus/assets/skye-music-nexus-logo.png', x: '60%', y: '35%', size: '112px', dx: '34px', dy: '42px', duration: '26s' },
    { name: 'Valley Verified', kind: 'client', src: '/valley-verified/assets/valley-verified-logo.png', x: '3%', y: '82%', size: '112px', dx: '56px', dy: '-38px', duration: '30s' }
  ];

  function ready(callback){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  async function loadBrandLogos(){
    try{
      const response = await fetch('/assets/brand-backdrop-logos.json', { cache: 'no-store' });
      if(!response.ok) throw new Error(`brand backdrop status ${response.status}`);
      const data = await response.json();
      return Array.isArray(data.logos) && data.logos.length ? data.logos : fallbackBrandLogos;
    } catch(_error){
      return fallbackBrandLogos;
    }
  }

  function makeBrandImage(logo, index){
    const image = document.createElement('img');
    image.src = logo.src;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.logoName = logo.name || `brand-${index + 1}`;
    image.dataset.logoKind = logo.kind || 'platform';
    image.style.setProperty('--x', logo.x || `${(index * 17) % 92}%`);
    image.style.setProperty('--y', logo.y || `${(index * 23) % 88}%`);
    image.style.setProperty('--s', logo.size || logo.s || '108px');
    image.style.setProperty('--dx', logo.dx || '38px');
    image.style.setProperty('--dy', logo.dy || '-28px');
    image.style.setProperty('--d', logo.duration || logo.d || `${22 + index}s`);
    return image;
  }

  async function mountBrandBackdrop(){
    const shouldMount = document.body.matches('.skyesol-living-page') && document.body.dataset.brandBackdrop !== 'off';
    const explicitTargets = Array.from(document.querySelectorAll('[data-brand-backdrop]'));
    if(!shouldMount && !explicitTargets.length) return;
    if(document.querySelector('.brand-backdrop')) return;

    const target = explicitTargets[0] || document.body;
    const backdrop = document.createElement('div');
    backdrop.className = 'brand-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    const logos = await loadBrandLogos();
    logos.forEach((logo, index) => backdrop.appendChild(makeBrandImage(logo, index)));

    if(target === document.body){
      document.body.insertBefore(backdrop, document.body.firstElementChild);
    } else {
      target.replaceWith(backdrop);
    }
    document.body.classList.add('brand-backdrop-mounted');
  }

  ready(mountBrandBackdrop);
})();

(function(){
  if(window.__metraiyux0sRelay13ChatBoot) return;
  window.__metraiyux0sRelay13ChatBoot = true;

  const currentScript = document.currentScript || Array.from(document.scripts).find(function(script){
    return /(?:^|\/)script\.js(?:\?|$)/.test(script.src || '');
  });
  const scriptBase = currentScript && currentScript.src ? new URL('.', currentScript.src) : new URL('/', window.location.href);

  function bootMetrAIyux0SChat(){
    if(window.MetrAIyuxWorkspaceChat && window.MetrAIyuxWorkspaceChat.__mounted) return;
    if(document.querySelector('script[data-metraiyux-workspace-chat-script]')) return;

    const existing = window.MetrAIyuxWorkspaceChatConfig || {};
    window.MetrAIyuxWorkspaceChatConfig = {
      workspaceId: 'ws_2533ccd0-08e2-48ec-b74c-f1389c7062a7',
      workspaceSlug: 'connectlog-main',
      clientName: 'MetrAIyux 0S',
      appName: 'MetrAIyux 0S Public System',
      launcherText: '0S live workspace chat',
      operatorName: 'MetrAIyux Operator',
      accent: '#64d6ff',
      apiBase: 'https://relay13-core.graylondonskyes.workers.dev/',
      welcomeText: 'Send a note into the MetrAIyux 0S live workspace lane.',
      accountDisclaimer: 'Messages are tied to the MetrAIyux 0S ConnectLog and Relay13 workspace for support, proof receipts, QA, and follow-up.',
      defaultRoute: 'brain-assisted',
      routeOptions: [
        { value: 'brain-assisted', label: 'Brain-assisted route' },
        { value: 'direct-operator', label: 'Direct to Gray/operator' }
      ],
      relayMetadata: {
        account_code: 'METRAIYUX-0S-SKM',
        skye_merit_account: true,
        source_app: 'metraiyux-0s-public-site',
        source_lane: 'public-workspace-chat',
        relay_bridge: 'connectlog-main'
      },
      connectLog: {
        enabled: true,
        cardId: 'metraiyux-0s-public-site',
        cardLabel: 'MetrAIyux 0S public website',
        campaign: '0S public workspace chat',
        ownerName: 'MetrAIyux Operator',
        ownerCompany: 'MetrAIyux 0S',
        ownerRole: 'Operator',
        welcomeMessage: 'MetrAIyux 0S public workspace chat opened through Relay13.',
        tags: ['metraiyux-0s', 'public-site', 'relay13', 'connectlog']
      },
      ...existing
    };

    const widgetScript = document.createElement('script');
    widgetScript.src = new URL('assets/js/workspace-chat-widget.js', scriptBase).toString();
    widgetScript.defer = true;
    widgetScript.dataset.metraiyuxWorkspaceChatScript = 'true';
    document.body.appendChild(widgetScript);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootMetrAIyux0SChat, { once: true });
  } else {
    bootMetrAIyux0SChat();
  }
})();
