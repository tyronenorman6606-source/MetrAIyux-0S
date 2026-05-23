# Platform Status

SkyeProfitConsole is now packaged as a local-first profit operating app instead of a dashboard wrapper, with a Free99 money-move layer that still stays behind the gate.

Inside MetrAIyux 0S it is a Free99 feature: no charge, no paid checkout, and still gate-session protected.

## Current surface

- Animated canvas profit field.
- Clickable constellation nodes.
- Profit pack forge.
- Split furnace with configurable allocation lanes.
- Money Moves panel with fastest-cash ranking, cash-now total, blocked-margin detection, payback multiple, and generated close briefs.
- Signal loom grouped by workflow state.
- Proof chain with local and runtime events.
- JSON state export.
- 0S Worker runtime at `/api/profit/*` for persistent review, close-brief, execution, dispatch, split, proof, export, and audit workflows.

## Runtime boundary

The UI can load statically, but `gate-session.js` blocks the app from booting until a 0S or FS27 gate session exists. In 0S production, runtime calls use `/api/profit/*` and require operator auth. When launched locally through `node runtime/local-runtime.mjs --port <port>`, compatibility calls under `/api/runtime/*` and `/health` still require `x-skye-gate-session` or a bearer token and return `401 gate_session_required` without it.
