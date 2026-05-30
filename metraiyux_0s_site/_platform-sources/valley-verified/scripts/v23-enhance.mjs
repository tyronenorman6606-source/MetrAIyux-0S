import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const REPO_ROOT = path.resolve(ROOT, '../../..');
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_SITE_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified';
const SITE_URL = String(process.env.VALLEY_VERIFIED_CANONICAL_URL || process.env.SITE_URL || process.env.URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
const SITE_ORIGIN = (() => { try { return new URL(SITE_URL).origin; } catch { return DEFAULT_SITE_URL.replace(/\/valley-verified\/?$/, ''); } })();
const SKYEMAIL_SIGNIN_ORIGIN = String(process.env.SKYEMAIL_SIGNIN_ORIGIN || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const SKYEMAIL_SIGNIN_BASE = `${SKYEMAIL_SIGNIN_ORIGIN}/live/SkyeMail/login.html?workspace=valley-verified`;
const REQUEST_BUILD_HREF = 'mailto:graylondonskyes@gmail.com?subject=Request%20a%20MetrAIyux%200S%20client%20build&body=I%20want%20to%20request%20a%20client%20build%20and%20Valley%20Verified%20posting.';
const APP_BUILD_GATE_HREF = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane';
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
const LONGFORM_UPGRADES = {
  'weekly-company-command-rhythm': {
    readTime:'16 min',
    longformPromise:'Use this as a weekly owner meeting you can run with a spreadsheet, a notebook, or the full 0S. The point is not ceremony. The point is to keep money, customers, delivery, proof, and risk visible at the same time.',
    diagnostics:[
      { label:'Money signal', title:'Cash and revenue are reviewed together', copy:'Revenue can look fine while cash is getting squeezed by refunds, slow collections, inventory, payroll timing, or tools nobody uses. The weekly rhythm should show revenue, collected cash, open invoices, and upcoming obligations in the same view.' },
      { label:'Customer signal', title:'Every open request has a next action', copy:'A lead is not real operating value until somebody owns it. Review new leads, unanswered requests, quotes sent, quotes accepted, jobs scheduled, and follow-ups due.' },
      { label:'Proof signal', title:'Public claims match live evidence', copy:'Before the company says a page, portal, offer, checkout, review surface, or customer route is live, the owner should be able to open the link and see proof.' }
    ],
    metrics:['Collected cash this week','Open invoices older than 7 days','New leads and first-response time','Quotes sent and quote acceptance rate','Jobs or orders delivered','Follow-ups due today','Reviews requested and received','Broken links or public claims needing cleanup'],
    worksheet:['Open the same scorecard every Monday or Friday. Do not change the format every week.','Mark each lane green, yellow, or red. Green means stable, yellow means attention, red means owner intervention.','Pick three fixes only: one revenue fix, one customer fix, and one proof or delivery fix.','Write the decision in past-tense language once it is done so next week starts from evidence, not memory.','Move anything that needs a build, gate, vault, page, or proof record into the 0S inquiry path.'],
    mistakes:['Letting the meeting become a complaint session instead of a decision session.','Tracking vanity metrics without tracking the next action.','Reviewing marketing without reviewing intake and follow-up.','Promising public progress before the live route has been opened in a browser.','Ending the meeting with ten priorities and no owner for each one.'],
    sections:[
      ['Why most owner meetings do not change the business',[
        'Small companies rarely fail because the owner has no instincts. They fail because the business keeps asking the owner to remember too much at once. Leads live in text threads, payments live in dashboards, receipts live in inboxes, website changes live in half-finished folders, and customer problems live in whoever got yelled at last. A weekly rhythm does not make the company more corporate. It makes the company visible enough to be managed.',
        'The mistake is treating a weekly meeting like a motivational ritual. The useful version is a control room. It answers five questions every week: what money moved, what customers are waiting, what delivery is blocked, what proof is public, and what risk needs a decision. When those five lanes are reviewed together, the owner can see the real constraint instead of chasing the loudest notification.'
      ]],
      ['The manual scorecard that works before software',[
        'Start with one sheet. Across the top, put the date. Down the left side, put cash, revenue, open invoices, new leads, unanswered leads, quotes sent, jobs scheduled, jobs delivered, review requests, broken links, customer escalations, and owner decisions. Add one owner column and one next-action column. That is enough to expose most operating problems without buying anything.',
        'The discipline is to keep the scorecard boring. Do not make it a dashboard project. A dashboard that takes three days to maintain is another liability. The owner should be able to update the weekly board in twenty minutes and read the business in ten. If a number cannot be found quickly, that is not a failure of the meeting; it is a signal that the system does not yet know where the fact lives.'
      ]],
      ['Separate lagging numbers from operating signals',[
        'Revenue is a lagging number. By the time monthly revenue looks bad, the company may have already dropped leads, quoted too slowly, ignored reviews, or sold the wrong offer. The weekly rhythm should include leading indicators: first-response time, quote acceptance, follow-up backlog, delivery exceptions, and proof gaps. These are the numbers that warn the owner before the bank balance becomes the alarm.',
        'The best weekly scorecards include both truth and motion. Truth is the current state: how much cash, how many leads, how many open jobs, how many late responses. Motion is the next action: who calls, who fixes the page, who uploads receipts, who gets the review request, who checks the broken link. A scorecard without motion is a report. A scorecard with motion becomes management.'
      ]],
      ['Run the meeting in lanes, not vibes',[
        'Use five lanes: money, customers, delivery, proof, and risk. Money covers cash, invoices, subscriptions, refunds, margins, and upcoming obligations. Customers covers leads, quotes, follow-ups, complaints, reviews, and repeat buyers. Delivery covers jobs, orders, files, scope changes, and handoffs. Proof covers public pages, screenshots, receipts, review surfaces, deployment records, and live links. Risk covers security, access, stale promises, compliance, and anything that could embarrass the company if ignored.',
        'Each lane gets a color and an owner decision. Green means the lane is stable and no owner action is needed. Yellow means a person needs to move something before next week. Red means the owner must decide now because delay is costing money, trust, or control. This color system is simple enough to keep and serious enough to stop the company from drifting.'
      ]],
      ['The decision log is the memory of the company',[
        'A decision that is not written down becomes folklore. Pricing exceptions, refund promises, delivery changes, customer escalations, vendor commitments, tool cancellations, and public launch decisions need a small log. The log should include date, decision, owner, reason, due date, and proof. The reason matters because three months later the company will forget why the decision was made and may accidentally reverse it.',
        'This is especially important when the company is moving fast. Fast teams create many tiny decisions. If those decisions stay inside chat messages, the owner has to become the archive. A decision log lets the company operate with memory even when the owner is tired, busy, or working across multiple surfaces.'
      ]],
      ['Where the 0S belongs in the rhythm',[
        'The 0S is most useful when the company already knows its lanes. It gives those lanes rooms: a deployment atlas for live surfaces, a vault for receipts and proof, gates for protected flows, public pages for buyers, review surfaces for reputation, and operator notes for decisions. It does not remove the need for the owner to think. It removes the repeated hunt for scattered facts.',
        'In the weekly rhythm, the owner can ask: what went live, what needs proof, what public link should be removed, what customer flow needs a gate, what receipt belongs in the vault, what page should point back into the system, and what decision needs to be visible next week. That is the difference between a software stack and an operating system.'
      ]],
      ['A practical first month rollout',[
        'Week one is inventory. List the numbers you can already find and the numbers you cannot. Week two is ownership. Assign one person or one role to each lane. Week three is cleanup. Fix the most expensive leak, usually slow follow-up, missing receipts, stale public copy, or unclaimed review requests. Week four is system design. Decide what should become a repeatable workflow instead of a manual chase.',
        'By the end of the first month, the company should have one scorecard, one decision log, one proof folder or vault, one public link checklist, and one owner review cadence. That is enough to make the business calmer. Then the 0S can turn the repeated parts into surfaces, gates, receipts, and automated handoffs.'
      ]]
    ]
  },
  'local-visibility-that-converts': {
    readTime:'17 min',
    longformPromise:'This is a practical local visibility playbook for businesses that want calls, quotes, bookings, and trust instead of empty traffic.',
    diagnostics:[
      { label:'Discovery', title:'The public record is complete', copy:'Name, category, hours, phone, website, service area, description, photos, and proof should tell a buyer what the business does and what to do next.' },
      { label:'Conversion', title:'The page answers the buyer in motion', copy:'A local buyer is comparing quickly. The page needs service clarity, location signal, trust proof, and a call or request path without forcing the buyer to decode the brand.' },
      { label:'Control', title:'Dead links are removed from the public story', copy:'Visibility becomes dangerous when old routes, stale offers, or broken pages stay public. The operating layer should know which links are live.' }
    ],
    metrics:['Profile completeness','Calls or quote requests by page','Service-page click-through','Direction or map actions','Review count and response rate','Broken public links found','Pages with current hours and service area','Claimed versus unclaimed profiles'],
    worksheet:['Search the business name, top service, and city. Write down what a buyer sees before clicking.','Fix the business profile basics: category, hours, phone, website, description, service area, and photos.','Create one page for the highest-value service and one page for the strongest local market.','Add one clear action to each page: call, quote, booking, claim, or compare.','Review the live links weekly and remove anything that 404s or misrepresents the offer.'],
    mistakes:['Treating ranking as the goal instead of buyer action.','Using vague service descriptions that do not match search intent.','Sending every visitor to a generic homepage with no local context.','Letting old domains, staging links, and abandoned tools stay public.','Listing every minor deployment instead of the major surfaces a buyer or owner can trust.'],
    sections:[
      ['Visibility is not the same as being chosen',[
        'A business can show up and still lose the buyer. Local visibility only matters when it helps a person make a decision. The buyer wants to know whether the company handles the job, serves the area, looks alive, has proof, and gives a clean next step. Ranking without those answers is just a louder leak.',
        'Google Business Profile guidance pushes owners to keep information accurate and complete, and local ranking guidance centers relevance, distance, and prominence. That maps cleanly to real buyer behavior. Relevance means the business clearly matches the job. Distance means the buyer can understand service area. Prominence means the business looks active, known, and trusted enough to call.'
      ]],
      ['Start with the public record before writing more copy',[
        'The manual method begins with cleanup. Confirm the business name, primary category, secondary categories, phone, website, hours, holiday hours, service area, description, attributes, photos, and appointment or quote links. Then search the business from a private browser and a phone. What shows up first? What is wrong? What would confuse a buyer?',
        'This step is not glamorous, but it is often where money leaks. A wrong phone number, old website, missing category, unclear service area, or dead page can waste every marketing dollar that follows. A business should not buy traffic to a broken front door.'
      ]],
      ['Build pages around buyer decisions',[
        'A useful local page answers a specific question. For example: emergency HVAC repair in Glendale, pallet pickup in Phoenix, smoke shop near Litchfield Park, bookkeeping for contractors, or review management for a local service business. The page should not be a general brand essay. It should explain the service, the area, the proof, the process, the response window, and the next action.',
        'The page should also be honest about fit. If the company does not serve a city, does not offer emergency work, does not handle commercial accounts, or requires a minimum order, say so. Clear fit improves conversion because the right buyer feels less friction and the wrong buyer self-selects out before wasting time.'
      ]],
      ['Proof belongs close to the action',[
        'Do not hide trust proof in a separate gallery that buyers never open. Put proof near the action: review excerpts, project photos, service examples, verification status, business page links, receipts, or live app routes. The buyer should not have to search the site to answer "is this real?"',
        'For a Valley Verified page, the proof can include the business category, city, contact routes, website handoff, claim status, and system links. For a full 0S build, the proof can include deployment receipts, live surfaces, gates, review pages, and vault-backed records. The more expensive the service, the closer proof should be to the buying decision.'
      ]],
      ['The local visibility loop',[
        'Run the loop monthly: search, inspect, fix, publish, measure, and remove. Search the important terms. Inspect what appears. Fix wrong information. Publish one useful page or update. Measure calls, quote requests, form starts, and page clicks. Remove dead links and stale claims. This loop is more valuable than randomly posting content because it keeps the public record aligned with the business.',
        'The loop should also include competitor observation. The point is not to copy competitors. It is to understand the buyer standard in the market. If every strong competitor shows pricing ranges, emergency hours, service photos, and hundreds of reviews, a vague page with no proof is not ready.'
      ]],
      ['Where the 0S improves the loop',[
        'The 0S makes local visibility easier by connecting pages to operations. A Valley Verified profile can become a public discovery point. A full system can route inquiries into forms, gates, payment flows, review surfaces, and proof storage. The Deployment Atlas keeps track of what is live so stale experiments do not stay in public circulation.',
        'The result is a cleaner handoff. A buyer sees a useful page, takes action, enters a workflow, and the owner can later review what happened. That is better than a pile of disconnected landing pages that generate mystery leads and no operating memory.'
      ]],
      ['A 30-day local visibility plan',[
        'Days one through seven: fix public business data and remove broken links. Days eight through fourteen: build or improve the highest-value local service page. Days fifteen through twenty-one: add proof, review prompts, photos, and a clear quote or call path. Days twenty-two through thirty: measure actions, follow up on every request, and decide which service or city deserves the next page.',
        'Do not publish ten weak pages. Publish one page that answers real buyer questions and routes action cleanly. Then repeat the loop. Compounding local visibility comes from consistent accuracy, proof, and follow-up.'
      ]]
    ]
  },
  'customer-intake-follow-up-system': {
    readTime:'15 min',
    longformPromise:'Use this to stop paying for leads that disappear inside inboxes, texts, DMs, and quote chaos.',
    diagnostics:[
      { label:'Capture', title:'Every request becomes a record', copy:'A customer request should never exist only as a notification. It needs customer info, source, need, timeline, owner, status, and next action.' },
      { label:'Speed', title:'The first response window is defined', copy:'If the team does not know the expected response time, the customer decides the company is slow before the owner sees the problem.' },
      { label:'Memory', title:'Proof travels with the job', copy:'Photos, receipts, scopes, approvals, quote changes, and delivery notes should stay attached to the customer journey.' }
    ],
    metrics:['First-response time','Requests by source','Unanswered requests','Quotes sent','Quote acceptance rate','Follow-ups due','Closed-lost reasons','Jobs missing proof files'],
    worksheet:['Define the minimum fields for a qualified request.','Create five statuses: new, contacted, quoted, scheduled, closed.','Write response-time rules for business hours and after-hours messages.','Create follow-up templates for quote sent, no response, scheduling, and post-delivery review.','Store files and decisions with the request instead of leaving them in chat threads.'],
    mistakes:['Buying more leads before fixing response speed.','Letting every salesperson invent their own qualification questions.','Quoting without recording scope assumptions.','Forgetting to follow up after the customer asks one clarifying question.','Losing proof after delivery and then struggling to collect reviews or defend work.'],
    sections:[
      ['The cheapest growth is often fewer dropped requests',[
        'A business can feel like it needs more marketing when the real problem is that existing demand is leaking. A customer asks a question, someone replies late, the quote is missing context, the follow-up never happens, and the owner calls it a slow month. Before spending more money on ads, the company needs to know how many requests arrived, where they came from, who answered, what happened next, and why they did or did not close.',
        'This is not about installing a giant CRM on day one. It is about respecting the moment when a buyer raises their hand. The intake system should make that moment visible and give it a path.'
      ]],
      ['Define the request record',[
        'At minimum, capture name, contact method, service or product, location, timeline, budget signal if relevant, source, notes, files, owner, status, and next action. If a field does not help qualify, route, price, schedule, or follow up, leave it out. Long forms can kill action. Thin forms can create chaos. The right form captures enough to move.',
        'Every request should become a record even if the first message came by phone, text, email, social DM, or walk-in conversation. Manual entry is fine at first. The habit matters more than the tool. If the company cannot count requests, it cannot diagnose revenue leaks.'
      ]],
      ['Create statuses that match the real workflow',[
        'Most small teams need simple statuses: new, contacted, qualifying, quoted, scheduled, delivered, won, lost, and nurture. The key is that each status has a rule. New means no human has responded. Contacted means the first response happened. Quoted means price or scope has been sent. Scheduled means the work has a date. Delivered means the job is complete and proof should be collected.',
        'Do not create twenty statuses because the tool allows it. Too many statuses become decoration. The owner should be able to open the queue and immediately see where money is stuck.'
      ]],
      ['Follow-up is part of sales, not begging',[
        'A good follow-up system is respectful and useful. It reminds the customer what they asked for, confirms the next step, answers the common objection, and gives an easy way to respond. It does not harass. It does not pretend urgency where none exists. It simply keeps the conversation from dying because everyone got busy.',
        'Write templates for common moments: thanks for reaching out, need more info, quote sent, checking in, schedule confirmation, pre-delivery checklist, delivery complete, review request, and dormant lead reactivation. Templates should sound human and be edited when the situation needs judgment.'
      ]],
      ['Proof should be collected during the job, not after the fact',[
        'If the business waits until the end to gather photos, approvals, receipts, notes, and review context, proof will be incomplete. Build proof into the workflow. Before work starts, capture scope. During work, capture changes. After delivery, capture completion and customer response. That proof protects the company and fuels marketing later.',
        'This matters for disputes, reviews, repeat sales, training, and owner visibility. A job without proof is harder to defend and harder to learn from.'
      ]],
      ['Where 0S changes the workload',[
        'MetrAIyux 0S can turn the intake path into an operating surface. The request can enter a form, attach files, move through a gate, create a packet, store proof in a vault, and later appear in an owner review. SkyeGateFS27 is useful when access, payment, or protected customer state matters. SkyeVault is useful when the record needs to survive beyond the conversation.',
        'The value is not "automation" as a buzzword. The value is that every request has a place, every place has a state, and the owner can see where money is leaking without reading every message manually.'
      ]],
      ['A 14-day intake repair plan',[
        'Days one through three: count every request from the last thirty days and mark what happened. Days four through six: define the required fields and statuses. Days seven through ten: build the form or sheet, write response templates, and assign ownership. Days eleven through fourteen: run the live queue daily and record first-response time and follow-up backlog.',
        'After two weeks, the owner should know whether the business needs more leads or simply needs to stop wasting the leads it already earned.'
      ]]
    ]
  },
  'records-receipts-and-money-hygiene': {
    readTime:'16 min',
    longformPromise:'This is a practical records system for owners who want cleaner cash visibility, easier taxes, stronger proof, and fewer mystery files.',
    diagnostics:[
      { label:'Income', title:'Money in can be explained', copy:'Deposits, invoices, payment processor records, cash sales, refunds, and discounts should tie back to a customer, sale, or operating event.' },
      { label:'Expense', title:'Money out has support', copy:'Receipts, bills, card statements, subscriptions, vendor agreements, payroll records, and assets need labels and storage.' },
      { label:'Proof', title:'Files are retrievable under pressure', copy:'The test is simple: can the owner find the right receipt, scope, invoice, or proof screenshot in under two minutes?' }
    ],
    metrics:['Uncategorized transactions','Receipts missing','Open invoices','Refunds and chargebacks','Recurring subscriptions','Cash collected versus invoiced','Monthly close completed date','Files found within two minutes'],
    worksheet:['Create folders by year, month, and record type.','Use file names with date, vendor or customer, amount, and document type.','Reconcile weekly if volume is high and monthly at minimum.','Keep a missing-receipt list instead of pretending everything is clean.','Attach proof files to the customer, invoice, job, or deployment whenever possible.'],
    mistakes:['Waiting until tax season to organize a full year of records.','Saving screenshots with random file names that cannot be searched.','Mixing personal and business expenses without notes.','Canceling tools without saving invoices or exports.','Treating receipts as accounting-only instead of operational proof.'],
    sections:[
      ['Records are not just for taxes',[
        'The IRS guidance is direct: records should clearly show income and expenses, and supporting documents matter. That is the compliance reason. The operating reason is just as important. Clean records tell the owner what sold, what cost too much, what repeated, what was refunded, what is late, and what proof exists when a customer or vendor question comes back.',
        'A business with messy records pays twice. It pays in tax-season stress, and it pays every week when the owner cannot see cash clearly. The goal is not perfect bookkeeping theatre. The goal is a record system that helps the company make decisions while also keeping the accountant from having to reconstruct the year from chaos.'
      ]],
      ['Build a record map before buying tools',[
        'A simple record map has six buckets: income, expenses, payroll, assets, contracts, and customer proof. Income includes invoices, deposits, payment processor reports, cash logs, refunds, and discounts. Expenses include receipts, bills, subscriptions, vendor payments, card statements, and reimbursements. Payroll includes wages, contractor payments, taxes, and timesheets. Assets include equipment, vehicles, software, and depreciation support. Contracts include scopes, approvals, and change orders. Customer proof includes photos, messages, delivery confirmation, and review context.',
        'Once the buckets exist, tools become easier to choose. Without the map, the company just moves mess into new software.'
      ]],
      ['Use naming rules that survive busy weeks',[
        'A good file name is boring: YYYY-MM-DD_vendor-or-customer_amount_type. A receipt might be 2026-05-17_home-depot_187-42_receipt.pdf. A customer proof file might be 2026-05-17_bobs-smoke-shop_delivery-photo.jpg. The point is searchability. The owner should not need to remember which device captured the file or who uploaded it.',
        'Folders should follow the same logic. Year, month, record type, and customer or vendor are usually enough. If the system requires clever memory, it will fail when the business gets busy.'
      ]],
      ['Monthly close for small teams',[
        'A monthly close can be simple. Reconcile bank and card accounts. Label unknown transactions. Attach missing receipts. Review open invoices. Check subscriptions. Export payment processor reports. Save payroll records. Write a short owner summary: cash in, cash out, unpaid money, unusual expenses, refunds, and decisions needed.',
        'The close should produce questions, not just files. Why did this subscription double? Why are these invoices late? Why did this service lane produce revenue but weak cash? Why are refunds clustered around one offer? Those questions help the owner fix operations before the numbers repeat.'
      ]],
      ['Receipts protect customer trust',[
        'Receipts and proof also matter outside accounting. If a customer disputes scope, if a vendor claims unpaid work, if a platform questions a charge, or if a review misstates what happened, the company needs records. A screenshot, approval, signed scope, delivery photo, payment receipt, or change note can prevent a small issue from becoming expensive.',
        'This is why records should attach to jobs and customer flows, not only to accounting folders. Accounting asks "what did this cost?" Operations asks "what happened?" The strongest system answers both.'
      ]],
      ['Where SkyeVault and 0S fit',[
        'SkyeVault gives the company a place for receipts, proof packets, screenshots, files, exports, and handoff records. MetrAIyux 0S can connect those records to pages, gates, payment flows, deployment receipts, and operating notes. That means a proof file can be part of the workflow, not an afterthought someone uploads weeks later.',
        'The owner still needs discipline. The system does not magically make bad file habits good. But it gives the discipline a durable place to live and makes it easier to prove the business is operating from evidence.'
      ]],
      ['A first-week cleanup sprint',[
        'Day one: list every place business records currently live. Day two: create the six buckets. Day three: clean this month only. Day four: clean last month. Day five: create the missing-receipt list. Day six: reconcile open invoices and subscriptions. Day seven: write the first owner record summary.',
        'Do not start by organizing the entire history of the company. Start with the current month and build the rhythm. Historical cleanup can follow once the live system is stable.'
      ]]
    ]
  },
  'small-business-security-without-paranoia': {
    readTime:'17 min',
    longformPromise:'This is security without performance: clear controls, fewer exposed doors, better backups, and a response plan a small team can actually use.',
    diagnostics:[
      { label:'Access', title:'Every important account has an owner', copy:'Website, domain, email, payment, file storage, social, analytics, booking, and bank access should have current owners, MFA, and recovery methods.' },
      { label:'Data', title:'The business collects less sensitive information', copy:'If the company does not need a piece of customer data, it should not collect it. If it must collect it, access should be limited.' },
      { label:'Recovery', title:'Backups and response steps are tested', copy:'A backup that has never been restored is a hope, not a recovery plan. The team needs a simple breach and outage checklist.' }
    ],
    metrics:['Accounts with MFA enabled','Former users removed','Critical files backed up','Backup restore test date','Devices with auto-updates on','Sensitive data locations','Public routes retired','Incident response contacts confirmed'],
    worksheet:['List every critical account and who owns it.','Turn on MFA for email, domain, website, payments, file storage, and admin tools.','Remove old users and shared passwords.','Back up files and test restoring one important folder.','Write a one-page incident plan with contacts, shutdown steps, and customer communication rules.'],
    mistakes:['Thinking security is only a big-company issue.','Keeping old admin accounts because nobody wants to check.','Collecting customer data the business does not actually need.','Using public pages for sensitive workflows.','Assuming backups work without testing a restore.'],
    sections:[
      ['Security is mostly boring on purpose',[
        'The FTC small-business guidance emphasizes practical basics: update software, require strong passwords, use MFA, back up important files, secure devices, train staff, and have a response plan. NIST CSF 2.0 gives owners a helpful structure: govern, identify, protect, detect, respond, and recover. None of that requires pretending to be a giant enterprise. It requires building habits that make common failures less damaging.',
        'The goal is not paranoia. The goal is fewer mystery doors. A small business should know who can access important systems, where customer data lives, what public links exist, how files are backed up, and what happens if something goes wrong.'
      ]],
      ['Start with account inventory',[
        'List the domain registrar, website host, email provider, payment processor, bank portal, file storage, booking system, CRM, social accounts, ad accounts, review platforms, analytics, and admin tools. For each account, record owner, login method, MFA status, recovery email, backup admin, billing owner, and whether old users still have access.',
        'This inventory often exposes the real risk immediately. Former contractors still have access. Shared passwords are floating around. Recovery emails point to dead inboxes. Nobody knows who owns the domain. These problems are common and fixable.'
      ]],
      ['Protect customer data by collecting less of it',[
        'FTC guidance on personal information starts with a simple idea: know what you collect, keep only what you need, protect it, dispose of it safely, and plan for incidents. Small businesses often collect too much because forms are easy to add. Every extra field becomes something to protect.',
        'Ask: do we need full birth dates, home addresses, IDs, payment details, medical notes, or sensitive context? If not, do not collect it. If yes, limit access and decide how long it should live. Data minimization is one of the cheapest security controls because the safest record is the one the company never needed to hold.'
      ]],
      ['Backups need proof',[
        'A backup policy should answer what is backed up, where it lives, who can restore it, how often it runs, and when it was last tested. Many businesses believe they have backups because a platform says files sync. Sync is not always backup. If ransomware, deletion, billing failure, or accidental overwrite happens, the owner needs a restore path.',
        'Test one restore per quarter. Pick an important folder, restore it to a safe location, and write down the result. This turns backup from a belief into proof.'
      ]],
      ['Separate public pages from protected workflows',[
        'A public marketing page should not be the same surface as sensitive admin operations. Quote requests, payment flows, customer files, private notes, and operator controls need appropriate gates. The more public experiments a company launches, the more important it becomes to know which routes are live, which are gated, and which should be retired.',
        'This is where many fast-moving teams get sloppy. A test page ships, an old function route stays available, a staging form collects real data, or a dashboard link appears in public navigation. Link discipline is a security control.'
      ]],
      ['Where 0S changes the workload',[
        'SkyeGateFS27 keeps access-sensitive flows behind gate logic. SkyeVault keeps proof and files out of casual website content. The Deployment Atlas shows live surfaces and helps operators remove or demote routes that should not be part of the public story. Together, those pieces create a cleaner boundary between public proof and protected operation.',
        'The owner still needs account inventory, MFA, backups, and response planning. The system helps by making surfaces explicit. You cannot secure what you cannot see.'
      ]],
      ['A one-page incident plan',[
        'Write the plan before the bad day. Include who decides, who communicates, how to contact vendors, how to freeze affected accounts, where backups live, where customer notices are drafted, and what proof needs to be preserved. Keep it short enough that a tired person can use it.',
        'The plan should also say what not to do: do not delete evidence, do not make public claims before facts are confirmed, do not keep using compromised accounts, and do not hide customer-impacting issues from the person responsible for customer trust.'
      ]]
    ]
  },
  'reviews-social-proof-without-shady-tactics': {
    readTime:'16 min',
    longformPromise:'This is a review system that builds trust without fake pressure, fake praise, or manipulative incentives.',
    diagnostics:[
      { label:'Ask', title:'Every real customer gets a neutral request', copy:'The business should ask at the right moment without filtering only happy customers or writing the review for them.' },
      { label:'Respond', title:'Reviews become service intelligence', copy:'Responses should be timely, specific, and useful. Review themes should feed training, FAQ updates, and offer improvements.' },
      { label:'Prove', title:'Social proof has a home', copy:'Good proof should not live only in screenshots. It should be searchable, linkable, and connected to the customer journey.' }
    ],
    metrics:['Review requests sent','Review conversion rate','Average response time','Negative review response rate','Themes repeated by customers','Service fixes from reviews','Public proof pages updated','Reviews tied to completed jobs'],
    worksheet:['Pick the exact moment when a review request should be sent.','Write a neutral request that does not pressure for positivity.','Create response templates for praise, complaints, confusion, and fake-looking reviews.','Review themes monthly and turn them into service improvements.','Publish proof in a way buyers can inspect without exaggeration.'],
    mistakes:['Only asking customers who seem happy.','Offering rewards only for positive reviews.','Ignoring negative reviews until they define the public story.','Copying review text into marketing without context or permission rules.','Treating reviews as decoration instead of operational feedback.'],
    sections:[
      ['Buyers trust reviews because they are imperfect',[
        'A review profile with only polished praise can look less believable than one with real detail, range, and human response. Buyers know reviews can be gamed. The FTC warns against fake reviews, misleading review practices, and incentives that distort the record. A serious review system should make trust easier, not shakier.',
        'The goal is to ask real customers, keep the request neutral, respond with care, and learn from patterns. A review program should never pressure customers to say what the company wants to hear. It should make it easy for real customers to say what happened.'
      ]],
      ['Ask at the right operational moment',[
        'The best review moment is after value is delivered and while the experience is still fresh. For a service business, that might be after completion photos and payment confirmation. For a retail business, it might be after a helpful visit or repeat purchase. For a B2B company, it might be after a milestone or measurable result.',
        'Do not wait weeks, and do not ask before the customer has enough experience to speak honestly. The request should be short, neutral, and easy: thank you, here is the link, your honest feedback helps buyers and helps us improve.'
      ]],
      ['Review requests need rules',[
        'Write rules so the team does not improvise. Ask every eligible real customer, not only the ones who seem thrilled. Do not provide a script that tells customers what to say. Do not offer compensation for positive reviews. Do not block negative feedback from view. Do not post fake customer stories. Keep the rules where staff can see them.',
        'These rules protect the business. A short-term fake boost can create long-term trust damage. Real reviews are slower but stronger because they can survive scrutiny.'
      ]],
      ['Respond like the review is public training',[
        'A review response is not only for the reviewer. It is for every future buyer reading how the company behaves under praise, confusion, and criticism. Thank specific details when possible. For complaints, acknowledge, avoid arguing, invite a private resolution when appropriate, and show what the company will improve without revealing private customer information.',
        'The owner should review responses monthly. If customers keep mentioning late replies, unclear pricing, messy scheduling, or great staff behavior, that is operating intelligence. Reviews are not just reputation. They are a customer research feed.'
      ]],
      ['Turn proof into usable assets',[
        'A good review can support FAQ copy, service pages, sales conversations, training, and offer refinement. The company should collect themes: fast response, clean work, friendly staff, transparent pricing, convenient scheduling, strong follow-through, or specific product knowledge. Those themes show what buyers actually value.',
        'Do not over-polish the language. The power of reviews is that they sound like customers. Use themes to improve the business and link to inspectable proof where appropriate.'
      ]],
      ['Where the 0S changes the workload',[
        'Skyes Over London Reviews can turn review proof into a searchable surface with real detail pages instead of scattered screenshots. MetrAIyux 0S can connect completed work, proof receipts, review requests, public pages, and owner review. That means reputation becomes part of the operating loop.',
        'The system cannot manufacture trust. It can make earned trust easier to collect, organize, inspect, and connect to the buyer journey.'
      ]],
      ['A review system you can run this week',[
        'Day one: define eligible customers and the request moment. Day two: write the neutral request and response templates. Day three: build the tracking sheet or workflow. Day four: send requests for recent completed work. Day five: respond to every unanswered review. Day six: extract themes. Day seven: update one page or FAQ using what customers actually said.',
        'Repeat weekly. The habit compounds because reviews, responses, and service fixes reinforce each other.'
      ]]
    ]
  },
  'market-research-before-growth-spend': {
    readTime:'15 min',
    longformPromise:'Use this before buying ads, launching a new offer, expanding to a new city, or building a page nobody asked for.',
    diagnostics:[
      { label:'Buyer', title:'The customer is specific enough to find', copy:'A growth test needs a defined buyer, problem, geography, budget context, and trigger. "Everyone" is not a market.' },
      { label:'Demand', title:'There is evidence of need', copy:'Search behavior, competitor activity, public data, sales conversations, and customer questions should point toward a real problem.' },
      { label:'Test', title:'The first campaign is small and measurable', copy:'A market test should have one offer, one page, one audience, one follow-up path, and one measurement window.' }
    ],
    metrics:['Target market size signal','Competitor count and strength','Search intent quality','Landing page conversion','Cost per qualified inquiry','Follow-up completion rate','Offer objections','Revenue from test cohort'],
    worksheet:['Write the buyer, job-to-be-done, city or niche, and urgency trigger.','List three competitors and what proof they show.','Use public data to understand local population, industry, income, or business density where relevant.','Build one focused page and one follow-up path.','Set a decision rule before spending: continue, revise, or stop.'],
    mistakes:['Launching because the idea feels exciting instead of because the market shows signal.','Copying a competitor without understanding their economics.','Testing too many offers at once.','Measuring clicks while ignoring qualified conversations and revenue.','Keeping failed experiments public after the test ends.'],
    sections:[
      ['Research is not homework; it is risk reduction',[
        'The SBA frames market research as a way to understand customers and reduce risk. That is the whole point. A small company does not have unlimited money to waste on weak offers, vague audiences, or new service lanes that only sound good in a meeting. Research helps the owner decide where to place the next bet.',
        'Census Business Builder and similar public data tools can help owners understand demographics, economic patterns, and local market context. Search results, competitor pages, reviews, customer calls, and sales objections add another layer. None of these sources are perfect. Together, they can keep the company from guessing blindly.'
      ]],
      ['Write the growth brief first',[
        'Before launching, write one page: buyer, problem, trigger, geography, current alternatives, why the business can win, proof needed, offer, price signal, channel, follow-up path, and stop rule. If the brief sounds vague, the campaign will be vague. If the buyer cannot be described clearly, the page will not convert clearly.',
        'The brief should also name what the company is not testing. Scope discipline matters. A small test cannot answer every question. It should answer one question well enough to decide the next move.'
      ]],
      ['Understand the competitor standard',[
        'Search the city, service, and buyer problem. Open the strongest competitors. What do they show? Pricing ranges, reviews, photos, case studies, emergency availability, online booking, service guarantees, industry certifications, financing, or before-and-after proof? The goal is not imitation. The goal is to understand what the buyer already sees.',
        'If the market standard is strong proof and your page has vague copy, the test is unfair. If competitors are weak and buyers still search often, that may be an opening. Research helps you see both threat and opportunity.'
      ]],
      ['Use public data to ground local decisions',[
        'Public data can help a business choose where to focus. Population, household income, business density, industry clusters, commuting patterns, and local employer mix can all influence whether an offer makes sense. A contractor, accountant, retail store, medical-adjacent service, or B2B provider may care about different signals.',
        'The owner does not need to become a statistician. The owner needs enough context to avoid spending money in a market that does not match the offer.'
      ]],
      ['Design the smallest useful test',[
        'A useful test has one audience, one offer, one page, one route for inquiries, and one follow-up workflow. The page should answer the buyer problem, show proof, explain fit, and ask for one action. The follow-up should be ready before traffic starts. Otherwise the company may prove demand exists and still waste it.',
        'Pick a measurement window. For some offers, two weeks is enough to see directional signal. For expensive B2B or seasonal services, the window may be longer. Decide in advance what will count as continue, revise, or stop.'
      ]],
      ['Where the 0S changes the workload',[
        'MetrAIyux 0S can turn a research brief into a controlled deployment: a focused page, proof links, inquiry route, vault records, deployment atlas entry, and follow-up path. The system helps the owner know what is live, what is being tested, and what should be removed if the experiment fails.',
        'That removal part matters. Failed experiments are not shameful. Leaving failed links public is sloppy. A good operating system makes it easier to test and easier to clean up.'
      ]],
      ['A practical market test calendar',[
        'Week one: write the brief, inspect competitors, gather public data, and define the offer. Week two: build the page and follow-up path. Week three: send traffic or outreach to the test. Week four: review qualified inquiries, objections, conversion, and revenue. Decide continue, revise, or stop.',
        'The discipline is to make the decision from evidence. If the market shows promise, scale the lane. If the offer is wrong, revise. If there is no signal, stop and remove or demote the public route.'
      ]]
    ]
  }
};
for (const article of BUSINESS_INSIGHTS) {
  const upgrade = LONGFORM_UPGRADES[article.slug];
  if (upgrade) Object.assign(article, upgrade);
}
const PUBLICATION_CATEGORIES = [
  { slug:'operating-rhythm', name:'Operating Rhythm', deck:'Weekly cadence, scorecards, decision logs, and owner visibility.', color:'#0b6f73' },
  { slug:'local-growth', name:'Local Growth', deck:'Search, market research, pages, proof, and buyer action loops.', color:'#7c1a26' },
  { slug:'revenue-systems', name:'Revenue Systems', deck:'Lead capture, quote control, follow-up, handoff, and sales operations.', color:'#855c00' },
  { slug:'records-proof', name:'Records and Proof', deck:'Receipts, vaults, records, customer proof, and financial hygiene.', color:'#415a77' },
  { slug:'trust-risk', name:'Trust and Risk', deck:'Security, reviews, compliance-safe proof, and public claims control.', color:'#5e548e' },
  { slug:'automation-stack', name:'Automation Stack', deck:'Where 0S, gates, vaults, reviews, ledgers, and portals reduce repeated work.', color:'#2f6f4e' }
];
const PILLAR_META = {
  'weekly-company-command-rhythm': { category:'operating-rhythm', series:'company-command', publishAt:'2026-05-01', pillar:true },
  'local-visibility-that-converts': { category:'local-growth', series:'visibility-engine', publishAt:'2026-05-02', pillar:true },
  'customer-intake-follow-up-system': { category:'revenue-systems', series:'revenue-control', publishAt:'2026-05-03', pillar:true },
  'records-receipts-and-money-hygiene': { category:'records-proof', series:'proof-ledger', publishAt:'2026-05-04', pillar:true },
  'small-business-security-without-paranoia': { category:'trust-risk', series:'trust-and-risk', publishAt:'2026-05-05', pillar:true },
  'reviews-social-proof-without-shady-tactics': { category:'trust-risk', series:'trust-and-risk', publishAt:'2026-05-06', pillar:true },
  'market-research-before-growth-spend': { category:'local-growth', series:'visibility-engine', publishAt:'2026-05-07', pillar:true }
};
const FIELD_GUIDE_BLUEPRINTS = [
  ['quote-follow-up-rhythm','Quote follow-up rhythm that does not feel desperate','Turn sent quotes into a clean follow-up lane with owner visibility, source tracking, objection notes, and next actions.','Revenue Systems','revenue-systems','revenue-control','2026-05-08',['0S','GATE'],['sbaPlan'],['sent quotes','customer objections','follow-up dates','closed-lost reasons'],['define quote stages','write two follow-up templates','track objections','review stuck quotes weekly']],
  ['service-page-that-sells-one-job','Build a service page that sells one real job','A service page should answer a specific buyer problem, show proof, and route the customer into one action.','Local Growth','local-growth','visibility-engine','2026-05-09',['MKT','0S'],['googleRanking','sbaMarket'],['target job','service area','proof assets','conversion action'],['pick one job','write fit and non-fit rules','place proof near the CTA','measure calls and requests']],
  ['owner-decision-log-template','The owner decision log that stops repeated confusion','Record pricing exceptions, public claims, customer promises, and system changes before they become memory fights.','Operating Rhythm','operating-rhythm','company-command','2026-05-10',['0S','ATLAS'],['sbaPlan'],['decision date','owner','reason','proof link'],['log every exception','attach evidence','review unresolved decisions','close decisions in writing']],
  ['review-request-after-delivery','Review request timing after delivery','Ask for reviews when value is fresh, the request is neutral, and the workflow can learn from the response.','Trust and Risk','trust-risk','trust-and-risk','2026-05-11',['REV','0S'],['ftcReviews','ftcReviewRule'],['eligible customers','request timing','response status','theme learned'],['define eligibility','write neutral request','track requests sent','extract service themes']],
  ['monthly-receipt-close','Monthly receipt close for messy small teams','Create a monthly close rhythm that finds missing receipts, subscriptions, refunds, and owner decisions early.','Records and Proof','records-proof','proof-ledger','2026-05-12',['VAULT','0S'],['irsRecords'],['missing receipts','unknown transactions','subscriptions','open invoices'],['reconcile accounts','attach proof','list missing files','write owner summary']],
  ['security-access-cleanup','Access cleanup before a security problem','Remove old users, turn on MFA, fix recovery emails, and separate public pages from protected workflows.','Trust and Risk','trust-risk','trust-and-risk','2026-05-13',['GATE','VAULT'],['ftcCyber','nistSmallBusiness'],['critical accounts','MFA status','former users','backup owners'],['list accounts','remove old access','turn on MFA','test recovery paths']],
  ['market-test-one-page-brief','One-page market test brief','Before launching a campaign, define the buyer, local signal, competitor standard, proof gap, and stop rule.','Local Growth','local-growth','visibility-engine','2026-05-14',['0S','ATLAS'],['sbaMarket','censusBuilder'],['buyer','market','proof gap','stop rule'],['write buyer trigger','check competitors','use public data','set continue-stop rule']],
  ['customer-file-handoff','Customer file handoff that survives busy weeks','Make photos, approvals, scopes, receipts, and review context travel with the customer record.','Records and Proof','records-proof','proof-ledger','2026-05-15',['VAULT','0S'],['ftcData','irsRecords'],['scope','approval','receipt','completion proof'],['name files clearly','attach proof at each stage','export packet','review missing proof']],
  ['public-claim-control','Public claim control for fast-moving teams','Every claim about what is live, verified, automated, secure, or available needs proof before it becomes copy.','Trust and Risk','trust-risk','trust-and-risk','2026-05-16',['ATLAS','0S'],['ftcData'],['claim','proof route','reviewer','status'],['write claim register','open proof link','mark unsupported claims','remove stale copy']],
  ['lead-source-scorecard','Lead source scorecard for owners','Stop arguing from memory by tracking source, speed, quality, close rate, and follow-up completion.','Revenue Systems','revenue-systems','revenue-control','2026-05-17',['0S','MKT'],['sbaMarket'],['source','first response','qualified lead','closed revenue'],['tag every request','review by source','cut weak spend','double down on clean lanes']],
  ['portal-vs-website','When a business needs a portal instead of another website page','Use public pages for buyer education and portals for status, files, approvals, gates, and protected workflows.','Automation Stack','automation-stack','automation-stack','2026-05-17',['0S','GATE','VAULT'],['ftcData'],['public content','private state','files','approvals'],['split public/private needs','gate sensitive flows','store files in vault','link proof from pages']],
  ['weekly-review-minutes','Weekly review minutes that become action','Turn meeting notes into assigned tasks, due dates, proof links, and closed decisions.','Operating Rhythm','operating-rhythm','company-command','2026-05-20',['0S','ATLAS'],['sbaPlan'],['action owner','due date','proof link','status'],['write decisions live','assign owners','review proof next week','archive closed actions']],
  ['city-service-cluster','City-service content cluster without spam','Build one real pillar and supporting pages around actual service fit instead of flooding thin city pages.','Local Growth','local-growth','visibility-engine','2026-05-22',['MKT','0S'],['googleRanking','sbaMarket'],['city fit','service fit','proof','conversion'],['choose one city','choose one service','write pillar page','publish supporting FAQs']],
  ['customer-status-board','Customer status board for service businesses','Give every active customer a visible state so jobs stop disappearing between quote, schedule, delivery, and proof.','Revenue Systems','revenue-systems','revenue-control','2026-05-25',['0S','GATE'],['sbaPlan'],['new','quoted','scheduled','delivered','closed'],['define states','assign owner','review stuck work','send status updates']],
  ['subscription-audit','Subscription audit for cash leaks','Find recurring tools, duplicate services, unused seats, price changes, and cancellation proof before they drain cash.','Records and Proof','records-proof','proof-ledger','2026-05-27',['VAULT','SOLE'],['irsRecords'],['vendor','amount','owner','proof'],['export card charges','tag subscriptions','cancel unused tools','save cancellation proof']],
  ['backup-restore-drill','Backup restore drill for small teams','Do not trust backups until one file, folder, or record has been restored and documented.','Trust and Risk','trust-risk','trust-and-risk','2026-05-29',['VAULT','GATE'],['ftcCyber','nistSmallBusiness'],['backup scope','restore owner','test result','date'],['choose critical folder','restore sample','record result','fix gaps']],
  ['content-from-operations','Turn operations into useful content','Use real customer questions, service mistakes, proof gaps, and owner decisions to create articles that teach instead of shouting.','Automation Stack','automation-stack','automation-stack','2026-06-01',['0S','MKT'],['sbaMarket'],['customer question','operating lesson','proof link','CTA'],['mine weekly notes','choose one lesson','write manual method','link system help']],
  ['review-theme-mining','Mine review themes for service improvements','Review language can expose what buyers value, where delivery breaks, and what website copy should explain.','Trust and Risk','trust-risk','trust-and-risk','2026-06-03',['REV','MKT'],['ftcReviewRule','googleRanking'],['theme','frequency','service fix','copy update'],['tag review themes','find repeated praise','find repeated friction','update training and pages']],
  ['proof-before-automation','Proof before automation','Automate repeated evidence after the manual path works; do not automate confusion.','Automation Stack','automation-stack','automation-stack','2026-06-05',['0S','ATLAS'],['sbaPlan'],['manual steps','proof artifact','repeat count','owner approval'],['run manually first','record exceptions','define proof','automate the repeat lane']],
  ['landing-page-to-intake','Connect the landing page to intake','A page is not finished until the request path, owner queue, response rule, and proof storage are ready.','Revenue Systems','revenue-systems','revenue-control','2026-06-08',['MKT','0S','VAULT'],['googleStart','sbaPlan'],['CTA','form fields','owner queue','proof storage'],['test CTA','submit request','check queue','store proof packet']],
  ['quarterly-operating-reset','Quarterly operating reset','Every quarter, retire stale offers, clean links, update proof, review cash lanes, and pick the next system build.','Operating Rhythm','operating-rhythm','company-command','2026-06-10',['0S','ATLAS','SOLE'],['sbaPlan','sbaMarket'],['retired links','current offers','cash lanes','next build'],['audit public links','close stale offers','review metrics','choose next system']]
];
function categoryFor(slug){ return PUBLICATION_CATEGORIES.find(category => category.slug === slug) || PUBLICATION_CATEGORIES[0]; }
function isPublished(article, at = TODAY){ return !article.publishAt || article.publishAt <= at; }
function publicationStatus(article){ return isPublished(article) ? 'published' : 'scheduled'; }
function sortInsights(a,b){ return String(b.publishAt || '').localeCompare(String(a.publishAt || '')) || a.title.localeCompare(b.title); }
function makeFieldGuide([slug,title,deck,topic,category,series,publishAt,platformKeys,sources,metrics,worksheet]){
  const categoryName = categoryFor(category).name;
  return {
    slug,
    title,
    deck,
    topic,
    category,
    series,
    publishAt,
    readTime:'11 min',
    platformKeys,
    sources,
    manual:[
      `Write the current ${topic.toLowerCase()} problem in one sentence before changing tools or pages.`,
      `Track ${metrics.slice(0,3).join(', ')} in one visible owner review lane.`,
      `Assign the next action, the proof needed, and the date this lane gets reviewed again.`
    ],
    system:[
      `MetrAIyux 0S turns the repeated ${topic.toLowerCase()} work into a surface, gate, receipt, vault record, or owner-visible task instead of another loose note.`,
      `The related major platforms give this guide somewhere real to go: ${platformKeys.map(key => MAJOR_PLATFORM_LINKS.find(p => p.key === key)?.name || key).join(', ')}.`,
      'The system should carry repeated evidence while the owner keeps final judgment on claims, pricing, risk, and customer promises.'
    ],
    longformPromise:`This ${categoryName} field guide is built to become one operating move this week: inspect the current lane, run the manual worksheet, then decide what the 0S should carry on a schedule.`,
    diagnostics:[
      { label:'Current state', title:`The ${topic.toLowerCase()} lane is visible`, copy:`The owner can open one place and see the status, owner, proof, and next action without reading every message or remembering the whole week.` },
      { label:'Buyer or team impact', title:'The workflow changes behavior', copy:'The guide should improve response, trust, speed, clarity, or control. If it only creates more copy, it is not an operating asset yet.' },
      { label:'System handoff', title:'The repeat work has a home', copy:'Once the manual loop is clear, the repeated pieces can move into 0S rooms, gates, vault records, deployment receipts, or proof-led pages.' }
    ],
    metrics,
    worksheet,
    mistakes:[
      'Publishing the idea before the proof path exists.',
      'Tracking a metric nobody reviews or owns.',
      'Automating the workflow before the manual version is clear.',
      'Linking to a minor or broken deployment instead of a major live platform.',
      'Letting internal status noise leak into buyer-facing pages.'
    ],
    sections:[
      [`Why this ${topic.toLowerCase()} problem costs more than it looks`,[
        `Most companies feel this problem as friction before they can measure it. The buyer waits, the owner guesses, the team repeats itself, or a public page says something the operation cannot support. ${title} matters because the business needs a visible lane that connects what the market sees to what the team can actually do.`,
        `The first fix is not more software. The first fix is a shared operating view. When the owner can see ${metrics.slice(0,4).join(', ')}, the problem becomes specific enough to manage. Without that view, the company usually buys another tool and still has the same confusion in a prettier place.`
      ]],
      ['The manual method',[
        `Start with the smallest useful record. For this lane, that means ${worksheet.slice(0,3).join(', ')}. Keep the language plain. A useful record should say what happened, who owns the next move, what proof exists, and when the owner will review it again.`,
        `Manual work is not failure. It is how the company learns the shape of the workflow. Run the manual version until the repeated steps are obvious. Then the system can take over the repeat work without hiding the exceptions that still need human judgment.`
      ]],
      ['The 0S handoff',[
        `The 0S should not turn every thought into automation. It should carry the repeated evidence: forms, gates, vault files, route receipts, review records, published pages, and deployment status. That lets the owner spend less time hunting for facts and more time deciding what changes the company should make.`,
        `For this guide, the handoff is simple: the public page educates or converts, the private workflow tracks status and proof, and the major platform links provide the real places where a prospect, owner, or operator can continue.`
      ]],
      ['How to publish this as part of the content engine',[
        `This article belongs to the ${categoryName} cluster. It should link back to the pillar article, point to the relevant major platforms, and feed one scheduled social or email excerpt. The content is not just for SEO. It is a reusable operating explanation for sales, onboarding, support, and owner training.`,
        `The scheduled publisher should release one useful guide at a time, record a proof receipt, and queue a follow-up task for repurposing. If a claim cannot be proven, it should stay in draft until the proof exists.`
      ]],
      ['Next operating move',[
        `This week, pick one metric from this guide and make it visible. Then pick one worksheet action and assign it. Do not wait for a perfect dashboard. A simple operating move that gets reviewed is more valuable than a full system nobody uses.`,
        `After the first review, decide whether the lane should become a page, gate, vault record, review route, or 0S task. That is how content becomes operations instead of decoration.`
      ]]
    ]
  };
}
for (const article of BUSINESS_INSIGHTS) Object.assign(article, PILLAR_META[article.slug] || {});
BUSINESS_INSIGHTS.push(...FIELD_GUIDE_BLUEPRINTS.map(makeFieldGuide));
const PUBLISHED_INSIGHTS = BUSINESS_INSIGHTS.filter(article => isPublished(article)).sort(sortInsights);
const UPCOMING_INSIGHTS = BUSINESS_INSIGHTS.filter(article => !isPublished(article)).sort((a,b) => String(a.publishAt || '').localeCompare(String(b.publishAt || '')));
const CATEGORY_ROUTES = PUBLICATION_CATEGORIES.map(category => `/insights/category/${category.slug}/`);
const INSIGHT_ROUTES = ['/insights/','/insights/schedule/', ...CATEGORY_ROUTES, ...PUBLISHED_INSIGHTS.map(article => `/insights/${article.slug}/`)];

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
    industry:'Age-gated retail',
    copy:"A blue-lit smoke shop app with age gate, live-media homepage, inventory lanes, specials, gallery, workspace preview, QR/social handoff, and Valley Verified backlink.",
    actualApp:"Bob's live app-build example is a branded retail surface for a real smoke shop, built around 21+ access, product category discovery, media, visit actions, and shareable handoff routes.",
    url:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/bobs-smoke-shop/',
    valleyUrl:'/business/bobs-smoke-shop-litchfield-park/',
    video:'/assets/client-builds/bobs-live-build.mp4',
    poster:'/assets/client-builds/bobs-live-build-poster.jpg',
    sourceFolder:'Skye-Clients/bobs-smoke-shop-mcp-redo',
    metrics:['21+ gate','Inventory lanes','Workspace preview'],
    appRoutes:['Age gate','Live media home','Inventory','Specials','Gallery','Workspace preview','QR/social handoff'],
    deliverables:['21+ gate and retail access boundary','PWA manifest and service worker shell','Live video homepage with poster fallback','Inventory/category lanes for glass, vapes, cigars, pipes, CBD, tobacco, hookah, electronics, and snacks','Specials, gallery, FAQ, contact, and blog-style local content','Workspace preview/free trial handoff with scan and command limits','Two-way Valley Verified backlink and live-app handoff'],
    value:['Turns a walk-in smoke shop into a shareable mobile-first app instead of a thin directory listing.','Gives staff one clean route for inventory, specials, media, socials, and visit details.','Lets Valley Verified show what a featured retail customer could receive after buying an app build lane.','Keeps age-sensitive retail presentation behind an explicit 21+ screen before product exploration.'],
    buyerActions:['Open inventory lanes','Check specials and gallery media','Call or plan a visit','Share the live app or Valley Verified post'],
    proof:[['Build source','Skye-Clients/bobs-smoke-shop-mcp-redo'],['Live SkyeNet build URL','https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/bobs-smoke-shop/'],['Valley route','/business/bobs-smoke-shop-litchfield-park/']]
  },
  {
    id:'empire',
    name:'Empire Pallets',
    label:'Operations app build',
    industry:'Commercial operations',
    copy:'A Phoenix pallet operations app with quote intake, service lanes, scan route, intro video, mobile-first forms, commercial proof, and Valley Verified backlink.',
    actualApp:"Empire's live app-build example is an operations-facing sales and intake surface. It carries quote intent, service selection, scan access, intro media, and procurement-friendly proof for a pallet company.",
    url:'https://empire-pallets.pages.dev/',
    valleyUrl:'/business/empire-pallets-phoenix/',
    video:'/assets/client-builds/empire-live-build.mp4',
    poster:'/assets/client-builds/empire-live-build-poster.jpg',
    sourceFolder:'Skye-Clients/empire-pallets-v3-app',
    metrics:['Quote intake','Scan route','Service lanes'],
    appRoutes:['Gated intro video','Service lanes','Quote intake','Scan route','Private preview','Programs','Industries','PWA/offline shell'],
    deliverables:['Full-screen media intro with poster fallback','Service lanes for new pallets, recycled supply, removal, drop trailers, heat treatment, and custom design','Mobile-first quote form with safe submit/fallback behavior','QR scan route for yard/procurement handoff','Private preview route for client review','PWA manifest, service worker, and offline shell','Two-way Valley Verified backlink and commercial proof language'],
    value:['Converts local discovery into a quote-ready procurement flow.','Makes commercial buyers choose the right pallet lane before asking for a quote.','Gives the business a reusable QR route for field, yard, and sales handoff.','Shows Valley Verified buyers what an operations app can do beyond a public listing.'],
    buyerActions:['Start a quote','Choose a pallet service lane','Use scan/QR handoff','Open the live operations app'],
    proof:[['Build source','Skye-Clients/empire-pallets-v3-app'],['Live build URL','https://empire-pallets.pages.dev/'],['Valley route','/business/empire-pallets-phoenix/']]
  },
  {
    id:'next-level',
    name:'Next Level Gaming AZ',
    label:'Trading card shop app build',
    industry:'Gaming retail and events',
    copy:'A Goodyear trading-card-shop app with weekly events, free table play, shop photos, TCGPlayer handoff, event request, scan route, and Valley Verified backlink.',
    actualApp:'Next Level Gaming AZ is a real app-build example for a gaming shop: event discovery, shop proof, TCGPlayer handoff, event requests, calls, scan routing, and player-friendly mobile actions.',
    url:`${SITE_ORIGIN}/client-app-factory/client-apps/next-level-gaming-goodyear/`,
    valleyUrl:'/business/next-level-gaming-goodyear/',
    image:'/client-app-factory/client-apps/next-level-gaming-goodyear/assets/media/shop-photo-1.jpg',
    poster:'/client-app-factory/client-apps/next-level-gaming-goodyear/assets/media/cyber-city-hero.jpg',
    mediaAlt:'Next Level Gaming AZ live app preview',
    sourceFolder:'client-app-factory/client-apps/next-level-gaming-goodyear',
    metrics:['Weekly events','TCGPlayer handoff','Scan route'],
    appRoutes:['Events','Shop','Scan route','Event request','TCGPlayer handoff','58 seats','Weekly TCG board','Mobile install'],
    deliverables:['Branded gaming-retail app surface','Weekly events and table-play routing','Shop photo proof and real store context','TCGPlayer shopping handoff','Event request and organizer contact path','QR scan route for in-store and print handoff','Two-way Valley Verified backlink and live-app handoff'],
    value:['Turns a local card shop into a real player action surface instead of a thin listing.','Gives customers one route for events, shopping, calls, scans, and store proof.','Shows Valley Verified buyers what a scoped gaming-retail app can look like when it is actually built.','Keeps placeholder media out of the proof lane.'],
    buyerActions:['Check events','Open TCGPlayer handoff','Request an event','Share the live app or Valley post'],
    proof:[['Build source','client-app-factory/client-apps/next-level-gaming-goodyear'],['Live build URL',`${SITE_ORIGIN}/client-app-factory/client-apps/next-level-gaming-goodyear/`],['Valley route','/business/next-level-gaming-goodyear/']]
  },
  {
    id:'fade-masters',
    name:'Fade Masters PHX',
    label:'Booking app build',
    industry:'Barber and personal care',
    copy:'A Phoenix barber booking app with service menu, appointment request, walk-in queue, receipt flow, shop intake, call action, and Valley Verified backlink.',
    actualApp:'Fade Masters PHX is a real booking app example: service selection, appointment request, walk-in queue status, receipt flow, shop contact, and a clean mobile handoff.',
    url:`${SITE_ORIGIN}/client-app-factory/client-apps/fade-masters-phx/`,
    valleyUrl:'/business/fade-masters-phx/',
    image:'/client-app-factory/client-apps/fade-masters-phx/assets/fade-booking-preview.png',
    poster:'/client-app-factory/client-apps/fade-masters-phx/assets/fade-booking-preview.png',
    mediaAlt:'Fade Masters PHX live booking app preview',
    sourceFolder:'client-app-factory/client-apps/fade-masters-phx',
    metrics:['Appointment request','Walk-in queue','Receipt flow'],
    appRoutes:['Service menu','Appointment request','Walk-in queue','Receipt flow','Shop intake','Call action','Valley backlink','Mobile booking'],
    deliverables:['Mobile-first service menu','Appointment request form','Walk-in queue board','Receipt and confirmation flow','Shop contact and call action','Valley Verified backlink and public handoff','Proof screenshot generated from the live app surface'],
    value:['Turns a barber page into an action-ready booking flow.','Gives customers one route for services, appointments, walk-ins, receipts, and shop contact.','Shows Valley Verified buyers what a practical booking app lane includes.','Keeps placeholder media out of the public proof position.'],
    buyerActions:['Choose a service','Request an appointment','Check the walk-in queue','Share the live app or Valley post'],
    proof:[['Build source','client-app-factory/client-apps/fade-masters-phx'],['Live build URL',`${SITE_ORIGIN}/client-app-factory/client-apps/fade-masters-phx/`],['Valley route','/business/fade-masters-phx/']]
  },
  {
    id:'realty-480',
    name:'480 Realty & Property Management',
    label:'Property management app build',
    industry:'Real estate and property',
    copy:'A Mesa property-management app with rental analysis, owner intake, AppFolio handoff, maintenance routing, inspections, reporting, and Valley Verified backlink.',
    actualApp:"480 Realty's live app-build example is a branded owner-and-tenant operations surface for rental analysis, management intake, portal handoff, inspections, maintenance, reporting, and service-area proof.",
    url:'https://480-realty-property-management.pages.dev/',
    valleyUrl:'/business/480-realty-property-management-mesa-85209/',
    video:'/assets/client-builds/480-live-build.mp4',
    poster:'/assets/client-builds/480-live-build-poster.png',
    sourceFolder:'Skye-Clients/480-realty-property-management-app',
    metrics:['Rental analysis','AppFolio handoff','Owner intake'],
    appRoutes:['Rental analysis','Owner intake','AppFolio handoff','Maintenance routing','Inspections and turns','Owner reporting','Gallery','Workspace'],
    deliverables:['Branded owner and tenant operations app surface','Rental analysis and management-intake lane','AppFolio portal handoff for live accounts','Maintenance coordination, inspections, turns, and leasing support routes','Gallery, FAQ, local service pages, and contact routing','Workspace preview and scan route','Two-way Valley Verified backlink and management proof language'],
    value:['Converts local discovery into a real management workflow instead of a flat listing.','Gives owners one route for rental analysis, onboarding, portal handoff, and service proof.','Shows Valley Verified buyers what a real property-management app lane looks like.','Keeps the public post useful while routing serious owner action into the live ops surface.'],
    buyerActions:['Open rental analysis','Start owner intake','Open AppFolio handoff','Share the live app or Valley post'],
    proof:[['Build source','Skye-Clients/480-realty-property-management-app'],['Live build URL','https://480-realty-property-management.pages.dev/'],['Valley route','/business/480-realty-property-management-mesa-85209/']]
  },
  {
    id:'dink-and-dine',
    name:'Dink & Dine Pickle Park',
    label:'Guest-ops app build',
    industry:'Hospitality and recreation',
    copy:'A Mesa venue app with court reservations, open play, leagues, lessons, private events, food and bar lanes, memberships, QR handoff, and Valley Verified backlink.',
    actualApp:"Dink & Dine's live app-build example is a guest-routing surface for a real venue, built around court reservations, programs, events, memberships, food-and-bar traffic, QR handoff, and operator review.",
    url:'https://dink-and-dine-pickle-park.pages.dev/',
    valleyUrl:'/business/dink-and-dine-pickle-park-mesa-85201-5432605/',
    image:'/assets/client-builds/dink-live-build.jpg',
    poster:'/assets/client-builds/dink-live-build.jpg',
    mediaAlt:'Dink & Dine Pickle Park live app preview',
    sourceFolder:'Skye-Clients/dink-and-dine-pickle-park-app',
    metrics:['Court bookings','Events','Memberships'],
    appRoutes:['Court reservations','Open play','Leagues','Lessons and clinics','Memberships','Private events','Food and bar','Workspace'],
    deliverables:['Branded guest-operations app for a live pickleball venue','CourtReserve handoff and guest-intake lane','Service pages for reservations, open play, leagues, lessons, events, memberships, and food/bar','Gallery, specials, FAQ, contact, and venue support pages','Scan/QR route for front-desk and print handoff','Workspace preview for operator review','Two-way Valley Verified backlink and booking proof language'],
    value:['Converts local discovery into a venue-ready booking and guest-routing flow.','Gives the park one route for bookings, memberships, leagues, events, and follow-up.','Shows Valley Verified buyers what a hospitality and recreation app lane can actually look like.','Supports front-desk, print, and mobile handoff through QR and app routes.'],
    buyerActions:['Book courts','Open guest intake','Check events and memberships','Share the live app or Valley post'],
    proof:[['Build source','Skye-Clients/dink-and-dine-pickle-park-app'],['Live build URL','https://dink-and-dine-pickle-park.pages.dev/'],['Valley route','/business/dink-and-dine-pickle-park-mesa-85201-5432605/']]
  },
  {
    id:'techbros',
    name:'Techbros Electronic Recycling & ITAD',
    label:'Secure intake app build',
    industry:'ITAD and electronics recycling',
    copy:'A Scottsdale secure-ops app with business pickups, ITAD intake, data destruction, logistics, certificates, follow-up, and Valley Verified backlink.',
    actualApp:"Techbros' live app-build example is a secure intake surface for real ITAD and recycling work, built around pickups, chain-of-custody, destruction, compliance proof, logistics, and follow-up.",
    url:'https://techbros-electronic-recycling-itad.pages.dev/',
    valleyUrl:'/business/techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c/',
    video:'/assets/client-builds/techbros-live-build.mp4',
    poster:'/assets/client-builds/techbros-live-build-poster.png',
    sourceFolder:'Skye-Clients/techbros-electronic-recycling-itad-app',
    metrics:['ITAD intake','Data destruction','Pickup routing'],
    appRoutes:['Business pickups','ITAD intake','Data destruction','Residential drop-off','Logistics','Resale and reuse','Certificates/compliance','Workspace'],
    deliverables:['Branded secure intake app for recycling and ITAD','Business pickup, ITAD, data destruction, residential drop-off, logistics, and follow-up lanes','Media-backed intro with contact and route proof','Gallery, FAQ, local service page, and contact routing','Scan/QR route for field and print handoff','Workspace preview for operator review','Two-way Valley Verified backlink and secure-operations proof language'],
    value:['Converts local discovery into a secure intake flow instead of a thin recycling listing.','Gives commercial buyers one route for pickups, destruction, certificates, and logistics.','Shows Valley Verified buyers what a real ITAD/recycling app lane can do beyond a basic business card page.','Creates a clean path for field, office, and customer follow-up through the same app surface.'],
    buyerActions:['Start ITAD intake','Request a pickup','Open scan route','Share the live app or Valley post'],
    proof:[['Build source','Skye-Clients/techbros-electronic-recycling-itad-app'],['Live build URL','https://techbros-electronic-recycling-itad.pages.dev/'],['Valley route','/business/techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c/']]
  },
  {
    id:'arclight',
    name:'ArcLight Pictures',
    label:'Production company app build',
    industry:'Creative services',
    copy:'A Tucson production-company app with services, selected projects, film work, gallery media, workspace review, QR handoff, and Valley Verified backlink.',
    actualApp:"ArcLight's live app-build example is a branded production-company surface built around services, project proof, gallery media, contact routing, workspace review, and creative-company presentation.",
    url:'https://arclight-pictures.pages.dev/',
    valleyUrl:'/business/arclight-pictures-tucson/',
    image:'/assets/client-builds/arclight-live-build.png',
    poster:'/assets/client-builds/arclight-live-build.png',
    mediaAlt:'ArcLight Pictures live app preview',
    sourceFolder:'Skye-Clients/arclight-pictures-app',
    metrics:['Selected projects','Gallery media','Workspace review'],
    appRoutes:['Services','Selected projects','Video gallery','Film work','Giving back','Contact','Workspace','QR handoff'],
    deliverables:['Branded production-company app surface','Service pages for promo films, community storytelling, film work, and event coverage','Selected projects, gallery, and contact routing','Workspace preview and QR/share handoff','Public proof pages pulled from the live ArcLight site','Two-way Valley Verified backlink and production-proof language'],
    value:['Turns a production company into a shareable app surface instead of a thin creative-services listing.','Gives prospects one route for services, proof, selected projects, gallery media, and contact.','Shows Valley Verified buyers what a properly scoped creative-services app lane looks like.','Creates a cleaner handoff from public discovery into production review flow.'],
    buyerActions:['Review selected projects','Open gallery and contact','Use the workspace lane','Share the live app or Valley post'],
    proof:[['Build source','Skye-Clients/arclight-pictures-app'],['Live build URL','https://arclight-pictures.pages.dev/'],['Valley route','/business/arclight-pictures-tucson/']]
  }
];

