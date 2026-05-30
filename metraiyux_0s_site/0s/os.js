import { animate as motionAnimate } from "motion";
import { animate as framerAnimate } from "framer-motion";

const SITE_ROOT = "/workspaces/MetrAIyux-0S/metraiyux_0s_site/";

const SOUNDTRACK = [
  {
    id: "founder-command",
    title: "Founder Command / Founder Static",
    artist: "Gray Skyes",
    src: "/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/founder-static/audio/founder-static.mp3"
  },
  {
    id: "everything-movie-act-i",
    title: "Everything Movie Act I: Birth of Static",
    artist: "Gray Skyes",
    src: "/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/everything-movie-act-i-birth-of-static/audio/everything-movie-act-i-birth-of-static.mp3"
  },
  {
    id: "everything-movie-act-ii",
    title: "Everything Movie Act II: Gate Argument",
    artist: "Gray Skyes",
    src: "/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/everything-movie-act-ii-gate-argument/audio/everything-movie-act-ii-gate-argument.mp3"
  },
  {
    id: "everything-movie-act-iii",
    title: "Everything Movie Act III: Betrayal Parade",
    artist: "Gray Skyes",
    src: "/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/everything-movie-act-iii-betrayal-parade/audio/everything-movie-act-iii-betrayal-parade.mp3"
  },
  {
    id: "everything-movie-act-iv",
    title: "Everything Movie Act IV: Founder Walkout",
    artist: "Gray Skyes",
    src: "/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/everything-movie-act-iv-founder-walkout/audio/everything-movie-act-iv-founder-walkout.mp3"
  }
];

const CUSTOMER_PATH_STEPS = [
  {
    step: "01",
    title: "Show the business its landing experience",
    text: "Open the client-facing profile, app preview, or pitch page first. The offer is simple: the business can keep it, edit it, or ask for removal.",
    actions: [
      { label: "Open Free Stack Pitch", route: "free-stack-pitch" },
      { label: "Open Print Flyer", route: "free-stack-flyer" },
      { label: "Open Valley Verified", route: "valley-verified" },
      { label: "Open SkyeNet Valley", route: "valley-verified-skynet" },
      { label: "Open Business Card Factory", route: "business-card-factory" }
    ]
  },
  {
    step: "02",
    title: "Claim the free workspace",
    text: "Move the owner into the shared 0S gate so their workspace, SkyEmail, CRM, chat, and proof events all stay under one identity lane.",
    actions: [
      { label: "Start Gate Signup", route: "gate-signup" },
      { label: "Open Customer SaaS", route: "saas" }
    ]
  },
  {
    step: "03",
    title: "Activate team communication",
    text: "ConnectLog and Relay13 give the team a live relationship/chat lane with room to grow into managed inbox and AI response upgrades.",
    actions: [
      { label: "Open ConnectLog", route: "connectlog" },
      { label: "Open Relay13", route: "relay13" }
    ]
  },
  {
    step: "04",
    title: "Hand them the business inbox",
    text: "SkyeMail provides the real inbox/outbox lane. Handles can stay on the current SkyEmail domain now and move to custom-domain mail later.",
    actions: [
      { label: "Open SkyeMail", route: "skyemail" },
      { label: "Open SkyGate", route: "gate" }
    ]
  },
  {
    step: "05",
    title: "Run the CRM and backup promise",
    text: "AE-FlowPro tracks leads and follow-up. CitadelDB backup posture turns the free workspace into a serious business asset.",
    actions: [
      { label: "Open AE-FlowPro", route: "ae-flowpro" },
      { label: "Open Founder Command", route: "founder-command" }
    ]
  },
  {
    step: "06",
    title: "Let the upgrades appear naturally",
    text: "The offer engine shows ads, managed workspace, content, video, commerce, custom mail, and higher-capacity lanes only when the buyer needs them.",
    actions: [
      { label: "Open Offer Engine", launch: "offer-engine" },
      { label: "Open 0S Browser", launch: "browser" }
    ]
  }
];

const FREE_STACK = [
  {
    title: "Landing / app experience",
    included: "Client-facing page, profile, QR pitch handoff, and edit-or-remove path.",
    limit: "Free first activation; deeper campaign work becomes a managed growth lane.",
    route: "free-stack-pitch"
  },
  {
    title: "ConnectLog + Relay13",
    included: "Team relationship workspace, live rooms, inbox bridge, and owner-reviewed messaging path.",
    limit: "Free workspace limits apply; upgrades add seats, history, AI response, and managed inbox.",
    route: "connectlog"
  },
  {
    title: "SkyeMail",
    included: "Business inbox/outbox lane with a reserved SkyEmail handle, rename request path, and confirmation routing.",
    limit: "Current handles stay on the SkyEmail domain and confirmed changes persist; custom domain mail can become a paid setup.",
    route: "skyemail"
  },
  {
    title: "AE-FlowPro CRM",
    included: "Lead board, follow-up rail, close path, snapshots, and activation packs.",
    limit: "Free use covers the starter workspace; managed AE operations and automations upgrade.",
    route: "ae-flowpro"
  },
  {
    title: "CitadelDB backup posture",
    included: "Biweekly backup promise for the free workspace where the lane is activated.",
    limit: "Daily backup, restore drills, and compliance retention become managed infrastructure.",
    route: "citadeldb"
  },
  {
    title: "0S Browser shell",
    included: "Fullscreen installable launcher for owned apps, routes, and customer workspaces.",
    limit: "Desktop packaging, branded browser builds, and device rollout are custom infrastructure.",
    launch: "browser"
  }
];

const REVENUE_LANES = [
  {
    title: "Free Business Stack",
    badge: "front-door offer",
    free: "Landing/app experience, workspace claim, ConnectLog/Relay13 room, SkyeMail, AE-FlowPro, and biweekly CitadelDB backup posture.",
    upgrade: "Managed AE, daily backups, more seats, more message history, custom domains, and higher-capacity workspace operations.",
    routes: ["free-stack-pitch", "free-stack-flyer", "customer-path", "gate-signup", "saas"]
  },
  {
    title: "Valley Verified Exposure",
    badge: "ad system",
    free: "Business profile, featured proof route, app-build examples, and QR pitch handoff.",
    upgrade: "Sponsored placement, category boosts, lead-routing, local ads, and managed profile upgrades.",
    routes: ["valley-verified-skynet", "valley-verified", "../valley-verified/advertise/", "../valley-verified/sponsor/"]
  },
  {
    title: "Owned Messaging",
    badge: "chat + inbox",
    free: "ConnectLog workspace, Relay13 preview, relationship memory, and live team rooms where activated.",
    upgrade: "AI response starter, managed inbox, higher message caps, priority follow-up, and operator review.",
    routes: ["connectlog", "relay13", "relay13-inbox"]
  },
  {
    title: "SkyeMail + Domain Mail",
    badge: "mail lane",
    free: "SkyEmail handle, inbox/outbox, mailbox proof, and owner notification routing.",
    upgrade: "Custom domain mail, extra aliases, higher send volume, mailbox migration, and managed setup.",
    routes: ["skyemail", "gate"]
  },
  {
    title: "AE Flow CRM",
    badge: "sales ops",
    free: "Lead flow, offer queue, follow-up rail, AE proof, close path, snapshots, and activation packs.",
    upgrade: "Managed AE, automations, campaign sprints, daily reporting, and done-for-you pipeline cleanup.",
    routes: ["ae-flowpro", "businesslaunchgo"]
  },
  {
    title: "Marketing + Media",
    badge: "growth engine",
    free: "Marketing Made Easy, Media Center, Content Forge, document tools, brand tools, and intake paths.",
    upgrade: "Custom video, cinematic logo assets, content calendars, ad creative, managed publishing, and launch campaigns.",
    routes: ["marketing", "media", "content-forge", "skyedocxmax"]
  },
  {
    title: "Commerce + Payments",
    badge: "checkout",
    free: "SkyePay offer routing and storefront-ready lanes inside the 0S catalog.",
    upgrade: "SkyeCommerce setup, recurring plans, product pages, checkout wiring, inventory, and payout reporting.",
    routes: ["skyecommerce", "pricing", "../sales/pricing-offer-router.html"]
  },
  {
    title: "Creator + Music Ops",
    badge: "music",
    free: "SkyeMusicNexus Lite, drops, discover, feed, upload, player, and artist stage routes.",
    upgrade: "EPK pages, paid drops, release content kits, visualizers, managed campaigns, and artist universe builds.",
    routes: ["music", "music-drops", "music-discover", "music-feed"]
  },
  {
    title: "Operations + Workforce",
    badge: "ops",
    free: "SkyeRouteX, HouseOperations, Split Engine, Profit Console, and proof-safe work lanes.",
    upgrade: "Managed dispatch, workforce command, routing ops, money-move support, and operations reporting.",
    routes: ["routex", "houseoperations", "split", "profit"]
  },
  {
    title: "Sovereign Infrastructure",
    badge: "owned stack",
    free: "Shared 0S/SkyGate auth, SkyeVaultOS, SkyeBox, company knowledge, and protected event proof.",
    upgrade: "Custom gate policies, restore points, white-label lanes, staff training, and dedicated operator support.",
    routes: ["gate", "skyevaultos", "company-knowledge", "skyebox-authenticator"]
  }
];

const TIER_OPTIONS = [
  {
    name: "Free Claim Stack",
    price: "$0 first claim",
    text: "The door opener: give the owner immediate value without making them decode the platform.",
    includes: ["Landing/app experience", "Workspace claim", "ConnectLog + Relay13", "SkyeMail", "AE-FlowPro", "Biweekly backup posture"]
  },
  {
    name: "Starter Command",
    price: "$397/mo + $1,500 setup",
    text: "The first clean upgrade when a business wants the workspace operated instead of only claimed.",
    includes: ["1 workspace", "ConnectLog seat", "Relay13 ready", "SkyeBox vault", "HouseOps preview", "Proof receipts"]
  },
  {
    name: "Growth Cabinet",
    price: "$997/mo + $3,500 setup",
    text: "The main small-business money lane after the free stack proves value.",
    includes: ["3 workspaces", "3 ConnectLog seats", "Relay13 workspace", "HouseOps workspace", "3 SkyeBox vaults", "Weekly review"]
  },
  {
    name: "Autonomous Office",
    price: "$2,497/mo + $7,500 setup",
    text: "For buyers who need managed workflows, approval inboxes, digests, owned messaging, and deeper connector readiness.",
    includes: ["8 workspaces", "8 ConnectLog seats", "3 Relay13 workspaces", "Managed HouseOps", "8 SkyeBox vaults", "Operating digests"]
  },
  {
    name: "Enterprise / Managed Gate",
    price: "$3,997/mo + $15,000 setup",
    text: "For bigger customers that want the 0S shaped around their domain, staff, policies, and operating model.",
    includes: ["Custom limits", "Custom gate policy", "Managed Relay13", "White-label scope", "Training packet", "Written terms"]
  }
];

const PRODUCT_ADS = [
  {
    slot: "start free",
    title: "Free Business Stack",
    text: "Client-facing pitch plus landing, workspace, live rooms, SkyEmail, CRM, and backup posture in one guided claim path.",
    route: "free-stack-pitch"
  },
  {
    slot: "leave behind",
    title: "QR Flyer",
    text: "Printable handout with QR links for the full pitch page and the installable 0S Browser workspace lane.",
    route: "free-stack-flyer"
  },
  {
    slot: "natural upgrade",
    title: "Valley Verified Exposure",
    text: "The SkyeNet rebuild keeps the heavy client-facing landings separate while the 0S keeps discovery and operator routing.",
    route: "valley-verified-skynet"
  },
  {
    slot: "owned browser",
    title: "0S Browser",
    text: "Installable fullscreen app browser for your own hosted apps, customer workspaces, and offer routes.",
    launch: "browser"
  },
  {
    slot: "current offers",
    title: "Pricing Router",
    text: "Approved plans, Free99 boundaries, SkyePay handoffs, quote-only lanes, and add-on paths in one place.",
    route: "pricing"
  }
];

const AD_PLACEMENTS = [
  {
    title: "Lobby takeover",
    text: "The first window pushes Start Here, Offer Engine, and 0S Browser before the wider app grid.",
    action: { label: "Open Lobby", launch: "command" }
  },
  {
    title: "Browser home rail",
    text: "Every route search starts beside the free stack, Valley Verified, and owned-browser offer cards.",
    action: { label: "Open Browser", launch: "browser" }
  },
  {
    title: "Customer path close",
    text: "The free promise ends with the next paid lane already framed as a useful continuation.",
    action: { label: "Start Path", launch: "customer-path" }
  },
  {
    title: "Offer search",
    text: "The searchable money map keeps every product lane discoverable without dumping a customer into raw pricing.",
    action: { label: "Open Offers", launch: "offer-engine" }
  }
];

