# MetrAIyux 0S Full Website + Autonomous Business OS


**MetrAIyux 0S** is the official product name for this package. It replaces prior working names such as Sovereign 13 Cabinet, 13-Cabinet Executive Office, CabinetOS, SovereignOffice OS, and generic Autonomous Business OS language.

This package contains the full public website, owner/admin automation OS, customer SaaS layer, tenant isolation, 0meg4kAI security/QA brain, 16-brain registry, Cloudflare Worker kits, D1 migrations, Resend approval email workflow, tutorials, valuation pages, proof receipts, and deployment documentation.


A static, deployable executive cabinet website with individual resume pages, portraits, executive roster, governance charter, AE positioning, and deployment instructions.

## Deploy

Upload this folder to Netlify, Cloudflare Pages, Vercel, or any static host. The public entry file is `index.html`.

## Included

- `index.html` full website
- `style.css` premium dark visual system
- `script.js` cabinet interactivity
- `assets/portraits/` individual portraits cropped from the generated executive poster
- `resumes/*.html` print-ready resume pages
- `resumes/*.md` markdown resume files
- `docs/ceo-chief-of-operations-charter.md` governance charter
- `data/cabinet-executives.json` structured roster data

## Important

All named cabinet members except verified real personnel are fictional sample planning roles. Do not use them in legal filings as real appointed officers unless the people exist, consent, and the information is accurate.


## Founder image correction

Gray London Skyes uses the actual founder/source image from the approved Skyes Over London founder asset. The remaining cabinet portraits are demonstrative executive personas until real people are legally appointed and photographed.


## Local Cabinet Brain

Open `local-brain.html` to use the browser-side cabinet knowledge assistant. It uses `brain/knowledge-base.json` and does not require a paid model provider. Optional Ollama/llama.cpp OpenAI-compatible endpoint wiring and a tiny proxy are included under `brain/`.

Open `deployment-command-center.html` for operator setup guidance.


## 14 Lightweight Local Brains

This build includes one Central Company Command Brain and 13 individual cabinet-person brains. Open `person-brains.html` to select an executive brain, ask scoped questions, and view retrieved local proof sources. The brains are lightweight JSON/persona modules over the included knowledge base. They do not require a GPU, database, paid API, or live model endpoint.

Files added:
- `person-brains.html`
- `brain/persona-brains.json`
- `brain/persona-brains.js`
- `brain/individual-brains/*.md`

Truth standard: the cabinet members remain sample planning roles until real people are legally appointed and verified.


## Longform Blog Library

This upgraded package includes `blog/index.html`, ten longform article pages, markdown sources, metadata JSON, and local-brain knowledge chunks for the blog content. The articles are designed for AE education, public positioning, onboarding, and company doctrine support.


## Resend approval email layer

The Admin Automation Brain now supports Resend-powered approval notifications through the Cloudflare Worker kit. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_APPROVAL_EMAIL`, and `PUBLIC_ADMIN_URL`, then use `/admin/resend-notifications.html` and `/admin/approval-inbox.html`.

The site can route and draft locally. Real email notifications require deployed Worker credentials.


## Admin Tutorial + Valuation Upgrade

Added 2026-05-15T10:53:33Z: expanded admin tutorial to 22 lessons, added Resend approval workflow training, production deployment/secrets training, social autonomy training, autonomous company rhythm, final smoke checklist, and a site valuation desk at `admin/site-valuation.html`.


## SaaS Self-Serve Upgrade (2026-05-15T11:06:44Z)

Added public pricing/signup/onboarding/customer portal pages and a Cloudflare SaaS provisioning Worker kit. See `saas/index.html`, `saas/docs/SAAS_SELF_SERVE_IMPLEMENTATION.md`, and `cloudflare-saas-provisioning-worker/README.md`.


## 0meg4kAI Tenant Isolation Upgrade

This package includes a 16th lightweight brain named 0meg4kAI. It is the security/QA assistant for the Main Automation Brain and protects the owner/admin layer from customer SaaS workspaces. Customer commands must be reviewed before they can create admin-facing tasks or touch production connectors. Live enforcement requires Cloudflare Worker deployment, D1/KV/Queue bindings, upstream auth, and secrets stored server-side only.


## SkyeCrawler Operator QA

SkyeCrawler is the end-to-end user-flow crawler for this system. It lives in `tools/skye-crawler.mjs`, is documented at `operator/skye-crawler.html`, and has a proof receipt at `proof/skye-crawler-receipt.html`.

Run from the MetrAIyux 0S operator page:

```bash
npm run skye:control
```

Then open `operator/skye-crawler.html` and use the runner buttons.

Run static mode after content/navigation changes:

```bash
npm run skye:serve:site
npm run skye:crawl:static
```

Run Worker mode after API, header, Cloudflare, or routing changes:

```bash
npm run skye:crawl:worker
```

The crawler checks page inventory, local links/assets, browser runtime errors, mobile layout, Worker API status/routing, and key user flows including Local Brain, Persona Brain, Live Proof Router, calculator, admin local tool, SaaS signup receipt, and Client OS onboarding.