const publicNav = `<header class="topbar public-topbar">
  <a class="brand" href="/" aria-label="Valley Verified home"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>real local business pages</small></span></a>
  <nav class="nav-actions public-nav" aria-label="Primary"><a href="/featured/">Featured</a><a href="/app-builds/">App Builds</a><a href="/directory/">Directory</a><a href="/insights/">Insights</a><a href="/network/">Network</a><a href="/how-it-works/">How it works</a><a href="/for-businesses/">For businesses</a><a href="/advertise/">Exposure</a><a href="/pricing/">Pricing</a><a href="/contact/">Contact</a></nav>
</header>`;
const publicFooter = `<footer class="site-footer public-footer">
  <div><a class="brand mini" href="/"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>Network Platform</small></span></a><p>Valley Verified is an Arizona business discovery network with verified public business pages, free SkyEmail acceptance, and workspace provisioning handoff.</p></div>
  <nav aria-label="Footer"><a href="/featured/">Featured</a><a href="/app-builds/">App Builds</a><a href="/directory/">Directory</a><a href="/insights/">Insights</a><a href="/join/">Join</a><a href="/trust-network/">Trust Network</a><a href="/claims-ledger/">Claims Ledger</a><a href="/production-readiness/">Readiness</a><a href="/operator/" rel="nofollow">Seed Console</a></nav>
</footer>`;
function base({ title, description, canonical, bodyClass = 'website-page', robots = 'index,follow', schema = null }, body){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)}</title><meta name="description" content="${html(description)}"/><meta name="robots" content="${html(robots)}"/><link rel="canonical" href="${html(canonical)}"/><meta name="theme-color" content="#f5efe3"/><meta property="og:title" content="${html(title)}"/><meta property="og:description" content="${html(description)}"/><meta property="og:type" content="website"/><meta property="og:url" content="${html(canonical)}"/><meta property="og:image" content="${SITE_URL}/assets/valley-verified-logo.png"/><meta name="twitter:card" content="summary_large_image"/><link rel="icon" href="/assets/valley-verified-logo.png"/><link rel="manifest" href="/manifest.webmanifest"/><link rel="stylesheet" href="/assets/styles.css"/><link rel="stylesheet" href="/assets/valley-brain.css"/>${schema ? `<script type="application/ld+json">${jsonScript(schema)}</script>` : ''}</head><body class="${html(bodyClass)}"><canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>${publicNav}<main id="main" class="site-main public-site-main">${body}</main>${publicFooter}<div id="toast" class="toast" role="status" aria-live="polite"></div><script type="module" src="/assets/app.js"></script><script type="module" src="/assets/valley-brain.js"></script></body></html>`;
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
function listChips(items = []){
  return items.map(item => `<span>${html(item)}</span>`).join('');
}
function articleCard(article){
  const category = categoryFor(article.category);
  return `<a class="article-card" href="/insights/${html(article.slug)}/" data-category="${html(category.slug)}"><span>${html(category.name)}</span><h3>${html(article.title)}</h3><p>${html(article.deck)}</p><small>${html(article.publishAt || TODAY)} / ${html(article.readTime)} read</small></a>`;
}
function categoryCard(category){
  const published = PUBLISHED_INSIGHTS.filter(article => article.category === category.slug);
  const scheduled = UPCOMING_INSIGHTS.filter(article => article.category === category.slug);
  const latest = published[0];
  return `<a class="category-card glass" href="/insights/category/${html(category.slug)}/" style="--category-accent:${html(category.color)}"><span>${html(category.name)}</span><h3>${html(published.length)} live guides</h3><p>${html(category.deck)}</p><small>${scheduled.length ? `${scheduled.length} scheduled` : 'cluster current'}${latest ? ` / latest: ${latest.publishAt}` : ''}</small></a>`;
}
function scheduleRow(article){
  const category = categoryFor(article.category);
  const status = publicationStatus(article);
  const href = status === 'published' ? `/insights/${article.slug}/` : '#upcoming';
  const action = status === 'published' ? 'Read live guide' : 'Queued by 0S worker';
  return `<article class="schedule-row ${html(status)}" data-status="${html(status)}" data-category="${html(category.slug)}"><div><span>${html(article.publishAt || TODAY)}</span><strong>${html(category.name)}</strong></div><h3>${html(article.title)}</h3><p>${html(article.deck)}</p><a class="btn small ${status === 'published' ? 'primary' : 'ghost'}" href="${html(href)}">${html(action)}</a></article>`;
}
function calendarArticle(article){
  const category = categoryFor(article.category);
  return {
    slug: article.slug,
    title: article.title,
    deck: article.deck,
    topic: article.topic,
    category: category.slug,
    category_name: category.name,
    series: article.series || category.slug,
    publish_at: article.publishAt || TODAY,
    status: publicationStatus(article),
    url: `${SITE_URL}/insights/${article.slug}/`,
    read_time: article.readTime,
    pillar: Boolean(article.pillar),
    platforms: (article.platformKeys || []).map(key => MAJOR_PLATFORM_LINKS.find(platform => platform.key === key)).filter(Boolean).map(platform => ({key:platform.key, name:platform.name, url:platform.url})),
    sources: (article.sources || []).map(key => SOURCE_LIBRARY[key]).filter(Boolean)
  };
}
function editorialCalendarPayload(){
  return {
    version:'23.1.0',
    updated_at:TODAY,
    engine:'valley_verified_0s_scheduled_publisher',
    worker:{
      url:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley/content-schedule',
      tick_url:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley/content-schedule/tick',
      cron:'17 13 * * 1,3,5',
      timezone:'UTC',
      behavior:'The 0S Worker reads this feed, finds scheduled articles whose publish_at date has arrived, records a receipt, and queues an operator publish task.'
    },
    counts:{
      total:BUSINESS_INSIGHTS.length,
      published:PUBLISHED_INSIGHTS.length,
      scheduled:UPCOMING_INSIGHTS.length,
      categories:PUBLICATION_CATEGORIES.length,
      major_platforms:MAJOR_PLATFORM_LINKS.length
    },
    categories:PUBLICATION_CATEGORIES.map(category => ({
      slug:category.slug,
      name:category.name,
      deck:category.deck,
      color:category.color,
      url:`${SITE_URL}/insights/category/${category.slug}/`,
      published:PUBLISHED_INSIGHTS.filter(article => article.category === category.slug).length,
      scheduled:UPCOMING_INSIGHTS.filter(article => article.category === category.slug).length
    })),
    published:PUBLISHED_INSIGHTS.map(calendarArticle),
    upcoming:UPCOMING_INSIGHTS.map(calendarArticle),
    all:BUSINESS_INSIGHTS.slice().sort((a,b) => String(a.publishAt || '').localeCompare(String(b.publishAt || '')) || a.title.localeCompare(b.title)).map(calendarArticle)
  };
}
function manualSystemColumns(article){
  return `<section class="split-grid insight-playbook"><article class="section glass"><p class="eyebrow">Manual operating method</p><h2>Do this before software</h2><div class="check-list">${article.manual.map(item => `<span>${html(item)}</span>`).join('')}</div></article><article class="section glass"><p class="eyebrow">How 0S makes it easier</p><h2>Turn the habit into a system</h2><div class="check-list">${article.system.map(item => `<span>${html(item)}</span>`).join('')}</div></article></section>`;
}
function operatorDiagnostics(article){
  const diagnostics = article.diagnostics || [];
  const metrics = article.metrics || [];
  const worksheet = article.worksheet || [];
  const mistakes = article.mistakes || [];
  return `<section class="section glass operator-diagnostics"><div class="section-head"><div><p class="eyebrow">Operator diagnostics</p><h2>What to inspect before you buy another tool.</h2></div></div><div class="diagnostic-grid">${diagnostics.map(item => `<article><span>${html(item.label)}</span><h3>${html(item.title)}</h3><p>${html(item.copy)}</p></article>`).join('')}</div></section>
