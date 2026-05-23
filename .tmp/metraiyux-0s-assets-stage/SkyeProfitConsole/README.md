# SkyeProfitConsole Neo-Front Profit Field

This build replaces the old dashboard-style shell with a real interactive app surface: a spatial profit field, split furnace, money moves, close briefs, signal loom, proof chain, local state, export controls, and gated 0S Worker runtime persistence.

## 0S import boundary

Inside MetrAIyux 0S this platform is Free99, meaning no charge. It still requires a 0S or FS27 gate session before the app boots. Runtime calls also send and require a gate-session header.

## Run static

Open `index.html` directly in a browser. The app works with browser-local state even when no runtime is running.

## Run with the production or local runtime

```bash
node runtime/local-runtime.mjs --port 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

The runtime stores review packs, close briefs, execution items, dispatch items, and workflow events in `runtime/store.json`.

Runtime API calls without `x-skye-gate-session` or a bearer token return `401 gate_session_required`.

## Smoke proof

```bash
node smoke/skyeprofitconsole-p1-smoke.mjs
node smoke/smoke-proof.mjs
```

## What changed

✅ Replaced the route-card dashboard shell with a real front-end app.

✅ Added a canvas-based animated profit field and clickable constellation nodes.

✅ Added pack creation, selection, updates, status transitions, local proof events, JSON export, split simulation, money-move scoring, payback analysis, blocked-margin detection, and close brief generation.

✅ Preserved and upgraded the runtime lane for review packs, close briefs, split allocation, proof events, exports, audit, execution queue, dispatch queue, and workflow timeline.

✅ Upgraded the Node runtime so linked static assets load when the app is launched through `runtime/local-runtime.mjs`.
