# SovereignDocs API Contract

SovereignDocs can run as a static platform or as an optional Node API platform.

Static mode remains valid for Netlify drop deployment. API mode is for local server persistence, future Postgres/D1/R2 adapters, and upstream-auth integration.

## Run API Mode

```bash
npm start
```

Default URL:

```txt
http://localhost:8787
```

## Auth Boundary

SovereignDocs does not include built-in auth. It expects upstream identity from a gateway such as Omega Skygate.

Supported identity headers in API mode:

```txt
x-sovereigndocs-user: {"id":"user_123","name":"Operator","organization":"Skyes Over London"}
x-omega-skygate-user: {"id":"sky_123","name":"Operator","roles":["founder"]}
```

If neither header is present, the API uses `operator-local-api` mode for local development.

## Endpoints

### GET /api/health

Returns platform health, template count, storage adapter, and auth mode.

### GET /api/session

Returns the parsed upstream/local session.

### GET /api/templates

Returns `template-library/manifest.json`.

### GET /api/templates/:id

Returns the template bundle:

- manifest item
- `template.json`
- `questions.json`
- `document.md`
- `preview.md`
- `disclaimer.md`

### POST /api/documents/assemble

Request:

```json
{
  "templateId": "service-agreement",
  "answers": {
    "party_one_name": "Example Provider"
  },
  "signature": "Example Name",
  "acceptBoundary": true
}
```

Response includes assembled Markdown, missing required fields, risk level, template version, and export permission state.

### GET /api/vault

Returns local JSON-file persisted vault records from `data/vault.json`.

### POST /api/vault

Persists a document to the local API vault.

Required fields:

```json
{
  "title": "Service Agreement",
  "content": "# Service Agreement..."
}
```

Recommended fields:

```json
{
  "templateId": "service-agreement",
  "templateVersion": "1.0.0",
  "riskLevel": "medium",
  "disclaimerAccepted": true,
  "answers": {},
  "sourceFolder": "contracts-agreements/service-agreement"
}
```

### GET /api/vault/:id

Returns one persisted vault document.

### DELETE /api/vault/:id

Deletes one local persisted vault document.

### GET /api/audit

Returns server-side audit events from `data/audit.json`.

### POST /api/audit

Adds a server-side audit event.

### DELETE /api/audit

Clears the server-side audit log.

## Production Adapter Targets

Replace the local JSON storage with one of these:

- Neon/Postgres for relational document records
- Cloudflare D1 for low-cost relational storage
- Cloudflare R2 or S3-compatible storage for generated files
- Cloudflare Queues for async export jobs
- Stripe for checkout
- Resend/SES/MailChannels for delivery

## Legal Boundary

The API must preserve the public product boundary: SovereignDocs is document automation and self-help paperwork infrastructure, not a law firm, not legal advice, and not attorney review.


## v4 Dataset Endpoints

These endpoints are available only in optional Node API mode (`npm start`). Static Netlify drop mode still serves the same pages and JSON files directly where applicable.

- `GET /api/packs` — returns document packet workflow bundles from `data/packs.json`.
- `GET /api/packs/:id` — returns one packet.
- `GET /api/industries` — returns industry workspaces from `data/industries.json`.
- `GET /api/industries/:id` — returns one industry workspace.
- `GET /api/jurisdictions` — returns state/jurisdiction workspaces from `data/jurisdictions.json`.
- `GET /api/jurisdictions/:id` — returns one jurisdiction workspace.
- `POST /api/documents/render-html` — assembles a template and returns Markdown plus simple HTML for downstream preview/export systems.

Boundary: none of these endpoints provide legal advice, attorney review, or enforceability guarantees.
