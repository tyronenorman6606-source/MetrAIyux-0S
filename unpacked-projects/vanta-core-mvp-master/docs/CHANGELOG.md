# VantaCore Changelog

> **Product:** VantaCore by Skyes Over London  
> **Operator:** VANTA13 Autonomous Business Operator  
> **Version:** 1.0.0  
> **Last Updated:** Phase 11 — Infrastructure Hardening & Killer Features Complete  

---

## 2026-05-19: MetrAIyux 0S + FS27 Ownership Integration

- Added the VantaCore service CRM lane to the full MetrAIyux 0S public proof surface and SkyeGateFS27 gate map.
- Recorded the package as a controlled service-business CRM lane for lead firewall, missed-call recovery, booking, follow-up, review routing, revenue intelligence, customer memory, and white-label client portal posture.
- Kept production claims gated: live customer tenancy, Twilio/Resend/Stripe/calendar/storage operation, and customer workspace activation require FS27 provider configuration and live receipts.
- Ownership proof passed after the hardening pass: build, preflight, smoke, reports, conversion, Playwright ownership sweep, enforced API gate, audit, and local stress checks.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
3. [Phase 2: Business Setup](#phase-2-business-setup)
4. [Phase 3: Lead Engine](#phase-3-lead-engine)
5. [Phase 4: Lead Firewall](#phase-4-lead-firewall)
6. [Phase 5: Booking + Follow-Up](#phase-5-booking--follow-up)
7. [Phase 6: Review + Revenue](#phase-6-review--revenue)
8. [Phase 7: Billing + Gating](#phase-7-billing--gating)
9. [Phase 8: White-Label / Reseller](#phase-8-white-label--reseller)
10. [Phase 9: Public Website](#phase-9-public-website)
11. [Killer Features Program](#killer-features-program)
12. [Infrastructure & DevOps](#infrastructure--devops)
13. [Database Schema](#database-schema)
14. [API Surface](#api-surface)
15. [Testing & QA](#testing--qa)
16. [Deployment](#deployment)
17. [Compliance & Security](#compliance--security)

---

## Executive Summary

VantaCore is a universal autonomous business operator platform built as a real multi-tenant SaaS. It is not a CRM, chatbot, or AI receptionist — it is the operating layer between a business and the outside world.

**What VantaCore does:**
- **Answers** calls, SMS, chat, and form submissions
- **Filters** cold callers, spam, and vendor pitches
- **Captures** real leads with AI-powered intake
- **Books** appointments automatically
- **Follows up** until the money is won
- **Recovers** missed calls with instant text-backs
- **Routes** emergencies to the owner in real time
- **Requests** reviews from happy customers
- **Reactivates** past customers on autopilot
- **Protects** revenue from leaking through the cracks

**Core promise:** *Answer, filter, book, follow up, recover, route, and grow.*

**Technology Stack:**
- **Frontend:** Next.js 16 (App Router, React 19)
- **Backend:** Next.js API routes (serverless/edge-ready)
- **Database:** Neon Postgres via Drizzle ORM
- **Auth:** Clerk or custom JWT (pluggable)
- **Voice/SMS:** Twilio (pluggable — Telnyx/SignalWire ready)
- **Email:** Resend (pluggable — Postmark/SendGrid/SMTP ready)
- **Calendar:** Google Calendar API
- **Billing:** Stripe subscriptions + webhooks
- **Storage:** Cloudflare R2 or AWS S3
- **AI:** Provider-agnostic VANTA13 adapter (OpenAI, Anthropic)
- **Deployment:** Netlify or Cloudflare Pages
- **Background Jobs:** Cloudflare Queues, QStash, or scheduled functions

---

## Phase 1: Core Infrastructure

### Multi-Tenant Foundation
- `tenants` table with UUID primary keys, slug-based routing, and parent-child hierarchies for multi-location businesses
- `tenant_settings` for key-value configuration per tenant
- `tenant_branding` for logo, colors, fonts, and custom CSS
- Strict tenant isolation enforced at the database query level on every table

### Authentication & Authorization
- `users` table with email, name, role, and tenant-scoped access
- `user_roles` table with granular JSONB permission sets
- Pluggable auth: Clerk (production) or custom JWT (development/self-hosted)
- Role-based access control (RBAC) across all dashboard surfaces

### Database Layer
- 35+ tables in Neon Postgres using Drizzle ORM
- Full relations graph for type-safe queries with nested loading
- Schema-driven migrations via Drizzle Kit
- Self-referential tenant tree for franchises and chains

### Audit & Logging
- `audit_logs` table capturing every autonomous action
- Required fields: tenantId, actor (system/ai/user), action, entityType, entityId, input, result, error, timestamp
- All AI actions, bookings, follow-ups, and escalations are permanently logged
- Audit log integration in the dashboard with filtering by actor and entity type

### Environment Validation (Fail-Loud)
- `src/lib/env.ts` — comprehensive Zod schema validation
- Critical runtime variables (DATABASE_URL, NEXT_PUBLIC_APP_URL) block boot in production if missing
- Provider-specific partial-config detection (Twilio, Stripe, Resend, S3/R2)
- Build-time vs runtime variable scoping with clear error messages
- `npm run preflight` and `npm run preflight:strict` scripts for CI/CD gating

### VANTA13 AI Adapter
- Provider-agnostic adapter interface (`src/lib/vanta13/adapter.ts`)
- Structured decision output: intent, confidence, callerType, leadQuality, urgency, recommendedAction, shouldInterruptOwner, shouldBook, shouldFollowUp, shouldBlock, shouldRouteToVendor, missingFields, summary, nextMessage
- Mock adapter included for development without API keys
- Client-facing identity remains VANTA13 regardless of underlying model provider

---

## Phase 2: Business Setup

### Onboarding Flow
- Step 1: Business identity (name, industry, website, phone, email, address, service area, branding)
- Step 2: Business Pack selection (industry-specific templates)
- Step 3: Services & offers (name, description, duration, price, emergency flag)
- Step 4: Routing rules (owner phone, staff phones, hours, after-hours behavior, escalation)
- Step 5: Integrations (phone/SMS, calendar, email, Stripe, review link, website widget)
- Step 6: Launch test suite (real lead, cold caller, missed call, booking, review request, escalation)
- No tenant is marked "launched" until all smoke tests pass

### Business Packs
12 vertical templates with industry-specific logic:
1. General Business
2. Home Services
3. Professional Services
4. Medical / Wellness
5. Restaurant / Hospitality
6. Real Estate
7. Delivery / Dispatch
8. Retail / Commerce
9. Creative / Agency
10. Fitness / Coaching
11. Auto Services
12. Legal Intake

Each pack includes:
- Intake questions and flow logic
- Urgency rules and emergency keywords
- Cold-call filter rules and vendor detection patterns
- Booking defaults (duration, buffer, staff assignment)
- Follow-up sequence templates (missed call, quote, nurture, reactivation)
- Review request templates
- Dashboard label overrides
- Routing defaults (sales, support, billing, owner, vendor)

### Business Profiles
- `business_profiles` table: description, industry, website, phone, address, timezone
- `services` table: name, description, price, duration, emergency flag
- `service_areas` table: name, zip code arrays, GeoJSON geometry support

---

## Phase 3: Lead Engine

### Multi-Channel Intake
- **Phone:** Webhook via `POST /api/intake/call` with Twilio/Telnyx/SignalWire
- **SMS:** Inbound webhook via `POST /api/sms/webhook`
- **Website Chat:** Widget + API endpoint
- **Contact Forms:** Standard HTML form or API submission
- **Email:** Webhook via `POST /api/email/webhook` (Resend/Postmark/SendGrid)
- **Social DM / WhatsApp:** Extensible architecture (later)

### Lead Processing Pipeline
- `src/lib/intake.ts` — unified intake processor
- Find or create `contacts` (deduplication by phone/email per tenant)
- Find or create `conversations` (active conversation tracking per channel)
- Log every `message` with senderType (contact/ai/user) and metadata
- Create or update `leads` based on VANTA13 classification
- `lead_scores` table tracks quality + reasoning over time
- Auto-generate quotes on `request_quote` intent (see Feature Pack B)

### VANTA13 Classification Engine
- Intent detection: book_service, request_quote, emergency, ask_question, existing_customer, complaint, billing, support, vendor_pitch, cold_call, spam, wrong_number, job_applicant, partnership, unknown
- Lead quality scoring: 0-100 with confidence thresholds
- Urgency classification: low, normal, high, emergency
- Service area matching against GeoJSON polygons
- Business category matching against configured services
- Structured JSON decision output for deterministic downstream routing

### Dashboard: Leads
- Real leads captured (from database, not faked)
- Lead flow visualization
- Hot leads needing action
- Lead source performance tracking
- Quality score distribution
- Conversion rate by source

---

## Phase 4: Lead Firewall

### Cold Call / Spam Detection
- `src/lib/firewall.ts` — classification-based filtering
- Detected categories: cold callers, spam, vendor pitches, SEO agency calls, fake Google listing calls, recruiters, financing pitches, robocalls, out-of-area requests, non-buyer inquiries, repeat nuisance callers
- Blocked caller suppression with `blocked_callers` table
- Repeat offender tracking by phone number per tenant

### Vendor Trap Inbox
- `vendor_intake` table for routing vendor pitches away from owners
- Standard script: *"Vendor and partnership requests are reviewed through our vendor intake process. Please submit your details and our team will review them if there is a fit."*
- Owner interruption prevention: `shouldInterruptOwner = false` for all vendor/spam classifications
- Manual override capability for known good vendors

### Owner Interruption Rules
- Emergency → immediate owner alert (SMS + dashboard)
- High-urgency real lead → owner alert if after hours
- Vendor/spam/cold call → suppressed, no alert
- Unknown → AI clarification loop, no alert until classified

### Dashboard: Lead Firewall
- Cold Call Firewall meter (real blocked count from database)
- Vendor inquiries trapped
- Owner interruptions prevented
- Top nuisance caller list

---

## Phase 5: Booking + Follow-Up

### Booking Engine
- `appointments` table with startTime, endTime, status, deposit tracking
- `jobs` table linking leads to work orders with total amounts
- Calendar sync via Google Calendar API
- Availability rules, service duration, buffer windows
- Staff assignment per appointment
- Confirmation messages (SMS/email) on booking
- Reschedule and cancel handling with audit logging
- No-show detection and recovery workflows

### Follow-Up Autopilot
- `followup_sequences` table: named sequences with JSONB step definitions
- `followup_events` table: scheduled executions with status tracking
- Default sequences:
  - Instant reply
  - 15-minute reminder
  - 1-hour reminder
  - 24-hour follow-up
  - 3-day follow-up
  - 7-day follow-up
  - 14-day nurture
  - 30/60/90-day reactivation

### Follow-Up Types
- Missed-call recovery SMS
- Quote follow-up
- Unbooked lead follow-up
- Appointment reminder
- No-show recovery
- Past customer reactivation
- Review request (see Phase 6)
- Referral ask
- Payment reminder
- Seasonal campaign
- Winback campaign

### No-Show Deposit System
- `deposits` table with Stripe Payment Intent integration
- `deposit_amount` and `deposit_status` on appointments
- Automatic refund processing on cancellation
- Forfeiture workflow on confirmed no-show
- Rebooking assistance with credit transfer

### Dashboard: Bookings & Follow-Ups
- Appointment calendar view
- Follow-up queue with execution status
- No-show rate tracking
- Sequence enrollment counts
- Upcoming appointment reminders

---

## Phase 6: Review + Revenue

### Review + Reputation Engine
- `review_requests` table: job-linked, contact-linked, status tracking
- Happy customer → public review link (Google, Yelp, etc.)
- Unhappy customer → private feedback form
- Owner alerted on negative feedback via `owner_alerts`
- Follow-up if no review after 7 days
- Review request logged in audit trail
- Review source tracked per tenant

### Revenue Intelligence
- `src/lib/revenue.ts` — real KPI aggregation
- Dashboard panels:
  - Calls answered
  - Cold calls blocked
  - Leads captured
  - Leads booked
  - Missed calls recovered
  - Follow-ups sent
  - Reviews requested
  - Estimated revenue protected
  - Average response time
  - Conversion rate
  - Source performance
  - Owner interruptions prevented
  - Top requested services
  - Dead lead reasons
  - AI actions completed

### Content + Growth Engine
- `src/lib/content.ts` — call-to-content pipeline
- `content_ideas` table with topic, type, draft, quality score, approval workflow
- Generates: blog topics, FAQ pages, local service pages, seasonal campaigns, email newsletters, SMS promos, review-based social posts, weekly content ideas, Google Business Profile post drafts
- Content lifecycle: pending_review → approved → published
- Source attribution: call_transcript, message, review

---

## Phase 7: Billing + Gating

### Stripe Integration
- `billing_customers` table: Stripe customer ID mapping per tenant
- `billing_subscriptions` table: subscription status, plan ID, Stripe subscription ID
- `invoices` table: amount, status, Stripe invoice ID
- Webhook verification with signature validation
- Subscription status gates access to premium features

### Pricing Tiers
- **Lead Defense — $97/month**
  - Missed-call text-back, lead inbox, basic cold-call filter, basic follow-up, dashboard, manual booking link, review request link, monthly report
- **Business Operator — $197/month**
  - AI intake, call/SMS/chat/form handling, lead qualification, booking automation, business pack setup, review automation, owner alerts, customer memory, follow-up sequences
- **Autonomous Growth Operator — $297/month**
  - Advanced automations, reactivation campaigns, content ideas, revenue intelligence, vendor trap inbox, advanced routing, multi-staff assignment, weekly money report, campaign builder

### Setup Fees & Upsells
- Setup: $500 basic / $750 standard / $1,500 premium / custom enterprise
- Upsells: $750/mo follow-up management, $1,500/mo local content engine, $2,500/mo growth operator service, $3,000+/mo white-glove revenue ops
- Per-location pricing, extra AI usage, extra phone numbers, extra staff seats

### Subscription Gate Enforcement
- Inactive subscription blocks premium actions (AI intake, booking automation, advanced routing)
- Billing event logs in audit trail
- Grace period handling with owner alerts

---

## Phase 8: White-Label / Reseller

### Reseller Architecture
- `resellers` table with branding, stripeAccountId, status
- `tenants.resellerId` links child tenants to reseller accounts
- Reseller-specific branding overrides
- White-label portal option (custom domain + CSS)

### Agency Dashboard
- Multi-tenant overview for resellers
- Per-client metrics: leads, contacts, conversion, revenue
- Client suspension and transfer capability
- Usage reporting and billing aggregation
- Client export functionality

### Client-Branded Portal
- Each client sees their own branded operator and dashboard
- Logo, colors, fonts, and custom CSS from `tenant_branding`
- Custom domain support (via platform-level DNS config)
- White-label option hides VantaCore branding entirely

---

## Phase 9: Public Website

### Marketing Pages
1. **Home** — Hero with value prop, social proof, CTA
2. **How It Works** — Step-by-step flow visualization
3. **Pricing** — Three-tier comparison table with feature checklist
4. **Business Types** — Grid of 12 industry packs with use cases
5. **Lead Firewall** — Feature deep-dive with stats
6. **VANTA13 Operator** — AI capability showcase
7. **White Label / Agencies** — Reseller program overview
8. **Setup Service** — Done-for-you onboarding package
9. **Contact / Demo Request** — Lead capture form
10. **Login / Launch App** — Auth entrypoint

### SEO Optimization
- Target phrases: AI business operator, AI receptionist, missed call text back software, cold call filter, autonomous lead follow-up, AI booking assistant, business automation platform, AI front office system, white label AI receptionist, local business lead automation, autonomous CRM alternative, AI customer intake system
- AI-readable markdown docs: `VANTACORE_OVERVIEW.md`, `AI_KNOWLEDGE.md`, `SEO_KEYWORDS.md`, `BUILD_DIRECTIVE.md`, `SMOKE_TEST_PLAN.md`
- Semantic HTML, meta tags, Open Graph, structured data

---

## Killer Features Program

### Feature Pack A: Core Engine
**Revenue Rescue Autopilot** (`src/lib/jobs/revenue-rescue.ts`)
- Scans for stale leads (>2 hours old, no booking, no follow-up)
- Detects missed calls not yet recovered
- Auto-enrolls leads in recovery sequences
- Runs every 15 minutes via background job registry

**Upsell Brain** (`src/lib/upsell-brain.ts`)
- Analyzes conversation transcripts for upsell signals
- Suggests additional services based on context
- Tracks upsell conversion rates per tenant

**Reactivation Engine** (`src/lib/reactivation.ts`)
- Segments past customers by last contact date and service history
- Enqueues win-back follow-up sequences
- Tracks reactivation success rates

### Feature Pack B: Instant Quote + No-Show Deposit
**Instant Quote Engine** (`src/lib/quotes.ts`)
- Auto-generates quotes on `request_quote` intent
- Service-based pricing with unit calculations
- Quote acceptance workflow via `POST /api/quotes/accept`
- Expiration handling and follow-up sequences

**No-Show Deposit System** (`src/lib/deposits.ts`)
- Stripe Payment Intent integration for appointment deposits
- Configurable deposit amount per service
- Automatic refund on cancellation, forfeiture on no-show
- Rebooking assistance with credit transfer
- `POST /api/deposits` endpoint for creation

### Feature Pack C: Intelligence Layer
**Multi-Location Command Grid** (`src/lib/intelligence.ts`)
- Aggregates KPIs across child tenants linked via `tenants.parentId`
- Metrics: leads captured, booked, revenue protected, calls answered, missed calls recovered, cold calls blocked, response time, conversion rate
- Lagging location detection: flags locations with response time > 20% above benchmark or conversion < 80% of benchmark
- `GET /api/intelligence/grid?parentTenantId={uuid}`

**Competitor Response Radar** (`src/lib/intelligence.ts`)
- `competitor_monitors` table: tracks competitor name, URL, type (pricing/services/reviews), last observed value
- `competitor_alerts` table: change detection with severity (info/warning/critical)
- Industry benchmark comparison for response time
- Market percentile ranking (top 25%, average, below average)
- `GET /api/intelligence/radar?tenantId={uuid}`
- `GET/POST /api/intelligence/competitors`

### Feature Pack D: Experience Layer
**Premium Dashboard UI**
- Dark command center aesthetic with neon accents
- Live activity stream with real-time updates
- Lead flow visualization with Sankey-style diagrams
- Revenue protected panel with trend charts
- AI action ledger showing every autonomous decision
- Mobile-first owner view for on-the-go management

**Neural Visuals**
- Animated status indicators
- Pulse page for heartbeat-style system health
- Cold Call Firewall meter with animated gauge
- Smooth transitions via Framer Motion

### Feature Pack E: Content Autopilot 2.0
**Call-to-Content Pipeline** (`src/lib/autopilot.ts`, `src/lib/jobs/call-to-content.ts`)
- Scans call transcripts and messages for content triggers
- Auto-generates: blog topics, FAQs, local service pages, social posts, sales scripts, newsletter blocks
- Quality scoring with threshold-based queuing
- Approval workflow: pending_review → approved → published
- Runs every 6 hours via background job

### Feature Pack F: Trust Layer
**Chained Hash Proof Ledger** (`src/lib/trust.ts`)
- `proof_ledger` table with cryptographic proof chain
- Each proof contains: dataHash (SHA-256 of canonicalized payload), previousHash (hash of prior proof), proofHash (hash of entire proof payload)
- Deterministic JSON canonicalization ensures identical payloads always produce identical hashes
- Chain verification: re-computes every stored hash, validates previousHash linkage, detects duplicates and tampering
- Compliance packet export: date-bounded or full ledger export with integrity hash
- `createProof()`, `verifyChain()`, `exportCompliancePacket()` public API
- Smoke test includes tamper simulation with verified detection and restoration

### Feature Pack G: Marketplace 2.0
**Lead Exchange** (`src/lib/trade.ts`)
- `lead_exchange` table for listing unbooked leads
- PII anonymization: strips name, email, phone before listing
- Dynamic pricing based on lead quality, urgency, and service type
- `POST /api/trade/list` — list a lead for trade
- `GET /api/trade/listings` — browse available leads
- `POST /api/trade/purchase` — purchase a lead with escrow
- `GET /api/trade/stats` — marketplace analytics per tenant
- `GET /api/trade/transactions` — transaction history

**Escrow Ledger** (`escrow_ledger` table)
- Tracks payment holds, releases, and refunds
- Audit trail for every marketplace transaction

---

## Infrastructure & DevOps

### Background Job Registry (`src/lib/jobs/index.ts`)
7 registered jobs with cron scheduling:
1. **Revenue Rescue Autopilot** — every 15 minutes
2. **Call-to-Content Pipeline** — every 6 hours
3. **Reactivation Campaign** — daily at 9am
4. **Analytics Materialization** — hourly
5. **Daily Owner Digest** — daily at 8am
6. **Competitor Response Radar** — every 12 hours
7. **Trust Ledger Compaction** — weekly (Sundays at 2am)

Each job:
- Has a typed handler with dry-run support
- Logs to `automation_runs` table with input, output, error, duration
- Returns structured `JobResult` with success, processed, errors, details
- Can be triggered manually via `scripts/run-job.ts`

### Storage Layer (`src/lib/storage.ts`)
- Provider-agnostic upload interface
- Supports Cloudflare R2 and AWS S3
- Environment-gated: only loads provider SDK if credentials are present
- Used for: quote photos, customer files, branding assets, content media

### Health Endpoint (`src/app/api/health/route.ts`)
- **Liveness:** `GET /api/health` — always 200 if server is up
- **Readiness:** `GET /api/health?ready=1` — database connectivity + critical env validation
- **Deep Ping:** `GET /api/health?deep=1` — database + all configured providers (Twilio, Stripe, AI, storage) + job health
- Bearer token protection for deep probes
- Returns JSON with status, version, environment, timestamp, latency, and per-check results

### Deployment Preflight (`scripts/deployment-preflight.js`)
- Validates all required environment variables before deployment
- Checks for partial provider configurations
- Validates database connectivity
- Verifies webhook endpoint accessibility
- Strict mode blocks deployment on any failure
- Integrated into CI/CD pipeline via `npm run preflight:strict`

---

## Database Schema

### Foundation
| Table | Purpose |
|-------|---------|
| `tenants` | Multi-tenant root with slug, status, parentId, resellerId |
| `tenant_settings` | Key-value configuration per tenant |
| `tenant_branding` | Logo, colors, fonts, custom CSS |
| `users` | Tenant-scoped user accounts |
| `user_roles` | Granular RBAC permission sets |

### Business
| Table | Purpose |
|-------|---------|
| `business_profiles` | Industry, website, phone, address, timezone |
| `business_packs` | Industry template config (JSONB) |
| `services` | Service name, description, price, duration, emergency flag |
| `service_areas` | Service area name, zip codes, GeoJSON geometry |

### Leads & Conversations
| Table | Purpose |
|-------|---------|
| `contacts` | Customer/prospect contact info |
| `conversations` | Active conversation tracking per channel |
| `messages` | Individual messages with sender type and metadata |
| `calls` | Call records with SID, direction, status, duration, recording URL |
| `call_transcripts` | Transcript text and AI summary |
| `leads` | Lead status, urgency, quality score, metadata |
| `lead_scores` | Scoring history with reasons |
| `quotes` | Quote amount, details, status, expiration |

### Jobs & Appointments
| Table | Purpose |
|-------|---------|
| `jobs` | Work orders linked to leads and contacts |
| `appointments` | Scheduled appointments with start/end time, deposit tracking |
| `tasks` | Internal task tracking with assignment and due dates |

### Automation & AI
| Table | Purpose |
|-------|---------|
| `followup_sequences` | Named sequences with JSONB step definitions |
| `followup_events` | Scheduled follow-up executions |
| `automation_runs` | Background job execution records |
| `ai_actions` | Every AI decision with input, decision, result, confidence |
| `owner_alerts` | Real-time owner notifications with read status |

### Firewall & Compliance
| Table | Purpose |
|-------|---------|
| `blocked_callers` | Suppressed phone numbers with reason |
| `vendor_intake` | Vendor pitch records and status |
| `consent_events` | SMS/email/recording consent tracking |
| `opt_outs` | Do-not-contact records per channel |
| `proof_ledger` | Immutable chained hash proof records |

### Reviews & Content
| Table | Purpose |
|-------|---------|
| `review_requests` | Review request status, rating, source tracking |
| `content_ideas` | Auto-generated content with approval workflow |

### Intelligence & Marketplace
| Table | Purpose |
|-------|---------|
| `competitor_monitors` | Competitor tracking with URL and type |
| `competitor_alerts` | Detected changes with severity |
| `lead_exchange` | Marketplace listings with anonymized data |
| `lead_trade_transactions` | Purchase and sale records |
| `escrow_ledger` | Payment hold/release tracking |

### Billing
| Table | Purpose |
|-------|---------|
| `billing_customers` | Stripe customer ID mapping |
| `billing_subscriptions` | Subscription status and plan ID |
| `invoices` | Invoice amount and status |

### Integrations & Audit
| Table | Purpose |
|-------|---------|
| `integrations` | Provider config (JSONB) and status |
| `webhook_events` | Received webhook payloads with processing timestamp |
| `audit_logs` | Immutable audit trail of all actions |

---

## API Surface

### Intake
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/intake/message` | Message/SMS/chat/form intake |
| POST | `/api/intake/call` | Voice call intake |

### Webhooks
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/voice/webhook` | Twilio/Telnyx voice events |
| POST | `/api/sms/webhook` | Twilio/Telnyx SMS events |
| POST | `/api/email/webhook` | Resend/Postmark email events |

### AI
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/vanta13/classify` | VANTA13 intent classification |
| POST | `/api/vanta13/act` | VANTA13 action execution |

### Leads & Quotes
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/leads` | Create/update lead |
| PATCH | `/api/leads/:id` | Update lead status |
| POST | `/api/quotes` | Generate instant quote |
| POST | `/api/quotes/accept` | Accept a quote |

### Appointments
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/appointments` | Create appointment |
| PATCH | `/api/appointments/:id` | Update/cancel appointment |
| POST | `/api/appointments/rebook` | Rebook no-show |
| POST | `/api/deposits` | Create deposit intent |

### Follow-ups & Reviews
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/followups/run` | Trigger follow-up sequences |
| POST | `/api/reviews/request` | Send review request |

### Vendor & Alerts
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/vendor-intake` | Submit vendor pitch |
| POST | `/api/alerts/owner` | Create owner alert |

### Dashboard & Intelligence
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/summary` | Dashboard KPI aggregation |
| GET | `/api/intelligence/grid` | Multi-location command grid |
| GET | `/api/intelligence/radar` | Competitor response radar |
| GET/POST | `/api/intelligence/competitors` | Competitor CRUD |
| GET | `/api/intelligence/core-engine` | Core engine metrics |

### Content
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/content` | Content ideas list/create |
| POST | `/api/content/:id/approve` | Approve content |
| POST | `/api/content/:id/publish` | Publish content |
| POST | `/api/content/:id/reject` | Reject content |

### Marketplace
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/trade/list` | List lead for trade |
| GET | `/api/trade/listings` | Browse marketplace |
| POST | `/api/trade/purchase` | Purchase lead |
| GET | `/api/trade/stats` | Marketplace analytics |
| GET | `/api/trade/transactions` | Transaction history |

### Billing & Audit
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/billing/webhook` | Stripe webhook handler |
| GET | `/api/audit` | Audit log query |
| GET | `/api/health` | System health probes |

---

## Testing & QA

### Smoke Tests
All core flows verified by automated scripts:

| Script | Flows Tested |
|--------|--------------|
| `scripts/smoke-test.ts` | Basic intake, lead creation, audit logging |
| `scripts/smoke-test-phase5.ts` | Booking flow, deposit creation, no-show recovery |
| `scripts/intake-test.ts` | Multi-channel intake (SMS, chat, email) |
| `scripts/test-intake.ts` | End-to-end intake with classification |
| `scripts/test-conversion-flows.ts` | Full conversion funnel: intake → lead → quote → booking |
| `scripts/test-trust.ts` | Trust layer: genesis proof, chain linkage, tamper detection, compliance export |
| `scripts/autopilot-test.ts` | Content autopilot pipeline |

### QA Matrix Status
| Category | Status |
|----------|--------|
| Core Platform (auth, onboarding, dashboard) | ✅ |
| Lead Engine (capture, classification, scoring) | ✅ |
| Lead Firewall (cold call detection, vendor trap) | ✅ |
| Booking + Follow-Up (appointments, sequences, no-show) | ✅ |
| Reviews + Revenue (requests, dashboard KPIs) | ✅ |
| Killer Features (A-G) | ✅ |
| Infrastructure (jobs, storage, health, preflight) | ✅ |

---

## Deployment

### Platforms
- **Netlify:** Serverless functions with environment variable injection
- **Cloudflare Pages:** Edge functions with `nodejs_compat` flag
- **Self-hosted:** Docker-ready with health probes

### Pre-Deploy Checklist
1. Run `npm run preflight:strict`
2. Verify `DATABASE_URL` connectivity
3. Confirm all `[BUILD]` variables are set
4. Run smoke tests against staging
5. Verify webhook endpoint accessibility
6. Check DNS/SSL for custom domains
7. Confirm Stripe webhook signing secret

### Rollback Plan
- Netlify: publish previous deploy from Deploys panel
- Cloudflare Pages: rollback to previous deployment
- Database: evaluate if reverse migration is needed before code rollback

---

## Compliance & Security

### Data Protection
- Consent logging for SMS, email, and call recording
- STOP keyword handling for SMS opt-out
- Do-not-contact list per channel
- Data export capability for GDPR/CCPA
- Data deletion support with cascading cleanup

### Audit Requirements
- Every autonomous action logged with tenant ID, actor, input, decision, action, timestamp, result, error, audit ID
- Structured decision output for all AI interactions
- Immutable proof ledger for compliance verification
- Audit log query API with filtering

### Security
- Webhook signature verification (Twilio, Stripe, Resend)
- Health endpoint bearer token protection
- Role-based access control on all dashboard surfaces
- Environment variable validation blocks deployment with missing secrets
- No fake human impersonation — VANTA13 identity is transparent

---

## Build Integrity

**No-Theater Rules Enforced:**
- Phone is not ready unless webhook path exists ✅
- SMS is not ready unless inbound/outbound paths exist ✅
- Booking is not ready unless appointments persist ✅
- AI is not ready unless structured decisions are logged ✅
- Follow-up is not ready unless sequence runs persist ✅
- Billing is not ready unless subscription state gates access ✅
- Cold-call filter is not ready unless vendor/spam routes differently from real leads ✅
- Review engine is not ready unless request records persist ✅
- Dashboard is not ready unless values come from real data ✅
- Integration is not ready unless missing env vars fail loudly ✅
- Launch is not ready unless smoke tests prove core flows ✅

---

*VantaCore is the business nervous system. VANTA13 is the autonomous operator. Skyes Over London is the tech behind the business.*
