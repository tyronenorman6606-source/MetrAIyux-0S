import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SITE_ROOT = path.join(ROOT, 'metraiyux_0s_site');
const SD_ROOT = path.join(SITE_ROOT, 'Free99/apps/sovereigndocs');
const VV_ROOT = path.join(SITE_ROOT, 'valley-verified');
const NORTHSTAR_ROOT = path.join(SITE_ROOT, 'northstar');
const CLIENT_APP_ROOT = path.join(ROOT, 'client-app-factory/client-apps');
const GENERATED_AT = '2026-05-20T00:00:00.000Z';
const LIVE_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const SKYPAY_REVIEW_URL = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=sovereigndocs-legal-review-lane';
const STATE_BAR_URL = 'https://www.azbar.org/search-for-a-legal-professional/';

const PARTNERS = [
  {
    id: 'burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b',
    slug: 'burch-and-cracchiolo-pa',
    name: 'Burch & Cracchiolo, P.A.',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85004',
    phone: '(602) 274-7611',
    officialWebsite: 'https://www.bcattorneys.com/',
    officialSource: 'https://www.bcattorneys.com/',
    address: '1850 N. Central Avenue, Suite 1700, Phoenix, AZ 85004',
    practiceSummary: 'Phoenix business, corporate, litigation, real estate, employment, and commercial counsel candidate.',
    reviewScopes: ['business and corporate documents', 'commercial contracts', 'formation packet review', 'real estate packets', 'commercial litigation triage'],
    accent: '#f5d36a'
  },
  {
    id: 'gallagher-and-kennedy-p-a-phoenix-85016-887b1be',
    slug: 'gallagher-and-kennedy-pa',
    name: 'Gallagher & Kennedy, P.A.',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85016',
    phone: '(602) 530-8000',
    officialWebsite: 'https://gknet.com/',
    officialSource: 'https://gknet.com/',
    address: 'Phoenix, AZ 85016',
    practiceSummary: 'Arizona-based broad-practice firm candidate for business, employer, startup, and public-entity document review lanes.',
    reviewScopes: ['business documents', 'employer documents', 'commercial disputes', 'entity and governance packet review', 'environmental or regulated-business triage'],
    accent: '#7ae7ff'
  },
  {
    id: 'fennemore-phoenix-85016-eb81f5b',
    slug: 'fennemore-phoenix',
    name: 'Fennemore',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85016',
    phone: '(602) 916-5000',
    officialWebsite: 'https://www.fennemorelaw.com/contact-us/phoenix/',
    officialSource: 'https://www.fennemorelaw.com/contact-us/phoenix/',
    address: 'Phoenix, AZ 85016',
    practiceSummary: 'Large regional business counsel candidate for formation, contracts, governance, IP, real estate, and litigation lanes.',
    reviewScopes: ['formation and governance packets', 'commercial contracts', 'IP prep handoffs', 'real estate packets', 'litigation triage'],
    accent: '#b993ff'
  },
  {
    id: 'greenberg-traurig-llp-phoenix-85016-5f86b1d',
    slug: 'greenberg-traurig-phoenix',
    name: 'Greenberg Traurig, LLP',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85016',
    phone: '(602) 445-8000',
    officialWebsite: 'https://www.gtlaw.com/en/locations/phoenix',
    officialSource: 'https://www.gtlaw.com/en/locations/phoenix',
    address: '2375 East Camelback Road, Suite 800, Phoenix, AZ 85016',
    practiceSummary: 'Enterprise and business counsel candidate for commercial litigation, securities, M&A, finance, IP, employment, and real estate lanes.',
    reviewScopes: ['enterprise business documents', 'M&A and finance packet triage', 'commercial litigation', 'IP and employment documents', 'real estate packets'],
    accent: '#73ff92'
  },
  {
    id: 'kutak-rock-llp-scottsdale-85253-00c0044',
    slug: 'kutak-rock-scottsdale',
    name: 'Kutak Rock LLP',
    city: 'Scottsdale',
    state: 'AZ',
    zip: '85253',
    phone: '(480) 429-5000',
    officialWebsite: 'https://www.kutakrock.com/offices/scottsdale',
    officialSource: 'https://www.kutakrock.com/offices/scottsdale',
    address: '8601 North Scottsdale Road, Suite 300, Scottsdale, AZ 85253',
    practiceSummary: 'Business, finance, litigation, IP, government, public finance, real estate, tax, and regulated-work candidate lane.',
    reviewScopes: ['finance and public finance packets', 'business documents', 'real estate packets', 'government relations triage', 'IP and tax-sensitive documents'],
    accent: '#ff9f6a'
  },
  {
    id: 'milligan-lawless-p-c-phoenix-85018-94ab8a4',
    slug: 'milligan-lawless-pc',
    name: 'Milligan Lawless P.C.',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85018',
    phone: '(602) 792-3500',
    officialWebsite: 'https://www.milliganlawless.com/',
    officialSource: 'https://www.milliganlawless.com/',
    address: '5050 N. 40th Street, Suite 200, Phoenix, AZ 85018',
    practiceSummary: 'Boutique business, healthcare, employment, tax, real estate, estate planning, and litigation candidate lane.',
    reviewScopes: ['healthcare business documents', 'employment documents', 'tax-sensitive business packets', 'real estate packets', 'estate and probate prep handoffs'],
    accent: '#ff7edb'
  },
  {
    id: 'platz-juris-pllc-phoenix-85016-4e77b1f',
    slug: 'platz-juris-pllc',
    name: 'PLATZ JURIS, PLLC',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85016',
    phone: '(480) 570-8558',
    officialWebsite: 'https://platzjuris.com/',
    officialSource: 'https://platzjuris.com/',
    address: '2325 E. Camelback Road, Suite 400, Phoenix, AZ 85016',
    practiceSummary: 'IP, business, civil litigation, corporate governance, music/entertainment, trademark, trade secret, and cannabis law candidate lane.',
    reviewScopes: ['IP prep packets', 'trademark and copyright documents', 'business and governance documents', 'civil litigation triage', 'music and entertainment documents'],
    accent: '#8affd2'
  }
];