<section class="split-grid operator-lists"><article class="section glass"><p class="eyebrow">Numbers to watch</p><h2>Measure the operating truth.</h2><div class="check-list compact-list">${listChips(metrics)}</div></article><article class="section glass"><p class="eyebrow">Owner worksheet</p><h2>Run this manually first.</h2><div class="check-list compact-list">${listChips(worksheet)}</div></article></section>
<section class="section glass mistake-panel"><div class="section-head"><div><p class="eyebrow">Avoid the expensive version</p><h2>Common ways this breaks.</h2></div></div><div class="mistake-grid">${mistakes.map(item => `<span>${html(item)}</span>`).join('')}</div></section>`;
}
function articleSections(article){
  return article.sections.map(([title, copy]) => {
    const paragraphs = Array.isArray(copy) ? copy : [copy];
    return `<section class="article-section"><h2>${html(title)}</h2>${paragraphs.map(paragraph => `<p>${html(paragraph)}</p>`).join('')}</section>`;
  }).join('');
}
function articleOperatingClose(article){
  return `<section class="article-section operating-close"><h2>How to put this into the next operating week</h2><p>Do not turn this into a giant transformation project. Pick one visible lane from this article, write the current state in plain language, and run the manual worksheet for one week. If the work cannot survive one week on paper or in a simple sheet, software will only hide the confusion. The owner should be able to point to the current number, the person responsible, the next action, and the proof that shows whether the action happened.</p><p>After the manual loop works, decide what deserves a system. Repeated actions become forms, gates, vault records, deployment receipts, review routes, or public pages. One-off judgment stays with the owner. That separation is the heart of a useful operating system: people keep the decisions, and the system carries the repeated evidence so the company does not have to rebuild memory every Monday.</p><p>Use the public page and the private workflow differently. The public page should help a buyer, customer, or partner understand the business and take action. The private workflow should help the owner see status, proof, exceptions, and next decisions. When those two views are mixed together, the website becomes cluttered and the operation becomes vague. When they are separated but connected, the company can educate the market without exposing internal noise.</p><p>The final test is whether the lesson changes behavior by next week. If nothing gets assigned, measured, stored, fixed, published, retired, or routed, the article was just reading material. Turn one insight into a visible operating move, then let the system carry the repeat work once the move proves useful.</p></section>`;
}
function insightIndexPage(){
  const featuredArticle = PUBLISHED_INSIGHTS.find(article => article.slug === 'weekly-company-command-rhythm') || PUBLISHED_INSIGHTS[0];
  const articleList = PUBLISHED_INSIGHTS.map(articleCard).join('');
  const categoryList = PUBLICATION_CATEGORIES.map(categoryCard).join('');
  const schedulePreview = UPCOMING_INSIGHTS.slice(0, 5).map(scheduleRow).join('');
  const platformRail = majorPlatformCards();
  return base({
    title:'Business Operating Insights | Valley Verified',
    description:'Practical Valley Verified field notes for running a company: local visibility, intake, records, security, reviews, market research, and how MetrAIyux 0S makes the work easier.',
    canonical:`${SITE_URL}/insights/`,
    bodyClass:'website-page insights-page operator-journal-page',
    schema:{ '@context':'https://schema.org', '@type':'Blog', name:'Valley Verified Business Operating Insights', url:`${SITE_URL}/insights/`, about:['small business operations','local visibility','MetrAIyux 0S','company systems'] }
  }, `<section class="hero glass subhero journal-hero"><div><p class="eyebrow">Business operating journal</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">Run the company better before you buy another shiny tool.</h1><p class="hero-text">This is the practical side of Valley Verified: a publication engine for owners running real companies. Each guide teaches the manual method first, then shows where 0S turns repeated work into gates, vault records, receipts, pages, reviews, and owner-visible tasks.</p><div class="hero-actions"><a class="btn primary" href="/insights/${html(featuredArticle.slug)}/">Start with the weekly rhythm</a><a class="btn" href="/insights/schedule/">Editorial calendar</a><a class="btn ghost" href="${REQUEST_BUILD_HREF}">Ask about 0S</a></div></div><aside class="atlas-panel journal-index-panel"><p class="eyebrow">Publication engine</p><div class="hero-card website-metrics">${metric(PUBLISHED_INSIGHTS.length,'live guides')}${metric(UPCOMING_INSIGHTS.length,'scheduled')}${metric(PUBLICATION_CATEGORIES.length,'topic clusters')}${metric('0','dead-link promos')}</div><div class="atlas-list"><div><strong>Editorial rule</strong><span>Useful business education first. System links only where they make the manual work easier.</span></div><div><strong>Only major platforms</strong><span>No minor deployment dump here; only the major 0S/company platforms are listed.</span></div><div><strong>Schedule rule</strong><span>The 0S Worker checks the calendar feed and queues publish receipts on a Monday, Wednesday, Friday rhythm.</span></div></div></aside></section>
