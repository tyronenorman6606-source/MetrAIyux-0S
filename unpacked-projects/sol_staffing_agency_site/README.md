# Skyes Over London Staffing Website

Deployable static website for a full staffing agency that is also packaged for government contracting and prime-contractor subcontracting conversations.

## Files

- `index.html` — public staffing-agency landing page
- `government.html` — public government-contracting / subcontracting capability page
- `capability-statement.html` — printable web capability statement shell
- `ae-command.html` — internal AE sales/playbook page with government pursuit rules
- `government-contracting-checklist.md` — internal operator checklist
- `styles.css` — full responsive visual system
- `script.js` — mobile nav, cursor glow, reveal animation, local form notice
- `netlify.toml` — static deployment config

## Deploy on Netlify

1. Upload the whole folder to Netlify as a manual deploy, or push it to a repo.
2. Keep `index.html` at the root.
3. Netlify Forms should detect these forms after deployment:
   - `staffing-request`
   - `ae-lead`
   - `government-inquiry`

## Government contracting notes

The site is now ready to support government contracting conversations, but it does not falsely claim active SAM registration, UEI, CAGE code, SBA certifications, GSA Schedule, set-aside status, insurance coverage, bonding, security clearance, or past federal performance.

Before serious proposal submission, fill in the verified fields inside `capability-statement.html`:

- Legal entity
- UEI
- CAGE
- Verified NAICS
- Certifications
- Past performance
- Insurance / bonding if applicable
- Government POC
- Business POC

## Recommended production integrations

- CRM or ADFlow lead capture
- Google Sheets / Airtable backup
- AE commission tracker
- Candidate intake page
- Employer portal
- Job order dashboard
- Document upload and onboarding packet
- SAM.gov opportunity tracker
- Capability statement PDF export
- Contract pursuit log


## Mega-site expansion

Added:
- `employers.html`
- `candidates.html`
- `services.html`
- `blog.html`
- 8 long-form blog articles
- 6 staffing vertical SEO pages
- `sitemap.xml`
- `robots.txt`
- `llms.txt`

New forms:
- `employer-job-order`
- `candidate-profile`
- `government-inquiry`
- Vertical-specific staffing request forms

Before production:
- Replace `YOUR-DOMAIN-HERE` in `sitemap.xml` and `robots.txt`.
- Add real phone number, business address, legal entity, UEI/CAGE when verified.
- Lock `ae-command.html` behind upstream auth or Netlify password protection.


## Continued expansion package

Added in this pass:
- `contact.html`
- `pricing.html`
- `jobs.html`
- `candidate-application.html`
- `employer-portal.html`
- `government-opportunities.html`
- `faq.html`
- `privacy.html`
- `terms.html`
- `service-areas.html`
- 6 Arizona city SEO pages
- 4 additional long-form blog articles

Important production gates:
- Replace placeholder legal/privacy text with reviewed policy language.
- Connect forms to Netlify Forms, CRM, Airtable, Google Sheets, or database.
- Lock internal pages behind auth: `ae-command.html`, `employer-portal.html`, `government-opportunities.html`.
- Do not advertise specific jobs unless openings are verified.
- Replace `YOUR-DOMAIN-HERE` in `sitemap.xml` and `robots.txt`.


## Sales/proof/procurement expansion

Added:
- `proposal-builder.html`
- `case-studies.html`
- `ae-recruiting.html`
- `candidate-onboarding.html`
- `procurement-packet.html`
- `quality-control-plan.html`
- `deployment-command.html`
- `sales-scripts.html`
- `client-agreement-notes.md`
- `ae-commission-plan-template.md`
- `candidate-onboarding-checklist.md`
- `procurement-packet-index.md`
- `smoke-test-checklist.md`

Internal pages that must be locked before launch:
- `ae-command.html`
- `proposal-builder.html`
- `sales-scripts.html`
- `employer-portal.html`
- `government-opportunities.html`
- `deployment-command.html`

This pass turns the site into a stronger sales, AE, proof, candidate, and procurement packaging system.


## Operations/data/vendor expansion

