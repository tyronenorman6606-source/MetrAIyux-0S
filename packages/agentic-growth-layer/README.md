# Agentic Growth Layer

API-first runtime for websites that keep improving from market data instead of sitting still.

This is intentionally not an MCP. It is a product/API lane that a client stack can call from a server function, CMS plugin, build job, Cloudflare Worker, Netlify Function, or private backend.

## What It Does

- Ingests GSC Search Analytics rows, SEMrush-style keyword exports, live SERP snapshots, seed keywords, competitor URLs, and site crawl/page inventory.
- Works without Search Console or an owned domain through `no_gsc_preview_or_no_domain` mode.
- Turns raw market signals into prioritized developer-agent tasks for nav nodes, internal links, FAQs, service pages, location pages, proof pages, CTAs, schema, and structure.
- Returns receipts, risk flags, approval policy, experiment plans, and optional static-site patch manifests.
- Does not auto-publish by default. Client adapters decide how drafts become commits, CMS edits, or deploys.

## Local API

```bash
cd packages/agentic-growth-layer
npm run serve
```

Health:

```bash
curl http://127.0.0.1:4327/api/agentic-growth/health
```

Run a cycle:

```bash
curl -X POST http://127.0.0.1:4327/api/agentic-growth/v1/cycles \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <fs27-gate-token>' \
  --data @examples/no-domain-cycle.json
```

Production auth is FS27/SkyGate/Free99 only. Do not add a per-app API key, owner password, or client admin password. The 0S mount lives at `/agentic-growth-layer/` with the API at `/api/agentic-growth`; both are protected by the main Worker gate. Standalone deployments must validate `Authorization`, `x-free99-gate-session`, `x-skye-gate-session`, `x-skygate-session`, or `x-admin-token` against FS27 introspection.

For local-only development, `AGENTIC_GROWTH_AUTH_MODE=local-dev-open` is ignored unless `AGENTIC_GROWTH_ALLOW_DEV_OPEN=1` is also set.

## Endpoints

- `GET /api/agentic-growth/health`
- `GET /api/agentic-growth/v1/schema`
- `POST /api/agentic-growth/v1/cycles`
- `POST /api/agentic-growth/v1/cycles/pull`
- `POST /api/agentic-growth/v1/ingest`
- `POST /api/agentic-growth/v1/fallback/brief`
- `POST /api/agentic-growth/v1/adapters/static-site/patch`

## No-GSC Mode

Clients can start before they buy a domain or verify Search Console by sending:

- Business name, industry, services, and target locations.
- Netlify/free-hosting preview URL if one exists.
- Existing page inventory or a lightweight crawl.
- Seed keywords.
- Competitor URLs.
- Optional live SERP snapshots from a provider.

The system will draft opportunities with lower confidence and stricter review gates. Once the domain exists, connect GSC and the same API call becomes a connected growth cycle.

## Data Source Notes

- GSC adapter expects Search Analytics-style rows with `keys`, `clicks`, `impressions`, `ctr`, and `position`.
- SEMrush adapter accepts structured rows or CSV-like exports with keyword, volume, KD, position, URL, domain, or competitor columns.
- SERP adapter expects grouped keyword results with organic items, People Also Ask questions, and related searches.
- Connected pull mode can call Google Search Console, SEMrush, and DataForSEO when server-side credentials are present. Never send provider secrets from browser code.

Official references used for adapter direction:

- Google Search Console Search Analytics query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Semrush API overview: https://developer.semrush.com/api/basics/introduction/
- DataForSEO SERP API: https://dataforseo.com/apis/serp-api/

## Monetization Lane

Suggested packaging:

- Starter: no-domain/fallback cycles, preview-site structure, seed keyword clustering, first service/location/FAQ drafts.
- Growth: GSC, SEMrush, SERP ingestion, recurring monitoring, proposal API, static patch manifests.
- Operator: approved auto-apply adapters, deploy hooks, live browser proof receipts, and monthly growth ledger.

Billable event: `growth_cycle.created`.

The response includes `plan.monetization.suggestedUnits` so billing can meter source rows, premium source usage, and generated opportunity count.
