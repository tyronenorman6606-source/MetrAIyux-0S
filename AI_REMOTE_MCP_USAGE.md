# AI Remote MCP Usage

This is the operator and AI-agent rule for using the deployed QuantumSkyes MCP after it moved from local-only tooling into gate-owned infrastructure.

## Source Of Truth

Inside this repo, local work still starts with `.mcp.json`:

```bash
npm run mcp:mine -- <target-folder>
```

That uses `quantumskyes` through `MCP/stdio-server.mjs` and remains the source-of-truth authoring lane.

Use the remote lane when a consuming app, another repo, or an external AI client needs MCP access without keeping the whole `MCP/` folder locally.

## Production Remote Lane

- Public lab: `https://skye-design-mcp.pages.dev/`
- Access guide: `https://skye-design-mcp.pages.dev/use-mcp.html`
- MCP endpoint: `https://skye-design-mcp.pages.dev/mcp`
- Health proof: `https://skye-design-mcp.pages.dev/health`
- Gate handoff: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html?workspace=quantumskyes-mcp&source=skye-design-mcp&return=https%3A%2F%2Fskye-design-mcp.pages.dev%2Fuse-mcp.html`
- Owner admin login: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html`

The endpoint is gate-owned. Even free access requires the user to enter through the 0S gate with an email, then use the resulting 0S/FS27/NorthStar session as a bearer token.

Do not paste bearer tokens into markdown, commits, issues, screenshots, or public docs.

## Owner Admin Unlock

Owner/admin access is not supposed to feel like customer access. Use the 0S owner admin login, enter the owner admin code, then copy the issued bearer into `QUANTUMSKYES_MCP_TOKEN` for AI clients or repo proof commands. The admin code itself stays in Cloudflare secrets such as `FREE99_ADMIN_CODE`, `OWNER_ADMIN_CODE`, or existing admin password/token secrets; never hardcode it in the repo.

The deployed MCP validates normal user sessions and owner admin sessions through the combined 0S introspection route:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect
```

## World-Building Console

The next MCP surface is being developed in:

```bash
MCP/operator-console-remix
```

That Remix 3 beta app is an operator control room for immersive product worlds. It is intentionally separate from the deployed `/mcp` protocol route. Use it for world archetype selection, owner-entry metaphors, live MCP health, stack discipline, and proof workflow planning.

The research brief is:

```bash
MCP/WORLD_BUILDING_MCP_RESEARCH.md
```

Current local operator routes:

- `/api/catalog` lists live local MCP resources/tools.
- `/api/plan?target=operator-console&archetype=barber-shop` builds an MCP-backed world plan.
- `/api/build?target=operator-console&archetype=house-threshold` builds a portable generated world artifact and receipt.
- `/api/mine?target=operator-console` runs the repo MCP mining workflow for a whitelisted target.
- `/api/proof` aggregates production health, target receipts, and proof artifacts.
- `/generated-worlds/<slug>` serves the generated artifact from the operator console.

Receipts are written under `MCP/operator-console-remix/operator-receipts/` and `test-artifacts/operator-console-remix/`.

The public same-domain demo for the current house-threshold pattern is:

```text
https://skye-design-mcp.pages.dev/worlds/house-threshold/
```

## Repo Commands

Unauthenticated production gate check:

```bash
npm run mcp:smoke:remote
```

Live gate signup, introspection, and MCP protocol proof:

```bash
MCP_LIVE_SIGNUP_SMOKE=1 npm run mcp:smoke:remote:gate
```

Live gate signup plus proof that the repo MCP runner can mine through the deployed endpoint:

```bash
MCP_LIVE_SIGNUP_SMOKE=1 MCP_RUNNER_TARGET=MCP npm run mcp:smoke:remote:gate
```

Remote mining with an existing gate session:

```bash
MCP_TRANSPORT=remote QUANTUMSKYES_MCP_TOKEN="$MCP_GATE_SESSION" npm run mcp:mine:remote -- <target-folder>
```

Remote SkyeSol mining:

```bash
MCP_TRANSPORT=remote QUANTUMSKYES_MCP_TOKEN="$MCP_GATE_SESSION" npm run mcp:skyesol:remote
```

## Client Config

Use `.mcp.remote.example.json` as the safe shape for clients that support Streamable HTTP:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "url": "https://skye-design-mcp.pages.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${QUANTUMSKYES_MCP_TOKEN}"
      }
    }
  }
}
```

Accepted token env vars in this repo runner:

- `QUANTUMSKYES_MCP_TOKEN`
- `MCP_GATE_SESSION`
- `NORTHSTAR_SESSION_TOKEN`
- `MCP_HTTP_BEARER_TOKEN`
- the owner-admin bearer copied from `/admin/login.html`

## Proof Artifacts

Remote gate proof writes redacted receipts to:

- `test-artifacts/skye-design-mcp-gate-owned-live/remote-gate-token-smoke.json`
- `test-artifacts/skye-design-mcp-gate-owned-live/live-gate-token-mcp-proof.json`

A passing proof must show:

- `/health` reports `gateOwned: true` and `emailRequired: true`.
- unauthenticated `/mcp` protocol calls return `401`.
- combined 0S/FS27 introspection accepts the gate session and preserves the captured email.
- the bearer session lists live MCP resources and tools.
- optional `MCP_RUNNER_TARGET` proves `tools/use-my-mcp.mjs` can use the deployed MCP endpoint directly.
