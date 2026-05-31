#!/usr/bin/env node
import fs from "fs";
import path from "path";
import qrcode from "qrcode-generator";

const root = "/workspaces/MetrAIyux-0S";
const siteRoot = path.join(root, "metraiyux_0s_site");
const skyeClientsRoot = path.join(root, "Skye-Clients");
const factoryRoot = path.join(root, "client-app-factory/client-apps");
const liveFactoryRoot = path.join(siteRoot, "client-app-factory/client-apps");
const valleyRoot = path.join(siteRoot, "valley-verified/business");
const valleySourceRoot = path.join(siteRoot, "_platform-sources/valley-verified/dist/business");
const origin = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const valleySourceUrl = "https://business.phoenixchamber.com/list/ql/health-care-11";

const clients = [
  {
    name: "Arizona Biltmore Dentistry",
    appSlug: "arizona-biltmore-dentistry",
    valleySlug: "arizona-biltmore-dentistry-phoenix-85016-d406e26",
    workspaceSlug: "arizona-biltmore-dentistry-phoenix-85016-d406e26",
    category: "General, family, cosmetic, and implant dentistry",
    officialUrl: "https://www.arizonabiltmoredentistry.com/",
    bookingUrl: "https://www.arizonabiltmoredentistry.com/",
    phone: "(602) 957-8200",
    phoneHref: "+16029578200",
    email: "",
    address: "2777 E Camelback Road, Ste. 101, Phoenix, AZ 85016",
    city: "Phoenix",
    hours: ["Monday to Thursday 7 AM - 5 PM", "Friday 7 AM - 4 PM", "Saturday 7 AM - 2 PM"],
    people: ["Dr. Aaron Jeziorski", "Dr. Michael Hood"],
    services: [
      ["General dentistry", "Restorative dentistry, root canal therapy, dentures, hygiene visits, and whole-mouth care paths."],
      ["Cosmetic dentistry", "Teeth whitening, smile makeover options, veneers, and other cosmetic service routes listed by the practice."],
      ["Dental implants", "Single-tooth implants, All-on-4, and missing-tooth consultation paths."],
      ["Teeth straightening", "Clear aligners, ClearCorrect, CandidPro, and Invisalign promotion handling."],
      ["Emergency and comfort care", "Emergency dental service, sedation dentistry, sleep apnea services, and post-op instruction routing."]
    ],
    patientCenter: ["Insurance questions", "Payment-plan questions", "Dental loyalty plan questions", "New patient arrival notes", "Post-op instruction routing"],
    financeNotes: ["Official site lists insurance, payment plans, and a dental loyalty plan.", "This app does not quote eligibility or pricing."],
    officialNotes: [
      "Official site lists Arizona Biltmore Dentistry at 2777 E Camelback Road, Ste. 101, Phoenix, AZ 85016.",
      "Official site lists cosmetic dentistry, general dentistry, family dentistry, dental implants, teeth straightening, emergency dental service, sleep apnea services, and sedation dentistry.",
      "Official site lists financial options including insurance, payment plans, and a dental loyalty plan."
    ],
    discrepancy: "",
    accent: "#54d6c7",
    accent2: "#f4c95d"
  },
  {
    name: "Dental Depot Orthodontics",
    appSlug: "dental-depot-orthodontics-phoenix",
    valleySlug: "dental-depot-orthodontics-phoenix-85053-c0fa26f",
    workspaceSlug: "dental-depot-orthodontics-phoenix-85053-c0fa26f",
    category: "Orthodontics for kids and adults",
    officialUrl: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    bookingUrl: "https://dentaldepotarizona.com/locations/phoenix-orthodontics/",
    phone: "(602) 845-8653",
    phoneHref: "+16028458653",
    email: "",
    address: "3730 W. Greenway Rd, Phoenix, AZ 85053",
    city: "Phoenix",
    hours: ["Monday-Thursday 8:00 AM - 4:00 PM"],
    people: ["Dr. James Zhong"],
    services: [
      ["Orthodontic consultations", "New patient consult routing for alignment goals, bite questions, and treatment readiness."],
      ["Traditional braces", "Braces interest intake, appointment prep, and follow-up routing."],
      ["Invisalign", "Clear aligner interest intake and official schedule handoff."],
      ["Orthodontics for kids", "Parent/guardian notes, child visit prep, and consent-aware front-office routing."],
      ["Orthodontics for adults", "Adult consult routing, finance questions, and treatment expectation notes."]
    ],
    patientCenter: ["Consultation questions", "Braces visit prep", "Invisalign visit prep", "Parent/guardian notes", "Payment-plan questions"],
    financeNotes: ["Official page supports orthodontic consultation and treatment paths.", "Payment or financing questions route to the office without unsupported pricing claims."],
    officialNotes: [
      "Official Dental Depot Arizona page lists the Phoenix orthodontics office at 3730 W. Greenway Rd, Phoenix, AZ 85053.",
      "The Valley/Chamber source lists 3750 W. Greenway Rd, so the app flags the address discrepancy for owner verification.",
      "Official page describes traditional braces and Invisalign and identifies Dr. James Zhong."
    ],
    discrepancy: "Address needs owner confirmation: official page lists 3730 W. Greenway Rd; the Valley/Chamber source lists 3750 W. Greenway Rd.",
    accent: "#6db7ff",
    accent2: "#f4c95d"
  },
  {
    name: "General Dentistry 4 Kids",
    appSlug: "general-dentistry-4-kids-phoenix",
    valleySlug: "general-dentistry-4-kids-phoenix-85032-237e895",
    workspaceSlug: "general-dentistry-4-kids-phoenix-85032-237e895",
    category: "Pediatric dental care",
    officialUrl: "https://gd4kphx.com/contact-us",
    bookingUrl: "https://gd4kphx.com/contact-us",
    phone: "(602) 996-6065",
    phoneHref: "+16029966065",
    email: "contact@gd4kphx.com",
    address: "3202 Greenway Rd. Suite #1287, Phoenix, AZ 85032",
    city: "Phoenix",
    hours: ["Hours were not listed on the checked contact page; call the office before presenting hours."],
    people: ["General Dentistry 4 Kids care team"],
    services: [
      ["Dental exams and cleaning", "Routine pediatric dental visit routing and parent/guardian notes."],
      ["Preventive treatment", "Dental sealant, silver diamine fluoride, space maintainer, and hygiene follow-up paths."],
      ["Restorative treatment", "Fillings, crowns, pulpal therapy, and tooth extraction intake routing."],
      ["Sedation methods", "Nitrous oxide, moderate sedation, and general anesthesia question routing to the office."],
      ["Patient center", "Insurance, Medicaid, TriCare, discount plan, online check-in, and policy handoffs."]
    ],
    patientCenter: ["Insurance", "Dental discount plan", "Medicaid dental care", "TriCare dental program", "Online check-in", "Office policies", "Notice of privacy practices"],
    financeNotes: ["Official patient center links include insurance, discount plan, Medicaid, and TriCare paths.", "Coverage and eligibility must be confirmed through the office."],
    officialNotes: [
      "Official contact page lists 3202 Greenway Rd. Suite #1287, Phoenix, AZ 85032, contact@gd4kphx.com, and (602) 996-6065.",
      "Official navigation lists dental exams, teeth cleaning, dental sealant, fillings, crowns, pulpal therapy, tooth extraction, space maintainers, silver diamine fluoride, nitrous oxide, moderate sedation, and general anesthesia.",
      "Official patient center links include insurance, dental discount plan, Medicaid dental care, TriCare dental program, online check-in, office policies, and notice of privacy practices."
    ],
    discrepancy: "Hours require owner or office confirmation before publication.",
    accent: "#72e0b8",
    accent2: "#ff8aa1"
  }
];

