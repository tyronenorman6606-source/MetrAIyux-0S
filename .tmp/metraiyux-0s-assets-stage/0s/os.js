import { animate as motionAnimate } from "motion";
import { animate as framerAnimate } from "framer-motion";

const SITE_ROOT = "/workspaces/MetrAIyux-0S/metraiyux_0s_site/";

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
    id: "terminal",
    name: "0S Terminal",
    icon: ">_",
    kind: "shell",
    summary: "Interactive launcher shell for apps, windows, live surfaces, and the repo command allowlist.",
    view: "terminal",
    dock: true,
    size: [860, 540]
  },
  {
    id: "atlas",
    name: "Surface Atlas",
    icon: "AT",
    kind: "registry",
    summary: "Apps and live surfaces wrapped into the 0S desktop.",
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
    name: "Pricing",
    icon: "$",
    kind: "wrapped",
    summary: "0S plans, offers, and price cards.",
    url: "../pricing/index.html",
    dock: true,
    size: [1000, 680]
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
    dock: true,
    size: [1040, 680]
  },
  {
    id: "routex-workforce-command",
    name: "SkyeRouteX v0.4 Platform",
    icon: "R4",
    kind: "routex",
    summary: "Runtime-safe workforce command platform hub.",
    url: "../SkyeRouteX/workforce-command-v0.4.0/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "routex-api-command",
    name: "SkyeRouteX API Command UI",
    icon: "RA",
    kind: "routex",
    summary: "Provider jobs, contractor boards, assignments, route stops, proof, payments, exports, and audit panels.",
    url: "../SkyeRouteX/workforce-command-v0.4.0/public/index.html",
    dock: false,
    size: [1040, 680]
  },
  {
    id: "routex-runtime",
    name: "SkyeRouteX Runtime",
    icon: "RR",
    kind: "routex",
    summary: "Runtime proof lane and preserved runtime contract endpoints.",
    url: "../SkyeRouteX/runtime.html",
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
  ["apps", "List launcher apps."],
  ["open <app>", "Open or focus an app window."],
  ["wrap <url>", "Open a URL in a desktop window."],
  ["eject <app>", "Open an app URL in a browser tab."],
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
  terminalLines: [],
  themeIndex: 0,
  paletteItems: []
};

const desktop = document.querySelector("#desktop");
const workspace = document.querySelector("#workspace");
const dock = document.querySelector("#dock");
const template = document.querySelector("#windowTemplate");
const palette = document.querySelector("#palette");
const paletteInput = document.querySelector("#paletteInput");
const paletteResults = document.querySelector("#paletteResults");

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeId(value) {
  return String(value || "window").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "window";
}

function appById(id) {
  return APP_DEFS.find(app => app.id === id);
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
  qs("#windowStatus").textContent = `windows: ${running}`;
  qs("#metricApps").textContent = APP_DEFS.length;
  qs("#metricSurfaces").textContent = state.surfaces.length;
  qs("#metricCommands").textContent = state.commands.length;
  qs("#registryStatus").textContent = state.registry ? "registry: online" : "registry: fallback";
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
  createWindow(app);
  return true;
}

function renderWindowBody(app, body, id) {
  if (app.view === "dashboard") return renderDashboard(body);
  if (app.view === "terminal") return renderTerminal(body);
  if (app.view === "atlas") return renderAtlas(body);
  if (app.view === "commands") return renderCommands(body);
  if (app.kind === "external") return renderExternal(body, app);
  return renderIframe(body, app, id);
}

function renderDashboard(body) {
  body.innerHTML = `
    <section class="panel-view">
      <div class="panel-header">
        <span class="system-label">system board</span>
        <h2>0S command surface</h2>
        <p>The launcher is wrapping the public 0S pages as movable desktop windows while keeping the repo command allowlist visible from the shell.</p>
      </div>
      <div class="dashboard-grid">
        <article class="status-tile"><span class="system-label">apps mounted</span><strong>${APP_DEFS.length}</strong><p>Dock and atlas launch targets.</p></article>
        <article class="status-tile"><span class="system-label">live surfaces</span><strong>${state.surfaces.length}</strong><p>Loaded from brain/live-surface-registry.json.</p></article>
        <article class="status-tile"><span class="system-label">repo commands</span><strong>${state.commands.length}</strong><p>Snapshot from ops/0s-command-registry.json.</p></article>
        <article class="status-tile"><span class="system-label">open windows</span><strong>${state.windows.size}</strong><p>Window manager active.</p></article>
      </div>
      <div class="app-grid">
        ${APP_DEFS.slice(1, 13).map(app => appCard(app)).join("")}
      </div>
    </section>
  `;
  body.querySelectorAll("[data-launch]").forEach(button => {
    button.addEventListener("click", () => openApp(button.dataset.launch));
  });
}