const PLATFORM_GROUPS = [
  {
    title: "Client Acquisition",
    text: "Walk-in sales, QR handoff, local discovery, custom app previews, and proof-backed landing experiences.",
    apps: ["free-stack-pitch", "free-stack-flyer", "valley-verified-skynet", "valley-verified", "business-card-factory", "pricing", "skyewebcreatormax", "webgrowthoperator", "arizona-growth-index"]
  },
  {
    title: "Workspace + Messaging",
    text: "Shared gate signup, ConnectLog, Relay13, SkyeMail, inbox proof, and owner-visible customer communications.",
    apps: ["gate-signup", "connectlog", "relay13", "relay13-inbox", "skyemail", "gate"]
  },
  {
    title: "Sales Operations",
    text: "CRM follow-up, lead boards, AE support, campaign queues, business launch packs, and operator command review.",
    apps: ["ae-flowpro", "businesslaunchgo", "pricing", "commercial-terms", "founder-command", "0s-command-bridge", "marketing"]
  },
  {
    title: "Commerce + Money",
    text: "Storefronts, checkout lanes, offer routing, splits, profit tracking, subscriptions, and payout visibility.",
    apps: ["skyecommerce", "kaixu-storefront", "split", "profit"]
  },
  {
    title: "Media + Creator Stack",
    text: "Content Forge, media review, music drops, artist storefronts, publishing rooms, and release operations.",
    apps: ["content-forge", "media", "music", "music-drops", "music-feed", "devisional-riftx"]
  },
  {
    title: "Sovereign Infrastructure",
    text: "Vaults, CitadelDB posture, company knowledge, error capture, deploy lanes, authenticators, and API controls.",
    apps: ["citadeldb", "skyevaultos", "skyevaultpro", "company-knowledge", "skyerrors", "skyenet", "skyeapi-aegiscore"]
  }
];

