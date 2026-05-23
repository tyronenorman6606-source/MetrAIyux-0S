# SkyeGateFS27 Integration Dossier: metraiyux-0s

- Generated: `2026-05-15T19:25:55.934Z`
- App path: `/workspaces/MetrAIyux-0S/metraiyux_0s_site`
- Gate env var: `SKYGATEFS27_ORIGIN`

## Summary

- Scanned files: 752
- Legacy endpoints found: 2
- Auth indicators found: 0
- Netlify redirect hits: 0

## Legacy Endpoints

- `/auth/introspect`
- `/auth/provider`

## Auth Indicators

- None found

## Recommendations

- Route primary identity through SkyeGateFS27 `/auth/*`, `/oauth/*`, and `/.well-known/*`.
- Set SKYGATEFS27_ORIGIN in the consumer runtime so same-origin adapters can call the deployed SkyeGateFS27/FS27 gate.
- Mirror login, token issuance, admin commands, approval decisions, gateway use, and GitHub/Netlify push actions into the parent gate audit/usage tables through `/platform/events`.

## Endpoint Hits

- `/auth/provider` in `METRAIYUX_0S_REBRAND_UPGRADE_MANIFEST.md`
- `/auth/introspect` in `admin/skygate-auth-bridge.js`
- `/auth/introspect` in `cloudflare-admin-automation-worker/src/worker.js`

## Redirect Hits

- None

