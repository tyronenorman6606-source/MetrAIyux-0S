# 0S Business Card Factory Engine

## Purpose

The Business Card Factory is the 0S operating app for creating live client-specific cards in front of prospects. It connects Valley Verified directory records, Skyes Over London contact information, ConnectLog handoffs, Relay13 proof lanes, QR cards, SkyeMerit offers, and future OpenAI gateway copy generation.

## Current Working Lane

- Source data: `/valley-verified/data/businesses-lite.json`
- App route: `/business-card-factory/`
- Gated API route: `/api/business-card-factory/status`
- Gateway copy route: `POST /api/business-card-factory/copy-pass`
- Handoff target: `/connectlog-v7.7-relay13-operator-proof/app.html`
- Client proof: selected Valley Verified profile URL
- Offer: `31% SkyeMerit` activation credit for seven days from the business-card scan
- Company contact saved into ConnectLog:
  - Gray direct: `grayskyes@solenterprises.org`
  - Direct phone: `1-(800)-484-4788`
  - Company main: `1-(800)-484-4783`
  - PR: `connectedskyes@solenterprises.org`
  - Media Over London: `MediaOverLondon@solenterprises.org`
  - SkyeMusicNexus: `SkyeMusicNexus@solenterprises.org`
  - 0S support: `metraiyux-0s@solenterprises.org`
  - SkyEmail support: `skyemail@solenterprises.org`

## Operator Flow

1. Open the gated factory inside the 0S.
2. Search the Valley Verified directory by client name, city, category, niche, or ZIP.
3. Select the client and let the factory fill card fields, priority code, client page, and SkyeMerit window.
4. Print or save the card.
5. Let the client scan the QR.
6. ConnectLog opens with the client context, Gray's company contact packet, legal/contact links, and SkyeMerit offer saved into the local relationship vault.
7. Use Relay13/ConnectLog to continue the conversation and record proof.

## ConnectLog Handoff Contract

Every generated card QR opens ConnectLog with these URL parameters:

- `source=business-card-factory`
- `clientId`
- `business`
- `city`
- `category`
- `contact`
- `priorityCode`
- `valleyUrl`
- `skyemerit=31`
- `expires=<YYYY-MM-DD>`
- `operator=Gray London Skyes`
- `operatorEmail=grayskyes@solenterprises.org`
- `operatorPhone=1-(800)-484-4788`

ConnectLog reads that packet on first open, stores Gray London Skyes as a pinned company contact, stores the selected Valley client as a high-priority client contact, displays the welcome panel, and keeps links to the client page, LegalSkyes, Media Over London, SkyeMusicNexus, 0S support, and SkyEmail.

## Gateway Copy Lane

The OpenAI/Kaixu gateway is server-side only. The browser app posts selected client facts to the 0S route:

```txt
POST /api/business-card-factory/copy-pass
Authorization: shared FS27/SkyGate bearer
```

The route can return:

- short card script
- owner-facing pitch
- follow-up message
- ConnectLog welcome paragraph
- Media Over London offer variant
- SkyeMerit activation copy

Provider keys stay in the 0S Worker or FS27-controlled backend, never in this app. If the gateway token is not configured or the upstream gateway is temporarily unavailable, the route returns deterministic operator copy instead of exposing provider keys or breaking the in-store flow.

## Stress Proof Scope

The live stress proof for this lane must cover:

- public marketing card page loads and exposes Valley Verified search
- public Valley directory snapshot contains Bob and at least 300 records
- unauthenticated `/business-card-factory/` redirects to the shared FS27/Free99 gate
- authenticated `/business-card-factory/` renders the factory
- authenticated `/valley-verified/data/businesses-lite.json` returns the live gated directory
- authenticated `/api/business-card-factory/status` reports the gateway lane without secrets
- authenticated `/api/business-card-factory/copy-pass` handles concurrent client copy-pass requests
- authenticated ConnectLog handoff URL renders the app and includes the contact-packet code path
- QR payload includes client ID, Valley page URL, 31% SkyeMerit, seven-day expiry, Gray email, and phone

## Auth Boundary

The app is a mounted 0S surface and must stay behind `enforceZeroOsGate`. It must use the shared FS27/SkyGate/Free99 session helpers for any future mutation route.