const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const APP_DEFS = [
  {
    id: "command",
    name: "Command Center",
    icon: "0S",
    kind: "system",
    summary: "Launcher status, active windows, and first-run command tiles.",
    view: "dashboard",
    dock: true,
    size: [900, 600]
  },
  {
    id: "customer-path",
    name: "Start Here",
    icon: "GO",
    kind: "customer path",
    summary: "Guided customer launch path for the free stack, workspace claim, chat, mail, CRM, backups, and natural upgrades.",
    view: "customer-path",
    dock: true,
    size: [1080, 720]
  },
  {
    id: "offer-engine",
    name: "Offer Engine",
    icon: "AD",
    kind: "revenue",
    summary: "0S product/ad rail that explains free value, upgrade lanes, platform inventory, and tier options without stale pricing.",
    view: "offer-engine",
    dock: true,
    size: [1080, 720]
  },
  {
    id: "terminal",
    name: "0S Terminal",
    icon: ">_",
    kind: "shell",
    summary: "Interactive launcher shell for panels, mounted routes, live surfaces, and the repo command allowlist.",
    view: "terminal",
    dock: true,
    size: [860, 540]
  },
  {
    id: "browser",
    name: "0S Browser",
    icon: "0B",
    kind: "navigator",
    summary: "Top-level 0S route navigator for mounted apps, local paths, and external URLs.",
    view: "browser",
    dock: true,
    size: [920, 600]
  },
  {
    id: "atlas",
    name: "Surface Atlas",
    icon: "AT",
    kind: "registry",
    summary: "Mounted apps and live surfaces routed by the 0S desktop.",
    view: "atlas",
    dock: true,
    size: [980, 640]
  },
  {
    id: "commands",
    name: "Command Registry",
    icon: "CM",
    kind: "registry",
    summary: "Repo-local operator commands exposed as safe command IDs.",
    view: "commands",
    dock: true,
    size: [940, 600]
  },
  {
    id: "gate-signup",
    name: "Gate Signup",
    icon: "ID",
    kind: "core",
    summary: "Canonical 0S signup with Skye ID, SkyEmail, profile, phone, and shared Gate session.",
    url: "../gate/signup/",
    dock: true,
    size: [980, 720]
  },
  {
    id: "skyemail",
    name: "SkyeMail",
    icon: "SM",
    kind: "core",
    summary: "Gate-bound mailbox, vault key setup, hosted mailbox provisioning, inbox, compose, and proof relay.",
    url: "../live/SkyeMail/index.html",
    dock: true,
    size: [1060, 720]
  },
  {
    id: "admin",
    name: "Admin OS",
    icon: "AD",
    kind: "wrapped",
    summary: "Owner-admin command surface.",
    url: "../admin/index.html",
    dock: true,
    size: [1080, 720]
  },
  {
    id: "operator",
    name: "Operator",
    icon: "OP",
    kind: "wrapped",
    summary: "Operator control lane.",
    url: "../operator/index.html",
    dock: true,
    size: [1040, 680]
  },
  {
    id: "skyenet",
    name: "SkyeNet Deploy",
    icon: "SN",
    kind: "gated platform",
    summary: "Drop-build hosting, route registry, observability, and internal cost controls.",
    url: "../skyenet/index.html",
    dock: true,
    size: [1100, 720]
  },
  {
    id: "founder-calendar",
    name: "SuperIDE SkyeCalendar",
    icon: "CL",
    kind: "founder",
    summary: "Copied SuperIDE calendar mounted through Founder Command, backed by the 0S ledger, shared gate, local shadow sync, and ICS export.",
    url: "../founder-command/apps/0s-calendar/index.html",
    dock: true,
    size: [1120, 740]
  },
  {
    id: "founder-command",
    name: "Founder Command",
    icon: "FC",
    kind: "founder",
    summary: "Founder command center for owner workspace oversight, command bridge review, reminders, and operational control.",
    url: "../founder-command/index.html",
    dock: false,
    size: [1120, 740]
  },
  {
    id: "business-card-factory",
    name: "Business Card Factory",
    icon: "QR",
    kind: "sales",
    summary: "Flyer, QR, card, and handoff factory for walking into a business with a client-facing offer.",
    url: "../business-card-factory/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "free-stack-pitch",
    name: "Free Stack Pitch",
    icon: "FS",
    kind: "sales",
    summary: "Client-facing free business stack pitch for landing, workspace, live rooms, SkyeMail, CRM, backup posture, limits, and upgrades.",
    url: "../sales/free-business-stack.html",
    dock: false,
    size: [1120, 740]
  },
  {
    id: "free-stack-flyer",
    name: "Free Stack Flyer",
    icon: "FL",
    kind: "sales",
    summary: "Printable leave-behind flyer with QR links to the full pitch page and 0S Browser workspace launcher.",
    url: "../sales/free-business-stack-flyer.html",
    dock: false,
    size: [980, 720]
  },
  {
    id: "citadeldb",
    name: "CitadelDB",
    icon: "DB",
    kind: "infra",
    summary: "Database and backup posture lane for workspace evidence, tenant state, and operational receipts.",
    url: "../citadeldb/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "company-knowledge",
    name: "Company Knowledge",
    icon: "CK",
    kind: "infra",
    summary: "Company knowledge console for platform memory and tenant-scoped knowledge bases under the shared gate.",
    url: "../admin/company-knowledge.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyevaultos",
    name: "SkyeVaultOS",
    icon: "VO",
    kind: "infra",
    summary: "Vault proof lane for scan, offload, inventory, search, restore points, grants, revokes, audit, and proof.",
    url: "../skye-vault-os/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyecommerce",
    name: "SkyeCommerce",
    icon: "SC",
    kind: "commerce",
    summary: "Owned commerce lane for storefront, catalog, checkout, merchant operations, orders, subscriptions, and payout reporting.",
    url: "../SkyeCommerce/",
    dock: false,
    size: [1120, 740]
  },
  {
    id: "brain",
    name: "Cabinet Brain",
    icon: "BR",
    kind: "wrapped",
    summary: "Local brain and cabinet memory.",
    url: "../local-brain.html",
    dock: true,
    size: [980, 640]
  },
  {
    id: "neural",
    name: "Neural Map",
    icon: "NM",
    kind: "wrapped",
    summary: "Public-safe neural map.",
    url: "../neural-map.html",
    dock: true,
    size: [1060, 700]
  },
  {
    id: "saas",
    name: "Customer SaaS",
    icon: "SA",
    kind: "wrapped",
    summary: "Customer-facing SaaS entry.",
    url: "../saas/index.html",
    dock: true,
    size: [1020, 680]
  },
  {
    id: "pricing",
    name: "Pricing Router",
    icon: "$",
    kind: "sales",
    summary: "Current sales router for approved plans, Free99 boundaries, SkyePay handoffs, quote-only lanes, and add-ons.",
    url: "../sales/pricing-offer-router.html",
    dock: false,
    size: [1120, 740]
  },
  {
    id: "commercial-terms",
    name: "Commercial Terms",
    icon: "CT",
    kind: "sales",
    summary: "Long-form pricing, limits, billing rules, and public commercial terms.",
    url: "../pricing/index.html",
    dock: false,
    size: [1120, 740]
  },
  {
    id: "music",
    name: "SkyeMusicNexus",
    icon: "MU",
    kind: "wrapped",
    summary: "Music platform lane.",
    url: "../SkyeMusicNexus/index.html",
    dock: true,
    size: [1040, 680]
  },
  {
    id: "music-artist-stage",
    name: "SkyeMusicNexus Artist Stage",
    icon: "MS",
    kind: "music",
    summary: "Artist registration, release forge, content requests, community signals, achievements, campaigns, royalty motion, and records.",
    url: "../SkyeMusicNexus/public/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-operator-stage",
    name: "SkyeMusicNexus Operator Stage",
    icon: "MO",
    kind: "music",
    summary: "Operator controls for review, publishing, exchange console, payout, analytics, workflow, and capsule-wall proof.",
    url: "../SkyeMusicNexus/public/admin.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-daw",
    name: "Music DAW",
    icon: "DAW",
    kind: "music",
    summary: "Audio import, keyboard notes, pads, tracks, mixer, and release-packet handoff.",
    url: "../SkyeMusicNexus/public/daw.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-upload",
    name: "Music Upload",
    icon: "UP",
    kind: "music",
    summary: "Upload studio for music assets and release material.",
    url: "../SkyeMusicNexus/public/upload.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-drops",
    name: "Music Drops",
    icon: "DR",
    kind: "music",
    summary: "Single, album, campaign, private delivery, approval queue, and publish batching room.",
    url: "../SkyeMusicNexus/public/drops.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-releases",
    name: "Music Releases",
    icon: "MR",
    kind: "music",
    summary: "Release records and music publishing route.",
    url: "../SkyeMusicNexus/public/releases.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-rights",
    name: "Music Rights",
    icon: "RT",
    kind: "music",
    summary: "Rights and royalty routing for music operations.",
    url: "../SkyeMusicNexus/public/rights.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-exchange",
    name: "Music Exchange",
    icon: "EX",
    kind: "music",
    summary: "Content request exchange and collaboration route.",
    url: "../SkyeMusicNexus/public/exchange.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-feed",
    name: "Music Feed",
    icon: "FD",
    kind: "music",
    summary: "Artist social surface with posts, drops, reactions, community relay, achievements, and campaign signals.",
    url: "../SkyeMusicNexus/public/feed.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-discover",
    name: "Music Discover",
    icon: "DI",
    kind: "music",
    summary: "Listener-facing discovery graph, playlist rails, release lanes, previews, and player routing.",
    url: "../SkyeMusicNexus/public/discover.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-player",
    name: "Music Player",
    icon: "PL",
    kind: "music",
    summary: "Music playback surface.",
    url: "../SkyeMusicNexus/public/player.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-exports",
    name: "Music Exports",
    icon: "MX",
    kind: "music",
    summary: "Export room for music records and handoff packets.",
    url: "../SkyeMusicNexus/public/exports.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "music-stems",
    name: "Music Stems",
    icon: "ST",
    kind: "music",
    summary: "Stem and audio-material route for SkyeMusicNexus.",
    url: "../SkyeMusicNexus/public/stems.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "routex",
    name: "SkyeRouteX",
    icon: "RX",
    kind: "wrapped",
    summary: "Workforce command lane.",
    url: "../SkyeRouteX/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "routex-workforce-command",
    name: "SkyeRouteX Workforce Command",
    icon: "RX",
    kind: "routex",
    summary: "Canonical provider, contractor, House Command, proof, payment-state, export, and audit workspace.",
    url: "../SkyeRouteX/workforce-command-v0.4.0/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "profit",
    name: "Profit Console",
    icon: "PC",
    kind: "wrapped",
    summary: "Profit pack and split field.",
    url: "../SkyeProfitConsole/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "media",
    name: "Media Center",
    icon: "MC",
    kind: "wrapped",
    summary: "Media intake, review, and dispatch.",
    url: "../SkyeMediaCenter/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "split",
    name: "Split Engine",
    icon: "SE",
    kind: "wrapped",
    summary: "Free99 commission and payout split engine.",
    url: "../SkyeSplitEngine/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "marketing",
    name: "Marketing Suite",
    icon: "ME",
    kind: "wrapped",
    summary: "Marketing Made Easy growth suite.",
    url: "../Marketing-Made-Easy/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "content-forge",
    name: "Skye Content Forge",
    icon: "CF",
    kind: "wrapped",
    summary: "Approved-source scanning, original generation, drafts, export, scheduler, backup, and deployment hooks.",
    url: "../live/skye-content-forge-publisher.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "houseoperations",
    name: "HouseOperations",
    icon: "HO",
    kind: "wrapped",
    summary: "House command workspace with tasks, vendors, schedule, alerts, assignments, and proof controls.",
    url: "../HouseOperations/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "houseoperations-skyebox",
    name: "HouseOperations SkyeBox",
    icon: "HB",
    kind: "wrapped",
    summary: "Encrypted authenticator custody vault launched from the single canonical Free99 app.",
    url: "../Free99/apps/skyebox-authenticator/index.html",
    dock: false,
    size: [980, 640]
  },
  {
    id: "connectlog",
    name: "ConnectLog",
    icon: "CL",
    kind: "wrapped",
    summary: "Private relationship workspace, QR exchange, follow-up discipline, and Relay13 bridge panel.",
    url: "../connectlog-v7.7-relay13-operator-proof/app.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "relay13",
    name: "Relay13 Preview",
    icon: "R13",
    kind: "wrapped",
    summary: "Messaging platform surface, operator console, Worker proof routes, request ledgers, and activation proof.",
    url: "../relay13-core-v1.7-connectlog-operator-proof/public/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "relay13-inbox",
    name: "Relay13 Inbox",
    icon: "RI",
    kind: "wrapped",
    summary: "Relay13 inbox and message operations.",
    url: "../connectlog-v7.7-relay13-operator-proof/relay13-inbox.html",
    dock: false,
    size: [980, 640]
  },
  {
    id: "ae-flowpro",
    name: "AE-FlowPro",
    icon: "AE",
    kind: "marketing",
    summary: "Lead flow, offer queue, follow-up rail, AE proof, close path, recovery journal, snapshots, and activation packs.",
    url: "../Marketing-Made-Easy/AE-FlowPro/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "brandid-offline",
    name: "BrandID Offline PWA",
    icon: "BI",
    kind: "marketing",
    summary: "Offline-first brand identity generator with SVG export, PWA shell, outbox controls, and handoff packets.",
    url: "../Marketing-Made-Easy/BrandID-Offline-PWA/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "businesslaunchgo",
    name: "BusinessLaunchGo",
    icon: "BL",
    kind: "marketing",
    summary: "Arizona launch pack generator with browser-local packs, PDF/ZIP export, form markup, hooks, and runtime records.",
    url: "../Marketing-Made-Easy/BusinessLaunchGo/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocxmax",
    name: "SkyeDocxMax",
    icon: "DX",
    kind: "marketing",
    summary: "Offline-first private document editor, encrypted vault, packages, journal, draft recovery, and static PWA proof.",
    url: "../Marketing-Made-Easy/SkyeDocxMax/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocxmax-editor",
    name: "SkyeDocxMax Editor",
    icon: "DE",
    kind: "marketing",
    summary: "Direct document editor room for SkyeDocxMax.",
    url: "../Marketing-Made-Easy/SkyeDocxMax/editor.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocxmax-documents",
    name: "SkyeDocxMax Documents",
    icon: "DD",
    kind: "marketing",
    summary: "Document library and document-control route for SkyeDocxMax.",
    url: "../Marketing-Made-Easy/SkyeDocxMax/documents.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocxmax-templates",
    name: "SkyeDocxMax Templates",
    icon: "DT",
    kind: "marketing",
    summary: "Template room for SkyeDocxMax document generation.",
    url: "../Marketing-Made-Easy/SkyeDocxMax/templates.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocxmax-exports",
    name: "SkyeDocxMax Exports",
    icon: "DX",
    kind: "marketing",
    summary: "Export route for SkyeDocxMax.",
    url: "../Marketing-Made-Easy/SkyeDocxMax/exports.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocxmax-packages",
    name: "SkyeDocxMax Packages",
    icon: "DP",
    kind: "marketing",
    summary: "Local package import/export route for SkyeDocxMax.",
    url: "../Marketing-Made-Easy/SkyeDocxMax/packages.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyedocx-blog",
    name: "SkyeDocx Blog",
    icon: "DB",
    kind: "marketing",
    summary: "SuperIDE SkyeBlog editorial package lane promoted into 0S for SkyeDocxMax, SovereignDocs, DeVisional Riftx, SkyPay, and SkyeNet handoffs.",
    url: "../Marketing-Made-Easy/SkyeDocxBlog/index.html",
    dock: false,
    size: [1120, 720]
  },
  {
    id: "skyewebcreatormax",
    name: "SkyeWebCreatorMax",
    icon: "WC",
    kind: "marketing",
    summary: "Website, UI, app-shell, and 3D web creation surface.",
    url: "../Marketing-Made-Easy/SkyeWebCreatorMax/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyewebcreatormax-builder",
    name: "SkyeWebCreatorMax Builder",
    icon: "WB",
    kind: "marketing",
    summary: "Direct web and app builder room.",
    url: "../Marketing-Made-Easy/SkyeWebCreatorMax/builder.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyewebcreatormax-workspace",
    name: "SkyeWebCreatorMax Workspace",
    icon: "WW",
    kind: "marketing",
    summary: "Builder workspace for briefs, previews, delivery, review, execution, and dispatch.",
    url: "../Marketing-Made-Easy/SkyeWebCreatorMax/builder-workspace.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyewebcreatormax-preview",
    name: "SkyeWebCreatorMax Preview",
    icon: "WP",
    kind: "marketing",
    summary: "Preview room for generated sites.",
    url: "../Marketing-Made-Easy/SkyeWebCreatorMax/preview.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyewebcreatormax-delivery",
    name: "SkyeWebCreatorMax Delivery",
    icon: "WD",
    kind: "marketing",
    summary: "Delivery and handoff route for web creation.",
    url: "../Marketing-Made-Easy/SkyeWebCreatorMax/delivery.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "webgrowthoperator",
    name: "WebGrowthOperator",
    icon: "WG",
    kind: "marketing",
    summary: "Managed web presence and Phoenix growth operations site.",
    url: "../Marketing-Made-Easy/WebGrowthOperator/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "arizona-growth-index",
    name: "Arizona Growth Index",
    icon: "AZ",
    kind: "marketing",
    summary: "Arizona local market intelligence publication with city pages, reports, playbooks, and intake routing.",
    url: "../Marketing-Made-Easy/arizona-growth-index/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "kaixu-brandkit",
    name: "kAIxU BrandKit",
    icon: "KB",
    kind: "marketing",
    summary: "Brand system, voice board, asset kit, campaign kit, proof deck, Studio panel, and handoff runtime.",
    url: "../Marketing-Made-Easy/kAIxUBrandKit/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "free99",
    name: "Free99 Intake",
    icon: "F9",
    kind: "free99",
    summary: "Mounted app intake for SkyeOpsConsole plus paid and gated platform lanes.",
    url: "../Free99/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "devisional-riftx",
    name: "SuperIDE / DeVisional Riftx",
    icon: "SI",
    kind: "publishing",
    summary: "Gate-owned author publishing IDE with SkyPay handoffs, owner-approved dispatch, signed exports, and 0S command bridge signals.",
    url: "../DeVisional%20Riftx/app/index.html",
    dock: true,
    size: [1120, 760]
  },
  {
    id: "0s-command-bridge",
    name: "0S Command Bridge",
    icon: "CB",
    kind: "infra",
    summary: "Neural communication lane for 0S app events, CRM records, SkyErrors signals, SkyeNet deploys, and Founder Command review.",
    url: "../founder-command/apps/0s-command-bridge/index.html",
    dock: true,
    size: [1120, 760]
  },
  {
    id: "skyerrors",
    name: "SkyErrors",
    icon: "SE",
    kind: "infra",
    summary: "Gate-owned capture lane backed by Helper K4i, SkyErrors KV, CitadelDB mirroring, and command bridge observability.",
    url: "../skyerrors/index.html",
    dock: true,
    size: [1040, 700]
  },
  {
    id: "skyehawk",
    name: "Skye Hawk Source Cockpit",
    icon: "SH",
    kind: "infra",
    summary: "Copied Skye Hawk source restructured into a gated 0S cockpit with preserved living-field contract and command bridge readiness signals.",
    url: "../skyehawk/index.html",
    dock: true,
    size: [1040, 700]
  },
  {
    id: "skyeopsconsole",
    name: "SkyeOpsConsole",
    icon: "SO",
    kind: "free99",
    summary: "Free99 offline operations console.",
    url: "../Free99/apps/skyeopsconsole/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyeapi-aegiscore",
    name: "SkyeAPI + AegisCore",
    icon: "AA",
    kind: "free99",
    summary: "Credential, capability, provider, and gateway control plane.",
    url: "../Free99/apps/skyeapi-aegiscore/apps/console/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyeapi-website",
    name: "SkyeAPI Website",
    icon: "AW",
    kind: "free99",
    summary: "Secondary website surface for SkyeAPI and AegisCore.",
    url: "../Free99/apps/skyeapi-aegiscore/apps/website/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs",
    name: "SovereignDocs",
    icon: "SD",
    kind: "free99",
    summary: "Document workflow platform with export quotas, template library, partner review, paid plans, and guarded self-help boundary.",
    url: "../Free99/apps/sovereigndocs/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-app",
    name: "SovereignDocs App",
    icon: "SA",
    kind: "free99",
    summary: "SovereignDocs app surface.",
    url: "../Free99/apps/sovereigndocs/app/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-documents",
    name: "SovereignDocs Documents",
    icon: "SD",
    kind: "free99",
    summary: "SovereignDocs document library and template records.",
    url: "../Free99/apps/sovereigndocs/documents/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-builder",
    name: "SovereignDocs Builder",
    icon: "SB",
    kind: "free99",
    summary: "Guided builder route for document workflows.",
    url: "../Free99/apps/sovereigndocs/builder/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-workspace",
    name: "SovereignDocs Workspace",
    icon: "SW",
    kind: "free99",
    summary: "Workspace room for SovereignDocs document work.",
    url: "../Free99/apps/sovereigndocs/workspace/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-vault",
    name: "SovereignDocs Vault",
    icon: "SV",
    kind: "free99",
    summary: "Vault route for SovereignDocs.",
    url: "../Free99/apps/sovereigndocs/vault/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-api",
    name: "SovereignDocs API",
    icon: "SI",
    kind: "free99",
    summary: "API lane for SovereignDocs.",
    url: "../Free99/apps/sovereigndocs/api/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-admin",
    name: "SovereignDocs Admin",
    icon: "SM",
    kind: "free99",
    summary: "Admin route for SovereignDocs.",
    url: "../Free99/apps/sovereigndocs/admin/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-review",
    name: "SovereignDocs Review Queue",
    icon: "SR",
    kind: "free99",
    summary: "Review queue and governance lane for document workflows.",
    url: "../Free99/apps/sovereigndocs/review-queue/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-official-sources",
    name: "SovereignDocs Official Sources",
    icon: "SS",
    kind: "free99",
    summary: "Official-source routing and self-help document boundary.",
    url: "../Free99/apps/sovereigndocs/official-sources/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-pricing",
    name: "SovereignDocs Pricing",
    icon: "$D",
    kind: "free99",
    summary: "Imported paid-plan pricing surface for SovereignDocs.",
    url: "../Free99/apps/sovereigndocs/pricing/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "sovereigndocs-skyedocxmax",
    name: "SovereignDocs SkyeDocxMax",
    icon: "SX",
    kind: "free99",
    summary: "SkyeDocxMax integration inside SovereignDocs.",
    url: "../Free99/apps/sovereigndocs/skye-docx-max/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "kaixu-codestudio",
    name: "kAIxU CodeStudio",
    icon: "KC",
    kind: "free99",
    summary: "Provider backplane, policy, and code platform with approval rules for costly calls.",
    url: "../Free99/apps/kaixu-codestudio/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "kaixu-codestudio-app",
    name: "kAIxU CodeStudio App",
    icon: "KA",
    kind: "free99",
    summary: "Secondary app surface for CodeStudio.",
    url: "../Free99/apps/kaixu-codestudio/app/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "kaixu-codestudio-reports",
    name: "kAIxU CodeStudio Reports",
    icon: "KR",
    kind: "free99",
    summary: "Report route for CodeStudio.",
    url: "../Free99/apps/kaixu-codestudio/reports/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skaixu-code-evaluator",
    name: "skAIxU Code Evaluator",
    icon: "CE",
    kind: "free99",
    summary: "Evaluation platform with rubric, workflow, browser proof, and seed materialization packs.",
    url: "../Free99/apps/skaixu-code-evaluator/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyevaultpro",
    name: "SkyeVaultPro",
    icon: "VP",
    kind: "free99",
    summary: "Offline-first vault with hosted backup, AI helper, identity, and profile sync paths.",
    url: "../Free99/apps/skyevaultpro/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyevaultpro-drive",
    name: "SkyeVaultPro Drive",
    icon: "VD",
    kind: "free99",
    summary: "Drive route for SkyeVaultPro.",
    url: "../Free99/apps/skyevaultpro/drive/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyevaultpro-founder",
    name: "SkyeVaultPro Founder",
    icon: "VF",
    kind: "free99",
    summary: "Founder route for SkyeVaultPro.",
    url: "../Free99/apps/skyevaultpro/founder/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyevaultpro-docx",
    name: "SkyeVaultPro Docx App",
    icon: "VX",
    kind: "free99",
    summary: "SkyeVaultPro document editor subapp.",
    url: "../Free99/apps/skyevaultpro/apps/docx/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "doctor-ops-vault",
    name: "Doctor Ops Personal Vault",
    icon: "DV",
    kind: "free99",
    summary: "Local-first personal doctor workflow vault. Not an EHR or regulated medical advice product.",
    url: "../Free99/apps/doctor-ops-personal-vault/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "documorph",
    name: "Documorph",
    icon: "DM",
    kind: "free99",
    summary: "Document transform app with database-backed runtime surfaces.",
    url: "../Free99/apps/documorph/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "documorph-app",
    name: "Documorph App",
    icon: "DA",
    kind: "free99",
    summary: "Secondary document transform app surface.",
    url: "../Free99/apps/documorph/app/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyearcade",
    name: "SkyeArcade Sovereign Vault",
    icon: "GA",
    kind: "free99",
    summary: "Static game vault with local saves and upstream bridge events.",
    url: "../Free99/apps/skyearcade/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "skyebox-authenticator",
    name: "SkyeBox Authenticator",
    icon: "BA",
    kind: "free99",
    summary: "Encrypted local TOTP vault using browser crypto.",
    url: "../Free99/apps/skyebox-authenticator/index.html",
    dock: false,
    size: [980, 640]
  },
  {
    id: "kaixu-storefront",
    name: "kAIxU Storefront",
    icon: "KS",
    kind: "free99",
    summary: "Mini storefront and product ecology source for future approved offers.",
    url: "../Free99/apps/kaixu-storefront/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "valley-verified",
    name: "Valley Verified",
    icon: "VV",
    kind: "wrapped",
    summary: "Business discovery network with actual Bob and Empire app-build lane examples.",
    url: "../valley-verified/index.html",
    dock: true,
    size: [1120, 720]
  },
  {
    id: "valley-verified-skynet",
    name: "Valley Verified on SkyeNet",
    icon: "VS",
    kind: "skyenet public",
    summary: "SkyeNet-hosted Valley Verified rebuild with 339 researched business landings; the 0S keeps discovery, proof, and operator routing.",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/valley-verified-custom-preview/",
    dock: true,
    size: [1120, 720]
  },
  {
    id: "gate",
    name: "0S SkyGate",
    icon: "G7",
    kind: "core",
    summary: "In-0S gate control plane for auth, gate cards, 0meg4kAI, SkyeRunners, and event evidence.",
    url: "../skyegate/index.html",
    dock: true,
    size: [1080, 700]
  }
];

