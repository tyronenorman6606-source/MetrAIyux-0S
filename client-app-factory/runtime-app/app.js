const FACTORY_PUBLIC_BASE = "/client-app-factory";
const root = document.querySelector("[data-app-root]");
const nav = document.querySelector("[data-nav]");
const liveLink = document.querySelector("[data-live-link]");
const bookLink = document.querySelector("[data-book-link]");
const brandName = document.querySelector("[data-brand-name]");
const brandMark = document.querySelector("[data-brand-mark]");
const homeLink = document.querySelector("[data-home-link]");
const CONFIG = window.__CLIENT_APP_FACTORY__ || {};

function runtimeApiBase() {
  const explicit = String(
    CONFIG.apiBase
      || document.querySelector('meta[name="client-app-factory-api-base"]')?.getAttribute("content")
      || ""
  ).trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname)) {
    return "/api";
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.includes("client-app-factory") ? "/api/client-app-factory" : "/api";
}

const API_BASE = runtimeApiBase();

const PAGE_META = {
  "index.html": { label: "Home", title: "App Home" },
  "inventory.html": { label: "Inventory", title: "Inventory" },
  "specials.html": { label: "Specials", title: "Specials" },
  "gallery.html": { label: "Gallery", title: "Gallery" },
  "blog.html": { label: "Updates", title: "Updates" },
  "faq.html": { label: "FAQ", title: "FAQ" },
  "contact.html": { label: "Contact", title: "Contact" },
  "local-seo.html": { label: "Local", title: "Local Presence" },
  "scan.html": { label: "Scan", title: "Scan & Preview" },
  "flyer.html": { label: "Flyer", title: "Flyer" },
  "workspace-preview.html": { label: "Preview", title: "Workspace Preview" }
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function runtimeInfo() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const factoryIndex = parts.indexOf("client-app-factory");
  const generatedIndex = parts.indexOf("generated");
  const clientId = generatedIndex >= 0 ? parts[generatedIndex + 1] : "unknown-client";
  const leaf = parts[parts.length - 1];
  const page = PAGE_META[leaf] ? leaf : "index.html";
  const basePath = generatedIndex >= 0 ? `/${parts.slice(0, generatedIndex + 2).join("/")}` : `${FACTORY_PUBLIC_BASE}/generated/${clientId}`;
  return { clientId, page, basePath, fullPath: window.location.pathname };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", signal: options.signal });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function primaryContact(record) {
  return record.contacts?.[0] || {};
}

function primaryLocation(record) {
  return record.locations?.[0] || {};
}

function themeColor(record) {
  return record.brandProfile?.themeColor || "#8cc9ff";
}

function liveSurface(record) {
  return record.sourceUrls?.[0] || record.brandProfile?.publicUrl || record.valleySync?.landingPageUrl || "";
}

function bookingLink(record) {
  return record.brandProfile?.bookingUrl || record.paymentPlan?.lane || liveSurface(record) || `${runtimeInfo().basePath}/contact.html`;
}

function mediaImage(record) {
  return record.mediaAssets?.[0] || "";
}

function logoImage(record) {
  return record.logoAssets?.[0] || "";
}

