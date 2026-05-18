import * as motionNext from "motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";

const lenisOptions = { lerp: 0.14, wheelMultiplier: 0.86, touchMultiplier: 0.9 };
const dpr = 1.35;

function createLenisRuntime() {
  return new Lenis(lenisOptions);
}

function createThreeRenderer() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
  return renderer;
}

function runMotion(selector, keyframes, options) {
  return motionNext.animate(selector, keyframes, options);
}

const DEFAULT_CONFIG = {
  brandName: "Skyes Ecosystem",
  kicker: "Interactive route map",
  subtitle: "SkyeHands, MetrAIyux 0S, app lanes, gates, proof, payments, client surfaces, and Valley Verified routes.",
  coreLogo: "skyes-emblem.png",
  homeHref: "ecosystem.html",
  focusNode: "skyehands",
  selfUrl: "https://skyehands.netlify.app/ecosystem.html",
  partnerUrl: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ecosystem.html",
  primaryCta: "Open 0S Map"
};

const cfg = { ...DEFAULT_CONFIG, ...(window.SKYEMAP_CONFIG || {}) };

const typeMeta = {
  core: { label: "Core", color: "#f4c75b" },
  gate: { label: "Gate", color: "#65e8ff" },
  app: { label: "App", color: "#6ff2c7" },
  proof: { label: "Proof", color: "#a88cff" },
  client: { label: "Client", color: "#ff6d8a" },
  infra: { label: "Infra", color: "#8bd2ff" },
  valley: { label: "Valley", color: "#a3ff83" },
  commerce: { label: "Commerce", color: "#ffd66f" },
  company: { label: "Company", color: "#ffffff" }
};

const zeroBase = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const spectacleBase = "https://metraiyux-0s-public-spectacle.pages.dev";
const fs27Base = "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev";

