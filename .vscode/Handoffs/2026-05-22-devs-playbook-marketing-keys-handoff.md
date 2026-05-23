# Devs Playbook Marketing Keys Handoff

Date: 2026-05-22  
Repo: `/workspaces/MetrAIyux-0S`  
Surface: `/devs-playbook/`  
Marketing key: `skdevpbk`  
Proof status: local deep smoke only; live deploy and headed browser proof still required

## Status

Source closure is complete.

The new Devs Playbook is a standalone email-gated page that documents the 0S developer/operator workflows, credential names, custody locations, gate lanes, SkyeVault/MyDrive commands, MCP commands, deployment commands, proof policy, and handoff locations.

It does not print raw secret values. That is intentional because this gate only asks for email and is designed for marketing/interest tracking, not owner-grade secret custody.

## New URLs After Deploy

- Playbook login:
  `/devs-playbook/login.html?key=skdevpbk`
- Playbook:
  `/devs-playbook/`
- Owner analytics:
  `/api/marketing-keys/signups?key=skdevpbk`

Do not call the live URLs ready until the live proof gate is run after deployment.

## Marketing Keys Gate

New Worker behavior:

- Public email signup endpoint:
  `POST /api/marketing-keys/signup`
- Session check:
  `GET /api/marketing-keys/me`
- Logout:
  `POST /api/marketing-keys/logout`
- Owner analytics:
  `GET /api/marketing-keys/signups`
  `GET /api/marketing-keys/summary`

Storage:

- Table/ledger name: `marketing_keys`
- KV prefix: `marketing-keys:signup:<tracking_tag>:`
- Visit prefix: `marketing-keys:visit:<tracking_tag>:`
- Optional D1 schema file: `metraiyux_0s_site/cloudflare/marketing-keys.schema.sql`
- Default tracking tag: `skdevpbk`
- Gate user shape: `<email-local-slug>-skdevpbk`

Security boundary:

- The marketing key session cookie is `marketing_key_session`.
- It is not one of the shared 0S gate cookies.
- It does not unlock `/northstar/`, `/admin/`, owner APIs, Free99 app surfaces, or any other 0S route.
- Owner/admin access still uses the existing shared FS27/SkyGate/Free99 lane.

## Files Changed

- `metraiyux_0s_site/cloudflare/worker.js`
  - Added marketing key email sessions.
  - Added `skdevpbk` tracking and `marketing_keys` ledger writes.
  - Added marketing-key gate enforcement for `/devs-playbook`.
  - Added owner-only marketing key analytics endpoints.
- `metraiyux_0s_site/cloudflare/marketing-keys.schema.sql`
  - Added optional D1 schema for the `marketing_keys` table if analytics later move from KV to D1.
- `metraiyux_0s_site/devs-playbook/login.html`
  - Email gate form for the `skdevpbk` campaign.
- `metraiyux_0s_site/devs-playbook/index.html`
  - Standalone Devs Playbook page.
- `metraiyux_0s_site/tests/marketing-keys-dev-playbook-flow.mjs`
  - Worker-module smoke proof for the marketing-key gate.
- `metraiyux_0s_site/changelog/index.html`
  - Added a release entry that says this still needs live proof.
- `metraiyux_0s_site/cloudflare/generated-changelog-page.mjs`
  - Regenerated Worker-bundled changelog fallback.

## Secret To Set Before Production Closure

Recommended Worker secret:

```bash
cd /workspaces/MetrAIyux-0S/metraiyux_0s_site
npx wrangler secret put MARKETING_KEY_SESSION_SECRET --name metraiyux-0s-full-system
```

The Worker can fall back to existing owner session secrets for local smoke, but production should use a dedicated marketing session secret.

## Playbook Content Included

The page covers:

- 0S owner gate, Free99 demo gate, and marketing key gate.
- Safe credential inventory by name only.
- Cloudflare, Resend, Stripe/SkyePay, R2/SkyeVault, and MCP token custody paths.
- SkyeVault Pro local import commands.
- MyDrive offline encrypted backup model.
- Full repo SkyDrive/R2 streaming commands.
- MCP mining and remote MCP commands.
- 0S local serve, crawl, proof, and deploy commands.
- Handoff and receipt locations.

## Deep Smoke Commands

Run:

```bash
node --check metraiyux_0s_site/cloudflare/worker.js
node --check metraiyux_0s_site/tests/marketing-keys-dev-playbook-flow.mjs
node metraiyux_0s_site/tests/marketing-keys-dev-playbook-flow.mjs
```

Expected smoke receipt:

```text
test-artifacts/marketing-keys-dev-playbook/smoke-report.json
```

## Required Live Proof Later

Because this is production-facing, the repo rule still requires deployed headed-browser proof.

After deploying, run a real live proof pass:

```bash
npm run proof:live-browser -- --url "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/devs-playbook/login.html?key=skdevpbk" --expect "Devs Playbook access"
```

Manual proof should verify:

- Desktop login page renders.
- Mobile login page renders.
- Email signup creates a `marketing_keys` record with `skdevpbk`.
- The session opens `/devs-playbook/`.
- The same marketing cookie does not open `/northstar/` or `/admin/`.
- Owner analytics returns the signup under `/api/marketing-keys/signups?key=skdevpbk`.
- Changelog entry renders and clearly says live proof is still required.

## Current Boundary

This handoff is not a live-readiness receipt. It is the source closure plus deep-smoke handoff so the next operator can deploy and run the live browser gate cleanly.