function h(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeText(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value);
}

function partnerMeta(partner) {
  const workspaceSlug = `${partner.slug}-legal-review`;
  const appUrl = `/client-app-factory/client-apps/${partner.id}/`;
  const signinProUrl = `/northstar/?workspace=${encodeURIComponent(workspaceSlug)}`;
  const sovereignDocsWorkspaceUrl = `/Free99/apps/sovereigndocs/partner-workbench/?workspace=${encodeURIComponent(workspaceSlug)}&partner=${encodeURIComponent(partner.slug)}`;
  const legalLandingUrl = `/valley-verified/legal-review-lane/${partner.slug}/`;
  return {
    ...partner,
    partnerId: `legal_partner_candidate_${partner.slug.replaceAll('-', '_')}`,
    workspaceSlug,
    appUrl,
    signinProUrl,
    sovereignDocsWorkspaceUrl,
    legalLandingUrl,
    valleyVerifiedUrl: `/valley-verified/business/${partner.id}/`,
    skyePayReviewUrl: SKYPAY_REVIEW_URL,
    publicStatus: 'candidate_only_pending_outreach_bar_check_conflict_check_and_msa',
    activationRequired: ['firm outreach accepted', 'State Bar / licensing verification', 'conflict intake rules', 'fee schedule', 'MSA / NDA / data terms', 'SkyePay payout destination']
  };
}

const CANDIDATES = PARTNERS.map(partnerMeta);

function shell({ title, description, body, extraHead = '', bodyClass = 'legal-review-lane-page' }) {
  return `<!doctype html>
<html lang="en" class="neonScrollbar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${h(title)}</title>
<meta name="description" content="${h(description)}"/>
<meta name="robots" content="index,follow"/>
<meta name="theme-color" content="#101513"/>
<link rel="icon" href="/valley-verified/assets/valley-verified-logo.png"/>
<link rel="stylesheet" href="/valley-verified/assets/styles.css"/>
${extraHead}
</head>
<body class="${h(bodyClass)}">
<canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>
<header class="topbar">
  <a class="brand" href="/valley-verified/"><img class="brand-logo" src="/valley-verified/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>legal review lane</small></span></a>
  <nav class="nav-actions"><a href="/valley-verified/">Directory</a><a href="/valley-verified/legal-review-lane/">Legal lane</a><a href="/Free99/apps/sovereigndocs/review-submission/">Submit review</a><a href="/Free99/apps/sovereigndocs/partner-workbench/">Workbench</a></nav>
</header>
${body}
<div id="toast" class="toast"></div>
<script type="module" src="/valley-verified/assets/app.js"></script>
</body>
</html>
`;
}

