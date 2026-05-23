# BusinessLaunchGo Proof Status

## Runnable Surface

This folder contains a real browser app surface plus a same-folder local runtime surface:

- `index.html` + `assets/app.js` + `assets/zip.js`
- browser-local launch-pack generation
- browser PDF export
- Netlify form markup for lead capture
- optional Netlify function hooks for client error reporting, Neon lead upsert, Neon health, and blob storage
- `runtime/local-runtime.mjs` + `runtime/store.json`
- persisted same-folder local runtime for:
  - leads
  - launch plans derived from checklist state
  - handoff packs plus persisted handoff review workflow
  - execution board after review with owner/status/checkpoint/next-action persistence
  - dispatch board after execution with owner/status/target/channel persistence
  - workflow timeline covering archive -> review -> execution -> dispatch transitions
  - pack activity history from ZIP/PDF generation

## Proof Command

Run from this folder:

```bash
node smoke/smoke-proof.mjs
```

## What The Proof Actually Verifies

- the main app shell exists and exposes the ZIP, PDF, lead-form, diagnostics, and local launch-plan controls
- the browser app is wired to the documented function endpoints and the same-folder runtime endpoints
- the SQL schema, runtime store, runtime module, and Netlify function entrypoints are present
- the Netlify function files and runtime module parse successfully with `node --check`
- the same-folder runtime serves the updated app shell and health/status endpoints
- the same-folder runtime persists leads, launch plans, handoff packs, handoff review state, execution state, dispatch state, workflow timeline events, and pack activity
- launch plans derive readiness and recommended follow-up actions from real checklist state
- handoff review updates persist and roll up into a local review-board summary
- execution updates persist and roll up into a local execution-board summary
- dispatch updates persist and roll up into a local dispatch-board summary
- workflow timeline captures the closure trail from handoff creation through dispatch

## What Is Still Not Proven Here

- a live Netlify deployment
- a working Neon database connection
- working blob persistence in a deployed environment
- multi-user or deployed collaboration beyond the same-folder local runtime

This is a truthful source/proof lane for what is implemented in-repo. It is not a claim that the optional hosted integrations are already live.