function appCard(app) {
  return `
    <article class="app-row">
      <div class="row-head">
        <span class="window-icon" aria-hidden="true">${app.icon}</span>
        <span class="registry-pill">${app.kind}</span>
      </div>
      <h3>${escapeHtml(app.name)}</h3>
      <p>${escapeHtml(app.summary || "")}</p>
      <div class="row-actions">
        <button type="button" data-launch="${app.id}">Open</button>
        ${app.url ? `<button type="button" data-eject="${app.id}">Tab</button>` : ""}
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
        <p>Open every mounted 0S app, platform, and subplatform in windows or search the live registry for routed proof surfaces.</p>
      </div>
      <div class="registry-tools">
        <input type="search" data-atlas-search placeholder="Filter apps and surfaces" autocomplete="off">
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
        <button type="button" data-surface="${escapeAttr(surface.id)}">Open</button>
        ${surface.url ? `<button type="button" data-surface-tab="${escapeAttr(surface.id)}">Tab</button>` : ""}
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

function renderIframe(body, app, id) {
  const src = app.url;
  body.innerHTML = `
    <section class="iframe-shell">
      <div class="iframe-toolbar">
        <code>${escapeHtml(src)}</code>
        <div class="row-actions">
          <button type="button" data-reload="${escapeAttr(id)}">Reload</button>
          <button type="button" data-open-tab="${escapeAttr(src)}">Tab</button>
        </div>
      </div>
      <iframe title="${escapeAttr(app.name)}" src="${escapeAttr(src)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
        <button class="inline-action" type="button" data-open-tab="${escapeAttr(app.url)}">Open Live Surface</button>
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
    button.addEventListener("click", () => ejectApp(button.dataset.eject));
  });
  root.querySelectorAll("[data-command]").forEach(button => {
    button.addEventListener("click", () => runShellCommand(button.dataset.command));
  });
  root.querySelectorAll("[data-surface]").forEach(button => {
    button.addEventListener("click", () => openSurface(button.dataset.surface));
  });
  root.querySelectorAll("[data-surface-tab]").forEach(button => {
    button.addEventListener("click", () => openSurface(button.dataset.surfaceTab, { tab: true }));
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
  root.querySelectorAll("[data-open-tab]").forEach(button => {
    button.addEventListener("click", () => window.open(button.dataset.openTab, "_blank", "noopener"));
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
  const iframe = record.body.querySelector("iframe");
  if (iframe) iframe.src = iframe.src;
  return true;
}

function ejectApp(id) {
  const app = appById(id);
  if (!app || !app.url) return false;
  window.open(app.url, "_blank", "noopener");
  return true;
}

function openSurface(id, options = {}) {
  const surface = state.surfaces.find(item => item.id === id);
  if (!surface) return false;
  const url = surfaceLocalUrl(surface) || surface.url;
  if (!url) return false;
  if (options.tab || isExternalUrl(url)) {
    window.open(url, "_blank", "noopener");
    return true;
  }
  createWindow({
    id: `surface-${safeId(surface.id)}`,
    name: surface.name || surface.id,
    icon: "SF",
    kind: surface.privacy || "surface",
    summary: surface.purpose || surface.sales_use || "",
    url,
    size: [1020, 680]
  }, { id: `surface-${safeId(surface.id)}` });
  return true;
}

function surfaceLocalUrl(surface) {
  const localPath = surface.local_path || "";
  const index = localPath.indexOf(SITE_ROOT);
  if (index === -1) return "";
  const relative = localPath.slice(index + SITE_ROOT.length).replace(/^\/+/, "");
  return `../${relative}`;
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url);
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
    case "apps":
      writeTerminal(APP_DEFS.map(app => `${app.id.padEnd(12)} ${app.name} - ${app.summary}`).join("\n"));
      break;
    case "open":
    case "launch":
      if (!openApp(arg)) writeTerminal(`Unknown app: ${arg}`, "error");
      break;
    case "wrap":
      if (!arg) writeTerminal("wrap requires a URL or relative path.", "error");
      else {
        const wrapId = `wrap-${Date.now()}`;
        createWindow({ id: wrapId, name: "Wrapped Surface", icon: "WR", kind: "wrapped", url: arg, size: [940, 620] }, { id: wrapId });
      }
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

async function requestFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      writeTerminal("Fullscreen engaged.");
    } else {
      await document.exitFullscreen();
      writeTerminal("Fullscreen released.");
    }
  } catch (error) {
    writeTerminal(`Fullscreen blocked: ${error.message}`, "error");
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
    motionAnimate(".boot-panel", { opacity: [0, 1], transform: ["translateY(12px)", "translateY(0)"] }, { duration: .55, ease: "cubic-bezier(.16, 1, .3, 1)" });
    motionAnimate(".dock button", { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] }, { delay: .08, duration: .38 });
    framerAnimate(".os-brand-logo", { opacity: [0, 1], scale: [.96, 1] }, { duration: .5, ease: [.16, 1, .3, 1] });
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

function bindGlobalEvents() {
  qs("#paletteButton").addEventListener("click", openPalette);
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
}

async function init() {
  updateClock();
  setInterval(updateClock, 15000);
  renderDock();
  bindGlobalEvents();
  bootLivingField();
  await loadRegistries();
  await bootMotionRuntime();
  openApp("command");
  openApp("terminal");
  const terminal = state.windows.get("terminal");
  if (terminal) {
    terminal.el.style.left = "58px";
    terminal.el.style.top = "318px";
  }
  updateSystemStatus();
}

init();
