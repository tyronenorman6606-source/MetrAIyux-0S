# Merser By Skyes Over London - Remote And Local Access

## Live Lab

After deployment:

```text
https://merser.pages.dev/
```

## MCP Endpoint

```text
https://merser.pages.dev/mcp
```

Health:

```text
https://merser.pages.dev/health
```

Remote access is gate-owned. Use the shared 0S/FS27/SkyGate/Free99 bearer session or an owner-issued `MCP_HTTP_BEARER_TOKEN`. Do not create a new MCP4 password lane.

## Local Stdio

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP4
npm start
npx @skyes0verl0nd0n/merser --stdio
npx --package @skyes0verl0nd0n/merser Merser --stdio
```

Client config:

```json
{
  "mcpServers": {
    "merser": {
      "command": "npx",
      "args": ["-y", "@skyes0verl0nd0n/merser", "--stdio"]
    },
    "merser-local": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/.vscode/MCP4/stdio-server.mjs", "--stdio"]
    }
  }
}
```

## Local HTTP

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP4
npm run start:http
```

Default local endpoints:

```text
http://127.0.0.1:8789/health
http://127.0.0.1:8789/mcp
```

## Build And Deploy

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP4
npm install
npx @skyes0verl0nd0n/merser --help
npm run build:worker
npm run stress
npm run deploy
```

## Required Repo Proof

```bash
cd /workspaces/MetrAIyux-0S
npm run mcp:mine -- .vscode/MCP4
npm run proof:live-browser -- --url https://merser.pages.dev/ --expect "Merser"
```

## Available Tools

| Tool | Purpose |
| --- | --- |
| `mcp4_index` | List tools, packs, rooms, registry size, and commands. |
| `mcp4_packs` | Show extracted pack provenance and MCP4 receipt path. |
| `mcp4_room` | Return a real room-world contract. |
| `mcp4_component` | Return a source component registry entry. |
| `mcp4_prompt_pack` | Return context/prompt/bridge pack paths. |
| `mcp4_cli` | Return stdio, HTTP, build, deploy, mine, and proof commands. |
| `mcp4_build_plan` | Return the implementation contract. |
| `mcp4_icons` | Return icon-system path and representative icon names. |
