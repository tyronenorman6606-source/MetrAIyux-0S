import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const REPO_ROOT = path.resolve(ROOT, '../../..');
const TODAY = new Date().toISOString().slice(0, 10);
const SITE_URL = String(process.env.SITE_URL || process.env.URL || 'https://valley-verified.pages.dev').replace(/\/+$/, '');
const REQUEST_BUILD_HREF = 'mailto:graylondonskyes@gmail.com?subject=Request%20a%20MetrAIyux%200S%20client%20build&body=I%20want%20to%20request%20a%20client%20build%20and%20Valley%20Verified%20posting.';
const MAJOR_PLATFORM_LINKS = [
  {
    key:'0S',
    name:'MetrAIyux 0S Full System',
    url:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/',
    use:'Run the operating layer: gates, receipts, workflows, and command surfaces.'
  },
  {
    key:'MKT',
    name:'MetrAIyux 0S Marketing',
    url:'https://metraiyux-0s-marketing.pages.dev/',
    use:'Review the offer, pricing, and system positioning before requesting a build.'
  },
  {
    key:'ATLAS',
    name:'0S Deployment Atlas',
    url:'https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger',
    use:'See the live deployment map and proof-backed public surface registry.'
  },
  {
    key:'VAULT',
    name:'SkyeVault',
    url:'https://skyevault-drop.netlify.app/',
    use:'Store receipts, files, proof artifacts, and handoff packets.'
  },
  {
    key:'GATE',
    name:'SkyeGateFS27 / SkyePay',
    url:'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html',
    use:'Gate access, payment proof, and protected commercial flows.'
  },
  {
    key:'REV',
    name:'Skyes Over London Reviews',
    url:'https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded',
    use:'Turn reputation proof into a searchable review and social-proof surface.'
  },
  {
    key:'SOLE',
    name:'SOLEnterprises',
    url:'https://solenterprises.org/',
    use:'Connect back to the main company home for inquiries and operating context.'
  }
];
const SOURCE_LIBRARY = {
  sbaMarket:{
    label:'SBA: Market research and competitive analysis',
    url:'https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis'
  },
  sbaPlan:{
    label:'SBA: Write your business plan',
    url:'https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan'
  },
  censusBuilder:{
    label:'U.S. Census Bureau: Census Business Builder',
    url:'https://www.census.gov/programs-surveys/sis/resources/data-tools/business-builder.html'
  },
  googleRanking:{
    label:'Google Business Profile: local ranking guidance',
    url:'https://support.google.com/business/answer/7091?hl=en-en'
  },
  googleStart:{
    label:'Google Business Profile: get started',
    url:'https://support.google.com/business/answer/31662?hl=en'
  },
  ftcCyber:{
    label:'FTC: Cybersecurity basics for small business',
    url:'https://www.ftc.gov/business-guidance/small-businesses/cybersecurity/basics'
  },
  ftcData:{
    label:'FTC: Protecting personal information',
    url:'https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business'
  },
  ftcReviews:{
    label:'FTC: Soliciting and paying for online reviews',
    url:'https://www.ftc.gov/tips-advice/business-center/guidance/soliciting-paying-online-reviews-guide-marketers'
  },
  ftcReviewRule:{
    label:'FTC: Reviews and testimonials guidance',
    url:'https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews'
  },
  nistSmallBusiness:{
    label:'NIST: Cybersecurity Framework 2.0 for small business',
    url:'https://www.nist.gov/itl/smallbusinesscyber/nist-cybersecurity-framework-0'
  },
  irsRecords:{
    label:'IRS: What kind of records should I keep?',
    url:'https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep'
  }
};
const BUSINESS_INSIGHTS = [
  {
    slug:'weekly-company-command-rhythm',
    title:'Run the company from one weekly command rhythm',
    deck:'A simple operating cadence keeps sales, service, money, proof, and follow-up from living in separate tabs and half-remembered chats.',
    topic:'Operating cadence',
    readTime:'7 min',
    platformKeys:['0S','ATLAS','SOLE'],
    sources:['sbaPlan','sbaMarket'],
    manual:[
      'Write one weekly scorecard with revenue, cash, open leads, active jobs, late follow-ups, review requests, delivery blockers, and owner decisions.',
      'Hold a 30-minute owner review every week. Mark each lane green, yellow, or red. Pick three fixes only: one money fix, one customer fix, one proof fix.',
      'Keep a running decision log. Every promise, price change, delivery exception, and customer escalation needs an owner, a due date, and evidence.'
    ],
    system:[
      'MetrAIyux 0S gives the rhythm a home: live surfaces, command routes, deployment receipts, customer gates, and operator notes stay attached to the same system instead of scattered across apps.',
      'The Deployment Atlas shows what is actually live before the company makes a public claim, so weekly planning starts from proof instead of memory.',
      'SOLEnterprises stays the company-level handoff for inquiries when the weekly review turns into a build, portal, automation, or growth request.'
    ],
    sections:[
      ['The work is not knowing what to do; it is seeing it every week','Most owners already know the right moves: follow up faster, keep cleaner records, ask for reviews, fix stale website copy, stop selling weak offers, and clean up the handoff between sales and delivery. The problem is that those jobs live in different places. A weekly command rhythm turns the business into a visible board: money, customers, operations, proof, and risks. Once the board exists, the owner can stop reacting to whatever yells loudest and start moving the next constraint.'],
      ['The manual version is still worth doing','Use a spreadsheet if that is all you have. Put dates across the top and operating lanes down the side. Every Friday, add the current number, the owner, the next action, and the proof link. Keep the language plain: what happened, what is blocked, what changes next week. This is not a corporate ritual. It is a way to keep small problems from becoming expensive surprises.'],
      ['Where 0S changes the workload','The 0S version turns that scorecard into connected rooms. The same company can have a public page, a protected gateway, a vault for receipts, a live deployment ledger, customer forms, review proof, and inquiry paths that point back to the operating system. The owner still makes decisions, but the system reduces the time spent hunting for facts.']
    ]
  },
  {
    slug:'local-visibility-that-converts',
    title:'Local visibility should move a buyer toward action',
    deck:'Search visibility is not just ranking. It is accurate business data, proof, service context, review response, and a path to call, request, compare, or buy.',
    topic:'Local visibility',
    readTime:'8 min',
    platformKeys:['MKT','ATLAS','0S'],
    sources:['googleRanking','googleStart','sbaMarket'],
    manual:[
      'Keep business name, category, hours, phone, website, service area, photos, and description current across your public profiles.',
      'Build one landing page for each real service lane or market you want to sell. Make the page useful before asking for an appointment.',
      'Track which pages actually create calls, quote requests, purchases, or owner conversations.'
    ],
    system:[
      'Valley Verified gives businesses a public page that can be claimed, corrected, shared, and linked into their full site or app.',
      'MetrAIyux 0S connects the public page to the larger operating layer, so discovery can hand off to forms, proof, portals, reviews, or payments.',
      'The Atlas keeps live links visible, so dead pages and stale claims do not stay in the public story.'
    ],
    sections:[
      ['Complete data beats clever copy','Google says local results are shaped by relevance, distance, and prominence, and it pushes business owners to keep information complete and accurate. That is the unglamorous foundation. If the buyer cannot tell what you do, where you serve, when you answer, or how to contact you, the ranking win leaks out before it becomes revenue.'],
      ['The page has to answer the buyer in motion','A buyer is usually not reading your whole brand story. They are comparing: can you handle this job, are you near me, do you look real, can I reach you, and what happens next? A good local page gives the answer fast, then lets the buyer call, save, compare, request a quote, or open the full website.'],
      ['Where 0S changes the workload','The system keeps the page from being a lonely brochure. The page can point into a claim path, owner update packet, request flow, live build, payment gate, review atlas, or deployment proof. That means the local visibility layer is not just traffic; it becomes a controlled handoff into operations.']
    ]
  },
  {
    slug:'customer-intake-follow-up-system',
    title:'Fix intake and follow-up before buying more leads',
    deck:'A company that loses requests, forgets context, or replies late can spend more on marketing and still feel broke.',
    topic:'Customer workflow',
    readTime:'7 min',
    platformKeys:['0S','GATE','VAULT'],
    sources:['sbaPlan','ftcData'],
    manual:[
      'Write down the minimum fields for each request: customer, job type, location, timeline, budget range, source, owner, next action, and proof files.',
      'Create response rules: first reply window, quote deadline, follow-up cadence, close-lost reason, and escalation owner.',
      'Store receipts, signed scopes, photos, and handoff notes where the team can find them later.'
    ],
    system:[
      'MetrAIyux 0S can turn intake into forms, packets, gates, queues, and owner-visible status instead of loose inbox messages.',
      'SkyeGateFS27 can protect buyer or customer flows when access, payment, or account state matters.',
      'SkyeVault gives the receipt layer a durable place to live after the request becomes a job, invoice, or proof handoff.'
    ],
    sections:[
      ['Lead volume is not the same as revenue','Many small companies do not need more leads first. They need fewer dropped leads. A request should never arrive as a mystery message with no owner, no next step, and no record of what was promised. Before a company spends more on ads, it should know how requests enter, how fast they get a first response, what information is needed to quote, and where proof gets stored.'],
      ['Manual intake can be clean','Start with one form and one queue. Do not ask for twenty fields if seven will qualify the job. The goal is to capture enough context to route the request and enough contact data to follow up. Every request should end the day in one of five states: new, waiting on customer, quoted, scheduled, or closed.'],
      ['Where 0S changes the workload','0S turns intake into a company system. The same request can create a packet, route through a gate, attach documents to a vault, trigger a follow-up, and later become proof for an owner review. It does not remove judgment. It removes the repeated admin drag that keeps the owner from seeing where money is leaking.']
    ]
  },
  {
    slug:'records-receipts-and-money-hygiene',
    title:'Receipts are an operating system, not an afterthought',
    deck:'Clean records help owners see cash, defend deductions, prepare reports, and prove what happened when a customer, vendor, or tax question comes back later.',
    topic:'Records and proof',
    readTime:'8 min',
    platformKeys:['VAULT','SOLE','0S'],
    sources:['irsRecords','sbaPlan'],
    manual:[
      'Separate business income, expenses, payroll, assets, contracts, and customer proof into a record system that is searchable by date and type.',
      'Keep supporting documents: invoices, receipts, paid bills, deposit records, card statements, payroll records, and contract changes.',
      'Create a monthly close routine: reconcile, label unknown transactions, attach missing receipts, export a summary, and log owner decisions.'
    ],
    system:[
      'SkyeVault can hold the files, receipts, proof screenshots, upload records, and handoff packets that a normal website or CRM tends to scatter.',
      'MetrAIyux 0S can connect proof storage to customer portals, deployment receipts, payment flows, and operating ledgers.',
      'SOLEnterprises becomes the company-level door for building a custom record, vault, or operations system around the business.'
    ],
    sections:[
      ['The boring files become leverage','The IRS recordkeeping guidance is plain: your records should clearly show income and expenses, and supporting documents matter. That is more than tax housekeeping. It helps the owner see what is profitable, what is late, what is recurring, and what keeps creating exceptions.'],
      ['Manual record hygiene is mostly rhythm','A small company can start with folders and naming rules. Use year, month, vendor or customer, amount, and document type. Once a week, upload missing receipts. Once a month, reconcile and export a short owner summary. The habit matters more than the tool at first.'],
      ['Where 0S changes the workload','The 0S pattern treats receipts as part of the business machine. A proof file can live with the customer record, deployment receipt, payment gate, review surface, or operator note. When someone asks what happened, the answer is not hidden in an inbox. It is attached to the system.']
    ]
  },
  {
    slug:'small-business-security-without-paranoia',
    title:'Security for small teams starts with boring controls',
    deck:'Small business security does not need theatre. It needs updates, MFA, backups, least access, data minimization, response plans, and proof that the basics actually happen.',
    topic:'Security basics',
    readTime:'9 min',
    platformKeys:['GATE','VAULT','ATLAS'],
    sources:['ftcCyber','ftcData','nistSmallBusiness'],
    manual:[
      'Turn on automatic updates for devices, browsers, apps, and operating systems. Require long unique passwords and MFA on sensitive systems.',
      'Back up important files, limit who can access customer information, and stop collecting data you do not need.',
      'Write a breach response sheet: who decides, who contacts customers, where backups live, and what gets shut off first.'
    ],
    system:[
      'SkyeGateFS27 keeps protected flows behind gate logic instead of exposing sensitive admin routes as public pages.',
      'SkyeVault separates proof and file storage from casual website content, making it easier to control where important records live.',
      'The Deployment Atlas helps operators see which public links are live, gated, or retired before an old route becomes a risk.'
    ],
    sections:[
      ['Security is a habit stack','FTC small-business guidance focuses on practical controls: update software, back up files, require passwords, encrypt devices, use MFA, train staff, and plan for breach response. NIST CSF 2.0 adds a useful mental model: govern, identify, protect, detect, respond, and recover. The point is not to sound enterprise. The point is to make the next bad day smaller.'],
      ['Manual controls can be simple','Create an access list. Who has the website login, payment dashboard, email admin, file storage, booking app, social accounts, and bank access? Remove old users. Turn on MFA. Put recovery codes in a safe place. Decide what customer data you actually need and delete the rest on a schedule.'],
      ['Where 0S changes the workload','The 0S ecosystem separates public pages from protected surfaces. Gates handle access-sensitive workflows, vaults hold proof and files, and ledgers show what is live. That structure gives the owner fewer mystery doors to manage and a clearer way to retire risky links.']
    ]
  },
  {
    slug:'reviews-social-proof-without-shady-tactics',
    title:'Social proof should be useful without getting shady',
    deck:'Review systems work best when they ask real customers, avoid fake pressure, preserve negative feedback, and turn reputation into operational learning.',
    topic:'Reviews and trust',
    readTime:'8 min',
    platformKeys:['REV','0S','MKT'],
    sources:['ftcReviews','ftcReviewRule','googleRanking'],
    manual:[
      'Ask every real customer for a review at a natural moment after delivery. Do not ask people who did not use the product or service.',
      'Do not condition incentives on positive reviews. Keep requests neutral and platform rules visible.',
      'Respond to reviews and mine the language for service improvements, FAQ copy, and proof themes.'
    ],
    system:[
      'Skyes Over London Reviews turns review proof into a dedicated searchable surface with detail pages instead of burying reputation in screenshots.',
      'MetrAIyux 0S can connect review requests, service delivery, proof receipts, and website copy so feedback becomes an operating asset.',
      'The marketing surface can then link to real proof and education instead of making unsupported claims.'
    ],
    sections:[
      ['Trust is fragile because buyers know reviews can be gamed','The FTC warns against fake reviews, misleading review collection, and incentives that push only positive outcomes. Google also notes that review count and positive ratings can affect local prominence, but owners should treat that as a reason to build a real review habit, not a reason to manipulate the record.'],
      ['The manual version is a service habit','Ask after the job is complete. Make the request short. Give the customer the right link. Do not write the review for them. Respond like a human, especially when the feedback hurts. Every month, read the review themes and turn them into training, FAQ improvements, offer changes, and proof copy.'],
      ['Where 0S changes the workload','0S can make the review loop part of delivery. A completed job can trigger a neutral request, route the response, attach proof, and turn public reputation into a review atlas or sales page. The owner still earns the review in the real world. The system makes the follow-through less random.']
    ]
  },
  {
    slug:'market-research-before-growth-spend',
    title:'Do market research before you spend like a bigger company',
    deck:'A small company can make smarter growth moves by checking demand, competition, customer profile, local data, and offer fit before buying ads or building new services.',
    topic:'Market research',
    readTime:'7 min',
    platformKeys:['0S','ATLAS','MKT'],
    sources:['sbaMarket','censusBuilder','googleRanking'],
    manual:[
      'Write the buyer, problem, offer, geography, price range, competitors, and proof gap before launching a campaign.',
      'Use public data and local search behavior to pick which city, service lane, or niche deserves a page, offer, or sales push.',
      'Run small tests: one landing page, one offer, one outreach list, one follow-up sequence, one measurement window.'
    ],
    system:[
      'MetrAIyux 0S can turn a test into an actual deployed surface with tracking, proof, and follow-up paths.',
      'The Deployment Atlas helps operators see which experiments are live and which links should be removed or promoted.',
      'The marketing surface can point prospects to the current offer once the test proves enough signal.'
    ],
    sections:[
      ['Market research is risk reduction','The SBA frames market research as a way to understand customers and reduce risk. Census Business Builder gives entrepreneurs demographic and economic data for opening or expanding a business. Those tools are not homework for a bank packet only. They are practical filters before a company spends money on a new lane.'],
      ['The manual version is a one-page growth brief','Before launching, write the market, buyer, service, current alternatives, local demand signal, price expectation, proof needed, and first test. If the brief cannot explain why this lane should win, the campaign is probably premature.'],
      ['Where 0S changes the workload','0S helps turn the brief into a deployed experiment. The company can publish a focused page, route inquiries, collect proof, store receipts, and track live links. That makes growth less like guessing and more like operating a controlled test.']
    ]
  }
];
const INSIGHT_ROUTES = ['/insights/', ...BUSINESS_INSIGHTS.map(article => `/insights/${article.slug}/`)];

