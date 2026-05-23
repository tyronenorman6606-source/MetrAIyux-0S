#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(__dirname, "..");
const appDir = path.join(factoryRoot, "client-apps", "as-you-wish-pottery-westgate");
const publicBase = "/client-app-factory/client-apps/as-you-wish-pottery-westgate/";
const prodBase = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/client-apps/as-you-wish-pottery-westgate/";
const valleyUrl = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/as-you-wish-pottery-westgate/";
const signinProUrl = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/signinpro/index.html?workspace=as-you-wish-pottery-westgate";
const official = "https://asyouwishpottery.com";

const img = {
  logo: "https://asyouwishpottery.com/cdn/shop/files/logo_rounded_square.png?v=1772496337&width=500",
  hero: "https://asyouwishpottery.com/cdn/shop/files/hero-image-mobile-home-page.jpg?v=1768347806&width=1800",
  examples: "https://asyouwishpottery.com/cdn/shop/files/Example_Pieces_Collage.png?v=1759769877&width=1800",
  party: "https://asyouwishpottery.com/cdn/shop/files/birthday_parties_1.png?v=1763753641&width=1200",
  locations: "https://asyouwishpottery.com/cdn/shop/files/shopify_locations_page.png?v=1763570268&width=1200",
  square: "https://asyouwishpottery.com/cdn/shop/files/web_square_2.png?v=1763755743&width=1200"
};

const routes = [
  { href: "index.html", label: "Start" },
  { href: "inventory.html", label: "How it works" },
  { href: "specials.html", label: "Savings" },
  { href: "gallery.html", label: "Gallery" },
  { href: "blog.html", label: "Guide" },
  { href: "local-seo.html", label: "Westgate" },
  { href: "workspace-preview.html", label: "Workspace" },
  { href: "contact.html", label: "Visit" }
];

const categories = [
  {
    file: "categories/featured-products.html",
    title: "Pottery Pieces",
    eyebrow: "Choose the canvas",
    image: img.examples,
    body: "Guests begin by choosing a ceramic piece from the studio shelves. The app keeps that first decision simple for families, dates, birthday groups, classrooms, and walk-in painters.",
    bullets: ["Bowls, mugs, figures, keepsakes, and seasonal pieces", "Large selection in the common project range", "Clear path from selection to paint table"]
  },
  {
    file: "categories/service-packages.html",
    title: "Birthday Parties",
    eyebrow: "Gather the group",
    image: img.party,
    body: "The party lane is built for hosts who need arrivals, guest names, notes, and next steps gathered before everyone reaches the counter.",
    bullets: ["In-studio party path", "Host-friendly arrival checklist", "One link for guests before the table is ready"]
  },
  {
    file: "categories/premium-collection.html",
    title: "Classes And Workshops",
    eyebrow: "Guided making",
    image: img.square,
    body: "Classes and workshops need a cleaner pre-arrival flow than a normal browse page. This surface points guests toward calendars, group notes, and the right start lane.",
    bullets: ["Small group classes", "Kids summer classes", "Workshops and events"]
  },
  {
    file: "categories/accessories.html",
    title: "Paints And Studio Supplies",
    eyebrow: "Everything on the table",
    image: img.hero,
    body: "The official studio experience includes paints, supplies, glazing, and firing with the studio fee. This page explains the support behind the finished piece.",
    bullets: ["Paints and brushes", "Idea Center support", "Glazing and kiln firing handled by staff"]
  },
  {
    file: "categories/tools-devices.html",
    title: "Idea Center",
    eyebrow: "Techniques and inspiration",
    image: img.examples,
    body: "The Idea Center is where guests find colors, stickers, patterns, examples, and technique inspiration before they commit to a design.",
    bullets: ["Technique prompts", "Hand and footprint ideas", "Project examples"]
  },
  {
    file: "categories/specialty-products.html",
    title: "Seasonal Projects",
    eyebrow: "Occasion-ready pieces",
    image: img.square,
    body: "Seasonal projects turn a normal visit into a reason to come back. This route gives the app a place for holidays, workshops, and timely creative ideas.",
    bullets: ["Holiday pieces", "Workshop themes", "Limited-time ideas"]
  },
  {
    file: "categories/core-inventory.html",
    title: "Open Studio Visits",
    eyebrow: "Walk in and paint",
    image: img.hero,
    body: "Open studio guests need to know how the visit works: pick a piece, paint it, leave it for finishing, then pick it up in a few days.",
    bullets: ["Studio fee plus pottery piece", "All ages and skill levels", "Finished piece pickup after firing"]
  },
  {
    file: "categories/experience-setup.html",
    title: "Field Trips And Team Builds",
    eyebrow: "Groups without confusion",
    image: img.locations,
    body: "Field trips and team-builds need clean arrival context. This route turns group intake into a staff-ready handoff instead of scattered notes.",
    bullets: ["Teacher or group-leader notes", "Team-building arrival path", "Headcount and visit reason captured early"]
  },
  {
    file: "categories/add-on-products.html",
    title: "Gift Cards And Family Fun Passes",
    eyebrow: "Keep the visit going",
    image: img.square,
    body: "The official site sells gift cards and Family Fun Passes. This app route keeps that offer close to the visit flow without pretending to be a shop checkout.",
    bullets: ["Gift card path", "Family Fun Pass pointer", "Return-visit handoff"]
  }
];

