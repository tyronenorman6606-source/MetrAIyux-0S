# QuantumSkyes MCP Remote Access

Goal: make the QuantumSkyes MCP usable even after a consuming repo deletes its local `MCP/` folder.

## Current Production Rule

Production remote MCP access is gate-owned.

- Public lab: `https://skye-design-mcp.pages.dev/`
- Access guide: `https://skye-design-mcp.pages.dev/use-mcp.html`
- MCP endpoint: `https://skye-design-mcp.pages.dev/mcp`
- Health proof: `https://skye-design-mcp.pages.dev/health`
- Gate handoff: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html?workspace=quantumskyes-mcp&source=skye-design-mcp&return=https%3A%2F%2Fskye-design-mcp.pages.dev%2Fuse-mcp.html`
- Owner admin login: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html`
- World-building control room source: `MCP/operator-console-remix`

Even free access requires the user to enter through the 0S gate with an email. Unauthenticated browser requests to `/mcp` redirect to the gate. Unauthenticated MCP protocol requests return `401` with `gateUrl`, `accessUrl`, `workspace`, and `emailRequired: true`.

Accepted production bearer tokens:

- A valid 0S/FS27 gate session token.
- A valid NorthStar session/access token routed through FS27 token introspection.
- The signed owner-admin bearer issued from the 0S owner admin login.
- An owner-issued `MCP_HTTP_BEARER_TOKEN` Pages secret.

The worker validates gate-owned tokens through:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect
```

The combined 0S route accepts signed owner-admin sessions first, then falls through to FS27/SkyGate introspection for regular gate sessions.

## World-Building Console

`MCP/operator-console-remix` is the new Remix 3 beta operator surface for the MCP. It turns the immersive-world direction into local operator actions: sidewalk/door/keypad entry, live MCP health, world archetype selection, local MCP catalog browsing, generated world builds, target mining, open-source stack discipline, and proof receipts. It does not replace the deployed `/mcp` protocol route.

Local console routes:

- `GET /api/catalog`
- `GET /api/targets`
- `GET /api/worlds`
- `GET /api/plan?target=operator-console&archetype=barber-shop`
- `GET /api/build?target=operator-console&archetype=house-threshold`
- `GET /api/mine?target=operator-console`
- `GET /api/proof`
- `GET /generated-worlds/<slug>`

The same-domain public generated house-threshold artifact is:

```text
https://skye-design-mcp.pages.dev/worlds/house-threshold/
```

## What Changed

The MCP now has two transport entrypoints:

- `stdio-server.mjs` for local IDE/Codex usage.
- `http-server.mjs` for remote Streamable HTTP usage at `/mcp`.

Smoke checks:

```bash
npm run smoke:stdio
npm run smoke:http
npm run smoke:pages-worker
npm run smoke:remote
```

From the repo root:

```bash
npm run mcp:smoke
npm run mcp:smoke:http
npm run mcp:smoke:pages-worker
npm run mcp:smoke:remote
npm run mcp:smoke:remote:gate
```

`npm run mcp:smoke:remote` proves the live health route and unauthenticated gate block. `npm run mcp:smoke:remote:gate` requires a bearer token in `QUANTUMSKYES_MCP_TOKEN`, `MCP_GATE_SESSION`, `NORTHSTAR_SESSION_TOKEN`, or `MCP_HTTP_BEARER_TOKEN`.

To create a synthetic 0S/FS27 gate-owned proof session and verify the deployed MCP with the returned token:

```bash
MCP_LIVE_SIGNUP_SMOKE=1 npm run mcp:smoke:remote:gate
```

To additionally prove the repo MCP runner can mine through the deployed endpoint:

```bash
MCP_LIVE_SIGNUP_SMOKE=1 MCP_RUNNER_TARGET=MCP npm run mcp:smoke:remote:gate
```

## Local HTTP Server

```bash
cd MCP
MCP_HTTP_HOST=127.0.0.1 MCP_HTTP_PORT=8787 npm run start:http
```

Status:

```bash
curl http://127.0.0.1:8787/health
```

MCP endpoint:

```text
http://127.0.0.1:8787/mcp
```

For private access, set:

```bash
MCP_HTTP_BEARER_TOKEN="replace-with-a-secret"
```

Clients should then send:

```text
Authorization: Bearer replace-with-a-secret
```

## Cloudflare Shape

The public `https://skye-design-mcp.pages.dev/` surface is the static Skye Design Lab and now carries the real remote MCP on the same hostname:

```text
https://skye-design-mcp.pages.dev/mcp
```

The production endpoint is not public-read. It is gate-owned by default. To open a throwaway demo only, set `MCP_PUBLIC_READONLY=1`; do not use that mode for the company-owned production surface.

Runtime proof:

```text
https://skye-design-mcp.pages.dev/health
```

Production deployment:

```text
c23043f7-8c09-41f4-8487-e355c713b2f7
```

End-to-end gate proof:

```text
test-artifacts/skye-design-mcp-gate-owned-live/live-gate-token-mcp-proof.json
```

That proof signs up a synthetic FS27 gate user, captures the email, validates the returned session through `/auth-introspect`, and uses that same bearer token to list live remote MCP resources/tools.

Current remote-runner proof:

```text
test-artifacts/skye-design-mcp-gate-owned-live/remote-gate-token-smoke.json
```

That proof can include `repoRunner` when `MCP_RUNNER_TARGET` is set, confirming `tools/use-my-mcp.mjs` reached the live `/mcp` endpoint instead of local stdio.

Set `MCP_HTTP_BEARER_TOKEN` as a Pages secret only when you want an extra owner-issued MCP token. Normal user access should come through a 0S/FS27/NorthStar gate session token, and owner access should use the signed bearer from `/admin/login.html`.

## Consumer Repo Config

When a client supports remote MCP URLs, the consuming repo can keep only a tiny config:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "url": "https://skye-design-mcp.pages.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${QUANTUMSKYES_MCP_TOKEN_OR_GATE_SESSION}"
      }
    }
  }
}
```

This repo also includes a ready-to-copy shape:

```text
.mcp.remote.example.json
```

For repo scripts that already call `tools/use-my-mcp.mjs`, flip to the live endpoint with env vars:

```bash
MCP_TRANSPORT=remote QUANTUMSKYES_MCP_TOKEN="$MCP_GATE_SESSION" npm run mcp:mine:remote -- <target-folder>
MCP_TRANSPORT=remote QUANTUMSKYES_MCP_TOKEN="$MCP_GATE_SESSION" npm run mcp:skyesol:remote
```

When a client only supports stdio, publish the MCP as a package and point the config at that package:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "npx",
      "args": ["-y", "@your-scope/quantumskyes-design-mcp"]
    }
  }
}
```

That gives two sovereign access paths:

- Remote URL for clients with Streamable HTTP support.
- Versioned package for clients that still only speak stdio.

## Deletion Rule

Do not delete the repo-local `MCP/` folder until all three pass:

1. `npm run mcp:smoke`
2. `npm run mcp:smoke:http`
3. `npm run mcp:smoke:remote`

After that, consuming repos only need `.mcp.json` plus an access token or package reference.
