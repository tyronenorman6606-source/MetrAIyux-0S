# SkyeGateFS27 CitadelDB Bridge

SkyeGateFS27 is the CitadelDB-branded deployment lane for the existing SkyeGateFS27 auth/control-plane contract.

This is not a rewrite of SkyeGateFS27. FS27 keeps the existing Netlify Functions, token introspection, session bridge, OAuth/OIDC, JWKS, admin key, monitor, and platform-event surfaces intact.

Primary architecture map:

- `THE_GATE_MAP.md`

Update rule: whenever auth, sessions, OAuth, admin keys, platform events, push tracking, billing, database schema, environment variables, deployment paths, consumer app integration, or live endpoint behavior changes, update `THE_GATE_MAP.md` in the same change.

CitadelDB connects to:

- `POST /auth-introspect` for bearer token validation.
- `POST /platform/events` for mirrored CitadelDB operator events.
- `GET /admin/platform-events` for gate-side event review.
- `GET /health` for deployment readiness.

Production close rule: deploy FS27 with the same event mirror secret configured on CitadelDB, then run `./cli/citadel skygate-bridge-proof`.

MetrAIyux 0S consumer bridge:

- Consumer app id: `metraiyux-0s`
- Consumer auth check: `POST /api/admin/auth/introspect`
- Gate auth authority: `POST /auth-introspect`
- Gate event mirror: `POST /platform/events`
- Dossier: `docs/integration-dossiers/metraiyux-0s.md`
- Server-side secret expected on the consumer Workers: `SKYGATE_EVENT_MIRROR_SECRET`

Cloudflare lane:

- `cloudflare/worker.mjs` adapts the existing FS27 Netlify-style handlers to Cloudflare Workers.
- `wrangler.toml` serves static assets and routes auth/tracking paths through the Worker first.
- `.assetsignore` keeps function source, secrets, dependencies, and local runtime state out of the public asset bundle.
