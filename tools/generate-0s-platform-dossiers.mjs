#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'marketing', 'metraiyux-0s');
const dossierDir = path.join(siteRoot, 'platform-dossiers');
const canonicalDomain = 'https://metraiyux-0s-marketing.pages.dev';
const today = new Date().toISOString().slice(0, 10);

const sharedTruths = [
  'Runs as part of the 0S operating model, not as a loose side project.',
  'Uses the shared FS27/SkyGate/Free99 gate posture when mounted into the 0S.',
  'Needs proof receipts, owner visibility, and cost boundaries before it is sold as unlimited.',
  'Can be positioned strongly without pretending third-party primitives do not exist behind the scenes.'
];

const sharedCompetitorFrame = [
  ['Point tools', 'Better when someone needs one narrow task and does not care about cross-platform receipts.'],
  ['Horizontal SaaS suites', 'Better when a buyer wants a familiar vendor bundle more than ownership, auditability, or custom lanes.'],
  ['MetrAIyux 0S lane', 'Stronger when the buyer needs gate-owned identity, payments, proof, workflow, content, database, and deployment context in one operating system.']
];

const platforms = [
  {
    slug: 'skyenet',
    name: 'SkyeNet',
    emoji: '🚀',
    category: 'Deployment / hosting',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/index.html',
    pain: 'Deploy platforms are powerful until an extension, plugin, or marketplace dependency gets between the builder and the production surface.',
    founder: 'I made SkyeNet because I had a real production-breaking experience with a ghost extension from an approved extension list. I downloaded it, a lot of nonsense followed, it installed across sites, and I could not cleanly delete it when I needed to. I am not saying Netlify is a bad company. I have used them, I still respect them, and I still pay for tools when they help. But as my client base and the 0S grew, I needed an in-house lane where I could drop a build, route it, observe it, cap it, and answer for it without waiting on somebody else to credit me or unwind their marketplace mess.',
    does: ['Browser folder drop for static builds', 'Build-root promotion for dist/build/out/public', 'SkyeNet route registry and live URL return', 'Managed/signed function lane with honest isolation boundary'],
    proof: ['Live SkyeNet console', 'R2-backed asset routes', 'FS27 route resolver receipts', 'Production browser proof for real folder drops'],
    competitors: [['Netlify / Vercel', 'Excellent hosted deployment products. SkyeNet wins when 0S needs owned route receipts, internal caps, and no customer-facing split between provider and platform.'], ['Cloudflare Pages', 'Powerful primitive. SkyeNet wraps the primitive in 0S auth, SkyePay, route receipts, and customer workspace controls.'], ['Self-hosted VPS deploys', 'Maximum ownership but more ops. SkyeNet keeps the edge lane live now while reserving sovereign isolated runtime for arbitrary code.']],
    truths: ['Static/self-service deploy is real now.', 'Unrestricted hostile uploaded functions remain the sovereign isolate/runtime phase.', 'Cloudflare can back the lane without customer-facing copy splitting Cloudflare from SkyeNet.']
  },
  {
    slug: 'skyemail',
    name: 'SkyeMail',
    emoji: '📧',
    category: 'Email / inbox',
    liveUrl: 'https://skyemail-platform.graylondonskyes.workers.dev/',
    pain: 'Business email usually stops at an inbox, while the actual work lives in replies, routing, proof, aliases, drafts, and account recovery.',
    founder: 'I did not want email to be a random paid mailbox sitting outside the company system. SkyeMail exists because communication is operational evidence. If a customer signs up, replies, asks for help, gets routed to a workspace, or needs a proof trail, that should live with the 0S instead of being trapped in a separate app I cannot observe.',
    does: ['Hosted mailbox lane', 'Inbox import and reply routing', 'Alias/contact/thread metadata', 'Citadel/FS27 backup receipts'],
    proof: ['Provider-backed inbox proof', 'Worker-hosted live proof page', 'Outbound send lane', 'Scheduled sync posture'],
    competitors: [['Google Workspace / Microsoft 365', 'Great general office suites. SkyeMail is stronger when email must connect to 0S proof, aliases, customer workspaces, and owner-visible receipts.'], ['Resend / Postmark', 'Excellent developer email APIs. SkyeMail turns send/receive into a business inbox product lane.'], ['Zoho Mail', 'Useful hosted mailbox infrastructure. SkyeMail wraps provider mail in the 0S operating context.']],
    truths: ['Advertise free business email only with clear caps and provider-backed proof.', 'Do not claim a magical mailbox if provider sync or DNS is not ready for a domain.', 'The value is not just inbox UI; it is inbox plus 0S routing.']
  },
  {
    slug: 'skyepay',
    name: 'SkyePay',
    emoji: '💳',
    category: 'Payments / activation',
    liveUrl: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/store?client=metraiyux-0s',
    pain: 'Payments often happen in one system while activation, approval, entitlements, and delivery happen somewhere else.',
    founder: 'I built SkyePay because money without activation logic is just a receipt pile. The 0S needed checkout that could respect owner approval, Free99 boundaries, product truth, Stripe lookup keys, and the actual platform lane being sold.',
    does: ['Stripe-backed product catalog', 'Owner-approved activation', 'SkyeMerit discount posture', 'Receivable and checkout receipts'],
    proof: ['Live store', 'Stripe product/price sync', 'Checkout handoff proof', 'SkyeCommerce/SkyeNet product mapping'],
    competitors: [['Stripe Checkout', 'The core payment rail. SkyePay adds 0S offer mapping, approval gates, and internal product truth.'], ['Gumroad / Lemon Squeezy', 'Simple sales surfaces. SkyePay is stronger when checkout must activate a private platform workspace.'], ['Shopify payments', 'Great commerce checkout. SkyePay is built for 0S platform products, not only carts.']],
    truths: ['Every sellable platform needs a product and price behind it.', 'Free99 is a gated offer posture, not uncapped infrastructure charity.', 'Checkout does not equal activation until the platform lane records it.']
  },
  {
    slug: 'citadeldb',
    name: 'CitadelDB',
    emoji: '🗄️',
    category: 'Database / data custody',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/citadeldb/health',
    pain: 'App builders talk about ownership, then leave the database, sync story, and developer access as someone else’s problem.',
    founder: 'CitadelDB is my answer to the moment where a platform has to stop depending on vibes and start knowing where its data is, how it moves, who can touch it, and what happens if the upstream service changes terms or goes down.',
    does: ['Cloudflare D1 Citadel lane', 'Neon-to-Citadel sync posture', 'Developer database URL lane', 'Safe query and write boundaries'],
    proof: ['Citadel adapter tests', 'D1 database binding', 'Gated dev URL proof', 'Runtime matrix behind owner gate'],
    competitors: [['Supabase / Neon', 'Excellent managed Postgres products. CitadelDB is the 0S-controlled continuity lane and operator-facing data product.'], ['Firebase', 'Fast app backend. CitadelDB is stronger for SQL posture, migration stories, and owner-readable operations.'], ['Self-hosted Postgres', 'Deep ownership. CitadelDB keeps edge/D1 usefulness while preserving the path to private Postgres.']],
    truths: ['CitadelDB on Cloudflare is real as an edge database lane.', 'Private Postgres remains the deeper sovereignty lane when workloads demand it.', 'Developer access must stay tokenized, logged, and revocable.']
  },
  {
    slug: 'skyemusicnexus',
    name: 'SkyeMusicNexus',
    emoji: '🎧',
    category: 'Music / creator operations',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/',
    pain: 'Artists get scattered across link pages, DSP dashboards, Google Drives, stores, rights spreadsheets, and social posts with no one operating layer.',
    founder: 'I built MusicNexus because artists need more than a page with buttons. They need a drop room, a rights vault, a store, a brain, a player, a feed, campaign proof, and a way for the business side to stop being invisible.',
    does: ['Artist profiles and landing surfaces', 'Release/drop rooms and upload studio', 'Store, brain, feed, SkyeMeter, giveaway lanes', 'Rights, records, analytics, and operator stage'],
    proof: ['Stress-backed workflow actions', 'Live browser store/brain proof', 'SkyePay checkout intent proof', 'Artist universe builds mounted into 0S'],
    competitors: [['Linktree / Beacons', 'Good link hubs. MusicNexus is a full artist operations stack.'], ['Bandcamp / Shopify', 'Good sales surfaces. MusicNexus connects sales to drops, rights, proof, and 0S workspace context.'], ['DistroKid / TuneCore', 'Distribution tools. MusicNexus does not pretend to be a DSP distributor; it owns the artist business layer around releases.']],
    truths: ['Do not claim formal DSP distribution without provider proof.', 'The strength is artist ops, proof, storefronts, and content systems.', 'Artist pages should be actual universes, not thin one-page regressions.']
  },
  {
    slug: 'skyecommerce',
    name: 'SkyeCommerce',
    emoji: '🛒',
    category: 'Commerce / storefront OS',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/',
    pain: 'Commerce platforms handle carts, but the real business also needs docs, payouts, provider evidence, developer apps, returns, risk, and platform-fee truth.',
    founder: 'SkyeCommerce exists because I do not just want a store. I want commerce that knows the merchant, the documents, the app marketplace, the payment loop, the risk trail, and the 0S gate that owns access.',
    does: ['Storefront and merchant console', 'SkyPay commerce loop', 'SovereignDocs commerce kits', 'Provider, settlement, app, return, and risk lanes'],
    proof: ['Mounted 0S commerce platform', 'D1 commerce database binding', 'SkyPay loop stress', 'Production browser smoke scripts'],
    competitors: [['Shopify', 'The commerce heavyweight. SkyeCommerce is stronger when commerce must live inside the 0S with docs, apps, proof, and owner-controlled payments.'], ['WooCommerce', 'Flexible plugin commerce. SkyeCommerce reduces plugin sprawl by making ops lanes first-party.'], ['Medusa / Saleor', 'Developer commerce frameworks. SkyeCommerce is a working 0S lane, not just a backend starter.']],
    truths: ['Commerce is not complete until payment state and delivery state match.', 'Marketplace/app revenue needs clear settlement boundaries.', 'Provider integrations need proof before public copy implies total parity.']
  },
  {
    slug: 'sovereigndocs',
    name: 'SovereignDocs',
    emoji: '📄',
    category: 'Documents / self-help workflows',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/sovereigndocs/',
    pain: 'People need documents, but generic templates do not explain source boundaries, export paths, review queues, or what is not legal advice.',
    founder: 'SovereignDocs is me refusing to sell mystery documents. It gives people structured document work, official-source prep, review lanes, vault records, and honest boundaries so the product helps without pretending to be a law firm.',
    does: ['Template and packet workflows', 'Official-source prep', 'Workspace/vault/review rooms', 'SkyeDocxMax handoff'],
    proof: ['Separate Pages lane plus 0S mount', 'Gated persistence routes', 'Term-help browser proof', 'Official workflow packet APIs'],
    competitors: [['LegalZoom / Rocket Lawyer', 'Recognized legal document brands. SovereignDocs wins inside 0S when document work must connect to vaults, workspaces, and proof.'], ['DocuSign templates', 'Strong signing ecosystem. SovereignDocs is about preparation, packets, and operating context.'], ['Google Docs templates', 'Easy starting point. SovereignDocs adds governance and boundary language.']],
    truths: ['It is self-help document automation, not legal advice.', 'Official-source prep must say when a source has not been submitted.', 'Partner review and attorney paths must stay clearly separated.']
  },
  {
    slug: 'skyedocxmax',
    name: 'SkyeDocxMax',
    emoji: '📝',
    category: 'Private document editor',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeDocxMax/',
    pain: 'Online editors are convenient until the document is sensitive, offline, recoverable, packaged, or tied to a private vault workflow.',
    founder: 'SkyeDocxMax is the document room I wanted inside the 0S: private drafting, local packages, exports, vault push, and enough editor power to support SovereignDocs, SkyeMail compose, and internal business packets.',
    does: ['Offline-first document editing', 'Package import/export', 'Vault bridge', 'Templates, exports, editor return logs'],
    proof: ['SkyeVaultPro bridge proof', 'SovereignDocs integration proof', 'Static PWA proof', '0S shared gate posture'],
    competitors: [['Google Docs / Microsoft Word Online', 'Great collaborative editors. SkyeDocxMax is stronger for private local packages and 0S vault workflows.'], ['Notion', 'Great workspace docs. SkyeDocxMax focuses on documents, exports, and packages.'], ['OnlyOffice / LibreOffice', 'Powerful editors. SkyeDocxMax is lighter and built into the 0S.']],
    truths: ['Offline-first does not mean cloud backup is free or automatic.', 'Sensitive document claims need vault and encryption proof.', 'Editor features should serve workflows, not become a bloated clone.']
  },
  {
    slug: 'skyewebcreatormax',
    name: 'SkyeWebCreatorMax',
    emoji: '🎨',
    category: 'Web creation / builder',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/',
    pain: 'Website builders help make pages, but the finished work still needs proof, deployment, review, delivery, and a real business lane.',
    founder: 'SkyeWebCreatorMax is the builder side of the 0S. I need the creation tool to know the client, the brief, the preview, the delivery packet, and the SkyeNet publish path.',
    does: ['Website and app-shell builder', 'Builder workspace and previews', 'Delivery/handoff lanes', 'Future SkyeNet publish handoff'],
    proof: ['Mounted Marketing Made Easy subplatform', 'Builder/preview/delivery routes in 0S', 'Shared gate model', 'MCP design tooling connection'],
    competitors: [['Wix / Squarespace', 'Fast website builders. SkyeWebCreatorMax wins when generated work must become a 0S/SkyeNet-delivered asset.'], ['Webflow', 'Strong visual builder. SkyeWebCreatorMax focuses on operator handoff and ecosystem context.'], ['Framer', 'Polished sites. SkyeWebCreatorMax is built for business ops around the site.']],
    truths: ['Generated sites need QA before customer handoff.', 'SkyeNet publishing should be the default end state.', 'The builder should not hide broken scripts behind pretty previews.']
  },
  {
    slug: 'marketing-made-easy',
    name: 'Marketing Made Easy',
    emoji: '📣',
    category: 'Marketing operations suite',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/',
    pain: 'Small businesses buy scattered marketing tasks and end up with no operating system for leads, proofs, campaigns, or follow-up.',
    founder: 'Marketing Made Easy is the suite that turns marketing from random deliverables into rooms: AE flow, brand kits, launch packs, web growth, content, and payment activation.',
    does: ['Growth suite shell', 'AE/vendor onboarding', 'Brand and launch tools', 'WebGrowthOperator and content engines'],
    proof: ['Mounted 0S platform health', 'AE vendor packet proof', 'Platform manifest', 'SkyePay activation routes'],
    competitors: [['GoHighLevel', 'Strong agency CRM/marketing suite. Marketing Made Easy is stronger when the whole 0S owns auth, proof, payments, and custom app lanes.'], ['HubSpot', 'Powerful CRM. Marketing Made Easy is lighter and founder-operated for direct delivery.'], ['Canva / Mailchimp', 'Great creation and campaign tools. This suite binds creation to operations.']],
    truths: ['Marketing promises need receipts and owner approval.', 'Free99 access must still be gated.', 'The suite should sell outcomes, not random screens.']
  },
  {
    slug: 'webgrowthoperator',
    name: 'WebGrowthOperator',
    emoji: '🌱',
    category: 'Local web growth',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/WebGrowthOperator/',
    pain: 'Local businesses get SEO pages, ads, missed-call tools, and reports from different vendors with no unified operating loop.',
    founder: 'WebGrowthOperator is how I package local web growth as operations: content, tracking, service pages, intake, pricing, proof, and follow-up all in one path.',
    does: ['Local SEO and service pages', 'Lead intake and client routing', 'Content engine articles', 'SkyePay-ready web growth offers'],
    proof: ['Service pages generated', 'Indexing files and sitemaps', 'Pricing and intake pages', 'Marketing site integration'],
    competitors: [['Local SEO agencies', 'Good at service delivery. WebGrowthOperator packages the actual system and proof.'], ['WordPress SEO stacks', 'Flexible but plugin-heavy. WebGrowthOperator is controlled inside 0S.'], ['Call-tracking tools', 'Useful signals. This lane turns signals into operating tasks.']],
    truths: ['SEO outcomes need time and proof.', 'Service pages should be original and source-aware.', 'Growth ops must connect to contact routing.']
  },
  {
    slug: 'ae-flowpro',
    name: 'AE-FlowPro',
    emoji: '📞',
    category: 'Sales / account execution',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/AE-FlowPro/',
    pain: 'Sales dies in the follow-up gap: prospects, offers, objections, next steps, and proof get spread across memory and messages.',
    founder: 'AE-FlowPro is the room for account movement. It keeps the offer, follow-up, close path, recovery journal, and proof in front of the operator.',
    does: ['Lead flow and offer queue', 'Follow-up rail', 'Close path and recovery journal', 'Activation packs and snapshots'],
    proof: ['P1 smoke scripts', 'Mounted 0S routes', 'Platform truth file', 'Marketing Made Easy integration'],
    competitors: [['Pipedrive / HubSpot Sales', 'Strong sales CRMs. AE-FlowPro is a focused operator room inside the 0S.'], ['Spreadsheets', 'Flexible but fragile. AE-FlowPro keeps movement and proof visible.'], ['Calendar/task apps', 'Useful reminders. AE-FlowPro connects reminders to offers.']],
    truths: ['It is not a magic closer.', 'It works when the operator records movement.', 'Proof and next action matter more than dashboards.']
  },
  {
    slug: 'businesslaunchgo',
    name: 'BusinessLaunchGo',
    emoji: '🏁',
    category: 'Business launch packs',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/BusinessLaunchGo/',
    pain: 'New businesses need a practical launch packet, not twenty tabs of half-finished startup advice.',
    founder: 'BusinessLaunchGo is my launch-room answer: gather the basic info, generate a usable packet, export it, and give the business a clean next step.',
    does: ['Arizona launch pack generator', 'Browser-local packs', 'PDF/ZIP export posture', 'Runtime records and hooks'],
    proof: ['P1 smoke proof', 'Runtime contract', 'PWA/static assets', 'Marketing Made Easy product lane'],
    competitors: [['State business portals', 'Official but fragmented. BusinessLaunchGo helps organize the prep.'], ['Incfile / LegalZoom', 'Formation products. BusinessLaunchGo is a launch operating packet, not a filing substitute.'], ['Startup checklists', 'Helpful but passive. This lane creates artifacts.']],
    truths: ['Do not imply official filing unless the filing route is truly integrated.', 'Launch packs still need owner review.', 'Local/state details must stay source-aware.']
  },
  {
    slug: 'brandid-offline-pwa',
    name: 'BrandID Offline PWA',
    emoji: '🪪',
    category: 'Brand identity / offline PWA',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/BrandID-Offline-PWA/',
    pain: 'Brand work often lives in cloud files, screenshots, and scattered notes when a business needs a portable identity packet.',
    founder: 'BrandID Offline PWA is for the client who needs a starter identity they can use, export, and carry even before the full design system exists.',
    does: ['Offline brand identity generator', 'SVG/export posture', 'Outbox controls', 'Handoff packets'],
    proof: ['Static proof smoke', 'PWA service worker', 'Platform truth', 'Marketing Made Easy mount'],
    competitors: [['Canva', 'Great design tool. BrandID PWA is a focused packet generator inside 0S.'], ['Looka / Tailor Brands', 'Fast logo generation. BrandID emphasizes ownership and handoff.'], ['Figma templates', 'Flexible. BrandID is operational and offline-first.']],
    truths: ['Starter identity is not full brand strategy.', 'Generated marks need human review before major spend.', 'Offline does not remove the need for backups.']
  },
  {
    slug: 'kaixu-brandkit',
    name: 'kAIxU BrandKit',
    emoji: '🧬',
    category: 'Brand system / handoff',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/kAIxUBrandKit/',
    pain: 'Brands lose consistency because voice, assets, campaign ideas, proof decks, and handoffs live in disconnected files.',
    founder: 'kAIxU BrandKit is the brand memory room. It is where the style, voice, offer, and campaign assets stop floating around and become an operating kit.',
    does: ['Brand system and voice board', 'Asset and campaign kit', 'Proof deck posture', 'Studio handoff runtime'],
    proof: ['Platform truth file', 'Mounted Marketing Made Easy lane', 'Smoke-backed handoff runtime', 'Marketing asset integration'],
    competitors: [['Brandfolder / Frontify', 'Strong brand asset platforms. kAIxU BrandKit is lighter and tied to 0S campaign operations.'], ['Canva brand kits', 'Useful creation layer. This lane focuses on handoff and proof.'], ['Notion brand docs', 'Flexible notes. BrandKit gives a productized room.']],
    truths: ['Brand systems only work when they are used in delivery.', 'Assets need version discipline.', 'A brand kit should guide campaigns, not just store logos.']
  },
  {
    slug: 'client-app-factory',
    name: 'Client App Factory',
    emoji: '🏭',
    category: 'Client apps / generation',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/',
    pain: 'Custom apps are usually too slow or too expensive for small businesses, while cheap landing pages do not run real workflows.',
    founder: 'Client App Factory is where I turn a business need into a routeable app surface: intake, proof, Valley handoff, SkyePay, and deployment context instead of a disposable mockup.',
    does: ['Client intake and app build routing', 'Valley import/run posture', 'Generated app surfaces', 'Payment/proof connection'],
    proof: ['Mounted 0S adapter', 'Factory run proof', 'Health route', 'Valley/client proof surfaces'],
    competitors: [['Bubble / Glide', 'Great no-code builders. Client App Factory is stronger when the app is part of 0S delivery and proof.'], ['Custom agencies', 'Deep builds. Factory speeds starter lanes.'], ['Landing page builders', 'Good for pages. Factory targets workflows.']],
    truths: ['Generated apps must be labeled honestly until client-specific proof exists.', 'Payment/activation matters.', 'Factory output needs browser QA before public claims.']
  },
  {
    slug: 'valley-verified',
    name: 'Valley Verified',
    emoji: '🏜️',
    category: 'Local business network',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/',
    pain: 'Local business directories usually list a business, then disappear before the business gets claims, content, proof, or a real app path.',
    founder: 'Valley Verified is the local visibility network I needed for Phoenix businesses: free public presence, source-aware profiles, claim paths, client build bridges, and proof that the business can graduate into a real 0S app.',
    does: ['Public business profiles', 'Claim and upgrade posture', 'Client app-build lane', 'Local content network'],
    proof: ['Valley live routes', 'Business profile rendering', 'Longform insights proof', 'Client build examples'],
    competitors: [['Yelp / Google Business Profile', 'Massive discovery platforms. Valley Verified is local, operator-owned, and connected to app builds.'], ['Chambers/directories', 'Community trust. Valley adds digital workflow and claim paths.'], ['Agency landing pages', 'Custom but isolated. Valley links listings to 0S products.']],
    truths: ['Free pages should not imply business ownership if unclaimed.', 'Generated previews must be labeled clearly.', 'Local trust requires source and correction paths.']
  },
  {
    slug: 'northstar-signinpro',
    name: 'NorthStar SignInPro',
    emoji: '🧭',
    category: 'Auth / onboarding',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html',
    pain: 'Every app wants its own login, then the company ends up with account chaos, duplicate passwords, and no single owner session.',
    founder: 'NorthStar SignInPro is the shared entry point. I do not want every mounted app inventing a new owner password. The 0S needs one gate-owned identity lane that can hand users into the right workspace.',
    does: ['Shared sign-in surface', 'Workspace routing', 'Gate session handoff', 'Valley business workspace handoffs'],
    proof: ['Mounted 0S app and API', 'FS27 workspace provisioning', 'Gate-owned MCP access', 'NorthStar proof receipts'],
    competitors: [['Auth0 / Clerk', 'Excellent auth platforms. NorthStar is the 0S-owned workflow gate, not a general auth vendor.'], ['Firebase Auth', 'Fast app auth. NorthStar focuses on shared platform sessions.'], ['App-local passwords', 'Simple at first. NorthStar avoids long-term credential sprawl.']],
    truths: ['Mounted apps must not create app-local admin passwords.', 'Shared gate auth is a product boundary.', 'Workspace handoff must be observable.']
  },
  {
    slug: 'quantumskyes-mcp',
    name: 'QuantumSkyes MCP',
    emoji: '🛠️',
    category: 'MCP / design tooling',
    liveUrl: 'https://skye-design-mcp.pages.dev/use-mcp.html',
    pain: 'Design and build context gets trapped on one machine, while AI tools keep guessing at patterns, assets, and proof rules.',
    founder: 'QuantumSkyes MCP is how I stop agents from freelancing the brand. It exposes the design resources, recipes, tools, and proof workflow so the builder can mine the target before changing it.',
    does: ['Local and remote MCP access', 'Design resource catalog', 'World-building/operator console', 'Proof/mining receipts'],
    proof: ['Remote MCP health', 'Gate-owned auth proof', 'MCP mining receipts', 'Operator console routes'],
    competitors: [['Generic MCP servers', 'Useful plumbing. QuantumSkyes is tailored to the 0S design system and proof discipline.'], ['Design systems in docs', 'Readable but passive. MCP makes patterns callable.'], ['AI coding agents alone', 'Fast but risky. MCP gives them context and constraints.']],
    truths: ['Remote MCP is gate-owned for protocol access.', 'Do not commit or print bearer tokens.', 'Mining receipts should exist before major redesigns.']
  },
  {
    slug: 'skyevault-drop',
    name: 'SkyeVault Drop',
    emoji: '🔐',
    category: 'Vault / repo custody',
    liveUrl: 'https://skyevault-drop.graylondonskyes.workers.dev/',
    pain: 'Developer work disappears in local machines, broken IDEs, missing backups, ignored secrets, and manual zip habits.',
    founder: 'SkyeVault Drop is the answer to losing work. If the code matters, it needs encrypted custody, delta journals, recovery receipts, and a way to prove what was saved without pretending failure cannot happen.',
    does: ['Encrypted upload/recovery posture', 'Repo rescue daemon', 'Delta journal and bin packs', 'Client vault lane'],
    proof: ['Autosync proof receipts', 'Vault deployment proof', 'Agent install page', 'Recovery/control upload receipts'],
    competitors: [['GitHub / GitLab', 'Core source control. SkyeVault Drop focuses on custody, recovery, and operator proof around the repo.'], ['Dropbox/Drive', 'File sync. SkyeVault adds source-aware exclusions and receipts.'], ['Manual zips', 'Fast but fragile. Vault Drop makes recovery auditable.']],
    truths: ['No backup story is perfect.', 'Secrets need explicit exclusion and custody rules.', 'Recovery proof matters more than comfort copy.']
  },
  {
    slug: 'skyevaultpro',
    name: 'SkyeVaultPro',
    emoji: '🧳',
    category: 'Personal vault / Free99',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/skyevaultpro/',
    pain: 'Personal files, documents, backups, and profile data need a private vault that does not immediately become a paid cloud trap.',
    founder: 'SkyeVaultPro is the user-facing vault room: local-first, practical, connected to SkyeDocxMax, and honest about when hosted backup is paid.',
    does: ['Offline-first vault', 'Drive/founder/docx routes', 'SkyeDocxMax bridge', 'Hosted backup add-on posture'],
    proof: ['Live browser SkyeVaultPro proof', 'Legacy docx redirect proof', 'Suite event API proof', 'Vault bridge receipts'],
    competitors: [['Google Drive / OneDrive', 'Strong cloud storage. SkyeVaultPro is local-first and 0S-gated.'], ['1Password documents', 'Secure storage. SkyeVaultPro connects to editor workflows.'], ['Local folders', 'Private but unstructured. VaultPro adds routes and receipts.']],
    truths: ['Hosted backup costs money and should not be implied as free.', 'Local-first means users still need recovery discipline.', 'Vault and editor bridges must be same-gate.']
  },
  {
    slug: 'skyevaultos',
    name: 'SkyeVaultOS',
    emoji: '🧊',
    category: 'Vault OS / restore proof',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-vault-os/',
    pain: 'Deletion, restore, and audit claims are easy to market and hard to prove when real files are involved.',
    founder: 'SkyeVaultOS is the proof lane for restore discipline. I wanted the system to scan, encrypt, restore, bundle, restore again, and diff before claiming it can protect a serious workspace.',
    does: ['VaultOS proof routes', 'Inventory/search/restore surfaces', 'Encrypted shard and restore posture', 'FS27/SkySecure link'],
    proof: ['1,833 files restored and diffed', 'FS27 VaultOS routes', '20 live URL sweeps', 'Proof vault receipts'],
    competitors: [['Backup suites', 'Mature backups. SkyeVaultOS focuses on 0S proof and operator visibility.'], ['Cloud snapshots', 'Useful infrastructure. VaultOS explains and proves the restore.'], ['Manual archives', 'Cheap but unverifiable. VaultOS makes evidence visible.']],
    truths: ['Restore proof must be kept current.', 'Filesystem proof scope must be stated honestly.', 'No one should delete important files without verified restore receipts.']
  },
  {
    slug: 'skysecure-0meg4kai',
    name: 'SkySecure + 0meg4kAI',
    emoji: '🛡️',
    category: 'Security / secret custody',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof-vault/skye-secure-fs27-vault-proof.html',
    pain: 'Secrets leak because teams treat security as a checklist after the app is already public.',
    founder: 'SkySecure and 0meg4kAI are here because I do not want secrets, scans, grants, and suspicious routes hiding in the corner. The platform needs security at the gate, in the vault, and in the proof record.',
    does: ['Secret-pack custody', 'Security scanner posture', 'Grant and lifecycle events', 'Proof vault route'],
    proof: ['SkySecure FS27 Vault proof', 'Gate audit receipts', 'Secret rotation surfaces', 'Security readiness checks'],
    competitors: [['1Password / Bitwarden', 'Excellent secret managers. SkySecure ties custody to 0S grants and proof.'], ['Snyk / Semgrep', 'Strong scanners. 0meg4kAI is integrated into the 0S gate/security posture.'], ['Cloud provider secrets', 'Good primitives. The 0S wraps them in operator workflow.']],
    truths: ['Do not publish secret values.', 'Security claims need repeatable proof.', 'Rotation authority must be logged and owner-visible.']
  },
  {
    slug: 'relay13-connectlog',
    name: 'Relay13 + ConnectLog',
    emoji: '📬',
    category: 'Messaging / relationship OS',
    liveUrl: 'https://relay13-core.graylondonskyes.workers.dev/',
    pain: 'Leads die in texts, emails, DMs, screenshots, and forgotten follow-ups.',
    founder: 'Relay13 and ConnectLog exist because every relationship needs a thread, a receipt, a workspace, and a next action. I do not want customer messages living outside the operating system.',
    does: ['Client request inbox', 'ConnectLog relationship workspace', 'Durable/realtime messaging posture', 'AI response add-on boundaries'],
    proof: ['Production Relay13 proof', 'ConnectLog UI proof', 'WebSocket/proof receipts', 'FS27 contact ecology proof'],
    competitors: [['Intercom / Zendesk', 'Strong support platforms. Relay13 wins when messages must connect to 0S workspaces and proof.'], ['Slack / email', 'Useful communication. ConnectLog adds relationship memory.'], ['CRM inboxes', 'Good sales context. Relay13 adds platform-native routing.']],
    truths: ['AI replies need owner approval and caps.', 'Messages should still route when AI is exhausted.', 'Every inbound path needs a receipt.']
  },
  {
    slug: 'skyeroutex',
    name: 'SkyeRouteX',
    emoji: '🛻',
    category: 'Workforce dispatch',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/',
    pain: 'Workforce operations break when jobs, contractors, stops, proof, payments, and disputes live in different tools.',
    founder: 'SkyeRouteX is the dispatch room. I wanted a place where a provider can post work, route contractors, freeze payment state, capture proof, and export an audit packet without duct tape.',
    does: ['Provider job board', 'Contractor routes and assignments', 'Payment-state ledger', 'Audit packets and House Command'],
    proof: ['Worker parity proof', 'Concurrency stress proof', 'Browser/E2E checks', 'SkyePay product lane'],
    competitors: [['Jobber / Housecall Pro', 'Strong field-service tools. SkyeRouteX is broader workforce dispatch inside the 0S.'], ['Uber-style dispatch apps', 'Purpose-built marketplaces. RouteX is operator-owned.'], ['Spreadsheets/texts', 'Common but brittle. RouteX creates proof.']],
    truths: ['Payment movement requires owner/provider gates.', 'Concurrency locks must prefer 409 conflicts over over-assignment.', 'Dispatch proof is a product, not a nice-to-have.']
  },
  {
    slug: 'skyeprofitconsole',
    name: 'SkyeProfitConsole',
    emoji: '📈',
    category: 'Profit / decision console',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeProfitConsole/',
    pain: 'Profit decisions get buried under vague dashboards that do not tell the operator what to do next.',
    founder: 'SkyeProfitConsole is the money-movement room. I built it to rank cash-now lanes, package close briefs, simulate splits, and force proof around the decision.',
    does: ['Money Moves rank', 'Close briefs', 'Split furnace simulation', 'Signal loom and proof chain'],
    proof: ['Smoke/E2E proof', 'Free99 gated app', 'Runtime-backed review posture', 'Dispatch lane links'],
    competitors: [['QuickBooks dashboards', 'Useful accounting view. ProfitConsole is an action console.'], ['Spreadsheets', 'Flexible but slow. ProfitConsole gives operator structure.'], ['BI tools', 'Deep analytics. This lane focuses on immediate close paths.']],
    truths: ['It is not accounting software.', 'Profit signals must be tied to real offers.', 'Simulations are not payouts until SkyePay/ledger confirms.']
  },
  {
    slug: 'skyemediacenter',
    name: 'SkyeMediaCenter',
    emoji: '🎬',
    category: 'Media operations',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMediaCenter/',
    pain: 'Media files, approvals, captions, review notes, and delivery links scatter fast.',
    founder: 'SkyeMediaCenter gives media a room. Intake, review, dispatch, publishing, stats, and file delivery need to live like operations, not random attachments.',
    does: ['Media intake/review/dispatch', 'Publish and stats posture', 'File delivery lane', 'Operator theater and gated media app'],
    proof: ['Adapter tests', 'Mounted platform surface', 'Marketplace listing', 'Free99/paid lane boundaries'],
    competitors: [['Frame.io', 'Great review tool. SkyeMediaCenter connects media work to 0S delivery and proof.'], ['Dropbox/Drive', 'Storage only. MediaCenter adds workflow.'], ['Social schedulers', 'Publishing tools. MediaCenter starts at intake and review.']],
    truths: ['Do not claim streaming/licensing services without provider proof.', 'File delivery needs access boundaries.', 'Media proof includes what was reviewed and sent.']
  },
  {
    slug: 'skyesplitengine',
    name: 'SkyeSplitEngine',
    emoji: '➗',
    category: 'Splits / payouts',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeSplitEngine/',
    pain: 'Commission and payout splits become arguments when the rules are invisible.',
    founder: 'SkyeSplitEngine is the local-first split calculator and record room. I wanted something Free99 and gated that could make payout math visible before money moves.',
    does: ['Commission and split-rule CRUD', 'Reports and CSV import/export', 'Backup/restore snapshots', 'Offline PWA posture'],
    proof: ['Smoke/E2E proof', 'Backup/restore tests', 'Free99 gated app', 'PWA install hook'],
    competitors: [['Spreadsheets', 'Universal but error-prone. SplitEngine makes rules explicit.'], ['Payroll tools', 'Actual payouts. SplitEngine is pre-payout math and proof.'], ['Accounting software', 'Records money. SplitEngine models distribution logic.']],
    truths: ['It does not replace payroll compliance.', 'Payout simulation is not payment transfer.', 'Local data needs user backup discipline.']
  },
  {
    slug: 'houseoperations',
    name: 'HouseOperations',
    emoji: '🏠',
    category: 'House / operations command',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/',
    pain: 'House tasks, vendors, schedules, owner alerts, assignments, and billing intents become chaos when nobody owns the board.',
    founder: 'HouseOperations is the practical ops board. It lets the house, vendor, schedule, alerts, assignments, and proof sit in one command lane.',
    does: ['Task/vendor/schedule command', 'Owner alerts and assignments', 'Billing intent surface', 'Runtime review/execution/dispatch boards'],
    proof: ['Mounted 0S app', 'Marketplace product card', 'Runtime endpoint posture', 'FS27 gate handoff'],
    competitors: [['Trello / Asana', 'Good task boards. HouseOperations is domain-specific and 0S-gated.'], ['Property management tools', 'Broader rental workflows. This lane is operator-first.'], ['Text threads', 'Easy start, bad memory. HouseOperations creates structure.']],
    truths: ['Billing intents still need SkyePay confirmation.', 'Vendor work needs owner approval.', 'House ops should not leak private notes.']
  },
  {
    slug: 'kaixu-codestudio',
    name: 'kAIxU CodeStudio',
    emoji: '💻',
    category: 'Code / AI dev control',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/kaixu-codestudio/',
    pain: 'AI dev tools can generate fast, spend fast, leak context fast, and leave the operator with no policy boundary.',
    founder: 'kAIxU CodeStudio is the 0S code room where provider backplanes, approval rules, reports, and costly-call policy become visible instead of hidden in an IDE tab.',
    does: ['Provider backplane and policy', 'Code platform routes', 'Reports and app surfaces', 'Approval rules for costly calls'],
    proof: ['Mounted same-domain adapter', 'Free99 shared gate posture', 'Reports route', 'Policy/backplane app surfaces'],
    competitors: [['GitHub Copilot / Cursor', 'Great coding assistants. CodeStudio is about 0S policy and provider control.'], ['Replit', 'Great cloud dev environment. CodeStudio is a mounted app lane.'], ['Local IDEs', 'Powerful but isolated. CodeStudio adds operating rules.']],
    truths: ['Do not let AI spend without approval.', 'Code generation needs proof scans.', 'Secrets and prompts must stay governed.']
  },
  {
    slug: 'skyeapi-aegiscore',
    name: 'SkyeAPI + AegisCore',
    emoji: '🧿',
    category: 'API / gateway control',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/skyeapi-aegiscore/apps/console/index.html',
    pain: 'Credentials, capability flags, provider access, and gateway policy become dangerous when every app invents its own rules.',
    founder: 'SkyeAPI and AegisCore exist to make the gateway visible. If a provider can cost money or expose data, it needs capability controls and proof.',
    does: ['Credential and capability control', 'Provider/gateway console', 'Secondary website surface', 'Free99 mounted app lane'],
    proof: ['0S registry entries', 'Console and website routes', 'Shared gate doctrine', 'Free99 mounted app posture'],
    competitors: [['API gateways', 'Strong infra primitive. SkyeAPI focuses on 0S capability policy.'], ['Provider dashboards', 'Vendor-specific control. AegisCore normalizes across lanes.'], ['Env files', 'Simple but unsafe at scale. The gateway creates policy.']],
    truths: ['Never print credentials.', 'Capability flags must match actual enforcement.', 'Gateway policy belongs behind shared auth.']
  },
  {
    slug: 'skaixu-code-evaluator',
    name: 'skAIxU Code Evaluator',
    emoji: '🧪',
    category: 'Code review / evaluation',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/skaixu-code-evaluator/',
    pain: 'Code review without a rubric becomes opinion, and generated code without proof becomes liability.',
    founder: 'skAIxU Code Evaluator is the evaluation room for rubric-backed code checks, workflow proof, and seed materialization packs.',
    does: ['Rubric-based evaluation', 'Workflow and browser proof posture', 'Seed materialization packs', 'Free99 mounted app lane'],
    proof: ['0S app registry', 'Free99 platform intake', 'Evaluation workflow surfaces', 'Shared gate boundary'],
    competitors: [['CodeClimate / Sonar', 'Mature static analysis. skAIxU is a 0S evaluation workflow room.'], ['Pull request reviews', 'Necessary but manual. Evaluator structures the rubric.'], ['AI review bots', 'Fast but uneven. This lane ties review to proof.']],
    truths: ['Evaluation is not a substitute for ownership.', 'Rubrics must be visible.', 'Proof scans should be repeatable.']
  },
  {
    slug: 'documorph',
    name: 'Documorph',
    emoji: '🔄',
    category: 'Document transform',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/documorph/',
    pain: 'Transforming documents sounds simple until formats, records, and runtime surfaces drift apart.',
    founder: 'Documorph is the transform room: take document work seriously enough to keep app routes, database-backed runtime surfaces, and secondary app flows visible.',
    does: ['Document transform app', 'Runtime/database-backed surfaces', 'Secondary app route', 'Free99 app posture'],
    proof: ['0S registry entries', 'Documorph app route', 'Free99 shared gate', 'Document platform adjacency'],
    competitors: [['SmallPDF / Zamzar', 'Useful conversion utilities. Documorph belongs inside the 0S document workflow.'], ['Adobe Acrobat', 'Powerful PDF tooling. Documorph is lighter and workflow-connected.'], ['Custom scripts', 'Flexible but invisible. Documorph gives a surface.']],
    truths: ['Format conversion needs data boundaries.', 'Do not overclaim perfect fidelity.', 'Document transforms should record what changed.']
  },
  {
    slug: 'doctor-ops-personal-vault',
    name: 'Doctor Ops Personal Vault',
    emoji: '🩺',
    category: 'Personal health workflow vault',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/doctor-ops-personal-vault/',
    pain: 'Personal health notes and doctor prep often live in memory, screenshots, and portals that do not help the person organize their own questions.',
    founder: 'Doctor Ops Personal Vault is intentionally careful: local-first personal workflow, not an EHR, not medical advice, and not a replacement for professionals.',
    does: ['Local-first personal doctor workflow vault', 'Question/prep organization', 'Private note posture', 'Free99 mounted app lane'],
    proof: ['0S registry entry', 'Free99 shared gate posture', 'Explicit non-EHR boundary', 'Local-first app route'],
    competitors: [['Patient portals', 'Official medical access. Doctor Ops organizes personal prep only.'], ['Apple Health / Google Fit', 'Health data ecosystems. This lane is notes/workflow.'], ['Notes apps', 'Flexible but unstructured. Doctor Ops gives a careful room.']],
    truths: ['Not an EHR.', 'Not medical advice.', 'Private health notes need extra caution and local-first discipline.']
  },
  {
    slug: 'skyearcade',
    name: 'SkyeArcade Sovereign Vault',
    emoji: '🎮',
    category: 'Game vault / local saves',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/skyearcade/',
    pain: 'Small games and experiments usually vanish, lose saves, or never connect to the larger platform story.',
    founder: 'SkyeArcade is the playful vault lane. It keeps static games, local saves, and upstream bridge events in a 0S-aware package.',
    does: ['Static game vault', 'Local saves', 'Upstream bridge events', 'Free99 app route'],
    proof: ['0S registry entry', 'Free99 app route', 'Local save posture', 'Static vault position'],
    competitors: [['itch.io', 'Great indie game distribution. SkyeArcade is a 0S-owned vault lane.'], ['Newgrounds', 'Community games. SkyeArcade focuses on local platform ownership.'], ['Standalone HTML games', 'Easy to publish. SkyeArcade adds vault context.']],
    truths: ['Games need save/export clarity.', 'Do not claim marketplace scale.', 'The value is ownership and experimentation.']
  },
  {
    slug: 'skyebox-authenticator',
    name: 'SkyeBox Authenticator',
    emoji: '🔑',
    category: 'Authenticator / local security',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/skyebox-authenticator/',
    pain: 'Two-factor secrets get trapped in phones, apps, screenshots, or accounts nobody can recover cleanly.',
    founder: 'SkyeBox Authenticator is the local encrypted TOTP vault lane. It is not a casual toy; it exists because access recovery is real infrastructure.',
    does: ['Encrypted local TOTP vault', 'Browser crypto posture', 'HouseOperations launch path', 'Free99 canonical app'],
    proof: ['0S registry entry', 'HouseOperations SkyeBox route', 'Shared gate posture', 'Local encryption boundary'],
    competitors: [['Google Authenticator / Authy', 'Common authenticator apps. SkyeBox is 0S-owned and local-vault oriented.'], ['1Password TOTP', 'Strong password manager integration. SkyeBox is a focused Free99 lane.'], ['Paper backup codes', 'Useful backup. SkyeBox gives encrypted structure.']],
    truths: ['Local vaults still need backup plans.', 'Do not expose seed values.', 'Recovery procedures matter as much as login.']
  },
  {
    slug: 'kaixu-storefront',
    name: 'kAIxU Storefront',
    emoji: '🛍️',
    category: 'Mini storefront / offer ecology',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/kaixu-storefront/',
    pain: 'Offer ideas and product ecology need a small storefront before they deserve a full commerce system.',
    founder: 'kAIxU Storefront is the mini store lane for product ecology: small, gated, and useful for shaping offers before they graduate.',
    does: ['Mini storefront', 'Product ecology source', 'Future approved offers', 'Free99 app posture'],
    proof: ['0S registry entry', 'Free99 app route', 'Storefront adjacency to SkyePay/SkyeCommerce', 'Gate-owned access model'],
    competitors: [['Gumroad', 'Easy product sales. kAIxU Storefront is a 0S offer-shaping lane.'], ['Shopify starter stores', 'Commerce-ready. This lane is lighter and earlier.'], ['Static product pages', 'Simple but disconnected. Storefront ties into 0S products.']],
    truths: ['Not every offer needs full checkout immediately.', 'Approved offers should move through SkyePay.', 'Mini storefront copy must match real fulfillment capacity.']
  },
  {
    slug: 'free99',
    name: 'Free99 Platform Lane',
    emoji: '🆓',
    category: 'Gated free access',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/',
    pain: 'Free tiers either become fake demos or uncapped liabilities that cost the founder money.',
    founder: 'Free99 is not me giving the internet an unlimited bill. It is a gate-owned no-charge lane where people can touch real apps under caps, receipts, and upgrade paths.',
    does: ['Gated no-charge app lane', 'Shared session model', 'Paid/upgrade handoff', 'Free99 app registry'],
    proof: ['Free99 app manifest', 'Shared gate correction', 'Mounted app auth rule', 'Platform intake proof'],
    competitors: [['Free SaaS trials', 'Familiar buyer motion. Free99 is access with platform receipts and caps.'], ['Open demos', 'Easy but unqualified. Free99 keeps the gate.'], ['Freemium apps', 'Scale play. Free99 is founder-cost-aware.']],
    truths: ['Free99 is not anonymous.', 'Caps protect the company.', 'Upgrade paths need SkyePay products.']
  },
  {
    slug: 'skye-content-forge',
    name: 'Skye Content Forge',
    emoji: '✍️',
    category: 'Content generation / publishing',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/skye-content-forge-publisher.html',
    pain: 'Content work fails when source notes, drafts, export paths, scheduler state, and social channels are all separate.',
    founder: 'Skye Content Forge is the source-aware publishing room. If content is going out under the brand, I want source scanning, draft archives, exports, and scheduled publishing in one place.',
    does: ['Approved-source scanning', 'Original draft generation', 'Markdown/R2/SkyeVault export', 'Scheduler and social publishing posture'],
    proof: ['0S registry entry', 'Content publisher route', 'Automation tick posture', 'GitHub/Cloudflare/Netlify hook support'],
    competitors: [['Jasper / Copy.ai', 'Fast writing tools. Content Forge ties writing to sources and 0S proof.'], ['Buffer / Hootsuite', 'Great scheduling. Content Forge starts at source and draft.'], ['WordPress editorial plugins', 'Useful publishing. Content Forge fits the 0S.']],
    truths: ['AI content needs source notes and review.', 'Social posting depends on valid provider tokens.', 'Draft archives and backups matter.']
  },
  {
    slug: 'legalskyes-sdk',
    name: 'LegalSkyes + 0S SDK',
    emoji: '⚖️',
    category: 'Legal ops / developer SDK',
    liveUrl: 'https://legalskyes.com/',
    pain: 'Legal operations, policy routes, and developer integration templates often sit outside the actual platform they are supposed to protect.',
    founder: 'LegalSkyes and the SDK are how I keep policy, contracts, and developer integration from being a forgotten PDF. They belong next to the running system.',
    does: ['Legal ops surfaces', 'Policy and route copy', 'SDK integration templates', '0S public/legal alignment'],
    proof: ['LegalSkyes production pages', 'Policy route proof', 'SDK references in handout', '0S legal route integration'],
    competitors: [['Traditional legal sites', 'Authority and services. LegalSkyes keeps the platform boundary visible.'], ['Developer docs alone', 'Useful but incomplete. The SDK ties docs to operating surfaces.'], ['Policy generators', 'Fast drafts. LegalSkyes focuses on product-specific truth.']],
    truths: ['Legal copy is not a substitute for lawyer review.', 'Policy claims must match deployed behavior.', 'SDK docs must stay current with route changes.']
  },
  {
    slug: 'vantacore-crm',
    name: 'VantaCore CRM',
    emoji: '📇',
    category: 'CRM / workspace',
    liveUrl: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/vantacore-crm',
    pain: 'CRM proof often stops at a dashboard screenshot instead of lead capture, pipeline movement, booking, follow-up, and review.',
    founder: 'VantaCore CRM is the usable CRM lane I keep inside FS27 so customer movement can be proved as workflow, not just a static interface.',
    does: ['Lead capture and pipeline update', 'Booking and follow-up', 'Review and summary lanes', 'FS27 workspace route'],
    proof: ['VantaCore CRM live browser proof', 'FS27 worker route', '0S routing proof', 'Lead workflow evidence'],
    competitors: [['HubSpot / Salesforce', 'Massive CRM platforms. VantaCore is focused 0S/FS27 workspace CRM.'], ['Airtable CRMs', 'Flexible data layer. VantaCore has workflow proof.'], ['Spreadsheets', 'Common starter CRM. VantaCore adds action and routing.']],
    truths: ['The imported Next package is source until a dedicated runtime is chosen.', 'The FS27 workspace is the current usable lane.', 'CRM value is workflow proof, not just records.']
  },
  {
    slug: 'skyerunners',
    name: 'SkyeRunners',
    emoji: '🏃',
    category: 'Automation / operator runs',
    liveUrl: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/operator/index.html',
    pain: 'Automation without a safe command registry turns into shell roulette.',
    founder: 'SkyeRunners is the disciplined operator lane: commands, proofs, and allowlisted actions instead of random terminal magic.',
    does: ['Safe command registry posture', 'Operator run receipts', 'MCP mining and proof workflows', '0S command surface alignment'],
    proof: ['0S command registry', 'SkyeRunners script references', 'MCP mine commands', 'Operator proof receipts'],
    competitors: [['GitHub Actions', 'Great CI automation. SkyeRunners is local/operator command discipline.'], ['Zapier', 'Useful workflow automation. SkyeRunners handles repo/platform ops.'], ['Manual terminal runs', 'Powerful but risky. SkyeRunners creates allowlists.']],
    truths: ['Commands should be known before execution.', 'Proof receipts matter.', 'Dangerous automation needs owner gates.']
  }
];

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function cleanUrlPath(file) {
  const rel = path.relative(siteRoot, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}`;
  return `/${rel.replace(/\.html$/i, '')}`;
}

function pageShell({ title, description, body, active = 'dossier', rootPrefix = '' }) {
  const nav = [
    ['Overview', `${rootPrefix}index.html`],
    ['Mega Dossier', `${rootPrefix}0s-dossier.html`],
    ['Platform Hub', `${rootPrefix}platform-dossiers/`],
    ['Capabilities', `${rootPrefix}capabilities.html`],
    ['Marketplace', `${rootPrefix}marketplace.html`],
    ['Proof', `${rootPrefix}proof.html`],
    ['SkyeNet', `${rootPrefix}skyenet.html`],
    ['Main Platform', 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/']
  ].map(([label, href]) => {
    const isActive =
      (active === 'dossier' && label === 'Mega Dossier') ||
      (active === 'hub' && label === 'Platform Hub') ||
      (active === 'skyenet' && label === 'SkyeNet');
    const external = href.startsWith('http');
    return `<a${isActive ? ' class="is-active"' : ''} href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;
  }).join('\n        ');

  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="icon" href="/assets/favicon-32.png">
  <link rel="canonical" href="${canonicalDomain}${active === 'skyenet' ? '/skyenet' : ''}">
  <link rel="stylesheet" href="${rootPrefix}style.css">
