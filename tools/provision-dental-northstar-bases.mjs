import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = "/workspaces/MetrAIyux-0S";
const siteRoot = path.join(root, "metraiyux_0s_site");
const sourceRoot = path.join(siteRoot, "_platform-sources/valley-verified/dist");
const northstarSourceRoot = path.join(siteRoot, "_platform-sources/glendale-northstar-valley-verified-v6-final/northstar");
const ledgerPath = path.join(root, "test-artifacts/client-provisioning/provisioned-company-workspace-logins-2026-05-19.md");
const envPath = path.join(root, ".env");
const productionOrigin = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const sourceUrl = "https://business.phoenixchamber.com/list/ql/health-care-11";

const clients = [
  {
    name: "Arizona Biltmore Dentistry",
    slug: "arizona-biltmore-dentistry-phoenix-85016-d406e26",
    lane: "Dentist",
    phone: "(602) 957-8200",
    phoneHref: "+16029578200",
    address: "2777 E. Camelback Road Ste. 101, Phoenix, AZ 85016",
    street: "2777 E. Camelback Road Ste. 101",
    city: "Phoenix",
    state: "AZ",
    zip: "85016",
    tag: "Phoenix dental arrival lane. Owner proof still required.",
    cta: "Start dental visit check-in, consult intake, vendor arrival, or front-office follow-up",
    eventName: "Arizona Biltmore Dentistry Patient Arrival",
    usecases: [
      "new-patient arrival intake",
      "consultation check-in",
      "treatment follow-up list",
      "vendor/front-office arrivals",
      "community referral handoff"
    ],
    colors: { accent: "#58d6c7", accent2: "#f5d36a", accent3: "#ff8f70" }
  },
  {
    name: "Dental Depot Orthodontics",
    slug: "dental-depot-orthodontics-phoenix-85053-c0fa26f",
    lane: "Orthodontics",
    phone: "(602) 845-8653",
    phoneHref: "+16028458653",
    address: "3750 W. Greenway Rd., Phoenix, AZ 85053",
    street: "3750 W. Greenway Rd.",
    city: "Phoenix",
    state: "AZ",
    zip: "85053",
    tag: "Phoenix orthodontic arrival lane. Owner proof still required.",
    cta: "Start orthodontic consult intake, adjustment visit check-in, or front-office follow-up",
    eventName: "Dental Depot Orthodontics Patient Arrival",
    usecases: [
      "orthodontic consult arrival",
      "new-patient orthodontic intake",
      "adjustment visit check-in",
      "treatment follow-up list",
      "vendor/front-office arrivals"
    ],
    colors: { accent: "#6db7ff", accent2: "#f5d36a", accent3: "#72e0b8" }
  },
  {
    name: "General Dentistry 4 Kids",
    slug: "general-dentistry-4-kids-phoenix-85032-237e895",
    lane: "Pediatric Dentistry",
    phone: "(602) 996-6065",
    phoneHref: "+16029966065",
    address: "3202 E. Greenway Rd. Ste #1287, Phoenix, AZ 85032",
    street: "3202 E. Greenway Rd. Ste #1287",
    city: "Phoenix",
    state: "AZ",
    zip: "85032",
    tag: "Phoenix pediatric dental arrival lane. Owner proof still required.",
    cta: "Start pediatric patient arrival, parent check-in, or front-office follow-up",
    eventName: "General Dentistry 4 Kids Patient Arrival",
    usecases: [
      "pediatric patient arrival",
      "parent/guardian check-in",
      "new-patient child intake",
      "treatment follow-up list",
      "front-office arrivals"
    ],
    colors: { accent: "#72e0b8", accent2: "#f5d36a", accent3: "#ff8aa1" }
  }
];

function safeVarKey(client) {
  return client.name.toUpperCase().replace(/&/g, "AND").replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
}

function parseLastEnvValue(text, key) {
  const re = new RegExp(`^${key}=(.*)$`, "gm");
  let match;
  let value = "";
  while ((match = re.exec(text))) value = match[1].trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value.replace(/\\"/g, "\"").replace(/\\n/g, "\n");
}