const routes = [
  ["Home", "index.html"],
  ["Services", "services.html"],
  ["Appointments", "appointments.html"],
  ["Intake", "intake.html"],
  ["New Patients", "new-patients.html"],
  ["Patient Center", "patient-center.html"],
  ["Insurance", "insurance.html"],
  ["Team", "team.html"],
  ["Office", "office.html"],
  ["Workspace", "workspace.html"],
  ["Scan", "scan.html"],
  ["Proof", "proof.html"],
  ["FAQ", "faq.html"]
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
  return `${origin}/client-app-factory/client-apps/${client.appSlug}/`;
}

function valleyUrl(client) {
  return `${origin}/valley-verified/business/${client.valleySlug}/`;
}

function workspaceUrl(client) {
  return `${origin}/northstar/index.html?workspace=${client.workspaceSlug}`;
}

function appQrSvg(client) {
  const qr = qrcode(0, "M");
  qr.addData(appUrl(client));
  qr.make();
  return qr.createSvgTag(4, 2)
    .replace("<svg", `<svg class="qr-code" role="img" aria-label="${esc(client.name)} app QR code"`)
    .replace(/<rect width="100%" height="100%" fill="#ffffff"\/>/, "");
}

function navHtml(active, base = "") {
  return routes.map(([label, href]) => `<a class="${active === label ? "active" : ""}" href="${base}${href}">${label}</a>`).join("");
}

