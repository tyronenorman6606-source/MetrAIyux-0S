# Sign In Pro Free99 Demo Code Closure Handoff

Date: 2026-05-22  
Repo: `/workspaces/MetrAIyux-0S`  
Production Worker: `metraiyux-0s-full-system`  
Final deployed Worker version: `ec3ebc67-07e8-4bfe-b92a-d6b1fecbf4c0`

## Closure Status

This is closed end to end.

Sign In Pro is now mounted as a Free99 platform lane. Businesses still sign up before entry, the demo code is validated by the main 0S Worker, demo sessions use the shared FS27/SkyGate/Free99 gate lane, and demo users do not receive owner/admin scope.

## Live URLs

- Business demo entry:
  `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/demo?return=/northstar/index.html`
- Legacy `.html` entry:
  `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/demo.html?return=/northstar/index.html`
  This redirects to `/Free99/demo`.
- Sign In Pro workspace:
  `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/`
- Owner rotation room:
  `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/free99-demo-code.html`

## Current Active Demo Code

The current code was rotated in production and is active.

- Preview: `SIP-...8809`
- Expires: `2026-05-24T06:42:57.850Z`
- Full local-only code location:
  `/workspaces/MetrAIyux-0S/test-artifacts/free99-signinpro-closure/production-demo-code-proof.json`
- JSON key:
  `current_demo_code_local_handoff_only`

Do not paste the full code into public docs or commits. Rotate it from the owner room if you want a cleaner business-facing code before a meeting.

## What Changed

- `metraiyux_0s_site/cloudflare/worker.js`
  - Added rotating Free99 demo code storage.
  - Added demo-only `0s-demo` sessions.
  - Added public business demo endpoint: `POST /api/free99/demo-login`.
  - Added owner-only code/status/signup endpoints under `/api/free99/demo-code/*` and `/api/free99/demo-signups`.
  - Added Resend rotation prompt support and scheduled rotation checks.
  - Let `requireGateAuth` accept valid demo sessions for gated 0S surfaces.
  - Kept `requireOperatorAuth` blocking demo sessions from management routes with `403`.
  - Fixed the `/Free99/demo.html` to `/Free99/demo` redirect loop.
  - Added shared-gate NorthStar responses for:
    - `GET /api/northstar/auth-session`
    - `GET/POST /api/northstar/workspace-sync`
  - Demo workspace sync is browser-local and tracked; it is not an owner/admin workspace lane.
- `metraiyux_0s_site/Free99/demo.html`
  - Business signup plus demo code page.
- `metraiyux_0s_site/admin/free99-demo-code.html`
  - Owner-only status, rotation, prompt, and signup review room.
- `metraiyux_0s_site/Free99/apps/signinpro-northstar/index.html`
  - Free99 mounted platform entry.
- `metraiyux_0s_site/Free99/index.html`
  - Added Sign In Pro card and demo link.
- `metraiyux_0s_site/Free99/app-manifest.json`
  - Added `platform_id=signinpro-northstar`, `billing=free99`.
- `metraiyux_0s_site/data/free99-entitlements.json`
  - Added Sign In Pro to Free99 core platforms.
- `metraiyux_0s_site/script.js`
  - Added search/discovery entries.
- `metraiyux_0s_site/tests/free99-demo-code-flow.mjs`
  - Added repeatable in-memory Worker proof for the full demo code flow.
- `tools/proof-free99-signinpro-demo-live.mjs`
  - Added headed production browser proof for desktop, mobile, and owner rotation UI.

## Production Secrets Set

These Worker secrets were set through authenticated Wrangler during closure:

- `FREE99_DEMO_SESSION_SECRET`
- `FREE99_DEMO_OWNER_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Existing owner/admin and FS27/SkyGate secrets stayed in place.

## Proof Receipts

Production API proof:

- `/workspaces/MetrAIyux-0S/test-artifacts/free99-signinpro-closure/production-demo-code-final-proof.json`
- Result: `ok: true`
- Proved:
  - current demo code logs in a business
  - demo session returns `demo=true` from `/api/northstar/auth-session`
  - `/api/northstar/workspace-sync` returns `browser-local`
  - demo session opens `/northstar/`
  - demo session is blocked from code management with `403`

Headed production browser proof:

- `/workspaces/MetrAIyux-0S/test-artifacts/free99-signinpro-closure/live-headed-browser-proof.json`
- Result: `ok: true`
- Proved:
  - desktop `1440x980` business demo signup opens `/northstar/`
  - mobile `390x844` business demo signup opens `/northstar/`
  - owner desktop rotation UI loads, shows active code status, and shows recent signups
  - screenshots saved under `/workspaces/MetrAIyux-0S/test-artifacts/free99-signinpro-closure/`

Free99 platform proof:

- `/workspaces/MetrAIyux-0S/test-artifacts/free99-platform-intake/free99-platform-intake-e2e-report.json`
- Result: `ok: true`
- Mounted apps: `19`
- Checks: `39`

Local smoke:

```bash
node metraiyux_0s_site/tests/free99-demo-code-flow.mjs
```

Result:

- demo login returns `role=demo`
- demo token opens gated NorthStar
- demo token returns demo NorthStar auth-session
- demo workspace sync is browser-local
- demo token cannot manage demo code
- owner code rotation invalidates the old demo code
- new code works

## Operator Flow

To demo for a business:

1. Copy the current full demo code from:
   `/workspaces/MetrAIyux-0S/test-artifacts/free99-signinpro-closure/production-demo-code-proof.json`
2. Send the business:
   `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/demo?return=/northstar/index.html`
3. They enter business name, email, and the demo code.
4. The Worker records the signup under the Free99 demo lane.
5. The browser receives shared 0S gate cookies and opens `/northstar/`.

To rotate:

1. Log in at:
   `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html`
2. Open:
   `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/free99-demo-code.html`
3. Enter a new demo code and approve rotation.
4. The old code stops working immediately.
5. The new code expires in no more than 48 hours.

## Notes

- The canonical public demo URL is `/Free99/demo`, because Cloudflare assets canonicalize `.html` to extensionless paths.
- Demo sessions are intentionally not operator sessions.
- NorthStar demo workspace persistence is browser-local for demo users, while the Worker still tracks the signup and mirrors workspace-sync events.
- `npm run mcp:mine -- metraiyux_0s_site` previously timed out; closure was instead proven through deploy logs, production API receipts, and headed browser receipts.