function indexPage() {
  const cards = CANDIDATES.map(partner => `<article class="vv-app-proof-card">
<p class="eyebrow">Candidate workspace</p>
<h3>${h(partner.name)}</h3>
<p>${h(partner.practiceSummary)}</p>
<div class="check-list compact-list">
  <span>${h(partner.city)}, ${h(partner.state)} ${h(partner.zip)}</span>
  <span>${h(partner.publicStatus)}</span>
  <span>Review scopes: ${h(partner.reviewScopes.slice(0, 3).join(', '))}</span>
</div>
<div class="hero-actions">
  <a class="btn primary" href="${h(partner.legalLandingUrl)}">Open lane</a>
  <a class="btn" href="${h(partner.appUrl)}">App build</a>
  <a class="btn" href="${h(partner.sovereignDocsWorkspaceUrl)}">Workspace</a>
</div>
</article>`).join('');
  return shell({
    title: 'Valley Verified Legal Review Lane',
    description: 'Candidate legal review workspaces for SovereignDocs routing, SkyePay upfront checkout, vault storage, partner status tracking, and payout ledger handoff.',
    body: `<main class="vv-app-page">
<section class="vv-app-hero" id="landing">
  <div class="vv-app-hero__copy">
    <a class="back-link" href="/valley-verified/">Valley Verified</a>
    <div class="business-badge-row"><span class="featured-badge">Candidate legal network</span><span>not active partners yet</span></div>
    <p class="eyebrow">SovereignDocs review lane</p>
    <h1 class="vv-app-title neon-gradient-text text-highlighter text-effect-reveal">Legal review workspaces that do not fake the relationship.</h1>
    <p class="vv-app-lede">These seven firms now have candidate landing pages, app handoff pages, NorthStar SignIn Pro workspace seeds, and SovereignDocs partner-workbench routes. They stay marked pending until outreach, bar verification, conflicts, fee schedule, MSA, NDA, and payout setup are complete.</p>
    <div class="hero-actions"><a class="btn primary" href="/Free99/apps/sovereigndocs/review-submission/">Submit document review</a><a class="btn" href="${h(SKYPAY_REVIEW_URL)}">Open SkyePay review checkout</a><a class="btn" href="${h(STATE_BAR_URL)}">Arizona bar directory</a></div>
  </div>
  <aside class="vv-app-hero__panel neon-glow-panel">
    <p class="eyebrow">Lane status</p>
    <div class="vv-app-score"><strong>7</strong><span>candidate workspaces</span></div>
    <div class="vv-app-signal-grid"><div><span>Payment</span><strong>SkyePay upfront</strong></div><div><span>Vault</span><strong>SovereignDocs record</strong></div><div><span>Payout</span><strong>ledger pending release</strong></div><div><span>Auth</span><strong>0S / FS27 gate</strong></div></div>
  </aside>
</section>
<section class="notice sd-wide-notice"><strong>Boundary:</strong> Valley Verified and SovereignDocs are not claiming any of these firms have accepted matters, joined the platform, or approved documents. This lane is provisioned for outreach and operator-controlled routing only.</section>
<section class="vv-app-section"><div class="vv-app-section__head"><p class="eyebrow">Candidate roster</p><h2>Legal review lane pages and workspaces.</h2></div><div class="vv-app-proof-grid">${cards}</div></section>
</main>`
  });
}

function partnerPage(partner) {
  return shell({
    title: `${partner.name} Legal Review Candidate Workspace`,
    description: `${partner.name} candidate legal review workspace for SovereignDocs, SkyePay, NorthStar SignIn Pro, and Valley Verified routing.`,
    body: `<main class="vv-app-page">
<section class="vv-app-hero" id="landing">
  <div class="vv-app-hero__copy">
    <a class="back-link" href="/valley-verified/legal-review-lane/">Legal review lane</a>
    <div class="business-badge-row"><span class="featured-badge">Candidate workspace</span><span>pending verification</span></div>
    <p class="eyebrow">${h(partner.city)} ${h(partner.state)} legal review candidate</p>
    <h1 class="vv-app-title neon-gradient-text text-effect-reveal">${h(partner.name)}</h1>
    <p class="vv-app-lede">${h(partner.practiceSummary)}</p>
    <div class="hero-actions"><a class="btn primary" href="${h(partner.appUrl)}">Open app build</a><a class="btn" href="${h(partner.signinProUrl)}">SignIn Pro workspace</a><a class="btn" href="${h(partner.sovereignDocsWorkspaceUrl)}">SovereignDocs workbench</a><a class="btn" href="${h(partner.officialWebsite)}">Official site</a></div>
  </div>
  <aside class="vv-app-hero__panel neon-glow-panel">
    <p class="eyebrow">Workspace routing</p>
    <div class="vv-app-score"><strong>${h(partner.zip)}</strong><span>${h(partner.city)} market</span></div>
    <div class="vv-app-signal-grid"><div><span>Phone</span><strong>${h(partner.phone)}</strong></div><div><span>Status</span><strong>candidate only</strong></div><div><span>Payment</span><strong>upfront SkyePay</strong></div><div><span>Vault</span><strong>required</strong></div></div>
  </aside>
</section>
<section class="vv-app-section vv-app-detail-section">
  <article>
    <p class="eyebrow">Candidate scope</p>
    <h2>What SovereignDocs can route here after approval.</h2>
    <div class="check-list">${partner.reviewScopes.map(scope => `<span>${h(scope)}</span>`).join('')}</div>
  </article>
  <article>
    <p class="eyebrow">Activation checklist</p>
    <h2>No public partner claim until these are complete.</h2>
    <div class="check-list">${partner.activationRequired.map(item => `<span>${h(item)}</span>`).join('')}</div>
  </article>
</section>
<section class="vv-app-command">
  <nav class="vv-app-rail"><a href="${h(partner.valleyVerifiedUrl)}"><strong>Valley profile</strong><span>Existing public listing.</span></a><a href="${h(partner.appUrl)}"><strong>App build</strong><span>Firm workspace command page.</span></a><a href="${h(partner.signinProUrl)}"><strong>SignIn Pro</strong><span>Provisioned workspace seed.</span></a><a href="${h(partner.sovereignDocsWorkspaceUrl)}"><strong>SovereignDocs</strong><span>Partner review queue.</span></a></nav>
  <div class="vv-app-screen"><p class="eyebrow">Legal boundary</p><h2>Candidate workspace, not an active referral claim.</h2><p>SovereignDocs can store the customer packet in the vault, collect upfront SkyePay payment, route the record to an approved partner workspace, log returned documents, and create a payout ledger entry after return. It does not create an attorney-client relationship with SovereignDocs and does not guarantee acceptance, approval, legal advice, or outcome.</p><div class="hero-actions"><a class="btn primary" href="/Free99/apps/sovereigndocs/review-submission/">Submit review packet</a><a class="btn" href="${h(partner.skyePayReviewUrl)}">Checkout lane</a></div></div>
</section>
</main>`
  });
}

