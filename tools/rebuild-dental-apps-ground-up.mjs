#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.env.METRAIYUX_REPO_ROOT || process.cwd();
const PROD = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const SKYEKNOWLOGY_URL = "https://gray-skyes-founder-portfolio.pages.dev/skyeknowlogy";
const DEITY_LOGO_SOURCE = path.join(ROOT, "skyesol_spectacle_reference", "assets", "skyes-over-london-deity-logo.png");
const VENDOR_SCRIPTS = [
  ["vendor/gsap.min.js", path.join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js")],
  ["vendor/ScrollTrigger.min.js", path.join(ROOT, "node_modules", "gsap", "dist", "ScrollTrigger.min.js")],
  ["vendor/lenis.min.js", path.join(ROOT, "node_modules", "lenis", "dist", "lenis.min.js")]
];

const clients = [
  {
    slug: "arizona-biltmore-dentistry",
    valleySlug: "arizona-biltmore-dentistry-phoenix-85016-d406e26",
    name: "Arizona Biltmore Dentistry",
    short: "AZ Biltmore",
    logo3d: true,
    lane: "family, cosmetic, implant, emergency dental care",
    official: "https://www.arizonabiltmoredentistry.com/",
    source2: "https://www.arizonabiltmoredentistry.com/locations/biltmore/",
    booking: "https://app.nexhealth.com/appt/arizonabiltmoredentistry",
    phone: "(602) 957-8200",
    schedulePhone: "(602) 562-7096",
    phoneHref: "tel:16029578200",
    address: "2777 E Camelback Rd #101, Phoenix, AZ 85016",
    hours: ["Monday-Thursday 7 AM-5 PM", "Friday 7 AM-4 PM", "Saturday 7 AM-2 PM"],
    people: ["Dr. Aaron Jeziorski", "Dr. Michael Hood"],
    services: ["Family Dental Care", "Cosmetic Dentistry", "Dental Implants", "Root Canal Therapy", "Emergency Dental Services", "Orthodontics / Invisalign", "Dentures", "Crowns & Bridges"],
    offer: "$99 emergency exam and $1000 off Invisalign source flags",
    finance: ["Most insurances accepted", "3rd-party financing available", "Dental Loyalty Program", "Out-of-pocket costs reviewed before treatment"],
    introMs: 3600,
    readyMs: 1200,
    cardMedia: {
      appointment: "office",
      route: "office",
      intake: "doctor",
      payment: "doctor",
      proof: "hero",
      scan: "office"
    },
    media: [
      ["logo.png", "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/logo-header.png", "Arizona Biltmore Dentistry official logo"],
      ["hero.png", "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2021/07/az-biltmore.png", "Arizona Biltmore Dentistry official practice image"],
      ["office.jpg", "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/officeslide-2.jpg", "Arizona Biltmore Dentistry office"],
      ["doctor.jpg", "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/dr-jeziorski.jpg", "Dr. Jeziorski official headshot"]
    ]
  },
  {
    slug: "dental-depot-orthodontics-phoenix",
    valleySlug: "dental-depot-orthodontics-phoenix-85053-c0fa26f",
    name: "Dental Depot Orthodontics - Phoenix",
    short: "Dental Depot Ortho",
    lane: "orthodontics, braces, Invisalign, pediatric and adult alignment",
    official: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    source2: "https://dentaldepotarizona.com/our-locations/",
    booking: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    phone: "(602) 845-8653",
    schedulePhone: "(602) 845-8653",
    phoneHref: "tel:16028458653",
    address: "3730 W. Greenway Rd, Phoenix, AZ 85053",
    hours: ["Monday-Thursday 8:00am-4:00pm"],
    people: ["Dr. James Zhong"],
    services: ["Invisalign", "Orthodontics", "Orthodontics for Kids", "Orthodontics for Adults", "Braces", "Orthodontics FAQs"],
    offer: "Payments as low as $127 per month source flag",
    finance: ["Payment plan source flag", "Orthodontic consult routing", "Child/adult orthodontic treatment lanes"],
    introMs: 1600,
    readyMs: 500,
    cardMedia: {
      appointment: "office",
      route: "service",
      intake: "doctor",
      payment: "invisalign",
      proof: "hero",
      scan: "service"
    },
    media: [
      ["logo.png", "https://dentaldepotarizona.com/wp-content/uploads/2022/06/Dental-Depot-Round-Logo.png", "Dental Depot official logo"],
      ["hero.jpg", "https://dentaldepotarizona.com/wp-content/uploads/Photo-Kids-on-Train.jpg", "Kids in yellow Dental Depot shirts in front of dental office"],
      ["office.jpg", "https://dentaldepotarizona.com/wp-content/uploads/Hygientists_dental_depot_2299-1024x683.jpg", "Dental Depot clinical team"],
      ["doctor.jpg", "https://dentaldepotarizona.com/wp-content/uploads/Dr-James-Zhong-Edit-Crop-Sm.jpg", "Dr. James Zhong official headshot"],
      ["service.png", "https://dentaldepotarizona.com/wp-content/uploads/orthodontics.png", "Orthodontic care photo"],
      ["invisalign.png", "https://dentaldepotarizona.com/wp-content/uploads/Photo_Blonde_with_invisilign.png", "Invisalign official service image"]
    ]
  },
  {
    slug: "general-dentistry-4-kids-phoenix",
    valleySlug: "general-dentistry-4-kids-phoenix-85032-237e895",
    name: "General Dentistry 4 Kids - Phoenix",
    short: "GD4K Phoenix",
    logo3d: true,
    lane: "kid-friendly pediatric dental care",
    official: "https://gd4kphx.com/phoenix-office",
    source2: "https://gd4kphx.com/",
    booking: "https://gd4kphx.com/phoenix-office",
    phone: "(602) 996-6065",
    schedulePhone: "(602) 996-6065",
    phoneHref: "tel:16029966065",
    email: "contact@gd4k.com",
    address: "3202 E Greenway Rd #1287, Phoenix, AZ 85032",
    hours: ["Monday-Thursday 8am-5pm", "Friday 8am-2pm"],
    people: ["Kid-friendly dental team"],
    services: ["Dental Exams", "Dental Fillings", "Tooth Extraction", "Preventive Care", "Child Comfort Visit", "Parent Prep"],
    offer: "Financial options source flag",
    finance: ["Financial options noted on official Phoenix page", "Child-focused comfort routing", "Family income access language from official site"],
    introMs: 3600,
    readyMs: 1200,
    cardMedia: {
      appointment: "office",
      route: "club",
      intake: "hero",
      payment: "club",
      proof: "office",
      scan: "hero"
    },
    media: [
      ["logo.webp", "https://gd4kphx.com/images/logo.webp", "General Dentistry 4 Kids official logo"],
      ["hero.jpg", "https://gd4kphx.com/images/index/greenway-hero-2.jpg", "Children smiling in a dentist office"],
      ["office.webp", "https://gd4kphx.com/images/locations/greenway.webp", "General Dentistry 4 Kids Phoenix office"],
      ["club.webp", "https://gd4kphx.com/images/banners/kids-smile-club-banner.webp", "Kids Smile Club official banner"]
    ]
  }
];

const baseRoutes = [
  ["index.html", "Command App"],
  ["appointments.html", "Appointment Router"],
  ["quote.html", "Care Route Builder"],
  ["services.html", "Services"],
  ["emergency.html", "Urgent Route"],
  ["intake.html", "Intake Queue"],
  ["insurance.html", "Insurance & Payment"],
  ["financial.html", "Financial Desk"],
  ["patient-center.html", "Patient Center"],
  ["team.html", "Team"],
  ["office.html", "Office"],
  ["workspace.html", "NorthStar Workspace"],
  ["scan.html", "Scan"],
  ["preview.html", "Preview"],
  ["proof.html", "Proof Ledger"],
  ["faq.html", "FAQ"],
  ["contact.html", "Contact"],
  ["flyer.html", "Flyer"],
  ["offline.html", "Offline"]
];

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(file, body) { ensure(path.dirname(file)); fs.writeFileSync(file, body); }
function rm(dir) { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); }
function esc(v) { return String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function appUrl(c) { return `${PROD}/client-app-factory/client-apps/${c.slug}/`; }
function valleyUrl(c) { return `${PROD}/valley-verified/business/${c.valleySlug}/`; }

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const ab = await res.arrayBuffer();
  write(dest, Buffer.from(ab));
}