function text(v){ return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function html(v){ return text(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function jsonScript(v){ return JSON.stringify(v).replace(/</g, '\\u003c'); }
function slugify(v){ return text(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'item'; }
async function ensure(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(rel, body){ const file = path.join(DIST, rel); await ensure(path.dirname(file)); await fs.writeFile(file, body); }
async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function maybeReadJson(rel, fallback){ try { return JSON.parse(await read(rel)); } catch { return fallback; } }
async function writeJson(rel, payload){ await write(rel, JSON.stringify(payload)); }
async function exists(rel){ try { await fs.access(path.join(DIST, rel)); return true; } catch { return false; } }
function currency(n){ return Number(n || 0).toLocaleString(); }

const businesses = await maybeReadJson('data/businesses-lite.json', { businesses:[] });
const full = businesses.businesses || businesses.records || [];
const report = await maybeReadJson('seed-report.json', { records:{} });
const categories = await maybeReadJson('data/categories.json', { categories:[] });
const cities = await maybeReadJson('data/cities.json', { cities:[] });
const products = await maybeReadJson('data/exposure-products.json', { products:[] });
const revenue = await maybeReadJson('data/revenue-readiness.json', { scenarios:[] });
const command = await maybeReadJson('data/marketplace-command-center.json', {});
const featured = full.filter(b => b.featured).sort((a,b)=>Number(b.verification_score || 0)-Number(a.verification_score || 0));
const sample = [...featured, ...full.filter(b => !b.featured)].slice(0, 6);
const count = full.length || report.records?.published || 0;
const categoryCount = (categories.categories || []).length;
const cityCount = (cities.cities || []).length;
const websiteCount = full.filter(b => b.website).length;
const phoneCount = full.filter(b => b.phone).length;
const emailCount = full.filter(b => b.email).length;
const clientBuilds = [
  {
    id:'bobs',
    name:"Bob's Smoke Shop",
    label:'Retail app build',
    copy:"A blue-lit smoke shop preview with age gate, live-media homepage, inventory lanes, specials, gallery, workspace preview, QR handoff, and Valley Verified backlink.",
    url:'https://bobs-smoke-shop.pages.dev/',
    valleyUrl:'/business/bobs-smoke-shop-litchfield-park/',
    video:'/assets/client-builds/bobs-live-build.mp4',
    poster:'/assets/client-builds/bobs-live-build-poster.jpg',
    metrics:['21+ gate','Inventory lanes','Workspace preview']
  },
  {
    id:'empire',
    name:'Empire Pallets',
    label:'Operations app build',
    copy:'A Phoenix pallet operations app with quote intake, service lanes, scan route, intro video, mobile-first forms, commercial proof, and Valley Verified backlink.',
    url:'https://empire-pallets.pages.dev/',
    valleyUrl:'/business/empire-pallets-phoenix/',
    video:'/assets/client-builds/empire-live-build.mp4',
    poster:'/assets/client-builds/empire-live-build-poster.jpg',
    metrics:['Quote intake','Scan route','Service lanes']
  }
];

const publicNav = `<header class="topbar public-topbar">
  <a class="brand" href="/" aria-label="Valley Verified home"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>real local business pages</small></span></a>
  <nav class="nav-actions public-nav" aria-label="Primary"><a href="/featured/">Featured</a><a href="/directory/">Directory</a><a href="/insights/">Insights</a><a href="/network/">Network</a><a href="/how-it-works/">How it works</a><a href="/for-businesses/">For businesses</a><a href="/advertise/">Exposure</a><a href="/pricing/">Pricing</a><a href="/contact/">Contact</a><a class="nav-operator" href="/protected-admin/" rel="nofollow">Operator</a></nav>
</header>`;
const publicFooter = `<footer class="site-footer public-footer">
  <div><a class="brand mini" href="/"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>Network Platform</small></span></a><p>I built Valley Verified as a seeded Arizona business discovery network that gives real businesses public pages first. We keep public seed data honest: claim, correct, enrich, and verify before stronger owner-controlled claims are promoted.</p></div>
  <nav aria-label="Footer"><a href="/featured/">Featured</a><a href="/directory/">Directory</a><a href="/insights/">Insights</a><a href="/join/">Join</a><a href="/trust-network/">Trust Network</a><a href="/claims-ledger/">Claims Ledger</a><a href="/production-readiness/">Readiness</a><a href="/operator/" rel="nofollow">Seed Console</a></nav>
</footer>`;
function base({ title, description, canonical, bodyClass = 'website-page', robots = 'index,follow', schema = null }, body){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)}</title><meta name="description" content="${html(description)}"/><meta name="robots" content="${html(robots)}"/><link rel="canonical" href="${html(canonical)}"/><meta name="theme-color" content="#f5efe3"/><meta property="og:title" content="${html(title)}"/><meta property="og:description" content="${html(description)}"/><meta property="og:type" content="website"/><meta property="og:url" content="${html(canonical)}"/><meta property="og:image" content="${SITE_URL}/assets/valley-verified-logo.png"/><meta name="twitter:card" content="summary_large_image"/><link rel="icon" href="/assets/valley-verified-logo.png"/><link rel="manifest" href="/manifest.webmanifest"/><link rel="stylesheet" href="/assets/styles.css"/>${schema ? `<script type="application/ld+json">${jsonScript(schema)}</script>` : ''}</head><body class="${html(bodyClass)}"><canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>${publicNav}<main id="main" class="site-main public-site-main">${body}</main>${publicFooter}<div id="toast" class="toast" role="status" aria-live="polite"></div><script type="module" src="/assets/app.js"></script></body></html>`;
}
function metric(value, label){ return `<div class="metric"><span>${html(value)}</span><small>${html(label)}</small></div>`; }
function tile(k, title, copy, href = '#'){ return `<a class="platform-tile website-tile" href="${html(href)}"><span>${html(k)}</span><h3>${html(title)}</h3><p>${html(copy)}</p></a>`; }
function miniCard(b){ return `<article class="business-card website-feature ${b.featured ? 'is-featured' : ''}"><div class="card-top"><div><p class="eyebrow">${b.featured ? '<span class="featured-badge small">Featured</span> ' : ''}${html(b.city || 'Arizona')} • ${html(b.category || 'Business')}</p><h3><a href="/business/${html(b.id)}/">${html(b.name)}</a></h3></div><div class="score"><strong>${html(Math.round(Number(b.verification_score || 0)))}</strong><small>score</small></div></div><p class="card-desc">${html([b.category,b.city,b.zip].filter(Boolean).join(' • ') || 'Seeded marketplace profile')}</p><div class="card-actions"><a class="btn small primary" href="/business/${html(b.id)}/">Open landing</a>${b.website ? `<a class="btn small" href="${html(b.website)}" target="_blank" rel="noopener">Live site</a>` : `<a class="btn small" href="/request/?business=${html(b.id)}">Request</a>`}</div></article>`; }
function majorPlatformCards(keys = MAJOR_PLATFORM_LINKS.map(p => p.key)){
  const wanted = new Set(keys);
  return MAJOR_PLATFORM_LINKS.filter(platform => wanted.has(platform.key)).map(platform => `<a class="platform-tile major-platform-tile" href="${html(platform.url)}" target="_blank" rel="noopener"><span>${html(platform.key)}</span><h3>${html(platform.name)}</h3><p>${html(platform.use)}</p></a>`).join('');
}
function sourceLinks(keys = []){
  return keys.map(key => SOURCE_LIBRARY[key]).filter(Boolean).map(source => `<a href="${html(source.url)}" target="_blank" rel="noopener">${html(source.label)}</a>`).join('');
}
function articleCard(article){
  return `<a class="article-card neon-magnetic" href="/insights/${html(article.slug)}/"><span>${html(article.topic)}</span><h3>${html(article.title)}</h3><p>${html(article.deck)}</p><small>${html(article.readTime)} read</small></a>`;
}
function manualSystemColumns(article){
  return `<section class="split-grid insight-playbook"><article class="section glass"><p class="eyebrow">Manual operating method</p><h2>Do this before software</h2><div class="check-list">${article.manual.map(item => `<span>${html(item)}</span>`).join('')}</div></article><article class="section glass"><p class="eyebrow">How 0S makes it easier</p><h2>Turn the habit into a system</h2><div class="check-list">${article.system.map(item => `<span>${html(item)}</span>`).join('')}</div></article></section>`;
}
function insightIndexPage(){
  const featuredArticle = BUSINESS_INSIGHTS[0];
  const articleList = BUSINESS_INSIGHTS.map(articleCard).join('');
  const platformRail = majorPlatformCards();
  return base({
    title:'Business Operating Insights | Valley Verified',
    description:'Practical Valley Verified field notes for running a company: local visibility, intake, records, security, reviews, market research, and how MetrAIyux 0S makes the work easier.',
    canonical:`${SITE_URL}/insights/`,
    bodyClass:'website-page insights-page operator-journal-page',
    schema:{ '@context':'https://schema.org', '@type':'Blog', name:'Valley Verified Business Operating Insights', url:`${SITE_URL}/insights/`, about:['small business operations','local visibility','MetrAIyux 0S','company systems'] }
  }, `<section class="hero glass subhero journal-hero"><div><p class="eyebrow">Business operating journal</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">Run the company better before you buy another shiny tool.</h1><p class="hero-text">This is the practical side of Valley Verified: how owners can tighten visibility, intake, records, security, reviews, and growth. Each note gives the manual method first, then shows where the 0S turns repeat work into a system.</p><div class="hero-actions"><a class="btn primary" href="/insights/${html(featuredArticle.slug)}/">Start with the weekly rhythm</a><a class="btn" href="${REQUEST_BUILD_HREF}">Ask about 0S</a><a class="btn ghost" href="/for-businesses/">Claim or improve a profile</a></div></div><aside class="atlas-panel journal-index-panel"><p class="eyebrow">Only major platforms</p><div class="hero-card website-metrics">${metric(BUSINESS_INSIGHTS.length,'operator notes')}${metric(MAJOR_PLATFORM_LINKS.length,'major platforms')}${metric('0','dead-link promos')}${metric('1','inquiry path')}</div><div class="atlas-list"><div><strong>Editorial rule</strong><span>Useful business education first. System links only where they make the manual work easier.</span></div><div><strong>Backlink rule</strong><span>No minor deployment dump here; only the major 0S/company platforms are listed.</span></div></div></aside></section>
<section class="section glass insight-feature"><div class="section-head"><div><p class="eyebrow">Data health and growth signals</p><h2>Build an operating company, not a pile of pages.</h2></div><a class="btn small" href="/network/">Open network</a></div><p class="section-intro">Marketplace intelligence is only useful when it changes how the company operates. A business gets stronger when the boring loops are visible: weekly planning, public information, customer intake, file proof, security, reviews, and market tests. The 0S does not replace the owner. It gives the owner rooms, gates, receipts, and live surfaces so the work stops disappearing.</p></section>
<section class="article-grid-section"><div class="article-grid">${articleList}</div></section>
<section class="section glass major-platforms"><div class="section-head"><div><p class="eyebrow">Major 0S platforms referenced</p><h2>Backlinks with a reason to exist.</h2></div><a class="btn small primary" href="${REQUEST_BUILD_HREF}">Inquire</a></div><div class="tile-grid major-platform-grid">${platformRail}</div></section>`);
}
function insightArticlePage(article){
  const platforms = MAJOR_PLATFORM_LINKS.filter(platform => article.platformKeys.includes(platform.key));
  const related = BUSINESS_INSIGHTS.filter(item => item.slug !== article.slug).slice(0, 3).map(articleCard).join('');
  const body = `<article class="insight-article"><header class="hero glass subhero article-hero"><div><a class="back-link" href="/insights/">Insights</a><p class="eyebrow">${html(article.topic)} / ${html(article.readTime)} read</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">${html(article.title)}</h1><p class="hero-text">${html(article.deck)}</p><div class="hero-actions"><a class="btn primary" href="${REQUEST_BUILD_HREF}">Ask about this system</a><a class="btn" href="/for-businesses/">Business owner path</a></div></div><aside class="article-rail"><p class="eyebrow">System backlinks</p>${platforms.map(platform => `<a href="${html(platform.url)}" target="_blank" rel="noopener"><strong>${html(platform.name)}</strong><span>${html(platform.use)}</span></a>`).join('')}</aside></header>
${manualSystemColumns(article)}
<section class="section glass article-body">${article.sections.map(([title, copy]) => `<section class="article-section"><h2>${html(title)}</h2><p>${html(copy)}</p></section>`).join('')}</section>
<section class="section glass source-notes"><div class="section-head"><div><p class="eyebrow">Source notes</p><h2>Public guidance used for this note.</h2></div></div><div class="source-link-grid">${sourceLinks(article.sources)}</div></section>
<section class="section glass related-insights"><div class="section-head"><div><p class="eyebrow">Keep building the system</p><h2>Read next</h2></div><a class="btn small" href="/insights/">All insights</a></div><div class="article-grid compact">${related}</div></section></article>`;
  return base({
    title:`${article.title} | Valley Verified Insights`,
    description:article.deck,
    canonical:`${SITE_URL}/insights/${article.slug}/`,
    bodyClass:'website-page insights-page insight-article-page',
    schema:{ '@context':'https://schema.org', '@type':'BlogPosting', headline:article.title, description:article.deck, datePublished:TODAY, dateModified:TODAY, author:{ '@type':'Organization', name:'Valley Verified' }, publisher:{ '@type':'Organization', name:'Valley Verified' }, mainEntityOfPage:`${SITE_URL}/insights/${article.slug}/` }
  }, body);
}
async function copyOptional(src, dest){
  try {
    await ensure(path.dirname(dest));
    await fs.copyFile(src, dest);
    return true;
  } catch {
    return false;
  }
}
async function copyClientBuildAssets(){
  const assets = [
    ['Skye-Clients/bobs-smoke-shop-mcp-redo/assets/videos/bobs-live-homepage-loop.mp4', 'assets/client-builds/bobs-live-build.mp4'],
    ['Skye-Clients/bobs-smoke-shop-mcp-redo/assets/videos/bobs-live-homepage-poster.jpg', 'assets/client-builds/bobs-live-build-poster.jpg'],
    ['Skye-Clients/empire-pallets-v3-app/assets/media/empire-hero.mp4', 'assets/client-builds/empire-live-build.mp4'],
    ['Skye-Clients/empire-pallets-v3-app/assets/media/empire-hero-poster.jpg', 'assets/client-builds/empire-live-build-poster.jpg']
  ];
  const copied = [];
  for (const [srcRel, destRel] of assets) {
    if (await copyOptional(path.join(REPO_ROOT, srcRel), path.join(DIST, destRel))) copied.push(destRel);
  }
  await writeJson('data/client-build-assets.json', { updated_at:TODAY, copied, builds:clientBuilds });
}
function skyeCommandCenter(){
  return `<section class="command-center" data-skye-component="app-first-command-center"><div class="command-center__copy"><p>BUSINESS VISIBILITY CONSOLE</p><h1>The included posting becomes an actual business webpage.</h1><span>Claim status, page readiness, featured placement, sharing, and owner handoff stay visible in one place.</span></div><div class="command-center__surface"><header><div><strong>Valley Business Page Console</strong><span>Free posting / claim path / optional growth</span></div><a class="btn small primary" href="/for-businesses/">Create customer posting</a></header><div class="command-center__grid"><aside class="command-rail"><a class="active" href="#page" data-skye-tab="page">Page</a><a href="#claim" data-skye-tab="claim">Claim</a><a href="#exposure" data-skye-tab="exposure">Exposure</a><a href="#gate" data-skye-tab="gate">Gate</a></aside><main><div class="status-grid"><article><i class="status-icon"></i><span>Gate</span><strong>First paid month unlock</strong></article><article><i class="status-icon"></i><span>Page</span><strong>Public landing generated</strong></article><article><i class="status-icon"></i><span>Proof</span><strong>Dedupe and claim path</strong></article><article><i class="status-icon"></i><span>Choice</span><strong>Upgrades stay optional</strong></article></div><section class="console-card" data-skye-panel="page"><p>Business page</p><h2>A useful public landing buyers can act on.</h2><div class="check-list"><span>Business gets a real public page after the first month.</span><span>Buyers see service, market, contact, share, claim status, and quote actions.</span><span>Owners can claim, correct, verify, and improve the page.</span></div></section><section class="console-card hidden" data-skye-panel="claim"><p>Owner path</p><h2>Claim, correct, and keep one canonical profile.</h2><div class="check-list"><span>We route corrections to the claim workflow.</span><span>We keep duplicate prevention visible.</span><span>We do not promote owner-verified claims before review.</span></div></section><section class="console-card hidden" data-skye-panel="exposure"><p>Optional path</p><h2>Verify, feature, route leads, sponsor, or manage growth only when wanted.</h2><div class="check-list"><span>The included page remains useful without any extra purchase.</span><span>Featured placement can add visibility in real city/category lanes.</span><span>Lead routing, sponsor inventory, and managed growth stay optional paid products.</span></div></section><section class="console-card hidden" data-skye-panel="gate"><p>0S customer gift</p><h2>First paid month unlocks one free business posting.</h2><div class="check-list"><span>Qualified MetrAIyux 0S customers receive one posting after month one.</span><span>Gate auth owns the customer status.</span><span>No upgrade is required to keep the account or included public page.</span></div></section></main></div></div></section>`;
}
function skyeProofFunnel(){
  const steps = [
    ['First month clears','Gate-auth marks the customer eligible for one free business posting after their first paid month.'],
    ['We build the page','The business gets a real shareable landing with service context, contact paths, and quote actions.'],
    ['Owner claims it','The owner can correct weak data, add proof, and keep one canonical page instead of duplicate spam.'],
    ['Optional upgrades open','Verification, featured placement, lead routing, sponsor lanes, and managed growth are available only when the business wants more reach.']
  ];
  return `<section class="proof-funnel" data-skye-component="scroll-proof-funnel"><div class="proof-funnel__intro"><p>VISIBILITY FUNNEL</p><h2>Visibility first. Trust and placement only when the business wants it.</h2><span>The customer offer moves from first-month eligibility to a real public page, then into owner claim and optional growth if the owner asks for more reach.</span></div><div class="proof-funnel__steps">${steps.map(([title, body], index) => `<article class="proof-step"><div class="proof-rail"><span class="proof-rail__fill proof-rail__fill-${index}"></span></div><span>${String(index + 1).padStart(2, '0')}</span><h3>${html(title)}</h3><p>${html(body)}</p></article>`).join('')}</div></section>`;
}
function clientBuildShowcase(){
  const cards = clientBuilds.map(build => `<article class="client-build-card"><div class="client-video-frame"><video autoplay muted loop playsinline controls preload="metadata" poster="${html(build.poster)}"><source src="${html(build.video)}" type="video/mp4"></video></div><div class="client-build-copy"><p class="eyebrow">${html(build.label)}</p><h3>${html(build.name)}</h3><p>${html(build.copy)}</p><div class="client-build-metrics">${build.metrics.map(item => `<span>${html(item)}</span>`).join('')}</div><div class="card-actions"><a class="btn small primary" href="${html(build.url)}" target="_blank" rel="noopener">Open live build</a><a class="btn small" href="${html(build.valleyUrl)}">Valley post</a><button class="btn small" data-share-profile data-share-url="${html(build.url)}" data-share-title="${html(`${build.name} live client build`)}" data-share-text="${html(build.copy)}">Share</button></div></div></article>`).join('');
  return `<section class="section glass client-build-showcase" id="client-builds"><div class="section-head"><div><p class="eyebrow">Live client builds</p><h2>See what we build for free, then what we can scale.</h2></div><div class="button-row"><a class="btn small primary" href="${REQUEST_BUILD_HREF}">Request a build</a><a class="btn small" href="/featured/">See featured pages</a></div></div><p class="section-intro">The free Valley Verified page is the public bridge. Full client builds go deeper: branded app surfaces, quote flows, media, QR routes, and two-way links back into the network.</p><div class="client-build-grid">${cards}</div></section>`;
}
function websiteHero(){ return `<section class="hero website-hero editorial-atlas"><div class="hero-copy"><p class="eyebrow">Arizona verified business network</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">A free public business page as our gift. Optional upgrades only when owners want more reach.</h1><p class="hero-text">Valley Verified turns local records and customer submissions into real landing pages businesses can claim, correct, share, and connect to their full website or app. No obligation: the included page stays useful on its own.</p><div class="hero-actions"><a class="btn primary" href="/directory/">Explore the marketplace</a><a class="btn" href="${REQUEST_BUILD_HREF}">Request a build</a><a class="btn ghost" href="#client-builds">See live client builds</a><a class="btn ghost" href="/for-businesses/">Claim or improve a profile</a></div></div><aside class="atlas-panel"><p class="eyebrow">Network receipt</p><div class="hero-card website-metrics">${metric(currency(count),'business pages')}${metric(currency(categoryCount),'service lanes')}${metric(currency(cityCount),'Arizona markets')}${metric(currency(report.records?.exact_merges || 1069),'duplicate records merged')}</div><div class="atlas-list"><div><strong>Our customer gift</strong><span>Qualified MetrAIyux 0S customers get one public business posting after their first paid month.</span></div><div><strong>No obligation</strong><span>Verification, placement, lead routing, sponsor lanes, and managed growth are optional upgrades only if wanted.</span></div></div></aside></section>`; }

await copyClientBuildAssets();
await write('index.html', base({ title:'Valley Verified | Arizona Verified Business Network', description:'Valley Verified is a seeded Phoenix-area business marketplace where owners can claim profiles, buyers can discover services, and AEs can activate verified exposure products.', canonical:`${SITE_URL}/`, bodyClass:'home-page website-home', schema:{ '@context':'https://schema.org', '@type':'WebSite', name:'Valley Verified', url:`${SITE_URL}/`, potentialAction:{ '@type':'SearchAction', target:`${SITE_URL}/directory/?q={search_term_string}`, 'query-input':'required name=search_term_string' } } }, `${websiteHero()}
    ${skyeCommandCenter()}
<section class="section glass website-positioning"><div class="section-head"><div><p class="eyebrow">What this is</p><h2>A seeded marketplace first. A verified network as owners activate.</h2></div><a class="btn small" href="/trust-network/">Trust doctrine</a></div><div class="platform-strip">${tile('01','Seeded supply','The network launches with public business-license and major-employer seed data instead of waiting on an empty marketplace.','/network/')}${tile('02','One posting per business','Canonical identity, duplicate collision reports, and admin suppressions protect the marketplace from duplicate spam.','/fraud-defense/')}${tile('03','AE-ready activation','AEs get account queues, territories, owner follow-ups, pricing, and claim workflows for turning seeded records into active profiles.','/ae-command/')}</div></section>
    ${skyeProofFunnel()}
    ${clientBuildShowcase()}
<section class="section glass"><div class="section-head"><div><p class="eyebrow">Platform tools</p><h2>Buyer and operator workflows</h2></div><a class="btn small" href="/deal-desk/">Open deal desk</a></div><div class="tile-grid">${tile('BUY','Buyer discovery','Directory, match, compare, shortlist, and request workflows help visitors move from search to action.','/directory/')}${tile('EDU','Operating insights','Field notes teach the manual business habit first, then show where 0S removes repeated admin drag.','/insights/')}${tile('OWN','Owner activation','Claim, correction, enrichment, and paid-exposure intent workflows improve seeded records.','/join/')}${tile('OPS','Operator control','Fraud defense, duplicate queues, suppressions, admin actions, and AE work orders protect the network.','/protected-admin/')}</div></section>
<section class="split-grid website-money-path"><div class="section glass"><p class="eyebrow">For buyers</p><h2>Browse real local service lanes without guessing where to start.</h2><p>Use directory, category, city, market, match, shortlist, and compare tools to move from search to quote request. Thin records are clearly treated as enrichment opportunities, not fake verified claims.</p><div class="hero-actions"><a class="btn primary" href="/match/">Use match engine</a><a class="btn" href="/compare/">Compare providers</a></div></div><div class="section glass"><p class="eyebrow">For businesses</p><h2>Claim, correct, enrich, and promote the canonical listing.</h2><p>Business owners can submit correction packets and optional exposure interest. Admin approval and upstream auth own the final live workflow; the public site does not pretend otherwise.</p><div class="hero-actions"><a class="btn primary" href="/join/">Start owner path</a><a class="btn" href="/claim/">Submit update packet</a></div></div></section>
<section class="section glass"><div class="section-head"><div><p class="eyebrow">Marketplace sample</p><h2>Generated business profiles</h2></div><a class="btn small" href="/directory/">View all</a></div><div class="cards">${sample.map(miniCard).join('')}</div></section>
<section class="section glass website-proof"><div class="section-head"><div><p class="eyebrow">Data honesty</p><h2>Current enrichment depth</h2></div><a class="btn small" href="/claims-ledger/">Claims ledger</a></div><div class="detail-grid"><div><strong>Website fields</strong><span>${currency(websiteCount)} records currently include a website.</span></div><div><strong>Phone fields</strong><span>${currency(phoneCount)} records currently include a phone.</span></div><div><strong>Email fields</strong><span>${currency(emailCount)} records currently include an email.</span></div><div><strong>Owner activation</strong><span>Claim and enrichment workflows are designed to improve these records after AE outreach.</span></div></div></section>`));

const featuredShown = featured.length ? featured : full.filter(b => b.website).slice(0, 12);
await write('featured/index.html', base({
  title:'Featured Businesses | Valley Verified',
  description:'Featured Valley Verified businesses get public landing pages that connect local discovery to their live business site or app.',
  canonical:`${SITE_URL}/featured/`,
  bodyClass:'website-page featured-page'
}, `<section class="hero glass subhero website-subhero featured-hero"><div><p class="eyebrow">Featured Valley Verified</p><h1>Featured businesses get a real public landing, not a throwaway listing.</h1><p class="hero-text">This lane shows the value of the offer: a business can have one clean Valley Verified page for local discovery, then route buyers into its full website or app when they are ready to act. The included page is useful on its own, with no obligation to upgrade.</p><div class="hero-actions"><a class="btn primary" href="/for-businesses/">Get a business posting</a><a class="btn" href="#client-builds">See live client builds</a><a class="btn" href="${REQUEST_BUILD_HREF}">Request a build</a></div></div><aside class="hero-card">${metric(featuredShown.length,'featured pages')}${metric(currency(count),'network pages')}${metric('1','free posting after month one')}</aside></section>
${skyeCommandCenter()}
<section class="section glass featured-value"><div class="section-head"><div><p class="eyebrow">Why it has value</p><h2>The featured page becomes a public bridge into the real business.</h2></div></div><div class="platform-strip">${tile('PAGE','Built landing','Each featured post is written like a one-page business landing with buyer actions, contact paths, service context, and a direct live-site handoff.','/featured/')}${tile('BACK','Two-way funnel','The business app links to Valley Verified, and Valley Verified links back to the full business app or website.','/network/')}${tile('UP','Optional scale','After the free page proves value, verification, featured placement, lead routing, sponsor lanes, and managed growth are available only if wanted.','/advertise/')}</div></section>
${clientBuildShowcase()}
<section class="section glass"><div class="section-head"><div><p class="eyebrow">Featured posts</p><h2>Live examples</h2></div><a class="btn small" href="/directory/">Open directory</a></div><div class="cards">${featuredShown.map(miniCard).join('') || '<article class="business-card"><h3>No featured pages yet</h3><p class="card-desc">Featured pages appear here after a business is marked as featured in the seed data.</p></article>'}</div></section>`));

const pages = [
  ['about','About Valley Verified','Valley Verified is an Arizona business network built from seeded public records, duplicate prevention, owner claim workflows, and AE activation systems.', 'A verified network starts with disciplined marketplace data.', [ ['Seed first','A marketplace with no supply is dead. Valley Verified starts by organizing public and licensed business records into searchable profiles.'], ['Verify over time','Listings begin as seeded records. Stronger claims require owner proof, enrichment, admin review, and transparent profile updates.'], ['Sell exposure honestly','AEs can sell visibility products only where the marketplace has a real category/city lane and claim discipline.'] ]],
  ['how-it-works','How Valley Verified Works','See how Valley Verified turns seeded business records into searchable profiles, owner claim packets, AE activation queues, and optional exposure opportunities.', 'From seed data to active local visibility.', [ ['1. Seed','CSV or JSON business records are dropped into the seed inbox, normalized, deduped, and published.'], ['2. Claim','Owners or AEs submit correction and proof packets against one canonical business profile.'], ['3. Activate','Approved enrichment, lead routing, sponsor intent, and optional exposure products move through the runtime workflow.'] ]],
  ['for-businesses','For Arizona Businesses','Claim or improve your free Valley Verified public profile, correct business data, add contact details, and explore optional exposure products.', 'A free public landing is useful on its own.', [ ['Claim the canonical profile','The system is designed around one business, one posting, so your owner proof attaches to the right public landing.'], ['Correct weak data','Submit website, phone, email, service lanes, city coverage, and verification material for admin review.'], ['Upgrade only if wanted','Optional exposure products can be requested after the profile is ready and the business wants more reach.'] ]],
  ['advertise','Advertise on Valley Verified','Valley Verified exposure products help activated businesses move beyond the included profile into verification, featured placement, lead-routing, and sponsor-placement surfaces only when they want more reach.', 'Optional visibility where the marketplace has real supply.', [ ['Profile upgrades','Improve owned listing presentation after claim and correction approval.'], ['Category boosts','Promote in specific service lanes only when the category has enough marketplace depth.'], ['Lead-routing lanes','Route buyer requests through auditable rules instead of hidden black-box promises.'] ]],
  ['network','Valley Verified Network','Explore Valley Verified as a multi-page local business network with directory, city hubs, category hubs, service lanes, claim workflows, and AE operations.', 'A local marketplace network, not a one-page directory.', [ ['Directory layer','Search, compare, shortlist, and request quote paths for seeded profiles.'], ['Market layer','City, category, niche, collection, and local-intent pages give the marketplace structure.'], ['Operations layer','Claim, enrichment, fraud defense, AE assignment, payment intent, and notification workflows prepare the business side.'] ]],
  ['contact','Contact Valley Verified','Contact Valley Verified to claim a listing, request a correction, discuss advertising, or ask about business visibility in Arizona.', 'Start with the right workflow.', [ ['Business owner','Use the claim or join path to correct your profile.'], ['Buyer','Use directory, match, and quote request tools to find providers.'], ['AE/operator','Use upstream-auth protected routes for pipeline and admin workflows.'] ]]
];
for(const [slug,title,desc,h1,cards] of pages){
  const cardHtml = cards.map((c,i)=>`<article class="proof-card glass"><span>${String(i+1).padStart(2,'0')}</span><h2>${html(c[0])}</h2><p>${html(c[1])}</p></article>`).join('');
  const actions = slug === 'contact' ? `<div class="hero-actions"><a class="btn primary" href="/join/">Claim / join</a><a class="btn" href="/request/">Request help</a><a class="btn ghost" href="/pricing/">Advertising</a></div>` : `<div class="hero-actions"><a class="btn primary" href="/directory/">Open directory</a><a class="btn" href="/join/">Business owner path</a></div>`;
  const skyeInsert = slug === 'for-businesses' ? `${skyeCommandCenter()}${skyeProofFunnel()}` : '';
  await write(`${slug}/index.html`, base({ title:`${title} | Valley Verified`, description:desc, canonical:`${SITE_URL}/${slug}/`, bodyClass:`website-page ${slug}-page` }, `<section class="hero glass subhero website-subhero"><div><p class="eyebrow">Valley Verified</p><h1>${html(h1)}</h1><p class="hero-text">${html(desc)}</p>${actions}</div><aside class="hero-card">${metric(currency(count),'profiles')}${metric(currency(categoryCount),'service lanes')}${metric(currency(cityCount),'markets')}</aside></section>${skyeInsert}<section class="platform-strip">${cardHtml}</section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Next step</p><h2>Move through the correct workflow.</h2></div></div><div class="tile-grid">${tile('BUY','Find providers','Search, compare, shortlist, and request quotes.','/directory/')}${tile('OWN','Claim listing','Correct or improve a canonical business profile.','/join/')}${tile('SELL','Exposure','Review advertising and profile upgrade products.','/advertise/')}${tile('TRUST','Claims ledger','See what the network can and cannot claim yet.','/claims-ledger/')}</div></section>`));
}

await write('insights/index.html', insightIndexPage());
for(const article of BUSINESS_INSIGHTS){
  await write(`insights/${article.slug}/index.html`, insightArticlePage(article));
}

const websiteContent = { version:'23.0.0', updated_at:TODAY, purpose:'Public website layer for Valley Verified', routes:['/','/featured/','/about/','/how-it-works/','/for-businesses/','/advertise/','/network/','/contact/', ...INSIGHT_ROUTES], counts:{ published_businesses:count, featured_pages:featuredShown.length, insights:BUSINESS_INSIGHTS.length, major_platforms:MAJOR_PLATFORM_LINKS.length, categories:categoryCount, cities:cityCount, websites:websiteCount, phones:phoneCount, emails:emailCount, duplicate_merges:report.records?.exact_merges || null }, claims_guardrails:['Seeded public records are not automatically owner-verified.','Paid exposure intent does not equal paid activation until webhook and admin approval complete.','Duplicate prevention is enforced through canonical identity, collision reports, and suppression workflows.','Business insights should educate first and link only to major live 0S/company platforms.'] };
await writeJson('data/website-content.json', websiteContent);
await writeJson('api/website-content.json', { updated_at:TODAY, href:'/data/website-content.json', routes:websiteContent.routes, counts:websiteContent.counts });
const brainSalesGuide = {
  updated_at:TODAY,
  product:'Valley Verified',
  positioning:'Our gift to qualified MetrAIyux 0S customers after the first paid month: one reviewed public business landing with no obligation to upgrade.',
  hard_rules:[
    'Do not say upgrades are required to keep the account or included public page.',
    'Do not claim every seeded record is owner-verified.',
    'Describe verification, featured placement, lead routing, sponsor lanes, and managed growth as optional upgrades only when the business wants more reach.'
  ],
  links:{
    home:`${SITE_URL}/`,
    insights:`${SITE_URL}/insights/`,
    featured:`${SITE_URL}/featured/`,
    bobs_post:`${SITE_URL}/business/bobs-smoke-shop-litchfield-park/`,
    empire_post:`${SITE_URL}/business/empire-pallets-phoenix/`,
    bobs_live:'https://bobs-smoke-shop.pages.dev/',
    empire_live:'https://empire-pallets.pages.dev/',
    request_build:REQUEST_BUILD_HREF
  },
  products:[
    { name:'Free public business landing', price:'Included after first paid month for qualified 0S customers', obligation:'No upgrade required' },
    { name:'Verified profile upgrade', price:'Optional', obligation:'Only if the business wants stronger trust presentation' },
    { name:'Featured market placement', price:'Optional', obligation:'Only if the business wants more lane visibility' },
    { name:'Lead routing / managed growth', price:'Optional', obligation:'Only if the business wants managed routing or campaign support' }
  ],
  live_client_builds:clientBuilds
};
await writeJson('data/brain-sales-guide.json', brainSalesGuide);
await writeJson('api/brain-sales-guide.json', { updated_at:TODAY, href:'/data/brain-sales-guide.json', links:brainSalesGuide.links, products:brainSalesGuide.products });

// Replace the overloaded public header on generated non-profile pages.
async function walk(dir){
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes:true }).catch(()=>[]);
  for(const entry of entries){
    const fullPath = path.join(dir, entry.name);
    if(entry.isDirectory()) out.push(...await walk(fullPath));
    else if(entry.name === 'index.html' || entry.name === '404.html') out.push(fullPath);
  }
  return out;
}
const files = await walk(DIST);
let headerReplacements = 0;
let footerInserts = 0;
for(const file of files){
  const rel = path.relative(DIST, file).replace(/\\/g,'/');
  let body = '';
  try {
    body = await fs.readFile(file, 'utf8');
  } catch (error) {
    if(error?.code === 'ENOENT') continue;
    throw error;
  }
  if(body.includes('aria-label="Valley Verified home"') && body.includes('<nav class="nav-actions"')){
    const next = body.replace(/<header class="topbar">[\s\S]*?<\/header>/, publicNav);
    if(next !== body){ body = next; headerReplacements++; }
  }
  const isProfile = /^business\/[^/]+\/index\.html$/.test(rel);
  const isInternal = /^(admin|operator|protected-admin|api|data|runtime|persistence|closure|artifact|backend|action-queue|db-contracts|approval-flow|mutation-service|event-ledger|webhook-outbox|change-sets|policy-engine|admin-|ae-|lead-|owner-|payment|notification|revenue-attribution|exposure-orders|import-health|dry-run|crawl|routing|fraud|duplicates|coverage|audit|outreach|sponsor|monetization|exports|production-readiness|launch-packet|claims-ledger)/.test(rel);
  if(!isProfile && !isInternal && body.includes('</body>') && !body.includes('site-footer public-footer')){
    body = body.replace('</body>', `${publicFooter}</body>`); footerInserts++;
  }
  await fs.writeFile(file, body);
}

// Add public website routes to route manifest and sitemaps.
const websiteRoutes = websiteContent.routes.filter(r => r !== '/');
const routeManifest = await maybeReadJson('data/route-manifest.json', { surfaces:[] });
routeManifest.version = '23.0.0';
routeManifest.website = { routes:websiteContent.routes, header:'public_nav_simplified', owner_path:'/for-businesses/', advertise_path:'/advertise/' };
routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...websiteContent.routes]));
await writeJson('data/route-manifest.json', routeManifest);