const SHELL_COMMANDS = [
  ["help", "Show shell commands."],
  ["start", "Open the guided customer launch path."],
  ["offers", "Open the 0S offer and ad engine."],
  ["ads", "Open the system ad placement map."],
  ["apps", "List launcher apps."],
  ["open <app>", "Open a system panel or enter a mounted app route."],
  ["browser [url]", "Open the 0S browser panel or navigate this tab."],
  ["route <app|url>", "Enter a mounted route or URL in this tab."],
  ["wrap <url>", "Alias for top-level 0S route navigation."],
  ["eject <app>", "Legacy alias for top-level 0S route navigation."],
  ["close <app|all>", "Close one window or every window."],
  ["focus <app>", "Bring a window forward."],
  ["min <app>", "Minimize a window to the dock."],
  ["max <app>", "Maximize or restore a window."],
  ["tile", "Tile open windows."],
  ["surfaces [query]", "Search live surface registry."],
  ["surface <id>", "Open a live surface by registry ID."],
  ["commands [query]", "Search repo command allowlist."],
  ["cmd <id>", "Show exact repo command details."],
  ["copy <id>", "Copy npm run 0s:command -- <id>."],
  ["install", "Install the 0S Browser when the browser exposes the PWA prompt."],
  ["fullscreen", "Enter browser fullscreen."],
  ["status", "Print OS registry and window status."],
  ["theme", "Cycle accent state."],
  ["clear", "Clear terminal output."]
];

const state = {
  windows: new Map(),
  minimized: new Set(),
  focused: null,
  z: 30,
  cascade: 0,
  surfaces: [],
  commands: [],
  registry: null,
  gate: null,
  terminalLines: [],
  themeIndex: 0,
  paletteItems: [],
  soundtrackIndex: 0,
  soundtrackPlaying: false,
  installPrompt: null
};

const desktop = document.querySelector("#desktop");
const workspace = document.querySelector("#workspace");
const dock = document.querySelector("#dock");
const template = document.querySelector("#windowTemplate");
const palette = document.querySelector("#palette");
const paletteInput = document.querySelector("#paletteInput");
const paletteResults = document.querySelector("#paletteResults");
const entryScene = document.querySelector("#zeroOsEntry");
const entryButton = document.querySelector("#zeroOsEnterButton");

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function appById(id) {
  return APP_DEFS.find(app => app.id === id);
}

function isSystemPanel(app) {
  return Boolean(app?.view);
}

function panelFromHash() {
  const raw = decodeURIComponent(String(location.hash || "").replace(/^#/, "")).trim();
  const app = appById(raw);
  return app?.view ? app.id : "";
}

function updateInstallButton(label = "PWA", disabled = false) {
  const button = qs("#installOsButton");
  if (!button) return;
  const text = button.querySelector("span");
  if (text) text.textContent = label;
  button.disabled = disabled;
  button.title = disabled ? "0S Browser installed" : "Install 0S Browser";
  button.setAttribute("aria-label", button.title);
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  state.installPrompt = event;
  updateInstallButton("PWA", false);
});

window.addEventListener("appinstalled", () => {
  state.installPrompt = null;
  updateInstallButton("OK", true);
  writeTerminal("0S Browser installed.");
  rerenderTerminalIfOpen();
});

async function installOsBrowser() {
  if (state.installPrompt) {
    const promptEvent = state.installPrompt;
    state.installPrompt = null;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => ({ outcome: "dismissed" }));
    updateInstallButton(choice?.outcome === "accepted" ? "OK" : "PWA", choice?.outcome === "accepted");
    writeTerminal(choice?.outcome === "accepted" ? "0S Browser install accepted." : "0S Browser install dismissed.");
    rerenderTerminalIfOpen();
    return true;
  }
  await requestFullscreen({ silent: true, enterOnly: true });
  writeTerminal("PWA prompt unavailable in this browser session; fullscreen shell engaged.");
  rerenderTerminalIfOpen();
  updateInstallButton("FS", false);
  return false;
}