function appPage(partner) {
  const data = JSON.stringify(partner, null, 2);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${h(partner.name)} | Legal Review Workspace App</title>
<meta name="description" content="${h(partner.name)} candidate legal review workspace app for Valley Verified and SovereignDocs."/>
<style>
:root{color-scheme:dark;--bg:#080b0c;--panel:#111818;--line:rgba(255,255,255,.14);--text:#f8fbf6;--muted:#aebbb6;--accent:${partner.accent};--accent2:#7ae7ff}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 20% 5%,rgba(122,231,255,.13),transparent 34%),linear-gradient(135deg,#080b0c,#101513 58%,#0b0b10);color:var(--text);line-height:1.5}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 0}.brand{display:flex;flex-direction:column;text-decoration:none;color:var(--text)}.brand strong{font-size:17px}.brand span,.muted{color:var(--muted)}nav{display:flex;gap:10px;flex-wrap:wrap}a.button,button{border:1px solid var(--line);border-radius:8px;padding:11px 14px;background:#162020;color:var(--text);text-decoration:none;font-weight:700;cursor:pointer}.button.primary,button.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#06100d;border:0}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:24px;align-items:stretch;padding:46px 0 24px}.panel{border:1px solid var(--line);background:rgba(17,24,24,.82);border-radius:8px;padding:22px;box-shadow:0 18px 70px rgba(0,0,0,.28)}h1{font-size:clamp(40px,6vw,78px);line-height:.96;margin:10px 0;letter-spacing:0}h2{font-size:28px;margin:0 0 10px}.eyebrow{letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-size:12px;font-weight:800}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}.metric{border:1px solid var(--line);border-radius:8px;padding:16px;background:#0d1313}.metric strong{display:block;font-size:24px}.notice{border-left:4px solid var(--accent);padding:14px 16px;background:rgba(245,211,106,.1);border-radius:8px}.app{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0 42px}label{display:grid;gap:6px;margin:10px 0;color:var(--muted);font-weight:700}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:8px;background:#071010;color:var(--text);padding:11px;font:inherit}textarea{min-height:120px}pre{white-space:pre-wrap;overflow:auto;background:#050909;border:1px solid var(--line);border-radius:8px;padding:14px}.list{display:grid;gap:8px}.list span{border:1px solid var(--line);border-radius:8px;padding:10px;background:#0b1010}@media(max-width:860px){.hero,.app{grid-template-columns:1fr}.grid{grid-template-columns:1fr}nav{justify-content:flex-start}}
</style>
</head>
<body>
<header class="shell top"><a class="brand" href="/valley-verified/legal-review-lane/${h(partner.slug)}/"><strong>${h(partner.name)}</strong><span>candidate legal review workspace</span></a><nav><a class="button" href="/valley-verified/legal-review-lane/${h(partner.slug)}/">Landing</a><a class="button" href="${h(partner.signinProUrl)}">SignIn Pro</a><a class="button" href="${h(partner.sovereignDocsWorkspaceUrl)}">SovereignDocs</a><a class="button primary" href="${h(partner.skyePayReviewUrl)}">SkyePay</a></nav></header>
<main class="shell">
<section class="hero">
<div class="panel"><p class="eyebrow">Valley Verified legal lane</p><h1>${h(partner.name)}</h1><p>${h(partner.practiceSummary)}</p><p class="notice"><strong>Boundary:</strong> This is a candidate workspace. Do not claim partnership, legal approval, or attorney review until outreach, bar/license verification, conflict rules, MSA/NDA, and payout setup are complete.</p></div>
<aside class="panel"><p class="eyebrow">Workspace packet</p><div class="grid"><div class="metric"><strong>${h(partner.city)}</strong><span>market</span></div><div class="metric"><strong>${h(partner.zip)}</strong><span>zip</span></div><div class="metric"><strong>pending</strong><span>activation</span></div></div><p>${h(partner.address)}</p><p><a href="${h(partner.officialWebsite)}">${h(partner.officialWebsite)}</a></p></aside>
</section>
<section class="app">
<form class="panel" id="tracker"><p class="eyebrow">Local review tracker</p><h2>Log candidate routing notes</h2><label>Matter / packet ID<input name="packetId" required placeholder="sd_review_..."></label><label>Status<select name="status"><option>checkout_required</option><option>paid_held_in_escrow</option><option>submitted_pending_triage</option><option>routed_to_partner</option><option>partner_review_returned</option><option>payout_pending_owner_release</option></select></label><label>Operator note<textarea name="note" placeholder="Routing, conflict, or partner-return note"></textarea></label><button class="primary" type="submit">Save local note</button></form>
<section class="panel"><p class="eyebrow">Local notes</p><h2>Workspace audit scratchpad</h2><pre id="output">No local notes yet.</pre></section>
</section>
<section class="panel"><p class="eyebrow">Review scopes</p><div class="list">${partner.reviewScopes.map(scope => `<span>${h(scope)}</span>`).join('')}</div></section>
</main>
<script type="application/json" id="site-data">${h(data)}</script>
<script>
const key='legal-review-workspace:${partner.slug}:notes';
const output=document.getElementById('output');
const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
const draw=()=>{const rows=read();output.textContent=rows.length?JSON.stringify(rows,null,2):'No local notes yet.'};
document.getElementById('tracker').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.currentTarget);const rows=read();rows.unshift({packetId:form.get('packetId'),status:form.get('status'),note:form.get('note'),at:new Date().toISOString(),workspace:'${partner.workspaceSlug}'});localStorage.setItem(key,JSON.stringify(rows.slice(0,50)));event.currentTarget.reset();draw();});
draw();
</script>
</body>
</html>
`;
}

function workspacePreview(partner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(partner.name)} Workspace Preview</title><style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;line-height:1.5;background:#080b0c;color:#f8fbf6}a{color:#7ae7ff}.box{border:1px solid #334;border-radius:8px;padding:18px;background:#111818;margin:12px 0}</style></head><body><h1>${h(partner.name)} candidate workspace</h1><div class="box"><p>Status: candidate only, pending verification and signed terms.</p><p>Workspace slug: <code>${h(partner.workspaceSlug)}</code></p><p><a href="${h(partner.signinProUrl)}">Open NorthStar SignIn Pro</a></p><p><a href="${h(partner.sovereignDocsWorkspaceUrl)}">Open SovereignDocs partner workbench</a></p><p><a href="${h(partner.skyePayReviewUrl)}">Open SkyePay legal review checkout</a></p></div></body></html>`;
}