function envQuote(value) {
  return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n")}"`;
}

function passwordFor(client, envText) {
  const key = safeVarKey(client);
  return parseLastEnvValue(envText, `NORTHSTAR_DENTAL_${key}_TEMP_PASSWORD`)
    || (client.slug.startsWith("arizona-biltmore") ? parseLastEnvValue(envText, "NORTHSTAR_DENTAL_BASE_TEMP_PASSWORD") : "")
    || crypto.randomBytes(18).toString("base64url");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonArrayUpsert(file, entry) {
  const data = JSON.parse(read(file) || "[]");
  const index = data.findIndex((item) => item?.slug === entry.slug);
  if (index >= 0) data[index] = entry;
  else data.push(entry);
  write(file, `${JSON.stringify(data, null, 2)}\n`);
}

function directoryUpsert(file, slug, entry) {
  const raw = read(file).replace(/^window\.NORTHSTAR_WORKSPACE_DIRECTORY\s*=\s*/, "").replace(/;\s*$/, "");
  const data = raw ? JSON.parse(raw) : {};
  data[slug] = entry;
  write(file, `window.NORTHSTAR_WORKSPACE_DIRECTORY = ${JSON.stringify(data)};\n`);
}

function metadataFor(client) {
  return {
    valleyVerifiedClient: true,
    valleyVerifiedSource: sourceUrl,
    providedBy: "NorthStar SignInPro",
    family: "MetrAIyux 0S",
    mainUrl: sourceUrl,
    frontDoorImage: "",
    mediaPolicy: "No generated or placeholder dental media. Use verified owner-provided assets only after claim.",
    cta: client.cta,
    usecases: client.usecases,
    branding: {
      displayName: client.name,
      accent: client.colors.accent,
      accent2: client.colors.accent2,
      accent3: client.colors.accent3,
      image: ""
    },
    appSettings: {
      eventName: client.eventName,
      idLabel: "Visit ID",
      syncEnabled: true
    },
    securitySettings: {
      providedInfrastructure: true,
      tenantScoped: true,
      passwordResetRequired: true
    }
  };
}

function seedEntry(client) {
  return {
    name: client.name,
    slug: client.slug,
    ownerEmail: ownerEmail(client),
    plan: "provided-infrastructure",
    role: "owner",
    metadata: metadataFor(client),
    initialState: {
      schemaVersion: 4,
      appVersion: "6.4.1-valley-verified",
      workspace: {
        id: "pending-provision",
        slug: client.slug,
        name: client.name,
        role: "owner"
      },
      settings: {
        eventName: client.eventName,
        idLabel: "Visit ID",
        enableSound: true,
        allowDuplicateEmails: false,
        syncEnabled: true,
        retentionNote: "Workspace records are scoped to this dental NorthStar workspace and backed up when the NorthStar connection is active."
      },
      attendees: [],
      audit: [
        {
          at: "seed-time",
          action: "workspace_seeded",
          detail: "Valley Verified dental NorthStar workspace base prepared from public source data. Owner proof is still required before verified claims."
        }
      ]
    }
  };
}

function clientRegistryEntry(client) {
  return {
    slug: client.slug,
    name: client.name,
    tag: client.tag,
    headline: `${client.name} has a NorthStar workspace base for dental arrivals and front-office handoffs.`,
    description: `${client.name} now has a no-placeholder Valley Verified landing connected to a dedicated NorthStar SignInPro workspace for ${client.lane.toLowerCase()} arrivals, follow-up, vendors, and owner proof routing.`,
    cta: client.cta,
    mainUrl: sourceUrl,
    phone: client.phone,
    address: client.address,
    image: "",
    extraImages: [],
    usecases: client.usecases,
    colors: client.colors,
    workspaceSlug: client.slug,
    workspaceUrl: workspacePath(client),
    sourceUrl,
    valleyVerifiedClient: true,
    verifiedOwnerProof: false,
    mediaPolicy: "No generated or placeholder dental media. Add owner-provided assets only after claim."
  };
}

function ownerEmail(client) {
  return `graylondonskyes+northstar-${client.slug.replace(/-phoenix-\d+-[a-f0-9]+$/, "")}@gmail.com`;
}

function workspacePath(client) {
  return `/northstar/index.html?workspace=${client.slug}`;
}

function publicPath(client) {
  return `/valley-verified/business/${client.slug}/`;
}

function publicUrl(client) {
  return `${productionOrigin}${publicPath(client)}`;
}

function landingFile(client, base = siteRoot) {
  return path.join(base, "valley-verified/business", client.slug, "index.html");
}

function guideFile(client, base = siteRoot) {
  return path.join(base, "valley-verified/business", client.slug, "guide/index.html");
}

function sourceLandingFile(client) {
  return path.join(sourceRoot, "business", client.slug, "index.html");
}

function sourceGuideFile(client) {
  return path.join(sourceRoot, "business", client.slug, "guide/index.html");
}

function telHref(client) {
  return `tel:${client.phoneHref}`;
}

function baseCss(client) {
  return `
:root{--accent:${client.colors.accent};--accent2:${client.colors.accent2};--accent3:${client.colors.accent3};--bg:#090b0a;--panel:#101412;--panel2:#151815;--text:#fffdf5;--muted:#c9c4b8;--line:rgba(255,255,255,.18);--blue:#8fd3ff}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:linear-gradient(180deg,#090b0a,#050605 56%,#0a0b09);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:0;overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(88,214,199,.12),transparent 28%),linear-gradient(245deg,rgba(245,211,106,.10),transparent 32%),linear-gradient(180deg,transparent,rgba(255,143,112,.07));z-index:-1}
a{color:var(--blue);text-decoration-thickness:2px;text-underline-offset:3px}
.wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
.top{position:sticky;top:0;z-index:30;background:rgba(5,6,5,.86);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 0}
.wordmark{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-weight:900}
.mark{width:12px;height:12px;border-radius:3px;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 0 18px rgba(143,211,255,.45)}
.wordmark span{display:block;color:var(--muted);font-size:12px;font-weight:700;margin-top:2px}
.nav{display:flex;align-items:center;gap:14px}
.nav a{font-size:14px;font-weight:800;color:#dfefff}
.nav a:last-child{border:1px solid var(--line);border-radius:8px;padding:9px 11px;text-decoration:none;background:rgba(255,255,255,.06)}
.hero{display:grid;grid-template-columns:1fr 440px;gap:32px;align-items:center;min-height:calc(100vh - 70px);padding:72px 0 52px}
.eyebrow{font-size:12px;text-transform:uppercase;color:var(--accent2);font-weight:900;margin:0 0 14px}
h1,h2,h3,p{letter-spacing:0}
h1{font-size:72px;line-height:1;margin:0 0 18px;max-width:820px}
h1 span{display:block;color:var(--accent)}
h2{font-size:44px;line-height:1.08;margin:0 0 16px}
h3{font-size:22px;line-height:1.15;margin:0 0 10px}
.lede{font-size:24px;line-height:1.35;color:#fff8e9;max-width:760px;margin:0 0 16px}
.copy{font-size:16px;line-height:1.75;color:var(--muted);max-width:760px;margin:0}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;border-radius:8px;border:1px solid var(--line);padding:12px 15px;font-weight:900;text-decoration:none;color:#e8f6ff;background:rgba(255,255,255,.07)}
.btn.primary{background:linear-gradient(135deg,var(--accent),var(--blue));color:#03100f;border-color:transparent}
.app-panel,.panel,.card,.note,.quick div,.faq details{border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035))}
.app-panel{padding:18px;box-shadow:0 26px 70px rgba(0,0,0,.42)}
.screen{min-height:440px;border-radius:8px;background:linear-gradient(180deg,var(--panel2),#080a09);padding:22px;display:flex;flex-direction:column;justify-content:center}
.screen strong{font-size:28px;line-height:1.1;margin-bottom:18px}
.field{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.22);color:var(--muted);padding:14px;margin-top:12px}
.submit-look{margin-top:14px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#06100e;padding:14px;text-align:center;font-weight:950}
.status-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.status-grid span{border:1px solid var(--line);border-radius:8px;padding:12px;color:var(--muted);font-size:13px;line-height:1.45}
.status-grid b{display:block;color:#fff;margin-bottom:4px}
.quick{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:0 0 28px}
.quick div{padding:16px;min-height:118px}
.quick b{display:block;font-size:15px;line-height:1.25}
.quick small{display:block;color:var(--muted);line-height:1.45;margin-top:8px}
.section{padding:58px 0}
.split{display:grid;grid-template-columns:.9fr 1.1fr;gap:22px}
.panel,.card,.note{padding:24px}
.proofgrid{display:grid;gap:12px}
.proofgrid p{margin:0;border:1px solid var(--line);border-radius:8px;padding:18px;background:rgba(255,255,255,.055);color:#eee8dc;line-height:1.6}
.moment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card{min-height:210px}
.card span{display:block;color:var(--accent2);font-weight:950;margin-bottom:18px}
.pathway{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-top:18px}
.pathway span{border:1px solid var(--line);border-radius:8px;padding:14px;text-align:center;background:rgba(255,255,255,.06);font-weight:900}
.cta{display:grid;grid-template-columns:1fr 400px;gap:22px;align-items:center;border:1px solid color-mix(in srgb,var(--accent) 46%,transparent);border-radius:8px;padding:28px;background:rgba(255,255,255,.045)}
.note{margin:18px 0 0}
.note strong{display:block;color:var(--accent2);text-transform:uppercase;font-size:12px;margin-bottom:8px}
.faq{display:grid;gap:10px}
.faq details{padding:16px}
.faq summary{cursor:pointer;font-weight:900}
.faq p{color:var(--muted);line-height:1.7}
.footer{border-top:1px solid var(--line);padding:24px 0;color:var(--muted);font-size:13px}
@media(max-width:980px){.hero,.split,.cta{grid-template-columns:1fr}.quick{grid-template-columns:repeat(2,1fr)}.moment-grid{grid-template-columns:repeat(2,1fr)}h1{font-size:52px}h2{font-size:36px}.screen{min-height:340px}}
@media(max-width:560px){.wrap{width:min(100% - 24px,1120px)}.nav{display:none}.hero{padding:48px 0 32px}h1{font-size:38px}.lede{font-size:19px}.quick,.moment-grid,.pathway{grid-template-columns:1fr}.actions .btn{width:100%}.status-grid{grid-template-columns:1fr}}
`.trim();
}

function landingHtml(client) {
  const title = `${client.name} | NorthStar Patient Arrival`;
  const desc = `${client.name} has a Valley Verified NorthStar SignInPro landing for ${client.lane.toLowerCase()} arrival, front-office handoffs, and owner proof routing.`;
  const usecaseCards = client.usecases.map((item) => `<div><b>${htmlEscape(item)}</b><small>A focused NorthStar lane for ${htmlEscape(item)}.</small></div>`).join("");
  const momentCards = [
    ["01", "Patient arrival", "Patients can start from the landing page and move into the dedicated NorthStar workspace for visit context."],
    ["02", `${client.lane} intake`, "Consults and visit requests get a clear route for name, reason, and notes before staff review."],
    ["03", "Front-office follow-up", "The workspace gives the team a single place to organize next-step requests and internal handoffs."],
    ["04", "Vendor arrivals", "Non-patient arrivals can be separated from patient-facing language while still entering the same NorthStar lane."]
  ].map(([n, h, p]) => `<article class="card"><span>${n}</span><h3>${htmlEscape(h)}</h3><p class="copy">${htmlEscape(p)}</p></article>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<title>${htmlEscape(title)}</title>
<meta name="description" content="${htmlEscape(desc)}">
<link rel="canonical" href="${publicUrl(client)}">
<meta property="og:title" content="${htmlEscape(title)}">
<meta property="og:description" content="${htmlEscape(desc)}">
<style>${baseCss(client)}</style>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: client.name,
    url: publicUrl(client),
    telephone: client.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: client.street,
      addressLocality: client.city,
      addressRegion: client.state,
      postalCode: client.zip,
      addressCountry: "US"
    },
    sameAs: [sourceUrl]
  })}</script>
</head>
<body data-client="${client.slug}">
<header class="top">
  <div class="wrap">
    <a class="wordmark" href="/valley-verified/"><i class="mark"></i><strong>${htmlEscape(client.name)}<span>NorthStar patient arrival</span></strong></a>
    <nav class="nav"><a href="#workspace">Workspace</a><a href="#proof">Proof</a><a href="./guide/">Guide</a><a href="${sourceUrl}" rel="noreferrer" target="_blank">Source</a></nav>
  </div>
</header>
<main>
  <section class="hero wrap">
    <div>
      <p class="eyebrow">Phoenix ${htmlEscape(client.lane)} NorthStar base</p>
      <h1>${htmlEscape(client.name)}<span>Patient Arrival</span></h1>
      <p class="lede">A NorthStar SignInPro landing for ${htmlEscape(client.lane.toLowerCase())} arrivals, front-office handoffs, and owner proof routing.</p>
      <p class="copy">This page is built from the Valley Verified public source record. It connects the business profile to a dedicated NorthStar workspace without generated dental photos, simulated patient imagery, or fake office screenshots.</p>
      <div class="actions">
        <a class="btn primary" href="${workspacePath(client)}">Open NorthStar workspace</a>
        <a class="btn" href="${telHref(client)}">Call ${htmlEscape(client.phone)}</a>
        <a class="btn" href="${sourceUrl}" rel="noreferrer" target="_blank">Public source</a>
      </div>
    </div>
    <aside class="app-panel" aria-label="${htmlEscape(client.name)} NorthStar workspace preview">
      <div class="screen">
        <strong>${htmlEscape(client.name)}</strong>
        <div class="field">Patient or visitor name</div>
        <div class="field">Visit type or appointment context</div>
        <div class="field">Arrival note for front desk</div>
        <div class="submit-look">Open Workspace</div>
        <div class="status-grid">
          <span><b>Workspace</b>${htmlEscape(client.slug)}</span>
          <span><b>Status</b>Base seeded. Owner proof still required.</span>
        </div>
      </div>
    </aside>
  </section>
  <section class="quick wrap" aria-label="NorthStar dental use cases">${usecaseCards}</section>
  <section class="section wrap split" id="proof">
    <div class="panel">
      <p class="eyebrow">Source boundary</p>
      <h2>Real public facts first. Stronger trust claims after owner proof.</h2>
      <p class="copy">The record includes the Phoenix ${htmlEscape(client.lane.toLowerCase())} listing, public phone number, address, and source route. The page does not say the owner is verified yet, and it does not invent business photos or patient scenes to make the page look finished.</p>
    </div>
    <div class="proofgrid">
      <p>Public listing source: Greater Phoenix Chamber health-care directory.</p>
      <p>Business contact: ${htmlEscape(client.phone)} and ${htmlEscape(client.address)}.</p>
      <p>Owner claim remains open before stronger verification language, media, offers, or live operating details are added.</p>
    </div>
  </section>
  <section class="section wrap">
    <p class="eyebrow">Dental arrival moments</p>
    <h2>The base is ready for recurring front-office flows.</h2>
    <div class="moment-grid">${momentCards}</div>
  </section>
  <section class="section wrap">
    <div class="cta" id="workspace">
      <div>
        <p class="eyebrow">NorthStar workspace</p>
        <h2>${htmlEscape(client.name)} now has a dedicated SignInPro workspace base.</h2>
        <p class="copy">The landing opens the branded workspace inside NorthStar, while the public source listing remains the source for currently published directory facts.</p>
        <div class="note"><strong>No fake media policy</strong><p class="copy">No generated dental photos, no stock-like patient scenes, and no fake office screenshots are attached to this page. Add images only when the owner provides or approves real assets.</p></div>
        <div class="actions"><a class="btn primary" href="${workspacePath(client)}">Open NorthStar workspace</a><a class="btn" href="/valley-verified/claim/?business=${client.slug}">Owner claim path</a></div>
      </div>
      <div class="app-panel"><div class="screen"><strong>Workspace login ready</strong><div class="field">Owner email stored in internal ledger</div><div class="field">Temporary password stored in root env</div><div class="field">Password reset required</div><div class="submit-look">NorthStar SignInPro</div></div></div>
    </div>
  </section>
  <section class="section wrap">
    <p class="eyebrow">Good to know</p>
    <h2>What is live in the base.</h2>
    <div class="faq">
      <details open><summary>Is the business marked owner-verified?</summary><p>No. This page uses the public Valley Verified source record and keeps owner proof separate until the business claims or validates the listing.</p></details>
      <details><summary>Where is the app connection?</summary><p>The primary workspace route is ${workspacePath(client)}.</p></details>
      <details><summary>Where should current official details come from?</summary><p>The public source listing remains the directory handoff until the owner provides a confirmed website, hours, services, and approved media.</p></details>
    </div>
  </section>
</main>
<footer class="footer"><div class="wrap">Valley Verified dental base by MetrAIyux 0S / NorthStar SignInPro. Owner proof required before verified claims.</div></footer>
</body>
</html>`;
}

function guideHtml(client) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<title>${htmlEscape(client.name)} | NorthStar Arrival Guide</title>
<meta name="description" content="A source-bounded NorthStar guide for ${htmlEscape(client.name)} arrival, front-office handoffs, and owner proof routing.">
<style>${baseCss(client)}
.article{max-width:880px;margin:0 auto;padding:22px 0 70px}
.article p{font-size:18px;line-height:1.82;color:var(--muted)}
.article h2{font-size:32px;line-height:1.15;margin:42px 0 12px}
.callout{border:1px solid var(--line);border-radius:8px;padding:22px;margin:28px 0;background:rgba(255,255,255,.06)}
</style>
</head>
<body data-client="${client.slug}">
<header class="top">
  <div class="wrap">
    <a class="wordmark" href="../"><i class="mark"></i><strong>${htmlEscape(client.name)}<span>arrival guide</span></strong></a>
    <nav class="nav"><a href="../">Landing</a><a href="${workspacePath(client)}">Workspace</a><a href="${sourceUrl}" rel="noreferrer" target="_blank">Source</a></nav>
  </div>
</header>
<main>
  <section class="section wrap">
    <p class="eyebrow">NorthStar dental guide</p>
    <h1>${htmlEscape(client.name)} arrival without invented media.</h1>
    <p class="lede">A practical app-connected page first: source facts, intake lane, claim route, and no fake office or patient visuals.</p>
  </section>
  <article class="article">
    <p>The company base is intentionally source-bounded. The public landing gives patients, vendors, referrals, and staff a direct route into the ${htmlEscape(client.name)} NorthStar workspace. The page does not pretend the owner has verified the record yet.</p>
    <h2>What the workspace is prepared to handle</h2>
    <p>The NorthStar base is seeded for ${htmlEscape(client.usecases.join(", "))}. Those are operational flows, not marketing claims.</p>
    <h2>What stays out until proof arrives</h2>
    <p>Generated dental photos, stock-like patient scenes, fake office screenshots, unsupported service lists, and owner-verified language stay out of this build. Real assets can be added after the owner provides or approves them.</p>
    <div class="callout"><strong>Workspace route</strong><p><a href="${workspacePath(client)}">${workspacePath(client)}</a></p></div>
    <h2>How this becomes repeatable</h2>
    <p>The next company can keep the same pattern: sourced landing page, NorthStar workspace slug, internal login ledger, root env backup, source boundary, and media only when it is real.</p>
  </article>
</main>
<footer class="footer"><div class="wrap">Valley Verified dental guide by MetrAIyux 0S / NorthStar SignInPro.</div></footer>
</body>
</html>`;
}

function updateStaticFiles() {
  for (const client of clients) {
    const seed = seedEntry(client);
    jsonArrayUpsert(path.join(siteRoot, "northstar/assets/data/seed-workspaces.json"), seed);
    jsonArrayUpsert(path.join(northstarSourceRoot, "assets/data/seed-workspaces.json"), seed);
    const dirEntry = { name: client.name, image: "", mainUrl: sourceUrl, accent: client.colors.accent, accent2: client.colors.accent2, cta: client.cta };
    directoryUpsert(path.join(siteRoot, "northstar/assets/data/workspace-directory.js"), client.slug, dirEntry);
    directoryUpsert(path.join(northstarSourceRoot, "assets/data/workspace-directory.js"), client.slug, dirEntry);
    const registry = clientRegistryEntry(client);
    jsonArrayUpsert(path.join(siteRoot, "valley-verified/_shared/clients.json"), registry);
    jsonArrayUpsert(path.join(sourceRoot, "_shared/clients.json"), registry);
    write(landingFile(client, siteRoot), landingHtml(client));
    write(guideFile(client, siteRoot), guideHtml(client));
    write(sourceLandingFile(client), landingHtml(client));
    write(sourceGuideFile(client), guideHtml(client));
  }
}

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function jsonSql(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `s1:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function stateHash(state) {
  return crypto.createHash("sha256").update(JSON.stringify(state || {})).digest("hex");
}

function provisionSql(client, password) {
  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const workspaceUserId = crypto.randomUUID();
  const email = ownerEmail(client);
  const passwordHash = hashPassword(password);
  const metadata = metadataFor(client);
  const state = seedEntry(client).initialState;
  state.workspace.id = workspaceId;
  state.audit = [{ at: new Date().toISOString(), action: "workspace_provisioned", detail: "Dental NorthStar workspace provisioned from the Valley Verified source record. Owner proof still required." }];
  const profile = { source_app: "northstar-signinpro", workspace_slug: client.slug, workspace_id: workspaceId, workspace_role: "owner" };
  const auditMeta = { source_app: "northstar-signinpro", workspace_slug: client.slug, owner_email: email, media_policy: metadata.mediaPolicy };
  return `
INSERT INTO customers(email, communication_email, skyemail, plan_name, is_active)
VALUES (${sqlString(email)}, ${sqlString(email)}, NULL, 'provided-infrastructure', true)
ON CONFLICT (email) DO UPDATE SET communication_email = excluded.communication_email, plan_name = excluded.plan_name, is_active = true;

WITH customer AS (SELECT id FROM customers WHERE lower(email)=lower(${sqlString(email)}) LIMIT 1),
upsert_user AS (
  INSERT INTO users(id, email, email_normalized, display_name, communication_email, skyemail, primary_customer_id, role, profile, password_reset_required, provisioned_at, provisioned_by, updated_at)
  SELECT ${sqlString(userId)}, ${sqlString(email)}, ${sqlString(email)}, ${sqlString(client.name)}, ${sqlString(email)}, NULL, customer.id, 'owner', ${jsonSql(profile)}, true, now(), 'direct-local-northstar-dental-bases', now()
  FROM customer
  ON CONFLICT (email) DO UPDATE SET
    email_normalized = excluded.email_normalized,
    display_name = excluded.display_name,
    communication_email = excluded.communication_email,
    primary_customer_id = coalesce(users.primary_customer_id, excluded.primary_customer_id),
    role = 'owner',
    profile = users.profile || excluded.profile,
    password_reset_required = true,
    provisioned_at = coalesce(users.provisioned_at, now()),
    provisioned_by = coalesce(users.provisioned_by, 'direct-local-northstar-dental-bases'),
    updated_at = now()
  RETURNING id
)
INSERT INTO user_passwords(user_id, password_hash, password_updated_at)
SELECT id, ${sqlString(passwordHash)}, now() FROM upsert_user
ON CONFLICT (user_id) DO UPDATE SET password_hash = excluded.password_hash, password_updated_at = now();

WITH customer AS (SELECT id FROM customers WHERE lower(email)=lower(${sqlString(email)}) LIMIT 1)
INSERT INTO workspaces(id, slug, name, status, plan, primary_customer_id, communication_email, skyemail, metadata, updated_at)
SELECT ${sqlString(workspaceId)}, ${sqlString(client.slug)}, ${sqlString(client.name)}, 'active', 'provided-infrastructure', customer.id, ${sqlString(email)}, NULL, ${jsonSql(metadata)}, now()
FROM customer
ON CONFLICT (slug) DO UPDATE SET
  name = excluded.name,
  status = 'active',
  plan = excluded.plan,
  primary_customer_id = coalesce(workspaces.primary_customer_id, excluded.primary_customer_id),
  communication_email = excluded.communication_email,
  metadata = workspaces.metadata || excluded.metadata,
  updated_at = now();

WITH workspace AS (SELECT id FROM workspaces WHERE slug=${sqlString(client.slug)} LIMIT 1),
gate_user AS (SELECT id FROM users WHERE email_normalized=${sqlString(email)} LIMIT 1)
INSERT INTO workspace_users(id, workspace_id, linked_user_id, email, communication_email, skyemail, password_hash, role, status, updated_at)
SELECT ${sqlString(workspaceUserId)}, workspace.id, gate_user.id, ${sqlString(email)}, ${sqlString(email)}, NULL, ${sqlString(passwordHash)}, 'owner', 'active', now()
FROM workspace, gate_user
ON CONFLICT (workspace_id, email) DO UPDATE SET
  linked_user_id = excluded.linked_user_id,
  communication_email = excluded.communication_email,
  password_hash = excluded.password_hash,
  role = 'owner',
  status = 'active',
  updated_at = now();

WITH workspace AS (SELECT id FROM workspaces WHERE slug=${sqlString(client.slug)} LIMIT 1),
workspace_user AS (SELECT wu.id FROM workspace_users wu JOIN workspace w ON w.id=wu.workspace_id WHERE lower(wu.email)=lower(${sqlString(email)}) LIMIT 1)
INSERT INTO workspace_settings(workspace_id, branding, app_settings, security_settings, updated_by, updated_at)
SELECT workspace.id, ${jsonSql(metadata.branding)}, ${jsonSql(metadata.appSettings)}, ${jsonSql(metadata.securitySettings)}, workspace_user.id, now()
FROM workspace, workspace_user
ON CONFLICT (workspace_id) DO UPDATE SET
  branding = workspace_settings.branding || excluded.branding,
  app_settings = workspace_settings.app_settings || excluded.app_settings,
  security_settings = workspace_settings.security_settings || excluded.security_settings,
  updated_by = excluded.updated_by,
  updated_at = now();

WITH workspace AS (SELECT id FROM workspaces WHERE slug=${sqlString(client.slug)} LIMIT 1),
workspace_user AS (SELECT wu.id FROM workspace_users wu JOIN workspace w ON w.id=wu.workspace_id WHERE lower(wu.email)=lower(${sqlString(email)}) LIMIT 1)
INSERT INTO workspace_states(workspace_id, state, state_hash, revision, updated_by, updated_at)
SELECT workspace.id, ${jsonSql(state)}, ${sqlString(stateHash(state))}, 1, workspace_user.id, now()
FROM workspace, workspace_user
ON CONFLICT (workspace_id) DO UPDATE SET
  state = excluded.state,
  state_hash = excluded.state_hash,
  revision = workspace_states.revision + 1,
  updated_by = excluded.updated_by,
  updated_at = now();

WITH workspace AS (SELECT id FROM workspaces WHERE slug=${sqlString(client.slug)} LIMIT 1),
workspace_user AS (SELECT wu.id FROM workspace_users wu JOIN workspace w ON w.id=wu.workspace_id WHERE lower(wu.email)=lower(${sqlString(email)}) LIMIT 1)
INSERT INTO workspace_audit_events(workspace_id, user_id, action, detail, data)
SELECT workspace.id, workspace_user.id, 'workspace_provisioned', 'Dental NorthStar workspace created or refreshed.', ${jsonSql(auditMeta)}
FROM workspace, workspace_user;

INSERT INTO audit_events(actor, action, target, meta)
VALUES ('northstar-signinpro', 'NORTHSTAR_WORKSPACE_PROVISIONED', ${sqlString(`workspace:${client.slug}`)}, ${jsonSql(auditMeta)});
`;
}

async function verifyLiveLogin(client, password) {
  const res = await fetch(`${productionOrigin}/api/northstar/auth-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceSlug: client.slug, email: ownerEmail(client), password })
  });
  const body = await res.json().catch(() => ({}));
  return {
    ok: !!(res.ok && body?.ok && body?.workspace?.slug === client.slug),
    status: res.status
  };
}

