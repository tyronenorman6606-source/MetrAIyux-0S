import fs from "fs";
import path from "path";

const root = "/workspaces/MetrAIyux-0S";
const siteRoot = path.join(root, "metraiyux_0s_site");
const factoryRoot = path.join(root, "client-app-factory/client-apps");
const liveFactoryRoot = path.join(siteRoot, "client-app-factory/client-apps");
const skyeClientsRoot = path.join(root, "Skye-Clients");
const valleyRoot = path.join(siteRoot, "valley-verified/business");
const valleySourceRoot = path.join(siteRoot, "_platform-sources/valley-verified/dist/business");
const productionOrigin = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const valleySourceUrl = "https://business.phoenixchamber.com/list/ql/health-care-11";

const clients = [
  {
    name: "Arizona Biltmore Dentistry",
    appSlug: "arizona-biltmore-dentistry",
    valleySlug: "arizona-biltmore-dentistry-phoenix-85016-d406e26",
    workspaceSlug: "arizona-biltmore-dentistry-phoenix-85016-d406e26",
    category: "General, family, cosmetic, and implant dentistry",
    officialUrl: "https://www.arizonabiltmoredentistry.com/",
    sourceUrl: "https://www.arizonabiltmoredentistry.com/",
    bookingUrl: "https://www.arizonabiltmoredentistry.com/",
    phone: "(602) 957-8200",
    phoneHref: "+16029578200",
    address: "2777 E Camelback Road, Ste. 101, Phoenix, AZ 85016",
    city: "Phoenix",
    hours: ["Monday to Thursday 7 AM - 5 PM", "Friday 7 AM - 4 PM", "Saturday 7 AM - 2 PM"],
    officialNotes: [
      "Official site lists Arizona Biltmore Dentistry at 2777 E Camelback Road, Ste. 101, Phoenix, AZ 85016.",
      "Official site lists services across cosmetic dentistry, general dentistry, family dentistry, dental implants, teeth straightening, emergency dental service, sleep apnea services, and sedation dentistry.",
      "Official site lists financial options including insurance, payment plans, and a dental loyalty plan."
    ],
    people: ["Dr. Aaron Jeziorski", "Dr. Michael Hood"],
    services: [
      ["General dentistry", "Restorative dentistry, root canal therapy, dentures, hygiene visits, and whole-mouth care paths."],
      ["Cosmetic dentistry", "Teeth whitening, smile makeover options, veneers, and other cosmetic service routes listed by the practice."],
      ["Dental implants", "Single-tooth implants, All-on-4, and missing-tooth consultation paths."],
      ["Teeth straightening", "Clear aligners, ClearCorrect, CandidPro, and Invisalign promotion handling."],
      ["Emergency and comfort care", "Emergency dental service, sedation dentistry, sleep apnea services, and post-op instruction routing."]
    ],
    modules: [
      ["Appointment triage", "Direct patients to official booking/call routes while capturing local arrival context in NorthStar."],
      ["Treatment follow-up", "Organize requested follow-ups by service line, urgency, and patient note."],
      ["Financial handoff", "Send insurance, payment-plan, and dental loyalty plan questions to the correct office route."],
      ["Owner proof queue", "Keep proof, media approval, and listing corrections separate from patient-facing claims."]
    ],
    alert: "Official source lists broad family, cosmetic, implant, straightening, emergency, sleep apnea, and sedation services. Owner proof still required for Valley Verified language.",
    accent: "#58d6c7",
    accent2: "#f5d36a"
  },
  {
    name: "Dental Depot Orthodontics",
    appSlug: "dental-depot-orthodontics-phoenix",
    valleySlug: "dental-depot-orthodontics-phoenix-85053-c0fa26f",
    workspaceSlug: "dental-depot-orthodontics-phoenix-85053-c0fa26f",
    category: "Orthodontics for kids and adults",
    officialUrl: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    sourceUrl: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    bookingUrl: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    phone: "(602) 845-8653",
    phoneHref: "+16028458653",
    address: "3730 W. Greenway Rd, Phoenix, AZ 85053",
    city: "Phoenix",
    hours: ["Monday-Thursday 8:00 AM - 4:00 PM"],
    officialNotes: [
      "Official Dental Depot Arizona page lists the Phoenix orthodontics office at 3730 W. Greenway Rd, Phoenix, AZ 85053; the Valley/Chamber source lists 3750 W. Greenway Rd, so this app flags the address discrepancy for owner verification.",
      "Official page describes traditional braces and Invisalign as orthodontic service paths.",
      "Official page identifies Dental Depot Phoenix Orthodontics as a new home east of the intersection of 39th Avenue and Greenway Road."
    ],
    people: ["Dr. James Zhong"],
    services: [
      ["Orthodontic consultations", "New patient consult routing for alignment goals, bite questions, and treatment readiness."],
      ["Traditional braces", "Braces interest intake, appointment prep, and follow-up routing."],
      ["Invisalign", "Clear aligner interest intake and official schedule handoff."],
      ["Orthodontics for kids", "Parent/guardian notes, child visit prep, and consent-aware front-office routing."],
      ["Orthodontics for adults", "Adult consult routing, finance questions, and treatment expectation notes."]
    ],
    modules: [
      ["Consult queue", "Separate braces, Invisalign, kids, and adult orthodontic inquiries."],
      ["Payment question routing", "Capture financing/payment-plan questions without making unsupported pricing claims."],
      ["Address verification", "Show the official-site address and flag the public source discrepancy before production hardening."],
      ["Owner proof queue", "Keep claim, corrections, and approved media out of the patient intake lane."]
    ],
    alert: "Official source lists orthodontics, braces, Invisalign, kids/adult care, Dr. James Zhong, and Monday-Thursday hours. Address needs owner confirmation because public sources disagree.",
    accent: "#6db7ff",
    accent2: "#f5d36a"
  },
  {
    name: "General Dentistry 4 Kids",
    appSlug: "general-dentistry-4-kids-phoenix",
    valleySlug: "general-dentistry-4-kids-phoenix-85032-237e895",
    workspaceSlug: "general-dentistry-4-kids-phoenix-85032-237e895",
    category: "Pediatric dental care",
    officialUrl: "https://gd4kphx.com/contact-us",
    sourceUrl: "https://gd4kphx.com/contact-us",
    bookingUrl: "https://gd4kphx.com/contact-us",
    phone: "(602) 996-6065",
    phoneHref: "+16029966065",
    email: "contact@gd4kphx.com",
    address: "3202 Greenway Rd. Suite #1287, Phoenix, AZ 85032",
    city: "Phoenix",
    hours: ["Hours not listed on the source page checked; call the office before presenting hours."],
    officialNotes: [
      "Official contact page lists 3202 Greenway Rd. Suite #1287, Phoenix, AZ 85032, contact@gd4kphx.com, and (602) 996-6065.",
      "Official navigation lists dental exams, teeth cleaning, dental sealant, fillings, crowns, pulpal therapy, tooth extraction, space maintainers, silver diamine fluoride, nitrous oxide, moderate sedation, and general anesthesia.",
      "Official patient center links include insurance, dental discount plan, Medicaid dental care, TriCare dental program, online check-in, office policies, and notice of privacy practices."
    ],
    people: ["General Dentistry 4 Kids care team"],
    services: [
      ["Dental exams and cleaning", "Routine pediatric dental visit routing and parent/guardian notes."],
      ["Preventive treatment", "Dental sealant, silver diamine fluoride, space maintainer, and hygiene follow-up paths."],
      ["Restorative treatment", "Fillings, crowns, pulpal therapy, and tooth extraction intake routing."],
      ["Sedation methods", "Nitrous oxide, moderate sedation, and general anesthesia question routing to the office."],
      ["Patient center", "Insurance, Medicaid, TriCare, discount plan, online check-in, and policy handoffs."]
    ],
    modules: [
      ["Parent check-in", "Collect guardian name, child visit context, and office handoff notes."],
      ["Treatment option routing", "Separate exams, cleaning, preventive, restorative, and sedation questions."],
      ["Insurance/Medicaid handoff", "Route plan questions to official office contact without inventing coverage language."],
      ["Owner proof queue", "Keep media, listing corrections, and verified claims pending until owner approval."]
    ],
    alert: "Official source supports pediatric dental services, patient-center resources, email, phone, and address. Hours were not listed on the checked source page.",
    accent: "#72e0b8",
    accent2: "#ff8aa1"
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl(client) {
  return `${productionOrigin}/client-app-factory/client-apps/${client.appSlug}/`;
}

function workspaceUrl(client) {
  return `${productionOrigin}/northstar/index.html?workspace=${client.workspaceSlug}`;
}

function valleyUrl(client) {
  return `${productionOrigin}/valley-verified/business/${client.valleySlug}/`;
}

function pageShell(client, title, description, active, body, extraHead = "", canonicalUrl = appUrl(client), assetPrefix = "") {
  const nav = [
    ["Home", "index.html"],
    ["Services", "services.html"],
    ["Intake", "intake.html"],
    ["Office", "office.html"],
    ["Financial", "financial.html"],
    ["Workspace", "workspace.html"],
    ["FAQ", "faq.html"]
  ].map(([label, href]) => `<a class="${active === label ? "active" : ""}" href="${href}">${label}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#07100f">
<link rel="manifest" href="${assetPrefix}manifest.webmanifest">
<link rel="canonical" href="${canonicalUrl}">
<link rel="stylesheet" href="${assetPrefix}assets/styles.css">
${extraHead}
<script defer src="${assetPrefix}assets/app.js"></script>
</head>
<body style="--accent:${client.accent};--accent2:${client.accent2}" data-client="${client.appSlug}" data-workspace="${client.workspaceSlug}">
<header class="app-top">
  <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true"></span><strong>${esc(client.name)}<small>${esc(client.category)}</small></strong></a>
  <button class="menu-button" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>
  <nav id="site-nav" class="site-nav">${nav}</nav>
</header>
<main>${body}</main>
<footer class="footer">
  <div><strong>${esc(client.name)}</strong><span>${esc(client.address)} · ${esc(client.phone)}</span></div>
  <div class="footer-links"><a href="${client.officialUrl}" target="_blank" rel="noopener">Official site</a><a href="${workspaceUrl(client)}">NorthStar workspace</a><a href="${valleyUrl(client)}">Valley post</a></div>
</footer>
</body>
</html>`;
}

function styles() {
  return `:root{--bg:#07100f;--panel:#101917;--panel2:#131f1d;--text:#fffdf5;--muted:#c8cfc8;--line:rgba(255,255,255,.16);--accent:#58d6c7;--accent2:#f5d36a;--danger:#ff8a7a}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:linear-gradient(180deg,#06100f,#050807 58%,#0b100d);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:0;overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(115deg,color-mix(in srgb,var(--accent) 18%,transparent),transparent 30%),linear-gradient(250deg,color-mix(in srgb,var(--accent2) 15%,transparent),transparent 34%)}
a{color:#9edcff;text-underline-offset:3px}
.app-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;justify-content:space-between;padding:14px 42px;background:rgba(5,10,9,.88);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text);min-width:0}
.brand-mark{width:16px;height:16px;border-radius:4px;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 0 22px color-mix(in srgb,var(--accent) 50%,transparent)}
.brand strong{display:block;font-size:16px;line-height:1.05}.brand small{display:block;color:var(--muted);font-size:12px;font-weight:700;margin-top:3px}
.site-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.site-nav a{font-size:13px;font-weight:900;text-decoration:none;color:#eaf8ff;border:1px solid transparent;border-radius:8px;padding:9px 10px}.site-nav a.active,.site-nav a:hover{border-color:var(--line);background:rgba(255,255,255,.08)}
.menu-button{display:none}
.hero{min-height:calc(100vh - 72px);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:28px;align-items:center;padding:64px 70px}
.eyebrow{text-transform:uppercase;font-size:12px;font-weight:950;color:var(--accent2);margin:0 0 12px}
h1,h2,h3,p{letter-spacing:0}h1{font-size:76px;line-height:.98;margin:0 0 18px;max-width:940px}h1 span{display:block;color:var(--accent)}h2{font-size:46px;line-height:1.04;margin:0 0 14px}h3{font-size:22px;line-height:1.15;margin:0 0 10px}.lede{font-size:24px;line-height:1.35;color:#fff8e8;max-width:820px}.copy{color:var(--muted);line-height:1.75;font-size:16px;max-width:820px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border-radius:8px;border:1px solid var(--line);padding:12px 15px;background:rgba(255,255,255,.07);color:#f5fbff;text-decoration:none;font-weight:950}.btn.primary{background:linear-gradient(135deg,var(--accent),#9edcff);color:#041210;border:0}.btn.warn{background:linear-gradient(135deg,var(--accent2),#ffb27b);color:#140c05;border:0}
.panel,.card,.stat,.source-box,.intake-shell,.queue-item{border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035));box-shadow:0 22px 62px rgba(0,0,0,.32)}
.panel{padding:24px}.app-screen{padding:20px}.screen-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.status-dot{width:10px;height:10px;border-radius:999px;background:var(--accent);box-shadow:0 0 18px var(--accent)}
.route-list{display:grid;gap:12px}.route-list a,.route-list button{width:100%;text-align:left;border:1px solid var(--line);border-radius:8px;padding:14px;background:rgba(0,0,0,.18);color:#fff;text-decoration:none;font:inherit}.route-list small{display:block;color:var(--muted);margin-top:6px;line-height:1.45}
.section{padding:56px 70px}.section-head{display:flex;justify-content:space-between;gap:22px;align-items:end;margin-bottom:20px}.section-head p{max-width:520px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.card{padding:20px;min-height:190px}.card b{display:block;color:var(--accent2);font-size:13px;text-transform:uppercase;margin-bottom:16px}.stat{padding:18px}.stat strong{display:block;font-size:24px}.stat span{display:block;color:var(--muted);font-size:13px;line-height:1.45}.source-box{padding:18px;border-left:4px solid var(--accent2);margin-top:18px}.source-box ul{margin:10px 0 0;padding-left:20px;color:var(--muted);line-height:1.65}
.intake-shell{padding:24px;display:grid;grid-template-columns:1fr .85fr;gap:22px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}label{display:grid;gap:6px;color:#edf7f4;font-weight:850;font-size:13px}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.32);color:#fff;padding:12px;font:inherit}textarea{min-height:120px;resize:vertical}.full{grid-column:1/-1}.queue{display:grid;gap:10px}.queue-item{padding:12px}.queue-item strong{display:block}.queue-item small{display:block;color:var(--muted);line-height:1.45;margin-top:4px}.alert{border:1px solid color-mix(in srgb,var(--accent2) 50%,transparent);border-radius:8px;background:color-mix(in srgb,var(--accent2) 12%,transparent);padding:14px;color:#fff8dc}.pill-row{display:flex;flex-wrap:wrap;gap:8px}.pill-row span{border:1px solid var(--line);border-radius:8px;padding:8px 10px;color:#f7fbff;background:rgba(255,255,255,.06);font-weight:800;font-size:13px}
.footer{display:flex;justify-content:space-between;gap:18px;align-items:center;border-top:1px solid var(--line);padding:22px 42px;color:var(--muted);font-size:13px}.footer strong,.footer span{display:block}.footer-links{display:flex;gap:10px;flex-wrap:wrap}
@media(max-width:980px){.app-top{padding:14px 28px}.hero,.intake-shell{grid-template-columns:1fr}.hero,.section{padding-left:28px;padding-right:28px}h1{font-size:54px}h2{font-size:38px}.lede{font-size:21px}.grid,.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.section-head{display:block}.site-nav{display:none;position:absolute;left:16px;right:16px;top:64px;background:#07100f;border:1px solid var(--line);border-radius:8px;padding:10px}.site-nav.open{display:grid}.menu-button{display:inline-flex;border:1px solid var(--line);background:rgba(255,255,255,.07);color:#fff;border-radius:8px;padding:9px 11px;font-weight:900}}
@media(max-width:620px){.app-top,.hero,.section,.footer{padding-left:16px;padding-right:16px}.hero{padding-top:42px}.grid,.grid.two,.form-grid{grid-template-columns:1fr}h1{font-size:39px}h2{font-size:31px}.lede{font-size:19px}.actions .btn{width:100%}.footer{display:block}.footer-links{margin-top:12px}}
`;
}

function appJs(client) {
  return `const CLIENT=${JSON.stringify({
    name: client.name,
    appSlug: client.appSlug,
    workspaceSlug: client.workspaceSlug,
    workspaceUrl: workspaceUrl(client),
    officialUrl: client.officialUrl,
    phone: client.phone,
    email: client.email || "",
    bookingUrl: client.bookingUrl
})};
const STORE='dental-client-intake:'+CLIENT.appSlug;
const LOCAL_STATUS='browser-local pending/static artifact';
const LOCAL_SOURCE='localStorage';
const APP_SCRIPT_URL=new URL(document.currentScript?.src||'assets/app.js',location.href);
function readQueue(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return[]}}
function writeQueue(items){localStorage.setItem(STORE,JSON.stringify(items.slice(0,50)))}
function renderQueue(){const mount=document.querySelector('[data-intake-queue]'); if(!mount)return; const items=readQueue(); mount.innerHTML=items.length?items.map(item=>'<div class="queue-item"><strong>'+escapeHtml(item.name||'New intake')+'</strong><small>'+escapeHtml(item.kind||'Visit')+' · '+escapeHtml(item.createdAt)+'</small><small>Telemetry: '+escapeHtml(item.telemetryStatus||LOCAL_STATUS)+' · Source: '+escapeHtml(item.telemetrySource||LOCAL_SOURCE)+'</small><small>'+escapeHtml(item.note||'No note')+'</small></div>').join(''):'<div class="queue-item"><strong>No local intake rows yet.</strong><small>Submitted rows are browser-local pending/static artifacts until a Worker, Relay, or Command Bridge receipt exists.</small></div>'}
function escapeHtml(value){return String(value||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
document.addEventListener('click',event=>{const menu=event.target.closest('[data-menu-toggle]'); if(menu){const nav=document.getElementById('site-nav'); nav?.classList.toggle('open'); menu.setAttribute('aria-expanded',nav?.classList.contains('open')?'true':'false')} const share=event.target.closest('[data-share-app]'); if(share){const url=location.href; if(navigator.share) navigator.share({title:CLIENT.name,url}).catch(()=>{}); else navigator.clipboard?.writeText(url)}})
document.addEventListener('submit',event=>{const form=event.target.closest('[data-intake-form]'); if(!form)return; event.preventDefault(); const data=Object.fromEntries(new FormData(form).entries()); const item={...data,createdAt:new Date().toLocaleString(),workspaceSlug:CLIENT.workspaceSlug,telemetryStatus:LOCAL_STATUS,telemetrySource:LOCAL_SOURCE,telemetryReceipt:'none'}; const queue=readQueue(); queue.unshift(item); writeQueue(queue); renderQueue(); form.reset(); const status=document.querySelector('[data-form-status]'); if(status) status.textContent='Saved as browser-local pending/static artifact. Open NorthStar to attach it to the workspace; no Worker, Relay, or Command Bridge receipt was returned.'})
document.addEventListener('DOMContentLoaded',()=>{renderQueue(); document.querySelectorAll('[data-client-name]').forEach(el=>el.textContent=CLIENT.name); document.querySelectorAll('[data-workspace-link]').forEach(el=>el.setAttribute('href',CLIENT.workspaceUrl)); document.querySelectorAll('[data-official-link]').forEach(el=>el.setAttribute('href',CLIENT.officialUrl));})
if('serviceWorker' in navigator){window.addEventListener('load',()=>{const workerUrl=new URL('../service-worker.js',APP_SCRIPT_URL); const scopeUrl=new URL('../',APP_SCRIPT_URL); navigator.serviceWorker.register(workerUrl.href,{scope:scopeUrl.pathname}).catch(()=>{})})}
`;
}

function manifest(client) {
  return {
    name: `${client.name} Client App`,
    short_name: client.name.split(" ").slice(0, 3).join(" "),
    start_url: "index.html",
    scope: "./",
    display: "standalone",
    background_color: "#07100f",
    theme_color: client.accent,
    description: `${client.name} app for verified source details, intake, services, and NorthStar workspace handoff.`,
    icons: []
  };
}

function serviceWorker(client) {
  const cache = `${client.appSlug}-shell-v1`;
  const files = ["./", "index.html", "services.html", "intake.html", "office.html", "financial.html", "workspace.html", "faq.html", "preview.html", "offline.html", "assets/styles.css", "assets/app.js", "site-data.json"];
  return `const CACHE=${JSON.stringify(cache)}; const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return; event.respondWith(fetch(event.request).then(res=>{const copy=res.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return res}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('offline.html'))))});
`;
}

function homePage(client) {
  const body = `<section class="hero">
  <div>
    <p class="eyebrow">Client app · real source-backed content</p>
    <h1>${esc(client.name)}<span>${esc(client.category)}</span></h1>
    <p class="lede">A standalone client app for source-backed business details, patient-intake routing, service paths, and the provisioned NorthStar SignInPro workspace.</p>
    <p class="copy">${esc(client.alert)}</p>
    <div class="actions"><a class="btn primary" href="intake.html">Start intake route</a><a class="btn" href="workspace.html">Open workspace room</a><a class="btn" href="${client.officialUrl}" target="_blank" rel="noopener">Official site</a><button class="btn" type="button" data-share-app>Share app</button></div>
  </div>
  <aside class="panel app-screen">
    <div class="screen-header"><strong>App command surface</strong><i class="status-dot"></i></div>
    <div class="route-list">
      <a href="services.html"><strong>Services</strong><small>Officially listed care paths and intake categories.</small></a>
      <a href="intake.html"><strong>Patient intake</strong><small>Browser-local pre-intake queue before NorthStar handoff.</small></a>
      <a href="workspace.html"><strong>NorthStar SignInPro</strong><small>Provisioned workspace: ${esc(client.workspaceSlug)}</small></a>
      <a href="office.html"><strong>Office proof</strong><small>Address, phone, hours, people, source boundary.</small></a>
    </div>
  </aside>
</section>
<section class="section">
  <div class="section-head"><div><p class="eyebrow">Operational modules</p><h2>Built like a real app surface, not a Valley card.</h2></div><p class="copy">The Valley post is now a public article/front-door. This app is where the business-specific workflow, content, and workspace handoff live.</p></div>
  <div class="grid">${client.modules.map(([name, desc]) => `<article class="card"><b>${esc(name)}</b><p class="copy">${esc(desc)}</p></article>`).join("")}</div>
</section>
<section class="section">
  <div class="grid two">
    <article class="source-box"><strong>Verified source notes</strong><ul>${client.officialNotes.map(note => `<li>${esc(note)}</li>`).join("")}</ul></article>
    <article class="source-box"><strong>Media policy</strong><p class="copy">No generated logos, no generated dental office photos, no stock-like patient scenes. Add media only when the owner provides or approves real assets.</p></article>
  </div>
</section>`;
  return pageShell(client, `${client.name} | Client App`, `${client.name} app for source-backed dental content, intake routing, and NorthStar workspace handoff.`, "Home", body);
}

function servicesPage(client) {
  const body = `<section class="section">
  <p class="eyebrow">Services</p><h1>${esc(client.name)}<span>Care Paths</span></h1><p class="lede">These routes use services found on the official business source. They are organized for intake and handoff, not for making unsupported medical claims.</p>
  <div class="grid">${client.services.map(([name, desc]) => `<article class="card"><b>${esc(name)}</b><h3>${esc(name)}</h3><p class="copy">${esc(desc)}</p><a href="intake.html?service=${encodeURIComponent(name)}">Start intake for this path</a></article>`).join("")}</div>
</section>`;
  return pageShell(client, `${client.name} | Services`, `Officially sourced service paths for ${client.name}.`, "Services", body);
}

function intakePage(client) {
  const options = client.services.map(([name]) => `<option>${esc(name)}</option>`).join("");
  const body = `<section class="section">
  <p class="eyebrow">Patient routing</p><h1>${esc(client.name)}<span>Intake Queue</span></h1><p class="lede">This does not replace the official appointment system. It captures lightweight routing context and points staff back to the NorthStar workspace.</p>
  <div class="intake-shell">
    <form data-intake-form>
      <div class="form-grid">
        <label>Name<input name="name" required autocomplete="name"></label>
        <label>Phone or email<input name="contact" required></label>
        <label>Visit type<select name="kind">${options}</select></label>
        <label>Urgency<select name="urgency"><option>Routine</option><option>Question before booking</option><option>Needs office follow-up</option><option>Urgent - call office now</option></select></label>
        <label class="full">Note<textarea name="note" placeholder="Do not enter protected medical details here. Use this for routing context only."></textarea></label>
      </div>
      <div class="actions"><button class="btn primary">Save intake row</button><a class="btn" href="${workspaceUrl(client)}">Open NorthStar</a><a class="btn warn" href="tel:${client.phoneHref}">Call office</a></div>
      <p class="copy" data-form-status></p>
    </form>
    <aside><div class="alert">Privacy boundary: this static app is for routing context. Real patient records stay inside approved office systems and the protected workspace.</div><h3>Local intake queue</h3><div class="queue" data-intake-queue></div></aside>
  </div>
</section>`;
  return pageShell(client, `${client.name} | Intake`, `Intake routing app for ${client.name}.`, "Intake", body);
}

function officePage(client) {
  const body = `<section class="section">
  <p class="eyebrow">Office proof</p><h1>${esc(client.name)}<span>Business Details</span></h1>
  <div class="grid">
    <article class="stat"><strong>${esc(client.phone)}</strong><span>Public phone. Use the official office for current scheduling and urgent questions.</span></article>
    <article class="stat"><strong>${esc(client.city)}</strong><span>${esc(client.address)}</span></article>
    <article class="stat"><strong>Owner proof pending</strong><span>Valley Verified claims remain source-bounded until the owner validates the page.</span></article>
  </div>
  <div class="grid two">
    <article class="source-box"><strong>Hours / availability</strong><ul>${client.hours.map(hour => `<li>${esc(hour)}</li>`).join("")}</ul></article>
    <article class="source-box"><strong>People / team</strong><ul>${client.people.map(person => `<li>${esc(person)}</li>`).join("")}</ul></article>
  </div>
  <div class="actions"><a class="btn primary" href="${client.officialUrl}" target="_blank" rel="noopener">Official source</a><a class="btn" href="${valleySourceUrl}" target="_blank" rel="noopener">Valley source</a><a class="btn" href="${valleyUrl(client)}">Valley post</a></div>
</section>`;
  return pageShell(client, `${client.name} | Office`, `Office details and source proof for ${client.name}.`, "Office", body);
}

function financialPage(client) {
  const body = `<section class="section">
  <p class="eyebrow">Financial handoff</p><h1>${esc(client.name)}<span>Payment and Plan Questions</span></h1><p class="lede">This page routes payment and plan questions without inventing coverage, pricing, or eligibility.</p>
  <div class="grid">${client.officialNotes.map((note, index) => `<article class="card"><b>Source note ${index + 1}</b><p class="copy">${esc(note)}</p></article>`).join("")}</div>
  <div class="actions"><a class="btn primary" href="${client.officialUrl}" target="_blank" rel="noopener">Check official financial details</a><a class="btn" href="intake.html">Ask office to follow up</a></div>
</section>`;
  return pageShell(client, `${client.name} | Financial`, `Financial-routing page for ${client.name}.`, "Financial", body);
}

function workspacePage(client) {
  const body = `<section class="section">
  <p class="eyebrow">SignInPro workspace</p><h1>${esc(client.name)}<span>NorthStar Room</span></h1><p class="lede">The workspace is provisioned and tied to this client app. Use this route for team sign-in, intake review, owner proof, and operational handoff.</p>
  <div class="grid two">
    <article class="panel"><h2>Workspace identity</h2><div class="pill-row"><span>${esc(client.workspaceSlug)}</span><span>Password reset required</span><span>Owner proof pending</span></div><div class="actions"><a class="btn primary" href="${workspaceUrl(client)}">Open SignInPro workspace</a><a class="btn" href="preview.html">Preview handoff</a></div></article>
    <article class="source-box"><strong>What this workspace is for</strong><ul><li>Patient arrival and front-office routing</li><li>Owner claim/proof queue</li><li>Source corrections and approved media handoff</li><li>Internal notes before publishing stronger Valley claims</li></ul></article>
  </div>
</section>`;
  return pageShell(client, `${client.name} | Workspace`, `NorthStar SignInPro workspace handoff for ${client.name}.`, "Workspace", body);
}

function faqPage(client) {
  const body = `<section class="section">
  <p class="eyebrow">FAQ</p><h1>${esc(client.name)}<span>App FAQ</span></h1>
  <div class="grid two">
    <article class="card"><b>Is this the official practice site?</b><p class="copy">No. This is a client app and Valley Verified handoff surface. Current clinical, appointment, pricing, and policy details belong on the official site or office contact routes.</p></article>
    <article class="card"><b>Is the owner verified?</b><p class="copy">Not yet. The app is source-backed and provisioned, but stronger Valley Verified trust language waits for owner proof.</p></article>
    <article class="card"><b>Why no logo or photos?</b><p class="copy">Because no generated or fake media should be used. Official assets can be added after owner approval.</p></article>
    <article class="card"><b>Where does staff work?</b><p class="copy">Staff opens the provisioned NorthStar SignInPro workspace from the Workspace page.</p></article>
  </div>
</section>`;
  return pageShell(client, `${client.name} | FAQ`, `FAQ for ${client.name} client app.`, "FAQ", body);
}

function previewPage(client) {
  const body = `<section class="section">
  <p class="eyebrow">Client preview</p><h1>${esc(client.name)}<span>Handoff Packet</span></h1><p class="lede">This page is for internal preview before owner approval, media approval, and final campaign language.</p>
  <div class="grid"><article class="card"><b>App</b><a href="index.html">${appUrl(client)}</a></article><article class="card"><b>Workspace</b><a href="${workspaceUrl(client)}">${workspaceUrl(client)}</a></article><article class="card"><b>Valley post</b><a href="${valleyUrl(client)}">${valleyUrl(client)}</a></article></div>
</section>`;
  return pageShell(client, `${client.name} | Preview`, `Preview packet for ${client.name}.`, "Workspace", body);
}

function offlinePage(client) {
  return pageShell(client, `${client.name} | Offline`, `Offline shell for ${client.name}.`, "Home", `<section class="section"><h1>${esc(client.name)}<span>Offline</span></h1><p class="lede">The app shell is cached. Reconnect before opening official booking, Valley, or NorthStar workspace links.</p></section>`);
}

function siteData(client) {
  return {
    name: client.name,
    appSlug: client.appSlug,
    valleySlug: client.valleySlug,
    workspaceSlug: client.workspaceSlug,
    category: client.category,
    officialUrl: client.officialUrl,
    sourceUrl: client.sourceUrl,
    phone: client.phone,
    email: client.email || null,
    address: client.address,
    hours: client.hours,
    people: client.people,
    services: client.services,
    modules: client.modules,
    mediaPolicy: "No generated logos, no generated dental office photos, no stock-like patient scenes. Owner-approved media only."
  };
}

function appManifest(client, folder) {
  return {
    client: client.name,
    sourceFolder: folder,
    upgradedFolder: folder,
    assetFolder: path.join(folder, "assets"),
    publishFolder: folder,
    publicEntry: "/index.html",
    previewRoute: "/preview.html",
    intakeRoute: "/intake.html",
    workspaceRoute: "/workspace.html",
    valleyPost: valleyUrl(client),
    northstarWorkspace: workspaceUrl(client),
    deploymentNote: "Standalone static client app. Media is intentionally text-first until owner-approved assets are attached."
  };
}

function valleyPostHtml(client) {
  const body = `<section class="hero">
  <div>
    <p class="eyebrow">Valley Verified app post</p>
    <h1>${esc(client.name)}<span>Client App Built First</span></h1>
    <p class="lede">This Valley post points to the actual client app, the official source, and the provisioned NorthStar SignInPro workspace.</p>
    <p class="copy">${esc(client.alert)}</p>
    <div class="actions"><a class="btn primary" href="/client-app-factory/client-apps/${client.appSlug}/">Open full app</a><a class="btn" href="${workspaceUrl(client)}">NorthStar workspace</a><a class="btn" href="${client.officialUrl}" target="_blank" rel="noopener">Official source</a></div>
  </div>
  <aside class="panel app-screen"><div class="screen-header"><strong>Post is built from the app</strong><i class="status-dot"></i></div><div class="route-list"><a href="/client-app-factory/client-apps/${client.appSlug}/services.html"><strong>Services</strong><small>Officially sourced app content.</small></a><a href="/client-app-factory/client-apps/${client.appSlug}/intake.html"><strong>Intake</strong><small>Client app intake surface.</small></a><a href="/client-app-factory/client-apps/${client.appSlug}/office.html"><strong>Office proof</strong><small>Address, phone, source notes.</small></a></div></aside>
</section>
<section class="section"><div class="section-head"><div><p class="eyebrow">Supporting details</p><h2>Real business information, not filler.</h2></div><p class="copy">The app carries the structured details; this post is the public Valley entry point.</p></div><div class="grid">${client.services.slice(0, 3).map(([name, desc]) => `<article class="card"><b>${esc(name)}</b><p class="copy">${esc(desc)}</p></article>`).join("")}</div></section>`;
  const appAssetPrefix = `/client-app-factory/client-apps/${client.appSlug}/`;
  return pageShell(client, `${client.name} | Valley Verified App Post`, `${client.name} Valley Verified app post linked to the full client app and NorthStar workspace.`, "Home", body, "", valleyUrl(client), appAssetPrefix);
}

function writeAppTo(folder, client) {
  ensureDir(folder);
  write(path.join(folder, "assets/styles.css"), styles());
  write(path.join(folder, "assets/app.js"), appJs(client));
  write(path.join(folder, "index.html"), homePage(client));
  write(path.join(folder, "services.html"), servicesPage(client));
  write(path.join(folder, "intake.html"), intakePage(client));
  write(path.join(folder, "office.html"), officePage(client));
  write(path.join(folder, "financial.html"), financialPage(client));
  write(path.join(folder, "workspace.html"), workspacePage(client));
  write(path.join(folder, "faq.html"), faqPage(client));
  write(path.join(folder, "preview.html"), previewPage(client));
  write(path.join(folder, "workspace-preview.html"), previewPage(client));
  ensureDir(path.join(folder, "workspace-preview"));
  write(path.join(folder, "workspace-preview/index.html"), previewPage(client));
  write(path.join(folder, "offline.html"), offlinePage(client));
  write(path.join(folder, "manifest.webmanifest"), JSON.stringify(manifest(client), null, 2));
  write(path.join(folder, "service-worker.js"), serviceWorker(client));
  write(path.join(folder, "site-data.json"), JSON.stringify(siteData(client), null, 2));
  write(path.join(folder, "APP_PATH_MANIFEST.json"), JSON.stringify(appManifest(client, folder), null, 2));
  write(path.join(folder, "CLIENT_VERIFICATION_REPORT.json"), JSON.stringify({
    ok: true,
    client: client.name,
    appSlug: client.appSlug,
    checkedSources: [client.officialUrl, valleySourceUrl],
    mediaPolicy: "No generated media or fake logo. Owner-approved media only.",
    northstarWorkspace: client.workspaceSlug,
    officialNotes: client.officialNotes
  }, null, 2));
  write(path.join(folder, "VALLEY_SYNC_PAYLOAD.json"), JSON.stringify({
    valleySlug: client.valleySlug,
    appUrl: `/client-app-factory/client-apps/${client.appSlug}/`,
    workspaceUrl: `/northstar/index.html?workspace=${client.workspaceSlug}`,
    officialUrl: client.officialUrl,
    title: `${client.name} client app`,
    description: client.alert,
    mediaPolicy: "No generated media."
  }, null, 2));
  write(path.join(folder, "README_DEPLOY.txt"), `${client.name}\n\nFull static client app with source-backed content, local intake queue, NorthStar workspace handoff, and Valley post sync payload.\n\nNo generated media or fake logo has been added.\n`);
  write(path.join(folder, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: sitemap.xml\n");
  const pages = ["", "services.html", "intake.html", "office.html", "financial.html", "workspace.html", "faq.html", "preview.html"].map(page => `${appUrl(client)}${page}`);
  write(path.join(folder, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${page}</loc></url>`).join("")}</urlset>`);
  write(path.join(folder, "_redirects"), "/workspace /workspace.html 200\n/preview /preview.html 200\n/intake /intake.html 200\n");
}

function updateJsonArray(file, entry) {
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  const index = data.findIndex(item => item?.slug === entry.slug);
  if (index >= 0) data[index] = { ...data[index], ...entry };
  else data.push(entry);
  write(file, JSON.stringify(data, null, 2));
}

function updateRegistries(client) {
  const entry = {
    slug: client.valleySlug,
    name: client.name,
    appSlug: client.appSlug,
    appUrl: `/client-app-factory/client-apps/${client.appSlug}/`,
    workspaceSlug: client.workspaceSlug,
    workspaceUrl: `/northstar/index.html?workspace=${client.workspaceSlug}`,
    officialUrl: client.officialUrl,
    sourceUrl: client.sourceUrl,
    phone: client.phone,
    address: client.address,
    image: "",
    extraImages: [],
    verifiedOwnerProof: false,
    mediaPolicy: "No generated media. Owner-approved media only.",
    headline: `${client.name} now has a full client app with NorthStar workspace handoff.`,
    description: client.alert,
    usecases: client.modules.map(([name]) => name),
    colors: { accent: client.accent, accent2: client.accent2, accent3: "#9edcff" },
    valleyVerifiedClient: true
  };
  updateJsonArray(path.join(siteRoot, "valley-verified/_shared/clients.json"), entry);
  updateJsonArray(path.join(siteRoot, "_platform-sources/valley-verified/dist/_shared/clients.json"), entry);
}

for (const client of clients) {
  const folders = [
    path.join(skyeClientsRoot, `${client.appSlug}-app`),
    path.join(factoryRoot, client.appSlug),
    path.join(liveFactoryRoot, client.appSlug)
  ];
  for (const folder of folders) writeAppTo(folder, client);
  write(path.join(valleyRoot, client.valleySlug, "index.html"), valleyPostHtml(client));
  write(path.join(valleySourceRoot, client.valleySlug, "index.html"), valleyPostHtml(client));
  updateRegistries(client);
}

write(path.join(root, "test-artifacts/dental-client-apps-build-report.json"), JSON.stringify({
  ok: true,
  builtAt: new Date().toISOString(),
  clients: clients.map(client => ({
    name: client.name,
    appSlug: client.appSlug,
    appPath: path.join(liveFactoryRoot, client.appSlug),
    valleyPath: path.join(valleyRoot, client.valleySlug, "index.html"),
    appUrl: appUrl(client),
    valleyUrl: valleyUrl(client),
    workspaceUrl: workspaceUrl(client)
  }))
}, null, 2));

console.log(JSON.stringify({ ok: true, built: clients.map(client => client.appSlug) }, null, 2));
