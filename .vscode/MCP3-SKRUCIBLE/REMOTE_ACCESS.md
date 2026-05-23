# SKRUCIBLE MCP — Connection Guide

## Live endpoints
- **Design lab**: `https://skrucible.pages.dev/`
- **MCP endpoint**: `https://skrucible.pages.dev/mcp`
- **Health check**: `https://skrucible.pages.dev/health`

---

## Option 1 — npx (remote, no install)

Add to Claude Desktop, Cursor, or any MCP client:

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

Works once the package is published to npm: `npm publish --access public`

---

## Option 2 — Remote HTTP (live, always-on)

```json
{
  "mcpServers": {
    "skrucible": {
      "url": "https://skrucible.pages.dev/mcp"
    }
  }
}
```

No API key required (`MCP_PUBLIC_READONLY=1` is set on the deployment).

---

## Option 3 — Local stdio (development)

```bash
cd .vscode/MCP3
npm start
# or: node stdio-server.mjs
```

Claude Code `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "skrucible": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/.vscode/MCP3/stdio-server.mjs"]
    }
  }
}
```

---

## Option 4 — Global install

```bash
npm install -g skrucible
```

Then in any MCP config:
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

## Local HTTP server (dev)

```bash
npm run start:http   # starts on port 8788
```

---

## Deploy to Cloudflare Pages

```bash
npm run deploy
# step by step:
npm run build:worker
npx wrangler pages deploy dist --project-name skrucible
```

### Pages secrets

| Secret | Purpose |
|--------|---------|
| `MCP_HTTP_BEARER_TOKEN` | Static bearer for private access |
| `MCP_PUBLIC_READONLY` | Set to `1` to open without auth |
| `MCP_HTTP_ALLOW_ORIGIN` | CORS origin (default `*`) |

---

## Available MCP tools

| Tool | Description |
|------|-------------|
| `forge_index` | All tools with descriptions |
| `forge_stack` | Full package.json + vite.config.js |
| `forge_palette` | Color tokens — Raw + Refined modes |
| `forge_shader` | PlasmaMaterial GLSL + extend() wiring |
| `forge_component` | Recipes: glass, crystal, floor, pixi, anime, chrome |
| `forge_animation` | Recipes: spring, gsap-scroll, lenis, kinetic-wordmark, glitch-text, gooey |
| `forge_mode` | Raw/Refined dual-mode spec with Zustand + CSS |
| `forge_css` | Full CSS custom property system |