function pageShell(client, title, description, active, body, options = {}) {
  const assetPrefix = options.assetPrefix || "";
  const canonical = options.canonical || appUrl(client);
  const navBase = options.navBase || "";
  const homeHref = options.homeHref || "index.html";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#07100f">
<link rel="icon" href="data:,">
<link rel="manifest" href="${assetPrefix}manifest.webmanifest">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="${assetPrefix}assets/styles.css">
<script defer src="${assetPrefix}assets/app.js"></script>
</head>
<body style="--accent:${client.accent};--accent2:${client.accent2}" data-client="${client.appSlug}" data-workspace="${client.workspaceSlug}">
<div class="top-alert">Official-source-backed client app · No generated logos/photos · owner proof pending</div>
<header class="top">
  <a class="brand" href="${homeHref}" aria-label="${esc(client.name)} app home"><span class="mark" aria-hidden="true"></span><strong>${esc(client.name)}<small>${esc(client.category)}</small></strong></a>
  <button class="menu" type="button" data-menu-toggle aria-expanded="false" aria-controls="primary-nav">Menu</button>
  <nav id="primary-nav" class="links" aria-label="Primary navigation">${navHtml(active, navBase)}</nav>
</header>
<main>${body}</main>
<aside class="command-rail" aria-label="Client app command rail">
  <span>App rail</span>
  <a href="${navBase}appointments.html">Appointment</a>
  <a href="${navBase}intake.html">Intake</a>
  <a href="${navBase}workspace.html">Workspace</a>
</aside>
<footer class="footer">
  <div><strong>${esc(client.name)}</strong><span>${esc(client.address)}</span><span>${esc(client.phone)}${client.email ? ` · ${esc(client.email)}` : ""}</span></div>
  <div class="footer-links"><a href="${client.officialUrl}" target="_blank" rel="noopener">Official site</a><a href="${workspaceUrl(client)}">NorthStar workspace</a><a href="${valleyUrl(client)}">Valley post</a></div>
</footer>
</body>
</html>`;
}

function styles() {
  return `:root{--bg:#07100f;--ink:#fffdf5;--muted:#c8d4cf;--panel:#101916;--panel2:#16221f;--line:rgba(255,255,255,.16);--accent:#54d6c7;--accent2:#f4c95d;--blue:#9edcff;--bad:#ff8a7a}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#07100f;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:0;overflow-x:hidden}body:before{content:"";position:fixed;inset:0;z-index:-2;background:radial-gradient(circle at 20% 10%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 28%),linear-gradient(135deg,#07100f,#0d1412 48%,#090b08)}body:after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.65),transparent 72%)}
a{color:var(--blue);text-underline-offset:3px;overflow-wrap:anywhere}p,h1,h2,h3{letter-spacing:0}.top-alert{padding:8px 22px;text-align:center;background:color-mix(in srgb,var(--accent2) 20%,#101006);border-bottom:1px solid var(--line);font-size:13px;font-weight:850;color:#fff7d5}.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 40px;background:rgba(5,10,9,.9);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink);min-width:260px}.mark{width:18px;height:18px;border-radius:4px;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 0 22px color-mix(in srgb,var(--accent) 52%,transparent)}.brand strong{display:block;line-height:1.05}.brand small{display:block;margin-top:4px;color:var(--muted);font-size:12px}.links{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.links a{padding:9px 10px;border:1px solid transparent;border-radius:8px;color:#eef9ff;text-decoration:none;font-size:12px;font-weight:900}.links a.active,.links a:hover{border-color:var(--line);background:rgba(255,255,255,.08)}.menu{display:none}
.hero{min-height:calc(100vh - 96px);display:grid;grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr);gap:26px;align-items:center;padding:58px 70px}.eyebrow{margin:0 0 12px;color:var(--accent2);font-size:12px;font-weight:950;text-transform:uppercase}.hero h1,.page-hero h1{font-size:72px;line-height:.96;margin:0 0 18px;max-width:980px}.hero h1 span,.page-hero h1 span{display:block;color:var(--accent)}.lede{font-size:23px;line-height:1.35;color:#fff9eb;max-width:840px}.copy{color:var(--muted);font-size:16px;line-height:1.7;max-width:860px}.actions,.share-strip,.pill-row{display:flex;gap:10px;flex-wrap:wrap}.actions{margin-top:24px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border-radius:8px;border:1px solid var(--line);padding:12px 15px;background:rgba(255,255,255,.07);color:#f7fbff;text-decoration:none;font-weight:950;font:inherit}.btn.primary{background:linear-gradient(135deg,var(--accent),#9edcff);color:#041210;border:0}.btn.gold{background:linear-gradient(135deg,var(--accent2),#ffb27b);color:#130c05;border:0}.btn.danger{border-color:color-mix(in srgb,var(--bad) 60%,transparent);color:#ffd5cf}.panel,.card,.source-box,.stat,.intake-shell,.qr-card{border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.035));box-shadow:0 24px 64px rgba(0,0,0,.3)}.panel{padding:22px}.screen-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.status-dot{width:10px;height:10px;border-radius:999px;background:var(--accent);box-shadow:0 0 18px var(--accent)}.route-list{display:grid;gap:10px}.route-list a,.route-list button{width:100%;text-align:left;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22);color:#fff;text-decoration:none;padding:13px;font:inherit}.route-list small{display:block;color:var(--muted);margin-top:5px;line-height:1.45}.quick-form{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;margin-top:22px}.section,.page-hero{padding:54px 70px}.page-hero{padding-bottom:24px}.section-head{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:22px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.card{padding:20px;min-height:190px}.card b,.badge{display:inline-flex;color:var(--accent2);font-size:12px;font-weight:950;text-transform:uppercase;margin-bottom:14px}.card h3{margin:0 0 10px;font-size:22px;line-height:1.15}.stat{padding:18px}.stat strong{display:block;font-size:24px}.stat span{display:block;color:var(--muted);font-size:13px;line-height:1.45}.source-box{padding:18px;border-left:4px solid var(--accent2)}.source-box ul{margin:10px 0 0;padding-left:20px;color:var(--muted);line-height:1.65}.alert{border:1px solid color-mix(in srgb,var(--accent2) 55%,transparent);border-radius:8px;background:color-mix(in srgb,var(--accent2) 13%,transparent);padding:14px;color:#fff8dc}.pill-row span{border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.065);padding:8px 10px;font-size:13px;font-weight:850}.intake-shell{padding:24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.85fr);gap:22px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}label{display:grid;gap:6px;color:#eef7f4;font-size:13px;font-weight:850}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.32);color:#fff;padding:12px;font:inherit}textarea{min-height:124px;resize:vertical}.full{grid-column:1/-1}.queue{display:grid;gap:10px;margin-top:12px}.queue-item{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22);padding:12px}.queue-item strong,.queue-item small{display:block}.queue-item small{color:var(--muted);line-height:1.45;margin-top:4px}.qr-layout{display:grid;grid-template-columns:minmax(300px,.7fr) minmax(0,1fr);gap:24px;align-items:start}.qr-card{padding:22px;text-align:center}.qr-code{width:min(100%,280px);height:auto;background:#fff;border-radius:8px;padding:12px}.share-strip{margin-top:16px}.share-strip a{border:1px solid var(--line);border-radius:8px;padding:8px 10px;text-decoration:none}.command-rail{position:fixed;right:14px;bottom:14px;z-index:25;display:grid;gap:7px;border:1px solid var(--line);border-radius:8px;background:rgba(7,16,15,.86);backdrop-filter:blur(14px);padding:10px}.command-rail span{font-size:11px;color:var(--accent2);font-weight:950;text-transform:uppercase}.command-rail a{font-size:12px;text-decoration:none;color:#effcff}.footer{display:flex;justify-content:space-between;gap:18px;align-items:center;border-top:1px solid var(--line);padding:24px 42px;color:var(--muted);font-size:13px}.footer strong,.footer span{display:block}.footer-links{display:flex;gap:10px;flex-wrap:wrap}@media(max-width:1100px){.hero,.intake-shell,.qr-layout{grid-template-columns:1fr}.grid.four,.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quick-form{grid-template-columns:1fr}.hero h1,.page-hero h1{font-size:54px}.lede{font-size:21px}.top,.hero,.section,.page-hero{padding-left:28px;padding-right:28px}.links{display:none;position:absolute;left:16px;right:16px;top:62px;background:#07100f;border:1px solid var(--line);border-radius:8px;padding:10px}.links.open{display:grid}.menu{display:inline-flex;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.08);color:#fff;padding:9px 11px;font-weight:900}.brand{min-width:0}.command-rail{position:static;margin:0 16px 18px}}@media(max-width:650px){.top,.hero,.section,.page-hero,.footer{padding-left:16px;padding-right:16px}.hero{padding-top:42px}.grid,.grid.two,.grid.four,.form-grid{grid-template-columns:1fr}.hero h1,.page-hero h1{font-size:39px}.lede{font-size:19px}.actions .btn{width:100%}.footer{display:block}.footer-links{margin-top:12px}}
.card,.source-box,.panel,.stat,.footer,.footer div,.footer-links,.screen-head,.route-list,.route-list a,.route-list button{min-width:0}a,.card a,.source-box a,.footer a,.route-list a,.route-list button{overflow-wrap:anywhere;word-break:break-word}
@media print{.top,.top-alert,.command-rail,.footer,.actions,.share-strip{display:none}.hero,.section,.page-hero{padding:18px;color:#111;background:#fff}body{background:#fff;color:#111}.card,.panel,.source-box,.stat{box-shadow:none;border-color:#aaa}}
`;
}

function appJs(client) {
  return `const CLIENT=${JSON.stringify({ name: client.name, appSlug: client.appSlug, workspaceSlug: client.workspaceSlug, workspaceUrl: workspaceUrl(client), officialUrl: client.officialUrl, phone: client.phone, phoneHref: client.phoneHref, bookingUrl: client.bookingUrl })};
const STORE='dental-full-app-intake:'+CLIENT.appSlug;
const PROOF_STORE='dental-full-app-proof:'+CLIENT.appSlug;
const LOCAL_STATUS='browser-local pending/static artifact';
const LOCAL_SOURCE='localStorage';
const APP_SCRIPT_URL=new URL(document.currentScript?.src||'assets/app.js',location.href);
function readStore(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}}
function writeStore(key,items){localStorage.setItem(key,JSON.stringify(items.slice(0,80)))}
function escapeHtml(value){return String(value||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function renderQueue(){const mount=document.querySelector('[data-intake-queue]'); if(!mount)return; const items=readStore(STORE); mount.innerHTML=items.length?items.map(item=>'<div class="queue-item"><strong>'+escapeHtml(item.name||'New intake')+'</strong><small>'+escapeHtml(item.kind||'Routing')+' · '+escapeHtml(item.urgency||'Routine')+' · '+escapeHtml(item.createdAt)+'</small><small>Telemetry: '+escapeHtml(item.telemetryStatus||LOCAL_STATUS)+' · Source: '+escapeHtml(item.telemetrySource||LOCAL_SOURCE)+'</small><small>'+escapeHtml(item.note||'No note')+'</small></div>').join(''):'<div class="queue-item"><strong>No local intake rows yet.</strong><small>Rows created here are browser-local pending/static artifacts until a Worker, Relay, or Command Bridge receipt exists.</small></div>'}
function renderProof(){const mount=document.querySelector('[data-proof-notes]'); if(!mount)return; const items=readStore(PROOF_STORE); mount.innerHTML=items.length?items.map(item=>'<div class="queue-item"><strong>'+escapeHtml(item.subject||'Owner note')+'</strong><small>'+escapeHtml(item.createdAt)+'</small><small>Telemetry: '+escapeHtml(item.telemetryStatus||LOCAL_STATUS)+' · Source: '+escapeHtml(item.telemetrySource||LOCAL_SOURCE)+'</small><small>'+escapeHtml(item.note||'No note')+'</small></div>').join(''):'<div class="queue-item"><strong>No owner proof notes saved locally.</strong><small>Proof rows are browser-local pending/static artifacts until a Worker, Relay, or Command Bridge receipt exists.</small></div>'}
document.addEventListener('click',event=>{const menu=event.target.closest('[data-menu-toggle]'); if(menu){const nav=document.getElementById('primary-nav'); nav?.classList.toggle('open'); menu.setAttribute('aria-expanded',nav?.classList.contains('open')?'true':'false')} const share=event.target.closest('[data-share-app]'); if(share){const url=share.dataset.shareUrl||location.href; if(navigator.share) navigator.share({title:CLIENT.name,url}).catch(()=>{}); else navigator.clipboard?.writeText(url)} const copy=event.target.closest('[data-copy-link]'); if(copy){navigator.clipboard?.writeText(copy.dataset.copyLink||location.href); copy.textContent='Copied'}})
document.addEventListener('submit',event=>{const intake=event.target.closest('[data-intake-form]'); if(intake){event.preventDefault(); const data=Object.fromEntries(new FormData(intake).entries()); const item={...data,createdAt:new Date().toLocaleString(),workspaceSlug:CLIENT.workspaceSlug,telemetryStatus:LOCAL_STATUS,telemetrySource:LOCAL_SOURCE,telemetryReceipt:'none'}; const rows=readStore(STORE); rows.unshift(item); writeStore(STORE,rows); renderQueue(); intake.reset(); const status=document.querySelector('[data-form-status]'); if(status) status.textContent='Saved as browser-local pending/static artifact. Open NorthStar to attach this to the workspace; no Worker, Relay, or Command Bridge receipt was returned.'} const route=event.target.closest('[data-route-form]'); if(route){event.preventDefault(); const data=new FormData(route); location.href='appointments.html?service='+encodeURIComponent(data.get('service')||'')+'&urgency='+encodeURIComponent(data.get('urgency')||'')} const proof=event.target.closest('[data-proof-form]'); if(proof){event.preventDefault(); const data=Object.fromEntries(new FormData(proof).entries()); const rows=readStore(PROOF_STORE); rows.unshift({...data,createdAt:new Date().toLocaleString(),telemetryStatus:LOCAL_STATUS,telemetrySource:LOCAL_SOURCE,telemetryReceipt:'none'}); writeStore(PROOF_STORE,rows); renderProof(); proof.reset(); const status=document.querySelector('[data-proof-status]'); if(status) status.textContent='Owner proof note saved as browser-local pending/static artifact. No Worker, Relay, or Command Bridge receipt was returned.'}})
document.addEventListener('DOMContentLoaded',()=>{const params=new URLSearchParams(location.search); document.querySelectorAll('[data-prefill-service]').forEach(el=>{if(params.get('service')) el.value=params.get('service')}); document.querySelectorAll('[data-workspace-link]').forEach(el=>el.setAttribute('href',CLIENT.workspaceUrl)); renderQueue(); renderProof()})
if('serviceWorker' in navigator){window.addEventListener('load',()=>{const workerUrl=new URL('../service-worker.js',APP_SCRIPT_URL); const scopeUrl=new URL('../',APP_SCRIPT_URL); navigator.serviceWorker.register(workerUrl.href,{scope:scopeUrl.pathname}).catch(()=>{})})}
`;
}

function serviceWorker(client) {
  const files = [
    "./", "index.html", "services.html", "appointments.html", "intake.html", "new-patients.html", "patient-center.html",
    "insurance.html", "financial.html", "team.html", "office.html", "workspace.html", "proof.html", "faq.html", "scan.html", "flyer.html",
    "preview.html", "offline.html", "assets/styles.css", "assets/app.js", "assets/qr.svg", "site-data.json"
  ];
  return `const CACHE=${JSON.stringify(`${client.appSlug}-full-shell-v2`)}; const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return; event.respondWith(fetch(event.request).then(res=>{const copy=res.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return res}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('offline.html'))))});
`;
}

function serviceOptions(client) {
  return client.services.map(([name]) => `<option>${esc(name)}</option>`).join("");
}

function quickForm(client) {
  return `<form class="quick-form" data-route-form><select name="service" aria-label="Service path">${serviceOptions(client)}</select><select name="urgency" aria-label="Urgency"><option>Routine</option><option>Question before booking</option><option>Needs office follow-up</option><option>Urgent - call office now</option></select><button class="btn primary">Route request</button></form>`;
}

function homePage(client) {
  const body = `<section class="hero">
  <div>
    <p class="eyebrow">Client app · provisioned workspace · Valley source handoff</p>
    <h1>${esc(client.name)}<span>${esc(client.category)}</span></h1>
    <p class="lede">A full static client app for appointment routing, service education, patient-center handoff, owner proof, and NorthStar SignInPro workspace access.</p>
    ${client.discrepancy ? `<div class="alert">${esc(client.discrepancy)}</div>` : ""}
    <div class="actions"><a class="btn primary" href="appointments.html">Start appointment route</a><a class="btn" href="intake.html">Open intake queue</a><a class="btn gold" href="workspace.html">Open workspace</a><a class="btn" href="${client.officialUrl}" target="_blank" rel="noopener">Official site</a><button class="btn" type="button" data-share-app data-share-url="${appUrl(client)}">Share app</button></div>
    ${quickForm(client)}
    <div class="share-strip"><span>Share:</span><a href="mailto:?subject=${encodeURIComponent(client.name + " client app")}&body=${encodeURIComponent(appUrl(client))}">Email</a><a href="sms:?&body=${encodeURIComponent(appUrl(client))}">Text</a><a href="scan.html">QR</a><a href="flyer.html">Flyer</a></div>
  </div>
  <aside class="panel">
    <div class="screen-head"><strong>Operational app routes</strong><i class="status-dot"></i></div>
    <div class="route-list">
      <a href="services.html"><strong>Services</strong><small>Officially sourced care paths organized for routing.</small></a>
      <a href="new-patients.html"><strong>New patient lane</strong><small>Arrival prep, office boundaries, and official handoff.</small></a>
      <a href="patient-center.html"><strong>Patient center</strong><small>Forms, insurance, policy, and contact paths.</small></a>
      <a href="proof.html"><strong>Owner proof lane</strong><small>Media approval, corrections, claim proof, and Valley sync.</small></a>
    </div>
  </aside>
</section>
<section class="section">
  <div class="section-head"><div><p class="eyebrow">App modules</p><h2>Built as a client app first. Valley is the post, not the product.</h2></div><p class="copy">Every module keeps clinical, pricing, eligibility, and owner-verified claims inside the proper source boundary.</p></div>
  <div class="grid four">
    <article class="card"><b>Appointment routing</b><h3>Service + urgency intake</h3><p class="copy">Routes patient interest into a browser-local queue before NorthStar handoff.</p></article>
    <article class="card"><b>Workspace</b><h3>SignInPro room</h3><p class="copy">Uses the provisioned workspace slug: ${esc(client.workspaceSlug)}.</p></article>
    <article class="card"><b>Patient center</b><h3>Office-safe resources</h3><p class="copy">Surfaces source-backed resources without inventing policies.</p></article>
    <article class="card"><b>Proof lane</b><h3>Owner approval</h3><p class="copy">Keeps real media, listing edits, and stronger Valley claims pending until approval.</p></article>
  </div>
</section>`;
  return pageShell(client, `${client.name} | Full Client App`, `${client.name} full client app with appointment routing, patient center, proof lane, and NorthStar workspace.`, "Home", body);
}

function servicesPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Officially sourced services</p><h1>${esc(client.name)}<span>Care route map</span></h1><p class="lede">These service lanes are organized from public official-source details. The app routes interest; the office confirms care, eligibility, pricing, and scheduling.</p></section>
<section class="section"><div class="grid">${client.services.map(([name, desc]) => `<article class="card"><b>${esc(name)}</b><h3>${esc(name)}</h3><p class="copy">${esc(desc)}</p><a href="appointments.html?service=${encodeURIComponent(name)}">Start this route</a></article>`).join("")}</div></section>`;
  return pageShell(client, `${client.name} | Services`, `${client.name} service route map.`, "Services", body);
}

function appointmentsPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Appointment routing</p><h1>${esc(client.name)}<span>Request path</span></h1><p class="lede">Use this app to package the request, then hand it to the official office route or the NorthStar workspace.</p></section>
<section class="section"><div class="intake-shell"><form data-intake-form><div class="form-grid">
<label>Name<input name="name" required autocomplete="name"></label><label>Phone or email<input name="contact" required></label>
<label>Service<select name="kind" data-prefill-service>${serviceOptions(client)}</select></label><label>Urgency<select name="urgency"><option>Routine</option><option>Question before booking</option><option>Needs office follow-up</option><option>Urgent - call office now</option></select></label>
<label class="full">Routing note<textarea name="note" placeholder="Keep private medical details out of this static app. Use this for routing context only."></textarea></label>
</div><div class="actions"><button class="btn primary">Save route</button><a class="btn" href="${client.bookingUrl}" target="_blank" rel="noopener">Official appointment route</a><a class="btn gold" href="tel:${client.phoneHref}">Call office</a></div><p class="copy" data-form-status></p></form>
<aside><div class="alert">This is not the practice's official EHR or appointment system. It is a routing app tied to the client workspace.</div><h3>Saved routing rows</h3><div class="queue" data-intake-queue></div></aside></div></section>`;
  return pageShell(client, `${client.name} | Appointments`, `${client.name} appointment routing app.`, "Appointments", body);
}

function intakePage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Patient intake</p><h1>${esc(client.name)}<span>Intake queue</span></h1><p class="lede">Browser-local routing rows for staff review before the NorthStar workspace handoff. Keep protected medical details out of this static app.</p></section>
<section class="section"><div class="intake-shell"><form data-intake-form><div class="form-grid">
<label>Name<input name="name" required autocomplete="name"></label><label>Phone or email<input name="contact" required></label>
<label>Route<select name="kind" data-prefill-service>${serviceOptions(client)}</select></label><label>Urgency<select name="urgency"><option>Routine</option><option>Question before booking</option><option>Needs office follow-up</option><option>Urgent - call office now</option></select></label>
<label class="full">Routing note<textarea name="note" placeholder="Use this only for routing context."></textarea></label>
</div><div class="actions"><button class="btn primary">Save intake row</button><a class="btn gold" href="${workspaceUrl(client)}">Open NorthStar</a><a class="btn" href="tel:${client.phoneHref}">Call office</a></div><p class="copy" data-form-status></p></form>
<aside><div class="alert">Static app boundary: this queue is local to this browser. Approved patient records stay in approved office systems.</div><h3>Local intake queue</h3><div class="queue" data-intake-queue></div></aside></div></section>`;
  return pageShell(client, `${client.name} | Intake`, `${client.name} intake queue.`, "Intake", body);
}

function newPatientsPage(client) {
  const items = ["Confirm appointment through the official office route", "Bring insurance or payment-plan questions directly to the office", "Use this app for routing notes, not protected medical records", "Call the office for urgent or time-sensitive care questions"];
  const body = `<section class="page-hero"><p class="eyebrow">New patients</p><h1>${esc(client.name)}<span>Arrival prep</span></h1><p class="lede">A source-safe prep lane for patients and staff before the official office workflow takes over.</p></section><section class="section"><div class="grid two"><article class="source-box"><strong>Prep checklist</strong><ul>${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul></article><article class="source-box"><strong>Office contact</strong><ul><li>${esc(client.phone)}</li><li>${esc(client.address)}</li>${client.email ? `<li>${esc(client.email)}</li>` : ""}</ul></article></div></section>`;
  return pageShell(client, `${client.name} | New Patients`, `${client.name} new patient app lane.`, "New Patients", body);
}

function patientCenterPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Patient center</p><h1>${esc(client.name)}<span>Resource lanes</span></h1><p class="lede">The app organizes public patient-center paths and sends anything sensitive back to the official office route.</p></section><section class="section"><div class="grid">${client.patientCenter.map(item => `<article class="card"><b>Resource</b><h3>${esc(item)}</h3><p class="copy">Route questions for ${esc(item.toLowerCase())} to the office or workspace without adding unsupported policy language.</p><a href="intake.html?service=${encodeURIComponent(item)}">Ask for follow-up</a></article>`).join("")}</div></section>`;
  return pageShell(client, `${client.name} | Patient Center`, `${client.name} patient center.`, "Patient Center", body);
}

function insurancePage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Insurance and payment</p><h1>${esc(client.name)}<span>Financial handoff</span></h1><p class="lede">No invented pricing, coverage, or eligibility. These notes only tell staff what the public source supports.</p></section><section class="section"><div class="grid two">${client.financeNotes.map((note, index) => `<article class="source-box"><strong>Financial source note ${index + 1}</strong><p class="copy">${esc(note)}</p></article>`).join("")}</div><div class="actions"><a class="btn primary" href="${client.officialUrl}" target="_blank" rel="noopener">Check official source</a><a class="btn" href="intake.html?service=Financial%20question">Ask for office follow-up</a></div></section>`;
  return pageShell(client, `${client.name} | Insurance`, `${client.name} insurance and payment handoff.`, "Insurance", body);
}

function teamPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Team</p><h1>${esc(client.name)}<span>Public care team</span></h1><p class="lede">Names here come from the checked public source notes. Owner proof can expand this page with approved bios and media later.</p></section><section class="section"><div class="grid">${client.people.map(person => `<article class="card"><b>Public source</b><h3>${esc(person)}</h3><p class="copy">Listed or represented in public practice information. Add biography, credentials, and real media only after owner approval.</p></article>`).join("")}</div></section>`;
  return pageShell(client, `${client.name} | Team`, `${client.name} team page.`, "Team", body);
}

function officePage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Office details</p><h1>${esc(client.name)}<span>Location and hours</span></h1>${client.discrepancy ? `<div class="alert">${esc(client.discrepancy)}</div>` : ""}</section><section class="section"><div class="grid"><article class="stat"><strong>${esc(client.phone)}</strong><span>Public office phone.</span></article><article class="stat"><strong>${esc(client.city)}</strong><span>${esc(client.address)}</span></article><article class="stat"><strong>Owner proof pending</strong><span>Use Proof page before stronger Valley claims.</span></article></div><div class="grid two"><article class="source-box"><strong>Hours / availability</strong><ul>${client.hours.map(hour => `<li>${esc(hour)}</li>`).join("")}</ul></article><article class="source-box"><strong>Source notes</strong><ul>${client.officialNotes.map(note => `<li>${esc(note)}</li>`).join("")}</ul></article></div></section>`;
  return pageShell(client, `${client.name} | Office`, `${client.name} office details.`, "Office", body);
}

function workspacePage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">NorthStar SignInPro</p><h1>${esc(client.name)}<span>Workspace room</span></h1><p class="lede">Provisioned workspace for staff handoff, patient-arrival notes, owner proof, and Valley sync control.</p></section><section class="section"><div class="grid two"><article class="panel"><h2>Workspace identity</h2><div class="pill-row"><span>${esc(client.workspaceSlug)}</span><span>Client app connected</span><span>Password reset path preserved</span></div><div class="actions"><a class="btn primary" href="${workspaceUrl(client)}">Open SignInPro workspace</a><a class="btn" href="preview.html">Preview handoff</a></div></article><article class="source-box"><strong>Room lanes</strong><ul><li>Appointment and intake queue</li><li>Owner proof and media approval</li><li>Listing correction review</li><li>Valley post sync payload</li></ul></article></div></section>`;
  return pageShell(client, `${client.name} | Workspace`, `${client.name} NorthStar workspace.`, "Workspace", body);
}

function proofPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Owner proof</p><h1>${esc(client.name)}<span>Claim and media gate</span></h1><p class="lede">This page blocks synthetic media and keeps stronger public claims waiting for owner proof.</p></section><section class="section"><div class="grid two"><article class="source-box"><strong>Checked source notes</strong><ul>${client.officialNotes.map(note => `<li>${esc(note)}</li>`).join("")}</ul></article><article class="source-box"><strong>Media rule</strong><p class="copy">No generated logos, no generated office photography, no stock patient scenes. Only owner-provided or owner-approved real assets get attached.</p></article></div><div class="intake-shell"><form data-proof-form><div class="form-grid"><label>Subject<input name="subject" required></label><label>Proof type<select name="type"><option>Listing correction</option><option>Owner media approval</option><option>Claim proof</option><option>Contact update</option></select></label><label class="full">Note<textarea name="note"></textarea></label></div><div class="actions"><button class="btn primary">Save proof note</button><a class="btn" href="${valleyUrl(client)}">Open Valley post</a></div><p class="copy" data-proof-status></p></form><aside><h3>Local proof notes</h3><div class="queue" data-proof-notes></div></aside></div></section>`;
  return pageShell(client, `${client.name} | Proof`, `${client.name} owner proof lane.`, "Proof", body);
}

function faqPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">FAQ</p><h1>${esc(client.name)}<span>App boundaries</span></h1></section><section class="section"><div class="grid two"><article class="card"><b>Official site?</b><p class="copy">No. This is a client app and Valley handoff surface. The official practice site controls appointment, care, pricing, and policy details.</p></article><article class="card"><b>Generated media?</b><p class="copy">No generated logos or photos are used. Real assets wait for owner approval.</p></article><article class="card"><b>Where do staff work?</b><p class="copy">Staff opens the NorthStar SignInPro workspace from the Workspace page.</p></article><article class="card"><b>Owner verified?</b><p class="copy">The app is source-backed and provisioned. Stronger Valley claims wait for owner proof.</p></article></div></section>`;
  return pageShell(client, `${client.name} | FAQ`, `${client.name} FAQ.`, "FAQ", body);
}

