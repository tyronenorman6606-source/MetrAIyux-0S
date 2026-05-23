# QuantumSkyes Design MCP

**27-tool design system MCP server by SkyesOverLondon.**

Stack audits · Quality gates · Template packs · Content generation · Production ledger · Logo standards · Pattern packs · Luxury audit

Live endpoint: [skye-design-mcp.pages.dev](https://skye-design-mcp.pages.dev)

---

## Connect to Claude or Cursor

### Option 1 — npx (no install)

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "npx",
      "args": ["-y", "quantumskyes-mcp"]
    }
  }
}
```

### Option 2 — Remote HTTP

```json
{
  "mcpServers": {
    "quantumskyes": {
      "url": "https://skye-design-mcp.pages.dev/mcp"
    }
  }
}
```

### Option 3 — Global install

```bash
npm install -g quantumskyes-mcp
```

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "quantumskyes-mcp"
    }
  }
}
```

---

## 27 Tools

| Tool | Description |
|------|-------------|
| `design_validate` | Detect forbidden patterns and fake advanced-stack claims |
| `design_content_audit` | Reject generic copy, require first-person builder language |
| `design_stack_audit` | Fail work that claims advanced stack without using it |
| `design_runtime_stack_gate` | Gate on runtime stack evidence |
| `design_effect_audit` | Audit visual effects against source signals |
| `design_e2e_proof_audit` | Fail static screenshots, require browser proof |
| `design_performance_audit` | Audit performance decisions |
| `design_elements` | Return design element definitions |
| `design_component_plan` | Plan component architecture |
| `design_compose_brief` | Compose a design brief |
| `design_asset_manifest` | Asset manifest for a build |
| `design_template_manifest` | Template manifest |
| `design_template_pack` | Full template pack with patterns |
| `design_logo_manifest` | Logo standards manifest |
| `design_logo_audit` | Audit logo usage against standards |
| `design_content_generate` | Generate first-person operator content |
| `design_open_source_stack` | Open source stack reference |
| `design_stack_catalog` | Full stack catalog |
| `design_recipe_plan` | Recipe plan for a component |
| `design_variety_plan` | Variety system planning |
| `design_pattern_pack` | Pattern pack for a use case |
| `design_quality_gate` | Full quality gate check |
| `design_luxury_audit` | Luxury UI standard audit |
| `production_ledger` | Production ledger for this system |
| `design_find` | Search design references |
| `design_apply_mcp_parts` | Apply MCP parts to a target |
| `repo_read` | Read workspace file (requires REPO_ROOT) |

---

## Requirements

Node 18+. Tools that search or modify the local workspace require `REPO_ROOT` env var pointing at your project root.