</head>
<body class="skyesol-living-page dossier-page" data-experience-mode="operator">
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <div class="skyesol-grain" aria-hidden="true"></div>
  <div class="skyesol-scanline" aria-hidden="true"></div>
  <header class="topbar">
    <nav class="nav-shell" aria-label="Primary navigation">
      <a class="brand" href="${rootPrefix}index.html">
        <img src="/assets/metraiyux-0s-emblem-transparent.png" alt="MetrAIyux 0S emblem">
        MetrAIyux 0S
      </a>
      <button class="menu-button" type="button" data-menu-button data-menu-toggle aria-label="Open navigation" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-links" data-nav-links>
        ${nav}
      </div>
    </nav>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <p>Gray Skyes / MetrAIyux 0S dossier system. Built with receipts, boundaries, and no pretend unlimited lanes.</p>
  </footer>
  <script src="${rootPrefix}site-search.js"></script>
  <script src="${rootPrefix}script.js"></script>
</body>
</html>
`;
}

function renderPlatformPage(platform, { rootPrefix = '../', rootFile = false } = {}) {
  const pageUrl = rootFile ? `${canonicalDomain}/${platform.slug === 'skyenet' ? 'skyenet' : `platform-dossiers/${platform.slug}`}` : `${canonicalDomain}/platform-dossiers/${platform.slug}`;
  const compareRows = (platform.competitors || sharedCompetitorFrame).map(([name, note]) => `
            <tr>
              <th>${esc(name)}</th>
              <td>${esc(note)}</td>
            </tr>`).join('');
  const truths = [...sharedTruths, ...(platform.truths || [])].slice(0, 8);
  const body = `
    <section class="dossier-hero">
      <div class="dossier-hero-copy reveal">
        <p class="eyebrow">${esc(platform.category)} · ${esc(platform.emoji)} pain first</p>
        <h1 class="hero-headline neon-gradient-text">${esc(platform.name)}</h1>
        <p class="dossier-pain">${esc(platform.pain)}</p>
        <div class="cta-row">
          <a class="btn-primary" href="${esc(platform.liveUrl)}" target="_blank" rel="noopener">Open Live Lane</a>
          <a class="btn-ghost" href="${rootPrefix}0s-dossier.html">Back to Mega Dossier</a>
          <a class="btn-ghost" href="${rootPrefix}platform-dossiers/">All Platform Dossiers</a>
        </div>
      </div>
      <aside class="dossier-signal-card reveal">
        <span>${esc(platform.emoji)}</span>
        <strong>${esc(platform.name)}</strong>
        <p>${esc(platform.category)}</p>
        <code>${esc(pageUrl)}</code>
      </aside>
    </section>

    <section class="section dossier-longform">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Founder note</p>
        <h2>Why Gray built this lane.</h2>
      </div>
      <article class="dossier-founder-note reveal">
        <p>${esc(platform.founder)}</p>
      </article>
    </section>

    <section class="section">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">What it does</p>
        <h2>The practical operating layer.</h2>
      </div>
      <div class="dossier-grid">
        ${platform.does.map((item, index) => `<article class="dossier-card reveal"><span>0${index + 1}</span><h3>${esc(item)}</h3><p>${esc(`This is not a brochure bullet. In the 0S, ${platform.name} has to connect the user action to a route, a session, a receipt, or a handoff so the work can be trusted later.`)}</p></article>`).join('\n        ')}
      </div>
    </section>

    <section class="section">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Competitor stack</p>
        <h2>How it stacks up without lying.</h2>
        <p>The comparison is category-level on purpose. Specialist tools are not bad; they are often excellent at the narrow job. The 0S argument is ownership, proof, shared auth, payment activation, and cross-lane context.</p>
      </div>
      <div class="dossier-table-wrap reveal">
        <table class="dossier-competitor-table">
          <tbody>${compareRows}</tbody>
        </table>
      </div>
    </section>

    <section class="section split-section">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Truth ledger</p>
        <h2>What we can say out loud.</h2>
      </div>
      <div class="truth-stack reveal">
        ${truths.map((truth) => `<p>✅ ${esc(truth)}</p>`).join('\n        ')}
      </div>
    </section>

    <section class="section">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Proof and receipts</p>
        <h2>What backs the page.</h2>
      </div>
      <div class="dossier-grid proof-grid">
        ${platform.proof.map((item) => `<article class="dossier-card reveal"><h3>🧾 ${esc(item)}</h3><p>${esc(`${platform.name} is marketed as part of a receipt-driven system. The proof may be a live route, a worker test, a browser proof, a stress run, or a platform truth file.`)}</p></article>`).join('\n        ')}
      </div>
    </section>