function scanPage(client) {
  const qr = appQrSvg(client);
  const body = `<section class="page-hero"><p class="eyebrow">Scan route</p><h1>${esc(client.name)}<span>App QR</span></h1><p class="lede">Functional QR to the live app URL. It is not a brand mark, office image, or patient image.</p></section><section class="section"><div class="qr-layout"><article class="qr-card">${qr}<p class="copy">${appUrl(client)}</p><button class="btn" type="button" data-copy-link data-copy-link="${appUrl(client)}">Copy app link</button></article><article class="panel"><h2>Quick routes</h2><div class="route-list"><a href="appointments.html"><strong>Appointment route</strong><small>Start the request.</small></a><a href="patient-center.html"><strong>Patient center</strong><small>Open resource lanes.</small></a><a href="workspace.html"><strong>Workspace</strong><small>Open SignInPro handoff.</small></a></div></article></div></section>`;
  return pageShell(client, `${client.name} | Scan`, `${client.name} QR scan route.`, "Scan", body);
}

function flyerPage(client) {
  const body = `<section class="page-hero"><p class="eyebrow">Printable flyer</p><h1>${esc(client.name)}<span>Client app handoff</span></h1><p class="lede">Print-safe handoff for staff or owner review.</p></section><section class="section"><div class="grid two"><article class="source-box"><strong>App URL</strong><p class="copy">${appUrl(client)}</p><strong>Workspace</strong><p class="copy">${client.workspaceSlug}</p></article><article class="source-box"><strong>Office</strong><p class="copy">${esc(client.address)}<br>${esc(client.phone)}</p></article></div></section>`;
  return pageShell(client, `${client.name} | Flyer`, `${client.name} printable flyer.`, "Scan", body);
}

