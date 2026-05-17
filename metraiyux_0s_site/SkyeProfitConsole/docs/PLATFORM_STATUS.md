# Platform Status

SkyeProfitConsole is now packaged as a local-first profit operating app instead of a dashboard wrapper.

Inside MetrAIyux 0S it is a Free99 feature: no charge, no paid checkout, and still gate-session protected.

## Current surface

- Animated canvas profit field.
- Clickable constellation nodes.
- Profit pack forge.
- Split furnace with configurable allocation lanes.
- Signal loom grouped by workflow state.
- Proof chain with local and runtime events.
- JSON state export.
- Optional same-folder Node runtime for persistent review/execution/dispatch workflows.

## Runtime boundary

The UI can load statically, but `gate-session.js` blocks the app from booting until a 0S or FS27 gate session exists. When launched through `node runtime/local-runtime.mjs --port <port>`, runtime calls under `/api/runtime/*` and `/health` require `x-skye-gate-session` or a bearer token and return `401 gate_session_required` without it.