`;
  return pageShell({
    title: `${platform.name} Dossier | MetrAIyux 0S`,
    description: `${platform.name} longform 0S platform dossier from Gray Skyes: pain solved, product truth, proof receipts, and competitor positioning.`,
    body,
    active: platform.slug === 'skyenet' && rootFile ? 'skyenet' : 'hub',
    rootPrefix
  }).replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${esc(pageUrl)}">`);
}

function renderMega() {
  const groups = platforms.reduce((map, item) => {
    const key = item.category.split('/')[0].trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  const cards = platforms.map((item) => {
    const href = item.slug === 'skyenet' ? 'skyenet.html' : `platform-dossiers/${item.slug}.html`;
    return `<a class="dossier-index-card reveal" href="${href}">
      <span>${esc(item.emoji)}</span>
      <strong>${esc(item.name)}</strong>
      <small>${esc(item.category)}</small>
      <p>${esc(item.pain)}</p>
    </a>`;
  }).join('\n        ');
  const groupBlocks = [...groups.entries()].map(([name, items]) => `
        <article class="dossier-card reveal">
          <span>${esc(String(items.length).padStart(2, '0'))}</span>
          <h3>${esc(name)}</h3>
          <p>${esc(items.map((item) => item.name).join(', '))}</p>
        </article>`).join('');
  const body = `
    <section class="dossier-hero mega-dossier-hero">
      <div class="dossier-hero-copy reveal">
        <p class="eyebrow">Mega 0S Dossier · pain first</p>
        <h1 class="hero-headline neon-gradient-text">The 0S exists because business tools keep leaving the hard parts between products.</h1>
        <p class="dossier-pain">The pain is not that the market has no tools. The pain is that every tool solves one slice, then leaves auth, payments, proof, deployment, email, database, content, documents, media, dispatch, and client delivery in separate rooms. MetrAIyux 0S is Gray Skyes building those rooms into one sovereign operating layer.</p>
        <div class="cta-row">
          <a class="btn-primary" href="#platform-dossier-hub">Open Platform Hub</a>
          <a class="btn-ghost" href="proof.html">Live Proof</a>
          <a class="btn-ghost" href="the-gap.html">No Direct Competitor</a>
        </div>
      </div>
      <aside class="dossier-signal-card reveal">
        <span>🧠</span>
        <strong>${platforms.length} dossiers</strong>
        <p>One cumulative 0S truth map</p>
        <code>proof + pain + competitor stack</code>
      </aside>
    </section>

    <section class="section dossier-longform">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Gray's perspective</p>
        <h2>I did not build a prettier SaaS catalog. I built escape lanes.</h2>
      </div>
      <article class="dossier-founder-note reveal">
        <p>I built the 0S because every serious owner eventually hits the same wall: the business needs to move, but the systems do not talk, the proof is scattered, the keys are everywhere, the apps make their own passwords, the deployment path depends on somebody else, and the customer only sees a nice screen while the operator eats the risk. The 0S is my answer to that. It is not one app. It is the gate, the vault, the deploy lane, the database, the mail lane, the payment lane, the content rooms, the client app factory, the music business layer, the commerce layer, and the proof trail living as one company operating system.</p>
      </article>
    </section>

    <section class="section">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Stack analysis</p>
        <h2>Where 0S wins against normal competitors.</h2>
      </div>
      <div class="dossier-grid">
        <article class="dossier-card reveal"><span>01</span><h3>Against point SaaS</h3><p>Point tools usually win on polish for one workflow. The 0S wins when that workflow has to touch auth, billing, proof, content, deployment, and owner review without duct tape.</p></article>
        <article class="dossier-card reveal"><span>02</span><h3>Against generic no-code</h3><p>No-code builders help create screens. The 0S is built around operating lanes, receipts, platform truth, and live production surfaces instead of previews alone.</p></article>
        <article class="dossier-card reveal"><span>03</span><h3>Against enterprise suites</h3><p>Enterprise suites are mature, expensive, and familiar. The 0S is a founder-built sovereign stack for companies that want ownership, custom lanes, and proof before ceremony.</p></article>
        <article class="dossier-card reveal"><span>04</span><h3>Against pure self-hosting</h3><p>Self-hosting gives control but adds heavy ops. The 0S uses Cloudflare-backed lanes where they make sense and keeps private/sovereign runtime paths for the places ownership really demands it.</p></article>
      </div>
    </section>

    <section class="section">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Platform map</p>
        <h2>The product lanes grouped by operating job.</h2>
      </div>
      <div class="dossier-grid">${groupBlocks}</div>
    </section>

    <section class="section" id="platform-dossier-hub">
      <div class="dossier-section-head reveal">
        <p class="eyebrow">Hub</p>
        <h2>Every platform dossier.</h2>
        <p>Each page starts with the pain, then explains the 0S lane from Gray's perspective, competitor positioning, proof, and truth boundaries.</p>
      </div>
      <div class="dossier-index-grid">
        ${cards}
      </div>
    </section>
`;
  return pageShell({
    title: 'Mega 0S Dossier | MetrAIyux 0S',
    description: 'The cumulative MetrAIyux 0S platform dossier: every app and platform lane, the pain it solves, proof receipts, competitor positioning, and Gray Skyes founder perspective.',
    body,
    active: 'dossier',
    rootPrefix: ''
  }).replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonicalDomain}/0s-dossier">`);
}

function renderHub() {
  const cards = platforms.map((item) => {
    const href = item.slug === 'skyenet' ? '../skyenet.html' : `${item.slug}.html`;
    return `<a class="dossier-index-card reveal" href="${href}">
      <span>${esc(item.emoji)}</span>
      <strong>${esc(item.name)}</strong>
      <small>${esc(item.category)}</small>
      <p>${esc(item.pain)}</p>
    </a>`;
  }).join('\n        ');
  const body = `
    <section class="dossier-hero">
      <div class="dossier-hero-copy reveal">
        <p class="eyebrow">0S platform hub</p>
        <h1 class="hero-headline neon-gradient-text">Every app lane gets a page with pain, truth, proof, and competitor context.</h1>
        <p class="dossier-pain">This is the public marketing directory for the 0S platform portfolio. It keeps the buyer from getting lost and keeps the company from selling claims that are not backed by the working system.</p>
        <div class="cta-row">
          <a class="btn-primary" href="../0s-dossier.html">Read Mega Dossier</a>
          <a class="btn-ghost" href="../marketplace.html">Marketplace</a>
        </div>
      </div>
      <aside class="dossier-signal-card reveal">
        <span>🗂️</span>
        <strong>Hub</strong>
        <p>${platforms.length} live dossiers</p>
      </aside>
    </section>
    <section class="section">
      <div class="dossier-index-grid">${cards}</div>
    </section>
`;
  return pageShell({
    title: '0S Platform Dossier Hub | MetrAIyux 0S',
    description: 'Directory of MetrAIyux 0S platform dossiers with pain-first longform explanations, proof posture, and competitor positioning.',
    body,
    active: 'hub',
    rootPrefix: '../'
  }).replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonicalDomain}/platform-dossiers/">`);
}