function previewPage(client, options = {}) {
  const body = `<section class="page-hero"><p class="eyebrow">Preview packet</p><h1>${esc(client.name)}<span>Launch handoff</span></h1><p class="lede">Internal preview of the app, Valley post, workspace, and source boundary.</p></section><section class="section"><div class="grid"><article class="card"><b>Full app</b><a href="${appUrl(client)}">${appUrl(client)}</a><div class="actions"><a class="btn primary" href="${appUrl(client)}">Open full app</a></div></article><article class="card"><b>Valley post</b><a href="${valleyUrl(client)}">${valleyUrl(client)}</a><div class="actions"><a class="btn" href="${valleyUrl(client)}">Open Valley post</a></div></article><article class="card"><b>Workspace</b><a href="${workspaceUrl(client)}">${workspaceUrl(client)}</a><div class="actions"><a class="btn gold" href="${workspaceUrl(client)}">Open SignInPro workspace</a></div></article></div></section>`;
  return pageShell(client, `${client.name} | Preview`, `${client.name} preview packet.`, "Proof", body, options);
}

function offlinePage(client) {
  return pageShell(client, `${client.name} | Offline`, `${client.name} offline app shell.`, "Home", `<section class="page-hero"><h1>${esc(client.name)}<span>Offline</span></h1><p class="lede">The app shell is cached. Reconnect before using official appointment, Valley, or NorthStar routes.</p></section>`);
}

