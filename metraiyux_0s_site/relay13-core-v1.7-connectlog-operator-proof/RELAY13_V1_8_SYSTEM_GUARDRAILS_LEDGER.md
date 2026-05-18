# Relay13 V1.8 System Guardrails Ledger

## Added

- `0006_system_guardrails.sql` with workspace policy, guardrail event, and AI usage ledger tables.
- Server-side inbound guardrails for conversation create, message create, and WebSocket customer messages.
- Public-safe guardrail proof endpoint.
- Admin guardrail read/update endpoint.
- Relay13 Console guardrail panel.
- Proof script for 0S, Bob's Smoke Shop, and Empire Pallets SKM lanes.

## Hard Boundaries

- Customer website chat does not use web search.
- Brain answers must use workspace app knowledge and Relay13/ConnectLog context.
- Auto-reply remains disabled by default. `draft_only` is the standard starting mode.
- Direct-to-operator requests stay operator review paths.
- Guardrail events are recorded without storing raw IP addresses.