function resolveNavigationTarget(target) {
  const raw = String(target || "").trim();
  if (!raw) return "";
  const app = appById(raw);
  const candidate = app?.url || raw;
  const withProtocol = /^[\w.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(candidate)
    ? `https://${candidate}`
    : candidate;
  try {
    return new URL(withProtocol, location.href).toString();
  } catch {
    return "";
  }
}

function launchRoute(target, options = {}) {
  const url = resolveNavigationTarget(target);
  if (!url) return false;
  document.body.classList.add("is-route-launching");
  if (!options.skipFullscreen) requestFullscreen({ silent: true });
  window.setTimeout(() => {
    location.assign(url);
  }, options.instant ? 0 : 140);
  return true;
}

function routeApp(id, options = {}) {
  const app = appById(id);
  if (!app || !app.url) return false;
  return launchRoute(app.url, options);
}

function updateClock() {
  const now = new Date();
  const clock = qs("#systemClock");
  if (!clock) return;
  clock.dateTime = now.toISOString();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function updateSystemStatus() {
  const running = state.windows.size;
  const windowStatus = qs("#windowStatus");
  const metricApps = qs("#metricApps");
  const metricSurfaces = qs("#metricSurfaces");
  const metricCommands = qs("#metricCommands");
  const registryStatus = qs("#registryStatus");
  if (windowStatus) windowStatus.textContent = `windows: ${running}`;
  if (metricApps) metricApps.textContent = APP_DEFS.length;
  if (metricSurfaces) metricSurfaces.textContent = state.surfaces.length;
  if (metricCommands) metricCommands.textContent = state.commands.length;
  if (registryStatus) registryStatus.textContent = state.registry ? "registry: online" : "registry: fallback";
  renderDock();
}

function renderDock() {
  dock.innerHTML = "";
  APP_DEFS.filter(app => app.dock).forEach(app => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.launch = app.id;
    button.className = [
      state.windows.has(app.id) ? "is-running" : "",
      state.focused === app.id ? "is-focused" : ""
    ].filter(Boolean).join(" ");
    button.innerHTML = `<span class="dock-icon" aria-hidden="true">${app.icon}</span><span class="dock-label">${app.name}</span>`;
    button.title = app.name;
    button.setAttribute("aria-label", `Open ${app.name}`);
    button.addEventListener("click", () => openApp(app.id));
    dock.append(button);
  });
}

function focusWindow(id) {
  const record = state.windows.get(id);
  if (!record) return false;
  state.minimized.delete(id);
  record.el.hidden = false;
  state.focused = id;
  record.el.style.zIndex = String(++state.z);
  document.querySelectorAll(".os-window").forEach(win => win.classList.remove("is-focused"));
  record.el.classList.add("is-focused");
  updateSystemStatus();
  return true;
}

function createWindow(app, options = {}) {
  const id = options.id || app.id;
  const existing = state.windows.get(id);
  if (existing) {
    focusWindow(id);
    return existing;
  }

  const fragment = template.content.cloneNode(true);
  const el = qs(".os-window", fragment);
  const title = qs(".window-title strong", fragment);
  const subtitle = qs(".window-title small", fragment);
  const icon = qs(".window-icon", fragment);
  const body = qs(".window-body", fragment);
  const grip = qs(".window-grip", fragment);
  const resizeHandle = qs(".resize-handle", fragment);

  const width = options.width || app.size?.[0] || 900;
  const height = options.height || app.size?.[1] || 600;
  const rect = workspace.getBoundingClientRect();
  const mobile = window.matchMedia("(max-width: 680px)").matches;
  const offset = (state.cascade++ % 7) * 28;
  const safeWidth = mobile ? rect.width : Math.min(width, Math.max(360, rect.width - 32));
  const safeHeight = mobile ? Math.max(260, rect.height - 136) : Math.min(height, Math.max(280, rect.height - 118));
  const left = mobile ? 0 : clamp(26 + offset, 0, Math.max(0, rect.width - safeWidth - 16));
  const top = mobile ? 118 : clamp(142 + offset, 0, Math.max(0, rect.height - safeHeight - 92));

  el.dataset.windowId = id;
  el.style.width = `${safeWidth}px`;
  el.style.height = `${safeHeight}px`;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  icon.textContent = app.icon || "0S";
  title.textContent = app.name;
  subtitle.textContent = app.kind || "window";

  el.addEventListener("pointerdown", () => focusWindow(id));
  qs('[data-window-action="close"]', fragment).addEventListener("click", () => closeWindow(id));
  qs('[data-window-action="minimize"]', fragment).addEventListener("click", () => minimizeWindow(id));
  qs('[data-window-action="maximize"]', fragment).addEventListener("click", () => maximizeWindow(id));

  state.windows.set(id, { id, app, el, body, maximized: false });
  workspace.append(el);

  renderWindowBody(app, body, id);
  makeDraggable(el, grip, id);
  makeResizable(el, resizeHandle, id);
  focusWindow(id);
  updateSystemStatus();
  return state.windows.get(id);
}

function closeWindow(id) {
  if (id === "all") {
    [...state.windows.keys()].forEach(key => closeWindow(key));
    return true;
  }
  const record = state.windows.get(id);
  if (!record) return false;
  record.el.remove();
  state.windows.delete(id);
  state.minimized.delete(id);
  if (state.focused === id) state.focused = state.windows.size ? [...state.windows.keys()].at(-1) : null;
  if (state.focused) focusWindow(state.focused);
  updateSystemStatus();
  return true;
}

function minimizeWindow(id) {
  const record = state.windows.get(id);
  if (!record) return false;
  record.el.hidden = true;
  state.minimized.add(id);
  if (state.focused === id) state.focused = null;
  updateSystemStatus();
  return true;
}

function maximizeWindow(id) {
  const record = state.windows.get(id);
  if (!record) return false;
  record.maximized = !record.maximized;
  record.el.classList.toggle("is-maximized", record.maximized);
  focusWindow(id);
  return true;
}

function makeDraggable(el, handle, id) {
  let active = null;
  handle.addEventListener("pointerdown", event => {
    const record = state.windows.get(id);
    if (!record || record.maximized || window.matchMedia("(max-width: 680px)").matches) return;
    event.preventDefault();
    focusWindow(id);
    const rect = el.getBoundingClientRect();
    const parent = workspace.getBoundingClientRect();
    active = {
      x: event.clientX,
      y: event.clientY,
      left: rect.left - parent.left,
      top: rect.top - parent.top,
      parent
    };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", event => {
    if (!active) return;
    const nextLeft = clamp(active.left + event.clientX - active.x, 0, Math.max(0, active.parent.width - el.offsetWidth));
    const nextTop = clamp(active.top + event.clientY - active.y, 0, Math.max(0, active.parent.height - el.offsetHeight - 86));
    el.style.left = `${nextLeft}px`;
    el.style.top = `${nextTop}px`;
  });
  handle.addEventListener("pointerup", () => {
    active = null;
  });
}

function makeResizable(el, handle, id) {
  let active = null;
  handle.addEventListener("pointerdown", event => {
    const record = state.windows.get(id);
    if (!record || record.maximized || window.matchMedia("(max-width: 680px)").matches) return;
    event.preventDefault();
    focusWindow(id);
    active = {
      x: event.clientX,
      y: event.clientY,
      width: el.offsetWidth,
      height: el.offsetHeight,
      parent: workspace.getBoundingClientRect(),
      left: el.offsetLeft,
      top: el.offsetTop
    };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", event => {
    if (!active) return;
    const maxWidth = Math.max(320, active.parent.width - active.left);
    const maxHeight = Math.max(230, active.parent.height - active.top - 86);
    el.style.width = `${clamp(active.width + event.clientX - active.x, 320, maxWidth)}px`;
    el.style.height = `${clamp(active.height + event.clientY - active.y, 230, maxHeight)}px`;
  });
  handle.addEventListener("pointerup", () => {
    active = null;
  });
}

function openApp(id) {
  const app = appById(id);
  if (!app) return false;
  if (!isSystemPanel(app)) {
    return routeApp(app.id);
  }
  createWindow(app);
  return true;
}

function renderWindowBody(app, body, id) {
  if (app.view === "dashboard") return renderDashboard(body);
  if (app.view === "customer-path") return renderCustomerPath(body);
  if (app.view === "offer-engine") return renderOfferEngine(body);
  if (app.view === "terminal") return renderTerminal(body);
  if (app.view === "browser") return renderBrowser(body);
  if (app.view === "atlas") return renderAtlas(body);
  if (app.view === "commands") return renderCommands(body);
  if (app.kind === "external") return renderExternal(body, app);
  return renderRouteHandoff(body, app, id);
}

function actionButton(action) {
  if (!action) return "";
  if (action.launch) {
    return `<button type="button" data-launch="${escapeAttr(action.launch)}">${escapeHtml(action.label || "Open")}</button>`;
  }
  if (action.route) {
    return routeTargetButton(action.route, action.label || "Open");
  }
  if (action.command) {
    return `<button type="button" data-command="${escapeAttr(action.command)}">${escapeHtml(action.label || "Run")}</button>`;
  }
  if (action.url) {
    return `<button type="button" data-open-route="${escapeAttr(action.url)}">${escapeHtml(action.label || "Open")}</button>`;
  }
  return "";
}

function actionButtons(actions = []) {
  const buttons = actions.map(actionButton).filter(Boolean).join("");
  return buttons ? `<div class="row-actions">${buttons}</div>` : "";
}

function routeTargetButton(target, label = "Open") {
  const app = appById(target);
  if (app?.view) return `<button type="button" data-launch="${escapeAttr(app.id)}">${escapeHtml(label || app.name)}</button>`;
  if (app?.url) return `<button type="button" data-route="${escapeAttr(app.id)}">${escapeHtml(label || app.name)}</button>`;
  return `<button type="button" data-open-route="${escapeAttr(target)}">${escapeHtml(label)}</button>`;
}

function productAdCard(ad) {
  const actions = actionButtons([
    ad.launch ? { label: "Open", launch: ad.launch } : null,
    ad.route ? { label: "Open", route: ad.route } : null,
    ad.url ? { label: "Open", url: ad.url } : null
  ].filter(Boolean));
  return `
    <article class="ad-card">
      <span class="system-label">${escapeHtml(ad.slot)}</span>
      <h3>${escapeHtml(ad.title)}</h3>
      <p>${escapeHtml(ad.text)}</p>
      ${actions}
    </article>
  `;
}

function customerStepCard(item) {
  return `
    <article class="journey-card">
      <span>${escapeHtml(item.step)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
      ${actionButtons(item.actions)}
    </article>
  `;
}

function freeStackCard(item) {
  return `
    <article class="stack-card">
      <div class="row-head">
        <span class="registry-pill">included</span>
        <span class="command-pill">limit-aware</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.included)}</p>
      <small>${escapeHtml(item.limit)}</small>
      ${actionButtons([{ label: "Open lane", route: item.route, launch: item.launch }])}
    </article>
  `;
}

function tierOptionCard(item) {
  return `
    <article class="tier-card">
      <span class="registry-pill">${escapeHtml(item.price)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.text)}</p>
      <ul>
        ${item.includes.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function revenueLaneCard(lane) {
  const actions = (lane.routes || []).slice(0, 4).map((target, index) => ({
    label: index === 0 ? "Open lane" : "View",
    route: target
  }));
  return `
    <article class="lane-card">
      <div class="row-head">
        <span class="registry-pill">${escapeHtml(lane.badge)}</span>
        <span class="command-pill">free -> upgrade</span>
      </div>
      <h3>${escapeHtml(lane.title)}</h3>
      <dl>
        <div><dt>Included</dt><dd>${escapeHtml(lane.free)}</dd></div>
        <div><dt>Upgrade</dt><dd>${escapeHtml(lane.upgrade)}</dd></div>
      </dl>
      ${actionButtons(actions)}
    </article>
  `;
}

function adPlacementCard(placement) {
  return `
    <article class="ad-placement-card">
      <span class="registry-pill">system ad slot</span>
      <h3>${escapeHtml(placement.title)}</h3>
      <p>${escapeHtml(placement.text)}</p>
      ${actionButtons([placement.action])}
    </article>
  `;
}

function platformGroupCard(group) {
  const apps = group.apps.map(id => appById(id)).filter(Boolean);
  return `
    <article class="platform-group-card">
      <div class="row-head">
        <span class="registry-pill">${apps.length} routes</span>
        <span class="command-pill">sellable surface</span>
      </div>
      <h3>${escapeHtml(group.title)}</h3>
      <p>${escapeHtml(group.text)}</p>
      <div class="platform-link-grid">
        ${apps.slice(0, 7).map(app => routeTargetButton(app.id, app.name)).join("")}
      </div>
    </article>
  `;
}

function metricCard(label, value, text) {
  return `<article class="status-tile"><span class="system-label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(text)}</p></article>`;
}

function applyPanelReveal(root) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const targets = root.querySelectorAll(".launch-hero > *, .status-tile, .ad-card, .journey-card, .stack-card, .tier-card, .lane-card, .ad-placement-card, .platform-group-card, .browser-copy, .browser-shortcuts");
  targets.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(18px)";
    motionAnimate(el, { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0)"] }, { duration: 0.6, delay: i * 0.08, ease: REVEAL_EASE });
  });
}

function renderCustomerPath(body) {
  body.innerHTML = `
    <section class="panel-view customer-path-view">
      <div class="panel-header launch-hero">
        <span class="system-label">customer launch path</span>
        <h2>Start here, then let the 0S sell the next step.</h2>
        <p>Use this lane when you walk into a business: show the landing experience, claim the workspace, activate team chat, hand over SkyeMail, open the CRM, and let the upgrade options appear only when they make sense.</p>
        ${actionButtons([
          { label: "Free Stack Pitch", route: "free-stack-pitch" },
          { label: "Print Flyer", route: "free-stack-flyer" },
          { label: "Open Offer Engine", launch: "offer-engine" },
          { label: "Open 0S Browser", launch: "browser" },
          { label: "Start Signup", route: "gate-signup" }
        ])}
      </div>
      <div class="dashboard-grid">
        ${metricCard("free promise", "6 lanes", "Landing, workspace, chat, mail, CRM, and backup posture.")}
        ${metricCard("customer path", "1 flow", "Preview, claim, communicate, follow up, and upgrade.")}
        ${metricCard("ad engine", String(PRODUCT_ADS.length), "The upsell lives beside useful actions instead of interrupting them.")}
        ${metricCard("0S browser", "PWA", "Installable fullscreen shell for the owned app network.")}
      </div>
      <div class="journey-grid">
        ${CUSTOMER_PATH_STEPS.map(customerStepCard).join("")}
      </div>
      <div class="panel-section-head">
        <span class="system-label">offer rail</span>
        <h3>What shows next without forcing a hard sell</h3>
      </div>
      <div class="ad-rail">
        ${PRODUCT_ADS.map(productAdCard).join("")}
      </div>
      <div class="panel-section-head">
        <span class="system-label">free stack</span>
        <h3>What you can promise first</h3>
      </div>
      <div class="stack-grid">
        ${FREE_STACK.map(freeStackCard).join("")}
      </div>
      <div class="panel-section-head">
        <span class="system-label">upgrade shape</span>
        <h3>Tier options without stale numbers</h3>
      </div>
      <div class="tier-grid">
        ${TIER_OPTIONS.map(tierOptionCard).join("")}
      </div>
    </section>
  `;
  bindLauncherButtons(body);
  applyPanelReveal(body);
}

function renderOfferEngine(body) {
  body.innerHTML = `
    <section class="panel-view offer-engine-view">
      <div class="panel-header launch-hero">
        <span class="system-label">0S ad and offer engine</span>
        <h2>Products run through the launcher as useful next moves.</h2>
        <p>This is the money map: every free lane has the upgrade sitting beside it, but the buyer sees the free value first. Use pricing later; use this now to keep the platform from feeling scattered.</p>
      </div>
      <div class="dashboard-grid">
        ${metricCard("mounted apps", String(APP_DEFS.length), "Routes already inside the 0S browser.")}
        ${metricCard("free stack", String(FREE_STACK.length), "Promise-first lanes that can open a relationship.")}
        ${metricCard("offer lanes", String(REVENUE_LANES.length), "Natural upgrades grouped by buyer need.")}
        ${metricCard("ad slots", String(AD_PLACEMENTS.length), "Where product offers surface across the shell.")}
      </div>
      <div class="ad-rail">
        ${PRODUCT_ADS.map(productAdCard).join("")}
      </div>
      <div class="panel-section-head">
        <span class="system-label">system placements</span>
        <h3>Where the 0S sells without feeling like a pitch deck</h3>
      </div>
      <div class="placement-grid">
        ${AD_PLACEMENTS.map(adPlacementCard).join("")}
      </div>
      <div class="registry-tools">
        <input type="search" data-offer-search placeholder="Filter offers, platforms, ads, mail, CRM, commerce, music, or ops" autocomplete="off">
        <button class="inline-action" type="button" data-route="free-stack-pitch">Free Stack Pitch</button>
        <button class="inline-action" type="button" data-route="free-stack-flyer">Print Flyer</button>
        <button class="inline-action" type="button" data-launch="customer-path">Start Here</button>
        <button class="inline-action" type="button" data-launch="browser">0S Browser</button>
      </div>
      <div class="lane-grid" data-offer-list>
        ${REVENUE_LANES.map(revenueLaneCard).join("")}
      </div>
      <div class="panel-section-head">
        <span class="system-label">platform inventory</span>
        <h3>Other sellable surfaces already inside the machine</h3>
      </div>
      <div class="platform-grid">
        ${PLATFORM_GROUPS.map(platformGroupCard).join("")}
      </div>
    </section>
  `;
  const search = body.querySelector("[data-offer-search]");
  const list = body.querySelector("[data-offer-list]");
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const lanes = REVENUE_LANES.filter(lane => matchText(query, lane.title, lane.badge, lane.free, lane.upgrade, lane.routes?.join(" ")));
    list.innerHTML = lanes.map(revenueLaneCard).join("") || `<div class="empty-state">No offer lane matched.</div>`;
    bindLauncherButtons(body);
  };
  search.addEventListener("input", render);
  bindLauncherButtons(body);
  applyPanelReveal(body);
}

