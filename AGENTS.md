# Repo MCP Rule

## 0S Auth Rule

All apps mounted into the 0S must use the shared FS27/SkyGate/Free99 auth lane owned by the main Worker. Do not create app-specific founder, owner, admin, or client admin passwords for mounted apps.

Owner/admin surfaces must forward the same shared gate credential through the Worker helpers and accepted headers: `Authorization`, `x-admin-token`, `x-free99-admin-code`, `x-free99-gate-session`, `x-skye-gate-session`, cookies, or `/api/owner/admin-login`. Mounted app API routes must rely on `requireGateAuth`, `requireOperatorAuth`, and the shared owner-admin session helpers instead of a separate auth lane.

If a new app needs owner access, wire it into FS27/Gate/Free99 and store/reuse the returned 0S owner session. The Free99 admin credential is a 0S gate credential, not a new per-app password.

Every app, platform, and sub-platform path mounted inside `metraiyux_0s_site` must pass through `enforceZeroOsGate` before it reaches `env.ASSETS` or a proxied API. The Worker is default-deny: `ZERO_OS_GATE_PREFIXES` is the named-surface manifest, not the only protection. The only public entrypoints are the owner login/introspection endpoints needed to issue or verify the shared FS27/Free99 session plus tiny browser metadata such as `favicon.ico`, `robots.txt`, and `sitemap.xml`. When adding a new 0S surface, add its prefix to the gate table and prove unauthenticated requests redirect to `/admin/login.html?return=...` while authenticated requests render normally.

## Live Browser Verification Gate

For this repo, a production-facing web/app change is not done until it has been checked in a live headed browser after deployment. This applies to frontend changes, client apps, landing pages, Valley Verified pages, public live links, and production deploys.

Hard rule:

1. Open the deployed production URL in a headed browser session. Headless Playwright, `curl`, `fetch`, static scans, Lighthouse output, and screenshots alone do not count.
2. Perform human-style interactions in the browser: click primary navigation or CTAs, open menus, exercise forms/workspace handoffs when present, use tabs/filters/toggles when present, and verify the resulting screen/state.
3. Scroll the full rendered page like a human user on both desktop and mobile. Check the hero, every major section/anchor, all route/tab states opened during the run, and the page bottom.
4. At every scroll stop, prove the visible viewport is not blank or visually dead. A text-only smoke check is not enough: visible text, loaded images/video/canvas/SVG/background media, broken media, sticky overlays, and empty white/black sections must be inspected.
5. Check desktop and mobile viewports.
6. Inspect console errors and failed network requests.
7. Save a proof receipt with URLs, statuses, viewport sizes, actions performed, route/tab states, scroll stops, per-stop screenshot paths, visual nonblank metrics, console/network results, and failures.
8. If this gate has not passed, the final answer must say the work was not live-browser-checked and must not present live links as ready.

The enforceable browser proof policy is stored at:

```bash
.agents/live-browser-verifier/browser-proof-policy.toml
```

Reusable verifier agent:

```bash
npm run proof:live-browser -- --url <production-url> --expect "<text that must be visible>"
```

Agent prompt and checklist live in:

```bash
.agents/live-browser-verifier/AGENTS.md
```

When the user says "my MCP", "the MCP tooling", or "use the tooling" in this repo, use the local MCP server registered in `.mcp.json`:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/MCP/stdio-server.mjs"]
    }
  }
}
```

Do not guess at a different MCP server. The exposed tool namespace may appear as `skye-design` in some clients, but the repo source of truth is `quantumskyes`.

Remote production access exists for clients that cannot keep this repo's local `MCP/` folder:

- Endpoint: `https://skye-design-mcp.pages.dev/mcp`
- Access guide: `https://skye-design-mcp.pages.dev/use-mcp.html`
- Health proof: `https://skye-design-mcp.pages.dev/health`
- Gate handoff: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html?workspace=quantumskyes-mcp&source=skye-design-mcp&return=https%3A%2F%2Fskye-design-mcp.pages.dev%2Fuse-mcp.html`
- Owner admin login: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html`

Remote access is gate-owned. Use it only with a valid 0S/FS27/NorthStar bearer session, captured through the gate email flow, the signed owner-admin bearer issued from `/admin/login.html`, or with an owner-issued `MCP_HTTP_BEARER_TOKEN`. Do not commit or print bearer tokens.

For AI/operator details, read:

```bash
AI_REMOTE_MCP_USAGE.md
```

For the new immersive/world-building MCP direction, read:

```bash
MCP/WORLD_BUILDING_MCP_RESEARCH.md
```

The new Remix 3 beta operator console lives at:

```bash
MCP/operator-console-remix
```

It is the local cockpit, not a second MCP. It exposes `/api/catalog`, `/api/targets`, `/api/worlds`, `/api/plan`, `/api/build`, `/api/mine`, and `/api/proof` so operators can list live local MCP resources/tools, choose a world archetype, build a portable generated world artifact, mine whitelisted repo targets, and write receipts before browser/deploy proof. Generated worlds are served locally from `/generated-worlds/<slug>`.

The same-domain public house-threshold artifact is:

```bash
https://skye-design-mcp.pages.dev/worlds/house-threshold/
```

Default workflow:

1. Run `npm run mcp:mine -- <target-folder>` before redesigning or auditing a target folder.
2. Read the generated `<target-folder>/MCP_TOOLING_RECEIPT.json`.
3. Apply changes using the MCP resources, pattern packs, recipes, and audits from that receipt.
4. Re-run `npm run mcp:mine -- <target-folder>` after changes.
5. Serve or deploy the same target folder the user named.

For SkyeSol current public site work, default target:

```bash
npm run mcp:skyesol
```

This writes:

- `skyesol_current_public_site/MCP_TOOLING_RECEIPT.json`
- `test-artifacts/direct-mcp/skyesol_current_public_site-mcp-tooling-receipt.json`

Remote proof workflow:

```bash
npm run mcp:smoke:remote
MCP_LIVE_SIGNUP_SMOKE=1 MCP_RUNNER_TARGET=MCP npm run mcp:smoke:remote:gate
MCP_TRANSPORT=remote QUANTUMSKYES_MCP_TOKEN="$MCP_GATE_SESSION" npm run mcp:mine:remote -- <target-folder>
```