function valleyPostHtml(client) {
  const assetPrefix = `/client-app-factory/client-apps/${client.appSlug}/`;
  const body = `<section class="hero"><div><p class="eyebrow">Valley Verified client app post</p><h1>${esc(client.name)}<span>Full app built first</span></h1><p class="lede">This post is now the public entry point into the actual client app, not the base product.</p>${client.discrepancy ? `<div class="alert">${esc(client.discrepancy)}</div>` : ""}<div class="actions"><a class="btn primary" href="/client-app-factory/client-apps/${client.appSlug}/">Open full app</a><a class="btn" href="${workspaceUrl(client)}">NorthStar workspace</a><a class="btn" href="${client.officialUrl}" target="_blank" rel="noopener">Official source</a></div></div><aside class="panel"><div class="screen-head"><strong>App-backed routes</strong><i class="status-dot"></i></div><div class="route-list"><a href="/client-app-factory/client-apps/${client.appSlug}/services.html"><strong>Services</strong><small>Source-backed service map.</small></a><a href="/client-app-factory/client-apps/${client.appSlug}/appointments.html"><strong>Appointments</strong><small>Client app request lane.</small></a><a href="/client-app-factory/client-apps/${client.appSlug}/proof.html"><strong>Owner proof</strong><small>Media and claim approval.</small></a></div></aside></section><section class="section"><div class="section-head"><div><p class="eyebrow">Real supporting details</p><h2>Business facts come from the checked source notes.</h2></div><p class="copy">No generated logo, no generated office photos, no stock patient scenes.</p></div><div class="grid">${client.services.slice(0, 3).map(([name, desc]) => `<article class="card"><b>${esc(name)}</b><p class="copy">${esc(desc)}</p></article>`).join("")}</div></section>`;
  return pageShell(client, `${client.name} | Valley Verified App Post`, `${client.name} Valley Verified post connected to full client app.`, "Home", body, {
    assetPrefix,
    canonical: valleyUrl(client),
    navBase: `/client-app-factory/client-apps/${client.appSlug}/`,
    homeHref: `/client-app-factory/client-apps/${client.appSlug}/`
  });
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
    description: `${client.name} full client app with routing, patient center, proof lane, and NorthStar workspace.`,
    icons: []
  };
}

function siteData(client) {
  return {
    ...client,
    appUrl: appUrl(client),
    valleyUrl: valleyUrl(client),
    workspaceUrl: workspaceUrl(client),
    mediaPolicy: "No generated logos, no generated office photos, no stock patient scenes. Owner-approved real assets only."
  };
}

function smokeTest(client) {
  const required = [
    "index.html", "services.html", "appointments.html", "intake.html", "new-patients.html", "patient-center.html", "insurance.html", "financial.html",
    "team.html", "office.html", "workspace.html", "proof.html", "faq.html", "scan.html", "flyer.html", "preview.html",
    "manifest.webmanifest", "service-worker.js", "assets/app.js", "assets/styles.css", "assets/qr.svg", "dropin/patient-intake-dropin.js",
    "APP_PATH_MANIFEST.json", "APP_UPGRADE_PROOF.md", "CLIENT_VERIFICATION_REPORT.json"
  ];
  return `import fs from 'node:fs';
const required=${JSON.stringify(required)};
for (const file of required) if (!fs.existsSync(new URL('../'+file, import.meta.url))) throw new Error('Missing '+file);
const html=required.filter(file=>file.endsWith('.html')).map(file=>fs.readFileSync(new URL('../'+file, import.meta.url),'utf8')).join('\\n');
for (const banned of ['lorem ipsum','unsplash','pexels','placeholder.com','fake logo','generated dental office photo']) if (html.toLowerCase().includes(banned)) throw new Error('Banned filler/media term: '+banned);
for (const phrase of ['${client.name.replace(/'/g, "\\'")}','NorthStar SignInPro','Owner proof','Patient center','No generated logos/photos']) if (!html.includes(phrase)) throw new Error('Missing app feature: '+phrase);
console.log('${client.name.replace(/'/g, "\\'")} full app smoke passed');
`;
}

function dropin(client) {
  return `(function(){window.${client.appSlug.replace(/[^a-z0-9]/gi, "_")}_dropin={name:${JSON.stringify(client.name)},appUrl:${JSON.stringify(appUrl(client))},workspace:${JSON.stringify(workspaceUrl(client))}};})();`;
}