function renderDashboard(body) {
  const gateEmail = state.gate?.email || state.gate?.username || state.gate?.actor || "Not signed in";
  const gateStatus = state.gate?.active ? "Active" : "Signup required";
  body.innerHTML = `
    <section class="panel-view">
      <div class="panel-header launch-hero">
        <span class="system-label">0S lobby</span>
        <h2>One front door for customers, offers, and owned apps.</h2>
        <p>Start with the guided customer path, use the 0S Browser to move through owned apps, and keep the offer engine nearby so free value can naturally turn into managed upgrades.</p>
        ${actionButtons([
          { label: "Free Stack Pitch", route: "free-stack-pitch" },
          { label: "Start Customer Path", launch: "customer-path" },
          { label: "Open Offer Engine", launch: "offer-engine" },
          { label: "Open 0S Browser", launch: "browser" }
        ])}
      </div>
      <div class="dashboard-grid">
        ${metricCard("routes mounted", String(APP_DEFS.length), "Dock and atlas launch targets.")}
        ${metricCard("live surfaces", String(state.surfaces.length), "Loaded from the live surface registry.")}
        ${metricCard("repo commands", String(state.commands.length), "Safe operator command snapshot.")}
        ${metricCard("open windows", String(state.windows.size), "Window manager active.")}
        ${metricCard("gate identity", gateStatus, gateEmail)}
      </div>
      <div class="ad-rail">
        ${PRODUCT_ADS.map(productAdCard).join("")}
      </div>
      <div class="app-grid">
        ${APP_DEFS.filter(app => ["customer-path", "offer-engine", "browser", "free-stack-pitch", "free-stack-flyer", "gate-signup", "skyemail", "connectlog", "relay13", "ae-flowpro", "valley-verified-skynet", "valley-verified", "business-card-factory", "pricing", "marketing", "media", "content-forge", "skyecommerce", "atlas", "terminal"].includes(app.id)).map(app => appCard(app)).join("")}
      </div>
    </section>
  `;
  bindLauncherButtons(body);
  applyPanelReveal(body);
}

function appCard(app) {
  const isPanel = isSystemPanel(app);
  return `
    <article class="app-row">
      <div class="row-head">
        <span class="window-icon" aria-hidden="true">${app.icon}</span>
        <span class="registry-pill">${app.kind}</span>
      </div>
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.summary || "")}</p>
      <div class="row-actions">
        <button type="button" data-launch="${app.id}">${isPanel ? "Open Panel" : "Enter Route"}</button>
        ${app.url ? `<button type="button" data-route="${escapeAttr(app.id)}">Full Tab</button>` : ""}
      </div>
    </article>
  `;
}

function renderAtlas(body) {
  body.innerHTML = `
    <section class="panel-view">
      <div class="panel-header">
        <span class="system-label">surface atlas</span>
        <h2>Apps and live routes</h2>
        <p>Every mounted app, platform, and subplatform enters as a full top-level 0S route. System panels stay in launcher windows.</p>
      </div>
      <div class="registry-tools">
        <input type="search" data-atlas-search placeholder="Filter apps and surfaces" autocomplete="off">
        <button class="inline-action" type="button" data-launch="browser">Browser</button>
        <button class="inline-action" type="button" data-launch="terminal">Terminal</button>
        <button class="inline-action" type="button" data-command="tile">Tile</button>
      </div>
      <div class="registry-grid" data-apps-list>
        ${APP_DEFS.map(app => appCard(app)).join("")}
      </div>
      <div class="registry-list" data-surface-list></div>
    </section>
  `;
  const search = body.querySelector("[data-atlas-search]");
  const appList = body.querySelector("[data-apps-list]");
  const surfaceList = body.querySelector("[data-surface-list]");
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const apps = APP_DEFS.filter(app => matchText(query, app.id, app.name, app.summary, app.kind));
    const surfaces = state.surfaces.filter(surface => matchText(query, surface.id, surface.name, surface.purpose, surface.sales_use, surface.privacy)).slice(0, 28);
    appList.innerHTML = apps.map(app => appCard(app)).join("") || `<div class="empty-state">No mounted apps matched.</div>`;
    surfaceList.innerHTML = surfaces.map(surfaceCard).join("") || `<div class="empty-state">No live surfaces matched.</div>`;
    bindLauncherButtons(body);
  };
  search.addEventListener("input", render);
  render();
}

function surfaceCard(surface) {
  return `
    <article class="surface-row">
      <div class="row-head">
        <span class="registry-pill">${escapeHtml(surface.privacy || "surface")}</span>
        <span class="command-pill">${escapeHtml(surface.primary_brain || "0S")}</span>
      </div>
      <h3>${escapeHtml(surface.name || surface.id)}</h3>
      <p>${escapeHtml(surface.purpose || surface.sales_use || "")}</p>
      <div class="row-actions">
        <button type="button" data-surface="${escapeAttr(surface.id)}">Enter Surface</button>
      </div>
    </article>
  `;
}

function renderCommands(body) {
  body.innerHTML = `
    <section class="panel-view">
      <div class="panel-header">
        <span class="system-label">repo command allowlist</span>
        <h2>Executable 0S command IDs</h2>
        <p>Each row maps to the local runner form: npm run 0s:command -- &lt;command-id&gt;.</p>
      </div>
      <div class="registry-tools">
        <input type="search" data-command-search placeholder="Filter command IDs, categories, or titles" autocomplete="off">
        <button class="inline-action" type="button" data-launch="terminal">Terminal</button>
      </div>
      <div class="command-grid" data-command-list></div>
    </section>
  `;
  const search = body.querySelector("[data-command-search]");
  const list = body.querySelector("[data-command-list]");
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const commands = state.commands.filter(command => matchText(query, command.id, command.title, command.category, command.risk, command.when_to_run));
    list.innerHTML = commands.map(commandCard).join("") || `<div class="empty-state">No commands matched.</div>`;
    bindLauncherButtons(body);
  };
  search.addEventListener("input", render);
  render();
}

function commandCard(command) {
  return `
    <article class="command-row">
      <div class="row-head">
        <span class="registry-pill">${escapeHtml(command.category || "command")}</span>
        <span class="command-pill">${escapeHtml(command.risk || "risk")}</span>
      </div>
      <h3>${escapeHtml(command.id)}</h3>
      <p>${escapeHtml(command.title || "")}</p>
      <p><code>${escapeHtml(command.command || "")}</code></p>
      <div class="row-actions">
        <button type="button" data-cmd-detail="${escapeAttr(command.id)}">Details</button>
        <button type="button" data-cmd-copy="${escapeAttr(command.id)}">Copy runner</button>
      </div>
    </article>
  `;
}

function renderBrowser(body) {
  const routeApps = APP_DEFS.filter(app => app.url);
  const priorityRoutes = ["customer-path", "offer-engine", "free-stack-pitch", "free-stack-flyer", "pricing", "gate-signup", "skyemail", "connectlog", "relay13", "ae-flowpro", "valley-verified-skynet", "valley-verified", "business-card-factory", "skyecommerce", "marketing", "music", "routex", "founder-command"];
  body.innerHTML = `
    <section class="browser-view">
      <form class="browser-bar" data-browser-form>
        <label for="browserInput">0S://</label>
        <input id="browserInput" name="route" autocomplete="off" spellcheck="false" placeholder="Type an app, route, or URL">
        <button type="submit">Go</button>
      </form>
      <div class="browser-home">
        <div class="browser-copy">
          <span class="system-label">0S Browser</span>
          <h2>Your own fullscreen app browser.</h2>
          <p>This is the practical Chrome-like lane now: a branded shell for owned apps, customer workspaces, offer routes, and public/private surfaces. A native desktop browser can come later; the money move is making this installable and obvious first.</p>
          ${actionButtons([
            { label: "Free Stack Pitch", route: "free-stack-pitch" },
            { label: "Start Here", launch: "customer-path" },
            { label: "Offer Engine", launch: "offer-engine" },
            { label: "Surface Atlas", launch: "atlas" },
            { label: "Install / Fullscreen", command: "install" }
          ])}
        </div>
        <div class="browser-shortcuts">
          ${priorityRoutes.map(target => routeTargetButton(target, appById(target)?.name || "Open")).join("")}
        </div>
      </div>
      <div class="ad-rail browser-ad-rail">
        ${PRODUCT_ADS.map(productAdCard).join("")}
      </div>
      <div class="platform-grid browser-platform-grid">
        ${PLATFORM_GROUPS.slice(0, 3).map(platformGroupCard).join("")}
      </div>
      <div class="browser-grid">
        ${routeApps.slice(0, 36).map(routeCard).join("")}
      </div>
    </section>
  `;
  const form = body.querySelector("[data-browser-form]");
  const input = body.querySelector("input");
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!launchRoute(input.value)) writeTerminal(`Could not resolve route: ${input.value}`, "error");
  });
  bindLauncherButtons(body);
  applyPanelReveal(body);
  setTimeout(() => input.focus(), 80);
}

function routeCard(app) {
  return `
    <article class="app-row browser-route">
      <div class="row-head">
        <span class="window-icon" aria-hidden="true">${app.icon}</span>
        <span class="registry-pill">${escapeHtml(app.kind)}</span>
      </div>
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.url || "")}</p>
      <div class="row-actions">
        <button type="button" data-route="${escapeAttr(app.id)}">Enter Route</button>
      </div>
    </article>
  `;
}

function renderTerminal(body) {
  if (!state.terminalLines.length) {
    writeTerminal("MetrAIyux 0S shell online.", "muted");
    writeTerminal("type: help", "muted");
  }
  body.innerHTML = `
    <section class="terminal-view">
      <div class="terminal-log" data-terminal-log></div>
      <form class="terminal-form" data-terminal-form>
        <label for="terminalInput">0S&gt;</label>
        <input id="terminalInput" name="command" autocomplete="off" spellcheck="false" autofocus>
        <button type="submit">Run</button>
      </form>
    </section>
  `;
  const log = body.querySelector("[data-terminal-log]");
  const form = body.querySelector("[data-terminal-form]");
  const input = body.querySelector("input");
  renderTerminalLines(log);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = input.value.trim();
    input.value = "";
    runShellCommand(value);
    renderTerminalLines(log);
  });
  setTimeout(() => input.focus(), 80);
}

function renderTerminalLines(log) {
  log.innerHTML = "";
  state.terminalLines.slice(-240).forEach(line => {
    const div = document.createElement("div");
    div.className = `terminal-line ${line.kind ? `is-${line.kind}` : ""}`;
    div.textContent = line.text;
    log.append(div);
  });
  log.scrollTop = log.scrollHeight;
}

function writeTerminal(text, kind = "") {
  state.terminalLines.push({ text: String(text), kind });
  if (state.terminalLines.length > 300) state.terminalLines.splice(0, state.terminalLines.length - 300);
}

function renderRouteHandoff(body, app) {
  const src = app.url || "";
  body.innerHTML = `
    <section class="route-handoff">
      <span class="window-icon" aria-hidden="true">${escapeHtml(app.icon || "0S")}</span>
      <h2>${escapeHtml(app.name)}</h2>
      <p>${escapeHtml(src)}</p>
      <div class="row-actions">
        <button class="inline-action" type="button" data-open-route="${escapeAttr(src)}">Enter Route</button>
      </div>
    </section>
  `;
  bindLauncherButtons(body);
}

function renderExternal(body, app) {
  body.innerHTML = `
    <section class="external-panel">
      <span class="window-icon" aria-hidden="true">${app.icon || "EX"}</span>
      <h2>${escapeHtml(app.name)}</h2>
      <p>${escapeHtml(app.summary || "This surface lives outside the static 0S folder.")}</p>
      <div class="row-actions">
        <button class="inline-action" type="button" data-open-route="${escapeAttr(app.url)}">Enter Route</button>
      </div>
    </section>
  `;
  bindLauncherButtons(body);
}