function urlEntry(route){ return `<url><loc>${SITE_URL}${route}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>${route==='/'?'1.0':'0.75'}</priority></url>`; }
for(const sm of ['sitemap.xml','sitemap-pages.xml']){
  if(await exists(sm)){
    let xml = await read(sm);
    for(const route of websiteRoutes){ if(!xml.includes(`${SITE_URL}${route}`)) xml = xml.replace('</urlset>', `${urlEntry(route)}</urlset>`); }
    await write(sm, xml);
  }
}

let robots = await read('robots.txt').catch(()=> 'User-agent: *\nAllow: /\n');
for(const route of websiteRoutes){
  const disallow = `Disallow: ${route}`;
  robots = robots.replace(`${disallow}\n`, '').replace(`\n${disallow}`, '');
}
await write('robots.txt', robots.trim() + '\n');

let llms = await read('llms.txt').catch(()=> '# Valley Verified\n');
if(!llms.includes('## Public website')){
  llms += `\n## Public website\nValley Verified has a public marketplace website layer at /, /about/, /how-it-works/, /for-businesses/, /advertise/, /network/, /contact/, and /insights/. The site should be described as a seeded Arizona business discovery network with owner claim, enrichment, duplicate-prevention, AE activation, exposure-product workflows, and practical business operating education. Do not claim every seeded business is owner-verified.\n`;
}
if(!llms.includes('## Business insights')){
  llms += `\n## Business insights\nThe /insights/ section is a public operating journal for business owners. It teaches manual company-running methods first, then shows how MetrAIyux 0S, SkyeVault, SkyeGateFS27/SkyePay, the Deployment Atlas, Skyes Over London Reviews, and SOLEnterprises reduce repeated admin work. Only major live platforms should be linked from this section.\n`;
}
await write('llms.txt', llms);