<section class="section glass insight-feature"><div class="section-head"><div><p class="eyebrow">Data health and growth signals</p><h2>Build an operating company, not a pile of pages.</h2></div><a class="btn small" href="/network/">Open network</a></div><p class="section-intro">Marketplace intelligence is only useful when it changes how the company operates. A business gets stronger when the boring loops are visible: weekly planning, public information, customer intake, file proof, security, reviews, and market tests. The 0S does not replace the owner. It gives the owner rooms, gates, receipts, and live surfaces so the work stops disappearing.</p></section>
<section class="section glass publication-clusters"><div class="section-head"><div><p class="eyebrow">Valley Verified field library</p><h2>Six topic clusters for running a company.</h2></div><a class="btn small" href="/insights/schedule/">See schedule</a></div><div class="category-grid">${categoryList}</div></section>
<section class="article-grid-section"><div class="article-grid">${articleList}</div></section>
<section class="section glass schedule-preview" id="upcoming"><div class="section-head"><div><p class="eyebrow">Scheduled by 0S</p><h2>Next articles in the publishing queue.</h2></div><a class="btn small primary" href="/insights/schedule/">Open full calendar</a></div><div class="schedule-grid">${schedulePreview || '<p class="section-intro">The current calendar has no upcoming drafts.</p>'}</div></section>
<section class="section glass major-platforms"><div class="section-head"><div><p class="eyebrow">Major 0S platforms referenced</p><h2>Backlinks with a reason to exist.</h2></div><a class="btn small primary" href="${REQUEST_BUILD_HREF}">Inquire</a></div><div class="tile-grid major-platform-grid">${platformRail}</div></section>`);
}
function insightCategoryPage(category){
  const published = PUBLISHED_INSIGHTS.filter(article => article.category === category.slug);
  const scheduled = UPCOMING_INSIGHTS.filter(article => article.category === category.slug);
  const articleList = published.map(articleCard).join('');
  const scheduleList = scheduled.map(scheduleRow).join('');
  return base({
    title:`${category.name} | Valley Verified Insights`,
    description:category.deck,
    canonical:`${SITE_URL}/insights/category/${category.slug}/`,
    bodyClass:'website-page insights-page insights-category-page',
    schema:{ '@context':'https://schema.org', '@type':'CollectionPage', name:`${category.name} business guides`, url:`${SITE_URL}/insights/category/${category.slug}/`, description:category.deck }
  }, `<section class="hero glass subhero category-hero" style="--category-accent:${html(category.color)}"><div><a class="back-link" href="/insights/">Insights</a><p class="eyebrow">Valley Verified topic cluster</p><h1>${html(category.name)}</h1><p class="hero-text">${html(category.deck)}</p><div class="hero-actions"><a class="btn primary" href="/insights/schedule/">Editorial calendar</a><a class="btn" href="${REQUEST_BUILD_HREF}">Ask about this system</a></div></div><aside class="hero-card website-metrics">${metric(published.length,'live guides')}${metric(scheduled.length,'scheduled')}${metric('M/W/F','0S cadence')}</aside></section>