function sanitizeError(text) {
  return String(text || "")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL]")
    .replace(/s1:[0-9a-f]{32}:[0-9a-f]{80,}/gi, "[PASSWORD_HASH]")
    .split("\n")
    .slice(0, 10)
    .join("\n");
}

async function provisionLive(passwords, envText) {
  const dbUrl = parseLastEnvValue(envText, "DATABASE_URL") || parseLastEnvValue(envText, "NETLIFY_DATABASE_URL");
  if (!dbUrl) return Object.fromEntries(clients.map((client) => [client.slug, { status: "seeded; missing database url", loginOk: false }]));
  const sql = `BEGIN;\nSET search_path TO public,jobping,skymail,neon_auth;\n${clients.map((client) => provisionSql(client, passwords[client.slug])).join("\n")}\nCOMMIT;\n`;
  const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (psql.status !== 0) {
    return Object.fromEntries(clients.map((client) => [client.slug, { status: `seeded; live DB provision failed: ${sanitizeError(psql.stderr || psql.stdout)}`, loginOk: false }]));
  }
  const out = {};
  for (const client of clients) {
    const login = await verifyLiveLogin(client, passwords[client.slug]);
    out[client.slug] = {
      status: login.ok ? "seeded + live DB login verified" : `seeded + live DB provisioned; login check failed (${login.status})`,
      loginOk: login.ok,
      httpStatus: login.status,
      verifiedAt: login.ok ? new Date().toISOString() : ""
    };
  }
  return out;
}

