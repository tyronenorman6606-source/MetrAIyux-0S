# Repo MCP Rule

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