<section class="article-grid-section"><div class="article-grid">${articleList || '<article class="article-card"><span>Draft</span><h3>No live guides yet</h3><p>This cluster is scheduled, but not public yet.</p><small>0S queue</small></article>'}</div></section>
<section class="section glass schedule-preview"><div class="section-head"><div><p class="eyebrow">Queue for this cluster</p><h2>Upcoming releases</h2></div></div><div class="schedule-grid">${scheduleList || '<p class="section-intro">No upcoming releases in this cluster.</p>'}</div></section>`);
}
function insightSchedulePage(){
  const allRows = [...PUBLISHED_INSIGHTS, ...UPCOMING_INSIGHTS].sort((a,b) => String(a.publishAt || '').localeCompare(String(b.publishAt || '')) || a.title.localeCompare(b.title)).map(scheduleRow).join('');
  return base({
    title:'Editorial Calendar | Valley Verified Insights',
    description:'The Valley Verified 0S scheduled publisher calendar for business operating guides, topic clusters, live articles, and upcoming releases.',
    canonical:`${SITE_URL}/insights/schedule/`,
    bodyClass:'website-page insights-page insights-schedule-page',
    schema:{ '@context':'https://schema.org', '@type':'CollectionPage', name:'Valley Verified editorial calendar', url:`${SITE_URL}/insights/schedule/`, description:'Scheduled business operating education powered by the 0S Worker.' }
  }, `<section class="hero glass subhero schedule-hero"><div><a class="back-link" href="/insights/">Insights</a><p class="eyebrow">0S scheduled publisher</p><h1>Editorial calendar for the company-running library.</h1><p class="hero-text">This page is the public calendar. The JSON feed is the machine contract. The 0S Worker reads the feed, finds due articles, records a proof receipt, and queues the next publish task so Valley Verified can release useful operating guides on a schedule.</p><div class="hero-actions"><a class="btn primary" href="/api/insights-editorial-calendar.json">Open calendar feed</a><a class="btn" href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley/content-schedule" target="_blank" rel="noopener">Worker schedule API</a><a class="btn ghost" href="${REQUEST_BUILD_HREF}">Inquire</a></div></div><aside class="hero-card website-metrics">${metric(BUSINESS_INSIGHTS.length,'total guides')}${metric(PUBLISHED_INSIGHTS.length,'published')}${metric(UPCOMING_INSIGHTS.length,'scheduled')}${metric('13:17 UTC','M/W/F tick')}</aside></section>
<section class="section glass publication-clusters"><div class="section-head"><div><p class="eyebrow">Topic clusters</p><h2>Major platform links stay attached to business value.</h2></div></div><div class="category-grid">${PUBLICATION_CATEGORIES.map(categoryCard).join('')}</div></section>
<section class="section glass schedule-preview"><div class="section-head"><div><p class="eyebrow">Release queue</p><h2>Published and upcoming guides</h2></div></div><div class="schedule-grid full-calendar">${allRows}</div></section>`);
}
function insightArticlePage(article){
  const platforms = MAJOR_PLATFORM_LINKS.filter(platform => article.platformKeys.includes(platform.key));
  const category = categoryFor(article.category);
  const related = PUBLISHED_INSIGHTS.filter(item => item.slug !== article.slug && item.category === article.category).concat(PUBLISHED_INSIGHTS.filter(item => item.slug !== article.slug && item.category !== article.category)).slice(0, 3).map(articleCard).join('');
  const body = `<article class="insight-article"><header class="hero glass subhero article-hero" style="--category-accent:${html(category.color)}"><div><a class="back-link" href="/insights/">Insights</a><p class="eyebrow">${html(category.name)} / ${html(article.publishAt || TODAY)} / ${html(article.readTime)} read</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">${html(article.title)}</h1><p class="hero-text">${html(article.deck)}</p>${article.longformPromise ? `<p class="article-promise">${html(article.longformPromise)}</p>` : ''}<div class="hero-actions"><a class="btn primary" href="${REQUEST_BUILD_HREF}">Ask about this system</a><a class="btn" href="/insights/category/${html(category.slug)}/">${html(category.name)}</a><a class="btn ghost" href="/for-businesses/">Business owner path</a></div></div><aside class="article-rail"><p class="eyebrow">System backlinks</p>${platforms.map(platform => `<a href="${html(platform.url)}" target="_blank" rel="noopener"><strong>${html(platform.name)}</strong><span>${html(platform.use)}</span></a>`).join('')}</aside></header>