function replaceSection(text, marker, section) {
  const index = text.indexOf(marker);
  if (index < 0) return `${text.replace(/\s+$/, "")}\n\n${section}`;
  const prefix = text.slice(0, index).replace(/\s+$/, "");
  const rest = text.slice(index + marker.length);
  const next = rest.search(/\n## /);
  const suffix = next >= 0 ? rest.slice(next) : "";
  return `${prefix}\n\n${section}${suffix}`;
}

function updateLedger(passwords, statuses) {
  const marker = "## NorthStar SignInPro dental bases - 2026-05-20";
  let ledger = read(ledgerPath);
  ledger = replaceSection(ledger, "## NorthStar SignInPro dental base - 2026-05-20", "");
  ledger = replaceSection(ledger, marker, "");
  const rows = clients.map((client) => {
    return `| ${client.name} | \`${landingFile(client, siteRoot)}\` | \`${productionOrigin}${workspacePath(client)}\` | \`${ownerEmail(client)}\` | \`${passwords[client.slug]}\` | \`true\` | \`${sourceUrl}\` | ${statuses[client.slug]?.status || "seeded"} |`;
  }).join("\n");
  const section = `${marker}\n\n| Company | Valley landing | NorthStar workspace | Workspace login email | Temporary password | Password reset required | Source listing | Provisioning status |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n- Media rule: no generated dental photos, no placeholder gallery, no simulated patient imagery, no fake office screenshots. Use owner-provided assets only after claim.\n- Owner proof state: these dental bases are not owner-verified yet; the NorthStar workspaces are prepared from Valley Verified public source records.\n`;
  ledger = replaceSection(ledger, marker, section);
  write(ledgerPath, ledger);
}

function updateEnv(passwords, statuses) {
  let envText = read(envPath);
  const oldStart = "# NORTHSTAR DENTAL CLIENT BASE - 2026-05-20";
  const oldEnd = "# END NORTHSTAR DENTAL CLIENT BASE - 2026-05-20";
  const newStart = "# NORTHSTAR DENTAL CLIENT BASES - 2026-05-20";
  const newEnd = "# END NORTHSTAR DENTAL CLIENT BASES - 2026-05-20";
  envText = envText.replace(new RegExp(`\\n?${oldStart}[\\s\\S]*?${oldEnd}\\n?`, "m"), "\n");
  envText = envText.replace(new RegExp(`\\n?${newStart}[\\s\\S]*?${newEnd}\\n?`, "m"), "\n");
  const lines = ["", newStart, `NORTHSTAR_DENTAL_CLIENTS=${envQuote(clients.map((client) => client.slug).join(","))}`];
  for (const client of clients) {
    const key = safeVarKey(client);
    lines.push(
      `NORTHSTAR_DENTAL_${key}_CLIENT=${envQuote(client.name)}`,
      `NORTHSTAR_DENTAL_${key}_WORKSPACE_SLUG=${envQuote(client.slug)}`,
      `NORTHSTAR_DENTAL_${key}_LOGIN_URL=${envQuote(`${productionOrigin}${workspacePath(client)}`)}`,
      `NORTHSTAR_DENTAL_${key}_OWNER_EMAIL=${envQuote(ownerEmail(client))}`,
      `NORTHSTAR_DENTAL_${key}_TEMP_PASSWORD=${envQuote(passwords[client.slug])}`,
      `NORTHSTAR_DENTAL_${key}_PASSWORD_RESET_REQUIRED=${envQuote("true")}`,
      `NORTHSTAR_DENTAL_${key}_VALLEY_LANDING=${envQuote(landingFile(client, siteRoot))}`,
      `NORTHSTAR_DENTAL_${key}_PUBLIC_URL=${envQuote(publicUrl(client))}`,
      `NORTHSTAR_DENTAL_${key}_SOURCE_URL=${envQuote(sourceUrl)}`,
      `NORTHSTAR_DENTAL_${key}_PHONE=${envQuote(client.phone)}`,
      `NORTHSTAR_DENTAL_${key}_ADDRESS=${envQuote(client.address)}`,
      `NORTHSTAR_DENTAL_${key}_PROVISIONING_STATUS=${envQuote(statuses[client.slug]?.status || "seeded")}`,
      `NORTHSTAR_DENTAL_${key}_LIVE_LOGIN_VERIFIED_AT=${envQuote(statuses[client.slug]?.verifiedAt || "")}`
    );
  }
  const first = clients[0];
  const firstKey = safeVarKey(first);
  lines.push(
    `NORTHSTAR_DENTAL_BASE_CLIENT=${envQuote(first.name)}`,
    `NORTHSTAR_DENTAL_BASE_WORKSPACE_SLUG=${envQuote(first.slug)}`,
    `NORTHSTAR_DENTAL_BASE_LOGIN_URL=${envQuote(`${productionOrigin}${workspacePath(first)}`)}`,
    `NORTHSTAR_DENTAL_BASE_OWNER_EMAIL=${envQuote(ownerEmail(first))}`,
    `NORTHSTAR_DENTAL_BASE_TEMP_PASSWORD=${envQuote(passwords[first.slug])}`,
    `NORTHSTAR_DENTAL_BASE_PASSWORD_RESET_REQUIRED=${envQuote("true")}`,
    `NORTHSTAR_DENTAL_BASE_VALLEY_LANDING=${envQuote(landingFile(first, siteRoot))}`,
    `NORTHSTAR_DENTAL_BASE_PUBLIC_URL=${envQuote(publicUrl(first))}`,
    `NORTHSTAR_DENTAL_BASE_SOURCE_URL=${envQuote(sourceUrl)}`,
    `NORTHSTAR_DENTAL_BASE_LOGIN_LEDGER=${envQuote(ledgerPath)}`,
    `NORTHSTAR_DENTAL_BASE_MEDIA_POLICY=${envQuote("No generated or placeholder dental media; owner-provided assets only after claim.")}`,
    `NORTHSTAR_DENTAL_BASE_PROVISIONING_STATUS=${envQuote(statuses[first.slug]?.status || "seeded")}`,
    `NORTHSTAR_DENTAL_BASE_LIVE_LOGIN_VERIFIED_AT=${envQuote(statuses[first.slug]?.verifiedAt || "")}`,
    newEnd
  );
  void firstKey;
  write(envPath, `${envText.replace(/\s+$/, "")}${lines.join("\n")}\n`);
}

async function main() {
  const envText = read(envPath);
  const passwords = Object.fromEntries(clients.map((client) => [client.slug, passwordFor(client, envText)]));
  updateStaticFiles();
  const statuses = await provisionLive(passwords, envText);
  updateLedger(passwords, statuses);
  updateEnv(passwords, statuses);
  console.log(JSON.stringify({
    ok: Object.values(statuses).every((status) => status.loginOk),
    clients: clients.map((client) => ({
      slug: client.slug,
      name: client.name,
      status: statuses[client.slug]?.status,
      landing: landingFile(client, siteRoot),
      guide: guideFile(client, siteRoot)
    }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