const nodes = [
  {
    id: "skyehands",
    type: "core",
    x: 0,
    y: -330,
    label: "Skyes / SkyeHands",
    summary: "Company-level bridge for SkyeHands, SkyeQuanta, client runtime control, and the broader Skyes Over London ecosystem.",
    tags: ["company", "bridge", "skyehands", "runtime"],
    routes: [
      { label: "Open this map", url: cfg.selfUrl || "https://skyehands.netlify.app/ecosystem.html" },
      { label: "Open 0S map", url: cfg.partnerUrl || `${zeroBase}/ecosystem.html` }
    ]
  },
  {
    id: "metraiyux",
    type: "core",
    x: 0,
    y: 0,
    label: "MetrAIyux 0S",
    summary: "Founder-built operating system with owner command, customer SaaS, app lanes, SkyePay, proof router, and approval-gated automation.",
    tags: ["0s", "operating system", "admin", "saas", "brains"],
    routes: [
      { label: "0S Worker home", url: `${zeroBase}/` },
      { label: "0S ecosystem map", url: `${zeroBase}/ecosystem.html` },
      { label: "Feature Atlas", url: `${zeroBase}/feature-atlas.html` },
      { label: "Public spectacle mirror", url: `${spectacleBase}/` }
    ]
  },
  {
    id: "feature-atlas",
    type: "proof",
    x: 300,
    y: -250,
    label: "Feature Atlas",
    summary: "Buyer-safe inventory of what the 0S includes, where app lanes live, and how proof surfaces connect.",
    tags: ["features", "inventory", "valuation", "proof"],
    routes: [
      { label: "Open Feature Atlas", url: `${zeroBase}/feature-atlas.html` },
      { label: "Public mirror", url: `${spectacleBase}/feature-atlas.html` }
    ]
  },
  {
    id: "skygate",
    type: "gate",
    x: -315,
    y: -235,
    label: "SkyeGateFS27",
    summary: "Gate, auth, SkyePay store, proof surface, client-safe access, and live gateway authority.",
    tags: ["gate", "auth", "fs27", "citadel", "access"],
    routes: [
      { label: "Gate proof", url: `${fs27Base}/gate-proofx.html` },
      { label: "Gate root", url: `${fs27Base}/` },
      { label: "SkyePay store", url: `${fs27Base}/skyepay-store.html?client=metraiyux-0s` }
    ]
  },
  {
    id: "skyepay",
    type: "commerce",
    x: -520,
    y: -80,
    label: "SkyePay",
    summary: "Live checkout and catalog route for 0S offers, SkyeGate-managed prices, and buyer-safe payment handoff.",
    tags: ["payments", "stripe", "checkout", "store", "catalog"],
    routes: [
      { label: "SkyePay store", url: `${fs27Base}/skyepay-store.html?client=metraiyux-0s` },
      { label: "0S SkyePay page", url: `${zeroBase}/saas/skyepay.html` },
      { label: "SaaS pricing", url: `${zeroBase}/pricing/index.html` }
    ]
  },
  {
    id: "saas",
    type: "commerce",
    x: -470,
    y: 150,
    label: "SaaS Provisioning",
    summary: "Customer signup, plan activation, tenant-scoped workspace path, and SaaS checkout worker.",
    tags: ["saas", "signup", "customer", "pricing"],
    routes: [
      { label: "Customer signup", url: `${zeroBase}/saas/index.html` },
      { label: "Customer portal", url: `${zeroBase}/saas/customer-dashboard.html` },
      { label: "Provisioning worker", url: "https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev/" }
    ]
  },
  {
    id: "admin",
    type: "core",
    x: -245,
    y: 330,
    label: "Admin OS",
    summary: "Protected owner-side command rooms, automation brain, tutorial, operator console, and approval paths.",
    tags: ["admin", "operator", "brain", "owner"],
    routes: [
      { label: "Admin OS", url: `${zeroBase}/admin/index.html` },
      { label: "Main Brain Chat", url: `${zeroBase}/admin/automation-brain.html` },
      { label: "Operator", url: `${zeroBase}/operator/index.html` },
      { label: "Admin tutorial", url: `${zeroBase}/admin/tutorial/index.html` }
    ]
  },
  {
    id: "proof-router",
    type: "proof",
    x: 0,
    y: 355,
    label: "Proof Router",
    summary: "Public buyer route for receipts, proof pages, ledgers, reviews, feature evidence, and live links.",
    tags: ["proof", "ledger", "receipts", "sales"],
    routes: [
      { label: "Live Proof Router", url: `${zeroBase}/sales/live-proof-router.html` },
      { label: "Platform Ledger", url: `${zeroBase}/operator/platform-integration-ledger.html` },
      { label: "Deployment Atlas", url: "https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger" }
    ]
  },
  {
    id: "client",
    type: "client",
    x: 280,
    y: 315,
    label: "Client OS",
    summary: "Buyer and customer-side workspaces, previews, client operating rooms, and sales enablement paths.",
    tags: ["client", "workspace", "sales", "preview"],
    routes: [
      { label: "Client OS", url: `${zeroBase}/client-os/index.html` },
      { label: "Sales enablement", url: `${zeroBase}/sales-enablement/index.html` },
      { label: "Client preview", url: `${zeroBase}/client-preview/index.html` }
    ]
  },
  {
    id: "deployment-atlas",
    type: "proof",
    x: 500,
    y: 90,
    label: "Deployment Atlas",
    summary: "Live-only production ledger with public surfaces, workers, Pages projects, checks, and deployment proof.",
    tags: ["deployment", "ledger", "cloudflare", "workers", "pages"],
    routes: [
      { label: "Deployment ledger", url: "https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger" },
      { label: "Ecosystem portal", url: "https://metraiyux-ecosystem-portal.pages.dev/" }
    ]
  },
  {
    id: "valley",
    type: "valley",
    x: 510,
    y: -110,
    label: "Valley Verified",
    summary: "Phoenix and Arizona company visibility network connected to the 0S Valley publisher and public proof story.",
    tags: ["valley", "verified", "phx", "publication", "business"],
    routes: [
      { label: "PHX Verified Network", url: "https://phx-verified-network.pages.dev/" },
      { label: "Editorial calendar", url: "https://phx-verified-network.pages.dev/api/insights-editorial-calendar.json" }
    ]
  },
  {
    id: "relay13",
    type: "infra",
    x: -650,
    y: -250,
    label: "Relay13",
    summary: "Messaging worker and realtime route that backs ConnectLog and relationship operations.",
    tags: ["relay13", "messaging", "worker", "connectlog"],
    routes: [
      { label: "Relay13 Core", url: "https://relay13-core.graylondonskyes.workers.dev/" },
      { label: "ConnectLog proof", url: `${zeroBase}/live/connectlog-relay13-operator-proof.html` }
    ]
  },
  {
    id: "connectlog",
    type: "app",
    x: -725,
    y: 10,
    label: "ConnectLog",
    summary: "Relationship OS lane for contact records, messaging context, and Relay13-backed proof.",
    tags: ["connectlog", "crm", "relationships", "relay"],
    routes: [
      { label: "ConnectLog proof", url: `${zeroBase}/live/connectlog-relay13-operator-proof.html` },
      { label: "ConnectLog app", url: `${zeroBase}/connectlog-v7.7-relay13-operator-proof/app.html` }
    ]
  },
  {
    id: "skyeroutex",
    type: "app",
    x: -650,
    y: 260,
    label: "SkyeRouteX",
    summary: "Workforce command, routing, market operations, proof, dispatch, and provider flow.",
    tags: ["routex", "workforce", "dispatch", "jobs", "market"],
    routes: [
      { label: "RouteX proof", url: `${zeroBase}/live/skyeroutex-workforce-command.html` },
      { label: "RouteX app", url: `${zeroBase}/SkyeRouteX/index.html` },
      { label: "Workforce v0.4.0", url: `${zeroBase}/SkyeRouteX/workforce-command-v0.4.0/index.html` }
    ]
  },
  {
    id: "profit",
    type: "app",
    x: -390,
    y: 520,
    label: "SkyeProfitConsole",
    summary: "Profit console, revenue view, and runtime route for money clarity.",
    tags: ["profit", "finance", "revenue", "console"],
    routes: [
      { label: "Profit proof", url: `${zeroBase}/live/skyeprofitconsole-profit-console.html` },
      { label: "Profit app", url: `${zeroBase}/SkyeProfitConsole/index.html` },
      { label: "Profit runtime", url: `${zeroBase}/SkyeProfitConsole/runtime.html` }
    ]
  },
  {
    id: "split",
    type: "app",
    x: -115,
    y: 610,
    label: "SkyeSplitEngine",
    summary: "Split math, revenue allocation, proof receipt, and operator hub.",
    tags: ["split", "revenue", "math", "operator"],
    routes: [
      { label: "Split Engine hub", url: `${zeroBase}/live/skye-split-engine-operator-proof.html` },
      { label: "Split app", url: `${zeroBase}/SkyeSplitEngine/index.html` },
      { label: "Split receipt", url: `${zeroBase}/proof/skyesplitengine-expansion-receipt.html` }
    ]
  },
  {
    id: "media",
    type: "app",
    x: 160,
    y: 600,
    label: "SkyeMediaCenter",
    summary: "Media intake, operator theater, asset route, and public/admin proof.",
    tags: ["media", "assets", "intake", "operator"],
    routes: [
      { label: "Media proof", url: `${zeroBase}/live/skye-media-center-operator-proof.html` },
      { label: "Media app", url: `${zeroBase}/SkyeMediaCenter/index.html` },
      { label: "Public intake", url: `${zeroBase}/SkyeMediaCenter/public/index.html` },
      { label: "Operator theater", url: `${zeroBase}/SkyeMediaCenter/public/admin.html` }
    ]
  },
  {
    id: "music",
    type: "app",
    x: 435,
    y: 500,
    label: "SkyeMusicNexus",
    summary: "Music operations, open-source studio lane, exchange proof, and creative app surface.",
    tags: ["music", "studio", "nexus", "creative"],
    routes: [
      { label: "Music proof", url: `${zeroBase}/live/skyemusicnexus-neofront.html` },
      { label: "Music app", url: `${zeroBase}/SkyeMusicNexus/index.html` },
      { label: "Public mirror", url: `${spectacleBase}/live/skyemusicnexus-neofront.html` }
    ]
  },
  {
    id: "content",
    type: "app",
    x: 665,
    y: 285,
    label: "Content Forge",
    summary: "Publisher, repurposer, proof receipt, Drive/R2 lanes, and expansion context.",
    tags: ["content", "publisher", "forge", "repurpose"],
    routes: [
      { label: "Content Forge proof", url: `${zeroBase}/live/skye-content-forge-publisher.html` },
      { label: "Repurposer app", url: `${zeroBase}/skye-content-repurposer-local/public/index.html` },
      { label: "Forge receipt", url: `${zeroBase}/proof/skye-content-forge-expansion-receipt.html` }
    ]
  },
  {
    id: "marketing",
    type: "app",
    x: 730,
    y: 25,
    label: "Marketing Made Easy",
    summary: "Growth suite with AE FlowPro, BrandID, BusinessLaunchGo, SkyeDocxMax, WebCreatorMax, and WebGrowthOperator.",
    tags: ["marketing", "growth", "web", "brand", "ae"],
    routes: [
      { label: "Marketing hub", url: `${zeroBase}/live/marketing-made-easy-growth-suite.html` },
      { label: "Suite index", url: `${zeroBase}/Marketing-Made-Easy/index.html` },
      { label: "AE FlowPro", url: `${zeroBase}/Marketing-Made-Easy/AE-FlowPro/index.html` },
      { label: "BrandID", url: `${zeroBase}/Marketing-Made-Easy/BrandID-Offline-PWA/index.html` },
      { label: "BusinessLaunchGo", url: `${zeroBase}/Marketing-Made-Easy/BusinessLaunchGo/index.html` },
      { label: "SkyeDocxMax", url: `${zeroBase}/Marketing-Made-Easy/SkyeDocxMax/index.html` },
      { label: "SkyeWebCreatorMax", url: `${zeroBase}/Marketing-Made-Easy/SkyeWebCreatorMax/index.html` },
      { label: "WebGrowthOperator", url: `${zeroBase}/Marketing-Made-Easy/WebGrowthOperator/index.html` }
    ]
  },
  {
    id: "houseops",
    type: "app",
    x: 650,
    y: -260,
    label: "HouseOps + SkyeBox",
    summary: "House operations, SkyeBox operator proof, and back-office route handling.",
    tags: ["houseops", "skyebox", "operations", "back office"],
    routes: [
      { label: "HouseOps proof", url: `${zeroBase}/live/houseoperations-skyebox-operator-proof.html` },
      { label: "HouseOps app", url: `${zeroBase}/HouseOperations/index.html` }
    ]
  },
  {
    id: "skyevault",
    type: "infra",
    x: 420,
    y: -505,
    label: "SkyeVault Drop",
    summary: "File drop, storage, vault lane, and handoff infrastructure.",
    tags: ["vault", "storage", "files", "handoff"],
    routes: [
      { label: "SkyeVault Drop", url: "https://skyevault-drop.graylondonskyes.workers.dev/" }
    ]
  },
  {
    id: "skyemail",
    type: "infra",
    x: 135,
    y: -610,
    label: "SkyeMail",
    summary: "Email platform, mailbox workspace, and provider-routed communication surface.",
    tags: ["email", "mailbox", "platform", "resend"],
    routes: [
      { label: "SkyeMail platform", url: "https://skyemail-platform.graylondonskyes.workers.dev/" },
      { label: "SkyeMail app lane", url: `${zeroBase}/live/SkyeMail/dist/SkyeMail/index.html` }
    ]
  },
  {
    id: "reviews",
    type: "proof",
    x: -160,
    y: -610,
    label: "Reviews",
    summary: "Skyes Over London review wall, live review intake, and 0S review QA queue.",
    tags: ["reviews", "social proof", "qa", "intake"],
    routes: [
      { label: "Review wall", url: "https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded" },
      { label: "Submit review", url: "https://skyes-over-london-reviews.pages.dev/submit-review.html" },
      { label: "Review QA queue", url: "https://skyes-over-london-reviews.pages.dev/operator-review-queue.html" }
    ]
  },
  {
    id: "free99",
    type: "client",
    x: -430,
    y: -505,
    label: "Free99",
    summary: "Free99 platform intake hub and receipt lane, held inside gate and proof boundaries.",
    tags: ["free99", "intake", "platform", "proof"],
    routes: [
      { label: "Free99 hub", url: `${zeroBase}/Free99/index.html` },
      { label: "Free99 receipt", url: `${zeroBase}/proof/free99-platform-intake-receipt.html` }
    ]
  },
  {
    id: "skyemerit",
    type: "commerce",
    x: -720,
    y: 520,
    label: "SkyeMerit",
    summary: "Wallet, discount math, protected merit controls, and proof receipt.",
    tags: ["wallet", "merit", "discounts", "commerce"],
    routes: [
      { label: "SkyeMerit wallet", url: `${zeroBase}/saas/skyemerit.html` },
      { label: "Operator control", url: `${zeroBase}/operator/skyemerit-admin.html` },
      { label: "SkyeMerit receipt", url: `${zeroBase}/proof/skyemerit-expansion-receipt.html` }
    ]
  },
  {
    id: "kaixu",
    type: "core",
    x: 720,
    y: -520,
    label: "kAIxU / Brain Wall",
    summary: "Brain wall, operating brain rooms, kAIxU chat route, and public knowledge boundary.",
    tags: ["kaixu", "brain", "ai", "cabinet"],
    routes: [
      { label: "Public brain wall", url: `${spectacleBase}/brain-system.html#operating-brain-rooms` },
      { label: "kAIxU Chat 6.7", url: `${zeroBase}/kAIxUChatv6.7/` },
      { label: "Local brain", url: `${zeroBase}/local-brain.html` }
    ]
  }
];