function mediaTag(c, key = "hero", cls = "") {
  if (key === "logo" && c.logo3d) {
    return `<img class="${cls}" src="assets/logo-3d.svg" alt="${esc(c.name)} custom 3D app-preview logo">`;
  }
  const item = c.media.find(([file]) => file.startsWith(key)) || c.media[1] || c.media[0];
  return `<img class="${cls}" src="assets/${esc(item[0])}" alt="${esc(item[2])}">`;
}

function poweredByMarkup() {
  return `<a class="powered-by" href="${SKYEKNOWLOGY_URL}" target="_blank" rel="noopener" aria-label="Powered By: SkyeKnowlogy"><img src="assets/skyes-over-london-deity-logo.png" alt="Skyes Over London Diety logo"><span>Powered By:<b>SkyeKnowlogy</b></span></a>`;
}

function heroVideo(c, cls = "hero-photo") {
  return `<video class="${cls}" data-hero-video autoplay muted loop playsinline preload="metadata" poster="assets/${esc((c.media.find(([file]) => file.startsWith("hero")) || c.media[1] || c.media[0])[0])}"><source src="assets/hero-video.mp4" type="video/mp4"></video>`;
}

function copyDeityLogo(dir) {
  const dest = path.join(dir, "assets", "skyes-over-london-deity-logo.png");
  fs.copyFileSync(DEITY_LOGO_SOURCE, dest);
}

function copyVendorScripts(dir) {
  for (const [dest, src] of VENDOR_SCRIPTS) {
    if (!fs.existsSync(src)) throw new Error(`Missing vendor runtime ${src}`);
    const out = path.join(dir, "assets", dest);
    ensure(path.dirname(out));
    fs.copyFileSync(src, out);
  }
}

function logo3dSvg(c) {
  const id = c.slug.replace(/[^a-z0-9]/gi, "");
  const short = esc(c.short || c.name);
  const name = esc(c.name);
  const initials = esc((c.short || c.name).split(/\s+/).map(part => part[0]).join("").slice(0, 4).toUpperCase());
  const pediatric = c.slug.includes("general-dentistry");
  const bg1 = pediatric ? "#33d7c9" : "#d9f3ff";
  const bg2 = pediatric ? "#ffd65a" : "#54d6c7";
  const accent = pediatric ? "#ff6aa2" : "#f4c95d";
  const ink = "#07100f";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520" role="img" aria-labelledby="${id}Title ${id}Desc">
  <title id="${id}Title">${name} custom 3D app-preview logo</title>
  <desc id="${id}Desc">Custom dimensional app-preview logo generated for the Valley Verified client app. Not an official business mark.</desc>
  <defs>
    <linearGradient id="${id}Face" x1="90" y1="40" x2="810" y2="480" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset=".48" stop-color="#ffffff"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="${id}Edge" x1="120" y1="80" x2="780" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset=".55" stop-color="${bg2}"/>
      <stop offset="1" stop-color="#10201d"/>
    </linearGradient>
    <filter id="${id}Shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="26" stdDeviation="24" flood-color="#000000" flood-opacity=".38"/>
      <feDropShadow dx="18" dy="18" stdDeviation="3" flood-color="#000000" flood-opacity=".18"/>
    </filter>
  </defs>
  <rect width="900" height="520" rx="82" fill="#06100e"/>
  <path d="M132 154 220 70h468l82 84v242l-92 72H210l-78-72Z" fill="${id.includes("general") ? "#15332d" : "#102225"}"/>
  <path d="M150 142 228 88h452l70 72v220l-76 56H222l-72-58Z" fill="url(#${id}Edge)" filter="url(#${id}Shadow)"/>
  <path d="M174 136h502l48 50v166l-56 46H232l-58-48Z" fill="url(#${id}Face)"/>
  <path d="M286 208c0-44 34-80 79-80 35 0 63 19 73 48 10-29 38-48 73-48 45 0 79 36 79 80 0 55-48 87-152 158C334 295 286 263 286 208Z" fill="#ffffff" stroke="${ink}" stroke-width="13" stroke-linejoin="round"/>
  <path d="M360 242h156M438 164v158" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
  <text x="450" y="424" text-anchor="middle" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900" letter-spacing="0">${short}</text>
  <text x="450" y="466" text-anchor="middle" fill="#12302d" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="0">${initials} COMMAND LOGO</text>
</svg>
`;
}

function writeLogo3d(c, dir) {
  if (!c.logo3d) return;
  write(path.join(dir, "assets", "logo-3d.svg"), logo3dSvg(c));
}

function makeTransparentLogo(c, dir) {
  if (c.slug !== "arizona-biltmore-dentistry") return;
  const logo = path.join(dir, "assets", "logo.png");
  const result = spawnSync("convert", [logo, "-alpha", "set", "-fuzz", "14%", "-transparent", "white", logo], { stdio: "pipe" });
  if (result.status !== 0) console.warn(`Biltmore transparent logo conversion skipped: ${result.stderr?.toString() || result.error?.message || result.status}`);
}

function readHeroVideoFallback(c) {
  const candidates = [
    path.join(ROOT, "client-app-factory", "client-apps", c.slug, "assets", "hero-video.mp4"),
    path.join(ROOT, "metraiyux_0s_site", "client-app-factory", "client-apps", c.slug, "assets", "hero-video.mp4"),
    path.join(ROOT, "Skye-Clients", `${c.slug}-app`, "assets", "hero-video.mp4")
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return fs.readFileSync(file);
  }
  const committed = spawnSync("git", ["show", `HEAD:client-app-factory/client-apps/${c.slug}/assets/hero-video.mp4`], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  if (committed.status === 0 && committed.stdout?.length) return committed.stdout;
  return null;
}

function generateHeroVideo(c, dir, fallbackVideo) {
  const heroFile = (c.media.find(([file]) => file.startsWith("hero")) || c.media[1] || c.media[0])[0];
  const input = path.join(dir, "assets", heroFile);
  const output = path.join(dir, "assets", "hero-video.mp4");
  const result = spawnSync("ffmpeg", [
    "-y",
    "-loop", "1",
    "-i", input,
    "-t", "8",
    "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0015,1.08)':d=200:s=1280x720:fps=25,format=yuv420p",
    "-movflags", "+faststart",
    output
  ], { stdio: "pipe" });
  if (result.status !== 0) {
    if (!fallbackVideo?.length) throw new Error(`Hero video generation failed for ${c.slug}: ${result.stderr?.toString() || result.error?.message || result.status}`);
    fs.writeFileSync(output, fallbackVideo);
    console.warn(`Hero video generation skipped for ${c.slug}; reused existing committed hero-video.mp4 because ffmpeg is unavailable.`);
  }
}

function nav(c, active) {
  const items = [["App", "index.html"], ["Book", "appointments.html"], ["Route", "quote.html"], ["Services", "services.html"], ["Urgent", "emergency.html"], ["Intake", "intake.html"], ["Payment", "insurance.html"], ["Workspace", "workspace.html"], ["Proof", "proof.html"]];
  return `<button class="hamb" type="button" data-menu-toggle>Menu</button><nav class="links">${items.map(([n, h]) => `<a class="${h === active ? "active" : ""}" href="${h}">${n}</a>`).join("")}<a class="quote" href="${c.booking}" target="_blank" rel="noopener">Official Booking</a></nav>`;
}

function shell(c, route, title, main) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(c.name)} | ${esc(title)}</title><meta name="description" content="${esc(c.name)} real client app for routing, intake, proof, workspace, and verified patient handoffs."><meta name="theme-color" content="#07100f"><link rel="icon" href="data:,"><link rel="manifest" href="manifest.webmanifest"><link rel="stylesheet" href="assets/styles.css"><script src="assets/vendor/gsap.min.js"></script><script src="assets/vendor/ScrollTrigger.min.js"></script><script src="assets/vendor/lenis.min.js"></script><script type="module" src="assets/app.js"></script><script>setTimeout(()=>{document.body?.classList.remove('intro-active');document.body?.classList.add('intro-complete');document.querySelectorAll('video[data-hero-video]').forEach(v=>v.play?.().catch(()=>{}))},${Number(c.introMs || 3600) + 2900})</script></head><body class="intro-active" data-client="${esc(c.slug)}" data-route="${esc(route)}"><section class="app-intro" data-app-intro data-intro-ms="${Number(c.introMs || 3600)}" data-ready-ms="${Number(c.readyMs || 1200)}"><div class="intro-media">${mediaTag(c, "logo", "intro-logo")}${heroVideo(c, "intro-photo")}</div><div class="intro-copy"><span>${esc(c.address)}</span><h2>${esc(c.name)}</h2><p>${esc(c.lane)}. Full client app loading: booking, intake, payment, proof, workspace.</p><div class="intro-meter"><i></i></div><button type="button" class="btn primary" data-enter-intro disabled>Loading App</button></div></section><canvas class="living-field" aria-hidden="true"></canvas><div class="progressbar" aria-hidden="true"></div><div class="header-alert">Official media · required hero video · real workflow app · Valley post generated from app · no fake generated media</div><header class="top"><a class="brand" href="index.html">${mediaTag(c, "logo", "logo")}<span><strong>${esc(c.name)}</strong><small>${esc(c.lane)}</small></span></a>${poweredByMarkup()}${nav(c, route)}</header><main>${main}</main><aside class="ops-console"><span>App rail</span><a href="appointments.html">Book</a><a href="quote.html">Route</a><a href="intake.html">Intake</a><a href="workspace.html">Workspace</a></aside><a class="floating-call" href="${c.phoneHref}">Call ${esc(c.phone)}</a><footer class="footer"><div><strong>${esc(c.name)}</strong><span>${esc(c.address)}</span><span>${esc(c.phone)}${c.email ? ` · ${esc(c.email)}` : ""}</span></div><div class="footer-links"><a href="${c.official}" target="_blank" rel="noopener">Official source</a><a href="${valleyUrl(c)}">Valley post</a><a href="${appUrl(c)}proof.html">Proof</a></div></footer></body></html>`;
}

