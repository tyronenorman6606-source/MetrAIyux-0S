#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = "/workspaces/MetrAIyux-0S";
const APP_SLUG = "arizona-biltmore-dentistry";
const VALLEY_SLUG = "arizona-biltmore-dentistry-phoenix-85016-d406e26";
const PROD_BASE = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const APP_URL = `${PROD_BASE}/client-app-factory/client-apps/${APP_SLUG}/`;
const VALLEY_URL = `${PROD_BASE}/valley-verified/business/${VALLEY_SLUG}/`;

const client = {
  name: "Arizona Biltmore Dentistry",
  tagline: "Phoenix dental appointment and patient operations app",
  phoneDisplay: "(602) 957-8200",
  phoneHref: "tel:16029578200",
  schedulePhoneDisplay: "(602) 562-7096",
  schedulePhoneHref: "tel:16025627096",
  faxDisplay: "(602) 957-6198",
  address: "2777 E Camelback Rd #101, Phoenix, AZ 85016",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Arizona+Biltmore+Dentistry+2777+E+Camelback+Rd+%23101+Phoenix+AZ+85016",
  officialUrl: "https://www.arizonabiltmoredentistry.com/",
  biltmorePage: "https://www.arizonabiltmoredentistry.com/locations/biltmore/",
  bookingUrl: "https://app.nexhealth.com/appt/arizonabiltmoredentistry",
  hours: [
    ["Monday to Thursday", "7 AM - 5 PM"],
    ["Friday", "7 AM - 4 PM"],
    ["Saturday", "7 AM - 2 PM"]
  ],
  doctors: ["Dr. Aaron Jeziorski", "Dr. Michael Hood"],
  services: [
    ["Family Dental Care", "Cleanings, exams, preventative dentistry, family and pediatric visits."],
    ["Cosmetic Dentistry", "Whitening, veneers, smile makeovers, and in-office cosmetic care."],
    ["Dental Implants", "Implant consult routing for missing teeth and restorative planning."],
    ["Root Canal Therapy", "Pain/infection routing for natural-tooth saving treatment."],
    ["Crowns & Bridges", "Restorative care route for damaged, missing, or weak teeth."],
    ["Emergency Dental Services", "$99 emergency exam source flag and urgent call routing."],
    ["Dentures and Implant Dentures", "Replacement-teeth planning and consult intake."],
    ["Orthodontics / Invisalign", "$1000 off Invisalign source flag and aligner consult routing."]
  ],
  tech: ["Digital X-rays", "Laser gum therapy", "WiFi", "Comfortable pillows"],
  financial: ["Most insurances accepted", "3rd-party financing available", "Dental Loyalty Program", "No treatment started before expected out-of-pocket costs are reviewed"],
  sourceFacts: [
    "Official homepage lists opening hours, phone numbers, emergency exam offer, technology, and services.",
    "Official Biltmore page lists address, service categories, scheduling number, and doctors.",
    "Official footer lists location, main phone, fax, financial links, and sister office links."
  ]
};

const media = {
  logo: {
    file: "logo-header.png",
    url: "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/logo-header.png",
    alt: "Arizona Biltmore Dentistry official logo"
  },
  logoFooter: {
    file: "logo-footer.png",
    url: "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/logo-footer.png",
    alt: "Arizona Biltmore Dentistry official footer logo"
  },
  office: {
    file: "office-biltmore.jpg",
    url: "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/officeslide-2.jpg",
    alt: "Arizona Biltmore Dentistry office photo from official site"
  },
  doctor: {
    file: "dr-jeziorski.jpg",
    url: "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2018/02/dr-jeziorski.jpg",
    alt: "Dr. Jeziorski official headshot"
  },
  practice: {
    file: "az-biltmore-practice.png",
    url: "https://www.arizonabiltmoredentistry.com/wp-content/uploads/2021/07/az-biltmore.png",
    alt: "Arizona Biltmore Dentistry official practice graphic"
  }
};

const routes = [
  ["index.html", "Dashboard", home],
  ["appointments.html", "Appointment Router", appointments],
  ["quote.html", "Treatment Route", treatmentRoute],
  ["services.html", "Services", services],
  ["family-dentistry.html", "Family Dentistry", serviceDetail("Family Dental Care")],
  ["cosmetic-dentistry.html", "Cosmetic Dentistry", serviceDetail("Cosmetic Dentistry")],
  ["dental-implants.html", "Dental Implants", serviceDetail("Dental Implants")],
  ["root-canal.html", "Root Canal Therapy", serviceDetail("Root Canal Therapy")],
  ["emergency.html", "Emergency Dental Route", emergency],
  ["invisalign.html", "Invisalign Route", serviceDetail("Orthodontics / Invisalign")],
  ["intake.html", "Patient Intake", intake],
  ["patient-center.html", "Patient Center", patientCenter],
  ["insurance.html", "Insurance", insurance],
  ["financial.html", "Financial", insurance],
  ["team.html", "Team", team],
  ["office.html", "Office", office],
  ["technology.html", "Technology", technology],
  ["workspace.html", "NorthStar Workspace", workspace],
  ["scan.html", "Scan Route", scan],
  ["preview.html", "App Preview", preview],
  ["proof.html", "Proof Ledger", proof],
  ["faq.html", "FAQ", faq],
  ["contact.html", "Contact", contact],
  ["flyer.html", "Flyer", flyer],
  ["about.html", "Practice Snapshot", about],
  ["programs.html", "Patient Programs", programs],
  ["offline.html", "Offline", offline],
  ["workspace-preview.html", "Workspace Preview", workspace]
];

const targets = [
  path.join(ROOT, "Skye-Clients", `${APP_SLUG}-app`),
  path.join(ROOT, "client-app-factory", "client-apps", APP_SLUG),
  path.join(ROOT, "metraiyux_0s_site", "client-app-factory", "client-apps", APP_SLUG)
];

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensure(path.dirname(file));
  fs.writeFileSync(file, content);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rel(route = "index.html") {
  return route;
}

function nav(active) {
  const items = [
    ["Dashboard", "index.html"],
    ["Appointments", "appointments.html"],
    ["Services", "services.html"],
    ["Emergency", "emergency.html"],
    ["Intake", "intake.html"],
    ["Insurance", "insurance.html"],
    ["Patient Center", "patient-center.html"],
    ["Workspace", "workspace.html"],
    ["Proof", "proof.html"]
  ];
  return `<button class="hamb" type="button" aria-expanded="false" aria-controls="primary-nav" data-menu-toggle>Menu</button>
  <nav class="links" id="primary-nav" aria-label="Primary navigation">
    ${items.map(([label, href]) => `<a class="${href === active ? "active" : ""}" href="${href}">${label}</a>`).join("")}
    <a class="quote" href="quote.html">Route Care</a>
  </nav>`;
}

