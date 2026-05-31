(() => {
  const APP_KEY = 'omeg4command_6_7_state_v3';
  const DB_NAME = 'omegaCommandLocalFiles';
  const STORE_NAME = 'files';
  const SKYEMAIL_PLATFORM_ORIGIN = 'https://skyemail-platform.graylondonskyes.workers.dev';
  const SKYEMAIL_INBOX_HANDOFF = '/live/SkyeMail/session-handoff.html?next=dashboard.html&from=founder-command';
  const SKYEMAIL_COMPOSE_HANDOFF = '/live/SkyeMail/session-handoff.html?next=compose.html&from=founder-command';
  const OWNER_MARKETING_CONTACT_EMAIL = 'MediaOverLondon@solenterprises.org';
  const OWNER_MARKETING_CONTACT_PHONE = '1-(800)-484-4783';
  const OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS = [
    'grayskyes@solenterprises.org',
    'SkyesOverLondonLC@solenterprises.org',
    'skyesoverlondon222@gmail.com'
  ];
  let deferredFounderInstallPrompt = null;
  const SONG_VAULT = window.FOUNDER_SONG_VAULT || { songs: [], count: 0, totalBytes: 0 };
  const FOUNDER_SKYEMERIT = {
    code: 'SKYEMUSICNEXUS-LAUNCH-2000',
    packId: 'SKYEMUSICNEXUS-LAUNCH-MERIT-PACK',
    valueLabel: '$2,000',
    authLane: 'FS27/SkyGate/Free99 shared gate',
    pricingHref: '/data/skyemusicnexus-pricing.json',
    free99Href: '/data/free99-entitlements.json',
    skyePayHref: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&skyemerit_code=SKYEMUSICNEXUS-LAUNCH-2000'
  };
  const VALLEY_VERIFIED_ROUTE_INDEX_URL = '/data/skyenet-client-route-index.json';
  const VALLEY_VERIFIED_CLIENT_NAMES = {
    'arizona-biltmore-dentistry': 'Arizona Biltmore Dentistry',
    'as-you-wish-pottery-westgate': 'As You Wish Pottery Westgate',
    'burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b': 'Burch & Cracchiolo, P.A.',
    'dental-depot-orthodontics-phoenix': 'Dental Depot Orthodontics Phoenix',
    'empire-pallets': 'Empire Pallets',
    'fade-masters-phx': 'Fade Masters PHX',
    'fennemore-phoenix-85016-eb81f5b': 'Fennemore Phoenix',
    'gallagher-and-kennedy-p-a-phoenix-85016-887b1be': 'Gallagher & Kennedy, P.A.',
    'general-dentistry-4-kids-phoenix': 'General Dentistry 4 Kids Phoenix',
    'greenberg-traurig-llp-phoenix-85016-5f86b1d': 'Greenberg Traurig LLP Phoenix',
    'kutak-rock-llp-scottsdale-85253-00c0044': 'Kutak Rock LLP Scottsdale',
    'milligan-lawless-p-c-phoenix-85018-94ab8a4': 'Milligan Lawless P.C.',
    'next-level-gaming-az': 'Next Level Gaming AZ',
    'next-level-gaming-goodyear': 'Next Level Gaming Goodyear',
    'platz-juris-pllc-phoenix-85016-4e77b1f': 'PLATZ JURIS, PLLC',
    'valley-verified-marketplace': 'Valley Verified Marketplace'
  };
  const VALLEY_VERIFIED_SKYENET_FALLBACK_ROUTES = [
    { client_id: 'valley-verified-marketplace', public_url: 'https://skyenet.graylondonskyes.workers.dev/valley-verified-marketplace/', lane: 'marketplace-client-network' },
    { client_id: 'arizona-biltmore-dentistry', public_url: 'https://skyenet.graylondonskyes.workers.dev/arizona-biltmore-dentistry/' },
    { client_id: 'as-you-wish-pottery-westgate', public_url: 'https://skyenet.graylondonskyes.workers.dev/as-you-wish-pottery-westgate/' },
    { client_id: 'burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b', public_url: 'https://skyenet.graylondonskyes.workers.dev/burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b/' },
    { client_id: 'dental-depot-orthodontics-phoenix', public_url: 'https://skyenet.graylondonskyes.workers.dev/dental-depot-orthodontics-phoenix/' },
    { client_id: 'empire-pallets', public_url: 'https://skyenet.graylondonskyes.workers.dev/empire-pallets/' },
    { client_id: 'fade-masters-phx', public_url: 'https://skyenet.graylondonskyes.workers.dev/fade-masters-phx/' },
    { client_id: 'fennemore-phoenix-85016-eb81f5b', public_url: 'https://skyenet.graylondonskyes.workers.dev/fennemore-phoenix-85016-eb81f5b/' },
    { client_id: 'gallagher-and-kennedy-p-a-phoenix-85016-887b1be', public_url: 'https://skyenet.graylondonskyes.workers.dev/gallagher-and-kennedy-p-a-phoenix-85016-887b1be/' },
    { client_id: 'general-dentistry-4-kids-phoenix', public_url: 'https://skyenet.graylondonskyes.workers.dev/general-dentistry-4-kids-phoenix/' },
    { client_id: 'greenberg-traurig-llp-phoenix-85016-5f86b1d', public_url: 'https://skyenet.graylondonskyes.workers.dev/greenberg-traurig-llp-phoenix-85016-5f86b1d/' },
    { client_id: 'kutak-rock-llp-scottsdale-85253-00c0044', public_url: 'https://skyenet.graylondonskyes.workers.dev/kutak-rock-llp-scottsdale-85253-00c0044/' },
    { client_id: 'milligan-lawless-p-c-phoenix-85018-94ab8a4', public_url: 'https://skyenet.graylondonskyes.workers.dev/milligan-lawless-p-c-phoenix-85018-94ab8a4/' },
    { client_id: 'next-level-gaming-az', public_url: 'https://skyenet.graylondonskyes.workers.dev/next-level-gaming-az/' },
    { client_id: 'next-level-gaming-goodyear', public_url: 'https://skyenet.graylondonskyes.workers.dev/next-level-gaming-goodyear/' },
    { client_id: 'platz-juris-pllc-phoenix-85016-4e77b1f', public_url: 'https://skyenet.graylondonskyes.workers.dev/platz-juris-pllc-phoenix-85016-4e77b1f/' }
  ];

  const VIEW_LABELS = {
    command: 'Command',
    operations: 'Operations',
    core: 'Core Apps',
    calendar: 'Calendar',
    mailboxes: 'Mailboxes',
    clients: 'Clients',
    indexing: 'Indexing',
    assets: 'Real Assets',
    songs: 'Songs',
    'repo-vault': 'Repo Vault',
    repo: 'Repo Memory',
    skyenet: 'SkyeNet Backend',
    projects: 'Projects',
    founder: 'Founder Layer',
    templates: 'Intros',
    blocks: 'Blocks',
    backup: 'Backup'
  };

  const REAL_REPO_ASSETS = [
    {
      id: 'asset-founder-source',
      name: 'Gray London Skyes founder source',
      category: 'founder-layer',
      kind: 'png',
      mime: 'image/png',
      href: '/assets/gray-london-skyes-founder-actual-source.png',
      sourcePath: 'metraiyux_0s_site/assets/gray-london-skyes-founder-actual-source.png',
      notes: 'Actual deployed 0S founder image.'
    },
    {
      id: 'asset-founder-portrait',
      name: 'Gray London Skyes portrait',
      category: 'founder-layer',
      kind: 'jpg',
      mime: 'image/jpeg',
      href: '/assets/portraits/gray-london-skyes.jpg',
      sourcePath: 'metraiyux_0s_site/assets/portraits/gray-london-skyes.jpg',
      notes: 'Actual portrait asset from the 0S site.'
    },
    {
      id: 'asset-skye-deity-logo',
      name: 'Skyes Over London deity logo',
      category: 'brand-system',
      kind: 'png',
      mime: 'image/png',
      href: '/assets/skyes-over-london-deity-logo.png',
      sourcePath: 'metraiyux_0s_site/assets/skyes-over-london-deity-logo.png',
      notes: 'Primary Skyes Over London mark used by 0S surfaces.'
    },
    {
      id: 'asset-metraiyux-logo',
      name: 'MetrAIyux 0S transparent logo',
      category: 'brand-system',
      kind: 'png',
      mime: 'image/png',
      href: '/assets/metraiyux-0s-logo-transparent.png',
      sourcePath: 'metraiyux_0s_site/assets/metraiyux-0s-logo-transparent.png',
      notes: 'Actual 0S transparent logo.'
    },
    {
      id: 'asset-metraiyux-emblem',
      name: 'MetrAIyux 0S emblem',
      category: 'brand-system',
      kind: 'png',
      mime: 'image/png',
      href: '/assets/metraiyux-0s-emblem-transparent.png',
      sourcePath: 'metraiyux_0s_site/assets/metraiyux-0s-emblem-transparent.png',
      notes: 'Actual 0S emblem.'
    },
    {
      id: 'asset-metraiyux-poster',
      name: 'MetrAIyux 0S gold-blue poster',
      category: 'brand-system',
      kind: 'png',
      mime: 'image/png',
      href: '/assets/metraiyux-0s-logo-gold-blue-poster.png',
      sourcePath: 'metraiyux_0s_site/assets/metraiyux-0s-logo-gold-blue-poster.png',
      notes: 'Actual 0S poster asset.'
    },
    {
      id: 'asset-client-factory-founder',
      name: 'Client App Factory founder image',
      category: 'client-app-factory',
      kind: 'png',
      mime: 'image/png',
      href: '/client-app-factory/assets/founder-skyes-over-london.png',
      sourcePath: 'metraiyux_0s_site/client-app-factory/assets/founder-skyes-over-london.png',
      notes: 'Actual Client App Factory founder asset.'
    },
    {
      id: 'asset-client-factory-proof',
      name: 'Client App Factory workflow poster',
      category: 'client-app-factory',
      kind: 'png',
      mime: 'image/png',
      href: '/client-app-factory/assets/proof/client-app-factory-workflow-poster.png',
      sourcePath: 'metraiyux_0s_site/client-app-factory/assets/proof/client-app-factory-workflow-poster.png',
      notes: 'Actual proof poster for the private client app factory.'
    },
    {
      id: 'asset-webgrowth-logo',
      name: 'WebGrowthOperator Skyes Over London logo',
      category: 'marketing-made-easy',
      kind: 'png',
      mime: 'image/png',
      href: '/Marketing-Made-Easy/WebGrowthOperator/assets/skyes-over-london-logo.png',
      sourcePath: 'metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator/assets/skyes-over-london-logo.png',
      notes: 'Actual logo used by WebGrowthOperator.'
    },
    {
      id: 'asset-skye-music-logo',
      name: 'Skye Music Nexus logo',
      category: 'music-nexus',
      kind: 'png',
      mime: 'image/png',
      href: '/SkyeMusicNexus/assets/skye-music-nexus-logo.png',
      sourcePath: 'metraiyux_0s_site/SkyeMusicNexus/assets/skye-music-nexus-logo.png',
      notes: 'Actual Skye Music Nexus logo.'
    },
    {
      id: 'asset-skye-music-contact',
      name: 'Skye Music Nexus contact card',
      category: 'music-nexus',
      kind: 'png',
      mime: 'image/png',
      href: '/SkyeMusicNexus/assets/business-contact-info.png',
      sourcePath: 'metraiyux_0s_site/SkyeMusicNexus/assets/business-contact-info.png',
      notes: 'Actual business contact image.'
    },
    {
      id: 'asset-connectlog-proof',
      name: 'ConnectLog Relay13 proof poster',
      category: 'relay13',
      kind: 'png',
      mime: 'image/png',
      href: '/assets/proof/connectlog-relay13-e2e-poster.png',
      sourcePath: 'metraiyux_0s_site/assets/proof/connectlog-relay13-e2e-poster.png',
      notes: 'Actual Relay13 proof asset.'
    },
    {
      id: 'asset-valley-verified-logo',
      name: 'Valley Verified logo',
      category: 'valley-verified',
      kind: 'png',
      mime: 'image/png',
      href: '/valley-verified/assets/valley-verified-logo.png',
      sourcePath: 'metraiyux_0s_site/valley-verified/assets/valley-verified-logo.png',
      notes: 'Actual Valley Verified logo.'
    }
  ];

  const COMMAND_LINKS = [
    { label: '0meg4Command Home', href: '/founder-command/', kind: 'canonical owner cockpit' },
    { label: 'Founder Operations', href: '/founder-command/?view=operations', kind: 'company work system' },
    { label: 'Founder Work System API', href: '/api/founder-command/work-system', kind: 'owner API' },
    { label: 'Founder Core Apps', href: '/founder-command/?view=core', kind: 'mobile 0S dock' },
    { label: 'Founder Song Vault', href: '/founder-command/?view=songs', kind: 'browser-downloadable music copies' },
    { label: 'Founder Song Vault Manifest', href: '/founder-command/song-vault/manifest.json', kind: 'song custody manifest' },
    { label: 'Founder Repo Vault', href: '/founder-command/?view=repo-vault', kind: 'streamed repo drive' },
    { label: 'Founder Repo Vault API', href: '/api/founder-command/repo-vault', kind: 'owner API' },
    { label: 'SkyeVault Command Center', href: '/admin/skyevault-command-center.html', kind: 'vault custody dashboard' },
    { label: 'SkyeVaultPro Drive', href: '/Free99/apps/skyevaultpro/drive/index.html', kind: 'vault drive' },
    { label: 'AE FlowPro Founder CRM', href: '/Marketing-Made-Easy/AE-FlowPro/', kind: 'private founder CRM' },
    { label: 'AE FlowPro Private API', href: '/api/founder-command/ae-flow/status', kind: 'founder CRM API' },
    { label: 'Business Card Factory', href: '/business-card-factory/', kind: 'gated card generator' },
    { label: 'Public Business Cards Studio', href: 'https://metraiyux-0s-marketing.pages.dev/business-cards.html', kind: 'public card generator' },
    { label: 'Client App Factory', href: '/client-app-factory/', kind: 'private client build foundry' },
    { label: 'Client Factory Builder', href: '/client-app-factory/builder/', kind: 'client app creation' },
    { label: 'Client Factory Deployments', href: '/client-app-factory/deployments/', kind: 'client app deploy history' },
    { label: 'Client Credential Vault', href: '/founder-command/?view=clients', kind: 'founder-only client handoffs' },
    { label: 'SkyeRouteX Logistics Company Site', href: '/SkyeRouteX/', kind: 'company lane' },
    { label: 'SkyeRouteX Workforce Command', href: '/SkyeRouteX/workforce-command-v0.4.0/index.html', kind: 'dispatch cockpit' },
    { label: 'SkyeRouteX Gate Status', href: '/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html', kind: 'shared gate proof' },
    { label: 'SkyeRouteX Founder JSON', href: '/founder-command/client-credentials/skyeroutex-logistics.json', kind: 'internal company map' },
    { label: 'SkyeRouteX Operating Map', href: '/docs/SKYEROUTEX_LOGISTICS_OPERATING_MAP_2026-05-27.md', kind: 'owner documentation' },
    { label: 'Bob Smoke Shop App', href: 'https://bobs-smoke-shop.pages.dev/', kind: 'client app live URL' },
    { label: 'Bob Workspace Preview', href: 'https://bobs-smoke-shop.pages.dev/workspace-preview/', kind: 'Relay13 workspace preview' },
    { label: 'Bob Pilot Review Page', href: 'https://metraiyux-0s-marketing.pages.dev/bobs-smoke-shop-free-pilot', kind: 'client-facing pitch page' },
    { label: 'Free Business Stack Pitch', href: '/sales/free-business-stack.html', kind: 'current client-facing 0S offer' },
    { label: 'Free Business Stack Flyer', href: '/sales/free-business-stack-flyer.html', kind: 'printable QR handout' },
    { label: 'Fullscreen 0S Browser', href: '/0s/index.html', kind: 'PWA workspace launcher' },
    { label: 'Bob Pilot Readiness JSON', href: 'https://metraiyux-0s-marketing.pages.dev/data/bobs-smoke-shop-pilot-readiness.json', kind: 'client readiness receipt' },
    { label: 'PWA Drop Factory', href: '/founder-command/apps/pwa-factory-v213/', kind: 'private artist drop packager' },
    { label: 'SupaBoy Founder Handoff', href: '/founder-command/client-credentials/supaboy.json', kind: 'artist credential map' },
    { label: 'SupaBoy Welcome Pack', href: '/SkyeMusicNexus/artist-storefronts/supaboy/welcome-pack/', kind: 'artist welcome pack' },
    { label: 'SupaBoy Upload Song', href: '/SkyeMusicNexus/public/upload.html?artist=supaboy&artistId=444666666667&releaseId=slb-superboy', kind: 'artist upload lane' },
    { label: 'Music Nexus Walkthroughs', href: '/SkyeMusicNexus/public/walkthrough.html', kind: 'guided artist walkthroughs' },
    { label: 'Sitemap Indexing Agent', href: '/founder-command/sitemap-indexing-agent.html', kind: 'SEO submit links and reports' },
    { label: 'SkyeMediaCenter / Media Over London', href: '/SkyeMediaCenter/', kind: 'media source lane' },
    { label: 'SkyeMediaCenter Proof', href: '/live/skye-media-center-operator-proof.html', kind: 'media proof route' },
    { label: 'WebGrowthOperator Pricing', href: '/Marketing-Made-Easy/WebGrowthOperator/pricing.html', kind: 'SkyePay-backed service pricing' },
    { label: 'Managed Hosting Care', href: '/Marketing-Made-Easy/WebGrowthOperator/services/managed-hosting-care.html', kind: 'product page SkyePay handoff' },
    { label: 'SkyePay Store', href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s', kind: 'live Stripe-backed store' },
    { label: 'Founder SkyeMerit Code', href: '/founder-command/#founderSkyemeritPanel', kind: 'Free99 / SkyeMerit pocket' },
    { label: 'Surface Pricing Registry', href: '/sales/platform-surface-pricing-registry.html', kind: 'offer registry' },
    { label: 'SkyeNet Console', href: '/skyenet/', kind: 'folder drop deploy lane' },
    { label: 'Quantum Founder Console', href: '/quantum-ops/founder-command-console.html', kind: 'older approval console' },
    { label: 'NEXUS Override', href: '/nexus/founder-command-override.html', kind: 'older override room' },
    { label: 'Owner Admin Login', href: '/admin/login.html?return=%2Ffounder-command%2F%3Fview%3Dcore%23pocket-skyemail', kind: 'shared owner gate' },
    { label: 'SuperIDE SkyeCalendar', href: '/founder-command/apps/0s-calendar/', kind: 'copied SuperIDE calendar surface' },
    { label: 'Founder Calendar API', href: '/api/founder-command/calendar', kind: 'calendar source of truth' },
    { label: '0S SkyEmail Notifications', href: '/api/founder-command/skyemail', kind: 'owner notification mailbox' },
    { label: 'Pocket SkyeMail API', href: '/api/founder-command/skyemail/pocket', kind: 'synced founder inbox' },
    { label: 'SkyeMail Mailbox Offboarding', href: '/founder-command/?view=mailboxes', kind: 'provider seat release' },
    { label: 'SkyeMail Offboarding API', href: '/api/founder-command/skyemail/offboarding', kind: 'logged admin API' },
    { label: 'SkyeMail Workspace Handoffs', href: '/founder-command/?view=mailboxes#workspace-handoffs', kind: 'QR welcome packets' },
    { label: 'SkyeMail Handoff API', href: '/api/founder-command/skyemail/handoffs', kind: 'client handoff API' },
    { label: 'Mailbox Offboarding Tutorial', href: '/admin/tutorial/29-skyemail-mailbox-offboarding.html', kind: 'admin tutorial' },
    { label: 'SkyeBox Authenticator', href: '/Free99/apps/skyebox-authenticator/', kind: 'gate app' },
    { label: 'Valley Owner CRM', href: '/valley-verified/owner-crm/', kind: 'operator' },
    { label: 'Valley Lead Inbox', href: '/valley-verified/lead-inbox/', kind: 'operator' },
    { label: '0S Route Manifest', href: '/api/0s/route-manifest', kind: 'api' },
    { label: 'Site Operator Status', href: '/api/site-operator/status', kind: 'api' }
  ];

  const DEFAULT_CORE_APPS = [
    {
      id: 'core-zero-os-browser',
      name: '0S Browser',
      category: 'os',
      href: '/0s/index.html',
      mode: 'embed',
      notes: 'Full 0S browser shell for launching mounted apps and routes from one gate-owned workspace.'
    },
    {
      id: 'core-0s-calendar',
      name: 'SuperIDE SkyeCalendar',
      category: 'calendar',
      href: '/founder-command/apps/0s-calendar/',
      mode: 'embed',
      notes: 'Copied SuperIDE SkyeCalendar mounted through Founder Command, backed by the 0S ledger, shared gate, local shadow sync, and ICS export.'
    },
    {
      id: 'core-pocket-skyemail',
      name: 'Pocket SkyeMail',
      category: 'mail',
      href: SKYEMAIL_INBOX_HANDOFF,
      mode: 'new-tab',
      notes: 'Synced owner mailbox lane. Use compose/inbox in the real SkyeMail app while Founder Command shows the compact status.'
    },
    {
      id: 'core-skyemail-compose',
      name: 'SkyeMail Compose',
      category: 'mail',
      href: SKYEMAIL_COMPOSE_HANDOFF,
      mode: 'new-tab',
      notes: 'Open the real compose lane for outbound business email.'
    },
    {
      id: 'core-fs27-gate',
      name: 'FS27 / SkyGate',
      category: 'gate',
      href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/',
      mode: 'new-tab',
      notes: 'Shared gate, Free99, SkyePay, and FS27 identity source of truth.'
    },
    {
      id: 'core-skyepay-store',
      name: 'SkyePay Store',
      category: 'payments',
      href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s',
      mode: 'new-tab',
      notes: 'Live Stripe-backed product and payment lane.'
    },
    {
      id: 'core-ae-flowpro-founder-crm',
      name: 'AE FlowPro Founder CRM',
      category: 'crm',
      href: '/Marketing-Made-Easy/AE-FlowPro/',
      mode: 'embed',
      notes: 'Founder-only CRM for AE contacts, Valley Verified leads, artist signups, Gate handoffs, private CitadelDB sync, and backup ledgers.'
    },
    {
      id: 'core-skyenet',
      name: 'SkyeNet Deploy',
      category: 'deploy',
      href: '/skyenet/',
      mode: 'embed',
      notes: 'Folder drop and route receipts for self-service surface publishing.'
    },
    {
      id: 'core-skyevault-drive',
      name: 'SkyeVaultPro Drive',
      category: 'vault',
      href: '/Free99/apps/skyevaultpro/drive/index.html',
      mode: 'embed',
      notes: 'Drive lane for vault work, SkyeDocxMax bridge, and local/hosted backup controls.'
    },
    {
      id: 'core-skyevault-command-center',
      name: 'SkyeVault Command Center',
      category: 'vault',
      href: '/admin/skyevault-command-center.html',
      mode: 'embed',
      notes: 'Autosync proof, receipt custody, and vault admin controls from the shared 0S gate.'
    },
    {
      id: 'core-sovereign-docs',
      name: 'SovereignDocs',
      category: 'docs',
      href: '/Free99/apps/sovereigndocs/index.html',
      mode: 'embed',
      notes: 'Document workflow platform and guarded self-help document lane.'
    },
    {
      id: 'core-skyedocxmax',
      name: 'SkyeDocxMax',
      category: 'docs',
      href: '/Marketing-Made-Easy/SkyeDocxMax/editor.html',
      mode: 'embed',
      notes: 'Main document editor used by SovereignDocs and the SkyeVault document bridge.'
    },
    {
      id: 'core-skyemusicnexus',
      name: 'SkyeMusicNexus',
      category: 'music',
      href: '/SkyeMusicNexus/',
      mode: 'embed',
      notes: 'Artist, release, store, analytics, and music operating surface.'
    },
    {
      id: 'core-0s-command-bridge',
      name: '0S Command Bridge',
      category: 'crm',
      href: '/founder-command/apps/0s-command-bridge/',
      mode: 'embed',
      notes: 'Shared CRM ledger and neural bridge for Nexus, storefronts, SkyPay, SkyeCommerce, docs, workforce, and deployments.'
    },
    {
      id: 'core-skye-routex-workforce',
      name: 'SkyeRouteX Logistics',
      category: 'workforce',
      href: '/SkyeRouteX/',
      mode: 'embed',
      notes: 'Company website plus workforce command, provider readiness, dispatch, contractor, and assignment surface.'
    },
    {
      id: 'core-business-card-factory',
      name: '0S Business Card Factory',
      category: 'business-cards',
      href: '/business-card-factory/',
      mode: 'embed',
      notes: 'Gated card factory tied into Valley Verified and ConnectLog handoffs.'
    },
    {
      id: 'core-public-business-cards',
      name: 'Public Business Cards Studio',
      category: 'business-cards',
      href: 'https://metraiyux-0s-marketing.pages.dev/business-cards.html',
      mode: 'new-tab',
      notes: 'Public founder/client card studio for live marketing card generation.'
    },
    {
      id: 'core-connectlog-cards',
      name: 'ConnectLog Cards',
      category: 'business-cards',
      href: '/connectlog-v7.7-relay13-operator-proof/cards.html',
      mode: 'embed',
      notes: 'Relay13/ConnectLog card lane for contact and client handoff packets.'
    },
    {
      id: 'core-bobs-smoke-shop-app',
      name: "Bob's Smoke Shop App",
      category: 'client',
      href: 'https://bobs-smoke-shop.pages.dev/',
      mode: 'new-tab',
      notes: "Bob's live customer app with the Relay13/ConnectLog widget attached."
    },
    {
      id: 'core-bobs-smoke-shop-workspace',
      name: "Bob's Workspace Preview",
      category: 'client',
      href: 'https://bobs-smoke-shop.pages.dev/workspace-preview/',
      mode: 'new-tab',
      notes: "Bob's workspace preview room for the free pilot handoff."
    },
    {
      id: 'core-pentest-cards',
      name: 'Pentest Gate Cards',
      category: 'security',
      href: '/admin/pentest-gate-admin.html',
      mode: 'embed',
      notes: 'Issue or review short-lived tester access through the shared owner gate.'
    },
    {
      id: 'core-client-app-factory',
      name: 'Client App Factory',
      category: 'builds',
      href: '/client-app-factory/',
      mode: 'embed',
      notes: 'Private client build foundry mounted into the 0S.'
    },
    {
      id: 'core-pwa-drop-factory',
      name: 'PWA Drop Factory',
      category: 'artist-drops',
      href: '/founder-command/apps/pwa-factory-v213/',
      mode: 'embed',
      notes: 'Founder-only PWA packager for artist singles, albums, Gray Gang collective drops, and Skye Radio player shells.'
    },
    {
      id: 'core-valley-crm',
      name: 'Valley Owner CRM',
      category: 'crm',
      href: '/valley-verified/owner-crm/',
      mode: 'embed',
      notes: 'Operator lane for Valley Verified business records.'
    },
    {
      id: 'core-route-manifest',
      name: '0S Route Manifest',
      category: 'system',
      href: '/api/0s/route-manifest',
      mode: 'new-tab',
      notes: 'Live route/source map for mounted 0S surfaces and APIs.'
    },
    {
      id: 'core-proof-vault',
      name: 'Proof Vault',
      category: 'proof',
      href: '/proof-vault/',
      mode: 'embed',
      notes: 'Receipts, proof pages, and custody evidence from the 0S vault.'
    }
  ];

  const OPEN_NOW_LINKS = [
    { label: 'Pocket Core Apps', href: '/founder-command/?view=core', kind: 'mobile 0S dock' },
    { label: 'PWA Drop Factory', href: '/founder-command/apps/pwa-factory-v213/', kind: 'artist drop PWA packager' },
    { label: 'Indexing Agent', href: '/founder-command/sitemap-indexing-agent.html', kind: 'submit pack' },
    { label: 'Client App Factory', href: '/client-app-factory/', kind: 'private builds' },
    { label: 'Client Vault', href: '/founder-command/?view=clients', kind: 'Bob and SupaBoy credentials' },
    { label: 'SupaBoy Welcome Pack', href: '/SkyeMusicNexus/artist-storefronts/supaboy/welcome-pack/', kind: 'artist handoff' },
    { label: 'SupaBoy Contractor Packets', href: '/api/founder-command/contractor-packets?artist=supaboy', kind: 'Founder Command paperwork' },
    { label: 'AE FlowPro CRM', href: '/Marketing-Made-Easy/AE-FlowPro/', kind: 'founder CRM' },
    { label: 'SkyePay Store', href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s', kind: 'live offers' },
    { label: 'Founder SkyeMerit', href: '/founder-command/#founderSkyemeritPanel', kind: 'copy no-charge code' },
    { label: 'WebGrowth Pricing', href: '/Marketing-Made-Easy/WebGrowthOperator/pricing.html', kind: 'Skyes Over London pricing' },
    { label: 'Media Center', href: '/SkyeMediaCenter/', kind: 'Media over London lane' },
    { label: 'SkyeNet', href: '/skyenet/', kind: 'deploy drops' },
    { label: 'Repo Vault', href: '/founder-command/?view=repo-vault', kind: 'streamed proof drive' },
    { label: 'Mailboxes', href: '/founder-command/?view=mailboxes', kind: 'provider seats' },
    { label: 'Remote MCP', href: 'https://skye-design-mcp.pages.dev/use-mcp.html', kind: 'quantumskyes access' }
  ];

  const PRODUCTION_LINKS = [
    { label: 'Current 0S Worker', href: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/founder-command/', kind: 'Founder Command production' },
    { label: 'Latest HTTP Receipt', href: '/proof/skyevault-autosync-proof.json', kind: 'deployed proof asset' },
    { label: 'Founder Repo Vault API', href: '/api/founder-command/repo-vault', kind: 'streamed proof API' },
    { label: '0S Route Manifest', href: '/api/0s/route-manifest', kind: 'live mounted route list' },
    { label: 'Founder Status API', href: '/api/founder-command/status', kind: 'gate-owned status' },
    { label: 'SkyePay Gateway Data', href: '/data/skyepay-gateway.json', kind: 'gateway source data' },
    { label: 'Pricing Registry', href: '/sales/platform-surface-pricing-registry.html', kind: 'platform pricing map' }
  ];

  const INDEXING_SURFACES = [
    { label: 'MetrAIyux 0S root sitemap', href: '/sitemap.xml', kind: 'main 0S public sitemap' },
    { label: 'MetrAIyux 0S robots', href: '/robots.txt', kind: 'crawl policy' },
    { label: 'WebGrowthOperator sitemap', href: '/Marketing-Made-Easy/WebGrowthOperator/sitemap.xml', kind: 'Skyes Over London service pages' },
    { label: 'WebGrowthOperator robots', href: '/Marketing-Made-Easy/WebGrowthOperator/robots.txt', kind: 'service crawl policy' },
    { label: 'WebGrowthOperator pricing', href: '/Marketing-Made-Easy/WebGrowthOperator/pricing.html', kind: 'pricing surface' },
    { label: 'Managed Hosting Care', href: '/Marketing-Made-Easy/WebGrowthOperator/services/managed-hosting-care.html', kind: 'service page' },
    { label: 'Valley Verified sitemap index', href: '/valley-verified/sitemap-index.xml', kind: 'Valley pages' },
    { label: 'Valley Verified robots', href: '/valley-verified/robots.txt', kind: 'Valley crawl policy' },
    { label: 'SkyeGate FS27 sitemap', href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/sitemap.xml', kind: 'FS27 / SkyePay public sitemap' },
    { label: 'SkyeGate FS27 robots', href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/robots.txt', kind: 'FS27 crawl policy' },
    { label: 'SkyePay Store', href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s', kind: 'Stripe-backed store surface' },
    { label: '0S SEO submission links', href: '/seo/google-indexing-submission-links.html', kind: 'submit helper page' },
    { label: '0S SEO sitemap report', href: '/seo/sitemap-agent-report.html', kind: 'sitemap report' },
    { label: 'Founder indexing agent', href: '/founder-command/sitemap-indexing-agent.html', kind: 'private owner checklist' }
  ];

  const CLIENT_CREDENTIALS = [
    {
      id: 'skyeroutex-logistics',
      client: 'SkyeRouteX Logistics',
      clientSlug: 'skyeroutex-logistics',
      credentialKind: 'company-logistics-owner-lane',
      updatedAt: '2026-05-27',
      status: 'company-site-live-mailbox-provisioned',
      authBoundary: 'Shared FS27/SkyGate/Free99 owner lane only. SkyeRouteX Logistics does not get a separate founder, owner, admin, or client admin password.',
      publicContact: {
        email: 'grayskyes@solenterprises.org',
        phone: OWNER_MARKETING_CONTACT_PHONE
      },
      workspaceConfirmationRecipients: OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS,
      company: {
        legalOperator: 'Skyes Over London LC / SOLEnterprises ecosystem',
        founderOperator: 'Gray London Skyes / Gray Skyes',
        companyLine: OWNER_MARKETING_CONTACT_PHONE,
        primaryOwnerEmail: 'grayskyes@solenterprises.org',
        companyMailbox: 'skyeroutex-logistics@solenterprises.org',
        lane: 'dispatch, logistics, route work, provider jobs, contractor assignments, proof, payment state, and owner operations'
      },
      liveUrls: {
        customerApp: '/SkyeRouteX/',
        workspacePreview: '/SkyeRouteX/workforce-command-v0.4.0/index.html',
        companySite: '/SkyeRouteX/',
        workforceCommand: '/SkyeRouteX/workforce-command-v0.4.0/index.html',
        v83Dashboard: '/SkyeRouteX/dashboard.html',
        v83Routes: '/SkyeRouteX/routes.html',
        v83Stops: '/SkyeRouteX/stops.html',
        v83Workforce: '/SkyeRouteX/workforce.html',
        v83ProofVault: '/SkyeRouteX/proof.html',
        v83Analytics: '/SkyeRouteX/analytics.html',
        v83Runtime: '/SkyeRouteX/runtime.html',
        v83Settings: '/SkyeRouteX/settings.html',
        providerPanel: '/SkyeRouteX/workforce-command-v0.4.0/index.html#provider-panel',
        contractorPanel: '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel',
        houseCommand: '/SkyeRouteX/workforce-command-v0.4.0/index.html#house-panel',
        proofPanel: '/SkyeRouteX/workforce-command-v0.4.0/index.html#proof',
        gateStatus: '/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html',
        auditConsole: '/SkyeRouteX/apps/audit-ready-console/index.html',
        platformTruth: '/SkyeRouteX/workforce-command-v0.4.0/PLATFORM_TRUTH.json',
        apiReference: '/SkyeRouteX/workforce-command-v0.4.0/docs/API_REFERENCE.md',
        providerEnvAudit: '/SkyeRouteX/workforce-command-v0.4.0/proof/provider-env-audit-2026-05-21.md',
        latestMountedWorkerStress: '/SkyeRouteX/workforce-command-v0.4.0/proof/skyeroutex-mounted-worker-stress-latest.json',
        latestLiveProductionStress: '/SkyeRouteX/workforce-command-v0.4.0/proof/skyeroutex-live-production-stress-latest.json',
        routeAeWorkforceLane: '/SkyeRouteX/workforce-command-v0.4.0/proof/routex-ae-workforce-lane-latest.json',
        contractorPacket: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html?source=SkyeRouteX&company=skyeroutex-logistics&roleLane=Logistics%20Contractor',
        contractorPacketInbox: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html?company=skyeroutex-logistics',
        founderContractorPackets: '/api/founder-command/contractor-packets?company=skyeroutex-logistics',
        aeCommand: '/ae-command/?company=skyeroutex-logistics&lane=logistics',
        routexApi: '/api/routex',
        routexAliasApi: '/api/skyeroutex',
        routeManifest: '/api/0s/route-manifest',
        valleyMap: '/valley-verified/map/',
        legalLogistics: 'https://skyes-over-london-legal.pages.dev/legal/delivery-logistics/',
        skyemailInbox: '/live/SkyeMail/session-handoff.html?next=dashboard.html&from=skyeroutex-logistics',
        skyemailCompose: '/live/SkyeMail/session-handoff.html?next=compose.html&from=skyeroutex-logistics',
        readinessReceipt: '/proof/skyeroutex-expansion-receipt.html',
        sharedWorkspaceLogin: '/admin/login.html?return=%2FSkyeRouteX%2F'
      },
      relay13ConnectLog: {
        accountCode: 'SKYEROUTEX-LOGISTICS-0S',
        workspaceSlug: 'skyeroutex-logistics',
        workspaceId: 'ws_skyeroutex_logistics',
        connectlogCardId: 'skyeroutex-logistics-company-workspace',
        skygateClientSlug: 'skyeroutex-logistics',
        messageModes: ['owner-logistics-command', 'dispatch-handoff', 'provider-workforce-chat'],
        status: 'founder-owned-company-lane'
      },
      skyemail: {
        reservedMailbox: 'skyeroutex-logistics@solenterprises.org',
        businessId: 'skyeroutex-logistics',
        acceptPath: '/live/SkyeMail/session-handoff.html?next=dashboard.html&from=skyeroutex-logistics',
        activationStatus: 'provisioned_active',
        activationWindowHours: 0,
        ownerEmail: 'grayskyes@solenterprises.org',
        backupEmails: ['SkyesOverLondonLC@solenterprises.org', 'skyesoverlondon222@gmail.com'],
        provisionReceipt: '/test-artifacts/skyemail-skyeroutex-logistics-provision/provision-latest.json'
      },
      logisticsStack: {
        apiBase: '/api/routex',
        apiAlias: '/api/skyeroutex',
        routeProviderReady: 'local-route-intelligence-now-mapbox-when-credentials-configured',
        mapProviderEnv: ['ROUTE_INTELLIGENCE_PROVIDER=mapbox', 'MAPBOX_ACCESS_TOKEN'],
        smsVoiceTarget: '1-(800)-484-4783',
        smsVoiceBoundary: 'AI call handling requires provider credential and proof receipts before public claims.'
      },
      ownerInventory: [
        { label: 'Company doorway', href: '/SkyeRouteX/', scope: 'company-site', notes: 'Top-level SkyeRouteX Logistics owner/company surface.' },
        { label: 'Workforce Command cockpit', href: '/SkyeRouteX/workforce-command-v0.4.0/index.html', scope: 'dispatch-cockpit', notes: 'Provider jobs, contractor applications, assignments, proof, route jobs, exports, and House Command.' },
        { label: 'V83 Dispatch Dashboard', href: '/SkyeRouteX/dashboard.html', scope: 'dispatch', notes: 'Dispatch board, proof-of-delivery, workforce lane, analytics, audit console, and static runtime cards.' },
        { label: 'V83 Routes', href: '/SkyeRouteX/routes.html', scope: 'route-planner', notes: 'Route creation, driver, vehicle, territory, stop order, and day ledger.' },
        { label: 'V83 Stops', href: '/SkyeRouteX/stops.html', scope: 'stops-proof', notes: 'Stop-level proof, exceptions, POD notes, and route sequence review.' },
        { label: 'V83 Workforce', href: '/SkyeRouteX/workforce.html', scope: 'field-workforce', notes: 'Field crew, driver, contractor, vehicle, and readiness surfaces.' },
        { label: 'V83 Proof Vault', href: '/SkyeRouteX/proof.html', scope: 'proof', notes: 'Proof vault and audit handoff surface.' },
        { label: 'V83 Analytics', href: '/SkyeRouteX/analytics.html', scope: 'analytics', notes: 'Route score, revenue signal, mileage, follow-up pressure, and territory load.' },
        { label: 'V83 Runtime', href: '/SkyeRouteX/runtime.html', scope: 'runtime', notes: 'Health, summary, queue, boards, sessions, and handoff endpoints.' },
        { label: 'V83 Settings', href: '/SkyeRouteX/settings.html', scope: 'settings', notes: 'Local runtime and provider-boundary settings.' },
        { label: 'Audit-ready console', href: '/SkyeRouteX/apps/audit-ready-console/index.html', scope: 'audit-console', notes: 'Preserved deep console and PHC app-fabric proof lane.' },
        { label: 'Gate readiness', href: '/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html', scope: 'auth', notes: 'Shared FS27/SkyGate/Free99 gate proof.' },
        { label: 'API reference', href: '/SkyeRouteX/workforce-command-v0.4.0/docs/API_REFERENCE.md', scope: 'api-docs', notes: 'v0.4.0 API surface map.' },
        { label: 'Provider env audit', href: '/SkyeRouteX/workforce-command-v0.4.0/proof/provider-env-audit-2026-05-21.md', scope: 'provider-boundary', notes: 'Provider credential readiness and unsupported-claim boundary.' }
      ],
      mapInventory: [
        '/SkyeRouteX/dashboard.html',
        '/SkyeRouteX/routes.html',
        '/SkyeRouteX/stops.html',
        '/SkyeRouteX/workforce.html',
        '/SkyeRouteX/proof.html',
        '/SkyeRouteX/analytics.html',
        '/SkyeRouteX/runtime.html',
        '/SkyeRouteX/settings.html',
        '/SkyeRouteX/apps/audit-ready-console/index.html',
        '/SkyeRouteX/workforce-command-v0.4.0/src/adapters/platform-services.js',
        '/SkyeRouteX/workforce-command-v0.4.0/src/server.js',
        '/SkyeRouteX/workforce-command-v0.4.0/docs/API_REFERENCE.md',
        '/SkyeRouteX/workforce-command-v0.4.0/proof/provider-env-audit-2026-05-21.md',
        '/valley-verified/map/',
        '/api/0s/route-manifest',
        '/legal/delivery-logistics/'
      ],
      freeReviewLimits: {
        appScans: 0,
        workspaceCommands: 100,
        proofExports: 25,
        testerSeats: 3
      },
      qrTargets: {
        reviewPilot: '/SkyeRouteX/',
        liveApp: '/SkyeRouteX/workforce-command-v0.4.0/index.html',
        freeStackPitch: '/founder-command/?view=clients',
        freeStackFlyer: '/docs/SKYEROUTEX_LOGISTICS_OPERATING_MAP_2026-05-27.md',
        zeroOsBrowser: '/0s/index.html',
        uploadSong: ''
      },
      provisioningStatus: {
        companySite: {
          label: 'Company website',
          status: 'live-in-repo',
          detail: 'Top-level /SkyeRouteX/ is now the SkyeRouteX Logistics company site instead of an instant redirect.',
          href: '/SkyeRouteX/'
        },
        workforceCommand: {
          label: 'Workforce Command',
          status: 'mounted',
          detail: 'Provider, contractor, AE, House Command, proof, route jobs, exports, and integrations remain in the v0.4.0 cockpit.',
          href: '/SkyeRouteX/workforce-command-v0.4.0/index.html'
        },
        skyemail: {
          label: 'SkyeMail company mailbox',
          status: 'provisioned-active',
          detail: 'skyeroutex-logistics@solenterprises.org is provisioned under grayskyes@solenterprises.org with backup owner emails kept documented.',
          href: '/live/SkyeMail/session-handoff.html?next=dashboard.html&from=skyeroutex-logistics'
        },
        routeIntelligence: {
          label: 'Route and nav stack',
          status: 'local-ready-provider-gated',
          detail: 'Route jobs and local intelligence exist; live external maps/ETA need Mapbox credentials before claims.',
          href: '/SkyeRouteX/workforce-command-v0.4.0/index.html#proof'
        },
        phoneAi: {
          label: 'Company line / AI calls',
          status: 'provider-wiring-checkpoint',
          detail: '1-(800)-484-4783 is the company line and target for call handling; AI call automation still needs provider receipts.',
          href: '/founder-command/?view=clients'
        }
      },
      activationBoundaries: [
        'Owner/founder access uses grayskyes@solenterprises.org and the shared 0S gate. It does not bind the SaaS signup system to this owner email.',
        'Customer signup still provisions customer-owned records and mailboxes from the customer email supplied during signup.',
        'No SkyeRouteX-specific founder, owner, admin, or client admin password has been created.',
        'Route jobs, provider jobs, contractor assignments, proof, exports, and House Command are live in the 0S-mounted Workforce Command cockpit.',
        'Live external GPS, ETA, map optimization, SMS, and AI call handling require provider credentials and proof receipts before being sold as active.'
      ]
    },
    {
      id: 'bobs-smoke-shop',
      client: "Bob's Smoke Shop",
      clientSlug: 'bobs-smoke-shop',
      updatedAt: '2026-05-26',
      status: 'pilot-ready',
      authBoundary: 'Shared FS27/SkyGate/Free99 handoff only. No app-local client, founder, owner, or admin password is stored here.',
      publicContact: {
        email: OWNER_MARKETING_CONTACT_EMAIL,
        phone: OWNER_MARKETING_CONTACT_PHONE
      },
      workspaceConfirmationRecipients: OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS,
      liveUrls: {
        customerApp: 'https://bobs-smoke-shop.pages.dev/',
        workspacePreview: 'https://bobs-smoke-shop.pages.dev/workspace-preview/',
        pilotReview: 'https://metraiyux-0s-marketing.pages.dev/bobs-smoke-shop-free-pilot',
        pilotFlyer: 'https://metraiyux-0s-marketing.pages.dev/bobs-smoke-shop-free-pilot-flyer',
        freeStackPitch: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/free-business-stack.html',
        freeStackFlyer: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/free-business-stack-flyer.html',
        zeroOsBrowser: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/0s/index.html',
        pricingRouter: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/pricing-offer-router.html',
        aeFlowPro: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/AE-FlowPro/',
        citadelDb: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/citadeldb/',
        connectLog: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/connectlog-relay13',
        relay13: 'https://relay13-core.graylondonskyes.workers.dev/',
        readinessReceipt: 'https://metraiyux-0s-marketing.pages.dev/data/bobs-smoke-shop-pilot-readiness.json',
        sharedWorkspaceLogin: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/client-login.html'
      },
      relay13ConnectLog: {
        accountCode: 'BOBS-SMOKE-SHOP-SKM',
        workspaceSlug: 'bobs-smoke-shop',
        workspaceId: 'ws_bobs_smoke_shop',
        connectlogCardId: 'bobs-smoke-shop-client-workspace',
        skygateClientSlug: 'bobs-smoke-shop-skm',
        messageModes: ['client-workspace-chat'],
        status: 'client-widget-configured-live-room-ready'
      },
      skyemail: {
        reservedMailbox: 'bobs-smokeshop@skyemail.solenterprises.org',
        canChangeMailbox: true,
        changeRequestEndpoint: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley-verified/skyemail-handle-request',
        businessId: 'bobs-smoke-shop-litchfield-park',
        acceptPath: '/valley-verified/live/SkyeMail/login.html?workspace=valley-verified&business=bobs-smoke-shop-litchfield-park&mailbox=bobs-smokeshop%40skyemail.solenterprises.org',
        activationStatus: 'reserved_changeable_pending_owner_email',
        activationWindowHours: 24,
        ownerEmail: 'pending Bob confirmation'
      },
      freeReviewLimits: {
        appScans: 7,
        workspaceCommands: 25,
        proofExports: 5,
        testerSeats: 2
      },
      qrTargets: {
        reviewPilot: 'https://metraiyux-0s-marketing.pages.dev/bobs-smoke-shop-free-pilot',
        liveApp: 'https://bobs-smoke-shop.pages.dev/',
        freeStackPitch: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/free-business-stack.html',
        freeStackFlyer: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/free-business-stack-flyer.html',
        zeroOsBrowser: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/0s/index.html'
      },
      provisioningStatus: {
        landingExperience: {
          label: 'Landing / app experience',
          status: 'live',
          detail: 'Bob customer app and workspace preview are live and linked from the founder pack.',
          href: 'https://bobs-smoke-shop.pages.dev/'
        },
        connectlogRelay13: {
          label: 'ConnectLog + Relay13',
          status: 'live-room-ready',
          detail: 'Workspace identifiers and client-widget room mode are configured; access remains on the shared gate.',
          href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/connectlog-relay13'
        },
        skyemail: {
          label: 'SkyeMail inbox/outbox',
          status: 'reserved-changeable',
          detail: 'bobs-smokeshop@skyemail.solenterprises.org is reserved. Bob can request a better handle before acceptance, and the confirmed handle persists.',
          href: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley-verified/skyemail-handle-request'
        },
        aeFlowpro: {
          label: 'AE-FlowPro CRM',
          status: 'starter-ready-after-claim',
          detail: 'Founder CRM handoff is mapped through the 0S and becomes the working CRM lane after Bob claims the workspace.',
          href: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/AE-FlowPro/'
        },
        citadeldb: {
          label: 'CitadelDB backup posture',
          status: 'biweekly-posture-ready-after-claim',
          detail: 'Biweekly export/backup posture is assigned to the free stack after the owner claim. Daily backup remains a paid upgrade.',
          href: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/citadeldb/'
        }
      },
      activationBoundaries: [
        'Live now: Bob customer app, workspace preview, review page, flyer, QR links, and Relay13/ConnectLog workspace.',
        'Reserved and changeable before acceptance: Bob SkyEmail mailbox.',
        'Ready after owner claim: AE-FlowPro starter CRM handoff and biweekly CitadelDB backup posture.',
        'Do not present the starter Relay13 workspace as full Slack parity.'
      ]
    },
    {
      id: 'supaboy',
      client: 'SupaBoy',
      clientSlug: 'supaboy',
      credentialKind: 'artist-workspace-handoff',
      updatedAt: '2026-05-26',
      status: 'artist-handoff-ready',
      authBoundary: 'Shared FS27/SkyGate/Free99 handoff only. No app-local client, founder, owner, or admin password is stored here.',
      publicContact: {
        email: OWNER_MARKETING_CONTACT_EMAIL
      },
      workspaceConfirmationRecipients: OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS,
      artist: {
        artistId: '444666666667',
        slug: 'supaboy',
        stageName: 'SupaBoy',
        identityNote: "SupaBoy is reserved under 444666666667. Gray Skyes remains on the separate founder artist record 444666666666.",
        publicLine: "Nigerian roots. Chicago pressure. Houston proof. The Grind Don't Stop.",
        knownProject: 'SLB / Superboy',
        knownProof: '24 Hr In Houston / 344,044 all-time streams shown / released 2024-05-03',
        tier: 'founding-core-2026-05',
        roles: ['artist', 'founding-core'],
        skyePayTrackingRef: 'skyepay_artist_444666666667',
        payoutStatus: 'blocked_until_paperwork_complete'
      },
      liveUrls: {
        customerApp: '/SkyeMusicNexus/artist-storefronts/supaboy/welcome-pack/',
        workspacePreview: '/SkyeMusicNexus/artist-storefronts/supaboy/',
        welcome: '/SkyeMusicNexus/artist-storefronts/supaboy/welcome.html',
        welcomePack: '/SkyeMusicNexus/artist-storefronts/supaboy/welcome-pack/',
        productDesk: '/SkyeMusicNexus/artist-storefronts/supaboy/products/',
        pilotReview: '/SkyeMusicNexus/public/walkthrough.html',
        pilotFlyer: '/SkyeMusicNexus/docs/FULL_PLATFORM_WALKTHROUGH.md',
        uploadSong: '/SkyeMusicNexus/public/upload.html?artist=supaboy&artistId=444666666667&releaseId=slb-superboy',
        releaseForge: '/SkyeMusicNexus/public/releases.html?artist=supaboy&artistId=444666666667',
        rightsVault: '/SkyeMusicNexus/public/rights.html?artist=supaboy&artistId=444666666667',
        dropsRoom: '/SkyeMusicNexus/public/drops.html?artist=supaboy&artistId=444666666667',
        artistApps: '/SkyeMusicNexus/public/artist-apps.html?artist=supaboy&artistId=444666666667',
        storeAdmin: '/SkyeMusicNexus/public/store.html?artist=supaboy&artistId=444666666667',
        contractorPacket: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html?source=SkyeMusicNexus&artist=supaboy&artistId=444666666667&stageName=SupaBoy&roleLane=Artist%20%2F%20Music%20Nexus%20Contractor',
        contractorPacketInbox: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html?artist=supaboy',
        founderContractorPackets: '/api/founder-command/contractor-packets?artist=supaboy',
        aeCommand: '/ae-command/?artist=supaboy&artistId=444666666667&stageName=SupaBoy&lane=artist',
        workforceCommand: '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel',
        readinessReceipt: '/SkyeMusicNexus/data/supaboy-founder-provision.json',
        sharedWorkspaceLogin: '/admin/login.html?return=%2FSkyeMusicNexus%2Fartist-storefronts%2Fsupaboy%2Fwelcome-pack%2F'
      },
      relay13ConnectLog: {
        accountCode: 'SUPABOY-SKM',
        workspaceSlug: 'supaboy',
        workspaceId: 'ws_skyemusicnexus_supaboy',
        connectlogCardId: 'supaboy-artist-workspace',
        skygateClientSlug: 'supaboy-skm',
        messageModes: ['artist-workspace-chat', 'release-handoff'],
        status: 'queued'
      },
      skyemail: {
        reservedMailbox: 'supaboy@skyemail.solenterprises.org',
        businessId: 'skyemusicnexus-supaboy',
        acceptPath: '/founder-command/?view=mailboxes#workspace-handoffs',
        activationStatus: 'draft_ready_needs_owner_email',
        activationWindowHours: 24,
        ownerEmail: 'pending SupaBoy email confirmation'
      },
      paperwork: {
        requiredBeforePayout: true,
        status: 'required_before_checkout_or_external_payout',
        companyLane: 'Skyes Over London LC artist/vendor contractor onboarding',
        workforceFormUrl: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html?source=SkyeMusicNexus&artist=supaboy&artistId=444666666667&stageName=SupaBoy&roleLane=Artist%20%2F%20Music%20Nexus%20Contractor',
        workforceCommandUrl: '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel',
        aeCommandUrl: '/ae-command/?artist=supaboy&artistId=444666666667&stageName=SupaBoy&lane=artist',
        founderCommandPacketRoute: '/api/founder-command/contractor-packets?artist=supaboy',
        packetInboxUrl: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html?artist=supaboy',
        founderCommandCopy: true,
        requiredDocuments: ['contractor onboarding packet', 'independent contractor/vendor agreement acceptance', 'W-9 upload', 'payout profile', 'rights/master ownership attestation', 'owner approval'],
        payoutHoldReason: 'Checkout and external payout stay locked until paperwork, rights/audio ownership, payout destination verification, and owner review clear.'
      },
      freeReviewLimits: {
        appScans: 0,
        workspaceCommands: 25,
        proofExports: 5,
        testerSeats: 1
      },
      qrTargets: {
        reviewPilot: '/SkyeMusicNexus/public/walkthrough.html',
        liveApp: '/SkyeMusicNexus/artist-storefronts/supaboy/welcome-pack/',
        uploadSong: '/SkyeMusicNexus/public/upload.html?artist=supaboy&artistId=444666666667&releaseId=slb-superboy'
      },
      emailDraft: {
        subject: 'SupaBoy, your SkyeMusicNexus welcome pack is ready',
        body: "SupaBoy,\n\nYour Skye Music Nexus artist workspace is live. Start with your personalized welcome pack, then walk the full platform walkthrough so you can see the screens move through listener, artist signup, DAW, upload, release, rights, store, analytics, and proof.\n\nYour artist ID is 444666666667. That ID is reserved for SupaBoy only and is separate from Gray Skyes' founder artist record. Your access runs through the shared 0S/SkyGate lane, not a separate Music Nexus password. Payout stays on hold until paperwork and owner review are complete.\n\nYour public artist world now has the SLB / Superboy project lane, the 24 Hr In Houston proof visual, Twitch handoff, product desk, Upload Studio, Release Forge, Rights Vault, Drops, Artist Apps, Store Admin, upload path, release path, and paperwork path. Checkout stays locked until owned audio, rights, paperwork, and owner review are complete.\n\nTo upload a song: open Upload Studio from the welcome pack, keep artist ID 444666666667, choose an owned or properly licensed audio file, press Upload Gated Audio, copy the generated track line, paste it into Release Forge, then save rights in Rights Vault.\n\nWelcome pack: https://skye-music-nexus.pages.dev/artist-storefronts/supaboy/welcome-pack/\nWelcome page: https://skye-music-nexus.pages.dev/artist-storefronts/supaboy/welcome\nFull walkthrough: https://skye-music-nexus.pages.dev/public/walkthrough\nStorefront: https://skye-music-nexus.pages.dev/artist-storefronts/supaboy/\nProduct desk: https://skye-music-nexus.pages.dev/artist-storefronts/supaboy/products/\nUpload Studio: https://skye-music-nexus.pages.dev/public/upload.html?artist=supaboy&artistId=444666666667&releaseId=slb-superboy\nContractor packet: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html?source=SkyeMusicNexus&artist=supaboy&artistId=444666666667&stageName=SupaBoy&roleLane=Artist%20%2F%20Music%20Nexus%20Contractor\nAE Command: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ae-command/?artist=supaboy&artistId=444666666667&stageName=SupaBoy&lane=artist"
      },
      activationBoundaries: [
        'Live now: SupaBoy welcome pack, welcome file, artist world, product room, provision record, full platform walkthrough, written walkthrough packet, Upload Studio link, Release Forge link, Rights Vault link, Drops room, Artist Apps, Store Admin, and Twitch handoff.',
        'Access must run through the shared FS27/SkyGate/Free99 0S gate.',
        'No SupaBoy-specific founder, owner, admin, or client admin password has been created.',
        'Paperwork submits through the Marketing Made Easy encrypted packet vault and is visible to Founder Command through /api/founder-command/contractor-packets?artist=supaboy.',
        'Paperwork, rights/audio ownership review, payout destination verification, and owner approval are required before SkyePay payout eligibility can clear.',
        'Email sending from the Darthom Inc mailbox requires an authorized mailbox sender integration.'
      ]
    }
  ];

  const DEFAULT_FOUNDER = {
    companyName: 'Skyes Over London / MetrAIyux 0S',
    founderName: 'Gray London Skyes',
    founderTitle: 'Founder and Operator',
    email: OWNER_MARKETING_CONTACT_EMAIL,
    phone: '',
    website: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/',
    logoUrl: '/assets/skyes-over-london-deity-logo.png',
    heroImageUrl: '/assets/gray-london-skyes-founder-actual-source.png',
    headline: '0meg4Command 6.7 is the 0S founder command room.',
    bio: 'One gated cockpit for owner controls, client build handoffs, repo memory, project recipes, intros, reusable blocks, and real 0S assets.',
    story: 'This Founder Command replaces the temporary one-page launcher. Older command rooms remain reachable, but this surface is the canonical cockpit and it only advertises assets that actually exist or files you upload yourself.',
    ctaLabel: 'Open Founder Command',
    ctaHref: '/founder-command/',
    footerBlurb: 'Built and operated by Skyes Over London. Shared FS27/SkyGate/Free99 owner gate only.'
  };

  const slugify = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const escapeAttr = (value = '') => escapeHtml(value).replaceAll("'", '&#39;');

  const DEFAULT_TEMPLATES = [
    {
      id: 'template-0s-operator-intro',
      name: '0S Operator Intro',
      sourceFile: '0s-operator-intro.html',
      content: introHtml({
        title: 'MetrAIyux 0S',
        kicker: 'Founder Command',
        line: 'Operator cockpit online.',
        image: '/assets/metraiyux-0s-logo-transparent.png',
        accent: '#d8a439'
      })
    },
    {
      id: 'template-founder-command-intro',
      name: 'Founder Command Intro',
      sourceFile: 'founder-command-intro.html',
      content: introHtml({
        title: '0meg4Command 6.7',
        kicker: 'Skyes Over London',
        line: 'Routes, memory, builds, proof, and recovery from one gated surface.',
        image: '/assets/gray-london-skyes-founder-actual-source.png',
        accent: '#46c8dc'
      })
    },
    {
      id: 'template-client-factory-handoff',
      name: 'Client App Factory Handoff',
      sourceFile: 'client-app-factory-handoff.html',
      content: introHtml({
        title: 'Client App Factory',
        kicker: 'Private Build Lane',
        line: 'Client kits and founder handoffs stay attached to the command room.',
        image: '/client-app-factory/assets/proof/client-app-factory-workflow-poster.png',
        accent: '#61c27c'
      })
    }
  ];

  const DEFAULT_SNIPPETS = [
    {
      id: 'snippet-about-founder',
      name: 'About Founder Section',
      type: 'founder',
      code: '<section class="about-founder">\n  <div class="container">\n    <h2>About the Founder</h2>\n    <p>Gray London Skyes operates the Skyes Over London ecosystem and the 0S command surface that coordinates owner access, client build work, and repo memory.</p>\n  </div>\n</section>'
    },
    {
      id: 'snippet-global-footer',
      name: 'Global Footer',
      type: 'footer',
      code: '<footer class="global-footer">\n  <div class="container">\n    <p>Built and operated by Skyes Over London.</p>\n    <p><a href="mailto:MediaOverLondon@solenterprises.org">MediaOverLondon@solenterprises.org</a> · 1-(800)-484-4783</p>\n  </div>\n</footer>'
    },
    {
      id: 'snippet-command-nav',
      name: '0S Command Navigation',
      type: 'nav',
      code: '<nav class="command-nav">\n  <a href="/founder-command/">Founder Command</a>\n  <a href="/client-app-factory/">Client App Factory</a>\n  <a href="/founder-command/sitemap-indexing-agent.html">Sitemap Indexing Agent</a>\n  <a href="/admin/login.html?return=%2Ffounder-command%2F%3Fview%3Dcore%23pocket-skyemail">Owner Login</a>\n</nav>'
    },
    {
      id: 'snippet-brand-panel',
      name: 'Skyes Brand Panel',
      type: 'visual',
      code: '<section class="skyes-brand-panel">\n  <img src="/assets/skyes-over-london-deity-logo.png" alt="Skyes Over London" />\n  <div>\n    <p>Skyes Over London</p>\n    <h2>Owner-operated execution system.</h2>\n  </div>\n</section>'
    }
  ];

  const DEFAULT_PROJECTS = [
    {
      id: 'project-0meg4command-6-7-canon',
      name: '0meg4Command 6.7 Canonical Founder Command',
      slug: '0meg4command-6-7',
      description: 'Canonical 0S founder command with real assets, repo memory, live controls, and client factory access.',
      introTemplateId: 'template-founder-command-intro',
      includeFounderPage: true,
      includeFounderSection: true,
      includeFooterSnippet: true,
      selectedSnippetIds: ['snippet-command-nav', 'snippet-brand-panel'],
      selectedAssetIds: ['asset-founder-source', 'asset-skye-deity-logo', 'asset-client-factory-proof'],
      notes: 'Keep this as the owner command source of truth. Do not reintroduce unverified imported asset claims.'
    },
    {
      id: 'project-client-app-factory-private',
      name: 'Client App Factory Private Lane',
      slug: 'client-app-factory-private',
      description: 'Private client build factory accessible from Founder Command.',
      introTemplateId: 'template-client-factory-handoff',
      includeFounderPage: false,
      includeFounderSection: true,
      includeFooterSnippet: true,
      selectedSnippetIds: ['snippet-command-nav'],
      selectedAssetIds: ['asset-client-factory-founder', 'asset-client-factory-proof'],
      notes: 'Keep mounted behind the shared 0S gate and link from Founder Command.'
    }
  ];

  const state = {
    founder: structuredClone(DEFAULT_FOUNDER),
    assets: [],
    repoMemory: [],
    coreApps: structuredClone(DEFAULT_CORE_APPS),
    templates: structuredClone(DEFAULT_TEMPLATES),
    snippets: structuredClone(DEFAULT_SNIPPETS),
    projects: structuredClone(DEFAULT_PROJECTS),
    repoVault: null,
    workSystem: null,
    actionCatalog: null,
    valleyVerifiedRoutes: [],
    valleyVerifiedLoadedAt: '',
    valleyVerifiedLoadError: '',
    repoVaultLoadedEntries: [],
    repoVaultLoadedChunk: '',
    repoVaultLoadedAll: false,
    activeSongIndex: 0,
    activeSongObjectUrl: '',
    activeView: 'command',
    activeCoreAppId: 'core-pocket-skyemail',
    activeProjectId: 'project-0meg4command-6-7-canon',
    activeTemplateId: 'template-founder-command-intro',
    activeRepoMemoryId: '',
    activeValleyVerifiedRouteId: 'valley-verified-marketplace'
  };

  const $ = (id) => document.getElementById(id);
  const isExternalHref = (href = '') => /^https?:\/\//i.test(href);
  const linkAttrs = (href = '') => isExternalHref(href) ? ' target="_blank" rel="noopener"' : '';
  const absoluteHref = (href = '') => {
    if (!href) return '';
    if (isExternalHref(href)) return href;
    try {
      return new URL(href, location.origin).toString();
    } catch {
      return href;
    }
  };
  function updateFounderPwaInstallButton(label = 'Install PWA', disabled = false) {
    const button = $('installFounderPwaBtn');
    if (!button) return;
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredFounderInstallPrompt = event;
    updateFounderPwaInstallButton('Install Founder Command', false);
  });

  window.addEventListener('appinstalled', () => {
    deferredFounderInstallPrompt = null;
    updateFounderPwaInstallButton('Installed', true);
    toast('Founder Command installed.');
  });

  async function installFounderPwa() {
    if (!deferredFounderInstallPrompt) {
      toast('Founder Command is PWA-ready. Use the browser install button if the prompt is not available yet.');
      return;
    }
    deferredFounderInstallPrompt.prompt();
    const choice = await deferredFounderInstallPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    deferredFounderInstallPrompt = null;
    updateFounderPwaInstallButton(choice.outcome === 'accepted' ? 'Installed' : 'Install PWA', choice.outcome === 'accepted');
  }

  const isImage = (asset) => String(asset.mime || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(asset.name || asset.href || '');
  const isTextLike = (asset) => String(asset.mime || '').startsWith('text/') || /\.(html?|md|txt|json|css|js|mjs|toml)$/i.test(asset.name || '');
  const isHtmlLike = (asset) => String(asset.mime || '').includes('text/html') || /\.html?$/i.test(asset.name || '');
  const isAudio = (asset) => String(asset.mime || '').startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(asset.name || asset.href || '');
  const fmtBytes = (bytes) => {
    if (!bytes && bytes !== 0) return 'unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i += 1;
    }
    return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
  };
  const fmtNumber = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : 'unknown';
  const compactHash = (value = '', length = 16) => {
    const text = String(value || '');
    return text.length > length ? `${text.slice(0, length)}...` : text;
  };
  const fmtDateTime = (value = '') => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? (value || 'unknown') : date.toLocaleString();
  };
  const songVaultEntries = () => Array.isArray(SONG_VAULT.songs) ? SONG_VAULT.songs : [];
  const playableSongEntries = () => songVaultEntries().filter((song) =>
    Boolean(song.deployHref || song.href || (Array.isArray(song.deployParts) && song.deployParts.length))
  );
  const songVaultAssets = () => songVaultEntries().map((song) => ({
    id: `song-vault-${song.id || song.slug}`,
    name: song.title || song.fileName || 'Song',
    category: `song-vault/${song.collection || 'music'}`,
    kind: song.extension || 'audio',
    mime: song.mime || 'audio/mpeg',
    href: song.deployHref || '',
    sourcePath: song.vaultPath,
    notes: `${song.collectionLabel || 'Song Vault'} copy. Source: ${song.sourcePath || 'recorded in manifest'}${song.deployParts?.length ? ' Production download reconstructs this oversized master from deploy-safe parts.' : ''}`,
    size: song.bytes || 0,
    sha256: song.sha256 || '',
    deployParts: song.deployParts || [],
    songVault: true,
    repoAsset: true,
    real: true
  }));

  function introHtml({ title, kicker, line, image, accent }) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} Intro</title>
  <style>
    *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07090d;color:#f5f7fb;font-family:Inter,Arial,sans-serif}
    main{width:min(1120px,calc(100vw - 28px));display:grid;grid-template-columns:1fr .78fr;gap:18px;align-items:center}
    section{border:1px solid rgba(221,228,239,.16);border-radius:8px;background:#111721;padding:28px}
    p{color:#a5afbe;line-height:1.7}.eyebrow{color:${accent};font-weight:800;text-transform:uppercase;letter-spacing:.14em;font-size:12px}
    h1{font-size:clamp(42px,7vw,92px);line-height:.95;margin:10px 0 16px} img{width:100%;height:min(58vh,520px);object-fit:cover;border-radius:8px;border:1px solid rgba(221,228,239,.16);background:#0d1117}
    @media(max-width:860px){main{grid-template-columns:1fr}img{height:auto}}
  </style>
</head>
<body>
  <main>
    <section>
      <div class="eyebrow">${escapeHtml(kicker)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(line)}</p>
    </section>
    <img src="${escapeAttr(image)}" alt="${escapeAttr(title)}" />
  </main>
</body>
</html>`;
  }

  const db = {
    instance: null,
    init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => {
          this.instance = request.result;
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    },
    put(entry) {
      return new Promise((resolve, reject) => {
        const tx = this.instance.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    },
    get(id) {
      return new Promise((resolve, reject) => {
        const tx = this.instance.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    delete(id) {
      return new Promise((resolve, reject) => {
        const tx = this.instance.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    },
    clear() {
      return new Promise((resolve, reject) => {
        const tx = this.instance.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
  };

  function toast(message, error = false) {
    const el = document.createElement('div');
    el.className = `toast-message${error ? ' error' : ''}`;
    el.textContent = message;
    $('toast').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function cleanGateToken(value) {
    return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
  }

  function storedGateToken() {
    const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
    const bridgeSession = bridge?.requireSession?.({ platformId: 'founder-command', usageLane: 'founder-command' }) || bridge?.current?.();
    return cleanGateToken(bridgeSession?.token || '');
  }

  function commandHeaders() {
    const token = storedGateToken();
    if (!token) return {};
    return {
      authorization: `Bearer ${token}`,
      'x-skye-gate-session': token,
      'x-free99-gate-session': token
    };
  }

  async function commandApi(path, options = {}) {
    const init = {
      method: options.method || 'GET',
      credentials: 'include',
      headers: commandHeaders()
    };
    if (options.body) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(path, init);
    const body = await res.json().catch(() => ({}));
    return Object.assign({ ok: res.ok, status: res.status }, body);
  }

  function normalizeRepoMemory() {
    const entries = Array.isArray(window.OMEG4_REPO_MEMORY) ? window.OMEG4_REPO_MEMORY : [];
    return entries
      .filter((entry) => entry && entry.inlineText !== undefined)
      .map((entry) => ({
        id: entry.id || `repo-${slugify(entry.name || entry.sourcePath || 'memory')}`,
        name: entry.name || entry.sourcePath || 'Repo memory',
        category: entry.category || 'repo-memory',
        kind: entry.kind || 'txt',
        mime: entry.mime || 'text/plain;charset=utf-8',
        sourcePath: entry.sourcePath || '',
        notes: entry.notes || 'Loaded from repo memory.',
        inlineText: String(entry.inlineText || ''),
        size: Number(entry.size || String(entry.inlineText || '').length),
        repoMemory: true,
        real: true
      }));
  }

  function canonicalAssets() {
    return [
      ...REAL_REPO_ASSETS.map((asset) => ({ ...asset, real: true, repoAsset: true })),
      ...songVaultAssets(),
      ...state.repoMemory.map((entry) => ({ ...entry, real: true }))
    ];
  }

  function sanitizeSavedAssets(assets = []) {
    return assets.filter((asset) => {
      if (!asset || asset['catalog' + 'Only']) return false;
      if (/^asset-\d+-/.test(asset.id || '')) return false;
      if (asset.href || asset.inlineText !== undefined || asset.localUpload) return true;
      return false;
    });
  }

  function mergeAssets(savedAssets = []) {
    const canonical = canonicalAssets();
    const canonicalIds = new Set(canonical.map((asset) => asset.id));
    const savedMap = new Map(sanitizeSavedAssets(savedAssets).map((asset) => [asset.id, asset]));
    const merged = canonical.map((asset) => ({ ...asset, ...(savedMap.get(asset.id) || {}), real: true }));
    const localUploads = sanitizeSavedAssets(savedAssets).filter((asset) => !canonicalIds.has(asset.id));
    return [...merged, ...localUploads];
  }

  function migrateTemplates(templates = []) {
    const importedIds = new Set(['template-intro-1', 'template-cosmic-intro', 'template-fire-ocean-intro', 'template-royal-intro']);
    const custom = templates.filter((template) => {
      if (!template || importedIds.has(template.id)) return false;
      const importedPattern = new RegExp([String.fromCharCode(99, 100, 110, 49) + '\\.sharemy' + 'image', String.fromCharCode(99, 100, 110, 106, 115) + '\\.cloud' + 'flare', 'Intro1\\.html', 'intro_fire_ocean'].join('|'), 'i');
      if (importedPattern.test(template.content || template.sourceFile || '')) return false;
      return !DEFAULT_TEMPLATES.some((item) => item.id === template.id);
    });
    return [...structuredClone(DEFAULT_TEMPLATES), ...custom];
  }

  function migrateSnippets(snippets = []) {
    const custom = snippets.filter((snippet) => {
      if (!snippet || DEFAULT_SNIPPETS.some((item) => item.id === snippet.id)) return false;
      const importedPattern = new RegExp([String.fromCharCode(99, 100, 110, 49) + '\\.sharemy' + 'image', String.fromCharCode(99, 100, 110, 106, 115) + '\\.cloud' + 'flare'].join('|'), 'i');
      if (importedPattern.test(snippet.code || '')) return false;
      return true;
    });
    return [...structuredClone(DEFAULT_SNIPPETS), ...custom];
  }

  function normalizeCoreApp(app = {}) {
    const name = String(app.name || app.label || '').trim().slice(0, 120);
    const href = String(app.href || app.url || '').trim().slice(0, 1000);
    if (!name || !href) return null;
    return {
      id: String(app.id || `core-${slugify(name)}-${Date.now().toString(36)}`).trim().slice(0, 160),
      name,
      category: String(app.category || app.kind || 'custom').trim().slice(0, 80) || 'custom',
      href,
      mode: app.mode === 'new-tab' ? 'new-tab' : 'embed',
      notes: String(app.notes || app.description || '').trim().slice(0, 1000)
    };
  }

  function migrateCoreApps(apps = []) {
    const defaults = structuredClone(DEFAULT_CORE_APPS);
    const byId = new Map(defaults.map((app) => [app.id, app]));
    for (const item of apps || []) {
      const normalized = normalizeCoreApp(item);
      if (!normalized) continue;
      const defaultApp = byId.get(normalized.id);
      if (defaultApp) {
        byId.set(normalized.id, { ...normalized, href: defaultApp.href, mode: defaultApp.mode, notes: normalized.notes || defaultApp.notes });
      } else {
        byId.set(normalized.id, normalized);
      }
    }
    return [...byId.values()];
  }

  function loadState() {
    state.repoMemory = normalizeRepoMemory();
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) {
      state.assets = mergeAssets([]);
      saveState();
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state.founder = { ...DEFAULT_FOUNDER, ...(parsed.founder || {}) };
      state.repoMemory = normalizeRepoMemory();
      state.assets = mergeAssets(parsed.assets || []);
      state.coreApps = migrateCoreApps(parsed.coreApps || parsed.core_apps || []);
      state.templates = migrateTemplates(parsed.templates || []);
      state.snippets = migrateSnippets(parsed.snippets || []);
      state.projects = Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : structuredClone(DEFAULT_PROJECTS);
      state.activeView = parsed.activeView || 'command';
      state.activeCoreAppId = parsed.activeCoreAppId || state.coreApps[0]?.id || '';
      state.activeProjectId = parsed.activeProjectId || state.projects[0]?.id || '';
      state.activeTemplateId = parsed.activeTemplateId || state.templates[0]?.id || '';
      state.activeRepoMemoryId = parsed.activeRepoMemoryId || state.repoMemory[0]?.id || '';
      state.activeValleyVerifiedRouteId = parsed.activeValleyVerifiedRouteId || state.activeValleyVerifiedRouteId;
    } catch {
      state.repoMemory = normalizeRepoMemory();
      state.assets = mergeAssets([]);
      state.coreApps = migrateCoreApps([]);
    }
  }

  function saveState() {
    localStorage.setItem(APP_KEY, JSON.stringify({
      founder: state.founder,
      assets: state.assets,
      coreApps: state.coreApps,
      templates: state.templates,
      snippets: state.snippets,
      projects: state.projects,
      activeView: state.activeView,
      activeCoreAppId: state.activeCoreAppId,
      activeProjectId: state.activeProjectId,
      activeTemplateId: state.activeTemplateId,
      activeRepoMemoryId: state.activeRepoMemoryId,
      activeValleyVerifiedRouteId: state.activeValleyVerifiedRouteId
    }));
  }

  function setCommandMenuOpen(open) {
    const menu = $('commandMenu');
    const panel = $('commandMenuPanel');
    const toggle = $('commandMenuToggle');
    if (!menu || !panel || !toggle) return;
    menu.classList.toggle('open', Boolean(open));
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      filterCommandMenu($('commandMenuSearch')?.value || '');
      setTimeout(() => $('commandMenuSearch')?.focus(), 0);
    }
  }

  function syncCommandMenuLabel(view = state.activeView) {
    if ($('commandMenuLabel')) $('commandMenuLabel').textContent = VIEW_LABELS[view] || view || 'Command';
  }

  function filterCommandMenu(query = '') {
    const panel = $('commandMenuPanel');
    if (!panel) return;
    const needle = String(query || '').trim().toLowerCase();
    const buttons = Array.from(panel.querySelectorAll('.nav-button'));
    for (const button of buttons) {
      const label = [button.textContent, button.dataset.view].join(' ').toLowerCase();
      button.hidden = Boolean(needle && !label.includes(needle));
    }
    const labels = Array.from(panel.querySelectorAll('.menu-section-label'));
    for (const label of labels) {
      let hasVisibleButton = false;
      let node = label.nextElementSibling;
      while (node && !node.classList.contains('menu-section-label')) {
        if (node.classList?.contains('nav-button') && !node.hidden) hasVisibleButton = true;
        node = node.nextElementSibling;
      }
      label.hidden = !hasVisibleButton;
    }
  }

  function setView(view) {
    state.activeView = view;
    document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
    syncCommandMenuLabel(view);
    setCommandMenuOpen(false);
    saveState();
  }

  function setStatus(text) {
    $('statusBox').textContent = text;
  }

  function renderMetrics() {
    if ($('metricCoreApps')) $('metricCoreApps').textContent = state.coreApps.length;
    $('metricAssets').textContent = state.assets.filter((asset) => asset.repoAsset || asset.localUpload).length;
    if ($('metricSongVault')) $('metricSongVault').textContent = songVaultEntries().length;
    $('metricRepo').textContent = state.repoMemory.length;
    $('metricProjects').textContent = state.projects.length;
    $('metricPieces').textContent = `${state.templates.length} / ${state.snippets.length}`;
    if ($('metricCalendar')) $('metricCalendar').textContent = $('metricCalendar').textContent || 'Checking';
    if ($('metricSkyemerit')) $('metricSkyemerit').textContent = FOUNDER_SKYEMERIT.valueLabel;
    if ($('metricClientVault')) $('metricClientVault').textContent = CLIENT_CREDENTIALS.length;
    if ($('metricCompanyOps')) {
      const metrics = state.workSystem?.metrics || null;
      $('metricCompanyOps').textContent = metrics ? `${metrics.client_accounts || 0} / ${metrics.operating_lanes || 0}` : ($('metricCompanyOps').textContent || 'Checking');
    }
    updateBackupSummary();
  }

  function renderRoutes(extra = []) {
    const seen = new Set();
    const links = [...COMMAND_LINKS, ...extra].filter((link) => {
      if (!link.href || seen.has(link.href)) return false;
      seen.add(link.href);
      return true;
    });
    $('routeGrid').innerHTML = links.map((link) => `
      <a class="route-card" href="${escapeAttr(link.href)}"${linkAttrs(link.href)}>
        <strong>${escapeHtml(link.label)}</strong>
        <span>${escapeHtml(link.kind || 'route')}</span>
        <span>${escapeHtml(link.href)}</span>
      </a>
    `).join('');
  }

  function renderLinkGrid(id, links) {
    const container = $(id);
    if (!container) return;
    container.innerHTML = links.map((link) => `
      <a class="priority-link" href="${escapeAttr(link.href)}"${linkAttrs(link.href)}>
        <span>${escapeHtml(link.kind || 'route')}</span>
        <strong>${escapeHtml(link.label)}</strong>
        <small>${escapeHtml(link.href)}</small>
      </a>
    `).join('');
  }

  function renderCompanyOps(data = state.workSystem) {
    const loaded = Boolean(data?.ok);
    const metrics = data?.metrics || {};
    const pending = data == null;
    const emptyLabel = pending ? 'Checking' : 'Login';
    if ($('metricCompanyOps')) $('metricCompanyOps').textContent = loaded ? `${metrics.client_accounts || 0} / ${metrics.operating_lanes || 0}` : emptyLabel;
    if ($('companyOpsFounderState')) $('companyOpsFounderState').textContent = loaded ? (data.founder_account?.plan || 'Ready') : emptyLabel;
    if ($('companyOpsClientState')) $('companyOpsClientState').textContent = loaded ? `${metrics.client_accounts || 0} accounts` : emptyLabel;
    if ($('companyOpsLaneState')) $('companyOpsLaneState').textContent = loaded ? `${metrics.operating_lanes || 0} lanes` : emptyLabel;
    if ($('companyOpsAeState')) $('companyOpsAeState').textContent = loaded ? `${metrics.ae_contacts || 0} contacts` : emptyLabel;
    if ($('companyOpsMoneyState')) $('companyOpsMoneyState').textContent = loaded ? `$${Number(data.money?.command_bridge_money_usd || 0).toFixed(2)}` : emptyLabel;
    if ($('companyOpsBoundaryState')) $('companyOpsBoundaryState').textContent = loaded ? `${(data.boundaries || []).length} rules` : emptyLabel;
    if (!loaded) {
      if ($('companyOpsOutput')) $('companyOpsOutput').textContent = pending ? 'Company work system not loaded yet.' : (data?.error || 'Owner login required for the company work system.');
      for (const id of ['companyOpsFounderGrid', 'companyOpsQueueGrid', 'companyOpsClientGrid', 'companyOpsLaneGrid']) {
        if ($(id)) $(id).innerHTML = `<div class="empty-state">${pending ? 'Waiting for owner session.' : 'Owner login required.'}</div>`;
      }
      return;
    }

    const account = data.founder_account || {};
    if ($('companyOpsFounderGrid')) {
      const rows = [
        {label:'Founder', kind:account.legal_entity, value:account.founder, href:account.command_surface},
        {label:'Workspace', kind:account.plan, value:account.workspace_id, href:account.command_surface},
        {label:'Access', kind:account.access, value:account.auth_mode, href:account.owner_admin_login},
        {label:'Work System API', kind:'owner API', value:data.routes?.work_system, href:data.routes?.work_system}
      ];
      $('companyOpsFounderGrid').innerHTML = rows.map((row) => `
        <a class="route-card" href="${escapeAttr(row.href || '#')}"${linkAttrs(row.href || '')}>
          <strong>${escapeHtml(row.label)}</strong>
          <span>${escapeHtml(row.kind || '')}</span>
          <span>${escapeHtml(row.value || '')}</span>
        </a>
      `).join('');
    }

    if ($('companyOpsQueueGrid')) {
      $('companyOpsQueueGrid').innerHTML = (data.action_queues || []).map((item) => `
        <a class="route-card" href="${escapeAttr(item.href || '#')}"${linkAttrs(item.href || '')}>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.status || item.source || '')}</span>
          <span>${escapeHtml(item.source || '')}</span>
        </a>
      `).join('') || '<div class="empty-state">No queues returned.</div>';
    }

    if ($('companyOpsClientGrid')) {
      $('companyOpsClientGrid').innerHTML = (data.client_accounts || []).slice(0, 36).map((client) => {
        const lanes = client.lanes || {};
        const links = ['valley_verified', 'client_app_factory', 'northstar', 'ae_flow', 'ae_command', 'workforce', 'sovereign_docs', 'skypay']
          .map((key) => ({key, ...(lanes[key] || {})}))
          .filter((lane) => lane.href)
          .slice(0, 5);
        return `
          <article class="route-card">
            <strong>${escapeHtml(client.display_name || client.ids?.client_id || 'Client')}</strong>
            <span>${escapeHtml(client.status || 'client account')}</span>
            <span>${escapeHtml(client.ids?.workspace_id || '')}</span>
            <div class="tool-row">
              ${links.map((lane) => `<a class="button secondary" href="${escapeAttr(lane.href)}"${linkAttrs(lane.href)}>${escapeHtml(lane.key.replaceAll('_', ' '))}</a>`).join('')}
            </div>
          </article>
        `;
      }).join('') || '<div class="empty-state">No client accounts returned.</div>';
    }

    if ($('companyOpsLaneGrid')) {
      const lanes = [
        ...(data.operating_lanes || []).map((lane) => ({...lane, kind:lane.lane || '0S lane', detail:`${lane.recent_command_events || 0} events`})),
        ...(data.expansion_lanes || []).map((lane) => ({...lane, kind:lane.status || 'expansion', detail:lane.use || lane.api || ''}))
      ];
      $('companyOpsLaneGrid').innerHTML = lanes.map((lane) => `
        <a class="route-card" href="${escapeAttr(lane.href || lane.api || '#')}"${linkAttrs(lane.href || lane.api || '')}>
          <strong>${escapeHtml(lane.name || lane.id)}</strong>
          <span>${escapeHtml(lane.kind || lane.status || '')}</span>
          <span>${escapeHtml(lane.detail || lane.auth_mode || '')}</span>
        </a>
      `).join('') || '<div class="empty-state">No operating lanes returned.</div>';
    }

    if ($('companyOpsOutput')) {
      $('companyOpsOutput').textContent = JSON.stringify({
        founder_account: data.founder_account,
        metrics: data.metrics,
        routes: data.routes,
        boundaries: data.boundaries
      }, null, 2);
    }
  }

  function founderActionDefaults(action = {}) {
    if (action.id === 'command-bridge.event.record') return {
      source_app: 'founder-command',
      source_surface: 'operations',
      event_type: 'founder_command.owner_note',
      summary: 'Founder Command owner note',
      status: 'recorded'
    };
    if (action.id === 'client.enrollment.prepare') return {
      client_id: 'new-client',
      display_name: 'New client',
      priority: 'owner-review',
      notes: 'Prepare Valley Verified, NorthStar, SkyeMail, docs, billing, workforce, and app factory links.'
    };
    if (action.id === 'nexus.proof.ad-hire-enrollment-claim') {
      const stamp = Date.now();
      return {
        candidate_name: 'Founder Command Nexus Hire',
        candidate_email: `nexus.hire.${stamp}@metraiyux.local`,
        candidate_phone: '+15550100333',
        campaign_id: `founder_nexus_hire_${stamp}`,
        campaign_business: 'Skyes Over London LC Hiring Desk',
        ad_slot: 'discover_chart_rail',
        job_title: 'Founder Command Nexus hire workforce test job',
        job_description: 'No-payout owner-reviewed proof job for the Nexus ad to Workforce operating chain.',
        notes: 'Owner-triggered proof: ad click, hire, Workforce enrollment, test job claim, second-claim block.'
      };
    }
    if (action.id === 'mcp.mine.queue') return {
      target_folder: 'metraiyux_0s_site/founder-command',
      reason: 'Owner-requested MCP mining receipt'
    };
    if (action.id === 'deploy.proof.queue') return {
      surface: 'founder-command',
      route: '/founder-command/',
      proof_command: 'non-browser smoke and stress only',
      notes: 'Owner handles live browser verification.'
    };
    if (action.id === 'calendar.event.create') return {
      summary: 'Founder Command review',
      description: 'Owner operating review from Founder Command',
      ledger_only: true,
      source: 'founder-command-actions'
    };
    if (action.id === 'relay13.conversation.create') return {
      workspace: 'metraiyux-0s-owner',
      subject: 'Founder Command action',
      message: 'Open this operating lane for owner review.',
      channel: 'founder-command'
    };
    if (action.id === 'skyemail.handoff.create') return {
      action: 'provision',
      workspace_id: 'client-workspace',
      workspace_name: 'Client workspace',
      business_name: 'Client business',
      send_email: false
    };
    if (action.id === 'skyemail.offboarding.prepare') return {
      action: 'prepare',
      mailbox_email: '',
      workspace_id: '',
      reason: 'Owner offboarding review'
    };
    if (action.id === 'music.brain-daemon.run-now') return {
      force: true,
      reason: 'Owner-triggered daemon cycle',
      source: 'founder-command-actions'
    };
    if (action.id === 'music.brain-daemon.pause' || action.id === 'music.brain-daemon.resume') return {
      reason: 'Owner daemon control from Founder Command'
    };
    return {};
  }

  function selectedFounderAction() {
    const id = $('founderActionSelect')?.value || '';
    return (state.actionCatalog?.actions || []).find((action) => action.id === id) || null;
  }

  function founderActionPayload() {
    const action = selectedFounderAction();
    const raw = $('founderActionParams')?.value.trim() || '{}';
    let params = {};
    try {
      params = raw ? JSON.parse(raw) : {};
    } catch (error) {
      throw new Error(`Params JSON is invalid: ${error.message}`);
    }
    return {
      action_id: action?.id || $('founderActionSelect')?.value || '',
      params,
      confirm: Boolean($('founderActionConfirm')?.checked),
      idempotency_key: $('founderActionIdempotency')?.value.trim() || ''
    };
  }

  function renderFounderActions(data = state.actionCatalog) {
    const loaded = Boolean(data?.ok);
    const counts = data?.counts || {};
    if ($('founderActionCatalogState')) $('founderActionCatalogState').textContent = loaded ? `${counts.actions || 0} actions` : 'Login';
    if ($('founderActionExecutableState')) $('founderActionExecutableState').textContent = loaded ? `${counts.executable || 0}` : 'Login';
    if ($('founderActionQueueState')) $('founderActionQueueState').textContent = loaded ? `${counts.queue_only || 0}` : 'Login';
    if ($('founderActionRiskState')) $('founderActionRiskState').textContent = loaded ? `${counts.high_risk || 0}` : 'Login';
    if (!loaded) {
      if ($('founderActionOutput')) $('founderActionOutput').textContent = data?.error || 'Owner login required for Founder actions.';
      if ($('founderActionGrid')) $('founderActionGrid').innerHTML = '<div class="empty-state">Action catalog unavailable.</div>';
      return;
    }
    if ($('founderActionSelect')) {
      const current = $('founderActionSelect').value;
      $('founderActionSelect').innerHTML = (data.actions || []).map((action) => `
        <option value="${escapeAttr(action.id)}">${escapeHtml(action.label)} - ${escapeHtml(action.risk)}</option>
      `).join('');
      if (current && (data.actions || []).some((action) => action.id === current)) $('founderActionSelect').value = current;
      if (!$('founderActionParams')?.value.trim()) {
        const action = selectedFounderAction();
        if ($('founderActionParams')) $('founderActionParams').value = JSON.stringify(founderActionDefaults(action), null, 2);
      }
    }
    if ($('founderActionGrid')) {
      $('founderActionGrid').innerHTML = (data.actions || []).map((action) => `
        <article class="route-card">
          <strong>${escapeHtml(action.label)}</strong>
          <span>${escapeHtml(`${action.lane} | ${action.risk}${action.queue_only ? ' | queue' : ''}`)}</span>
          <span>${escapeHtml(action.target || '')}</span>
        </article>
      `).join('');
    }
    if ($('founderActionOutput')) {
      $('founderActionOutput').textContent = JSON.stringify({
        auth_mode: data.auth_mode,
        counts: data.counts,
        boundaries: data.boundaries
      }, null, 2);
    }
  }

  async function refreshFounderActions() {
    if ($('founderActionOutput')) $('founderActionOutput').textContent = 'Loading Founder action catalog...';
    const body = await commandApi('/api/founder-command/actions/catalog');
    if (!body.ok) {
      state.actionCatalog = null;
      renderFounderActions(body);
      return body;
    }
    state.actionCatalog = body;
    renderFounderActions(body);
    return body;
  }

  async function planFounderAction() {
    try {
      const payload = founderActionPayload();
      if (!payload.action_id) throw new Error('Choose an action first.');
      if ($('founderActionOutput')) $('founderActionOutput').textContent = 'Planning Founder action...';
      const body = await commandApi('/api/founder-command/actions/plan', { method: 'POST', body: payload });
      if ($('founderActionOutput')) $('founderActionOutput').textContent = JSON.stringify(body, null, 2);
      return body;
    } catch (error) {
      if ($('founderActionOutput')) $('founderActionOutput').textContent = error.message;
      toast(error.message, true);
      return null;
    }
  }

  async function executeFounderAction() {
    try {
      const payload = founderActionPayload();
      if (!payload.action_id) throw new Error('Choose an action first.');
      if ($('founderActionOutput')) $('founderActionOutput').textContent = 'Executing Founder action...';
      const body = await commandApi('/api/founder-command/actions/execute', { method: 'POST', body: payload });
      if ($('founderActionOutput')) $('founderActionOutput').textContent = JSON.stringify(body, null, 2);
      if (payload.action_id === 'nexus.proof.ad-hire-enrollment-claim') renderNexusHireChecklist(nexusHireResultFromExecute(body, payload.params));
      if (body.ok) toast('Founder action receipt written.');
      else toast(body.error || 'Founder action needs review.', true);
      return body;
    } catch (error) {
      if ($('founderActionOutput')) $('founderActionOutput').textContent = error.message;
      toast(error.message, true);
      return null;
    }
  }

  function nexusHireSetStates(states = {}) {
    if ($('nexusHireAdState') && states.ad) $('nexusHireAdState').textContent = states.ad;
    if ($('nexusHireAeState') && states.ae) $('nexusHireAeState').textContent = states.ae;
    if ($('nexusHireWorkforceState') && states.workforce) $('nexusHireWorkforceState').textContent = states.workforce;
    if ($('nexusHireJobState') && states.job) $('nexusHireJobState').textContent = states.job;
  }

  function nexusHireValues({ retry = false } = {}) {
    const now = Date.now();
    const name = ($('nexusHireName')?.value || '').trim() || 'Founder Command Nexus Hire';
    const email = ($('nexusHireEmail')?.value || '').trim() || `nexus.hire.${now}@metraiyux.local`;
    const baseSlug = slugify(email.split('@')[0] || name) || `nexus-hire-${now}`;
    const campaignId = ($('nexusHireCampaignId')?.value || '').trim() || `founder_nexus_hire_${baseSlug}_${now}`;
    const idempotency = ($('nexusHireIdempotency')?.value || '').trim() || `founder-nexus-hire-${baseSlug}-${now}`;
    return {
      name,
      email,
      phone: ($('nexusHirePhone')?.value || '').trim() || '+15550100333',
      campaignId,
      idempotency,
      jobTitle: ($('nexusHireJobTitle')?.value || '').trim() || `${name} workforce test job`,
      notes: ($('nexusHireNotes')?.value || '').trim() || `Founder Command ${retry ? 'retry' : 'run'}: Nexus ad hire, Workforce enrollment, no-payout test job claim.`,
      adSlot: 'discover_chart_rail',
      campaignBusiness: 'Skyes Over London LC Hiring Desk'
    };
  }

  function hydrateNexusHireFields(values) {
    if ($('nexusHireName')) $('nexusHireName').value = values.name;
    if ($('nexusHireEmail')) $('nexusHireEmail').value = values.email;
    if ($('nexusHirePhone')) $('nexusHirePhone').value = values.phone;
    if ($('nexusHireCampaignId')) $('nexusHireCampaignId').value = values.campaignId;
    if ($('nexusHireJobTitle')) $('nexusHireJobTitle').value = values.jobTitle;
    if ($('nexusHireIdempotency')) $('nexusHireIdempotency').value = values.idempotency;
    if ($('nexusHireNotes')) $('nexusHireNotes').value = values.notes;
  }

  function nexusHireActionParams(values) {
    return {
      candidate_name: values.name,
      candidate_email: values.email,
      candidate_phone: values.phone,
      campaign_id: values.campaignId,
      campaign_business: values.campaignBusiness,
      ad_slot: values.adSlot,
      job_title: values.jobTitle,
      job_description: 'No-payout Founder Command test job proving a hired Nexus candidate can enter Workforce and claim work.',
      notes: values.notes
    };
  }

  function nexusHireProofParts(body = {}) {
    const result = body.result || {};
    const proof = result.proof || body.proof || {};
    return {
      proof,
      ad: result.ad || body.ad || proof.ad || {},
      hire: result.hire || body.hire || proof.hire || {},
      workforce: result.workforce || body.workforce || proof.workforce || {},
      job: result.job || body.job || proof.job || {}
    };
  }

  function nexusHireResultFromExecute(execute = {}, params = {}) {
    const parts = nexusHireProofParts(execute);
    return {
      ok: Boolean(execute.ok && parts.proof.status === 'ad_clicked_hired_enrolled_test_job_claimed'),
      values: {
        name: params.candidate_name || parts.hire.candidate_name || '',
        email: params.candidate_email || parts.hire.candidate_email || '',
        campaignId: params.campaign_id || parts.ad.campaign_id || '',
        jobTitle: params.job_title || parts.job.title || ''
      },
      checks: {
        ad_clicked: Boolean(parts.ad.click_event_id),
        ae_hired: Boolean(parts.hire.ae_flow_stored),
        workforce_enrolled: Boolean(parts.workforce.routex_user_id && parts.workforce.contractor_profile_ready),
        job_claimed: parts.job.assignment_status === 'contractor_confirmed',
        second_claim_blocked: [400, 409].includes(Number(parts.job.blocked_second_claim_status || 0)),
        no_external_payout: parts.job.assignment_payment_status === 'founder_operational_test_no_external_payout'
      },
      calls: {
        execute: commandResultSummary(execute, { proofStatus: parts.proof.status || '' })
      },
      proof: parts.proof,
      ad: parts.ad,
      hire: parts.hire,
      workforce: parts.workforce,
      job: parts.job
    };
  }

  function renderNexusHireChecklist(result = {}) {
    if (!result || !$('nexusHireChecklist')) return;
    const checks = result.checks || {};
    const rows = [
      {
        label: 'Nexus ad click',
        ok: checks.ad_clicked,
        detail: result.ad?.click_event_id || result.ad?.placement_id || result.values?.campaignId || 'waiting',
        href: '/skymusicnexus/'
      },
      {
        label: 'AEFlow hire record',
        ok: checks.ae_hired,
        detail: result.hire?.candidate_email || result.values?.email || 'waiting',
        href: '/Marketing-Made-Easy/AE-FlowPro/'
      },
      {
        label: 'RouteX workforce profile',
        ok: checks.workforce_enrolled,
        detail: result.workforce?.routex_user_id || 'waiting',
        href: '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel'
      },
      {
        label: 'Test job assignment',
        ok: checks.job_claimed,
        detail: result.job?.assignment_id || result.job?.routex_job_id || 'waiting',
        href: result.job?.routex_job_id ? `/api/routex/jobs/${encodeURIComponent(result.job.routex_job_id)}` : '/api/routex/assignments'
      },
      {
        label: 'Second claim lock',
        ok: checks.second_claim_blocked,
        detail: checks.second_claim_blocked ? 'blocked' : 'waiting',
        href: '/api/routex/assignments'
      },
      {
        label: 'No external payout',
        ok: checks.no_external_payout,
        detail: result.job?.assignment_payment_status || 'waiting',
        href: '/SkyeRouteX/workforce-command-v0.4.0/index.html#proof'
      }
    ];
    $('nexusHireChecklist').innerHTML = rows.map((row) => `
      <a class="route-card" href="${escapeAttr(row.href)}"${linkAttrs(row.href)}>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${row.ok ? 'ok' : 'review'}</span>
        <span>${escapeHtml(row.detail || '')}</span>
      </a>
    `).join('');
  }

  function prefillNexusHireActionRouter() {
    const values = nexusHireValues();
    hydrateNexusHireFields(values);
    const select = $('founderActionSelect');
    if (select) {
      select.value = 'nexus.proof.ad-hire-enrollment-claim';
      select.dispatchEvent(new Event('change'));
    }
    if ($('founderActionParams')) $('founderActionParams').value = JSON.stringify(nexusHireActionParams(values), null, 2);
    if ($('founderActionIdempotency')) $('founderActionIdempotency').value = values.idempotency;
    if ($('founderActionConfirm')) $('founderActionConfirm').checked = true;
    toast('Nexus hire proof loaded into the owner action router.');
  }

  async function planNexusHireProof() {
    const values = nexusHireValues();
    hydrateNexusHireFields(values);
    nexusHireSetStates({ ad: 'Planning', ae: 'Pending', workforce: 'Pending', job: 'Pending' });
    if ($('nexusHireOutput')) $('nexusHireOutput').textContent = 'Planning Nexus hire to Workforce chain...';
    try {
      const plan = await commandApi('/api/founder-command/actions/plan', {
        method: 'POST',
        body: {
          action_id: 'nexus.proof.ad-hire-enrollment-claim',
          idempotency_key: values.idempotency,
          params: nexusHireActionParams(values)
        }
      });
      const result = {
        ok: Boolean(plan.ok),
        values,
        plan: commandResultSummary(plan, {
          approvalRequired: Boolean(plan.approval?.required),
          idempotencyRequired: Boolean(plan.idempotency?.required)
        })
      };
      if ($('nexusHireOutput')) $('nexusHireOutput').textContent = JSON.stringify(result, null, 2);
      nexusHireSetStates({ ad: plan.ok ? 'Planned' : 'Review', ae: 'Pending', workforce: 'Pending', job: 'Pending' });
      if (plan.ok) toast('Nexus hire chain plan ready.');
      else toast(plan.error || 'Nexus hire plan needs review.', true);
      return result;
    } catch (error) {
      if ($('nexusHireOutput')) $('nexusHireOutput').textContent = error.message;
      nexusHireSetStates({ ad: 'Error', ae: 'Review', workforce: 'Review', job: 'Review' });
      toast(error.message, true);
      return null;
    }
  }

  async function runNexusHireProof({ retry = false } = {}) {
    const values = nexusHireValues({ retry });
    hydrateNexusHireFields(values);
    nexusHireSetStates({ ad: retry ? 'Retrying' : 'Running', ae: 'Writing', workforce: 'Writing', job: 'Writing' });
    if ($('nexusHireOutput')) $('nexusHireOutput').textContent = 'Running Nexus ad hire to Workforce claim chain...';
    const startedAt = performance.now();
    try {
      const plan = await commandApi('/api/founder-command/actions/plan', {
        method: 'POST',
        body: {
          action_id: 'nexus.proof.ad-hire-enrollment-claim',
          idempotency_key: values.idempotency,
          params: nexusHireActionParams(values)
        }
      });
      const execute = await commandApi('/api/founder-command/actions/execute', {
        method: 'POST',
        body: {
          action_id: 'nexus.proof.ad-hire-enrollment-claim',
          confirm: true,
          idempotency_key: values.idempotency,
          params: nexusHireActionParams(values)
        }
      });
      const parts = nexusHireProofParts(execute);
      const jobId = parts.job.routex_job_id || '';
      const routexUserId = parts.workforce.routex_user_id || '';
      const [aeFlowContacts, routexUsers, routexJob, routexAssignments, routexAePool] = await Promise.all([
        commandApi('/api/founder-command/ae-flow/contacts?limit=100&detail=1'),
        commandApi('/api/routex/admin/users'),
        jobId ? commandApi(`/api/routex/jobs/${encodeURIComponent(jobId)}`) : Promise.resolve({ ok: false, status: 0 }),
        commandApi('/api/routex/assignments'),
        commandApi('/api/routex/ae/pool')
      ]);
      const contacts = Array.isArray(aeFlowContacts.contacts) ? aeFlowContacts.contacts : [];
      const users = Array.isArray(routexUsers.users) ? routexUsers.users : [];
      const assignments = Array.isArray(routexAssignments.assignments) ? routexAssignments.assignments : [];
      const profiles = Array.isArray(routexAePool.profiles) ? routexAePool.profiles : [];
      const email = values.email.toLowerCase();
      const aeFlowCandidate = contacts.find((row) => String(row.email || '').toLowerCase() === email);
      const routexCandidate = users.find((row) => row.id === routexUserId || String(row.email || '').toLowerCase() === email);
      const assignmentReadback = assignments.find((row) => row.id === parts.job.assignment_id || row.assignment?.id === parts.job.assignment_id);
      const aePoolReadback = profiles.find((row) => row.user_id === routexUserId || row.user?.id === routexUserId || String(row.user?.email || row.email || '').toLowerCase() === email);
      const checks = {
        plan: Boolean(plan.ok),
        execute: Boolean(execute.ok),
        ad_clicked: Boolean(parts.ad.click_event_id),
        ae_hired: Boolean(parts.hire.ae_flow_stored && aeFlowCandidate),
        workforce_enrolled: Boolean(parts.workforce.routex_user_id && parts.workforce.contractor_profile_ready && routexCandidate),
        job_claimed: parts.job.assignment_status === 'contractor_confirmed' && Boolean(assignmentReadback),
        second_claim_blocked: [400, 409].includes(Number(parts.job.blocked_second_claim_status || 0)),
        no_external_payout: parts.job.assignment_payment_status === 'founder_operational_test_no_external_payout',
        ae_pool_readback: Boolean(aePoolReadback)
      };
      const result = {
        ok: Object.values(checks).every(Boolean),
        generatedAt: new Date().toISOString(),
        elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
        retry,
        values,
        checks,
        proof: parts.proof,
        ad: parts.ad,
        hire: parts.hire,
        workforce: parts.workforce,
        job: parts.job,
        calls: {
          plan: commandResultSummary(plan, { approvalRequired: Boolean(plan.approval?.required), idempotencyRequired: Boolean(plan.idempotency?.required) }),
          execute: commandResultSummary(execute, { proofStatus: parts.proof.status || '' }),
          aeFlowContacts: commandResultSummary(aeFlowContacts, { candidateFound: Boolean(aeFlowCandidate) }),
          routexUsers: commandResultSummary(routexUsers, { candidateFound: Boolean(routexCandidate) }),
          routexJob: commandResultSummary(routexJob, { jobFound: routexJob.job?.id === jobId }),
          routexAssignments: commandResultSummary(routexAssignments, { assignmentFound: Boolean(assignmentReadback) }),
          routexAePool: commandResultSummary(routexAePool, { candidateFound: Boolean(aePoolReadback) })
        }
      };
      if ($('nexusHireOutput')) $('nexusHireOutput').textContent = JSON.stringify(result, null, 2);
      renderNexusHireChecklist(result);
      nexusHireSetStates({
        ad: checks.ad_clicked ? 'Clicked' : 'Review',
        ae: checks.ae_hired ? 'Hired' : 'Review',
        workforce: checks.workforce_enrolled ? 'Enrolled' : 'Review',
        job: checks.job_claimed ? 'Claimed' : 'Review'
      });
      if (result.ok) toast('Nexus hire to Workforce claim receipts written.');
      else toast('Nexus hire chain has items to review.', true);
      return result;
    } catch (error) {
      if ($('nexusHireOutput')) $('nexusHireOutput').textContent = error.message;
      nexusHireSetStates({ ad: 'Error', ae: 'Review', workforce: 'Review', job: 'Review' });
      toast(error.message, true);
      return null;
    }
  }

  function companyEnrollmentSetStates(states = {}) {
    if ($('companyEnrollAccountState') && states.account) $('companyEnrollAccountState').textContent = states.account;
    if ($('companyEnrollOperationsState') && states.operations) $('companyEnrollOperationsState').textContent = states.operations;
    if ($('companyEnrollIdentityState') && states.identity) $('companyEnrollIdentityState').textContent = states.identity;
    if ($('companyEnrollHandoffState') && states.handoffs) $('companyEnrollHandoffState').textContent = states.handoffs;
  }

  function companyEnrollmentValues() {
    const now = Date.now();
    const companyName = ($('companyEnrollName')?.value || '').trim() || `Founder Command Company ${now}`;
    const clientId = (slugify($('companyEnrollClientId')?.value || companyName) || `company-${now}`).slice(0, 96);
    const workspaceId = ($('companyEnrollWorkspaceId')?.value || '').trim() || `ws_${clientId}`;
    const ownerEmail = ($('companyEnrollOwnerEmail')?.value || '').trim() || `${clientId}@metraiyux.local`;
    const skyemail = ($('companyEnrollSkyEmail')?.value || '').trim() || `${clientId}@skyemail.solenterprises.org`;
    const runId = `founder-company-enrollment-${clientId}-${now}`;
    return {
      runId,
      clientId,
      accountId: `founder-client:${clientId}`,
      workspaceId,
      companyName,
      ownerEmail,
      ownerName: 'Founder Command Owner',
      skyemail,
      aeContactId: `ae_contact_${clientId}`,
      notes: ($('companyEnrollNotes')?.value || '').trim() || 'Founder Command company enrollment staged through the shared 0S gate.'
    };
  }

  function hydrateCompanyEnrollmentFields(values) {
    if ($('companyEnrollName')) $('companyEnrollName').value = values.companyName;
    if ($('companyEnrollClientId')) $('companyEnrollClientId').value = values.clientId;
    if ($('companyEnrollOwnerEmail')) $('companyEnrollOwnerEmail').value = values.ownerEmail;
    if ($('companyEnrollWorkspaceId')) $('companyEnrollWorkspaceId').value = values.workspaceId;
    if ($('companyEnrollSkyEmail')) $('companyEnrollSkyEmail').value = values.skyemail;
    if ($('companyEnrollNotes')) $('companyEnrollNotes').value = values.notes;
  }

  function companyEnrollmentActionParams(values) {
    return {
      client_id: values.clientId,
      display_name: values.companyName,
      owner_email: values.ownerEmail,
      owner_name: values.ownerName,
      company: values.companyName,
      workspace_id: values.workspaceId,
      priority: 'high',
      notes: values.notes
    };
  }

  function companyEnrollmentOperationSpecs() {
    return [
      ['crm-account', 'sales-crm', 'Client account created/linked, owner contact staged, and Valley Verified profile queued for review.'],
      ['ae-flow', 'ae-flowpro', 'AEFlow contact, paperwork, assignment, task, and commission proof staged.'],
      ['skyemail', 'skyemail', 'SkyeMail handoff staged with changeable owner mailbox and provider-safe ledger.'],
      ['skynet', 'deployment-crm', 'SkyeNet lane queued for static app/workspace route proof and owner deploy review.'],
      ['sovereigndocs', 'docs-crm', 'SovereignDocs client packet lane queued without public legal filing.'],
      ['billing-plan', 'billing-crm', 'Founder proof unlimited/no-charge billing state ledgered without external charge or payout.'],
      ['workspace', 'northstar-workspace', 'NorthStar/workspace setup linked to shared 0S account graph.'],
      ['workforce', 'workforce-crm', 'RouteX workforce/provider slot queued for owner-reviewed assignment.'],
      ['nexus', 'music-crm', 'Music Nexus/artist CRM lane linked for ad, campaign, and creator workflow proof.']
    ];
  }

  function companyEnrollmentIdentitySystems(values) {
    return [
      ['valley-verified', 'businesses', values.clientId, 'valley-business', values.ownerEmail],
      ['aeflow', 'contacts', values.aeContactId, 'ae-contact', values.ownerEmail],
      ['skymail', 'mailboxes', values.skyemail, 'mailbox', values.skyemail],
      ['skynet', 'routes', `/skyenet/${values.clientId}/`, 'deployment-route', values.ownerEmail],
      ['sovereigndocs', 'client_packets', `${values.clientId}:packet`, 'docs-packet', values.ownerEmail],
      ['skyepay', 'billing_refs', `skypay-${values.runId}`, 'billing-plan', values.ownerEmail],
      ['skyecommerce', 'merchants', `merchant_${values.clientId}`, 'merchant', values.ownerEmail],
      ['routex', 'workforce_users', `routex_${values.clientId}`, 'workforce-user', values.ownerEmail],
      ['musicnexus', 'artists', `artist_${values.clientId}`, 'music-nexus-profile', values.ownerEmail],
      ['relay13', 'inboxes', values.clientId, 'relay-inbox', values.ownerEmail],
      ['northstar', 'workspaces', values.workspaceId, 'workspace', values.ownerEmail],
      ['client_app_factory', 'client_apps', values.clientId, 'client-app', values.ownerEmail]
    ];
  }

  function commandResultSummary(body, extra = {}) {
    return {
      ok: Boolean(body?.ok),
      status: Number(body?.status || 0),
      error: body?.error || '',
      ...extra
    };
  }

  async function planCompanyEnrollment() {
    const values = companyEnrollmentValues();
    hydrateCompanyEnrollmentFields(values);
    companyEnrollmentSetStates({ account: 'Planning', operations: 'Pending', identity: 'Pending', handoffs: 'Pending' });
    if ($('companyEnrollOutput')) $('companyEnrollOutput').textContent = 'Planning company enrollment...';
    try {
      const plan = await commandApi('/api/founder-command/actions/plan', {
        method: 'POST',
        body: {
          action_id: 'client.enrollment.prepare',
          params: companyEnrollmentActionParams(values)
        }
      });
      const result = { values, plan: commandResultSummary(plan, { approvalRequired: Boolean(plan.approval?.required), queueOnly: Boolean(plan.execution?.queue_only) }), raw: plan };
      if ($('companyEnrollOutput')) $('companyEnrollOutput').textContent = JSON.stringify(result, null, 2);
      companyEnrollmentSetStates({ account: plan.ok ? 'Planned' : 'Review', operations: '9 lanes', identity: '12 links', handoffs: 'Staged' });
      if (plan.ok) toast('Company enrollment plan ready.');
      else toast(plan.error || 'Company enrollment plan needs review.', true);
      return result;
    } catch (error) {
      if ($('companyEnrollOutput')) $('companyEnrollOutput').textContent = error.message;
      companyEnrollmentSetStates({ account: 'Error', operations: 'Pending', identity: 'Pending', handoffs: 'Pending' });
      toast(error.message, true);
      return null;
    }
  }

  async function runCompanyEnrollment({ retry = false } = {}) {
    const values = companyEnrollmentValues();
    hydrateCompanyEnrollmentFields(values);
    companyEnrollmentSetStates({ account: retry ? 'Retrying' : 'Running', operations: 'Writing', identity: 'Writing', handoffs: 'Writing' });
    if ($('companyEnrollOutput')) $('companyEnrollOutput').textContent = 'Writing company enrollment receipts across the 0S...';
    const startedAt = performance.now();
    try {
      const plan = await commandApi('/api/founder-command/actions/plan', {
        method: 'POST',
        body: {
          action_id: 'client.enrollment.prepare',
          params: companyEnrollmentActionParams(values)
        }
      });
      const enrollmentExecute = await commandApi('/api/founder-command/actions/execute', {
        method: 'POST',
        body: {
          action_id: 'client.enrollment.prepare',
          confirm: true,
          idempotency_key: values.runId,
          params: companyEnrollmentActionParams(values)
        }
      });
      const account = await commandApi('/api/founder-command/accounts/upsert', {
        method: 'POST',
        body: {
          client_account_id: values.accountId,
          display_name: values.companyName,
          client_id: values.clientId,
          workspace_id: values.workspaceId,
          valley_business_id: values.clientId,
          relay_inbox_id: values.clientId,
          skyemail: values.skyemail,
          ae_contact_id: values.aeContactId,
          routex_user_id: `routex_${values.clientId}`,
          music_artist_id: `artist_${values.clientId}`,
          commerce_merchant_id: `merchant_${values.clientId}`,
          skyepay_refs: `skypay-${values.runId}`,
          status: retry ? 'founder-company-enrollment-retry' : 'founder-company-enrollment',
          source_systems: ['founder-command', 'valley-verified', 'aeflow', 'skymail', 'skynet', 'sovereigndocs', 'skyecommerce', 'routex', 'musicnexus', 'relay13', 'client_app_factory'],
          profile: {
            email: values.ownerEmail,
            phone: '555-010-0S00',
            city: 'Phoenix',
            state: 'AZ',
            website: `/skyenet/${values.clientId}/`,
            run_id: values.runId
          },
          routes: {
            founder_command: '/founder-command/index.html?view=operations',
            workspace: '/0s/index.html',
            skynet: `/skyenet/${values.clientId}/`,
            sovereigndocs: '/Free99/apps/sovereigndocs/',
            skyemail: '/live/SkyeMail/',
            routex: '/SkyeRouteX/workforce-command-v0.4.0/public/',
            nexus: '/skymusicnexus/'
          },
          paperwork: {
            enrollment_packet: 'staged',
            owner_approval: 'shared-gate-founder-session',
            legal_filing: 'not_auto_filed'
          },
          billing: {
            plan: 'founder-proof-unlimited-no-charge',
            status: 'ledgered_no_external_charge',
            external_payout: false
          }
        }
      });

      const operationSpecs = companyEnrollmentOperationSpecs();
      const operations = await Promise.all(operationSpecs.map(([id, lane, nextAction]) => commandApi(`/api/founder-command/accounts/${encodeURIComponent(values.accountId)}/operations`, {
        method: 'POST',
        body: {
          id: `${values.runId}:${id}`,
          lane,
          source_app: 'founder-command',
          source_record_id: values.runId,
          status: id === 'billing-plan' ? 'ledgered_no_external_charge' : 'queued_for_founder_review',
          priority: 'high',
          next_action: nextAction,
          links: [
            { label: 'Founder Command', href: '/founder-command/index.html?view=operations', kind: 'owner-command' }
          ]
        }
      })));

      const identitySystems = companyEnrollmentIdentitySystems(values);
      const identityLinks = await Promise.all(identitySystems.map(([system, table, sourceId, linkType, sourceEmail]) => commandApi('/api/founder-command/identity/link', {
        method: 'POST',
        body: {
          client_account_id: values.accountId,
          source_system: system,
          source_table: table,
          source_id: sourceId,
          source_email: sourceEmail,
          link_type: linkType,
          metadata: { run_id: values.runId, source_surface: 'founder-command-company-enrollment' }
        }
      })));

      const aeCapture = await commandApi('/api/founder-command/ae-flow/capture', {
        method: 'POST',
        body: {
          id: values.aeContactId,
          source: 'founder-company-enrollment',
          source_id: values.runId,
          collection: 'accounts',
          kind: 'client-enrollment',
          status: 'assigned_for_founder_review',
          name: values.companyName,
          company: values.companyName,
          email: values.ownerEmail,
          phone: '555-010-0S00',
          route: 'founder-company-enrollment',
          city: 'Phoenix',
          state: 'AZ',
          tags: ['company-enrollment', 'founder-command', 'ae-assignment', 'proof-no-payout'],
          notes: values.notes
        }
      });
      const aeImport = await commandApi('/api/founder-command/ae-flow/import-batch', {
        method: 'POST',
        body: {
          source: 'founder-company-enrollment',
          records: [
            { source: 'company-enrollment-account', source_id: `${values.runId}:account`, collection: 'accounts', kind: 'client', status: 'owner-managed', name: values.companyName, company: values.companyName, email: values.ownerEmail },
            { source: 'company-enrollment-paperwork', source_id: `${values.runId}:paperwork`, collection: 'handoff_log', kind: 'paperwork', status: 'packet_staged_not_publicly_filed', name: values.companyName, company: values.companyName, email: values.ownerEmail },
            { source: 'company-enrollment-commission', source_id: `${values.runId}:commission`, collection: 'deals', kind: 'commission', status: 'tracked_no_external_payout', name: values.companyName, company: values.companyName, email: values.ownerEmail },
            { source: 'company-enrollment-task', source_id: `${values.runId}:task`, collection: 'visits', kind: 'task', status: 'queued_for_founder_closeout', name: values.companyName, company: values.companyName, email: values.ownerEmail }
          ]
        }
      });
      const skyemailHandoff = await commandApi('/api/founder-command/skyemail/handoffs', {
        method: 'POST',
        body: {
          company_name: values.companyName,
          workspace_handle: values.clientId,
          workspace_slug: values.clientId,
          workspace_id: values.workspaceId,
          customer_id: `cust_${values.clientId}`,
          owner_email: values.ownerEmail,
          owner_name: values.ownerName,
          local_part: values.clientId,
          domain: 'skyemail.solenterprises.org',
          mailbox_email: values.skyemail,
          plan_id: 'founder-proof-unlimited-no-charge',
          send_email: false,
          public_contact_email: 'MediaOverLondon@solenterprises.org',
          workspace_confirmation_recipients: [
            'grayskyes@solenterprises.org',
            'SkyesOverLondonLC@solenterprises.org',
            'skyesoverlondon222@gmail.com'
          ],
          welcome_title: `${values.companyName} SkyeMail handoff`,
          welcome_message: 'Provider-safe enrollment handoff staged through the shared Founder Command gate.'
        }
      });
      const relayConversation = await commandApi('/api/founder-command/inbox/conversations', {
        method: 'POST',
        body: {
          workspace: values.clientId,
          workspace_slug: values.clientId,
          customer_name: values.companyName,
          customer_email: values.ownerEmail,
          subject: `Founder company enrollment ${values.runId}`,
          message: `Founder Command enrollment tying ${values.companyName} into account, workspace, AEFlow, SkyeMail, SkyeNet, docs, billing, workforce, Nexus, and Command Bridge receipts.`,
          source_url: '/founder-command/index.html?view=operations',
          external_user_id: values.runId,
          connectlog_card_id: `${values.clientId}-enrollment-card`,
          connectlog_card_label: `${values.companyName} enrollment card`,
          connectlog_campaign: 'founder-company-enrollment',
          connectlog_owner_name: 'Gray Skyes',
          connectlog_owner_company: 'Skyes Over London LC'
        }
      });
      const commandBridge = await commandApi('/api/founder-command/actions/execute', {
        method: 'POST',
        body: {
          action_id: 'command-bridge.event.record',
          params: {
            source_app: 'founder-command',
            source_surface: 'company-enrollment-ui',
            event_type: 'founder_command.company_enrollment',
            status: 'recorded',
            summary: `Founder company enrollment recorded for ${values.companyName}`,
            entity_kind: 'client-account',
            entity_id: values.accountId,
            entity_label: values.companyName,
            amount_cents: 0,
            currency: 'USD',
            provider: 'internal-ledger-no-external-charge'
          }
        }
      });
      const deployQueue = await commandApi('/api/founder-command/actions/execute', {
        method: 'POST',
        body: {
          action_id: 'deploy.proof.queue',
          confirm: true,
          params: {
            surface: values.companyName,
            route: `/skyenet/${values.clientId}/`,
            proof_command: 'node tools/proof-founder-company-enrollment-live-http.mjs',
            expected_receipt: 'test-artifacts/founder-company-enrollment-live-http/founder-company-enrollment-live-http-latest.json',
            notes: 'Queue owner manual deploy/proof review; Codex browser proof is disabled.'
          }
        }
      });
      const accountRead = await commandApi(`/api/founder-command/accounts/${encodeURIComponent(values.accountId)}`);
      const identityResolve = await commandApi('/api/founder-command/identity/resolve', {
        method: 'POST',
        body: { client_account_id: values.accountId, source_system: 'skymail', source_id: values.skyemail }
      });
      const skyemailRead = await commandApi('/api/founder-command/skyemail/handoffs?limit=30');
      const inboxRead = await commandApi(`/api/founder-command/inbox?workspace=${encodeURIComponent(values.clientId)}&limit=5`);
      const workSystem = await commandApi('/api/founder-command/work-system');

      const checks = {
        plan: Boolean(plan.ok),
        enrollment_action: Boolean(enrollmentExecute.ok),
        account: Boolean(account.ok),
        operations: operations.length === operationSpecs.length && operations.every((item) => item.ok),
        identity_links: identityLinks.length === identitySystems.length && identityLinks.every((item) => item.ok),
        aeflow: Boolean(aeCapture.ok && aeImport.ok),
        handoffs: Boolean(skyemailHandoff.ok && relayConversation.ok),
        command_bridge: Boolean(commandBridge.ok && deployQueue.ok),
        readback: Boolean(accountRead.ok && identityResolve.ok && skyemailRead.ok && inboxRead.ok && workSystem.ok)
      };
      const result = {
        ok: Object.values(checks).every(Boolean),
        generatedAt: new Date().toISOString(),
        elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
        retry,
        values,
        checks,
        calls: {
          plan: commandResultSummary(plan, { queueOnly: Boolean(plan.execution?.queue_only) }),
          enrollmentExecute: commandResultSummary(enrollmentExecute, { receiptId: enrollmentExecute.receipt?.id || '' }),
          account: commandResultSummary(account, { accountId: account.account?.client_account_id || '' }),
          operations: operations.map((item) => commandResultSummary(item, { operationId: item.operation?.id || '' })),
          identityLinks: identityLinks.map((item) => commandResultSummary(item, { linkId: item.link?.id || '' })),
          aeCapture: commandResultSummary(aeCapture, { contactId: aeCapture.captured?.contact_id || '' }),
          aeImport: commandResultSummary(aeImport, { accepted: aeImport.imported?.accepted || 0 }),
          skyemailHandoff: commandResultSummary(skyemailHandoff, { handoffId: skyemailHandoff.record?.id || '' }),
          relayConversation: commandResultSummary(relayConversation, { conversationId: relayConversation.record?.relay13?.conversation_id || '' }),
          commandBridge: commandResultSummary(commandBridge, { receiptId: commandBridge.receipt?.id || '' }),
          deployQueue: commandResultSummary(deployQueue, { receiptId: deployQueue.receipt?.id || '' }),
          accountRead: commandResultSummary(accountRead, { operations: accountRead.counts?.operations || 0, links: accountRead.counts?.identity_links || 0 }),
          identityResolve: commandResultSummary(identityResolve, { resolved: identityResolve.account?.client_account_id || '' }),
          skyemailRead: commandResultSummary(skyemailRead, { count: skyemailRead.count || 0 }),
          inboxRead: commandResultSummary(inboxRead, { mode: inboxRead.mode || '' }),
          workSystem: commandResultSummary(workSystem, { clientAccounts: workSystem.metrics?.client_accounts || 0 })
        }
      };
      if ($('companyEnrollOutput')) $('companyEnrollOutput').textContent = JSON.stringify(result, null, 2);
      companyEnrollmentSetStates({
        account: checks.account ? 'Written' : 'Review',
        operations: `${operations.filter((item) => item.ok).length}/${operationSpecs.length}`,
        identity: `${identityLinks.filter((item) => item.ok).length}/${identitySystems.length}`,
        handoffs: checks.handoffs ? 'Written' : 'Review'
      });
      if (result.ok) toast('Company enrollment receipts written.');
      else toast('Company enrollment has items to review.', true);
      return result;
    } catch (error) {
      if ($('companyEnrollOutput')) $('companyEnrollOutput').textContent = error.message;
      companyEnrollmentSetStates({ account: 'Error', operations: 'Review', identity: 'Review', handoffs: 'Review' });
      toast(error.message, true);
      return null;
    }
  }

  function aeCommandValues() {
    const now = Date.now();
    const workflowId = ($('aeCommandWorkflowId')?.value || '').trim() || `founder-ae-workflow-${now}`;
    return {
      workflowId,
      name: ($('aeCommandName')?.value || '').trim() || 'Founder Command AE',
      email: ($('aeCommandEmail')?.value || '').trim() || `ae-${now}@metraiyux.local`,
      client: ($('aeCommandClient')?.value || '').trim() || 'Founder Command client account',
      task: ($('aeCommandTask')?.value || '').trim() || 'Owner-reviewed AE assignment',
      notes: ($('aeCommandNotes')?.value || '').trim() || 'Created from Founder Command AEFlow lane.'
    };
  }

  async function assignAeCommandWork() {
    const values = aeCommandValues();
    if ($('aeCommandWorkflowId')) $('aeCommandWorkflowId').value = values.workflowId;
    if ($('aeCommandOutput')) $('aeCommandOutput').textContent = 'Writing AEFlow assignment receipts...';
    try {
      const contact = await commandApi('/api/founder-command/ae-flow/capture', {
        method: 'POST',
        body: {
          source: 'founder-command-ae-work-lane',
          kind: 'account-executive-assignment',
          status: 'assigned',
          name: values.name,
          email: values.email,
          company: values.client,
          notes: values.notes,
          tags: ['founder-command', 'ae-assignment', 'owner-reviewed']
        }
      });
      const workflow = await commandApi('/api/founder-command/ae-flow/runtime/activation-workflows', {
        method: 'POST',
        body: {
          id: values.workflowId,
          title: `${values.client} AE workflow`,
          owner: values.name,
          ae_email: values.email,
          status: 'assigned',
          notes: values.notes
        }
      });
      const execution = await commandApi(`/api/founder-command/ae-flow/runtime/activation-workflows/${encodeURIComponent(values.workflowId)}/execution`, {
        method: 'POST',
        body: {
          title: values.task,
          assignee: values.name,
          ae_email: values.email,
          client: values.client,
          status: 'assigned',
          notes: values.notes
        }
      });
      const executionId = execution.executionItem?.id || execution.executionItem?.executionItemId || execution.executionItem?.record_id || '';
      const journal = await commandApi('/api/founder-command/ae-flow/runtime/journal', {
        method: 'POST',
        body: {
          type: 'founder-command-ae-assignment',
          workflowId: values.workflowId,
          executionItemId: executionId,
          status: 'assigned',
          summary: `${values.name} assigned to ${values.client}`,
          notes: values.notes
        }
      });
      const result = {contact, workflow, execution, journal};
      if ($('aeCommandOutput')) $('aeCommandOutput').textContent = JSON.stringify(result, null, 2);
      if (contact.ok && workflow.ok && execution.ok && journal.ok) toast('AEFlow assignment receipt written.');
      else toast('AEFlow assignment needs review.', true);
      return result;
    } catch (error) {
      if ($('aeCommandOutput')) $('aeCommandOutput').textContent = error.message;
      toast(error.message, true);
      return null;
    }
  }

  async function closeAeCommandWork() {
    const values = aeCommandValues();
    const executionId = `founder-ae-closeout-${Date.now()}`;
    if ($('aeCommandOutput')) $('aeCommandOutput').textContent = 'Writing AEFlow closeout receipts...';
    try {
      const execution = await commandApi(`/api/founder-command/ae-flow/runtime/activation-workflows/${encodeURIComponent(values.workflowId)}/execution`, {
        method: 'POST',
        body: {
          id: executionId,
          title: values.task,
          assignee: values.name,
          ae_email: values.email,
          client: values.client,
          status: 'completed',
          notes: values.notes
        }
      });
      const dispatch = await commandApi(`/api/founder-command/ae-flow/runtime/execution-board/${encodeURIComponent(executionId)}/dispatch`, {
        method: 'POST',
        body: {
          title: `${values.client} AE closeout`,
          assignee: values.name,
          ae_email: values.email,
          client: values.client,
          status: 'closed',
          outcome: 'founder-command-closeout-recorded',
          notes: values.notes
        }
      });
      const journal = await commandApi('/api/founder-command/ae-flow/runtime/journal', {
        method: 'POST',
        body: {
          type: 'founder-command-ae-closeout',
          workflowId: values.workflowId,
          executionItemId: executionId,
          status: 'closed',
          summary: `${values.client} AE work closed from Founder Command`,
          notes: values.notes
        }
      });
      const result = {execution, dispatch, journal};
      if ($('aeCommandOutput')) $('aeCommandOutput').textContent = JSON.stringify(result, null, 2);
      if (execution.ok && dispatch.ok && journal.ok) toast('AEFlow closeout receipt written.');
      else toast('AEFlow closeout needs review.', true);
      return result;
    } catch (error) {
      if ($('aeCommandOutput')) $('aeCommandOutput').textContent = error.message;
      toast(error.message, true);
      return null;
    }
  }

  function coreAppsMapText() {
    return state.coreApps.map((app) => `${app.name} | ${app.category} | ${app.mode} | ${absoluteHref(app.href)} | ${app.notes || ''}`).join('\n');
  }

  function appOpenAttrs(app = {}) {
    const href = app.href || '#';
    return app.mode === 'new-tab' || isExternalHref(href) ? ` href="${escapeAttr(href)}"${linkAttrs(href)}` : ` href="${escapeAttr(href)}"`;
  }

  function renderCoreAppCard(app, { compact = false } = {}) {
    return `
      <article class="core-app-card">
        <div>
          <span>${escapeHtml(app.category || 'app')}</span>
          <strong>${escapeHtml(app.name)}</strong>
          ${compact ? '' : `<small>${escapeHtml(app.notes || app.href)}</small>`}
        </div>
        <div class="tool-row">
          <button class="button secondary" data-core-open="${escapeAttr(app.id)}" type="button">Preview</button>
          <a class="button secondary" ${appOpenAttrs(app)}>Open</a>
          ${compact ? '' : `<button class="button secondary" data-core-edit="${escapeAttr(app.id)}" type="button">Edit</button><button class="button danger" data-core-delete="${escapeAttr(app.id)}" type="button">Remove</button>`}
        </div>
      </article>
    `;
  }

  function renderCoreApps() {
    const grid = $('coreAppsGrid');
    if (grid) grid.innerHTML = state.coreApps.map((app) => renderCoreAppCard(app)).join('');
    const dock = $('pocketCoreAppDock');
    if (dock) dock.innerHTML = state.coreApps.slice(0, 8).map((app) => renderCoreAppCard(app, { compact: true })).join('');
    if ($('metricCoreApps')) $('metricCoreApps').textContent = state.coreApps.length;
    const active = state.coreApps.find((app) => app.id === state.activeCoreAppId) || state.coreApps[0];
    if (active && !$('coreAppFrame')?.getAttribute('src')) renderCoreAppPreview(active, { silent: true });
  }

  function renderCoreAppPreview(app, { silent = false } = {}) {
    if (!app) return;
    state.activeCoreAppId = app.id;
    if ($('coreAppPreviewTitle')) $('coreAppPreviewTitle').textContent = app.name;
    if ($('coreAppPreviewMeta')) $('coreAppPreviewMeta').textContent = `${app.category || 'app'} | ${app.mode || 'embed'} | ${absoluteHref(app.href)}`;
    const frame = $('coreAppFrame');
    if (frame) {
      if (app.mode === 'new-tab' || isExternalHref(app.href)) {
        frame.removeAttribute('src');
        frame.srcdoc = `<main style="font-family:Inter,Arial,sans-serif;background:#0b0b0a;color:#f7f3eb;min-height:100%;display:grid;place-items:center;padding:28px;text-align:center"><section><h1 style="margin:0 0 10px">${escapeHtml(app.name)}</h1><p style="color:#b7aa95">This production app opens as a full app so the provider/browser controls stay intact.</p><a style="color:#63c8dc" href="${escapeAttr(app.href)}" target="_blank" rel="noopener">Open ${escapeHtml(app.name)}</a></section></main>`;
      } else {
        frame.removeAttribute('srcdoc');
        frame.src = app.href;
      }
    }
    if (!silent) showJson('coreAppsOutput', { selected: app.name, href: absoluteHref(app.href), mode: app.mode, notes: app.notes });
    saveState();
  }

  function activeCoreApp() {
    return state.coreApps.find((app) => app.id === state.activeCoreAppId) || state.coreApps[0] || null;
  }

  async function requestCoreAppFullscreen() {
    const frame = document.querySelector('.phone-frame');
    if (!frame?.requestFullscreen) return toast('Fullscreen is not available in this browser.', true);
    await frame.requestFullscreen().catch((error) => toast(error.message || 'Fullscreen failed.', true));
  }

  function openActiveCoreApp() {
    const app = activeCoreApp();
    if (!app?.href) return toast('Choose a core app first.', true);
    window.open(app.href, '_blank', 'noopener');
  }

  function fillCoreAppForm(app = null) {
    if (!$('coreAppForm')) return;
    $('coreAppId').value = app?.id || '';
    $('coreAppName').value = app?.name || '';
    $('coreAppCategory').value = app?.category || '';
    $('coreAppHref').value = app?.href || '';
    $('coreAppMode').value = app?.mode || 'embed';
    $('coreAppNotes').value = app?.notes || '';
  }

  function indexingSubmitText() {
    return [
      'Search Console: https://search.google.com/search-console',
      '',
      'Submit these exact URLs:',
      ...INDEXING_SURFACES.map((surface) => `${surface.label} | ${surface.kind} | ${absoluteHref(surface.href)}`)
    ].join('\n');
  }

  function renderIndexing() {
    if ($('metricIndexing')) $('metricIndexing').textContent = INDEXING_SURFACES.length;
    renderLinkGrid('priorityGrid', OPEN_NOW_LINKS);
    renderLinkGrid('productionGrid', PRODUCTION_LINKS);
    const grid = $('indexingSurfaceGrid');
    if (grid) {
      grid.innerHTML = INDEXING_SURFACES.map((surface) => `
        <a class="route-card" href="${escapeAttr(surface.href)}"${linkAttrs(surface.href)}>
          <strong>${escapeHtml(surface.label)}</strong>
          <span>${escapeHtml(surface.kind)}</span>
          <span>${escapeHtml(absoluteHref(surface.href))}</span>
        </a>
      `).join('');
    }
    if ($('indexingSubmitPack')) $('indexingSubmitPack').textContent = indexingSubmitText();
  }

  function titleFromValleySlug(slug = '') {
    if (VALLEY_VERIFIED_CLIENT_NAMES[slug]) return VALLEY_VERIFIED_CLIENT_NAMES[slug];
    return String(slug || 'Valley Verified Client')
      .split('-')
      .filter(Boolean)
      .map((part) => part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }

  function safeValleyVerifiedPublicUrl(value = '') {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.toString();
    } catch {
      return '';
    }
  }

  function normalizeValleyVerifiedRoute(route = {}, source = 'fallback') {
    const clientId = String(route.client_id || route.slug || route.project_id || '').trim();
    const publicUrl = safeValleyVerifiedPublicUrl(route.public_url || route.skynet_public_url || route.live_url || route.url);
    if (!clientId || !publicUrl) return null;
    return {
      client_id: clientId,
      business_name: route.business_name || route.name || VALLEY_VERIFIED_CLIENT_NAMES[clientId] || titleFromValleySlug(clientId),
      public_url: publicUrl,
      workspace_id: route.workspace_id || clientId,
      project_id: route.project_id || clientId,
      deployment_id: route.deployment_id || '',
      route_key: route.route_key || '',
      source_download_api: route.source_download_api || '',
      source_auth: route.source_auth || 'Shared FS27/SkyGate/Free99 bearer session required',
      lane: route.lane || (clientId === 'valley-verified-marketplace' ? 'marketplace-client-network' : 'valley-verified-client-app'),
      proof_state: source === 'fallback'
        ? 'unverified-route-record'
        : route.deployment_proof_state?.state || route.proof_state || (route.deployment_id ? 'proof-recorded' : 'public-route-recorded'),
      source
    };
  }

  function mergeValleyVerifiedRoutes(routes = []) {
    const order = VALLEY_VERIFIED_SKYENET_FALLBACK_ROUTES.map((route) => route.client_id);
    const byId = new Map();
    for (const route of VALLEY_VERIFIED_SKYENET_FALLBACK_ROUTES) {
      const normalized = normalizeValleyVerifiedRoute(route, 'fallback');
      if (normalized) byId.set(normalized.client_id, normalized);
    }
    for (const route of routes) {
      const normalized = normalizeValleyVerifiedRoute(route, 'route-index');
      if (!normalized) continue;
      byId.set(normalized.client_id, { ...(byId.get(normalized.client_id) || {}), ...normalized });
      if (!order.includes(normalized.client_id)) order.push(normalized.client_id);
    }
    return order.map((id) => byId.get(id)).filter(Boolean);
  }

  async function loadValleyVerifiedRoutes() {
    state.valleyVerifiedRoutes = mergeValleyVerifiedRoutes([]);
    state.valleyVerifiedLoadedAt = new Date().toISOString();
    state.valleyVerifiedLoadError = '';
    try {
      const response = await fetch(VALLEY_VERIFIED_ROUTE_INDEX_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`route index returned ${response.status}`);
      const data = await response.json();
      state.valleyVerifiedRoutes = mergeValleyVerifiedRoutes(data.routes || []);
      state.valleyVerifiedLoadedAt = data.generated_at || new Date().toISOString();
    } catch (error) {
      state.valleyVerifiedLoadError = error?.message || 'route index unavailable; showing unverified fallback route records';
    }
    if (!findValleyVerifiedRoute(state.activeValleyVerifiedRouteId)) {
      state.activeValleyVerifiedRouteId = state.valleyVerifiedRoutes[0]?.client_id || '';
    }
  }

  function findValleyVerifiedRoute(id = '') {
    return state.valleyVerifiedRoutes.find((route) => route.client_id === id) || state.valleyVerifiedRoutes[0] || null;
  }

  function valleyVerifiedBlast(route = findValleyVerifiedRoute()) {
    if (!route) return 'No Valley Verified route selected.';
    if (route.source === 'fallback') {
      return [
        `${route.business_name} has a saved SkyeNet route record: ${route.public_url}`,
        'Founder Command could not verify the live route index in this session, so do not call this a live client app until Refresh Routes confirms it from SkyeNet.',
        `It is not an official ${route.business_name} site unless they approve and adopt it.`
      ].join(' ');
    }
    return [
      `Hey ${route.business_name}, I built you a free live SkyeNet preview app: ${route.public_url}`,
      'This is a working prototype hosted on Skyes Over London sovereign SkyeNet infrastructure, not just a mockup or a generic agency landing page.',
      `It is not an official ${route.business_name} site unless you approve and adopt it; we can remove it, update it, or hand it over on request.`
    ].join(' ');
  }

  function valleyVerifiedLinksText() {
    return state.valleyVerifiedRoutes
      .map((route) => `${route.business_name} | ${route.client_id} | ${route.public_url}`)
      .join('\n');
  }

  function valleyVerifiedRouteReceipt(route = findValleyVerifiedRoute()) {
    if (!route) return {};
    return {
      selected: route.business_name,
      client_id: route.client_id,
      live_url: route.public_url,
      proof_state: route.proof_state,
      deployment_id: route.deployment_id || 'recorded externally',
      source_download_api: route.source_download_api || 'not recorded in fallback',
      source_auth: route.source_auth,
      loaded_at: state.valleyVerifiedLoadedAt,
      route_index: VALLEY_VERIFIED_ROUTE_INDEX_URL,
      load_warning: state.valleyVerifiedLoadError || ''
    };
  }

  function renderValleyVerifiedShowroom({ forceFrameReload = false } = {}) {
    const routes = state.valleyVerifiedRoutes.length ? state.valleyVerifiedRoutes : mergeValleyVerifiedRoutes([]);
    state.valleyVerifiedRoutes = routes;
    const active = findValleyVerifiedRoute(state.activeValleyVerifiedRouteId) || routes[0] || null;
    if (active) state.activeValleyVerifiedRouteId = active.client_id;
    if ($('valleyVerifiedRouteCount')) $('valleyVerifiedRouteCount').textContent = String(routes.length);
    if ($('valleyVerifiedLiveCount')) $('valleyVerifiedLiveCount').textContent = String(routes.filter((route) => route.public_url && route.source !== 'fallback').length);
    if ($('valleyVerifiedProofState')) $('valleyVerifiedProofState').textContent = state.valleyVerifiedLoadError ? 'Unverified fallback' : 'Route index';
    if ($('valleyVerifiedActiveName')) $('valleyVerifiedActiveName').textContent = active?.business_name || 'Select client';
    if ($('valleyVerifiedActiveUrl')) $('valleyVerifiedActiveUrl').textContent = active?.public_url || '';
    if ($('valleyVerifiedOpenLink')) $('valleyVerifiedOpenLink').href = active?.public_url || '#';
    if ($('valleyVerifiedOutput')) $('valleyVerifiedOutput').textContent = valleyVerifiedBlast(active);
    const list = $('valleyVerifiedClientList');
    if (list) {
      list.innerHTML = routes.map((route) => `
        <article class="route-card valley-client-card${route.client_id === active?.client_id ? ' active' : ''}">
          <strong>${escapeHtml(route.business_name)}</strong>
          <span>${escapeHtml(route.client_id)}</span>
          <span>${escapeHtml(route.public_url)} · ${route.source === 'fallback' ? 'unverified fallback' : 'route index'}</span>
          <div class="tool-row">
            <button class="button secondary" data-valley-route-preview="${escapeAttr(route.client_id)}" type="button">Preview</button>
            <a class="button secondary" href="${escapeAttr(route.public_url)}" target="_blank" rel="noopener">Open</a>
            <button class="button secondary" data-valley-route-copy="${escapeAttr(route.client_id)}" type="button">Copy</button>
          </div>
        </article>
      `).join('');
    }
    const frame = $('valleyVerifiedFrame');
    if (frame && active && (forceFrameReload || frame.getAttribute('src') !== active.public_url)) {
      frame.removeAttribute('srcdoc');
      if (forceFrameReload) frame.removeAttribute('src');
      frame.src = active.public_url;
    }
  }

  function previewValleyVerifiedRoute(id = '') {
    const route = findValleyVerifiedRoute(id);
    if (!route) return;
    state.activeValleyVerifiedRouteId = route.client_id;
    renderValleyVerifiedShowroom();
    showJson('valleyVerifiedOutput', valleyVerifiedRouteReceipt(route));
    saveState();
  }

  async function copyValleyVerifiedRoute(id = '') {
    const route = findValleyVerifiedRoute(id);
    if (!route) return;
    await copyText(`${route.business_name}\n${route.public_url}\n\n${valleyVerifiedBlast(route)}`);
    showJson('valleyVerifiedOutput', valleyVerifiedRouteReceipt(route));
  }

  async function refreshValleyVerifiedRoutes() {
    await loadValleyVerifiedRoutes();
    renderRoutes(state.valleyVerifiedRoutes.map((route) => ({ label: route.business_name, href: route.public_url, kind: 'Valley Verified SkyeNet' })));
    renderValleyVerifiedShowroom({ forceFrameReload: true });
    showJson('valleyVerifiedOutput', {
      refreshed: true,
      routes: state.valleyVerifiedRoutes.length,
      source: VALLEY_VERIFIED_ROUTE_INDEX_URL,
      warning: state.valleyVerifiedLoadError || ''
    });
  }

  function openActiveValleyVerifiedRoute() {
    const route = findValleyVerifiedRoute(state.activeValleyVerifiedRouteId);
    if (!route?.public_url) return toast('Choose a Valley Verified route first.', true);
    window.open(route.public_url, '_blank', 'noopener');
  }

  async function copyActiveValleyVerifiedBlast() {
    const route = findValleyVerifiedRoute(state.activeValleyVerifiedRouteId);
    await copyText(valleyVerifiedBlast(route));
    showJson('valleyVerifiedOutput', valleyVerifiedRouteReceipt(route));
  }

  async function copyAllValleyVerifiedLinks() {
    await copyText(valleyVerifiedLinksText());
    showJson('valleyVerifiedOutput', valleyVerifiedLinksText());
  }

  function clientCredentialPayload(client = CLIENT_CREDENTIALS[0]) {
    if (!client) return {};
    const payload = {
      schema: 'founder-command.client-credential-pack.v1',
      client: client.client,
      client_slug: client.clientSlug,
      credential_kind: client.credentialKind || 'client-workspace-handoff',
      updated_at: client.updatedAt,
      status: client.status,
      auth_boundary: client.authBoundary,
      public_contact: client.publicContact || { email: OWNER_MARKETING_CONTACT_EMAIL, phone: OWNER_MARKETING_CONTACT_PHONE },
      workspace_confirmation_recipients: client.workspaceConfirmationRecipients || OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS,
      live_urls: {
        customer_app: client.liveUrls.customerApp,
        workspace_preview: client.liveUrls.workspacePreview,
        welcome_pack: client.liveUrls.welcomePack,
        welcome: client.liveUrls.welcome,
        product_desk: client.liveUrls.productDesk,
        pilot_review: client.liveUrls.pilotReview,
        pilot_flyer: client.liveUrls.pilotFlyer,
        free_stack_pitch: client.liveUrls.freeStackPitch,
        free_stack_flyer: client.liveUrls.freeStackFlyer,
        zero_os_browser: client.liveUrls.zeroOsBrowser,
        pricing_router: client.liveUrls.pricingRouter,
        ae_flowpro: client.liveUrls.aeFlowPro,
        citadeldb: client.liveUrls.citadelDb,
        connectlog: client.liveUrls.connectLog,
        relay13: client.liveUrls.relay13,
        upload_song: client.liveUrls.uploadSong,
        release_forge: client.liveUrls.releaseForge,
        rights_vault: client.liveUrls.rightsVault,
        drops_room: client.liveUrls.dropsRoom,
        artist_apps: client.liveUrls.artistApps,
        store_admin: client.liveUrls.storeAdmin,
        contractor_packet: client.liveUrls.contractorPacket,
	        contractor_packet_inbox: client.liveUrls.contractorPacketInbox,
	        founder_contractor_packets: client.liveUrls.founderContractorPackets,
	        ae_command: client.liveUrls.aeCommand,
	        workforce_command: client.liveUrls.workforceCommand,
	        company_site: client.liveUrls.companySite,
	        provider_panel: client.liveUrls.providerPanel,
	        contractor_panel: client.liveUrls.contractorPanel,
	        house_command: client.liveUrls.houseCommand,
	        proof_panel: client.liveUrls.proofPanel,
	        gate_status: client.liveUrls.gateStatus,
	        v83_dashboard: client.liveUrls.v83Dashboard,
	        v83_routes: client.liveUrls.v83Routes,
	        v83_stops: client.liveUrls.v83Stops,
	        v83_workforce: client.liveUrls.v83Workforce,
	        v83_proof_vault: client.liveUrls.v83ProofVault,
	        v83_analytics: client.liveUrls.v83Analytics,
	        v83_runtime: client.liveUrls.v83Runtime,
	        v83_settings: client.liveUrls.v83Settings,
	        audit_console: client.liveUrls.auditConsole,
	        platform_truth: client.liveUrls.platformTruth,
	        api_reference: client.liveUrls.apiReference,
	        provider_env_audit: client.liveUrls.providerEnvAudit,
	        latest_mounted_worker_stress: client.liveUrls.latestMountedWorkerStress,
	        latest_live_production_stress: client.liveUrls.latestLiveProductionStress,
	        route_ae_workforce_lane: client.liveUrls.routeAeWorkforceLane,
	        routex_api: client.liveUrls.routexApi,
	        routex_alias_api: client.liveUrls.routexAliasApi,
	        route_manifest: client.liveUrls.routeManifest,
	        valley_map: client.liveUrls.valleyMap,
	        legal_logistics: client.liveUrls.legalLogistics,
	        skyemail_inbox: client.liveUrls.skyemailInbox,
	        skyemail_compose: client.liveUrls.skyemailCompose,
	        readiness_receipt: client.liveUrls.readinessReceipt,
	        shared_workspace_login: client.liveUrls.sharedWorkspaceLogin
	      },
	      company: client.company || undefined,
	      logistics_stack: client.logisticsStack || undefined,
	      owner_inventory: client.ownerInventory || undefined,
	      map_inventory: client.mapInventory || undefined,
      relay13_connectlog: {
        account_code: client.relay13ConnectLog.accountCode,
        workspace_slug: client.relay13ConnectLog.workspaceSlug,
        workspace_id: client.relay13ConnectLog.workspaceId,
        connectlog_card_id: client.relay13ConnectLog.connectlogCardId,
        skygate_client_slug: client.relay13ConnectLog.skygateClientSlug,
        message_modes: client.relay13ConnectLog.messageModes,
        status: client.relay13ConnectLog.status
      },
      skyemail: {
        reserved_mailbox: client.skyemail.reservedMailbox,
        business_id: client.skyemail.businessId,
        accept_path: client.skyemail.acceptPath,
        activation_status: client.skyemail.activationStatus,
        activation_window_hours: client.skyemail.activationWindowHours,
        owner_email: client.skyemail.ownerEmail
      },
      paperwork: client.paperwork ? {
        required_before_payout: client.paperwork.requiredBeforePayout === true,
        status: client.paperwork.status,
        company_lane: client.paperwork.companyLane,
        workforce_form_url: client.paperwork.workforceFormUrl,
        workforce_command_url: client.paperwork.workforceCommandUrl,
        ae_command_url: client.paperwork.aeCommandUrl,
        founder_command_packet_route: client.paperwork.founderCommandPacketRoute,
        packet_inbox_url: client.paperwork.packetInboxUrl,
        founder_command_copy: client.paperwork.founderCommandCopy === true,
        required_documents: client.paperwork.requiredDocuments || [],
        payout_hold_reason: client.paperwork.payoutHoldReason
      } : undefined,
      free_review_limits: {
        app_scans: client.freeReviewLimits.appScans,
        workspace_commands: client.freeReviewLimits.workspaceCommands,
        proof_exports: client.freeReviewLimits.proofExports,
        tester_seats: client.freeReviewLimits.testerSeats
      },
      qr_targets: {
        review_pilot: client.qrTargets.reviewPilot,
        live_app: client.qrTargets.liveApp,
        free_stack_pitch: client.qrTargets.freeStackPitch,
        free_stack_flyer: client.qrTargets.freeStackFlyer,
        zero_os_browser: client.qrTargets.zeroOsBrowser,
        upload_song: client.qrTargets.uploadSong
      },
      provisioning_status: client.provisioningStatus || {},
      activation_boundaries: client.activationBoundaries
    };
    if (client.artist) {
      payload.artist = {
        artist_id: client.artist.artistId,
        slug: client.artist.slug,
        stage_name: client.artist.stageName,
        tier: client.artist.tier,
        roles: client.artist.roles,
        skye_pay_tracking_ref: client.artist.skyePayTrackingRef,
        payout_status: client.artist.payoutStatus
      };
    }
    if (client.emailDraft) {
      payload.email_draft = {
        send_status: 'draft_ready_not_sent',
        subject: client.emailDraft.subject,
        body: client.emailDraft.body
      };
    }
    return payload;
  }

	  function clientCredentialFields(client = CLIENT_CREDENTIALS[0]) {
	    if (!client) return [];
	    const isArtist = client.credentialKind === 'artist-workspace-handoff';
	    const isLogistics = client.credentialKind === 'company-logistics-owner-lane';
	    const limits = client.freeReviewLimits || {};
	    const relay = client.relay13ConnectLog || {};
	    const urls = client.liveUrls || {};
	    const skyemail = client.skyemail || {};
	    const qr = client.qrTargets || {};
    const publicContact = client.publicContact || {};
    const provisioning = client.provisioningStatus || {};
    const paperwork = client.paperwork || {};
    const workspaceConfirmationRecipients = client.workspaceConfirmationRecipients || OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS;
    const fields = [
      { key: 'public-contact-email', label: 'Public contact email', kind: 'client-facing', value: publicContact.email || OWNER_MARKETING_CONTACT_EMAIL },
      { key: 'public-contact-phone', label: 'Public contact phone', kind: 'client-facing', value: publicContact.phone || OWNER_MARKETING_CONTACT_PHONE },
      { key: 'workspace-confirmation-recipients', label: 'Workspace confirmation fanout', kind: 'owner notifications', value: workspaceConfirmationRecipients.join(', ') },
	      { key: 'customer-app', label: isArtist ? 'Artist welcome pack' : 'Customer app', kind: isArtist ? 'personalized pack' : 'live URL', value: urls.customerApp, href: urls.customerApp },
	      { key: 'workspace-preview', label: isArtist ? 'Artist storefront' : 'Workspace preview', kind: isArtist ? 'artist route' : 'Relay13 room', value: urls.workspacePreview, href: urls.workspacePreview },
	      ...(isLogistics ? [
	        { key: 'company-site', label: 'Company site', kind: 'SkyeRouteX Logistics', value: urls.companySite || urls.customerApp, href: urls.companySite || urls.customerApp },
	        { key: 'workforce-command', label: 'Workforce Command cockpit', kind: 'dispatch operations', value: urls.workforceCommand, href: urls.workforceCommand },
	        { key: 'provider-panel', label: 'Provider panel', kind: 'jobs', value: urls.providerPanel, href: urls.providerPanel },
	        { key: 'contractor-panel', label: 'Contractor panel', kind: 'assignments', value: urls.contractorPanel, href: urls.contractorPanel },
	        { key: 'house-command', label: 'House Command', kind: 'owner operations', value: urls.houseCommand, href: urls.houseCommand },
	        { key: 'proof-panel', label: 'Proof panel', kind: 'audit', value: urls.proofPanel, href: urls.proofPanel },
	        { key: 'gate-status', label: 'Gate readiness', kind: 'shared FS27 proof', value: urls.gateStatus, href: urls.gateStatus },
	        { key: 'v83-dashboard', label: 'V83 Dispatch Dashboard', kind: 'dispatch board', value: urls.v83Dashboard, href: urls.v83Dashboard },
	        { key: 'v83-routes', label: 'V83 Routes', kind: 'route planner', value: urls.v83Routes, href: urls.v83Routes },
	        { key: 'v83-stops', label: 'V83 Stops', kind: 'stop proof', value: urls.v83Stops, href: urls.v83Stops },
	        { key: 'v83-workforce', label: 'V83 Workforce', kind: 'field team', value: urls.v83Workforce, href: urls.v83Workforce },
	        { key: 'v83-proof-vault', label: 'V83 Proof Vault', kind: 'proof vault', value: urls.v83ProofVault, href: urls.v83ProofVault },
	        { key: 'v83-analytics', label: 'V83 Analytics', kind: 'route signals', value: urls.v83Analytics, href: urls.v83Analytics },
	        { key: 'v83-runtime', label: 'V83 Runtime', kind: 'runtime endpoints', value: urls.v83Runtime, href: urls.v83Runtime },
	        { key: 'v83-settings', label: 'V83 Settings', kind: 'provider settings', value: urls.v83Settings, href: urls.v83Settings },
	        { key: 'audit-console', label: 'Audit-ready console', kind: 'deep console', value: urls.auditConsole, href: urls.auditConsole },
	        { key: 'api-reference', label: 'API reference', kind: 'dispatch API docs', value: urls.apiReference, href: urls.apiReference },
	        { key: 'provider-env-audit', label: 'Provider env audit', kind: 'map/nav boundary', value: urls.providerEnvAudit, href: urls.providerEnvAudit },
	        { key: 'latest-worker-stress', label: 'Latest mounted worker stress', kind: 'stress receipt', value: urls.latestMountedWorkerStress, href: urls.latestMountedWorkerStress },
	        { key: 'routex-api', label: 'RouteX API', kind: 'same-domain API', value: urls.routexApi, href: urls.routexApi },
	        { key: 'routex-alias-api', label: 'RouteX alias API', kind: 'compatibility API', value: urls.routexAliasApi, href: urls.routexAliasApi },
	        { key: 'route-manifest', label: '0S route manifest', kind: 'map of mounted surfaces', value: urls.routeManifest, href: urls.routeManifest },
	        { key: 'valley-map', label: 'Valley map surface', kind: 'map lane', value: urls.valleyMap, href: urls.valleyMap },
	        { key: 'legal-logistics', label: 'Delivery logistics legal page', kind: 'public legal lane', value: urls.legalLogistics, href: urls.legalLogistics },
	        { key: 'skyemail-inbox', label: 'SkyeMail inbox', kind: 'company mailbox', value: skyemail.reservedMailbox, href: urls.skyemailInbox },
	        { key: 'skyemail-compose', label: 'SkyeMail compose', kind: 'send from mailbox', value: urls.skyemailCompose, href: urls.skyemailCompose },
	        { key: 'phone-ai-boundary', label: 'Company line boundary', kind: 'phone and AI calls', value: client.logisticsStack?.smsVoiceBoundary }
	      ] : []),
	      ...(isArtist ? [
        { key: 'product-desk', label: 'Product desk', kind: 'artist build', value: urls.productDesk, href: urls.productDesk },
        { key: 'upload-song', label: 'Upload song', kind: 'artist app', value: urls.uploadSong, href: urls.uploadSong },
        { key: 'release-forge', label: 'Release forge', kind: 'artist app', value: urls.releaseForge, href: urls.releaseForge },
        { key: 'rights-vault', label: 'Rights vault', kind: 'artist app', value: urls.rightsVault, href: urls.rightsVault },
        { key: 'artist-apps', label: 'Artist apps', kind: 'artist app', value: urls.artistApps, href: urls.artistApps },
        { key: 'store-admin', label: 'Store admin', kind: 'artist app', value: urls.storeAdmin, href: urls.storeAdmin },
        { key: 'contractor-packet', label: 'Contractor packet', kind: 'company paperwork', value: paperwork.workforceFormUrl || urls.contractorPacket, href: paperwork.workforceFormUrl || urls.contractorPacket },
        { key: 'ae-command', label: 'AE Command profile lane', kind: 'workforce center', value: paperwork.aeCommandUrl || urls.aeCommand, href: paperwork.aeCommandUrl || urls.aeCommand },
        { key: 'workforce-command', label: 'RouteX Workforce Command', kind: 'workforce center', value: paperwork.workforceCommandUrl || urls.workforceCommand, href: paperwork.workforceCommandUrl || urls.workforceCommand },
        { key: 'founder-contractor-packets', label: 'Founder contractor packets', kind: 'owner paperwork API', value: paperwork.founderCommandPacketRoute || urls.founderContractorPackets, href: paperwork.founderCommandPacketRoute || urls.founderContractorPackets },
        { key: 'packet-inbox', label: 'Packet inbox', kind: 'owner paperwork UI', value: paperwork.packetInboxUrl || urls.contractorPacketInbox, href: paperwork.packetInboxUrl || urls.contractorPacketInbox },
        { key: 'paperwork-hold', label: 'Payout hold', kind: paperwork.status || 'paperwork', value: paperwork.payoutHoldReason }
      ] : []),
      { key: 'pilot-review', label: isArtist ? 'Moving walkthrough' : 'Pilot review page', kind: isArtist ? 'guided platform pass' : 'pitch URL', value: urls.pilotReview, href: urls.pilotReview },
      { key: 'pilot-flyer', label: isArtist ? 'Written walkthrough' : 'Pilot flyer', kind: isArtist ? 'plain packet' : 'leave-behind URL', value: urls.pilotFlyer, href: urls.pilotFlyer },
      { key: 'free-stack-pitch', label: 'Free stack pitch', kind: 'current offer', value: urls.freeStackPitch, href: urls.freeStackPitch },
      { key: 'free-stack-flyer', label: 'Free stack flyer', kind: 'printable QR', value: urls.freeStackFlyer, href: urls.freeStackFlyer },
      { key: 'zero-os-browser', label: '0S Browser', kind: 'PWA launcher', value: urls.zeroOsBrowser, href: urls.zeroOsBrowser },
      { key: 'pricing-router', label: 'Pricing router', kind: 'upgrade lane', value: urls.pricingRouter, href: urls.pricingRouter },
      { key: 'readiness-receipt', label: isArtist ? 'Provision record' : 'Readiness receipt', kind: 'proof JSON', value: urls.readinessReceipt, href: urls.readinessReceipt },
      { key: 'shared-workspace-login', label: 'Shared workspace login', kind: 'gate handoff', value: urls.sharedWorkspaceLogin, href: urls.sharedWorkspaceLogin },
      { key: 'relay-account-code', label: 'Relay13 account code', kind: 'workspace id', value: relay.accountCode },
      { key: 'relay-workspace-slug', label: 'Relay13 workspace slug', kind: 'workspace id', value: relay.workspaceSlug },
      { key: 'relay-workspace-id', label: 'Relay13 workspace ID', kind: 'workspace id', value: relay.workspaceId },
      { key: 'connectlog-card-id', label: 'ConnectLog card ID', kind: 'card id', value: relay.connectlogCardId },
      { key: 'skygate-client-slug', label: 'SkyGate client slug', kind: 'gate id', value: relay.skygateClientSlug },
      { key: 'skyemail-mailbox', label: isArtist ? 'Reserved artist mailbox' : 'Reserved SkyEmail', kind: skyemail.activationStatus || 'reserved', value: skyemail.reservedMailbox },
      { key: 'skyemail-accept-path', label: 'SkyEmail accept path', kind: 'claim route', value: skyemail.acceptPath, href: skyemail.acceptPath },
      { key: 'skyemail-change-request', label: 'SkyEmail change request', kind: skyemail.canChangeMailbox ? 'handle can change' : 'handle fixed', value: skyemail.changeRequestEndpoint, href: skyemail.changeRequestEndpoint },
      { key: 'free-review-limits', label: isArtist ? 'Founder handoff limits' : 'Free review limits', kind: 'limits', value: `${limits.appScans} scans | ${limits.workspaceCommands} workspace commands | ${limits.proofExports} proof exports | ${limits.testerSeats} tester seats` },
      ...Object.entries(provisioning).map(([key, item]) => ({
        key: `provisioning-${key}`,
        label: item.label || key,
        kind: item.status || 'provisioning',
        value: item.detail || item.href || item.status || '',
        href: item.href
      })),
      { key: 'qr-review', label: 'QR target: review', kind: 'QR', value: qr.reviewPilot, href: qr.reviewPilot },
      { key: 'qr-live-app', label: isArtist ? 'QR target: welcome' : 'QR target: live app', kind: 'QR', value: qr.liveApp, href: qr.liveApp },
      { key: 'qr-free-stack-pitch', label: 'QR target: free stack', kind: 'QR', value: qr.freeStackPitch, href: qr.freeStackPitch },
      { key: 'qr-free-stack-flyer', label: 'QR target: flyer', kind: 'QR', value: qr.freeStackFlyer, href: qr.freeStackFlyer },
      { key: 'qr-zero-os-browser', label: 'QR target: 0S Browser', kind: 'QR', value: qr.zeroOsBrowser, href: qr.zeroOsBrowser },
      ...(isArtist ? [
        { key: 'qr-upload-song', label: 'QR target: upload song', kind: 'QR', value: qr.uploadSong, href: qr.uploadSong }
      ] : []),
      { key: 'auth-boundary', label: 'Auth boundary', kind: 'security', value: client.authBoundary }
    ];
	    if (client.artist) {
	      fields.unshift(
	        { key: 'artist-id', label: 'Artist ID', kind: 'canonical', value: client.artist.artistId },
	        { key: 'artist-tier', label: 'Artist tier', kind: 'artist status', value: client.artist.tier },
	        { key: 'skyepay-tracking', label: 'SkyePay tracking', kind: 'payout hold', value: client.artist.skyePayTrackingRef }
	      );
	    }
	    if (client.company) {
	      fields.unshift(
	        { key: 'company-owner-email', label: 'Main owner email', kind: 'founder account', value: client.company.primaryOwnerEmail || publicContact.email },
	        { key: 'company-line', label: 'Company line', kind: 'phone', value: client.company.companyLine || publicContact.phone },
	        { key: 'company-mailbox', label: 'Company mailbox', kind: 'SkyeMail', value: client.company.companyMailbox || skyemail.reservedMailbox },
	        { key: 'company-operator', label: 'Company operator', kind: 'identity', value: client.company.legalOperator }
	      );
	    }
    if (client.emailDraft) {
      fields.push(
        { key: 'email-subject', label: 'Email subject', kind: 'draft', value: client.emailDraft.subject },
        { key: 'email-body', label: 'Email body', kind: 'draft', value: client.emailDraft.body }
      );
    }
    return fields.filter((field) => field.value);
  }

  function findClientCredential(id = '') {
    return CLIENT_CREDENTIALS.find((client) => client.id === id) || CLIENT_CREDENTIALS[0] || null;
  }

  function clientCredentialText(client = CLIENT_CREDENTIALS[0]) {
    if (!client) return 'No founder-only handoff map is loaded.';
    const payload = clientCredentialPayload(client);
    const fields = clientCredentialFields(client);
    return [
      `${client.client} - Founder Command internal handoff map`,
      `Updated: ${payload.updated_at}`,
      `Status: ${payload.status}`,
      `Auth: ${payload.auth_boundary}`,
      '',
      'Fields:',
      ...fields.map((field) => `${field.label}: ${field.href ? absoluteHref(field.value) : field.value}`),
      '',
      'Boundaries:',
      ...payload.activation_boundaries.map((line) => `- ${line}`)
    ].join('\n');
  }

	  function renderClientCredentials() {
	    if ($('metricClientVault')) $('metricClientVault').textContent = CLIENT_CREDENTIALS.length;
	    const client = findClientCredential('skyeroutex-logistics') || findClientCredential('supaboy') || findClientCredential('bobs-smoke-shop');
	    const bob = findClientCredential('bobs-smoke-shop');
	    if ($('clientVaultBobState')) $('clientVaultBobState').textContent = bob?.status === 'pilot-ready' ? 'Live' : (bob?.status || 'Checking');
	    if ($('clientVaultSupaBoyState')) $('clientVaultSupaBoyState').textContent = findClientCredential('supaboy')?.status || 'Checking';
	    if ($('clientVaultSkyeRouteXState')) $('clientVaultSkyeRouteXState').textContent = findClientCredential('skyeroutex-logistics')?.status || 'Checking';
    if ($('clientCredentialOutput')) $('clientCredentialOutput').textContent = clientCredentialText(client);
    const grid = $('clientCredentialGrid');
    if (!grid) return;
    grid.innerHTML = CLIENT_CREDENTIALS.map((item) => {
      const fields = clientCredentialFields(item).map((field) => `
        <article class="route-card client-credential-card">
          <strong>${escapeHtml(field.label)}</strong>
          <span>${escapeHtml(field.kind || 'credential')}</span>
          <code>${escapeHtml(field.value)}</code>
          <div class="tool-row">
            ${field.href ? `<a class="button secondary" href="${escapeAttr(field.href)}"${linkAttrs(field.href)}>Open</a>` : ''}
            <button class="button secondary" data-client-copy-field="${escapeAttr(`${item.id}:${field.key}`)}" type="button">Copy</button>
          </div>
        </article>
      `).join('');
      return `
        <section class="panel client-credential-pack">
          <div class="panel-head">
            <p class="eyebrow">Founder-only handoff map</p>
            <h2>${escapeHtml(item.client)}</h2>
          </div>
          <p class="muted">${escapeHtml(item.authBoundary)}</p>
          <div class="tool-row">
            <button class="button" data-client-copy="${escapeAttr(item.id)}" type="button">Copy Internal Handoff</button>
            <button class="button secondary" data-client-export="${escapeAttr(item.id)}" type="button">Export Internal JSON</button>
            <button class="button secondary" data-client-prefill="${escapeAttr(item.id)}" type="button">Prefill Handoff</button>
          </div>
          <div class="route-grid">${fields}</div>
        </section>
      `;
    }).join('');
  }

  async function copyClientCredentialPack(id = 'bobs-smoke-shop') {
    const client = findClientCredential(id);
    if (!client) return;
    const text = clientCredentialText(client);
    await copyText(text);
    showJson('clientCredentialOutput', text);
  }

  function exportClientCredentialPack(id = 'bobs-smoke-shop') {
    const client = findClientCredential(id);
    if (!client) return;
    const payload = clientCredentialPayload(client);
    download(`${client.clientSlug}-founder-command-credential-pack.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    showJson('clientCredentialOutput', payload);
  }

  function copyClientCredentialField(compoundId = '') {
    const [clientId, fieldKey] = String(compoundId).split(':');
    const client = findClientCredential(clientId);
    const field = clientCredentialFields(client).find((item) => item.key === fieldKey);
    if (field) copyText(field.value);
  }

  function prefillClientSkyEmailHandoff(id = 'bobs-smoke-shop') {
    const client = findClientCredential(id);
    const form = $('skyEmailHandoffForm');
    if (!client || !form) return;
    const mailbox = client.skyemail.reservedMailbox || '';
    const [mailboxLocal, domain] = mailbox.split('@');
    const setField = (name, value) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = value || '';
    };
    setField('company_name', client.client);
    setField('owner_email', client.skyemail.ownerEmail.includes('@') ? client.skyemail.ownerEmail : '');
    setField('workspace_handle', client.clientSlug);
    setField('mailbox_local', mailboxLocal);
    setField('domain', domain || 'skyemail.solenterprises.org');
    setField('plan_id', 'client-skymail-launch');
    setField('welcome_message', client.credentialKind === 'artist-workspace-handoff'
      ? `${client.client} artist workspace is reserved. Claim through the shared 0S/SkyGate handoff, walk the Music Nexus platform walkthrough, then complete paperwork before payout eligibility.`
      : `${client.client} workspace is reserved. Claim through the shared 0S/SkyGate handoff, then the SkyEmail mailbox, managed CRM operations, and backup cadence can be activated.`);
    renderSkyEmailHandoff({
      company_name: client.client,
      mailbox_email: mailbox,
      status: client.skyemail.activationStatus,
      welcome_title: `${client.client} SkyeMail Launch Spark`,
      skyemerit_offer: { prompt: `Reserved. Add ${client.client} owner email before creating/sending the handoff packet.` },
      launch_url: absoluteHref(client.skyemail.acceptPath),
      qr_payload: absoluteHref(client.skyemail.acceptPath),
      public_contact_email: client.publicContact?.email || OWNER_MARKETING_CONTACT_EMAIL,
      workspace_confirmation_recipients: client.workspaceConfirmationRecipients || OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS
    });
    setView('mailboxes');
    showJson('skyEmailHandoffOutput', {
      prefilled: true,
      client: client.client,
      mailbox,
      public_contact_email: client.publicContact?.email || OWNER_MARKETING_CONTACT_EMAIL,
      workspace_confirmation_recipients: client.workspaceConfirmationRecipients || OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS,
      owner_email_required: !client.skyemail.ownerEmail.includes('@'),
      note: `Add ${client.client} owner email before creating or sending the handoff packet.`
    });
  }

  function repoVaultSummaryText(data = state.repoVault || {}) {
    const repo = data.repo || {};
    const upload = data.latest_upload || {};
    const delta = data.latest_delta || {};
    const daemon = data.daemon || {};
    return [
      `Repo: ${repo.name || 'MetrAIyux-0S'} ${repo.branch ? `(${repo.branch})` : ''}`,
      `Head: ${repo.short_head || compactHash(repo.head, 12) || 'unknown'} | dirty: ${repo.dirty ? 'yes' : 'no'}`,
      `Scanned files: ${fmtNumber(repo.scanned_files)} | status: ${Object.entries(repo.status_counts || {}).map(([key, value]) => `${key} ${value}`).join(', ') || 'none'}`,
      `Daemon: ${daemon.running ? 'running' : 'not running'} ${daemon.heartbeat || ''}`,
      `Latest encrypted upload: ${upload.receipt_id || 'none'} | ${fmtBytes(upload.artifact_bytes)}`,
      `Delta: ${delta.action || 'none'} | changed ${fmtNumber(delta.changed_file_count)} | ${fmtBytes(delta.pack_bytes)}`,
      `Safety: ${data.safety?.stream_scope || 'public-safe proof stream only'}`
    ].join('\n');
  }

  function renderRepoVault(data = state.repoVault || {}) {
    if (!$('repoVaultOutput')) return;
    const repo = data.repo || {};
    const upload = data.latest_upload || {};
    const delta = data.latest_delta || {};
    const daemon = data.daemon || {};
    const vaultMap = data.vault_map || {};
    const project = data.project_manifest || {};
    const fullArtifact = project.encrypted_full_artifact || {};
    const coverage = project.coverage || {};
    const fullBackupReceipt = upload.receipt_id || fullArtifact.receipt_id || '';
    const fullBackupBytes = upload.artifact_bytes || fullArtifact.artifact_bytes || null;
    const fullBackupRecoveryUrl = upload.recovery_url || fullArtifact.recovery_url || '/proof/skyevault-autosync-proof.json';
    const loadedCount = state.repoVaultLoadedEntries.length;
    const safeCount = Number(coverage.full_entry_count || coverage.safe_browser_entry_count || 0);
    const privateCount = Number(coverage.full_private_entry_count || coverage.private_entry_count || 0);
    const skippedCount = Number(coverage.full_skipped_entry_count || coverage.skipped_entry_count || 0);
    const fullIndexCount = safeCount + privateCount + skippedCount;
    const loadedLabel = state.repoVaultLoadedAll
      ? `${fmtNumber(loadedCount)} full`
      : (loadedCount ? `${fmtNumber(loadedCount)} loaded` : '0 paths');
    if ($('metricRepoVault')) $('metricRepoVault').textContent = data.ready ? (daemon.running ? 'Streaming' : 'Proof') : 'Needs proof';
    if ($('repoVaultDaemonState')) $('repoVaultDaemonState').textContent = daemon.running ? 'Running' : 'Not running';
    if ($('repoVaultHeadState')) $('repoVaultHeadState').textContent = repo.short_head || compactHash(repo.head, 12) || 'Unknown';
    if ($('repoVaultUploadState')) $('repoVaultUploadState').textContent = upload.receipt_id || 'No receipt';
    if ($('repoVaultDeltaState')) $('repoVaultDeltaState').textContent = delta.action || 'No delta';
    if ($('repoVaultProofState')) $('repoVaultProofState').textContent = data.ready ? fmtDateTime(data.autosync?.proof_updated_at || data.generated_at) : 'Unavailable';
    if ($('repoVaultSafetyState')) $('repoVaultSafetyState').textContent = data.safety?.raw_file_bodies_exposed ? 'Unsafe' : 'Public-safe';
    if ($('repoVaultProjectState')) $('repoVaultProjectState').textContent = fullIndexCount ? `${fmtNumber(fullIndexCount)} indexed` : 'Checking';
    if ($('repoVaultChunkState')) $('repoVaultChunkState').textContent = coverage.chunk_count ? `${coverage.chunk_count} chunks` : 'No chunks';
    if ($('repoVaultLoadedState')) $('repoVaultLoadedState').textContent = loadedLabel;
    if ($('repoVaultDownloadState')) $('repoVaultDownloadState').textContent = fullBackupReceipt ? `${fmtBytes(fullBackupBytes)} ready` : 'No receipt';
    if ($('repoVaultFullBackupName')) $('repoVaultFullBackupName').textContent = fullBackupReceipt ? `Encrypted backup ${fullBackupReceipt}` : 'Encrypted full backup pending';
    if ($('repoVaultFullBackupMeta')) $('repoVaultFullBackupMeta').textContent = fullBackupReceipt
      ? `${fmtBytes(fullBackupBytes)} in SkyeVault custody. Browser download mints a short-lived link through the shared gate.`
      : 'Waiting for the latest SkyeVault receipt.';
    if ($('repoVaultRecoveryPortalLink')) {
      $('repoVaultRecoveryPortalLink').href = fullBackupRecoveryUrl;
      if (isExternalHref(fullBackupRecoveryUrl)) {
        $('repoVaultRecoveryPortalLink').target = '_blank';
        $('repoVaultRecoveryPortalLink').rel = 'noopener';
      }
    }
    if ($('repoVaultLatestBackupLink')) {
      const href = fullBackupRecoveryUrl;
      $('repoVaultLatestBackupLink').href = href;
      $('repoVaultLatestBackupLink').textContent = upload.recovery_url ? 'Open Latest Backup' : 'Latest Backup Receipt';
      if (isExternalHref(href)) {
        $('repoVaultLatestBackupLink').target = '_blank';
        $('repoVaultLatestBackupLink').rel = 'noopener';
      }
    }
    if ($('repoVaultBackupGrid')) {
      const deltaJournal = project.delta_journal || {};
      const backupCards = [
        {
          label: 'Full repo index',
          kind: 'browser-safe manifest',
          value: `${fmtNumber(fullIndexCount)} paths across ${fmtNumber(coverage.chunk_count)} chunks`,
          href: '/api/founder-command/repo-vault?file=project-manifest'
        },
        {
          label: 'Encrypted full backup',
          kind: 'SkyeVault custody',
          value: upload.receipt_id || fullArtifact.receipt_id || 'receipt pending',
          href: upload.recovery_url || fullArtifact.recovery_url || '/proof/skyevault-autosync-proof.json'
        },
        {
          label: 'Delta journal',
          kind: delta.action || 'latest changed-file pack',
          value: delta.upload_receipt_id || deltaJournal.uploadReceiptId || deltaJournal.upload_receipt_id || 'delta receipt pending',
          href: '/api/founder-command/repo-vault?file=autosync-proof'
        },
        {
          label: 'Private/skipped custody',
          kind: 'encrypted, not raw in browser',
          value: `${fmtNumber(privateCount)} private / ${fmtNumber(skippedCount)} skipped`,
          href: '/admin/skyevault-command-center.html'
        },
        {
          label: 'SkyeVaultPro Drive',
          kind: 'owner drive surface',
          value: 'Open the mounted drive app',
          href: '/Free99/apps/skyevaultpro/drive/index.html'
        },
        {
          label: 'Proof Vault',
          kind: 'receipts and public-safe proof',
          value: vaultMap.total_receipt_human || 'receipt drive',
          href: '/proof-vault/'
        },
        {
          label: 'Load everything here',
          kind: '0meg4Command drive browser',
          value: loadedCount ? `${fmtNumber(loadedCount)} entries loaded now` : 'Use Load Full Drive',
          href: '#repoVaultProjectTree'
        },
        {
          label: 'Local command',
          kind: 'backup now',
          value: 'npm run vault:repo:full',
          href: '/api/founder-command/repo-vault'
        }
      ];
      $('repoVaultBackupGrid').innerHTML = backupCards.map((card) => `
        <a class="route-card" href="${escapeAttr(card.href)}"${linkAttrs(card.href)}>
          <strong>${escapeHtml(card.label)}</strong>
          <span>${escapeHtml(card.kind)}</span>
          <span>${escapeHtml(card.value)}</span>
        </a>
      `).join('');
    }
    if ($('repoVaultLinkGrid')) {
      $('repoVaultLinkGrid').innerHTML = (data.links || []).map((link) => `
        <a class="route-card" href="${escapeAttr(link.href)}"${linkAttrs(link.href)}>
          <strong>${escapeHtml(link.label)}</strong>
          <span>${escapeHtml(link.kind || 'route')}</span>
          <span>${escapeHtml(link.href)}</span>
        </a>
      `).join('') || '<div class="empty-state">No vault links returned yet.</div>';
    }
    if ($('repoVaultStreamGrid')) {
      $('repoVaultStreamGrid').innerHTML = (data.stream_files || []).map((file) => `
        <article class="route-card">
          <strong>${escapeHtml(file.label)}</strong>
          <span>${escapeHtml(file.kind || 'stream')}</span>
          <span>${escapeHtml(file.href || '')}</span>
          <div class="tool-row">
            <button class="button secondary" data-repo-stream="${escapeAttr(file.id)}" type="button">Stream Here</button>
            <a class="button secondary" href="${escapeAttr(file.href)}" target="_blank" rel="noopener">Open File</a>
          </div>
        </article>
      `).join('') || '<div class="empty-state">No stream files returned yet.</div>';
    }
    if ($('repoVaultRecentLog')) {
      $('repoVaultRecentLog').innerHTML = (data.recent_proof_log || []).map((entry) => `
        <article class="list-row">
          <div>
            <strong>${escapeHtml(fmtDateTime(entry.generatedAt || entry.completedAt || entry.latestCompletedAt))}</strong>
            <span>${escapeHtml(entry.parity || 'proof event')} | receipt ${escapeHtml(entry.artifactReceiptId || entry.deltaJournal?.uploadReceiptId || '')}</span>
            <span>modified ${escapeHtml(entry.statusCounts?.modified ?? 0)} | deleted ${escapeHtml(entry.statusCounts?.deleted ?? 0)} | untracked ${escapeHtml(entry.statusCounts?.untracked ?? 0)}</span>
          </div>
        </article>
      `).join('') || '<div class="empty-state">No proof log entries available.</div>';
    }
    if ($('repoVaultCommandList')) {
      $('repoVaultCommandList').innerHTML = (data.commands || []).map((item) => `
        <article class="route-card">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.kind || 'command')}</span>
          <code>${escapeHtml(item.command || '')}</code>
          <div class="tool-row">
            <button class="button secondary" data-copy-command="${escapeAttr(item.command || '')}" type="button">Copy</button>
          </div>
        </article>
      `).join('') || '<div class="empty-state">No daemon commands returned.</div>';
    }
    if ($('repoVaultProjectTopLevel')) {
      $('repoVaultProjectTopLevel').innerHTML = (project.top_level || []).slice(0, 60).map((item) => `
        <article class="route-card">
          <strong>${escapeHtml(item.path)}</strong>
          <span>${escapeHtml(`${fmtNumber(item.file_count)} files | ${fmtNumber(item.dir_count)} dirs | ${item.human || fmtBytes(item.bytes)}`)}</span>
          <span>${escapeHtml(item.private_count ? `${item.private_count} private/skipped entries represented by encrypted custody` : 'browser-safe path metadata')}</span>
        </article>
      `).join('') || '<div class="empty-state">No project directories loaded yet.</div>';
    }
    if ($('repoVaultChunkGrid')) {
      $('repoVaultChunkGrid').innerHTML = (project.chunks || []).map((chunk) => `
        <article class="route-card ${state.repoVaultLoadedChunk === chunk.id ? 'active' : ''}">
          <strong>${escapeHtml(chunk.id)}</strong>
          <span>${escapeHtml(`${chunk.group || 'entries'} | ${fmtNumber(chunk.count)} paths | ${chunk.human || fmtBytes(chunk.bytes)}`)}</span>
          <span>${escapeHtml(chunk.href || '')}</span>
          <div class="tool-row">
            <button class="button secondary" data-repo-chunk="${escapeAttr(chunk.id)}" type="button">Load Chunk</button>
            <a class="button secondary" href="${escapeAttr(chunk.href)}" target="_blank" rel="noopener">Open</a>
          </div>
        </article>
      `).join('') || '<div class="empty-state">No project chunks loaded yet.</div>';
    }
    if ($('repoVaultProjectTree')) {
      const query = String($('repoVaultProjectSearch')?.value || '').trim().toLowerCase();
      const sourceEntries = state.repoVaultLoadedEntries.length
        ? state.repoVaultLoadedEntries
        : [
            ...(project.entries_sample || []),
            ...(project.private_entries_sample || []),
            ...(project.skipped_entries_sample || [])
          ];
      const filtered = sourceEntries.filter((item) => {
        const haystack = [item.path, item.type, item.source, item.ext, item.policy?.reason, item.status?.join(' ')].join(' ').toLowerCase();
        return !query || haystack.includes(query);
      });
      if ($('repoVaultProjectTreeMeta')) {
        const sourceLabel = state.repoVaultLoadedAll
          ? 'full drive'
          : (state.repoVaultLoadedChunk || 'manifest sample');
        $('repoVaultProjectTreeMeta').textContent = `${fmtNumber(filtered.length)} match(es) from ${fmtNumber(sourceEntries.length)} loaded ${sourceLabel} path records. Showing the first 1,200.`;
      }
      $('repoVaultProjectTree').innerHTML = filtered.slice(0, 1200).map((item) => `
        <article class="list-row repo-vault-file-row" data-private="${item.browser_stream ? 'false' : 'true'}">
          <div>
            <strong>${escapeHtml(item.path)}</strong>
            <span>${escapeHtml(`${item.type || 'file'} | ${item.source || 'manifest'} | ${item.human || fmtBytes(item.bytes)}${item.chunk_id ? ` | ${item.chunk_id}` : ''}`)}</span>
            <span>${escapeHtml(item.browser_stream ? 'browser-safe metadata' : `private/encrypted custody${item.policy?.reason ? ` | ${item.policy.reason}` : ''}`)}</span>
          </div>
        </article>
      `).join('') || '<div class="empty-state">No project paths matched.</div>';
    }
    if ($('repoVaultMapSummary')) {
      $('repoVaultMapSummary').textContent = [
        `Vault map: ${vaultMap.schema || 'unknown'}`,
        `Generated: ${fmtDateTime(vaultMap.generated_at)}`,
        `Repos: ${fmtNumber(vaultMap.repo_count)} | receipts: ${fmtNumber(vaultMap.receipt_count)} | total: ${vaultMap.total_receipt_human || 'unknown'}`,
        `Remote events: ${fmtNumber(vaultMap.remote_event_count)} | uploads: ${fmtNumber(vaultMap.upload_event_count)}`,
        `Project manifest: ${fmtNumber(coverage.safe_browser_entry_count)} safe path entries / ${fmtNumber(coverage.full_private_entry_count || coverage.private_entry_count)} private path entries / ${fmtNumber(coverage.chunk_count)} chunks`,
        '',
        `Latest upload: ${upload.receipt_id || 'none'}`,
        `Recovery URL: ${upload.recovery_url || 'not published'}`
      ].join('\n');
    }
    $('repoVaultOutput').textContent = data.ready ? repoVaultSummaryText(data) : JSON.stringify(data.errors || data, null, 2);
  }

  async function refreshRepoVault() {
    if (!$('repoVaultOutput')) return null;
    $('repoVaultOutput').textContent = 'Streaming SkyeVault repo custody proof into Founder Command...';
    const data = await commandApi('/api/founder-command/repo-vault');
    state.repoVault = data;
    renderRepoVault(data);
    return data;
  }

  async function streamRepoVaultFile(id) {
    if (!id) return;
    $('repoVaultOutput').textContent = `Streaming ${id}...`;
    const data = await commandApi(`/api/founder-command/repo-vault?file=${encodeURIComponent(id)}`);
    if (id === 'project-manifest' && data.data) {
      state.repoVault = { ...(state.repoVault || {}), project_manifest: data.data };
      state.repoVaultLoadedEntries = [];
      state.repoVaultLoadedChunk = '';
      renderRepoVault(state.repoVault);
    }
    $('repoVaultOutput').textContent = JSON.stringify(data, null, 2);
  }

  async function streamRepoVaultChunk(id) {
    if (!id) return;
    $('repoVaultOutput').textContent = `Loading project manifest chunk ${id}...`;
    const data = await commandApi(`/api/founder-command/repo-vault?chunk=${encodeURIComponent(id)}`);
    if (data.ok && Array.isArray(data.data?.entries)) {
      state.repoVaultLoadedEntries = data.data.entries.map((entry) => ({
        ...entry,
        chunk_id: id,
        chunk_group: data.data.group || id.split('-')[0]
      }));
      state.repoVaultLoadedChunk = id;
      state.repoVaultLoadedAll = false;
      renderRepoVault(state.repoVault || {});
      $('repoVaultOutput').textContent = `Loaded ${data.data.entries.length} paths from ${id}. Use the project search box to filter this chunk.`;
      return data;
    }
    $('repoVaultOutput').textContent = JSON.stringify(data, null, 2);
    return data;
  }

  async function loadFullRepoVaultDrive() {
    if (!$('repoVaultOutput')) return null;
    if (!state.repoVault?.project_manifest?.chunks?.length) await refreshRepoVault();
    const chunks = state.repoVault?.project_manifest?.chunks || [];
    if (!chunks.length) {
      $('repoVaultOutput').textContent = 'No repo manifest chunks are available yet. Publish SkyeVault autosync proof first.';
      return null;
    }
    const button = $('loadFullRepoDriveBtn');
    const originalLabel = button?.textContent || 'Load Full Drive';
    if (button) {
      button.disabled = true;
      button.textContent = 'Loading Drive...';
    }
    const allEntries = [];
    const errors = [];
    state.repoVaultLoadedEntries = [];
    state.repoVaultLoadedChunk = 'full-drive-starting';
    state.repoVaultLoadedAll = false;
    renderRepoVault(state.repoVault || {});
    try {
      const groupCounts = {};
      for (let index = 0; index < chunks.length; index += 4) {
        const batch = chunks.slice(index, index + 4);
        const results = await Promise.all(batch.map((chunk) =>
          commandApi(`/api/founder-command/repo-vault?chunk=${encodeURIComponent(chunk.id)}`)
            .then((result) => ({ chunk, result }))
            .catch((error) => ({ chunk, result: { ok: false, error: error?.message || 'chunk_fetch_failed' } }))
        ));
        for (const { chunk, result } of results) {
          if (result.ok && Array.isArray(result.data?.entries)) {
            const group = chunk.group || result.data.group || chunk.id.split('-')[0];
            groupCounts[group] = (groupCounts[group] || 0) + result.data.entries.length;
            allEntries.push(...result.data.entries.map((entry) => ({
              ...entry,
              chunk_id: chunk.id,
              chunk_group: group
            })));
          } else {
            errors.push({ id: chunk.id, error: result.error || result.status || 'chunk_failed' });
          }
        }
        state.repoVaultLoadedEntries = allEntries;
        state.repoVaultLoadedChunk = `full-drive ${Math.min(index + batch.length, chunks.length)}/${chunks.length}`;
        $('repoVaultOutput').textContent = `Loaded ${fmtNumber(allEntries.length)} path records from ${Math.min(index + batch.length, chunks.length)} of ${chunks.length} manifest chunks.`;
        renderRepoVault(state.repoVault || {});
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      state.repoVaultLoadedAll = errors.length === 0;
      state.repoVaultLoadedChunk = errors.length ? `full-drive with ${errors.length} chunk error(s)` : 'full-drive';
      renderRepoVault(state.repoVault || {});
      $('repoVaultOutput').textContent = [
        `Full repo drive index loaded: ${fmtNumber(allEntries.length)} path records.`,
        `Chunks: ${chunks.length - errors.length}/${chunks.length}`,
        `Groups: ${Object.entries(groupCounts).map(([key, value]) => `${key} ${fmtNumber(value)}`).join(', ') || 'none'}`,
        errors.length ? `Errors: ${JSON.stringify(errors, null, 2)}` : 'All chunks loaded into 0meg4Command.'
      ].join('\n');
      return { ok: !errors.length, entries: allEntries.length, groups: groupCounts, errors };
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  }

  function downloadRepoVaultDriveIndex() {
    const project = state.repoVault?.project_manifest || {};
    const payload = {
      schema: 'omeg4command.repo-vault.loaded-index.v1',
      generatedAt: new Date().toISOString(),
      source: '/api/founder-command/repo-vault',
      loadedAll: state.repoVaultLoadedAll,
      loadedChunk: state.repoVaultLoadedChunk,
      coverage: project.coverage || {},
      entries: state.repoVaultLoadedEntries,
      chunks: project.chunks || []
    };
    download('0meg4command-repo-vault-loaded-index.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function setFullRepoDownloadButtons(disabled, label = '') {
    for (const button of [$('downloadFullRepoBackupBtn'), $('downloadFullRepoBackupPanelBtn')].filter(Boolean)) {
      button.disabled = disabled;
      if (label) button.textContent = label;
    }
  }

	  function sanitizedFullRepoDownloadReceipt(data = {}) {
	    return {
      ok: Boolean(data.ok),
      receipt_id: data.receipt_id || '',
      file_name: data.file_name || '',
      artifact_bytes: data.artifact_bytes ?? null,
      artifact_human: data.artifact_human || '',
      artifact_sha256_prefix: data.artifact_sha256_prefix || '',
      expires_at: data.expires_at || '',
      recovery_url: data.recovery_url || '',
      safety: data.safety || {}
	    };
	  }

	  function fullRepoBackupRequestParts(fallback = {}) {
	    const upload = state.repoVault?.latest_upload || {};
	    const fullArtifact = state.repoVault?.project_manifest?.encrypted_full_artifact || {};
	    const receiptId = upload.receipt_id || fullArtifact.receipt_id || fallback.receipt_id || fallback.receiptId || '';
	    const recoveryUrl = upload.recovery_url || fullArtifact.recovery_url || fallback.recovery_url || 'https://skyevault-drop.graylondonskyes.workers.dev/#client-vault';
	    return {
	      receiptId,
	      recoveryUrl: receiptId ? `${recoveryUrl}${recoveryUrl.includes('?') ? '&' : '?'}receipt=${encodeURIComponent(receiptId)}` : recoveryUrl,
	      artifactBytes: upload.artifact_bytes ?? fullArtifact.artifact_bytes ?? fallback.artifact_bytes ?? null,
	      artifactHuman: fullArtifact.artifact_human || fallback.artifact_human || ''
	    };
	  }

	  async function directFullRepoBackupDownload(fallback = {}) {
	    const token = storedGateToken();
	    const parts = fullRepoBackupRequestParts(fallback);
	    if (!token || !parts.receiptId) return null;
	    const res = await fetch('https://skyevault-drop.graylondonskyes.workers.dev/api/client-vault', {
	      method: 'POST',
	      mode: 'cors',
	      headers: {
	        'content-type': 'application/json',
	        authorization: `Bearer ${token}`,
	        'x-free99-gate-session': token,
	        'x-skye-gate-session': token
	      },
	      body: JSON.stringify({
	        action: 'download',
	        receiptId: parts.receiptId,
	        clientEmail: 'owner-admin@metraiyux.local',
	        expiresInSeconds: 900
	      })
	    });
	    const body = await res.json().catch(() => ({}));
	    if (!res.ok || !body.downloadUrl) return { ok:false, status:res.status, error:body.error || 'Direct SkyeVault download link could not be minted.', recovery_url:parts.recoveryUrl };
	    return {
	      ok: true,
	      receipt_id: parts.receiptId,
	      file_name: body.item?.fileName || `MetrAIyux-0S-full-repo-${parts.receiptId}.tar.zst.enc`,
	      artifact_bytes: body.item?.fileSize ?? parts.artifactBytes,
	      artifact_human: parts.artifactHuman,
	      recovery_url: parts.recoveryUrl,
	      download_url: body.downloadUrl,
	      expires_at: body.expiresAt || '',
	      safety: {
	        shared_gate_required: true,
	        signed_download: true,
	        raw_file_bodies_exposed: false,
	        secret_values_exposed: false,
	        signed_url_persisted: false,
	        note: 'Direct SkyeVault fallback used the shared 0S gate bearer from this browser.'
	      }
	    };
	  }

	  async function downloadFullRepoBackup() {
    if (!$('repoVaultOutput')) return null;
    const topLabel = $('downloadFullRepoBackupBtn')?.textContent || 'Download Full Backup';
    const panelLabel = $('downloadFullRepoBackupPanelBtn')?.textContent || 'Download Encrypted Repo Backup';
    setFullRepoDownloadButtons(true, 'Minting Link...');
    if ($('repoVaultDownloadState')) $('repoVaultDownloadState').textContent = 'Minting link';
    if ($('repoVaultSignedDownloadLink')) {
      $('repoVaultSignedDownloadLink').hidden = true;
      $('repoVaultSignedDownloadLink').removeAttribute('href');
    }
    $('repoVaultOutput').textContent = 'Minting a short-lived encrypted repo backup download link through the shared 0S gate...';
    try {
	      let data = await commandApi('/api/founder-command/repo-vault/download', { method: 'POST' });
	      if (!data.ok || !data.download_url) {
	        if ($('repoVaultDownloadState')) $('repoVaultDownloadState').textContent = 'Direct vault mint';
	        data = await directFullRepoBackupDownload(data);
	        if (!data?.ok || !data.download_url) {
	          if ($('repoVaultDownloadState')) $('repoVaultDownloadState').textContent = 'Recovery portal';
	          if (data?.recovery_url) window.open(data.recovery_url, '_blank', 'noopener');
	          $('repoVaultOutput').textContent = JSON.stringify(sanitizedFullRepoDownloadReceipt(data || {}), null, 2);
	          throw new Error(data?.error || 'The encrypted backup link could not be minted.');
	        }
	      }
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = data.file_name || 'MetrAIyux-0S-full-repo.tar.zst.enc';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      if ($('repoVaultDownloadState')) $('repoVaultDownloadState').textContent = data.expires_at ? `Expires ${fmtDateTime(data.expires_at)}` : 'Download started';
      if ($('repoVaultFullBackupName')) $('repoVaultFullBackupName').textContent = data.file_name || 'Encrypted repo backup';
      if ($('repoVaultFullBackupMeta')) $('repoVaultFullBackupMeta').textContent = `${fmtBytes(data.artifact_bytes)} download started. Receipt ${data.receipt_id || 'latest'} stays in SkyeVault custody.`;
      if ($('repoVaultSignedDownloadLink')) {
        $('repoVaultSignedDownloadLink').href = data.download_url;
        $('repoVaultSignedDownloadLink').hidden = false;
      }
      $('repoVaultOutput').textContent = JSON.stringify(sanitizedFullRepoDownloadReceipt(data), null, 2);
      toast('Encrypted repo backup download started.');
      return data;
    } catch (error) {
      toast(error.message || 'Repo backup download failed.', true);
      return null;
    } finally {
      if ($('downloadFullRepoBackupBtn')) $('downloadFullRepoBackupBtn').textContent = topLabel;
      if ($('downloadFullRepoBackupPanelBtn')) $('downloadFullRepoBackupPanelBtn').textContent = panelLabel;
      setFullRepoDownloadButtons(false);
    }
  }

  async function refreshCommandStatus() {
    renderRoutes();
    $('metricGate').textContent = 'Checking';
    $('railGateText').textContent = 'Checking gate';
    $('railGateDot').className = 'status-dot';
    const body = await commandApi('/api/founder-command/status');
    if (!body.ok) {
      const loginNeeded = body.status === 401;
      $('metricGate').textContent = loginNeeded ? 'Login needed' : 'Unavailable';
      $('railGateText').textContent = loginNeeded ? 'Owner login needed' : 'Gate unavailable';
      $('railGateDot').className = 'status-dot bad';
      $('cmdStorageState').textContent = 'Unknown';
      $('cmdQueueState').textContent = 'Unknown';
      $('cmdActorState').textContent = 'Gate';
      if ($('metricCalendar')) $('metricCalendar').textContent = 'Login';
      if ($('metricMailboxes')) $('metricMailboxes').textContent = 'Login';
      if ($('metricRepoVault')) $('metricRepoVault').textContent = 'Login';
      if ($('metricCompanyOps')) $('metricCompanyOps').textContent = 'Login';
      if ($('calendarProviderState')) $('calendarProviderState').textContent = 'Login needed';
      if ($('skyEmailState')) $('skyEmailState').textContent = 'Login needed';
      if ($('pocketSkyEmailSync')) $('pocketSkyEmailSync').textContent = 'Login needed';
      if ($('mailboxOffboardingState')) $('mailboxOffboardingState').textContent = 'Login needed';
      if ($('mailboxOffboardingServiceState')) $('mailboxOffboardingServiceState').textContent = 'Unknown';
      if ($('mailboxHandoffState')) $('mailboxHandoffState').textContent = 'Login needed';
      $('cmdChatOutput').textContent = body.error || 'Use Owner Login, then return here.';
      return;
    }
    $('metricGate').textContent = 'Ready';
    $('railGateText').textContent = 'Gate ready';
    $('railGateDot').className = 'status-dot ok';
    $('cmdStorageState').textContent = body.bindings?.kv ? 'Ready' : 'No KV';
    $('cmdQueueState').textContent = body.bindings?.queue ? 'Ready' : 'No queue';
    $('cmdActorState').textContent = body.actor || 'owner-admin';
    if ($('metricCalendar')) $('metricCalendar').textContent = body.calendar?.configured ? 'Ready' : 'Ledger';
    if ($('calendarProviderState')) $('calendarProviderState').textContent = body.calendar?.configured ? 'Configured' : 'Native only';
    if ($('skyEmailState')) $('skyEmailState').textContent = body.skyemail?.configured ? body.skyemail.mailbox_email : 'Not provisioned';
    if ($('pocketSkyEmailMailbox')) $('pocketSkyEmailMailbox').textContent = body.skyemail?.mailbox_email || 'Not provisioned';
    if ($('pocketSkyEmailSync')) $('pocketSkyEmailSync').textContent = body.skyemail?.pocket?.ready ? 'Ready' : 'Needs setup';
    if ($('metricMailboxes')) $('metricMailboxes').textContent = body.skyemail?.offboarding?.ready ? 'Ready' : 'Needs token';
    if ($('metricRepoVault')) $('metricRepoVault').textContent = body.repo_vault?.ready ? (body.repo_vault?.daemon?.running ? 'Streaming' : 'Proof') : 'Needs proof';
    if ($('mailboxOffboardingState')) $('mailboxOffboardingState').textContent = body.skyemail?.offboarding?.ready ? 'Ready' : 'Needs setup';
    if ($('mailboxOffboardingServiceState')) $('mailboxOffboardingServiceState').textContent = body.skyemail?.offboarding?.service_token_configured ? 'Configured' : (body.skyemail?.offboarding?.service_binding ? 'Binding' : 'Gate token');
    if ($('mailboxHandoffState')) $('mailboxHandoffState').textContent = body.skyemail?.handoffs?.ready ? 'Ready' : 'Staged';
    $('cmdChatOutput').textContent = `Founder Command API online. Version: ${body.version || '0S'}.`;
    renderRoutes(body.links || []);
  }

  async function refreshCompanyOps() {
    if ($('metricCompanyOps')) $('metricCompanyOps').textContent = 'Checking';
    if ($('companyOpsOutput')) $('companyOpsOutput').textContent = 'Loading the Founder Command company work system...';
    const body = await commandApi('/api/founder-command/work-system');
    if (!body.ok) {
      state.workSystem = null;
      renderCompanyOps(body);
      return body;
    }
    state.workSystem = body;
    renderCompanyOps(body);
    renderMetrics();
    return body;
  }

  function localDateTimeToIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  function renderCalendarList(data) {
    const ledger = data.ledger || [];
    const live = data.live_events || [];
    $('calendarLedgerState').textContent = `${ledger.length} saved`;
    $('calendarList').innerHTML = [
      ...live.map((item) => ({
        title: item.summary || item.id,
        meta: `Google | ${item.start?.dateTime || item.start?.date || ''} | ${item.status || ''}`,
        href: item.htmlLink || ''
      })),
      ...ledger.map((item) => ({
        title: item.topic || item.summary || item.id,
        meta: `${item.status || 'ledger'} | ${item.start_at || 'needs schedule'} | ${item.attendee_email || ''}`,
        href: item.google_calendar?.htmlLink || ''
      }))
    ].map((item) => `
      <article class="route-card">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.meta)}</span>
        ${item.href ? `<a href="${escapeAttr(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.href)}</a>` : ''}
      </article>
    `).join('') || '<div class="empty-state">No calendar records yet.</div>';
  }

  async function refreshCalendar() {
    showJson('calendarOutput', 'Loading Founder Command calendar...');
    const data = await commandApi('/api/founder-command/calendar');
    $('calendarProviderState').textContent = data.provider?.ok ? 'Mirrored' : (data.configured ? 'Configured' : 'Native only');
    $('metricCalendar').textContent = data.configured ? 'Ready' : 'Ledger';
    showJson('calendarOutput', {
      configured: data.configured,
      provider: data.provider,
      live_events: data.live_events?.length || 0,
      ledger_records: data.ledger?.length || 0,
      timezone: data.timezone
    });
    renderCalendarList(data);
  }

  async function refreshSkyEmail() {
    const data = await commandApi('/api/founder-command/skyemail');
    $('skyEmailState').textContent = data.record?.mailbox_email || 'Not provisioned';
    $('skyEmailInput').placeholder = data.default_email || 'metraiyux-0s@solenterprises.org';
    showJson('skyEmailOutput', data.record || { configured: false, default_email: data.default_email, origin: data.origin });
  }

  function renderPocketSkyEmail(data = {}) {
    const summary = data.summary || {};
    const mailbox = summary.mailbox || summary.status?.mailbox || {};
    const counts = summary.counts || {};
    const messages = summary.recent_messages || [];
    if ($('pocketSkyEmailMailbox')) $('pocketSkyEmailMailbox').textContent = mailbox.mailbox_email || data.mailbox_email || 'Not synced';
    if ($('pocketSkyEmailUnread')) $('pocketSkyEmailUnread').textContent = String(counts.inbox_unread ?? (summary.labels || []).find((label) => label.id === 'INBOX')?.messagesUnread ?? 0);
    if ($('pocketSkyEmailSync')) $('pocketSkyEmailSync').textContent = data.ok ? (data.mode || 'Synced') : 'Needs setup';
    const inboxLink = String(data.links?.inbox || '');
    const composeLink = String(data.links?.compose || '');
    if ($('pocketSkyEmailInboxLink')) $('pocketSkyEmailInboxLink').href = inboxLink.startsWith('/live/SkyeMail/session-handoff') ? inboxLink : SKYEMAIL_INBOX_HANDOFF;
    if ($('pocketSkyEmailComposeLink')) $('pocketSkyEmailComposeLink').href = composeLink.startsWith('/live/SkyeMail/session-handoff') ? composeLink : SKYEMAIL_COMPOSE_HANDOFF;
    const list = $('pocketSkyEmailMessages');
    if (list) {
      list.innerHTML = messages.map((message) => `
        <article class="mini-mail-card">
          <strong>${escapeHtml(message.subject || message.headers?.subject || '(no subject)')}</strong>
          <span>${escapeHtml(message.from || message.headers?.from || message.from_email || '')}</span>
          <small>${escapeHtml(message.created_at || message.internal_date || '')}</small>
        </article>
      `).join('') || '<div class="empty-state">No recent SkyeMail messages in the pocket sync yet.</div>';
    }
    showJson('pocketSkyEmailOutput', data.ok ? {
      mailbox: mailbox.mailbox_email || data.mailbox_email,
      counts,
      aliases: summary.aliases || [],
      key_state: summary.key_state || null,
      synced_at: summary.synced_at || null
    } : data);
  }

  async function refreshSkyEmailPocket() {
    if (!$('pocketSkyEmailOutput')) return null;
    showJson('pocketSkyEmailOutput', 'Syncing pocket SkyeMail...');
    const data = await commandApi('/api/founder-command/skyemail/pocket');
    renderPocketSkyEmail(data);
    return data;
  }

  function mailboxOffboardingPayload(action) {
    const form = $('mailboxOffboardingForm');
    const data = formDataObject(form);
    data.action = action;
    data.confirm_archive_exported = Boolean(form.querySelector('[name="confirm_archive_exported"]')?.checked);
    data.confirm_client_notified = Boolean(form.querySelector('[name="confirm_client_notified"]')?.checked);
    data.confirm_provider_released = Boolean(form.querySelector('[name="confirm_provider_released"]')?.checked);
    return data;
  }

  function mailboxOffboardingQuery(data) {
    const params = new URLSearchParams();
    ['action', 'mailbox_email', 'workspace_id'].forEach((key) => {
      if (data[key]) params.set(key, data[key]);
    });
    return params.toString();
  }

  async function refreshMailboxOffboarding() {
    const data = mailboxOffboardingPayload('status');
    if (!data.mailbox_email && !data.workspace_id) {
      return showJson('mailboxOffboardingOutput', 'Enter a mailbox email or workspace/client id first.');
    }
    showJson('mailboxOffboardingOutput', 'Checking SkyeMail offboarding status...');
    const query = mailboxOffboardingQuery(data);
    const body = await commandApi(`/api/founder-command/skyemail/offboarding${query ? `?${query}` : ''}`);
    showJson('mailboxOffboardingOutput', body.ok ? body.offboarding : body);
    return body;
  }

  async function runMailboxOffboarding(action) {
    const data = mailboxOffboardingPayload(action);
    if (!data.mailbox_email && !data.workspace_id) {
      return showJson('mailboxOffboardingOutput', 'Enter a mailbox email or workspace/client id first.');
    }
    if (action === 'release' && (!data.confirm_archive_exported || !data.confirm_provider_released)) {
      return showJson('mailboxOffboardingOutput', 'Archive/export and provider seat release confirmations are required before final release.');
    }
    showJson('mailboxOffboardingOutput', action === 'prepare' ? 'Preparing mailbox offboarding packet...' : `Running ${action} on SkyeMail offboarding lane...`);
    const body = await commandApi('/api/founder-command/skyemail/offboarding', { method: 'POST', body: data });
    showJson('mailboxOffboardingOutput', body.ok ? { record: body.record, offboarding: body.offboarding } : body);
    await refreshCommandStatus();
    return body;
  }

  function renderHandoffQr(record) {
    const target = $('skyEmailHandoffQr');
    const link = record?.qr_payload || record?.launch_url || '';
    if (!target) return;
    if (!link) {
      target.innerHTML = '<span>QR appears after handoff.</span>';
      return;
    }
    try {
      if (typeof window.qrcode === 'function') {
        const qr = window.qrcode(0, 'M');
        qr.addData(link);
        qr.make();
        target.innerHTML = qr.createSvgTag(4, 0);
      } else {
        target.innerHTML = `<span>${escapeHtml(link)}</span>`;
      }
    } catch {
      target.innerHTML = `<span>${escapeHtml(link)}</span>`;
    }
  }

  function renderSkyEmailHandoff(record) {
    if (!record) return;
    const confirmationRecipients = Array.isArray(record.workspace_confirmation_recipients) ? record.workspace_confirmation_recipients.join(', ') : (record.workspace_confirmation_recipients || OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS.join(', '));
    if ($('skyEmailHandoffTitle')) $('skyEmailHandoffTitle').textContent = record.welcome_title || 'SkyeMail Launch Spark';
    if ($('skyEmailHandoffText')) $('skyEmailHandoffText').textContent = `${record.mailbox_email || 'Mailbox'} | ${record.skyemerit_offer?.prompt || 'SkyeMerit offer ready.'} | Owner confirmations: ${confirmationRecipients}`;
    if ($('skyEmailHandoffLink')) $('skyEmailHandoffLink').href = record.launch_url || record.login_url || 'https://skyemail-platform.graylondonskyes.workers.dev/';
    const video = document.querySelector('#skyEmailHandoffPreview video');
    if (video && record.welcome_video_url && video.getAttribute('src') !== record.welcome_video_url) {
      video.setAttribute('src', record.welcome_video_url);
      video.load();
    }
    renderHandoffQr(record);
  }

  function renderSkyEmailHandoffList(records = []) {
    const list = $('skyEmailHandoffList');
    if (!list) return;
    list.innerHTML = records.map((record) => `
      <article class="route-card">
        <strong>${escapeHtml(record.company_name || record.workspace_handle_display || record.id)}</strong>
        <span>${escapeHtml(record.mailbox_email || '')}</span>
        <span>${escapeHtml(record.status || 'handoff')}</span>
        <div class="tool-row">
          ${record.launch_url ? `<a class="button secondary" href="${escapeAttr(record.launch_url)}" target="_blank" rel="noopener">Open</a>` : ''}
          <button class="button secondary" data-handoff-open="${escapeAttr(record.id)}" type="button">Preview</button>
          <button class="button secondary" data-handoff-send="${escapeAttr(record.id)}" type="button">Send</button>
        </div>
      </article>
    `).join('') || '<div class="empty-state">No SkyeMail handoff packets yet.</div>';
  }

  async function refreshSkyEmailHandoffs() {
    showJson('skyEmailHandoffOutput', 'Loading SkyeMail handoff packets...');
    const body = await commandApi('/api/founder-command/skyemail/handoffs');
    renderSkyEmailHandoffList(body.handoffs || []);
    if (body.main_workspace) renderSkyEmailHandoff(body.main_workspace);
    showJson('skyEmailHandoffOutput', body.ok ? { count: body.count || 0, main_workspace: body.main_workspace?.mailbox_email || null } : body);
    return body;
  }

  async function createSkyEmailHandoff(action = 'provision') {
    const form = $('skyEmailHandoffForm');
    const data = formDataObject(form);
    data.action = action;
    data.send_email = Boolean(form.querySelector('[name="send_email"]')?.checked);
    data.main_0s = action === 'main-0s' || Boolean(form.querySelector('[name="main_0s"]')?.checked);
    data.public_contact_email = OWNER_MARKETING_CONTACT_EMAIL;
    data.workspace_confirmation_recipients = OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS;
    data.confirmation_recipients = OWNER_WORKSPACE_CONFIRMATION_RECIPIENTS;
    if (action === 'main-0s') {
      data.company_name = 'MetrAIyux 0S';
      data.workspace_handle = 'MetrAIyux-0s';
      data.mailbox_local = 'metraiyux-0s';
      data.plan_id = data.plan_id || 'zero-os-core';
    }
    if (!data.owner_email && action !== 'main-0s') return showJson('skyEmailHandoffOutput', 'Owner email is required for client handoff packets.');
    showJson('skyEmailHandoffOutput', action === 'main-0s' ? 'Creating the MetrAIyux-0s main SkyeMail workspace...' : 'Creating SkyeMail handoff packet...');
    const body = await commandApi('/api/founder-command/skyemail/handoffs', { method: 'POST', body: data });
    showJson('skyEmailHandoffOutput', body.ok ? { record: body.record, email_delivery: body.email_delivery } : body);
    if (body.record) renderSkyEmailHandoff(body.record);
    await refreshCommandStatus();
    await refreshSkyEmailHandoffs();
    return body;
  }

  async function sendSkyEmailHandoff(id) {
    if (!id) return;
    showJson('skyEmailHandoffOutput', 'Sending SkyeMail handoff email...');
    const body = await commandApi('/api/founder-command/skyemail/handoffs', { method: 'POST', body: { action: 'send', handoff_id: id } });
    showJson('skyEmailHandoffOutput', body);
    if (body.record) renderSkyEmailHandoff(body.record);
    await refreshSkyEmailHandoffs();
  }

  function categoryOptions() {
    const current = $('assetCategoryFilter').value || 'all';
    const categories = ['all', ...Array.from(new Set(state.assets.map((asset) => asset.category || 'general'))).sort()];
    $('assetCategoryFilter').innerHTML = categories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category === 'all' ? 'All categories' : category)}</option>`).join('');
    $('assetCategoryFilter').value = categories.includes(current) ? current : 'all';
  }

  function assetThumb(asset) {
    if (isImage(asset) && asset.href) return `<img src="${escapeAttr(asset.href)}" alt="${escapeAttr(asset.name)}" loading="lazy" />`;
    if (isImage(asset) && asset.previewUrl) return `<img src="${escapeAttr(asset.previewUrl)}" alt="${escapeAttr(asset.name)}" />`;
    if (isAudio(asset)) return '<span>Audio</span>';
    const label = asset.repoMemory ? 'Repo' : asset.localUpload ? 'Upload' : (asset.kind || 'File').toUpperCase();
    return `<span>${escapeHtml(label)}</span>`;
  }

  function renderAssets() {
    categoryOptions();
    const query = $('assetSearch').value.trim().toLowerCase();
    const category = $('assetCategoryFilter').value || 'all';
    const filtered = state.assets.filter((asset) => {
      if (category !== 'all' && (asset.category || 'general') !== category) return false;
      const haystack = [asset.name, asset.category, asset.notes, asset.href, asset.sourcePath].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    });
    $('assetGrid').innerHTML = filtered.map((asset) => `
      <article class="asset-card">
        <div class="asset-thumb">${assetThumb(asset)}</div>
        <div class="asset-body">
          <strong>${escapeHtml(asset.name)}</strong>
          <div class="asset-meta">${escapeHtml(asset.sourcePath || asset.href || 'local browser upload')}</div>
          <div class="badge-row">
            ${asset.repoAsset ? '<span class="badge ok">0S file</span>' : ''}
            ${asset.songVault ? '<span class="badge gold">song vault</span>' : ''}
            ${asset.repoMemory ? '<span class="badge gold">repo memory</span>' : ''}
            ${asset.localUpload ? '<span class="badge">local upload</span>' : ''}
            <span class="badge">${escapeHtml(asset.category || 'general')}</span>
          </div>
          <p class="tiny">${escapeHtml(asset.notes || '')}</p>
          <div class="tool-row">
            ${asset.href ? `<a class="button secondary" href="${escapeAttr(asset.href)}" target="_blank" rel="noopener">Open</a>` : ''}
            <button class="button secondary" data-asset-download="${escapeAttr(asset.id)}" type="button">Download</button>
            <button class="button secondary" data-asset-copy="${escapeAttr(asset.id)}" type="button">Copy Path</button>
            ${isHtmlLike(asset) ? `<button class="button secondary" data-asset-template="${escapeAttr(asset.id)}" type="button">Use as Intro</button>` : ''}
            ${isImage(asset) ? `<button class="button secondary" data-asset-logo="${escapeAttr(asset.id)}" type="button">Set Founder Image</button>` : ''}
            ${asset.localUpload ? `<button class="button danger" data-asset-delete="${escapeAttr(asset.id)}" type="button">Delete</button>` : ''}
          </div>
        </div>
      </article>
    `).join('') || '<div class="empty-state">No assets found.</div>';
    renderMetrics();
  }

  function updateSongCollectionFilter() {
    if (!$('songCollectionFilter')) return;
    const current = $('songCollectionFilter').value || 'all';
    const collections = ['all', ...Array.from(new Set(songVaultEntries().map((song) => song.collection || 'music'))).sort()];
    $('songCollectionFilter').innerHTML = collections.map((collection) => {
      const label = collection === 'all'
        ? 'All collections'
        : (songVaultEntries().find((song) => song.collection === collection)?.collectionLabel || collection);
      return `<option value="${escapeAttr(collection)}">${escapeHtml(label)}</option>`;
    }).join('');
    $('songCollectionFilter').value = collections.includes(current) ? current : 'all';
  }

  function songVaultSummaryText() {
    const songs = songVaultEntries();
    return [
      `Founder Command Song Vault: ${songs.length} songs / ${fmtBytes(SONG_VAULT.totalBytes || songs.reduce((sum, song) => sum + Number(song.bytes || 0), 0))}`,
      `Vault root: ${SONG_VAULT.vaultRoot || 'metraiyux_0s_site/founder-command/song-vault'}`,
      `Browser root: ${SONG_VAULT.browserRoot || '/founder-command/song-vault/'}`,
      `Manifest: /founder-command/song-vault/manifest.json`,
      '',
      ...songs.map((song) => `${song.title} | ${song.href} | source ${song.sourcePath || 'manifest'}`)
    ].join('\n');
  }

  function songIndexById(id) {
    const songs = playableSongEntries();
    const index = songs.findIndex((song) => (song.id || song.slug) === id);
    return index >= 0 ? index : 0;
  }

  function updateSongRadioText(song, status = '') {
    if ($('songRadioTitle')) $('songRadioTitle').textContent = song?.title || song?.fileName || 'Choose a song or press Play Vault.';
    if ($('songRadioMeta')) {
      $('songRadioMeta').textContent = status || (song
        ? `${song.collectionLabel || 'Song Vault'} | ${fmtBytes(song.bytes || 0)} | owner-gated audio`
        : 'Audio loads through the shared 0S owner gate.');
    }
  }

  function songDirectHref(song) {
    return song?.deployHref || song?.href || '';
  }

  function updateSongOpenLink(href = '') {
    const link = $('songRadioOpenLink');
    if (!link) return;
    if (href) {
      link.href = href;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
    }
  }

  async function tryPlayLoadedAudio(audio, song) {
    try {
      await audio.play();
      updateSongRadioText(song, 'Playing through the shared 0S owner gate.');
      setStatus(`Playing ${song.title || song.fileName || 'song'} from Founder Song Vault.`);
      return true;
    } catch (error) {
      const blocked = error?.name === 'NotAllowedError';
      updateSongRadioText(song, blocked
        ? 'Track is loaded in the audio bar. Press the audio play control if the browser blocked playback.'
        : 'The direct audio lane missed. Rebuilding through the gated blob lane...');
      if (blocked) return false;
      throw error;
    }
  }

  async function loadSongAsBlobUrl(song) {
    const blob = await songBlob(song);
    if (state.activeSongObjectUrl) URL.revokeObjectURL(state.activeSongObjectUrl);
    state.activeSongObjectUrl = URL.createObjectURL(blob);
    return state.activeSongObjectUrl;
  }

  async function playSongVaultIndex(index = state.activeSongIndex) {
    const songs = playableSongEntries();
    if (!songs.length) {
      toast('No playable songs are loaded in the vault.', true);
      return null;
    }
    const safeIndex = ((index % songs.length) + songs.length) % songs.length;
    const song = songs[safeIndex];
    const audio = $('songRadioAudio');
    if (!audio) return null;
    state.activeSongIndex = safeIndex;
    updateSongRadioText(song, 'Loading through the shared 0S gate...');
    updateSongOpenLink('');
    try {
      const directHref = songDirectHref(song);
      if (directHref && !(Array.isArray(song.deployParts) && song.deployParts.length)) {
        if (state.activeSongObjectUrl) {
          URL.revokeObjectURL(state.activeSongObjectUrl);
          state.activeSongObjectUrl = '';
        }
        audio.src = directHref;
        audio.playbackRate = 1;
        audio.load();
        updateSongOpenLink(directHref);
        await tryPlayLoadedAudio(audio, song);
        return song;
      }
      const blobUrl = await loadSongAsBlobUrl(song);
      audio.src = blobUrl;
      audio.playbackRate = 1;
      audio.load();
      updateSongOpenLink(blobUrl);
      await tryPlayLoadedAudio(audio, song);
      return song;
    } catch (error) {
      try {
        const blobUrl = await loadSongAsBlobUrl(song);
        audio.src = blobUrl;
        audio.playbackRate = 1;
        audio.load();
        updateSongOpenLink(blobUrl);
        await tryPlayLoadedAudio(audio, song);
        return song;
      } catch (fallbackError) {
        updateSongRadioText(song, 'Playback needs owner gate access. Log in, then press Play again.');
        toast(fallbackError.message || error.message || 'Song playback failed.', true);
        return null;
      }
    }
  }

  function playSongVaultById(id) {
    return playSongVaultIndex(songIndexById(id));
  }

  function renderSongVault() {
    if (!$('songVaultGrid')) return;
    updateSongCollectionFilter();
    const songs = songVaultEntries();
    const totalBytes = SONG_VAULT.totalBytes || songs.reduce((sum, song) => sum + Number(song.bytes || 0), 0);
    $('songVaultCount').textContent = songs.length;
    $('songVaultSize').textContent = fmtBytes(totalBytes);
    $('songVaultGenerated').textContent = fmtDateTime(SONG_VAULT.generatedAt || '');
    $('songVaultRoot').textContent = SONG_VAULT.vaultRoot || 'song-vault';

    const query = ($('songSearch')?.value || '').trim().toLowerCase();
    const collection = $('songCollectionFilter')?.value || 'all';
    const filtered = songs.filter((song) => {
      if (collection !== 'all' && song.collection !== collection) return false;
      const haystack = [
        song.title,
        song.collectionLabel,
        song.fileName,
        song.href,
        song.vaultPath,
        song.sourcePath,
        song.sha256,
        ...(song.duplicateSourcePaths || [])
      ].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    });

    $('songVaultGrid').innerHTML = filtered.map((song) => {
      const hasParts = Array.isArray(song.deployParts) && song.deployParts.length > 0;
      return `
      <article class="song-card">
        <div class="song-card-head">
          <div>
            <span>${escapeHtml(song.collectionLabel || 'Song Vault')}</span>
            <strong>${escapeHtml(song.title || song.fileName || 'Song')}</strong>
          </div>
          <span class="badge">${escapeHtml(song.extension || 'audio')}</span>
        </div>
        ${hasParts
          ? `<div class="empty-state">Large master file. Playback and download rebuild it from ${song.deployParts.length} deploy-safe parts.</div>`
          : `<div class="empty-state">Press Play to load this track through your shared 0S gate session.</div>`}
        <div class="song-meta">
          <span>${escapeHtml(fmtBytes(song.bytes || 0))}</span>
          <span>${escapeHtml(compactHash(song.sha256 || '', 18))}</span>
          <span>${escapeHtml(song.vaultPath || '')}</span>
          ${hasParts ? `<span>${escapeHtml(`${song.deployParts.length} browser parts for production download`)}</span>` : ''}
          ${song.duplicateSourcePaths?.length ? `<span>${escapeHtml(`${song.duplicateSourcePaths.length} duplicate source path${song.duplicateSourcePaths.length === 1 ? '' : 's'} recorded`)}</span>` : ''}
        </div>
        <div class="tool-row">
          <button class="button" data-song-play="${escapeAttr(song.id || song.slug)}" type="button">Play</button>
          <button class="button" data-song-download="${escapeAttr(song.id || song.slug)}" type="button">Download</button>
          ${hasParts ? '' : `<a class="button secondary" href="${escapeAttr(song.deployHref || song.href || '')}" target="_blank" rel="noopener">Open</a>`}
          <button class="button secondary" data-song-copy="${escapeAttr(song.id || song.slug)}" type="button">Copy Path</button>
        </div>
      </article>
    `;
    }).join('') || '<div class="empty-state">No songs found.</div>';
    renderMetrics();
  }

  async function songBlob(song) {
    if (Array.isArray(song.deployParts) && song.deployParts.length) {
      const chunks = [];
      for (const part of song.deployParts) {
        const response = await fetch(part.href, { credentials: 'include', headers: commandHeaders() });
        if (!response.ok) throw new Error(`Could not load ${song.title} part ${part.index}.`);
        chunks.push(await response.blob());
      }
      return new Blob(chunks, { type: song.mime || 'application/octet-stream' });
    }
    const response = await fetch(song.deployHref || song.href, { credentials: 'include', headers: commandHeaders() });
    if (!response.ok) throw new Error(`Could not load ${song.title}.`);
    return response.blob();
  }

  async function downloadSong(song) {
    download(song.fileName || `${slugify(song.title || 'song')}.${song.extension || 'bin'}`, await songBlob(song), song.mime || 'application/octet-stream');
  }

  function downloadSongVaultBatch() {
    const songs = songVaultEntries();
    songs.forEach((song, index) => {
      setTimeout(() => {
        downloadSong(song).catch((error) => toast(error.message || 'Song download failed.', true));
      }, index * 600);
    });
    toast(`Starting ${songs.length} song downloads.`);
    setStatus(`Starting ${songs.length} song downloads. Your browser may ask to allow multiple files.`);
  }

  async function ensureAssetBlob(asset) {
    if (asset.inlineText !== undefined) {
      return new Blob([asset.inlineText], { type: asset.mime || 'text/plain;charset=utf-8' });
    }
    if (Array.isArray(asset.deployParts) && asset.deployParts.length) {
      const chunks = [];
      for (const part of asset.deployParts) {
        const response = await fetch(part.href, { credentials: 'include' });
        if (!response.ok) throw new Error(`Could not load ${asset.name} part ${part.index}.`);
        chunks.push(await response.blob());
      }
      return new Blob(chunks, { type: asset.mime || 'application/octet-stream' });
    }
    if (asset.href) {
      const response = await fetch(asset.href, { credentials: 'include' });
      if (!response.ok) throw new Error(`Could not load ${asset.name} from ${asset.href}.`);
      return response.blob();
    }
    if (asset.localUpload) {
      const record = await db.get(asset.id);
      if (!record?.blob) throw new Error(`${asset.name} is not stored in this browser.`);
      return record.blob;
    }
    throw new Error(`${asset.name} does not have a real file source.`);
  }

  async function textFromAsset(asset) {
    const blob = await ensureAssetBlob(asset);
    return blob.text();
  }

  function download(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.inset = '0 auto auto 0';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    toast('Copied.');
  }

  function founderSkyemeritCopyText() {
    return [
      `SkyeMerit code: ${FOUNDER_SKYEMERIT.code}`,
      `Pack: ${FOUNDER_SKYEMERIT.packId}`,
      `Value: ${FOUNDER_SKYEMERIT.valueLabel}`,
      `Auth lane: ${FOUNDER_SKYEMERIT.authLane}`,
      `SkyePay: ${FOUNDER_SKYEMERIT.skyePayHref}`,
      `Pricing source: ${absoluteHref(FOUNDER_SKYEMERIT.pricingHref)}`,
      `Free99 rules: ${absoluteHref(FOUNDER_SKYEMERIT.free99Href)}`
    ].join('\n');
  }

  async function handleFiles(files) {
    if (!files.length) return;
    const added = [];
    for (const file of files) {
      const id = `upload-${slugify(file.name) || 'file'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const asset = {
        id,
        name: file.name,
        category: guessCategory(file.name),
        kind: file.name.split('.').pop()?.toLowerCase() || 'file',
        mime: file.type || 'application/octet-stream',
        size: file.size,
        notes: 'Local browser upload.',
        localUpload: true,
        real: true
      };
      if (isImage(asset)) asset.previewUrl = URL.createObjectURL(file);
      await db.put({ id, name: file.name, type: file.type, size: file.size, blob: file });
      added.push(asset);
    }
    state.assets = [...added, ...state.assets];
    saveState();
    renderAssets();
    toast(`${added.length} file${added.length === 1 ? '' : 's'} added.`);
  }

  function guessCategory(name = '') {
    const n = name.toLowerCase();
    if (n.includes('founder')) return 'founder-layer';
    if (n.includes('logo') || /\.(png|jpe?g|webp|gif|svg)$/.test(n)) return 'brand-system';
    if (n.includes('intro') || n.endsWith('.html')) return 'intro-template';
    if (n.includes('agent') || n.includes('mcp') || n.endsWith('.md') || n.endsWith('.txt')) return 'repo-memory';
    if (n.endsWith('.json')) return 'manifest';
    if (n.endsWith('.zip')) return 'zip-pack';
    return 'general';
  }

  function renderRepoMemory() {
    const query = $('repoSearch').value.trim().toLowerCase();
    const filtered = state.repoMemory.filter((entry) => {
      const haystack = [entry.name, entry.category, entry.sourcePath, entry.notes, entry.inlineText].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    });
    if (!state.activeRepoMemoryId && filtered[0]) state.activeRepoMemoryId = filtered[0].id;
    $('repoMemoryList').innerHTML = filtered.map((entry) => `
      <button class="memory-row${entry.id === state.activeRepoMemoryId ? ' active' : ''}" data-repo-id="${escapeAttr(entry.id)}" type="button">
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${escapeHtml(entry.category || 'repo-memory')}</span>
        <span>${escapeHtml(entry.sourcePath || '')}</span>
      </button>
    `).join('') || '<div class="empty-state">No repo memory found.</div>';
    renderRepoReader();
  }

  function renderRepoReader() {
    const entry = state.repoMemory.find((item) => item.id === state.activeRepoMemoryId) || state.repoMemory[0];
    if (!entry) return;
    state.activeRepoMemoryId = entry.id;
    $('repoReaderKind').textContent = entry.category || 'Repo memory';
    $('repoReaderTitle').textContent = entry.name;
    $('repoReaderPath').textContent = entry.sourcePath || '';
    $('repoReaderText').textContent = entry.inlineText || '';
    saveState();
  }

  function renderFounderForm() {
    $('companyName').value = state.founder.companyName || '';
    $('founderName').value = state.founder.founderName || '';
    $('founderTitle').value = state.founder.founderTitle || '';
    $('founderEmail').value = state.founder.email || '';
    $('founderPhone').value = state.founder.phone || '';
    $('founderWebsite').value = state.founder.website || '';
    $('founderLogoUrl').value = state.founder.logoUrl || '';
    $('founderHeroImageUrl').value = state.founder.heroImageUrl || '';
    $('founderHeadline').value = state.founder.headline || '';
    $('founderBio').value = state.founder.bio || '';
    $('founderStory').value = state.founder.story || '';
    $('founderCtaLabel').value = state.founder.ctaLabel || '';
    $('founderCtaHref').value = state.founder.ctaHref || '';
    $('founderFooterBlurb').value = state.founder.footerBlurb || '';
    renderFounderPreview();
  }

  function founderPageHtml(founder) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(founder.companyName)} Founder</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#07090d;color:#f5f7fb;font-family:Inter,Arial,sans-serif}.shell{width:min(1180px,calc(100vw - 28px));margin:18px auto;display:grid;gap:14px}
    .panel{border:1px solid rgba(221,228,239,.16);border-radius:8px;background:#111721;padding:22px}.hero{display:grid;grid-template-columns:1fr .78fr;gap:14px}.logo{width:120px}.photo{width:100%;height:100%;min-height:420px;object-fit:cover;border-radius:8px}
    h1{font-size:clamp(34px,6vw,72px);line-height:.96;margin:16px 0}p{color:#a5afbe;line-height:1.7}.button{display:inline-block;margin-top:12px;border:1px solid rgba(216,164,57,.55);border-radius:8px;padding:10px 14px;color:#f5f7fb;text-decoration:none;background:rgba(216,164,57,.18)}
    @media(max-width:860px){.hero{grid-template-columns:1fr}.photo{min-height:0}}
  </style>
</head>
<body>
  <main class="shell">
    <section class="panel hero">
      <div>
        ${founder.logoUrl ? `<img class="logo" src="${escapeAttr(founder.logoUrl)}" alt="${escapeAttr(founder.companyName)} logo" />` : ''}
        <h1>${escapeHtml(founder.headline || founder.companyName)}</h1>
        <p>${escapeHtml(founder.bio || '')}</p>
        ${founder.ctaHref ? `<a class="button" href="${escapeAttr(founder.ctaHref)}">${escapeHtml(founder.ctaLabel || 'Connect')}</a>` : ''}
      </div>
      ${founder.heroImageUrl ? `<img class="photo" src="${escapeAttr(founder.heroImageUrl)}" alt="${escapeAttr(founder.founderName)}" />` : '<div class="panel"><p>Add a founder image URL.</p></div>'}
    </section>
    <section class="panel"><h2>Founder Story</h2><p>${escapeHtml(founder.story || '')}</p></section>
    <section class="panel"><h2>Contact</h2><p>${escapeHtml(founder.founderName)}<br>${escapeHtml(founder.founderTitle)}<br>${escapeHtml(founder.email)}<br>${escapeHtml(founder.phone)}<br>${escapeHtml(founder.website)}</p></section>
    <footer class="panel">${escapeHtml(founder.footerBlurb || '')}</footer>
  </main>
</body>
</html>`;
  }

  function founderSectionSnippet(founder) {
    return `<section class="about-founder">
  <div class="container">
    <h2>About the Founder</h2>
    <p>${escapeHtml(founder.story || founder.bio || '')}</p>
    <p><strong>${escapeHtml(founder.founderName)}</strong> - ${escapeHtml(founder.founderTitle)} - <a href="mailto:${escapeAttr(founder.email)}">${escapeHtml(founder.email)}</a></p>
  </div>
</section>`;
  }

  function renderFounderPreview() {
    $('founderPreview').srcdoc = founderPageHtml(state.founder);
  }

  function fillProjectForm(project = null) {
    $('projectId').value = project?.id || '';
    $('projectName').value = project?.name || '';
    $('projectSlug').value = project?.slug || '';
    $('projectDescription').value = project?.description || '';
    $('projectIntroTemplate').value = project?.introTemplateId || state.templates[0]?.id || '';
    $('projectNotes').value = project?.notes || '';
    $('includeFounderPage').checked = !!project?.includeFounderPage;
    $('includeFounderSection').checked = !!project?.includeFounderSection;
    $('includeFooterSnippet').checked = !!project?.includeFooterSnippet;
  }

  function renderProjects() {
    $('projectIntroTemplate').innerHTML = state.templates.map((template) => `<option value="${escapeAttr(template.id)}">${escapeHtml(template.name)}</option>`).join('');
    const rows = state.projects.map((project) => `
      <article class="list-row">
        <div>
          <strong>${escapeHtml(project.name)}</strong>
          <span>${escapeHtml(project.description || '')}</span>
          <div class="badge-row">
            <span class="badge">${escapeHtml(project.slug || '')}</span>
            <span class="badge">Assets ${(project.selectedAssetIds || []).length}</span>
            <span class="badge">Blocks ${(project.selectedSnippetIds || []).length}</span>
          </div>
        </div>
        <div class="row-actions">
          <button class="button secondary" data-project-select="${escapeAttr(project.id)}" type="button">Select</button>
          <button class="button secondary" data-project-edit="${escapeAttr(project.id)}" type="button">Edit</button>
          <button class="button secondary" data-project-export="${escapeAttr(project.id)}" type="button">Export</button>
          <button class="button danger" data-project-delete="${escapeAttr(project.id)}" type="button">Delete</button>
        </div>
      </article>
    `).join('');
    $('projectList').innerHTML = rows || '<div class="empty-state">No projects yet.</div>';
    renderAssignmentPanel();
    renderMetrics();
  }

  function renderAssignmentPanel() {
    const project = state.projects.find((item) => item.id === state.activeProjectId);
    if (!project) {
      $('projectAssignmentPanel').className = 'empty-state';
      $('projectAssignmentPanel').textContent = 'Choose a project from the list below.';
      return;
    }
    $('projectAssignmentPanel').className = '';
    const assetItems = state.assets.map((asset) => `
      <label><input type="checkbox" data-assign-asset="${escapeAttr(asset.id)}" ${(project.selectedAssetIds || []).includes(asset.id) ? 'checked' : ''} /> ${escapeHtml(asset.name)}</label>
    `).join('');
    const snippetItems = state.snippets.map((snippet) => `
      <label><input type="checkbox" data-assign-snippet="${escapeAttr(snippet.id)}" ${(project.selectedSnippetIds || []).includes(snippet.id) ? 'checked' : ''} /> ${escapeHtml(snippet.name)}</label>
    `).join('');
    $('projectAssignmentPanel').innerHTML = `
      <div class="badge-row"><span class="badge ok">Active: ${escapeHtml(project.name)}</span></div>
      <div class="split-grid" style="margin-top:12px">
        <div class="stack-form"><strong>Assets</strong>${assetItems}</div>
        <div class="stack-form"><strong>Blocks</strong>${snippetItems}</div>
      </div>
    `;
  }

  function projectBundle(projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return null;
    const snippetIds = new Set(project.selectedSnippetIds || []);
    if (project.includeFounderSection) snippetIds.add('snippet-about-founder');
    if (project.includeFooterSnippet) snippetIds.add('snippet-global-footer');
    return {
      version: 3,
      generatedAt: new Date().toISOString(),
      project,
      founder: state.founder,
      introTemplate: state.templates.find((item) => item.id === project.introTemplateId) || null,
      selectedAssets: state.assets.filter((asset) => (project.selectedAssetIds || []).includes(asset.id)).map((asset) => ({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        href: asset.href || '',
        sourcePath: asset.sourcePath || '',
        localUpload: !!asset.localUpload,
        repoMemory: !!asset.repoMemory
      })),
      selectedSnippets: state.snippets.filter((snippet) => snippetIds.has(snippet.id)),
      founderPageHtml: project.includeFounderPage ? founderPageHtml(state.founder) : '',
      founderSectionHtml: project.includeFounderSection ? founderSectionSnippet(state.founder) : '',
      rules: [
        'Use 0meg4Command 6.7 as the founder command source of truth.',
        'Use only real repo assets, embedded safe repo memory, or local uploads.',
        'Keep owner access on the shared 0S gate.'
      ]
    };
  }

  function renderTemplates() {
    $('templateList').innerHTML = state.templates.map((template) => `
      <article class="list-row">
        <div><strong>${escapeHtml(template.name)}</strong><span>${escapeHtml(template.sourceFile || 'custom')}</span></div>
        <div class="row-actions">
          <button class="button secondary" data-template-open="${escapeAttr(template.id)}" type="button">Open</button>
          <button class="button secondary" data-template-download="${escapeAttr(template.id)}" type="button">Download</button>
        </div>
      </article>
    `).join('');
    if (!state.activeTemplateId && state.templates[0]) state.activeTemplateId = state.templates[0].id;
    loadTemplate(state.activeTemplateId);
    renderMetrics();
  }

  function loadTemplate(id) {
    const template = state.templates.find((item) => item.id === id) || state.templates[0];
    if (!template) return;
    state.activeTemplateId = template.id;
    $('templateEditorMeta').textContent = template.sourceFile || template.name;
    $('templateEditor').value = template.content || '';
    $('templatePreview').srcdoc = template.content || '';
    saveState();
  }

  function renderSnippets() {
    $('snippetList').innerHTML = state.snippets.map((snippet) => `
      <article class="list-row">
        <div><strong>${escapeHtml(snippet.name)}</strong><span>${escapeHtml(snippet.type || 'other')}</span></div>
        <div class="row-actions">
          <button class="button secondary" data-snippet-edit="${escapeAttr(snippet.id)}" type="button">Edit</button>
          <button class="button secondary" data-snippet-copy="${escapeAttr(snippet.id)}" type="button">Copy</button>
          <button class="button danger" data-snippet-delete="${escapeAttr(snippet.id)}" type="button">Delete</button>
        </div>
      </article>
    `).join('');
    renderMetrics();
  }

  function fillSnippetForm(snippet = null) {
    $('snippetId').value = snippet?.id || '';
    $('snippetName').value = snippet?.name || '';
    $('snippetType').value = snippet?.type || 'other';
    $('snippetCode').value = snippet?.code || '';
  }

  function updateBackupSummary() {
    const localUploads = state.assets.filter((asset) => asset.localUpload).length;
    $('backupSummary').textContent = [
      `Real 0S assets: ${state.assets.filter((asset) => asset.repoAsset).length}`,
      `Song vault: ${songVaultEntries().length} songs / ${fmtBytes(SONG_VAULT.totalBytes || 0)}`,
      `Core app shortcuts: ${state.coreApps.length}`,
      `Repo memory files: ${state.repoMemory.length}`,
      `Local uploads: ${localUploads}`,
      `Templates: ${state.templates.length}`,
      `Blocks: ${state.snippets.length}`,
      `Projects: ${state.projects.length}`,
      '',
      'Workspace shows repo-backed files and local uploads only.'
    ].join('\n');
  }

  async function exportWorkspace() {
    setStatus('Preparing workspace export...');
    const uploadPayloads = [];
    const uploads = state.assets.filter((asset) => asset.localUpload);
    for (const asset of uploads) {
      const blob = await ensureAssetBlob(asset);
      const data = await blobToBase64(blob);
      uploadPayloads.push({ ...asset, fileData: { mime: blob.type || asset.mime, size: blob.size, data } });
    }
    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      founder: state.founder,
      songVault: SONG_VAULT,
      clientCredentials: CLIENT_CREDENTIALS.map(clientCredentialPayload),
      assets: state.assets.map(({ previewUrl, ...asset }) => asset),
      coreApps: state.coreApps,
      repoMemory: state.repoMemory,
      templates: state.templates,
      snippets: state.snippets,
      projects: state.projects,
      localUploads: uploadPayloads
    };
    download('0meg4command-6-7-workspace.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    setStatus('Workspace JSON exported.');
    toast('Workspace exported.');
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(data, mime) {
    const raw = atob(data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  }

  async function importWorkspace(file) {
    const parsed = JSON.parse(await file.text());
    state.founder = { ...DEFAULT_FOUNDER, ...(parsed.founder || {}) };
    state.repoMemory = normalizeRepoMemory();
    state.templates = migrateTemplates(parsed.templates || []);
    state.snippets = migrateSnippets(parsed.snippets || []);
    state.coreApps = migrateCoreApps(parsed.coreApps || parsed.core_apps || []);
    state.projects = Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : structuredClone(DEFAULT_PROJECTS);
    state.assets = mergeAssets(parsed.assets || []);
    for (const asset of parsed.localUploads || []) {
      if (!asset.fileData?.data) continue;
      const { fileData, ...cleanAsset } = asset;
      const blob = base64ToBlob(fileData.data, fileData.mime || asset.mime);
      await db.put({ id: cleanAsset.id, name: cleanAsset.name, type: fileData.mime || cleanAsset.mime, size: blob.size, blob });
      if (!state.assets.some((item) => item.id === cleanAsset.id)) state.assets.unshift(cleanAsset);
    }
    saveState();
    renderAll();
    toast('Workspace imported.');
  }

  function formDataObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function showJson(id, value) {
    $(id).textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function skyeNetBackendRunbookText(values = null) {
    const form = $('skyenetBackendForm');
    const data = values || (form ? formDataObject(form) : {});
    const clientName = data.client_name || 'New SkyeNet client';
    const companySlug = slugify(data.company_slug || 'client-company');
    const projectSlug = slugify(data.project_slug || 'client-app');
    const workspaceSlug = slugify(data.workspace_slug || companySlug);
    const buildDir = data.build_dir || 'dist';
    const functionRoot = data.function_root || 'netlify/functions';
    const testFunction = slugify(data.test_function || 'hello');
    const planId = data.plan_id || 'skyenet-functions-managed';
    const backendScope = data.backend_scope || 'Approved managed backend functions.';
    const host = `skyenet.${companySlug}`;
    const price = planId === 'skyenet-sovereign-runtime-reserve'
      ? '$5,000 setup + $997/mo'
      : planId === 'skyenet-edge-growth'
        ? '$997 setup + $297/mo'
        : '$1,500 setup + $497/mo';
    return [
      `SkyeNet backend fulfillment runbook`,
      `Client: ${clientName}`,
      `Plan: ${planId} (${price})`,
      `Public host: https://${host}/`,
      ``,
      `1. Confirm paid activation and scope`,
      `- Confirm SkyePay/owner receipt for ${planId}.`,
      `- Backend scope: ${backendScope}`,
      `- Do not promise unlimited arbitrary customer-uploaded code.`,
      ``,
      `2. Collect backend requirements`,
      `- Endpoint list: method, path, input, output, auth, and error behavior.`,
      `- Secrets/integrations: save through SkyeNet env variables, never in public files.`,
      `- Test payloads: form submits, webhook bodies, CRM fields, email recipients.`,
      ``,
      `3. Review the function lane`,
      `- Review function files under ${functionRoot}.`,
      `- Confirm timeout, body cap, env isolation, outbound fetch needs, auth checks, and failure behavior.`,
      `- Approve only the backend behavior listed in the paid scope.`,
      ``,
      `4. Save env variables in SkyeNet`,
      `Open: https://skyenet.graylondonskyes.workers.dev/console?workspace_id=${workspaceSlug}&project_id=${projectSlug}`,
      `API shape: POST /api/skyenet/env with workspace_id=${workspaceSlug}, project_id=${projectSlug}, key, value, scope.`,
      ``,
      `5. Package and sign managed functions locally`,
      `node tools/skyenet-functions-convert.mjs . --out .skyenet/functions-bundle --tenant ${workspaceSlug}`,
      `node tools/skyenet-functions-runtime.mjs --bundle .skyenet/functions-bundle --port 8789 --require-signature`,
      `curl http://127.0.0.1:8789/.netlify/functions/${testFunction}`,
      `Proof command: npm run 0s:skyenet:functions-proof`,
      `Function root expected: ${functionRoot}`,
      ``,
      `6. Publish app and private full source package`,
      `export SKYENET_AUTH="<shared gate bearer>"`,
      `npm run skyenet:deploy -- \\`,
      `  --dir ${buildDir} \\`,
      `  --source-root . \\`,
      `  --project ${projectSlug} \\`,
      `  --workspace ${workspaceSlug} \\`,
      `  --plan ${planId} \\`,
      `  --host ${host} \\`,
      `  --mount / \\`,
      `  --url-mode subdomain \\`,
      `  --public \\`,
      `  --concurrency 4`,
      ``,
      `7. Closeout proof`,
      `- Live route returns 200: https://${host}/`,
      `- Key assets return 200.`,
      `- Source download is 401 without auth and returns private full project tar with auth.`,
      `- Env list returns redacted values only.`,
      `- Source transfer receipt works for download, instant-download-link, skyedrive, skyevault, or secure-skye-pack.`,
      ``,
      `8. Client-facing handoff`,
      `SkyeNet hosts your app on our sovereign deploy platform. Backend functions are approved, managed, signed, and operated through SkyeNet. Source custody stays account-scoped unless an owner-approved transfer is recorded.`
    ].join('\n');
  }

  function refreshSkyeNetBackendRunbook(event = null) {
    if (event) event.preventDefault();
    if ($('skyenetBackendRunbookOutput')) $('skyenetBackendRunbookOutput').textContent = skyeNetBackendRunbookText();
  }

  function bindEvents() {
    document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
    if ($('commandMenuSearch')) $('commandMenuSearch').addEventListener('input', (event) => filterCommandMenu(event.target.value));
    if ($('commandMenuToggle')) $('commandMenuToggle').addEventListener('click', (event) => {
      event.stopPropagation();
      setCommandMenuOpen($('commandMenuPanel')?.hidden);
    });
    document.addEventListener('click', (event) => {
      if (!$('commandMenu')?.contains(event.target)) setCommandMenuOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setCommandMenuOpen(false);
    });
    if ($('installFounderPwaBtn')) $('installFounderPwaBtn').addEventListener('click', installFounderPwa);
    $('refreshStatusBtn').addEventListener('click', refreshCommandStatus);
    $('exportWorkspaceBtn').addEventListener('click', exportWorkspace);
    $('backupExportBtn').addEventListener('click', exportWorkspace);
    $('backupImportBtn').addEventListener('click', () => $('workspaceImportInput').click());
    $('workspaceImportInput').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (file) await importWorkspace(file);
      event.target.value = '';
    });
    if ($('skyenetBackendForm')) $('skyenetBackendForm').addEventListener('submit', refreshSkyeNetBackendRunbook);
    if ($('copySkyeNetBackendRunbookBtn')) $('copySkyeNetBackendRunbookBtn').addEventListener('click', () => copyText(skyeNetBackendRunbookText()));
    if ($('downloadSkyeNetBackendRunbookBtn')) $('downloadSkyeNetBackendRunbookBtn').addEventListener('click', () => download('skyenet-backend-fulfillment-runbook.txt', skyeNetBackendRunbookText(), 'text/plain;charset=utf-8'));
    $('quickUploadBtn').addEventListener('click', () => {
      setView('assets');
      $('assetFileInput').click();
    });
    $('assetUploadBtn').addEventListener('click', () => $('assetFileInput').click());
    $('quickProjectBtn').addEventListener('click', () => {
      setView('projects');
      fillProjectForm();
      $('projectName').focus();
    });
    $('quickIndexingBtn').addEventListener('click', () => setView('indexing'));
    if ($('copyBobCredentialPackBtn')) $('copyBobCredentialPackBtn').addEventListener('click', () => copyClientCredentialPack('bobs-smoke-shop'));
    if ($('exportBobCredentialPackBtn')) $('exportBobCredentialPackBtn').addEventListener('click', () => exportClientCredentialPack('bobs-smoke-shop'));
    if ($('prefillBobHandoffBtn')) $('prefillBobHandoffBtn').addEventListener('click', () => prefillClientSkyEmailHandoff('bobs-smoke-shop'));
    if ($('refreshValleyVerifiedRoutesBtn')) $('refreshValleyVerifiedRoutesBtn').addEventListener('click', refreshValleyVerifiedRoutes);
    if ($('copyValleyVerifiedLinksBtn')) $('copyValleyVerifiedLinksBtn').addEventListener('click', copyAllValleyVerifiedLinks);
    if ($('copyValleyVerifiedBlastBtn')) $('copyValleyVerifiedBlastBtn').addEventListener('click', copyActiveValleyVerifiedBlast);
    if ($('openValleyVerifiedRouteBtn')) $('openValleyVerifiedRouteBtn').addEventListener('click', openActiveValleyVerifiedRoute);
    if ($('fullscreenValleyVerifiedPreviewBtn')) $('fullscreenValleyVerifiedPreviewBtn').addEventListener('click', () => {
      const frame = $('valleyVerifiedPreviewShell');
      if (!frame?.requestFullscreen) return toast('Fullscreen is not available in this browser.', true);
      frame.requestFullscreen().catch((error) => toast(error.message || 'Fullscreen failed.', true));
    });
    if ($('refreshCompanyOpsBtn')) $('refreshCompanyOpsBtn').addEventListener('click', refreshCompanyOps);
    if ($('refreshFounderActionsBtn')) $('refreshFounderActionsBtn').addEventListener('click', refreshFounderActions);
    if ($('planFounderActionBtn')) $('planFounderActionBtn').addEventListener('click', planFounderAction);
    if ($('executeFounderActionBtn')) $('executeFounderActionBtn').addEventListener('click', executeFounderAction);
    if ($('nexusHirePlanBtn')) $('nexusHirePlanBtn').addEventListener('click', planNexusHireProof);
    if ($('nexusHireRunBtn')) $('nexusHireRunBtn').addEventListener('click', () => runNexusHireProof());
    if ($('nexusHireRetryBtn')) $('nexusHireRetryBtn').addEventListener('click', () => runNexusHireProof({ retry: true }));
    if ($('nexusHirePrefillActionBtn')) $('nexusHirePrefillActionBtn').addEventListener('click', prefillNexusHireActionRouter);
    if ($('companyEnrollPlanBtn')) $('companyEnrollPlanBtn').addEventListener('click', planCompanyEnrollment);
    if ($('companyEnrollRunBtn')) $('companyEnrollRunBtn').addEventListener('click', () => runCompanyEnrollment());
    if ($('companyEnrollRetryBtn')) $('companyEnrollRetryBtn').addEventListener('click', () => runCompanyEnrollment({ retry: true }));
    if ($('aeCommandAssignBtn')) $('aeCommandAssignBtn').addEventListener('click', assignAeCommandWork);
    if ($('aeCommandCloseBtn')) $('aeCommandCloseBtn').addEventListener('click', closeAeCommandWork);
    if ($('founderActionSelect')) $('founderActionSelect').addEventListener('change', () => {
      const action = selectedFounderAction();
      if ($('founderActionParams')) $('founderActionParams').value = JSON.stringify(founderActionDefaults(action), null, 2);
      if ($('founderActionConfirm')) $('founderActionConfirm').checked = false;
      if ($('founderActionIdempotency')) $('founderActionIdempotency').value = '';
    });
    if ($('view-clients')) $('view-clients').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.clientCopy) copyClientCredentialPack(button.dataset.clientCopy);
      if (button.dataset.clientExport) exportClientCredentialPack(button.dataset.clientExport);
      if (button.dataset.clientPrefill) prefillClientSkyEmailHandoff(button.dataset.clientPrefill);
      if (button.dataset.clientCopyField) copyClientCredentialField(button.dataset.clientCopyField);
      if (button.dataset.valleyRoutePreview) previewValleyVerifiedRoute(button.dataset.valleyRoutePreview);
      if (button.dataset.valleyRouteCopy) copyValleyVerifiedRoute(button.dataset.valleyRouteCopy);
    });
    if ($('songSearch')) $('songSearch').addEventListener('input', renderSongVault);
    if ($('songCollectionFilter')) $('songCollectionFilter').addEventListener('change', renderSongVault);
    if ($('downloadAllSongsBtn')) $('downloadAllSongsBtn').addEventListener('click', downloadSongVaultBatch);
    if ($('downloadSongVaultManifestBtn')) $('downloadSongVaultManifestBtn').addEventListener('click', () => {
      download('founder-command-song-vault-manifest.json', JSON.stringify(SONG_VAULT, null, 2), 'application/json;charset=utf-8');
    });
    if ($('copySongVaultSummaryBtn')) $('copySongVaultSummaryBtn').addEventListener('click', () => copyText(songVaultSummaryText()));
    if ($('songRadioPlayBtn')) $('songRadioPlayBtn').addEventListener('click', () => playSongVaultIndex(state.activeSongIndex));
    if ($('songRadioPrevBtn')) $('songRadioPrevBtn').addEventListener('click', () => playSongVaultIndex(state.activeSongIndex - 1));
    if ($('songRadioNextBtn')) $('songRadioNextBtn').addEventListener('click', () => playSongVaultIndex(state.activeSongIndex + 1));
    if ($('songRadioAudio')) {
      $('songRadioAudio').addEventListener('ended', () => playSongVaultIndex(state.activeSongIndex + 1));
      $('songRadioAudio').addEventListener('playing', () => updateSongRadioText(playableSongEntries()[state.activeSongIndex], 'Playing through the shared 0S owner gate.'));
      $('songRadioAudio').addEventListener('error', () => updateSongRadioText(playableSongEntries()[state.activeSongIndex], 'Audio source did not load. Press Play again to rebuild through the gate.'));
    }
    if ($('songVaultGrid')) $('songVaultGrid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-song-copy], [data-song-download], [data-song-play]');
      if (!button) return;
      const id = button.dataset.songCopy || button.dataset.songDownload || button.dataset.songPlay;
      const song = songVaultEntries().find((item) => (item.id || item.slug) === id);
      if (!song) return;
      if (button.dataset.songPlay) playSongVaultById(id);
      if (button.dataset.songCopy) copyText(`${song.deployHref || song.href}\n${song.vaultPath || ''}\nsource: ${song.sourcePath || ''}`);
      if (button.dataset.songDownload) downloadSong(song).catch((error) => toast(error.message || 'Song download failed.', true));
    });
    if ($('copyFounderSkyemeritBtn')) $('copyFounderSkyemeritBtn').addEventListener('click', async () => {
      await copyText(founderSkyemeritCopyText());
      if ($('founderSkyemeritOutput')) {
        $('founderSkyemeritOutput').textContent = `Copied ${FOUNDER_SKYEMERIT.code}\n${FOUNDER_SKYEMERIT.valueLabel} SkyeMerit pack stays on ${FOUNDER_SKYEMERIT.authLane}.`;
      }
    });
    if ($('refreshPocketSkyEmailBtn')) $('refreshPocketSkyEmailBtn').addEventListener('click', refreshSkyEmailPocket);
    if ($('refreshCoreAppsBtn')) $('refreshCoreAppsBtn').addEventListener('click', renderCoreApps);
    if ($('copyCoreAppsBtn')) $('copyCoreAppsBtn').addEventListener('click', () => copyText(coreAppsMapText()));
    if ($('coreAppFullscreenBtn')) $('coreAppFullscreenBtn').addEventListener('click', requestCoreAppFullscreen);
    if ($('openActiveCoreAppBtn')) $('openActiveCoreAppBtn').addEventListener('click', openActiveCoreApp);
    if ($('resetCoreAppsBtn')) $('resetCoreAppsBtn').addEventListener('click', () => {
      if (!confirm('Reset core app shortcuts to the 0S defaults?')) return;
      state.coreApps = structuredClone(DEFAULT_CORE_APPS);
      state.activeCoreAppId = state.coreApps[0]?.id || '';
      saveState();
      renderCoreApps();
      renderMetrics();
      toast('Core app dock reset.');
    });
    if ($('resetCoreAppFormBtn')) $('resetCoreAppFormBtn').addEventListener('click', () => fillCoreAppForm());
    if ($('coreAppForm')) $('coreAppForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const app = normalizeCoreApp({
        id: $('coreAppId').value || `core-custom-${Date.now().toString(36)}`,
        name: $('coreAppName').value,
        category: $('coreAppCategory').value,
        href: $('coreAppHref').value,
        mode: $('coreAppMode').value,
        notes: $('coreAppNotes').value
      });
      if (!app) {
        toast('Add a core app name and route first.', true);
        return;
      }
      const index = state.coreApps.findIndex((item) => item.id === app.id);
      if (index >= 0) state.coreApps[index] = app;
      else state.coreApps.unshift(app);
      state.activeCoreAppId = app.id;
      saveState();
      renderCoreApps();
      renderCoreAppPreview(app);
      fillCoreAppForm(app);
      toast('Core app shortcut saved.');
    });
    const handleCoreAppClick = (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const id = button.dataset.coreOpen || button.dataset.coreEdit || button.dataset.coreDelete;
      const app = state.coreApps.find((item) => item.id === id);
      if (!app) return;
      if (button.dataset.coreOpen) {
        renderCoreAppPreview(app);
        setView('core');
      }
      if (button.dataset.coreEdit) {
        fillCoreAppForm(app);
        setView('core');
      }
      if (button.dataset.coreDelete) {
        if (!confirm(`Remove ${app.name} from the core app dock?`)) return;
        state.coreApps = state.coreApps.filter((item) => item.id !== app.id);
        if (state.activeCoreAppId === app.id) state.activeCoreAppId = state.coreApps[0]?.id || '';
        saveState();
        renderCoreApps();
        renderMetrics();
      }
    };
    if ($('coreAppsGrid')) $('coreAppsGrid').addEventListener('click', handleCoreAppClick);
    if ($('pocketCoreAppDock')) $('pocketCoreAppDock').addEventListener('click', handleCoreAppClick);
    if ($('refreshRepoVaultBtn')) $('refreshRepoVaultBtn').addEventListener('click', refreshRepoVault);
    if ($('downloadFullRepoBackupBtn')) $('downloadFullRepoBackupBtn').addEventListener('click', downloadFullRepoBackup);
    if ($('downloadFullRepoBackupPanelBtn')) $('downloadFullRepoBackupPanelBtn').addEventListener('click', downloadFullRepoBackup);
    if ($('loadFullRepoDriveBtn')) $('loadFullRepoDriveBtn').addEventListener('click', loadFullRepoVaultDrive);
    if ($('downloadRepoVaultDriveBtn')) $('downloadRepoVaultDriveBtn').addEventListener('click', downloadRepoVaultDriveIndex);
    if ($('copyRepoVaultSummaryBtn')) $('copyRepoVaultSummaryBtn').addEventListener('click', () => copyText(repoVaultSummaryText()));
    if ($('repoVaultStreamGrid')) $('repoVaultStreamGrid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-repo-stream]');
      if (button) streamRepoVaultFile(button.dataset.repoStream);
    });
    if ($('repoVaultChunkGrid')) $('repoVaultChunkGrid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-repo-chunk]');
      if (button) streamRepoVaultChunk(button.dataset.repoChunk);
    });
    if ($('repoVaultProjectSearch')) $('repoVaultProjectSearch').addEventListener('input', () => renderRepoVault(state.repoVault || {}));
    if ($('repoVaultCommandList')) $('repoVaultCommandList').addEventListener('click', (event) => {
      const button = event.target.closest('[data-copy-command]');
      if (button) copyText(button.dataset.copyCommand || '');
    });
    $('copyIndexingLinksBtn').addEventListener('click', () => copyText(indexingSubmitText()));
    $('assetFileInput').addEventListener('change', (event) => handleFiles(Array.from(event.target.files || [])));
    ['dragenter', 'dragover'].forEach((type) => $('assetDropzone').addEventListener(type, (event) => {
      event.preventDefault();
      $('assetDropzone').classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach((type) => $('assetDropzone').addEventListener(type, (event) => {
      event.preventDefault();
      $('assetDropzone').classList.remove('dragover');
    }));
    $('assetDropzone').addEventListener('drop', (event) => handleFiles(Array.from(event.dataTransfer.files || [])));
    $('assetSearch').addEventListener('input', renderAssets);
    $('assetCategoryFilter').addEventListener('change', renderAssets);
    $('assetGrid').addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const asset = state.assets.find((item) => item.id === (button.dataset.assetDownload || button.dataset.assetCopy || button.dataset.assetTemplate || button.dataset.assetLogo || button.dataset.assetDelete));
      if (!asset) return;
      try {
        if (button.dataset.assetDownload) download(asset.name, await ensureAssetBlob(asset), asset.mime || 'application/octet-stream');
        if (button.dataset.assetCopy) await copyText(asset.sourcePath || asset.href || asset.name);
        if (button.dataset.assetTemplate) {
          const content = await textFromAsset(asset);
          const template = { id: `template-${slugify(asset.name)}-${Date.now().toString(36)}`, name: asset.name.replace(/\.[^.]+$/, ''), sourceFile: asset.name, content };
          state.templates.unshift(template);
          state.activeTemplateId = template.id;
          saveState();
          renderTemplates();
          setView('templates');
          toast('Intro template created.');
        }
        if (button.dataset.assetLogo) {
          const imageUrl = asset.href || await blobToDataUrl(await ensureAssetBlob(asset));
          state.founder.heroImageUrl = imageUrl || state.founder.heroImageUrl;
          if (/logo|emblem|deity/i.test(asset.name)) state.founder.logoUrl = imageUrl || state.founder.logoUrl;
          saveState();
          renderFounderForm();
          toast('Founder imagery updated.');
        }
        if (button.dataset.assetDelete) {
          if (!confirm('Delete this local upload?')) return;
          state.assets = state.assets.filter((item) => item.id !== asset.id);
          state.projects.forEach((project) => {
            project.selectedAssetIds = (project.selectedAssetIds || []).filter((id) => id !== asset.id);
          });
          await db.delete(asset.id);
          saveState();
          renderAll();
        }
      } catch (error) {
        toast(error.message || 'Asset action failed.', true);
      }
    });

    $('repoSearch').addEventListener('input', renderRepoMemory);
    $('repoMemoryList').addEventListener('click', (event) => {
      const row = event.target.closest('[data-repo-id]');
      if (!row) return;
      state.activeRepoMemoryId = row.dataset.repoId;
      renderRepoMemory();
    });
    $('copyRepoMemoryBtn').addEventListener('click', () => copyText($('repoReaderText').textContent));
    $('downloadRepoMemoryBtn').addEventListener('click', () => {
      const entry = state.repoMemory.find((item) => item.id === state.activeRepoMemoryId);
      if (entry) download(entry.name, entry.inlineText || '', entry.mime || 'text/plain;charset=utf-8');
    });

    $('cmdChatForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = $('cmdChatInput').value.trim();
      if (!message) return;
      showJson('cmdChatOutput', 'Running through /api/founder-command/chat...');
      const body = await commandApi('/api/founder-command/chat', { method: 'POST', body: { message } });
      if (!body.ok) return showJson('cmdChatOutput', body.error || body);
      const answer = body.answer || {};
      const links = (answer.links || []).map((link) => `${link.label}: ${link.href}`).join('\n');
      showJson('cmdChatOutput', [answer.text || 'Done.', links, (answer.next_actions || []).join(' ')].filter(Boolean).join('\n\n'));
    });
    $('cmdInboxForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formDataObject(event.currentTarget);
      if (!data.message?.trim()) return showJson('cmdInboxOutput', 'Message required.');
      showJson('cmdInboxOutput', 'Creating Relay13 conversation...');
      const body = await commandApi('/api/founder-command/inbox/conversations', { method: 'POST', body: data });
      showJson('cmdInboxOutput', body.ok ? { created: true, mode: body.mode, workspace: body.workspace, relay13: body.relay13 } : body);
    });
    $('cmdRecoveryForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formDataObject(event.currentTarget);
      data.backup_count = Number(data.backup_count || 8);
      data.ttl_minutes = 1440;
      data.max_uses = 1;
      data.recovery_type = data.surface || 'gate';
      data.code_type = 'emergency';
      showJson('cmdRecoveryOutput', 'Generating reveal-once recovery packet...');
      const body = await commandApi('/api/founder-command/recovery', { method: 'POST', body: data });
      showJson('cmdRecoveryOutput', body.ok ? { reveal_once: true, restore_key: body.reveal?.restore_key, reset_code: body.reveal?.reset_code, backup_codes: body.reveal?.backup_codes, expires_at: body.packet?.expires_at } : body);
    });
    $('refreshCalendarBtn').addEventListener('click', refreshCalendar);
    $('calendarForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formDataObject(event.currentTarget);
      data.create_live = event.currentTarget.querySelector('[name="create_live"]').checked;
      data.start_at = localDateTimeToIso(data.start_at);
      data.end_at = localDateTimeToIso(data.end_at);
      showJson('calendarOutput', 'Saving calendar item...');
      const body = await commandApi('/api/founder-command/calendar', { method: 'POST', body: data });
      showJson('calendarOutput', body.ok ? { live_event_created: body.live_event_created, status: body.record?.status, google_calendar: body.record?.google_calendar, provider: body.provider } : body);
      await refreshCalendar();
    });
    $('skyEmailForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formDataObject(event.currentTarget);
      showJson('skyEmailOutput', 'Provisioning SkyEmail notification mailbox...');
      const body = await commandApi('/api/founder-command/skyemail', { method: 'POST', body: data });
      showJson('skyEmailOutput', body.record || body);
      await refreshCommandStatus();
      await refreshSkyEmail();
    });
    $('mailboxOffboardingForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await runMailboxOffboarding('prepare');
    });
    $('refreshMailboxOffboardingBtn').addEventListener('click', refreshMailboxOffboarding);
    $('releaseMailboxOffboardingBtn').addEventListener('click', () => runMailboxOffboarding('release'));
    $('cancelMailboxOffboardingBtn').addEventListener('click', () => runMailboxOffboarding('cancel'));
    $('skyEmailHandoffForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await createSkyEmailHandoff('provision');
    });
    $('createMainSkyEmailWorkspaceBtn').addEventListener('click', () => createSkyEmailHandoff('main-0s'));
    $('refreshSkyEmailHandoffsBtn').addEventListener('click', refreshSkyEmailHandoffs);
    $('skyEmailHandoffList').addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const openId = button.dataset.handoffOpen;
      const sendId = button.dataset.handoffSend;
      if (sendId) return sendSkyEmailHandoff(sendId);
      if (openId) {
        const body = await commandApi(`/api/founder-command/skyemail/handoffs?id=${encodeURIComponent(openId)}`);
        showJson('skyEmailHandoffOutput', body.record || body);
        if (body.record) renderSkyEmailHandoff(body.record);
      }
    });

    $('founderForm').addEventListener('submit', (event) => {
      event.preventDefault();
      state.founder = {
        companyName: $('companyName').value.trim(),
        founderName: $('founderName').value.trim(),
        founderTitle: $('founderTitle').value.trim(),
        email: $('founderEmail').value.trim(),
        phone: $('founderPhone').value.trim(),
        website: $('founderWebsite').value.trim(),
        logoUrl: $('founderLogoUrl').value.trim(),
        heroImageUrl: $('founderHeroImageUrl').value.trim(),
        headline: $('founderHeadline').value.trim(),
        bio: $('founderBio').value.trim(),
        story: $('founderStory').value.trim(),
        ctaLabel: $('founderCtaLabel').value.trim(),
        ctaHref: $('founderCtaHref').value.trim(),
        footerBlurb: $('founderFooterBlurb').value.trim()
      };
      saveState();
      renderFounderPreview();
      toast('Founder layer saved.');
    });
    $('copyFounderSectionBtn').addEventListener('click', () => copyText(founderSectionSnippet(state.founder)));
    $('downloadFounderPageBtn').addEventListener('click', () => download('founder-page.html', founderPageHtml(state.founder), 'text/html;charset=utf-8'));

    $('projectName').addEventListener('input', () => {
      if (!$('projectSlug').dataset.touched) $('projectSlug').value = slugify($('projectName').value);
    });
    $('projectSlug').addEventListener('input', () => {
      $('projectSlug').dataset.touched = 'true';
    });
    $('projectForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const id = $('projectId').value || `project-${Date.now().toString(36)}`;
      const existing = state.projects.find((project) => project.id === id);
      const project = {
        id,
        name: $('projectName').value.trim(),
        slug: $('projectSlug').value.trim() || slugify($('projectName').value),
        description: $('projectDescription').value.trim(),
        introTemplateId: $('projectIntroTemplate').value,
        notes: $('projectNotes').value.trim(),
        includeFounderPage: $('includeFounderPage').checked,
        includeFounderSection: $('includeFounderSection').checked,
        includeFooterSnippet: $('includeFooterSnippet').checked,
        selectedSnippetIds: existing?.selectedSnippetIds || [],
        selectedAssetIds: existing?.selectedAssetIds || []
      };
      const index = state.projects.findIndex((item) => item.id === id);
      if (index >= 0) state.projects[index] = project;
      else state.projects.unshift(project);
      state.activeProjectId = id;
      saveState();
      renderProjects();
      fillProjectForm(project);
      toast('Project saved.');
    });
    $('resetProjectFormBtn').addEventListener('click', () => {
      $('projectSlug').dataset.touched = '';
      fillProjectForm();
    });
    $('projectList').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const id = button.dataset.projectSelect || button.dataset.projectEdit || button.dataset.projectExport || button.dataset.projectDelete;
      const project = state.projects.find((item) => item.id === id);
      if (!project) return;
      if (button.dataset.projectSelect) {
        state.activeProjectId = id;
        saveState();
        renderAssignmentPanel();
      }
      if (button.dataset.projectEdit) {
        state.activeProjectId = id;
        fillProjectForm(project);
        renderAssignmentPanel();
      }
      if (button.dataset.projectExport) {
        download(`${project.slug || slugify(project.name)}-project-bundle.json`, JSON.stringify(projectBundle(id), null, 2), 'application/json;charset=utf-8');
      }
      if (button.dataset.projectDelete) {
        if (!confirm('Delete this project?')) return;
        state.projects = state.projects.filter((item) => item.id !== id);
        if (state.activeProjectId === id) state.activeProjectId = state.projects[0]?.id || '';
        saveState();
        renderProjects();
      }
    });
    $('projectAssignmentPanel').addEventListener('change', (event) => {
      const project = state.projects.find((item) => item.id === state.activeProjectId);
      if (!project) return;
      const assetId = event.target.dataset.assignAsset;
      const snippetId = event.target.dataset.assignSnippet;
      if (assetId) {
        project.selectedAssetIds = project.selectedAssetIds || [];
        if (event.target.checked && !project.selectedAssetIds.includes(assetId)) project.selectedAssetIds.push(assetId);
        if (!event.target.checked) project.selectedAssetIds = project.selectedAssetIds.filter((id) => id !== assetId);
      }
      if (snippetId) {
        project.selectedSnippetIds = project.selectedSnippetIds || [];
        if (event.target.checked && !project.selectedSnippetIds.includes(snippetId)) project.selectedSnippetIds.push(snippetId);
        if (!event.target.checked) project.selectedSnippetIds = project.selectedSnippetIds.filter((id) => id !== snippetId);
      }
      saveState();
      renderProjects();
    });

    $('templateList').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const id = button.dataset.templateOpen || button.dataset.templateDownload;
      const template = state.templates.find((item) => item.id === id);
      if (!template) return;
      if (button.dataset.templateOpen) loadTemplate(id);
      if (button.dataset.templateDownload) download(`${slugify(template.name)}.html`, template.content || '', 'text/html;charset=utf-8');
    });
    $('saveTemplateEditsBtn').addEventListener('click', () => {
      const template = state.templates.find((item) => item.id === state.activeTemplateId);
      if (!template) return;
      template.content = $('templateEditor').value;
      $('templatePreview').srcdoc = template.content;
      saveState();
      toast('Template saved.');
    });
    $('copyTemplateBtn').addEventListener('click', () => copyText($('templateEditor').value));
    $('downloadTemplateBtn').addEventListener('click', () => {
      const template = state.templates.find((item) => item.id === state.activeTemplateId);
      if (template) download(`${slugify(template.name)}.html`, $('templateEditor').value, 'text/html;charset=utf-8');
    });

    $('snippetForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const id = $('snippetId').value || `snippet-${Date.now().toString(36)}`;
      const snippet = { id, name: $('snippetName').value.trim(), type: $('snippetType').value, code: $('snippetCode').value };
      const index = state.snippets.findIndex((item) => item.id === id);
      if (index >= 0) state.snippets[index] = snippet;
      else state.snippets.unshift(snippet);
      saveState();
      renderSnippets();
      fillSnippetForm(snippet);
      toast('Block saved.');
    });
    $('snippetList').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const id = button.dataset.snippetEdit || button.dataset.snippetCopy || button.dataset.snippetDelete;
      const snippet = state.snippets.find((item) => item.id === id);
      if (!snippet) return;
      if (button.dataset.snippetEdit) fillSnippetForm(snippet);
      if (button.dataset.snippetCopy) copyText(snippet.code || '');
      if (button.dataset.snippetDelete) {
        if (!confirm('Delete this block?')) return;
        state.snippets = state.snippets.filter((item) => item.id !== id);
        state.projects.forEach((project) => {
          project.selectedSnippetIds = (project.selectedSnippetIds || []).filter((snippetId) => snippetId !== id);
        });
        saveState();
        renderSnippets();
        renderProjects();
      }
    });
    $('copySnippetBtn').addEventListener('click', () => copyText($('snippetCode').value));
    $('downloadSnippetBtn').addEventListener('click', () => download(`${slugify($('snippetName').value || 'block')}.html`, $('snippetCode').value, 'text/html;charset=utf-8'));
    $('resetSnippetBtn').addEventListener('click', () => fillSnippetForm());

    $('clearLocalCacheBtn').addEventListener('click', async () => {
      if (!confirm('Clear local uploads from this browser?')) return;
      await db.clear();
      state.assets = state.assets.filter((asset) => !asset.localUpload);
      saveState();
      renderAll();
      toast('Local uploads cleared.');
    });
  }

  async function registerFounderPwa() {
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'service_worker_unsupported' };
    try {
      const registration = await navigator.serviceWorker.register('/founder-command/service-worker.js', { scope: '/founder-command/' });
      return { ok: true, scope: registration.scope };
    } catch (error) {
      console.warn('Founder Command PWA registration failed', error);
      return { ok: false, error: error?.message || 'service_worker_registration_failed' };
    }
  }

  function renderAll() {
    renderRoutes(state.valleyVerifiedRoutes.map((route) => ({ label: route.business_name, href: route.public_url, kind: 'Valley Verified SkyeNet' })));
    renderCoreApps();
    renderAssets();
    renderSongVault();
    renderValleyVerifiedShowroom();
    renderClientCredentials();
    renderRepoMemory();
    renderFounderForm();
    renderProjects();
    renderTemplates();
    renderSnippets();
    fillSnippetForm();
    renderIndexing();
    renderRepoVault();
    renderCompanyOps();
    renderMetrics();
  }

  async function boot() {
    await db.init();
    loadState();
    await loadValleyVerifiedRoutes();
    bindEvents();
    renderAll();
    const pwaRegistration = await registerFounderPwa();
    updateFounderPwaInstallButton(pwaRegistration.ok ? 'PWA Ready' : 'Install PWA', false);
    const requestedView = new URLSearchParams(location.search).get('view') || state.activeView || 'command';
    const allowedViews = ['command', 'operations', 'core', 'calendar', 'mailboxes', 'clients', 'indexing', 'assets', 'songs', 'repo-vault', 'repo', 'skyenet', 'projects', 'founder', 'templates', 'blocks', 'backup'];
    setView(allowedViews.includes(requestedView) ? requestedView : 'command');
    await refreshCommandStatus();
    await Promise.allSettled([refreshCompanyOps(), refreshFounderActions(), refreshCalendar(), refreshSkyEmail(), refreshSkyEmailPocket(), refreshSkyEmailHandoffs(), refreshRepoVault()]);
    setStatus(`Ready. Real repo assets, song vault copies, safe repo memory, and client packs are loaded.${pwaRegistration.ok ? ' PWA service worker registered.' : ''}`);
  }

  boot().catch((error) => {
    console.error(error);
    toast(error.message || 'Founder Command failed to boot.', true);
  });
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