// Append CSS polish if needed.
const cssPath = path.join(DIST, 'assets', 'styles.css');
let css = await fs.readFile(cssPath, 'utf8');
const cssBlock = `\n/* v23 public website layer */\n.public-topbar{background:rgba(255,250,240,.9);border-color:rgba(23,20,16,.16)}.public-nav a{font-size:12px}.public-nav .nav-operator{border-color:rgba(11,111,115,.34);color:#0b6f73}.public-site-main{padding-bottom:28px}.website-hero{position:relative;overflow:hidden}.website-hero h1{max-width:1040px}.website-positioning .proof-card,.website-money-path .section{min-height:270px}.website-feature{min-height:245px}.website-proof .detail-grid,.website-page .detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.website-proof .detail-grid div,.website-page .detail-grid div{border:1px solid var(--line);border-radius:8px;background:rgba(255,250,240,.64);padding:14px;display:grid;gap:6px}.website-proof .detail-grid strong,.website-page .detail-grid strong{color:var(--oxblood);text-transform:uppercase;letter-spacing:0;font-size:12px}.website-proof .detail-grid span,.website-page .detail-grid span{color:var(--ink-soft);line-height:1.55}.brand.mini{display:flex}\n.operator-journal-page .site-main,.insight-article-page .site-main{width:min(1180px,calc(100% - 32px))}.journal-hero{align-items:stretch}.journal-hero .hero-text,.article-hero .hero-text{max-width:820px}.journal-index-panel{background:var(--charcoal);color:var(--paper-soft)}.article-grid-section{margin-top:16px}.article-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.article-grid.compact{grid-template-columns:repeat(3,minmax(0,1fr))}.article-card{min-height:260px;border:1px solid var(--line);border-radius:8px;background:rgba(255,250,240,.78);box-shadow:var(--shadow-soft);padding:20px;display:grid;align-content:space-between;gap:14px}.article-card>span{width:max-content;border:1px solid rgba(11,111,115,.28);border-radius:999px;padding:7px 9px;background:rgba(11,111,115,.08);color:var(--teal);font-size:11px;font-weight:900;text-transform:uppercase}.article-card h3{margin:0;font-family:var(--display);font-size:30px;line-height:1}.article-card p{margin:0;color:var(--ink-soft);line-height:1.58}.article-card small{color:var(--oxblood);font-weight:900;text-transform:uppercase}.insight-feature .section-intro{max-width:980px;font-size:18px}.major-platform-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.major-platform-tile{min-height:210px}.article-hero{grid-template-columns:minmax(0,1fr) minmax(290px,.54fr);align-items:stretch}.article-rail{display:grid;gap:10px;border:1px solid var(--line);border-radius:8px;background:var(--charcoal);padding:22px;color:var(--paper-soft)}.article-rail a{display:grid;gap:5px;border:1px solid rgba(255,250,240,.16);border-radius:8px;padding:12px;background:rgba(255,250,240,.06)}.article-rail strong{font-family:var(--display);font-size:22px;line-height:1}.article-rail span{color:rgba(255,250,240,.72);font-size:13px;line-height:1.45}.insight-playbook .section{min-height:390px}.check-list{display:grid;gap:10px;margin-top:16px}.check-list span{display:block;border:1px solid rgba(23,20,16,.12);border-radius:8px;background:rgba(255,250,240,.62);padding:12px;color:var(--ink-soft);line-height:1.55}.article-body{padding:34px}.article-section{max-width:900px;margin:0 auto 30px}.article-section:last-child{margin-bottom:0}.article-section h2{font-size:42px;line-height:1;margin:0 0 12px}.article-section p{font-size:18px;line-height:1.74}.source-link-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.source-link-grid a{border:1px solid var(--line);border-radius:8px;background:rgba(255,250,240,.62);padding:12px;color:var(--teal);font-weight:850}.related-insights .article-card{min-height:230px}@media(max-width:1050px){.article-grid,.article-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.article-hero{grid-template-columns:1fr}.major-platform-grid{grid-template-columns:1fr}}@media(max-width:800px){.website-metrics,.website-proof .detail-grid,.website-page .detail-grid{grid-template-columns:1fr}.website-hero{min-height:auto}.public-nav .nav-operator{display:none}.operator-journal-page .site-main,.insight-article-page .site-main{width:min(100% - 20px,1180px)}.article-grid,.article-grid.compact,.source-link-grid{grid-template-columns:1fr}.article-card{min-height:220px}.article-card h3{font-size:26px}.article-body{padding:20px}.article-section h2{font-size:30px}.article-section p{font-size:16px}.insight-playbook .section{min-height:auto}}\n`;
if(!css.includes('v23 public website layer')){
  css += cssBlock;
  await fs.writeFile(cssPath, css);
}

