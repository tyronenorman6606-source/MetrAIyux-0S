# MCP Integration Notes

This folder is designed to become a clean source for MCP-assisted design generation without polluting the existing `MCP/` folder.

## Remote Client Access

Production remote access is served from the same public lab domain:

- Guide: `https://skye-design-mcp.pages.dev/use-mcp.html`
- Endpoint: `https://skye-design-mcp.pages.dev/mcp`
- Health: `https://skye-design-mcp.pages.dev/health`

The endpoint is gate-owned. A user enters the MetrAIyux 0S gate, provides an email, uses their 0S/FS27/NorthStar gate session as the bearer token, and configures the client. Owners can also use `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html` to exchange the owner admin code for a signed 0S bearer:

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

Unauthenticated protocol calls return `401` with `gateUrl`, `accessUrl`, `workspace`, and `emailRequired: true`. Valid owner-admin and gate sessions are checked through the combined 0S introspection route at `/api/skygate/auth-introspect`, which accepts owner sessions first and falls through to FS27/SkyGate for regular gate sessions.

Repo proof commands:

```bash
npm run mcp:smoke:remote
MCP_LIVE_SIGNUP_SMOKE=1 MCP_RUNNER_TARGET=MCP npm run mcp:smoke:remote:gate
MCP_TRANSPORT=remote QUANTUMSKYES_MCP_TOKEN="$MCP_GATE_SESSION" npm run mcp:mine:remote -- <target-folder>
```

The remote proof writes redacted artifacts under `test-artifacts/skye-design-mcp-gate-owned-live/`. Do not publish bearer tokens.

## Operator Console

The local Remix cockpit is in `MCP/operator-console-remix`. It is not another MCP server. It is an operator surface that calls the local `quantumskyes` MCP and writes receipts:

- `/api/catalog` lists MCP resources/tools.
- `/api/plan?target=operator-console&archetype=barber-shop` creates a world plan with MCP recipe/component/variety/quality tools.
- `/api/build?target=operator-console&archetype=house-threshold` creates a portable generated world artifact.
- `/api/mine?target=operator-console` runs the repo MCP mining workflow.
- `/api/proof` aggregates health, target receipts, and proof artifacts.
- `/generated-worlds/<slug>` serves the local generated artifact.

The public same-domain house-threshold artifact is:

```text
https://skye-design-mcp.pages.dev/worlds/house-threshold/
```

Run it with:

```bash
cd MCP/operator-console-remix
npm run start
npm run proof:local
```

## Recommended Integration

Expose these files as read-only resources to your MCP server:

- `skye-design-lab/registry/skye-spectacle-registry.json`
- `skye-design-lab/registry/agent-directive.md`
- `skye-design-lab/docs/USER_GUIDE.md`
- `skyesol_spectacle_reference/notes/spectacle-style-system.md`
- `skyesol_spectacle_reference/assets/`

## Agent Workflow

1. Read `agent-directive.md`.
2. Pick one pattern from `skye-spectacle-registry.json`.
3. Pull typography, palette, and motion cues from `spectacle-style-system.md`.
4. Generate the site.
5. Run browser screenshots.
6. Fix visual problems before deploy.

## Do Not Pollute The MCP Folder

Keep generated database proof, smoke output, auth logs, and deploy artifacts out of the design reference resources.

Good design resources:

- style notes
- pattern registry
- approved screenshots
- component examples
- asset references

Bad design resources:

- build logs
- smoke test output
- customer records
- API keys
- raw database proof
- deployment secrets

## MCP Resource Names

Recommended resource names:

- `skye.design.registry`
- `skye.design.directive`
- `skye.design.user-guide`
- `skye.reference.style-system`
- `skye.reference.assets`

## Future Upgrade

Once the MCP server has a package manifest or registry loader, add a small endpoint/tool that returns:

- approved pattern list
- forbidden patterns
- required browser QA checklist
- public-copy safety rules
- asset manifest