function bindLauncherButtons(root = document) {
  root.querySelectorAll("[data-launch]").forEach(button => {
    button.addEventListener("click", () => openApp(button.dataset.launch));
  });
  root.querySelectorAll("[data-eject]").forEach(button => {
    button.addEventListener("click", () => routeApp(button.dataset.eject));
  });
  root.querySelectorAll("[data-route]").forEach(button => {
    button.addEventListener("click", () => launchRoute(button.dataset.route));
  });
  root.querySelectorAll("[data-command]").forEach(button => {
    button.addEventListener("click", () => runShellCommand(button.dataset.command));
  });
  root.querySelectorAll("[data-surface]").forEach(button => {
    button.addEventListener("click", () => openSurface(button.dataset.surface));
  });
  root.querySelectorAll("[data-cmd-detail]").forEach(button => {
    button.addEventListener("click", () => {
      openApp("terminal");
      runShellCommand(`cmd ${button.dataset.cmdDetail}`);
      rerenderTerminalIfOpen();
    });
  });
  root.querySelectorAll("[data-cmd-copy]").forEach(button => {
    button.addEventListener("click", () => {
      openApp("terminal");
      runShellCommand(`copy ${button.dataset.cmdCopy}`);
      rerenderTerminalIfOpen();
    });
  });
  root.querySelectorAll("[data-open-route]").forEach(button => {
    button.addEventListener("click", () => launchRoute(button.dataset.openRoute));
  });
  root.querySelectorAll("[data-reload]").forEach(button => {
    button.addEventListener("click", () => reloadWindow(button.dataset.reload));
  });
}

function rerenderTerminalIfOpen() {
  const record = state.windows.get("terminal");
  if (record) renderTerminal(record.body);
}

function reloadWindow(id) {
  const record = state.windows.get(id);
  if (!record) return false;
  renderWindowBody(record.app, record.body, id);
  return true;
}

function ejectApp(id) {
  return routeApp(id);
}

function openSurface(id, options = {}) {
  const surface = state.surfaces.find(item => item.id === id);
  if (!surface) return false;
  const url = surfaceLocalUrl(surface) || surface.url;
  if (!url) return false;
  return launchRoute(url, options);
}

function surfaceLocalUrl(surface) {
  const localPath = surface.local_path || "";
  const index = localPath.indexOf(SITE_ROOT);
  if (index === -1) return "";
  const relative = localPath.slice(index + SITE_ROOT.length).replace(/^\/+/, "");
  return `../${relative}`;
}

function runShellCommand(input) {
  if (!input) return;
  writeTerminal(`0S> ${input}`, "command");
  const [raw, ...rest] = input.trim().split(/\s+/);
  const command = raw.toLowerCase();
  const arg = rest.join(" ");

  switch (command) {
    case "help":
      writeTerminal(SHELL_COMMANDS.map(([name, desc]) => `${name.padEnd(18)} ${desc}`).join("\n"));
      break;
    case "start":
      openApp("customer-path");
      break;
    case "offers":
    case "ads":
      openApp("offer-engine");
      break;
    case "apps":
      writeTerminal(APP_DEFS.map(app => `${app.id.padEnd(12)} ${app.name} - ${app.summary}`).join("\n"));
      break;
    case "open":
    case "launch":
      if (!openApp(arg)) writeTerminal(`Unknown app: ${arg}`, "error");
      break;
    case "browser":
      if (arg) {
        if (!launchRoute(arg)) writeTerminal(`Could not resolve route: ${arg}`, "error");
      } else {
        openApp("browser");
      }
      break;
    case "route":
    case "go":
      if (!arg) writeTerminal(`${command} requires an app id, URL, or relative path.`, "error");
      else if (!launchRoute(arg)) writeTerminal(`Could not resolve route: ${arg}`, "error");
      break;
    case "wrap":
      if (!arg) writeTerminal("wrap requires a URL or relative path.", "error");
      else if (!launchRoute(arg)) writeTerminal(`Could not resolve route: ${arg}`, "error");
      break;
    case "eject":
      if (!ejectApp(arg)) writeTerminal(`No tab URL for app: ${arg}`, "error");
      break;
    case "close":
      if (!closeWindow(arg || state.focused)) writeTerminal(`Window not found: ${arg}`, "error");
      break;
    case "focus":
      if (!focusWindow(arg)) writeTerminal(`Window not found: ${arg}`, "error");
      break;
    case "min":
    case "minimize":
      if (!minimizeWindow(arg || state.focused)) writeTerminal(`Window not found: ${arg}`, "error");
      break;
    case "max":
    case "maximize":
      if (!maximizeWindow(arg || state.focused)) writeTerminal(`Window not found: ${arg}`, "error");
      break;
    case "tile":
      tileWindows();
      writeTerminal("Open windows tiled.");
      break;
    case "surfaces":
      printSurfaces(arg);
      break;
    case "surface":
      if (!openSurface(arg)) writeTerminal(`Surface not found: ${arg}`, "error");
      break;
    case "commands":
      printCommands(arg);
      break;
    case "cmd":
      printCommandDetail(arg);
      break;
    case "copy":
      copyRunner(arg);
      break;
    case "install":
      installOsBrowser();
      break;
    case "fullscreen":
      requestFullscreen();
      break;
    case "status":
      writeTerminal([
        `apps: ${APP_DEFS.length}`,
        `live surfaces: ${state.surfaces.length}`,
        `repo commands: ${state.commands.length}`,
        `open windows: ${state.windows.size}`,
        `focused: ${state.focused || "none"}`,
        `motion runtime: ${document.documentElement.dataset.motionRuntime || "pending"}`
      ].join("\n"));
      break;
    case "theme":
      cycleTheme();
      break;
    case "clear":
      state.terminalLines = [];
      break;
    case "time":
      writeTerminal(new Date().toString());
      break;
    case "whoami":
      writeTerminal("owner-operator / MetrAIyux 0S local shell");
      break;
    default:
      writeTerminal(`Unknown shell command: ${command}. Try help.`, "error");
      break;
  }
  updateSystemStatus();
}

function printSurfaces(query = "") {
  const q = query.trim().toLowerCase();
  const matches = state.surfaces.filter(surface => matchText(q, surface.id, surface.name, surface.purpose, surface.route_when?.join(" "))).slice(0, 18);
  if (!matches.length) {
    writeTerminal("No surfaces matched.", "error");
    return;
  }
  writeTerminal(matches.map(surface => `${surface.id}\n  ${surface.name}\n  ${surfaceLocalUrl(surface) || surface.url || "no url"}`).join("\n"));
}

function printCommands(query = "") {
  const q = query.trim().toLowerCase();
  const matches = state.commands.filter(command => matchText(q, command.id, command.title, command.category, command.risk, command.when_to_run)).slice(0, 24);
  if (!matches.length) {
    writeTerminal("No commands matched.", "error");
    return;
  }
  writeTerminal(matches.map(command => `${command.id.padEnd(34)} ${command.title}`).join("\n"));
}

function printCommandDetail(id) {
  const command = state.commands.find(item => item.id === id);
  if (!command) {
    writeTerminal(`Command not found: ${id}`, "error");
    return;
  }
  writeTerminal([
    `0S command: ${command.id}`,
    `Title: ${command.title}`,
    `Category: ${command.category || "uncategorized"}`,
    `Risk: ${command.risk || "unknown"}`,
    `Runner: npm run 0s:command -- ${command.id}`,
    `CWD: ${command.cwd || "."}`,
    `Exact: ${command.command}`,
    command.long_running ? "Note: long-running command; stop with Ctrl+C." : "",
    command.when_to_run ? `When: ${command.when_to_run}` : "",
    command.result ? `Result: ${command.result}` : ""
  ].filter(Boolean).join("\n"));
}

async function copyRunner(id) {
  const command = state.commands.find(item => item.id === id);
  if (!command) {
    writeTerminal(`Command not found: ${id}`, "error");
    return;
  }
  const text = `npm run 0s:command -- ${command.id}`;
  try {
    await navigator.clipboard.writeText(text);
    writeTerminal(`Copied: ${text}`);
  } catch (_error) {
    writeTerminal(text);
  }
}

function tileWindows() {
  const records = [...state.windows.values()].filter(record => !state.minimized.has(record.id));
  if (!records.length) return;
  const rect = workspace.getBoundingClientRect();
  const cols = records.length === 1 ? 1 : records.length <= 4 ? 2 : 3;
  const rows = Math.ceil(records.length / cols);
  const gap = 10;
  const topReserve = window.matchMedia("(max-width: 680px)").matches ? 118 : 0;
  const width = (rect.width - gap * (cols - 1)) / cols;
  const height = (rect.height - topReserve - 92 - gap * (rows - 1)) / rows;
  records.forEach((record, index) => {
    record.maximized = false;
    record.el.classList.remove("is-maximized");
    record.el.hidden = false;
    record.el.style.left = `${(index % cols) * (width + gap)}px`;
    record.el.style.top = `${topReserve + Math.floor(index / cols) * (height + gap)}px`;
    record.el.style.width = `${Math.max(320, width)}px`;
    record.el.style.height = `${Math.max(230, height)}px`;
  });
  if (records.at(-1)) focusWindow(records.at(-1).id);
}

async function requestFullscreen(options = {}) {
  const silent = Boolean(options.silent);
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      if (!silent) writeTerminal("Fullscreen engaged.");
    } else if (silent || options.enterOnly) {
      return;
    } else {
      await document.exitFullscreen();
      if (!silent) writeTerminal("Fullscreen released.");
    }
  } catch (error) {
    if (!silent) writeTerminal(`Fullscreen blocked: ${error.message}`, "error");
  }
}

function cycleTheme() {
  state.themeIndex = (state.themeIndex + 1) % 4;
  const themes = [
    ["#f2c76e", "#36b8ff", "#72f2c7"],
    ["#72f2c7", "#f2c76e", "#ff7a90"],
    ["#b39cff", "#36b8ff", "#f2c76e"],
    ["#36b8ff", "#72f2c7", "#f2c76e"]
  ];
  const [gold, cyan, mint] = themes[state.themeIndex];
  document.documentElement.style.setProperty("--gold", gold);
  document.documentElement.style.setProperty("--cyan", cyan);
  document.documentElement.style.setProperty("--mint", mint);
  writeTerminal(`Accent state ${state.themeIndex + 1} loaded.`);
}

function matchText(query, ...parts) {
  if (!query) return true;
  return parts.filter(Boolean).join(" ").toLowerCase().includes(query);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function buildPaletteItems() {
  const apps = APP_DEFS.map(app => ({
    type: "app",
    id: app.id,
    title: app.name,
    detail: app.summary || app.kind,
    icon: app.icon,
    action: () => openApp(app.id)
  }));
  const surfaces = state.surfaces.slice(0, 120).map(surface => ({
    type: "surface",
    id: surface.id,
    title: surface.name || surface.id,
    detail: surface.purpose || surface.sales_use || surface.privacy || "live surface",
    icon: "SF",
    action: () => openSurface(surface.id)
  }));
  const commands = state.commands.map(command => ({
    type: "command",
    id: command.id,
    title: command.id,
    detail: command.title || command.command,
    icon: "CM",
    action: () => {
      openApp("terminal");
      runShellCommand(`cmd ${command.id}`);
      rerenderTerminalIfOpen();
    }
  }));
  state.paletteItems = [...apps, ...surfaces, ...commands];
}

function openPalette() {
  buildPaletteItems();
  palette.classList.add("is-open");
  palette.setAttribute("aria-hidden", "false");
  paletteInput.value = "";
  renderPaletteResults();
  setTimeout(() => paletteInput.focus(), 40);
}

function closePalette() {
  palette.classList.remove("is-open");
  palette.setAttribute("aria-hidden", "true");
}

function renderPaletteResults() {
  const query = paletteInput.value.trim().toLowerCase();
  const matches = state.paletteItems.filter(item => matchText(query, item.type, item.id, item.title, item.detail)).slice(0, 18);
  paletteResults.innerHTML = matches.map((item, index) => `
    <button type="button" role="option" data-palette-index="${index}">
      <span class="window-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.type)} / ${escapeHtml(item.id)}</small>
    </button>
  `).join("") || `<div class="empty-state">No launch target matched.</div>`;
  paletteResults.querySelectorAll("[data-palette-index]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = matches[Number(button.dataset.paletteIndex)];
      closePalette();
      selected?.action();
    });
  });
}

async function loadRegistries() {
  const [commandsResult, surfacesResult] = await Promise.allSettled([
    fetch("./command-registry.json").then(response => response.json()),
    fetch("../brain/live-surface-registry.json").then(response => response.json())
  ]);

  if (commandsResult.status === "fulfilled") {
    state.registry = commandsResult.value;
    state.commands = Array.isArray(commandsResult.value.commands) ? commandsResult.value.commands : [];
  }

  if (surfacesResult.status === "fulfilled") {
    state.surfaces = Array.isArray(surfacesResult.value.surfaces) ? surfacesResult.value.surfaces : [];
  }

  updateSystemStatus();
}