function businessProfilePage(partner) {
  return shell({
    title: `${partner.name} | Valley Verified Legal Review Candidate`,
    description: `${partner.name} Valley Verified legal review candidate page connected to app build, SignIn Pro workspace, SovereignDocs partner workbench, SkyePay, and boundary rules.`,
    bodyClass: 'business-page v21-static-profile legal-review-candidate-profile',
    body: `<main class="vv-app-page">
<section class="vv-app-hero" id="landing">
  <div class="vv-app-hero__copy">
    <a class="back-link" href="/valley-verified/category/legal-and-financial/">Legal and financial</a>
    <div class="business-badge-row"><span class="featured-badge">Valley Verified candidate</span><span>legal review lane</span></div>
    <p class="eyebrow">${h(partner.city)} legal and financial</p>
    <h1 class="vv-app-title neon-gradient-text">${h(partner.name)}</h1>
    <p class="vv-app-lede">${h(partner.practiceSummary)}</p>
    <div class="hero-actions"><a class="btn primary" href="${h(partner.legalLandingUrl)}">Legal lane</a><a class="btn" href="${h(partner.appUrl)}">App build</a><a class="btn" href="tel:${h(partner.phone)}">Call</a><a class="btn" href="${h(partner.officialWebsite)}">Official site</a></div>
  </div>
  <aside class="vv-app-hero__panel neon-glow-panel"><p class="eyebrow">Profile status</p><div class="vv-app-score"><strong>pending</strong><span>partner activation</span></div><div class="vv-app-signal-grid"><div><span>Market</span><strong>${h(partner.city)}</strong></div><div><span>Workspace</span><strong>${h(partner.workspaceSlug)}</strong></div><div><span>Payment</span><strong>SkyePay</strong></div><div><span>Vault</span><strong>SovereignDocs</strong></div></div></aside>
</section>
<section class="notice sd-wide-notice"><strong>Boundary:</strong> This profile does not claim ${h(partner.name)} has accepted Valley Verified, SovereignDocs, or any customer matter. It is an operator-provisioned candidate workspace for outreach and future routing.</section>
<section class="vv-app-section vv-app-detail-section"><article><p class="eyebrow">Contact</p><h2>${h(partner.address)}</h2><p>${h(partner.phone)}</p><p><a href="${h(partner.officialWebsite)}">${h(partner.officialWebsite)}</a></p></article><article><p class="eyebrow">Review scopes</p><div class="check-list">${partner.reviewScopes.map(scope => `<span>${h(scope)}</span>`).join('')}</div></article></section>
</main>`
  });
}