function hero(c) {
  const modules = [["Booking", "appointments.html"], ["Intake", "intake.html"], ["Payment", "insurance.html"], ["Proof", "proof.html"], ["Workspace", "workspace.html"]];
  return `<section class="hero"><div class="hero-media">${heroVideo(c)}${mediaTag(c, "doctor", "hero-person")}</div><div class="wrap hero-inner"><div><div class="eyebrow">Client operations app</div><h1>${esc(c.name)} <span>routing command center</span></h1><p>${esc(c.lane)} routed through a real app surface: appointment desk, care route builder, intake queue, payment prep, proof ledger, scan flyer, and NorthStar handoff.</p><div class="hero-actions"><a class="btn primary" href="appointments.html">Start Appointment</a><a class="btn green" href="quote.html">Build Care Route</a><a class="btn dark" href="workspace.html">Open Workspace</a><button class="btn dark" data-share-site>Share App</button></div><div class="hero-console" aria-label="Live app modules"><b>Live app modules</b>${modules.map(([x, href]) => `<a href="${href}">${x}</a>`).join("")}</div></div></div></section>`;
}

function card(c, title, href, text, imgKey = "office") {
  return `<a class="service-card" href="${href}">${mediaTag(c, imgKey, "")}<span class="badge">Module</span><h3>${esc(title)}</h3><p>${esc(text)}</p></a>`;
}

function home(c) {
  return `${hero(c)}<section class="quick"><div class="wrap"><form action="quote.html"><select name="need">${c.services.map(s => `<option>${esc(s)}</option>`).join("")}</select><input name="timeline" placeholder="Today, this week, routine"><input name="zip" placeholder="ZIP"><button class="btn primary">Route</button></form></div></section><section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Pallets-grade structure</div><h2>Not a landing page. A working client app.</h2></div><p>Every main tile opens a workflow screen, captures browser-local rows, or hands off to official booking/NorthStar/Valley proof.</p></div><div class="grid cols3">${card(c, "Appointment router", "appointments.html", "Care type, timing, patient context, official booking and call handoff.", c.cardMedia?.appointment || "office")}${card(c, "Care route builder", "quote.html", "Builds a front-office handoff from service, timeline, payment, and symptoms.", c.cardMedia?.route || "office")}${card(c, "Intake queue", "intake.html", "Saves patient-route rows locally with callback, need, insurance, and notes.", c.cardMedia?.intake || "doctor")}${card(c, "Payment prep", "insurance.html", c.finance.join("; "), c.cardMedia?.payment || "doctor")}${card(c, "Proof ledger", "proof.html", "Owner correction rows, source facts, no-fake-media policy, Valley sync.", c.cardMedia?.proof || "hero")}${card(c, "Scan/flyer route", "scan.html", "QR, share, printable handoff, and public app entry.", c.cardMedia?.scan || "office")}</div></div></section>${sourceSection(c)}`;
}

function pageHero(c, title, text, actions = "") {
  return `<section class="page-hero"><div class="page-hero-media">${heroVideo(c, "page-hero-video")}</div><div class="wrap"><div class="eyebrow">${esc(c.short)} app</div><h1>${esc(title)}</h1><p>${esc(text)}</p><div class="hero-actions">${actions}</div></div></section>`;
}

function forms(c, kind = "route") {
  return `<section class="section"><div class="wrap app-grid"><form class="panel" data-${kind}-form><div class="screen-head"><strong>${kind === "proof" ? "Proof / correction row" : "Patient route row"}</strong><span>browser local</span></div><div class="form-grid"><label>Name<input name="name" placeholder="Name"></label><label>Phone<input name="phone" placeholder="Best callback"></label><label>Need<select name="kind">${c.services.map(s => `<option>${esc(s)}</option>`).join("")}</select></label><label>Urgency<select name="urgency"><option>Routine</option><option>This week</option><option>Today</option><option>Urgent</option></select></label><label>Payment<select name="payment"><option>Unknown</option>${c.finance.map(s => `<option>${esc(s)}</option>`).join("")}</select></label><label>Access<select name="access"><option>No access note</option><option>Anxious patient</option><option>Child / parent handoff</option><option>Mobility support</option></select></label><label class="full">Notes<textarea name="note"></textarea></label></div><button class="btn primary full" type="submit">Save row</button></form><div class="panel"><div class="screen-head"><strong>${kind === "proof" ? "Proof ledger" : "Route queue"}</strong><span data-count>0 rows</span></div><div class="queue" data-queue></div></div></div></section>`;
}

