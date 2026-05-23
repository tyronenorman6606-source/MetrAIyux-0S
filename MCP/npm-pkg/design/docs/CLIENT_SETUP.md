# Client Setup: Skye Design MCP

Use this server when you want agents to pull Skye/Spectacle design rules before building or repairing a page.

## Server Command

```bash
node /workspaces/MetrAIyux-0S/MCP/stdio-server.mjs
```

## Environment

Set `REPO_ROOT` to the workspace root:

```bash
REPO_ROOT=/workspaces/MetrAIyux-0S
```

## Example MCP Client Entry

```json
{
  "mcpServers": {
    "skye-design": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/MCP/stdio-server.mjs"],
      "env": {
        "REPO_ROOT": "/workspaces/MetrAIyux-0S"
      }
    }
  }
}
```

## What Users Should Ask

```text
Use the skye-design MCP before designing this page. Read the directive and registry, avoid left-column hero text walls, validate the public copy, and require desktop/mobile browser screenshots before completion.
```

## Important Resources

- `quantumskyes://directives/index`
- `quantumskyes://design/registry`
- `quantumskyes://design/user-guide`
- `quantumskyes://design/reference/style-system`

## Important Tools

- `design_find`
- `design_validate`
- `design_quality_gate`