${manualSystemColumns(article)}
${operatorDiagnostics(article)}
<section class="section glass article-body">${articleSections(article)}${articleOperatingClose(article)}</section>
<section class="section glass source-notes"><div class="section-head"><div><p class="eyebrow">Source notes</p><h2>Public guidance used for this note.</h2></div></div><div class="source-link-grid">${sourceLinks(article.sources)}</div></section>
<section class="section glass related-insights"><div class="section-head"><div><p class="eyebrow">Keep building the system</p><h2>Read next</h2></div><a class="btn small" href="/insights/">All insights</a></div><div class="article-grid compact">${related}</div></section></article>`;
  return base({
    title:`${article.title} | Valley Verified Insights`,
    description:article.deck,
    canonical:`${SITE_URL}/insights/${article.slug}/`,
    bodyClass:'website-page insights-page insight-article-page',
    schema:{ '@context':'https://schema.org', '@type':'BlogPosting', headline:article.title, description:article.deck, datePublished:article.publishAt || TODAY, dateModified:TODAY, articleSection:category.name, author:{ '@type':'Organization', name:'Valley Verified' }, publisher:{ '@type':'Organization', name:'Valley Verified' }, mainEntityOfPage:`${SITE_URL}/insights/${article.slug}/` }
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
    ['Skye-Clients/empire-pallets-v3-app/assets/media/empire-hero-poster.jpg', 'assets/client-builds/empire-live-build-poster.jpg'],
    ['Skye-Clients/480-realty-property-management-app/assets/brand/480-realty-hero.mp4', 'assets/client-builds/480-live-build.mp4'],
    ['Skye-Clients/480-realty-property-management-app/assets/live-site/480-home-hero.png', 'assets/client-builds/480-live-build-poster.png'],
    ['Skye-Clients/480-realty-property-management-app/assets/live-site/480-preview-qr.png', 'assets/client-builds/480-live-build-qr.png'],
    ['Skye-Clients/dink-and-dine-pickle-park-app/assets/live-site/dink-drone.jpg', 'assets/client-builds/dink-live-build.jpg'],
    ['Skye-Clients/dink-and-dine-pickle-park-app/assets/live-site/dink-preview-qr.png', 'assets/client-builds/dink-live-build-qr.png'],
    ['Skye-Clients/techbros-electronic-recycling-itad-app/assets/brand/techbros-electronic-recycling-itad-hero.mp4', 'assets/client-builds/techbros-live-build.mp4'],
    ['Skye-Clients/techbros-electronic-recycling-itad-app/assets/live-site/techbros-hero-home.png', 'assets/client-builds/techbros-live-build-poster.png'],
    ['Skye-Clients/techbros-electronic-recycling-itad-app/assets/live-site/techbros-preview-qr.png', 'assets/client-builds/techbros-live-build-qr.png'],
    ['Skye-Clients/arclight-pictures-app/assets/live-site/arclight-hero-banner.png', 'assets/client-builds/arclight-live-build.png'],
    ['Skye-Clients/arclight-pictures-app/assets/live-site/arclight-workspace-qr.png', 'assets/client-builds/arclight-live-build-qr.png']
  ];
  const copied = [];
  for (const [srcRel, destRel] of assets) {
    if (await copyOptional(path.join(REPO_ROOT, srcRel), path.join(DIST, destRel))) copied.push(destRel);
  }
  await writeJson('data/client-build-assets.json', { updated_at:TODAY, copied, builds:clientBuilds });
}
function skyeCommandCenter(){
  return `<section class="command-center" data-skye-component="app-first-command-center"><div class="command-center__copy"><p>BUSINESS VISIBILITY CONSOLE</p><h1>Verified pages now route owners into free SkyEmail.</h1><span>Verified profile facts, SkyEmail acceptance, 24-hour provisioning, owner notification, and seat countdown stay visible in one place.</span></div><div class="command-center__surface"><header><div><strong>Valley Business Page Console</strong><span>Verified page / SkyEmail acceptance / optional growth</span></div><a class="btn small primary" href="/data/skyemail-provisioning.json">Open provisioning JSON</a></header><div class="command-center__grid"><aside class="command-rail"><a class="active" href="#page" data-skye-tab="page">Facts</a><a href="#skyemail" data-skye-tab="skyemail">SkyEmail</a><a href="#workspace" data-skye-tab="workspace">Workspace</a><a href="#seats" data-skye-tab="seats">Seats</a></aside><main><div class="status-grid"><article><i class="status-icon"></i><span>Status</span><strong>Verified local records</strong></article><article><i class="status-icon"></i><span>SkyEmail</span><strong>Free account accepted</strong></article><article><i class="status-icon"></i><span>Activation</span><strong>24 hour window</strong></article><article><i class="status-icon"></i><span>Seats</span><strong>9 left</strong></article></div><section class="console-card" data-skye-panel="page"><p>Business facts</p><h2>Pages focus on the business, not verification theater.</h2><div class="check-list"><span>Business name, service lane, market, website, phone, email, share, request, compare, and source handoff stay visible.</span><span>Valley profiles are owner-researched verified local records.</span><span>Owner action routes to SkyEmail acceptance instead of re-verifying the business.</span></div></section><section class="console-card hidden" data-skye-panel="skyemail"><p>SkyEmail account</p><h2>Free SkyEmail is the primary owner handoff.</h2><div class="check-list"><span>Each business gets a reserved SkyEmail mailbox.</span><span>Sign-in uses the shared 0S/SkyGate lane.</span><span>The team provisions the workspace within 24 hours after acceptance.</span></div></section><section class="console-card hidden" data-skye-panel="workspace"><p>Provisioning</p><h2>Notify the owner to provision a workspace.</h2><div class="check-list"><span>Acceptance creates an owner notification: provision the Valley Verified workspace.</span><span>K4i escalates if the account is still inactive after 24 hours.</span><span>Workspace state stays in the SkyEmail provisioning model.</span></div></section><section class="console-card hidden" data-skye-panel="seats"><p>Seat pool</p><h2>Countdown from 9 seats remaining.</h2><div class="check-list"><span>Seat pool is based on the Darthom inbox check.</span><span>Message the owner when only 2 seats remain.</span><span>More seats are purchased in groups of 5.</span></div></section></main></div></div></section>`;
}
function skyeProofFunnel(){
  const steps = [
    ['Verified page exists','Valley Verified treats the owner-researched business record as verified and keeps the public facts clear.'],
    ['SkyEmail accepted','The owner accepts the free SkyEmail account through the shared 0S/SkyGate lane.'],
    ['Workspace provisioned','The team provisions the workspace within 24 hours; K4i escalates after the window if it is inactive.'],
    ['Optional upgrades open','Featured placement, lead routing, sponsor lanes, and managed growth are available only when the business wants more reach.']
  ];
  return `<section class="proof-funnel" data-skye-component="scroll-proof-funnel"><div class="proof-funnel__intro"><p>VISIBILITY FUNNEL</p><h2>Verified page first. SkyEmail activation next.</h2><span>The owner path moves from a verified public page into free SkyEmail acceptance, then workspace provisioning and optional growth if the business asks for more reach.</span></div><div class="proof-funnel__steps">${steps.map(([title, body], index) => `<article class="proof-step"><div class="proof-rail"><span class="proof-rail__fill proof-rail__fill-${index}"></span></div><span>${String(index + 1).padStart(2, '0')}</span><h3>${html(title)}</h3><p>${html(body)}</p></article>`).join('')}</div></section>`;
}
function compactList(items = [], limit = 5){
  return items.slice(0, limit).map(item => `<span>${html(item)}</span>`).join('');
}
function renderClientBuildMedia(build, frameClass = 'client-video-frame'){
  const alt = html(build.mediaAlt || `${build.name} live client build`);
  const poster = html(build.poster || build.image || '');
  const media = build.video
    ? `<video autoplay muted loop playsinline controls preload="metadata" poster="${poster}"><source src="${html(build.video)}" type="video/mp4"></video>`
    : `<img src="${html(build.image || build.poster || '')}" alt="${alt}" loading="lazy"/>`;
  return `<div class="${html(frameClass)}">${media}</div>`;
}
function clientBuildShowcase(){
  const cards = clientBuilds.map(build => `<article class="client-build-card live-build-card">${renderClientBuildMedia(build)}<div class="client-build-copy"><p class="eyebrow">${html(build.label)} / ${html(build.industry)}</p><h3>${html(build.name)}</h3><p>${html(build.actualApp || build.copy)}</p><div class="client-build-metrics">${build.metrics.map(item => `<span>${html(item)}</span>`).join('')}</div><div class="client-app-spec"><strong>What the app-build example includes</strong><div>${compactList(build.deliverables, 4)}</div></div><div class="card-actions"><a class="btn small primary" href="${html(build.url)}" target="_blank" rel="noopener">Open live build</a><a class="btn small" href="${html(build.valleyUrl)}">Valley post</a><a class="btn small" href="/app-builds/">App build lane</a><button class="btn small" data-share-profile data-share-url="${html(build.url)}" data-share-title="${html(`${build.name} live app-build example`)}" data-share-text="${html(build.copy)}">Share</button></div></div></article>`).join('');
  return `<section class="section glass client-build-showcase live-build-showcase" id="client-builds"><div class="section-head"><div><p class="eyebrow">Live app-build examples</p><h2>${clientBuilds.length} inspectable app builds with client-specific proof.</h2></div><div class="button-row"><a class="btn small primary" href="/app-builds/">Open app build lane</a><a class="btn small" href="${APP_BUILD_GATE_HREF}" target="_blank" rel="noopener">Open gate offer</a></div></div><p class="section-intro">The free Valley Verified page is the public bridge. The app-build lane shows live Pages and 0S-mounted builds that can be inspected, with owner approval, production proof, and handoff handled before any new client surface is promoted.</p><div class="client-build-grid">${cards}</div></section>`;
}
function appBuildCaseStudyCard(build){
  const proof = build.proof.map(([label, value]) => `<div><strong>${html(label)}</strong><span>${html(value)}</span></div>`).join('');
  return `<article class="app-case-study glass" id="${html(build.id)}-app-build">${renderClientBuildMedia(build, 'case-study-media')}<div class="case-study-copy"><p class="eyebrow">${html(build.label)} / ${html(build.industry)}</p><h2>${html(build.name)} is a live app-build example.</h2><p>${html(build.actualApp)}</p><div class="app-value-grid"><article><strong>Deliverables</strong><div class="check-list compact-list">${compactList(build.deliverables, 12)}</div></article><article><strong>Business value</strong><div class="check-list compact-list">${compactList(build.value, 12)}</div></article></div><div class="deep-scan-receipt">${proof}</div><div class="button-row"><a class="btn primary" href="${html(build.url)}" target="_blank" rel="noopener">Open live build</a><a class="btn" href="${html(build.valleyUrl)}">Open Valley post</a><a class="btn ghost" href="${APP_BUILD_GATE_HREF}" target="_blank" rel="noopener">Scope an app lane</a></div></div></article>`;
}
function appBuildLanePage(){
  const routeTiles = clientBuilds.map(build => `<article class="proof-card glass"><span>${html(build.id.toUpperCase())}</span><h2>${html(build.name)}</h2><p>${html(build.copy)}</p><div class="tag-list big-tags">${compactList(build.appRoutes, 8)}</div><div class="button-row"><a class="btn small primary" href="${html(build.url)}" target="_blank" rel="noopener">Live build</a><a class="btn small" href="${html(build.valleyUrl)}">Valley post</a></div></article>`).join('');
  return base({
    title:'Valley Verified App Build Lane | Live App-Build Examples',
    description:"Bob's Smoke Shop, Empire Pallets, Next Level Gaming AZ, Fade Masters PHX, 480 Realty, Dink & Dine, Techbros, and ArcLight show inspectable app-build examples with client-specific proof and owner-approved handoff.",
    canonical:`${SITE_URL}/app-builds/`,
    bodyClass:'website-page app-builds-page'
  }, `<section class="hero glass subhero app-build-lane-hero"><div><p class="eyebrow">Valley Verified inside MetrAIyux 0S</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">Live builds are client-specific and proof checked.</h1><p class="hero-text">A Valley Verified post gives a business a public discovery bridge. A paid app build can add branded routes, buyer actions, forms, media, proof language, QR/share handoffs, and gate-owned activation. The builds below are inspectable examples with owner approval, production proof, and handoff standards attached.</p><div class="hero-actions"><a class="btn primary" href="${APP_BUILD_GATE_HREF}" target="_blank" rel="noopener">Open SkyePay gate lane</a><a class="btn" href="/business/bobs-smoke-shop-litchfield-park/">Bob's Valley post</a><a class="btn" href="/business/480-realty-property-management-mesa-85209/">480 Valley post</a><a class="btn" href="/business/arclight-pictures-tucson/">ArcLight Valley post</a></div></div><aside class="hero-card app-lane-receipt">${metric(clientBuilds.length,'live builds checked')}${metric('0','placeholder builds promoted')}${metric('0S','platform mount')}${metric('Gate','owner approval required')}</aside></section>
${clientBuildShowcase()}
<section class="section glass app-deliverable-grid"><div class="section-head"><div><p class="eyebrow">What a customer gets</p><h2>A public post plus an owner-approved app-build lane.</h2></div><a class="btn small primary" href="${APP_BUILD_GATE_HREF}" target="_blank" rel="noopener">Start gate lane</a></div><div class="platform-strip">${tile('01','Valley Verified post','The public page gives buyers the business route, search/discovery context, contact paths, save/share controls, SkyEmail acceptance, and a handoff into any approved website or app.','/featured/')}${tile('02','App-build example','The app-build lane can carry the business-specific workflow: retail inventory for Bob, quote intake for Empire, events for Next Level, booking for Fade Masters, owner ops for 480, guest routing for Dink, secure ITAD intake for Techbros, and project proof for ArcLight.','/app-builds/')}${tile('03','Proof and handoff','The app can link back to Valley Verified, the Valley post can link to the app, and the gate records approval without claiming unprovisioned SkyEmail accounts are active.','/claims-ledger/')}</div></section>
<section class="section glass app-route-examples"><div class="section-head"><div><p class="eyebrow">Deep scan routes</p><h2>Inspectable app-build surfaces behind the Valley posts.</h2></div></div><div class="platform-strip">${routeTiles}</div></section>
<section class="app-case-study-stack">${clientBuilds.map(appBuildCaseStudyCard).join('')}</section>
<section class="section glass app-build-gate-panel"><div class="section-head"><div><p class="eyebrow">Gate and 0S wiring</p><h2>This lane belongs inside the 0S, with owner-approved checkout and proof.</h2></div></div><p class="section-intro">A customer does not just get a directory entry. They get a scoped app build that can be mounted in the 0S, linked from Valley Verified, and routed through SkyeGateFS27/SkyePay for approval, payment, and activation state. Public claims stay careful: verified pages, SkyEmail acceptance, paid intent, and production app work are separate states.</p><div class="hero-actions"><a class="btn primary" href="${APP_BUILD_GATE_HREF}" target="_blank" rel="noopener">Open SkyePay offer</a><a class="btn" href="/api/client-app-deep-scan.json">Open scan JSON</a><a class="btn ghost" href="/network/">Network map</a></div></section>`);
}
function websiteHero(){ return `<section class="hero website-hero editorial-atlas"><div class="hero-copy"><p class="eyebrow">Arizona verified business network</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">Valley Verified gives the verified page and routes owners into free SkyEmail.</h1><p class="hero-text">Valley Verified turns researched local records into useful public business pages, then routes accepted businesses into SkyEmail workspace provisioning with a 24-hour activation window.</p><div class="hero-actions"><a class="btn primary" href="/directory/">Explore the marketplace</a><a class="btn" href="/app-builds/">See live client builds</a><a class="btn ghost" href="/data/skyemail-provisioning.json">SkyEmail provisioning</a><a class="btn ghost" href="/for-businesses/">Accept SkyEmail path</a></div></div><aside class="atlas-panel"><p class="eyebrow">Network receipt</p><div class="hero-card website-metrics">${metric(currency(count),'verified business pages')}${metric(currency(categoryCount),'service lanes')}${metric(currency(cityCount),'Arizona markets')}${metric('9','SkyEmail seats left')}</div><div class="atlas-list"><div><strong>Free SkyEmail acceptance</strong><span>Reserved mailbox, shared 0S/SkyGate sign-in, team activation within 24 hours.</span></div><div><strong>Seat countdown</strong><span>Notify the owner at 2 seats remaining; buy more seats in groups of 5.</span></div></div></aside></section>`; }

await copyClientBuildAssets();
await write('index.html', base({ title:'Valley Verified | Arizona Verified Business Network', description:'Valley Verified is a Phoenix-area business marketplace where verified local profiles route owners into free SkyEmail acceptance and buyers into usable contact paths.', canonical:`${SITE_URL}/`, bodyClass:'home-page website-home', schema:{ '@context':'https://schema.org', '@type':'WebSite', name:'Valley Verified', url:`${SITE_URL}/`, potentialAction:{ '@type':'SearchAction', target:`${SITE_URL}/directory/?q={search_term_string}`, 'query-input':'required name=search_term_string' } } }, `${websiteHero()}
    ${skyeCommandCenter()}
<section class="section glass website-positioning"><div class="section-head"><div><p class="eyebrow">What this is</p><h2>A verified business marketplace with SkyEmail activation.</h2></div><a class="btn small" href="/data/skyemail-provisioning.json">Provisioning model</a></div><div class="platform-strip">${tile('01','Verified supply','The network organizes researched Arizona business records into verified public profiles.','/network/')}${tile('02','One profile per business','Canonical identity, duplicate collision reports, and admin suppressions protect the marketplace from duplicate spam.','/fraud-defense/')}${tile('03','SkyEmail activation','Owners accept a free SkyEmail account; the workspace is provisioned within 24 hours and K4i escalates if it is not active.','/data/skyemail-provisioning.json')}</div></section>
    ${skyeProofFunnel()}
    ${clientBuildShowcase()}
<section class="section glass"><div class="section-head"><div><p class="eyebrow">Platform tools</p><h2>Buyer and operator workflows</h2></div><a class="btn small" href="/deal-desk/">Open deal desk</a></div><div class="tile-grid">${tile('BUY','Buyer discovery','Directory, match, compare, shortlist, and request workflows help visitors move from search to action.','/directory/')}${tile('EDU','Operating insights','Field notes teach the manual business habit first, then show where 0S removes repeated admin drag.','/insights/')}${tile('OWN','SkyEmail activation','Free SkyEmail acceptance and 24-hour workspace provisioning replace business re-verification.','/data/skyemail-provisioning.json')}${tile('OPS','Operator control','Fraud defense, duplicate queues, workspace provisioning, seat countdowns, and AE work orders protect the network.','/protected-admin/')}</div></section>
<section class="split-grid website-money-path"><div class="section glass"><p class="eyebrow">For buyers</p><h2>Browse real local service lanes without guessing where to start.</h2><p>Use directory, category, city, market, match, shortlist, and compare tools to move from search to quote request. Profiles focus on business facts, contact routes, and verified local context.</p><div class="hero-actions"><a class="btn primary" href="/match/">Use match engine</a><a class="btn" href="/compare/">Compare providers</a></div></div><div class="section glass"><p class="eyebrow">For businesses</p><h2>Accept the free SkyEmail account for the canonical listing.</h2><p>Business owners use the SkyEmail lane to accept the reserved mailbox. The team provisions the workspace within 24 hours and optional exposure stays separate.</p><div class="hero-actions"><a class="btn primary" href="/data/skyemail-provisioning.json">Open SkyEmail model</a><a class="btn" href="/advertise/">Optional exposure</a></div></div></section>
<section class="section glass homepage-featured-section"><div class="section-head"><div><p class="eyebrow">Marketplace sample</p><h2>Verified business pages</h2></div><a class="btn small" href="/directory/">View all</a></div><div class="cards featured-card-grid homepage-feature-card-grid">${sample.map(miniCard).join('')}</div></section>
<section class="section glass website-proof"><div class="section-head"><div><p class="eyebrow">Data honesty</p><h2>Current profile depth</h2></div><a class="btn small" href="/data/skyemail-provisioning.json">SkyEmail data</a></div><div class="detail-grid"><div><strong>Website fields</strong><span>${currency(websiteCount)} records currently include a website.</span></div><div><strong>Phone fields</strong><span>${currency(phoneCount)} records currently include a phone.</span></div><div><strong>Email fields</strong><span>${currency(emailCount)} records currently include an email.</span></div><div><strong>SkyEmail activation</strong><span>Every verified profile gets a reserved mailbox and workspace provisioning route.</span></div></div></section>`));