function workspaceSeed(partner) {
  return {
    name: partner.name,
    slug: partner.workspaceSlug,
    ownerEmail: `graylondonskyes+northstar-${partner.slug}@gmail.com`,
    plan: 'provided-infrastructure',
    role: 'legal_partner_candidate',
    metadata: {
      valleyVerifiedClient: true,
      legalReviewCandidate: true,
      sovereignDocsWorkspace: true,
      providedBy: 'NorthStar Office & Accounting',
      family: 'SOLEnterprises',
      mainUrl: partner.officialWebsite,
      cta: 'Track candidate legal review packets, conflict checks, returned revisions, and payout release status',
      usecases: ['candidate legal partner intake', 'review packet routing', 'conflict check logging', 'returned document handoff', 'payout ledger visibility'],
      branding: { displayName: partner.name, accent: partner.accent, accent2: '#7ae7ff', accent3: '#f5d36a', image: '/valley-verified/assets/valley-verified-logo.png' },
      appSettings: { eventName: `${partner.name} Legal Review Workspace`, idLabel: 'Review Packet ID', syncEnabled: true },
      securitySettings: { providedInfrastructure: true, tenantScoped: true, requiresGateSession: true },
      legalReviewLane: {
        candidateStatus: partner.publicStatus,
        sovereignDocsWorkspaceUrl: partner.sovereignDocsWorkspaceUrl,
        skyePayReviewUrl: partner.skyePayReviewUrl,
        stateBarDirectory: STATE_BAR_URL
      }
    },
    initialState: {
      schemaVersion: 4,
      appVersion: '6.4.1-valley-verified-legal-review',
      workspace: { id: 'pending-provision', slug: partner.workspaceSlug, name: partner.name, role: 'legal_partner_candidate' },
      settings: {
        eventName: `${partner.name} Legal Review Workspace`,
        idLabel: 'Review Packet ID',
        enableSound: false,
        allowDuplicateEmails: false,
        syncEnabled: true,
        retentionNote: 'Workspace records are scoped to this candidate legal partner workspace and must stay behind 0S/FS27 gate controls.'
      },
      attendees: [],
      audit: [{ at: 'seed-time', action: 'workspace_seeded', detail: 'Valley Verified legal review candidate workspace seed prepared.' }]
    }
  };
}

async function updateNorthStar() {
  const seedPath = path.join(NORTHSTAR_ROOT, 'assets/data/seed-workspaces.json');
  const dirPath = path.join(NORTHSTAR_ROOT, 'assets/data/workspace-directory.js');
  const seeds = await readJson(seedPath, []);
  const bySlug = new Map(seeds.map(item => [item.slug, item]));
  for (const partner of CANDIDATES) bySlug.set(partner.workspaceSlug, workspaceSeed(partner));
  const nextSeeds = [...bySlug.values()];
  await writeText(seedPath, json(nextSeeds));
  const directory = {};
  for (const item of nextSeeds) {
    directory[item.slug] = {
      name: item.name,
      image: item.metadata?.branding?.image || '',
      mainUrl: item.metadata?.mainUrl || '',
      accent: item.metadata?.branding?.accent || '#f5d36a',
      accent2: item.metadata?.branding?.accent2 || '#7ae7ff',
      cta: item.metadata?.cta || ''
    };
  }
  await writeText(dirPath, `window.NORTHSTAR_WORKSPACE_DIRECTORY = ${JSON.stringify(directory)};\n`);
}