const guidePosts = [
  {
    file: "blog/local-business-shopping-guide.html",
    title: "First-Time Painter Guide",
    desc: "What happens between picking a piece and picking up the finished pottery.",
    body: "Choose a piece, paint at the table, leave the piece for glazing and kiln firing, then return in a few days for the finished keepsake.",
    image: img.hero
  },
  {
    file: "blog/products-services-guide.html",
    title: "Pieces, Parties, And Programs",
    desc: "A clean map of the official As You Wish paths: open studio visits, parties, classes, field trips, and team building.",
    body: "This is not a catalog page. It is a guest-path page that keeps the major studio reasons separated so families and group leaders know where to go.",
    image: img.party
  },
  {
    file: "blog/premium-core-setup-basics.html",
    title: "Group Arrival Setup",
    desc: "How SignIn Pro by NorthStar can organize birthday parties, classes, field trips, and team-build groups before they arrive.",
    body: "The app captures the reason for the visit, the guest or group name, and staff-facing notes. The main As You Wish site remains the source for current booking details.",
    image: img.locations
  },
  {
    file: "blog/add-on-products-feature.html",
    title: "Gift Cards And Return Visits",
    desc: "How gift cards, Family Fun Passes, and finished-piece pickup fit into the follow-up path.",
    body: "A finished piece creates a natural return moment. The app keeps pickup, gift cards, and repeat-visit prompts in one guest-friendly lane.",
    image: img.square
  }
];

function prefixFor(file) {
  const depth = file.split("/").length - 1;
  return depth === 0 ? "" : "../".repeat(depth);
}

function nav(prefix) {
  return routes.map((route) => `<a href="${prefix}${route.href}">${route.label}</a>`).join("");
}

