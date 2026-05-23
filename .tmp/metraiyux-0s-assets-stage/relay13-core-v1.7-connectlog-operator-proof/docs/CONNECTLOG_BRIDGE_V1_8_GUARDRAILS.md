# Relay13 V1.8 System Guardrails

Relay13 now treats customer chat as protected infrastructure before any AI responder can answer.

## Runtime Rules

- Public customer chat defaults to `draft_only` AI mode.
- Customer website chat has `allow_web_search` locked to `false`.
- AI answer metadata is `customer_app_knowledge_only`.
- App knowledge is workspace-scoped: 0S, Bob's Smoke Shop, and Empire Pallets each get their own answer scope and app surfaces.
- Prompt-injection, secret-extraction, active script payloads, destructive/exfiltration requests, repeated spam, excess links, and per-IP abuse are evaluated before customer messages persist.
- Direct-operator routes and web-search requests are not given web search; they are kept for operator review with `web_search_allowed=false`.

## New Tables

- `workspace_guardrails`: per-workspace AI mode, rate window, app knowledge, and escalation policy.
- `guardrail_events`: allow/review/block ledger for customer conversations, messages, and WebSocket messages.
- `ai_usage_ledger`: future model/token/cost ledger for brain responder calls.

## New Routes

- `GET /api/v1/guardrails/proof?workspace=<slug>` returns public-safe policy proof for allowed widget domains.
- `GET /api/admin/guardrails?workspace_id=<id>` returns policy plus recent guardrail events.
- `POST /api/admin/guardrails` updates policy while keeping customer web search locked off.

## Proof

Run:

```bash
npm run proof:guardrails
```

The proof checks that 0S, Bob, and Empire all expose no-web-search policy, accept normal app-knowledge questions, put web-search requests into review/no-web-search mode, and block prompt-injection/secret-extraction payloads before persistence.