function writeApp(folder, client) {
  ensureDir(folder);
  write(path.join(folder, "assets/styles.css"), styles());
  write(path.join(folder, "assets/app.js"), appJs(client));
  write(path.join(folder, "assets/qr.svg"), appQrSvg(client));
  write(path.join(folder, "dropin/patient-intake-dropin.js"), dropin(client));
  write(path.join(folder, "index.html"), homePage(client));
  write(path.join(folder, "services.html"), servicesPage(client));
  write(path.join(folder, "appointments.html"), appointmentsPage(client));
  write(path.join(folder, "intake.html"), intakePage(client));
  write(path.join(folder, "new-patients.html"), newPatientsPage(client));
  write(path.join(folder, "patient-center.html"), patientCenterPage(client));
  write(path.join(folder, "insurance.html"), insurancePage(client));
  write(path.join(folder, "financial.html"), insurancePage(client));
  write(path.join(folder, "team.html"), teamPage(client));
  write(path.join(folder, "office.html"), officePage(client));
  write(path.join(folder, "workspace.html"), workspacePage(client));
  write(path.join(folder, "proof.html"), proofPage(client));
  write(path.join(folder, "faq.html"), faqPage(client));
  write(path.join(folder, "scan.html"), scanPage(client));
  write(path.join(folder, "flyer.html"), flyerPage(client));
  write(path.join(folder, "preview.html"), previewPage(client));
  write(path.join(folder, "workspace-preview.html"), previewPage(client));
  ensureDir(path.join(folder, "workspace-preview"));
  write(path.join(folder, "workspace-preview/index.html"), previewPage(client, {
    assetPrefix: "../",
    navBase: "../",
    homeHref: "../index.html",
    canonical: `${appUrl(client)}workspace-preview/`
  }));
  write(path.join(folder, "offline.html"), offlinePage(client));
  write(path.join(folder, "manifest.webmanifest"), JSON.stringify(manifest(client), null, 2));
  write(path.join(folder, "service-worker.js"), serviceWorker(client));
  write(path.join(folder, "site-data.json"), JSON.stringify(siteData(client), null, 2));
  write(path.join(folder, "tests/smoke.mjs"), smokeTest(client));
  write(path.join(folder, "package.json"), JSON.stringify({ private: true, type: "module", scripts: { smoke: "node tests/smoke.mjs" } }, null, 2));
  write(path.join(folder, "APP_PATH_MANIFEST.json"), JSON.stringify({
    client: client.name,
    publishFolder: folder,
    publicEntry: "/index.html",
    routeCount: 16,
    routes: routes.map(([, href]) => href).concat(["appointments.html", "flyer.html", "preview.html"]),
    northstarWorkspace: workspaceUrl(client),
    valleyPost: valleyUrl(client),
    mediaPolicy: "No generated media; owner-approved real assets only."
  }, null, 2));
  write(path.join(folder, "CLIENT_VERIFICATION_REPORT.json"), JSON.stringify({ ok: true, client: client.name, checkedSources: [client.officialUrl, valleySourceUrl], officialNotes: client.officialNotes, discrepancy: client.discrepancy, noGeneratedMedia: true, workspaceSlug: client.workspaceSlug }, null, 2));
  write(path.join(folder, "VALLEY_SYNC_PAYLOAD.json"), JSON.stringify({ valleySlug: client.valleySlug, appUrl: `/client-app-factory/client-apps/${client.appSlug}/`, workspaceUrl: `/northstar/index.html?workspace=${client.workspaceSlug}`, officialUrl: client.officialUrl, title: `${client.name} full client app`, mediaPolicy: "No generated media." }, null, 2));
  write(path.join(folder, "APP_UPGRADE_PROOF.md"), `# ${client.name} Full App Proof\n\n- Full route set: services, appointments, intake, new patients, patient center, insurance, team, office, workspace, proof, scan, flyer, preview.\n- PWA shell: manifest, service worker, offline page.\n- Functional lanes: local intake queue, owner proof queue, QR scan, printable flyer, workspace handoff.\n- Media policy: no generated logos/photos/stock patient scenes.\n- Workspace: ${client.workspaceSlug}\n`);
  write(path.join(folder, "DEPLOYMENT_README.md"), `# ${client.name}\n\nFull static client app. Deploy this folder or sync it into metraiyux_0s_site/client-app-factory/client-apps/${client.appSlug}.\n`);
  write(path.join(folder, "README_DEPLOY.txt"), `${client.name}\nFull client app with route set, PWA shell, proof lane, and NorthStar workspace handoff.\n`);
  write(path.join(folder, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: sitemap.xml\n");
  write(path.join(folder, "_redirects"), "/appointment /appointments.html 200\n/intake /intake.html 200\n/workspace /workspace.html 200\n/scan /scan.html 200\n");
  const urls = ["", "services.html", "appointments.html", "intake.html", "new-patients.html", "patient-center.html", "insurance.html", "financial.html", "team.html", "office.html", "workspace.html", "proof.html", "faq.html", "scan.html", "flyer.html", "preview.html"].map(route => `${appUrl(client)}${route}`);
  write(path.join(folder, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);
}

function updateJsonArray(file, entry) {
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  const index = data.findIndex((item) => item?.slug === entry.slug);
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
    sourceUrl: client.officialUrl,
    phone: client.phone,
    address: client.address,
    image: "",
    extraImages: [],
    verifiedOwnerProof: false,
    mediaPolicy: "No generated media. Owner-approved media only.",
    headline: `${client.name} has a full client app with NorthStar workspace handoff.`,
    description: `${client.category}. Full app routes include appointment routing, patient center, owner proof, workspace, scan, and Valley post handoff.`,
    usecases: ["appointments", "intake", "patient-center", "owner-proof", "workspace", "scan"],
    colors: { accent: client.accent, accent2: client.accent2, accent3: "#9edcff" },
    valleyVerifiedClient: true
  };
  updateJsonArray(path.join(siteRoot, "valley-verified/_shared/clients.json"), entry);
  updateJsonArray(path.join(siteRoot, "_platform-sources/valley-verified/dist/_shared/clients.json"), entry);
}

for (const client of clients) {
  for (const folder of [
    path.join(skyeClientsRoot, `${client.appSlug}-app`),
    path.join(factoryRoot, client.appSlug),
    path.join(liveFactoryRoot, client.appSlug)
  ]) writeApp(folder, client);
  write(path.join(valleyRoot, client.valleySlug, "index.html"), valleyPostHtml(client));
  write(path.join(valleySourceRoot, client.valleySlug, "index.html"), valleyPostHtml(client));
  updateRegistries(client);
}

write(path.join(root, "test-artifacts/dental-client-apps-full-build-report.json"), JSON.stringify({
  ok: true,
  builtAt: new Date().toISOString(),
  clients: clients.map(client => ({ name: client.name, appUrl: appUrl(client), valleyUrl: valleyUrl(client), workspaceUrl: workspaceUrl(client), routeCount: 16 }))
}, null, 2));

console.log(JSON.stringify({ ok: true, built: clients.map(client => client.appSlug), routeCount: 16 }, null, 2));
