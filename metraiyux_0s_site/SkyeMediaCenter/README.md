# SkyeMediaCenter — P3 Experiential App Build

SkyeMediaCenter has been rebuilt from a static command/dashboard package into a routed, experiential media app surface.

## What changed

- Replaced the generic dashboard UI with a custom visual system: orbital media core, signal atlas, workflow reactor, vault loom, runtime spine, proof forge, and control core.
- Preserved the working Netlify Functions runtime for local proof and added the 0S Cloudflare Worker production adapter for media assets, file delivery, publishing, search, stats, and FS27/SkyGate sessions.
- Rebuilt the public intake portal as an Asset Drop Reactor with drag/drop upload, tagging, draft/published status, progress visualization, shared gate session attachment, proof session bootstrap, and recent asset rendering.
- Rebuilt the admin surface as an Operator Theater with asset search, quick upload, file opening, publish, archive, Operator Review Board, Execution Board, Dispatch Board, and Workflow Timeline controls.
- Added `manifest.webmanifest`, refreshed the floating transparent SVG mark, and added experiential docs.
- Updated smoke proof to verify both the new surface layer and the preserved function contracts.

## Run locally

This package is static-first and Netlify Functions-backed.

```bash
cd SkyeMediaCenter
netlify dev
```

For local proof sessions, use the canonical 0S/FS27/SkyGate/Free99 bearer or owner session issued by the main Worker. SkyeMediaCenter does not mint an app-local identity.

The smoke script generates its own proof keys and temp data directory, so it can be run directly:

```bash
node smoke/skye-media-center-p2-smoke.mjs
node smoke/smoke-proof.mjs
node smoke/cloudflare-worker-production-smoke.mjs
```

## Important truth boundary

Inside 0S production, SkyeMediaCenter is served by the Cloudflare Worker at the same `/.netlify/functions/*` routes the browser app calls. The production adapter requires FS27/SkyGate bearer introspection, disables local proof bootstrap, stores media metadata and file bodies in KV under SkyeMediaCenter namespaces, and keeps Free99 access behind auth.