function appointments(c) { return pageHero(c, "Appointment router", "Route the patient before they hit the office phone.", `<a class="btn primary" href="${c.booking}" target="_blank" rel="noopener">Official booking</a><a class="btn dark" href="${c.phoneHref}">Call office</a>`) + forms(c); }
function quote(c) { return pageHero(c, "Care route builder", "Creates a usable front-office handoff from the selected care lane.", `<a class="btn primary" href="intake.html">Open intake queue</a>`) + `<section class="section"><div class="wrap app-grid"><div class="panel"><label>Service<select data-build-need>${c.services.map(s => `<option>${esc(s)}</option>`).join("")}</select></label><label>Timeline<select data-build-time><option>Today</option><option>This week</option><option>Routine</option><option>Consult only</option></select></label><label>Payment<select data-build-pay>${c.finance.map(s => `<option>${esc(s)}</option>`).join("")}</select></label><button class="btn primary" data-build-route type="button">Build handoff</button></div><div class="panel route-output" data-route-output><strong>Handoff output</strong><p>Pick options to build the route.</p></div></div></section>`; }
function services(c) { return pageHero(c, "Services", "Real service lanes from official source material.", `<a class="btn primary" href="quote.html">Build route</a>`) + `<section class="section"><div class="wrap grid cols3">${c.services.map((s, i) => card(c, s, "quote.html?need=" + encodeURIComponent(s), routeText(c, s), ["office", "hero", "doctor", "service", "invisalign", "club"][i % 6])).join("")}</div></section>`; }
function routeText(c, s) { return `${s} routed with timing, callback, payment context, official booking, and office handoff for ${c.short}.`; }
function emergency(c) { return pageHero(c, "Urgent route", "This app does not diagnose. It captures context and sends the patient to official call/booking lanes.", `<a class="btn primary" href="${c.phoneHref}">Call ${esc(c.phone)}</a>`) + `<section class="section"><div class="wrap app-grid"><div class="panel danger"><div class="triage">${["Severe pain", "Swelling", "Broken tooth/braces issue", "Bleeding", "Child discomfort", "After-hours concern"].map(x => `<button data-triage="${esc(x)}">${esc(x)}</button>`).join("")}</div></div><div class="panel route-output" data-triage-output>Choose a symptom to create a route row.</div></div></section>`; }
function insurance(c) { return pageHero(c, "Insurance and payment prep", c.offer, `<a class="btn primary" href="quote.html">Route with payment context</a>`) + `<section class="section"><div class="wrap app-grid"><div class="panel"><ul class="checklist">${c.finance.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div><div class="panel">${mediaTag(c, "logo", "panel-logo")}<p>Payment information is a prep lane, not a final quote. The office confirms plan and cost details.</p></div></div></section>`; }
function patientCenter(c) { return pageHero(c, "Patient center", "One screen for patient tasks.", `<a class="btn primary" href="${c.booking}" target="_blank" rel="noopener">Book</a>`) + `<section class="section"><div class="wrap grid cols3">${card(c, "Start intake", "intake.html", "Save a local patient context row.", c.cardMedia?.intake || "hero")}${card(c, "Payment prep", "insurance.html", "Insurance, finance, and program handoff.", c.cardMedia?.payment || "doctor")}${card(c, "Office details", "office.html", "Hours, address, phone, and source links.", "office")}</div></section>`; }
function team(c) { return pageHero(c, "Team", "Source-safe team screen with real media only.", `<a class="btn primary" href="${c.official}" target="_blank" rel="noopener">Official source</a>`) + `<section class="section"><div class="wrap grid cols2">${c.people.map((p, i) => `<div class="panel team-card">${mediaTag(c, i === 0 ? "doctor" : "logo", "team-img")}<span class="badge">Team</span><h3>${esc(p)}</h3><p>Listed or represented in official public source material. No invented staff photos or biographies.</p></div>`).join("")}</div></section>`; }
function office(c) { return pageHero(c, "Office", "Real location and hours.", `<a class="btn primary" href="${c.phoneHref}">Call</a>`) + `<section class="section"><div class="wrap app-grid"><div class="panel">${mediaTag(c, "office", "wide-img")}</div><div class="panel"><dl class="facts"><dt>Address</dt><dd>${esc(c.address)}</dd><dt>Phone</dt><dd>${esc(c.phone)}</dd><dt>Hours</dt><dd>${c.hours.map(esc).join("<br>")}</dd></dl></div></div></section>`; }
function workspace(c) { return pageHero(c, "NorthStar workspace", "Owner/operator handoff for intake, proof, content and Valley sync.", `<a class="btn primary" href="${PROD}/northstar/index.html?workspace=${c.slug}&client=${c.slug}">Open NorthStar</a>`) + `<section class="section"><div class="wrap grid cols3">${["intake", "proof", "content", "billing", "valley", "media"].map(l => card(c, `Workspace ${l}`, `${PROD}/northstar/index.html?workspace=${c.slug}&lane=${l}`, `NorthStar ${l} lane for ${c.short}.`, "logo")).join("")}</div></section>`; }
function scan(c) { return pageHero(c, "Scan", "QR and share entry for the real app.", `<button class="btn primary" data-share-site>Share app</button><a class="btn dark" href="flyer.html">Flyer</a>`) + `<section class="section"><div class="wrap app-grid"><div class="qr-card"><img class="qr" src="assets/qr.svg" alt="QR code"><p>${appUrl(c)}</p></div><div class="panel">${mediaTag(c, "hero", "wide-img")}<p>QR routes to the app home, then to booking, intake, payment, proof, and workspace lanes.</p></div></div></section>`; }
function preview(c) { return pageHero(c, "Preview", "Full app route map for owner review.", `<a class="btn primary" href="proof.html">Approve or correct</a>`) + `<section class="section"><div class="wrap grid cols3">${baseRoutes.map(([r, t], i) => card(c, t, r, `${r} · ${appUrl(c)}${r}`, ["logo", "hero", "office", "doctor"][i % 4])).join("")}</div></section>`; }
function proof(c) { return pageHero(c, "Proof ledger", "Owner corrections, source facts, and Valley sync.", `<a class="btn primary" href="${valleyUrl(c)}">Open Valley</a>`) + forms(c, "proof") + sourceSection(c); }
function faq(c) { return pageHero(c, "FAQ", "Source-safe app answers.", `<a class="btn primary" href="appointments.html">Book</a>`) + `<section class="section"><div class="wrap faq">${[["Is this a real app?", "Yes. It has routed screens, forms, local queues, command rail, scan/flyer, workspace handoff, and proof ledger."], ["Are the photos real?", "Yes. Media files are downloaded from official client source pages."], ["Is this medical advice?", "No. It routes users to official office scheduling and call paths."]].map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div></section>`; }
function flyer(c) { return pageHero(c, "Flyer", "Printable app handoff.", `<button class="btn primary" onclick="print()">Print</button>`) + `<section class="section"><div class="wrap flyer">${mediaTag(c, "logo", "flyer-logo")}<img class="qr" src="assets/qr.svg" alt="QR code"><h2>${esc(c.name)}</h2><p>Scan for booking, care routing, intake, payment prep, proof, and workspace.</p><strong>${esc(c.phone)}</strong></div></section>`; }
function sourceSection(c) { return `<section class="section source"><div class="wrap app-grid"><div><div class="eyebrow">Source discipline</div><h2>Real business details, official media, and clearly marked preview branding.</h2><p>Official photos and facts stay source-labeled. Custom 3D command logos are app-preview branding, not official business marks. No generated office photos, generated patient scenes, or invented staff.</p></div><div class="panel"><ul class="checklist"><li>${esc(c.official)}</li><li>${esc(c.source2)}</li><li>${esc(c.address)}</li><li>${esc(c.phone)}</li></ul></div></div></section>`; }
function contact(c) { return office(c); }
function offline(c) { return pageHero(c, "Offline", "Use official call path.", `<a class="btn primary" href="${c.phoneHref}">Call ${esc(c.phone)}</a>`); }

function render(c, route) {
  const map = { "index.html": home, "appointments.html": appointments, "quote.html": quote, "services.html": services, "emergency.html": emergency, "intake.html": appointments, "insurance.html": insurance, "financial.html": insurance, "patient-center.html": patientCenter, "team.html": team, "office.html": office, "workspace.html": workspace, "scan.html": scan, "preview.html": preview, "proof.html": proof, "faq.html": faq, "contact.html": contact, "flyer.html": flyer, "offline.html": offline };
  return map[route](c);
}

