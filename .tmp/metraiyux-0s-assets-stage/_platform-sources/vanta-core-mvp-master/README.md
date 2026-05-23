# VantaCore by Skyes Over London

**Autonomous business infrastructure for companies that cannot afford to miss money.**

VantaCore is a universal autonomous business operator platform. It is not just a CRM, chatbot, or AI receptionist. It is the operating layer between a business and the outside world.

## Core Promise

- **Answer** — Every call, message, and inquiry gets an immediate response.
- **Filter** — Cold callers, spam, and vendors are routed away from the owner.
- **Book** — Qualified leads are scheduled directly into the calendar.
- **Follow Up** — Unbooked leads are nurtured until they convert.
- **Recover** — Missed calls trigger instant text-back recovery.
- **Route** — Emergencies escalate to the owner in real time.
- **Grow** — Customer interactions are transformed into content, reviews, and revenue intelligence.

## Architecture

VantaCore is built as a multi-tenant SaaS platform with the following layers:

| Layer | Purpose |
|-------|---------|
| **Platform** | Tenants, users, billing, dashboards, audit logs |
| **VANTA13** | AI execution layer — intent classification, structured decisions, autonomous actions |
| **Business Packs** | Vertical templates for industries (Home Services, Legal, Medical, etc.) |
| **Client Portal** | Branded operator and dashboard per tenant |

## Key Features

- **Multi-Tenant SaaS** — Isolated tenants with custom branding and business rules
- **Lead Firewall** — Cold-call suppression, spam filtering, vendor trap inbox
- **AI Intake Operator** — Phone, SMS, chat, form, and email handling
- **Booking Engine** — Calendar-aware appointments with deposit support
- **Follow-Up Autopilot** — Scheduled sequences for missed calls, quotes, no-shows
- **Customer Memory** — Full conversation history, appointments, reviews, and AI summaries
- **Review + Reputation Engine** — Automated review requests with sentiment routing
- **Revenue Intelligence** — Real KPIs: leads captured, calls answered, revenue protected
- **Content Autopilot 2.0** — Call-to-content pipeline: transcripts → blog topics, sales scripts, newsletters
- **White-Label / Reseller** — Agency command center with branded client portals

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Backend:** Next.js App Router API routes, Cloudflare Workers (jobs)
- **Database:** Neon Postgres with Drizzle ORM
- **Auth:** Clerk / custom JWT
- **Voice/SMS:** Twilio / Telnyx / SignalWire
- **Email:** Resend / Postmark
- **Calendar:** Google Calendar
- **Billing:** Stripe
- **Storage:** Cloudflare R2 / AWS S3
- **AI:** Provider-agnostic VANTA13 adapter (OpenAI, Anthropic)
- **Deployment:** Netlify / Cloudflare Pages

## Getting Started

```bash
npm install
npm run dev
```

Set up your environment variables (see `docs/DEPLOYMENT_CHECKLIST.md`) and run:

```bash
npm run seed
npm run test:smoke
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run seed` | Seed database with initial data |
| `npm run test:smoke` | Run smoke tests against core flows |
| `npm run preflight:strict` | Validate environment before deploy |
| `npm run job:run` | Run background jobs manually |

## Documentation

- `docs/DEPLOYMENT_CHECKLIST.md` — Environment variables, platform-specific injection, rollback plan
- `docs/QA_MATRIX.md` — Feature test matrix and smoke test status
- `docs/INTELLIGENCE_LAYER.md` — Multi-location grid and competitor radar architecture
- `VANTACORE_BUILD_DIRECTIVE.md` — Full build specification

## Team

Built by **Skyes Over London**.

- **VantaCore** is the business nervous system.
- **VANTA13** is the autonomous operator.
- **Skyes Over London** is the tech behind the business.

## License

Private — All rights reserved.