function writeFile(rel, content) {
  const target = path.join(siteRoot, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function titleAndDescription(file) {
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || path.basename(file);
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() || '';
  return { title, description };
}

function listHtmlFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) listHtmlFiles(abs, acc);
    else if (entry.isFile() && entry.name.endsWith('.html')) acc.push(abs);
  }
  return acc;
}

function writeIndexes() {
  const files = listHtmlFiles(siteRoot).sort((a, b) => cleanUrlPath(a).localeCompare(cleanUrlPath(b)));
  const pages = files.map((file) => {
    const relPath = path.relative(siteRoot, file).replace(/\\/g, '/');
    const urlPath = cleanUrlPath(file);
    const { title, description } = titleAndDescription(file);
    const priority = urlPath === '/' ? '1.0' : (/0s-dossier|platform-dossiers|skyenet/.test(urlPath) ? '0.9' : '0.75');
    const changefreq = urlPath === '/' || /0s-dossier|platform-dossiers/.test(urlPath) ? 'weekly' : 'monthly';
    return {
      relPath,
      loc: `${canonicalDomain}${urlPath === '/' ? '/' : urlPath}`,
      title,
      description,
      lastmod: today,
      changefreq,
      priority
    };
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url>
    <loc>${esc(page.loc)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(siteRoot, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(siteRoot, 'google-indexing-submit.json'), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    canonical_domain: canonicalDomain,
    primary_submit_url: `${canonicalDomain}/sitemap.xml`,
    robots_url: `${canonicalDomain}/robots.txt`,
    page_count: pages.length,
    pages
  }, null, 2)}\n`);
}

fs.mkdirSync(dossierDir, { recursive: true });
writeFile('0s-dossier.html', renderMega());
writeFile('platform-dossiers/index.html', renderHub());
for (const platform of platforms) {
  if (platform.slug === 'skyenet') {
    writeFile('skyenet.html', renderPlatformPage(platform, { rootPrefix: '', rootFile: true }));
  }
  writeFile(`platform-dossiers/${platform.slug}.html`, renderPlatformPage(platform, { rootPrefix: '../' }));
}
writeFile('data/platform-dossiers.json', `${JSON.stringify({
  generated_at: new Date().toISOString(),
  canonical_domain: canonicalDomain,
  count: platforms.length,
  platforms: platforms.map(({ slug, name, emoji, category, pain, liveUrl }) => ({ slug, name, emoji, category, pain, liveUrl, marketingUrl: slug === 'skyenet' ? `${canonicalDomain}/skyenet` : `${canonicalDomain}/platform-dossiers/${slug}` }))
}, null, 2)}\n`);
writeIndexes();

console.log(JSON.stringify({
  ok: true,
  generated: platforms.length,
  hub: 'marketing/metraiyux-0s/0s-dossier.html',
  directory: 'marketing/metraiyux-0s/platform-dossiers/index.html'
}, null, 2));