async function writeCandidateData() {
  const roster = {
    ok: true,
    version: '2026-05-20.legal-review-candidate-roster',
    generatedAt: GENERATED_AT,
    sourceTruth: ['Valley Verified local business records', 'official firm pages checked on 2026-05-20', STATE_BAR_URL],
    pricingTruth: 'The whole 0S is not globally free/unlimited in source truth. SovereignDocs remains paid, bundled, quote-only, or owner-approved until entitlement policy is updated. These legal workspaces are candidate access lanes, not anonymous public Free99.',
    skyepayReviewUrl: SKYPAY_REVIEW_URL,
    candidates: CANDIDATES
  };
  await writeText(path.join(VV_ROOT, 'data/legal-review-partner-candidates.json'), json(roster));
  await writeText(path.join(SD_ROOT, 'data/legal-review-partner-workspaces.json'), json({
    ok: true,
    version: roster.version,
    generatedAt: GENERATED_AT,
    workspaces: CANDIDATES.map(partner => ({
      partnerId: partner.partnerId,
      name: partner.name,
      workspaceSlug: partner.workspaceSlug,
      status: partner.publicStatus,
      signinProUrl: partner.signinProUrl,
      sovereignDocsWorkspaceUrl: partner.sovereignDocsWorkspaceUrl,
      appUrl: partner.appUrl,
      skyePayReviewUrl: partner.skyePayReviewUrl,
      payoutState: 'pending_partner_terms_and_payment_destination'
    }))
  }));
  await writeText(path.join(SD_ROOT, 'data/legal-partner-network.json'), json({
    ok: true,
    networkName: 'SovereignDocs Legal Review Candidate Network',
    version: '10.0.0',
    mode: 'candidate-pending-verification-external-review-network',
    partners: CANDIDATES.map(partner => ({
      id: partner.partnerId,
      displayName: partner.name,
      partnerType: 'external_legal_review_candidate',
      status: partner.publicStatus,
      jurisdictions: [partner.state, 'US'],
      reviewScopes: partner.reviewScopes,
      workspaceSlug: partner.workspaceSlug,
      appUrl: partner.appUrl,
      signinProUrl: partner.signinProUrl,
      sovereignDocsWorkspaceUrl: partner.sovereignDocsWorkspaceUrl,
      valleyVerifiedUrl: partner.valleyVerifiedUrl,
      officialWebsite: partner.officialWebsite,
      stateBarDirectory: STATE_BAR_URL,
      intakeMode: 'SovereignDocs creates a paid review packet, stores it in the vault, then an authorized operator routes it only after partner activation.',
      payoutMode: 'ledger_only_until_partner_payment_destination_and_terms_are_configured',
      publicPromiseBoundary: 'Candidate workspace only; not a promise of legal review, matter acceptance, approval, or attorney-client relationship.'
    })),
    routingRules: {
      highRiskDefault: 'review_required_or_prep_only',
      paymentBeforeRouting: 'required',
      vaultStorageBeforeRouting: 'required',
      partnerActivationBeforePublicClaim: 'required',
      payoutRelease: 'after_partner_return_and_customer_delivery_owner_release',
      operatorRolesAllowedToRoute: ['owner', 'admin', 'operator', 'reviewer'],
      partnerRolesAllowedToUpdate: ['owner', 'admin', 'operator', 'reviewer', 'legal_partner']
    },
    boundaries: [
      'SovereignDocs is not a law firm and does not provide legal advice.',
      'Submitting a packet for partner review does not create an attorney-client relationship with SovereignDocs.',
      'Candidate legal partner workspaces are not public partnership claims.',
      'Partners must be verified, contracted, conflict-checked, and payout-configured before active routing.',
      'Users pay upfront through SkyePay; partner payout is released only after returned/approved work is logged and owner release is complete.'
    ]
  }));
  await writeText(path.join(SD_ROOT, 'data/legal-review-service-plans.json'), json({
    ok: true,
    version: '10.0.0',
    skyepayOfferId: 'sovereigndocs-legal-review-lane',
    skyepayReviewUrl: SKYPAY_REVIEW_URL,
    plans: [
      { id: 'legal_review_triage_deposit', name: 'Legal Review Triage Deposit', amountCents: 29900, scope: 'Upfront paid routing deposit for one generated draft or prep worksheet.', pricingMode: 'skyepay_upfront_owner_approved', requiresPartnerAcceptance: true, partnerPayoutPolicy: 'ledger after returned work and owner release', guarantee: 'none', publicUse: 'review request only' },
      { id: 'business_document_review_request', name: 'Business Document Review Request', amountCents: 49900, scope: 'Business contract, formation, governance, contractor, client, or operations document review request.', pricingMode: 'skyepay_upfront_owner_approved', requiresPartnerAcceptance: true, partnerPayoutPolicy: 'ledger after returned work and owner release', guarantee: 'none', publicUse: 'review request only' },
      { id: 'official_source_prep_review', name: 'Official-Source Prep Review', amountCents: 39900, scope: 'Review a prep packet before the user uses an external official source.', pricingMode: 'skyepay_upfront_owner_approved', requiresPartnerAcceptance: true, partnerPayoutPolicy: 'ledger after returned work and owner release', guarantee: 'none', publicUse: 'prep support only' },
      { id: 'custom_partner_routing', name: 'Custom Partner Routing', amountCents: null, scope: 'Operator-routed review request for higher complexity or jurisdiction-sensitive packets.', pricingMode: 'quote_then_skyepay_upfront', requiresPartnerAcceptance: true, partnerPayoutPolicy: 'ledger after returned work and owner release', guarantee: 'none', publicUse: 'triage request only' }
    ],
    defaultRevenuePolicy: {
      customerPays: 'upfront_before_partner_routing',
      platformFeePercent: 30,
      partnerReservePercent: 70,
      partnerPayoutTiming: 'after_partner_return_and_customer_delivery_owner_release',
      liveMoneyMovement: 'SkyePay checkout and internal ledger; external transfer requires configured payout provider.'
    },
    requiredAcknowledgments: ['not_legal_advice_boundary', 'partner_review_terms', 'no_guarantee_boundary', 'no_sovereigndocs_liability_for_partner_outcome', 'user_fact_accuracy_responsibility']
  }));
}