function layout(file, { title, desc, eyebrow = "As You Wish Pottery", heroTitle, heroText, image = img.hero, body, extra = "", pageClass = "" }) {
  const prefix = prefixFor(file);
  const imageAlt = `${title} at As You Wish Pottery`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | As You Wish Pottery Westgate</title>
  <meta name="description" content="${desc}">
  <meta name="theme-color" content="#fff7ea">
  <meta property="og:title" content="${title} | As You Wish Pottery Westgate">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${image}">
  <link rel="manifest" href="${prefix}manifest.webmanifest">
  <link rel="icon" href="${img.logo}">
  <link rel="stylesheet" href="${prefix}styles.css">
</head>
<body class="${pageClass}">
  <div class="wash" aria-hidden="true"></div>
  <header class="site-header">
    <a class="brand" href="${prefix}index.html"><img src="${img.logo}" alt="As You Wish Pottery logo"><span>As You Wish Pottery<small>Westgate visit app</small></span></a>
    <nav class="navlinks">${nav(prefix)}<a class="reserve" href="${official}/pages/locations" target="_blank" rel="noopener">Reserve</a></nav>
  </header>
  <main>
    <section class="page-hero">
      <div class="hero-copy">
        <p class="eyebrow">${eyebrow}</p>
        <h1 class="pottery-title">${heroTitle || title}</h1>
        <p>${heroText || desc}</p>
        <div class="actions">
          <a class="button primary" href="${official}/pages/locations" target="_blank" rel="noopener">Make a reservation</a>
          <a class="button" href="${prefix}workspace-preview.html">Open arrival workspace</a>
        </div>
      </div>
      <figure class="hero-media"><img src="${image}" alt="${imageAlt}" loading="eager"><figcaption>${eyebrow}</figcaption></figure>
    </section>
    ${body || ""}
    ${extra}
  </main>
  <footer class="site-footer">
    <span>9410 W Hanna Ln, Suite A109, Glendale, AZ 85305</span>
    <a href="tel:6237725403">(623) 772-5403</a>
    <a href="${valleyUrl}">Valley Verified</a>
  </footer>
  <script src="${prefix}script.js" defer></script>
</body>
</html>
`;
}

function section(title, copy, cards = []) {
  return `<section class="section"><div class="section-head"><p class="eyebrow">${title}</p><h2>${copy}</h2></div>${cards.length ? `<div class="card-grid">${cards.join("")}</div>` : ""}</section>`;
}

function card(title, copy, href = "") {
  const tag = href ? "a" : "article";
  const link = href ? ` href="${href}"` : "";
  return `<${tag} class="info-card"${link}><span></span><h3>${title}</h3><p>${copy}</p></${tag}>`;
}

function imageBand(image, title, copy, href = "") {
  return `<section class="image-band"><img src="${image}" alt="${title}" loading="lazy"><div><p class="eyebrow">${title}</p><h2>${copy}</h2>${href ? `<a class="button primary" href="${href}" target="_blank" rel="noopener">Open on As You Wish</a>` : ""}</div></section>`;
}

function categoryPage(item) {
  return layout(item.file, {
    title: item.title,
    desc: item.body,
    eyebrow: item.eyebrow,
    image: item.image,
    body: section("What this route handles", "A focused page for one real As You Wish studio moment.", item.bullets.map((bullet) => card(bullet, item.body)))
  });
}

function guidePost(post) {
  return layout(post.file, {
    title: post.title,
    desc: post.desc,
    eyebrow: "Guest guide",
    image: post.image,
    body: `<section class="article-body"><p>${post.body}</p><div class="actions"><a class="button primary" href="../workspace-preview.html">Use the arrival workspace</a><a class="button" href="${official}" target="_blank" rel="noopener">Main As You Wish site</a></div></section>`
  });
}

const files = new Map();

files.set("index.html", layout("index.html", {
  title: "Start Your Pottery Visit",
  desc: "A Westgate-focused As You Wish Pottery visit app for open studio painters, birthday parties, field trips, classes, and team-build groups.",
  eyebrow: "Paint your own pottery in Glendale",
  heroTitle: "Start the studio visit before the first brush hits the piece.",
  heroText: "Choose the right path for open studio painting, parties, classes, field trips, or team-building before everyone reaches the counter.",
  image: img.hero,
  body: `
    <section class="intro-studio">
      <div class="pottery-wheel" aria-hidden="true"><span></span><i></i><b></b></div>
      <div>
        <p class="eyebrow">Actual studio flow</p>
        <h2>Pick a piece, paint it, leave it for glazing and firing, then pick it up in a few days.</h2>
        <p>The official As You Wish experience includes paints, supplies, glazing, and kiln firing with the studio fee. This app turns that visit into a clean phone-first path.</p>
      </div>
    </section>
    ${section("Visit lanes", "Tap the kind of visit and keep the group moving.", [
      card("Open studio", "For families, dates, and walk-in painters choosing a piece and painting at the studio.", "categories/core-inventory.html"),
      card("Birthday parties", "For hosts sending one arrival link before the table is ready.", "categories/service-packages.html"),
      card("Field trips", "For teachers and group leaders giving staff the visit context up front.", "categories/experience-setup.html"),
      card("Classes and workshops", "For guided sessions, kids summer classes, and workshop/event check-in.", "categories/premium-collection.html")
    ])}
    ${imageBand(img.examples, "Painted examples", "The page uses real As You Wish imagery so the app feels like the studio, not a swapped-logo shell.", `${official}/pages/how-it-works`)}
  `
}));

files.set("inventory.html", layout("inventory.html", {
  title: "How It Works",
  desc: "The real As You Wish visit flow: choose pottery, paint at the table, staff glaze and fire, then pick up the finished piece.",
  eyebrow: "Studio flow",
  heroTitle: "From blank pottery to finished keepsake.",
  heroText: "A painter should understand the visit in seconds: choose, paint, fire, pickup.",
  image: img.examples,
  body: section("Four steps", "The app explains the visit instead of dumping store categories.", [
    card("1. Choose a piece", "Pick from mugs, bowls, figures, keepsakes, seasonal projects, and other ceramic options."),
    card("2. Paint at the table", "Use studio paints, brushes, supplies, and idea prompts while staff can assist."),
    card("3. Leave it for finishing", "The studio handles glazing and kiln firing after the painter is done."),
    card("4. Pick it up", "Guests return in a few days for the finished piece.")
  ])
}));

files.set("specials.html", layout("specials.html", {
  title: "Savings And Return Visits",
  desc: "A focused route for As You Wish gift cards, Family Fun Passes, coupons, and return-visit prompts.",
  eyebrow: "Specials and savings",
  heroTitle: "Make the next visit easy to say yes to.",
  heroText: "Gift cards, Family Fun Passes, coupons, and finished-piece pickup are the natural follow-up moments.",
  image: img.square,
  body: section("Useful handoffs", "The app keeps official As You Wish savings paths close without inventing offers.", [
    card("Gift cards", "Open the official gift card and Family Fun Pass page.", `${official}/pages/gift-cards-family-fun-passes`),
    card("Coupon page", "Send guests to the official Specials & Savings page for current offers.", `${official}/pages/coupon`),
    card("Pickup reminder", "Use the workspace to route finished-piece pickup notes and follow-up.")
  ])
}));

files.set("gallery.html", layout("gallery.html", {
  title: "Studio Gallery",
  desc: "Real As You Wish Pottery visuals: studio shelves, painted examples, party imagery, and location context.",
  eyebrow: "Real media",
  heroTitle: "The app should look like the studio people are actually visiting.",
  heroText: "These visuals come from the live As You Wish site and Valley Verified profile.",
  image: img.hero,
  body: `<section class="gallery-grid">
    <a href="${img.hero}" target="_blank" rel="noopener"><img src="${img.hero}" alt="As You Wish studio shelves"><span>Studio shelves</span></a>
    <a href="${img.examples}" target="_blank" rel="noopener"><img src="${img.examples}" alt="Painted pottery examples"><span>Painted examples</span></a>
    <a href="${img.party}" target="_blank" rel="noopener"><img src="${img.party}" alt="Birthday party pottery painting"><span>Party visit</span></a>
    <a href="${img.locations}" target="_blank" rel="noopener"><img src="${img.locations}" alt="As You Wish locations visual"><span>Locations</span></a>
  </section>`
}));

files.set("delivery.html", layout("delivery.html", {
  title: "Pickup And Group Logistics",
  desc: "Finished-piece pickup, group arrival notes, and staff handoff for As You Wish Pottery Westgate.",
  eyebrow: "After painting",
  heroTitle: "The visit does not end when the brush goes down.",
  heroText: "Guests leave their pieces for glazing and kiln firing, then return in a few days for pickup.",
  image: img.locations,
  body: section("Logistics lanes", "Simple operational pages for moments staff actually has to manage.", [
    card("Finished-piece pickup", "Keep pickup instructions and return timing easy to find."),
    card("Group notes", "Capture party, class, field-trip, or team-build notes before arrival."),
    card("Main site stays current", "Reservations, pricing, hours, and policies remain on the official As You Wish site.", `${official}/pages/locations`)
  ])
}));

files.set("faq.html", layout("faq.html", {
  title: "Questions Before You Paint",
  desc: "Quick answers for As You Wish Pottery guests before they reserve, arrive, paint, and pick up.",
  eyebrow: "Guest answers",
  image: img.examples,
  body: `<section class="faq-list">
    <details open><summary>What does the studio fee include?</summary><p>The official site says the studio fee includes paints, supplies, glazing, and firing. Pottery is selected separately.</p></details>
    <details><summary>How much does a visit cost?</summary><p>The official site lists a studio fee of $10 per painter plus the pottery piece. It also notes many pieces are in the $18-35 range and kids under 2 have free studio fees. Confirm current pricing on the official site before arrival.</p></details>
    <details><summary>Can groups use this app?</summary><p>Yes. The workspace lane is designed for birthday parties, field trips, classes, and team-build groups that need cleaner arrival context.</p></details>
    <details><summary>Does this replace the main site?</summary><p>No. The main As You Wish site remains the source for live reservations, schedules, coupons, policies, and checkout.</p></details>
  </section>`
}));

files.set("contact.html", layout("contact.html", {
  title: "Visit Westgate",
  desc: "As You Wish Pottery Westgate visit information, phone link, official reservations, and Valley Verified profile.",
  eyebrow: "Glendale studio",
  heroTitle: "9410 W Hanna Ln, Suite A109.",
  heroText: "Call, reserve through the official As You Wish site, or start the SignIn Pro workspace for group visits.",
  image: img.locations,
  body: section("Direct actions", "No buried buttons. The guest gets the next useful step.", [
    card("Call the studio", "(623) 772-5403", "tel:6237725403"),
    card("Reserve on official site", "Open As You Wish locations and reservations.", `${official}/pages/locations`),
    card("Open Valley profile", "View the Valley Verified featured client page.", valleyUrl),
    card("Start workspace", "Open the As You Wish SignIn Pro arrival lane.", signinProUrl)
  ])
}));

files.set("local-seo.html", layout("local-seo.html", {
  title: "Westgate Studio Guide",
  desc: "A Glendale visit guide for As You Wish Pottery at Westgate, built around real guest reasons and official studio paths.",
  eyebrow: "Westgate, Glendale",
  heroTitle: "A creative stop for families, parties, classes, and groups near Westgate.",
  heroText: "This page keeps the local story sharp without turning into a directory listing.",
  image: img.hero,
  body: section("Why this page exists", "The public profile gets people oriented. The app turns that interest into arrival action.", [
    card("Families", "Fast open-studio path for all ages and skill levels."),
    card("Parties", "Clear route for hosts and birthday guests."),
    card("Schools", "Field-trip intake before the class walks in."),
    card("Teams", "Team-building group notes routed before arrival.")
  ])
}));

files.set("blog.html", layout("blog.html", {
  title: "Guest Guide",
  desc: "Short As You Wish Pottery guest guides for first-time painters, parties, group visits, and return visits.",
  eyebrow: "Before you arrive",
  heroTitle: "A guide people can actually use from the parking lot.",
  heroText: "Every guide points to a real studio moment, not filler content.",
  image: img.party,
  body: `<section class="card-grid">${guidePosts.map((post) => card(post.title, post.desc, post.file)).join("")}</section>`
}));

files.set("blog/index.html", layout("blog/index.html", {
  title: "Guest Guide",
  desc: "Short As You Wish Pottery guest guides for first-time painters, parties, group visits, and return visits.",
  eyebrow: "Before you arrive",
  heroTitle: "A guide people can actually use from the parking lot.",
  heroText: "Every guide points to a real studio moment, not filler content.",
  image: img.party,
  body: `<section class="card-grid">${guidePosts.map((post) => card(post.title, post.desc, `../${post.file}`)).join("")}</section>`
}));

files.set("workspace-preview.html", layout("workspace-preview.html", {
  title: "Arrival Workspace",
  desc: "The As You Wish Pottery SignIn Pro workspace for class roster check-in, party arrivals, field-trip intake, team-build groups, and studio-fee guest lists.",
  eyebrow: "SignIn Pro by NorthStar",
  heroTitle: "One arrival lane for groups that should not hit the counter cold.",
  heroText: "Use this workspace for names, visit reason, group context, and staff-facing notes.",
  image: img.locations,
  pageClass: "workspace-page",
  body: `<section class="workspace-panel">
    <div>
      <p class="eyebrow">Access code</p>
      <h2>AYWP-7DAY</h2>
      <p>This preview lane is for testing class roster check-in, birthday-party arrivals, field-trip intake, team-build groups, and studio-fee guest lists.</p>
      <div class="actions"><a class="button primary" href="${signinProUrl}">Open SignIn Pro workspace</a><a class="button" href="contact.html">Visit info</a></div>
    </div>
    <form class="arrival-form">
      <label>Guest or group name<input value="Westgate birthday group"></label>
      <label>Reason for visit<select><option>Birthday party arrival</option><option>Open studio visit</option><option>Field trip intake</option><option>Class roster check-in</option><option>Team-build group</option></select></label>
      <label>Arrival note<textarea>We are gathering before table setup and need the group checked in together.</textarea></label>
      <button type="button">Preview staff handoff</button>
    </form>
  </section>`
}));

files.set("workspace-preview/index.html", layout("workspace-preview/index.html", {
  title: "Arrival Workspace",
  desc: "The nested workspace route for As You Wish Pottery, kept clean and asset-safe.",
  eyebrow: "SignIn Pro by NorthStar",
  heroTitle: "Workspace route is live and clean.",
  heroText: "This nested route uses the same root assets without 404s.",
  image: img.locations,
  body: `<section class="section"><div class="section-head"><p class="eyebrow">Same workspace</p><h2>Use the main workspace page or open SignIn Pro directly.</h2></div><div class="actions"><a class="button primary" href="../workspace-preview.html">Workspace page</a><a class="button" href="${signinProUrl}">Open SignIn Pro</a></div></section>`
}));

for (const item of categories) files.set(item.file, categoryPage(item));
for (const post of guidePosts) files.set(post.file, guidePost(post));

files.set("flyer.html", layout("flyer.html", {
  title: "As You Wish Visit Flyer",
  desc: "A printable As You Wish Pottery Westgate visit flyer with reservation, workspace, and pickup handoff.",
  eyebrow: "Print handoff",
  heroTitle: "Paint at Westgate. Start here first.",
  heroText: "Scan, reserve, or open the arrival workspace for group visits.",
  image: img.examples,
  body: section("Flyer actions", "Built for QR handoff at the studio, parties, and group planning.", [
    card("Reserve", "Open official locations and reservations.", `${official}/pages/locations`),
    card("Workspace", "Open SignIn Pro arrival lane.", signinProUrl),
    card("Valley Verified", "Open featured client profile.", valleyUrl)
  ])
}));

files.set("manifest.webmanifest", JSON.stringify({
  name: "As You Wish Pottery Westgate Visit App",
  short_name: "As You Wish",
  start_url: ".",
  display: "standalone",
  background_color: "#fff7ea",
  theme_color: "#ff7edb",
  icons: [
    { src: img.logo, sizes: "192x192", type: "image/png" },
    { src: img.logo, sizes: "512x512", type: "image/png" }
  ]
}, null, 2));

files.set("site-data.json", JSON.stringify({
  business: {
    name: "As You Wish Pottery",
    address: "9410 W Hanna Ln, Suite A109, Glendale, AZ 85305",
    phone: "(623) 772-5403",
    phone_href: "tel:6237725403",
    website: official,
    valley_verified_url: valleyUrl
  },
  source: {
    liveSite: official,
    officialPages: [
      "/pages/how-it-works",
      "/pages/locations",
      "/pages/calendar",
      "/pages/coupon",
      "/pages/workshops-events",
      "/pages/exclusive-class-sessions",
      "/pages/summer-classes",
      "/pages/painting-party-packages",
      "/pages/party-to-go-packages",
      "/pages/fieldtrips",
      "/pages/teambuilds",
      "/pages/gift-cards-family-fun-passes"
    ]
  },
  categories: categories.map(({ file, title, eyebrow, body }) => ({ route: file, name: title, lane: eyebrow, description: body })),
  preview: {
    workspace_id: "as-you-wish-pottery-westgate-preview-001",
    access_code: "AYWP-7DAY",
    scans: 7,
    commands: 25
  },
  media: img
}, null, 2));

files.set("service-worker.js", `const CACHE_NAME = 'as-you-wish-westgate-v2';
const CORE_ASSETS = [
  './',
  'index.html',
  'inventory.html',
  'specials.html',
  'gallery.html',
  'contact.html',
  'workspace-preview.html',
  'styles.css',
  'script.js',
  'manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
`);

files.set("script.js", `(() => {
  const script = document.currentScript || [...document.scripts].find((node) => /script\\.js$/.test(node.src));
  const appBase = new URL('.', script?.src || window.location.href);
  document.documentElement.style.setProperty('--scroll', '0');
  const onScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--scroll', String(scrollY / max));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('.pottery-wheel').forEach((wheel) => {
    wheel.addEventListener('pointermove', (event) => {
      const rect = wheel.getBoundingClientRect();
      wheel.style.setProperty('--mx', String((event.clientX - rect.left) / rect.width));
      wheel.style.setProperty('--my', String((event.clientY - rect.top) / rect.height));
    });
  });

  const existing = window.MetrAIyuxWorkspaceChatConfig || {};
  window.MetrAIyuxWorkspaceChatConfig = {
    workspaceId: 'as-you-wish-pottery-westgate-preview-001',
    workspaceSlug: 'as-you-wish-pottery-westgate',
    clientName: 'As You Wish Pottery',
    appName: 'As You Wish Pottery Westgate Visit App',
    launcherText: 'Ask about this visit',
    operatorName: 'Auren',
    accent: '#ff7edb',
    apiBase: 'https://relay13-core.graylondonskyes.workers.dev/',
    accessReply: 'Your As You Wish preview access code is AYWP-7DAY.',
    accessTriggers: ['password', 'access', 'code', 'unlock', 'AYWP-7DAY', 'workspace'],
    relayMetadata: {
      account_code: 'AYWP-WESTGATE',
      source_app: 'as-you-wish-pottery-westgate',
      source_lane: 'as-you-wish-arrival-workspace'
    },
    ...existing
  };
  if (!document.querySelector('script[data-metraiyux-workspace-chat-script]')) {
    const widget = document.createElement('script');
    widget.src = new URL('assets/workspace-chat-widget.js', appBase).href;
    widget.defer = true;
    widget.dataset.metraiyuxWorkspaceChatScript = 'true';
    widget.onerror = () => widget.remove();
    document.body.appendChild(widget);
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register(new URL('service-worker.js', appBase).href).catch(() => {}));
  }
})();
`);

files.set("styles.css", `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=DM+Sans:wght@400;500;700&display=swap');
:root{
  --cream:#fff7ea;
  --ink:#221514;
  --rose:#c04475;
  --coral:#d36b3f;
  --aqua:#0f7f90;
  --clay:#8f4d32;
  --leaf:#456b4d;
  --line:rgba(34,21,20,.14);
  --shadow:0 28px 80px rgba(67,33,20,.18);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'DM Sans',system-ui,sans-serif;color:var(--ink);background:var(--cream);line-height:1.6;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%}