const links = [
  ["skyehands", "metraiyux"],
  ["metraiyux", "feature-atlas"],
  ["metraiyux", "skygate"],
  ["metraiyux", "admin"],
  ["metraiyux", "proof-router"],
  ["metraiyux", "client"],
  ["metraiyux", "deployment-atlas"],
  ["metraiyux", "valley"],
  ["skygate", "skyepay"],
  ["skygate", "saas"],
  ["skygate", "skyevault"],
  ["skygate", "skyemail"],
  ["skyepay", "skyemerit"],
  ["proof-router", "deployment-atlas"],
  ["proof-router", "reviews"],
  ["proof-router", "feature-atlas"],
  ["valley", "deployment-atlas"],
  ["relay13", "connectlog"],
  ["connectlog", "client"],
  ["admin", "kaixu"],
  ["admin", "skyeroutex"],
  ["client", "saas"],
  ["client", "free99"],
  ["skyeroutex", "profit"],
  ["profit", "split"],
  ["split", "media"],
  ["media", "music"],
  ["music", "content"],
  ["content", "marketing"],
  ["marketing", "houseops"],
  ["houseops", "valley"],
  ["reviews", "skyehands"],
  ["kaixu", "skyehands"],
  ["relay13", "skygate"]
].map(([source, target]) => ({ source, target }));

