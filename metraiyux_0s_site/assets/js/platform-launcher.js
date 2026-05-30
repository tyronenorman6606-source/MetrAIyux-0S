(function () {
  const root = document.querySelector("[data-platform-launcher]");
  if (!root) return;

  const checkoutBase = "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=";
  const localCheckout = (offer) => `skyepay.html?client=metraiyux-0s&offer=${encodeURIComponent(offer)}`;
  const liveCheckout = (offer) => `${checkoutBase}${encodeURIComponent(offer)}`;

  const platforms = [
    {
      id: "skyemusicnexus",
      title: "SkyeMusicNexus",
      eyebrow: "Artists, drops, landing builds",
      summary: "Music platform lanes for artist hubs, SupaBoy-level universes, upload/drop packaging, gated playback, paid downloads, and proof-safe release operations.",
      tags: ["artists", "music", "drops", "landing", "epk", "visualizer", "supaboy"],
      cards: [
        { title: "Single / Drop Landing Page", price: "$2,239 listed / $239 due", listed: "$2,239", due: "$239", merit: "-$2,000 SkyeMerit", text: "Launch-window merit applies before checkout through 2026-06-26. One premium page from artist info, one image, release details, links, and proof fields.", href: localCheckout("skyemusicnexus-single-drop-landing-page"), cta: "Start landing page", tags: ["landing", "single", "drop", "artist"] },
        { title: "Artist Page + EPK", price: "$2,444 listed / $444 due", listed: "$2,444", due: "$444", merit: "-$2,000 SkyeMerit", text: "Gallery, EPK, booking/media, music links, and SkyeMusicNexus dashboard handoff.", href: localCheckout("skyemusicnexus-artist-page-epk"), cta: "Start artist page", tags: ["epk", "booking", "gallery"] },
        { title: "Animated Landing / Visualizer", price: "$2,796 listed / $796 due", listed: "$2,796", due: "$796", merit: "-$2,000 SkyeMerit", text: "Animated artist landing and visualizer surface using the artist image, drop metadata, music surfaces, and motion.", href: localCheckout("skyemusicnexus-animated-visualizer-page"), cta: "Start visualizer", tags: ["visualizer", "motion", "music"] },
        { title: "Custom Artist Universe", price: "$3,197+ listed / $1,197+ due", listed: "$3,197+", due: "$1,197+", merit: "-$2,000 SkyeMerit", text: "SupaBoy-level custom universe quoted manually above the starting floor after assets, music, media, and rollout scope are known.", href: localCheckout("skyemusicnexus-custom-artist-universe"), cta: "Open universe floor", tags: ["universe", "supaboy", "custom"] },
        { title: "Artist Host", price: "$9/mo", text: "Solo artist workspace with uploads, proof playback, release workflow, live drop updates, fan preview, and private-download setup.", href: localCheckout("skyemusicnexus-studio"), cta: "Start Artist Host", tags: ["hosting", "uploads", "artist"] },
        { title: "Release Content Kit", price: "$79 once", text: "Captions, short-form hooks, asset requests, and release runway tasks from the gated artist exchange.", href: localCheckout("skyemusicnexus-release-content-kit"), cta: "Buy content kit", tags: ["content", "release", "campaign"] },
        { title: "Single Song Drop", price: "$15 once", text: "One song release capsule, metadata checklist, preview/full package settings, gated handoff, and proof receipt.", href: localCheckout("skyemusicnexus-single-song-drop"), cta: "Buy single drop", tags: ["drop", "song", "release"] }
      ]
    },
    {
      id: "metraiyux-core",
      title: "MetrAIyux 0S Core",
      eyebrow: "Operating system plans",
      summary: "The core customer operating lanes: command rooms, client workspaces, proof, routing, AI caps, SkyeBox, HouseOperations, and owner-approved activation.",
      tags: ["0s", "core", "workspace", "saas", "plans"],
      cards: [
        { title: "Starter Command", price: "$1,500 setup + $397/mo", text: "One workspace, 25,000 AI credits, local HouseOps preview, one SkyeBox vault, ConnectLog, and Relay13 readiness.", href: liveCheckout("metraiyux-starter-command"), cta: "Open Starter", tags: ["starter", "workspace"] },
        { title: "Growth Cabinet", price: "$3,500 setup + $997/mo", text: "Three workspaces, cabinet review rhythm, proof exports, ConnectLog, HouseOperations, SkyeBox, and Relay13 workspace.", href: liveCheckout("metraiyux-growth-cabinet"), cta: "Open Growth", tags: ["growth", "cabinet"] },
        { title: "Autonomous Office", price: "$7,500 setup + $2,497/mo", text: "Managed office lane with approval inboxes, daily digests, relationship intelligence, owned messaging, and connector readiness.", href: liveCheckout("metraiyux-autonomous-office"), cta: "Open Autonomous", tags: ["autonomous", "office"] },
        { title: "Enterprise / Managed Gate", price: "$15,000 setup + $3,997/mo", text: "Custom gate policy for enterprise, government readiness, multi-branch operations, tenant provisioning, or white-label resale.", href: liveCheckout("metraiyux-enterprise-command"), cta: "Discuss managed gate", tags: ["enterprise", "white label", "gate"] }
      ]
    },
    {
      id: "free99",
      title: "Free99 App Stack",
      eyebrow: "No charge, still gated",
      summary: "Useful no-charge lanes that still require the shared 0S/FS27/SkyGate session. Free99 means price, not anonymous access.",
      tags: ["free99", "free", "gated", "apps", "tools"],
      cards: [
        { title: "SkyeProfitConsole", price: "$0", text: "Profit packs, money moves, close briefs, signal proof, local export, and optional runtime proof.", href: "../live/skyeprofitconsole-profit-console.html", cta: "Open profit hub", tags: ["profit", "margin"] },
        { title: "SkyeMediaCenter", price: "$0", text: "Media intake, asset review, execution, dispatch, publishing, stats, file delivery, and workflow proof.", href: "../live/skye-media-center-operator-proof.html", cta: "Open media hub", tags: ["media", "assets"] },
        { title: "Skye Split Engine", price: "$0", text: "People, products, split rules, transaction ledger, settlement reports, import/export, snapshots, and repair controls.", href: "../live/skye-split-engine-operator-proof.html", cta: "Open split hub", tags: ["split", "ledger"] },
        { title: "Skye Content Forge", price: "$0", text: "Approved-source scanning, original content generation, drafts, scheduler proof, backup, and deployment-hook proof.", href: "../live/skye-content-forge-publisher.html", cta: "Open content hub", tags: ["content", "publisher"] },
        { title: "Free99 Intake", price: "$0 core apps", text: "Mounted app hub for SkyeOpsConsole, Still2Vid, MyDrive, SkyePics, BrandForge, and paid platform intake boundaries.", href: "../Free99/index.html", cta: "Open Free99", tags: ["intake", "apps"] }
      ]
    },
    {
      id: "skyepay",
      title: "SkyePay + SkyeMerit",
      eyebrow: "Checkout, merit, billing",
      summary: "The checkout and merit lane that keeps Stripe charges, FS27 order records, owner approval, protected discounts, and gate sessions in one path.",
      tags: ["stripe", "checkout", "skyemerit", "billing", "pricing"],
      cards: [
        { title: "SkyePay Gateway", price: "Stripe backed", text: "Named offers flow through SkyePay so FS27 can record paid status, metadata, plan policy, and activation state.", href: "skyepay.html", cta: "Open gateway", tags: ["checkout", "stripe"] },
        { title: "SkyeMerit Wallet", price: "$6 kAIxu credit + merit bands", text: "First-time protected merit packs and capped discounts. Discounts never bypass gate sessions or owner approval.", href: "skyemerit.html", cta: "Open wallet", tags: ["merit", "discount"] },
        { title: "Artist Landing Launch Merit", price: "-$2,000 SkyeMerit", merit: "-$2,000 SkyeMerit", meritNote: "applied before checkout", text: "SkyeMusicNexus landing builds show premium listed value and apply $2,000 SkyeMerit before checkout through 2026-06-26.", href: localCheckout("skyemusicnexus-single-drop-landing-page"), cta: "Open launch offer", tags: ["artist", "launch", "merit"] },
        { title: "Pricing Router", price: "Source of truth", text: "Use the pricing router when a buyer needs the whole Free99, paid, quote-only, and white-label boundary in one place.", href: "../sales/pricing-offer-router.html", cta: "Open router", tags: ["pricing", "router"] }
      ]
    },
    {
      id: "relay13-connectlog",
      title: "Relay13 + ConnectLog",
      eyebrow: "Owned messaging and relationship memory",
      summary: "Relationship capture, inbox handoff, AI response lanes, ConnectLog receipts, and owner-reviewed messaging proof.",
      tags: ["relay13", "connectlog", "messaging", "inbox", "relationship"],
      cards: [
        { title: "Relay13 AI Response Starter", price: "$35/mo", text: "Owner-reviewed AI response draft lane with capped provider use and backup bucket protection.", href: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s-skm&offer=relay13-ai-response-starter", cta: "Open starter", tags: ["relay13", "ai"] },
        { title: "Relay13 Response Plus", price: "$79/mo", text: "Higher-volume priority draft lane with usage monitoring and backup bucket guardrail.", href: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s-skm&offer=relay13-ai-response-plus", cta: "Open plus", tags: ["relay13", "priority"] },
        { title: "Managed AI Inbox", price: "from $149/mo", text: "Managed inbox with allowlisted routine replies, triage, labels, follow-up timers, and human escalation.", href: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s-skm&offer=relay13-managed-ai-inbox", cta: "Open managed inbox", tags: ["inbox", "managed"] },
        { title: "ConnectLog Proof", price: "Included by lane", text: "Relationship cards, QR exchange, follow-up memory, and proof receipts tied to the correct workspace.", href: "../live/connectlog-operator-proof.html", cta: "Open proof", tags: ["connectlog", "proof"] }
      ]
    },
    {
      id: "sovereign-stack",
      title: "Sovereign Infrastructure",
      eyebrow: "Gate, vault, mail, database",
      summary: "The infrastructure layer behind the platform: FS27/SkyGate, SkyeVault, SkySecure, SkyeVaultOS, SkyeMail, SkyeBox, and CitadelDB.",
      tags: ["fs27", "skygate", "skyevault", "skymail", "citadeldb", "skyebox"],
      cards: [
        { title: "FS27 / SkyGate", price: "Shared gate authority", text: "Identity, event evidence, key control, SkyePay routing, protected sessions, and deployment tracking.", href: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html", cta: "Open FS27 proof", tags: ["fs27", "gate"] },
        { title: "SkyeVaultOS", price: "Vault proof lane", text: "Scan, offload, inventory, search, diff, verify, restore-point, grant, revoke, audit, and proof before deletion.", href: "../skye-vault-os/index.html", cta: "Open VaultOS", tags: ["vault", "restore"] },
        { title: "SkyeMail", price: "Sovereign mail lane", text: "FS27-backed mailbox proof, aliases, and routing for business inbox work where configured.", href: "https://skyemail-platform.graylondonskyes.workers.dev/", cta: "Open SkyeMail", tags: ["mail", "alias"] },
        { title: "HouseOperations + SkyeBox", price: "Included by 0S plan", text: "Task/vendor/owner-alert command workflows plus private encrypted authenticator vault handoff.", href: "../live/houseoperations-skyebox-operator-proof.html", cta: "Open HouseOps proof", tags: ["houseops", "skyebox"] }
      ]
    },
    {
      id: "marketing-media",
      title: "Marketing + Media Over London",
      eyebrow: "Build, grow, campaign",
      summary: "The front-door service lane for marketing systems, Media Over London, Valley Verified, content engines, client launch hubs, and campaign proof.",
      tags: ["marketing", "media over london", "valley verified", "campaign", "content"],
      cards: [
        { title: "Media Over London", price: "Contact lane", text: "MediaOverLondon@solenterprises.org. Picture-to-platform marketing, visual spectacle, content engines, and campaign surfaces.", href: "https://metraiyux-0s-marketing.pages.dev/media-over-london.html", cta: "Open Media Over London", tags: ["media", "marketing"] },
        { title: "Valley Verified", price: "Local proof engine", text: "Local verification, business profiles, insight pages, proof-backed content, and growth routes.", href: "../valley-verified/index.html", cta: "Open Valley Verified", tags: ["valley", "verified"] },
        { title: "Marketing Made Easy", price: "Quote only", text: "Imported growth-suite route for brand, launch, document/web creation, and market intelligence. No checkout until owner-approved catalog entry exists.", href: "../live/marketing-made-easy-growth-suite.html", cta: "Open growth suite", tags: ["marketing", "quote"] },
        { title: "Agentic Growth Layer", price: "From $497/mo", text: "Agentic website improvement cycles, source-backed growth briefs, patch manifests, and proof receipts.", href: "../agentic-growth-layer/index.html", cta: "Open growth operator", tags: ["agentic", "growth"] }
      ]
    }
  ];

  const state = {
    platform: new URLSearchParams(location.search).get("platform") || platforms[0].id,
    query: ""
  };

  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  function hay(value) {
    if (Array.isArray(value)) return value.map(hay).join(" ");
    if (value && typeof value === "object") return Object.values(value).map(hay).join(" ");
    return String(value || "").toLowerCase();
  }

  function platformMatches(platform, query) {
    if (!query) return true;
    return hay(platform).includes(query);
  }

  function cardMatches(card, query) {
    if (!query) return true;
    return hay(card).includes(query);
  }

  function platformIdentityMatches(platform, query) {
    if (!query) return false;
    const identity = `${platform.id} ${platform.title} ${platform.eyebrow} ${(platform.tags || []).join(" ")}`.toLowerCase();
    return identity.includes(query);
  }

  function activePlatform() {
    return platforms.find((platform) => platform.id === state.platform) || platforms[0];
  }

  function renderTabs() {
    const tabs = root.querySelector("[data-platform-tabs]");
    if (!tabs) return;
    const query = state.query.toLowerCase().trim();
    const visible = platforms.filter((platform) => platformMatches(platform, query) || platform.cards.some((card) => cardMatches(card, query)));
    tabs.innerHTML = visible.map((platform) => `
      <button type="button" class="platform-tab" data-platform-id="${esc(platform.id)}" aria-pressed="${platform.id === state.platform ? "true" : "false"}">
        <span>${esc(platform.eyebrow)}</span>
        <strong>${esc(platform.title)}</strong>
        <em>${platform.cards.length} cards</em>
      </button>
    `).join("");
    tabs.querySelectorAll("[data-platform-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.platform = button.dataset.platformId;
        render();
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderStage() {
    const platform = activePlatform();
    const detail = root.querySelector("[data-platform-detail]");
    const cards = root.querySelector("[data-platform-cards]");
    const query = state.query.toLowerCase().trim();
    const visibleCards = platform.cards.filter((card) => cardMatches(card, query));
    if (detail) {
      detail.innerHTML = `
        <p class="eyebrow">${esc(platform.eyebrow)}</p>
        <h3>${esc(platform.title)}</h3>
        <p>${esc(platform.summary)}</p>
        <div class="launcher-tags">${platform.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
      `;
    }
    if (cards) {
      cards.innerHTML = visibleCards.length ? visibleCards.map((card) => `
        <article class="launcher-card">
          <p class="eyebrow">${esc(platform.title)}</p>
          <h4>${esc(card.title)}</h4>
          ${card.merit ? `
          <div class="skyemerit-deal-banner">
            <span>Launch merit</span>
            <strong>${esc(card.merit)}</strong>
            ${card.due ? `<em>${esc(card.due)} due after merit</em>` : card.meritNote ? `<em>${esc(card.meritNote)}</em>` : ""}
          </div>
          ` : ""}
          <strong>${esc(card.price)}</strong>
          ${card.listed && card.due ? `<div class="price-after-merit"><span>${esc(card.listed)} listed</span><b>${esc(card.due)} today</b></div>` : ""}
          <p>${esc(card.text)}</p>
          <div class="launcher-tags">${(card.tags || []).slice(0, 4).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
          <a class="saas-btn" href="${esc(card.href)}">${esc(card.cta || "Open")}</a>
        </article>
      `).join("") : `<p class="notice">No ${esc(platform.title)} cards match this search yet. Try a platform name, offer name, or buyer problem.</p>`;
    }
  }

  function render() {
    renderTabs();
    renderStage();
  }

  const search = root.querySelector("[data-launcher-search]");
  if (search) {
    search.addEventListener("input", () => {
      state.query = search.value || "";
      const query = state.query.toLowerCase().trim();
      const exactPlatform = platforms.find((platform) => platformIdentityMatches(platform, query));
      if (exactPlatform) {
        state.platform = exactPlatform.id;
        render();
        return;
      }
      const activeHasMatches = activePlatform().cards.some((card) => cardMatches(card, query)) || platformMatches(activePlatform(), query);
      if (query && !activeHasMatches) {
        const next = platforms.find((platform) => platformMatches(platform, query) || platform.cards.some((card) => cardMatches(card, query)));
        if (next) state.platform = next.id;
      }
      render();
    });
  }

  root.querySelectorAll("[data-launcher-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      state.platform = button.dataset.launcherDemo || platforms[0].id;
      if (search) {
        search.value = "";
        state.query = "";
      }
      render();
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  window.MetrAIyuxPlatformLauncher = {
    platforms,
    setPlatform(id) {
      state.platform = id;
      render();
    }
  };

  render();
})();
