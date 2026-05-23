# VantaCore Build Directive

**Product:** VantaCore by Skyes Over London  
**Operator/AI Layer:** VANTA13  
**Category:** Autonomous Business Operator Infrastructure  
**Core Promise:** Answer, filter, book, follow up, recover, route, and grow  
**Main Angle:** Skyes Over London becomes the tech behind any business  

## 1. Core Rundown

VantaCore is a universal autonomous business operator platform. It is not just a CRM, chatbot, or AI receptionist. It is the operating layer between a business and the outside world.

Every business deals with calls, leads, spam, vendors, customers, bookings, follow-ups, reviews, content, and revenue opportunities. VantaCore handles those flows automatically.

Each client gets a branded deployment:
- Clear Line Plumbing → Clear Line Operator powered by VantaCore
- Law Firm → Case Intake Operator powered by VantaCore
- Med Spa → Client Booking Operator powered by VantaCore
- Delivery Company → Dispatch Operator powered by VantaCore
- Restaurant → Reservation Operator powered by VantaCore

Same core platform. Different business rules. Different skin. Different Business Pack.

## 2. Positioning

**Public line:**  
VantaCore by Skyes Over London  
Autonomous business infrastructure for companies that cannot afford to miss money.

**Operator line:**  
VANTA13  
The autonomous operator that filters noise, captures demand, books revenue, and follows up until the money is won.

**Sales line:**  
VantaCore answers calls, filters cold callers, captures leads, books customers, follows up automatically, requests reviews, and gives every business a revenue command center.

**Main differentiator:**  
Most CRMs store contacts after the business already did the work. VantaCore does the work first.

## 3. Product Doctrine

VantaCore must be a multi-tenant SaaS platform.

Each tenant/business needs:
- Business profile
- Branding
- Business category
- Services/offers
- Intake questions
- Service areas
- Calendar rules
- Cold-call filter rules
- Booking rules
- Follow-up sequences
- Review request settings
- Owner escalation rules
- Customer records
- Conversation history
- Billing status
- Audit logs
- AI action records

## 4. System Layers

| Layer | Description |
|-------|-------------|
| **VantaCore Platform** | Main SaaS foundation: tenants, users, billing, dashboards, business records, integrations, automations |
| **VANTA13 Operator** | AI execution layer. Classifies intent, asks questions, filters junk, books appointments, creates leads, sends follow-ups, escalates important events |
| **Business Packs** | Vertical templates for different industries. Each pack includes intake logic, urgency rules, cold-call filters, booking defaults, follow-up templates, review templates, and dashboard labels |
| **Client-Branded Portal** | Each client sees their own branded operator and dashboard |

## 5. Required Business Packs

- General Business
- Home Services
- Professional Services
- Medical/Wellness
- Restaurant/Hospitality
- Real Estate
- Delivery/Dispatch
- Retail/Commerce
- Creative/Agency
- Fitness/Coaching
- Auto Services
- Legal Intake

## 6. Core Modules

### Business Command Center
Dashboard must show real metrics from the database:
- Real leads captured
- Calls answered
- Missed calls recovered
- Cold callers blocked
- Appointments booked
- Follow-ups sent
- Reviews requested
- Revenue opportunities protected
- Hot leads needing action
- Vendor inquiries
- Customer conversations
- Automation health
- Integration status
- Billing status

### Lead Firewall
Filters: cold callers, spam, vendor pitches, SEO agency calls, fake Google listing calls, recruiters, financing pitches, robocalls, out-of-area requests, non-buyer inquiries, repeat nuisance callers.

Classifications: real lead, existing customer, emergency, quote request, appointment request, support issue, billing issue, vendor, spam, cold call, unknown, escalate, block/suppress.

### AI Intake Operator
Supported channels: Phone, SMS, website chat, contact form, email, Social DM (later), WhatsApp (later).

Collects: name, phone, email, requested service, location, urgency, preferred time, notes, files/photos, lead source, consent status, next action.

### Booking Engine
Supports: service appointment, consultation, estimate, dispatch job, reservation, discovery call, sales call, pickup/delivery, event booking, repair appointment, inspection, intake meeting.

Needs: calendar sync, availability rules, service duration, buffer windows, staff assignment, confirmation messages, reschedule/cancel handling, no-show follow-up, owner/staff alerts.

### Follow-Up Autopilot
Default sequence: instant reply, 15-minute reminder, 1-hour reminder, 24-hour follow-up, 3-day follow-up, 7-day follow-up, 14-day nurture, 30/60/90-day reactivation.

Types: missed-call recovery, quote follow-up, unbooked lead follow-up, appointment reminder, no-show recovery, past customer reactivation, review request, referral ask, payment reminder, seasonal campaign, winback campaign.

