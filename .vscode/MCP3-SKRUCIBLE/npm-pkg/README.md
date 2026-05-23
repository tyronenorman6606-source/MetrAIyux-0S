# SKRUCIBLE MCP

**Design rendering OS and MCP server by SkyesOverLondon.**

React Three Fiber · GLSL shaders · Rapier physics · Tone.js audio · GSAP · Pixi.js · Framer Motion

Live lab: [skrucible.pages.dev](https://skrucible.pages.dev)

---

## Connect to Claude or Cursor

### Option 1 — npx (no install)

```json
{
  "mcpServers": {
    "skrucible": {
      "command": "npx",
      "args": ["-y", "skrucible"]
    }
  }
}
```

### Option 2 — Remote HTTP (always-on, no install at all)

```json
{
  "mcpServers": {
    "skrucible": {
      "url": "https://skrucible.pages.dev/mcp"
    }
  }
}
```

### Option 3 — Global install

```bash
npm install -g skrucible
```

```json
{
  "mcpServers": {
    "skrucible": {
      "command": "skrucible"
    }
  }
}
```

---

## MCP tools

| Tool | Description |
|------|-------------|
| `forge_index` | All tools with descriptions |
| `forge_stack` | Full dependency manifest — every package, version, chunk config |
| `forge_palette` | Color tokens — Raw and Refined modes |
| `forge_shader` | PlasmaMaterial GLSL fragment shader + extend() wiring |
| `forge_component` | Component recipes: `glass` `crystal` `floor` `pixi` `anime` `chrome` |
| `forge_animation` | Animation recipes: `spring` `gsap-scroll` `lenis` `kinetic-wordmark` `glitch-text` `gooey` |
| `forge_mode` | Raw/Refined dual-mode spec with Zustand state + CSS selectors |
| `forge_css` | Full CSS custom property system and key class definitions |

---

## Requirements

Node 18+. No browser required. The MCP server runs in your terminal and speaks stdio to your AI client.
