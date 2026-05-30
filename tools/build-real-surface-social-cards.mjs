import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'marketing/devooderator/assets/social/real-surfaces');
const screenshotDir = path.join(outDir, 'screenshots');
const contentDir = path.join(repoRoot, 'marketing/devooderator/content/social-vault');
const manifestPath = path.join(outDir, 'real-surface-cards.json');
const copyPackPath = path.join(contentDir, 'real-surface-founder-campaign-pack.md');
const receiptPath = path.join(repoRoot, 'test-artifacts/social-real-surface/real-surface-card-build-latest.json');

const marketing = 'https://metraiyux-0s-marketing.pages.dev';
const devo = 'https://devooderator.pages.dev';

const cards = [
  {
    id: 'metraiyux-home-founder-office',
    title: 'MetrAIyux 0S',
    lane: 'Main conversion front door',
    sourceUrl: `${marketing}/`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-1.png',
    headline: 'The website is only the front door.',
    kicker: 'Actual 0S marketing home',
    subhead: 'Send prospects here when they need the clean sales story before the deep proof.',
    cta: 'Open the 0S marketing site',
    accent: '#f0c76b',
    caption: 'The 0S does not need to be explained like a normal website. The marketing home is the front door: what it is, who it serves, and where a serious buyer should go next. DevodeRator can hold the build receipts. This page is where the conversation starts.',
    thread: [
      'The public front door matters.',
      'DevodeRator proves the work. The 0S marketing site sells the offer.',
      'That split keeps the story clean: proof on one side, conversion on the other.',
      'Start here when somebody asks what the 0S actually does.'
    ]
  },
  {
    id: 'sell-sheet-founder-client-room',
    title: '0S Sell Sheet',
    lane: 'One-page buyer handoff',
    sourceUrl: `${marketing}/sell-sheet.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-Client.png',
    headline: 'One page for the serious conversation.',
    kicker: 'Actual sell-sheet surface',
    subhead: 'Use this when a lead needs the offer, outcomes, and next step without wandering.',
    cta: 'Send the sell sheet',
    accent: '#70d7ff',
    caption: 'The sell sheet is for the moment when somebody says, "send me something." Not a maze. Not a blog rabbit hole. One page that says what the platform is, why it matters, and what a real next step looks like.',
    thread: [
      'Every founder needs a clean handoff page.',
      'Not every lead is ready for a demo.',
      'The sell sheet gives them the shape of the offer without making them decode the whole system.',
      'That is why this surface exists.'
    ]
  },
  {
    id: 'business-cards-qr-founder-banner',
    title: 'Business Card QR Studio',
    lane: 'Scan-to-sales handoff',
    sourceUrl: `${marketing}/business-cards.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-POSTER_BANNER.png',
    headline: 'A QR code should not dump people into noise.',
    kicker: 'Actual business-card surface',
    subhead: 'The card lane now routes scans toward marketing, pricing, proof, and founder contact.',
    cta: 'Open the card studio',
    accent: '#ffd15c',
    caption: 'A business card is not just a design file. It is a routing decision. If somebody scans, they should land on a relevant offer, founder page, sell sheet, or proof surface. That is the point of this card studio.',
    thread: [
      'The QR code is part of the funnel.',
      'A random blog link wastes the scan.',
      'A relevant sales surface gives the person context, proof, and a next action.',
      'That is the business-card upgrade.'
    ]
  },
  {
    id: 'devoderator-social-founder-headshot',
    title: 'DevodeRator Social Vault',
    lane: 'Copy/paste campaign room',
    sourceUrl: `${devo}/social`,
    founderImage: 'marketing/metraiyux-0s/assets/gray-skyes-headshot.png',
    headline: 'The campaign room is part of the product.',
    kicker: 'Actual DevodeRator social vault',
    subhead: 'Copy, visuals, replies, DMs, and calendars live together so posting does not stall.',
    cta: 'Open the social vault',
    accent: '#8df7d4',
    caption: 'This is the social vault as a working room: campaign copy, daily posting logic, reply language, DM follow-up, and visual assets in one place. The goal is not "content for content." The goal is to move real surfaces into public conversation.',
    thread: [
      'The hard part is not making one post.',
      'The hard part is keeping a campaign moving after day one.',
      'That is why the vault includes copy, images, replies, DMs, and a posting calendar.',
      'It turns the platform into repeatable public motion.'
    ]
  },
  {
    id: 'devoderator-cards-founder-portrait',
    title: 'DevodeRator Cards',
    lane: 'Founder contact and QR hub',
    sourceUrl: `${devo}/cards`,
    founderImage: 'marketing/metraiyux-0s/assets/gray-skyes-portrait.jpg',
    headline: 'Cards should create a next step.',
    kicker: 'Actual DevodeRator card hub',
    subhead: 'Founder contact, vCard, platform QR codes, and proof routes now have one public control room.',
    cta: 'Open the QR hub',
    accent: '#f36f6f',
    caption: 'The card hub is the public control room for scans. It keeps founder contact, vCard, sell-sheet links, platform handoffs, and proof routes organized so the printed card does not become a dead end.',
    thread: [
      'A card is a physical CTA.',
      'The QR destination has to respect that.',
      'This hub keeps the scans pointed at real sales and proof surfaces.',
      'Print matters again when the route is right.'
    ]
  },
  {
    id: 'skyeroutex-founder-stage',
    title: 'SkyeRouteX',
    lane: 'Workforce command platform',
    sourceUrl: `${marketing}/skyeroutex.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-wide-stage.jpg',
    headline: 'Dispatch, proof, and payment need one room.',
    kicker: 'Actual SkyeRouteX surface',
    subhead: 'A workforce system for routing jobs, providers, proof, and operational follow-up.',
    cta: 'Open SkyeRouteX',
    accent: '#b8ec6f',
    caption: 'SkyeRouteX is for the messy middle of real work: jobs, providers, proof, handoffs, and follow-up. The page is built to explain the platform without pretending operations are simple.',
    thread: [
      'Most workforce tools split the work apart.',
      'Dispatch in one place. Proof somewhere else. Payment state somewhere else.',
      'SkyeRouteX is built around the actual loop.',
      'Route the work. Capture the proof. Keep the next action visible.'
    ]
  },
  {
    id: 'skye-music-nexus-founder-cutout',
    title: 'SkyeMusicNexus',
    lane: 'Artist business engine',
    sourceUrl: `${marketing}/skye-music-nexus/nexus-marketing-hub.html`,
    founderImage: 'marketing/metraiyux-0s/assets/skye-music-nexus/gray-skyes-founder-cutout.png',
    headline: 'Artists need business infrastructure too.',
    kicker: 'Actual SkyeMusicNexus hub',
    subhead: 'Storefronts, drops, release context, proof, and business routing for artist work.',
    cta: 'Open the music hub',
    accent: '#d08cff',
    caption: 'SkyeMusicNexus is not just a music page. It is a business engine for artist work: catalog surfaces, drops, storefronts, proof, and routes that help the creative side connect to operations.',
    thread: [
      'Artists get treated like content machines.',
      'They need infrastructure: catalog, storefront, proof, offers, and follow-up.',
      'That is the SkyeMusicNexus lane.',
      'Music is the product, but the system is the leverage.'
    ]
  },
  {
    id: 'proof-ecology-founder-depth',
    title: 'Proof Ecology',
    lane: 'Receipts and trust posture',
    sourceUrl: `${marketing}/proof-ecology.html`,
    founderImage: 'marketing/metraiyux-0s/assets/founder-depth.png',
    headline: 'Receipts are the operating posture.',
    kicker: 'Actual proof ecology surface',
    subhead: 'Proof is treated as a living system: receipts, boundaries, source custody, and public-safe evidence.',
    cta: 'Open proof ecology',
    accent: '#6fd6ff',
    caption: 'Proof is not a screenshot dumped at the end. It is a posture. The proof ecology page explains how receipts, boundaries, and public-safe evidence fit into the way the 0S gets built and sold.',
    thread: [
      'The proof layer has to be designed.',
      'Raw private receipts do not belong in public marketing.',
      'Public-safe proof still needs to be strong enough to earn trust.',
      'That is what this surface is for.'
    ]
  },
  {
    id: 'free-stack-founder-rooftop',
    title: 'Free Business Stack',
    lane: 'Small business starter offer',
    sourceUrl: `${marketing}/business-owner-free-stack.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-room-04.jpg',
    headline: 'Free should still feel serious.',
    kicker: 'Actual free-stack surface',
    subhead: 'A public offer for owners who need a practical starting point before bigger systems.',
    cta: 'Open the free stack',
    accent: '#ff8bb7',
    caption: 'The free business stack is the entry lane for owners who need something useful now: a starting surface, a practical route, and a way to understand what the bigger platform can become.',
    thread: [
      'A free offer can still be strategic.',
      'The point is not to cheapen the platform.',
      'The point is to give business owners a real first step.',
      'Then the system can grow with the work.'
    ]
  },
  {
    id: 'white-label-founder-red',
    title: 'White Label 0S',
    lane: 'Agency and partner offer',
    sourceUrl: `${marketing}/white-label.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-red-portrait.jpg',
    headline: 'Your brand can ride the infrastructure.',
    kicker: 'Actual white-label surface',
    subhead: 'A partner lane for agencies, operators, and builders who need the engine without rebuilding it.',
    cta: 'Open white label',
    accent: '#ff725e',
    caption: 'White label is the quiet power move: keep your brand in front, use the infrastructure underneath, and stop rebuilding the same operating layer from scratch every time a client needs a serious system.',
    thread: [
      'Agencies do not need another generic template.',
      'They need infrastructure they can bring to clients under their own lane.',
      'White label turns the 0S into leverage.',
      'Your brand in front. The operating layer underneath.'
    ]
  },
  {
    id: 'gray-skyes-founder-page',
    title: 'Gray London Skyes',
    lane: 'Founder authority page',
    sourceUrl: `${marketing}/gray-skyes.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-2.png',
    headline: 'The founder page should carry the room.',
    kicker: 'Actual founder marketing page',
    subhead: 'Founder identity, contact context, offer direction, and trust cues in one public page.',
    cta: 'Open founder page',
    accent: '#f0c76b',
    caption: 'The founder page is where the personal brand and the company offer meet. It should not feel like a bio tucked in a drawer. It should carry contact context, authority, direction, and a clear next action.',
    thread: [
      'Founder-led work needs a founder surface.',
      'Not just a name in a nav.',
      'A real page that explains who is behind the build and where to go next.',
      'That is what this route is for.'
    ]
  },
  {
    id: 'live-proof-founder-operator',
    title: 'Live Proof',
    lane: 'Public-safe proof wall',
    sourceUrl: `${marketing}/proof.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-5.png',
    headline: 'Show the proof without leaking the vault.',
    kicker: 'Actual live-proof surface',
    subhead: 'Public trust should point to evidence while protecting private systems and client data.',
    cta: 'Open live proof',
    accent: '#8df7d4',
    caption: 'The proof wall is for the public-safe version of receipts. Enough to show that the work is real. Careful enough to avoid leaking private routes, credentials, client data, or internal-only material.',
    thread: [
      'Proof has a boundary.',
      'Too little proof feels empty.',
      'Too much raw proof creates risk.',
      'The proof wall is the public-safe middle: visible evidence, protected systems.'
    ]
  }
];

cards.push(...[
  {
    id: 'capabilities-founder-operator',
    title: '0S Capabilities',
    lane: 'Capability map',
    sourceUrl: `${marketing}/capabilities.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-3.png',
    headline: 'Stop selling features. Show the system.',
    kicker: 'Actual capabilities surface',
    subhead: 'A clean map of what the 0S can do, where it routes, and how the offer breaks down.',
    cta: 'Open capabilities',
    accent: '#83e3ff',
    caption: 'The capabilities page is where the 0S stops sounding abstract. It turns the platform into a map: what exists, what each lane does, and where a buyer should go when they care about outcomes instead of slogans.',
    thread: [
      'A big platform needs a capability map.',
      'Otherwise people only see noise.',
      'This surface gives prospects a way to understand the offer by lane.',
      'That is how the 0S becomes explainable.'
    ]
  },
  {
    id: 'zero-os-dossier-founder-strategy',
    title: '0S Mega Dossier',
    lane: 'Executive proof packet',
    sourceUrl: `${marketing}/0s-dossier.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-4.png',
    headline: 'The serious buyer needs the dossier.',
    kicker: 'Actual 0S dossier surface',
    subhead: 'A deeper proof and positioning packet for operators, partners, and technical evaluators.',
    cta: 'Open the dossier',
    accent: '#f0c76b',
    caption: 'The dossier is not for casual scrolling. It is for the person who wants the deeper picture: architecture, proof posture, platform lanes, and why this is more than a landing page wrapped around a few tools.',
    thread: [
      'Some people need the short page.',
      'Some people need the full packet.',
      'The dossier is for the second group.',
      'It gives serious prospects a deeper way to evaluate the 0S.'
    ]
  },
  {
    id: 'free99-founder-entry-lane',
    title: 'Free99',
    lane: 'Free entry app layer',
    sourceUrl: `${marketing}/platform-dossiers/free99.html`,
    founderImage: 'marketing/metraiyux-0s/assets/founder-skyes-over-london.png',
    headline: 'Free entry should still have a backbone.',
    kicker: 'Actual Free99 dossier',
    subhead: 'A low-friction app lane backed by the same serious operating system underneath.',
    cta: 'Open Free99',
    accent: '#8df7d4',
    caption: 'Free99 is not throwaway freeware. It is an entry lane into useful tools while the real operating layer stays shared, gated, and controlled. That matters because free should not mean flimsy.',
    thread: [
      'Free is not the same as weak.',
      'A free lane can still sit on serious infrastructure.',
      'Free99 gives people a way in without scattering the operating model.',
      'That is the difference.'
    ]
  },
  {
    id: 'skyemail-founder-inbox',
    title: 'SkyEmail',
    lane: 'Email and communication surface',
    sourceUrl: `${marketing}/platform-dossiers/skyemail.html`,
    founderImage: 'marketing/metraiyux-0s/assets/gray-skyes-headshot.png',
    headline: 'Email belongs inside the operating layer.',
    kicker: 'Actual SkyEmail dossier',
    subhead: 'A communication lane for identity, aliases, proof, and business follow-up.',
    cta: 'Open SkyEmail',
    accent: '#70d7ff',
    caption: 'SkyEmail is the email lane inside the broader system. The point is not another inbox icon. The point is communication tied to identity, workspace context, proof, and follow-up.',
    thread: [
      'Email is still where business happens.',
      'But it usually sits outside the operating system.',
      'SkyEmail brings that lane into the same business infrastructure story.',
      'Identity, follow-up, proof, and messages belong together.'
    ]
  },
  {
    id: 'skyepay-founder-checkout',
    title: 'SkyePay',
    lane: 'Payment and offer handoff',
    sourceUrl: `${marketing}/platform-dossiers/skyepay.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-5.png',
    headline: 'The offer needs a payment path.',
    kicker: 'Actual SkyePay dossier',
    subhead: 'A platform payment lane connected to offers instead of isolated checkout islands.',
    cta: 'Open SkyePay',
    accent: '#ffd15c',
    caption: 'SkyePay is the payment story inside the 0S. Not a random checkout button. A lane that connects the offer, platform context, owner flow, and business handoff.',
    thread: [
      'A platform without payment paths is incomplete.',
      'But a payment page by itself is not an operating model.',
      'SkyePay ties payment to the offer and the system around it.',
      'That is where checkout becomes infrastructure.'
    ]
  },
  {
    id: 'skyenet-founder-command',
    title: 'SkyeNet',
    lane: 'Deployment and app network',
    sourceUrl: `${marketing}/platform-dossiers/skyenet.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-1.png',
    headline: 'Apps need a network, not a junk drawer.',
    kicker: 'Actual SkyeNet dossier',
    subhead: 'A deployed app network for launches, proof, handoffs, and public surfaces.',
    cta: 'Open SkyeNet',
    accent: '#8df7d4',
    caption: 'SkyeNet is the network layer for deployed surfaces. It keeps app launches, public handoffs, receipts, and platform routes from becoming a pile of unrelated links.',
    thread: [
      'Shipping many apps creates chaos fast.',
      'A network layer keeps the story organized.',
      'SkyeNet is where deployed surfaces become part of one operating system.',
      'That is the difference between links and infrastructure.'
    ]
  },
  {
    id: 'citadeldb-founder-database',
    title: 'CitadelDB',
    lane: 'Sovereign database posture',
    sourceUrl: `${marketing}/platform-dossiers/citadeldb.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-Client.png',
    headline: 'The data layer has to be owned.',
    kicker: 'Actual CitadelDB dossier',
    subhead: 'Database posture, persistence, and control for platform-grade business systems.',
    cta: 'Open CitadelDB',
    accent: '#b8ec6f',
    caption: 'CitadelDB is the data posture story. Apps are only as serious as their persistence, ownership model, and recovery path. This surface explains that layer without hiding it behind vague tech language.',
    thread: [
      'Every business system eventually becomes a data problem.',
      'Where does it live? Who controls it? How does it recover?',
      'CitadelDB is the 0S answer to that posture.',
      'The data layer has to be part of the sales story.'
    ]
  },
  {
    id: 'skyecommerce-founder-store',
    title: 'SkyeCommerce',
    lane: 'Commerce platform lane',
    sourceUrl: `${marketing}/platform-dossiers/skyecommerce.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-wide-stage.jpg',
    headline: 'Commerce should connect to the system.',
    kicker: 'Actual SkyeCommerce dossier',
    subhead: 'Storefront, catalog, offer, and fulfillment context tied back into the 0S.',
    cta: 'Open SkyeCommerce',
    accent: '#d08cff',
    caption: 'SkyeCommerce is the commerce lane for the 0S. The goal is not to clone another store builder. It is to connect products, offers, payments, proof, and business context inside the same operating model.',
    thread: [
      'A storefront is not enough.',
      'Products need context, offers need routes, and payments need proof.',
      'SkyeCommerce is the commerce lane inside the 0S.',
      'The store becomes part of the system.'
    ]
  },
  {
    id: 'skyevaultpro-founder-custody',
    title: 'SkyeVaultPro',
    lane: 'Source custody and recovery',
    sourceUrl: `${marketing}/platform-dossiers/skyevaultpro.html`,
    founderImage: 'marketing/metraiyux-0s/assets/founder-depth.png',
    headline: 'Your source deserves a custody plan.',
    kicker: 'Actual SkyeVaultPro dossier',
    subhead: 'Recovery posture, owner handoff, source custody, and proof for serious builds.',
    cta: 'Open SkyeVaultPro',
    accent: '#6fd6ff',
    caption: 'SkyeVaultPro is for the part of the business most people ignore until something breaks: source custody, recovery posture, owner handoff, and proof that the build can survive the messy parts.',
    thread: [
      'Source custody is not glamorous until it saves you.',
      'Most projects do not have a recovery posture.',
      'SkyeVaultPro makes custody and handoff part of the product story.',
      'That is how serious builds protect themselves.'
    ]
  },
  {
    id: 'skyevault-drop-founder-rescue',
    title: 'SkyeVault Drop',
    lane: 'Repo rescue and intake',
    sourceUrl: `${marketing}/platform-dossiers/skyevault-drop.html`,
    founderImage: 'marketing/metraiyux-0s/assets/gray-skyes-portrait.jpg',
    headline: 'Messy source needs a clean intake.',
    kicker: 'Actual SkyeVault Drop dossier',
    subhead: 'A rescue lane for repos, handoff material, proof packets, and source recovery.',
    cta: 'Open SkyeVault Drop',
    accent: '#f36f6f',
    caption: 'SkyeVault Drop is the rescue lane. When source material is scattered, stale, or hard to explain, the first win is clean intake: what exists, what matters, what can be recovered, and what should happen next.',
    thread: [
      'A messy repo does not need shame.',
      'It needs intake, sorting, proof, and recovery posture.',
      'SkyeVault Drop is built for that first rescue moment.',
      'Clean the source, then build forward.'
    ]
  },
  {
    id: 'relay13-founder-conversations',
    title: 'Relay13 ConnectLog',
    lane: 'Conversation and lead log',
    sourceUrl: `${marketing}/platform-dossiers/relay13-connectlog.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-room-04.jpg',
    headline: 'Leads die when conversations scatter.',
    kicker: 'Actual Relay13 dossier',
    subhead: 'A communication record lane for follow-up, context, notes, and operator handoff.',
    cta: 'Open Relay13',
    accent: '#ff8bb7',
    caption: 'Relay13 ConnectLog is for the handoff between conversation and action. Leads, notes, context, objections, and next steps should not disappear into scattered texts, emails, and DMs.',
    thread: [
      'A lead is not just a name.',
      'It is a conversation, a context, and a next step.',
      'Relay13 ConnectLog keeps that material from scattering.',
      'That is how follow-up becomes operational.'
    ]
  },
  {
    id: 'valley-verified-founder-local',
    title: 'Valley Verified',
    lane: 'Local business intelligence',
    sourceUrl: `${marketing}/platform-dossiers/valley-verified.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-POSTER_BANNER.png',
    headline: 'Local markets need real data routes.',
    kicker: 'Actual Valley Verified dossier',
    subhead: 'A local business lane for discovery, outreach, proof, and owner-friendly handoff.',
    cta: 'Open Valley Verified',
    accent: '#ffd15c',
    caption: 'Valley Verified is the local market lane. It helps turn business discovery into a usable route: who exists, what they need, what surface can help them, and how to follow up without losing the context.',
    thread: [
      'Local business outreach needs more than a spreadsheet.',
      'It needs context, proof, and a route back to the offer.',
      'Valley Verified turns local discovery into a system lane.',
      'That is where outreach becomes useful.'
    ]
  },
  {
    id: 'quantumskyes-mcp-founder-tooling',
    title: 'QuantumSkyes MCP',
    lane: 'Operator tooling and source mining',
    sourceUrl: `${marketing}/platform-dossiers/quantumskyes-mcp.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-2.png',
    headline: 'The tooling is part of the moat.',
    kicker: 'Actual MCP dossier',
    subhead: 'Repo mining, receipts, build guidance, and operator context for the system.',
    cta: 'Open QuantumSkyes MCP',
    accent: '#8df7d4',
    caption: 'QuantumSkyes MCP is the operator tooling story. It is how the repo gets mined, receipts get written, patterns get surfaced, and the build stays connected to actual project context.',
    thread: [
      'The tooling matters.',
      'A platform that cannot inspect its own context gets sloppy fast.',
      'QuantumSkyes MCP gives the work an operator layer.',
      'That is why the tooling belongs in the marketing story.'
    ]
  },
  {
    id: 'marketing-made-easy-founder-growth',
    title: 'Marketing Made Easy',
    lane: 'Growth suite',
    sourceUrl: `${marketing}/platform-dossiers/marketing-made-easy.html`,
    founderImage: 'marketing/metraiyux-0s/assets/SkyesOverLondonFounder-Client.png',
    headline: 'Marketing needs a working room.',
    kicker: 'Actual marketing suite dossier',
    subhead: 'Campaign surfaces, copy lanes, proof posture, and assets built around actual offers.',
    cta: 'Open Marketing Made Easy',
    accent: '#70d7ff',
    caption: 'Marketing Made Easy is the growth suite lane. The point is not random posts. It is matching assets, copy, proof, and follow-up to real offers and real surfaces.',
    thread: [
      'Marketing gets worse when it floats away from the product.',
      'The assets should point at real surfaces.',
      'The copy should match actual offers.',
      'That is the Marketing Made Easy lane.'
    ]
  },
  {
    id: 'ae-flowpro-founder-automation',
    title: 'AE FlowPro',
    lane: 'Automation workflow lane',
    sourceUrl: `${marketing}/platform-dossiers/ae-flowpro.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-red-portrait.jpg',
    headline: 'Automation should feel controlled.',
    kicker: 'Actual AE FlowPro dossier',
    subhead: 'A workflow lane for repeatable actions, handoffs, and operator-readable automation.',
    cta: 'Open AE FlowPro',
    accent: '#ff725e',
    caption: 'AE FlowPro is the automation lane. The selling point is not magic. It is repeatable workflow, visible handoff, and operator-readable process that helps the business move without losing control.',
    thread: [
      'Automation should not feel like a black box.',
      'It should make the work easier to understand and repeat.',
      'AE FlowPro is built around workflow clarity.',
      'Control is the real feature.'
    ]
  },
  {
    id: 'businesslaunchgo-founder-starter',
    title: 'BusinessLaunchGo',
    lane: 'New business launch kit',
    sourceUrl: `${marketing}/platform-dossiers/businesslaunchgo.html`,
    founderImage: 'marketing/metraiyux-0s/assets/founder-skyes-over-london.png',
    headline: 'A launch needs more than a homepage.',
    kicker: 'Actual BusinessLaunchGo dossier',
    subhead: 'A starter lane for turning a business idea into public surfaces and next steps.',
    cta: 'Open BusinessLaunchGo',
    accent: '#f0c76b',
    caption: 'BusinessLaunchGo is for the beginning of the business journey: public surface, offer context, contact route, proof posture, and the next operational step after the idea becomes real.',
    thread: [
      'A launch is not just a homepage.',
      'It needs offer context, contact flow, and next-step infrastructure.',
      'BusinessLaunchGo gives the starter lane a real shape.',
      'That is how ideas become operating surfaces.'
    ]
  },
  {
    id: 'skyemediacenter-founder-content',
    title: 'SkyeMediaCenter',
    lane: 'Media and content operations',
    sourceUrl: `${marketing}/platform-dossiers/skyemediacenter.html`,
    founderImage: 'marketing/metraiyux-0s/assets/media-over-london/gray-cutout.png',
    headline: 'Content needs an operating room.',
    kicker: 'Actual SkyeMediaCenter dossier',
    subhead: 'A media lane for assets, proof, content motion, and campaign-ready material.',
    cta: 'Open SkyeMediaCenter',
    accent: '#d08cff',
    caption: 'SkyeMediaCenter is where content stops being a folder of random files. It becomes assets, proof, campaign material, and public motion tied back to the operating system.',
    thread: [
      'Content is not useful just because it exists.',
      'It needs context, a campaign route, and a place to live.',
      'SkyeMediaCenter is the media operations lane.',
      'That is how assets become motion.'
    ]
  },
  {
    id: 'skyesplitengine-founder-revenue',
    title: 'SkyeSplitEngine',
    lane: 'Split logic and payout clarity',
    sourceUrl: `${marketing}/platform-dossiers/skyesplitengine.html`,
    founderImage: 'marketing/metraiyux-0s/assets/skye-music-nexus/gray-skyes-founder-cutout.png',
    headline: 'Revenue splits need clarity early.',
    kicker: 'Actual SkyeSplitEngine dossier',
    subhead: 'A split engine lane for ownership logic, payout context, and deal transparency.',
    cta: 'Open SkyeSplitEngine',
    accent: '#b8ec6f',
    caption: 'SkyeSplitEngine is about clarity before money gets messy. Splits, ownership logic, payout context, and expectations should be visible enough to prevent confusion before it becomes conflict.',
    thread: [
      'Revenue splits get messy when nobody defines the logic.',
      'The earlier the clarity, the better the partnership.',
      'SkyeSplitEngine gives that logic a platform lane.',
      'That is how payout context becomes operational.'
    ]
  }
]);

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function dataUri(filePath) {
  const absolute = path.join(repoRoot, filePath);
  const bytes = await fs.readFile(absolute);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

async function captureSurface(page, card) {
  const out = path.join(screenshotDir, `${card.id}-surface.png`);
  await page.goto(card.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1300);
  await page.screenshot({ path: out, fullPage: false, animations: 'disabled', caret: 'hide' });
  return out;
}

function cardHtml(card, surfaceSrc, founderSrc) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1080px; height: 1350px; background: #050508; }
  body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #fff7e7; }
  #card {
    position: relative;
    width: 1080px;
    height: 1350px;
    overflow: hidden;
    background:
      radial-gradient(circle at 80% 10%, color-mix(in srgb, ${card.accent} 24%, transparent), transparent 24rem),
      linear-gradient(140deg, #050508 0%, #11151d 52%, #08080b 100%);
  }
  #card::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 72px 72px;
    opacity: .42;
  }
  .wrap { position: relative; z-index: 1; height: 100%; padding: 46px; display: grid; grid-template-rows: 626px 1fr; gap: 28px; }
  .browser {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 30px;
    background: #080b11;
    box-shadow: 0 28px 72px rgba(0,0,0,.48);
  }
  .chrome { height: 58px; display: flex; align-items: center; gap: 12px; padding: 0 24px; background: rgba(255,255,255,.08); }
  .dot { width: 15px; height: 15px; border-radius: 50%; }
  .dot:nth-child(1) { background: #ff5f57; }
  .dot:nth-child(2) { background: #febc2e; }
  .dot:nth-child(3) { background: #28c840; }
  .url { margin-left: 14px; color: rgba(255,255,255,.7); font: 800 17px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .screen { width: 100%; height: 568px; display: block; object-fit: cover; object-position: top center; }
  .bottom { display: grid; grid-template-columns: 366px minmax(0, 1fr); gap: 28px; min-height: 0; }
  .founder {
    position: relative;
    overflow: hidden;
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,.18);
    background: #080b11;
    box-shadow: 0 22px 56px rgba(0,0,0,.4);
  }
  .founder img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: center top; }
  .founder::after { content: ""; position: absolute; inset: 0; box-shadow: inset 0 -120px 140px rgba(0,0,0,.42); }
  .copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 30px;
    padding: 30px;
    background: linear-gradient(145deg, rgba(255,255,255,.1), rgba(255,255,255,.035));
    box-shadow: 0 22px 56px rgba(0,0,0,.32);
  }
  .kicker { color: ${card.accent}; font-size: 20px; font-weight: 950; letter-spacing: .13em; text-transform: uppercase; }
  h1 { margin: 18px 0 0; max-width: 520px; color: #fff8e8; font-size: 54px; line-height: .98; letter-spacing: 0; }
  .subhead { margin: 22px 0 0; max-width: 520px; color: rgba(239,244,248,.82); font-size: 25px; line-height: 1.28; font-weight: 720; }
  .meta { display: grid; gap: 12px; margin-top: 26px; }
  .pill { display: inline-flex; width: fit-content; max-width: 100%; align-items: center; min-height: 40px; border: 1px solid rgba(255,255,255,.15); border-radius: 999px; padding: 9px 14px; color: rgba(255,255,255,.78); background: rgba(0,0,0,.24); font-size: 17px; font-weight: 900; }
  .cta { margin-top: 24px; border-radius: 22px; padding: 19px 20px; color: #050508; background: ${card.accent}; font-size: 24px; font-weight: 950; line-height: 1.12; }
  .footer { position: absolute; left: 46px; right: 46px; bottom: 24px; display: flex; justify-content: space-between; gap: 20px; color: rgba(255,255,255,.62); font-size: 17px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
</style>
</head>
<body>
<main id="card">
  <div class="wrap">
    <section class="browser" aria-label="${esc(card.title)} captured surface">
      <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${esc(card.sourceUrl.replace(/^https?:\/\//, ''))}</span></div>
      <img class="screen" src="${surfaceSrc}" alt="${esc(card.title)} live page screenshot">
    </section>
    <section class="bottom">
      <div class="founder"><img src="${founderSrc}" alt="Gray London Skyes founder image"></div>
      <div class="copy">
        <div>
          <div class="kicker">${esc(card.kicker)}</div>
          <h1>${esc(card.headline)}</h1>
          <p class="subhead">${esc(card.subhead)}</p>
          <div class="meta">
            <span class="pill">${esc(card.title)}</span>
            <span class="pill">${esc(card.lane)}</span>
          </div>
        </div>
        <div class="cta">${esc(card.cta)}</div>
      </div>
    </section>
  </div>
  <div class="footer"><span>Gray London Skyes</span><span>Actual surface capture</span></div>
</main>
</body>
</html>`;
}

function renderCopyPack(records) {
  const lines = [
    '# Real Surface Founder Campaign Pack',
    '',
    'Curated posts paired with live/current screenshots and multiple Gray London Skyes founder images. These are the featured assets for social posting; the older generated composite batch is retained only as archive material.',
    ''
  ];

  records.forEach((record, index) => {
    lines.push(`## ${index + 1}. ${record.title} - ${record.lane}`);
    lines.push('');
    lines.push(`Visual: ${record.file}`);
    lines.push(`Source surface: ${record.sourceUrl}`);
    lines.push(`Founder image: ${record.founderImage}`);
    lines.push('');
    lines.push('### LinkedIn / Facebook');
    lines.push(record.caption);
    lines.push('');
    lines.push(`CTA: ${record.cta} - ${record.sourceUrl}`);
    lines.push('');
    lines.push('### Instagram caption');
    lines.push(`${record.headline} ${record.subhead} ${record.caption}`);
    lines.push('');
    lines.push('### X thread');
    record.thread.forEach((item, threadIndex) => {
      lines.push(`${threadIndex + 1}/${record.thread.length} ${item}`);
    });
    lines.push('');
    lines.push('### Hashtags');
    lines.push('#MetrAIyux #GrayLondonSkyes #FounderLed #SmallBusinessSystems #Automation #ProofOfWork #SkyeNet');
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(contentDir, { recursive: true });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const captureContext = await browser.newContext({
    viewport: { width: 1600, height: 950 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true
  });
  const capturePage = await captureContext.newPage();

  const renderContext = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1
  });
  const renderPage = await renderContext.newPage();

  const records = [];
  const failures = [];

  for (const card of cards) {
    try {
      const screenshot = await captureSurface(capturePage, card);
      const surfaceSrc = await dataUri(rel(screenshot));
      const founderSrc = await dataUri(card.founderImage);
      await renderPage.setContent(cardHtml(card, surfaceSrc, founderSrc), { waitUntil: 'load' });
      await renderPage.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
      const filePath = path.join(outDir, `${card.id}.png`);
      await renderPage.locator('#card').screenshot({ path: filePath, animations: 'disabled', caret: 'hide' });
      records.push({
        ...card,
        file: `assets/social/real-surfaces/${card.id}.png`,
        screenshot: `assets/social/real-surfaces/screenshots/${card.id}-surface.png`,
        generatedFrom: 'live/current surface screenshot plus repo founder image',
        dimensions: '1080x1350'
      });
    } catch (error) {
      failures.push({ id: card.id, sourceUrl: card.sourceUrl, error: error.message });
    }
  }

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: records.length,
    source: 'Curated real screenshot + founder image social cards generated from public surfaces and repository founder photos.',
    screenshotCapture: {
      explicitOwnerRequest: true,
      purpose: 'asset creation, not browser proof',
      viewport: '1600x950'
    },
    cards: records
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(copyPackPath, renderCopyPack(records));
  await fs.writeFile(receiptPath, `${JSON.stringify({
    ok: failures.length === 0,
    generatedAt: manifest.generatedAt,
    count: records.length,
    failures,
    manifestPath: rel(manifestPath),
    copyPackPath: rel(copyPackPath),
    receiptPath: rel(receiptPath)
  }, null, 2)}\n`);

  console.log(JSON.stringify({ ok: failures.length === 0, count: records.length, failures, manifestPath: rel(manifestPath), copyPackPath: rel(copyPackPath), receiptPath: rel(receiptPath) }, null, 2));

  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