function niche(record) {
  const haystack = [
    record.displayName,
    record.industry,
    ...(record.services || []),
    ...(record.categories || []),
    ...(record.tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/trading card|tcg|gaming|pokemon|magic|lorcana|yu-gi-oh|card shop/.test(haystack)) {
    return "trading-card";
  }
  if (/pallet|logistics|warehouse|freight|supply/.test(haystack)) {
    return "industrial";
  }
  if (/barber|fade|salon|stylist|beauty|groom/.test(haystack)) {
    return "beauty";
  }
  if (/photo|video|film|studio|creative|production/.test(haystack)) {
    return "creative";
  }
  return "general";
}

function cityLine(record) {
  const location = primaryLocation(record);
  return [location.city, location.state].filter(Boolean).join(", ") || "Arizona";
}

function surfaceVoice(record) {
  const profile = {
    "trading-card": {
      kicker: "Card room, retail floor, and event lane",
      subtitleFallback: "Built to push sealed product, singles, events, and community nights without feeling like generic ecommerce.",
      primaryCta: "See events + shop",
      secondaryCta: "Enter preview room",
      moduleEyebrow: "Deck Module",
      servicesFallback: [
        "Sealed product and featured singles lane",
        "Play nights, prerelease, and tournament schedule",
        "Trade-in, preorder, and community CTA stack",
        "Gallery and proof routes tied to local events"
      ],
      offerHeader: "Drops, promos, and event pushes",
      offerCopy: "Keep launches, restocks, and tournament pushes moving without rebuilding the entire app.",
      offers: [
        "Feature this week's sealed drops and featured singles",
        "Turn flyer and QR traffic into event RSVPs or online cart visits",
        "Swap promos fast when a new set or trade night hits"
      ],
      liveTitle: "Built from the real card-shop surface",
      liveCopy: "This app is supposed to feel like the store floor, the event board, and the online sell-through lane all at once.",
      proofTitle: "Ready for player traffic and owner approval",
      proofBullets: [
        "Workspace preview with a clean tester code",
        "Online shop / TCG lane wired into the build",
        "Valley listing and event traffic aimed at the same routes",
        "Verification pass logged before handoff"
      ],
      inventoryTitle: "Product lanes, events, and traffic hooks",
      inventoryCopy: "The app keeps product, events, and contact points moving together so the store does not feel fragmented.",
      galleryTitle: "Real store media and event moments",
      galleryCopy: "Store photos, play-space shots, and promo-ready stills belong here instead of template filler.",
      blogTitle: "Drops, events, and community updates",
      blogCopy: "Use this lane for launches, restocks, tournament announcements, and local search traffic.",
      seoTitle: "Local card traffic in motion",
      seoCopy: "This lane helps players find the shop, the event calendar, and the online purchase path from one local surface."
    },
    industrial: {
      kicker: "Yard inventory, dispatch, and quote lane",
      subtitleFallback: "Built to move inventory, delivery requests, and proof-heavy trust signals without feeling like brochureware.",
      primaryCta: "Request quote",
      secondaryCta: "Open operator preview",
      moduleEyebrow: "Ops Module",
      servicesFallback: [
        "Inventory and availability lane",
        "Delivery, dispatch, and service request flow",
        "Quote, contact, and proof stack",
        "Local SEO and route-specific landing pages"
      ],
      offerHeader: "Inventory turns and job-ready promos",
      offerCopy: "Keep surplus, delivery windows, and buyer urgency visible without rewriting the whole site.",
      offers: [
        "Feature in-stock units and fast-turn inventory",
        "Push quote requests from flyer and Valley traffic",
        "Swap sales emphasis between retail, bulk, and delivery"
      ],
      liveTitle: "Built from the real operations surface",
      liveCopy: "The app should feel like a live yard plus a serious quote machine, not a generic local business page.",
      proofTitle: "Ready for quote flow and owner review",
      proofBullets: [
        "Preview workspace and operator proof lane",
        "Delivery, contact, and quote CTAs already mapped",
        "Valley listing points into the same conversion flow",
        "Verification pass captured before handoff"
      ],
      inventoryTitle: "Inventory, dispatch, and sales lanes",
      inventoryCopy: "The app keeps available stock, delivery capability, and buyer action visible on the same surface.",
      galleryTitle: "Real inventory and field proof",
      galleryCopy: "This route is for actual yard, fleet, and delivery media — not stock textures.",
      blogTitle: "Inventory updates and buyer proof",
      blogCopy: "Use this lane for availability changes, delivery coverage, and commercial buyer trust content.",
      seoTitle: "Local industrial demand capture",
      seoCopy: "This lane helps buyers find the inventory, service range, and quote path without bouncing across disconnected pages."
    },
    beauty: {
      kicker: "Booking lane, proof lane, and client trust lane",
      subtitleFallback: "Built to move appointment demand with sharper proof, cleaner calls to action, and less generic salon fluff.",
      primaryCta: "Book now",
      secondaryCta: "Preview client workspace",
      moduleEyebrow: "Studio Module",
      servicesFallback: [
        "Service menu and featured appointments",
        "Style proof, before/after, and social pull-through",
        "Booking and direct-contact lane",
        "Local visibility and review support routes"
      ],
      offerHeader: "Appointments, promos, and retention pushes",
      offerCopy: "Keep seasonal promos, waitlist openings, and premium service pushes moving fast.",
      offers: [
        "Feature the services that need the most traffic this week",
        "Turn flyer and profile clicks into direct bookings",
        "Swap in style-specific promos without losing the rest of the site"
      ],
      liveTitle: "Built from the real service surface",
      liveCopy: "The app should feel like the business at its best: proof-heavy, direct, and easy to book from the first screen.",
      proofTitle: "Ready for appointments and handoff",
      proofBullets: [
        "Preview room for owner review",
        "Booking lane and direct contact already in place",
        "Valley profile and app copy stay aligned",
        "Verification logged before go-live"
      ],
      inventoryTitle: "Service stack and appointment flow",
      inventoryCopy: "This route keeps services, social proof, and booking actions in one clear place.",
      galleryTitle: "Real proof and result media",
      galleryCopy: "Before-and-after work, atmosphere, and client-proof media belong here instead of template shots.",
      blogTitle: "Promos, openings, and trust content",
      blogCopy: "Use this lane for availability, premium service focus, and local trust-building updates.",
      seoTitle: "Local service demand capture",
      seoCopy: "This route helps buyers find the studio, understand the offer, and book without friction."
    },
    creative: {
      kicker: "Portfolio, inquiry, and proof-of-work lane",
      subtitleFallback: "Built to sell the work, the process, and the inquiry path instead of landing on a generic agency shell.",
      primaryCta: "Start a project",
      secondaryCta: "Open preview workspace",
      moduleEyebrow: "Portfolio Module",
      servicesFallback: [
        "Portfolio and featured work lane",
        "Inquiry, production, and booking stack",
        "Proof assets and case-study-ready pages",
        "Local credibility and conversion routes"
      ],
      offerHeader: "Campaign pushes and project openings",
      offerCopy: "Keep featured work, seasonal pushes, and availability updates visible without flattening the brand.",
      offers: [
        "Highlight current featured projects and verticals",
        "Push inbound leads from Valley and direct traffic into the right inquiry lane",
        "Swap focus between photography, video, events, and retained work"
      ],
      liveTitle: "Built from the real creative surface",
      liveCopy: "The app should show taste, proof, and conversion discipline at the same time.",
      proofTitle: "Ready for lead capture and review",
      proofBullets: [
        "Preview workspace for internal/client review",
        "Portfolio media and inquiry route tied together",
        "Valley presence and app route share the same message",
        "Verification logged before handoff"
      ],
      inventoryTitle: "Offer stack and conversion routes",
      inventoryCopy: "This route keeps services, portfolio proof, and lead capture aligned instead of splitting them across weak pages.",
      galleryTitle: "Real portfolio media",
      galleryCopy: "Live client work and visual proof belong here — the app should feel like the business, not a placeholder reel.",
      blogTitle: "Projects, releases, and story blocks",
      blogCopy: "Use this lane for launches, featured work, and search-friendly story updates.",
      seoTitle: "Local creative demand capture",
      seoCopy: "This route helps buyers find the work, trust the quality, and contact the studio fast."
    },
    general: {
      kicker: "Lead capture, proof, and local conversion lane",
      subtitleFallback: "Built from the live surface and shaped into a working client app instead of staying a generic brochure.",
      primaryCta: "Contact now",
      secondaryCta: "Preview workspace",
      moduleEyebrow: "Client Module",
      servicesFallback: [
        "Homepage and conversion lane",
        "Inventory or service highlights",
        "Gallery, FAQ, and contact routes",
        "Preview workspace and continuation handoff"
      ],
      offerHeader: "Promos and live surface updates",
      offerCopy: "Keep current campaigns and service emphasis moving without rebuilding the entire app.",
      offers: [
        "Feature what needs attention right now",
        "Turn QR and directory traffic into the right CTA path",
        "Adjust promotional focus without rebuilding the whole surface"
      ],
      liveTitle: "Source-aware build",
      liveCopy: "The factory imported this business from Valley Verified, harvested the live surface, and mounted a working app route under 0S.",
      proofTitle: "Built for the full client lane",
      proofBullets: [
        "Preview workspace with access code and tester allowance",
        "Continuation lane ready after approval",
        "Valley profile sync and public route mapping",
        "Verification pass recorded before handoff"
      ],
      inventoryTitle: "Offer stack",
      inventoryCopy: "These are the client’s current service and inventory lanes generated from the record and live-surface profile.",
      galleryTitle: "Media pulled from the live surface",
      galleryCopy: "No stock nonsense. This lane uses harvested client media when available and falls back gracefully when a source is weak.",
      blogTitle: "Content lane ready",
      blogCopy: "This route is where Valley, social, and app-side updates can stay in sync instead of drifting apart.",
      seoTitle: "Local presence",
      seoCopy: "This route exists so every generated app has a local relevance lane tied to the same place data as Valley Verified."
    }
  };
  return profile[niche(record)];
}

function pageHref(basePath, route) {
  return `${basePath}${route}`;
}

function routeList(record) {
  const routes = [...(record.publicRoutes || []), ...(record.privateRoutes || [])];
  const unique = [];
  for (const route of routes) {
    if (route && !unique.includes(route)) unique.push(route);
  }
  return unique.length ? unique : ["/index.html"];
}

function updateChrome(record, info) {
  const contact = primaryContact(record);
  const location = primaryLocation(record);
  const pageMeta = PAGE_META[info.page] || PAGE_META["index.html"];
  const live = liveSurface(record);
  const book = bookingLink(record);
  const logo = logoImage(record);
  const accent = themeColor(record);
  document.documentElement.style.setProperty("--accent", accent);
  document.title = `${record.displayName} · ${pageMeta.title}`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", accent);
  brandName.textContent = record.displayName || "Client App";
  if (logo) {
    brandMark.style.background = `center / cover no-repeat url("${logo}")`;
    brandMark.style.boxShadow = "0 12px 24px rgba(84, 140, 255, 0.18)";
  }
  homeLink.href = pageHref(info.basePath, "/index.html");
  liveLink.href = live || pageHref(info.basePath, "/index.html");
  bookLink.href = book;
  bookLink.textContent = record.industry?.toLowerCase().includes("trading") ? "Shop / Reserve" : "Book / Buy";
  nav.innerHTML = routeList(record).map((route) => {
    const file = route.replace(/^\//, "");
    const meta = PAGE_META[file] || { label: file.replace(".html", "") };
    const active = file === info.page ? "active" : "";
    return `<a class="${active}" href="${escapeHtml(pageHref(info.basePath, route))}">${escapeHtml(meta.label)}</a>`;
  }).join("");
  const subtitle = [record.industry, [location.city, location.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  document.body.dataset.clientSubtitle = subtitle;
  document.body.dataset.clientPhone = contact.phone || "";
}

function heroMarkup(record, info) {
  const voice = surfaceVoice(record);
  const contact = primaryContact(record);
  const location = primaryLocation(record);
  const image = mediaImage(record);
  const subtitle = [record.industry, [location.city, location.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const services = (record.services || []).slice(0, 4);
  return `
    <section class="runtime-hero">
      <div class="runtime-hero-grid">
        <div>
          <div class="runtime-kicker">${escapeHtml(voice.kicker)}</div>
          <h1>${escapeHtml(record.displayName)}</h1>
          <p>${escapeHtml(subtitle || voice.subtitleFallback)}</p>
          <div class="runtime-hero-actions">
            <a class="runtime-button" href="${escapeHtml(pageHref(info.basePath, "/contact.html"))}">${escapeHtml(voice.primaryCta)}</a>
            <a class="runtime-button ghost" href="${escapeHtml(pageHref(info.basePath, "/workspace-preview.html"))}">${escapeHtml(voice.secondaryCta)}</a>
          </div>
          <div class="runtime-meta">
            ${contact.phone ? `<span class="runtime-pill">${escapeHtml(contact.phone)}</span>` : ""}
            ${contact.email ? `<span class="runtime-pill">${escapeHtml(contact.email)}</span>` : ""}
            ${record.previewConfig?.accessCode ? `<span class="runtime-pill">Code ${escapeHtml(record.previewConfig.accessCode)}</span>` : ""}
          </div>
        </div>
        <div class="runtime-stage">
          <div class="runtime-card-stage">
            <div class="runtime-card">
              <div class="runtime-card-face">
                <div class="runtime-card-media" style="${image ? `--media-image:url('${image}')` : ""}"></div>
                <div class="runtime-card-content">
                  <div>
                    <div class="runtime-card-badge">${escapeHtml(record.industry || "Client App")}</div>
                  </div>
                  <div>
                    <h2 class="runtime-card-title">${escapeHtml(record.displayName)}</h2>
                    <p class="runtime-card-subtitle">${escapeHtml([location.city, location.state].filter(Boolean).join(", ") || "Arizona business")}</p>
                    <div class="runtime-card-stats">
                      ${services.map((service) => `<span>${escapeHtml(service)}</span>`).join("")}
                    </div>
                  </div>
                </div>
              </div>
              <div class="runtime-card-back">
                <div class="runtime-card-back-content">
                  <div class="runtime-card-badge">0S Generated Surface</div>
                  <div class="runtime-card-grid">
                    <article><strong>Live Surface</strong><span>${escapeHtml(liveSurface(record) || "Attached")}</span></article>
                    <article><strong>Workspace</strong><span>${escapeHtml(record.previewConfig?.workspaceName || "Preview ready")}</span></article>
                    <article><strong>Routes</strong><span>${escapeHtml(String((record.publicRoutes || []).length))} public</span></article>
                    <article><strong>SkyePay</strong><span>${escapeHtml(record.paymentPlan?.status || "Linked")}</span></article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function servicesMarkup(record) {
  const voice = surfaceVoice(record);
  const services = (record.services || []).length ? record.services : voice.servicesFallback;
  return `
    <section class="runtime-section">
      <div class="runtime-section-grid">
        ${services.map((service) => `
          <article class="runtime-panel">
            <p class="eyebrow">${escapeHtml(voice.moduleEyebrow)}</p>
            <h3>${escapeHtml(service)}</h3>
            <p>This route is grounded in the client record, then sharpened by the factory so the app feels built for the business instead of dropped from a generic shell.</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function homePage(record, info) {
  const voice = surfaceVoice(record);
  return `
    ${heroMarkup(record, info)}
    ${servicesMarkup(record)}
    <section class="runtime-section">
      <div class="runtime-contact-grid">
        <article class="runtime-info-card">
          <p class="eyebrow">Live Surface</p>
          <h3>${escapeHtml(voice.liveTitle)}</h3>
          <p>${escapeHtml(voice.liveCopy)}</p>
          <div class="runtime-inline-actions">
            <a class="runtime-button" href="${escapeHtml(liveSurface(record) || pageHref(info.basePath, "/contact.html"))}" target="_blank" rel="noreferrer">Open source surface</a>
            <a class="runtime-button ghost" href="${escapeHtml(pageHref(info.basePath, "/gallery.html"))}">View media</a>
          </div>
        </article>
        <article class="runtime-info-card">
          <p class="eyebrow">Proof + Handoff</p>
          <h3>${escapeHtml(voice.proofTitle)}</h3>
          <ul class="runtime-list">
            ${voice.proofBullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
  `;
}

function inventoryPage(record, info) {
  const voice = surfaceVoice(record);
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Inventory / Services</p>
      <h1>${escapeHtml(voice.inventoryTitle)}</h1>
      <p>${escapeHtml(voice.inventoryCopy)}</p>
    </section>
    ${servicesMarkup(record)}
  `;
}

function specialsPage(record, info) {
  const voice = surfaceVoice(record);
  const offers = voice.offers;
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Specials</p>
      <h1>${escapeHtml(voice.offerHeader)}</h1>
      <p>${escapeHtml(voice.offerCopy)}</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-section-grid">
        ${offers.map((offer, index) => `
          <article class="runtime-panel">
            <p class="eyebrow">Offer ${index + 1}</p>
            <h3>${escapeHtml(record.displayName)} spotlight</h3>
            <p>${escapeHtml(offer)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function galleryPage(record) {
  const voice = surfaceVoice(record);
  const images = [mediaImage(record), ...((record.mediaAssets || []).slice(1, 5))].filter(Boolean);
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Gallery</p>
      <h1>${escapeHtml(voice.galleryTitle)}</h1>
      <p>${escapeHtml(voice.galleryCopy)}</p>
    </section>
    <section class="runtime-section">
      ${
        images.length
          ? `<div class="runtime-gallery-grid">
              ${images.map((image, index) => `
                <article class="runtime-gallery-item">
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(record.displayName)} media ${index + 1}">
                  <strong>${escapeHtml(record.displayName)} media ${index + 1}</strong>
                  <p>Live-surface asset connected to the generated app profile.</p>
                </article>
              `).join("")}
            </div>`
          : `<div class="runtime-empty-state">No live media asset was exposed by the source surface yet. The runtime app still mounts cleanly and can accept uploaded brand media later.</div>`
      }
    </section>
  `;
}

function blogPage(record) {
  const voice = surfaceVoice(record);
  const topics = [
    `${record.displayName} announcements and event updates`,
    `Operational proof and customer questions for ${record.displayName}`,
    `Local visibility content generated from the ${record.industry || "client"} lane`
  ];
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Updates</p>
      <h1>${escapeHtml(voice.blogTitle)}</h1>
      <p>${escapeHtml(voice.blogCopy)}</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-section-grid">
        ${topics.map((topic, index) => `
          <article class="runtime-panel">
            <p class="eyebrow">Post ${index + 1}</p>
            <h3>${escapeHtml(topic)}</h3>
            <p>Prepared for factory-enhanced content blocks, buyer proof, and niche-specific media modules.</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function faqPage(record) {
  const location = primaryLocation(record);
  const contact = primaryContact(record);
  const faqs = [
    {
      q: `How do I contact ${record.displayName}?`,
      a: [contact.phone, contact.email].filter(Boolean).join(" · ") || "Use the contact route for direct outreach."
    },
    {
      q: "Where are you located?",
      a: [location.address, location.city, location.state, location.postalCode].filter(Boolean).join(", ") || "Location details are being finalized in the client record."
    },
    {
      q: "How do I preview the workspace?",
      a: record.previewConfig?.accessCode ? `Use preview code ${record.previewConfig.accessCode} inside the workspace preview route.` : "Workspace preview settings are still being attached."
    },
    {
      q: "How does continuation work?",
      a: "The preview lane can roll straight into a SkyePay continuation workflow once the owner approves the app."
    }
  ];
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">FAQ</p>
      <h1>Questions answered from the actual client record</h1>
      <p>The point is to keep support copy tied to the same data the factory uses everywhere else.</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-faq-grid">
        ${faqs.map((faq) => `
          <article class="runtime-faq-item">
            <h3>${escapeHtml(faq.q)}</h3>
            <p>${escapeHtml(faq.a)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function contactPage(record) {
  const contact = primaryContact(record);
  const location = primaryLocation(record);
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Contact</p>
      <h1>Direct contact lane</h1>
      <p>Everything here comes from the imported record, so the generated app stays useful from the first run.</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-contact-grid">
        <article class="runtime-info-card">
          <p class="eyebrow">Primary</p>
          <h3>${escapeHtml(contact.name || record.displayName)}</h3>
          <p>${escapeHtml(contact.phone || "Phone pending")}</p>
          <p>${escapeHtml(contact.email || "Email pending")}</p>
          <div class="runtime-inline-actions">
            ${contact.phone ? `<a class="runtime-button" href="tel:${escapeHtml(contact.phone.replace(/[^\d+]/g, ""))}">Call</a>` : ""}
            ${contact.email ? `<a class="runtime-button ghost" href="mailto:${escapeHtml(contact.email)}">Email</a>` : ""}
          </div>
        </article>
        <article class="runtime-info-card">
          <p class="eyebrow">Location</p>
          <h3>${escapeHtml([location.city, location.state].filter(Boolean).join(", ") || "Arizona")}</h3>
          <p>${escapeHtml([location.address, location.postalCode].filter(Boolean).join(" ") || "Address pending in client record.")}</p>
          <div class="runtime-inline-actions">
            ${liveSurface(record) ? `<a class="runtime-button" href="${escapeHtml(liveSurface(record))}" target="_blank" rel="noreferrer">Open live site</a>` : ""}
            ${bookingLink(record) ? `<a class="runtime-button ghost" href="${escapeHtml(bookingLink(record))}" target="_blank" rel="noreferrer">Book / Buy</a>` : ""}
          </div>
        </article>
      </div>
    </section>
  `;
}

function localSeoPage(record) {
  const voice = surfaceVoice(record);
  const location = primaryLocation(record);
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Local SEO</p>
      <h1>${escapeHtml(voice.seoTitle)} · ${escapeHtml(cityLine(record))}</h1>
      <p>${escapeHtml(voice.seoCopy)}</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-contact-grid">
        <article class="runtime-info-card">
          <p class="eyebrow">Market</p>
          <h3>${escapeHtml([location.city, location.state].filter(Boolean).join(", ") || "Regional service area")}</h3>
          <p>${escapeHtml(record.industry || "Client business lane")}</p>
        </article>
        <article class="runtime-info-card">
          <p class="eyebrow">Search intent</p>
          <ul class="runtime-list">
            <li>Route local buyers to the correct app lane</li>
            <li>Keep Valley profile and app copy aligned</li>
            <li>Make conversion actions visible on every page</li>
          </ul>
        </article>
      </div>
    </section>
  `;
}

function scanPage(record, info) {
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Scan Route</p>
      <h1>QR + preview handoff lane</h1>
      <p>Give the customer a clean handoff page without exposing the operator guts.</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-contact-grid">
        <article class="runtime-info-card">
          <p class="eyebrow">Preview Code</p>
          <h3>${escapeHtml(record.previewConfig?.accessCode || "Pending")}</h3>
          <p>${escapeHtml(record.previewConfig?.workspaceName || "Workspace preview pending")}</p>
          <div class="runtime-inline-actions">
            <a class="runtime-button" href="${escapeHtml(pageHref(info.basePath, "/workspace-preview.html"))}">Open workspace preview</a>
          </div>
        </article>
        <article class="runtime-info-card">
          <p class="eyebrow">Continuation</p>
          <h3>${escapeHtml(record.paymentPlan?.provider || "SkyePay")}</h3>
          <p>${escapeHtml(record.paymentPlan?.status || "Lane pending")}</p>
          ${record.paymentPlan?.lane ? `<a class="runtime-button ghost" href="${escapeHtml(record.paymentPlan.lane)}">Open continuation lane</a>` : ""}
        </article>
      </div>
    </section>
  `;
}

function flyerPage(record) {
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Flyer Surface</p>
      <h1>Portable promo lane</h1>
      <p>Use this route as the app-linked destination for flyers, handouts, and campaign QR codes.</p>
    </section>
    <section class="runtime-section">
      <article class="runtime-info-card runtime-grid-span">
        <h3>${escapeHtml(record.displayName)} campaign landing</h3>
        <p>Because this route is powered by the record, the same app can back a physical flyer, Valley listing, and paid continuation lane without three separate edits.</p>
      </article>
    </section>
  `;
}

function workspacePreviewPage(record) {
  return `
    <section class="runtime-page-header">
      <p class="eyebrow">Workspace Preview</p>
      <h1>${escapeHtml(record.previewConfig?.workspaceName || `${record.displayName} Preview Workspace`)}</h1>
      <p>This client gets a real tester lane, not a dead mock. The access code and usage policy are attached below.</p>
    </section>
    <section class="runtime-section">
      <div class="runtime-contact-grid">
        <article class="runtime-info-card">
          <p class="eyebrow">Access</p>
          <h3>${escapeHtml(record.previewConfig?.accessCode || "Pending")}</h3>
          <p>${escapeHtml(record.previewConfig?.workspaceId || `${record.clientId}-preview-001`)}</p>
        </article>
        <article class="runtime-info-card">
          <p class="eyebrow">Allowance</p>
          <ul class="runtime-list">
            <li>${escapeHtml(String(record.workspacePlan?.freeTesterDays || 7))} tester days</li>
            <li>${escapeHtml(String(record.workspacePlan?.includedScans || 7))} included scans</li>
            <li>${escapeHtml(String(record.workspacePlan?.includedCommands || 25))} included commands</li>
          </ul>
        </article>
      </div>
    </section>
  `;
}

function renderPage(record, info) {
  const page = info.page;
  if (page === "inventory.html") return inventoryPage(record, info);
  if (page === "specials.html") return specialsPage(record, info);
  if (page === "gallery.html") return galleryPage(record, info);
  if (page === "blog.html") return blogPage(record, info);
  if (page === "faq.html") return faqPage(record, info);
  if (page === "contact.html") return contactPage(record, info);
  if (page === "local-seo.html") return localSeoPage(record, info);
  if (page === "scan.html") return scanPage(record, info);
  if (page === "flyer.html") return flyerPage(record, info);
  if (page === "workspace-preview.html") return workspacePreviewPage(record, info);
  return homePage(record, info);
}

async function main() {
  const info = runtimeInfo();
  const controller = new AbortController();
  let unloading = false;
  const markUnloading = () => {
    unloading = true;
    controller.abort();
  };
  addEventListener("pagehide", markUnloading, { once: true });
  addEventListener("beforeunload", markUnloading, { once: true });
  try {
    const response = await fetchJson(`${API_BASE}/factory/records/${encodeURIComponent(info.clientId)}`, {
      signal: controller.signal
    });
    const record = response.record;
    updateChrome(record, info);
    root.innerHTML = renderPage(record, info);
  } catch (error) {
    if (unloading || controller.signal.aborted || error?.name === "AbortError") return;
    console.error(error);
    root.innerHTML = `
      <section class="runtime-empty">
        <div class="runtime-empty-card">
          <p class="eyebrow">Client runtime unavailable</p>
          <h1>We couldn’t load this generated client app.</h1>
          <p>${escapeHtml(error.message || "Unknown error")}</p>
          <p class="runtime-footnote">The 0S worker route is mounted, but this client record was not reachable from the factory adapter.</p>
        </div>
      </section>
    `;
  }
}

main();