const state = {
  scale: 0.78,
  panX: 0,
  panY: 0,
  filter: "all",
  query: "",
  selected: cfg.focusNode || "skyehands",
  visible: new Set(nodes.map((node) => node.id))
};

const nodeById = new Map(nodes.map((node) => [node.id, node]));
const els = {};
let drag = null;
let threeRuntime = null;

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function safe(text) {
  return String(text || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;"
  })[char]);
}

function updateChromeText() {
  document.title = `${cfg.brandName} | Interactive Ecosystem Map`;
  qs("[data-brand-title]").textContent = cfg.brandName;
  qs("[data-brand-kicker]").textContent = cfg.kicker;
  qs("[data-map-subtitle]").textContent = cfg.subtitle;
  qs("[data-core-logo]").src = cfg.coreLogo;
  qs("[data-brand-logo]").src = cfg.coreLogo;
  qs("[data-home-link]").href = cfg.homeHref;
  qs("[data-partner-link]").href = cfg.partnerUrl || `${zeroBase}/ecosystem.html`;
  qs("[data-partner-link]").textContent = cfg.primaryCta || "Open 0S Map";
}

function renderNodes() {
  els.nodeLayer.innerHTML = nodes.map((node) => {
    const meta = typeMeta[node.type] || typeMeta.core;
    return `
      <button class="system-node" type="button" data-node-id="${node.id}" style="--node-color: ${meta.color}">
        <span class="node-dot" aria-hidden="true"></span>
        <span class="node-type">${safe(meta.label)}</span>
        <strong>${safe(node.label)}</strong>
        <small>${safe(node.summary.split(".")[0])}</small>
      </button>
    `;
  }).join("");

  qsa(".system-node").forEach((nodeEl) => {
    nodeEl.addEventListener("pointerdown", onNodePointerDown);
    nodeEl.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.nodeId;
      selectNode(id);
    });
  });
}

