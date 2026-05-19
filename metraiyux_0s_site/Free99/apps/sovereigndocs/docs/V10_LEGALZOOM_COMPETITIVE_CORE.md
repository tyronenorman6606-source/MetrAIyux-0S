# SovereignDocs v10 — Competitive Core Build

v10 moves SovereignDocs beyond a large template library into the commercial lanes users pay for: business formation prep, compliance tracking, registered/statutory agent referral, business license register, EIN official-source prep, trademark/IP prep, estate/life-planning worksheet lanes, partner legal access, e-sign/vault, and order tracking.

## What v10 is

SovereignDocs is a document automation, official-source prep, partner-routing, and workflow-tracking platform. It is built to inherit upstream auth and does not include fake login/auth.

## What v10 is not

SovereignDocs is not a law firm, does not provide legal advice, does not guarantee filing acceptance, does not guarantee legal sufficiency, and does not take responsibility for partner outcomes. Any professional relationship, if one is formed, is between the user and the legal partner or provider under that partner's own terms.

## Core lanes added

- Business Formation OS
- Compliance Command Center
- Registered Agent Referral
- Trademark/IP Prep
- Estate & Life Planning Lane
- Partner Legal Access Plans
- E-sign Lite / Vault / Order Tracking

## API endpoints added

- `GET /api/core-products/catalog`
- `GET /api/business-formation/products`
- `POST /api/business-formation/intake`
- `GET /api/compliance/obligations`
- `POST /api/compliance/monitor/create`
- `GET /api/registered-agent/program`
- `POST /api/registered-agent/referral`
- `GET /api/trademark/services`
- `POST /api/trademark/intake`
- `GET /api/estate-planning/services`
- `POST /api/estate-planning/intake`
- `GET /api/legal-plans`
- `POST /api/legal-plans/enroll-intent`
- `POST /api/esign/envelopes/create`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/status`

## Enforcement

Commercial intakes require acknowledgments for not-legal-advice, no outcome guarantee, official/partner final action, and user fact responsibility. Registered-agent and legal-plan routes require additional provider/partner boundary acknowledgments.
