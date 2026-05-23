# Agentic Growth Layer Product Architecture

Updated: 2026-05-21

## Product Position

Agentic Growth Layer is the sellable API lane for self-improving websites.

It is not an MCP. The MCP can help build or audit internal assets, but customers should integrate this product through HTTP APIs, server functions, CMS plugins, build hooks, Workers, or repo adapters.

The core promise:

> A website becomes a monitored growth system. Market agents ingest search and SERP data, planning agents turn it into safe site improvements, developer agents produce stack-specific patches, and proof agents keep risky changes behind review until they are verified.

## Runtime Loop

1. **Ingest**
   - GSC Search Analytics rows when the client has a verified property.
   - SEMrush or other SEO platform keyword/competitor exports.
   - Live SERP snapshots from a compliant SERP provider.
   - Site crawl/page inventory.
   - Seed keywords, services, locations, competitors, and preview URLs.

2. **Normalize**
   - Convert every source into common keyword, page, competitor, question, and confidence records.
   - Mark the cycle mode:
     - `connected_search_console`
     - `market_data_without_gsc`
     - `no_gsc_preview_or_no_domain`
     - `seed_only`

3. **Plan**
   - Score opportunities for service pages, location pages, FAQs, internal links, nav nodes, CTAs, proof pages, schema, and content refreshes.
   - Assign each opportunity to agent lanes.
   - Add approval flags when data confidence is low, proof claims are involved, or the industry is high-trust/regulated.

4. **Patch**
   - Return stack-neutral developer tasks.
   - Optionally return adapter-specific patch manifests.
   - Default is proposal-only. Auto-apply must be deliberately enabled in a client adapter.

5. **Prove**
   - Production-facing changes are not considered ready until live browser proof exists.
   - Proof receipts should include URL, route states, interactions, screenshots, console/network checks, and failures.

## No-Domain / No-GSC Lane

This is important for new businesses, free-hosted prototypes, and clients who have not bought or verified a domain.

The fallback lane can still operate from:

- A Netlify, Cloudflare Pages, Vercel, or other preview URL.
- Business services and target locations.
- Seed keywords.
- Competitor URLs.
- Public SERP snapshots.
- A lightweight page inventory.

The fallback lane can draft:

- Service and location page outlines.
- FAQ sections from SERP questions.
- Internal link maps.
- CTA improvements.
- Nav-node recommendations.
- Proof page shells.

The fallback lane should not auto-publish proof claims or strong SEO claims. It should mark confidence clearly and ask for GSC connection once the domain exists.

## API Surface

Package path:

```bash
packages/agentic-growth-layer
```

Local run:

```bash
cd packages/agentic-growth-layer
npm run serve
```

Endpoints:

- `GET /api/agentic-growth/health`
- `GET /api/agentic-growth/v1/schema`
- `GET /api/agentic-growth/v1/ledger`
- `GET /api/agentic-growth/v1/projects`
- `POST /api/agentic-growth/v1/projects`
- `POST /api/agentic-growth/v1/projects/:id/schedule`
- `POST /api/agentic-growth/v1/cycles`
- `POST /api/agentic-growth/v1/cycles/pull`
- `POST /api/agentic-growth/v1/ingest`
- `POST /api/agentic-growth/v1/fallback/brief`
- `POST /api/agentic-growth/v1/adapters/static-site/patch`

## Key Gate 13th Source Credentials

Connected source pulls now use Key Gate 13th credential refs instead of browser-supplied raw provider secrets.

- Key Gate operator surface: `/key-gate-13th/`
- Key Gate API base: `/api/key-gate-13th`
- Raw provider keys are accepted only by Key Gate create/rotate, encrypted server-side, and never returned.
- Agentic Growth accepts `credentialRef` / `secretRef` for GSC, SEMrush, and DataForSEO.
- `POST /api/agentic-growth/v1/cycles/pull` rejects raw `accessToken`, `apiKey`, `login`, or `password` fields in browser payloads.
- Scheduled projects bind refs and queue due monitor cycles through `SITE_TASK_QUEUE`.

See `docs/KEY_GATE_13TH_ARCHITECTURE.md` for the custody model.

## Auth And 0S Boundary

Production auth is FS27/SkyGate/Free99 only.

The 0S operator surface is mounted at `/agentic-growth-layer/`, and the same-domain API is mounted at `/api/agentic-growth`. Both pass through `enforceZeroOsGate` before assets or runtime handlers. Do not create a new founder/admin/client password, API key lane, or app-local auth table. Standalone hosts must validate the shared gate bearer through FS27 introspection or trust a gate-verified 0S edge only when that edge has already called `requireGateAuth`.

Live 0S deployment:

- Worker version: `9f3a7f26-685f-4be1-a4b8-11f823f4926b`
- Operator URL: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/agentic-growth-layer/`
- API base: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/agentic-growth`
- Browser proof: `test-artifacts/agentic-growth-layer/0s-live-proof/receipt.json`
- Gate proof: unauthenticated page redirects to `/admin/login.html?return=...`; unauthenticated API returns `401` with `x-0s-gate: fs27-required`; authenticated desktop/mobile operator workflows pass with zero console errors, zero failed requests, zero HTTP errors, zero broken images, and zero horizontal overflow.

## Agent Lanes

- Market Intake Agent: normalizes GSC, SEMrush, seed keyword, and source confidence.
- SERP Intent Agent: extracts PAA, related search, competitor, local, proof, and comparison intent.
- Site Audit Agent: checks page inventory, thin pages, missing CTAs, schema, and structure.
- Growth Architect Agent: prioritizes nav nodes, internal links, and roadmap.
- Developer Agent: emits stack-specific tasks and patch manifests.
- Proof QA Agent: blocks unsupported claims and requires proof receipts.
- Publisher Agent: applies approved changes through the client adapter.

## Commercial Shape

Starter:

- No-domain growth cycles.
- Seed keyword and competitor mapping.
- Preview-site patch proposals.

Growth:

- GSC, SEMrush, SERP ingestion.
- Continuous monitoring.
- Proposal API and static patch manifests.

Operator:

- Approved auto-apply adapters.
- Deploy hooks.
- Live browser proof receipts.
- Monthly growth ledger.

Bill around `growth_cycle.created`, source rows, premium data sources, generated opportunities, patch manifests, proof runs, and active monitored sites.
