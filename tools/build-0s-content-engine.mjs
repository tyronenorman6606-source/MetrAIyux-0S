import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, "metraiyux_0s_site");
const metraBlogRoot = path.join(siteRoot, "blog");
const solRoot = path.join(siteRoot, "live", "sol_staffing_agency_site");
const generatedAt = "2026-05-17T00:00:00.000Z";
const updatedDate = "2026-05-17";

function surface(title, route, use) {
  return { title, route, use };
}

function metraArticle(data) {
  return {
    kind: data.kind || "post",
    date: updatedDate,
    ...data
  };
}

const metraiyuxArticles = [
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Why a 13-Cabinet Office Gives a Modern Staffing Company More Control",
    subtitle: "A longform operating model for turning staffing, sales, client success, compliance, finance, technology, and proof into one controlled business machine.",
    author: "Marcus Vale",
    category: "Operations Strategy",
    slug: "why-a-13-cabinet-office-gives-a-modern-staffing-company-more-control",
    topic: "cabinet-level operational control",
    audience: "founders, operators, and staffing leaders who need enterprise-level control before they have enterprise-level headcount",
    problem: "the business depends on scattered memory, heroic follow-up, and improvised handoffs instead of named ownership lanes",
    operatingMove: "divide the company into accountable executive rooms, give every signal a route, and make proof visible before the next buyer conversation",
    appWork: "a command room where the founder can open the cabinet dashboard, see which lane owns the work, and move from staffing to client success to quality without asking where the record lives",
    proofRule: "any public claim about capability should point to a dashboard, checklist, ledger, or receipt inside the 0S surface",
    marketingUse: "turn each cabinet into a pillar page, sales follow-up angle, internal SOP, and proof-led social post",
    surfaces: [
      surface("Cabinet Dashboards", "cabinet-dashboards/index.html", "Show the named executive functions and the operating lanes behind the company."),
      surface("Executive Rooms", "executive-rooms/index.html", "Open the working rooms that convert leadership roles into practical owner/operator surfaces."),
      surface("16 Brain Scope Matrix", "brain-governance/16-brain-scope-matrix.html", "Explain which brain owns each kind of request and where secondary review enters."),
      surface("Client OS Status Board", "client-os/status-board.html", "Tie cabinet control to client-facing delivery visibility."),
      surface("Candidate Placement Engine", "crown-os/candidate-placement-engine.html", "Connect staffing movement to structured placement operations.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "The Executive Command Cabinet: Founder Vision Without Operational Drift",
    subtitle: "How the founder office preserves doctrine, authority, and strategic direction while the operations layer executes without losing the original mission.",
    author: "Gray London Skyes",
    category: "Founder Doctrine",
    slug: "the-executive-command-cabinet-founder-vision-without-operational-drift",
    topic: "founder command and doctrine control",
    audience: "owners who need the company to move faster without turning every decision into a private memory test",
    problem: "the founder has the taste, risk tolerance, and strategic doctrine, but the team or system cannot reuse it without constant interruption",
    operatingMove: "turn founder judgment into visible rules, approval gates, override records, and command rhythms",
    appWork: "a founder office where doctrine, approvals, overrides, and strategic reviews live beside the operating rooms that execute them",
    proofRule: "strategic authority should be visible as a logged decision path, not hidden inside chat threads or undocumented instinct",
    marketingUse: "use the founder office as public proof that the product is built by an operator, not assembled from generic SaaS language",
    surfaces: [
      surface("Founder Office", "company/founder-office.html", "Make the founder role a first-class operating room instead of a biography page."),
      surface("Founder Approval Sheet", "member/founder-approval-sheet.html", "Show which decisions require explicit owner approval."),
      surface("Founder Override Ledger", "crown-os/founder-override-ledger.html", "Record exceptions and explain why a rule was overridden."),
      surface("Founder Command Override", "nexus/founder-command-override.html", "Route urgent override commands through the NEXUS layer."),
      surface("Weekly Cabinet Review", "crown-os/weekly-cabinet-review.html", "Turn founder doctrine into a recurring operating cadence.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Account Executives Need More Than Scripts: They Need an Operating System Behind Them",
    subtitle: "Why account executives close better when delivery, compliance, onboarding, finance, proof, and escalation are already organized behind the pitch.",
    author: "Celeste Monroe",
    category: "Revenue Operations",
    slug: "account-executives-need-more-than-scripts-they-need-an-operating-system-behind-them",
    topic: "AE sales enablement backed by real operations",
    audience: "sales leaders, account executives, and founders who need revenue conversations to survive delivery scrutiny",
    problem: "sales scripts create interest, but the deal stalls when the buyer asks how onboarding, proof, pricing, compliance, and escalation actually work",
    operatingMove: "give AEs a proof router, proposal lane, discovery surface, pricing narrative, and handoff sequence that keep promises inside the operating boundary",
    appWork: "a sales room where the AE can qualify the buyer, select the right proof route, build the proposal, and hand the account into client success without inventing the process",
    proofRule: "the AE should never promise a capability that cannot be opened, demonstrated, scoped, or routed inside 0S",
    marketingUse: "turn every sales objection into a blog excerpt, demo link, email sequence, and proof packet",
    surfaces: [
      surface("AE Command", "ae-command/index.html", "Give sellers a starting desk for sales rhythm and account ownership."),
      surface("Live Proof Router", "sales/live-proof-router.html", "Match buyer pain to the live proof surface that answers it."),
      surface("Discovery Call Room", "conversion/discovery-call.html", "Keep qualification tied to buyer readiness and next-step routing."),
      surface("Master Proposal Builder", "proposal-center/master-proposal-builder.html", "Convert the conversation into a scoped proposal path."),
      surface("Pricing Narrative Library", "proposal-center/pricing-narrative-library.html", "Keep pricing explanation consistent with margin and delivery rules.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Client Success as the Retention Engine of a Cabinet-Led Company",
    subtitle: "Why client success must own onboarding, relationship health, escalation, renewal protection, and service recovery in a serious operating model.",
    author: "Adrian Cross",
    category: "Client Success",
    slug: "client-success-as-the-retention-engine-of-a-cabinet-led-company",
    topic: "client success as a repeatable retention system",
    audience: "operators who need clients to feel cared for after the sales conversation ends",
    problem: "clients churn when onboarding, documentation, status, escalation, and renewal memory are split across people instead of one operating room",
    operatingMove: "put onboarding, health, document requests, status boards, escalation, and renewal review into a single client OS",
    appWork: "a client success layer where every account has visible next steps, document status, risk signals, and renewal preparation",
    proofRule: "retention claims should point to account health, handoff notes, escalation receipts, and renewal evidence",
    marketingUse: "turn support discipline into public trust content, client onboarding emails, renewal education, and service recovery playbooks",
    surfaces: [
      surface("Client OS", "client-os/index.html", "Open the client-facing operating layer for onboarding and account support."),
      surface("Onboarding Wizard", "client-os/onboarding-wizard.html", "Collect the practical details that keep a new account from becoming confusion."),
      surface("Escalation Desk", "client-os/escalation-desk.html", "Route service issues before they become silent churn."),
      surface("Renewal Review", "client-os/renewal-review.html", "Prepare retention conversations from proof instead of memory."),
      surface("Client Health Engine", "crown-os/client-health-engine.html", "Watch account health as an operating signal.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Finance Discipline for a Service Company That Wants to Scale",
    subtitle: "How billing, payroll coordination, margin visibility, pricing control, and budget review protect a staffing and operations company from growing into losses.",
    author: "Naomi Sterling",
    category: "Finance Operations",
    slug: "finance-discipline-for-a-service-company-that-wants-to-scale",
    topic: "finance controls for service company scale",
    audience: "owners and operators who want growth that survives margin, payroll, billing, and commission reality",
    problem: "the company can look busy while discounts, payroll timing, billing disputes, and poor margin controls quietly erase the upside",
    operatingMove: "connect pricing, commission, margin, revenue pulse, and KPI review to the same operating model the sales team uses",
    appWork: "a finance lane where sales freedom is bounded by approved pricing, visible margin, invoice discipline, and executive review",
    proofRule: "financial confidence should be attached to calculators, scoreboards, pricing notes, and human approval for exceptions",
    marketingUse: "use finance discipline as trust content for enterprise buyers who want a vendor that can stay stable after the contract starts",
    surfaces: [
      surface("Staffing Margin Calculator", "calculators/staffing-margin.html", "Model margin before the offer becomes a promise."),
      surface("AE Commission Calculator", "calculators/ae-commission.html", "Keep seller incentives understandable and controlled."),
      surface("Revenue Pulse Engine", "crown-os/revenue-pulse-engine.html", "Watch revenue movement as an operating signal."),
      surface("Executive KPI Scoreboard", "apex/executive-kpi-scoreboard.html", "Connect finance to leadership review."),
      surface("Pricing Narrative Library", "proposal-center/pricing-narrative-library.html", "Explain price without letting every seller invent the story.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Compliance Routing Without Pretending to Be a Law Firm",
    subtitle: "A practical governance article on coordinating compliance, contracts, insurance, records, and risk without making unauthorized legal claims.",
    author: "Julian Mercer",
    category: "Compliance & Risk",
    slug: "compliance-routing-without-pretending-to-be-a-law-firm",
    topic: "compliance routing with professional boundaries",
    audience: "service company leaders who need organized compliance posture without pretending software is legal counsel",
    problem: "teams mix contracts, insurance, employment questions, public claims, and risk decisions without a clear escalation path",
    operatingMove: "separate operational compliance routing from legal advice, keep policy pages visible, and require professional review where the stakes demand it",
    appWork: "a compliance watchtower that routes contracts, certification readiness, authority, policies, and risk into named review lanes",
    proofRule: "never publish legal certainty; publish routing, documentation, no-legal-advice boundaries, and professional escalation triggers",
    marketingUse: "turn responsible limits into trust content for procurement, enterprise, and public-sector buyers",
    surfaces: [
      surface("Certification Readiness", "certification-readiness/index.html", "Organize the records and posture needed before a certification conversation."),
      surface("Contract Center", "contracts/index.html", "Keep agreement work in a bounded operational room."),
      surface("Authority Matrix", "governance/authority-matrix.html", "Define who can approve what before the issue becomes urgent."),
      surface("No Legal Advice Policy", "policies/no-legal-advice.html", "Make the boundary public and clear."),
      surface("Compliance Watchtower", "crown-os/compliance-watchtower.html", "Route sensitive compliance signals into review.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Building a Workforce Engine Instead of a Resume Pile",
    subtitle: "How the staffing cabinet turns candidate intake, screening, onboarding, job orders, and placement readiness into a repeatable workforce system.",
    author: "Sienna Brooks",
    category: "Staffing Operations",
    slug: "building-a-workforce-engine-instead-of-a-resume-pile",
    topic: "candidate and placement operations",
    audience: "staffing founders and recruiters who want candidate movement to be trackable instead of anecdotal",
    problem: "the business collects resumes but cannot see readiness, missing documents, client fit, placement movement, or replacement risk",
    operatingMove: "treat candidate intake, onboarding, document requests, training, and placement as linked states inside one workforce engine",
    appWork: "a staffing room where recruiters can move from candidate intake to placement readiness, client documentation, and follow-up proof",
    proofRule: "staffing claims should be backed by candidate stages, onboarding records, placement notes, and client handoff visibility",
    marketingUse: "turn workforce discipline into employer education, candidate readiness content, recruiter training, and sales proof",
    surfaces: [
      surface("Candidate Hub", "candidates/index.html", "Give candidates and recruiters a clear operating entry point."),
      surface("Candidate Placement Engine", "crown-os/candidate-placement-engine.html", "Track placement movement as structured work."),
      surface("Recruiter Training Path", "training-academy/recruiter-training-path.html", "Train recruiters on the operating model."),
      surface("Document Request Center", "client-os/document-request-center.html", "Keep client and candidate documents from disappearing into email."),
      surface("Training Records Ledger", "training-academy/training-records-ledger.html", "Keep proof of training and readiness.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Technology Should Serve Operations, Not Distract From Them",
    subtitle: "How dashboards, local brains, AI tools, portals, and automation should support staffing and executive execution without becoming software theater.",
    author: "Orion Hayes",
    category: "Technology Systems",
    slug: "technology-should-serve-operations-not-distract-from-them",
    topic: "technology as operational infrastructure",
    audience: "owners evaluating AI, automation, dashboards, portals, and backend systems without wanting a science project",
    problem: "technical features become impressive demos that do not improve routing, accountability, status, or proof",
    operatingMove: "force every tool to answer a practical operating question: what enters, who owns it, what is blocked, what is logged, and what proof leaves",
    appWork: "a technology layer where automation, Cloudflare routing, local brains, and site operator scorecards support the operating rooms",
    proofRule: "technology claims should point to a working route, a visible state page, a receipt, or an operator runbook",
    marketingUse: "turn technical clarity into buyer trust, developer honesty, white-label enablement, and implementation content",
    surfaces: [
      surface("Automation Hub", "automation/index.html", "Map the automations to real business workflows."),
      surface("Admin Automation Brain", "admin/automation-brain.html", "Show the protected operator brain that coordinates automation."),
      surface("Cloudflare Command", "cloudflare/index.html", "Explain the lightweight backend layer that supports the site."),
      surface("Site Operator Scorecard", "nexus/site-operator-scorecard.html", "Measure the operator layer by useful business signals."),
      surface("Local Brain", "local-brain.html", "Keep knowledge retrieval close to the operating model.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Marketing a Serious Operations Company Without Overclaiming",
    subtitle: "How brand strategy, SEO, public bios, case studies, service pages, and capability statements can look premium while staying truthful.",
    author: "Valentina Reyes",
    category: "Brand Strategy",
    slug: "marketing-a-serious-operations-company-without-overclaiming",
    topic: "truthful marketing for operations-heavy companies",
    audience: "founders, marketers, and AEs who need authority content without fake certainty",
    problem: "the company needs to look capable, but generic claims create credibility risk when the buyer asks for proof",
    operatingMove: "connect every public claim to a proof sheet, content control page, buyer packet, case study, or app room that shows how the claim is supported",
    appWork: "a marketing control layer where site claims, capability packets, SEO pages, and proof exports share the same boundaries",
    proofRule: "if the site says useful, secure, ready, routed, tested, or enterprise-grade, the content should point to evidence or downgrade the claim",
    marketingUse: "turn the blog library into pillar pages, social posts, sales emails, landing pages, and proof-first public education",
    surfaces: [
      surface("Site Valuation", "admin/site-valuation.html", "Keep public value claims tied to the actual asset posture."),
      surface("Capability Packet", "conversion/capability-packet.html", "Give buyers a cleaner version of the company's proof story."),
      surface("Claims Proof Sheet", "proof-export/claims-proof-sheet.html", "Audit claims before they spread across public pages."),
      surface("Client-Facing Copy Rules", "launch/client-facing-copy-rules.html", "Keep marketing language controlled and usable."),
      surface("Site Content Control", "crown-os/site-content-control.html", "Route content edits through a governed surface.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Government and Enterprise Readiness Starts Before the First Bid",
    subtitle: "How a company prepares documentation, leadership model, capability language, vendor records, and delivery controls before pursuing larger opportunities.",
    author: "Donovan Pierce",
    category: "Contract Readiness",
    slug: "government-and-enterprise-readiness-starts-before-the-first-bid",
    topic: "government and enterprise readiness",
    audience: "owners pursuing procurement, prime contractors, enterprise departments, or public-sector conversations",
    problem: "the company starts outreach before capability statements, insurance, document rooms, proof, and authority controls are ready",
    operatingMove: "prepare the vendor posture, document room, capability packet, and proof ledger before the first formal ask",
    appWork: "a readiness room where government, enterprise, certification, documentation, and proof can be opened during sales or review",
    proofRule: "never claim certification, approval, or contracting readiness beyond what the records and professional reviews support",
    marketingUse: "turn readiness into buyer education, procurement follow-up, prime contractor content, and capability packet expansion",
    surfaces: [
      surface("Government Hub", "government/index.html", "Open the public-sector readiness lane."),
      surface("Government Document Room", "certification-readiness/government-document-room.html", "Organize documents before the buyer asks."),
      surface("Capability Packet", "conversion/capability-packet.html", "Package proof for buyers and partners."),
      surface("Vendor Readiness Checklist", "government/vendor-readiness-checklist.html", "Review readiness before outreach."),
      surface("Security Privacy Posture", "certification-readiness/security-privacy-posture.html", "Make sensitive posture claims with care.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Quality Assurance Is the Anti-Theater Layer of the Company",
    subtitle: "Why proof, audits, KPI discipline, completion checks, and corrective action systems protect leadership from fake readiness.",
    author: "Victor Saint",
    category: "Quality Assurance",
    slug: "quality-assurance-is-the-anti-theater-layer-of-the-company",
    topic: "proof-led quality assurance",
    audience: "operators who want completion, proof, and corrective action to be visible before buyers or clients find gaps",
    problem: "teams celebrate shipped work even when links break, claims are unsupported, handoffs are unclear, or delivery evidence is missing",
    operatingMove: "make QA a company layer: claim sheets, release receipts, crawler checks, link audits, handoff proof, and corrective action",
    appWork: "a proof export center that turns QA from a private opinion into a repeatable evidence workflow",
    proofRule: "a claim is not ready until the page, link, receipt, or test artifact can be opened and reviewed",
    marketingUse: "turn QA into trust content, buyer proof, launch checklists, and post-delivery confidence",
    surfaces: [
      surface("Proof Export Center", "proof-export/index.html", "Open the main proof and release evidence lane."),
      surface("Claims Proof Sheet", "proof-export/claims-proof-sheet.html", "Check public claims before they ship."),
      surface("Skye Crawler", "operator/skye-crawler.html", "Run crawler checks against the public surface."),
      surface("QA Matrix", "launch/qa-matrix.html", "Keep launch quality visible."),
      surface("Link Audit Receipt", "proof-export/link-audit-receipt.html", "Make link integrity part of proof.")
    ]
  }),
  metraArticle({
    collection: "Cabinet Doctrine",
    title: "Innovation That Does Not Break the Company",
    subtitle: "A disciplined approach to AI workflows, new services, automation, pilots, and expansion planning inside a cabinet-led organization.",
    author: "Amara Voss",
    category: "Expansion & Innovation",
    slug: "innovation-that-does-not-break-the-company",
    topic: "controlled innovation and expansion",
    audience: "founders who want new services, AI, branch models, and automation without destabilizing the core business",
    problem: "new ideas bypass readiness checks, confuse buyers, distract delivery, or create public claims the company cannot yet support",
    operatingMove: "route pilots through readiness, proof, training, branch planning, and founder approval before they become public offers",
    appWork: "an innovation lane where AI readiness, workflow proof, operator training, and branch expansion are reviewed before launch",
    proofRule: "innovation should ship as a controlled pilot with clear limits, receipts, and rollback logic",
    marketingUse: "turn innovation into founder updates, pilot diaries, expansion pages, and proof-first buyer education",
    surfaces: [
      surface("AI Readiness", "ai-readiness/index.html", "Evaluate AI posture before attaching it to business promises."),
      surface("Proof Collection Workflow", "automation/proof-collection-workflow.html", "Collect evidence while testing new workflows."),
      surface("Operator Training Simulations", "crown-os/operator-training-simulations.html", "Train the team before expansion touches clients."),
      surface("Branch Expansion", "branch-expansion/index.html", "Plan new markets with governance instead of instinct."),
      surface("Innovation Expansion Cabinet", "executive-rooms/amara-voss.html", "Anchor innovation in an accountable executive room.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "How a 13-Cabinet Company Should Sell to Enterprise Buyers",
    subtitle: "Enterprise buyers buy proof that a vendor can coordinate people, systems, risks, documents, and executive escalation without falling apart.",
    author: "Celeste Monroe",
    category: "Enterprise Sales",
    slug: "how-a-13-cabinet-company-should-sell-to-enterprise-buyers",
    topic: "enterprise sales using cabinet proof",
    audience: "AEs and founders selling into larger accounts, departments, primes, and enterprise operations teams",
    problem: "the pitch sounds ambitious, but the buyer cannot see how delivery, risk, escalation, documentation, and proof will be managed",
    operatingMove: "sell the operating model before selling the service: show the buyer the rooms, proof paths, and escalation design",
    appWork: "a buyer intelligence and deal room flow that lets the AE move from pain to proof to scope to executive review",
    proofRule: "enterprise claims should resolve to an actual room, packet, scoreboard, or proof router path",
    marketingUse: "turn enterprise objections into pillar posts, outbound sequences, executive briefs, and deal-room leave-behinds",
    surfaces: [
      surface("Buyer Intelligence Center", "ascension/buyer-intelligence-center.html", "Map buyer pain before choosing proof."),
      surface("Deal Room", "ascension/deal-room.html", "Give the buyer a serious room for materials and next steps."),
      surface("Enterprise Account Plans", "apex/enterprise-account-plans.html", "Turn target accounts into account-specific strategy."),
      surface("Live Proof Router", "sales/live-proof-router.html", "Send each buyer to the proof that fits their concern."),
      surface("Executive Briefing Room", "ascension/executive-briefing-room.html", "Prepare senior-level context before the meeting.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "Why Staffing Agencies Need an Operating System, Not Just Recruiters",
    subtitle: "A staffing company needs intake, scoring, client onboarding, proof receipts, retention review, and margin visibility around the recruiters doing the work.",
    author: "Sienna Brooks",
    category: "Staffing Growth",
    slug: "why-staffing-agencies-need-an-operating-system-not-just-recruiters",
    topic: "staffing agency operating systems",
    audience: "staffing agency owners who want recruiter output to become a company asset rather than a private hustle",
    problem: "recruiting activity is happening, but job orders, candidate stages, client onboarding, margin, and quality feedback do not connect",
    operatingMove: "wrap recruiters in a system that routes demand, scores readiness, tracks placement, and links client success to delivery quality",
    appWork: "a staffing OS where candidate movement, client onboarding, margin review, and placement proof live in connected rooms",
    proofRule: "staffing performance should be traceable through stages and receipts, not explained only by recruiter confidence",
    marketingUse: "turn the operating model into employer education, recruiter recruiting content, candidate trust content, and sales proof",
    surfaces: [
      surface("Candidate Hub", "candidates/index.html", "Create a structured entry point for candidate movement."),
      surface("Onboarding Wizard", "client-os/onboarding-wizard.html", "Turn new employer setup into a controlled workflow."),
      surface("Candidate Placement Engine", "crown-os/candidate-placement-engine.html", "Track candidate movement through placement."),
      surface("Staffing Margin Calculator", "calculators/staffing-margin.html", "Keep staffing decisions connected to margin reality."),
      surface("Client Health Engine", "crown-os/client-health-engine.html", "Watch whether placements support account retention.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "The Case for Lightweight Local Brains in Small Business Operations",
    subtitle: "A local brain can begin as scoped retrieval, clear doctrine, and cabinet-specific answer surfaces before any heavy model is connected.",
    author: "Orion Hayes",
    category: "AI Readiness",
    slug: "the-case-for-lightweight-local-brains-in-small-business-operations",
    topic: "local brains for business operations",
    audience: "owners who want AI help without giving an unbounded assistant authority over contracts, money, or public claims",
    problem: "AI gets sold as a magic operator when the safer first step is scoped knowledge, deterministic routing, freshness checks, and approval gates",
    operatingMove: "start with local retrieval, prompt rules, brain tests, freshness ledgers, and clear escalation before adding stronger inference",
    appWork: "a local brain surface that answers within doctrine and points the operator into the correct 0S room",
    proofRule: "AI usefulness should be proven by scoped answers, known limits, freshness records, and human approval paths",
    marketingUse: "turn technical honesty into trust posts, demo scripts, developer notes, and buyer education",
    surfaces: [
      surface("Local Brain", "local-brain.html", "Show the lightweight brain as an operator support surface."),
      surface("Prompt Library", "ai-readiness/prompt-library.html", "Keep prompts tied to real business lanes."),
      surface("Brain Test Battery", "brain-governance/brain-test-battery.html", "Test the brain before trusting the output."),
      surface("Knowledge Freshness Ledger", "ai-readiness/knowledge-freshness-ledger.html", "Track what the brain knows and when it needs updating."),
      surface("Public Brain Safety Rules", "brain-governance/public-brain-safety-rules.html", "Make AI boundaries public and clear.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "How to Prepare a Service Company for Government and Enterprise Conversations",
    subtitle: "Readiness starts before the bid, with capability statements, insurance, compliance routing, document rooms, proof ledgers, and sober claim control.",
    author: "Donovan Pierce",
    category: "Readiness Playbook",
    slug: "how-to-prepare-a-service-company-for-government-and-enterprise-conversations",
    topic: "service company procurement preparation",
    audience: "service company founders preparing for buyers who care about documentation, authority, delivery control, and risk",
    problem: "the company wants bigger conversations before the packet, contract boundaries, evidence, and document room are usable",
    operatingMove: "build the procurement posture before outreach: capability, compliance, SOW, evidence, insurance, and escalation",
    appWork: "a readiness sequence that moves from public capability to document room to scoped proposal to proof export",
    proofRule: "procurement readiness should be represented by organized records, not confidence",
    marketingUse: "turn the preparation steps into guides, checklists, lead magnets, partner emails, and procurement follow-up",
    surfaces: [
      surface("Capability Statement", "government/capability-statement.html", "Give buyers a concise and truthful capability view."),
      surface("Certification Matrix", "certification-readiness/certification-matrix.html", "Track readiness without overstating approval."),
      surface("SOW Builder", "contracts/sow-builder.html", "Scope the work before the promise hardens."),
      surface("Deployment Evidence Checklist", "proof-export/deployment-evidence-checklist.html", "Collect evidence that supports the public story."),
      surface("Professional Escalation", "certification-readiness/professional-escalation.html", "Know when to send a question to a qualified reviewer.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "Why Proof Receipts Matter for Founder-Led Companies",
    subtitle: "Founder-led companies move fast; proof receipts keep speed from turning into messy public claims or unsupported delivery promises.",
    author: "Victor Saint",
    category: "Proof Operations",
    slug: "why-proof-receipts-matter-for-founder-led-companies",
    topic: "proof receipts as growth infrastructure",
    audience: "founders who ship quickly and need a way to prove what changed, who approved it, and what is safe to say publicly",
    problem: "fast-moving work creates confidence faster than it creates evidence, which makes public claims, handoffs, and buyer updates risky",
    operatingMove: "make release receipts, claims sheets, handoff notes, and deployment ledgers part of every meaningful change",
    appWork: "a proof layer that lets the founder, AE, client success, and QA teams cite the same evidence",
    proofRule: "do not turn a private task into a public claim until the receipt exists and the claim sheet supports it",
    marketingUse: "convert receipts into launch notes, proof-led social posts, buyer follow-up, and case-study source material",
    surfaces: [
      surface("Release Receipt", "proof-export/release-receipt.html", "Record what changed and what proof exists."),
      surface("Claims Proof Sheet", "proof-export/claims-proof-sheet.html", "Tie public copy to supportable evidence."),
      surface("Agent Handoff Receipts", "nexus/agent-handoff-receipts.html", "Show how work moved between brains or operators."),
      surface("Deployment Ledger", "operator/deployment-ledger.html", "Keep deployment history visible."),
      surface("Proof Command Center", "crown-os/proof-command-center.html", "Centralize proof as an operating function.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "Building a Branch Expansion Model Without Losing Control",
    subtitle: "Branch expansion requires territory rules, local SEO, staffing workflows, branch P&L visibility, and governance boundaries before the new location becomes public.",
    author: "Amara Voss",
    category: "Branch Expansion",
    slug: "building-a-branch-expansion-model-without-losing-control",
    topic: "controlled branch expansion",
    audience: "owners planning new cities, territories, service lanes, or branch-level leadership",
    problem: "expansion creates new pages, people, offers, costs, and local promises before governance catches up",
    operatingMove: "launch branches with local entry checklists, SEO maps, P&L worksheets, territory ownership, and governance packets",
    appWork: "a branch room where market entry, local pages, financial visibility, and authority boundaries are reviewed together",
    proofRule: "do not announce a branch as ready until the local page, operating owner, budget, and proof packet are aligned",
    marketingUse: "turn each branch plan into local SEO content, buyer education, hiring material, and internal launch proof",
    surfaces: [
      surface("Branch Launch Blueprint", "branch-expansion/branch-launch-blueprint.html", "Plan a branch before making public promises."),
      surface("City Market Entry Checklist", "branch-expansion/city-market-entry-checklist.html", "Evaluate the local market and readiness signals."),
      surface("Local SEO Expansion Map", "branch-expansion/local-seo-expansion-map.html", "Turn expansion into controlled local content."),
      surface("Branch P&L Worksheet", "branch-expansion/branch-pl-worksheet.html", "Keep expansion tied to financial reality."),
      surface("Branch Governance Packet", "branch-expansion/branch-governance-packet.html", "Set authority boundaries before launch.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "How Account Executives Should Use Cabinet-Level Proof",
    subtitle: "AE teams close better when they can show how operations, finance, client success, staffing, technology, and quality assurance support delivery.",
    author: "Celeste Monroe",
    category: "Sales Enablement",
    slug: "how-account-executives-should-use-cabinet-level-proof",
    topic: "proof-led AE enablement",
    audience: "AEs who need to show why the company can deliver, not just what the company sells",
    problem: "sales conversations stay abstract because the AE cannot show the buyer where each operational concern is handled",
    operatingMove: "build the pitch around cabinet-level proof: route the objection to the room that owns it and keep the next step concrete",
    appWork: "a proof-led sales flow where discovery, router, email sequence, executive summary, and proposal language stay connected",
    proofRule: "the AE should not send an impressive statement without a proof link or a clear next-step room",
    marketingUse: "turn proof routes into objection handling, email sequences, sales scripts, and demo chapters",
    surfaces: [
      surface("Live Proof Router", "sales/live-proof-router.html", "Choose proof based on the buyer concern."),
      surface("AE Command", "ae-command/index.html", "Give the seller a daily operating desk."),
      surface("Email Sequence Library", "apex/email-sequence-library.html", "Turn the proof into follow-up sequences."),
      surface("Executive Summary Generator", "proposal-center/executive-summary-generator.html", "Convert buyer context into a serious summary."),
      surface("Proposal Autopilot", "crown-os/proposal-autopilot.html", "Route proposal work without losing approval boundaries.")
    ]
  }),
  metraArticle({
    collection: "APEX Growth",
    title: "A Practical 90-Day Launch Plan for a Cabinet-Based Operations Company",
    subtitle: "The first 90 days should move through proof cleanup, offer definition, AE launch, recruiting workflows, client OS, governance rhythm, and expansion planning.",
    author: "Marcus Vale",
    category: "Launch Plan",
    slug: "a-practical-90-day-launch-plan-for-a-cabinet-based-operations-company",
    topic: "90-day cabinet launch execution",
    audience: "founders who need the operating system to become a launch rhythm instead of a pile of pages",
    problem: "a large operating system can feel complete but unused if the first 90 days do not assign owners, proof, sales motion, and client workflows",
    operatingMove: "sequence the launch by month: proof cleanup, offer and sales activation, delivery rhythm, training, governance, and expansion review",
    appWork: "a launch command path that turns the 0S surface into weekly actions and visible receipts",
    proofRule: "each launch milestone should leave a receipt, checklist, or training record behind",
    marketingUse: "turn the launch into a public operating diary, sales countdown, investor update, and onboarding sequence",
    surfaces: [
      surface("Operator 90-Day Plan", "apex/operator-90-day-plan.html", "Anchor the launch in a time-boxed operator plan."),
      surface("Launch Checklist", "launch/launch-checklist.html", "Keep public readiness and internal readiness visible."),
      surface("Deployment Runbook", "operator/deployment-runbook.html", "Connect launch action to deployment discipline."),
      surface("Training Academy", "training-academy/index.html", "Train the people before expecting the system to hold."),
      surface("Crown Launch Checklist", "crown-os/crown-launch-checklist.html", "Tie launch status to Crown OS controls.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "Why the Site Operator Brain Is the Control Layer for MetrAIyux 0S Business Automation",
    subtitle: "A practical look at routing, receipts, approvals, and why the Site Operator Brain should coordinate instead of hallucinate authority.",
    author: "Orion Hayes",
    category: "Site Operator",
    slug: "site-operator-brain-autonomous-business",
    topic: "site operator control",
    audience: "operators who want automation to classify, route, and log work without pretending it owns the business",
    problem: "signals arrive from sales, clients, candidates, documents, and public pages, but no one knows which brain should own the next step",
    operatingMove: "make the Site Operator Brain the routing layer, not the final authority layer",
    appWork: "a NEXUS command lane where incoming signals become receipts, cabinet routing, secondary review, and approval prompts",
    proofRule: "automation should prove how it routed the work and where human authority entered",
    marketingUse: "turn the Site Operator Brain into a technical honesty story, sales demo path, and operating proof narrative",
    surfaces: [
      surface("Site Operator Scorecard", "nexus/site-operator-scorecard.html", "Evaluate the operator layer by routes and receipts."),
      surface("Business Inbox", "nexus/business-inbox.html", "Show where signals enter the business."),
      surface("Agent Handoff Receipts", "nexus/agent-handoff-receipts.html", "Make brain-to-brain movement visible."),
      surface("Admin Automation Brain", "admin/automation-brain.html", "Open the protected operator layer."),
      surface("Task Lifecycle Ledger", "crown-os/task-lifecycle-ledger.html", "Track work as it moves through ownership.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "Using Cloudflare Workers for a Lightweight Business Operating System",
    subtitle: "How Workers, D1, KV, and Queues can support state, routing, audit trails, and lightweight automation.",
    author: "Orion Hayes",
    category: "Cloudflare Architecture",
    slug: "cloudflare-workers-for-lightweight-business-os",
    topic: "Cloudflare-backed business OS architecture",
    audience: "technical buyers, builders, and operators who want useful infrastructure without enterprise bloat",
    problem: "small companies need state, routing, receipts, and protected actions, but a heavy custom backend can slow the whole launch",
    operatingMove: "use Workers for request routing, D1 for structured state, KV for lightweight ledgers, and queues where async work needs a lane",
    appWork: "a Cloudflare command layer that connects public pages, NEXUS routing, admin controls, and deployment evidence",
    proofRule: "backend claims should be paired with architecture pages, state views, runbooks, or deployment receipts",
    marketingUse: "turn lightweight architecture into developer trust content, white-label enablement, and implementation proof",
    surfaces: [
      surface("Cloudflare Command", "cloudflare/index.html", "Explain the Cloudflare layer in buyer-safe language."),
      surface("NEXUS Worker", "cloudflare/nexus-worker.html", "Show the worker lane for NEXUS automation."),
      surface("Cloudflare Deploy Checklist", "nexus/cloudflare-deploy-checklist.html", "Keep deployment steps concrete."),
      surface("Cloudflare State", "nexus/cloudflare-state.html", "Show what state the operating system tracks."),
      surface("Environment Provider Map", "operator/env-and-provider-map.html", "Make provider configuration visible to operators.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "Brain-to-Brain Routing for Cabinet-Structured Companies",
    subtitle: "Why each cabinet brain needs a clear lane, secondary review, and human approval gates.",
    author: "Marcus Vale",
    category: "Brain Routing",
    slug: "brain-to-brain-routing-for-cabinet-companies",
    topic: "brain-to-brain operating routes",
    audience: "teams using multiple functional brains or assistants inside a cabinet operating model",
    problem: "one brain receives a request that belongs to finance, compliance, client success, or founder authority, then answers too broadly",
    operatingMove: "make every brain state its lane, route outside-lane work, and preserve human gates for high-stakes decisions",
    appWork: "a brain mesh where primary and secondary review are visible before the operator acts",
    proofRule: "brain responses should show routing confidence, scope limits, and approval requirements",
    marketingUse: "turn the brain mesh into demo content, safety copy, internal training, and procurement confidence",
    surfaces: [
      surface("Brain Mesh", "nexus/brain-mesh.html", "Show how NEXUS connects the brains."),
      surface("Brain Escalation Router", "brain-governance/brain-escalation-router.html", "Route requests outside a brain's lane."),
      surface("Brain Command Matrix", "admin/brain-command-matrix.html", "Make brain ownership visible to the operator."),
      surface("16 Brain Scope Matrix", "brain-governance/16-brain-scope-matrix.html", "Define the scope of each brain."),
      surface("Brain Council Protocol", "crown-os/brain-council-protocol.html", "Coordinate multi-brain review.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "Autonomous Operations Without Fake Autonomy",
    subtitle: "The difference between routing and execution, and why disciplined boundaries make the system more sellable.",
    author: "Julian Mercer",
    category: "Autonomy Policy",
    slug: "autonomous-ops-without-fake-autonomy",
    topic: "bounded autonomy",
    audience: "buyers and operators who want automation support but do not want uncontrolled contracts, money movement, hiring, or public claims",
    problem: "automation language creates fear when it sounds like the system can act without authority or review",
    operatingMove: "separate routing, recommendation, drafting, execution, and approval into distinct stages",
    appWork: "an autonomy policy layer where risky categories stay human-controlled and routine routing stays fast",
    proofRule: "autonomy claims should name what the system can do, what it cannot do, and where approval gates stop it",
    marketingUse: "turn boundaries into trust copy, buyer FAQs, sales objections, and compliance-ready explanations",
    surfaces: [
      surface("Autonomy Policy", "nexus/autonomy-policy.html", "Define what automation can and cannot do."),
      surface("Autonomy Boundary Charter", "crown-os/autonomy-boundary-charter.html", "Make the boundary a company rule."),
      surface("Human Approval Gates", "crown-os/human-approval-gates.html", "Show the categories that require review."),
      surface("Approval Queue", "admin/approval-queue.html", "Route sensitive actions to approval."),
      surface("Risk Register", "admin/risk-register.html", "Track risk as an operating object.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "Proof Receipts as Business Infrastructure",
    subtitle: "How release receipts, claim sheets, and routing ledgers protect credibility during growth.",
    author: "Victor Saint",
    category: "Proof Infrastructure",
    slug: "proof-receipts-as-business-infrastructure",
    topic: "receipts as infrastructure",
    audience: "founders, QA leads, AEs, and client success operators who need shared evidence",
    problem: "the company ships work, but the evidence is scattered across screenshots, memory, chat messages, and private folders",
    operatingMove: "treat receipts like infrastructure: create them when work moves, attach them to claims, and reuse them across sales and delivery",
    appWork: "a receipt layer that connects NEXUS handoffs, proof export, release records, and deployment ledgers",
    proofRule: "the receipt is the source of truth for what was done, what was checked, and what can be said",
    marketingUse: "turn receipts into case-study notes, launch proof, buyer updates, and content engine source material",
    surfaces: [
      surface("Agent Handoff Receipts", "nexus/agent-handoff-receipts.html", "Record how work moved between agents or brains."),
      surface("Proof Export Center", "proof-export/index.html", "Centralize buyer-safe evidence."),
      surface("Release Receipt", "proof-export/release-receipt.html", "Document shipped changes."),
      surface("Deployment Ledger", "operator/deployment-ledger.html", "Track deployments over time."),
      surface("Claims Proof Sheet", "proof-export/claims-proof-sheet.html", "Connect public copy to evidence.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "CRM Records Inside a Static Site",
    subtitle: "How browser-local records can support demos, intake, exports, and early operating workflows before a backend is connected.",
    author: "Adrian Cross",
    category: "CRM Workflow",
    slug: "crm-records-inside-a-static-site",
    topic: "static-site CRM records",
    audience: "builders and operators who need a useful prototype or early workflow before the database is fully wired",
    problem: "early sales and intake workflows need records, but waiting for a full CRM backend can block demo value and internal training",
    operatingMove: "use browser-local records as a disciplined preview layer while keeping export, handoff, and backend migration paths clear",
    appWork: "a CRM records surface that lets users test intake, view demo records, export data, and understand the future workflow",
    proofRule: "preview records must be labeled honestly and should never be presented as production persistence without the backend connected",
    marketingUse: "turn the preview workflow into demo content, onboarding education, and white-label implementation notes",
    surfaces: [
      surface("CRM Records", "nexus/crm-records.html", "Show browser-local records and export paths."),
      surface("Document Request Center", "client-os/document-request-center.html", "Connect records to document follow-up."),
      surface("Partnership Intake", "conversion/partnership-intake.html", "Route new partner conversations into a usable record."),
      surface("Client Handoff Packet", "downloads/client-handoff-packet.html", "Package handoff details after intake."),
      surface("Business Inbox", "nexus/business-inbox.html", "Show how new signals enter the operating layer.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "Approval Gates for AI-Operated Companies",
    subtitle: "The categories that must stay human-controlled: money, authority, contracts, public claims, personnel, and legal posture.",
    author: "Julian Mercer",
    category: "Approval Gates",
    slug: "approval-gates-for-ai-operated-companies",
    topic: "approval gates for AI operations",
    audience: "operators, buyers, and reviewers evaluating whether AI-assisted operations can be trusted",
    problem: "AI workflows become dangerous when they draft, route, publish, spend, or commit without a human gate",
    operatingMove: "define blocked categories, approval inboxes, risk records, delegation rules, and escalation notes before automation goes live",
    appWork: "an approval system where high-stakes categories stop until a human owner reviews and records the decision",
    proofRule: "approval gates should be structural, visible, and tied to receipts, not buried in a prompt",
    marketingUse: "turn approval discipline into trust pages, sales FAQs, procurement reassurance, and operator training",
    surfaces: [
      surface("NEXUS Human Approval Gates", "nexus/human-approval-gates.html", "Show the NEXUS gate categories."),
      surface("Approval Inbox", "admin/approval-inbox.html", "Open the human review lane."),
      surface("Risk Register", "admin/risk-register.html", "Track sensitive categories and unresolved risk."),
      surface("Delegation Ledger", "governance/delegation-ledger.html", "Record who can approve what."),
      surface("Human Approval Gates", "crown-os/human-approval-gates.html", "Mirror the approval rule inside Crown OS.")
    ]
  }),
  metraArticle({
    kind: "nexus",
    collection: "NEXUS Automation",
    title: "From Staffing Agency to MetrAIyux 0S",
    subtitle: "How a staffing company can evolve into a command-structured operating platform without overclaiming readiness.",
    author: "Gray London Skyes",
    category: "Operating Model",
    slug: "from-staffing-agency-to-autonomous-business-os",
    topic: "staffing agency evolution into a business OS",
    audience: "owners who see the staffing business as the first lane of a larger operating platform",
    problem: "the company wants to move beyond recruiting, but the public story jumps too far ahead of the operating proof",
    operatingMove: "evolve in layers: staffing operations, client OS, NEXUS routing, Crown controls, proof export, and enterprise sales",
    appWork: "a complete path from staffing workflow to autonomous-business command surface, with claims kept inside the evidence",
    proofRule: "call the system autonomous only where routing, receipts, state, and approvals are actually visible",
    marketingUse: "turn the evolution story into founder narrative, investor education, buyer proof, and website pillar content",
    surfaces: [
      surface("Autonomous Business", "autonomous-business/index.html", "Frame the operating system beyond one staffing lane."),
      surface("Crown OS", "crown-os/index.html", "Show the command layer for recurring operations."),
      surface("NEXUS OS", "nexus/index.html", "Open the automation and routing layer."),
      surface("Live Proof Router", "sales/live-proof-router.html", "Let sales choose the right proof route."),
      surface("Client OS", "client-os/index.html", "Keep client delivery visible as the platform expands.")
    ]
  })
];

function solArticle(data) {
  return { date: updatedDate, ...data };
}

const solArticles = [
  solArticle({
    title: "Temporary Staffing Guide: How Employers Can Use Flexible Labor Without Creating Chaos",
    category: "Employer Guide",
    file: "blog-temp-staffing-guide.html",
    description: "A longform guide to temporary staffing, job orders, role intake, workforce planning, screening, and avoiding common hiring mistakes.",
    audience: "employers who need flexible labor without losing control of schedule, quality, or onboarding",
    problem: "temporary staffing becomes chaotic when the role, shift, supervisor, pay range, safety requirements, and start process are not defined before recruiting begins",
    workflow: "move from employer intake to recruiter desk to placement tracking, then into quality control after the worker starts",
    conversion: "request staff with a complete role intake rather than sending a vague staffing request",
    surfaces: [
      surface("Employer Services", "employers.html", "Start from the employer-facing staffing lane."),
      surface("Employer Portal", "employer-portal.html", "Collect role details and operating contacts."),
      surface("Recruiter Desk", "recruiter-desk.html", "Turn the job order into recruiting action."),
      surface("Placement Tracker", "placement-tracker.html", "Track candidate movement through placement."),
      surface("Contact Hub", "contact.html", "Route the request into the staffing team.")
    ]
  }),
  solArticle({
    title: "Temp-to-Hire vs. Direct Hire: Choosing the Right Staffing Model",
    category: "Employer Guide",
    file: "blog-temp-to-hire-vs-direct-hire.html",
    description: "A detailed employer guide comparing temp-to-hire and direct-hire staffing models.",
    audience: "employers deciding whether a role should be trial-based, immediate permanent hire, project-based, or recurring temp support",
    problem: "companies choose the staffing model based on habit instead of risk, urgency, budget, ramp time, and retention goals",
    workflow: "use employer services, pricing, agreement packet, and proposal builder to align the model before the search starts",
    conversion: "ask for a staffing model review before opening a role",
    surfaces: [
      surface("Employer Services", "employers.html", "Compare staffing support lanes."),
      surface("Pricing", "pricing.html", "Understand cost and billing implications."),
      surface("Agreement Packet", "agreement-packet.html", "Clarify terms before work begins."),
      surface("Proposal Builder", "proposal-builder.html", "Turn the chosen model into a scoped proposal."),
      surface("Contact Hub", "contact.html", "Ask for a staffing model review.")
    ]
  }),
  solArticle({
    title: "Government Contracting for Staffing Agencies: What to Prepare Before Pursuing Agencies and Primes",
    category: "Government Contracting",
    file: "blog-government-contracting-staffing.html",
    description: "A longform guide for staffing agencies preparing for government contracting, SAM registration, NAICS, capability statements, and responsible performance.",
    audience: "staffing operators preparing for agencies, primes, public-sector programs, or subcontractor conversations",
    problem: "public-sector staffing conversations fail when capability language, documentation, insurance, compliance posture, and performance controls are not ready",
    workflow: "move from government overview to capability statement, procurement packet, contract vehicles, and compliance posture before outreach",
    conversion: "prepare a procurement-ready staffing packet before chasing bids",
    surfaces: [
      surface("Government Hub", "government.html", "Open the public-sector staffing lane."),
      surface("Capability Statement", "capability-statement.html", "Package staffing capability for buyers."),
      surface("Contract Vehicles", "contract-vehicles.html", "Clarify how public-sector work can be pursued."),
      surface("Procurement Packet", "procurement-packet.html", "Organize documents and buyer materials."),
      surface("Compliance Posture", "compliance-posture.html", "Keep claims bounded and organized.")
    ]
  }),
  solArticle({
    title: "How to Build a Staffing Agency Capability Statement That Government Buyers Can Actually Read",
    category: "Government Contracting",
    file: "blog-capability-statement.html",
    description: "A practical guide to capability statements for staffing, recruiting, administrative support, and public-sector workforce operations.",
    audience: "staffing agencies and subcontractors that need a clear one-page buyer-ready capability statement",
    problem: "capability statements often read like generic brochures instead of concise procurement documents with service lanes, differentiators, codes, and contacts",
    workflow: "use the capability statement page with procurement packet, vendor packet, and opportunity review to keep the document useful",
    conversion: "send a capability statement that routes the buyer to the right next conversation",
    surfaces: [
      surface("Capability Statement", "capability-statement.html", "Build the buyer-facing document."),
      surface("Procurement Packet", "procurement-packet.html", "Attach supporting records and links."),
      surface("Government Opportunities", "government-opportunities.html", "Connect capability to opportunity review."),
      surface("Vendor Packet", "vendor-packet.html", "Package vendor details for partners."),
      surface("Government Hub", "government.html", "Keep the public-sector lane clear.")
    ]
  }),
  solArticle({
    title: "AE Staffing Sales Playbook: How Account Executives Open Employer Accounts",
    category: "AE Sales",
    file: "blog-ae-staffing-sales-playbook.html",
    description: "A staffing sales guide for Account Executives prospecting employers and qualifying job orders.",
    audience: "AEs responsible for opening staffing accounts and turning employer pain into qualified demand",
    problem: "sales activity creates conversations, but weak qualification and poor follow-up stop the AE from producing usable job orders",
    workflow: "move from AE command to sales scripts, email sequences, CRM pipeline, and proposal builder",
    conversion: "book a discovery call with a qualified staffing need and a clear next step",
    surfaces: [
      surface("AE Command", "ae-command.html", "Give the AE a sales operating surface."),
      surface("Sales Scripts", "sales-scripts.html", "Keep outreach grounded in useful questions."),
      surface("Email Sequences", "email-sequences.html", "Follow up without losing context."),
      surface("CRM Pipeline", "crm-pipeline.html", "Track employer movement from lead to repeat order."),
      surface("Proposal Builder", "proposal-builder.html", "Turn demand into a scoped offer.")
    ]
  }),
  solArticle({
    title: "Candidate Readiness Guide: How Workers Can Get Placed Faster",
    category: "Candidate Guide",
    file: "blog-candidate-readiness.html",
    description: "A candidate-facing guide covering availability, communication, experience proof, documents, and role fit.",
    audience: "workers who want faster placement and fewer avoidable delays",
    problem: "candidates lose opportunities when availability, documents, experience proof, transportation, and communication are unclear",
    workflow: "move from candidate hub to application, onboarding, jobs, and recruiter follow-up",
    conversion: "complete the candidate application with readiness details before applying to roles",
    surfaces: [
      surface("Candidates", "candidates.html", "Start from the candidate-facing lane."),
      surface("Candidate Application", "candidate-application.html", "Collect readiness information."),
      surface("Candidate Onboarding", "candidate-onboarding.html", "Prepare documents and next steps."),
      surface("Jobs", "jobs.html", "Match readiness to open roles."),
      surface("Recruiter Desk", "recruiter-desk.html", "Connect candidate readiness to recruiter action.")
    ]
  }),
  solArticle({
    title: "Staffing for Local Government and Municipal Programs: Practical Support Lanes",
    category: "Government Contracting",
    file: "blog-staffing-for-local-government.html",
    description: "Longform article about staffing support for municipalities, local agencies, public programs, and prime contractors.",
    audience: "municipal teams, primes, and staffing operators planning public-program workforce support",
    problem: "local government staffing needs are often urgent, document-heavy, and coordination-heavy, which makes casual staffing promises risky",
    workflow: "connect government staffing support to procurement packet, contract vehicles, capability statement, and compliance posture",
    conversion: "open a public-sector staffing conversation with clear support lanes and documentation",
    surfaces: [
      surface("Government Hub", "government.html", "Open public-sector staffing support."),
      surface("Government Staff Augmentation", "government-staff-augmentation.html", "Describe public-sector support lanes."),
      surface("Contract Vehicles", "contract-vehicles.html", "Clarify route-to-contract options."),
      surface("Procurement Packet", "procurement-packet.html", "Package buyer-facing materials."),
      surface("Capability Statement", "capability-statement.html", "Show staffing capability clearly.")
    ]
  }),
  solArticle({
    title: "Staffing Agency Compliance Basics: What to Get Organized Before Scaling",
    category: "Operations",
    file: "blog-staffing-agency-compliance-basics.html",
    description: "A practical staffing compliance overview for documentation, payroll, worker classification, onboarding, insurance, contracts, and quality control.",
    audience: "staffing agency operators who need growth without sloppy risk",
    problem: "staffing volume exposes weak documentation, onboarding, insurance, agreements, payroll coordination, and incident follow-up",
    workflow: "use compliance posture, risk register, agreement packet, and quality control plan before scaling demand",
    conversion: "review compliance basics before opening new employer accounts or public-sector lanes",
    surfaces: [
      surface("Compliance Posture", "compliance-posture.html", "Frame operational compliance boundaries."),
      surface("Risk Register", "risk-register.html", "Track issues before they become account damage."),
      surface("Agreement Packet", "agreement-packet.html", "Clarify terms before placements."),
      surface("Quality Control Plan", "quality-control-plan.html", "Protect delivery after placement."),
      surface("Operations Hub", "operations-hub.html", "Keep staffing operations connected.")
    ]
  }),
  solArticle({
    title: "How to Write a Staffing Job Order That Recruiters Can Actually Fill",
    category: "Employer Guide",
    file: "blog-how-to-write-job-order.html",
    description: "A practical guide to writing complete job orders that improve staffing speed and candidate fit.",
    audience: "employers and AEs who need recruiters to act on complete role details",
    problem: "a vague job order wastes recruiting time and creates candidate mismatch",
    workflow: "collect the employer need, turn it into recruiter instructions, and keep placement tracking visible",
    conversion: "start a staffing request with pay, schedule, location, duties, must-haves, and decision path",
    surfaces: [
      surface("Employer Services", "employers.html", "Begin the employer request path."),
      surface("Employer Portal", "employer-portal.html", "Capture complete job order details."),
      surface("Recruiter Desk", "recruiter-desk.html", "Translate the order into recruiting work."),
      surface("Placement Tracker", "placement-tracker.html", "Watch candidate movement against the order."),
      surface("Contact Hub", "contact.html", "Submit a request with useful details.")
    ]
  }),
  solArticle({
    title: "How Prime Contractors Can Use Staffing Partners for Public-Sector Work",
    category: "Government Contracting",
    file: "blog-prime-contractor-staffing-support.html",
    description: "A guide for prime contractors using staffing partners for surge capacity, administrative support, and workforce coordination.",
    audience: "prime contractors that need staffing support without adding unmanaged subcontractor risk",
    problem: "prime teams need flexible capacity, but staffing partners must still show capability, compliance posture, contact discipline, and delivery controls",
    workflow: "connect prime support campaign pages to government hub, procurement packet, and capability statement",
    conversion: "invite primes to review the staffing support packet before an urgent need hits",
    surfaces: [
      surface("Government Hub", "government.html", "Open the public-sector support lane."),
      surface("Prime Support Campaign", "campaign-prime-support.html", "Use a campaign page for prime contractor outreach."),
      surface("Procurement Packet", "procurement-packet.html", "Package the documents a prime needs."),
      surface("Capability Statement", "capability-statement.html", "Show support lanes in a concise format."),
      surface("Vendor Packet", "vendor-packet.html", "Prepare partner-facing vendor details.")
    ]
  }),
  solArticle({
    title: "Quality Control for Staffing Agencies: How to Protect Accounts After the Placement",
    category: "Operations",
    file: "blog-staffing-agency-quality-control.html",
    description: "A longform guide to staffing quality control, feedback loops, replacements, attendance issues, and account protection.",
    audience: "staffing operators who know the account is won after the worker starts, not when the candidate accepts",
    problem: "placements fail quietly when attendance, supervisor feedback, replacement planning, and issue escalation are not tracked",
    workflow: "use the quality control plan, placement tracker, operations hub, and employer services to protect account health",
    conversion: "make quality control part of the staffing offer before the first start date",
    surfaces: [
      surface("Quality Control Plan", "quality-control-plan.html", "Define post-placement review steps."),
      surface("Placement Tracker", "placement-tracker.html", "Track worker movement and issues."),
      surface("Operations Hub", "operations-hub.html", "Keep delivery operations connected."),
      surface("Employer Services", "employers.html", "Set employer expectations before the start."),
      surface("Risk Register", "risk-register.html", "Record recurring account risks.")
    ]
  }),
  solArticle({
    title: "Arizona Staffing Strategy: Serving Phoenix, Glendale, Mesa, Tempe, and Scottsdale Employers",
    category: "Local SEO",
    file: "blog-arizona-staffing-market.html",
    description: "A local SEO staffing guide for Arizona employers seeking flexible labor and workforce support.",
    audience: "Arizona employers comparing local staffing support across Phoenix-area markets",
    problem: "local staffing content becomes generic when it does not connect market pages to actual service lanes and request paths",
    workflow: "use service area pages with city pages, employer services, and campaign pages to route local demand",
    conversion: "send local employers to the right city page and staffing request lane",
    surfaces: [
      surface("Service Areas", "service-areas.html", "Show the local market map."),
      surface("Phoenix Staffing", "phoenix-staffing-agency.html", "Route Phoenix employer demand."),
      surface("Glendale Staffing", "glendale-staffing-agency.html", "Route Glendale employer demand."),
      surface("Mesa Staffing", "mesa-staffing-agency.html", "Route Mesa employer demand."),
      surface("Tempe Staffing", "tempe-staffing-agency.html", "Route Tempe employer demand."),
      surface("Scottsdale Staffing", "scottsdale-staffing-agency.html", "Route Scottsdale employer demand.")
    ]
  }),
  solArticle({
    title: "Client Onboarding for Staffing Agencies: How to Start Accounts Without Confusion",
    category: "Operations",
    file: "blog-staffing-client-onboarding.html",
    description: "A practical guide to onboarding new staffing clients with clear expectations, agreements, contacts, timesheets, and start instructions.",
    audience: "staffing teams turning a sold account into a working delivery relationship",
    problem: "new clients get frustrated when contacts, billing rules, timesheet approvals, start instructions, and replacement expectations are unclear",
    workflow: "move from welcome packet to employer portal, agreement packet, timesheet control, and contact hub",
    conversion: "send a new client through a clean welcome packet before recruiting starts",
    surfaces: [
      surface("Client Welcome Packet", "client-welcome-packet.html", "Set onboarding expectations."),
      surface("Employer Portal", "employer-portal.html", "Collect account details."),
      surface("Agreement Packet", "agreement-packet.html", "Clarify terms and approvals."),
      surface("Timesheet Invoice Control", "timesheet-invoice-control.html", "Set billing and approval paths."),
      surface("Contact Hub", "contact.html", "Route onboarding questions.")
    ]
  }),
  solArticle({
    title: "Timesheets and Invoices in Staffing: Why Approval Workflow Matters",
    category: "Operations",
    file: "blog-staffing-timesheets-invoices.html",
    description: "A guide to staffing timesheet approval, invoice discipline, billing contacts, disputes, and account controls.",
    audience: "employers, staffing operators, and finance owners who need cleaner billing control",
    problem: "timesheet confusion creates invoice disputes, payroll stress, margin leakage, and client frustration",
    workflow: "connect timesheet invoice control to bill-rate calculator, admin dashboard, and risk register",
    conversion: "define approval workflow before the first invoice is issued",
    surfaces: [
      surface("Timesheet Invoice Control", "timesheet-invoice-control.html", "Define approval and invoice flow."),
      surface("Bill Rate Calculator", "bill-rate-calculator.html", "Keep pricing tied to billing reality."),
      surface("Admin Dashboard", "admin-dashboard.html", "Review account and operations status."),
      surface("Risk Register", "risk-register.html", "Track disputes and recurring risk."),
      surface("Pricing", "pricing.html", "Keep billing expectations clear.")
    ]
  }),
  solArticle({
    title: "Government Contracting Go/No-Go: When a Staffing Agency Should Bid or Walk Away",
    category: "Government Contracting",
    file: "blog-government-go-no-go.html",
    description: "A go/no-go framework for staffing agencies reviewing solicitations, prime opportunities, and public-sector scopes.",
    audience: "staffing leaders reviewing public-sector opportunities and prime contractor requests",
    problem: "teams chase bids that do not fit their staffing lane, documentation posture, pricing discipline, or delivery capacity",
    workflow: "connect opportunity review to risk register, procurement packet, brain command, and government hub",
    conversion: "run a go/no-go review before spending time on the response",
    surfaces: [
      surface("Government Opportunities", "government-opportunities.html", "Review opportunity fit."),
      surface("Risk Register", "risk-register.html", "Capture bid and delivery risks."),
      surface("Procurement Packet", "procurement-packet.html", "Check whether materials are ready."),
      surface("Brain Command", "brain-command.html", "Route the decision through operating judgment."),
      surface("Government Hub", "government.html", "Keep public-sector work in its lane.")
    ]
  }),
  solArticle({
    title: "AE Lead Qualification: How to Separate Real Staffing Opportunities from Noise",
    category: "AE Sales",
    file: "blog-ae-lead-qualification.html",
    description: "A sales enablement article for staffing Account Executives qualifying employer demand.",
    audience: "AEs who need to know which employer leads deserve recruiting attention",
    problem: "unqualified leads waste recruiter time because urgency, budget, decision authority, role clarity, and hiring path were never confirmed",
    workflow: "use AE command, CRM pipeline, sales scripts, and contact routing to qualify before recruiting",
    conversion: "turn noisy interest into a qualified staffing request or a clear no-fit",
    surfaces: [
      surface("AE Command", "ae-command.html", "Run the lead from the AE desk."),
      surface("CRM Pipeline", "crm-pipeline.html", "Track qualification stage."),
      surface("Sales Scripts", "sales-scripts.html", "Ask the right questions."),
      surface("Contact Hub", "contact.html", "Route qualified demand."),
      surface("Email Sequences", "email-sequences.html", "Follow up with useful next steps.")
    ]
  }),
  solArticle({
    title: "Staffing CRM Pipeline: How to Track Employer Accounts From Lead to Repeat Order",
    category: "Sales Ops",
    file: "blog-staffing-crm-pipeline.html",
    description: "A practical guide to tracking staffing accounts through prospecting, qualification, proposal, agreement, delivery, and repeat business.",
    audience: "sales and operations teams that want employer account movement to be visible",
    problem: "accounts stall when lead source, qualification, job orders, proposals, agreements, delivery notes, and repeat-order timing are not tracked",
    workflow: "connect CRM pipeline to AE command, email sequences, employer portal, and proposal builder",
    conversion: "use the CRM pipeline as the source of truth for employer account movement",
    surfaces: [
      surface("CRM Pipeline", "crm-pipeline.html", "Track employer account stages."),
      surface("AE Command", "ae-command.html", "Give sales a daily operating desk."),
      surface("Email Sequences", "email-sequences.html", "Keep follow-up consistent."),
      surface("Employer Portal", "employer-portal.html", "Collect account and role details."),
      surface("Proposal Builder", "proposal-builder.html", "Convert qualified demand into an offer.")
    ]
  }),
  solArticle({
    title: "Placement Tracking: Why Staffing Agencies Need Candidate Movement Logs",
    category: "Delivery Ops",
    file: "blog-placement-tracking.html",
    description: "A guide to tracking candidate stages from screening to start, replacement, and completion.",
    audience: "recruiters and operators who need placement status to be visible across the team",
    problem: "candidate movement becomes invisible when screening, submission, interview, offer, onboarding, start, replacement, and completion are not logged",
    workflow: "connect placement tracker to recruiter desk, candidate onboarding, quality control, and employer portal",
    conversion: "make placement tracking part of every job order workflow",
    surfaces: [
      surface("Placement Tracker", "placement-tracker.html", "Track candidate movement by stage."),
      surface("Recruiter Desk", "recruiter-desk.html", "Coordinate recruiting action."),
      surface("Candidate Onboarding", "candidate-onboarding.html", "Prepare selected workers."),
      surface("Quality Control Plan", "quality-control-plan.html", "Protect the account after start."),
      surface("Employer Portal", "employer-portal.html", "Keep employer requirements visible.")
    ]
  }),
  solArticle({
    title: "Staffing Agreements: What Employers and Agencies Should Clarify Before Work Starts",
    category: "Operations",
    file: "blog-staffing-agreements.html",
    description: "A non-legal operational guide to the agreement topics staffing agencies should clarify before placements begin.",
    audience: "employers and staffing operators aligning scope, billing, replacement, contacts, and work boundaries",
    problem: "placements start with unclear terms, which creates avoidable disputes around billing, replacement, safety, and responsibility",
    workflow: "use agreement packet, compliance posture, proposal builder, and pricing pages to clarify the operating agreement",
    conversion: "review agreement topics before sending candidates to work",
    surfaces: [
      surface("Agreement Packet", "agreement-packet.html", "Clarify terms before placements."),
      surface("Compliance Posture", "compliance-posture.html", "Keep agreement language operational and bounded."),
      surface("Proposal Builder", "proposal-builder.html", "Align scope before the agreement."),
      surface("Pricing", "pricing.html", "Set billing expectations."),
      surface("Risk Register", "risk-register.html", "Track unresolved agreement risks.")
    ]
  }),
  solArticle({
    title: "Staffing Campaign Landing Pages: Why One Offer Beats a Generic Website",
    category: "Marketing",
    file: "blog-campaign-landing-pages-staffing.html",
    description: "A guide to using focused campaign landing pages for staffing sales, candidate acquisition, and prime contractor outreach.",
    audience: "staffing marketers and AEs who need campaign pages to route one clear action",
    problem: "generic sites ask every visitor to interpret the offer, while focused landing pages route one buyer or candidate path",
    workflow: "connect landing pages to urgent staffing, candidate pool, prime support, and contact routes",
    conversion: "send each campaign audience to a page that matches their exact intent",
    surfaces: [
      surface("Landing Pages", "landing-pages.html", "Plan focused campaign routes."),
      surface("Urgent Staffing Campaign", "campaign-urgent-staffing.html", "Route urgent employer demand."),
      surface("Candidate Pool Campaign", "campaign-candidate-pool.html", "Build candidate acquisition flow."),
      surface("Prime Support Campaign", "campaign-prime-support.html", "Speak directly to prime contractors."),
      surface("Contact Hub", "contact.html", "Convert campaign traffic into action.")
    ]
  })
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sentence(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const capped = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

function inlineMarkdown(value) {
  return escapeHtml(value).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    return `<a href="${escapeHtml(href)}">${label}</a>`;
  });
}

function markdownToHtml(markdown) {
  const blocks = markdown.trim().split(/\n{2,}/);
  return blocks.map((block) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) return `<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`;
    if (trimmed.startsWith("## ")) return `<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith("# ")) return `<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`;
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter(Boolean).map((line) => {
        return `<li>${inlineMarkdown(line.replace(/^- /, ""))}</li>`;
      }).join("");
      return `<ul>${items}</ul>`;
    }
    return `<p>${inlineMarkdown(trimmed.replace(/\n/g, " "))}</p>`;
  }).join("\n");
}

function articleHref(article) {
  return article.kind === "nexus" ? `nexus/${article.slug}.html` : `posts/${article.slug}.html`;
}

function markdownHref(article) {
  return article.kind === "nexus" ? `nexus/${article.slug}.md` : `markdown/${article.slug}.md`;
}

function metraArticleBody(article) {
  const routeList = article.surfaces.map((item) => {
    return `- [${item.title}](../../${item.route}) - ${item.use}`;
  }).join("\n");

  return `## Why this article exists

I built this article because I do not want the 0S blog to be a shelf of essays that sound useful and then send the reader nowhere. I route ${article.topic} into a working command room inside the actual MetrAIyux 0S app. The audience is ${article.audience}, so the writing has to do more than describe the idea. It has to show the operating room, the handoff path, our brains, our gates, the proof receipts, and the marketing angle that can be reused on the public site, in sales follow-up, and inside the local brain.

The real problem is simple: ${article.problem}. When that happens, the company can still look busy, but the work becomes hard to trust. A buyer cannot see who owns the next step. A founder cannot tell which claim is safe to publish. An AE cannot prove that delivery, finance, compliance, client success, and QA will support the promise after the signature.

## The operating move

The move I use inside 0S is to ${article.operatingMove}. That does not mean every page needs to be complicated. It means every piece of content should make the business easier to operate after someone reads it. A blog post should create a route: who this is for, what pain it names, what room to open, what proof to check, what to say in sales, and what boundary not to cross.

That is the difference between thought leadership and a content engine. Thought leadership can be admired and forgotten. I use the content engine to give AEs language, give buyers confidence, give operators a checklist, give the local brain better retrieval chunks, and give marketing a repeatable source of truth. If a post cannot be reused in those places, it is not finished.

## Open the app rooms this article points to

${routeList}

These links are the spine of the article. The reader should be able to move from the argument into the product without guessing. The AE should be able to send the same links after a call. The marketer should be able to turn each room into a campaign section. The operator should be able to use the room as the next action, not as decoration.

## How the workflow should run

In practice, this article points to ${article.appWork}. The workflow starts when a signal enters the business: a buyer asks a hard question, a client needs a handoff, a candidate needs placement, a founder needs approval, or a public claim needs evidence. The system should not answer with a vague promise. It should route the signal into the room that owns it.

From there, the operator checks the supporting surface. If the request is sales-related, the proof router and proposal rooms matter. If the request touches a client account, the client OS and escalation desk matter. If the request touches contracts, compliance, personnel, money, or public claims, the approval gates matter. If the request touches marketing, the claims proof sheet and content control rules matter. The value of 0S is that these rooms are not random pages. They are operating lanes.

## What the content should do for sales

For sales, the article gives the AE a cleaner way to talk. Instead of saying we are organized, the AE can say: open this room, follow this path, and look at the proof rule. That makes the sales motion calmer. It also protects the business, because the AE is not forced to invent an answer when the buyer asks about delivery, readiness, authority, or risk.

The best sales use is to turn each section into a follow-up asset. Send the thesis after discovery. Send the relevant app-room links after objection handling. Pull the proof rule into the proposal. Use the marketing angle as the subject line for outbound. When the content is written this way, the blog becomes part of the sales system instead of a separate publishing habit.

## What the content should do for marketing

For marketing, the reusable angle is: ${article.marketingUse}. That means this post can feed a pillar page, a LinkedIn post, a short video script, a campaign landing page, an email sequence, and a local-brain answer. The key is to preserve the same operating claim across every version. The short version should not promise more than the long version proves.

This is especially important for MetrAIyux 0S because the public story can get large quickly: 16 brains, cabinet rooms, Cloudflare workers, approval gates, proof receipts, staffing operations, enterprise readiness, and autonomous business language. The content engine keeps that story grounded. Each marketing asset should point back to a real room or a proof rule.

## Proof, boundaries, and trust

The proof rule for this article is: ${article.proofRule}. That rule matters because serious buyers do not only read for inspiration. They read for risk. They want to know what happens when something goes wrong, who owns the next step, where the record lives, and what the company refuses to automate.

Any version of this article used in public marketing should keep the boundaries visible. Do not imply legal advice. Do not imply certification if the certification is not complete. Do not imply production persistence where a page is only a preview. Do not call a workflow autonomous if the proof only shows routing. The system becomes more credible when it says exactly what it does and stops before overclaiming.

## A practical 30-60-90 use pattern

In the first 30 days, use this article to clean up language. Pull the strongest paragraphs into the app pages it references. Make sure each linked room has a clear next action. Add the proof rule to the sales or launch checklist so the claim does not drift.

In days 31 to 60, use the article as a campaign source. Turn it into one email, one social post, one AE talk track, one buyer FAQ answer, and one local-brain knowledge chunk. Keep the app-room links intact so every derivative asset still routes back into 0S.

In days 61 to 90, measure whether the content is doing operational work. Are AEs sending it? Are buyers clicking the proof rooms? Are operators using the checklist language? Are public claims cleaner? If yes, the article is not just content. It is infrastructure.

## Final position

The point is not to have a bigger blog. The point is to make every blog post behave like a door into the system. This article should help someone understand ${article.topic}, but it should also move them into the app surface that makes the idea real. That is how the 0S blog becomes useful across the website, sales motion, local brain, and marketing sites.`;
}

function metraMarkdown(article) {
  return `# ${article.title}

${article.subtitle}

By ${article.author} - ${article.collection} - Updated ${article.date}

${metraArticleBody(article)}
`;
}

function metraArticleHtml(article) {
  const root = "../../";
  const cards = article.surfaces.map((item) => {
    return `<a class="app-route-card" href="${root}${escapeHtml(item.route)}"><span>${escapeHtml(item.title)}</span><p>${escapeHtml(item.use)}</p></a>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(article.subtitle)}">
  <title>${escapeHtml(article.title)} - MetrAIyux 0S Executive Office</title>
  <link rel="stylesheet" href="../../style.css">
  <link rel="stylesheet" href="../blog.css">
  <link rel="icon" type="image/png" href="../../favicon-32.png">
</head>
<body>
  <header class="site-header"><a class="brand" href="../../index.html"><img class="brand-logo floating-logo" src="../../assets/metraiyux-0s-emblem-transparent.png" alt="MetrAIyux 0S emblem"><span class="brand-text">MetrAIyux 0S</span></a><nav><a href="../../index.html#leaders">Leaders</a><a href="../index.html">Blog</a><a href="../../person-brains.html">16 Brains</a><a href="../../local-brain.html">Local Brain</a><a href="../../deployment-command-center.html">Deploy</a></nav></header>
  <main>
    <article class="blog-article content-engine-article">
      <div class="article-kicker">${escapeHtml(article.category)} &middot; ${escapeHtml(article.collection)} &middot; ${escapeHtml(article.date)}</div>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="article-subtitle">${escapeHtml(article.subtitle)}</p>
      <div class="article-byline">By ${escapeHtml(article.author)} &middot; Longform content-engine article for MetrAIyux 0S</div>
      <section class="app-route-panel" aria-labelledby="app-route-title">
        <p class="eyebrow">Direct app routes</p>
        <h2 id="app-route-title">Open the rooms this article uses</h2>
        <div class="app-route-grid">${cards}</div>
      </section>
      <div class="article-body-copy">
${markdownToHtml(metraArticleBody(article))}
      </div>
      <div class="article-cta">
        <h2>Turn this post into a working route</h2>
        <p>Use the article as public education, AE follow-up, local-brain context, and campaign source material. Keep every reuse tied to the linked app rooms and proof rule.</p>
        <a class="button primary" href="../index.html">Back to Blog Library</a>
        <a class="button" href="../../sales/live-proof-router.html">Open Proof Router</a>
        <a class="button" href="../../local-brain.html">Ask Local Brain</a>
      </div>
    </article>
  </main>
  <footer><p>MetrAIyux 0S Executive Office &middot; Longform content engine &middot; Verify public claims before regulated, legal, investor, or government use.</p></footer>
</body>
</html>
`;
}

function metraIndexHtml() {
  const grouped = ["Cabinet Doctrine", "APEX Growth", "NEXUS Automation"].map((collection) => {
    const cards = metraiyuxArticles.filter((article) => article.collection === collection).map((article) => {
      return `<a class="blog-card" href="${articleHref(article)}"><div class="meta">${escapeHtml(article.category)} &middot; ${escapeHtml(article.author)}</div><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.subtitle)}</p><span class="read">Read longform &rarr;</span></a>`;
    }).join("\n");
    return `<section class="section blog-collection"><p class="eyebrow">${escapeHtml(collection)}</p><h2>${collection === "Cabinet Doctrine" ? "Core operating doctrine" : collection === "APEX Growth" ? "Growth, sales, and expansion articles" : "Automation, routing, and proof articles"}</h2><div class="blog-grid">${cards}</div></section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Longform content-engine library for MetrAIyux 0S, with every article tied to direct app rooms, proof routes, sales use, and marketing reuse.">
  <title>Blog Library - MetrAIyux 0S Executive Office</title>
  <link rel="stylesheet" href="../style.css">
  <link rel="stylesheet" href="blog.css">
  <link rel="icon" type="image/png" href="../favicon-32.png">
</head>
<body>
  <header class="site-header"><a class="brand" href="../index.html"><img class="brand-logo floating-logo" src="../assets/metraiyux-0s-emblem-transparent.png" alt="MetrAIyux 0S emblem"><span class="brand-text">MetrAIyux 0S</span></a><nav><a href="../index.html#leaders">Leaders</a><a href="index.html">Blog</a><a href="../person-brains.html">16 Brains</a><a href="../local-brain.html">Local Brain</a><a href="../deployment-command-center.html">Deploy</a></nav></header>
  <main class="blog-library">
    <section class="blog-hero">
      <div>
        <p class="eyebrow">Longform content engine</p>
        <img class="hero-platform-logo floating-logo" src="../assets/metraiyux-0s-logo-transparent.png" alt="MetrAIyux 0S transparent floating logo">
        <h1>Every article routes into the app, sales motion, proof layer, and marketing engine.</h1>
        <p class="hero-lede">This library now treats the 0S blog as operating infrastructure. Each longform article names the buyer problem, opens the direct app rooms it depends on, sets a proof rule, and gives marketing a reusable angle for websites, campaigns, social, local-brain answers, and AE follow-up.</p>
        <div class="hero-actions"><a class="button primary" href="../sales/live-proof-router.html">Open Proof Router</a><a class="button" href="../local-brain.html">Ask Local Brain</a><a class="button" href="content-engine.json">View Engine JSON</a></div>
      </div>
      <aside class="panel content-engine-panel">
        <h3>Engine status</h3>
        <p><strong>${metraiyuxArticles.length} longform articles</strong> across cabinet doctrine, APEX growth, and NEXUS automation.</p>
        <p class="muted">Each post includes direct app rooms, sales use, content reuse, proof boundaries, and a 30-60-90 activation pattern.</p>
        <p class="notice">Use as content foundation. Verify claims before legal, regulated, investor, public-sector, or certification use.</p>
      </aside>
    </section>
${grouped}
  </main>
  <footer><p>MetrAIyux 0S Executive Office &middot; Longform content engine.</p></footer>
</body>
</html>
`;
}

function solArticleBody(article) {
  const routes = article.surfaces.map((item) => `- [${item.title}](./${item.route}) - ${item.use}`).join("\n");
  return `## Why this matters

This article is built for ${article.audience}. It is not here to decorate the staffing site with generic SEO text. It is here to turn a real operating problem into a route inside the Skyes Over London Staffing app. The problem is that ${article.problem}.

When that problem is ignored, staffing gets slower and more expensive. Recruiters chase weak information. Employers wait for updates that should have been clear from the beginning. Candidates get screened against incomplete requirements. Account executives keep selling without knowing whether delivery can support the promise. The content has to educate the reader and then move them into the workflow that fixes the issue.

## The operating workflow

The workflow is to ${article.workflow}. The staffing site already has the pages needed to make that practical. The blog should point to those pages directly so a reader can move from learning to action in one click.

${routes}

These are not random internal links. They are the app surfaces that make the article useful. If an employer reads the article, the next step should be obvious. If an AE sends the article after a call, the buyer should land in the right room. If an operator uses the article as internal training, the route should match the actual staffing process.

## What to define before the team moves

The first thing to define is the business outcome. For employer-facing work, that usually means the role, schedule, location, start date, pay or bill-rate expectation, supervisor contact, safety requirements, required experience, and decision path. For candidate-facing work, that means availability, transportation, documents, work history, communication speed, and role fit. For government or prime contractor work, that means capability, documentation, compliance posture, procurement path, and who has authority to speak for the company.

The second thing to define is ownership. A staffing workflow needs a sales owner, recruiting owner, client contact, candidate contact, and escalation path. Without that, the work spreads across inboxes and nobody can tell whether the account is healthy. The app pages listed above exist to turn those ownership questions into visible actions.

## How sales should use this article

Sales should not use this as a soft educational post and stop there. The AE should use it as a bridge between the buyer's pain and the staffing surface that handles that pain. If the buyer is unclear about what they need, send the article and then route them to the intake or employer page. If the buyer is worried about public-sector readiness, send the article and then route them to the procurement packet or capability statement. If the buyer is trying to compare options, send the article and then route them to pricing, agreements, or proposal pages.

That gives the AE a better pattern: teach, show the route, ask for the next action. It also keeps the sale honest. The article should never promise more than the staffing team can support. It should show how the team thinks, how the workflow moves, and where the buyer can act.

## How marketing should reuse it

Marketing can turn this article into a campaign page, email sequence, local SEO excerpt, short video outline, social post, and sales enablement note. The important part is to preserve the route. If a social post names the same problem, it should link to the same page. If a campaign landing page uses the same angle, it should use the same conversion path. If an email sequence quotes the article, it should point to the correct workflow surface.

That is how the staffing site becomes a content engine instead of a set of isolated pages. Each article feeds traffic into a page that can actually convert. Each page sends clearer signals back to sales and operations. The writing, the website, and the staffing workflow start reinforcing each other.

## Risk controls

Staffing content should stay practical and careful. Do not make legal, payroll, compliance, public-sector, or hiring promises that require professional review. Do not imply a candidate is guaranteed. Do not imply a public contract path is available unless the route and documents support it. Do not promise replacement, speed, or pricing without tying it to the agreement and operating details.

The safer claim is also the stronger claim: here is the workflow, here are the details we need, here is the page that routes the request, and here is what happens next. Buyers trust a company that names the process more than a company that tries to sound large without showing how it operates.

## Turn it into action

The conversion goal is to ${article.conversion}. A reader who reaches the end should not wonder what to do. They should open the relevant page, submit the missing details, ask for the correct review, or move into the staffing request path.

Use this article as public education, AE follow-up, local SEO support, and internal training. Keep it tied to the linked pages. When the page changes, update the article. When the article produces a better explanation, reuse that language on the page. That loop is what makes the blog useful across the staffing website and marketing system.`;
}

function solArticleHtml(article) {
  const sideLinks = article.surfaces.map((item) => `<a class="pill-link" href="./${escapeHtml(item.route)}">${escapeHtml(item.title)}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(article.title)} | Skyes Over London Staffing</title>
  <meta name="description" content="${escapeHtml(article.description)}">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div class="cursor-glow" aria-hidden="true"></div>
  <header class="topbar">
    <a class="brand" href="./index.html"><span class="brand-mark">SOL</span><span><strong>Skyes Over London</strong><small>Staffing Division</small></span></a>
    <button class="nav-toggle" aria-label="Open navigation">Menu</button>
    <nav class="nav"><a href="./index.html">Home</a><a href="./services.html">Services</a><a href="./employers.html">Employers</a><a href="./candidates.html">Candidates</a><a href="./jobs.html">Jobs</a><a href="./government.html">Government</a><a href="./blog.html">Insights</a><a class="nav-cta" href="./contact.html">Contact</a></nav>
  </header>
  <main>
    <section class="article-hero section-pad">
      <div class="article-wrap reveal">
        <p class="eyebrow">${escapeHtml(article.category)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="lead">${escapeHtml(article.description)}</p>
        <div class="hero-actions"><a class="btn primary" href="./contact.html">Start a Request</a><a class="btn ghost" href="./blog.html">Back to Insights</a></div>
      </div>
    </section>
    <section class="article-section section-pad">
      <article class="article-body reveal">
${markdownToHtml(solArticleBody(article))}
        <div class="article-cta"><h2>Turn this into action.</h2><p>${escapeHtml(sentence(article.conversion))} The pages linked beside this article are the direct workflow surfaces for that next step.</p><a class="btn primary" href="./contact.html">Open Contact Hub</a></div>
      </article>
      <aside class="article-side reveal"><h3>Useful workflow pages</h3><div class="pill-list">${sideLinks}</div></aside>
    </section>
  </main>
  <footer class="footer"><div><strong>Skyes Over London Staffing</strong><p>Commercial staffing, government-ready workforce support, recruiting, AE-powered account growth, and workforce operations.</p></div><div class="footer-links"><a href="./services.html">Services</a><a href="./jobs.html">Jobs</a><a href="./government.html">Government</a><a href="./contact.html">Contact</a><a href="mailto:SkyesOverLondonLC@solenterprises.org">SkyesOverLondonLC@solenterprises.org</a></div></footer>
  <script src="./script.js"></script>
</body>
</html>
`;
}

function solIndexHtml() {
  const topCards = solArticles.slice(0, 8).map((article) => solCard(article)).join("\n");
  const restCards = solArticles.slice(8).map((article) => solCard(article)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Staffing Insights | Skyes Over London Staffing</title>
  <meta name="description" content="Longform staffing, recruiting, AE sales, candidate readiness, government contracting, and workflow articles tied directly to the staffing app surfaces.">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div class="cursor-glow" aria-hidden="true"></div>
  <header class="topbar">
    <a class="brand" href="./index.html"><span class="brand-mark">SOL</span><span><strong>Skyes Over London</strong><small>Staffing Division</small></span></a>
    <button class="nav-toggle" aria-label="Open navigation">Menu</button>
    <nav class="nav"><a href="./index.html">Home</a><a href="./employers.html">Employers</a><a href="./candidates.html">Candidates</a><a href="./government.html">Government</a><a href="./blog.html">Insights</a><a href="./ae-command.html">AE Command</a><a class="nav-cta" href="./index.html#hire">Request Staff</a></nav>
  </header>
  <main>
    <section class="hero section-pad compact">
      <div class="hero-grid">
        <div class="hero-copy reveal">
          <p class="eyebrow">Staffing insights content engine</p>
          <h1>Longform staffing content tied to direct workflow pages.</h1>
          <p class="lead">Each article now teaches a real staffing, AE, candidate, compliance, government, or local-market problem and routes the reader into the app page that handles the next step.</p>
        </div>
        <aside class="hero-card reveal"><div class="card-topline">Content Engine</div><h2>${solArticles.length} longform articles.</h2><p>Use these pages for SEO, sales follow-up, AE training, procurement credibility, candidate education, and internal playbook expansion.</p></aside>
      </div>
    </section>
    <section class="section-pad">
      <div class="section-head reveal"><p class="eyebrow">Featured articles</p><h2>Authority content for the highest-intent staffing paths.</h2></div>
      <div class="cards three">${topCards}</div>
    </section>
    <section class="section-pad">
      <div class="section-head reveal"><p class="eyebrow">Workflow library</p><h2>Sales, delivery, compliance, government, and marketing articles.</h2></div>
      <div class="cards three">${restCards}</div>
    </section>
  </main>
  <footer class="footer"><div><strong>Skyes Over London Staffing</strong><p>Commercial staffing, government-ready workforce support, recruiting, AE-powered account growth, and workforce operations.</p></div><div class="footer-links"><a href="./employers.html">Employers</a><a href="./candidates.html">Candidates</a><a href="./government.html">Government</a><a href="./blog.html">Insights</a><a href="mailto:SkyesOverLondonLC@solenterprises.org">SkyesOverLondonLC@solenterprises.org</a></div></footer>
  <script src="./script.js"></script>
</body>
</html>
`;
}

function solCard(article) {
  return `<article class="service-card reveal"><p class="eyebrow">${escapeHtml(article.category)}</p><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.description)}</p><a class="text-link" href="./${escapeHtml(article.file)}">Read article &rarr;</a></article>`;
}

function wordCount(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/[^\w\s-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function validate() {
  const warnings = [];
  for (const article of metraiyuxArticles) {
    const count = wordCount(metraArticleBody(article));
    if (count < 1000) warnings.push(`${article.slug} is only ${count} words`);
    for (const item of article.surfaces) {
      if (!existsSync(path.join(siteRoot, item.route))) warnings.push(`Missing MetrAIyux route for ${article.slug}: ${item.route}`);
    }
  }
  for (const article of solArticles) {
    const count = wordCount(solArticleBody(article));
    if (count < 900) warnings.push(`${article.file} is only ${count} words`);
    for (const item of article.surfaces) {
      if (!existsSync(path.join(solRoot, item.route))) warnings.push(`Missing SOL route for ${article.file}: ${item.route}`);
    }
  }
  return warnings;
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeMetraiyux() {
  mkdirSync(path.join(metraBlogRoot, "posts"), { recursive: true });
  mkdirSync(path.join(metraBlogRoot, "markdown"), { recursive: true });
  mkdirSync(path.join(metraBlogRoot, "nexus"), { recursive: true });

  for (const article of metraiyuxArticles) {
    const htmlPath = path.join(metraBlogRoot, article.kind === "nexus" ? "nexus" : "posts", `${article.slug}.html`);
    const mdPath = path.join(metraBlogRoot, article.kind === "nexus" ? "nexus" : "markdown", `${article.slug}.md`);
    writeFileSync(htmlPath, metraArticleHtml(article));
    writeFileSync(mdPath, metraMarkdown(article));
  }

  writeFileSync(path.join(metraBlogRoot, "index.html"), metraIndexHtml());
  writeJson(path.join(metraBlogRoot, "blog-index.json"), metraiyuxArticles.map((article) => ({
    title: article.title,
    subtitle: article.subtitle,
    author: article.author,
    category: article.category,
    collection: article.collection,
    date: article.date,
    slug: article.slug,
    html: articleHref(article),
    markdown: markdownHref(article),
    directAppRoutes: article.surfaces,
    contentEngineUse: {
      audience: article.audience,
      marketingUse: article.marketingUse,
      proofRule: article.proofRule
    }
  })));
  writeJson(path.join(metraBlogRoot, "content-engine.json"), {
    generatedAt,
    purpose: "Canonical 0S blog content engine. Every article is tied to direct app surfaces, proof boundaries, sales reuse, local-brain context, and marketing distribution.",
    totalArticles: metraiyuxArticles.length,
    collections: ["Cabinet Doctrine", "APEX Growth", "NEXUS Automation"],
    articles: metraiyuxArticles.map((article) => ({
      title: article.title,
      slug: article.slug,
      collection: article.collection,
      category: article.category,
      audience: article.audience,
      appWork: article.appWork,
      proofRule: article.proofRule,
      marketingUse: article.marketingUse,
      html: `blog/${articleHref(article)}`,
      markdown: `blog/${markdownHref(article)}`,
      directAppRoutes: article.surfaces
    }))
  });
}

function writeSol() {
  for (const article of solArticles) {
    writeFileSync(path.join(solRoot, article.file), solArticleHtml(article));
  }
  writeFileSync(path.join(solRoot, "blog.html"), solIndexHtml());
  writeJson(path.join(solRoot, "blog-content-engine.json"), {
    generatedAt,
    purpose: "Skyes Over London Staffing blog content engine. Every article routes into a direct staffing app workflow page.",
    totalArticles: solArticles.length,
    articles: solArticles.map((article) => ({
      title: article.title,
      file: article.file,
      category: article.category,
      audience: article.audience,
      conversion: article.conversion,
      directWorkflowPages: article.surfaces
    }))
  });
}

function writeMarketingDocs() {
  const metraLines = metraiyuxArticles.map((article) => {
    const routes = article.surfaces.map((item) => `${item.title} (${item.route})`).join("; ");
    return `- ${article.title}: ${article.marketingUse}. Direct app routes: ${routes}.`;
  }).join("\n");
  const solLines = solArticles.map((article) => {
    const routes = article.surfaces.map((item) => `${item.title} (${item.route})`).join("; ");
    return `- ${article.title}: ${article.conversion}. Workflow pages: ${routes}.`;
  }).join("\n");

  writeFileSync(path.join(repoRoot, "marketing", "metraiyux-0s", "blog-content-engine.md"), `# MetrAIyux 0S Blog Content Engine

Generated: ${generatedAt}

The 0S blog is now treated as a reusable content engine, not a loose article folder. Every article names the audience, routes into direct app surfaces, includes a proof boundary, and can be republished into sales follow-up, local-brain answers, social posts, campaign pages, and website sections.

## Operating Articles

${metraLines}
`);

  writeFileSync(path.join(repoRoot, "marketing", "sol-staffing", "blog-content-engine.md"), `# SOL Staffing Blog Content Engine

Generated: ${generatedAt}

The staffing blog is now tied to direct workflow pages. Each article should feed SEO, AE follow-up, buyer education, candidate readiness, procurement credibility, and internal training.

## Staffing Articles

${solLines}
`);
}

function writeManifest() {
  writeFileSync(path.join(siteRoot, "LONGFORM_BLOG_EXPANSION_MANIFEST.md"), `# Longform Blog Expansion Manifest

Generated: ${generatedAt}

## What Changed

- Rebuilt the MetrAIyux 0S blog as a ${metraiyuxArticles.length}-article content engine.
- Rebuilt the Skyes Over London Staffing insight hub as a ${solArticles.length}-article content engine.
- Added direct app-room links to every 0S article.
- Added direct staffing workflow links to every SOL Staffing article.
- Regenerated markdown sources, HTML pages, blog indexes, and JSON content-engine maps.
- Added marketing-side content-engine maps for MetrAIyux 0S and SOL Staffing.

## 0S Collections

- Cabinet Doctrine: ${metraiyuxArticles.filter((article) => article.collection === "Cabinet Doctrine").length} articles.
- APEX Growth: ${metraiyuxArticles.filter((article) => article.collection === "APEX Growth").length} articles.
- NEXUS Automation: ${metraiyuxArticles.filter((article) => article.collection === "NEXUS Automation").length} articles.

## Content Engine Rule

Every public article should do four jobs:

1. Teach a real operating problem.
2. Route the reader into direct app surfaces.
3. State the proof or boundary rule.
4. Feed sales, local brain retrieval, social, campaigns, and website copy.

## Use Warning

These articles are operating and marketing assets. Verify public claims before legal, regulated, investor, certification, or government use.
`);
}

writeMetraiyux();
writeSol();
writeMarketingDocs();
writeManifest();

const warnings = validate();
const result = {
  ok: warnings.length === 0,
  generatedAt,
  metraiyuxArticles: metraiyuxArticles.length,
  solArticles: solArticles.length,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (warnings.length > 0) process.exitCode = 1;