function css() {
  return `:root{--bg:#07100f;--ink:#fffdf5;--muted:#c8d4cf;--line:rgba(255,255,255,.16);--gold:#f4c95d;--green:#54d6c7;--blue:#9edcff;--red:#ff8a7a}*{box-sizing:border-box;min-width:0}html{scroll-behavior:smooth;scrollbar-color:var(--green) #06100e;scrollbar-width:auto;overflow-x:hidden}::-webkit-scrollbar{width:14px;height:14px}::-webkit-scrollbar-track{background:#06100e}::-webkit-scrollbar-thumb{border:3px solid #06100e;border-radius:999px;background:linear-gradient(var(--green),var(--gold));box-shadow:0 0 18px var(--green)}body{margin:0;background:#07100f;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:0;overflow-x:hidden}a,li,p,dd,dt,span,strong,h1,h2,h3,code{overflow-wrap:anywhere;word-break:break-word}a{color:var(--blue)}.wrap{width:min(1200px,calc(100% - 40px));margin:auto}.living-field{position:fixed;inset:0;z-index:-3;pointer-events:none}.app-intro{position:fixed;inset:0;z-index:100;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:30px;align-items:center;padding:48px;background:#020403;transition:opacity .6s,visibility .6s}.intro-media{position:relative;min-height:70vh}.intro-photo{width:100%;height:70vh;object-fit:cover;border-radius:8px;filter:saturate(1.05) contrast(1.05)}.intro-logo{position:absolute;left:24px;top:24px;max-width:190px;max-height:120px;background:rgba(255,255,255,.9);border-radius:8px;padding:12px}.intro-copy h2{font-size:62px;line-height:.96;margin:8px 0 14px}.intro-copy p{font-size:21px;line-height:1.5;color:#fff4dc}.intro-meter{height:7px;background:rgba(255,255,255,.14);border-radius:999px;overflow:hidden;margin:24px 0}.intro-meter i{display:block;height:100%;width:20%;background:linear-gradient(90deg,var(--green),var(--gold));animation:load 2.2s forwards}.intro-active>:not(.app-intro):not(script):not(style){visibility:hidden!important}.intro-complete .app-intro{display:none!important;opacity:0;visibility:hidden;pointer-events:none}.progressbar{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--green),var(--gold));z-index:60}.header-alert{text-align:center;padding:8px 18px;background:rgba(244,201,93,.14);border-bottom:1px solid var(--line);font-size:13px;font-weight:850}.top{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 34px;background:rgba(5,10,9,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:12px;color:var(--ink);text-decoration:none;min-width:260px}.logo{width:58px;height:58px;object-fit:contain;background:rgba(255,255,255,.94);border-radius:8px;padding:6px;flex:0 0 auto}.brand strong,.brand small{display:block}.brand small{font-size:12px;color:var(--muted);margin-top:3px}.powered-by{display:grid;justify-items:center;gap:3px;min-width:96px;color:#f7fff9;text-decoration:none;text-align:center;filter:drop-shadow(0 0 12px rgba(84,214,199,.66)) drop-shadow(0 0 26px rgba(244,201,93,.32))}.powered-by img{width:54px;height:42px;object-fit:contain;animation:floatLogo 3.4s ease-in-out infinite}.powered-by span{font-size:10px;line-height:1.1;text-transform:uppercase;letter-spacing:0;font-weight:850}.powered-by b{display:block;color:var(--gold);font-size:11px}.links{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap}.links a{padding:9px 10px;border:1px solid transparent;border-radius:8px;text-decoration:none;color:#eef9ff;font-size:12px;font-weight:900}.links a.active,.links a:hover{border-color:var(--line);background:rgba(255,255,255,.08)}.links .quote{background:linear-gradient(135deg,var(--green),var(--blue));color:#041210}.hamb{display:none}.hero{min-height:calc(100vh - 98px);position:relative;display:grid;align-items:center;overflow:hidden}.hero-media{position:absolute;inset:0;z-index:-2}.hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,16,15,.96),rgba(7,16,15,.7),rgba(7,16,15,.18))}.hero-photo{width:100%;height:100%;object-fit:cover}.hero-person{position:absolute;right:8%;bottom:8%;width:min(260px,25vw);max-height:360px;object-fit:cover;border:1px solid var(--line);border-radius:8px;box-shadow:0 28px 80px rgba(0,0,0,.42)}.hero-inner{display:grid;grid-template-columns:minmax(0,.75fr) minmax(280px,.25fr);gap:24px;align-items:center}.eyebrow,.badge{color:var(--gold);font-size:12px;text-transform:uppercase;font-weight:950}.hero h1,.page-hero h1{font-size:72px;line-height:.94;margin:0 0 18px}.hero h1 span{display:block;color:var(--green)}.hero p,.page-hero p,.section-head p,.source p{font-size:21px;line-height:1.45;color:#fff8e8;max-width:850px}.hero-actions,.footer-links{display:flex;gap:10px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border-radius:8px;border:1px solid var(--line);padding:12px 15px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font:inherit;font-weight:950;cursor:pointer}.btn.primary{background:linear-gradient(135deg,var(--green),var(--blue));color:#041210;border:0}.btn.green{background:linear-gradient(135deg,#7dd86f,var(--green));color:#041210;border:0}.hero-console,.panel,.service-card,.stat,.qr-card,details{border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.035));box-shadow:0 24px 64px rgba(0,0,0,.28);min-width:0}.hero-console{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;padding:14px;backdrop-filter:blur(10px);max-width:780px}.hero-console b{flex:1 0 100%}.hero-console a{display:inline-flex;align-items:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 11px;background:rgba(0,0,0,.24);color:#fff;text-decoration:none;font-weight:950}.hero-console a:hover{background:rgba(84,214,199,.18);border-color:rgba(84,214,199,.55)}.quick{border-block:1px solid var(--line);padding:16px 0;background:rgba(255,255,255,.04)}.quick form{display:grid;grid-template-columns:1.2fr 1fr .7fr auto;gap:10px}.section,.page-hero{padding:58px 0}.page-hero{position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.06),transparent)}.page-hero:after{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(90deg,rgba(7,16,15,.94),rgba(7,16,15,.78),rgba(7,16,15,.5))}.page-hero .wrap{position:relative;z-index:1}.page-hero-media{position:absolute;inset:0;z-index:0}.page-hero-video{width:100%;height:100%;object-fit:cover;filter:saturate(1.04) contrast(1.04)}.section-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px}.section h2,.section-head h2{font-size:42px;line-height:1.03;margin:0}.grid{display:grid;gap:14px}.cols2{grid-template-columns:repeat(2,minmax(0,1fr))}.cols3{grid-template-columns:repeat(3,minmax(0,1fr))}.service-card{display:block;color:var(--ink);text-decoration:none;overflow:hidden}.service-card img{width:100%;height:190px;object-fit:cover;background:#fff}.service-card h3,.service-card p,.service-card .badge{margin-left:18px;margin-right:18px}.service-card h3{font-size:23px;line-height:1.12;margin-top:8px;margin-bottom:8px}.service-card p{color:var(--muted);line-height:1.6;margin-bottom:18px}.app-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.85fr);gap:18px}.panel{padding:22px}.screen-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:16px}.screen-head span{color:var(--gold);font-size:12px;text-transform:uppercase;font-weight:950}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}label{display:grid;gap:6px;color:#eef7f4;font-size:13px;font-weight:850}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.32);color:#fff;padding:12px;font:inherit}textarea{min-height:124px;resize:vertical}.full{grid-column:1/-1}.queue{display:grid;gap:10px}.queue-item{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22);padding:12px}.queue-item small{display:block;color:var(--muted);line-height:1.45;margin-top:4px}.route-output{line-height:1.65;color:#fff8e8}.triage{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.triage button{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);color:#fff;padding:13px;text-align:left;font:inherit}.danger{border-color:rgba(255,138,122,.6)}.checklist{color:var(--muted);line-height:1.7;padding-left:20px}.panel-logo{max-width:180px;max-height:130px;object-fit:contain;background:#fff;border-radius:8px;padding:10px}.wide-img{width:100%;max-height:420px;object-fit:cover;border-radius:8px}.team-img{width:180px;height:180px;object-fit:cover;border-radius:8px;background:#fff}.facts{display:grid;grid-template-columns:110px 1fr;gap:10px;color:var(--muted);line-height:1.5}.facts dt{color:var(--gold);font-weight:950}.qr-card{text-align:center;padding:22px}.qr{width:min(100%,260px);max-width:100%;height:auto;background:#fff;border-radius:8px;padding:12px}.flyer{text-align:center;border:1px dashed var(--line);border-radius:8px;padding:30px}.flyer-logo{max-width:240px;background:#fff;border-radius:8px;padding:10px}.faq{display:grid;gap:10px}details{padding:16px}.ops-console{position:fixed;right:14px;bottom:76px;z-index:30;display:grid;gap:7px;border:1px solid var(--line);border-radius:8px;background:rgba(7,16,15,.88);backdrop-filter:blur(14px);padding:10px}.ops-console span{font-size:11px;color:var(--gold);font-weight:950;text-transform:uppercase}.ops-console a{font-size:12px;text-decoration:none}.floating-call{position:fixed;right:14px;bottom:14px;z-index:31;border-radius:8px;background:linear-gradient(135deg,var(--gold),#ffb27b);color:#130c05;text-decoration:none;font-weight:1000;padding:12px 14px}.footer{display:flex;justify-content:space-between;gap:18px;align-items:center;border-top:1px solid var(--line);padding:24px 42px;color:var(--muted);font-size:13px}.footer strong,.footer span{display:block}@keyframes load{to{width:100%}}@keyframes floatLogo{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@media(max-width:1050px){.app-intro,.hero-inner,.app-grid{grid-template-columns:1fr}.cols3{grid-template-columns:repeat(2,minmax(0,1fr))}.quick form{grid-template-columns:1fr}.hero h1,.page-hero h1,.intro-copy h2{font-size:52px}.top{padding:12px 20px}.powered-by{margin-left:auto}.links{display:none;position:absolute;left:16px;right:16px;top:92px;background:#07100f;border:1px solid var(--line);border-radius:8px;padding:10px}.links.open{display:grid}.hamb{display:inline-flex;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.08);color:#fff;padding:9px 11px;font-weight:900}.brand{min-width:0}.ops-console{position:static;margin:0 16px 12px}.intro-media{min-height:40vh}.intro-photo{height:42vh}}@media(max-width:650px){.wrap{width:min(100% - 32px,1200px)}.cols2,.cols3,.form-grid,.triage{grid-template-columns:1fr}.hero{min-height:auto;padding:56px 0}.hero h1,.page-hero h1,.intro-copy h2{font-size:38px}.hero p,.page-hero p,.section-head p,.source p{font-size:18px}.hero-actions .btn{width:100%}.section-head{display:block}.top{gap:9px;padding-left:12px;padding-right:12px}.brand small{display:none}.logo{width:48px;height:48px}.powered-by{min-width:76px}.powered-by img{width:44px;height:34px}.powered-by span{font-size:8px}.powered-by b{font-size:9px}.footer{display:block;padding-left:16px;padding-right:16px}.footer-links{margin-top:12px}.floating-call{left:14px;text-align:center}.hero-person{display:none}.facts{grid-template-columns:1fr}.app-intro{padding:18px}.intro-logo{max-width:140px}.panel{padding:18px}.checklist{padding-left:18px}}@media print{.top,.header-alert,.ops-console,.floating-call,.footer,.app-intro,.hero-actions{display:none}.section,.page-hero{padding:18px}body{background:#fff;color:#111}.panel,.service-card{box-shadow:none}}`;
}