async function bootMotionRuntime() {
  try {
    motionAnimate(".boot-panel", { opacity: [0, 1], transform: ["translateY(12px)", "translateY(0)"] }, { duration: 0.6, ease: REVEAL_EASE });
    motionAnimate(".boot-metrics button", { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] }, { delay: 0.08, duration: 0.5, ease: REVEAL_EASE });
    motionAnimate(".dock button", { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] }, { delay: 0.16, duration: 0.5, ease: REVEAL_EASE });
    framerAnimate(".os-brand-logo", { opacity: [0, 1], scale: [.96, 1] }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    document.documentElement.dataset.motionRuntime = "motion+framer-motion";
    window.__metraiyuxOsMotionRuntime = { motion: true, framerMotion: true, loaded: true };
    qs("#motionStatus").textContent = "motion: active";
  } catch (_error) {
    document.documentElement.dataset.motionRuntime = "css-fallback";
    window.__metraiyuxOsMotionRuntime = { library: "css", loaded: true };
    qs("#motionStatus").textContent = "motion: fallback";
  }
}

function bootLivingField() {
  const canvas = qs("#osLivingField");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!ctx) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = window.matchMedia("(max-width: 680px)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.1 : 1.5);
  let width = 0;
  let height = 0;
  let nodes = [];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = compact ? 24 : 52;
    nodes = Array.from({ length: count }, (_, i) => ({
      x: ((i * 179) % Math.max(width, 1)),
      y: ((i * 97) % Math.max(height, 1)),
      phase: i * .71,
      speed: .08 + (i % 5) * .025
    }));
  }

  function frame(time = 0) {
    const t = time * .001;
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "rgba(54,184,255,.08)");
    bg.addColorStop(.42, "rgba(242,199,110,.06)");
    bg.addColorStop(1, "rgba(114,242,199,.055)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = compact ? .18 : .24;
    ctx.strokeStyle = "rgba(234,247,249,.18)";
    ctx.lineWidth = 1;
    const gap = compact ? 42 : 56;
    for (let x = (t * 8) % gap; x < width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - width * .18, height);
      ctx.stroke();
    }
    for (let y = (t * 10) % gap; y < height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + height * .1);
      ctx.stroke();
    }
    ctx.restore();

    nodes.forEach((node, index) => {
      const drift = reduced ? 0 : t * node.speed * 18;
      const x = (node.x + drift + Math.sin(t + node.phase) * 18) % Math.max(width, 1);
      const y = (node.y + Math.cos(t * .7 + node.phase) * 14) % Math.max(height, 1);
      const color = index % 4 === 0 ? "242,199,110" : index % 4 === 1 ? "54,184,255" : index % 4 === 2 ? "114,242,199" : "179,156,255";
      ctx.beginPath();
      ctx.arc(x, y, index % 5 === 0 ? 2.2 : 1.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},.55)`;
      ctx.fill();
      if (index % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo((x + 120 + Math.sin(t) * 24) % width, (y + 40 + Math.cos(t) * 18) % height);
        ctx.strokeStyle = `rgba(${color},.16)`;
        ctx.stroke();
      }
    });

    if (!reduced) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
}

function currentSoundtrackTrack() {
  return SOUNDTRACK[state.soundtrackIndex] || SOUNDTRACK[0];
}

function updateSoundtrackUi(statusText = "") {
  const track = currentSoundtrackTrack();
  const dockEl = qs("#soundtrackDock");
  const title = qs("#soundtrackTitle");
  const status = qs("#soundtrackStatus");
  const playButton = qs("#soundtrackPlayButton span");
  if (dockEl) dockEl.classList.toggle("is-playing", state.soundtrackPlaying);
  if (title) title.textContent = track?.title || "0S Soundtrack";
  if (status) status.textContent = statusText || `${track?.artist || "Gray Skyes"} / ${state.soundtrackIndex + 1} of ${SOUNDTRACK.length}`;
  if (playButton) playButton.textContent = state.soundtrackPlaying ? "||" : ">";
}

function loadSoundtrackTrack(index = state.soundtrackIndex) {
  const audio = qs("#soundtrackAudio");
  if (!audio || !SOUNDTRACK.length) return null;
  state.soundtrackIndex = (index + SOUNDTRACK.length) % SOUNDTRACK.length;
  const track = currentSoundtrackTrack();
  audio.src = track.src;
  audio.load();
  updateSoundtrackUi();
  return track;
}

async function playSoundtrack(options = {}) {
  const audio = qs("#soundtrackAudio");
  if (!audio) return false;
  if (!audio.getAttribute("src")) loadSoundtrackTrack();
  audio.volume = 0.28;
  audio.loop = false;
  try {
    await audio.play();
    state.soundtrackPlaying = true;
    updateSoundtrackUi("background music live");
    return true;
  } catch {
    state.soundtrackPlaying = false;
    updateSoundtrackUi(options.silentFailure ? "soundtrack ready" : "tap play");
    return false;
  }
}

function pauseSoundtrack() {
  const audio = qs("#soundtrackAudio");
  if (!audio) return;
  audio.pause();
  state.soundtrackPlaying = false;
  updateSoundtrackUi("paused");
}

function nextSoundtrack(options = {}) {
  const shouldPlay = state.soundtrackPlaying || options.auto;
  loadSoundtrackTrack(state.soundtrackIndex + 1);
  if (shouldPlay) playSoundtrack({ silentFailure: options.auto });
}

function previousSoundtrack() {
  const audio = qs("#soundtrackAudio");
  const restartCurrent = audio && audio.currentTime > 4;
  loadSoundtrackTrack(state.soundtrackIndex + (restartCurrent ? 0 : -1));
  if (state.soundtrackPlaying) playSoundtrack();
}

function mountSoundtrack() {
  const audio = qs("#soundtrackAudio");
  if (!audio) return;
  loadSoundtrackTrack(0);
  qs("#soundtrackPlayButton")?.addEventListener("click", () => {
    if (state.soundtrackPlaying) pauseSoundtrack();
    else playSoundtrack();
  });
  qs("#soundtrackNextButton")?.addEventListener("click", () => nextSoundtrack());
  qs("#soundtrackPrevButton")?.addEventListener("click", previousSoundtrack);
  audio.addEventListener("ended", () => nextSoundtrack({ auto: true }));
  audio.addEventListener("play", () => {
    state.soundtrackPlaying = true;
    updateSoundtrackUi("background music live");
  });
  audio.addEventListener("pause", () => {
    if (!audio.ended) {
      state.soundtrackPlaying = false;
      updateSoundtrackUi("paused");
    }
  });
}

function bindGlobalEvents() {
  qs("#paletteButton").addEventListener("click", openPalette);
  qs("#installOsButton")?.addEventListener("click", installOsBrowser);
  qs("#fullscreenButton").addEventListener("click", requestFullscreen);
  qs("#tileButton").addEventListener("click", tileWindows);
  qs("#bootPanel").addEventListener("click", event => {
    const launch = event.target.closest("[data-launch]");
    const command = event.target.closest("[data-command]");
    if (launch) openApp(launch.dataset.launch);
    if (command) runShellCommand(command.dataset.command);
  });
  paletteInput.addEventListener("input", renderPaletteResults);
  qs("#paletteForm").addEventListener("submit", event => {
    event.preventDefault();
    const first = paletteResults.querySelector("[data-palette-index]");
    first?.click();
  });
  palette.addEventListener("pointerdown", event => {
    if (event.target === palette) closePalette();
  });
  window.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openPalette();
    }
    if (event.key === "Escape" && palette.classList.contains("is-open")) closePalette();
  });
  window.addEventListener("resize", () => {
    updateSystemStatus();
  }, { passive: true });
  window.addEventListener("hashchange", () => {
    const panel = panelFromHash();
    if (panel) openApp(panel);
  });
}

function waitForLauncherEntry() {
  if (!entryScene || !entryButton) {
    document.body.classList.remove("launcher-entry-active");
    document.body.classList.add("os-entered");
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const enter = () => {
      playSoundtrack({ silentFailure: true });
      entryScene.classList.add("is-teleporting");
      document.body.classList.add("os-entering");
      requestFullscreen({ silent: true, enterOnly: true });
      window.setTimeout(() => {
        document.body.classList.remove("launcher-entry-active", "os-entering");
        document.body.classList.add("os-entered");
        entryScene.hidden = true;
        resolve();
      }, 720);
    };
    entryButton.addEventListener("click", enter, { once: true });
  });
}

function osReturnPath() {
  const path = `${location.pathname || "/0s/"}${location.search || ""}${location.hash || ""}`;
  return path.startsWith("/0s") ? path : "/0s/";
}

function ownerLoginUrl() {
  try {
    const url = new URL("/admin/login.html", location.origin);
    url.searchParams.set("return", osReturnPath());
    return url.toString();
  } catch {
    return `/admin/login.html?return=${encodeURIComponent("/0s/")}`;
  }
}

function gateSignupUrl() {
  try {
    const url = new URL("/gate/signup/", location.origin);
    url.searchParams.set("return", osReturnPath());
    return url.toString();
  } catch {
    return "../gate/signup/?return=/0s/";
  }
}

function normalizeOwnerGatePayload(data = {}) {
  const token = data.gateToken || data.gateBearerToken || data.token || "";
  const email = data.user?.email || data.email || data.username || data.owner?.email || "";
  const role = data.user?.role || data.role || (data.owner ? "owner" : "admin");
  const workspace = data.workspace?.slug || data.workspace?.id || data.workspace || "metraiyux-0s";
  const scope = data.scope || (Array.isArray(data.scopes) ? data.scopes.join(" ") : "admin.read admin.write 0s.owner");
  return {
    ok: true,
    active: true,
    authenticated: true,
    owner: Boolean(data.owner ?? true),
    source: data.source || data.via || "owner-admin-session",
    email,
    username: email,
    role,
    scope,
    scopes: Array.isArray(data.scopes) ? data.scopes : scope.split(/\s+/).filter(Boolean),
    workspace,
    token
  };
}

async function resolveOwnerAdminGate(bridge) {
  const response = await fetch("/api/owner/admin-session", {
    method: "GET",
    credentials: "include",
    headers: { "accept": "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.authenticated) return null;
  const normalized = normalizeOwnerGatePayload(data);
  if (normalized.token && bridge?.persist) {
    bridge.persist({
      token: normalized.token,
      email: normalized.email,
      role: normalized.role,
      workspace_id: normalized.workspace,
      source: "owner-admin-session",
      platform_id: "metraiyux-0s",
      usage_lane: "0s-browser"
    }, { silent: true });
  }
  return normalized;
}

async function resolveLauncherGate() {
  const bridge = window.MetrAIyuxGateBridge || window.METRAIYUX_GATE_BRIDGE || null;
  const session = bridge?.current?.();
  const headers = bridge?.headers?.({ "content-type": "application/json" }) || { "content-type": "application/json" };
  try {
    const response = await fetch("/api/skygate/auth-introspect", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(session?.token ? { token: session.token } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.active) {
      state.gate = data;
      if (session && bridge?.persist) bridge.persist(session, { silent: true });
      return true;
    }
    const ownerGate = await resolveOwnerAdminGate(bridge);
    if (ownerGate) {
      state.gate = ownerGate;
      return true;
    }
    location.replace(ownerLoginUrl());
    return false;
  } catch {
    try {
      const ownerGate = await resolveOwnerAdminGate(bridge);
      if (ownerGate) {
        state.gate = ownerGate;
        return true;
      }
    } catch {}
    if (session?.token) {
      state.gate = { active: true, email: session.email || session.actor || "", source: session.source || "local-gate-session" };
      return true;
    }
    location.replace(ownerLoginUrl());
    return false;
  }
}

async function init() {
  const gateReady = await resolveLauncherGate();
  if (!gateReady) return;
  updateInstallButton();
  updateClock();
  setInterval(updateClock, 15000);
  renderDock();
  bindGlobalEvents();
  mountSoundtrack();
  bootLivingField();
  await loadRegistries();
  await bootMotionRuntime();
  await waitForLauncherEntry();
  const firstPanel = panelFromHash() || "customer-path";
  openApp(firstPanel);
  const compactBoot = window.matchMedia("(max-width: 680px)").matches;
  const firstWindow = state.windows.get(firstPanel);
  if (firstWindow && !compactBoot) {
    firstWindow.el.style.left = "30px";
    firstWindow.el.style.top = "138px";
  }
  if (!compactBoot) {
    openApp("browser");
    const browser = state.windows.get("browser");
    if (browser) {
      browser.el.style.left = "calc(100% - min(520px, 42vw) - 32px)";
      browser.el.style.top = "170px";
      browser.el.style.width = "min(520px, 42vw)";
    }
  }
  updateSystemStatus();
}

init();

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
