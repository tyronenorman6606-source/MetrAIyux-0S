# Merser3.1 By Skyes Over London - Local Base And Future Remote Access

## Planned Live Lab

After deployment:

```text
https://merser3-1.pages.dev/
```

## MCP Endpoint

```text
https://merser3-1.pages.dev/mcp
```

Health:

```text
https://merser3-1.pages.dev/health
```

Remote access is gate-owned. Use the shared 0S/FS27/SkyGate/Free99 bearer session or an owner-issued `MCP_HTTP_BEARER_TOKEN`. Do not create a new Merser3.1 password lane.

## Local Stdio

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
npm start
node stdio-server.mjs --stdio
node stdio-server.mjs --health
```

Client config:

```json
{
  "mcpServers": {
    "merser31": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/stdio-server.mjs", "--stdio"]
    },
    "merser31-local": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/stdio-server.mjs", "--stdio"]
    }
  }
}
```

## Local HTTP

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
npm run start:http
```

Default local endpoints:

```text
http://127.0.0.1:8789/health
http://127.0.0.1:8789/mcp
```

## Build And Deploy

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
npm install
node stdio-server.mjs --help
npm run build:worker
npm run stress
npm run deploy
```

## Required Repo Proof

```bash
cd /workspaces/MetrAIyux-0S
npm run mcp:mine -- .vscode/MCP5-Merser3.1
npm run proof:live-browser -- --url https://merser3-1.pages.dev/ --expect "Merser3.1"
```

## Available Tools

| Tool | Purpose |
| --- | --- |
| `mcp5_index` | List tools, packs, rooms, registry size, and commands. |
| `mcp5_packs` | Show extracted pack provenance and Merser3.1 receipt path. |
| `mcp5_room` | Return a real room-world contract. |
| `mcp5_component` | Return a source component registry entry. |
| `mcp5_prompt_pack` | Return context/prompt/bridge pack paths. |
| `mcp5_cli` | Return stdio, HTTP, build, deploy, mine, and proof commands. |
| `mcp5_build_plan` | Return the implementation contract. |
| `mcp5_icons` | Return icon-system path and representative icon names. |