function js(c) {
  return telemetryJs(c);
  return `const gsap=window.gsap||{registerPlugin(){},utils:{toArray:s=>[...document.querySelectorAll(s)]},from(){}};const ScrollTrigger=window.ScrollTrigger||{update(){}};const Lenis=window.Lenis||class{constructor(){}raf(){}};gsap.registerPlugin?.(ScrollTrigger);window.__DENTAL_APP_STACK__={gsap:!!window.gsap,lenis:!!window.Lenis,scrollTrigger:!!window.ScrollTrigger,localVendor:true};const APP=${JSON.stringify({slug:c.slug,name:c.name,phone:c.phone,appUrl:appUrl(c),valleyUrl:valleyUrl(c)})};const $=(s,ctx=document)=>ctx.querySelector(s);const $$=(s,ctx=document)=>[...ctx.querySelectorAll(s)];const STORE='dental-app:'+APP.slug+':routes';const PROOF='dental-app:'+APP.slug+':proof';const esc=v=>String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));function read(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}}function write(k,v){localStorage.setItem(k,JSON.stringify(v.slice(0,100)))}function row(k,o){const rows=read(k);rows.unshift({...o,createdAt:new Date().toLocaleString()});write(k,rows);render()}function render(){const q=$('[data-queue]');if(!q)return;const k=document.querySelector('[data-proof-form]')?PROOF:STORE;const rows=read(k);$('[data-count]').textContent=rows.length+' rows';q.innerHTML=rows.length?rows.map(r=>'<div class="queue-item"><strong>'+esc(r.name||r.kind||'Route row')+'</strong><small>'+esc(r.kind||'')+' · '+esc(r.urgency||'')+' · '+esc(r.payment||'')+' · '+esc(r.createdAt)+'</small><small>'+esc(r.note||'No note')+'</small></div>').join(''):'<div class="queue-item"><strong>No rows yet.</strong><small>Use the form or quick tools to create app data in this browser.</small></div>'}function playVideos(){$$('video[data-hero-video]').forEach(v=>{v.muted=true;v.playsInline=true;v.play?.().catch(()=>{})})}function initIntro(){const intro=$('[data-app-intro]'),btn=$('[data-enter-intro]');if(!intro)return;const readyMs=Number(intro.dataset.readyMs||1200),introMs=Number(intro.dataset.introMs||3600);setTimeout(()=>{btn.disabled=false;btn.textContent='Open App'},readyMs);const done=()=>{document.body.classList.remove('intro-active');document.body.classList.add('intro-complete');setTimeout(playVideos,50)};btn.addEventListener('click',done);setTimeout(done,introMs)}function bg(){const canvas=$('.living-field'),ctx=canvas?.getContext('2d');if(!ctx)return;let w=0,h=0,pts=[];const resize=()=>{const d=Math.min(devicePixelRatio||1,1.5);w=innerWidth;h=innerHeight;canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);pts=Array.from({length:Math.min(70,Math.max(28,Math.floor(w*h/26000)))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*2+0.5,s:Math.random()*0.4+0.1}))};const draw=t=>{ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='screen';pts.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x+Math.sin(t*.001*p.s+i)*28,p.y+Math.cos(t*.001*p.s+i)*20,p.r,0,Math.PI*2);ctx.fillStyle=i%2?'rgba(84,214,199,.18)':'rgba(244,201,93,.16)';ctx.fill()});requestAnimationFrame(draw)};addEventListener('resize',resize,{passive:true});resize();requestAnimationFrame(draw)}function init(){initIntro();bg();playVideos();addEventListener('visibilitychange',playVideos);const lenis=new Lenis({lerp:.14,wheelMultiplier:.8,smoothWheel:true});function raf(t){lenis.raf(t);ScrollTrigger.update();requestAnimationFrame(raf)}requestAnimationFrame(raf);$('[data-menu-toggle]')?.addEventListener('click',()=>$('.links')?.classList.toggle('open'));addEventListener('scroll',()=>{$('.progressbar').style.width=(scrollY/Math.max(1,document.body.scrollHeight-innerHeight)*100)+'%'},{passive:true});gsap.utils.toArray('.service-card,.panel').forEach(el=>gsap.from(el,{opacity:0,y:24,duration:.6,scrollTrigger:{trigger:el,start:'top 88%'}}));$('[data-share-site]')?.addEventListener('click',async()=>{const data={title:APP.name,text:APP.name+' app',url:location.href};if(navigator.share)await navigator.share(data).catch(()=>{});else await navigator.clipboard?.writeText(location.href)});$('[data-route-form]')?.addEventListener('submit',e=>{e.preventDefault();row(STORE,Object.fromEntries(new FormData(e.currentTarget)));e.currentTarget.reset()});$('[data-proof-form]')?.addEventListener('submit',e=>{e.preventDefault();row(PROOF,Object.fromEntries(new FormData(e.currentTarget)));e.currentTarget.reset()});$('[data-build-route]')?.addEventListener('click',()=>{const need=$('[data-build-need]').value,time=$('[data-build-time]').value,pay=$('[data-build-pay]').value;$('[data-route-output]').innerHTML='<strong>'+esc(need)+' · '+esc(time)+'</strong><p>Office handoff: capture callback, confirm '+esc(pay).toLowerCase()+', route to official booking/call, and save an intake row.</p>';row(STORE,{name:'Route builder',kind:need,urgency:time,payment:pay,note:'Built from route builder'})});$$('[data-triage]').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.triage;$('[data-triage-output]').innerHTML='<strong>'+esc(s)+'</strong><p>Call '+APP.phone+' or official booking. This app does not diagnose; it routes urgent context.</p>';row(STORE,{name:'Urgent route',kind:s,urgency:'Urgent',payment:'Unknown',note:'Triage selected'})}));render()}document.addEventListener('DOMContentLoaded',init);`;
}

