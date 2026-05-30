# Repo MCP Rule

## 0S Auth Rule

All apps mounted into the 0S must use the shared FS27/SkyGate/Free99 auth lane owned by the main Worker. Do not create app-specific founder, owner, admin, or client admin passwords for mounted apps.

Owner/admin surfaces must forward the same shared gate credential through the Worker helpers and accepted headers: `Authorization`, `x-admin-token`, `x-free99-admin-code`, `x-free99-gate-session`, `x-skye-gate-session`, cookies, or `/api/owner/admin-login`. Mounted app API routes must rely on `requireGateAuth`, `requireOperatorAuth`, and the shared owner-admin session helpers instead of a separate auth lane.

If a new app needs owner access, wire it into FS27/Gate/Free99 and store/reuse the returned 0S owner session. The Free99 admin credential is a 0S gate credential, not a new per-app password.

Every app, platform, and sub-platform path mounted inside `metraiyux_0s_site` must pass through `enforceZeroOsGate` before it reaches `env.ASSETS` or a proxied API. The Worker is default-deny: `ZERO_OS_GATE_PREFIXES` is the named-surface manifest, not the only protection. The only public entrypoints are the owner login/introspection endpoints needed to issue or verify the shared FS27/Free99 session plus tiny browser metadata such as `favicon.ico`, `robots.txt`, and `sitemap.xml`. When adding a new 0S surface, add its prefix to the gate table and prove unauthenticated requests redirect to `/admin/login.html?return=...` while authenticated requests render normally.

## SkyeNet Platform Deployment Rule

SkyeNet is the platform. Its shared Worker origin and control console currently live at:

```bash
https://skyenet.graylondonskyes.workers.dev
```

That shared Worker origin is infrastructure. For public company/customer-facing deployments, the canonical public link must be a platform-native SkyeNet hostname, not a shared Worker origin with a path mount. Use company-native hostnames such as:

```bash
https://skyenet.skyeroutex-logistics/
https://skyenet.skyesol/
https://skyenet.solenterprises/
```

Register these routes as host-native SkyeNet records with `hostname: "skyenet.<company-slug>"`, `mount_path: ""` or `/`, `url_mode: "subdomain"`/host-native mode, and `public_access: true`. The shared `https://skyenet.graylondonskyes.workers.dev/<project>/` shape may be used as an origin, fallback, proof, or temporary staging route, but do not present it as the final public company URL unless the owner explicitly approves it. Do not publish new customer-facing apps as primary routes under `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/<project>/` unless the owner explicitly asks for temporary 0S-hosted staging.

The 0S `/api/skyenet/*` lane stays active as the shared-gate control/proxy API. The SkyeNet shared Worker `/api/skyenet/*` lane stays active as the platform API. Public copy, Founder Command records, QR targets, sitemaps, robots, JSON-LD, and cross-links must use the platform-native company hostname after proof.

Default public company deploy shape:

```bash
npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --source-root <full-project-folder> \
  --project <project-slug> \
  --workspace <workspace-slug> \
  --host skyenet.<company-slug> \
  --mount / \
  --url-mode subdomain \
  --public \
  --concurrency 4
```

Generic demos, temporary staging, or non-company examples may still use the shared SkyeNet origin with a path mount when that is explicitly the intended target:

```bash
npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --source-root <full-project-folder> \
  --project <project-slug> \
  --workspace <workspace-slug> \
  --host skyenet.graylondonskyes.workers.dev \
  --mount /<project-slug> \
  --public \
  --concurrency 4
```

Use `SKYENET_AUTH`, `ZERO_OS_GATE_SESSION`, or an owner-issued shared gate bearer for deploy control. Never commit or print bearer tokens. Do not create SkyeNet-specific founder/admin/client passwords.

SkyeNet deploys now have two custody lanes. `--dir` is the public build/app bundle that SkyeNet serves. `--source-root` is the private full project package that gated account download returns. The standalone SkyeNet console also has a Publish package screen that sends the selected public build folder to `/api/skyenet/deploy/upload` and the selected private full source folder to `/api/skyenet/source-upload` plus `/api/skyenet/source-complete`. Do not upload private source files into the public asset route to make downloads work. Use `/api/skyenet/env` for project environment variables; the console shows redacted previews only. After changing SkyeNet publish/source-custody behavior, run `npm run skyenet:netlify-parity:proof` and `npm run skyenet:netlify-parity:stress`.

When migrating an existing 0S `/skyenet/<project>/` app to real SkyeNet:

1. Archive the old 0S source/surface to SkyeVault/SkyDrive before deleting or redirecting anything.
2. Deploy the client-facing bundle to a platform-native SkyeNet hostname.
3. Prove the platform-native live URL, key assets, routes, gated/account flows, source download API, and source-transfer receipt API through non-browser HTTP/API checks.
4. Update Founder Command/client records, public flyers, QR targets, sitemaps, robots, JSON-LD, and cross-links to the platform-native SkyeNet hostname.
5. Convert the old 0S `/skyenet/<project>/` route into a redirect to the platform-native SkyeNet hostname only after proof and archive receipts exist.

Current path-route reference implementation: Bob's Smoke Shop is live at `https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/` with founder-owned source custody. Bob is a shared-origin path-route example, not the default public-company hostname pattern. Bob gets the hosted app; source download stays account-scoped to the founder/admin deployment record unless a founder-approved transfer is recorded through `/api/skyenet/source-transfer`.

Detailed deployment and migration instructions live in:

```bash
docs/SKYENET_UPLOAD_URL_MODEL.md
docs/SKYENET_PUBLIC_POSTING_GUIDE.md
docs/SKYENET_SOURCE_CUSTODY_AND_TRANSFER.md
docs/SKYENET_STANDALONE_MIGRATION_DIRECTIVE.md
```

## Owner-Manual Browser Verification Rule

The owner/admin has disabled Codex-run browser proof in this repo. Codex must not open headed browsers, run Playwright live verification, spawn browser-verifier agents, or spend implementation time on browser proof unless the owner explicitly re-enables it in the current task.

Production-facing work is now completed by build/deploy plus non-browser verification:

1. Run static checks, build checks, JSON validation, API smoke, gate checks, and authenticated HTTP stress as appropriate.
2. Save receipts for deploys, smoke checks, stress checks, and any blocked items.
3. Provide direct production links for the owner to live-check manually.
4. State clearly that browser verification is owner-handled when reporting readiness.
5. Do not call `npm run proof:live-browser` expecting a browser. The script is intentionally disabled and returns a no-browser receipt.

The browser-proof disablement policy is stored at:

```bash
.agents/live-browser-verifier/browser-proof-policy.toml
```

Disabled verifier shim:

```bash
npm run proof:live-browser -- --url <production-url> --expect "<text that must be visible>"
```

Historical verifier prompt and checklist live in:

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