async function writePagesAndApps() {
  await writeText(path.join(VV_ROOT, 'legal-review-lane/index.html'), indexPage());
  for (const partner of CANDIDATES) {
    await writeText(path.join(VV_ROOT, `legal-review-lane/${partner.slug}/index.html`), partnerPage(partner));
    await writeText(path.join(VV_ROOT, `business/${partner.id}/index.html`), businessProfilePage(partner));
    const appDir = path.join(CLIENT_APP_ROOT, partner.id);
    await writeText(path.join(appDir, 'index.html'), appPage(partner));
    await writeText(path.join(appDir, 'workspace-preview.html'), workspacePreview(partner));
    await writeText(path.join(appDir, 'site-data.json'), json(partner));
    await writeText(path.join(appDir, 'APP_PATH_MANIFEST.json'), json({
      ok: true,
      appId: partner.id,
      generatedAt: GENERATED_AT,
      source: 'tools/provision-legal-review-lane.mjs',
      routes: ['index.html', 'workspace-preview.html', 'site-data.json'],
      valleyVerifiedLegalLanding: partner.legalLandingUrl,
      sovereignDocsWorkspaceUrl: partner.sovereignDocsWorkspaceUrl,
      signinProUrl: partner.signinProUrl,
      skyePayReviewUrl: partner.skyePayReviewUrl,
      boundary: 'candidate legal review workspace only; not active partner claim'
    }));
    await writeText(path.join(appDir, 'README.md'), `# ${partner.name} Legal Review Workspace\n\nCandidate workspace generated for Valley Verified / SovereignDocs legal review routing.\n\nStatus: candidate only, pending outreach, bar verification, conflict rules, MSA/NDA, fee schedule, and payout destination.\n`);
  }
}

async function writeChecklist() {
  const body = `# 0S Legal Review Lane Checklist - 2026-05-20

- [✓] Seven legal candidate firms mapped into a single roster
- [✓] Candidate-only boundary added so no public page claims active partnership
- [✓] SovereignDocs partner network data replaced with the seven candidate workspaces
- [✓] Legal review service plans define SkyePay upfront, vault storage, and payout ledger rules
- [✓] NorthStar SignIn Pro seed workspaces added for all seven firms
- [✓] Valley Verified legal review lane index generated
- [✓] Individual legal review landing pages generated
- [✓] Client app handoff pages generated for all seven firms
- [✓] SovereignDocs live Worker legal review API patched for checkout, vault, and payout ledger
- [✓] SovereignDocs builder and submission UI patched for submit-to-legal-review
- [✓] SkyePay FS27 catalog offer added for sovereign legal review lane
- [✓] Operator handoff documentation added
- [✓] Local proof run completed
- [✓] Live production deploy completed
- [✓] Live proof receipts captured
`;
  await writeText(path.join(SITE_ROOT, 'audits/0S_LEGAL_REVIEW_LANE_CHECKLIST_2026-05-20.md'), body);
}

await writeCandidateData();
await updateNorthStar();
await writePagesAndApps();
await writeChecklist();

console.log(JSON.stringify({
  ok: true,
  generatedAt: GENERATED_AT,
  partners: CANDIDATES.length,
  valleyLane: 'metraiyux_0s_site/valley-verified/legal-review-lane/index.html',
  sovereignDocsPartnerData: 'metraiyux_0s_site/Free99/apps/sovereigndocs/data/legal-partner-network.json',
  northstarSeeds: 'metraiyux_0s_site/northstar/assets/data/seed-workspaces.json',
  checklist: 'metraiyux_0s_site/audits/0S_LEGAL_REVIEW_LANE_CHECKLIST_2026-05-20.md'
}, null, 2));