### Customer Memory Layer
Customer profiles include: contact info, conversation history, lead source, appointments, jobs/orders/services, status/tags, notes/files, quotes, payments, reviews, complaints, follow-up history, AI summary, next recommended action.

### Review + Reputation Engine
Rules: happy customer → public review link, unhappy customer → private feedback, owner alerted on negative feedback, follow-up if no review, review request logged, review source tracked.

### Vendor Trap Inbox
Cold callers and vendors are routed away from the owner. Detect vendor intent, prevent owner interruption, route to vendor intake, log vendor details, mark as non-revenue, suppress future interruptions, allow manual override.

### Revenue Intelligence
Shows: calls answered, cold calls blocked, leads captured, leads booked, missed calls recovered, follow-ups sent, reviews requested, estimated revenue protected, average response time, conversion rate, source performance, owner interruptions prevented, top requested services, dead lead reasons, AI actions completed.

### Content + Growth Engine
Upsell lane: blog topics from real questions, FAQ pages, local service pages, seasonal campaigns, email newsletters, SMS promos, review-based social posts, weekly content ideas, Google Business Profile post drafts.

## 7. Preferred Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Backend:** Next.js App Router API routes, Cloudflare Workers
- **Database:** Neon Postgres with Drizzle ORM
- **Auth:** Clerk, Supabase Auth, or custom JWT
- **Voice/SMS:** Twilio, Telnyx, or SignalWire
- **Email:** Resend, Postmark, SendGrid, or SMTP
- **Calendar:** Google Calendar
- **Billing:** Stripe
- **Storage:** Cloudflare R2 or Supabase Storage
- **AI:** Provider-agnostic VANTA13 adapter
- **Deployment:** Netlify or Cloudflare Pages
- **Background jobs:** Cloudflare Queues, QStash, or scheduled functions
- **Webhooks:** Signed verification required

VANTA13 must be provider-agnostic. Client-facing AI identity remains VANTA13 even if the underlying model changes.

## 8. UI Directive

The UI must feel like a premium Skye command system, not cheap SaaS.

Required style:
- Dark premium interface
- Neon highlights
- Command center layout
- Live activity stream
- Lead flow visualization
- Cold Call Firewall meter
- Revenue protected panel
- AI action ledger
- Business Pack selector
- Client branding controls
- Mobile-first owner view
- Real empty states
- No fake analytics

## 9. Pricing

| Plan | Price | Key Features |
|------|-------|--------------|
| Lead Defense | $97/mo | Missed-call text-back, lead inbox, basic cold-call filter, basic follow-up, dashboard, manual booking link, review request link, monthly report |
| Business Operator | $197/mo | AI intake, call/SMS/chat/form handling, lead qualification, booking automation, Business Pack setup, review automation, owner alerts, customer memory, follow-up sequences |
| Autonomous Growth Operator | $297/mo | Advanced automations, reactivation campaigns, content ideas, revenue intelligence, Vendor Trap Inbox, advanced routing, multi-staff assignment, weekly money report, campaign builder |

Setup fees: $500 basic, $750 standard, $1,500 premium, custom enterprise.

## 10. White-Label / Reseller Path

Required: platform owner admin, reseller accounts, reseller client tenants, reseller branding, client branding, white-label portal option, usage reporting, agency dashboard, client export, client suspension, client transfer.

This lets Skyes Over London sell VantaCore directly and also let agencies resell it.

## 11. Compliance Rules

Required: consent logging, SMS opt-out handling, STOP keyword support, call recording disclosure support, do-not-contact list, audit logs for automated messages, human review mode, data export, data deletion support, role-based access, billing event logs, webhook verification, no hidden AI actions, no fake human impersonation.

## 12. No-Theater Rules

- Phone is not ready unless webhook path exists
- SMS is not ready unless inbound/outbound paths exist
- Booking is not ready unless appointments persist
- AI is not ready unless structured decisions are logged
- Follow-up is not ready unless sequence runs persist
- Billing is not ready unless subscription state gates access
- Cold-call filter is not ready unless vendor/spam routes differently from real leads
- Review engine is not ready unless request records persist
- Dashboard is not ready unless values come from real data
- Integration is not ready unless missing env vars fail loudly
- Launch is not ready unless smoke tests prove core flows

## 13. Final Directive

Build VantaCore by Skyes Over London as the universal autonomous business infrastructure platform.

The system must let Skyes Over London sell, deploy, and manage autonomous business operators for any type of business.

Sell it three ways:
1. Direct SaaS to businesses
2. Setup + done-for-you growth service
3. White-label infrastructure for agencies/operators

**VantaCore is the business nervous system.**  
**VANTA13 is the autonomous operator.**  
**Skyes Over London is the tech behind the business.**
