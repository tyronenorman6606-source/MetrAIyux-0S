# skAIxu Code Evaluator Platform 2.2 Machinery

This upgrade adds code machinery, not deployment filler.

## Added

- Provider marketplace: scans loaded seed assets for provider packs, blocks unsafe direct-provider routes, installs gateway-safe packs, and can write `platform-ledgers/PROVIDER_REGISTRY.json`.
- Policy gates: evaluates critical/high platform rules for direct AI provider calls, hardcoded secrets, seed readiness, test readiness, patch preflight, and upstream role gating.
- Issue-to-patch task queue: converts detected code/platform issues into implementation tasks with acceptance checks.
- Shared workspace API adapter: optional backend contract for pushing/pulling workspaces while forwarding upstream identity claims. No built-in auth was added.
- Seed ETL queue planner: creates local job contracts and can write `generated/etl-jobs/queue.json` plus a runbook.
- Browser-preview proof: runs inside the live preview iframe and records readable DOM, routes, actions, safe click-dispatch, and visible content checks when the preview is available.

## Still honest

The app remains static-first. Shared API sync, server workers, and live provider execution require the endpoints you wire later. The code contracts and client-side machinery are present so repo agents can continue from concrete files instead of vague notes.