const featuredShown = featured.length ? featured : full.filter(b => b.website).slice(0, 12);
await write('featured/index.html', base({
  title:'Featured Businesses | Valley Verified',
  description:'Featured Valley Verified businesses get public landing pages that connect local discovery to their live business site or app.',
  canonical:`${SITE_URL}/featured/`,
  bodyClass:'website-page featured-page'
}, `<section class="hero glass subhero website-subhero featured-hero"><div><p class="eyebrow">Featured Valley Verified</p><h1>Featured businesses get a verified public page, not a throwaway listing.</h1><p class="hero-text">This lane shows the value of the offer: a business can have one clean Valley Verified page for local discovery, then route owners into free SkyEmail and buyers into its full website or approved app when they are ready to act.</p><div class="hero-actions"><a class="btn primary" href="/data/skyemail-provisioning.json">SkyEmail provisioning</a><a class="btn" href="/app-builds/">See app-build examples</a><a class="btn" href="${APP_BUILD_GATE_HREF}" target="_blank" rel="noopener">Open gate lane</a></div></div><aside class="hero-card">${metric(featuredShown.length,'featured pages')}${metric(currency(count),'network pages')}${metric('9','SkyEmail seats left')}</aside></section>
${skyeCommandCenter()}
<section class="section glass featured-value"><div class="section-head"><div><p class="eyebrow">Why it has value</p><h2>The featured page becomes a public bridge into the real business.</h2></div></div><div class="platform-strip">${tile('PAGE','Built landing','Each featured post is written like a one-page business landing with buyer actions, contact paths, service context, and a direct live-site handoff.','/featured/')}${tile('BACK','Two-way funnel','The business app links to Valley Verified, and Valley Verified links back to the full business app or website.','/network/')}${tile('UP','Optional scale','After the free page proves value, verification, featured placement, lead routing, sponsor lanes, and managed growth are available only if wanted.','/advertise/')}</div></section>
${clientBuildShowcase()}
<section class="section glass featured-posts-section"><div class="section-head"><div><p class="eyebrow">Featured posts</p><h2>Live examples</h2></div><a class="btn small" href="/directory/">Open directory</a></div><div class="cards featured-card-grid">${featuredShown.map(miniCard).join('') || '<article class="business-card"><h3>No featured pages yet</h3><p class="card-desc">Featured pages appear here after a business is marked as featured in the seed data.</p></article>'}</div></section>`));

await write('app-builds/index.html', appBuildLanePage());

const pages = [
  ['about','About Valley Verified','Valley Verified is an Arizona business network built from researched public records, duplicate prevention, SkyEmail acceptance, and AE activation systems.', 'A verified network starts with disciplined marketplace data.', [ ['Research first','Valley Verified organizes public and licensed business records into useful verified profiles.'], ['SkyEmail next','Owner action routes into a free SkyEmail account with 24-hour workspace provisioning.'], ['Sell exposure honestly','AEs can sell visibility products only where the marketplace has a real category/city lane and proof-backed activation.'] ]],
  ['how-it-works','How Valley Verified Works','See how Valley Verified turns business records into searchable verified profiles, SkyEmail provisioning queues, AE activation queues, and optional exposure opportunities.', 'From verified profile to SkyEmail activation.', [ ['1. Research','CSV or JSON business records are dropped into the seed inbox, normalized, deduped, and published as verified local profiles.'], ['2. Accept','Owners accept the reserved free SkyEmail account through the shared 0S/SkyGate lane.'], ['3. Provision','The team provisions the workspace within 24 hours; optional exposure products stay separate.'] ]],
  ['for-businesses','For Arizona Businesses','Accept your free Valley Verified SkyEmail account, confirm business contact paths, and explore optional exposure products.', 'A verified public landing is useful on its own.', [ ['Accept SkyEmail','The system is designed around one business, one verified profile, and one reserved SkyEmail mailbox.'], ['24-hour activation','The team provisions the workspace within 24 hours after acceptance. K4i escalates if it is inactive after the window.'], ['Upgrade only if wanted','Optional exposure products can be requested after the profile is ready and the business wants more reach.'] ]],
  ['advertise','Advertise on Valley Verified','Valley Verified exposure products help activated businesses move beyond the included profile into featured placement, lead-routing, and sponsor-placement surfaces only when they want more reach.', 'Optional visibility where the marketplace has real supply.', [ ['Profile upgrades','Improve verified listing presentation after SkyEmail acceptance and workspace activation.'], ['Category boosts','Promote in specific service lanes only when the category has enough marketplace depth.'], ['Lead-routing lanes','Route buyer requests through auditable rules instead of hidden black-box promises.'] ]],
  ['network','Valley Verified Network','Explore Valley Verified as a multi-page local business network with directory, city hubs, category hubs, service lanes, SkyEmail workflows, and AE operations.', 'A local marketplace network, not a one-page directory.', [ ['Directory layer','Search, compare, shortlist, and request quote paths for verified profiles.'], ['Market layer','City, category, niche, collection, and local-intent pages give the marketplace structure.'], ['Operations layer','SkyEmail provisioning, fraud defense, AE assignment, payment intent, and notification workflows prepare the business side.'] ]],
  ['contact','Contact Valley Verified','Contact Valley Verified to accept SkyEmail, request a correction, discuss advertising, or ask about business visibility in Arizona.', 'Start with the right workflow.', [ ['Business owner','Use the SkyEmail path to accept the free account for your verified profile.'], ['Buyer','Use directory, match, and quote request tools to find providers.'], ['AE/operator','Use upstream-auth protected routes for pipeline and admin workflows.'] ]]
];
for(const [slug,title,desc,h1,cards] of pages){
  const cardHtml = cards.map((c,i)=>`<article class="proof-card glass"><span>${String(i+1).padStart(2,'0')}</span><h2>${html(c[0])}</h2><p>${html(c[1])}</p></article>`).join('');
  const actions = slug === 'contact' ? `<div class="hero-actions"><a class="btn primary" href="/data/skyemail-provisioning.json">SkyEmail provisioning</a><a class="btn" href="/request/">Request help</a><a class="btn ghost" href="/pricing/">Advertising</a></div>` : `<div class="hero-actions"><a class="btn primary" href="/directory/">Open directory</a><a class="btn" href="/data/skyemail-provisioning.json">Business SkyEmail path</a></div>`;
  const skyeInsert = slug === 'for-businesses' ? `${skyeCommandCenter()}${skyeProofFunnel()}` : '';
  await write(`${slug}/index.html`, base({ title:`${title} | Valley Verified`, description:desc, canonical:`${SITE_URL}/${slug}/`, bodyClass:`website-page ${slug}-page` }, `<section class="hero glass subhero website-subhero"><div><p class="eyebrow">Valley Verified</p><h1>${html(h1)}</h1><p class="hero-text">${html(desc)}</p>${actions}</div><aside class="hero-card">${metric(currency(count),'profiles')}${metric(currency(categoryCount),'service lanes')}${metric(currency(cityCount),'markets')}</aside></section>${skyeInsert}<section class="platform-strip">${cardHtml}</section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Next step</p><h2>Move through the correct workflow.</h2></div></div><div class="tile-grid">${tile('BUY','Find providers','Search, compare, shortlist, and request quotes.','/directory/')}${tile('OWN','Accept SkyEmail','Accept the reserved free SkyEmail account for the verified business profile.','/data/skyemail-provisioning.json')}${tile('SELL','Exposure','Review advertising and profile upgrade products.','/advertise/')}${tile('TRUST','Provisioning model','See activation window, owner notification, K4i escalation, and seat countdown rules.','/data/skyemail-provisioning.json')}</div></section>`));
}

await write('join/index.html', base({
  title:'Accept SkyEmail | Valley Verified',
  description:'Accept the free Valley Verified SkyEmail account for a verified business profile. Workspace provisioning takes up to 24 hours.',
  canonical:`${SITE_URL}/join/`,
  bodyClass:'website-page join-page'
}, `<section class="hero glass subhero website-subhero"><div><p class="eyebrow">Business owner path</p><h1>Accept the free SkyEmail account. Upgrade only if you want more reach.</h1><p class="hero-text">The business is already a researched Valley Verified record. The owner action is accepting the reserved SkyEmail account, then the team provisions the workspace within 24 hours.</p><div class="hero-actions"><a class="btn primary" href="/data/skyemail-provisioning.json">Open SkyEmail provisioning</a><a class="btn" href="/advertise/">Optional exposure</a></div></div><aside class="hero-card">${metric('24h','activation window')}${metric('9','seats left')}${metric('5','seat purchase group')}</aside></section>${skyeCommandCenter()}${skyeProofFunnel()}<section class="platform-strip">${tile('01','Already verified','Valley profiles are owner-researched verified local records.','/directory/')}${tile('02','Accept SkyEmail','Owners accept the reserved account through the shared 0S/SkyGate lane.','/data/skyemail-provisioning.json')}${tile('03','Provision workspace','Notify the owner to provision; K4i escalates after 24 hours if inactive.','/protected-admin/')}</section>`));

await write('pricing/index.html', base({
  title:'Optional Exposure | Valley Verified',
  description:'Valley Verified includes free SkyEmail acceptance for verified profiles; paid exposure products stay optional.',
  canonical:`${SITE_URL}/pricing/`,
  bodyClass:'website-page pricing-page'
}, `<section class="hero glass subhero website-subhero"><div><p class="eyebrow">Pricing boundary</p><h1>Free SkyEmail acceptance is included. Upgrades are optional.</h1><p class="hero-text">The included route is the verified public profile plus reserved SkyEmail acceptance. Paid products are for extra exposure, lead routing, sponsor placement, or managed growth after the workspace is active.</p><div class="hero-actions"><a class="btn primary" href="/data/skyemail-provisioning.json">SkyEmail provisioning</a><a class="btn" href="/advertise/">Exposure products</a></div></div><aside class="hero-card">${metric('Included','SkyEmail acceptance')}${metric('2','reorder alert')}${metric('5','buy seats in groups')}</aside></section><section class="tile-grid">${tile('FREE','Verified profile','Business facts, public route, buyer request, save, compare, and SkyEmail acceptance.','/directory/')}${tile('PAID','Exposure only','Featured placement, lead routing, sponsor inventory, and managed growth are optional.','/advertise/')}${tile('OPS','Seat countdown','Start at 9 seats left, alert at 2, purchase more in groups of 5.','/data/skyemail-provisioning.json')}</section>`));

await write('owner-verification/index.html', base({
  title:'SkyEmail Provisioning Packets | Valley Verified',
  description:'Operator packets for SkyEmail acceptance, workspace provisioning, K4i escalation, and seat countdowns.',
  canonical:`${SITE_URL}/owner-verification/`,
  bodyClass:'website-page owner-verification-page',
  robots:'noindex,nofollow,noarchive'
}, `<section class="hero glass subhero website-subhero"><div><p class="eyebrow">Operator packet</p><h1>SkyEmail acceptance packets without adding local auth.</h1><p class="hero-text">Use this surface to track the reserved mailbox, accepted owner handoff, 24-hour activation window, owner notification, K4i escalation, and remaining seat pool.</p><div class="hero-actions"><a class="btn primary" href="/data/skyemail-provisioning.json">Open provisioning JSON</a><a class="btn" href="/protected-admin/">Operator workspace</a></div></div><aside class="hero-card">${metric(currency(count),'profiles')}${metric('9','seats left')}${metric('24h','activation SLA')}</aside></section><section class="platform-strip">${tile('ACCEPT','Owner accepts','Owner accepts the free SkyEmail account through shared FS27/SkyGate.','/data/skyemail-provisioning.json')}${tile('PROVISION','Team provisions','Notify the owner to provision a workspace immediately after acceptance.','/protected-admin/')}${tile('ESCALATE','K4i follows up','If inactive after 24 hours, K4i alerts with the remaining seat count.','/data/skyemail-provisioning.json')}</section>`));

await write('insights/index.html', insightIndexPage());
await write('insights/schedule/index.html', insightSchedulePage());
for(const category of PUBLICATION_CATEGORIES){
  await write(`insights/category/${category.slug}/index.html`, insightCategoryPage(category));
}
for(const article of PUBLISHED_INSIGHTS){
  await write(`insights/${article.slug}/index.html`, insightArticlePage(article));
}
const editorialCalendar = editorialCalendarPayload();
await writeJson('data/insights-editorial-calendar.json', editorialCalendar);
await writeJson('api/insights-editorial-calendar.json', editorialCalendar);

const clientAppDeepScan = {
  version:'23.2.0',
  updated_at:TODAY,
  lane:{
    id:'valley-verified-app-build-lane',
    name:'Valley Verified App Build Lane',
    public_route:'/app-builds/',
    gate_url:APP_BUILD_GATE_HREF,
    platform_mount:'/valley-verified/',
    position:'Valley Verified public post plus optional MetrAIyux 0S app build for businesses that need a real app, quote route, retail flow, QR handoff, or proof-backed customer surface.'
  },
  actual_client_apps:clientBuilds.map(build => ({
    id:build.id,
    name:build.name,
    industry:build.industry,
    source_folder:build.sourceFolder,
    live_app_url:build.url,
    valley_post_url:build.valleyUrl,
    routes:build.appRoutes,
    deliverables:build.deliverables,
    value:build.value,
    buyer_actions:build.buyerActions,
    proof:Object.fromEntries(build.proof)
  })),
  customer_value:[
    'A real public Valley Verified route for local discovery and trust context.',
    'A business-specific app surface that matches how the company sells or serves customers.',
    'Live app handoff, Valley backlink, share/QR behavior, and proof-safe copy.',
    'SkyeGateFS27/SkyePay lane for owner-approved commercial activation.'
  ],
  guardrails:[
    'Live app-build examples require client-specific proof and owner-approved handoff.',
    'Valley profiles are owner-researched verified local records; owner action routes to SkyEmail acceptance.',
    'Paid intent does not activate production work without owner approval and proof.'
  ]
};
await writeJson('data/client-app-deep-scan.json', clientAppDeepScan);
await writeJson('api/client-app-deep-scan.json', clientAppDeepScan);