function telemetryJs(c) {
  return `const gsap = window.gsap || { registerPlugin() {}, utils: { toArray: (selector) => [...document.querySelectorAll(selector)] }, from() {} };
const ScrollTrigger = window.ScrollTrigger || { update() {} };
const Lenis = window.Lenis || class { constructor() {} raf() {} };
gsap.registerPlugin?.(ScrollTrigger);
window.__DENTAL_APP_STACK__ = { gsap: !!window.gsap, lenis: !!window.Lenis, scrollTrigger: !!window.ScrollTrigger, localVendor: true };
const APP = ${JSON.stringify({ slug: c.slug, name: c.name, phone: c.phone, appUrl: appUrl(c), valleyUrl: valleyUrl(c) })};
const LOCAL_STATUS = "browser-local pending/static artifact";
const LOCAL_SOURCE = "localStorage";
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const STORE = "dental-app:" + APP.slug + ":routes";
const PROOF = "dental-app:" + APP.slug + ":proof";
const esc = (value) => String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value.slice(0, 100)));
}

function localRow(data) {
  return {
    ...data,
    createdAt: new Date().toLocaleString(),
    telemetryStatus: data.telemetryStatus || LOCAL_STATUS,
    telemetrySource: data.telemetrySource || LOCAL_SOURCE,
    telemetryReceipt: data.telemetryReceipt || "none"
  };
}

function row(key, data) {
  const rows = read(key);
  rows.unshift(localRow(data));
  write(key, rows);
  render();
}

function render() {
  const queue = $("[data-queue]");
  if (!queue) return;
  const key = document.querySelector("[data-proof-form]") ? PROOF : STORE;
  const rows = read(key);
  const count = $("[data-count]");
  if (count) count.textContent = rows.length + " rows - " + LOCAL_STATUS;
  queue.innerHTML = rows.length
    ? rows.map((item) => '<div class="queue-item"><strong>' + esc(item.name || item.kind || "Route row") + '</strong><small>' + esc(item.kind || "") + ' · ' + esc(item.urgency || "") + ' · ' + esc(item.payment || "") + ' · ' + esc(item.createdAt) + '</small><small>Telemetry: ' + esc(item.telemetryStatus || LOCAL_STATUS) + ' · Source: ' + esc(item.telemetrySource || LOCAL_SOURCE) + '</small><small>' + esc(item.note || "No note") + '</small></div>').join("")
    : '<div class="queue-item"><strong>No rows yet.</strong><small>Rows created here are browser-local pending/static artifacts until a Worker, Relay, or Command Bridge receipt exists.</small></div>';
}

function playVideos() {
  $$("video[data-hero-video]").forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.play?.().catch(() => {});
  });
}

function initIntro() {
  const intro = $("[data-app-intro]");
  const button = $("[data-enter-intro]");
  if (!intro) return;
  const readyMs = Number(intro.dataset.readyMs || 1200);
  const introMs = Number(intro.dataset.introMs || 3600);
  setTimeout(() => {
    button.disabled = false;
    button.textContent = "Open App";
  }, readyMs);
  const done = () => {
    document.body.classList.remove("intro-active");
    document.body.classList.add("intro-complete");
    setTimeout(playVideos, 50);
  };
  button.addEventListener("click", done);
  setTimeout(done, introMs);
}

function bg() {
  const canvas = $(".living-field");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  let width = 0;
  let height = 0;
  let points = [];
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = Array.from({ length: Math.min(70, Math.max(28, Math.floor(width * height / 26000))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.5,
      s: Math.random() * 0.4 + 0.1
    }));
  };
  const draw = (time) => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x + Math.sin(time * 0.001 * point.s + index) * 28, point.y + Math.cos(time * 0.001 * point.s + index) * 20, point.r, 0, Math.PI * 2);
      ctx.fillStyle = index % 2 ? "rgba(84,214,199,.18)" : "rgba(244,201,93,.16)";
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(draw);
}

function init() {
  initIntro();
  bg();
  playVideos();
  addEventListener("visibilitychange", playVideos);
  const lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 0.8, smoothWheel: true });
  function raf(time) {
    lenis.raf(time);
    ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  $("[data-menu-toggle]")?.addEventListener("click", () => $(".links")?.classList.toggle("open"));
  addEventListener("scroll", () => {
    const progress = $(".progressbar");
    if (progress) progress.style.width = (scrollY / Math.max(1, document.body.scrollHeight - innerHeight) * 100) + "%";
  }, { passive: true });
  gsap.utils.toArray(".service-card,.panel").forEach((element) => gsap.from(element, { opacity: 0, y: 24, duration: 0.6, scrollTrigger: { trigger: element, start: "top 88%" } }));
  $("[data-share-site]")?.addEventListener("click", async () => {
    const data = { title: APP.name, text: APP.name + " app", url: location.href };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else await navigator.clipboard?.writeText(location.href);
  });
  $("[data-route-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    row(STORE, Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  });
  $("[data-proof-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    row(PROOF, Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  });
  $("[data-build-route]")?.addEventListener("click", () => {
    const need = $("[data-build-need]").value;
    const time = $("[data-build-time]").value;
    const pay = $("[data-build-pay]").value;
    $("[data-route-output]").innerHTML = "<strong>" + esc(need) + " · " + esc(time) + "</strong><p>Office handoff: capture callback, confirm " + esc(pay).toLowerCase() + ", route to official booking/call, and save a browser-local pending intake row.</p>";
    row(STORE, { name: "Route builder", kind: need, urgency: time, payment: pay, note: "Built from route builder" });
  });
  $$("[data-triage]").forEach((button) => button.addEventListener("click", () => {
    const selection = button.dataset.triage;
    $("[data-triage-output]").innerHTML = "<strong>" + esc(selection) + "</strong><p>Call " + APP.phone + " or official booking. This app does not diagnose; it routes urgent context.</p>";
    row(STORE, { name: "Urgent route", kind: selection, urgency: "Urgent", payment: "Unknown", note: "Triage selected" });
  }));
  render();
}

document.addEventListener("DOMContentLoaded", init);
`;
}