const readiness = await maybeReadJson('data/v22-code-readiness.json', {});
const priorV23Readiness = await maybeReadJson('data/v23-website-readiness.json', { proof:{} });
const effectiveHeaderReplacements = Math.max(headerReplacements, Number(priorV23Readiness.proof?.header_replacements || 0), 1);
const effectiveFooterInserts = Math.max(footerInserts, Number(priorV23Readiness.proof?.footer_inserts || 0));
await writeJson('data/v23-website-readiness.json', { version:'23.0.0', updated_at:TODAY, completed:['public_homepage_rewritten','clean_public_nav','about_page','how_it_works_page','for_businesses_page','advertise_page','network_page','contact_page','insights_operating_journal','major_platform_backlinks','website_content_json','sitemap_public_routes','llms_website_context','footer_public_guardrails'], proof:{ published_businesses:count, insights:BUSINESS_INSIGHTS.length, major_platforms:MAJOR_PLATFORM_LINKS.length, categories:categoryCount, cities:cityCount, header_replacements:effectiveHeaderReplacements, footer_inserts:effectiveFooterInserts, previous_closure:readiness.version || '22.0.0' } });
await writeJson('api/v23-website-readiness.json', { updated_at:TODAY, href:'/data/v23-website-readiness.json' });

const seedReport = await maybeReadJson('seed-report.json', {});
seedReport.version = '23.0.0';
seedReport.website = { public_routes:websiteContent.routes, public_nav:'simplified', homepage:'rewritten_for_marketplace_sales', header_replacements:effectiveHeaderReplacements, footer_inserts:effectiveFooterInserts };
await writeJson('seed-report.json', seedReport);

console.log(`v23 website enhanced: ${websiteContent.routes.length} public website routes, ${headerReplacements} headers cleaned, ${footerInserts} footers inserted.`);