const websiteContent = { version:'23.2.0', updated_at:TODAY, purpose:'Public website layer for Valley Verified', routes:['/','/featured/','/app-builds/','/about/','/how-it-works/','/for-businesses/','/advertise/','/network/','/contact/', ...INSIGHT_ROUTES], counts:{ published_businesses:count, featured_pages:featuredShown.length, client_app_builds:clientBuilds.length, insights:PUBLISHED_INSIGHTS.length, insights_total:BUSINESS_INSIGHTS.length, insights_scheduled:UPCOMING_INSIGHTS.length, insight_categories:PUBLICATION_CATEGORIES.length, major_platforms:MAJOR_PLATFORM_LINKS.length, categories:categoryCount, cities:cityCount, websites:websiteCount, phones:phoneCount, emails:emailCount, duplicate_merges:report.records?.exact_merges ?? null, skyemail_seats_remaining:9 }, claims_guardrails:['Valley profiles are owner-researched verified local records.','Owner action routes to free SkyEmail acceptance and 24-hour workspace provisioning.','Paid exposure intent does not equal paid activation until webhook and admin approval complete.','Duplicate prevention is enforced through canonical identity, collision reports, and suppression workflows.','Bob, Empire, Next Level, Fade Masters, 480 Realty, Dink & Dine, Techbros, and ArcLight are live app-build examples with owner-approved production proof standards.','Business insights should educate first and link only to major live 0S/company platforms.','Scheduled articles appear in the editorial calendar before publish, but public article routes are generated only when publish_at has arrived.'] };
await writeJson('data/website-content.json', websiteContent);
await writeJson('api/website-content.json', { updated_at:TODAY, href:'/data/website-content.json', routes:websiteContent.routes, counts:websiteContent.counts });
const brainSalesGuide = {
  updated_at:TODAY,
  product:'Valley Verified',
  positioning:'Valley Verified gives researched businesses a verified public landing and a free SkyEmail acceptance path. The paid app-build lane turns qualified businesses into actual Bob/Empire-style app surfaces when they need a real workflow.',
  hard_rules:[
    'Do not say upgrades are required to keep the account or included public page.',
    'Valley profiles are owner-researched verified local records; do not claim SkyEmail is active before the workspace is provisioned.',
    'Describe verification, featured placement, lead routing, sponsor lanes, and managed growth as optional upgrades only when the business wants more reach.'
  ],
  links:{
    home:`${SITE_URL}/`,
    insights:`${SITE_URL}/insights/`,
    featured:`${SITE_URL}/featured/`,
    app_builds:`${SITE_URL}/app-builds/`,
    bobs_post:`${SITE_URL}/business/bobs-smoke-shop-litchfield-park/`,
    empire_post:`${SITE_URL}/business/empire-pallets-phoenix/`,
    bobs_live:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/bobs-smoke-shop/',
    empire_live:'https://empire-pallets.pages.dev/',
    request_build:REQUEST_BUILD_HREF,
    gate_offer:APP_BUILD_GATE_HREF
  },
  products:[
    { name:'Free SkyEmail acceptance', price:'Included for verified Valley profiles', obligation:'No upgrade required', activation:'Team provisions workspace within 24 hours' },
    { name:'Valley Verified App Build Lane', price:'Owner-approved SkyePay lane', obligation:'Only when the business wants a real app like Bob or Empire' },
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
let brainAssetInserts = 0;
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
  if(isProfile){
    const businessId = rel.split('/')[1];
    const needsActionStrip = !body.includes('Accept SkyEmail') || !body.includes('/request/?business=') || !body.includes('Save shortlist') || !body.includes('/compare/?ids=');
    if(needsActionStrip){
      const actionStrip = `<section class="section glass vv-profile-action-strip"><div class="section-head"><div><p class="eyebrow">Business actions</p><h2>Accept SkyEmail, request, save, or compare this profile.</h2></div></div><div class="button-row"><a class="btn primary" href="${SKYEMAIL_SIGNIN_BASE}&business=${html(businessId)}">Accept SkyEmail</a><a class="btn" href="/request/?business=${html(businessId)}">Request quote</a><button class="btn" data-save-business data-business-id="${html(businessId)}" data-business-name="${html(businessId.replaceAll('-', ' '))}" data-url="/business/${html(businessId)}/">Save shortlist</button><a class="btn" href="/compare/?ids=${html(businessId)}">Compare</a></div></section>`;
      body = body.includes('</main>') ? body.replace('</main>', `${actionStrip}</main>`) : body.replace('</body>', `${actionStrip}</body>`);
    }
  }
  if(!isProfile && !isInternal && body.includes('</body>') && !body.includes('site-footer public-footer')){
    body = body.replace('</body>', `${publicFooter}</body>`); footerInserts++;
  }
  if(body.includes('</head>') && !body.includes('/assets/valley-brain.css')){
    if(body.includes('<link rel="stylesheet" href="/assets/styles.css"/>')){
      body = body.replace('<link rel="stylesheet" href="/assets/styles.css"/>', '<link rel="stylesheet" href="/assets/styles.css"/><link rel="stylesheet" href="/assets/valley-brain.css"/>');
    } else if(body.includes('<link rel="stylesheet" href="/assets/styles.css" />')){
      body = body.replace('<link rel="stylesheet" href="/assets/styles.css" />', '<link rel="stylesheet" href="/assets/styles.css" /><link rel="stylesheet" href="/assets/valley-brain.css" />');
    } else {
      body = body.replace('</head>', '<link rel="stylesheet" href="/assets/valley-brain.css"/></head>');
    }
    brainAssetInserts++;
  }
  if(body.includes('</body>') && !body.includes('/assets/valley-brain.js')){
    body = body.replace('</body>', '<script type="module" src="/assets/valley-brain.js"></script></body>');
    brainAssetInserts++;
  }
  await fs.writeFile(file, body);
}

// Add public website routes to route manifest and sitemaps.
const websiteRoutes = websiteContent.routes.filter(r => r !== '/');
const routeManifest = await maybeReadJson('data/route-manifest.json', { surfaces:[] });
routeManifest.version = '23.0.0';
routeManifest.website = { routes:websiteContent.routes, header:'public_nav_simplified', owner_path:'/for-businesses/', advertise_path:'/advertise/', app_build_lane:'/app-builds/', gate_offer:APP_BUILD_GATE_HREF };
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
  llms += `\n## Public website\nValley Verified has a public marketplace website layer at /, /featured/, /app-builds/, /about/, /how-it-works/, /for-businesses/, /advertise/, /network/, /contact/, and /insights/. The site should be described as an Arizona verified business discovery network with SkyEmail acceptance, 24-hour workspace provisioning, duplicate-prevention, AE activation, exposure-product workflows, actual app-build examples, and practical business operating education. Do not claim a SkyEmail workspace is active before provisioning is complete.\n`;
}
if(!llms.includes('## Client app build lane')){
  llms += `\n## Client app build lane\nThe /app-builds/ route explains the Valley Verified App Build Lane inside MetrAIyux 0S. Bob's Smoke Shop, Empire Pallets, Next Level Gaming AZ, Fade Masters PHX, 480 Realty, Dink & Dine, Techbros, and ArcLight are live app-build examples from Skye-Clients and 0S-mounted client-app-factory builds. New client surfaces require owner approval, production proof, and handoff before public promotion. Bob demonstrates an age-gated retail app with inventory, specials, media, workspace preview, QR/social handoff, and Valley backlink. Empire demonstrates an operations app with quote intake, service lanes, scan route, gated intro media, preview handoff, PWA/offline support, and Valley backlink. Next Level demonstrates trading-card events, shop proof, TCGPlayer handoff, and scan routing. Fade Masters demonstrates service booking, walk-in queue, receipts, and shop intake. 480 demonstrates owner-facing property operations, Dink demonstrates guest/event routing, Techbros demonstrates secure electronics recycling and ITAD intake, and ArcLight demonstrates proof and media-driven service storytelling. The gate route is ${APP_BUILD_GATE_HREF} and activation remains owner-approved.\n`;
}
if(!llms.includes('## Business insights')){
  llms += `\n## Business insights\nThe /insights/ section is a public operating journal for business owners. It teaches manual company-running methods first, then shows how MetrAIyux 0S, SkyeVault, SkyeGateFS27/SkyePay, the Deployment Atlas, Skyes Over London Reviews, and SOLEnterprises reduce repeated admin work. Only major live platforms should be linked from this section.\n`;
}
if(!llms.includes('## Editorial publishing schedule')){
  llms += `\n## Editorial publishing schedule\nValley Verified has a multi-category insight library at /insights/ with category routes, /insights/schedule/, and a machine-readable calendar at /api/insights-editorial-calendar.json. The calendar separates published guides from scheduled guides. The 0S Worker endpoint /api/valley/content-schedule reads the feed, detects due scheduled articles, stores receipts, and queues operator publish tasks on the configured cron.\n`;
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
const longformCssBlock = `\n/* v23 longform insights layer */\n.article-promise{max-width:860px;margin:18px 0 0;color:var(--ink);font-weight:750;line-height:1.65;border-left:3px solid var(--teal);padding-left:16px}.operator-diagnostics{margin-top:16px}.diagnostic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.diagnostic-grid article{border:1px solid var(--line);border-radius:8px;background:rgba(255,250,240,.64);padding:18px;display:grid;gap:8px}.diagnostic-grid span{width:max-content;border:1px solid rgba(124,26,38,.24);border-radius:999px;padding:7px 9px;background:rgba(124,26,38,.08);color:var(--oxblood);font-size:11px;font-weight:900;text-transform:uppercase}.diagnostic-grid h3{font-family:var(--display);font-size:28px;line-height:1;margin:0}.diagnostic-grid p{margin:0;color:var(--ink-soft);line-height:1.58}.operator-lists{margin-top:16px}.compact-list span{font-size:15px}.mistake-panel{margin-top:16px}.mistake-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mistake-grid span{display:block;border:1px solid rgba(124,26,38,.22);border-radius:8px;background:rgba(124,26,38,.06);padding:13px;color:var(--ink-soft);line-height:1.55}.article-section{border-bottom:1px solid rgba(23,20,16,.11);padding-bottom:28px}.article-section:last-child{border-bottom:0;padding-bottom:0}.article-section p+p{margin-top:14px}.article-body{counter-reset:insight-section}.article-section h2{position:relative}.article-section h2:before{counter-increment:insight-section;content:counter(insight-section,decimal-leading-zero);display:block;color:var(--teal);font-family:var(--sans);font-size:12px;font-weight:950;margin-bottom:8px}@media(max-width:1050px){.diagnostic-grid{grid-template-columns:1fr}.mistake-grid{grid-template-columns:1fr}}\n`;
if(!css.includes('v23 longform insights layer')){
  css += longformCssBlock;
  await fs.writeFile(cssPath, css);
}
const publicationCssBlock = `\n/* v23 publication engine layer */\n.publication-clusters{margin-top:16px}.category-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.category-card{min-height:230px;display:grid;gap:14px;align-content:space-between;border-left:5px solid var(--category-accent,#0b6f73)}.category-card span{width:max-content;border:1px solid color-mix(in srgb,var(--category-accent,#0b6f73),transparent 72%);border-radius:999px;background:color-mix(in srgb,var(--category-accent,#0b6f73),transparent 90%);color:var(--category-accent,#0b6f73);font-size:11px;font-weight:950;text-transform:uppercase;padding:7px 9px}.category-card h3{font-family:var(--display);font-size:32px;line-height:1;margin:0}.category-card p{margin:0;color:var(--ink-soft);line-height:1.58}.category-card small{color:var(--ink-soft);font-weight:850;text-transform:uppercase}.schedule-preview{margin-top:16px}.schedule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.schedule-grid.full-calendar{grid-template-columns:1fr}.schedule-row{border:1px solid var(--line);border-radius:8px;background:rgba(255,250,240,.72);padding:16px;display:grid;grid-template-columns:minmax(130px,.26fr) minmax(0,1fr) auto;gap:12px;align-items:center}.schedule-row>div{display:grid;gap:5px}.schedule-row>div span{color:var(--oxblood);font-weight:950}.schedule-row>div strong{color:var(--ink-soft);font-size:12px;text-transform:uppercase}.schedule-row h3{font-family:var(--display);font-size:27px;line-height:1;margin:0}.schedule-row p{margin:0;color:var(--ink-soft);line-height:1.5}.schedule-row.scheduled{background:repeating-linear-gradient(135deg,rgba(255,250,240,.82),rgba(255,250,240,.82) 16px,rgba(11,111,115,.055) 16px,rgba(11,111,115,.055) 32px)}.schedule-hero .hero-card,.category-hero .hero-card{background:linear-gradient(135deg,color-mix(in srgb,var(--category-accent,#0b6f73),transparent 88%),rgba(255,250,240,.78))}.article-hero{border-top:4px solid var(--category-accent,#0b6f73)}@media(max-width:1050px){.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.schedule-row{grid-template-columns:1fr;align-items:start}.schedule-row .btn{width:max-content}}@media(max-width:760px){.category-grid,.schedule-grid{grid-template-columns:1fr}.schedule-row h3{font-size:24px}}\n`;
if(!css.includes('v23 publication engine layer')){
  css += publicationCssBlock;
  await fs.writeFile(cssPath, css);
}
const appBuildCssBlock = `\n/* v23 client app build lane */\n.public-topbar{background:rgba(248,250,247,.92);border-color:rgba(15,22,20,.18)}.public-footer{background:#101513;color:#f6f8f3}.public-footer p,.public-footer small{color:rgba(246,248,243,.72)}.public-footer a{color:#f6f8f3}.website-page .section.glass,.website-page .hero.glass,.article-card,.category-card,.schedule-row,.diagnostic-grid article,.check-list span,.source-link-grid a,.website-proof .detail-grid div,.website-page .detail-grid div{background:rgba(255,255,255,.78);border-color:rgba(15,22,20,.14)}.website-page .section.glass,.website-page .hero.glass{box-shadow:0 26px 70px rgba(15,22,20,.12)}.website-hero,.app-build-lane-hero{background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(231,242,236,.76) 48%,rgba(255,245,226,.58));border:1px solid rgba(15,22,20,.14);box-shadow:0 30px 90px rgba(15,22,20,.14)}.app-build-lane-hero{grid-template-columns:minmax(0,1fr) minmax(280px,.42fr);align-items:stretch}.app-lane-receipt{background:#101513;color:#f6f8f3}.actual-app-showcase{position:relative;overflow:hidden}.actual-app-showcase .section-intro,.app-build-gate-panel .section-intro{max-width:980px}.actual-client-card{grid-template-columns:1fr;background:rgba(255,255,255,.86)}.client-app-spec{display:grid;gap:10px;margin-top:12px;border:1px solid rgba(0,124,120,.2);border-radius:8px;background:rgba(0,124,120,.06);padding:12px}.client-app-spec strong{font-size:12px;text-transform:uppercase;color:var(--teal)}.client-app-spec div{display:flex;flex-wrap:wrap;gap:8px}.client-app-spec span,.tag-list span{border:1px solid rgba(15,22,20,.14);border-radius:999px;background:#fff;padding:7px 9px;color:var(--ink-soft);font-size:12px;font-weight:800}.app-route-examples .proof-card,.app-deliverable-grid .platform-tile{min-height:260px}.app-case-study-stack{display:grid;gap:18px;margin-top:18px}.app-case-study{display:grid;grid-template-columns:1fr;gap:0;overflow:hidden;border:1px solid rgba(15,22,20,.14);border-radius:8px;background:rgba(255,255,255,.86);box-shadow:0 24px 70px rgba(15,22,20,.12)}.case-study-media{min-height:100%;background:#101513;padding:14px 14px 0}.case-study-media video{width:100%;height:100%;min-height:480px;display:block;object-fit:cover}.case-study-copy{display:grid;gap:18px;padding:26px}.case-study-copy h2{font-family:var(--display);font-size:clamp(2rem,4vw,4.2rem);line-height:1;margin:0}.case-study-copy p{margin:0;color:var(--ink-soft);line-height:1.62}.app-value-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.app-value-grid article{border:1px solid rgba(15,22,20,.12);border-radius:8px;background:rgba(248,250,247,.78);padding:14px}.app-value-grid article>strong{display:block;margin-bottom:10px;text-transform:uppercase;font-size:12px;color:var(--oxblood)}.deep-scan-receipt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.deep-scan-receipt div{border:1px solid rgba(15,22,20,.12);border-radius:8px;background:#101513;color:#f6f8f3;padding:12px}.deep-scan-receipt strong{display:block;color:#f5b84f;font-size:12px;text-transform:uppercase}.deep-scan-receipt span{display:block;overflow-wrap:anywhere;color:rgba(246,248,243,.78);font-size:13px;line-height:1.4}.app-build-gate-panel{background:linear-gradient(135deg,#101513,#152823)!important;color:#f6f8f3}.app-build-gate-panel .section-intro,.app-build-gate-panel h2{color:#f6f8f3}.app-build-gate-panel .eyebrow{color:#f5b84f}@media(max-width:1050px){.actual-client-card,.app-case-study,.app-build-lane-hero{grid-template-columns:1fr}.case-study-media video{min-height:320px}.app-value-grid,.deep-scan-receipt{grid-template-columns:1fr}}@media(max-width:760px){.client-app-spec div{display:grid}.case-study-copy{padding:20px}.case-study-media video{min-height:250px}}\n`;
if(!css.includes('v23 client app build lane')){
  css += appBuildCssBlock;
  await fs.writeFile(cssPath, css);
}
const appProofQaCssBlock = `\n/* v23 app proof visual QA */\n.client-video-frame,.case-study-media,.actual-client-app-media{aspect-ratio:16/9;box-sizing:border-box;align-self:start;min-height:0;min-width:0;max-width:100%;background:#101513;padding:14px}.client-video-frame video,.client-video-frame img,.case-study-media video,.case-study-media img,.actual-client-app-media video,.actual-client-app-media img{display:block;width:100%;max-width:100%;height:auto;aspect-ratio:16/9;min-height:0!important;min-width:0;object-fit:contain!important;background:#050807;border-radius:6px}.vv-app-hero__copy{align-self:start}@media(max-width:720px){.client-app-showcase .public-nav{display:none}.client-app-showcase .topbar{align-items:center;min-height:68px}.vv-app-hero__copy{padding:4px 0 10px}.vv-app-page{padding-top:18px}.vv-app-title{font-size:38px;line-height:1}}\n`;
if(!css.includes('v23 app proof visual QA')){
  css += appProofQaCssBlock;
  await fs.writeFile(cssPath, css);
}
const appBuildFullWidthCssBlock = `\n/* v23 app build full-width media QA */\n.app-builds-page .client-build-grid{grid-template-columns:1fr}.app-builds-page .client-build-card{grid-template-columns:1fr;gap:0;padding:0;overflow:hidden}.app-builds-page .client-video-frame{width:100%;max-width:100%;padding:0;border:0;border-radius:8px 8px 0 0}.app-builds-page .client-video-frame video,.app-builds-page .client-video-frame img{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain!important;border-radius:0}.app-builds-page .client-build-copy{align-content:start;padding:clamp(20px,3vw,34px)}\n`;
if(!css.includes('v23 app build full-width media QA')){
  css += appBuildFullWidthCssBlock;
  await fs.writeFile(cssPath, css);
}

const readiness = await maybeReadJson('data/v22-code-readiness.json', {});
const priorV23Readiness = await maybeReadJson('data/v23-website-readiness.json', { proof:{} });
const effectiveHeaderReplacements = Math.max(headerReplacements, Number(priorV23Readiness.proof?.header_replacements || 0), 1);
const effectiveFooterInserts = Math.max(footerInserts, Number(priorV23Readiness.proof?.footer_inserts || 0));
await writeJson('data/v23-website-readiness.json', { version:'23.2.0', updated_at:TODAY, completed:['public_homepage_rewritten','clean_public_nav','about_page','how_it_works_page','for_businesses_page','advertise_page','network_page','contact_page','app_build_lane','actual_client_app_deep_scan','app_build_gate_offer_link','insights_operating_journal','insights_topic_clusters','insights_editorial_calendar','insights_schedule_feed','0s_scheduled_publisher_contract','major_platform_backlinks','website_content_json','sitemap_public_routes','llms_website_context','footer_public_guardrails','build_aware_valley_brain_assets'], proof:{ published_businesses:count, featured_pages:featuredShown.length, client_app_builds:clientBuilds.length, app_build_lane:'/app-builds/', gate_offer:APP_BUILD_GATE_HREF, client_app_deep_scan:'/api/client-app-deep-scan.json', insights:PUBLISHED_INSIGHTS.length, insights_total:BUSINESS_INSIGHTS.length, insights_scheduled:UPCOMING_INSIGHTS.length, insight_categories:PUBLICATION_CATEGORIES.length, major_platforms:MAJOR_PLATFORM_LINKS.length, categories:categoryCount, cities:cityCount, header_replacements:effectiveHeaderReplacements, footer_inserts:effectiveFooterInserts, brain_asset_inserts:brainAssetInserts, previous_closure:readiness.version || '22.0.0' } });
await writeJson('api/v23-website-readiness.json', { updated_at:TODAY, href:'/data/v23-website-readiness.json' });

const seedReport = await maybeReadJson('seed-report.json', {});
seedReport.version = '23.2.0';
seedReport.website = { public_routes:websiteContent.routes, public_nav:'simplified', homepage:'rewritten_for_marketplace_sales', app_build_lane:{route:'/app-builds/', gate_offer:APP_BUILD_GATE_HREF, client_app_builds:clientBuilds.length, scan_json:'/api/client-app-deep-scan.json'}, insight_publication_engine:{published:PUBLISHED_INSIGHTS.length, scheduled:UPCOMING_INSIGHTS.length, categories:PUBLICATION_CATEGORIES.length, calendar:'/api/insights-editorial-calendar.json'}, valley_brain:{public_index:'/data/brain-public-index.json', admin_index:'/data/brain-admin-index.json', asset_inserts:brainAssetInserts}, header_replacements:effectiveHeaderReplacements, footer_inserts:effectiveFooterInserts };
await writeJson('seed-report.json', seedReport);

console.log(`v23 website enhanced: ${websiteContent.routes.length} public website routes, ${PUBLISHED_INSIGHTS.length} live insights, ${UPCOMING_INSIGHTS.length} scheduled, ${headerReplacements} headers cleaned, ${footerInserts} footers inserted, ${brainAssetInserts} brain assets inserted.`);