function qr(url) { return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#fff"/><path d="M24 24h64v64H24zM168 24h64v64h-64zM24 168h64v64H24z" fill="#07100f"/><path d="M40 40h32v32H40zM184 40h32v32h-32zM40 184h32v32H40z" fill="#fff"/><path d="M112 28h12v12h-12zm24 0h12v12h-12zm-24 24h36v12h-36zm0 36h12v12h-12zm24 0h24v12h-24zm48 24h12v12h-12zm24 0h12v12h-12zM104 128h24v12h-24zm36 0h12v12h-12zm24 0h44v12h-44zM104 152h12v12h-12zm24 0h36v12h-36zm48 0h12v12h-12zm24 0h24v12h-24zM104 184h48v12h-48zm60 0h12v12h-12zm24 0h36v12h-36zM112 208h12v12h-12zm24 0h24v12h-24zm36 0h12v12h-12zm24 0h12v12h-12z" fill="#07100f"/><text x="128" y="246" text-anchor="middle" font-family="Arial" font-size="7" fill="#07100f">${esc(url).slice(0,44)}</text></svg>`; }

function valley(c) {
  return shell(c, "valley-post", "Valley Verified", pageHero(c, c.name, "Full client app built first. This Valley post routes into the app, not a template page.", `<a class="btn primary" href="${appUrl(c)}">Open full app</a><a class="btn dark" href="${c.official}" target="_blank" rel="noopener">Official source</a>`) + `<section class="section"><div class="wrap grid cols3">${card(c, "Appointment app", `${appUrl(c)}appointments.html`, "Live app appointment route.", "hero")}${card(c, "Proof ledger", `${appUrl(c)}proof.html`, "Owner proof and source ledger.", "logo")}${card(c, "Workspace", `${appUrl(c)}workspace.html`, "NorthStar handoff.", "office")}</div></section>`).replaceAll('href="assets/', `href="${appUrl(c)}assets/`).replaceAll('src="assets/', `src="${appUrl(c)}assets/`).replaceAll('poster="assets/', `poster="${appUrl(c)}assets/`);
}

function smoke(c) { return `import fs from 'node:fs';const files=${JSON.stringify(baseRoutes.map(r=>r[0]).concat(["assets/app.js","assets/styles.css","assets/qr.svg","assets/hero-video.mp4","assets/skyes-over-london-deity-logo.png","assets/vendor/gsap.min.js","assets/vendor/ScrollTrigger.min.js","assets/vendor/lenis.min.js"], c.logo3d ? ["assets/logo-3d.svg"] : []))};for(const f of files){if(!fs.existsSync(new URL('../'+f,import.meta.url)))throw new Error('missing '+f)}const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const s of ['${c.name.replace(/'/g,"\\'")}','Appointment router','Care route builder','Intake queue','NorthStar','Powered By:','SkyeKnowlogy','data-hero-video','assets/vendor/gsap.min.js']){if(!html.includes(s))throw new Error('missing '+s)}for(const href of ['appointments.html','intake.html','insurance.html','proof.html','workspace.html']){if(!html.includes('href="'+href+'"'))throw new Error('module link missing '+href)}if((html.match(/<img /g)||[]).length<4)throw new Error('not enough real media');if((html.match(/<video /g)||[]).length<2)throw new Error('hero videos missing');console.log('${c.name.replace(/'/g,"\\'")} ground-up app smoke passed')`; }

for (const c of clients) {
  const dirs = [
    path.join(ROOT, "Skye-Clients", `${c.slug}-app`),
    path.join(ROOT, "client-app-factory", "client-apps", c.slug),
    path.join(ROOT, "metraiyux_0s_site", "client-app-factory", "client-apps", c.slug)
  ];
  const heroVideoFallback = readHeroVideoFallback(c);
  dirs.forEach(rm);
  rm(path.join(ROOT, "metraiyux_0s_site", "valley-verified", "business", c.valleySlug));
  for (const dir of dirs) {
    ensure(dir);
    ensure(path.join(dir, "assets"));
    for (const [file, url] of c.media) await download(url, path.join(dir, "assets", file));
    copyDeityLogo(dir);
    copyVendorScripts(dir);
    writeLogo3d(c, dir);
    makeTransparentLogo(c, dir);
    generateHeroVideo(c, dir, heroVideoFallback);
    write(path.join(dir, "assets", "qr.svg"), qr(appUrl(c)));
    write(path.join(dir, "assets", "styles.css"), css());
    write(path.join(dir, "assets", "app.js"), telemetryJs(c));
    for (const [route, title] of baseRoutes) write(path.join(dir, route), shell(c, route, title, render(c, route)));
    ensure(path.join(dir, "workspace-preview"));
    write(path.join(dir, "workspace-preview", "index.html"), shell(c, "workspace-preview/index.html", "Workspace Preview", workspace(c)));
    write(path.join(dir, "manifest.webmanifest"), JSON.stringify({ name: `${c.name} App`, short_name: c.short, start_url: "./index.html", display: "standalone", background_color: "#07100f", theme_color: "#07100f", icons: [] }, null, 2));
    write(path.join(dir, "service-worker.js"), "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(clients.claim()));\n");
    write(path.join(dir, "package.json"), JSON.stringify({ type: "module", scripts: { smoke: "node tests/smoke.mjs" }, dependencies: { gsap: "^3.12.5", lenis: "^1.1.20" } }, null, 2));
    ensure(path.join(dir, "tests"));
    write(path.join(dir, "tests", "smoke.mjs"), smoke(c));
    write(path.join(dir, "site-data.json"), JSON.stringify({ ...c, appUrl: appUrl(c), valleyUrl: valleyUrl(c), standard: "empire-pallets-ground-up-real-app" }, null, 2));
    write(path.join(dir, "APP_PATH_MANIFEST.json"), JSON.stringify({ appSlug: c.slug, appUrl: appUrl(c), valleyUrl: valleyUrl(c), routes: baseRoutes, media: c.media.map(([file, url, alt]) => ({ file, sourceUrl: url, alt })), customAppPreviewLogo: Boolean(c.logo3d), noGeneratedOfficeOrStaffMedia: true }, null, 2));
    write(path.join(dir, "APP_UPGRADE_PROOF.md"), `# ${c.name} Ground-Up App\n\nBuilt from scratch after removing the prior shell.\n\n- Real official media copied into assets\n- Custom 3D app-preview logo generated only when flagged in the manifest\n- Intro sequence\n- GSAP + Lenis runtime\n- Appointment, route builder, intake, payment, patient center, urgent, workspace, proof, scan, flyer\n- No generated office photos, fake doctors, or fake client media\n`);
    write(path.join(dir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${appUrl(c)}sitemap.xml\n`);
    write(path.join(dir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${baseRoutes.map(([r]) => `<url><loc>${appUrl(c)}${r}</loc></url>`).join("")}</urlset>`);
    write(path.join(dir, "_redirects"), "/* /index.html 200\n");
  }
  const vdir = path.join(ROOT, "metraiyux_0s_site", "valley-verified", "business", c.valleySlug);
  write(path.join(vdir, "index.html"), valley(c));
  write(path.join(vdir, "APP_SYNC.json"), JSON.stringify({ appSlug: c.slug, appUrl: appUrl(c), valleyUrl: valleyUrl(c), standard: "app-first-ground-up", syncedAt: new Date().toISOString() }, null, 2));
}

console.log(JSON.stringify({ ok: true, rebuilt: clients.map(c => c.slug), routeCount: baseRoutes.length }, null, 2));