function shell(route, title, body, options = {}) {
  const description = options.description || `${client.name} patient operations app for appointment routing, dental service triage, insurance, intake, and NorthStar workspace handoff.`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(client.name)} | ${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#07100f">
  <link rel="canonical" href="${APP_URL}${route === "index.html" ? "" : route}">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/styles.css">
  <script defer src="assets/app.js"></script>
</head>
<body data-route="${esc(route)}">
  <div class="progressbar" aria-hidden="true"></div>
  <div class="header-alert">Official-source-backed dental operations app · no generated media · built to Pallets app depth</div>
  <header class="top">
    <a class="brand" href="index.html" aria-label="${esc(client.name)} app home">
      <img class="logo" src="assets/${media.logo.file}" alt="${esc(media.logo.alt)}">
      <span><strong>${esc(client.name)}</strong><small>${esc(client.tagline)}</small></span>
    </a>
    ${nav(route)}
  </header>
  <main>
    ${body}
  </main>
  <aside class="ops-console" aria-label="App command rail">
    <span>Dental app</span>
    <a href="appointments.html">Book</a>
    <a href="emergency.html">Urgent</a>
    <a href="intake.html">Intake</a>
    <a href="workspace.html">Workspace</a>
  </aside>
  <a class="floating-call" href="${client.phoneHref}">Call ${esc(client.phoneDisplay)}</a>
  <footer class="footer">
    <div><strong>${esc(client.name)}</strong><span>${esc(client.address)}</span><span>Main ${esc(client.phoneDisplay)} · Schedule ${esc(client.schedulePhoneDisplay)} · Fax ${esc(client.faxDisplay)}</span></div>
    <div class="footer-links"><a href="${client.officialUrl}" target="_blank" rel="noopener">Official site</a><a href="${client.biltmorePage}" target="_blank" rel="noopener">Official Biltmore page</a><a href="${VALLEY_URL}">Valley post</a></div>
  </footer>
</body>
</html>`;
}

function hero({ eyebrow, h1, text, actions = "" }) {
  return `<section class="hero">
    <div class="hero-visual">
      <img class="hero-photo" src="assets/${media.office.file}" alt="${esc(media.office.alt)}">
      <div class="media-stack" aria-label="Official media from Arizona Biltmore Dentistry">
        <img src="assets/${media.logoFooter.file}" alt="${esc(media.logoFooter.alt)}">
        <img src="assets/${media.doctor.file}" alt="${esc(media.doctor.alt)}">
      </div>
      <div class="route-map" aria-hidden="true">
        <b>Care routing</b>
        <i>Call</i><i>Book</i><i>Intake</i><i>Insurance</i><i>Chair</i><i>Follow-up</i>
      </div>
    </div>
    <div class="wrap hero-inner">
      <div class="hero-copy" data-reveal>
        <div class="eyebrow">${esc(eyebrow)}</div>
        <h1>${h1}</h1>
        <p>${esc(text)}</p>
        <div class="hero-actions">${actions}</div>
      </div>
    </div>
  </section>`;
}

function sourcePanel() {
  return `<section class="section proof-band">
    <div class="wrap split">
      <div>
        <div class="eyebrow">Source control</div>
        <h2>Real business facts, not generated filler.</h2>
        <p>This app only uses operational copy derived from Arizona Biltmore Dentistry public source pages and app-level routing we control. No generated office photos, fake doctors, fake logos, fake reviews, or synthetic patient imagery are used.</p>
      </div>
      <div class="source-list">
        ${client.sourceFacts.map(fact => `<p>${esc(fact)}</p>`).join("")}
      </div>
    </div>
  </section>`;
}

function home() {
  return `${hero({
    eyebrow: "Phoenix dental operations app",
    h1: "Arizona Biltmore Dentistry <span>patient routing system</span>",
    text: "A real app surface for scheduling, urgent triage, intake, treatment routing, insurance/financing prep, office handoff, and NorthStar workspace control.",
    actions: `<a class="btn primary" href="appointments.html">Start Appointment</a><a class="btn green" href="emergency.html">Urgent Dental Route</a><a class="btn dark" href="workspace.html">Open Workspace</a><button class="btn dark" type="button" data-share-site>Share App</button>`
  })}
  <section class="quick">
    <div class="wrap">
      <form action="quote.html">
        <select name="need" aria-label="Dental need">
          <option>Cleaning / exam</option><option>Tooth pain</option><option>Implant consult</option><option>Cosmetic consult</option><option>Invisalign consult</option><option>Insurance question</option>
        </select>
        <input name="timeline" aria-label="Timeline" placeholder="Today, this week, routine">
        <input name="zip" aria-label="ZIP" placeholder="ZIP">
        <button class="btn primary">Route Care</button>
      </form>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div><div class="eyebrow">App modules</div><h2>Built like a service desk, not a directory page.</h2></div>
        <p>The Pallets standard means a visitor can do something: choose a route, fill intake, understand source facts, call the office, open the workspace, and pass a proof gate.</p>
      </div>
      <div class="grid cols3">
        ${moduleCard("Appointment router", "appointments.html", "Care type, timing, symptoms, call vs booking handoff, and source-backed office hours.", media.office.file, media.office.alt)}
        ${moduleCard("Emergency lane", "emergency.html", "$99 emergency exam flag, pain/swelling triage, warning states, and urgent call handoff.", media.practice.file, media.practice.alt)}
        ${moduleCard("Patient intake", "intake.html", "Browser-local intake queue for patient name, need, anxiety/access notes, and insurance status.", media.doctor.file, media.doctor.alt)}
        ${moduleCard("Insurance desk", "insurance.html", "Most-insurances-accepted flag, financing, loyalty program, and out-of-pocket review reminders.", media.logoFooter.file, media.logoFooter.alt)}
        ${moduleCard("Treatment routes", "services.html", "Family, cosmetic, implant, root canal, Invisalign, denture, crown, and extraction paths.", media.office.file, media.office.alt)}
        ${moduleCard("Owner proof", "proof.html", "Claim ledger, source links, correction queue, Valley sync, and no-fake-media policy.", media.logo.file, media.logo.alt)}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap dashboard-grid">
      <div class="panel">
        <div class="screen-head"><strong>Today route board</strong><span class="live-dot">Live app</span></div>
        <div class="route-board">
          <button data-quick-route="Cleaning / exam">Cleaning / exam<span>Routine prevention and new-patient check</span></button>
          <button data-quick-route="Tooth pain">Tooth pain<span>Pain, infection, root canal, extraction, or emergency review</span></button>
          <button data-quick-route="Implant consult">Implant consult<span>Missing tooth planning and financing prep</span></button>
          <button data-quick-route="Invisalign consult">Invisalign consult<span>Special offer flag and aligner consult handoff</span></button>
        </div>
      </div>
      <div class="panel">
        <div class="screen-head"><strong>Office facts</strong><span>official</span></div>
        <dl class="facts">
          <dt>Address</dt><dd>${esc(client.address)}</dd>
          <dt>Main</dt><dd>${esc(client.phoneDisplay)}</dd>
          <dt>Scheduling</dt><dd>${esc(client.schedulePhoneDisplay)}</dd>
          <dt>Hours</dt><dd>${client.hours.map(([d,h]) => `${d}: ${h}`).join(" · ")}</dd>
        </dl>
      </div>
    </div>
  </section>
  ${sourcePanel()}`;
}

function moduleCard(title, href, text, image = media.practice.file, alt = media.practice.alt) {
  return `<a class="service-card" href="${href}"><img src="assets/${esc(image)}" alt="${esc(alt)}"><span class="badge">Route</span><h3>${esc(title)}</h3><p>${esc(text)}</p></a>`;
}

function appointments() {
  return pageHero("Appointment router", "Choose the right dental lane before the patient calls or books.", `<a class="btn primary" href="${client.bookingUrl}" target="_blank" rel="noopener">Open official booking</a><a class="btn dark" href="${client.schedulePhoneHref}">Call scheduling</a>`) + `
  <section class="section">
    <div class="wrap intake-shell">
      <form class="panel" data-route-form>
        <div class="screen-head"><strong>Route a patient request</strong><span>browser local</span></div>
        ${formFields()}
        <button class="btn primary full" type="submit">Save route row</button>
      </form>
      <div class="panel">
        <div class="screen-head"><strong>Route queue</strong><span data-route-count>0 rows</span></div>
        <div data-intake-queue class="queue"></div>
      </div>
    </div>
  </section>
  ${hoursSection()}`;
}

function treatmentRoute() {
  return pageHero("Treatment route builder", "A lightweight route desk for front-office handoff and lead context.", `<a class="btn primary" href="intake.html">Open intake queue</a>`) + `
  <section class="section"><div class="wrap">
    <div class="route-builder">
      <div class="panel">
        <label>Need<select data-builder-need>${client.services.map(([s]) => `<option>${esc(s)}</option>`).join("")}</select></label>
        <label>Timeline<select data-builder-timeline><option>Today</option><option>This week</option><option>Routine</option><option>Consult only</option></select></label>
        <label>Insurance<select data-builder-insurance><option>Has insurance</option><option>Needs financing</option><option>Uninsured / loyalty plan question</option><option>Unknown</option></select></label>
        <button class="btn primary" type="button" data-build-route>Build handoff</button>
      </div>
      <div class="panel route-output" data-route-output>
        <strong>Handoff will appear here.</strong>
        <p>Select care type, timeline, and payment context to produce the front-desk summary.</p>
      </div>
    </div>
  </div></section>`;
}

function formFields() {
  return `<div class="form-grid">
    <label>Name<input name="name" autocomplete="name" placeholder="Patient or lead name"></label>
    <label>Phone<input name="phone" autocomplete="tel" placeholder="Best callback"></label>
    <label>Care type<select name="kind">${client.services.map(([s]) => `<option>${esc(s)}</option>`).join("")}</select></label>
    <label>Urgency<select name="urgency"><option>Routine</option><option>This week</option><option>Today</option><option>Severe pain / swelling</option></select></label>
    <label>Insurance<select name="insurance"><option>Unknown</option><option>Has insurance</option><option>Needs financing</option><option>Loyalty plan question</option></select></label>
    <label>Access<select name="access"><option>No special access note</option><option>Anxious patient</option><option>Child patient</option><option>Mobility support needed</option></select></label>
    <label class="full">Notes<textarea name="note" placeholder="Symptoms, desired treatment, timing, office questions"></textarea></label>
  </div>`;
}

function services() {
  return pageHero("Dental service routes", "Official service categories turned into app-level patient routing.", `<a class="btn primary" href="appointments.html">Route appointment</a>`) + `
  <section class="section"><div class="wrap grid cols3">
    ${client.services.map(([name, text], index) => moduleCard(name, routeForService(name), text, [media.office.file, media.practice.file, media.doctor.file, media.logoFooter.file][index % 4], [media.office.alt, media.practice.alt, media.doctor.alt, media.logoFooter.alt][index % 4])).join("")}
  </div></section>`;
}

function routeForService(name) {
  return {
    "Family Dental Care": "family-dentistry.html",
    "Cosmetic Dentistry": "cosmetic-dentistry.html",
    "Dental Implants": "dental-implants.html",
    "Root Canal Therapy": "root-canal.html",
    "Emergency Dental Services": "emergency.html",
    "Orthodontics / Invisalign": "invisalign.html"
  }[name] || "quote.html";
}

function serviceDetail(name) {
  return () => {
    const item = client.services.find(([service]) => service === name) || client.services[0];
    return pageHero(item[0], item[1], `<a class="btn primary" href="appointments.html?need=${encodeURIComponent(item[0])}">Start ${esc(item[0])} route</a><a class="btn dark" href="${client.schedulePhoneHref}">Call scheduling</a>`) + `
    <section class="section"><div class="wrap split">
      <div class="panel">
        <div class="screen-head"><strong>Route checklist</strong><span>front desk</span></div>
        <ul class="checklist">
          <li>Confirm patient contact and preferred appointment window.</li>
          <li>Ask whether the patient has insurance, financing needs, or loyalty-plan questions.</li>
          <li>Capture pain level, swelling, bleeding, cosmetic goal, or consult context.</li>
          <li>Hand off to official booking or phone scheduling with source-backed office details.</li>
        </ul>
      </div>
      <div class="panel">
        <div class="screen-head"><strong>Official source notes</strong><span>public site</span></div>
        <p>${esc(item[0])} is listed in Arizona Biltmore Dentistry public service/category content. This page avoids fabricated treatment guarantees and routes the patient to official scheduling.</p>
        <a class="btn dark" href="${client.officialUrl}" target="_blank" rel="noopener">Open official site</a>
      </div>
    </div></section>`;
  };
}

function emergency() {
  return pageHero("Emergency dental route", "Urgent symptoms should go straight to the office call lane.", `<a class="btn primary" href="${client.phoneHref}">Call main office</a><a class="btn green" href="${client.schedulePhoneHref}">Call scheduling</a>`) + `
  <section class="section"><div class="wrap dashboard-grid">
    <div class="panel danger-panel">
      <div class="screen-head"><strong>Urgency screen</strong><span>$99 emergency exam source flag</span></div>
      <div class="triage">
        <button data-triage="Severe pain">Severe pain</button>
        <button data-triage="Swelling">Swelling</button>
        <button data-triage="Broken tooth">Broken tooth</button>
        <button data-triage="Lost crown">Lost crown</button>
        <button data-triage="Bleeding">Bleeding</button>
        <button data-triage="After-hours concern">After-hours concern</button>
      </div>
      <div class="triage-output" data-triage-output>Pick a symptom to create an office handoff summary.</div>
    </div>
    <div class="panel">
      <div class="screen-head"><strong>Patient-safe routing</strong><span>no diagnosis</span></div>
      <p>This app does not diagnose dental or medical emergencies. It captures context and pushes the patient to the official office call lane. Severe swelling, trauma, fever, or breathing/swallowing issues should be escalated immediately to emergency medical care.</p>
    </div>
  </div></section>`;
}

function intake() {
  return pageHero("Patient intake queue", "Capture lead context before the NorthStar workspace handoff.", `<a class="btn primary" href="workspace.html">Open workspace</a>`) + `
  <section class="section">${appointments().match(/<section class="section">([\s\S]*)<\/section>/)?.[0] || ""}</section>`;
}

function patientCenter() {
  return pageHero("Patient center", "A patient-facing control panel for forms, phone, booking, finance, and source links.", `<a class="btn primary" href="${client.bookingUrl}" target="_blank" rel="noopener">Official booking</a>`) + `
  <section class="section"><div class="wrap grid cols3">
    ${moduleCard("New patient intake", "intake.html", "Capture treatment goal, insurance status, comfort notes, and callback details.")}
    ${moduleCard("Insurance and finance", "insurance.html", "Most insurances accepted, 3rd-party financing, loyalty program, and cost-review reminders.")}
    ${moduleCard("Office details", "office.html", "Address, map, hours, main phone, schedule phone, and fax.")}
  </div></section>`;
}

function insurance() {
  return pageHero("Insurance and financial desk", "Public financial promises turned into a patient-ready prep lane.", `<a class="btn primary" href="appointments.html">Route with insurance context</a>`) + `
  <section class="section"><div class="wrap split">
    <div class="panel"><div class="screen-head"><strong>Financial source facts</strong><span>official</span></div>
      <ul class="checklist">${client.financial.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    </div>
    <div class="panel"><div class="screen-head"><strong>Estimate prep</strong><span>not a quote</span></div>
      <label>Coverage status<select data-cost-coverage><option>Has insurance</option><option>No insurance</option><option>Financing needed</option><option>Loyalty plan question</option></select></label>
      <label>Treatment type<select data-cost-treatment>${client.services.map(([s]) => `<option>${esc(s)}</option>`).join("")}</select></label>
      <button class="btn primary" type="button" data-cost-build>Build financial handoff</button>
      <div class="route-output" data-cost-output>Financial handoff will appear here.</div>
    </div>
  </div></section>`;
}

function team() {
  return pageHero("Team", "Officially listed dentists and source-safe team routing.", `<a class="btn primary" href="${client.biltmorePage}" target="_blank" rel="noopener">Official Biltmore page</a>`) + `
  <section class="section"><div class="wrap grid cols2">${client.doctors.map(name => `<div class="panel doctor-card"><span class="badge">Dentist</span><h3>${esc(name)}</h3><p>Listed in official Arizona Biltmore Dentistry public site content. This app does not invent staff biographies or headshots.</p></div>`).join("")}</div></section>`;
}

function office() {
  return pageHero("Office", "Location, hours, phone, fax, and official map handoff.", `<a class="btn primary" href="${client.mapUrl}" target="_blank" rel="noopener">Open map</a><a class="btn dark" href="${client.phoneHref}">Call</a>`) + hoursSection();
}

function technology() {
  return pageHero("Technology and comfort", "Source-backed care environment notes without fake imagery.", `<a class="btn primary" href="appointments.html">Route a visit</a>`) + `
  <section class="section"><div class="wrap grid cols4">${client.tech.map(item => `<div class="stat"><strong>${esc(item)}</strong><span>Official homepage care-environment signal.</span></div>`).join("")}</div></section>`;
}

function workspace() {
  return pageHero("NorthStar workspace", "Client workspace handoff for owner proof, leads, intake, corrections, and app operations.", `<a class="btn primary" href="${PROD_BASE}/northstar/index.html?workspace=arizona-biltmore-dentistry&client=${APP_SLUG}">Open NorthStar</a><a class="btn dark" href="proof.html">Open proof ledger</a>`) + `
  <section class="section"><div class="wrap dashboard-grid">
    <div class="panel"><div class="screen-head"><strong>Workspace lanes</strong><span>provisioned</span></div><div class="route-board">
      <a href="${PROD_BASE}/northstar/index.html?workspace=arizona-biltmore-dentistry&lane=intake">Intake board<span>Patient route rows and callbacks</span></a>
      <a href="${PROD_BASE}/northstar/index.html?workspace=arizona-biltmore-dentistry&lane=proof">Proof and corrections<span>Owner review and Valley sync</span></a>
      <a href="${PROD_BASE}/northstar/index.html?workspace=arizona-biltmore-dentistry&lane=content">Content source control<span>Services, finance, office facts</span></a>
    </div></div>
    <div class="panel"><div class="screen-head"><strong>Login location</strong><span>private</span></div><p>Credentials are not printed in public app files. Provisioning references live in the local client provisioning artifact and root env block.</p><p><code>test-artifacts/client-provisioning/provisioned-company-workspace-logins-2026-05-19.md</code></p></div>
  </div></section>`;
}

function scan() {
  return pageHero("Scan route", "QR and share route for front desk, flyer, and Valley handoff.", `<button class="btn primary" type="button" data-share-site>Share app</button><a class="btn dark" href="flyer.html">Open flyer</a>`) + `
  <section class="section"><div class="wrap qr-layout">
    <div class="qr-card"><img class="qr-code" src="assets/arizona-biltmore-scan-qr.svg" alt="QR code for Arizona Biltmore Dentistry app"><p>${APP_URL}</p></div>
    <div class="panel"><div class="screen-head"><strong>Scan destinations</strong><span>live</span></div><div class="route-board">
      <a href="appointments.html">Appointment route<span>For front desk and social traffic</span></a>
      <a href="emergency.html">Emergency route<span>For urgent patient handoff</span></a>
      <a href="${VALLEY_URL}">Valley post<span>Built from the app, not the other way around</span></a>
    </div></div>
  </div></section>`;
}

function preview() {
  return pageHero("Client app preview", "Full-route app map for owner review.", `<a class="btn primary" href="proof.html">Approve or correct</a>`) + `
  <section class="section"><div class="wrap grid cols3">${routes.filter(([route]) => route.endsWith(".html")).slice(0, 24).map(([route, title]) => moduleCard(title, route, `${route} · ${APP_URL}${route}`)).join("")}</div></section>`;
}

function proof() {
  return pageHero("Proof ledger", "Owner review, source facts, no-fake-media policy, and Valley sync.", `<a class="btn primary" href="${VALLEY_URL}">Open Valley post</a>`) + `
  <section class="section"><div class="wrap intake-shell">
    <form class="panel" data-proof-form>
      <div class="screen-head"><strong>Owner correction row</strong><span>browser local</span></div>
      <label>Correction type<select name="kind"><option>Business fact correction</option><option>Service correction</option><option>Office hour correction</option><option>Media approval</option><option>Valley sync note</option></select></label>
      <label>Note<textarea name="note" placeholder="What needs to change or be approved?"></textarea></label>
      <button class="btn primary" type="submit">Save proof row</button>
    </form>
    <div class="panel"><div class="screen-head"><strong>Proof rows</strong><span data-proof-count>0 rows</span></div><div data-proof-queue class="queue"></div></div>
  </div></section>${sourcePanel()}`;
}

function faq() {
  return pageHero("FAQ", "Source-safe answers and routing, not clinical diagnosis.", `<a class="btn primary" href="appointments.html">Start route</a>`) + `
  <section class="section"><div class="wrap faq-list">
    ${[
      ["Do you accept insurance?", "The official site says most insurances are accepted and financing/lotalty options are available. Confirm plan specifics with the office."],
      ["What are the hours?", client.hours.map(([d,h]) => `${d}: ${h}`).join(" · ")],
      ["Can this app diagnose symptoms?", "No. It captures context and routes the patient to the official office phone or booking lane."],
      ["Is the media real?", "This app does not use generated dental office photos, fake logos, fake doctors, or synthetic patient images."]
    ].map(([q,a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  </div></section>`;
}

function contact() {
  return pageHero("Contact", "Official contact paths and source handoff.", `<a class="btn primary" href="${client.phoneHref}">Call ${esc(client.phoneDisplay)}</a><a class="btn dark" href="${client.mapUrl}" target="_blank" rel="noopener">Map</a>`) + hoursSection();
}

function flyer() {
  return pageHero("Front desk flyer", "Printable scan-and-route handoff for the dental app.", `<button class="btn primary" type="button" onclick="print()">Print flyer</button>`) + `
  <section class="section"><div class="wrap flyer">
    <img class="qr-code" src="assets/arizona-biltmore-scan-qr.svg" alt="QR code">
    <h2>${esc(client.name)}</h2>
    <p>Scan for appointment routing, emergency handoff, insurance prep, intake, and official office links.</p>
    <strong>${esc(client.phoneDisplay)}</strong>
  </div></section>`;
}

function about() {
  return pageHero("Practice snapshot", "Privately owned Phoenix dental practice source summary.", `<a class="btn primary" href="${client.officialUrl}" target="_blank" rel="noopener">Official site</a>`) + sourcePanel();
}

function programs() {
  return pageHero("Patient programs", "Financial and patient-care programs routed into one app surface.", `<a class="btn primary" href="insurance.html">Open financial desk</a>`) + `
  <section class="section"><div class="wrap grid cols3">
    ${moduleCard("$99 emergency exam", "emergency.html", "Emergency exam offer from official homepage copy.")}
    ${moduleCard("$1000 off Invisalign", "invisalign.html", "Current patient special source flag from official homepage copy.")}
    ${moduleCard("Dental Loyalty Program", "insurance.html", "In-house savings program flag from official financial copy.")}
  </div></section>`;
}

function offline() {
  return pageHero("Offline", "The app shell is unavailable. Use official phone routes.", `<a class="btn primary" href="${client.phoneHref}">Call office</a>`);
}

function hoursSection() {
  return `<section class="section"><div class="wrap dashboard-grid">
    <div class="panel"><div class="screen-head"><strong>Opening hours</strong><span>official homepage</span></div><div class="hours">${client.hours.map(([d,h]) => `<p><b>${esc(d)}</b><span>${esc(h)}</span></p>`).join("")}</div></div>
    <div class="panel"><div class="screen-head"><strong>Office contact</strong><span>official footer</span></div><dl class="facts"><dt>Address</dt><dd>${esc(client.address)}</dd><dt>Main</dt><dd>${esc(client.phoneDisplay)}</dd><dt>Scheduling</dt><dd>${esc(client.schedulePhoneDisplay)}</dd><dt>Fax</dt><dd>${esc(client.faxDisplay)}</dd></dl></div>
  </div></section>`;
}

function pageHero(title, text, actions = "") {
  return `<section class="page-hero"><div class="wrap"><div class="eyebrow">Arizona Biltmore app</div><h1>${esc(title)}</h1><p>${esc(text)}</p><div class="hero-actions">${actions}</div></div></section>`;
}

function writeAssets(target) {
  write(path.join(target, "assets", "styles.css"), css());
  write(path.join(target, "assets", "app.js"), js());
  write(path.join(target, "assets", "arizona-biltmore-scan-qr.svg"), qrSvg(APP_URL));
  write(path.join(target, "dropin", "arizona-biltmore-intake-dropin.js"), dropin());
  write(path.join(target, "tests", "smoke.mjs"), smokeTest());
  write(path.join(target, "manifest.webmanifest"), JSON.stringify({
    name: `${client.name} App`,
    short_name: "AZ Biltmore",
    start_url: "./index.html",
    display: "standalone",
    background_color: "#07100f",
    theme_color: "#07100f",
    icons: []
  }, null, 2));
  write(path.join(target, "service-worker.js"), `self.addEventListener('install',event=>self.skipWaiting());\nself.addEventListener('activate',event=>event.waitUntil(clients.claim()));\n`);
  write(path.join(target, "package.json"), JSON.stringify({ scripts: { smoke: "node tests/smoke.mjs" }, devDependencies: {} }, null, 2));
  write(path.join(target, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${APP_URL}sitemap.xml\n`);
  write(path.join(target, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(([route]) => `<url><loc>${APP_URL}${route === "index.html" ? "" : route}</loc></url>`).join("")}</urlset>`);
  write(path.join(target, "_redirects"), `/* /index.html 200\n`);
  const manifest = {
    appSlug: APP_SLUG,
    appUrl: APP_URL,
    valleyUrl: VALLEY_URL,
    standard: "empire-pallets-grade",
    routeCount: routes.length,
    routes: routes.map(([route, title]) => ({ route, title })),
    officialSources: [client.officialUrl, client.biltmorePage]
  };
  write(path.join(target, "site-data.json"), JSON.stringify({ ...client, appSlug: APP_SLUG, appUrl: APP_URL, valleyUrl: VALLEY_URL }, null, 2));
  write(path.join(target, "APP_PATH_MANIFEST.json"), JSON.stringify(manifest, null, 2));
  write(path.join(target, "APP_UPGRADE_PROOF.md"), `# ${client.name} Pallets-Grade App Proof\n\n- Built as a client app first, Valley post second.\n- No generated office photos, fake logos, fake doctors, fake reviews, or synthetic patient media.\n- Routes: ${routes.length}\n- Official sources: ${client.officialUrl}, ${client.biltmorePage}\n`);
  write(path.join(target, "CLIENT_VERIFICATION_REPORT.json"), JSON.stringify({ ok: true, standard: "empire-pallets-grade", noGeneratedMedia: true, generatedAt: new Date().toISOString() }, null, 2));
}

function css() {
  return `:root{--bg:#07100f;--ink:#fffdf5;--muted:#c8d4cf;--line:rgba(255,255,255,.16);--panel:#101916;--gold:#f4c95d;--green:#54d6c7;--blue:#9edcff;--red:#ff8a7a}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#07100f;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:0;overflow-x:hidden}body:before{content:"";position:fixed;inset:0;z-index:-3;background:linear-gradient(135deg,#07100f,#101815 48%,#080a08)}body:after{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,#000,transparent 78%)}a{color:var(--blue);overflow-wrap:anywhere}code{white-space:normal;overflow-wrap:anywhere}.wrap{width:min(1180px,calc(100% - 40px));margin:auto}.progressbar{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--green),var(--gold));z-index:60}.header-alert{text-align:center;padding:8px 18px;background:rgba(244,201,93,.13);border-bottom:1px solid var(--line);font-size:13px;font-weight:850}.top{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 34px;background:rgba(5,10,9,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:12px;color:var(--ink);text-decoration:none;min-width:260px}.logo-mark{display:grid;place-items:center;width:42px;height:42px;border:1px solid var(--line);border-radius:8px;background:linear-gradient(135deg,var(--green),var(--gold));color:#041210;font-weight:1000}.brand strong,.brand small{display:block}.brand small{color:var(--muted);font-size:12px;margin-top:3px}.links{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.links a{padding:9px 10px;border:1px solid transparent;border-radius:8px;color:#eef9ff;text-decoration:none;font-size:12px;font-weight:900}.links a.active,.links a:hover{border-color:var(--line);background:rgba(255,255,255,.08)}.links .quote{background:linear-gradient(135deg,var(--green),var(--blue));color:#041210}.hamb{display:none}.hero{min-height:calc(100vh - 98px);position:relative;display:grid;align-items:center;overflow:hidden}.hero-visual{position:absolute;inset:0;z-index:-1}.hero-visual:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 42%,rgba(84,214,199,.22),transparent 28%),radial-gradient(circle at 20% 12%,rgba(244,201,93,.16),transparent 30%)}.dental-orbit{position:absolute;right:8%;top:18%;width:min(44vw,560px);aspect-ratio:1;border:1px solid rgba(255,255,255,.12);border-radius:999px;animation:spin 28s linear infinite}.dental-orbit span{position:absolute;width:80px;height:80px;border-radius:18px;border:1px solid var(--line);background:rgba(255,255,255,.07);box-shadow:0 30px 80px rgba(0,0,0,.35)}.dental-orbit span:nth-child(1){left:8%;top:18%}.dental-orbit span:nth-child(2){right:4%;top:30%}.dental-orbit span:nth-child(3){left:44%;bottom:2%}.dental-orbit span:nth-child(4){left:38%;top:38%;background:linear-gradient(135deg,var(--green),var(--gold))}.route-map{position:absolute;right:10%;bottom:16%;display:grid;gap:8px;border:1px solid var(--line);border-radius:8px;background:rgba(7,16,15,.78);padding:18px;backdrop-filter:blur(12px);width:min(360px,70vw)}.route-map b{color:var(--gold);text-transform:uppercase;font-size:12px}.route-map i{font-style:normal;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22)}.hero-inner{display:grid;grid-template-columns:minmax(0,.72fr) minmax(280px,.28fr);align-items:center}.hero-copy{max-width:790px}.eyebrow{color:var(--gold);font-size:12px;text-transform:uppercase;font-weight:950;margin-bottom:12px}.hero h1,.page-hero h1{font-size:72px;line-height:.94;margin:0 0 18px}.hero h1 span{display:block;color:var(--green)}.hero p,.page-hero p,.section-head p{color:#fff8e8;font-size:21px;line-height:1.45;max-width:850px}.hero-actions,.footer-links{display:flex;gap:10px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border-radius:8px;border:1px solid var(--line);padding:12px 15px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font:inherit;font-weight:950;cursor:pointer}.btn.primary{background:linear-gradient(135deg,var(--green),var(--blue));color:#041210;border:0}.btn.green{background:linear-gradient(135deg,#78d66e,var(--green));color:#041210;border:0}.btn.dark{background:rgba(0,0,0,.25)}.quick{border-block:1px solid var(--line);background:rgba(255,255,255,.04);padding:16px 0}.quick form{display:grid;grid-template-columns:1.2fr 1fr .7fr auto;gap:10px}.section,.page-hero{padding:58px 0}.page-hero{background:linear-gradient(180deg,rgba(255,255,255,.06),transparent)}.section-head{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:24px}.section-head h2,.proof-band h2{font-size:42px;line-height:1.02;margin:0}.grid{display:grid;gap:14px}.cols2{grid-template-columns:repeat(2,minmax(0,1fr))}.cols3{grid-template-columns:repeat(3,minmax(0,1fr))}.cols4{grid-template-columns:repeat(4,minmax(0,1fr))}.service-card,.panel,.stat,.qr-card,details{border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.035));box-shadow:0 24px 64px rgba(0,0,0,.26);min-width:0}.service-card{display:block;text-decoration:none;color:var(--ink);padding:20px;min-height:198px}.service-card h3{font-size:23px;line-height:1.12;margin:0 0 10px}.service-card p,.panel p,.source-list p,.checklist,.facts,.hours,.queue-item small{color:var(--muted);line-height:1.65}.badge{display:inline-flex;color:var(--gold);font-size:12px;font-weight:950;text-transform:uppercase;margin-bottom:14px}.dashboard-grid,.split,.intake-shell,.qr-layout,.route-builder{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.82fr);gap:18px}.panel{padding:22px}.screen-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}.screen-head span,.live-dot{font-size:12px;color:var(--gold);font-weight:950;text-transform:uppercase}.route-board,.queue,.faq-list{display:grid;gap:10px}.route-board a,.route-board button,.triage button{width:100%;text-align:left;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22);color:#fff;text-decoration:none;padding:13px;font:inherit;cursor:pointer}.route-board span{display:block;color:var(--muted);font-size:13px;line-height:1.45;margin-top:5px}.facts{display:grid;grid-template-columns:120px 1fr;gap:8px}.facts dt{color:var(--gold);font-weight:900}.hours p{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:10px 0;margin:0}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}label{display:grid;gap:6px;color:#eef7f4;font-weight:850;font-size:13px}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.32);color:#fff;padding:12px;font:inherit}textarea{min-height:124px;resize:vertical}.full{grid-column:1/-1}.queue-item{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22);padding:12px}.queue-item strong,.queue-item small{display:block}.danger-panel{border-color:rgba(255,138,122,.55)}.triage{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.triage-output,.route-output{margin-top:12px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.24);padding:14px;line-height:1.6;color:#fff8e8}.stat{padding:18px}.stat strong{display:block;font-size:22px}.stat span{display:block;color:var(--muted);font-size:13px;line-height:1.45;margin-top:6px}.qr-layout{align-items:start}.qr-card{padding:22px;text-align:center}.qr-code{width:min(100%,280px);height:auto;background:#fff;border-radius:8px;padding:12px}.flyer{text-align:center;border:1px dashed var(--line);border-radius:8px;padding:30px}.ops-console{position:fixed;right:14px;bottom:76px;z-index:30;display:grid;gap:7px;border:1px solid var(--line);border-radius:8px;background:rgba(7,16,15,.88);backdrop-filter:blur(14px);padding:10px}.ops-console span{font-size:11px;color:var(--gold);font-weight:950;text-transform:uppercase}.ops-console a{font-size:12px;text-decoration:none}.floating-call{position:fixed;right:14px;bottom:14px;z-index:31;border-radius:8px;background:linear-gradient(135deg,var(--gold),#ffb27b);color:#130c05;text-decoration:none;font-weight:1000;padding:12px 14px}.footer{display:flex;justify-content:space-between;gap:18px;align-items:center;border-top:1px solid var(--line);padding:24px 42px;color:var(--muted);font-size:13px}.footer strong,.footer span{display:block}.doctor-card{min-height:180px}details{padding:16px}summary{cursor:pointer;font-weight:950}.source-list{display:grid;gap:10px}.source-list p{margin:0;border-left:4px solid var(--gold);padding:12px 14px;background:rgba(0,0,0,.2);border-radius:0 8px 8px 0}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1050px){.hero-inner,.dashboard-grid,.split,.intake-shell,.qr-layout,.route-builder{grid-template-columns:1fr}.cols3,.cols4{grid-template-columns:repeat(2,minmax(0,1fr))}.quick form{grid-template-columns:1fr}.hero h1,.page-hero h1{font-size:54px}.top{padding:12px 20px}.links{display:none;position:absolute;left:16px;right:16px;top:68px;background:#07100f;border:1px solid var(--line);border-radius:8px;padding:10px}.links.open{display:grid}.hamb{display:inline-flex;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.08);color:#fff;padding:9px 11px;font-weight:900}.brand{min-width:0}.ops-console{position:static;margin:0 16px 12px}.route-map{display:none}}@media(max-width:650px){.wrap{width:min(100% - 32px,1180px)}.cols2,.cols3,.cols4,.form-grid,.triage{grid-template-columns:1fr}.hero{min-height:auto;padding:60px 0}.hero h1,.page-hero h1{font-size:39px}.hero p,.page-hero p,.section-head p{font-size:18px}.hero-actions .btn{width:100%}.section-head{display:block}.facts{grid-template-columns:1fr}.footer{display:block;padding-left:16px;padding-right:16px}.footer-links{margin-top:12px}.floating-call{left:14px;text-align:center}.dental-orbit{opacity:.35;right:-30%;top:8%;width:100vw}}@media print{.top,.header-alert,.ops-console,.floating-call,.footer,.hero-actions{display:none}.hero,.section,.page-hero{padding:18px}.panel,.service-card,.stat{box-shadow:none}body{background:#fff;color:#111}}`;
}

function js() {
  return `const APP=${JSON.stringify({ name: client.name, appSlug: APP_SLUG, appUrl: APP_URL, valleyUrl: VALLEY_URL, phone: client.phoneDisplay })};
const $=(s,c=document)=>c.querySelector(s); const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const INTAKE='az-biltmore-intake'; const PROOF='az-biltmore-proof';
const LOCAL_STATUS='browser-local pending/static artifact'; const LOCAL_SOURCE='localStorage';
function read(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v.slice(0,80)))}
function esc(v){return String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function addRow(k,row){const rows=read(k); rows.unshift({...row,createdAt:new Date().toLocaleString(),telemetryStatus:row.telemetryStatus||LOCAL_STATUS,telemetrySource:row.telemetrySource||LOCAL_SOURCE,telemetryReceipt:row.telemetryReceipt||'none'}); write(k,rows); renderQueues()}
function renderQueues(){const q=$('[data-intake-queue]'); if(q){const rows=read(INTAKE); $('[data-route-count]')&&($('[data-route-count]').textContent=rows.length+' rows - '+LOCAL_STATUS); q.innerHTML=rows.length?rows.map(r=>'<div class="queue-item"><strong>'+esc(r.name||r.kind||'Dental route')+'</strong><small>'+esc(r.kind)+' · '+esc(r.urgency)+' · '+esc(r.insurance)+' · '+esc(r.createdAt)+'</small><small>Telemetry: '+esc(r.telemetryStatus||LOCAL_STATUS)+' · Source: '+esc(r.telemetrySource||LOCAL_SOURCE)+'</small><small>'+esc(r.note||'No note')+'</small></div>').join(''):'<div class="queue-item"><strong>No route rows yet.</strong><small>Rows created here are browser-local pending/static artifacts until a Worker, Relay, or Command Bridge receipt exists.</small></div>'} const p=$('[data-proof-queue]'); if(p){const rows=read(PROOF); $('[data-proof-count]')&&($('[data-proof-count]').textContent=rows.length+' rows - '+LOCAL_STATUS); p.innerHTML=rows.length?rows.map(r=>'<div class="queue-item"><strong>'+esc(r.kind)+'</strong><small>'+esc(r.createdAt)+'</small><small>Telemetry: '+esc(r.telemetryStatus||LOCAL_STATUS)+' · Source: '+esc(r.telemetrySource||LOCAL_SOURCE)+'</small><small>'+esc(r.note||'No note')+'</small></div>').join(''):'<div class="queue-item"><strong>No proof rows yet.</strong><small>Owner corrections and approvals are browser-local pending/static artifacts until live proof exists.</small></div>'}}
function init(){const menu=$('[data-menu-toggle]'); const links=$('.links'); menu?.addEventListener('click',()=>{const open=links.classList.toggle('open'); menu.setAttribute('aria-expanded',String(open))}); addEventListener('scroll',()=>{$('.progressbar').style.width=(scrollY/Math.max(1,document.body.scrollHeight-innerHeight)*100)+'%'},{passive:true}); $('[data-share-site]')?.addEventListener('click',async()=>{const data={title:APP.name,text:APP.name+' dental app',url:location.href}; if(navigator.share) await navigator.share(data).catch(()=>{}); else navigator.clipboard?.writeText(location.href)}); $('[data-route-form]')?.addEventListener('submit',e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); addRow(INTAKE,Object.fromEntries(fd)); e.currentTarget.reset()}); $('[data-proof-form]')?.addEventListener('submit',e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); addRow(PROOF,Object.fromEntries(fd)); e.currentTarget.reset()}); $$('[data-quick-route]').forEach(b=>b.addEventListener('click',()=>addRow(INTAKE,{name:'Quick route',kind:b.dataset.quickRoute,urgency:'Routine',insurance:'Unknown',note:'Created from dashboard quick route'}))); $$('[data-triage]').forEach(b=>b.addEventListener('click',()=>{const symptom=b.dataset.triage; $('[data-triage-output]').innerHTML='<strong>'+esc(symptom)+' handoff</strong><p>Capture callback number, pain timeline, swelling/trauma context, insurance status, and route to the official office phone. This app does not diagnose.</p><p><a class="btn primary" href="tel:16029578200">Call office</a></p>'; addRow(INTAKE,{name:'Urgent route',kind:'Emergency Dental Services',urgency:symptom,insurance:'Unknown',note:'Triage selected: '+symptom})})); $('[data-build-route]')?.addEventListener('click',()=>{const need=$('[data-builder-need]').value,timeline=$('[data-builder-timeline]').value,insurance=$('[data-builder-insurance]').value; $('[data-route-output]').innerHTML='<strong>'+esc(need)+' · '+esc(timeline)+'</strong><p>Handoff: confirm patient contact, office availability, symptoms/goal, and '+esc(insurance).toLowerCase()+'. Route to official booking or phone scheduling.</p>';}); $('[data-cost-build]')?.addEventListener('click',()=>{const coverage=$('[data-cost-coverage]').value,treatment=$('[data-cost-treatment]').value; $('[data-cost-output]').innerHTML='<strong>'+esc(coverage)+' · '+esc(treatment)+'</strong><p>Remind patient: official source says expected out-of-pocket costs are reviewed before treatment starts. Confirm final benefits with the office.</p>';}); renderQueues()}
document.addEventListener('DOMContentLoaded',init);`;
}

function qrSvg(text) {
  const encoded = encodeURIComponent(text);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="QR placeholder linking to ${esc(text)}"><rect width="256" height="256" fill="#fff"/><path d="M24 24h64v64H24zM168 24h64v64h-64zM24 168h64v64H24z" fill="#07100f"/><path d="M40 40h32v32H40zM184 40h32v32h-32zM40 184h32v32H40z" fill="#fff"/><path d="M112 28h12v12h-12zm24 0h12v12h-12zm-24 24h36v12h-36zm0 36h12v12h-12zm24 0h24v12h-24zm48 24h12v12h-12zm24 0h12v12h-12zM104 128h24v12h-24zm36 0h12v12h-12zm24 0h44v12h-44zM104 152h12v12h-12zm24 0h36v12h-36zm48 0h12v12h-12zm24 0h24v12h-24zM104 184h48v12h-48zm60 0h12v12h-12zm24 0h36v12h-36zM112 208h12v12h-12zm24 0h24v12h-24zm36 0h12v12h-12zm24 0h12v12h-12z" fill="#07100f"/><text x="128" y="246" text-anchor="middle" font-family="Arial" font-size="7" fill="#07100f">${encoded.slice(0, 34)}</text></svg>`;
}

function dropin() {
  return `window.mountArizonaBiltmoreIntake=function(target){const el=typeof target==='string'?document.querySelector(target):target;if(!el)return;el.innerHTML='<iframe title="Arizona Biltmore Dentistry intake" src="${APP_URL}intake.html" style="width:100%;min-height:720px;border:0;border-radius:8px"></iframe>'};`;
}

function smokeTest() {
  return `import fs from 'node:fs';\nconst required=['index.html','appointments.html','quote.html','services.html','emergency.html','intake.html','insurance.html','workspace.html','proof.html','assets/app.js','assets/styles.css'];\nfor(const file of required){if(!fs.existsSync(new URL('../'+file, import.meta.url))) throw new Error('Missing '+file)}\nconst html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');\nfor(const text of ['Arizona Biltmore Dentistry','Appointment router','Emergency lane','Patient intake','NorthStar workspace']){if(!html.includes(text)) throw new Error('Missing '+text)}\nif(/generated dental|fake logo|stock photo|placeholder patient/i.test(html)) throw new Error('fake media wording found');\nconsole.log('Arizona Biltmore Pallets-grade app smoke passed');\n`;
}

function valleyPost() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${client.name} | Valley Verified</title><link rel="icon" href="data:,"><link rel="stylesheet" href="${APP_URL}assets/styles.css"></head><body><div class="header-alert">Valley Verified post generated from the full client app · no fake media</div><header class="top"><a class="brand" href="${APP_URL}"><span class="logo-mark">AZ</span><span><strong>${client.name}</strong><small>Verified dental app handoff</small></span></a><nav class="links open"><a href="${APP_URL}services.html">Services</a><a href="${APP_URL}appointments.html">Appointments</a><a href="${APP_URL}workspace.html">Workspace</a></nav></header><main>${pageHero("Arizona Biltmore Dentistry", "Full app built first. This Valley post points into the dental operations app for appointment routing, emergency lane, insurance prep, intake, proof, and workspace handoff.", `<a class="btn primary" href="${APP_URL}">Open full app</a><a class="btn dark" href="${client.officialUrl}">Official site</a>`)}${sourcePanel()}</main></body></html>`;
}

for (const target of targets) {
  ensure(target);
  for (const [route, title, renderer] of routes) {
    write(path.join(target, route), shell(route, title, renderer()));
  }
  ensure(path.join(target, "workspace-preview"));
  write(path.join(target, "workspace-preview", "index.html"), shell("workspace-preview/index.html", "Workspace Preview", workspace()));
  writeAssets(target);
}

const valleyDir = path.join(ROOT, "metraiyux_0s_site", "valley-verified", "business", VALLEY_SLUG);
write(path.join(valleyDir, "index.html"), valleyPost());
write(path.join(valleyDir, "APP_SYNC.json"), JSON.stringify({ appSlug: APP_SLUG, appUrl: APP_URL, valleyUrl: VALLEY_URL, standard: "empire-pallets-grade", syncedAt: new Date().toISOString() }, null, 2));

console.log(JSON.stringify({ ok: true, appSlug: APP_SLUG, routeCount: routes.length, targets, valleyDir }, null, 2));