.wash{position:fixed;inset:0;z-index:-1;background:radial-gradient(circle at 15% 10%,rgba(255,126,219,.26),transparent 30%),radial-gradient(circle at 82% 8%,rgba(100,217,255,.24),transparent 34%),linear-gradient(180deg,#fff9ef,#f9eadb 60%,#fff7ea);pointer-events:none}
.site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:16px clamp(18px,4vw,64px);background:rgba(255,247,234,.86);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:12px;font-weight:900}.brand img{width:48px;height:48px;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.14)}.brand span{display:grid;line-height:1.05}.brand small{font-weight:700;color:#835d53;font-size:.74rem}
.navlinks{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-weight:800;font-size:.92rem}.navlinks a{padding:9px 10px;border-radius:999px}.navlinks a:hover,.reserve{background:#fff;border:1px solid var(--line);box-shadow:0 8px 22px rgba(0,0,0,.06)}
.page-hero{min-height:calc(100vh - 82px);display:grid;grid-template-columns:minmax(0,.92fr) minmax(360px,.86fr);align-items:center;gap:clamp(28px,5vw,86px);padding:clamp(42px,7vw,92px) clamp(18px,6vw,92px) 54px}
.hero-copy{max-width:850px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.78rem;font-weight:900;color:#8a4d38;margin:0 0 12px}.hero-copy h1,.section h2,.intro-studio h2,.image-band h2,.workspace-panel h2{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:clamp(3.2rem,7.3vw,7.8rem);line-height:.92;letter-spacing:0;margin:0 0 22px}.pottery-title{color:#4a2418;background:linear-gradient(105deg,#3a2119 0%,#8f4d32 22%,#c04475 48%,#0f7f90 74%,#456b4d 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 14px 34px rgba(74,36,24,.16)}.hero-copy p{font-size:clamp(1.1rem,1.8vw,1.42rem);max-width:690px;margin:0;color:#5a403a}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.button,button{border:1px solid var(--line);border-radius:999px;padding:13px 18px;background:#fff;color:var(--ink);font-weight:900;box-shadow:0 12px 32px rgba(0,0,0,.08);cursor:pointer}.button.primary,button{background:linear-gradient(135deg,var(--rose),var(--coral));color:#fff;border:0}
.hero-media{position:relative;margin:0;border-radius:28px;overflow:hidden;box-shadow:var(--shadow);background:#fff;transform:rotate(1.6deg)}.hero-media img{width:100%;height:min(72vh,720px);object-fit:cover}.hero-media figcaption{position:absolute;left:18px;bottom:18px;background:rgba(255,255,255,.9);border-radius:999px;padding:10px 14px;font-weight:900}
.section,.intro-studio,.image-band,.workspace-panel,.gallery-grid,.faq-list,.article-body{width:min(1180px,calc(100% - 36px));margin:0 auto 38px;padding:clamp(36px,6vw,82px);background:rgba(255,255,255,.72);border:1px solid var(--line);border-radius:30px;box-shadow:var(--shadow)}
.section-head{max-width:860px}.section h2,.intro-studio h2,.image-band h2,.workspace-panel h2{font-size:clamp(2rem,4vw,4.8rem);line-height:1.02}.card-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:28px}.info-card{display:grid;gap:12px;min-height:210px;padding:22px;border-radius:24px;background:#fff;border:1px solid var(--line);box-shadow:0 16px 40px rgba(0,0,0,.06)}.info-card span{width:42px;height:6px;border-radius:99px;background:linear-gradient(90deg,var(--rose),var(--aqua))}.info-card h3{font-family:'Bricolage Grotesque';font-size:1.42rem;margin:0}.info-card p{margin:0;color:#60453d}
.intro-studio{display:grid;grid-template-columns:330px 1fr;gap:34px;align-items:center}.pottery-wheel{--mx:.5;--my:.5;position:relative;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at calc(var(--mx)*100%) calc(var(--my)*100%),#fff 0 7%,#ffd6e8 8% 18%,#e9a16f 19% 38%,#8ac7c6 39% 52%,#5a3427 53% 54%,#f8dca7 55% 100%);box-shadow:inset 0 0 0 18px rgba(255,255,255,.55),0 30px 70px rgba(103,57,33,.22);animation:spin 14s linear infinite}.pottery-wheel span{position:absolute;inset:23%;border-radius:50%;background:rgba(255,255,255,.75)}.pottery-wheel i{position:absolute;width:38%;height:8%;left:58%;top:18%;border-radius:999px;background:#3d2520;transform:rotate(32deg)}.pottery-wheel b{position:absolute;inset:41%;border-radius:50%;background:#fff8ed}
@keyframes spin{to{transform:rotate(360deg)}}.image-band{display:grid;grid-template-columns:.9fr 1fr;gap:34px;align-items:center}.image-band img{border-radius:24px;box-shadow:0 24px 54px rgba(0,0,0,.12);width:100%;height:430px;object-fit:cover}.gallery-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.gallery-grid a{position:relative;overflow:hidden;border-radius:24px;background:#fff}.gallery-grid img{height:300px;width:100%;object-fit:cover}.gallery-grid span{position:absolute;left:12px;bottom:12px;background:rgba(255,255,255,.9);border-radius:999px;padding:8px 12px;font-weight:900}
.faq-list{display:grid;gap:12px}.faq-list details{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px}.faq-list summary{font-weight:900;cursor:pointer}.article-body{font-size:1.24rem;max-width:900px}.workspace-panel{display:grid;grid-template-columns:.82fr 1fr;gap:30px;align-items:start}.arrival-form{display:grid;gap:14px;background:#fff;border-radius:24px;padding:22px;border:1px solid var(--line)}.arrival-form label{display:grid;gap:7px;font-weight:900}.arrival-form input,.arrival-form select,.arrival-form textarea{width:100%;border:1px solid var(--line);border-radius:14px;padding:13px;font:inherit;background:#fffaf3}.arrival-form textarea{min-height:110px}
.site-footer{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;padding:34px;color:#765449;font-weight:800}.site-footer a{text-decoration:underline}
body:before{content:"";position:fixed;left:0;right:0;top:0;height:4px;z-index:99;background:linear-gradient(90deg,var(--rose),var(--aqua),var(--coral));transform-origin:left;transform:scaleX(var(--scroll))}
@media(max-width:980px){.site-header{position:relative;align-items:flex-start;flex-direction:column}.page-hero,.intro-studio,.image-band,.workspace-panel{grid-template-columns:1fr}.card-grid,.gallery-grid{grid-template-columns:repeat(2,1fr)}.hero-media{transform:none}.page-hero{min-height:auto}.hero-media img{height:420px}}
@media(max-width:620px){.navlinks{gap:6px}.navlinks a{font-size:.82rem;padding:7px 8px}.hero-copy h1{font-size:3.15rem}.section,.intro-studio,.image-band,.workspace-panel,.gallery-grid,.faq-list,.article-body{width:min(100% - 20px,1180px);padding:26px;border-radius:22px}.card-grid,.gallery-grid{grid-template-columns:1fr}.page-hero{padding:30px 12px}.hero-media img{height:320px}.pottery-wheel{max-width:260px;margin:auto}.site-footer{align-items:flex-start;justify-content:flex-start}}
`);

files.set("robots.txt", `User-agent: *
Allow: /
Sitemap: ${prodBase}sitemap.xml
`);

files.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...files.keys()].filter((file) => file.endsWith(".html")).map((file) => `  <url><loc>${prodBase}${file === "index.html" ? "" : file}</loc></url>`).join("\n")}
</urlset>
`);

files.set("APP_PATH_MANIFEST.json", JSON.stringify({
  app: "As You Wish Pottery Westgate Visit App",
  clientId: "as-you-wish-pottery-westgate",
  rebuiltAt: new Date().toISOString(),
  sourceFolder: "client-app-factory/client-apps/as-you-wish-pottery-westgate",
  liveSources: [official, valleyUrl],
  routes: [...files.keys()].filter((file) => file.endsWith(".html")).sort(),
  rule: "Purpose-built pottery studio app using official As You Wish source signals."
}, null, 2));

files.set("README_DEPLOY.txt", `As You Wish Pottery Westgate Visit App

Purpose:
- A real pottery-studio visit surface for As You Wish Pottery at Westgate.
- Built around official As You Wish media, official studio paths, and the Valley Verified / SignIn Pro arrival lane.

Live source signals used:
- Official site: ${official}
- Valley Verified featured page: ${valleyUrl}
- Studio address: 9410 W Hanna Ln, Suite A109, Glendale, AZ 85305
- Phone: (623) 772-5403

Public app routes:
${[...files.keys()].filter((file) => file.endsWith(".html")).sort().map((file) => `- ${file}`).join("\n")}
`);

files.set("CLIENT_IDENTITY_MAP.json", JSON.stringify({
  clientId: "as-you-wish-pottery-westgate",
  displayName: "As You Wish Pottery",
  appName: "As You Wish Pottery Westgate Visit App",
  industry: "Paint-your-own pottery studio and art experience",
  address: "9410 W Hanna Ln, Suite A109, Glendale, AZ 85305",
  phone: "(623) 772-5403",
  officialSite: official,
  valleyVerifiedUrl: valleyUrl,
  visualSources: img,
  routeIntent: {
    "index.html": "First-screen visit start",
    "inventory.html": "How the studio visit works",
    "specials.html": "Savings, gift cards, and return visits",
    "gallery.html": "Official studio imagery",
    "workspace-preview.html": "SignIn Pro arrival workspace"
  }
}, null, 2));

files.set("CLIENT_ENHANCEMENT_REPORT.json", JSON.stringify({
  clientId: "as-you-wish-pottery-westgate",
  enhancedAt: new Date().toISOString(),
  ok: true,
  summary: "Rebuilt into a real As You Wish Pottery Westgate visit app.",
  removedVisiblePatterns: [
    "local business app shell copy",
    "unmatched category labels",
    "unused product-card language",
    "media swap instructions",
    "storefront substitute copy"
  ],
  addedClientSpecificSurfaces: [
    "open studio visit flow",
    "birthday party arrival lane",
    "field trip and team-build intake",
    "gift card and Family Fun Pass handoff",
    "finished-piece pickup logistics",
    "official As You Wish media gallery"
  ],
  liveSources: [official, valleyUrl]
}, null, 2));

files.set("CLIENT_VERIFICATION_REPORT.json", JSON.stringify({
  clientId: "as-you-wish-pottery-westgate",
  checkedAt: new Date().toISOString(),
  ok: false,
  note: "Pending post-deploy Playwright verification. This file is replaced by the final proof run.",
  requiredChecks: [
    "All public app pages return HTTP 200",
    "No unrelated product-package copy remains",
    "No request failures in Playwright",
    "No horizontal overflow on desktop or mobile"
  ]
}, null, 2));

files.set("VALLEY_SYNC_PAYLOAD.json", JSON.stringify({
  clientId: "as-you-wish-pottery-westgate",
  businessId: "as-you-wish-pottery-westgate",
  displayName: "As You Wish Pottery",
  appUrl: prodBase,
  valleyProfilePath: "/valley-verified/business/as-you-wish-pottery-westgate/",
  offer: "Westgate visit app with SignIn Pro arrival workspace",
  media: img,
  routes: [...files.keys()].filter((file) => file.endsWith(".html")).sort()
}, null, 2));

files.set("deploy-target.json", JSON.stringify({
  target: "metraiyux_0s_site/client-app-factory/client-apps/as-you-wish-pottery-westgate",
  publicUrl: prodBase,
  deployHost: "Cloudflare Worker assets",
  proofRequired: "Playwright live browser proof"
}, null, 2));

files.set("assets/brand/client-brand-logo.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 180" role="img" aria-labelledby="title desc">
  <title id="title">As You Wish Pottery logo fallback</title>
  <desc id="desc">Text fallback for the As You Wish Pottery Westgate visit app.</desc>
  <rect width="520" height="180" rx="42" fill="#fff7ea"/>
  <circle cx="88" cy="90" r="48" fill="#ff7edb"/>
  <circle cx="88" cy="90" r="28" fill="#64d9ff"/>
  <text x="156" y="78" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#221514">As You Wish</text>
  <text x="156" y="122" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#8a4d38">Pottery Westgate</text>
</svg>
`);

files.set("assets/brand/client-brand-mark.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-labelledby="title desc">
  <title id="title">As You Wish Pottery mark fallback</title>
  <desc id="desc">Circular pottery-wheel fallback mark for As You Wish Pottery.</desc>
  <rect width="180" height="180" rx="42" fill="#fff7ea"/>
  <circle cx="90" cy="90" r="62" fill="#ff7edb"/>
  <circle cx="90" cy="90" r="42" fill="#64d9ff"/>
  <circle cx="90" cy="90" r="18" fill="#fff7ea"/>
</svg>
`);

files.set("assets/qr/as-you-wish-pottery-westgate-app-qr.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" role="img" aria-labelledby="title desc">
  <title id="title">As You Wish Pottery app QR fallback</title>
  <desc id="desc">Decorative QR-style mark for the As You Wish Pottery Westgate visit app.</desc>
  <rect width="220" height="220" rx="28" fill="#fff7ea"/>
  <g fill="#221514">
    <rect x="24" y="24" width="52" height="52" rx="8"/><rect x="144" y="24" width="52" height="52" rx="8"/><rect x="24" y="144" width="52" height="52" rx="8"/>
    <rect x="94" y="34" width="18" height="18"/><rect x="116" y="58" width="18" height="18"/><rect x="92" y="96" width="36" height="18"/><rect x="144" y="96" width="18" height="42"/>
    <rect x="92" y="144" width="18" height="18"/><rect x="120" y="144" width="54" height="18"/><rect x="184" y="144" width="12" height="52"/>
  </g>
  <circle cx="110" cy="110" r="20" fill="#ff7edb"/>
</svg>
`);

await mkdir(appDir, { recursive: true });
for (const [file, content] of files) {
  const target = path.join(appDir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

console.log(JSON.stringify({
  ok: true,
  appDir,
  filesWritten: files.size,
  htmlFiles: [...files.keys()].filter((file) => file.endsWith(".html")).length
}, null, 2));