Added:
- `operations-hub.html`
- `client-welcome-packet.html`
- `vendor-packet.html`
- `contract-vehicles.html`
- `forms-directory.html`
- `email-sequences.html`
- 6 additional industry pages
- 4 additional long-form blog articles
- `data/forms-routing.json`
- `data/sample-job-orders.json`
- `data/naics-candidates.json`
- `data/internal-pages.json`
- job order, client kickoff, candidate screening, government go/no-go, and email sequence markdown templates

Internal pages to lock:
- `operations-hub.html`
- `forms-directory.html`
- `vendor-packet.html`
- `email-sequences.html`

Production warning:
Static forms are not a secure document workflow. Do not collect IDs, payroll files, tax forms, or background-check documents through unsecured public forms.


## Finance/training/risk expansion

Added:
- `recruiter-desk.html`
- `training-academy.html`
- `bill-rate-calculator.html`
- `timesheet-invoice-control.html`
- `risk-register.html`
- `compliance-posture.html`
- bill-rate, timesheet, invoice, recruiter scorecard, AE scorecard, and risk-register markdown templates
- CSV templates for job orders, candidates, client accounts, government pursuits, and risk register
- `data/ops-manifest.json`

Internal pages to lock:
- `recruiter-desk.html`
- `training-academy.html`
- `bill-rate-calculator.html`
- `timesheet-invoice-control.html`
- `risk-register.html`

The calculator is an estimate-only tool, not binding pricing.


## Sales delivery automation scaffold

Added:
- `crm-pipeline.html`
- `placement-tracker.html`
- `agreement-packet.html`
- `landing-pages.html`
- `campaign-urgent-staffing.html`
- `campaign-candidate-pool.html`
- `campaign-prime-support.html`
- 4 long-form blog articles
- MSA outline, SOW template, candidate submission template, placement tracker template, CRM pipeline template, campaign checklist
- CRM/placement/campaign JSON and CSV scaffolds

Internal pages to lock:
- `crm-pipeline.html`
- `placement-tracker.html`
- `agreement-packet.html`


## Local brain layer

Added:
- `brain.html` — public/local staffing brain console
- `brain-command.html` — internal brain operator command page
- `brain-docs.html` — brain documentation page
- `brain/brain-corpus.json` — editable knowledge corpus
- `brain/brain-config.json` — local brain configuration
- `brain/brain.js` — local rule-based assistant
- `brain/brain-fallback.js` — embedded fallback corpus
- `netlify/functions/brain.js` — safe stub for future provider/GPU-backed brain
- `LOCAL_BRAIN_README.md`
- `brain-prompt-pack.md`
- `data/brain-routes.csv`
- `data/brain-learning-queue.csv`

Current truth label:
The included brain is a local-first static JavaScript + JSON assistant. It is not a true LLM yet. It requires no API key and has no AI provider bill. It can be upgraded later to call a GPU/Ollama/vLLM endpoint through a serverless function.

Production gates:
- Do not store sensitive data in localStorage.
- Lock `brain-command.html` if it contains internal operator notes.
- Keep safe-claim rules in the corpus.
- Add authenticated database memory before using the brain with private client/candidate records.


## System walkthrough and upgrade roadmap

Added:
- `system-overview.html`
- `SYSTEM_WALKTHROUGH_AND_UPGRADES.md`
- `proof-static-smoke-report.json`

These explain what works now, what is static, what requires backend wiring, the local brain truth label, production gates, full system map, next recommended upgrades, and deployment walkthrough.


## Live staffing OS upgrade

Added after the static package:
- Skyegate FS27 auth bridge: `staffing-login.html`, `netlify/functions/staffing-auth-*`, and `netlify/edge-functions/auth-gate.js`
- Database-backed form capture: `netlify/functions/staffing-submit.js`
- Admin record dashboard: `admin-dashboard.html`
- Authenticated record API: `netlify/functions/staffing-records.js`
- Secure authenticated file uploads/downloads: `netlify/functions/staffing-files.js`
- Real GPU/Ollama brain function: `netlify/functions/brain.js`
- Deployment notes: `LIVE_PLATFORM_README.md`

Set `SKYGATE_FS27_INTROSPECT_URL` or `SKYEGATE_FS27_INTROSPECT_URL` so this staffing OS receives auth from Skyegate FS27.