function renderEdges() {
  els.edgeLayer.innerHTML = links.map((link, index) => `<line class="edge-line" data-edge-index="${index}" />`).join("");
}

function boardCenter() {
  const rect = els.board.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

function nodeScreenPoint(node) {
  const center = boardCenter();
  return {
    x: center.x + state.panX + node.x * state.scale,
    y: center.y + state.panY + node.y * state.scale
  };
}

function updatePositions() {
  qsa(".system-node").forEach((nodeEl) => {
    const node = nodeById.get(nodeEl.dataset.nodeId);
    const x = state.panX + node.x * state.scale;
    const y = state.panY + node.y * state.scale;
    nodeEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${Math.max(0.72, Math.min(1.08, state.scale))})`;
    nodeEl.classList.toggle("is-active", node.id === state.selected);
    nodeEl.classList.toggle("is-hidden", !state.visible.has(node.id));
  });

  qsa(".edge-line").forEach((edgeEl) => {
    const link = links[Number(edgeEl.dataset.edgeIndex)];
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    const a = nodeScreenPoint(source);
    const b = nodeScreenPoint(target);
    edgeEl.setAttribute("x1", a.x);
    edgeEl.setAttribute("y1", a.y);
    edgeEl.setAttribute("x2", b.x);
    edgeEl.setAttribute("y2", b.y);
    const hidden = !state.visible.has(source.id) || !state.visible.has(target.id);
    const active = state.selected === source.id || state.selected === target.id;
    edgeEl.style.opacity = hidden ? "0.05" : active ? "0.92" : "0.54";
    edgeEl.classList.toggle("is-active", active);
  });

  qs("[data-zoom-label]").textContent = `${Math.round(state.scale * 100)}%`;
}

function filterNodes() {
  const query = state.query.trim().toLowerCase();
  const visible = nodes.filter((node) => {
    const typeMatch = state.filter === "all" || node.type === state.filter;
    const hay = `${node.label} ${node.summary} ${node.tags.join(" ")} ${node.routes.map((route) => route.label).join(" ")}`.toLowerCase();
    const queryMatch = !query || hay.includes(query);
    return typeMatch && queryMatch;
  });
  state.visible = new Set(visible.map((node) => node.id));
  if (!state.visible.has(state.selected) && visible[0]) state.selected = visible[0].id;
  updatePositions();
  renderDrawer();
  qs("[data-visible-count]").textContent = String(visible.length);
}

function relatedFor(id) {
  return links
    .filter((link) => link.source === id || link.target === id)
    .map((link) => nodeById.get(link.source === id ? link.target : link.source))
    .filter(Boolean);
}

function renderDrawer() {
  const node = nodeById.get(state.selected) || nodes[0];
  const meta = typeMeta[node.type] || typeMeta.core;
  const related = relatedFor(node.id);
  els.drawer.innerHTML = `
    <div>
      <span class="drawer-kicker" style="color:${meta.color}">${safe(meta.label)} route</span>
      <h1>${safe(node.label)}</h1>
    </div>
    <p>${safe(node.summary)}</p>
    <div class="drawer-meta">
      ${node.tags.map((tag) => `<span class="drawer-chip">${safe(tag)}</span>`).join("")}
    </div>
    <div class="drawer-main">
      <div>
        <h3>Open routes</h3>
        <div class="route-list">
          ${node.routes.map((route) => `
            <a class="route-link" href="${route.url}" target="_blank" rel="noopener">
              ${safe(route.label)}
              <span>open</span>
            </a>
          `).join("")}
        </div>
      </div>
      <div>
        <h3>Connected nodes</h3>
        <div class="related-list">
          ${related.map((item) => `<button class="related-chip" type="button" data-related="${item.id}">${safe(item.label)}</button>`).join("")}
        </div>
      </div>
    </div>
    <div class="drawer-actions">
      <a class="map-cta primary" href="${node.routes[0]?.url || cfg.selfUrl}" target="_blank" rel="noopener">Launch primary route</a>
      <button class="map-cta" type="button" data-copy-route>Copy route</button>
    </div>
  `;
  qsa("[data-related]").forEach((button) => button.addEventListener("click", () => selectNode(button.dataset.related)));
  qs("[data-copy-route]")?.addEventListener("click", async () => {
    const url = node.routes[0]?.url || location.href;
    try {
      await navigator.clipboard.writeText(url);
      qs("[data-copy-route]").textContent = "Copied";
      setTimeout(() => { const btn = qs("[data-copy-route]"); if (btn) btn.textContent = "Copy route"; }, 1200);
    } catch {
      window.prompt("Route URL", url);
    }
  });
}

function selectNode(id) {
  if (!nodeById.has(id)) return;
  state.selected = id;
  renderDrawer();
  updatePositions();
  window.dispatchEvent(new CustomEvent("skye-map-select", { detail: { id } }));
}

function setScale(nextScale) {
  state.scale = Math.max(0.48, Math.min(1.45, nextScale));
  updatePositions();
}

function fitMap() {
  state.panX = 0;
  state.panY = 0;
  state.scale = window.innerWidth < 720 ? 0.48 : 0.78;
  updatePositions();
}

function onNodePointerDown(event) {
  const id = event.currentTarget.dataset.nodeId;
  selectNode(id);
  event.currentTarget.setPointerCapture(event.pointerId);
  const node = nodeById.get(id);
  drag = {
    kind: "node",
    id,
    startX: event.clientX,
    startY: event.clientY,
    nodeX: node.x,
    nodeY: node.y
  };
  document.body.classList.add("map-grabbing");
}

function onBoardPointerDown(event) {
  if (event.target.closest(".system-node") || event.target.closest(".drawer") || event.target.closest(".quick-dock")) return;
  els.board.setPointerCapture(event.pointerId);
  drag = {
    kind: "pan",
    startX: event.clientX,
    startY: event.clientY,
    panX: state.panX,
    panY: state.panY
  };
  document.body.classList.add("map-grabbing");
}

function onPointerMove(event) {
  if (!drag) return;
  if (drag.kind === "node") {
    const node = nodeById.get(drag.id);
    node.x = drag.nodeX + (event.clientX - drag.startX) / state.scale;
    node.y = drag.nodeY + (event.clientY - drag.startY) / state.scale;
  } else {
    state.panX = drag.panX + event.clientX - drag.startX;
    state.panY = drag.panY + event.clientY - drag.startY;
  }
  updatePositions();
}

function endDrag() {
  drag = null;
  document.body.classList.remove("map-grabbing");
}

function wireControls() {
  qs("[data-search]").addEventListener("input", (event) => {
    state.query = event.target.value;
    filterNodes();
  });

  qsa("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      qsa("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      filterNodes();
    });
  });

  qs("[data-zoom-in]").addEventListener("click", () => setScale(state.scale + 0.1));
  qs("[data-zoom-out]").addEventListener("click", () => setScale(state.scale - 0.1));
  qs("[data-fit]").addEventListener("click", fitMap);
  qs("[data-open-selected]").addEventListener("click", () => {
    const route = nodeById.get(state.selected)?.routes[0];
    if (route) window.open(route.url, "_blank", "noopener");
  });

  els.board.addEventListener("pointerdown", onBoardPointerDown);
  els.board.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    setScale(state.scale + (event.deltaY > 0 ? -0.05 : 0.05));
  }, { passive: false });

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", updatePositions);
}

function initThree(THREE) {
  const mount = qs("#constellationMount");
  if (!mount || !THREE) return null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 18;
  const renderer = createThreeRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  const count = window.innerWidth < 720 ? 90 : 180;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color("#f4c75b"), new THREE.Color("#65e8ff"), new THREE.Color("#6ff2c7"), new THREE.Color("#a88cff")];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    const color = palette[i % palette.length];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const ringGeometry = new THREE.TorusGeometry(4.4, 0.008, 12, 180);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf4c75b, transparent: true, opacity: 0.18 });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI * 0.56;
  scene.add(ring);

  let frame = 0;
  let alive = true;
  function render() {
    if (!alive) return;
    frame += 0.01;
    points.rotation.y += 0.0009;
    points.rotation.x = Math.sin(frame) * 0.035;
    ring.rotation.z += 0.0018;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render();

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);
  return { renderer, scene, camera, frame: () => frame, destroy: () => { alive = false; window.removeEventListener("resize", onResize); renderer.dispose(); } };
}

async function bootRuntimeTooling() {
  const evidence = { motion: false, gsap: false, lenis: false, three: false, scrollTrigger: false };
  window.__skyeRuntimeEvidence = evidence;

  if (motionNext.animate) {
    evidence.motion = true;
    runMotion(".core-logo", { opacity: [0, 1], scale: [0.88, 1] }, { duration: 0.8, easing: [0.16, 1, 0.3, 1] });
    runMotion(".map-topbar", { opacity: [0, 1], y: [-14, 0] }, { duration: 0.7 });
  }

  if (gsap) {
    evidence.gsap = true;
    if (ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      evidence.scrollTrigger = true;
      gsap.to(".map-progress", { scaleX: 1, ease: "none", scrollTrigger: { scrub: true, start: 0, end: "max" } });
    }
    gsap.fromTo(".system-node", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.018, ease: "power3.out", delay: 0.08 });
  }

  if (Lenis && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const lenis = createLenisRuntime();
    evidence.lenis = true;
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.__skyeLenis = lenis;
  }

  if (THREE) {
    evidence.three = true;
    threeRuntime = initThree(THREE);
    window.__skyeThreeRuntime = threeRuntime;
  }
}

function exposeApi() {
  window.__skyeSystemMap = {
    nodes,
    links,
    state,
    selectNode,
    setScale,
    fitMap,
    filterNodes,
    runtimeEvidence: () => window.__skyeRuntimeEvidence || {},
    threeFrame: () => threeRuntime?.frame?.() || 0
  };
  window.__skyeMap = window.__skyeSystemMap;
}

function init() {
  els.board = qs("[data-map-board]");
  els.nodeLayer = qs("[data-node-layer]");
  els.edgeLayer = qs("[data-edge-layer]");
  els.drawer = qs("[data-drawer]");
  updateChromeText();
  renderNodes();
  renderEdges();
  wireControls();
  fitMap();
  selectNode(state.selected);
  filterNodes();
  exposeApi();
  bootRuntimeTooling();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
